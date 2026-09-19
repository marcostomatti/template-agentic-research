/**
 * @packageDocumentation
 * The `mode: 'popover'` surface, and the About panel: floating,
 * anchored to the tomato, and NOT modal.
 *
 * Native, by decision 2 of `.rafa/specs/q20b-1-dev-tools-shell.md`:
 * the platform Popover API for the top layer,
 * `@floating-ui/dom` for where it sits, and no design system
 * anywhere. The component decides three things and delegates the
 * rest — promote the element, keep it beside the trigger, dismiss it
 * on a press outside — and takes its content as `children` so that
 * the shell can put a feature's `render({close, host})` and its own
 * About panel through the same surface.
 *
 * ## `popover="manual"`, and why not `auto`
 *
 * `manual` is the whole of the non-modality. Three readings of the
 * spec make it the only value that works here:
 *
 * - An `auto` popover light-dismisses on any press outside it, which
 *   sounds like the dismissal this file wants and is not: light
 *   dismiss also fires for a press on the trigger, and it fires
 *   BEFORE the click that would reopen, so the tomato becomes a
 *   button that cannot close what it opened. The dismissal below is
 *   explicit for the same reason `../Menu.tsx`'s is.
 * - Showing an `auto` popover closes every other `auto` popover in
 *   the document — they form one stack. The app is free to use the
 *   Popover API for its own UI, and a dev tool that shut the app's
 *   menus by opening is a dev tool that changes what it is reporting
 *   on.
 * - `auto` is also what would make this surface exclusive with a
 *   future second widget popover. Decision 6 gives the popover its
 *   OWN shell slot precisely so it may coexist with a drawer; a
 *   platform stack that closed it on a whim would be a second,
 *   invisible slot fighting the first.
 *
 * `manual` withholds the platform's Escape handling as well as its
 * light dismiss, which is why there is a key handler below.
 *
 * ## What "non-modal" costs this file, and what it buys the operator
 *
 * Nothing is trapped, nothing is `inert`, there is no backdrop and no
 * focus is moved on open. The page behind stays interactive, which is
 * the point: an operator reading the About panel's commit can still
 * click through the app it names. The modal surface of the next task
 * is the opposite of every clause in that sentence, and it gets all
 * of them from `<dialog>.showModal()` rather than from code here.
 *
 * Focus is not moved IN, and that is a reading rather than an
 * omission: the row that opened this surface is being unmounted with
 * the menu, and `../Menu.tsx` focuses the trigger on its way out, so
 * focus lands on the tomato rather than on the document body. The
 * surface is rendered after the trigger inside `[data-devtools-root]`,
 * so one Tab from there reaches it. That last sentence is a claim
 * about the shell's render order, is a constraint the shell has to
 * keep, and is not measured by anything in this plan.
 *
 * ## Promotion runs BEFORE positioning, by declaration order
 *
 * A `popover` element is `display: none` until `showPopover()` has
 * run, so its `getBoundingClientRect` reads `0x0` and
 * `computePosition` would place it by a box that does not exist.
 * Effects run in the order they are declared within a component, so
 * the promotion effect below is written above the
 * {@link useAnchoredSurface} call and runs before the positioning
 * effect that call registers. Swapping the two lines is a silent
 * misplacement — no error, no warning, a popover half its own height
 * out of true.
 *
 * Both effects wake in the SAME commit, the one after the `ref`
 * callback puts the element into state, so the ordering is a real
 * ordering and not two separate renders that would have worked
 * either way.
 *
 * A browser without the Popover API is handled by the `typeof` guard
 * rather than by a polyfill: the element then stays in the normal
 * layer, `@floating-ui/dom` still places it, and the only thing lost
 * is the top-layer promotion — a dev tool that refused to draw on an
 * older browser would be a dev tool nobody could report the older
 * browser from.
 *
 * ## The invisible first frame
 *
 * Between `showPopover()` and the first resolved `computePosition`
 * the element is shown and unplaced. `../styles.css` gates the MENU's
 * first frame with `[data-open='true']` and an `opacity`, and it
 * gives the popover no such rule — it fades the popover in through
 * `@starting-style` on `:popover-open` instead. So the guard here is
 * an inline `visibility: hidden` cleared the moment a position has
 * been written. It costs the first fade, which starts while the
 * element is hidden; it saves a frame of the panel painted at the
 * top-left of the document. `data-open` is written as well, for the
 * attribute contract `../styles.css` records, and nothing selects on
 * it yet.
 *
 * ## State is created per open
 *
 * {@link DevToolsPopover} renders nothing at all while shut and the
 * inner component holds every piece of state, so each open starts
 * from no element, no position and no promotion — the shape
 * `../Menu.tsx` uses, for the same reason: a `positioned` left true
 * from the last open would show one frame of the new surface at the
 * old surface's coordinates.
 *
 * ## What proves what
 *
 * Nothing here is proved by a gate in this plan. The jsdom vitest
 * project collects `.ts` only, so {@link isOutsidePress} is pinned by
 * `./surfaceRules.test.ts` and the listener that calls it is not, and
 * the forced Playwright spec's fixed case list reaches this file only
 * through About showing the commit. So the behaviour was read ONCE,
 * off a probe, and nothing re-runs it.
 *
 * ## Measured — the first frame, off `react-dom/server`
 *
 * Shut, the component answers the empty string — not a hidden
 * element. Open, with no position computed yet, it answers exactly:
 *
 * ```html
 * <div class="devtools-popover" popover="manual" role="dialog"
 *   aria-label="About" data-open="false" style="visibility:hidden">
 *   <p>commit 1234abc</p></div>
 * ```
 *
 * — so the first frame hides itself, carries no `transform`, and
 * renders the children it was given. A control read false: no
 * `aria-hidden` appears anywhere in that markup, this surface being
 * one a screen reader is meant to reach, unlike `./ActionItem.tsx`'s
 * card.
 *
 * ## Measured — the live wiring, once, off a gate
 *
 * A jsdom + `react-dom/client` driver kept in `/tmp`, with a stubbed
 * `ResizeObserver` and the scenario run TWICE: once with
 * `showPopover`/`hidePopover` faked onto `HTMLElement.prototype` and
 * once without them, because jsdom 30.0.1 ships no Popover API at all
 * (measured: `typeof element.showPopover === 'undefined'`). Both runs
 * read identically except for the promotion, which is the fallback
 * branch's whole claim:
 *
 * - `popover="manual"`, `role="dialog"`, `aria-label="About"`,
 *   `data-open="true"` and an inline `transform: translate(8px, 8px)`
 *   once positioned, with the inline `visibility` cleared.
 * - With the API present, exactly one `showPopover` on the
 *   `.devtools-popover` element, and exactly one `hidePopover` when
 *   the surface closed. With it absent, neither, and every other
 *   reading unchanged.
 * - Dismissals, cumulative: a press INSIDE the surface `0`, a press
 *   on the trigger `1`, a press outside `2`, Escape inside the
 *   surface `3`, Escape dispatched in the app behind `3` — the last
 *   being the control for the key handler being scoped to this
 *   subtree rather than to the document.
 * - Closing renders nothing: no `.devtools-popover` in the container.
 *
 * The control that could have failed: the same driver with
 * `anchor: null` read `data-open="false"`, an EMPTY inline
 * `transform` and `visibility: hidden`, while `showPopover` was still
 * called once. So the `translate(8px, 8px)` above is a position
 * `@floating-ui/dom` wrote — jsdom measures every rect as zero, and
 * the 8px is this file's own gap and padding — and the promotion does
 * not depend on the positioning that follows it.
 *
 * One reading needed the probe FIXED rather than the code: the first
 * shape put the trigger inside the React container, and
 * `createRoot(container).render()` clears a container's existing
 * children, so the trigger was detached and a press on it reached no
 * listener and read `0` dismissals. That is a probe artefact and not
 * a behaviour; the readings above are from the corrected probe. All
 * of it is written out in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md`.
 */

