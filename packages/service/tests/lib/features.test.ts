/**
 * Cases for `src/lib/features.ts`: the version pins first, then the
 * coercions on their own, then the layout, and only then a record.
 *
 * That order is the file's argument rather than its layout. This
 * module's whole product is a row of numbers whose MEANING lives
 * somewhere else — in the key list a column's position indexes, and
 * in the domain term set most of those columns are derived from. A
 * suite opening with a computed record would check the arithmetic
 * and say nothing about the two things that make the arithmetic
 * mean anything, both of which move without a line of this module
 * changing.
 *
 * ## Where this file stops and the parity suite starts
 *
 * The parity leg is KERNEL and it is bounded by the ORIGINAL's
 * export surface: the original exports none of its three coercions,
 * so `tests/parity/features.parity.test.ts` reaches them only
 * COMPOSITIONALLY, through the entry points that run them. A pair of
 * errors cancelling between a coercion and the walk agrees there.
 * Each coercion is therefore driven on its own here.
 *
 * Everything about the port that the original has no parameter for
 * has no comparison available at all, and these cases are the whole
 * record of it: a derived column set, a key list that is a function
 * of a spec, a known flag beside a quantity, a catch-all emitted
 * ahead of its members, and the collisions that ordering decides.
 *
 * ## The two digests, and why one is not enough
 *
 * {@link FEATURE_MECHANISM_VERSION} pins two inputs and the cases
 * below take a digest over each, because neither digest can see what
 * the other one does.
 *
 * THE KEY LIST moves when this module's layout moves — a column
 * added, renamed, reordered or redefined — and also when the spec
 * gains or loses a category, a quantity or a one-hot member. What it
 * CANNOT see is a term re-filed from one existing category to
 * another existing one: both columns still exist, the list is
 * byte-identical, and every stored vector now counts different
 * things in them.
 *
 * THE TERM SET is what sees that. It digests the pattern beside the
 * category, so a re-filing moves it while the key list holds still.
 * One case below drives exactly that pair, so the claim that the two
 * digests are not redundant is measured rather than asserted.
 *
 * Each pin names the bump its drift calls for, and they are
 * different bumps: a moved key list is the MECHANISM's version, the
 * constant in `src/lib/features.ts`; a moved term set is a DOMAIN's
 * `domains.feature_version`, and every vector stored under the old
 * one is stale. Re-recording a digest without making that decision
 * is the failure these cases exist to make loud.
 *
 * ## The spec the cases are driven against
 *
 * {@link NEUTRAL_SPEC} is authored here and is not the original's.
 * Its categories, quantities and one-hot members are placeholder
 * words, because what a domain measures is the domain's business and
 * none of this module's. What it does carry is the SPREAD the layout
 * has to survive: two categories that key alike, a category named
 * with digits, a category and a one-hot member that collide with
 * their group's catch-all, a term stating no pattern, a pattern
 * filed twice, and a member roster with a duplicate in it. A spec
 * where every entry looked alike would pin a layout with no
 * branches in it.
 */
import type {
  FeatureOneHot,
  FeatureReading,
  FeatureSpec,
  FeatureTerm,
} from '../../src/lib/features.js';

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  FEATURE_COLUMN_KINDS,
  FEATURE_MECHANISM_VERSION,
  asKey,
  asNumber,
  asText,
  extractFeatures,
  featureCategories,
  featureColumns,
  featureKeys,
  featureVector,
  measuredNumber,
} from '../../src/lib/features.js';

// ---------------------------------------------------------------------------
// The neutral spec the pins are taken over
// ---------------------------------------------------------------------------

/**
 * The domain term set every case below is driven over.
 *
 * Neutral by construction: not one of these patterns is a term any
 * domain would look for, and not one of these category names says
 * anything about a subject. What the set covers is the spread:
 *
 * - two names that KEY ALIKE (`signal-one` and `Signal One`), which
 *   is one column fed by terms written two ways;
 * - a name made of DIGITS, which is the key-order trap the group
 *   prefixes exist for;
 * - a name that COLLIDES with its group's catch-all, which loses its
 *   own column and has its hits counted in the catch-all instead;
 * - a term stating NO PATTERN, whose category still gets a column
 *   that nothing can ever count into;
 * - a pattern already filed under an earlier category, which the
 *   attribution resolves first-occurrence-wins.
 */
const NEUTRAL_TERMS: readonly FeatureTerm[] = [
  { pattern: 'alpha', category: 'signal-one' },
  { pattern: 'bravo charlie', category: 'signal-one' },
  { pattern: 'delta', category: 'signal-two' },
  { pattern: 'echo|foxtrot', category: 'signal-two' },
  { pattern: 'golf', category: 'signal-three' },
  { pattern: '', category: 'signal-four' },
  { pattern: 'hotel', category: 'Signal One' },
  { pattern: 'alpha', category: 'signal-two' },
  { pattern: 'india', category: '12' },
  { pattern: 'juliett', category: 'other' },
];

/**
 * The quantities the spec declares, each producing a value column
 * and a known flag beside it.
 *
 * Two of them are written the two ways an operator writes one name,
 * and they key APART rather than together — which is what makes the
 * collision cases below about collision rather than about spelling.
 */
const NEUTRAL_QUANTITIES: readonly string[] = [
  'reading-one',
  'reading two',
  'count',
];

/**
 * The one-hot groups the spec declares.
 *
 * `shape` carries a duplicate member, so the deduplication has
 * something to do; `band` carries a member named for its own
 * catch-all, so the collision has something to lose.
 */
