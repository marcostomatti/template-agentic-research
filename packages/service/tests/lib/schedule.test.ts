/**
 * The scheduling arithmetic `ar-dispatch` applies to a row it has
 * claimed, driven over the case table beside this file.
 *
 * What is covered so far is `clampIntervalSeconds` over a row that
 * carries no bounds at all: nothing is refused, and what comes back
 * is what was handed in. `src/lib/schedule.ts` states both in one
 * breath — a row carrying neither bound gets back exactly what it
 * was handed, and every input has an answer — and this is where that
 * stops being a sentence. The rows carrying a floor, a ceiling and
 * two bounds that cross, and everything `capBatch` owes, arrive
 * later in this plan.
 *
 * The standing limit belongs in front of the cases rather than
 * behind them: both claims here hold for a function that returns its
 * first argument and does nothing else. An identity claim cannot say
 * otherwise, and no guard in this file supplies what it is missing.
 * What parts the two is a row with a bound on it, so a green run of
 * this file today is evidence that the unbounded path is total and
 * leaves a proposal alone, and evidence of nothing about the clamp.
 *
 * The rows are imported rather than written here because the same
 * ones drive the SQL expression the dispatcher carries and the
 * spliced copy a Code node runs. That makes the table a second thing
 * worth guarding: a claim written as a walk over a roster passes
 * when the roster is empty, and both claims here are such walks.
 */
import type { ClampCase } from './schedule-cases.js';

import { describe, expect, it } from 'vitest';

import { clampIntervalSeconds } from '../../src/lib/schedule.js';

import { CLAMP_CASES, UNBOUNDED_CLAMP_CASES } from './schedule-cases.js';

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
 */
function byId(
  cases: readonly ClampCase[],
  read: (testCase: ClampCase) => number,
): Record<string, number> {
  return Object.fromEntries(cases.map((testCase) => [testCase.id, read(testCase)]));
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

describe('clamp case table — the rows carrying no bounds', () => {
  // What stands behind both claims in this file. Each is a walk over
  // this roster compared as a single map, and a walk over no rows
  // compares an empty map against an empty map and passes. The
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
  // — the guard above is where the recorded column is tied to the
  // same property, and it fails on its own when the two part.
  it('answers each with the interval it was handed', () => {
    const answered = byId(
      UNBOUNDED_CLAMP_CASES,
      (testCase) => clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    );

    expect(answered).toEqual(byId(UNBOUNDED_CLAMP_CASES, (testCase) => testCase.intervalSeconds));
  });
});
