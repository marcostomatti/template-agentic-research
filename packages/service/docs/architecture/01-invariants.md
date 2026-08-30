# Invariants — the register

An invariant here is a property of the pipeline as a whole rather than
of any one file: something that has to hold across every workflow, every
model call, every stored row, or every tracked file at once. This
document is the register of them — what each one is, the artifact that
fails when it stops being true, the phase that lands that artifact, and
whether it is enforced today.

The design the register comes from is
`.specs/2026-08-19-research-pipeline-port.md`. Its §5 fixes the set
below, with the hostname row carried from the migration-hygiene rules in
§6, the bounded-chunk row from the risk register in that same §6, the
category-depth row from the schema-v2 table roster in §2, the
hash-dedupe row from the locked core vocabulary in §1, and the
proposed-configuration row from the parsing and validation rules in §4,
all registered here alongside the rest; phase numbers throughout refer
to the 7-phase sequencing in that design, §7. The deterministic-build
and spliced-library rows are drawn from outside that design, from the
build rules in `.specs/q03-port-phase-3-build-dispatch.md` §1 — the
phase spec that lands the build system — and the origin-path row
likewise, from the parity-harness constraints in
`.specs/q06-port-phase-4-lib-wave.md`, the phase spec that lands the
seam that row polices. The two auth rows come from outside it as well,
from the acceptance criteria in `.specs/q07-auth-basic.md` — an item
scheduled beside the seven phases rather than inside them, so its cell
in the phase column names the item rather than a number.

## The register

