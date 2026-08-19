import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Avatar — the identity mark: an agent or a person. Initials on a brand
 * fill, with size, shape and an optional presence indicator.
 *
 * `status` drives a bottom-right presence dot with a surface border
 * (avatarStatus below) rather than a ring on the avatar itself.
 */
export const avatar = cva(
  'inline-flex items-center justify-center shrink-0 font-display font-bold text-cream-50 bg-primary',
  {
    variants: {
      size: {
        sm: 'size-6 text-xs',
        md: 'size-8 text-sm',
        lg: 'size-11 text-base',
      },
      shape: {
        circle: 'rounded-full',
        rounded: 'rounded-lg',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
    },
  },
);

/** The presence dot (demo: 0.3× avatar size, 2px surface border). */
export const avatarStatus = cva(
  'absolute -bottom-px -right-px rounded-full border-2 border-surface-1',
  {
    variants: {
      status: {
        none: 'hidden',
        online: 'bg-success',
        busy: 'bg-danger',
        away: 'bg-gold-500',
      },
      size: {
        sm: 'size-2',
        md: 'size-2.5',
        lg: 'size-3.5',
      },
    },
    defaultVariants: {
      status: 'online',
      size: 'md',
    },
  },
);

export type AvatarVariants = VariantProps<typeof avatar> &
  Pick<VariantProps<typeof avatarStatus>, 'status'>;
