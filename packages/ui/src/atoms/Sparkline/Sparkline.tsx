import { forwardRef, useMemo, type SVGAttributes } from 'react';

import { chartTone, cn, type ChartTone } from '../../lib';

import { sparkline, type SparklineVariants } from './Sparkline.variants';

/** ViewBox geometry — the box is stretched, strokes stay non-scaling. */
const VIEW_W = 100;
const VIEW_H = 32;
const EDGE_PAD = 2;

export interface SparklineProps
  extends Omit<SVGAttributes<SVGSVGElement>, 'children' | 'fill'>,
  SparklineVariants {
  /** The series, oldest first. Fewer than 2 points renders nothing. */
  data: number[];
  /** Series color from the shared chart palette. */
  tone?: ChartTone;
  /** Faint area fill under the line (original MetricTile default). */
  fill?: boolean;
  /**
   * Accessible label (e.g. "tokens over the last 30 days"). Without it
   * the chart is decorative (aria-hidden) — pair it with visible text.
   */
  label?: string;
}

const buildPath = (data: number[]): string => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = VIEW_W / (data.length - 1);
  return data
    .map((point, i) => {
      const x = i * step;
      const y = VIEW_H - ((point - min) / range) * (VIEW_H - EDGE_PAD * 2) - EDGE_PAD;
      return `${i === 0
        ? 'M'
        : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

/**
 * Sparkline — small inline SVG trend chart (card bottom lines, table
 * cells). Hand-rolled per the D1 decision (see LineChart/D1-DECISION.md);
 * mirrors the original design Sparkline in
 * the original MetricTile screen.
 *
 * The path normalizes to the data's own min/max (a sparkline shows shape,
 * not scale); the box stretches to the container while
 * `vector-effect: non-scaling-stroke` keeps the line weight constant.
 */
export const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(
  ({ className, data, tone, fill = true, label, size, ...props }, ref) => {
    const path = useMemo(
      () => (data.length < 2
        ? null
        : buildPath(data)),
      [data],
    );
    if (path == null) return null;
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role={label != null
          ? 'img'
          : undefined}
        aria-label={label}
        aria-hidden={label == null || undefined}
        className={cn(sparkline({ size }), chartTone({ tone }), className)}
        {...props}
      >
        {fill && (
          <path
            d={`${path} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`}
            fill="currentColor"
            opacity="0.1"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  },
);

Sparkline.displayName = 'Sparkline';
