import type { Surface } from '../../src/routes/paths';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { fetchDomains } from '../../src/data/api';
import {
  DEFAULT_DOMAIN_SLUG,
  getDomain,
  SPARSE_DOMAIN_SLUG,
} from '../../src/data/domains';
import {
  domainBase,
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';
import { repeated } from '../../src/test-support/repeated';

// Every base, every slug and every domain name below is read out of the
// app's own pure modules, so this file spells none of them and cannot
// drift from the switcher it drives. Playwright transpiles the TS
// itself; the rule for what a spec may import is that nothing may touch
// `document` at import time, which is why the router and the chrome are
// not reachable from here.
//
// What this adds over the unit suites — `routes/paths.test.ts` already
// covers `domainBase` and `swapBase` as functions, and
// `routes/router.test.ts` asks `matchRoutes` what each path under each
// base resolves to — is the WIRING between them. Three things only a
// browser can answer:
//
//   - `WorkspaceSwitcher` is handed the domain fixtures at all, and
//     enough of them to render: it returns `null` below two workspaces,
//     so the control's mere presence is a reading of the data layer;
//   - selecting a row navigates, and to the base of the row that was
//     selected rather than to a fixed one;
//   - the surface survives the swap. `swapBase` keeps everything below
//     the base, and only a real navigation can say whether the app
//     calls it with the path it is actually on.
//
// The first of the two switch cases is the one the plan names — from
// the single-domain base onto `/d/<default slug>`, which is a real move
// even though `/` already resolves to that same domain, because an
// explicit choice deserves an explicit URL. The second switches to the
// OTHER domain instead, and it is what makes the first one falsifiable:
// a switcher wired to a constant slug would pass the first case and
// fail this one.
//
// Nothing here keys on a glyph. `Icon` lazy-loads its chunks and draws
// an empty stand-in meanwhile — the check mark on the active row is one
// — so a glyph is the one thing on the page that is not there on the
// first frame; every locator below is a role or an accessible name.

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/**
 * The surface `/` redirects to.
 *
 * Spelled here for the reason `shell.spec.ts` spells it: the index
 * route names it and `routes/router.tsx` is not importable from a spec.
 * A drift in either direction is caught rather than absorbed — the
 * {@link INDEX_PATH} below resolves this id through `withBase`, whose
 * throwing lookup fails this file at import if the surface table no
 * longer carries it, and the address `/` actually lands on is asserted
 * against that path in the first test below.
 */
const INDEX_SURFACE_ID = 'digest';

/** Where the index redirect leaves the address bar. */
const INDEX_PATH = withBase(SINGLE_DOMAIN_BASE, INDEX_SURFACE_ID);

/**
 * How many workspaces `WorkspaceSwitcher` lists inline.
 *
 * Mirrors its own `RECENT_LIMIT`, which is not exported. The guard
 * below is what turns a fixture list grown past it into a named
 * failure rather than into a missing row nobody can explain.
 */
const WORKSPACE_MENU_LIMIT = 5;

/**
 * A surface to switch domains FROM.
 *
 * Deliberately not the one `/` redirects to: a switch that dropped the
 * surface would land on the domain base itself, whose index route
 * redirects to {@link INDEX_SURFACE_ID} — so starting there would make
 * "kept the surface" and "lost it and was sent back to the index"
 * the same address.
 *
 * @returns The first surface that is not the index one.
 * @throws If the table holds nothing else, which would leave every
 * claim about keeping a surface untestable rather than merely failing.
 */
function originSurface(): Surface {
  const origin = SURFACES.find((surface) => surface.id !== INDEX_SURFACE_ID);

  if (origin === undefined) {
    throw new Error(
      `No surface to switch domains from other than: ${INDEX_SURFACE_ID}`,
    );
  }

  return origin;
}

const ORIGIN_SURFACE = originSurface();

/**
 * The switcher's trigger, addressed by the domain it is displaying.
 *
 * Addressing it by that name is half the assertion rather than a
 * convenience: the pill IS the app's statement of which domain is
 * active, so a switch that moved the address without moving the
 * chrome's own read fails on this locator.
 *
 * What it deliberately does NOT claim is that the topbar RESOLVES that
 * slug rather than passing the raw route param through.
 * `WorkspaceSwitcher` falls back to the first workspace for an
 * `activeId` no row carries, and the default domain is the first
 * fixture row — so at the single-domain base, where there is no param
 * to read, the fallback and the resolution paint the same pill.
 * Measured as a mutation-leg survivor, and left as one: the resolver
 * has its own unit test, and ordering the fixtures to expose it here
 * would be a worse trade than the missing leg.
 *
 * The name is matched as a SUBSTRING on purpose. `WorkspaceMark` is a
 * labelled `img` carrying the same name as the text beside it, so the
 * button's accessible name is the domain name twice over — an exact
 * match would pin that doubling, which is `@ar/ui`'s composition and
 * not this app's promise.
 *
 * @param page - The page under test.
 * @param domainName - Name of the domain expected to be active.
 * @returns The trigger, which may match nothing.
 */
function switcherTrigger(page: Page, domainName: string): Locator {
  return page.getByRole('button', { name: domainName });
}

/**
 * One row of the open switcher menu.
 *
 * Scoped to the menu, because the trigger carries the active domain's
 * name too and the two would otherwise both match.
 *
 * @param page - The page under test.
 * @param domainName - Name of the domain whose row is wanted.
 * @returns The row, which may match nothing.
 */
function switcherRow(page: Page, domainName: string): Locator {
  return page.getByRole('menu').getByRole('menuitem', { name: domainName });
}

/**
 * Open the switcher.
 *
 * @param page - The page under test.
 * @param activeName - Name of the domain currently active, which is
 * what the trigger is displaying and so how it is addressed.
 */
async function openSwitcher(page: Page, activeName: string): Promise<void> {
  await switcherTrigger(page, activeName).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/**
 * Assert the shell is showing {@link ORIGIN_SURFACE} at a given base.
 *
 * Three readings of one thing, so a failure says which half of the app
 * lost the surface: the page drew it, the address names it, and the
 * rail reports it as the current page. The rail derives that from the
 * PATH, which is why it is worth asserting after a base swap at all.
 *
 * @param page - The page under test.
 * @param base - The base the surface is expected to sit under.
 */
async function expectOriginSurfaceAt(page: Page, base: string): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: ORIGIN_SURFACE.title }),
  ).toBeVisible();

  await expect(page).toHaveURL(withBase(base, ORIGIN_SURFACE.id));

  const current = page
    .getByRole('navigation', { name: MAIN_NAV_NAME })
    .locator('[aria-current="page"]');

  await expect(current).toHaveCount(1);
  await expect(current).toHaveText(ORIGIN_SURFACE.title);
}

