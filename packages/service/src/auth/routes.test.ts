/**
 * Two things about `buildAuthRouter` that only a running router
 * reports: the rate limiter it puts in front of `POST /login`, and
 * the secret gate it puts in front of `POST /introspect`. Both are
 * driven over supertest against a router built by the real factory.
 *
 * Nothing else in the repository reports on the limiter. It has no
 * exported symbol, no type a signature could pin and no branch a
 * coverage run would miss — `lint`, `check-types` and the rest of
 * the suite are all green against a router carrying no limiter at
 * all, which is exactly the state this file exists to distinguish
 * from the shipped one.
 *
 * Four claims about the budget. Ten attempts inside one window are
 * served and the eleventh is refused with `429` and the same
 * `{ error }` envelope every other refusal on this router answers
 * with. That refusal is reached BEFORE the store, which is the
 * property a limiter on a login route is bought for: an attempt that
 * gets as far as the handler costs an argon2id verify, so an
 * unbudgeted `/login` spends this service's CPU whether or not it
 * ever guesses the password. The budget is scoped to `/login` and
 * not to the router. And each router the factory builds gets a
 * window of its own, which is a claim about where the limiter is
 * CONSTRUCTED — one hoisted to module scope would pass every case
 * above and make a deployment's budget shared with the suite's.
 *
 * Three claims about how a caller is IDENTIFIED, which is the half
 * this route gets by passing no `keyGenerator` at all. Under
 * express-rate-limit 8 the default masks an IPv6 address down to its
 * /56 network before keying, so `2001:db8:abcd:12::1` and
 * `2001:db8:abcd:99::1` spend ONE budget between them rather than
 * one each; v7 keyed on the exact address and did not. A third
 * address outside that /56 keeps its own window, and two IPv4
 * addresses keep theirs, which is what separates the masking from a
 * limiter that had simply collapsed every caller onto one key. Those
 * three together are what a `keyGenerator` reading `req.ip` would
 * redden — and the library's own guard against writing one is a
 * substring check on the function's source text, so nothing but a
 * case like this reports the opt-out.
 *
 * One claim about the INTROSPECTION GATE, and it is about WHERE the
 * refusal happens rather than about what it says. That route
 * discloses a session's claims, so the secret check runs before the
 * body is parsed and before the store is touched: a caller without
 * the secret learns nothing and costs this service no read. Which
 * headers match is `introspect-secret.test.ts`'s subject, so what
 * this case adds over it is the store counter — a gate moved to
 * AFTER the lookup answers a byte-identical `401` to a
 * byte-identical request, and nothing in the response separates the
 * two. Its in-band control is an authorized call on that same
 * counter, since a store nothing ever calls answers `0` to
 * everything.
 *
 * One claim against the ASSEMBLED service, which is the only place
 * the word "stricter" means anything: `createService` installs an
 * app-wide limiter of its own and both run on this route. The
 * comparison is made between the two policies the running service
 * advertises rather than between two literals — `/auth/login` must
 * name a smaller count over a longer window than `/auth/logout`
 * does, so the case follows a change to either limiter instead of
 * pinning today's numbers.
 *
 * Anti-vacuity. The budget case asserts the TENTH attempt was served
 * as well as that the eleventh was not, because a limiter set to one
 * or to zero satisfies the refusal alone. The before-the-store case
 * pairs its `0` against an allowed attempt's `1` on the same
 * counter, since a store nothing ever calls answers `0` to
 * everything. The scoping case fires more than the whole budget at
 * `/logout` rather than one request past it. And each keying case
 * reads `RateLimit-Remaining` rather than a status, so it reports
 * which window was charged rather than only that the request was
 * under some limit.
 *
 * The window is fifteen minutes, so no case here waits for one to
 * roll: every claim is about what happens inside a single window,
 * and a fresh router is how a case gets a fresh one.
 *
 * Eight mutations of `routes.ts` were run against these ten cases,
 * and the split is worth reading rather than assuming, because two
 * legs are far wider than the setting they move. Dropping the
 * limiter from the route reddens EIGHT — every case but two: the
 * scoping one, which asserts `/logout` is not limited and so cannot
 * notice a limiter that stopped existing, and the gate one, which
 * makes no login request at all. Raising the count from ten to a
 * hundred reddens that same eight rather than the two budget cases,
 * because each keying case reads `RateLimit-Remaining` and so
 * inherits the count. The other three limiter legs are narrow and
 * matched: mounting the limiter on the router with `use` instead of
 * on the route reddens the scoping case and the assembled-service
 * one; shortening the window to thirty seconds reddens the envelope
 * case (which reads `Retry-After`) and, again, the
 * assembled-service one; and adding a `keyGenerator` keyed on the
 * exact `req.ip` reddens exactly ONE, the /56 case, which is the
 * whole reason that case is written the way it is.
 *
 * The three gate legs each redden exactly one case, the gate's own,
 * but through DIFFERENT assertions — which is what says its three
 * readings are not restatements of each other. Deleting the gate
 * fails on the status, `expected 200 to be 401`. Changing the
 * refusal's status fails on that same assertion, `expected 403 to
 * be 401`. And moving the gate to after `verifySession` leaves the
 * status and the body untouched and fails on the counter alone,
 * `expected 1 to be +0`. That last leg is the reason the counter is
 * in the case at all: a gate running after the read is invisible to
 * every assertion a refusal test would ordinarily carry.
 */
