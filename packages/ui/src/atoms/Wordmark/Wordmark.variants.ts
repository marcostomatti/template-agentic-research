import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Wordmark — the "open tomato" type lockup. The two words carry theme-aware
 * brand tokens: `open` in the wordmark-open green, `tomato` in the
 * wordmark-tomato red. Shared with the auth screens' inline lockup in
 * AuthShell/BrandLockup.
 *
 * Size is genuinely dynamic (px, driven by context — 20 in the header, 22
 * in the footer), so it stays a prop-driven inline font-size on the root,
 * not a CVA axis (same rationale as TomatoMark's `size`).
 */
export const wordmark = cva(
  'inline-flex gap-[0.18em] font-display font-extrabold leading-none tracking-[-0.02em]',
);

export type WordmarkVariants = VariantProps<typeof wordmark>;
