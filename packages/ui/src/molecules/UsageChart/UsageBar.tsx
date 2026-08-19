import { forwardRef, type HTMLAttributes } from 'react';

import { chartTone, cn, type ChartTone } from '../../lib';

import {
  usageBarFill,
  usageBarGoalTick,
  usageBarOverflowFill,
  usageBarTrack,
  type UsageBarTrackVariants,
} from './UsageChart.variants';

export interface UsageBarProps
  extends HTMLAttributes<HTMLDivElement>,
  UsageBarTrackVariants {
  /**
   * Fill ratio. 0–1 fills normally; above 1 (progress overflow) the bar
   * re-scales so full width = the value, a contrast tick marks where the
   * goal (100%) sits, and the region past it renders dimmed danger.
   * `Infinity` (a positive value against a zero goal) is the degenerate
   * overflow: all-dimmed danger with the goal tick at 0.
   */
  ratio: number;
  /** Series color (shared chart palette). Overflow forces danger. */
  tone?: ChartTone;
  /** Accessible description; falls back to a percentage. */
  label?: string;
}

/**
 * UsageBar — the borderless bar indicator behind UsageChart rows
 * (original design ToolBars/AgentRanking bars). Exported for reuse as a table
 * cell indicator (03c "Bar indicator" cell content).
 *
 * The >100% treatment is a spec-driven design (not in the original
 * artboards): see `usageBarOverflowFill` in the variants file.
 */
export const UsageBar = forwardRef<HTMLDivElement, UsageBarProps>(
  ({ className, ratio, tone, size, track, label, ...props }, ref) => {
    const isOver = ratio > 1;
    const safeRatio = Math.max(0, ratio);
    // When overflowing, the track represents the value itself and the
    // goal tick sits at total/value (0 when the ratio is infinite).
    const fillPct = isOver
      ? (1 / safeRatio) * 100
      : safeRatio * 100;
    const pctText = Number.isFinite(safeRatio)
      ? `${Math.round(safeRatio * 100)}%`
      : 'over 100%';
    return (
      <div
        ref={ref}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number.isFinite(safeRatio)
          ? Math.min(100, Math.round(safeRatio * 100))
          : 100}
        aria-valuetext={pctText}
        aria-label={label ?? pctText}
        className={cn(
          usageBarTrack({ size, track }),
          chartTone({
            tone: isOver
              ? 'danger'
              : tone,
          }),
          className,
        )}
        {...props}
      >
        <div
          className={usageBarFill()}
          // Fill fraction is genuinely dynamic (Progress precedent).
          style={{ width: `${Math.min(100, fillPct)}%` }}
        />
        {isOver && (
          <>
            <div
              className={usageBarOverflowFill()}
              style={{ width: `${100 - fillPct}%` }}
            />
            <div className={usageBarGoalTick()} style={{ left: `${fillPct}%` }} />
          </>
        )}
      </div>
    );
  },
);

UsageBar.displayName = 'UsageBar';
