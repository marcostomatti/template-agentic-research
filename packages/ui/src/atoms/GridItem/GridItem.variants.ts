import { cva, type VariantProps } from 'class-variance-authority';

/**
 * GridItem — explicit-placement helper for the occasional Grid child that
 * breaks the rhythm: span columns or align itself. Most children don't
 * need it.

 */
export const gridItem = cva('', {
  variants: {
    span: {
      '1': 'col-span-1',
      '2': 'col-span-2',
      '3': 'col-span-3',
      full: 'col-span-full',
    },
    align: {
      auto: 'self-auto',
      start: 'self-start',
      center: 'self-center',
      stretch: 'self-stretch',
    },
  },
  defaultVariants: {
    span: '1',
    align: 'auto',
  },
});

export type GridItemVariants = VariantProps<typeof gridItem>;