const NEUTRAL_ONE_HOTS: readonly FeatureOneHot[] = [
  { key: 'shape', members: ['round', 'square', 'round'] },
  { key: 'band', members: ['other', 'upper', 'lower'] },
];

/** The whole layout the digests below are recorded over. */
const NEUTRAL_SPEC: FeatureSpec = {
  terms: NEUTRAL_TERMS,
  quantities: NEUTRAL_QUANTITIES,
  oneHots: NEUTRAL_ONE_HOTS,
};

// ---------------------------------------------------------------------------
// The version, and the two digests it is pinned against
// ---------------------------------------------------------------------------

/**
 * The version the digests below were recorded under.
 *
 * Held against the module's own constant in a case of its own, so
 * bumping the version without revisiting what the bump was FOR fails
 * here rather than passing quietly.
 */
const PINNED_VERSION = 1;

/**
 * One input the version pins, as a digest and the bump its drift
 * calls for.
 */
interface VersionPin {
  /** Which input this is, as a failure names it. */
  readonly id: string;

  /** The digest recorded under {@link PINNED_VERSION}. */
  readonly digest: string;

  /** What a reader has to bump, and what goes stale if they do not. */
  readonly bump: string;

  /**
   * The text digested, taken fresh.
   *
   * @returns The canonical form of this input.
   */
  readonly take: () => string;
}

/**
 * A text's digest, as the pins record it.
 *
 * `node:crypto` rather than the module's own hash: this file is a
 * test and imports whatever it likes, where a spliced library has
 * nothing to resolve an import on. The reading wanted here is
 * collision resistance over two short texts and not speed.
 *
 * @param text - The canonical form of an input.
 * @returns Its digest, in hex.
 */
function digestOf(text: string): string {
  const hash = createHash('sha256').update(text, 'utf8');

  return hash.digest('hex');
}

/**
 * The key list as one text: one column per line, in column order.
 *
 * Line-separated rather than serialized, so a diff of two failing
 * runs reads as the columns that moved.
 *
 * @param spec - The layout to take the list off.
 * @returns The canonical form.
 */
function keyListText(spec: FeatureSpec): string {
  return featureKeys(spec).join('\n');
}

/**
 * The term set as one text: one term per line, category first.
 *
 * Category first because a re-filing is what this digest exists to
 * see, and the separator is a tab because neither field may hold
 * one — a category or a pattern carrying a tab would otherwise be
 * indistinguishable from two fields.
 *
 * @param terms - The term set to render.
 * @returns The canonical form.
 */
function termSetText(terms: readonly FeatureTerm[]): string {
  return terms.map((term) => `${term.category}\t${term.pattern}`).join('\n');
}

/**
 * Both inputs {@link FEATURE_MECHANISM_VERSION} pins.
 *
 * A drift in either fails the case below naming this entry's `bump`,
 * which is the whole point of recording them separately: the two
 * drifts are different events with different consequences and only
 * one of them is this module's to fix.
 */
const VERSION_PINS: readonly VersionPin[] = [
  {
    id: 'key-list',
    digest:
      '2d2710db02e810a159a0d903b2ad8a04460c396adff32bc93002a6045c41cefe',
    bump: 'FEATURE_MECHANISM_VERSION in src/lib/features.ts, because a '
      + 'column moved and every stored vector now indexes something else',
    take: () => keyListText(NEUTRAL_SPEC),
  },
  {
    id: 'term-set',
    digest:
      '9d6cf3a29a52bfdaf4544af4587549fa73dff59392f873c3d053174c34c8d21f',
    bump: 'domains.feature_version for the domain, because a term moved '
      + 'and every vector stored under the old one counts something else',
    take: () => termSetText(NEUTRAL_TERMS),
  },
];

/** One pin whose recorded digest no longer matches what it takes. */
interface PinDrift {
  /** Which input drifted. */
  readonly id: string;

  /** What the reader has to bump. */
  readonly bump: string;

  /** The digest recorded here. */
  readonly recorded: string;

  /** The digest the input takes now. */
  readonly found: string;
}

/**
 * Every pin that no longer matches, with its bump.
 *
 * Collected rather than asserted one at a time so a failure names
 * BOTH inputs when both moved — a change that reorganizes the term
 * set moves the key list with it, and reading only the first would
 * send a reader after half of it.
 *
 * @returns One entry per drifted pin, none when both hold.
 */
function pinDrifts(): PinDrift[] {
  return VERSION_PINS.flatMap((pin) => {
    const found = digestOf(pin.take());

    return found === pin.digest
      ? []
      : [{ id: pin.id, bump: pin.bump, recorded: pin.digest, found }];
  });
}

// ---------------------------------------------------------------------------
// Values a coercion has to survive
// ---------------------------------------------------------------------------

/**
 * A value whose own conversion refuses, in both directions.
 *
 * Installed with {@link Object.defineProperty} rather than written
 * as an object literal, because a literal method is an own
 * ENUMERABLE key and this value has to be indistinguishable from an
 * ordinary reading until something tries to read it.
 *
 * Both hooks refuse, and both are needed: a number coercion consults
 * `valueOf` first and would otherwise fall through to a `toString`
 * that worked.
 *
 * @returns A fresh one, since a case may leave it in a reading.
 */
function hostileValue(): object {
  const value = {};
  const refuse = (): never => {
    throw new Error('this value refuses every conversion');
  };

  Object.defineProperty(value, 'valueOf', { value: refuse });
  Object.defineProperty(value, 'toString', { value: refuse });

  return value;
}

