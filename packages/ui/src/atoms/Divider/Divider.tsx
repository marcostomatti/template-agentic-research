import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import { divider, dividerLabel, dividerRule } from './Divider.variants';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Mono label rendered mid-rule; omit for a plain rule. */
  label?: ReactNode;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ className, label, ...props }, ref) => label == null
    ? (
      <div
        ref={ref}
        role="separator"
        className={cn('h-px w-full bg-border-soft', className)}
        {...props}
      />
    )
    : (
      <div ref={ref} role="separator" className={cn(divider(), className)} {...props}>
        <span className={dividerRule()} />
        <span className={dividerLabel()}>{label}</span>
        <span className={dividerRule()} />
      </div>
    ),
);

Divider.displayName = 'Divider';
