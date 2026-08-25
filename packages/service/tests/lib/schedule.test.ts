/**
 * The scheduling arithmetic `ar-dispatch` applies to a row it has
 * claimed: the clamp, driven over the case table beside this file,
 * and the batch cap, driven over two rosters declared inside it.
 *
 * What is covered is `clampIntervalSeconds` over a row that carries
 * no bounds at all — nothing is refused, and what comes back is what
 * was handed in — over a row where one of the two bounds has
 * something to say, and over a row whose two bounds CROSS, where
 * neither can be honoured without breaking the other.
 * `src/lib/schedule.ts` states the first pair in one breath, and the
 * rest as a contract rather than a consequence: the floor is applied
 * first and the ceiling second, and a bound the proposal does not
 * reach leaves it alone. `capBatch` is the file's second subject,
 * and both halves of it are covered: a cap that is not a positive
 * integer is turned away rather than handed on to `slice`, and a
 * cap it takes bounds the batch that comes back — the whole of
 * that batch where it fits under the cap, and exactly `cap` items
 * off the front of it where it does not.
 *
 * The unbounded section carries a limit, and it belongs in front of
 * its cases rather than behind them: both of its claims hold for a
 * function that returns its first argument and does nothing else. An
 * identity claim cannot say otherwise, and no guard supplies what it
 * is missing. What parts the two is a row with a bound on it, which
 * is what the bounded sections are — so the file as a whole now says
 * something about the clamp, while that section on its own still
 * says only that the unbounded path is total.
 *
 * The bounded sections carry a matching limit, and it is why the
 * rows neither bound moves are a claim here rather than a detail of
 * the fixture: "raised to the floor" is satisfied in full by a rule
 * that answers with the floor whenever the row carries one, and the
 * only thing that parts the two is a row whose floor the proposal
 * already clears.
 *
 * The crossed sections carry a limit of the same shape, and it is
 * what makes this file worth reading whole rather than section by
 * section: "the answer is the ceiling" is satisfied in full by a
 * rule that answers with the LOWER of a row's two bounds, which is
 * the ceiling exactly when they cross. What refutes that rule is
 * the capped group, where the ceiling sits above the floor and
 * still wins, and the inert rows carrying both bounds with it —
 * measured, and the crossed claim stays green for it. So the
 * crossed sections pin WHICH bound answers a contradictory row,
 * and the sections before them are what make that an ordering
 * rather than a preference for the smaller number.
 *
 * The cap refusal section carries a limit of that shape one more
 * time, and its is the starkest of the four: every claim in it is
 * satisfied in full by a function that refuses whatever it is
 * handed. Nothing a roster of refusals can say parts those two, so
 * that section closes on a guard instead — one cap the rule must
 * take, a single step from the zero it turns away. The section
 * after it is what stops that guard being the whole of the
 * evidence: every claim there is over a cap the rule took and a
 * batch it came back with, so a rule refusing everything reddens
 * the lot of them rather than one line.
 *
 * That last section carries a limit of its own, and it is not the
 * shape of the four above: nothing in it is satisfied by a
 * degenerate rule, since a cap that never bit, one that took the
 * back of the batch and one that handed the caller its own list
 * are each reported by a case of their own. What it does not
 * reach is a second batch. Every call there is made with the same
 * four claims and only the cap moves, so a rule keyed to that one
 * length would answer all of it — and nothing later in this plan
 * varies the batch, since the readers arriving for the clamp
 * table drive rows rather than lists.
 *
 * The clamp rows are imported rather than written here because the
 * same ones drive the SQL expression the dispatcher carries and the
 * spliced copy a Code node runs. That makes the table a second thing
 * worth guarding: a claim written as a walk over a roster passes
 * when the roster is empty, and every claim here is such a walk.
 * Both cap rosters are declared in this file instead, since nothing
 * else reads them and so they have nowhere to drift to — but each is
 * walked the same way, and each carries a guard of its own for the
 * same reason.
 */
import type { ClampCase } from './schedule-cases.js';

import { describe, expect, it } from 'vitest';

import { capBatch, clampIntervalSeconds } from '../../src/lib/schedule.js';

import {
  CAPPED_CLAMP_CASES,
  CLAMP_CASES,
  CROSSED_BOUND_CLAMP_CASES,
  FLOORED_CLAMP_CASES,
  INERT_BOUND_CLAMP_CASES,
  UNBOUNDED_CLAMP_CASES,
} from './schedule-cases.js';

// ---------------------------------------------------------------------------
// Reading the table
// ---------------------------------------------------------------------------

/** Sorted copy, so an equality is over ids rather than over order. */
function sorted(ids: readonly string[]): readonly string[] {
  return [...ids].sort();
}

/** Whether a case's row carries neither a floor nor a ceiling. */
function carriesNoBounds(testCase: ClampCase): boolean {
  return testCase.bounds.minIntervalSeconds === null
    && testCase.bounds.maxIntervalSeconds === null;
}

/**
 * Whether a case's two bounds can both be honoured at once: a floor
 * at or under its ceiling, or one of the two absent.
 *
 * Each of the three bounded predicates carries this clause, and it
 * is what keeps them a partition rather than three overlapping
 * questions. Bounds that CROSS put the proposal under the floor and
 * over the ceiling at the same time, so a row carrying them would
 * answer to two predicates and break both membership guards.
 * {@link hasCrossedBounds} is this same clause negated, which is
 * what makes the five groups a partition by construction: the four
 * that agree are silent about a crossed row because they all ask
 * this, and the fifth takes exactly what they leave.
 */
