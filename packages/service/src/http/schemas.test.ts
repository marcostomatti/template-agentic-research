/**
 * `slugParamSchema`, `resourceIdParamSchema`, `paginationQuerySchema`
 * and `toStoreWindow` — everything a route reads its address
 * through, before it reads a body — and `timeWindowQuerySchema`,
 * `sortQuerySchema` and `toTimeWindow` beside them, which is how a
 * collection is narrowed and ordered once it has been addressed.
 *
 * Twelve claims, and each one is a promise a route makes to a caller
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
 * The four the window and the sort add are the same kind of promise.
 * That a bound is an instant rather than a wall-clock reading, so two
 * deployments narrowing by one stamp hold the same rows. That an
 * inverted or empty window is a refusal rather than a swap or a
 * clamp, on the argument the over-cap `perPage` already loses. That
 * an ordering is asked for by a declared key and never by a column
 * name. And that a narrowing sent to a route which declares none is
 * a refusal rather than a filter quietly dropped.
 *
 * Three more are what the accepted half is for, and not one of them
 * shows up in a refusal. That an absent bound reaches a store as an
 * open end rather than as an endpoint the translation invented.
 * That a row stamped exactly at a bound lands on the side the
 * member names claim, `sinceInclusive` holding it and
 * `untilExclusive` not. And that a `?sort` nobody sent is the first
 * key of the declaring route's own tuple, through the composed
 * query a list route parses rather than through the sort schema
 * alone.
 *
 * Every wave-1 table here carries BOTH outcomes, and a guard per
 * table asserts it. A block of nothing but refusals is fully green
 * against a schema that refuses everything, and a block of nothing
 * but accepts is fully green against one that accepts everything; the
 * accepted rows and the refused rows are each other's control, and
 * the set-equality guards are what stop a later edit from deleting
 * one side. The two boundary pairs are guarded the same way and for
 * the same reason: a cap is only pinned by a row on each side of it,
 * so `perPage` 200 sits beside 201, and the largest safe integer sits
 * beside a value two above it.
 *
 * The window and sort refusal table carries its control INSIDE each
 * case rather than beside it: every row states the same request with
 * its own axis put right, which has to parse. That is the same
 * argument in the shape the section needs — a table of accepts
 * could not be a control for a row refused by a DIFFERENT schema,
 * which two of these rows are, and an axis-wise control can. Each
 * row also submits a sentinel and counts it to zero in the
 * serialised refusal, against a planted envelope that has to find
 * every one of them.
 *
 * The accepted window table answers the same problem in the other
 * direction and for the mirror reason: a block of nothing but
 * accepts is green against a schema that accepts everything, so
 * every row carries the same request with its own axis put WRONG,
 * which has to be refused. The row a reader would think needs no
 * control has the sharpest one — `{}` parses because it is empty
 * and every parameter is declared rather than because the schema
 * takes what it is given, so its broken sibling is an undeclared
 * key and not a bad bound.
 *
 * The boundary table is neither shape. It reads a window built
 * through the schema and the translation with a predicate written
 * here, because there is nothing to import: the half-open rule
 * lives in two sentences of TSDoc on `TimeWindow`'s own members and
 * in no code at all until a store exists. So the table IS the
 * control — two rows at the bounds and three around them, where a
 * predicate answering one way for everything reddens one group or
 * the other.
 *
 * Expected values are written down rather than imported. The cap, the
 * two defaults and the safe-integer bound appear here as literals, so
 * this file pins them; importing them would only assert that the
 * module agrees with itself. The two accepted instants are a
 * sharper version of the same rule: they are written as calendar
 * FIELDS through `Date.UTC` rather than parsed from the stamps
 * beside them, because parsing those stamps is the operation under
 * test and an expected instant derived through `Date.parse` would
 * agree with a schema that had read them wrongly in exactly the
 * same way.
 *
 * Mutation grid, measured over the 97 cases in this file with
 * `--reporter=json` — and measured a SECOND time over the 76 cases
 * the file held before the accepted half landed, so which figures
 * MOVED is a reading rather than a recollection. Thirteen of the
 * eighteen carried-in legs held unchanged at the widened total,
 * five moved, and seven legs are new. Four of those seven reddened
 * NOTHING at all against the file as it stood, which is the
 * sharpest thing this section can say about what the accepted half
 * was for.
 *
 * The address legs are unmoved except where they are composed into.
 * The two slug legs are each other's control: a pattern accepting
 * everything reddens the 7 refused slug cases and nothing else, one
 * accepting nothing reddens the 5 accepted cases and nothing else.
 * Dropping `.positive()` from the id schema reddens exactly its 3
 * `too_small` cases, and dropping `.int()` exactly its 2 others —
 * the fraction and the id above the safe bound — which is what
 * says the two checks are pinned separately rather than as one.
 * Raising the cap to 1000 reddens the one case past it. Turning
 * `(page - 1) * perPage` into `page * perPage` reddens all 5
 * `toStoreWindow` cases; swapping `limit` and `offset` reddens 4 of
 * them, page 2 at 50 per page having both members at 50, which is
 * why the first page and the deep small window are in the table.
 *
 * Lowering the default `perPage` to 25 reddens 4 where it reddened
 * 3, and the case it gained is worth reading rather than counting:
 * the composed list query's default row parses `{}` through all
 * three vocabularies at once, so the page defaults are pinned there
 * as well as in their own section. Removing `.strict()` from
 * `paginationQuerySchema` still reddens 3 — the misspelt
 * parameter it was written for, plus the window section's
 * undeclared-bound row and its containment sibling — so the page
 * schema's strictness is what refuses a `?since` sent to a route
 * declaring no window.
 *
 * On the window and the sort, four legs held. Naming `until` in the
 * issue path instead of `since` reddens the 3 field assertions and
 * no containment case. Turning the ordering `<` into `<=` reddens
 * exactly 2, the equal-bounds row and its sibling — which is
 * what says `at` is pinned separately from `after`, a distinction
 * one inverted row would have collapsed. Widening `sortQuerySchema`
 * from `z.enum(keys)` to a free string reddens the 2 sort cases.
 * And the TEST-side leg composing the list query the other way
 * round — `paginationQuerySchema` extended with the window's
 * shape — reddens 2, both belonging to the composed row, which
 * is the whole of what reports that `.extend()` carries an object
 * refinement outwards and not inwards.
 *
 * Replacing `z.iso.datetime` with `z.coerce.date()` still reddens 1
 * and not 2, and the case that stays green is the point: a `Date`
 * coercion still refuses `sentinel-not-a-stamp`, just with a
 * different code, so only the row asserting the code moves. A
 * containment count is blind to which rule did the refusing, which
 * is why the two live in separate cases.
 *
 * Dropping the ordering refinement reddens 7 where it reddened 6:
 * the three ordering rows with their three containment siblings,
 * and now the accepted both-bounds row's own broken control, which
 * is an inverted window and has to stay refused.
 *
 * The three legs that prove the refusal table's positive controls
 * live all GREW, because the accepted rows are driven by the same
 * schema. A window schema refusing every HALF-bounded window
 * reddens 5 where it reddened 3, gaining the two half-bounded
 * translation rows. One refusing every ORDERED window reddens 9
 * where it reddened 3, gaining the both-bounds translation row and
 * all five boundary rows, every one of which reads a two-bounded
 * window. And a sort tuple declaring neither key reddens 5 where it
 * reddened 1, gaining all four of the sort section's cases.
 *
 * Four legs reddened nothing before and report now, which is the
 * accepted half stated as a measurement rather than as a claim.
 * `toTimeWindow` answering `new Date(0)` instead of `null` for an
 * absent bound reddens 3, every row with an open end. Swapping its
 * two members reddens 5, the three bounded translation rows and the
 * two boundary rows a swap can move — the other three expect a
 * row to be OUT, and the swapped window holds nothing at all.
 * `sortQuerySchema` without its `.default(keys[0])` reddens 2, the
 * bare default and the composed one. And `timeWindowQuerySchema`
 * without `.strict()` reddens 1, the unbounded row's
 * undeclared-key control, which is the only case in the file that
 * asks the window schema to refuse a key.
 *
 * Three further legs are new for other reasons. A bound schema
 * accepting any string at all reddens 4 where it would have
 * reddened 2 — the refusal table's not-a-stamp row with its
 * containment sibling, and now the two half-bounded rows' broken
 * controls, which is what shows those controls are refused by the
 * FORMAT rather than by something else. The two TEST-side legs on
 * the boundary predicate could not have run at all before, the
 * predicate being new; they are that table's own proof: answering
 * `true` for everything reddens the 3 rows the window drops,
 * answering `false` for everything reddens the 2 it holds, so
 * neither answer leaves a row that could not tell.
 *
 * What no module mutation reaches: the table guards, which read only
 * the tables beside them — an accepted or refused side deleted
 * whole, a cap left with no row on one side of it, a refusal class
 * dropped, a bound combination nothing asks for, a sentinel that
 * stopped being distinct from its neighbours, and the planted
 * envelope that keeps every containment zero honest.
 */
