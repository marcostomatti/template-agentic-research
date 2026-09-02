# Scheduling — one mechanism, and what claims a due row

The pipeline schedules by one mechanism. A row records how often it
should run and when it is next due, one workflow claims whatever has
come due, and that is the whole of it: no cron per table, no queue
carrying a due time of its own, and no timetable anywhere outside the
database. This document is the map of that mechanism — what makes a
row due, the four ways a due time gets set, the shape of the query
that takes it, and the record a claimed row leaves behind.

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
| Agent-driven | A gap the research agent proposes, clamped by the same bounds. | `ar-research`, in the statement that closes its pass. |
| Extraordinary run | `next_run_at = now()`, so the next tick claims the row whatever its interval says. | An operator, through `POST /topics/:id/run-now` or `POST /exports/:id/run-now`, or by UPDATE. |
| Pause for N cycles | `next_run_at` pushed out by N intervals. | An operator, through `POST /topics/:id/pause`, or by UPDATE. |

### All four are performed by something here today

`workflows/src/ar-dispatch.json` writes the periodic increment, inside
the claim it takes, and `workflows/src/ar-research.json` writes the
agent proposal, in the statement that closes its own pass. The two
differ in which side of the boundary the clamp sits on rather than in
what lands on the column: the dispatcher clamps in SQL inside the
statement holding the row's lock, and the research pass puts its
proposed gap through `clampIntervalSeconds` in a node above the write,
a proposal being decided before any lock is taken. A pass that
proposes nothing writes no `topics` row at all, and the increment the
claim already made stands.

Both operator modes are now reachable over HTTP, on both schedulable
tables. `runTopicNow` and `pauseTopic` in `src/topics/service.ts` are
the extraordinary run and the pause for N cycles over `topics`, and
`runSubscriptionNow` in `src/subscriptions/service.ts` is the
extraordinary run over `export_subscriptions`; there is no pause verb
on that second table, which is why the pause row of the table above
names one route where the run-now row names two. Each writes
`next_run_at` through its own port's schedule method and writes
nothing else, and `src/topics/routes.ts` and
`src/subscriptions/routes.ts` answer them at the three paths the table
names. `docs/architecture/08-http-api.md` carries the rules they obey,
stated once for the two schedulable groups.

A hand-written UPDATE remains a fourth writer rather than a fallback,
and the table keeps naming it for that reason: nothing in the database
refuses one, so a row whose due time nobody can account for was set by
something, and the modes above are the vocabulary for saying which.

That the modes worked before anything implemented them is the
mechanism reporting rather than an accident: it reads one column, and
every writer of that column is speaking the same language. What those
verbs add is the decisions a bare UPDATE cannot take — a disabled row
refused, an unscheduled one refused, and the cycle length put through
the bounds.

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

### The bounds clamp an interval, so three of the four pass through it

`min_interval_seconds` and `max_interval_seconds` bound a GAP and not
a time, which is what decides where they apply. They were declared for
the agent mode, as `src/db/schema/scheduling.ts` says, and the
periodic increment goes through them as well — both are a number of
seconds, and each is clamped into the range before a timestamp is
worked out from it.

A pause is the third. It writes a timestamp directly, like the
extraordinary run beside it, but the timestamp is worked out from a
COUNT OF CYCLES: `pauseTopic` in `src/topics/service.ts` calls
`pauseFrom` in `src/lib/schedule.ts`, which puts the row's own
`interval_seconds` through `clampIntervalSeconds` and multiplies the
clamped result by the count. So the bounds apply to the length of one
cycle rather than to the whole span, which is the reading a row
carrying a floor depends on — a pause of three cycles on a topic
proposing a minute under a floor of fifteen is forty-five minutes out
and not three.

The extraordinary run is the one mode nothing clamps. It writes the
service clock's instant, and there is no gap in it to bound.

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

## The run a claimed unit opens

`ar-dispatch` opens a `runs` row for every unit it dispatches, and the
alternative it is written against is one row per tick. The statement
is the same INSERT under either, so nothing in it settles the question
and what parts the two is only where it draws its values from. The
reasons for taking the finer of them are the two columns the insert
supplies.

### The two columns the insert supplies are why the row is finer

`INSERT INTO runs (domain_id, scheduled_by)` is the whole of what the
dispatcher writes, and each of the two reads differently at the two
granularities.

`scheduled_by` is NOT NULL because attributing a fired schedule
afterwards is the whole of its job, and a tick claiming several due
rows at once would file every one of their schedules under a single
answer. `src/db/schema/runs.ts` records that limit on the column
itself, that an attribution is only ever as fine as a run, so what a
row per claimed unit buys is a run that is one claim.

