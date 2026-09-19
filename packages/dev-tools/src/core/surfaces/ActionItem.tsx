/**
 * @packageDocumentation
 * The `mode: 'action'` surface: the one that draws nothing until it
 * has to.
 *
 * An action is a menu row that runs and shows no panel. `../types.ts`
 * says so — the `'action'` member of `MenuItem` carries a `run(host)`
 * and no `render`, and the union is shaped so that giving it one is a
 * `check-types` error. What is left for a component to do is the part
 * that is not the running: mounting IS the invocation, a promise that
 * has not settled is a pending card beside the tomato, and a
 * rejection is a sentence in the shell's `role="status"` region
 * rather than an exception nobody catches.
 *
 * ## Mounting is the invocation
 *
 * The shell mounts one of these when an action row is chosen and
 * drops it when {@link DevToolsActionItemProps.onSettled} fires.
 * There is no `run()` method and no imperative handle: the component
 * has exactly one lifetime and one run, which is what makes "did this
 * action already run?" a question about the React tree rather than a
 * second piece of state that could disagree with it.
 *
 * A `useRef` guard makes the run once-only anyway, because
 * `StrictMode` mounts an effect, tears it down and mounts it again —
 * and a dev tool whose "Clear the draft store" ran twice per click
 * would be a bug reported against the app rather than against this
 * file. The ref survives that remount; the effect body does not run a
 * second time.
 *
 * ## Everything happens in a microtask, and that is a lint reading
 *
 * The whole run — `item.run(host)` included — is deferred through
 * `Promise.resolve().then(...)` rather than called in the effect
 * body. `react-hooks/set-state-in-effect` refuses a `setState` made
 * synchronously inside an effect, with `Calling setState
 * synchronously within an effect can trigger cascading renders`
 * (`../Menu.tsx`'s header records the same rule catching the same
 * package once already). The pending flag has to be raised BEFORE the
 * promise settles and can therefore not wait for the settle
 * callback — so the call that raises it is moved out of the effect
 * body instead, together with the run it describes.
 *
 * One microtask of delay is not a behaviour anybody can observe: it
 * is shorter than the paint the click that opened the menu was
 * waiting on.
 *
 * ## The pending card, and why it reuses two menu classes
 *
 * `../styles.css` is the package's only stylesheet, it is closed, and
 * it already carries this state: `.devtools-menu-item[data-pending=
 * 'true']` is documented there as "the pending state of an action
 * whose `run(host)` returned a promise that has not settled". That
 * rule sets an animation and a cursor and nothing else — no surface,
 * no border — so the row needs a container, and the only container
 * class the stylesheet defines is `.devtools-menu`, which is the
 * floating card the menu is drawn on.
 *
 * So the card is a `.devtools-menu` holding one
 * `.devtools-menu-item[data-pending='true']`, and it is NOT a menu:
 * it carries no `role`, no `aria-label` and no rows. The alternative
 * was a new `.devtools-action` block in the stylesheet, refused
 * because that file's header carries a measured selector scan (52
 * rule preludes, 60 selectors, 0 unscoped) that a new rule would
 * falsify, and because the pending rule it already carries names this
 * component in its own comment. A reader who does add a class there
 * should move this card onto it.
 *
 * The card is `aria-hidden`. It says the label and an ellipsis, which
 * is what the live region has already said; announcing both would
 * read the action's name to a screen reader twice per run.
 *
 * ## What reaches the `role="status"` region
 *
 * Three sentences, all built by `./surfaceRules.ts` and all delivered
 * through {@link DevToolsActionItemProps.onStatus} — this component
 * never touches the region, because the region is the shell's and is
 * present from mount whether or not an action ever runs.
 *
 * - The start, but only when `run` actually returned something to
 *   wait for. A synchronous action has no wait to narrate.
 * - The outcome, on settle.
 * - The failure, on a rejection OR on a synchronous throw. The task
 *   names the rejection; a `run` that throws before it returns is the
 *   same failure one tick earlier, and letting that one escape would
 *   take down the widget's React root — which decision 3 of the spec
 *   built precisely so that the app's crashes cannot.
 *
 * Nothing rethrows. The `try` wraps the call and the `await`
 * together, `./surfaceRules.ts`'s reader is documented not to throw
 * over any rejection value, and the `.then` chain the effect starts
 * is `void`-ed rather than returned, so no unhandled rejection is
 * left on the microtask queue.
 *
 * ## No `alive` guard, and why one would be wrong
 *
 * The obvious shape — a closure flag the effect cleanup clears, so a
 * settle after unmount updates no state — is measurably worse here.
 * `StrictMode` runs the cleanup between the two mounts, so the flag
 * would be false for the whole of the only run the ref guard permits,
 * and the pending card would never appear in development. React 19
 * makes the guard unnecessary as well: a `setState` on an unmounted
 * component is a no-op and no longer warns. The two callbacks are
 * called after an unmount too, which the contract allows —
 * `SurfaceProps.close` in `../types.ts` is documented idempotent and
 * safe after an unmount, and the shell's own slot is what decides
 * whether a late settle means anything.
 *
 * ## What proves what
 *
 * Nothing below is proved by a gate in this plan, and the shape of
 * that gap is the package's two-runner discipline rather than an
 * omission: the jsdom vitest project collects `.ts` only, so the
 * three sentences and the thenable test are pinned by
 * `./surfaceRules.test.ts` (25 cases) and the wiring here is not. The
 * forced Playwright spec's case list, fixed by the spec, names no
 * action at all. So this component's behaviour was read ONCE, off a
 * probe, and nothing re-runs it.
 *
 * ## Measured — once, off a gate
 *
 * A jsdom + `react-dom/client` driver kept in `/tmp`, rendering this
 * component by hand through `act` with a stubbed `ResizeObserver`
 * (jsdom 30.0.1 ships none, and `autoUpdate` wants one). Four
 * scenarios, one per shape `run` can answer with. Every reading came
 * out as designed:
 *
 * - A promise that RESOLVES: while unsettled, one
 *   `.devtools-menu` card carrying `aria-hidden="true"`,
 *   `data-open="true"` and NO `role`, holding one
 *   `.devtools-menu-item` with `data-pending="true"` reading `Clear
 *   the draft store` + U+2026, and an inline `transform:
 *   translate(8px, 8px)` written by `@floating-ui/dom`. The region
 *   had `["Running Clear the draft store…"]`. After the settle:
 *   `[…, "Clear the draft store finished"]`, `onSettled` called once,
 *   no card.
 * - A promise that REJECTS: the same card, then `["Running …",
 *   "Clear the draft store failed: the dev server is not running"]`,
 *   `onSettled` once, no card.
 * - A `run` that THREW synchronously: no card at any point, region
 *   `["Clear the draft store failed: no endpoint"]`, `onSettled`
 *   once. The throw did not escape.
 * - A `run` answering nothing: no card, region `["Clear the draft
 *   store finished"]` — one utterance, no start, as designed.
 * - `process.on('unhandledRejection')` collected `[]` across all
 *   four.
 * - Under `StrictMode`, `run` was called exactly `1` time.
 * - `renderToStaticMarkup` of this component answers the empty
 *   string: an action draws nothing until its effect has run, so a
 *   server render of the shell can never contain a pending card.
 *
 * The control that could have failed is in `./Popover.tsx`'s header:
 * the same driver with `anchor: null` leaves the inline `transform`
 * empty and `data-open` false, so the `translate(8px, 8px)` above is
 * a position `@floating-ui/dom` wrote and not a default. The readings
 * and the probe are written out in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md`.
 */

