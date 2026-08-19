import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { badge, type BadgeVariants } from './Badge.variants';

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
  BadgeVariants {
  /** Leading 6px dot in the tone's color. */
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, dot = false, children, ...props }, ref) => (
    <span ref={ref} className={cn(badge({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
