/**
 * Kernel parity for `src/lib/audit-log.ts`: the stamp, both
 * coercions and the line assembly, driven against their originals
 * over one set of inputs and diffed by path.
 *
 * KERNEL rather than full, and the boundary is the port's own
 * divergence rather than a choice about coverage. The kind roster
 * and the output directory are arguments here and constants in the
 * original, so there is no input that could drive both sides of the
 * path builder, the file builder or the item collector — a call that
 * named a directory would have nothing to name it to on one side.
 * Those three are characterized in `tests/lib/audit-log.test.ts`
 * instead, and this file covers everything the parameterization did
 * not touch.
 *
 * ## The roster is read out of the original, never written down
 *
 * {@link auditLine} is inside the leg despite taking a kind
 * DESCRIPTOR where the original takes a kind NAME, and the way that
 * is made honest is the interesting half of this file. The
 * descriptor is not authored here: every field of it is read off the
 * original at run time. The kind names come from the constant it
 * exports, the column list for each comes from the same constant,
 * and which of those columns are numbers is DERIVED by driving the
 * original — feeding a value that a text coercion and a number
 * coercion answer differently, and reading which columns came back
 * as numbers.
 *
 * Two things follow, and both are the point. The port is driven over
 * the original's own roster rather than over one this file invented,
 * which is the only way a line-assembly comparison means anything.
 * And no column name, kind name or subject matter from the original
 * reaches a tracked file — the descriptor exists for the length of a
 * case and is built out of values nobody here typed.
 *
 * The derivation needs its own guard, because a probe that failed to
 * discriminate would classify every column as text and the
 * comparison would still pass. So a case asserts that the roster it
 * derived holds numeric columns AND text ones, that every kind
 * declares at least one column, and that the port's own boundary
 * check accepts every descriptor built this way. A derivation that
 * had gone blind fails there rather than passing quietly downstream.
 *
 * ## A throw is an answer
 *
 * Every comparison runs both sides through {@link outcomeOf}, which
 * turns either ending into a value. Three of the four entry points
 * here refuse for at least one input in the corpus — a moment that
 * is not one, a value whose text conversion throws, a value a
 * numeric conversion cannot take — and a run comparing only returned
 * values would pass for a port that threw a different sentence,
 * threw where the original answered, or answered where it threw.
 *
 * That arrangement needs the control that comes with it: two
 * implementations refusing everything agree perfectly. So a case
 * asserts the driven inputs produce BOTH endings, read off the PORT
 * rather than off the original, since the original is the thing
 * under measurement.
 *
 * ## Column order
 *
 * The differ deliberately does not compare object key order, and
 * order is part of what a kind declares here — a line carrying the
 * right values in the wrong places is a file whose columns cannot be
 * cut. So one case compares `Object.keys` from both sides directly,
 * which is the reading the structural diff is documented as leaving
 * to its caller.
 *
 * ## Where the origin is loaded
 *
 * Inside cases, always. The gate binds a `describe` and nothing
 * above one, so module scope runs on a skipped run too: the PORT's
 * own functions are safe to call up there, and are, but a load would
 * throw on every run that armed nothing — including in CI, where
 * this file is meant to skip.
 */
import type { AuditKind } from '../../src/lib/audit-log.js';

import { expect, it } from 'vitest';

import {
  AUDIT_FIELD_CHARS,
  assertAuditKind,
  auditLine,
  auditNumber,
  auditStamp,
  auditText,
} from '../../src/lib/audit-log.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import {
  ADVERSARIAL_VALUES,
  DELIMITED_RECORD_FIXTURES,
  INVISIBLE_TEXT_FIXTURE,
  MARKUP_FIXTURES,
  MULTIPART_MESSAGE_FIXTURES,
  STRUCTURED_TEXT_FIXTURES,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/audit-log.js';

/** The four functions this file drives, in sorted order. */
const FUNCTION_ENTRY_POINTS: readonly string[] = [
  'auditLine',
  'auditNumber',
  'auditStamp',
  'auditText',
];

/** What the origin module has to be for this file to drive it. */
interface AuditLogOrigin {
  /** Assembles one line for a named kind. */
  readonly auditLine: (
    kind: unknown,
    record: unknown,
    defaults?: unknown,
  ) => unknown;

  /** Coerces a value to a finite number or nothing. */
  readonly auditNumber: (value: unknown) => unknown;

  /** Turns a moment into a filename part. */
  readonly auditStamp: (when: unknown) => unknown;

