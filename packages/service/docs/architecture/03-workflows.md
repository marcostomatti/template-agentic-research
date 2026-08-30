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
rule, the roster, the marker forms a source may write and the two it
may not, and the standing prohibition on editing built output. What is
here is the set as a whole — what it is for a workflow to belong to
it, and where the line falls between what a workflow holds and what it
calls.

## The set

Six workflows, one file each under `workflows/src/`. The delivered-in
column is the phase that lands the file, and says which of them have
landed already.

| Workflow | Delivered in | Role |
| --- | --- | --- |
| `ar-dispatch` | 3 — landed | The only cron in the system. Claims schedulable rows that have come due and invokes the workflow each claimed row's kind asks for. |
| `ar-ingest` | 5 — landed | Pull adapters, dedupe, gate, and document to finding. |
| `ar-capture` | 5 — landed | A generic push webhook: capture clients POST against a documented capture contract. |
| `ar-score` | 5 — landed | Scores findings against the domain's criteria. |
| `ar-research` | 6 | Entity research, carrying the `validateEntityName` capability gate. |
| `ar-digest` | 6 | Digests, and the export subscriptions the dispatcher schedules. |

### A workflow is a row here before it is a file

A row carrying no `landed` beside its phase is listed here before it
exists, for the reason the pending rows of
`docs/architecture/01-invariants.md` are rows: the set is decided
once, and the phase that lands a workflow lands it against a role
already written down. So the roster answers what the set IS, and the
column answers how much of it `workflows/src/` holds today.

Two of the delivered-in phases are the dispatcher's problem, which is
why the column is worth reading rather than skipping. `ar-dispatch`
invokes `ar-ingest` for a claimed topic and `ar-digest` for a claimed
export subscription, and the two land a phase apart, so there is a
stretch in which one of its targets exists and the other does not and
a tick records successes and failures side by side for nobody's
mistake.

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

## The build

`workflows/src/<id>.json` is not what an instance runs.
`scripts/build-workflows.ts` reads every source in that directory,
resolves the markers each one carries, and writes one artifact per
source into `workflows/dist/` — the same file name, the same envelope
and the same nodes, with each marker replaced by what it named. That
artifact is what a deploy uploads and what every check over built
output reads.

A marker is the only thing whose content moves. The envelope, the
node list, the wiring and the prose in all four of its homes carry
into the artifact exactly what the source wrote, so the transform is
readable one string at a time and reviewing a workflow is still
reviewing the source. What does not carry across is the layout: the
build serializes at two spaces with a trailing newline rather than
copying the source's own formatting, so an artifact is not a diff of
the file it came from.

### A source may write two marker forms, and the build refuses two more

| Form | What it names | What stands in its place |
| --- | --- | --- |
| `__INLINE:<path>__` | A library under `src/lib/`, by a path relative to that directory. | That library's body, transpiled to JavaScript and stripped of its export keywords. |
| `__ENVVAR:<NAME>__` | A build setting, by the name `ENV_DEFAULTS` in `scripts/workflow-markers.ts` declares it under. | Whatever the settings chain resolves that name to. |
| `__INLINE_JSON:<file>__` | Retired. Named a curated data file to bake into a node body as a JSON literal. | Nothing — the build refuses the source by name. |
| `__INLINE_YAML:<file>__` | Retired. Named an operator-editable file to convert at build time. | Nothing — the build refuses the source by name. |

`ar-dispatch` writes eight markers: one library marker naming
`schedule.ts`, and seven setting markers naming five settings — the
cron its trigger fires on, the batch cap (in each claim statement's
`LIMIT`, and again in the Code node that applies it a second time),
the two workflow ids it routes to, and the stamp on its `Build Stamp`
sticky note.

Which settings a build reads is opt-in, and the default is the
narrowest chain there is: `bun run build:workflows` consults
`ENV_DEFAULTS` and nothing else, so a developer's own environment
cannot reach `workflows/dist/`. The `--external` build that
`scripts/deploy-external.ts` runs resolves the environment and the
package's `.env` in front of that table, and writes into
`workflows/dist-external/` — a directory of its own, so an artifact
that absorbed an environment and one that could not are never the
same file.

### A library is inlined before a setting is resolved

