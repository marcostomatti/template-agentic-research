# Auth — one operator credential, and the sessions minted against it

Authentication here is one strategy and it is deliberately small: a
single operator credential upserted from the environment at boot,
opaque bearer tokens minted against it, and one row read per guarded
request. This document is the map of it — the two tables and what
each column is for, the toggle that decides whether any of it is
registered, the bootstrap that makes the credential exist, the two
introspection paths, and the rules about where a hash may travel.

It is the document the Auth row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to either
table, to the toggle, or to what a session rule decides lands here in
the same commit. The design it implements is `.specs/q07-auth-basic.md`,
and the one place this departs from that design — the bootstrap does
not migrate — is argued below rather than left as a gap.

Two other documents hold halves of this and are worth reading beside
it. `docs/architecture/02-schema.md` carries `auth_users` and
`auth_sessions` as storage, in the roster with every other table, and
the migration that created them. This package's `AGENTS.md` carries
the same strategy as a working convention, for somebody about to edit
`src/auth/` rather than somebody trying to understand it. What is
here is the strategy itself: what the columns mean, what turns it on,
and what each rule is defending.

The framework half is not this. `lib/express/auth.ts` declares the
`SessionVerifier` seam and builds the `requireAuth`/`optionalAuth`
middleware from whatever satisfies it; `src/auth/` is one thing that
does. The seam is vendored and the strategy is this package's, and
the split is what lets a deployment swap the strategy without
touching a middleware.

## The two tables

Both live in `src/db/schema/auth.ts` and arrived together in
`drizzle/0003_motionless_nova.sql`, which creates the two tables,
three UNIQUE constraints and one foreign key and does nothing else.
Nothing outside `src/auth/` reads or writes either of them.

### `auth_users` holds one credential, and no pipeline row points at it

| Column | Type | What it is for |
| --- | --- | --- |
| `id` | `bigserial` PK | Surrogate key, in drizzle's `number` mode rather than `bigint` mode: an id crossing the API and MCP surfaces is serialized to JSON, where a JS `bigint` throws instead of rendering. |
| `sub` | `text` NOT NULL, UNIQUE | The stable subject identifier session claims carry. Written once at insert and never rewritten. UNIQUE because a verified token that resolved to two rows would be ambiguous about whose it is. |
| `username` | `text` NOT NULL, UNIQUE | The login name `POST /auth/login` is presented with, and the natural key the bootstrap upserts on — which is what makes a restart adjust the existing operator rather than leave two rows answering one login. |
| `password_hash` | `text` NOT NULL | The argon2id PHC string from `src/auth/password.ts`. The submitted password is never stored and never logged. |
| `created_at` | `timestamptz` NOT NULL, `now()` | When the credential first existed. Left alone by every later upsert. |
| `updated_at` | `timestamptz` NOT NULL, `now()` | Rewritten whenever the bootstrap replaces the hash. Maintained by the writer, on the same terms as `domains.updated_at`: no trigger and no `$onUpdate` behind it. |

Nothing in the pipeline references this table. It is reached from the
login path and from the bootstrap, and from nowhere else.

### `auth_sessions` holds one row per issued token, and its own subject

| Column | Type | What it is for |
| --- | --- | --- |
| `id` | `bigserial` PK | Surrogate key; see `auth_users.id` for why `number` mode. |
| `token_hash` | `text` NOT NULL, UNIQUE | The SHA-256 digest of the opaque token, 64 lowercase hex characters, from `src/auth/tokens.ts`. The verifier's lookup key, and the guarantee it stands on: one hash resolves to at most one session. |
| `sub` | `text` NOT NULL | The subject this session authenticates, copied off `auth_users.sub` at mint time. |
| `user_id` | `bigint` NOT NULL, FK to `auth_users(id)` | The credential this session was issued against, `ON DELETE cascade` — a session outliving its user would authenticate a subject that no longer exists, and go on doing so until it expired. |
| `created_at` | `timestamptz` NOT NULL, `now()` | When the token was minted. |
| `expires_at` | `timestamptz` NOT NULL | When it stops being valid, written at mint time as the issue instant plus `AUTH_SESSION_TTL_SECONDS`. NOT NULL because a session with no expiry is one nothing ever takes away. |
| `revoked_at` | `timestamptz` NULL | When it was revoked, or NULL if it was not. |

