/**
 * Cases for `src/lib/feature-version.ts`: the one integer
 * `documents.feature_version` stores, and the two inputs it pins.
 *
 * Everything this module can get wrong is quiet. A version is one
 * number written beside a vector, and every wrong number is a
 * well-formed integer that a later pass reads without complaint —
 * so a digest blind to a re-filed term certifies a stale corpus as
 * current, and a digest that moved with the row order reports a
 * recompute nobody needs. Neither throws, and neither shows up
 * anywhere except in a case that pinned both directions.
 *
 * BOTH DIRECTIONS IS THE WHOLE DISCIPLINE HERE, and it is what
 * makes this file non-vacuous. A digest that answered one constant
 * would satisfy every same-version case below and fail every
 * different-version one; a digest that answered a fresh number per
 * call would do the exact reverse. Neither survives the pair, so
 * each section that claims a version HOLDS is written beside one
 * claiming it MOVES, over inputs differing in one member.
 *
 * House order, with the plan's three additions in front of the
 * ordinary path. The refusals first — the mechanism version, then
 * the term set — since they bound everything after them. Then the
 * empty term set, which is a real configuration and not an error.
 * Then order-invariance, then the single-weight edit, which are the
 * two halves of the pair above. The ordinary composition follows,
 * and the layout and coercion guards close the file.
 */
import type { FeatureVersionTerm } from '../../src/lib/feature-version.js';

import { describe, expect, it } from 'vitest';

import {
  MAX_FEATURE_MECHANISM_VERSION,
  MAX_FEATURE_VERSION,
  TERM_DIGEST_SPAN,
  featureVersionFor,
  termSetCanonicalText,
  termSetDigest,
} from '../../src/lib/feature-version.js';
import { ADVERSARIAL_VALUES } from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// The term set every section is driven over
// ---------------------------------------------------------------------------

/**
 * One term, positionally.
 *
 * Four members is short enough to read at a call site and long
 * enough that a literal per row would bury the one member a case is
 * about. The order is the canonical one the module renders in, so a
 * call site and a canonical line are the same sequence read twice.
 *
 * @param category - The category key the term is filed under.
 * @param pattern - What the row looks for.
 * @param weight - How much a match is worth.
 * @param polarity - Which way it moves the score.
 * @returns The term.
 */
function term(
  category: string,
  pattern: string,
  weight: number,
  polarity: string,
): FeatureVersionTerm {
  return { category, pattern, weight, polarity };
}

/**
 * A neutral term set, carrying every shape the digest has to see.
 *
 * Three categories rather than one, so a re-filing has somewhere to
 * move a term to. All three polarities, so the member is exercised
 * across its whole domain. A weight of `0`, because a measured zero
 * is a weight an operator writes and not an absence. And two terms
 * under one category, so a case about a category is not silently a
 * case about a one-term set.
 *
 * The subject matter is arbitrary and deliberately so: a term set
 * is a domain-supplied input, and nothing in this module or in this
 * file knows what any domain researches.
 */
const NEUTRAL_TERMS: readonly FeatureVersionTerm[] = [
  term('method', 'spectroscopy', 3, 'positive'),
  term('method', 'chromatography', 2, 'positive'),
  term('material', 'zirconia', 4, 'positive'),
  term('exclusion', 'reprinted announcement', 5, 'negative'),
  term('exclusion', 'sponsored', 0, 'ignore'),
];

/** The mechanism version the ordinary cases compose against. */
const MECHANISM = 1;

/** What {@link refusalOf} answers when a call returned normally. */
const NOTHING_THROWN = '<nothing thrown>';

/**
 * The message a call refused with, or {@link NOTHING_THROWN}.
 *
 * A string either way, so a case can assert on what was reported
 * without a branch and so a call that should have thrown fails
 * naming what it answered instead.
 *
 * @param call - Whatever is under test.
 * @returns The message, or the sentinel.
 */
