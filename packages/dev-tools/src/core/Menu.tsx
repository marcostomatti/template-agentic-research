/**
 * @packageDocumentation
 * The `role="menu"` the tomato opens: one list per panel, drawn from
 * `./menuModel.ts`'s nodes, anchored by `@floating-ui/dom`.
 *
 * It decides nothing about WHAT the menu holds. The fixed order, the
 * persistence gate, the grouping threshold and which corner is marked
 * are all `./menuModel.ts`'s, and this component renders whatever it
 * answers: a `corner` node becomes a `menuitemradio`, a `submenu`
 * node becomes a row that opens a second panel, an `item` node
 * becomes a `menuitem` that hands its {@link MenuItem} back to the
 * shell. A node kind added there is a `check-types` error in
 * `./MenuRow.tsx` rather than a row that draws nothing.
 *
 * It decides nothing about what a chosen row DOES, either. Every row
 * answers upward through one of the three `onChoose*` props, so the
 * corner slot, the About popover and the open-surface slot all stay
 * where `./Shell.tsx` holds them. Every piece of state a panel does
 * hold is about the menu's own presentation and nothing else: which
 * row a roving focus is on, which submenu is open, which element
 * React attached, and whether a position has been computed for it.
 *
 * ## Three files, and why
 *
 * `./menuFocus.ts` holds the parts of this component that are
 * statable as a value: where a panel prefers to open, per corner, and
 * where a roving focus goes next, per key. Both are pinned by
 * `./menuFocus.test.ts` under the jsdom vitest project, which is the
 * package's two-runner discipline — that project collects `.ts`
 * only, so a decision left in a `.tsx` is reachable by the forced
 * Playwright spec and by nothing else.
 *
 * `./MenuRow.tsx` holds the row: which role and which ARIA state each
 * node kind becomes. It is a second file rather than a section of
 * this one because a panel and a row have nothing in common but the
 * node they read — the panel is all state, effects and listeners,
 * the row has none of the three — and because one file carrying
 * both ran to 793 lines against this plan's 800-line cap.
 *
 * What is left here is the panel: attach a listener, move focus to an
 * element, hand a node to `@floating-ui/dom`.
 *
 * ## Positioning
 *
 * `computePosition` with `strategy: 'fixed'` against the trigger,
 * under three middleware in order: `offset` for the gap, then `flip`,
 * then `shift`, both padded off the viewport edge. `flip` swaps the
 * whole placement when the preferred side has no room and `shift`
 * slides the panel back along the cross axis when it would overhang,
 * which is between them what makes all four corners safe — the
 * preferred placement from `./menuFocus.ts` only has to point inward
 * to start with. `autoUpdate` keeps the subscription, so the panel
 * follows the trigger when the Position submenu moves it and when the
 * viewport is scrolled or resized.
 *
 * The computed offset is written to the panel's inline `transform`
 * and never to its `translate`, for two reasons that are both
 * `../styles.css`'s. That stylesheet's header already states that
 * `@floating-ui/dom` writes `transform` and that its own motion
 * therefore uses the independent `scale` and `translate` properties
 * — this file is the other half of that sentence. And its
 * `prefers-reduced-motion: reduce` block sets `translate: none
 * !important` on every element in the scope, which would ERASE a
 * position written there and leave the menu at the document's
 * top-left corner for exactly the operators who asked for less
 * motion. One consequence: CSS composes `scale` BEFORE `transform`,
 * so while the open transition runs from `scale: 0.97` to `1` the
 * offset is scaled with it and the panel eases the last ~3% into
 * place. At rest, and under reduced motion where `scale: none`, it is
 * exact.
 *
 * ## A submenu is PORTALLED out of the panel that owns it
 *
 * Measured, and the reading is worth keeping because the symptom
 * names the wrong culprit. Rendered as a DOM descendant of its parent
 * `<ul>`, a submenu came out at the right coordinates and was
 * unclickable: a headless probe read the parent panel at `[677, 460]`
 * with an inline `translate(677px, 460px)`, the submenu at `[472,
 * 470]` with `translate(-212px, 8px)`, and
 * `document.elementFromPoint` at the submenu's own centre answering
 * `<body>`. Playwright's message for it is `<body> intercepts pointer
 * events`, which reads like a z-index problem and is not one.
 *
 * The chain: a non-`none` `transform` makes an element the containing
 * block for its `position: fixed` descendants, so the parent panel
 * became the submenu's containing block. `@floating-ui/dom` handles
 * that correctly -- the negative `translate` above IS the right
 * answer relative to that block, and the rect proves it. What does
 * not survive is `.devtools-menu`'s `overflow-y: auto` in
 * `../styles.css`: a fixed descendant escapes an ancestor's clip only
 * when that ancestor is not its containing block, and here it is. The
 * panel was clipping its own child.
 *
 * So every submenu is rendered through `createPortal` into the
 * widget's `[data-devtools-root]` element, where its `position:
 * fixed` is the viewport's again. React events still travel the REACT
 * tree through a portal, so the `stopPropagation` the key handler
 * relies on is unaffected; the one thing that breaks is DOM
 * containment, which is why the outside-press test asks
 * `closest('.devtools-menu')` rather than `panel.contains`.
 *
 * `data-open` is written from whether a position has been computed,
 * not from the open slot the shell holds. `.devtools-menu` is
 * `opacity: 0` until `data-open='true'`, so that one attribute is
 * both the enter transition AND the guard against a frame of the
 * panel painted at `top: 0; left: 0` before `computePosition`
 * resolves.
 *
 * ## Roving focus
 *
 * One tab stop per panel: the active row is `tabIndex={0}` and every
 * other row is `-1`, and an effect moves real DOM focus whenever the
 * active index changes. The menu is opened with the first row active,
 * so a keyboard operator who pressed Enter on the trigger is already
 * inside the list.
 *
 * The key map, which is this file's and not `./menuFocus.ts`'s beyond
 * the four movement keys:
 *
 * | Key                | In the root panel        | In a submenu              |
 * | ------------------ | ------------------------ | ------------------------- |
 * | Down / Up          | move, wrapping           | move, wrapping            |
 * | Home / End         | first row / last row     | first row / last row      |
 * | Right              | open the row's submenu   | open a nested one         |
 * | Left               | nothing                  | close, focus parent row   |
 * | Escape             | dismiss, focus trigger   | close, focus parent row   |
 * | Tab                | dismiss, focus trigger   | dismiss, focus trigger    |
 *
 * Tab is a dismissal rather than a pass-through: a panel holds one
 * tab stop, so the platform's Tab would leave the menu standing with
 * focus somewhere behind it. That is what the ARIA authoring
 * practices describe, minus the refinement of landing on the element
 * after the trigger.
 *
 * Every key in that table is stopped from propagating, because a
 * submenu is a child of the row that opened it IN THE REACT TREE and
 * React bubbles a synthetic event along that tree whether or not the
 * portal below moved the DOM: without the stop, one Escape inside a
 * submenu would close the submenu and then reach the root panel and
 * dismiss the whole menu.
 *
 * ## Dismissal, and where focus lands
 *
 * Escape, Tab, an outside pointer press and choosing any row but a
 * corner all dismiss. The root panel focuses the trigger on the way
 * out, so focus is never orphaned on an element React is about to
 * remove; a submenu delegates upward rather than focusing the trigger
 * itself, which is why {@link MenuPanelProps.onCloseSelf} is `null`
 * at the root and a function everywhere below it.
 *
 * Outside dismissal listens for `pointerdown` in the capture phase.
 * The trigger's own subtree is excluded, or pressing the tomato to
 * close the menu would dismiss on `pointerdown` and reopen on the
 * `click` that followed.
 *
 * The trigger is focused on the way out of an outside press too, and
 * the first shape of that lost every time: `pointerdown` fires before
 * `mousedown`, whose default action then focuses what was pressed or,
 * when nothing there can take focus, clears it to `<body>`. Measured
 * on the first shape: a press on empty page left focus on `BODY`, not
 * on the trigger. So the restore is deferred past that default and
 * applied only when focus ended up nowhere, which reads `Dev tools`
 * for a press on empty page and `app-button` for a press on an app
 * control (both measured, below).
 *
 * ## Choosing a corner does NOT close the menu
 *
 * Spec item 3 says the Position submenu moves the trigger "at once",
 * and every other row's handler dismisses. A corner row's does not:
 * the operator moving the tomato out of the way is comparing corners,
 * and a menu that shut after each one would make that four round
 * trips. The trigger moves under the open menu, `autoUpdate` follows
 * it, and the checkmark moves with the model the shell re-derives.
 *
 * ## Which keyboard behaviour is proved by what
 *
 * Required by the task, and the answer is shorter than it should be.
 * The gates this package has are `bun run test` — jsdom, `.ts` only,
 * so it never renders this file — and the one forced Playwright spec
 * of plan stage E2E, whose case list is fixed: the trigger mounts in
 * the configured corner, THE MENU OPENS BY KEYBOARD, each of the four
 * corners moves the trigger, a reload resets the corner while the
 * size survives, About shows the commit, a modal traps focus and
 * closes on Escape, a drawer leaves the page interactive, a second
 * drawer item closes the first, and a handle collapses and expands.
 *
 * Read against the key map above:
 *
 * - Enter/Space on the trigger opening the menu is proved ONLY by the
 *   forced spec's second case. There is no code here to prove: the
 *   trigger is a native `<button>`, so the platform turns both keys
 *   into the `click` that toggles the shell's slot. That is the whole
 *   reason `./Trigger.tsx` is a `<button>` and not a `role="button"`
 *   div, and the forced spec is what would catch it becoming one.
 * - The four movement keys are proved TWICE, in halves. Which index
 *   the move lands on is `./menuFocus.test.ts`'s, over 15 cases; that
 *   the index becomes real DOM focus on the right element is the
 *   forced spec's shape, and the forced spec's case list does not ask
 *   for it. So the half that is DOM is proved by nothing.
 * - Right and Left traversing into and out of a submenu, Escape
 *   dismissing the menu and returning focus to the trigger, Tab
 *   dismissing, and outside-press dismissal are proved by NOTHING in
 *   this plan. The forced spec's Escape case is the modal's Escape,
 *   which the platform handles inside `<dialog>` and which never
 *   reaches this file.
 *
 * That gap is recorded as a debt in
 * `.rafa/plans/CLOSEOUT-q20b-1-dev-tools-shell.md` rather than closed
 * here: widening the forced spec is plan stage E2E's task, and this
 * task may not write it. A reader who changes the key map should
 * expect every gate to stay green. The probe below is a one-off and
 * not a gate: it ran once, against a harness kept in `/tmp`, and
 * nothing re-runs it.
 *
 * ## Measured — the static markup
 *
 * Read off a `react-dom/server` probe kept in `/tmp`, because the
 * jsdom project collects `.ts` only and no colocated case can render
 * this file. The twenty-one readings and the three controls that
 * could have failed are written down in `./MenuRow.tsx`'s header,
 * beside the role table they check.
 *
 * ## Measured — the live behaviour, once, off a gate
 *
 * A headless Chromium driver in `/tmp` over a Vite-served harness of
 * this component, the trigger and `./menuModel.ts`. Not a gate and
 * not re-run; it is what the plan's own e2e stage would have to
 * carry to become one. Every reading below came out as designed on
 * the shape that shipped, and three of them did not on earlier ones:
 *
 * - All four corners at 900x700: the root panel and an open Position
 *   submenu both inside the viewport, no page error. At 360x420 the
 *   submenu read `left: -69` until `shift` was given `crossAxis`, and
 *   `left: 11` after.
 * - Keyboard from the trigger: Enter opens onto `Position`; Down
 *   `About`; End `Beta`; Down again wraps to `Position`; Home
 *   `Position`; Up wraps to `Beta`. Right opens the Position submenu
 *   onto `Top left` with the parent row `aria-expanded="true"`; End
 *   inside it `Bottom left`; Left closes it, returns to `Position`
 *   and leaves zero submenus in the document. Escape then dismisses
 *   with focus on `Dev tools` and the trigger `aria-expanded="false"`.
 * - Escape INSIDE a submenu leaves one panel standing and focus on
 *   the parent row — the `stopPropagation` the key map describes.
 * - Choosing `Top left` moved the trigger from `839,639` to `16,16`,
 *   left both panels open, moved the checkmark, and both panels
 *   followed the trigger and stayed inside.
 * - Outside press on empty page: dismissed, focus `Dev tools`. On the
 *   harness's own app button: dismissed, focus `app-button`.
 *   Choosing an item dismissed and reported the item's id.
 * - Controls: the open panel read `659,450`, and reading it again
 *   with its inline `transform` deleted read `3,3` — so the
 *   position is the one `@floating-ui/dom` wrote and not the
 *   stylesheet's `top: 0; left: 0`.
 */