import type { Corner } from '../types';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';

import { useEffect, useState } from 'react';

import { menuPlacementForCorner } from '../menuFocus';

import { isOutsidePress } from './surfaceRules';
import { useAnchoredSurface } from './useAnchoredSurface';

/** What {@link DevToolsPopover} takes. */
export interface DevToolsPopoverProps {
  /**
   * Whether the popover is open.
   *
   * `false` renders nothing rather than a hidden element, so every
   * open starts from fresh state. See the module comment.
   */
  readonly open: boolean;

  /**
   * The trigger, to position against.
   *
   * `null` while the shell's ref has not been attached; the surface
   * stays invisible until a position can be computed.
   */
  readonly anchor: HTMLElement | null;

  /** Where the trigger is right now, which says which way to open. */
  readonly corner: Corner;

  /**
   * The surface's accessible name.
   *
   * The chosen row's label, or the About row's. Required: a
   * `role="dialog"` with no name is a dialog a screen reader
   * announces as nothing.
   */
  readonly label: string;

  /** Dismiss. Called on an outside press and on Escape. */
  readonly onDismiss: () => void;

  /** Whatever the shell drew: a feature's render, or About. */
  readonly children: ReactNode;
}

/** What {@link PopoverSurface} takes: the props above, minus `open`. */
type PopoverSurfaceProps = Omit<DevToolsPopoverProps, 'open'>;

