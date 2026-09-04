/**
 * Cases for `src/lib/entity-name-norm.ts`: what makes two spellings
 * of one subject the same key, and the one value it refuses.
 *
 * The module is a REDUCTION, so almost every claim here is an
 * equality — and an equality is the shape that goes vacuous most
 * quietly. A function answering one constant for every argument
 * satisfies every "these spellings agree" case in this file; a
 * function answering its argument unchanged satisfies every
 * "and this one still works" case. So each row of the table below
 * carries a DISTINCT near miss beside its spellings, asserted in the
 * same `it` to answer something else. That pairing is what makes a
 * row a measurement rather than a list.
 *
 * The refusal cases are paired the same way and along their own
 * axis: each refused value appears again with ONE identifying
 * character added, asserted to reduce without raising. A module that
 * refused everything satisfies the refusals on its own.
 *
 * ## Why the refusal is pinned by its message
 *
 * `toThrow(Error)` is satisfied by every raise JavaScript has,
 * including one this module never meant to report — handing it
 * something that is not text raises a `TypeError` from inside
 * `toLowerCase`, and a case pinned on the class cannot tell the two
 * apart. The case that says so drives both and reads the message,
 * which is the only channel that separates them.
 *
 * ## What a mutation of the module reports here
 *
 * Thirteen legs over `src/lib/entity-name-norm.ts`, every one of
 * them reporting and none of them at zero. The three worth
 * recording are the ones a reader would otherwise take on trust,
 * and all three are whole-half controls rather than readings of a
 * single rule.
 *
 * ANSWERING ONE KEY FOR EVERY ARGUMENT reddens 9 of 22, which is
 * what the `distinct` member of each row buys: without it the six
 * folding rows are satisfied by a collapse. ANSWERING THE ARGUMENT
 * UNCHANGED reddens 9 as well and NOT the same 9 — the mark case
 * passes, an identity keeping every mark it was handed, and the
 * idempotence case reds in its place through its own vacuity guard
 * rather than through its subject. REFUSING EVERYTHING reddens 18,
 * which is the near miss inside each refusal case reporting, and
 * the four survivors are the two table guards and the two cases
 * whose whole subject is a raise.
 *
 * The finer legs land where their claim is, which is what says the
 * rows are about different things: dropping marks from the keep
 * set reddens the mark case alone, spelling the form NFC rather
 * than NFKC reddens the compatibility and ligature rows and
 * nothing else, matching one character rather than a RUN reddens
 * the two rows that carry a run, and rendering the submitted value
 * into the message reddens the containment case alone.
 *
 * ## The vocabulary these cases are driven with
 *
 * Placeholder names throughout, and every invisible or non-ASCII
 * character is built from its code point rather than written as a
 * glyph — so this file stays ASCII and a reader can see which
 * character a case is about rather than looking at a space that is
 * not one.
 */
import { describe, expect, it } from 'vitest';

import { normalizeEntityName } from '../../src/lib/entity-name-norm.js';

// ---------------------------------------------------------------------------
// The characters the cases are built from
// ---------------------------------------------------------------------------

/**
 * A character by code point.
 *
 * Written out rather than passed to `map`, because
 * `String.fromCodePoint` is variadic and `map` hands its callback
 * three arguments — a roster built the short way would be three
 * characters per entry and nothing would report it.
 *
 * @param code - The code point.
 * @returns The one-character string it names.
 */
function charFrom(code: number): string {
  return String.fromCodePoint(code);
}

/** A tab: whitespace, so it separates and collapses. */
const TAB = charFrom(9);

/** A line feed, which separates the same way. */
const LINE_FEED = charFrom(10);

/** A no-break space, which NFKC folds onto an ordinary one. */
const NO_BREAK_SPACE = charFrom(160);

/** An ideographic space, folded the same way. */
const IDEOGRAPHIC_SPACE = charFrom(12288);

/**
 * A zero-width space: invisible, and not a letter, digit or mark.
 *
 * The character the header's splitting rule is about. It separates,
 * so a reader seeing one word gets a key holding two.
 */