import type { TimeWindow } from './schemas.js';
import type { ZodSafeParseResult, ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../lib/errors/index.js';

import {
  paginationQuerySchema,
  resourceIdParamSchema,
  slugParamSchema,
  sortQuerySchema,
  timeWindowQuerySchema,
  toStoreWindow,
  toTimeWindow,
} from './schemas.js';
import { parseQuery } from './validation.js';

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

// ---------------------------------------------------------------------------
// timeWindowQuerySchema and sortQuerySchema — what they refuse
// ---------------------------------------------------------------------------

/**
 * The orderings a findings list declares, as the tuple a route
 * hands {@link sortQuerySchema}. Written out here rather than
 * imported from a route that does not exist yet, which is also what
 * makes it a caller-supplied tuple in the test as it is in life.
 */
const SORT_KEYS = ['score', 'recency'] as const;

/** The `?sort` vocabulary those two keys open. */
const sortSchema = sortQuerySchema(SORT_KEYS);

/**
 * The query a findings list is read through: the window, extended
 * with the page and the sort.
 *
 * COMPOSED IN THIS DIRECTION ON PURPOSE. The ordering check is a
 * refinement on the window OBJECT, and `.extend()` carries it only
 * outwards — measured against this tree's zod, the reverse
 * spelling `paginationQuerySchema.extend(timeWindowQuerySchema
 * .shape)` type-checks, answers every other row here identically,
 * and ACCEPTS an inverted window. The last row of the table below
 * is the whole of what reports that, and it is aimed at a later
 * route composing the other way round rather than at anything in
 * `./schemas.ts`.
 */
const findingListQuerySchema = timeWindowQuerySchema
  .extend(paginationQuerySchema.shape)
  .extend(sortSchema.shape);

/**
 * A stamp that is not one, submitted where a bound belongs.
 *
 * Nothing about it is date-shaped, deliberately. A near-miss like
 * `2026-13-01` would share long runs with the real stamps beside
 * it, and a containment count is a substring search — so the two
 * would have to be read together rather than one row at a time.
 */
const SENTINEL_STAMP = 'sentinel-not-a-stamp';

/** A sort key no route declares, submitted as one. */
const SENTINEL_SORT_KEY = 'sentinel_sort_key';

/** The `since` of an inverted window, submitted as a bound. */
const SENTINEL_AFTER = '2099-11-22T13:14:15Z';

/**
 * The earlier of the two instants the ordering rows are built from.
 *
 * NOT a sentinel and deliberately not in the roster below: it is
 * the `until` of one inverted window, the `until` of another, and
 * the `since` of two controls, so a count against it could not say
 * which row had leaked it. Each ordering row keeps its own needle
 * on the `since` it alone submits.
 */
const EARLY_STAMP = '1999-03-04T05:06:07Z';

/** Both bounds of an empty window, submitted as the same instant. */
const SENTINEL_EQUAL = '2044-05-06T07:08:09Z';

/** A bound submitted to a route that declares no window at all. */
const SENTINEL_UNDECLARED = '2031-06-07T08:09:10Z';

/** The `since` of an inverted window sent through a composed query. */
const SENTINEL_COMPOSED = '2098-10-09T08:07:06Z';

/**
 * Every string the rows below submit. None is a substring of
 * another — asserted rather than asserted about, since a needle
 * contained in a second needle would make one row's zero
 * satisfiable by the other's absence.
 */
const WINDOW_SENTINELS = [
  SENTINEL_STAMP,
  SENTINEL_SORT_KEY,
  SENTINEL_AFTER,
  SENTINEL_EQUAL,
  SENTINEL_UNDECLARED,
  SENTINEL_COMPOSED,
];

/**
 * One refused query, what it is refused WITH, and the request that
 * differs from it only along the axis under test.
 */
interface WindowRefusalCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The schema the refused query is parsed against. */
  readonly schema: ZodType;

  /** The query, carrying {@link WindowRefusalCase.needle}. */
  readonly query: Query;

  /**
   * The parameter this row varies, and the member its control has
   * to come back carrying. Not always the field a detail names: a
   * bound sent to a schema that declares no window is a fault
   * against the query OBJECT, so the axis is `since` and the field
   * is the root.
   */
  readonly axis: string;

  /** The dotted path the detail names. */
  readonly field: string;

  /** The issue code the detail carries. */
  readonly code: string;

  /** The submitted string the refusal must not carry back. */
  readonly needle: string;

  /**
   * The same request with the axis put right, which has to parse.
   *
   * The positive control, in the case rather than beside it: every
   * assertion above it passes against a schema that refuses
   * everything, and this is the one that does not.
   */
  readonly control: {
    readonly schema: ZodType;
    readonly query: Query;
  };
}

