import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { navItem, type NavItemVariants } from './AppShell.variants';

export interface NavItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
  NavItemVariants {
  /** Leading icon (18px in the original demo). */
  icon?: ReactNode;
}

/**
 * A rail entry. Collapse isn't ITS state — the shell owns it and passes it
 * down; the item just reads the flag: hide the label, center the icon,
 * surface a title tooltip (caller passes `title` when collapsed).
 */
export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(
  ({ className, active, collapsed, icon, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={active
        ? 'page'
        : undefined}
      className={cn(
        touchable({ rounded: 'md', noBrightness: false }),
        navItem({ active, collapsed }),
        className,
      )}
      {...props}
    >
      {icon != null && <span className="shrink-0">{icon}</span>}
      {!collapsed && <span className="truncate">{children}</span>}
    </button>
  ),
);

NavItem.displayName = 'NavItem';
