import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { cn } from '../../lib';

import {
  menu,
  menuItem,
  type MenuItemVariants,
  type MenuVariants,
} from './Menu.variants';

/**
 * Compound API:
 *
 *   <Menu>
 *     <MenuTrigger asChild><Button>Actions</Button></MenuTrigger>
 *     <MenuContent size="md" align="start">
 *       <MenuLabel>Session</MenuLabel>
 *       <MenuItem icon={<Eye />} onSelect={open}>Open session</MenuItem>
 *       <MenuSep />
 *       <MenuItem tone="danger">Delete agent</MenuItem>
 *     </MenuContent>
 *   </Menu>
 *
 * Radix owns anchoring/flip, outside-click + Escape dismissal, and roving
 * arrow-key focus.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Radix re-export, still a component
export const Menu = DropdownMenu.Root;
// eslint-disable-next-line react-refresh/only-export-components -- Radix re-export, still a component
export const MenuTrigger = DropdownMenu.Trigger;

export interface MenuContentProps
  extends Omit<
    ComponentPropsWithoutRef<typeof DropdownMenu.Content>,
    'align'
  >,
  MenuVariants {}

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  ({ className, align, size, sideOffset = 6, ...props }, ref) => (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        ref={ref}
        align={align === 'end'
          ? 'end'
          : 'start'}
        sideOffset={sideOffset}
        className={cn(menu({ align, size }), className)}
        {...props}
      />
    </DropdownMenu.Portal>
  ),
);

MenuContent.displayName = 'MenuContent';

export interface MenuItemProps
  extends ComponentPropsWithoutRef<typeof DropdownMenu.Item>,
  MenuItemVariants {
  /** Optional leading icon (16px). */
  icon?: ReactNode;
  /** Optional trailing slot (shortcut hint, checkmark, …). */
  trailing?: ReactNode;
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ className, tone, icon, trailing, children, ...props }, ref) => (
    <DropdownMenu.Item
      ref={ref}
      className={cn(menuItem({ tone }), className)}
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </DropdownMenu.Item>
  ),
);

MenuItem.displayName = 'MenuItem';

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Label
    ref={ref}
    className={cn(
      'px-2.5 pb-[3px] pt-[5px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg3',
      className,
    )}
    {...props}
  />
));

MenuLabel.displayName = 'MenuLabel';

export const MenuSep = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Separator
    ref={ref}
    className={cn('mx-0.5 my-1 h-px bg-border-soft', className)}
    {...props}
  />
));

MenuSep.displayName = 'MenuSep';