const ZERO_WIDTH_SPACE = charFrom(8203);

/** A combining acute accent, which composes onto the letter before. */
const COMBINING_ACUTE = charFrom(769);

/** The same accent already composed onto its letter. */
const E_ACUTE = charFrom(233);

/** A fullwidth M, whose compatibility form is an ASCII one. */
const FULLWIDTH_M = charFrom(65325);

/** A fullwidth E. */
const FULLWIDTH_E = charFrom(65349);

/** A fullwidth R. */
const FULLWIDTH_R = charFrom(65362);

/** An fi ligature, whose compatibility form is two letters. */
const LIGATURE_FI = charFrom(64257);

/** An emoji: neither a letter, a digit nor a mark, so it separates. */
const GRINNING_FACE = charFrom(128512);

/**
 * A Hindi word spelled with the marks its script needs.
 *
 * Two of its six code points are marks rather than letters, which is
 * why the keep set names marks at all: a reduction taking letters
 * and digits alone would answer {@link HINDI_LETTERS_ALONE} here and
 * key two unrelated words alike.
 */
const HINDI_WORD = [2361, 2367, 2344, 2381, 2342, 2368]
  .map((code) => charFrom(code))
  .join('');

/** The same word with every mark taken out of it. */
const HINDI_LETTERS_ALONE = [2361, 2344, 2342]
  .map((code) => charFrom(code))
  .join('');

/** Something that is not text at all, for the class-versus-message case. */
const NOT_TEXT = 42 as unknown as string;

// ---------------------------------------------------------------------------
// One subject, more than one spelling
// ---------------------------------------------------------------------------

/** A subject spelled several ways, and a neighbour that is not it. */
interface SpellingCase {
  /** What the row is about, and what its case is named for. */
  readonly id: string;

  /** The key every spelling has to reduce to. */
  readonly key: string;

  /** The spellings, which must differ from each other. */
  readonly spellings: readonly string[];

  /**
   * A name that must NOT reduce to {@link key}.
   *
   * The control, varied along this row's own axis: a reduction
   * answering one key for everything satisfies the equality above
   * and fails here, and that is the only thing separating a fold
   * from a collapse.
   */
  readonly distinct: string;
}

/**
 * Every folding claim this file makes, as one table.
 *
 * Declared once rather than beside each `describe` so the guards
 * below can hold it against itself and the idempotence case at the
 * foot can derive its values from it — a value added here joins that
 * case with nothing else edited.
 */
const SPELLINGS: readonly SpellingCase[] = [
  {
    id: 'a difference of case alone',
    key: 'meridian labs',
    spellings: ['Meridian Labs', 'MERIDIAN LABS', 'mErIdIaN lAbS'],
    distinct: 'Meridian Lab',
  },
  {
    id: 'a difference of whitespace alone',
    key: 'meridian labs',
    spellings: [
      'Meridian  Labs',
      '   Meridian Labs   ',
      `Meridian${TAB}${TAB}Labs`,
      `Meridian${LINE_FEED}Labs`,
      `Meridian${NO_BREAK_SPACE}Labs`,
      `Meridian${IDEOGRAPHIC_SPACE}Labs`,
    ],
    // Whitespace COLLAPSES and is never dropped, so the run-together
    // spelling is a different subject rather than the same one.
    distinct: 'MeridianLabs',
  },
  {
    id: 'a difference of normalization form',
    key: `caf${E_ACUTE} bleu`,
    spellings: [`Cafe${COMBINING_ACUTE} Bleu`, `Caf${E_ACUTE} Bleu`],
    // The accent is COMPOSED and not stripped, so the plain spelling
    // stays its own subject. A reduction that dropped marks instead
    // would answer this for all three.
    distinct: 'Cafe Bleu',
  },
  {
    id: 'a compatibility spelling',
    key: 'mer',
    spellings: ['Mer', 'MER', `${FULLWIDTH_M}${FULLWIDTH_E}${FULLWIDTH_R}`],
    distinct: 'Mere',
  },
  {
    id: 'a ligature',
    key: 'find',
    spellings: [`${LIGATURE_FI}nd`, 'find', 'FIND'],
    distinct: 'fend',
  },
  {
    id: 'punctuation between the words',
    key: 'meridian labs inc',
    spellings: [
      'Meridian Labs, Inc.',
      'Meridian-Labs Inc',
      '  MERIDIAN-LABS,  Inc.  ',
    ],
    distinct: 'meridianlabsinc',
  },
];

