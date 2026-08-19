import { cva, type VariantProps } from 'class-variance-authority';

import { type ChartTone } from '../../lib';

/**
 * CellContent kit — standardized cell formats for tables and table-like
 * layouts (spec-driven, "Table enhancements →
 * CellContent"; rendered references: the Sessions/Tasks table rows in
 * the original Sessions/Tasks screens).
 *
 * Contract-typed and table-agnostic: every piece renders identically inside
 * a Table column `cell`, a UsageChart free column, or any card layout —
 * nothing here knows about <td> or the Table organism.
 *
 * TOOLTIP OWNERSHIP (spec question, decided): tooltips belong to the PARENT
 * cell, not to the content components. The Table's TableCell already probes
 * for genuine clipping (scrollWidth/scrollHeight) and surfaces a tooltip
 * only when text is actually cut; per-content tooltips would double-fire
 * next to it and drift out of sync outside tables. Content components stay
 * tooltip-free — the one exception is semantics intrinsic to a VALUE (the
 * absolute-date `title` FormattedRelativeTime always carries), which rides
 * along from the atom unchanged.
 */

/** Value / value-with-unit — numeric cells right-align by default. */
export const cellValue = cva('flex min-w-0 items-baseline', {
  variants: {
    align: {
      start: 'justify-start text-left',
      end: 'justify-end text-right',
    },
  },
  defaultVariants: { align: 'end' },
});

/**
 * Decoration — the avatar/icon/badge slot. FIRST-COLUMN RULE (spec): a
 * decoration is optional, but when a row has one it must be the row's
 * FIRST column so decorations gutter-align down the table.
 */
export const cellDecoration = cva('flex shrink-0 items-center justify-center');

export const cellDoubleLine = cva('flex min-w-0 flex-col gap-[3px]');

/** DoubleLine top: short + accentuated. */
export const cellDoubleLineTitle = cva(
  'truncate text-[13.5px] font-semibold leading-tight text-fg1',
);

/** DoubleLine bottom: longer, greyed, truncating. */
export const cellDoubleLineSubtitle = cva(
  'truncate font-mono text-[11px] leading-tight text-fg3',
);

/** Status — indicator + optional text. */
export const cellStatus = cva('inline-flex items-center gap-2', {
  variants: {
    tone: {
      ok: 'text-success',
      warn: 'text-gold-500',
      err: 'text-danger',
      info: 'text-info',
      disabled: 'text-fg3',
    },
  },
  defaultVariants: { tone: 'ok' },
});

export const cellStatusText = cva('text-[12.5px] font-medium text-fg2');

/**
 * Label — accent-colored label-format text (the Overview "Top 5" rank
 * labels: subtle or transparent background, simple accent color). Paints
 * from `currentColor`, so the tone axis comes from `chartTone`.
 */
export const cellLabel = cva(
  [
    'inline-flex items-center rounded-sm px-1.5 py-0.5',
    'font-mono text-[11px] font-semibold uppercase tracking-[0.06em]',
  ],
  {
    variants: {
      /** transparent (bare accent text) or a subtle currentColor tint. */
      bg: {
        none: 'bg-transparent',
        soft: 'bg-[color-mix(in_oklab,currentColor_12%,transparent)]',
      },
    },
    defaultVariants: { bg: 'none' },
  },
);

export const cellLabelGroup = cva('inline-flex flex-wrap items-center gap-1.5');

/** tokens-consumption — bold full number used, greyed quota. */
export const tokensConsumption = cva(
  'whitespace-nowrap font-mono text-xs font-semibold text-fg1',
);

export const tokensConsumptionQuota = cva('font-normal text-fg3');

export const tokensProgress = cva('flex min-w-0 flex-col gap-1');

/** spend-over-time — currency over a greyed duration · relative-time line. */
export const spendOverTime = cva('flex min-w-0 flex-col gap-[3px]');

export const spendOverTimeMeta = cva(
  'truncate font-mono text-[11px] leading-tight text-fg3',
);

/**
 * Consumption thresholds (spec: "Low numbers is green, close to 50% is
 * yellow, close to 100% is red"). The bands are a spec interpretation —
 * the exact cutoffs weren't given: green below 45%, yellow from 45%, red
 * from 85% (and for any overflow past the quota).
 */
export const TOKENS_WARN_RATIO = 0.45;
export const TOKENS_DANGER_RATIO = 0.85;

export const tokensProgressTone = (ratio: number): ChartTone => {
  if (ratio >= TOKENS_DANGER_RATIO) return 'danger';
  if (ratio >= TOKENS_WARN_RATIO) return 'gold';
  return 'success';
};

export type CellValueVariants = VariantProps<typeof cellValue>;
export type CellStatusVariants = VariantProps<typeof cellStatus>;
export type CellLabelVariants = VariantProps<typeof cellLabel>;
export type CellStatusTone = NonNullable<CellStatusVariants['tone']>;
