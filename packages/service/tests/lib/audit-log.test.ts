/**
 * Cases for `src/lib/audit-log.ts`: what it does with values that
 * are not there and values that cannot be written down, and only
 * then what it does with a run that went fine.
 *
 * That order is the file's argument rather than its layout. A
 * ledger's whole job is to be readable afterwards, and every way it
 * can quietly fail at that is a value it could not represent: a
 * count that arrived as prose and became zero, a column that a
 * hostile value cost the whole line, a stamp built from a moment
 * nobody supplied. A suite that opened with a well-formed record
 * would pass over all of them, because a well-formed record is the
 * one input every version of this library handles.
 *
 * So the absent and the unrepresentable come first, one section per
 * coercion, and the null-vs-zero rule is asserted in both directions
 * every time it comes up: a measured zero is `0` and an unmeasured
 * quantity is `null`, and a case that only checked one of those
 * would pass for an implementation that collapsed them.
 *
 * The hostile values come from `tests/parity/fixtures.ts` rather
 * than from a list written here, because the parity suite drives
 * both implementations over that same roster — two lists that agree
 * until somebody edits one is exactly the arrangement this avoids.
 * The roster is also this file's own non-vacuity control: a case
 * asserts that driving it produces every ending the sections below
 * claim to cover, so a roster that had drifted into inert values
 * could not leave those sections agreeing about paths they never
 * entered.
 *
 * ## Characterization, and where it starts
 *
 * The kind roster and the output directory are arguments to this
 * port rather than constants in it, which the module header argues
 * at length. The consequence for this file is that the sections
 * below the coercions are CHARACTERIZATION: no original exists that
 * takes those arguments, so the parity suite cannot drive both sides
 * of {@link assertAuditKind}, {@link auditLogPath},
 * {@link buildAuditFile} or {@link auditItems} over one input, and
 * these cases are the whole record of what they do.
 *
 * The two kinds every case here uses are therefore declared IN this
 * file and belong to it. They are shaped to cover the spread the
 * parameterization has to survive rather than to describe anything:
 * one kind declares a numeric column and one declares none, which is
 * the same spread a real roster turns out to have, and a coercion
 * that ignored the numeric list would still pass over a roster where
 * every kind looked alike.
 *
 * ## Two shapes worth knowing before reading a failure
 *
 * A refusal is read as its SENTENCE, through {@link refusalOf},
 * rather than through a bare throw assertion. Five of the checks in
 * {@link assertAuditKind} refuse the same call, and a case that only
 * knew a throw happened would pass for any of them — including for
 * the one that fired by accident on the way to the one being tested.
 *
 * And a line is read as a whole object rather than key by key.
 * Column ORDER is part of what a kind declares, so several cases
 * assert `Object.keys` explicitly: a line carrying the right values
 * in the wrong order is a file whose columns cannot be cut, and an
 * equality over the object alone would not see it.
 */
import type { AuditKind } from '../../src/lib/audit-log.js';

import { describe, expect, it } from 'vitest';

import {
  AUDIT_FIELD_CHARS,
  AUDIT_STAMP_FIELD,
  assertAuditKind,
  auditItems,
  auditLine,
  auditLogPath,
  auditNumber,
  auditStamp,
  auditText,
  buildAuditFile,
} from '../../src/lib/audit-log.js';
import {
  ADVERSARIAL_VALUES,
  INVISIBLE_CODE_POINTS,
  INVISIBLE_TEXT_FIXTURE,
  NO_BREAK_SPACE,
  fixtureById,
} from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// The two kinds these cases are driven over
// ---------------------------------------------------------------------------

/**
 * A kind that declares a numeric column.
 *
 * Neutral by construction: nothing here is a column any particular
 * domain writes, because a roster is a domain's to declare. What it
 * stands for is the SHAPE — a stamp column, a run column, a text
 * column and a count — which is what every case below actually
 * needs.
 */
const READINGS: AuditKind = {
  id: 'readings',
  fields: ['ts', 'run', 'station', 'sample_count', 'outcome'],
  numericFields: ['sample_count'],
};

/**
 * A kind that declares none.
 *
 * The other half of the spread. A numeric list that is empty is not
 * a degenerate case to be tidied away — measured on a real roster,
 * one of its two kinds had no numeric column at all — and a coercion
 * keyed on a non-empty list would pass every case driven over
 * {@link READINGS} alone.
 */
const REQUESTS: AuditKind = {
  id: 'requests',
  fields: ['ts', 'run', 'target', 'outcome'],
  numericFields: [],
};

/** Both kinds, for the cases that drive the roster rather than one. */
const KINDS: readonly AuditKind[] = [READINGS, REQUESTS];

/** The directory every case writes into, since it is an argument. */
const LOG_DIR = 'logs';

/** The deployment every case writes as, for the same reason. */
const SITE = 'site-a';

/** A moment with a non-zero millisecond part, so the dot is visible. */
const MOMENT = new Date(1755250862317);

/** That moment as the filename part {@link auditStamp} makes of it. */
const MOMENT_STAMP = '2025-08-15T09-41-02-317Z';

