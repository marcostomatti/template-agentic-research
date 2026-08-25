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
 * The rows a floor raises: the proposal sits under the row's own
 * `min_interval_seconds`, so the answer is the floor.
 *
 * Both rows carry that one property and differ only in whether a
 * ceiling is filled in as well, which is not cosmetic. A row with a
 * floor and nothing above it is the only shape in this whole table
 * that the SQL twin can answer differently from
 * `clampIntervalSeconds`: stand the missing ceiling in with
 * `COALESCE(max_interval_seconds, interval_seconds)` and `LEAST`
 * caps the floored value straight back down to the proposal, so the
 * floor does nothing at all for exactly the rows that carry one and
 * no ceiling. Every other combination of bounds agrees under that
 * form too, which is why the live comparison rests on this row and
 * on no other.
 */
export const FLOORED_CLAMP_CASES: readonly ClampCase[] = [
  {
    id: 'floored-no-ceiling',
    standsFor: 'a floor with no ceiling, the row the SQL twin parts on',
    intervalSeconds: 60,
    bounds: { minIntervalSeconds: 900, maxIntervalSeconds: null },
    expected: 900,
  },
  {
    id: 'floored-under-a-ceiling',
    standsFor: 'a floor that bites with a ceiling well above it',
    intervalSeconds: 120,
    bounds: { minIntervalSeconds: 600, maxIntervalSeconds: 86_400 },
    expected: 600,
  },
];

/**
 * The rows a ceiling lowers: the proposal sits over the row's own
 * `max_interval_seconds`, so the answer is the ceiling.
 *
 * One of the two carries a floor as well, and it is what says the
 * answer is the CEILING rather than merely whichever bound the rule
 * reached first: a clamp answering with the first bound it found
 * would give 600 there, which is neither the proposal nor the
 * recorded answer.
 */
export const CAPPED_CLAMP_CASES: readonly ClampCase[] = [
  {
    id: 'capped-no-floor',
    standsFor: 'a ceiling with no floor, and a proposal well past it',
    intervalSeconds: 604_800,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: 86_400 },
    expected: 86_400,
  },
  {
    id: 'capped-over-a-floor',
    standsFor: 'a ceiling that bites with a floor well below it',
    intervalSeconds: 172_800,
    bounds: { minIntervalSeconds: 600, maxIntervalSeconds: 86_400 },
    expected: 86_400,
  },
];

/**
 * The rows carrying a bound with nothing to do: the proposal already
 * sits inside every bound the row declares, so the answer is the
 * proposal.
 *
 * A group of its own rather than a detail of the floored and capped
 * groups, because it is the whole of what parts "raised to the
 * floor" from "answered with the floor whenever the row carries
 * one". The second reading satisfies every row in the floored group
 * and is wrong for every row here, and the same holds for the
 * ceiling — so without these rows both of those claims stay green
 * for a rule that reads the bound columns and never compares them to
 * anything.
 *
 * Two rows sit exactly ON a bound rather than inside it, which is
 * where a strict comparison parts from a non-strict one.
 * `clampIntervalSeconds` is written with `Math.max` and `Math.min`,
 * so an equal bound is inert by construction and those two rows cost
 * the TypeScript side nothing. They are carried for the other two
 * readers, where the same rule is written out again and nothing
 * makes the two comparisons agree by construction.
 */
export const INERT_BOUND_CLAMP_CASES: readonly ClampCase[] = [
  {
    id: 'inert-above-the-floor',
    standsFor: 'a floor the proposal already clears',
    intervalSeconds: 3600,
    bounds: { minIntervalSeconds: 900, maxIntervalSeconds: null },
    expected: 3600,
  },
  {
    id: 'inert-under-the-ceiling',
    standsFor: 'a ceiling the proposal is already inside',
    intervalSeconds: 1800,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: 86_400 },
    expected: 1800,
  },
  {
    id: 'inert-between-both',
    standsFor: 'a proposal sitting between a floor and a ceiling',
    intervalSeconds: 7200,
    bounds: { minIntervalSeconds: 900, maxIntervalSeconds: 86_400 },
    expected: 7200,
  },
  {
    id: 'inert-on-the-floor',
    standsFor: 'a proposal sitting exactly on the floor',
    intervalSeconds: 900,
    bounds: { minIntervalSeconds: 900, maxIntervalSeconds: 86_400 },
    expected: 900,
  },
  {
    id: 'inert-on-the-ceiling',
    standsFor: 'a proposal sitting exactly on the ceiling',
    intervalSeconds: 86_400,
    bounds: { minIntervalSeconds: 600, maxIntervalSeconds: 86_400 },
    expected: 86_400,
  },
];

/**
 * The whole table, and what a reader driving every row takes.
 *
 * Composed from the groups rather than written out a second time, so
 * a row cannot end up in the table and outside the group that
 * describes it, or the other way round. The four groups split the
 * rows by what the bounds DO rather than by which columns are
 * filled: nothing to clamp against, a floor raising the proposal, a
 * ceiling lowering it, and a bound that never reaches it. The rows
 * whose two bounds CROSS are the shape none of the four describes,
 * and they arrive later in this plan.
 */
export const CLAMP_CASES: readonly ClampCase[] = [
  ...UNBOUNDED_CLAMP_CASES,
  ...FLOORED_CLAMP_CASES,
  ...CAPPED_CLAMP_CASES,
  ...INERT_BOUND_CLAMP_CASES,
];