import type { Corner, DevToolsHost, MenuItem } from '../types';
import type { ReactElement } from 'react';

import { useEffect, useRef, useState } from 'react';

import { menuPlacementForCorner } from '../menuFocus';

import {
  describeActionDone,
  describeActionFailure,
  describeActionStart,
  isPromiseLike,
} from './surfaceRules';
import { useAnchoredSurface } from './useAnchoredSurface';

/** U+2026 HORIZONTAL ELLIPSIS: the card's whole vocabulary. */
const ELLIPSIS = '\u2026';

/**
 * The `mode: 'action'` member of `MenuItem`, named.
 *
 * Extracted from the union rather than declared again, so a change to
 * the contract in `../types.ts` reaches this component as a
 * `check-types` error rather than as a second definition that has
 * quietly stopped matching.
 */
export type DevToolsActionMenuItem = Extract<MenuItem, { mode: 'action' }>;

/** What {@link DevToolsActionItem} takes. */
export interface DevToolsActionItemProps {
  /** The chosen row. Its `run` is called exactly once, on mount. */
  readonly item: DevToolsActionMenuItem;

  /** The one surface a feature may reach, handed to `run`. */
  readonly host: DevToolsHost;

  /**
   * The trigger, to place the pending card against.
   *
   * `null` while the shell's ref has not been attached; the run still
   * happens and the card simply stays invisible.
   */
  readonly anchor: HTMLElement | null;

