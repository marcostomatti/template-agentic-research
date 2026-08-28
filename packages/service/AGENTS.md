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

All three must be green before a PR. `check-types` currently excludes
`**/*.test.ts` (origin parity — see `specs/test-type-checking.md`).

Run these from inside `packages/service` as the fast inner loop (seconds);
the root `lint:all` / `check-types:all` / `test:all` fan-out is the gate
before a PR.

That `**/*.test.ts` exclusion creates an asymmetry inside `tests/`: plain
`.ts` modules there ARE type-checked (tsconfig `include` lists `tests`)
while their `*.test.ts` siblings are not. Keep matcher, walker, and helper
logic in a plain module beside the test — the same code inlined into the
`.test.ts` gets no tsc gate at all.

A new directory under `src` needs no config change (tsconfig `include`
already covers `src`, the `lint` script covers `src lib tests scripts`,
and vitest discovers tests). `scripts/` used to be asymmetric — listed by
tsconfig `include`, unnamed by the `lint` script — and phase 2 closed the
gap, so a `.ts` file there is both type-checked and linted. The
directories outside every root — `workflows/`, `data/`, `docs/` — are
covered by no lint or type-check target today. Prove coverage rather than
assuming it: `tsc --noEmit --listFilesOnly` and `eslint <path> -f json` both
report what they actually read (see the `prove-gate-coverage-read-only`
skill).

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
conventions that turn no gate red. `scripts/seed.ts` and
`scripts/approve.ts` are both over the cap today, and the seam each wants
is recorded here rather than in the file: split the LOADER out of
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
   `describeLivePg` (env-var opt-in → `describe.skip` otherwise; keep the
   explicit type annotation — inference breaks `tsc` with TS2742).
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

Test files open with a `/** ... */` header stating what the file PROVES (not
what it calls), and separate regions with `// ---` banner comments 78 chars
wide. Table-driven suites carry their own anti-vacuity guards — pair samples
to the constant table by id and assert set equality, or an entry added later
is silently untested (see the `table-driven-test-vacuity-guards` skill).

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
