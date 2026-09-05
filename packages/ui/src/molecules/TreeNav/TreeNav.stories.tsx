import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../../atoms/Button';

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

/**
 * Only the root is open, so both terms start closed and neither
 * one's members are in the DOM at all.
 */
const ROOT_ONLY: readonly string[] = [ROOT_KEY];

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

/**
 * The keyboard story owns what the tree deliberately does not: which
 * branches are open, and which row is selected. A play function
 * asserting that ArrowRight OPENED a branch has to watch a branch
 * actually open, and a fully controlled component only opens when
 * its owner says so — so this story is stateful where the four
 * above are not.
 *
 * The two buttons are instruments rather than decoration. "One Tab
 * reaches the tree and no more" is a claim about what sits on either
 * side of it, and with nothing focusable there it cannot be measured
 * at all.
 */
const KeyboardDemo = () => {
  const [expandedKeys, setExpandedKeys] = useState(ROOT_ONLY);
  const [selectedKey, setSelectedKey] = useState<string>();

  const handleToggle = (key: string) => {
    setExpandedKeys((keys) => {
      if (keys.includes(key)) {
        return keys.filter((other) => other !== key);
      }

      return [...keys, key];
    });
  };

  return (
    <div className="flex w-64 flex-col items-start gap-3">
      <Button variant="secondary" size="sm">Before the tree</Button>
      <TreeNav
        nodes={THREE_LEVELS}
        label="Term entries"
        expandedKeys={expandedKeys}
        onToggle={handleToggle}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
      />
      <Button variant="secondary" size="sm">After the tree</Button>
    </div>
  );
};

/**
 * The roving tabindex, driven end to end.
 *
 * Every row is addressed by its accessible name, which the component
 * pins with `aria-label` — a branch's name is otherwise computed
 * from its whole open subtree, and `Term 1` would match nothing the
 * moment it opens.
 *
 * The walk keeps `Term 2` closed throughout on purpose: its own
 * member shares the `Aliases` label with `Term 1`'s, so opening both
 * at once would leave two rows answering to one name and every
 * locator below it ambiguous.
 */
export const Keyboard: Story = {
  render: () => <KeyboardDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = (name: string) => canvas.getByRole('treeitem', { name });
    const focused = async (name: string) => {
      await waitFor(() => expect(row(name)).toHaveFocus());
    };

    const before = canvas.getByRole('button', { name: 'Before the tree' });
    const after = canvas.getByRole('button', { name: 'After the tree' });

    // One Tab reaches the tree. Nothing is selected and focus has
    // never been inside, so the fallback is the first row.
    before.focus();
    await userEvent.tab();
    await focused('Term entries');

    // And no more: every other row sits at tabindex -1, so the next
    // Tab leaves the whole tree rather than stepping to `Term 1`.
    await userEvent.tab();
    await expect(after).toHaveFocus();

    // Coming back in lands on the tree rather than past it.
    await userEvent.tab({ shift: true });
    await focused('Term entries');

    // ArrowDown walks VISIBLE rows only: `Term 1` is closed, so its
    // two members are not in the DOM and the step lands on `Term 2`.
    await userEvent.keyboard('{ArrowDown}');
    await focused('Term 1');
    await userEvent.keyboard('{ArrowDown}');
    await focused('Term 2');
    const hidden = canvas.queryByRole('treeitem', { name: 'Aliases' });
    await expect(hidden).toBeNull();

    // ArrowUp walks the same list backwards.
    await userEvent.keyboard('{ArrowUp}');
    await focused('Term 1');

    // The one tab stop ROVES: leaving and re-entering now returns to
    // `Term 1`, not to the first row. Asserted from here rather than
    // from the tab pair above, where the row focus left and the row
    // the tree falls back to are the same one and the claim is
    // satisfied by a tree that remembers nothing.
    await userEvent.tab();
    await expect(after).toHaveFocus();
    await userEvent.tab({ shift: true });
    await focused('Term 1');

    // ArrowRight on a closed branch opens it and stays put — one
    // press, one effect an operator can see without leaving the row.
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(row('Term 1')).toHaveAttribute('aria-expanded', 'true');
    });
    await focused('Term 1');

    // The second press is what moves in, onto the first child.
    await userEvent.keyboard('{ArrowRight}');
    await focused('Aliases');

    // Movement is flat where the markup is nested: ArrowDown walks
    // out of the open subtree onto the branch's next sibling, and
    // ArrowUp walks back into it.
    await userEvent.keyboard('{ArrowDown}');
    await focused('Exclusions');
    await userEvent.keyboard('{ArrowDown}');
    await focused('Term 2');
    await userEvent.keyboard('{ArrowUp}');
    await focused('Exclusions');
    await userEvent.keyboard('{ArrowUp}');
    await focused('Aliases');

    // ArrowLeft on a leaf steps out to the parent.
    await userEvent.keyboard('{ArrowLeft}');
    await focused('Term 1');

    // On an open branch it closes it and stays, taking both members
    // back out of the DOM.
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => {
      expect(row('Term 1')).toHaveAttribute('aria-expanded', 'false');
    });
    await focused('Term 1');
    const closed = canvas.queryByRole('treeitem', { name: 'Exclusions' });
    await expect(closed).toBeNull();

    // Only then does the next press move out to the parent.
    await userEvent.keyboard('{ArrowLeft}');
    await focused('Term entries');

    // End and Home reach the ends of the VISIBLE list: `Term 3` is
    // last because `Term 1` is closed again.
    await userEvent.keyboard('{End}');
    await focused('Term 3');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(row('Term 3')).toHaveAttribute('aria-selected', 'true');
    });
    await userEvent.keyboard('{Home}');
    await focused('Term entries');

    // Enter selects the focused row, and the selection is single:
    // the count is what says `Term 3` was retired rather than joined.
    await userEvent.keyboard('{ArrowDown}');
    await focused('Term 1');
    await userEvent.keyboard('{ArrowDown}');
    await focused('Term 2');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(row('Term 2')).toHaveAttribute('aria-selected', 'true');
    });
    const selected = canvas.getAllByRole('treeitem')
      .filter((item) => item.getAttribute('aria-selected') === 'true');
    await expect(selected).toHaveLength(1);
  },
};
