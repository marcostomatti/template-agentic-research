import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { grid, type GridVariants } from './Grid.variants';

export interface GridProps
  extends HTMLAttributes<HTMLDivElement>,
  GridVariants {}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, ...props }, ref) => (
    <div ref={ref} className={cn(grid({ cols, gap }), className)} {...props} />
  ),
);

Grid.displayName = 'Grid';
