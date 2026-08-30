/**
 * `src/taxonomy/terms-routes.ts` — what each of the four routes
 * answers when it REFUSES: the status, the envelope and the details
 * each refusal reaches the wire with. Driven over supertest against
 * a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `terms-service.test.ts` is the
 * translation, and only the translation. That a taken pattern is a
 * `ConflictError` where a document rewrites the same row, that a
 * row naming another category is a `ValidationError` carrying that
 * row's INDEX, that a repeated pattern is refused before any write
 * — those are claims about the RULES and are pinned one file over,
 * over direct calls. What no call can report is whether the rule
 * reached a caller: the status `errorHandler` or the handler chose,
 * the envelope written around it, and whether a handler swallowed a
 * throw on the way. So every case below reads a response and none
 * of them reads a return value.
 *
 * WHAT ONLY THIS LAYER CAN DECIDE AT ALL is which of the two
 * operations each doubled route ran, and three of the eight cases
 * are about exactly that. `?format` picks between a page and a
 * document, and the body's `terms` member picks between one term
 * and a lexicon; neither discriminator exists in the service, which
 * is handed a call already made.
 *
 * EIGHT REFUSALS, GROUPED BY WHICH PART OF THE REQUEST WAS WRONG.
 *
 * THE ADDRESS. An id naming no category is `404` on all three
 * routes that take one, and an id naming no term is `404` on both
 * that take one, each asserted against ONE shared body constant per
 * address rather than five literals that agree today: five handlers
 * are five chances to answer a missing row five different ways, and
 * this file is the only place that could report it. A `:id` segment
 * that is not an id at all is `422` naming `id` on all four routes
 * and never `404` — a `404` says the row is not there, and a
 * request that never named a row has not established that.
 *
 * THE QUERY. `?format=seed` and `?page` are two vocabularies for
 * two different answers, so a request carrying both is `422` naming
 * `query` rather than served a whole document with the window
 * dropped: a caller that sent `?page` believes it is reading a
 * page, and a document is not one. A `?format` this route does not
 * serve is the other half and answers a detail naming `format`
 * instead, which is what says the discrimination is on the member's
 * PRESENCE and its refusal on the value — had the router branched
 * on the value, `?format=json` would have fallen into the paginated
 * branch and been reported as an undeclared key.
 *
 * THE PAYLOAD. A polarity outside the three is `422` naming
 * `polarity` when one term was sent and `terms.0.polarity` when a
 * document was, which is one case rather than two: the index in
 * that path is how a caller finds the row in a hundred, and it is
 * also the only proof on the wire that the document branch ran. A
 * row naming a category other than the addressed one is `422`
 * carrying this service's own `foreign_category_key` code, not
 * zod's — no schema can raise a rule about the path.
 *
 * THE CONFLICT. A pattern the category already carries is `409`
 * with `code: 'CONFLICT'` through the single create, and `201`
 * through a DOCUMENT carrying the same pattern, asserted in one
 * body. That pair is the whole of the insert-versus-upsert
 * decision as a caller meets it, and it is unobservable anywhere
 * except at a route that has to pick between the two. The `409`
 * itself is the translation being pinned rather than merely that
 * something was thrown: `StoreRefusal` is deliberately not an
 * `AppError`, so an untranslated one answers `500`.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every refusal below, so each case carries its own control in the
 * same body, varied along the axis under test and reached through
 * the SAME operation: each `404` acts on the row that IS stored,
 * the not-an-id segment is paired with the id it would have been,
 * the windowed seed request is paired with BOTH vocabularies sent
 * alone, the bad format is paired with the one format this route
 * serves, each bad polarity is paired with the same write carrying
 * a legal one, the foreign row is paired with the same document
 * naming the addressed category, and the duplicate create is paired
 * with a free pattern.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim. What an
 * ACCEPTED call lands — the paginated envelope, the seed document's
 * bytes, the count a bulk import answers, the key set on each — is
 * the next task's over this same file, and every figure in the grid
 * below moves when it arrives. What a refusal may CONTAIN is
 * `terms-service.test.ts`'s at this layer and
 * `tests/api/request-echo.test.ts`'s across the surface: none of
 * the requests below submits a sentinel, because the details these
 * eight paths build are made of member names, this service's own
 * sentences and a row index.
 *
 * MUTATION GRID, measured by mutating `terms-routes.ts` and reading
 * the failed `fullName` SET from a `--reporter=json` run rather
 * than a count. Sixteen legs over eight cases, and
 * the shape is what the numbers hide: the two STATUS legs land
 * almost entirely through controls, while the five legs that break
 * a DISCRIMINATION each redden the case named for it. On a router
 * carrying two operations per route, the discriminator is the part
 * only this layer can pin, and the grid says so.
 *
 * THE STATUS LEGS. Answering both `POST` branches with `200`
 * reddens FOUR, of which three are cases about something else
 * whose `201` control it breaks and one is the conflict case,
 * whose title states the `201` a document answers. Answering the
 * `204` as a `200` with a body reddens TWO, both through
 * controls — the delete that lands beside a `404`, and the id that
 * IS one beside a segment that is not.
 *
 * THE DISCRIMINATION LEGS, which is what this file exists for.
 * Branching on the VALUE of `?format` rather than on the member's
 * presence reddens exactly ONE, the bad-format case, and nothing
 * else in the package would report it: the request still refuses,
 * with a detail naming `query` instead of `format`. Dropping
 * `.strict()` from the seed query reddens ONE, and skipping that
 * parse altogether reddens TWO — the second is nested, so the pair
 * reads as one narrowing rather than two legs. Treating every body
 * as a single term reddens THREE and treating every object body as
 * a document reddens THREE, which are the two halves of the same
 * choice and disjoint in one member.
 *
 * THE ENVELOPE LEGS. Dropping the paginated envelope, dropping its
 * `meta`, and answering the seed document through `ok()` each
 * redden ONE, and it is the SAME case all three times: the one
 * that sends each vocabulary alone as its control. Three faults
 * with one red set apiece is a control doing three jobs, not three
 * readings. Answering a bulk import with the rows it wrote rather
 * than the count reddens TWO, both through `imported` controls.
 *
 * ONE MEASURED ZERO, reported rather than re-aimed away. Answering
 * the seed document through `res.json` of its parsed form — same
 * shape, different bytes — reddens NOTHING here, because no case in
 * this file reads the document's BYTES: the control parses it and
 * counts its rows. The indent, the key order and the trailing
 * newline are what make a document import back, and they are the
 * round-trip case's subject in the task that adds the positive
 * half.
 *
 * THE ADDRESS LEGS, where the leg has to be picked to match the
 * claim. Replacing `readId` with a bare `Number(...)` reddens ONE,
 * the not-an-id case, and that is the leg that says the SCHEMA is
 * load-bearing. Taking the segment RAW reddens all EIGHT instead —
 * a wider leg measuring a wider fault, and useful for the opposite
 * reason: it is the control saying every case in this file reaches
 * the router at all rather than passing over an empty fixture.
 * Skipping the list's query parse for a hardcoded window reddens
 * ONE.
 */
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildTermsRouter } from './terms-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('terms-routes-test', { level: 'silent' });