Both live forms are resolved in one walk over every string a source
holds, and the order of the two steps is the whole of what a source
may nest. A library body carrying `__ENVVAR:AR_BUILD_TAG__` has that
marker resolved, because settings resolution walks the string
inlining returned rather than the one the source wrote. The reverse
does not resolve and is not meant to: replacement never re-scans
what it inserted, so a library marker inside a library body, or
inside a value a setting resolved to, is text the pass has already
gone past.

The walk is over object values. A marker written as a key is not
reached — replacing a key changes the shape rather than the content,
and can land on a key already there.

### A spliced library obeys three rules, and the build can see two

`src/lib/` is dual-context: one file, imported by the default suite
and pasted into a Code node body, so a node runs the function the
suite ran rather than a second copy of it written for the canvas.
That is the whole of what `__INLINE:` buys, and what it costs is
three constraints on how such a library may be written.

- **No value import** — a Code node resolves no specifier, so a
  dependency that survived the transpile fails on the node's first
  execution. A type-only import is not one: `import type` erases
  before the build reads the source, and an `interface`, a `type`
  alias and a generic signature erase with it, so the rule costs a
  library no type surface at all.
- **Declaration-form exports only** — `export function`,
  `export const`, `export class`, `export let` and `export var` have
  the keyword taken off and reach the node as the declarations they
  already were, while `export {`, `export default` and `export *`
  name a module boundary that will not be there and that no strip
  repairs.
- **No reliance on module scope** — a node body is one execution, and
  a `require`, an `import.meta` or a value kept between calls each
  assume otherwise.

`assertSpliceable` in `scripts/workflow-markers.ts` refuses the first
two, so a library breaking either is never built into an artifact at
all. The third leaves nothing to refuse it on: `require(p)`, an
`import()` written against a variable, `import.meta.url` and a
top-level `let` all scan with an empty import list and survive the
transpile unchanged, which is to say they are indistinguishable from
a library that obeys the rule. It is satisfied by hand rather than
checked.

What breaking it costs splits in two, and only the louder half is
reachable offline. `tests/build/schedule-splice.test.ts` puts the one
library a workflow source here names through the shipped build and
then through `new Function`, which supplies no `require` and no
`module` exactly as a Code node does not: an `import.meta` is refused
when that function is constructed, and a `require` raises when its
line runs. Module-level state is invisible in both contexts — it
lives as long as the process that imported the file, and as long as
the one execution that ran the spliced copy, and neither reports the
difference.

The five declaration forms are the whole of what is spliceable, and a
sixth is the standing gap. `export async function` declares a name the
way the others do, but the word after `export` is `async`, which is
not one of the five: it is neither refused nor stripped, and would
survive into a node body to fail there. No library writes one.

### The set of spliceable libraries is a directory, not a list

Every module under `src/lib/` is written to those three rules, so
every one of them is something a `__INLINE:` marker could name.
Which part of the pipeline each was written FOR is a separate
question, and it is answered here because a marker is the only place
the two ever meet: a source names a library by path, and neither
side of that string records what the library is for.

