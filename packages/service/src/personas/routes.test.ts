/**
 * `src/personas/routes.ts` — what each of the four routes refuses,
 * and what reaches the wire when it does: the status, the envelope
 * and the details. Driven over supertest against a router built by
 * the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a taken role is a `ConflictError`
 * from both writes that can propose one, that an unknown slug and
 * an unknown id are told apart, that a body missing `systemText` is
 * refused where a patch omitting it is not — those are claims
 * about the RULES and are pinned one file over, over direct calls.
 * What no call can report is whether the rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, and whether a handler swallowed a throw on the way. So
 * every case below reads a response and none of them reads a return
 * value.
 *
 * ELEVEN CASES IN THREE GROUPS, one group per part of the request
 * that can be wrong. Each is a REFUSAL case carrying its own
 * positive control; the answers this router lands are its
 * successor's subject, and every figure in the grid at the foot of
 * this header moves when those cases arrive.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no persona is `404` on both that
 * take one, each asserted against ONE shared body constant per
 * ADDRESS rather than four literals that agree today. The constants
 * are per address and not per status: a `404` about a domain and a
 * `404` about a persona are two envelopes on one router, and four
 * handlers are four chances to answer a missing row four different
 * ways. A segment that is not an address at all is `422` naming
 * `id` or `slug` and never `404` — a `404` says the row is not
 * there, and a request that never named a row has not established
 * that. Both of those are asserted across the TWO routes that share
 * the segment inside one case, because two handlers are two chances
 * to narrow only one of them.
 *
 * THE WINDOW. This list route IS paginated, unlike the taxonomy's,
 * so it owes the two refusals every paginated list on the surface
 * owes: a `?perPage` above the cap is `422` naming `perPage` rather
 * than a silent clamp, and an undeclared parameter is `422` naming
 * `query` rather than a typo stripped on the way in. The first is
 * paired with the cap itself, which is what says the refusal is a
 * CAP and not a route that refuses every window it is handed.
 *
 * THE PAYLOAD. A role the domain already carries is `409` with
 * `code: 'CONFLICT'` from the create AND from the rename, which is
 * the translation being pinned rather than merely that something
 * was thrown: `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers `500`. Both writes are driven because
 * this is the only wave-1 patch that can reach a unique key at all,
 * and each is a separate call site a module could stop translating
 * on its own. The create carries the control the other two cannot
 * stand in for: the same role under a SECOND domain is accepted,
 * which is what says the key is per-domain rather than global.
 *
 * A BODY MISSING `systemText` is `422` whose ONE detail names the
 * member, asserted as the WHOLE envelope. Its control is the same
 * member absent from a PATCH, which is legal and answers `200` —
 * so the pair says the refusal is about what a create must state
 * rather than about a router that refuses every body without a
 * `systemText` in it. A field name is the whole of what that detail
 * carries: no request below submits a value any refusal could quote
 * back.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN is `service.test.ts`'s at this layer and
 * `tests/api/request-echo.test.ts`'s across the surface — none
 * of the requests below submits a sentinel, because none of the
 * refusal paths this file reaches builds a detail out of anything a
 * request carried.
 *
 * MUTATION GRID, measured by mutating `routes.ts` and reading the
 * failed `fullName` SET from a `--reporter=json` run rather than a
 * count. Nine legs over eleven cases, and every figure is a
 * measurement over THIS case list: the successor that adds the
 * positive half moves all of them, so it re-derives the grid rather
 * than appending legs for its own rows.
 *
 * THE STATUS LEGS REDDEN ONLY THROUGH CONTROLS, which is the shape
 * of a refusal-only file rather than a gap in it. Answering the
 * `POST` with `200` reddens TWO — the `201` controls of the
 * create's `404` and of its `409` — and answering `204` as a
 * `200` reddens TWO, the `204` controls of the delete's `404` and
 * of the not-an-id case. Neither leg touches a case named for the
 * answer it changes, because no case here is: the controls are the
 * load-bearing assertions until the positive half lands.
 *
 * THE ENVELOPE LEGS ARE NESTED and neither is about the list.
 * Dropping the envelope from the list answer reddens THREE — the
 * list's own `404` case, the delete `404` (which counts the rows
 * afterwards) and the `perPage` cap (which reads `meta`) — while
 * dropping only `meta` reddens ONE, the cap, which is a subset. So
 * the pair splits the file by WHICH member each read-back reaches
 * rather than by which cases are about the list.
 *
 * THE ADDRESS LEGS HAVE TWO WIDTHS AND THEY MEASURE DIFFERENT
 * CLAIMS. Taking the `:id` segment RAW reddens FIVE, which is
 * exactly every case that addresses a persona by id — the
 * control saying those cases reach the router at all rather than
 * passing over a fixture nothing touched. Replacing `readId` with a
 * bare `Number(...)` on the PATCH alone reddens ONE, the not-an-id
 * case, and the `DELETE`'s half of that same case is invisible to
 * it: the two routes are asserted against one body constant, so
 * each narrowing is a separate leg reddening the same case. Only
 * the coerced leg says the SCHEMA is what is load-bearing.
 * Unnarrowing the `:slug` reddens ONE, and one leg covers both
 * routes that take one because {@link readSlug} is where the
 * narrowing lives.
 *
 * THE QUERY LEG lands on its own subject rather than on a control:
 * replacing the parse with a hardcoded window reddens BOTH window
 * cases, since neither an over-cap `perPage` nor an undeclared
 * parameter is refused by a route that reads no query.
 *
 * ONE MEASURED ZERO, and it is a claim the positive half owns
 * rather than a leg that missed. Replacing `toStoreWindow(query)`
 * with a fixed `{ limit: 50, offset: 0 }` reddens NOTHING: every
 * window here is wider than the collection, deliberately, so that
 * no refusal depends on where its rows happened to fall. What the
 * window SELECTS is unobservable until a case pages through more
 * rows than one window holds, which is the successor's to write.
 * `meta` is the half of the window this file does pin, through the
 * cap's control and the two envelope legs above.
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

import { buildPersonasRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('personas-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It carries {@link STORED_ROLE} too, which is the widening control
 * the duplicate case rests on: `personas_domain_id_role_unique` is
 * per-domain, so a store or a service holding it globally cannot
 * even build this fixture.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * An id no planted persona carries.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is
 * the `404` case's subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The role both planted domains carry, and every duplicate takes. */
