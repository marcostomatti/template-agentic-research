import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { shell, type ShellVariants } from './Shell.variants';

export interface ShellProps
  extends HTMLAttributes<HTMLDivElement>,
  ShellVariants {}

export const Shell = forwardRef<HTMLDivElement, ShellProps>(
  ({ className, padding, tone, bordered, rounded, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(shell({ padding, tone, bordered, rounded }), className)}
      {...props}
    />
  ),
);

Shell.displayName = 'Shell';