/**
 * Every value the table expects an answer for.
 *
 * The spellings and the near misses together, which is what the
 * idempotence case is driven over — derived rather than written out,
 * so it cannot fall behind the table it is taken from.
 */
const ACCEPTED = SPELLINGS
  .flatMap((row) => [...row.spellings, row.distinct]);

describe('normalizeEntityName — one subject, several spellings', () => {
  // The vacuity guards the rows below rest on. An emptied table
  // collapses every case in this describe into nothing at all, and a
  // row carrying one spelling asserts no agreement between two.
  it('names each claim once, over spellings that differ', () => {
    const ids = SPELLINGS.map((row) => row.id);
    const thin = SPELLINGS.filter((row) => row.spellings.length < 2);
    const repeated = SPELLINGS
      .filter((row) => new Set(row.spellings).size !== row.spellings.length);

    expect(SPELLINGS.length).toBeGreaterThan(0);
    expect(ids).toEqual(Array.from(new Set(ids)));
    expect(thin.map((row) => row.id)).toEqual([]);
    expect(repeated.map((row) => row.id)).toEqual([]);
  });

  for (const row of SPELLINGS) {
    it(`reduces ${row.id} to one key`, () => {
      const keys = row.spellings.map((one) => normalizeEntityName(one));

      expect(keys).toEqual(row.spellings.map(() => row.key));

      // The control, in the same case and on this row's own axis: a
      // reduction answering one key for every argument satisfies
      // every assertion above it.
      expect(normalizeEntityName(row.distinct)).not.toBe(row.key);
    });
  }
});

// ---------------------------------------------------------------------------
// The two readings the table cannot take
// ---------------------------------------------------------------------------

