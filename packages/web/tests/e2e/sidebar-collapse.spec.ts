import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';

// `src/routes/paths.ts` is imported for its constants alone — a pure
// data module, so this spec spells no base and no surface title of its
// own and cannot drift from the rail it drives. Playwright transpiles
// the TS itself; the rule for what a spec may import is that nothing
// may touch `document` at import time.
//
// This file is the only test of sidebar collapse anywhere in the repo,
// and that is structural rather than an oversight: the flag is
// `AppLayout`'s `useState`, a `.tsx` the node-only unit suite cannot
// collect, and every consumer of it is a component. No part of
// collapse is a pure function that could have been pushed out to a
// colocated test the way `activeSurfaceId` and `withBase` were.
//
// One flag reaches three separate pieces of wiring, and each is
// asserted on its own so a failure says which one broke:
//
//   - `AppShellTopbar` derives the control's accessible name from
//     `sidebarCollapsed`, so that name IS the shell's reading of the
//     flag — a control that narrows the rail while still calling
//     itself Collapse is the state and its label disagreeing, and a
//     screen reader would be told the opposite of what happened;
//   - `Sidebar` is called with the flag and drops its labels, its
//     lockup text and the week summary;
//   - `AppShellSidebar` is handed the same flag for its own width,
//     which is the half the rail's contents cannot report — a flag
//     that reached `Sidebar` alone would empty the rail and leave it
//     at its full width.
//
// Nothing here keys on a glyph. `Icon` lazy-loads its chunks and draws
// an empty stand-in meanwhile, so a glyph is the one thing on the page
// that is not there on the first frame; every locator below is a role,
// an accessible name or the text a fixture put on the screen.

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/**
 * The control's accessible name while the rail is EXPANDED.
 *
 * Spelled here rather than imported: `AppShellTopbar` holds both
 * halves of the pair as literals and exports neither, so these two
 * strings are the app's promise to a screen reader written down in the
 * only place a test can reach them.
 *
 * Note the name states the GESTURE on offer, not the state the rail is
 * in — which is why the expanded rail is the one labelled Collapse.
 */
const COLLAPSE_CONTROL_NAME = 'Collapse sidebar';

/** The same control's accessible name while the rail is COLLAPSED. */
const EXPAND_CONTROL_NAME = 'Expand sidebar';

/**
 * What `SidebarWeekSummary` titles itself.
 *
 * The widget returns `null` outright when the rail is collapsed, so
 * its absence is a DOM fact rather than a visibility one. That is what
 * makes it the rail-content assertion a clipped overflow cannot
 * satisfy either way.
 */
const WEEK_SUMMARY_TITLE = 'this week';

/**
 * The surface `/` redirects to, and so the address every test here
 * starts on and is expected to still be on afterwards.
 *
 * Built through `withBase`, which resolves the id through the throwing
 * `getSurface` — a digest renamed out of the surface table fails this
 * file at import rather than through a confusing URL mismatch.
 */
const DIGEST_PATH = withBase(SINGLE_DOMAIN_BASE, 'digest');

/**
 * The rail itself.
 *
 * `AppShellSidebar` renders a bare `aside` carrying no accessible
 * name, so the complementary landmark is the only handle on it — and
 * it is the only such landmark on the page.
 *
 * @param page - The page under test.
 * @returns The rail's landmark.
 */
function railOf(page: Page): Locator {
  return page.getByRole('complementary');
}

/**
 * The collapse control, addressed by whichever half of the pair it is
 * currently calling itself.
 *
 * The band is a `header` INSIDE `main`, so it is not a `banner`
 * landmark and has no role of its own; this button's accessible name
 * is the only role-addressable handle on it, which is also why the
 * name is matched exactly.
 *
 * @param page - The page under test.
 * @param name - The accessible name to ask for.
 * @returns The matching control, which may match nothing.
 */
function controlNamed(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true });
}

/**
 * The rail's rendered width, in CSS pixels.
 *
 * @param page - The page under test.
 * @returns The measured width.
 * @throws If the rail is not rendered at all, which is a different
 * failure from a rail that did not narrow and would otherwise arrive
 * as a comparison against a coerced zero.
 */
async function railWidth(page: Page): Promise<number> {
  const box = await railOf(page).boundingBox();

  if (box === null) {
    throw new Error('the rail is not rendered, so it has no width');
  }

  return box.width;
}

/**
 * Assert the rail is drawn in its expanded form.
 *
 * @param page - The page under test.
 */
async function expectRailExpanded(page: Page): Promise<void> {
  const mainNav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

  // A derived table can go empty and satisfy every mapped assertion
  // over it at once, and the loop below would then assert nothing.
  expect(SURFACES.length).toBeGreaterThan(0);

  for (const surface of SURFACES) {
    // `first()` because `NavItem` wraps its label in a span and the
    // button around it carries no other text, so both nodes match the
    // title exactly; either one being on the screen is the claim, and
    // a count would pin a nesting detail instead.
    await expect(
      mainNav.getByText(surface.title, { exact: true }).first(),
    ).toBeVisible();
  }

  await expect(
    railOf(page).getByText(WEEK_SUMMARY_TITLE, { exact: true }),
  ).toBeVisible();
}

