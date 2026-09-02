/**
 * The scheduling arithmetic in `src/lib/schedule.ts`: the clamp and
 * the pause, both driven over case tables beside this file, and the
 * batch cap, driven over two rosters declared inside it.
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
 * `pauseFrom` is the third, and it is covered over a row the clamp
 * leaves alone, over each of the three bound shapes that move a
 * cycle's length, and over every shape of cycle count it turns
 * away. What the pause adds to the clamp is an ORDER of its own:
 * the bounds are applied to the length of ONE cycle and the count
 * multiplies what comes back, so a rule clamping the whole span
 * answers differently for every bounded row and identically for a
 * row asking one cycle.
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
 * The two refusal sections carry a limit of that shape one more
 * time, and theirs is the starkest of the five: every claim in it is
 * satisfied in full by a function that refuses whatever it is
 * handed. Nothing a roster of refusals can say parts those two, so
 * each closes on a guard instead — one value the rule must take, a
 * single step from the zero it turns away. What stops that guard
 * being the whole of the evidence is the section after it: every claim there is over a cap the rule took and a
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
 * varies the batch, the readers of the clamp table all driving
 * rows rather than lists.
 *
 * The clamp rows are imported rather than written here because the
 * same ones drive the SQL expression the dispatcher carries and the
 * spliced copy a Code node runs. The pause rows are imported for a
 * weaker reason — they have no second reader — and sit beside the
 * clamp rows they lean on. That makes both tables a second thing
 * worth guarding: a claim written as a walk over a roster passes
 * when the roster is empty, and every claim here is such a walk.
 * Both cap rosters are declared in this file instead, since nothing
 * else reads them and so they have nowhere to drift to — but each is
 * walked the same way, and each carries a guard of its own for the
 * same reason.
 */
import type { ClampCase, PauseCase } from './schedule-cases.js';
import type { IntervalBounds } from '../../src/lib/schedule.js';

import { describe, expect, it } from 'vitest';

import { capBatch, clampIntervalSeconds, pauseFrom } from '../../src/lib/schedule.js';

import {
  CAPPED_CLAMP_CASES,
  CLAMP_CASES,
  CLAMPED_PAUSE_CASES,
  CROSSED_BOUND_CLAMP_CASES,
  FLOORED_CLAMP_CASES,
  INERT_BOUND_CLAMP_CASES,
  PAUSE_CASES,
  UNBOUNDED_CLAMP_CASES,
  UNBOUNDED_PAUSE_CASES,
} from './schedule-cases.js';

// ---------------------------------------------------------------------------
// Reading the table
// ---------------------------------------------------------------------------

/** Sorted copy, so an equality is over ids rather than over order. */
function sorted(ids: readonly string[]): readonly string[] {
  return [...ids].sort();
}

/**
 * The whole of what the three bound predicates below read.
 *
 * Both case tables carry a `bounds`, so a predicate asking about
 * one answers for a clamp row and a pause row alike. Narrowed to
 * `ClampCase` instead, each would have to be written out a second
 * time for the pause rows — and the crossed-bounds reading is the
 * one property both tables lean on hardest.
 */
interface BoundedCase {
  readonly bounds: IntervalBounds;
}

