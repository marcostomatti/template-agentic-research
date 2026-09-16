/**
 * What `buildMeRouter` answers, driven over supertest behind the two
 * guards `ctx.requireAuth` can resolve to: the framework's
 * passthrough, which is what a service with no auth block runs, and
 * the real `buildRequireAuthFrom` over a stub verifier, which is what
 * one with an auth block runs.
 *
 * THE OPEN SERVICE COMES FIRST. A request that reaches the route with
 * no session is answered `{ ok: true, sub: null }`, and the key set is
 * asserted whole: an absent `sub` or an empty string would hide the
 * one fact the `null` exists to report.
 *
 * THEN A SESSION. The same router behind the real guard, with a
 * bearer token the stub resolves, answers that session's `sub`. The
 * verifier's call counter is read beside it, because a route that
 * answered a hard-coded subject would pass the body assertion alone.
 * The two cases are each other's control: the first is `null` where
 * the second is a string, so a handler ignoring the session reddens
 * one and a handler inventing one reddens the other.
 *
 * The last case drives nothing: it holds the binding table's labels
 * against a walk over the built router, and parses both answers
 * above through the exported response schema.
 */
import type { SessionVerifier } from '../../lib/express/auth.js';
import type { RequestHandler } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  buildRequireAuthFrom,
  passthroughMiddleware,
} from '../../lib/express/auth.js';
import { createLogger } from '../../lib/logger/node.js';
import { labelsOf } from '../../tests/helpers/route-labels.js';

import {
  buildMeRouter,
  meResponseSchema,
  meRouteSchemas,
} from './routes.js';

const silentLogger = createLogger('me-routes-test', { level: 'silent' });

/** The one token the stub verifier accepts. */
const LIVE_TOKEN = 'live-token';

/** The subject the stub verifier resolves that token to. */
const OPERATOR_SUB = 'operator';

/**
 * An app mounting the router at the root behind `guard`, the way
 * `src/index.ts` mounts it behind `ctx.requireAuth`.
 */
function appBehind(guard: RequestHandler): express.Application {
  const app = express();

  app.use(guard, buildMeRouter());

  return app;
}

/** A verifier resolving {@link LIVE_TOKEN} and counting its calls. */
function countingVerifier(): SessionVerifier & { calls: number } {
  const verifier = {
    calls: 0,
    async verify(token: string) {
      verifier.calls += 1;

      return token === LIVE_TOKEN
        ? { sub: OPERATOR_SUB }
        : null;
    },
  };

  return verifier;
}

describe('GET /me', () => {
  it('answers a null sub when the guard is a passthrough', async () => {
    const res = await request(appBehind(passthroughMiddleware))
      .get('/me');

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({ ok: true, sub: null });
  });

  it('answers the verified session sub behind the real guard', async () => {
    const verifier = countingVerifier();
    const guard = buildRequireAuthFrom(verifier, silentLogger);

    const res = await request(appBehind(guard))
      .get('/me')
      .set('Authorization', `Bearer ${LIVE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({ ok: true, sub: OPERATOR_SUB });
    // The subject came through the verifier rather than from the
    // handler: one token, one verification.
    expect(verifier.calls).toBe(1);
  });

  it('binds exactly the routes the router declares', async () => {
    const router = buildMeRouter();
    // The SET, because `labelsOf` answers one label per handler.
    const declared = [...new Set(labelsOf(router, ''))].sort();
    const bound = Object.keys(meRouteSchemas).sort();

    expect(bound).toStrictEqual(declared);
    expect(bound).toContain('GET /me');
    // The route parses nothing, so its binding is empty.
    expect(meRouteSchemas['GET /me']).toStrictEqual({});

    // Both answers are members of the response schema, and a
    // refusal is a reading rather than a schema accepting anything.
    expect(meResponseSchema.safeParse({ ok: true, sub: null }).success)
      .toBe(true);
    expect(meResponseSchema.safeParse({ ok: true, sub: OPERATOR_SUB })
      .success).toBe(true);
    expect(meResponseSchema.safeParse({ ok: true }).success).toBe(false);
  });
});