function refusalOf(call: () => unknown): string {
  try {
    call();

    return NOTHING_THROWN;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}

/**
 * {@link NEUTRAL_TERMS} with one member of its first term set to
 * something else.
 *
 * The first term rather than a random one, so a refusal naming a
 * position is asserted against a position this file chose. The
 * member is a bare `string` rather than a `keyof`, because half the
 * cases here are about members the module does NOT read — a caller
 * handing whole `terms` rows in is the expected call, and a row
 * carries more than the four.
 *
 * @param member - Which member to set.
 * @param value - What to put there, however unusable.
 * @returns The altered set.
 */
function replacing(
  member: string,
  value: unknown,
): readonly FeatureVersionTerm[] {
  return NEUTRAL_TERMS.map((entry, at) => {
    if (at !== 0) {
      return entry;
    }

    return { ...entry, [member]: value } as FeatureVersionTerm;
  });
}

/**
 * {@link NEUTRAL_TERMS} with its first term replaced outright.
 *
 * @param value - Whatever stands in for a row.
 * @returns The altered set.
 */
function replacingTerm(value: unknown): readonly FeatureVersionTerm[] {
  return NEUTRAL_TERMS.map((entry, at) => {
    if (at !== 0) {
      return entry;
    }

    return value as FeatureVersionTerm;
  });
}

// ---------------------------------------------------------------------------
// The mechanism version it will not accept
// ---------------------------------------------------------------------------

/** One mechanism version nobody could have meant, and why. */
interface RefusedMechanism {
  /** The entry, for a failure to name. */
  readonly id: string;

  /** What is wrong with it, as a case title reads. */
  readonly describes: string;

  /** The value itself, however unusable. */
  readonly version: unknown;

  /** The tail the message is expected to carry. */
  readonly tail: string;
}

/**
 * Every mechanism version the composition refuses.
 *
 * Both halves of the band are represented, because they fail in
 * opposite ways: below `1` a composed version falls into the digest
 * band, where it either reads as `0` — the value both column
 * comments reserve against — or lands on another generation, and
 * above the ceiling it overflows the `integer` column outright.
 * `NaN` is here for the reason it is everywhere in this repository:
 * it is what a setting that did not parse becomes, and a comparison
 * against it is silently false forever.
 */
const REFUSED_MECHANISMS: readonly RefusedMechanism[] = [
  {
    id: 'zero',
    describes: 'a version of zero, which the columns reserve against',
    version: 0,
    tail: 'not 0.',
  },
  {
    id: 'negative',
    describes: 'a negative version, which composes below the band',
    version: -1,
    tail: 'not -1.',
  },
  {
    id: 'fraction',
    describes: 'a fraction, which no bump ever produces',
    version: 1.5,
    tail: 'not 1.5.',
  },
  {
    id: 'nan',
    describes: 'the NaN an unparsed setting becomes',
    version: Number.NaN,
    tail: 'not NaN.',
  },
  {
    id: 'infinite',
    describes: 'an infinite version, which no arithmetic bounds',
    version: Number.POSITIVE_INFINITY,
    tail: 'not Infinity.',
  },
  {
    id: 'above-ceiling',
    describes: 'a version past the ceiling, which overflows the column',
    version: MAX_FEATURE_MECHANISM_VERSION + 1,
    tail: `not ${MAX_FEATURE_MECHANISM_VERSION + 1}.`,
  },
  {
    id: 'text',
    describes: 'a version that arrived as text',
    version: '1',
    tail: 'and a value of type string is not one.',
  },
  {
    id: 'absent',
    describes: 'no version at all',
    version: undefined,
    tail: 'and a value of type undefined is not one.',
  },
];

describe('featureVersionFor — the mechanism version it refuses', () => {
  it('registers each refused version once', () => {
    const ids = REFUSED_MECHANISMS.map((entry) => entry.id);

    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  for (const entry of REFUSED_MECHANISMS) {
    it(`refuses ${entry.describes}`, () => {
      const message = refusalOf(() => featureVersionFor(
        entry.version as number,
        NEUTRAL_TERMS,
      ));

      expect(message).toContain('[feature-version]');
      expect(message).toContain(entry.tail);
    });
  }

  it('accepts both ends of the band it enforces', () => {
    // The positive control, varied along the axis the refusals are
    // taken on. A composition refusing every version would satisfy
    // all eight cases above and neither of these.
    expect(refusalOf(() => featureVersionFor(1, NEUTRAL_TERMS)))
      .toBe(NOTHING_THROWN);
    expect(refusalOf(() => featureVersionFor(
      MAX_FEATURE_MECHANISM_VERSION,
      NEUTRAL_TERMS,
    ))).toBe(NOTHING_THROWN);
  });
});

// ---------------------------------------------------------------------------
// The term set it will not read
// ---------------------------------------------------------------------------

/** One unreadable term set, and the sentence it should report. */
interface RefusedTerms {
  /** The entry, for a failure to name. */
  readonly id: string;

  /** What is wrong with it, as a case title reads. */
  readonly describes: string;

  /** The predicate the message is expected to carry. */
  readonly fault: string;

  /** A fresh set carrying exactly that one fault. */
  readonly build: () => readonly FeatureVersionTerm[];
}

/**
 * Every term set the module refuses, one planted fault each.
 *
 * The sentences are declared here rather than read off the module,
 * which is the same choice `static-gate.ts` documents for its own
 * warnings: a roster taken from the constants it is checking agrees
 * with any edit to them, where one written out fails naming a
 * sentence nothing produces.
 *
 * Every entry alters ONE member of ONE term of the neutral set, so
 * a case that passes for the wrong reason has nowhere to hide — the
 * rest of the set is a term set the module accepts, which the
 * control below asserts directly.
 */
const REFUSED_TERMS: readonly RefusedTerms[] = [
  {
    id: 'not-an-array',
    describes: 'a term set that is not an array',
    fault: 'the term set is not an array',
    build: () => ({ length: 0 }) as unknown as FeatureVersionTerm[],
  },
  {
    id: 'not-an-object',
    describes: 'a term that is not an object',
    fault: 'term 0 of the set is not an object',
    build: () => replacingTerm('spectroscopy'),
  },
  {
    id: 'missing-term',
    describes: 'a hole where a term should be',
    build: () => replacingTerm(undefined),
    fault: 'term 0 of the set is not an object',
  },
  {
    id: 'category',
    describes: 'a category key that is not a string',
    fault: 'term 0 of the set carries a category key that is not a string',
    build: () => replacing('category', 7),
  },
  {
    id: 'pattern',
    describes: 'a pattern that is not a string',
    fault: 'term 0 of the set carries a pattern that is not a string',
    build: () => replacing('pattern', null),
  },
  {
    id: 'weight-text',
    describes: 'a weight that arrived as text',
    fault: 'term 0 of the set carries a weight that is not a finite number',
    build: () => replacing('weight', '3'),
  },
  {
    id: 'weight-nan',
    describes: 'a weight of NaN, which digests as stable text',
    fault: 'term 0 of the set carries a weight that is not a finite number',
    build: () => replacing('weight', Number.NaN),
  },
  {
    id: 'weight-infinite',
    describes: 'an infinite weight, which no operator authored',
    fault: 'term 0 of the set carries a weight that is not a finite number',
    build: () => replacing('weight', Number.POSITIVE_INFINITY),
  },
  {
    id: 'polarity',
    describes: 'a polarity that is not a string',
    fault: 'term 0 of the set carries a polarity that is not a string',
    build: () => replacing('polarity', 1),
  },
];

describe('featureVersionFor — the term set it refuses', () => {
  it('registers each refused set once', () => {
    const ids = REFUSED_TERMS.map((entry) => entry.id);

    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  it('states no fault that accounts for another', () => {
    // A whole-set sentence ending with a per-member one would let a
    // single report satisfy two entries: the every-entry-is-reached
    // direction would then pass with one sentence never produced,
    // and the case that did produce it would be attributed to the
    // wrong member. The repair is always wording, never a narrower
    // matcher.
    const overlapping = REFUSED_TERMS.filter((entry) => REFUSED_TERMS.some(
      (other) => other.fault !== entry.fault
        && entry.fault.endsWith(other.fault),
    ));

    expect(overlapping.map((entry) => entry.id)).toEqual([]);
  });

  for (const entry of REFUSED_TERMS) {
    it(`refuses ${entry.describes}`, () => {
      const message = refusalOf(
        () => featureVersionFor(MECHANISM, entry.build()),
      );

      expect(message).toContain('[feature-version]');
      expect(message).toContain(`${entry.fault}.`);
    });
  }

  it('accepts the set every entry above was derived from', () => {
    expect(refusalOf(() => featureVersionFor(MECHANISM, NEUTRAL_TERMS)))
      .toBe(NOTHING_THROWN);
  });

  it('names the member and the row, and never the value', () => {
    // The no-echo half. The pattern is what a refusal would echo if
    // it echoed anything, so it is the one planted here — and the
    // position is asserted present in the same reading, since a
    // message naming neither would satisfy a bare absence check.
    const planted = ['zq', 'wv', 'xk'].join('');
    const message = refusalOf(
      () => featureVersionFor(MECHANISM, replacing('weight', planted)),
    );

    expect(message).toContain('term 0 of the set');
    expect(message).not.toContain(planted);
  });

  it('reads what it cannot judge rather than refusing it', () => {
    // The line the module draws: readability, not correctness. A
    // polarity outside the three the column admits is a row a domain
    // can hold and score against, so the version has to fingerprint
    // it — and fixing the typo has to move the number.
    const mistyped = replacing('polarity', 'positve');

    expect(refusalOf(() => featureVersionFor(MECHANISM, mistyped)))
      .toBe(NOTHING_THROWN);
    expect(featureVersionFor(MECHANISM, mistyped))
      .not.toBe(featureVersionFor(MECHANISM, NEUTRAL_TERMS));
  });
});

// ---------------------------------------------------------------------------
// The empty term set, which is a configuration and not a fault
// ---------------------------------------------------------------------------

describe('featureVersionFor — a domain with no terms yet', () => {
  it('composes a version rather than refusing one', () => {
    // A domain whose taxonomy has not been seeded is a domain the
    // featurizer can still run over: `features.ts` answers a
    // full-width record with no category columns, and that vector
    // needs a version like any other.
    expect(refusalOf(() => featureVersionFor(MECHANISM, [])))
      .toBe(NOTHING_THROWN);
  });

  it('answers the same version for an empty set every time', () => {
    expect(featureVersionFor(MECHANISM, []))
      .toBe(featureVersionFor(MECHANISM, []));
    expect(termSetCanonicalText([])).toBe('');
  });

  it('composes a version inside the band, and never zero', () => {
    const version = featureVersionFor(MECHANISM, []);

    expect(Number.isInteger(version)).toBe(true);
    expect(version).toBeGreaterThanOrEqual(TERM_DIGEST_SPAN);
    expect(version).toBeLessThanOrEqual(MAX_FEATURE_VERSION);
  });

  it('is not the version any populated set composes to', () => {
    // The non-vacuity leg. A digest that answered one number for
    // everything would satisfy both cases above.
    expect(featureVersionFor(MECHANISM, []))
      .not.toBe(featureVersionFor(MECHANISM, NEUTRAL_TERMS));
    expect(featureVersionFor(MECHANISM, []))
      .not.toBe(featureVersionFor(MECHANISM, [
        term('method', 'spectroscopy', 3, 'positive'),
      ]));
  });
});

// ---------------------------------------------------------------------------
// Order is not part of the input
// ---------------------------------------------------------------------------

describe('featureVersionFor — a term set that differs only in order', () => {
  it('composes the same version for the reversed set', () => {
    // A query without an ORDER BY returns rows in whatever order
    // the plan produced, so a version that moved with the row order
    // would report a recompute after an unrelated index change.
    const reversed = Array.from(NEUTRAL_TERMS).reverse();

    expect(featureVersionFor(MECHANISM, reversed))
      .toBe(featureVersionFor(MECHANISM, NEUTRAL_TERMS));
  });

  it('composes the same version for every rotation of the set', () => {
    const rotations = NEUTRAL_TERMS.map((_entry, at) => [
      ...NEUTRAL_TERMS.slice(at),
      ...NEUTRAL_TERMS.slice(0, at),
    ]);
    const versions = rotations.map(
      (rotated) => featureVersionFor(MECHANISM, rotated),
    );
    const expected = featureVersionFor(MECHANISM, NEUTRAL_TERMS);

    expect(versions).toEqual(rotations.map(() => expected));
  });

  it('renders one canonical text whatever order it was handed', () => {
    const reversed = Array.from(NEUTRAL_TERMS).reverse();

    expect(termSetCanonicalText(reversed))
      .toBe(termSetCanonicalText(NEUTRAL_TERMS));
    expect(termSetCanonicalText(NEUTRAL_TERMS).split('\n'))
      .toHaveLength(NEUTRAL_TERMS.length);
  });

  it('leaves the list it was handed in the order it arrived', () => {
    const handed = Array.from(NEUTRAL_TERMS).reverse();
    const before = handed.map((entry) => entry.pattern);

    featureVersionFor(MECHANISM, handed);

    expect(handed.map((entry) => entry.pattern)).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// One member moved, and the version moves with it
// ---------------------------------------------------------------------------

/** One single-member edit, and whether it should move the version. */
interface TermEdit {
  /** The entry, for a failure to name. */
  readonly id: string;

  /** What the edit is, as a case title reads. */
  readonly describes: string;

  /** Whether the composed version should differ afterwards. */
  readonly moves: boolean;

  /** The set after the edit. */
  readonly build: () => readonly FeatureVersionTerm[];
}

/**
 * Every one-member edit this file pins, in both directions.
 *
 * The four that MOVE are the four members a stored vector reads,
 * and the weight is the one the plan names because it is the
 * quietest: a weight edited by one moves the gate score every
 * vector opens with while every column name and every column
 * position stays exactly where it was.
 *
 * The two that DO NOT move it are the control, and they are what
 * makes the four above a measurement rather than a digest that
 * moves on any input at all. A detector that fired on prose would
 * demand a corpus-wide recompute for an edit that moved no number,
 * which teaches people to bump the version without running one.
 */
const TERM_EDITS: readonly TermEdit[] = [
  {
    id: 'weight',
    describes: 'a single weight changed by one',
    moves: true,
    build: () => replacing('weight', 4),
  },
  {
    id: 'weight-to-zero',
    describes: 'a weight taken down to a measured zero',
    moves: true,
    build: () => replacing('weight', 0),
  },
  {
    id: 'pattern',
    describes: 'a pattern rewritten',
    moves: true,
    build: () => replacing('pattern', 'spectrometry'),
  },
  {
    id: 'category',
    describes: 'a term re-filed under another category',
    moves: true,
    build: () => replacing('category', 'material'),
  },
  {
    id: 'polarity',
    describes: 'a polarity turned the other way',
    moves: true,
    build: () => replacing('polarity', 'negative'),
  },
  {
    id: 'term-added',
    describes: 'a term added under a category that did not exist',
    moves: true,
    build: () => [...NEUTRAL_TERMS, term('venue', 'preprint', 1, 'ignore')],
  },
  {
    id: 'notes',
    describes: 'a note written beside a term',
    moves: false,
    build: () => replacing('notes', 'why this term is here'),
  },
  {
    id: 'surrogate-key',
    describes: 'a surrogate key moved by a reseed',
    moves: false,
    build: () => replacing('id', 41),
  },
];

describe('featureVersionFor — one member moved', () => {
  it('registers each edit once', () => {
    const ids = TERM_EDITS.map((entry) => entry.id);

    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  it('pins edits in both directions', () => {
    // The roster's own control. Every case below is of the form
    // "this edit moves the version, or does not", and a roster that
    // had drifted to one direction would pass while claiming half
    // of what this section is for.
    const directions = TERM_EDITS.map((entry) => entry.moves);

    expect(directions).toContain(true);
    expect(directions).toContain(false);
  });

  for (const entry of TERM_EDITS) {
    const verb = entry.moves
      ? 'moves the version for'
      : 'holds the version across';

    it(`${verb} ${entry.describes}`, () => {
      const before = featureVersionFor(MECHANISM, NEUTRAL_TERMS);
      const after = featureVersionFor(MECHANISM, entry.build());

      if (entry.moves) {
        expect(after).not.toBe(before);
      } else {
        expect(after).toBe(before);
      }
    });
  }

  it('reads -0 and 0 as one weight', () => {
    // The one numeric distinction deliberately NOT kept. The gate
    // takes a weight's magnitude, so no vector can express the
    // difference, and a version that moved between them would order
    // a corpus-wide recompute for a JSON round trip.
    expect(termSetDigest([term('c', 'p', -0, 'positive')]))
      .toBe(termSetDigest([term('c', 'p', 0, 'positive')]));
  });

  it('counts a duplicated row as a second term', () => {
    // The table cannot hold two, but a join can produce them, and a
    // gate handed the same term twice counts it twice.
    const one = term('c', 'p', 1, 'positive');
    const once = [one];
    const twice = [one, term('c', 'p', 1, 'positive')];

    expect(termSetDigest(twice)).not.toBe(termSetDigest(once));
    expect(termSetCanonicalText(twice).split('\n')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// The ordinary composition
// ---------------------------------------------------------------------------

describe('featureVersionFor — the version it composes', () => {
  it('is the mechanism version and the digest, in one integer', () => {
    const version = featureVersionFor(MECHANISM, NEUTRAL_TERMS);

    expect(version).toBe(MECHANISM * TERM_DIGEST_SPAN
      + termSetDigest(NEUTRAL_TERMS));
  });

  it('answers the same integer for the same two inputs', () => {
    expect(featureVersionFor(MECHANISM, NEUTRAL_TERMS))
      .toBe(featureVersionFor(MECHANISM, NEUTRAL_TERMS));
  });

  it('fits the column it is written to, whatever the inputs', () => {
    // Every version the composition can answer is a safe integer
    // between one span and the signed 32-bit maximum, which is what
    // says a composed version can never overflow
    // documents.feature_version or land on the reserved zero.
    const versions = [1, 2, MAX_FEATURE_MECHANISM_VERSION].flatMap(
      (mechanism) => [
        featureVersionFor(mechanism, []),
        featureVersionFor(mechanism, NEUTRAL_TERMS),
      ],
    );

    for (const version of versions) {
      expect(Number.isSafeInteger(version)).toBe(true);
      expect(version).toBeGreaterThanOrEqual(TERM_DIGEST_SPAN);
      expect(version).toBeLessThanOrEqual(MAX_FEATURE_VERSION);
    }
  });

  it('carries the mechanism version back out of the composed value', () => {
    const mechanisms = [1, 2, 7, MAX_FEATURE_MECHANISM_VERSION];
    const bands = mechanisms.map((mechanism) => Math.floor(
      featureVersionFor(mechanism, NEUTRAL_TERMS) / TERM_DIGEST_SPAN,
    ));

    expect(bands).toEqual(mechanisms);
  });

  it('moves the version for a mechanism bump under one term set', () => {
    // The half of the pin the term digest cannot see: nothing about
    // the rows moved, and every stored vector is re-indexed anyway.
    expect(featureVersionFor(2, NEUTRAL_TERMS))
      .not.toBe(featureVersionFor(1, NEUTRAL_TERMS));
  });

  it('holds the term digest across every mechanism version', () => {
    // The other side of the same claim, and what says the two
    // halves are composed rather than hashed together: the domain
    // half is untouched by a bump, so an operator reading a stored
    // value can tell a layout generation from a taxonomy edit.
    const digest = termSetDigest(NEUTRAL_TERMS);
    const remainders = [1, 2, MAX_FEATURE_MECHANISM_VERSION].map(
      (mechanism) => featureVersionFor(mechanism, NEUTRAL_TERMS)
        % TERM_DIGEST_SPAN,
    );

    expect(remainders).toEqual([digest, digest, digest]);
  });
});

// ---------------------------------------------------------------------------
// The layout the three constants describe
// ---------------------------------------------------------------------------

describe('the composed integer and the column that holds it', () => {
  it('adds up to exactly the largest value the column holds', () => {
    // The three constants are editable independently and only this
    // assertion notices when they stop adding up. A signed 32-bit
    // integer is what both feature_version columns are, so a
    // widened mechanism ceiling or a widened digest has to take its
    // bits from the other one.
    expect(MAX_FEATURE_MECHANISM_VERSION * TERM_DIGEST_SPAN
      + TERM_DIGEST_SPAN - 1).toBe(MAX_FEATURE_VERSION);
    expect(MAX_FEATURE_VERSION).toBe(2 ** 31 - 1);
  });

  it('folds every digest inside the span', () => {
    const sets = [
      [] as readonly FeatureVersionTerm[],
      NEUTRAL_TERMS,
      [term('c', 'p', 1, 'positive')],
      [...NEUTRAL_TERMS, ...NEUTRAL_TERMS],
    ];
    const digests = sets.map((set) => termSetDigest(set));

    for (const digest of digests) {
      expect(Number.isInteger(digest)).toBe(true);
      expect(digest).toBeGreaterThanOrEqual(0);
      expect(digest).toBeLessThan(TERM_DIGEST_SPAN);
    }
  });

  it('keeps the span a power of two, which is what the fold needs', () => {
    expect(TERM_DIGEST_SPAN).toBe(2 ** 23);
    expect(TERM_DIGEST_SPAN & (TERM_DIGEST_SPAN - 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The canonical form, and the separators it cannot be confused by
// ---------------------------------------------------------------------------

describe('termSetCanonicalText — the rendering the digest is over', () => {
  it('renders four escaped fields per line, category first', () => {
    const one = [term('material', 'zirconia', 4, 'positive')];

    expect(termSetCanonicalText(one))
      .toBe(['material', 'zirconia', '4', 'positive'].join('\t'));
  });

  it('escapes every character a separator could be mistaken for', () => {
    // All four branches of the escape in one pattern. The field is
    // rewritten in one pass over the original, so the escapes it
    // introduces are never read back and escaped again: the answer
    // is one line of four fields, which is what it has to stay
    // whatever a person typed into the column.
    const raw = ['x', '\\', 'y', '\t', 'z', '\n', 'w', '\r', 'v'].join('');
    const text = termSetCanonicalText([term('c', raw, 1, 'p')]);

    expect(text.split('\n')).toHaveLength(1);
    expect(text.split('\t')).toHaveLength(4);
    expect(text).toBe(['c', 'x\\\\y\\tz\\nw\\rv', '1', 'p'].join('\t'));
  });

  it('keeps two sets apart that would otherwise render alike', () => {
    // Unescaped, both of these render the same bytes: one term
    // whose polarity carries a newline is indistinguishable from
    // two terms, and two different term sets then share one
    // version. That is the one failure a version pin must not have.
    const smuggled = ['p', '\n', 'c', '\t', 'd', '\t', '2', '\t', 'q']
      .join('');
    const one = [term('a', 'b', 1, smuggled)];
    const two = [term('a', 'b', 1, 'p'), term('c', 'd', 2, 'q')];

    expect(termSetCanonicalText(one).split('\n')).toHaveLength(1);
    expect(termSetCanonicalText(two).split('\n')).toHaveLength(2);
    expect(termSetDigest(one)).not.toBe(termSetDigest(two));
  });

  it('tells a literal escape from the character it stands for', () => {
    // A pattern holding a backslash followed by a `t` is not a
    // pattern holding a tab, and the two render differently only
    // because the backslash is escaped too. It is what the other
    // three escapes are spelled with, so leaving it out of the
    // class collapses these two fields onto one rendering —
    // measured, and this case is what reports it.
    const written = ['x', '\\', 'ty'].join('');
    const tabbed = ['x', '\t', 'y'].join('');

    expect(termSetDigest([term('c', written, 1, 'p')]))
      .not.toBe(termSetDigest([term('c', tabbed, 1, 'p')]));
  });

  it('leaves the list it was handed untouched', () => {
    const handed = Array.from(NEUTRAL_TERMS);
    const snapshot = JSON.stringify(handed);

    termSetCanonicalText(handed);
    termSetDigest(handed);
    featureVersionFor(MECHANISM, handed);

    expect(JSON.stringify(handed)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// What it does with a value nothing here was written against
// ---------------------------------------------------------------------------

/** Where an adversarial value is planted for the sweep below. */
const ADVERSARIAL_SLOTS = [
  'category',
  'pattern',
  'weight',
  'polarity',
] as const;

/**
 * One reading the sweep is allowed to end on.
 *
 * A composed version or this module's own refusal, and nothing
 * else. Anything a third answer names is a value that reached an
 * arithmetic or a conversion before it was judged.
 */
const ENDINGS = {
  /** A version inside the band. */
  composed: 'composed',

  /** A refusal carrying this module's prefix. */
  refused: 'refused',
} as const;

/**
 * How one version that came back reads.
 *
 * @param version - Whatever the call answered.
 * @returns {@link ENDINGS.composed}, or what it answered instead.
 */
function versionEnding(version: number): string {
  return Number.isSafeInteger(version)
    && version >= TERM_DIGEST_SPAN
    && version <= MAX_FEATURE_VERSION
    ? ENDINGS.composed
    : `answered ${String(version)}`;
}

/**
 * How one call ended.
 *
 * @param call - Whatever is under test.
 * @returns One of {@link ENDINGS}, or the message that named
 * neither.
 */
function endingOf(call: () => number): string {
  try {
    return versionEnding(call());
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    return message.startsWith('[feature-version]')
      ? ENDINGS.refused
      : message;
  }
}

describe('featureVersionFor — the values it was not written against', () => {
  it('ends on a version or its own refusal for every member', () => {
    // The corpus sweep. Every adversarial value in the shared
    // fixtures, in each of the four members the module reads, plus
    // the whole term and the whole set — so a value added to that
    // roster later joins this run without an edit here.
    const strayed = ADVERSARIAL_VALUES.flatMap(
      (entry) => ADVERSARIAL_SLOTS.map((slot) => ({
        at: `${entry.id} as ${slot}`,
        ending: endingOf(
          () => featureVersionFor(MECHANISM, replacing(slot, entry.build())),
        ),
      })),
    ).filter((reading) => reading.ending !== ENDINGS.composed
      && reading.ending !== ENDINGS.refused);

    expect(strayed).toEqual([]);
  });

  it('ends the same way for a whole term and a whole set', () => {
    const strayed = ADVERSARIAL_VALUES.flatMap((entry) => [
      {
        at: `${entry.id} as a term`,
        ending: endingOf(
          () => featureVersionFor(MECHANISM, replacingTerm(entry.build())),
        ),
      },
      {
        at: `${entry.id} as the set`,
        ending: endingOf(() => featureVersionFor(
          MECHANISM,
          entry.build() as readonly FeatureVersionTerm[],
        )),
      },
    ]).filter((reading) => reading.ending !== ENDINGS.composed
      && reading.ending !== ENDINGS.refused);

    expect(strayed).toEqual([]);
  });

  it('still reaches both endings over that corpus', () => {
    // The sweep's own control, and it is not optional: a module
    // refusing everything would satisfy both cases above through
    // one branch, and so would one that composed a version for
    // every value it was handed.
    const endings = ADVERSARIAL_VALUES.map((entry) => endingOf(
      () => featureVersionFor(MECHANISM, replacing('pattern', entry.build())),
    ));

    expect(endings).toContain(ENDINGS.refused);
    expect(endings).toContain(ENDINGS.composed);
  });

  it('refuses a mechanism version that cannot be rendered', () => {
    // The one refusal that names its value, over the values that
    // would throw on the way into a message. A symbol has no string
    // conversion a template can take, and an object can refuse one,
    // so the message names the type rather than the value.
    const unrenderable = ADVERSARIAL_VALUES.filter(
      (entry) => typeof entry.build() !== 'number',
    );
    const strayed = unrenderable.filter((entry) => endingOf(
      () => featureVersionFor(entry.build() as number, NEUTRAL_TERMS),
    ) !== ENDINGS.refused);

    expect(strayed.map((entry) => entry.id)).toEqual([]);
    expect(unrenderable.length).toBeGreaterThan(0);
  });
});
