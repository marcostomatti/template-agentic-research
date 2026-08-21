# scripts — operator entry points

This directory holds the commands an operator runs by hand: seeding,
approving, building and deploying workflows, standing the stack up, and
tearing it down again. It is empty today — phase 1 lands the layout and
the roster below, and the first script arrives in phase 2.

Phase numbers throughout refer to the 7-phase sequencing in the parent
design, `.specs/2026-08-19-research-pipeline-port.md` §7.

## Roster

| Script | Arrives in | Role |
| --- | --- | --- |
| `seed.ts` | phase 2 | Applies the seed files in `data/` to the database. The only code path that reads that directory. |
| `approve.ts` | phase 2 | CLI over the database approval gate, so a pending row can be approved before the service or UI exists to do it. |
| `build-workflows.ts` | phase 3 | Reads every source in `workflows/src/`, resolves its markers (transpile-and-splice libs, bake settings), writes `workflows/dist/`. |
| `deploy-external.ts` | phase 3 | Uploads built workflows to an existing n8n over its public REST API — no Docker, no shell on the target host. |
| `activate-workflows.sh` | phase 3 | Activates imported workflows on a local instance, where activation goes through the CLI rather than the API. |
| `audit-workflows.ts` | phase 3 | Inventories every workflow on an instance and names the ones that do not belong. Read-only unless asked otherwise. |
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

## `tsconfig.json` covers `scripts`

`packages/service/tsconfig.json` reads
`"include": ["src", "lib", "tests", "scripts", "*.ts", "*.mjs"]`. The
`scripts` entry is load-bearing rather than decorative: the `*.ts` entry
beside it matches only files sitting directly in the package root — a
glob segment does not cross a directory separator — so without it every
`.ts` file added here would be invisible to `bun run check-types`.

Phase 2 widened it, ahead of `scripts/seed.ts`, the first `.ts` file to
land here. The failure it prevents is the quiet kind: a type error in an
unchecked script does not turn `check-types:all` red, so the suite keeps
reporting a clean result over a file it never looked at.

The package's `lint` script (`eslint src lib tests`) has the same gap.
Whether this directory joins that target is a separate call, taken when
there is a script here to lint.

## Files added here are scanned

This directory is one of the scan roots of the naming invariant
(`tests/invariants/naming.test.ts`): a script committed here is checked
for origin-project naming, vault paths, and real hostnames like every
other source file. Hostnames, credentials, and instance-specific paths
belong in the untracked environment and reach a script through it — never
as a default written into the file.