/**
 * The open popover.
 *
 * A second component rather than a branch, so every piece of state is
 * created on open and destroyed on dismiss.
 *
 * @param props - {@link PopoverSurfaceProps}.
 * @returns The floating, non-modal surface.
 */
function PopoverSurface({
  anchor,
  corner,
  label,
  onDismiss,
  children,
}: PopoverSurfaceProps): ReactElement {
  const [surface, setSurface] = useState<HTMLElement | null>(null);

  // Declared ABOVE the `useAnchoredSurface` call on purpose: effects
  // run in declaration order, and a popover is `display: none` until
  // this one has run. See the module comment.
  useEffect(() => {
    if (surface === null) {
      return undefined;
    }

    if (typeof surface.showPopover !== 'function') {
      // No Popover API. The element stays in the normal layer and is
      // still positioned; only the top-layer promotion is lost.
      return undefined;
    }

    try {
      surface.showPopover();
    } catch {
      // Already showing, or not a valid popover in this engine.
      // Neither is worth taking the widget down over.
    }

    return () => {
      try {
        surface.hidePopover();
      } catch {
        // Not showing, or already detached by the time React got here.
      }
    };
  }, [surface]);

  const positioned = useAnchoredSurface(
    anchor,
    surface,
    menuPlacementForCorner(corner),
  );

  useEffect(() => {
    if (surface === null) {
      return undefined;
    }

    // Capture phase and `pointerdown`, the way `../Menu.tsx` listens:
    // a dismissal that waited for `click` would arrive after the app
    // had already acted on the press. The trigger is NOT excluded --
    // it is outside this surface, so pressing the tomato dismisses
    // here and opens the menu on the click that follows.
    const onPointerDown = (event: PointerEvent): void => {
      if (isOutsidePress(event.target, surface)) {
        onDismiss();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onDismiss, surface]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Escape') {
      return;
    }

    // `popover="manual"` withholds the platform's Escape, so this is
    // the only one. Scoped to the surface's own subtree rather than
    // to the document: an Escape the operator pressed while working
    // in the app behind is the app's, not this widget's.
    event.preventDefault();
    event.stopPropagation();
    onDismiss();
  };

  return (
    <div
      ref={setSurface}
      className="devtools-popover"
      popover="manual"
      role="dialog"
      aria-label={label}
      data-open={positioned}
      // Cleared the moment a position has been written -- see the
      // module comment on the invisible first frame.
      style={positioned
        ? undefined
        : { visibility: 'hidden' }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

/**
 * A floating, non-modal surface beside the tomato.
 *
 * Holds no state of its own: it decides whether there is a surface at
 * all, and {@link PopoverSurface} is everything an open one knows.
 *
 * @param props - {@link DevToolsPopoverProps}.
 * @returns The surface, or `null` while shut.
 */
export function DevToolsPopover({
  open,
  anchor,
  corner,
  label,
  onDismiss,
  children,
}: DevToolsPopoverProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <PopoverSurface
      anchor={anchor}
      corner={corner}
      label={label}
      onDismiss={onDismiss}
    >
      {children}
    </PopoverSurface>
  );
}
