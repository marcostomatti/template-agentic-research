import { cva, type VariantProps } from 'class-variance-authority';

/**
 * EmptyState — the "nothing here yet" surface, and the one place the mascot
 * appears in-app. Variants set scale and alignment; the action slot is
 * optional.

 */
export const emptyState = cva('flex flex-col w-full', {
  variants: {
    size: {
      sm: 'py-6 gap-2',
      md: 'py-10 gap-3',
      lg: 'py-16 gap-4',
    },
    align: {
      center: 'items-center text-center',
      start: 'items-start text-left',
    },
  },
  defaultVariants: {
    size: 'md',
    align: 'center',
  },
});

export type EmptyStateVariants = VariantProps<typeof emptyState>;
