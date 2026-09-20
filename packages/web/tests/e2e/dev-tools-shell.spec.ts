import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

// This is the one spec `chromium-devtools` runs — see the `testMatch` /
// `testIgnore` pair in `../../playwright.config.ts` — and the only one
// that can: `@ar/dev-tools` refuses to mount under automation unless
// `VITE_DEVTOOLS_FORCE=1`, which only that project's own 5177 server
// sets. Run under the default `chromium` project this file's every
// locator would time out against a page carrying no widget at all,
// which is exactly what `unknown-route.spec.ts`'s absence case (the
// control for that guard) asserts.
//
// The page under every case here is `./fixtures/dev-tools-harness.html`,
// NOT `/`. The real app (`src/dev/devtools.ts`) mounts ONE feature, the
// package's feedback one, which contributes a single `end`-placed drawer
// carrying a handle — so it draws no modal, no `start`-placed drawer and
// no handle-less one, and three of this spec's four surfaces have
// nothing on the app's own menu to drive. The fixture configures all of
// them itself. Its own header explains why it exists, what it
// configures and why nothing here needs a `version` to read a real
// commit; it is requested only by this file's `page.goto` calls and by
// nothing the app or its production build reaches.
//
// `devtools.settings` below is `@ar/dev-tools/src/core/settings.ts`'s
// `DEVTOOLS_SETTINGS_KEY`, spelled out rather than imported: the
// package's public entry (`@ar/dev-tools`'s `index.ts`) exports the
// mount function, the bus and the feature-contract types alone, and the
// storage key is deliberately not among them.

/** Where the fixture page is served, relative to this project's `baseURL`. */
const HARNESS_PATH = '/tests/e2e/fixtures/dev-tools-harness.html';

/** The trigger's accessible name — `./fixtures/dev-tools-harness.tsx` names no other. */
const TRIGGER_NAME = 'Dev tools';

/** The root menu panel's accessible name. */
const MENU_NAME = 'Dev tools menu';

/** The harness's one feature, drawn as its own submenu at three items. */
const HARNESS_SUBMENU_NAME = 'Harness';

/** The modal item's label, and the `<dialog>`'s accessible name once open. */
const SESSION_LABEL = 'Session';

/** The handle-bearing drawer's label. */
const PRIMARY_DRAWER_LABEL = 'Primary drawer';

/** The second, handle-less drawer's label. */
const SECONDARY_DRAWER_LABEL = 'Secondary drawer';

/** The plain page control the drawer cases prove is still reachable. */
const APP_BUTTON_ID = 'app-button';

/** Where `#app-button`'s click count is written, for the drawer case to read. */
const APP_BUTTON_COUNT_ID = 'app-button-count';

/** `@ar/dev-tools/src/core/settings.ts`'s `DEVTOOLS_SETTINGS_KEY`. */
const SETTINGS_STORAGE_KEY = 'devtools.settings';

/** A size `./fixtures/dev-tools-harness.tsx` never sets on its own. */
const SEEDED_SIZE = 'lg';

/** The four corners, in the order `Position`'s submenu draws them. */
const CORNERS: readonly { readonly label: string; readonly value: string }[] = [
  { label: 'Top left', value: 'top-left' },
  { label: 'Top right', value: 'top-right' },
  { label: 'Bottom right', value: 'bottom-right' },
  { label: 'Bottom left', value: 'bottom-left' },
];

/**
 * The trigger, addressed by its one accessible name.
 *
 * @param page - The page under test.
 * @returns The trigger button.
 */
function triggerOf(page: Page): Locator {
  return page.getByRole('button', { name: TRIGGER_NAME });
}

/**
 * Open the root menu from the trigger, and wait for it to be up.
 *
 * @param page - The page under test.
 */
async function openMenu(page: Page): Promise<void> {
  await triggerOf(page).click();
  await expect(page.getByRole('menu', { name: MENU_NAME })).toBeVisible();
}

/**
 * Open the root menu and the Position submenu underneath it.
 *
 * Choosing a corner does not close the menu — see `../../src/core/
 * Menu.tsx`'s header — so a case may open this once and choose several
 * corners in a row.
 *
 * @param page - The page under test.
 */
async function openPositionSubmenu(page: Page): Promise<void> {
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Position' }).click();
}

/**
 * Open the root menu, the harness's own submenu, and choose one item.
 *
 * Every drawing item dismisses the whole menu once chosen, so a case
 * that opens a second item calls this again from a fresh menu rather
 * than reusing one still on the screen.
 *
 * @param page - The page under test.
 * @param itemLabel - The chosen item's own label — `Session`, `Primary
 * drawer` or `Secondary drawer`.
 */
async function openHarnessItem(page: Page, itemLabel: string): Promise<void> {
  await openMenu(page);
  await page.getByRole('menuitem', { name: HARNESS_SUBMENU_NAME }).click();
  await page.getByRole('menuitem', { name: itemLabel }).click();
}