### The subject is denormalised onto the session, and cannot drift

`user_id` already reaches `auth_users.sub` through the foreign key,
so the normalised read is a join — and it is a join every guarded
request would pay, since verifying a token is the hot path this
schema is shaped around. Carrying the copy makes one lookup by
`token_hash` answer the whole of the claims the verifier owes its
caller.

What makes that safe rather than merely fast is the immutability
above it: `auth_users.sub` is written once and never rewritten, so
there is no update path that would have to keep the two columns in
step and no window in which they disagree. The denormalisation is
sound because of a rule about the other table, not because of
anything this one enforces.

That is also why the bootstrap leaves `sub` alone on conflict.
Rewriting it would fail quietly rather than loudly: every live
session holds a copy taken at mint time, so a token issued before the
restart keeps verifying and keeps answering a subject the credential
row no longer names. Nothing errors — the claims simply stop meaning
what they say.

### `revoked_at` is a timestamp because revoked and expired are different

NULL is the encoding of "not revoked", not a missing value. One
column carries both the state and when it was entered, so there is no
second boolean to keep in step with the timestamp, and no row that
can say revoked without saying when.

The two ways a token stops working therefore stay separate reads —
this column IS NULL, and `expires_at` still ahead of now. A boolean
would collapse both into "not valid" and lose which applied: a
session that ran out did so on its own schedule, while one that was
revoked was taken away by a logout or by an operator pulling it.

The sweep respects the same distinction. `deleteExpiredSessions`
removes rows on a strict `expires_at < now()` and leaves revoked
sessions that have not yet expired in place: they are already refused
on read, and removing them early would discard the audit trail
`revoked_at` exists to keep. It is housekeeping and not enforcement —
a session is refused because a verify read its expiry, never because
a sweep happened to have run — and it is declared on the port with no
caller in `src/` today.

## The toggle

The whole strategy is presence-toggled, which is `src/config.ts`'s
existing convention for an optional integration rather than anything
invented here.

### Both variables or neither, and one value gates all three halves

`AUTH_BASIC_USER` and `AUTH_BASIC_PASSWORD` set means three things
are registered: the `auth-bootstrap` dependency, the `/auth` router,
and the DB-backed verifier `createService` builds `requireAuth` and
`optionalAuth` from. Neither set leaves a boot exactly what it was
before the strategy existed — no credential written, no session
routes mounted, and both middleware still passthroughs.

`src/index.ts` derives ONE value from the pair and gates all three
halves on it. That is what stops them disagreeing about whether auth
is configured: a half that consulted the environment a second time
could answer differently, and the failure mode of that is a service
mounting a login route against a credential nothing ever wrote.

It is a presence check (`!== undefined`) and not a truthiness one,
because `src/config.ts` puts a length floor on both entries — 1 on
the user, 12 on the password. A present-but-blank value is therefore
already a boot failure, so the two spellings cannot differ here.

The floor on the password is the whole of the password policy.
`hashPassword` deliberately checks nothing about its input, on the
grounds that a primitive quietly refusing some inputs would put a
second, invisible policy underneath the visible one. So a weak
bootstrap password is refused at parse time or nowhere.

### The introspection pair is the fallback, and blank still means unset

Precedence in `src/index.ts` runs basic, then
`AUTH_INTROSPECT_URL` + `AUTH_INTROSPECT_SECRET`, then no `auth`
block at all. It is a precedence and not a merge because
`lib/express/schema.ts` refines that block to exactly one of its two
forms and refuses one carrying both at parse time — a config with a
verifier and an introspection pair would otherwise boot with one of
them live and nothing saying which.

The fallback branch keeps a truthiness check deliberately, unlike the
pair above it. `AUTH_INTROSPECT_URL` has no length floor, so a
present-but-blank value has to go on meaning what it meant before
this strategy existed — nothing configured — rather than an adapter
pointed at the empty string that refuses every request forever. The
secret has no such third state, since its `.min(32)` makes a blank
one a boot failure.

`AUTH_SESSION_TTL_SECONDS` is not a toggle. It carries a default of
86400, so it is read whenever the basic pair is configured and by
nothing when that pair is not. Its value is written into
`auth_sessions.expires_at` at mint time rather than consulted again
at verify time, so changing it moves only sessions minted afterwards
and leaves live ones expiring on the terms they were issued under.

