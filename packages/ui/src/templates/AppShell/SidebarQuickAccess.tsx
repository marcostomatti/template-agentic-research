import type { IconName } from '../../atoms/Icon';

import { Icon } from '../../atoms/Icon';
import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { navItem } from './AppShell.variants';
import { NavItem } from './NavItem';

export interface SidebarQuickAccessItem {
  id: string;
  label: string;
  icon: IconName;
  /** External destination — renders an anchor opening a NEW TAB. */
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface SidebarQuickAccessProps {
  /**
   * The spec's static set is Docs (href, new tab) + Settings (onClick) —
   * data-driven so it can become configurable / "recent" later.
   */
  items: SidebarQuickAccessItem[];
  collapsed?: boolean;
  label?: string;
  className?: string;
}

/**
 * The sidebar's bottom quick-access band (app-shell spec: Side
 * Bar): a bordered strip under the week summary. Items with `href` are
 * real links opening in a new tab (Docs → the documentation site);
 * items with `onClick` are in-app NavItems (Settings → settings page).
 */
export const SidebarQuickAccess = ({
  items,
  collapsed = false,
  label = 'Quick access',
  className,
}: SidebarQuickAccessProps) => (
  <nav
    aria-label={label}
    className={cn(
      'flex flex-col gap-0.5 border-t border-border-soft',
      collapsed
        ? 'p-2'
        : 'px-3 pb-3 pt-2',
      className,
    )}
  >
    {items.map((item) => item.href != null
      ? (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          title={collapsed
            ? item.label
            : undefined}
          className={cn(
            touchable({ rounded: 'md', noBrightness: false }),
            navItem({ active: false, collapsed }),
            // tokens.css ships unlayered `a` element rules that beat
            // Tailwind utilities — win with `!` (see AGENTS.md gotcha).
            '!text-fg2 !no-underline',
          )}
        >
          <span className="shrink-0">
            <Icon name={item.icon} size={18} />
          </span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </a>
      )
      : (
        <NavItem
          key={item.id}
          active={item.active ?? false}
          collapsed={collapsed}
          title={collapsed
            ? item.label
            : undefined}
          icon={<Icon name={item.icon} size={18} />}
          onClick={item.onClick}
        >
          {item.label}
        </NavItem>
      ))}
  </nav>
);

SidebarQuickAccess.displayName = 'SidebarQuickAccess';
