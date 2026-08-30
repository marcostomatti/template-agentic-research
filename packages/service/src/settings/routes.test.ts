/**
 * `src/settings/routes.ts` — what a refused request reaches
 * the wire with: the status, the envelope and the one detail each
 * refusal carries. Driven over supertest against a router built by
 * the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `./service.test.ts` is the translation,
 * and only the translation. That an undeclared key is refused,
 * that a well-formed slug naming no domain is refused for a
 * different reason than a slug the pattern refuses, that `{}` is a
 * complete payload — those are claims about the RULES and are
 * pinned one file over, over direct calls. What no call can report
 * is whether the rule reached a caller: the status `errorHandler`
 * chose, the envelope written around it, the members that envelope
 * carried, and whether a handler swallowed a throw on the way. So
 * every case below reads a response and none reads a return value.
 *
 * SIX CASES — four requests and two guards. The plan gives
 * this file the refusals; the empty read, an accepted write and a
 * read afterwards are its successor's, which is why every figure
 * in the grid below will move when they land.
 *
 * THE UNDECLARED KEY. A misspelt top-level member is `422` whose
 * ONE detail names `body` and never the key, asserted as the WHOLE
 * envelope. Naming the container is `src/http/validation.ts`'s
 * rule rather than this router's: zod puts the offending names in
 * `issue.keys` and leaves `issue.path` empty for a root-level
 * object, so a detail built from the path alone cannot carry them.
 * The case sends ONE string in TWO positions, which is what makes
 * it a reading about WHERE strictness applies: refused at the top
 * level, and accepted as a key of `notificationChannels`, whose
 * keys name the channels this deployment registered. A schema
 * holding strictness over the whole payload cannot answer the
 * second request at all.
 *
 * THE NON-OBJECT PAYLOAD. A JSON array is `422` naming `body`
 * again, with `invalid_type` where the key above gets
 * `unrecognized_keys` — the field is the same because a fault
 * against the root has no path below the root to name, and the
 * code is the whole of the difference on the wire. A request that
 * sent NO body at all is asserted against the same constant, since
 * Express 5 leaves `req.body` undefined and a caller that sent
 * nothing has failed to state a payload exactly as one that sent
 * the wrong kind of thing. An array and not a bare scalar, and
 * that is measured rather than chosen for taste: `express.json()`
 * runs in its default strict mode, so `7` or `"nope"` is refused
 * by body-parser before any router sees it and answers the
 * framework's own `500`.
 *
 * THE UNKNOWN DEFAULT. A `defaultDomainSlug` no domain carries is
 * `422` whose one detail names that member and carries
 * `code: 'unknown_domain'`, this service's own rather than any
 * zod code, since the rule it reports is about rows. A `422` and
 * not a `404` is the translation being pinned: the slug is a
 * member of the BODY here and never the address, so a request that
 * addressed the settings row and named a domain that is not there
 * sent a body this endpoint cannot accept.
 *
 * THE DISTINCTNESS. That same member has a second refusal —
 * `slugParamSchema` refusing the SHAPE — and the two answer
 * the same status at the same field. Only the `code` separates
 * them, so the pair is asserted in one case: one is a spelling to
 * fix and the other is a domain to create, and a router collapsing
 * either into the other is invisible to the two cases above.
 *
 * WHAT THIS FILE DOES NOT CLAIM. `GET /settings` is reached by no
 * case here at all, and the grid says so in the only honest way a
 * grid can: two of its ten legs mutate that handler and redden
 * NOTHING. That route has no refusal to have — no address to
 * get wrong, no body to check, no query it reads — so its
 * whole surface is the empty read and the round trip the positive
 * half writes, and those two zeros are a hand-off rather than a
 * hole. That this router sits behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and what a refusal may
 * CONTAIN across the surface is `tests/api/request-echo.test.ts`'s.
 *
 * CONTAINMENT IS READ HERE ANYWAY, TWICE, AND ITS CONTROL SAYS
 * WHAT IT PROVES. Each of the two refusals whose cause is a value
 * the caller sent — the undeclared key, and the unknown slug
 * — counts occurrences of that value in the response text and
 * takes the same count over the request's own bytes. The positive
 * is what makes the zero a reading rather than a search that finds
 * nothing anywhere. What it does NOT prove is the subject: the
 * planted-leak control and the legs that make the module actually
 * leak are `./service.test.ts`'s, since this router builds no
 * detail and no mutation of it can put either value back on the
 * wire. The grid below measures exactly that — a leg echoing
 * the submitted body into the accepted answer reddens three cases
 * and not one of the two containment rows.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every refusal assertion above, so each of the three refusal
 * cases carries its own control in the same body, varied along the
 * one axis under test: the misspelt key beside the declared one
 * and beside the same string as a channel, the array and the empty
 * request beside `{}`, and the absent slug beside the stored one.
 * The distinctness case is the exception and has none, which the
 * grid confirms rather than hides — it is the one request case
 * four of the ten legs leave green.
 *
 * MUTATION GRID, measured over these six cases by mutating
 * `routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count, with the base run's
 * total asserted non-zero first. Ten legs, and they collapse into
 * four readings rather than ten.
 *
 * THREE LEGS REDDEN AN IDENTICAL FOUR AND ARE ONE READING.
 * Handing `{}` to the service instead of `req.body`, answering the
 * read's payload from the write, and registering the write as a
 * `PATCH` each redden every non-guard case — the widest
 * reading in the file, and the control saying all four requests
 * reach the router at all rather than passing over a fixture
 * nothing touched. The two survivors are exactly the two table
 * guards, which call nothing.
 *
 * FOUR LEGS REDDEN AN IDENTICAL THREE, AND NONE OF THE THREE IS
 * NAMED FOR THE ANSWER THE LEG CHANGED. Dropping the envelope from
 * the write, answering `201` rather than `200`, spreading one
 * member onto the answered payload, and echoing the submitted body
 * into it all land on the three cases carrying an ACCEPTED
 * control, through a `toStrictEqual` over `data` or a `keysOf`
 * over the envelope. That is the refusal-only shape the sibling
 * groups record: while a file has no positive case, its controls
 * are the load-bearing assertions. The four are still four legs
 * and only the assertion failing inside each case tells them
 * apart — one moves the envelope, one the status, two the
 * members of `data`.
 *
 * ONE LEG REDDENS TWO, NESTED INSIDE THAT THREE. A member spread
 * onto the ENVELOPE rather than onto the payload reaches only the
 * two cases that call `keysOf` on a whole body, and the case it
 * differs by is the unknown-default one, whose control compares
 * `data` alone. So the two legs split this file by WHICH member
 * each accepted control reads rather than by which case is about
 * what, and reporting them as two counts over overlapping sets
 * would read as two independent readings.
 *
 * TWO LEGS REDDEN NOTHING, AND BOTH ARE THE READ. Dropping the
 * envelope from `GET /settings` and moving that route to another
 * path are each a measured zero, for the reason above rather than
 * for a re-aimable one: no case here issues a `GET`. Named so the
 * successor has a sentence to discharge rather than a zero to
 * inherit silently.
 */
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { OperatorSettings } from '../db/schema/settings.js';
import type { SuccessEnvelope } from '../http/envelope.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildSettingsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('settings-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the one domain every case plants. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A slug shaped like one and carried by no row in any case here.
 *
 * Shaped like one on purpose: a string `slugParamSchema` refuses is
 * answered by the schema and never reaches the lookup, so a
 * sentinel of the wrong shape would pin the parser where these
 * cases are about the domain not being there.
 */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * A slug the pattern itself refuses.
 *
 * Upper case and spaced, which no `domains.slug` can be — so
 * this is the value the distinctness case sends to reach the OTHER
 * refusal at the same member.
 */
