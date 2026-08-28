# AGENTS — template-service-express

Standalone Express + MCP service template. Single package, bun-first, no
workspace. Read this before changing anything; the per-area conventions live
in `.claude/skills/` and are pointed to below.

## Layout

| Path | What it is |
| --- | --- |
| `lib/` | The framework: `express` (createService: DI, middleware, health, `/_control`, auth middleware, shutdown), `service-core` (dependencies, typed clients, circuit breaker, retry, http client), `mcp` (createMCP: stdio/HTTP transports + health), `logger` (pino), `errors` (AppError family + the error handler createService registers). Treat as library code — stable, well-tested, changed deliberately. |
| `src/` | The service: `config.ts` (zod env, fail-fast), `routes/`, `db/` (Drizzle+Postgres, default on), `redis/` (opt-in via `REDIS_URL`), `cron/` (interval jobs as a managed dependency), `notifications/` (preference-aware dispatch + channel stubs), `auth/` (dev introspection stub), `mcp/` (MCP entry + tools). |
| `src/lib/` | Pipeline libs, written dual-context so `scripts/build-workflows.ts` can splice one into an n8n Code node body — a node then runs the same function the suite imports rather than a second copy written for the canvas. Three rules are what that costs: no value imports, declaration-form exports only, and no reliance on module scope; the build refuses the first two by name. `schedule.ts` (the interval clamp and batch cap `ar-dispatch` applies) is the first and landed in phase 3; the ported wave arrives in phase 4. Distinct from the framework `lib/`. |
| `src/sources/` | Source adapters: the `SourceAdapter` contract (`fetch` → `parse` → `toCanonical`, with I/O confined to the first step) and the adapters that satisfy it from phase 4 onward, push capture included. |
| `src/exports/` | Export renderers, one per format a subscription can be rendered into (phase 6). A renderer returns artifacts and never dispatches them — the email format renders a draft and stops there. |
| `workflows/` | n8n workflow sources in `workflows/src/`, one JSON file per workflow. `ar-dispatch.json` landed in phase 3 and is the whole of the directory today: it claims due schedulable rows and invokes the workflows they belong to, and it holds the only schedule trigger across the workflow set. The other five in the roster arrive in phases 5 and 6. `workflows/src/README.md` carries that roster, the one-file-per-workflow rule and the marker forms a source may write. `bun run build:workflows` resolves those markers into the gitignored `workflows/dist/` (and `workflows/dist-external/` for a deploy), which is generated and never hand-edited. |
| `data/` | Seed files only, applied to the database by `scripts/seed.ts` — nothing under it is read at runtime. The five JSON files here seed one worked example domain and stay domain-neutral; real subject matter reaches the database through an operator's own seeds. See `data/README.md`. |
| `scripts/` | Operator entry points run by hand. Six have landed: `seed.ts` (`bun run db:seed`), `approve.ts` (`bun run approve`), `build-workflows.ts` (`bun run build:workflows`), `deploy-external.ts` (`bun run deploy:external`), `audit-workflows.ts` (`bun run audit:workflows`), and `activate-workflows.sh`, run by path rather than through a `package.json` script. Not every `.ts` here is a command: `workflow-markers.ts`, `n8n-workflow.ts` and `n8n-client.ts` are halves read by more than one of them and carry no CLI guard. The stack-lifecycle scripts and the doc-link check arrive in phase 7. `scripts/README.md` names every script and the phase each arrives in. |
| `tools/ralph/` (umbrella root) | The agent task loop: `plan` (spec → PLAN/PREREQUISITES), `start` (tracker loop, `--plan`, `--start-at`), `usage`. |
| `tests/` | Cross-cutting tests; `tests/live/` is the live suite (see Testing). Package-level tests are colocated (`lib/**/__tests__`, `src/**/*.test.ts`). |
| `specs/` | TRACKED follow-up specs + index (`specs/README.md`) — only for work whose subject is already visible in the code (refactors, hardening of published code, tooling). |
| `.specs/`, `.plans/` | UNTRACKED (gitignored) working areas — see "Plans and specs" below. |
| `docs/` | Tracked guides (drizzle, rpc, sse, seeding). Generated output goes to gitignored `.docs/` (`bun run docs:generate`). |
| `docs/architecture/` | The architecture doc set: the platform shape, the layout map, and the invariant register — indexed from `ARCHITECTURE.md` and numbered by reading order. See "Research pipeline" below. |