import type { MenuFixedNode, MenuNode } from './menuModel';
import type { Corner, MenuItem } from './types';
import type { Placement } from '@floating-ui/dom';
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  SetStateAction,
} from 'react';

import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  DEVTOOLS_MENU_GAP,
  DEVTOOLS_MENU_VIEWPORT_PADDING,
  menuPlacementForCorner,
  nextMenuIndex,
  submenuPlacementForCorner,
} from './menuFocus';
import { MenuRow } from './MenuRow';

/** The root panel's accessible name, used when no `label` is passed. */
const DEFAULT_MENU_LABEL = 'Dev tools menu';

/**
 * Every key this component answers, so one membership test decides
 * what to stop from propagating.
 *
 * The four movement keys are here as well as in `./menuFocus.ts`,
 * which is not a duplicated decision: that module says where a move
 * LANDS, this set says which keys a panel swallows on its way up
 * through a nested one.
 */
const HANDLED_KEYS: ReadonlySet<string> = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'Escape',
  'Tab',
]);

/** Which submenu is open, and the row it is anchored to. */
interface OpenSubmenu {
  /** The submenu node's id. */
  readonly id: string;

  /** The row element `@floating-ui/dom` positions against. */
  readonly anchor: HTMLElement;
}

/** What {@link DevToolsMenu} takes. */
export interface DevToolsMenuProps {
  /**
   * Whether the menu is open.
   *
   * `false` renders nothing at all rather than a hidden list, so the
   * panel's three pieces of state are created fresh on every open and
   * a stale roving index can never survive a close.
   */
  readonly open: boolean;