describe('normalizeEntityName — what the fold does not consult', () => {
  it('folds case without asking a locale', () => {
    // `toLocaleLowerCase` would make the key a property of where the
    // process runs, which is the silent miss the column warns about:
    // a rival row on one host and not on another. The second
    // assertion is what makes the first discriminating — it says the
    // locale-aware answer really is a different string here, so a
    // module reaching for one would fail the line above.
    expect(normalizeEntityName('ISTANBUL')).toBe('istanbul');
    expect('ISTANBUL'.toLocaleLowerCase('tr')).not.toBe('istanbul');
  });

  it('keeps the marks a script spells a word with', () => {
    // The keep set names marks as well as letters and digits. A
    // reduction taking letters alone answers the second value for
    // both arguments, which is two unrelated words on one row.
    expect(normalizeEntityName(HINDI_WORD)).toBe(HINDI_WORD);
    expect(normalizeEntityName(HINDI_LETTERS_ALONE))
      .toBe(HINDI_LETTERS_ALONE);
    expect(HINDI_WORD).not.toBe(HINDI_LETTERS_ALONE);
  });

  it('splits on an invisible character rather than hiding it', () => {
    // The header's stated direction, and the case that pins it. A
    // zero-width space is not a letter, a digit or a mark, so it
    // separates like any other character outside the keep set — and
    // the visible spelling beside it is what says the two are two
    // rows a person can settle rather than one row nobody can.
    expect(normalizeEntityName(`Meridian${ZERO_WIDTH_SPACE}Labs`))
      .toBe('meridian labs');
    expect(normalizeEntityName('MeridianLabs')).toBe('meridianlabs');
  });

  it('reduces its own answer to itself', () => {
    // Idempotence, which is what lets a stored key be compared
    // against a freshly reduced one. The second assertion is the
    // vacuity guard: over values nothing changes, the identity
    // function is idempotent too, so the case has to show that the
    // first reduction moved at least one of them.
    const moved = ACCEPTED.filter((one) => normalizeEntityName(one) !== one);
    const unstable = ACCEPTED.filter((one) => {
      const key = normalizeEntityName(one);

      return normalizeEntityName(key) !== key;
    });

    expect(ACCEPTED.length).toBeGreaterThan(0);
    expect(moved.length).toBeGreaterThan(0);
    expect(unstable).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The one value it refuses
// ---------------------------------------------------------------------------

/** A name that reduces to nothing, and the nearest one that does not. */
interface RefusalCase {
  /** What the row is about, and what its case is named for. */
  readonly id: string;

  /** The value, which has to be refused. */
  readonly raw: string;

  /**
   * The same value with one identifying character in it.
   *
   * The control, in the same case: a module that refused everything
   * satisfies every refusal in this table and nothing here.
   */
  readonly nearMiss: string;
}

/** Every shape of value that carries nothing to key a subject by. */
const REFUSALS: readonly RefusalCase[] = [
  { id: 'the empty string', raw: '', nearMiss: 'a' },
  { id: 'spaces alone', raw: '   ', nearMiss: '  a  ' },
  { id: 'a tab alone', raw: TAB, nearMiss: `${TAB}a` },
  { id: 'hyphens alone', raw: '---', nearMiss: '-a-' },
  { id: 'periods and spaces alone', raw: '. . .', nearMiss: '. a .' },
  { id: 'a bracket pair alone', raw: '[()]', nearMiss: '[(a)]' },
  {
    id: 'an emoji alone',
    raw: GRINNING_FACE,
    nearMiss: `${GRINNING_FACE}a`,
  },
  {
    id: 'a zero-width space alone',
    raw: ZERO_WIDTH_SPACE,
    nearMiss: `${ZERO_WIDTH_SPACE}a`,
  },
];

describe('normalizeEntityName — a name that reduces to nothing', () => {
  it('names each refused shape once', () => {
    const ids = REFUSALS.map((row) => row.id);

    expect(REFUSALS.length).toBeGreaterThan(0);
    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  for (const row of REFUSALS) {
    it(`refuses ${row.id}`, () => {
      const call = (): string => normalizeEntityName(row.raw);

      // Pinned by the message, and by the half of it that carries
      // the column's own reason rather than by the library tag
      // alone — the tag would still be there if the sentence behind
      // it had been rewritten into something else.
      expect(call).toThrow('[entity-name-norm]');
      expect(call).toThrow('must never be stored');

      // The control, varied along this row's own axis.
      expect(() => normalizeEntityName(row.nearMiss)).not.toThrow();
    });
  }

  it('is pinned by its message and not by its class', () => {
    const reduced = (): string => normalizeEntityName('. . .');
    const unrelated = (): string => normalizeEntityName(NOT_TEXT);

    // Both raise, and both answer `Error` — the second from inside
    // `toLowerCase`, which this module never meant to report. So the
    // class says nothing about which refusal ran, and a case written
    // that way would pass over a module whose own check was gone.
    expect(reduced).toThrow(Error);
    expect(unrelated).toThrow(Error);

    // The message is the channel that separates them, which is why
    // every case above reads one.
    expect(reduced).toThrow('[entity-name-norm]');
    expect(unrelated).not.toThrow('[entity-name-norm]');
  });

  it('names no part of the value it refused', () => {
    // A refusal here reaches an HTTP surface through a name patch,
    // and that surface may not echo a submitted value in a message,
    // a detail or a cause. The needle is a whole value that reduces
    // to nothing, so nothing legitimate could carry it.
    const submitted = '<<<>>>';
    let message = '';

    try {
      normalizeEntityName(submitted);
    } catch (raised: unknown) {
      message = raised instanceof Error
        ? raised.message
        : String(raised);
    }

    expect(message).toContain('[entity-name-norm]');
    expect(message).not.toContain(submitted);
    expect(message).not.toContain('<');
  });
});
