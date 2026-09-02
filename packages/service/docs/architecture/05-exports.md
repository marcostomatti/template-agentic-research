# Exports — the renderer contract, and what an artifact is

Everything this pipeline puts in front of a person leaves through
this directory. The document is the map of `src/exports/`: the
contract a renderer satisfies and the four stored rows it is given,
what the send-free rule means on this side of the executor boundary
and how much of it a type can hold, what an artifact is and who turns
one into a file, the five formats a subscription can name and the one
that refuses, what separates the two markdown renderers, why the feed
is a file rather than a server, what an email draft is and is not,
and what registering a renderer costs.

It is the document the Exports row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to what a
renderer produces lands here in the same commit. The design it
implements is `.specs/2026-08-19-research-pipeline-port.md` — §4 for
the outputs paragraph that fixes what a renderer may do — and phase
numbers throughout refer to the 7-phase sequencing in that design,
§7.

Everything below landed in phase 6. What stood before it was
`src/exports/index.ts` alone, type-only, carrying a contract written
against open records while schema v2 was still unsettled. The seven
modules the directory holds now are that same file, carrying the
contract narrowed onto stored rows and the registry beside it; the
one rule every artifact path obeys; the markdown composition both
markdown renderers share; and the four renderers themselves.

## The contract

`ExportRenderer` in `src/exports/index.ts`, two members and nothing
else. The file holds the registry as well, the way `src/sources/`
keeps its own pair in one file: the contract says what a renderer IS,
and the registry is the list of the ones this service will run.

| Member | What it is |
| --- | --- |
| `format` | Which of the five formats this renderer produces. One renderer per format, and the value the registry reaches it by. |
| `render(input)` | Turns one stored digest into zero or more artifacts. Pure — no I/O, no network, and nothing written anywhere. |

The interface is one method wide on purpose. Artifacts are the whole
output channel, and the two formats whose names imply delivery —
`rss`, `email_draft` — are no exception to that.

It is not generic either, and the narrowing described below is what
made the type parameters pointless rather than merely unused. A
renderer is reached by the format a stored row named, so nothing at
the call site knows which renderer answered; parameters every caller
had to leave at their defaults were describing a variation no
registry can express.

### Four inputs, each a stored row

`ExportRenderInput` carries one domain's stored digest, the rows it
was made of, and the standing request being served.

| Input | What it is | Whole or a slice |
| --- | --- | --- |
| `domain` | The `domains` row this export is for: its id, its slug, its operator-facing name, and the settings carrying `findingsDisplayName` — what this domain calls a finding when one is shown to a person. | A slice. |
| `briefing` | The `briefings` row being rendered: the prose half, the structured half, the run that produced it, and the stamp it was generated at. | Whole. |
| `findings` | The `findings` rows the digest pass selected, in the order the pass selected them. | Each row whole. |
| `subscription` | The `export_subscriptions` row this render was dispatched for: its id, its domain, its format, and the connector that receives the artifact. | A slice. |

Each member is named for its drizzle property rather than for its SQL
column, the way `CanonicalDocument` in `src/sources/index.ts` spells
its own, so a row read through the ORM is handed straight in with no
field renaming in between for a mismatch to hide in.
`src/exports/index.test.ts` pins that assignability against the
tables themselves rather than leaving the mirror to the eye.

### The briefing is an input and not a derivation

It is the member a reader is likeliest to take for redundant beside
the findings, and three things say otherwise.

The prose half is not a function of the rows at all. `briefings.body`
holds what a model wrote, and `src/db/schema/runs.ts` says at the
table that producing it again is not on offer — a renderer
recomposing it would not be reproducing the briefing, it would be
writing a second one. It would also be a model call inside a render,
where `render` is pure.

The structured half IS a function of the rows, and that is exactly
why it is computed once. `assembleDigest` in
`src/lib/digest-assemble.ts` fixes the ordering, the sections and the
per-section counts; the digest pass stores what it answered; every
format then renders that same structure. Four renderers each deriving
it are four chances to disagree about what a period came to, which is
the disagreement storing the row exists to prevent.

