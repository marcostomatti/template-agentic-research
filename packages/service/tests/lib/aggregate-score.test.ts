/**
 * Cases for `src/lib/aggregate-score.ts`: everything that is not a
 * measurement first, then the parts a scheme cannot score from, and
 * only then a record it can.
 *
 * That order is the file's argument rather than its layout. This
 * module exists to keep an absent measurement apart from a measured
 * zero, so the readings that decide whether it works are the ones
 * where nothing was measured — a key nobody wrote, a column that
 * came back empty, text that is not a number. A suite opening with
 * a fully measured record would pass over all of them, because that
 * record scores correctly under any version of this arithmetic,
 * including one that folds absence into zero.
 *
 * ## Where this file stops and the parity suite starts
 *
 * The original exports one function, and it is compared directly in
 * `tests/parity/aggregate-score.parity.test.ts` over a corpus far
 * wider than anything written out here — every combination of six
 * slot values, the shared adversarial roster in every slot, and a
 * sweep across the rounding boundaries. Reproducing that here would
 * be the same measurement twice.
 *
 * What this file adds is the half a comparison cannot have. The
 * coercions are exported by the port and not by the original, so
 * inside the parity leg they are only ever reached COMPOSITIONALLY,
 * through the total; a pair of errors cancelling between the
 * coercion and the sum agrees there. Each is driven on its own
 * here. And every reading the port has that the original has no
 * parameter for — a scheme with no anchor, a scheme whose shares
 * come to nothing, the order the parts are summed in — has no
 * comparison available at all, so these cases are the whole record
 * of what it does.
 *
 * ## The scheme the cases are driven against
 *
 * {@link SCHEME} is authored here and is not the original's. It has
 * the shape the original's had — several weighted parts, one of
 * them renormalizing, two multiplicative penalties — because that
 * is the shape the arithmetic has branches for, and its keys are
 * placeholder words because what a domain calls its signals is the
 * domain's business and none of this module's.
 *
 * Its numbers are chosen so the expectations can be read rather
 * than recomputed: the weighted shares come to exactly 1, so a
 * fully measured record scores on the same 0-to-100 scale its
 * measurements are on, and a record with the renormalizing part
 * absent is divided by exactly the 0.8 the other three carry.
 */
import type {
  ScorePenalty,
  ScoreSpec,
} from '../../src/lib/aggregate-score.js';

import { describe, expect, it } from 'vitest';

import {
  PART_ABSENCES,
  aggregateTotal,
  orZero,
  penaltyFactor,
  toFinite,
} from '../../src/lib/aggregate-score.js';

// ---------------------------------------------------------------------------
// The scheme, and the values that are not measurements
// ---------------------------------------------------------------------------

/**
 * A scoring scheme with one of everything the arithmetic branches
 * on: three parts whose absence counts as zero, one that
 * renormalizes, and two penalties applied in order.
 */
const SCHEME: ScoreSpec = {
  parts: [
    { key: 'alpha', weight: 0.3, absent: 'counts-zero' },
    { key: 'bravo', weight: 0.25, absent: 'counts-zero' },
    { key: 'charlie', weight: 0.25, absent: 'counts-zero' },
    { key: 'delta', weight: 0.2, absent: 'renormalizes' },
  ],
  penalties: [
    { key: 'echo', coefficient: 0.5, scale: 100 },
    { key: 'foxtrot', coefficient: 0.3, scale: 10 },
  ],
};

/** The first penalty of {@link SCHEME}, for the cases driving one. */
const HALVING_PENALTY: ScorePenalty = {
  key: 'echo',
  coefficient: 0.5,
  scale: 100,
};

/**
 * A value whose own conversion to a number refuses.
 *
 * Installed with {@link Object.defineProperty} rather than written
 * as an object literal, because a literal method is an own
 * enumerable key and this value is supposed to be indistinguishable
 * from an ordinary object until something tries to read a number
 * out of it.
 *
 * Both hooks refuse, and both are needed: a number coercion
 * consults `valueOf` first, and would fall through to `toString`
 * with the object it got back.
 *
 * @returns A fresh one, since a case may leave it in a spec.
 */
function hostileValue(): object {
  const value = {};
  const refuse = (): never => {
    throw new Error('this value refuses to become a number');
  };

  Object.defineProperty(value, 'valueOf', { value: refuse });
  Object.defineProperty(value, 'toString', { value: refuse });

  return value;
}

// ---------------------------------------------------------------------------
// The coercions, on their own
// ---------------------------------------------------------------------------

