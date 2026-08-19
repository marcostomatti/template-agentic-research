import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Badge } from '../../atoms/Badge';

import { ProfileMenu } from './ProfileMenu';

/**
 * Touchable-avatar account menu (the original topbar screen "Profile" card;
 * app-shell spec: Top Bar). Header carries the user's identity
 * (avatar, name, email, role badge); the option list is My Profile /
 * Account Settings / Switch workspace / Logout, with logout swapping to
 * ConfirmPopover's inline flavour in-place. Spec-over-original divergence
 * (recorded): the original demo's extra "Help & docs" item is omitted — the
 * spec's option list doesn't include it.
 */
const meta = {
  title: 'Organisms/ProfileMenu',
  component: ProfileMenu,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const USER = {
  name: 'Sam Lin',
  email: 'sam@example.dev',
  role: 'owner',
};

/** Resting trigger — just the touchable avatar. */
export const Default: Story = {
  args: { user: USER },
};

/** Menu open: identity header + the four spec'd options. */
export const MenuOpen: Story = {
  args: {
    user: USER,
    defaultOpen: true,
  },
  render: (args) => (
    <div className="flex min-h-[500px] w-[320px] items-start justify-end pt-2">
      <ProfileMenu {...args} />
    </div>
  ),
};

const LogoutDemo = () => {
  const [loggedOut, setLoggedOut] = useState(false);
  return (
    <div className="flex min-h-[520px] w-[320px] flex-col items-end gap-3 pt-2">
      <ProfileMenu
        user={USER}
        defaultOpen
        onLogout={() => setLoggedOut(true)}
      />
      {loggedOut && <Badge tone="danger">logged out</Badge>}
    </div>
  );
};

/**
 * The logout flow, driven by real keyboard events: Enter on Log out
 * swaps the item for the inline confirm (Cancel takes focus so Enter
 * can't destroy by accident), Cancel returns to the menu, and the
 * re-run through Confirm fires onLogout and closes the menu. The
 * confirm copy names the action — never a bare "are you sure?".
 */
export const LogoutInlineConfirm: Story = {
  args: { user: USER },
  render: () => <LogoutDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    // Keyboard to the logout item and activate it.
    const logout = await body.findByRole('menuitem', { name: 'Log out' });
    logout.focus();
    await userEvent.keyboard('{Enter}');
    // Inline confirm swaps in; Cancel holds focus.
    const cancel = await body.findByRole('menuitem', { name: 'Cancel' });
    await expect(cancel).toHaveFocus();
    await expect(body.getByText('Log out of Acme?')).toBeVisible();
    // Cancel returns to the menu without closing it.
    await userEvent.keyboard('{Enter}');
    await expect(
      await body.findByRole('menuitem', { name: 'Log out' }),
    ).toBeVisible();
    // Second pass: arrow from Cancel to the named confirm and accept.
    const logout2 = body.getByRole('menuitem', { name: 'Log out' });
    logout2.focus();
    await userEvent.keyboard('{Enter}');
    await body.findByRole('menuitem', { name: 'Cancel' });
    await userEvent.keyboard('{ArrowDown}');
    const confirm = body.getByRole('menuitem', { name: 'Yes, log out' });
    await expect(confirm).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('logged out')).toBeVisible();
  },
};
