/**
 * @packageDocumentation
 * Keep one floating element positioned against the trigger, for as
 * long as both are mounted.
 *
 * `./Popover.tsx` and `./ActionItem.tsx` both draw an element that
 * has to sit beside the tomato wherever the tomato currently is, and
 * neither has anything else to say about positioning. That one job is
 * here so it is written once.
 *
 * ## Why this is a third copy and not a shared one
 *
 * `../Menu.tsx` holds `useAnchoredPanel`, which is this function with
 * the element state folded in. The two are not merged because merging
 * them means editing a file this task does not own: `useAnchoredPanel`
 * is private to `../Menu.tsx`, and hoisting it here would be a change
 * to a shipped module for the convenience of a new one. The
 * duplication is recorded as a debt in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md` rather than paid
 * here.
 *
 * The two differ in one way that is not accidental. `useAnchoredPanel`
 * OWNS the element state and answers a `ref` setter; this one TAKES
 * the element. `./Popover.tsx` needs that: its element is
 * `popover="manual"`, so it is `display: none` until `showPopover()`
 * has run, and a `getBoundingClientRect` taken before that reads
 * `0x0` — `flip` and `shift` would then decide against a box that
 * does not exist and `offset` would place the surface by half its own
 * height. Taking the element as an argument lets that component
 * declare the promotion effect BEFORE calling this hook, which is
 * what orders the two: effects run in the order they are declared,
 * so the element is in the top layer and laid out before the first
 * `computePosition`.
 *
 * ## The middleware, and the properties written
 *
 * `offset`, then `flip`, then `shift` with `crossAxis`, all off
 * `../menuFocus.ts`'s two constants — the same stack and the same
 * padding as the menu, because a popover that kept a different gap
 * from the tomato than the menu does would read as a mistake. `flip`
 * swaps the side when the preferred one has no room, `shift` slides
 * the surface back along both axes when it would overhang, and
 * between them all four corners are safe from any viewport.
 *
 * The computed offset is written to the element's inline `transform`
 * and never to its `translate`, for the two reasons `../styles.css`
 * gives and `../Menu.tsx` repeats: that stylesheet animates the
 * independent `scale` and `translate` properties precisely so
 * `@floating-ui/dom` can own `transform`, and its
 * `prefers-reduced-motion: reduce` block sets `translate: none
 * !important` over the whole scope — which would erase a position
 * written there and strand the surface at the document's top-left
 * corner for exactly the operators who asked for less motion.
 *
 * ## `positioned` latches
 *
 * It goes false to true once and never back. Both callers throw the
 * element away rather than re-anchoring it — `./Popover.tsx` renders
 * nothing while shut and mounts a fresh inner component per open,
 * `./ActionItem.tsx` draws its card only while a promise is
 * unsettled — so a stale `true` has no element to be stale about.
 * A third caller that reuses one element across opens would have to
 * be given a reset, and there is no reset to misuse today.
 *
 * ## It is a `.tsx` holding no JSX
 *
 * On purpose. `../../../eslint.config.mjs` applies the
 * `react-hooks` rules to `.tsx` and `.jsx` files alone, so the same
 * function in a `.ts` would be a hook no hooks linter ever reads —
 * and `react-hooks/set-state-in-effect` is a rule this package has
 * already been caught by once (`../Menu.tsx`'s header records the
 * message). The extension is what buys the coverage; the absence of
 * JSX is what makes the file short.
 */

import type { Placement } from '@floating-ui/dom';

import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { useEffect, useState } from 'react';

import {
  DEVTOOLS_MENU_GAP,
  DEVTOOLS_MENU_VIEWPORT_PADDING,
} from '../menuFocus';

/**
 * Anchor one floating element to the trigger.
 *
 * @param anchor - What to position against: the trigger, or `null`
 * while the shell's ref has not been attached.
 * @param surface - The floating element, or `null` while React has
 * not attached it or while the caller is deliberately withholding it.
 * @param placement - Where the surface PREFERS to sit; `flip` and
 * `shift` may move it.
 * @returns Whether a position has been computed and written yet. The
 * caller keeps the surface invisible until it has.
 */
export function useAnchoredSurface(
  anchor: HTMLElement | null,
  surface: HTMLElement | null,
  placement: Placement,
): boolean {
  const [positioned, setPositioned] = useState(false);

  useEffect(() => {
    if (anchor === null || surface === null) {
      return undefined;
    }

    // `autoUpdate` answers its own disposer, and subscribes to scroll,
    // resize and layout changes -- so the surface follows the trigger
    // when the Position submenu moves it under an open surface.
    return autoUpdate(anchor, surface, () => {
      void computePosition(anchor, surface, {
        strategy: 'fixed',
        placement,
        middleware: [
          offset(DEVTOOLS_MENU_GAP),
          flip({ padding: DEVTOOLS_MENU_VIEWPORT_PADDING }),
          shift({
            crossAxis: true,
            padding: DEVTOOLS_MENU_VIEWPORT_PADDING,
          }),
        ],
      }).then(({ x, y }) => {
        // `transform`, never `translate` -- see the header for the two
        // stylesheet readings that forbid the other spelling. The
        // setState is inside the `.then` and so is not synchronous
        // within the effect, which `react-hooks/set-state-in-effect`
        // refuses.
        surface.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        setPositioned(true);
      });
    });
  }, [anchor, placement, surface]);

  return positioned;
}
