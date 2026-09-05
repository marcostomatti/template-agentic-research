import type { Meta, StoryObj } from '@storybook/react-vite';

import { TreeNav, type TreeNavNode } from './TreeNav';

/**
 * Fixed keys and labels: the visual suite screenshots every story in
 * both themes, so nothing here may be generated or read from a clock.
 *
 * The keys are spelled the way a consumer that navigates a data
 * structure spells them — a root marker, then one tagged segment per
 * step — because that is the shape a key collision would show up in,
 * and a story using `a`/`b`/`c` would never show it. Nothing in the
 * component parses them; they are opaque identities.
 */
const ROOT_KEY = '$';
const TERM_1_KEY = '$/i:0';
const TERM_2_KEY = '$/i:1';
const ALIASES_KEY = '$/i:0/k:aliases';
const EXCLUSIONS_KEY = '$/i:0/k:exclusions';

/** Root, three terms, and two container members under the first. */
const THREE_LEVELS: readonly TreeNavNode[] = [
  {
    key: ROOT_KEY,
    label: 'Term entries',
    children: [
      {
        key: TERM_1_KEY,
        label: 'Term 1',
        children: [
          { key: ALIASES_KEY, label: 'Aliases', children: [] },
          { key: EXCLUSIONS_KEY, label: 'Exclusions', children: [] },
        ],
      },
      {
        key: TERM_2_KEY,
        label: 'Term 2',
        children: [
          { key: '$/i:1/k:aliases', label: 'Aliases', children: [] },
        ],
      },
      { key: '$/i:2', label: 'Term 3', children: [] },
    ],
  },
];

/** Every branch in {@link THREE_LEVELS}, so nothing is hidden. */
const ALL_EXPANDED: readonly string[] = [ROOT_KEY, TERM_1_KEY, TERM_2_KEY];

/** No nesting at all — three siblings, each a leaf. */
const FLAT: readonly TreeNavNode[] = [
  { key: '$/k:pattern', label: 'Pattern', children: [] },
  { key: '$/k:weight', label: 'Weight', children: [] },
  { key: '$/k:notes', label: 'Notes', children: [] },
];

const meta = {
  title: 'Molecules/TreeNav',
  component: TreeNav,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    nodes: THREE_LEVELS,
    expandedKeys: ALL_EXPANDED,
    label: 'Term entries',
    onSelect: () => undefined,
    onToggle: () => undefined,
  },
} satisfies Meta<typeof TreeNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A tree lives in a rail whose width is not its own, so every story
 * is shown in one — which is also what puts the label truncation
 * under a real constraint rather than an unbounded one.
 */
const RAIL: Story['decorators'] = [
  (Story) => (
    <div className="w-64">
      <Story />
    </div>
  ),
];

/**
 * Three levels, every branch open, nothing selected: the root, the
 * items under it, and the container members under one of those. The
 * indent rule is the only depth cue the pattern gets — nesting is
 * implicit in the DOM, so there is no `aria-level` to read.
 */
export const Default: Story = {
  decorators: RAIL,
};

/**
 * The degenerate shape: no node has children, so no row draws a
 * twisty and ArrowRight does nothing anywhere. Every label still
 * starts at the same x, because a leaf reserves the twisty's box
 * rather than closing the gap.
 */
export const Flat: Story = {
  decorators: RAIL,
  args: {
    nodes: FLAT,
    expandedKeys: [],
    label: 'Term 1 members',
  },
};

/**
 * One branch closed beside one open, which is the contrast the
 * chevron carries: `Term 1` is collapsed and its two members are not
 * in the DOM at all, while `Term 2` is open. A collapsed branch
 * still reports `aria-expanded="false"`, so it stays announced as
 * openable.
 */
export const CollapsedBranch: Story = {
  decorators: RAIL,
  args: {
    expandedKeys: [ROOT_KEY, TERM_2_KEY],
  },
};

/**
 * A leaf three levels down is selected. Exactly one row carries
 * `aria-selected`, and the selection is also where a first Tab into
 * the tree lands — the roving tabindex falls back to the selection
 * before it falls back to the first row.
 */
export const SelectedLeaf: Story = {
  decorators: RAIL,
  args: {
    selectedKey: EXCLUSIONS_KEY,
  },
};
