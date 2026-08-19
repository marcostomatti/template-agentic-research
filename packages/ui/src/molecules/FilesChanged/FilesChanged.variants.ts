import { cva, type VariantProps } from 'class-variance-authority';

/**
 * FilesChanged — table-like card listing changed files with +/- counts.
 * Spec-driven ("FilesChanged" — no design
 * artboard); chrome mirrors the original-design Section rows (mono paths, soft
 * row rhythm).
 */
export const filesChangedSummary = cva('font-mono text-xs', {
  variants: {
    kind: {
      additions: 'font-semibold text-success',
      deletions: 'font-semibold text-danger',
      count: 'text-fg3',
    },
  },
  defaultVariants: { kind: 'count' },
});

export const filesChangedPath = cva(
  'min-w-0 flex-1 truncate font-mono text-xs text-fg1',
);

export const filesChangedDelta = cva('text-right font-mono text-xs', {
  variants: {
    kind: {
      additions: 'text-success',
      deletions: 'text-danger',
    },
    zero: {
      false: '',
      true: 'opacity-50',
    },
  },
  defaultVariants: { zero: false },
});

export type FilesChangedDeltaVariants = VariantProps<typeof filesChangedDelta>;
