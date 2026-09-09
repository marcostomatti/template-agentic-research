## Testing — isolated vs live (CRITICAL)

The default suite is FULLY ISOLATED: no db, no network, no credentials.
Keep it that way — a past incident where tests ran against live
infrastructure with real credentials burned a month of tokens in under an
hour. The rules:

1. New tests mock or fake external systems by default. If a fake gets
   nontrivial, give the fake its own contract tests.
2. Live tests go in `tests/live/*.live.test.ts`, gated through whichever
   `describeLive*` in that directory keys on the service they need (env-var
   opt-in → `describe.skip` otherwise; keep the explicit type annotation —
   inference breaks `tsc` with TS2742).
3. Live tests run only against compose services THIS package stands up
   behind a profile. Two exist: the `--profile stress` database
   (`bun run stress:start / test:live / stress:stop`) — separate port,
   separate database name, no volume — and the `--profile n8n` instance
   on loopback 5678 that the n8n cases want. The second differs in kind
   and the difference is the point. It KEEPS its state (a named volume
   over `/home/node/.n8n`, without which every stored credential stops
   decrypting on the next restart), and it is the one service here that
   can spend money once its workflows are armed. So a case pointed at it
   runs against state an operator built rather than against something
   the suite may truncate, and arming that gate is a deliberate act:
   nothing in this package exports `AR_N8N_URL`.
4. Destructive helpers must call `assertLiveDatabase` (refuses any database
   but `ar_live`). Never widen the truncate list implicitly.
   That name is also the reason the live Postgres is SHARED across every
   worktree and branch on one machine: there is one `ar_live` on port 5433,
   and `applyMigrations` points the migrator at `./drizzle`, so whichever
   checkout last ran `test:live` migrated it. A branch based on an older
   `main` therefore reads `schema.live.test.ts`'s
   `records every migration the journal names, in journal order` as RED
   through no fault of its own — the ledger carries a sibling branch's rows
   and the case renders them `unrecognized(<when>)`. Those numbers are
   attributable rather than mysterious: they are journal `when` values, so
   `git show <ref>:packages/service/drizzle/meta/_journal.json` across
   `git branch -a` names the migration and the branch that applied it. Do
   NOT repair it by deleting the ledger rows or dropping the extra tables —
   that is the sibling worktree's working state, and greening one branch
   reddens the other. Take the reading on an ISOLATED cluster instead:
   every Postgres-gated file calls `applyMigrations` in `beforeAll`, so a
   throwaway `postgres:16-alpine` with no volume is enough, and it must be
   NAMED `ar_live` or `assertLiveDatabase` refuses the destructive helpers.
   `bun run test:live` cannot be pointed at it — the script sets
   `AR_LIVE_DATABASE_URL` in its own definition, which wins over the
   environment — so the isolated leg is
   `AR_LIVE_DATABASE_URL=<url> bun x vitest run tests/live` from inside the
   package.
5. Clean up after live runs: `stress:stop` removes only the stress
   containers. Leave no long-lived processes or scheduled jobs behind.
   `db:stop` is NOT its counterpart: it is `docker compose down`, which
   acts on the whole PROJECT regardless of profile, so running it while
   the live container is up takes `postgres-live` with it. The pair is
   asymmetric by construction — `db:start` is per-service
   (`up -d postgres`) while `db:stop` is per-project and also removes the
   project network. Read the script body rather than inferring the
   counterpart from the name.
6. `fileParallelism: false` lives in `vitest.config.ts`, not on a script
   flag, so exported env vars can't re-parallelize the live files.

`src/index.ts` cannot be imported by the isolated suite AT ALL: it resolves
`src/config.ts` at import time and ends in a top-level `createService` call,
so an import boots a service against a real database. Two complements cover
it and neither is optional. The isolated one RE-ASSEMBLES the wiring shape
over the in-memory store — same presence toggle, same 0-or-1 dependency
array, same form precedence, same conditional mount — and its cost belongs
in the file header: a divergence introduced in `src/index.ts` ITSELF stays
invisible to a green run. Such a file must hand the SAME store to the
bootstrap dependency, the router and the verifier, then assert the SUBJECT
the guarded route saw rather than only its status (a service wired over two
different stores answers the same 200); and a refusal case for an ABSENT
credential exercises less of the path than one for a BAD credential, since
`buildRequireAuthFrom` short-circuits on `extractBearer` returning null.

