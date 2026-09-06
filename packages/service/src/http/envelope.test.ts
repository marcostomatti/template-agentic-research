/**
 * `ok`, `okPage` and `buildPaginationMeta` — the three functions that
 * build every success body this service writes — and the four
 * schemas beside them: three that state those same shapes a second
 * time for a document to carry, and one that states the FAILURE
 * shape this module does not build at all.
 *
 * Four claims about the builders, and each one is a promise made to a
 * client that has only the body. That a success body is always the
 * same object with the same members, so a consumer can key on
 * `success` without knowing which route answered. That `data` reaches
 * `JSON.stringify` exactly as the route handed it over, since nothing
 * there copies or reshapes it and a store projecting a column it
 * should not have is therefore visible rather than hidden. That
 * `meta` is derived from the window and the count and cannot disagree
 * with them. And that `page` is echoed rather than clamped, so a
 * caller that overshot can see that it did.
 *
 * The arithmetic cases are a table, and two guards keep it from going
 * quietly vacuous. `META_SHAPES` is asserted set-equal to the shapes
 * the table actually carries, so a shape dropped from the table is a
 * failure and not a silent gap. And every row's expected page count
 * is re-derived from the OTHER direction — the smallest `n` with
 * `n * perPage >= total`, computed without `Math.ceil` — so a
 * hand-written expectation that merely agrees with the module cannot
 * pass unnoticed.
 *
 * The schema cases are the file's second half and answer a different
 * question: not what a body IS, but what a document may claim about
 * it. Every one of them parses what a BUILDER returned rather than a
 * literal written out beside it, because that is the whole of what
 * holds a schema equal to the interface it restates — no gate
 * compares the two declarations, so a member renamed on one side has
 * to be a red case here or nowhere at all.
 *
 * Each refusal carries its positive control in the same case, varied
 * along the axis that case is about: the same body discriminated as
 * its builder wrote it, the same window with a whole `total`, the
 * same paginated body handed to the schema that does describe it.
 * Without them a refusal reads identically against a schema that
 * refuses everything it is given.
 *
 * The last four cases are the odd ones out, their subject being a
 * shape `lib/errors` owns and this module only describes. They are
 * driven over two bodies CAPTURED off real responses — a query parse
 * this service's own vocabulary refused, and a `NotFoundError` —
 * rather than over literals, because a transcribed body says only
 * that the schema accepts the body its author had in mind. Both are
 * here rather than one of them twice because they differ on the
 * member the schema narrows: the 422 carries a structured `details`
 * and the 404 carries none.
 *
 * Two of those four ACCEPT, and no guard-removal leg can redden a
 * case that only accepts. So each carries its inverting half in the
 * same case — the same captured body handed to `successEnvelopeSchema`
 * and refused there — and the grid below names the legs that do
 * reach them.
 *
 * Mutation grid, measured over the 31 cases in this file, with the
 * figure the first four legs answered at 15 cases beside each — a leg
 * that stops reproducing its old count is a wrong spelling rather
 * than a stale header. Turning `Math.ceil` into `Math.floor` reddens
 * 4 (was 3): both partial-page rows, the `okPage` case built on a
 * partial window, and the paginated schema's accepting case, which
 * carries the derived count. The empty collection and the two
 * exact-multiple rows compute the same count under either operation
 * and stay green — which is why a table made only of exact multiples
 * would prove nothing about the division at all. Dropping `meta` from
 * `okPage` reddens 10 (was 4). Writing `success: false` reddens 15
 * (was 5): every case that asserts a whole body, plus every schema
 * case that reaches a builder, which is all of them but the two the
 * meta schema owns. The discriminator cases there redden through
 * their CONTROLS rather than their assertions, which is those
 * controls doing the one job they are written for. Returning
 * `structuredClone(data)` from `ok` reddens 4 (was 2), the two
 * identity cases the builders own and the two the schemas added; a
 * spread copy in its place reddens 6 at 15 cases instead of 2,
 * spreading an array answering an object, so the spelling belongs
 * beside the figure.
 *
 * The schema half's own legs, each naming the case it exists for.
 * `data: z.unknown().optional()` reddens 1, the absent-member case.
 * Dropping `.strict()` from `successEnvelopeSchema` reddens 2, the
 * case that refuses a paginated body and the case that refuses a page
 * carrying a member beside `data` and `meta` — which is the reading
 * that says the paginated schema's strictness is INHERITED from the
 * extension rather than declared where it is read. Writing
 * `success: z.boolean()` reddens 4, the whole discriminator table and
 * nothing else. Dropping `.int()` from `total` reddens 2, one per
 * envelope. Turning `totalPages` from non-negative to positive
 * reddens 1, the window-shapes case — which is there for exactly
 * that, an empty collection answering `0` pages being the one shape a
 * positive bound would refuse. Every figure in those two paragraphs
 * was re-measured at 31 and none of them moved, which is the reading
 * that says the four cases below reach neither a builder nor the
 * success envelopes.
 *
 * The failure schema's own legs, each naming the case it exists for.
 * `code: z.string().optional()` reddens 1, the missing-member case.
 * Replacing the `details` union with a bare `z.unknown().optional()`
 * reddens 1, the bare-string case, which is the whole of what the
 * union buys. Making `details` REQUIRED reddens 1, and it is the 404
 * case — the inverting leg those two acceptances would otherwise
 * have none of. `message: z.number()` reddens all 4, the two
 * acceptances directly and the two refusals through their controls.
 */
