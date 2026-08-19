import {
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { chartTone, cn, formatNumber, type ChartTone } from '../../lib';
import { devWarn } from '../../lib/dev';
import { SectionCard } from '../SectionCard';

import { UsageBar } from './UsageBar';
import {
  usageChartLegendSwatch,
  usageChartRowMeta,
  usageChartRowName,
  usageChartRowTitle,
  usageChartRowValue,
  usageChartSegment,
  usageChartSegmentBar,
} from './UsageChart.variants';

export interface UsageChartItem {
  /** Row identity (defaults to `name`). */
  id?: string;
  /** Row / segment name. Truncates; the full text rides a title attr. */
  name: string;
  /** The measured value driving the bar. */
  value: number;
  /** Rendered value (defaults to the locale-formatted number). */
  displayValue?: ReactNode;
  /** Series color from the shared chart palette. */
  tone?: ChartTone;
  /** Multi mode: first-column decoration (avatar, icon tile, badge). */
  decoration?: ReactNode;
  /** Multi mode: small meta text right of the name (`42 runs`). */
  meta?: ReactNode;
  /** Multi mode: additional free-content columns. */
  columns?: ReactNode[];
}

export interface UsageChartProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Card header title; header renders when title or action is present. */
  title?: string;
  subtitle?: ReactNode;
  /** Header right slot — filter/sorting selector. */
  action?: ReactNode;
  /** Simple footer text; `footerDivider` adds the divider. */
  footer?: ReactNode;
  footerDivider?: boolean;
  /**
   * `simple`: name / bar / value rows. `multi`: decoration + condensed
   * name-over-bar + value + free columns. `single`: one segmented bar
   * with a 2-column `[color] {text} {value}` legend (usage only).
   */
  mode?: 'simple' | 'multi' | 'single';
  items: UsageChartItem[];
  locale?: string;
  /**
   * `usage` (default): bars scale so 100% = the highest value in the
   * list. `progress`: bars read `value / total` on a gray track.
   */
  variant?: 'usage' | 'progress';
  /**
   * REQUIRED with `variant="progress"` (spec) — the goal the ratio reads
   * against. Missing totals warn in dev and render empty bars.
   */
  total?: number;
}

const rowKey = (item: UsageChartItem): string => item.id ?? item.name;

/**
 * UsageChart / ProgressChart — table-like bar chart. Design sources: raw
 * DS `ToolBars` (simple) + `AgentRanking` (multi) in the original usage screen;
 * contract: the component spec.
 *
 * - `variant="usage"` (default): bar denominators are the list max.
 * - `variant="progress"`: requires a non-zero `total` (dev-warned),
 *   draws the gray track, and gets the >100% overflow treatment (see
 *   UsageBar). A zero/missing total with positive values renders as the
 *   full-overflow state, never a silently empty track.
 * - The single-line variant is usage-only per spec; a progress single
 *   bar downgrades to usage with a dev warning.
 */