| Library | The workflow area it serves |
| --- | --- |
| `schedule.ts` | `ar-dispatch`: the interval clamp and the batch cap it applies to what it has claimed. |
| `parse-csv.ts` | Delimited text a source answers with, on the pull path and the capture path alike. |
| `parse-eml.ts` | Message-format bodies — a file handed to `ar-capture`, and any `multipart/` an ingest source answers with. |
| `yaml-lite.ts` | Configuration somebody edits by hand, wherever a later phase reads one. |
| `shingle.ts` | `ar-ingest`'s dedupe: the sketch two bodies are held against each other by. |
| `static-gate.ts` | `ar-ingest`'s gate — the free decision that runs before anything is spent on a document. |
| `chunk.ts` | The prepared chunk a model node is fed, in `ar-ingest` and in `ar-research`. |
| `features.ts` | The deterministic vector `documents.features` stores, computed as a document is ingested. |
| `aggregate-score.ts` | `ar-score`: the one total a digest orders findings by. |
| `validate-entity-name.ts` | `ar-research`: the capability gate in front of the one step that gets tools bound. |
| `sanitize-md.ts` | Untrusted text on its way into anything that renders it — a digest, a note, a research brief. |
| `audit-log.ts` | The on-disk half of a run's ledger, for whatever workflow writes one. |
| `parser-config.ts` | The extraction a `sources.parser_config` row directs and the `contract` check that judges the reading: `ar-ingest` on the pull path, `ar-capture` on the push one. Its markup step is an injected parameter, because a library cannot import a sibling. |
| `markup-select.ts` | The markup step that engine takes, wherever a source answers with markup: the fragments a `selector` field names, for `ar-ingest` and `ar-capture` alike. A Code node carries both markers and wires the two together in its own body, which is the only place they can meet. |
| `source-health.ts` | The flag half of fail-flag-keep, for `ar-ingest` and `ar-capture`: what one fetch outcome makes of a source's counter, its two stamps and `sources.flagged`. It sets the flag and never clears it, because clearing it is an operator's act. |
| `capture-contract.ts` | `ar-capture`'s boundary: the versioned envelope a push client posts, judged member by member before anything is extracted from the body. It runs AFTER the raw body has been stored, so a refusal writes `documents.parse_error` on a row that already exists — which is the whole reason a refused capture is a stored failure rather than a lost one. An unknown version is refused rather than assumed. |
| `prompt-frame.ts` | The framing around the prepared chunk a model node is fed, for `ar-ingest` now and `ar-research` later: the persona and the data-never-instruction notice as the trusted half, the neutralized chunk between two fence lines as the untrusted one. A Code node carries this marker beside `chunk.ts`'s and wires the two together, which is the only place they meet. The persona is a `personas` row and is never written here, and nothing in the module decides what a model is asked. |
| `feature-version.ts` | The version a stored vector is read against, for `ar-ingest` where a vector is first written and `ar-score` where one is recomputed: `FEATURE_MECHANISM_VERSION` and a digest over the domain's term set, composed into the one integer `documents.feature_version` holds. A Code node carries this marker beside `features.ts`'s, which is where the mechanism version comes from — it is passed in rather than imported, because a spliced library imports nothing. |

One row of that table is a workflow's today: `ar-dispatch` writes the
only library marker there is. Every other library is written down
here ahead of the workflow that will name it, the way the rows of
the set at the top of this document are, and the phase that lands
each of those workflows is the phase that writes its markers. A
library waiting for one is not waiting to be exercised — the default
suite imports it, and a build reads it.

`tests/build/lib-splice.test.ts` is where that roster lives, and the
first thing the file does is hold it set-equal against what `src/lib/`
holds: the listing taken whole, with no extension filter and no
exemption list, so anything landing in that directory is something
the roster has to account for whether or not it is a library. Set
equality rather than a count, because a count is satisfied by a
roster naming one file twice, and by a directory that lost one file
and gained another.

That case runs ahead of every case reading a build, and the order is
the point. A library left unregistered is not a library that fails a
check — it is one no marker names and no case reads, green from every
direction, and the roster is the only thing that makes the omission
visible. So the roster is a declaration held against the directory
rather than a list somebody maintains, and the table above adds only
what a directory listing cannot say.

What registration buys is a real build. That file spawns the command
an operator runs, over a tree carrying this package's own `src/lib/`
and a source writing one `__INLINE:` marker per entry, and reads each
node body the build wrote for three things: the library's own text
arrived, the module boundary it was declared behind did not, and
what arrived is something a Code node could construct. Driving a
spliced copy is depth rather than breadth and stays with
`tests/build/schedule-splice.test.ts`, over the one library a
workflow source names.

### A retired form is refused rather than left to pass through

Neither retired form is resolved and neither is passed through: a
source carrying one is refused by name, and the message says where
the value it wanted is read from now.

What makes that a rule rather than dead code is what a build with no
such rule would do. A retired form matches no grammar, so nothing
replaces it and nothing reports it, and the literal
`__INLINE_JSON:<file>__` somebody typed is written into a node body
while the build reports success — read on an instance, at whatever
hour that node is next reached, where a value belonged.

The named refusal is not the only thing between that and an
artifact. A retired form nothing replaced reaches the serialized
output, which the build reads back before writing it — so deleting
the retired rule alone still fails the build. What the named refusal
buys is which message an operator gets: one about the marker they
wrote and the edit that fixes it, rather than one about an artifact
it survived into.

And that edit has a destination. Both forms retired because the
configuration they carried moved into the database, not because
inlining a file was a mistake — each was built on an argument that
still holds for what it was about. What ended them is that a value
inlined at build time is one value for every domain the artifact
reaches, and this pipeline runs the same workflows for as many
domains as there are rows. `domains.settings`, the jsonb payload on
the domains row, is where such a value lives now: read per-domain at
run time, so changing one is a row edit rather than a rebuild and a
redeploy of every workflow that inlined it.

