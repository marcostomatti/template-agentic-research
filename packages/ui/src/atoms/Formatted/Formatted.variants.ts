import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Formatted* display family (spec-driven): accentuated
 * values with small greyed-out units, per the DS value-display rules.
 * The size axis is shared across the family so values align when mixed.
 */
export const formattedValue = cva(
  'inline-flex items-baseline gap-1 font-semibold text-fg1',
  {
    variants: {
      size: {
        sm: 'text-[13px]',
        md: 'text-[15px]',
        lg: 'font-display text-2xl tracking-[-0.02em]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** The small greyed unit suffix (mono, like the original design MetricTile). */
export const formattedUnit = cva('font-mono font-normal text-fg3', {
  variants: {
    size: {
      sm: 'text-[10px]',
      md: 'text-[11px]',
      lg: 'text-[13px]',
    },
  },
  defaultVariants: { size: 'md' },
});

export type FormattedSizeVariants = VariantProps<typeof formattedValue>;
