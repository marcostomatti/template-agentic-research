/**
 * @packageDocumentation
 * The picker's drawing: one top-layer sheet the widget outlines
 * things on, and the pointer-following pick session drawn on it.
 *
 * `./picker.ts` answers what an element is called, what a selector
 * matches and what sits above an element. This module answers where
 * a rectangle goes and who owns the pointer while pick mode is on.
 * `./ElementPicker.tsx` calls both and holds no geometry of its own.
 *
 * ## Why pick mode is drawn imperatively and not in JSX
 *
 * Spec item 5: starting pick mode COLLAPSES the drawer. Measured in
 * `src/core/Shell.tsx`, the drawer's children are `{open ?
 * item.render({close, host}) : null}` — so a collapse unmounts the
 * feature's whole React subtree, the component that started the pick
 * included. An overlay rendered from that subtree would therefore be
 * torn down by the very act that starts the session, and a
 * `createPortal` would not save it: a portal's contents are still
 * that component's children.
 *
 * So {@link startPick} owns real DOM: it creates the sheet, listens
 * on the document and hands back an {@link FeedbackPickSession} whose
 * `end` takes it all away. It is deliberately NOT started from an
 * effect — an effect's cleanup would run on the unmount the collapse
 * causes — but from the click handler itself, and it is ended by a
 * pick, by Escape or by a press on the widget's own root.
 *
 * The consequence the drawer has to live with is written on
 * {@link FeedbackPickOptions.onPick}: that callback is invoked while
 * the drawer's subtree is gone, so whatever it writes to has to
 * outlive it.
 *
 * ## The sheet is inside the widget's own root, which makes it
 * unpickable for free
 *
 * `createOverlayLayer(root)` appends to the widget root rather than
 * to `document.body`, and three things follow from that one line:
 *
 * - `./picker.ts`'s `isPickable` refuses anything inside
 *   `[data-devtools-root]`, so the picker can never describe, outline
 *   or climb to its own drawing. `pickerOverlay.test.ts` reads that
 *   back off a real layer rather than trusting the argument.
 * - `../../styles.css` scopes every selector under that same
 *   attribute, so the sheet's rules are reachable at all. A sheet on
 *   `document.body` would be unstyled.
 * - A top-layer element keeps its DOM parent for inheritance, so the
 *   `--devtools-` tokens still resolve after `showPopover()` has
 *   promoted it.
 *
 * ## `popover="manual"`, and what happens where there is no Popover
 * API
 *
 * The same choice `../../core/surfaces/Popover.tsx` makes and for the
 * same reasons: `manual` withholds the light dismiss that would close
 * the sheet on the first press, and it puts nothing into the
 * document's `auto` popover stack, so opening the sheet cannot close
 * a popover the app itself opened.
 *
 * The promotion is guarded by `typeof layer.showPopover ===
 * 'function'`, which is not defensive noise: jsdom 30 ships no
 * Popover API at all (measured — `typeof el.showPopover` is
 * `'undefined'` and `'popover' in el` is `false` under this package's
 * jsdom project), so every colocated case here runs the unpromoted
 * path. A browser on that path still paints the sheet above the app,
 * because `.devtools-pick-layer` carries `position: fixed` and
 * `z-index: calc(var(--devtools-z) + 2)`.
 *
 * ## Geometry travels as custom properties, not as inline geometry
 *
 * {@link outlineBox} answers STRINGS, and {@link placeBox} writes
 * them to `--devtools-pick-x`, `-y`, `-width` and `-height`. The
 * stylesheet spends them on `left`, `top`, `width` and `height`. Two
 * things that buys:
 *
 * - The prefix discipline holds. Every name the widget introduces is
 *   spelled `--devtools-`, and an inline `style="left: …"` would have
 *   been the one piece of geometry with no name at all.
 * - It is readable back under jsdom, which is what lets a case ask
 *   where a box was actually put. Measured: that engine's CSSOM drops
 *   `element.style.translate` entirely (`''` immediately after a
 *   write) and keeps `setProperty('--devtools-pick-x', …)` verbatim.
 *
 * ## …and the geometry is NOT on `translate`, which would have been
 * the obvious choice
 *
 * `../../styles.css` moves everything else it animates on `translate`
 * and `scale`, and its `prefers-reduced-motion: reduce` block
 * withdraws motion by declaring `translate: none !important` and
 * `scale: none !important` over `[data-devtools-root] *`. A sheet
 * that carried its geometry on `translate` would therefore collapse
 * every outline onto the viewport's top-left corner for exactly the
 * readers who asked for less motion, and for nobody else — a failure
 * no gate in this package would report, because the rule is a media
 * query and the properties are the ones the reset names.
 *
 * So the boxes are positioned with `left` and `top`. They carry no
 * transition, so nothing here is animation and the repo's
 * compositor-property rule has nothing to say about it; the only
 * elements ever laid out are the sheet's own children, never the
 * app's.
 *
 * {@link outlineBox} rounds to whole pixels, for `./picker.ts`'s
 * reason: the subpixel is below what an outline can show and above
 * what a reader can check.
 *
 * ## The match count is placed like an outline, not like a label
 *
 * The badge is given the SELECTOR FIELD's whole box — the same four
 * properties an outline gets — and the stylesheet makes it a flex row
 * that puts its text at the trailing edge, vertically centred. The
 * alternative, a point with the badge's own width pulled back, needs
 * a percentage resolved against the element itself, which only
 * `translate` offers and which the paragraph above rules out.
 *
 * ## The pointer is read by identity, and the app is never written to
 *
 * A `pointermove` fires far more often than the element under it
 * changes, so {@link startPick} keeps the hovered element and does
 * nothing at all when the next event names the same one. What a move
 * costs when the element DID change is one `getBoundingClientRect`
 * and four custom-property writes, all on the sheet.
 *
 * Neither `scroll` nor `resize` is coalesced through
 * `requestAnimationFrame`, and that is a reading of the HTML
 * standard's event loop rather than an omission: both are fired from
 * the rendering steps, so a browser dispatches at most one of each
 * per frame per scroller already. A second layer of scheduling would
 * add a frame of lag to buy nothing. `scroll` is listened for in the
 * CAPTURE phase because a scroll event on an element does not bubble
 * — an app with its own scrolling panel would otherwise leave the
 * outlines behind.
 *
 * ## What a press does while pick mode is on
 *
 * Five event types are intercepted in the capture phase —
 * `pointerdown`, `pointerup`, `mousedown`, `mouseup`, `click` — and
 * not `click` alone. A `click` swallowed on its own arrives after the
 * app has already acted on the `mousedown`, so a pick aimed at a
 * button would have pressed it.
 *
 * The interception is asked of `isPickable` first, so a press on the
 * widget's own root is NOT swallowed: the handle that brings the
 * drawer back stays a button. Such a press ends the session instead,
 * on `pointerdown`, which is what keeps pick mode from being a state
 * the operator can get stuck in — Escape ends it, a pick ends it, and
 * so does reaching for the widget.
 *
 * An element `describeElement` cannot name — one no selector reaches
 * from `document.body` — ends the session with no call to
 * {@link FeedbackPickOptions.onPick}. There is nowhere to say so: the
 * drawer that owns the `role="status"` line is collapsed and its
 * subtree is gone.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/pickerOverlay.test.ts` from
 * `packages/dev-tools`, and restoring this file byte-identical — a
 * SHA-256 of the restored text compared against the original's, every
 * leg, all nine restored clean. The baseline is `Tests 21 passed
 * (21)`.
 *
 * - Appending the sheet to `document.body` rather than to the widget
 *   root answers `Tests 5 failed | 16 passed (21)`, the widest leg
 *   here and the reason one `append` line is where the
 *   unpickability comes from: `draws its sheet somewhere the picker
 *   refuses to pick`, both Escape cases, and the two that read the
 *   sheet back out of the root.
 * - Dropping the `isPickable` test from the session's own guard
 *   answers `2 failed | 19 passed`: `leaves a press on the widget its
 *   own, and ends the session`, and `outlines nothing while the
 *   pointer is over the widget`.
 * - Swallowing `click` alone answers `2 failed | 19 passed`, one of
 *   them `stops the press reaching the app, not just the click`.
 * - Dropping the session end from the Escape handler answers `1
 *   failed | 20 passed`, and testing no key at all — so that every
 *   key ends the session — answers `1 failed | 20 passed` the other
 *   way round. The two legs red different cases, which is what says
 *   both halves of that handler are load-bearing.
 * - Dropping the rounding from {@link outlineBox} answers `1 failed |
 *   20 passed`, and placing the badge at the origin rather than over
 *   the field's box answers `1 failed | 20 passed`.
 * - Leaving the sheet in the document from `remove()` answers `4
 *   failed | 17 passed`: every case that asks whether a session took
 *   its drawing with it.
 * - Reading the hovered element with no identity gate — drawing on
 *   every single move — answers `Tests 21 passed (21)`. No case here
 *   can see it: jsdom lays nothing out, so a redundant redraw is
 *   indistinguishable from the right number of them. The hole is
 *   named rather than papered over, and it is recorded in the
 *   close-out notes.
 *
 * `bun x tsc --noEmit` exits `0` under all nine, measured one by one:
 * every leg is a behaviour change over types that still line up, so
 * `check-types` would never report one and the suite is the only gate
 * that does.
 */

