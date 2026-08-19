import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Breadcrumb — "where am I": a controlled current index over a path.
 * One of the four selection-index chromes (`value + onChange + items`).

 */
export const breadcrumbItem = cva(
  'px-2 py-1 rounded-sm text-[13.5px] font-body',
  {
    variants: {
      state: {
        current: 'font-bold text-fg1',
        past: 'font-medium text-fg2',
        upcoming: 'font-medium text-fg3',
      },
    },
    defaultVariants: { state: 'upcoming' },
  },
);

export type BreadcrumbItemVariants = VariantProps<typeof breadcrumbItem>;