const MALFORMED_SLUG = 'Not A Slug';

/**
 * A member of `EXPORT_FORMATS`, and the one every accepted control
 * writes.
 */
const A_FORMAT = 'rss';

/**
 * {@link A_FORMAT} misspelt, as a KEY.
 *
 * The undeclared-key case sends it at the top level, where the
 * payload is `.strict()` and it is refused, and again as a key of
 * `notificationChannels`, where the record is open and it is
 * accepted. One string in two positions is what makes that pair a
 * reading about WHERE strictness applies rather than two unrelated
 * requests.
 */
const UNDECLARED_KEY = 'digestFormatt';

/**
 * The whole body a payload carrying an undeclared key answers with.
 *
 * ONE detail, naming the CONTAINER and never the key. That is
 * `src/http/validation.ts`'s rule rather than this router's: zod
 * puts the offending names in `issue.keys` and leaves `issue.path`
 * empty for a root-level object, so a detail built from the path
 * alone can only name the body. `body` is the spelling that module
 * gives the root, and it is the same on every route of the surface.
 */
const UNDECLARED_KEY_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a payload that is not an object answers with.
 *
 * `invalid_type` and the same `body` field the undeclared key gets:
 * a shape fault against the root object has no path below the root
 * to name. The two are told apart by the code, which is the whole
 * of the difference on the wire and the reason both constants are
 * asserted rather than one.
 */
