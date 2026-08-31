/**
 * `src/topics/routes.ts` — what each of the four routes answers
 * when it refuses: the status, the envelope and the details each
 * reaches the wire with. Driven over supertest against a router
 * built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a taken name is a `ConflictError`
 * from both writes that can propose one, that an unknown slug and
 * an unknown id are told apart, that `nextRunAt` is an unrecognized
 * key on both request schemas — those are claims about the RULES
 * and are pinned one file over, over direct calls. What no call can
 * report is whether the rule reached a caller: the status
 * `errorHandler` or the handler chose, the envelope written around
 * it, the members that envelope carried, and whether a handler
 * swallowed a throw on the way. So every case below reads a
 * response and none of them reads a return value.
 *
 * TEN CASES OVER SEVEN WAYS A REQUEST TO THIS ROUTER CAN BE WRONG,
 * plus the fixture guard the duplicate case rests on. The answers
 * these routes give when they LAND are a separate half and land in
 * their own commit; what stands in for them here is the control
 * each case carries in its own body.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no topic is `404` on both that
 * take one, each asserted against ONE shared body constant per
 * ADDRESS rather than four literals that agree today. The constants
 * are per address and not per status: a `404` about a domain and a
 * `404` about a topic are two envelopes on one router, and four
 * handlers are four chances to answer a missing row four different
 * ways. A segment that is not an ADDRESS at all is `422` naming
 * `id` or `slug` and never `404` — a `404` says the row is not
 * there, and a request that never named a row has not established
 * that. Both of those are asserted across the TWO routes that share
 * each segment inside one case, because two handlers are two
 * chances to narrow only one of them. The slug half is the only
 * reading here that `readSlug` narrows at all: every other slug
 * case sends a well-formed slug, so an unnarrowed segment answers
 * exactly the `404` they already assert — measured, as the grid
 * below records.
 *
 * THE WINDOW. This list route IS paginated, unlike the taxonomy's,
 * so a `?perPage` above the cap is `422` naming `perPage` rather
 * than a silent clamp. It is paired with a request at exactly the
 * cap, which is what says the refusal is a CAP and not a route that
 * refuses every window it is handed.
 *
 * THE PAYLOAD. A name the domain already researches is `409` with
 * `code: 'CONFLICT'` from the create AND from the rename, which is
 * the translation being pinned rather than merely that something
 * was thrown: `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers `500`. Both writes are driven because
 * `patchTopicSchema` carries `name`, so each is a separate call
 * site a module could stop translating on its own. The create
 * carries the control the other two cannot stand in for: the same
 * name under a SECOND domain is accepted, which is what says the
 * key is per-domain rather than global.
 *
 * A BODY NAMING `nextRunAt` is `422` whose ONE detail names `body`,
 * asserted as the WHOLE envelope and from both writes. That is the
 * pipeline-owned-column rule reaching a caller: the column is
 * answered on every read and accepted by nothing, and the two
 * routes that may write it are the schedule verbs, which are not on
 * this router yet. Its control is the same body with the member
 * removed, which is accepted and lands a `nextRunAt` of null — so
 * the pair says the refusal is about that MEMBER rather than about
 * a router refusing every create it is handed.
 *
 * AND NOTHING SUBMITTED COMES BACK THROUGH IT. The instant those
 * two requests submit is a value a refusal could quote, unlike
 * every other request in this file, so the case counts its
 * occurrences in the serialised body rather than asserting absence
 * — and takes the same count over a PLANTED envelope carrying it,
 * because a search that would find nothing anywhere reports a clean
 * refusal and a leaking one alike.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every assertion below, so each case carries its own control in
 * the same body, varied along the axis under test: each `404` reads
 * what IS there through the SAME operation, the not-an-id case ends
 * on an id that is one, the two `409`s create and rename under a
 * free name, the over-cap `perPage` is paired with a request at
 * exactly the cap, and the refused member is removed and resent.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s — the containment reading
 * below is scoped to the one channel these routes open, which is
 * the value a refused pipeline-owned member carries.
 *
 * MUTATION GRID, measured over all eleven cases by mutating
 * `routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count. Eight legs, and every
 * figure belongs to this case list rather than to the task that
 * wrote it — the positive half moves all of them.
 *
 * THE STATUS LEGS LAND ON CONTROLS RATHER THAN ON SUBJECTS, which
 * is what a refusals-only file looks like from the inside.
 * Answering the `POST` with `200` reddens THREE — the create halves
 * of the slug `404` and of the `409`, and the accepted control of
 * the pipeline-owned case — and not one of the three is named for a
 * create. Answering `204` as `200` reddens TWO and answering the
 * `PATCH` with `204` reddens TWO, both through the same kind of
 * control. So every status this router chooses is already pinned,
 * and what pins it is the half of each case that reads what IS
 * there.
 *
 * THE ADDRESS LEGS REDDEN ONE EACH, and each reaches both routes
 * that share its segment because the narrowing lives in one helper:
 * taking the `:id` raw reddens the not-an-id case alone, and taking
 * the `:slug` raw reddens the not-a-slug case alone. The second was
 * a measured ZERO until that case landed — every other slug case
 * here sends a well-formed slug, so an unnarrowed segment answered
 * exactly the `404` they already assert, and neither this file nor
 * `service.test.ts` would have reported it.
 *
 * THE TWO WINDOW LEGS REDDEN AN IDENTICAL SET OF ONE and are still
 * two readings. A fixed `{ limit: 50, offset: 0 }` and a dropped
 * `meta` both fail the over-cap case, the first at the row count of
 * its at-cap control and the second at that control's
 * `meta.perPage`. Only the assertion failing inside the case tells
 * them apart.
 *
 * ONE MEASURED ZERO, recorded rather than repaired here. Taking
 * `total` from the rows in hand reddens NOTHING, because no refusal
 * case can afford a window narrower than its collection — the page
 * in hand IS the collection in every case above. That claim belongs
 * to the positive half, which reads two windows of one over the
 * same roster.
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

import { buildTopicsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('topics-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It researches {@link STORED_NAME} too, which is the widening
 * control the duplicate case rests on:
 * `topics_domain_id_name_unique` is per-domain, so a store or a
 * service holding it globally cannot even build this fixture.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * An id no planted topic carries.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The name both planted domains research, and every duplicate takes. */
