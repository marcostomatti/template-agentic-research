# Sources — the adapter contract, and what a capture may do

Everything the pipeline reads comes in through this directory. This
document is the map of `src/sources/`: the contract an adapter
satisfies, where the line between fetching and reading falls and what
that line buys, what binds when an adapter is constructed rather than
when it is called, and what the text reduction those adapters share
guarantees about the body it produces.

It is the document the Sources row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to what a
capture does lands here in the same commit. The design it implements
is `.specs/2026-08-19-research-pipeline-port.md` — §2 for the
`sources` table the adapters are constructed from, §4 for the parsing
and validation the contract leaves room for — and phase numbers
throughout refer to the 7-phase sequencing in that design, §7.

Two of the things `src/sources/` will hold are not here yet. The
adapters that front a source and the runtime half of the registry
that selects one both land later in phase 4, and each brings its own
section here in the commit that lands it. What this document covers
today is the contract they will satisfy and the reduction they will
reach for, which is what the directory holds.

## The contract

`SourceAdapter` in `src/sources/index.ts`, five members and nothing
else. The file is type-only: it declares the shape and selects
nothing, the selection being the registry's job.

| Member | What it is |
| --- | --- |
| `id` | Stable identifier, unique across the registry. |
| `kind` | Which transport family this adapter fronts, matching the `kind` of every `sources` row it can be constructed for. |
| `fetch()` | Retrieves the source's own payload. The only step that does I/O, and the only one that touches the endpoint bound at construction. |
| `parse(raw)` | Extracts records from a payload, under the `parser_config` bound at construction. Pure. |
| `toCanonical(parsed)` | Maps one extracted record onto the canonical shape. Pure, and the only step that has to know what a `documents` row holds. |

### An adapter gets bytes and produces documents, and does nothing else

It does not score, does not decide, and does not store. Everything a
capture leads to is somebody else's: the gate and the feature
extraction are libraries under `src/lib/` — both later in phase 4 —
the writing is a workflow node, and the scheduling that decided this
source was due at all is `docs/architecture/06-scheduling.md`'s.

The narrowness is what makes the surface countable. A new kind of
feed is one module whose whole exposed area is the five members
above, so what a reviewer has to read to know what a new source can
do is bounded before the module is written.

### A source is configuration, and only a new KIND of feed is code

Which transport fronts a feed, what address to reach, how records
come out of the payload, what that payload has to contain, and where
the last fetch stopped are all columns of `sources`. Adding a feed is
therefore an INSERT, and one adapter serves every row of its kind
with nothing differing but the row it was constructed from.

That split is what keeps the module count from tracking the feed
count. The design this one is ported from had no `parser_config`
column at all — every source was a hand-written module in a static
registry, so a new feed meant code, review and a deploy for an
extraction differing from its neighbour's by a few selectors.

### The kind set is one declaration read twice

`SOURCE_KINDS` in `src/db/schema/values.ts` is the whole of it. The
`sources.kind` CHECK is generated from that tuple, and the
`SourceKind` union `src/sources/index.ts` exports for adapter
selection is derived from it, so the set the column accepts and the
set an adapter can be selected by are one reading rather than two
kept in step.

Written out twice they drift in a direction neither side reports: a
stored row whose `kind` the union cannot name has no adapter that can
be selected for it, and a member the column refuses can never be
reached from stored data at all. Neither shows up as a failure — one
is a row nothing ever picks up, the other a branch nothing ever
enters.

`push` is the member worth knowing about, because it is the one kind
the pipeline never polls: its row's endpoint names where a payload
lands rather than what to request. An adapter selected for a row has
to know which of the two it is holding.

### A canonical document is a slice of a row, not a translation of one

`CanonicalDocument` carries five members — `hash`, `sourceId`, `url`,
`body`, `raw` — each named for the drizzle property of the
`documents` column it maps onto rather than for that column's SQL
name. Spread it, add the `domainId` the writer supplies, and the
result is a complete row.

Being a slice rather than a mapping is the point. There is no field
renaming step between an adapter's answer and the insert, so there is
no place for a mismatch to hide: a member that stopped lining up with
its column would not compile, where a translation layer would go on
compiling and write the wrong column.

The nine columns it leaves out are each somebody else's, and the two
worth naming are `parse_status` and `parse_error`. They belong to the
contract check rather than to the capture, because the row that most
needs them is one whose payload yielded no record at all — so
`toCanonical` never ran to return a shape they could have sat in.

## The I/O boundary

### `fetch` is the only member that does I/O, and the only async one

The two properties are the same property written twice, and the
second is the form a check can actually read. Whether a function
opens a socket is not visible in its signature; whether it returns a
promise is. So the contract's asymmetry — one `Promise`-returning
member and two that return values — is the structural expression of
"the only step doing I/O", and the skeleton
`bun run scaffold source-adapter` stamps is arranged around it.

### `parse` is pure so that a stored payload can stand in for a source

The default suite in this package touches no external service, which
leaves exactly one way to prove an extraction is right: drive it over
a payload committed beside the case. That is only available while the
reading of a payload is separable from the getting of one.

An adapter that fetched inside `parse` would pass its tests on the
day it was written, against whatever the source happened to be
serving, and fail them the first time it ran offline — or worse, keep
passing while quietly testing the source's current shape instead of
the adapter's behaviour.

### Purity here is more than the absence of a socket

No clock and no randomness either, which is what makes an extraction
replayable: the same payload under the same config yields the same
records every time. A config producing the wrong records is then a
row to read rather than a program to debug, and a capture that went
wrong last week can be re-run against the payload it went wrong on.

### The boundary is what makes fail-flag-keep expressible