/**
 * The category every case plants its lexicon in, by key.
 *
 * The key matters here in a way it does not on the categories
 * router: every seed row names one in `categoryKey`, and a document
 * whose rows name {@link OTHER_KEY} instead is one of the eight
 * refusals.
 */
const STORED_KEY = 'phrases';

/** A second category in the same domain, holding no terms. */
const OTHER_KEY = 'tools';

/** The pattern the fixture plants, and the one a create collides on. */
const STORED_PATTERN = 'alpha';

/** The second planted pattern, so a page can be narrower than a category. */
const SECOND_PATTERN = 'beta';

/** A pattern no case plants, which every control writes under. */
const FREE_PATTERN = 'gamma';

/**
 * An id no planted row carries, category or term.
 *
 * Far past the handful the fixture hands out, and a positive
 * integer so that `resourceIdParamSchema` narrows it happily — this
 * is the `404` cases' subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** A polarity `TERM_POLARITIES` does not carry. */
const BAD_POLARITY = 'sideways';

/**
 * The whole body a `404` about a category answers with.
 *
 * One constant asserted by three cases rather than three literals,
 * which is how this file says the three operations that address a
 * category answer ONE envelope rather than three that happen to
 * agree today. The message is
 * `src/taxonomy/terms-service.ts`'s constant; what is pinned here is
 * that it arrives unmodified with `code` beside it and nothing
 * else.
 */
const NO_SUCH_CATEGORY_BODY = {
  code: 'NOT_FOUND',
  message: 'No category carries that id',
};

