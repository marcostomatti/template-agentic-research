import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import {
  entityCardGrid,
  type EntityCardGridVariants,
} from './EntityCard.variants';

export interface EntityCardGridProps
  extends HTMLAttributes<HTMLDivElement>,
  EntityCardGridVariants {}

/**
 * EntityCardGrid — the auto-filling track `EntityCard`s are tiled on.
 *
 * Colocated with the card because it is the other half of the same
 * decision and useful nowhere else: story coverage lives on `EntityCard`
 * and the track's two minimums are variants here, so no call site
 * carries a grid-template class. See `EntityCard.variants.ts` for why
 * `Grid` could not answer this.
 */
export const EntityCardGrid = forwardRef<HTMLDivElement, EntityCardGridProps>(
  ({ className, min, gap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(entityCardGrid({ min, gap }), className)}
      {...props}
    />
  ),
);

EntityCardGrid.displayName = 'EntityCardGrid';
