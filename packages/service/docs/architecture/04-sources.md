# Sources — the adapter contract, and what a capture may do

Everything the pipeline reads comes in through this directory. This
document is the map of `src/sources/`: the contract an adapter
satisfies, where the line between fetching and reading falls and what
that line buys, what binds when an adapter is constructed rather than
when it is called, how one adapter is registered and reached by id,
what a client posting a capture has to send, and what the text
reduction those adapters share guarantees about the body it produces.

It is the document the Sources row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to what a
capture does lands here in the same commit. The design it implements
is `.specs/2026-08-19-research-pipeline-port.md` — §2 for the
`sources` table the adapters are constructed from, §4 for the parsing
and validation the contract leaves room for — and phase numbers
throughout refer to the 7-phase sequencing in that design, §7.

Two adapters front a source here, both landed in phase 5:
`listing-api` over an `api` endpoint and `push-capture` over an
envelope a client sent. What phase 4 landed for them to be built
against is most of what follows — the contract they satisfy, the
registry that selects one of them, and the shared modules they reach
for, which are the listing loop that gets the bytes and the reduction
that turns markup into the text a body holds. The capture contract
below is the exception: the boundary that judges one landed in phase
5 beside the adapter constructed from it.

## The contract

`SourceAdapter` in `src/sources/index.ts`, five members and nothing
else. The file holds the registry too, which is the other half of
what an adapter is: the contract says what one has to declare, and
the registry is the list of the ones this service will run.

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
extraction are libraries under `src/lib/` — both landed in phase 4 —
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

Selectors, JSONPath, regex, a field map. The parse engine in
`src/lib/parser-config.ts` performs the operations it implements
against the payload, directed by that column; it evaluates nothing it
finds there.

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
the pipeline extracts. The section below is that path end to end,
from what is asked to the UPDATE a ruling authorizes.

## Configuration a model proposes and a person approves

### The path, in the order a proposal travels it

Four steps, and only the first two and the last are code in this
directory. `src/sources/config-proposer.ts` holds them, and it fronts
no source: it declares no member of the contract above, appears in no
registry, and opens nothing. What it is about is the pair of
`sources` columns an adapter reads — how records are taken out of a
payload, and what a correct reading looks like — and the separate
question of who is allowed to write them.

Something is asked for an arrangement first. `ConfigProposer` is that
something, as an interface: one method, handed the source it is
proposing for and one sample payload, answering the two documents
together. A model client over a `connectors` endpoint is the expected
implementation and not the only one the shape admits, and nothing on
the path asks which it was.

`proposalToPendingRow` turns that answer into a
`source_config_proposals` insert naming five columns and leaving
every other one to its default. `status` is one it does not name, so
a proposal is `pending` because the table says so rather than because
the propose path said so; `approved_at` is another, and the value it
answers has no such member at all, so a writer spreading it into an
insert has nothing to spread. `proposeSourceConfig` is those two
steps in one call, and the only place the seam is actually crossed.

A person then rules on the row through `scripts/approve.ts`, against
a database, with no member of this directory involved. Only after
that does `proposalToSourceUpdate` turn the approved row into the
UPDATE for its source — two columns, exactly as they were proposed —
and refuse a row nobody approved.

### No proposer is constructed by default

`ConfigProposer` is declared here and implemented nowhere. There is
no factory in the module, no default standing in for one, and nothing
in this service builds one at startup: a run that wants a proposal
builds its own from the `connectors` row naming the model endpoint it
is entitled to call, and hands it in.

That is what keeps the isolated suite offline, and it is the
enforcement rather than a convention — the only thing in reach that
could call a model server is a parameter, so the cases beside the
module drive an injected stub and could not reach one if they tried.
The transport `listing-api.ts` takes at construction is the same
decision about the same kind of reach: a call to something outside is
visible in the call that made it, or it does not happen. One file
does build a real proposer,
`tests/live/config-proposer.live.test.ts`, and it self-skips unless
`AR_OLLAMA_URL` names a model server — which nothing in this
repository exports and no compose service satisfies.

### A proposer is shown four members of the row

An id, a domain, a kind and an endpoint, copied out into a fresh
object rather than handed over as the caller's row. The annotation is
a floor — a caller holding a whole `sources` row satisfies it — and
copying the members out is what makes it a ceiling.

