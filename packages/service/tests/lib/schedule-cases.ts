/**
 * @packageDocumentation
 * The scheduling case tables. The clamp rows are one per pairing of
 * a proposed interval with the bounds a schedulable row carries, and
 * the answer `clampIntervalSeconds` owes for it. The pause rows put
 * a base instant and a cycle count on that same pairing, and record
 * the instant `pauseFrom` owes for the four together.
 *
 * A shared module rather than literals inside one suite, because the
 * rule the clamp rows describe is written twice on purpose — once as
 * TypeScript in `src/lib/schedule.ts`, and once as a SQL expression
 * inside `ar-dispatch`'s claim statement, which reschedules a row in
 * the same statement that claims it and so has no function to call.
 * Two expressions of one rule agree until the day they do not, and
 * driving both over the same rows is the only thing that would say
 * so. Two files read this table today: `tests/lib/schedule.test.ts`,
 * which drives the imported function and holds each answer against
 * the `expected` column, and `tests/build/schedule-splice.test.ts`,
 * which drives the copy a Code node runs — spliced by the shipped
 * build and constructed with `new Function` — and holds it against
 * the imported one row for row. The third is
 * `tests/live/schedule-clamp.live.test.ts`, which drives the SQL
 * against a real Postgres and holds what it applied against the
 * imported function, and it is the only one of the three that reads
 * an expression written separately from this one.
 *
 * The pause rows have ONE reader, and that is not the same gap left
 * open. `pauseFrom` has no twin to disagree with: the API works out
 * an absolute instant in TypeScript and stores it, where the
 * dispatcher's reschedule is an expression inside the statement that
 * claims the row, so there is no second expression of the pause for
 * a shared table to hold together. What those rows are here for is
 * the clamp they lean on — a pause row is a clamp row with a base
 * and a cycle count on it, and one file carrying both is what lets a
 * reader see that the pause delegates rather than re-deriving.
 *
 * `expected` is written out per row rather than computed, in both
 * tables. A computed one would be the function under test
 * reimplemented, and a case comparing the two would hold for
 * whatever either became.
 *
 * Every number here is an integer, which is a constraint rather than
 * a habit: `interval_seconds`, `min_interval_seconds` and
 * `max_interval_seconds` are `integer` columns in
 * `src/db/schema/scheduling.ts`, so a fractional row is one the SQL
 * reader could not be handed as those columns carry it.
 *
 * `cycles` is the exception, and it is an integer here for the other
 * reason: it is no column at all — it arrives in a request body —
 * and `pauseFrom` refuses every shape but a positive integer, so a
 * fractional one could only be a refusal. Those are declared in the
 * suite that drives them rather than in this table, which records an
 * answer per row and has none to record for a value turned away.
 *
 * Ids are the join key across the clamp table's three readers, and
 * across the pause table's one. A row is matched by
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
 * that a twin STANDING A MISSING BOUND IN can answer differently
 * from `clampIntervalSeconds`: stand the missing ceiling in with
 * `COALESCE(max_interval_seconds, interval_seconds)` and `LEAST`
 * caps the floored value straight back down to the proposal, so the
 * floor does nothing at all for exactly the rows that carry one and
 * no ceiling. Every other combination of bounds agrees under that
 * form too, which is why the live comparison's evidence for the null
 * handling rests on this row and on no other.
 *
 * Its evidence for the ORDER the two bounds are applied in is a
 * different group. A twin that clamped ceiling-first agrees with
 * `clampIntervalSeconds` on every row here and on every row of the
 * capped and inert groups, and parts from it only where the two
 * bounds cross — so that property is pinned by
 * {@link CROSSED_BOUND_CLAMP_CASES} and by nothing in this one.
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
 * The rows whose two bounds CROSS: a `min_interval_seconds` sitting
 * ABOVE the row's own `max_interval_seconds`, so no interval
 * satisfies both and the answer is the ceiling.
 *
 * Nothing refuses such a row on the way in — no CHECK relates the
 * two columns, so a seed file, a workflow node or a psql prompt can
 * write one — which is why the rule owes an answer for it rather
 * than a rejection. What settles that answer is an ORDER: the floor
 * is applied first and the ceiling second, and
 * `clampIntervalSeconds` states that as a contract rather than as a
 * consequence of reading one column before the other.
 *
 * A group of its own rather than an awkward member of the floored
 * and capped ones, because a crossed row sits under its floor and
 * over its ceiling at once and so answers to both of those
 * descriptions. The other four groups exclude it by construction —
 * each of their predicates carries the same bounds-agree clause —
 * so the five are a partition rather than five overlapping
 * questions.
 *
 * The three rows are the three places a proposal can sit against a
 * crossed pair: beneath both bounds, in the gap between the ceiling
 * and the floor, and past both. Every one of them answers the
 * ceiling under the stated order and the FLOOR under the reverse,
 * so the group parts the two orders three times over rather than
 * once, and no row's answer is its own proposal, so an identity
 * rule fails all three as well.
 *
 * These are also the only rows in the table that part a
 * ceiling-first twin from a floor-first one: every other
 * combination of bounds agrees under both orders. So this group is
 * the live comparison's evidence for the order the way
 * {@link FLOORED_CLAMP_CASES} is its evidence for the null
 * handling, and neither can stand in for the other.
 */