function boundsAgree(testCase: ClampCase): boolean {
  const { minIntervalSeconds: floor, maxIntervalSeconds: ceiling } = testCase.bounds;

  return floor === null || ceiling === null || floor <= ceiling;
}

/**
 * Whether a case's two bounds contradict each other: a floor above
 * the row's own ceiling, so no interval satisfies both.
 *
 * The negation of {@link boundsAgree} and nothing more. Written as
 * a comparison of its own it would be a second reading of the same
 * rule, free to drift from the four predicates that exclude these
 * rows — and the drift would surface as a row belonging to two
 * groups or to none, which is the failure the membership guards are
 * there to catch rather than to cause.
 */
function hasCrossedBounds(testCase: ClampCase): boolean {
  return !boundsAgree(testCase);
}

/**
 * The three places a proposal can sit against a pair of crossed
 * bounds, and what the crossed rows are chosen to cover.
 *
 * A declared roster so a guard can assert set equality against it:
 * a count alone would pass for three rows all sitting in one place,
 * and that is the shape that exercises one comparison three times
 * while reading as a full group.
 */
const CROSSED_PROPOSAL_POSITIONS = ['under both', 'between them', 'over both'] as const;

/**
 * Which of {@link CROSSED_PROPOSAL_POSITIONS} a case's proposal
 * occupies, or a fourth answer for a row whose bounds do not cross
 * at all.
 *
 * Total over every row rather than narrowed to the crossed group,
 * so a row that reached the group without the property names its
 * own shape in the failure instead of being read as a duplicate of
 * whichever place it happened to resemble. The two null tests
 * repeat {@link boundsAgree}'s clause because narrowing does not
 * survive a call, and they are what let this function's own
 * comparisons read two numbers rather than two nullable ones.
 */
function proposalPosition(testCase: ClampCase): string {
  const { minIntervalSeconds: floor, maxIntervalSeconds: ceiling } = testCase.bounds;

  if (floor === null || ceiling === null || floor <= ceiling) {
    return 'bounds do not cross';
  }

  if (testCase.intervalSeconds < ceiling) {
    return 'under both';
  }

  return testCase.intervalSeconds > floor
    ? 'over both'
    : 'between them';
}

/** Whether a case's proposal sits under a floor its row declares. */
function isRaisedToTheFloor(testCase: ClampCase): boolean {
  const floor = testCase.bounds.minIntervalSeconds;

  return boundsAgree(testCase) && floor !== null && testCase.intervalSeconds < floor;
}

/** Whether a case's proposal sits over a ceiling its row declares. */
function isLoweredToTheCeiling(testCase: ClampCase): boolean {
  const ceiling = testCase.bounds.maxIntervalSeconds;

  return boundsAgree(testCase) && ceiling !== null && testCase.intervalSeconds > ceiling;
}

/**
 * Whether a case's row declares a bound and the proposal already
 * sits inside every one it declares.
 *
 * Written as what the other two leave over rather than as a
 * comparison of its own, so the three cannot come to overlap or to
 * leave a gap between them however the rows are edited.
 */
function isInsideItsBounds(testCase: ClampCase): boolean {
  return boundsAgree(testCase)
    && !carriesNoBounds(testCase)
    && !isRaisedToTheFloor(testCase)
    && !isLoweredToTheCeiling(testCase);
}

/**
 * Whether the rule turns a case's proposal away rather than
 * answering it.
 *
 * A predicate rather than a helper that rethrows, so a claim can
 * filter the whole roster and name every case that was refused. A
 * throwing helper cannot be called from inside a filter, and a claim
 * built on one stops at the first offender.
 */
function isRefused(testCase: ClampCase): boolean {
  try {
    clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds);

    return false;
  } catch {
    return true;
  }
}

/**
 * One number per case, keyed by id, so a comparison is a single
 * expression over two whole maps.
 *
 * A map rather than an expectation per row: comparing the maps fails
 * on a missing key as well as on a wrong number, and prints the
 * pair. What it cannot do is fail for holding no keys at all, which
 * is what the roster guards are for.
 *
 * The reader may answer `null`, which is what lets a claim be
 * compared against a bound column as the row carries it. A floored
 * row whose floor turned out to be null then puts a number beside a
 * `null` and reddens, where a numeric sentinel standing in for the
 * absent bound would have to be a value no answer could take — and
 * the table carries the whole range the column holds, so there is
 * no such value to pick.
 */
function byId(
  cases: readonly ClampCase[],
  read: (testCase: ClampCase) => number | null,
): Record<string, number | null> {
  return Object.fromEntries(cases.map((testCase) => [testCase.id, read(testCase)]));
}

/**
 * The three groups whose bounds AGREE, by name, so a guard asking
 * one question of all of them is a single expression rather than
 * three copies of it that can drift apart.
 *
 * The crossed group carries bounds too and is deliberately not here:
 * every claim these three stand behind is about a bound the rule can
 * honour, and a row where it cannot honour both is a different
 * question, with sections of its own after the three these serve.
 */
const BOUNDED_GROUPS: Readonly<Record<string, readonly ClampCase[]>> = {
  floored: FLOORED_CLAMP_CASES,
  capped: CAPPED_CLAMP_CASES,
  inert: INERT_BOUND_CLAMP_CASES,
};

/**
 * Every row carrying bounds that agree, derived from the roster
 * rather than listed a second time, so a group reaching one of the
 * two and not the other is not a thing that can happen.
 */
const BOUNDED_CLAMP_CASES: readonly ClampCase[] = Object.values(BOUNDED_GROUPS).flat();

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