/**
 * A reading of the shape {@link extractFeatures} expects, with only
 * the members a case cares about filled in.
 *
 * Every member of a reading is optional, so this is a convenience
 * rather than a defaulting layer: what it saves is repeating the two
 * empty records at every call site.
 *
 * @param parts - Whichever members the case states.
 * @returns A reading.
 */
function readingOf(parts: Partial<FeatureReading>): FeatureReading {
  return { text: '', quantities: {}, stated: {}, ...parts };
}

// ---------------------------------------------------------------------------
// The version and its two pins
// ---------------------------------------------------------------------------

describe('FEATURE_MECHANISM_VERSION — the two inputs it pins', () => {
  // The version half. A bump with no re-recording lands here, which
  // is where a reader is asked what the bump was for; a re-recording
  // with no bump lands in the case below it.
  it('is the version the digests here were recorded under', () => {
    expect(FEATURE_MECHANISM_VERSION).toBe(PINNED_VERSION);
  });

  // The headline case. A drift in either input fails naming the bump
  // it calls for, and both are reported when both moved — a change
  // that reorganizes the term set moves the key list with it, and a
  // reader sent after only the first would fix half of it.
  it('agrees with the digest recorded for each input it pins', () => {
    expect(pinDrifts()).toEqual([]);
  });

  // The digests' own liveness control, and it is not optional: a
  // digest that answered one constant string would pass the case
  // above forever. Both kinds of drift the key list exists to catch
  // have to move it — a column reordered and a column renamed — and
  // the same list taken twice has to hold still.
  it('digests a reordered and a renamed key list apart', () => {
    const keys = featureKeys(NEUTRAL_SPEC);
    const text = keys.join('\n');
    const reordered = [...keys].reverse();
    const renamed = text.replace('text_length', 'text_size');

    expect(digestOf(text)).toBe(digestOf(text));
    expect(digestOf(reordered.join('\n'))).not.toBe(digestOf(text));
    expect(digestOf(renamed)).not.toBe(digestOf(text));
    expect(renamed).not.toBe(text);
  });

  // The non-vacuity guard the pins need. A digest over an empty text
  // is perfectly stable and says nothing, so the digested texts have
  // to be shown to carry every group the layout has — one derived
  // category column, a quantity with its known flag, both catch-alls
  // and the two shape columns.
  it('digests texts carrying every group of the layout', () => {
    const keyText = keyListText(NEUTRAL_SPEC);
    const termText = termSetText(NEUTRAL_TERMS);

    expect(keyText.split('\n')).toHaveLength(
      featureKeys(NEUTRAL_SPEC).length,
    );
    expect(keyText).toContain('category_signal_one');
    expect(keyText).toContain('category_other');
    expect(keyText).toContain('quantity_count_known');
    expect(keyText).toContain('stated_band_other');
    expect(keyText).toContain('text_bullet_lines');
    expect(termText.split('\n')).toHaveLength(NEUTRAL_TERMS.length);
    expect(termText).toContain('signal-one\talpha');
    expect(termText).toContain('other\tjuliett');
  });

  // What makes the two pins a pair rather than one pin recorded
  // twice, measured rather than argued. A term moved between two
  // categories that BOTH still exist leaves the key list
  // byte-identical while every stored vector starts counting a
  // different thing, and only the term-set digest sees it.
  it('sees a re-filed term in the term set and not in the key list', () => {
    const refiled = NEUTRAL_TERMS.map((term) => (term.pattern === 'delta'
      ? { pattern: term.pattern, category: 'signal-three' }
      : term));
    const moved: FeatureSpec = { ...NEUTRAL_SPEC, terms: refiled };

    expect(keyListText(moved)).toBe(keyListText(NEUTRAL_SPEC));
    expect(termSetText(refiled)).not.toBe(termSetText(NEUTRAL_TERMS));
  });

  // And the other direction, so neither pin is the one that catches
  // everything: a category the term set did not have adds a column,
  // which the key list sees. Both pins move here, which is the
  // healthy shape for a taxonomy change.
  it('sees a new category in both the key list and the term set', () => {
    const widened: readonly FeatureTerm[] = [
      ...NEUTRAL_TERMS,
      { pattern: 'kilo', category: 'signal-five' },
    ];
    const grown: FeatureSpec = { ...NEUTRAL_SPEC, terms: widened };

    expect(keyListText(grown)).not.toBe(keyListText(NEUTRAL_SPEC));
    expect(termSetText(widened)).not.toBe(termSetText(NEUTRAL_TERMS));
  });
});

// ---------------------------------------------------------------------------
// The coercions, on their own
// ---------------------------------------------------------------------------

describe('asText — anything unreadable is absent text', () => {
  it('answers the empty string for both spellings of absence', () => {
    expect(asText(null)).toBe('');
    expect(asText(undefined)).toBe('');
  });

  // Never throws, and this is the case that says so. A featurizer
  // walking a corpus must not die on one row, so the coercion
  // refuses instead — unreadable text is ABSENT text, which the
  // record can represent and a raised error cannot.
  it('answers rather than raising for a value that refuses', () => {
    expect(asText(hostileValue())).toBe('');
  });

  // The input that LOOKS as though it should raise and does not.
  // `String` called as a function is special-cased for a symbol
  // where a template or a `+ ''` refuses, so this is one readable
  // value rather than the second refusal a reader would predict.
  it('reads a symbol as its description rather than refusing', () => {
    expect(asText(Symbol('a reading'))).toBe('Symbol(a reading)');
  });

  it('renders everything else the way String does', () => {
    const rendered: readonly [unknown, string][] = [
      [0, '0'],
      [-0, '0'],
      [7.5, '7.5'],
      ['', ''],
      [true, 'true'],
      [[1, 2], '1,2'],
      [[], ''],
      [9007199254740993n, '9007199254740993'],
    ];

    expect(rendered.map(([value]) => asText(value)))
      .toEqual(rendered.map(([, text]) => text));
  });
});

