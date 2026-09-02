/**
 * Every router `src/index.ts` mounts, assembled the way that module
 * assembles them, booted through `createService` with an auth block,
 * and asked the one question none of their own test files can ask:
 * is every route on the surface behind the guard, and does a
 * credential get past it.
 *
 * WHAT THIS FILE COVERS THAT ITS SIBLINGS DO NOT is the mount. Each
 * `*-routes.test.ts` builds an app of its own — `express()` plus
 * `express.json()` plus the router plus `errorHandler` — and leaves
 * `createService` out deliberately, because the app-wide limiter
 * counts across cases and the guard is nobody's subject there. So
 * every one of them is green against a service that mounts its
 * router with no `ctx.requireAuth` in front of it, or does not mount
 * it at all. What is asserted here is that each route answers `401`
 * with no credential and its own routed answer with one, which is a
 * claim about the wiring and about nothing else.
 * `docs/architecture/08-http-api.md` names this file as that reading.
 *
 * THE SHAPE IS RE-ASSEMBLED HERE RATHER THAN IMPORTED, and that is
 * the same real limit `tests/auth/wiring.test.ts` states about its
 * own subject. `src/index.ts` resolves `src/config.ts` at import
 * time and ends in a top-level `createService` call, so importing it
 * boots a service against a real database — nothing the isolated
 * suite can do. {@link bootWiredService} spells the same
 * `app.use(ctx.requireAuth, router)` lines in the same order, below
 * a starter route mounted above them, over the in-memory store
 * instead of the eight drizzle ones. A divergence introduced in
 * `src/index.ts` itself is invisible here; what reaches that module
 * is `lint`, `check-types` and booting it by hand.
 *
 * THE STORE IS THE SUBSTITUTION and it is the only one. Everything
 * else on the path is the shipped module: the real routers, the real
 * services behind them, the real boundary parser, and the real
 * `createService` resolving the real guard from a real `auth` block.
 * `src/index.ts` spreads its eight drizzle stores into one
 * `researchStore` and hands that object to every router;
 * `tests/helpers/memory-research-store.ts` is the same shape from
 * the other side — one implementation of all eight ports — so one
 * object stands behind the whole surface here too.
 *
 * THE VERIFIER IS SCRIPTED rather than real, and that is deliberate
 * rather than a shortcut. What a token means, how it is minted and
 * when it expires are `src/auth/`'s subject and are already driven
 * by `tests/auth/wiring.test.ts` end to end. What this file needs
 * from auth is a credential that verifies and one that does not, so
 * the block below scripts exactly that and pins nothing else.
 *
 * THE TABLE IS DERIVED, NOT TRANSCRIBED. A row carries the express
 * PATH TEMPLATE the router registered, and {@link urlFor} builds the
 * request URL from it — so a row's label and the address its case
 * actually requests cannot drift apart, which they can whenever both
 * are written by hand.
 *
 * ANTI-VACUITY, three readings and a control apiece. The table's
 * label set is held EQUAL to the labels read off the routers' own
 * `stack`, so a route added to any router and not to the table is a
 * route with no case here, and a row naming a route no router
 * registered is a case requesting a path Express never matched —
 * whose `401` would say nothing at all. Every derived URL is
 * asserted to carry no `:` left, because an unsubstituted parameter
 * still reaches the router as a literal segment and is still refused
 * `401` anonymously. And `/health` and `/example` are asserted OPEN
 * to an anonymous request, which is what separates these `401`s from
 * a service that refuses everything without a credential.
 *
 * NOTHING HERE WRITES, which is what lets one service serve every
 * case. The store is constructed empty, every `:slug` and `:id` in
 * the table addresses a row that does not exist, and every request
 * is sent with no body — so the writes answer `422` on the payload
 * and the reads answer `404` on the address, and the dataset the
 * next case sees is the one the boot built. Connectors are the one
 * group hanging off no domain, so the last case reads their count
 * directly; every other resource is created through a `:slug`, and
 * a domain count of zero is what says no request here ever resolved
 * one to create anything under.
 *
 * THE LIMITER IS THE CEILING ON THIS FILE, and it is closer than it
 * looks. One service serves every case, `createService` mounts its
 * rate limiter app-wide at 100 requests a minute, and each table row
 * costs TWO — measured 82 requests with 18 left. A wave-3 group of
 * any size does not fit, and what it wants is a second service per
 * describe rather than a wider window: the limit is the shipped
 * default and this file is the only reader that ever approaches it.
 *
 * TWENTY-ONE LEGS WERE RUN AGAINST THESE FORTY-FIVE CASES, and every
 * one of them is about a guard or a mount rather than about a route.
 *
 * FOUR ARE ABOUT THE TABLE AND ITS DERIVATION. Adding a row for a
 * route no router declares reddens TWO — the table guard, and the
 * fabricated row's own case, which requests a path Express never
 * matched. Dropping a row reddens the table guard alone, and so does
 * the same comparison's other direction, {@link registeredLabels}
 * losing the five wave-2 routers while the table keeps their rows.
 * Making {@link urlFor} answer its argument unchanged reddens the
 * substitution guard alone.
 *
 * THREE ARE ABOUT WHAT A MOUNT SERVES, and each reddens exactly the
 * rows of the router it took away: unmounting the connectors router
 * reddens its FOUR cases, unmounting the failures router its ONE,
 * and dropping all five wave-2 mounts from the boot reddens exactly
 * the TWENTY wave-2 rows. All of them fail through the envelope and
 * content-type assertions rather than through the `401` — every
 * other mount still refuses an anonymous request, which is the split
 * saying not-`401` on its own would have missed it.
 *
 * TWO ARE ABOUT THE DATASET, and they are a pair rather than one leg
 * measured twice. Seeding a domain NO row addresses reddens the last
 * case alone. Seeding the domain the table's `:slug` names reddens
 * `DELETE /domains/:slug` instead and nothing else, on
 * `expected '' to be 'application/json'` — the delete succeeds and
 * answers `204` with no body — and leaves the last case green,
 * because the row it counted was taken by the case above it.
 *
 * THE OTHER TWELVE DROP `ctx.requireAuth` FROM A MOUNT, and each
 * reddens five cases or none, decided by the mount's POSITION rather
 * than by the router behind it — which is where they part company
 * with the unmount legs above, whose router lost its own cases
 * wherever it sat. Taken off the FIRST mount, exactly the five
 * domains cases redden, every one at
 * `expect(anonymous.status).toBe(401)` and none through a control.
 * Taken off any of the other NINE mounts it reddens NOTHING — nine
 * measured zeros rather than one, because every mount sits at `/`
 * and the first guard still standing refuses every anonymous request
 * before any later mount is reached. What makes those zeros a
 * statement about position is the two cumulative legs: dropping the
 * guard from the first TWO mounts reddens NINE, the five domains
 * cases plus the four categories ones, and dropping it from the
 * first SIX reddens TWENTY-FIVE, every wave-1 row plus the six
 * topics ones — each stopping at the next guard in the
 * fall-through.
 *
 * SO THIS FILE PINS THE SURFACE RATHER THAN THE MOUNTS. What it
 * reports is that an anonymous request is refused before it reaches
 * any route on the surface, which is the claim `08-http-api.md`
 * makes for it; the later guards are redundancy no request can see
 * while an earlier one stands, and a commit dropping every one of
 * them would be caught by the domains cases alone. The limit this
 * header states is measured rather than argued: dropping
 * `ctx.requireAuth` from the first mount in `src/index.ts` ITSELF
 * reddens nothing here, with `lint` and `check-types` green on it as
 * well, so what covers that module is booting it by hand and nothing
 * else.
 */
