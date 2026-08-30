/**
 * `termSeedSchema`, `TermsFileSchema` and
 * `serializeTermSeedDocument` — the one declaration of the term
 * seed shape, and the bytes a document made of it has.
 *
 * The claims here are about a FORMAT rather than about a function,
 * which is why so many of them are whole-string comparisons. A
 * lexicon leaves through `?format=seed` and comes back through a
 * bulk import, and the only thing that makes that a round trip is
 * that the two ends agree on every byte: the indent, the key order
 * inside a row, the row order, and the trailing newline. Each of
 * those is pinned by a literal document written out in this file,
 * built from an array of lines joined on newlines so the trailing
 * one is visible in the source rather than implied by a template
 * literal's closing backtick.
 *
 * Three claims are worth naming on their own because each is a
 * member the format could lose silently. A NULL `notes` is written
 * as an explicit `null`: `JSON.stringify` drops an `undefined`
 * outright, so a serialiser that let the member go missing would
 * produce a document the schema then refuses for a reason naming
 * neither the row nor the export. A NEGATIVE `weight` travels
 * through unchanged, because magnitude and direction are two columns
 * and the sign of the first is not consulted — a serialiser
 * normalising it would rewrite rows the database accepts. And the
 * five members come out in the order the schema declares them,
 * whatever order they arrived in, which is what the shuffled input
 * below is for: a row from `JSON.parse` of a hand-edited file
 * validates identically to one from a store projection and
 * `JSON.stringify` would write the two differently.
 *
 * The two-serialisations case is the whole point of the module
 * stated as a test, and it is run in BOTH forms: the same array
 * twice, which catches a serialiser carrying state, and the same
 * ROWS in a different array order, which catches an order that came
 * from the caller rather than from the comparator. The second is the
 * one a `sort` says nothing about on its own, because
 * `Array.prototype.sort` is stable and a tie keeps whatever order it
 * was handed.
 *
 * The schema table below carries BOTH outcomes and a guard asserts
 * it. A block of nothing but refusals is fully green against a
 * schema that refuses everything, and the accepted rows are what
 * make each refusal a narrowing OF something. Every refused row
 * names the whole issue list it is refused with, `code` and path
 * together, so a second fault arriving beside the one it names is a
 * red case rather than a silent widening — a document refused
 * for one reason and one refused for two are different answers to a
 * caller reading details.
 *
 * MUTATION GRID, measured over the 30 cases in this file with
 * `--reporter=json`: fourteen legs on the module, seven on the
 * serialiser and seven on the schemas.
 *
 * Dropping the trailing newline reddens 3 — the two
 * whole-document cases plus the one named for it. Indenting at four
 * spaces reddens those 2 documents alone. Spreading a row instead of
 * rebuilding it member by member reddens the one-row document and
 * the key-order case. Sorting the caller's array in place reddens
 * only the case that reads that array back, and ordering descending
 * reddens only the order case.
 *
 * The two remaining ordering legs redden an IDENTICAL pair and are
 * therefore ONE reading rather than two: not sorting at all, and
 * dropping the tie-break on `categoryKey`, each redden the order
 * case and the reordered-input case. That is the tie-break being
 * unobservable except through a second array holding the same rows,
 * which is exactly what that case is for.
 *
 * Six of the seven schema legs are widenings answered by exactly the
 * refusal row named for each: `.strict()` off the file schema, off
 * the row schema (2, one per describe, since the row schema is put
 * to work twice), the `pattern` floor, the `weight` integer check,
 * `notes` made optional, and `polarity` widened to any string. The
 * seventh is the one saying the accepted half is load-bearing —
 * NARROWING `weight` to refuse a negative reddens 4, three
 * acceptance cases and one REFUSAL, because the undeclared-member
 * row is built on a row whose weight is negative and a whole-issue
 * -list assertion catches the second fault arriving beside the one
 * it names.
 *
 * A sixth member added to the row schema is red in TWO places at
 * once, which is what {@link TERM_SEED_KEYS} is for: TS2322 at
 * {@link KEY_LIST_IS_COMPLETE} under `check-types`, and the key-set
 * guard under the suite. That matters more than a spelling check,
 * because the serialiser rebuilds rows member by member and an
 * unlisted member would be dropped from every exported document
 * while every other case here stayed green.
 *
 * What no module mutation reaches: the two table guards, which read
 * only the table beside them. They are aimed at a later edit rather
 * than at the module — an outcome deleted whole, a label
 * reused.
 */
import type { TermSeed } from './seed-format.js';
import type { ZodSafeParseResult } from 'zod';

