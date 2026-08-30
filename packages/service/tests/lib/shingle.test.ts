/**
 * Cases for `src/lib/shingle.ts`: the three shapes that make it say
 * nothing, and then the one that makes it say two documents are the
 * same.
 *
 * The refusals come FIRST and they are the half most worth reading on
 * a failing run. A similarity function that always answers a number
 * is not a more useful similarity function — it is the failure this
 * library is built around. A stub sketch divided by its own size
 * reads as a perfect match for any longer document that contains it,
 * so a comparability gate that had quietly started passing partial
 * sketches would merge unrelated documents while every arithmetic
 * case below still passed. That is why the incomparable and empty
 * sketches are pinned before a single converging pair appears, and
 * why the inflation itself is pinned as a case rather than described
 * in a comment: {@link sketchSimilarity} reading one over a pair
 * {@link sketchComparable} refuses is the whole argument for the gate
 * existing, and it is asserted in both directions at once.
 *
 * The long bodies are BUILT rather than written down. A body needs
 * roughly seventy words before it produces a full sketch, and three
 * of those written out as prose would be three paragraphs nobody
 * reads, differing in ways nobody could check. {@link longBody}
 * instead makes near-copies and unrelated bodies by construction, so
 * "these two are the same document with a wrapper around it" and
 * "these two share nothing" are properties of the builder's arguments
 * rather than of prose somebody eyeballed. The margins that come out
 * are wide on purpose and are asserted as margins: a pair converging
 * at the boundary would pass this file and fail the day anything
 * moved.
 *
 * The corpus entries are driven off `tests/parity/fixtures.ts` rather
 * than off a list written here, since the same entries drive the
 * parity suite and two lists that agree until somebody edits one is
 * exactly what that arrangement avoids. The corpus is also this
 * file's control for the sketch build being reachable at all: its
 * entries produce empty sketches, partial ones and one full one, and
 * the case that says so is what stops a suite of short fixtures from
 * agreeing about a code path it never entered.
 */
import { describe, expect, it } from 'vitest';

import {
  SHINGLE_SKETCH_SIZE,
  SHINGLE_THRESHOLD,
  SHINGLE_WORDS,
  bodySketch,
  shingleHash,
  shingleNormalize,
  sketchComparable,
  sketchSimilarity,
  sketchesConverge,
} from '../../src/lib/shingle.js';
import {
  ADVERSARIAL_VALUES,
  DELIMITED_RECORD_FIXTURES,
  INVISIBLE_TEXT_FIXTURE,
  MARKUP_FIXTURES,
  MULTIPART_MESSAGE_FIXTURES,
  NO_BREAK_SPACE,
  fixtureById,
} from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// Bodies, built rather than written
// ---------------------------------------------------------------------------

/**
 * A body of `count` distinct-ish words, walked by `step` from `seed`.
 *
 * Two bodies built with the same step and seed and different lengths
 * share every run the shorter one has; two built from far-apart seeds
 * share none. So a near-copy and an unrelated document are both one
 * argument away, and neither depends on prose anybody has to read.
 *
 * @param count - How many words.
 * @param step - How far apart consecutive words sit in the pool.
 * @param seed - Where in the pool to start.
 * @returns The body, single-spaced.
 */
function longBody(count: number, step = 1, seed = 0): string {
  return Array.from(
    { length: count },
    (_, index) => `w${(seed + (index * step)) % 997}`,
  ).join(' ');
}

/** A body long enough to fill a sketch several times over. */
const BASE_BODY = longBody(300);

/** The same document, wrapped by something that republished it. */
const EDITED_BODY = `Header line one. ${BASE_BODY} Footer line two.`;

/** A body from the same generator sharing no run with the base. */
const OTHER_BODY = longBody(300, 7, 500);

/** The base body's sketch, full. */
const BASE_SKETCH = bodySketch(BASE_BODY);

/** The wrapped copy's sketch, full. */
const EDITED_SKETCH = bodySketch(EDITED_BODY);

/** The unrelated body's sketch, full. */
const OTHER_SKETCH = bodySketch(OTHER_BODY);

/**
 * Four entries taken out of a full sketch, which is what a stub
 * document's sketch looks like from the comparison's side.
 *
 * Taken from {@link BASE_SKETCH} rather than sketched from a short
 * body on purpose: this has to be a strict subset for the inflation
 * case to say what it means, and slicing guarantees that where
 * sketching a fragment merely makes it likely.
 */
