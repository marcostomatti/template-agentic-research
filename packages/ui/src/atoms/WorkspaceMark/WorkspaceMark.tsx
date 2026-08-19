import { forwardRef, type HTMLAttributes } from 'react';

import { cn, initials } from '../../lib';

import { workspaceMark, type WorkspaceMarkVariants } from './WorkspaceMark.variants';

export interface WorkspaceMarkProps
  extends HTMLAttributes<HTMLSpanElement>,
  WorkspaceMarkVariants {
  /** Workspace name; initials are derived from it. */
  name: string;
}

export const WorkspaceMark = forwardRef<HTMLSpanElement, WorkspaceMarkProps>(
  ({ className, name, tone, size, ...props }, ref) => (
    <span
      ref={ref}
      role="img"
      aria-label={name}
      className={cn(workspaceMark({ tone, size }), className)}
      {...props}
    >
      {initials(name)}
    </span>
  ),
);

WorkspaceMark.displayName = 'WorkspaceMark';
