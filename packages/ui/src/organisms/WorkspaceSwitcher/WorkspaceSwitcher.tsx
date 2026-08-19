import type { WorkspaceMarkProps } from '../../atoms/WorkspaceMark';

import { Icon } from '../../atoms/Icon';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSep,
  MenuTrigger,
} from '../../atoms/Menu';
import { WorkspaceMark } from '../../atoms/WorkspaceMark';
import { cn } from '../../lib';

import {
  workspaceRow,
  workspaceSwitcherTrigger,
} from './WorkspaceSwitcher.variants';

const RECENT_LIMIT = 5;

export interface WorkspaceOption {
  id: string;
  name: string;
  /** Member count, shown mono under the name in the menu rows. */
  members?: number;
  /** WorkspaceMark fill for this workspace's identity block. */
  tone?: WorkspaceMarkProps['tone'];
}

export interface WorkspaceSwitcherProps {
  /** Ordered most-recent-first; only the first 5 are listed inline. */
  workspaces: WorkspaceOption[];
  activeId: string;
  onSwitch?: (id: string) => void;
  /** "See all workspaces" — links to settings → workspaces. */
  onSeeAll?: () => void;
  onNew?: () => void;
  /** Render with the menu open (docs/stories). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * WorkspaceSwitcher (the original TopbarLive demo; app-shell spec): the
 * active workspace as a max-width pill; the menu lists the 5 most recent
 * workspaces (check mark on the active one) and links out to settings →
 * workspaces instead of offering in-place search. Hidden entirely for
 * single-workspace users (the spec's default), and scope-free — no topbar
 * dependency, so it can move to the sidebar later.
 */
export const WorkspaceSwitcher = ({
  workspaces,
  activeId,
  onSwitch,
  onSeeAll,
  onNew,
  defaultOpen = false,
  className,
}: WorkspaceSwitcherProps) => {
  // Spec: users with one workspace never see the switcher.
  const [first] = workspaces;
  if (workspaces.length < 2 || first == null) return null;
  const active = workspaces.find((w) => w.id === activeId) ?? first;
  const recent = workspaces.slice(0, RECENT_LIMIT);
  return (
    <Menu defaultOpen={defaultOpen} modal={false}>
      <MenuTrigger className={cn(workspaceSwitcherTrigger(), className)}>
        <WorkspaceMark name={active.name} tone={active.tone} size="sm" />
        <span className="min-w-0 truncate font-semibold">{active.name}</span>
        <Icon name="chevron-down" size={14} className="shrink-0 text-fg3" />
      </MenuTrigger>
      <MenuContent className="w-[300px]">
        <MenuLabel>Recent workspaces</MenuLabel>
        {recent.map((w) => (
          <MenuItem
            key={w.id}
            className={workspaceRow({ active: w.id === activeId })}
            onSelect={() => onSwitch?.(w.id)}
            trailing={
              w.id === activeId
                ? <Icon name="check" size={14} className="shrink-0 text-accent" />
                : undefined
            }
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <WorkspaceMark name={w.name} tone={w.tone} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">
                  {w.name}
                </span>
                {w.members != null && (
                  <span className="block font-mono text-[11px] font-normal text-fg3">
                    {w.members} members
                  </span>
                )}
              </span>
            </span>
          </MenuItem>
        ))}
        <MenuSep />
        <MenuItem
          icon={<Icon name="layers" size={15} />}
          trailing={(
            <span className="font-mono text-[11px] text-fg3">
              {workspaces.length} total
            </span>
          )}
          onSelect={() => onSeeAll?.()}
        >
          See all workspaces
        </MenuItem>
        <MenuItem
          tone="accent"
          icon={<Icon name="plus" size={15} />}
          onSelect={() => onNew?.()}
        >
          New workspace
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

WorkspaceSwitcher.displayName = 'WorkspaceSwitcher';
