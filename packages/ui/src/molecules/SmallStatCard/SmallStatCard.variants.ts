import { cva, type VariantProps } from 'class-variance-authority';

/**
 * SmallStatCard — the dashboard hero stat tile. Design source: original design
 * `MetricTile` in the original MetricTile screen
 * (inline styles, no CVA source); contract: the component spec
 * "SmallStatCard".
 *
 * Original geometry: surface-1, soft border, radius-lg, 18px padding, 8px gap,
 * min-height 130 (the footer slot bottom-anchors via mt-auto so tiles in
 * a row align whether or not they carry a bottom line).
 */
export const smallStatCard = cva(
  'relative flex flex-col gap-2 overflow-hidden rounded-lg border border-border-soft bg-surface-1 p-[18px]',
  {
    variants: {
      size: {
        /** Original MetricTile scale — hero rows (min-height 130). */
        md: 'min-h-[130px]',
        /** Compact — sidebar/embedded usage, no reserved footer space. */
        sm: 'min-h-0',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const smallStatCardTitle = cva(
  'font-mono text-[10px] uppercase tracking-[0.1em] text-fg3',
);

/** The stat line: display-font value + small mono suffix, baselined. */
export const smallStatCardValue = cva('flex items-baseline gap-1.5');

export const smallStatCardNumber = cva(
  'font-display font-bold leading-none tracking-[-0.02em] text-fg1',
  {
    variants: {
      size: {
        md: 'text-4xl',
        sm: 'text-[26px]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Unit / `/ goal` suffix — small, mono, greyed (original MetricTile `unit`). */
export const smallStatCardSuffix = cva('font-mono text-[13px] text-fg3');

/** Bottom line slot — anchored to the tile bottom like the original sparkline. */
export const smallStatCardFooter = cva('mt-auto text-xs text-fg3');

export type SmallStatCardVariants = VariantProps<typeof smallStatCard>;