### Nothing says the pass finished, so the artifact is read back

Resolution replaces what it recognizes, and a marker it did not
recognize is still there afterwards. There are three ways to write
one: a name the grammar does not admit, `__ENVVAR:AR-BUILD-TAG__`
carrying a hyphen where the name class takes none; a well-formed
marker sitting in an object key, which a walk over values never
reaches; and a retired form written inside a library body rather
than in the source, spliced in as it stands.

So the last thing the build does to an artifact is read its
serialized bytes back for marker text and refuse them, which is the
only vantage from which all three are visible at once. Nothing
stands behind that check: delete it and the build reports success,
writes the file, and the marker text reaches an instance. How loudly
it would fail there depends entirely on the parameter it landed in,
and the check cannot see which — a cron field refuses a string that
is not five fields, a workflow id names no workflow and routes to
the dispatcher's error branch, and a URL takes the marker for one
more path segment and says nothing until a request is finally made.
No setting in `ENV_DEFAULTS` supplies a URL today, which is why the
check is keyed to the form rather than to a site: the table is not
closed, and the quiet site is the one it has to cover.

### Two runs over one tree write the same bytes

One source text and one settings chain produce one artifact, byte for
byte. A default build reads four things and the tree it runs in
decides all four: the sources under `workflows/src/`, the libraries
their `__INLINE:` markers name under `src/lib/`, `ENV_DEFAULTS` in
this package's own source, and one call to git. Nothing reads a clock
and nothing is randomized, so what could differ between two such
builds is whatever differs between the trees they ran in. Even the
layout is the build's rather than the source's: it serializes at a
fixed indentation with a trailing newline instead of copying whatever
a hand-written file was spaced at, so two sources formatted
differently come back formatted alike.

Determinism has no tripwire of the usual kind here. Where generated
output is committed, a build that stopped being deterministic surfaces
as a rebuild that changes a file under review. Both directories a
build writes to are gitignored, so there is no committed artifact to
rebuild and diff against, and an artifact is a deploy input rather
than a diff — a comparison between two builds of one tree is the whole
of what says this build is deterministic.

Two such comparisons are available and they cover different things.
`tests/build/build-workflows.test.ts` spawns the shipped command twice
and holds the two output directories against each other byte for byte.
It builds a fixture tree rather than this package's own because what
this package holds moves with the plan, so a case driving it would
assert how far the work had got rather than what a build does. What
that leaves out is the sources this repository ships: a second
`bun run build:workflows` over this package's own tree, compared
against the first, is the only comparison that reaches `ar-dispatch`
and the library its `__INLINE:` marker splices — and nothing automates
it.

### The stamp is the one value permitted to move with the checkout

That git call is the fourth input and the only one that is not a file
in the tree. `AR_BUILD_TAG` reaches an artifact the way
every setting does, through a marker, and is answered unlike any
other: `scripts/build-workflows.ts` asks git for the short commit of
the checkout it is running in and supplies that in the defaults
table's own position in the chain, so it resolves the way every other
setting does and an operator override in a deploy build still wins.
Three answers: the short commit, for a clean working tree; that commit
with `-dirty` behind it, for a tree carrying uncommitted work or one
git could not be asked about; and `dev`, for a build with no commit to
name at all. `dev` is also the value `ENV_DEFAULTS` carries for that
setting, so an artifact nothing stamped and an artifact stamped by a
build with no commit read alike.

Two limits, and both are easy to read past. The stamp is keyed to the
state of the repository rather than to what the build read:
`git status --porcelain` reports the working tree entire whatever
directory it runs from and counts untracked files, so an edit to a
file no build ever opens flips the suffix. Identical within one tree
means the tree standing still, not the sources. And `-dirty` is one
text for every uncommitted state, so two artifacts built from two
different dirty trees at one commit carry the same stamp while
differing in content — it says an artifact is unaccounted for and
never says what is in it, which is why `scripts/deploy-external.ts`
refuses a dirty tree outright rather than trusting the label.

That the stamp is the ONLY value permitted to move is a claim the same
suite makes: the fixture roster is built a third time with a stamp
handed in, and every artifact whose source names some other setting
comes back byte-identical to what the run handed nothing wrote.

The obvious stamp would be the wrong one, and the comparison above is
why. A build timestamp or a generated id reads just as usefully on a
canvas and moves on every run, and with no committed artifact to diff
against, two builds of one tree agreeing is the only evidence there is
— a per-run stamp would leave that comparison with nothing to assert
while looking, to whoever reads it, exactly like this one.

