import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';
import { TomatoMark } from '../TomatoMark';

import { emptyState, type EmptyStateVariants } from './EmptyState.variants';

export interface EmptyStateProps
  extends HTMLAttributes<HTMLDivElement>,
  EmptyStateVariants {
  title: string;
  description?: string;
  /** Optional call-to-action slot (typically a `<Button>`). */
  action?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, size, align, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(emptyState({ size, align }), className)}
      {...props}
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface-1))]">
        <TomatoMark />
      </span>
      <span className="font-display text-[17px] font-bold text-fg1">
        {title}
      </span>
      {description != null && (
        <span className="max-w-[240px] text-[13px] leading-normal text-fg2">
          {description}
        </span>
      )}
      {action != null && <span className="mt-1">{action}</span>}
    </div>
  ),
);

EmptyState.displayName = 'EmptyState';
