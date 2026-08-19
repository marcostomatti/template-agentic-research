import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import {
  NotificationsBell,
  type NotificationItem,
} from './NotificationsBell';

/**
 * Ghost bell + notifications popover (the original topbar screen "Notifications"
 * card; app-shell spec: Top Bar). Red dot when ≥1 unread — never a
 * numeric badge. Spec-over-original divergence (recorded): the popover groups
 * by level (ok / warn / err / info) where the original demo rendered a flat
 * list; mark-all-read sits in the popover header either way.
 */
const meta = {
  title: 'Organisms/NotificationsBell',
  component: NotificationsBell,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationsBell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Original design NOTIFICATIONS seed. */
const NOTIFICATIONS: NotificationItem[] = [
  { id: 1, unread: true, level: 'ok', title: 'auth-refactor finished', body: '8 files updated · 12.3k tokens', time: '2m ago' },
  { id: 2, unread: true, level: 'warn', title: 'perf-investigate is waiting', body: 'Token budget paused at 0/200k. Approve to continue.', time: '14m ago' },
  { id: 3, unread: true, level: 'err', title: 'rate-limit-bug failed', body: 'Rate-limited by upstream provider after 6m 47s.', time: '1h ago' },
  { id: 4, unread: false, level: 'info', icon: 'user-plus', title: 'ren joined open-garden', body: 'Sam invited them as a Member.', time: 'yesterday' },
  { id: 5, unread: false, level: 'info', icon: 'git-branch', title: 'docs-typos opened PR #214', body: '23 typos & broken links across docs/.', time: 'yesterday' },
];

/** Resting bell with the unread dot (3 unread in the seed). */
export const Default: Story = {
  args: { notifications: NOTIFICATIONS },
};

/** No unread → no dot. */
export const AllRead: Story = {
  args: {
    notifications: NOTIFICATIONS.map((n) => ({ ...n, unread: false })),
  },
};

const InteractiveDemo = () => {
  const [items, setItems] = useState(NOTIFICATIONS);
  return (
    <div className="flex min-h-[560px] w-[460px] justify-end pt-2">
      <NotificationsBell
        notifications={items}
        defaultOpen
        onMarkAllRead={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
      />
    </div>
  );
};

/**
 * Popover open: level groups in ok → warn → err → info order, unread
 * rows carrying the faint accent wash + trailing dot, header counts and
 * a live Mark all read (parent-owned state — try it), accent See-all
 * footer.
 */
export const PopoverOpen: Story = {
  args: { notifications: NOTIFICATIONS },
  render: () => <InteractiveDemo />,
};