## The bootstrap

`src/auth/bootstrap.ts` is what makes the table agree with the
environment: one upsert per boot, conflicting on the login name. The
first boot inserts, every boot after rewrites `password_hash` and
`updated_at`, and an operator rotating a password does it by editing
the environment and restarting rather than by reaching for SQL.

### It is a managed dependency, ordered behind Postgres

Both properties the bootstrap needs are ones the dependency array
already has.

It must run after the Postgres pool is proven live, which is what
ordering it behind the database dependency means — `createService`
starts dependencies in array order. And it must abort a boot it
cannot complete, which is what a rejecting `onStart` does:
`createService` stops at the first dependency that fails, logs
`dependency failed to start` with the dependency's name, and outside
`NODE_ENV=test` exits the process.

The name is worth choosing, because it is the whole diagnostic a
deployment gets: the log line carries no error object, so what a
reader sees is `auth-bootstrap` and the fixed message. The same name
is what identifies the dependency under `/_control/dependencies` for
a service that did start. A call inside `register()` would have
neither property, and its failure mode is a service answering logins
against a credential nothing ever wrote.

There is no `onStop`. The bootstrap holds no resource — it borrows
the pool the database dependency owns, and that dependency is the one
that drains it.

### Migrations stay an operator step, so an unmigrated boot fails loudly

This is the one place the shipped strategy departs from the spec,
which asks for the upsert "right after migrations run".

Nothing in this package migrates at boot. `bun run db:migrate` is an
operator step, and drizzle's migrator does an unlocked
check-then-write that concurrent callers race into catalog errors —
an incident `tests/live/live-postgres.ts` records. Adding a
migrate-on-boot is therefore a behaviour change with failure modes of
its own, not a convenience.

What the dependency ordering buys instead is that the same outcome
arrives loudly. A boot against an unmigrated database fails at
`auth-bootstrap`, with a log line naming it, rather than starting
successfully and failing at the first login against a table that is
not there. `bun run db:migrate` is the documented precondition for a
first boot, and it is written into `.env.example` and `README.md` as
well as here.

### The upsert proposes a subject and imposes only the hash

The subject is derived from the login name and not generated: the
namespace `basic:` followed by the configured user. A random subject
would be reproducible from nothing — drop the row, point the service
at a fresh database, and the same operator comes back as somebody
else, while anything that recorded the old subject now names one that
does not exist. Deriving it makes configuration alone enough to
reconstruct the identity. The cost is that the subject discloses the
login name, which is a disclosure to callers already holding a valid
session, and the login name is not a secret in the first place.

The prefix is for the identity source that does not exist yet. Two
sources minting bare login names as subjects would eventually mint
one subject for two different people, and a prefix cannot be
retrofitted, because the subjects already issued would not have it.

On every boot but the first the subject computed here is discarded
and the stored one stands, for the reason `auth_sessions.sub` gives
above. Callers wanting the subject read it off the returned
credential rather than recomputing it.

Hashing happens on every boot whether or not the stored hash would
have verified. Checking first would mean reading the hash, verifying
the configured password against it and writing only on a mismatch —
three operations and a branch, to save one argon2id hash per process
start.

Nothing in that module logs. There is no logger parameter and no
message built from a credential, so there is no line the password
could reach; it is hashed on the way to the port and is a parameter
and nothing else.

## The two introspection paths

There are two, they run in opposite directions, and they never meet.

### This service verifies its own tokens in-process

`src/auth/verifier.ts` puts `verifySession` behind the framework's
`SessionVerifier` seam, so the question `requireAuth` asks per
request is answered in this process by one indexed read of
`auth_sessions`. The sessions a request presents here were minted
here and the rows naming them are in this service's own database, so
asking over HTTP would be a loopback hop to a question the process
has already answered.

The adapter decides nothing. Every rule about what makes a session
good — the digest a presented token is reduced to before any lookup,
the revocation guard, the expiry comparison — belongs to
`src/auth/service.ts`, and what the adapter adds is the shape the
seam asks for and no more.