import type {
  PaginatedEnvelope,
  PaginationInput,
  SuccessEnvelope,
} from './envelope.js';
import type { Application } from 'express';
import type { ZodSafeParseResult, ZodType } from 'zod';

import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { errorHandler, NotFoundError } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';

import {
  buildPaginationMeta,
  errorEnvelopeSchema,
  ok,
  okPage,
  paginatedEnvelopeSchema,
  paginationMetaSchema,
  successEnvelopeSchema,
} from './envelope.js';
import { paginationQuerySchema } from './schemas.js';
import { parseQuery } from './validation.js';

/**
 * The page shapes the arithmetic table has to cover. Held set-equal to
 * the table below, so an added shape with no row, or a row deleted out
 * from under a shape, is a red case rather than a quiet gap.
 */
const META_SHAPES = [
  'empty',
  'partial-last-page',
  'exact-multiple',
  'single-partial-page',
  'page-past-the-end',
];

/**
 * One window per shape, with the page count written down rather than
 * computed, so this file pins the arithmetic instead of agreeing with
 * whatever the module does.
 */
const META_CASES = [
  { shape: 'empty', page: 1, perPage: 50, total: 0, totalPages: 0 },
  { shape: 'partial-last-page', page: 3, perPage: 50, total: 101, totalPages: 3 },
  { shape: 'exact-multiple', page: 2, perPage: 50, total: 100, totalPages: 2 },
  { shape: 'single-partial-page', page: 1, perPage: 20, total: 7, totalPages: 1 },
  { shape: 'page-past-the-end', page: 99, perPage: 50, total: 100, totalPages: 2 },
];

/**
 * Whether `pages` is the smallest window count that covers `total`
 * rows, derived by multiplication rather than by division so it shares
 * no operation with the module under test. An empty collection spans
 * no pages at all.
 */
function isSmallestCoveringCount(
  pages: number,
  perPage: number,
  total: number,
): boolean {
  if (total === 0) {
    return pages === 0;
  }

  return pages * perPage >= total && (pages - 1) * perPage < total;
}

// ---------------------------------------------------------------------------
// buildPaginationMeta
// ---------------------------------------------------------------------------

