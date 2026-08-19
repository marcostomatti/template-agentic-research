import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Tag — a classification label: a model, a tool, an id. Often monospace.
 *
 * Tones use the shared `*-soft`/`*-tint` theme tokens.
 */
export const tag = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-[9px] py-1 text-[12.5px] font-semibold',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-1 text-fg2 border-border-soft',
        success: 'bg-success-soft text-success border-success-tint',
        warning: 'bg-warning-soft text-gold-500 border-warning-tint',
        danger: 'bg-danger-soft text-danger border-danger-tint',
        info: 'bg-info-soft text-info border-info-tint',
      },
      /** Mono for bare ids; the body face for icon+word tags. */
      mono: {
        false: 'font-body',
        true: 'font-mono',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      mono: true,
    },
  },
);

export type TagVariants = VariantProps<typeof tag>;
