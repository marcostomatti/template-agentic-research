/**
 * @packageDocumentation
 * One row of one menu panel: the `<button>` inside an `<li>`, and the
 * roles and ARIA state the four node kinds of `./menuModel.ts` each
 * turn into.
 *
 * Split out of `./Menu.tsx` so that file holds panels and this one
 * holds a row. Nothing here has state, an effect, a ref of its own or
 * a listener on anything but the button: props in, one element out.
 * `./Menu.tsx` owns which row is active, which submenu is open and
 * where either is positioned, and hands each row the two booleans it
 * needs to draw itself.
 *
 * ## What each node kind becomes
 *
 * | Kind      | `role`             | Also carries                     |
 * | --------- | ------------------ | -------------------------------- |
 * | `corner`  | `menuitemradio`    | `aria-checked`, a check marker   |
 * | `submenu` | `menuitem`         | `aria-haspopup`, `aria-expanded` |
 * | `fixed`   | `menuitem`         | `aria-haspopup` on About only    |
 * | `item`    | `menuitem`         | `aria-haspopup` unless an action |
 *
 * `menuitemradio` for a corner rather than `menuitemcheckbox`: the
 * four corners are one exclusive choice, and only one of them can be
 * checked at a time because the shell holds one corner slot.
 *
 * ## The marker slot is drawn even when it is empty
 *
 * Every row opens with the same `1em` slot, holding the check mark on
 * the checked corner, a feature's icon where one was given, and
 * nothing otherwise. Drawing it unconditionally is what keeps the
 * labels of a panel that mixes all three on one vertical line.
 *
 * The slot is `aria-hidden` in all three states, which is not an
 * oversight about the check mark: `aria-checked` on the button
 * already says the row is chosen, and a feature's icon restates the
 * label beside it. Announcing either would be a repeat. The same
 * reasoning hides the submenu arrow, which restates
 * `aria-haspopup="menu"`.
 *
 * ## It is a `<button>`
 *
 * Not a `role="menuitem"` div. Enter and Space then reach
 * {@link MenuRowProps.onActivate} as a `click` through the platform,
 * exactly as they reach `./Trigger.tsx`'s toggle, and neither this
 * file nor `./Menu.tsx` carries a key handler for the two of them.
 * `./Menu.tsx`'s header records that this is proved by the forced
 * Playwright spec and by nothing else.
 *
 * ## Measured — the static markup
 *
 * What CAN be read without a browser was read, through a
 * `react-dom/server` probe kept in `/tmp` (the jsdom project collects
 * `.ts` only, so no colocated case can render this file). The model
 * under it: `persistence: true`, one feature of one item carrying an
 * icon, one feature of two. Twenty-one readings, root panel unless
 * said otherwise:
 *
 * - Shut, the component renders the empty string — not a hidden list.
 * - One `role="menu"`, named `aria-label="Dev tools menu"`, carrying
 *   `data-open="false"` because no effect has positioned it.
 * - Five rows, each an `<li role="none">` around a `role="menuitem"`
 *   button, labelled Position, About, Save settings, Run alpha, Beta.
 * - Exactly one `tabindex="0"` against four `tabindex="-1"`, and
 *   exactly one `data-highlighted="true"` — the one tab stop.
 * - `aria-haspopup="menu"` twice (Position, Beta), each with
 *   `aria-expanded="false"`; `aria-haspopup="dialog"` once (About);
 *   neither on Save settings nor on the `mode: 'action'` row.
 * - Five marker slots, all `aria-hidden="true"`, the feature's icon
 *   inside one of them.
 * - Rendering the Position node's children as their own panel: four
 *   `role="menuitemradio"` rows, one `aria-checked="true"` against
 *   three `false`, one check glyph, and it is the `Bottom right` row
 *   that carries both — the corner the model was built with.
 *
 * Three controls read false, so the block above is a set of readings
 * the probe could have failed: an `aria-label` never passed, any
 * `aria-hidden="false"` anywhere, and `role="menuitemradio"` in the
 * ROOT panel — the last being a needle that goes from 0 to 4 in the
 * corner panel, so it is a needle that can match.
 */

