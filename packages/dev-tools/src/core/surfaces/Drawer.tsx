/**
 * @packageDocumentation
 * The `mode: 'drawer'` surface: a fixed panel on one edge, the page
 * still usable behind it, and the collapsed tab it can be brought
 * back from.
 *
 * Everything this component decides that is a plain function of plain
 * values is in `./drawerRules.ts` — which edge the switcher moves to,
 * what each control is called, which arrow it carries, and what the
 * one storage key remembers. That module is collected by the jsdom
 * vitest project and this file is not, which is the package's
 * two-runner discipline; what is left here is the DOM.
 *
 * ## Non-modal is the requirement, and it costs nothing to keep
 *
 * No backdrop, no `inert`, no focus trap, no focus move on open, no
 * Escape handler. An operator opens a drawer to watch the app while
 * they use it, so the app has to stay usable: that is the whole
 * difference between this surface and `./Modal.tsx`, and it is kept
 * by NOT writing the four things that dialog gets from `showModal()`.
 *
 * Escape is the one of those a reader may expect anyway, and its
 * absence is a reading rather than an oversight. A drawer is a panel
 * an operator works ALONGSIDE, for as long as they like; the key
 * presses that happen while it is open mostly belong to the feature
 * inside it — a field being cleared, an inline editor being
 * abandoned — and a surface-level Escape would eat them. Dismissal is
 * the header control and the tab, both of which are visible, and
 * `../Menu.tsx` keeps Escape for the menu, where it dismisses
 * something transient.
 *
 * Focus is not moved in either, for `./Popover.tsx`'s reason: the row
 * that opened this surface is being unmounted with the menu, which
 * hands focus back to the trigger, and the surface is rendered after
 * the trigger inside `[data-devtools-root]`, so one Tab reaches it.
 * That is a claim about the shell's render order, is a constraint the
 * shell has to keep, and is measured by nothing in this plan.
 *
 * ## Close, collapse, and why the header button is sometimes each
 *
 * A drawer that declares `handle: true` is never really closed: the
 * tab stays on the edge and the operator brings the panel back
 * without going near the menu. So for that drawer the header control
 * COLLAPSES — it carries the arrow pointing at its own edge and is
 * named `Collapse <label>` — and for a drawer with no handle the same
 * control closes, carries a multiplication sign and is named `Close
 * <label>`. Both names come from `./drawerRules.ts`, and the arrow
 * pair is the one thing the task asks the tab for: the tab's arrow
 * points into the page and expands, the header's points back at the
 * edge and collapses.
 *
 * The two are one callback, {@link DevToolsDrawerProps.onOpenChange},
 * because the shell has one slot either way: decision 6's
 * `openSurface` is the whole of "one drawer at a time", and a
 * collapsed drawer holds no slot. What survives a collapse is the
 * TAB, not the surface.
 *
 * ## The tab is drawn only while the panel is not
 *
 * `../styles.css` fixes `.devtools-handle` at `calc(var(--devtools-z)
 * - 1)`, one below the drawer's own stack, and puts it at the middle
 * of the same edge the drawer covers. A tab rendered beside an open
 * panel would therefore be a focusable button painted underneath it —
 * reachable by Tab, invisible to the eye. So the two are exclusive
 * here: the tab while collapsed, the header's control while expanded,
 * and the operator always has exactly one visible way to change the
 * state.
 *
 * ## What "opened at least once" is, and where it is kept
 *
 * `../settings.ts` owns the persistence and `./drawerRules.ts` is the
 * read-modify-write over it. This component's part is the moment: the
 * id is remembered the first time the panel is OPEN and the item
 * declares a handle, never at mount and never for an item without the
 * flag. The stored bit means the tab is drawn at the next load before
 * anything has been opened — a drawer is collapsed rather than
 * absent, which is what `../settings.ts` says the set means.
 *
 * The write is deferred through `Promise.resolve().then(...)` with
 * the `setState` that goes with it, exactly as `./ActionItem.tsx`
 * defers its run and for the same lint reading:
 * `react-hooks/set-state-in-effect` refuses a `setState` made
 * synchronously inside an effect, with `Calling setState
 * synchronously within an effect can trigger cascading renders`. One
 * microtask is not a behaviour anybody can observe here — the panel
 * is already painted, and the flag only decides what is drawn after
 * it goes away.
 *
 * The obvious alternative, a `useRef` latch read during render, was
 * refused: `eslint-plugin-react-hooks` v7 carries the compiler rules
 * and reading `ref.current` during render is one of the things they
 * report, so the ref would have bought a lint error in place of a
 * microtask.
 *
 * ## `placement` is seeded, not followed
 *
 * The item's declared placement is the INITIAL edge; the switcher
 * owns it afterwards, and a later render passing a different
 * declaration does not move a panel the operator has placed. Items
 * are static values a feature answers from `items(host)`, so the case
 * is theoretical — but a switcher whose choice could be overwritten
 * by a re-render is worse than one that ignores a value nothing
 * changes. The chosen edge is deliberately NOT persisted:
 * `../settings.ts` stores the size and the handle set and says why
 * the corner is excluded, and a drawer's edge is the same kind of
 * dodge as the corner.
 *
 * ## What proves what
 *
 * The decisions are pinned by `./drawerRules.test.ts` (23 cases). The
 * markup and the wiring below are proved by no gate in this plan —
 * the jsdom project collects `.ts` only — and the forced Playwright
 * spec's fixed case list is where "a drawer leaves the page
 * interactive", "only one drawer opens at a time" and "the handle
 * collapses and expands" are proved. So what follows was read ONCE,
 * off a probe, and nothing re-runs it.
 *
 * ## Measured — the markup, off `react-dom/server`
 *
 * An open drawer declaring `placement: 'start'` and `handle: true`
 * answers exactly one `<div class="devtools-drawer"
 * data-placement="start" role="dialog" aria-label="Feedback">` around
 * a `<header class="devtools-drawer-header">` holding an `<h2
 * class="devtools-drawer-title">`, two `.devtools-icon-button`s named
 * `Move Feedback to the end edge` and `Collapse Feedback`, and a
 * `<div class="devtools-drawer-body">` holding the children. Both
 * glyph spans are `aria-hidden="true"`; a control read false, with no
 * `aria-hidden="false"` anywhere in the markup.
 *
 * The same drawer with no `handle` and no `placement` answers
 * `data-placement="end"` — the default — and names its second
 * control `Close Plain`, carrying U+00D7 instead of the collapse
 * arrow. Collapsed with nothing stored it answers the EMPTY STRING;
 * collapsed with its id in the stored handle set it answers one
 * `<button class="devtools-handle" data-placement="end"
 * aria-label="Expand Feedback" aria-expanded="false">`; and collapsed
 * with the id stored but no `handle` flag it answers the empty string
 * again — so the flag and the stored id are both load-bearing, and
 * each of the three readings could have been the other.
 *
 * ## Measured — the live wiring, once, off a probe
 *
 * A jsdom + `react-dom/client` driver kept in `/tmp`, with a
 * Map-backed `localStorage` installed for the reason
 * `../settings.test.ts` records. Opening the handle drawer wrote
 * `{"size":"md","handles":["feedback"]}` under `devtools.settings`
 * and nothing else; the control that could have failed is the
 * no-handle drawer, which was opened the same way and left the key
 * ABSENT (`null`).
 *
 * - One click on the switcher moved `data-placement` from `start` to
 *   `end` and renamed the control to `Move Feedback to the start
 *   edge`; a second click moved it back to `start`.
 * - The header's second control answered `onOpenChange(false)` once,
 *   the panel went, and a `.devtools-handle` appeared in its place
 *   carrying `Expand Feedback`, `aria-expanded="false"`,
 *   `data-placement="start"` — the edge the switcher had left it on,
 *   not the declared one — and a glyph whose code point is `203a`,
 *   which is the END arrow on a START-placed drawer: it points into
 *   the page.
 * - Clicking the tab answered `onOpenChange(true)` and brought the
 *   panel back, so the recorded calls read `[false, true]`.
 * - A handle drawer nothing had opened rendered NOTHING while
 *   collapsed, and one whose id was already stored drew its tab at
 *   mount with no open in between.
 *
 * The readings and the probe are written out in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md`.
 */

