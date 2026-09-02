import type {
  EditableTermMembers,
  TermPayload,
  TermPayloadEntry,
} from './schema';
import type { Term, TermPolarity } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { describeSchemaIssues } from '../../components/jsonDraft';
import { TERMS } from '../../data/lexicon';

import { termPayloadSchema } from './schema';

/** One refusal, as the cases below read it. */
interface Refused {
  /**
   * The issue code, which is what says a sentence can name the fault
   * — see the module header on why `custom` is the one code no rule
   * here may answer.
   */
  readonly code: string;
  /** Where the fault is: the entry index, then the member. */
  readonly path: string;
}

/**
 * The polarities the union carries, in the surface order.
 *
 * A TYPED literal rather than a reading of `./cards.ts`, for the
 * reason `./terms.test.ts` gives about its own copy: annotating it
 * `readonly TermPolarity[]` means a polarity dropped from the union
 * upstream reddens `check-types` here, and driving the schema with it
 * catches a spelling the schema quietly stopped accepting.
 */
const POLARITIES: readonly TermPolarity[] = [
  'positive',
  'negative',
  'ignore',
];

/**
 * One entry with every member as the editor would write it.
 *
 * The base each refusal below varies exactly ONE member of, which is
 * what makes each of them a reading about that member. The accepting
 * cases drive this same entry, so a schema refusing everything fails
 * those rather than passing these for the wrong reason.
 */
const VALID: TermPayloadEntry = {
  pattern: 'message queue',
  weight: 3,
  polarity: 'positive',
  notes: null,
};

/**
 * A token nothing in a refusal sentence can legitimately say.
 *
 * Long enough not to collide with the vocabulary that
 * `describeSchemaIssues` builds from —
 * `../../components/jsonDraft.test.ts` states the rule and carries
 * the whole sweep with its positive control. This file
 * asks only the half that is this schema, which is the one that
 * produces an `unrecognized_keys` issue at all: zod fills that issue
 * message with the key names, measured, so the sentence built from it
 * is the schema-specific place a name could leak.
 */
const SENTINEL = 'sntnlterm';

/**
 * Every category the seeded terms hang off.
 *
 * Grouped rather than flattened because a payload is ONE category's
 * vocabulary — feeding the whole table would still parse and would
 * stop being the shape the editor hands over.
 */
const SEEDED_CATEGORY_IDS: readonly number[] = [
  ...new Set(TERMS.map((row) => row.categoryId)),
];

/**
 * One entry read as the members a stored row carries.
 *
 * A function rather than a comment: its parameter is the schema
 * output and its return is the module's own statement of what it
 * mirrors, so the assignability the header claims is checked by
 * `check-types` rather than asserted in prose. Measured live —
 * widening the polarity to `z.string()` in the schema reddens
 * exactly this.
 *
 * @param entry - What the schema answered.
 * @returns The same value, read as the row members it mirrors.
 */
function storedMembers(entry: TermPayloadEntry): EditableTermMembers {
  return entry;
}

/**
 * Stored rows as the payload an editor would show for them.
 *
 * The other direction of the same claim, and the projection the
 * fallback branch performs: the four members the editor writes, with
 * the id and the category left where they are.
 *
 * @param terms - The rows, in stored order.
 * @returns The payload, in the same order.
 */
function payloadOf(terms: readonly Term[]): TermPayload {
  return terms.map((term) => ({
    pattern: term.pattern,
    weight: term.weight,
    polarity: term.polarity,
    notes: term.notes,
  }));
}

/**
 * The issues one payload was refused with.
 *
 * @param payload - What to run the schema over.
 * @returns One reading per issue, in the schema's own walk order.
 * @throws If the schema ACCEPTED the payload, which would otherwise
 * leave a refusal case comparing two empty lists.
 */
function refusal(payload: unknown): Refused[] {
  const result = termPayloadSchema.safeParse(payload);

  if (result.success) {
    throw new Error('The schema accepted a payload it must refuse.');
  }

  return result.error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.join('.'),
  }));
}

/**
 * The sentences one refused payload produces.
 *
 * @param payload - What to run the schema over.
 * @returns One sentence per issue.
 * @throws If the schema accepted the payload.
 */
function sentencesFor(payload: unknown): string[] {
  const result = termPayloadSchema.safeParse(payload);

  if (result.success) {
    throw new Error('The schema accepted a payload it must refuse.');
  }

  return describeSchemaIssues(result.error);
}