Say it as a coverage fact rather than only as an import one: NOTHING in the
suite imports `src/index.ts`, so a wiring change has ZERO runtime coverage
from `bun run test` and a green suite is no evidence the mounts work —
`tests/api/wiring.test.ts` REBUILDS the mount block over
`createMemoryResearchStore`, and its route table is a second transcription
of the same list. Two readings are available instead and both are cheap.
`check-types` IS the structural proof for the COMPOSED store: the spread is
handed to every router and each router's `store` type re-checks it, so a
port method missing from the composition is a compile error rather than a
500. And a throwaway `zz-tmp-*.ts` at the PACKAGE ROOT that builds every
router over the memory store, mounts them on a bare express app and prints
`router.stack`'s path/verb set gives the wire inventory plus a status per
probe in one run — the 200s are the discriminating half, since an
id-addressed 404 is exactly what an UNMOUNTED path answers too.

`tests/api/wiring.test.ts` is bounded by the SHIPPED rate limiter, and the
repair this paragraph used to predict has landed: it boots ONE service per
describe rather than one for the file. `lib/express` mounts its limiter
app-wide at 100 requests a minute from a literal in `middleware.ts`, each
limiter carries a store of its own, and each table row costs TWO — so the
budget is per `createService`, and a describe that boots one starts from a
fresh 100. Measured at the q14 `/docs` describe, whose CSP-scoping case
took its spend from four requests to nine: FIVE services spending 39, 41,
27, 4 and 10 of their own 100, where the single service the file used to
boot would want 121 of its one 100 — a leg in that file's header boots one
and reddened EIGHT when it was measured, the last three wave-3 rows
answering `429` and the mounts describe behind them answering it too. That
figure and the 122 it was taken at both PREDATE q14's removal of
`/example`, which took the second of that describe's open routes and one
request with it; the leg has not been re-run, and `/health` is now the only
open route the file reads. The ceiling is now ENFORCED rather than
recorded. The last case of each describe that has one reads
`Number(res.headers['ratelimit-remaining'])` off a real response — which
needs no request the run was not already making — and holds
`limit - remaining` against what that describe's own rows predict, while a
case in `the route table` refuses a wave whose rows have outgrown the
window. Adding rows to an EXISTING describe still spends that describe's
budget, and a breach still presents as a `429` on whichever rows vitest ran
last, i.e. as a flaky mount rather than as a limit. The same per-service
rule is why a file that boots a service per capture window
(`tests/api/request-echo.test.ts`) gets a fresh budget each time and has
never had this ceiling at all.

The other complement is booting it by hand, which is the only evidence a
WIRING change has:
`( cd packages/service && env PORT=... DATABASE_URL=<live 5433> ... bun run
src/index.ts )` in the background, curl the surfaces, kill it. Dependency
ORDER is NOT readable from the running service (this service configures no
`control` block, so `/_control/*` is an unmatched path here) — take it from
boot-FAILURE attribution instead, which is three legs: an unreachable
database must name the FIRST dependency, a reachable-but-UNMIGRATED one must
name the later dependency that needed the schema, and the same unmigrated
database with the feature toggled OFF must BOOT, which is the control saying
leg 2 was that dependency rather than something else about an empty
database. Each leg reads as one pino line (`dep=<name>` with
`dependency failed to start`) plus the exit code, since `createService`
calls `process.exit(1)` outside `NODE_ENV=test`. Make a SCRATCH database
rather than using `ar_live`, and preflight-refuse a name that already exists
so the trap's drop cannot reach somebody else's. Trap while doing it:
`( ... ) & PID=$!` captures the SUBSHELL, not the server, so `kill "$PID"`
leaves the child holding the port and the NEXT run's readiness poll is
answered INSTANTLY by that orphan — every reading then lands on the stale
service and looks like a real regression. Use `exec` inside the subshell,
preflight-refuse a port already answering, and re-check `ps` for orphans
AFTER the run.