And the findings are here anyway, which is what makes the pairing
worth having rather than merely safe. A renderer handed prose can
only reproduce it, where one handed the ids, the scores and the
fields a period selected can lay them out per format. So the briefing
says what the period came to and the findings are what a format lays
out — two questions, two members.

### What the slices leave out, and why

Four `domains` columns are somebody else's. `feature_version` and
`embedding_model` are vector bookkeeping read by the featurizer;
`created_at` and `updated_at` say when the domain was configured,
which is not what a period came to. A renderer given them could lay a
fact about the workspace beside a fact about the week, and nothing
would report the mix.

Five `export_subscriptions` columns are the schedulable set —
`interval_seconds`, `next_run_at`, `enabled`, `min_interval_seconds`
and `max_interval_seconds`. A renderer handed `next_run_at` is a
renderer able to lay a period out differently depending on when the
next one falls due, which is a schedule leaking into a document. What
the row is FOR here is identity: which subscription this artifact
answers, and where the caller is to hand it.

The briefing is the one input carried whole, because the row IS the
digest. Slicing it would be the contract deciding which half of that
account each format is allowed.

### Two members are redundant on purpose

`briefings.domain_id` and `export_subscriptions.domain_id` both
arrive beside the domain itself. They are separate selections, so a
caller that paired a briefing with the wrong domain has said so in
the input, where a case can read it, rather than in a rendered
artifact nobody re-reads.

### Three members say what a stored column is allowed to be

`briefings.body` is `string | null`, and NULL and the empty string
stay different. The column is nullable precisely so that no text
produced does not read as a briefing that came to nothing, and a
renderer writing an empty heading for a NULL undoes that distinction
at the last step before a person sees it.

`briefings.payload` is `unknown`, matching the column's own lack of a
`$type` annotation. Nothing validates a stored payload — the row may
predate a member, or have been written by hand — so a renderer
narrows what it reads rather than trusting a claim the database never
made.

`findings.score` is `number | null`, and NULL is not zero. An
unscored finding printed as a zero claims it was read and found
worthless. The assembly already puts absence LAST rather than lowest,
and a renderer that prints the number owes the same distinction in
what it prints.

### A stored format is a string until the selector narrows it

`ExportSubscriptionRow.format` is typed `string` and not the union,
which is what a SELECT actually answers: the five values are a CHECK
in the database rather than a union in the type system, so a row
written before a member was removed still reads back. The narrowing
lives at the selector and on `ExportRenderer.format` — a row whose
format no renderer is registered for never reaches a renderer at all,
so by the time the member is readable the narrowed form is already
the renderer's own.

`SubscriptionRecord` in `src/subscriptions/store.ts` takes the same
view of the same column, and the two are declared separately rather
than shared. The pipeline half and the HTTP half of one table do not
import each other, on the rule `src/sources/index.ts` states for its
own pair: that record answers what a caller may read and write under
`/exports`, this one says what a renderer is given, and one type
serving both would hand each surface the other's columns to explain.

## The send-free rule, on this side of the boundary

`docs/architecture/00-overview.md` fixes where the boundary runs:
workflows write to the database, renderers return artifacts, and an
email export produces a draft and stops there. A capability that
reaches outward is a service-layer one, arriving later and behind its
own approval gate, so nothing in the executor needs the ability at
all.

That sentence has two halves and they are enforced by different
things. The executor half is a scan over built workflows for
send-capable node types, and the register in
`docs/architecture/01-invariants.md` carries it. This half is about
the renderers, and it is stated here.

### What the type enforces

`ExportRenderer` has one method, that method returns
`ExportArtifact` values, and an artifact is bytes plus a relative
name. There is nowhere in the shape for a dispatch call to live: a
member that delivers — `send`, `deliver`, `publish` — would put a
send path back inside the renderer layer, and no renderer grows one
whatever its format implies about where the bytes end up.

That much is real enforcement rather than a convention, and where
each renderer is DECLARED is what makes it one. All four are object
literals annotated `ExportRenderer`, so a member the interface does
not name is an excess-property error at the declaration itself —
measured, by adding a `send` to one of them: `check-types` answers
TS2353 naming the member, and nothing else in the package moves. A
caller reaching a renderer through the registry is then handed the
interface, so `render` is the only thing it can call whatever the
module underneath it holds.