import type { FeedbackElementDescription, FeedbackElementRect } from './picker';

import { DEVTOOLS_ROOT_ATTRIBUTE } from '../../core/mount';

import { describeElement, isPickable } from './picker';

/** The sheet every outline and the match count are drawn on. */
const LAYER_CLASS = 'devtools-pick-layer';

/** One outlined element. */
const OUTLINE_CLASS = 'devtools-pick-outline';

/** The match count, parked beside the selector field. */
const BADGE_CLASS = 'devtools-pick-badge';

/** Where the stylesheet reads a box's horizontal offset. */
const VAR_X = '--devtools-pick-x';

/** …its vertical offset. */
const VAR_Y = '--devtools-pick-y';

/** …its width. */
const VAR_WIDTH = '--devtools-pick-width';

/** …and its height. */
const VAR_HEIGHT = '--devtools-pick-height';

/**
 * Every press type pick mode takes over, in no particular order.
 *
 * All five, never `click` alone — see this module's header for the
 * button that would otherwise be pressed by the pick aimed at it.
 */
const PICK_INTERCEPTED: readonly string[] = Object.freeze([
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
]);

/** Where one outlined box goes, as the stylesheet wants it. */
export interface FeedbackOverlayBox {
  /** The horizontal offset, in CSS pixels. */
  readonly x: string;

