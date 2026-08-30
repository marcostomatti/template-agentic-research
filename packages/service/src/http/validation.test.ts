/**
 * `parseBody` and `parseQuery` — the boundary every wave-1 route
 * reads a request through, and the only place a failed parse becomes
 * a refusal.
 *
 * Four claims, and every one of them is a promise to a caller that
 * sees a status and a body and nothing else. That a parse which
 * succeeds answers the SCHEMA'S value rather than the one submitted,
 * defaults applied and coercions done, so a handler never re-reads
 * its own input. That a parse which fails throws the framework's
 * `ValidationError` and therefore a `422` carrying
 * `{ code, message, details }`, with no try/catch at the call site.
 * That every detail names the field that failed — by dotted path,
 * through objects and through array entries alike, and by a name of
 * this module's own when the fault is against the root, which has no
 * path. And that the message a detail carries is drawn from a fixed
 * vocabulary of this repo's own rather than from zod.
 *
 * That last one is the reason the module exists, so it is asserted
 * against zod rather than against a literal alone: every refusal row
 * re-parses its own value and asserts the answered message is NOT
 * the message zod raised for the same issue. A vocabulary that had
 * quietly become a passthrough would satisfy every `field` and every
 * `code` in this file and fail only there. The wording itself is
 * written down as three constants rather than imported, so a reword
 * in the module is a red case here and not a silent agreement.
 *
 * The two tables are shaped by which half of the claim they can
 * carry. Every row of the refusal table has a non-empty
 * `issue.path`, so it says nothing about the root and both parsers
 * must answer it identically — which is why each row is driven
 * through BOTH, and why a guard asserts no row of it names a root.
 * The root table is the opposite and is only two rows, because the
 * whole claim there is that the two parsers name the root
 * DIFFERENTLY: one `body`, one `query`, from one shared
 * implementation.
 *
 * Both outcomes are represented and guarded. A file of nothing but
 * refusals is fully green against a parser that refuses everything,
 * and a file of nothing but accepts against one that accepts
 * everything; the accepted rows and the refused rows are each
 * other's control.
 *
 * Mutation grid, measured over the 41 cases in this file with
 * `--reporter=json`. Six legs on the module, and the two worth
 * reading rather than counting are the ones that redden ONE case.
 * Naming a query's root `body` reddens only the query root row, so
 * the two root rows are each other's control and neither could be
 * dropped. Answering only the first issue reddens only `two faults
 * in one body`, which is therefore the whole of what pins a body
 * with two faults costing one round trip.
 *
 * The other four. Dropping the field path reddens 9 — the 7 detail
 * rows and both root rows. Handing zod's own message back reddens
 * 16: those same 9, plus all 7 anti-zod rows, which is the leg that
 * shows the wording control catching it independently of the
 * literals. Leaving the root unnamed reddens exactly the 2 root
 * rows. Returning the submitted value instead of the parsed one
 * reddens 3 — the defaulted query, the coerced query and the
 * options-bag case — and not the three identity rows, which cannot
 * see it at all; that is the measurement behind this file keeping a
 * defaulting and a coercing schema in the accepted table.
 *
 * What no module mutation reaches, and why. The 7 table guards read
 * only the tables beside them and are aimed at a later edit rather
 * than at the module. The 7 cross-parser agreement rows compare two
 * parsers to each other, so any change degrading both equally is
 * invisible to them by construction — they pin that the pair share
 * one implementation, not what that implementation says. The two
 * `422` and envelope rows assert the framework's contract rather
 * than this module's. And `leaves the value it was handed
 * untouched` needs a leg that mutates its argument, which none of
 * the six does.
 *
 * Not here, and deliberately: the sanitiser's own two rules —
 * `unrecognized_keys` naming its container and an open record's keys
 * collapsing to `*` — and the sentinel containment table that
 * proves no submitted string reaches a detail. Both are the next
 * tasks in this stage. What this file establishes is the vocabulary
 * and the path, which those two build on.
 */
import type { FieldError } from '../../lib/errors/index.js';
import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ValidationError } from '../../lib/errors/index.js';

import { parseBody, parseQuery } from './validation.js';

/**
 * The module's message for `invalid_type`, written down rather than
 * imported. It covers a MISSING field and a wrong-typed one both,
 * because zod 4 raises the same code for each and puts nothing safe
 * on the issue that separates them.
 */