describe('clamp case table — the rows carrying no bounds', () => {
  // What stands behind both claims in the unbounded section. Each
  // is a walk over this roster compared as a single map, and a walk
  // over no rows compares an empty map against an empty map and
  // passes. The
  // distinctness half is the same vacuity one step along: a roster
  // whose rows all propose one number turns "unchanged" into a
  // single datum asserted several times over.
  it('holds more than one row, each proposing a different interval', () => {
    const proposed = UNBOUNDED_CLAMP_CASES.map((testCase) => testCase.intervalSeconds);

    expect(proposed.length).toBeGreaterThan(1);
    expect(new Set(proposed).size).toBe(proposed.length);
  });

  // The group is a declaration, so it can disagree with the table it
  // is drawn from in either direction and both are silent. A bounded
  // row dropped in here would be judged by claims written for rows
  // with nothing to clamp them; an unbounded row appended to the
  // table and not to the group is a row this file never reaches,
  // which is the half that grows likelier as the table does.
  it('is exactly the rows in the table that carry neither bound', () => {
    const declared = UNBOUNDED_CLAMP_CASES.map((testCase) => testCase.id);
    const unbounded = CLAMP_CASES.filter(carriesNoBounds).map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(unbounded));
  });

  // Not a restatement of the claim it stands behind. That claim
  // asserts identity against the proposal directly, while the files
  // driving the SQL twin and the spliced copy read `expected` and
  // never see the proposal — so this is what says the column those
  // two are judged by carries the same property this file proves the
  // function has.
  it('records the proposal itself as the answer for every one', () => {
    expect(byId(UNBOUNDED_CLAMP_CASES, (testCase) => testCase.expected))
      .toEqual(byId(UNBOUNDED_CLAMP_CASES, (testCase) => testCase.intervalSeconds));
  });
});

// ---------------------------------------------------------------------------
// A row with nothing to clamp it
// ---------------------------------------------------------------------------

describe('clampIntervalSeconds — a row carrying neither bound', () => {
  // Filtered rather than asserted per row, so a failure names every
  // proposal that was turned away instead of stopping at the first.
  // The roster carries a zero, a negative and the largest value the
  // column holds, which is what makes this a claim rather than three
  // ordinary numbers: each is an input a rule that validated instead
  // of clamping would plausibly refuse.
  it('refuses none of them', () => {
    const refused = UNBOUNDED_CLAMP_CASES.filter(isRefused).map((testCase) => testCase.id);

    expect(refused).toEqual([]);
  });

  // Asserted against the proposal itself rather than against the
  // table's `expected`. Unchanged is a claim about the input, and a
  // recorded answer that happened to equal it would be a weaker one
  // — the table section's third case is where the recorded column
  // is tied to the same property, and it fails on its own when the
  // two part.
  it('answers each with the interval it was handed', () => {
    const answered = byId(
      UNBOUNDED_CLAMP_CASES,
      (testCase) => clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    );

    expect(answered).toEqual(byId(UNBOUNDED_CLAMP_CASES, (testCase) => testCase.intervalSeconds));
  });
});

// ---------------------------------------------------------------------------
// The table, where a bound has something to say
// ---------------------------------------------------------------------------

