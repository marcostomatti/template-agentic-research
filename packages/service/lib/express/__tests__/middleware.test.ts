import type { ServiceHandle } from '../types';
import type { Response } from 'supertest';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createService } from '../create-service';

// Tests run in test mode — no process.exit, ephemeral port
process.env.NODE_ENV = 'test';

// ---------------------------------------------------------------------------
// Response headers installed by applyMiddleware
//
// Every value below was MEASURED against helmet 7.2.0 and
// express-rate-limit 7.5.1 over the stack applyMiddleware actually builds —
// none of it is recalled from either library's README, and neither library
// documents its full default set in one place. A major of either is expected
// to move these strings, which is the whole point of pinning them: the header
// set is this service's security posture, and a silent change to it is the
// failure mode a version bump has no other way of announcing.
//
// The three groups are kept apart because they have three different owners —
// helmet, express-rate-limit, and Node/Express — and this plan bumps the
// first two in separate stages, so each reconciles on its own without the
// other's expectations being touched.
// ---------------------------------------------------------------------------

/**
 * Every header `helmet()` sets with no options, measured.
 *
 * Two absences are as load-bearing as the entries: helmet 7 leaves
 * `Cross-Origin-Embedder-Policy` off by default, and it REMOVES Express's
 * `X-Powered-By` rather than setting anything — see the dedicated case below.
 */
const HELMET_DEFAULT_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy': 'default-src \'self\';base-uri \'self\';'
    + 'font-src \'self\' https: data:;form-action \'self\';'
    + 'frame-ancestors \'self\';img-src \'self\' data:;'
    + 'object-src \'none\';script-src \'self\';'
    + 'script-src-attr \'none\';'
    + 'style-src \'self\' https: \'unsafe-inline\';'
    + 'upgrade-insecure-requests',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'origin-agent-cluster': '?1',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=15552000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-dns-prefetch-control': 'off',
  'x-download-options': 'noopen',
  'x-frame-options': 'SAMEORIGIN',
  'x-permitted-cross-domain-policies': 'none',
  'x-xss-protection': '0',
};

/**
 * The rate-limit headers produced by the FALLBACK literal in
 * `applyMiddleware` — `{ max: 100, windowMs: 60_000, standardHeaders: true,
 * legacyHeaders: false }` — measured on a request to a fresh service.
 *
 * Names are spelled out one at a time on purpose. A `startsWith('ratelimit')`
 * assertion would keep passing across a draft change that renamed every one
 * of them, and the draft spelling is what a client codes against.
 *
 * `ratelimit-remaining` is `99` rather than `100` because the request being
 * measured is itself the first hit of the window, and `ratelimit-reset` is
 * the whole window in seconds because the store is fresh — both hold only
 * for the FIRST request against a given service instance, which is why
 * `probeResponse` below builds a new one per case.
 */
const FALLBACK_RATE_LIMIT_HEADERS: Readonly<Record<string, string>> = {
  'ratelimit-policy': '100;w=60',
  'ratelimit-limit': '100',
  'ratelimit-remaining': '99',
  'ratelimit-reset': '60',
};

/**
 * Headers on the measured response that `applyMiddleware` does NOT install:
 * Node and Express put these on a 200 JSON response themselves.
 *
 * They are named rather than filtered by prefix so that the completeness
 * case below can subtract a KNOWN set. Anything outside these three groups
 * is a header some dependency started sending, which is exactly the finding
 * that case exists to surface.
 *
 * `connection` is RUNNER-visible rather than universal: Node's HTTP server
 * emits it, bun's `node:http` shim does not, so a throwaway probe run under
 * `bun run` reports one fewer header than this suite sees. Measure this list
 * from a vitest run, never from a probe.
 */
const TRANSPORT_OWNED_HEADERS: readonly string[] = [
  'connection',
  'content-length',
  'content-type',
  'date',
  'etag',
];

