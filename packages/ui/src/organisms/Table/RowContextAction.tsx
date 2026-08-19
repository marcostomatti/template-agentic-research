import type { IconName } from '../../atoms/Icon';

import { useState } from 'react';

import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSep,
  MenuTrigger,
} from '../../atoms/Menu';
// Deep member import, not the ConfirmPopover barrel (built-storybook lazy-init chunking hazard).
import { ConfirmInline } from '../../molecules/ConfirmPopover/ConfirmPopover';

/**
 * Context action (spec: "TableRow modifiers →
 * Context action"): an `ellipsis-vertical` icon button opening a row
 * menu from a plain data contract — `{actions: [{icon, title, onClick}],
 * destructive: {icon, title, onClick}}` — with the destructive action
 * pinned under a separator. Choosing it swaps the open menu panel for a
 * semi-generic confirmation naming the action and the entity:
 * "This action will {title} the {entity type} {entity name} — do you
 * want to proceed?".
 *
 * The confirmation is ConfirmPopover's inline flavour with
 * `host="menu"` (03d closed the seam the 03c-private ConfirmPanel held
 * open): its Cancel/Confirm buttons render as `DropdownMenu.Item
 * asChild`, joining this menu's roving tabindex, and Cancel takes focus
 * on entry so the keyboard path never dead-ends.
 */

export interface RowContextActionItem {
  /** Lucide icon, by name (the contract carries icons as data). */
  icon: IconName;
  title: string;
  onClick: () => void;
}

export interface RowContextActionsConfig {
  actions: RowContextActionItem[];
  /** Pinned last, danger-toned, gated behind the confirmation. */
  destructive?: RowContextActionItem;
}

export interface RowContextActionProps extends RowContextActionsConfig {
  /** Entity vocabulary for the confirmation copy (`session`, `task`). */
  entityType: string;
  entityName: string;
  /** Accessible name for the trigger (defaults to `Actions for {name}`). */
  label?: string;
  /** Render with the menu already open (docs/stories). */
  defaultOpen?: boolean;
}

export const RowContextAction = ({
  actions,
  destructive,
  entityType,
  entityName,
  label,
  defaultOpen = false,
}: RowContextActionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  return (
    <Menu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirming(false);
      }}
    >
      <MenuTrigger asChild>
        <IconButton
          icon={<Icon name="ellipsis-vertical" size={16} />}
          label={label ?? `Actions for ${entityName}`}
        />
      </MenuTrigger>
      <MenuContent size="md" align="end">
        {confirming && destructive != null
          ? (
            <ConfirmInline
              host="menu"
              danger
              message={(
                <>
                  This action will
                  {' '}
                  <strong>{destructive.title.toLowerCase()}</strong>
                  {' '}
                  the
                  {' '}
                  {entityType}
                  {' '}
                  <strong className="font-mono text-xs">{entityName}</strong>
                  {' '}
                  — do you want to proceed?
                </>
              )}
              confirmLabel={destructive.title}
              onConfirm={() => {
                destructive.onClick();
                close();
              }}
              onCancel={close}
            />
          )
          : (
            <>
              {actions.map((action) => (
                <MenuItem
                  key={action.title}
                  icon={<Icon name={action.icon} size={15} />}
                  onSelect={action.onClick}
                >
                  {action.title}
                </MenuItem>
              ))}
              {destructive != null && (
                <>
                  <MenuSep />
                  <MenuItem
                    tone="danger"
                    icon={<Icon name={destructive.icon} size={15} />}
                    onSelect={(e) => {
                      // Keep the menu open — swap to the confirmation.
                      e.preventDefault();
                      setConfirming(true);
                    }}
                  >
                    {destructive.title}
                  </MenuItem>
                </>
              )}
            </>
          )}
      </MenuContent>
    </Menu>
  );
};

RowContextAction.displayName = 'RowContextAction';
