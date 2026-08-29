import { describe, expect, it } from 'vitest';

import {
  UNHEALTHY_FRACTION,
  WEEK_SPEND,
  classifySpend,
  getSpendSummary,
} from './spend';

/**
 * A ceiling the boundary cases below are built against.
 *
 * A thousand rather than the fixture's own two million because every
 * share of it lands exactly on a double: `1000 * 0.8` is 800 and
 * `800 / 1000` is the same double the threshold constant holds, so a
 * boundary case says what it means instead of drifting an ulp off it
 * and reading as an assertion about floating point.
 */
const PROBE_LIMIT = 1000;

describe('WEEK_SPEND', () => {
  it('spends a partial week against a round ceiling', () => {
    // The value pin, and the non-emptiness guard every claim below
    // rests on: a fixture that lost `used` or `limit` satisfies a
    // "has the members" style assertion vacuously. The expected side
    // is a literal rather than anything derived from the module, so
    // this is a claim about the values and not a restatement of them.
    // Arrange / Act / Assert
    expect(WEEK_SPEND).toEqual({
      status: 'healthy',
      used: 1_042_800,
      limit: 2_000_000,
      unit: 'tokens',
    });
  });

  it('reads its status rather than carrying a written one', () => {
    // Not a tautology, and worth naming for what it claims: the
    // module builds `status` by calling the classifier, so what this
    // catches is a later edit writing the pill's answer in by hand —
    // which would go on reporting `healthy` after the spend beside it
    // was raised past the ceiling, the one state the pill exists to
    // announce. Passing the whole summary also exercises the
    // classifier's `Pick` parameter from a caller that holds one.
    // Arrange / Act / Assert
    expect(WEEK_SPEND.status).toBe(classifySpend(WEEK_SPEND));
  });

  it('fills the bar visibly without reaching the threshold', () => {
    // The band a demo depends on. `SidebarWeekSummary` renders
    // used-over-limit as a `Progress` bar, and a fixture at zero or
    // at the ceiling renders the same as a bar whose value never
    // bound. Under the threshold too, so the sidebar's resting state
    // is the healthy pill.
    // Arrange / Act
    const share = WEEK_SPEND.used / WEEK_SPEND.limit;

    // Assert
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(UNHEALTHY_FRACTION);
  });

  it('names the quantity it counts', () => {
    // A guard rather than a value claim — the pin above holds the
    // value. `unit` is required precisely because the component
    // defaults it, and a blank one renders as a caption ending in a
    // number and a space, which reads as a truncation rather than as
    // a fixture member somebody emptied.
    // Arrange / Act / Assert
    expect(WEEK_SPEND.unit.trim()).not.toBe('');
  });

  it('refuses a write to the fixture', () => {
    // One object handed to every caller and no accessor copying it,
    // so a page writing here changes what every later reader in the
    // tab sees and then loses it on reload — the version that looks
    // like it worked. Every member is a primitive, so unlike
    // `./settings.ts` the shallow freeze is the whole freeze and
    // there is no nested payload for a second assertion to reach.
    // Arrange
    const before = WEEK_SPEND.used;

    // Act / Assert
    expect(() => {
      (WEEK_SPEND as { used: number }).used = 0;
    }).toThrow(TypeError);
    expect(WEEK_SPEND.used).toBe(before);
  });
});

describe('UNHEALTHY_FRACTION', () => {
  it('turns the pill at four fifths of the ceiling', () => {
    // The one test holding the VALUE. Every case below builds its
    // spend out of the constant, so those hold the relation and would
    // survive a decision to move the threshold; this is what makes
    // moving it a deliberate edit rather than a silent one.
    // Arrange / Act / Assert
    expect(UNHEALTHY_FRACTION).toBe(0.8);
  });
});

describe('classifySpend', () => {
  it('reads a spend well under the threshold as healthy', () => {
    // The ordinary case, and the one the fixture itself sits in.
    // Arrange
    const used = PROBE_LIMIT / 2;

    // Act / Assert
    expect(classifySpend({ used, limit: PROBE_LIMIT })).toBe('healthy');
  });

  it('reads a spend exactly at the threshold as unhealthy', () => {
    // The boundary is inclusive and this is the only case that says
    // so — `>` and `>=` agree on every other spend. A week landing on
    // the line is at the share the pill exists to announce, so giving
    // the line to the healthy side would announce it one token late.
    // Arrange
    const used = PROBE_LIMIT * UNHEALTHY_FRACTION;

    // Act / Assert
    expect(classifySpend({ used, limit: PROBE_LIMIT })).toBe('unhealthy');
  });

  it('reads a spend one token under the threshold as healthy', () => {
    // The other half of the boundary pair. Without it the case above
    // passes just as happily against a classifier that calls
    // everything unhealthy.
    // Arrange
    const used = PROBE_LIMIT * UNHEALTHY_FRACTION - 1;

    // Act / Assert
    expect(classifySpend({ used, limit: PROBE_LIMIT })).toBe('healthy');
  });

  it('reads a spend past the ceiling as unhealthy', () => {
    // Over the limit rather than merely near it: the ratio exceeds
    // one, which a threshold written as an equality rather than as a
    // comparison would sail straight past.
    // Arrange
    const used = PROBE_LIMIT * 2;

    // Act / Assert
    expect(classifySpend({ used, limit: PROBE_LIMIT })).toBe('unhealthy');
  });

  it('reads a week with nothing spent as healthy', () => {
    // The empty end of the range. A week that has not started is the
    // state the sidebar opens in every Monday.
    // Arrange / Act / Assert
    expect(classifySpend({ used: 0, limit: PROBE_LIMIT }))
      .toBe('healthy');
  });

  it('reads use against a ceiling of nothing as unhealthy', () => {
    // The `NaN` trap the classifier guards, and the reason the guard
    // comes first: `1 / 0` is `Infinity` and would be caught by the
    // ratio anyway, but a negative ceiling divides to a negative
    // share that reads as comfortably healthy. Neither is a budget
    // anything can be under.
    // Arrange / Act / Assert
    expect(classifySpend({ used: 1, limit: 0 })).toBe('unhealthy');
    expect(classifySpend({ used: 1, limit: -1 })).toBe('unhealthy');
  });

  it('reads no use against a ceiling of nothing as healthy', () => {
    // `0 / 0` is `NaN` and every comparison against it is false, so
    // a classifier carrying no guard at all lands on the right
    // answer here by accident. What this case pins is therefore the
    // guard's own inner boundary rather than the guard's existence:
    // it is `used > 0` and not `used >= 0` that keeps a week which
    // has spent nothing against no budget out of the pill.
    // Arrange / Act / Assert
    expect(classifySpend({ used: 0, limit: 0 })).toBe('healthy');
  });
});

describe('getSpendSummary', () => {
  it('hands back the frozen fixture rather than a copy', () => {
    // Identity, deliberately, and not equality. A spread copy would
    // satisfy `toEqual` while being a fresh UNFROZEN object — the one
    // thing a caller can write in place and believe the write took —
    // so identity is the only form of this assertion that fails on
    // the mutation it exists to catch.
    // Arrange / Act / Assert
    expect(getSpendSummary()).toBe(WEEK_SPEND);
    expect(Object.isFrozen(getSpendSummary())).toBe(true);
  });
});
