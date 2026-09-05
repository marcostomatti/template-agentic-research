import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { fetchCategorySummaries, fetchTerms } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { SINGLE_DOMAIN_BASE, withBase } from '../../src/routes/paths';

// The term editor's FIELDS presentation, pictured at every width this
// package cares about, in both themes. The matrix is
// {@link BREAKPOINTS} x {@link THEMES} — four widths and two themes,
// so eight baselines, every one of them written by the machine that
// runs this file and none of them tracked.
// `playwright.visual.config.ts` carries why the suite sits outside the
// default `playwright test` run and where the set lands.
//
// ## Why a spec of its own
//
// `breakpoints.spec.ts` sweeps `SURFACES`, and this plan adds no
// surface: the fields presentation is a third drawing inside the
// lexicon's existing `:entityId/edit` address. Nothing about it is
// reachable by adding a row to that matrix, and its header names the
// modal sub-routes as the gap it leaves — "a dialog is drawn over an
// `aria-hidden` app root, so each would be a picture of the surface
// behind it plus a panel". This file closes that gap for ONE address
// in ONE of its three presentations, and takes that sentence
// seriously by screenshotting the PANEL rather than the page.
//
// ## The subject is the dialog, measured rather than chosen
//
// Every shot is `expect(dialog).toHaveScreenshot(...)`, a locator
// clip rather than a `fullPage: true` sibling of the surface sweep.
// Three readings decided it, all taken against this app:
//
// - The panel is centred on the VIEWPORT and not on the content
//   column — 24px of margin either side at 320, 74px at 768, 202px
//   at 1024, 410px at 1440. So its geometry carries no information
//   about the shell behind it that a full-page shot would add.
// - The lexicon surface behind the scrim is already screenshotted at
//   all four widths in both themes by `breakpoints.spec.ts`. A
//   full-page shot here would be eight more pictures of that, dimmed,
//   with the subject occupying 620 of 1440 columns at the widest.
// - The rail is a fixed 264px at all four widths, so a collapse would
//   not move the panel even if one happened mid-run.
//
// The cost of the clip is stated rather than discovered: the shot is
// the panel's bounding box as rendered, so at 320 — where the modal
// body is the one element in the dialog that scrolls internally — it
// records what an operator sees and not the whole form.
//
// ## Where the four widths actually differ, measured
//
// The reflow is at the NARROW end and nowhere else. Measured with the
// editor open on the seeded taxonomy:
//
// - 320: the panel is 272x472 and the two columns STACK — the tree
//   and the mounted form are both 230 wide at the same left edge, one
//   above the other. That single-column drawing is what a quarter of
//   these baselines record, and it is the one thing in the set no
//   other suite in this package can report.
// - 768, 1024 and 1440: the panel is 620x576.625 at all three, with
//   the tree 220 wide and the form 342 beside it at identical
//   offsets. `Modal` caps its own width, so the panel stops growing
//   long before the viewport does.
//
// The three wide cells are still not one baseline written three
// times, and the difference is named here so it is not later read as
// flakiness: 0.12% to 0.59% of pixels differ between them, across 55
// of 578 rows, concentrated in the clip's top row and in the footer.
// The panel is centred vertically, so it sits at a different
// sub-pixel offset in each viewport and its edges rasterise
// differently. What matters for a baseline is that each cell is
// stable against ITSELF, which is what the assert run after the seed
// measures.
//
// Keeping all three is what makes a future breakpoint legible: a diff
// arriving at 768 and 1024 but not at 1440 is a threshold having
// appeared between them, which one wide cell could not report.
//
// ## The chrome is driven BEFORE the dialog opens, because it has to
// ## be
//
// `Modal` is a Radix dialog and an open one sets `aria-hidden` on the
// app root, which takes the whole topbar out of the accessibility
// tree with it. Measured on the lexicon list, before and after the
// card is pressed: the theme switcher and the collapse control each
// resolve to ONE element with the editor shut and to ZERO with it
// open. So `driveTheme` and {@link pinShellChrome} both run on the
// list, and the editor is then reached by CLICKING the card rather
// than by a second `goto` — which keeps one document under the whole
// Arrange, so the pin is a reading of the very page the shot is taken
// on instead of of one that no longer exists.
//
// A `goto` would not have lost the theme, which persists (the app
// stores it and `resolveInitialTheme` reads it back). It would have
// lost the pin, collapse being a `useState` that lives for the life
// of the document.
//
// ## The theme is PRESSED, not emulated
//
// Dark is reached by clicking the app's own `ThemeSwitcher` and then
// asserting `data-theme` on `<html>`, for the reasons
// `breakpoints.spec.ts` gives at length and does not need restating:
// a `test.use({ colorScheme: 'dark' })` block would produce the same
// pictures down a path no operator takes.
//
// The attribute name and the two theme values are SPELLED here rather
// than imported from `src/app-shell/theme.ts`, which exports both.
// `data-theme`, `light` and `dark` are the contract with `tokens.css`
// in ANOTHER package: an app that renamed its attribute would move an
// imported constant with it and go on passing while the deployment
// stopped changing colour. `tests/e2e/theme.spec.ts` is where the
// switcher's own exhaustive claims live; this file asserts only that
// the theme it asked for is the one in force when the shutter falls.
//
// ## What says the picture is of the FIELDS presentation
//
// A screenshot spec cannot report the drawing it read. Every
// presentation of this address stands inside the same `Modal`, so a
// segment click that landed on nothing would shoot the drawing the
// address OPENS on, seed a baseline of it, and match that baseline
// forever — green, and about the wrong component.
//
// The discriminator is `role="tree"`. `@ar/ui`'s `TreeNav` is the
// only thing in either package that draws one and `DynamicForm` is
// the only thing that mounts it, so a visible tree is the fields
// presentation and nothing else. {@link openFieldsPresentation}
// asserts it before every shot, together with the segment's own
// `aria-selected` and a row count crossed against the PAYLOAD — the
// tree draws one row per entry plus one for the list itself, and the
// entry count comes from `fetchTerms` rather than from any module the
// form renders through, so an empty form cannot satisfy it.
//
// That discriminator is a reading whose expected answer is "present",
// which says nothing until something is known to make it absent. The
// describe block at the foot of this file is that control: it opens
// the same address, reads ZERO trees in the presentation the editor
// opens on, presses the segment, and reads one.
//
// ## What makes these pictures deterministic
//
// The payload. Every case opens a fresh document and this file types
// nothing, so the form is drawn from the seeded fixtures through the
// session draft store's empty state. There is no wall clock anywhere
// in the panel — no relative time, no stamp — so a baseline seeded
// today still matches next quarter.
//
// Motion. Measured over the open modal at both levels: 127 elements
// at the list level and 77 drilled in, with ZERO keyframe animations
// in either. The presentation's whole motion budget is pointer-driven
// transitions, none of which a screenshot can catch. Nothing here
// relies on that — `toHaveScreenshot`'s own defaults disable
// animations regardless — but it is why no freeze step appears below.
//
// Loading. Every case waits out {@link SKELETON} twice: once on the
// list and once inside the editor, whose body is a shimmer until its
// term read settles. A `Skeleton` is `aria-hidden`, so a shot taken
// mid-read would be a picture of stand-ins that differs run to run.
//
// Fonts. `tokens.css`'s webfont `@import` is dropped by postcss and
// the app renders in the host's `system-ui` fallback, so there is no
// webfont race to lose — and no shared typeface either, which is one
// more reason the set never leaves the machine that wrote it.
//
// ## What this file deliberately does not claim
//
// The drilled-in node. The list level is what the presentation opens
// on, and it is where `TreeNav`, `Breadcrumb` and `NodeForm`'s list
// branch — drill-in rows, both move controls, the `Sortable` wrapper
// — are all on screen at once. Drilling into an entry would draw the
// four leaf controls instead and double the set to sixteen. Recorded
// as the gap it is: `FieldControl`'s own drawing has no picture.
//
// The other two presentations. Buckets and JSON are carried-in
// drawings of the same address, unchanged by the wave this file
// landed in.
//
// The domain-scoped base. Both route trees are built from one
// factory and `src/routes/router.test.ts` pins that every declared
// pair resolves under both; covering the second here would double
// the set for chrome this file has already clipped away.
//
// Any browser but chromium. The config declares one project.