export const UsageChart = forwardRef<HTMLElement, UsageChartProps>(
  (
    {
      className,
      title,
      subtitle,
      action,
      footer,
      footerDivider,
      mode = 'simple',
      items,
      locale,
      variant = 'usage',
      total,
      ...props
    },
    ref,
  ) => {
    const isProgress = variant === 'progress' && mode !== 'single';
    if (variant === 'progress' && mode === 'single') {
      devWarn('UsageChart: the single-line variant is usage-only (spec); rendering as usage');
    }
    if (isProgress && (total == null || total === 0)) {
      devWarn('UsageChart: variant="progress" requires a non-zero total prop (spec)');
    }
    const max = Math.max(...items.map((item) => item.value), 0);
    const denominator = isProgress
      ? (total ?? 0)
      : max;
    // A zero/missing progress total with a positive value is the
    // full-overflow state (any value exceeds a zero goal): it gets the
    // >100% treatment instead of silently rendering an empty track.
    const ratioOf = (value: number): number => {
      if (denominator > 0) return value / denominator;
      return isProgress && value > 0
        ? Number.POSITIVE_INFINITY
        : 0;
    };
    const percentLabel = (ratio: number): string => (Number.isFinite(ratio)
      ? `${Math.round(ratio * 100)}%`
      : 'over budget');
    const displayOf = (item: UsageChartItem): ReactNode => item.displayValue ?? formatNumber(item.value, { locale });

    const sum = items.reduce((acc, item) => acc + item.value, 0);
    const extraColumns = mode === 'multi'
      ? Math.max(0, ...items.map((item) => item.columns?.length ?? 0))
      : 0;
    const hasDecoration = mode === 'multi' && items.some((item) => item.decoration != null);

    return (
      <SectionCard
        ref={ref}
        title={title}
        subtitle={subtitle}
        action={action}
        footer={footer}
        footerDivider={footerDivider}
        className={className}
        {...props}
      >
        {mode === 'simple' && (
          <div className="grid grid-cols-[minmax(90px,max-content)_1fr_max-content] items-center gap-x-2.5 gap-y-2">
            {items.map((item) => (
              <Fragment key={rowKey(item)}>
                <span className={usageChartRowName()} title={item.name}>
                  {item.name}
                </span>
                <UsageBar
                  ratio={ratioOf(item.value)}
                  tone={item.tone}
                  track={isProgress}
                  label={`${item.name}: ${percentLabel(ratioOf(item.value))}`}
                />
                <span
                  className={usageChartRowValue({
                    over: isProgress && ratioOf(item.value) > 1,
                  })}
                >
                  {displayOf(item)}
                </span>
              </Fragment>
            ))}
          </div>
        )}

        {mode === 'multi' && (
          <div
            className="grid items-center gap-x-2.5 gap-y-2"
            // Column count is data-driven (decoration + free columns) —
            // genuinely dynamic, so the template lives on the style attr.
            style={{
              gridTemplateColumns: `${hasDecoration
                ? '26px '
                : ''}minmax(0,1fr) repeat(${1 + extraColumns}, max-content)`,
            }}
          >
            {items.map((item) => (
              <Fragment key={rowKey(item)}>
                {hasDecoration && <div>{item.decoration}</div>}
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={usageChartRowTitle()} title={item.name}>
                      {item.name}
                    </span>
                    {item.meta != null && (
                      <span className={usageChartRowMeta()}>{item.meta}</span>
                    )}
                  </div>
                  <UsageBar
                    className="mt-1"
                    size="sm"
                    ratio={ratioOf(item.value)}
                    tone={item.tone}
                    track={isProgress}
                    label={`${item.name}: ${percentLabel(ratioOf(item.value))}`}
                  />
                </div>
                <span
                  className={usageChartRowValue({
                    emphasis: true,
                    over: isProgress && ratioOf(item.value) > 1,
                  })}
                >
                  {displayOf(item)}
                </span>
                {Array.from({ length: extraColumns }, (_, i) => (
                  <span key={i} className={usageChartRowValue()}>
                    {item.columns?.[i]}
                  </span>
                ))}
              </Fragment>
            ))}
          </div>
        )}

        {mode === 'single' && (
          <div className="flex flex-col gap-3">
            <div className={usageChartSegmentBar()}>
              {items.map((item) => (
                <div
                  key={rowKey(item)}
                  className={cn(
                    usageChartSegment(),
                    chartTone({ tone: item.tone }),
                  )}
                  title={item.name}
                  // Segment share is genuinely dynamic.
                  style={{
                    width: `${sum > 0
                      ? (item.value / sum) * 100
                      : 0}%`,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {items.map((item) => (
                <div key={rowKey(item)} className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      usageChartLegendSwatch(),
                      chartTone({ tone: item.tone }),
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-fg2" title={item.name}>
                    {item.name}
                  </span>
                  <span className="font-mono text-xs text-fg1">
                    {displayOf(item)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    );
  },
);

UsageChart.displayName = 'UsageChart';
