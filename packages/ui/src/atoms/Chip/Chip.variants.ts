import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Chip — a removable token: an active filter, an invited teammate. The only
 * leaf atom with an affordance (remove).
 *
 * Always accent-tinted; the padding tightens on the remove side to
 * optically balance the round button.
 */
export const chip = cva(
  'inline-flex items-center gap-[7px] rounded-full border bg-accent-soft border-accent-tint text-fg1 text-[12.5px] font-semibold',
  {
    variants: {
      removable: {
        false: 'py-[5px] px-3',
        true: 'py-1 pl-[11px] pr-1.5',
      },
    },
    defaultVariants: {
      removable: false,
    },
  },
);

export type ChipVariants = VariantProps<typeof chip>;