describe('asNumber — one exit, and it is always finite', () => {
  // Absence folds into zero here, which is the whole reason the
  // known flags exist: neither answer can say that nothing was
  // measured, so something else has to.
  it('answers zero for absence and for anything unreadable', () => {
    const nothing: readonly unknown[] = [
      null, undefined, '', 'x', '7x', Number.NaN, 'NaN',
      Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 'Infinity',
      {}, [1, 2], () => 7,
    ];

    expect(nothing.map((value) => asNumber(value)))
      .toEqual(nothing.map(() => 0));
  });

  // The two refusals the language raises, both answered rather than
  // propagated. `Number` throws on a symbol and on a value whose own
  // conversion refuses, and a spliced library that let either out
  // would take a whole run down over one row.
  it('answers zero rather than raising for a value that refuses', () => {
    expect(asNumber(Symbol('a measurement'))).toBe(0);
    expect(asNumber(hostileValue())).toBe(0);
  });

  it('answers the number when there is one', () => {
    expect(asNumber(7)).toBe(7);
    expect(asNumber('7')).toBe(7);
    expect(asNumber(' 7 ')).toBe(7);
    expect(asNumber('1e2')).toBe(100);
    expect(asNumber(true)).toBe(1);
  });

  // A negative zero survives, which matters because it does not
  // survive `===` and because the parity differ compares primitives
  // with `Object.is` — a port folding it into zero would part there.
  it('keeps a negative zero apart from a zero', () => {
    expect(Object.is(asNumber(-0), -0)).toBe(true);
    expect(Object.is(asNumber('-0'), -0)).toBe(true);
    expect(Object.is(asNumber(0), -0)).toBe(false);
  });
});

describe('measuredNumber — where absence and zero part', () => {
  // The three spellings of nothing was measured: a column never
  // written, a key that is not there, and the empty cell a delimited
  // export arrives with. One answer, and it is not zero.
  it('answers null for every spelling of absence', () => {
    expect(measuredNumber(null)).toBeNull();
    expect(measuredNumber(undefined)).toBeNull();
    expect(measuredNumber('')).toBeNull();
  });

  it('answers null for anything that carries no measurement', () => {
    const unreadable: readonly unknown[] = [
      'x', '+', {}, [1, 2], Number.NaN, Number.POSITIVE_INFINITY,
      Symbol('a measurement'), hostileValue(),
    ];

    expect(unreadable.map((value) => measuredNumber(value)))
      .toEqual(unreadable.map(() => null));
  });

  // The line nobody chose, and the single place this module is most
  // likely to be tidied into something else. `Number(' ')` is `0`,
  // so a cell holding one space is a MEASUREMENT of nothing while
  // the exactly empty cell is absence. Trimming first would move
  // every quantity this module records, and the parity gate that
  // decides whether the port landed would fail.
  it('reads whitespace as a measured zero, where empty is absence', () => {
    expect(measuredNumber('')).toBeNull();
    expect(measuredNumber(' ')).toBe(0);
    expect(measuredNumber('\t\n')).toBe(0);
  });

  it('reads the numeric strings a driver returns', () => {
    expect(measuredNumber('7')).toBe(7);
    expect(measuredNumber(' 7 ')).toBe(7);
    expect(measuredNumber('7.5')).toBe(7.5);
    expect(measuredNumber('-3')).toBe(-3);
  });

  it('answers a measured zero as zero', () => {
    expect(measuredNumber(0)).toBe(0);
    expect(measuredNumber('0')).toBe(0);
    expect(measuredNumber(false)).toBe(0);
  });
});

describe('asKey — the column name, and the key it cannot produce', () => {
  it('lowers, keeps alphanumerics and collapses every other run', () => {
    expect(asKey('Signal One')).toBe('signal_one');
    expect(asKey('signal-one')).toBe('signal_one');
    expect(asKey('a.b')).toBe('a_b');
    expect(asKey(12)).toBe('12');
  });

  // Every run collapses to ONE underscore whatever its length, and
  // that is what makes the record safe as a plain object rather than
  // lucky: `__proto__` needs a doubled underscore, and no keyed name
  // can carry one. The last two assertions are the control — the
  // rule is about runs, not about that one name.
  it('cannot produce the one key a plain object would drop', () => {
    expect(asKey('__proto__')).toBe('_proto_');
    expect(asKey('  proto  ')).toBe('_proto_');
    expect(asKey('a--b')).toBe('a_b');
    expect(asKey('a   b')).toBe('a_b');
    expect(asKey('---')).toBe('_');
  });

  // Two distinct names becoming one column is a real reading and not
  // a fault, and this is where it starts: the collision cases in the
  // layout below are this coercion seen from the other end.
  it('keys two names written differently to one column name', () => {
    expect(asKey('a-b')).toBe(asKey('a b'));
  });

  it('answers the empty string for anything unreadable', () => {
    expect(asKey(null)).toBe('');
    expect(asKey(undefined)).toBe('');
    expect(asKey(hostileValue())).toBe('');
  });
});

