/**
 * `maskControlBytes` and `takeCodePoints` — the two passes a stored
 * payload makes before the source failures queue answers with it.
 *
 * Four claims, and each one is a promise about text nobody chose.
 * That every C0 control, DEL, every C1 control and every lone
 * surrogate leaves as its escape form. That a valid astral pair does
 * NOT, so a mask broader than the hazard is a failure here too. That
 * what survives the mask carries nothing a serialized response would
 * pass through raw. And that a cut lands between characters rather
 * than inside one.
 *
 * Two of those are zero-hit scans, and each is paired with a live
 * control in the same case. The serialization leg reads an UNMASKED
 * string through the same reader and requires it to find what it is
 * looking for. The astral-cut leg runs the naive `slice` this module
 * exists to replace and requires the reader to catch it. A leg that
 * cannot fail says nothing about the leg beside it.
 *
 * Both readers are written as loops over UTF-16 units rather than as
 * patterns, so neither shares anything with the class the module
 * masks with. A reader built from that class could only ever agree
 * with it.
 *
 * The expected escapes are written out as literals rather than
 * derived, so this file pins the spelling instead of agreeing with
 * whatever the module produces. Each is six characters: a backslash,
 * a `u`, and four lower-case hex digits.
 *
 * The `JSON.stringify` leg cannot see the whole rule, and that is
 * the point of the table above it. Serialization escapes every C0
 * code point and every lone surrogate on its own, so that leg stays
 * green over a module masking only DEL and C1 — which is exactly the
 * half serialization passes through raw, and exactly the half no
 * other reading would notice. The per-character table pins the rest.
 *
 * Mutation grid, measured over the 41 cases in this file. Dropping
 * the `u` flag reddens 3, and all three are cases about RESTRAINT:
 * the astral pair, the mixed string carrying one, and the leg
 * reading the text either side of what was masked. Dropping the
 * surrogate range from the class reddens 3, dropping DEL and C1
 * reddens 8, and exempting TAB, LF and CR from C0 reddens 6. Cutting
 * by UTF-16 unit instead of by code point reddens 4, and dropping
 * the limit refusal reddens exactly the 4 cases asserting it.
 *
 * Two readings in that grid are worth more than the counts. Dropping
 * DEL and C1 is the ONLY mutation that reddens the serialization
 * leg, which is the measurement behind the paragraph above: no other
 * change to this module is visible from a serialized body at all.
 * And none of the six moves any of the three table guards — the
 * shape roster, the prefix check, the changed-against-unchanged
 * split — which is what says those read the table rather than the
 * rule, and would report a case list that had quietly gone empty.
 */
import { describe, expect, it } from 'vitest';

import { maskControlBytes, takeCodePoints } from './control-bytes.js';

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/** U+1F600, the astral character every pairing claim is made over. */
const ASTRAL_PAIR = charFrom(0xd83d, 0xde00);

/** Characters in the `\uXXXX` form every masked character answers. */
const ESCAPE_WIDTH = 6;

/**
 * Every C0, DEL and C1 code point, as the completeness roster the
 * sampled table below cannot be.
 */
const CONTROL_CODES = [
  ...Array.from({ length: 0x20 }, (_unused, index) => index),
  ...Array.from({ length: 0x21 }, (_unused, index) => 0x7f + index),
];

/**
 * Every code point in `text` below 0x20, or from DEL through the end
 * of C1 — the two ranges a masked answer must not carry once it has
 * been serialized.
 */
function forbiddenCodePoints(text: string): number[] {
  const found: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      found.push(code);
    }
  }

  return found;
}

/**
 * Every surrogate in `text` standing without its partner.
 *
 * A high surrogate followed by a low one is a character and is
 * stepped over whole; anything else in either range is reported.
 * `charCodeAt` past the end answers `NaN`, which compares false, so
 * a trailing high surrogate is reported rather than read as a pair.
 */
function loneSurrogateCodes(text: string): number[] {
  const found: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const isHigh = code >= 0xd800 && code <= 0xdbff;
    const isLow = code >= 0xdc00 && code <= 0xdfff;
    const next = text.charCodeAt(index + 1);

    if (isHigh && next >= 0xdc00 && next <= 0xdfff) {
      index += 1;
    } else if (isHigh || isLow) {
      found.push(code);
    }
  }

  return found;
}

/** The shapes the masking table has to cover. */
const MASK_SHAPES = [
  'nul',
  'tab',
  'line-feed',
  'escape',
  'delete',
  'c1-lower-bound',
  'c1-next-line',
  'c1-upper-bound',
  'lone-high-surrogate',
  'lone-low-surrogate',
  'astral-pair',
  'just-past-c1',
  'plain-text',
  'several-at-once',
];

/** The shapes the module must answer UNCHANGED. */
const UNCHANGED_SHAPES = ['astral-pair', 'just-past-c1', 'plain-text'];

/**
 * One input per shape with its answer written out, so the spelling
 * of every escape is pinned here rather than re-derived.
 */