### What the type cannot enforce

A module is free to import a transport, reach it inside the one
member it declares, and satisfy the interface exactly. The type
constrains what comes back; it says nothing about what was touched on
the way. So the contract holds the rule for a renderer somebody has
read, and for no other.

### The rule is a property of the tree instead

`tests/invariants/exports-send-free.ts` supplies the scan surface,
the identifier roster and the region split, and
`tests/invariants/exports-send-free.test.ts` is what fails when the
rule stops holding: no module under `src/exports/` reaches the
notification layer under `src/notifications/`, a node transport
builtin, the global fetch, or a filesystem builtin. The walk refuses
to report a result at all when it read no files, so an empty answer
cannot come from an empty surface.

The reading is over every module in the directory, including the ones
nobody thought to look at and the ones that arrive later. That is the
whole reason it is a walk rather than a review checklist.

### The roster holds identifiers, and never behaviour

A textual scan cannot follow a socket into a variable named something
else, and does not need to: a reach spreads by its name being written
down. A builtin is named in a module specifier or it is not imported
at all, the notification layer is named by its own directory or by
the two symbols that reach a channel, and the global fetch is named
by the one word that calls it. Nine entries, each stating the reach
it stands for.

### Code and comment are split, because this directory argues its rule

`email-draft.ts` names the notification layer, the node transports
and the global fetch in the paragraph stating that none of them is
reachable from here, and `index.ts` names dispatch twice while saying
where dispatch lands instead. A scan that could not tell prose from
code would be red on arrival for exactly those sentences, and the
cheapest way to green it would be deleting them — a check that
punishes its own documentation is a check that erases it.

The split is also where the roster's liveness comes from. The code
result passes by being empty in every file, and empty is what a dead
needle, a surface that has stopped being walked and a clean tree all
produce alike. The comment result is the same needles over the same
content in the same run, and it is not empty. The suite pins the set
of entries that second half reaches, so a needle that has stopped
matching anything is reported rather than passing.

That control covers three of the nine entries — the notification
layer, the channel dispatch symbols and the global fetch — and saying
which is the point of having it. The four transport entries and the
filesystem one are named in this tree's prose only as categories, so
their zero rests on the planted samples in the suite alone.

### Two reaches are deliberately out

`node:child_process` reaches a transport by running another program
instead of opening a socket, and a runtime global such as a bun
filesystem API reaches a file without naming a builtin at all.
Neither is a transport builtin nor a filesystem builtin, which is
what the roster is over. An entry for either is a widening that owes
its own reason, and naming them here keeps the gap a decision rather
than an oversight.

## An artifact is a value, not an effect

`ExportArtifact`: the format it was rendered as, a
destination-relative path including the filename, the media type of
its body, and the body itself — text for every format that has a
renderer.

It describes where bytes should go without putting them there. The
caller that resolved the destination is the only thing that acts on
one, and that caller is whatever ran the export subscription: it
holds the `connectors` row, so it is the only layer that knows what a
destination is.

### A renderer never learns an absolute path

`ExportSubscriptionRow` carries a connector id and never an address,
and `ExportArtifact.path` is relative to a destination resolved after
the call returns. `src/exports/artifact-path.ts` is what turns those
two sentences into a property rather than a convention:
`buildArtifactPath` composes only destination-relative paths, and
`checkArtifactPath` refuses every shape that would name a location
instead of a file inside one.

That split is what leaves a finding title unable to name a file
outside the destination even though a filename is built out of one.

### Six refusals, in the order that fixes which reason

`checkArtifactPath` answers on the first check that refuses, the
shape `validateEntityName` in `src/lib/validate-entity-name.ts` sets
for the same reason: a reason is a diagnostic for whoever reads the
log, so a value failing several checks reports the one that ran first
rather than the worst thing about it.

| Reason | What it refuses |
| --- | --- |
| `empty` | An empty path, an empty segment inside one — which is what a doubled or trailing separator leaves behind — or a name the reduction answered nothing for. |
| `control_character` | Any control character, read on the raw value before the path is split. |
| `backslash` | The other separator, refused rather than translated. |
| `drive_letter` | A volume prefix at the very start: absolute without a leading separator. |
| `leading_separator` | A path opening at a root rather than at the resolved destination. |
| `traversal_segment` | A whole segment of two dots, read on the split path. |

