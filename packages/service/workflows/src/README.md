# workflows/src — n8n workflow sources

This directory holds the **editable source** for every n8n workflow in the
research pipeline. Phase 1 landed the layout and the rules below, phase 3
landed `ar-dispatch.json`, and phases 5 and 6 landed the rest. Which of
the six are here is the roster's delivered-in column below, not a count
in this paragraph.

The build landed with that first workflow, which is what makes the rules
below a description of what runs rather than a plan:
`bun run build:workflows` reads every file here, and
`tests/invariants/workflows.test.ts` holds the set-wide invariants against
what it wrote.

Phase numbers throughout refer to the 7-phase sequencing in the parent
design, `.specs/2026-08-19-research-pipeline-port.md` §7.

## One JSON per workflow

Every workflow is exactly one file here, named `<workflow-id>.json` — the
same id the roster below uses and the same id the workflow carries on the
n8n instance. No workflow is split across files, and no file holds two
workflows.

The 1:1 rule is what the surrounding tooling assumes:

- the build is a per-file transform — one source file in, one built
  artifact out (see below), so a file that is not a whole workflow has no
  artifact;
- the deploy and activate scripts (phase 3) key on the workflow id, so a
  file whose name does not match its id has no deploy target;
- a workflow change is reviewable as one file diff.

## Roster

| Workflow | Delivered in | Role |
| --- | --- | --- |
| `ar-dispatch` | phase 3 — landed | The only cron in the system. Claims due schedulable rows and invokes the others via Execute Workflow. |
| `ar-ingest` | phase 5 — landed | Pull adapters → dedupe → gate → document to finding. |
| `ar-capture` | phase 5 — landed | Generic push webhook: external capture clients POST against a documented capture contract. |
| `ar-score` | phase 5 — landed | Scores findings against the domain's criteria. |
| `ar-research` | phase 6 — landed | Entity research; carries the `validateEntityName` capability gate. |
| `ar-digest` | phase 6 — landed | Digests plus the export subscriptions the dispatcher schedules. |

Two invariants constrain the set as a whole, not any single file:
**exactly one schedule trigger exists across every workflow, and it lives
in `ar-dispatch`**, and **no workflow contains a send-capable node** —
workflows write to the database only, renderers return artifacts, and email
exports produce drafts. The register that tracks both, with the phase
that enforces each, is docs/architecture/01-invariants.md.

## Build output — `workflows/dist/`

`scripts/build-workflows.ts` (phase 3) reads every file in this directory
and writes one built artifact per source file to `workflows/dist/`. The
build resolves the markers a source template carries: library sources are
transpiled and spliced into Code nodes, so a node runs the same functions
the test suite imports, and build-time settings are baked in.

A marker is plain text inside a JSON string. Two forms may be written
here, and two more are refused by name:

| Form | What it names | What the build writes in its place |
| --- | --- | --- |
| `__INLINE:<path>__` | A library under `src/lib/`, by a path relative to that directory. | That library's body, transpiled to JavaScript and stripped of its `export` keywords. |
| `__ENVVAR:<NAME>__` | A build setting, by the name `ENV_DEFAULTS` in `scripts/workflow-markers.ts` declares it under. | Whatever the settings chain resolves that name to. |
| `__INLINE_JSON:<file>__` | Retired. Named a curated data file to bake into a node body as a JSON literal. | Nothing. The build refuses the source, naming the form. |
| `__INLINE_YAML:<file>__` | Retired. Named an operator-editable file to convert at build time. | Nothing. The build refuses the source, naming the form. |

Three things about writing a marker are not in the table. A setting has to
be declared in `ENV_DEFAULTS` before a marker may name it, or the build
fails naming that setting rather than resolving the marker to a blank.
Markers are replaced in object values only, so one written as a key is
left standing and fails the build at the end, as marker text nothing
resolved. And a marker carries no quotes of its own, so a source landing
one in executable code quotes it at the site: `ar-dispatch`'s Code node
writes `Number('__ENVVAR:AR_DISPATCH_BATCH_CAP__')`, because what is
spliced in is the resolved text and nothing else, and a bare marker is an
identifier.

The order the two live forms are resolved in, why a retired one fails the
build rather than passing through, and the three rules a spliced library
obeys are argued in `docs/architecture/03-workflows.md`.

`workflows/dist/` is **gitignored**, as is its sibling
`workflows/dist-external/` — the deploy-time build, which resolves
settings from the environment instead of the in-repo defaults. Neither
directory is an input to anything: both are rebuilt from this one.

## `dist` output is never hand-edited

A file under `workflows/dist/` or `workflows/dist-external/` is generated.
Editing one is always a mistake, in two ways at once: the next build
overwrites the edit, and because the directory is untracked, the edit never
appears in a diff, never gets reviewed, and cannot be reproduced on another
machine. The reviewed artifact is the source file in this directory.

The same rule covers the round trip through the n8n canvas. The instance is
a deploy target, not a source — importing a workflow, editing it there and
exporting the result back into `dist` loses the change on the next import
just as surely. Whichever way the mistake starts, the fix is the same:
make the change in `workflows/src/<workflow-id>.json`, rebuild, re-import.
