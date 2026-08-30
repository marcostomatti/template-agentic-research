/**
 * `src/domains/routes.ts` — the five ways this router says no, and
 * the status, envelope and details each refusal reaches the wire
 * with. Driven over supertest against a router built by the real
 * factory, standing on `tests/helpers/memory-research-store.ts`, so
 * every claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation, and
 * only the translation. That a taken slug is a `ConflictError` and a
 * guarded delete carries its counts are claims about the RULES and
 * are pinned one file over, over direct calls. What no call can
 * report is whether the rule reached a caller: the status
 * `errorHandler` chose, the envelope it wrote, and whether a handler
 * swallowed the throw on the way. So every case below reads a
 * response and none of them reads a return value.
 *
 * FIVE REFUSALS, GROUPED BY WHICH PART OF THE REQUEST WAS WRONG.
 *
 * THE ADDRESS. A slug naming no row is `404` on all three operations
 * that take one, asserted against ONE shared body constant rather
 * than three that agree today — three handlers are three chances to
 * answer a missing domain three different ways, and this file is the
 * only place that could report it. A segment that is not a slug at
 * all is `422` naming `slug` and never `404`: a `404` says the row
 * is not there, and a request that never named a row has not
 * established that.
 *
 * THE PAYLOAD. A slug already taken is `409` with
 * `code: 'CONFLICT'`, which is the translation being pinned rather
 * than merely that something was thrown — `StoreRefusal` is
 * deliberately not an `AppError`, so an untranslated one answers
 * `500`. A create body the schema refuses is `422` carrying one
 * detail per fault, asserted as the whole list because a refusal for
 * one reason and a refusal for two are different answers to a caller
 * reading details.
 *
 * THE WINDOW. A `?perPage` above the cap is `422` naming `perPage`
 * with `code: 'too_big'`, raised before the store is asked anything.
 * An undeclared query parameter is `422` naming `query` — the root
 * field `parseQuery` gives a query-string fault, which no other file
 * in this package reaches through a real route.
 *
 * THE GUARD. A delete of a domain still holding rows it accumulated
 * is `409` whose `details` carries the three counts. Those counts
 * are swept off the interface rather than named one by one, so a
 * fourth counted table reddens this case instead of quietly
 * travelling unasserted. WHERE the guard runs relative to the
 * destructive call is `service.test.ts`'s subject, measured there
 * through a recording wrapper; what this case adds is that the
 * refusal and its counts survive the trip to the wire.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy every
 * assertion above, so each refusal carries its own positive control
 * in the same case body, varied along the axis under test: each
 * `404` reads the domain that IS stored through the SAME operation,
 * the `409` creates under a free slug, the over-cap `perPage` is
 * paired with a request at exactly the cap, and the guarded delete
 * reads the row back afterwards to say it is still standing. Without
 * that last one the case is equally green against a route that
 * refused and deleted anyway.
 *
 * CONTAINMENT. The undeclared-key case names the key with a sentinel
 * and counts its occurrences in the serialised response rather than
 * asserting absence — a search that would find nothing anywhere
 * reports a clean refusal and a leaking one alike. Its live control
 * is the same count over the request payload, which must be
 * non-zero. That channel is the one the sanitiser actually closes:
 * zod's own message quotes an unrecognized key back verbatim, and
 * `zodToValidationError` in `lib/errors/handler.ts` would copy it to
 * the wire. The submitted VALUE in the same body is closed further
 * upstream — zod puts a value in no path and no message — so its
 * zero is evidence about zod rather than about this router.
 *
 * MUTATION GRID, measured over the eleven cases here by mutating
 * `routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count. Five legs.
 *
 * Answering the `POST` with `200` instead of `201` reddens ONE, the
 * duplicate-slug case, and it reddens it through the CONTROL rather
 * than through the refusal — which is the control doing the job it
 * is there for. Dropping the `readSlug` call from the `GET` handler
 * reddens ONE, the not-a-slug case, and leaves all three `404`s
 * green: an unnarrowed slug still finds no row, which is exactly
 * why that case is written to assert a `422` rather than an
 * absence. Widening `cascade` from the literal to any string
 * reddens ONE, the misspelt-confirmation case, which then reads the
 * guard's `409` instead — the two answers that case exists to keep
 * apart. Skipping `parseQuery` on the list route reddens TWO, both
 * window cases, which is that pair saying it is about the parse and
 * not about two different limits. And answering `ok(page.rows)`
 * without `meta` reddens ONE, the `perPage` case, through the
 * at-the-cap control alone — the only assertion in this file that
 * reads a `meta` at all, since a paginated body's own shape is the
 * next task's subject.
 *
 * That last split is the file's own honest edge: the positive cases
 * this file will carry are not written yet, so the grid above is a
 * measurement over the refusal half alone and every figure in it
 * moves when they land.
 */
import type { DomainDependentCounts } from './store.js';
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

import { buildDomainsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('domains-routes-test', { level: 'silent' });

/**
 * The slug every case that needs a stored domain plants under.
 *
 * The seeded worked example's own slug, so the fixtures here read in
 * the same register as `data/domains.json` and the naming invariant
 * has nothing to find.
 */
const STORED_SLUG = 'example-tech-radar';

/** What the stored domain is called. */
const STORED_NAME = 'Example Tech Radar';

/** A slug no case plants, in the same register as a real one. */
const ABSENT_SLUG = 'no-domain-carries-this';

/**
 * The whole body every `404` on this router answers with.
 *
 * One constant asserted by three cases rather than three literals,
 * which is how this file says the three operations answer ONE
 * envelope rather than three that happen to agree today. The message
 * is `src/domains/service.ts`'s constant; what is pinned here is
 * that it arrives unmodified with `code` beside it and nothing else.
 */
const NOT_FOUND_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/**
 * Three zeros, annotated by the interface so that a fourth counted
 * table is a red `check-types` at this line before it can silently
 * narrow the sweep the guard case runs.
 */
const NO_DEPENDENTS: DomainDependentCounts = {
  topics: 0,
  sources: 0,
  findings: 0,
};

/**
 * Builds an app carrying one freshly built domains router.
 *
 * `errorHandler` is registered LAST, exactly as `createService` does
 * it, because that registration is what turns a bare `throw` inside
 * an `async` handler into a typed body — without it every case here
 * would read Express's own 500 page. What this app leaves out is the
 * framework's middleware stack and the auth guard: that the routes
 * are mounted behind `ctx.requireAuth` is `tests/api/wiring.test.ts`'s
 * claim, and a limiter counting across cases would only make this
 * file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be reached
 * by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildDomainsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildDomainsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * A store holding one domain, and the app in front of it.
 *
 * Planted through the PORT rather than through `POST /domains`, so a
 * case about a read is not also a case about the create route — and
 * so the duplicate-slug case is refused by a row it did not have to
 * create successfully first.
 *
 * @returns The app, the store behind it, and the planted row's id.
 */
async function withStoredDomain(): Promise<{
  app: Application;
  store: MemoryResearchStore;
  id: number;
}> {
  const store = createMemoryResearchStore();
  const row = await store.insertDomain({
    slug: STORED_SLUG,
    name: STORED_NAME,
    settings: {},
  });

  return { app: buildDomainsApp(store), store, id: row.id };
}

/**
 * How many times a string occurs in a serialised value.
 *
 * A count rather than a `toContain` assertion: zero over the
 * answered envelope is only evidence beside a known positive over
 * something that DOES carry the string, and a boolean cannot give
 * that pair.
 *
 * @param value - What to serialise and search.
 * @param needle - The sentinel to count.
 * @returns The number of occurrences.
 */
function countIn(value: unknown, needle: string): number {
  return JSON.stringify(value).split(needle).length - 1;
}

// ---------------------------------------------------------------------------
// The address: a slug naming no row, and a segment that is no slug
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a read, and 200 for the stored slug', async () => {
    const { app } = await withStoredDomain();

    const missing = await request(app).get(`/domains/${ABSENT_SLUG}`);
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own.
    const found = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NOT_FOUND_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.slug).toBe(STORED_SLUG);
  });

  it('answers 404 on a patch, and 200 for the stored slug', async () => {
    const { app } = await withStoredDomain();
    const patch = { name: 'Renamed' };

    const missing = await request(app)
      .patch(`/domains/${ABSENT_SLUG}`)
      .send(patch);
    const found = await request(app)
      .patch(`/domains/${STORED_SLUG}`)
      .send(patch);

    // The patch body is VALID on both calls, which is what makes
    // this a case about the slug: `patchDomain` parses the body
    // before it resolves the slug, so a malformed one would be
    // answered 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NOT_FOUND_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe(patch.name);
  });

  it('answers 404 on a delete, and 204 for the stored slug', async () => {
    const { app } = await withStoredDomain();

    const missing = await request(app).delete(`/domains/${ABSENT_SLUG}`);
    const removed = await request(app).delete(`/domains/${STORED_SLUG}`);
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NOT_FOUND_BODY);
    // The stored domain holds nothing it accumulated, so the guard
    // has nothing to refuse and no confirmation is needed. That it
    // then reads back as a 404 is what says the 204 was a delete
    // rather than a handler answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.status).toBe(404);
  });
});

describe('a path segment that is not a slug', () => {
  it('answers 422 naming the segment rather than 404', async () => {
    const { app } = await withStoredDomain();

    // Uppercase and a trailing hyphen: refused by `slugParamSchema`,
    // and equally a slug no row carries — which is the whole point
    // of the case, since a router that skipped the narrowing would
    // answer the 404 the group above asserts instead.
    const response = await request(app).get('/domains/NotASlug-');

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'slug',
        message: 'Not in the expected format.',
        code: 'invalid_format',
      }],
    });
  });
});

