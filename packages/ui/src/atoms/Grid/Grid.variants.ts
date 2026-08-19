import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Grid — grid layout for a set of children (agent grid, metric row, tools
 * gallery). Pair with GridItem for explicit placement.
 *
 * The auto column tracks minmax(180px,1fr).
 */
export const grid = cva('grid', {
  variants: {
    cols: {
      '1': 'grid-cols-1',
      '2': 'grid-cols-2',
      '3': 'grid-cols-3',
      '4': 'grid-cols-4',
      auto: 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]',
    },
    gap: {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
    },
  },
  defaultVariants: {
    cols: 'auto',
    gap: 'md',
  },
});

export type GridVariants = VariantProps<typeof grid>;
