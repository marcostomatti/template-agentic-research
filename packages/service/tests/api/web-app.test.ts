/**
 * The one order `src/index.ts` argues for the `/app` mount, driven
 * over supertest against a service booted the way that module boots
 * one: `createService` with a real `auth` block, `mountWebApp` over a
 * temp build directory, and one guarded router at `/` —
 * {@link buildMeRouter}, which is also the first guarded fall-through
 * mount in `src/index.ts` and lets the same boot answer `GET /me`'s
 * own case.
 *
 * WHAT THIS FILE COVERS THAT ITS SIBLINGS DO NOT is the ORDER between
 * the two. `src/web/static.ts`'s own `static.test.ts` mounts
 * `mountWebApp` over a bare app with no guard at all, and
 * `src/me/routes.ts`'s own `routes.test.ts` mounts
 * {@link buildMeRouter} behind a guard with no `/app` mount beside it.
 * Neither can ask whether an anonymous browser can still load the
 * shell once a guarded router sits below it, or whether a request the
 * mount lets go — a non-`GET`/`HEAD` method, or a path outside the
 * prefix — lands on that guard rather than on nothing. That claim is
 * `docs/architecture/08-http-api.md`'s "The web app answers under
 * `/app`, because its paths collide here", and this file is the
 * reading behind it.
 *
 * THE SHAPE IS RE-ASSEMBLED HERE RATHER THAN IMPORTED, for the same
 * reason `tests/api/wiring.test.ts` gives for its own subject:
 * `src/index.ts` resolves `src/config.ts` at import time and ends in
 * a top-level `createService` call, so importing it boots a service
 * against a real database. {@link bootWiredService} below spells only
 * the two lines this file is about, in the same relative order
 * `src/index.ts` mounts them — `mountWebApp` first, `ctx.requireAuth`
 * plus {@link buildMeRouter} second — and leaves out the mounts
 * between them (`/auth`, `GET /users`) that carry no guard and would
 * answer nothing to any case below. A divergence introduced in
 * `src/index.ts` itself is invisible here; what reaches that module is
 * `lint`, `check-types` and booting it by hand.
 *
 * THE VERIFIER IS SCRIPTED rather than real, exactly as
 * `tests/api/wiring.test.ts` scripts its own: what a token means, how
 * it is minted and when it expires are `src/auth/`'s subject and are
 * driven end to end by `tests/auth/wiring.test.ts`. What this file
 * needs from auth is a credential {@link MINTED_TOKEN} that verifies
 * to {@link MINTED_SUB} and every other credential refused, so the
 * block below scripts exactly that.
 *
 * THE REFUSALS COME FIRST, and each is the claim that the guard below
 * the mount is reachable and answers before any shell would. An
 * anonymous `GET /settings` never reaches {@link buildMeRouter}'s own
 * route at all — it is refused by `ctx.requireAuth` on that mount,
 * which runs for every request reaching it and not only for the ones
 * its router matches, the same fact `tests/api/wiring.test.ts` reads
 * fifteen times over. A missing `/app/assets/x.js` is refused by the
 * mount itself, asset-shaped and therefore never the fallback. A
 * `POST /app/x` passes on every method but `GET` and `HEAD`, so it
 * leaves the mount and meets the same guard `/settings` does. And an
 * anonymous `GET /me` is refused by the guard its own route sits
 * behind.
 *
 * THEN THE POSITIVE CASES, each one's control living in the refusals
 * beside it. An anonymous `GET /app/` and `GET /app/settings` answer
 * the shell because the mount sits ABOVE the guard — the same pair
 * `GET /settings` and `GET /me` show refused a moment earlier, which
 * is what says the split is about the mount and not about being
 * anonymous. The scoped `Content-Security-Policy` is read present on
 * an `/app` response and absent on `/health`, the framework's own
 * open route, which is what separates a policy scoped to the mount
 * from one applied app-wide. And `GET /me` with {@link MINTED_TOKEN}
 * answers the verified `sub`, which is `routes.test.ts`'s own claim
 * read once more with a real mount above it rather than none.
 */
import type { ServiceHandle } from '../../lib/express/index.js';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createService } from '../../lib/express/index.js';
import { buildMeRouter } from '../../src/me/routes.js';
import { mountWebApp } from '../../src/web/static.js';

// Tests run in test mode — no process.exit on a failed dependency, and
// an ephemeral port. Read at boot time, so it is set before the first
// `createService` call rather than inside one.
process.env.NODE_ENV = 'test';

/** The shell's body, unique enough to find in any response. */
const INDEX_MARKER = '<title>ar-web-app-wiring-index</title>';

/**
 * The bearer credential the scripted verifier admits.
 *
 * A literal rather than a real login, per the header above: what
 * separates a guarded route from a reachable one here is this one
 * value, not how it came to exist.
 */
const MINTED_TOKEN = 'web-app-wiring-minted-token';

/** The subject the scripted verifier answers with for {@link MINTED_TOKEN}. */
const MINTED_SUB = 'web-app-wiring-operator';