import { describe, expect, it } from 'vitest';

import {
  serializeTermSeedDocument,
  TermsFileSchema,
  termSeedSchema,
} from './seed-format.js';

/**
 * The members a row carries, in the order a canonical document
 * writes them.
 *
 * `satisfies` closes the direction where this list names a member
 * `TermSeed` does not have. {@link KEY_LIST_IS_COMPLETE} closes the
 * other one, which is the direction that matters here: the
 * serialiser rebuilds each row member by member, so a sixth member
 * added to the schema and not to this list would be DROPPED from
 * every exported document while every case below stayed green.
 */
const TERM_SEED_KEYS = [
  'categoryKey',
  'pattern',
  'weight',
  'polarity',
  'notes',
] as const satisfies readonly (keyof TermSeed)[];

/** True when `L` names every member of `T`, and `false` otherwise. */
type Covers<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/**
 * Red at THIS LINE, as TS2322, the moment `TermSeed` grows a member
 * {@link TERM_SEED_KEYS} does not name.
 */
const KEY_LIST_IS_COMPLETE: Covers<TermSeed, typeof TERM_SEED_KEYS> = true;

/** A document holding no rows at all, byte for byte. */
const EMPTY_DOCUMENT = [
  '{',
  '  "terms": []',
  '}',
  '',
].join('\n');

/**
 * One row whose members are handed over in an order no schema
 * declares, so what comes out says something about the serialiser
 * rather than about the input.
 *
 * Its `weight` is negative and its `notes` are null, which is what
 * makes {@link ONE_ROW_DOCUMENT} pin those two claims at the byte
 * level rather than through a field read.
 */
const SHUFFLED_ROW: TermSeed = {
  notes: null,
  polarity: 'negative',
  weight: -4,
  pattern: 'proprietary runtime',
  categoryKey: 'technologies',
};

/** What {@link SHUFFLED_ROW} serialises to, byte for byte. */
const ONE_ROW_DOCUMENT = [
  '{',
  '  "terms": [',
  '    {',
  '      "categoryKey": "technologies",',
  '      "pattern": "proprietary runtime",',
  '      "weight": -4,',
  '      "polarity": "negative",',
  '      "notes": null',
  '    }',
  '  ]',
  '}',
  '',
].join('\n');

/**
 * Three rows spanning two categories, with `zeta` in both so the
 * tie-break on `categoryKey` has something to break.
 *
 * Written in an order that is neither the canonical one nor its
 * reverse, so a case reading the output order cannot pass by the
 * input having arrived sorted.
 */
const MIXED_ROWS: readonly TermSeed[] = [
  {
    categoryKey: 'phrases', pattern: 'zeta', weight: 1,
    polarity: 'positive', notes: null,
  },
  {
    categoryKey: 'industries', pattern: 'alpha', weight: 2,
    polarity: 'ignore', notes: 'kept as a decision that was taken',
  },
  {
    categoryKey: 'industries', pattern: 'zeta', weight: 3,
    polarity: 'negative', notes: null,
  },
];

/** The shape `JSON.parse` of a canonical document answers. */
interface ParsedDocument {
  readonly terms: readonly TermSeed[];
}

/** Reads a serialised document back without an implicit `any`. */
function parseDocument(text: string): ParsedDocument {
  return JSON.parse(text) as ParsedDocument;
}

/**
 * The first row of a serialised document.
 *
 * THROWS when the document carries none, rather than answering
 * `undefined` under `noUncheckedIndexedAccess`. A case reading a
 * member off an absent row would otherwise compare two `undefined`s
 * and pass for nobody's reason.
 */
function firstRowOf(text: string): TermSeed {
  const [row] = parseDocument(text).terms;

  if (row === undefined) {
    throw new Error('expected the document to carry a row, and it did not');
  }

  return row;
}

/**
 * One value put to {@link TermsFileSchema}, and what it answers.
 *
 * A refused row names the WHOLE issue list rather than one member of
 * it, so a second fault arriving beside the one the row is about is
 * a red case. Each entry is `code@[dotted.path]`, with the empty
 * brackets standing for the document itself.
 */
type SchemaCase =
  | {
    readonly label: string;
    readonly outcome: 'accepted';
    readonly input: unknown;
    readonly rows: number;
  }
  | {
    readonly label: string;
    readonly outcome: 'refused';
    readonly input: unknown;
    readonly faults: readonly string[];
  };

/** Narrows to the accepted half; `filter` alone does not. */
function isAccepted(
  row: SchemaCase,
): row is Extract<SchemaCase, { outcome: 'accepted' }> {
  return row.outcome === 'accepted';
}