  /** The rows, exactly as `./menuModel.ts` answered them. */
  readonly nodes: readonly MenuNode[];

  /**
   * The trigger, to position against.
   *
   * `null` while the shell's ref has not been attached; the panel
   * renders and stays invisible until a position can be computed.
   */
  readonly anchor: HTMLElement | null;

  /** Where the trigger is right now, which is what says where to open. */
  readonly corner: Corner;

  /**
   * The root panel's accessible name.
   *
   * @defaultValue `'Dev tools menu'`
   */
  readonly label?: string;

  /** Close the menu. The component has already moved focus by then. */
  readonly onDismiss: () => void;

  /** Move the trigger. Does NOT close the menu — see the header. */
  readonly onChooseCorner: (corner: Corner) => void;

  /** Act on About or on Save settings. Closes the menu. */
  readonly onChooseFixed: (id: MenuFixedNode['id']) => void;

  /** Open a feature's surface. Closes the menu. */
  readonly onChooseItem: (item: MenuItem) => void;
}

/**
 * Keep a panel positioned against its anchor for as long as both are
 * mounted.
 *
 * @param anchor - What to position against: the trigger for the root
 * panel, the parent row for a submenu.
 * @param placement - Where the panel PREFERS to open; `flip` and
 * `shift` may move it.
 * @returns The panel element once React has attached it, the setter
 * to pass as its `ref`, and whether a position has been computed yet.
 */