/**
 * The payload a schema accepted.
 *
 * @param payload - What to run the schema over.
 * @returns What it answered.
 * @throws If the schema REFUSED it, so an accepting case cannot pass
 * by comparing one absence against another.
 */
function accepted(payload: unknown): TermPayload {
  const result = termPayloadSchema.safeParse(payload);

  if (!result.success) {
    throw new Error(
      'The schema refused a payload it must accept: '
      + describeSchemaIssues(result.error).join(' '),
    );
  }

  return result.data;
}

describe('what termPayloadSchema refuses', () => {
  it('refuses an entry carrying a key the editor does not write', () => {
    // `id` is the one a row copied from somewhere else brings with
    // it, and the one a stripping schema would silently drop.
    expect(refusal([{ ...VALID, id: 12 }])).toEqual([
      { code: 'unrecognized_keys', path: '0' },
    ]);

    // The control for the axis: the same entry without the key.
    expect(accepted([VALID])).toHaveLength(1);
  });

  it('refuses a negative weight, where weight is a magnitude', () => {
    expect(refusal([{ ...VALID, weight: -1 }])).toEqual([
      { code: 'too_small', path: '0.weight' },
    ]);

    // Zero is the bound and is allowed: an `ignore` term keeps its
    // magnitude, so a weightless row is a row and not a fault.
    expect(accepted([{ ...VALID, weight: 0 }])).toHaveLength(1);
  });

  it('refuses a polarity outside the union', () => {
    expect(refusal([{ ...VALID, polarity: 'neutral' }])).toEqual([
      { code: 'invalid_value', path: '0.polarity' },
    ]);

    POLARITIES.forEach((polarity) => {
      expect(accepted([{ ...VALID, polarity }])).toHaveLength(1);
    });
  });

  it('refuses the empty string as a note, where null is the absence', () => {
    expect(refusal([{ ...VALID, notes: '' }])).toEqual([
      { code: 'too_small', path: '0.notes' },
    ]);

    // Both spellings of a note that exists and of one that does not,
    // so the refusal is about the empty string alone.
    expect(accepted([{ ...VALID, notes: 'why this term is here' }]))
      .toHaveLength(1);
    expect(accepted([{ ...VALID, notes: null }])).toHaveLength(1);
  });

  it('refuses an entry that leaves the notes key off', () => {
    // `../../data/types.ts` declares a nullable column `T | null` and
    // never optional, and the schema mirrors the rule: a payload says
    // `null` rather than saying nothing.
    expect(refusal([{
      pattern: VALID.pattern,
      weight: VALID.weight,
      polarity: VALID.polarity,
    }])).toEqual([{ code: 'invalid_type', path: '0.notes' }]);
  });

  it('refuses an empty pattern, as the paste branch does', () => {
    expect(refusal([{ ...VALID, pattern: '' }])).toEqual([
      { code: 'too_small', path: '0.pattern' },
    ]);
  });

  it('refuses a weight that is not a finite number', () => {
    // JSON can express none of these, so through the editor the rule
    // is unreachable — it is kept for a payload arriving any other
    // way, and measured here rather than assumed of `z.number()`.
    [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '3']
      .forEach((weight) => {
        expect(refusal([{ ...VALID, weight }])).toEqual([
          { code: 'invalid_type', path: '0.weight' },
        ]);
      });
  });

  it('refuses a payload that is not a list of entries', () => {
    // The payload IS the vocabulary, so a lone entry and an envelope
    // around one are both refused at the top level, where the path is
    // empty and the sentence names the payload itself.
    expect(refusal(VALID)).toEqual([{ code: 'invalid_type', path: '' }]);
    expect(refusal({ terms: [VALID] })).toEqual([
      { code: 'invalid_type', path: '' },
    ]);
  });

  it('reports one issue per faulted member, not one per entry', () => {
    const codes = refusal([
      { ...VALID, weight: -1 },
      { ...VALID, polarity: 'neutral' },
    ]);

    expect(codes).toEqual([
      { code: 'too_small', path: '0.weight' },
      { code: 'invalid_value', path: '1.polarity' },
    ]);
  });
});

