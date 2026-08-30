# Overview — the platform shape

A domain-agnostic research service: it researches one or more domains
under a shallow taxonomy, produces periodic digests, and exposes or
exports the results over several formats and protocols (MCP, Markdown,
RSS). What a deployment researches is data — a domain row and the
taxonomy under it — so a second domain is a seed, never a fork of the
code.

This file is the entry point to `docs/architecture/`: what the platform
is made of, where each part of it lives in `packages/service`, and the
vocabulary the other documents and the schema itself use. The approved
design it summarizes is `.specs/2026-08-19-research-pipeline-port.md`,
and phase numbers throughout refer to the 7-phase sequencing in that
design, §7.

## Three parts, one schema

The platform is three parts: a database, an executor that runs the
pipeline, and a service that exposes it. They are separable, but they
are not independent — all three sit on one schema, and that shared
schema is the property the rest of the design leans on.

### Postgres is the only source of truth

Every durable fact lives in Postgres: domains and their settings, the
taxonomy, sources and their parser configuration, documents, findings,
entities, run records and the model-call ledger, and the schedule state
that decides what runs next. No logic bypasses the database.

A workflow therefore reads what it needs at the top of its run and
writes its results back; nothing is carried between runs in a file, on
an editor's canvas, or in the environment. The untracked `.env` keeps
only what is needed to reach Postgres and n8n at boot.

The rule heads off three failures at once:

- two sources of truth drift the moment either is edited, and nothing
  afterwards reports which one a given behaviour came from;
- a fact only the executor knows is invisible to the API, to the
  operator, and to every export, so it can be neither reviewed nor
  corrected;
- a run whose state lives outside the database cannot be replayed,
  resumed, or audited after the fact.

### n8n is the pipeline executor

n8n runs the pipeline, and a workflow there is **wiring**: triggers,
queries, branching, and calls into other workflows. The logic those
nodes execute is TypeScript that lives in this package and is spliced
into the workflow at build time (phase 3), so the function a node runs
is the same function the test suite imports directly.

Workflows are parameterized as well: no prompt, no term list, and no
threshold is written into a workflow file. Each is fetched from the
database in the first node after the trigger.

Both halves exist for one reason — behaviour that lives inside a
workflow file is behaviour nothing can test and nobody can change
without a redeploy. With the split in place, changing what a domain
does is a row update, and a workflow diff stays small enough to review
as wiring.

Scheduling follows from the same shape: exactly one workflow holds a
schedule trigger (`ar-dispatch`), and it claims rows that are due by
their `next_run_at` column instead of keeping a timetable of its own.
The workflow roster, and the phase that delivers each, is in
`workflows/src/README.md`.

### The Express/MCP service is the API surface

`packages/service` is also the API over that same database. Its HTTP
routes and its MCP tools read and write the tables the workflows read
and write, through the same drizzle schema and the same migrations —
one schema and one migration engine, not one per consumer.

That is what keeps executor and API from drifting. A column the
workflows depend on is the column the API serves, a migration lands for
both at once, and a query written on either side is written against a
shape the other side already agrees with.

The service is also where capabilities that reach outward land later,
each behind its own approval gate. The executor stays send-free: its
workflows write to the database, renderers return artifacts, and an
email export produces a draft and stops there.

## Layout

Paths are relative to `packages/service`.