  /** Coerces a value to bounded single-line text or nothing. */
  readonly auditText: (value: unknown, limit?: unknown) => unknown;

  /** Its kind roster: names to column lists. */
  readonly AUDIT_KINDS: Record<string, unknown>;

  /** The default text cap. */
  readonly AUDIT_FIELD_CHARS: number;
}

/** Whether every entry point is there and is what it claims. */
function isAuditLogOrigin(value: unknown): value is AuditLogOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exported = value as Record<string, unknown>;
  const callable = FUNCTION_ENTRY_POINTS
    .every((name) => typeof exported[name] === 'function');
  const roster = exported.AUDIT_KINDS;

  return callable
    && typeof exported.AUDIT_FIELD_CHARS === 'number'
    && typeof roster === 'object'
    && roster !== null
    && !Array.isArray(roster);
}

/**
 * The origin library, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a
 * module missing an export would otherwise be called as `undefined`
 * and every comparison below would diff one thrown TypeError against
 * another, which is agreement nobody established.
 *
 * @returns The origin module, with all six entry points usable.
 */
function originAuditLog(): AuditLogOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isAuditLogOrigin(loaded)) {
    throw new TypeError(
      'the origin module does not export '
      + `${FUNCTION_ENTRY_POINTS.join(', ')} as functions beside a `
      + 'kind roster and a numeric field cap.',
    );
  }

  return loaded;
}

// ---------------------------------------------------------------------------
// Either ending, as a value
// ---------------------------------------------------------------------------

/** What a call did: answered, or refused with a sentence. */
type Outcome =
  | { readonly refused: false; readonly value: unknown }
  | { readonly refused: true; readonly message: string };

/**
 * One call's ending, whichever it was.
 *
 * A throw that is not an `Error` is reported as its own shape rather
 * than coerced into a message, so a port raising a string where the
 * original raised an `Error` diverges instead of agreeing.
 *
 * @param run - The call under test.
 * @returns What it did.
 */
function outcomeOf(run: () => unknown): Outcome {
  try {
    return { refused: false, value: run() };
  } catch (error) {
    return error instanceof Error
      ? { refused: true, message: error.message }
      : { refused: true, message: `non-Error: ${String(error)}` };
  }
}

/** One comparison that parted, labelled by the input that produced it. */
interface LabelledDivergence {
  /** Which input the two sides parted over. */
  readonly over: string;

  /** Where they parted, as the differ reports it. */
  readonly at: string;

  /** What kind of difference it was. */
  readonly reason: string;

  /** The origin side, rendered. */
  readonly origin: string;

  /** The port side, rendered the same way. */
  readonly port: string;
}

/**
 * Compare one input's two endings, labelling any difference.
 *
 * @param over - What the two sides were driven over.
 * @param origin - The origin's ending.
 * @param port - The port's ending.
 * @returns One entry when they parted, none when they agreed.
 */
function compare(
  over: string,
  origin: Outcome,
  port: Outcome,
): LabelledDivergence[] {
  const found = firstDivergence(origin, port);

  if (found === null) {
    return [];
  }

  return [{
    over,
    at: found.path,
    reason: found.reason,
    origin: found.origin,
    port: found.port,
  }];
}

// ---------------------------------------------------------------------------
// The roster, derived from the original at run time
// ---------------------------------------------------------------------------

/**
 * The value that tells a numeric column from a text one.
 *
 * A text coercion answers it back as itself and a numeric coercion
 * answers the number, so one line assembled over a record filled
 * with this classifies every column the original declares — without
 * this file knowing what any of them are called.
 */
const NUMERIC_PROBE = '12';

/** One kind, as each implementation needs it named. */
interface DerivedKind {
  /** What the original is driven with. */
  readonly id: string;

  /** What the port is driven with, built entirely from the above. */
  readonly kind: AuditKind;
}

/**
 * The columns the original declares for one kind.
 *
 * Refuses rather than answering an empty list: a kind whose columns
 * could not be read would drive both sides over nothing and agree.
 *
 * @param origin - The origin module.
 * @param id - The kind name, as the original spells it.
 * @returns Its columns, in the order it declares them.
 */
function originColumns(origin: AuditLogOrigin, id: string): string[] {
  const declared: unknown = origin.AUDIT_KINDS[id];

  if (!Array.isArray(declared)) {
    throw new TypeError(`the origin kind "${id}" declares no column list.`);
  }

  const columns = declared.filter(
    (column): column is string => typeof column === 'string',
  );

  if (columns.length === 0 || columns.length !== declared.length) {
    throw new TypeError(`the origin kind "${id}" declares no usable columns.`);
  }

  return columns;
}