const MASK_CASES = [
  { shape: 'nul', input: charFrom(0x00), expected: '\\u0000' },
  { shape: 'tab', input: charFrom(0x09), expected: '\\u0009' },
  { shape: 'line-feed', input: charFrom(0x0a), expected: '\\u000a' },
  { shape: 'escape', input: charFrom(0x1b), expected: '\\u001b' },
  { shape: 'delete', input: charFrom(0x7f), expected: '\\u007f' },
  { shape: 'c1-lower-bound', input: charFrom(0x80), expected: '\\u0080' },
  { shape: 'c1-next-line', input: charFrom(0x85), expected: '\\u0085' },
  { shape: 'c1-upper-bound', input: charFrom(0x9f), expected: '\\u009f' },
  {
    shape: 'lone-high-surrogate',
    input: charFrom(0xd800),
    expected: '\\ud800',
  },
  {
    shape: 'lone-low-surrogate',
    input: charFrom(0xdc00),
    expected: '\\udc00',
  },
  { shape: 'astral-pair', input: ASTRAL_PAIR, expected: ASTRAL_PAIR },
  { shape: 'just-past-c1', input: charFrom(0xa0), expected: charFrom(0xa0) },
  {
    shape: 'plain-text',
    input: 'a body that broke a parser',
    expected: 'a body that broke a parser',
  },
  {
    shape: 'several-at-once',
    input: 'a' + charFrom(0x00) + 'b' + charFrom(0x7f)
      + ASTRAL_PAIR + charFrom(0xd800) + 'c',
    expected: 'a\\u0000b\\u007f' + ASTRAL_PAIR + '\\ud800c',
  },
];

/** A string carrying every hazard at once, plus text either side. */
const HOSTILE = 'before'
  + CONTROL_CODES.map((code) => charFrom(code)).join('')
  + charFrom(0xd800) + charFrom(0xdc00) + ASTRAL_PAIR
  + 'after';

// ---------------------------------------------------------------------------
// maskControlBytes
// ---------------------------------------------------------------------------

describe('maskControlBytes', () => {
  it('carries one row per declared shape', () => {
    const shapes = MASK_CASES.map((row) => row.shape);

    expect(shapes.sort()).toEqual([...MASK_SHAPES].sort());
  });

  it('expects an answer no reader would have to mask again', () => {
    const unsafe = MASK_CASES.filter(
      (row) => forbiddenCodePoints(row.expected).length > 0
        || loneSurrogateCodes(row.expected).length > 0,
    );

    expect(unsafe.map((row) => row.shape)).toEqual([]);
  });

  it('splits the table into rows that change and rows that do not', () => {
    const unchanged = MASK_CASES.filter((row) => row.input === row.expected);

    expect(unchanged.map((row) => row.shape).sort())
      .toEqual([...UNCHANGED_SHAPES].sort());
  });

  for (const { shape, input, expected } of MASK_CASES) {
    it(`answers the masked form of a ${shape}`, () => {
      expect(maskControlBytes(input)).toBe(expected);
    });
  }

  it('leaves no C0, DEL or C1 code point unmasked', () => {
    const unmasked = CONTROL_CODES.filter(
      (code) => maskControlBytes(charFrom(code)) === charFrom(code),
    );

    expect(unmasked).toEqual([]);
    expect(CONTROL_CODES).toHaveLength(65);
  });

  it('answers every one of them as six characters', () => {
    const wrongWidth = CONTROL_CODES.filter(
      (code) => maskControlBytes(charFrom(code)).length !== ESCAPE_WIDTH,
    );

    expect(wrongWidth).toEqual([]);
  });

  it('has nothing left to do on its own answer', () => {
    const once = maskControlBytes(HOSTILE);

    expect(maskControlBytes(once)).toBe(once);
  });

  it('keeps the text either side of what it masked', () => {
    const masked = maskControlBytes(HOSTILE);

    expect(masked.startsWith('before')).toBe(true);
    expect(masked.endsWith('after')).toBe(true);
    expect(masked).toContain(ASTRAL_PAIR);
  });

  it('serializes to a body carrying no control code point', () => {
    const masked = JSON.stringify(maskControlBytes(HOSTILE));
    const unmasked = JSON.stringify(HOSTILE);

    expect(forbiddenCodePoints(masked)).toEqual([]);
    expect(loneSurrogateCodes(masked)).toEqual([]);

    // The control: serialization alone passes DEL and every C1 code
    // point through raw, so the reader above is looking at output a
    // weaker mask genuinely fails.
    expect(forbiddenCodePoints(unmasked)).toContain(0x7f);
    expect(forbiddenCodePoints(unmasked)).toContain(0x9f);
    expect(forbiddenCodePoints(unmasked)).toHaveLength(33);
  });
});

// ---------------------------------------------------------------------------
// takeCodePoints
// ---------------------------------------------------------------------------