test.describe('the topbar domain switcher', () => {
  test('lists every fixture domain', async ({ page }) => {
    // Arrange — read through the same accessor the topbar reads
    // through, so a domain the fixtures gained or lost is a difference
    // between the data layer and the menu rather than between the menu
    // and a literal typed here.
    const domains = await fetchDomains();

    // Below two workspaces `WorkspaceSwitcher` renders nothing at all,
    // so a shrunken fixture list would not fail the loop below — there
    // would be no control to open and no rows to miss. This is the
    // assertion that reddens, and it is also the whole reason the
    // fixtures carry a second domain.
    expect(domains.length).toBeGreaterThan(1);

    // Only the most recent few are listed inline. A fixture list grown
    // past that would leave the rest out of the menu legitimately, and
    // the loop below would report it as a missing row.
    expect(domains.length).toBeLessThanOrEqual(WORKSPACE_MENU_LIMIT);

    // Each name has to address one row: two domains sharing one would
    // let a single row satisfy two of the assertions below.
    expect(repeated(domains.map((domain) => domain.name))).toEqual([]);

    await page.goto(SINGLE_DOMAIN_BASE);

    // The index redirect lands where this file assumes it does. Without
    // this, an index moved onto another surface would silently make
    // `ORIGIN_SURFACE` the redirect target and quietly weaken both
    // switch cases below rather than failing anything.
    await expect(page).toHaveURL(INDEX_PATH);

    // Act — the trigger names the domain `/` resolves to, which is the
    // switcher's reading of a base carrying no slug at all.
    await openSwitcher(page, getDomain(DEFAULT_DOMAIN_SLUG).name);

    // Assert
    for (const domain of domains) {
      await expect(switcherRow(page, domain.name)).toBeVisible();
    }
  });

  test('moves the surface onto the default domain base', async ({ page }) => {
    // Arrange — on a surface the index redirect would not have chosen,
    // so keeping it is distinguishable from losing it.
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);

    await page.goto(withBase(SINGLE_DOMAIN_BASE, ORIGIN_SURFACE.id));
    await expectOriginSurfaceAt(page, SINGLE_DOMAIN_BASE);

    // Act — choosing the domain `/` already resolves to. The move is
    // real: `/` means "the one domain this operator runs" and this is
    // the address that says which one that is, so it is the only
    // spelling a shared link can carry.
    await openSwitcher(page, domain.name);
    await switcherRow(page, domain.name).click();

    // Assert — the surface came along, under the domain base.
    await expectOriginSurfaceAt(page, domainBase(DEFAULT_DOMAIN_SLUG));

    // And the switcher is still there naming the same domain, which is
    // what says the slug reached the chrome's own read rather than only
    // the address bar. Weaker here than in the case below — the name
    // did not have to change — so it is that case which proves the pill
    // follows the route param.
    await expect(switcherTrigger(page, domain.name)).toBeVisible();
  });

  test('moves the surface onto the chosen domain base', async ({ page }) => {
    // Arrange
    const active = getDomain(DEFAULT_DOMAIN_SLUG);
    const chosen = getDomain(SPARSE_DOMAIN_SLUG);

    await page.goto(withBase(SINGLE_DOMAIN_BASE, ORIGIN_SURFACE.id));
    await expectOriginSurfaceAt(page, SINGLE_DOMAIN_BASE);

    // Act — the other domain this time. A switcher wired to a fixed
    // slug, or one reporting every row's selection as the active one,
    // passes the case above and fails here.
    await openSwitcher(page, active.name);
    await switcherRow(page, chosen.name).click();

    // Assert — the surface again, now under the chosen domain's base.
    // The sparse domain deliberately holds few or no rows, so what is
    // asserted is the surface rather than its contents: this is a claim
    // about routing, and the empty states belong to the pages.
    await expectOriginSurfaceAt(page, domainBase(SPARSE_DOMAIN_SLUG));

    // The pill moved with the route param, and the domain switched away
    // from is no longer being reported as active.
    await expect(switcherTrigger(page, chosen.name)).toBeVisible();
    await expect(switcherTrigger(page, active.name)).toHaveCount(0);
  });
});