/**
 * Which of one kind's columns the original treats as numbers.
 *
 * Derived by driving the original rather than read from it: the
 * classification is not exported, and a list written here would be
 * this file's claim about the original instead of the original's own
 * answer — as well as putting its column names in a tracked file.
 *
 * @param origin - The origin module.
 * @param id - The kind name.
 * @param columns - Its columns, from {@link originColumns}.
 * @returns The subset the original answers as numbers.
 */
function numericColumns(
  origin: AuditLogOrigin,
  id: string,
  columns: readonly string[],
): string[] {
  const probe: Record<string, unknown> = {};

  for (const column of columns) {
    probe[column] = NUMERIC_PROBE;
  }

  const line: unknown = origin.auditLine(id, probe, {});

  if (typeof line !== 'object' || line === null) {
    throw new TypeError(`the origin kind "${id}" assembled no line.`);
  }

  const answered = line as Record<string, unknown>;

  return columns.filter((column) => typeof answered[column] === 'number');
}

/**
 * Every kind the original declares, in the two shapes the two
 * implementations take.
 *
 * @param origin - The origin module.
 * @returns One entry per kind.
 */
function derivedKinds(origin: AuditLogOrigin): DerivedKind[] {
  return Object.keys(origin.AUDIT_KINDS).map((id) => {
    const fields = originColumns(origin, id);

    return {
      id,
      kind: { id, fields, numericFields: numericColumns(origin, id, fields) },
    };
  });
}

// ---------------------------------------------------------------------------
// The inputs both sides are driven over
// ---------------------------------------------------------------------------

/** One labelled input, printed by id when a comparison parts. */
interface LabelledValue {
  /** Stable label a failure prints in place of the value. */
  readonly id: string;

  /**
   * A value nothing else holds a reference to.
   *
   * Built per call rather than shared, so the two sides never see
   * one mutable object between them.
   */
  readonly build: () => unknown;
}

/** The adversarial roster, in the shape the tables below use. */
const ADVERSARIAL_INPUTS: readonly LabelledValue[] = ADVERSARIAL_VALUES.map(
  (entry) => ({ id: entry.id, build: entry.build }),
);

/** A character from its code point, so this source stays plain. */
function codePoint(value: number): string {
  return String.fromCodePoint(value);
}

/** Moments, and every shape of value that is not one. */
const MOMENT_INPUTS: readonly LabelledValue[] = [
  { id: 'epoch', build: () => 0 },
  { id: 'milliseconds', build: () => 1755250862317 },
  { id: 'date', build: () => new Date(1755250862317) },
  { id: 'invalid-date', build: () => new Date(Number.NaN) },
  { id: 'iso-text', build: () => '2026-08-15T09:41:02.317Z' },
  { id: 'date-only-text', build: () => '2026-08-15' },
  { id: 'unparseable-text', build: () => 'not a moment' },
  { id: 'boolean', build: () => true },
  { id: 'negative', build: () => -1 },
  { id: 'past-the-range', build: () => 8.64e15 + 1 },
  { id: 'plain-object', build: () => ({}) },
  { id: 'list', build: () => [] },
  { id: 'one-element-list', build: () => [0] },
  ...ADVERSARIAL_INPUTS,
];

/**
 * Every cap value the text coercion is driven at.
 *
 * The three that matter are in here rather than commented on: a cap
 * that is not a number falls back, a cap that is `NaN` is a number
 * and caps nothing, and a negative cap cuts from the end.
 */
const CAP_INPUTS: readonly LabelledValue[] = [
  { id: 'absent', build: () => undefined },
  { id: 'null', build: () => null },
  { id: 'zero', build: () => 0 },
  { id: 'three', build: () => 3 },
  { id: 'default', build: () => AUDIT_FIELD_CHARS },
  { id: 'past-the-text', build: () => 100000 },
  { id: 'negative-one', build: () => -1 },
  { id: 'far-negative', build: () => -1000 },
  { id: 'fractional', build: () => 2.5 },
  { id: 'not-a-number', build: () => Number.NaN },
  { id: 'infinite', build: () => Number.POSITIVE_INFINITY },
  { id: 'numeric-text', build: () => '9' },
  { id: 'empty-text', build: () => '' },
  { id: 'boolean', build: () => true },
  { id: 'object', build: () => ({}) },
];

