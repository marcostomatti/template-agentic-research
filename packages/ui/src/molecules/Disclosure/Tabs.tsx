import * as RadixTabs from '@radix-ui/react-tabs';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { disclosureFrame, tabsList, tabsTrigger } from './Disclosure.variants';

/**
 * Tabs — the same disclosure machine in single mode that never lets the
 * set go empty: a strip of triggers and one panel.
 */
export const Tabs = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixTabs.Root>
>(({ className, ...props }, ref) => (
  <RadixTabs.Root ref={ref} className={cn(disclosureFrame(), className)} {...props} />
));

Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List ref={ref} className={cn(tabsList(), className)} {...props} />
));

TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends ComponentPropsWithoutRef<typeof RadixTabs.Trigger> {
  /** Optional leading icon (15px). */
  icon?: ReactNode;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, icon, children, ...props }, ref) => (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        touchable({ inline: true, rounded: 'none', noBrightness: false }),
        tabsTrigger(),
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </RadixTabs.Trigger>
  ),
);

TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn('min-h-24 px-[18px] pb-5 pt-[18px] outline-none', className)}
    {...props}
  />
));

TabsContent.displayName = 'TabsContent';
