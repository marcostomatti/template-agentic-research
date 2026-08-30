/**
 * Cases for `src/lib/parser-config.ts`: every row the engine will
 * not run, then every payload that does not carry what a row
 * expected, and only then a source that works.
 *
 * That order is the file's argument rather than its layout. This
 * module is what stands between a `sources` row somebody typed and a
 * `documents` row somebody trusts, and the readings that matter are
 * the ones where it refuses — a pattern with a stray bracket in it,
 * a path spelling `__proto__`, a payload that answered a page where
 * a list belonged. A suite opening with a well-formed config over a
 * well-formed payload would pass over every one of them, because
 * that pair is the input any version of this engine handles.
 *
 * ## Three closed rosters, declared here and never read off the module
 *
 * The config faults, the contract faults and the per-payload
 * warnings are all written out below and held set-equal against what
 * the cases produce, in both directions: a registered sentence
 * nothing reaches fails naming itself, and a sentence no entry
 * registers fails as unregistered. A suite reading them off the
 * module would agree with any edit to them, which is the one thing
 * an operator reading `documents.parse_error` at a glance cannot
 * afford.
 *
 * Each entry declares its SHAPE, because the three families are
 * recognized differently. A whole-config fault is a whole sentence.
 * A per-field or per-member fault is a SUFFIX, because a site is put
 * in front of it. And two are PREFIXES, because a count or a type
 * name is appended.
 *
 * ## The no-echo claim is checked by re-reading the output
 *
 * A validator cannot see its own message template leak a value, so
 * the last section builds a config, a payload and a contract whose
 * every value is a sentinel assembled from fragments, collects every
 * sentence all three entry points return, and reads THOSE for the
 * sentinels. Its control is in the same section: a field name that
 * passes the name class IS quoted, deliberately and by design, and
 * the case asserts that too — without it the sweep would pass for a
 * validator that had stopped naming anything at all.
 *
 * ## The prototype cases are the point of the path walk
 *
 * A stored path is text an operator wrote or a model proposed, and
 * the payload it walks is a stranger's. So the own-key rule is
 * driven from both ends: the four names that resolve to nothing, the
 * `in` control beside them proving those names really are reachable
 * on the object being walked, and the two own members the rule
 * deliberately DOES admit.
 *
 * No word in this file is a term, a field or a source any domain
 * would actually use. The mechanism is here; the vocabulary is rows
 * in a table.
 */
import type {
  FieldRule,
  ParseDeps,
  ParserConfig,
  SourceContract,
} from '../../src/lib/parser-config.js';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CAPTURE_GROUP,
  DEFAULT_FIELD_TYPE,
  FIELD_NAME_PATTERN,
  FIELD_TYPES,
  MAX_FIELDS,
  MAX_FIELD_NAME_LENGTH,
  MAX_PATH_SEGMENTS,
  MAX_PATTERN_LENGTH,
  PATH_SEPARATOR,
  RESERVED_FIELD_NAMES,
  applyFieldMap,
  captureFrom,
  coerceValue,
  compileCapture,
  contractErrors,
  extractRecords,
  parserConfigErrors,
  valueAtPath,
} from '../../src/lib/parser-config.js';

// ---------------------------------------------------------------------------
// The three sentence rosters
// ---------------------------------------------------------------------------

/**
 * How a produced sentence is recognized as one entry.
 *
 * `whole` for a sentence about the whole row, `suffix` for a
 * predicate a site is put in front of, and `prefix` for one that
 * ends in something the engine appends.
 */
type SentenceShape = 'whole' | 'suffix' | 'prefix';

/** One sentence the module can produce. */
interface SentenceEntry {
  /** How a case points at it. */
  readonly id: string;

  /** The invariant part of the sentence. */
  readonly text: string;

  /** How {@link matchesEntry} compares it. */
  readonly shape: SentenceShape;
}

/**
 * Every fault {@link parserConfigErrors} can report.
 *
 * Eighteen, and every one of them reachable — there is no
 * unreachable member here to declare, which the roster guards below
 * assert rather than assume.
 */
const CONFIG_FAULT_ENTRIES: readonly SentenceEntry[] = [
  { id: 'notObject', text: 'the parser config is not an object', shape: 'whole' },
  { id: 'noFields', text: 'the parser config declares no field map', shape: 'whole' },
  { id: 'fieldsNotObject', text: 'the field map is not an object', shape: 'whole' },
  { id: 'noField', text: 'the field map declares no field', shape: 'whole' },
  {
    id: 'tooManyFields',
    text: 'the field map declares more fields than the engine reads',
    shape: 'whole',
  },
  { id: 'recordsPath', text: 'the records path is not a usable path', shape: 'whole' },
  { id: 'fieldName', text: ' is not a name the engine can use', shape: 'suffix' },
  { id: 'reservedName', text: ' is a reserved field name', shape: 'suffix' },
  {
    id: 'ruleNotObject',
    text: ' states a rule that is not an object',
    shape: 'suffix',
  },
  { id: 'noSource', text: ' states neither a path nor a selector', shape: 'suffix' },
  { id: 'path', text: ' states a path the engine cannot walk', shape: 'suffix' },
  {
    id: 'selector',
    text: ' states a selector that is not a non-empty string',
    shape: 'suffix',
  },
  {
    id: 'pattern',
    text: ' states a pattern that is not a non-empty string',
    shape: 'suffix',
  },
  {
    id: 'patternLength',
    text: ' states a pattern longer than the engine compiles',
    shape: 'suffix',
  },
  {
    id: 'patternCompile',
    text: ' states a pattern that does not compile',
    shape: 'suffix',
  },
  {
    id: 'group',
    text: ' states a capture group that is not a non-negative integer',
    shape: 'suffix',
  },
  {
    id: 'groupNoPattern',
    text: ' states a capture group with no pattern',
    shape: 'suffix',
  },
  { id: 'type', text: ' states a type the engine does not coerce to', shape: 'suffix' },
];

/** Every fault {@link contractErrors} can report. */
const CONTRACT_FAULT_ENTRIES: readonly SentenceEntry[] = [
  { id: 'recordNotObject', text: 'the record is not an object', shape: 'whole' },
  { id: 'notObject', text: 'the contract is not an object', shape: 'whole' },
  {
    id: 'fieldsNotObject',
    text: 'the contract field map is not an object',
    shape: 'whole',
  },
  { id: 'memberName', text: ' is not a name the engine can use', shape: 'suffix' },
  {
    id: 'checkNotObject',
    text: ' declares a check that is not an object',
    shape: 'suffix',
  },
  { id: 'required', text: ' is required and no value was read', shape: 'suffix' },
  { id: 'typePrefix', text: ' was not read as the declared type: ', shape: 'prefix' },
  {
    id: 'typeUnknown',
    text: ' declares a type the engine does not coerce to',
    shape: 'suffix',
  },
  { id: 'pattern', text: ' does not match the declared pattern', shape: 'suffix' },
  {
    id: 'patternCompile',
    text: ' declares a pattern that does not compile',
    shape: 'suffix',
  },
];

