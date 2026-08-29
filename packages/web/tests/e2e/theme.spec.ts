import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { fetchFindings } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { SINGLE_DOMAIN_BASE, withBase } from '../../src/routes/paths';

// What this adds over the unit suite is the whole of the theme feature
// except its precedence rule. `src/app-shell/theme.test.ts` covers
// `resolveInitialTheme` as a pure function over an already-read
// environment, and that is deliberately all it can cover: everything
// else in that module reads `window` or writes the document, and the
// unit runner is node-only with no DOM. So three claims live here and
// nowhere else:
//
//   - `ThemeSwitcher` is bound to `useTheme` at all — it is fully
//     controlled and writes no DOM of its own, so a switcher handed a
//     constant theme and a discarded callback renders identically to a
//     wired one until it is pressed;
//   - the hook's effect actually reaches `document.documentElement`,
//     which is the element `@ar/ui`'s `tokens.css` keys its light and
//     dark blocks off;
//   - the press costs the surface underneath nothing.
//
// That last one is not decoration. The theme is owned by the topbar,
// which is chrome above the router's outlet, so a change there
// re-renders the whole tree beneath it — including six pages' worth of
// `useCache` reads. A flip that dropped the digest's rows for a frame,
// or reset a filter, or unmounted the surface entirely, would look
// exactly like a working theme toggle in a screenshot.
//
// The attribute name and the two theme values below are spelled here
// rather than imported from `src/app-shell/theme.ts`, which exports
// both. That is the one place this file deliberately does not read the
// app's own constants: `data-theme`, `light` and `dark` are the
// contract with a stylesheet in ANOTHER package, so an app that
// renamed its attribute would move this spec with it and stay green
// while the deployment stopped changing colour. The control's two
// accessible names are spelled for the neighbouring reason —
// `ThemeSwitcher` composes them from a literal and exports neither, so
// this is the only place the app's promise to a screen reader is
// written down where a test can reach it.
//
// Everything else is read out of the app's pure modules, so this file
// spells no base, no slug and no fixture prose. Playwright transpiles
// the TS itself; the rule for what a spec may import is that nothing
// may touch `document` at import time.
//
// Nothing here keys on a glyph — which matters more on this control
// than on most, since the light and dark states of the switcher differ
// by nothing else. `Icon` lazy-loads its chunks and draws an empty
// stand-in meanwhile, so the moon and the sun are the one thing on the
// page that is not there on the first frame; the accessible name is
// what carries the state.

/**
 * The attribute `tokens.css` keys light and dark off, on `<html>`.
 *
 * See the header on why this is a literal here.
 */
const THEME_ATTRIBUTE = 'data-theme';

/** The value that attribute carries for the light block. */
const LIGHT_THEME = 'light';

/** And for the dark one. */
const DARK_THEME = 'dark';

/**
 * The switcher's accessible name while the app is in LIGHT.
 *
 * Note the name states the theme on OFFER rather than the one in
 * force, so the light app is the one labelled dark. That is the same
 * shape the collapse control uses, and the pair is asserted rather
 * than one half of it: a control that changed the document without
 * renaming itself would tell a screen reader the opposite of what
 * happened.
 */
const SWITCH_TO_DARK_NAME = 'Switch to dark theme';

/** The same control's accessible name while the app is in DARK. */
const SWITCH_TO_LIGHT_NAME = 'Switch to light theme';

/**
 * The `fields` key the seeded domain's contract requires of a finding.
 *
 * Read defensively below rather than asserted through the type:
 * `fields` is a JSON payload, so `required` is a rule the pipeline
 * applies and not one this side can lean on.
 */
const SUMMARY_FIELD = 'summary';

/**
 * The surface this spec flips the theme on.
 *
 * The digest, because it is the densest surface in the app — six
 * fixture rows joined out of four reads — so it is the one with the
 * most to lose to a re-render from the chrome above it.
 *
 * Resolved through `withBase`, whose throwing `getSurface` fails this
 * file at import rather than through a confusing URL mismatch if the
 * surface table stops carrying it.
 */
const DIGEST_PATH = withBase(SINGLE_DOMAIN_BASE, 'digest');

/**
 * The element the theme is written onto.
 *
 * `<html>` rather than anything role-addressable: it carries no role
 * at all, and it is the element named by both halves of the contract —
 * `useTheme` writes `document.documentElement`, and `tokens.css`
 * selects `:root`.
 *
 * @param page - The page under test.
 * @returns The document element.
 */
function documentElement(page: Page): Locator {
  return page.locator('html');
}

/**
 * The theme control, addressed by whichever half of its name pair it
 * is currently offering.
 *
 * The band it sits in is a `header` INSIDE `main`, so it is not a
 * `banner` landmark and offers nothing to scope to; the button's
 * accessible name is the whole of the handle on it, which is why the
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
 * Assert the app is in one theme and offering the other.
 *
 * Both halves are checked because either alone is satisfiable by a
 * broken app: an attribute that flips under a control still labelled
 * for the theme already in force is a screen reader being told the
 * opposite of what happened, and a control that renames itself while
 * the document keeps its old attribute is a toggle wired to nothing
 * but its own state.
 *
 * @param page - The page under test.
 * @param theme - The theme expected to be in force.
 * @param offered - The control name expected to be on the screen.
 * @param withheld - The control name expected to be absent.
 */
