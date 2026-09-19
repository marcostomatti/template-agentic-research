/**
 * @packageDocumentation
 * The `mode: 'modal'` surface: a `<dialog>` the platform opened, so
 * the trap and the Escape are the platform's and not this file's.
 *
 * Native, by decision 2 of `.rafa/specs/q20b-1-dev-tools-shell.md`.
 * `showModal()` is the whole implementation of three separate
 * requirements — focus trapped inside the dialog, the rest of the
 * document made inert, Escape closing it — and each of them is a
 * thing this package would otherwise have had to write, get wrong at
 * the edges, and prove against a browser it does not run in its unit
 * suite.
 *
 * So there is no focus trap here, no `inert` written anywhere, no
 * sentinel elements, no `keydown` listener for Escape and no backdrop
 * element: `../styles.css` draws the backdrop through
 * `.devtools-modal::backdrop`, which only exists BECAUSE the dialog
 * was opened modally. The file is short on purpose, and the shortness
 * is the decision rather than an omission.
 *
 * ## `showModal()`, never the `open` attribute
 *
 * A `<dialog open>` is shown NON-modally: no top layer, no backdrop,
 * no trap, no Escape. React would happily render the attribute and
 * nothing would look wrong until an operator tabbed out of a dialog
 * they thought was holding focus. The element is therefore rendered
 * with no `open` attribute at all and promoted by an effect, which
 * also keeps React out of the business of an attribute the platform
 * writes itself on every open and close.
 *
 * ## What happens without a Popover-era `<dialog>`
 *
 * The guard is a `typeof` chain rather than a polyfill, for the reason
 * `./Popover.tsx` gives about its own: a dev tool that refused to draw
 * on an older engine is a dev tool nobody can report the older engine
 * from. `showModal` first, then `show` — a non-modal dialog that at
 * least paints — then nothing, and the element stays hidden.
 *
 * jsdom 30.0.1 is exactly that engine and not a hypothesis: measured,
 * `typeof element.showModal`, `typeof element.show` and `typeof
 * element.close` are all `undefined` there, so the fallback branch is
 * the one every jsdom render takes. What is lost with the API is the
 * trap, the inertness and the platform Escape together — all three
 * come from the same call — and nothing here tries to simulate them.
 *
 * ## The close event, and the one flag that reads it
 *
 * Escape reaches this component as the platform's `close` event, by
 * way of a `cancel` nothing here prevents. That is the ONLY path
 * Escape takes: there is no key handler, so a widget Escape and an app
 * Escape cannot be confused, and a dialog that the engine closed for
 * some reason this file has not thought of still tells its parent.
 *
 * The cleanup calls `close()` as well, so the same event fires on the
 * way out — once for the dismissal the parent already made. The
 * `dismissed` ref is what tells the two apart: set in the cleanup,
 * read by the handler, so a teardown never calls
 * {@link DevToolsModalProps.onDismiss} back at a parent that is
 * already unmounting this subtree. `SurfaceProps.close` in
 * `../types.ts` is documented idempotent, so the duplicate would have
 * been harmless; it would also have been a second dismissal in every
 * log and every future status line, which is worth one ref.
 *
 * ## State is created per open
 *
 * {@link DevToolsModal} renders nothing while shut and the inner
 * component holds every piece of state, exactly as `./Popover.tsx`
 * and `../Menu.tsx` do: a fresh element per open, so no effect can
 * see the previous open's dialog and no ref survives a dismissal.
 *
 * ## The box belongs to the feature
 *
 * `../styles.css` gives `.devtools-modal` a surface, a border, a
 * radius, a max size and `padding: 0`, and this component adds no
 * wrapper inside it. A feature's `render({close, host})` therefore
 * draws the whole interior, including its own padding and its own
 * scrolling. Two readings say so: that stylesheet is the package's
 * only one and is closed — its header carries a measured selector
 * scan a new rule would falsify — and a wrapper carrying one of the
 * drawer's classes would be a class that lies about what it is
 * wrapping. It is recorded as a debt in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md` rather than fixed
 * from here.
 *
 * ## What proves what
 *
 * Nothing here is proved by a gate in this plan, and the shape of the
 * gap is the package's two-runner discipline: the jsdom vitest
 * project collects `.ts` only, and jsdom has no `<dialog>` behaviour
 * to collect against anyway. The forced Playwright spec's fixed case
 * list is where "a modal traps focus" is proved. So the wiring below
 * was read ONCE, off a probe, and nothing re-runs it.
 *
 * ## Measured — the first frame, off `react-dom/server`
 *
 * Shut, the component answers the empty string — not a hidden
 * element. Open, it answers exactly:
 *
 * ```html
 * <dialog class="devtools-modal" aria-label="Session"><p>body</p></dialog>
 * ```
 *
 * — so a server render carries NO `open` attribute (a
 * `/\sopen\b/` scan of that markup answered `false`), no
 * `aria-modal`, no wrapper around the children, and a name a screen
 * reader can announce. A control read false as well: no
 * `aria-hidden="false"` appears anywhere in it, this surface being
 * one a screen reader is meant to reach.
 *
 * ## Measured — the live wiring, once, off a probe
 *
 * A jsdom + `react-dom/client` driver kept in `/tmp`, with the
 * scenario run TWICE: once with `showModal`, `show` and `close` faked
 * onto `HTMLDialogElement.prototype` and once without them, because
 * jsdom 30.0.1 ships none of the three. Both runs read identically
 * except for the promotion, which is the fallback branch's whole
 * claim:
 *
 * - With the API present: exactly one `showModal` on the
 *   `.devtools-modal` element at mount and no `show`, and the element
 *   carried the `open` attribute the fake wrote.
 * - With it absent: an empty call log, no `open` attribute, and every
 *   other reading unchanged — the dialog still rendered, still
 *   classed `devtools-modal`, still named `Session`.
 * - A `close` event dispatched on the dialog answered exactly `1`
 *   dismissal, in BOTH runs.
 * - Closing it from the parent removed the element and left the
 *   dismissal count at `1`; the teardown's own `close()` was the
 *   second and last entry in the call log.
 * - The teardown control, run on its own: unmounting a modal that was
 *   still open logged `[["close","devtools-modal"]]` and `0`
 *   dismissals. The fake fires a real `close` event, so that zero is
 *   a reading the {@link ModalSurface} `dismissed` ref could have
 *   failed rather than a path nothing exercises.
 *
 * What the probe cannot read is the chain the requirement names.
 * jsdom implements no modal dialog, so Escape → `cancel` → `close`
 * was never exercised: the probe dispatched the `close` a browser
 * would have. "Escape closes it" rests on `showModal()` having been
 * called and on the forced Playwright spec, and on nothing in this
 * package's own gates. The readings and the probe are written out in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md`.
 */

