import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Toolbar — the controlled filter+search compound over the Table
 * (the original toolbar demo). It owns the QUERY (search text + active filters +
 * density), never the data: displayed rows are parent-derived, the Table
 * stays a pure function of them.
 *
 * One owner per frame: in the DS-default DETACHED presentation the toolbar
 * surface and the Table each own their frame; ATTACHED hands the frame to
 * this surface and the Table renders frame={false}. `ToolbarSummary
 * divided` carries the original demo's attached-mode divider (a table follows
 * inside the same surface).
 */
export const toolbarSurface = cva([
  'overflow-hidden rounded-lg bg-surface-1',
  'border border-border-soft shadow-xs',
]);

/** Row 1 — search + filter dropdowns + view controls, on the sunk band. */
export const toolbarControls = cva([
  'flex flex-wrap items-center gap-2.5 px-4 py-[13px]',
  'border-b border-border-soft bg-surface-sunk',
]);

/** Row 2 — result count, active-filter chips, clear-all. */
export const toolbarSummary = cva(
  'flex flex-wrap items-center gap-2 px-4 py-[11px]',
  {
    variants: {
      divided: {
        false: 'border-b-0',
        true: 'border-b border-border-soft',
      },
    },
    defaultVariants: { divided: false },
  },
);

/** The filter trigger — accent-tinted while any value is selected. */
export const filterTrigger = cva(
  [
    'inline-flex h-[38px] items-center gap-2 px-3 rounded-md border',
    'text-[13.5px] font-semibold cursor-pointer',
  ],
  {
    variants: {
      active: {
        false: 'bg-surface-1 text-fg1 border-border-strong [&_svg]:text-fg3',
        true: [
          'bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-1))]',
          'text-accent border-[color-mix(in_oklab,var(--accent)_40%,transparent)]',
          '[&_svg]:text-accent',
        ],
      },
    },
    defaultVariants: { active: false },
  },
);

/** The search field control (the original toolbar demo SearchInput). */
export const searchInput = cva(
  [
    'h-[38px] w-full rounded-md bg-surface-1 border border-border-strong',
    'font-body text-sm text-fg1 placeholder:text-fg3',
    'outline-none focus-visible:border-border-focus',
    'focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_color-mix(in_oklab,var(--leaf)_55%,transparent)]',
  ],
  {
    variants: {
      clearable: {
        false: 'pl-9 pr-3',
        true: 'px-9',
      },
    },
    defaultVariants: { clearable: false },
  },
);

export type ToolbarSummaryVariants = VariantProps<typeof toolbarSummary>;
export type FilterTriggerVariants = VariantProps<typeof filterTrigger>;