function useAnchoredPanel(
  anchor: HTMLElement | null,
  placement: Placement,
): {
  panel: HTMLElement | null;
  setPanel: Dispatch<SetStateAction<HTMLElement | null>>;
  positioned: boolean;
} {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [positioned, setPositioned] = useState(false);

  useEffect(() => {
    if (anchor === null || panel === null) {
      return undefined;
    }

    // `autoUpdate` answers its own disposer, so the subscription is
    // torn down with the panel rather than left on the document.
    return autoUpdate(anchor, panel, () => {
      void computePosition(anchor, panel, {
        strategy: 'fixed',
        placement,
        middleware: [
          offset(DEVTOOLS_MENU_GAP),
          flip({ padding: DEVTOOLS_MENU_VIEWPORT_PADDING }),
          // `crossAxis` as well as the default main axis. Without it
          // a submenu, whose placement is `left-*` or `right-*`, can
          // only slide vertically -- and a viewport too narrow for
          // either side leaves it off-screen after `flip` has run out
          // of sides to try. Measured: 360x420 put a submenu at
          // `left: -69` under `shift` alone.
          shift({
            crossAxis: true,
            padding: DEVTOOLS_MENU_VIEWPORT_PADDING,
          }),
        ],
      }).then(({ x, y }) => {
        // `transform`, never `translate` -- see the header for the
        // two stylesheet readings that forbid the other spelling.
        panel.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        setPositioned(true);
      });
    });
  }, [anchor, panel, placement]);

  return { panel, setPanel, positioned };
}

/** What {@link MenuPanel} takes. */
interface MenuPanelProps {
  /** The rows this panel holds. */
  readonly nodes: readonly MenuNode[];

  /** The trigger, or the row that opened this submenu. */
  readonly anchor: HTMLElement | null;