Two properties of it are worth stating because both fail quietly.
The clock is read per call, through a thunk: a verifier is built once
at boot and answers for the life of the process, so a deps object
holding an instant would freeze the present at startup, refusing
sessions minted after it forever and accepting expired ones forever,
with nothing in the response to say so. And a store failure is an
error rather than a refusal — nothing catches it, so a database that
is down becomes a `500` through the shared handler. Turning it into a
`null` would answer `401` for an outage, telling a caller its
credential was rejected when nothing looked at it.

### `POST /auth/introspect` is served for a sibling deployment

The endpoint exists for another service pointing its own
`AUTH_INTROSPECT_URL` here, which is why the response shape is
`createIntrospectVerifier`'s input rather than anything this package
invented: that function requires `active === true` and a string
`sub`, drops `active`, and hands the rest on as claims. An extra key
added to the success body would silently become a claim.

`AUTH_INTROSPECT_SECRET` keeps exactly the meaning it had before this
strategy existed. It is the credential authorizing a caller to ASK,
not an end user's session token, and it is the same variable
`createIntrospectVerifier` SENDS when this service is the client of
somebody else's endpoint — same header, same spelling, opposite side
of the call. RFC 7662 §2.1 requires the endpoint be protected,
because its response discloses a session's claims to whoever asks.

`src/auth/introspect-secret.ts` compares it timing-safe, on the
digest-then-compare precedent `controlAuth` sets in
`lib/express/control/middleware.ts`: both sides are reduced to
fixed-length SHA-256 digests first, because `timingSafeEqual` throws
a `RangeError` on operands of different length and which path ran
would itself disclose the configured secret's length. A presented
secret shorter than the configured one, longer than it, or the same
length and wrong all reach one constant-time compare.

The check is first in the handler, ahead of the body parse and the
store, so a caller without the secret learns nothing about which
tokens are live and costs this service no database read. With the
variable unset the route is mounted and CLOSED rather than absent:
the compare is against `''`, and a well-formed Bearer credential can
never be empty, so every caller is refused until a secret is
configured.

### The login route answers one flat 401, and limits itself

`POST /auth/login` answers `401 { error: 'Unauthorized' }` for a
malformed body, an unknown login name and a wrong password alike, and
logs the same fixed line for each — so the logs do not separate them
either. It is the one route here that departs from the package's
ordinary error shape, and what it departs from is the shared handler:
a `ZodError` reaching that would become a `422` carrying a `details`
array, whose status alone tells an unauthenticated caller that the
SHAPE was the problem, and whose per-field account is more than a
refused login has any business disclosing.

Uniform refusals are what make guessing uninformative; the route's
own rate limiter is what makes it slow. Ten attempts per fifteen
minutes, stricter than the app-wide limiter on both axes, and applied
ahead of both the parse and the store — which matters on this route
in particular, because the work an attempt costs is a deliberately
expensive argon2id verify.

The other two routes keep the ordinary split, because neither carries
a credential the answer could disclose: a body that is not a
`{ token }` object is a `400`, and a `token` naming nothing gets the
same answer a live one gets. RFC 7009 §2.2 asks for exactly that on a
revocation endpoint, for the same reason `revokeSession` collapses
its own two false answers — a client that can tell an unknown token
from a real one has been handed an oracle.

## The hashes

Two values are what the whole module is arranged around: a password
hash and a session-token hash. They are hashed by different
algorithms, for opposite reasons.

### A password hash and a token hash are named in two files and no third

Across `src/` and `lib/`, `passwordHash`/`password_hash` and
`tokenHash`/`token_hash` appear only under `src/auth/` and in
`src/db/schema/auth.ts`, where the columns are declared.

The `AuthStore` port is what holds that rule. `findUserCredential`
answers with the four columns the login path needs — id, sub,
username and hash — rather than a whole `auth_users` row, so no
caller outside the module acquires a hash it has no use for. A
repository handing rows around would have spread the column past
every rule about where it may travel, and it is that spread, not the
column itself, that makes containment unenforceable.

`src/auth/index.ts` follows the same rule on its export surface: it
exports no constructor returning a record that declares one.
`bootstrapAuthUser` answers with the credential it just wrote and is
deliberately off the barrel, while `createAuthBootstrapDependency`,
whose `Dependency` discards it, is on it. The rule is about call
sites rather than about the type graph — `AuthStore`'s own method
signatures name those records, and reach them through the exported
type as readily as anything else would.