/**
 * The four refusal classes this section is for, plus the two rows
 * that separate claims a single row would collapse.
 *
 * `at or after` is two facts. An inverted window is refused by any
 * comparison at all, while an EMPTY one — the same instant sent
 * twice — is refused only by the strict `<` the module carries, so
 * a table without that row stays green against a rule that accepts
 * a window holding nothing.
 *
 * The last row is the composition claim rather than a schema claim.
 * It sends the same inverted window as the second row through the
 * query a list route actually parses, which is the only place the
 * `.extend()` direction can be reported.
 */
const WINDOW_REFUSAL_CASES: readonly WindowRefusalCase[] = [
  {
    label: 'a bound that is not a stamp',
    schema: timeWindowQuerySchema,
    query: { since: SENTINEL_STAMP },
    axis: 'since', field: 'since', code: 'invalid_format',
    needle: SENTINEL_STAMP,
    control: {
      schema: timeWindowQuerySchema,
      query: { since: '2026-01-02T03:04:05Z' },
    },
  },
  {
    label: 'a since after its until',
    schema: timeWindowQuerySchema,
    query: { since: SENTINEL_AFTER, until: EARLY_STAMP },
    axis: 'since', field: 'since', code: 'custom',
    needle: SENTINEL_AFTER,
    control: {
      schema: timeWindowQuerySchema,
      query: { since: EARLY_STAMP, until: SENTINEL_AFTER },
    },
  },
  {
    label: 'a since exactly at its until',
    schema: timeWindowQuerySchema,
    query: { since: SENTINEL_EQUAL, until: SENTINEL_EQUAL },
    axis: 'since', field: 'since', code: 'custom',
    needle: SENTINEL_EQUAL,
    control: {
      schema: timeWindowQuerySchema,
      query: { since: SENTINEL_EQUAL, until: '2044-05-06T07:08:10Z' },
    },
  },
  {
    label: 'a sort key outside the declared tuple',
    schema: sortSchema,
    query: { sort: SENTINEL_SORT_KEY },
    axis: 'sort', field: 'sort', code: 'invalid_value',
    needle: SENTINEL_SORT_KEY,
    control: { schema: sortSchema, query: { sort: 'recency' } },
  },
  {
    label: 'a bound beside a page on a route declaring no window',
    schema: paginationQuerySchema,
    query: { page: '2', since: SENTINEL_UNDECLARED },
    axis: 'since', field: 'query', code: 'unrecognized_keys',
    needle: SENTINEL_UNDECLARED,
    control: {
      schema: timeWindowQuerySchema,
      query: { since: SENTINEL_UNDECLARED },
    },
  },
  {
    label: 'an inverted window through a composed list query',
    schema: findingListQuerySchema,
    query: {
      page: '2', since: SENTINEL_COMPOSED, until: EARLY_STAMP,
    },
    axis: 'since', field: 'since', code: 'custom',
    needle: SENTINEL_COMPOSED,
    control: {
      schema: findingListQuerySchema,
      query: {
        page: '2', since: EARLY_STAMP, until: SENTINEL_COMPOSED,
      },
    },
  },
];

