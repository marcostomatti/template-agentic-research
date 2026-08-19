import { cva, type VariantProps } from 'class-variance-authority';

/**
 * TrendIndicator — up/down/flat trend glyph with optional percentage
 * (spec-driven). Type treatment mirrors the original design
 * MetricTile delta (mono, 11px, semibold, success/danger accents).
 */
export const trendIndicator = cva(
  'inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold',
  {
    variants: {
      direction: {
        up: 'text-success',
        down: 'text-danger',
        flat: 'text-fg3',
      },
    },
    defaultVariants: { direction: 'flat' },
  },
);

export type TrendIndicatorVariants = VariantProps<typeof trendIndicator>;