/**
 * Assert the rail is drawn in its collapsed form.
 *
 * @param page - The page under test.
 */
async function expectRailCollapsed(page: Page): Promise<void> {
  const mainNav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

  // One assertion over the whole landmark rather than one per entry:
  // `NavItem` drops the label ELEMENT when collapsed rather than
  // hiding it, so the nav has nothing to say at all, and a single
  // label leaking through fails here whichever entry it belonged to.
  await expect(mainNav).toHaveText('');

  // Gone from the DOM rather than clipped — `SidebarWeekSummary`
  // returns `null` when collapsed, so a rail that merely got narrower
  // around an unchanged widget would fail here.
  await expect(
    railOf(page).getByText(WEEK_SUMMARY_TITLE, { exact: true }),
  ).toHaveCount(0);

  // The rail lost its labels, not its navigation. A collapsed
  // `NavItem` carries a `title`, which is what a button with no text
  // content falls back to for its accessible name — so every entry is
  // still addressable by exactly the name it had expanded, and a
  // collapse that put the rail out of reach of a screen reader would
  // fail here rather than passing as a visual change.
  expect(SURFACES.length).toBeGreaterThan(0);

  for (const surface of SURFACES) {
    await expect(
      mainNav.getByRole('button', { name: surface.title, exact: true }),
    ).toBeVisible();
  }
}

test.describe('the topbar collapse control', () => {
  test('starts on the collapse half of the pair', async ({ page }) => {
    // Arrange / Act
    await page.goto(SINGLE_DOMAIN_BASE);

    // Assert — expanded is the shell's initial state, so the gesture
    // on offer is the collapse one and the expand half is not merely
    // unlabelled but absent.
    await expect(controlNamed(page, COLLAPSE_CONTROL_NAME)).toBeVisible();
    await expect(controlNamed(page, EXPAND_CONTROL_NAME)).toHaveCount(0);

    // And the rail underneath says the same thing, which is what makes
    // the control's name a reading of the flag rather than a default.
    await expectRailExpanded(page);
  });

  test('collapses the rail and renames itself to expand', async ({ page }) => {
    // Arrange — the expanded width is measured before the gesture, so
    // the comparison below is against this run's own rail rather than
    // against a token value baked into `@ar/ui`'s stylesheet.
    await page.goto(SINGLE_DOMAIN_BASE);
    await expectRailExpanded(page);

    const expandedWidth = await railWidth(page);

    // Act
    await controlNamed(page, COLLAPSE_CONTROL_NAME).click();

    // Assert — the control renamed itself, and the collapse half is
    // gone rather than joined by a second button.
    await expect(controlNamed(page, EXPAND_CONTROL_NAME)).toBeVisible();
    await expect(controlNamed(page, COLLAPSE_CONTROL_NAME)).toHaveCount(0);

    // The rail's contents followed.
    await expectRailCollapsed(page);

    // And so did the rail itself. Polled rather than read once: the
    // width is a CSS transition, so a single measurement taken during
    // it reports when the assertion ran rather than where the rail
    // ended up.
    await expect
      .poll(async () => railWidth(page))
      .toBeLessThan(expandedWidth);
  });

  test('expands the rail again on a second press', async ({ page }) => {
    // Arrange
    await page.goto(SINGLE_DOMAIN_BASE);
    await expectRailExpanded(page);

    const expandedWidth = await railWidth(page);

    await controlNamed(page, COLLAPSE_CONTROL_NAME).click();
    await expectRailCollapsed(page);

    // Act
    await controlNamed(page, EXPAND_CONTROL_NAME).click();

    // Assert — the round trip lands back where it started on all three
    // halves: the control's name, the rail's contents, and the width
    // only the shell wrapper controls.
    await expect(controlNamed(page, COLLAPSE_CONTROL_NAME)).toBeVisible();
    await expect(controlNamed(page, EXPAND_CONTROL_NAME)).toHaveCount(0);

    await expectRailExpanded(page);
    await expect.poll(async () => railWidth(page)).toBe(expandedWidth);
  });

  test('leaves the address bar untouched', async ({ page }) => {
    // Arrange
    await page.goto(SINGLE_DOMAIN_BASE);
    await expect(page).toHaveURL(DIGEST_PATH);

    // Act
    await controlNamed(page, COLLAPSE_CONTROL_NAME).click();
    await expectRailCollapsed(page);

    // Assert — collapse is chrome state rather than a reading of the
    // page, so it is deliberately not addressable: a shared link
    // carries the surface, the domain and the list filters, and
    // nothing about how wide the rail happened to be when it was
    // copied.
    await expect(page).toHaveURL(DIGEST_PATH);
  });
});