/** Every corpus document, as one flat list of labelled texts. */
const CORPUS_INPUTS: readonly LabelledValue[] = [
  ...STRUCTURED_TEXT_FIXTURES,
  ...DELIMITED_RECORD_FIXTURES,
  ...MULTIPART_MESSAGE_FIXTURES,
  ...MARKUP_FIXTURES,
].map((fixture) => ({ id: fixture.id, build: () => fixture.text }));

/**
 * Texts built to reach the passes the corpus does not: the control
 * range, the two separators serialization emits literally, a
 * space-like character, and a body past the default cap.
 */
const CRAFTED_TEXT_INPUTS: readonly LabelledValue[] = [
  { id: 'control-run', build: () => `a${codePoint(0)}${codePoint(31)}b` },
  { id: 'delete-character', build: () => `a${codePoint(0x7f)}b` },
  { id: 'line-separator', build: () => `a${codePoint(0x2028)}b` },
  { id: 'paragraph-separator', build: () => `a${codePoint(0x2029)}b` },
  { id: 'no-break-space', build: () => `a${codePoint(0xa0)}b` },
  { id: 'zero-width-space', build: () => `a${codePoint(0x200b)}b` },
  { id: 'only-whitespace', build: () => `${codePoint(9)}  ${codePoint(10)}` },
  { id: 'past-the-cap', build: () => 'x'.repeat(AUDIT_FIELD_CHARS + 200) },
  { id: 'invisible-padded', build: () => INVISIBLE_TEXT_FIXTURE.text },
  { id: 'invisible-plain', build: () => INVISIBLE_TEXT_FIXTURE.visible },
];

/** Everything the text coercion is driven over. */
const TEXT_INPUTS: readonly LabelledValue[] = [
  ...ADVERSARIAL_INPUTS,
  ...CORPUS_INPUTS,
  ...CRAFTED_TEXT_INPUTS,
];

/** Everything the number coercion is driven over. */
const NUMBER_INPUTS: readonly LabelledValue[] = [
  ...ADVERSARIAL_INPUTS,
  ...CRAFTED_TEXT_INPUTS,
  { id: 'zero', build: () => 0 },
  { id: 'boolean', build: () => true },
  { id: 'hexadecimal-text', build: () => '0x10' },
  { id: 'padded-text', build: () => '  42  ' },
  { id: 'one-element-list', build: () => [7] },
];

/**
 * Records built over one kind's own columns.
 *
 * Every entry is derived from the column list rather than written
 * out, so the table works for whatever roster the original turns out
 * to declare — and so no column name appears here.
 *
 * @param columns - One kind's columns.
 * @returns The records both sides are driven over.
 */
function recordInputs(columns: readonly string[]): LabelledValue[] {
  const filled = (make: (column: string) => unknown) => () => {
    const record: Record<string, unknown> = {};

    for (const column of columns) {
      record[column] = make(column);
    }

    return record;
  };

  return [
    { id: 'not-a-record/null', build: () => null },
    { id: 'not-a-record/absent', build: () => undefined },
    { id: 'not-a-record/list', build: () => [] },
    { id: 'not-a-record/text', build: () => 'a record' },
    { id: 'not-a-record/number', build: () => 5 },
    { id: 'not-a-record/boolean', build: () => true },
    { id: 'empty', build: () => ({}) },
    { id: 'every-column-text', build: filled((column) => `value ${column}`) },
    { id: 'every-column-numeric', build: filled(() => NUMERIC_PROBE) },
    { id: 'every-column-null', build: filled(() => null) },
    { id: 'every-column-absent', build: filled(() => undefined) },
    { id: 'every-column-zero', build: filled(() => 0) },
    { id: 'every-column-hostile', build: filled(() => hostileValue()) },
    { id: 'every-column-unreadable', build: filled(() => Number.NaN) },
    { id: 'one-column', build: () => ({ [firstOf(columns)]: 'only this' }) },
    {
      id: 'unregistered-key',
      build: () => ({ [firstOf(columns)]: 'kept', xx_dropped_xx: 'gone' }),
    },
  ];
}

/**
 * Default sets built over one kind's own columns, by the same rule.
 *
 * @param columns - One kind's columns.
 * @returns The default sets both sides are driven over.
 */
function defaultInputs(columns: readonly string[]): LabelledValue[] {
  return [
    { id: 'absent', build: () => undefined },
    { id: 'empty', build: () => ({}) },
    { id: 'not-a-record', build: () => 0 },
    {
      id: 'every-column',
      build: () => Object.fromEntries(
        columns.map((column) => [column, `shared ${column}`]),
      ),
    },
    { id: 'one-column', build: () => ({ [firstOf(columns)]: 'shared' }) },
    { id: 'unregistered-key', build: () => ({ xx_unrelated_xx: 1 }) },
  ];
}

