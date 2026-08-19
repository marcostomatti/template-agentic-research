import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorkspaceSwitcher, type WorkspaceOption } from './WorkspaceSwitcher';

/**
 * Topbar workspace pill + recent-workspaces menu (the original topbar screen
 * "Workspace switcher" card; app-shell spec: Top Bar). Lists the 5
 * most recent workspaces with a check on the active one and links to
 * settings → workspaces for the full list — no in-place search. Hidden
 * for single-workspace users. Scope-free: no topbar dependency.
 */
const meta = {
  title: 'Organisms/WorkspaceSwitcher',
  component: WorkspaceSwitcher,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkspaceSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Original design seed data — most recent first (only the first 5 are listed). */
const WORKSPACES: WorkspaceOption[] = [
  { id: 'og', name: 'open-garden', members: 12, tone: 'accent' },
  { id: 'tm', name: 'tomato-mainline', members: 6, tone: 'primary' },
  { id: 'sd', name: 'seed-bank', members: 3, tone: 'gold' },
  { id: 'ct', name: 'compost-bin', members: 2, tone: 'accent' },
  { id: 'hh', name: 'heirloom-hothouse', members: 8, tone: 'primary' },
  { id: 'ex', name: 'extra-overflow-patch', members: 4, tone: 'gold' },
];

/** The closed trigger pill — the original card's resting state. */
export const Default: Story = {
  args: {
    workspaces: WORKSPACES,
    activeId: 'og',
  },
};

/**
 * Menu open: "Recent workspaces" caps at 5 (the 6th workspace only shows
 * through the "6 total" hint on See all), check mark on the active row,
 * settings link + accent New workspace beneath the separator.
 */
export const MenuOpen: Story = {
  args: {
    workspaces: WORKSPACES,
    activeId: 'og',
    defaultOpen: true,
  },
  render: (args) => (
    <div className="flex min-h-[380px] items-start justify-center pt-2">
      <WorkspaceSwitcher {...args} />
    </div>
  ),
};

/**
 * Spec: users with a single workspace (the default) never see the
 * switcher — it renders nothing.
 */
export const SingleWorkspaceHidden: Story = {
  args: {
    workspaces: WORKSPACES.slice(0, 1),
    activeId: 'og',
  },
  render: (args) => (
    <div className="flex h-10 w-56 items-center justify-center rounded-md border border-dashed border-border-soft text-xs text-fg3">
      <WorkspaceSwitcher {...args} />
      renders null with 1 workspace
    </div>
  ),
};

/** Long names truncate inside the pill's max width (240px). */
export const TruncatedName: Story = {
  args: {
    workspaces: [
      { id: 'a', name: 'a-very-long-workspace-name-that-truncates', members: 9, tone: 'primary' },
      ...WORKSPACES.slice(0, 2),
    ],
    activeId: 'a',
  },
};
