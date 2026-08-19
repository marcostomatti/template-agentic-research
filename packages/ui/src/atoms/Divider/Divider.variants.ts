import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Divider — a horizontal rule, optionally interrupted by a mono label
 * ("or with email"). Used by the auth screens.
 */
export const divider = cva('flex w-full items-center gap-3');

export const dividerRule = cva('h-px flex-1 bg-border-soft');

export const dividerLabel = cva(
  'font-mono text-[10px] uppercase tracking-[0.1em] text-fg3',
);

export type DividerVariants = VariantProps<typeof divider>;