const STORED_NAME = 'transformers';

/** The second topic of {@link STORED_SLUG}, which every patch moves. */
const PATCHED_NAME = 'edge inference';

/** A name no planted domain researches, and every control writes. */
const FREE_NAME = 'retrieval augmentation';

/**
 * An hour, as the cadence every planted topic and every accepted
 * body below runs at.
 *
 * Named rather than repeated, so no reader has to wonder which of
 * the cases is varying the number.
 */
const HOURLY = 3600;

/**
 * The two names {@link STORED_SLUG} is planted with, in the order
 * `TopicStore.listTopics` promises to answer them.
 *
 * Planted the other way round by {@link withTopics} — the
 * transformers row first — so a list read here is answered in the
 * store's own order rather than in the order the rows arrived. This
 * file asserts only the LENGTH of a page; that the order is the
 * store's is the positive half's claim.
 */
const LISTED_NAMES = [PATCHED_NAME, STORED_NAME];

/**
 * The instant the two refused bodies submit for `nextRunAt`.
 *
 * A well-formed ISO-8601 string, so what refuses it is `.strict()`
 * rather than a shape check that would never have reached the
 * unrecognized-key clause. It is also the one value any request in
 * this file submits that a refusal could plausibly quote back,
 * which is why that case counts it rather than reading the envelope
 * alone.
 */
const SENTINEL_INSTANT = '2031-02-03T04:05:06.000Z';

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/topics/service.ts`'s constant; what is pinned
 * here is that it arrives unmodified with `code` beside it and
 * nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a topic answers with. */
const NO_SUCH_TOPIC_BODY = {
  code: 'NOT_FOUND',
  message: 'No topic carries that id',
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
 * The whole body a segment that is not a slug answers with.
 *
 * `invalid_format` and not `invalid_type`, because a path segment
 * is already a string: what `slugParamSchema` refuses is its
 * SHAPE. Asserted from one constant on both routes that take a
 * `:slug`, which are not the two that take an `:id`.
 */
const NOT_A_SLUG_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'slug',
    message: 'Not in the expected format.',
    code: 'invalid_format',
  }],
};

/**
 * The whole body a taken name answers with, from either write.
 *
 * Asserted on the create AND on the rename, from one constant, so a
 * module that stopped translating one of the two call sites is a
 * red case rather than a difference nobody looked for.
 */
const NAME_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This domain already researches a topic of that name',
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
 * The whole body a request naming `nextRunAt` answers with.
 *
 * ONE detail naming `body` rather than the key, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * request said. Nothing the request submitted is in this envelope
 * at all, and that is the claim its case makes by asserting the
 * whole of it.
 */
const NEXT_RUN_AT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * Just enough of an answered topic for an assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the one member the cases
 * project out of a page.
 */
interface NamedRow {
  /** The subject the domain researches, and what a case finds it by. */
  readonly name: string;
}

/**
 * Builds an app carrying one freshly built topics router.
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
function buildTopicsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildTopicsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains, three topics, and the app in front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each of its three rows earns its place twice. The two topics
 * under {@link STORED_SLUG} are what a duplicate takes and what
 * every patch addresses, and they are also a collection a window
 * can be narrower than. The row under {@link OTHER_SLUG} carries
 * the FIRST domain's name: it is the widening control the `409`
 * cases rest on, and the one a delete leaves standing.
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/topics`, so a case about a patch is not also
 * a case about the create route — and so the duplicate case is
 * refused by a row it did not have to create successfully first. No
 * route on this router can write a domain at all.
 *
 * @returns The app and the ids of the two rows planted under
 *   {@link STORED_SLUG}. The store is not handed back: every
 *   reading a case takes afterwards is a response, so a case
 *   reaching past the surface under test would be pinning the
 *   fixture rather than the router. The ids are addresses rather
 *   than readings — a request cannot name a row without one.
 */