## Research pipeline

This package is where the research pipeline lands, and its design is
written down rather than inferred:

- `ARCHITECTURE.md` — the index of the architecture doc set; read it
  first.
- `docs/architecture/00-overview.md` — the platform shape (Postgres as
  the only source of truth, n8n as the pipeline executor, this service
  as the API over the same schema), the layout map, the core
  vocabulary, which document covers each behaviour area, and the test
  harness.
- `docs/architecture/01-invariants.md` — the register of platform-wide
  invariants: what each one is, the artifact that fails when it stops
  holding, the phase that lands that artifact, and its status today.
- `docs/SEEDING.md` — the seed-authoring guide: the shape of a file
  under `data/`, the `"_readme"` header every one opens with, the
  underscore-stripping convention, the natural key each concern is
  upserted on, and the steps to add a domain. It sits outside
  `docs/architecture/`, so `ARCHITECTURE.md` does not index it.
- `.specs/2026-08-19-research-pipeline-port.md` — the approved parent
  design the port runs from, in seven phases. Untracked on purpose
  (see "Plans and specs" below), so it sits on the machine doing the
  work rather than in a clone.

Two rules bind every phase of that port:

- **Same-commit doc-update law**: a commit that changes behaviour in a
  row of the mapping table in `docs/architecture/00-overview.md` updates
  that row's document in the same commit, and behaviour no row covers
  adds a row.
- **Naming invariant**: no naming from the project this pipeline was
  ported from, no vault path, and no real hostname appears in the
  package's scanned source — `tests/invariants/naming.test.ts` fails
  naming the file and line of every hit.

## Conventions

- **Env**: all configuration through `src/config.ts` — zod-validated at
  import, `import process from 'node:process'` (bare `process` fails lint).
- **Dependencies**: anything with a lifecycle (db, redis, cron, future
  queues) is a `createDependency` passed to `createService({ dependencies })`
  — started in order, stopped in reverse, visible to `/_control`.
- **Schema**: tables live one concern per file under `src/db/schema/`, and
  `src/db/schema.ts` is a pure barrel of
  `export * from './schema/<x>.js';` lines. A new module there is only
  half-added until its barrel line lands: without it drizzle-kit never
  sees the table (so no migration is generated) and `drizzle({ schema })`
  cannot resolve a relation it was never handed — both fail silently, not
  loudly. Add the line when the FILE is created, even if its first commit
  defines only a helper. `values.ts`
  is the deliberate exception: it declares the closed value sets and no
  table, so siblings import it directly and it stays out of the barrel.
  Three consumers pin the barrel's path (`drizzle.config.ts`,
  `src/db/index.ts`, `tests/live/live-postgres.ts`) — never move it.
- **Errors**: throw `AppError` subclasses (`lib/errors`) or let Zod errors
  bubble — the registered handler maps them to typed JSON responses. Express
  4 does NOT auto-forward async route errors: wrap async handlers in
  try/catch + `next(err)` (see `src/index.ts` `/users`).
- **Routes**: validate input at the boundary with zod (see the `api` skill).
- **Docs**: TSDoc on exported surfaces; see the `documentation` skill.
- **Tracked markdown**: no author/date header — files open straight with
  `# Title`. Under `docs/architecture/`, `##` headings are noun labels
  (`Layout`, `Core vocabulary`) while `###` sub-headings are assertive
  full-sentence claims (`Vitest is the single test runner`), each followed
  by the why. Prose wraps at ≤74 cols, table rows run long, and paths are
  inline code rather than links, so a future link check has no forward
  reference to resolve. `ARCHITECTURE.md` is the one tracked markdown file
  here that carries links: it indexes the doc set, so a commit landing a new
  architecture doc adds its row in the same commit.
