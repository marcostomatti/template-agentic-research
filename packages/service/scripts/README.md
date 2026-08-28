# scripts — operator entry points

This directory holds the commands an operator runs by hand: seeding,
approving, building and deploying workflows, standing the stack up, and
tearing it down again. Phase 1 landed the layout and the roster below, and
each phase since has filled the rows it owns; the `Arrives in` column
marks the ones that have landed.

Phase numbers throughout refer to the 7-phase sequencing in the parent
design, `.specs/2026-08-19-research-pipeline-port.md` §7.

## Roster

| Script | Arrives in | Role |
| --- | --- | --- |
| `seed.ts` | phase 2 — landed | `bun run db:seed`. Validates every seed file in `data/` before a connection is opened, then applies the bundle in one transaction and reports created, updated and unchanged per concern. The only code path that takes a value out of that directory. `seed-schemas.ts` and `seed-apply.ts` are the shape half and the write half beneath it, not entry points of their own. |
| `approve.ts` | phase 2 — landed | `bun run approve`. Lists the rows waiting on a ruling and approves or rejects one by id, a client of `research_pool_approval_check` rather than a substitute for it. The whole operator surface until the API and UI take approvals over. |
| `build-workflows.ts` | phase 3 — landed | `bun run build:workflows`. Reads every source in `workflows/src/`, resolves the markers each one carries — a library spliced out of `src/lib/`, a build setting baked in — and writes one artifact per source into `workflows/dist/`, refusing a marker that survived into the output. `--external` resolves those settings against the environment and `.env` instead, writing `workflows/dist-external/`, which is the tree a deploy uploads. Also what `pretest` runs, so the invariant suite reads a tree built from the sources beside it rather than whatever was last left on disk. |
| `deploy-external.ts` | phase 3 — landed | `bun run deploy:external`. Uploads the `--external` build's artifacts to an n8n that already exists, over its public REST API — no container, no compose file, no shell on the host — upserting on the display name, so a rerun replaces rather than leaving a second copy. Refuses a dirty tree and an unset `AR_N8N_URL` or `AR_N8N_API_KEY` before it builds anything or makes a request. What it leaves is inert: `POST /workflows` stores a workflow inactive whatever the body carried, so an operator who has deployed has not yet armed anything. |
| `activate-workflows.sh` | phase 3 — landed | `scripts/activate-workflows.sh`. Arms imported workflows on a local instance, where activation goes through the n8n CLI inside the container rather than the API — which is why this one wants a container and `deploy-external.ts` and `audit-workflows.ts` do not. Reads `workflows/dist/` to sort the artifacts an activation would arm from the manual-only ones it names and leaves alone, refuses a container that is not running, gives each armed workflow the `workflow_history` row a publish needs to publish against, then publishes. `AR_N8N_CONTAINER` names the container, defaulting to `ar-n8n`. |
| `audit-workflows.ts` | phase 3 — landed | `bun run audit:workflows`. Lists every workflow an instance is holding and sorts it against the display names `workflows/src/` declares: known, stray, armed stray, missing, duplicate, and a verdict over them. Read-only unless asked otherwise, and it exits 0 whatever the verdict, which is a reading an operator acts on rather than a gate. `--deactivate` and `--prune` are the two flags that change anything, each refused without `--yes` beside it, and neither will touch a workflow the sources declare. |
| `bootstrap.sh` | phase 7 | Brings the self-contained stack up and imports credentials. Idempotent. |
| `panic.sh` | phase 7 | Stops everything in this project that can spend money, on every reachable host, in one command. |
| `test-stack.sh` | phase 7 | Creates and destroys a disposable scratch stack, so verifying never touches anything live. |
| `verify-external.sh` | phase 7 | Read-only verification of an external-mode deployment: the workflows exist and are active, the dependencies answer, the schema is migrated. |
| `check-doc-links.ts` | phase 7 | Asserts every relative markdown link in the tracked docs resolves to a file that exists. |

Database migrations are deliberately absent: drizzle owns them end to end
(`drizzle/`, `drizzle.config.ts`, `bun run db:generate` / `db:migrate`),
and a script here that also moved schema would be a second engine.

The phase-7 group is deferred on purpose. Each of those scripts drives a
stack — compose, credentials, a live instance — that does not exist until
the pipeline it serves does, so writing one earlier would mean writing it
against a shape still being decided.

## `.ts` for logic, `.sh` for orchestration

A script whose interesting part is a decision — what to build, which
workflows count as strays, whether a link resolves — is TypeScript, so the
decision is a function the test suite can import and drive directly. A
script whose interesting part is a sequence of external commands —
compose, credentials, container lifecycle — is shell, because wrapping
those in TypeScript buys nothing and hides the command that actually ran.

The split is worth keeping deliberate: a shell script that grows a
non-trivial decision has quietly become untestable, and that is the point
to move the decision into a `.ts` module the shell calls.

## `tsconfig.json` and `lint` both cover `scripts`

`packages/service/tsconfig.json` reads
`"include": ["src", "lib", "tests", "scripts", "*.ts", "*.mjs"]`. The
`scripts` entry is load-bearing rather than decorative: the `*.ts` entry
beside it matches only files sitting directly in the package root — a glob
segment does not cross a directory separator — so without it every `.ts`
file added here would be invisible to `bun run check-types`.

Phase 2 widened it, ahead of `scripts/seed.ts`, the first `.ts` file to
land here. The failure it prevents is the quiet kind: a type error in an
unchecked script does not turn `check-types:all` red, so the suite keeps
reporting a clean result over a file it never looked at.

The package's `lint` script was widened with it, and now reads
`eslint src lib tests scripts` (`lint:fix` likewise). The reason is the
same one, one gate over: an unlinted `.ts` file makes a green `lint:all` a
statement about files it never read.

Both widenings were then proved by reading rather than assumed.
`tsc -p tsconfig.json --showConfig` echoes the `include` array as tsc
parsed it, which is the half answerable before any `.ts` file exists;
`tsc --noEmit --listFilesOnly` names every file in the program, and every
`.ts` file in this directory appears in it (four at the close of phase 2),
while the by-design `**/*.test.ts` exclusion still counts zero.

`eslint scripts -f json` reports one file more for this directory: the
same scripts plus this README, because `eslint.base.mjs` lints markdown
wherever a target reaches it. Run it from inside the package — from the
repo root the leaf config never applies, and eslint reports the path
ignored while still exiting 0, which reads exactly like a clean lint of a
file it never opened.

A listing says what a gate read, never what it would catch, and the two
catch disjoint things. A scratch `scripts/__gate-probe.ts` holding one
type error makes `bun run check-types` exit 2 naming the file and the
line, and lints at zero errors and zero warnings in the same second,
because the type-aware `project` setting in `eslint.base.mjs` is commented
out. So a green `lint` here is no evidence about types and a green
`check-types` is none about style: a directory is covered only once both
reports name it.

## Files added here are scanned

This directory is one of the scan roots of the naming invariant
(`tests/invariants/naming.test.ts`): a script committed here is checked
for origin-project naming, vault paths, and real hostnames like every
other source file. Hostnames, credentials, and instance-specific paths
belong in the untracked environment and reach a script through it — never
as a default written into the file.
