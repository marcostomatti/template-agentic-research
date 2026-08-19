import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CommandPalette — the synthesis chapter (the original command-palette demo). It
 * introduces NO new behavior: Overlay (portal/backdrop/Escape) + the Menu's
 * keyboard-navigable grouped list + the form kit's controlled search field.
 * ⌘K is just where the three meet.
 *
 * Reconciliation: the original demo runs its Overlay with trapFocus={false} to
 * dodge its hand-rolled trap; here Radix's modal mode traps and auto-focuses
 * the search input natively, so the default Overlay behavior stays on.
 */

/** The floating panel — top-anchored, not centered. */
export const palettePanel = cva([
  'flex max-h-[70vh] w-[min(560px,calc(100vw-40px))] flex-col self-start',
  'mt-[11vh] overflow-hidden rounded-xl bg-surface-1',
  'border border-border-soft shadow-lg',
]);

/** A result row; active carries the sunk fill + primary inset bar. */
export const paletteItem = cva(
  [
    'flex w-full cursor-pointer items-center gap-[11px] rounded-md',
    'border-none px-[11px] py-[9px] text-left',
  ],
  {
    variants: {
      active: {
        false: 'bg-transparent shadow-none',
        true: 'bg-surface-sunk shadow-[inset_2px_0_0_var(--primary)]',
      },
    },
    defaultVariants: { active: false },
  },
);

/** The row's leading icon puck. */
export const paletteItemIcon = cva(
  'inline-flex size-[30px] shrink-0 items-center justify-center rounded-sm',
  {
    variants: {
      active: {
        false: 'bg-surface-sunk text-fg2',
        true: 'bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface-1))] text-primary',
      },
    },
    defaultVariants: { active: false },
  },
);

/** The mono kbd chip (esc hint, shortcut hints, footer keys). */
export const paletteKbd = cva(
  'rounded-md border border-border-soft font-mono text-fg3',
  {
    variants: {
      size: {
        sm: 'px-1.5 py-0.5 text-[11px]',
        md: 'px-[7px] py-[3px] text-[11px]',
      },
      surface: {
        sunk: 'bg-surface-sunk',
        raised: 'bg-surface-1 text-fg2',
      },
    },
    defaultVariants: { size: 'md', surface: 'sunk' },
  },
);

export type PaletteItemVariants = VariantProps<typeof paletteItem>;
