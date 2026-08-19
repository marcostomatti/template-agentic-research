import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Icon — name-based Lucide wrapper (spec-driven).
 * The wrapper owns the semantic chrome: an accent (foreground tone) and an
 * optional soft background tile behind the glyph.
 */
export const icon = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    accent: {
      inherit: 'text-current',
      accent: 'text-accent',
      success: 'text-success',
      warning: 'text-gold-500',
      danger: 'text-danger',
      info: 'text-info',
      muted: 'text-fg3',
    },
    bg: {
      none: '',
      soft: 'rounded-md bg-surface-sunk p-1.5',
      accent: 'rounded-md bg-accent-soft p-1.5',
      success: 'rounded-md bg-success-soft p-1.5',
      warning: 'rounded-md bg-warning-soft p-1.5',
      danger: 'rounded-md bg-danger-soft p-1.5',
      info: 'rounded-md bg-info-soft p-1.5',
    },
  },
  defaultVariants: { accent: 'inherit', bg: 'none' },
});

export type IconVariants = VariantProps<typeof icon>;
