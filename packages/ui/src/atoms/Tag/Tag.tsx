import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import { tag, type TagVariants } from './Tag.variants';

export interface TagProps extends HTMLAttributes<HTMLSpanElement>, TagVariants {
  /** Optional leading icon (13px). */
  icon?: ReactNode;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, tone, mono, icon, children, ...props }, ref) => (
    <span
      ref={ref}
      // The body face is used whenever an icon is present;
      // an explicit `mono` prop still wins.
      className={cn(tag({ tone, mono: mono ?? icon == null }), className)}
      {...props}
    >
      {icon}
      {children}
    </span>
  ),
);

Tag.displayName = 'Tag';
