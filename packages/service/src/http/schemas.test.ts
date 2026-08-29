/**
 * `slugParamSchema`, `resourceIdParamSchema`, `paginationQuerySchema`
 * and `toStoreWindow` — everything a wave-1 route reads its address
 * through, before it reads a body.
 *
 * Five claims, and each one is a promise a route makes to a caller
 * that only ever sees a status and an envelope. That a domain is
 * addressed by a slug the app can also build a link from, so the two
 * ends of the eventual API swap agree about which strings are
 * reachable. That an id that never named a row is refused at the
 * boundary as a 422 rather than answered as a 404 by a store that was
 * asked about `NaN`. That an over-cap window is refused rather than
 * quietly lowered, so a client's own page arithmetic cannot walk off
 * the end of a collection. That an absent query is a success carrying
 * both defaults, since that is the shape a list route sees most
 * often. And that a refusal names the parameter that caused it, which
 * is the whole of what a detail is allowed to say.
 *
 * Every table here carries BOTH outcomes, and a guard per table
 * asserts it. A block of nothing but refusals is fully green against
 * a schema that refuses everything, and a block of nothing but
 * accepts is fully green against one that accepts everything; the
 * accepted rows and the refused rows are each other's control, and
 * the set-equality guards are what stop a later edit from deleting
 * one side. The two boundary pairs are guarded the same way and for
 * the same reason: a cap is only pinned by a row on each side of it,
 * so `perPage` 200 sits beside 201, and the largest safe integer sits
 * beside a value two above it.
 *
 * Expected values are written down rather than imported. The cap, the
 * two defaults and the safe-integer bound appear here as literals, so
 * this file pins them; importing them would only assert that the
 * module agrees with itself.
 *
 * Mutation grid, measured over the 52 cases in this file with
 * `--reporter=json` and confirmed by a second full pass. Nine legs on
 * the module, each isolating one claim, and the two slug legs are
 * each other's control: a pattern accepting everything reddens the 7
 * refused slug cases and nothing else, one accepting nothing reddens
 * the 5 accepted cases and nothing else. Dropping `.positive()` from
 * the id schema reddens exactly its 3 `too_small` cases, and dropping
 * `.int()` exactly its 2 others — the fraction and the id above the
 * safe bound — which is what says the two checks are pinned
 * separately rather than as one. Raising the cap to 1000 reddens the
 * one case past it; removing `.strict()` reddens the one misspelt
 * parameter; lowering the default `perPage` to 25 reddens 3, the two
 * accepted rows that expect 50 and the translation case built on one.
 * Turning `(page - 1) * perPage` into `page * perPage` reddens all 5
 * `toStoreWindow` cases.
 *
 * The ninth leg is the one worth reading rather than counting.
 * Swapping `limit` and `offset` reddens 4 of those 5 and leaves
 * `translates the second page` green — page 2 at 50 per page has
 * `limit` and `offset` both 50, so the row cannot see the swap at
 * all. A window table made only of such rows would prove nothing
 * about which member is which, which is why the first page and the
 * deep small window are in it.
 *
 * What no module mutation reaches: the four table guards, which read
 * only the tables beside them. They are aimed at a later edit rather
 * than at the module — an accepted or refused side deleted whole, a
 * cap left with no row on one side of it, a refusal class dropped.
 */
import type { ZodSafeParseResult } from 'zod';

import { describe, expect, it } from 'vitest';

import {
  paginationQuerySchema,
  resourceIdParamSchema,
  slugParamSchema,
  toStoreWindow,
} from './schemas.js';

/**
 * The `perPage` ceiling, written down rather than imported, so a
 * change to the module's own constant is a red case here and not a
 * silent agreement.
 */
const CAP = 200;

/**
 * The largest integer a JavaScript `number` holds exactly. The bound
 * `.int()` enforces, restated rather than read off `Number`, so this
 * file pins the id ceiling instead of deriving it from the same
 * source the module does.
 */
const LARGEST_SAFE_ID = 9007199254740991;

/** The two outcomes every table below has to carry rows for. */
const OUTCOMES = ['accepted', 'refused'];

/**
 * One slug, and whether an address may be built from it. A refused
 * row carries the issue `code` it is refused WITH, so the table says
 * why each string is out rather than only that it is.
 */
type SlugCase =
  | {
    readonly label: string;
    readonly outcome: 'accepted';
    readonly input: string;
  }
  | {
    readonly label: string;
    readonly outcome: 'refused';
    readonly input: string;
    readonly code: string;
  };

