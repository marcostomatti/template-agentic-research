import type { IconName } from '../../atoms/Icon';
import type { ReactNode } from 'react';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from '../../atoms/Menu';

import {
  notificationDot,
  notificationPuck,
  notificationRow,
} from './NotificationsBell.variants';

export type NotificationLevel = 'ok' | 'warn' | 'err' | 'info';

export interface NotificationItem {
  id: string | number;
  level: NotificationLevel;
  title: string;
  body?: ReactNode;
  /** Relative time chip ("2m ago"). */
  time?: string;
  unread?: boolean;
  /** Overrides the level's default glyph. */
  icon?: IconName;
}

export interface NotificationsBellProps {
  /** Parent-owned; mark-all-read mutates via `onMarkAllRead`. */
  notifications: NotificationItem[];
  onMarkAllRead?: () => void;
  onOpenItem?: (item: NotificationItem) => void;
  onSeeAll?: () => void;
  /** Render with the popover open (docs/stories). */
  defaultOpen?: boolean;
  label?: string;
}

/** Level → default Lucide glyph (original seed icons). */
const LEVEL_ICON: Record<NotificationLevel, IconName> = {
  ok: 'check',
  warn: 'triangle-alert',
  err: 'x',
  info: 'info',
};

/** Spec grouping order: ok / warn / err / info. */
const LEVEL_ORDER: NotificationLevel[] = ['ok', 'warn', 'err', 'info'];

/**
 * NotificationsBell (the original TopbarLive demo; app-shell spec: Top
 * Bar): a ghost bell IconButton carrying a single red dot when ≥1 unread
 * (never a numeric badge — numbers crowd the bar), opening a popover
 * grouped by level with a mark-all-read action in its header. State is
 * parent-owned: the component renders `notifications` and reports
 * intents through callbacks.
 */
export const NotificationsBell = ({
  notifications,
  onMarkAllRead,
  onOpenItem,
  onSeeAll,
  defaultOpen = false,
  label = 'Notifications',
}: NotificationsBellProps) => {
  const unread = notifications.filter((n) => n.unread).length;
  const groups = LEVEL_ORDER
    .map((level) => ({
      level,
      items: notifications.filter((n) => n.level === level),
    }))
    .filter((g) => g.items.length > 0);
  return (
    <Menu defaultOpen={defaultOpen} modal={false}>
      <MenuTrigger asChild>
        <IconButton
          className="relative"
          label={unread > 0
            ? `${label} — ${unread} unread`
            : label}
          icon={(
            <>
              <Icon name="bell" size={18} />
              {unread > 0 && <span className={notificationDot()} aria-hidden />}
            </>
          )}
        />
      </MenuTrigger>
      <MenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <div>
            <div className="font-display text-[15px] font-bold text-fg1">
              Notifications
            </div>
            <div className="font-mono text-[11px] text-fg3">
              {unread} unread · {notifications.length} total
            </div>
          </div>
          <DropdownMenu.Item
            asChild
            disabled={unread === 0}
            onSelect={(e) => {
              // Keep the popover open — marking read is not a dismissal.
              e.preventDefault();
              onMarkAllRead?.();
            }}
          >
            <button
              type="button"
              className="cursor-pointer rounded-sm border-none bg-transparent text-xs font-semibold text-accent outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-fg3 data-[highlighted]:underline"
            >
              Mark all read
            </button>
          </DropdownMenu.Item>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {groups.map((g) => (
            <div key={g.level}>
              <MenuLabel>{g.level}</MenuLabel>
              {g.items.map((n) => (
                <MenuItem
                  key={n.id}
                  className={notificationRow({ unread: n.unread ?? false })}
                  onSelect={() => onOpenItem?.(n)}
                >
                  <span className="flex w-full items-start gap-2.5">
                    <span className={notificationPuck({ level: n.level })}>
                      <Icon name={n.icon ?? LEVEL_ICON[n.level]} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-fg1">
                          {n.title}
                        </span>
                        {n.time != null && (
                          <span className="shrink-0 font-mono text-[10px] font-normal text-fg3">
                            {n.time}
                          </span>
                        )}
                      </span>
                      {n.body != null && (
                        <span className="mt-0.5 block whitespace-normal text-xs font-normal leading-[1.45] text-fg3">
                          {n.body}
                        </span>
                      )}
                    </span>
                    {n.unread && (
                      <span
                        className="mt-2 size-2 shrink-0 rounded-full bg-accent"
                        aria-hidden
                      />
                    )}
                  </span>
                </MenuItem>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-border-soft p-1.5">
          <MenuItem
            tone="accent"
            icon={<Icon name="inbox" size={15} />}
            onSelect={() => onSeeAll?.()}
          >
            See all notifications
          </MenuItem>
        </div>
      </MenuContent>
    </Menu>
  );
};

NotificationsBell.displayName = 'NotificationsBell';