- **Two layout maps, neither derived from the other**: the coarse `## Layout`
  table above (package-level orientation) and the finer one in
  `docs/architecture/00-overview.md` (per-area detail and rationale). A
  change that adds a directory updates BOTH, keeps them non-contradictory
  rather than identical, and inserts the row adjacent to its parent so the
  table still reads as a tree.

## Verification order

```bash
bun run lint && bun run check-types && bun run test
```

All three must be green before a PR. `check-types` covers `**/*.test.ts`
too: the exclusion carried from the origin is gone, so a type error in a
test file fails the gate like any other.

Run these from inside `packages/service` as the fast inner loop (seconds);
the root `lint:all` / `check-types:all` / `test:all` fan-out is the gate
before a PR.

`tests/` no longer carries a type-checking asymmetry: plain `.ts` modules
and their `*.test.ts` siblings are both in the program (tsconfig `include`
lists `tests`, and nothing excludes the tests). Matcher, walker and helper
logic inlined into a `.test.ts` now gets the same tsc gate as a plain
module beside it, so splitting it out is a readability call rather than
the coverage one it used to be.

A new directory under `src` needs no config change (tsconfig `include`
already covers `src`, the `lint` script covers `src lib tests scripts`,
and vitest discovers tests). `scripts/` used to be asymmetric — listed by
tsconfig `include`, unnamed by the `lint` script — and phase 2 closed the
gap, so a `.ts` file there is both type-checked and linted. Phase 3 widened
`lint` to `eslint src lib workflows tests scripts`, which reaches the
workflow sources, `workflows/src/README.md` AND both generated trees (the
base config's `dist/**` ignore is base-relative and does not match a nested
`workflows/dist/**`), so that gate's file set moves with build state — a
fresh clone lints two files under `workflows/` where a built tree lints
four. It reads STRUCTURE only there (`jsonc/indent`, empty lines, markdown
recommended): no node name, statement, marker form or display name is
checked by it. `data/` and `docs/` are still covered by no lint or
type-check target.

Prove coverage rather than assuming it — and prove it from the directory you
are running in, because BOTH gates are cwd-dependent. `eslint`'s governing
leaf config changes with the launch directory, so a file "no lint gate
reads" from the repo root is ordinarily linted from inside the package;
`tsc`'s program is worse than partial — from `packages/service` it is ~857
files of which 91 are the package's, and from the repo root it is ~311 of
which ZERO are. Use `--no-warn-ignored -f json` for eslint (a plain
`errorCount: 0` is indistinguishable between a clean file and a skipped one;
the tell is `warningCount: 1` carrying `File ignored`) and
`tsc --noEmit --listFilesOnly` for types, which has no third state. The
strongest reading of either is a COUNT DELTA between two argument lists
rather than a grep for one path. See the `prove-gate-coverage-read-only`
skill.

A `.sh` under a scan root is a third cell: `collectScannedFiles` applies no
extension filter, so the naming invariant reads it, while `eslint` and `tsc`
name it never. Shell behaviour here is proven by RUNNING it — including its
refusal paths — and by nothing else.

Markdown and JSON are gated unevenly here, and the map is worth knowing
before calling a prose edit verified. The naming invariant's scan roots
carry no extension filter, so they reach three READMEs —
`workflows/src/`, `data/` and `scripts/` — plus everything generated
under `drizzle/`, meta snapshots included. ESLint's `**/*.md` block
reaches a markdown file only where a lint target names its directory,
which today is `scripts/README.md` alone, and it checks document
STRUCTURE only: no width, no link target, no reference label. Everything
else — this file, `ARCHITECTURE.md`, all of `docs/`, and `package.json` —
is read by NO gate at all, so a green `test:all` says nothing about it.
Verify those by deriving each claim from the artifact it describes (parse
the roster out of the prose, compare it against the barrel or the
directory) rather than by reading the doc and agreeing with it.

