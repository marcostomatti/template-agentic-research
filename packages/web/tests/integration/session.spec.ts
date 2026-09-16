import type { Session } from '../../src/auth/session';
import type { Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { SESSION_STORAGE_KEY } from '../../src/auth/session';
import { LOGIN_PATH, RETURN_PARAM } from '../../src/routes/login/returnPath';
import { domainBase, withBase } from '../../src/routes/paths';

// Three ways this tab's session goes away without the operator ever
// seeing a refusal sentence: a value that was already stale before the
// app ever read it, a token the service stopped honouring behind this
// tab's back, and a token this tab itself asked to drop. `./login.spec.ts`
// covers the credential round trip; this file covers what happens to a
// session ONCE one exists, which is why every test here starts from a
// session already in place rather than from a submitted form — two of
// the three plant one with `addInitScript` and the third drives a real
// login, exactly as much of it as each claim needs and no more.
//
// No shared helper module joins this tree, per `tests/README.md`, so
// everything below is local to this file, duplicated from its siblings
// where the same shape is needed rather than imported from them.

/** A slug the seeded database carries, per `./login.spec.ts`'s header. */
const SEEDED_DOMAIN_SLUG = 'example-tech-radar';

/** The four strings `../../src/routes/login/LoginPage.tsx` draws its form with. */
const USER_LABEL = 'User name';
const PASSWORD_LABEL = 'Password';
const SUBMIT_LABEL = 'Sign in';

/** The service's own host and port, duplicated per `./contract.spec.ts`'s reason. */
const HOST = '127.0.0.1';
const API_PORT = process.env['AR_API_PORT'] ?? '3100';
const API_URL = `http://${HOST}:${API_PORT}`;

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
 * Assert the page has landed on `/login` carrying `expectedNext` as its
 * `next` parameter — the one redirect shape every test in this file
 * checks the gate against, whatever put the tab there.
 */
async function expectLoginRedirect(page: Page, expectedNext: string): Promise<void> {
  await expect(page).toHaveURL((url) => {
    const params = new URLSearchParams(url.search);

    return url.pathname === LOGIN_PATH && params.get(RETURN_PARAM) === expectedNext;
  });
}

/**
 * Drive a real credential through the login form from a deep,
 * domain-scoped address, and wait for the round trip to land back on it.
 *
 * @param page - The page to drive.
 * @param deepPath - The address to start from and to land back on.
 */
async function loginToDeepPath(page: Page, deepPath: string): Promise<void> {
  await page.goto(deepPath);
  await expectLoginRedirect(page, deepPath);

  await page.getByLabel(USER_LABEL).fill(requiredEnv('AR_INTEGRATION_USER'));
  await page.getByLabel(PASSWORD_LABEL).fill(requiredEnv('AR_INTEGRATION_PASSWORD'));
  await page.getByRole('button', { name: SUBMIT_LABEL }).click();

  await expect(page).toHaveURL((url) => url.pathname === deepPath);
}

test.describe('a session planted with a past expiresAt', () => {
  test('redirects to /login carrying the return path, with no request carrying its token', async ({
    page,
  }) => {
    // Arrange — a well-formed session whose `expiresAt` is already
    // behind `now`. `../../src/auth/session.ts`'s own store drops such
    // a value on the very first `get()`, before any request is ever
    // built from it, which is the property this test asserts.
    const deepPath = withBase(domainBase(SEEDED_DOMAIN_SLUG), 'sources');
    const expiredSession: Session = {
      token: 'expired-session-token-value',
      sub: 'basic:expired-fixture',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    };

    const authorizedRequestUrls: string[] = [];

    page.on('request', (request) => {
      if (request.headers().authorization !== undefined) {
        authorizedRequestUrls.push(request.url());
      }
    });

    // Planted before the first navigation, so the app boots reading it
    // from `sessionStorage` exactly as a reloaded tab would.
    await page.addInitScript(
      ({ key, session }) => {
        window.sessionStorage.setItem(key, JSON.stringify(session));
      },
      { key: SESSION_STORAGE_KEY, session: expiredSession },
    );

    // Act
    await page.goto(deepPath);

    // Assert — the gate reads no live session (the store already
    // dropped it), the deployment's own probe answers anonymously and
    // refuses, and the redirect carries the address that was refused.
    await expectLoginRedirect(page, deepPath);

    // Nothing this page did — including the probe's own `GET /me` —
    // carried the expired token, because the store never handed it out.
    expect(authorizedRequestUrls).toEqual([]);
  });
});

test.describe('a token revoked at the service', () => {
  test('turns the following read’s 401 into the same redirect', async ({ page, request }) => {
    // Arrange — a real, live session, reached the same way
    // `./login.spec.ts`'s deep-address case reaches one.
    const deepPath = withBase(domainBase(SEEDED_DOMAIN_SLUG), 'sources');

    await loginToDeepPath(page, deepPath);

    const raw = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      SESSION_STORAGE_KEY,
    );

    expect(raw).not.toBeNull();

    const { token } = JSON.parse(raw as string) as Session;

    // Act — the token is revoked out of band, through the `request`
    // fixture alone: nothing in this tab's `sessionStorage` or in-memory
    // store is touched by this call, so the tab still believes it holds
    // a live session until it next asks the service.
    const revokeResponse = await request.post(`${API_URL}/auth/logout`, {
      data: { token },
    });

    expect(revokeResponse.ok()).toBe(true);

    // A reload is "the following read": it re-executes every module
    // from scratch, so the gate's memoised probe answer and its session
    // store both start empty again, and the fresh `GET /me` the gate
    // fires on mount carries the now-revoked token. `../../src/data/
    // http/client.ts` clears the session on that `401` before the
    // promise rejects, so the gate's own subscription and its probe
    // state settle on the same redirect the first visit to `deepPath`
    // would have gotten with no session at all.
    await page.reload();

    // Assert
    await expectLoginRedirect(page, deepPath);
  });
});

test.describe('logout from the profile menu', () => {
  test('posts /auth/logout, removes the storage key, and a browser back navigation does not render the shell', async ({
    page,
  }) => {
    // Arrange
    const deepPath = withBase(domainBase(SEEDED_DOMAIN_SLUG), 'sources');
    const user = requiredEnv('AR_INTEGRATION_USER');

    await loginToDeepPath(page, deepPath);

    const profileTrigger = page.getByRole('button', { name: `Account — ${user}` });

    await profileTrigger.click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    // Act — confirming is what fires the request and the sign-out
    // together, so both are awaited from the one click that starts them.
    const [logoutRequest] = await Promise.all([
      page.waitForRequest(
        (req) => req.method() === 'POST' && req.url().endsWith('/auth/logout'),
      ),
      page.getByRole('menuitem', { name: 'Yes, log out' }).click(),
    ]);

    // Assert — the request, the storage, and the landing address.
    expect(logoutRequest.method()).toBe('POST');

    await expect(page).toHaveURL((url) => url.pathname === LOGIN_PATH && url.search === '');

    const stored = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      SESSION_STORAGE_KEY,
    );

    expect(stored).toBeNull();

    // A Back lands the browser on `deepPath` again, the same address
    // the earlier sign-in used — but with no session left to render it
    // for, so the gate answers the same redirect a first, unauthenticated
    // visit to that address would have gotten, and no shell control
    // that redirect ever paints.
    await page.goBack();

    await expectLoginRedirect(page, deepPath);
    await expect(page.getByRole('button', { name: `Account — ${user}` })).toHaveCount(0);
  });
});