`domain_id` is the other half, and there the coarser row has nowhere
to put the answer rather than a rounder version of it. `topics` and
`export_subscriptions` both declare their domain NOT NULL, so every
claimed unit carries a real one, while a tick spans every domain at
once and could write only NULL. On `runs` that NULL is not an empty
slot but a meaning of its own, that the pass was not scoped to a
domain, which is what a maintenance or a backfill pass legitimately
is. A tick-level dispatch row would be stored looking exactly like one
of those.

What the finer row does not buy is a truer answer. This workflow
writes the literal `interval` on every row it opens, and nothing in a
claimed row records which of the four modes set its `next_run_at` —
all four write that one column, and a stored timestamp does not say
who chose it. So `interval` names the mode this workflow reschedules
in, and a row an agent or an operator had scheduled is filed under it
just the same. The row count decides how finely the column is
attributed and never how accurately.

### Nothing in the statement holds the row count where it is

The granularity is a property of the graph. A Postgres node runs its
statement once per input item, and here that is the behaviour wanted
rather than the one to design around: every item reaching the
run-opening statement is a unit the cap kept, which makes the row
count the tick's dispatch count. Three things hold it there and none
of them is a clause — the per-unit stream the node is fed, and two it
does not carry, `executeOnce` and a read of the whole batch it was
handed in place of the item a run is standing on.

Only one of those two is watched.
`tests/invariants/dispatch-sql.test.ts` sweeps the workflow for a
statement or a value drawing on the whole batch a node was handed, so
that route reddens there; `executeOnce` is read by nothing in this
package, and setting it on that node leaves the suite green. The
roster in `tests/invariants/dispatch-sql.ts` is no second reader of
either. Its entries are phrases a statement has to carry, so what it
reports is a clause that went missing, and neither of these two edits
removes one: the statement is byte for byte the same under both.

What bounds the writing is the cap. `capBatch` runs in front of the
run-opening statement, so the rows this table gains on a tick are the
units the cap kept and never the rows the claims took.

### A tick that claims nothing leaves no row

A claim that took no rows still puts an item on its branch, the
executor's own placeholder for a statement that returned nothing, and
those placeholders are dropped before the run-opening statement is
reached. So a tick on which neither table had anything due opens no
row at all.

`runs` therefore records what the dispatcher dispatched and never that
it ran, and the two are the same absence: a dispatcher whose cron has
stopped firing and one firing on time into an empty backlog leave an
identical gap in this table. The one workflow holding the only clock
is what that gap is least able to report on. Counting rows says
nothing about a cadence either: the dispatcher's rows are its
dispatches rather than its ticks, and since phase 5 they are not the
only rows in the table — the section below on which workflow opened a
row carries that half.

What answers it is the executor's own execution list, which records a
run of the workflow whether or not the workflow wrote anything down.
That sits outside this database and outside this repository, and it is
the cost of the choice rather than an oversight: a row per tick would
have put liveness in `runs` and paid for it in both `domain_id` and
`scheduled_by`.

### No column on a run names the workflow that opened it

`INSERT INTO runs (domain_id, scheduled_by)` is the whole of what the
dispatcher supplies, and the six columns `src/db/schema/runs.ts` adds
to those two — a surrogate key, a start, a finish, a status, a tally
and a list of failures — say what a pass did and never who ran it. A
row read on its own cannot answer which workflow opened it.

The question was answerable by convention rather than by reading for
two phases. `ar-dispatch` was the only workflow that opened one, so
every row a workflow opened came out of the dispatcher's own insert,
and the answer belonged to the table instead of to the row. The scope
was workflows rather than the table: `src/db/schema/taxonomy.ts`
records that rows in this schema arrive from the seed script, from
hand-written SQL inside workflow nodes and from an operator at a psql
prompt, and it was the middle of those three the convention covered.

A reading this document made earlier rested on it. Counting `runs`
rows says nothing about a cadence because the row rate is the dispatch
rate — true of a table one workflow writes, and not of a shared one,
where the rate is the sum of every writer's and there is no column to
filter one writer out by. What the dispatcher can claim on its own is
narrower, and is about its own statement: the rows that statement
opens are the units its cap kept. That narrower reading is the one
that survives, and it is read off the node rather than off the table.