const MISSING_OR_WRONG_TYPE = 'Missing, or not of the expected type.';

/** The module's message for `invalid_value`, an enum's refusal. */
const NOT_AN_ACCEPTED_VALUE = 'Not one of the accepted values.';

/** The module's message for `too_small`. */
const BELOW_THE_MINIMUM = 'Below the allowed minimum.';

/** The two outcomes this file has to carry rows for. */
const OUTCOMES = ['accepted', 'refused'];

/**
 * A stand-in for a wave-1 request body, shaped like the smallest
 * real one: the three columns a term row carries, strict as every
 * request schema on this surface is.
 *
 * A fixture rather than the real schema from `src/taxonomy/`, which
 * does not exist yet — and which this file should not depend on
 * once it does. What is under test is the parser, and a parser that
 * only works against one schema is not one.
 */
const termSchema = z.object({
  pattern: z.string().min(1),
  polarity: z.enum(['positive', 'negative']),
  weight: z.number(),
}).strict();

/**
 * A body with {@link termSchema} nested under it twice, once as a
 * member and once inside an array, so a path can be asked to cross
 * both kinds of segment.
 */
const documentSchema = z.object({
  categoryKey: z.string(),
  head: termSchema,
  terms: z.array(termSchema),
}).strict();

/**
 * A query in the shape every list route's is: coerced, defaulted and
 * strict. Its default is what makes an accepted row able to say the
 * parsed value came back rather than the submitted one.
 */
const windowSchema = z.object({
  page: z.coerce.number().int()
    .positive()
    .default(1),
}).strict();

/** A term that satisfies {@link termSchema}. */
const VALID_TERM = { pattern: 'alpha', polarity: 'positive', weight: 1.5 };

/**
 * One refused value whose issues all carry a non-empty path, and the
 * details a caller is answered with.
 *
 * `schema` travels with the row because the four classes need three
 * different shapes between them, and a table that hid the schema
 * would make a row unreadable on its own.
 */
interface RefusalCase {
  readonly label: string;
  readonly schema: ZodType;
  readonly value: unknown;
  readonly details: readonly FieldError[];
}

/**
 * The refusals the vocabulary and the path builder have to answer,
 * one per class the four wave-1 resource groups will actually raise.
 *
 * The first two rows are the same `invalid_type` code and the same
 * message, differing only in the field — which is the collapse zod 4
 * made and this table is the record of it. The last row is the one
 * that says a body with two faults costs one round trip and not two.
 */
