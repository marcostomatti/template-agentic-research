import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import {
  rowStatCard,
  rowStatCardStatLabel,
  rowStatCardStatValue,
  rowStatCardSubtitle,
  rowStatCardTitle,
  type RowStatCardStatValueVariants,
} from './RowStatCard.variants';

export interface RowStat {
  /** Ministat label, on top (mono, uppercase). */
  title: string;
  /** Ministat value, below. Formatted by the caller. */
  value: ReactNode;
  /**
   * Value accent. `trend` derives it automatically (positive → success,
   * negative → danger); an explicit tone always wins.
   */
  tone?: RowStatCardStatValueVariants['tone'];
  /** Ratio trend that auto-accents the value when `tone` is absent. */
  trend?: number;
}

export interface RowStatCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Row 1 left: title (display font). */
  title: string;
  /** Row 1 left: small greyed subtitle. */
  subtitle?: ReactNode;
  /** Row 1 right: the "invisible columns" of ministats. */
  stats?: RowStat[];
  /** Row 1 far right: optional action (original BudgetBar's Adjust button). */
  action?: ReactNode;
  /**
   * Row 2: optional contextual text, link, or graphical indicator —
   * pair with the colocated `RowStatCardMeter` for the budget meter.
   */
  footer?: ReactNode;
}

const statTone = (
  stat: RowStat,
): RowStatCardStatValueVariants['tone'] => {
  if (stat.tone != null) return stat.tone;
  if (stat.trend == null || stat.trend === 0) return 'neutral';
  return stat.trend > 0
    ? 'success'
    : 'danger';
};

/**
 * RowStatCard — full-width card with title/subtitle left and borderless
 * ministat columns right, plus an optional second row (text, link, or
 * indicator). Design source: original design `BudgetBar` (the original usage screen "Monthly
 * budget"); contract: "RowStatCard".
 *
 * Interpretation decisions:
 * - `action` slot: the original design seats a button beside the readouts;
 *   the spec's row-1 contract is title + ministats, so the button is an
 *   explicit optional slot rather than a ministat.
 * - automatic accent: a ministat's `trend` colors its value
 *   (up → success, down → danger); explicit `tone` overrides.
 */
export const RowStatCard = forwardRef<HTMLDivElement, RowStatCardProps>(
  ({ className, title, subtitle, stats, action, footer, ...props }, ref) => (
    <div ref={ref} className={cn(rowStatCard(), className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className={rowStatCardTitle()}>{title}</div>
          {subtitle != null && (
            <div className={rowStatCardSubtitle()}>{subtitle}</div>
          )}
        </div>
        {(stats != null || action != null) && (
          <div className="flex items-center gap-4">
            {stats?.map((stat) => (
              <div key={stat.title}>
                <div className={rowStatCardStatLabel()}>{stat.title}</div>
                <div
                  className={rowStatCardStatValue({ tone: statTone(stat) })}
                >
                  {stat.value}
                </div>
              </div>
            ))}
            {action}
          </div>
        )}
      </div>
      {footer}
    </div>
  ),
);

RowStatCard.displayName = 'RowStatCard';