describe('buildPaginationMeta', () => {
  it('carries one row per declared page shape', () => {
    const shapes = META_CASES.map((row) => row.shape);

    expect(shapes.sort()).toEqual([...META_SHAPES].sort());
  });

  it('expects the smallest covering page count in every row', () => {
    const wrong = META_CASES.filter(
      (row) => !isSmallestCoveringCount(row.totalPages, row.perPage, row.total),
    );

    expect(wrong.map((row) => row.shape)).toEqual([]);
  });

  for (const { shape, page, perPage, total, totalPages } of META_CASES) {
    it(`derives the meta of a ${shape} window`, () => {
      expect(buildPaginationMeta({ page, perPage, total })).toStrictEqual({
        page,
        perPage,
        total,
        totalPages,
      });
    });
  }

  it('leaves the input it was given untouched', () => {
    const input = { page: 3, perPage: 50, total: 101 };

    buildPaginationMeta(input);

    expect(input).toStrictEqual({ page: 3, perPage: 50, total: 101 });
  });
});

// ---------------------------------------------------------------------------
// ok
// ---------------------------------------------------------------------------

describe('ok', () => {
  it('wraps a resource in the success envelope and nothing else', () => {
    const domain = { id: 1, slug: 'example-tech-radar' };

    expect(ok(domain)).toStrictEqual({ success: true, data: domain });
  });

  it('carries the resource by reference rather than copying it', () => {
    const domain = { id: 1, slug: 'example-tech-radar' };

    expect(ok(domain).data).toBe(domain);
  });

  it('wraps a null resource without collapsing the envelope', () => {
    const envelope = ok(null);

    expect(Object.keys(envelope).sort()).toEqual(['data', 'success']);
    expect(envelope.data).toBeNull();
    expect(envelope.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// okPage
// ---------------------------------------------------------------------------

describe('okPage', () => {
  it('wraps a page beside the window it was read through', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const meta = buildPaginationMeta({ page: 3, perPage: 50, total: 101 });

    expect(okPage(rows, meta)).toStrictEqual({
      success: true,
      data: rows,
      meta: { page: 3, perPage: 50, total: 101, totalPages: 3 },
    });
  });

  it('answers an empty list for a zero-row page', () => {
    const meta = buildPaginationMeta({ page: 1, perPage: 50, total: 0 });

    expect(okPage([], meta)).toStrictEqual({
      success: true,
      data: [],
      meta: { page: 1, perPage: 50, total: 0, totalPages: 0 },
    });
  });

  it('answers an empty list for a page past the end of the collection', () => {
    const meta = buildPaginationMeta({ page: 99, perPage: 50, total: 100 });

    expect(okPage([], meta)).toStrictEqual({
      success: true,
      data: [],
      meta: { page: 99, perPage: 50, total: 100, totalPages: 2 },
    });
  });

  it('carries the rows and the meta by reference and mutates neither', () => {
    const rows = [{ id: 1 }];
    const meta = buildPaginationMeta({ page: 1, perPage: 50, total: 1 });
    const envelope = okPage(rows, meta);

    expect(envelope.data).toBe(rows);
    expect(envelope.meta).toBe(meta);
    expect(rows).toStrictEqual([{ id: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// The same shapes as schemas
// ---------------------------------------------------------------------------

/**
 * The resource every schema case is driven over. An object rather than
 * a scalar, so `data` arriving at the parse output by identity is a
 * statement about a reference and not about two equal primitives.
 */
const SENTINEL = { id: 1, slug: 'example-tech-radar' };

/** The window every paginated case is built over. */
const SAMPLE_WINDOW = { page: 3, perPage: 50, total: 101 };

/**
 * Both envelopes, each beside a body its own builder made, so the
 * discriminator cases below are driven over the two declarations
 * rather than over one of them twice.
 */
const ENVELOPE_CASES: {
  readonly label: string;
  readonly schema: ZodType;
  readonly body: object;
}[] = [
  {
    label: 'single-resource',
    schema: successEnvelopeSchema,
    body: ok(SENTINEL),
  },
  {
    label: 'paginated',
    schema: paginatedEnvelopeSchema,
    body: okPage([SENTINEL], buildPaginationMeta(SAMPLE_WINDOW)),
  },
];

/**
 * The `code` and the field path of every issue a refusal carried, so a
 * case names WHY a body was refused rather than only that it was.
 *
 * The same reading as the helper of this name in `./schemas.test.ts`,
 * which asks it of the request schemas. Two copies rather than one
 * import, because neither file is the other's helper module.
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

/**
 * A copy of `body` without one of its members, built by filtering
 * entries rather than by rest-destructuring — which this repo's
 * `no-unused-vars` settings refuse — and mutating nothing.
 */
function withoutMember(
  body: object,
  member: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([name]) => name !== member),
  );
}

/**
 * Whether the meta the builder derives from `input` is one
 * {@link paginationMetaSchema} accepts.
 */
function isAcceptedMeta(input: PaginationInput): boolean {
  return paginationMetaSchema.safeParse(buildPaginationMeta(input)).success;
}

describe('the success discriminator', () => {
  for (const row of ENVELOPE_CASES) {
    it(`refuses a ${row.label} body with no success member`, () => {
      const body = withoutMember(row.body, 'success');

      expect(refusalOf(row.schema.safeParse(body))).toEqual([
        { code: 'invalid_value', field: 'success' },
      ]);
      // The control: the same body as its builder wrote it. Without
      // it this case reads the same against a schema that refuses
      // everything it is handed.
      expect(row.schema.safeParse(row.body).success).toBe(true);
    });

    it(`refuses a ${row.label} body carrying success: false`, () => {
      const body = { ...row.body, success: false };

      expect(refusalOf(row.schema.safeParse(body))).toEqual([
        { code: 'invalid_value', field: 'success' },
      ]);
      expect(row.schema.safeParse(row.body).success).toBe(true);
    });
  }
});

describe('successEnvelopeSchema', () => {
  it('refuses a body with no data member at all', () => {
    const body = withoutMember(ok(SENTINEL), 'data');

    expect(refusalOf(successEnvelopeSchema.safeParse(body))).toEqual([
      { code: 'invalid_type', field: 'data' },
    ]);
    // The control, and the asymmetry it brackets: a `data` that is
    // present and null parses, so the refusal above is about the
    // member being absent rather than about what it holds.
    expect(successEnvelopeSchema.safeParse(ok(null)).success).toBe(true);
  });

  it('refuses the body okPage builds, which carries a meta', () => {
    const page = okPage([SENTINEL], buildPaginationMeta(SAMPLE_WINDOW));

    expect(refusalOf(successEnvelopeSchema.safeParse(page))).toEqual([
      { code: 'unrecognized_keys', field: '' },
    ]);
    // The control: that body is not malformed, it is the OTHER
    // envelope. So binding this schema to a list route is a red case
    // here rather than a document that says `meta` is not answered.
    expect(paginatedEnvelopeSchema.safeParse(page).success).toBe(true);
  });

  it('accepts what ok builds and carries data by identity', () => {
    const parsed = successEnvelopeSchema.parse(ok(SENTINEL));
    // The compile-time half: nothing holds the schema and the
    // interface equal but this assignment and the cases beside it.
    const asInterface: SuccessEnvelope<unknown> = parsed;

    expect(parsed.data).toBe(SENTINEL);
    expect(asInterface.success).toBe(true);
  });
});

describe('paginationMetaSchema', () => {
  it('refuses a meta whose total is not a whole number', () => {
    const meta = buildPaginationMeta(SAMPLE_WINDOW);
    const fractional = { ...meta, total: 100.5 };

    expect(refusalOf(paginationMetaSchema.safeParse(fractional))).toEqual([
      { code: 'invalid_type', field: 'total' },
    ]);
    expect(paginationMetaSchema.safeParse(meta).success).toBe(true);
  });

  it('accepts the meta of every window shape the builder derives', () => {
    const refused = META_CASES.filter((row) => !isAcceptedMeta(row));

    expect(refused.map((row) => row.shape)).toEqual([]);
  });
});

describe('paginatedEnvelopeSchema', () => {
  it('refuses a page whose meta total is not a whole number', () => {
    const meta = buildPaginationMeta(SAMPLE_WINDOW);
    const page = okPage([SENTINEL], { ...meta, total: 100.5 });
    const sound = okPage([SENTINEL], meta);

    expect(refusalOf(paginatedEnvelopeSchema.safeParse(page))).toEqual([
      { code: 'invalid_type', field: 'meta.total' },
    ]);
    expect(paginatedEnvelopeSchema.safeParse(sound).success).toBe(true);
  });

  it('refuses a page carrying a member beside data and meta', () => {
    const meta = buildPaginationMeta(SAMPLE_WINDOW);
    const sound = okPage([SENTINEL], meta);
    const extra = { ...sound, cursor: 'x' };

    expect(refusalOf(paginatedEnvelopeSchema.safeParse(extra))).toEqual([
      { code: 'unrecognized_keys', field: '' },
    ]);
    // The control, and the reading that says the strictness was
    // INHERITED: this schema declares none of its own, and dropping
    // `.strict()` from the schema it extends reddens this case too.
    expect(paginatedEnvelopeSchema.safeParse(sound).success).toBe(true);
  });

  it('accepts the page okPage builds over a derived meta', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const meta = buildPaginationMeta(SAMPLE_WINDOW);
    const parsed = paginatedEnvelopeSchema.parse(okPage(rows, meta));
    const asInterface: PaginatedEnvelope<unknown> = parsed;

    expect(parsed).toStrictEqual({
      success: true,
      data: rows,
      meta: { page: 3, perPage: 50, total: 101, totalPages: 3 },
    });
    // Measured, and the reason `data` is not read by identity here:
    // an array schema rebuilds the array, and only its members
    // survive by reference.
    expect(asInterface.data[0]).toBe(rows[0]);
  });
});

// ---------------------------------------------------------------------------
// errorEnvelopeSchema
// ---------------------------------------------------------------------------

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for each body captured below, and
 * a hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement.
 */
const silentLogger = createLogger('envelope-test', { level: 'silent' });

/** The route whose query parse the capture below refuses. */
const REFUSED_QUERY_PATH = '/refused-query';

/** The route that answers as if the resource were not there. */
const ABSENT_PATH = '/absent';

/** What that route's `NotFoundError` says. */
const NO_SUCH_RESOURCE = 'No resource carries that address';

/** A `?page` no coercion can turn into a number. */
const NOT_A_NUMBER = 'x';

/**
 * An app carrying one route per failure shape, and nothing else.
 *
 * `errorHandler` is registered LAST, exactly as `createService` does
 * it, because that registration is what turns a bare `throw` into a
 * typed body — without it the cases below would capture Express's
 * own 500 page rather than the shape this schema describes.
 *
 * The first route is a REAL route: it parses a real query string
 * through the vocabulary every paginated route parses with, and
 * answers the success envelope when the query is sound. So the body
 * it refuses with is the one a client of this service would receive,
 * rather than a `ValidationError` assembled to be captured.
 *
 * @returns The app, with both routes mounted at the root.
 */
function buildFailingApp(): Application {
  const app = express();

  app.get(REFUSED_QUERY_PATH, (req, res) => {
    res.json(ok(parseQuery(paginationQuerySchema, req.query)));
  });
  app.get(ABSENT_PATH, () => {
    throw new NotFoundError(NO_SUCH_RESOURCE);
  });
  app.use(errorHandler(silentLogger));

  return app;
}

/** One failure body, as it reached the wire. */
interface FailureCapture {
  /** The status the response carried. */
  readonly status: number;
  /** The parsed body, exactly as `errorHandler` wrote it. */
  readonly body: Record<string, unknown>;
}

/**
 * The two captured bodies, keyed by the error class that produced
 * them.
 *
 * Every case in the section below reads its subject from here rather
 * than from a literal, and that is the whole of what makes an
 * accepting case a statement about THIS service: a transcribed body
 * says only that the schema accepts the body its author had in mind.
 */
const CAPTURED = new Map<string, FailureCapture>();

/**
 * The capture named `label`, or a failure naming what was captured.
 *
 * A `Map` lookup is `undefined`-typed and the cases read members off
 * the body, so an absent capture would otherwise surface as a
 * property read on `undefined` two lines later. Throwing here names
 * the missing label instead.
 *
 * @param label - The error class whose body the case is about.
 * @returns That capture.
 * @throws Error When nothing was captured under `label`.
 */
function captureOf(label: string): FailureCapture {
  const found = CAPTURED.get(label);

  if (found === undefined) {
    const captured = [...CAPTURED.keys()].join(', ');

    throw new Error(`no capture for ${label}; captured: ${captured}`);
  }

  return found;
}

describe('errorEnvelopeSchema', () => {
  beforeAll(async () => {
    const app = buildFailingApp();
    const refused = await request(app)
      .get(REFUSED_QUERY_PATH)
      .query({ page: NOT_A_NUMBER });
    const absent = await request(app).get(ABSENT_PATH);

    CAPTURED.set('ValidationError', {
      status: refused.status,
      body: refused.body as Record<string, unknown>,
    });
    CAPTURED.set('NotFoundError', {
      status: absent.status,
      body: absent.body as Record<string, unknown>,
    });
  });

  it('refuses a failure body with no code member', () => {
    const captured = captureOf('ValidationError');
    const body = withoutMember(captured.body, 'code');
    // The control: the same body as `errorHandler` wrote it. Without
    // it this case reads the same against a schema that refuses
    // everything it is handed.
    const asWritten = errorEnvelopeSchema.safeParse(captured.body);

    expect(refusalOf(errorEnvelopeSchema.safeParse(body))).toEqual([
      { code: 'invalid_type', field: 'code' },
    ]);
    expect(refusalOf(asWritten)).toEqual([]);
  });

  it('refuses a failure body whose details is a bare string', () => {
    const captured = captureOf('ValidationError');
    const prose = { ...captured.body, details: captured.body['message'] };
    // The control, varied along this case's own axis: the same body
    // with `details` still the field list the refused parse built. So
    // what is refused above is prose in that member's place, and not
    // the member being present at all.
    const asWritten = errorEnvelopeSchema.safeParse(captured.body);

    expect(refusalOf(errorEnvelopeSchema.safeParse(prose))).toEqual([
      { code: 'invalid_union', field: 'details' },
    ]);
    expect(refusalOf(asWritten)).toEqual([]);
  });

  it('accepts the 422 body a refused query parse answers with', () => {
    const captured = captureOf('ValidationError');
    const asFailure = errorEnvelopeSchema.safeParse(captured.body);
    const asSuccess = successEnvelopeSchema.safeParse(captured.body);

    expect(captured.status).toBe(422);
    // The half of the shape this body is here for: a structured
    // `details`, which is the member the schema narrows and the one a
    // 422 owes its caller.
    expect(Array.isArray(captured.body['details'])).toBe(true);
    expect(refusalOf(asFailure)).toEqual([]);
    // The inverting half. An accepting case reads the same against a
    // schema that accepts anything, so it is paired with the other
    // envelope refusing the same body — which is also this module's
    // own claim that a refusal is not a success body with the
    // discriminator flipped.
    expect(asSuccess.success).toBe(false);
  });

  it('accepts the 404 body an absent resource answers with', () => {
    const captured = captureOf('NotFoundError');
    const asFailure = errorEnvelopeSchema.safeParse(captured.body);
    const asSuccess = successEnvelopeSchema.safeParse(captured.body);

    expect(captured.status).toBe(404);
    // The other half of the shape: no `details` member at all, which
    // is why the two captures are both here rather than one of them
    // twice. `toJSON` omits the key rather than answering it
    // `undefined`, so this is the optional member exercised by a body
    // that really carries none.
    expect(Object.keys(captured.body).sort()).toEqual(['code', 'message']);
    expect(refusalOf(asFailure)).toEqual([]);
    expect(asSuccess.success).toBe(false);
  });
});
