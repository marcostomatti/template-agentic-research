# Scheduling — one mechanism, and what claims a due row

The pipeline schedules by one mechanism. A row records how often it
should run and when it is next due, one workflow claims whatever has
come due, and that is the whole of it: no cron per table, no queue
carrying a due time of its own, and no timetable anywhere outside the
database. This document is the map of that mechanism — what makes a
row due, the four ways a due time gets set, and the shape of the query
that takes it.

It is the document the Scheduling row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to how a row
comes due, or to what the dispatcher does with one, lands here in the
same commit. The design it implements is
`.specs/2026-08-19-research-pipeline-port.md`, §3, and phase numbers
throughout refer to the 7-phase sequencing in that design, §7.

Two of the other documents hold halves of this and are worth reading
beside it. `docs/architecture/02-schema.md` carries the schedulable
column set and its indexes as storage — what a table taking part is
obliged to carry, and what the database will and will not refuse.
`docs/architecture/03-workflows.md` carries `ar-dispatch` as one of
the six workflows, and what holding the only clock costs that set.
What is here is the mechanism itself.

## One mechanism

Two tables take part: `topics`, one standing subject a domain wants
looked into, and `export_subscriptions`, one standing delivery it
wants rendered. A row in either carries five columns that say nothing
about the work and everything about the timing — `interval_seconds`,
`next_run_at`, `enabled`, and a `min_interval_seconds` and
`max_interval_seconds` pair — and one workflow reads them.

### A row carries its own cadence, and nothing else keeps a copy

`next_run_at` is the single scheduling truth. When a row runs next is
what that column says, and asking the question never means reconciling
two answers that can disagree. Nothing holds a second copy: no cron
expression naming a table, no queue row with a due time of its own,
nothing in a file or on an editor's canvas.

That is the rule `docs/architecture/00-overview.md` states for every
durable fact, and two of the three costs it names land straight on a
cadence. Two records of when something runs drift the moment either is
edited, and nothing afterwards says which one a given pass fired
against. A cadence only the executor knows is invisible to the API, to
an export and to an operator, so it can be neither reviewed nor
corrected. The third is this mechanism's own: with a second copy
anywhere, changing a cadence would stop being an edit and become
remembering both places.

### One workflow holds the only clock

`ar-dispatch` wakes on its own cron expression and claims what is due.
Nothing else in the pipeline is started by a timer; that count is an
invariant rather than a habit, and
`docs/architecture/01-invariants.md` carries the register row while
`docs/architecture/03-workflows.md` carries what the rule costs the
workflow set.

The tick rate is not a schedule. `AR_DISPATCH_CRON` in
`scripts/workflow-markers.ts` defaults to hourly, and what it decides
is how soon after a row comes due anything notices — which makes it
the floor on how precise every schedule in the system can be, a row
asking for five minutes getting whatever the tick grants. Why hourly
rather than more often is argued on the setting itself: a tick is not
free once the workflows the dispatcher invokes make paid model calls,
from phase 6.

### Making a new thing schedulable is an INSERT

The dispatcher does not know what a `topics` row is for. It reads the
five columns, projects a literal saying which kind of row it claimed,
and invokes the workflow that kind asks for — so a new standing
subject or a new delivery is a row, and a new KIND of schedulable
thing is a table growing the same five columns plus an entry in the
dispatcher's routing.

What that buys is a count that stays at one. The alternative arrives
as a second schedule trigger, and a trigger is acquired cheaply — one
expression, in one field, on one canvas — and then charged once per
tick for as long as nobody looks at it. A cadence in a row is an
UPDATE, takes its share of the cap a tick applies, and is visible to
everything that reads the schema; a cadence on a canvas is a workflow
edit, is bounded by nothing the dispatcher applies, and is lost on the
next import anyway, the instance being a deploy target and never a
source.

## The four modes a due time is set in

Every way a row's next run gets decided is a write to `next_run_at`,
and there are four of them. No flag says which is in force and no
column on the row records the choice: what the modes differ in is who
writes the time and how it was worked out, never in what is stored.