Two of those run BEFORE the split and that ordering is load-bearing.
A NUL truncates a path at the boundary between this process and the
filesystem, so every later check would be reading a string the
filesystem never sees, and the tail after it is invisible to the
segment checks while present in the value a reviewer reads. The split
is on the forward slash alone, so a traversal spelled with
backslashes would be ONE segment to every check after it.

The traversal check is over the segment and never over the
characters, so `..sums` and `q..b` are ordinary names and stay
accepted.

### The builder reduces names, and does not reduce the extension

Every NAME `buildArtifactPath` is given — the folders, the filename
stem — goes through `slugify` in `src/lib/sanitize-md.ts`, which is
the only route by which untrusted text may reach a path. A name whose
reduction answers nothing is refused rather than dropped: a folder
dropped would silently move the file up one level from where the
caller said, and a filename that reduced to nothing would leave a
path whose filename is a bare extension — a hidden file on every
POSIX target, and a name no reader could trace back to the digest it
holds.

The extension is not reduced, and the asymmetry is the point. It is
declared by the renderer as a literal rather than read out of stored
text, so it is not the untrusted half and slugging it would only
mangle a legitimate one.

### The builder cannot answer a path its own checker refuses

It ends by putting its composed path back through
`checkArtifactPath`. That is what makes the claim true by
construction rather than by review, whatever any one of its arguments
carried, and `src/exports/artifact-path.test.ts` holds it as a case
rather than leaving it to this paragraph.

The consequence is worth stating from the other side: because the
names are reduced first, a reduced name can only ever reach the
`empty` refusal. The other five are reachable from the one
un-reduced argument, which is why the checker is also exercised
directly.

### A path that cannot be composed answers no artifact

All four renderers share one refusal and it is the same one: a digest
whose path cannot be composed produces an empty artifact list. The
reachable cause is a domain slug whose whole content reduces to
nothing — a real stored state rather than a malformed one, since
`domains.slug` is free text and the reduction collapses rather than
encodes.

Everything else is written. A period that held no findings is a note
saying so, a feed with no items, a draft that says the week was
quiet. Nothing downstream reads a destination back, so an absent file
and an export that never ran are the same thing to every reader of
one — and the one thing nobody downstream can do is ask which it
was.

## The five formats

`EXPORT_FORMATS` in `src/db/schema/values.ts` is the vocabulary the
`export_subscriptions.format` CHECK accepts, and `ExportFormat` in
`src/exports/index.ts` is the same five values as a union. The two
sides have to stay in step: a stored subscription whose format the
union cannot name has no renderer that can be selected for it, and a
member added to the union with no matching column value can never be
reached from stored data.

| Format | What it renders | Module |
| --- | --- | --- |
| `obsidian_md` | One note per digest: YAML front matter, then the shared body at heading depth one. | `src/exports/obsidian-md.ts` |
| `notion_md` | One page per digest: a title and a bulleted preamble, then the shared body at heading depth two. | `src/exports/notion-md.ts` |
| `rss` | One static RSS 2.0 file: a channel from the domain and the briefing, one item per finding. | `src/exports/rss.ts` |
| `email_draft` | One draft: a subject as the document's own heading, then the shared body at heading depth two. | `src/exports/email-draft.ts` |
| `pdf` | Nothing. The registry refuses it by name, carrying the reason. | none |

### `pdf` is a declared refusal, and that is why it is loud

A pdf body is BYTES rather than text — `ExportArtifact.body` already
carries that distinction, and `pdf` is the member it was widened for
— and producing those bytes needs a document dependency this service
does not carry. Everything else here composes text with no dependency
at all, so the gap is a dependency decision rather than an oversight,
and it is written down as one.

The column accepts the value regardless, so a subscription naming
`pdf` stores fine and reaches selection. What it reaches is
`PDF_REFUSAL`: the format being refused and a fixed sentence saying
why, which a caller can log. That is the difference between a refusal
and an omission — an omitted format would answer an empty artifact
list, and a surface would render that as a period that came to
nothing.