What it leaves out is the substance. `cursor` is where the last fetch
stopped, which is state a proposal must not move. The health half is
`src/lib/source-health.ts`'s answer and nobody else's. And the
current `parser_config` and `contract` are withheld deliberately: a
proposer answers what the sample payload says the arrangement should
be, and handing it the arrangement that is currently failing gives it
something to copy.

The cost of that last omission is real and worth naming. A proposer
cannot answer that the config is right and the source changed, and it
cannot improve on a config by degrees. The comparison happens where
the ruling does, with the pending row and the source row both in
front of one person.

### What is stored is what was answered

Nothing on the propose path validates a proposal, and that is the
column's own decision rather than an omission. `parserConfigErrors`
in `src/lib/parser-config.ts` says whether a config is well-formed,
and an operator reading the queue is who that answer is for: a
malformed proposal is storable, says something true about what was
asked, and is one to reject rather than one the table should refuse.
Both documents travel from the proposer's answer to the insert unread
and uncopied, which is what makes the approval an approval of this
exact document.

A proposer that throws, cannot be reached, or times out is let
through untouched, for the same reason read from the other end.
Catching it would merge two states that are not one: a proposer that
could not be asked, and a proposer that answered something unusable.
Only the second is a proposal. The first, caught, would put a pending
row in front of an operator for a question nobody answered, and that
row would read exactly like a model that had genuinely answered with
nothing.

### The ruling is a row, and the CLI is a client of it

`scripts/approve.ts` is the whole operator surface until the service
and its UI take approvals over. It rules on this gate and on
`research_pool`, because they are one job — a person's ruling
standing between a machine's suggestion and a machine acting on it —
and a ruling therefore names which: `approve config 7` and
`approve pool 7` are rulings on different rows. Both tables key on
`bigserial`, so row 7 exists in each, and a subject inferred from the
number would be a guess made silently on the one command that writes.
`list` names neither and reports both queues, each under its own
heading, which is where an operator learns the two words.

It decides nothing about what may be written. Every approval it
issues only ever stamps `approved_at`, which can satisfy the
constraint below and never breach it, and every rejection leaves both
of the row's timestamps exactly as it found them — so a run of the
tool never meets a refusal at all, which is what being a client of a
constraint means. The queue it reads is ordered oldest first on
`proposed_at`, which is what makes several proposals for one source
workable without a key refusing the later ones.

### The database holds one half of the rule, and this module the other

They are not the same rule, and reading them as one is how the gap
between them goes unnoticed. `source_config_proposals_approval_check`
reads the two timestamps on the proposal row, so a row cannot record
that it was applied without recording that it was approved first. It
is generated into the migration under `drizzle/` that
`tests/invariants/schema-sql.test.ts` reads, and registered as an
invariant in `docs/architecture/01-invariants.md`. What it does not
reach is `sources` at all. Both columns it reads are on the proposal,
so what it enforces is that the record of an application carries the
record of an approval — not that the UPDATE onto the source passed
through this table on its way. A writer that skips the table and
rewrites `sources.parser_config` directly is refused by nothing.

`proposalToSourceUpdate` is what stands in that gap on the apply
path, and it keys on the same account the CHECK does: `approved_at`,
never `status`, which the database does not consult either and which
may disagree with it. The status column is the account of the row
rather than the gate, so a row stamped `done` with no approval is
storable, and a check reading it would open for one. The stamp is
read so that a NULL column and a member a caller projected away come
out as one answer — a row that cannot say it was approved is a row
that was not.

Its refusal is loud rather than an empty answer, and that is because
both ways of getting this wrong are silent and permanent. An UPDATE
with nothing in its SET clause is an error nowhere in the stack; an
UPDATE carrying an unapproved arrangement makes every later pass of
that source extract under something nobody agreed to, and store what
it got. Neither is undone by anything downstream, which is the same
argument the `flagged` column rests on, and the reason this module
refuses where `src/lib/source-health.ts` refuses nothing.

What it does not refuse is worth reading beside that. A proposal
already applied is answered again, since re-applying writes the same
two documents onto the same source and there is nothing to protect by
refusing — the selection that skips applied rows belongs to whoever
is walking the queue. A malformed `parser_config` somebody approved
anyway is answered, because the approval is the gate and this is not
a second one. And nothing here writes: the answer is a value, and
whether the UPDATE happened is known only to whoever ran it.

## The registry

