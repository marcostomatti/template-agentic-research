/**
 * The four modules of `src/auth/` assembled the way `src/index.ts`
 * assembles them, booted through `createService`, and asked the two
 * questions a deployment asks: does a configured credential get a
 * session, and does that session reach a guarded route.
 *
 * WHAT THIS FILE COVERS THAT ITS SIBLINGS DO NOT is the composition.
 * `bootstrap.test.ts` drives the upsert, `routes.test.ts` drives the
 * router over an app of its own, `verifier.test.ts` drives the
 * verifier, and `lib/express/create-service.test.ts` drives the
 * framework's two auth forms over a scripted seam. Every one of them
 * is green against a service that wires the pieces to each other
 * wrongly — a bootstrap writing a subject the verifier never returns,
 * a router mounted over a different store than the verifier reads, a
 * verifier built but not passed into the `auth` block. What is
 * asserted here is that one login's token, minted by the router,
 * opens a route guarded by `ctx.requireAuth`, which is a claim about
 * the wiring and about nothing else.
 *
 * THE SHAPE IS RE-ASSEMBLED HERE RATHER THAN IMPORTED, and that is a
 * real limit on what a green run says. `src/index.ts` resolves
 * `src/config.ts` at import time and ends in a top-level
 * `createService` call, so importing it boots a service against a
 * real database — nothing the isolated suite can do. So
 * {@link bootWiredService} spells the same presence toggle, the same
 * 0-or-1 dependency array, the same precedence between the two auth
 * forms and the same conditional `/auth` mount, over the in-memory
 * store instead of the drizzle one. A divergence introduced in
 * `src/index.ts` itself is invisible to this file; what reaches that
 * module is `lint`, `check-types` and booting it by hand. What this
 * file holds is the shape it is supposed to have.
 *
 * THE STORE IS THE SUBSTITUTION and it is the only one. Everything
 * else on the path is the shipped module: the bootstrap dependency
 * hashes with argon2id and writes through the port, the router mints
 * and reads real tokens, the verifier applies the real expiry and
 * revocation rules, and `createService` resolves the real middleware.
 * `src/index.ts` builds `createDbAuthStore(() => dbDep.client)` in the
 * one place this file builds `createMemoryAuthStore()`; both are the
 * same `AuthStore`, which is the whole reason the port exists.
 *
 * NO CASE HERE READS A TIMESTAMP, so no clock is pinned. The deps get
 * the wall clock `src/index.ts` gives them and the store keeps its
 * own, which is what the shipped pair does too — the drizzle store
 * stamps off the database and the session rules compare against the
 * process. Expiry is `service.test.ts` and `verifier.test.ts`'s
 * subject, and a session minted here is live for the whole of the
 * case that minted it.
 *
 * Anti-vacuity for the configured group. The credential the login
 * verifies against is written by NOTHING in this file: the store is
 * constructed empty inside the boot helper and the only writer is the
 * bootstrap dependency `createService` starts, so the user row read
 * back is the dependency having run. The admitting case reads the
 * `sub` off the guarded route rather than only its status, because a
 * verifier reading some other store answers the same `200` — the
 * subject the route saw has to be the one the bootstrap derived and
 * the one the login response carried. And that case sends a token
 * naming no session on the SAME service, because a `401` for an
 * ABSENT header is reached before the verifier is called at all: the
 * unknown-token leg is the only reading here that says the verifier
 * was reached and answered null.
 *
 * Anti-vacuity for the unconfigured group. An open route and an
 * absent guard are two different things and the status cannot tell
 * them apart, so `requireAuth` is asserted to BE
 * `passthroughMiddleware` rather than merely to admit. The second
 * case is the other two thirds of the same toggle — a `404` on
 * `/auth/login` and an empty user table — which is what says one
 * value gated the bootstrap, the router and the verifier together.
 * They are the complement of the configured group's readings on the
 * same two readers, so neither group's `listUsers()` assertion is a
 * reader that only ever answers one way.
 *
 * Five mutations were run against these five cases, each split
 * identical across two passes, and the file is narrower than it looks
 * because only two of the cases ever reach a session. Emptying
 * `createAuthBootstrapDependency`'s `onStart` reddens TWO — the mint
 * case, on the user row, and the admitting case, whose login then has
 * no credential to verify against. Answering `null` from
 * `createDbSessionVerifier` reddens ONE, the admitting case, and the
 * refusal case above it does not notice: a request carrying no bearer
 * header is refused before any verify. Returning the token's stored
 * HASH from `POST /login` instead of the token reddens that same ONE,
 * which is this file's reading of the never-stored rule — the mint
 * case asserts a `token` key and a hash satisfies it, so what catches
 * the swap is the token being USED. Answering a DIFFERENT subject
 * from `verifySession` reddens ONE, again the admitting case, and
 * only through its subject assertion, which is what says that
 * assertion is not a restatement of the status beside it.
 *
 * The fifth is the one worth taking a wider denominator on, since a
 * leg in the framework half can reach any file. Resolving the
 * verifier form to no middleware in `lib/express/create-service.ts`
 * — a service booting with passthrough auth on the form every
 * deployment here uses — reddens THREE of the package's 806 cases:
 * the refusal case and the admitting case here, plus the one case in
 * `lib/express/create-service.test.ts` that already pinned that
 * branch. The mint case is not among them, which is the split saying
 * a `/auth` router mounted over a service whose guard was never built
 * still logs in perfectly well.
 */
