# Invariants — the register

An invariant here is a property of the pipeline as a whole rather than
of any one file: something that has to hold across every workflow, every
model call, every stored row, or every tracked file at once. This
document is the register of them — what each one is, the artifact that
fails when it stops being true, the phase that lands that artifact, and
whether it is enforced today.

The design the register comes from is
`.specs/2026-08-19-research-pipeline-port.md`. Its §5 fixes the set
below, with the hostname row carried from the migration-hygiene rules
in §6, the category-depth row from the schema-v2 table roster in §2,
and the hash-dedupe row from the locked core vocabulary in §1, all
registered here alongside the rest; phase numbers throughout refer to
the 7-phase sequencing in that design, §7. The deterministic-build and
spliced-library rows are drawn from outside that design, from the
build rules in `.specs/q03-port-phase-3-build-dispatch.md` §1 — the
phase spec that lands the build system.

## The register

| Invariant | Enforced by | Owning phase | Status |
| --- | --- | --- | --- |
| No workflow holds a send-capable node | `tests/invariants/workflows.test.ts`, over workflows built from `workflows/src/` | 3 | Implemented |
| A model node is fed a prepared chunk and nothing else | `tests/invariants/`, over workflows built from `workflows/src/` | 6 | Pending |
| Every model call carries a per-run ceiling, writes a ledger row, and never retries | `tests/invariants/workflows.test.ts`, over workflows built from `workflows/src/` | 6 | Unexercised |
| Exactly one schedule trigger exists, and `ar-dispatch` holds it | `tests/invariants/workflows.test.ts`, over workflows built from `workflows/src/` | 3 | Implemented |
| Building one tree twice writes byte-identical artifacts, and the git build stamp is the one value permitted to move with the checkout | `tests/build/build-workflows.test.ts`, spawning `scripts/build-workflows.ts` twice over a fixture source tree and holding the two output directories against each other | 3 | Implemented |
| A library spliced into a Code node stands alone there — no value import, declaration-form exports only, no reliance on module scope | `scripts/build-workflows.ts`, refusing the first two through `assertSpliceable` in `scripts/workflow-markers.ts` and writing no artifact at all; `pretest` runs the build ahead of the default suite, and the third rule leaves nothing to refuse it on | 3 | Implemented |
| Nothing is recorded as researched without an approval, and the database is what says so | A CHECK constraint in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 2 | Implemented |
| A category is a root or the child of a root, and nothing deeper | A trigger in the hand-written migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts`, with the opt-in `tests/live/schema.live.test.ts` watching a database refuse the write | 2 | Implemented |
| Every document carries a hash, and no two carry the same one | The NOT NULL and UNIQUE pair on `documents.hash` in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 2 | Implemented |
| No naming from the project this pipeline was ported from survives in tracked source | `tests/invariants/naming.test.ts` | 1 | Implemented |
| No vault path appears in tracked source | `tests/invariants/naming.test.ts` | 1 | Implemented |
| No real hostname appears in a tracked file | `tests/invariants/naming.test.ts` | 1 | Implemented |

## Reading the register

**Enforced by** names the artifact a violation surfaces in — the file
that goes red, not the rule in prose. **Owning phase** is the phase
accountable for the row: the one that lands the artifact, or, where the
artifact is already written, the one that lands what it judges.
**Status** is `Implemented` when the artifact exists, runs on an
ordinary `bun run test` today, and reads something the rule applies to;
`Unexercised` when it exists and runs over nothing the rule applies to;
and `Pending` when the row is still a reservation.

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
lands the rest of the spine next to the build system that produces the
artifacts those assertions read — before most of the behaviour they
guard exists — and each later phase adds its assertions to that same
suite.

Extending one suite rather than starting a parallel one is the same
argument the single test runner rests on: a suite that lives outside
what `bun run test` collects is a suite the gate does not run, and a
check nothing runs is indistinguishable from one that passes.

### A check with no subject runs, passes, and enforces nothing

A check the gate never collects is one kind of empty. There is a second,
and the suite reaches it on every run: a check that is collected, runs,
walks its whole input, and finds nothing the rule is about. Landing the
spine ahead of the behaviour it guards is what produces one — the guards
over model calls walk every built workflow, match no node, and pass, and
will until phase 6 delivers a workflow that makes a model call. That
pass says the built tree holds no counterexample, and it says exactly as
much over a tree with nothing to hold to the rule. Nothing in the run
parts the two.

Neither of the other readings reports that honestly. `Implemented` would
report the property as held, where what holds it is that nothing has
offered the check a subject. `Pending` would lose the half that is real:
the artifact exists and is collected, and **Owning phase** names the
phase that lands the subject rather than the phase that lands the check
— the reverse of a pending row, where one phase lands both.
`Unexercised` is the reading for exactly that, and a row carrying it
becomes `Implemented` when its subject arrives, with nothing about the
check moving for it.

The refusal that keeps the workflow rows honest does not reach this one.
Those assertions read built output through a reader that refuses an
empty tree, which is what stops an absence check passing over no
workflows at all, and what makes the green on the send-capable-node and
schedule-trigger rows a reading over a tree with nodes in it. No refusal
can do the same here: a built tree carrying no model node is what phase
3 delivers rather than a mistake to fail on. What stands behind an
unexercised row meanwhile is whatever a planted sample can reach — the
matcher that finds its subject, driven over planted types in
`tests/invariants/workflow-rosters.test.ts`, and the reads behind it,
driven over planted statements and bodies where they are driven at all.
None of that says anything about the two composed over a real node.

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

The schedule-trigger row is the only one of the four the register marks
`Implemented`, and what that means for it is a count and not a clock.
`tests/invariants/workflows.test.ts` holds the whole built tree to one
node of one named type, carried by `ar-dispatch`. The two limits on that
bound it from opposite sides: a workflow written with either of the
hidden types that type replaced holds a schedule the count never sees,
and a trigger left disabled is counted while it fires on nothing.
`tests/invariants/workflow-rosters.ts` is where the type is fixed and
each limit is argued beside the declaration it belongs to.

The other properties are spread across two rows, and the two do not read
alike. The ceiling, the ledger row and the retry setting are one row,
and `tests/invariants/workflows.test.ts` holds every built workflow to
all three today, so that row reads `Unexercised`: the assertions run on
every pass and no built workflow has offered them a model node yet. The
prepared-chunk row has nothing behind it and is still a reservation, so
it reads `Pending`. Both name phase 6, and the reading is what says
which kind of phase-6 work each is waiting on.

### Approval is a constraint, not a branch

The gate on research is a CHECK constraint in the schema: a row cannot
be recorded as researched unless it already carries its approval. The
constraint refuses the write itself, so the gate holds for every
writer — workflow, script, or API — and skipping it is not a code path
anybody has to review for.

A branch inside a workflow would be the weaker form of the same rule.
It can be edited by anyone who can open the executor's UI, that edit
leaves no diff to review, and it binds only the writer it sits in.
Until the service and its UI take approvals over, they are recorded
through a small CLI (phase 2) — which is a client of the constraint,
not a substitute for it.

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
