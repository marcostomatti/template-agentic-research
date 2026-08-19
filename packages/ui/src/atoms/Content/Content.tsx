import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { content, type ContentVariants } from './Content.variants';

export interface ContentProps
  extends HTMLAttributes<HTMLDivElement>,
  ContentVariants {}

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, direction, gap, align, justify, wrap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        content({ direction, gap, align, justify, wrap }),
        className,
      )}
      {...props}
    />
  ),
);

Content.displayName = 'Content';