/** The whole body a `404` about a term answers with. */
const NO_SUCH_TERM_BODY = {
  code: 'NOT_FOUND',
  message: 'No term carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on all four routes,
 * which share a single `readId` and would share a single mistake.
 */
const NOT_AN_ID_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'id',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The whole body a seed request carrying a window answers with.
 *
 * `query` and not `page`, because `seedQuerySchema` declares
 * `format` alone: a window sent beside it is an undeclared key, and
 * `src/http/validation.ts` names the CONTAINER for that issue
 * rather than the key, so nothing a caller submitted reaches the
 * detail.
 */
const UNDECLARED_QUERY_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'query',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a `?format` this route does not serve answers
 * with.
 *
 * `format` rather than `query`, which is the difference that says
 * the router discriminated on the member's PRESENCE. A branch
 * keyed on the VALUE would have sent this request to the paginated
 * parse, where `format` is undeclared and the answer would be
 * {@link UNDECLARED_QUERY_BODY} instead — same status, different
 * detail, and a caller left looking for a typo it did not make.
 */
const BAD_FORMAT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'format',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a pattern the category already carries answers
 * with, on the single create alone.
 *
 * No `details`: a conflict is a fact about the stored rows rather
 * than about a field, and `ConflictError` carries none unless a
 * rule has counts to report. The absence is asserted by the whole
 * body comparison rather than stated.
 */
const PATTERN_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This category already carries a term under that pattern',
};

/** The message a `foreign_category_key` detail carries. */
const FOREIGN_KEY_RULE = 'Every row names the category the path addressed';

/**
 * The whole body a document row naming another category answers
 * with.
 *
 * The field is `terms.0.categoryKey` — the member, under the row's
 * INDEX. That index is how a caller finds the offending row in a
 * document of a hundred, and it is built from the row's position
 * rather than from anything the row said, which is what keeps a
 * submitted key out of the detail. `foreign_category_key` is this
 * service's own code and not zod's: no request schema can raise a
 * rule about the path the document was sent to.
 */
const FOREIGN_ROW_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'terms.0.categoryKey',
    message: FOREIGN_KEY_RULE,
    code: 'foreign_category_key',
  }],
};

/** The detail a polarity outside the three answers with, by field. */
function badPolarityBody(field: string): unknown {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: [{
      field,
      message: 'Not one of the accepted values.',
      code: 'invalid_value',
    }],
  };
}

/**
 * Builds an app carrying one freshly built terms router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app leaves
 * out is the framework's middleware stack and the auth guard: that
 * the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildTermsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildTermsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One category carrying two terms, a second carrying none, and the
 * app in front of them.
 *
 * TWO CATEGORIES, because two of the eight refusals need a second
 * one to be about anything: a document row naming another category
 * has to name a category that EXISTS, or the case would be about a
 * key nobody wrote rather than about a document addressed at the
 * wrong bucket.
 *
 * TWO TERMS, because a page has to be able to be narrower than the
 * category it came out of. Both are planted through the PORT rather
 * than through `POST /categories/:id/terms`, so a case about a
 * duplicate is not also a case about the create route — and so the
 * pattern it collides on was never created successfully first.
 *
 * @returns The app, plus the ids the planted rows were given.
 */
async function withLexicon(): Promise<{
  app: Application;
  categoryId: number;
  otherId: number;
  termId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: 'example-tech-radar',
    name: 'Example Tech Radar',
    settings: {},
  });
  const category = await store.insertCategory({
    domainId: domain.id,
    key: STORED_KEY,
    name: 'Phrases',
    parentId: null,
  });
  const other = await store.insertCategory({
    domainId: domain.id,
    key: OTHER_KEY,
    name: 'Tools',
    parentId: null,
  });
  const term = await store.insertTerm({
    categoryId: category.id,
    pattern: STORED_PATTERN,
    weight: 3,
    polarity: 'positive',
    notes: null,
  });

  await store.insertTerm({
    categoryId: category.id,
    pattern: SECOND_PATTERN,
    weight: 2,
    polarity: 'negative',
    notes: 'Why this one is here',
  });

  return {
    app: buildTermsApp(store),
    categoryId: category.id,
    otherId: other.id,
    termId: term.id,
  };
}

/** The path a category's lexicon is read and written at. */
function termsPath(id: number | string): string {
  return `/categories/${id}/terms`;
}

/** The path one term is patched and deleted at. */
function termPath(id: number | string): string {
  return `/terms/${id}`;
}