/**
 * The class `@ar/ui`'s `Skeleton` renders its shimmer with.
 *
 * The settled-state handle for the whole app, and unique to that
 * component. The lexicon list draws one per card while its read is in
 * flight and the editor draws one for its term read, so "no shimmer
 * anywhere" is one locator that waits out every stand-in on both.
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
 * exports neither, so these two strings are the shell's reading of
 * its own collapse flag written down where a test can reach it.
 */
const COLLAPSE_CONTROL_NAME = 'Collapse sidebar';

/** The same control's accessible name while the rail is COLLAPSED. */
const EXPAND_CONTROL_NAME = 'Expand sidebar';

/** Which surface the editor is a sub-route of. */
const LEXICON_SURFACE_ID = 'lexicon';

/**
 * What the segment that swaps to the fields presentation is called.
 *
 * Retyped rather than read off `pages/lexicon/terms.ts`, which is the
 * rule this repo splits user-visible text from structural spellings
 * by: a locator derived from the table the control is BUILT from
 * agrees with whatever that table says, and a reworded segment would
 * then travel to an operator with nothing reporting it.
 */
const FIELDS_TAB_NAME = 'Fields';

/**
 * How many tree rows one entry accounts for, plus the list's own.
 *
 * `buildFormTree` gives the list a node of its own above its items,
 * so the row count is the payload's length plus one. Spelled as a
 * constant so the crossing below reads as arithmetic over the
 * fixtures rather than as a magic offset.
 */
