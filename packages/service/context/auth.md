## Authentication

`src/auth/` is this service's own credential strategy; `lib/express/auth.ts`
is the framework seam it plugs into. That seam declares `SessionVerifier`
around "verify a bearer token" and ships one implementation of it —
`createIntrospectVerifier`, which asks another deployment over RFC 7662
HTTP. `src/auth/verifier.ts` is the other one, answering from this
service's own `auth_sessions` table. `createService` builds
`requireAuth`/`optionalAuth` from whichever form it is handed, and from
neither when the `auth` block is absent, in which case both stay
passthroughs.

**The strategy is presence-toggled on `AUTH_BASIC_USER` plus
`AUTH_BASIC_PASSWORD`.** Both set: the bootstrap dependency, the `/auth`
routes and the local DB-backed verifier are all registered. Neither set: a
boot is exactly what it was before the strategy existed. `src/index.ts`
derives ONE value from the pair and gates all three halves on it, which is
what stops them disagreeing about whether auth is configured — a half that
consulted the env a second time could answer differently. It is a presence
check rather than a truthiness one because `src/config.ts` gives both
entries a length floor (1 and 12), so a blank value is already a boot
failure and the two spellings cannot differ. The introspection pair is the
one where they can, and `resolveAuthConfig` keeps truthiness there
deliberately: a present-but-blank `AUTH_INTROSPECT_URL` has to go on
meaning nothing configured, rather than an adapter pointed at the empty
string that refuses every request forever.

**The bootstrap runs as a managed dependency ordered behind Postgres.**
`createAuthBootstrapDependency` registers `auth-bootstrap`, which upserts
the operator credential on every boot — argon2id, rewriting
`password_hash` and `updated_at` and leaving `sub` and `created_at` as
first written — and it sits AFTER the database dependency in the
`dependencies` array, because dependencies start in array order and the
upsert needs a live pool. So a boot against an unmigrated database aborts
THERE, on the pino line naming `auth-bootstrap`, rather than limping on to
fail at the first login. `bun run db:migrate` stays the operator step it
always was: nothing in this package migrates at boot, and drizzle's
migrator does an unlocked check-then-write that concurrent callers race
into catalog errors (`tests/live/live-postgres.ts` records the incident),
so adding one is a behaviour change with its own failure modes rather than
a convenience.

**Two introspection paths exist and they never meet.** This service
verifies its own tokens in-process through the `SessionVerifier` seam: the
sessions a request presents were minted here and are one row away, so a
loopback HTTP hop would be this process asking itself a question it has
already answered. It serves `POST /auth/introspect` anyway, and that
endpoint is for a SIBLING deployment pointing its own
`AUTH_INTROSPECT_URL` here — which is why the response shape is
`createIntrospectVerifier`'s input rather than anything this package
invented. `AUTH_INTROSPECT_SECRET` keeps its old meaning on that route:
the credential authorizing a caller to ASK, compared timing-safe by
`src/auth/introspect-secret.ts` on the same digest-then-compare precedent
as `controlAuth` above, and refused before any store read. Unset leaves
the route mounted and CLOSED rather than absent — the compare is against
`''`, which no well-formed Bearer credential can equal. Precedence in
`src/index.ts` runs basic, then the introspection pair, then no `auth`
block at all; a precedence and not a merge, because `lib/express/schema.ts`
refines that block to exactly one of the two forms and refuses one
carrying both at parse time.

**A password hash and a token hash are named in two files and no third.**
Across `src/` and `lib/`, `passwordHash`/`password_hash` and
`tokenHash`/`token_hash` appear only under `src/auth/` and in
`src/db/schema/auth.ts`, where the columns are declared. The `AuthStore`
port is what holds that: `findUserCredential` answers with the four
columns the login path needs rather than a whole `auth_users` row, so no
caller outside the module acquires a hash it has no use for, and a
repository handing rows around would have spread the column past every
rule about where it may travel. `src/auth/index.ts` exports no constructor
returning a record that declares one — `bootstrapAuthUser` answers with
the credential it just wrote and is deliberately off that surface, while
`createAuthBootstrapDependency`, whose `Dependency` discards it, is on it.
The rule is about call sites and not about the type graph: `AuthStore`'s
methods name those records in their own signatures and reach them through
the exported type as readily as anything else would. A later stage adds
`tests/invariants/auth-containment.ts` to walk both trees with exactly
those two exclusions; until it lands, the rule is carried by this
paragraph and by `src/auth/store.ts`.
