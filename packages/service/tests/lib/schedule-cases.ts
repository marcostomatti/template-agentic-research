/**
 * @packageDocumentation
 * The clamp case table: one row per pairing of a proposed interval
 * with the bounds a schedulable row carries, and the answer
 * `clampIntervalSeconds` owes for it.
 *
 * A shared module rather than literals inside one suite, because the
 * rule these rows describe is written twice on purpose — once as
 * TypeScript in `src/lib/schedule.ts`, and once as a SQL expression
 * inside `ar-dispatch`'s claim statement, which reschedules a row in
 * the same statement that claims it and so has no function to call.
 * Two expressions of one rule agree until the day they do not, and
 * driving both over the same rows is the only thing that would say
 * so. `tests/lib/schedule.test.ts` reads this table today. The other
 * two readers arrive later in this plan:
 * `tests/build/schedule-splice.test.ts`, which drives the spliced
 * copy a Code node runs, and
 * `tests/live/schedule-clamp.live.test.ts`, which drives the SQL
 * against a real Postgres.
 *
 * `expected` is written out per row rather than computed. A computed
 * one would be `clampIntervalSeconds` reimplemented, and a case
 * comparing the two would hold for whatever either became.
 *
 * Every number here is an integer, which is a constraint rather than
 * a habit: `interval_seconds`, `min_interval_seconds` and
 * `max_interval_seconds` are `integer` columns in
 * `src/db/schema/scheduling.ts`, so a fractional row is one the SQL
 * reader could not be handed as those columns carry it.
 *
 * Ids are the join key across the three readers. A row is matched by
 * id rather than by position, so appending to this table cannot
 * quietly re-point a claim in a file that never sees the row itself.
 */
import type { IntervalBounds } from '../../src/lib/schedule.js';

/**
 * One row: a proposal, the bounds it is judged against, and the
 * answer the rule owes for the pair.
 */
export interface ClampCase {
  /**
   * Stable id, and what a reader of this table is matched by. Never
   * re-used and never re-pointed at a different row.
   */
  readonly id: string;

  /**
   * What the row stands for, so a failure names the property that
   * broke rather than a pair of numbers.
   */
  readonly standsFor: string;

  /**
   * The interval being proposed, in seconds — what a writer wants
   * the gap between this row's runs to become.
   */
  readonly intervalSeconds: number;

  /**
   * The row's own floor and ceiling, as its two bound columns carry
   * them. A null side is an absent one.
   */
  readonly bounds: IntervalBounds;

  /**
   * The answer `clampIntervalSeconds` owes for this row, and the
   * answer the SQL expression owes for it too.
   */
  readonly expected: number;
}

/**
 * The rows carrying neither bound: nothing to clamp them against, so
 * the answer is the proposal.
 *
 * A declared group rather than a filter written at the point of use,
 * so what the group stands for is said once and a case can ask
 * whether the table has grown an unbounded row the group never
 * picked up.
 *
 * The proposals are deliberately not all sensible intervals. A zero,
 * a negative and the largest value the column holds are what make
 * "nothing here refuses a proposal" a claim rather than a reading of
 * three ordinary numbers: each is an input a rule that validated
 * instead of clamping would plausibly turn away, and the clamp is
 * reached from the agent path, where the number was proposed rather
 * than typed by anyone.
 */
export const UNBOUNDED_CLAMP_CASES: readonly ClampCase[] = [
  {
    id: 'unbounded-hourly',
    standsFor: 'the ordinary reschedule, with nothing to clamp it',
    intervalSeconds: 3600,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: 3600,
  },
  {
    id: 'unbounded-zero',
    standsFor: 'a proposal of no gap at all, answered not refused',
    intervalSeconds: 0,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: 0,
  },
  {
    id: 'unbounded-negative',
    standsFor: 'a proposal that would put the next run in the past',
    intervalSeconds: -60,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: -60,
  },
  {
    id: 'unbounded-column-max',
    standsFor: 'the longest gap the integer column can hold',
    intervalSeconds: 2_147_483_647,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: 2_147_483_647,
  },
];

/**
 * The whole table, and what a reader driving every row takes.
 *
 * Composed from the groups rather than written out a second time, so
 * a row cannot end up in the table and outside the group that
 * describes it, or the other way round. The unbounded rows are the
 * only group so far; the rows carrying a floor, a ceiling and two
 * bounds that cross arrive later in this plan.
 */
export const CLAMP_CASES: readonly ClampCase[] = [...UNBOUNDED_CLAMP_CASES];
