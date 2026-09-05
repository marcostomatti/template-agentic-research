import { cva, type VariantProps } from 'class-variance-authority';

/**
 * TreeNav — the WAI-ARIA tree pattern as a controlled component: a
 * nested list of positions, one of which is selected, some of which
 * are expanded. Built for the two-column shells where a structure is
 * navigated on the left and one thing at a time is edited on the
 * right.
 *
 * ## Why the row chrome is not on the `li`
 *
 * The pattern puts `role="treeitem"` on the `li` and nests a
 * `role="group"` list of children INSIDE it, so the `li` box wraps
 * the whole subtree. Painting selection or a focus ring there would
 * fill the branch and everything under it rather than the one row
 * that is selected.
 *
 * So the `li` carries structure and focus only, and every visible
 * treatment sits on the row `span` inside it. The focus ring is
 * driven across that boundary by the named group `group/tree-item`:
 * focus is on the `li` (the pattern's roving tabindex has nowhere
 * else to put it) and the ring is drawn on the row. That class is
 * load-bearing and not decoration — removing it silently leaves
 * keyboard users with no visible focus at all.
 *
 * ## No enter or exit motion, deliberately
 *
 * A collapsed branch renders NO children, and an expanded one renders
 * them immediately: there is no height transition, no fade and no
 * `@keyframes` anywhere in this component, so every element it draws
 * reports `animationName: none` at rest. Consumers screenshot their
 * surfaces and hold a settled-state motion inventory against a
 * reduced-motion suite; a tree that animated its own expansion would
 * put a subject in that inventory for the sake of a 150ms reveal.
 *
 * The one transition is `background-color` on the row, which is the
 * hover treatment every row chrome in this package carries (see
 * `AppShell.variants.ts`'s `navItem`) and is not enter/exit motion.
 */
export const treeNav = cva('m-0 flex list-none flex-col gap-0.5 p-0');

/**
 * A branch's children. `role="group"` in the markup, so its indent
 * and rule are the only depth affordance the pattern gets — there
 * is no `aria-level` to read, nesting being implicit in the DOM.
 *
 * The left rule is on the group rather than on each row so it runs
 * unbroken past a row's own padding, which is what makes two sibling
 * subtrees readable at the same indent.
 */
export const treeNavGroup = cva([
  'm-0 ml-3 flex list-none flex-col gap-0.5',
  'border-l border-border-soft py-0 pr-0 pl-2',
]);

/**
 * One treeitem. Structure and focus only — see the header for why
 * the visible treatment is one level down, and why `group/tree-item`
 * is not optional.
 *
 * `list-none` is repeated here rather than inherited: a `role="tree"`
 * or `role="group"` list is no longer a list to the browser's default
 * stylesheet in every engine, and a marker appearing in one of them
 * would move a pixel in exactly one baseline.
 */
export const treeNavItem = cva(
  'group/tree-item list-none focus:outline-none focus-visible:outline-none',
);

/**
 * The visible row: twisty, then label. Selection is the axis because
 * it is the one thing a consumer controls about a row's appearance —
 * expansion shows in the twisty and focus comes through the group.
 *
 * `hover` is on the unselected arm alone: a hover fill on the row
 * that is already filled reads as the selection having moved.
 */
export const treeNavRow = cva(
  [
    'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5',
    'cursor-pointer text-left text-sm transition-[background-color]',
    'group-focus-visible/tree-item:ring-2',
    'group-focus-visible/tree-item:ring-leaf',
  ],
  {
    variants: {
      selected: {
        false: [
          'bg-transparent font-medium text-fg2',
          'hover:bg-[color-mix(in_oklab,var(--surface-sunk)_55%,transparent)]',
        ],
        true: 'bg-surface-sunk font-semibold text-fg1',
      },
    },
    defaultVariants: { selected: false },
  },
);

/**
 * The expand/collapse glyph, and the same box a leaf reserves so
 * labels at one depth start at one x.
 *
 * One chevron rotated rather than two glyphs, and rotated with no
 * transition: the state change is instant for the reason the header
 * gives. The `leaf` arm is empty rather than `invisible` because a
 * leaf renders no glyph at all — the arm exists to reserve the box.
 */
export const treeNavTwisty = cva(
  'flex h-4 w-4 shrink-0 items-center justify-center text-fg3',
  {
    variants: {
      state: {
        collapsed: '-rotate-90 cursor-pointer',
        expanded: 'rotate-0 cursor-pointer',
        leaf: '',
      },
    },
    defaultVariants: { state: 'leaf' },
  },
);

/**
 * The row's text. `truncate` plus `min-w-0` so a long label shortens
 * instead of pushing the row wider than its column — a tree lives in
 * a rail whose width is not its own.
 */
export const treeNavLabel = cva('min-w-0 flex-1 truncate');

export type TreeNavRowVariants = VariantProps<typeof treeNavRow>;
export type TreeNavTwistyVariants = VariantProps<typeof treeNavTwisty>;
