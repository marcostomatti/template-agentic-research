/**
 * `src/sources/failures-routes.ts` — what the one route answers
 * when it REFUSES: the status, the envelope and the members each
 * reaches the wire with. Driven over supertest against a router
 * built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `failures-service.test.ts` is the
 * translation, and only the translation. That an id naming no
 * source is a `NotFoundError` rather than an empty queue, that no
 * window can be built outside the schema's bounds, that a body is
 * masked and a cut one reports the stored length — those are
 * claims about the RULES and are pinned one file over, over direct
 * calls. What no call can report is whether the rule reached a
 * caller: the status `errorHandler` or the handler chose, the
 * envelope written around it, the members that envelope carried,
 * and whether a handler swallowed a throw on the way. So every
 * case below reads a response and none of them reads a return
 * value.
 *
 * SEVEN CASES IN FIVE GROUPS. Two guard the fixture and the
 * vocabulary every refusal is read against; one covers the
 * address; one covers the segment that is not one; one covers the
 * window; and two cover the parameter this route does not declare.
 * The POSITIVE half — what the page, its `meta` and a masked body
 * look like when the route LANDS, and the read-only reading taken
 * off the router's own `stack` — is a task of its own, and every
 * control below is a landing answer read only as far as the axis
 * its own case is about.
 *
 * THE ADDRESS. An id naming no source is `404` asserted against
 * ONE whole body constant, and its control is the SAME operation
 * over an id that resolves. That control is two requests rather
 * than one, because the pair is the claim: a source holding a
 * queue answers its rows, and a source whose captures ALL PARSED
 * answers an empty page with a `200`. The second is what says the
 * `404` is about the source being absent rather than about there
 * being nothing to answer — the two states are indistinguishable
 * to a handler that skipped the lookup, and identical in every
 * assertion a status alone can make.
 *
 * A SEGMENT THAT IS NOT AN ADDRESS is `422` naming `id` and never
 * `404`: a `404` says the row is not there, and a request that
 * never named a row has not established that. Its control ends on
 * an id that IS one, without which the assertion is equally green
 * against a router refusing every `:id` it is handed.
 *
 * AND THE SAME SEGMENT CARRYING A WINDOW THE SCHEMA REFUSES IS
 * ANSWERED ABOUT THE WINDOW, which is the one reading in this file
 * that the query is parsed BEFORE the address. Both faults are
 * facts about the request alone and neither costs a read, so the
 * ordering shows only when a request gets both wrong — and a
 * handler in the other order answers about `id` and passes every
 * other case here.
 *
 * THE WINDOW. This route IS paginated and takes the surface's
 * ordinary vocabulary, so a `?perPage` above the cap is `422`
 * naming `perPage` rather than a silent clamp. It is paired with a
 * request at exactly the cap, which is what says the refusal is a
 * CAP and not a route that refuses every window it is handed, and
 * that pair reads the echoed `meta.perPage` — the number reaching
 * the wire is how a caller learns it asked for more than this
 * surface serves.
 *
 * A PARAMETER THIS ROUTE DOES NOT DECLARE is `422` whose ONE
 * detail names `query` rather than the parameter, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * REQUEST said. The envelope is asserted whole, and its control is
 * the identical request with that parameter removed — so the pair
 * says the refusal is about the undeclared key rather than about a
 * route refusing every query it is handed.
 *
 * AND NEITHER THE PARAMETER NOR ITS VALUE COMES BACK. That case
 * COUNTS their occurrences in the serialised body rather than
 * asserting an absence, and takes the same count over a PLANTED
 * envelope carrying both — because a search that would find
 * nothing anywhere reports a clean refusal and a leaking one
 * alike. Those two strings are the whole of what a request in this
 * file submits that a refusal could plausibly repeat: no route
 * here reads a body, and the only other thing a caller types is
 * the id.
 *
 * THE VOCABULARY IS READ OFF THE SCHEMA AT RUNTIME rather than
 * trusted as a literal, so the pair stays two-directional: a
 * parameter ADDED to `paginationQuerySchema` makes the refused row
 * legal and reddens the fixture guard instead of leaving a case
 * nobody notices is wrong.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and
 * what a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s — the containment reading
 * below is scoped to the one channel this route opens. The four
 * routes over a `sources` ROW are not this router's at all and
 * have a file of their own.
 *
 * MUTATION GRID, derived over all seven cases by mutating one file
 * one edit at a time and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count. TEN legs, each named
 * by the EDIT it makes rather than by its effect, since a leg
 * described only by its effect is one nobody can run again. Eight
 * mutate `./failures-routes.ts` and two mutate
 * `src/http/schemas.ts`, which is the only target that can reach
 * the bounds and the strictness this file submits queries against.
 *
 * THE ADDRESS LEG READS FIVE, and the case it leaves out is the
 * ordering showing up as a measurement. Returning the segment raw
 * from {@link readId} reddens every case that addresses a row by
 * id AND gets an answer out of the store — the `404`, the
 * not-an-id case, the window case, the undeclared-parameter case
 * and the fixture guard. The containment case is in NEITHER
 * address set, because its request is answered about the query
 * before the id is used at all.
 *
 * ISSUING THE ADDRESS PARSE FIRST REDDENS EXACTLY ONE, the
 * not-an-id case, which is the half of that case the over-cap
 * segment exists for: every other request here gets at most one
 * thing wrong, so the two parses are indistinguishable to them.
 * NOT PARSING THE QUERY AT ALL reddens FOUR — the same case,
 * the window case and both undeclared-parameter cases.
 *
 * THE STATUS LEG READS FOUR. `res.status(200)` written as `201`
 * reddens every case carrying a landing control, which is all four
 * refusal cases and neither guard: the fixture guard reads two
 * pages without reading a status, and the containment case never
 * reaches a `200`. So the status IS pinned here, by no case that is
 * about it — which is what a refusals-only file's controls
 * buy.
 *
 * `ok(page.rows)` IN PLACE OF `okPage(page.rows, meta)` REDDENS
 * ONE, the window case, which is the only read here that looks at
 * `meta` at all.
 *
 * REGISTERING THE ROUTE AS A `post` REDDENS SIX, every case that
 * sends a request. Blunt rather than thorough, and recorded as the
 * shape it is: what says the verb is a `get` and the ONLY verb is
 * the positive half's structural reading off the router's own
 * `stack`, not this leg.
 *
 * THE TWO SCHEMA LEGS SEPARATE, and neither is reachable from the
 * other. Dropping `.max(MAX_PER_PAGE)` reddens TWO, the window
 * case and the not-an-id case's over-cap half. Dropping `.strict()`
 * from `paginationQuerySchema` reddens the OTHER two, both
 * undeclared-parameter cases, and nothing else.
 *
 * AND TWO LEGS REDDEN NOTHING, both recorded rather than repaired.
 * A fixed `{ limit: 50, offset: 0 }` in place of
 * `toStoreWindow(query)` reddens ZERO, and so does
 * `total: page.rows.length` in place of `total: page.total`, for
 * one reason: no refusal case can afford a window narrower than
 * the collection it is reading, so every page here holds every row
 * and the two numbers agree. Both are the positive half's
 * claims — a page past the end over a queue of three — and
 * this file records the zeros rather than pretending to them.
 */