`SOURCE_ADAPTERS` in `src/sources/index.ts`: a literal mapping an id
onto the adapter it selects, with `listSourceIds` reading its keys in
sorted order and `getSourceAdapter` reaching one by id. A `sources`
row names one of those keys and nothing else does.

### Registration is static, and that is the fetch policy

The registry is written out. It is never built by reading the
directory, and that is not a matter of taste: a registry assembled
from a directory listing turns "a file was added" into "the runner
will now run it". The file lands, the list grows, and something
reaches the network under a decision nobody made.

Everything this platform is allowed to fetch rests on nothing running
unless it was named. So the naming is an edit to that literal, made
in the commit that adds the adapter and read by whoever reviews it —
which is the whole of what registration costs, and the whole of what
it buys.

### The drift a static list can carry is paid in a test

The cost of writing the list out is that it can disagree with what
the directory holds. `src/sources/index.test.ts` holds the registry's
keys against the modules sitting beside it, in both directions: an
adapter nobody registered fails naming itself, and a registered id
with no module beside it fails as a key naming nothing.

A test is the right place for that guard precisely because the
alternative — this module reading the directory to check itself — is
the thing being refused. A case that reads the directory fetches
nothing, so it can afford a listing the runtime may not.

### An unknown id is answered with null, not a throw

A caller handed an id out of a `sources` row can then print what IS
registered instead of a stack trace. An id that names no adapter is a
datum about a row; it is not a programming error, and a row can be
edited by anyone the seed script or an operator lets near it.

### The lookup asks whether the key is an OWN key

`toString`, `valueOf` and `constructor` all answer something off
`Object.prototype`, so a lookup reading the key directly would hand a
function back as though it were an adapter. The case is live rather
than hypothetical whatever the registry holds: the `in` operator
answers true for every one of those names over the very object the
lookup reads, so what a registered id happens to be spelt has no
bearing on it.

### The contract check reports every member, not the first

`sourceAdapterContractErrors` answers one sentence per member a
module fails to satisfy, and an empty list for one that satisfies it.
A list rather than a boolean, because what a registry check is for is
saying WHICH adapter is wrong and HOW; a check stopping at the first
fault turns one review into five.

It never throws, which is worth stating because the obvious
implementation does — twice. The module most likely to fail this
check is also the one most likely to carry a value that refuses to
render and a member that refuses to be read, and a check that threw
while describing one fault would report nothing at all about the
members it had not reached yet.

The `kind` it accepts is the schema tuple itself rather than a copy,
so what the check refuses at registration and what the `sources.kind`
CHECK refuses at insert are one declaration read twice.

### Five members, all required

That is the one divergence from the design this contract is ported
from. There an adapter could omit its listing step, and the check
carried a rule about which kinds were allowed to omit it. Listing is
not a member here: an adapter fronting several endpoints runs the
loop in `src/sources/paged-list.ts` inside its own `fetch`, so no
optional member is left for a conditional rule to be about.

### What is registered, and what registering one costs

`listing-api` and `push-capture`, and they front different kinds:
`api` for the cursor-paged listing loop run against the endpoint a
row names, `push` for an envelope a client sent. No registered
adapter declares the `url` or `rss` kind, so a row carrying one
names an id nothing answers — a fact about the literal rather than
an error, and the null `getSourceAdapter` returns is how a caller
finds out.

Registering an adapter is a line in that literal plus a case. The
shipped ids are written out in `src/sources/index.test.ts` rather
than derived from the literal being checked, so that expectation is
what notices a registration at all, and the set-equality guard
beside it notices the opposite mistake — a module written and never
named. Nothing further is owed: the directory guard accounts for the
module and the stored payload the id names, and the contract check
walks whatever the registry holds, so both take a new entry without
an edit.

What is registered is not a working adapter, and that is where the
contract and the registry pull against each other. Configuration
binds at construction, so an adapter is per ROW; a registry is keyed
by id and holds one entry per KIND of source. The entry therefore
carries the id and the kind a `sources` row is matched against, is
bound to no row and names no endpoint, so it can reach nothing even
if something called it — `listing-api`'s declaration is held to that
by a transport that refuses, and `push-capture` has nothing to
refuse with, no member of it opening a socket at all. A run builds
its own adapter through that module's factory with the row it is
for.

The other modules beside the registry front no source, declare none
of the five members and each says so at the top of its own file.

### Nothing here is spliced into a workflow, the registry included

