import {
  forwardRef,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import {
  treeNav,
  treeNavGroup,
  treeNavItem,
  treeNavLabel,
  treeNavRow,
  treeNavTwisty,
} from './TreeNav.variants';

/**
 * One position in the tree, as this component draws it.
 *
 * Three members and nothing else. A consumer's own node type is
 * whatever its domain needs — a path, a schema, a value — and
 * projecting it down to this is what keeps a tree component out of
 * that domain: nothing here knows what a node IS, only what it is
 * called, what identifies it, and what sits under it.
 *
 * `key` is the identity every prop and callback on this component
 * speaks in. It has to be unique across the whole tree: React reuses
 * a component across two elements sharing a key, and this component
 * addresses rows by key when it moves focus, so a collision shows up
 * as focus landing on the wrong row rather than as an error.
 */
export interface TreeNavNode {
  /** Unique across the whole tree — see the interface note. */
  readonly key: string;
  /** What the row draws, and the treeitem's accessible name. */
  readonly label: string;
  /** The positions nested under this one; empty makes this a leaf. */
  readonly children: readonly TreeNavNode[];
}

export interface TreeNavProps
  extends Omit<HTMLAttributes<HTMLUListElement>, 'onSelect' | 'onToggle'> {
  /** The forest to draw. A single-rooted tree is a one-member list. */
  nodes: readonly TreeNavNode[];
  /**
   * The selected node's key, or nothing selected. Exactly one row
   * carries `aria-selected` at a time; a key naming no visible row
   * simply selects nothing.
   */
  selectedKey?: string;
  /** A row was activated, by click or by Enter/Space. */
  onSelect?: (key: string) => void;
  /**
   * Which branches are open. Owned by the caller: this component
   * holds no node state, so a tree with no `onToggle` is a tree whose
   * expansion is fixed, and that is a legitimate configuration.
   */
  expandedKeys: readonly string[];
  /** A branch's twisty was clicked, or ArrowRight/ArrowLeft asked. */
  onToggle?: (key: string) => void;
  /** The tree's accessible name. */
  label?: string;
}

/**
 * One row as the keyboard sees it: flattened, and visible.
 *
 * The rendering is recursive because the markup is nested; movement
 * is not, because ArrowDown goes to the next VISIBLE row wherever it
 * sits in the nesting. Flattening once per render is what lets every
 * key be an index step rather than a walk, and it is the same list
 * the roving tabindex picks its one tabbable row out of.
 */
interface TreeNavRowModel {
  /** The node's key. */
  readonly key: string;
  /** The enclosing branch's key, or `null` at the top level. */
  readonly parentKey: string | null;
  /** The first child's key, or `null` at a leaf. */
  readonly firstChildKey: string | null;
  /** Whether this branch is open. Always `false` at a leaf. */
  readonly expanded: boolean;
}

/** What every row needs from the component that owns the tree. */
interface TreeNavItemControl {
  readonly expandedKeys: ReadonlySet<string>;
  readonly selectedKey: string | undefined;
  readonly tabbableKey: string | undefined;
  readonly register: (key: string, element: HTMLLIElement | null) => void;
  readonly focusRow: (key: string) => void;
  readonly selectRow: (key: string) => void;
  readonly toggleRow: (key: string) => void;
  readonly keyDown: (
    event: ReactKeyboardEvent<HTMLLIElement>,
    key: string,
  ) => void;
}

interface TreeNavItemProps {
  readonly node: TreeNavNode;
  readonly control: TreeNavItemControl;
}

/**
 * The visible rows, top to bottom, in the order the arrow keys walk.
 *
 * A collapsed branch contributes itself and none of its children,
 * which is the whole definition of visible here — and is why the
 * markup can leave a collapsed branch's children unrendered.
 *
 * @param nodes - The forest at this depth.
 * @param expandedKeys - The open branches.
 * @param parentKey - The enclosing branch, or `null` at the top.
 * @returns One row per visible node, depth first.
 */
function visibleRows(
  nodes: readonly TreeNavNode[],
  expandedKeys: ReadonlySet<string>,
  parentKey: string | null,
): readonly TreeNavRowModel[] {
  return nodes.flatMap((node) => {
    const firstChildKey = node.children[0]?.key ?? null;
    const expanded = firstChildKey !== null && expandedKeys.has(node.key);
    const row = { key: node.key, parentKey, firstChildKey, expanded };

    if (!expanded) {
      return [row];
    }

    return [row, ...visibleRows(node.children, expandedKeys, node.key)];
  });
}

/**
 * Whether a key names a row that is currently visible.
 *
 * @param rows - The visible rows.
 * @param key - The key to look for.
 * @returns Whether a row carries it.
 */
function hasRow(rows: readonly TreeNavRowModel[], key: string): boolean {
  return rows.some((row) => row.key === key);
}

/**
 * The one row that is in the page's tab order.
 *
 * The tree is a single tab stop, so exactly one row carries
 * `tabindex="0"` and every other carries `-1`. Which one is a
 * three-step fallback rather than a constant: wherever focus last
 * was, else the selection, else the first row — so tabbing back into
 * a tree returns to where the operator left it, and tabbing into one
 * for the first time lands on what it is already showing.
 *
 * Each step is guarded on the key still being VISIBLE. A collapse
 * takes rows away, and a tabbable row that is no longer rendered
 * leaves the tree with no tab stop at all.
 *
 * @param rows - The visible rows.
 * @param focusedKey - The row focus last sat on, if any.
 * @param selectedKey - The selection, if any.
 * @returns The key to make tabbable, or `undefined` for an empty
 * tree.
 */
function tabbableRowKey(
  rows: readonly TreeNavRowModel[],
  focusedKey: string | null,
  selectedKey: string | undefined,
): string | undefined {
  if (focusedKey !== null && hasRow(rows, focusedKey)) {
    return focusedKey;
  }

  if (selectedKey !== undefined && hasRow(rows, selectedKey)) {
    return selectedKey;
  }

  return rows[0]?.key;
}

/**
 * Which twisty a row draws.
 *
 * @param branch - Whether the node has children.
 * @param expanded - Whether it is open.
 * @returns The variant arm to draw.
 */
function twistyState(
  branch: boolean,
  expanded: boolean,
): 'collapsed' | 'expanded' | 'leaf' {
  if (!branch) {
    return 'leaf';
  }

  if (expanded) {
    return 'expanded';
  }

  return 'collapsed';
}

/**
 * One treeitem and, when it is open, the group of its children.
 *
 * Private and recursive: the markup nests because the pattern does.
 * Everything it needs from the owner arrives in one `control` bundle
 * rather than as eight drilled props, which keeps the recursion's
 * call site to two arguments at every depth.
 *
 * Both pointer handlers stop propagation, and that is the whole of
 * how two gestures stay apart in one nested box: a click on a
 * twisty toggles WITHOUT selecting, and a click on a nested row
 * selects that row rather than every ancestor it bubbles through.
 * The cost is that a click inside the tree does not reach an
 * `onClick` a consumer put on the tree element itself.
 *
 * @param props - The node to draw and the owner's bundle.
 * @returns The treeitem.
 */
const TreeNavItem = ({ node, control }: TreeNavItemProps) => {
  const branch = node.children.length > 0;
  const expanded = branch && control.expandedKeys.has(node.key);
  const selected = node.key === control.selectedKey;
  const twisty = twistyState(branch, expanded);

  const handleClick = (event: ReactMouseEvent<HTMLLIElement>) => {
    event.stopPropagation();
    control.selectRow(node.key);
  };

  const handleTwistyClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    control.toggleRow(node.key);
  };

  // `focusin` bubbles, so an ancestor treeitem sees a descendant's
  // focus. The guard is what keeps the roving tabindex pointing at
  // the row that actually has focus rather than at its branch.
  const handleFocus = (event: ReactFocusEvent<HTMLLIElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    control.focusRow(node.key);
  };

  return (
    <li
      ref={(element) => {
        control.register(node.key, element);
      }}
      role="treeitem"
      // The name is pinned rather than left to be computed from
      // content: a branch's content includes its whole open subtree,
      // so "Term 1" would otherwise be named after everything under
      // it. It matches the visible label exactly.
      aria-label={node.label}
      aria-expanded={branch
        ? expanded
        : undefined}
      // Single-select, so only the selected row carries it — the
      // pattern's own reading, and it leaves "selected" meaning one
      // thing on a surface where nothing else is selectable.
      aria-selected={selected
        ? true
        : undefined}
      tabIndex={node.key === control.tabbableKey
        ? 0
        : -1}
      className={treeNavItem()}
      onClick={handleClick}
      onKeyDown={(event) => control.keyDown(event, node.key)}
      onFocus={handleFocus}
    >
      <span className={treeNavRow({ selected })}>
        {branch
          ? (
            <span
              role="presentation"
              className={treeNavTwisty({ state: twisty })}
              onClick={handleTwistyClick}
            >
              <StrokeIcon name="chevronDown" size={14} />
            </span>
          )
          : <span className={treeNavTwisty({ state: twisty })} aria-hidden />}
        <span className={treeNavLabel()}>{node.label}</span>
      </span>

      {expanded && (
        <ul role="group" className={treeNavGroup()}>
          {node.children.map((child) => (
            <TreeNavItem key={child.key} node={child} control={control} />
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * TreeNav — the WAI-ARIA tree pattern, fully controlled.
 *
 * `role="tree"` over `role="treeitem"`, `aria-expanded` on every
 * branch, `aria-selected` on the selected row, and a `role="group"`
 * list for an open branch's children. See `TreeNav.variants.ts` for
 * why the row chrome sits inside the treeitem rather than on it, and
 * for the deliberate absence of enter/exit motion.
 *
 * ## It holds no node state
 *
 * Selection and expansion are both props, both answered through
 * callbacks, and neither is mirrored here. That is what lets a
 * consumer derive the tree from its own data on every render and
 * lets a URL, a reducer or a parent form own where the operator is
 * standing — a tree that remembered its own open branches would be a
 * second authority for a fact the surface already holds.
 *
 * The one piece of state is which row DOM focus last sat on, which
 * is a property of the page rather than of the data: it drives the
 * roving tabindex and nothing else. See {@link tabbableRowKey}.
 *
 * ## Keyboard
 *
 * The whole tree is one tab stop. Inside it, ArrowUp/ArrowDown walk
 * the visible rows across nesting depth, Home/End reach the ends,
 * ArrowRight opens a closed branch and then steps into it,
 * ArrowLeft closes an open branch and then steps out to its parent,
 * and Enter or Space selects. Every handled key has its default
 * prevented, because all of them scroll a page otherwise.
 *
 * ArrowRight taking two presses to move into a closed branch — one
 * to open, one to enter — is the pattern's behaviour rather than a
 * shortcut not taken: the first press has to be observable on its
 * own, or an operator cannot open a branch without leaving the row
 * they are on.
 *
 * @param props - The forest, the selection, the open branches, and
 * the two callbacks that answer them.
 * @returns The tree.
 */
export const TreeNav = forwardRef<HTMLUListElement, TreeNavProps>(
  (
    {
      className,
      nodes,
      selectedKey,
      onSelect,
      expandedKeys,
      onToggle,
      label = 'Tree',
      ...props
    },
    ref,
  ) => {
    const [focusedKey, setFocusedKey] = useState<string | null>(null);
    const elements = useRef(new Map<string, HTMLLIElement>());

    const expanded = new Set(expandedKeys);
    const rows = visibleRows(nodes, expanded, null);
    const tabbableKey = tabbableRowKey(rows, focusedKey, selectedKey);

    const register = (key: string, element: HTMLLIElement | null) => {
      if (element === null) {
        elements.current.delete(key);
        return;
      }

      elements.current.set(key, element);
    };

    const moveTo = (row: TreeNavRowModel | undefined) => {
      if (row === undefined) {
        return;
      }

      setFocusedKey(row.key);
      elements.current.get(row.key)?.focus();
    };

    const rowFor = (key: string | null) => rows.find((row) => row.key === key);

    // Open, then enter — see the component note for why the two are
    // separate presses.
    const openOrDescend = (row: TreeNavRowModel) => {
      if (row.firstChildKey === null) {
        return;
      }

      if (!row.expanded) {
        onToggle?.(row.key);
        return;
      }

      moveTo(rowFor(row.firstChildKey));
    };

    const closeOrAscend = (row: TreeNavRowModel) => {
      if (row.expanded) {
        onToggle?.(row.key);
        return;
      }

      moveTo(rowFor(row.parentKey));
    };

    const keyDown = (
      event: ReactKeyboardEvent<HTMLLIElement>,
      key: string,
    ) => {
      // Keydown bubbles through every enclosing treeitem. Only the
      // row that actually has focus answers for the press.
      if (event.target !== event.currentTarget) {
        return;
      }

      const index = rows.findIndex((row) => row.key === key);
      const row = rows[index];

      if (row === undefined) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          moveTo(rows[index + 1]);
          break;
        case 'ArrowUp':
          moveTo(rows[index - 1]);
          break;
        case 'Home':
          moveTo(rows[0]);
          break;
        case 'End':
          moveTo(rows.at(-1));
          break;
        case 'ArrowRight':
          openOrDescend(row);
          break;
        case 'ArrowLeft':
          closeOrAscend(row);
          break;
        case 'Enter':
        case ' ':
          onSelect?.(key);
          break;
        default:
          // Unhandled: leave the default alone, and let the press
          // reach whatever the consumer put around the tree.
          return;
      }

      event.preventDefault();
    };

    const control: TreeNavItemControl = {
      expandedKeys: expanded,
      selectedKey,
      tabbableKey,
      register,
      focusRow: setFocusedKey,
      selectRow: (key) => onSelect?.(key),
      toggleRow: (key) => onToggle?.(key),
      keyDown,
    };

    return (
      <ul
        ref={ref}
        role="tree"
        aria-label={label}
        className={cn(treeNav(), className)}
        {...props}
      >
        {nodes.map((node) => (
          <TreeNavItem key={node.key} node={node} control={control} />
        ))}
      </ul>
    );
  },
);

TreeNav.displayName = 'TreeNav';
