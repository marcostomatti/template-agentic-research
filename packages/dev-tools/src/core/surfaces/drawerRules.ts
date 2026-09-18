/**
 * @packageDocumentation
 * The drawer's decisions that are statable as a value: which edge the
 * switcher moves the panel to, what glyph and what sentence each
 * control carries, and which drawers have been opened at least once.
 *
 * `./Drawer.tsx` owns the DOM — a fixed panel, a header, an edge tab
 * and the click that toggles it. Everything it decides that is a plain
 * function of plain values is here, which is the package's two-runner
 * discipline as `../../../vitest.config.ts` states it: the jsdom
 * vitest project collects `.ts` only, so a decision left inside the
 * `.tsx` is reachable by the forced Playwright spec and by nothing
 * else. A placement swap, an arrow and an accessible name are exactly
 * the kind of thing worth pinning by a unit case, so they are here and
 * the component calls them.
 *
 * Two of the functions below are NOT pure: {@link hasStoredDrawerHandle}
 * and {@link rememberDrawerHandle} read and write the one storage key
 * through `../settings.ts`. They live here rather than in the
 * component for the same reason as the rest — a read-modify-write over
 * a persisted set is a decision, and the jsdom project can run it —
 * and they touch `../settings.ts` and nothing else, so the
 * one-storage-key law of decision 5 holds through them.
 *
 * ## The switcher swaps a PAIR; it does not rotate through four
 *
 * {@link nextDrawerPlacement} answers `start` for `end`, `top` for
 * `bottom` and each the other way. It never turns a side drawer into
 * a top one, and the task's wording — cycling start/end for side
 * placements and top/bottom for the others — is that restriction
 * spelled out.
 *
 * The reason is that the switcher exists to move the panel off
 * whatever it is covering, and the two axes are not interchangeable
 * for that: `../styles.css` gives a side drawer an inline size of
 * `min(24rem, 100vw)` over the full block axis and a top/bottom drawer
 * a block size of `min(22rem, 100vh)` over the full inline axis. A
 * rotation through all four would therefore reshape the surface as
 * well as move it, and a feature that laid its content out for a tall
 * narrow panel would find it wide and short after one click on a
 * control whose whole promise is "put this somewhere else".
 *
 * ## The glyphs, and why two of them are angle quotes
 *
 * The inline pair is U+2039 and U+203A, the single angle quotation
 * marks, rather than U+2190 and U+2192 — because `start` and `end` in
 * `../types.ts` are writing-direction relative and a left arrow is
 * not. Both angle quotes carry `Bidi_Mirrored=Yes`, so the bidi
 * algorithm renders them mirrored at an RTL embedding level and the
 * tab on an RTL document's start edge points into the page rather
 * than out of it, with no second table and no `dir` read.
 *
 * Measured, with a control: `/\p{Bidi_Mirrored}/u` answers `true` for
 * `\u2039` and `\u203A` and `false` for `\u2191` and `\u00D7`
 * — so the property is one the check could have failed, and the two glyphs the
 * BLOCK axis uses are correctly not mirrored. A vertical arrow has
 * nothing to mirror: `top` and `bottom` are physical in every writing
 * direction this package supports.
 *
 * ## What persists is that the drawer is COLLAPSED rather than absent
 *
 * `../settings.ts` is the authority and its wording is exact: the ids
 * in `DevToolsSettings.handles` are "the drawer items whose collapsed
 * handle the shell draws at mount, before the operator has opened
 * anything this load". So the bit that crosses a reload is not
 * "expanded": a drawer is never expanded at mount. It is the tab's
 * EXISTENCE — the drawer was opened at least once, so it keeps an
 * affordance to be expanded from without going through the menu, and
 * that affordance is what {@link rememberDrawerHandle} writes.
 *
 * A drawer declaring no `handle` is never remembered, so an item that
 * loses the flag leaves no id behind and one that gains it is written
 * on the next open. The stored list is deduplicated by
 * `../settings.ts` on both read and write, and
 * {@link rememberDrawerHandle} skips the write entirely when the id is
 * already there — an operator who opens the same drawer forty times in
 * a session pays one write.
 *
 * ## The label is read defensively
 *
 * Every sentence below goes through {@link readLabel}, because a
 * `MenuItem`'s label is third-party text by construction — the shell
 * imports no feature module — and `aria-label=""` is a control a
 * screen reader announces as nothing at all. The fallback is the word
 * `Drawer`, which is why this is a second copy of the four lines
 * `./surfaceRules.ts` keeps privately rather than an import of them:
 * that module's fallback is `Action`, the two are the names of
 * different things, and hoisting one helper with a parameterised
 * fallback would mean editing a shipped module and re-measuring its
 * mutation note for four lines. The duplication is recorded as a debt
 * in `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md`.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/surfaces/drawerRules.test.ts` from `packages/dev-tools`
 * against the 23 cases `./drawerRules.test.ts` holds, and restores
 * this file byte-identical (`diff` confirmed, every leg):
 *
 * - Rotating {@link nextDrawerPlacement} through all four placements
 *   — `start` to `end` to `top` to `bottom` to `start` — answers
 *   `Tests  5 failed | 18 passed (23)`, and the blast radius is the
 *   reading worth keeping rather than trimming: `never leaves the
 *   axis it was given`, the two swap cases, `is its own inverse, from
 *   every placement`, and `points the collapsed tab into the page,
 *   from every placement` — that last one because
 *   {@link drawerHandleGlyph} asks this function which way is
 *   outward, so a switcher that rotated would also point every tab
 *   the wrong way.
 * - Swapping the two arms of {@link drawerHandleGlyph}'s `expanded`
 *   branch, so the tab points the way it came from, answers `2 failed
 *   | 21 passed`: `points the collapsed tab into the page, from every
 *   placement` and `points the expanded control back at its own
 *   edge`.
 * - Dropping the already-stored short-circuit from
 *   {@link rememberDrawerHandle}, so it writes whatever it read,
 *   answers `1 failed | 22 passed` — `writes nothing when the id is
 *   already stored`.
 * - Answering `true` from {@link rememberDrawerHandle} whatever
 *   `writeSettings` said answers `1 failed | 22 passed` — `answers
 *   false when the write could not land`.
 * - Dropping {@link readLabel}'s empty check, so a blank label reaches
 *   the sentences, answers `3 failed | 20 passed`: one per sentence
 *   builder, all three named `names the drawer even when the feature
 *   gave no label`.
 * - Letting {@link hasStoredDrawerHandle} answer `true` for any id
 *   answers `2 failed | 21 passed`: `refuses an id no load has
 *   stored` and `refuses every id when storage cannot be reached`.
 *
 * `check-types` reports none of the six: every mutation above is a
 * behaviour change inside a signature that still holds, and `bun x
 * tsc --noEmit` exited 0 over all of them (measured, each leg). The
 * suite is the only gate that can say this module still means what it
 * says.
 */