import type { ReactElement, ReactNode } from 'react';

import { useEffect, useRef, useState } from 'react';

/** What {@link DevToolsModal} takes. */
export interface DevToolsModalProps {
  /**
   * Whether the modal is open.
   *
   * `false` renders nothing rather than a closed `<dialog>`, so every
   * open starts from fresh state. See the module comment.
   */
  readonly open: boolean;

  /**
   * The surface's accessible name.
   *
   * The chosen row's label. Required: a dialog with no name is one a
   * screen reader announces as nothing.
   */
  readonly label: string;

  /**
   * Dismiss.
   *
   * Called when the platform closed the dialog — Escape, or a
   * `close()` from anywhere but this component's own teardown.
   */
  readonly onDismiss: () => void;

  /** Whatever the shell drew: the feature's `render({close, host})`. */
  readonly children: ReactNode;
}

/** What {@link ModalSurface} takes: the props above, minus `open`. */
type ModalSurfaceProps = Omit<DevToolsModalProps, 'open'>;

/**
 * The open modal.
 *
 * A second component rather than a branch, so every piece of state is
 * created on open and destroyed on dismiss.
 *
 * @param props - {@link ModalSurfaceProps}.
 * @returns The dialog, promoted by the effect below.
 */
function ModalSurface({
  label,
  onDismiss,
  children,
}: ModalSurfaceProps): ReactElement {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);

  // Raised by the teardown, read by the close handler: the `close()`
  // below fires the same event a dismissal does, and only one of the
  // two is news to the parent. See the module comment.
  const dismissed = useRef(false);

  useEffect(() => {
    if (dialog === null) {
      return undefined;
    }

    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch {
        // Already open, or not attached by the time React got here.
        // Neither is worth taking the widget down over.
      }
    } else if (typeof dialog.show === 'function') {
      // No modal dialogs in this engine. The surface still paints,
      // and the trap, the inertness and Escape are all lost together.
      try {
        dialog.show();
      } catch {
        // Same two cases as above.
      }
    }

    return () => {
      dismissed.current = true;

      if (typeof dialog.close === 'function') {
        try {
          dialog.close();
        } catch {
          // Not open, or already detached.
        }
      }
    };
  }, [dialog]);

  const handleClose = (): void => {
    if (dismissed.current) {
      // Our own teardown, not the operator's Escape.
      return;
    }

    onDismiss();
  };

  return (
    // No `open` attribute and no `aria-modal`: the effect above opens
    // it, and the platform is what makes it modal. The interior is the
    // feature's, padding included -- see the module comment.
    <dialog
      ref={setDialog}
      className="devtools-modal"
      aria-label={label}
      onClose={handleClose}
    >
      {children}
    </dialog>
  );
}

/**
 * A modal surface in the platform's top layer.
 *
 * Holds no state of its own: it decides whether there is a dialog at
 * all, and {@link ModalSurface} is everything an open one knows.
 *
 * @param props - {@link DevToolsModalProps}.
 * @returns The dialog, or `null` while shut.
 */
export function DevToolsModal({
  open,
  label,
  onDismiss,
  children,
}: DevToolsModalProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <ModalSurface label={label} onDismiss={onDismiss}>
      {children}
    </ModalSurface>
  );
}
