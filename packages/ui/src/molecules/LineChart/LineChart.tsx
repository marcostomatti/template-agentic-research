import {
  forwardRef,
  useMemo,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { chartTone, cn, formatNumber, type ChartTone } from '../../lib';
import { SectionCard } from '../SectionCard';

import {
  lineChartBaseline,
  lineChartGridLine,
  lineChartGuide,
  lineChartLegendLabel,
  lineChartLegendSwatch,
  lineChartLegendValue,
  lineChartSvg,
  lineChartTick,
} from './LineChart.variants';

export interface LineChartSeries {
  id: string;
  label: string;
  /** Series color from the shared chart palette. */
  tone?: ChartTone;
  /** One value per x label; series are aligned by index. */
  data: number[];
}

export interface LineChartProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: string;
  subtitle?: ReactNode;
  /** Header right slot. Defaults to the auto legend (label + total). */
  action?: ReactNode;
  series: LineChartSeries[];
  /** X-axis labels, one per data point (rendered sparsely). */
  labels: string[];
  /**
   * `stacked` (default): cumulative area layers — the original "Tokens by
   * model" shape. `line`: independent lines sharing one y scale.
   */
  variant?: 'stacked' | 'line';
  /** Inner drawing height in viewBox units (original default 200). */
  height?: number;
  /** Auto legend in the header action slot (label + series total). */
  showLegend?: boolean;
  /** Hover affordance: vertical guide + per-series readout. */
  hover?: boolean;
  /** Tick/legend/readout number formatting (default compact). */
  formatValue?: (value: number) => string;
  locale?: string;
}

/** Original StackedAreaChart geometry (viewBox units). */
const VIEW_W = 720;
const PAD = { l: 36, r: 8, t: 8, b: 24 };
const HEADROOM = 1.15;
const Y_TICKS = [0.25, 0.5, 0.75];
const MAX_X_TICKS = 8;

/**
 * LineChart — multi-series chart over time, hand-rolled token-styled SVG
 * (D1 decision, see D1-DECISION.md: consistent with Sparkline/UsageChart,
 * zero new dependencies, only the Overview needs it for the PoC; revisit
 * a library only if zoom/brush/animation requirements appear). Design
 * source: original design `StackedAreaChart` (the original usage screen "Tokens by model").
 *
 * Colors ride `currentColor` per series group via the shared chartTone
 * axis; axis ink uses fill/stroke utilities so themes apply untouched.
 */
