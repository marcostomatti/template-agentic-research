import { cva, type VariantProps } from 'class-variance-authority';

/**
 * PasswordStrength — five segments filling danger → gold → success with
 * a mono label (auth screens). Empty segments keep cream-300 in both
 * themes.
 */
export const passwordStrengthSegment = cva(
  'h-1 flex-1 rounded-[2px] transition-colors',
  {
    variants: {
      fill: {
        empty: 'bg-cream-300',
        danger: 'bg-danger',
        gold: 'bg-gold-500',
        success: 'bg-success',
      },
    },
    defaultVariants: { fill: 'empty' },
  },
);

export type PasswordStrengthSegmentVariants = VariantProps<
  typeof passwordStrengthSegment
>;