import type {
  ServiceContext,
  ServiceHandle,
} from '../../lib/express/index.js';
import type {
  MemoryResearchStore,
} from '../helpers/memory-research-store.js';
import type { Router } from 'express';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createService,
  passthroughMiddleware,
} from '../../lib/express/index.js';
import {
  buildConnectorsRouter,
} from '../../src/connectors/routes.js';
import { buildDomainsRouter } from '../../src/domains/index.js';
import { buildPersonasRouter } from '../../src/personas/routes.js';
import { exampleRouter } from '../../src/routes/example.js';
import { buildSettingsRouter } from '../../src/settings/routes.js';
import {
  buildSourceFailuresRouter,
} from '../../src/sources/failures-routes.js';
import { buildSourcesRouter } from '../../src/sources/routes.js';
import {
  buildSubscriptionsRouter,
} from '../../src/subscriptions/routes.js';
import {
  buildCategoriesRouter,
} from '../../src/taxonomy/categories-routes.js';
import { buildTermsRouter } from '../../src/taxonomy/terms-routes.js';
import { buildTopicsRouter } from '../../src/topics/routes.js';
import {
  createMemoryResearchStore,
} from '../helpers/memory-research-store.js';

// Tests run in test mode — no process.exit on a failed dependency,
// and an ephemeral port. Read at boot time, so it is set before the
// one `createService` call rather than inside it.
process.env.NODE_ENV = 'test';