import type { DrawerPlacement } from '../types';
import type { ReactElement, ReactNode } from 'react';

import { useEffect, useState } from 'react';

import {
  DEVTOOLS_DEFAULT_DRAWER_PLACEMENT,
  DEVTOOLS_DRAWER_CLOSE_GLYPH,
  describeDrawerDismiss,
  describeDrawerHandle,
  describeDrawerPlacement,
  drawerHandleGlyph,
  drawerPlacementGlyph,
  hasStoredDrawerHandle,
  nextDrawerPlacement,
  rememberDrawerHandle,
} from './drawerRules';

/** What {@link DevToolsDrawer} takes. */
export interface DevToolsDrawerProps {
  /**
   * The drawer item's id.
   *
   * The identity the handle set is keyed on, so it must be the same
   * string across loads — which `MenuItem.id` in `../types.ts`
   * already requires of it.
   */
  readonly itemId: string;

  /**
   * The surface's accessible name, and its header's heading.
   *
   * The chosen row's label. Read defensively by `./drawerRules.ts`,
   * which names a blank one `Drawer` rather than shipping an empty
   * `aria-label`.
   */
  readonly label: string;

  /** Whether the panel is showing. The shell's slot owns this. */
  readonly open: boolean;

  /**
   * Which edge the drawer starts on.
   *
   * Seeded once; the switcher owns the edge afterwards. Omitted means
   * {@link DEVTOOLS_DEFAULT_DRAWER_PLACEMENT}.
   */
  readonly placement?: DrawerPlacement;

