import type { APIRequestContext } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { decodeFailure, decodePage, UNAUTHORIZED } from '../../src/data/http/envelope';

// This spec reads the WIRE, not the app. Every other spec in this tree
// drives the assembled app through `page`, but a contract lives on the
// service's own responses — the envelope shapes `envelope.ts` decodes —
// and asserting those through a rendered surface would test whatever
// the app does with a shape rather than the shape itself. Playwright's
// `request` fixture is the one client here that never loads a page.
//
// `envelope.ts` decodes what it was built to decode and nothing more:
// `decodeFailure` normalises ANY refused response, bare `{ error }` or
// framework `{ code, message }` alike, but `decodeData`/`decodePage`
// unwrap only the `{ success: true, data }` envelope the service's
// RESOURCE routes answer. `GET /me` and `POST /auth/login` are not
// resource routes — `src/data/http/auth.ts`'s own header names them as
// the three calls that answer BARE bodies, and its `liftingBareBodies`
// wrapper is what makes them look enveloped before this app's client
// ever calls `decodeData` on one. This spec talks to the service
// directly, with no such lifter in front of it, so a bare success body
// is read as the bare JSON it is; only the two shapes `envelope.ts`
// actually decodes — a failure, and the paginated list — are run
// through it.
//
// No shared helper module joins this tree, per `tests/README.md`, so
// `login` below is local to this file rather than lifted beside it.
//
// The service and its credential pair are `tests/integration/
// global-setup.ts`'s precondition, checked once before any spec here
// runs, so a missing `AR_INTEGRATION_USER`/`AR_INTEGRATION_PASSWORD`
// never reaches a test as an undefined string.

/**
 * The service's own host and port, duplicated rather than imported.
 *
 * `playwright.integration.config.ts` resolves the same two values, and
 * a spec importing it would be the one import this tree refuses:
 * `tests/README.md` holds every spec to `src/`, `@playwright/test` and
 * nothing else, so that config is out of reach here exactly as it is
 * from every sibling spec. The default matches the config's and the
 * run-book's so the three cannot silently name three different ports.
 */
const HOST = '127.0.0.1';
const API_PORT = process.env['AR_API_PORT'] ?? '3100';
const API_URL = `http://${HOST}:${API_PORT}`;

/** A slug shaped like a real one that the seeded database never wrote. */
const UNKNOWN_DOMAIN_SLUG = 'no-domain-carries-this-slug';

/** The namespace `bootstrapAuthUser` (`@ar/service`) gives every subject. */
const BASIC_SUBJECT_PREFIX = 'basic:';

/**
 * Read a credential variable the global setup already proved present.
 *
 * @param name - `AR_INTEGRATION_USER` or `AR_INTEGRATION_PASSWORD`.
 * @returns The value, narrowed away from `string | undefined`.
 * @throws Error if the variable is missing — which would mean this
 * spec ran without its global setup, not that the credential is wrong.
 */
function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `${name} is unset. tests/integration/global-setup.ts should have `
        + 'refused the run before this spec started.',
    );
  }

  return value;
}

/**
 * Exchange the integration credential for a bearer token.
 *
 * Reads `POST /auth/login`'s bare `{ token, sub, expiresAt }` body
 * directly: it is one of the three calls `src/data/http/auth.ts`
 * documents as answering un-enveloped, so there is nothing here for
 * `envelope.ts` to decode.
 *
 * @param request - The suite's `request` fixture.
 * @returns The token to send as `Authorization: Bearer <token>`.
 */
async function login(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: {
      user: requiredEnv('AR_INTEGRATION_USER'),
      password: requiredEnv('AR_INTEGRATION_PASSWORD'),
    },
  });
  const body = await response.json() as { readonly token: string };

  return body.token;
}

test.describe('refusals', () => {
  test('an anonymous GET /me answers 401 with the bare { error } shape decoded to UNAUTHORIZED', async ({
    request,
  }) => {
    // Arrange / Act — no Authorization header at all.
    const response = await request.get(`${API_URL}/me`);
    const text = await response.text();

    // Assert
    expect(response.status()).toBe(401);

    const error = decodeFailure(response.status(), text);

    expect(error.code).toBe(UNAUTHORIZED);
  });

  test('a credentialled GET /domains/<unknown slug> answers the framework { code, message } 404', async ({
    request,
  }) => {
    // Arrange
    const token = await login(request);

    // Act
    const response = await request.get(
      `${API_URL}/domains/${UNKNOWN_DOMAIN_SLUG}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const text = await response.text();

    // Assert
    expect(response.status()).toBe(404);

    const error = decodeFailure(response.status(), text);

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message.length).toBeGreaterThan(0);
  });
});

test.describe('success', () => {
  test('a credentialled GET /me answers { ok: true, sub } with a basic: subject', async ({
    request,
  }) => {
    // Arrange
    const token = await login(request);

    // Act — `/me`'s success body is bare, not the { success, data }
    // envelope, so it is read as the JSON it is rather than through
    // `decodeData`, which would refuse it as `BAD_ENVELOPE`.
    const response = await request.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json() as { readonly ok: boolean; readonly sub: string | null };

    // Assert
    expect(response.status()).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.sub).not.toBeNull();
    expect(body.sub?.startsWith(BASIC_SUBJECT_PREFIX)).toBe(true);
  });

  test('GET /domains decodes to rows with a { page, perPage, total, totalPages } meta', async ({
    request,
  }) => {
    // Arrange
    const token = await login(request);

    // Act
    const response = await request.get(`${API_URL}/domains`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await response.text();

    // Assert
    expect(response.status()).toBe(200);

    const page = decodePage<{ readonly slug: string }>(response.status(), text);

    expect(page.meta.page).toBe(1);
    expect(page.meta.perPage).toBeGreaterThan(0);
    expect(page.meta.total).toBeGreaterThanOrEqual(1);
    expect(page.meta.totalPages).toBeGreaterThanOrEqual(1);
    expect(page.rows.length).toBeGreaterThanOrEqual(1);
  });
});