import type {
  MemoryResearchStore,
  MemorySourceDocument,
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
import { paginationQuerySchema } from '../http/schemas.js';

import { buildSourceFailuresRouter } from './failures-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('source-failures-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/** The feed whose captures include the ones that would not parse. */
const FEED_ENDPOINT = 'https://example.test/radar/feed.xml';

/**
 * A second source of the same domain, whose captures ALL parsed.
 *
 * The half of the `404`'s control that a length cannot supply: its
 * page is empty and its status is `200`, which is the state a
 * handler that skipped the lookup answers a mistyped id with.
 */
const ITEMS_ENDPOINT = 'https://example.test/radar/items';

/**
 * An id no planted source carries.
 *
 * Far past the two the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** How many failed captures {@link FEED_ENDPOINT} holds. */
const PLANTED_FAILURES = 3;

/** When every planted capture was taken. */
const CAPTURED_AT = new Date('2026-03-01T00:00:00.000Z');

/**
 * The largest `perPage` the schema takes.
 *
 * Written out rather than imported, because `MAX_PER_PAGE` in
 * `src/http/schemas.ts` is not exported: this file holds the
 * BOUNDARY rather than the constant, and the refusal above it and
 * the control at it are what make it one.
 */
const LARGEST_PER_PAGE = 200;

/** One past it, and the only window this file is refused for. */
const OVER_CAP_PER_PAGE = LARGEST_PER_PAGE + 1;

/**
 * A query parameter `paginationQuerySchema` does not declare.
 *
 * Read against that schema's own shape by the fixture guard rather
 * than trusted here, so a parameter added to the window vocabulary
 * reddens there instead of leaving this case asserting a refusal
 * that has quietly become a legal request.
 *
 * Distinctive as a substring for the same reason its value is:
 * the containment case counts both in the refusal they produced,
 * and a short realistic token would be satisfiable by some other
 * member of the envelope.
 */
const UNDECLARED_PARAM = 'zzsortparamzz';

/** What that parameter is submitted with, on the same terms. */
const UNDECLARED_VALUE = 'zzsortvaluezz';

/**
 * The whole body a `404` about a source answers with.
 *
 * One constant rather than a literal at the assertion, which is
 * how this file says the message is the service's own sentence
 * arriving unmodified with `code` beside it and nothing else.
 */
const NO_SUCH_SOURCE_BODY = {
  code: 'NOT_FOUND',
  message: 'No source carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one.
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
 * The whole body a `?perPage` above the cap answers with.
 *
 * `too_big` and naming the parameter the caller typed, which is
 * what makes the refusal the only way a client learns it asked for
 * more than this surface serves.
 */
const OVER_CAP_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'perPage',
    message: 'Above the allowed maximum.',
    code: 'too_big',
  }],
};

