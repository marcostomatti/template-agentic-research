import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button — the filled call-to-action. Composed on Touchable: Touchable owns
 * press/focus behavior, Button owns fill, size, and label.
 *
 * Every variant carries a 1px border (transparent unless secondary) so
 * sizes stay equal; secondary/ghost drop the shadow and read in fg1.
 * `rounded-md` comes via the Touchable layer.
 */
export const button = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold',
    'whitespace-nowrap shadow-xs',
    'disabled:opacity-50 disabled:pointer-events-none',
    'border border-transparent',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary',
        accent: 'bg-accent text-on-accent',
        secondary: 'bg-surface-1 text-fg1 border-border-strong shadow-none',
        ghost: 'bg-transparent text-fg1 shadow-none',
        danger: 'bg-danger text-cream-50',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
      },
      block: {
        false: 'w-auto',
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
);

export type ButtonVariants = VariantProps<typeof button>;