  /** Where the trigger is right now, which says which way to open. */
  readonly corner: Corner;

  /**
   * Say something in the shell's `role="status"` region.
   *
   * Called up to twice per run: once as a returned promise starts
   * being waited on, once when it settles or fails.
   */
  readonly onStatus: (message: string) => void;

  /**
   * The run is over, one way or the other.
   *
   * The shell drops this component on it. May arrive after an
   * unmount — see the module comment.
   */
  readonly onSettled: () => void;
}

/**
 * One chosen action, running.
 *
 * Renders the pending card while a returned promise is unsettled and
 * `null` at every other moment, including the whole of a synchronous
 * action's life.
 *
 * @param props - {@link DevToolsActionItemProps}.
 * @returns The pending card, or `null`.
 */
export function DevToolsActionItem({
  item,
  host,
  anchor,
  corner,
  onStatus,
  onSettled,
}: DevToolsActionItemProps): ReactElement | null {
  const [pending, setPending] = useState(false);
  const [card, setCard] = useState<HTMLElement | null>(null);
  const started = useRef(false);
  const positioned = useAnchoredSurface(
    anchor,
    card,
    menuPlacementForCorner(corner),
  );

  useEffect(() => {
    // Once per mounted component, whatever StrictMode does to the
    // effect around it. See the module comment.
    if (started.current) {
      return;
    }

    started.current = true;

    // Deferred into a microtask so no setState below is synchronous
    // within this effect -- `react-hooks/set-state-in-effect` refuses
    // that, and the pending flag cannot wait for the settle.
    void Promise.resolve().then(async () => {
      let outcome: string;

      try {
        const result = item.run(host);

        if (isPromiseLike(result)) {
          setPending(true);
          onStatus(describeActionStart(item.label));
        }

        // Legal on `void` as well as on a promise, and the contract
        // types `run` as answering either.
        await result;
        outcome = describeActionDone(item.label);
      } catch (error) {
        // A rejection, or a `run` that threw before it returned. Both
        // are reported; neither is rethrown.
        outcome = describeActionFailure(item.label, error);
      }

      setPending(false);
      onStatus(outcome);
      onSettled();
    });
  }, [host, item, onSettled, onStatus]);

  if (!pending) {
    return null;
  }

  return (
    // Not a menu: no role, no rows, no label. The two classes are the
    // ones `../styles.css` already defines for this state -- see the
    // module comment. `aria-hidden` because the live region has
    // already said the same thing.
    <div
      ref={setCard}
      className="devtools-menu"
      data-open={positioned}
      aria-hidden="true"
    >
      <span className="devtools-menu-item" data-pending="true">
        {`${item.label}${ELLIPSIS}`}
      </span>
    </div>
  );
}
