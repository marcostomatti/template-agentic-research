import { forwardRef, type HTMLAttributes } from 'react';

import { cn, formatPercentage } from '../../lib';
import { Icon } from '../Icon';

import { trendIndicator } from './TrendIndicator.variants';

export interface TrendIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /** Ratio: 0.1 = +10%, -0.3 = -30%, 0 = flat. */
  trend: number;
  /** Render the signed percentage next to the glyph (`+10%` / `-30%`). */
  showValue?: boolean;
  /**
   * Render the flat state (gray dash) when trend is 0. The spec left
   * show-vs-hide open; the default is to SHOW the dash — a visible "no
   * trend" reads clearer in stat rows than a hole. Pass false to hide.
   */
  showZero?: boolean;
  /** Max fraction digits of the value (default 0). */
  precision?: number;
  locale?: string;
  /**
   * Accessible label (consistent with Icon/StatusIndicator). When absent,
   * one is synthesized from the direction and the formatted percentage —
   * even in arrow-only mode — so screen readers never get silence.
   */
  label?: string;
}

/**
 * TrendIndicator — arrow up (success) / arrow down (danger) / dash (gray)
 * from a ratio `trend` prop, optionally with the signed percentage value.
 * Spec-driven; no design artboard.
 */
export const TrendIndicator = forwardRef<HTMLSpanElement, TrendIndicatorProps>(
  (
    {
      className,
      trend,
      showValue = false,
      showZero = true,
      precision,
      locale,
      label,
      ...props
    },
    ref,
  ) => {
    if (trend === 0 && !showZero) return null;
    const direction = trend > 0
      ? 'up'
      : trend < 0
        ? 'down'
        : 'flat';
    const glyph = trend > 0
      ? 'arrow-up'
      : trend < 0
        ? 'arrow-down'
        : 'minus';
    const value = formatPercentage(trend, {
      mode: 'ratio',
      signed: true,
      precision,
      locale,
    });
    const ariaLabel = label ?? (direction === 'flat'
      ? 'no change'
      : `trending ${direction} ${value}`);
    return (
      <span
        ref={ref}
        role="img"
        aria-label={ariaLabel}
        className={cn(trendIndicator({ direction }), className)}
        {...props}
      >
        <Icon name={glyph} size={11} strokeWidth={2} />
        {showValue && trend !== 0 && <span aria-hidden>{value}</span>}
      </span>
    );
  },
);

TrendIndicator.displayName = 'TrendIndicator';