/**
 * The whole body an undeclared query parameter answers with.
 *
 * ONE detail naming `query` rather than the parameter, and `query`
 * rather than `body` because `parseQuery` is what the handler
 * called: the two parsers differ ONLY in the name a root-level
 * issue takes, so this constant is also the reading that the list
 * route reached for the right one.
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
 * One planted `documents` row that did not parse.
 *
 * @param id - The document id, unique across the fixture because
 *   it is also the tiebreak the queue orders on.
 * @returns The row, `failed` and carrying a reason. Every capture
 *   this file plants under {@link FEED_ENDPOINT} is one: what a
 *   page SELECTS is the positive half's subject, so the queue here
 *   only has to be non-empty.
 */
function failedCapture(id: number): MemorySourceDocument {
  return {
    id,
    url: `${FEED_ENDPOINT}#${id}`,
    body: 'a capture that would not parse',
    parseError: 'unexpected end of input',
    capturedAt: CAPTURED_AT,
    parseStatus: 'failed',
  };
}

/**
 * The path one source's failures are read under.
 *
 * @param id - The source's id, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 */
function failuresPath(id: number | string): string {
  return `/sources/${id}/failures`;
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Builds an app carrying one freshly built failures router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the route is mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file's failures depend on
 * their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on this route reads the present.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildFailuresApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSourceFailuresRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One domain, two sources and one queue, and the app in front of
 * them.
 *
 * The smallest fixture every case here can be reached from, and
 * both sources earn their place: {@link FEED_ENDPOINT} holds
 * {@link PLANTED_FAILURES} captures that did not parse, and
 * {@link ITEMS_ENDPOINT} holds one that did and nothing else. The
 * second is the `404`'s other control — an id that RESOLVES and
 * answers an empty page — which is the state a handler that
 * skipped the lookup would answer a mistyped id with.
 *
 * The documents are PLANTED rather than written, because no port
 * writes a `documents` row at all — `src/sources/store.ts` states
 * the absence IS the read-only rule — so
 * `MemoryResearchStore.setSourceDocuments` is the only way this
 * table gets rows, and every queue below would otherwise be empty.
 *
 * @returns The app and the two source ids. The store is not handed
 *   back: every reading a case takes afterwards is a response, so
 *   a case reaching past the surface under test would be pinning
 *   the fixture rather than the router. The ids are addresses
 *   rather than readings — a request cannot name a row without
 *   one.
 */
async function withFailures(): Promise<{
  app: Application;
  feedId: number;
  quietId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const feed = await store.insertSource({
    domainId: domain.id,
    kind: 'rss',
    endpoint: FEED_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const quiet = await store.insertSource({
    domainId: domain.id,
    kind: 'api',
    endpoint: ITEMS_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  store.setSourceDocuments(feed.id, Array.from(
    { length: PLANTED_FAILURES },
    (_unused, index) => failedCapture(index + 1),
  ));
  store.setSourceDocuments(quiet.id, [
    {
      id: PLANTED_FAILURES + 1,
      url: `${ITEMS_ENDPOINT}#ok`,
      body: 'a capture that parsed',
      parseError: null,
      capturedAt: CAPTURED_AT,
      parseStatus: 'ok',
    },
  ]);

  return { app: buildFailuresApp(store), feedId: feed.id, quietId: quiet.id };
}

// ---------------------------------------------------------------------------
// What the fixture plants, and the vocabulary behind every refusal
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants one source with a queue and one with none', async () => {
    const { app, feedId, quietId } = await withFailures();

    // Two distinct sources, so the `404`'s control and the empty
    // page it is paired with cannot be the same row answered twice.
    expect(feedId).not.toBe(quietId);
    // Neither is the id the `404` case names, which no assertion in
    // that case could say for itself: an `ABSENT_ID` that had
    // collided with a planted row would answer `200` and read as a
    // refusal that stopped happening.
    expect([feedId, quietId]).not.toContain(ABSENT_ID);
    // The queue is non-empty, so the control beside the `404` reads
    // rows rather than the empty page its neighbour reads.
    expect(PLANTED_FAILURES).toBeGreaterThan(0);

    const queued = await request(app).get(failuresPath(feedId));
    const quiet = await request(app).get(failuresPath(quietId));

    expect(queued.body.data).toHaveLength(PLANTED_FAILURES);
    // And the second source's captures really did all parse: an
    // empty page here is what the `404` is told apart FROM, so a
    // fixture that had planted a failure under it would make that
    // case's control the same reading as its neighbour.
    expect(quiet.body.data).toHaveLength(0);
  });

  it('reads the undeclared parameter off the schema', async () => {
    // Read off `paginationQuerySchema`'s own shape rather than
    // trusting a literal, so the pair below stays two-directional:
    // a parameter ADDED to the window vocabulary makes the refused
    // request legal and reddens here, and one REMOVED makes a
    // declared member refusable and reddens here too. Neither
    // direction is reported by any assertion in the cases
    // themselves.
    const declared = Object.keys(paginationQuerySchema.shape);

    expect(declared).toContain('page');
    expect(declared).toContain('perPage');
    expect(declared).not.toContain(UNDECLARED_PARAM);
    // The two needles the containment case counts are distinct from
    // each other and from everything the envelope says, so a zero
    // there is about the request rather than about a substring that
    // could not have appeared anyway.
    expect(UNDECLARED_PARAM).not.toBe(UNDECLARED_VALUE);
    const envelope = JSON.stringify(UNDECLARED_QUERY_BODY);

    expect(countOccurrences(envelope, UNDECLARED_PARAM)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The address: an id naming no source
// ---------------------------------------------------------------------------

describe('an id naming no source', () => {
  it('answers 404, and 200 for an id that is', async () => {
    const { app, feedId, quietId } = await withFailures();

    const missing = await request(app).get(failuresPath(ABSENT_ID));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own.
    const found = await request(app).get(failuresPath(feedId));
    // And the half a length cannot supply. A source whose captures
    // ALL PARSED answers an empty page with a 200, which is exactly
    // what a handler that skipped the lookup would have answered
    // the missing id with — so this is what says the 404 is about
    // the source being absent rather than about there being nothing
    // to answer.
    const quiet = await request(app).get(failuresPath(quietId));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SOURCE_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(PLANTED_FAILURES);
    expect(quiet.status).toBe(200);
    expect(quiet.body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// The segment: an address that is not one, and the ordering it shows
// ---------------------------------------------------------------------------

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, feedId } = await withFailures();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const notAnId = await request(app).get(failuresPath('abc'));
    // The same segment carrying a window the schema refuses is
    // answered about the WINDOW, which is the one reading in this
    // file that the query is parsed BEFORE the address: a handler
    // in the other order answers about `id` here and passes every
    // other case in the file.
    const alsoOverCap = await request(app)
      .get(`${failuresPath('abc')}?perPage=${OVER_CAP_PER_PAGE}`);
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).get(failuresPath(feedId));

    expect(notAnId.status).toBe(422);
    expect(notAnId.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(alsoOverCap.status).toBe(422);
    expect(alsoOverCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(anId.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap this surface serves
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app, feedId } = await withFailures();
    const failures = failuresPath(feedId);

    const overCap = await request(app)
      .get(`${failures}?perPage=${OVER_CAP_PER_PAGE}`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app)
      .get(`${failures}?perPage=${LARGEST_PER_PAGE}`);

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(LARGEST_PER_PAGE);
    expect(atCap.body.data).toHaveLength(PLANTED_FAILURES);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter this route does not declare
// ---------------------------------------------------------------------------

describe('a query parameter this route does not declare', () => {
  it('answers 422 naming the query rather than the parameter', async () => {
    const { app, feedId } = await withFailures();
    const failures = failuresPath(feedId);

    const undeclared = await request(app)
      .get(failures)
      .query({ page: 1, [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    // The control is the identical request with that parameter
    // removed, so the pair says the refusal is about the key rather
    // than about a route refusing every query it is handed — and
    // `?page=1` is legal on its own, which is what makes the
    // difference between the two requests the one member.
    const declared = await request(app)
      .get(failures)
      .query({ page: 1 });

    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(declared.status).toBe(200);
    expect(declared.body.data).toHaveLength(PLANTED_FAILURES);
  });

  it('quotes neither the parameter nor the value it carried', async () => {
    const { app, feedId } = await withFailures();

    const undeclared = await request(app)
      .get(failuresPath(feedId))
      .query({ [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    const answered = JSON.stringify(undeclared.body);
    const needles = [UNDECLARED_PARAM, UNDECLARED_VALUE];
    const found = needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }));

    expect(undeclared.status).toBe(422);
    expect(found).toStrictEqual(needles.map((needle) => ({
      needle,
      occurrences: 0,
    })));

    // The search would find them: a planted envelope carrying both
    // needles is counted by the same function in the same case, so
    // the zeros above are a reading rather than a search that could
    // only ever answer nothing.
    const planted = JSON.stringify({
      ...UNDECLARED_QUERY_BODY,
      message: `${UNDECLARED_PARAM} is not ${UNDECLARED_VALUE}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toStrictEqual(needles.map((needle) => ({
      needle,
      occurrences: 1,
    })));

    // The envelope was built at all: a body that never arrived
    // would satisfy every count above.
    expect(answered.length).toBeGreaterThan(0);
  });
});
