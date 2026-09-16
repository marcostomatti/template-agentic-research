import { expect, test } from '@playwright/test';

import { SESSION_STORAGE_KEY } from '../../src/auth/session';
import { REFUSED_SENTENCE } from '../../src/routes/login/loginForm';
import { LOGIN_PATH, RETURN_PARAM } from '../../src/routes/login/returnPath';
import { domainBase, withBase } from '../../src/routes/paths';

// This spec drives the ASSEMBLED APP through a real browser, unlike
// `./contract.spec.ts`, which talks to the wire directly. The two are
// deliberately split: what a login round trip does to the DOM, to
// `sessionStorage` and to the requests a page makes is a claim about
// `./LoginPage.tsx`, `./AuthGate.tsx` and `../../src/auth/session.ts`
// working together, and none of the three is reachable by posting to
// `/auth/login` with `request` alone.
//
// Every EXPORTED string this spec asserts against — the refusal
// sentence, the login path, its `next` parameter name — is imported
// from the module that owns it rather than retyped, for
// `./contract.spec.ts`'s own reason: a retyped string drifts silently
// the day the source changes it, while an import fails the build
// instead. `./LoginPage.tsx`'s own label and heading strings are
// module-private consts with no second caller to export them for, so
// those four are duplicated below instead — see the comment beside
// them.
//
// No shared helper module joins this tree, per `tests/README.md`, so
// `requiredEnv` below is local to this file rather than lifted beside
// `./contract.spec.ts`'s copy.

/**
 * The domain slug `data/domains.json` seeds (`@ar/service`) and the
 * integration run-book's `db:seed` step writes into `ar_live`. Not a
 * literal owned by this app — `../../src/routes/router.tsx`'s own
 * header cites the same slug as its worked example — so a deep address
 * built from it is one this deployment actually answers.
 */
const SEEDED_DOMAIN_SLUG = 'example-tech-radar';

/**
 * The four strings `./LoginPage.tsx` draws its form with.
 *
 * That module keeps them module-private consts rather than exports —
 * there is no second caller inside the app to share them with — so
 * they are duplicated here rather than imported, exactly as
 * `./contract.spec.ts` duplicates the host and port its own config
 * resolves privately. A rename on either side is a red run rather
 * than a silent drift: this spec would stop finding the label or the
 * button `./LoginPage.tsx` no longer renders under this name.
 */
const USER_LABEL = 'User name';
const PASSWORD_LABEL = 'Password';
const SUBMIT_LABEL = 'Sign in';
const REFUSED_REGION_LABEL = 'Why this sign-in did not happen';

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

test.describe('a wrong password', () => {
  test('renders the refusal sentence, leaves no session stored, and sends no Authorization header on any later request', async ({
    page,
  }) => {
    // Arrange — every request this page makes is watched from before
    // the first navigation, so "any later request" covers the probe
    // `AuthGate` fires on mount and not merely the login POST.
    const authorizedRequestUrls: string[] = [];

    page.on('request', (request) => {
      if (request.headers().authorization !== undefined) {
        authorizedRequestUrls.push(request.url());
      }
    });

    await page.goto(LOGIN_PATH);

    // Act — the user name is the real one; only the password is wrong,
    // which is what keeps this a credential refusal rather than the
    // local "type something" guard `readCredential` answers first.
    await page.getByLabel(USER_LABEL).fill(requiredEnv('AR_INTEGRATION_USER'));
    await page.getByLabel(PASSWORD_LABEL).fill(
      `${requiredEnv('AR_INTEGRATION_PASSWORD')}-wrong`,
    );
    await page.getByRole('button', { name: SUBMIT_LABEL }).click();

    // Assert — the one sentence a refused credential says, in the
    // named region `./LoginPage.tsx` renders from mount.
    const refusedRegion = page.getByRole('status', { name: REFUSED_REGION_LABEL });

    await expect(refusedRegion).toContainText(REFUSED_SENTENCE);

    // No session was ever minted, so the one storage key it would have
    // been mirrored under stays absent.
    const stored = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      SESSION_STORAGE_KEY,
    );

    expect(stored).toBeNull();

    // Nothing this page did, before or after the refusal, carried a
    // bearer — there was never a token to send.
    expect(authorizedRequestUrls).toEqual([]);
  });
});

test.describe('a correct login from a deep domain-scoped address', () => {
  test('lands back on that address with the operator named in the profile menu', async ({
    page,
  }) => {
    // Arrange — a sub-route two levels below a domain base: exactly the
    // shape `./returnPath.ts`'s guard is built to carry through, not
    // merely a bare surface.
    const deepPath = withBase(domainBase(SEEDED_DOMAIN_SLUG), 'sources');

    // Act — an unauthenticated visit to the deep address; `AuthGate`
    // redirects it to the login form carrying that address as `next`.
    await page.goto(deepPath);

    await expect(page).toHaveURL((url) => {
      const params = new URLSearchParams(url.search);

      return url.pathname === LOGIN_PATH && params.get(RETURN_PARAM) === deepPath;
    });

    const user = requiredEnv('AR_INTEGRATION_USER');

    await page.getByLabel(USER_LABEL).fill(user);
    await page.getByLabel(PASSWORD_LABEL).fill(requiredEnv('AR_INTEGRATION_PASSWORD'));
    await page.getByRole('button', { name: SUBMIT_LABEL }).click();

    // Assert — the round trip lands exactly where it started, per the
    // property `./returnPath.ts`'s header names as the whole point of
    // the write side and the read side being one module.
    await expect(page).toHaveURL((url) => url.pathname === deepPath);

    // The operator this service names via `/me`'s `sub` — `basic:<user
    // name>`, per `@ar/service`'s bootstrap — reaches the profile
    // menu's trigger AND its opened header, so both are checked.
    const trigger = page.getByRole('button', { name: `Account — ${user}` });

    await trigger.click();

    await expect(page.getByText(user, { exact: true })).toBeVisible();
  });
});