What an unmatched path ANSWERS there is not a constant, and the difference
is the resource surface rather than the control plane: every one of its
routers mounts at `/`, so each guard runs for every request that reaches its
mount. Measured all four ways against a real `createService` carrying the
auth block `AUTH_BASIC_USER`/`AUTH_BASIC_PASSWORD` produce — with the pair
set, an uncredentialled `/_control/status` answers `401` `application/json`
and a credentialled one the `404` `text/html`; with it unset the guard is a
passthrough and both answer `404`. `/health` is `200` in all four. So a
`401` while curling the surfaces says the guard is on the mounts, not that
the plane is mounted and refusing — and `/nope` answers identically, which
is what says the change belongs to unmatched paths generally.

**The one-off probe: where it may live is decided by BARE SPECIFIERS and
nothing else.** bun resolves a bare specifier by walking up from the
IMPORTING file, so a probe importing `drizzle-orm`, `express` or
`supertest` from `/tmp` hangs or dies on resolution while its own
`writeFileSync` output still looks complete — put those at the PACKAGE
ROOT as `zz-tmp-<name>.ts`, with `rm` plus `git status --short -uall`
printing nothing as the whole revert check. A probe importing only node
builtins (`tests/invariants/naming-patterns.ts` is the one here) resolves
fine from `/tmp` by absolute path. Read the target module's own import
list rather than picking a location by habit.

Three further corrections for a probe driving an unimported `db-store.ts`
against the live Postgres, each of which fails LOUDLY but names the wrong
subject. It cannot run from any cwd: `applyMigrations` in
`tests/live/live-postgres.ts` passes a RELATIVE `migrationsFolder:
'./drizzle'`, so an absolute-import probe still dies with `Can't find
meta/_journal.json file` unless the shell is inside `packages/service` —
which reads as a broken helper. A raw `db.execute` on this
drizzle/node-postgres client answers a pg `QueryResult` and NOT an array,
so the idiomatic `const [row] = await db.execute(...)` throws `TypeError:
{} is not iterable` from inside the probe's own fixture setup and never
reaches the module under test — destructure `{ rows }`
(`tests/live/schema.live.test.ts` is the in-repo precedent). And for any
git-shelling probe, `execFileSync('git', args, { cwd: REPO })` with an
absolute REPO const pins every reading to the repo root whatever directory
the shell is in.

Put the ACCEPTED writes and the REFUSALS in the SAME run: the accepted
half is the positive control that keeps the refusals from being a store
that refuses everything. One run then answers the projection's key set,
each mechanism's refusal `reason`/`constraint`, the absent-versus-explicit-
null patch split, and the ordering — in about ten seconds against a stress
Postgres that is already up.

**A probe that LOGS its measurement reports nothing.** `console.log` from
inside a test is INVISIBLE under this package's default reporter and the
run is green either way (measured: marker count 0 by default, 1 under
`--reporter=verbose`). Have the probe `writeFileSync` its JSON to `/tmp`
and `cat` that after the run — independent of the reporter, and readable
even when the run is red.

`describeLivePg` is one of the gates in that directory, and the others are
armed differently — which is the part to know before reading a run.
`describeLiveN8n`, in `tests/live/live-n8n.ts`, keys the n8n cases to
`AR_N8N_URL`, and `describeLiveOllama`, in `tests/live/live-ollama.ts`,
keys the config-proposer case to `AR_OLLAMA_URL`, both the same way.
`test:live` sets `AR_LIVE_DATABASE_URL` in its own script definition and
sets nothing else, so it opens the Postgres gate itself and leaves every
other one shut; nothing here exports either of those settings, and a value
an operator put in `.env` for the deploy commands does not reach a worker.
A live run with the stress container up therefore reports those files
skipping while the Postgres files run, which is that command's steady state
rather than a broken setup, and the skip count a plain `bun run test` prints
has a source in each of them.

To see WHICH file skipped, pass the flag through rather than retyping the
URL: `bun run test:live --reporter=verbose` APPENDS to the script's own
inline `AR_LIVE_DATABASE_URL`, so the per-case reading costs nothing and
honours the never-export-it-by-hand rule. The default summary's skip count
cannot name a file; only the verbose `↓` lines say which skips belong to
the n8n and config-proposer files rather than to a Postgres file that
silently stopped being armed. Note also that a skipped file is still
IMPORTED, so collection proves the module parses and nothing more — never
read a `1 skipped` as evidence about a change under `tests/live/`.