A registry names its adapters with value imports, which is exactly
what the dual-context rule under `src/lib/` forbids, so the registry
is Node-only and could not be anything else. The rest of the
directory is out of reach for a different reason, and it is a rule
rather than a preference: `assertMarkerPath` in
`scripts/workflow-markers.ts` refuses a marker path holding a `..`
segment, so `__INLINE:../sources/listing-api.ts__` is turned away by
name. The marker grammar takes that path and the path rule reports
it as `a .. segment` — which is the refusal that says which edit
fixes it, rather than a malformed-marker report naming neither the
file wanted nor the directory looked in. No module outside
`src/lib/` is spliceable under any spelling, which is why the splice
roster in `tests/build/lib-splice.test.ts` reads that directory and
not this one.

An adapter's extraction logic therefore reaches a Code node only by
living in a dual-context library the adapter also calls. Both
adapters here reach `parser-config.ts` and `markup-select.ts` under
`src/lib/` to extract; a workflow wanting that same extraction
inlines those two libraries by name, never the adapter around them.
One implementation read from two sides, with the Node-only half of
an adapter — its transport, its digest, its registry line —
staying in this directory.

## The capture contract

### A push source sends its payload, and the envelope is the frame

`push-capture` is the one adapter constructed from something that
arrived rather than from an address to go and read. A `sources` row
can name what a pull adapter should fetch; it cannot supply what a
push client captured. The envelope is what the client supplies
instead, and `src/lib/capture-contract.ts` is the boundary that
decides whether this service will read one.

That module sits under `src/lib/` and not in this directory, because
`ar-capture` splices it into the Code node that judges an envelope
and nothing here is spliceable. It is documented here all the same:
what a capture may be is this document's own subject, and
`push-capture.ts` is constructed from an accepted envelope. The
module's row in the spliceable-library table of
`docs/architecture/03-workflows.md` is a summary of the same thing
rather than a second contract.

Five members, all required, and `CAPTURE_ENVELOPE_MEMBERS` is where
the names are declared rather than retyped.

| Member | What the contract states |
| --- | --- |
| `version` | Which contract the client wrote to. An integer, compared for equality against `CAPTURE_CONTRACT_VERSION`, and the only member read before any other is judged. |
| `sourceId` | The `sources` row this capture is posted against, as a positive integer — the same id `documents.source_id` carries. Whether a row by that id exists, is enabled, or is the one this client should be posting to are three questions for the workflow that has a database. |
| `capturedAt` | When the CLIENT captured the material, as a UTC instant: the one spelling `toISOString` emits, three fraction digits or none, ending in `Z`. An offset form names the same instant and is refused anyway, so that a string sort and an instant sort over a corpus of stamps cannot disagree. |
| `provenance` | How the capture was taken. Keyed, scalars only with `null` included, and bounded three ways — at most 32 members, a name of at most 64 characters under the class a parser config uses for a field, and text of at most 512. |
| `body` | What was captured: text, a keyed object, or a list of them. Never read at this boundary and never converted here. An empty string is accepted, a capture that yielded no text being one to keep. |

Every member is read by own key alone. An envelope inheriting one
from a prototype has not stated it, which is what stops a payload
carrying no data at all from reading as one stating all five.

### The body is stored before the envelope is judged

`ar-capture` writes `documents.raw` first, with a `parse_status` of
`failed`, and only then asks whether the envelope is one the contract
accepts. The ordering is the point rather than an implementation
detail.

A push source cannot be re-read. A feed that answered something
unusable is fetched again on the next pass, so a refusal there costs
one cycle; a capture refused before it was stored is gone, and
whoever posted it has already moved on. So the row is written while
the payload is still nothing but bytes, and every sentence the
boundary returns lands in `documents.parse_error` on a row that
already exists.

What a refusal produces is a stored failure — a document an operator
can read, replay against a corrected config, and promote — rather
than a gap nobody can reconstruct. That is the keep half of
fail-flag-keep arriving a step earlier than the boundary section
above describes it. There the bytes are stored whatever the reading
made of them; here they are stored before anything has decided that
the envelope around them is readable at all.

The key is the one thing that write cannot derive. `documents.hash`
is NOT NULL and UNIQUE, and the digest that column eventually carries
is over a url and a body neither of which has been read yet, so the
row is keyed provisionally over the posted body under a prefix a
content digest cannot hold — that digest being 64 hexadecimal
characters, the separator is the whole of the guarantee. What the
provisional key collapses is a second POST arriving before the first
was promoted. Recognising a genuine repeat capture is
`documents.hash`'s own job one group later, under the content digest
an extraction produced.