/**
 * The slug shapes the pattern has to separate.
 *
 * `example-tech-radar` is the slug `data/domains.json` seeds, so the
 * first row is the claim that the worked example is addressable at
 * all. The doubled and trailing hyphens are accepted on purpose:
 * `packages/web/src/routes/paths.ts` accepts them, and this schema
 * checks that a string can BE an address rather than that it is a
 * canonical one.
 */
const SLUG_CASES: readonly SlugCase[] = [
  {
    label: 'the seeded worked example', outcome: 'accepted',
    input: 'example-tech-radar',
  },
  { label: 'a single character', outcome: 'accepted', input: 'a' },
  { label: 'a digit opener', outcome: 'accepted', input: '9lives' },
  { label: 'a doubled hyphen', outcome: 'accepted', input: 'a--b' },
  { label: 'a trailing hyphen', outcome: 'accepted', input: 'ab-' },
  {
    label: 'a leading hyphen', outcome: 'refused',
    input: '-ab', code: 'invalid_format',
  },
  {
    label: 'a bare hyphen', outcome: 'refused',
    input: '-', code: 'invalid_format',
  },
  {
    label: 'an empty segment', outcome: 'refused',
    input: '', code: 'invalid_format',
  },
  {
    label: 'an uppercase letter', outcome: 'refused',
    input: 'Example', code: 'invalid_format',
  },
  {
    label: 'a decoded path separator', outcome: 'refused',
    input: 'a/b', code: 'invalid_format',
  },
  {
    label: 'an inner space', outcome: 'refused',
    input: 'a b', code: 'invalid_format',
  },
  {
    label: 'an underscore', outcome: 'refused',
    input: 'a_b', code: 'invalid_format',
  },
];

/**
 * An id two above {@link LARGEST_SAFE_ID}, as a string. Written out
 * rather than computed, because computing it is the very arithmetic
 * it exists to be refused for: `LARGEST_SAFE_ID + 2` evaluates to
 * `LARGEST_SAFE_ID + 1`.
 */
const ID_ABOVE_SAFE = '9007199254740993';

/** One `:id` segment, and the row number it names — or nothing. */
type IdCase =
  | {
    readonly label: string;
    readonly outcome: 'accepted';
    readonly input: unknown;
    readonly parsed: number;
  }
  | {
    readonly label: string;
    readonly outcome: 'refused';
    readonly input: unknown;
    readonly code: string;
  };

/**
 * The `:id` shapes the coercion has to separate, and the issue each
 * refusal reports.
 *
 * The three codes are three different failures and the table keeps
 * them apart: `invalid_type` is coercion having produced `NaN` or a
 * fraction, `too_small` is a number that is in range for a `number`
 * and out of range for a key, and `too_big` is the safe-integer bound
 * `.int()` carries.
 */
const ID_CASES: readonly IdCase[] = [
  { label: 'a plain id', outcome: 'accepted', input: '42', parsed: 42 },
  {
    label: 'the first id a sequence issues', outcome: 'accepted',
    input: '1', parsed: 1,
  },
  {
    label: 'the largest safe id', outcome: 'accepted',
    input: '9007199254740991', parsed: LARGEST_SAFE_ID,
  },
  { label: 'a zero id', outcome: 'refused', input: '0', code: 'too_small' },
  { label: 'a negative id', outcome: 'refused', input: '-1', code: 'too_small' },
  {
    label: 'a non-numeric id', outcome: 'refused',
    input: 'abc', code: 'invalid_type',
  },
  {
    label: 'a fractional id', outcome: 'refused',
    input: '1.5', code: 'invalid_type',
  },
  { label: 'an empty segment', outcome: 'refused', input: '', code: 'too_small' },
  {
    label: 'a value repeated into an array', outcome: 'refused',
    input: ['1', '2'], code: 'invalid_type',
  },
  {
    label: 'an id two above the largest safe one', outcome: 'refused',
    input: ID_ABOVE_SAFE, code: 'too_big',
  },
];

/** A query as Express hands one over: strings, or arrays of them. */
type Query = Readonly<Record<string, string | readonly string[]>>;

/**
 * One query string, and the window it opens — or the field a detail
 * would name beside the issue it carries.
 */
type PaginationCase =
  | {
    readonly label: string;
    readonly outcome: 'accepted';
    readonly query: Query;
    readonly parsed: { readonly page: number; readonly perPage: number };
  }
  | {
    readonly label: string;
    readonly outcome: 'refused';
    readonly query: Query;
    readonly field: string;
    readonly code: string;
  };

/**
 * The windows the query schema has to separate, and for each refusal
 * the field path a detail is entitled to name.
 *
 * `field` is `''` on the misspelt-parameter row because a strict
 * object reports its refusal against the path of the object that did
 * the refusing, and the query object is the root. That empty path is
 * exactly why `src/http/validation.ts` has to give the root a name of
 * its own rather than pass the path through.
 */