/**
 * The bearer credential the scripted verifier admits.
 *
 * A literal rather than a minted session: what a token means, how it
 * is issued and when it expires are `src/auth/`'s subject and are
 * driven end to end by `tests/auth/wiring.test.ts`. Here it is the
 * one value that separates a guarded route from a reachable one.
 */
const VALID_TOKEN = 'wiring-credential-the-verifier-admits';

/**
 * The subject the scripted verifier answers with.
 *
 * No route on this surface reads the claims — nothing here
 * varies its answer by who is asking, which is the reason
 * `08-http-api.md` gives for guarding the reads too. It is a real
 * value because {@link SessionVerifier} demands one.
 */
const WIRING_SUBJECT = 'api-wiring-operator';

/**
 * The refusal `buildRequireAuthFrom` in `lib/express/auth.ts` writes.
 *
 * Asserted whole rather than by status, because a route answering a
 * `401` of its own would satisfy the status alone and this file is
 * about which layer refused.
 */
const UNAUTHORIZED_BODY = { error: 'Unauthorized' };

/**
 * The `:slug` every parameterised path in the table is addressed by.
 *
 * The store is constructed empty and nothing here writes, so it names
 * no domain. That is the point rather than a limitation: the reads
 * answer `404` on the address instead of serving a row, and no case
 * depends on what an earlier one left behind.
 */
const UNSTORED_SLUG = 'example-tech-radar';

/**
 * The `:id` every parameterised path is addressed by, naming no row.
 *
 * Well-formed on purpose. A segment the param schema refuses would be
 * answered `422` before the address is ever resolved, which is a
 * different route through the handler than the one a deployment
 * takes.
 */
const UNSTORED_ID = '1';

/**
 * A path no router on this service declares.
 *
 * Used by the one case that reads the mounts' own edge: with every
 * router mounted at `/` in front of it, a caller with no credential
 * is refused before Express reaches its own page.
 */
const UNMATCHED_PATH = '/no-router-declares-this';

/**
 * The present the two schedule-verb routers answer against.
 *
 * A thunk rather than an instant, and named after the const
 * `src/index.ts` hands the same two routers, because that is what is
 * being mirrored: `TopicsRouterOptions.clock` and
 * `SubscriptionsRouterOptions.clock` are both REQUIRED, so a router
 * cannot be built here without saying which present its verbs write.
 * No case reads a due time — every `:id` in the table names no row —
 * so what this value has to be is present, not fixed.
 */
const clock = (): Date => new Date();

/** {@link envelopeOf}'s answer for `{ success: true, data, meta? }`. */
const SUCCESS_ENVELOPE = 'the resource success envelope';

/** {@link envelopeOf}'s answer for the framework's `AppError.toJSON()`. */
const FAILURE_ENVELOPE = 'the framework failure envelope';

/**
 * {@link envelopeOf}'s answer for a body that is neither.
 *
 * Which is what Express's own `404` page reads as, and therefore what
 * a router that was never mounted would answer to a credentialled
 * request — a status that is not `401`, and nothing behind it.
 */
const NO_ENVELOPE = 'neither envelope, so nothing on the surface answered';