/**
 * One column of a record, refusing a column that is not there.
 *
 * `noUncheckedIndexedAccess` types every read out of a record as
 * possibly absent, and folding that into a zero would let a case
 * comparing a pair of numbers pass over a column the layout stopped
 * emitting. This refuses instead, naming the column.
 *
 * @param record - Whatever the extractor answered.
 * @param key - The column to read.
 * @returns Its value.
 */
function columnOf(record: Record<string, number>, key: string): number {
  const value = record[key];

  if (value === undefined) {
    throw new RangeError(`the record carries no ${key} column.`);
  }

  return value;
}

// ---------------------------------------------------------------------------
// The layout: what columns exist, and in what order
// ---------------------------------------------------------------------------

describe('featureCategories — the derived half of the layout', () => {
  // Sorted and deduplicated HERE rather than taken in the order it
  // arrived. Terms are rows a query returned in no particular order,
  // so a roster that kept its arrival order would let a caller move a
  // column by reordering a result set — and a column that can move
  // for that reason is not a column a version can pin.
  it('answers the keyed names, unique and in ascending order', () => {
    expect(featureCategories(NEUTRAL_TERMS)).toEqual([
      '12', 'other', 'signal_four', 'signal_one', 'signal_three',
      'signal_two',
    ]);
  });

  // The same set handed over in another order answers the same list,
  // which is the claim above from the other side.
  it('answers the same list whatever order the rows arrived in', () => {
    const shuffled = [...NEUTRAL_TERMS].reverse();

    expect(featureCategories(shuffled))
      .toEqual(featureCategories(NEUTRAL_TERMS));
  });

  // A category whose only term states no pattern still gets a column
  // that nothing can ever count into. Deliberate: the layout is a
  // fact about the taxonomy, so repairing the pattern later fixes the
  // counting without moving one column.
  it('gives a column to a category no pattern can reach', () => {
    expect(featureCategories(NEUTRAL_TERMS)).toContain('signal_four');
  });
});

