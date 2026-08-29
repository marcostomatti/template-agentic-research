import { expect, test } from '@playwright/test';

import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import {
  DOMAIN_BASE_PREFIX,
  SINGLE_DOMAIN_BASE,
} from '../../src/routes/paths';

// `src/routes/paths.ts` and `src/data/domains.ts` are imported for their
// constants alone — both are pure data modules, so this spec spells no
// base prefix and no fixture slug of its own and cannot drift from the
// app it drives.
//
// What this file adds over `src/routes/router.test.ts`, which already
// asks `matchRoutes` whether an unmatched path reaches the catch-all
// under both bases and which element sits behind it, is the RENDER: the
// shell around the not-found really mounts, and nothing on the way to it
// — the domain guard, the theme hook, the chrome's cache reads — throws
// on a path no surface claims.
//
// The catch-all being declared as a CHILD of each layout route is the
// claim being driven here. A sibling would match just as well and would
// replace the shell, at which point the not-found's own description
// ("Pick a surface from the sidebar to carry on") would point at
// something that is no longer on the screen.

/** A path segment deliberately naming nothing either tree declares. */
const UNMATCHED_SEGMENT = 'nothing-answers-here';

/**
 * What the catch-all's `EmptyState` titles itself.
 *
 * Matched as text rather than through a role: `EmptyState` draws its
 * title in a `span`, so there is no heading to ask for. `exact` keeps
 * the locator on that span alone — a substring match would also claim
 * every ancestor wrapping it.
 */
const NOT_FOUND_TITLE = 'Page not found';

/**
 * What the domain guard's own refusal titles itself.
 *
 * A different surface from the catch-all's, and the difference is the
 * point: this one stands alone with no rail around it, because every
 * piece of the shell resolves a base from the slug that just failed.
 */
const DOMAIN_NOT_FOUND_TITLE = 'Domain not found';

/** The way out the guard's refusal carries, having no rail to offer. */
const GUARD_EXIT_NAME = 'Back to the digest';

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/**
 * The collapse control `AppShellTopbar` draws ahead of its children.
 *
 * Expanded is the shell's initial state, so the name is the collapse
 * half of the pair. `sidebar-collapse.spec.ts` owns the flip.
 */
const COLLAPSE_CONTROL_NAME = 'Collapse sidebar';

/**
 * The two bases, each with the unmatched path driven under it.
 *
 * Both have to be driven because a path is only unmatched relative to
 * the tree that claimed its prefix: `/d/<slug>/…` never reaches the
 * single-domain tree, so one catch-all cannot answer for the other.
 *
 * The domain case uses the deployment's own fixture slug, so it
 * exercises the guard letting a good slug THROUGH. A malformed slug
 * renders the guard's own refusal instead, with no rail at all — that
 * is a different surface and not this file's subject.
 */
const BASES = [
  {
    label: 'single-domain base',
    path: `${SINGLE_DOMAIN_BASE}${UNMATCHED_SEGMENT}`,
  },
  {
    label: 'domain base',
    path: `${DOMAIN_BASE_PREFIX}/${DEFAULT_DOMAIN_SLUG}/${UNMATCHED_SEGMENT}`,
  },
] as const;

/**
 * A domain address the catch-all can never claim.
 *
 * The uppercase slug MATCHES `/d/:domainSlug`, so the route tree is
 * satisfied and the surface below it is a real one — the refusal comes
 * from `DomainGuard`, which is the only thing standing between a
 * mistyped address and a shell whose every piece resolves a base from
 * it. That is why the case belongs beside the two above: same operator
 * mistake, and the one address in the app where the answer is a
 * not-found with no rail behind it.
 */
const MALFORMED_DOMAIN_PATH = `${DOMAIN_BASE_PREFIX}/Bad/digest`;

test.describe('an unmatched path', () => {
  for (const { label, path } of BASES) {
    test(`renders the not-found surface under the ${label}`, async ({
      page,
    }) => {
      // Arrange / Act
      await page.goto(path);

      // Assert — scoped to the content landmark, which is what says the
      // not-found arrived in the shell's own outlet rather than in
      // place of the shell.
      await expect(
        page.getByRole('main').getByText(NOT_FOUND_TITLE, { exact: true }),
      ).toBeVisible();

      // And the address it answered at is still the one asked for: the
      // catch-all renders where it stands, where the index route's
      // `<Navigate>` would have moved the URL.
      await expect(page).toHaveURL(path);
    });

    test(`keeps the shell mounted under the ${label}`, async ({ page }) => {
      // Arrange / Act
      await page.goto(path);

      // Assert — one landmark from the rail and one control from the
      // band, so a not-found rendered in place of either half fails
      // here rather than in the test above.
      const mainNav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

      await expect(mainNav).toBeVisible();
      await expect(
        page.getByRole('button', { name: COLLAPSE_CONTROL_NAME }),
      ).toBeVisible();

      // The rail is mounted and says the operator is nowhere: no
      // surface matched, so `activeSurfaceId` answers `undefined` and
      // no entry reports itself as the current page. A rail still
      // highlighting the surface it left would be the shape of a stale
      // active id held in state rather than derived from the path.
      await expect(mainNav.locator('[aria-current="page"]')).toHaveCount(0);
    });
  }
});

test.describe('a malformed domain slug', () => {
  test('renders the guard refusal, with no shell around it', async ({
    page,
  }) => {
    // Arrange / Act
    await page.goto(MALFORMED_DOMAIN_PATH);

    // Assert — the guard's own surface, not the catch-all's.
    await expect(
      page.getByText(DOMAIN_NOT_FOUND_TITLE, { exact: true }),
    ).toBeVisible();

    // Nothing of the shell is on the screen, which is what makes this
    // the near-miss the two cases above are measured against: their
    // rail is present because the catch-all renders inside the layout
    // route, and here there is no layout route to render inside.
    await expect(
      page.getByRole('navigation', { name: MAIN_NAV_NAME }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: COLLAPSE_CONTROL_NAME }),
    ).toHaveCount(0);

    // So the refusal carries the way out the rail would otherwise be,
    // pointing at the single-domain base rather than at another guess
    // at the domain that was meant.
    await expect(
      page.getByRole('link', { name: GUARD_EXIT_NAME }),
    ).toHaveAttribute('href', SINGLE_DOMAIN_BASE);
  });
});