export const LineChart = forwardRef<HTMLElement, LineChartProps>(
  (
    {
      className,
      title,
      subtitle,
      action,
      series,
      labels,
      variant = 'stacked',
      height = 200,
      showLegend = true,
      hover = true,
      formatValue,
      locale,
      ...props
    },
    ref,
  ) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const pointCount = labels.length;
    const innerW = VIEW_W - PAD.l - PAD.r;
    const innerH = height - PAD.t - PAD.b;
    const format = formatValue ?? ((value: number) => formatNumber(value, { short: true, locale }));

    const { maxY, cumulative } = useMemo(() => {
      const stacked = variant === 'stacked';
      // Per index: cumulative sums (stacked) or raw values (line).
      const cum = Array.from({ length: pointCount }, (_, i) => {
        let acc = 0;
        return series.map((s) => {
          const value = s.data[i] ?? 0;
          acc += value;
          return stacked
            ? acc
            : value;
        });
      });
      const peak = Math.max(...cum.flat(), 0) * HEADROOM || 1;
      return { maxY: peak, cumulative: cum };
    }, [series, pointCount, variant]);

    const xAt = (i: number): number => PAD.l + (pointCount > 1
      ? (i * innerW) / (pointCount - 1)
      : innerW / 2);
    const yAt = (value: number): number => PAD.t + innerH - (value / maxY) * innerH;

    const cumAt = (pointIdx: number, seriesIdx: number): number => cumulative[pointIdx]?.[seriesIdx] ?? 0;

    const topPath = (seriesIdx: number): string => cumulative
      .map((_, i) => `${i === 0
        ? 'M'
        : 'L'}${xAt(i).toFixed(1)},${yAt(cumAt(i, seriesIdx)).toFixed(1)}`)
      .join(' ');

    const areaPath = (seriesIdx: number): string => {
      const top = topPath(seriesIdx);
      if (seriesIdx === 0) {
        const baseline = `L${xAt(pointCount - 1).toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(PAD.t + innerH).toFixed(1)} Z`;
        return `${top} ${baseline}`;
      }
      const bottom = cumulative
        .map((_, j) => {
          const i = pointCount - 1 - j;
          return `L${xAt(i).toFixed(1)},${yAt(cumAt(i, seriesIdx - 1)).toFixed(1)}`;
        })
        .join(' ');
      return `${top} ${bottom} Z`;
    };

    const xTickEvery = Math.max(1, Math.ceil(pointCount / MAX_X_TICKS));

    const onMove = (event: MouseEvent<SVGSVGElement>): void => {
      if (!hover || pointCount < 2) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const viewX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
      const step = innerW / (pointCount - 1);
      const index = Math.round((viewX - PAD.l) / step);
      setHoverIndex(Math.max(0, Math.min(pointCount - 1, index)));
    };

    const legend = showLegend
      ? (
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  lineChartLegendSwatch(),
                  chartTone({ tone: s.tone }),
                )}
              />
              <span className={lineChartLegendLabel()}>{s.label}</span>
              <span className={lineChartLegendValue()}>
                {format(s.data.reduce((acc, v) => acc + v, 0))}
              </span>
            </span>
          ))}
        </div>
      )
      : null;

    return (
      <SectionCard
        ref={ref}
        title={title}
        subtitle={subtitle}
        action={action ?? legend}
        className={className}
        {...props}
      >
        <div className="relative">
          {/* Data visualization; the legend + readout carry the values. */}
          <svg
            viewBox={`0 0 ${VIEW_W} ${height}`}
            preserveAspectRatio="none"
            aria-hidden
            className={lineChartSvg()}
            onMouseMove={onMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {Y_TICKS.map((tick) => {
              const value = maxY * tick;
              return (
                <g key={tick}>
                  <line
                    x1={PAD.l}
                    x2={VIEW_W - PAD.r}
                    y1={yAt(value)}
                    y2={yAt(value)}
                    strokeDasharray="2 3"
                    className={lineChartGridLine()}
                  />
                  <text
                    x={PAD.l - 6}
                    y={yAt(value) + 4}
                    textAnchor="end"
                    className={lineChartTick()}
                  >
                    {format(Math.round(value))}
                  </text>
                </g>
              );
            })}
            <line
              x1={PAD.l}
              x2={VIEW_W - PAD.r}
              y1={PAD.t + innerH}
              y2={PAD.t + innerH}
              className={lineChartBaseline()}
            />

            {variant === 'stacked'
              ? series
                .map((s, idx) => (
                  <path
                    key={s.id}
                    d={areaPath(idx)}
                    fill="currentColor"
                    opacity={0.18 + idx * 0.2}
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className={chartTone({ tone: s.tone })}
                  />
                ))
                .reverse()
              : series.map((s, idx) => (
                <path
                  key={s.id}
                  d={topPath(idx)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={chartTone({ tone: s.tone })}
                />
              ))}

            {labels.map((label, i) => {
              if (i % xTickEvery !== 0 && i !== pointCount - 1) return null;
              return (
                <text
                  key={label + String(i)}
                  x={xAt(i)}
                  y={height - 6}
                  textAnchor="middle"
                  className={lineChartTick()}
                >
                  {label}
                </text>
              );
            })}

            {hover && hoverIndex != null && (
              <g>
                <line
                  x1={xAt(hoverIndex)}
                  x2={xAt(hoverIndex)}
                  y1={PAD.t}
                  y2={PAD.t + innerH}
                  className={lineChartGuide()}
                />
                {series.map((s, idx) => (
                  <circle
                    key={s.id}
                    cx={xAt(hoverIndex)}
                    cy={yAt(cumAt(hoverIndex, idx))}
                    r={3}
                    fill="currentColor"
                    className={chartTone({ tone: s.tone })}
                  />
                ))}
              </g>
            )}
          </svg>
          {hover && hoverIndex != null && (
            <div
              className="pointer-events-none absolute top-2 rounded-md border border-border-soft bg-surface-1 px-2.5 py-1.5 shadow-sm"
              // Follows the hovered index — genuinely dynamic.
              style={{
                left: `${(xAt(hoverIndex) / VIEW_W) * 100}%`,
                transform: xAt(hoverIndex) > VIEW_W / 2
                  ? 'translateX(calc(-100% - 8px))'
                  : 'translateX(8px)',
              }}
            >
              <div className="font-mono text-[10px] text-fg3">
                {labels[hoverIndex]}
              </div>
              {series.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      lineChartLegendSwatch(),
                      chartTone({ tone: s.tone }),
                    )}
                  />
                  <span className={lineChartLegendLabel()}>{s.label}</span>
                  <span className="ml-auto pl-2 font-mono text-[11px] font-semibold text-fg1">
                    {format(s.data[hoverIndex] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    );
  },
);

LineChart.displayName = 'LineChart';