const REFUSAL_CASES: readonly RefusalCase[] = [
  {
    label: 'a missing required field',
    schema: termSchema,
    value: { polarity: 'positive', weight: 1 },
    details: [
      { field: 'pattern', message: MISSING_OR_WRONG_TYPE, code: 'invalid_type' },
    ],
  },
  {
    label: 'a field of the wrong type',
    schema: termSchema,
    value: { pattern: 'alpha', polarity: 'positive', weight: 'heavy' },
    details: [
      { field: 'weight', message: MISSING_OR_WRONG_TYPE, code: 'invalid_type' },
    ],
  },
  {
    label: 'a value outside an enum',
    schema: termSchema,
    value: { pattern: 'alpha', polarity: 'sideways', weight: 1 },
    details: [
      {
        field: 'polarity',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
  },
  {
    label: 'a fault under a nested object member',
    schema: documentSchema,
    value: {
      categoryKey: 'signals',
      head: { pattern: 'alpha', polarity: 'sideways', weight: 1 },
      terms: [],
    },
    details: [
      {
        field: 'head.polarity',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
  },
  {
    label: 'a fault under an array entry',
    schema: documentSchema,
    value: {
      categoryKey: 'signals',
      head: VALID_TERM,
      terms: [VALID_TERM, { pattern: 'beta', polarity: 'negative' }],
    },
    details: [
      {
        field: 'terms.1.weight',
        message: MISSING_OR_WRONG_TYPE,
        code: 'invalid_type',
      },
    ],
  },
  {
    label: 'a string below its minimum length',
    schema: termSchema,
    value: { pattern: '', polarity: 'positive', weight: 1 },
    details: [
      { field: 'pattern', message: BELOW_THE_MINIMUM, code: 'too_small' },
    ],
  },
  {
    label: 'two faults in one body',
    schema: termSchema,
    value: { polarity: 'sideways', weight: 1 },
    details: [
      { field: 'pattern', message: MISSING_OR_WRONG_TYPE, code: 'invalid_type' },
      {
        field: 'polarity',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
  },
];

/** One parser, under the name a detail gives the value it reads. */
interface RootCase {
  readonly label: string;
  readonly parse: typeof parseBody;
  readonly rootField: string;
}

/**
 * The two halves of a request, and the name each one's root takes.
 *
 * Two rows and no more, because the claim is exactly that they
 * DIFFER. One shared implementation answers both, so a root name
 * hard-coded in that implementation, or copied from one function to
 * the other, reddens one of these rows and nothing else in the file.
 *
 * The value driven through them is a string rather than an object,
 * which is the plainest way to raise an issue against the root: zod
 * reports it with an empty `issue.path`, and an empty path is the
 * whole reason the root needs a name.
 */
const ROOT_CASES: readonly RootCase[] = [
  { label: 'a body', parse: parseBody, rootField: 'body' },
  { label: 'a query', parse: parseQuery, rootField: 'query' },
];

/** One accepted value, and what the parser hands back for it. */
interface AcceptedCase {
  readonly label: string;
  readonly schema: ZodType;
  readonly value: unknown;
  readonly parsed: unknown;
}

/**
 * The values that get through, and what comes back out.
 *
 * The last three rows are the ones with a claim in them rather than
 * a tautology: a value the schema DEFAULTS and a value it COERCES
 * come back changed, so a parser that returned its own argument
 * would pass the first two rows and fail these.
 */
const ACCEPTED_CASES: readonly AcceptedCase[] = [
  {
    label: 'a body satisfying every field',
    schema: termSchema,
    value: VALID_TERM,
    parsed: VALID_TERM,
  },
  {
    label: 'a body nesting one schema under another',
    schema: documentSchema,
    value: { categoryKey: 'signals', head: VALID_TERM, terms: [VALID_TERM] },
    parsed: { categoryKey: 'signals', head: VALID_TERM, terms: [VALID_TERM] },
  },
  {
    label: 'an absent query, which is what a list route sees most',
    schema: windowSchema,
    value: {},
    parsed: { page: 1 },
  },
  {
    label: 'a query whose value the schema coerces',
    schema: windowSchema,
    value: { page: '3' },
    parsed: { page: 3 },
  },
  {
    label: 'a body carrying a number the schema leaves alone',
    schema: termSchema,
    value: { pattern: 'beta', polarity: 'negative', weight: 0 },
    parsed: { pattern: 'beta', polarity: 'negative', weight: 0 },
  },
];

/**
 * The details a refused parse answered with.
 *
 * A parse that SUCCEEDED answers an empty list rather than throwing,
 * so a case expecting a refusal fails on the empty list — naming
 * what it wanted — instead of on a narrowing error. Anything thrown
 * that is not a `ValidationError` is re-thrown rather than absorbed:
 * a `TypeError` from inside the parser is a failure of this module
 * and must not read as a refusal it produced on purpose.
 */
function refusalOf(run: () => unknown): FieldError[] {
  try {
    run();
  } catch (err) {
    if (err instanceof ValidationError) {
      return err.details ?? [];
    }

    throw err;
  }

  return [];
}

/**
 * The messages ZOD would have answered for the same value — the
 * strings `zodToValidationError` copies verbatim, and the ones no
 * detail in this file may equal.
 */
function zodMessagesFor(schema: ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.message);
}

/** The outcomes this file carries rows for, deduplicated and sorted. */
function outcomesCovered(): string[] {
  const outcomes = [
    ...ACCEPTED_CASES.map(() => 'accepted'),
    ...REFUSAL_CASES.map(() => 'refused'),
  ];

  return [...new Set(outcomes)].sort();
}

// ---------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------

describe('the case tables', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesCovered()).toEqual(OUTCOMES);
  });

  it('labels every row distinctly', () => {
    const labels = [
      ...ACCEPTED_CASES.map((row) => row.label),
      ...REFUSAL_CASES.map((row) => row.label),
      ...ROOT_CASES.map((row) => row.label),
    ];

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names each of the four classes the task owes', () => {
    const codes = REFUSAL_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'invalid_type',
      'invalid_value',
      'too_small',
    ]);
  });

  it('refuses only against paths, never against a root', () => {
    const rooted = REFUSAL_CASES.filter(
      (row) => row.details.some(
        (detail) => ROOT_CASES.some((root) => root.rootField === detail.field),
      ),
    );

    expect(rooted.map((row) => row.label)).toEqual([]);
  });

  it('crosses an object member and an array entry', () => {
    const fields = REFUSAL_CASES.flatMap(
      (row) => row.details.map((detail) => detail.field),
    );

    expect(fields).toContain('head.polarity');
    expect(fields).toContain('terms.1.weight');
  });

  it('carries one row answering more than a single detail', () => {
    const plural = REFUSAL_CASES.filter((row) => row.details.length > 1);

    expect(plural.length).toBeGreaterThan(0);
  });

  it('gives the two halves of a request different root names', () => {
    const roots = ROOT_CASES.map((row) => row.rootField);

    expect([...new Set(roots)].sort()).toEqual(['body', 'query']);
  });
});

