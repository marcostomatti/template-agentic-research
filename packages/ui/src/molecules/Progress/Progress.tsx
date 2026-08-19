import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import {
  progressBar,
  progressTrack,
  type ProgressBarVariants,
} from './Progress.variants';

export interface ProgressProps
  extends HTMLAttributes<HTMLDivElement>,
  ProgressBarVariants {
  /** 0–100. Ignored when indeterminate. */
  value?: number;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, tone, indeterminate = false, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate
        ? undefined
        : Math.round(value)}
      className={cn(progressTrack(), className)}
      {...props}
    >
      <div
        className={progressBar({
          tone: indeterminate
            ? 'leaf'
            : tone,
          indeterminate,
        })}
        // The fill fraction is genuinely dynamic — the one place a style
        // attribute is the right tool.
        style={
          indeterminate
            ? undefined
            : { width: `${Math.max(0, Math.min(100, value))}%` }
        }
      />
    </div>
  ),
);

Progress.displayName = 'Progress';
