# Invariants — the register

An invariant here is a property of the pipeline as a whole rather than
of any one file: something that has to hold across every workflow, every
model call, or every tracked file at once. This document is the register
of them — what each one is, the artifact that fails when it stops being
true, the phase that lands that artifact, and whether it is enforced
today.

The design the register comes from is
`.specs/2026-08-19-research-pipeline-port.md`. Its §5 fixes the set
below, with the hostname row carried from the migration-hygiene rules
in §6, the category-depth row from the schema-v2 table roster in §2,
and the hash-dedupe row from the locked core vocabulary in §1, all
registered here alongside the rest; phase numbers throughout refer to
the 7-phase sequencing in that design, §7.

## The register

| Invariant | Enforced by | Owning phase | Status |
| --- | --- | --- | --- |
| No workflow holds a send-capable node | `tests/invariants/`, over workflows built from `workflows/src/` | 3 | Pending |
| A model node is fed a prepared chunk and nothing else | `tests/invariants/`, over workflows built from `workflows/src/` | 6 | Pending |
| Every model call carries a per-run ceiling, writes a ledger row, and never retries | `tests/invariants/`, over workflows built from `workflows/src/` | 6 | Pending |
| Exactly one schedule trigger exists, and `ar-dispatch` holds it | `tests/invariants/`, over workflows built from `workflows/src/` | 3 | Pending |
| Nothing is recorded as researched without an approval, and the database is what says so | A CHECK constraint in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 2 | Implemented |
| A category is a root or the child of a root, and nothing deeper | A trigger in the hand-written migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts`, with the opt-in `tests/live/schema.live.test.ts` watching a database refuse the write | 2 | Implemented |
| Every document carries a hash, and no two carry the same one | The NOT NULL and UNIQUE pair on `documents.hash` in the generated migration under `drizzle/`, read by `tests/invariants/schema-sql.test.ts` | 2 | Implemented |
| No naming from the project this pipeline was ported from survives in tracked source | `tests/invariants/naming.test.ts` | 1 | Implemented |
| No vault path appears in tracked source | `tests/invariants/naming.test.ts` | 1 | Implemented |
| No real hostname appears in a tracked file | `tests/invariants/naming.test.ts` | 1 | Implemented |

## Reading the register

**Enforced by** names the artifact a violation surfaces in — the file
that goes red, not the rule in prose. **Owning phase** is the phase that
lands that artifact. **Status** is `Implemented` when the artifact
exists and runs in the default suite today, and `Pending` when the row
is still a reservation.

### A row is written before the artifact that enforces it

Several of the rows are pending, and the register is written that way on
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
argument the single test runner rests on: a check that lives outside
what `bun run test` collects is a check the gate does not run, and a
check nothing runs is indistinguishable from one that passes.

## Why each row is here

### The executor cannot send

Workflows write to the database, renderers return artifacts, and an
email export produces a draft and stops there. Reaching outward is a
service-layer capability that arrives later, behind its own approval
gate, so nothing in the executor needs the ability at all.

The node-type scan is what keeps it that way. A send-capable node
added to any workflow — deliberately, or carried in by a copied
template — fails the suite before the workflow reaches an instance.
The payoff is a review surface small enough to audit: one gate to read
rather than every workflow, and a pipeline bug that stays a pipeline
bug instead of becoming a delivery one.

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