async function withTopics(): Promise<{
  app: Application;
  transformersId: number;
  inferenceId: number;
}> {
  const store = createMemoryResearchStore();
  const stored = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const other = await store.insertDomain({
    slug: OTHER_SLUG,
    name: 'Example Urban Transit',
    settings: {},
  });
  const transformers = await store.insertTopic({
    domainId: stored.id,
    name: STORED_NAME,
    searchTerms: ['attention', 'transformer architecture'],
    intervalSeconds: HOURLY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const inference = await store.insertTopic({
    domainId: stored.id,
    name: PATCHED_NAME,
    searchTerms: ['on-device inference'],
    intervalSeconds: HOURLY,
    enabled: true,
    minIntervalSeconds: 600,
    maxIntervalSeconds: 86400,
  });

  await store.insertTopic({
    domainId: other.id,
    name: STORED_NAME,
    searchTerms: ['transformer routing'],
    intervalSeconds: HOURLY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  return {
    app: buildTopicsApp(store),
    transformersId: transformers.id,
    inferenceId: inference.id,
  };
}

/** The path a domain's topics are read and written at. */
function topicsPath(slug: string): string {
  return `/domains/${slug}/topics`;
}

/**
 * The names a read answered, in the order it answered them.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's name.
 */
function namesOf(body: { data: readonly NamedRow[] }): string[] {
  return body.data.map((row) => row.name);
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

// ---------------------------------------------------------------------------
// What the fixture below plants
// ---------------------------------------------------------------------------

describe('the fixture every refusal below is read through', () => {
  it('plants distinct names and writes under a free one', () => {
    // Without this, a create case naming a planted topic would be
    // refused 409 and read as a router fault rather than as a
    // fixture that overlapped itself.
    expect(new Set(LISTED_NAMES).size).toBe(LISTED_NAMES.length);
    expect(LISTED_NAMES).not.toContain(FREE_NAME);
    // And the submitted instant is not a substring of anything else
    // a refusal could carry, so the containment count below cannot
    // be satisfied by some other member of the envelope.
    expect(countOccurrences(
      JSON.stringify(NEXT_RUN_AT_BODY),
      SENTINEL_INSTANT,
    )).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no topic
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withTopics();

    const missing = await request(app).get(topicsPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own. It also says what the 404 is FOR
    // — a domain researching nothing is a 200 carrying `data: []`,
    // so only a domain that is not there answers this way.
    const found = await request(app).get(topicsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(LISTED_NAMES.length);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withTopics();
    const body = { name: FREE_NAME, intervalSeconds: HOURLY };

    const missing = await request(app)
      .post(topicsPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(topicsPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createTopic` parses the body BEFORE it
    // resolves the slug, so a malformed one would be answered 422
    // and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe(FREE_NAME);
  });
});

describe('an id naming no topic', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, inferenceId } = await withTopics();
    const patch = { intervalSeconds: 1800 };

    const missing = await request(app)
      .patch(`/topics/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/topics/${inferenceId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.intervalSeconds).toBe(patch.intervalSeconds);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, inferenceId } = await withTopics();

    const missing = await request(app).delete(`/topics/${ABSENT_ID}`);
    const removed = await request(app).delete(`/topics/${inferenceId}`);
    const afterwards = await request(app).get(topicsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
    // Nothing in schema v2 points at `topics`, so this delete has
    // no guard to refuse it. That the domain researches one topic
    // afterwards is what says the 204 was a delete rather than a
    // handler answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(1);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, inferenceId } = await withTopics();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(app)
      .patch('/topics/abc')
      .send({});
    const onDelete = await request(app).delete('/topics/abc');
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).delete(`/topics/${inferenceId}`);

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

  it('answers 422 naming the slug rather than 404', async () => {
    const { app } = await withTopics();

    // Upper case, which `slugParamSchema` refuses and which a
    // lookup would simply not find. The two routes that take a
    // `:slug` are not the two that take an `:id`, so this case and
    // the one above narrow disjoint halves of the router — and
    // this one is the only reading in the file that the narrowing
    // is load-bearing at all: an unnarrowed segment answers the
    // same 404 every other slug case asserts.
    const onList = await request(app).get(topicsPath('Example-Radar'));
    const onCreate = await request(app)
      .post(topicsPath('Example-Radar'))
      .send({ name: FREE_NAME, intervalSeconds: HOURLY });
    const aSlug = await request(app).get(topicsPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap this surface serves
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const overCap = await request(app).get(`${topics}?perPage=201`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get(`${topics}?perPage=200`);

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
    expect(namesOf(atCap.body)).toHaveLength(LISTED_NAMES.length);
  });
});

// ---------------------------------------------------------------------------
// The payload: a name the domain has, and a column it does not own
// ---------------------------------------------------------------------------

describe('a write proposing a name the domain researches', () => {
  it('answers 409 on a create, where a free name answers 201', async () => {
    const { app } = await withTopics();

    const duplicate = await request(app)
      .post(topicsPath(STORED_SLUG))
      .send({ name: STORED_NAME, intervalSeconds: HOURLY });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post(topicsPath(STORED_SLUG))
      .send({ name: FREE_NAME, intervalSeconds: HOURLY });
    // The widening control, which neither of the two above can
    // stand in for: the key is unique within the DOMAIN and not
    // across the table, so the SAME name under a second domain has
    // to be accepted. A router or a store holding it globally is
    // green against every other case in this file.
    const elsewhere = await request(app)
      .post(topicsPath(OTHER_SLUG))
      .send({ name: PATCHED_NAME, intervalSeconds: HOURLY });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(NAME_TAKEN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe(FREE_NAME);
    expect(elsewhere.status).toBe(201);
  });

  it('answers 409 on a rename, where a free name answers 200', async () => {
    const { app, inferenceId } = await withTopics();

    const duplicate = await request(app)
      .patch(`/topics/${inferenceId}`)
      .send({ name: STORED_NAME });
    // The control is a rename that lands, through the SAME
    // operation: without it this case is equally green against a
    // route that refuses every rename it is given.
    const renamed = await request(app)
      .patch(`/topics/${inferenceId}`)
      .send({ name: FREE_NAME });

    // The same body constant as the create, which is the claim:
    // two writes reach one unique key, because `patchTopicSchema`
    // carries `name`. A module that stopped translating either call
    // site is a red case rather than a difference nobody looked
    // for.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(NAME_TAKEN_BODY);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe(FREE_NAME);
  });
});

describe('a body naming the column the dispatcher owns', () => {
  it('answers 422 from both writes, quoting nothing sent', async () => {
    const { app, transformersId } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const created = await request(app)
      .post(topics)
      .send({
        name: FREE_NAME,
        intervalSeconds: HOURLY,
        nextRunAt: SENTINEL_INSTANT,
      });
    const patched = await request(app)
      .patch(`/topics/${transformersId}`)
      .send({ nextRunAt: SENTINEL_INSTANT });
    // The control, along the axis under test and through the SAME
    // operation: the identical create with the member removed. It
    // is accepted, and the column it named is ANSWERED as null —
    // so the pair says the refusal is about that member rather than
    // about a router refusing every create it is handed, and that
    // the column is projected rather than hidden.
    const accepted = await request(app)
      .post(topics)
      .send({ name: FREE_NAME, intervalSeconds: HOURLY });

    // The WHOLE envelope on both, because the detail is the answer
    // here rather than an accompaniment to the status: it names
    // `body` rather than the key, since the key itself is something
    // the request said.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NEXT_RUN_AT_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NEXT_RUN_AT_BODY);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.nextRunAt).toBeNull();

    // A COUNT rather than an absence, over the serialised body: the
    // instant is the one value any request in this file submits
    // that a refusal could plausibly quote back.
    const leaked = JSON.stringify({
      ...NEXT_RUN_AT_BODY,
      details: [{
        field: 'body',
        message: `Carries the unknown key ${SENTINEL_INSTANT}.`,
        code: 'unrecognized_keys',
      }],
    });

    expect(countOccurrences(JSON.stringify(created.body), SENTINEL_INSTANT))
      .toBe(0);
    expect(countOccurrences(JSON.stringify(patched.body), SENTINEL_INSTANT))
      .toBe(0);
    // The planted control: without it both zeros above are equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, SENTINEL_INSTANT)).toBe(1);
  });
});
