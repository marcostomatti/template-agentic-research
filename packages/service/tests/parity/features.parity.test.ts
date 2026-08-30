/**
 * Kernel parity for `src/lib/features.ts`: the three value coercions,
 * driven against the original over the shared adversarial corpus.
 *
 * KERNEL rather than full, and the boundary is the ORIGINAL's export
 * surface rather than the port's. What the original exports is a
 * version, three frozen rosters, an extractor, a key list and a
 * vector builder — and NONE of its three coercions. So each coercion
 * is reached COMPOSITIONALLY here, through whichever export runs it,
 * and each is also driven on its own in
 * `tests/lib/features.test.ts`. Read the two files together; neither
 * is the whole reading.
 *
 * The whole-record comparison the other ports get is unavailable by
 * construction. The original's columns ARE its frozen vocabularies —
 * the layout is a fact about one deployment's subject matter — and
 * the port derives its columns from a domain's term rows instead.
 * Two records over the same document therefore have different
 * columns on purpose, and a comparison of them would be measuring
 * the port's parameterization rather than its arithmetic.
 *
 * ## The three reaches, and why each one is the coercion
 *
 * THE NUMBER COERCION, through the vector builder. The original's
 * builder walks its own key list and coerces every cell it reads, so
 * a record keyed by that list with an adversarial value in a cell is
 * a call whose entire content is the coercion. The port's builder
 * takes the key list as an ARGUMENT for exactly this reason, which
 * is also the honest shape for rebuilding a stored vector against
 * the layout its version names.
 *
 * THE TEXT COERCION, through the extractor's shape signals. Both
 * sides render a document's prepared text through their coercion and
 * then measure its length and how many of its lines open as list
 * items. Two numbers rather than the text itself, but they move with
 * every difference a coercion can make: a refusal that answered
 * where the other raised, an absence rendered as a word, a line
 * ending folded one way rather than another.
 *
 * THE KEY COERCION, through the roster the key list is built from.
 * This is the one reach that has to hand the original an input it
 * does not take as an argument at all: its rosters are module
 * constants, so {@link addedColumn} swaps a probe name into the
 * exported array, reads the column name the key list then gains, and
 * restores the array in a `finally`. The exported array is the
 * argument the original does not have, and nothing else reaches that
 * coercion.
 *
 * ## What this file writes down, and what it discovers
 *
 * The original's column names ARE the vocabulary this port refuses
 * to carry, so this file never writes one down. Every comparison
 * takes the key list at RUN TIME off the original's own exported
 * function, hands the same list to the port, and lets the names
 * exist for the length of a case. Saying which half is which is the
 * point of this paragraph — a reader meeting one origin identifier
 * in a tracked file will otherwise read the whole discipline as
 * decorative.
 *
 * WRITTEN DOWN: the module path, the three entry-point names, and
 * the export name of the borrowed roster. That is the law's own line
 * rather than a preference — a parity file cannot address a module
 * by a path the module does not have, nor call an export by a name
 * it does not have. What the roster HOLDS is never read.
 *
 * DISCOVERED: the column names, the document field carrying the
 * prepared text ({@link documentFields} hands the extractor a
 * recording proxy), which columns carry the two shape signals, and
 * the fixed string the original builds a column name out of
 * ({@link originColumnPrefix}, read off a probe whose keyed form is
 * itself). Each derivation refuses any count but one, which is what
 * says a role was identified rather than guessed at.
 *
 * ## Both endings, as values
 *
 * Every call goes through {@link outcomeOf}. None of these paths is
 * supposed to raise — refusing rather than raising is the whole
 * argument behind the coercions — so a comparison reading only
 * returned values would pass for a port that started raising where
 * the original answered, which is the largest regression available
 * here.
 *
 * That arrangement needs its own control, because two
 * implementations that answer everything agree perfectly about
 * refusing nothing. Read off the PORT, the original being the thing
 * under measurement: the driven set has to produce exactly ONE
 * ending, every input answered, AND a reading that is not all zeros,
 * since a corpus drifted into absence would agree having coerced
 * nothing.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and
 * a load up there would throw on every run that armed nothing —
 * CI's included.
 */
