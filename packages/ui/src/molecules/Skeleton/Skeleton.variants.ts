import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Skeleton — the loading state of async data (a shimmer sweep).
 * Shape and size come from the caller's
 * className — a skeleton IS layout filler, so that's layout context,
 * not decoration override.
 */
export const skeleton = cva(
  [
    'block h-3 rounded-full animate-shimmer motion-reduce:animate-none',
    'bg-[linear-gradient(90deg,var(--surface-sunk)_0%,color-mix(in_oklab,var(--surface-sunk)_40%,var(--surface-2))_50%,var(--surface-sunk)_100%)]',
    'bg-[length:800px_100%]',
  ],
);

export type SkeletonVariants = VariantProps<typeof skeleton>;