There is something here to point that gate at now, and still no command that
points it. `docker-compose.yml` declares an `n8n` service behind
`--profile n8n`, container `ar-n8n`, on loopback 5678 — the instance rule 3
names beside the stress database — while `scripts/bootstrap.sh`, which will
import the workflows onto it and arm them, is still phase 7 in
`scripts/README.md`'s roster. So an n8n case can satisfy rule 3 the moment
an operator points `AR_N8N_URL` at that instance, and until somebody does,
the reading of a run is unchanged. Every command this package
ships leaves those cases skipped, which makes what is written under that
gate debt recorded rather than behaviour a gate here proves: treat a case
added there as unrun until somebody runs it. `tests/live/live-n8n.ts`
carries the rest — what a skipped-but-collected case still reports, and the
one place the seam can be broken without touching the gate.
`tests/live/live-ollama.ts` records a stricter version of it for the
config-proposer case: no compose service supplies a model server at all,
nothing starts one, and `.env.example` names neither of its two settings.

A seam of another kind sits beside the live ones, in `tests/parity/`, gated
the same way for a different reason. `bun run test:parity` runs
`tests/parity/*.parity.test.ts`, where a file drives a ported library and
the origin it was ported from over one set of neutral fixtures and diffs
the answers. `describePortParity`, in `tests/helpers/port-parity.ts`, keys
those files to `AR_PORT_PARITY_ORIGIN` — the origin checkout root, which is
an operator's own local filesystem path and is recorded in no tracked file
here — the harness TSDoc carries why. So this gate is armed unlike EITHER
live one. `test:live` opens the Postgres gate from its own script
definition; nothing in this package sets the parity variable, no compose
service supplies it and no default stands in for it, so only an operator
export arms it. A run with it unset reports the parity files SKIPPING, and
that is the steady state of this command, of `bun run test` and of CI
alike, not a broken setup.

The arming is therefore per-MACHINE rather than per-command, which is the
half that catches a reader out. `vitest.config.ts` declares no `include`
override, so `tests/parity/` matches the default glob and a plain
`bun run test` collects those files too: on a machine whose shell profile
exports the variable, the default suite reaches an origin checkout outside
this repository and CI's run does not, off the same tree. The closed-gate
reading has to be FORCED there rather than observed —
`env -u AR_PORT_PARITY_ORIGIN bun run test:parity` is the one command that
shows the skip, and it is how a change to the gate itself gets read.
Measured both ways at the seam's first file: 8 passed armed, 8 skipped
unarmed, `Test Files 1 skipped (1)` naming the file rather than a count.

Test files open with a `/** ... */` header stating what the file PROVES (not
what it calls), and separate regions with `// ---` banner comments 78 chars
wide. Table-driven suites carry their own anti-vacuity guards — pair samples
to the constant table by id and assert set equality, or an entry added later
is silently untested (see the `table-driven-test-vacuity-guards` skill).

More conventions under `lib/**`, measured rather than assumed. There is not
ONE `it.each`/`describe.each`/`test.each` in the whole package, so a table
of cases is written as plain `it()` blocks and a loop is the only precedent
(`for (const err of [...]`). A NESTED `describe` is the established
sub-grouping idiom, while the `// ---` banners separate TOP-LEVEL describes
ONLY — a new sub-block of an existing describe takes a plain `//` prose
comment, never a banner. Shared fixtures are module-scope UPPER_SNAKE and
three files independently spell the same one `SECRET`. Local helpers carry
either no comment or a short `/** */` of prose with no `@param` tags. A
helper added under `lib/` throws a PLAIN message — the `[<file-stub>]`
prefix is a `tests/live/` convention that exists to tell two live files'
failures apart in one run, and no `lib/` test carries it. Em dashes ARE the
prose convention in `//` comments there and in framework SOURCE TSDoc
alike, unlike the ASCII-only rule that governs control BYTES; caps-for-
emphasis is sanctioned but sparse. Line width runs to ~97 columns in
`lib/**` tests, well past the doc-comment numbers above.

