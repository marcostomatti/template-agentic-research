import type { Meta, StoryObj } from '@storybook/react-vite';

import { LiveShell } from '../../stories/shell-fixtures';

import { AppShell } from './AppShell';

/**
 * The template's own variants: expanded and collapsed rail. The sidebar's
 * sections are NOT variants of the shell — each is a page (see Pages/*);
 * the shell remains while the content slot swaps.
 *
 * Since WS03d the harness chrome is the real components: the collapse
 * button lives on AppShellTopbar itself (app-shell spec), the nav
 * is the data-driven SidebarNav, the rail carries SidebarWeekSummary +
 * SidebarQuickAccess, and the topbar composes WorkspaceSwitcher /
 * SearchSuggest / NotificationsBell / ThemeSwitcher / ProfileMenu.
 */
const meta = {
  title: 'Templates/AppShell',
  component: AppShell,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Expanded rail (264px) — the original demo's default, overview content. */
export const Default: Story = {
  render: () => <LiveShell />,
};

/** Collapsed rail — 64px, icons only, budget card hidden. */
export const Collapsed: Story = {
  render: () => <LiveShell collapsed />,
};

/**
 * The optional AppShellContent footer slot (app-shell spec: Main
 * Content) — copyright + general links at the end of the scroll flow.
 */
export const WithContentFooter: Story = {
  render: () => <LiveShell page="settings" withFooter />,
};