A payload whose contract check fails is stored anyway — the document
row lands with `parse_status` of `failed` and its `parse_error`, the
source's consecutive-failure counter is bumped, and a run of those
flags the `sources` row. That is only writable as a state because the
bytes exist separately from the reading of them: `documents.raw`
holds the source's own payload verbatim, so a source whose shape has
drifted leaves the evidence of the drift behind rather than a gap.

An adapter that read as it fetched would have nothing to store on the
path where the reading failed, and the failure would be a log line
instead of a row.

## Configuration bound at construction

### Nothing in the contract takes configuration per call

That is a decision rather than an omission. A `sources` row's
endpoint, its `parser_config`, its `contract` and its `cursor` bind
once, when the adapter is constructed for that row; every member
above is then called with the data it operates on and nothing else.

### Binding at construction is what keeps one adapter per kind

The alternative is a per-source branch inside the adapter, because a
member handed its configuration per call is a member that has to
decide what to do with it every time. With the row bound once, the
module holds the mechanism for reading a transport family and the
database holds everything varying per feed, and the two do not have
to be edited together.

### `parse` stays a function of the payload alone

Threading the config through each call would make its output depend
on two inputs, and the stored-payload seam is the thing that pays
for. A fixture would then have to carry a config beside the payload,
and a passing case would be evidence about the pair rather than about
the payload — so a config change and a payload change would be
indistinguishable in a red suite.

### A parser config is data the engine executes, never code

Selectors, JSONPath, regex, a field map. The parse engine arriving in
phase 5 performs the operations it implements against the payload,
directed by that column; it evaluates nothing it finds there.

That is what keeps an INSERT into `sources` an INSERT. A column whose
contents could execute would turn every writer that reaches it — the
seed script, a workflow node, an operator at a psql prompt — into a
way to run arbitrary code in the pipeline, and the reviewable
boundary the whole directory is built around would be one row wide.

### No proposed config is written straight into the row

Where a source has none, or its contract starts failing, a local
model is asked — on demand over plain HTTP, with nothing kept running
between calls — to propose a `parser_config` and a validation
contract together. The proposal lands as a pending row for an
operator to rule on. Only the approval writes those two columns, and
the engine then runs what was approved deterministically: a model
proposes, a person decides once, and no guess silently changes what
the pipeline extracts. The propose step is phase 5's; the columns it
targets and the shape of the answer are fixed here.

## The text reduction

### A reduction fronts no source and is registered nowhere

`src/sources/html-text.ts` declares no member of the contract, opens
no socket and appears in no registry. It is the markup-to-text
reduction adapters share, and it sits beside them rather than under
`src/lib/` because it is theirs: `documents.body` is plain text by
contract, and several kinds of source answer with markup.

Reading a plan row naming a `sources/` module as evidence it is an
adapter is the mistake to avoid here. What makes a module an adapter
is the five members and a registry entry, not the directory.

### What a reader reads is STRUCTURE, and the structure survives

Paragraphs come back as blank-line separated blocks and list items as
lines opening with a dash. That is not cosmetic. Every later
deterministic pass in this platform reads sentences, so a list
flattened into one run-on line changes which phrases sit in the same
sentence as each other — and a pass scoring a phrase in context would
score a different document than the one that was captured.

### Nothing in the reduction invents

An entity reference neither table knows is left exactly as it
arrived, and so is a numeric reference to nothing and an `&` no
semicolon ever closes. A guess about an unknown reference would be a
guess written into a stored body; left alone it is visible, and
`documents.raw` still holds what the source said.

### The decode is ONE scan and never a loop

A source that serves its markup entity-escaped is decoded once to
recover the markup and decoded again after the tags come off. Text
that legitimately contained a literal escape was therefore written
doubly escaped, comes back singly escaped from the first pass, and
comes back as the character itself from the second — as text, never
as a tag. A decoder that looped until nothing changed would promote
that literal into markup, and the markup would be one an attacker
chose.

Order carries the same weight. Entities resolve LAST, after every tag
is gone, so a decoded angle bracket arrives as text with nothing left
to read it as a tag.

### A dead block is removed WHOLE, its content included

Script and style elements go with everything between them, and so
does the tail of a document when such a block is never closed.
Stripping the tags off and keeping the contents would put a script's
source into a body, where every later pass reads it as prose somebody
wrote.

### An invisible character is dropped rather than carried into a body

A decoded code point has three fates, and the difference between the
first two is the whole of the rule. A reference that was not a code
point at all leaves the entity verbatim, there being nothing to put
in its place; a well-formed reference to a character a body must not
carry is DROPPED; anything else is the character. A reference to NUL
is the second kind — it parses, it is in range, and it is a control
character — as are the C0 and C1 ranges, the lone surrogates, and
five zero-width characters. Tab and newline are the exceptions,
because in text they are structure.

Dropping rather than passing through is what the pass is for. A
stored body is what a reader reads, and a smuggled zero-width
character in it is a difference between two documents that no reader
and no reviewer can see.

The roster of five is deliberately CLOSED and is not a sweep of
everything invisible. A general strip belongs to the stage that
prepares a chunk for a model, not to a markup reduction, and the
corpus this port is measured against knows a dozen more code points
that pass through here untouched.

### The reduction never throws for text, and one export never throws

`htmlToText` and `decodeHtmlEntities` each answer the empty string
rather than raising, so malformed markup comes back as the best text
available or as nothing. `tidyText` carries no such catch, which is
the one asymmetry: a value whose string conversion refuses comes back
as a throw from that export and as `''` from the other two.

The asymmetry is preserved rather than smoothed over, because a
capture path that turned every hostile value into an empty body would
lose the one signal saying a field was hostile at all.
