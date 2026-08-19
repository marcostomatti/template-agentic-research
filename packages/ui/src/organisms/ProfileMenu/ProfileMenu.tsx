import { useState } from 'react';

import { Avatar } from '../../atoms/Avatar';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSep,
  MenuTrigger,
} from '../../atoms/Menu';
// Deep member import, not the ConfirmPopover barrel (built-storybook lazy-init chunking hazard).
import { ConfirmInline } from '../../molecules/ConfirmPopover/ConfirmPopover';

export interface ProfileMenuUser {
  name: string;
  email: string;
  /** Role label rendered as an info badge ("owner", "member"). */
  role: string;
}

export interface ProfileMenuProps {
  user: ProfileMenuUser;
  onProfile?: () => void;
  onAccountSettings?: () => void;
  onSwitchWorkspace?: () => void;
  /** Fires only after the inline confirm is accepted. */
  onLogout?: () => void;
  /**
   * The logout confirmation copy — must name the action (spec: never a
   * bare "are you sure?").
   */
  logoutMessage?: string;
  /** Render with the menu open (docs/stories). */
  defaultOpen?: boolean;
}

/**
 * ProfileMenu (the original TopbarLive demo; app-shell spec: Top Bar): a
 * touchable Avatar opening a menu headed by the user's identity (avatar,
 * name, email, role badge) over My Profile / Account Settings / Switch
 * workspace / Logout. Logout swaps the item for ConfirmPopover's inline
 * flavour in-place — Cancel returns to the menu, confirm fires
 * `onLogout` and closes.
 *
 * Spec-over-original divergence (recorded): the original demo also lists "Help &
 * docs"; the spec's option list does not, so it is omitted.
 */
export const ProfileMenu = ({
  user,
  onProfile,
  onAccountSettings,
  onSwitchWorkspace,
  onLogout,
  logoutMessage = 'Log out of Acme?',
  defaultOpen = false,
}: ProfileMenuProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [confirming, setConfirming] = useState(false);
  return (
    <Menu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirming(false);
      }}
      modal={false}
    >
      <MenuTrigger
        aria-label={`Account — ${user.name}`}
        className="cursor-pointer rounded-full border-none bg-transparent p-0"
      >
        <Avatar name={user.name} size="md" status="none" />
      </MenuTrigger>
      <MenuContent align="end" className="w-[260px] p-0">
        <div className="flex items-center gap-2.5 border-b border-border-soft p-3.5">
          <Avatar name={user.name} size="lg" status="none" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-fg1">{user.name}</div>
            <div className="truncate font-mono text-xs text-fg3">
              {user.email}
            </div>
            <div className="mt-1">
              <Badge tone="info" size="sm">{user.role}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-px p-1.5">
          <MenuItem
            icon={<Icon name="user" size={15} />}
            onSelect={() => onProfile?.()}
          >
            My profile
          </MenuItem>
          <MenuItem
            icon={<Icon name="settings" size={15} />}
            onSelect={() => onAccountSettings?.()}
          >
            Account settings
          </MenuItem>
          <MenuItem
            icon={<Icon name="arrow-right-left" size={15} />}
            onSelect={() => onSwitchWorkspace?.()}
          >
            Switch workspace
          </MenuItem>
        </div>
        <MenuSep className="my-0" />
        <div className="p-1.5">
          {confirming
            ? (
              <ConfirmInline
                host="menu"
                danger
                message={logoutMessage}
                confirmLabel="Yes, log out"
                onConfirm={() => {
                  setOpen(false);
                  setConfirming(false);
                  onLogout?.();
                }}
                onCancel={() => setConfirming(false)}
              />
            )
            : (
              <MenuItem
                tone="danger"
                icon={<Icon name="log-out" size={15} />}
                onSelect={(e) => {
                  // Swap in the confirmation; the menu stays open.
                  e.preventDefault();
                  setConfirming(true);
                }}
              >
                Log out
              </MenuItem>
            )}
        </div>
      </MenuContent>
    </Menu>
  );
};

ProfileMenu.displayName = 'ProfileMenu';