/** Whether a case's row carries neither a floor nor a ceiling. */
function carriesNoBounds(testCase: BoundedCase): boolean {
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
function boundsAgree(testCase: BoundedCase): boolean {
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
function hasCrossedBounds(testCase: BoundedCase): boolean {
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
 * `slice` would have produced, and {@link REFUSED_VALUE_SHAPES} is
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
 * The shapes of value a rule holding out for a positive integer
 * turns away, declared so a guard can assert set equality against
 * them rather than count rows.
 *
 * A count passes for five rows all holding a fraction, which
 * exercises one comparison five times while reading as coverage of
 * everything the rule refuses.
 *
 * Both refusal rosters in this file are held against these five.
 * `capBatch` and `pauseFrom` turn a value away on one predicate,
 * written once in `src/lib/schedule.ts` and repeated in each, so a
 * shape one roster covers and the other does not is a gap rather
 * than a difference between the two rules.
 */
const REFUSED_VALUE_SHAPES = ['zero', 'negative', 'a fraction', 'not a number', 'infinite'] as const;

/**
 * Which of {@link REFUSED_VALUE_SHAPES} a value has, or a sixth
 * answer for one a rule holding out for a positive integer takes.
 *
 * Written once and read by both refusal rosters, since the two
 * rules refuse on the same predicate. A classifier per roster
 * would be that predicate written out a third and a fourth time,
 * each free to drift from the rule it is judging.
 *
 * Total over every number rather than narrowed to a roster, so a
 * value that reached one without the property names its own shape
 * in the failure instead of being read as a duplicate of whichever
 * row it happened to resemble. That sixth answer is the one which
 * cannot appear in the declared roster, so it is what a wrongly
 * rostered value comes back as.
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
function positiveIntegerShape(value: number): string {
  if (Number.isInteger(value) && value > 0) {
    return 'a positive integer';
  }

  if (Number.isNaN(value)) {
    return 'not a number';
  }

  if (!Number.isFinite(value)) {
    return 'infinite';
  }

  if (value === 0) {
    return 'zero';
  }

  return Number.isInteger(value)
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
    const covered = REFUSED_CAPS.map((refused) => positiveIntegerShape(refused.cap));

    expect(sorted(covered)).toEqual(sorted(REFUSED_VALUE_SHAPES));
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
 * `scripts/workflow-markers.ts` ships, and it stands for a tick
 * whose two claims came in under it between them, where each
 * claim query's own `LIMIT` has already held and this call does
 * nothing at all. That is not every tick: the dispatcher's
 * `LIMIT` is per claim, so two backlogged tables hand this
 * function twice the cap.
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
 * the reason {@link positiveIntegerShape} is: a cap that reached the roster
 * without the property names its own shape in the failure instead
 * of being read as a duplicate of whichever row it resembled.
 * That fourth answer is the one which cannot appear in
 * {@link CAP_REACHES}, so it is what a wrongly rostered cap comes
 * back as.
 *
 * It asks {@link positiveIntegerShape} first rather than comparing lengths of
 * its own, so a cap belonging in {@link REFUSED_CAPS} is reported
 * as one instead of being placed by an arithmetic the rule never
 * reaches for it.
 */
function capReach(cap: number): string {
  if (positiveIntegerShape(cap) !== 'a positive integer') {
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
  // the batch, or any `cap` of them in any order, and none of
  // those is the front of the list it was handed — which is the
  // whole of what the rule promises, and all a caller may read
  // off it. `ar-dispatch` is not such a caller: its claims order
  // the rows they TAKE and not the rows they return, so the front
  // it hands over is arbitrary among them and
  // `src/lib/schedule.ts` says so. Walked over the whole roster
  // rather than over the biting group, since a cap that took
  // nothing off the batch can still hand it back in the
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

// ---------------------------------------------------------------------------
// Reading the pause table
// ---------------------------------------------------------------------------

/**
 * The bounds a row carries when it carries none, written once so
 * the refusal reader can hand the rule a pairing the clamp has
 * nothing to say about.
 *
 * A refusal is reached before the clamp is, so what the bounds are
 * cannot matter to it — and that is exactly why they are the inert
 * pairing here rather than an interesting one. A refusal roster
 * driven over bounds that moved something would be two claims in
 * one, and the failure would not say which of them broke.
 */
const UNCLAMPED_BOUNDS: IntervalBounds = {
  minIntervalSeconds: null,
  maxIntervalSeconds: null,
};

/**
 * The instant the refusal roster measures from.
 *
 * Text rather than a `Date`, and turned into one per call, so no
 * claim in the refusal section can be reached by a rule that moved
 * a base a claim before it had handed in.
 */
const REFUSED_PAUSE_BASE = '2026-03-01T00:00:00.000Z';

/**
 * The bound shapes the clamped pause rows cover, declared so a
 * guard can assert set equality against them rather than count
 * rows.
 *
 * The three are the ones the clamp table already parts a wrong twin
 * on, and a count passes for three rows all carrying a floor, which
 * exercises one delegation three times while reading as coverage of
 * every shape a bound comes in.
 */
const PAUSE_BOUND_SHAPES = [
  'a floor with no ceiling',
  'a ceiling with no floor',
  'bounds that cross',
] as const;

/**
 * Which of {@link PAUSE_BOUND_SHAPES} a pause row carries, or one
 * of two further answers for a row carrying neither.
 *
 * Total over every row rather than narrowed to the clamped group,
 * for the reason {@link positiveIntegerShape} is: a row that
 * reached the group without the property names its own shape in the
 * failure instead of being read as a duplicate of whichever row it
 * happened to resemble. The two answers outside the roster are what
 * a wrongly rostered row comes back as.
 *
 * The crossed reading is asked ahead of the two single-bound ones
 * because a crossed row carries both bounds, and {@link
 * hasCrossedBounds} is asked for rather than a comparison written
 * here, so this placement and the clamp table's partition cannot
 * come to disagree about which rows cross.
 */
function pauseBoundShape(testCase: PauseCase): string {
  if (carriesNoBounds(testCase)) {
    return 'no bound at all';
  }

  if (hasCrossedBounds(testCase)) {
    return 'bounds that cross';
  }

  if (testCase.bounds.maxIntervalSeconds === null) {
    return 'a floor with no ceiling';
  }

  return testCase.bounds.minIntervalSeconds === null
    ? 'a ceiling with no floor'
    : 'two bounds that agree';
}

/**
 * How far out a pause row reaches, declared so a guard can assert
 * set equality against it rather than count rows.
 *
 * Two members rather than a count because the two are not
 * interchangeable. A rule that added one interval and ignored the
 * count answers every single-cycle row correctly, and a group
 * holding only those would be green for it.
 */
const PAUSE_CYCLE_REACHES = ['one cycle', 'many cycles'] as const;

/**
 * Which of {@link PAUSE_CYCLE_REACHES} a row asks for, or a third
 * answer for a count the rule turns away.
 *
 * It asks {@link positiveIntegerShape} first rather than comparing
 * against one of its own, so a row carrying a count that belongs in
 * the refusal roster is reported as one instead of being placed by
 * a reading the rule never reaches for it.
 */
function pauseCycleReach(testCase: PauseCase): string {
  if (positiveIntegerShape(testCase.cycles) !== 'a positive integer') {
    return 'a cycle count the rule turns away';
  }

  return testCase.cycles === 1
    ? 'one cycle'
    : 'many cycles';
}

/**
 * The instant `pauseFrom` answered a row with.
 *
 * The base is constructed here, per call, rather than held on the
 * row: the table records ISO-8601 text precisely so that no reader
 * shares a mutable instant with another, and a helper that cached
 * one would put back what the table was shaped to avoid.
 */
function pausedFor(testCase: PauseCase): Date {
  return pauseFrom(
    new Date(testCase.base),
    testCase.cycles,
    testCase.intervalSeconds,
    testCase.bounds,
  );
}

/** That instant as ISO-8601 text, which is how the table holds it. */
function pausedInstant(testCase: PauseCase): string {
  return pausedFor(testCase).toISOString();
}

/**
 * Whether the rule turned a row away rather than answering it.
 *
 * A predicate rather than a helper that rethrows, for the reason
 * {@link isRefused} is one: a claim can filter the whole roster and
 * name every row that was refused, where a throwing helper cannot
 * be called from inside a filter at all.
 */
function pauseIsRefused(testCase: PauseCase): boolean {
  try {
    pausedFor(testCase);

    return false;
  } catch {
    return true;
  }
}

/**
 * How far past its base a row's RECORDED answer sits, in seconds.
 *
 * Read off the table rather than off the rule, so a claim built on
 * it says something about the fixture. Every guard tying `expected`
 * to a property goes through here.
 */
function secondsRecorded(testCase: PauseCase): number {
  return (Date.parse(testCase.expected) - Date.parse(testCase.base)) / 1000;
}

/**
 * Whether a row's recorded answer sits a whole number of its own
 * intervals in front of its base.
 *
 * The tie between `expected` and a property, for the rows nothing
 * clamps. It stops short of naming WHICH multiple on purpose: that
 * number is `pauseFrom` written out again, and a guard asserting it
 * would hold for whatever the rule became. Forward is half the
 * claim — a pause that answered an instant at or before its base
 * has deferred nothing, and on an overdue row it is an
 * extraordinary run wearing the wrong name.
 */
function sitsOnAWholeInterval(testCase: PauseCase): boolean {
  const span = secondsRecorded(testCase);

  return span > 0 && span % testCase.intervalSeconds === 0;
}

/**
 * The seconds past the base a rule clamping the whole SPAN would
 * have answered with.
 *
 * The wrong twin, written out so a guard can assert the table parts
 * from it. Clamping after the multiplication rather than before is
 * the single likeliest way to write this rule by accident, it
 * agrees with the real one on every row nothing clamps and on every
 * row asking a single cycle, and no case comparing an answer
 * against `expected` says which of the two produced it.
 */
function spanClampedSeconds(testCase: PauseCase): number {
  return clampIntervalSeconds(
    testCase.intervalSeconds * testCase.cycles,
    testCase.bounds,
  );
}

/**
 * A row's ceiling multiplied by the cycles it asks for, or null
 * where the row declares no ceiling.
 *
 * Null rather than a sentinel, for the reason {@link byId}'s reader
 * may answer one: a row whose ceiling turned out to be absent then
 * puts a `null` beside a number and reddens.
 */
function ceilingCycles(testCase: PauseCase): number | null {
  const ceiling = testCase.bounds.maxIntervalSeconds;

  return ceiling === null
    ? null
    : ceiling * testCase.cycles;
}

/**
 * One reading per pause row, keyed by id, so a comparison is a
 * single expression over two whole maps.
 *
 * {@link byId} aimed at this table, with the same argument for the
 * shape — comparing the maps fails on a missing key as well as on
 * a wrong value, and prints the pair — and the same limit, that it
 * cannot fail for holding no keys at all.
 */
function byPause<V>(
  cases: readonly PauseCase[],
  read: (testCase: PauseCase) => V,
): Record<string, V> {
  return Object.fromEntries(cases.map((testCase) => [testCase.id, read(testCase)]));
}

// ---------------------------------------------------------------------------
// The pause table, where nothing moves the cycle
// ---------------------------------------------------------------------------

describe('pause case table — the rows carrying no bounds', () => {
  // The membership guard both clamp groups carry, aimed at this
  // table. It fails in both directions for the reason theirs do: a
  // bounded row dropped in here would be judged by claims written
  // for rows nothing clamps, and an unbounded row appended to the
  // table and not to the group is a row this file never reaches.
  it('is exactly the rows in the table that carry neither bound', () => {
    const declared = UNBOUNDED_PAUSE_CASES.map((testCase) => testCase.id);
    const unbounded = PAUSE_CASES.filter(carriesNoBounds).map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(unbounded));
  });

  // Set equality against the roster rather than a count, and the
  // two members are not interchangeable: a rule that added one
  // interval and ignored the count answers every single-cycle row
  // correctly, so a group holding only those would be green for it.
  // The distinctness half is the same vacuity one step along — four
  // rows all asking three cycles turn a multiplication into one
  // datum asserted four times over.
  it('asks for one cycle and for several, no two counts alike', () => {
    const covered = [...new Set(UNBOUNDED_PAUSE_CASES.map(pauseCycleReach))];
    const counts = UNBOUNDED_PAUSE_CASES.map((testCase) => testCase.cycles);

    expect(sorted(covered)).toEqual(sorted(PAUSE_CYCLE_REACHES));
    expect(new Set(counts).size).toBe(counts.length);
  });

  // The recorded-answer guard the clamp groups carry, and the
  // weakest of them by some way: this table has no second reader to
  // serve, so a guard naming WHICH multiple `expected` sits at would
  // be `pauseFrom` written out again and would hold for whatever the
  // rule became. What is left is still worth asserting — forward,
  // and landing on an interval boundary, are both properties a row
  // typed by hand can fail, and neither is satisfied by an answer
  // that copied the base.
  it('records an answer a whole number of intervals past the base', () => {
    const misplaced = UNBOUNDED_PAUSE_CASES
      .filter((testCase) => !sitsOnAWholeInterval(testCase))
      .map((testCase) => testCase.id);

    expect(misplaced).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A pause with nothing to move its cycle
// ---------------------------------------------------------------------------

describe('pauseFrom — a row carrying neither bound', () => {
  // The positive control the refusal section needs, at roster scale
  // rather than as the single value that section closes on. Every
  // count here is one the rule must take, and a rule refusing
  // whatever it is handed reddens all of them.
  it('refuses none of them', () => {
    const refused = UNBOUNDED_PAUSE_CASES.filter(pauseIsRefused).map((testCase) => testCase.id);

    expect(refused).toEqual([]);
  });

  // The claim the group exists for. Asserted against the recorded
  // column rather than against an instant worked out here, which is
  // where this parts from the clamp sections: those hold an answer
  // against the row's own proposal or bound, and an arithmetic over
  // a base, an interval and a count has no such column to be held
  // against without being the rule a second time. The guard above
  // is what ties the column to a property instead.
  it('answers each with the instant the row records', () => {
    expect(byPause(UNBOUNDED_PAUSE_CASES, pausedInstant))
      .toEqual(byPause(UNBOUNDED_PAUSE_CASES, (testCase) => testCase.expected));
  });
});

// ---------------------------------------------------------------------------
// The pause table, where a bound moves the cycle
// ---------------------------------------------------------------------------

describe('pause case table — the rows a bound moves', () => {
  // The other half of the membership guard above, so the two groups
  // are a partition of the table rather than two lists drawn from
  // it. Written as what the unbounded predicate leaves over, so the
  // pair cannot come to overlap or to leave a row between them.
  it('is exactly the rows in the table that carry a bound', () => {
    const declared = CLAMPED_PAUSE_CASES.map((testCase) => testCase.id);

    const bounded = PAUSE_CASES
      .filter((testCase) => !carriesNoBounds(testCase))
      .map((testCase) => testCase.id);

    expect(sorted(declared)).toEqual(sorted(bounded));
  });

  // Set equality against the declared shapes rather than a count.
  // The three are the shapes the clamp table parts a wrong twin on
  // — a floor with no ceiling is where standing a missing bound in
  // makes the floor do nothing, and crossed bounds are where
  // applying the ceiling first answers with the floor — so three
  // rows all carrying a floor would exercise one delegation three
  // times while reading as coverage of every shape.
  it('holds one row for each bound shape the clamp parts a twin on', () => {
    const covered = CLAMPED_PAUSE_CASES.map(pauseBoundShape);

    expect(sorted(covered)).toEqual(sorted(PAUSE_BOUND_SHAPES));
  });

  // The fixture guard this group cannot do without, and it is the
  // opposite of the one next door: the unbounded group needs a
  // single cycle in it, and this one needs every row to ask for
  // more. At one cycle a rule clamping the whole span answers the
  // same instant as one clamping the length, so a clamped row asking
  // for one would sit here fully green while saying nothing about
  // the order the two operations are applied in.
  it('asks for more than one cycle in every row', () => {
    const single = CLAMPED_PAUSE_CASES
      .filter((testCase) => pauseCycleReach(testCase) !== 'many cycles')
      .map((testCase) => testCase.id);

    expect(single).toEqual([]);
  });

  // The recorded-answer guard, aimed at the one row whose answer a
  // property can name outright. A crossed row's cycle is its
  // CEILING rather than its floor, and multiplying the floor out
  // gives a different instant for every row here, so this is what
  // says the column those rows are judged by carries the property
  // the clamp beside it proves the rule has. The non-empty check is
  // this claim's own vacuity guard, since a filter that matched
  // nothing would compare two empty maps and pass.
  it('records the ceiling multiplied out for the rows that cross', () => {
    const crossed = CLAMPED_PAUSE_CASES.filter(hasCrossedBounds);

    expect(crossed.length).toBeGreaterThan(0);
    expect(byPause(crossed, secondsRecorded)).toEqual(byPause(crossed, ceilingCycles));
  });

  // The guard the whole clamped group rests on. Every claim about
  // these rows compares an answer against `expected`, and a row
  // whose recorded answer happened to equal what a span-clamping
  // rule would give satisfies that comparison for the wrong rule as
  // readily as for the right one — so it would sit in the group
  // fully green while saying nothing, and no other case here would
  // report it. Named per offending row rather than counted, since
  // the repair is to move that row's interval or its count.
  it('records an answer no rule clamping the whole span could give', () => {
    const agreeing = CLAMPED_PAUSE_CASES
      .filter((testCase) => secondsRecorded(testCase) === spanClampedSeconds(testCase))
      .map((testCase) => testCase.id);

    expect(agreeing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A pause whose cycle a bound moves
// ---------------------------------------------------------------------------

describe('pauseFrom — a row whose bounds move the cycle length', () => {
  // The refusal claim aimed where it says most. Bounds that cross
  // are the one input in this table that is not merely unusual but
  // self-contradictory, and they are what a rule that VALIDATED
  // rather than clamped would turn away first. Nothing upstream
  // refuses such a row either: no CHECK relates the two columns.
  it('refuses none of them', () => {
    const refused = CLAMPED_PAUSE_CASES.filter(pauseIsRefused).map((testCase) => testCase.id);

    expect(refused).toEqual([]);
  });

  // The claim this file's third subject exists for, and the only
  // one in it whose content is the ORDER two operations are applied
  // in rather than a value. Every row here is recorded at an
  // instant a span-clamping rule cannot produce — asserted by a
  // guard of its own, which reddens separately — so an answer
  // matching the column is an answer that clamped the length of one
  // cycle and multiplied afterwards. The crossed row carries a
  // second order with it: its cycle is the ceiling, which is what
  // `clampIntervalSeconds` owes for a contradictory pair, so a
  // pause re-deriving the clamp instead of calling it would have to
  // get that right twice.
  it('answers each with the instant the row records', () => {
    expect(byPause(CLAMPED_PAUSE_CASES, pausedInstant))
      .toEqual(byPause(CLAMPED_PAUSE_CASES, (testCase) => testCase.expected));
  });
});

// ---------------------------------------------------------------------------
// The base a pause was handed
// ---------------------------------------------------------------------------

describe('pauseFrom — the base it was handed', () => {
  // Neither claim here is reachable from an answer, which is why
  // they are cases rather than a remark. `setSeconds` and its
  // family move a `Date` in place and hand back a number, so the
  // shortest way to write this arithmetic mutates the caller's
  // instant and answers correctly at the same time — and the
  // caller is a service that read that instant off a stored row.
  // Every other case in this file would stay green for it.
  it('leaves every base where it found it', () => {
    const moved = PAUSE_CASES
      .filter((testCase) => {
        const base = new Date(testCase.base);

        pauseFrom(base, testCase.cycles, testCase.intervalSeconds, testCase.bounds);

        return base.toISOString() !== testCase.base;
      })
      .map((testCase) => testCase.id);

    expect(moved).toEqual([]);
  });

  // The half the claim above cannot reach. A rule that moved the
  // base and answered with THAT object leaves every recorded
  // instant matching, and the mutation claim names it — but a rule
  // that answered the base unmoved for a row whose product came to
  // zero would be caught by neither, so identity is asked about
  // separately from the instant.
  it('answers a Date of its own rather than the one it was handed', () => {
    const handedBack = PAUSE_CASES
      .filter((testCase) => {
        const base = new Date(testCase.base);

        return pauseFrom(base, testCase.cycles, testCase.intervalSeconds, testCase.bounds) === base;
      })
      .map((testCase) => testCase.id);

    expect(handedBack).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Reading the cycle counts the rule turns away
// ---------------------------------------------------------------------------

/**
 * One cycle count the rule turns away: the value, and what the
 * arithmetic would have written to `next_run_at` for it instead.
 *
 * Declared in this file beside the two cap rosters and for the same
 * reason — a value is taken or turned away by one function in one
 * place, so none of the three has anywhere to drift to. The pause
 * TABLE records an answer per row and has none to record for a
 * value that never reaches an answer, which is the other half of
 * why these rows are not in it.
 */
interface RefusedCycles {
  /**
   * Stable id, and what a failure names. Every claim in this
   * section filters the roster and prints the ids left standing, so
   * an offending count is named rather than counted.
   */
  readonly id: string;

  /**
   * What the row stands for, which here is the due time this count
   * would have produced — measured rather than reasoned about,
   * since what the arithmetic does with each of them is the whole of
   * why the rule refuses instead of passing the value through.
   */
  readonly standsFor: string;

  /** The count itself, as a request body would carry it. */
  readonly cycles: number;
}

/**
 * The cycle counts `pauseFrom` refuses, one row per shape of wrong.
 *
 * Five rows for three shapes, because `not an integer` is three
 * separate failures and the arithmetic answers each of them
 * differently. Measured: a zero writes the base back unchanged,
 * which on an overdue row is the extraordinary run the pause was
 * asked to defer; a negative moves the due time INTO the past, so a
 * request to hold a row off triggers it on the next tick; a
 * fraction lands between two intervals at a time no reader can work
 * back out of the row; and `NaN` and either infinity give an
 * `Invalid Date`, which serialises to `null` and stores as a
 * `next_run_at` of NULL — the unscheduled state a pause answers
 * `409` rather than create.
 *
 * None of those is exotic. The count arrives in a request body, and
 * a schema is the first thing to turn one away rather than the only
 * one: this rule is also reached from the MCP surface wave 3
 * registers over the same service functions, and a library that
 * trusted its caller would be trusting whichever of the two got
 * there.
 *
 * Two of those answers are not distinct — `NaN` and an infinity
 * both date as invalid — so the roster is keyed on the shape of the
 * count rather than on what the arithmetic produced, and
 * {@link REFUSED_VALUE_SHAPES} is what a guard holds it against.
 */
const REFUSED_CYCLE_COUNTS: readonly RefusedCycles[] = [
  {
    id: 'cycles-zero',
    standsFor: 'a pause that writes the base back, deferring nothing',
    cycles: 0,
  },
  {
    id: 'cycles-negative',
    standsFor: 'a pause that moves the due time into the past',
    cycles: -1,
  },
  {
    id: 'cycles-fraction',
    standsFor: 'a due time between two intervals that nobody wrote',
    cycles: 2.5,
  },
  {
    id: 'cycles-not-a-number',
    standsFor: 'an Invalid Date, which stores as the NULL a pause refuses',
    cycles: Number.NaN,
  },
  {
    id: 'cycles-infinite',
    standsFor: 'a product past the range a Date can hold, invalid too',
    cycles: Number.POSITIVE_INFINITY,
  },
];

/**
 * The message `pauseFrom` refused a count with, or null when it
 * took the count and answered.
 *
 * A reader rather than a helper that throws, for the reason
 * {@link refusalFor} is one, and it is that function aimed at the
 * other rule. Anything that is not an `Error` is rethrown rather
 * than reported as a refusal: the rule throws a plain `Error` by
 * design, so the message is all there is to pin it by, and a reader
 * taking whatever was thrown would report a `RangeError` raised
 * inside `toISOString` as the refusal under test.
 *
 * The bounds and the interval are the inert pairing, so what this
 * varies is the count alone.
 */
function pauseRefusalFor(cycles: number): string | null {
  try {
    pauseFrom(new Date(REFUSED_PAUSE_BASE), cycles, 3600, UNCLAMPED_BOUNDS);

    return null;
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw cause;
    }

    return cause.message;
  }
}

/** Whether a count's refusal quotes the value it was handed. */
function refusalNamesItsCount(refused: RefusedCycles): boolean {
  const message = pauseRefusalFor(refused.cycles);

  return message !== null && message.includes(String(refused.cycles));
}

// ---------------------------------------------------------------------------
// A cycle count the rule will not take
// ---------------------------------------------------------------------------

describe('pauseFrom — a cycle count that is not a positive integer', () => {
  // The roster guard every section in this file carries, aimed at
  // this roster and holding it against the same five shapes the cap
  // roster is held against. Both rules refuse on one predicate, so
  // a shape one roster covers and the other does not is a gap
  // rather than a difference between them.
  it('holds one count for each shape the rule turns away', () => {
    const covered = REFUSED_CYCLE_COUNTS.map((refused) => positiveIntegerShape(refused.cycles));

    expect(sorted(covered)).toEqual(sorted(REFUSED_VALUE_SHAPES));
  });

  // Filtered rather than asserted per row, so a failure names every
  // count that got through instead of stopping at the first. This
  // is the opposite of what the clamp beside it claims: that rule
  // answers whatever it is handed, and this one turns a count away
  // rather than multiplying by it, which has a plausible-looking
  // answer for every value in the roster and reports none of them.
  it('refuses every one of them', () => {
    const taken = REFUSED_CYCLE_COUNTS
      .filter((refused) => pauseRefusalFor(refused.cycles) === null)
      .map((refused) => refused.id);

    expect(taken).toEqual([]);
  });

  // Not a second reading of the claim above it, and the reason is
  // the reason the rule throws a plain `Error` at all: it is
  // spliced into a Code node, where a throw reaches an operator as
  // its message and a constructor name crosses nothing. So there is
  // no class to pin the refusal by, and a bare `it threw` is green
  // for any failure on the path — including the `RangeError` an
  // `Invalid Date` raises when something downstream asks it for
  // text. The value quoted in the message is what parts this
  // refusal from those.
  it('names the count it was handed in every refusal', () => {
    const silent = REFUSED_CYCLE_COUNTS
      .filter((refused) => !refusalNamesItsCount(refused))
      .map((refused) => refused.id);

    expect(silent).toEqual([]);
  });

  // The guard the three claims above rest on, and the only case in
  // this section that moves when the rule refuses EVERYTHING: a
  // section of nothing but refusals is fully green for a function
  // that turns away whatever it is handed. A count of 1 rather than
  // a comfortable one, because it is a single step from the zero
  // the roster refuses — a guard built on a count nobody would
  // question says nothing about where the rule is keyed. The two
  // sections of positive claims above are what stop this line being
  // the whole of the evidence.
  it('takes the smallest count it admits', () => {
    expect(pauseRefusalFor(1)).toBeNull();
  });
});