import type { MenuNode } from './menuModel';
import type { ReactElement, Ref } from 'react';

import { DEVTOOLS_ABOUT_ID } from './menuModel';

/** The marker on the corner the trigger is in. U+2713 CHECK MARK. */
const CHECK_GLYPH = '\u2713';

/**
 * The glyph on a row that opens a submenu.
 *
 * U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK, `aria-hidden`
 * because `aria-haspopup="menu"` already says what it means.
 */
const SUBMENU_GLYPH = '\u203A';

/**
 * What kind of thing a row opens, for `aria-haspopup`.
 *
 * Total over both closed unions it reads, so a new node kind or a new
 * `MenuItem` mode in `./types.ts` is a `check-types` error here.
 *
 * @param node - The row.
 * @returns `'menu'` for a submenu, `'dialog'` for a row that opens a
 * surface, and `undefined` for a row that opens nothing.
 */
function popupKind(node: MenuNode): 'menu' | 'dialog' | undefined {
  switch (node.kind) {
    case 'submenu':
      return 'menu';

    // About opens the version popover; Save settings acts and draws
    // nothing.
    case 'fixed':
      return node.id === DEVTOOLS_ABOUT_ID
        ? 'dialog'
        : undefined;

    // An action runs and draws nothing; the other three modes all
    // open something the shell renders.
    case 'item':
      return node.item.mode === 'action'
        ? undefined
        : 'dialog';

    default:
      return undefined;
  }
}

/** What {@link MenuRow} takes. */
interface MenuRowProps {
  /** The row to draw. */
  readonly node: MenuNode;

  /** Whether the roving focus is on this row. */
  readonly active: boolean;

  /** Whether this row's submenu is open. */
  readonly expanded: boolean;

  /** Forwarded to the `<button>`, so the panel can focus it. */
  readonly ref?: Ref<HTMLButtonElement>;

  /** Chosen, by click or by the platform's Enter/Space on a button. */
  readonly onActivate: (element: HTMLButtonElement) => void;

  /** Pointed at, so hover and the roving focus agree. */
  readonly onHighlight: () => void;
}

/**
 * One row of one panel.
 *
 * Pure: props in, one `<button>` out. The marker slot is drawn on
 * every row whether or not it holds anything, so labels line up down
 * a panel that mixes checkmarks, feature icons and neither.
 *
 * @param props - {@link MenuRowProps}.
 * @returns The row.
 */
export function MenuRow({
  node,
  active,
  expanded,
  ref,
  onActivate,
  onHighlight,
}: MenuRowProps): ReactElement {
  const isCorner = node.kind === 'corner';
  const isSubmenu = node.kind === 'submenu';
  const icon = node.kind === 'item' || isSubmenu
    ? node.icon
    : undefined;
  const marker = isCorner && node.checked
    ? CHECK_GLYPH
    : icon;

  return (
    <button
      ref={ref}
      type="button"
      className="devtools-menu-item"
      role={isCorner
        ? 'menuitemradio'
        : 'menuitem'}
      aria-checked={isCorner
        ? node.checked
        : undefined}
      aria-haspopup={popupKind(node)}
      aria-expanded={isSubmenu
        ? expanded
        : undefined}
      tabIndex={active
        ? 0
        : -1}
      data-highlighted={active}
      onClick={(event) => { onActivate(event.currentTarget); }}
      onMouseEnter={onHighlight}
    >
      {/* Always hidden from the accessibility tree: the checkmark
          restates `aria-checked` and a feature's icon restates the
          label beside it, so announcing either is a repeat. The slot
          is drawn even when empty, to keep labels aligned. */}
      <span className="devtools-menu-marker" aria-hidden="true">
        {marker}
      </span>

      <span>{node.label}</span>

      {isSubmenu
        ? (
          <span className="devtools-menu-arrow" aria-hidden="true">
            {SUBMENU_GLYPH}
          </span>
        )
        : null}
    </button>
  );
}