const LIST_LEVEL_ROWS = 1;

/** One viewport the sweep screenshots at. */
interface Breakpoint {
  /** The width the breakpoint is named for. */
  readonly width: number;
  /**
   * A plausible device height to pair it with.
   *
   * It is not part of the breakpoint's identity and does not appear
   * in a baseline name. What it decides is whether the panel is
   * clipped: `Modal` sizes itself against the viewport, and at 320 a
   * 568px one is what leaves the body scrolling inside its own box.
   */
  readonly height: number;
}

/**
 * The four widths, which are the web ruleset's own breakpoint set.
 *
 * Heights are the usual device pairings, and the same four
 * `breakpoints.spec.ts` uses: a small phone, a tablet in both
 * orientations and a laptop.
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
   * so the app resolves light on its own. Asserting that is a reading
   * of the boot state; pressing twice to arrive back where the page
   * started would not be.
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

/** Which category's editor every case below pictures. */
interface Subject {
  /** Its id, which is the segment the editor address carries. */
  readonly categoryId: number;
  /** Its name, which is the accessible name of its card. */
  readonly name: string;
  /** How many terms it holds, for the tree's row crossing. */
  readonly termCount: number;
}

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
function first<T>(values: readonly T[], what: string): T {
  const [value] = values;

  if (value === undefined) {
    throw new Error(`No ${what} to read.`);
  }

  return value;
}

/** The lexicon list path, which is where every case starts. */
function listPath(): string {
  return withBase(SINGLE_DOMAIN_BASE, LEXICON_SURFACE_ID);
}

/**
 * The baseline file name for one cell of the matrix.
 *
 * Passed to `toHaveScreenshot` as `{arg}`, which the config's
 * `snapshotPathTemplate` places under
 * `visual/__screenshots__/<this file>/` — a directory of its own, so
 * nothing here can collide with the surface sweep's forty-eight.
 * Named explicitly rather than left to the runner's default, which
 * derives a name from the TEST TITLE: a reworded title would orphan
 * every baseline it named.
 *
 * The theme rides in the name because the two shots differ by nothing
 * else, and the width because the panel is the same tree at all four.
 *
 * @param width - The breakpoint's width.
 * @param theme - The theme in force.
 * @returns The file name, extension included.
 */
function screenshotName(width: number, theme: string): string {
  return `lexicon-fields-${String(width)}-${theme}.png`;
}

/**
 * Every baseline name the sweep below will ask for.
 *
 * Walks the same two tables the generated blocks do, so the guard
 * test reads the real name set rather than a second derivation of it.
 *
 * @returns One name per cell of the matrix, in generation order.
 */
