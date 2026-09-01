/**
 * `src/subscriptions/routes.ts` — what each of the five routes
 * answers when it refuses: the status, the envelope and the details
 * each reaches the wire with. Driven over supertest against a
 * router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a taken triple is a
 * `ConflictError` from both writes that can propose one, that a
 * `connectorId` naming no row is a `ValidationError` and not a
 * `NotFoundError`, that a disabled row refuses the verb — those are
 * claims about the RULES and are pinned one file over, over direct
 * calls. What no call can report is whether the rule reached a
 * caller: the status `errorHandler` or the handler chose, the
 * envelope written around it, the members that envelope carried,
 * and whether a handler swallowed a throw on the way. So every case
 * below reads a response and none of them reads a return value.
 *
 * TWELVE CASES OVER EIGHT WAYS A REQUEST TO THIS ROUTER CAN BE
 * WRONG, plus the two fixture guards the tuple and triple cases
 * rest on. The eight are an unknown slug, an unknown id, a segment
 * that is not an id, a segment that is not a slug, a `format`
 * outside the tuple, a `connectorId` naming no row, a triple the
 * domain already holds, and a disabled row met by the verb. The
 * answers these routes give when they LAND are a separate half and
 * land in their own commit; what stands in for them here is the
 * control each case carries in its own body.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no subscription is `404` on all
 * three that take one, each asserted against ONE shared body
 * constant per ADDRESS rather than five literals that agree today.
 * The constants are per address and not per status: a `404` about a
 * domain and a `404` about a subscription are two envelopes on one
 * router, and five handlers are five chances to answer a missing
 * row five different ways. A segment that is not an ADDRESS at all
 * is `422` naming `id` or `slug` and never `404` — a `404` says the
 * row is not there, and a request that never named a row has not
 * established that. Both of those are asserted across every route
 * that shares each segment inside one case, because three handlers
 * are three chances to narrow only two of them. The slug half is
 * the only reading here that `readSlug` narrows at all: every other
 * slug case sends a well-formed slug, so an unnarrowed segment
 * answers exactly the `404` they already assert — measured, as the
 * grid below records, and the same zero `src/topics/routes.test.ts`
 * found on its own slug leg.
 *
 * THE PAYLOAD. A `format` outside `EXPORT_FORMATS` is `422` whose
 * one detail names `format` with code `invalid_value`, from the
 * create AND from the rename of a format, because
 * `patchSubscriptionSchema` carries the member. Its control is the
 * only one in the file taken off a RUNTIME tuple rather than a
 * literal: the guard below asserts that the refused spelling is
 * absent from `EXPORT_FORMATS` and that the accepted one is in it,
 * so a member added to that tuple reddens the guard rather than
 * leaving a case asserting a refusal that has quietly become legal.
 *
 * A `connectorId` NAMING NO CONNECTOR is `422` and not `404`, from
 * both writes that can name one, which is the difference between an
 * address and a payload: a `:slug` is where the request was SENT
 * and a `connectorId` is something it SUBMITTED. The detail names
 * `connectorId` and carries `code: 'unknown_connector'`, the
 * service's own code rather than one of zod's, and the whole
 * envelope is asserted — the id the request sent is the one value
 * this refusal could quote back and does not.
 *
 * A TRIPLE THE DOMAIN ALREADY SUBSCRIBES TO is `409` with
 * `code: 'CONFLICT'` from the create AND from the re-format, which
 * is the translation being pinned rather than merely that something
 * was thrown: `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers `500`. Both writes are driven because
 * `patchSubscriptionSchema` carries two thirds of the key, so each
 * is a separate call site a module could stop translating on its
 * own. The create carries the control the other two cannot stand in
 * for: the SAME pair under a SECOND domain is accepted, which is
 * what says the key is a triple rather than a pair.
 *
 * THE STATE. A run now against a disabled subscription is `409`,
 * asserted as the WHOLE envelope — `code`, `message` and no
 * `details` at all, since this verb reads no body and has no member
 * to name. Its control is the identical call against a row
 * differing in `enabled` alone, which answers `200`. That pair is
 * what makes the refusal a guard on a COLUMN rather than a route
 * refusing every run now it is handed.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every assertion below, so each case carries its own control in
 * the same body, varied along the axis under test: each `404` reads
 * what IS there through the SAME operation, the not-an-id case ends
 * on an id that is one, the two `409`s create and re-format under a
 * free triple, the bad `format` and the bad `connectorId` are each
 * resent with that one member corrected, and the disabled row is
 * read against an enabled one.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s. The pagination window is
 * `src/http/schemas.ts`'s and is pinned against a route by the
 * sibling groups that extend or replace it; this list route reads
 * that schema unchanged and adds no parameter of its own, so there
 * is nothing here a window case would pin that those do not. What
 * these five routes answer when they LAND — the page, its `meta`,
 * the created row, the patched row, the instant the verb writes —
 * is the positive half's, and no case below reads any of them
 * except as a control.
 *
 * MUTATION GRID, measured over all fourteen cases by mutating
 * `routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count, with each leg's
 * collected count asserted at fourteen so an edit that broke
 * collection cannot score a zero. Ten legs, each named by the EDIT
 * it makes, and every figure belongs to this case list rather than
 * to the task that wrote it — the positive half moves most of them.
 *
 * THE ADDRESS LEGS ARE THE TWO BIGGEST AND THE TWO SMALLEST.
 * Returning the `:id` segment raw reddens SEVEN, which is every
 * case that gets an answer OUT OF THE STORE by id rather than every
 * case that names one: the two `format` writes are absent because
 * the create names no id at all and the patch's body is parsed
 * before its id is used, and the connector case is in the set only
 * through the accepted control beside it. Returning the `:slug`
 * segment raw reddens exactly ONE — the not-a-slug case — because
 * every other slug this file sends is well-formed and an unnarrowed
 * segment answers the same `404` they already assert. That one is
 * the whole reason the not-a-slug case exists.
 *
 * THE FOUR STATUS LEGS LAND ON CONTROLS RATHER THAN ON SUBJECTS,
 * which is what a refusals-only file looks like from the inside.
 * Answering the `POST` with `200` reddens THREE — the create halves
 * of the slug `404`, of the `409` and of the bad-`format` case —
 * and not one of the three is named for a create. Answering `204`
 * as `200` reddens TWO, answering the `PATCH` with `204` reddens
 * THREE, and answering the verb `202` reddens TWO, all of them
 * through the same kind of control. So every status this router
 * chooses is already pinned, and what pins it is the half of each
 * case that reads what IS there.
 *
 * THE INJECTED CLOCK IS LIVE, and that is worth saying because the
 * equivalent leg on the topics pause is absorbed by a later-of
 * pivot and reads zero. Reading `new Date()` in place of
 * `options.clock` reddens TWO — both cases that read the answered
 * `nextRunAt` back — because the router is handed a FIXED instant
 * and the two controls compare against it exactly.
 *
 * THREE MEASURED ZEROS, recorded rather than repaired here, and all
 * three about the window. Dropping `meta` from the list envelope,
 * fixing `toStoreWindow` to `{ limit: 50, offset: 0 }` and taking
 * `total` from the rows in hand each redden NOTHING: no refusal
 * case can afford a window narrower than its collection, and none
 * of them reads `meta` at all. Those claims belong to the positive
 * half, which the sibling groups measure as closing all three with
 * one list case that pages.
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
import { EXPORT_FORMATS } from '../db/schema/values.js';

import { buildSubscriptionsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('subscriptions-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It subscribes to {@link STORED_FORMAT} at the same connector the
 * first domain does, which is the widening control the duplicate
 * case rests on: the key is over the whole triple, so a store or a
 * service holding only the pair cannot even build this fixture.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * A slug the schema itself refuses, rather than one no row carries.
 *
 * Upper case, which `slugParamSchema` refuses and which a lookup
 * would simply not find. That is the whole point of the case it
 * serves: without a segment the pattern rejects, an unnarrowed
 * `:slug` answers exactly the `404` every other slug case asserts.
 */
