/**
 * `src/taxonomy/categories-routes.ts` — what each of the four routes
 * answers when it REFUSES: the status, the envelope and the details
 * each refusal reaches the wire with. Driven over supertest against
 * a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `categories-service.test.ts` is the
 * translation, and only the translation. That a taken key is a
 * `ConflictError`, that all three depth branches arrive as one
 * `check-violation`, that a delete refused by children is a
 * `ConflictError` where a parent that is not there is a
 * `ValidationError` — those are claims about the RULES and are
 * pinned one file over, over direct calls. What no call can report
 * is whether the rule reached a caller: the status `errorHandler` or
 * the handler chose, the envelope written around it, and whether a
 * handler swallowed a throw on the way. So every case below reads a
 * response and none of them reads a return value.
 *
 * TEN CASES, ALL REFUSALS, IN FOUR GROUPS. The positive answers
 * this router lands are a later task's, and every figure in the
 * mutation grid at the foot of this comment is a measurement over
 * the ten cases as they stand — so all of them move when that half
 * arrives, and the grid is re-run rather than extended.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no category is `404` on both that
 * take one, each asserted against ONE shared body constant per
 * address rather than four literals that agree today: four handlers
 * are four chances to answer a missing row four different ways, and
 * this file is the only place that could report it. A `:id` segment
 * that is not an id at all is `422` naming `id` and never `404` —
 * a `404` says the row is not there, and a request that never named
 * a row has not established that.
 *
 * THE QUERY. `GET /domains/:slug/categories` takes no window at
 * all, so a `?page` sent to it is `422` naming `query` rather than
 * silently ignored — the one refusal on this router that exists to
 * stop an answer from being MISREAD rather than to stop a write.
 * Every other list route on this surface takes that parameter,
 * which is what makes stripping it the wrong answer: a caller would
 * read the whole taxonomy believing it had read the first page of
 * one.
 *
 * THE PAYLOAD. A key the domain already carries is `409` with
 * `code: 'CONFLICT'`, which is the translation being pinned rather
 * than merely that something was thrown: `StoreRefusal` is
 * deliberately not an `AppError`, so an untranslated one answers
 * `500`. A parent that would make a third level is `422` whose one
 * detail names `parentId` and states the one-level rule, asserted as
 * the WHOLE envelope on both writes that can raise it — the code in
 * that detail is this service's own rather than zod's, since no
 * schema can raise a rule the database holds, and a caller switching
 * on it is reading a vocabulary nothing else in the package emits.
 *
 * THE GUARD. A delete of a category that still holds children is
 * `409` and not the `422` a parent fault gets, although both arrive
 * from the store under ONE constraint name — which is the whole
 * reason the service takes the write as an argument, and this is
 * where that distinction is shown surviving the trip to the wire.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy every
 * assertion below, so each case carries its own control in the same
 * body, varied along the axis under test and reached through the
 * SAME operation: each `404` acts on the row that IS stored, the
 * `409` on the key creates under a free one, both depth refusals are
 * paired with the same write naming a ROOT as the parent, the
 * not-an-id segment is paired with the id it would have been, and
 * the refused delete is paired with a childless one that lands and
 * with a read that finds the refused row still standing.
 *
 * WHAT THIS FILE DOES NOT CLAIM. The key sets of the bodies these
 * routes answer are the positive half's subject, and no refusal here
 * carries a resource to read them off. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN is `categories-service.test.ts`'s at this
 * layer and `tests/api/request-echo.test.ts`'s across the surface —
 * none of the ten requests below submits a sentinel, because none
 * of the four refusal paths this file reaches builds a detail out of
 * anything a request carried.
 *
 * MUTATION GRID, measured over all ten cases by mutating
 * `categories-routes.ts` and reading the failed `fullName` SET from
 * a `--reporter=json` run rather than a count. Six legs, and the
 * shape of the result is the finding: FOUR of the six redden
 * ONLY through controls, which is what a refusal-only file's grid
 * looks like when the controls are doing their job.
 *
 * Answering the `POST` with `200` reddens THREE — the create `404`,
 * the duplicate key and the depth-on-create case — and every one of
 * the three through its `201` control rather than through the
 * refusal it is named for. Answering `204` as a `200` with a body
 * reddens THREE the same way, through the `204` controls of the
 * delete `404`, the not-an-id case and the guard. Dropping the
 * envelope from the list answer reddens FOUR, all of them reads of
 * `body.data` standing as controls in cases about something else —
 * so the list route is pinned by four cases that never mention it.
 *
 * The two legs that land on their own subject are the narrowings.
 * Taking the `:id` raw on the `DELETE` and taking it raw on the
 * `PATCH` each redden ONE, and it is the SAME case: that case
 * asserts both routes against one body constant, so the two legs are
 * two halves of one reading rather than two independent legs, and
 * each is invisible to the other's assertion. Skipping the list's
 * query parse reddens ONE, the case that route exists to make
 * unignorable.
 *
 * Every figure above moves when the positive half lands, since a
 * grid is a measurement over a case list rather than over a module.
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

import { buildCategoriesRouter } from './categories-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('categories-routes-test', {
  level: 'silent',
});

/**
 * The slug every case plants its taxonomy under.
 *
 * The seeded worked example's own slug, so the fixtures here read in
 * the same register as `data/domains.json` and the naming invariant
 * has nothing to find.
 */