export const CROSSED_BOUND_CLAMP_CASES: readonly ClampCase[] = [
  {
    id: 'crossed-under-both',
    standsFor: 'crossed bounds with the proposal beneath both of them',
    intervalSeconds: 60,
    bounds: { minIntervalSeconds: 3600, maxIntervalSeconds: 900 },
    expected: 900,
  },
  {
    id: 'crossed-between-them',
    standsFor: 'crossed bounds with the proposal in the gap they leave',
    intervalSeconds: 7200,
    bounds: { minIntervalSeconds: 86_400, maxIntervalSeconds: 3600 },
    expected: 3600,
  },
  {
    id: 'crossed-over-both',
    standsFor: 'crossed bounds with the proposal past both of them',
    intervalSeconds: 604_800,
    bounds: { minIntervalSeconds: 172_800, maxIntervalSeconds: 86_400 },
    expected: 86_400,
  },
];

/**
 * The whole table, and what a reader driving every row takes.
 *
 * Composed from the groups rather than written out a second time, so
 * a row cannot end up in the table and outside the group that
 * describes it, or the other way round. The five groups split the
 * rows by what the bounds DO rather than by which columns are
 * filled: nothing to clamp against, a floor raising the proposal, a
 * ceiling lowering it, a bound that never reaches it, and two bounds
 * that cannot both be honoured.
 */
export const CLAMP_CASES: readonly ClampCase[] = [
  ...UNBOUNDED_CLAMP_CASES,
  ...FLOORED_CLAMP_CASES,
  ...CAPPED_CLAMP_CASES,
  ...INERT_BOUND_CLAMP_CASES,
  ...CROSSED_BOUND_CLAMP_CASES,
];

/**
 * One pause row: the instant a pause is measured from, how many
 * cycles were asked for, the row's own interval and bounds, and the
 * instant `pauseFrom` owes for the four of them together.
 *
 * `base` and `expected` are ISO-8601 text rather than `Date`
 * objects, and that is the argument the stores make when they copy
 * every `Date` on the way in and out: a `Date` is mutable, so a
 * shared table handing one out would let a reader that moved it
 * change what every other reader is judged against — silently, and
 * in whichever file happened to run first.
 */
export interface PauseCase {
  /**
   * Stable id, and what a reader of this table is matched by. Never
   * re-used and never re-pointed at a different row.
   */
  readonly id: string;

  /**
   * What the row stands for, so a failure names the property that
   * broke rather than a pair of instants.
   */
  readonly standsFor: string;

  /**
   * The instant the pause is measured from, as ISO-8601 text.
   *
   * The caller works this out and hands it in — it is the later of
   * the service clock and the row's stored `next_run_at` — so
   * nothing behind this column reads a clock of its own.
   */
  readonly base: string;

  /** How many clamped intervals past `base` the pause asks for. */
  readonly cycles: number;

  /**
   * The interval the row proposes, in seconds, before its own
   * bounds have been applied to it.
   */
  readonly intervalSeconds: number;

  /**
   * The row's own floor and ceiling, as its two bound columns carry
   * them. A null side is an absent one.
   */
  readonly bounds: IntervalBounds;

  /**
   * The instant `pauseFrom` owes for this row, as ISO-8601 text.
   */
  readonly expected: string;
}

