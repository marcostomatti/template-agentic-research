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
 * instead of the twelve drizzle ones. A divergence introduced in
 * `src/index.ts` itself is invisible here; what reaches that module
 * is `lint`, `check-types` and booting it by hand.
 *
 * ONE SERVICE PER DESCRIBE, AND THE LIMITER IS WHY. `applyMiddleware`
 * in `lib/express/middleware.ts` mounts express-rate-limit app-wide
 * from a fallback literal reading `max: 100, windowMs: 60_000`, and
 * it passes no `keyGenerator`, so every request supertest makes over
 * loopback shares one window. Each limiter carries a store of its
 * own, so that budget is per `createService` rather than per file —
 * which is the whole of what the split buys. {@link useWiredService}
 * boots one service inside each describe that issues a request, and
 * each of them starts from a fresh 100.
 *
 * THE SPEND IS MEASURED RATHER THAN COUNTED, off the limiter itself.
 * A `RateLimit-Remaining` header rides every response the surface
 * answers, refusals included, and it decrements exactly once per
 * request — `/health` too, `applyMiddleware` running above the
 * built-in routes. The last case of each describe below reads it and
 * holds `limit - remaining` against what that describe's own rows
 * predict, so these figures are a reading rather than arithmetic
 * somebody did once:
 *
 *   the route table                          0 of 100, no service
 *   every wave 1 route, behind its mount    39 of 100
 *   every wave 2 route, behind its mount    41 of 100
 *   every wave 3 route, behind its mount    27 of 100
 *   the wired service around the mounts      5 of 100
 *
 * A wave describe spends two requests per row plus the one its own
 * spend case makes: 19, 20 and 13 rows against the limiter's 100.
 * The mounts describe spends four — `/health` and `/example` open,
 * then the unmatched path anonymously and with a credential — plus
 * the same one. THE HEADROOM IS THE POINT, and the wave-3 group is
 * what turned it from an argument into a measurement: the widest
 * describe leaves 59, while the four describes together want 112 of
 * one window. Booting a single service for the whole file is a leg
 * below, and it now reddens EIGHT — the last three wave-3 rows
 * answering `429`, and `/health` and `/example` behind them
 * answering it too, on a file that had 18 of its one window left
 * before this wave landed. Adding rows to an EXISTING describe still
 * spends that describe's budget, and the third case in `the route
 * table` is what refuses a wave that has outgrown it: a `429` would
 * otherwise present as a flaky mount on whichever rows ran last,
 * rather than as a limit.
 *
 * THE STORE IS THE SUBSTITUTION and it is the only one. Everything
 * else on the path is the shipped module: the real routers, the real
 * services behind them, the real boundary parser, and the real
 * `createService` resolving the real guard from a real `auth` block.
 * `src/index.ts` spreads its twelve drizzle stores into one
 * `researchStore` and hands that object to every router;
 * `tests/helpers/memory-research-store.ts` is the same shape from
 * the other side — one implementation of all twelve ports — so one
 * object stands behind the whole surface in each describe too.
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
 * are written by hand. The describes are derived from it as well:
 * {@link SURFACE_WAVES} is the wave member's own value set, so a row
 * added under a new wave brings a describe and a service with it.
 *
 * ANTI-VACUITY, four readings and a control apiece. The table's
 * label set is held EQUAL to the labels read off the routers' own
 * `stack`, so a route added to any router and not to the table is a
 * route with no case here, and a row naming a route no router
 * registered is a case requesting a path Express never matched —
 * whose `401` would say nothing at all. Every derived URL is
 * asserted to carry no `:` left, because an unsubstituted parameter
 * still reaches the router as a literal segment and is still refused
 * `401` anonymously. The waves are asserted to PARTITION the table
 * and to leave every describe inside the window, which is what stops
 * a derived describe list from quietly collapsing to one. And
 * `/health` and `/example` are asserted OPEN to an anonymous
 * request, which is what separates these `401`s from a service that
 * refuses everything without a credential.
 *
 * NOTHING HERE WRITES, which is what lets one service serve a whole
 * describe. Each store is constructed empty, every `:slug` and `:id`
 * in the table addresses a row that does not exist, and every
 * request is sent with no body — so the writes answer `422` on the
 * payload and the reads answer `404` on the address, and the dataset
 * the next case sees is the one that describe's boot built. Each
 * wave describe reads its own store back at the foot rather than the
 * file reading one at the end, which is the claim the split moved:
 * what a wave's rows wrote is now a question about that wave alone.
 * Connectors are the one group hanging off no domain, so their count
 * is read directly; every wave-1 and wave-2 resource is created
 * through a `:slug`, and a domain count of zero is what says no
 * request in that describe ever resolved one to create anything
 * under. WAVE 3 IS THE EXCEPTION AND WANTS A READING OF ITS OWN:
 * all four of its writes are addressed by an `:id` rather than
 * through a `:slug`, so the domain count says nothing about them.
 * The verdict route is the one of the four whose table is readable
 * from the address alone, and the empty label list the same case
 * reads is what says no ruling was appended under it.
 *
 * FORTY LEGS WERE RUN AGAINST THESE SIXTY-FIVE CASES, three times
 * each, and every figure below is the failed SET at least two of the
 * three passes agreed on. The base run is 0 of 65; every figure is
 * failed-of-total, and the three legs whose total moves move it by
 * editing the table itself. Thirty of the forty were run three times
 * against HEAD's copy of this file as well, which is what separates
 * a figure this wave MOVED from one that drifted: twenty-two came
 * back set-identical on both sides, eight gained members and none
 * lost any, and each gained member is named below. The other ten
 * have no anchor at HEAD — six wave-3 mounts, one cumulative guard
 * leg reaching past them, and the three the label reading below
 * needs.
 *
 * FOUR ARE ABOUT THE TABLE AND ITS DERIVATION. Adding a row for a
 * route no router declares reddens TWO of 66 — the table guard, and
 * the row's own generated case, which requests a path Express never
 * matched. Dropping a row reddens the table guard alone, 1 of 64,
 * and so does the same comparison's other direction:
 * {@link registeredLabels} losing the five wave-2 routers while the
 * table keeps their rows. Making {@link urlFor} answer its argument
 * unchanged reddens the substitution guard alone. All four are
 * set-identical to their HEAD readings: the guards are per-table
 * rather than per-row, so thirteen more rows do not widen them.
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
 * FIVE ARE ABOUT THE DATASET, two of them carried in and three of
 * them the price of the label reading the wave-3 writes needed.
 * Seeding a domain no row addresses reddens ALL THREE dataset cases,
 * the seed sitting in the boot every one of them makes. Seeding the
 * domain the table's `:slug` names reddens `DELETE /domains/:slug`
 * on `expected '' to be 'application/json'` — the delete succeeds
 * and answers `204` with no body — plus the wave-2 AND wave-3
 * dataset cases: wave 1's own stays green because the row it counted
 * was taken by the case above it, and no wave-2 or wave-3 row
 * deletes a domain at all. Each is the HEAD set plus exactly the new
 * describe's dataset case.
 *
 * THE LABEL READING NEEDED THREE OF ITS OWN, because an empty store
 * answers `[]` for every id and a zero over nothing planted is not a
 * reading. Planting a finding at the addressed id and a ruling on it
 * reddens all THREE dataset cases; the SAME plant with the read
 * aimed at an id nothing planted reddens NOTHING, which is what says
 * the address is load-bearing rather than decorative; and aiming the
 * read elsewhere with nothing planted reddens nothing either, which
 * is the honest limit — that argument is pinned only under a plant.
 * The plant has to be a finding AND a ruling: the fake refuses a
 * label whose finding it does not carry, and a leg planting the
 * label alone takes the whole FILE down at `beforeAll` rather than
 * reddening a case.
 *
 * NINETEEN DROP `ctx.requireAuth` FROM A MOUNT, and each reddens
 * five cases or none, decided by the mount's POSITION rather than by
 * the router behind it — which is where they part company with the
 * unmount legs above, whose router lost its own cases wherever it
 * sat. Taken off the FIRST mount, exactly the five domains cases
 * redden, every one at `expect(anonymous.status).toBe(401)` and none
 * through a control. Taken off any of the other FIFTEEN it reddens
 * NOTHING — fifteen measured zeros rather than one, because every
 * mount sits at `/` and the first guard still standing refuses every
 * anonymous request before any later mount is reached. What makes
 * those zeros a statement about position is the three cumulative
 * legs: dropping the guard from the first TWO mounts reddens NINE,
 * the five domains cases plus the four categories ones; from the
 * first SIX, TWENTY-FIVE, every wave-1 row plus the six topics ones;
 * and from the first ELEVEN, FORTY-TWO, which is every wave-1 and
 * wave-2 row plus the three findings ones — each stopping at the
 * next guard in the fall-through, and the last of them the reading
 * that says the fall-through reaches a wave-3 mount the same way.
 * The six wave-3 zeros are why that third cumulative leg is here at
 * all: a zero per mount says nothing on its own about a mount no
 * request can reach.
 *
 * NINE ARE ABOUT THE SPLIT AND THE SPEND, and this wave turned the
 * first of them from a claim about a budget into one about
 * behaviour. Booting ONE service for the whole file, as it did
 * before the split, reddens EIGHT: the wave-2 spend case, the last
 * three wave-3 rows, the wave-3 spend case, and all three cases of
 * the mounts describe behind them. At HEAD's two-wave table that
 * same leg reddened TWO spend cases and nothing else, so the six it
 * gained are the window running OUT mid-file rather than merely
 * being mispredicted — which is what says the split is load-bearing
 * and not a rearrangement. Dropping {@link SPEND_PROBE_COST} from
 * the prediction reddens the three wave spend cases, and so does
 * pricing a row at ONE request rather than two; both are their HEAD
 * set plus the new describe's. Transcribing the shipped ceiling as
 * 30 reddens FIVE — all four `limit` assertions and the ceiling
 * case, 39 and 41 both being over it — where transcribing it as 200
 * reddens the four `limit` assertions alone, which is the pair that
 * says those are two claims rather than one. Reading the spend off a
 * header the limiter does not send reddens all four, on the `NaN`
 * {@link headerNumberOf} answers rather than a zero. Pricing the
 * mounts describe at six requests reddens its own spend case alone.
 * Answering every wave the FIRST wave's rows reddens the partition
 * assertion alone, 1 of 70, the spend cases staying green because a
 * nineteen-row describe spends what a nineteen-row prediction says;
 * and collapsing the wave list to one reddens that same case, 1 of
 * 28, on the two claims it holds together.
 *
 * ONE HONEST ZERO, and it is structural. The ceiling assertion
 * itself — {@link spendOfWave} against {@link RATE_LIMIT_MAX} — has
 * no leg at this table size other than moving the ceiling, no
 * mutation short of adding thirty rows to the widest wave to breach
 * 100. That is why the leg above is spelled as a transcription of 30
 * rather than as a wider table, and it is not an argument for
 * dropping the assertion: what it exists to refuse is a wave that
 * GREW.
 *
 * THE SPEND CASES ARE COUPLED TO THE RECORDED SUPERTEST FLAKE, which
 * is the one cost of measuring rather than counting. A request lost
 * to it is a request the limiter never counted, so a flaked row case
 * drags its own describe's spend case down with it and a one-case
 * leg reads as three. That coupling is why every figure above is a
 * MAJORITY over three passes rather than a single reading: eight of
 * the tip's single passes carried a flake pair and six of HEAD's
 * did, no two of them the same pair, and one leg — the guard on the
 * SECOND mount — carried one in two passes of three and had to be
 * re-run alone, where it answered zero three times out of three.
 * Read a spend case reddening BESIDE a row case as the flake rather
 * than as a budget that moved, and re-run the leg rather than
 * recording what one pass said.
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
import { buildDocumentsRouter } from '../../src/documents/routes.js';
import { buildDomainsRouter } from '../../src/domains/index.js';
import { buildEntitiesRouter } from '../../src/entities/routes.js';
import { buildFindingsRouter } from '../../src/findings/routes.js';
import { buildPersonasRouter } from '../../src/personas/routes.js';
import { exampleRouter } from '../../src/routes/example.js';
import { buildRunsRouter } from '../../src/runs/routes.js';
import { buildSpendRouter } from '../../src/runs/spend-routes.js';
import { buildSettingsRouter } from '../../src/settings/routes.js';
import {
  buildSourceFailuresRouter,
} from '../../src/sources/failures-routes.js';
import {
  buildSourceProposalsRouter,
} from '../../src/sources/proposals-routes.js';
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
// first `createService` call rather than inside one.
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
 * Every store here is constructed empty and nothing writes, so it
 * names no domain. That is the point rather than a limitation: the
 * reads answer `404` on the address instead of serving a row, and no
 * case depends on what an earlier one left behind.
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
 * The route every spend case addresses, and the framework's own.
 *
 * Open, cheap and outside the table, so reading a describe's spend
 * costs one request that no row of the table also makes. It is
 * counted like any other: `applyMiddleware` mounts the limiter above
 * `mountBuiltinRoutes`, so `/health` decrements the window too.
 */
const HEALTH_PATH = '/health';

/**
 * The limiter ceiling `applyMiddleware` ships, per service.
 *
 * Transcribed from the fallback literal in
 * `lib/express/middleware.ts` rather than imported, because that
 * literal is inline in the `expressRateLimit` call and exported by
 * nothing. The spend case below reads `RateLimit-Limit` off a real
 * response and holds it against this, so a bump there reddens here
 * instead of silently widening every budget in this file.
 */
const RATE_LIMIT_MAX = 100;

/**
 * What one row of {@link SURFACE_ROUTES} costs its describe.
 *
 * Each row's case issues the anonymous request and the credentialled
 * one, and the limiter counts both.
 */
const REQUESTS_PER_ROW = 2;

/**
 * What each describe's own spend case costs on top of its rows.
 *
 * One request, whose response carries the header being read — so the
 * measurement includes itself, which is why the prediction adds it.
 */
const SPEND_PROBE_COST = 1;

/**
 * What `the wired service around the mounts` spends on its rows.
 *
 * Two open routes plus the unmatched path twice. Written out because
 * that describe drives no table rows, so nothing derives it.
 */
const MOUNT_EDGE_REQUESTS = 4;

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

/** The verbs the surface declares. */
type HttpMethod = 'delete' | 'get' | 'patch' | 'post' | 'put';

/**
 * Which describe a row belongs to, and therefore which service.
 *
 * A union rather than a `string`, so a mistyped wave is a compile
 * error instead of a describe of one row booting a service of its
 * own. Widening it is an edit somebody reviews, which is the same
 * reason the table is written out: wave 3 is the last one the API
 * plan declares, and a fourth would arrive here the same way.
 */
type SurfaceWave = 'wave 1' | 'wave 2' | 'wave 3';

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
  /**
   * The describe this row is driven from, and the budget it spends.
   * {@link SURFACE_WAVES} is this member's own value set.
   */
  readonly wave: SurfaceWave;
}

/**
 * Every route the sixteen routers `src/index.ts` mounts register.
 *
 * Held equal to what those routers actually declare by the first case
 * in this file, so this is a table that cannot go quietly stale
 * rather than a list somebody remembered to extend.
 *
 * The `wave` member is load-bearing rather than presentational: the
 * describes below are generated from its value set, one service
 * apiece, which is what keeps each of them inside the limiter's
 * window. The order within a wave is presentational — the comparison
 * sorts both sides, and every case below is generated per row.
 */
const SURFACE_ROUTES = [
  { method: 'get', path: '/domains', wave: 'wave 1' },
  { method: 'post', path: '/domains', wave: 'wave 1' },
  { method: 'get', path: '/domains/:slug', wave: 'wave 1' },
  { method: 'patch', path: '/domains/:slug', wave: 'wave 1' },
  { method: 'delete', path: '/domains/:slug', wave: 'wave 1' },
  { method: 'get', path: '/domains/:slug/categories', wave: 'wave 1' },
  { method: 'post', path: '/domains/:slug/categories', wave: 'wave 1' },
  { method: 'patch', path: '/categories/:id', wave: 'wave 1' },
  { method: 'delete', path: '/categories/:id', wave: 'wave 1' },
  { method: 'get', path: '/categories/:id/terms', wave: 'wave 1' },
  { method: 'post', path: '/categories/:id/terms', wave: 'wave 1' },
  { method: 'patch', path: '/terms/:id', wave: 'wave 1' },
  { method: 'delete', path: '/terms/:id', wave: 'wave 1' },
  { method: 'get', path: '/domains/:slug/personas', wave: 'wave 1' },
  { method: 'post', path: '/domains/:slug/personas', wave: 'wave 1' },
  { method: 'patch', path: '/personas/:id', wave: 'wave 1' },
  { method: 'delete', path: '/personas/:id', wave: 'wave 1' },
  { method: 'get', path: '/settings', wave: 'wave 1' },
  { method: 'put', path: '/settings', wave: 'wave 1' },

  { method: 'get', path: '/domains/:slug/topics', wave: 'wave 2' },
  { method: 'post', path: '/domains/:slug/topics', wave: 'wave 2' },
  { method: 'patch', path: '/topics/:id', wave: 'wave 2' },
  { method: 'delete', path: '/topics/:id', wave: 'wave 2' },
  { method: 'post', path: '/topics/:id/run-now', wave: 'wave 2' },
  { method: 'post', path: '/topics/:id/pause', wave: 'wave 2' },
  { method: 'get', path: '/domains/:slug/sources', wave: 'wave 2' },
  { method: 'post', path: '/domains/:slug/sources', wave: 'wave 2' },
  { method: 'patch', path: '/sources/:id', wave: 'wave 2' },
  { method: 'delete', path: '/sources/:id', wave: 'wave 2' },
  { method: 'get', path: '/sources/:id/failures', wave: 'wave 2' },
  { method: 'get', path: '/connectors', wave: 'wave 2' },
  { method: 'post', path: '/connectors', wave: 'wave 2' },
  { method: 'patch', path: '/connectors/:id', wave: 'wave 2' },
  { method: 'delete', path: '/connectors/:id', wave: 'wave 2' },
  { method: 'get', path: '/domains/:slug/exports', wave: 'wave 2' },
  { method: 'post', path: '/domains/:slug/exports', wave: 'wave 2' },
  { method: 'patch', path: '/exports/:id', wave: 'wave 2' },
  { method: 'delete', path: '/exports/:id', wave: 'wave 2' },
  { method: 'post', path: '/exports/:id/run-now', wave: 'wave 2' },

  { method: 'get', path: '/domains/:slug/findings', wave: 'wave 3' },
  { method: 'get', path: '/findings/:id', wave: 'wave 3' },
  { method: 'patch', path: '/findings/:id/verdict', wave: 'wave 3' },
  { method: 'get', path: '/domains/:slug/documents', wave: 'wave 3' },
  { method: 'get', path: '/entities/:id', wave: 'wave 3' },
  { method: 'patch', path: '/entities/:id', wave: 'wave 3' },
  { method: 'get', path: '/entities/:id/research', wave: 'wave 3' },
  { method: 'post', path: '/entities/:id/approve-research', wave: 'wave 3' },
  { method: 'get', path: '/runs', wave: 'wave 3' },
  { method: 'get', path: '/runs/:id', wave: 'wave 3' },
  { method: 'get', path: '/spend/summary', wave: 'wave 3' },
  { method: 'get', path: '/sources/:id/pending-configs', wave: 'wave 3' },
  { method: 'post', path: '/sources/:id/approve-config', wave: 'wave 3' },
] as const satisfies readonly SurfaceRoute[];

/**
 * The waves the table declares, in the order they first appear.
 *
 * Derived rather than written out, so a row carrying a wave nothing
 * else does brings its own describe and its own service. The third
 * case in `the route table` is what keeps that derivation honest: an
 * empty wave list would collapse every describe below it silently.
 */
const SURFACE_WAVES = [
  ...new Set(SURFACE_ROUTES.map((route) => route.wave)),
];

/**
 * The rows one wave declares.
 *
 * @param wave - The wave to select.
 * @returns Its rows, in table order.
 */
function rowsOfWave(wave: SurfaceWave): readonly SurfaceRoute[] {
  return SURFACE_ROUTES.filter((route) => route.wave === wave);
}

/**
 * What a wave describe spends of its service's limiter window.
 *
 * @param wave - The wave to price.
 * @returns Two requests per row, plus the one its spend case makes.
 */
function spendOfWave(wave: SurfaceWave): number {
  return rowsOfWave(wave).length * REQUESTS_PER_ROW + SPEND_PROBE_COST;
}

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
 * requests from writing and lets one service serve a whole describe.
 * A template carrying a parameter neither substitution knows would
 * come back with its `:` intact — still routed, still refused `401`
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
 * Built over a store of its own rather than a wired service's: a
 * router factory registers its routes at construction and reads
 * nothing, so what this answers is the routers' own declaration and
 * not a fact about any running service.
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
    buildFindingsRouter({ store }),
    buildDocumentsRouter({ store }),
    buildEntitiesRouter({ store }),
    buildRunsRouter({ store }),
    buildSpendRouter({ store, clock }),
    buildSourceProposalsRouter({ store }),
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

/** What one describe has spent of its own limiter window. */
interface WindowSpend {
  /** `RateLimit-Limit`, which is that service's own ceiling. */
  readonly limit: number;
  /** How many requests it has counted, the reading one included. */
  readonly spent: number;
  /** What is left of the window. */
  readonly remaining: number;
}

/**
 * One numeric response header, or `NaN`.
 *
 * `NaN` rather than a default, so a header the limiter stopped
 * sending fails the equality below instead of reading as a spend of
 * zero — which is what a describe issuing no request would look like.
 *
 * @param response - The response to read.
 * @param name - The lower-cased header name.
 * @returns Its numeric value, or `NaN` when it is absent.
 */
function headerNumberOf(response: request.Response, name: string): number {
  const raw: unknown = response.headers[name];

  return typeof raw === 'string'
    ? Number(raw)
    : Number.NaN;
}

/**
 * What the limiter says the answering service has spent.
 *
 * The measurement rather than a count this file kept: every response
 * the surface answers carries these two headers, and the limiter
 * decrements them once per request whatever the answer was.
 *
 * @param response - Any response from the service being read.
 * @returns Its ceiling, its spend and its headroom.
 */
function windowSpendOf(response: request.Response): WindowSpend {
  const limit = headerNumberOf(response, 'ratelimit-limit');
  const remaining = headerNumberOf(response, 'ratelimit-remaining');

  return { limit, remaining, spent: limit - remaining };
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
   * The one store behind every router of this service, held so a
   * describe can read its dataset without going through a route.
   */
  readonly store: MemoryResearchStore;
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

      // The wave-3 six, below the wave-2 five and in the same order
      // `src/index.ts` mounts them. One of them takes the clock, and
      // it is the only mount on this service that READS the present
      // rather than writing it into a column.
      app.use(ctx.requireAuth, buildFindingsRouter({ store }));
      app.use(ctx.requireAuth, buildDocumentsRouter({ store }));
      app.use(ctx.requireAuth, buildEntitiesRouter({ store }));
      app.use(ctx.requireAuth, buildRunsRouter({ store }));
      app.use(ctx.requireAuth, buildSpendRouter({ store, clock }));
      app.use(
        ctx.requireAuth,
        buildSourceProposalsRouter({ store }),
      );
    },
  });

  if (captured === undefined) {
    throw new Error('register never ran, so no context was captured');
  }

  return { handle, ctx: captured, store };
}

/**
 * Boots ONE service for the describe this is called from.
 *
 * Called inside a `describe` callback, so the `beforeAll` and
 * `afterAll` it registers belong to that suite alone. Every describe
 * below that issues a request calls it, which is what gives each of
 * them a limiter window of its own — the whole subject of the header
 * section above. A describe that issues none calls nothing, and
 * `the route table` is the one that does not.
 *
 * The accessor throws rather than answering an undefined, which is a
 * vacuity guard rather than a convenience: a case reading an
 * unbooted handle would fail on a property access, with a message
 * about the test rather than about the boot.
 *
 * @returns An accessor for that describe's own service.
 */
function useWiredService(): () => WiredService {
  let wired: WiredService | undefined;

  beforeAll(async () => {
    wired = await bootWiredService();
  });

  afterAll(async () => {
    if (wired) {
      await wired.handle.stop();
      wired = undefined;
    }
  });

  return () => {
    if (wired === undefined) {
      throw new Error('the service never booted, so no case can read it');
    }

    return wired;
  };
}

/**
 * Issues one request against a describe's own service.
 *
 * @param service - The booted service to address.
 * @param route - The table row to address.
 * @param token - The bearer credential to carry, or null to send none.
 * @returns The supertest request, unsent.
 */
function send(
  service: WiredService,
  route: SurfaceRoute,
  token: string | null,
): request.Test {
  const { app } = service.handle;
  const test = request(app)[route.method](urlFor(route.path));

  return token === null
    ? test
    : test.set('Authorization', `Bearer ${token}`);
}

/**
 * Registers one case per row of a wave, in the caller's describe.
 *
 * A function rather than a loop written inside each describe, so that
 * every wave's rows are driven by ONE case body: the describes below
 * are generated, and a body per describe would be a second claim
 * about what a row on this surface has to answer.
 *
 * @param wave - The wave whose rows to drive.
 * @param serviceOf - The calling describe's own service.
 */
function registerRowCases(
  wave: SurfaceWave,
  serviceOf: () => WiredService,
): void {
  for (const route of rowsOfWave(wave)) {
    const label = labelOf(route);

    it(`${label} refuses anonymously and routes a credential`, async () => {
      const service = serviceOf();
      const anonymous = await send(service, route, null);
      const signedIn = await send(service, route, VALID_TOKEN);

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
}

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

  it('splits the table into describes the window fits', () => {
    // The ceiling, enforced rather than recorded. Each wave below
    // boots a service of its own and spends two requests per row
    // plus the one its spend case makes; a wave that outgrew the
    // shipped 100 would answer `429` on whichever of its rows ran
    // last, which presents as a flaky mount rather than as a limit.
    for (const wave of SURFACE_WAVES) {
      expect(rowsOfWave(wave).length).toBeGreaterThan(0);
      expect(spendOfWave(wave)).toBeLessThanOrEqual(RATE_LIMIT_MAX);
    }

    // The waves PARTITION the table: every row is driven from
    // exactly one describe, so a row carrying a wave the derivation
    // missed would be a row with no case rather than a duplicate.
    expect(SURFACE_WAVES.flatMap(rowsOfWave))
      .toHaveLength(SURFACE_ROUTES.length);
    // And the derivation is not empty and has not collapsed back to
    // one describe, which is the state this file was split out of —
    // an empty wave list would take every generated describe below
    // with it, silently.
    expect(SURFACE_WAVES.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Every route on the surface, refused anonymously and routed with a token
// ---------------------------------------------------------------------------

for (const wave of SURFACE_WAVES) {
  describe(`every ${wave} route, behind its mount`, () => {
    // One service per describe, and the reason is the limiter. See
    // the header: the budget is per `createService`, so this boot is
    // what keeps this wave's rows inside a window of their own.
    const serviceOf = useWiredService();

    registerRowCases(wave, serviceOf);

    it('wrote no row while serving the cases above', async () => {
      const { store } = serviceOf();

      // What lets one service stand behind a whole describe. Every
      // write route was sent with no body and answered `422` on the
      // payload, every read addressed a row that does not exist — so
      // the dataset each case saw is the one this describe's boot
      // built, and the cases are independent of the order vitest ran
      // them in. The claim is per wave now rather than per file,
      // which is what the split moved: each store is this wave's.
      expect(await store.countDomains()).toBe(0);
      // The settings row is the one piece of state on this surface
      // that no address can hide behind: absent until something
      // writes it, and `PUT /settings` is a row of wave 1.
      expect(await store.readSettings()).toBeNull();
      // Connectors are the one group that hangs off no domain, so
      // they are the one whose emptiness has to be read directly.
      // Topics, sources and export subscriptions are all created
      // through a `:slug`, and the zero above is what says no
      // request here ever resolved a domain to create one under.
      expect(await store.countConnectors({})).toBe(0);

      // Wave 3's four writes are the exception, and the zero above
      // says nothing about them: every one of them is addressed by
      // an `:id` rather than through a `:slug`.
      // `PATCH /findings/:id/verdict` is the one of the four whose
      // table is readable from the address alone — an entity patch
      // and either approval can only ever rewrite a row no store
      // here carries — and an empty list is what says no ruling was
      // appended under the id the table addresses.
      const labels = await store.listFindingLabels(Number(UNSTORED_ID));

      expect(labels).toStrictEqual([]);
    });

    it('spent a measured share of the limiter window', async () => {
      const { app } = serviceOf().handle;
      const spend = windowSpendOf(await request(app).get(HEALTH_PATH));

      // The shipped ceiling, read off a real response rather than
      // trusted from the literal above — a bump in
      // `lib/express/middleware.ts` reddens here.
      expect(spend.limit).toBe(RATE_LIMIT_MAX);
      // What this describe actually spent, which is the figure the
      // header records. It is derived from the table, so a row
      // added to this wave moves both sides; a CASE that started
      // issuing a request nobody accounted for moves only this one.
      expect(spend.spent).toBe(spendOfWave(wave));
      // The claim the split exists for.
      expect(spend.remaining).toBeGreaterThan(0);
    });
  });
}

// ---------------------------------------------------------------------------
// The mounts at their edges: what they guard, and what they leave alone
// ---------------------------------------------------------------------------

describe('the wired service around the mounts', () => {
  const serviceOf = useWiredService();

  it('builds a real guard rather than the passthrough', () => {
    // The identity reading, and the one no status can give. With no
    // `auth` block, `createService` resolves both middleware to the
    // passthrough and every route above answers without a
    // credential — so a green local boot says nothing about whether
    // the guard is on the mount. See `08-http-api.md`.
    expect(serviceOf().ctx.requireAuth).not.toBe(passthroughMiddleware);
  });

  it('leaves the routes mounted above them open', async () => {
    const { app } = serviceOf().handle;

    const health = await request(app).get(HEALTH_PATH);
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
    const { app } = serviceOf().handle;

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

  it('spent a measured share of the limiter window', async () => {
    const { app } = serviceOf().handle;
    const spend = windowSpendOf(await request(app).get(HEALTH_PATH));

    // This describe drives no table row, so its four requests are
    // written out rather than derived: `/health` and `/example`
    // open, then the unmatched path twice. The reading is the same
    // one every wave describe makes, against the same ceiling.
    expect(spend.limit).toBe(RATE_LIMIT_MAX);
    expect(spend.spent).toBe(MOUNT_EDGE_REQUESTS + SPEND_PROBE_COST);
    expect(spend.remaining).toBeGreaterThan(0);
  });
});