const STUB_SKETCH = BASE_SKETCH.slice(0, 4);

// ---------------------------------------------------------------------------
// Reading an answer, including the answer that is a throw
// ---------------------------------------------------------------------------

/** What {@link endingOf} answers for a call that returned. */
const ANSWERED = '<answered>';

/**
 * Whether a call answered, and what it said if it did not.
 *
 * A string rather than a boolean so a failure prints the sentence
 * that arrived instead of `true !== false`.
 *
 * @param run - The call under test.
 * @returns {@link ANSWERED}, or what was thrown.
 */
function endingOf(run: () => unknown): string {
  try {
    run();

    return ANSWERED;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : `non-Error: ${String(error)}`;
  }
}

/** The shared roster entry whose string conversion throws. */
const HOSTILE = fixtureById(ADVERSARIAL_VALUES, 'hostile-string-conversion');

// ---------------------------------------------------------------------------
// The refusals: sketches nothing can be judged from
// ---------------------------------------------------------------------------

describe('sketchComparable - sketches too small to judge from', () => {
  // The case the whole gate exists for. A stub sketch that is a
  // subset of a full one reads as a PERFECT match, and both halves
  // are asserted here so neither can drift alone: similarity says
  // one, comparability says no. A gate that had started accepting
  // partial sketches would merge these two documents.
  it('refuses a partial sketch that reads as identical', () => {
    expect(sketchSimilarity(STUB_SKETCH, BASE_SKETCH)).toBe(1);
    expect(sketchComparable(STUB_SKETCH, BASE_SKETCH)).toBe(false);
  });

  it('refuses a sketch one entry short of full', () => {
    const short = BASE_SKETCH.slice(0, SHINGLE_SKETCH_SIZE - 1);

    expect(short.length).toBe(SHINGLE_SKETCH_SIZE - 1);
    expect(sketchComparable(short, BASE_SKETCH)).toBe(false);
    expect(sketchComparable(BASE_SKETCH, short)).toBe(false);
  });

  it('refuses an empty sketch on either side', () => {
    expect(sketchComparable([], BASE_SKETCH)).toBe(false);
    expect(sketchComparable(BASE_SKETCH, [])).toBe(false);
    expect(sketchComparable([], [])).toBe(false);
  });

  it('refuses anything that is not a list', () => {
    const notLists = [undefined, null, 0, 'a', {}] as unknown[];
    const answers = notLists.map(
      (value) => sketchComparable(value as string[], BASE_SKETCH),
    );

    expect(answers).toEqual(notLists.map(() => false));
  });

  // Holes are dropped rather than converted, so a full-length array
  // carrying them is not a full sketch. Asserted against a list of
  // the same LENGTH, which is the reading a length check would get
  // wrong.
  it('refuses a full-length list whose entries are absent', () => {
    const holes = BASE_SKETCH.map(() => null);

    expect(holes.length).toBe(SHINGLE_SKETCH_SIZE);
    expect(sketchComparable(holes as unknown as string[], BASE_SKETCH))
      .toBe(false);
  });

  // The positive control for the section: everything above is a
  // refusal, and a gate that refused everything would pass all of it.
  it('accepts two full sketches', () => {
    expect(BASE_SKETCH.length).toBe(SHINGLE_SKETCH_SIZE);
    expect(OTHER_SKETCH.length).toBe(SHINGLE_SKETCH_SIZE);
    expect(sketchComparable(BASE_SKETCH, OTHER_SKETCH)).toBe(true);
  });
});

describe('sketchSimilarity - sketches it has no opinion about', () => {
  // Zero, not one. Two bodies nothing could be computed about are not
  // identical, and answering one here would converge every short
  // document with every other one.
  it('reads two empty sketches as no overlap rather than as identical', () => {
    expect(sketchSimilarity([], [])).toBe(0);
  });

  it('reads one empty side as no overlap', () => {
    expect(sketchSimilarity([], BASE_SKETCH)).toBe(0);
    expect(sketchSimilarity(BASE_SKETCH, [])).toBe(0);
  });

  it('reads anything that is not a list as no overlap', () => {
    const notLists = [undefined, null, 0, 'a', {}] as unknown[];
    const answers = notLists.map(
      (value) => sketchSimilarity(value as string[], BASE_SKETCH),
    );

    expect(answers).toEqual(notLists.map(() => 0));
  });

  it('reads a list of absent entries as no overlap', () => {
    expect(sketchSimilarity([null, undefined] as unknown as string[], ['1']))
      .toBe(0);
  });
});