/**
 * The pause rows carrying neither bound: the clamp has nothing to
 * say about their interval, so the cycle count is the whole of what
 * their answers turn on.
 *
 * A declared group rather than a filter written at the point of
 * use, for the reason {@link UNBOUNDED_CLAMP_CASES} is one: a case
 * can then ask whether the table has grown an unbounded row the
 * group never picked up.
 *
 * Both a single cycle and several are wanted, and the single one is
 * the weaker of the two on its own. A rule that added one interval
 * and ignored the count answers it correctly and answers every
 * other row here wrongly, so what the single cycle is carried for
 * is the boundary itself: it is one step from the zero the rule
 * turns away, and a group starting at three would say nothing about
 * where the refusal is keyed.
 *
 * The bases differ too, and two of the four sit on no round
 * boundary. A rule that took the day its base fell in and worked
 * forward from midnight answers those two wrongly and the other two
 * correctly.
 */
export const UNBOUNDED_PAUSE_CASES: readonly PauseCase[] = [
  {
    id: 'pause-one-cycle',
    standsFor: 'the shortest pause there is, one interval out',
    base: '2026-03-01T00:00:00.000Z',
    cycles: 1,
    intervalSeconds: 3600,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: '2026-03-01T01:00:00.000Z',
  },
  {
    id: 'pause-many-cycles',
    standsFor: 'three intervals out, where adding one interval parts',
    base: '2026-03-01T00:00:00.000Z',
    cycles: 3,
    intervalSeconds: 3600,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: '2026-03-01T03:00:00.000Z',
  },
  {
    id: 'pause-off-the-hour',
    standsFor: 'a base on no round boundary, carried through as it is',
    base: '2026-03-01T12:34:56.000Z',
    cycles: 2,
    intervalSeconds: 900,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: '2026-03-01T13:04:56.000Z',
  },
  {
    id: 'pause-across-the-week',
    standsFor: 'a week out, crossing every boundary beneath it',
    base: '2026-07-14T09:15:00.000Z',
    cycles: 7,
    intervalSeconds: 86_400,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: null },
    expected: '2026-07-21T09:15:00.000Z',
  },
];

/**
 * The pause rows a bound moves: the row's own floor or ceiling
 * changes the length of a cycle, and the answer is that clamped
 * length multiplied out.
 *
 * One row for each of the three bound shapes the clamp table parts
 * a wrong twin on — a floor with no ceiling, which is where
 * standing a missing bound in makes the floor do nothing, and two
 * bounds that cross, which is where applying the ceiling first
 * answers with the floor — plus the ceiling with no floor beside
 * them. Those rows are already driven against
 * `clampIntervalSeconds` next door, so what these add is the one
 * property that table cannot reach, having no cycle count in it:
 * WHICH of the two operations comes first.
 *
 * That is why every row here asks for more than one cycle. At a
 * single cycle a rule clamping the whole span answers the same
 * instant as one clamping the length, so a clamped row asking for
 * one would sit in this group fully green and say nothing at all.
 */
export const CLAMPED_PAUSE_CASES: readonly PauseCase[] = [
  {
    id: 'pause-floored-no-ceiling',
    standsFor: 'a floor with no ceiling, raising each of three cycles',
    base: '2026-03-01T00:00:00.000Z',
    cycles: 3,
    intervalSeconds: 60,
    bounds: { minIntervalSeconds: 900, maxIntervalSeconds: null },
    expected: '2026-03-01T00:45:00.000Z',
  },
  {
    id: 'pause-capped-no-floor',
    standsFor: 'a ceiling with no floor, lowering each of two cycles',
    base: '2026-03-01T00:00:00.000Z',
    cycles: 2,
    intervalSeconds: 604_800,
    bounds: { minIntervalSeconds: null, maxIntervalSeconds: 86_400 },
    expected: '2026-03-03T00:00:00.000Z',
  },
  {
    id: 'pause-crossed-bounds',
    standsFor: 'bounds that cross, taking the ceiling twice over',
    base: '2026-03-01T00:00:00.000Z',
    cycles: 2,
    intervalSeconds: 60,
    bounds: { minIntervalSeconds: 3600, maxIntervalSeconds: 900 },
    expected: '2026-03-01T00:30:00.000Z',
  },
];

/**
 * The whole pause table, and what a reader driving every row takes.
 *
 * Composed from the groups rather than written out a second time,
 * for the reason {@link CLAMP_CASES} is: a row cannot then end up
 * in the table and outside the group that describes it, or the
 * other way round. The two groups split the rows by whether the
 * clamp has anything to do — nothing to move the cycle length, or
 * a bound that moves it — which is the only axis of this table the
 * clamp beside it does not already cover.
 */
export const PAUSE_CASES: readonly PauseCase[] = [
  ...UNBOUNDED_PAUSE_CASES,
  ...CLAMPED_PAUSE_CASES,
];