Conventions under `tests/live/` differ from those, and the differences are
deliberate. A row-narrowing helper is LOCAL to its file rather than shared
out of `live-postgres.ts` (`schedule-clamp.live.test.ts` has `firstRow`,
`schema.live.test.ts` has `oneRow`). Every thrown error opens with a
`[<file-stub>]` prefix naming its source (`[live-postgres]`,
`[schedule-clamp]`, `[schema-live]`) — that prefix is what tells two live
files' failures apart in one run, and it is also what says a HELPER threw
rather than the database. `@throws Error When ...` is the form used here,
not the `@throws {Error}` the `documentation` skill shows, by roughly 20
sites to 4. Doc-comment prose wraps at <=72 columns, against the ~76 that
`src` uses — measure the file you are editing rather than carrying a number
across.

Vitest does NOT type-check, so a throwaway mutation may leave a binding
unused or otherwise lint/type-red and still run exactly as intended — do
not let compile-cleanliness constrain a mutation leg. Read such a leg by
the ` > `-joined NAMES a `--reporter=verbose` run prints, never by the
failure count; `test-delta-signatures-by-task-shape` covers why the count
can hold constant across structurally different legs.
`--reporter=verbose` prints per-CASE lines and NO per-file line at all
(vitest 4.1.11), so a step asking to read `the per-file lines` has to
DERIVE the split by grouping the case lines on their `<path> > ` prefix.
The per-file `# path (N tests)` line comes from the DEFAULT reporter under
a two-reporter PAIR and never from verbose: passing
`--reporter=default --reporter=json --outputFile=<f>` gives the human
summary, the per-file lines AND the machine-readable per-file split in one
capture, where `--reporter=json` alone leaves stdout at a single 42-byte
`JSON report written to` line. Two readings then come free from a verbose
capture with no second command — it IS the collected roster, so the
collected-vs-disk set equality is the grouped file set held against
`git ls-files` rather than a `vitest list --filesOnly` run, and bun echoes
the FORWARDED arguments into its `$` line, which is how an appended flag is
shown to have reached the runner rather than having been eaten by
`bun run`.

No `db-store.ts` in this package carries a colocated test file, so a claim
handed forward to `the drizzle half's own cases` is handed to files that do
not exist. A branch that exists only because the other implementation
throws (an empty-patch early return, a `RETURNING` list) is pinnable at the
LIVE SEAM and nowhere else, and each such zero is discharged per TABLE:
landing one table's case leaves the siblings' zeros exactly as they were.
Its leg fails as a THROW carrying drizzle's own message rather than as an
assertion diff, so a grid runner reading only counts cannot tell it from an
ordinary red — read `failureMessages`.

The default suite READS `workflows/dist/` and never builds it. `pretest`
runs `bun scripts/build-workflows.ts`, so the tree is written in a bun
process of its own before any worker opens it. bun keys that hook to the
script NAME rather than to the launcher: it fires for the `test` script —
`bun run test`, a path appended to it, and the root fan-out that runs the
same script — and for no other. `test:live`, `test:parity`, `test:watch`
and a bare `bun x vitest run <path>` all read whatever the directory
happens to hold, so `bun run test <path>` and `bun x vitest run <path>` are
two ways of running one file that differ in exactly this. Rebuild by hand
before reading a built artifact for any purpose.

Forgetting is loud rather than silent, but only in the run log.
`loadBuiltWorkflows` refuses a tree that yielded no artifact, naming the
directory and `bun run build:workflows`, so the absence checks over built
output cannot sweep nothing and pass. It throws at module scope, though, so
the summary reads `Test Files 1 failed (1)` and `Tests no tests` — byte for
byte what an unparseable test file prints. The case counts are not the
reading; the class in the log is.

A worker cannot do that build itself, so do not write one there.