  /**
   * Whether to leave a collapsed tab behind once this drawer has been
   * opened.
   *
   * @defaultValue `false`
   */
  readonly handle?: boolean;

  /**
   * Expand or collapse.
   *
   * `false` from the header control, `true` from the tab. The shell's
   * one surface slot is what actually changes.
   */
  readonly onOpenChange: (open: boolean) => void;

  /** Whatever the shell drew: the feature's `render({close, host})`. */
  readonly children: ReactNode;
}

/**
 * A fixed panel on one edge, and the tab it collapses to.
 *
 * Renders the panel while {@link DevToolsDrawerProps.open}, the tab
 * while collapsed if this drawer has a handle and has been opened at
 * least once, and nothing at all otherwise.
 *
 * @param props - {@link DevToolsDrawerProps}.
 * @returns The panel, the tab, or `null`.
 */
export function DevToolsDrawer({
  itemId,
  label,
  open,
  placement,
  handle = false,
  onOpenChange,
  children,
}: DevToolsDrawerProps): ReactElement | null {
  const [edge, setEdge] = useState<DrawerPlacement>(
    placement ?? DEVTOOLS_DEFAULT_DRAWER_PLACEMENT,
  );

  // Lazily, once: what some earlier load stored. A drawer with no
  // handle never asks, so it never reads storage at all.
  const [seen, setSeen] = useState(
    () => handle && hasStoredDrawerHandle(itemId),
  );

  useEffect(() => {
    if (!open || !handle || seen) {
      return;
    }

    // Deferred into a microtask so the setState is not synchronous
    // within this effect -- `react-hooks/set-state-in-effect` refuses
    // that. See the module comment.
    void Promise.resolve().then(() => {
      rememberDrawerHandle(itemId);
      setSeen(true);
    });
  }, [handle, itemId, open, seen]);

  if (!open) {
    if (!handle || !seen) {
      return null;
    }

    return (
      <button
        type="button"
        className="devtools-handle"
        data-placement={edge}
        aria-label={describeDrawerHandle(label)}
        aria-expanded={false}
        onClick={() => { onOpenChange(true); }}
      >
        {/* Hidden: the button's `aria-label` already says what it
            does, and an arrow read aloud says nothing. */}
        <span aria-hidden="true">{drawerHandleGlyph(edge, false)}</span>
      </button>
    );
  }

  const next = nextDrawerPlacement(edge);

  return (
    // `role="dialog"` rather than a landmark, so the surface matches
    // the `aria-haspopup="dialog"` the menu row that opened it
    // carries. Not `aria-modal`: the page behind stays interactive.
    <div
      className="devtools-drawer"
      data-placement={edge}
      role="dialog"
      aria-label={label}
    >
      <header className="devtools-drawer-header">
        <h2 className="devtools-drawer-title">{label}</h2>

        <button
          type="button"
          className="devtools-icon-button"
          aria-label={describeDrawerPlacement(label, next)}
          onClick={() => { setEdge(next); }}
        >
          <span aria-hidden="true">{drawerPlacementGlyph(next)}</span>
        </button>

        <button
          type="button"
          className="devtools-icon-button"
          aria-label={describeDrawerDismiss(label, handle)}
          onClick={() => { onOpenChange(false); }}
        >
          <span aria-hidden="true">
            {handle
              ? drawerHandleGlyph(edge, true)
              : DEVTOOLS_DRAWER_CLOSE_GLYPH}
          </span>
        </button>
      </header>

      <div className="devtools-drawer-body">{children}</div>
    </div>
  );
}
