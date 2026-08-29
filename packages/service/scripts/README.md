# scripts — hand-run entry points

This directory holds the commands somebody runs by hand rather than the
ones a service runs for itself: seeding, approving, building and deploying
workflows, stamping out a new module, standing the stack up, and tearing
it down again. Most of them are an operator's. `scaffold.ts` is the one a
contributor runs instead, which is a difference in who types it rather
than in how it is written — it takes its arguments, refuses them and
reports what it did the way every other command here does.

Phase 1 landed the layout and the roster below, and each phase since has
filled the rows it owns; the `Arrives in` column marks the ones that have
landed.

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
| `scaffold.ts` | phase 4 — landed | `bun run scaffold <generator> <name> <target-dir>`. Stamps out the file shapes this package makes repeatedly, so a new module starts from the conventions rather than from a blank file and somebody's memory of them. Three parts in the order a run reaches them: the command line is read into a request, refusing an unknown generator, a missing operand and a name that is not a safe file stem; a generator turns that request into files as values, with nothing written and no directory touched; and the half that reaches the filesystem writes nothing at all unless every path it was handed is free, so a rerun over a library somebody has since written cannot replace it with a placeholder. The target directory is an argument rather than a path resolved off the file, so the same command stamps a package and a throwaway fixture tree — and cannot write into the repository merely because it was run from inside it. |
| `bootstrap.sh` | phase 7 | Brings the self-contained stack up and imports credentials. Idempotent. |
| `panic.sh` | phase 7 | Stops everything in this project that can spend money, on every reachable host, in one command. |
| `test-stack.sh` | phase 7 | Creates and destroys a disposable scratch stack, so verifying never touches anything live. |
| `verify-external.sh` | phase 7 | Read-only verification of an external-mode deployment: the workflows exist and are active, the dependencies answer, the schema is migrated. |
| `check-doc-links.ts` | phase 7 | Asserts every relative markdown link in the tracked docs resolves to a file that exists. |

Not every `.ts` file here is a command. `workflow-markers.ts`,
`n8n-workflow.ts` and `n8n-client.ts` landed with the phase-3 rows of the
roster and are halves beneath them rather than entry points of their own:
no `package.json` script names one, and none carries the `INVOKED_AS_CLI`
block each landed `.ts` command guards its run with. They are named here
rather than inside a row because each is read by more than one of those
commands, where `seed-schemas.ts` and `seed-apply.ts` sit inside
`seed.ts`'s row because it is the only command that reads either.

`workflow-markers.ts` holds the marker grammar and the build-time settings
table those markers resolve against. It is split from `build-workflows.ts`
so that a rule decidable without a filesystem or a transpiler can be
driven without either, which is what lets a case assert a refusal by
calling one function. `audit-workflows.ts` compiles the same two grammars,
to refuse a display name still carrying a marker rather than hold one
against an instance.

`n8n-workflow.ts` and `n8n-client.ts` split what an instance-facing
command asks along the line where the instance itself is needed.
`n8n-workflow.ts` answers from a workflow value alone — which of its nodes
would arm it, which envelope members the public API takes — and holds
those answers in one place so that no two of the three instance-facing
commands give different ones; `deploy-external.ts` and
`activate-workflows.sh` read it. `n8n-client.ts` is the half that opens a
socket and wants the key: every HTTP call this package makes against an
instance, and the refusal for a reply that is not a success.
`deploy-external.ts` and `audit-workflows.ts` are the two commands that
call in, and `activate-workflows.sh` is the one that does not, activation
going through the CLI inside the container rather than over the API.

Database migrations stay drizzle's end to end (`drizzle/`,
`drizzle.config.ts`, `bun run db:generate` / `db:migrate`): a script here
that also moved schema would be a second engine. `scaffold.ts`'s
`migration` generator is not one. It writes a skeleton and nothing else —
it reads no schema, opens no connection, applies nothing, and leaves the
index, the timestamp and the snapshot that would make its output part of
that chain unfilled, because a generator that is a pure function of a name
knows none of them.

The phase-7 group is deferred on purpose. Each of those scripts drives a
stack — compose, credentials, a live instance — that does not exist until
the pipeline it serves does, so writing one earlier would mean writing it
against a shape still being decided.

## `scaffold.ts` generators

One row per generator the registry holds. The word in the first column is
what an operator types, and `bun run scaffold` with nothing after it
prints the same list — built from the registry rather than written out, so
a usage line cannot name a generator the parser does not accept. This
table is the prose half of that list and says what each one is for.