/**
 * Runs a parse that has to be refused, and answers the refusal.
 *
 * @param run - The parse.
 * @returns The `ValidationError` it threw.
 * @throws Error - When the parse ANSWERED, naming that rather than
 *   failing on a property of `undefined` three lines later.
 */
function validationErrorFrom(run: () => unknown): ValidationError {
  try {
    run();
  } catch (err) {
    if (err instanceof ValidationError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the parse answered');
}

/**
 * The two facts a caller reads off each detail: where the fault is
 * and what kind it is.
 *
 * `message` is deliberately not among them, on the rule the wave-1
 * half of this file already states — it is the member that would
 * carry submitted content if anything did, and the containment
 * assertion below reads the whole serialised refusal rather than
 * trusting a field-by-field list.
 *
 * @param err - The refusal.
 * @returns One `{ field, code }` per detail, in the order raised.
 */
function detailsOf(err: ValidationError): { field: string; code: string }[] {
  return (err.details ?? []).map((detail) => ({
    field: detail.field,
    code: detail.code ?? '',
  }));
}

/**
 * How many times `needle` occurs in `haystack`.
 *
 * @param haystack - The text searched.
 * @param needle - The string looked for.
 * @returns The count, `0` when it is absent.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('what a window or a sort refuses', () => {
  it('labels every row distinctly', () => {
    const labels = WINDOW_REFUSAL_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('submits each sentinel through one row and one channel', () => {
    const needles = WINDOW_REFUSAL_CASES.map((row) => row.needle);

    expect([...needles].sort()).toEqual([...WINDOW_SENTINELS].sort());
  });

  it('keeps no sentinel inside another', () => {
    const contained = WINDOW_SENTINELS.filter((needle) => WINDOW_SENTINELS
      .some((other) => other !== needle && other.includes(needle)));

    expect(contained).toEqual([]);
  });

  it('covers every refusal class the window vocabulary has', () => {
    const codes = WINDOW_REFUSAL_CASES.map((row) => row.code);

    expect([...new Set(codes)].sort()).toEqual([
      'custom', 'invalid_format', 'invalid_value', 'unrecognized_keys',
    ]);
  });

  it('refuses against a named parameter and against the root', () => {
    const fields = WINDOW_REFUSAL_CASES.map((row) => row.field);

    expect([...new Set(fields)].sort()).toEqual(['query', 'since', 'sort']);
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control on every zero below. A count over an
    // envelope this module did not build has to be non-zero for
    // each needle, or a zero says nothing about containment and
    // everything about the search.
    const planted = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: `Nothing matches ${SENTINEL_STAMP}`,
      details: [
        {
          field: `sort.${SENTINEL_SORT_KEY}`,
          message: `${SENTINEL_AFTER} is after ${SENTINEL_COMPOSED}`,
          code: `${SENTINEL_EQUAL}:${SENTINEL_UNDECLARED}`,
        },
      ],
    });
    const found = WINDOW_SENTINELS.map((needle) => countOccurrences(
      planted,
      needle,
    ));

    expect(found).toEqual(WINDOW_SENTINELS.map(() => 1));
  });

  for (const row of WINDOW_REFUSAL_CASES) {
    it(`refuses ${row.label}`, () => {
      const err = validationErrorFrom(() => parseQuery(row.schema, row.query));

      expect(detailsOf(err)).toEqual([{ field: row.field, code: row.code }]);
    });

    it(`answers ${row.label} without quoting it`, () => {
      const err = validationErrorFrom(() => parseQuery(row.schema, row.query));
      const answered = JSON.stringify(err.toJSON());

      // Counted rather than asserted absent: the planted control
      // above has shown this number can be something other than 0.
      expect(countOccurrences(answered, row.needle)).toBe(0);

      // The envelope was built at all — an empty string satisfies
      // the count above and nothing else here would report it.
      expect(answered.length).toBeGreaterThan(0);
    });

    it(`accepts ${row.label} put right`, () => {
      // The positive control, varied along this row's own axis.
      // Every assertion above passes against a schema that refuses
      // everything; this is the one that does not.
      const parsed = parseQuery(row.control.schema, row.control.query);

      expect(Object.keys(parsed as object)).toContain(row.axis);
    });
  }
});

// ---------------------------------------------------------------------------
// timeWindowQuerySchema, toTimeWindow and sortQuerySchema — what they take
// ---------------------------------------------------------------------------

/**
 * The instant every accepted window opens at, written as calendar
 * FIELDS rather than parsed from the stamp beside it.
 *
 * Parsing that stamp is the operation under test, so an expected
 * instant derived through `Date.parse` would agree with a schema
 * that had read it wrongly in exactly the same way. `Date.UTC`
 * takes a 0-based month, so `2` is March.
 */
const OPENS_MS = Date.UTC(2026, 2, 4, 5, 6, 7);

/** The stamp {@link OPENS_MS} is the instant of. */
const OPENS_STAMP = '2026-03-04T05:06:07Z';

/**
 * The instant every accepted window closes at, on the same terms
 * as {@link OPENS_MS}. A week later rather than a second, so no
 * row below is inside one bound and outside the other by accident.
 */
const CLOSES_MS = Date.UTC(2026, 2, 11, 5, 6, 7);

/** The stamp {@link CLOSES_MS} is the instant of. */
const CLOSES_STAMP = '2026-03-11T05:06:07Z';

/**
 * A bound that is not a stamp, submitted where one belongs.
 *
 * Deliberately neither {@link SENTINEL_STAMP} nor a substring of
 * it. Nothing counts occurrences of this string, and a needle
 * shared with the refusal table above would read as one that is.
 */
const NOT_A_BOUND = 'this-is-not-a-bound';

/**
 * One accepted window, the bounds it reaches a store as, and the
 * same request with its own axis put wrong.
 */
interface WindowAcceptCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The query, as Express hands one over. */
  readonly query: Query;

  /**
   * The lower bound as an instant, or `null` where the window is
   * open at that end. An instant rather than a `Date`, because
   * `null` and a `Date` are the two things the translation has to
   * tell apart and a number says which without being one.
   */
  readonly sinceMs: number | null;

  /** The upper bound as an instant, or `null`. */
  readonly untilMs: number | null;

  /**
   * The same request with this row's own axis put wrong, which has
   * to be refused.
   *
   * The negative control, in the case rather than beside it. Every
   * other assertion in a block of nothing but accepts is green
   * against a schema that accepts everything, and this is the one
   * that is not — which is the argument the refusal table above
   * makes in the other direction.
   */
  readonly broken: Query;
}

/**
 * The four windows a caller can ask for, and for each the request
 * that differs from it only along the axis it is about.
 *
 * The first row is the one a reader is likeliest to think needs no
 * case. An absent query is what a list route sees whenever nobody
 * narrowed anything, and `toTimeWindow` answering two `null`s for
 * it is the whole of how a store is told there is no window — a
 * translation reaching for `new Date(0)` instead would answer a
 * window nobody asked for and no schema would report it.
 *
 * Its broken sibling is a key rather than a bad bound, because the
 * row has no bound to spoil: `{}` parses because it is empty and
 * every parameter is declared, not because this schema takes what
 * it is given.
 */
const WINDOW_ACCEPT_CASES: readonly WindowAcceptCase[] = [
  {
    label: 'a window bounded at neither end',
    query: {},
    sinceMs: null, untilMs: null,
    broken: { unbounded: 'true' },
  },
  {
    label: 'a window bounded below alone',
    query: { since: OPENS_STAMP },
    sinceMs: OPENS_MS, untilMs: null,
    broken: { since: NOT_A_BOUND },
  },
  {
    label: 'a window bounded above alone',
    query: { until: CLOSES_STAMP },
    sinceMs: null, untilMs: CLOSES_MS,
    broken: { until: NOT_A_BOUND },
  },
  {
    label: 'a window bounded at both ends',
    query: { since: OPENS_STAMP, until: CLOSES_STAMP },
    sinceMs: OPENS_MS, untilMs: CLOSES_MS,
    broken: { since: CLOSES_STAMP, until: OPENS_STAMP },
  },
];

/**
 * Which of the four bound combinations a row states.
 *
 * Derived from the expected bounds rather than declared beside
 * them, so the coverage guard below cannot go on agreeing with a
 * row that has since been edited into a different shape.
 *
 * @param row - The accepted window.
 * @returns `neither`, `since`, `until` or `both`.
 */
function boundednessOf(row: WindowAcceptCase): string {
  if (row.sinceMs === null && row.untilMs === null) {
    return 'neither';
  }

  if (row.untilMs === null) {
    return 'since';
  }

  if (row.sinceMs === null) {
    return 'until';
  }

  return 'both';
}

/** A second, the step a boundary row sits either side of a bound by. */
const ONE_SECOND_MS = 1000;

/**
 * Whether a window holds a row stamped at an instant, read the way
 * the member NAMES of `TimeWindow` oblige a store to read it:
 * closed below, open above.
 *
 * Written here rather than imported because there is nothing to
 * import. The half-open rule lives in two sentences of TSDoc on
 * the interface's own members — a row stamped at
 * `sinceInclusive` is IN, one stamped at `untilExclusive` is OUT
 * — and no code states it until a store does. This function is
 * those two sentences, and the table below is what says a bound
 * stamp lands on the side each of them claims.
 *
 * @param window - The bounds a store was handed.
 * @param at - When the row is stamped.
 * @returns Whether the window holds it.
 */
function holdsRowAt(window: TimeWindow, at: Date): boolean {
  const since = window.sinceInclusive;
  const until = window.untilExclusive;

  if (since !== null && at.getTime() < since.getTime()) {
    return false;
  }

  if (until !== null && at.getTime() >= until.getTime()) {
    return false;
  }

  return true;
}

/**
 * The window every boundary row is read against: bounded at both
 * ends, so both halves of the half-open rule are in play at once.
 *
 * Built through the schema and the translation rather than by hand,
 * so a boundary row is a claim about what a route hands a store
 * and not about a literal written beside it.
 *
 * @returns The translated bounds.
 */
function boundedWindow(): TimeWindow {
  const query = { since: OPENS_STAMP, until: CLOSES_STAMP };

  return toTimeWindow(parseQuery(timeWindowQuerySchema, query));
}

/** One row's stamp, and whether {@link boundedWindow} holds it. */
interface BoundaryCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** When the row is stamped. */
  readonly atMs: number;

  /** Whether the window holds it. */
  readonly held: boolean;
}