`workflows/dist/` and `dist-external/` are gitignored and the build SWEEPS
NOTHING, so a renamed or deleted source leaves its artifact behind and every
reader takes it for a real built workflow, with no diff to fail.
`rm -f workflows/dist/*.json && bun run build:workflows` is the first thing
to try when a built-tree check fails inexplicably. The artifact on disk is
stamped for whatever the tree looked like when something LAST built it —
which `pretest` makes the last suite run, not HEAD — so the build's own
`1 built, stamped <sha>` line held against `git rev-parse --short HEAD`,
plus the ABSENCE of a `-dirty` suffix, is the whole freshness check.
`Bun.Transpiler` belongs to a global only a bun process carries, and
`tests/helpers/bun-polyfill.ts` is a `setupFiles` entry, so every worker in
this package starts with a partial `Bun` holding `serve` and nothing else:
`typeof Bun` is `'object'`, `Bun.Transpiler` is `undefined`, and
`process.versions.bun` is absent. The obvious `typeof Bun === 'undefined'`
guard therefore does not fire — the constructor is reached anyway and raises
`TypeError: Bun.Transpiler is not a constructor`. Check the `Transpiler`
property, never the global. A case that needs the real transpiler spawns
`bun scripts/build-workflows.ts` as a subprocess;
`docs/architecture/03-workflows.md` carries the argument for both halves.

That transpiler also NORMALIZES string quotes to double, which decides how
an `ownText` entry in `tests/build/lib-splice.test.ts` has to be picked. A
snippet carrying a single-quoted literal is present in the shipped source
and ABSENT from the spliced body, so the roster's own-library case passes
while its text-arrived case fails over a library that is perfectly fine
(measured: `.replace(SLUG_SEPARATOR_RE, '-')` and `typeof maxLen ===
'number'` both vanish where `protectedSpans.push(rendered)` and
`spans[Number(index)]` survive). Combined with the existing rule that the
text must be an EXPRESSION — type annotations erase and lines reflow — the
selection rule is: no string literal, no type annotation, and CHECK by
transpiling before registering. Three lines of a /tmp `.mjs` building a
real `new Bun.Transpiler({ loader: 'ts' })` and calling `transformSync`
answers own/transpiled/other-library membership for a whole candidate list
at once.

