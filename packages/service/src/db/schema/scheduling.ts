/**
 * @packageDocumentation
 * Scheduling — the column set that makes a row due, and the tables
 * that carry it.
 *
 * The pipeline schedules by one mechanism rather than one per table:
 * a row records how often it should run and when it is next due, and
 * a single dispatcher claims whatever has come due. What that
 * dispatcher reads is {@link schedulableColumns}, declared once here
 * and spread into every table taking part, so a schedulable table
 * carries the whole set or none of it. Half of it is worse than
 * neither — a row with an interval and no due time repeats on a
 * schedule nothing ever claims.
 */
import { boolean, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * The columns a schedulable row carries, for spreading into a
 * `pgTable` definition beside that table's own columns.
 *
 * A function rather than a shared object because drizzle's column
 * builders are per-table: each table a column set is spread into
 * needs builders of its own, and handing two tables the same
 * instances shares state between them.
 *
 * One dispatcher reads these columns. `ar-dispatch`, arriving in
 * phase 3, holds the only schedule trigger in the system: it wakes on
 * its own cron, takes the rows that are enabled and whose
 * `next_run_at` has passed with `FOR UPDATE SKIP LOCKED`, caps how
 * many it takes in one pass, and runs what it claimed. No table keeps
 * a timetable of its own and no other workflow is woken by a clock,
 * so making a new thing schedulable is an INSERT rather than another
 * trigger — and a trigger acquired by accident is what turns a single
 * mistake into a recurring one.
 *
 * `SKIP LOCKED` is the part that makes overlapping passes safe. A
 * tick starting while the previous one is still working steps over
 * the rows already locked and claims different ones, rather than
 * blocking until the lock clears and then running work that has just
 * been done. Two honest limits come with it. The guarantee lasts
 * exactly as long as the transaction holding the lock, so the claim
 * and the write that moves `next_run_at` forward belong in the same
 * transaction — commit the claim early and the row is unlocked and
 * still due, which is an invitation for the next tick to run it
 * again. And a row held by a transaction that never finishes is
 * passed over with no error: skipped and not-yet-due look identical
 * from outside.
 *
 * @returns Fresh builders for the schedulable column set.
 */
export function schedulableColumns() {
  return {
    /**
     * How long to wait between runs of this row, in seconds.
     *
     * Seconds in the name rather than a bare `interval` because
     * `interval` is a type name in Postgres, and the queries reading
     * this column are hand-written SQL where quoting an identifier is
     * easy to forget.
     *
     * NOT NULL: a row that takes part in scheduling and says nothing
     * about how often is a row the dispatcher cannot reschedule after
     * running it.
     */
    intervalSeconds: integer('interval_seconds').notNull(),

    /**
     * When this row is next due to run.
     *
     * NULL means it is not scheduled: nothing claims it, whatever its
     * interval says, until something writes a time here.
     *
     * The single scheduling truth. Every way a row can be scheduled
     * is a write to this one column and nothing else: strict periodic
     * is the dispatcher adding the interval after a run, an
     * extraordinary run is `now()`, a pause for N cycles is N
     * intervals pushed out, and an agent-chosen time is whatever it
     * proposed once the bounds below have clamped it. Nothing holds a
     * second copy — no cron per table, no queue carrying its own due
     * time — so asking when a row runs next never means reconciling
     * two answers that can disagree, and changing it never means
     * remembering to write both.
     *
     * The dispatcher writes `now() + interval_seconds` after a run
     * unless the run already set a time here, which is what lets any
     * of those modes override the default without a flag declaring
     * which mode is in force. Which writer chose a time is recorded
     * on the run rather than read back out of this column: all of
     * them can produce the same timestamp, so a schedule that changed
     * unexpectedly is only attributable if the choosing was logged
     * when it happened.
     */
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),

    /**
     * Whether this row takes part in scheduling at all.
     *
     * Defaults to true because a schedulable row exists in order to
     * be run. A row that has to be switched on after it is inserted
     * is a schedule somebody configured and the pipeline then quietly
     * ignored.
     */
    enabled: boolean('enabled').default(true)
      .notNull(),

    /**
     * The shortest interval this row may be run at, in seconds. NULL
     * means it has no floor of its own.
     *
     * This column and the one below exist for the agent-driven mode.
     * Where an agent proposes when a row should next be looked at,
     * the gap it proposes is clamped into the range these two give
     * before the resulting time is written to `next_run_at`, so a
     * judgement call still lands inside limits a person set. The
     * floor is what keeps a proposal meaning "look again shortly"
     * from becoming a row that runs every few seconds — the cost of
     * getting that wrong is paid once per tick, for as long as
     * nobody notices.
     *
     * The clamp is applied by the writer, not by the database. No
     * CHECK relates these two columns to each other or to
     * `next_run_at`, so a direct UPDATE can still write a time
     * outside them and nothing refuses it. They bound what the agent
     * path proposes; they are not an enforcement boundary.
     */
    minIntervalSeconds: integer('min_interval_seconds'),

    /**
     * The longest interval this row may go between runs, in seconds.
     * NULL means it has no ceiling of its own.
     *
     * The ceiling half of the clamp described on
     * `min_interval_seconds` above, bounding a proposal in the other
     * direction so an agent that keeps deferring a row cannot defer
     * it out of sight. NULL means precisely that: nothing limits how
     * far out a proposal may push this row.
     */
    maxIntervalSeconds: integer('max_interval_seconds'),
  };
}
