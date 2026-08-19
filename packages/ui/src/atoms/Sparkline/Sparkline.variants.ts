import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Sparkline — a small inline trend chart for card bottoms and table cells.
 * Derived from the original design `Sparkline` in
 * the original MetricTile screen (inline-styled SVG,
 * no CVA source): 1.5px line in the series color over a faint area fill.
 * Color rides on `currentColor` via the shared chart tone axis, so the
 * same palette drives every chart component.
 */
export const sparkline = cva('block w-full', {
  variants: {
    size: {
      /** Table-cell scale. */
      sm: 'h-6',
      /** Card-bottom scale (original MetricTile renders at 36px). */
      md: 'h-9',
    },
  },
  defaultVariants: { size: 'md' },
});

export type SparklineVariants = VariantProps<typeof sparkline>;