import type {
  ServiceConfig,
  ServiceContext,
  ServiceHandle,
} from '../../lib/express/index.js';
import type { AuthDeps, BootstrapCredentials } from '../../src/auth/index.js';
import type { MemoryAuthStore } from '../helpers/memory-auth-store.js';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createService,
  getSession,
  passthroughMiddleware,
} from '../../lib/express/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  buildAuthRouter,
  createAuthBootstrapDependency,
  createDbSessionVerifier,
} from '../../src/auth/index.js';
import { createMemoryAuthStore } from '../helpers/memory-auth-store.js';

// Tests run in test mode — no process.exit on a failed dependency,
// and an ephemeral port. Read at boot time, so it is set before the
// first `createService` call rather than inside either group's setup.
process.env.NODE_ENV = 'test';

/**
 * A real logger with every level suppressed.
 *
 * `src/index.ts` hands the router the service's own logger, and the
 * router logs a fixed line on each refusal path. Silence is the whole
 * requirement here; what those lines say is `routes.test.ts`'s
 * subject.
 */
const silentLogger = createLogger('auth-wiring-test', { level: 'silent' });

/** The `AUTH_BASIC_USER` the configured group boots with. */
const BASIC_USER = 'wiring-operator';

/** The `AUTH_BASIC_PASSWORD` that goes with it. */
const BASIC_PASSWORD = 'wiring-operator-password';

/**
 * The subject `bootstrapAuthUser` derives from {@link BASIC_USER},
 * spelled out rather than computed.
 *
 * `subjectFor` is not exported precisely so that a case cannot build
 * its expectation with the function under test. The prefix is the
 * strategy's namespace; see `src/auth/bootstrap.ts`.
 */
const BOOTSTRAPPED_SUBJECT = 'basic:wiring-operator';

/** The `AUTH_SESSION_TTL_SECONDS` every session here is minted under. */
const SESSION_TTL_SECONDS = 3600;

/**
 * The `AUTH_INTROSPECT_SECRET` the router is configured with.
 *
 * No case here reaches `POST /introspect` — that endpoint serves a
 * sibling service and is `routes.test.ts`'s subject. It is supplied
 * because the router demands it, and it is a real value rather than
 * an empty string so that this file does not quietly become a test of
 * the closed-gate fallback.
 */
const INTROSPECT_SECRET = 'wiring-introspect-secret-32-bytes-ok';

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
   * The store every half of the strategy was wired over. Held so a
   * case can read what the bootstrap wrote without going through a
   * route.
   */
  readonly store: MemoryAuthStore;
}