import type { AuthStore } from './store.js';
import type { ServiceHandle } from '../../lib/express/types.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createService } from '../../lib/express/create-service.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryAuthStore,
} from '../../tests/helpers/memory-auth-store.js';

import { buildAuthRouter } from './routes.js';

// Tests run in test mode — no process.exit, ephemeral port. Only the
// last describe boots a service, but the flag is read at boot time
// and setting it here keeps it out of that block's own setup.
process.env.NODE_ENV = 'test';

/**
 * A real logger with every level suppressed.
 *
 * The router logs a fixed message on each refusal path, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement.
 */
const silentLogger = createLogger('auth-routes-test', { level: 'silent' });

/**
 * The `AUTH_INTROSPECT_SECRET` every router built here is configured
 * with.
 *
 * A constant rather than a literal per call site so that the gate
 * case can present it — and present a WRONG one of the same length,
 * which is the refusal a compare that had reduced to a string
 * equality would still get right.
 */
const INTROSPECT_SECRET = 'introspect-secret-for-this-file';

/**
 * A secret of exactly {@link INTROSPECT_SECRET}'s length that is not
 * it.
 *
 * Which headers match is `introspect-secret.test.ts`'s subject, not
 * this file's; equal length is chosen here only because it is the
 * refusal with the least room for an accident.
 */
const WRONG_SECRET = 'x'.repeat(INTROSPECT_SECRET.length);

/**
 * The two numbers a draft-6 `RateLimit-Policy` header carries.
 */
interface RateLimitPolicy {
  /** How many requests the window allows. */
  readonly limit: number;
  /** How long the window is, in seconds. */
  readonly windowSeconds: number;
}

/**
 * Reads a draft-6 `RateLimit-Policy` header.
 *
 * Parsed rather than compared as a string so that a case can assert
 * the RELATION between two limiters instead of today's spelling of
 * either. The throw is the vacuity guard: a missing header parses to
 * two `NaN`s, and every numeric comparison against `NaN` is false,
 * so a case reading an absent policy would otherwise report the
 * limiter as not stricter rather than as not there.
 *
 * @param header - The raw header value, as supertest returns it.
 * @returns The count and the window in seconds.
 * @throws Error When the value is absent or not in draft-6's form.
 */
function parsePolicy(header: string | undefined): RateLimitPolicy {
  const match = /^(\d+);w=(\d+)$/.exec(header ?? '');
  const limit = Number(match?.[1]);
  const windowSeconds = Number(match?.[2]);

  if (!Number.isInteger(limit) || !Number.isInteger(windowSeconds)) {
    throw new Error(
      `expected a draft-6 RateLimit-Policy header, read ${String(header)}`,
    );
  }

  return { limit, windowSeconds };
}

