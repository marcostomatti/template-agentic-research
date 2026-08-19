import { cva, type VariantProps } from 'class-variance-authority';

/**
 * OptionCard — one selectable card for both auth pickers: workspace choice
 * (centered, 20px radio) and 2FA method choice (top-aligned, 18px radio).
 */
export const optionCard = cva(
  [
    'flex w-full cursor-pointer gap-3 rounded-lg border p-3.5 text-left',
    'bg-surface-1 border-border-soft transition-colors',
  ],
  {
    variants: {
      selected: {
        false: '',
        true: 'border-accent bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface-1))]',
      },
      align: {
        center: 'items-center',
        start: 'items-start',
      },
    },
    defaultVariants: { selected: false, align: 'center' },
  },
);

/** Workspace titles are display-face 15px; 2FA method titles body 14px. */
export const optionCardTitle = cva('font-bold text-fg1', {
  variants: {
    align: {
      center: 'font-display text-[15px]',
      start: 'text-sm',
    },
  },
  defaultVariants: { align: 'center' },
});

export const optionCardIndicator = cva(
  'flex shrink-0 items-center justify-center rounded-full border-2',
  {
    variants: {
      selected: {
        false: 'border-border-strong bg-transparent',
        true: 'border-accent bg-accent text-on-accent',
      },
      align: {
        center: 'size-5',
        start: 'size-[18px]',
      },
    },
    defaultVariants: { selected: false, align: 'center' },
  },
);

export type OptionCardVariants = VariantProps<typeof optionCard>;
