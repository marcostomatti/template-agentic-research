import { cva, type VariantProps } from 'class-variance-authority';

/**
 * SectionCard — the dashboard chart/card shell, migrated from the original design
 * `Section` in the original Shared screen (inline
 * styles, no CVA source): surface-1 card, radius-lg, soft border, an
 * optional header row (14/18 padding, divider) with display-font title +
 * small subtitle, and an 18px-padded body (`padded={false}` for
 * full-bleed lists).
 */
export const sectionCard = cva(
  'flex flex-col overflow-hidden rounded-lg border border-border-soft bg-surface-1',
);

export const sectionCardHeader = cva(
  'flex items-center justify-between gap-3 border-b border-border-soft bg-surface-1 px-[18px] py-3.5',
);

export const sectionCardTitle = cva(
  'font-display text-[15px] font-bold tracking-[-0.01em] text-fg1',
);

export const sectionCardSubtitle = cva('mt-0.5 text-xs text-fg3');

export const sectionCardBody = cva('flex-1', {
  variants: {
    padded: {
      false: 'p-0',
      true: 'p-[18px]',
    },
  },
  defaultVariants: { padded: true },
});

/** Footer line (UsageChart contract): small text, optional divider. */
export const sectionCardFooter = cva('px-[18px] pb-3.5 text-xs text-fg3', {
  variants: {
    divider: {
      false: '',
      true: 'mt-0 border-t border-border-soft pt-3',
    },
  },
  defaultVariants: { divider: false },
});

export type SectionCardBodyVariants = VariantProps<typeof sectionCardBody>;
export type SectionCardFooterVariants = VariantProps<typeof sectionCardFooter>;