// ---------------------------------------------------------------------------
// The payload: a slug already taken, and a body the schema refuses
// ---------------------------------------------------------------------------

describe('a create naming a slug that is taken', () => {
  it('answers 409, where a free slug answers 201', async () => {
    const { app } = await withStoredDomain();

    const duplicate = await request(app)
      .post('/domains')
      .send({ slug: STORED_SLUG, name: 'A second radar' });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post('/domains')
      .send({ slug: 'example-transit-map', name: 'Example Transit Map' });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'A domain already exists under that slug',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('example-transit-map');
  });
});

describe('a create body the schema refuses', () => {
  it('answers 422 carrying one detail per fault', async () => {
    const store = createMemoryResearchStore();
    const app = buildDomainsApp(store);

    const response = await request(app)
      .post('/domains')
      .send({
        slug: STORED_SLUG,
        name: '',
        settings: { scoringWeights: { novelty: 'heavy' } },
      });
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(response.status).toBe(422);
    // The whole list, not a member of it: a refusal for one reason
    // and a refusal for two are different answers to a caller
    // reading details, and only this says which happened. The
    // weight's key is masked to `*` because it is the operator's own
    // rather than this service's, while `name` keeps its name.
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        {
          field: 'name',
          message: 'Below the allowed minimum.',
          code: 'too_small',
        },
        {
          field: 'settings.scoringWeights.*',
          message: 'Missing, or not of the expected type.',
          code: 'invalid_type',
        },
      ],
    });
    // A refused create must not have written the row it named.
    expect(afterwards.status).toBe(404);
  });

  it('answers 422 naming the body, not the undeclared key', async () => {
    const { app } = await withStoredDomain();
    // The sentinel is the KEY, which is the channel the sanitiser
    // closes: zod's own message for this issue quotes the key back
    // verbatim, and `zodToValidationError` would copy that string to
    // the wire. The VALUE beside it is closed further upstream, so
    // its own containment is evidence about zod rather than about
    // this router.
    const sentinel = 'zzsentinelkeyzz';
    const payload = { [sentinel]: sentinel };

    const response = await request(app)
      .patch(`/domains/${STORED_SLUG}`)
      .send(payload);

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'body',
        message: 'Carries a key this endpoint does not declare.',
        code: 'unrecognized_keys',
      }],
    });
    expect(countIn(response.body, sentinel)).toBe(0);
    // The live control: the same search over something that DOES
    // carry the sentinel. Without it a zero says only that the
    // search found nothing anywhere.
    expect(countIn(payload, sentinel)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap, and a parameter nothing declares
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app } = await withStoredDomain();

    const overCap = await request(app).get('/domains?perPage=201');
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get('/domains?perPage=200');

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'perPage',
        message: 'Above the allowed maximum.',
        code: 'too_big',
      }],
    });
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
  });

  it('answers 422 naming the query for an undeclared parameter', async () => {
    const { app } = await withStoredDomain();

    // A misspelt `page`. Stripped rather than refused, it would
    // answer page 1 and look to the caller like a collection that
    // has nothing past its first page.
    const response = await request(app).get('/domains?pge=2');

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'query',
        message: 'Carries a key this endpoint does not declare.',
        code: 'unrecognized_keys',
      }],
    });
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete of a domain that still holds rows
// ---------------------------------------------------------------------------

describe('a delete of a domain holding rows it accumulated', () => {
  it('answers 409 with the counts and leaves the row standing', async () => {
    const { app, store, id } = await withStoredDomain();
    const held: DomainDependentCounts = {
      topics: 2,
      sources: 0,
      findings: 5,
    };

    store.setDomainDependents(id, held);

    const refused = await request(app).delete(`/domains/${STORED_SLUG}`);
    // The control: without it this case is equally green against a
    // route that refused and deleted anyway.
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'This domain holds rows a delete would take with it',
      details: held,
    });
    // Swept off the interface rather than named one by one, so a
    // fourth counted table reddens this case rather than travelling
    // unasserted. The spread is what gives an interface an index
    // signature; `NO_DEPENDENTS` is annotated by the interface, so
    // the member is owed at `check-types` too.
    expect(Object.keys({ ...refused.body.details }).sort())
      .toStrictEqual(Object.keys({ ...NO_DEPENDENTS }).sort());
    expect(afterwards.status).toBe(200);
    expect(afterwards.body.data.slug).toBe(STORED_SLUG);
  });

  it('answers 422 for a cascade spelled any other way', async () => {
    const { app, store, id } = await withStoredDomain();

    store.setDomainDependents(id, { findings: 1 });

    // A caller that wrote this meant to get past the guard.
    // Answering it the guard's own 409 would send it looking for
    // rows to remove instead of for the typo it made.
    const response = await request(app)
      .delete(`/domains/${STORED_SLUG}?cascade=yes`);
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'cascade',
        message: 'Not one of the accepted values.',
        code: 'invalid_value',
      }],
    });
    expect(afterwards.status).toBe(200);
  });
});
