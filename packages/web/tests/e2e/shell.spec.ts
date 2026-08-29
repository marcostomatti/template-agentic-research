import { expect, test } from '@playwright/test';

import { fetchFindings } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG, getDomain } from '../../src/data/domains';
import { getOperator } from '../../src/data/shell';
import { rowCountLabel } from '../../src/pages/digest/rows';
import {
  getSurface,
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';

// The app's own pure modules supply every constant and every fixture
// this file asserts against, so it spells no base, no surface title, no
// domain name and no finding prose of its own — what is on the screen is
// compared against what the data layer answers rather than against a
// literal transcribed here, which could only go stale. Playwright
// transpiles the TS itself; the rule for what a spec may import is that
// nothing may touch `document` at import time, which is why the router
// and the chrome components are not reachable from here.
//
// What this adds over the unit suites — which already ask `matchRoutes`
// what each path resolves to, and `pages/index.test.ts` which component
// sits behind each surface — is the BOOT. Three things only a browser
// can answer:
//
//   - the entry point mounts at all: `QueryProvider` above the router,
//     the theme hook reading `document.documentElement`, the fixture
//     reads settling through `useCache`;
//   - the index route's `<Navigate>` fires. A redirect happens during a
//     render and `matchRoutes` cannot see one, so this is the only
//     place the claim that `/` means the digest is testable;
//   - the three parts of the shell — rail, band and surface — are
//     mounted at the same time, against the same reads.
//
// Nothing here keys on a glyph. `Icon` lazy-loads its chunks and draws
// an empty stand-in meanwhile, so a glyph is the one thing on the page
// that is not there on the first frame; every locator below is a role,
// an accessible name or the text a fixture put on the screen.

/**
 * The surface `/` resolves to, which is what makes it this file's
 * subject: booting the app and landing on the digest are one gesture.
 */
const DIGEST_SURFACE_ID = 'digest';

/** Where the index redirect is expected to leave the address bar. */
const DIGEST_PATH = withBase(SINGLE_DOMAIN_BASE, DIGEST_SURFACE_ID);

/**
 * What the surface table calls it — the rail entry, the band's title
 * and the page's own `h1` are all this one string.
 *
 * `getSurface` throws on an id nothing carries, so reading it here is
 * also a membership guard: a digest renamed out of the surface table
 * fails this file at import rather than through six confusing
 * assertions.
 */
const DIGEST_TITLE = getSurface(DIGEST_SURFACE_ID).title;

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/**
 * The collapse control `AppShellTopbar` draws ahead of its children.
 *
 * The band is a `header` INSIDE `main`, so it is not a `banner`
 * landmark and carries no role of its own — this button's accessible
 * name is the only role-addressable handle on it. Expanded is the
 * shell's initial state, so the name is the collapse half of the pair;
 * `sidebar-collapse.spec.ts` owns the flip.
 */
const COLLAPSE_CONTROL_NAME = 'Collapse sidebar';

/**
 * What the domain behind the single-domain base is called.
 *
 * The switcher shows the ACTIVE workspace's name, so asserting it is
 * how "`/` resolved to the deployment's default domain" becomes visible
 * — the base carries no slug, and this is the only place on the screen
 * that says which domain answered.
 */
const DOMAIN_NAME = getDomain(DEFAULT_DOMAIN_SLUG).name;

/** The accessible name `ProfileMenu` gives its own trigger. */
const PROFILE_CONTROL_NAME = `Account — ${getOperator().name}`;

/** The header over the digest's first column. */
const FINDING_COLUMN_HEADER = 'Finding';

/** The placeholder on the digest's own search box, not the palette's. */
const FINDINGS_SEARCH_PLACEHOLDER = 'Search findings…';

/**
 * The `fields` key the seeded domain's contract requires of a finding.
 *
 * Read defensively below rather than asserted through the type: `fields`
 * is a JSON payload, so "required" is a rule the pipeline applies and
 * not one this side can lean on.
 */
const SUMMARY_FIELD = 'summary';

test.describe('the app at the single-domain base', () => {
  test('boots onto the digest surface', async ({ page }) => {
    // Arrange / Act — the bare base, with no surface named.
    await page.goto(SINGLE_DOMAIN_BASE);

    // Assert — the page's own heading first, because it is what says
    // the digest RENDERED rather than merely being addressed.
    await expect(
      page.getByRole('heading', { level: 1, name: DIGEST_TITLE }),
    ).toBeVisible();

    // And the address moved with it: the index route redirects instead
    // of rendering the digest at a second address, so `/` and
    // `/digest` never both name this surface in a shared link.
    await expect(page).toHaveURL(DIGEST_PATH);
  });

  test('mounts the rail with every surface on it', async ({ page }) => {
    // Arrange / Act
    await page.goto(SINGLE_DOMAIN_BASE);

    // Assert — scoped to the nav landmark throughout. Settings sits in
    // BOTH rail navs (it is a routed surface and a quick-access item),
    // so an unscoped locator for it would match two controls; the two
    // landmarks are named precisely so this one cannot.
    const mainNav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

    await expect(mainNav).toBeVisible();

    // A derived table can go empty and satisfy every mapped assertion
    // over it at once, and the loop below would then assert nothing.
    expect(SURFACES.length).toBeGreaterThan(0);

    for (const surface of SURFACES) {
      await expect(
        mainNav.getByRole('button', { name: surface.title, exact: true }),
      ).toBeVisible();
    }

    // Every surface, and nothing else: the rail is generated from the
    // same table, so an entry with no surface behind it would be a
    // control leading to the catch-all.
    await expect(mainNav.getByRole('button')).toHaveCount(SURFACES.length);

    // Exactly one entry reports itself as the current page, and it is
    // the surface that answered. The rail derives that from the PATH,
    // so this is also what would catch an active id held in state.
    const current = mainNav.locator('[aria-current="page"]');

    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(DIGEST_TITLE);
  });

  test('mounts the topbar with the operator\'s own controls', async ({
    page,
  }) => {
    // Arrange / Act
    await page.goto(SINGLE_DOMAIN_BASE);

    // Assert — the leading edge of the band: the collapse control the
    // shell draws itself, and the switcher naming the domain `/`
    // resolved to.
    await expect(
      page.getByRole('button', { name: COLLAPSE_CONTROL_NAME }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: DOMAIN_NAME }),
    ).toBeVisible();

    // And the trailing edge, which is the half that says the chrome's
    // own reads settled: the profile menu renders only once the
    // operator has arrived, so its absence is a read that never
    // resolved rather than a control that moved.
    await expect(
      page.getByRole('button', { name: PROFILE_CONTROL_NAME }),
    ).toBeVisible();
  });

  test('renders the digest over its fixtures', async ({ page }) => {
    // Arrange — read through the same seam the page reads. `useFindings`
    // calls this accessor, so a row missing from the screen is a
    // difference between the data layer and the render rather than
    // between the render and a literal typed into this file.
    const findings = await fetchFindings(DEFAULT_DOMAIN_SLUG);
    const summaries = findings
      .map((finding) => finding.fields[SUMMARY_FIELD])
      .filter((value): value is string => typeof value === 'string');

    // Both guards keep the loop below from asserting nothing: a fixture
    // set that lost its summaries — or lost its rows — would leave an
    // empty list, and an empty list passes every assertion made over it.
    expect(summaries).toHaveLength(findings.length);
    expect(summaries.length).toBeGreaterThan(0);

    // Act
    await page.goto(SINGLE_DOMAIN_BASE);

    // Assert — everything scoped to the content landmark, so a surface
    // rendered in place of the shell fails here rather than passing on
    // the rail's copy of the same words.
    const main = page.getByRole('main');

    // The surface's own controls, not the palette in the band: the two
    // search boxes are told apart by their placeholders.
    await expect(main.getByPlaceholder(FINDINGS_SEARCH_PLACEHOLDER))
      .toBeVisible();

    // The table's chrome, which is what distinguishes a rendered table
    // from the skeleton the page draws while its four reads join.
    await expect(
      main.getByRole('columnheader', { name: FINDING_COLUMN_HEADER }),
    ).toBeVisible();

    // The head's count chip, unfiltered — `visible === total`, so the
    // page states one number rather than "n of m". `first()` because
    // the slot wrapper and the `Tag` inside it carry exactly the same
    // text, and either one being on the screen is the claim.
    await expect(
      main
        .getByText(rowCountLabel(summaries.length, summaries.length), {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    // And a row per finding the domain answered with. Addressed as
    // rows rather than as cells: the row-context trigger carries the
    // same summary in its accessible name ("Actions for …"), so a cell
    // locator would match two per row while a row locator matches the
    // one row that holds both.
    for (const summary of summaries) {
      await expect(main.getByRole('row', { name: summary })).toBeVisible();
    }
  });
});