  /** The vertical offset. */
  readonly y: string;

  /** The box's width. */
  readonly width: string;

  /** The box's height. */
  readonly height: string;
}

/** The match count and the box it is drawn beside. */
export interface FeedbackOverlayCount {
  /** What it reads. */
  readonly text: string;

  /**
   * The selector field's box, as it last measured.
   *
   * The badge is given the whole box rather than a corner of it; see
   * this module's header.
   */
  readonly beside: FeedbackElementRect;
}

/** One top-layer sheet, and the three things a caller does to it. */
export interface FeedbackOverlayLayer {
  /**
   * Outline exactly these boxes, in this order.
   *
   * Reuses the boxes already drawn and creates or drops only the
   * difference, so a redraw under a scroll writes properties rather
   * than replacing nodes. An empty list draws none.
   */
  readonly outline: (rects: readonly FeedbackElementRect[]) => void;

  /** Draw the match count beside a box, or `null` to draw none. */
  readonly count: (label: FeedbackOverlayCount | null) => void;

  /** Take the sheet, and everything on it, out of the document. */
  readonly remove: () => void;
}

/** What {@link startPick} takes. */
export interface FeedbackPickOptions {
  /**
   * The widget's own root — what {@link widgetRootOf} answered.
   *
   * The sheet is appended inside it, which is what makes the sheet
   * unpickable and what makes it styled.
   */
  readonly root: Element;