/** An {@link AuthStore} that counts what was asked of it. */
interface CountingStore {
  /** The store to hand the router. */
  readonly store: AuthStore;
  /** How many port methods have been called on it so far. */
  calls(): number;
}

/**
 * Wraps the in-memory store in a counter.
 *
 * A response says what a handler ANSWERED; this says whether it got
 * as far as the store. The two refusals on `POST /login` are
 * byte-identical on purpose, so nothing in a rate-limited response
 * distinguishes it from a refused credential — the counter is what
 * separates a limiter that answered first from one that ran after
 * the handler had already done the work.
 *
 * @returns The wrapped store and its counter.
 */
function createCountingStore(): CountingStore {
  const inner = createMemoryAuthStore();
  let calls = 0;

  const store = new Proxy(inner, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      return function counted(...args: unknown[]): unknown {
        calls += 1;
        return Reflect.apply(
          value as (...called: unknown[]) => unknown,
          target,
          args,
        );
      };
    },
  });

  return { store, calls: () => calls };
}

/**
 * Builds an app carrying one freshly built auth router.
 *
 * A FRESH router per call is not tidiness. The limiter counts
 * against a store living on the middleware instance, so an app
 * shared between cases would make each one's remaining budget a
 * function of how many cases ran before it.
 *
 * `trust proxy` is a number rather than `true`: express-rate-limit 8
 * refuses the permissive form outright, on the grounds that it lets
 * any caller name its own address and so bypass an IP-keyed limit.
 * One hop is what the keying cases need to put an address on a
 * request, and it is what a real deployment behind a single
 * load balancer would set.
 *
 * @param store - What the router acts against. Defaults to an empty
 *   in-memory store, which every case that never logs in wants.
 * @returns The Express app, with the router mounted at `/auth`.
 */
function buildAuthApp(
  store: AuthStore = createMemoryAuthStore(),
): Application {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/auth', buildAuthRouter({
    store,
    clock: () => new Date(),
    ttlSeconds: 3600,
    introspectSecret: INTROSPECT_SECRET,
    logger: silentLogger,
  }));

  return app;
}

/**
 * Posts one login attempt that no store can satisfy.
 *
 * The body is well formed, so an attempt that is not refused by the
 * limiter reaches the store and answers `401` — which is what makes
 * the store counter and the status both readable in one call.
 *
 * @param app - The app to post to.
 * @param forwardedFor - The address to attribute the attempt to.
 *   Omit it to let every attempt come from the same caller.
 * @returns The supertest response.
 */
async function login(
  app: Application,
  forwardedFor?: string,
): Promise<request.Response> {
  const pending = request(app).post('/auth/login');

  if (forwardedFor !== undefined) {
    void pending.set('X-Forwarded-For', forwardedFor);
  }

  return pending.send({ user: 'nobody', password: 'not-the-password' });
}

// ---------------------------------------------------------------------------
// The POST /login attempt budget
// ---------------------------------------------------------------------------

