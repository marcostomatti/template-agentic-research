import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Known entities — contract-typed display templates for the domain
 * entities that recur across tables, cards and menus (spec:
 * "Known Entities"; rendered references: the
 * Sessions/Tasks table rows in the original Sessions/Tasks screens).
 *
 * Each `{entity}-{variant}` name ships as a component with a typed data
 * contract, and the registry in `src/organisms/Table/cellTypes.tsx` maps
 * the same names to renderers so a self-describing table can infer the
 * component from a column's `type` string.
 *
 * Entity accents ride the shared chart palette (`chartTone` paints
 * `currentColor`; tiles tint from it with a color-mix), so entity colors
 * stay theme-aware and consistent with the charts.
 */

/** agent-title / tool-title — avatar|icon left, double line right. */
export const entityTitle = cva('flex min-w-0 items-center gap-2.5');

export const entityTitleName = cva(
  'truncate text-[13.5px] font-semibold leading-tight text-fg1',
);

export const entityTitleSub = cva(
  'truncate font-mono text-[11px] leading-tight text-fg3',
);

/**
 * agent-cell tile — the 24px rounded glyph tile from the original Sessions
 * table (`color-mix(in oklab, agentColor 14%, transparent)` behind the
 * bot glyph, tinted from the entity accent via currentColor).
 */
export const entityTile = cva(
  [
    'flex shrink-0 items-center justify-center',
    'bg-[color-mix(in_oklab,currentColor_14%,transparent)]',
  ],
  {
    variants: {
      size: {
        sm: 'size-6 rounded-sm',
        md: 'size-8 rounded-md',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export const entityCell = cva('flex min-w-0 items-center gap-2'); // inline rows

export const entityCellStack = cva('flex min-w-0 flex-col gap-[3px]');

/** session-inline — status dot + semibold name. */
export const sessionInlineName = cva(
  'truncate text-sm font-semibold leading-tight text-fg1',
);

/** The greyed mono meta line (session-cell bottom, task-cell tags). */
export const entityMeta = cva(
  [
    'flex min-w-0 items-center gap-1.5',
    'font-mono text-[11px] leading-tight text-fg3',
  ],
);

/** model-cell — small accent decoration + mono model name. */
export const modelCellName = cva('truncate font-mono text-xs text-fg2');

/** model-footer — inherits the footer's color wholesale (no accent). */
export const modelFooter = cva(
  'inline-flex min-w-0 items-center gap-1.5 text-current',
);

export const modelFooterName = cva('truncate font-mono text-[11px]');

/** branch-inline — git-branch glyph + mono branch name. */
export const branchInline = cva(
  'inline-flex min-w-0 items-center gap-1 font-mono text-[11px] text-fg3',
);

/** user-inline — small avatar + mono handle. */
export const userInline = cva('inline-flex min-w-0 items-center gap-1.5');

export const userInlineHandle = cva('truncate font-mono text-xs text-fg2');

/** task-cell — title over inline text tags. */
export const taskCellTitle = cva(
  'truncate text-sm font-medium leading-tight text-fg1',
);

export type EntityTileVariants = VariantProps<typeof entityTile>;

/** The session lifecycle vocabulary shared by session-inline/-cell. */
export type SessionStatus = 'running' | 'waiting' | 'done' | 'failed' | 'idle';

export const SESSION_STATUS_TONE = {
  running: 'ok',
  waiting: 'warn',
  done: 'info',
  failed: 'err',
  idle: 'disabled',
} as const satisfies Record<SessionStatus, string>;
