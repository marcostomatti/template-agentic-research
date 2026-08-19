import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import { iconTile, type IconTileVariants } from './IconTile.variants';

export interface IconTileProps
  extends HTMLAttributes<HTMLSpanElement>,
  IconTileVariants {
  icon: ReactNode;
  /** Animated success ring (SignupDone). Honors prefers-reduced-motion. */
  pulse?: boolean;
}

export const IconTile = forwardRef<HTMLSpanElement, IconTileProps>(
  ({ className, icon, tone, size, shape, pulse = false, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(iconTile({ tone, size, shape }), className)}
      {...props}
    >
      {icon}
      {pulse && (
        <span
          aria-hidden
          className="absolute -inset-1.5 rounded-full border-2 border-current opacity-35 motion-safe:animate-pulse-ring"
        />
      )}
    </span>
  ),
);

IconTile.displayName = 'IconTile';