The claims that cross the seam carry neither. `VerifiedSession` is
`{ sub }` and has no spelling for either hash, which matters because
what the verifier returns is what `requireAuth` writes to
`res.locals.auth` and hands to every route reading `getSession` — the
widest audience any value in this module reaches.

### The argon2id parameters are written down rather than defaulted

`src/auth/password.ts` hashes with argon2id at 19456 KiB of memory,
two passes and one lane, producing PHC strings of the form
`$argon2id$v=19$m=19456,t=2,p=1$<salt>$<digest>`. That is OWASP's
second recommended configuration, and also what `@node-rs/argon2`
2.1.0 happens to default to — spelling the numbers out is what keeps
that coincidence from being load-bearing across a dependency bump.

argon2id is the hybrid RFC 9106 names as the default for password
storage. It is memory-hard, so an attacker's advantage is bounded by
the RAM each guess costs rather than by how many cores they can point
at the problem. The `id` suffix is the hybrid of the other two
variants: the first half-pass over memory is data-independent, which
is what stops the access pattern from leaking the password through a
side channel, and every pass after it is data-dependent, which is
what makes a time-memory tradeoff expensive.

The three numbers are inputs to hashing only. Verification passes
none of them, because a PHC string carries its own `v=`, `m=`, `t=`
and `p=` and argon2 verifies against those — which is exactly what
lets them be raised later without invalidating a single stored hash.

The algorithm is spelled as the numeric literal `2` annotated with
the library's `Algorithm` type, rather than as `Algorithm.Argon2id`.
`@node-rs/argon2` declares that enum as an ambient `const enum` and
this repo compiles with `isolatedModules`, under which no spelling
that names a member survives `check-types`. The type annotation still
makes tsc reject a non-member, and the suite pins the choice from the
other side by asserting the output starts with `$argon2id$`.

Verification is fail-closed by construction. argon2 throws on a hash
string it cannot decode rather than answering false, and
`verifyPassword` answers false for all of it: a `password_hash` that
was truncated, hand-edited, left empty or written by some other
scheme is a credential that does not match, never a rejected promise
a route turns into a `500`. That is containment and not a swallowed
error — a caller who can tell "your password is wrong" from "that
account's stored hash is unreadable" holds an account oracle.

`Bun.password` was not an option, and the reason is the test seam
rather than taste. The service runs under bun, but the default suite
runs under vitest in Node.js workers where `Bun` does not exist;
`tests/helpers/bun-polyfill.ts` installs a stand-in carrying `serve`
and nothing else. A `Bun.password.hash` call is `undefined is not a
function` in every isolated test, which would leave the one step
deciding whether a credential matches as the single part of the login
path no test could reach. `@node-rs/argon2` is a NAPI addon and loads
under both runtimes, so the suite drives the same hashing code the
service runs.

### A session token is SHA-256, which is the opposite choice on purpose

`generateSessionToken` mints 32 CSPRNG bytes as base64url — 43
characters, no padding — and `hashSessionToken` reduces one to 64
lowercase hex characters. Only the digest is ever persisted. The raw
token exists in the body of the `POST /auth/login` response and
wherever the client puts it afterwards, so a database backup, a query
log, an operator with SELECT, or an injection dumping the whole table
all yield values that cannot be replayed as a bearer credential.

The hash is deliberately NOT argon2id, which looks inconsistent with
the file next to it and is not. A password is low-entropy and
human-chosen, so its stored form has to be expensive to compute —
that expense is the only thing standing between a leaked table and an
offline dictionary run. A session token is 32 bytes straight off the
CSPRNG: there is no dictionary to run against a 256-bit search space,
so the memory-hard KDF buys nothing while costing something real,
because the verifier hashes the presented token on EVERY
authenticated request rather than once per login.

That the digest is unsalted and deterministic is a requirement rather
than an oversight. The session lookup is an equality probe against a
UNIQUE index, so one token must reduce to exactly one string, for
ever. `password.ts` needs precisely the reverse and takes a fresh
salt per call: the two modules look alike and share no reasoning.

The token carries no structure, no claims and no encoded identity. It
is a random handle, and everything it means lives in the
`auth_sessions` row it looks up — which is what makes revocation a
single row write rather than a key rotation, and why nothing
downstream should try to parse one.