/**
 * Boots a service assembled the way `src/index.ts` assembles one.
 *
 * The body below is that module's wiring with the database taken out
 * of it: the same presence toggle over one credential value, the same
 * 0-or-1 bootstrap dependency spread into the array, the same
 * precedence resolving to the verifier form when the credential is
 * configured and to no `auth` block at all when it is not, and the
 * same `/auth` mount behind the same toggle. The `Pick` is
 * `resolveAuthConfig`'s return type there, kept so that a block
 * carrying both forms would be refused here exactly as it is there.
 *
 * `/me` is `src/index.ts`'s own protected route, and it answers one
 * field more: the claims the guard attached. A status alone cannot
 * say WHICH session opened the route, and a service wired over two
 * different stores answers the same `200`.
 *
 * @param credentials - The operator credential to configure, or null
 *   for the deployment that sets neither variable.
 * @returns The handle, the registration context and the store.
 * @throws Error When `register` never ran, which would leave every
 *   assertion about the context reading an undefined.
 */
async function bootWiredService(
  credentials: BootstrapCredentials | null,
): Promise<WiredService> {
  const store = createMemoryAuthStore();
  const deps: AuthDeps = {
    now: () => new Date(),
    ttlSeconds: SESSION_TTL_SECONDS,
  };

  const bootstrapDependencies = credentials === null
    ? []
    : [createAuthBootstrapDependency(store, deps, credentials)];

  const authConfig: Pick<ServiceConfig, 'auth'> = credentials === null
    ? {}
    : { auth: { verifier: createDbSessionVerifier(store, deps) } };

  let captured: ServiceContext | undefined;

  const handle = await createService({
    serviceId: 'auth-wiring-probe',
    dependencies: [...bootstrapDependencies],
    ...authConfig,
    register(app, ctx) {
      captured = ctx;

      if (credentials !== null) {
        app.use('/auth', buildAuthRouter({
          store,
          clock: deps.now,
          ttlSeconds: deps.ttlSeconds,
          introspectSecret: INTROSPECT_SECRET,
          logger: silentLogger,
        }));
      }

      app.get('/me', ctx.requireAuth, (_req, res) => {
        res.json({ ok: true, session: getSession(res) ?? null });
      });
    },
  });

  if (captured === undefined) {
    throw new Error('register never ran, so no context was captured');
  }

  return { handle, ctx: captured, store };
}

/**
 * Posts the login the bootstrapped credential satisfies.
 *
 * @param handle - The running service.
 * @returns The supertest response.
 */
async function login(handle: ServiceHandle): Promise<request.Response> {
  return request(handle.app)
    .post('/auth/login')
    .send({ user: BASIC_USER, password: BASIC_PASSWORD });
}

/**
 * Reads the token out of a login response.
 *
 * The throw is the vacuity guard. An absent token reaches the guarded
 * route as the header `Bearer undefined`, which is refused `401` —
 * exactly the answer the unknown-token control in the same case is
 * looking for, so a login that minted nothing would leave that case
 * passing for a reason nothing in it names.
 *
 * The message carries the status and the field NAMES only. A response
 * that did carry a token carries a bearer credential, and a failure
 * message is not a place to put one.
 *
 * @param response - The response to a `POST /auth/login`.
 * @returns The token it carried.
 * @throws Error When the body carries no string token.
 */
function tokenFrom(response: request.Response): string {
  const token: unknown = (response.body as { token?: unknown }).token;

  if (typeof token !== 'string' || token === '') {
    const keys = Object.keys(response.body as object)
      .sort()
      .join(', ');

    throw new Error(
      'expected a token from POST /auth/login, read status '
      + `${String(response.status)} with keys [${keys}]`,
    );
  }

  return token;
}

/** The envelope every refusal on this path answers with. */
const UNAUTHORIZED_BODY = { error: 'Unauthorized' };

// ---------------------------------------------------------------------------
// Both variables set: bootstrap, router and verifier all wired
// ---------------------------------------------------------------------------