The refusal holds two strings and nothing callable. A member that
could be invoked would make it a renderer that refuses at run time,
which is the shape being avoided. Replacing this const with a
renderer is the whole of what landing pdf later costs on this side.

## The two markdown renderers

`obsidian-md.ts` and `notion-md.ts` hand the same four rows to
`composeMarkdownBody` in `src/exports/markdown-body.ts` and place
what comes back under their own preamble. Everything a reader sees
below that preamble is the shared composition, so a period reads the
same in both surfaces.

### The composer decides layout and never content

Every word it answers was already stored: the prose is
`briefings.body` as a model wrote it, the sections and their counts
are `briefings.payload` as `assembleDigest` answered them, and a
finding's fields are the domain's own payload. What the composer
supplies is where each of those goes, at what depth, and in what
order. It writes no sentence about a digest, invents no heading,
re-orders nothing the assembly fixed, and reaches no clock.

The sections come out of the stored payload and are never re-derived
from the findings — not as a preference, and not even as an option:
`ExportFindingRow` carries no category key at all, so nothing in the
composer could file a row under a section. A payload nothing can read
sections out of therefore composes to the prose alone, which is the
honest answer for a briefing written by hand or backfilled from
whatever a domain kept before it had a pipeline.

Three numbers follow one law. A section count of `0` renders as
`(0)` and a `null` renders as no parentheses at all — the section is
present either way, and what changes is whether the document claims a
reading was taken. A score follows exactly the same shape. And a
field whose stored value is null or absent is left out rather than
printed as a blank, because a key with nothing after it reads as a
field somebody measured and found empty.

Every untrusted string is reduced through `sanitizeUntrusted` on the
way in — the prose, every heading, every field key, every field value
and every banner entry — and everything but the prose is then folded
onto one line. A heading, a bullet and a `key: value` pair each
occupy part of a line, so a newline inside one would end the
construct early and leave the rest of the value standing as markup in
its own right. The prose is the one place a line break means what it
says.

### Two things differ, and the second follows from the first

THE PREAMBLE. A YAML front-matter block is not markdown: it is a
convention a vault reads before rendering, and a surface that does
not read it renders the fence as a rule and the fields as three lines
of stray text under it. So the same three facts — the domain, the
period, and the moment the briefing was written — are written as a
fenced block in one renderer and as an ATX heading with a bulleted
list in the other.

THE HEADING DEPTH. Sections take `#` in the note and `##` in the
page. Obsidian titles a note by its FILE NAME, so nothing in that
document occupies the top level and a section takes the shallowest
heading markdown has. The other preamble puts a visible title there,
so a section at `#` would stand level with the page's own title and
the document would have two things claiming to be what it is about.

Everything else is the same by construction rather than by agreement:
the same input, the same composer, the same path rule, the same media
type, the same refusal and the same purity. The markdown-subset
question is settled by that sharing, because the composer emits ATX
headings, paragraphs, bullets and one level of nested bullet and
nothing else — no table, no raw HTML, no reference link. The one
construct the pair does not share is the fence, which is the first
difference above.

### Why two modules rather than one renderer taking a flag

The two differences are not independent, so a flag would offer four
combinations of which two are wrong: a fenced block at `##` gives a
page a rule, three stray lines and no title, and a visible title at
`#` puts every section level with it. A parameter that must not be
varied freely is not a parameter, and a renderer holding one would be
a place for the next surface to add a third.

`ExportRenderer.format` is one value per renderer, and the registry
reaches a renderer BY that value. A flagged renderer would have to be
told at the call site which format it was answering as, which is
precisely what nothing at the call site knows.

And each preamble is argued from what one surface does with a
document. That argument has to be where a reader of that surface's
renderer will meet it; a flag names what differs and leaves nowhere
to say why.

### Three readings written twice, and a case holding them equal

The stamp reading, the period and the file stem are the same fifteen
lines in both modules, copied deliberately. Importing one renderer
into another would make the pair a hierarchy and put a change one
surface needs one edit away from moving the other's documents, which
is the coupling two modules exist to prevent.

The price is paid where a case can see it: the colocated file beside
`notion-md.ts` holds the period, the stamp and the path against the
sibling's over one input, and compares the two bodies line for line
through the declared depth axis. A drift in either copy is reported
by a case, rather than by two documents about one period disagreeing
about which period it was.