const NOT_AN_OBJECT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The whole body a default naming no domain answers with.
 *
 * `unknown_domain` is `src/settings/service.ts`'s own code and no
 * schema can raise it: the rule it reports is about rows, and a
 * body alone cannot answer it. The message is that module's
 * constant, and the slug is in neither — the containment rule
 * is about closing the channel rather than about how harmless one
 * value looks.
 */
const UNKNOWN_DOMAIN_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'defaultDomainSlug',
    message: 'No domain carries the slug named as the default',
    code: 'unknown_domain',
  }],
};

/**
 * The whole body a default the PATTERN refuses answers with.
 *
 * The same status at the same member as {@link UNKNOWN_DOMAIN_BODY}
 * and a different code, which is the pair the distinctness case
 * exists for: one is a spelling to fix and the other is a domain to
 * create.
 */
const MALFORMED_SLUG_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'defaultDomainSlug',
    message: 'Not in the expected format.',
    code: 'invalid_format',
  }],
};

/** Every refusal body this file asserts, for the guard below. */
const REFUSAL_BODIES = {
  undeclaredKey: UNDECLARED_KEY_BODY,
  notAnObject: NOT_AN_OBJECT_BODY,
  unknownDomain: UNKNOWN_DOMAIN_BODY,
  malformedSlug: MALFORMED_SLUG_BODY,
};

/**
 * The members `OperatorSettings` declares, as a response carries
 * them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH
 * directions, since a one-directional list is exactly as green as
 * no list at all against the drift that matters. `satisfies` closes
 * the direction where this names a member the payload lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the payload grows a
 * member nothing here learned about.
 *
 * `Required<>` is what makes the second direction reachable: every
 * member of this payload is optional, so `keyof OperatorSettings`
 * would be satisfied by a list naming none of them.
 */
const SETTINGS_KEYS = [
  'defaultDomainSlug',
  'digestFormat',
  'notificationChannels',
] as const satisfies readonly (keyof Required<OperatorSettings>)[];

/** The members every body this router answers carries. */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<Required<OperatorSettings>, typeof SETTINGS_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `OperatorSettings` or to the success envelope
 * and to neither list above turns {@link EveryKeyListed} into
 * `never`, and this initializer is then a TS2322 at this line
 * — before any case can compare a response against a set that
 * has quietly stopped describing it. Read in a case below so it is
 * a symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link SETTINGS_KEYS}, sorted at use rather than by hand. */
const SETTINGS_KEY_SET: readonly string[] = [...SETTINGS_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/**
 * Builds an app carrying one freshly built settings router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it
 * every case here would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * `express.json()` IS installed, and it is not decoration. It is
 * what makes `req.body` a parsed value, and its default strict mode
 * is why a body that is a bare JSON scalar never reaches this
 * router at all — the case below that sends a JSON array
 * carries the measurement.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildSettingsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSettingsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One domain, no settings row, and the app in front of them.
 *
 * The smallest fixture every case here can be reached from. The
 * domain is what makes the accepted control of the default-domain
 * case a reading rather than an assumption: without a row to
 * resolve, a slug that names a domain and a slug that does not
 * would answer alike.
 *
 * Planted through the PORT rather than through `POST /domains`,
 * since no route on this router can write a domain — and since
 * a case about a settings write should not also be a case about the
 * domains router.
 *
 * The store is not handed back: every reading a case takes is a
 * response, so a case reaching past the surface under test would be
 * pinning the fixture rather than the router. This router addresses
 * nothing by id, so unlike its siblings it needs no address out of
 * the fixture either.
 *
 * @returns The app.
 */
async function withRadar(): Promise<Application> {
  const store = createMemoryResearchStore();

  await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });

  return buildSettingsApp(store);
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute for an accepted answer: a member
 * arriving that nobody asserted is caught by a key set and by no
 * field read. The refusals below are compared whole instead, since
 * every byte of a refusal body is this repository's own.
 *
 * @param value - The body, or a member of it.
 * @returns Its own enumerable keys, sorted.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
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
// The body's shape: a key nothing declares, and a payload that is not one
// ---------------------------------------------------------------------------