describe('applyMiddleware — response headers on a built service', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  /**
   * Starts a minimal service and returns the response to a single GET of the
   * one route it registers.
   *
   * A FRESH service per call is not tidiness: `express-rate-limit` counts
   * against a per-instance memory store, so a service shared across cases
   * would answer the second case with `ratelimit-remaining: 98` and make
   * these assertions a function of test ORDER.
   *
   * @param rateLimit - Passed through as `config.rateLimit`. Omit it to get
   *   the fallback literal inside `applyMiddleware`, which is what every
   *   case here but the last one measures.
   * @returns The supertest response to `GET /probe`.
   * @throws Error When the route does not answer 200.
   */
  async function probeResponse(
    rateLimit?: { max: number; windowMs: number },
  ): Promise<Response> {
    handle = await createService({
      serviceId: 'middleware-probe',
      rateLimit,
      register(app) {
        app.get('/probe', (_req, res) => {
          res.json({ ok: true });
        });
      },
    });

    const res = await request(handle.app).get('/probe');

    // Vacuity guard. An error response carries a DIFFERENT header set —
    // Express's finalhandler overwrites the CSP and no ETag is computed —
    // so a case that quietly characterized a 404 would be pinning headers
    // this service never serves on its success path.
    if (res.status !== 200) {
      throw new Error(`probe route answered ${res.status}, so the measured headers are not the success-path set`);
    }

    return res;
  }

  it('installs helmet\'s default headers with these exact values', async () => {
    const res = await probeResponse();

    // Expected to go RED at a helmet major, and to be re-measured rather
    // than hand-edited when it does. Red here with the completeness case
    // green means helmet reworded a value; both red means it added or
    // dropped a header.
    for (const [name, value] of Object.entries(HELMET_DEFAULT_HEADERS)) {
      expect(res.headers[name], `helmet header ${name}`).toBe(value);
    }
  });

  it('installs the RateLimit headers of the fallback rate-limit config', async () => {
    const res = await probeResponse();

    // Expected to go RED at an express-rate-limit major: v8 changed both
    // the default draft and the `standardHeaders` encoding. The value half
    // (100, 99, 60) is derived from the fallback literal's own max/windowMs,
    // so it also fails if someone edits those numbers without saying so.
    for (const [name, value] of Object.entries(FALLBACK_RATE_LIMIT_HEADERS)) {
      expect(res.headers[name], `rate-limit header ${name}`).toBe(value);
    }

    // The other half of "standardHeaders: true, legacyHeaders: false".
    expect(res.headers).not.toHaveProperty('x-ratelimit-limit');
    expect(res.headers).not.toHaveProperty('x-ratelimit-remaining');
    expect(res.headers).not.toHaveProperty('x-ratelimit-reset');
  });

  it('sends nothing beyond those two sets and the transport-owned headers', async () => {
    const res = await probeResponse();

    // The completeness claim, and the only case here that can see a header
    // being ADDED — the two value cases above iterate over what they expect
    // and are blind to anything extra. The expected list is derived from the
    // same three constants rather than retyped, so there is one place to
    // reconcile per dependency.
    const expected = [
      ...Object.keys(HELMET_DEFAULT_HEADERS),
      ...Object.keys(FALLBACK_RATE_LIMIT_HEADERS),
      ...TRANSPORT_OWNED_HEADERS,
    ].sort();

    expect(Object.keys(res.headers).sort()).toEqual(expected);
  });

  it('removes the X-Powered-By header Express sets by default', async () => {
    const res = await probeResponse();

    // A MECHANISM case, not a literal one: helmet's `hidePoweredBy` unsets
    // a header rather than setting one, so the completeness case above
    // cannot see it — an absent name is absent either way. This one should
    // survive a helmet major untouched; if it does not, helmet stopped
    // doing something this service relies on it for.
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('applies the stack app-wide, so unrouted requests carry it too', async () => {
    handle = await createService({
      serviceId: 'middleware-probe',
      register() {},
    });

    const res = await request(handle.app).get('/no-such-route');
    expect(res.status).toBe(404);

    // Also a mechanism case: `applyMiddleware` mounts everything with
    // `app.use` before any route exists, so the headers are a property of
    // the app and not of a handler. Asserting NAMES and not values is
    // deliberate — on this path Express's finalhandler overwrites the CSP
    // with `default-src 'none'` and computes no ETag, both of which are
    // Express's doing rather than a middleware regression.
    const names = Object.keys(res.headers);
    for (const name of [
      ...Object.keys(HELMET_DEFAULT_HEADERS),
      ...Object.keys(FALLBACK_RATE_LIMIT_HEADERS),
    ]) {
      expect(names, `header ${name} on an unrouted request`).toContain(name);
    }
  });

  it('falls back to legacy X-RateLimit headers when a caller supplies rateLimit', async () => {
    const res = await probeResponse({ max: 7, windowMs: 1_000 });

    // The discriminating control for the RateLimit case above: it proves
    // those `ratelimit-*` names come from the FALLBACK literal and not from
    // express-rate-limit's own defaults, which is a claim no amount of
    // measuring the fallback path alone can make.
    //
    // The cause is that `ServiceConfigSchema` models `rateLimit` as `max`
    // plus `windowMs` and nothing else, so a caller-supplied block reaches
    // the limiter without the `standardHeaders`/`legacyHeaders` choice the
    // fallback literal carries, and v7's own defaults take over. Documented
    // here because it is measured behaviour, not endorsed as a design.
    expect(res.headers).not.toHaveProperty('ratelimit-limit');
    expect(res.headers['x-ratelimit-limit']).toBe('7');
    expect(res.headers['x-ratelimit-remaining']).toBe('6');
    // Value deliberately unasserted: v7 emits an absolute epoch second here.
    expect(res.headers).toHaveProperty('x-ratelimit-reset');
  });
});
