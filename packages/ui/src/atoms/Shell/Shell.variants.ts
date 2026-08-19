import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Shell — outermost layout + decoration for a page or section. No interaction.
 *
 * lg padding is p-10 (40px) by spec.
 */
export const shell = cva('flex flex-col w-full', {
  variants: {
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-10',
    },
    tone: {
      bg: 'bg-bg',
      surface: 'bg-surface-1',
      sunk: 'bg-surface-sunk',
    },
    bordered: {
      false: 'border-0',
      true: 'border border-border-soft',
    },
    rounded: {
      none: 'rounded-none',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
    },
  },
  defaultVariants: {
    padding: 'lg',
    tone: 'bg',
    bordered: false,
    rounded: 'none',
  },
});

export type ShellVariants = VariantProps<typeof shell>;