describe('toFinite — absence, and everything that is not a number', () => {
  // The three spellings of nothing was measured. A column never
  // written, a key that is not there, and the empty cell a delimited
  // export arrives with: all one answer, and it is not zero.
  it('answers null for every spelling of absence', () => {
    expect(toFinite(null)).toBeNull();
    expect(toFinite(undefined)).toBeNull();
    expect(toFinite('')).toBeNull();
  });

  // Present, and still no measurement. Each of these converts to
  // something a total cannot be built out of, and answering zero for
  // any of them would put a record at the bottom of a ranking on the
  // strength of a value nobody could read.
  it('answers null for anything that is not a finite number', () => {
    const unreadable = [
      'x', '7x', '+', '-', {}, [1, 2], Number.NaN, 'NaN',
      Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 'Infinity',
      () => 7,
    ];

    expect(unreadable.map((value) => toFinite(value))).toEqual(
      unreadable.map(() => null),
    );
  });

  // The one refusal this coercion does not turn into null, and it is
  // the language's rather than this module's: a value whose own
  // conversion throws takes the call down. Asserted by what the
  // sentence is NOT, since a version that caught the throw and
  // answered null would pass an assertion that merely something was
  // raised.
  it('lets a value that refuses conversion raise', () => {
    expect(() => toFinite(hostileValue()))
      .toThrow('this value refuses to become a number');
    expect(() => toFinite(Symbol('a measurement'))).toThrow(TypeError);
  });

  // Measured, and worth nothing. The distinction the whole module is
  // for, from the other side.
  it('answers a measured zero as zero', () => {
    expect(toFinite(0)).toBe(0);
    expect(toFinite('0')).toBe(0);
    expect(toFinite(false)).toBe(0);
  });

  // The line between absence and a measured zero falls in a place
  // nobody would choose, and it is the original's: an empty cell is
  // absence, and a cell holding one space is a measured zero,
  // because that is where `Number` puts them. Pinned rather than
  // repaired — the parity suite is the gate that decides whether
  // this port landed, and a whitespace-trimming coercion would fail
  // it.
  it('reads whitespace as a measured zero, where empty is absence', () => {
    expect(toFinite('')).toBeNull();
    expect(toFinite(' ')).toBe(0);
    expect(toFinite('\t\n')).toBe(0);
  });

  // A negative zero survives, which matters because it does not
  // survive `===`. Asserted with `Object.is`, which is also what the
  // parity differ compares primitives with.
  it('keeps a negative zero apart from a zero', () => {
    expect(Object.is(toFinite(-0), -0)).toBe(true);
    expect(Object.is(toFinite('-0'), -0)).toBe(true);
    expect(Object.is(toFinite(0), -0)).toBe(false);
  });

  // Numeric strings are numbers, and this is not a convenience: a
  // driver reading a wide-precision column hands back a string
  // rather than lose digits, so this is what a stored measurement
  // looks like on the way out.
  it('reads the numeric strings a driver returns', () => {
    expect(toFinite('7')).toBe(7);
    expect(toFinite(' 7 ')).toBe(7);
    expect(toFinite('7.5')).toBe(7.5);
    expect(toFinite('-3')).toBe(-3);
    expect(toFinite('1e2')).toBe(100);
  });
});

describe('orZero — absence, where absence means no contribution', () => {
  it('answers zero for absence and for anything unreadable', () => {
    const nothing = [null, undefined, '', 'x', Number.NaN, {}];

    expect(nothing.map((value) => orZero(value))).toEqual(
      nothing.map(() => 0),
    );
  });

  it('answers the number when there is one', () => {
    expect(orZero(7)).toBe(7);
    expect(orZero('7')).toBe(7);
    expect(Object.is(orZero(-0), -0)).toBe(true);
  });

  it('lets a value that refuses conversion raise', () => {
    expect(() => orZero(hostileValue()))
      .toThrow('this value refuses to become a number');
  });
});