describe('buildAuthRouter — the POST /login attempt budget', () => {
  it('serves ten attempts in a window and refuses the eleventh', async () => {
    const app = buildAuthApp();
    const statuses: number[] = [];

    for (let attempt = 1; attempt <= 11; attempt += 1) {
      const res = await login(app);
      statuses.push(res.status);
    }

    // The first ten are the anti-vacuity half: a limiter of one, or
    // of zero, refuses the eleventh just as well.
    expect(statuses.slice(0, 10)).toStrictEqual(Array<number>(10).fill(401));
    expect(statuses[10]).toBe(429);
  });

  it('answers a refusal in the router\'s own error envelope', async () => {
    const app = buildAuthApp();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await login(app);
    }

    const refused = await login(app);

    // express-rate-limit's own default body is the plain string
    // `Too many requests, please try again later.`, which a client
    // parsing this router's `{ error }` envelope reads as nothing at
    // all. `toStrictEqual` rather than a property check, so a body
    // that grew a second field is a red rather than a pass.
    expect(refused.status).toBe(429);
    expect(refused.body).toStrictEqual({ error: 'Too Many Requests' });
    expect(refused.headers['content-type']).toMatch(/^application\/json/);
    expect(refused.headers['retry-after']).toBe('900');
  });

  it('refuses a rate-limited attempt before reaching the store', async () => {
    const counting = createCountingStore();
    const app = buildAuthApp(counting.store);

    const beforeAllowed = counting.calls();
    await login(app);
    const allowedCost = counting.calls() - beforeAllowed;

    for (let attempt = 2; attempt <= 10; attempt += 1) {
      await login(app);
    }

    const beforeRefused = counting.calls();
    const refused = await login(app);
    const refusedCost = counting.calls() - beforeRefused;

    expect(refused.status).toBe(429);
    expect(refusedCost).toBe(0);

    // The in-band control. A store nothing ever calls answers 0 to
    // every reading above, so the claim is only worth something
    // beside an attempt that DID reach it.
    expect(allowedCost).toBeGreaterThan(0);
  });

  it('keeps the budget on POST /login rather than on the router', async () => {
    const app = buildAuthApp();
    const statuses: number[] = [];

    // Well past the login budget, so a limiter mounted on the router
    // with `use` rather than on the one route would be refusing by
    // now.
    for (let attempt = 1; attempt <= 15; attempt += 1) {
      const res = await request(app)
        .post('/auth/logout')
        .send({ token: 'names-no-session' });

      statuses.push(res.status);
    }

    expect([...new Set(statuses)]).toStrictEqual([200]);
  });

  it('gives every router it builds a window of its own', async () => {
    const spent = buildAuthApp();

    for (let attempt = 1; attempt <= 11; attempt += 1) {
      await login(spent);
    }

    // The control for the case: the first router really is out of
    // budget, so the second one's answer is about where the limiter
    // is constructed and not about the budget being generous.
    const exhausted = await login(spent);
    expect(exhausted.status).toBe(429);

    const fresh = await login(buildAuthApp());
    expect(fresh.status).toBe(401);
    expect(fresh.headers['ratelimit-remaining']).toBe('9');
  });
});

// ---------------------------------------------------------------------------
// How the login limiter identifies a caller
//
// Every case here is a claim about the `keyGenerator` this router does
// NOT pass. They are grouped apart from the budget cases because they
// would all keep passing at any limit above two — what they read is
// which window a request was charged to, never whether it was refused.
// ---------------------------------------------------------------------------

describe('buildAuthRouter — how the login limiter keys a caller', () => {
  it('spends one budget across two addresses in one IPv6 /56', async () => {
    const app = buildAuthApp();

    const first = await login(app, '2001:db8:abcd:12::1');
    const second = await login(app, '2001:db8:abcd:99::1');

    // Both addresses mask to `2001:db8:abcd::/56`, so the second
    // request is the second hit of ONE window. Under a
    // `keyGenerator` keyed on the exact address — express-rate-limit
    // 7's default, and what any hand-written one would restore —
    // this would read `9` twice.
    expect(first.headers['ratelimit-remaining']).toBe('9');
    expect(second.headers['ratelimit-remaining']).toBe('8');
  });

  it('gives an address outside that /56 a window of its own', async () => {
    const app = buildAuthApp();

    await login(app, '2001:db8:abcd:12::1');
    const outside = await login(app, '2001:db8:abcd:ff00::1');

    // The discriminating half of the case above: a limiter that had
    // collapsed every caller onto one key would spend the same
    // budget here, and would satisfy the /56 claim by accident.
    expect(outside.headers['ratelimit-remaining']).toBe('9');
  });

  it('leaves two IPv4 addresses on separate windows', async () => {
    const app = buildAuthApp();

    const first = await login(app, '203.0.113.7');
    const second = await login(app, '203.0.113.8');

    // IPv4 keys unmasked under the same default. Two neighbouring
    // addresses sharing a window would mean the masking had been
    // applied to a family it is not meant for.
    expect(first.headers['ratelimit-remaining']).toBe('9');
    expect(second.headers['ratelimit-remaining']).toBe('9');
  });
});

