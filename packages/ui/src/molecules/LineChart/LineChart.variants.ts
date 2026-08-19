import { cva, type VariantProps } from 'class-variance-authority';

/**
 * LineChart — multi-series chart over time (Overview "Tokens by model").
 * Design source: original design `StackedAreaChart` + `ModelLegend` in
 * the original Usage screen (inline-styled SVG, no
 * CVA source). Implementation: hand-rolled token-styled SVG per the D1
 * spike (see D1-DECISION.md in this folder).
 */
export const lineChartSvg = cva('block w-full');

/** Axis tick text — mono 10px, tertiary ink (SVG fill). */
export const lineChartTick = cva('fill-fg3 font-mono text-[10px]');

export const lineChartGridLine = cva('stroke-border-soft');

export const lineChartBaseline = cva('stroke-border-strong');

/** Hover guide (vertical rule + point dots ride series currentColor). */
export const lineChartGuide = cva('stroke-border-strong opacity-60');

/** Legend row (original ModelLegend): swatch + label + dim value. */
export const lineChartLegendSwatch = cva(
  'size-[9px] shrink-0 rounded-[2px] bg-current',
);

export const lineChartLegendLabel = cva('font-mono text-[11px] text-fg2');

export const lineChartLegendValue = cva('font-mono text-[11px] text-fg3');

export type LineChartSvgVariants = VariantProps<typeof lineChartSvg>;