const PAGINATION_CASES: readonly PaginationCase[] = [
  {
    label: 'an absent query', outcome: 'accepted',
    query: {}, parsed: { page: 1, perPage: 50 },
  },
  {
    label: 'a page alone', outcome: 'accepted',
    query: { page: '3' }, parsed: { page: 3, perPage: 50 },
  },
  {
    label: 'a perPage alone', outcome: 'accepted',
    query: { perPage: '10' }, parsed: { page: 1, perPage: 10 },
  },
  {
    label: 'both parameters', outcome: 'accepted',
    query: { page: '2', perPage: '25' }, parsed: { page: 2, perPage: 25 },
  },
  {
    label: 'a perPage exactly at the cap', outcome: 'accepted',
    query: { perPage: '200' }, parsed: { page: 1, perPage: CAP },
  },
  {
    label: 'a perPage one past the cap', outcome: 'refused',
    query: { perPage: '201' }, field: 'perPage', code: 'too_big',
  },
  {
    label: 'a page below 1', outcome: 'refused',
    query: { page: '0' }, field: 'page', code: 'too_small',
  },
  {
    label: 'a negative page', outcome: 'refused',
    query: { page: '-1' }, field: 'page', code: 'too_small',
  },
  {
    label: 'a fractional perPage', outcome: 'refused',
    query: { perPage: '2.5' }, field: 'perPage', code: 'invalid_type',
  },
  {
    label: 'a non-numeric page', outcome: 'refused',
    query: { page: 'abc' }, field: 'page', code: 'invalid_type',
  },
  {
    label: 'an empty page value', outcome: 'refused',
    query: { page: '' }, field: 'page', code: 'too_small',
  },
  {
    label: 'a page repeated into an array', outcome: 'refused',
    query: { page: ['1', '2'] }, field: 'page', code: 'invalid_type',
  },
  {
    label: 'a misspelt parameter', outcome: 'refused',
    query: { pge: '2' }, field: '', code: 'unrecognized_keys',
  },
];

/** One parsed window, and the SQL window it translates to. */
interface WindowCase {
  readonly label: string;
  readonly page: number;
  readonly perPage: number;
  readonly limit: number;
  readonly offset: number;
}

/** The windows the translation has to get right, first page included. */
const WINDOW_CASES: readonly WindowCase[] = [
  { label: 'the first page', page: 1, perPage: 50, limit: 50, offset: 0 },
  { label: 'the second page', page: 2, perPage: 50, limit: 50, offset: 50 },
  {
    label: 'a small window deep in a collection',
    page: 4, perPage: 10, limit: 10, offset: 30,
  },
  { label: 'a page at the cap', page: 3, perPage: 200, limit: 200, offset: 400 },
];

/**
 * How many rows sit before `page`, counted by adding one window per
 * page skipped rather than by multiplying. It shares no operation
 * with the module under test, so a row whose expected `offset` merely
 * agrees with `(page - 1) * perPage` cannot pass unnoticed.
 */
function skippedByCountingPages(page: number, perPage: number): number {
  let skipped = 0;

  for (let seen = 1; seen < page; seen += 1) {
    skipped += perPage;
  }

  return skipped;
}

/** The outcomes a table carries, deduplicated and sorted. */
function outcomesOf(rows: readonly { readonly outcome: string }[]): string[] {
  return [...new Set(rows.map((row) => row.outcome))].sort();
}

/**
 * What a refused parse reported, as `code` and dotted field path
 * pairs — the two facts a `ValidationError` detail is built from, and
 * the only two this file reads off an issue. Zod's own `message` is
 * deliberately never asserted: it is the member that carries
 * submitted content, and pinning its wording here would make a zod
 * minor a red suite in this package for no behaviour change.
 *
 * A parse that SUCCEEDED answers an empty list rather than throwing,
 * so a case expecting a refusal fails on the empty list — naming what
 * it wanted — instead of on a narrowing error.
 */
function refusalOf<T>(
  result: ZodSafeParseResult<T>,
): { code: string; field: string }[] {
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    code: issue.code,
    field: issue.path.join('.'),
  }));
}

// ---------------------------------------------------------------------------
// slugParamSchema
// ---------------------------------------------------------------------------

describe('slugParamSchema', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesOf(SLUG_CASES)).toEqual(OUTCOMES);
  });

  it('labels every row distinctly', () => {
    const labels = SLUG_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  for (const row of SLUG_CASES) {
    if (row.outcome === 'accepted') {
      it(`accepts ${row.label}`, () => {
        expect(slugParamSchema.parse(row.input)).toBe(row.input);
      });

      continue;
    }

    it(`refuses ${row.label}`, () => {
      const result = slugParamSchema.safeParse(row.input);

      expect(refusalOf(result)).toEqual([{ code: row.code, field: '' }]);
    });
  }

  it('refuses a value that is not a string at all', () => {
    const result = slugParamSchema.safeParse(5);

    expect(refusalOf(result)).toEqual([{ code: 'invalid_type', field: '' }]);
  });
});