/** And as the value a line's stamp column carries. */
const MOMENT_ISO = '2025-08-15T09:41:02.317Z';

// ---------------------------------------------------------------------------
// Reading an ending
// ---------------------------------------------------------------------------

/** What {@link refusalOf} answers for a call that returned instead. */
const NOTHING_THROWN = '<nothing was thrown>';

/**
 * How every sentence this library refuses with opens.
 *
 * Two cases read a refusal by its ABSENCE from a message: the
 * wording an engine uses for a conversion it cannot perform differs
 * between the runtimes this suite is launched under, so the stable
 * claim is that the sentence is not one this library wrote.
 */
const LIBRARY_PREFIX = 'audit-log:';

/**
 * The whole sentence a call was refused with.
 *
 * Answers a string in every case, including the two that are
 * themselves failures — a call that returned, and a throw that was
 * not an `Error`. Both then read as an ordinary string mismatch
 * naming what happened, where a bare throw assertion would report
 * the first as a missing throw and swallow the second entirely.
 *
 * @param run - The call under test.
 * @returns Its refusal message, or a description of what it did
 * instead.
 */
function refusalOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error
      ? error.message
      : `threw a non-Error: ${String(error)}`;
  }

  return NOTHING_THROWN;
}

/**
 * One adversarial value, built fresh.
 *
 * Every roster entry builds a new value per call, which matters for
 * the one that holds itself: two cases sharing an instance would be
 * two cases about the same object graph.
 *
 * @param id - The roster entry wanted.
 * @returns A value nothing else refers to.
 */
function adversarial(id: string): unknown {
  return fixtureById(ADVERSARIAL_VALUES, id).build();
}

/** A character from its code point, so this source stays plain. */
function codePoint(value: number): string {
  return String.fromCodePoint(value);
}

/** The first control character, which nothing renders. */
const NUL = codePoint(0x00);

/** The last one, which is not in the printable range either. */
const DELETE = codePoint(0x7f);

/** A tab: a literal one is a lint error here. */
const TAB = codePoint(0x09);

/** The two separators serialization emits literally. */
const LINE_SEPARATOR = codePoint(0x2028);

/** The other one. */
const PARAGRAPH_SEPARATOR = codePoint(0x2029);

/** A width-less character that is NOT whitespace to the language. */
const ZERO_WIDTH_SPACE = codePoint(0x200b);

// ---------------------------------------------------------------------------
// The corpus control, before anything reads it
// ---------------------------------------------------------------------------