describe('the wired service — the basic credential configured', () => {
  let wired: WiredService | undefined;

  afterEach(async () => {
    if (wired) {
      await wired.handle.stop();
      wired = undefined;
    }
  });

  it('mints a session against the bootstrapped credential', async () => {
    wired = await bootWiredService({
      user: BASIC_USER,
      password: BASIC_PASSWORD,
    });

    // The credential is the dependency having run. Nothing in this
    // file writes to the store, and the boot helper constructs it
    // empty, so a row here is `createService` having started the
    // bootstrap before `register` — which is the ordering the
    // `dependencies` array is what buys.
    const users = wired.store.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0]?.username).toBe(BASIC_USER);
    expect(users[0]?.sub).toBe(BOOTSTRAPPED_SUBJECT);

    const response = await login(wired.handle);

    expect(response.status).toBe(200);
    // The whole key set, not the three fields: `token` is random and
    // cannot be part of a `toStrictEqual`, and a `tokenHash` or a
    // `passwordHash` arriving by spread is caught by nothing else.
    expect(Object.keys(response.body as object).sort())
      .toEqual(['expiresAt', 'sub', 'token']);
    expect(tokenFrom(response)).not.toBe('');
    // The subject the bootstrap derived, on the wire. A router over a
    // store the bootstrap never wrote to could not answer this login
    // at all, and one over a different credential would answer a
    // different subject.
    expect(response.body.sub).toBe(BOOTSTRAPPED_SUBJECT);
  });

  it('refuses the guarded route to a request carrying no token', async () => {
    wired = await bootWiredService({
      user: BASIC_USER,
      password: BASIC_PASSWORD,
    });

    // The identity reading, and the one the status cannot give: an
    // open route and a guard that refused are different services, and
    // this is what says the verifier reached the middleware at all.
    expect(wired.ctx.requireAuth).not.toBe(passthroughMiddleware);

    const response = await request(wired.handle.app).get('/me');

    expect(response.status).toBe(401);
    expect(response.body).toStrictEqual(UNAUTHORIZED_BODY);
  });

  it('admits the token that login minted, carrying its subject', async () => {
    wired = await bootWiredService({
      user: BASIC_USER,
      password: BASIC_PASSWORD,
    });

    const token = tokenFrom(await login(wired.handle));

    const admitted = await request(wired.handle.app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);

    // The control, and the only reading in this file that reaches the
    // verifier's refusal path: the case above is refused before any
    // verify, because a request with no bearer header never produces a
    // token to ask about. This one is a well-formed credential naming
    // no session, so the `401` is the verifier having answered null.
    const unknown = await request(wired.handle.app)
      .get('/me')
      .set('Authorization', 'Bearer names-no-session-in-this-store');

    expect(admitted.status).toBe(200);
    // The subject rather than the status alone. A verifier wired over
    // some other store, or one rebuilding claims off something else,
    // answers the same `200` on this route — the subject is what says
    // the session the router minted is the row the verifier read, and
    // that both of them are the identity the bootstrap created.
    expect(admitted.body.session).toStrictEqual({
      sub: BOOTSTRAPPED_SUBJECT,
    });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toStrictEqual(UNAUTHORIZED_BODY);
  });
});

// ---------------------------------------------------------------------------
// Neither variable set: the service that booted before this strategy
// ---------------------------------------------------------------------------

describe('the wired service — no basic credential configured', () => {
  let wired: WiredService | undefined;

  afterEach(async () => {
    if (wired) {
      await wired.handle.stop();
      wired = undefined;
    }
  });

  it('leaves the guarded route open to an anonymous request', async () => {
    wired = await bootWiredService(null);

    const response = await request(wired.handle.app).get('/me');

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ ok: true, session: null });
    // The half the status cannot report. A route answering `200` to
    // an anonymous request is also what a configured service with a
    // broken guard answers, and only the identity separates them:
    // with no `auth` block at all, `createService` resolves both
    // middleware to the passthrough rather than building anything.
    expect(wired.ctx.requireAuth).toBe(passthroughMiddleware);
    expect(wired.ctx.optionalAuth).toBe(passthroughMiddleware);
  });

  it('mounts no session routes and bootstraps no credential', async () => {
    wired = await bootWiredService(null);

    const response = await request(wired.handle.app)
      .post('/auth/login')
      .send({ user: BASIC_USER, password: BASIC_PASSWORD });

    // The other two thirds of the toggle. One value gates the
    // bootstrap dependency, the `/auth` mount and the verifier
    // together in `src/index.ts`, and a half-applied toggle is the
    // failure that arrangement exists against — a login route with no
    // credential behind it could only ever refuse, and a credential
    // written for a strategy that is off is a password on disk for no
    // reason.
    expect(response.status).toBe(404);
    expect(wired.store.listUsers()).toHaveLength(0);
  });
});
