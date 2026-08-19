import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Sortable — the controlled reorder wrapper.
 * The container's chrome flips when a CROSS-list drag hovers (dashed leaf
 * ring + leaf wash) — internal reorders keep the quiet sunk surface and get
 * the accent insertion line instead. Origin picks the feedback.
 */
export const sortableContainer = cva(
  [
    'flex min-h-[60px] rounded-lg border-[1.5px] p-2',
    'transition-[background-color,border-color]',
  ],
  {
    variants: {
      direction: {
        vertical: 'flex-col',
        horizontal: 'flex-row',
      },
      mode: {
        idle: 'border-solid border-border-soft bg-surface-sunk',
        internal: 'border-solid border-border-soft bg-surface-sunk',
        cross:
          'border-dashed border-leaf bg-[color-mix(in_oklab,var(--leaf)_7%,var(--surface-sunk))]',
      },
    },
    defaultVariants: { direction: 'vertical', mode: 'idle' },
  },
);

/** The accent insertion line shown at the hovered slot. */
export const sortableLine = cva(
  [
    'shrink-0 rounded-sm bg-accent',
    'shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_22%,transparent)]',
  ],
  {
    variants: {
      direction: {
        vertical: 'h-[3px] w-full',
        horizontal: 'w-[3px] self-stretch',
      },
    },
    defaultVariants: { direction: 'vertical' },
  },
);

/** A convenient default row chrome — grip handle + content + trailing. */
export const sortableRow = cva([
  'flex items-center gap-[11px] rounded-md px-3 py-2.5',
  'bg-surface-1 border border-border-soft shadow-xs',
]);

export type SortableContainerVariants = VariantProps<typeof sortableContainer>;
