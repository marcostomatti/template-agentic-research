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
     */
    minIntervalSeconds: integer('min_interval_seconds'),

    /**
     * The longest interval this row may go between runs, in seconds.
     * NULL means it has no ceiling of its own.
     */
    maxIntervalSeconds: integer('max_interval_seconds'),
  };
}
