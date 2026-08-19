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
| `src/db/` | Drizzle schema and client. Schema v2 lands here in phase 2. |
| `src/lib/` | Ported pipeline libs, from phase 4 onward: parsing, gating, scoring, and the feature mechanisms. Distinct from the framework `lib/`. |
| `src/sources/` | The source adapter contract and the adapters that satisfy it (phase 4 onward), push capture included. |
| `src/exports/` | Export renderers (phase 6): one per format a subscription can be rendered into. |
| `src/routes/`, `src/mcp/` | The API surface itself — HTTP routes and MCP tools over the schema. |
| `workflows/src/` | n8n workflow sources, one JSON file per workflow (phase 3 onward). See `workflows/src/README.md`. |
| `workflows/dist/`, `workflows/dist-external/` | Build output. Gitignored, and never hand-edited. |
| `scripts/` | Operator entry points: seed, approve, build, deploy, stack lifecycle. See `scripts/README.md`. |
| `drizzle/` | Generated migration SQL — the single migration engine, for executor and API alike. |
| `data/` | Seed files only, applied by `scripts/seed.ts`; nothing here is read at runtime. See `data/README.md`. |
| `tests/` | Cross-cutting tests, including the invariant suite under `tests/invariants/`. |
| `docs/architecture/` | This document set. |

### `src/lib/` and `lib/` are two directories

The table names both, and no later phase merges them. `lib/` is the
service framework — express, mcp, service-core, errors, logger — and
stays reserved for it: a fork-style copy of a service template, held
as stable library code and changed deliberately. `src/lib/` is
application code, the pipeline libs ported from phase 4 onward,
sitting beside the schema, the adapters, and the renderers they run
against.

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
