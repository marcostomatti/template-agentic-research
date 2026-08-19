import type { ReactNode } from 'react';

import * as RadixTooltip from '@radix-ui/react-tooltip';

import { cn } from '../../lib';

import { tooltip } from './Tooltip.variants';

export interface TooltipProps {
  /** The tooltip text. */
  label: ReactNode;
  /** The anchor — must accept a ref (Radix Trigger renders asChild). */
  children: ReactNode;
  /** Controlled visibility (for docs/screenshots); omit for hover/focus. */
  open?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export const Tooltip = ({ label, children, open, side = 'top', className }: TooltipProps) => (
  <RadixTooltip.Provider delayDuration={200}>
    <RadixTooltip.Root open={open}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(tooltip(), className)}
        >
          {label}
          <RadixTooltip.Arrow width={10} height={5} className="fill-char-800" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  </RadixTooltip.Provider>
);

Tooltip.displayName = 'Tooltip';