/** The verbs the surface declares. */
type HttpMethod = 'delete' | 'get' | 'patch' | 'post' | 'put';

/** One row of {@link SURFACE_ROUTES}. */
interface SurfaceRoute {
  /** The verb, lowercased as supertest and `route.stack` both spell it. */
  readonly method: HttpMethod;
  /**
   * The express path TEMPLATE, exactly as the router registered it —
   * `/domains/:slug`, never a substituted address. {@link urlFor}
   * derives the URL a case requests from this, so the label a case
   * carries and the path it actually asks for cannot drift apart.
   */
  readonly path: string;
}

/**
 * Every route the ten routers `src/index.ts` mounts register.
 *
 * Held equal to what those routers actually declare by the first case
 * in this file, so this is a table that cannot go quietly stale
 * rather than a list somebody remembered to extend.
 *
 * Grouped by wave and, inside a wave, by the router that declares the
 * rows — which is presentational only. The comparison sorts both
 * sides, and every case below is generated per row, so nothing here
 * depends on the order.
 */
const SURFACE_ROUTES = [
  { method: 'get', path: '/domains' },
  { method: 'post', path: '/domains' },
  { method: 'get', path: '/domains/:slug' },
  { method: 'patch', path: '/domains/:slug' },
  { method: 'delete', path: '/domains/:slug' },
  { method: 'get', path: '/domains/:slug/categories' },
  { method: 'post', path: '/domains/:slug/categories' },
  { method: 'patch', path: '/categories/:id' },
  { method: 'delete', path: '/categories/:id' },
  { method: 'get', path: '/categories/:id/terms' },
  { method: 'post', path: '/categories/:id/terms' },
  { method: 'patch', path: '/terms/:id' },
  { method: 'delete', path: '/terms/:id' },
  { method: 'get', path: '/domains/:slug/personas' },
  { method: 'post', path: '/domains/:slug/personas' },
  { method: 'patch', path: '/personas/:id' },
  { method: 'delete', path: '/personas/:id' },
  { method: 'get', path: '/settings' },
  { method: 'put', path: '/settings' },

  { method: 'get', path: '/domains/:slug/topics' },
  { method: 'post', path: '/domains/:slug/topics' },
  { method: 'patch', path: '/topics/:id' },
  { method: 'delete', path: '/topics/:id' },
  { method: 'post', path: '/topics/:id/run-now' },
  { method: 'post', path: '/topics/:id/pause' },
  { method: 'get', path: '/domains/:slug/sources' },
  { method: 'post', path: '/domains/:slug/sources' },
  { method: 'patch', path: '/sources/:id' },
  { method: 'delete', path: '/sources/:id' },
  { method: 'get', path: '/sources/:id/failures' },
  { method: 'get', path: '/connectors' },
  { method: 'post', path: '/connectors' },
  { method: 'patch', path: '/connectors/:id' },
  { method: 'delete', path: '/connectors/:id' },
  { method: 'get', path: '/domains/:slug/exports' },
  { method: 'post', path: '/domains/:slug/exports' },
  { method: 'patch', path: '/exports/:id' },
  { method: 'delete', path: '/exports/:id' },
  { method: 'post', path: '/exports/:id/run-now' },
] as const satisfies readonly SurfaceRoute[];

/**
 * The one spelling of a route's label, so the table and the routers
 * are compared in one vocabulary.
 *
 * @param method - The verb, in whatever case its source spells it.
 * @param path - The express path template.
 * @returns `GET /domains/:slug` and the like.
 */
