import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button } from '../../atoms/Button';
import { cn } from '../../lib';

import {
  confirmPanel,
  confirmPanelActions,
  confirmPanelMessage,
  confirmPopoverContent,
} from './ConfirmPopover.variants';

/**
 * The reusable confirmation pattern (the original TopbarLive demo; spec:
 * the app-shell spec "Confirmation popover"). Two flavours:
 *
 * - `ConfirmPopover` — standalone: anchors the panel to any trigger.
 * - `ConfirmInline` — inline: renders the panel in-place, e.g. swapped in
 *   for a menu item (ProfileMenu logout, RowContextAction destructive).
 *
 * The message must always NAME the action ("Delete the agent
 * the-changelog-bot?"), never a bare "are you sure?" — and `confirmLabel`
 * names it again ("Yes, delete"), never generic OK.
 */

export interface ConfirmInlineProps {
  /** Names the action and its object — never a bare "are you sure?". */
  message: ReactNode;
  /** Names the action ("Yes, delete", "Archive") — never plain OK. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Danger-variant confirm button for destructive actions. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Where the panel is hosted. `menu` renders the Cancel/Confirm buttons
   * as `DropdownMenu.Item asChild` so they join the host menu's roving
   * tabindex (a Radix menu's arrow-key focus only reaches registered
   * items — plain buttons would be unreachable by keyboard), focuses
   * Cancel on entry so the keyboard path never dead-ends, and
   * `preventDefault()`s each select so the OWNER of the menu's open state
   * decides whether it closes. Default `plain` renders ordinary buttons
   * (the standalone popover, or any non-menu surface).
   */
  host?: 'plain' | 'menu';
  className?: string;
}

export const ConfirmInline = ({
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  host = 'plain',
  className,
}: ConfirmInlineProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inMenu = host === 'menu';
  useEffect(() => {
    if (inMenu) cancelRef.current?.focus();
  }, [inMenu]);

  const cancelButton = (
    <Button ref={cancelRef} variant="ghost" size="sm" onClick={inMenu
      ? undefined
      : onCancel}
    >
      {cancelLabel}
    </Button>
  );
  const confirmButton = (
    <Button
      variant={danger
        ? 'danger'
        : 'primary'}
      size="sm"
      onClick={inMenu
        ? undefined
        : onConfirm}
    >
      {confirmLabel}
    </Button>
  );

  return (
    <div className={cn(confirmPanel(), className)}>
      <p className={confirmPanelMessage()}>{message}</p>
      <div className={confirmPanelActions()}>
        {inMenu
          ? (
            <>
              <DropdownMenu.Item
                asChild
                onSelect={(e) => {
                  e.preventDefault();
                  onCancel();
                }}
              >
                {cancelButton}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                asChild
                onSelect={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
              >
                {confirmButton}
              </DropdownMenu.Item>
            </>
          )
          : (
            <>
              {cancelButton}
              {confirmButton}
            </>
          )}
      </div>
    </div>
  );
};

ConfirmInline.displayName = 'ConfirmInline';

export interface ConfirmPopoverProps
  extends Omit<ConfirmInlineProps, 'onCancel' | 'host' | 'className'> {
  /** Notified when the panel is dismissed without confirming. */
  onCancel?: () => void;
  /** The trigger — rendered `asChild`, so pass a single focusable child. */
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Render with the panel already open (docs/stories). */
  defaultOpen?: boolean;
}

/**
 * Standalone flavour: wraps any trigger and anchors the confirmation
 * panel to it. Radix Popover owns anchoring/flip, outside-click + Escape
 * dismissal, and focus return; focus lands on Cancel first (it is the
 * panel's first focusable), so Enter never destroys by accident.
 */
export const ConfirmPopover = ({
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
  children,
  align = 'start',
  side = 'bottom',
  defaultOpen = false,
}: ConfirmPopoverProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onCancel?.();
      }}
    >
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={6}
          className={confirmPopoverContent()}
        >
          <ConfirmInline
            message={message}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            danger={danger}
            onConfirm={() => {
              onConfirm();
              setOpen(false);
            }}
            onCancel={() => {
              setOpen(false);
              onCancel?.();
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ConfirmPopover.displayName = 'ConfirmPopover';