Neither `max-len` nor `max-lines` exists in any config, so the ~800-line
file cap and the hand-maintained comment wrapping are review-quality
conventions that turn no gate red. Re-derive the over-cap roster
(`wc -l scripts/*.ts | sort -rn`) rather than quoting one: phase 3 put five
more files over it, `scripts/workflow-markers.ts` furthest by a wide margin,
and any roster written down here goes stale on the next docs task without a
gate to say so.

Comment WIDTH is likewise measured and not quoted. It varies per directory,
per file and per block — `scripts/` alone spans 63 to 67 characters of text
— so read the width off the block you are editing (reproduce its existing
line breaks at each candidate width) rather than from a sibling, a
directory, or a number recorded in a doc. The `prose-reflow-helper-asserts`
skill carries the helper and the nine ways a programmatic rewrap ships
broken prose that every mechanical check passes.

The seam each over-cap file wants is recorded here rather than in the file:
split the LOADER out of
`seed.ts` into `scripts/seed-load.ts` (no import cycle, and it leaves
`seed.ts` a thin entry point — moving `runSeedCli` out instead does cycle,
since the guard must stay in the file `bun scripts/seed.ts` runs), and
move `formatPendingTable` / `formatRuling` / `PENDING_COLUMNS` out of
`approve.ts` into `scripts/approve-render.ts`, re-exported from it. Both
follow the `seed-schemas.ts` / `seed-apply.ts` precedent — a bare
`export * from './<x>.js';` beside the normal import — and a move of that
size lands as its OWN refactor commit, never alongside new behaviour.

## Testing — isolated vs live (CRITICAL)

The default suite is FULLY ISOLATED: no db, no network, no credentials.
Keep it that way — a past incident where tests ran against live
infrastructure with real credentials burned a month of tokens in under an
hour. The rules:

1. New tests mock or fake external systems by default. If a fake gets
   nontrivial, give the fake its own contract tests.
2. Live tests go in `tests/live/*.live.test.ts`, gated through
   `describeLivePg` or `describeLiveN8n` by the service they need (env-var
   opt-in → `describe.skip` otherwise; keep the explicit type annotation —
   inference breaks `tsc` with TS2742).
3. Live tests run only against the `--profile stress` compose services
   (`bun run stress:start / test:live / stress:stop`) — separate port,
   separate database name, no volume.
4. Destructive helpers must call `assertLiveDatabase` (refuses any database
   but `ar_live`). Never widen the truncate list implicitly.
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

`describeLivePg` is one of two gates in that directory. `describeLiveN8n`,
in `tests/live/live-n8n.ts`, keys the n8n cases to `AR_N8N_URL` the same
way, and the two are armed differently — which is the part to know before
reading a run. `test:live` sets `AR_LIVE_DATABASE_URL` in its own script
definition and sets nothing else, so it opens the Postgres gate itself and
leaves the n8n one shut; nothing here exports `AR_N8N_URL`, and a value an
operator put in `.env` for the deploy commands does not reach a worker. A
live run with the stress container up therefore reports the n8n file
skipping while the Postgres files run, which is that command's steady state
rather than a broken setup, and the skip count a plain `bun run test` prints
now has two sources behind it.

There is also nothing here to point that gate at, which is why rule 3 is one
an n8n case cannot satisfy rather than one it breaks. `docker-compose.yml`
declares postgres, redis and postgres-live and no n8n service, and
`scripts/bootstrap.sh`, which would stand one up, is phase 7 in
`scripts/README.md`'s roster, so until that phase the instance an n8n case
needs is an operator's own, started by hand. Every command this package
ships leaves those cases skipped, which makes what is written under that
gate debt recorded rather than behaviour a gate here proves: treat a case
added there as unrun until somebody runs it. `tests/live/live-n8n.ts`
carries the rest — what a skipped-but-collected case still reports, and the
one place the seam can be broken without touching the gate.

