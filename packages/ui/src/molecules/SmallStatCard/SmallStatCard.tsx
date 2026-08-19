import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { TrendIndicator } from '../../atoms';
import { cn, formatNumber } from '../../lib';

import {
  smallStatCard,
  smallStatCardFooter,
  smallStatCardNumber,
  smallStatCardSuffix,
  smallStatCardTitle,
  smallStatCardValue,
  type SmallStatCardVariants,
} from './SmallStatCard.variants';

export interface SmallStatCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
  SmallStatCardVariants {
  /** Top-line title, left (mono, uppercase). */
  title: string;
  /**
   * Top-line right slot, trend flavour: ratio for a TrendIndicator with
   * value (`0.12` → `+12%`). Wins over `decoration` when both are given.
   */
  trend?: number;
  /** Top-line right slot, decoration flavour: icon / avatar / label. */
  decoration?: ReactNode;
  /**
   * The stat. Numbers are formatted human-readable (`1.2M`); pass a node
   * (e.g. `<FormattedCurrency>`) to take over formatting.
   */
  value: number | ReactNode;
  /** Unit suffix — small, greyed, right of the value (`tokens`, `runs`). */
  unit?: string;
  /** Renders the suffix as `/ goal` (current / goal), before any unit. */
  goal?: number;
  /** Compact notation for numeric value/goal (default true). */
  short?: boolean;
  locale?: string;
  /**
   * Optional bottom line: contextual text, a link, or a graphical
   * indicator (Progress / Sparkline). Bottom-anchored so tiles align.
   */
  footer?: ReactNode;
}

/**
 * SmallStatCard — at-a-glance stat tile (Overview/Sessions hero rows).
 * Design source: original design `MetricTile` (the original usage screen); contract:
 * "SmallStatCard".
 *
 * Interpretation decisions (spec leaves open):
 * - `trend` wins over `decoration` when both are passed — the spec offers
 *   the top-right slot to one of them, and the trend is the datum.
 * - Numeric values format via the shared human-readable formatter; any
 *   ReactNode value renders verbatim for currency/custom cases.
 */
export const SmallStatCard = forwardRef<HTMLDivElement, SmallStatCardProps>(
  (
    {
      className,
      title,
      trend,
      decoration,
      value,
      unit,
      goal,
      short = true,
      locale,
      footer,
      size,
      ...props
    },
    ref,
  ) => {
    const suffix = [
      goal != null
        ? `/ ${formatNumber(goal, { short, locale })}`
        : null,
      unit,
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div
        ref={ref}
        className={cn(smallStatCard({ size }), className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={smallStatCardTitle()}>{title}</span>
          {trend != null
            ? <TrendIndicator trend={trend} showValue locale={locale} />
            : decoration}
        </div>
        <div className={smallStatCardValue()}>
          <span className={smallStatCardNumber({ size })}>
            {typeof value === 'number'
              ? formatNumber(value, { short, locale })
              : value}
          </span>
          {suffix !== '' && (
            <span className={smallStatCardSuffix()}>{suffix}</span>
          )}
        </div>
        {footer != null && (
          <div className={smallStatCardFooter()}>{footer}</div>
        )}
      </div>
    );
  },
);

SmallStatCard.displayName = 'SmallStatCard';
