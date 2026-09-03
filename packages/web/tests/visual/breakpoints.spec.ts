import type { Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';

// The breakpoint sweep: a full-page screenshot of every surface at
// every width this package cares about, in both themes. The matrix is
// SURFACES x {@link BREAKPOINTS} x {@link THEMES} — six surfaces, four
// widths and two themes at the time of writing, so forty-eight
// baselines, every one of them written by the machine that runs this
// file and none of them tracked. `playwright.visual.config.ts` carries
// why the suite sits outside the default `playwright test` run and
// where the set lands; this file is only the matrix over it.
//
// Every address is built from `routes/paths.ts`, so a surface added to
// `SURFACES` joins the sweep with nothing here edited — and eight new
// baselines to seed.
//
// ## The theme is PRESSED, not emulated
//
// Dark is reached by clicking the app's own `ThemeSwitcher` and then
// asserting `data-theme` on `<html>`. The obvious alternative — a
// second `test.use({ colorScheme: 'dark' })` block — would produce
// visually identical pictures, because `resolveInitialTheme` falls
// through to the media query when nothing is stored. It is not used,
// for two reasons. It would record a path no operator takes, and it
// would leave the switcher itself unexercised at every breakpoint
// except whichever one `theme.spec.ts` happens to run at. Pressing the
// control means each dark baseline is exactly one press away from the
// light one beside it, so a diff of the pair is the theme and nothing
// else.
//
// The attribute name and the two theme values are SPELLED here rather
// than imported from `src/app-shell/theme.ts`, which exports both, and
// the switcher's two accessible names are spelled because `@ar/ui`
// composes them from a template and exports neither. `data-theme`,
// `light` and `dark` are the contract with `tokens.css` in ANOTHER
// package: an app that renamed its attribute would move an imported
// constant with it and go on passing while the deployment stopped
// changing colour. Same reading as `tests/e2e/theme.spec.ts`, which is
// where the exhaustive control-name pair is asserted — this file
// asserts only that the theme it asked for is the one in force.
//
// ## The collapse pin
//
// `AppLayout` owns collapse as a `useState(false)` that lives for the
// life of the document, so every `page.goto` here mounts the rail
// EXPANDED. That is the state every baseline records, and it is pinned
// rather than assumed: {@link pinShellChrome} reads the control's own
// accessible name (which is the shell's reading of the flag) and then
// measures that the rail is not moving.
//
// The measurement matters because `@ar/ui`'s `appShellSidebar` carries
// `transition-[width]` at a measured 150ms, over a 264px → 64px move.
// A single width read taken during that window is a number, not a
// state, so the reading is a WINDOW REDUCTION instead: the widest
// deviation across ten `requestAnimationFrame` samples taken inside
// one browser task. A still rail answers 0 and a moving one cannot
// answer 0 in any window, which is what makes it safe to hand to
// `expect.poll` — poll retries until an assertion passes, and an
// instantaneous read would be satisfied by whichever frame happened to
// match.
//
// That zero is a scan whose expected answer is nothing, so it carries
// its own control: the describe block at the foot of this file drives
// the same reading over a rail that IS collapsing and requires it to
// come back moving. Measured 0 settled against 191 mid-transition.
//
// ## What makes these pictures deterministic, measured rather than
// ## assumed
//
// Relative times. Every `FormattedRelativeTime` on a surface is passed
// `now={FIXTURE_NOW}` and no rendered module reads the wall clock at
// all, so a baseline seeded today still matches next quarter. Without
// that a fixture written as `8 hours ago` would age into `3 months
// ago` and every baseline would rot on a timer.
//
// Fonts. `tokens.css` carries an `@import url(...)` for two Google
// families, and postcss DROPS it (the dev server prints the
// `@import statements must precede all other statements` warning on
// every boot). Measured: zero offsite requests and
// `document.fonts.size === 0`, so the app renders in the host's
// `system-ui` fallback. There is no webfont race for a screenshot to
// lose — and there is also no shared typeface, which is one more
// reason the set never leaves the machine that wrote it.
//
// Motion. `toHaveScreenshot`'s own defaults disable animations, so the
// two `pulseRing` dots on the sources surface are frozen at a fixed
// frame rather than caught wherever they were. Nothing is restated in
// the options below; see the config's note on inheriting them.
//
// Loading. Every case waits out {@link SKELETON} before it reads
// anything. A `Skeleton` is `aria-hidden` and shimmers, so a shot
// taken mid-read would be a picture of stand-ins that differs run to
// run.
//
// ## What a full-page shot actually captures here
//
// `AppShell` is `h-full` inside a body with no height, so the shell
// grows with its content and the DOCUMENT scrolls — measured: the
// sources surface reports a 1700px scroll height inside a 568px
// viewport. So `fullPage: true` is not decoration; it reaches
// everything below the fold. Where the shell is shorter than the
// viewport the image is the viewport instead, which is why each
// breakpoint pairs its width with a plausible device height rather
// than leaving it to a default.
//
// ## The 320 reading, recorded rather than repaired
//
// The rail is a fixed `var(--sidebar-w)` at every width — 264px,
// measured at all four — and the shell has no responsive collapse of
// any kind. At 320 that leaves a 56px content column, and the twelve
// baselines at that width record exactly that. It is the app as built,
// which is what a visual baseline is for; repairing it is a
// `packages/ui` shell decision and out of this file's reach.
//
// The 320 viewport is also a narrow DESKTOP one rather than a mobile
// emulation: only `viewport` is overridden, so `Desktop Chrome`'s
// `deviceScaleFactor`, `isMobile` and `hasTouch` all still apply.
//
// ## What this file deliberately does not claim
//
// The domain-scoped base. Both trees are built from one
// `routesBelowBase()` factory and `src/routes/router.test.ts` pins that
// every declared pair resolves under both, but the chrome under a slug
// is not identical and covering it would double the set.
//
// The modal sub-routes. Seven more addresses, and a dialog is drawn
// over an `aria-hidden` app root, so each would be a picture of the
// surface behind it plus a panel. Recorded as the gap it is.
//
// Any browser but chromium. The config declares one project; a
// cross-engine matrix belongs to `@ar/ui`'s own visual suite.

/**
 * The class `@ar/ui`'s `Skeleton` renders its shimmer with.
 *
 * The settled-state handle for the whole app, and unique to that
 * component. Every page renders one while its read is in flight, so
 * "no shimmer anywhere" is one locator that waits out every stand-in.
 */
const SKELETON = '.animate-shimmer';

/**
 * The attribute `tokens.css` keys light and dark off, on `<html>`.
 *
 * See the file header on why this is a literal.
 */
const THEME_ATTRIBUTE = 'data-theme';

/** The value that attribute carries for the light block. */
const LIGHT_THEME = 'light';

/** And for the dark one. */
const DARK_THEME = 'dark';

/**
 * The switcher's accessible name while the app is in LIGHT.
 *
 * The name states the theme on OFFER rather than the one in force, so
 * the light app is the one labelled dark.
 */
const SWITCH_TO_DARK_NAME = 'Switch to dark theme';

/** The same control's accessible name while the app is in DARK. */
const SWITCH_TO_LIGHT_NAME = 'Switch to light theme';

/**
 * The collapse control's accessible name while the rail is EXPANDED.
 *
 * `AppShellTopbar` holds both halves of the pair as literals and
 * exports neither, so these two strings are the shell's reading of its
 * own collapse flag written down where a test can reach it.
 */
const COLLAPSE_CONTROL_NAME = 'Collapse sidebar';

/** The same control's accessible name while the rail is COLLAPSED. */
const EXPAND_CONTROL_NAME = 'Expand sidebar';

/** How many animation frames one stillness reading samples over. */
const SAMPLE_FRAMES = 10;

/**
 * How far the rail may deviate across a window and still read STILL.
 *
 * Zero, because a rail nobody asked to move does not move at all: the
 * transition is driven by a class swap, not by a spring settling. The
 * constant exists so the control at the foot of this file can state
 * the opposite bound against the same name.
 */
const STILL_DEVIATION = 0;

/**
 * How far it must deviate to read MOVING.
 *
 * One CSS pixel, so the claim is "moving at all" rather than a pinned
 * distance. The measured value over a 264px → 64px collapse is about
 * 191, so the margin is wide; pinning that number would make the case
 * a reading of the easing curve instead of of the transition.
 */
const MOVING_DEVIATION = 1;

/** One viewport the sweep screenshots at. */
interface Breakpoint {
  /** The width the breakpoint is named for. */
  readonly width: number;
  /**
   * A plausible device height to pair it with.
   *
   * It is not part of the breakpoint's identity and does not appear in
   * a baseline name. What it decides is the image height wherever the
   * shell is SHORTER than the viewport, since a full-page shot falls
   * back to the viewport there.
   */
  readonly height: number;
}

/**
 * The four widths, which are the web ruleset's own breakpoint set.
 *
 * Heights are the usual device pairings: a small phone, a tablet in
 * both orientations and a laptop.
 */
const BREAKPOINTS: readonly Breakpoint[] = [
  { width: 320, height: 568 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

/** One theme the sweep screenshots in, and how it is reached. */
interface ThemeCase {
  /** What `data-theme` must read once this theme is in force. */
  readonly theme: string;
  /** The switcher's accessible name while it is in force. */
  readonly offered: string;
  /**
   * The press that reaches it, or `null` where the app already boots
   * there.
   *
   * Light is `null` rather than a second press: the config pins
   * `colorScheme: 'light'` and nothing is stored in a fresh context,
   * so `resolveInitialTheme` resolves light on its own. Asserting that
   * is a reading of the boot state; pressing twice to arrive back
   * where the page started would not be.
   */
  readonly reachedBy: string | null;
}

/** Both themes, light first because it is where the app boots. */
const THEMES: readonly ThemeCase[] = [
  {
    theme: LIGHT_THEME,
    offered: SWITCH_TO_DARK_NAME,
    reachedBy: null,
  },
  {
    theme: DARK_THEME,
    offered: SWITCH_TO_LIGHT_NAME,
    reachedBy: SWITCH_TO_DARK_NAME,
  },
];

/**
 * The first member, or a failure naming what was empty.
 *
 * `noUncheckedIndexedAccess` makes a guard obligatory; this is what
 * keeps it from being a non-null assertion.
 *
 * @param values - Whatever table is being read.
 * @param what - What was expected, for the failure message.
 * @returns The first member.
 * @throws If there is none.
 */
function firstOf<T>(values: readonly T[], what: string): T {
  const [value] = values;

  if (value === undefined) {
    throw new Error(`No ${what} to read.`);
  }

  return value;
}

/**
 * The baseline file name for one cell of the matrix.
 *
 * Passed to `toHaveScreenshot` as `{arg}`, which the config's
 * `snapshotPathTemplate` places under
 * `visual/__screenshots__/<this file>/`. Named explicitly rather than
 * left to the runner's default, which derives a name from the TEST
 * TITLE — so a reworded title would orphan every baseline it named.
 *
 * The theme rides in the name because the two shots differ by nothing
 * else, and the width because the surface is the same tree at all
 * four.
 *
 * @param surfaceId - Nav id of the surface, which is its route segment.
 * @param width - The breakpoint's width.
 * @param theme - The theme in force.
 * @returns The file name, extension included.
 */
function screenshotName(
  surfaceId: string,
  width: number,
  theme: string,
): string {
  return `${surfaceId}-${String(width)}-${theme}.png`;
}

/**
 * Every baseline name the sweep below will ask for.
 *
 * Walks the same three tables the generated blocks do, so the guard
 * test reads the real name set rather than a second derivation of it.
 *
 * Written with named function expressions rather than arrows because
 * `arrow-body-style` and `implicit-arrow-linebreak` between them leave
 * a three-deep arrow nest no wrapping satisfies at this width.
 *
 * @returns One name per cell of the matrix, in generation order.
 */
function everyScreenshotName(): readonly string[] {
  return SURFACES.flatMap(function namesForSurface(surface) {
    return BREAKPOINTS.flatMap(function namesForWidth(breakpoint) {
      return THEMES.map(function nameForTheme(themeCase) {
        return screenshotName(
          surface.id,
          breakpoint.width,
          themeCase.theme,
        );
      });
    });
  });
}

/**
 * Wait for every loading stand-in on the page to have resolved.
 *
 * @param page - The page an address has been opened on.
 */
async function expectSettled(page: Page): Promise<void> {
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

/**
 * The widest the rail's width deviates across a window of frames.
 *
 * A window reduction rather than an instant, for the reason the file
 * header gives: an instantaneous width is a number and cannot say
 * whether the rail is moving. Both the sample loop and the optional
 * press run inside ONE browser task, because the transition is 150ms
 * and a press issued from node followed by a read from node measures
 * only the settled state either side of it.
 *
 * The rail is addressed as the document's `aside` rather than by role
 * because this runs inside the browser, where no role engine is
 * available; `AppShellSidebar` renders the only one on the page.
 *
 * @param page - The page under test.
 * @param pressFirst - Accessible name of a control to click before
 * sampling, or `null` to sample the page as it stands.
 * @returns The deviation, in CSS pixels.
 */
async function railWidthDeviation(
  page: Page,
  pressFirst: string | null,
): Promise<number> {
  return page.evaluate(
    async ({ control, frames }) => {
      const rail = document.querySelector('aside');

      if (!(rail instanceof HTMLElement)) {
        throw new Error('the shell rendered no rail, so it has no width');
      }

      if (control !== null) {
        const buttons = [...document.querySelectorAll('button')];
        const trigger = buttons.find(
          (candidate) => candidate.getAttribute('aria-label') === control,
        );

        // Named rather than silent: a missing control would otherwise
        // leave the sample loop reading a rail nobody asked to move,
        // which is exactly what a still reading looks like.
        if (trigger === undefined) {
          throw new Error(`no control is named ${control}`);
        }

        trigger.click();
      }

      const widths: number[] = [];

      await new Promise<void>((resolve) => {
        const tick = (): void => {
          widths.push(rail.getBoundingClientRect().width);

          if (widths.length >= frames) {
            resolve();

            return;
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });

      return Math.max(...widths) - Math.min(...widths);
    },
    { control: pressFirst, frames: SAMPLE_FRAMES },
  );
}

/**
 * Pin the shell chrome to the state every baseline records.
 *
 * Two readings, and neither alone is the claim. The control's name is
 * the shell's own reading of `isSidebarCollapsed`, so a rail that had
 * narrowed under a button still calling itself Collapse would pass a
 * width check and fail here. The stillness reading is what says the
 * shot cannot straddle the 150ms width transition, and it is polled
 * because a window reduction is the one shape `expect.poll` cannot be
 * satisfied by mid-animation.
 *
 * @param page - The page an address has been opened on, settled.
 */
async function pinShellChrome(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: COLLAPSE_CONTROL_NAME, exact: true }),
  ).toBeVisible();

  // Absent rather than merely unlabelled: the two names belong to one
  // button, so a second one answering to the other half would mean two
  // controls disagreeing about the flag.
  await expect(
    page.getByRole('button', { name: EXPAND_CONTROL_NAME, exact: true }),
  ).toHaveCount(0);

  await expect
    .poll(async () => railWidthDeviation(page, null))
    .toBe(STILL_DEVIATION);
}

/**
 * Put the app in one theme and prove it is the one in force.
 *
 * @param page - The page an address has been opened on, settled.
 * @param themeCase - The theme to reach, and how.
 */
async function driveTheme(page: Page, themeCase: ThemeCase): Promise<void> {
  if (themeCase.reachedBy !== null) {
    await page
      .getByRole('button', { name: themeCase.reachedBy, exact: true })
      .click();
  }

  // The document first, because that attribute is what `tokens.css`
  // selects on and so is the whole of what the picture depends on.
  // Asserted through the locator rather than read once: the write
  // lands in an effect, after first paint.
  await expect(page.locator('html')).toHaveAttribute(
    THEME_ATTRIBUTE,
    themeCase.theme,
  );

  // And the control agrees, which is what separates a document
  // attribute somebody set from a switcher that is actually bound to
  // the state the app thinks it is in.
  await expect(
    page.getByRole('button', { name: themeCase.offered, exact: true }),
  ).toBeVisible();

  // The flip re-renders everything under the topbar, six pages' worth
  // of cached reads included. Cheap to re-assert, and it is the only
  // thing that would catch a surface that went back to a stand-in.
  await expectSettled(page);
}

test.describe('the breakpoint matrix', () => {
  test('names one baseline per cell, with no two cells colliding', () => {
    // Arrange — every table below is derived or hand-written, and an
    // empty one would leave every generated block below covering
    // nothing while this file still passed.
    expect(SURFACES.length).toBeGreaterThan(0);
    expect(BREAKPOINTS.length).toBeGreaterThan(0);
    expect(THEMES.length).toBeGreaterThan(0);

    // Act
    const names = everyScreenshotName();

    // Assert — the product, so the sweep really is total over the
    // three tables rather than a subset of them.
    expect(names).toHaveLength(
      SURFACES.length * BREAKPOINTS.length * THEMES.length,
    );

    // And distinct, which is the failure worth catching by hand: two
    // cells answering one file name would quietly share a baseline,
    // and whichever ran second would either overwrite it or diff
    // against the other cell's picture forever.
    expect(new Set(names).size).toBe(names.length);
  });
});

for (const breakpoint of BREAKPOINTS) {
  test.describe(`at ${String(breakpoint.width)}`, () => {
    // Only the viewport is overridden, so everything else `Desktop
    // Chrome` froze — scale factor, mobile flag, touch — still applies.
    test.use({
      viewport: { width: breakpoint.width, height: breakpoint.height },
    });

    for (const surface of SURFACES) {
      for (const themeCase of THEMES) {
        test(`${surface.id} in ${themeCase.theme}`, async ({ page }) => {
          // Arrange
          await page.goto(withBase(SINGLE_DOMAIN_BASE, surface.id));
          await expectSettled(page);
          await driveTheme(page, themeCase);
          await pinShellChrome(page);

          // Act / Assert — full page, because the shell grows past the
          // viewport on most of these and the document is what
          // scrolls.
          await expect(page).toHaveScreenshot(
            screenshotName(surface.id, breakpoint.width, themeCase.theme),
            { fullPage: true },
          );
        });
      }
    }
  });
}

test.describe('the stillness reading the pin leans on', () => {
  // Any width serves — the rail is chrome and is 264px at all four —
  // so this block takes the widest, where the collapse leaves the most
  // room to move.
  test.use({ viewport: { width: 1440, height: 900 } });

  test('reads a settled rail still and a collapsing one moving', async ({
    page,
  }) => {
    // Arrange — the rail is chrome, so which surface is underneath it
    // does not matter; the first in the table keeps a surface id out
    // of this file that it does not otherwise need.
    const surface = firstOf(SURFACES, 'surface in the route table');

    await page.goto(withBase(SINGLE_DOMAIN_BASE, surface.id));
    await expectSettled(page);

    // The reading every screenshot case above leans on, taken here as
    // the negative half of the pair.
    await pinShellChrome(page);

    // Act — the press and the frame loop in ONE browser task. A click
    // issued from node would return after the 150ms transition had
    // already finished, and the sample would read the same zero.
    const moving = await railWidthDeviation(page, COLLAPSE_CONTROL_NAME);

    // Assert — without this the zero above is a scan that cannot fail:
    // a reading that had stopped measuring anything, or one aimed at
    // an element that never moves, answers 0 exactly as a still rail
    // does.
    expect(moving).toBeGreaterThan(MOVING_DEVIATION);

    // And the press really was the collapse, not some other button
    // that happened to carry the name.
    await expect(
      page.getByRole('button', { name: EXPAND_CONTROL_NAME, exact: true }),
    ).toBeVisible();
  });
});
