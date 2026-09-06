import { describe, expect, it } from 'vitest';

import {
  readBooleanField,
  readDatetimeField,
  readNumberField,
  readStringField,
} from './readers';

/**
 * The three sentences, RETYPED rather than imported.
 *
 * Deliberate, and the one place in this file where duplication is
 * the point: these are text an operator reads, so a reworded
 * sentence should red a case and be re-approved rather than travel
 * silently. A case importing the module's own constant agrees with
 * whatever that constant says, which is no reading at all.
 */
const NOT_A_NUMBER = 'Enter a finite number.';

/** The datetime SHAPE refusal, retyped for the same reason. */
const NOT_A_STAMP
  = 'Enter a timestamp with a time zone, '
  + 'such as 2026-01-01T00:00:00Z.';

/** The datetime CALENDAR refusal, retyped for the same reason. */
const NOT_A_REAL_DAY = 'That calendar date does not exist.';

/**
 * A stamp nothing below refuses, for the controls that need one.
 *
 * Every datetime case that is checking one field varies THAT field
 * off this stamp, so a refusal is attributable to the edit rather
 * than to some other part of the text.
 */
const GOOD_STAMP = '2026-01-01T00:00:00Z';

/**
 * Text distinctive enough that a sentence repeating it would say
 * so.
 *
 * The privacy case below is worth nothing against a value that
 * could appear by coincidence, and every short numeric spelling
 * could: `2` is in the example stamp. This is not.
 */
const SECRET = 'SNTNL9-do-not-repeat-me';

describe('what the number reader refuses', () => {
  it('refuses Infinity, which is not NaN', () => {
    // The whole reason the guard is `Number.isFinite`. The reflex
    // `!Number.isNaN(Number(text))` admits this, and the value it
    // admits serialises to `null` on the way to the payload.
    expect(readNumberField('Infinity')).toEqual({
      ok: false,
      sentence: NOT_A_NUMBER,
    });
  });

  it('refuses -Infinity', () => {
    expect(readNumberField('-Infinity')).toEqual({
      ok: false,
      sentence: NOT_A_NUMBER,
    });
  });

  it('refuses a decimal comma', () => {
    expect(readNumberField('12,5')).toEqual({
      ok: false,
      sentence: NOT_A_NUMBER,
    });
  });

  it('refuses the word NaN', () => {
    expect(readNumberField('NaN')).toEqual({
      ok: false,
      sentence: NOT_A_NUMBER,
    });
  });

  it('refuses a digit separator', () => {
    // Legal in a JavaScript literal and not in `Number`, which is
    // the one an operator is actually talking to.
    expect(readNumberField('1_000')).toEqual({
      ok: false,
      sentence: NOT_A_NUMBER,
    });
  });

  it('refuses digits with anything after them', () => {
    expect(readNumberField('12abc')).toEqual({
      ok: false,
      sentence: NOT_A_NUMBER,
    });
  });
});

describe('what the number reader accepts', () => {
  it('reads an empty box as null rather than zero', () => {
    // `Number('')` is `0`, so a reader guarding only on NaN writes
    // a zero nobody typed. The emptiness check runs first.
    expect(readNumberField('')).toEqual({ ok: true, value: null });
  });

  it('reads a whitespace-only box as null', () => {
    // `Number('  ')` is `0` as well, so trimming is part of the
    // same guard rather than a tidy-up beside it.
    expect(readNumberField('   ')).toEqual({ ok: true, value: null });
  });

  it('accepts a typed zero, which is not an empty box', () => {
    // The control for the two above: without it they are satisfied
    // by a reader that answers `null` for every falsy conversion.
    expect(readNumberField('0')).toEqual({ ok: true, value: 0 });
  });

  it('accepts a decimal point', () => {
    expect(readNumberField('12.5')).toEqual({
      ok: true,
      value: 12.5,
    });
  });

  it('accepts a negative number', () => {
    expect(readNumberField('-3')).toEqual({ ok: true, value: -3 });
  });

  it('accepts a value larger than a spinner would step', () => {
    // The direct-text claim: nothing here steps, filters or
    // reformats, so a long value arrives whole.
    const typed = '9007199254740991';

    expect(readNumberField(typed)).toEqual({
      ok: true,
      value: 9007199254740991,
    });
  });

  it('accepts whitespace around a number', () => {
    expect(readNumberField(' 12.5 ')).toEqual({
      ok: true,
      value: 12.5,
    });
  });

  it('accepts the two spellings JavaScript admits', () => {
    // Named in the module header as a stated consequence of
    // guarding with `Number.isFinite` and nothing else. Pinned here
    // so narrowing the grammar later is a deliberate change.
    expect(readNumberField('0x10')).toEqual({ ok: true, value: 16 });
    expect(readNumberField('1e3')).toEqual({ ok: true, value: 1000 });
  });
});