Test files open with a `/** ... */` header stating what the file PROVES (not
what it calls), and separate regions with `// ---` banner comments 78 chars
wide. Table-driven suites carry their own anti-vacuity guards — pair samples
to the constant table by id and assert set equality, or an entry added later
is silently untested (see the `table-driven-test-vacuity-guards` skill).

The default suite READS `workflows/dist/` and never builds it. `pretest`
runs `bun scripts/build-workflows.ts`, so the tree is written in a bun
process of its own before any worker opens it. bun keys that hook to the
script NAME rather than to the launcher: it fires for the `test` script —
`bun run test`, a path appended to it, and the root fan-out that runs the
same script — and for no other. `test:live`, `test:watch` and a bare
`bun x vitest run <path>` all read whatever the directory happens to hold,
so `bun run test <path>` and `bun x vitest run <path>` are two ways of
running one file that differ in exactly this. Rebuild by hand before reading
a built artifact for any purpose.

Forgetting is loud rather than silent, but only in the run log.
`loadBuiltWorkflows` refuses a tree that yielded no artifact, naming the
directory and `bun run build:workflows`, so the absence checks over built
output cannot sweep nothing and pass. It throws at module scope, though, so
the summary reads `Test Files 1 failed (1)` and `Tests no tests` — byte for
byte what an unparseable test file prints. The case counts are not the
reading; the class in the log is.

A worker cannot do that build itself, so do not write one there.
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

Two known flakes live in the vendored framework `lib/` half, neither in
anything this port wrote, so a single red case naming one of them is not a
regression in your change. In `lib/express/control/routes.test.ts`, the
restart route's `returns 404 when control plane is disabled` case is
order-dependent; in `lib/express/builtin-routes.test.ts`, `GET /health`'s
`returns 200 when all dependencies are running` fails with `socket hang up`,
which is transport-level rather than an assertion at all.
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

## Plans and specs

`.plans/` and `.specs/` are the destinations for working plans and specs,
and they are **gitignored on purpose**: these files routinely describe
critical bugs (privacy/security) before they are patched, and must never
reach the remote ahead of the fix. Rules:

- Generated plan artifacts (`PLAN-<stub>.md`, `PREREQUISITES-<stub>.md`,
  `PLAN_TRACKER-<stub>.md`) live in `.plans/` — `ralph plan` writes there,
  and the loop's commit step can then never pick them up by accident.
- Specs you are actively working from go in `.specs/`. The tracked `specs/`
  directory is only for follow-ups whose subject is already visible in the
  public code (e.g. hardening notes on shipped modules); when in doubt,
  `.specs/`.
- Never "tidy" these files into a tracked path, and never weaken the
  `.gitignore` entries.

## The loop

`bun run ralph plan --spec=<specs|.specs>/<file>.md` writes
`.plans/PLAN-<stub>.md` (+ `.plans/PREREQUISITES-<stub>.md` when needed) per
the `dev-planner` skill; when a `progress.txt` exists, its findings are
injected as advisory planning context (skip with `--no-progress`).
`bun run ralph start --plan=.plans/PLAN-<stub>.md` executes it task-by-task
with a per-plan tracker, marking `[x]`/`[BLOCKED]` and resuming blocked
tasks first. `--start-at=HH:MM` defers a run. On completion the loop
promotes general findings from `progress.txt` into the repo docs/skills and
then compacts the file per `.claude/skills/progress-hygiene/SKILL.md` —
progress feeds future plan generation, so it must stay small and current.

## Issue reporting

The `qa-bug-reporter` agent files findings as GitHub issues via `gh`
(dedupes first, never guesses priority, asks before filing). Security
findings are routed to a private security advisory by a human — never to the
public tracker, and never searched for on it first.

## Workflow

Feature-branch → PR → merge. `test.yml` gates PRs with the isolated suite
only. Integration/live testing is a local (or self-hosted-runner) concern by
design.