const MALFORMED_SLUG = 'Example-Radar';

/**
 * An id no planted subscription carries.
 *
 * Far past the four the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/**
 * An id no planted connector carries.
 *
 * Distinct from {@link ABSENT_ID} rather than shared with it: the
 * two stand for missing rows in two different tables and the
 * refusals they produce differ in status, so one number standing
 * for both would let a case pass while naming the wrong table.
 */
const ABSENT_CONNECTOR_ID = 424242;

/** The format {@link STORED_SLUG} and {@link OTHER_SLUG} share. */
const STORED_FORMAT = 'obsidian_md';

/** A second format {@link STORED_SLUG} takes to the same connector. */
const SECOND_FORMAT = 'rss';

/** The format the disabled row the verb refuses delivers in. */
const STAGED_FORMAT = 'notion_md';

/**
 * A member of {@link EXPORT_FORMATS} no planted row delivers in.
 *
 * Every control that has to LAND a write uses it, so no control in
 * this file can be refused by the natural key it is not about.
 */
const FREE_FORMAT = 'pdf';

/**
 * A format the tuple does not carry, shaped like one that could.
 *
 * Lower case with no separator, so what refuses it is the
 * membership rule rather than any narrowing of the string: a
 * sentinel shaped unlike a format would be testing a rule this
 * schema does not have.
 */