const STORED_SLUG = 'example-tech-radar';

/** A slug no case plants, in the same register as a real one. */
const ABSENT_SLUG = 'no-domain-carries-this';

/**
 * An id no planted category carries.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The root the fixture plants, which is the one holding a child. */
const ROOT_KEY = 'phrases';

/** The child hanging off {@link ROOT_KEY}, and the third level's parent. */
const CHILD_KEY = 'signals';

/** The root holding nothing, which every control writes against. */
const LONE_KEY = 'tools';

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals, which
 * is how this file says the two operations that take a slug answer
 * ONE envelope rather than two that happen to agree today. The
 * message is `src/taxonomy/categories-service.ts`'s constant; what
 * is pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a category answers with. */
const NO_SUCH_CATEGORY_BODY = {
  code: 'NOT_FOUND',
  message: 'No category carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on both routes that
 * take an `:id`.
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
 * The sentence a depth refusal's one detail carries.
 *
 * `src/taxonomy/categories-service.ts`'s constant, spelled again
 * rather than imported: importing it would make this file green
 * against any wording that module happened to be carrying, which is
 * the one thing an assertion over a message must not be.
 */
const ONE_LEVEL_RULE
  = 'A category is a root or the child of a root, and nothing deeper';

/**
 * The whole body both depth refusals answer with.
 *
 * Asserted on the create AND on the patch, from one constant, so a
 * handler that let one of the two answer differently is a red case
 * rather than a difference nobody looked for. `depth_violation` is
 * this service's own code and not zod's — no schema can raise the
 * rule the trigger holds — which is what makes the whole-envelope
 * assertion worth more here than a status read.
 */
const TOO_DEEP_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'parentId',
    message: ONE_LEVEL_RULE,
    code: 'depth_violation',
  }],
};

/**
 * Just enough of a row for a list assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record that
 * is already declared in `./store.ts`.
 */
interface KeyedRow {
  /** The natural key a category is found by within its domain. */
  readonly key: string;
}

/**
 * Builds an app carrying one freshly built categories router.
 *
 * `errorHandler` is registered LAST, exactly as `createService` does
 * it, because that registration is what turns a bare `throw` inside
 * an `async` handler into a typed body — without it every case here
 * would read Express's own 500 page. What this app leaves out is the
 * framework's middleware stack and the auth guard: that the routes
 * are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be reached
 * by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildCategoriesApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildCategoriesRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One domain carrying a two-level taxonomy, and the app in front of
 * it.
 *
 * Three categories, which is the smallest fixture every refusal here
 * can be reached from: a root holding a child (so a delete has
 * children to refuse and the child is a parent the depth rule
 * refuses), and a second root holding nothing (so every control has
 * a row it can write against without disturbing the first two).
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/categories`, so a case about a delete is not
 * also a case about the create route — and so the duplicate-key case
 * is refused by a row it did not have to create successfully first.
 *
 * @returns The app, and the ids the planted rows were given.
 */
async function withTaxonomy(): Promise<{
  app: Application;
  rootId: number;
  childId: number;
  loneId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const root = await store.insertCategory({
    domainId: domain.id,
    key: ROOT_KEY,
    name: 'Phrases',
    parentId: null,
  });
  const child = await store.insertCategory({
    domainId: domain.id,
    key: CHILD_KEY,
    name: 'Signals',
    parentId: root.id,
  });
  const lone = await store.insertCategory({
    domainId: domain.id,
    key: LONE_KEY,
    name: 'Tools',
    parentId: null,
  });

  return {
    app: buildCategoriesApp(store),
    rootId: root.id,
    childId: child.id,
    loneId: lone.id,
  };
}

/** The path a domain's taxonomy is read and written at. */
function taxonomyPath(slug: string): string {
  return `/domains/${slug}/categories`;
}

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no category
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withTaxonomy();

    const missing = await request(app).get(taxonomyPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own. It also says what the 404 is FOR
    // — an empty taxonomy is a 200 carrying `data: []`, so only a
    // domain that is not there answers this way.
    const found = await request(app).get(taxonomyPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(3);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withTaxonomy();
    const body = { key: 'example-bucket', name: 'Example Bucket' };

    const missing = await request(app)
      .post(taxonomyPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createCategory` parses the body BEFORE
    // it resolves the slug, so a malformed one would be answered
    // 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.key).toBe(body.key);
  });
});

describe('an id naming no category', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, loneId } = await withTaxonomy();
    const patch = { name: 'Tooling' };

    const missing = await request(app)
      .patch(`/categories/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/categories/${loneId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe(patch.name);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, loneId } = await withTaxonomy();

    const missing = await request(app).delete(`/categories/${ABSENT_ID}`);
    const removed = await request(app).delete(`/categories/${loneId}`);
    const afterwards = await request(app).get(taxonomyPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    // The lone root holds no children, so the guard has nothing to
    // refuse. That the taxonomy is two rows afterwards is what says
    // the 204 was a delete rather than a handler answering without
    // acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(2);
  });
});

