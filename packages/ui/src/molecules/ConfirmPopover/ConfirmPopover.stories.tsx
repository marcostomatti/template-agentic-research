import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSep,
  MenuTrigger,
} from '../../atoms/Menu';

import { ConfirmInline, ConfirmPopover } from './ConfirmPopover';

/**
 * The reusable confirmation (the original topbar screen "Confirmation popover"
 * card; app-shell spec). Two flavours: standalone (anchored to any
 * trigger) and inline (in-place, e.g. replacing a menu item). The message
 * always names the action and its object — never a bare "are you sure?" —
 * and the confirm button names it again ("Yes, delete", never OK).
 */
const meta = {
  title: 'Molecules/ConfirmPopover',
  component: ConfirmPopover,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

/**
 * Standalone flavour, destructive: the original card's "Delete agent…" example.
 * Open by default for the docs; focus lands on Cancel (the panel's first
 * focusable), so Enter never destroys by accident.
 */
export const StandaloneDanger: Story = {
  args: {
    message: '',
    confirmLabel: 'Yes, delete',
    onConfirm: noop,
    children: null,
  },
  render: () => (
    <div className="flex min-h-[240px] items-start justify-center pt-2">
      <ConfirmPopover
        message={(
          <>
            Delete the agent <b>the-changelog-bot</b>? This removes 9
            historical sessions too.
          </>
        )}
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
        danger
        onConfirm={noop}
        defaultOpen
      >
        <Button variant="danger" iconLeading={<Icon name="trash-2" size={15} />}>
          Delete agent…
        </Button>
      </ConfirmPopover>
    </div>
  ),
};

/**
 * Standalone flavour, consequential-but-not-destructive: the confirm
 * button stays primary; the panel chrome is the same (the original design
 * tints the box identically for both).
 */
export const StandaloneNeutral: Story = {
  args: {
    message: '',
    confirmLabel: 'Archive',
    onConfirm: noop,
    children: null,
  },
  render: () => (
    <div className="flex min-h-[240px] items-start justify-center pt-2">
      <ConfirmPopover
        message="Archive this workspace? Members keep access but no new sessions can be started."
        confirmLabel="Archive"
        onConfirm={noop}
        defaultOpen
      >
        <Button variant="secondary" iconLeading={<Icon name="package" size={15} />}>
          Archive workspace…
        </Button>
      </ConfirmPopover>
    </div>
  ),
};

/** Inline flavour on its own — the panel as it renders in-place. */
export const InlinePanel: Story = {
  args: {
    message: '',
    confirmLabel: 'Yes, log out',
    onConfirm: noop,
    children: null,
  },
  render: () => (
    <div className="w-[260px]">
      <ConfirmInline
        message="Log out of Acme?"
        confirmLabel="Yes, log out"
        danger
        onConfirm={noop}
        onCancel={noop}
      />
    </div>
  ),
};

const InMenuDemo = () => {
  const [open, setOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  return (
    <div className="flex min-h-[260px] flex-col items-center gap-3 pt-2">
      <Menu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirming(false);
        }}
      >
        <MenuTrigger asChild>
          <Button variant="secondary">Session actions</Button>
        </MenuTrigger>
        <MenuContent size="md">
          {confirming
            ? (
              <ConfirmInline
                host="menu"
                message={(
                  <>
                    This action will <strong>archive</strong> the session
                    {' '}
                    <strong className="font-mono text-xs">auth-refactor</strong>
                    {' '}
                    — do you want to proceed?
                  </>
                )}
                confirmLabel="Archive"
                danger
                onConfirm={() => {
                  setConfirmed((c) => c + 1);
                  setOpen(false);
                  setConfirming(false);
                }}
                onCancel={() => setConfirming(false)}
              />
            )
            : (
              <>
                <MenuItem icon={<Icon name="eye" size={15} />}>Open</MenuItem>
                <MenuSep />
                <MenuItem
                  tone="danger"
                  icon={<Icon name="archive" size={15} />}
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirming(true);
                  }}
                >
                  Archive
                </MenuItem>
              </>
            )}
        </MenuContent>
      </Menu>
      {confirmed > 0 && <Badge tone="info">confirmed · {confirmed}</Badge>}
    </div>
  );
};

/**
 * Inline flavour hosted in a Radix menu — the RowContextAction /
 * ProfileMenu shape. The Cancel/Confirm buttons are `DropdownMenu.Item
 * asChild`, so they join the menu's roving tabindex; the play() drives
 * the whole path with real keyboard events: arrow to the destructive
 * item, Enter to swap in the confirmation, arrow between Cancel and
 * Confirm, Enter on Confirm.
 */
export const InlineInMenuKeyboard: Story = {
  args: {
    message: '',
    confirmLabel: 'Archive',
    onConfirm: noop,
    children: null,
  },
  render: () => <InMenuDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    // The menu opens rendered; arrow down to the destructive item.
    const archiveItem = await body.findByRole('menuitem', { name: 'Archive' });
    archiveItem.focus();
    await userEvent.keyboard('{Enter}');
    // The confirmation swaps in; Cancel takes focus.
    const cancel = await body.findByRole('menuitem', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());
    // Arrow keys rove between the confirm panel's items.
    await userEvent.keyboard('{ArrowDown}');
    const confirm = body.getByRole('menuitem', { name: 'Archive' });
    await waitFor(() => expect(confirm).toHaveFocus());
    // Enter activates the focused Confirm item.
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('confirmed · 1')).toBeVisible();
  },
};