| Path | What it is |
| --- | --- |
| `lib/` | The service framework: express, mcp, service-core, errors, logger — and reserved for it. Distinct from `src/lib/`. |
| `src/db/` | Schema v2 and the drizzle client: the tables one file per concern under `src/db/schema/`, re-exported by the `src/db/schema.ts` barrel that drizzle-kit and the client both read. |
| `src/lib/` | Pipeline libs, written dual-context so the workflow build can splice one into a Code node body. `schedule.ts` is the first and landed in phase 3, which is what proves the splice over a library this package ships rather than a fixture; the ported wave landed in phase 4 — structured-text, delimited-record and message parsing, untrusted-text neutralization, entity-name validation, near-duplicate hashing, audit lines, chunk preparation, and the gating, scoring and feature mechanisms. Distinct from the framework `lib/`. |
| `src/sources/` | The source adapter contract, the static registry that selects one adapter by the id a `sources` row names, and the adapters that satisfy the contract, landed in phase 5: `listing-api.ts` for the `api` kind, which reads the listing endpoints a row's `parser_config` names, and `push-capture.ts` for the `push` kind, whose source posted to this service rather than waiting to be read. Extraction is not theirs to hold: it lives in the parse engine under `src/lib/`, `parser-config.ts` with `markup-select.ts` given to it as the markup step, because a workflow Code node can inline a library from there and no path from here, and the alternative is a second implementation of the same reading on the canvas. Beside them the modules those adapters share — a cursor-paged listing loop over several endpoints, and the pure text reductions — which front no source, are registered nowhere, and reach the network, where they reach it at all, only through a transport their caller injects. |
| `src/exports/` | Export renderers (phase 6): one per format a subscription can be rendered into. |
| `src/routes/`, `src/mcp/` | The API surface itself — HTTP routes and MCP tools over the schema. |
| `workflows/src/` | n8n workflow sources, one JSON file per workflow (phase 3 onward). See `workflows/src/README.md`. |
| `workflows/dist/`, `workflows/dist-external/` | Build output. Gitignored, and never hand-edited. |
| `scripts/` | Operator entry points: `seed.ts` applies the `data/` bundle, `approve.ts` lists the rows waiting on a ruling and approves or rejects one. Workflow build, deploy, activation and audit landed in phase 3; the stack-lifecycle scripts and the doc-link check arrive in phase 7. See `scripts/README.md`. |
| `drizzle/` | Generated migration SQL — the single migration engine, for executor and API alike. |
| `data/` | Seed files only, applied by `scripts/seed.ts`; nothing here is read at runtime. `domains.json`, `personas.json`, `categories.json`, `terms.json` and `topics.json` seed one worked example domain. See `data/README.md`. |
| `tests/` | Cross-cutting tests, including the invariant suite under `tests/invariants/`. |
| `docs/architecture/` | This document set. |

### `src/lib/` and `lib/` are two directories

The table names both, and no later phase merges them. `lib/` is the
service framework — express, mcp, service-core, errors, logger — and
stays reserved for it: a fork-style copy of a service template, held
as stable library code and changed deliberately. `src/lib/` is
application code: the scheduling lib phase 3 landed and the pipeline
libs ported from phase 4 onward, sitting beside the schema, the
adapters, and the renderers they run against.

The separation is what keeps each half legible. Nothing syncs the
fork with its template, so pipeline logic dropped into `lib/` leaves
no way to say afterwards which code is the framework's and which is
this platform's; framework code moved under `src/lib/` loses the
deliberate-change bar the rest of `lib/` is held to. Import
specifiers compound the confusion — `../../lib/…` reaches the
framework from `src/redis/`, while from a directory under `src/lib/`
the same text names a sibling pipeline lib.

## Core vocabulary

Three terms name the three things the pipeline stores, and they are
fixed. Every table name, column, query, API field, and document in this
repository uses them.

| Term | What it names |
| --- | --- |
| **documents** | Raw ingested items, stored as they arrived and deduplicated by content hash. One row per distinct item, whichever source produced it. |
| **findings** | Scored results: neutral core columns plus a `fields` JSONB payload validated against the domain's contract. A digest is made of these. |
| **entities** | The registry a domain tracks across its findings — the subjects that research accumulates against. |

### A domain may alias the display name of `findings`, and nothing else

A domain whose natural word for a scored result is not "finding" may
carry its own **display name** for that term — the middle row above —
and that is the whole of the latitude. `documents` and `entities` have
no alias, and no alias reaches storage: the table stays `findings`, and
so do its columns, the workflow queries, the API fields, and every
identifier in the code. An alias is a label the UI and the exports
resolve when they render a heading, held with the domain's other
display-level settings — its verdict vocabulary, for instance — on the
domain row (phase 2).

