# Workflows — the set, and what one holds

The pipeline runs as a set of n8n workflows. This document is the map
of that set: which workflows there are, what makes a file one of them,
and what a workflow file is allowed to carry.

It is the document the Workflows row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to what a
workflow does lands here in the same commit. The design it implements
is `.specs/2026-08-19-research-pipeline-port.md` — §4 for the roster
and the send-free rule, §3 for the scheduling the dispatcher does —
and phase numbers throughout refer to the 7-phase sequencing in that
design, §7.

`workflows/src/README.md` is the directory's own README, and it
carries what somebody editing a workflow needs at hand: the naming
rule, the roster, and the standing prohibition on editing built
output. What is here is the set as a whole — what it is for a workflow
to belong to it, and where the line falls between what a workflow
holds and what it calls.

## The set

Six workflows, one file each under `workflows/src/`. The delivered-in
column is the phase that lands the file.

| Workflow | Delivered in | Role |
| --- | --- | --- |
| `ar-dispatch` | 3 | The only cron in the system. Claims schedulable rows that have come due and invokes the workflow each claimed row's kind asks for. |
| `ar-ingest` | 5 | Pull adapters, dedupe, gate, and document to finding. |
| `ar-capture` | 5 | A generic push webhook: capture clients POST against a documented capture contract. |
| `ar-score` | 5 | Scores findings against the domain's criteria. |
| `ar-research` | 6 | Entity research, carrying the `validateEntityName` capability gate. |
| `ar-digest` | 6 | Digests, and the export subscriptions the dispatcher schedules. |

### One of the six is a file, and the other five are rows first

`ar-dispatch` is the whole of `workflows/src/` through phase 3. The
rest are listed here before they exist, for the reason the pending
rows of `docs/architecture/01-invariants.md` are rows: the set is
decided once, and the phase that lands a workflow lands it against a
role already written down.

Two of those phases are the dispatcher's problem, which is why the
column is worth reading rather than skipping. `ar-dispatch` invokes
`ar-ingest` for a claimed topic and `ar-digest` for a claimed export
subscription, and the two land a phase apart — so through phase 5 one
of its targets exists and the other does not, and a tick records
successes and failures side by side for nobody's mistake.

### `ar-dispatch` is the only workflow with a clock

Nothing else in the set runs on a timer. Every other workflow is
started by the dispatcher's Execute Workflow node, by an inbound
request, or by hand, and which of those starts a given workflow is a
property of that workflow rather than of the set.

Scheduling is a row instead. A `topics` or `export_subscriptions` row
carries how often it should run and when it is next due, `ar-dispatch`
claims it once `next_run_at` has passed, and invokes the workflow its
kind asks for — so making a new thing schedulable is an INSERT rather
than a second trigger. The mechanism is
`docs/architecture/06-scheduling.md`; what belongs here is what the
rule costs the set, which is that the count of schedule triggers
across every workflow is one, and that the check counting them names
the workflow allowed to hold it.

## One file per workflow

### A workflow is exactly one file, and the file is named for its id

`workflows/src/<workflow-id>.json` holds one whole workflow and
nothing else — the same id the roster above uses and the same id the
workflow carries on an instance. `workflows/src/README.md` states what
the surrounding tooling assumes from that: the build is a per-file
transform, the deploy and activate paths key on the id, and a workflow
change is one file diff.

### The rule is what makes the set countable

Both properties that constrain the set as a whole — exactly one
schedule trigger, and no send-capable node anywhere — are claims about
a number rather than about a file. One file per workflow is what makes
that number readable: every workflow is one artifact, the invariant
suite loads all of them and counts, and a workflow split across two
files or folded in beside another would be one the count had no way to
see. `docs/architecture/01-invariants.md` carries both rows and the
argument for each.

### The set is what this repository holds, and an instance may hold more

Both counts are taken over `workflows/src/`. An n8n instance is a
deploy target rather than a source, and nothing about it makes it hold
only what was deployed to it: a workflow imported by hand, left behind
by an older checkout, or drawn on the canvas is one nothing here has
ever read.

`scripts/audit-workflows.ts` closes that from the other side. It lists
an instance, holds what it finds against the display names
`workflows/src/` declares, and reports what nothing here accounts for
— with the armed ones reported separately, an unaccounted workflow
that runs being the one that costs something. The verdict is an
instance held against one checkout, so an audit run from an older one
reports the workflows a newer one added as strays.

## What a workflow holds