### A version this service does not accept is refused, never assumed

`CAPTURE_CONTRACT_VERSION` is what this service accepts, and an
envelope stating anything else is refused on that alone: the other
four members are not looked at, and no fault about any of them is
reported.

A version says WHICH rules the rest of the envelope is judged by, so
an envelope from a client this service has never met is not an
envelope with an odd number in it. It is one whose members mean
something the boundary does not know. Judged under these rules
anyway, a client on a later contract that had moved `provenance`
inside its body would be told its provenance was missing: a sentence
naming a member the client did not get wrong, about a contract it was
not writing to.

Reporting that fault alone is the other half of the same decision.
Five faults derived from rules that do not apply is worse than one
sentence saying the rules do not apply, because an operator reading
the five would go and fix them.

A short list is not a clean bill, and the node running the boundary
says so rather than leaving the silence to be read as agreement. The
item it emits carries whether the version was the accepted one beside
the verdict itself, so a reader can tell an envelope that broke one
rule from one that was never judged by any of them.

### How a client learns which version to send

Out of band, and deliberately. The version is
`CAPTURE_CONTRACT_VERSION` in `src/lib/capture-contract.ts`, which is
1 today, and that constant is the authority rather than this
sentence. An operator who creates a `push` row hands the client
author the number along with the row id, which is already how the id
travels: nothing on the wire announces either.

Nothing on the request path answers the question either. The webhook
responds as the request lands, before the boundary has run, so what a
client gets back is an acknowledgement and never a verdict. And a
refusal names the rule rather than the value, for the version as for
every other member, so nothing this service writes spells a number
back at whoever sent one.

What does name the version is operator-facing. A refused pass writes
a boundary entry into the `errors` of the `runs` row that closes it,
carrying the version this service accepts beside the faults, so
somebody reading that run can tell a client author what to change —
travelling back the way the row id came.

### Provenance is a note, and it is recorded beside the record

`provenance` records how the capture was taken: which client, which
version of it, what it was reading. The three bounds are what keep it
a note rather than a second payload. Provenance is operator-facing —
read beside a document by somebody deciding whether to trust it — and
a nested structure of unbounded size read that way is a payload
wearing a note's name. The body already has somewhere to be, is
bounded by nothing, and is rendered to nobody until an extraction has
run over it.

Where it lands is `documents.raw`, and only for an accepted envelope.
The node recording the verdict rewrites that column as two members:
the note, which is the envelope with its body left out, and the
record, which is that body. Nothing is lost by the move, the record
being what was posted; what is gained is that the members the
boundary accepted sit beside the material they describe. A refused
envelope leaves the column exactly as it arrived, and the sentence it
earned in `documents.parse_error` is the whole of what changed about
the row.

The key does not move with it. The provisional hash is a column
rather than a derivation, so rewriting what it was derived from moves
nothing, and a second POST of the same capture still lands on the
same row.

The client's stamp writes no column of its own.
`documents.captured_at` is when this pipeline inserted the row and is
the column's own default; `capturedAt` is when the client captured
the material. Neither is derivable from the other — a client that
captured something on a train and posted it an hour later is lying
about neither — so the envelope's stamp is stored with the rest of
the note, where a later reader can compare the two.

One envelope becomes one document on this canvas, which is what makes
where the note lands a question at all. `push-capture.ts` splits a
list body into one document per entry and carries the note onto each,
because whoever calls the adapter inserts. The workflow promotes a
row keyed before anything read the body, so a reading split into
several would leave every entry after the first with no row to be
written to. A client with several items to capture posts several
captures, and that is the contract the endpoint offers.

## The shared listing run

### A listing loop fronts no source either, and does the I/O

`src/sources/paged-list.ts` is the second module here that declares
no member of the contract, and it is not the same kind of helper as
the reduction. That one is pure text; this one is the step that makes
requests. What it is, is the loop an adapter runs INSIDE its own
`fetch` when one `sources` row names several listing endpoints: the
adapter supplies the four things one listing source differs from the
next by — where the URL is, where the array is, how one item reads,
and which field is that item's timestamp — and the bounds, the
cursor and the notes live in the loop once.

