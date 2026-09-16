import { expect, test } from '@playwright/test';

import { LOGIN_PATH } from '../../src/routes/login/returnPath';

// Every other spec in this tree proves ONE seam — the wire's shapes
// (`./contract.spec.ts`), the credential round trip (`./login.spec.ts`),
// what happens to a session once it exists (`./session.spec.ts`). This
// one asks a question none of the three answers: what does a signed-in
// operator's FIRST paint look like, given that `../../src/data/http/
// api.ts`'s header states only `fetchOperator` is wired and the other
// 33 accessors reject `NOT_WIRED`?
//
// The digest surface is where the index redirect always lands
// (`../../src/routes/router.tsx`'s `INDEX_SURFACE_ID`), and its
// `findingsRead` is one of the NOT_WIRED accessors, so the app's very
// first frame after a login is already this surface's rejected-domain
// body. That body is `../../src/pages/digest/DigestPage.tsx`'s
// `DigestBody` with `failed` set — an `EmptyState` — and the claim this
// spec is built to check is that landing there is neither a blank page
// nor a thrown error: the shell around it stays up, nothing throws
// uncaught, and the one accessor that IS wired still names the operator
// in the profile menu.
//
// No shared helper module joins this tree, per `tests/README.md`, so
// `requiredEnv` below is local to this file, duplicated from its
// siblings rather than imported from them.

/** The four strings `../../src/routes/login/LoginPage.tsx` draws its form with. */
const USER_LABEL = 'User name';
const PASSWORD_LABEL = 'Password';
const SUBMIT_LABEL = 'Sign in';

/** What `../../src/app-shell/Sidebar.tsx`'s rail is named, per its siblings. */
const MAIN_NAV_NAME = 'Main navigation';

/** What `../../src/pages/digest/DigestPage.tsx`'s rejected-domain body says. */
const REJECTED_DOMAIN_TITLE = 'This domain could not be read';

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

test.describe('the shell after a login with no return path', () => {
  test('boots to the digest surface’s NOT_WIRED error state, chrome still rendered, no uncaught page error, operator named in the profile menu', async ({
    page,
  }) => {
    // Arrange — every uncaught error this page throws, from before the
    // first navigation, so a throw during the very first paint is not
    // missed by attaching the listener after the fact.
    const pageErrors: Error[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    const user = requiredEnv('AR_INTEGRATION_USER');

    // Act — a bare login, with nothing in `next`, so the round trip
    // lands wherever `safeReturnPath` sends an absent candidate: `/`,
    // which the index route immediately redirects to the digest surface.
    await page.goto(LOGIN_PATH);

    await page.getByLabel(USER_LABEL).fill(user);
    await page.getByLabel(PASSWORD_LABEL).fill(requiredEnv('AR_INTEGRATION_PASSWORD'));
    await page.getByRole('button', { name: SUBMIT_LABEL }).click();

    await expect(page).toHaveURL((url) => url.pathname === '/digest');

    // Assert — the digest surface's own rejected-domain body, in the
    // page's main region: `findingsRead` is one of the 33 NOT_WIRED
    // accessors, so `DigestBody` renders this `EmptyState` rather than
    // a table or a loading skeleton.
    const main = page.getByRole('main');

    await expect(main.getByText(REJECTED_DOMAIN_TITLE, { exact: true })).toBeVisible();

    // The chrome around that body is still up: the rail this rejected
    // read sits inside, not a blank page or a crash boundary.
    await expect(page.getByRole('navigation', { name: MAIN_NAV_NAME })).toBeVisible();

    // The one accessor `../../src/data/http/api.ts` DOES wire —
    // `fetchOperator`, reading `GET /me` — still names the operator on
    // the profile menu's trigger, derived from the session's `basic:`
    // subject the same way `./login.spec.ts`'s deep-address case checks
    // it.
    const trigger = page.getByRole('button', { name: `Account — ${user}` });

    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(page.getByText(user, { exact: true })).toBeVisible();

    // Every other read this frame fired rejected with a caught
    // `ApiError` a hook turned into `isError` state, not a thrown
    // exception — so nothing here should have reached `pageerror` at
    // all, however many of the 33 stubs the mounted shell called.
    expect(pageErrors).toEqual([]);
  });
});