A workflow source is a JSON envelope, a list of nodes, and the wiring
between them. `ar-dispatch` is twelve nodes of six kinds: a schedule
trigger, five Postgres queries, a merge, a Code node, an Execute
Workflow node, and three sticky notes.

| Envelope member | What it is |
| --- | --- |
| `id` | The workflow's id, and the source file's name. |
| `name` | The display name a canvas shows and a listing answers with. It is also what a deploy matches on, so it is the name an audit accounts for. |
| `active` | Whether the instance runs this workflow's triggers. A source carries `false`: a deploy uploads inactive, and arming is a separate call. |
| `versionId` | The version this source declares itself to be. An instance mints its own on a create and on an import, so what a deployed workflow carries need not be this. |
| `settings` | Execution settings for the workflow as a whole — today the execution-order version, and nothing else. |
| `nodes` | Every node on the canvas, one entry each, including the ones that carry no wiring. |
| `connections` | The wiring, keyed by the display name of the node an edge leaves. |

`meta`, `pinData` and `tags` are members a canvas export would add and
no source here carries. They are editor round-trip state, nothing in
this package reads them, and a member no reader needs is one more
thing every review of a workflow has to decide about.

### Three of the seven envelope members never leave the file

`toApiWorkflow` in `scripts/n8n-workflow.ts` projects a built artifact
down to `name`, `nodes`, `connections` and `settings`, which is what
the public API's create and update take. `id`, `active` and
`versionId` stay behind: an instance mints its own ids, a create is
forced inactive whatever the body said, and arming a workflow is a
call of its own. So those three are the source's record of what it is
rather than instructions to an instance, and a deployed workflow need
not agree with any of them.

### A workflow holds wiring, and the logic it runs comes from elsewhere

`docs/architecture/00-overview.md` draws the line: a workflow is
triggers, queries, branching, and calls into other workflows, and the
logic those nodes execute is TypeScript in this package spliced into
the workflow at build time. Two kinds of content are therefore
deliberately absent from a workflow file — the body of a function,
which lives under `src/lib/` and is what the test suite imports
directly, and everything a domain decides, which is fetched from the
database in the first node after the trigger. No prompt, no term list
and no threshold is written into a workflow.

A credential is the case that looks like an exception and is not.
Every Postgres node in `ar-dispatch` names the credential
`AR Postgres`, and a credential name is not a secret: it is a label
for something the instance stores, and it resolves to nothing anywhere
else. What that credential holds — a host, a database, a password —
reaches the instance through the environment and appears in no tracked
file, which is the rule a URL, an API key and a container path are
held to as well.

### A decision made at a node has four homes, none of them a comment

A workflow source is JSON, and JSON has no comment syntax: there is
nowhere in the file to write a line beside the thing it is about. Four
places take one instead, and which of them is available depends on the
node.

- a `--` comment inside a Postgres node's `query`, where a decision
  about a statement goes;
- prose inside a Code node's `jsCode`, where a decision about a body
  goes;
- a node's own `notes` member, which renders in that node's settings
  panel — the only home a node running neither a statement nor a body
  has, and where `ar-dispatch` records why its merge and its Execute
  Workflow node are configured the way they are;
- a sticky note, which is a node of its own carrying no wiring,
  addressed to whoever is standing on a canvas rather than to whoever
  is reading the file.

All four survive the build into the artifact. The naming invariant
reads them in the source, `workflows/` being one of its scan roots,
and the workflow suite sweeps the built artifact for the same names —
so what a workflow says is held to the de-origination rules exactly as
what it runs is.

### A name a workflow spells in its own prose is checked by nothing

Those four homes are prose, and prose is where a node display name, a
workflow id or a path gets written down for a reader. Nothing holds
one to the thing it names: rename a node and a sticky note goes on
spelling the old name, with no gate to report it. The two sweeps that
read that text at all — the naming invariant over the source, and the
workflow suite over the built artifact — read it for the names they
refuse and ask nothing about the ones they allow. Every other check
reads nodes by type and statements by phrase, so a note is an input to
none of them, and re-reading what one spells against the built
artifact before committing it is the whole of the check available.

The suite goes out of its way to keep prose out of the one place it
would otherwise count. `tests/invariants/dispatch-sql.ts` strips a
statement's `--` comments before it looks for the phrases each rule
requires, so a comment explaining a rule can never stand in for the
clause that applies it. That is not a precaution against a
hypothetical: with the strip removed, `Open Run` and
`Close Run Succeeded` both answer a requirement for a `LIMIT` — a
clause an INSERT and an UPDATE against one id cannot carry at all —
out of the paragraphs each of them writes about the honest limits it
has.