  /**
   * Called with the element the click selected.
   *
   * Called AFTER the session has ended, and while the drawer that
   * started the pick is collapsed — so its React subtree is gone and
   * whatever this writes to has to outlive it. Not called at all for
   * a cancelled session, nor for an element `describeElement` could
   * not name.
   */
  readonly onPick: (description: FeedbackElementDescription) => void;
}

/** A pick session in flight. */
export interface FeedbackPickSession {
  /**
   * End it: every listener removed, the sheet out of the document.
   *
   * Safe to call more than once; the second call does nothing.
   */
  readonly end: () => void;
}

/**
 * The widget's own root, from anything the widget drew.
 *
 * @param element - Any element the widget rendered, or `null` for a
 * ref that has not been attached yet.
 * @returns The `[data-devtools-root]` element above it, or `null`
 * when there is none — which is what a static render answers, the
 * markup having never been in a document.
 */
export function widgetRootOf(element: Element | null): Element | null {
  if (element === null) {
    return null;
  }

  return element.closest(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`);
}

/**
 * Where an outline goes for one measured element.
 *
 * @param rect - A `getBoundingClientRect` reading, or any box shaped
 * like one.
 * @returns The four values the stylesheet spends on `left`, `top`,
 * `width` and `height`, rounded to whole pixels.
 */
export function outlineBox(rect: FeedbackElementRect): FeedbackOverlayBox {
  return Object.freeze({
    x: `${Math.round(rect.x)}px`,
    y: `${Math.round(rect.y)}px`,
    width: `${Math.round(rect.width)}px`,
    height: `${Math.round(rect.height)}px`,
  });
}

/**
 * Write one box's geometry onto an element.
 *
 * @param element - The box.
 * @param rect - Where it goes.
 */
function placeBox(element: HTMLElement, rect: FeedbackElementRect): void {
  const box = outlineBox(rect);

  element.style.setProperty(VAR_X, box.x);
  element.style.setProperty(VAR_Y, box.y);
  element.style.setProperty(VAR_WIDTH, box.width);
  element.style.setProperty(VAR_HEIGHT, box.height);
}

/**
 * Promote the sheet into the platform's top layer, where there is
 * one.
 *
 * @param layer - The sheet.
 */
function promote(layer: HTMLElement): void {
  if (typeof layer.showPopover !== 'function') {
    // No Popover API — jsdom, and any engine older than the feature.
    // The stylesheet's fixed position and z-index still paint the
    // sheet above the app; only the promotion is lost.
    return;
  }

  try {
    layer.showPopover();
  } catch {
    // Already showing, or an engine that knows the attribute and
    // refuses the call. Neither is worth taking the widget down over.
  }
}

/**
 * Create the sheet the picker draws on.
 *
 * @param root - The widget's own root; the sheet is appended inside
 * it. See this module's header for the three things that follow.
 * @returns The sheet's three operations, frozen.
 */
export function createOverlayLayer(root: Element): FeedbackOverlayLayer {
  const doc = root.ownerDocument;
  const layer = doc.createElement('div');

  layer.className = LAYER_CLASS;
  layer.setAttribute('popover', 'manual');
  // Everything drawn here is a positioned echo of something already
  // in the page or already said by `./ElementPicker.tsx`'s own count line,
  // so none of it is announced a second time.
  layer.setAttribute('aria-hidden', 'true');
  root.append(layer);
  promote(layer);

  const boxes: HTMLElement[] = [];
  let badge: HTMLElement | null = null;

  const outline = (rects: readonly FeedbackElementRect[]): void => {
    while (boxes.length > rects.length) {
      boxes.pop()?.remove();
    }

    while (boxes.length < rects.length) {
      const box = doc.createElement('div');

      box.className = OUTLINE_CLASS;
      layer.append(box);
      boxes.push(box);
    }

    rects.forEach((rect, index) => {
      const box = boxes[index];

      // Present by construction; the guard is what the index type
      // asks for under `noUncheckedIndexedAccess`.
      if (box !== undefined) {
        placeBox(box, rect);
      }
    });
  };

  const count = (label: FeedbackOverlayCount | null): void => {
    if (label === null) {
      badge?.remove();
      badge = null;

      return;
    }

    if (badge === null) {
      badge = doc.createElement('div');
      badge.className = BADGE_CLASS;
      layer.append(badge);
    }

    badge.textContent = label.text;
    placeBox(badge, label.beside);
  };

  const remove = (): void => {
    if (typeof layer.hidePopover === 'function') {
      try {
        layer.hidePopover();
      } catch {
        // Not showing, or detached before this ran.
      }
    }

    layer.remove();
  };

  return Object.freeze({ outline, count, remove });
}

/**
 * Start pick mode: the pointer draws an outline, a click selects and
 * Escape cancels.
 *
 * Collapsing the drawer is the CALLER's, and is what makes this a
 * plain DOM routine rather than a component — see this module's
 * header.
 *
 * @param options - {@link FeedbackPickOptions}.
 * @returns The session, so a caller that wants to cancel one without
 * a key press can.
 */
export function startPick({
  root,
  onPick,
}: FeedbackPickOptions): FeedbackPickSession {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const layer = createOverlayLayer(root);

  let hovered: Element | null = null;
  let live = true;

  const draw = (): void => {
    if (hovered === null) {
      layer.outline([]);

      return;
    }

    layer.outline([hovered.getBoundingClientRect()]);
  };

  // Declared before the listeners that call it; it only ever runs
  // after all of them are initialised.
  function end(): void {
    if (!live) {
      return;
    }

    live = false;
    doc.removeEventListener('pointermove', move, true);
    doc.removeEventListener('keydown', cancel, true);
    doc.removeEventListener('scroll', draw, true);
    view?.removeEventListener('resize', draw);

    for (const name of PICK_INTERCEPTED) {
      doc.removeEventListener(name, intercept, true);
    }

    layer.remove();
  }

  /**
   * What the pointer is over, if the picker may have it.
   *
   * @param target - Whatever the event named.
   * @returns The element, or `null` for the widget's own drawing and
   * for a target that is not an element at all.
   */
  const pickable = (target: EventTarget | null): Element | null => {
    if (!(target instanceof Element) || !isPickable(target)) {
      return null;
    }

    return target;
  };

  const move = (event: PointerEvent): void => {
    const next = pickable(event.target);

    // The pointer moves far more often than the element under it
    // changes; this is the whole of the per-move cost.
    if (next === hovered) {
      return;
    }

    hovered = next;
    draw();
  };

  const cancel = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    end();
  };

  const intercept = (event: Event): void => {
    const target = pickable(event.target);

    if (target === null) {
      // The widget's own controls stay the widget's: the press goes
      // through untouched, and the session ends so the drawer the
      // handle brings back is not still being picked over.
      if (event.type === 'pointerdown') {
        end();
      }

      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type !== 'click') {
      return;
    }

    const description = describeElement(target);

    end();

    if (description !== null) {
      onPick(description);
    }
  };

  doc.addEventListener('pointermove', move, true);
  doc.addEventListener('keydown', cancel, true);
  // Capture, because a scroll event does not bubble: an app with its
  // own scrolling panel would otherwise leave the outline behind.
  doc.addEventListener('scroll', draw, true);
  view?.addEventListener('resize', draw);

  for (const name of PICK_INTERCEPTED) {
    doc.addEventListener(name, intercept, true);
  }

  return Object.freeze({ end });
}