describe('penaltyFactor — the reduction, or none at all', () => {
  // A penalty nothing measured leaves the total alone. Exactly one,
  // not something near it, because the factor is multiplied in and
  // anything else would move a total nobody penalized.
  it('answers exactly one when nothing measured the penalty', () => {
    expect(penaltyFactor(null, HALVING_PENALTY)).toBe(1);
    expect(penaltyFactor(undefined, HALVING_PENALTY)).toBe(1);
    expect(penaltyFactor('', HALVING_PENALTY)).toBe(1);
    expect(penaltyFactor('x', HALVING_PENALTY)).toBe(1);
  });

  // A scale is what a measurement is read against, so a scheme that
  // states none states no penalty. Zero is not infinite severity, it
  // is an unwritten field, and dividing by it would answer an
  // infinity that then reaches the total.
  it('answers exactly one when the scheme states no usable scale', () => {
    const unusable = [0, -0, Number.NaN, Number.POSITIVE_INFINITY];

    expect(unusable.map(
      (scale) => penaltyFactor(50, { key: 'echo', coefficient: 0.5, scale }),
    )).toEqual(unusable.map(() => 1));
  });

  it('answers exactly one when the scheme states no usable share', () => {
    expect(penaltyFactor(
      50,
      { key: 'echo', coefficient: Number.NaN, scale: 100 },
    )).toBe(1);
  });

  it('takes the stated share of the total at full scale', () => {
    expect(penaltyFactor(100, HALVING_PENALTY)).toBe(0.5);
    expect(penaltyFactor(50, HALVING_PENALTY)).toBe(0.75);
    expect(penaltyFactor(0, HALVING_PENALTY)).toBe(1);
  });

  // Nothing bounds the factor, and both directions are the
  // original's readings rather than oversights: a measurement past
  // the scale flips the total's sign, and a negative one raises it.
  it('does not bound the factor in either direction', () => {
    expect(penaltyFactor(300, HALVING_PENALTY)).toBe(-0.5);
    expect(penaltyFactor(-100, HALVING_PENALTY)).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// The total, starting from every record it cannot score
// ---------------------------------------------------------------------------

describe('aggregateTotal — the records nothing measured', () => {
  // The headline reading: null, and never zero. Every entry here is
  // a record that reached the scorer with nothing usable in the
  // parts whose absence counts as zero, and a zero for any of them
  // would take its place at the bottom of a ranking as though it had
  // been read.
  it('answers null rather than zero when no part was measured', () => {
    const unscored: unknown[] = [
      {},
      { alpha: null, bravo: undefined, charlie: '' },
      { alpha: 'x', bravo: 'NaN', charlie: Number.POSITIVE_INFINITY },
      { alpha: {}, bravo: [1, 2], charlie: () => 7 },
    ];

    expect(unscored.map((record) => aggregateTotal(record, SCHEME))).toEqual(
      unscored.map(() => null),
    );
  });

  // The renormalizing part cannot make a record scored. It is the
  // signal that may be unavailable for reasons having nothing to do
  // with the record, so a total resting on it alone would be a
  // number about a record nothing else looked at.
  it('answers null when only the renormalizing part was measured', () => {
    expect(aggregateTotal({ delta: 100 }, SCHEME)).toBeNull();
    expect(aggregateTotal({ delta: 0 }, SCHEME)).toBeNull();
  });

  // Nor can a penalty. A penalty scales a total; with no total there
  // is nothing for it to scale, and reporting one would be reporting
  // the reduction as though it were the measurement.
  it('answers null when only the penalties were measured', () => {
    expect(aggregateTotal({ echo: 50, foxtrot: 5 }, SCHEME)).toBeNull();
  });

  // Whatever a Code node hands this. The original reads its argument
  // as `parts || {}` and then reads keys off what that left, so a
  // falsy argument and a truthy non-object take different routes to
  // the same answer, and both are reachable from a node reading an
  // absent field.
  it('answers null for an argument that is not a record at all', () => {
    const notRecords: unknown[] = [
      undefined, null, 0, -0, '', false, Number.NaN, 'abc', 42, [], {},
      () => 7,
    ];

    expect(notRecords.map((value) => aggregateTotal(value, SCHEME))).toEqual(
      notRecords.map(() => null),
    );
  });
});

describe('aggregateTotal — the schemes that cannot score anything', () => {
  // Reachable from a scheme assembled out of stored rows rather than
  // written down, which is where this one comes from. With no part
  // whose absence counts as zero there is nothing whose presence
  // could mean the record was scored, so every record is unscored —
  // including one where the renormalizing part carries a number.
  it('answers null for a scheme with no part that anchors a score', () => {
    const noAnchor: ScoreSpec = {
      parts: [{ key: 'delta', weight: 1, absent: 'renormalizes' }],
      penalties: [],
    };

    expect(aggregateTotal({ delta: 100 }, noAnchor)).toBeNull();
  });

  // The other unscorable scheme: shares that do not come to a
  // positive number. Dividing by what was counted would answer NaN
  // or an infinity, and either would leave the column holding a
  // number nothing measured.
  //
  // The second share is unusable rather than zero, which is the
  // same route: a share assembled out of a stored payload can
  // arrive as anything, and everything unreadable goes through
  // `orZero` to nothing.
  it('answers null for a scheme whose shares come to nothing', () => {
    const noShare: ScoreSpec = {
      parts: [
        { key: 'alpha', weight: 0, absent: 'counts-zero' },
        { key: 'bravo', weight: Number.NaN, absent: 'counts-zero' },
      ],
      penalties: [],
    };
    const cancelling: ScoreSpec = {
      parts: [
        { key: 'alpha', weight: 1, absent: 'counts-zero' },
        { key: 'bravo', weight: -1, absent: 'counts-zero' },
      ],
      penalties: [],
    };

    expect(aggregateTotal({ alpha: 100, bravo: 100 }, noShare)).toBeNull();
    expect(aggregateTotal({ alpha: 100, bravo: 100 }, cancelling)).toBeNull();
  });
});

describe('aggregateTotal — the measurements it will not read', () => {
  // The reading that decides whether the two passes are worth
  // having. A measurement whose own conversion refuses takes the
  // call down, so which measurements are read BEFORE the unscored
  // branch is answered decides whether a record nothing measured
  // raises or answers null. Nothing here is a part the unscored
  // question is over, so nothing here is read.
  it('leaves a refusing measurement unread when nothing anchors', () => {
    expect(aggregateTotal({ delta: hostileValue() }, SCHEME)).toBeNull();
    expect(aggregateTotal({ echo: hostileValue() }, SCHEME)).toBeNull();
    expect(aggregateTotal(
      { foxtrot: hostileValue(), delta: hostileValue() },
      SCHEME,
    )).toBeNull();
  });

  // The control for the case above, and it is what makes it a
  // reading rather than a fixture that never refused: the same
  // values in the same slots DO raise once one part anchors a score,
  // because then they are on the way to a total.
  it('lets the same measurement raise once a part anchors a score', () => {
    const refuses = 'this value refuses to become a number';

    expect(() => aggregateTotal({ alpha: 1, delta: hostileValue() }, SCHEME))
      .toThrow(refuses);
    expect(() => aggregateTotal({ alpha: 1, echo: hostileValue() }, SCHEME))
      .toThrow(refuses);
    expect(() => aggregateTotal({ alpha: hostileValue() }, SCHEME))
      .toThrow(refuses);
  });
});

describe('aggregateTotal — what a measurement does to the total', () => {
  // The other side of the headline: a measured zero IS a score, and
  // it is the low end of the range rather than the absence of one.
  it('scores a measured zero rather than reporting nothing', () => {
    expect(aggregateTotal({ alpha: 0 }, SCHEME)).toBe(0);
    expect(aggregateTotal({ alpha: '0' }, SCHEME)).toBe(0);
    expect(aggregateTotal({ alpha: 0, bravo: 0, charlie: 0 }, SCHEME)).toBe(0);
  });

  // Absence renormalizes; a measured zero does not. Same record
  // except for one slot, and the totals differ by the share the
  // renormalizing part carries — which is the whole behaviour this
  // module was pulled out of a larger scorer for.
  it('renormalizes on absence and not on a measured zero', () => {
    expect(aggregateTotal({ alpha: 100 }, SCHEME)).toBe(38);
    expect(aggregateTotal({ alpha: 100, delta: 0 }, SCHEME)).toBe(30);
  });

  // An anchoring part behaves the opposite way: absent or zero, it
  // costs the record its share either way. Same two records as
  // above, one slot over.
  it('counts an absent anchoring part as zero', () => {
    expect(aggregateTotal({ alpha: 50, delta: 0 }, SCHEME)).toBe(15);
    expect(aggregateTotal({ alpha: 50, bravo: 0, delta: 0 }, SCHEME)).toBe(15);
    expect(aggregateTotal(
      { alpha: 50, bravo: 50, charlie: 50, delta: 0 },
      SCHEME,
    )).toBe(40);
  });

  it('reads the numeric strings a driver returns', () => {
    expect(aggregateTotal({ alpha: '80', delta: '0' }, SCHEME)).toBe(24);
  });

  it('scales a full record by each penalty in turn', () => {
    const full = { alpha: 100, bravo: 100, charlie: 100, delta: 100 };

    expect(aggregateTotal(full, SCHEME)).toBe(100);
    expect(aggregateTotal({ ...full, echo: 100 }, SCHEME)).toBe(50);
    expect(aggregateTotal({ ...full, foxtrot: 10 }, SCHEME)).toBe(70);
    expect(aggregateTotal({ ...full, echo: 50, foxtrot: 5 }, SCHEME)).toBe(64);
  });
});

describe('aggregateTotal — the order a scheme lists things in', () => {
  // Floating-point multiplication is not associative, so the order
  // the penalties apply in is part of the answer. Two schemes with
  // the same members in opposite orders, over one record: the
  // product lands exactly on a half one way and a hair under it the
  // other, and the rounding takes them to different whole numbers.
  it('applies the penalties in the order the scheme lists them', () => {
    const parts = [{ key: 'alpha', weight: 1, absent: 'counts-zero' }] as const;
    const halving: ScorePenalty = { key: 'echo', coefficient: 0.5, scale: 7 };
    const trimming: ScorePenalty = {
      key: 'foxtrot',
      coefficient: 0.4,
      scale: 11,
    };
    const record = { alpha: 7, echo: 3, foxtrot: 5 };

    expect(aggregateTotal(
      record,
      { parts, penalties: [halving, trimming] },
    )).toBe(5);
    expect(aggregateTotal(
      record,
      { parts, penalties: [trimming, halving] },
    )).toBe(4);
  });

  // Addition is not associative either, and the same demonstration
  // applies to the parts. The two schemes carry the same parts with
  // the same shares; only the order differs.
  it('sums the parts in the order the scheme lists them', () => {
    const forward: ScoreSpec = {
      parts: [
        { key: 'alpha', weight: 0.11, absent: 'counts-zero' },
        { key: 'bravo', weight: 0.63, absent: 'counts-zero' },
        { key: 'charlie', weight: 0.72, absent: 'counts-zero' },
      ],
      penalties: [],
    };
    const reversed: ScoreSpec = {
      parts: [...forward.parts].reverse(),
      penalties: [],
    };
    const record = { alpha: 30, bravo: 7, charlie: 41 };

    expect(aggregateTotal(record, forward)).toBe(26);
    expect(aggregateTotal(record, reversed)).toBe(25);
  });
});

describe('aggregateTotal — the readings preserved from the original', () => {
  // A total of -0 survives, which is why the sum is seeded with its
  // first term instead of with zero. It reads as 0 under `===` and
  // parts from it under `Object.is`, which is what the parity differ
  // compares primitives with — so a version that repaired it would
  // fail the gate that decides whether this port landed.
  it('keeps a negative-zero total apart from a zero one', () => {
    const minus = aggregateTotal({ alpha: -0, bravo: -0, charlie: -0 }, SCHEME);

    expect(Object.is(minus, -0)).toBe(true);
    expect(Object.is(aggregateTotal({ alpha: 0 }, SCHEME), -0)).toBe(false);
  });

  // The arithmetic is not guarded on the way out. Every measurement
  // is finite by the time it is weighted, but a large enough one
  // against a large enough penalty still multiplies past the largest
  // double, and the original answers the infinity. A guard here
  // would be a divergence in the one function the parity leg
  // compares directly.
  it('answers a non-finite total rather than guarding it', () => {
    expect(aggregateTotal(
      { alpha: 1e308, bravo: 1e308, charlie: 1e308, delta: 1e308, echo: -1e308 },
      SCHEME,
    )).toBe(Number.POSITIVE_INFINITY);
  });

  // A measurement is read as a plain property, exactly as the
  // original reads it. Two consequences, both pinned rather than
  // repaired: a part keyed for something on the prototype reads what
  // is there, and a record that is a string answers its own members.
  it('reads a measurement as a plain property, prototype included', () => {
    const inherited: ScoreSpec = {
      parts: [
        { key: '__proto__', weight: 1, absent: 'counts-zero' },
        { key: 'alpha', weight: 1, absent: 'counts-zero' },
      ],
      penalties: [],
    };
    const lengths: ScoreSpec = {
      parts: [{ key: 'length', weight: 1, absent: 'counts-zero' }],
      penalties: [],
    };

    expect(aggregateTotal({ alpha: 10 }, inherited)).toBe(5);
    expect(aggregateTotal('abc', lengths)).toBe(3);
    expect(aggregateTotal('', lengths)).toBeNull();
  });
});

describe('PART_ABSENCES — the two answers, both in use', () => {
  // The roster, and the guard that says the suite above drives both
  // of its members. A scheme carrying only one of them would leave
  // every renormalization case, or every anchoring case, testing
  // nothing.
  it('holds exactly the answers the scheme above uses', () => {
    expect([...PART_ABSENCES]).toEqual(['counts-zero', 'renormalizes']);
    expect(new Set(SCHEME.parts.map((part) => part.absent)))
      .toEqual(new Set(PART_ABSENCES));
  });
});
