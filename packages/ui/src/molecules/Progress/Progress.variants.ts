import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Progress — determinate when the fraction is known, indeterminate when it
 * isn't. The bar borrows the tone scale at thresholds (e.g. accent →
 * danger past 85%; the threshold decision belongs to the caller, the
 * tone variant is the mechanism).
 */
export const progressTrack = cva(
  'relative h-2 w-full overflow-hidden rounded-full border border-border-soft bg-surface-sunk',
);

export const progressBar = cva('h-full rounded-full', {
  variants: {
    tone: {
      accent: 'bg-accent',
      danger: 'bg-danger',
      leaf: 'bg-leaf',
    },
    indeterminate: {
      false: '',
      true: [
        'absolute inset-y-0 w-[40%] animate-indeterminate',
        'motion-reduce:animate-none motion-reduce:left-0 motion-reduce:w-full motion-reduce:opacity-50',
      ].join(' '),
    },
  },
  defaultVariants: { tone: 'accent', indeterminate: false },
});

export type ProgressBarVariants = VariantProps<typeof progressBar>;
