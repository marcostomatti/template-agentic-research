import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Field — a labelled input. Owns the label, the control frame and the
 * helper/error line; the state variant drives the border and message colors,
 * never per-call overrides.

 */
export const field = cva(
  'w-full rounded-md bg-surface-1 border px-3 text-fg1 placeholder:text-fg3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf',
  {
    variants: {
      state: {
        default: 'border-border-strong',
        error: 'border-danger',
        success: 'border-success',
        disabled: 'opacity-60 pointer-events-none',
      },
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-sm',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  },
);

/** The helper/error line under the control; color follows the state. */
export const fieldHelper = cva('text-[11.5px]', {
  variants: {
    state: {
      default: 'text-fg3',
      error: 'text-danger',
      success: 'text-success',
      disabled: 'text-fg3',
    },
  },
  defaultVariants: { state: 'default' },
});

export type FieldVariants = VariantProps<typeof field>;