const STORED_ROLE = 'scorer';

/** The second role of {@link STORED_SLUG}, which every patch moves. */
const PATCHED_ROLE = 'drafter';

/** A role no planted domain carries, and every control writes. */
const FREE_ROLE = 'researcher';

/** The system text a create sends when the text is not the subject. */
const SOME_TEXT = 'Weigh what the researcher brought back.';

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/personas/service.ts`'s constant; what is
 * pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a persona answers with. */
const NO_SUCH_PERSONA_BODY = {
  code: 'NOT_FOUND',
  message: 'No persona carries that id',
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
 * The whole body a taken role answers with, from either write.
 *
 * Asserted on the create AND on the rename, from one constant, so a
 * module that stopped translating one of the two call sites is a
 * red case rather than a difference nobody looked for.
 */
const ROLE_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This domain already carries a persona for that role',
};

/**
 * The whole body a create with no `systemText` answers with.
 *
 * ONE detail, naming the member and nothing the request said. The
 * message is this repository's own vocabulary rather than zod's,
 * which `src/http/validation.ts` carries the argument for, and
 * `invalid_type` covers both a missing member and a wrongly typed
 * one — zod raises one code for the two, and they differ only in
 * the field path, which is where the difference belongs.
 */
const NO_SYSTEM_TEXT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'systemText',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * Builds an app carrying one freshly built personas router.
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
function buildPersonasApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildPersonasRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains, three personas, and the app in front of them.
 *
 * The smallest fixture every refusal here can be reached from: two
 * roles under {@link STORED_SLUG} — one for a duplicate to take
 * and one for every patch to address — and one under
 * {@link OTHER_SLUG} carrying the FIRST domain's role, which is the
 * widening control the `409` cases rest on.
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/personas`, so a case about a patch is not
 * also a case about the create route — and so the duplicate case
 * is refused by a row it did not have to create successfully first.
 * No route on this router can write a domain at all.
 *
 * @returns The app, and the ids the two rows under
 *   {@link STORED_SLUG} were given. The store is not handed back:
 *   every reading a case takes afterwards is a response, so a case
 *   reaching past the surface under test would be pinning the
 *   fixture rather than the router.
 */
async function withPersonas(): Promise<{
  app: Application;
  scorerId: number;
  drafterId: number;
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
  const scorer = await store.insertPersona({
    domainId: stored.id,
    role: STORED_ROLE,
    systemText: 'Score what the researcher found.',
  });
  const drafter = await store.insertPersona({
    domainId: stored.id,
    role: PATCHED_ROLE,
    systemText: 'Draft the digest.',
  });

  await store.insertPersona({
    domainId: other.id,
    role: STORED_ROLE,
    systemText: 'Score what the transit researcher found.',
  });

  return {
    app: buildPersonasApp(store),
    scorerId: scorer.id,
    drafterId: drafter.id,
  };
}