The same reading rule applies as for the reduction. A module in this
directory is an adapter when it declares the five members and holds a
registry entry, not because of where it sits.

### The port is named for its mechanism, not for its subject

The original this was ported from is named for the particular kind of
listing it was written against, and that name is subject matter. This
platform researches whatever a domain's rows say it researches, so a
subject compiled into a filename under `src/` is the first thing
another domain reads as somebody else's platform. The port is named
for what the module IS — a cursor-paged list over several endpoints —
and the vocabulary is renamed the whole way down, an ENDPOINT being
one of the listing URLs a `parser_config` names and a RECORD being
one item such a listing answers with.

Renaming the whole way down rather than at the filename alone is the
part worth stating: a half-renamed module is worse than either end,
because the reader cannot tell which half is the mechanism. The
module's own header records the rename and its reason, so a reader
who finds the original does not read the difference as a mistake.

PAGED is about the cursor and not about the endpoints. For the shape
this was extracted from, one endpoint is one request — which is why
the request bound is effectively on or off, said plainly rather than
dressed up as paging that does not exist. The paging is ACROSS RUNS:
each run takes the oldest records it has not seen, up to the row cap,
and the next run resumes from the timestamp this one stored.

### The cursor is per endpoint

One timestamp shared across endpoints would let the endpoint with the
newest record set a high-water mark that skips every older endpoint
forever. The run would report success, and the corpus would have a
permanent hole in it that nothing downstream could see.

### An entity tag is only stored when the endpoint was fully consumed

A conditional request is only safe to make about a listing that was
read to the end. If the row cap stopped a run mid-endpoint and the
tag were stored anyway, the next run's conditional would be answered
with "unchanged" for a listing whose tail has never been read, and
the remainder would never arrive.

The stored shape says which state an endpoint is in by itself: an
entry carrying a tag was finished, and an entry carrying only a
timestamp was cut short.

### The cursor never advances into a group sharing one timestamp

Records that state the same instant are indistinguishable to a
timestamp cursor, so advancing to that instant while leaving some of
them untaken filters the rest out forever. The run backs the cursor
out to the last instant before the group instead. When the group
fills the whole row budget there is nothing to back out to, so the
run says that in a note rather than moving past records it did not
take — a bound an operator can raise, reported as one.

### The row budget is divided before the run starts

The row cap is divided by the endpoint count up front, so one large
listing cannot starve the rest, and it is checked between endpoints
so a long endpoint list cannot turn into a long list of requests. The
consequence is worth knowing rather than discovering: an endpoint
that answers nothing does NOT hand its share to the next one.

### Nothing in a listing run throws for input reasons

A transport failure, a status the source refused with, a body that
will not parse, an endpoint handle that is not one: each stops THAT
endpoint with a note and leaves the rest of the run alone. The notes
come back in the result, so a partially successful run is legible
rather than being either a silent success or a lost one.

A stored cursor gets the same treatment. The column is free text, an
operator can hand-edit it and another source may have written it, so
anything that is not this module's own JSON decodes to NO CURSOR
rather than to an error. The cost is one re-read, which the
convergence upsert absorbs.

### The transport is injected, and that is what keeps a run offline

The one thing that throws is a call supplying no `fetch`. That is a
divergence from the original, which falls back to whatever global its
runtime offers, and it exists because of the isolated-suite law: a
module that can reach a global transport is one an absent-minded case
can put on the network without anybody writing a URL. Requiring the
dependency makes the I/O visible in the call, and makes the law
readable in the signature rather than only enforceable by trusting
the test.

### What a parity gate can and cannot decide here

The cursor codec, the stamp coercion, the endpoint list and the
payload unwrap are compared against their originals in
`tests/parity/paged-list.parity.test.ts`, over inputs both sides are
handed. The listing run is not, and cannot be: its transport is
injected here and global there, and every note it produces was
re-authored in this vocabulary, so two runs would part on every note
over a port behaving exactly as intended. That half is characterized
in `src/sources/paged-list.test.ts` instead — cases describing what
the module DOES, which for a module with no parity gate is the only
description there is.

The two renamed keys are still inside the parity leg, and the way
that is made honest is worth recording: the original's key names are
discovered at run time by driving it with a recording proxy, never
written down. The discovered names exist for the length of a case, so
the leg measures the mechanism without carrying the subject matter
the rename exists to leave behind.

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
