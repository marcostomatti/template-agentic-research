/**
 * Cases for `src/lib/source-health.ts`: what one fetch outcome makes
 * of a source's four health columns.
 *
 * The library is one function and four assignments, which makes the
 * ways it can go wrong quiet rather than few — every wrong answer
 * here is a well-formed row that a later query reads without
 * complaint. A counter reset to `null` instead of `0` reads as a
 * source nobody has fetched. A `last_success_at` filled in on a
 * failure dates a success that never happened. A flag cleared by a
 * success turns a rot detector into a report about the last pass
 * only. None of those throws, and none of them shows up anywhere but
 * in a case that pinned the whole answer.
 *
 * So every case here asserts the WHOLE object rather than the member
 * it is about. A claim about the counter that leaves the stamps
 * unread is satisfied by three quarters of a wrong answer.
 *
 * House order, with the plan's two additions in front of the
 * ordinary paths. The refusal first, since it is the only one the
 * module has. Then the threshold boundary, driven off
 * {@link CONSECUTIVE_FAILURE_THRESHOLD} rather than off the number it
 * currently holds, so re-tuning the bound moves the cases with it.
 * Then a source that has never succeeded, because a null carried
 * through a run of failures is the reading a repair breaks first and
 * the one no ordinary case would notice. The ordinary paths follow,
 * and the shape guards close the file.
 */
import type {
  FetchOutcome,
  SourceHealthOptions,
  SourceHealthState,
  SourceMoment,
} from '../../src/lib/source-health.js';

import { describe, expect, it } from 'vitest';

import {
  CONSECUTIVE_FAILURE_THRESHOLD,
  sourceHealth,
} from '../../src/lib/source-health.js';

// ---------------------------------------------------------------------------
// The rows and outcomes every section is driven over
// ---------------------------------------------------------------------------

/**
 * When the outcome under test happened.
 *
 * A `Date` rather than a string, so the carry-through cases can
 * assert on IDENTITY: a stamp that came back as the same object is a
 * stamp nothing parsed, normalised or rebuilt on the way through.
 */
const FETCHED_AT = new Date('2026-08-30T09:00:00.000Z');

/** A moment before it, for a row that already carries stamps. */
const EARLIER = new Date('2026-08-29T09:00:00.000Z');

/** A source row nobody has fetched yet, as the defaults leave it. */
const NEVER_FETCHED: SourceHealthState = {
  consecutiveFailures: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  flagged: false,
};

/**
 * A fetch that ended badly.
 *
 * @param at - When it happened.
 * @returns The outcome.
 */
function failedAt(at: SourceMoment): FetchOutcome {
  return { succeeded: false, at };
}

/**
 * A fetch the contract accepted.
 *
 * @param at - When it happened.
 * @returns The outcome.
 */
function succeededAt(at: SourceMoment): FetchOutcome {
  return { succeeded: true, at };
}

/**
 * The row a run of failures leaves behind, applied one at a time.
 *
 * Applied rather than constructed, because a state written by hand
 * would assert the counter against a number this file chose instead
 * of against what the module actually does with a streak.
 *
 * @param count - How many failures in a row.
 * @param options - The threshold, when it is not the default.
 * @returns The row after the last of them.
 */
function afterFailures(
  count: number,
  options?: SourceHealthOptions,
): SourceHealthState {
  let state = NEVER_FETCHED;

  for (let taken = 0; taken < count; taken += 1) {
    state = sourceHealth(state, failedAt(FETCHED_AT), options);
  }

  return state;
}

// ---------------------------------------------------------------------------
// The one refusal
// ---------------------------------------------------------------------------

/** One threshold nobody could have meant, and why it is one. */
interface RefusedThreshold {
  /** The entry, for a failure to name. */
  readonly id: string;

  /** What is wrong with it, as a case title reads. */
  readonly describes: string;

  /** The value itself. */
  readonly threshold: number;