/** The path a domain's personas are read and written at. */
function personasPath(slug: string): string {
  return `/domains/${slug}/personas`;
}

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no persona
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withPersonas();

    const missing = await request(app).get(personasPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies
    // the assertion above on its own. It also says what the 404 is
    // FOR — a domain with no personas is a 200 carrying
    // `data: []`, so only a domain that is not there answers this
    // way.
    const found = await request(app).get(personasPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(2);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withPersonas();
    const body = { role: FREE_ROLE, systemText: SOME_TEXT };

    const missing = await request(app)
      .post(personasPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(personasPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createPersona` parses the body BEFORE
    // it resolves the slug, so a malformed one would be answered
    // 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe(FREE_ROLE);
  });
});

describe('an id naming no persona', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, drafterId } = await withPersonas();
    const patch = { systemText: 'Draft the digest, briefly.' };

    const missing = await request(app)
      .patch(`/personas/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/personas/${drafterId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_PERSONA_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.systemText).toBe(patch.systemText);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, drafterId } = await withPersonas();

    const missing = await request(app).delete(`/personas/${ABSENT_ID}`);
    const removed = await request(app).delete(`/personas/${drafterId}`);
    const afterwards = await request(app).get(personasPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_PERSONA_BODY);
    // Nothing hangs off a persona, so this delete has no guard to
    // refuse it. That the domain carries one persona afterwards is
    // what says the 204 was a delete rather than a handler
    // answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(1);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, drafterId } = await withPersonas();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(app)
      .patch('/personas/abc')
      .send({});
    const onDelete = await request(app).delete('/personas/abc');
    const anId = await request(app).delete(`/personas/${drafterId}`);

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
    const { app } = await withPersonas();

    // Upper case, which `slugParamSchema` refuses and which a
    // lookup would simply not find. The two routes that take a
    // `:slug` are not the two that take an `:id`, so this case and
    // the one above narrow disjoint halves of the router.
    const onList = await request(app).get(personasPath('Example-Radar'));
    const onCreate = await request(app)
      .post(personasPath('Example-Radar'))
      .send({ role: FREE_ROLE, systemText: SOME_TEXT });
    const aSlug = await request(app).get(personasPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap, and a parameter nothing declares
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app } = await withPersonas();
    const personas = personasPath(STORED_SLUG);

    const overCap = await request(app).get(`${personas}?perPage=201`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get(`${personas}?perPage=200`);

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
    const { app } = await withPersonas();

    // A misspelt `page`. Stripped rather than refused, it would
    // answer page 1 and look to the caller like a collection that
    // has nothing past its first page. This route is paginated,
    // unlike the taxonomy's, so the parameter it refuses here is a
    // typo rather than a vocabulary it does not speak.
    const response = await request(app)
      .get(`${personasPath(STORED_SLUG)}?pge=2`);

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
// The payload: a role the domain carries, and a member a create owes
// ---------------------------------------------------------------------------

describe('a write proposing a role the domain carries', () => {
  it('answers 409 on a create, where a free role answers 201', async () => {
    const { app } = await withPersonas();

    const duplicate = await request(app)
      .post(personasPath(STORED_SLUG))
      .send({ role: STORED_ROLE, systemText: SOME_TEXT });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post(personasPath(STORED_SLUG))
      .send({ role: FREE_ROLE, systemText: SOME_TEXT });
    // The widening control, which neither of the two above can
    // stand in for: the key is unique within the DOMAIN and not
    // across the table, so the SAME role under a second domain has
    // to be accepted. A router or a store holding it globally is
    // green against every other case in this file.
    const elsewhere = await request(app)
      .post(personasPath(OTHER_SLUG))
      .send({ role: PATCHED_ROLE, systemText: SOME_TEXT });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ROLE_TAKEN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe(FREE_ROLE);
    expect(elsewhere.status).toBe(201);
  });

  it('answers 409 on a rename, where a free role answers 200', async () => {
    const { app, drafterId } = await withPersonas();

    const duplicate = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: STORED_ROLE });
    // The control is a rename that lands, through the SAME
    // operation: without it this case is equally green against a
    // route that refuses every rename it is given.
    const renamed = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: FREE_ROLE });

    // The same body constant as the create, which is the claim:
    // two writes reach one unique key, and this is the only wave-1
    // patch that can reach one at all. A module that stopped
    // translating either call site is a red case rather than a
    // difference nobody looked for.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ROLE_TAKEN_BODY);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.role).toBe(FREE_ROLE);
  });
});

describe('a create body carrying no systemText', () => {
  it('answers 422 naming the member a patch may omit', async () => {
    const { app, drafterId } = await withPersonas();

    const created = await request(app)
      .post(personasPath(STORED_SLUG))
      .send({ role: FREE_ROLE });
    // The control is the SAME member absent from a patch, which is
    // legal: `patchPersonaSchema` holds both members optional
    // because a patch names what to rewrite, while a create states
    // a whole persona. Without this the case is equally green
    // against a router refusing every body with no `systemText` in
    // it.
    const patched = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: FREE_ROLE });

    // The WHOLE envelope, because the detail is the answer here
    // rather than an accompaniment to the status: a caller reads
    // `field` to know which member to add, and nothing it sent is
    // in the body at all.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NO_SYSTEM_TEXT_BODY);
    expect(patched.status).toBe(200);
    expect(patched.body.data.role).toBe(FREE_ROLE);
  });
});