// ---------------------------------------------------------------------------
// The secret gate in front of POST /introspect
//
// WHERE the refusal happens, not what it says. Which headers match is
// `introspect-secret.test.ts`'s subject and the refusal's status and
// body belong to whatever pins the route's answers; the reading here
// is the store counter, which is the only one that separates a gate
// running first from one running after the read.
// ---------------------------------------------------------------------------

describe('buildAuthRouter — the POST /introspect secret gate', () => {
  it('refuses a wrong secret before reaching the store', async () => {
    const counting = createCountingStore();
    const app = buildAuthApp(counting.store);

    const beforeRefused = counting.calls();
    const refused = await request(app)
      .post('/auth/introspect')
      .set('Authorization', `Bearer ${WRONG_SECRET}`)
      .send({ token: 'a-token-this-store-never-issued' });
    const refusedCost = counting.calls() - beforeRefused;

    const beforeAuthorized = counting.calls();
    const authorized = await request(app)
      .post('/auth/introspect')
      .set('Authorization', `Bearer ${INTROSPECT_SECRET}`)
      .send({ token: 'a-token-this-store-never-issued' });
    const authorizedCost = counting.calls() - beforeAuthorized;

    expect(refused.status).toBe(401);
    expect(refused.body).toStrictEqual({ error: 'Unauthorized' });
    expect(refusedCost).toBe(0);

    // The in-band control, and the half the case is written for. A
    // gate moved to AFTER the lookup answers a byte-identical `401`
    // to a byte-identical request, so the status and the body above
    // hold just as well against a service that had already spent the
    // read. Both calls send the SAME body naming the same unknown
    // token, so the only difference between them is the header — and
    // an authorized call is what says the counter can move at all.
    expect(authorized.status).toBe(200);
    expect(authorized.body).toStrictEqual({ active: false });
    expect(authorizedCost).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The login limiter beside the app-wide one, on an assembled service
// ---------------------------------------------------------------------------

describe('buildAuthRouter — the login limiter on a built service', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('advertises a policy stricter than the app-wide limiter\'s', async () => {
    handle = await createService({
      serviceId: 'auth-routes-limiter-probe',
      register(app) {
        app.use('/auth', buildAuthRouter({
          store: createMemoryAuthStore(),
          clock: () => new Date(),
          ttlSeconds: 3600,
          introspectSecret: INTROSPECT_SECRET,
          logger: silentLogger,
        }));
      },
    });

    const refusedLogin = await request(handle.app)
      .post('/auth/login')
      .send({ user: 'nobody', password: 'not-the-password' });

    const logout = await request(handle.app)
      .post('/auth/logout')
      .send({ token: 'names-no-session' });

    const loginPolicy = parsePolicy(refusedLogin.headers['ratelimit-policy']);
    const appPolicy = parsePolicy(logout.headers['ratelimit-policy']);

    // `/logout` carries no limiter of its own, so the policy it
    // advertises is `applyMiddleware`'s — which makes this a
    // comparison between the two limiters the running service
    // actually installed rather than between two literals written
    // down here. Stricter on BOTH axes: fewer attempts, over a
    // longer window. Either alone would be arguable, since a shorter
    // window with a smaller count can be the more permissive of two.
    expect(loginPolicy.limit).toBeLessThan(appPolicy.limit);
    expect(loginPolicy.windowSeconds).toBeGreaterThan(appPolicy.windowSeconds);

    // Vacuity guard on the pair. Both limiters run on `/auth/login`
    // and each header goes to whichever middleware set it last, so a
    // login policy that read as the app-wide one would mean the
    // router's limiter never ran at all.
    expect(loginPolicy).not.toStrictEqual(appPolicy);
    expect(refusedLogin.status).toBe(401);
  });
});