/** Every per-payload warning the engine can emit. */
const WARNING_ENTRIES: readonly SentenceEntry[] = [
  {
    id: 'noRecords',
    text: 'the payload holds nothing where records should be',
    shape: 'whole',
  },
  {
    id: 'notRecords',
    text: 'the payload holds no record and no list where records should be',
    shape: 'whole',
  },
  {
    id: 'skippedPrefix',
    text: 'entries the payload offered as records are not records: ',
    shape: 'prefix',
  },
  {
    id: 'noMarkupStep',
    text: ' states a selector and no markup step was supplied',
    shape: 'suffix',
  },
  {
    id: 'markupNotText',
    text: ' states a selector over a value that is not text',
    shape: 'suffix',
  },
  {
    id: 'markupRaised',
    text: ' states a selector and the markup step raised',
    shape: 'suffix',
  },
];

/**
 * Whether one sentence is an instance of one entry.
 *
 * @param entry - The registered sentence.
 * @param sentence - What the module produced.
 * @returns Whether the entry accounts for it.
 */
function matchesEntry(entry: SentenceEntry, sentence: string): boolean {
  if (entry.shape === 'whole') {
    return sentence === entry.text;
  }

  return entry.shape === 'prefix'
    ? sentence.includes(entry.text)
    : sentence.endsWith(entry.text);
}

/**
 * Every entry no produced sentence matched, by id.
 *
 * @param entries - The roster to read.
 * @param produced - Every sentence the cases produced.
 * @returns The unreached ids.
 */
function unreachedIds(
  entries: readonly SentenceEntry[],
  produced: readonly string[],
): readonly string[] {
  return entries
    .filter((entry) => !produced.some((sentence) => matchesEntry(entry, sentence)))
    .map((entry) => entry.id);
}

/**
 * Every produced sentence no entry accounts for.
 *
 * @param entries - The roster to read.
 * @param produced - Every sentence the cases produced.
 * @returns The unregistered sentences, verbatim.
 */
function unregistered(
  entries: readonly SentenceEntry[],
  produced: readonly string[],
): readonly string[] {
  return produced.filter(
    (sentence) => !entries.some((entry) => matchesEntry(entry, sentence)),
  );
}

// ---------------------------------------------------------------------------
// The rows the engine will not run
// ---------------------------------------------------------------------------

/** One malformed row, and the single fault it is built to produce. */
interface ConfigCase {
  /** Stable label a failure prints. */
  readonly id: string;

  /** The {@link CONFIG_FAULT_ENTRIES} member it reaches. */
  readonly fault: string;

  /** The whole sentence, site and all. */
  readonly sentence: string;

  /** The row, built fresh so no case shares an object. */
  readonly build: () => unknown;
}

/**
 * A field map of a given size, every entry of it usable.
 *
 * @param count - How many fields to declare.
 * @returns The map.
 */
function manyFields(count: number): Record<string, FieldRule> {
  const fields: Record<string, FieldRule> = {};

  for (let index = 0; index < count; index += 1) {
    fields[`f${String(index)}`] = { path: 'x' };
  }

  return fields;
}

/**
 * A path of a given depth, spelled with the exported separator.
 *
 * Built from the exported ceiling rather than from a number typed
 * here, so raising the ceiling moves both the refusing case and the
 * accepting one with it instead of leaving a pair that passes for
 * the wrong reason.
 *
 * @param depth - How many segments the path should have.
 * @returns The path.
 */
function pathOfDepth(depth: number): string {
  return Array.from({ length: depth }, () => 'a').join(PATH_SEPARATOR);
}

/**
 * One case per fault a row can carry, each carrying the one fault it
 * names and nothing else that could.
 *
 * Every entry produces exactly ONE sentence, which the case below
 * asserts. That is what stops a guard absorbing a neighbour's input:
 * a row built to fail on its pattern and failing on its path as well
 * would still pass a test that only counted.
 */
const CONFIG_CASES: readonly ConfigCase[] = [
  {
    id: 'notObject/null',
    fault: 'notObject',
    sentence: 'the parser config is not an object',
    build: () => null,
  },
  {
    id: 'notObject/list',
    fault: 'notObject',
    sentence: 'the parser config is not an object',
    build: () => [{ fields: { a: { path: 'x' } } }],
  },
  {
    id: 'noFields/absent',
    fault: 'noFields',
    sentence: 'the parser config declares no field map',
    build: () => ({}),
  },
  {
    id: 'fieldsNotObject/list',
    fault: 'fieldsNotObject',
    sentence: 'the field map is not an object',
    build: () => ({ fields: [{ path: 'x' }] }),
  },
  {
    id: 'noField/empty',
    fault: 'noField',
    sentence: 'the field map declares no field',
    build: () => ({ fields: {} }),
  },
  {
    id: 'tooManyFields/over-the-ceiling',
    fault: 'tooManyFields',
    sentence: 'the field map declares more fields than the engine reads',
    build: () => ({ fields: manyFields(MAX_FIELDS + 1) }),
  },
  {
    id: 'recordsPath/empty',
    fault: 'recordsPath',
    sentence: 'the records path is not a usable path',
    build: () => ({ recordsPath: '', fields: { a: { path: 'x' } } }),
  },
  {
    id: 'recordsPath/doubled-separator',
    fault: 'recordsPath',
    sentence: 'the records path is not a usable path',
    build: () => ({ recordsPath: 'a..b', fields: { a: { path: 'x' } } }),
  },
  {
    id: 'recordsPath/too-deep',
    fault: 'recordsPath',
    sentence: 'the records path is not a usable path',
    build: () => ({
      recordsPath: pathOfDepth(MAX_PATH_SEGMENTS + 1),
      fields: { a: { path: 'x' } },
    }),
  },
  {
    id: 'fieldName/space',
    fault: 'fieldName',
    sentence: 'field at position 0 is not a name the engine can use',
    build: () => ({ fields: { 'a b': { path: 'x' } } }),
  },
  {
    id: 'fieldName/too-long',
    fault: 'fieldName',
    sentence: 'field at position 0 is not a name the engine can use',
    build: () => ({
      fields: { [`a${'b'.repeat(MAX_FIELD_NAME_LENGTH)}`]: { path: 'x' } },
    }),
  },
  {
    id: 'reservedName/prototype-setter',
    fault: 'reservedName',
    sentence: 'field __proto__ is a reserved field name',
    build: () => JSON.parse('{"fields":{"__proto__":{"path":"x"}}}'),
  },
  {
    id: 'reservedName/constructor',
    fault: 'reservedName',
    sentence: 'field constructor is a reserved field name',
    build: () => ({ fields: { constructor: { path: 'x' } } }),
  },
  {
    id: 'ruleNotObject/text',
    fault: 'ruleNotObject',
    sentence: 'field alpha states a rule that is not an object',
    build: () => ({ fields: { alpha: 'x' } }),
  },
  {
    id: 'noSource/empty-rule',
    fault: 'noSource',
    sentence: 'field alpha states neither a path nor a selector',
    build: () => ({ fields: { alpha: {} } }),
  },
  {
    id: 'path/doubled-separator',
    fault: 'path',
    sentence: 'field alpha states a path the engine cannot walk',
    build: () => ({ fields: { alpha: { path: 'a..b' } } }),
  },
  {
    id: 'path/not-text',
    fault: 'path',
    sentence: 'field alpha states a path the engine cannot walk',
    build: () => ({ fields: { alpha: { path: 7 } } }),
  },
  {
    id: 'selector/empty',
    fault: 'selector',
    sentence: 'field alpha states a selector that is not a non-empty string',
    build: () => ({ fields: { alpha: { selector: '' } } }),
  },
  {
    id: 'pattern/empty',
    fault: 'pattern',
    sentence: 'field alpha states a pattern that is not a non-empty string',
    build: () => ({ fields: { alpha: { path: 'x', pattern: '' } } }),
  },
  {
    id: 'patternLength/over-the-ceiling',
    fault: 'patternLength',
    sentence: 'field alpha states a pattern longer than the engine compiles',
    build: () => ({
      fields: { alpha: { path: 'x', pattern: 'a'.repeat(MAX_PATTERN_LENGTH + 1) } },
    }),
  },
  {
    id: 'patternCompile/dangling-group',
    fault: 'patternCompile',
    sentence: 'field alpha states a pattern that does not compile',
    build: () => ({ fields: { alpha: { path: 'x', pattern: '([' } } }),
  },
  {
    id: 'group/negative',
    fault: 'group',
    sentence:
      'field alpha states a capture group that is not a non-negative integer',
    build: () => ({ fields: { alpha: { path: 'x', pattern: 'a', group: -1 } } }),
  },
  {
    id: 'group/fractional',
    fault: 'group',
    sentence:
      'field alpha states a capture group that is not a non-negative integer',
    build: () => ({ fields: { alpha: { path: 'x', pattern: 'a', group: 1.5 } } }),
  },
  {
    id: 'groupNoPattern/nothing-to-capture-from',
    fault: 'groupNoPattern',
    sentence: 'field alpha states a capture group with no pattern',
    build: () => ({ fields: { alpha: { path: 'x', group: 2 } } }),
  },
  {
    id: 'type/outside-the-set',
    fault: 'type',
    sentence: 'field alpha states a type the engine does not coerce to',
    build: () => ({ fields: { alpha: { path: 'x', type: 'sideways' } } }),
  },
];