/**
 * The refusal `buildRequireAuthFrom` in `lib/express/auth.ts` writes.
 *
 * Asserted whole rather than by status, because a route answering a
 * `401` of its own would satisfy the status alone and this file is
 * about which layer refused.
 */
const UNAUTHORIZED_BODY = { error: 'Unauthorized' };

/** The refusal `mountWebApp` writes for an asset-shaped miss. */
const NOT_FOUND_BODY = { code: 'NOT_FOUND', message: 'Not found' };

let distDir = '';
let handle: ServiceHandle;

/**
 * Boots a service assembled the way `src/index.ts` assembles the
 * `/app` mount and the first guarded mount below it.
 *
 * @param dir - The temp build directory to serve at `/app`.
 * @returns The running handle, for supertest and for `stop()`.
 */
async function bootWiredService(dir: string): Promise<ServiceHandle> {
  return createService({
    serviceId: 'web-app-wiring-probe',
    auth: {
      verifier: {
        verify: async (token: string) => (token === MINTED_TOKEN
          ? { sub: MINTED_SUB }
          : null),
      },
    },
    register(app, ctx) {
      // ABOVE the guarded block, exactly where `src/index.ts` mounts
      // it — first in `register`, so an anonymous browser can load
      // the shell before it has any credential to guard with.
      mountWebApp(app, { dir });

      // The first guarded fall-through mount in `src/index.ts`, at
      // `/` behind `ctx.requireAuth`. Every mount below it in that
      // file sits at `/` too, so this one alone is enough to refuse
      // any anonymous request the `/app` mount does not answer
      // itself.
      app.use(ctx.requireAuth, buildMeRouter());
    },
  });
}

beforeAll(async () => {
  distDir = mkdtempSync(join(tmpdir(), 'ar-web-app-wiring-'));
  writeFileSync(
    join(distDir, 'index.html'),
    `<!doctype html><html><head>${INDEX_MARKER}</head></html>`,
  );
  handle = await bootWiredService(distDir);
});

afterAll(async () => {
  await handle.stop();
  rmSync(distDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('the /app mount above a guarded router: refusals', () => {
  it('refuses an anonymous GET /settings with 401, never the shell', async () => {
    const res = await request(handle.app).get('/settings');

    expect(res.status).toBe(401);
    expect(res.body).toStrictEqual(UNAUTHORIZED_BODY);
    expect(res.text).not.toContain(INDEX_MARKER);
  });

  it('answers 404 JSON for a missing asset-shaped path, never HTML', async () => {
    const res = await request(handle.app).get('/app/assets/x.js');

    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expect(res.body).toStrictEqual(NOT_FOUND_BODY);
    expect(res.text).not.toContain(INDEX_MARKER);
  });

  it('gives POST /app/x no fallback, refusing it behind the guard', async () => {
    const res = await request(handle.app).post('/app/x');

    expect(res.status).toBe(401);
    expect(res.body).toStrictEqual(UNAUTHORIZED_BODY);
    expect(res.text).not.toContain(INDEX_MARKER);
  });

  it('refuses an anonymous GET /me with 401', async () => {
    const res = await request(handle.app).get('/me');

    expect(res.status).toBe(401);
    expect(res.body).toStrictEqual(UNAUTHORIZED_BODY);
  });
});

// ---------------------------------------------------------------------------

describe('the /app mount above a guarded router: positive cases', () => {
  it('answers the shell for an anonymous GET /app/ and GET /app/settings', async () => {
    for (const path of ['/app/', '/app/settings']) {
      const res = await request(handle.app).get(path);

      expect(res.status, path).toBe(200);
      expect(res.type, path).toBe('text/html');
      expect(res.text, path).toContain(INDEX_MARKER);
    }
  });

  it('carries the scoped CSP on /app and not on /health', async () => {
    // `createService` mounts helmet's own default policy app-wide, so
    // `/health` carries A `Content-Security-Policy` too — what
    // separates the two is which ONE. The mount's own `style-src`
    // drops helmet's default `https:` source; asserting that
    // narrowing present on `/app` and absent on `/health` is what
    // says the override is scoped to the mount rather than applied
    // everywhere.
    const app = await request(handle.app).get('/app/');
    const appPolicy: unknown = app.headers['content-security-policy'];

    expect(typeof appPolicy).toBe('string');
    expect(String(appPolicy)).toContain('style-src \'self\' \'unsafe-inline\';');

    const health = await request(handle.app).get('/health');
    const healthPolicy: unknown = health.headers['content-security-policy'];

    expect(health.status).toBe(200);
    expect(typeof healthPolicy).toBe('string');
    expect(String(healthPolicy))
      .not.toContain('style-src \'self\' \'unsafe-inline\';');
    expect(String(healthPolicy))
      .toContain('style-src \'self\' https: \'unsafe-inline\';');
  });

  it('answers the verified sub for GET /me with a minted token', async () => {
    const res = await request(handle.app)
      .get('/me')
      .set('Authorization', `Bearer ${MINTED_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({ ok: true, sub: MINTED_SUB });
  });
});