### Neither preamble is quoted, folded or reduced

Every preamble value is produced by one of exactly two things.
`slugify` answers lowercase letters, digits and hyphens and nothing
else, and `Date.prototype.toISOString` answers a fixed ASCII shape
whose only punctuation is hyphens, colons, a dot, a `T` and a `Z`.
Neither alphabet holds a newline, a `#`, a hyphen followed by a
space, or a colon followed by one — so no value there can end its own
line, open a heading of its own, start a list item, or close a YAML
scalar early.

The fold the composer applies to every inline position would be
unreachable code in either preamble rather than a missing guard, and
both test files hold the argument as a LINE COUNT over a hostile
domain slug instead of leaving it as a paragraph. The consequence for
a later edit is the part worth carrying away: a preamble field whose
value came from stored text would break that argument, and no
reduction inside those modules would repair it. Such a field belongs
in the body, where `sanitizeUntrusted` already runs over everything.

## RSS is static file generation, and there is no server

What `rss` names here is a FILE FORMAT. No endpoint is mounted, no
route is declared, no port is opened, and no request is ever answered
by that module: it composes one RSS 2.0 document out of four stored
rows and returns it. A feed is a file somebody else may later serve,
and that somebody is the caller that resolved the connector, after
every renderer has returned.

The word most likely to mislead a reader of this directory is `feed`,
so it is worth saying plainly what is absent. There is no feed URL,
no polling, no subscriber list, no HTTP client, no fetching of
anything a document might cite, and no reach of any kind to a
network. The one format whose name sounds like a protocol imports
exactly what its two markdown siblings do.

### The document is a flat list, by construction

The channel comes from the domain and the briefing; there is one item
per finding, in the order the caller selected them, which is the
order the digest assembly fixed. No item is dropped, re-ordered or
merged.

Nothing is filed under a category, and that is not a preference
either. The sectioning of a digest lives only in `briefings.payload`,
and `ExportFindingRow` carries no category key, so nothing here could
file a row under one. It is also why this renderer reads the findings
directly where the markdown pair reads the stored sections.

### Nothing in the document is a URL

RSS wants a `link` on a channel and offers `guid` on an item, and
both are conventionally addresses. A renderer has no address to put
there and never learns one: the subscription carries a connector id
and not an endpoint, and inventing a public URL would be a module
guessing where an operator serves files.

So both are URNs. A `urn:` is a URI that NAMES without locating — no
reader can turn one into a request — and `isPermaLink="false"` on the
guid is the format's own way of saying exactly that about an
identifier. The namespace is not a registered one, deliberately:
registering would be a claim about a global registry this project has
not made, and what matters is the scheme rather than the label after
it.

### Escaping is two passes, and removal is the first

`escapeXmlText` is the one route from a value into the document, and
it does two things in one pass because doing either alone is unsafe.

IT REMOVES WHAT XML CANNOT CARRY, FIRST. This is the half a reader
expects to be an escape and is not: XML 1.0 has no representation for
a C0 control other than tab, newline and return — not as a raw byte,
and not as a numeric character reference either, so `&#1;` is as
illegal as the byte itself. A control character in a stored field can
only be dropped, and a document keeping one is a document no
conforming parser will read at all. Lone surrogates go the same way
and for a sharper reason: a JS string may hold one, UTF-8 cannot
encode one, and the declaration at the top of the document says
UTF-8. Delete is KEPT, so that its presence does not read as an
oversight — XML 1.0 permits it and only 1.1 restricts it.

IT THEN ESCAPES ALL FIVE PREDEFINED ENTITIES, AMPERSAND FIRST. The
order is the whole correctness of the pass: every replacement after
the first introduces an ampersand of its own, so an ampersand escaped
last would be escaped inside the escapes and `<` would arrive as
`&amp;lt;`. The roster is declared in the order it is applied for
that reason.

The quote and the apostrophe need no escaping in element content and
are escaped anyway, so one function's answer is safe in BOTH
positions. The document writes one attribute today, whose value is a
literal, and a value moved from a text position into an attribute
position later cannot become an injection because the escaper it
already went through covered that case too.