describe('what the datetime reader refuses', () => {
  it('refuses a day the calendar does not have', () => {
    // `Date.parse` ROLLS this to 2026-03-02 on both engines, so a
    // reader leaning on it saves a March instant for a February
    // date. The calendar guard is the only thing that refuses it.
    expect(readDatetimeField('2026-02-30T00:00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_REAL_DAY,
    });
  });

  it('refuses February 29th outside a leap year', () => {
    expect(readDatetimeField('2026-02-29T00:00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_REAL_DAY,
    });
  });

  it('refuses February 29th in a common century year', () => {
    // 1900 is divisible by 4 and is not a leap year. The case a
    // hand-rolled leap rule gets wrong, and the reason this module
    // asks the platform instead.
    expect(readDatetimeField('1900-02-29T00:00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_REAL_DAY,
    });
  });

  it('refuses a thirty-first of a thirty-day month', () => {
    expect(readDatetimeField('2026-04-31T00:00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_REAL_DAY,
    });
  });

  it('refuses a stamp carrying no time zone', () => {
    expect(readDatetimeField('2026-01-01T00:00:00')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses a date with no time at all', () => {
    // `Date.parse` accepts this and reads it as midnight UTC,
    // which is a zone the operator never named.
    expect(readDatetimeField('2026-01-01')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses text only Date.parse would recognise', () => {
    expect(readDatetimeField('Jan 1 2026')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses an offset written without its colon', () => {
    expect(readDatetimeField('2026-01-01T00:00:00+0200')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses a lowercase zone marker', () => {
    expect(readDatetimeField('2026-01-01T00:00:00z')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses a stamp with no seconds', () => {
    expect(readDatetimeField('2026-01-01T00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses a month and an hour out of range', () => {
    expect(readDatetimeField('2026-13-01T00:00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
    expect(readDatetimeField('2026-01-01T25:00:00Z')).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('refuses anything riding along beside a stamp', () => {
    // The anchors. Unanchored, both of these match somewhere.
    expect(readDatetimeField(`x${GOOD_STAMP}`)).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
    expect(readDatetimeField(`${GOOD_STAMP} and more`)).toEqual({
      ok: false,
      sentence: NOT_A_STAMP,
    });
  });

  it('names a different rule for a shape and for a day', () => {
    // What makes the two guards separately measurable: a case
    // asserting the sentence says WHICH one fired, so neither can
    // be deleted with the other still covering it.
    const shape = readDatetimeField('Jan 1 2026');
    const day = readDatetimeField('2026-02-30T00:00:00Z');

    expect(shape).toEqual({ ok: false, sentence: NOT_A_STAMP });
    expect(day).toEqual({ ok: false, sentence: NOT_A_REAL_DAY });
    expect(NOT_A_STAMP).not.toEqual(NOT_A_REAL_DAY);
  });
});

describe('what the datetime reader accepts', () => {
  it('reads an empty box as null', () => {
    expect(readDatetimeField('')).toEqual({ ok: true, value: null });
  });

  it('reads a whitespace-only box as null', () => {
    expect(readDatetimeField('  ')).toEqual({
      ok: true,
      value: null,
    });
  });

  it('accepts the canonical Z stamp', () => {
    expect(readDatetimeField(GOOD_STAMP)).toEqual({
      ok: true,
      value: GOOD_STAMP,
    });
  });

  it('accepts a signed offset and does not normalise it', () => {
    // The offset carries the operator's local zone, which is
    // information rather than formatting: rewriting it to the
    // equivalent `Z` would discard it.
    const offset = '2026-01-01T00:00:00+02:00';

    expect(readDatetimeField(offset)).toEqual({
      ok: true,
      value: offset,
    });
  });

  it('accepts a negative offset', () => {
    const offset = '2026-01-01T00:00:00-05:30';

    expect(readDatetimeField(offset)).toEqual({
      ok: true,
      value: offset,
    });
  });

  it('accepts fractional seconds', () => {
    // The shape `toISOString` produces, so a stamp this app wrote
    // reads back through the same box it came out of.
    const stamp = '2026-01-01T00:00:00.123Z';

    expect(readDatetimeField(stamp)).toEqual({
      ok: true,
      value: stamp,
    });
  });

  it('accepts February 29th inside a leap year', () => {
    const stamp = '2024-02-29T00:00:00Z';

    expect(readDatetimeField(stamp)).toEqual({
      ok: true,
      value: stamp,
    });
  });

  it('accepts February 29th in a leap century year', () => {
    // 2000 IS a leap year, and this is the other half of the rule
    // the 1900 case above pins.
    const stamp = '2000-02-29T00:00:00Z';

    expect(readDatetimeField(stamp)).toEqual({
      ok: true,
      value: stamp,
    });
  });

  it('accepts the last day of a thirty-one-day month', () => {
    const stamp = '2026-01-31T23:59:59Z';

    expect(readDatetimeField(stamp)).toEqual({
      ok: true,
      value: stamp,
    });
  });

  it('accepts a stamp whose year is below one hundred', () => {
    // The control for `setUTCFullYear` over `Date.UTC`, which
    // remaps a year in this range onto 1900 plus it and would
    // refuse this stamp through the calendar guard.
    const stamp = '0026-01-01T00:00:00Z';

    expect(readDatetimeField(stamp)).toEqual({
      ok: true,
      value: stamp,
    });
  });

  it('trims a pasted stamp down to the stamp', () => {
    expect(readDatetimeField(` ${GOOD_STAMP} `)).toEqual({
      ok: true,
      value: GOOD_STAMP,
    });
  });

  it('reads the same text the same way twice', () => {
    // The regex is module scope. With a `g` flag it would carry
    // `lastIndex` between calls and refuse every second reading.
    const first = readDatetimeField(GOOD_STAMP);

    expect(readDatetimeField(GOOD_STAMP)).toEqual(first);
  });
});

describe('what the string reader answers', () => {
  it('reads an empty box as null', () => {
    expect(readStringField('')).toEqual({ ok: true, value: null });
  });

  it('reads a whitespace-only box as null', () => {
    expect(readStringField('   ')).toEqual({ ok: true, value: null });
  });

  it('answers text exactly as it was typed', () => {
    expect(readStringField('rain')).toEqual({
      ok: true,
      value: 'rain',
    });
  });

  it('keeps whitespace around text somebody typed', () => {
    // The asymmetry with the datetime reader beside it: a stamp is
    // a grammar this module parses, where a string is prose the
    // form has no business editing.
    expect(readStringField(' rain ')).toEqual({
      ok: true,
      value: ' rain ',
    });
  });

  it('accepts text that reads as another type', () => {
    // A string field has no rule to break, so none of the
    // spellings the other readers refuse means anything here.
    expect(readStringField('Infinity')).toEqual({
      ok: true,
      value: 'Infinity',
    });
    expect(readStringField('2026-02-30T00:00:00Z')).toEqual({
      ok: true,
      value: '2026-02-30T00:00:00Z',
    });
  });
});

describe('what the boolean reader answers', () => {
  it('answers a switch that was turned on', () => {
    expect(readBooleanField(true)).toEqual({ ok: true, value: true });
  });

  it('answers a switch that was turned off', () => {
    // `value: false` beside `ok: true` is the reading the union
    // exists for: a falsiness check at a call site reads this
    // accepted `false` as a refusal.
    expect(readBooleanField(false)).toEqual({
      ok: true,
      value: false,
    });
  });
});

describe('what no refusal sentence carries', () => {
  it('repeats nothing that was typed', () => {
    // The header's law, measured rather than asserted. Every
    // refusal below is produced by text carrying a distinctive
    // marker, and no sentence may carry it back.
    const refusals = [
      readNumberField(SECRET),
      readDatetimeField(SECRET),
      readDatetimeField(`2026-02-30T00:00:00Z ${SECRET}`),
    ];

    for (const reading of refusals) {
      expect(reading.ok).toBe(false);

      if (!reading.ok) {
        expect(reading.sentence).not.toContain(SECRET);
        expect(reading.sentence).not.toContain('SNTNL9');
      }
    }
  });

  it('answers one of exactly three sentences', () => {
    // The roster, so a fourth sentence added without a case is a
    // red rather than an unread branch.
    const sentences = [NOT_A_NUMBER, NOT_A_STAMP, NOT_A_REAL_DAY];
    const seen = [
      readNumberField('12,5'),
      readDatetimeField('Jan 1 2026'),
      readDatetimeField('2026-02-30T00:00:00Z'),
    ];

    for (const reading of seen) {
      expect(reading.ok).toBe(false);

      if (!reading.ok) {
        expect(sentences).toContain(reading.sentence);
      }
    }

    expect(new Set(sentences).size).toBe(3);
  });
});