const UNKNOWN_FORMAT = 'csv';

/**
 * A day, as the cadence every planted subscription and every
 * accepted body below delivers at.
 *
 * Named rather than repeated, so no reader has to wonder which of
 * the cases is varying the number.
 */
const DAILY = 86400;

/**
 * The instant the router's clock answers in every case here.
 *
 * A literal rather than the present, because the run-now control
 * writes what its clock answered and reads it back off the
 * response. A router reading the real present answers a plausible
 * instant no assertion could pin at all.
 */
const FIXED_INSTANT = '2026-08-31T09:00:00.000Z';

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/subscriptions/service.ts`'s constant; what is
 * pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/**
 * The whole body a `404` about a subscription answers with.
 *
 * Names the resource in full rather than as a subscription, which
 * is the service's own wording for the reason it gives: a caller
 * reading this sentence has just addressed `/exports/:id`, and the
 * table is `export_subscriptions`.
 */
const NO_SUCH_SUBSCRIPTION_BODY = {
  code: 'NOT_FOUND',
  message: 'No export subscription carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on all three routes
 * that take an `:id`.
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
 * is already a string: what `slugParamSchema` refuses is its SHAPE.
 * Asserted from one constant on both routes that take a `:slug`,
 * which are not the three that take an `:id`.
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
 * The whole body a `format` outside the tuple answers with.
 *
 * `invalid_value`, which is what a zod enum raises, and its message
 * names the fact rather than the five members or the one submitted
 * — `src/http/validation.ts` draws every detail message from a
 * fixed vocabulary and copies nothing out of the request.
 */
const NOT_A_FORMAT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'format',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a `connectorId` naming no row answers with.
 *
 * `422` rather than `404`, and a `code` the service declares rather
 * than one of zod's: the shape was legal and the value was a
 * positive integer, and what failed is a question only the store
 * could answer. The id the request sent is nowhere in it, which is
 * the claim its case makes by asserting the whole envelope.
 */
const NO_SUCH_CONNECTOR_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'connectorId',
    message: 'No connector carries that id',
    code: 'unknown_connector',
  }],
};

/**
 * The whole body a taken triple answers with, from either write.
 *
 * Asserted on the create AND on the re-format, from one constant,
 * so a module that stopped translating one of the two call sites is
 * a red case rather than a difference nobody looked for. The
 * sentence names all three parts of the key, because two thirds of
 * it are patchable and either is what a caller may have moved.
 */
const ALREADY_SUBSCRIBED_BODY = {
  code: 'CONFLICT',
  message: 'This domain already exports that format to that connector',
};

/**
 * The whole body a run now against a disabled row answers with.
 *
 * No `details` at all, which is the half worth asserting: this verb
 * reads no body, so there is no member for a detail to name and
 * inventing one would say the refusal was about something the
 * request sent.
 */
const NOT_ENABLED_BODY = {
  code: 'CONFLICT',
  message:
    'This subscription is disabled, so a run now would never be claimed',
};

/**
 * Just enough of an answered subscription for an assertion to read
 * it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the members the cases project
 * out of a page.
 */
interface AddressedRow {
  /** The row's own id, which every control addresses it by. */
  readonly id: number;

  /** The renderer it delivers through, and a third of its key. */
  readonly format: string;
}

/**
 * Builds an app carrying one freshly built subscriptions router.
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
 * The clock is FIXED and is a thunk answering a fresh `Date` per
 * call, so no handler can hand a case back the very object it would
 * compare against.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildSubscriptionsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSubscriptionsRouter({
    store,
    clock: () => new Date(FIXED_INSTANT),
  }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * What {@link withSubscriptions} hands a case.
 *
 * Ids and an app rather than the store: every reading a case takes
 * afterwards is a response, so a case reaching past the surface
 * under test would be pinning the fixture rather than the router.
 * The ids are addresses rather than readings — a request cannot
 * name a row without one.
 */
interface PlantedSubscriptions {
  /** The app, with the router in front of the planted store. */
  readonly app: Application;

  /**
   * The connector all four planted rows deliver to, and so the one
   * a duplicate collides at.
   */
  readonly vaultId: number;

  /**
   * A second connector nothing planted delivers to, so a control
   * naming it collides with nothing.
   */
  readonly inboxId: number;

  /**
   * {@link STORED_SLUG}'s subscription in {@link STORED_FORMAT},
   * which is the triple a create and a re-format both collide with
   * and the enabled row the verb's control runs.
   */
  readonly digestId: number;

  /**
   * A second subscription of {@link STORED_SLUG}, taking
   * {@link SECOND_FORMAT} to the same connector. The row every
   * re-format moves, and the fixture's own statement that one
   * domain may take two formats to one connector.
   */
  readonly feedId: number;

  /**
   * A subscription of {@link STORED_SLUG} switched OFF, and the
   * subject of the one case about a state rather than a request.
   * Planted SCHEDULED-less and enabled-false, differing from
   * {@link digestId} in `enabled` and in nothing a guard reads.
   */
  readonly stagedId: number;
}

/**
 * Two domains, two connectors, four subscriptions, and the app in
 * front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each row earns its place twice. The feed row takes a SECOND
 * format to the connector the digest already delivers to, and the
 * row under {@link OTHER_SLUG} takes the digest's own pair under
 * the other domain — so a store or a service holding any PAIR of
 * the triple cannot even build this fixture, and the explicit
 * widening control in the duplicate case is what turns that blunt
 * signal into a named one.
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/exports`, so a case about a patch is not
 * also a case about the create route — and so the duplicate case is
 * refused by a row it did not have to create successfully first. No
 * route on this router can write a domain or a connector at all.
 *
 * @returns The app, the two connector ids and the three ids under
 *   {@link STORED_SLUG} that a request addresses.
 */