### A canvas reads the stamp for which build, not what that build holds

A sticky note is addressed to a canvas rather than to a file, and the
stamp is what a reader standing there has instead of a checkout.
`ar-dispatch` carries it on a `Build Stamp` note; somebody standing in
front of that note can open none of the files this document argues
from, and what they have is a workflow behaving one way and a question
about which build they are looking at.

The stamp answers that question and no other. One that does not match
the commit that was deployed means the instance is running an older
import — an instance is a deploy target rather than a source, and the
label an artifact was written with is the label it arrives carrying.
`dev` and `-dirty` are the two readings likeliest to be taken for an
older import and neither is one: the first is a build with no commit
to name and the second a tree with uncommitted work in it, and an
instance showing either is showing the build somebody sent it.

What it does not answer is what the artifact holds. A commit locates
an artifact without describing it, and a `-dirty` suffix says only
that the commit in front of it is not the whole account — a canvas
reading one has been told to go and look, not told what to look for.

The stamp is also the one thing in a sticky note that cannot go stale.
Everything else such a note spells — a node name, a workflow id, a
path — is prose nothing holds to the thing it names, while the stamp
is a marker: the build resolves it, and an artifact still carrying it
unresolved is refused before it is written. What that costs is a build
that never refuses over the stamp itself. `gitBuildTag` answers for
any root it is handed and throws for none, because a build that would
not write an artifact when git could not be asked would have stopped a
deploy over a note on a canvas.

### A transpiler comes from the launcher, and a test worker has none

The library splice is the step that needs a transpiler: a TypeScript
source under `src/lib/` has to become JavaScript before it can be
pasted into a Code node body. `Bun.Transpiler` is what does that, and
it is a property of a global only a process bun is running has — so a
bun on PATH, a bun in `packageManager` and a bun that installed the
dependencies each say nothing about whether the build can reach one.
The transpiler is the launcher's rather than the manifest's, which is
why `build:workflows` is `bun scripts/build-workflows.ts` and not a
script any runtime could carry.

That cuts both ways. What a library is transpiled into is the
launcher's too, so a bun that changed what it emits would move an
artifact where nothing in the tree had moved — the one input a
comparison between two builds of one tree cannot see, the four a
default build reads all being in the tree it ran in.

A vitest worker is a node process, so a build cannot happen inside
one. `pretest` runs that same command before the suite starts, in a
bun process of its own, so `workflows/dist/` is already written by the
time any worker opens it and every check over built output is a read
rather than a build. Where a case has to exercise the real transpiler
it spawns `bun scripts/build-workflows.ts` as a subprocess, a worker
having no way to relaunch itself; everything either side of the
transpile is drivable without one, marker resolution taking the
library loader as a parameter so a stand-in can answer for it.

What sits in front of that constructor is a check on the `Transpiler`
property, and the obvious check on the `Bun` global would be wrong
here — wrong for exactly one launcher, and that one is a worker.
`tests/helpers/bun-polyfill.ts` is a setup file in `vitest.config.ts`,
so every worker in this package starts with a partial `Bun` global
already installed: one carrying `serve` and nothing else, put there so
the health server and the MCP transport have something to listen on.
Inside a worker `typeof Bun` is therefore `'object'`,
`Object.keys(Bun)` is `['serve']`, and `Bun.Transpiler` is
`undefined`.

So `typeof Bun === 'undefined'` does not fire, the constructor is
reached anyway, and what comes back is
`TypeError: Bun.Transpiler is not a constructor` — which is what a
build carrying no check at all raises in the same place. The wrong
check and no check end together, and only one of the two looks like
protection on the way there. It is convincing because it is right
twice: under node the global is genuinely absent and it fires, under
bun the global is whole and it does not, and the single launcher it is
wrong for is the one where relaunching is not the edit and spawning
is.

`pretest` carries a limit of its own. It runs for the `test` script
and for no other, so `test:live`, `test:parity`, `test:watch` and a
bare `vitest run` read whatever `workflows/dist/` happens to hold. What stops that being
silent is the reader every check over built output goes through. It
refuses a tree that yielded no artifact — absent, or there and empty —
naming `bun run build:workflows` as what writes that directory, and it
refuses an artifact carrying no node, naming the source the node
belongs in. A suite run against a tree nobody built fails by name
rather than sweeping nothing and passing.