/**
 * The first column, refusing an empty list rather than answering
 * `undefined` — which would build a record keyed on the word.
 *
 * @param columns - One kind's columns.
 * @returns Its first column.
 */
function firstOf(columns: readonly string[]): string {
  const [first] = columns;

  if (first === undefined) {
    throw new TypeError('the derived kind declares no columns at all.');
  }

  return first;
}

/**
 * An object whose text conversion throws, built here rather than
 * taken from the roster so a record can hold one per column.
 *
 * The override goes on through a property definition rather than in
 * the literal, for the reason the shared roster gives: a method
 * written in the literal is an own enumerable key, and both sides
 * would part at that key before any comparison reached the data.
 *
 * @returns A fresh instance, referenced by nothing else.
 */
function hostileValue(): Record<string, unknown> {
  const value: Record<string, unknown> = { station: 'bravo' };

  Object.defineProperty(value, 'toString', {
    configurable: true,
    enumerable: false,
    value: () => {
      throw new TypeError('this column refuses text conversion');
    },
    writable: true,
  });

  return value;
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('audit-log — the origin the comparisons read', () => {
  it('exports the four entry points and the roster this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isAuditLogOrigin(loaded)).toBe(true);
  });

  // The guard the whole line comparison rests on. The numeric
  // classification is DERIVED by driving the original, and a probe
  // that had stopped discriminating would call every column text —
  // after which both sides would agree over a coercion neither ever
  // performed. So the derived roster is asserted to hold columns of
  // both kinds, read off the derivation itself rather than off any
  // count written here.
  it('derives a roster holding numeric columns and text ones', () => {
    const derived = derivedKinds(originAuditLog());
    const numeric = derived.flatMap((entry) => entry.kind.numericFields);
    const text = derived.flatMap(
      (entry) => entry.kind.fields.filter(
        (column) => !entry.kind.numericFields.includes(column),
      ),
    );

    expect(derived.length).toBeGreaterThan(0);
    expect(derived.map((entry) => entry.kind.fields.length > 0))
      .toEqual(derived.map(() => true));
    expect(numeric.length).toBeGreaterThan(0);
    expect(text.length).toBeGreaterThan(0);
  });

  // The other half: a descriptor built this way has to be one the
  // port will actually take. The port bounds a kind at its boundary
  // — an id that could not be part of a filename, a column name a
  // plain object could not hold — and a roster the original declares
  // that the port refuses would be a divergence about the
  // parameterization rather than about any function below.
  it('derives descriptors the port accepts as kinds', () => {
    const derived = derivedKinds(originAuditLog());
    const refused = derived
      .map((entry) => ({
        id: entry.id,
        ending: outcomeOf(() => {
          assertAuditKind(entry.kind);

          return null;
        }),
      }))
      .filter((entry) => entry.ending.refused);

    expect(refused).toEqual([]);
  });

  // Two implementations that refuse everything agree perfectly, and
  // two that answer everything leave every refusal path unmeasured.
  // So the driven inputs have to produce both endings — read off the
  // PORT, since the original is the thing under measurement.
  it('is driven over inputs producing both endings, on all three', () => {
    const endings = [
      TEXT_INPUTS.map((input) => outcomeOf(() => auditText(input.build()))),
      NUMBER_INPUTS.map((input) => outcomeOf(() => auditNumber(input.build()))),
      MOMENT_INPUTS.map((input) => outcomeOf(() => auditStamp(input.build()))),
    ].map((run) => run.map((ending) => ending.refused));

    expect(endings.map((run) => run.includes(true))).toEqual([true, true, true]);
    expect(endings.map((run) => run.includes(false)))
      .toEqual([true, true, true]);
  });

  // And the answers themselves have to carry more than one shape. A
  // corpus that had drifted into values every coercion reads as
  // absent would agree over every comparison having measured
  // nothing.
  it('is driven over inputs producing absence and values alike', () => {
    const text = TEXT_INPUTS
      .map((input) => outcomeOf(() => auditText(input.build())))
      .filter((ending) => !ending.refused)
      .map((ending) => ending.value === null);
    const numbers = NUMBER_INPUTS
      .map((input) => outcomeOf(() => auditNumber(input.build())))
      .filter((ending) => !ending.refused)
      .map((ending) => ending.value === null);

    expect(text).toContain(true);
    expect(text).toContain(false);
    expect(numbers).toContain(true);
    expect(numbers).toContain(false);
  });
});