function everyScreenshotName(): readonly string[] {
  return BREAKPOINTS.flatMap(function namesForWidth(breakpoint) {
    return THEMES.map(function nameForTheme(themeCase) {
      return screenshotName(breakpoint.width, themeCase.theme);
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
 * Which category the sweep pictures, and how many terms it holds.
 *
 * Read through the page's own fixture accessors rather than pinned to
 * a name, so a taxonomy that is reordered moves the baselines with it
 * instead of leaving every locator here matching nothing. The term
 * count comes back for the tree crossing, and it is an INDEPENDENT
 * source: it is read from the data layer and never from the tree
 * projection the form draws from, so a form drawing no rows at all
 * cannot satisfy it.
 *
 * @returns The category to open, and its size.
 * @throws If the fixture domain carries no category, or the first one
 * carries no term.
 */
async function pickSubject(): Promise<Subject> {
  const summaries = await fetchCategorySummaries(DEFAULT_DOMAIN_SLUG);
  const summary = first(summaries, 'category in the fixture taxonomy');
  const { id, name } = summary.category;
  const terms = await fetchTerms(DEFAULT_DOMAIN_SLUG, id);

  // A category that lost its terms would draw a tree of one row and a
  // form of none, and every picture below would record that as if it
  // were the presentation.
  expect(terms.length).toBeGreaterThan(0);

  return { categoryId: id, name, termCount: terms.length };
}

/**
 * Put the app in one theme and prove it is the one in force.
 *
 * Runs on the lexicon LIST, before any dialog is opened: the switcher
 * lives in the topbar, which an open editor puts behind `aria-hidden`
 * along with the rest of the app root.
 *
 * @param page - The page the list has been opened on, settled.
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

  // The flip re-renders everything under the topbar, the surface's
  // cached read included.
  await expectSettled(page);
}

/**
 * Pin the shell chrome to the state every baseline is taken over.
 *
 * The control's name is the shell's own reading of
 * `isSidebarCollapsed`, so a rail that had narrowed under a button
 * still calling itself Collapse would fail here where a width check
 * would pass. Both halves of the pair are read: the expanded name
 * present, and the collapsed one absent — they belong to ONE button,
 * so a second control answering the other half would mean two
 * controls disagreeing about the flag.
 *
 * What this pin does NOT do is decide any pixel, and saying so is
 * part of it. Every shot below is clipped to the dialog, which is
 * centred on the viewport and sized against it; the rail is a fixed
 * 264px at all four widths and cannot reach the panel's box. So the
 * `breakpoints.spec.ts` sibling's stillness reading — a window
 * reduction over the rail's width, there because a full-page shot can
 * straddle the 150ms collapse transition — is deliberately not
 * restated: a clipped shot has nothing for it to defend, and
 * `toHaveScreenshot` retries to stability regardless. This is a
 * precondition on the app the editor is opened from.
 *
 * @param page - The page the list has been opened on, settled.
 */
async function pinShellChrome(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: COLLAPSE_CONTROL_NAME, exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: EXPAND_CONTROL_NAME, exact: true }),
  ).toHaveCount(0);
}

/**
 * The rows the structure column draws, at any depth.
 *
 * `TreeNav` pins each row's name with `aria-label`, so this addresses
 * rows and never the tree's own container.
 *
 * @param dialog - The open editor.
 * @returns Every row in the tree.
 */
function treeRows(dialog: Locator): Locator {
  return dialog.getByRole('treeitem');
}

/**
 * Open one category's editor by CLICKING its card, and settle it.
 *
 * A click rather than a `goto` for the reason the file header gives:
 * the theme and the collapse pin are both readings of the document
 * the list was drawn on, and a second navigation would throw that
 * document away.
 *
 * @param page - The page the list has been opened on, settled.
 * @param subject - Which category to open.
 * @returns The open dialog, in the presentation it opens on.
 */
async function openEditor(page: Page, subject: Subject): Promise<Locator> {
  await page
    .getByRole('main')
    .getByRole('button', { name: subject.name, exact: true })
    .click();

  const dialog = page.getByRole('dialog');

  // The dialog first, then the settled state, and only then anything
  // inside it: a locator taken against a body that has not arrived
  // burns the whole budget and reports the exhaustion against
  // whichever assertion comes next.
  await expect(dialog).toBeVisible();
  await expectSettled(page);

  return dialog;
}

/**
 * Swap an open editor to the fields presentation, and prove it took.
 *
 * Three readings, and none of them is the picture. The segment's own
 * `aria-selected` says the press landed on the control. The tree says
 * WHICH drawing is up, `TreeNav` being the only thing in either
 * package that renders one. And the row count crossed against the
 * payload says the drawing has the seeded data in it rather than an
 * empty shell — the only one of the three whose source is not a
 * module the form itself renders through.
 *
 * @param dialog - The open editor.
 * @param subject - The category it was opened for.
 */
async function showFields(
  dialog: Locator,
  subject: Subject,
): Promise<void> {
  const segment = dialog.getByRole('tab', {
    name: FIELDS_TAB_NAME,
    exact: true,
  });

  await segment.click();
  await expect(segment).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByRole('tree')).toBeVisible();
  await expect(treeRows(dialog)).toHaveCount(
    subject.termCount + LIST_LEVEL_ROWS,
  );
}

/**
 * Everything one shot is taken over, from a cold page.
 *
 * The order is load-bearing and the file header carries why: list,
 * settle, theme, pin, then the click that opens the editor — the two
 * chrome controls being unreachable by role once a dialog stands.
 *
 * @param page - A fresh page.
 * @param themeCase - The theme to picture in.
 * @returns The open editor, in the fields presentation.
 */
async function openFieldsPresentation(
  page: Page,
  themeCase: ThemeCase,
): Promise<Locator> {
  const subject = await pickSubject();

  await page.goto(listPath());
  await expectSettled(page);
  await driveTheme(page, themeCase);
  await pinShellChrome(page);

  const dialog = await openEditor(page, subject);

  await showFields(dialog, subject);

  return dialog;
}

test.describe('the fields presentation matrix', () => {
  test('names one baseline per cell, with no two colliding', () => {
    // Arrange — both tables are hand-written, and an empty one would
    // leave every generated block below covering nothing while this
    // file still passed.
    expect(BREAKPOINTS.length).toBeGreaterThan(0);
    expect(THEMES.length).toBeGreaterThan(0);

    // Act
    const names = everyScreenshotName();

    // Assert — the product, so the sweep really is total over the two
    // tables rather than a subset of them.
    expect(names).toHaveLength(BREAKPOINTS.length * THEMES.length);

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
    // Chrome` froze — scale factor, mobile flag, touch — still
    // applies.
    test.use({
      viewport: { width: breakpoint.width, height: breakpoint.height },
    });

    for (const themeCase of THEMES) {
      test(`the mounted form in ${themeCase.theme}`, async ({ page }) => {
        // Arrange
        const dialog = await openFieldsPresentation(page, themeCase);

        // The theme once more, at the moment the shutter falls rather
        // than only when it was asked for: this is the one attribute
        // the whole picture is a function of, and the assertion above
        // was taken before the editor existed.
        await expect(page.locator('html')).toHaveAttribute(
          THEME_ATTRIBUTE,
          themeCase.theme,
        );

        // And nothing on the page is still a stand-in. The editor's
        // own read settled inside `openEditor`; this covers the
        // presentation swap that came after it.
        await expectSettled(page);

        // Act / Assert — the panel alone. See the file header for
        // why this is a locator clip and not a full-page shot of the
        // surface the scrim is over.
        await expect(dialog).toHaveScreenshot(
          screenshotName(breakpoint.width, themeCase.theme),
        );
      });
    }
  });
}

test.describe('the tree reading every shot leans on', () => {
  // Any width serves — this block reads element counts and takes no
  // picture — so it takes the widest, where the panel is furthest
  // from the clipping the narrow end does.
  test.use({ viewport: { width: 1440, height: 900 } });

  test('reads no tree until the segment is pressed', async ({ page }) => {
    // Arrange — the same walk every case above makes, stopped one
    // step short of the press.
    const subject = await pickSubject();
    const themeCase = first(THEMES, 'theme in the table');

    await page.goto(listPath());
    await expectSettled(page);
    await driveTheme(page, themeCase);
    await pinShellChrome(page);

    const dialog = await openEditor(page, subject);

    // Act / Assert — the presentation the address OPENS on draws no
    // tree. Without this the reading inside `showFields` is a scan
    // that cannot fail: a press that landed on nothing, or a
    // discriminator aimed at an element every drawing renders, would
    // let a baseline of the wrong presentation be seeded and then
    // matched forever.
    await expect(dialog.getByRole('tree')).toHaveCount(0);

    // And the same reading comes back positive one press later, over
    // the same dialog, which is what makes the zero above a property
    // of the drawing rather than of the locator.
    await showFields(dialog, subject);
    await expect(dialog.getByRole('tree')).toHaveCount(1);
  });
});
