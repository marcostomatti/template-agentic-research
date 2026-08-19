import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { gridItem, type GridItemVariants } from './GridItem.variants';

export interface GridItemProps
  extends HTMLAttributes<HTMLDivElement>,
  GridItemVariants {}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, span, align, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(gridItem({ span, align }), className)}
      {...props}
    />
  ),
);

GridItem.displayName = 'GridItem';
