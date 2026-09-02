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
| `src/db/` | Schema v2 and the drizzle client: the tables one file per concern under `src/db/schema/`, re-exported by the `src/db/schema.ts` barrel that drizzle-kit and the client both read. `store-errors.ts` names no table and sits beside them: the one refusal every store port raises, and the reading of a driver error that produces it, so a service decides a status without ever seeing a SQLSTATE. |
| `src/lib/` | Pipeline libs, written dual-context so the workflow build can splice one into a Code node body. `schedule.ts` is the first and landed in phase 3, which is what proves the splice over a library this package ships rather than a fixture; the ported wave landed in phase 4 — structured-text, delimited-record and message parsing, untrusted-text neutralization, entity-name validation, near-duplicate hashing, audit lines, chunk preparation, and the gating, scoring and feature mechanisms; phase 5 landed the wave its workflows splice: the parse engine over the two `sources` columns that configure it, the markup selector given to it rather than imported by it, fail, flag and keep as one decision about a source row, the boundary a pushed capture has to clear, the fence that keeps untrusted text evidence rather than instruction, and the version a stored feature vector is comparable under. Distinct from the framework `lib/`. |
| `src/sources/` | The source adapter contract, the static registry that selects one adapter by the id a `sources` row names, and the adapters that satisfy the contract, landed in phase 5: `listing-api.ts` for the `api` kind, which reads the listing endpoints a row's `parser_config` names, and `push-capture.ts` for the `push` kind, whose source posted to this service rather than waiting to be read. Extraction is not theirs to hold: it lives in the parse engine under `src/lib/`, `parser-config.ts` with `markup-select.ts` given to it as the markup step, because a workflow Code node can inline a library from there and no path from here, and the alternative is a second implementation of the same reading on the canvas. Beside them the modules those adapters share — a cursor-paged listing loop over several endpoints, and the pure text reductions — which front no source, are registered nowhere, and reach the network, where they reach it at all, only through a transport their caller injects. Beside all of them the propose seam, `config-proposer.ts`, about the two columns an adapter reads rather than about any reading: a proposed `parser_config` and `contract` become a pending row an operator rules on, and only that ruling turns into the UPDATE onto the source — which is why the module declares the proposer interface and implements it nowhere. And in the same directory, the HTTP half of that table: `store.ts`, `db-store.ts`, `service.ts`, `routes.ts` and the two `failures-*.ts` modules, behind `/domains/:slug/sources`, `/sources/:id` and the read-only failures queue, documented in `docs/architecture/08-http-api.md`. Two halves, then, and the line between them is the subject: the pipeline's half says what a source adapter is and how a row selects one, the HTTP half says what the surface asks the database for when somebody reads, writes or retires a `sources` row, and neither imports the other. The directory name already matched the table, so only its CONTENTS are shared — `src/exports/` below is the opposite case, where the NAME was taken. |
| `src/exports/` | Export renderers, landed in phase 6: seven modules over the five formats a subscription can name, four of which resolve to a renderer. `index.ts` holds the contract and the registry together — a renderer is one method over four stored rows (the domain, the briefing, the findings, the subscription), and `EXPORT_RENDERERS` is the written-out list of the ones this service will run, so a format arrives by an edit somebody reviews rather than by a file appearing in the directory. `obsidian-md.ts` serves `obsidian_md` and `notion-md.ts` serves `notion_md`, both over the one composition `markdown-body.ts` holds, so what separates them is a preamble and a heading depth rather than anything a reader would call content; `rss.ts` serves `rss` as one static file with no server behind it; `email-draft.ts` serves `email_draft`, composing a message it has no way to send. `pdf` is the fifth, a declared refusal carrying its reason, because a pdf body is bytes rather than text and no dependency here produces them. What every one of them answers is a value: an artifact whose path comes through `artifact-path.ts` and is relative to a destination no renderer ever learns. All of this directory is the pipeline's half and none of it is the HTTP surface: the routes over `export_subscriptions` are `src/subscriptions/` below, which answers under `/exports` all the same. That is the opposite split from `src/sources/` above — here the NAME was taken, by a registry a subscription is not a member of, so the group took its table's name rather than its prefix's. |
| `src/routes/`, `src/mcp/` | The MCP tools over the schema, and the template's one starter route. The HTTP resource routes are not here: each group holds its own router, elsewhere in this table. |
| `src/http/` | The shared boundary under that surface, one declaration each: the success envelope and the pagination meta derived from the window and the store's count, the slug/id param and pagination query schemas, and the boundary parser whose validation details name a field path and never a submitted value, and the control-byte mask and code-point cut a stored payload is served through before the source failures queue answers with it. The resource groups in this table are its only readers; see `docs/architecture/08-http-api.md`. |
| `src/domains/` | A domain and its settings, addressed by slug — and the arrangement every other resource group in this table copies: a port, one drizzle implementation of it, the rules as plain functions over the port, and a router. The port is what lets every rule be exercised with no database, so the live suite is left proving only that real Postgres agrees. |
| `src/taxonomy/` | The categories a domain scores under and the terms each one carries. One port over both halves, because a term has no address that does not go through a category; two services, because the two halves have different rules. The one-level depth cap is enforced by a database trigger, and this surface only translates its refusal. |
| `src/personas/` | The system text a run plays, one row per domain and role. Nothing between the port and a run keeps a copy: a run reads its personas at its own start, so an edit lands on the following run and there is no invalidation path to get wrong. |
| `src/settings/` | Operator-level preferences, held in the single `operator_settings` row the schema pins by id. An absent row and an empty payload are the same state — the defaults apply — which is why a read before any write is answered `{}` and never a 404. Per-domain settings stay on the domain row. |
| `src/topics/` | What a domain researches: a topic's name, the search terms it runs, and the cadence it runs them at — one of the two schedulable tables, over the four-module arrangement `src/domains/` above describes. Six routes rather than the ordinary four, though: the last two are the schedule verbs, two of the three routes on this surface permitted to write `next_run_at` at all, whose pause takes its instant from `pauseFrom` in `src/lib/schedule.ts` rather than deriving one of its own. |
| `src/connectors/` | One external service the pipeline is configured to call — a model endpoint, a search backend, a notebook, an export target — and the one resource group met in no domain at all: the table carries no `domain_id`, so the list hangs off the root and the natural key is the `kind` and `name` pair. It holds a fifth module the others have no use for, `secrets.ts`: the closed roster of config keys that carry a credential and the single mask literal, read by every path that answers a config and by the refusal that stops a caller writing that literal back as somebody's key. |
| `src/subscriptions/` | A standing request that one domain's findings be rendered into one format and delivered to one connector on a cadence — the second schedulable table, whose run-now is the third of those three schedule routes and whose natural key is the whole domain, format and connector triple. Named for its table, `export_subscriptions`, rather than for the `/exports` prefix it answers under, because `src/exports/` above is the renderer registry and a subscription is not a renderer. |
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
| Sources | the adapter half of `src/sources/` | `docs/architecture/04-sources.md` |
| Exports | `src/exports/` | `docs/architecture/05-exports.md` |
| Scheduling | `workflows/src/ar-dispatch.json`, and the schedule state in `src/db/` | `docs/architecture/06-scheduling.md` |
| Auth | `src/auth/`, `src/db/schema/auth.ts` | `docs/architecture/07-auth.md` |
| HTTP API | `src/http/`, `src/domains/`, `src/taxonomy/`, `src/personas/`, `src/settings/`, `src/topics/`, `src/connectors/`, `src/subscriptions/`, and the HTTP half of `src/sources/` | `docs/architecture/08-http-api.md` |

A document in the right-hand column arrives with the phase that delivers
its behaviour, so a name there can be a reservation rather than a file:
the number fixes the reading order, and the row is what a later phase
fills.

Names in that column are text, never markdown links. A link check reads
a link as a promise that the file exists, so a linked forward reference
is a broken link from the moment it is written — and a check that
reports one per unwritten document is a check nobody keeps running.

The left-hand column may reserve as well, and today none of it does. The
HTTP API row named five directories ahead of the code, because that
document was written to state the rules those routes are built against
rather than to describe routes already written. Those five landed first,
wave 2's four groups landed against a document written the same way, and
the Layout table above names every one of them, so every path in the
column resolves. A reservation there is discharged by the commit that
creates the directory, not by a later pass.

A path may also appear in two rows, when one directory holds two
behaviour areas. `src/sources/` is the only one that does — its adapter
half is documented under Sources and its HTTP half under HTTP API — so
each of those rows names the half it means rather than the bare
directory. The law above is one document per AREA, which a shared
directory does not break; what would break it is a row leaving a reader
to guess which half of a directory it covered.

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
