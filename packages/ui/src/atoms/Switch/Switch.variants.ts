import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Switch — a binary toggle built on Touchable. The track and knob are the
 * only decoration; size and tone are variants, checked/disabled are state
 * (state rides the `data-on` attribute, styled via `data-[on]`).
 *
 * The off state carries its own fill/border (surface-sunk +
 * border-strong).
 */
export const switchTrack = cva(
  [
    'group relative inline-flex items-center rounded-full transition-colors',
    'border shadow-inset data-[on]:shadow-none',
    'bg-surface-sunk border-border-strong',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      size: {
        sm: 'h-4 w-7',
        md: 'h-5 w-9',
      },
      tone: {
        accent: 'data-[on]:bg-accent data-[on]:border-accent',
        primary: 'data-[on]:bg-primary data-[on]:border-primary',
      },
    },
    defaultVariants: {
      size: 'md',
      tone: 'accent',
    },
  },
);

/**
 * The knob (demo: track height minus 4px, surface-2, sm shadow, slides
 * `width − knob − insets` when on).
 */
export const switchThumb = cva(
  'pointer-events-none absolute left-[1px] top-1/2 -translate-y-1/2 rounded-full bg-surface-2 shadow-sm transition-[left] duration-150',
  {
    variants: {
      size: {
        sm: 'size-3 group-data-[on]:left-[13px]',
        md: 'size-4 group-data-[on]:left-[17px]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type SwitchVariants = VariantProps<typeof switchTrack>;