/**
 * `openHarnessItem`, reopening the trigger by keyboard rather than by
 * a pointer click.
 *
 * `.devtools-drawer` and `.devtools-trigger` share one z-index in
 * `packages/dev-tools/src/styles.css` (`var(--devtools-z)` on both),
 * decided between them by DOM order alone rather than by a rule that
 * favours either. `Primary drawer`'s default edge is `end` — the right
 * side, full height — which overlaps the trigger's own `bottom-right`
 * default corner, and the later-painted drawer wins: measured, a
 * pointer click on the trigger while that drawer is open lands on
 * `.devtools-drawer-body` instead (`locator.click` timed out reporting
 * exactly that interception). Recorded as a bug outside this task's
 * scope. The trigger stays reachable by keyboard regardless, which is
 * this helper's whole difference from `openHarnessItem`.
 *
 * @param page - The page under test.
 * @param itemLabel - The chosen item's own label.
 */
async function reopenHarnessItemByKeyboard(
  page: Page,
  itemLabel: string,
): Promise<void> {
  await triggerOf(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: MENU_NAME })).toBeVisible();
  await page.getByRole('menuitem', { name: HARNESS_SUBMENU_NAME }).click();
  await page.getByRole('menuitem', { name: itemLabel }).click();
}

test.describe('the dev-tools shell', () => {
  test('the trigger mounts in the configured corner', async ({ page }) => {
    // Arrange / Act
    await page.goto(HARNESS_PATH);

    // Assert — `./fixtures/dev-tools-harness.tsx` configures
    // `corner: 'bottom-right'`, the same default `src/dev/devtools.ts`
    // gives the real app.
    await expect(triggerOf(page)).toBeVisible();
    await expect(triggerOf(page)).toHaveAttribute('data-corner', 'bottom-right');
  });

  test('the menu opens by keyboard', async ({ page }) => {
    // Arrange
    await page.goto(HARNESS_PATH);

    // Act — the trigger is a plain `<button>`, so Enter reaches the
    // menu through the platform's own click rather than through a key
    // handler this package writes; see `../../src/core/Menu.tsx`'s
    // header on why this case is the only proof of that.
    await triggerOf(page).focus();
    await page.keyboard.press('Enter');

    // Assert — open with the first row's roving focus already moved to
    // it, so a keyboard operator lands inside the list rather than
    // beside it.
    await expect(page.getByRole('menu', { name: MENU_NAME })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Position' })).toBeFocused();
  });

  test('each of the four corners moves the trigger', async ({ page }) => {
    // Arrange
    await page.goto(HARNESS_PATH);
    await openPositionSubmenu(page);

    // Act / Assert — one submenu, opened once, walked corner by corner.
    for (const corner of CORNERS) {
      await page.getByRole('menuitemradio', { name: corner.label }).click();
      await expect(triggerOf(page)).toHaveAttribute('data-corner', corner.value);
    }
  });

  test('a reload resets the corner while the size survives', async ({ page }) => {
    // Arrange — a size seeded directly into storage, because nothing in
    // this plan's menu can set one: `Save settings` is drawn only when
    // the status endpoint reports `persistence: true`, which this
    // plan's plugin never does. `addInitScript` runs before every
    // navigation on this page, the reload included.
    await page.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, value);
    }, {
      key: SETTINGS_STORAGE_KEY,
      value: JSON.stringify({ size: SEEDED_SIZE, handles: [] }),
    });

    await page.goto(HARNESS_PATH);
    await expect(triggerOf(page)).toHaveAttribute('data-size', SEEDED_SIZE);

    // Act — move the trigger off its configured corner.
    await openPositionSubmenu(page);
    await page.getByRole('menuitemradio', { name: 'Top left' }).click();
    await expect(triggerOf(page)).toHaveAttribute('data-corner', 'top-left');

    await page.reload();

    // Assert — the corner is seeded from the config on every load, by
    // requirement, while the size is the one thing `devtools.settings`
    // remembers.
    await expect(triggerOf(page)).toHaveAttribute('data-corner', 'bottom-right');
    await expect(triggerOf(page)).toHaveAttribute('data-size', SEEDED_SIZE);
  });

  test('About shows the commit', async ({ page, request }) => {
    // Arrange — read the same endpoint the widget itself calls, so the
    // assertion is a comparison between two independently observable
    // readings rather than a commit hash pinned into this file.
    await page.goto(HARNESS_PATH);

    const status = await (await request.get('/__devtools/status')).json() as {
      commit: string;
      branch: string;
      round: string;
    };

    // Act
    await openMenu(page);
    await page.getByRole('menuitem', { name: 'About' }).click();

    // Assert — the summary line first, abbreviated to seven characters
    // the way `git` itself abbreviates a commit.
    const about = page.getByRole('dialog', { name: 'About' });

    await expect(about).toBeVisible();
    await expect(about).toContainText(
      `commit ${status.commit.slice(0, 7)} on ${status.branch}`,
    );

    // The details button expands the whole commit, unabbreviated, plus
    // the branch, the round and — this harness names no `apiVersion`
    // probe — the API row read as unavailable rather than blank.
    await about.getByRole('button', { name: 'Details' }).click();
    await expect(about).toContainText(status.commit);
    await expect(about).toContainText(status.branch);
    await expect(about).toContainText(status.round);
    await expect(about).toContainText('unavailable');
  });

  test('a modal traps focus and closes on Escape', async ({ page }) => {
    // Arrange
    await page.goto(HARNESS_PATH);
    await openHarnessItem(page, SESSION_LABEL);

    const modal = page.getByRole('dialog', { name: SESSION_LABEL });

    await expect(modal).toBeVisible();

    const doThing = modal.getByRole('button', { name: 'Do a thing' });
    const close = modal.getByRole('button', { name: 'Close' });

    // Act / Assert — `showModal()` puts focus on the first focusable
    // descendant, and the platform's own trap is what keeps it cycling
    // — measured, over exactly two `<button>`s, as a THREE-stop cycle:
    // the two controls, then `document.body` as a neutral third stop
    // Chromium's own containment includes, never anything outside the
    // dialog. See `../../src/core/surfaces/Modal.tsx`'s header on why
    // there is no code in this package for any of it.
    await expect(doThing).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();

    // `toBeFocused()` reads the `:focus` pseudo-class, which `<body>`
    // does not match even while it genuinely holds
    // `document.activeElement` as the platform's implicit default —
    // measured: the CDP-level read below agrees with a raw
    // `document.activeElement` check taken at the same instant, and
    // `toBeFocused()` against `body` disagrees with both. So this one
    // stop is read the same way the browser itself would answer it.
    await page.keyboard.press('Tab');
    await expect
      .poll(() => page.evaluate(() => document.activeElement === document.body))
      .toBe(true);
    await expect(page.locator(`#${APP_BUTTON_ID}`)).not.toBeFocused();

    await page.keyboard.press('Tab');
    await expect(doThing).toBeFocused();

    // Act / Assert — Escape reaches the shell as the dialog's own
    // `close` event; there is no key handler for it in this package.
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });

  test('a drawer leaves the page interactive', async ({ page }) => {
    // Arrange
    await page.goto(HARNESS_PATH);
    await openHarnessItem(page, PRIMARY_DRAWER_LABEL);

    const drawer = page.getByRole('dialog', { name: PRIMARY_DRAWER_LABEL });

    await expect(drawer).toBeVisible();

    // Act — a plain page control, outside the widget's own root, that
    // only a listener the app itself owns can answer.
    await page.locator(`#${APP_BUTTON_ID}`).click();

    // Assert — the click landed, which a modal's `showModal()` would
    // have refused by making the whole document inert, and the drawer
    // is still up: nothing about answering the page closed it.
    await expect(page.locator(`#${APP_BUTTON_COUNT_ID}`)).toHaveText('1');
    await expect(drawer).toBeVisible();
  });

  test('a second drawer item closes the first', async ({ page }) => {
    // Arrange
    await page.goto(HARNESS_PATH);
    await openHarnessItem(page, PRIMARY_DRAWER_LABEL);
    await expect(page.getByRole('dialog', { name: PRIMARY_DRAWER_LABEL })).toBeVisible();

    // Act — the shell's one `openSurface` slot is the whole of "one
    // drawer at a time": opening the second overwrites it rather than
    // joining it. Reopened by keyboard — see
    // `reopenHarnessItemByKeyboard`'s own header for why a pointer
    // click on the trigger does not reach it while this drawer is up.
    await reopenHarnessItemByKeyboard(page, SECONDARY_DRAWER_LABEL);

    // Assert
    await expect(page.getByRole('dialog', { name: SECONDARY_DRAWER_LABEL })).toBeVisible();
    await expect(page.getByRole('dialog', { name: PRIMARY_DRAWER_LABEL })).toHaveCount(0);
  });

  test('a handle collapses and expands', async ({ page }) => {
    // Arrange
    await page.goto(HARNESS_PATH);
    await openHarnessItem(page, PRIMARY_DRAWER_LABEL);

    const drawer = page.getByRole('dialog', { name: PRIMARY_DRAWER_LABEL });
    const handle = page.getByRole('button', { name: `Expand ${PRIMARY_DRAWER_LABEL}` });

    await expect(drawer).toBeVisible();

    // Act — the header's own control collapses rather than closes,
    // because this item declared `handle: true`.
    await page.getByRole('button', { name: `Collapse ${PRIMARY_DRAWER_LABEL}` }).click();

    // Assert — the panel is gone and the edge tab is what is left.
    await expect(drawer).toHaveCount(0);
    await expect(handle).toBeVisible();

    // Act — the tab reopens the very panel it replaced.
    await handle.click();

    // Assert
    await expect(drawer).toBeVisible();
    await expect(handle).toHaveCount(0);
  });
});