// ---------------------------------------------------------------------------
// What gets through
// ---------------------------------------------------------------------------

describe('a parse that succeeds', () => {
  for (const row of ACCEPTED_CASES) {
    it(`answers the parsed value for ${row.label}`, () => {
      expect(parseBody(row.schema, row.value)).toStrictEqual(row.parsed);
      expect(parseQuery(row.schema, row.value)).toStrictEqual(row.parsed);
    });
  }

  it('leaves the value it was handed untouched', () => {
    const value = { page: '3' };

    parseQuery(windowSchema, value);

    expect(value).toStrictEqual({ page: '3' });
  });

  it('accepts an options bag with nothing in it', () => {
    expect(parseBody(termSchema, VALID_TERM, {})).toStrictEqual(VALID_TERM);
    expect(parseQuery(windowSchema, {}, {})).toStrictEqual({ page: 1 });
  });
});

// ---------------------------------------------------------------------------
// What is refused, and what the refusal is allowed to say
// ---------------------------------------------------------------------------

describe('a parse that fails', () => {
  for (const row of REFUSAL_CASES) {
    it(`answers a detail per issue for ${row.label}`, () => {
      expect(refusalOf(() => parseBody(row.schema, row.value)))
        .toEqual(row.details);
    });

    it(`answers the same detail through either parser for ${row.label}`, () => {
      expect(refusalOf(() => parseQuery(row.schema, row.value)))
        .toEqual(refusalOf(() => parseBody(row.schema, row.value)));
    });

    it(`answers none of zod's own wording for ${row.label}`, () => {
      const answered = refusalOf(() => parseBody(row.schema, row.value))
        .map((detail) => detail.message);
      const raised = zodMessagesFor(row.schema, row.value);

      // The control on the control: zod raised as many issues as the
      // row expects details, so a row whose value stopped failing
      // cannot pass this by comparing two empty lists.
      expect(raised.length).toBe(row.details.length);
      expect(answered.filter((message) => raised.includes(message)))
        .toEqual([]);
    });
  }

  it('throws the error the framework answers 422 for', () => {
    expect(() => parseBody(termSchema, {})).toThrow(ValidationError);
  });

  it('carries the whole failure envelope on the thrown error', () => {
    let thrown: ValidationError | null = null;

    try {
      parseBody(termSchema, { ...VALID_TERM, polarity: 'sideways' });
    } catch (err) {
      thrown = err instanceof ValidationError
        ? err
        : null;
    }

    expect(thrown?.statusCode).toBe(422);
    expect(Object.keys(thrown?.toJSON() ?? {}).sort())
      .toEqual(['code', 'details', 'message']);
    expect(thrown?.toJSON().code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// The root, which has no path of its own
// ---------------------------------------------------------------------------

describe('an issue raised against the root', () => {
  for (const row of ROOT_CASES) {
    it(`names ${row.label} by the parser that read it`, () => {
      const details = refusalOf(() => row.parse(termSchema, 'not an object'));

      expect(details).toEqual([
        {
          field: row.rootField,
          message: MISSING_OR_WRONG_TYPE,
          code: 'invalid_type',
        },
      ]);
    });

    it(`gives ${row.label} a name zod did not supply`, () => {
      // Zod reports a root issue with an EMPTY path, which is what
      // `zodToValidationError` would turn into `field: ''`. The name
      // is this module's, and this is the row that says so.
      const raised = termSchema.safeParse('not an object');
      const paths = raised.success
        ? []
        : raised.error.issues.map((issue) => issue.path.length);

      expect(paths).toEqual([0]);
      expect(row.rootField).not.toBe('');
    });
  }
});