/**
 * One well-formed term, as a single-create body.
 *
 * @param overrides - What to say differently. A case naming
 *   `polarity` here is the refusal; a case naming nothing is the
 *   control beside it, which is what makes the two differ along the
 *   axis under test and nowhere else.
 * @returns The body to send.
 */
function termBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    pattern: FREE_PATTERN,
    weight: 4,
    polarity: 'positive',
    ...overrides,
  };
}

/**
 * One well-formed seed document carrying a single row.
 *
 * @param overrides - What that row says differently.
 * @returns The body to send, in the shape `data/terms.json`
 *   carries.
 */
function documentBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    terms: [{
      categoryKey: STORED_KEY,
      pattern: FREE_PATTERN,
      weight: 4,
      polarity: 'positive',
      notes: null,
      ...overrides,
    }],
  };
}

// ---------------------------------------------------------------------------
// The address: an id naming no category, and one naming no term
// ---------------------------------------------------------------------------

describe('an id naming no category', () => {
  it('answers 404 on all three routes that take one', async () => {
    const { app, categoryId } = await withLexicon();

    const listed = await request(app).get(termsPath(ABSENT_ID));
    const exported = await request(app)
      .get(termsPath(ABSENT_ID))
      .query({ format: 'seed' });
    const created = await request(app)
      .post(termsPath(ABSENT_ID))
      .send(termBody());

    // The controls, along the axis under test and through the SAME
    // three operations: a router answering 404 to everything
    // satisfies the three assertions above on its own. They also
    // say what the 404 is FOR — a category holding no terms is a
    // 200 carrying an empty page, so only a bucket that is not
    // there answers this way.
    const okList = await request(app).get(termsPath(categoryId));
    const okSeed = await request(app)
      .get(termsPath(categoryId))
      .query({ format: 'seed' });
    const okCreate = await request(app)
      .post(termsPath(categoryId))
      .send(termBody());

    expect(listed.status).toBe(404);
    expect(listed.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(exported.status).toBe(404);
    expect(exported.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(created.status).toBe(404);
    expect(created.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(okList.status).toBe(200);
    expect(okSeed.status).toBe(200);
    expect(okCreate.status).toBe(201);
  });
});

describe('an id naming no term', () => {
  it('answers 404 on the patch and on the delete', async () => {
    const { app, termId } = await withLexicon();
    const patch = { weight: 7 };

    const patched = await request(app)
      .patch(termPath(ABSENT_ID))
      .send(patch);
    const removed = await request(app).delete(termPath(ABSENT_ID));

    // The same two requests against the term that IS stored. The
    // patch is the identical body, so the pair differs in the id
    // and nowhere else.
    const okPatch = await request(app)
      .patch(termPath(termId))
      .send(patch);
    const okDelete = await request(app).delete(termPath(termId));

    expect(patched.status).toBe(404);
    expect(patched.body).toStrictEqual(NO_SUCH_TERM_BODY);
    expect(removed.status).toBe(404);
    expect(removed.body).toStrictEqual(NO_SUCH_TERM_BODY);
    expect(okPatch.status).toBe(200);
    expect(okDelete.status).toBe(204);
  });
});

describe('a path segment that is not an id', () => {
  it('answers 422 naming the segment rather than 404', async () => {
    const { app, termId } = await withLexicon();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the two groups above
    // assert. That is the fault this case exists to separate: a 404
    // is a claim about the table, and `abc` is not an id the table
    // was ever asked about.
    const listed = await request(app).get(termsPath('abc'));
    const created = await request(app)
      .post(termsPath('abc'))
      .send(termBody());
    const patched = await request(app)
      .patch(termPath('abc'))
      .send({});
    const removed = await request(app).delete(termPath('abc'));
    const anId = await request(app).delete(termPath(termId));

    // All four routes, against ONE body constant: four handlers are
    // four chances to narrow the segment in only some of them, and
    // nothing else in this package would report the ones left raw.
    expect(listed.status).toBe(422);
    expect(listed.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(removed.status).toBe(422);
    expect(removed.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// The query: two vocabularies for two answers, and neither mixed
// ---------------------------------------------------------------------------

describe('a seed request carrying a window', () => {
  it('answers 422 naming the query, and serves each alone', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const withPage = await request(app)
      .get(path)
      .query({ format: 'seed', page: 2 });
    const withPerPage = await request(app)
      .get(path)
      .query({ format: 'seed', perPage: 10 });

    // BOTH vocabularies, each sent alone. Without them this case
    // would pass against a route that refused every query it was
    // given, and it is the pair that says the refusal is about the
    // COMBINATION rather than about either parameter.
    const seedAlone = await request(app)
      .get(path)
      .query({ format: 'seed' });
    const pageAlone = await request(app)
      .get(path)
      .query({ page: 2, perPage: 1 });

    expect(withPage.status).toBe(422);
    expect(withPage.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(withPerPage.status).toBe(422);
    expect(withPerPage.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    // A document rather than an envelope, which is the answer the
    // window would have been silently dropped from.
    expect(seedAlone.status).toBe(200);
    expect(JSON.parse(seedAlone.text).terms).toHaveLength(2);
    expect(pageAlone.status).toBe(200);
    expect(pageAlone.body.meta.page).toBe(2);
  });
});

describe('a format this route does not serve', () => {
  it('answers 422 naming the format rather than the query', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const wrong = await request(app)
      .get(path)
      .query({ format: 'csv' });
    const served = await request(app)
      .get(path)
      .query({ format: 'seed' });

    // `format` and not `query` is the whole reading. Had the router
    // branched on the VALUE rather than on the member's presence,
    // this request would have reached the paginated parse, where
    // `format` is an undeclared key — the same 422 the case above
    // asserts, naming the wrong half of the request.
    expect(wrong.status).toBe(422);
    expect(wrong.body).toStrictEqual(BAD_FORMAT_BODY);
    expect(served.status).toBe(200);
    expect(served.type).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// The payload: a value no polarity carries, and a row about elsewhere
// ---------------------------------------------------------------------------

describe('a polarity outside the three', () => {
  it('answers 422 naming it, by row index in a document', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const single = await request(app)
      .post(path)
      .send(termBody({ polarity: BAD_POLARITY }));
    const document = await request(app)
      .post(path)
      .send(documentBody({ polarity: BAD_POLARITY }));

    // The same two writes, differing from the two above in the
    // polarity and nowhere else.
    const okSingle = await request(app)
      .post(path)
      .send(termBody());
    const okDocument = await request(app)
      .post(path)
      .send(documentBody({ pattern: 'delta' }));

    // The two field paths are what say WHICH branch ran: a document
    // reports the member under its row's index, and a single term
    // reports the member alone. Nothing else on the wire
    // distinguishes the two operations this one route carries.
    expect(single.status).toBe(422);
    expect(single.body).toStrictEqual(badPolarityBody('polarity'));
    expect(document.status).toBe(422);
    expect(document.body).toStrictEqual(badPolarityBody('terms.0.polarity'));
    expect(okSingle.status).toBe(201);
    expect(okDocument.status).toBe(201);
  });
});

describe('a document row naming another category', () => {
  it('answers 422 naming the row that disagreed', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    // `OTHER_KEY` names a category that EXISTS, which is what makes
    // this a case about a document addressed at the wrong bucket
    // rather than about a key nobody wrote. Writing the row into
    // the addressed category anyway would be the service deciding
    // which of the two the caller meant.
    const foreign = await request(app)
      .post(path)
      .send(documentBody({ categoryKey: OTHER_KEY }));
    const addressed = await request(app)
      .post(path)
      .send(documentBody());

    expect(foreign.status).toBe(422);
    expect(foreign.body).toStrictEqual(FOREIGN_ROW_BODY);
    expect(addressed.status).toBe(201);
    expect(addressed.body.data.imported).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The conflict: one pattern, two operations, two answers
// ---------------------------------------------------------------------------

describe('a pattern the category already carries', () => {
  it('answers 409 on a create and 201 through a document', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const duplicate = await request(app)
      .post(path)
      .send(termBody({ pattern: STORED_PATTERN }));

    // The same pattern through the OTHER operation the same route
    // carries. A document is a lexicon being applied, so it
    // rewrites the row it finds — which is what lets an export
    // import back rather than accumulating a second row that would
    // count the same match twice.
    const rewritten = await request(app)
      .post(path)
      .send(documentBody({ pattern: STORED_PATTERN, weight: 11 }));

    // And the create that does not collide, so the 409 above is
    // about the pattern rather than about the route refusing every
    // insert it is given.
    const free = await request(app)
      .post(path)
      .send(termBody());

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(PATTERN_TAKEN_BODY);
    expect(rewritten.status).toBe(201);
    expect(rewritten.body.data.imported).toBe(1);
    expect(free.status).toBe(201);
    expect(free.body.data.pattern).toBe(FREE_PATTERN);
  });
});