describe('featureColumns — the order, and what collides in it', () => {
  // The key list and the record are one declaration read twice, and
  // this is the declaration. Every kind the walk switches on has to
  // be a member of the published inventory, or a column exists that
  // nothing knows how to value.
  it('emits every kind the published inventory names, and no other', () => {
    const kinds = new Set(featureColumns(NEUTRAL_SPEC).map(
      (column) => column.kind,
    ));

    expect([...kinds].sort()).toEqual([...FEATURE_COLUMN_KINDS].sort());
  });

  // The one ordering choice that carries behaviour rather than taste.
  // A catch-all ahead of its members is what stops a collision losing
  // a reading altogether: the colliding member loses its own column,
  // and because membership is tested against the columns PLANNED, its
  // values are counted in the catch-all instead of vanishing.
  it('emits each catch-all ahead of the members of its group', () => {
    const keys = featureKeys(NEUTRAL_SPEC);
    const at = (key: string): number => keys.indexOf(key);

    expect(at('category_other')).toBeGreaterThan(-1);
    expect(at('category_other')).toBeLessThan(at('category_signal_one'));
    expect(at('stated_shape_other')).toBeLessThan(at('stated_shape_round'));
    expect(at('stated_band_other')).toBeLessThan(at('stated_band_upper'));
  });

  // A collision drops a column, first occurrence wins, and nothing is
  // refused — a spliced library that threw over a spec it disliked
  // would take a whole run down. The layout is one column shorter,
  // both digests move, and that is the artifact that reports it.
  it('drops a member whose keyed name is already taken', () => {
    const categories = featureCategories(NEUTRAL_TERMS);
    const counted = featureColumns(NEUTRAL_SPEC).filter(
      (column) => column.kind === 'category-count',
    );

    expect(categories).toContain('other');
    expect(counted).toHaveLength(categories.length - 1);
    expect(counted.map((column) => column.member)).not.toContain('other');
    expect(featureKeys(NEUTRAL_SPEC)).not.toContain('stated_band_other_other');
  });

  // Two names an operator wrote two ways are one column, and the
  // count says so: six categories name five member columns plus the
  // catch-all they collided with, and `signal-one` and `Signal One`
  // are the pair behind the missing sixth.
  it('gives two names that key alike one column between them', () => {
    const written = new Set(NEUTRAL_TERMS.map((term) => term.category));

    expect(written.has('signal-one')).toBe(true);
    expect(written.has('Signal One')).toBe(true);
    expect(featureCategories(NEUTRAL_TERMS).filter(
      (category) => category === 'signal_one',
    )).toHaveLength(1);
  });

  // The key list is exactly the layout's keys, taken from the same
  // walk. Asserted directly because everything below rests on it.
  it('is the same list the key list is read off', () => {
    expect(featureKeys(NEUTRAL_SPEC)).toEqual(
      featureColumns(NEUTRAL_SPEC).map((column) => column.key),
    );
  });

  // A spec stating nothing still has a layout: the fixed columns are
  // the mechanism's own, and they are what a domain with no taxonomy
  // yet still produces a full-width row from.
  it('emits the fixed columns for a spec that declares nothing', () => {
    expect(featureKeys({ terms: [], quantities: [], oneHots: [] })).toEqual([
      'gate_score', 'category_other', 'text_length', 'text_bullet_lines',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('extractFeatures — the same input, the same record', () => {
  /** The reading every determinism case is driven over. */
  const reading = readingOf({
    text: '- one\n- two\nprose',
    quantities: { 'reading-one': 7, 'reading two': '', count: 0 },
    stated: { shape: 'round', band: ['upper', 'other', 'unnamed'] },
  });

  /** The gate result beside it. */
  const gate = {
    score: 4.5,
    hits: [
      { pattern: 'alpha' }, { pattern: 'alpha' }, { pattern: 'juliett' },
      { pattern: 'india' }, { pattern: 'unseen' }, { pattern: 'hotel' },
    ],
  };

  // The headline determinism reading, and it is byte for byte rather
  // than member by member: a serialization writes keys in enumeration
  // order, so two records that agree on every value and disagree on
  // ORDER produce different text here and pass a `toEqual`.
  it('answers byte for byte the same record twice', () => {
    const first = extractFeatures(reading, gate, NEUTRAL_SPEC);
    const second = extractFeatures(reading, gate, NEUTRAL_SPEC);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(Object.keys(first)).toEqual(Object.keys(second));
  });

  // The record's key order IS the key list, which is what makes a
  // column's position mean the same thing in a stored vector and in a
  // trainer's matrix. Ordered comparison, not set comparison.
  it('writes its keys in exactly the key list order', () => {
    const record = extractFeatures(reading, gate, NEUTRAL_SPEC);

    expect(Object.keys(record)).toEqual([...featureKeys(NEUTRAL_SPEC)]);
  });

  /**
   * The same spec with every roster handed over backwards.
   *
   * @param terms - Which term set to reverse.
   * @returns The reordered spec.
   */
  function reversedSpec(terms: readonly FeatureTerm[]): FeatureSpec {
    return {
      terms: [...terms].reverse(),
      quantities: NEUTRAL_QUANTITIES,
      oneHots: NEUTRAL_ONE_HOTS.map((group) => ({
        key: group.key,
        members: [...group.members].reverse(),
      })),
    };
  }

  // The property that makes the LAYOUT belong to the content rather
  // than to the delivery: every roster is sorted and deduplicated on
  // the way in, so a query returning rows in no particular order
  // cannot move a column. Key order alone, because the values have a
  // narrower guarantee and the case below it is where that is said.
  it('writes the same key order for a spec that arrived reordered', () => {
    const record = extractFeatures(reading, gate, NEUTRAL_SPEC);
    const reordered = extractFeatures(
      reading,
      gate,
      reversedSpec(NEUTRAL_TERMS),
    );

    expect(Object.keys(reordered)).toEqual(Object.keys(record));
  });

  // The VALUES are order-independent too, and the qualification is
  // exact rather than defensive: a term set carrying no pattern under
  // two categories answers byte for byte the same record whatever
  // order its rows arrived in. {@link NEUTRAL_TERMS} deliberately
  // carries such a pattern, so it is dropped here and pinned in the
  // case below — a suite that had quietly used this set for the
  // stronger claim would be asserting something untrue.
  it('answers byte for byte the same record for one-category terms', () => {
    const seen = new Set<string>();
    const filed: readonly FeatureTerm[] = NEUTRAL_TERMS.filter((term) => {
      const first = !seen.has(term.pattern);

      seen.add(term.pattern);

      return first;
    });
    const spec: FeatureSpec = { ...NEUTRAL_SPEC, terms: filed };
    const record = extractFeatures(reading, gate, spec);

    expect(filed.length).toBeLessThan(NEUTRAL_TERMS.length);
    expect(JSON.stringify(extractFeatures(reading, gate, reversedSpec(filed))))
      .toBe(JSON.stringify(record));
  });

  // The one thing about a record that a row ORDER can still move, and
  // it is the taxonomy fault the module reports by counting rather
  // than by refusing: a pattern filed under two categories counts for
  // the first category the term set names, so reversing the set moves
  // the count between two columns that both still exist. Neither the
  // key list nor its digest can see it, which is exactly the drift
  // the term-set digest is the pin for.
  it('attributes a twice-filed pattern to the first category named', () => {
    const record = extractFeatures(reading, gate, NEUTRAL_SPEC);
    const reordered = extractFeatures(
      reading,
      gate,
      reversedSpec(NEUTRAL_TERMS),
    );
    const total = (of: Record<string, number>): number => Object.entries(of)
      .filter(([key]) => key.startsWith('category_'))
      .reduce((sum, [, value]) => sum + value, 0);

    expect(columnOf(record, 'category_signal_one')).toBe(3);
    expect(columnOf(record, 'category_signal_two')).toBe(0);
    expect(columnOf(reordered, 'category_signal_one')).toBe(1);
    expect(columnOf(reordered, 'category_signal_two')).toBe(2);
    expect(total(reordered)).toBe(total(record));
  });

  // The trap the group prefixes exist for, driven rather than
  // described: an integer-like own key enumerates FIRST whatever
  // order it was written in, so a domain naming a category `12` would
  // silently get a record whose key order stopped being the key
  // list's. The prefix is what keeps `category_12` an ordinary key.
  it('keeps a category named with digits in its written position', () => {
    const record = extractFeatures(reading, gate, NEUTRAL_SPEC);
    const keys = Object.keys(record);

    expect(keys).toContain('category_12');
    expect(keys.indexOf('category_12')).toBeGreaterThan(0);
    expect(keys).toEqual([...featureKeys(NEUTRAL_SPEC)]);
  });

  // The control the case above needs: a record written with the BARE
  // names would enumerate the digits first, so the reordering it
  // guards against is real rather than hypothetical.
  it('is guarding against an enumeration that really reorders', () => {
    const bare: Record<string, number> = {};

    bare.signal_two = 1;
    bare['12'] = 1;
    bare.signal_one = 1;

    expect(Object.keys(bare)).toEqual(['12', 'signal_two', 'signal_one']);
  });

  // Every value is a finite number, which is the vector's whole
  // contract: a NaN, an infinity or a string is a cell that trains a
  // model on garbage or crashes a trainer's parser.
  it('answers a finite number in every column', () => {
    const record = extractFeatures(reading, gate, NEUTRAL_SPEC);
    const values = Object.values(record);

    expect(values.every((value) => Number.isFinite(value))).toBe(true);
    expect(values).toHaveLength(featureKeys(NEUTRAL_SPEC).length);
  });

  // The counts always add up to the hits, which is what a catch-all
  // is for. Six hits in, six counted — three attributed to the column
  // their patterns name, one to a category that lost its column, and
  // two to patterns the term set does not name.
  it('counts every hit exactly once across the category columns', () => {
    const record = extractFeatures(reading, gate, NEUTRAL_SPEC);
    const counted = Object.entries(record)
      .filter(([key]) => key.startsWith('category_'))
      .reduce((total, [, value]) => total + value, 0);

    expect(counted).toBe(gate.hits.length);
    expect(record.category_signal_one).toBe(3);
    expect(record.category_12).toBe(1);
    expect(record.category_other).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The known flag, and the other way absence is encoded
// ---------------------------------------------------------------------------

describe('extractFeatures — the known flag beside a quantity', () => {
  /** One quantity, so a case reads two columns rather than twelve. */
  const spec: FeatureSpec = {
    terms: [],
    quantities: ['count'],
    oneHots: [],
  };

  /**
   * The value and the flag for one measurement.
   *
   * @param value - Whatever the pipeline filed under the quantity.
   * @returns The pair, value first.
   */
  function pairFor(value: unknown): readonly [number, number] {
    const record = extractFeatures(
      readingOf({ quantities: { count: value } }),
      {},
      spec,
    );

    return [
      columnOf(record, 'quantity_count'),
      columnOf(record, 'quantity_count_known'),
    ];
  }

  // The headline encoding. A numeric vector cannot hold `null`, so
  // the flag is what carries the distinction the repo's null-vs-zero
  // rule is about: the value reads `0` for an unmeasured quantity
  // because it has to read something, and the flag says the `0` is
  // not a measurement.
  it('answers a zero value and a down flag for every absence', () => {
    const absent: readonly unknown[] = [null, undefined, ''];

    expect(absent.map((value) => pairFor(value)))
      .toEqual(absent.map(() => [0, 0]));
  });

  // A quantity key nobody wrote reads exactly as a key written
  // `null`, which is the whole reason absence has one answer here.
  it('answers the same pair for a key nobody wrote', () => {
    const record = extractFeatures(readingOf({}), {}, spec);

    expect([record.quantity_count, record.quantity_count_known])
      .toEqual([0, 0]);
  });

  // The distinction from the other side, and the one a model can only
  // learn if it is told: a measured zero has the same VALUE as an
  // absence and a different flag. A quantity scored as a measured
  // zero takes its place at the bottom of every ordering as though it
  // had been read.
  it('answers a zero value and an up flag for a measured zero', () => {
    expect(pairFor(0)).toEqual([0, 1]);
    expect(pairFor('0')).toEqual([0, 1]);
    expect(pairFor(false)).toEqual([0, 1]);
  });

  // The line nobody chose, in the place it actually reaches a stored
  // column: an empty cell is absence and a cell holding one space is
  // a measurement of nothing.
  it('reads a whitespace cell as a measurement and empty as none', () => {
    expect(pairFor('')).toEqual([0, 0]);
    expect(pairFor(' ')).toEqual([0, 1]);
  });

  // Present, and still no measurement. A value nothing could read is
  // absence rather than a zero anybody stated, and the flag is what
  // keeps that from looking like a reading.
  it('answers a down flag for a present value carrying no number', () => {
    const unreadable: readonly unknown[] = [
      'x', {}, [1, 2], Number.NaN, Number.POSITIVE_INFINITY,
      Symbol('a measurement'), hostileValue(),
    ];

    expect(unreadable.map((value) => pairFor(value)))
      .toEqual(unreadable.map(() => [0, 0]));
  });

  it('answers the measurement and an up flag when there is one', () => {
    expect(pairFor(7)).toEqual([7, 1]);
    expect(pairFor('7.5')).toEqual([7.5, 1]);
    expect(pairFor(-3)).toEqual([-3, 1]);
  });

  // A quantity named for the flag of another one is the collision
  // this group can carry, and it costs a column rather than a
  // reading: the two keyed names are equal, first occurrence wins,
  // and the later declaration is simply absent.
  it('drops a quantity whose keyed name is another quantity flag', () => {
    const clashing: FeatureSpec = {
      terms: [],
      quantities: ['count', 'count known'],
      oneHots: [],
    };
    const keys = featureKeys(clashing);

    expect(keys.filter((key) => key.startsWith('quantity_'))).toEqual([
      'quantity_count', 'quantity_count_known', 'quantity_count_known_known',
    ]);
  });
});

describe('extractFeatures — the one-hot, which needs no flag', () => {
  /** One group with two members and its catch-all. */
  const spec: FeatureSpec = {
    terms: [],
    quantities: [],
    oneHots: [{ key: 'shape', members: ['round', 'square'] }],
  };

  /**
   * The group's three columns for one stated reading.
   *
   * @param stated - Whatever the pipeline filed under the group.
   * @returns Catch-all, then the two members in column order.
   */
  function groupFor(stated: unknown): readonly number[] {
    const record = extractFeatures(
      readingOf({ stated: { shape: stated } }),
      {},
      spec,
    );

    return [
      columnOf(record, 'stated_shape_other'),
      columnOf(record, 'stated_shape_round'),
      columnOf(record, 'stated_shape_square'),
    ];
  }

  // The encoding this group uses instead of a flag, and it is worth
  // reading off the columns rather than assuming: all members zero
  // AND the catch-all zero means nothing was stated, where a
  // catch-all above zero means something was stated that the roster
  // does not name. Different facts, kept apart by the layout.
  it('reads all zeros as nothing stated and a catch-all as unnamed', () => {
    expect(groupFor(undefined)).toEqual([0, 0, 0]);
    expect(groupFor(null)).toEqual([0, 0, 0]);
    expect(groupFor('')).toEqual([0, 0, 0]);
    expect(groupFor([])).toEqual([0, 0, 0]);
    expect(groupFor('triangle')).toEqual([1, 0, 0]);
  });

  it('reads a stated member as a one in its own column', () => {
    expect(groupFor('round')).toEqual([0, 1, 0]);
    expect(groupFor('Round')).toEqual([0, 1, 0]);
    expect(groupFor([' square '])).toEqual([0, 0, 1]);
  });

  // A member column is a 0/1 however many times its value was
  // stated, where the catch-all COUNTS — it is the signal that a
  // roster is falling behind what the sources say.
  it('holds a member at one and lets the catch-all climb', () => {
    expect(groupFor(['round', 'round'])).toEqual([0, 1, 0]);
    expect(groupFor(['triangle', 'oval', 'round'])).toEqual([2, 1, 0]);
  });
});

// ---------------------------------------------------------------------------
// Nothing raises, and the row is always the full width
// ---------------------------------------------------------------------------

describe('extractFeatures — inputs that are not what was expected', () => {
  // A spliced library that throws takes a whole run down, so an input
  // of the wrong shape reads as an input that stated nothing. Every
  // entry here is a document a Code node can really hand across a
  // connection.
  it('answers a full-width record for every argument shape', () => {
    const wrong: readonly unknown[] = [
      undefined, null, 0, '', false, 'text', 42, [], [1, 2], () => 1,
      Symbol('a document'), 7n, new Date(0), hostileValue(),
    ];
    const widths = wrong.map(
      (value) => Object.keys(extractFeatures(value, value, NEUTRAL_SPEC)),
    );

    expect(widths).toEqual(wrong.map(() => [...featureKeys(NEUTRAL_SPEC)]));
  });

  // A document nothing has been measured on still has an honest
  // vector, and it is a different fact from `documents.features`
  // being NULL, which says no featurizer ever reached the row.
  it('answers zeros with every flag down for a document with nothing', () => {
    const record = extractFeatures(readingOf({}), {}, NEUTRAL_SPEC);

    expect(Object.values(record).every((value) => value === 0)).toBe(true);
  });

  // The readings that are the wrong shape INSIDE a document, which
  // is the likelier fault: a quantities record that is a string, a
  // stated record that is a list, a hits member that is not a record.
  it('reads a member of the wrong shape as a member stating nothing', () => {
    const record = extractFeatures(
      { text: 42, quantities: 'not a record', stated: [1, 2] },
      { score: '4.5', hits: 'not a list' },
      NEUTRAL_SPEC,
    );

    expect(record.gate_score).toBe(4.5);
    expect(record.text_length).toBe(2);
    expect(record.quantity_count_known).toBe(0);
    expect(record.category_other).toBe(0);
  });
});

describe('featureVector — the row a trainer turns into a matrix', () => {
  it('answers the values in the order the key list gives', () => {
    const record = extractFeatures(
      readingOf({ quantities: { count: 7 } }),
      { score: 2 },
      { terms: [], quantities: ['count'], oneHots: [] },
    );
    const keys = featureKeys({ terms: [], quantities: ['count'], oneHots: [] });

    expect(featureVector(record, keys)).toEqual([2, 0, 7, 1, 0, 0]);
  });

  // A key the record is missing reads `0` rather than `undefined`, so
  // a row is always the full width — a matrix with a ragged row is
  // not a matrix, and the failure would surface in a trainer rather
  // than here.
  it('reads a key the record is missing as a zero', () => {
    expect(featureVector({}, ['a', 'b'])).toEqual([0, 0]);
    expect(featureVector({ a: 3 }, ['a', 'b'])).toEqual([3, 0]);
  });

  // The list is handed IN rather than derived, and that is the point
  // of it: a stored vector was computed under the layout its
  // `documents.feature_version` names, so rebuilding a row for
  // comparison means building it against THAT list.
  it('builds against the list it was handed rather than a derived one', () => {
    const record = { b: 1, a: 2 };

    expect(featureVector(record, ['a', 'b'])).toEqual([2, 1]);
    expect(featureVector(record, ['b', 'a'])).toEqual([1, 2]);
  });

  it('answers a full-width row of zeros for anything but a record', () => {
    const wrong: readonly unknown[] = [null, undefined, 0, '', 'text', 7n];

    expect(wrong.map((value) => featureVector(value, ['a', 'b'])))
      .toEqual(wrong.map(() => [0, 0]));
  });
});