async function withSubscriptions(): Promise<PlantedSubscriptions> {
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
  const vault = await store.insertConnector({
    kind: 'notebook',
    name: 'research vault',
    config: {},
  });
  const inbox = await store.insertConnector({
    kind: 'export_target',
    name: 'weekly inbox',
    config: {},
  });
  const digest = await store.insertSubscription({
    domainId: stored.id,
    format: STORED_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const feed = await store.insertSubscription({
    domainId: stored.id,
    format: SECOND_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const staged = await store.insertSubscription({
    domainId: stored.id,
    format: STAGED_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: false,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  await store.insertSubscription({
    domainId: other.id,
    format: STORED_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  return {
    app: buildSubscriptionsApp(store),
    vaultId: vault.id,
    inboxId: inbox.id,
    digestId: digest.id,
    feedId: feed.id,
    stagedId: staged.id,
  };
}

/** The path a domain's export subscriptions are read and written at. */
function exportsPath(slug: string): string {
  return `/domains/${slug}/exports`;
}

/** The path one subscription is written and cancelled at. */
function subscriptionPath(id: number): string {
  return `/exports/${id}`;
}

/** The path the schedule verb is posted to. */
function runNowPath(id: number): string {
  return `/exports/${id}/run-now`;
}

/**
 * The formats a read answered, in the order it answered them.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's format.
 */
function formatsOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.format);
}

/** How many subscriptions {@link STORED_SLUG} is planted with. */
const PLANTED_UNDER_STORED = 3;

// ---------------------------------------------------------------------------
// What the fixture below plants
// ---------------------------------------------------------------------------

describe('the fixture every refusal below is read through', () => {
  it('plants distinct triples and writes under a free one', () => {
    // Without this, a create case naming a planted triple would be
    // refused 409 and read as a router fault rather than as a
    // fixture that overlapped itself.
    const planted = [STORED_FORMAT, SECOND_FORMAT, STAGED_FORMAT];

    expect(new Set(planted).size).toBe(planted.length);
    expect(planted).not.toContain(FREE_FORMAT);
    expect(planted).toHaveLength(PLANTED_UNDER_STORED);
  });

  it('reads both format controls off the runtime tuple', () => {
    // Two-directional, and read off `EXPORT_FORMATS` rather than
    // off a literal list: a member ADDED to that tuple reddens
    // this instead of leaving the case below asserting a refusal
    // that has quietly become a legal request, and a member
    // REMOVED reddens it instead of leaving a control that can no
    // longer land.
    const formats: readonly string[] = EXPORT_FORMATS;

    expect(formats).not.toContain(UNKNOWN_FORMAT);
    expect(formats).toContain(FREE_FORMAT);
    expect(formats).toContain(STORED_FORMAT);
    expect(formats).toContain(STAGED_FORMAT);
  });
});

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no row
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withSubscriptions();

    const missing = await request(app).get(exportsPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies
    // the assertion above on its own. It also says what the 404 is
    // FOR — a domain exporting nothing is a 200 carrying
    // `data: []`, so only a domain that is not there answers this
    // way.
    const found = await request(app).get(exportsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(PLANTED_UNDER_STORED);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const planted = await withSubscriptions();
    const body = {
      format: FREE_FORMAT,
      connectorId: planted.vaultId,
      intervalSeconds: DAILY,
    };

    const missing = await request(planted.app)
      .post(exportsPath(ABSENT_SLUG))
      .send(body);
    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createSubscription` parses the body
    // BEFORE it resolves the slug, so a malformed one would be
    // answered 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.format).toBe(FREE_FORMAT);
  });
});

describe('an id naming no subscription', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const planted = await withSubscriptions();
    const patch = { intervalSeconds: 43200 };

    const missing = await request(planted.app)
      .patch(subscriptionPath(ABSENT_ID))
      .send(patch);
    const found = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.intervalSeconds).toBe(patch.intervalSeconds);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const planted = await withSubscriptions();

    const missing = await request(planted.app)
      .delete(subscriptionPath(ABSENT_ID));
    const removed = await request(planted.app)
      .delete(subscriptionPath(planted.feedId));
    const afterwards = await request(planted.app)
      .get(exportsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
    // Nothing in schema v2 points at `export_subscriptions`, so
    // this delete has no guard to refuse it. That the domain holds
    // one fewer afterwards is what says the 204 was a delete
    // rather than a handler answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(PLANTED_UNDER_STORED - 1);
  });

  it('answers 404 on a run now, and 200 for the stored id', async () => {
    const planted = await withSubscriptions();

    const missing = await request(planted.app).post(runNowPath(ABSENT_ID));
    // The control runs the ENABLED row, which is the one axis this
    // verb refuses on: without it a verb refusing every run now
    // satisfies the 404 above by answering the wrong reason.
    const ran = await request(planted.app).post(runNowPath(planted.digestId));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
    expect(ran.status).toBe(200);
    expect(ran.body.data.nextRunAt).toBe(FIXED_INSTANT);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const planted = await withSubscriptions();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(planted.app)
      .patch('/exports/abc')
      .send({});
    const onDelete = await request(planted.app).delete('/exports/abc');
    const onRunNow = await request(planted.app).post('/exports/abc/run-now');
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(planted.app)
      .delete(subscriptionPath(planted.feedId));

    // All three routes that take an `:id`, against ONE body
    // constant: three handlers are three chances to narrow only
    // two of them, and nothing else in this package would report
    // the one that was left raw.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onRunNow.status).toBe(422);
    expect(onRunNow.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });

  it('answers 422 naming the slug rather than 404', async () => {
    const planted = await withSubscriptions();

    // The two routes that take a `:slug` are not the three that
    // take an `:id`, so this case and the one above narrow
    // disjoint halves of the router — and this one is the only
    // reading in the file that the slug narrowing is load-bearing
    // at all: an unnarrowed segment answers the same 404 every
    // other slug case asserts.
    const onList = await request(planted.app)
      .get(exportsPath(MALFORMED_SLUG));
    const onCreate = await request(planted.app)
      .post(exportsPath(MALFORMED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    const aSlug = await request(planted.app).get(exportsPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The payload: a format, a connector and a triple this router bars
// ---------------------------------------------------------------------------

describe('a format outside the tuple', () => {
  it('answers 422 from both writes, naming the member', async () => {
    const planted = await withSubscriptions();

    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: UNKNOWN_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    // `patchSubscriptionSchema` carries `format`, so the tuple is
    // held on the update too and that is a second call site a
    // module could stop holding on its own.
    const patched = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ format: UNKNOWN_FORMAT });
    // The control, along the axis under test and through the SAME
    // operation: the identical body with a MEMBER of the tuple in
    // place of the sentinel. It lands, so the refusal is about
    // membership rather than about a router refusing every write
    // it is handed — and the guard above reads both spellings off
    // `EXPORT_FORMATS` rather than off this file.
    const accepted = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });

    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NOT_A_FORMAT_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NOT_A_FORMAT_BODY);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.format).toBe(FREE_FORMAT);
  });
});

describe('a connectorId naming no connector', () => {
  it('answers 422 from both writes, quoting no id', async () => {
    const planted = await withSubscriptions();

    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: ABSENT_CONNECTOR_ID,
        intervalSeconds: DAILY,
      });
    // `connectorId` is patchable, so the update reaches the same
    // lookup and answers the same detail for the same fact.
    const patched = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ connectorId: ABSENT_CONNECTOR_ID });
    // The control: the identical patch naming a connector the
    // deployment DOES carry, and one nothing planted delivers to,
    // so the accepted call cannot be refused by the triple it is
    // not about.
    const accepted = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ connectorId: planted.inboxId });

    // 422 and not 404, which is the whole claim: a `:slug` is
    // where the request was SENT and a `connectorId` is something
    // it SUBMITTED, so this refusal names the member at fault
    // rather than saying the address is gone. The WHOLE envelope,
    // because the id the request sent is the one value this
    // refusal could quote back — and it is not in the constant.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.connectorId).toBe(planted.inboxId);
  });
});

describe('a triple the domain already subscribes to', () => {
  it('answers 409 on a create, and 201 for a free triple', async () => {
    const planted = await withSubscriptions();

    const duplicate = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: STORED_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    // The widening control, which neither of the two above can
    // stand in for: the key is over the whole TRIPLE, so the same
    // format at the same connector under a SECOND domain has to be
    // accepted. A router or a store holding only the pair is green
    // against every other case in this file.
    const elsewhere = await request(planted.app)
      .post(exportsPath(OTHER_SLUG))
      .send({
        format: SECOND_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ALREADY_SUBSCRIBED_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.format).toBe(FREE_FORMAT);
    expect(elsewhere.status).toBe(201);
  });

  it('answers 409 on a re-format, and 200 for a free one', async () => {
    const planted = await withSubscriptions();

    const duplicate = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ format: STORED_FORMAT });
    // The control is a re-format that lands, through the SAME
    // operation: without it this case is equally green against a
    // route that refuses every patch it is given.
    const reformatted = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ format: FREE_FORMAT });

    // The same body constant as the create, which is the claim:
    // two writes reach one unique key, because
    // `patchSubscriptionSchema` carries two thirds of it. A module
    // that stopped translating either call site is a red case
    // rather than a difference nobody looked for.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ALREADY_SUBSCRIBED_BODY);
    expect(reformatted.status).toBe(200);
    expect(reformatted.body.data.format).toBe(FREE_FORMAT);
  });
});

// ---------------------------------------------------------------------------
// The state: a run now against a subscription nothing would claim
// ---------------------------------------------------------------------------

describe('a run now against a disabled subscription', () => {
  it('answers 409 whole, where an enabled row answers 200', async () => {
    const planted = await withSubscriptions();

    // `enabled` false excludes the row from the partial index the
    // dispatch claim walks, so writing the clock onto it would
    // produce a row looking due forever and never claimed — a
    // silent no-op the caller cannot see.
    const refused = await request(planted.app)
      .post(runNowPath(planted.stagedId));
    // The control, varied along the ONE axis under test: the same
    // verb against a row of the same domain at the same connector,
    // differing in `enabled` and in nothing a guard reads. It is
    // what makes the refusal a guard on a column rather than a
    // route refusing every run now it is handed.
    const ran = await request(planted.app)
      .post(runNowPath(planted.digestId));
    // And the disabled row is still there and still refused, so
    // the 409 was a refusal rather than a delete or an enable.
    const again = await request(planted.app)
      .post(runNowPath(planted.stagedId));
    const afterwards = await request(planted.app)
      .get(exportsPath(STORED_SLUG));

    // The WHOLE envelope, which for this verb means `details` is
    // ABSENT rather than empty: it reads no body, so there is no
    // member for a detail to name and inventing one would say the
    // refusal was about something the request sent.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual(NOT_ENABLED_BODY);
    expect(Object.keys(refused.body).sort())
      .toStrictEqual(['code', 'message']);
    expect(ran.status).toBe(200);
    expect(ran.body.data.nextRunAt).toBe(FIXED_INSTANT);
    expect(again.status).toBe(409);
    expect(formatsOf(afterwards.body)).toContain(STAGED_FORMAT);
  });
});