| Mode | The write | Performed by |
| --- | --- | --- |
| Strict periodic | The row's `interval_seconds` added to now, clamped by its bounds. | `ar-dispatch`, inside the claim. |
| Agent-driven | A gap the research agent proposes, clamped by the same bounds. | `ar-research`, phase 6. |
| Extraordinary run | `next_run_at = now()`, so the next tick claims the row whatever its interval says. | An operator, by UPDATE. |
| Pause for N cycles | `next_run_at` pushed out by N intervals. | An operator, by UPDATE. |

### Only one of the four is performed by anything here today

`workflows/src/ar-dispatch.json` is the only thing in this repository
that writes `next_run_at`, and what it writes is the periodic
increment. The agent path arrives with `ar-research` in phase 6. The
two operator modes are UPDATE statements against one column and there
is nothing to build for either: a mode nobody implemented already
works, because the mechanism reads one column and every writer of that
column is speaking the same language.

The seed does not write one either, and that is deliberate.
`data/topics.json` leaves `next_run_at` out, so a seeded topic is
configured and not yet due — what makes it due is a decision somebody
takes rather than a side effect of applying the bundle.

### Four modes leave three answers on a run

`runs.scheduled_by` records which mode set the time a pass fired
against, and `RUN_SCHEDULERS` in `src/db/schema/values.ts` holds three
members rather than four: `interval`, `agent` and `operator`. The two
operator modes collapse into one answer because the column is for
attribution, and an extraordinary run and a pause differ in the time
chosen rather than in who chose it.

Recording it at all is what makes an unexpected schedule attributable
afterwards, which is when the question gets asked. Every mode writes a
plain timestamp into one column and that column is overwritten on the
next pass, so by the time a row running far more often than anyone
intended is noticed, the only surviving copy of the decision is the
schedule being asked about rather than the choice that produced it.
`runs.scheduled_by` in `src/db/schema/runs.ts` argues that in full,
along with the limit that what is stored is a writer's account of
itself and nothing checks it against what happened.

### The bounds clamp an interval, so two of the four pass through them

`min_interval_seconds` and `max_interval_seconds` bound a GAP and not
a time, which is what decides where they apply. They were declared for
the agent mode, as `src/db/schema/scheduling.ts` says, and the
periodic increment goes through them as well — both are a number of
seconds, and each is clamped into the range before a timestamp is
worked out from it. An extraordinary run and a pause write a timestamp
directly, and nothing clamps either.

The clamp is expressed twice on purpose. `clampIntervalSeconds` in
`src/lib/schedule.ts` is the rule as TypeScript, for the agent path to
call. A `LEAST` over a `GREATEST` inside each claim statement is the
same rule as SQL, applied to the increment. What holds the two in step
is `tests/live/schedule-clamp.live.test.ts`, which drives one shared
case table through both against a real Postgres, and the lib is where
that arrangement is argued — including what nothing else in the
package is able to check.

What the bounds are not is an enforcement boundary. No CHECK relates
them to `interval_seconds` or to `next_run_at`, so a row whose stored
interval already sits outside its own bounds is storable, and a direct
UPDATE writing a time outside them is refused by nothing. Calling the
clamp is the whole of the enforcement, which is also why the periodic
path calls it rather than adding the interval as it stands: the number
it brings into range may be one nobody clamped on the way in.

## The claim

`ar-dispatch` claims with one statement per schedulable table, and the
two are the same statement against different tables. Each is a
data-modifying CTE in three parts: a locking SELECT that picks which
rows this pass takes, an UPDATE that moves their `next_run_at`
forward, and a RETURNING projection that hands them on. What holds a
statement to any of the properties here is
`tests/invariants/dispatch-sql.ts`, which reads each one off the node
it names.

### The predicate is enabled and due, and NULL falls out of it

`WHERE enabled AND next_run_at <= now()` is all that makes a row
eligible, and it excludes three states for three different reasons: a
row due in the future is not due yet, a disabled row is out of the
mechanism, and a row whose `next_run_at` is NULL is not scheduled at
all. The third needs no clause of its own. `NULL <= now()` is NULL, so
an unscheduled row is excluded by the comparison already there, and an
`IS NOT NULL` beside it would read as though NULL had to be excluded
by hand.