function labelFor(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * The label of a table row.
 *
 * @param route - The row.
 * @returns Its label, per {@link labelFor}.
 */
function labelOf(route: SurfaceRoute): string {
  return labelFor(route.method, route.path);
}

/**
 * The URL a case requests for a path template.
 *
 * Both addresses name nothing, which is what keeps the table's
 * requests from writing and lets one service serve every case. A
 * template carrying a parameter neither substitution knows would come
 * back with its `:` intact — still routed, still refused `401`
 * anonymously, and asking about a segment nobody meant. The second
 * guard case is what reports it.
 *
 * @param path - The express path template.
 * @returns The path with every declared parameter substituted.
 */
function urlFor(path: string): string {
  return path.replace(':slug', UNSTORED_SLUG).replace(':id', UNSTORED_ID);
}

/**
 * The labels of every route a router registered, read off its stack.
 *
 * `router.stack` carries one layer per registered path and that
 * layer's own `stack` carries one handler layer per verb, which is
 * where the method is legible at all — a route registered for two
 * verbs is one layer with two handlers.
 *
 * @param router - A built router.
 * @returns One label per verb-and-path pair it declares.
 */
function labelsOf(router: Router): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;

    if (route === undefined) return [];

    return route.stack.map((inner) => labelFor(inner.method, route.path));
  });
}

/**
 * The labels of every route the mounted routers register.
 *
 * Built over a store of its own rather than the wired service's: a
 * router factory registers its routes at construction and reads
 * nothing, so what this answers is the routers' own declaration and
 * not a fact about the running service.
 *
 * The list below is the one place this file names the routers rather
 * than deriving them, and it is the same list {@link
 * bootWiredService} mounts, in the same order. A router added to
 * `src/index.ts` and not to both is a router this file is silent
 * about — which is the limit the header states about that module.
 *
 * @returns Every registered label, across every router.
 */
function registeredLabels(): string[] {
  const store = createMemoryResearchStore();

  return [
    buildDomainsRouter({ store }),
    buildCategoriesRouter({ store }),
    buildTermsRouter({ store }),
    buildPersonasRouter({ store }),
    buildSettingsRouter({ store }),
    buildTopicsRouter({ store, clock }),
    buildSourcesRouter({ store }),
    buildSourceFailuresRouter({ store }),
    buildConnectorsRouter({ store }),
    buildSubscriptionsRouter({ store, clock }),
  ].flatMap(labelsOf);
}

/**
 * Which of the surface's two envelopes a response body carries.
 *
 * The `401` half of every case is a status and a body; the other half
 * cannot be, because each row of the table answers something
 * different to a credentialled request against an empty store — a
 * page, a `404` on the address, a `422` on the absent payload. What
 * they share is the envelope, and an answer carrying neither is what
 * a request no router matched looks like.
 *
 * @param response - The response to classify.
 * @returns One of the three envelope constants above.
 */
function envelopeOf(response: request.Response): string {
  const body: unknown = response.body;

  if (typeof body !== 'object' || body === null) return NO_ENVELOPE;

  const shape = body as { code?: unknown; success?: unknown };

  if (shape.success === true) return SUCCESS_ENVELOPE;
  if (typeof shape.code === 'string') return FAILURE_ENVELOPE;

  return NO_ENVELOPE;
}

/** What {@link bootWiredService} hands back. */
interface WiredService {
  /** The running service, for `stop()` and for supertest. */
  readonly handle: ServiceHandle;
  /**
   * The context `register` was called with, which is where
   * `requireAuth`'s identity is readable at all.
   */
  readonly ctx: ServiceContext;
  /**
   * The one store behind every router, held so the last case can
   * read the dataset without going through a route.
   */
  readonly store: MemoryResearchStore;
}

/** The booted service, or undefined before `beforeAll` has run. */
let wired: WiredService | undefined;

/**
 * The booted service, or a throw.
 *
 * The throw is a vacuity guard rather than a convenience. A case
 * reading an undefined handle would fail on a property access, with a
 * message about the test rather than about the boot.
 *
 * @returns The service every case below drives.
 * @throws Error When the boot never ran or never finished.
 */
function wiredService(): WiredService {
  if (wired === undefined) {
    throw new Error('the service never booted, so no case can read it');
  }

  return wired;
}

/**
 * Boots a service assembled the way `src/index.ts` assembles one.
 *
 * The body below is that module's wiring with the database taken out
 * of it: the same `auth` block in its verifier form, the same starter
 * route above, and the same `app.use(ctx.requireAuth, router)` lines
 * in the same order at the bottom of `register`, one per mounted
 * router. The store is the substitution and the verifier is scripted;
 * everything else on the path is the shipped module.
 *
 * @returns The handle, the registration context and the store.
 * @throws Error When `register` never ran, which would leave every
 *   assertion about the context reading an undefined.
 */