| Generator | Emits |
| --- | --- |
| `lib` | `src/lib/<name>.ts` and `tests/lib/<name>.test.ts`. The module carries the three dual-context rules a spliceable library obeys rather than pointing at them, because the moment somebody is most likely to break one is while writing the file. Both halves are placeholders and say so: the export throws, and the case beside it asserts that it throws. That pairing is the point — a generated case that passed whatever the module did would leave a new library covered by nothing while reporting a green suite over it, where this one reddens the moment the library is written. |
| `source-adapter` | `src/sources/<id>.ts`, `src/sources/<id>.test.ts` and `src/sources/<id>-payload.json`. The skeleton declares every member of the `SourceAdapter` contract and is arranged around two of its rules: `fetch` is the only member that does I/O, so `parse` and `toCanonical` are pure and can be driven over a stored payload; and the endpoint and `parser_config` bind at construction rather than per call, so `parse` stays a function of the payload alone. Its operand is an id rather than a name, because that is what the registry keys on and what a `sources` row selects. Every member throws, and the cases assert the refusals, on the same reasoning as `lib`. |
| `migration` | `drizzle/<nnnn>_<name>.sql` and `drizzle/meta/<nnnn>_<name>.journal-entry.json`. For DDL `src/db/schema.ts` cannot express — a trigger, a function, a `COMMENT ON` — which `bun run db:generate` will therefore never write, never diff and never propose dropping. The `.sql` carries two statements with one `--> statement-breakpoint` between them, because a hand-written migration is almost always an object and the thing that attaches it and the marker between the two is what nobody remembers. Both statements raise, on the same reasoning as `lib`. |

The `lib` pair rather than the module alone, because a library under
`src/lib/` with no case file is not a shape this package has. What proves
a library behaves is the default suite; what proves the copy spliced into
a Code node behaves is a round trip under `tests/build/`, which builds a
real artifact and runs the spliced body under the globals a node is
given. A generator emitting only the source would leave the first of
those to memory.

The `source-adapter` trio for the neighbouring reason, one file further:
the cases read the payload on their very first run, so a generator
stopping at the pair emits a suite that fails for a reason having nothing
to do with the adapter. That fixture is an envelope — a `_readme` beside
a `payload` key rather than inside it — because every JSON file this
package commits carries a header saying which path owns it, and one
written into the payload itself would reach `parse` as though the source
had answered with it. The payload is `null`: a plausible-looking reply is
one somebody can forget to replace.

All three land in one directory rather than split across `src/` and
`tests/` the way the `lib` pair is. A spliceable library is read by the
build as well as by the suite, and an adapter is read by neither, so
colocating follows this package's existing convention for a module whose
cases are about that module alone (`src/cron/cron.test.ts`,
`src/notifications/dispatch.test.ts`) and puts all three in one listing.

The `migration` pair because a `.sql` file with no journal entry is not a
migration: the migrator walks `drizzle/meta/_journal.json`, resolves each
entry's tag into a filename, and never opens a file no entry names. A
generator stopping at the SQL would emit something that looks applied and
has never run.

That entry lands as a file of its own rather than as an edit to the
journal, because an edit is an overwrite and nothing this command does
overwrites anything. It is an envelope — a `_readme` beside an `entry`
key — for the reason the payload fixture is one, with the difference that
what goes into the journal is the `entry` value exactly as it stands.
Moving it is a person's, and the header says so.

Neither half is complete, and both say which parts are missing. The
index, the timestamp and the snapshot are all properties of the `drizzle/`
tree the pair will land in, and a generator that is a pure function of a
name knows none of them. The index is `9999`, which no tree can already
hold and which sorts to the end of a listing; the timestamp is the epoch.
The snapshot — the third artifact `drizzle-kit generate --custom` writes —
is left absent rather than guessed, because an absent snapshot is loud
where a wrong one is a generated diff proposing to drop everything the
snapshot does not model.

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

The package's `lint` script was widened with it, and reads
`eslint src lib workflows tests scripts` today (`lint:fix` likewise) —
phase 3 added the `workflows` entry. The reason is the same one, one gate
over: an unlinted `.ts` file makes a green `lint:all` a statement about
files it never read.

Both widenings were then proved by reading rather than assumed.
`tsc -p tsconfig.json --showConfig` echoes the `include` array as tsc
parsed it, which is the half answerable before any `.ts` file exists;
`tsc --noEmit --listFilesOnly` names every file in the program, and every
`.ts` file in this directory appears in it (four at the close of phase 2),
while `*.test.ts` counts zero, this directory having none of its own. (The
service tsconfig used to exclude test files package-wide; it no longer
does, so that zero is now about this directory rather than about a gate.)

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