async function expectTheme(
  page: Page,
  theme: string,
  offered: string,
  withheld: string,
): Promise<void> {
  // Asserted through the locator rather than read with `evaluate`:
  // the attribute lands in an effect, after first paint, so a one-shot
  // read is a race where this retries until it settles.
  await expect(documentElement(page)).toHaveAttribute(
    THEME_ATTRIBUTE,
    theme,
  );

  await expect(controlNamed(page, offered)).toBeVisible();

  // Gone rather than merely unlabelled: the two names belong to one
  // button, so a second control answering to the other half would mean
  // two switchers disagreeing about the theme.
  await expect(controlNamed(page, withheld)).toHaveCount(0);
}

/**
 * Assert the digest drew a row per finding the fixture layer answers
 * with.
 *
 * Read through the same accessor the page reads through, so a missing
 * row is a difference between the data layer and the render rather
 * than between the render and a literal typed here, which could only
 * go stale.
 *
 * This is the second copy of the digest's content check — the first is
 * in `navigation.spec.ts`, where it answers a different question (that
 * a rail entry reached this surface at all). The package's rule is to
 * extract a shared helper at the third copy, so it stays local here.
 *
 * @param main - The content landmark, so a surface rendered in place
 * of the shell fails here rather than passing on some other band's
 * copy of the same words.
 */
async function expectDigestRows(main: Locator): Promise<void> {
  const findings = await fetchFindings(DEFAULT_DOMAIN_SLUG);
  const summaries = findings
    .map((finding) => finding.fields[SUMMARY_FIELD])
    .filter((value): value is string => typeof value === 'string');

  // A fixture set that lost its summaries leaves an empty list, and
  // every assertion in the loop below would then pass — which would
  // make this whole file green about a digest showing nothing.
  expect(summaries).toHaveLength(findings.length);
  expect(summaries.length).toBeGreaterThan(0);

  // Addressed as rows rather than as cells: the row-context trigger
  // carries the same summary in its accessible name (`Actions for …`),
  // so a cell locator would match two per row while a row locator
  // matches the one row holding both.
  //
  // Which is also why the row alone is not the assertion. That trigger
  // puts the summary in the row's OWN accessible name, so a finding
  // column that had stopped rendering it would still be found here.
  // The leading cell is what has to carry it.
  for (const summary of summaries) {
    const row = main.getByRole('row', { name: summary });

    await expect(row).toBeVisible();
    await expect(row.getByRole('cell').first()).toContainText(summary);
  }
}

test.describe('the topbar theme control', () => {
  test('starts light, with the digest drawn', async ({ page }) => {
    // Arrange / Act
    await page.goto(DIGEST_PATH);

    // Assert — light is where the app boots here, and it is a resolved
    // answer rather than a hardcoded one: nothing is stored in a fresh
    // context, so `resolveInitialTheme` falls through to the OS
    // preference, which `playwright.config.ts` pins to light. That pin
    // is what makes every flip below a measured change from a known
    // starting point.
    await expectTheme(
      page,
      LIGHT_THEME,
      SWITCH_TO_DARK_NAME,
      SWITCH_TO_LIGHT_NAME,
    );

    // And the surface the flips are measured against is on the screen
    // before any of them, so a digest that never rendered cannot pass
    // for one the theme left alone.
    await expectDigestRows(page.getByRole('main'));
  });

  test('flips the document to dark', async ({ page }) => {
    // Arrange
    await page.goto(DIGEST_PATH);
    await expectTheme(
      page,
      LIGHT_THEME,
      SWITCH_TO_DARK_NAME,
      SWITCH_TO_LIGHT_NAME,
    );

    // Act
    await controlNamed(page, SWITCH_TO_DARK_NAME).click();

    // Assert — the attribute moved to dark and the control now offers
    // the way back.
    await expectTheme(
      page,
      DARK_THEME,
      SWITCH_TO_LIGHT_NAME,
      SWITCH_TO_DARK_NAME,
    );

    // The digest is still the digest. The theme lives in the topbar,
    // which is above the router's outlet, so this is the assertion
    // that a chrome re-render did not cost the surface its rows.
    await expectDigestRows(page.getByRole('main'));
  });

  test('flips it back to light on a second press', async ({ page }) => {
    // Arrange
    await page.goto(DIGEST_PATH);
    await controlNamed(page, SWITCH_TO_DARK_NAME).click();
    await expectTheme(
      page,
      DARK_THEME,
      SWITCH_TO_LIGHT_NAME,
      SWITCH_TO_DARK_NAME,
    );

    // Act
    await controlNamed(page, SWITCH_TO_LIGHT_NAME).click();

    // Assert — a round trip, which is what separates a toggle from a
    // one-way write: an app that set the attribute to dark and stopped
    // answering the control would pass the case above and fail here.
    await expectTheme(
      page,
      LIGHT_THEME,
      SWITCH_TO_DARK_NAME,
      SWITCH_TO_LIGHT_NAME,
    );

    // Rows in the second theme as well as the first, so the claim is
    // about the flip rather than about dark in particular.
    await expectDigestRows(page.getByRole('main'));
  });
});