async function bootWiredService(): Promise<WiredService> {
  const store = createMemoryResearchStore();
  let captured: ServiceContext | undefined;

  const handle = await createService({
    serviceId: 'api-wiring-probe',
    // The verifier form, which is what `resolveAuthConfig` in
    // `src/index.ts` returns whenever the basic credential is
    // configured — and the form every deployment here uses.
    auth: {
      verifier: {
        verify: async (token: string) => (token === VALID_TOKEN
          ? { sub: WIRING_SUBJECT }
          : null),
      },
    },
    register(app, ctx) {
      captured = ctx;

      // Above the mounts, exactly as in `src/index.ts`, and the one
      // starter route there that needs no database. It stays open,
      // which is what says the guard belongs to the mounts below
      // rather than to the app.
      app.use('/example', exampleRouter);

      app.use(ctx.requireAuth, buildDomainsRouter({ store }));
      app.use(ctx.requireAuth, buildCategoriesRouter({ store }));
      app.use(ctx.requireAuth, buildTermsRouter({ store }));
      app.use(ctx.requireAuth, buildPersonasRouter({ store }));
      app.use(ctx.requireAuth, buildSettingsRouter({ store }));

      // The wave-2 five, below the wave-1 five and in the same order
      // `src/index.ts` mounts them. Two take the clock beside the
      // store, which is the whole of what separates them here.
      app.use(ctx.requireAuth, buildTopicsRouter({ store, clock }));
      app.use(ctx.requireAuth, buildSourcesRouter({ store }));
      app.use(ctx.requireAuth, buildSourceFailuresRouter({ store }));
      app.use(ctx.requireAuth, buildConnectorsRouter({ store }));
      app.use(
        ctx.requireAuth,
        buildSubscriptionsRouter({ store, clock }),
      );
    },
  });

  if (captured === undefined) {
    throw new Error('register never ran, so no context was captured');
  }

  return { handle, ctx: captured, store };
}

/**
 * Issues one request against the wired service.
 *
 * @param route - The table row to address.
 * @param token - The bearer credential to carry, or null to send none.
 * @returns The supertest request, unsent.
 */
function send(route: SurfaceRoute, token: string | null): request.Test {
  const test = request(wiredService().handle.app)[route.method](
    urlFor(route.path),
  );

  return token === null
    ? test
    : test.set('Authorization', `Bearer ${token}`);
}

beforeAll(async () => {
  wired = await bootWiredService();
});

afterAll(async () => {
  if (wired) {
    await wired.handle.stop();
    wired = undefined;
  }
});

// ---------------------------------------------------------------------------
// The table, held against what the routers actually registered
// ---------------------------------------------------------------------------