Keeping `enabled` in the predicate is also what matches the partial
index. `topics_dispatch_claim_idx` and
`export_subscriptions_dispatch_claim_idx` are each over (`enabled`,
`next_run_at`) and restricted to the rows that are enabled, and
Postgres uses a partial index only where the query's predicate implies
the index's — so the same claim with `enabled` dropped falls back to a
sequential scan with no error and no warning.

### The ordering picks which rows, and never the order they arrive in

`ORDER BY next_run_at` inside the CTE, with the cap as its `LIMIT`, is
what decides WHICH rows a bounded pass takes: the longest overdue
first, so a backlog drains in the order it accumulated. It decides
nothing about sequence afterwards. The outer UPDATE joins against the
CTE and `RETURNING` has no defined order at all, so what comes back is
unsorted and nothing downstream may read it as though it were.

The distinction is easy to lose because the obvious fixture hides it.
Rows inserted oldest-first come back in an order agreeing with the one
asked for, whichever order the statement in fact produced.

### The lock is what makes overlapping ticks safe

`FOR UPDATE SKIP LOCKED` is the part that lets a pass start while the
one before it is still working: it steps over the rows already locked
and takes different ones, rather than blocking until the lock clears
and then running work that has just been done.

Two things follow, and only one of them is about what the statement
reads. A row held by a transaction that never finishes is passed over
with no error, so from outside, skipped and not-yet-due look
identical. And the guarantee lasts exactly as long as the transaction
holding the lock, which is what puts the claim and the reschedule in
one statement rather than in two.

### The cap bounds a branch, and is applied again over the tick

`AR_DISPATCH_BATCH_CAP` reaches each claim as the `LIMIT` inside its
CTE and the merged claims as a call to `capBatch` in
`src/lib/schedule.ts`, and the two do not defend the same thing. A
`LIMIT` bounds one BRANCH, so a tick finding both tables backlogged
claims up to twice the cap; the second application is what decides
which of the claimed rows are dispatched.

What that second application drops has already been claimed, claiming
being what moves `next_run_at`, so a dropped row waits its whole
interval rather than being taken by the tick after this one. Which
rows those are is arbitrary among the rows claimed rather than the
least overdue among them: the stream is unsorted, and the merge in
front puts one branch's rows ahead of the other's.

The duplication is deliberate. A `LIMIT` reads as a paging knob to
whoever next tunes the query — adding a filter, changing the ordering,
folding in a join — and is one edit from being gone, where what it is
in fact is the only thing standing between one pass and the whole
backlog. `AR_DISPATCH_BATCH_CAP` in `scripts/workflow-markers.ts`
carries the rest of that argument, including which of the two survives
such an edit and what that leaves.

### A claim answers in one shape whichever table it read

Both statements project the same five columns: the claimed row's id,
its `domain_id`, a `unit_kind` literal, a label, and the `next_run_at`
this pass has just written. The export claim adds a sixth of its own,
`connector_id`.

The five are a cross-branch contract rather than the columns the two
tables happen to share. `topics` carries a name and
`export_subscriptions` carries none, so the export claim's label is
the format the row renders — a column it synthesizes in order to
answer in the shape at all. `unit_kind` is a literal because nothing
in a claimed row says which table it came from and the two id spaces
overlap: once the branches merge a claimed unit is a claimed unit, and
the literal is the only handle left to route on. `connector_id` rides
on one branch alone, so nothing past that merge may read one off an
arbitrary claimed unit.

`RETURNING` on an UPDATE reads the row as written, so the
`next_run_at` a claimed unit carries is the time this pass set rather
than the one that made it due.

## Claim and reschedule in one statement

The locking SELECT and the UPDATE that moves `next_run_at` forward are
two halves of one statement rather than two statements run in order.
Folding them is what makes a claim safe rather than merely orderly: a
single statement is atomic, so the transaction that takes a row's lock
is the same one that writes its new due time, and there is no instant
at which a row has been claimed and is still due.