Nothing reported the change. The entries in
`tests/invariants/dispatch-sql.ts` each name a node of `ar-dispatch`,
so a second workflow's insert is outside what any of them reads, and
the sweeps in `tests/invariants/workflows.test.ts` key on node types
and on what a workflow holding a model node owes. The one place `runs`
appears in that suite is as the near-miss control that proves the
ledger rule does not fire on an insert against another table. So the
premise was a fact about the workflow set rather than a checked
property, and it stopped holding with no case failing.

Phase 5 is where it stopped, and it took the second convention rather
than the column. `ar-capture` and `ar-score` each insert a `runs` row
of their own, so the table had three writers where it had one, and no
migration in that phase added a column naming any of them. Phase 6
added the fourth, `ar-research`, which inserts a row for its own pass.
What tells them apart is partial, and the fourth writer made it weaker
rather than wider. `scheduled_by` no longer parts the dispatcher from
anything: it reads `interval` on every row the dispatcher opens,
`operator` on every row the capture and scoring pair writes, which is
`RUN_SCHEDULERS` having no member that is true of a pass no schedule
fired, and `agent` or `interval` on a research row according to
whether that pass's proposal moved a topic. So `interval` names two
writers now, and only the other two members name one apiece. The shape
of the write parts the dispatcher and nothing else — it opens a row
`running` and closes it from a second node, while the other three
insert one already closed, so their rows carry a start and a finish
from one transaction and read as instantaneous. Below that the naming
stops: `domain_id` says which domain a pass ran for and all four run
for the same ones, and `counts` and `errors` refuse nothing, so the
keys a writer puts in `counts` are one writer's habit rather than a
column a reader can query.

### A run opened against a target that is not there closes as failed

`Invoke Target Workflow` addresses `ar-ingest` for a claimed topic and
`ar-digest` for a claimed export subscription. Phase 5 delivered the
first, so a claimed topic now reaches a workflow that exists; the
second is phase 6's, and until it arrives the id resolves, nothing on
the instance answers to it, the claimed unit takes the node's error
output, and `Close Run Failed` writes its row as failed. One tick can
now record both outcomes side by side. Why a routed failure is the
right shape for the second is argued on `AR_TOPIC_WORKFLOW_ID` in
`scripts/workflow-markers.ts`, and on the workflow's own canvas for an
operator standing in front of it. What follows from two phases of it
is this document's.

The window does not compound, and what keeps it from compounding is
the fold. A claim writes the row's next due time before anything looks
at what it dispatched, so a unit whose target is missing has already
been rescheduled by the time the invocation is attempted: it is not
retried, and it is not still owed. A missing target therefore costs
one failed run per row per interval, and no more of them on a tick
than the cap kept — the same bound a working target would run under,
reached for the opposite reason.

For the length of the window the status column separates nothing.
Every row this workflow closes says the same thing, so `runs` is a
list of dispatches rather than a mix of outcomes, and what it still
answers is what the two columns the insert supplies were for: which
domain a pass ran for, and the mode its schedule is attributed to. The
failed branch appends an entry to `errors` naming the target it could
not reach, which is where a row says which of the two ids it was
about.

That is what makes a failed row worth keeping rather than filtering
out. Reaching `failed` is the mechanism having run once end to end —
the trigger fired, a claim took a row and moved its `next_run_at`, the
cap kept the unit, a run was opened carrying a real domain, an
invocation was attempted, the failure was routed rather than raised,
and the row was closed. Before any target exists a pass leaves nothing
else behind in this database, so a table of these rows is the closest
it comes to reporting that the parts fit together.

Both ways of stopping the failures without building a target are
watched, and what the branch writes once it gets there is not.
`tests/invariants/dispatch-sql.test.ts` holds `Invoke Target Workflow`
to the setting that appends a second output and holds
`Close Run Failed` to being what arrives on it, so dropping that
setting or wiring the error output nowhere reddens there — measured,
the setting dropped moves the routing case and the sweep that flags
the other continuing value. No entry in
`tests/invariants/dispatch-sql.ts` names the closing node and the
routing case reads only that it runs a statement, so the same branch
closing its run as `ok` leaves both built-tree suites green —
measured, with no case moving at all. The route is checked and the
record on it is convention.

When a target does land, `failed` starts meaning that a workflow ran
and its work failed, rather than that no workflow was there, with
nothing in this repository edited and nothing in a row to mark the
change. The `errors` entry is what carries the difference, naming the
target as it stood. And the absence that replaces this one is the
opposite shape: a target returning no items puts nothing on the
success output at all, so its run keeps the `running` status it was
opened with, which is the limit `Close Run Succeeded` records against
the phase that makes it real.