Four known flakes live in the vendored framework `lib/` half, none in
anything this port wrote, so a single red case naming one of them is not a
regression in your change. In `lib/express/control/routes.test.ts`, the
restart route's `returns 404 when control plane is disabled` case is
order-dependent, and `POST /_control/stop`'s `returns 403 when
x-control-token is missing` was seen once in six runs as a supertest
`socket hang up`; in `lib/express/control/routes.integration.test.ts`,
`reflects live dependency status changes across sequential requests` failed
once with `r2.body.dependencies` undefined, then passed 6/6 standalone and
3/3 in full-suite re-runs of the SAME tree — it appears only under the full
suite; in `lib/express/builtin-routes.test.ts`, `GET /health`'s
`returns 200 when all dependencies are running` fails with `socket hang up`,
which is transport-level rather than an assertion at all.

Distinct from those four, and reaching `src/**` and the vendored `lib/`
half alike, is the macOS supertest PORT-STEAL flake. It has NINE measured
presentations, so a triage keyed on any one of them sees nothing: `socket
hang up`; a wrong STATUS (404 for an expected 200, 401 for an expected
204); `Error: Parse Error: Expected HTTP/`; `AssertionError: Target cannot
be null or undefined` from a `toHaveLength` on a body that never arrived; a
MATCHING status beside an EMPTY body; an empty CONTENT-TYPE header
(`expected '' to be 'application/json'`); a plain `expected false to be
true` from a boolean envelope check; and — worst-shaped — a `socket hang
up` inside `beforeAll`, which fails the whole FILE so a mutation-grid
runner reading the JSON reporter scores that leg N-of-N. The ninth is the
one likeliest to be filed as a real defect: a plain vitest `Test timed out
in 5000ms` naming a case and a line number, with no HTTP status and no
socket error anywhere in the capture.

Two clauses a reader infers from the above are FALSE at fan-out scale, and
both were measured. "Exactly one failing case" is no part of the signature
— one `bun run test:all` failed THREE cases over THREE files with THREE
different error shapes at once, and a red whose own shapes disagree is MORE
flake-like rather than less. And a package-scope green is not the
discriminator either: `bun run test` from `packages/service` has been seen
red over its own disjoint sets in the same sitting. What holds is the
failing file SET moving between runs, `git log $(git merge-base main
HEAD)..HEAD -- <path>` answering empty beside a control path the branch DID
author answering non-zero, and every failing file green when run alone.
Budget three to four fan-out runs for a green rather than reading the first
red as attribution — measured RED, RED, RED, GREEN in one sitting at one
clean tree. Give the run-alone leg the ` RUN  v<version>` banner equality:
it is a hand-invoked `bun x vitest` against a package-script fan-out, and
`bun x` resolves a different vitest per working directory.

`tests/helpers/loopback-bind.ts` does NOT exist on this HEAD, so the
mitigation is genuinely unreachable rather than merely unverified: `ls
tests/helpers/` is the one-command check before assuming any
supertest-bearing work is protected.

Attribute it with the CHEAP readings before any re-run, because a re-run of
the failing file is a coin flip at this base rate and the failing file is
not stable across runs either. Three settle it and none costs a suite:
`git log $(git merge-base main HEAD)..HEAD -- <file>` empty (the branch
never touched it); `grep -rn '<the new module path>' src tests lib scripts`
answering only a TSDoc prose mention (nothing can execute the change);
and, for a change under `tests/live/`, the file self-skips in the default
suite so it is unreachable BY CONSTRUCTION. The confirming pair is the file
green standalone plus an immediate full re-run at IDENTICAL totals, with
the failures moved into the passed column — read the CASE count as well as
the file count, which a file-level reading misses. Do not read a
presence/absence pair as causation: measured 2-of-2 red at HEAD against
5-of-5 green at the base over a change with zero runtime exports that no
test imports.

Resolve a flake record's bare case NAME to a ` > `-joined path before
applying the discriminators, because the two select different sets: the
restart record's `returns 404 when control plane is disabled` names SEVEN
cases in `routes.test.ts` (one per route describe), with seven more `→ 404`
siblings in a nested `all routes return 404 ...` describe.
`grep -cE '> <name>'` over a `--reporter=verbose` capture says how many
cases a record actually selects and costs nothing. Note too that a targeted
`bun x vitest run <dir> --reporter=verbose` collects in a DIFFERENT order
from the full run, so for an ORDER-DEPENDENT case it can never substitute
for it — it is a companion to the green full suite, not a replacement.
Corollary: a task whose acceptance is conditional on a red is MOOT rather
than satisfied when the run is green, since all three discriminators are
only reachable from a red.
Three discriminators, and all three must hold: it passes when run alone, an
immediate full re-run is green, and the two runs report the SAME totals with
the failure moved into the passed column — that totals identity is the
cheapest evidence a red is a flake rather than a case that stopped running.
Under the default reporter a one-off red cannot be attributed at all (it
prints only a count), so capture with `--reporter=verbose`. Check `uptime`
before chasing either: machine-load timeouts pick a different victim each
run, and the tell is the summary line, where a healthy `@ar/service` run
reads `import ~4s / tests ~2.5s` and a degraded one reads hundreds of
seconds. Never start a second vitest process while the full suite runs.

A green suite cannot say a file was COLLECTED. Renaming one out of the glob
leaves the run fully green and moves only the two denominators, which nobody
holds against a prior run — `bun x vitest list --filesOnly` collects without
running, so a grep over it answers membership directly and its count against
the run's own parenthesised denominator ties collection to the run.

The bare-`.skip` sweep that runs beside the gate-helper histogram must be
scoped to the ROSTER `*.test.ts` files and NOT to the `tests/live/`
DIRECTORY. Three gate helpers live inside that directory alongside the
roster — `live-postgres.ts`, `live-n8n.ts`, `live-ollama.ts` — each carrying
a legitimate `describe.skip` in its own ternary plus several more in TSDoc,
and the tracked guidance names only `tests/helpers/port-parity.ts` as the
helper to exclude, which is the one helper NOT inside the sweep's own
directory. So the natural `-- packages/service/tests/live/` pathspec reads
as if the gates had been hardcoded: measured 11 hits across those three
helpers against ZERO across the 28 roster files. Build the roster with a
DEPTH-ANCHORED regex over the listing
(`^packages/service/tests/(live|parity)/[^/]+\.test\.ts$`), since a pathspec
`*` crosses `/`, and pair the roster's zero with a planted control through
the identical matcher.