import { expect, it } from 'vitest';

import {
  asKey,
  extractFeatures,
  featureVector,
} from '../../src/lib/features.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { ADVERSARIAL_VALUES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/features.js';

/** The three exports this file drives. */
const ENTRY_POINTS = ['featureKeys', 'featureVector', 'extractFeatures'];

/**
 * The exported roster {@link originKeyOf} borrows to reach the key
 * coercion.
 *
 * Named rather than discovered because it is an export name, which
 * is the half the law leaves written down. What it HOLDS is never
 * read and never printed — the array is emptied, driven and put
 * back.
 */
const ORIGIN_ROSTER = 'FEATURE_CLUSTERS';

/** What the origin module has to be for this file to drive it. */
interface FeaturesOrigin {
  /** The column names, in column order. */
  readonly featureKeys: () => unknown;

  /** A record's values, in that same order. */
  readonly featureVector: (record: unknown) => unknown;

  /** A document's record, which is where the text coercion runs. */
  readonly extractFeatures: (
    document: unknown,
    scored: unknown,
    settings: unknown,
  ) => unknown;

  /** The roster the key coercion is reached through. */
  readonly [ORIGIN_ROSTER]: unknown;
}

/**
 * Whether every entry point is there and callable, and the roster is
 * an array this file can borrow.
 *
 * @param value - Whatever the loader answered with.
 * @returns Whether it is the module this file drives.
 */
function isFeaturesOrigin(value: unknown): value is FeaturesOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const members = value as Record<string, unknown>;
  const callable = ENTRY_POINTS.every(
    (name) => typeof members[name] === 'function',
  );

  return callable && Array.isArray(members[ORIGIN_ROSTER]);
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
 * @returns The origin module, with every entry point callable.
 */