describe('parserConfigErrors — the rows the engine will not run', () => {
  it('answers the one sentence each case names, and only that one', () => {
    const answered = CONFIG_CASES.map((entry) => ({
      id: entry.id,
      errors: parserConfigErrors(entry.build()),
    }));

    expect(answered).toEqual(CONFIG_CASES.map((entry) => ({
      id: entry.id,
      errors: [entry.sentence],
    })));
  });

  // A validator that stopped at the first fault would leave an
  // operator fixing one thing per run over a row with four things
  // wrong with it. Six faults across three fields, answered together.
  it('answers every fault a row carries rather than the first', () => {
    const errors = parserConfigErrors({
      recordsPath: '.',
      fields: {
        alpha: { path: 'a..b', pattern: '([', type: 'sideways' },
        beta: {},
        'g a m m a': { path: 'x' },
      },
    });

    expect(errors).toEqual([
      'the records path is not a usable path',
      'field alpha states a path the engine cannot walk',
      'field alpha states a pattern that does not compile',
      'field alpha states a type the engine does not coerce to',
      'field beta states neither a path nor a selector',
      'field at position 2 is not a name the engine can use',
    ]);
  });

  // The empty-map reading, and its own control. `in` answers true for
  // four members over an object holding nothing at all, so a reader
  // asking `in` instead of `Object.hasOwn` would find a field map
  // full of functions here. The two assertions have to sit together:
  // without the first the second is equally satisfied by a map that
  // had stopped being a plain object.
  it('reads a field map by own key, so an empty one declares nothing', () => {
    const fields = {};

    expect('toString' in fields).toBe(true);
    expect('constructor' in fields).toBe(true);
    expect(parserConfigErrors({ fields }))
      .toEqual(['the field map declares no field']);
  });

  // The three names that are refused by name rather than by class.
  // Each of them passes FIELD_NAME_PATTERN, which is why the reserved
  // list is a second check and not a duplicate of the first.
  it('refuses every reserved name, each of which passes the name class', () => {
    const answered = RESERVED_FIELD_NAMES.map((name) => ({
      name,
      class: FIELD_NAME_PATTERN.test(name),
      errors: parserConfigErrors({ fields: { [name]: { path: 'x' } } }),
    }));

    expect(answered).toEqual(RESERVED_FIELD_NAMES.map((name) => ({
      name,
      class: true,
      errors: [`field ${name} is a reserved field name`],
    })));
  });

  // The accepting half, last. A rule as small as a path, a rule
  // using every member, and the ceilings met exactly rather than
  // crossed — the off-by-one that a `>` written as a `>=` would move.
  it('accepts a well-formed row, up to and including its ceilings', () => {
    const config: ParserConfig = {
      recordsPath: 'payload.items',
      fields: {
        alpha: { path: 'title' },
        beta: {
          path: 'body',
          selector: 'p',
          pattern: 'a'.repeat(MAX_PATTERN_LENGTH),
          group: 0,
          type: 'list',
        },
      },
    };

    expect(parserConfigErrors(config)).toEqual([]);
    expect(parserConfigErrors({ fields: manyFields(MAX_FIELDS) })).toEqual([]);
    expect(parserConfigErrors({
      fields: { alpha: { path: pathOfDepth(MAX_PATH_SEGMENTS) } },
    })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A stored path is a key somebody else wrote
// ---------------------------------------------------------------------------

describe('valueAtPath — the names a stored path may not reach', () => {
  // The whole prototype claim, with its control in the same case.
  // Every one of these four names IS reachable on the object being
  // walked — `in` says so, and the assertion is there so the `null`
  // beside it is a guard working rather than a payload that happened
  // not to carry the key.
  it('resolves a prototype member to nothing, over an object that has one', () => {
    const payload = { title: 'alpha' };
    const names = ['__proto__', 'constructor', 'prototype', 'toString'];
    const reachable = names.map((name) => name in payload);
    const resolved = names.map((name) => valueAtPath(payload, name));

    expect(reachable).toEqual([true, true, false, true]);
    expect(resolved).toEqual([undefined, undefined, undefined, undefined]);
  });

  // The same, at depth and through a payload that really does carry
  // an own `__proto__` — the shape JSON.parse produces, which is how
  // one arrives here. The own key resolves; the inherited one does
  // not, and the two look identical from the path.
  it('resolves an own prototype key and refuses the inherited one', () => {
    const owned: unknown = JSON.parse('{"a":{"__proto__":{"b":1}}}');
    const plain = { a: {} };

    expect(valueAtPath(owned, 'a.__proto__.b')).toBe(1);
    expect(valueAtPath(plain, 'a.__proto__')).toBeUndefined();
    expect(valueAtPath(plain, 'a.constructor.name')).toBeUndefined();
  });

  // The two own members the rule deliberately admits, pinned so the
  // day either stops being admitted is a case rather than a surprise.
  // An array carries `length` as an OWN property, so the own-key rule
  // reaches it by construction; and an index is just a key.
  it('reaches an array index and an array length, both being own keys', () => {
    const payload = { items: ['alpha', 'beta'] };

    expect(Object.hasOwn(payload.items, 'length')).toBe(true);
    expect(valueAtPath(payload, 'items.1')).toBe('beta');
    expect(valueAtPath(payload, 'items.length')).toBe(2);
  });

  // A primitive is a leaf. Without this, `Object.hasOwn` would box a
  // string and answer true for `0`, and a config could index a
  // character out of a title as though it were a member.
  it('descends into no primitive, however own-keyed one looks boxed', () => {
    expect(Object.hasOwn(Object('alpha'), '0')).toBe(true);
    expect(valueAtPath({ title: 'alpha' }, 'title.0')).toBeUndefined();
    expect(valueAtPath({ count: 7 }, 'count.toFixed')).toBeUndefined();
  });

  // The paths that are refused before a payload is touched, all
  // answering the same absence a missing key answers. The engine has
  // one word for "nothing was read"; telling the two apart is
  // parserConfigErrors, ahead of any walk.
  it('answers nothing for every path it will not walk', () => {
    const payload = { a: { b: { c: 'deep' } } };
    const refused: unknown[] = [
      valueAtPath(payload, ''),
      valueAtPath(payload, 'a..b'),
      valueAtPath(payload, '.a'),
      valueAtPath(payload, 'a.'),
      valueAtPath(payload, 7),
      valueAtPath(payload, null),
      valueAtPath(payload, ['a', 'b']),
      valueAtPath(payload, pathOfDepth(MAX_PATH_SEGMENTS + 1)),
      valueAtPath(payload, 'a.missing'),
      valueAtPath(null, 'a'),
    ];

    expect(refused).toEqual(Array.from({ length: 10 }, () => undefined));
    expect(valueAtPath(payload, 'a.b.c')).toBe('deep');
  });
});

// ---------------------------------------------------------------------------
// A bad source compiles to nothing
// ---------------------------------------------------------------------------

describe('compileCapture — a stored pattern that will not compile', () => {
  // The whole reason this answers rather than raises. A source row is
  // exactly where a stray bracket comes from, and the alternative to
  // a null is one operator typo taking a whole batch down.
  it('answers null for every source it cannot make an expression of', () => {
    const refused = [
      '([',
      '*',
      '(?<',
      'a{2,1}',
      '',
      'a'.repeat(MAX_PATTERN_LENGTH + 1),
      7,
      null,
      undefined,
      { source: 'a' },
    ].map((pattern) => compileCapture(pattern));

    expect(refused).toEqual(Array.from({ length: 10 }, () => null));
  });

  // The accepting half, and the two properties a compiled one has to
  // carry. No `g` flag, so no `lastIndex` is kept between calls — a
  // library spliced into a Code node keeps no state by rule, and a
  // cached global expression is the commonest way to break that.
  it('compiles a usable source with no global flag', () => {
    const compiled = compileCapture('^a(\\d+)$');

    expect(compiled).toBeInstanceOf(RegExp);
    expect(compiled?.global).toBe(false);
    expect(compiled?.lastIndex).toBe(0);
    expect(compileCapture('a'.repeat(MAX_PATTERN_LENGTH))).toBeInstanceOf(RegExp);
  });
});

describe('captureFrom — four ways to capture nothing, none of them raising', () => {
  it('answers null for a bad pattern, a bad value, no match and no group', () => {
    const refused = [
      captureFrom('alpha-7', '(['),
      captureFrom({ a: 1 }, '(.+)'),
      captureFrom('alpha-7', 'beta-(\\d+)'),
      captureFrom('alpha-7', '(alpha)|(beta)', 2),
      captureFrom(null, '(.+)'),
    ];

    expect(refused).toEqual([null, null, null, null, null]);
  });

  // The group rules, all three in one reading. A stated group is
  // taken; the default is group 1; and a pattern with no group at all
  // falls back to the whole match rather than reporting anything.
  it('reads the stated group, then group one, then the whole match', () => {
    expect(captureFrom('alpha-7', '(a)(l)(p)', 3)).toBe('p');
    expect(captureFrom('alpha-7', '-(\\d+)$')).toBe('7');
    expect(DEFAULT_CAPTURE_GROUP).toBe(1);
    expect(captureFrom('alpha-7', '\\d+')).toBe('7');
    expect(captureFrom('alpha-7', '(a)', 0)).toBe('a');
  });

  // A number and a boolean have honest text, so a pattern may run
  // over one. An object does not, which is the same line asText draws
  // everywhere else in the module.
  it('captures out of a primitive and never out of an object', () => {
    expect(captureFrom(2048, '(\\d\\d)')).toBe('20');
    expect(captureFrom(true, '(tru)')).toBe('tru');
    expect(captureFrom([2048], '(\\d\\d)')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A measured zero is not an absent one
// ---------------------------------------------------------------------------

describe('coerceValue — the null-vs-zero rule, one type at a time', () => {
  // The three conversions that would each answer a confident number
  // for a payload that measured nothing. Every one of them is a real
  // JavaScript reading, which is why each is refused by hand.
  it('never turns an unmeasured value into a number', () => {
    const answered = [
      coerceValue('', 'number'),
      coerceValue('   ', 'number'),
      coerceValue([], 'number'),
      coerceValue(['5'], 'number'),
      coerceValue(true, 'number'),
      coerceValue(null, 'number'),
      coerceValue(undefined, 'number'),
      coerceValue('alpha', 'number'),
      coerceValue(Number.NaN, 'number'),
      coerceValue(Number.POSITIVE_INFINITY, 'number'),
    ];

    expect(answered).toEqual(Array.from({ length: 10 }, () => null));
    expect(Number('')).toBe(0);
    expect(Number([])).toBe(0);
    expect(Number(true)).toBe(1);
  });

  // And the other half, which is the half that makes the first one
  // mean something: a zero that WAS measured survives as a zero.
  it('keeps a measured zero, however it was spelled', () => {
    expect(coerceValue(0, 'number')).toBe(0);
    expect(coerceValue('0', 'number')).toBe(0);
    expect(coerceValue(' 0 ', 'number')).toBe(0);
    expect(coerceValue(0, 'text')).toBe('0');
    expect(coerceValue('', 'text')).toBe('');
    expect(coerceValue(false, 'boolean')).toBe(false);
  });

  // `Boolean('false')` is true, and a source sending the word is not
  // unusual. Two closed word lists rather than a truthiness test.
  it('reads a boolean off a word rather than off truthiness', () => {
    expect(Boolean('false')).toBe(true);
    expect(coerceValue('false', 'boolean')).toBe(false);
    expect(coerceValue('NO', 'boolean')).toBe(false);
    expect(coerceValue(' True ', 'boolean')).toBe(true);
    expect(coerceValue(1, 'boolean')).toBe(true);
    expect(coerceValue(2, 'boolean')).toBeNull();
    expect(coerceValue('maybe', 'boolean')).toBeNull();
  });

  // A scalar is not wrapped into a list. Wrapping is how a source
  // answering one record where the config expected many stops being
  // visible to the contract.
  it('refuses to invent a list out of a value that is not one', () => {
    expect(coerceValue('alpha', 'list')).toBeNull();
    expect(coerceValue({ 0: 'alpha', length: 1 }, 'list')).toBeNull();
    expect(coerceValue(['alpha'], 'list')).toEqual(['alpha']);
  });

  // A list is copied, so nothing downstream writes back into a
  // payload the caller may still be holding.
  it('copies a list rather than answering the payload one', () => {
    const members = ['alpha'];
    const coerced = coerceValue(members, 'list');

    expect(coerced).toEqual(members);
    expect(coerced).not.toBe(members);
  });

  // An object with a raising `toString` makes both String(x) and
  // Number(x) throw — a number coercion consults valueOf, gets the
  // object back, and falls through. Guarding by TYPE rather than by
  // a try is what makes that unreachable rather than caught.
  it('takes no reading off a value whose own conversion raises', () => {
    const hostile: Record<string, unknown> = { a: 1 };

    Object.defineProperty(hostile, 'toString', {
      enumerable: false,
      value: () => {
        throw new Error('conversion refused');
      },
    });

    expect(() => String(hostile)).toThrow();
    expect(() => Number(hostile)).toThrow();
    expect(coerceValue(hostile, 'text')).toBeNull();
    expect(coerceValue(hostile, 'number')).toBeNull();
    expect(coerceValue(hostile, 'raw')).toBe(hostile);
  });

  // The default, and the fallback for a type the validator already
  // refused. Both answer text, which is what keeps a record's shape
  // a property of the config rather than of the payload.
  it('falls back to the default type for a type it does not know', () => {
    expect(DEFAULT_FIELD_TYPE).toBe('text');
    expect(coerceValue(7, undefined)).toBe('7');
    expect(coerceValue(7, 'sideways')).toBe('7');
    expect(FIELD_TYPES).toContain(DEFAULT_FIELD_TYPE);
  });

  // Absence is null under every type there is, including `raw`.
  it('answers null for an absent value under every type', () => {
    const answered = FIELD_TYPES.flatMap((type) => [
      coerceValue(null, type),
      coerceValue(undefined, type),
    ]);

    expect(answered)
      .toEqual(Array.from({ length: FIELD_TYPES.length * 2 }, () => null));
  });
});

// ---------------------------------------------------------------------------
// The markup step is a parameter, not an import
// ---------------------------------------------------------------------------

/**
 * A markup step standing in for `src/lib/markup-select.ts`.
 *
 * Deliberately trivial and deliberately NOT that module: what these
 * cases are about is the seam, and a real matcher here would make
 * every answer depend on a library this one may not import anyway.
 * Fragments are the pipe-separated parts carrying the selector.
 *
 * @param markup - Whatever the path step reached, as text.
 * @param selector - The stored selector.
 * @returns The fragments naming it.
 */
function splitOnPipes(markup: string, selector: string): readonly string[] {
  return markup.split('|').filter((part) => part.includes(selector));
}

/** A step that raises, standing in for one with a bug in it. */
const RAISING_STEP: ParseDeps = {
  selectMarkup: () => {
    throw new Error('matcher refused');
  },
};

/** The three selector fields every markup case is driven over. */
const SELECTOR_FIELDS: Readonly<Record<string, FieldRule>> = {
  one: { path: 'body', selector: 'a' },
  many: { path: 'body', selector: 'a', type: 'list' },
  ids: { path: 'body', selector: 'a', type: 'list', pattern: '(\\d+)' },
};

describe('applyFieldMap — a selector with no step behind it', () => {
  // The three ways a selector field reads nothing, each with its own
  // sentence. Every one of them is a caller-side condition rather
  // than a payload one, which is why they are warnings against a
  // field rather than faults against a row.
  it('warns and reads nothing when the step is absent, wrong or raising', () => {
    const answered = [
      applyFieldMap({ body: 'a1|b2' }, SELECTOR_FIELDS),
      applyFieldMap({ body: 'a1|b2' }, SELECTOR_FIELDS, {}),
      applyFieldMap({ body: { nested: true } }, SELECTOR_FIELDS, {
        selectMarkup: splitOnPipes,
      }),
      applyFieldMap({ body: 'a1|b2' }, SELECTOR_FIELDS, RAISING_STEP),
    ];

    expect(answered.map((result) => result.record)).toEqual(Array.from(
      { length: 4 },
      () => ({ one: null, many: null, ids: null }),
    ));
    expect(answered.map((result) => result.warnings)).toEqual([
      [
        'field one states a selector and no markup step was supplied',
        'field many states a selector and no markup step was supplied',
        'field ids states a selector and no markup step was supplied',
      ],
      [
        'field one states a selector and no markup step was supplied',
        'field many states a selector and no markup step was supplied',
        'field ids states a selector and no markup step was supplied',
      ],
      [
        'field one states a selector over a value that is not text',
        'field many states a selector over a value that is not text',
        'field ids states a selector over a value that is not text',
      ],
      [
        'field one states a selector and the markup step raised',
        'field many states a selector and the markup step raised',
        'field ids states a selector and the markup step raised',
      ],
    ]);
  });

  // A step answering something that is not a list of fragments is a
  // caller with a bug, and it degrades to no fragments rather than
  // putting a stray value in a record. The asymmetry below is the
  // fragment list being empty read two ways: a scalar field found no
  // first fragment, and a list field found every fragment there was.
  it('keeps no stray value from a step that answered something else', () => {
    const answered = applyFieldMap({ body: 'a1' }, SELECTOR_FIELDS, {
      selectMarkup: () => 42,
    });

    expect(answered.record).toEqual({ one: null, many: [], ids: [] });
    expect(answered.warnings).toEqual([]);
  });

  // The working seam, last. A scalar field takes the first fragment,
  // a list field takes them all, and a capture runs per member with
  // the cardinality kept — the unmatched member is a null in place
  // rather than a shorter list.
  it('reads fragments through the step it was handed', () => {
    const answered = applyFieldMap(
      { body: 'a1|b2|a|a3' },
      SELECTOR_FIELDS,
      { selectMarkup: splitOnPipes },
    );

    expect(answered.record).toEqual({
      one: 'a1',
      many: ['a1', 'a', 'a3'],
      ids: ['1', null, '3'],
    });
    expect(answered.warnings).toEqual([]);
  });

  // The write side of the prototype rule. A field named `__proto__`
  // lands as a real own key; over a plain object the same assignment
  // reaches the setter on Object.prototype and does nothing at all,
  // which the control in this case measures rather than asserts from
  // memory.
  it('builds a record on a null prototype, so no field name is a setter', () => {
    // The field map itself has to be built with a COMPUTED key, and
    // that is the same trap one step earlier: the plain literal form
    // sets the prototype instead of declaring a member, so a field
    // map written that way declares no field at all. Both spellings
    // are here, and the first two assertions are what say so.
    const computed = { ['__proto__']: { path: 'v' } };
    const literal = { __proto__: { path: 'v' } };
    const answered = applyFieldMap({ v: 'alpha' }, computed);
    const control: Record<string, unknown> = {};

    control.__proto__ = 'alpha';

    expect(Object.hasOwn(literal, '__proto__')).toBe(false);
    expect(Object.hasOwn(computed, '__proto__')).toBe(true);
    expect(applyFieldMap({ v: 'alpha' }, literal).record).toEqual({});

    // The write side. Over a plain object the same assignment reaches
    // the setter on Object.prototype and does nothing at all, which
    // the control measures rather than asserts from memory.
    expect(Object.hasOwn(control, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(answered.record)).toBeNull();
    expect(Object.hasOwn(answered.record, '__proto__')).toBe(true);
    expect(answered.record['__proto__']).toBe('alpha');
  });

  // Every declared field gets a member, including the ones that read
  // as nothing — otherwise an absence and a member nobody declared
  // would be the same thing, and contractErrors has to tell them
  // apart to answer `required` at all.
  it('gives every declared field a member, present or not', () => {
    const answered = applyFieldMap({ here: 'alpha' }, {
      here: { path: 'here' },
      gone: { path: 'gone' },
      broken: { path: 'here', pattern: '([' },
    });

    expect(Object.keys(answered.record)).toEqual(['here', 'gone', 'broken']);
    expect(answered.record).toEqual({
      here: 'alpha',
      gone: null,
      broken: null,
    });
  });
});

// ---------------------------------------------------------------------------
// A refused row reads nothing, and a thin payload reads what it has
// ---------------------------------------------------------------------------

describe('extractRecords — the row first, then the payload', () => {
  // The one place the engine refuses rather than degrading. A partial
  // extraction under a broken config is indistinguishable from a thin
  // payload, so the faults go where they name a row somebody edits
  // and nothing is read at all.
  it('reads nothing at all under a config carrying any fault', () => {
    const answered = extractRecords({ items: [{ title: 'alpha' }] }, {
      recordsPath: 'items',
      fields: { title: { path: 'title' }, broken: {} },
    });

    expect(answered.records).toEqual([]);
    expect(answered.warnings).toEqual([]);
    expect(answered.configErrors)
      .toEqual(['field broken states neither a path nor a selector']);
  });

  // Everything past the config degrades instead, because a run over a
  // batch has to finish the batch. Four payloads that did not carry
  // what the row expected, each answering its own sentence.
  it('warns and carries on for every payload shape it did not expect', () => {
    const config: ParserConfig = {
      recordsPath: 'items',
      fields: { title: { path: 'title' } },
    };
    const answered = [
      extractRecords({}, config),
      extractRecords({ items: 'a page' }, config),
      extractRecords({ items: [{ title: 'alpha' }, 7, null] }, config),
      extractRecords(7, { fields: { title: { path: 'title' } } }),
    ];

    expect(answered.map((result) => result.records.length)).toEqual([0, 0, 1, 0]);
    expect(answered.map((result) => result.warnings)).toEqual([
      ['the payload holds nothing where records should be'],
      ['the payload holds no record and no list where records should be'],
      ['entries the payload offered as records are not records: 2'],
      ['the payload holds no record and no list where records should be'],
    ]);
    expect(answered.every((result) => result.configErrors.length === 0)).toBe(true);
  });

  // The three payload shapes a source really answers, all accepted:
  // records under a path, a bare list, and one record on its own.
  it('reads records from a path, from a bare list and from one record', () => {
    const fields: Readonly<Record<string, FieldRule>> = {
      title: { path: 'title' },
    };
    const answered = [
      extractRecords(
        { d: { items: [{ title: 'a' }] } },
        { recordsPath: 'd.items', fields },
      ),
      extractRecords([{ title: 'a' }], { fields }),
      extractRecords({ title: 'a' }, { fields }),
    ];

    expect(answered.map((result) => result.records)).toEqual([
      [{ title: 'a' }],
      [{ title: 'a' }],
      [{ title: 'a' }],
    ]);
    expect(answered.flatMap((result) => result.warnings)).toEqual([]);
  });

  // The whole engine over one well-formed source, every step of a
  // field rule exercised at once and every record on a null
  // prototype.
  it('runs all four steps over a well-formed row and payload', () => {
    const answered = extractRecords(
      {
        payload: {
          items: [
            { title: 'a1|b2', ref: 'ref-42', hits: '0', live: 'yes' },
            { title: 'b2', ref: 'nothing', hits: '', live: 7 },
          ],
        },
      },
      {
        recordsPath: 'payload.items',
        fields: {
          heads: { path: 'title', selector: 'a', type: 'list' },
          ref: { path: 'ref', pattern: '^ref-(\\d+)$', type: 'number' },
          hits: { path: 'hits', type: 'number' },
          live: { path: 'live', type: 'boolean' },
        },
      },
      { selectMarkup: splitOnPipes },
    );

    expect(answered.records).toEqual([
      { heads: ['a1'], ref: 42, hits: 0, live: true },
      { heads: [], ref: null, hits: null, live: null },
    ]);
    expect(answered.warnings).toEqual([]);
    expect(answered.configErrors).toEqual([]);
    expect(answered.records.map((record) => Object.getPrototypeOf(record)))
      .toEqual([null, null]);
  });
});

// ---------------------------------------------------------------------------
// Divergence is what fail-flag-keep reads
// ---------------------------------------------------------------------------

/** One record that fails one check, and which one. */
interface ContractCase {
  /** Stable label a failure prints. */
  readonly id: string;

  /** The {@link CONTRACT_FAULT_ENTRIES} member it reaches. */
  readonly fault: string;

  /** The whole sentence, site and all. */
  readonly sentence: string;

  /** The reading being judged. */
  readonly build: () => unknown;

  /** The contract judging it. */
  readonly contract: () => unknown;
}

/** A contract requiring one text member, reused by several cases. */
function requiringTitle(): SourceContract {
  return { fields: { title: { required: true, type: 'text' } } };
}

/**
 * One case per divergence a contract can report, each carrying the
 * one it names and nothing else that could.
 */
const CONTRACT_CASES: readonly ContractCase[] = [
  {
    id: 'recordNotObject/list',
    fault: 'recordNotObject',
    sentence: 'the record is not an object',
    build: () => [{ title: 'alpha' }],
    contract: requiringTitle,
  },
  {
    id: 'notObject/text',
    fault: 'notObject',
    sentence: 'the contract is not an object',
    build: () => ({ title: 'alpha' }),
    contract: () => 'title',
  },
  {
    id: 'fieldsNotObject/list',
    fault: 'fieldsNotObject',
    sentence: 'the contract field map is not an object',
    build: () => ({ title: 'alpha' }),
    contract: () => ({ fields: [{ title: {} }] }),
  },
  {
    id: 'memberName/space',
    fault: 'memberName',
    sentence: 'member at position 0 is not a name the engine can use',
    build: () => ({ title: 'alpha' }),
    contract: () => ({ fields: { 't i t l e': { required: true } } }),
  },
  {
    id: 'checkNotObject/boolean',
    fault: 'checkNotObject',
    sentence: 'member title declares a check that is not an object',
    build: () => ({ title: 'alpha' }),
    contract: () => ({ fields: { title: true } }),
  },
  {
    id: 'required/absent',
    fault: 'required',
    sentence: 'member title is required and no value was read',
    build: () => ({ title: null }),
    contract: requiringTitle,
  },
  {
    id: 'typePrefix/text-where-a-number-was-declared',
    fault: 'typePrefix',
    sentence: 'member count was not read as the declared type: number',
    build: () => ({ count: '7' }),
    contract: () => ({ fields: { count: { type: 'number' } } }),
  },
  {
    id: 'typeUnknown/outside-the-set',
    fault: 'typeUnknown',
    sentence: 'member count declares a type the engine does not coerce to',
    build: () => ({ count: 7 }),
    contract: () => ({ fields: { count: { type: 'sideways' } } }),
  },
  {
    id: 'pattern/no-match',
    fault: 'pattern',
    sentence: 'member title does not match the declared pattern',
    build: () => ({ title: 'alpha' }),
    contract: () => ({ fields: { title: { pattern: '^beta' } } }),
  },
  {
    id: 'pattern/no-honest-text',
    fault: 'pattern',
    sentence: 'member title does not match the declared pattern',
    build: () => ({ title: ['alpha'] }),
    contract: () => ({ fields: { title: { pattern: '^alpha' } } }),
  },
  {
    id: 'patternCompile/dangling-group',
    fault: 'patternCompile',
    sentence: 'member title declares a pattern that does not compile',
    build: () => ({ title: 'alpha' }),
    contract: () => ({ fields: { title: { pattern: '([' } } }),
  },
];

describe('contractErrors — the divergences fail-flag-keep is built on', () => {
  it('answers the one sentence each case names, and only that one', () => {
    const answered = CONTRACT_CASES.map((entry) => ({
      id: entry.id,
      errors: contractErrors(entry.build(), entry.contract()),
    }));

    expect(answered).toEqual(CONTRACT_CASES.map((entry) => ({
      id: entry.id,
      errors: [entry.sentence],
    })));
  });

  // A member that was not read stops after `required`, so one absence
  // is one sentence rather than three. Without this a required
  // member that is also typed and patterned would bury its own
  // report under two consequences of it.
  it('reports one absence once, not once per check it also failed', () => {
    const errors = contractErrors({ count: null }, {
      fields: {
        count: { required: true, type: 'number', pattern: '^\\d+$' },
      },
    });

    expect(errors).toEqual(['member count is required and no value was read']);
  });

  // The null-vs-zero rule, read from the checking end. Every one of
  // these members WAS measured, so every one of them satisfies
  // `required` — a check keying on falsiness would fail all four.
  it('treats a zero, a false and an empty string as readings taken', () => {
    const errors = contractErrors(
      { count: 0, live: false, title: '', tags: [] },
      {
        fields: {
          count: { required: true, type: 'number' },
          live: { required: true, type: 'boolean' },
          title: { required: true, type: 'text' },
          tags: { required: true, type: 'list' },
        },
      },
    );

    expect(errors).toEqual([]);
  });

  // The documented cost of a column left at its default, asserted
  // rather than assumed: where nothing is declared, nothing is
  // rejected and a drifted source reads like a working one. The
  // repair is a contract, not a stricter default here.
  it('rejects nothing under a contract that declares nothing', () => {
    const nothing: unknown[] = [{}, { fields: {} }];
    const answered = nothing.map(
      (contract) => contractErrors({ any: 1 }, contract),
    );

    expect(answered).toEqual([[], []]);
  });

  // A record with several members wrong reports all of them, in
  // contract order, so one storable sentence list covers the whole
  // divergence.
  it('answers every divergence a record carries rather than the first', () => {
    const errors = contractErrors({ title: 'alpha', count: '7', ref: null }, {
      fields: {
        title: { pattern: '^beta' },
        count: { type: 'number' },
        ref: { required: true },
      },
    });

    expect(errors).toEqual([
      'member title does not match the declared pattern',
      'member count was not read as the declared type: number',
      'member ref is required and no value was read',
    ]);
  });

  // The accepting half, over a record the engine itself built — the
  // pairing the ingest path actually runs, rather than a record
  // typed here that no extraction would produce.
  it('accepts a reading the engine took under a contract it satisfies', () => {
    const answered = extractRecords(
      { items: [{ title: 'alpha', count: 0 }] },
      {
        recordsPath: 'items',
        fields: {
          title: { path: 'title' },
          count: { path: 'count', type: 'number' },
        },
      },
    );

    expect(answered.records).toHaveLength(1);
    expect(contractErrors(answered.records[0], {
      fields: {
        title: { required: true, type: 'text', pattern: '^a' },
        count: { required: true, type: 'number' },
      },
    })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The sentences these answers are assembled from
// ---------------------------------------------------------------------------

/**
 * Every config fault sentence this file's cases produce.
 *
 * The case table plus the composite rows the cases beside it drive,
 * so a fault reachable only from a composite row still counts as
 * reached.
 *
 * @returns One entry per sentence, in no particular order.
 */
function everyConfigFault(): readonly string[] {
  return [
    ...CONFIG_CASES.flatMap((entry) => parserConfigErrors(entry.build())),
    ...parserConfigErrors({ fields: 7 }),
    ...RESERVED_FIELD_NAMES.flatMap(
      (name) => parserConfigErrors({ fields: { [name]: { path: 'x' } } }),
    ),
  ];
}

/**
 * Every contract fault sentence this file's cases produce.
 *
 * @returns One entry per sentence, in no particular order.
 */
function everyContractFault(): readonly string[] {
  return CONTRACT_CASES.flatMap(
    (entry) => contractErrors(entry.build(), entry.contract()),
  );
}

/**
 * Every per-payload warning this file's cases produce.
 *
 * @returns One entry per sentence, in no particular order.
 */
function everyWarning(): readonly string[] {
  const config: ParserConfig = {
    recordsPath: 'items',
    fields: { title: { path: 'title' } },
  };

  return [
    ...extractRecords({}, config).warnings,
    ...extractRecords({ items: 'a page' }, config).warnings,
    ...extractRecords({ items: [{ title: 'a' }, 7] }, config).warnings,
    ...applyFieldMap({ body: 'a1' }, SELECTOR_FIELDS).warnings,
    ...applyFieldMap({ body: { n: 1 } }, SELECTOR_FIELDS, {
      selectMarkup: splitOnPipes,
    }).warnings,
    ...applyFieldMap({ body: 'a1' }, SELECTOR_FIELDS, RAISING_STEP).warnings,
  ];
}

/** The three rosters, each with what reaches it and a label. */
const ROSTERS = [
  {
    id: 'config faults',
    entries: CONFIG_FAULT_ENTRIES,
    produced: everyConfigFault,
    pointed: () => CONFIG_CASES.map((entry) => entry.fault),
  },
  {
    id: 'contract faults',
    entries: CONTRACT_FAULT_ENTRIES,
    produced: everyContractFault,
    pointed: () => CONTRACT_CASES.map((entry) => entry.fault),
  },
  {
    id: 'payload warnings',
    entries: WARNING_ENTRIES,
    produced: everyWarning,
    pointed: (): readonly string[] => WARNING_ENTRIES.map((entry) => entry.id),
  },
] as const;

describe('the closed rosters these sentences are held against', () => {
  // The first direction. A sentence a case produced that no entry
  // registers means the module has grown a report nothing here knows
  // about — the shape a widened validator takes when nobody updates
  // this file.
  for (const roster of ROSTERS) {
    it(`produces no ${roster.id} sentence the roster does not register`, () => {
      expect(unregistered(roster.entries, roster.produced())).toEqual([]);
    });
  }

  // The other direction, and the one that catches a sentence going
  // quietly unreachable. Every entry in all three rosters is
  // reachable — there is no unreachable member to declare — so this
  // is asserted whole rather than filtered.
  for (const roster of ROSTERS) {
    it(`reaches every ${roster.id} sentence the roster registers`, () => {
      expect(unreachedIds(roster.entries, roster.produced())).toEqual([]);
    });
  }

  // The registration itself, held both ways: a case pointing at an id
  // no entry declares, and an entry no case points at. Without this
  // the guards above pass for a table whose ids have drifted.
  for (const roster of ROSTERS) {
    it(`registers every ${roster.id} case against an entry, and back`, () => {
      const declared = roster.entries.map((entry) => entry.id);
      const pointed = roster.pointed();

      expect(pointed.filter((id) => !declared.includes(id))).toEqual([]);
      expect(declared.filter((id) => !pointed.includes(id))).toEqual([]);
    });
  }

  // No entry may be a prefix or a suffix of another, or one sentence
  // would satisfy two of them and the two guards above would agree
  // with a roster that had lost a member.
  for (const roster of ROSTERS) {
    it(`registers no ${roster.id} sentence that accounts for another`, () => {
      const overlapping = roster.entries.filter((entry) => roster.entries.some(
        (other) => other.id !== entry.id && matchesEntry(other, entry.text),
      ));

      expect(overlapping.map((entry) => entry.id)).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// The no-echo claim, read back off the output
// ---------------------------------------------------------------------------

/**
 * The sentinels planted through a config, a payload and a contract.
 *
 * Assembled from fragments rather than written whole, which is this
 * repository's habit for any string a scan is keyed on: a literal
 * pasted into a file is the very text a later sweep would find in
 * the wrong place.
 */
const SENTINELS: readonly string[] = [
  ['zqx', 'path', 'ery'].join(''),
  ['zqx', 'patt', 'ern'].join(''),
  ['zqx', 'sel', 'ector'].join(''),
  ['zqx', 'ty', 'pe'].join(''),
  ['zqx', 'val', 'ue'].join(''),
  ['zqx', 'na', 'me'].join(''),
];

/**
 * Every sentence all three entry points return over sentinel input.
 *
 * The config is malformed in every member a sentence could quote,
 * the payload carries a sentinel where a value goes, and the
 * contract declares one too. Whatever the module has to say about
 * any of it lands in this list.
 *
 * @returns Every sentence produced, across the three entry points.
 */
function everySentinelSentence(): readonly string[] {
  const [path, pattern, selector, type, value, name] = SENTINELS;
  const config = {
    recordsPath: `${String(path)}..${String(path)}`,
    fields: {
      [`bad ${String(name)}`]: { path },
      alpha: { path: `${String(path)}..x`, pattern, type },
      beta: { selector: 7, pattern: `(${String(pattern)}` },
    },
  };
  const payload = { items: [{ title: value }] };
  const contract = {
    fields: {
      [`bad ${String(name)}`]: { required: true },
      title: { type: 'number', pattern: `(${String(pattern)}` },
      absent: { required: true, pattern: `^${String(pattern)}$` },
    },
  };
  const reading = extractRecords(payload, {
    recordsPath: 'items',
    fields: { title: { path: 'title' }, beta: { path: 'title', selector } },
  });

  return [
    ...parserConfigErrors(config),
    ...extractRecords(payload, config).configErrors,
    ...reading.warnings,
    ...contractErrors(reading.records[0], contract),
    ...contractErrors({ title: value }, contract),
  ];
}

describe('no sentence repeats a value it was shown', () => {
  // The re-read. A validator cannot see its own template leak a
  // value, so the check is over the OUTPUT rather than over the
  // module: every sentinel is asserted absent from every sentence,
  // whichever entry point produced it.
  it('quotes no config value, no payload value and no contract value', () => {
    const sentences = everySentinelSentence();
    const leaked = sentences.filter(
      (sentence) => SENTINELS.some((sentinel) => sentence.includes(sentinel)),
    );

    expect(sentences.length).toBeGreaterThan(0);
    expect(leaked).toEqual([]);
  });

  // The control that makes the sweep above mean something. A name
  // inside the class IS quoted, on purpose, because a fault nobody
  // can locate is not a report — so the sweep passing is a validator
  // that names sites and withholds values, rather than one that had
  // stopped naming anything at all.
  it('names a site it is allowed to name, so the sweep is discriminating', () => {
    const inside = parserConfigErrors({ fields: { alpha: {} } });
    const outside = parserConfigErrors({ fields: { 'al pha': {} } });

    expect(inside).toEqual(['field alpha states neither a path nor a selector']);
    expect(outside)
      .toEqual(['field at position 0 is not a name the engine can use']);
    expect(outside.some((sentence) => sentence.includes('al pha'))).toBe(false);
  });

  // The ceiling on what a site can carry, which is the other half of
  // the bound. A name past the length is refused before it is quoted,
  // so no sentence carries an unbounded run of text.
  it('quotes no name past the ceiling the name class is bounded by', () => {
    const long = 'a'.repeat(MAX_FIELD_NAME_LENGTH + 1);
    const errors = parserConfigErrors({ fields: { [long]: { path: 'x' } } });

    expect(FIELD_NAME_PATTERN.test(long)).toBe(true);
    expect(errors)
      .toEqual(['field at position 0 is not a name the engine can use']);
  });
});