describePortParity('the default text cap', () => {
  // An export like any other, and the one whose drift would be
  // invisible: a port shipping a different default would agree on
  // every explicit-cap comparison below and quietly cut every line
  // written without one at a different length.
  it('agrees with the original', () => {
    const origin = originAuditLog();

    expect(firstDivergence(origin.AUDIT_FIELD_CHARS, AUDIT_FIELD_CHARS))
      .toBeNull();
  });
});

describePortParity('auditStamp — moments and things that are not one', () => {
  it('agrees over every moment and non-moment', () => {
    const origin = originAuditLog();
    const apart = MOMENT_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.auditStamp(input.build())),
      outcomeOf(() => auditStamp(input.build())),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('auditText — every value, at every cap', () => {
  it('agrees over every value with no cap named', () => {
    const origin = originAuditLog();
    const apart = TEXT_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.auditText(input.build())),
      outcomeOf(() => auditText(input.build())),
    ));

    expect(apart).toEqual([]);
  });

  // The cap sweep is where the three preserved boundaries live: a
  // cap that is not a number, a cap that is `NaN` and therefore is
  // one, and a negative cap that cuts from the end. None of them is
  // named here — the tables carry them, and a port that had
  // modernized any of the three parts on its own row.
  it('agrees over every value at every cap', () => {
    const origin = originAuditLog();
    const apart = TEXT_INPUTS.flatMap(
      (input) => CAP_INPUTS.flatMap((cap) => compare(
        `${input.id} at ${cap.id}`,
        outcomeOf(() => origin.auditText(input.build(), cap.build())),
        outcomeOf(() => auditText(input.build(), cap.build())),
      )),
    );

    expect(apart).toEqual([]);
  });
});

describePortParity('auditNumber — the null-vs-zero rule', () => {
  it('agrees over every value', () => {
    const origin = originAuditLog();
    const apart = NUMBER_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.auditNumber(input.build())),
      outcomeOf(() => auditNumber(input.build())),
    ));

    expect(apart).toEqual([]);
  });

  // The differ compares primitives by identity, so the signed zero
  // is already covered by the sweep above. Asserted again on its own
  // because it is the one value a JSON round trip would lose, which
  // makes a regression in it invisible to every other reading.
  it('agrees about a signed zero, which serialization would lose', () => {
    const origin = originAuditLog();

    expect(firstDivergence(origin.auditNumber(-0), auditNumber(-0))).toBeNull();
    expect(Object.is(auditNumber(-0), -0)).toBe(true);
  });
});

describePortParity('auditLine — every record, over the original roster', () => {
  it('agrees over every record and every default set', () => {
    const origin = originAuditLog();
    const apart = derivedKinds(origin).flatMap((entry) => {
      const records = recordInputs(entry.kind.fields);
      const defaults = defaultInputs(entry.kind.fields);

      return records.flatMap(
        (record) => defaults.flatMap((fallback) => compare(
          `${entry.id}/${record.id}/defaults=${fallback.id}`,
          outcomeOf(
            () => origin.auditLine(entry.id, record.build(), fallback.build()),
          ),
          outcomeOf(
            () => auditLine(
              entry.kind,
              record.build(),
              fallback.build() as Record<string, unknown> | undefined,
            ),
          ),
        )),
      );
    });

    expect(apart).toEqual([]);
  });

  // The differ documents object key ORDER as something it does not
  // compare, and order is part of what a kind declares here: a line
  // holding the right values in the wrong places is a file whose
  // columns cannot be cut. So this reads the keys off both sides
  // directly, which is the reading the differ leaves to its caller.
  it('agrees about column order, which the differ leaves out', () => {
    const origin = originAuditLog();
    const apart = derivedKinds(origin).flatMap((entry) => {
      const record = recordInputs(entry.kind.fields).find(
        (input) => input.id === 'every-column-text',
      );

      if (record === undefined) {
        throw new TypeError('the record table lost its filled entry.');
      }

      return compare(
        `${entry.id}/column order`,
        outcomeOf(
          () => Object.keys(
            origin.auditLine(entry.id, record.build(), {}) as object,
          ),
        ),
        outcomeOf(
          () => Object.keys(auditLine(entry.kind, record.build(), {}) ?? {}),
        ),
      );
    });

    expect(apart).toEqual([]);
  });
});