/** Narrows to the refused half; `filter` alone does not. */
function isRefused(
  row: SchemaCase,
): row is Extract<SchemaCase, { outcome: 'refused' }> {
  return row.outcome === 'refused';
}

/**
 * The faults a refused parse raised, as `code@[dotted.path]`.
 *
 * THROWS when the value was accepted, rather than answering an empty
 * list. A row whose value quietly stops failing would otherwise
 * compare two empty lists and pass for nobody's reason.
 */
function faultsOf(result: ZodSafeParseResult<unknown>): readonly string[] {
  if (result.success) {
    throw new Error('expected a refusal, and the value was accepted');
  }

  return result.error.issues.map(
    (issue) => `${issue.code}@[${issue.path.map(String).join('.')}]`,
  );
}

/**
 * The rows an accepted parse yielded.
 *
 * THROWS when the value was refused, for the reason {@link faultsOf}
 * throws on the other side, and names the faults that refused it so
 * a red case reads as a diagnosis rather than as a count.
 */
function termsOf(
  result: ZodSafeParseResult<ParsedDocument>,
): readonly TermSeed[] {
  if (!result.success) {
    throw new Error(
      `expected acceptance, refused with ${faultsOf(result).join(' ')}`,
    );
  }

  return result.data.terms;
}

/** One row good enough to vary one member of at a time. */
const BASE_ROW = {
  categoryKey: 'technologies',
  pattern: 'message queue',
  weight: 3,
  polarity: 'positive',
  notes: null,
};

/**
 * What the schema has to separate.
 *
 * The three polarity rows are one accepted case rather than three,
 * because what they pin is that the tuple in
 * `src/db/schema/values.ts` is what the schema reads — a fourth
 * member added there widens this row and the CHECK together.
 */
const SCHEMA_CASES: readonly SchemaCase[] = [
  {
    label: 'a document holding no rows', outcome: 'accepted',
    input: { terms: [] }, rows: 0,
  },
  {
    label: 'a canonical document read back', outcome: 'accepted',
    input: JSON.parse(ONE_ROW_DOCUMENT), rows: 1,
  },
  {
    label: 'a negative weight', outcome: 'accepted',
    input: { terms: [{ ...BASE_ROW, weight: -9 }] }, rows: 1,
  },
  {
    label: 'a zero weight', outcome: 'accepted',
    input: { terms: [{ ...BASE_ROW, weight: 0 }] }, rows: 1,
  },
  {
    label: 'notes somebody wrote', outcome: 'accepted',
    input: { terms: [{ ...BASE_ROW, notes: 'why it is here' }] },
    rows: 1,
  },
  {
    label: 'every polarity the column admits', outcome: 'accepted',
    input: {
      terms: [
        { ...BASE_ROW, pattern: 'a', polarity: 'positive' },
        { ...BASE_ROW, pattern: 'b', polarity: 'negative' },
        { ...BASE_ROW, pattern: 'c', polarity: 'ignore' },
      ],
    },
    rows: 3,
  },
  {
    label: 'an unknown top-level key', outcome: 'refused',
    input: { terms: [], _readme: ['a header nobody stripped'] },
    faults: ['unrecognized_keys@[]'],
  },
  {
    label: 'a document with no terms member', outcome: 'refused',
    input: {}, faults: ['invalid_type@[terms]'],
  },
  {
    label: 'an undeclared row member', outcome: 'refused',
    input: { terms: [{ ...BASE_ROW, categorykey: 'technologies' }] },
    faults: ['unrecognized_keys@[terms.0]'],
  },
  {
    label: 'a row that leaves its notes off', outcome: 'refused',
    input: { terms: [{ ...BASE_ROW, notes: undefined }] },
    faults: ['invalid_type@[terms.0.notes]'],
  },
  {
    label: 'a polarity outside the tuple', outcome: 'refused',
    input: { terms: [{ ...BASE_ROW, polarity: 'maybe' }] },
    faults: ['invalid_value@[terms.0.polarity]'],
  },
  {
    label: 'a fractional weight', outcome: 'refused',
    input: { terms: [{ ...BASE_ROW, weight: 1.5 }] },
    faults: ['invalid_type@[terms.0.weight]'],
  },
  {
    label: 'an empty pattern', outcome: 'refused',
    input: { terms: [{ ...BASE_ROW, pattern: '' }] },
    faults: ['too_small@[terms.0.pattern]'],
  },
  {
    label: 'an empty category key', outcome: 'refused',
    input: { terms: [{ ...BASE_ROW, categoryKey: '' }] },
    faults: ['too_small@[terms.0.categoryKey]'],
  },
];

