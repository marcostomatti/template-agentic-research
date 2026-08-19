import { forwardRef, type HTMLAttributes } from 'react';

import { Icon } from '../../atoms/Icon';
import { cn } from '../../lib';

import { branchInline } from './KnownEntities.variants';

export interface BranchInlineProps extends HTMLAttributes<HTMLSpanElement> {
  /** Branch name. */
  name: string;
}

/**
 * `branch-inline` — the `git-branch` Lucide glyph + branch name (spec:
 * "Known Entities").
 */
export const BranchInline = forwardRef<HTMLSpanElement, BranchInlineProps>(
  ({ className, name, ...props }, ref) => (
    <span ref={ref} className={cn(branchInline(), className)} {...props}>
      <Icon name="git-branch" size={10} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  ),
);

BranchInline.displayName = 'BranchInline';