The obligation is the schema's rather than this workflow's preference.
`schedulableColumns` in `src/db/schema/scheduling.ts` states it for
anything that reads the column set, and
`docs/architecture/02-schema.md` carries it beside the indexes the
claim runs against. Neither follows it through to what an early commit
then costs, or to what would report one.

### `SKIP LOCKED` is worth exactly the length of its transaction

A lock ends with the transaction holding it, so what `SKIP LOCKED`
buys overlapping ticks is true only inside that transaction. Commit
the claim before `next_run_at` moves and the row is unlocked and still
due in the same instant: the next pass to look finds it eligible,
exactly as though the first had never run.

Folding them is therefore not a second protection layered over the
lock. The lock's reach is the transaction and nothing more, so an
early commit does not weaken the guarantee, it ends it — and it ends
it in the one window the lock exists for. A pass starting while the
one before it is still working is the case `SKIP LOCKED` is written
for, and it is also the case in which a row left unlocked and due is
claimed a second time. That window is as wide as the gap between
taking a row and writing its next due time, which is why the failure
arrives under load rather than at rest.

### A row claimed and not rescheduled comes back on the next tick

What an early commit costs is a second dispatch of work already
dispatched, and then a third. The row is still due, so the following
tick claims it and the one after that claims it again — the
duplication is per tick rather than once, and it lasts as long as a
pass is still between its claim and its write when the next one
starts. Every claim is a whole pass: another `runs` row, another
invocation, and from phase 6 another set of paid model calls.

None of it is reported. No statement fails, no branch carries an error
and every tick finishes reporting success, a row that is due being
exactly what the claim exists to find. The record left behind cannot
say it happened either: `runs` carries a domain, an attribution and
the timings, so two rows an hour apart against one topic read
precisely as a topic on an hourly cadence reads.

`docs/architecture/01-invariants.md` names a schedule trigger acquired
by accident as what turns a single mistake into a recurring bill. An
early commit reaches the same recurrence with no second trigger
anywhere: what comes back every tick is the row itself. And it
surfaces the way that register says such a burn surfaces, from whoever
sends the invoice rather than from anything in the pipeline.

### One pass cannot tell the folded form from the split one

The counterfactual needs no fixture and is available at the SQL level:
run the shipped claim twice over one set of due rows. Folded, it takes
them on the first pass and returns nothing on the second. A claim that
only SELECTs hands back the same ids both times. Both claim statements
answer that way, and a single pass is identical under either form —
which is why lifting the UPDATE out reads as tidying, and why the
two-run pair rather than one run is the check.

### What reports the mistake is the reschedule's own roster entry

`tests/invariants/dispatch-sql.ts` holds each claim node to naming
both bound columns, and an entry names one node while each of these
nodes runs one statement. So a reschedule lifted into a node of its
own stops being carried by the claim's statement and that entry
reports — one entry per claim node, with that node's three claim
entries still satisfied, which is what the two reschedule entries buy
that no entry over a claim can.

What they do not reach is a reschedule that stayed in the statement
and is wrong, an entry reading words rather than the places they sit
in. That limit is argued where the entries are declared, and the clamp
they cannot check is what `tests/live/schedule-clamp.live.test.ts`
exists for.

### The fold decides when a row is rescheduled and not only where

Folding the write into the claim also fixes its timing: `next_run_at`
moves before anything is invoked, so a claimed row's next due time is
chosen before its outcome is known. Two consequences already recorded
share that one cause. A row the batch cap drops has been rescheduled
and waits its whole interval, and a dispatch that fails is not retried
either — `AR_TOPIC_WORKFLOW_ID` in `scripts/workflow-markers.ts`
argues the retry half where it describes the dispatcher's error
branch.

That is the trade rather than an oversight. Rescheduling on the
outcome would mean a transaction held open across the invocation, with
a claimed row locked for the length of somebody else's work, or a
second write to `next_run_at` after the fact. Neither is ruled out by
anything in this design. What is ruled out is the one arrangement that
writes the new due time outside the lock, and a re-dispatch is what
that one costs.
