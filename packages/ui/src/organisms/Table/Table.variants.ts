import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Table — the fixed-track data template from the original table demo.
 *
 * Structure IS the spec: header and footer live in their OWN tables outside
 * the scroll element so only the body scrolls; a fixed 10px gutter (= the
 * body's always-shown scrollbar) keeps the three colgroups aligned; every
 * table is table-fixed so <col> widths are honored and td ellipsis works.
 *
 * Reconciliations vs the original demo:
 * - props follow the chapter's usage block (`data` + `getRowId`), not the
 *   demo's internal `rows`/`row.id`;
 * - `stickyHeader` is omitted — the demo destructures it but never reads it
 *   (the header is structurally outside the scroll region, always pinned);
 * - the demo hard-codes the totals footer ("N sessions" / token sum); the
 *   library generalizes it to a per-column `footer(data)` renderer;
 * - `initialSort` mirrors the demo's seeded `{key:'updated', dir:'asc'}`.
 */

export const tableFrame = cva('overflow-hidden', {
  variants: {
    frame: {
      true: 'rounded-lg border border-border-soft bg-surface-1 shadow-xs',
      false: 'rounded-none border-none bg-transparent shadow-none',
    },
  },
  defaultVariants: { frame: true },
});

/** Header/footer band — its own table, gutter-reserved to match the body. */
export const tableBand = cva('overflow-hidden bg-surface-2', {
  variants: {
    edge: {
      header: 'border-b border-border-strong',
      footer: 'border-t border-border-strong',
    },
    gutter: {
      true: 'pr-[10px]',
      false: 'pr-0',
    },
  },
  defaultVariants: { gutter: false },
});

/** The body wrap — the ONLY scrolling element (scrollbar always shown). */
export const tableScroll = cva('', {
  variants: {
    layout: {
      fit: 'overflow-visible',
      scroll: [
        'overflow-y-scroll overflow-x-hidden',
        '[&::-webkit-scrollbar]:w-[10px]',
        '[&::-webkit-scrollbar-thumb]:rounded-full',
        '[&::-webkit-scrollbar-thumb]:bg-border-strong',
        '[&::-webkit-scrollbar-thumb]:border-2',
        '[&::-webkit-scrollbar-thumb]:border-solid',
        '[&::-webkit-scrollbar-thumb]:border-surface-1',
        '[&::-webkit-scrollbar-track]:bg-transparent',
      ],
    },
  },
  defaultVariants: { layout: 'fit' },
});

/** Every internal table: fixed tracks, collapsed spacing, full width. */
export const tableEl = cva('w-full table-fixed border-separate border-spacing-0');

export const tableHead = cva(
  [
    'whitespace-nowrap text-left font-mono text-[11px] font-semibold',
    'uppercase tracking-[0.06em]',
  ],
  {
    variants: {
      density: {
        comfortable: 'px-4 py-[11px]',
        compact: 'px-3.5 py-2',
      },
      active: {
        true: 'bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-2))] text-accent',
        false: 'bg-surface-2 text-fg3',
      },
      sortable: {
        true: 'group/head cursor-pointer select-none',
        false: '',
      },
    },
    defaultVariants: { density: 'comfortable', active: false, sortable: false },
  },
);

export const tableCell = cva(
  [
    'max-w-0 border-b border-border-soft text-[13.5px] text-fg1',
    'transition-[background-color]',
    'group-last/row:border-b-0',
    'group-hover/row:bg-[color-mix(in_oklab,var(--surface-sunk)_55%,transparent)]',
  ],
  {
    variants: {
      density: {
        comfortable: 'px-4 py-[13px]',
        compact: 'px-3.5 py-2',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);

/** Footer cells — mono summary line on the surface-2 band. */
export const tableFoot = cva(
  'whitespace-nowrap bg-surface-2 font-mono text-xs text-fg2',
  {
    variants: {
      density: {
        comfortable: 'px-4 py-[11px]',
        compact: 'px-3.5 py-2',
      },
      align: {
        start: 'text-left',
        center: 'text-center',
        end: 'text-right',
      },
    },
    defaultVariants: { density: 'comfortable', align: 'start' },
  },
);

/**
 * Body row — the modifier axes from "TableRow
 * modifiers": odd/even striping (`striped` prop on Table), plus the
 * reorder feedback states (drop-target insert line drawn as an inset
 * shadow so nothing shifts; the dragged row dims like Sortable does).
 */
export const tableRowEl = cva('group/row', {
  variants: {
    striped: {
      false: '',
      true: 'even:bg-[color-mix(in_oklab,var(--surface-sunk)_45%,transparent)]',
    },
    drop: {
      none: '',
      above: '[&>td]:shadow-[inset_0_2px_0_0_var(--accent)]',
      below: '[&>td]:shadow-[inset_0_-2px_0_0_var(--accent)]',
    },
    dragging: {
      false: '',
      true: 'opacity-40',
    },
  },
  defaultVariants: { striped: false, drop: 'none', dragging: false },
});

/**
 * Modifier columns (checkbox / sort handle) — narrow leading tracks with
 * their own padding so the 19px controls sit flush; the row hover wash
 * matches tableCell.
 */
export const tableModCell = cva(
  [
    'border-b border-border-soft align-middle',
    'transition-[background-color]',
    'group-last/row:border-b-0',
    'group-hover/row:bg-[color-mix(in_oklab,var(--surface-sunk)_55%,transparent)]',
  ],
  {
    variants: {
      density: {
        comfortable: 'py-[13px] pl-3.5 pr-0',
        compact: 'py-2 pl-3 pr-0',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);

export const tableModHead = cva('bg-surface-2 align-middle', {
  variants: {
    density: {
      comfortable: 'py-[11px] pl-3.5 pr-0',
      compact: 'py-2 pl-3 pr-0',
    },
  },
  defaultVariants: { density: 'comfortable' },
});

/** The grab affordance for row reordering (grip-vertical glyph). */
export const tableSortHandle = cva(
  [
    'inline-flex items-center justify-center rounded-sm p-0.5 text-fg3',
    'cursor-grab select-none hover:text-fg2 active:cursor-grabbing',
  ],
  {
    variants: {
      disabled: {
        false: '',
        true: 'cursor-not-allowed opacity-40 hover:text-fg3',
      },
    },
    defaultVariants: { disabled: false },
  },
);

/** The clipped-cell tooltip (fixed-position; coordinates are dynamic). */
export const tableTip = cva([
  'fixed z-[100] max-w-[360px] -translate-x-1/2 -translate-y-full',
  'pointer-events-none rounded-md border border-char-300 bg-char-700',
  'px-[11px] py-2 text-[12.5px] leading-[1.45] text-cream-50 shadow-lg',
]);

export type TableFrameVariants = VariantProps<typeof tableFrame>;
export type TableRowVariants = VariantProps<typeof tableRowEl>;
export type TableRowDrop = NonNullable<TableRowVariants['drop']>;
export type TableDensity = NonNullable<
  VariantProps<typeof tableHead>['density']
>;
export type TableLayout = NonNullable<
  VariantProps<typeof tableScroll>['layout']
>;