describe('the roster these sections are driven over', () => {
  // The non-vacuity leg for both coercion sections. Every claim
  // below is of the form "this value produces that ending", and a
  // roster that had drifted into ordinary strings would satisfy all
  // of them while entering none of the paths they are about. Read
  // off the values themselves rather than off their ids, since an id
  // is a claim and an ending is a measurement.
  it('still produces every ending the coercions can have', () => {
    const endings = ADVERSARIAL_VALUES.map((entry) => {
      const text = refusalOf(() => auditText(entry.build()));
      const number = refusalOf(() => auditNumber(entry.build()));

      if (text !== NOTHING_THROWN || number !== NOTHING_THROWN) {
        return 'refused';
      }

      return auditNumber(entry.build()) === null
        ? 'unmeasured'
        : 'measured';
    });

    expect(endings).toContain('refused');
    expect(endings).toContain('unmeasured');
    expect(endings).toContain('measured');
  });

  // The other half: a roster whose every entry refused would satisfy
  // the case above through one branch. Text has to come back too.
  it('still produces text as well as refusals', () => {
    const answered = ADVERSARIAL_VALUES.filter(
      (entry) => refusalOf(() => auditText(entry.build())) === NOTHING_THROWN,
    );
    const rendered = answered.map((entry) => auditText(entry.build()));

    expect(rendered).toContain(null);
    expect(rendered.filter((value) => typeof value === 'string').length)
      .toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// auditText: absence, then the values that cannot be written down
// ---------------------------------------------------------------------------

describe('auditText — values that are absent', () => {
  // Six different ways of having nothing, all answering the same
  // thing. A column holding an empty string and a column holding
  // nothing are the same fact about the run, and an implementation
  // that told them apart would be reporting on its caller.
  it('answers null for every way a value can be absent', () => {
    const absent: readonly unknown[] = [
      null,
      undefined,
      '',
      '   ',
      `${NUL}${DELETE}`,
      `${TAB}${TAB}`,
    ];

    expect(absent.map((value) => auditText(value)))
      .toEqual(absent.map(() => null));
  });

  // The other side of the same rule, and the one an absence test
  // alone would let through: a value that IS there and renders as
  // something short renders, rather than joining the absent.
  it('answers text for a measured zero rather than nothing', () => {
    expect(auditText(0)).toBe('0');
    expect(auditText(false)).toBe('false');
  });
});

describe('auditText — values that cannot be written down', () => {
  // The one seam here that refuses. A value whose text conversion
  // throws costs the caller the call, and the sentence that comes
  // back is the fixture's own rather than one this library invented
  // — which is what says the throw came from the conversion.
  it('lets a refusing text conversion through as it stands', () => {
    expect(refusalOf(() => auditText(adversarial('hostile-string-conversion'))))
      .toBe('this fixture refuses string conversion');
  });

  // Three values a serializer cannot model, all of which a text
  // conversion can. The circular one is the interesting member: a
  // pass that rendered through serialization would throw on it, and
  // one that rendered through a JSON round trip would answer an
  // empty object. This renders it.
  it('renders values a serializer models badly or not at all', () => {
    expect(auditText(adversarial('big-integer'))).toBe('9007199254740993');
    expect(auditText(adversarial('symbol'))).toBe('Symbol(parity-fixture)');
    expect(auditText(adversarial('circular-object'))).toBe('[object Object]');
  });

  // A number that is not one renders as itself rather than becoming
  // absent. Text and number part company here on purpose: the same
  // value is `null` to {@link auditNumber} and the word to this.
  it('renders a non-number as the word rather than as absence', () => {
    expect(auditText(adversarial('not-a-number'))).toBe('NaN');
    expect(auditText(adversarial('positive-infinity'))).toBe('Infinity');
  });
});

describe('auditText — one line, whatever arrived', () => {
  it('turns every control character into a space and collapses it', () => {
    expect(auditText(`a${NUL}${NUL}b`)).toBe('a b');
    expect(auditText(`a${DELETE}b`)).toBe('a b');
    expect(auditText(`a${TAB}${TAB}b`)).toBe('a b');
    expect(auditText('  spread   out  ')).toBe('spread out');
  });

  // The claim the whole line format rests on: whatever a value
  // carried, what comes back cannot end a record early. Driven over
  // the whole invisible roster rather than the two separators alone,
  // since the roster is what a hostile value would be assembled
  // from.
  it('answers nothing that could split a record across two lines', () => {
    const padded = INVISIBLE_CODE_POINTS.map(
      (entry) => auditText(`before${entry.char}after`) ?? '',
    );
    const split = padded.filter(
      (value) => value.includes(LINE_SEPARATOR)
        || value.includes(PARAGRAPH_SEPARATOR)
        || value.includes('\n'),
    );

    expect(padded.length).toBe(INVISIBLE_CODE_POINTS.length);
    expect(split).toEqual([]);
  });

  // Characterization, and the reading most likely to be assumed
  // wrong: this is a LINE bound, not an invisible-character strip.
  // Measured over the roster, fourteen of its seventeen members come
  // back untouched — every one of them is neither a control
  // character nor whitespace to the language — and the three that
  // vanish do so through the whitespace collapse rather than through
  // any rule about visibility. A caller that needs the other thing
  // is asking a different library for it.
  it('is a line bound rather than an invisible-character strip', () => {
    const surviving = INVISIBLE_CODE_POINTS.filter(
      (entry) => auditText(`a${entry.char}b`) === `a${entry.char}b`,
    );
    const collapsed = INVISIBLE_CODE_POINTS.filter(
      (entry) => auditText(`a${entry.char}b`) === 'a b',
    );

    expect(surviving.length).toBe(14);
    expect(collapsed.map((entry) => entry.id)).toEqual([
      'line-separator',
      'paragraph-separator',
      'byte-order-mark',
    ]);
    expect(auditText(`a${ZERO_WIDTH_SPACE}b`)).toBe(`a${ZERO_WIDTH_SPACE}b`);
  });

  // The space-like character the roster deliberately excludes. It
  // collapses like any other whitespace, which is the right answer
  // for it and the wrong one for every member above.
  it('collapses a space-like character rather than keeping it', () => {
    expect(auditText(`a${NO_BREAK_SPACE.char}b`)).toBe('a b');
  });

  // Read through the fixture pair, which differs from its plain
  // reading by exactly the roster: the padded text still carries
  // every surviving member, and both readings hold the same words.
  it('keeps the words a padded document and a plain one share', () => {
    const padded = auditText(INVISIBLE_TEXT_FIXTURE.text) ?? '';
    const plain = auditText(INVISIBLE_TEXT_FIXTURE.visible);

    expect(plain).toBe(INVISIBLE_TEXT_FIXTURE.visible);
    expect(padded).not.toBe(plain);
    expect(INVISIBLE_TEXT_FIXTURE.visible.split(' ').every(
      (word) => padded.includes(word),
    )).toBe(true);
  });
});

describe('auditText — the cap, and the three ways it surprises', () => {
  it('cuts at the default when a caller names none', () => {
    const long = 'x'.repeat(AUDIT_FIELD_CHARS + 200);

    expect(auditText(long)?.length).toBe(AUDIT_FIELD_CHARS);
    expect(auditText('short')).toBe('short');
  });

  it('cuts at a number a caller names', () => {
    expect(auditText('abcdefghij', 3)).toBe('abc');
    expect(auditText('abcdefghij', 100)).toBe('abcdefghij');
    expect(auditText('abcdefghij', 0)).toBe('');
  });

  // Preserved, not repaired. A cap that arrived as text is not a
  // cap, and the fallback is silent — which is the original's
  // reading and is why a caller passing configuration through
  // without parsing it gets the default rather than an error.
  it('falls back to the default for a cap that is not a number', () => {
    const long = 'x'.repeat(AUDIT_FIELD_CHARS + 200);

    expect(auditText(long, '9')?.length).toBe(AUDIT_FIELD_CHARS);
    expect(auditText(long, null)?.length).toBe(AUDIT_FIELD_CHARS);
    expect(auditText(long, {})?.length).toBe(AUDIT_FIELD_CHARS);
  });

  // The boundary a reader gets backwards. A number that is not one
  // IS a number, so it passes the fallback check and then caps
  // nothing, because every comparison against it is false.
  it('caps nothing at all when the cap is not a number but is one', () => {
    const long = 'x'.repeat(AUDIT_FIELD_CHARS + 200);

    expect(auditText(long, Number.NaN)?.length).toBe(long.length);
  });

  // The other one. The cut is a slice, so a negative cap is an
  // offset from the END rather than a refusal or an empty answer.
  it('cuts from the end when the cap is negative', () => {
    expect(auditText('abcdefghij', -1)).toBe('abcdefghi');
    expect(auditText('abcdefghij', -1000)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// auditNumber: the null-vs-zero rule, in both directions
// ---------------------------------------------------------------------------

describe('auditNumber — quantities nobody measured', () => {
  it('answers null for every way a quantity can be absent', () => {
    const absent: readonly unknown[] = [null, undefined, ''];

    expect(absent.map((value) => auditNumber(value)))
      .toEqual(absent.map(() => null));
  });

  // The rule this library exists to keep. Each of these could
  // plausibly be read as zero, and a ledger reporting zero for a run
  // whose quantity it failed to parse is worse than one reporting
  // nothing — only one of the two is visibly missing.
  it('answers null rather than zero for what it cannot read', () => {
    const unreadable: readonly unknown[] = [
      adversarial('not-a-number'),
      adversarial('positive-infinity'),
      Number.NEGATIVE_INFINITY,
      adversarial('circular-object'),
      'not a number at all',
      {},
    ];

    expect(unreadable.map((value) => auditNumber(value)))
      .toEqual(unreadable.map(() => null));
  });

  // Read as "this library did not answer and did not rewrite the
  // sentence" rather than as the sentence itself: the wording of a
  // refused numeric conversion is the engine's and differs between
  // the runtimes this suite is launched under. What IS stable is
  // that the refusal is not one of this library's, so a version that
  // caught the throw and answered null would fail here. The fixture
  // whose own conversion refuses supplies the exact-sentence half.
  it('lets a numeric conversion refuse in its own words', () => {
    const refused = refusalOf(() => auditNumber(adversarial('symbol')));

    expect(refused).not.toBe(NOTHING_THROWN);
    expect(refused).not.toContain(LIBRARY_PREFIX);
    expect(refusalOf(() => auditNumber(adversarial('hostile-string-conversion'))))
      .toBe('this fixture refuses string conversion');
  });
});

describe('auditNumber — quantities somebody measured', () => {
  it('answers zero for a measured zero', () => {
    expect(auditNumber(0)).toBe(0);
    expect(auditNumber('0')).toBe(0);
  });

  // The signed zero the differ and this library both keep, and JSON
  // does not. Asserted by identity rather than by equality, since
  // the two zeroes are equal under everything else.
  it('keeps a negative zero as one', () => {
    expect(Object.is(auditNumber(adversarial('negative-zero')), -0)).toBe(true);
    expect(Object.is(auditNumber(0), -0)).toBe(false);
  });

  // Characterization, and wider than a reader expects. Preserved
  // rather than narrowed to decimal text: narrowing it would
  // silently change what an already-stored count means.
  it('accepts everything a numeric conversion accepts', () => {
    expect(auditNumber(true)).toBe(1);
    expect(auditNumber(adversarial('empty-array'))).toBe(0);
    expect(auditNumber('0x10')).toBe(16);
    expect(auditNumber(adversarial('numeric-string'))).toBe(12.5);
    expect(auditNumber(adversarial('big-integer'))).toBe(9007199254740992);
  });
});

// ---------------------------------------------------------------------------
// auditStamp: moments, and things that are not one
// ---------------------------------------------------------------------------

describe('auditStamp — values that are not a moment', () => {
  // Refused rather than guessed. A stamp that guessed would put two
  // runs in one file or one run in a file named for a moment that
  // never happened, and the refusal names the value so a log says
  // which caller was wrong.
  it('refuses every value that is not a moment, naming it', () => {
    const refused: readonly (readonly [unknown, string])[] = [
      [null, 'null'],
      [undefined, 'undefined'],
      ['', '""'],
      ['not a date', '"not a date"'],
      [{}, '{}'],
      [[], '[]'],
      [Number.NaN, 'null'],
      [new Date(Number.NaN), 'null'],
    ];

    expect(refused.map(([value]) => refusalOf(() => auditStamp(value))))
      .toEqual(refused.map(
        ([, shown]) => `audit-log: ${shown} is not a timestamp`,
      ));
  });

  // Two values that never reach the guard above: the conversion
  // itself raises first. Recorded rather than repaired, because the
  // sentence a caller sees is the language's and this library never
  // sees the value at all.
  it('lets the conversion refuse before it can', () => {
    const engineRefused = ['big-integer', 'symbol'].map(
      (id) => refusalOf(() => auditStamp(adversarial(id))),
    );

    expect(engineRefused).not.toContain(NOTHING_THROWN);
    expect(engineRefused.filter((message) => message.includes(LIBRARY_PREFIX)))
      .toEqual([]);
    expect(refusalOf(() => auditStamp(adversarial('hostile-string-conversion'))))
      .toBe('this fixture refuses string conversion');
  });
});

describe('auditStamp — moments', () => {
  it('answers the same moment for a date and for its milliseconds', () => {
    expect(auditStamp(MOMENT)).toBe(MOMENT_STAMP);
    expect(auditStamp(MOMENT.getTime())).toBe(MOMENT_STAMP);
    expect(auditStamp(MOMENT_ISO)).toBe(MOMENT_STAMP);
  });

  // Both substitutions, asserted as absences rather than as one
  // expected string: what the replacement is FOR is that neither
  // character reaches a filename.
  it('leaves no colon and no dot in what goes into a filename', () => {
    expect(auditStamp(MOMENT)).not.toContain(':');
    expect(auditStamp(MOMENT)).not.toContain('.');
  });

  // The property the whole one-file-per-write arrangement rests on.
  // Three moments in order have to produce three stamps in the same
  // order under a plain string sort, or concatenating a directory by
  // name replays a history out of sequence.
  it('sorts three moments the way the moments sort', () => {
    const moments = [0, 1755250862317, 1755250862318, 1893456000000];
    const stamps = moments.map((ms) => auditStamp(ms));

    expect([...stamps].sort()).toEqual(stamps);
  });
});

// ---------------------------------------------------------------------------
// assertAuditKind: the guard the parameterization owes
// ---------------------------------------------------------------------------

/**
 * A value as whatever a signature wanted.
 *
 * Every guard below exists for the spliced context, where no type
 * was ever checked and a kind is whatever a node handed over. So a
 * case for one has to reach past the compiler to get at it, and this
 * is the one place that happens.
 *
 * @param value - Whatever the guard is being shown.
 * @returns The same value, as the type the signature declares.
 */
function unchecked<T>(value: unknown): T {
  return value as T;
}

/** The kind refusals below build their variants from. */
function kindWith(changes: Partial<Record<string, unknown>>): AuditKind {
  return unchecked({ ...READINGS, ...changes });
}

describe('assertAuditKind — a kind that is not one', () => {
  it('refuses anything that is not a record, naming it', () => {
    const refused: readonly (readonly [unknown, string])[] = [
      [null, 'null'],
      [undefined, 'undefined'],
      [[], '[]'],
      ['readings', '"readings"'],
      [7, '7'],
    ];

    expect(refused.map(
      ([value]) => refusalOf(() => assertAuditKind(unchecked(value))),
    )).toEqual(refused.map(
      ([, shown]) => `audit-log: log kind ${shown} is not a record`,
    ));
  });

  // The id lands in a filename, so it is bounded on exactly the
  // terms the original bounded a site slug: what it can DO, not what
  // it says. Five ways of failing that, each naming the value.
  it('refuses an id that could not be part of a filename', () => {
    const refused: readonly (readonly [unknown, string])[] = [
      ['', '""'],
      ['Readings', '"Readings"'],
      ['-readings', '"-readings"'],
      ['read_ings', '"read_ings"'],
      ['a'.repeat(41), `"${'a'.repeat(41)}"`],
      [7, '7'],
    ];

    expect(refused.map(
      ([id]) => refusalOf(() => assertAuditKind(kindWith({ id }))),
    )).toEqual(refused.map(
      ([, shown]) => `audit-log: unusable log kind id ${shown}`,
    ));
  });

  it('refuses a kind declaring no columns at all', () => {
    const expected = 'audit-log: log kind "readings" declares no fields';

    expect(refusalOf(() => assertAuditKind(kindWith({ fields: [] }))))
      .toBe(expected);
    expect(refusalOf(() => assertAuditKind(kindWith({ fields: 'ts' }))))
      .toBe(expected);
  });

  // The check that closes the silent drop. A column name that a
  // plain object cannot hold is refused where it is DECLARED, which
  // is the only place a caller can act on it.
  it('refuses a column name that could not become one', () => {
    const prototypeKey = `${'__'}proto${'__'}`;
    const refused: readonly string[] = [
      prototypeKey,
      'Station',
      '1st',
      '',
      'sample-count',
    ];

    expect(refused.map(
      (field) => refusalOf(() => assertAuditKind(kindWith({ fields: [field] }))),
    )).toEqual(refused.map(
      (field) => `audit-log: unusable field name "${field}" `
        + 'in log kind "readings"',
    ));
  });

  // Why that check is worth its line rather than being tidiness.
  // Assigning the prototype key into a plain object is a no-op that
  // reports nothing: the column would be declared, never written,
  // and absent from every line with nothing to say so.
  it('refuses it because a plain object would drop it in silence', () => {
    const prototypeKey = `${'__'}proto${'__'}`;
    const line: Record<string, unknown> = {};

    line[prototypeKey] = 'written';
    line.other = 'written';

    expect(Object.keys(line)).toEqual(['other']);
    expect(Object.hasOwn(line, prototypeKey)).toBe(false);
  });

  it('refuses a column declared twice', () => {
    expect(refusalOf(() => assertAuditKind(
      kindWith({ fields: ['ts', 'run', 'ts'] }),
    ))).toBe('audit-log: duplicate field "ts" in log kind "readings"');
  });

  it('refuses a numeric list that is not a list', () => {
    expect(refusalOf(() => assertAuditKind(
      kindWith({ numericFields: 'sample_count' }),
    ))).toBe('audit-log: log kind "readings" declares no numeric fields');
  });

  // A numeric column naming something the kind does not declare is a
  // column that would be read as text forever with nothing to say
  // so, which is exactly the kind of fault a ledger cannot report on
  // itself.
  it('refuses a numeric column the kind does not declare', () => {
    expect(refusalOf(() => assertAuditKind(
      kindWith({ numericFields: ['sample_count', 'missing_one'] }),
    ))).toBe(
      'audit-log: numeric field "missing_one" is not a field '
      + 'of log kind "readings"',
    );
  });

  it('accepts both kinds these cases are driven over', () => {
    expect(KINDS.map((kind) => refusalOf(() => assertAuditKind(kind))))
      .toEqual(KINDS.map(() => NOTHING_THROWN));
  });
});

// ---------------------------------------------------------------------------
// auditLine: one record, every column
// ---------------------------------------------------------------------------

describe('auditLine — records that are not records', () => {
  // Answers rather than refuses, and the asymmetry against the kind
  // above is deliberate: a malformed kind repeats on every line,
  // where a malformed record costs one item in a batch.
  it('answers null for anything that is not an object', () => {
    const notRecords: readonly unknown[] = [null, undefined, [], 'x', 5, true];

    expect(notRecords.map((record) => auditLine(READINGS, record)))
      .toEqual(notRecords.map(() => null));
  });

  it('refuses an unusable kind before it looks at the record', () => {
    expect(refusalOf(() => auditLine(kindWith({ id: 'BAD' }), {})))
      .toBe('audit-log: unusable log kind id "BAD"');
  });
});

describe('auditLine — every column, in the order the kind declares', () => {
  // The shape the file format rests on. Missing values are explicit
  // nulls rather than absent keys, and the keys come back in the
  // kind's order — a line with the right values in the wrong order
  // is a file whose columns cannot be cut.
  it('writes every column, absent ones as null, in kind order', () => {
    const line = auditLine(READINGS, {});

    expect(line).toEqual({
      ts: null,
      run: null,
      station: null,
      sample_count: null,
      outcome: null,
    });
    expect(Object.keys(line ?? {})).toEqual([...READINGS.fields]);
  });

  it('writes the columns of whichever kind it was given', () => {
    expect(KINDS.map((kind) => Object.keys(auditLine(kind, {}) ?? {})))
      .toEqual(KINDS.map((kind) => [...kind.fields]));
  });

  // Unknown keys are dropped, which is what stops an untrusted body
  // reaching an artifact nobody sanitizes. A caller adds a column by
  // declaring it on the kind.
  it('drops every key the kind does not declare', () => {
    const line = auditLine(READINGS, {
      station: 'alpha',
      unregistered_key: 'should not appear',
    });

    expect(Object.keys(line ?? {})).toEqual([...READINGS.fields]);
    expect(JSON.stringify(line)).not.toContain('should not appear');
  });

  it('coerces a numeric column as a number and the rest as text', () => {
    const line = auditLine(READINGS, {
      station: 'alpha',
      sample_count: '12',
      outcome: 12,
    });

    expect(line?.station).toBe('alpha');
    expect(line?.sample_count).toBe(12);
    expect(line?.outcome).toBe('12');
  });

  it('coerces every column as text for a kind declaring no numbers', () => {
    const line = auditLine(REQUESTS, { target: 'alpha', run: 7 });

    expect(line?.run).toBe('7');
    expect(line?.target).toBe('alpha');
  });
});

describe('auditLine — the record and the defaults', () => {
  it('fills a column the record lacks from the defaults', () => {
    const line = auditLine(
      READINGS,
      { station: 'alpha' },
      { run: 'run-1', station: 'never used' },
    );

    expect(line?.run).toBe('run-1');
    expect(line?.station).toBe('alpha');
  });

  // Presence decides, not truthiness. A record that explicitly
  // carries nothing for a column keeps the nothing rather than
  // inheriting the shared value — the difference between "this run
  // measured none" and "nobody asked".
  it('keeps an explicitly absent value rather than inheriting one', () => {
    const line = auditLine(
      READINGS,
      { station: null, sample_count: null },
      { station: 'shared', sample_count: 99 },
    );

    expect(line?.station).toBeNull();
    expect(line?.sample_count).toBeNull();
  });

  it('ignores a default for a column the kind does not declare', () => {
    const line = auditLine(READINGS, {}, { nothing_here: 'ignored' });

    expect(Object.keys(line ?? {})).toEqual([...READINGS.fields]);
  });
});

// ---------------------------------------------------------------------------
// auditLogPath: the two arguments this port takes
// ---------------------------------------------------------------------------

describe('auditLogPath — a site or a directory it cannot use', () => {
  it('refuses a site that could not be part of a filename', () => {
    const refused: readonly (readonly [unknown, string])[] = [
      ['', '""'],
      ['Site-A', '"Site-A"'],
      ['-site', '"-site"'],
      ['site a', '"site a"'],
      [null, 'null'],
    ];

    expect(refused.map(([site]) => refusalOf(
      () => auditLogPath(READINGS, unchecked(site), MOMENT, LOG_DIR),
    ))).toEqual(refused.map(
      ([, shown]) => `audit-log: unusable site slug ${shown}`,
    ));
  });

  // The directory is configuration here rather than a constant, so
  // every way a configuration value could reach outside the tree the
  // operator chose is refused — and all of them by one shape rather
  // than by a rule each.
  it('refuses a directory that could reach outside the chosen tree', () => {
    const refused: readonly (readonly [unknown, string])[] = [
      ['', '""'],
      ['/logs', '"/logs"'],
      ['logs/', '"logs/"'],
      ['../logs', '"../logs"'],
      ['logs/../etc', '"logs/../etc"'],
      ['logs//nested', '"logs//nested"'],
      ['Logs', '"Logs"'],
      [null, 'null'],
    ];

    expect(refused.map(([dir]) => refusalOf(
      () => auditLogPath(READINGS, SITE, MOMENT, unchecked(dir)),
    ))).toEqual(refused.map(
      ([, shown]) => `audit-log: unusable log directory ${shown}`,
    ));
  });

  it('refuses an unusable kind and an unusable moment as well', () => {
    expect(refusalOf(
      () => auditLogPath(kindWith({ id: '' }), SITE, MOMENT, LOG_DIR),
    )).toBe('audit-log: unusable log kind id ""');
    expect(refusalOf(
      () => auditLogPath(READINGS, SITE, 'not a date', LOG_DIR),
    )).toBe('audit-log: "not a date" is not a timestamp');
  });
});

describe('auditLogPath — where a run\'s file goes', () => {
  it('names the directory, the kind, the moment and the site', () => {
    expect(auditLogPath(READINGS, SITE, MOMENT, LOG_DIR))
      .toBe(`${LOG_DIR}/readings-${MOMENT_STAMP}-${SITE}.jsonl`);
  });

  it('accepts a nested directory of the same bounded segments', () => {
    expect(auditLogPath(READINGS, SITE, MOMENT, 'files/logs'))
      .toBe(`files/logs/readings-${MOMENT_STAMP}-${SITE}.jsonl`);
  });

  // Three parts in the order that makes a listing useful: the kind
  // groups, the stamp sorts inside the group, and the site keeps two
  // deployments sharing a mount from colliding.
  it('groups by kind, sorts by moment and separates by site', () => {
    const paths = KINDS.map((kind) => auditLogPath(kind, SITE, MOMENT, LOG_DIR));
    const later = auditLogPath(READINGS, SITE, MOMENT.getTime() + 1, LOG_DIR);
    const elsewhere = auditLogPath(READINGS, 'site-b', MOMENT, LOG_DIR);

    expect(new Set(paths).size).toBe(KINDS.length);
    expect([auditLogPath(READINGS, SITE, MOMENT, LOG_DIR), later].sort())
      .toEqual([auditLogPath(READINGS, SITE, MOMENT, LOG_DIR), later]);
    expect(elsewhere).not.toBe(auditLogPath(READINGS, SITE, MOMENT, LOG_DIR));
  });
});

// ---------------------------------------------------------------------------
// buildAuditFile: no records, no file
// ---------------------------------------------------------------------------

describe('buildAuditFile — nothing to write', () => {
  it('answers null for no records at all', () => {
    const nothing: readonly unknown[] = [[], null, undefined, 'x', {}];

    expect(nothing.map(
      (records) => buildAuditFile(READINGS, SITE, records, { dir: LOG_DIR }),
    )).toEqual(nothing.map(() => null));
  });

  it('answers null when every record was one it could not use', () => {
    expect(buildAuditFile(READINGS, SITE, [null, 'x', 5], { dir: LOG_DIR }))
      .toBeNull();
  });

  // The one ordering worth knowing: the no-file rule is decided
  // BEFORE the path is built, so an unusable site costs nothing when
  // there was nothing to write and refuses the moment there is.
  it('answers null for an unusable site until there is a record', () => {
    expect(buildAuditFile(READINGS, 'BAD', [], { dir: LOG_DIR })).toBeNull();
    expect(refusalOf(
      () => buildAuditFile(READINGS, 'BAD', [{ station: 'alpha' }], {
        dir: LOG_DIR,
      }),
    )).toBe('audit-log: unusable site slug "BAD"');
  });
});

describe('buildAuditFile — one run, one file', () => {
  it('writes one line per usable record, newline-terminated', () => {
    const file = buildAuditFile(
      READINGS,
      SITE,
      [{ station: 'alpha' }, 'skipped', { station: 'bravo' }],
      { dir: LOG_DIR, now: MOMENT },
    );

    expect(file?.count).toBe(2);
    expect(file?.content.endsWith('\n')).toBe(true);
    expect(file?.content.split('\n').filter((line) => line !== '').length)
      .toBe(2);
    expect(file?.path).toBe(`${LOG_DIR}/readings-${MOMENT_STAMP}-${SITE}.jsonl`);
  });

  // The reason one moment fills two roles. A file whose name and
  // whose contents disagreed about when it was written would be
  // unreadable in exactly the situation it exists for.
  it('stamps the filename and the lines from the one moment', () => {
    const file = buildAuditFile(READINGS, SITE, [{ station: 'alpha' }], {
      dir: LOG_DIR,
      now: MOMENT,
    });
    const line: unknown = JSON.parse(file?.content.trim() ?? 'null');

    expect(file?.path).toContain(MOMENT_STAMP);
    expect(line).toMatchObject({ [AUDIT_STAMP_FIELD]: MOMENT_ISO });
  });

  it('lets a caller name the stamp column itself', () => {
    const file = buildAuditFile(READINGS, SITE, [{ station: 'alpha' }], {
      dir: LOG_DIR,
      now: MOMENT,
      defaults: { [AUDIT_STAMP_FIELD]: 'supplied' },
    });
    const line: unknown = JSON.parse(file?.content.trim() ?? 'null');

    expect(line).toMatchObject({ [AUDIT_STAMP_FIELD]: 'supplied' });
    expect(file?.path).toContain(MOMENT_STAMP);
  });

  it('shares the defaults across every line and lets a record win', () => {
    const file = buildAuditFile(
      READINGS,
      SITE,
      [{ station: 'alpha' }, { station: 'bravo', run: 'own' }],
      { dir: LOG_DIR, now: MOMENT, defaults: { run: 'shared' } },
    );
    const runs = (file?.content ?? '')
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => (JSON.parse(line) as Record<string, unknown>).run);

    expect(runs).toEqual(['shared', 'own']);
  });

  it('stamps from the present moment when a caller names none', () => {
    const before = Date.now();
    const file = buildAuditFile(READINGS, SITE, [{ station: 'alpha' }], {
      dir: LOG_DIR,
    });
    const line = JSON.parse(file?.content.trim() ?? 'null') as
      Record<string, unknown>;
    const written = Date.parse(String(line[AUDIT_STAMP_FIELD]));

    expect(Number.isNaN(written)).toBe(false);
    expect(written).toBeGreaterThanOrEqual(before);
    expect(written).toBeLessThanOrEqual(Date.now());
  });
});

// ---------------------------------------------------------------------------
// auditItems: what a write node is handed
// ---------------------------------------------------------------------------

describe('auditItems — files that came back empty', () => {
  // Skipped rather than refused. Every such value is one this
  // library itself answered null for, so a caller collecting several
  // builds hands the collection straight over without filtering it.
  it('answers no items for anything with nothing to write', () => {
    const nothing = [
      auditItems(null),
      auditItems(undefined),
      auditItems([]),
      auditItems([null, undefined]),
      auditItems({ path: '', content: '', count: 0 }),
    ];

    expect(nothing).toEqual([[], [], [], [], []]);
  });
});

describe('auditItems — files with something in them', () => {
  /** One real file, built the way a caller would build it. */
  function oneFile(): NonNullable<ReturnType<typeof buildAuditFile>> {
    const file = buildAuditFile(READINGS, SITE, [{ station: 'alpha' }], {
      dir: LOG_DIR,
      now: MOMENT,
    });

    if (file === null) {
      throw new Error('the fixture build answered nothing to write');
    }

    return file;
  }

  it('carries the path and the line count where a node can read them', () => {
    const file = oneFile();
    const [item] = auditItems(file);

    expect(item?.json).toEqual({ path: file.path, lines: file.count });
  });

  // The half a node cannot check for itself: what it writes has to
  // be the content this library assembled, byte for byte, after an
  // encode and a decode.
  it('carries the content through the encoding unchanged', () => {
    const file = oneFile();
    const [item] = auditItems(file);
    const decoded = Buffer
      .from(item?.binary.data.data ?? '', 'base64')
      .toString('utf8');

    expect(decoded).toBe(file.content);
  });

  it('names the payload and the file the way a write node expects', () => {
    const file = oneFile();
    const [item] = auditItems(file);

    expect(item?.binary.data.mimeType).toBe('application/x-ndjson');
    expect(item?.binary.data.fileName)
      .toBe(`readings-${MOMENT_STAMP}-${SITE}.jsonl`);
    expect(file.path.endsWith(item?.binary.data.fileName ?? '')).toBe(true);
  });

  it('answers one item per file in a list, skipping the empty ones', () => {
    const file = oneFile();
    const items = auditItems([file, null, file, undefined]);

    expect(items.map((item) => item.json.path)).toEqual([file.path, file.path]);
  });
});