describe('clamp case table — the rows carrying a bound', () => {
  // The vacuity the unbounded group's first case guards, asked of
  // three groups at once: every claim over a bounded group is a walk
  // compared as one map, and a walk over no rows compares an empty
  // map against an empty map and passes. Distinctness earns its half
  // more here than it does there, because the rows of a bounded
  // group can also share one pair of bounds — two such rows are one
  // datum asserted twice. Both halves name the GROUP rather than the
  // row, since the group is the thing that has to be repaired.
  it('holds more than one row in every group, each proposing a different interval', () => {
    const thin = Object.entries(BOUNDED_GROUPS)
      .filter(([, group]) => group.length < 2)
      .map(([name]) => name);
    const repeated = Object.entries(BOUNDED_GROUPS)
      .filter(([, group]) => {
        const proposals = group.map((testCase) => testCase.intervalSeconds);

        return new Set(proposals).size < proposals.length;
      })
      .map(([name]) => name);

    expect(thin).toEqual([]);
    expect(repeated).toEqual([]);
  });

  // Three membership guards rather than one over a record of three,
  // so a group that has come apart from the table is named on a line
  // of its own. Each is the unbounded group's guard aimed at a
  // different property, and it fails in both directions: a row
  // appended to the table and to no group is a row no claim in this
  // file reaches, and a row dropped into the wrong group is judged
  // by claims written for a property it does not have.
  it('is exactly the rows in the table the floor raises', () => {
    const declared = FLOORED_CLAMP_CASES.map((testCase) => testCase.id);
    const raised = CLAMP_CASES.filter(isRaisedToTheFloor).map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(raised));
  });

  it('is exactly the rows in the table the ceiling lowers', () => {
    const declared = CAPPED_CLAMP_CASES.map((testCase) => testCase.id);
    const lowered = CLAMP_CASES.filter(isLoweredToTheCeiling).map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(lowered));
  });

  it('is exactly the bounded rows in the table neither bound moves', () => {
    const declared = INERT_BOUND_CLAMP_CASES.map((testCase) => testCase.id);
    const inside = CLAMP_CASES.filter(isInsideItsBounds).map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(inside));
  });

  // The job the unbounded group's recorded-answer guard does, once
  // per group. The files driving the SQL twin and the spliced copy
  // read `expected` and never see the bounds at all, so these are
  // what say the column those two are judged by carries the property
  // this file proves the function has.
  it('records the floor as the answer for every row the floor raises', () => {
    expect(byId(FLOORED_CLAMP_CASES, (testCase) => testCase.expected))
      .toEqual(byId(FLOORED_CLAMP_CASES, (testCase) => testCase.bounds.minIntervalSeconds));
  });

  it('records the ceiling as the answer for every row the ceiling lowers', () => {
    expect(byId(CAPPED_CLAMP_CASES, (testCase) => testCase.expected))
      .toEqual(byId(CAPPED_CLAMP_CASES, (testCase) => testCase.bounds.maxIntervalSeconds));
  });

  it('records the proposal as the answer for every row neither bound moves', () => {
    expect(byId(INERT_BOUND_CLAMP_CASES, (testCase) => testCase.expected))
      .toEqual(byId(INERT_BOUND_CLAMP_CASES, (testCase) => testCase.intervalSeconds));
  });

  // The one guard in this section that is not about a claim this
  // file makes. A floor with no ceiling is the only shape in the
  // table that an expression standing a MISSING bound in can answer
  // differently from `clampIntervalSeconds`, so a floored group that
  // lost that row would leave the live comparison green against an
  // expression whose floors do nothing — and no run of this file
  // would say so, since every claim it makes is green either way.
  // The crossed section carries the other half of that job, for an
  // expression that applies the two bounds in the wrong ORDER.
  it('raises at least one row that declares no ceiling at all', () => {
    const openTopped = FLOORED_CLAMP_CASES
      .filter((testCase) => testCase.bounds.maxIntervalSeconds === null)
      .map((testCase) => testCase.id);

    expect(openTopped).not.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A row a bound moves, and a row it does not
// ---------------------------------------------------------------------------

describe('clampIntervalSeconds — a row carrying a bound', () => {
  // The unbounded section's refusal claim aimed where a rule that
  // validated instead of clamping would actually turn something
  // away. Two thirds of these rows propose an interval their own row
  // would have to be moved to accept, which is exactly the input
  // such a rule refuses, and `src/lib/schedule.ts` claims the
  // opposite outright: every input has an answer, and where the
  // bounds do not reach it that answer is the proposal.
  it('refuses none of them', () => {
    const refused = BOUNDED_CLAMP_CASES.filter(isRefused).map((testCase) => testCase.id);

    expect(refused).toEqual([]);
  });

  // Asserted against the floor the row carries rather than against
  // the table's `expected`, for the reason the unbounded claim is
  // asserted against the proposal: the recorded column is tied to
  // this property by a guard of its own, which fails separately when
  // the two part.
  it('raises a proposal under the floor to the floor', () => {
    const answered = byId(
      FLOORED_CLAMP_CASES,
      (testCase) => clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    );

    expect(answered).toEqual(byId(FLOORED_CLAMP_CASES, (testCase) => testCase.bounds.minIntervalSeconds));
  });

  it('lowers a proposal over the ceiling to the ceiling', () => {
    const answered = byId(
      CAPPED_CLAMP_CASES,
      (testCase) => clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    );

    expect(answered).toEqual(byId(CAPPED_CLAMP_CASES, (testCase) => testCase.bounds.maxIntervalSeconds));
  });

  // What parts the floored and capped claims from a rule that
  // answers with a bound whenever the row declares one. That rule
  // satisfies every row in those two groups and is wrong for every
  // row in this one, so this is less a third property than the other
  // half of the first two. Two of its rows propose an interval
  // sitting exactly ON a bound, which is the input a rule written
  // with a strict comparison moves when it should leave it alone.
  it('leaves a proposal its own bounds already admit alone', () => {
    const answered = byId(
      INERT_BOUND_CLAMP_CASES,
      (testCase) => clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    );

    expect(answered).toEqual(byId(INERT_BOUND_CLAMP_CASES, (testCase) => testCase.intervalSeconds));
  });
});

// ---------------------------------------------------------------------------
// The table, where the two bounds contradict each other
// ---------------------------------------------------------------------------

describe('clamp case table — the rows whose two bounds cross', () => {
  // The membership guard the other four groups carry, aimed at the
  // property `boundsAgree` was written to exclude. It fails in both
  // directions for the reason theirs do, and it is what closes the
  // partition: a crossed row appended to the table and to no group
  // is reached by no claim in this file, and every claim here is a
  // walk over a declared roster.
  it('is exactly the rows in the table whose two bounds cross', () => {
    const declared = CROSSED_BOUND_CLAMP_CASES.map((testCase) => testCase.id);
    const crossed = CLAMP_CASES.filter(hasCrossedBounds).map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(crossed));
  });

  // Distinctness asked the way this group's claims need it. The
  // other groups ask only that their proposals differ; here it is
  // the proposal's PLACE against the crossed pair that varies the
  // arithmetic, and three rows all sitting beneath both bounds
  // would exercise one comparison three times while reading as a
  // full group. Set equality against the roster rather than a
  // count, so a row landing on a place another row already covers
  // is named rather than absorbed.
  it('holds one row for each place a proposal can sit against them', () => {
    const covered = CROSSED_BOUND_CLAMP_CASES.map(proposalPosition);
    const proposed = CROSSED_BOUND_CLAMP_CASES.map((testCase) => testCase.intervalSeconds);

    expect(sorted(covered)).toEqual(sorted(CROSSED_PROPOSAL_POSITIONS));
    expect(new Set(proposed).size).toBe(proposed.length);
  });

  // The job the other groups' recorded-answer guards do, once more.
  // The files driving the SQL twin and the spliced copy read
  // `expected` and never see the bounds, so this is what says the
  // column those two are judged by carries the property this file
  // proves the function has.
  it('records the ceiling as the answer for every one', () => {
    expect(byId(CROSSED_BOUND_CLAMP_CASES, (testCase) => testCase.expected))
      .toEqual(byId(CROSSED_BOUND_CLAMP_CASES, (testCase) => testCase.bounds.maxIntervalSeconds));
  });

  // The fixture guard the other groups have no need of. Every claim
  // in the crossed sections compares an answer against the ceiling,
  // and a row PROPOSING its own ceiling satisfies that comparison
  // for an identity rule as readily as for the clamp — so it would
  // sit in the group fully green while saying nothing, and no other
  // case here would report it. Named per offending row rather than
  // counted, since the repair is to move that row's proposal.
  it('proposes an interval no row already sits on its ceiling with', () => {
    const onTheCeiling = CROSSED_BOUND_CLAMP_CASES
      .filter((testCase) => testCase.intervalSeconds === testCase.bounds.maxIntervalSeconds)
      .map((testCase) => testCase.id);

    expect(onTheCeiling).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A row whose floor sits above its own ceiling
// ---------------------------------------------------------------------------

describe('clampIntervalSeconds — a row whose two bounds cross', () => {
  // The refusal claim at its strongest. A floor above a ceiling is
  // the one input in this table that is not merely unusual but
  // self-contradictory, and it is what a rule that VALIDATED rather
  // than clamped would refuse first — `src/lib/schedule.ts` claims
  // the opposite outright, that every input has an answer. Nothing
  // upstream refuses such a row either: no CHECK relates the two
  // columns, so the pair reaches the clamp exactly as written.
  it('refuses none of them', () => {
    const refused = CROSSED_BOUND_CLAMP_CASES.filter(isRefused).map((testCase) => testCase.id);

    expect(refused).toEqual([]);
  });

  // The claim these two sections exist for, and the only one in
  // the file whose content is the ORDER two rules are applied in
  // rather than a value. Both bounds
  // are live for every row here, so applying the ceiling second is
  // what makes the answer the ceiling and applying it first would
  // make it the floor — two different numbers for each of the three
  // rows, neither of them the proposal. Asserted against the
  // ceiling the row carries rather than against `expected`, for the
  // reason the other claims are: the recorded column is tied to
  // this property by a guard of its own, which reddens separately
  // when the two part.
  it('answers each with the ceiling rather than the floor', () => {
    const answered = byId(
      CROSSED_BOUND_CLAMP_CASES,
      (testCase) => clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    );

    expect(answered).toEqual(byId(CROSSED_BOUND_CLAMP_CASES, (testCase) => testCase.bounds.maxIntervalSeconds));
  });
});

// ---------------------------------------------------------------------------
// Reading the caps the rule turns away
// ---------------------------------------------------------------------------

/**
 * One cap the rule turns away: the value, and what handing it on
 * to `slice` would have done to a pass instead.
 *
 * Declared in this file rather than beside the clamp rows, which
 * are shared with the SQL expression the dispatcher carries and
 * with the spliced copy a Code node runs, and are guarded as a
 * fixture in their own right for it. A cap is refused by one
 * function in one place, so this roster has nowhere to drift to.
 */
interface RefusedCap {
  /**
   * Stable id, and what a failure names. Every claim in the cap
   * section filters the roster and prints the ids left standing,
   * so an offending cap is named rather than counted.
   */
  readonly id: string;

  /**
   * What the row stands for, which here is the answer `slice`
   * gives for this cap — measured rather than reasoned about,
   * since what it does with each of them is the whole of why the
   * rule refuses instead of passing the value through.
   */
  readonly standsFor: string;

  /** The cap itself, as a resolved setting would reach the rule. */
  readonly cap: number;
}

/**
 * The caps `capBatch` refuses, one row per shape of wrong.
 *
 * Five rows for three shapes, because `not an integer` is three
 * separate failures and `slice` answers each of them differently:
 * a fraction truncates to a cap nobody wrote, `NaN` comes back
 * empty, and an infinite one carries the whole backlog. None is
 * exotic — a cap reaches a Code node as resolved setting text, and
 * `Number` turns an unparseable one into `NaN` and an empty one
 * into `0`.
 *
 * Those answers are not themselves distinct: measured over
 * {@link CLAIMED_BATCH}, `0` and `NaN` both come back empty. So
 * the roster is keyed on the shape of the cap rather than on what
 * `slice` would have produced, and {@link REFUSED_CAP_SHAPES} is
 * what a guard holds it against.
 */
const REFUSED_CAPS: readonly RefusedCap[] = [
  {
    id: 'cap-zero',
    standsFor: 'a cap slice answers with an empty batch',
    cap: 0,
  },
  {
    id: 'cap-negative',
    standsFor: 'a cap slice counts from the far end of the batch',
    cap: -1,
  },
  {
    id: 'cap-fraction',
    standsFor: 'a cap slice truncates to a whole number nobody wrote',
    cap: 2.5,
  },
  {
    id: 'cap-not-a-number',
    standsFor: 'the cap an unparseable setting resolves to',
    cap: Number.NaN,
  },
  {
    id: 'cap-infinite',
    standsFor: 'a cap slice takes the whole backlog under',
    cap: Number.POSITIVE_INFINITY,
  },
];

/**
 * The shapes of cap the rule turns away, declared so a guard can
 * assert set equality against them rather than count rows.
 *
 * A count passes for five rows all holding a fraction, which
 * exercises one comparison five times while reading as coverage of
 * everything the rule refuses.
 */
const REFUSED_CAP_SHAPES = ['zero', 'negative', 'a fraction', 'not a number', 'infinite'] as const;

/**
 * Which of {@link REFUSED_CAP_SHAPES} a cap has, or a sixth answer
 * for one the rule would take.
 *
 * Total over every number rather than narrowed to the roster, so a
 * cap that reached the roster without the property names its own
 * shape in the failure instead of being read as a duplicate of
 * whichever row it happened to resemble. That sixth answer is the
 * one which cannot appear in the declared roster, so it is what a
 * wrongly rostered cap comes back as.
 *
 * That sixth answer is what {@link capReach} asks this function
 * for, so a cap rostered among the ones the rule TAKES is placed
 * by its shape rather than by an arithmetic against the batch that
 * would never be reached for it.
 *
 * `NaN` is asked about ahead of finiteness because it is not
 * finite either, and a fraction is what the last pair leaves over
 * rather than a comparison of its own.
 */
function capShape(cap: number): string {
  if (Number.isInteger(cap) && cap > 0) {
    return 'a positive integer';
  }

  if (Number.isNaN(cap)) {
    return 'not a number';
  }

  if (!Number.isFinite(cap)) {
    return 'infinite';
  }

  if (cap === 0) {
    return 'zero';
  }

  return Number.isInteger(cap)
    ? 'negative'
    : 'a fraction';
}

/**
 * The batch every call in both cap sections is made with.
 *
 * Four items rather than none, so that what `slice` would have
 * answered for a refused cap is a prefix of a real list rather
 * than nothing having been there to take. No claim in the refusal
 * section reads it — a cap is refused before the batch is touched
 * at all — and the length is carried for the section after that
 * one, where what comes back IS the subject: four items leave room
 * for a cap falling short of the batch, one the batch sits exactly
 * on and one the batch fits under, with the front of an answer
 * distinguishable from the back in all three.
 */
const CLAIMED_BATCH = ['claim-1', 'claim-2', 'claim-3', 'claim-4'] as const;

/**
 * The message `capBatch` refused a cap with, or null when it took
 * the cap and answered.
 *
 * A reader rather than a helper that throws, for the reason
 * {@link isRefused} is a predicate: a claim can filter the whole
 * roster and name every cap that was not turned away, where a
 * throwing helper cannot be called from inside a filter at all and
 * a claim built on one stops at the first offender.
 *
 * Anything that is not an `Error` is rethrown rather than reported
 * as a refusal. The rule throws a plain `Error` by design — it is
 * spliced into a Code node, where a throw reaches an operator as
 * its message and a constructor name crosses nothing — so the
 * message is all there is to pin it by, and a reader taking
 * whatever was thrown would report a `TypeError` raised inside
 * `slice` as the refusal under test.
 */
function refusalFor(cap: number): string | null {
  try {
    capBatch(CLAIMED_BATCH, cap);

    return null;
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw cause;
    }

    return cause.message;
  }
}

/** Whether a cap's refusal quotes the value it was handed. */
function refusalNamesItsCap(refused: RefusedCap): boolean {
  const message = refusalFor(refused.cap);

  return message !== null && message.includes(String(refused.cap));
}

// ---------------------------------------------------------------------------
// A cap the rule will not take
// ---------------------------------------------------------------------------

describe('capBatch — a cap that is not a positive integer', () => {
  // The roster guard the clamp groups carry, aimed at this roster.
  // Every claim here is a walk over it, and a walk over no rows
  // names no offender and passes. Set equality over derived shapes
  // rather than a count, since five rows all holding a fraction
  // would exercise one comparison five times while reading as
  // coverage of everything the rule refuses.
  it('holds one cap for each shape the rule turns away', () => {
    const covered = REFUSED_CAPS.map((refused) => capShape(refused.cap));

    expect(sorted(covered)).toEqual(sorted(REFUSED_CAP_SHAPES));
  });

  // Filtered rather than asserted per row, so a failure names
  // every cap that got through instead of stopping at the first.
  // This is the opposite of what the clamp beside it claims: that
  // rule answers whatever it is handed, and this one turns a cap
  // away rather than passing it to `slice`, which has a
  // plausible-looking answer for every value in the roster and
  // reports none of them.
  it('refuses every one of them', () => {
    const taken = REFUSED_CAPS
      .filter((refused) => refusalFor(refused.cap) === null)
      .map((refused) => refused.id);

    expect(taken).toEqual([]);
  });

  // Not a second reading of the claim above it. The refusal is a
  // plain `Error`, so there is no class to pin it by and a bare
  // `it threw` is green for any failure on the path — including a
  // `TypeError` out of `slice` over an items argument that was
  // never a list. The value quoted in the message is what parts
  // this refusal from those, and it is also the whole of what an
  // operator reading it on a canvas is given to work with.
  it('names the cap it was handed in every refusal', () => {
    const silent = REFUSED_CAPS
      .filter((refused) => !refusalNamesItsCap(refused))
      .map((refused) => refused.id);

    expect(silent).toEqual([]);
  });

  // The guard the three claims above rest on, and the only case in
  // this section that moves when the rule refuses EVERYTHING: a
  // section of nothing but refusals is fully green for a function
  // that turns away whatever it is handed, and no roster of
  // refusals can say otherwise. A cap of 1 rather than a
  // comfortable one, because it is a single step from the zero the
  // roster refuses — a guard built on a cap nobody would question
  // says nothing about where the rule is keyed.
  it('takes the smallest cap it admits', () => {
    expect(refusalFor(1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reading the caps the rule takes
// ---------------------------------------------------------------------------

/**
 * One cap the rule takes: the value, and where it falls against
 * the batch it is applied to.
 *
 * Declared in this file beside {@link REFUSED_CAPS} and for the
 * same reason — a cap is taken or turned away by one function in
 * one place, so neither roster has anywhere to drift to.
 *
 * No recorded answer per row, which is where this parts from the
 * clamp table next door. That table records one because the SQL
 * twin and the spliced copy read `expected` and cannot call the
 * function at all; here every claim calls it, so a batch written
 * out beside each row would be `capBatch` reimplemented with no
 * second reader to serve.
 */
interface TakenCap {
  /**
   * Stable id, and what a failure names. Every claim in this
   * section filters a roster and prints the ids left standing, so
   * an offending cap is named rather than counted.
   */
  readonly id: string;

  /**
   * What the row stands for, which here is where the cap falls
   * against a batch of four claims and what a pass carrying it
   * would leave behind.
   */
  readonly standsFor: string;

  /** The cap itself, as a resolved setting would reach the rule. */
  readonly cap: number;
}

/**
 * The caps `capBatch` takes, one row per place a cap can fall
 * against {@link CLAIMED_BATCH}.
 *
 * Five rows for three places, because two of the three are worth
 * more than a row each. A cap of 1 is the smallest the rule
 * admits and a single step from the zero it turns away; a cap of
 * 25 is what `ENV_DEFAULTS.AR_DISPATCH_BATCH_CAP` in
 * `scripts/workflow-markers.ts` ships, and it stands for the
 * ordinary tick — the claim query's own `LIMIT` has already held,
 * and this call does nothing at all.
 *
 * The row the batch sits exactly on is the one an off-by-one
 * moves, and it is the only place in the roster where both of the
 * section's claims are true of one row. A cap read one short
 * there drops a claim that was inside the bound; a cap read one
 * long is invisible on every other row.
 */
const TAKEN_CAPS: readonly TakenCap[] = [
  {
    id: 'cap-of-one',
    standsFor: 'the smallest cap the rule admits, a step from zero',
    cap: 1,
  },
  {
    id: 'cap-one-under-the-batch',
    standsFor: 'a cap leaving one claim for the tick after this one',
    cap: 3,
  },
  {
    id: 'cap-on-the-batch',
    standsFor: 'a cap the batch sits exactly on, where both claims meet',
    cap: 4,
  },
  {
    id: 'cap-one-over-the-batch',
    standsFor: 'the nearest cap with nothing to take off the batch',
    cap: 5,
  },
  {
    id: 'cap-the-shipped-default',
    standsFor: 'the cap AR_DISPATCH_BATCH_CAP ships, inert on this batch',
    cap: 25,
  },
];

/**
 * The places a cap can fall against the batch, declared so a
 * guard can assert set equality against them rather than count
 * rows.
 *
 * A count passes for five rows all falling short of the batch,
 * which exercises one comparison five times while reading as
 * coverage of everything a cap can do to one.
 */
const CAP_REACHES = [
  'shorter than the batch',
  'exactly the batch',
  'longer than the batch',
] as const;

/**
 * Which of {@link CAP_REACHES} a cap occupies against
 * {@link CLAIMED_BATCH}, or a fourth answer for one the rule
 * turns away.
 *
 * Total over every number rather than narrowed to the roster, for
 * the reason {@link capShape} is: a cap that reached the roster
 * without the property names its own shape in the failure instead
 * of being read as a duplicate of whichever row it resembled.
 * That fourth answer is the one which cannot appear in
 * {@link CAP_REACHES}, so it is what a wrongly rostered cap comes
 * back as.
 *
 * It asks {@link capShape} first rather than comparing lengths of
 * its own, so a cap belonging in {@link REFUSED_CAPS} is reported
 * as one instead of being placed by an arithmetic the rule never
 * reaches for it.
 */
function capReach(cap: number): string {
  if (capShape(cap) !== 'a positive integer') {
    return 'a cap the rule turns away';
  }

  if (cap < CLAIMED_BATCH.length) {
    return 'shorter than the batch';
  }

  return cap > CLAIMED_BATCH.length
    ? 'longer than the batch'
    : 'exactly the batch';
}

/** Whether the batch is longer than a cap, so its tail goes. */
function capBites(taken: TakenCap): boolean {
  return taken.cap < CLAIMED_BATCH.length;
}

/**
 * Whether the batch fits under a cap, so nothing is taken off it.
 *
 * The negation of {@link capBites} rather than a comparison of
 * its own, so the two cannot come to overlap or to leave a cap
 * between them however the roster is edited. The cap the batch
 * sits exactly on is here, where the whole batch coming back is
 * the stronger of the two things true of it.
 */
function batchFitsUnderCap(taken: TakenCap): boolean {
  return !capBites(taken);
}

/** The batch `capBatch` came back with for a cap it took. */
function answerFor(cap: number): readonly string[] {
  return capBatch(CLAIMED_BATCH, cap);
}

/**
 * Whether a cap's answer sits at the head of the batch, item for
 * item.
 *
 * An index walk rather than a slice held against the answer, so
 * the guard is not the rule under test written out a second time:
 * a `slice` on this side would agree with a `slice` on that one
 * however either came to be edited.
 */
function answerStartsTheBatch(taken: TakenCap): boolean {
  return answerFor(taken.cap).every((item, index) => item === CLAIMED_BATCH[index]);
}

/**
 * One reading per rostered cap, keyed by id, so a comparison is a
 * single expression over two whole maps.
 *
 * {@link byId} aimed at this roster, with the same argument for
 * the shape — comparing the maps fails on a missing key as well
 * as on a wrong value, and prints the pair — and the same limit,
 * that it cannot fail for holding no keys at all.
 */
function byCap<V>(
  caps: readonly TakenCap[],
  read: (taken: TakenCap) => V,
): Record<string, V> {
  return Object.fromEntries(caps.map((taken) => [taken.id, read(taken)]));
}

/** The rostered caps the batch is longer than, so its tail goes. */
const CAPS_THAT_BITE: readonly TakenCap[] = TAKEN_CAPS.filter(capBites);

/** The rostered caps the whole batch fits under. */
const CAPS_THE_BATCH_FITS_UNDER: readonly TakenCap[] = TAKEN_CAPS.filter(batchFitsUnderCap);

// ---------------------------------------------------------------------------
// A cap the rule takes
// ---------------------------------------------------------------------------

describe('capBatch — a cap that is a positive integer', () => {
  // The roster guard every section before this one carries, aimed
  // at this roster. Each claim here walks it or one of the two
  // groups drawn from it, and a walk over no rows names no
  // offender and passes — so this is also what stands behind both
  // groups holding anything at all: lose the caps that fall short
  // and 'shorter than the batch' goes missing, lose the rest and
  // the other two do. Set equality over the DISTINCT places
  // rather than one label per row, since the roster carries more
  // rows than there are places to fall; distinctness over the
  // caps beside it, since two rows holding one cap are a single
  // datum asserted twice.
  it('holds a cap for every place one can fall against the batch', () => {
    const covered = TAKEN_CAPS.map((taken) => capReach(taken.cap));
    const rostered = TAKEN_CAPS.map((taken) => taken.cap);

    expect(sorted([...new Set(covered)])).toEqual(sorted(CAP_REACHES));
    expect(new Set(rostered).size).toBe(rostered.length);
  });

  // The fixture guard both claims rest on, and it is about the
  // batch rather than the roster. A batch of one item makes "the
  // whole batch" and "the first item" the same answer, and a
  // batch whose items repeat makes its front indistinguishable
  // from its back — either leaves every claim here green for a
  // rule that took the wrong items or the wrong number of them.
  it('is driven over a batch of more than one item, no two alike', () => {
    expect(CLAIMED_BATCH.length).toBeGreaterThan(1);
    expect(new Set(CLAIMED_BATCH).size).toBe(CLAIMED_BATCH.length);
  });

  // Filtered rather than asserted per row, so a failure names
  // every cap that was turned away instead of stopping at the
  // first. The mirror of the refusal section's own claim, and
  // what says the two rosters do not overlap: a cap belonging
  // over there is reported here as a refusal rather than as a
  // row that quietly answered nothing.
  it('refuses none of them', () => {
    const refused = TAKEN_CAPS
      .filter((taken) => refusalFor(taken.cap) !== null)
      .map((taken) => taken.id);

    expect(refused).toEqual([]);
  });

  // The first of the two claims this section exists for.
  // Asserted against the batch itself rather than against an
  // answer written down beside the row, which is what makes it a
  // claim about the list that was handed in: a cap the batch fits
  // under has nothing to take, so what comes back is everything
  // that went in.
  it('answers with the whole batch for every cap it fits under', () => {
    const answered = byCap(CAPS_THE_BATCH_FITS_UNDER, (taken) => answerFor(taken.cap));

    expect(answered).toEqual(byCap(CAPS_THE_BATCH_FITS_UNDER, () => CLAIMED_BATCH));
  });

  // The second, asserted against the cap the row carries for the
  // same reason. A batch longer than its cap is bounded to
  // exactly that many however much came due, and the rows past it
  // are not dropped: nothing has claimed them, so they stay due
  // and the tick after this one takes them.
  it('answers with exactly cap items for every cap that bites', () => {
    const counted = byCap(CAPS_THAT_BITE, (taken) => answerFor(taken.cap).length);

    expect(counted).toEqual(byCap(CAPS_THAT_BITE, (taken) => taken.cap));
  });

  // What parts the claim above it from a count. Exactly `cap`
  // items is satisfied in full by a rule taking the LAST `cap` of
  // the batch, or any `cap` of them in any order, and neither is
  // a bounded pass at the front of the queue — `ar-dispatch`
  // claims oldest-due first, so which end goes is the difference
  // between a capped pass and a sample of one. Walked over the
  // whole roster rather than over the biting group, since a cap
  // that took nothing off the batch can still hand it back in the
  // wrong order.
  it('takes those items off the front of the batch, never the back', () => {
    const strayed = TAKEN_CAPS
      .filter((taken) => !answerStartsTheBatch(taken))
      .map((taken) => taken.id);

    expect(strayed).toEqual([]);
  });

  // What parts the whole-batch claim from a rule handing the
  // caller its own list straight back. That rule satisfies the
  // claim in full — the two are equal item for item — and
  // `src/lib/schedule.ts` says the opposite outright: the batch
  // comes back as a new array whether or not the cap bit, so
  // nothing a caller still holds is trimmed underneath it.
  // `Object.is` rather than a comparison of contents, since the
  // contents are what the claim already read.
  it('answers with a new array rather than the batch it was handed', () => {
    const shared = TAKEN_CAPS
      .filter((taken) => Object.is(answerFor(taken.cap), CLAIMED_BATCH))
      .map((taken) => taken.id);

    expect(shared).toEqual([]);
  });
});
