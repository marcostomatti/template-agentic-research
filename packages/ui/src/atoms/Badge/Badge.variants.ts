import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Badge — a status pill: the agent state, a priority, a count. Pure content;
 * a tone, a size, an optional leading dot, nothing interactive.
 *
 * `whitespace-nowrap` is deliberate — a wrapping status pill would be
 * broken.
 */
export const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full font-semibold leading-tight whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-1 text-fg2 border border-border-soft',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/20 text-gold-500',
        danger: 'bg-danger/15 text-danger',
        info: 'bg-info/15 text-info',
        accent: 'bg-accent text-on-accent',
        // Portal marketing release pill — a 24%-leaf tint filled with the
        // open-wordmark green.
        leaf: 'bg-[color-mix(in_oklab,var(--leaf)_24%,transparent)] text-wordmark-open',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      tone: 'success',
      size: 'md',
    },
  },
);

export type BadgeVariants = VariantProps<typeof badge>;