import type { DrawerPlacement } from '../types';

import { readSettings, writeSettings } from '../settings';

/** U+2039 SINGLE LEFT-POINTING ANGLE QUOTATION MARK. Bidi-mirrored. */
const START_GLYPH = '\u2039';

/** U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK. Bidi-mirrored. */
const END_GLYPH = '\u203A';

/** U+2191 UPWARDS ARROW. Nothing to mirror: the axis is physical. */
const TOP_GLYPH = '\u2191';

/** U+2193 DOWNWARDS ARROW. Nothing to mirror: the axis is physical. */
const BOTTOM_GLYPH = '\u2193';

/** U+00D7 MULTIPLICATION SIGN: the close button of a drawer with no tab. */
export const DEVTOOLS_DRAWER_CLOSE_GLYPH = '\u00D7';

/**
 * Which edge a drawer that declared none is fixed to.
 *
 * `end` rather than `start`: a drawer opens over the app it is
 * reporting on, and the app's own navigation chrome is far more often
 * on the start edge than on the end one.
 */
export const DEVTOOLS_DEFAULT_DRAWER_PLACEMENT: DrawerPlacement = 'end';

/** What a nameless drawer is called wherever a control names it. */
const FALLBACK_LABEL = 'Drawer';

/**
 * The label, or a stand-in when the feature gave none.
 *
 * @param label - The menu row's label, as the feature wrote it.
 * @returns A non-empty name for a control to carry.
 */
