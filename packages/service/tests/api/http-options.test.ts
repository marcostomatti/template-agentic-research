/**
 * `serviceHttpOptions` read back off a booted service, over the same
 * `cors` and `express-rate-limit` stack `applyMiddleware` installs on
 * every deployment.
 *
 * `service-options.test.ts` covers the function in isolation: which
 * environment values it refuses, and which `cors`/`rateLimit` members it
 * hands `createService` for a given input. What that file cannot read is
 * what those two middleware then DO with the members — whether an origin
 * outside the list is actually refused, whether `Authorization` actually
 * rides an allowed preflight, and which header name a caller-supplied
 * limit actually answers under. That needs a real `createService` call
 * and a real request, which is this file's subject.
 *
 * The limit reading matters because `applyMiddleware`'s own
 * `middleware.test.ts` already measured a split: the FALLBACK literal
 * (`{ max: 100, windowMs: 60_000, standardHeaders: 'draft-6',
 * legacyHeaders: false }`, installed when `config.rateLimit` is omitted)
 * answers the draft-6 `RateLimit-*` names, while a CALLER-SUPPLIED
 * `rateLimit` block — which is exactly the shape `serviceHttpOptions`
 * hands `createService` for `AR_RATE_LIMIT_MAX` — carries only `max` and
 * `windowMs`, so `express-rate-limit`'s own defaults answer instead:
 * legacy `X-RateLimit-*`. Both cases below are read off that same
 * documented split rather than assumed, so a value on the wrong name
 * would fail loudly instead of the assertion quietly reading `undefined`.
 */
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createService } from '../../lib/express/index.js';
import { serviceHttpOptions } from '../../src/http/service-options.js';

// Tests run in test mode — no process.exit on a failed dependency, and an
// ephemeral port. Read at boot time, so it is set before the first
// `createService` call rather than inside one.
process.env.NODE_ENV = 'test';

/** An origin never listed by any case below. */
const OUTSIDE_ORIGIN = 'https://outside.test';

/** The one origin the listed-origin cases configure `cors` with. */
const ALLOWED_ORIGIN = 'https://allowed.test';

/** The framework's own open route, cheap and outside any table. */
const HEALTH_PATH = '/health';

let handle: Awaited<ReturnType<typeof createService>> | undefined;

afterEach(async () => {
  if (handle) {
    await handle.stop();
    handle = undefined;
  }
});

/**
 * Boots a service over the `cors`/`rateLimit` members `serviceHttpOptions`
 * builds for the given parsed entries, registering nothing beyond the
 * framework's own `/health` route.
 *
 * @param env - The parsed entries to translate; see `ServiceHttpEnv`.
 * @returns The booted app, ready for `supertest`.
 */
async function bootWithHttpOptions(
  env: Parameters<typeof serviceHttpOptions>[0],
): Promise<Awaited<ReturnType<typeof createService>>['app']> {
  handle = await createService({
    serviceId: 'http-options-probe',
    register() {},
    ...serviceHttpOptions(env),
  });

  return handle.app;
}

describe('serviceHttpOptions — nothing set', () => {
  it('lets no cross-origin caller read a response, and limits at 100', async () => {
    const app = await bootWithHttpOptions({});

    const res = await request(app)
      .get(HEALTH_PATH)
      .set('Origin', OUTSIDE_ORIGIN);

    expect(res.headers).not.toHaveProperty('access-control-allow-origin');
    // The fallback literal `applyMiddleware` installs when `rateLimit` is
    // omitted, at `standardHeaders: 'draft-6'` — see this file's header.
    expect(res.headers['ratelimit-limit']).toBe('100');
  });
});

describe('serviceHttpOptions — an origin list set', () => {
  it('answers no allow-origin to a preflight from an origin outside it', async () => {
    const app = await bootWithHttpOptions({
      AR_CORS_ORIGINS: [ALLOWED_ORIGIN],
    });

    const res = await request(app)
      .options(HEALTH_PATH)
      .set('Origin', OUTSIDE_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('allows a preflight from a listed origin, with Authorization among the allowed headers', async () => {
    const app = await bootWithHttpOptions({
      AR_CORS_ORIGINS: [ALLOWED_ORIGIN],
    });

    const res = await request(app)
      .options(HEALTH_PATH)
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization');

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
  });
});

describe('serviceHttpOptions — AR_RATE_LIMIT_MAX set', () => {
  it('reads the configured max back on the limiter headers', async () => {
    const app = await bootWithHttpOptions({ AR_RATE_LIMIT_MAX: 1000 });

    const res = await request(app).get(HEALTH_PATH);

    // A caller-supplied `rateLimit` reaches the limiter carrying only
    // `max` and `windowMs` — `ServiceConfigSchema` strips the rest — so
    // `express-rate-limit`'s own defaults answer instead of the fallback
    // literal's draft-6 choice: legacy `X-RateLimit-*`, not `RateLimit-*`.
    // See this file's header and `lib/express/__tests__/middleware.test.ts`.
    expect(res.headers).not.toHaveProperty('ratelimit-limit');
    expect(res.headers['x-ratelimit-limit']).toBe('1000');
  });
});
