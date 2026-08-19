import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Banner / Alert — inline, persistent status in the flow of the page. Tone
 * drives color and icon together; dismiss and an action slot are optional.
 *
 * Fills use the softer `*-wash` tier the feedback surfaces share.
 */
export const banner = cva('flex gap-3 rounded-md border px-[15px] py-[13px]', {
  variants: {
    tone: {
      success: 'bg-success-wash border-success-tint',
      warning: 'bg-warning-wash border-warning-tint',
      danger: 'bg-danger-wash border-danger-tint',
      info: 'bg-info-wash border-info-tint',
      neutral: 'bg-neutral-wash border-neutral-tint',
    },
  },
  defaultVariants: { tone: 'info' },
});

/** Tone color for the leading icon. */
export const bannerIcon = cva('mt-px shrink-0', {
  variants: {
    tone: {
      success: 'text-success',
      warning: 'text-gold-500',
      danger: 'text-danger',
      info: 'text-info',
      neutral: 'text-fg3',
    },
  },
  defaultVariants: { tone: 'info' },
});

/** The optional tone-colored action button. */
export const bannerAction = cva(
  'self-center shrink-0 rounded-md border bg-surface-1 px-3 py-1.5 text-[12.5px] font-semibold',
  {
    variants: {
      tone: {
        success: 'text-success border-success-tint',
        warning: 'text-gold-500 border-warning-tint',
        danger: 'text-danger border-danger-tint',
        info: 'text-info border-info-tint',
        neutral: 'text-fg2 border-neutral-tint',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

export type BannerVariants = VariantProps<typeof banner>;