describe('what termPayloadSchema accepts', () => {
  it('accepts the four members the editor writes, unchanged', () => {
    // Byte for byte what went in: nothing here transforms, so the
    // draft a save reads holds what the operator typed rather than a
    // normalised reading of it.
    expect(accepted([VALID])).toEqual([VALID]);
  });

  it('accepts a category that carries no vocabulary', () => {
    expect(accepted([])).toEqual([]);
  });

  it('accepts a weight that is not a whole number', () => {
    // Deliberate agreement with the paste branch, which takes any
    // finite magnitude: a stricter rule here would refuse a payload
    // the box beside it accepts.
    expect(accepted([{ ...VALID, weight: 2.5 }])).toEqual([
      { ...VALID, weight: 2.5 },
    ]);
  });

  it('accepts every seeded category\'s vocabulary', () => {
    SEEDED_CATEGORY_IDS.forEach((categoryId) => {
      const rows = TERMS.filter((row) => row.categoryId === categoryId);

      expect(accepted(payloadOf(rows))).toHaveLength(rows.length);
    });

    // The loop is only a reading while the fixture reaches both
    // spellings of a note and every polarity — otherwise a schema
    // that had lost a branch would pass it.
    expect(SEEDED_CATEGORY_IDS.length).toBeGreaterThan(0);
    expect(TERMS.some((row) => row.notes === null)).toBe(true);
    expect(TERMS.some((row) => row.notes !== null)).toBe(true);
    expect([...new Set(TERMS.map((row) => row.polarity))].sort())
      .toEqual([...POLARITIES].sort());
  });
});

describe('the refusals a sentence can name', () => {
  it('answers a code of zod\'s own for every refusal, never custom', () => {
    // The module header rests on this: a rule zod has no code for
    // arrives as `custom`, whose sentence names nothing an operator
    // can go and fix. So every rule declared there is one of zod's.
    const codes = [
      [{ ...VALID, id: 12 }],
      [{ ...VALID, weight: -1 }],
      [{ ...VALID, polarity: 'neutral' }],
      [{ ...VALID, notes: '' }],
      [{ ...VALID, pattern: '' }],
      VALID,
    ].flatMap((payload) => refusal(payload).map((issue) => issue.code));

    expect(codes).not.toContain('custom');
    expect(codes.length).toBeGreaterThan(0);
  });

  it('names the entry and the member in every sentence', () => {
    expect(sentencesFor([VALID, { ...VALID, weight: -1 }])).toEqual([
      'The value at [1].weight must be at least 0.',
    ]);
    expect(sentencesFor([{ ...VALID, polarity: 'neutral' }])).toEqual([
      'The value at [0].polarity must be one of '
      + '"positive", "negative", "ignore".',
    ]);
  });

  it('counts an undeclared key rather than naming it', () => {
    const [sentence = ''] = sentencesFor([{ ...VALID, [SENTINEL]: 1 }]);

    // The name is what zod's own message for this issue spells,
    // which is why the count is what the sentence carries instead.
    expect(sentence).toBe(
      'The value at [0] carries 1 key the schema does not declare.',
    );
    expect(sentence.toLowerCase()).not.toContain(SENTINEL);
  });

  it('quotes no value from the payload it refused', () => {
    // The planted token sits in a member the refusal is NOT about, so
    // a sentence carrying it would be an echo rather than a location.
    //
    // Stated as the limit it is: no rule THIS file can declare
    // reaches the sentence builder's own text, so the leg able to
    // redden this lives next door and its positive control is the
    // hostile schema in `../../components/jsonDraft.test.ts`. What
    // this case pins is the composition the fallback branch runs.
    const sentences = sentencesFor([
      { ...VALID, pattern: SENTINEL, weight: -1 },
    ]);

    expect(sentences.length).toBeGreaterThan(0);
    sentences.forEach((sentence) => {
      expect(sentence.toLowerCase()).not.toContain(SENTINEL);
    });
  });
});

describe('the mirror of Term', () => {
  it('reads every entry as the members a stored row carries', () => {
    const rows = TERMS.filter(
      (row) => row.categoryId === SEEDED_CATEGORY_IDS[0],
    );
    const members = accepted(payloadOf(rows)).map(storedMembers);

    expect(members).toEqual(rows.map((row) => ({
      pattern: row.pattern,
      weight: row.weight,
      polarity: row.polarity,
      notes: row.notes,
    })));

    // The pair of crossings is the claim; this keeps the case from
    // making it over an empty list.
    expect(members.length).toBeGreaterThan(0);
  });

  it('leaves the id and the category out of the payload', () => {
    const [entry = VALID] = payloadOf(TERMS);

    expect(Object.keys(entry).sort()).toEqual([
      'notes',
      'pattern',
      'polarity',
      'weight',
    ]);
  });
});