  /** Where the trigger is, which is what says which way to open. */
  readonly corner: Corner;

  /** This panel's accessible name. */
  readonly label: string;

  /** Close the WHOLE menu, however deep this panel is. */
  readonly onDismiss: () => void;

  /**
   * Close this panel alone and hand focus to the row that opened it,
   * or `null` in the root panel.
   *
   * The `null` is the discriminant for "this is the root": it is what
   * decides whether Escape dismisses or steps back, and whether the
   * outside-press listener is installed at all.
   */
  readonly onCloseSelf: (() => void) | null;

  /** Move the trigger. */
  readonly onChooseCorner: (corner: Corner) => void;

  /** Act on About or on Save settings. */
  readonly onChooseFixed: (id: MenuFixedNode['id']) => void;

  /** Open a feature's surface. */
  readonly onChooseItem: (item: MenuItem) => void;
}

/**
 * One `role="menu"` list: the root panel, or any submenu under it.
 *
 * Recursive — a submenu row renders another of these, anchored to
 * itself — so the root and every child share one implementation of
 * roving focus, positioning and dismissal.
 *
 * @param props - {@link MenuPanelProps}.
 * @returns The panel.
 */
function MenuPanel({
  nodes,
  anchor,
  corner,
  label,
  onDismiss,
  onCloseSelf,
  onChooseCorner,
  onChooseFixed,
  onChooseItem,
}: MenuPanelProps): ReactElement {
  const rowsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submenu, setSubmenu] = useState<OpenSubmenu | null>(null);
  // The row list can shrink under a panel that is already open -- the
  // Save settings row leaves when a status payload says the server
  // stopped persisting -- so what is DRAWN as active is clamped here
  // rather than corrected by an effect, which would be a cascading
  // render. The raw index stays in state and is what the key handler
  // moves from, because `nextMenuIndex` takes an out-of-range one.
  const activeRow = Math.min(activeIndex, Math.max(nodes.length - 1, 0));
  const isRoot = onCloseSelf === null;
  const placement = isRoot
    ? menuPlacementForCorner(corner)
    : submenuPlacementForCorner(corner);
  const { panel, setPanel, positioned } = useAnchoredPanel(anchor, placement);

  const dismiss = useCallback(() => {
    // Only the root knows the trigger; a submenu delegates rather
    // than reaching past its parent for it.
    if (onCloseSelf === null) {
      anchor?.focus();
    }

    onDismiss();
  }, [anchor, onCloseSelf, onDismiss]);

  // The roving focus, made real. Runs on mount too, which is what
  // puts a keyboard operator on the first row as the menu opens.
  useEffect(() => {
    rowsRef.current[activeRow]?.focus();
  }, [activeRow]);

  useEffect(() => {
    if (!isRoot || panel === null) {
      return undefined;
    }

    const onPointerDown = (event: PointerEvent): void => {
      const { target } = event;

      if (!(target instanceof Node)) {
        return;
      }

      const element = target instanceof Element
        ? target
        : target.parentElement;

      // Containment is asked of the CLASS every panel carries, not of
      // this panel's subtree: a submenu is portalled out of its
      // parent, so it is not a DOM descendant of the root. The
      // trigger is excluded as well, or a press on the tomato would
      // dismiss here and reopen on the `click` that followed.
      if (element?.closest('.devtools-menu') != null) {
        return;
      }

      if (anchor?.contains(target) === true) {
        return;
      }

      dismiss();

      // `dismiss` has already focused the trigger, and the browser is
      // about to overrule it: `mousedown`'s default action runs after
      // this handler and either focuses what was pressed or, when
      // nothing there can take focus, clears it to `<body>` (both
      // measured). Re-asserting it is deferred to after that, and
      // only for the second case -- a press on an app control keeps
      // the focus it earned, a press on nothing does not orphan a
      // keyboard operator on the body.
      window.setTimeout(() => {
        const active = document.activeElement;

        if (active === null || active === document.body) {
          anchor?.focus();
        }
      }, 0);
    };

    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [anchor, dismiss, isRoot, panel]);

  const highlight = useCallback((index: number, nodeId: string) => {
    setActiveIndex(index);
    // Pointing at a DIFFERENT row closes the submenu; pointing back
    // at the row that opened one leaves it standing.
    setSubmenu((current) => (
      current === null || current.id === nodeId
        ? current
        : null
    ));
  }, []);

  const closeSubmenu = useCallback((index: number) => {
    setSubmenu(null);
    setActiveIndex(index);
    // Focus the parent row NOW, before React commits the submenu's
    // removal, so focus is never handed to the document body.
    rowsRef.current[index]?.focus();
  }, []);

  const activate = useCallback((
    index: number,
    node: MenuNode,
    element: HTMLButtonElement,
  ) => {
    setActiveIndex(index);

    switch (node.kind) {
      // A corner moves the trigger at once and leaves the menu up.
      case 'corner':
        onChooseCorner(node.corner);
        return;

      case 'submenu':
        setSubmenu((current) => (
          current?.id === node.id
            ? null
            : { id: node.id, anchor: element }
        ));
        return;

      case 'fixed':
        onChooseFixed(node.id);
        dismiss();
        return;

      default:
        onChooseItem(node.item);
        dismiss();
    }
  }, [dismiss, onChooseCorner, onChooseFixed, onChooseItem]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const { key } = event;

    if (!HANDLED_KEYS.has(key)) {
      return;
    }

    // Stopped for every handled key: a submenu is a child of its row
    // in the REACT tree whatever the portal did to the DOM, so
    // without this an Escape inside one would reach the root panel
    // as well and dismiss the whole menu.
    event.stopPropagation();

    if (key === 'Escape' || key === 'Tab') {
      event.preventDefault();

      // Tab dismisses from any depth; Escape steps back one panel
      // and only dismisses from the root.
      if (key === 'Tab' || onCloseSelf === null) {
        dismiss();
      } else {
        onCloseSelf();
      }

      return;
    }

    const moved = nextMenuIndex(key, activeIndex, nodes.length);

    if (moved !== null) {
      event.preventDefault();
      setActiveIndex(moved);
      setSubmenu(null);
      return;
    }

    if (key === 'ArrowRight') {
      const node = nodes[activeRow];
      const row = rowsRef.current[activeRow];

      if (node?.kind === 'submenu' && row !== null && row !== undefined) {
        event.preventDefault();
        setSubmenu({ id: node.id, anchor: row });
      }

      return;
    }

    if (onCloseSelf !== null) {
      event.preventDefault();
      onCloseSelf();
    }
  };

  return (
    <ul
      ref={setPanel}
      className="devtools-menu"
      role="menu"
      aria-label={label}
      data-open={positioned}
      onKeyDown={handleKeyDown}
    >
      {nodes.map((node, index) => (
        <li key={node.id} role="none">
          <MenuRow
            node={node}
            active={index === activeRow}
            expanded={submenu?.id === node.id}
            ref={(element) => { rowsRef.current[index] = element; }}
            onActivate={(element) => { activate(index, node, element); }}
            onHighlight={() => { highlight(index, node.id); }}
          />

          {node.kind === 'submenu' && submenu?.id === node.id
            ? createPortal(
              <MenuPanel
                nodes={node.children}
                anchor={submenu.anchor}
                corner={corner}
                label={node.label}
                onDismiss={dismiss}
                onCloseSelf={() => { closeSubmenu(index); }}
                onChooseCorner={onChooseCorner}
                onChooseFixed={onChooseFixed}
                onChooseItem={onChooseItem}
              />,
              // Out of this panel and up to the widget's own root --
              // see the header. Read off the row rather than taken as
              // a prop, so the lookup happens only when a submenu is
              // actually open and never during a server render.
              submenu.anchor.closest('[data-devtools-root]')
                ?? submenu.anchor.ownerDocument.body,
            )
            : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * The menu the tomato opens.
 *
 * Renders NOTHING while shut, so every open starts from a fresh
 * roving index, a shut submenu and an uncomputed position. See the
 * module comment for the key map, for what each dismissal does with
 * focus, and for which of it any gate in this plan proves.
 *
 * @param props - {@link DevToolsMenuProps}.
 * @returns The root panel, or `null` while the menu is shut.
 */
export function DevToolsMenu({
  open,
  nodes,
  anchor,
  corner,
  label = DEFAULT_MENU_LABEL,
  onDismiss,
  onChooseCorner,
  onChooseFixed,
  onChooseItem,
}: DevToolsMenuProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <MenuPanel
      nodes={nodes}
      anchor={anchor}
      corner={corner}
      label={label}
      onDismiss={onDismiss}
      onCloseSelf={null}
      onChooseCorner={onChooseCorner}
      onChooseFixed={onChooseFixed}
      onChooseItem={onChooseItem}
    />
  );
}