// ---------------------------------------------------------------------------
describe('serializeTermSeedDocument', () => {
  it('writes an empty document as terms holding no rows', () => {
    expect(serializeTermSeedDocument([])).toBe(EMPTY_DOCUMENT);
  });

  it('writes one row byte for byte', () => {
    expect(serializeTermSeedDocument([SHUFFLED_ROW]))
      .toBe(ONE_ROW_DOCUMENT);
  });

  it('writes the five members in the declared order', () => {
    const row = firstRowOf(serializeTermSeedDocument([SHUFFLED_ROW]));

    expect(Object.keys(row)).toStrictEqual([...TERM_SEED_KEYS]);
  });

  it('states a null notes rather than dropping the member', () => {
    const row = firstRowOf(serializeTermSeedDocument([SHUFFLED_ROW]));

    expect(Object.hasOwn(row, 'notes')).toBe(true);
    expect(row.notes).toBeNull();
  });

  it('carries a negative weight through unchanged', () => {
    const row = firstRowOf(serializeTermSeedDocument([SHUFFLED_ROW]));

    expect(row.weight).toBe(-4);
  });

  it('ends in exactly one newline', () => {
    const text = serializeTermSeedDocument([SHUFFLED_ROW]);

    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });

  it('serialises one input to identical bytes twice', () => {
    expect(serializeTermSeedDocument(MIXED_ROWS))
      .toBe(serializeTermSeedDocument(MIXED_ROWS));
  });

  it('answers the same bytes for the same rows reordered', () => {
    const reordered = [MIXED_ROWS[2], MIXED_ROWS[0], MIXED_ROWS[1]]
      .filter((row): row is TermSeed => row !== undefined);

    expect(reordered).toHaveLength(MIXED_ROWS.length);
    expect(serializeTermSeedDocument(reordered))
      .toBe(serializeTermSeedDocument(MIXED_ROWS));
  });

  it('orders rows by pattern, then by category key', () => {
    const { terms } = parseDocument(
      serializeTermSeedDocument(MIXED_ROWS),
    );

    expect(terms.map((row) => `${row.pattern}/${row.categoryKey}`))
      .toStrictEqual([
        'alpha/industries',
        'zeta/industries',
        'zeta/phrases',
      ]);
  });

  it('leaves the array the caller handed over alone', () => {
    const rows = [...MIXED_ROWS];

    serializeTermSeedDocument(rows);

    expect(rows.map((row) => row.pattern))
      .toStrictEqual(['zeta', 'alpha', 'zeta']);
  });

  it('writes a document the file schema accepts back', () => {
    const text = serializeTermSeedDocument(MIXED_ROWS);
    const rows = termsOf(TermsFileSchema.safeParse(JSON.parse(text)));

    expect(serializeTermSeedDocument(rows)).toBe(text);
  });
});

// ---------------------------------------------------------------------------
describe('the terms document schema', () => {
  for (const row of SCHEMA_CASES.filter(isAccepted)) {
    it(`accepts ${row.label}`, () => {
      expect(termsOf(TermsFileSchema.safeParse(row.input)))
        .toHaveLength(row.rows);
    });
  }

  for (const row of SCHEMA_CASES.filter(isRefused)) {
    it(`refuses ${row.label}`, () => {
      expect(faultsOf(TermsFileSchema.safeParse(row.input)))
        .toStrictEqual(row.faults);
    });
  }

  it('carries a row for both outcomes', () => {
    expect([...new Set(SCHEMA_CASES.map((row) => row.outcome))].sort())
      .toStrictEqual(['accepted', 'refused']);
  });

  it('names every case in the table once', () => {
    const labels = SCHEMA_CASES.map((row) => row.label);

    expect([...new Set(labels)]).toHaveLength(labels.length);
  });

  it('names every member a row carries', () => {
    expect(KEY_LIST_IS_COMPLETE).toBe(true);
    expect(Object.keys(termSeedSchema.shape).sort())
      .toStrictEqual([...TERM_SEED_KEYS].sort());
  });
});

// ---------------------------------------------------------------------------
describe('termSeedSchema on its own', () => {
  it('accepts one row outside a document', () => {
    expect(termSeedSchema.safeParse(SHUFFLED_ROW).success).toBe(true);
  });

  it('refuses an undeclared member against the row itself', () => {
    expect(faultsOf(termSeedSchema.safeParse({
      ...SHUFFLED_ROW, categorykey: 'technologies',
    }))).toStrictEqual(['unrecognized_keys@[]']);
  });
});
