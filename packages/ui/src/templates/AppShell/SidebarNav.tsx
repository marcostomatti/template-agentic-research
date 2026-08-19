import type { IconName } from '../../atoms/Icon';

import { Icon } from '../../atoms/Icon';
import { cn } from '../../lib';

import { NavItem } from './NavItem';

/**
 * One nav entry as DATA (app-shell spec: Side Bar — "dynamically
 * generated from json/api/yaml"): icons travel as Lucide names, so a nav
 * config can come straight off the wire (and later carry feature flags).
 */
export interface SidebarNavConfigItem {
  id: string;
  label: string;
  icon: IconName;
}

export interface SidebarNavProps {
  items: SidebarNavConfigItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  /** Threaded down from the shell — never this component's own state. */
  collapsed?: boolean;
  /** Accessible name for the nav landmark. */
  label?: string;
  className?: string;
}

/**
 * The sidebar's data-driven navigation: a column of NavItems rendered
 * from a config array. The current spec'd set is Overview
 * (layout-dashboard), Sessions (terminal), Agents (bot), Roadmap (list),
 * Tools (cpu) — but the component takes whatever the config says.
 */
export const SidebarNav = ({
  items,
  activeId,
  onNavigate,
  collapsed = false,
  label = 'Main navigation',
  className,
}: SidebarNavProps) => (
  <nav
    aria-label={label}
    className={cn(
      'flex flex-col gap-0.5 pt-1',
      collapsed
        ? 'px-2'
        : 'px-3',
      className,
    )}
  >
    {items.map((item) => (
      <NavItem
        key={item.id}
        active={item.id === activeId}
        collapsed={collapsed}
        title={collapsed
          ? item.label
          : undefined}
        icon={<Icon name={item.icon} size={18} />}
        onClick={() => onNavigate?.(item.id)}
      >
        {item.label}
      </NavItem>
    ))}
  </nav>
);

SidebarNav.displayName = 'SidebarNav';
