/**
 * The scheduling arithmetic `ar-dispatch` applies to a row it has
 * claimed, driven over the case table beside this file.
 *
 * What is covered is `clampIntervalSeconds` over a row that carries
 * no bounds at all — nothing is refused, and what comes back is what
 * was handed in — and over a row where one of the two bounds has
 * something to say. `src/lib/schedule.ts` states the first pair in
 * one breath, and the second as a contract rather than a
 * consequence: the floor is applied first and the ceiling second,
 * and a bound the proposal does not reach leaves it alone. Two
 * bounds that CROSS, and everything `capBatch` owes, arrive later in
 * this plan.
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
 * The rows are imported rather than written here because the same
 * ones drive the SQL expression the dispatcher carries and the
 * spliced copy a Code node runs. That makes the table a second thing
 * worth guarding: a claim written as a walk over a roster passes
 * when the roster is empty, and every claim here is such a walk.
 */
import type { ClampCase } from './schedule-cases.js';

import { describe, expect, it } from 'vitest';

import { clampIntervalSeconds } from '../../src/lib/schedule.js';

import {
  CAPPED_CLAMP_CASES,
  CLAMP_CASES,
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
 * answer to two predicates and break both membership guards. The
 * group describing those rows arrives later in this plan; until it
 * does, this clause is what says the guards are silent about them
 * on purpose rather than by luck.
 */
function boundsAgree(testCase: ClampCase): boolean {
  const { minIntervalSeconds: floor, maxIntervalSeconds: ceiling } = testCase.bounds;

  return floor === null || ceiling === null || floor <= ceiling;
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
 * The three bounded groups by name, so a guard asking one question
 * of all of them is a single expression rather than three copies of
 * it that can drift apart.
 */
const BOUNDED_GROUPS: Readonly<Record<string, readonly ClampCase[]>> = {
  floored: FLOORED_CLAMP_CASES,
  capped: CAPPED_CLAMP_CASES,
  inert: INERT_BOUND_CLAMP_CASES,
};

/**
 * Every row carrying a bound, derived from the roster rather than
 * listed a second time, so a group reaching one of the two and not
 * the other is not a thing that can happen.
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
  // table that the SQL expression `ar-dispatch` carries can answer
  // differently from `clampIntervalSeconds`, so a floored group that
  // lost that row would leave the live comparison green against an
  // expression whose floors do nothing — and no run of this file
  // would say so, since every claim it makes is green either way.
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