function readLabel(label: string): string {
  const trimmed = label.trim();

  return trimmed === ''
    ? FALLBACK_LABEL
    : trimmed;
}

/**
 * Where the placement switcher moves the drawer next.
 *
 * A swap along the drawer's own axis, never a rotation through all
 * four — see this module's header for the two sizes in
 * `../styles.css` that make the other spelling a reshape.
 *
 * @param placement - Where the drawer is now.
 * @returns The other edge of the same axis.
 */
export function nextDrawerPlacement(
  placement: DrawerPlacement,
): DrawerPlacement {
  switch (placement) {
    case 'start':
      return 'end';

    case 'end':
      return 'start';

    case 'top':
      return 'bottom';

    default:
      return 'top';
  }
}

/**
 * The glyph on the switcher: where the drawer is about to go.
 *
 * @param next - The placement {@link nextDrawerPlacement} answered.
 * @returns One character, `aria-hidden` where it is drawn.
 */
export function drawerPlacementGlyph(next: DrawerPlacement): string {
  switch (next) {
    case 'start':
      return START_GLYPH;

    case 'end':
      return END_GLYPH;

    case 'top':
      return TOP_GLYPH;

    default:
      return BOTTOM_GLYPH;
  }
}

/**
 * The arrow on the tab, and on the control that collapses the panel.
 *
 * Collapsed, it points INTO the page — the way the panel will travel
 * when it expands. Expanded, it points back at the edge the panel is
 * fixed to, which is where it goes when it collapses.
 *
 * @param placement - Which edge the drawer is fixed to.
 * @param expanded - Whether the panel is showing.
 * @returns One character, `aria-hidden` where it is drawn.
 */
export function drawerHandleGlyph(
  placement: DrawerPlacement,
  expanded: boolean,
): string {
  const ownEdge = drawerPlacementGlyph(placement);

  return expanded
    ? ownEdge
    : drawerPlacementGlyph(nextDrawerPlacement(placement));
}

/**
 * What the placement switcher is called.
 *
 * @param label - The menu row's label.
 * @param next - Where the switcher will move the drawer.
 * @returns One line, naming the drawer and the edge.
 */
export function describeDrawerPlacement(
  label: string,
  next: DrawerPlacement,
): string {
  return `Move ${readLabel(label)} to the ${next} edge`;
}

/**
 * What the header's dismiss control is called.
 *
 * A drawer that leaves a tab behind is COLLAPSED rather than closed:
 * the surface goes, the affordance stays, and the two words say which
 * of those happened.
 *
 * @param label - The menu row's label.
 * @param collapses - Whether a tab will be left on the edge.
 * @returns One line.
 */
export function describeDrawerDismiss(
  label: string,
  collapses: boolean,
): string {
  return collapses
    ? `Collapse ${readLabel(label)}`
    : `Close ${readLabel(label)}`;
}

/**
 * What the collapsed edge tab is called.
 *
 * @param label - The menu row's label.
 * @returns One line.
 */
export function describeDrawerHandle(label: string): string {
  return `Expand ${readLabel(label)}`;
}

/**
 * Whether some earlier load left this drawer a tab.
 *
 * Total: an unreachable, absent or corrupt store answers `false`
 * through `../settings.ts`, which never throws.
 *
 * @param itemId - The drawer item's id.
 * @returns `true` when the id is in the stored handle set.
 */
export function hasStoredDrawerHandle(itemId: string): boolean {
  return readSettings().handles.includes(itemId);
}

/**
 * Record that this drawer has now been opened at least once.
 *
 * Read-modify-write over the one storage key, preserving the stored
 * size. Writes nothing when the id is already there, so repeated
 * opens cost one write.
 *
 * @param itemId - The drawer item's id.
 * @returns `true` when the set already held the id or the write
 * landed, `false` when storage refused it. Never throws.
 */
export function rememberDrawerHandle(itemId: string): boolean {
  const settings = readSettings();

  if (settings.handles.includes(itemId)) {
    return true;
  }

  return writeSettings({
    size: settings.size,
    handles: [...settings.handles, itemId],
  });
}