describe('sketchesConverge - pairs it refuses to judge', () => {
  it('refuses two bodies too short to sketch', () => {
    const short = bodySketch('one two three four five');

    expect(short).toEqual([]);
    expect(sketchesConverge(short, short)).toBe(false);
  });

  // The inflation case again, at the entry point a caller actually
  // uses: the pair reads as a perfect match and still does not
  // converge, because convergence asks comparability first.
  it('refuses a stub against the document it came out of', () => {
    expect(sketchSimilarity(STUB_SKETCH, BASE_SKETCH)).toBe(1);
    expect(sketchesConverge(STUB_SKETCH, BASE_SKETCH)).toBe(false);
  });

  // A threshold of zero would converge anything the gate let through.
  // It does not get that far, which is what says the gate runs first.
  it('refuses an unjudgeable pair whatever threshold is asked for', () => {
    expect(sketchesConverge(STUB_SKETCH, BASE_SKETCH, 0)).toBe(false);
    expect(sketchesConverge([], [], 0)).toBe(false);
  });

  it('refuses anything that is not a list', () => {
    expect(sketchesConverge(undefined as unknown as string[], BASE_SKETCH))
      .toBe(false);
    expect(sketchesConverge(BASE_SKETCH, 'abc' as unknown as string[]))
      .toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Normalization, which everything downstream reads instead of the body
// ---------------------------------------------------------------------------

describe('shingleNormalize', () => {
  it('lowercases, collapses every separator and trims', () => {
    expect(shingleNormalize('  A--B\tc.d  ')).toBe('a b c d');
  });

  it('reads a body of nothing but separators as no words', () => {
    expect(shingleNormalize('  ...--\n  ')).toBe('');
  });

  // The clause the module header calls out. Letters are kept by
  // Unicode property rather than by an ASCII range, so a document in
  // a script with no ASCII in it normalizes to its own words instead
  // of to nothing. Written from code points, since this file is
  // ASCII.
  it('keeps letters and digits in any script', () => {
    const cyrillic = String.fromCodePoint(0x0410, 0x043b, 0x044c);
    const nordic = String.fromCodePoint(0x00c5, 0x00e4, 0x00f6);

    expect(shingleNormalize(`${cyrillic} ${nordic} 42`))
      .toBe(`${cyrillic.toLowerCase()} ${nordic.toLowerCase()} 42`);
  });

  // The shared roster's padded reading and its plain one differ by
  // exactly the invisible characters, so normalizing both is the one
  // assertion that says every member of that roster is separator
  // rather than letter.
  it('reduces every invisible character to a separator', () => {
    expect(shingleNormalize(INVISIBLE_TEXT_FIXTURE.text))
      .toBe(shingleNormalize(INVISIBLE_TEXT_FIXTURE.visible));
    expect(shingleNormalize(INVISIBLE_TEXT_FIXTURE.visible))
      .toBe(INVISIBLE_TEXT_FIXTURE.visible.toLowerCase());
  });

  // The character the roster deliberately leaves out, for the reason
  // it leaves it out: a reader sees a space there, so joining the two
  // words would be the wrong answer.
  it('reads a non-breaking space as a word separator', () => {
    expect(shingleNormalize(`alpha${NO_BREAK_SPACE.char}bravo`))
      .toBe('alpha bravo');
  });

  it('reads absence as no words', () => {
    expect(shingleNormalize(undefined as unknown as string)).toBe('');
    expect(shingleNormalize(null as unknown as string)).toBe('');
  });

  it('reads anything else as its own string conversion', () => {
    expect(shingleNormalize(42 as unknown as string)).toBe('42');
    expect(shingleNormalize([1, 2] as unknown as string)).toBe('1 2');
  });

  // The one ending a caller has to be ready for, and the contrast
  // with bodySketch two sections down.
  it('refuses a value whose string conversion throws', () => {
    expect(endingOf(() => shingleNormalize(HOSTILE.build() as string)))
      .not.toBe(ANSWERED);
  });
});

// ---------------------------------------------------------------------------
// The hash
// ---------------------------------------------------------------------------

describe('shingleHash', () => {
  /** Runs worth hashing: neighbours, repeats and the empty one. */
  const RUNS: readonly string[] = [
    '', 'a', 'b', 'ab', 'ba', 'alpha bravo', 'alpha bravq',
    'alpha bravo charlie delta echo foxtrot golf hotel',
    'alpha bravo charlie delta echo foxtrot golf hotal',
    String.fromCodePoint(0x0410, 0x043b), longBody(8), longBody(8, 1, 1),
  ];

  // The storage bound, over every run driven. A hash above the signed
  // maximum would come back out of an integer column as a negative
  // number, so this is the case that keeps a stored sketch readable.
  it('stays inside 63 bits for every run', () => {
    const ceiling = (BigInt(1) << BigInt(63)) - BigInt(1);
    const outside = RUNS.filter((run) => {
      const hash = shingleHash(run);

      return hash < BigInt(0) || hash > ceiling;
    });

    expect(outside).toEqual([]);
  });

  it('answers the masked offset basis for an empty run', () => {
    const basis = BigInt('14695981039346656037');
    const mask63 = (BigInt(1) << BigInt(63)) - BigInt(1);

    expect(shingleHash('')).toBe(basis & mask63);
  });

  it('answers the same hash for the same run every time', () => {
    const twice = RUNS.map(
      (run) => shingleHash(run) === shingleHash(run),
    );

    expect(twice).toEqual(RUNS.map(() => true));
  });

  // Two runs differing in one character must not collide, and the
  // roster carries three such pairs. A hash that had degenerated to a
  // length or a first character would pass every case above.
  it('separates runs differing in one character', () => {
    const hashes = RUNS.map((run) => shingleHash(run).toString());

    expect(new Set(hashes).size).toBe(RUNS.length);
  });
});

// ---------------------------------------------------------------------------
// Bodies with no sketch in them
// ---------------------------------------------------------------------------

describe('bodySketch - bodies it cannot sketch', () => {
  // The boundary, asserted from both sides in one case: one word
  // short is nothing, and exactly the run length is one hash. A
  // reading that had slipped by one would still produce sketches.
  it('sketches nothing below the run length and one run at it', () => {
    const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven',
      'eight'];

    expect(words.length).toBe(SHINGLE_WORDS);
    expect(bodySketch(words.slice(0, -1).join(' '))).toEqual([]);
    expect(bodySketch(words.join(' '))).toHaveLength(1);
  });

  it('sketches nothing for an empty body', () => {
    expect(bodySketch('')).toEqual([]);
  });

  it('sketches nothing for a body carrying no letters or digits', () => {
    expect(bodySketch('. - , ; ! ? ( ) [ ] : "')).toEqual([]);
  });

  it('sketches nothing for absence', () => {
    expect(bodySketch(undefined as unknown as string)).toEqual([]);
    expect(bodySketch(null as unknown as string)).toEqual([]);
  });

  // The half that separates this from shingleNormalize. A sketch is
  // an optimization, so a body that defeats it costs that document
  // its inexact-dedupe chance and nothing else — which means every
  // ending here has to be an empty sketch rather than a throw.
  it('answers an empty sketch for every value the shared roster holds', () => {
    const endings = ADVERSARIAL_VALUES.map(
      (entry) => `${entry.id}: ${endingOf(() => bodySketch(entry.build() as string))}`,
    );

    expect(endings).toEqual(
      ADVERSARIAL_VALUES.map((entry) => `${entry.id}: ${ANSWERED}`),
    );
  });

  it('answers an empty sketch where the normalizer would throw', () => {
    expect(endingOf(() => shingleNormalize(HOSTILE.build() as string)))
      .not.toBe(ANSWERED);
    expect(bodySketch(HOSTILE.build() as string)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The sketch a long body produces
// ---------------------------------------------------------------------------

describe('bodySketch - the sketch', () => {
  it('keeps at most the sketch size however long the body', () => {
    expect(bodySketch(longBody(3000))).toHaveLength(SHINGLE_SKETCH_SIZE);
    expect(BASE_SKETCH).toHaveLength(SHINGLE_SKETCH_SIZE);
  });

  it('grows one run per word until it is full', () => {
    const sizes = [8, 9, 12, 20].map((count) => bodySketch(longBody(count)).length);

    expect(sizes).toEqual([1, 2, 5, 13]);
  });

  // Ascending NUMERICALLY, which is the claim the length-then-text
  // comparator makes and which a plain text sort would break the
  // moment two hashes differed in width.
  it('orders the sketch by value, not by text', () => {
    const outOfOrder = BASE_SKETCH.filter(
      (hash, index) => index > 0 && BigInt(BASE_SKETCH[index - 1] ?? '0') >= BigInt(hash),
    );

    expect(outOfOrder).toEqual([]);
  });

  // Decimal strings rather than BigInt values, because a sketch is
  // JSON-encoded on its way to storage and serializing a BigInt
  // throws. Both halves asserted: what a sketch holds, and that the
  // round trip a stored sketch takes actually works.
  it('holds decimal strings a serializer can carry', () => {
    const kinds = BASE_SKETCH.map((hash) => typeof hash);

    expect(new Set(kinds)).toEqual(new Set(['string']));
    expect(JSON.parse(JSON.stringify(BASE_SKETCH))).toEqual(BASE_SKETCH);
    expect(endingOf(() => JSON.stringify([BigInt(1)]))).not.toBe(ANSWERED);
  });

  it('contributes a repeated phrase once', () => {
    const phrase = 'the same eight words repeated over and over ';
    const sketch = bodySketch(phrase.repeat(40));

    expect(new Set(sketch).size).toBe(sketch.length);
    expect(sketch.length).toBeLessThan(SHINGLE_SKETCH_SIZE);
  });

  it('sketches one body the same way every time', () => {
    expect(bodySketch(BASE_BODY)).toEqual(BASE_SKETCH);
  });

  // The corpus control. Its entries reach three different endings, so
  // a suite that had drifted into short fixtures alone would never
  // enter the loop the cases above are about.
  it('is driven over a corpus reaching empty, partial and full', () => {
    const sizes = [
      ...DELIMITED_RECORD_FIXTURES,
      ...MARKUP_FIXTURES,
      ...MULTIPART_MESSAGE_FIXTURES,
    ].map((fixture) => bodySketch(fixture.text).length);

    expect(sizes.filter((size) => size === 0).length).toBeGreaterThan(0);
    expect(sizes.filter((size) => size > 0 && size < SHINGLE_SKETCH_SIZE).length)
      .toBeGreaterThan(3);
    expect(sizes).toContain(SHINGLE_SKETCH_SIZE);
  });
});

// ---------------------------------------------------------------------------
// Overlap
// ---------------------------------------------------------------------------

describe('sketchSimilarity - overlap', () => {
  it('reads a sketch against itself as identical', () => {
    expect(sketchSimilarity(BASE_SKETCH, BASE_SKETCH)).toBe(1);
  });

  it('reads two sketches sharing nothing as no overlap', () => {
    expect(sketchSimilarity(BASE_SKETCH, OTHER_SKETCH)).toBe(0);
  });

  it('reads a half-shared pair as half', () => {
    const half = [...BASE_SKETCH.slice(0, 32), ...OTHER_SKETCH.slice(0, 32)];

    expect(sketchSimilarity(BASE_SKETCH, half)).toBe(0.5);
  });

  // The conversion is a plain `String(entry)`, so it matches only
  // where two entries PRINT the same. Small entries round-trip
  // through a number and a hash-sized one does not, because a double
  // cannot hold it. The pair is what makes this a reading rather than
  // a coincidence: the first half says the conversion is real, the
  // second says it does not rescue a sketch something already parsed.
  // The survivor count is derived rather than written down, so the
  // arithmetic is asserted without pinning a literal that would move.
  it('compares entries as text, which a hash-sized number defeats', () => {
    expect(sketchSimilarity(['1', '2', '3'], [1, 2, 3] as unknown as string[]))
      .toBe(1);

    const survivors = BASE_SKETCH.filter(
      (hash) => String(Number(hash)) === hash,
    );
    const asNumbers = BASE_SKETCH.map(Number) as unknown as string[];

    expect(survivors.length).toBeLessThan(SHINGLE_SKETCH_SIZE / 2);
    expect(sketchSimilarity(BASE_SKETCH, asNumbers))
      .toBe(survivors.length / SHINGLE_SKETCH_SIZE);
  });

  // The null-prototype pin. Written into a plain object literal this
  // key is a silent no-op on the way in and a truthy answer on the
  // way out, so every sketch carrying it would overlap every other.
  // Both readings are asserted, because only the pair separates a
  // real key from a prototype lookup.
  it('treats a prototype key as an ordinary entry', () => {
    expect(sketchSimilarity(['__proto__'], ['__proto__'])).toBe(1);
    expect(sketchSimilarity(['__proto__'], ['4200622132502314939'])).toBe(0);
    expect(sketchSimilarity(['toString'], ['constructor'])).toBe(0);
  });

  // A record rather than an endorsement: bodySketch deduplicates, so
  // nothing this library builds can reach here. A caller assembling a
  // sketch by hand can, and what it gets is a number above one.
  it('counts a repeated entry on the right each time it arrives', () => {
    expect(sketchSimilarity(['1'], ['1', '1', '1'])).toBe(3);
  });

  it('refuses an entry whose string conversion throws', () => {
    const hostile = [HOSTILE.build()] as unknown as string[];

    expect(endingOf(() => sketchSimilarity(hostile, ['1']))).not.toBe(ANSWERED);
  });
});

// ---------------------------------------------------------------------------
// Convergence
// ---------------------------------------------------------------------------

describe('sketchesConverge - pairs that converge', () => {
  // The pair the library exists for: one document republished inside
  // a wrapper. The margin is asserted rather than assumed, so a pair
  // that had drifted to the boundary fails here instead of passing
  // until something moved.
  it('converges a document with a wrapped copy of itself', () => {
    expect(sketchesConverge(BASE_SKETCH, EDITED_SKETCH)).toBe(true);
    expect(sketchSimilarity(BASE_SKETCH, EDITED_SKETCH))
      .toBeGreaterThan(SHINGLE_THRESHOLD + 0.1);
  });

  it('does not converge two unrelated documents', () => {
    expect(sketchesConverge(BASE_SKETCH, OTHER_SKETCH)).toBe(false);
    expect(sketchSimilarity(BASE_SKETCH, OTHER_SKETCH))
      .toBeLessThan(SHINGLE_THRESHOLD - 0.5);
  });

  it('applies a threshold a caller passes as a number', () => {
    const half = [...BASE_SKETCH.slice(0, 32), ...OTHER_SKETCH.slice(0, 32)];

    expect(sketchSimilarity(BASE_SKETCH, half)).toBe(0.5);
    expect(sketchesConverge(BASE_SKETCH, half, 0.4)).toBe(true);
    expect(sketchesConverge(BASE_SKETCH, half, 0.6)).toBe(false);
    expect(sketchesConverge(BASE_SKETCH, half)).toBe(false);
  });

  // The pin for the fallback the module header calls out. The same
  // number as text and as a number answer DIFFERENTLY over a pair
  // sharing nothing, which is the one arrangement where the fallback
  // is visible: zero converges everything comparable, and the default
  // converges nothing here.
  it('takes the default for a threshold that is not a finite number', () => {
    expect(sketchesConverge(BASE_SKETCH, OTHER_SKETCH, 0)).toBe(true);
    expect(sketchesConverge(BASE_SKETCH, OTHER_SKETCH, '0' as unknown as number))
      .toBe(false);
    expect(sketchesConverge(BASE_SKETCH, OTHER_SKETCH, Number.NaN)).toBe(false);
    expect(
      sketchesConverge(BASE_SKETCH, OTHER_SKETCH, Number.POSITIVE_INFINITY),
    ).toBe(false);
  });

  it('converges a sketch with itself', () => {
    expect(sketchesConverge(BASE_SKETCH, BASE_SKETCH)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The three parameters
// ---------------------------------------------------------------------------

describe('the parameters this library is bounded by', () => {
  it('exports the three the module header argues', () => {
    expect(SHINGLE_WORDS).toBe(8);
    expect(SHINGLE_SKETCH_SIZE).toBe(64);
    expect(SHINGLE_THRESHOLD).toBe(0.8);
  });

  // Each constant is asserted against the behaviour it names, not
  // just against its own value: a constant nothing reads would pass
  // the case above while the library used something else.
  it('reads each of them where it says it does', () => {
    expect(bodySketch(longBody(SHINGLE_WORDS))).toHaveLength(1);
    expect(bodySketch(longBody(SHINGLE_WORDS - 1))).toEqual([]);
    expect(bodySketch(longBody(3000))).toHaveLength(SHINGLE_SKETCH_SIZE);
    expect(sketchComparable(
      BASE_SKETCH.slice(0, SHINGLE_SKETCH_SIZE - 1),
      BASE_SKETCH,
    )).toBe(false);
  });
});
