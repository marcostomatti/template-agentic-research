import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Content — pure flex layout + spacing for a content area. No decoration,
 * no interaction. The workhorse for arranging children.
 *
 * No explicit w-full: as a block-level flex container it fills its
 * parent anyway.
 */
export const content = cva('flex', {
  variants: {
    direction: {
      col: 'flex-col',
      row: 'flex-row',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      between: 'justify-between',
      end: 'justify-end',
    },
    wrap: {
      false: 'flex-nowrap',
      true: 'flex-wrap',
    },
  },
  defaultVariants: {
    direction: 'col',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: false,
  },
});

export type ContentVariants = VariantProps<typeof content>;