// ---------------------------------------------------------------------------
// resourceIdParamSchema
// ---------------------------------------------------------------------------

describe('resourceIdParamSchema', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesOf(ID_CASES)).toEqual(OUTCOMES);
  });

  it('brackets the bound where coercion stops being lossless', () => {
    const accepted = ID_CASES.filter(
      (row) => row.outcome === 'accepted' && row.input === String(LARGEST_SAFE_ID),
    );
    const refused = ID_CASES.filter(
      (row) => row.outcome === 'refused' && row.input === ID_ABOVE_SAFE,
    );

    // The premise the refused side is worth having for: that string
    // does not survive `Number` as itself, it lands on its neighbour.
    expect(Number(ID_ABOVE_SAFE)).toBe(LARGEST_SAFE_ID + 1);
    expect([accepted.length, refused.length]).toEqual([1, 1]);
  });

  it('names a distinct reason for each class of refusal', () => {
    const refused = ID_CASES.filter((row) => row.outcome === 'refused');
    const codes = [...new Set(refused.map((row) => row.code))].sort();

    expect(codes).toEqual(['invalid_type', 'too_big', 'too_small']);
  });

  for (const row of ID_CASES) {
    if (row.outcome === 'accepted') {
      it(`accepts ${row.label}`, () => {
        expect(resourceIdParamSchema.parse(row.input)).toBe(row.parsed);
      });

      continue;
    }

    it(`refuses ${row.label}`, () => {
      const result = resourceIdParamSchema.safeParse(row.input);

      expect(refusalOf(result)).toEqual([{ code: row.code, field: '' }]);
    });
  }
});

// ---------------------------------------------------------------------------
// paginationQuerySchema
// ---------------------------------------------------------------------------

describe('paginationQuerySchema', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesOf(PAGINATION_CASES)).toEqual(OUTCOMES);
  });

  it('brackets the cap with an accepted row and a refused one', () => {
    const atCap = PAGINATION_CASES.filter(
      (row) => row.outcome === 'accepted' && row.query.perPage === String(CAP),
    );
    const pastCap = PAGINATION_CASES.filter(
      (row) => row.outcome === 'refused' && row.query.perPage === String(CAP + 1),
    );

    expect([atCap.length, pastCap.length]).toEqual([1, 1]);
  });

  it('refuses against every field a detail can name', () => {
    const refused = PAGINATION_CASES.filter((row) => row.outcome === 'refused');
    const fields = [...new Set(refused.map((row) => row.field))].sort();

    expect(fields).toEqual(['', 'page', 'perPage']);
  });

  for (const row of PAGINATION_CASES) {
    if (row.outcome === 'accepted') {
      it(`accepts ${row.label}`, () => {
        expect(paginationQuerySchema.parse(row.query)).toStrictEqual(row.parsed);
      });

      continue;
    }

    it(`refuses ${row.label}`, () => {
      const result = paginationQuerySchema.safeParse(row.query);

      expect(refusalOf(result)).toEqual([{ code: row.code, field: row.field }]);
    });
  }

  it('leaves the query object it was handed untouched', () => {
    const query = { page: '2' };

    paginationQuerySchema.parse(query);

    expect(query).toStrictEqual({ page: '2' });
  });
});

// ---------------------------------------------------------------------------
// toStoreWindow
// ---------------------------------------------------------------------------

describe('toStoreWindow', () => {
  it('expects a skipped-row count derived by counting, not by multiplying', () => {
    const wrong = WINDOW_CASES.filter(
      (row) => row.offset !== skippedByCountingPages(row.page, row.perPage),
    );

    expect(wrong.map((row) => row.label)).toEqual([]);
  });

  it('covers the first page, where the off-by-one is loudest', () => {
    expect(WINDOW_CASES.map((row) => row.page)).toContain(1);
  });

  for (const row of WINDOW_CASES) {
    it(`translates ${row.label}`, () => {
      const window = toStoreWindow({ page: row.page, perPage: row.perPage });

      expect(window).toStrictEqual({ limit: row.limit, offset: row.offset });
    });
  }

  it('translates a parsed absent query into the first window', () => {
    const window = toStoreWindow(paginationQuerySchema.parse({}));

    expect(window).toStrictEqual({ limit: 50, offset: 0 });
  });
});
