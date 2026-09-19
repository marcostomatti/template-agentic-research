/**
 * @packageDocumentation
 * The menu's two decisions that are not markup: where a panel opens,
 * and where a roving focus goes next.
 *
 * `./Menu.tsx` draws the rows and owns the DOM; this module owns
 * everything statable as a value. The split is the package's
 * two-runner discipline, as `../../vitest.config.ts` states it: the
 * jsdom project collects `.ts` only, so a decision left inside the
 * `.tsx` would be reachable by the forced Playwright spec and by
 * nothing else. Index arithmetic and a corner-to-placement table are
 * exactly the kind of thing worth pinning by a unit case, so they
 * live here and `./Menu.tsx` calls them.
 *
 * The module is pure: no state between calls, no DOM read, no
 * storage, no request. Its only import is a pair of TYPES —
 * {@link Corner} from the contract and `Placement` from
 * `@floating-ui/dom` — both erased by `verbatimModuleSyntax`, so
 * nothing this module emits pulls floating-ui into a bundle that did
 * not already want it.
 *
 * ## Why the placements are a table and not a computation
 *
 * A corner is two bits — which edge vertically, which horizontally —
 * and a placement could be assembled from them. It is written out as
 * four entries instead because the two axes do NOT map the same way.
 * The vertical axis inverts: a trigger at the top opens the menu
 * downward (`bottom-*`), one at the bottom opens it upward (`top-*`).
 * The horizontal axis aligns: a trigger on the left aligns the menu's
 * start edge to it (`*-start`), one on the right its end edge
 * (`*-end`). A submenu inverts the horizontal axis instead — it opens
 * INTO the viewport, away from the edge the trigger sits on. Three
 * different rules over two bits is a table, and a table is the
 * spelling a reader can check a row of against the screen.
 *
 * `start` and `end` are floating-ui's writing-direction-relative
 * alignments, so the four entries hold under an RTL document with no
 * second code path. {@link Corner} itself is physical, for the reason
 * `../styles.css` gives where it places the trigger: the tomato is
 * moved to dodge whatever it covers, which is a screen position and
 * not a reading order.
 *
 * The table is where the panel PREFERS to open, not where it ends up.
 * `flip` and `shift` in `./Menu.tsx` move it when the preference
 * would leave the viewport, which is what makes all four corners
 * safe; this module only has to start it off pointing inward.
 *
 * ## The wrap, and what an out-of-range index means
 *
 * {@link nextMenuIndex} wraps in both directions, per the ARIA
 * authoring practices for a menu. It also takes a `current` outside
 * `[0, count)` rather than refusing one, because the caller's index
 * and the caller's row list are two pieces of state that are updated
 * by two different renders: a menu whose rows shrank — the Save
 * settings row appearing or leaving when the status payload lands —
 * can hold an index that no longer names a row for one commit. A
 * throw there would take the widget down over a transient; a
 * `-1` — nothing focused yet — reads as "start from the top" for a
 * forward move and "start from the bottom" for a backward one, and
 * any other out-of-range index is clamped to the nearer end.
 *
 * That tolerance is load-bearing rather than defensive. `./Menu.tsx`
 * keeps the roving index RAW in state and clamps only what it draws,
 * because correcting the state itself would mean a `setState` inside
 * an effect — which `react-hooks/set-state-in-effect` refuses, with
 * `Calling setState synchronously within an effect can trigger
 * cascading renders` (measured, on the first shape this file's caller
 * was written in). So an out-of-range index reaches this function in
 * production and is not a shape only a case constructs.
 *
 * ## What this module does NOT decide
 *
 * Whether a key is handled at all, and what Escape, Tab, ArrowLeft
 * and ArrowRight do, stay in `./Menu.tsx`: each of the four is a
 * statement about a DOM tree — dismiss this panel, hand focus back to
 * that element, open the row's child list — and none of them has a
 * value to answer. `./Menu.tsx`'s header records which of them no
 * gate in this plan proves.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/menuFocus.test.ts` from `packages/dev-tools` against the
 * 15 cases `./menuFocus.test.ts` holds, and restores this file
 * byte-identical (`diff` confirmed, every leg):
 *
 * - Dropping the forward wrap, so `ArrowDown` answers `current + 1`
 *   unconditionally, answers `Tests  3 failed | 12 passed (15)`:
 *   `moves forward one row, and wraps off the last row to the first`,
 *   `clamps an index past the end rather than answering past it` and
 *   `answers the one row for Home and End in a panel of one`.
 * - Dropping the backward wrap the same way answers `4 failed | 11
 *   passed` — the three matching cases plus `starts a backward move
 *   from the bottom when nothing is focused`. The asymmetry is the
 *   reading worth keeping: the backward path carries the
 *   nothing-focused case as well, because `-1` and "before the first
 *   row" are one branch going up and two different branches going
 *   down.
 * - Swapping `Home` and `End` answers `1 failed | 14 passed`, the one
 *   being `answers the first and the last row for Home and End`. A
 *   NARROW pin, named so it is not mistaken for a wide one: delete
 *   that single case and the two keys could trade places under a
 *   green suite.
 * - Deleting the empty-panel guard answers `2 failed | 13 passed`:
 *   `answers null for every move key when the panel holds no rows`
 *   and `answers null rather than a negative index for a negative
 *   count`. The second is what stops `End` answering `-1`.
 * - Pointing every submenu at `right-start` answers `2 failed | 13
 *   passed`: `opens away from the edge the trigger sits on` and
 *   `never opens a submenu on the same side as the root menu`.
 * - Un-inverting the root menu's vertical axis, so a top corner opens
 *   upward, answers `1 failed | 14 passed` — `opens downward from a
 *   top corner and upward from a bottom one`. The horizontal case
 *   survives it, which is why the two axes are two cases and not one.
 * - Setting {@link DEVTOOLS_MENU_GAP} to `0` answers `1 failed | 14
 *   passed`. A zero gap is not a type error and not a crash: the menu
 *   would simply sit flush against the tomato, so the only thing that
 *   can report it is a case that reads the number.
 *
 * `bun run check-types` is green under every mutation above — each is
 * a behaviour change over types that still line up, and
 * {@link menuPlacementForCorner}'s return type is `Placement`, which
 * every wrong placement in the table still satisfies. The suite is
 * the only gate that reports any of it.
 */

