import type { Surface } from '../../src/routes/paths';
import type { Locator } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  fetchCategorySummaries,
  fetchConnectors,
  fetchDomain,
  fetchFindings,
  fetchOperator,
  fetchPersonas,
  fetchSettings,
  fetchSources,
} from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { splitEndpoint } from '../../src/pages/sources/rows';
import {
  domainBase,
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';
import { repeated } from '../../src/test-support/repeated';

// Every constant, every expected path and every expected row below is
// read out of the app's own pure modules, so this file spells no base,
// no surface title and no fixture prose of its own. Playwright
// transpiles the TS itself; the rule for what a spec may import is
// that nothing may touch `document` at import time, which is why the
// router and the chrome components are not reachable from here.
//
// What this adds over the unit suites — `routes/router.test.ts` asks
// `matchRoutes` what each path resolves to, and `pages/index.test.ts`
// which component sits behind each surface — is the GESTURE. Three
// things only a browser can answer:
//
//   - the rail's entries are wired to the router at all: `SidebarNav`
//     reports a selection and `Sidebar` turns it into a navigation,
//     and neither half is reachable from a node runner;
//   - the surface that arrives is the one the entry named, drawn
//     against its own fixtures rather than merely addressed;
//   - the rail then reports THAT surface as the current page, which
//     is derived from the path rather than from the click.
//
// Each case starts on a different surface, so the click is a real
// navigation rather than a no-op on the page already open — see
// {@link originSurface}.
//
// Nothing here keys on a glyph. `Icon` lazy-loads its chunks and draws
// an empty stand-in meanwhile, so a glyph is the one thing on the page
// that is not there on the first frame; every locator below is a role,
// an accessible name or the text a fixture put on the screen.

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/**
 * The `fields` key the seeded domain's contract requires of a finding.
 *
 * Read defensively below rather than asserted through the type:
 * `fields` is a JSON payload, so `required` is a rule the pipeline
 * applies and not one this side can lean on.
 */
const SUMMARY_FIELD = 'summary';

/** The accessible name the settings surface gives its domain select. */
const DEFAULT_DOMAIN_CONTROL_NAME = 'Default domain';

/** The label over the operator name the settings surface displays. */
const OPERATOR_NAME_LABEL = 'Name';

/** The label over the operator email the settings surface displays. */
const OPERATOR_EMAIL_LABEL = 'Email';

/**
 * What one surface renders that came out of the fixture layer.
 *
 * Each check reads through the same accessors the page reads through,
 * so a missing row is a difference between the data layer and the
 * render rather than between the render and a literal typed here,
 * which could only go stale. Each also carries its own non-emptiness
 * guard: a fixture set that lost its rows would otherwise leave an
 * empty list, and an empty list passes every assertion made over it.
 */
interface SurfaceContent {
  /** Names the claim, so a failing test title says which one it is. */
  readonly what: string;
  /**
   * Assert this surface drew what its accessors answered with.
   *
   * @param main - The content landmark, so a surface rendered in place
   * of the shell fails here rather than passing on the rail's copy of
   * the same words.
   */
  readonly assert: (main: Locator) => Promise<void>;
}

/**
 * One content check per surface, keyed by surface id.
 *
 * Keyed rather than listed alongside the surfaces so the two tables
 * cannot fall out of order. A key the surface table no longer carries
 * would sit here unread, which is what the guard test below is for;
 * the missing half is caught by {@link contentCheck}.
 */
const SURFACE_CONTENT: Readonly<Record<string, SurfaceContent>> = {
  digest: {
    what: 'a row per finding',
    assert: async (main) => {
      const findings = await fetchFindings(DEFAULT_DOMAIN_SLUG);
      const summaries = findings
        .map((finding) => finding.fields[SUMMARY_FIELD])
        .filter((value): value is string => typeof value === 'string');

      // A fixture set that lost its summaries leaves an empty list,
      // and every assertion in the loop below would then pass.
      expect(summaries).toHaveLength(findings.length);
      expect(summaries.length).toBeGreaterThan(0);

      // Addressed as rows rather than as cells: the row-context
      // trigger carries the same summary in its accessible name
      // (`Actions for …`), so a cell locator would match two per row
      // while a row locator matches the one row holding both.
      //
      // Which is also why the row alone is not the assertion. That
      // trigger puts the summary in the row's own accessible name, so
      // a finding column that had stopped rendering it would still be
      // found here — measured, as a mutation leg that survived. The
      // leading cell is the one that has to carry it.
      for (const summary of summaries) {
        const row = main.getByRole('row', { name: summary });

        await expect(row).toBeVisible();
        await expect(row.getByRole('cell').first()).toContainText(summary);
      }
    },
  },

  lexicon: {
    what: 'a card per category',
    assert: async (main) => {
      const summaries = await fetchCategorySummaries(DEFAULT_DOMAIN_SLUG);

      expect(summaries.length).toBeGreaterThan(0);

      // A card is a section of the page, so its name is an `h2` —
      // exact, because a substring would also claim the page head.
      for (const { category } of summaries) {
        await expect(
          main.getByRole('heading', {
            level: 2,
            name: category.name,
            exact: true,
          }),
        ).toBeVisible();
      }
    },
  },

  sources: {
    what: 'a row per source',
    assert: async (main) => {
      const sources = await fetchSources(DEFAULT_DOMAIN_SLUG);
      const paths = sources
        .map((source) => splitEndpoint(source.endpoint).path)
        .filter((value): value is string => value !== null);

      // The endpoint IS a source's identity — there is no name column
      // — and the path half of it is what distinguishes two feeds on
      // one host, which the fixtures deliberately carry.
      expect(paths).toHaveLength(sources.length);
      expect(paths.length).toBeGreaterThan(0);
      expect(repeated(paths)).toEqual([]);

      for (const path of paths) {
        await expect(main.getByRole('row', { name: path })).toBeVisible();
      }
    },
  },

  agents: {
    what: 'a card per persona',
    assert: async (main) => {
      const personas = await fetchPersonas(DEFAULT_DOMAIN_SLUG);

      expect(personas.length).toBeGreaterThan(0);

      // The role is the card heading because a persona has no name
      // column: the role IS its identity within the domain.
      for (const persona of personas) {
        await expect(
          main.getByRole('heading', {
            level: 2,
            name: persona.role,
            exact: true,
          }),
        ).toBeVisible();
      }
    },
  },

  tools: {
    what: 'a card per connector',
    assert: async (main) => {
      // No slug: connectors are deployment-level, which is why this is
      // the one check on the page that a domain switch leaves alone.
      const connectors = await fetchConnectors();

      expect(connectors.length).toBeGreaterThan(0);

      for (const connector of connectors) {
        await expect(
          main.getByRole('heading', {
            level: 2,
            name: connector.name,
            exact: true,
          }),
        ).toBeVisible();
      }
    },
  },

  settings: {
    what: 'the stored preferences and the operator',
    assert: async (main) => {
      const settings = await fetchSettings();
      const operator = await fetchOperator();

      // The one reading on this surface that is a JOIN: the preference
      // names a slug and the domain list is what turns it into a name,
      // so the name on the control is what says both reads landed. The
      // select is labelled, so its accessible name is the label and
      // the domain name is its text.
      const domain = await fetchDomain(settings.defaultDomainSlug);

      await expect(
        main.getByRole('button', { name: DEFAULT_DOMAIN_CONTROL_NAME }),
      ).toContainText(domain.name);

      // Addressed by ROLE rather than by label: `Email` is also a
      // notification channel on this page, and its switch carries the
      // same accessible name, so a label locator matches two controls
      // however exact it is. The role is what tells a stored value
      // from a toggle that happens to be named after it.
      await expect(
        main.getByRole('textbox', {
          name: OPERATOR_NAME_LABEL,
          exact: true,
        }),
      ).toHaveValue(operator.name);
      await expect(
        main.getByRole('textbox', {
          name: OPERATOR_EMAIL_LABEL,
          exact: true,
        }),
      ).toHaveValue(operator.email);
    },
  },
};

/**
 * The content check for a surface.
 *
 * Throws rather than answering `undefined`: a `Record` keyed by an id
 * another module owns is fail-open by construction, and a surface
 * renamed out from under this table would otherwise leave its case
 * asserting nothing about what is on the screen.
 *
 * @param surfaceId - Nav id of the surface.
 * @returns What that surface is expected to have drawn.
 * @throws If this file carries no check for that surface.
 */
function contentCheck(surfaceId: string): SurfaceContent {
  const check = SURFACE_CONTENT[surfaceId];

  if (check === undefined) {
    throw new Error(`No content check for surface: ${surfaceId}`);
  }

  return check;
}

/**
 * A surface to start from, given the one being navigated to.
 *
 * The first entry that is not the target, so every case begins on a
 * surface the click has to leave. Landing on the target already open
 * would make a rail entry that navigates nowhere indistinguishable
 * from one that works — and the app boots onto the digest, so that is
 * exactly what the digest case would otherwise be.
 *
 * @param surfaceId - Nav id of the surface under test.
 * @returns Another surface, whatever the table holds.
 * @throws If the table has nothing else in it.
 */
function originSurface(surfaceId: string): Surface {
  const origin = SURFACES.find((surface) => surface.id !== surfaceId);

  if (origin === undefined) {
    throw new Error(`No surface to start from other than: ${surfaceId}`);
  }

  return origin;
}

/** The first surface in the table, which the domain-base case uses. */
function firstSurface(): Surface {
  const [first] = SURFACES;

  if (first === undefined) {
    throw new Error('The surface table is empty');
  }

  return first;
}

test.describe('the main navigation at the single-domain base', () => {
  test('carries one distinctly-addressed entry per surface', () => {
    // A derived table can go empty and satisfy every mapped assertion
    // made over it at once — including all six cases below, which are
    // generated from it. This is the one assertion that reddens.
    expect(SURFACES.length).toBeGreaterThan(0);

    // The other half of the keying `contentCheck` guards: a check
    // filed under an id no surface carries would be dead weight no
    // case ever reaches, and every case would still pass.
    expect(Object.keys(SURFACE_CONTENT).sort()).toEqual(
      SURFACES.map((surface) => surface.id).sort(),
    );

    // Six entries leading to six addresses. The cases below each pin
    // one path, so two surfaces sharing one would make two of them
    // assert the same thing rather than fail — this names the pair.
    expect(
      repeated(SURFACES.map(({ id }) => withBase(SINGLE_DOMAIN_BASE, id))),
    ).toEqual([]);
  });

  for (const surface of SURFACES) {
    const check = contentCheck(surface.id);
    const origin = originSurface(surface.id);

    test(`opens ${surface.title} with ${check.what}`, async ({ page }) => {
      // Arrange — somewhere else, so the click has somewhere to go.
      await page.goto(withBase(SINGLE_DOMAIN_BASE, origin.id));

      // Scoped to the landmark throughout: settings sits in BOTH rail
      // navs (it is a routed surface and a quick-access item), so an
      // unscoped locator for it would match two controls. The two
      // landmarks are named precisely so this one cannot.
      const mainNav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

      await expect(
        mainNav.getByRole('button', { name: origin.title, exact: true }),
      ).toBeVisible();

      // Act
      await mainNav
        .getByRole('button', { name: surface.title, exact: true })
        .click();

      // Assert — the page's own heading first, because it is what says
      // the surface RENDERED rather than merely being addressed.
      await expect(
        page.getByRole('heading', { level: 1, name: surface.title }),
      ).toBeVisible();

      // And the address moved with it, to this surface's own path.
      await expect(page).toHaveURL(withBase(SINGLE_DOMAIN_BASE, surface.id));

      // Exactly one entry reports itself as the current page, and it
      // is the one that was clicked. The rail derives that from the
      // PATH, so this is also what would catch an active id held in
      // state — which would be right here and stale on a back button.
      const current = mainNav.locator('[aria-current="page"]');

      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(surface.title);

      // And the surface drew its own fixtures, not just its title.
      await check.assert(page.getByRole('main'));
    });
  }
});

test.describe('the main navigation under a domain base', () => {
  // One pair rather than six: the six cases above already ask whether
  // each entry reaches its own surface, and what this adds is that the
  // rail builds its links against the base it is rendering under. At
  // the single-domain base a hardcoded `/` and a resolved base are the
  // same string, so nothing above can tell them apart.
  const origin = firstSurface();
  const target = originSurface(origin.id);

  test(`keeps the base when opening ${target.title}`, async ({ page }) => {
    // Arrange
    const base = domainBase(DEFAULT_DOMAIN_SLUG);

    await page.goto(withBase(base, origin.id));

    const mainNav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

    // Act
    await mainNav
      .getByRole('button', { name: target.title, exact: true })
      .click();

    // Assert — the surface, then the address it answered at, which is
    // the claim: the slug survives the navigation instead of dropping
    // the operator back onto the single-domain copy of the tree.
    await expect(
      page.getByRole('heading', { level: 1, name: target.title }),
    ).toBeVisible();
    await expect(page).toHaveURL(withBase(base, target.id));

    // The same domain answers under both bases, so the surface draws
    // the same fixtures — which is what says the slug reached the
    // reads and not just the address bar.
    await contentCheck(target.id).assert(page.getByRole('main'));
  });
});