describe('a payload carrying a key the schema does not declare', () => {
  it('answers 422 naming the body for an undeclared key', async () => {
    const app = await withRadar();
    // Hoisted, so the containment reading below counts the needle
    // in the exact bytes that were sent rather than in a second
    // literal that agrees with them today.
    const sent = { [UNDECLARED_KEY]: A_FORMAT };

    const undeclared = await request(app)
      .put('/settings')
      .send(sent);
    // The control, along the axis under test and through the SAME
    // operation: a router refusing every body satisfies the
    // assertion above on its own. It also says what the refusal is
    // FOR, since the value is the one the declared member takes.
    const declared = await request(app)
      .put('/settings')
      .send({ digestFormat: A_FORMAT });
    // The widening control, which neither of the two above can
    // stand in for: `.strict()` is a property of each OBJECT, and
    // `notificationChannels` is an open record whose keys name the
    // channels this deployment registered. The SAME string that is
    // refused at the top level is accepted one segment down, so a
    // schema holding strictness over the whole payload cannot even
    // answer this request.
    const asChannel = await request(app)
      .put('/settings')
      .send({ notificationChannels: { [UNDECLARED_KEY]: true } });

    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_KEY_BODY);
    expect(declared.status).toBe(200);
    expect(declared.body.data).toStrictEqual({ digestFormat: A_FORMAT });
    expect(asChannel.status).toBe(200);
    expect(keysOf(asChannel.body)).toStrictEqual(RESOURCE_KEY_SET);

    // The key the caller sent is not in the answer. A count and not
    // an absence assertion, read against a known positive taken by
    // the same function in the same case: the request's own body
    // carries the string once, so a search that would find nothing
    // anywhere is a red case rather than a clean refusal.
    //
    // What this proves is the SEARCH plus this one channel. The
    // planted-leak control and the mutation legs that make the
    // module actually leak are `./service.test.ts`'s, where the
    // detail is built.
    const asSent = JSON.stringify(sent);

    expect(countOccurrences(undeclared.text, UNDECLARED_KEY)).toBe(0);
    expect(countOccurrences(asSent, UNDECLARED_KEY)).toBe(1);
  });

  it('answers 422 naming the body for a non-object payload', async () => {
    const app = await withRadar();

    // A JSON ARRAY rather than a bare scalar, and the choice is a
    // measurement rather than a preference: `express.json()` runs
    // in its default strict mode, so a body of `7` or `"nope"` is
    // refused by body-parser before any router sees it and answers
    // the framework's own 500 (measured). An array IS accepted
    // there and refused HERE, which is what makes it this route's
    // refusal to assert.
    const anArray = await request(app)
      .put('/settings')
      .send([1, 2]);
    // A request that sent no body at all. Express 5 leaves
    // `req.body` undefined rather than defaulting it to `{}`, so
    // this reaches the same schema as the array and has to reach
    // the same answer: a caller that sent nothing and a caller that
    // sent the wrong kind of thing both failed to state a payload.
    const noBody = await request(app).put('/settings');
    // The control: `{}` is a COMPLETE payload rather than an empty
    // request, since every member is optional and an absent member
    // means the deployment's default applies. A router refusing
    // every body, or a schema requiring any member, passes both
    // assertions above and fails this one.
    const empty = await request(app)
      .put('/settings')
      .send({});

    expect(anArray.status).toBe(422);
    expect(anArray.body).toStrictEqual(NOT_AN_OBJECT_BODY);
    expect(noBody.status).toBe(422);
    expect(noBody.body).toStrictEqual(NOT_AN_OBJECT_BODY);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toStrictEqual({});
    expect(keysOf(empty.body)).toStrictEqual(RESOURCE_KEY_SET);
  });
});

// ---------------------------------------------------------------------------
// The default domain: a slug no row carries, and one no slug could be
// ---------------------------------------------------------------------------