function originFeatures(): FeaturesOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isFeaturesOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export ${ENTRY_POINTS.join(', ')} as `
      + `functions beside a ${ORIGIN_ROSTER} array.`,
    );
  }

  return loaded;
}

/**
 * Whether a value is a list of names.
 *
 * @param value - Whatever a call answered with.
 * @returns Whether every member is a string.
 */
function isNameList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(
    (member) => typeof member === 'string',
  );
}

/**
 * The original's key list, as names.
 *
 * Narrowed through a predicate rather than a cast, for the reason
 * the loader's own header gives: a list carrying anything but
 * strings would otherwise be driven as though it were names, and
 * every record built from it would be keyed on nothing.
 *
 * @param origin - The origin module.
 * @returns Its column names, in column order.
 */
function originKeys(origin: FeaturesOrigin): readonly string[] {
  const listed = origin.featureKeys();

  if (!isNameList(listed)) {
    throw new TypeError('the origin key list is not a list of names.');
  }

  return listed;
}

// ---------------------------------------------------------------------------
// Reaching the key coercion: the roster the original does not take
// ---------------------------------------------------------------------------

/**
 * A name whose keyed form is itself, used to read the fixed prefix
 * the original builds a column name out of.
 *
 * Lower-case letters only, so every coercion anyone could write
 * answers it unchanged. That is asserted in a case of its own rather
 * than assumed, since the whole prefix reading rests on it.
 */
const PREFIX_PROBE = 'zulu';

/**
 * The column name the original's key list gains when one name is put
 * in the borrowed roster.
 *
 * Two calls, differing by one roster member, and the answer is the
 * entry the second list has that the first does not. Read as a
 * POSITION rather than as a set difference, because a probe name
 * that keys to the group's catch-all suffix produces a list with the
 * same entry twice — a set difference reports nothing there, which
 * is the one reading this has to get right.
 *
 * The array is emptied, driven and put back in a `finally`, so a
 * case that fails part-way leaves the module as it found it. What
 * the roster held is never read and never printed.
 *
 * @param origin - The origin module.
 * @param name - The probe name to key.
 * @returns The column name the list gained.
 */
function addedColumn(origin: FeaturesOrigin, name: unknown): string {
  const roster = origin[ORIGIN_ROSTER] as unknown[];
  const saved = [...roster];

  try {
    roster.length = 0;

    const base = originKeys(origin);

    roster.push(name);

    const widened = originKeys(origin);

    if (widened.length !== base.length + 1) {
      throw new RangeError(
        'the origin key list did not gain exactly one column.',
      );
    }

    const parted = base.findIndex((key, index) => key !== widened[index]);
    const gained = widened[parted === -1
      ? base.length
      : parted];

    if (gained === undefined) {
      throw new RangeError('the origin key list gained no readable column.');
    }

    return gained;
  } finally {
    roster.length = 0;
    roster.push(...saved);
  }
}

/**
 * The fixed string the original puts in front of each of that
 * group's column names.
 *
 * A mechanism rather than a name: discovered from the probe whose
 * keyed form is itself, so nothing about the original's own column
 * names is written down.
 *
 * @param origin - The origin module.
 * @returns The prefix.
 */
function originColumnPrefix(origin: FeaturesOrigin): string {
  const column = addedColumn(origin, PREFIX_PROBE);

  if (!column.endsWith(PREFIX_PROBE)) {
    throw new RangeError('the origin column does not end in the probe.');
  }

  return column.slice(0, column.length - PREFIX_PROBE.length);
}

/**
 * The original's key coercion, applied to one name.
 *
 * @param origin - The origin module.
 * @param prefix - What {@link originColumnPrefix} discovered.
 * @param name - Anything at all, including nothing.
 * @returns The keyed form the original produced.
 */
function originKeyOf(
  origin: FeaturesOrigin,
  prefix: string,
  name: unknown,
): string {
  return addedColumn(origin, name).slice(prefix.length);
}

// ---------------------------------------------------------------------------
// Reaching the text coercion: the field and the columns, by what they do
// ---------------------------------------------------------------------------

/** Plain texts of different lengths, none of them a list. */
const LENGTH_PROBES: readonly string[] = ['a', 'ab', 'abcd', 'abcdefghij'];

/** Texts opening a known number of lines as list items. */
const BULLET_PROBES: readonly (readonly [string, number])[] = [
  ['- a', 1],
  ['- a\n- b', 2],
  ['- a\n- b\n- c', 3],
  ['prose', 0],
];

/** How this file reaches the original's text coercion. */
interface TextReach {
  /** The document field carrying the prepared text. */
  readonly field: string;

  /** The column carrying the coerced text's length. */
  readonly length: string;

  /** The column carrying how many lines open as list items. */
  readonly bulletLines: string;
}

/**
 * One record of the original's, as something a column can be read
 * off.
 *
 * @param value - Whatever its extractor answered.
 * @returns Its columns.
 */
function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('the origin extractor answered no record.');
  }

  return value as Record<string, unknown>;
}

/**
 * Every property name the original reads off the document it is
 * handed.
 *
 * A recording proxy in place of the argument: the get trap pushes
 * each name and answers nothing, which is a document that stated
 * nothing and therefore a call that runs to the end. The names exist
 * for the length of a case and reach no tracked file — this is the
 * same discovery the other reparameterized ports here use, and it is
 * what keeps the original's own field names out of this one.
 *
 * Symbol keys answer nothing and are not recorded. Nothing here reads
 * one; the branch exists so a runtime probing an argument with a
 * well-known symbol cannot inject a name into the roster.
 *
 * @param origin - The origin module.
 * @returns The names, in read order, without repeats.
 */
function documentFields(origin: FeaturesOrigin): string[] {
  const seen: string[] = [];
  const recorder = new Proxy({} as Record<string, unknown>, {
    get(_target, property): unknown {
      if (typeof property !== 'symbol') {
        seen.push(property);
      }

      return undefined;
    },
  });

  origin.extractFeatures(recorder, {}, null);

  return [...new Set(seen)];
}

/**
 * The columns of one record whose value is a given number.
 *
 * @param record - The original's record.
 * @param expected - The value a column has to carry.
 * @param exclude - Columns already spoken for.
 * @returns Their names.
 */
function columnsCarrying(
  record: Record<string, unknown>,
  expected: number,
  exclude: ReadonlySet<string>,
): string[] {
  return Object.keys(record).filter(
    (key) => record[key] === expected && !exclude.has(key),
  );
}

/**
 * The one member of a list, refusing any other count.
 *
 * The arity guard every derivation below rests on: a probe that
 * stopped discriminating leaves several candidates, and picking
 * whichever came first would compare something nobody identified.
 *
 * @param found - What a derivation narrowed to.
 * @param what - How a failure should name the role.
 * @returns The single member.
 */
function onlyMember(found: readonly string[], what: string): string {
  const [member] = found;

  if (found.length !== 1 || member === undefined) {
    throw new RangeError(
      `the probes named ${found.length} ${what}, not one.`,
    );
  }

  return member;
}

/**
 * One record of the original's over a document stating one field.
 *
 * @param origin - The origin module.
 * @param field - Which field to state.
 * @param text - What to state in it.
 * @returns The record.
 */
function statingOne(
  origin: FeaturesOrigin,
  field: string,
  text: unknown,
): Record<string, unknown> {
  return recordOf(origin.extractFeatures({ [field]: text }, {}, null));
}

/**
 * How to reach the original's text coercion, derived rather than
 * named.
 *
 * Three derivations, each narrowing to exactly one answer:
 *
 * - THE FIELD is the one whose value moves a column by that value's
 *   own length. Every field the original reads is tried, and only
 *   the prepared text has a column that follows it.
 * - THE LENGTH COLUMN is the one whose value equals the text's own
 *   length across four texts of four lengths.
 * - THE LINE COLUMN is the one whose value equals the number of
 *   list-opening lines across four texts carrying four counts, once
 *   the length column is spoken for.
 *
 * {@link onlyMember} is the guard on all three, which is what says
 * each role was identified rather than guessed at.
 *
 * @param origin - The origin module.
 * @returns The field and both columns.
 */
function textReach(origin: FeaturesOrigin): TextReach {
  const field = onlyMember(
    documentFields(origin).filter((name) => columnsCarrying(
      statingOne(origin, name, 'abcd'),
      4,
      new Set(),
    ).some((key) => statingOne(origin, name, 'ab')[key] === 2)),
    'text fields',
  );
  const spokenFor = new Set<string>();
  let lengths: readonly string[] | null = null;

  for (const text of LENGTH_PROBES) {
    const found = columnsCarrying(
      statingOne(origin, field, text),
      text.length,
      spokenFor,
    );

    lengths = lengths === null
      ? found
      : found.filter((key) => lengths?.includes(key) === true);
  }

  const length = onlyMember(lengths ?? [], 'length columns');

  spokenFor.add(length);

  let lines: readonly string[] | null = null;

  for (const probe of BULLET_PROBES) {
    const found = columnsCarrying(
      statingOne(origin, field, probe[0]),
      probe[1],
      spokenFor,
    );

    lines = lines === null
      ? found
      : found.filter((key) => lines?.includes(key) === true);
  }

  return {
    field,
    length,
    bulletLines: onlyMember(lines ?? [], 'line columns'),
  };
}

/**
 * The two shape signals the original read off one prepared text.
 *
 * @param origin - The origin module.
 * @param reach - What {@link textReach} derived.
 * @param text - What the document carries as prepared text.
 * @returns The length, then the line count.
 */
function originShape(
  origin: FeaturesOrigin,
  reach: TextReach,
  text: unknown,
): readonly unknown[] {
  const record = statingOne(origin, reach.field, text);

  return [record[reach.length], record[reach.bulletLines]];
}

/**
 * The same two signals, read off the port.
 *
 * The port's spec declares nothing, so its record carries the fixed
 * columns alone and the two shape signals are the only readings in
 * it that a text can move.
 *
 * @param text - What the document carries as prepared text.
 * @returns The length, then the line count.
 */
function portShape(text: unknown): readonly unknown[] {
  const record = extractFeatures(
    { text },
    {},
    { terms: [], quantities: [], oneHots: [] },
  );

  return [record.text_length, record.text_bullet_lines];
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

  /** The port side, rendered. */
  readonly port: string;
}

/**
 * Compare two endings and report any difference.
 *
 * The differ compares primitives with {@link Object.is}, which is
 * what makes this the right comparison for a library whose answers
 * are numbers: `-0` and `0` part here, as they should, and two
 * `NaN`s agree — though neither coercion is allowed to produce one.
 *
 * @param over - How a failure should name this input.
 * @param origin - What the original did.
 * @param port - What the port did.
 * @returns One entry when they parted, none when they agreed.
 */
function compareOver(
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
// What both sides are driven over
// ---------------------------------------------------------------------------

/**
 * Values beside the shared corpus that a cell can arrive holding.
 *
 * The shared roster covers absence, the three ways a number can stop
 * being one, and the values a coercion refuses. These are the rest of
 * what a stored column really hands back: booleans, a date, a
 * function, numbers written as text in every shape a parser reads,
 * and magnitudes at the edges of a double.
 */
const CELL_VALUES: readonly unknown[] = [
  0, 1, -1, 7.5, '7', ' 7 ', '7.5', '-3', '0x10', '1e2', '.5', '7.',
  '  ', 'x', '7x', '+', '-', true, false, [5], ['7'], [1, 2],
  new Date(0), new Date(1), () => 7, Number.MIN_VALUE, Number.MAX_VALUE,
  -Number.MAX_VALUE, 1e308, Number.EPSILON,
];

/**
 * Whole arguments that are not records of values at all.
 *
 * The original reads its argument as a record when it is an object
 * and as nothing otherwise, so a falsy argument and a truthy
 * non-object take different routes to the same full-width row of
 * zeros. Both are reachable from a Code node handing this an absent
 * field, and the port has to take the same routes.
 */
const NON_RECORD_ARGUMENTS: readonly unknown[] = [
  undefined, null, 0, -0, '', false, Number.NaN, 'abc', 42, [], [1, 2],
  {}, new Date(0), () => 1, Symbol.iterator, 7n,
];

/**
 * Texts a document can arrive carrying, beside the shared corpus.
 *
 * What the two shape signals actually branch on: an empty text, a
 * text that is only whitespace, every glyph a list item can open
 * with, a numbered item in both spellings, a line ending written
 * both ways, and an item glyph that is not at the head of a line.
 */
const TEXT_VALUES: readonly unknown[] = [
  '', ' ', '\n', '\n\n', 'prose', 'prose\nmore prose',
  '- one', '* one', '+ one', '- one\n- two\n- three',
  '1. one', '2) two', '10. ten', '100. hundred',
  '  - indented', '\t- tabbed', 'not - an item',
  '- one\r\n- two', 'one\r\n\r\ntwo', 'trailing\n',
];

/**
 * Names the key coercion is driven over, beside the shared corpus.
 *
 * The runs and cases a column name can arrive in: mixed case, every
 * separator an operator writes, a leading and trailing run, a name
 * that is only separators, a name made of digits, and the one name a
 * plain object would drop.
 */
const NAME_VALUES: readonly unknown[] = [
  'alpha', 'Alpha', 'ALPHA', 'alpha bravo', 'alpha-bravo', 'alpha.bravo',
  'alpha--bravo', 'alpha   bravo', '  alpha  ', '-alpha-', '---', '_',
  '__proto__', 'constructor', 'toString', 'hasOwnProperty', '12', '1.2',
  'a1', '1a', '', ' ', 'a/b', 'a+b',
];

/** Every adversarial value the shared corpus holds, built fresh. */
function adversarialValues(): unknown[] {
  return ADVERSARIAL_VALUES.map((entry) => entry.build());
}

/**
 * One record keyed by the original's key list, with one value in
 * every cell.
 *
 * @param keys - The original's key list.
 * @param value - What every cell holds.
 * @returns The record both sides are driven over.
 */
function filledRecord(
  keys: readonly string[],
  value: unknown,
): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, value]));
}

/**
 * One record with an ordinary number in every cell but one.
 *
 * Placed per cell rather than only all at once, because a coercion
 * that refused would take the call down at the FIRST cell holding
 * such a value: a port reading its cells in another order would
 * agree over every record where the value sat alone at the end.
 *
 * @param keys - The original's key list.
 * @param value - What the one cell holds.
 * @param slot - Which cell it is.
 * @returns The record both sides are driven over.
 */
function recordWithValueAt(
  keys: readonly string[],
  value: unknown,
  slot: number,
): Record<string, unknown> {
  return Object.fromEntries(keys.map((key, index) => [
    key,
    index === slot
      ? value
      : 1,
  ]));
}

// ---------------------------------------------------------------------------
// The origin the comparisons read
// ---------------------------------------------------------------------------

describePortParity('features — the origin the comparisons read', () => {
  it('exports every entry point this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isFeaturesOrigin(loaded)).toBe(true);
  });

  // The key list is what every comparison below is keyed on, so an
  // empty or unreadable one would make each of them a comparison over
  // nothing that agreed perfectly.
  it('answers a key list of names with something in it', () => {
    const keys = originKeys(originFeatures());

    expect(keys.length).toBeGreaterThan(1);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // The prefix reading's own premise, asserted rather than assumed:
  // the probe used to read the prefix off a column name has to be a
  // name every coercion answers unchanged, or the prefix would carry
  // part of the probe or lose part of itself.
  it('keys the prefix probe to itself on both sides', () => {
    const origin = originFeatures();
    const prefix = originColumnPrefix(origin);

    expect(prefix.length).toBeGreaterThan(0);
    expect(asKey(PREFIX_PROBE)).toBe(PREFIX_PROBE);
    expect(originKeyOf(origin, prefix, PREFIX_PROBE)).toBe(PREFIX_PROBE);
  });

  // Borrowing the roster is a mutation, and this is the case that
  // says it is reversed: the key list before and after a probe is the
  // same list, so nothing a later case reads was moved by an earlier
  // one.
  it('leaves the borrowed roster exactly as it found it', () => {
    const origin = originFeatures();
    const before = originKeys(origin);

    originKeyOf(origin, originColumnPrefix(origin), 'a b');

    expect(originKeys(origin)).toEqual([...before]);
  });

  // The text derivation's arity, which is what says the field and the
  // two columns were identified rather than guessed at.
  // {@link textReach} refuses any count but one at each of the three
  // steps, so reaching an answer at all is most of the reading — and
  // the two columns have to be different columns.
  it('names one text field and two columns, and the two differ', () => {
    const reach = textReach(originFeatures());

    expect(reach.length).not.toBe(reach.bulletLines);
    expect(reach.field.length).toBeGreaterThan(0);
    expect(documentFields(originFeatures())).toContain(reach.field);
  });
});

// ---------------------------------------------------------------------------
// What the comparisons rest on
// ---------------------------------------------------------------------------

describePortParity('features — what the comparisons rest on', () => {
  // The control the outcome wrapper needs, and for this library it is
  // the INVERSE of the one a refusing library needs: two
  // implementations that refuse everything agree perfectly, and so do
  // two that answer everything, so the claim worth making is that the
  // port produces exactly ONE ending over the whole driven set. Read
  // off the PORT, the original being the thing under measurement.
  it('is driven over inputs the port answers every one of', () => {
    const keys = ['a', 'b', 'c'];
    const endings = [
      ...adversarialValues(), ...CELL_VALUES,
    ].map((value) => outcomeOf(
      () => featureVector(filledRecord(keys, value), keys),
    ));

    expect(endings.filter((ending) => ending.refused)).toEqual([]);
    expect(endings.length).toBeGreaterThan(CELL_VALUES.length);
  });

  // And the other half of that control: a set every member of which
  // coerced to zero would agree for a port that answered zero for
  // everything. The driven values have to reach real numbers, a
  // negative zero and the fold-to-zero branch, all three.
  it('is driven over values reaching more than one reading', () => {
    const row = CELL_VALUES.map(
      (value) => featureVector({ a: value }, ['a'])[0],
    );

    expect(row.some((value) => value !== 0 && Number.isFinite(value)))
      .toBe(true);
    expect(row.some((value) => value === 0)).toBe(true);
    expect(row.every((value) => Number.isFinite(value))).toBe(true);
  });

  // The shared corpus this file does not own, held to the members
  // whose reading here is distinct: the two spellings of absence, a
  // value a number coercion throws on, a value whose own conversion
  // refuses, a measured negative zero, and a number that is not one.
  it('is driven over adversarial values reaching every branch', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('null');
    expect(ids).toContain('undefined');
    expect(ids).toContain('symbol');
    expect(ids).toContain('hostile-string-conversion');
    expect(ids).toContain('negative-zero');
    expect(ids).toContain('not-a-number');
  });

  // The text corpus needs the same guard from the other direction:
  // texts that are all empty would agree for a port measuring
  // nothing, so the driven set has to move both shape signals.
  it('is driven over texts moving both shape signals', () => {
    const shapes = TEXT_VALUES.map((text) => portShape(text));

    expect(shapes.some((shape) => shape[0] !== 0)).toBe(true);
    expect(shapes.some((shape) => shape[1] !== 0)).toBe(true);
    expect(shapes.some((shape) => shape[1] === 0)).toBe(true);
  });

  // And the name corpus: a set of names none of which the coercion
  // CHANGED would agree for a port that answered its input, so the
  // driven set has to carry names it changes and names it leaves
  // alone.
  it('is driven over names the key coercion changes and does not', () => {
    const keyed = NAME_VALUES.map((name) => [name, asKey(name)] as const);

    expect(keyed.some(([name, key]) => name !== key)).toBe(true);
    expect(keyed.some(([name, key]) => name === key)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The number coercion, through the vector builder
// ---------------------------------------------------------------------------

describePortParity('features — the number coercion, over every cell', () => {
  // One case over the whole sweep rather than one per record. A
  // divergence here is a difference in how one kind of value is
  // coerced, and the SET of records that moved together is the
  // reading a failure needs.
  it('agrees over every adversarial value in every cell', () => {
    const origin = originFeatures();
    const keys = originKeys(origin);
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => keys.flatMap(
      (_key, slot) => compareOver(
        `${entry.id} at ${slot}`,
        outcomeOf(() => origin.featureVector(
          recordWithValueAt(keys, entry.build(), slot),
        )),
        outcomeOf(() => featureVector(
          recordWithValueAt(keys, entry.build(), slot),
          keys,
        )),
      ),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every adversarial value in all cells at once', () => {
    const origin = originFeatures();
    const keys = originKeys(origin);
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => compareOver(
      `${entry.id} throughout`,
      outcomeOf(() => origin.featureVector(filledRecord(keys, entry.build()))),
      outcomeOf(() => featureVector(filledRecord(keys, entry.build()), keys)),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every ordinary cell value in every cell', () => {
    const origin = originFeatures();
    const keys = originKeys(origin);
    const apart = CELL_VALUES.flatMap((value, index) => keys.flatMap(
      (_key, slot) => compareOver(
        `cell ${index} at ${slot}`,
        outcomeOf(() => origin.featureVector(
          recordWithValueAt(keys, value, slot),
        )),
        outcomeOf(() => featureVector(
          recordWithValueAt(keys, value, slot),
          keys,
        )),
      ),
    ));

    expect(apart).toEqual([]);
  });

  // The guard in front of the builder is the only thing standing
  // between a Code node's absent field and a read off nothing, and it
  // is the one part a type annotation makes invisible: the compiler
  // will never let a caller here reach it, and the spliced copy runs
  // where no type was ever checked.
  it('agrees over every argument that is not a record', () => {
    const origin = originFeatures();
    const keys = originKeys(origin);
    const apart = NON_RECORD_ARGUMENTS.flatMap((argument, index) => compareOver(
      `non-record ${index}`,
      outcomeOf(() => origin.featureVector(argument)),
      outcomeOf(() => featureVector(argument, keys)),
    ));

    expect(apart).toEqual([]);
  });

  // A record missing keys entirely, which is what a stored vector
  // computed under an older layout looks like when it is rebuilt
  // against the current key list: every absent cell reads zero rather
  // than leaving the row ragged.
  it('agrees over a record carrying none of the keys', () => {
    const origin = originFeatures();
    const keys = originKeys(origin);
    const partial: readonly unknown[] = [
      {}, { nothing: 1 }, Object.create(null) as unknown,
    ];
    const apart = partial.flatMap((record, index) => compareOver(
      `partial ${index}`,
      outcomeOf(() => origin.featureVector(record)),
      outcomeOf(() => featureVector(record, keys)),
    ));

    expect(apart).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The text coercion, through the shape signals
// ---------------------------------------------------------------------------

describePortParity('features — the text coercion, over every text', () => {
  it('agrees over every text a document can carry', () => {
    const origin = originFeatures();
    const reach = textReach(origin);
    const apart = TEXT_VALUES.flatMap((text, index) => compareOver(
      `text ${index}`,
      outcomeOf(() => originShape(origin, reach, text)),
      outcomeOf(() => portShape(text)),
    ));

    expect(apart).toEqual([]);
  });

  // The refusals, which are where a text coercion is most likely to
  // part: a value whose own conversion throws, a symbol, and a cycle
  // are three different reasons a render can fail and all three have
  // to answer rather than raise on both sides.
  it('agrees over every adversarial value as the prepared text', () => {
    const origin = originFeatures();
    const reach = textReach(origin);
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => compareOver(
      `text ${entry.id}`,
      outcomeOf(() => originShape(origin, reach, entry.build())),
      outcomeOf(() => portShape(entry.build())),
    ));

    expect(apart).toEqual([]);
  });

  // Values that are not text at all, which a stored column really
  // hands back when it holds a number or a list.
  it('agrees over every cell value as the prepared text', () => {
    const origin = originFeatures();
    const reach = textReach(origin);
    const apart = CELL_VALUES.flatMap((value, index) => compareOver(
      `text cell ${index}`,
      outcomeOf(() => originShape(origin, reach, value)),
      outcomeOf(() => portShape(value)),
    ));

    expect(apart).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The key coercion, through the borrowed roster
// ---------------------------------------------------------------------------

describePortParity('features — the key coercion, over every name', () => {
  it('agrees over every name a column can be given', () => {
    const origin = originFeatures();
    const prefix = originColumnPrefix(origin);
    const apart = NAME_VALUES.flatMap((name, index) => compareOver(
      `name ${index}`,
      outcomeOf(() => originKeyOf(origin, prefix, name)),
      outcomeOf(() => asKey(name)),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every adversarial value as a column name', () => {
    const origin = originFeatures();
    const prefix = originColumnPrefix(origin);
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => compareOver(
      `name ${entry.id}`,
      outcomeOf(() => originKeyOf(origin, prefix, entry.build())),
      outcomeOf(() => asKey(entry.build())),
    ));

    expect(apart).toEqual([]);
  });

  // The reading the port's own header rests on, held against the
  // ORIGINAL rather than against the port's argument about itself: a
  // run of non-alphanumeric characters collapses to ONE underscore on
  // both sides, so the doubled underscore `__proto__` needs is
  // unreachable from either — which is why the original's plain
  // record was preserved rather than repaired.
  it('collapses every run to one underscore on both sides', () => {
    const origin = originFeatures();
    const prefix = originColumnPrefix(origin);
    const runs = ['__proto__', 'a--b', 'a   b', 'a-_-b', '---'];
    const keyed = runs.map((name) => originKeyOf(origin, prefix, name));

    expect(keyed).toEqual(runs.map((name) => asKey(name)));
    expect(keyed.filter((key) => key.includes('__'))).toEqual([]);
  });
});