### Untrusted text is reduced before it is escaped

`sanitizeUntrusted` runs over every stored string first and the
escape follows it. Escaping alone would be enough to make the
document WELL-FORMED and is not enough to make it SAFE: a feed reader
conventionally renders an item description as HTML, so text that
survives the XML parse as a tag is markup again on the other side.
The reduction is what makes the parsed text inert; the escape is what
gets it through the parse unchanged. Two layers answering two
different questions.

### Nothing is folded, and that is a difference rather than an omission

Markdown is line-structured, which is why the shared composer folds
every inline position. XML has no line-based syntax at all: element
content runs to its closing tag whatever line breaks it carries, so a
fold here would be a module editing stored text to no purpose.

The one consequence is visible in the source of a multi-field item:
its description content is written flush against its tags across
several lines, because indenting them would put that indentation
INSIDE the text a reader shows. Layout indentation stops where
content begins.

### Two dates, one guard, and a failure that is not an exception

The channel dates the briefing was generated and each item dates its
own `findings.created_at`, both as RFC 822 through
`Date.prototype.toUTCString`, whose output format the language
specifies exactly — in English, in UTC, whatever locale the process
is running under.

The guard is not the markdown siblings' guard, though it looks like
one. Those guard their stamp because `toISOString` THROWS on an
invalid date. `toUTCString` does not throw: it answers the literal
text `Invalid Date`, which would be written into a `pubDate` element
as though it were a moment. Silent bad data rather than a loud
ending, so the reading is guarded on the TIMESTAMP and a date that
has none produces no element at all — the same law the composer
applies to a count and to a score.

## The email draft

A draft is the whole output. One artifact carries a subject line and
the digest beneath it, and that is where this service's part in an
email ends. Nothing addresses a message, writes a header block, opens
a connection, enqueues anything, or learns an address at all — the
input carries a connector id and never a recipient, and the colocated
cases read that back off the artifact rather than leaving it to the
import list.

### Dispatch is a later capability, behind its own approval gate

`docs/architecture/00-overview.md` fixes where a capability that
reaches outward lands: in the service, each behind a gate of its own,
and never in the executor. So whatever one day puts a draft in front
of a person reads an artifact this renderer already answered, and the
approval that lets it run is a decision recorded in the database
rather than a branch on a canvas. None of that is deferred WORK here.
It is a different layer, and the draft is complete without it.

This module is also what keeps the executor send-free once email
subscriptions exist. `email_draft` is already a value the
`export_subscriptions` format CHECK accepts, so a row naming it is
schedulable today and the dispatcher claims one exactly as it claims
any other export unit. The pipeline reaching a format whose own name
says `email` and finding a renderer that only composes text is what
makes the send-free rule survive contact with the one format that
implies delivery. A send path grown here would sit INSIDE the
executor, where every workflow writing to the database only would
still be true and would no longer be the whole story.

### The subject is a heading, not a header field

A `Subject:` line is the first line of an RFC 5322 header block, and
a header block is the half of a message that says where it goes.
Writing one would put a message envelope inside a renderer — an empty
envelope at first, and then a place for the next task to add the
field that fills it. So the subject is the document's own top-level
heading: a person composing the message reads it off the top of the
draft, and nothing in the artifact is shaped like a field a transport
would parse. That is also why the body sits at heading depth two.

### The one preamble in this directory built from stored text

The markdown pair's argument — that a preamble needs no reduction
because every value in it comes from `slugify` or `toISOString` —
does not reach here. A subject is composed from the domain's display
vocabulary, which is `DomainSettings.findingsDisplayName`: free text
an operator typed.

So it is reduced, and then folded onto one line, because a heading
occupies part of a line and a newline inside the value would close it
early. And because the reduction can empty a value that was not blank
— a vocabulary of markup and nothing else reduces to nothing at all —
the fallback `displayNameFor` applies to the stored value is applied
a second time to the reduced one. A subject reading as a bare period
would say nothing about what it is a digest of.

## The registry

`EXPORT_RENDERERS` in `src/exports/index.ts`: a literal mapping each
of the five formats onto what this service holds for it, with
`rendererFor` reaching a renderer by the format a stored row names
and `refusalFor` reaching the declared refusal beside it. An
`export_subscriptions` row names one of those keys and nothing else
does.