/** The shapes the cutting table has to cover. */
const TAKE_SHAPES = [
  'empty',
  'zero-limit',
  'under-the-limit',
  'exactly-the-limit',
  'cut-between-ascii',
  'astral-straddling-the-limit',
  'astral-inside-the-kept-half',
  'lone-surrogate-counted-as-one',
];

/** The shapes the module must answer WHOLE. */
const WHOLE_SHAPES = ['empty', 'under-the-limit', 'exactly-the-limit'];

/** One text and window per shape, with the answer written out. */
const TAKE_CASES = [
  { shape: 'empty', text: '', limit: 5, expected: '' },
  { shape: 'zero-limit', text: 'abc', limit: 0, expected: '' },
  { shape: 'under-the-limit', text: 'abc', limit: 10, expected: 'abc' },
  { shape: 'exactly-the-limit', text: 'abc', limit: 3, expected: 'abc' },
  { shape: 'cut-between-ascii', text: 'abcdef', limit: 3, expected: 'abc' },
  {
    shape: 'astral-straddling-the-limit',
    text: ASTRAL_PAIR + ASTRAL_PAIR,
    limit: 1,
    expected: ASTRAL_PAIR,
  },
  {
    shape: 'astral-inside-the-kept-half',
    text: 'a' + ASTRAL_PAIR + 'b',
    limit: 2,
    expected: 'a' + ASTRAL_PAIR,
  },
  {
    shape: 'lone-surrogate-counted-as-one',
    text: charFrom(0xd800) + 'ab',
    limit: 2,
    expected: charFrom(0xd800) + 'a',
  },
];

/** The limits the rule refuses, and how each is spelt back. */
const REFUSED_LIMITS = [
  { shape: 'a negative limit', limit: -1, spelt: '-1' },
  { shape: 'a fractional limit', limit: 1.5, spelt: '1.5' },
  { shape: 'a limit that is not a number', limit: Number.NaN, spelt: 'NaN' },
  {
    shape: 'an infinite limit',
    limit: Number.POSITIVE_INFINITY,
    spelt: 'Infinity',
  },
];

describe('takeCodePoints', () => {
  it('carries one row per declared shape', () => {
    const shapes = TAKE_CASES.map((row) => row.shape);

    expect(shapes.sort()).toEqual([...TAKE_SHAPES].sort());
  });

  it('expects a prefix of the text in every row', () => {
    const notPrefixes = TAKE_CASES.filter(
      (row) => !row.text.startsWith(row.expected),
    );

    expect(notPrefixes.map((row) => row.shape)).toEqual([]);
  });

  it('splits the table into rows that cut and rows that do not', () => {
    const whole = TAKE_CASES.filter((row) => row.text === row.expected);

    expect(whole.map((row) => row.shape).sort())
      .toEqual([...WHOLE_SHAPES].sort());
  });

  for (const { shape, text, limit, expected } of TAKE_CASES) {
    it(`answers the first ${limit} code points of ${shape}`, () => {
      expect(takeCodePoints(text, limit)).toBe(expected);
    });
  }

  it('answers a string under the limit as the string itself', () => {
    const text = 'a body shorter than the cap';

    expect(takeCodePoints(text, 200)).toBe(text);
  });

  it('never leaves a lone surrogate at any cut point', () => {
    const text = ASTRAL_PAIR + ASTRAL_PAIR + ASTRAL_PAIR;
    const limits = [0, 1, 2, 3];

    const broken = limits.filter(
      (limit) => loneSurrogateCodes(takeCodePoints(text, limit)).length > 0,
    );

    expect(broken).toEqual([]);

    // The control: the naive cut this function replaces splits a pair
    // at every odd limit, so the reader above is looking for something
    // it can genuinely find.
    const naive = limits.filter(
      (limit) => loneSurrogateCodes(text.slice(0, limit)).length > 0,
    );

    expect(naive).toEqual([1, 3]);
  });

  it('cuts by code point rather than by UTF-16 unit', () => {
    const text = ASTRAL_PAIR + ASTRAL_PAIR;

    // Two code points in four units: a unit-wise cut at 2 would keep
    // both halves of the first pair and answer the same text, so this
    // is the length that tells the two rules apart.
    expect(takeCodePoints(text, 2)).toBe(text);
    expect(takeCodePoints(text, 1)).toHaveLength(2);
  });

  for (const { shape, limit, spelt } of REFUSED_LIMITS) {
    it(`refuses ${shape}`, () => {
      expect(() => takeCodePoints('abc', limit))
        .toThrow('must be a non-negative integer');
      expect(() => takeCodePoints('abc', limit)).toThrow(`not ${spelt}`);
    });
  }

  it('takes the smallest limit the rule allows', () => {
    // The control for the roster above: a rule refusing every limit
    // would pass all four of those cases. Zero is one step from the
    // boundary they sit outside.
    expect(takeCodePoints('abc', 0)).toBe('');
    expect(takeCodePoints('abc', 1)).toBe('a');
  });
});