describe('a defaultDomainSlug that names no domain', () => {
  it('answers 422 naming the member for an unknown default', async () => {
    const app = await withRadar();
    // Hoisted for the same reason the undeclared-key case hoists
    // its own: the containment reading counts the needle in the
    // bytes that were actually sent.
    const sent = { defaultDomainSlug: ABSENT_SLUG };

    const unknown = await request(app)
      .put('/settings')
      .send(sent);
    // The control, through the SAME operation and along the one
    // axis under test: the stored slug, which differs from the one
    // above in nothing but being carried by a row. Without it this
    // case is equally green against a service that refuses every
    // default it is handed.
    const stored = await request(app)
      .put('/settings')
      .send({ defaultDomainSlug: STORED_SLUG });

    // A 422 and not a 404, which is the translation being pinned
    // rather than merely that something was thrown. The slug is a
    // member of the BODY here and never the address: this request
    // addressed the settings row, which exists, and named a domain
    // that does not.
    expect(unknown.status).toBe(422);
    expect(unknown.body).toStrictEqual(UNKNOWN_DOMAIN_BODY);
    expect(stored.status).toBe(200);
    expect(stored.body.data).toStrictEqual({
      defaultDomainSlug: STORED_SLUG,
    });

    // The slug the caller sent is not in the answer, counted
    // against the known positive of the request's own body. The
    // channel this closes is the one most tempting to leave open:
    // the value is the whole subject of the refusal, and quoting it
    // back would read as helpful.
    const asSent = JSON.stringify(sent);

    expect(countOccurrences(unknown.text, ABSENT_SLUG)).toBe(0);
    expect(countOccurrences(asSent, ABSENT_SLUG)).toBe(1);
  });

  it('tells an unknown default from a malformed one', async () => {
    const app = await withRadar();

    const unknown = await request(app)
      .put('/settings')
      .send({ defaultDomainSlug: ABSENT_SLUG });
    // Refused by `slugParamSchema` rather than by the lookup, so
    // this request never reaches a store at all. The two answers
    // share a status and a field and differ in the code alone,
    // which is what a caller reads to know whether to fix a
    // spelling or create a domain.
    const malformed = await request(app)
      .put('/settings')
      .send({ defaultDomainSlug: MALFORMED_SLUG });

    expect(unknown.status).toBe(malformed.status);
    expect(unknown.body).toStrictEqual(UNKNOWN_DOMAIN_BODY);
    expect(malformed.body).toStrictEqual(MALFORMED_SLUG_BODY);
    // Asserted as a set of two rather than against either spelling,
    // so a vocabulary free to be reworded stays free while the
    // difference does not. The row above is what pins what each
    // code SAYS; this one pins only that they are not the same
    // answer, which no assertion over one response can.
    expect(new Set([
      UNKNOWN_DOMAIN_BODY.details[0]?.code,
      MALFORMED_SLUG_BODY.details[0]?.code,
    ]).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit to this file has to keep true
// ---------------------------------------------------------------------------

describe('the tables this file asserts against', () => {
  it('lists every key of every type a set is asserted from', () => {
    // Reading the pin is what keeps it a symbol this file USES.
    // Its value is never in doubt — the claim is that
    // `check-types` could not have produced any other one, since a
    // member added to `OperatorSettings` or to the success envelope
    // and to neither list turns the type into `never` and reddens
    // the initializer rather than this line.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The runtime halves, so a list edited to name something the
    // type does not have is caught here as well as at the pin.
    expect(SETTINGS_KEY_SET).toStrictEqual([
      'defaultDomainSlug',
      'digestFormat',
      'notificationChannels',
    ]);
    expect(RESOURCE_KEY_SET).toStrictEqual(['data', 'success']);
  });

  it('keeps the four refusal bodies distinct from each other', () => {
    const bodies = Object.values(REFUSAL_BODIES);
    const spellings = bodies.map((body) => JSON.stringify(body));

    // Two of the four name `body` and two name `defaultDomainSlug`,
    // so a constant that drifted into a copy of its neighbour would
    // still be asserted by its own case and would silently stop
    // describing a second answer. Only a comparison ACROSS them
    // reports it.
    expect(new Set(spellings).size).toBe(bodies.length);
    // Anti-vacuity: a table emptied by an edit satisfies the set
    // comparison above for nobody's reason.
    expect(bodies).toHaveLength(4);
    // Every one of them is a refusal in the framework's envelope
    // rather than the success one, which is the shape this file
    // asserts four times and never states.
    for (const body of bodies) {
      expect(keysOf(body)).toStrictEqual(['code', 'details', 'message']);
    }
  });
});