The narrowness is the point. One schema serving every domain is what
lets the executor and the API share a database, and an alias that
reached a table or column name would fork that schema: every query
would need a per-domain branch, migrations would multiply per domain,
and the guarantee that a column means the same thing on both sides
would be gone. A display name costs none of it, because nothing joins
on a label.

## Where each behaviour is documented

The behaviour this platform has divides into the areas below, and each
has exactly one architecture document. The table names the code an area
lives in and the document that describes it — one document per area, so
a question about one behaviour has a single place to look, and a change
to it has a single row to keep true.

| Behaviour area | Code | Architecture doc |
| --- | --- | --- |
| Invariants | `tests/invariants/` | `docs/architecture/01-invariants.md` |
| Schema | `src/db/`, `drizzle/` | `docs/architecture/02-schema.md` |
| Workflows | `workflows/src/`, `scripts/build-workflows.ts`, and the spliced libraries in `src/lib/` | `docs/architecture/03-workflows.md` |
| Sources | `src/sources/` | `docs/architecture/04-sources.md` |
| Exports | `src/exports/` | `docs/architecture/05-exports.md` |
| Scheduling | `workflows/src/ar-dispatch.json`, and the schedule state in `src/db/` | `docs/architecture/06-scheduling.md` |
| Auth | `src/auth/`, `src/db/schema/auth.ts` | `docs/architecture/07-auth.md` |

A document in the right-hand column arrives with the phase that delivers
its behaviour, so a name there can be a reservation rather than a file:
the number fixes the reading order, and the row is what a later phase
fills.

Names in that column are text, never markdown links. A link check reads
a link as a promise that the file exists, so a linked forward reference
is a broken link from the moment it is written — and a check that
reports one per unwritten document is a check nobody keeps running.

### A behaviour change and its document land in the same commit

A commit that changes behaviour in one of the rows above updates that
row's document in the same commit — not the next one, not a follow-up
issue, not a documentation pass at the end of the phase. Behaviour no
row covers is a new area, and it arrives the same way: add the row
here, with its code path and a document name taking the next free
number in the set, in the commit that adds the behaviour.

What triggers the rule is behaviour, not the size of the diff. A
refactor that leaves every observable result identical changes no
document; a one-line change to a trigger, a threshold, a ceiling, or
the shape of a stored row changes exactly one.

Nothing enforces this mechanically, and the commit boundary is what
makes it checkable by hand instead: a reviewer reading one commit can
see whether the behaviour it changes carries its document with it.
Documentation deferred past that boundary is written later, from
memory, by whoever remembers to, against code that has moved again
since — and the gap it leaves is invisible, because a stale document
reads exactly like a current one. Deferring it also splits the review
in half, since the diff showing what the behaviour now does no longer
shows what it was meant to do.

## Test harness

One runner covers this package. `bun run test` is `vitest run`,
`vitest.config.ts` is the only runner configuration in it, and the
tests each later phase brings with it join that suite instead of
standing beside it.

### Vitest is the single test runner

No second runner is introduced — not for the ported pipeline logic,
not for the invariant suite, not for a subset that would read more
naturally under a different one. A test any phase of this port adds is
a vitest test, collected by the config already here and run by the
command already documented.

The cost of the alternative is what settles it. A second runner splits
the suite in two, and everything the package states once has to be
stated twice: two configurations, two expressions of the isolated
versus live split, two places `fileParallelism: false` has to hold,
and two commands whose union nobody re-checks. The repo-root gate
makes it worse rather than catching it — `bun run test:all` fans out
by running each package's `test` script, so a second runner left out
of that script disappears from the gate without failing anything, and
a suite nothing runs is indistinguishable from a suite that passes.

### Ported tests arrive as vitest tests

The pipeline logic this port brings over carries tests of its own,
from phase 3 onward. They are plain-function tests — a function is
called with an input and its return value is asserted on — so what is
runner-specific about them is the grouping and assertion calls at
their surface, not the assertions underneath. Rewriting that surface
is the whole of the port, which is why holding to one runner costs
nothing here: keeping their original harness would have bought no less
work, only a second runner to keep.