describe('a path segment that is not an id', () => {
  it('answers 422 naming the segment rather than 404', async () => {
    const { app, loneId } = await withTaxonomy();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(app)
      .patch('/categories/abc')
      .send({});
    const onDelete = await request(app).delete('/categories/abc');
    const anId = await request(app).delete(`/categories/${loneId}`);

    // Both writes that take an `:id`, against ONE body constant:
    // two handlers are two chances to narrow the segment in only
    // one of them, and nothing else in this package would report
    // the half that was left raw.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter on the one list route that takes no window
// ---------------------------------------------------------------------------

describe('a query parameter on a route that takes none', () => {
  it('answers 422 naming the query rather than ignoring it', async () => {
    const { app } = await withTaxonomy();

    // `?page` is the parameter a caller is likeliest to send here,
    // because every OTHER list route on this surface takes it.
    // Stripped rather than refused, it would answer the whole
    // taxonomy and look to that caller like a first page with
    // nothing after it.
    const whole = taxonomyPath(STORED_SLUG);

    const paged = await request(app).get(`${whole}?page=2`);
    const listed = await request(app).get(whole);

    expect(paged.status).toBe(422);
    expect(paged.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'query',
        message: 'Carries a key this endpoint does not declare.',
        code: 'unrecognized_keys',
      }],
    });
    // The control: the same read with no query at all, which is
    // what says the route serves the taxonomy rather than refusing
    // every list it is asked for.
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// The payload: a key already taken, and a parent one level too deep
// ---------------------------------------------------------------------------

describe('a create naming a key the domain carries', () => {
  it('answers 409, where a free key answers 201', async () => {
    const { app } = await withTaxonomy();

    const duplicate = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: ROOT_KEY, name: 'A second phrases bucket' });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: 'example-bucket', name: 'Example Bucket' });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'This domain already carries a category under that key',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.key).toBe('example-bucket');
  });
});

describe('a parent that would make a third level', () => {
  it('answers 422 on a create, where a root answers 201', async () => {
    const { app, rootId, childId } = await withTaxonomy();
    const body = { key: 'example-bucket', name: 'Example Bucket' };

    const tooDeep = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ ...body, parentId: childId });
    // The control is one level up rather than a parent left out
    // entirely: it says the refusal is about DEPTH and not about a
    // route that refuses every `parentId` it is given.
    const created = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ ...body, parentId: rootId });

    expect(tooDeep.status).toBe(422);
    expect(tooDeep.body).toStrictEqual(TOO_DEEP_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.parentId).toBe(rootId);
  });

  it('answers 422 on a patch, where a root answers 200', async () => {
    const { app, rootId, childId, loneId } = await withTaxonomy();

    const tooDeep = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ parentId: childId });
    const moved = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ parentId: rootId });

    // The same body constant as the create, which is the claim: two
    // writes reach one trigger, and a handler letting either answer
    // differently is a red case rather than a difference nobody
    // looked for.
    expect(tooDeep.status).toBe(422);
    expect(tooDeep.body).toStrictEqual(TOO_DEEP_BODY);
    expect(moved.status).toBe(200);
    expect(moved.body.data.parentId).toBe(rootId);
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete of a category that still holds children
// ---------------------------------------------------------------------------

describe('a delete of a category holding children', () => {
  it('answers 409 and leaves the category standing', async () => {
    const { app, rootId, loneId } = await withTaxonomy();

    const refused = await request(app).delete(`/categories/${rootId}`);
    // The control: a childless root, deleted through the SAME
    // operation. Without it this case is equally green against a
    // route that refuses every delete it is given.
    const removed = await request(app).delete(`/categories/${loneId}`);
    const afterwards = await request(app).get(taxonomyPath(STORED_SLUG));
    const keys = (afterwards.body.data as KeyedRow[]).map((row) => row.key);

    // 409 and not the 422 a parent fault gets, although the store
    // raised both under ONE constraint name — which is why the
    // service takes the write as an argument, and why this is the
    // case that shows the distinction surviving to the wire.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'This category holds children, which have to move or go first',
    });
    expect(removed.status).toBe(204);
    // The refused row is still there and the confirmed one is gone,
    // which is the pair: a route that refused and deleted anyway
    // satisfies the status assertions above on their own.
    expect(keys).toStrictEqual([ROOT_KEY, CHILD_KEY]);
  });
});