describe('the route table', () => {
  it('names every route the mounted routers registered', () => {
    const declared = SURFACE_ROUTES.map(labelOf);
    const registered = registeredLabels();

    // Both directions in one comparison, and both matter. A route
    // added to any of those routers and not to the table is a
    // route with no case in this file at all; a row naming a route
    // no router registered addresses a path Express never matches,
    // where the `401` is the mounts refusing a request on its way to
    // a `404` and says nothing about any route.
    expect([...declared].sort()).toStrictEqual([...registered].sort());
    // The anti-vacuity leg for the comparison itself: two empty
    // lists are equal, and a router factory that registered nothing
    // would make the whole file pass with no route in it.
    expect(registered.length).toBeGreaterThan(0);
  });

  it('substitutes every path parameter into a request URL', () => {
    for (const route of SURFACE_ROUTES) {
      // A template reaching supertest with its `:` intact is still
      // routed and still refused `401` without a credential, so no
      // case above would report it — the segment would simply name
      // something nobody meant.
      expect(urlFor(route.path)).not.toContain(':');
    }

    // The control that gives the loop something to do. Most of the
    // table is parameterised, so a `urlFor` answering its argument
    // unchanged fails here rather than agreeing with every row.
    const parameterised = SURFACE_ROUTES
      .filter((route) => route.path.includes(':'));

    expect(parameterised.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Every route on the surface, refused anonymously and routed with a token
// ---------------------------------------------------------------------------

describe('every route on the surface, behind its mount', () => {
  for (const route of SURFACE_ROUTES) {
    const label = labelOf(route);

    it(`${label} refuses anonymously and routes a credential`, async () => {
      const anonymous = await send(route, null);
      const signedIn = await send(route, VALID_TOKEN);

      expect(anonymous.status).toBe(401);
      // The body and not only the status. A route answering a `401`
      // of its own would satisfy the status, and this file is about
      // which layer refused: that envelope is written in
      // `lib/express/auth.ts` and nowhere on this surface.
      expect(anonymous.body).toStrictEqual(UNAUTHORIZED_BODY);

      expect(signedIn.status).not.toBe(401);
      // Not-`401` is satisfied by Express's own `404` page, which is
      // exactly what an unmounted router answers — so the status
      // alone cannot tell a routed answer from an absent route. The
      // envelope can, and it is the same reading for every row
      // whatever status each of them chose.
      expect(signedIn.type).toBe('application/json');
      expect(envelopeOf(signedIn)).not.toBe(NO_ENVELOPE);
    });
  }
});

// ---------------------------------------------------------------------------
// The mounts at their edges: what they guard, and what they leave alone
// ---------------------------------------------------------------------------

describe('the wired service around the mounts', () => {
  it('builds a real guard rather than the passthrough', () => {
    // The identity reading, and the one no status can give. With no
    // `auth` block, `createService` resolves both middleware to the
    // passthrough and every route above answers without a
    // credential — so a green local boot says nothing about whether
    // the guard is on the mount. See `08-http-api.md`.
    expect(wiredService().ctx.requireAuth).not.toBe(passthroughMiddleware);
  });

  it('leaves the routes mounted above them open', async () => {
    const { app } = wiredService().handle;

    const health = await request(app).get('/health');
    const example = await request(app).get('/example');

    // The in-band control for every `401` above. A service refusing
    // every row because it refuses every anonymous request would
    // answer those cases identically, and only a route that stays
    // OPEN separates the two. `/health` is the framework's own,
    // registered before `register` runs; `/example` is inside
    // `register` and above every mount, which is the more exact
    // reading of the mount ORDER.
    expect(health.status).toBe(200);
    expect(example.status).toBe(200);
  });

  it('answers 401 before 404 on a path no router matched', async () => {
    const { app } = wiredService().handle;

    const anonymous = await request(app).get(UNMATCHED_PATH);
    const signedIn = await request(app)
      .get(UNMATCHED_PATH)
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    // The one answer outside the mounts' own prefixes that they
    // change, recorded in `08-http-api.md` and in `src/index.ts`.
    // Each mount is at `/`, so its guard runs for every request that
    // REACHES it rather than only for the ones its router matches,
    // and the bearer-less short-circuit fires before Express gets to
    // its own page.
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toStrictEqual(UNAUTHORIZED_BODY);

    // The credentialled half is the control: past the guards, the
    // same path is the `404` it was before the wave. Without it the
    // case above reads as this service having grown a route.
    expect(signedIn.status).toBe(404);
    expect(signedIn.type).toBe('text/html');
  });

  it('served every case above without a row being written', async () => {
    const { store } = wiredService();

    // What lets one service stand behind the whole file. Every write
    // route was sent with no body and answered `422` on the payload,
    // every read addressed a row that does not exist — so the
    // dataset each case saw is the one the boot built, and the cases
    // are independent of the order vitest ran them in.
    expect(await store.countDomains()).toBe(0);
    // The settings row is the one piece of state on this surface
    // that no address can hide behind: absent until something writes
    // it, and `PUT /settings` is in the table above.
    expect(await store.readSettings()).toBeNull();
    // Connectors are the one wave-2 group that hangs off no domain,
    // so they are the one whose emptiness has to be read directly.
    // Topics, sources and export subscriptions are all created
    // through a `:slug`, and the zero above is what says no request
    // here ever resolved a domain to create one under.
    expect(await store.countConnectors({})).toBe(0);
  });
});
