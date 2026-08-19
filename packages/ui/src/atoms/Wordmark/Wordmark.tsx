import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { wordmark } from './Wordmark.variants';

export interface WordmarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** Type size in px (20 in the header, 22 in the footer). */
  size?: number;
}

/**
 * The "open tomato" type lockup, theme-aware. Pair with `<TomatoMark>` for
 * the full brand lockup (see the portal Header/Footer).
 */
export const Wordmark = forwardRef<HTMLSpanElement, WordmarkProps>(
  ({ className, size = 22, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(wordmark(), className)}
      style={{ fontSize: size, ...style }}
      {...props}
    >
      <span className="text-wordmark-open">open</span>
      <span className="text-wordmark-tomato">tomato</span>
    </span>
  ),
);

Wordmark.displayName = 'Wordmark';