/**
 * Five stamps across one window, of which two are the claim and
 * three are what make it discriminating.
 *
 * The two at the bounds are the half-open rule itself. The three
 * around them are the control that rule needs: a predicate
 * answering `true` for everything passes both held rows, one
 * answering `false` for everything passes all three dropped rows,
 * and only a table carrying both kinds reports either.
 */
const BOUNDARY_CASES: readonly BoundaryCase[] = [
  {
    label: 'a row stamped a second before the window opens',
    atMs: OPENS_MS - ONE_SECOND_MS, held: false,
  },
  {
    label: 'a row stamped exactly at the lower bound',
    atMs: OPENS_MS, held: true,
  },
  {
    label: 'a row stamped inside the window',
    atMs: OPENS_MS + ONE_SECOND_MS, held: true,
  },
  {
    label: 'a row stamped exactly at the upper bound',
    atMs: CLOSES_MS, held: false,
  },
  {
    label: 'a row stamped a second after the window closes',
    atMs: CLOSES_MS + ONE_SECOND_MS, held: false,
  },
];

describe('what a window accepts', () => {
  it('labels every row distinctly', () => {
    const labels = WINDOW_ACCEPT_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('covers every combination of bounds', () => {
    // A set rather than a count, so a missing combination fails
    // NAMING the one nothing in the table asks for.
    const covered = WINDOW_ACCEPT_CASES.map(boundednessOf);

    expect([...new Set(covered)].sort()).toEqual([
      'both', 'neither', 'since', 'until',
    ]);
  });

  for (const row of WINDOW_ACCEPT_CASES) {
    it(`translates ${row.label}`, () => {
      const parsed = parseQuery(timeWindowQuerySchema, row.query);
      const window = toTimeWindow(parsed);

      expect([
        window.sinceInclusive?.getTime() ?? null,
        window.untilExclusive?.getTime() ?? null,
      ]).toEqual([row.sinceMs, row.untilMs]);
    });

    it(`refuses ${row.label} with its axis wrong`, () => {
      // The negative control, varied along this row's own axis.
      const parse = () => parseQuery(timeWindowQuerySchema, row.broken);
      const err = validationErrorFrom(parse);

      expect(detailsOf(err).length).toBeGreaterThan(0);
    });
  }
});

describe('the side a boundary stamp lands on', () => {
  it('carries rows the window holds and rows it drops', () => {
    const held = BOUNDARY_CASES.filter((row) => row.held);
    const dropped = BOUNDARY_CASES.filter((row) => !row.held);

    expect([held.length > 0, dropped.length > 0]).toEqual([true, true]);
  });

  it('holds a row at the lower bound and drops one at the upper', () => {
    const atLower = BOUNDARY_CASES.filter((row) => row.atMs === OPENS_MS);
    const atUpper = BOUNDARY_CASES.filter((row) => row.atMs === CLOSES_MS);

    expect([
      atLower.map((row) => row.held),
      atUpper.map((row) => row.held),
    ]).toEqual([[true], [false]]);
  });

  for (const row of BOUNDARY_CASES) {
    it(`answers ${row.label}`, () => {
      const window = boundedWindow();

      expect(holdsRowAt(window, new Date(row.atMs))).toBe(row.held);
    });
  }
});

describe('what a sort defaults to', () => {
  it('states its default by the order of its own tuple', () => {
    // The key below is the default because it is the tuple's first
    // member and not because it is called `score`. A tuple written
    // the other way round is a different default, and this is the
    // case that says so rather than the two beneath it.
    expect(SORT_KEYS[0]).toBe('score');
  });

  it('defaults to the first declared key when sort is absent', () => {
    expect(parseQuery(sortSchema, {})).toStrictEqual({ sort: 'score' });
  });

  it('answers a declared key it was given', () => {
    // The control on the case above: a schema answering `score`
    // whatever it was handed would pass that one and fail this.
    const query = { sort: 'recency' };

    expect(parseQuery(sortSchema, query)).toStrictEqual({ sort: 'recency' });
  });

  it('carries every default through a composed list query', () => {
    // The parse a findings list route makes. A default surviving
    // its own schema but not the composition is a route ordering
    // by nothing, and no case above this one would report it.
    expect(parseQuery(findingListQuerySchema, {})).toStrictEqual({
      page: 1, perPage: 50, sort: 'score',
    });
  });
});