  /** How it prints, as the message is expected to quote it. */
  readonly printed: string;
}

/**
 * Every threshold the module refuses.
 *
 * Both halves of the argument in its header are represented: the
 * values at or below zero, which would flag every source they were
 * applied to, and the values that are not finite integers, which a
 * comparison silently answers false for forever. `NaN` is the one to
 * find here rather than in an incident — it is what `Number` makes of
 * a setting that did not parse.
 */
const REFUSED_THRESHOLDS: readonly RefusedThreshold[] = [
  {
    id: 'zero',
    describes: 'a threshold of zero, which flags on every outcome',
    threshold: 0,
    printed: '0',
  },
  {
    id: 'negative',
    describes: 'a negative threshold',
    threshold: -1,
    printed: '-1',
  },
  {
    id: 'fraction',
    describes: 'a fraction, which no counter ever equals',
    threshold: 1.5,
    printed: '1.5',
  },
  {
    id: 'nan',
    describes: 'the NaN an unparsed setting becomes',
    threshold: Number.NaN,
    printed: 'NaN',
  },
  {
    id: 'infinite',
    describes: 'an infinite threshold, which nothing reaches',
    threshold: Number.POSITIVE_INFINITY,
    printed: 'Infinity',
  },
];

describe('sourceHealth — the threshold it will not accept', () => {
  it('registers each refused threshold once', () => {
    const ids = REFUSED_THRESHOLDS.map((entry) => entry.id);

    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  for (const entry of REFUSED_THRESHOLDS) {
    it(`refuses ${entry.describes}`, () => {
      const call = (): SourceHealthState => sourceHealth(
        NEVER_FETCHED,
        failedAt(FETCHED_AT),
        { consecutiveFailureThreshold: entry.threshold },
      );

      expect(call).toThrow('[source-health]');
      expect(call).toThrow(`not ${entry.printed}.`);
    });
  }

  it('accepts the smallest threshold there is', () => {
    // The positive control, varied along the axis the refusals are
    // taken on: a module refusing every threshold would satisfy every
    // case above and none of this one.
    const call = (): SourceHealthState => sourceHealth(
      NEVER_FETCHED,
      failedAt(FETCHED_AT),
      { consecutiveFailureThreshold: 1 },
    );

    expect(call).not.toThrow();
  });

  it('accepts a call naming no threshold at all', () => {
    expect(() => sourceHealth(NEVER_FETCHED, failedAt(FETCHED_AT)))
      .not.toThrow();
    expect(() => sourceHealth(NEVER_FETCHED, failedAt(FETCHED_AT), {}))
      .not.toThrow();
  });

  it('refuses a threshold that arrived as text', () => {
    // The shape the header names as the reason for a throw rather
    // than a fallback: a setting read out of configuration is a
    // string, and `2` is a value a fallback would hide behind.
    const call = (): SourceHealthState => sourceHealth(
      NEVER_FETCHED,
      failedAt(FETCHED_AT),
      { consecutiveFailureThreshold: '2' as unknown as number },
    );

    expect(call).toThrow('[source-health]');
  });

  it('holds its own default to the rule it applies to a caller', () => {
    expect(Number.isInteger(CONSECUTIVE_FAILURE_THRESHOLD)).toBe(true);
    expect(CONSECUTIVE_FAILURE_THRESHOLD).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The boundary the flag is set at
// ---------------------------------------------------------------------------

/** One run of failures, and whether it should have flagged. */
interface BoundaryCase {
  /** The entry, for a failure to name. */
  readonly id: string;

  /** What the run is, as a case title reads. */
  readonly describes: string;

  /** The threshold in force, or `undefined` for the default. */
  readonly threshold: number | undefined;

  /** How many failures in a row. */
  readonly failures: number;

  /** Whether the row should come back flagged. */
  readonly flagged: boolean;
}

/**
 * The boundary, read from both sides at three thresholds.
 *
 * The default rows are expressed against
 * {@link CONSECUTIVE_FAILURE_THRESHOLD} rather than against the five
 * it currently holds, so re-tuning the bound moves these cases with
 * it instead of turning them red. The override rows are literals on
 * purpose: they are what says the option is read at all, and a row
 * derived from the same constant could not tell the option being
 * honoured from the default being applied twice.
 */
const BOUNDARY_CASES: readonly BoundaryCase[] = [
  {
    id: 'default-one-short',
    describes: 'one failure short of the default bound',
    threshold: undefined,
    failures: CONSECUTIVE_FAILURE_THRESHOLD - 1,
    flagged: false,
  },
  {
    id: 'default-at',
    describes: 'the failure that reaches the default bound',
    threshold: undefined,
    failures: CONSECUTIVE_FAILURE_THRESHOLD,
    flagged: true,
  },
  {
    id: 'default-past',
    describes: 'a run that carries on past the default bound',
    threshold: undefined,
    failures: CONSECUTIVE_FAILURE_THRESHOLD + 1,
    flagged: true,
  },
  {
    id: 'override-one',
    describes: 'a threshold of one, which flags on the first failure',
    threshold: 1,
    failures: 1,
    flagged: true,
  },
  {
    id: 'override-two-short',
    describes: 'one failure under a threshold of two',
    threshold: 2,
    failures: 1,
    flagged: false,
  },
  {
    id: 'override-two-at',
    describes: 'the second failure under a threshold of two',
    threshold: 2,
    failures: 2,
    flagged: true,
  },
  {
    id: 'override-above-default',
    describes: 'a bound raised past where the default would have fired',
    threshold: CONSECUTIVE_FAILURE_THRESHOLD + 3,
    failures: CONSECUTIVE_FAILURE_THRESHOLD + 1,
    flagged: false,
  },
];

describe('sourceHealth — crossing the consecutive-failure threshold', () => {
  it('registers each boundary case once', () => {
    const ids = BOUNDARY_CASES.map((entry) => entry.id);

    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  it('reads the boundary from both sides at every threshold', () => {
    // A table that only ever asserted one side would pass for a
    // module that flagged on every failure, and one that only ever
    // asserted the other would pass for a module that never flagged.
    const flagged = BOUNDARY_CASES.filter((entry) => entry.flagged);
    const clear = BOUNDARY_CASES.filter((entry) => !entry.flagged);

    expect(flagged.length).toBeGreaterThan(0);
    expect(clear.length).toBeGreaterThan(0);
  });

  for (const entry of BOUNDARY_CASES) {
    it(`answers ${entry.describes}`, () => {
      const options = entry.threshold === undefined
        ? undefined
        : { consecutiveFailureThreshold: entry.threshold };

      expect(afterFailures(entry.failures, options)).toEqual({
        consecutiveFailures: entry.failures,
        lastSuccessAt: null,
        lastFailureAt: FETCHED_AT,
        flagged: entry.flagged,
      });
    });
  }

  it('flags a counter that arrived already past the bound', () => {
    // `>=` rather than `===`: a threshold lowered between passes, or
    // a row edited at a psql prompt, leaves a counter that never
    // equals the bound on its way up. An equality would step over it
    // and never flag the source at all.
    const prior: SourceHealthState = {
      consecutiveFailures: CONSECUTIVE_FAILURE_THRESHOLD + 4,
      lastSuccessAt: EARLIER,
      lastFailureAt: EARLIER,
      flagged: false,
    };

    expect(sourceHealth(prior, failedAt(FETCHED_AT))).toEqual({
      consecutiveFailures: CONSECUTIVE_FAILURE_THRESHOLD + 5,
      lastSuccessAt: EARLIER,
      lastFailureAt: FETCHED_AT,
      flagged: true,
    });
  });

  it('cannot flag on a success at any threshold it accepts', () => {
    const thresholds = [1, 2, CONSECUTIVE_FAILURE_THRESHOLD];
    const flagged = thresholds.filter((threshold) => sourceHealth(
      NEVER_FETCHED,
      succeededAt(FETCHED_AT),
      { consecutiveFailureThreshold: threshold },
    ).flagged);

    expect(flagged).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A source that has never once worked
// ---------------------------------------------------------------------------

describe('sourceHealth — a source with no success behind it', () => {
  it('leaves last_success_at null through a run of failures', () => {
    // The reading the two stamps exist to make possible: this row and
    // a row that worked last week are different diagnoses, and a
    // module filling the stamp in on a failure would collapse them.
    const state = afterFailures(CONSECUTIVE_FAILURE_THRESHOLD);

    expect(state.lastSuccessAt).toBeNull();
    expect(state).toEqual({
      consecutiveFailures: CONSECUTIVE_FAILURE_THRESHOLD,
      lastSuccessAt: null,
      lastFailureAt: FETCHED_AT,
      flagged: true,
    });
  });

  it('counts its very first failure as a streak of one', () => {
    expect(sourceHealth(NEVER_FETCHED, failedAt(FETCHED_AT))).toEqual({
      consecutiveFailures: 1,
      lastSuccessAt: null,
      lastFailureAt: FETCHED_AT,
      flagged: false,
    });
  });

  it('leaves last_failure_at null on its very first success', () => {
    expect(sourceHealth(NEVER_FETCHED, succeededAt(FETCHED_AT))).toEqual({
      consecutiveFailures: 0,
      lastSuccessAt: FETCHED_AT,
      lastFailureAt: null,
      flagged: false,
    });
  });
});

// ---------------------------------------------------------------------------
// The ordinary paths
// ---------------------------------------------------------------------------

/** A source mid-streak, with both stamps already written. */
const MID_STREAK: SourceHealthState = {
  consecutiveFailures: 2,
  lastSuccessAt: EARLIER,
  lastFailureAt: EARLIER,
  flagged: false,
};

describe('sourceHealth — a success', () => {
  it('resets the counter to a real zero rather than to null', () => {
    const state = sourceHealth(MID_STREAK, succeededAt(FETCHED_AT));

    // `Object.is` rather than a comparison, because `null == 0` is
    // false but `expect(null).toEqual(0)` is the only reading a
    // careless assertion takes, and a count is the one column here
    // that HAS a real zero.
    expect(Object.is(state.consecutiveFailures, 0)).toBe(true);
    expect(state).toEqual({
      consecutiveFailures: 0,
      lastSuccessAt: FETCHED_AT,
      lastFailureAt: EARLIER,
      flagged: false,
    });
  });

  it('moves last_success_at and leaves last_failure_at alone', () => {
    const state = sourceHealth(MID_STREAK, succeededAt(FETCHED_AT));

    // Identity, not equality: a stamp that came back as the same
    // object is one nothing parsed or rebuilt on the way through,
    // which is what lets a caller hand in whichever representation
    // it writes with.
    expect(state.lastSuccessAt).toBe(FETCHED_AT);
    expect(state.lastFailureAt).toBe(EARLIER);
  });

  it('does not clear a flag that is already standing', () => {
    // Clearing is an operator's act. The detector saw a run of
    // failures stop, which is what a fixed source looks like and
    // also what a cached page, an error document served with a 200
    // and an empty result set look like.
    const flagged: SourceHealthState = { ...MID_STREAK, flagged: true };

    expect(sourceHealth(flagged, succeededAt(FETCHED_AT))).toEqual({
      consecutiveFailures: 0,
      lastSuccessAt: FETCHED_AT,
      lastFailureAt: EARLIER,
      flagged: true,
    });
  });

  it('resets a streak that had already flagged the source', () => {
    const state = afterFailures(CONSECUTIVE_FAILURE_THRESHOLD);

    expect(sourceHealth(state, succeededAt(EARLIER))).toEqual({
      consecutiveFailures: 0,
      lastSuccessAt: EARLIER,
      lastFailureAt: FETCHED_AT,
      flagged: true,
    });
  });
});

describe('sourceHealth — a failure', () => {
  it('adds one to the streak and moves last_failure_at', () => {
    const state = sourceHealth(MID_STREAK, failedAt(FETCHED_AT));

    expect(state.lastFailureAt).toBe(FETCHED_AT);
    expect(state).toEqual({
      consecutiveFailures: 3,
      lastSuccessAt: EARLIER,
      lastFailureAt: FETCHED_AT,
      flagged: false,
    });
  });

  it('reads an outcome that is not exactly true as a failure', () => {
    // The value crosses a JSON boundary on its way into a Code node,
    // and the two ways of being wrong are not symmetric: a truthy
    // non-boolean read as a success clears the streak and leaves a
    // rotted source looking healthy.
    const truthy = [1, 'true', 'yes', {}];
    const streaks = truthy.map((value) => sourceHealth(
      MID_STREAK,
      { succeeded: value as unknown as boolean, at: FETCHED_AT },
    ).consecutiveFailures);

    expect(streaks).toEqual([3, 3, 3, 3]);
  });

  it('restarts the streak when the counter cannot be read', () => {
    // A row disagreeing with its own NOT NULL DEFAULT 0 column, which
    // is what a value arriving over JSON can look like. Reading it as
    // zero costs a few passes; reading it as anything larger would
    // flag a source on a number nobody wrote, and nothing here
    // clears a flag.
    const unreadable = [
      Number.NaN,
      -3,
      2.5,
      null as unknown as number,
      '4' as unknown as number,
    ];
    const streaks = unreadable.map((value) => sourceHealth(
      { ...MID_STREAK, consecutiveFailures: value },
      failedAt(FETCHED_AT),
    ).consecutiveFailures);

    expect(streaks).toEqual([1, 1, 1, 1, 1]);
  });

  it('carries a moment through in whatever shape it arrived in', () => {
    // No parsing and no normalisation: the representation belongs to
    // whoever writes the column, and a caller building SQL in a Code
    // node holds a string where one writing through drizzle holds a
    // Date.
    const text = '2026-08-30T09:00:00.000Z';
    const state = sourceHealth(NEVER_FETCHED, failedAt(text));

    expect(state.lastFailureAt).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// What an answer is, and what it leaves alone
// ---------------------------------------------------------------------------

describe('sourceHealth — the shape of an answer', () => {
  it('carries the four health columns and no others', () => {
    // `enabled` is the one to find missing here. It is an operator's
    // column with an operator's writer, and an answer that mentioned
    // it is an answer somebody would eventually put in the UPDATE
    // these members are built into.
    const outcomes = [succeededAt(FETCHED_AT), failedAt(FETCHED_AT)];
    const keys = outcomes.map((outcome) => Object.keys(
      sourceHealth(MID_STREAK, outcome),
    ).sort());

    expect(keys).toEqual([
      [
        'consecutiveFailures',
        'flagged',
        'lastFailureAt',
        'lastSuccessAt',
      ],
      [
        'consecutiveFailures',
        'flagged',
        'lastFailureAt',
        'lastSuccessAt',
      ],
    ]);
  });

  it('leaves the row it was handed exactly as it found it', () => {
    const prior: SourceHealthState = { ...MID_STREAK };

    sourceHealth(prior, failedAt(FETCHED_AT));
    sourceHealth(prior, succeededAt(FETCHED_AT));

    expect(prior).toEqual(MID_STREAK);
  });

  it('answers a new object rather than the row it was handed', () => {
    expect(sourceHealth(MID_STREAK, failedAt(FETCHED_AT)))
      .not.toBe(MID_STREAK);
  });
});