| Invariant | Enforced by | Owning phase | Status |
| --- | --- | --- | --- |
| No workflow holds a send-capable node | `tests/invariants/workflows.test.ts`, over workflows built from `workflows/src/` | 3 | Implemented |
| A model node is fed a prepared chunk and nothing else | `tests/workflows/ar-ingest.test.ts`, driving the built body of the node that assembles a prompt and holding what it hands on to the framed halves, the four ids and the measurements — the half this row's phase and status are about; `tests/lib/chunk.test.ts`, landed in phase 4, for what a prepared chunk is before any workflow reaches for one | 5 | Implemented |
| A prepared chunk is capped at 6000 characters, and there is no raw-body fallback | `tests/lib/chunk.test.ts`, driving `buildChunk` over assemblies each of which would overrun the cap, and holding what it refuses to a closed roster of reasons in both directions | 4 | Implemented |
| Every model call carries a per-run ceiling, writes a ledger row, and never retries | `tests/invariants/workflows.test.ts`, over workflows built from `workflows/src/` | 5 | Implemented |
| Exactly one schedule trigger exists, and `ar-dispatch` holds it | `tests/invariants/workflows.test.ts`, over workflows built from `workflows/src/` | 3 | Implemented |
| Building one tree twice writes byte-identical artifacts, and the git build stamp is the one value permitted to move with the checkout | `tests/build/build-workflows.test.ts`, spawning `scripts/build-workflows.ts` twice over a fixture source tree and holding the two output directories against each other | 3 | Implemented |
| A library spliced into a Code node stands alone there — no value import, declaration-form exports only, no reliance on module scope | `scripts/build-workflows.ts`, refusing the first two through `assertSpliceable` in `scripts/workflow-markers.ts` and writing no artifact at all; `pretest` runs the build ahead of the default suite, and the third rule leaves nothing to refuse it on | 3 | Implemented |
| Nothing is recorded as researched without an approval, and the database is what says so | A CHECK constraint in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 2 | Implemented |
| No proposed configuration reaches a source row without a recorded approval | `source_config_proposals_approval_check`, the CHECK in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 5 | Implemented |
| A category is a root or the child of a root, and nothing deeper | A trigger in the hand-written migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts`, with the opt-in `tests/live/schema.live.test.ts` watching a database refuse the write | 2 | Implemented |
| Every document carries a hash, and no two carry the same one | The NOT NULL and UNIQUE pair on `documents.hash` in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 2 | Implemented |
| No naming from the project this pipeline was ported from survives in tracked source | `tests/invariants/naming.test.ts` | 1 | Implemented |
| No vault path appears in tracked source | `tests/invariants/naming.test.ts` | 1 | Implemented |
| No real hostname appears in a tracked file | `tests/invariants/naming.test.ts` | 1 | Implemented |
| The origin checkout a parity run reads is named in the environment and nowhere else — no tracked file records the path, and no default stands in for it | `tests/invariants/parity-origin-hygiene.test.ts`, over `tests/helpers/port-parity.ts` and every file under `tests/parity/`, with the roster it reads held set-equal against that directory so a file added later cannot go unscanned | 4 | Implemented |
| No log line and no HTTP response carries the bootstrap password | `tests/auth/secret-logging.test.ts`, booting the service with a sentinel `AUTH_BASIC_PASSWORD` and reading stdout, stderr and the response body back across the bootstrap, a login, and a malformed login carrying the sentinel | q07 | Implemented |
| No file under `src/` or `lib/` outside `src/auth/` and `src/db/schema/auth.ts` names a password hash or a session-token hash | `tests/invariants/auth-containment.test.ts`, over the identifier roster and the walker in `tests/invariants/auth-containment.ts`, which refuses to report a result at all when it read no files | q07 | Implemented |

## Reading the register

**Enforced by** names the artifact a violation surfaces in — the file
that goes red, not the rule in prose. **Owning phase** is the phase
accountable for the row: the one that lands the artifact, or, where the
artifact is already written, the one that lands what it judges.
**Status** is `Implemented` when the artifact exists, runs on an
ordinary `bun run test` today, and reads something the rule applies to;
`Unexercised` when it exists and runs over nothing the rule applies to;
and `Pending` when the row is still a reservation.

An **Enforced by** cell can name an artifact from a phase other than
the owning one. That happens where a property splits into halves that
land separately: the cell names both, so the row can be read without
holding the rest of the register in mind, while **Owning phase** and
**Status** stay with the half the row is accountable for — the one
nothing enforces yet, or, once everything does, the one that landed
last.

### A row is written before the artifact that enforces it

Rows go into the register before anything enforces them, and that is on
purpose: a property is recorded once it is decided, not once somebody
gets around to checking it.

Filling the table the other way round — adding a row when its
enforcement arrives — produces a register listing whatever was already
remembered, which is the part that needed the reminder least. A pending
row is also what makes a later phase accountable: the phase that lands
the behaviour lands the check with it, and the row is where it is
written down which phase that is.

### The suite is the spine, and later phases extend it

Phase 1 opened `tests/invariants/` with the naming invariant, and
phase 2 added the static-SQL scan over `drizzle/` beside it. Phase 3
landed the workflow half of the suite next to
`scripts/build-workflows.ts`, which writes the tree it stands on:
`tests/invariants/workflow-dist.ts` reads `workflows/dist/`,
`tests/invariants/workflow-rosters.ts` fixes the node types the rules
are keyed to, and `tests/invariants/workflows.test.ts` holds every
built workflow to them. A register row naming that last file rests on
all three, and what all three read today is one built workflow,
`ar-dispatch`.

Phase 3 also put a module in `tests/invariants/` that no row names.
`tests/invariants/dispatch-sql.ts` holds `ar-dispatch`'s own
statements to the properties `docs/architecture/06-scheduling.md`
argues, which are properties of one workflow rather than of the
pipeline; the register is the second kind. Both kinds join the same
suite, and each later phase adds its assertions to it.

Extending one suite rather than starting a parallel one is the same
argument the single test runner rests on: a suite that lives outside
what `bun run test` collects is a suite the gate does not run, and a
check nothing runs is indistinguishable from one that passes.

### A check with no subject runs, passes, and enforces nothing

A check the gate never collects is one kind of empty. There is a second,
and the suite reached it on every run for two phases: a check that is
collected, runs, walks its whole input, and finds nothing the rule is
about. Landing the spine ahead of the behaviour it guards is what
produces one — the guards over model calls walked every built workflow,
matched no node, and passed, from phase 3 writing them to phase 5
landing the first node they could read. Such a pass says the built tree
holds no counterexample, and it says exactly as much over a tree with
nothing to hold to the rule. Nothing in the run parts the two.

Neither of the other readings reports that honestly. `Implemented` would
report the property as held, where what holds it is that nothing has
offered the check a subject. `Pending` would lose the half that is real:
the artifact exists and is collected, and **Owning phase** names the
phase that lands the subject rather than the phase that lands the check
— the reverse of a pending row, where one phase lands both.
`Unexercised` is the reading for exactly that, and a row carrying it
becomes `Implemented` when its subject arrives, with nothing about the
check moving for it.

The refusal that keeps the workflow rows honest does not reach an
unexercised one. Those assertions read built output through a reader
that refuses an empty tree, which is what stops an absence check passing
over no workflows at all, and what makes the green on the
send-capable-node and schedule-trigger rows a reading over a tree with
nodes in it. No refusal can do the same for a rule whose subject has not
landed: a built tree carrying no model node was what phase 3 delivered
rather than a mistake to fail on. What stands behind such a row
meanwhile is whatever a planted sample can reach — the matcher that
finds its subject, driven over planted types in
`tests/invariants/workflow-rosters.test.ts`, and the reads behind it,
driven over planted statements and bodies where they are driven at all.
None of that says anything about the two composed over a real node,
which is what phase 5 supplied and what moved the row.

## Why each row is here

### The executor cannot send

Workflows write to the database, renderers return artifacts, and an
email export produces a draft and stops there. Reaching outward is a
service-layer capability that arrives later, behind its own approval
gate, so nothing in the executor needs the ability at all.

The node-type scan is what keeps it that way. A node of one of the
types it names, added to any workflow — deliberately, or carried in by
a copied template — fails the suite before the workflow reaches an
instance. The payoff is a review surface small enough to audit: one
gate to read rather than every workflow, and a pipeline bug that stays
a pipeline bug instead of becoming a delivery one.

What `Implemented` means for this row is narrower than the heading
above it. Nothing in a test can ask an instance what a node is able to
do, so the scan holds a node's type against a roster carrying one
entry per send route rather than one per vendor: a workflow reaching
for a further vendor of a route already named is a miss, and the
answer to one is an entry rather than a wider pattern.
`tests/invariants/workflow-rosters.ts` is where that set lives, and
each entry states the route it stands for.

### Four separate properties bound what a run can spend

An unattended pipeline that calls a paid API can spend without anybody
watching, and each property below is one whose absence has cost real
money:

- a model node fed a raw document body is fed whatever arrived, at
  whatever size, while a prepared chunk is bounded before the call —
  and an unusable chunk is gated out rather than quietly replaced by a
  fallback to the raw body;
- a run without an explicit ceiling scales with its input, so one pass
  over an unusually large batch makes as many calls as it found rows;
- a retried call against a failing credential is not one failure but
  one failure per schedule tick, multiplied by the retry count;
- a schedule trigger acquired by accident is what turns any of the
  above from a single mistake into a recurring bill, which is why
  exactly one exists and the register names the workflow holding it.

A fifth property is what makes the other four checkable after the fact:
every model call writes a ledger row. A ceiling needs something to count
against, and spend nobody can attribute to a run is spend nobody can act
on — a burn stays invisible until the provider is the one who reports
it.

The schedule trigger was the first of the four the built tree held, and
its row reads `Implemented` on a count rather than a clock.
`tests/invariants/workflows.test.ts` holds the whole built tree to one
node of one named type, carried by `ar-dispatch`. The two limits on that
bound it from opposite sides: a workflow written with either of the
hidden types that type replaced holds a schedule the count never sees,
and a trigger left disabled is counted while it fires on nothing.
`tests/invariants/workflow-rosters.ts` is where the type is fixed and
each limit is argued beside the declaration it belongs to.

The other properties are spread across rows that do not read alike. The
ceiling, the ledger row and the retry setting are one row, and
`tests/invariants/workflows.test.ts` holds every built workflow to all
three. That row read `Unexercised` while the assertions ran on every
pass over a tree carrying no model node; phase 5 gave them one in
`ar-ingest`, and the row reads `Implemented` with nothing about the
check having moved for it.

The first property is two rows rather than one, because it is two
claims about different things. What a model node may be fed is a
property of a workflow, and phase 5 landed both the workflow and what
holds it to that; the bound on the chunk itself is a property of the
library that assembles one, and reads `Implemented` from phase 4. The
workflow row names both artifacts anyway, because a reader who found
only the workflow half there would take the property to begin at the
node rather than at the library the node calls; its phase and status
stay with the half its own phase landed.

### The chunk ceiling is a bill somebody already paid

6000 is the only number in this register that came out of an invoice
rather than out of a design. The library the row names carries a rule
written after three model chains were each handed a document body
verbatim: 2,323 prompt tokens per call averaged, a worst case around
15,000 characters that were almost entirely message-format spacers and
tracking parameters, 81 calls in one pass, 732,000 tokens in that
pass, and a month's budget spent in 43 minutes. One tracked link is
the same shape in miniature — roughly 40 characters of address wrapped
in roughly 900 of tracking parameters, every one of them billed as
input.

So 6000 is the budget written down, and the two halves of the row are
the two ways that budget was actually lost. The cap is enforced on the
way OUT of `buildChunk`, over the assembled chunk, rather than trusted
to the header assembly, the excerpt build and the stand-in texts above
it: any of those can be widened by a later edit that looks local, and
a ceiling nothing re-checks is an intention. And there is no raw-body
fallback, because a fallback is what turns a reduction that failed
into the exact call the ceiling exists to prevent — the largest input
in the corpus, sent because something went wrong with it. An input
that cannot be reduced comes back unusable carrying a reason, and the
caller routes it to review.

`tests/lib/chunk.test.ts` is what fails when either half stops
holding, and each half needs a guard the assertions alone do not
carry. A chunk inside the ceiling looks identical whether the cap
fired or not, so every ceiling fixture declares a floor computed from
its own pieces and a case of its own asserts each floor is above the
cap. A refusal is read as its sentence rather than as a bare failure,
and the sentences are held set-equal against what the cases produce in
both directions, so a reason nothing reaches fails as loudly as one
no roster entry registered.

What `Implemented` means here is the library and not the pipeline. The
row binds what `buildChunk` answers; it says nothing about a workflow
that never calls it, which is what the row above it covers and what
phase 5 landed with `ar-ingest`.

### Approval is a constraint, not a branch

Every approval row in the register says the same thing about a different
subject. The gate on research is a CHECK constraint in the schema: a row
cannot be recorded as researched unless it already carries its approval.
The gate on source configuration is that mechanism one table over — a
`source_config_proposals` row cannot record that its `parser_config` and
`contract` were applied unless it already records that somebody approved
them. Each constraint refuses the write itself, so each gate holds for
every writer — workflow, script, or API — and skipping one is not a code
path anybody has to review for.

A branch inside a workflow would be the weaker form of the same rule. It
can be edited by anyone who can open the executor's UI, that edit leaves
no diff to review, and it binds only the writer it sits in. Until the
service and its UI take approvals over, rulings on both gates are made
through one small CLI — `scripts/approve.ts`, landed in phase 2 and
taught the second gate in phase 5 — which is a client of the constraints
and not a substitute for either.

How far each constraint reaches is where they differ, and the difference
is worth stating because their register cells look alike.
`research_pool_approval_check` reads `researched_at` and `approved_at`
on one row, so the property and the record of it are the same write and
the CHECK is the whole of the gate.
`source_config_proposals_approval_check` reads two timestamps on the
proposal row and says nothing whatever about `sources`, so what it
enforces is that the record of an application carries the record of an
approval — not that the UPDATE onto the source went through the table at
all. A writer that rewrites `sources.parser_config` directly is refused
by nothing.

The row is still worth writing against the CHECK rather than against
that writer. What the database holds is the half no code path can route
around, which is the half a register is for; the other half is
`proposalToSourceUpdate` in `src/sources/config-proposer.ts`, which
refuses to answer an UPDATE for a proposal carrying no `approved_at` —
the same account the CHECK reads, never `status`, which neither
consults. `docs/architecture/04-sources.md` carries that half and the
path either side of it. What the register adds is why the database half
is worth a row of its own.

### A hash and a depth cap are properties of a set, not of a row

Two of the schema rows state a property of a whole collection rather
than of any row in it. One row per distinct item is the shape of the
corpus; a taxonomy one level deep is the shape of a domain. Neither is a
fact a writer can settle from the row in its hand — the first is about
every hash already stored, the second about the parent above the row and
the children below it — so each is a rule the database holds or nothing
does. `docs/architecture/02-schema.md` carries the mechanism of both;
what the register adds is why the property is worth a row.

The depth cap rests on the same argument as the approval gate above it.
Rows reach `categories` from the seed script, from hand-written SQL
inside workflow nodes, and from an operator at a psql prompt, and a
check written into one of those binds only that one.
`categories_enforce_depth()` refuses the write whoever makes it: a row
whose parent is itself a child, a row given a parent while it already
has children, and a row whose parent belongs to another domain.

The hash pair needs a different argument, because what it prevents is
silent rather than merely unenforced. NOT NULL and UNIQUE are one
mechanism on `documents.hash` and not two constraints sharing a column:
NULL conflicts with nothing, so a nullable member would leave
`documents_hash_unique` reading as a key while the
`ON CONFLICT DO NOTHING` that lands a repeat capture never fires. The
insert proceeds, the statement reports success, and the corpus grows by
a copy per pass — the first symptom being a count somewhere downstream
rather than an error anywhere.

The two rows name different artifacts, and drizzle-kit's snapshot
decides that rather than taste. A NOT NULL and a UNIQUE are modelled
under `drizzle/meta/`, so the pair is declared in a schema module and
generated from it, and the static-SQL scan is a real tie between two
tracked copies of one rule. A trigger is modelled nowhere, so it is
hand-written, and that scan is then evidence about the file and about
nothing else — a database the migration never reached reads exactly like
one where the guard stands. That is why the depth row alone names a live
file. Its `Implemented` still rests on the static scan, which the
default suite runs; `tests/live/schema.live.test.ts` self-skips without
`AR_LIVE_DATABASE_URL`, and the cell says opt-in for that reason.

### The three de-origination rows hold from the first commit

They were the first rows to be enforced, and they could be enforced that
early because what they constrain is tracked text — which exists from
the first commit — rather than behaviour no phase has landed yet.
`tests/invariants/naming.test.ts` walks the package's declared scan
roots — `src/`, `lib/`, `workflows/`, `data/`, `scripts/`, and
`drizzle/`, plus the compose file and the environment example — and
fails naming the file and line of every hit.

Two limits on that coverage are worth stating where the rows are marked
enforced. The scan deliberately excludes `docs/`, `README.md`, and the
repo-root `NOTICE`, which is where naming the project this was ported
from is allowed and where its Apache-2.0 attribution has to stay — so
this document is outside the check it describes, and the repo-wide greps
run at the end of a phase are what cover it. The hostname row is pinned
to the specific host that was committed upstream, so it catches that
string returning rather than every hostname somebody might add; no
tracked file names a real host, and the rest of that rule is held by
review.

Pruning built output is not a third such limit. The walk drops `dist`
and `dist-external` by base name at any depth, so the `workflows/` root
contributes its sources and nothing built from them, and
`tests/invariants/workflows.test.ts` sweeps the built artifacts for the
same five names instead. That sweep is a re-check rather than a fourth
row: every file a default build reads — the workflow source, the library
its Code node splices out of `src/lib/`, and the settings table in
`scripts/workflow-markers.ts` — is inside the scan roots already, so a
name it finds is one `tests/invariants/naming.test.ts` finds first and
the file to edit is the same either way. It is stated over files because
the fourth thing such a build reads is not one: the call to git behind
the build stamp, whose short commit is nothing a needle is shaped to
match. Built output is gitignored besides, so nothing that sweep reads
is the tracked text these three rows constrain. What holds the
derivation up is where a build's inputs sit rather than anything the
build does: an input added outside the scan roots would end it, leaving
that sweep the only thing that reads the file's text for a name, and
then only as much of it as an artifact carries, a library's comments
being stripped on the way.

### The register names what it refuses, and never spells it out

Each of the three rows says which class of name is banned without
carrying an example of one. The origin-naming row stands for two
forms: the short abbreviation the origin used to prefix environment
variables, table names, and workflow identifiers, and the origin's
repository name. The vault row stands for two more — a path segment
naming a personal note store, and the desktop URI scheme of the
application that store belongs to. The hostname row stands for one,
the domain label that deployment answered on.

Writing any of them out here would not fail the scan, since `docs/`
is outside it. It would fail the other half of the rule: every phase
of this port closes with a repo-wide grep for those same names over
tracked files, and that grep does read this document. A register
illustrating its own rows would be its one guaranteed hit, and the
only ways back to a clean grep would be deleting the example or
narrowing the grep to spare it. The needle set takes the same
precaution a level down — `tests/invariants/naming-patterns.ts`
assembles every needle from fragments, so the scanner does not
contain the strings it exists to reject, and no pattern id is itself
a hit for any needle in the table — a failure message names what
broke without seeding a fresh copy of it.

That file is where the exact form is read, and each entry there pairs
its assembled source with the reason it is drawn as narrowly as it
is. Narrowness carries the first row in particular: the abbreviation
is short enough to fall inside ordinary camelCase compounds and
inside base64 hashes, so it counts as a hit only where a
non-alphanumeric character precedes it. A row here states the
property; the needle beside it states how much of that property a
text search can actually hold.

### The bootstrap password is the one secret nothing here can revoke

Every other credential this strategy handles expires or can be taken
away. A session token stops working on its own schedule, a logout
revokes one with a single row write, and neither is worth anything
once the row behind it is gone. The bootstrap password is none of
that: it is typed into an environment file by hand, it is the input
to every hash `auth_users` has ever stored, and it changes only when
an operator edits that file and restarts the service. A copy that got
out stays good until somebody notices and does both.

Logs and error bodies are where it would get out unnoticed, because
neither is a place anybody looks for a credential. Logs are shipped,
retained, and read by people and systems that never touch the
database; a 4xx body goes straight back to whoever sent the request,
authenticated or not.

Three paths could carry it to one, and each is closed today by
something that exists for another reason — which is what makes the
property worth a row rather than a note. `src/auth/bootstrap.ts` takes
no logger, so there is no line the password could be built into, but a
module can acquire one for an unrelated diagnostic. `POST /auth/login`
parses its body with `safeParse` and answers a flat `401`, which keeps
a `ZodError` off the shared handler and the `422` carrying `details`
it would become there; driven over the installed zod no `details`
entry echoes a submitted value, but that is a dependency's wording
rather than a property this package owns, and a body authored here
does not rest on it. And the route's own log lines are fixed strings
tagged with the route name rather than messages built from the parsed
body.

None of the three reads as a leak in a diff, which is why the check is
a sentinel rather than a review. A known `AUTH_BASIC_PASSWORD` boots
the service, the bootstrap and a login and a malformed login all run,
and stdout, stderr and the wire are read back for that one string. Its
pass is a zero, so it carries a leg that logs the sentinel
deliberately: a capture that reads nothing looks exactly like a
capture with nothing in it.

### A hash is contained by how few files may name it, and nothing else

The stored hashes are not secret from the database. Anything holding
SELECT reads both columns, which is what the argon2id parameters in
`docs/architecture/07-auth.md` are chosen against. What this row
constrains is how many places in the code may name one, because that
number is what decides whether any later rule about a hash is
checkable at all. A repository handing whole `auth_users` rows to its
callers would spread `password_hash` past every rule about where it
may travel, and nothing would report it: such a change type-checks, it
lints, and the suite stays green.

Identifiers are what the check holds, not values. A textual scan
cannot follow a hash into a variable named something else, and does
not need to — a column spreads by its name being copied, which is
why the four spellings `passwordHash`, `password_hash`, `tokenHash`
and `token_hash` are the whole roster.

The scan walks `src/` and `lib/` less the two paths the rule permits,
and what it leaves out is what keeps it a check somebody will leave
on. `src/db/schema/auth.ts` declares the columns and `src/auth/` is
the module the rule is about, so both are excluded by name. The trees
it never opens name a hash just as legitimately: the generated
migration and its snapshot under `drizzle/` spell both columns,
`tests/` carries the store contract and the in-memory store behind the
same port, and this document set argues about them in prose. A scan
reporting any of those would be narrowed or switched off inside a
phase, and a narrowed scan is one nobody afterwards knows the reach
of.

That makes this the mirror of the three de-origination rows above
rather than a fourth one. They are the same shape — a needle over
tracked text, run by the default suite — and the opposite rule:
those hold a name out of the repository entirely, and this one holds
two names inside two files. The difference is in what each has to
prove about itself. An absence scan goes empty when its needle dies,
which is the failure a planted sample catches; a containment scan goes
empty when its walker reads no files, which is why the walker refuses
to answer rather than report a zero it did not earn.

Both auth rows read `Implemented`, and what each has behind that
differs. The containment scan reads a static surface — every file
under `src/` and `lib/` less the two permitted paths — and answers a
zero over it. The logging row's artifact reads a running one: it
boots a service over a sentinel password, drives the bootstrap, a
malformed login and a valid login through it, and counts that string
in everything the process wrote and in what the refusal wrote back.
Each carries the leg its own kind of emptiness needs, a planted
sample for the scan and a deliberately logged sentinel for the
capture, because a zero found over nothing and a zero found over
something read alike.