### Registration is static, and never read off the directory

The registry is written out, on the rule `SOURCE_ADAPTERS` in
`src/sources/index.ts` states for its own literal: a registry
assembled from a directory listing turns "a file was added" into "the
service will now run it".

Renderers are pure and reach nothing, so the hazard is milder here
than it is there — but the reason the naming is an edit somebody
reviews is the same, and one registry in this repo built each way
would be a shape a reader has to check rather than know.

### An unknown format and a refused one are both null

`rendererFor` answers null for two states: a format the registry
refuses, and a format it has never heard of. Both leave a caller with
nothing to render, which is why one return type serves both. What
differs is what a caller can SAY about it, and that is `refusalFor`'s
job — a caller that got null from the selector asks the other and
reports whichever it has.

Null rather than a throw, on the reading `getSourceAdapter` states:
the argument came out of a stored row, so an unrenderable format is a
datum about stored data and not a programming error.

### One `Object.hasOwn` guard is load-bearing and its twin is symmetry

Both selectors go through it, because `toString`, `valueOf` and
`constructor` all answer something off `Object.prototype`. It is the
thing that refuses them on `refusalFor` alone: that narrowing refuses
renderers, so an inherited `toString` — a function, but not one
carrying a callable `render` — would otherwise be answered as a
refusal with no format and no reason on it at all.

On `rendererFor` the guard is symmetry rather than the refusal.
`isExportRenderer` independently refuses every inherited name, since
nothing on `Object.prototype` carries a callable `render`, and
removing the guard was measured to redden nothing. Both are written
the same way so a reader comparing them finds one shape and not two,
and this paragraph is what stops the next reader deleting the live
one on the strength of the dead one.

### What registering one costs

A line in the literal, an import above it, and the two cases that
read the split. Nothing else has to be remembered, and that is
deliberate.

The key set is held against `EXPORT_FORMATS` in
`src/db/schema/values.ts` in both directions, so a format the column
accepts and the literal omits fails naming itself, and a key here
that no column value can carry fails the same way. The type closes
the first direction ahead of any case: the record is keyed by the
union, so a member added to it with no entry is a `check-types` error
rather than a green run.

### What the type checks, and what only a case can say

What the cases add is WHICH of the two an entry is. A refusal
satisfies the entry type exactly as a renderer does, so a renderer
replaced by a refusal — or never written — type-checks and the record
stays exhaustive. The rendered and refused rosters are written out in
`src/exports/index.test.ts` rather than derived from the literal
being checked, which is what notices a registration at all, and the
misfiled-key reading beside them is the one fault a well-typed
registry can still carry: an entry whose own `format` disagrees with
the key it sits under.

## What this directory is not

### The HTTP half of `export_subscriptions` is `src/subscriptions/`

This directory is the pipeline's half in its entirety. The routes
over the same table — list, create, update, delete, and the run-now
verb — are `src/subscriptions/`, which answers under `/exports` all
the same and is documented in `docs/architecture/08-http-api.md`.

That is the opposite of the split `src/sources/` carries, and
`docs/architecture/00-overview.md` says so in its Layout table: there
the directory name already matched the table and only its CONTENTS
are shared, here the NAME was taken by a registry a subscription is
not a member of, so the resource group took its table's name rather
than its prefix's.

### Nothing here is spliced into a workflow, the registry included

A registry names its renderers with value imports, which is exactly
what the dual-context rule under `src/lib/` forbids. The rest of the
directory is out of reach for a firmer reason: `assertMarkerPath` in
`scripts/workflow-markers.ts` refuses a marker path holding a `..`
segment, so no module outside `src/lib/` is spliceable under any
spelling.

That is what decides where a digest is assembled. `ar-digest`, the
digest workflow whose row in `workflows/src/README.md` says which
phase lands it, cannot render at all — so it selects, assembles
through `src/lib/digest-assemble.ts` and writes the `briefings` row,
and the subscription row it was dispatched for is what says which
renderer the stored digest is later put through. It is also what
keeps `workflows write DB only` true of the one workflow whose
subject is exports.