import type { Corner } from './types';
import type { Placement } from '@floating-ui/dom';

/**
 * The gap the menu keeps from the trigger it is anchored to, in CSS
 * pixels.
 *
 * A number rather than a token because `@floating-ui/dom` computes a
 * position in JS and cannot read a custom property. It is the one
 * length this package holds outside `../styles.css`, and it is here
 * rather than in the component so the component holds none.
 */
export const DEVTOOLS_MENU_GAP = 8;

/**
 * How close a flipped or shifted panel may come to the viewport edge,
 * in CSS pixels.
 *
 * Handed to both `flip` and `shift`. Without it a panel pushed back
 * inside sits flush against the edge, which reads as clipped.
 */
export const DEVTOOLS_MENU_VIEWPORT_PADDING = 8;

/**
 * Where the root menu prefers to open, per corner of the trigger.
 *
 * Vertically inverted, horizontally aligned. See this module's
 * documentation for why the two axes are not one computation.
 */
const MENU_PLACEMENTS: Readonly<Record<Corner, Placement>> = Object.freeze({
  'top-left': 'bottom-start',
  'top-right': 'bottom-end',
  'bottom-right': 'top-end',
  'bottom-left': 'top-start',
});

/**
 * Which side a submenu prefers to open on, per corner of the trigger.
 *
 * Horizontally inverted against the corner, so the child list opens
 * into the viewport rather than across the edge the trigger sits on.
 * `-start` throughout: a submenu's first row lines up with the row
 * that opened it.
 */
const SUBMENU_PLACEMENTS: Readonly<Record<Corner, Placement>> = Object.freeze({
  'top-left': 'right-start',
  'top-right': 'left-start',
  'bottom-right': 'left-start',
  'bottom-left': 'right-start',
});

/**
 * Where the root menu prefers to open.
 *
 * @param corner - Where the trigger is right now.
 * @returns The preferred `@floating-ui/dom` placement; `flip` and
 * `shift` may move it.
 */
export function menuPlacementForCorner(corner: Corner): Placement {
  return MENU_PLACEMENTS[corner];
}

/**
 * Which side a submenu prefers to open on.
 *
 * @param corner - Where the trigger is right now. The submenu is
 * anchored to its parent ROW, but the corner is still what says which
 * way the viewport has room.
 * @returns The preferred `@floating-ui/dom` placement; `flip` and
 * `shift` may move it.
 */
export function submenuPlacementForCorner(corner: Corner): Placement {
  return SUBMENU_PLACEMENTS[corner];
}

/**
 * Where a roving focus goes next.
 *
 * Handles the four keys that move within one panel and answers `null`
 * for every other key, so the caller can tell "this key moved focus"
 * from "this key is not mine" without listing the keys twice.
 *
 * @param key - A `KeyboardEvent.key` value.
 * @param current - The index focus is on now; may be `-1` for
 * "nothing focused", and may be out of range for the reason this
 * module's documentation gives.
 * @param count - How many rows the panel holds.
 * @returns The index to move to, or `null` when the key moves nothing
 * and when the panel holds no rows at all.
 */
export function nextMenuIndex(
  key: string,
  current: number,
  count: number,
): number | null {
  if (count <= 0) {
    return null;
  }

  switch (key) {
    case 'Home':
      return 0;

    case 'End':
      return count - 1;

    // Past the last row, and from anywhere out of range, forward
    // lands on the first.
    case 'ArrowDown':
      return current < 0 || current >= count - 1
        ? 0
        : current + 1;

    // Before the first row, and from anywhere out of range, backward
    // lands on the last.
    case 'ArrowUp':
      return current <= 0 || current >= count
        ? count - 1
        : current - 1;

    default:
      return null;
  }
}
