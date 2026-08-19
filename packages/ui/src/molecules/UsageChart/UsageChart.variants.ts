import { cva, type VariantProps } from 'class-variance-authority';

/**
 * UsageChart / ProgressChart — table-like bar chart (no visible borders
 * or row indicators). Design sources: original design `ToolBars` (simple mode) and
 * `AgentRanking` (multi mode) in
 * the original Usage screen; contract:
 * "UsageChart / ProgressChart".
 *
 * Spec delta vs the original design (specs win): the original ToolBars always draw
 * a surface-sunk track behind the bar; per spec only the PROGRESS
 * variant shows the gray background — the usage variant's bar floats.
 */
export const usageChartRowName = cva('truncate font-mono text-xs text-fg1');

export const usageChartRowValue = cva(
  'text-right font-mono text-xs text-fg2',
  {
    variants: {
      emphasis: {
        false: '',
        true: 'font-bold text-fg1',
      },
      /** Overflowing progress (>100%) accents its value. */
      over: {
        false: '',
        true: 'font-bold text-danger',
      },
    },
    defaultVariants: { emphasis: false, over: false },
  },
);

/** Multi-mode condensed name line: name left, small meta right. */
export const usageChartRowTitle = cva(
  'truncate text-[13px] font-semibold text-fg1',
);

export const usageChartRowMeta = cva('font-mono text-[11px] text-fg3');

/* ── UsageBar (colocated bar indicator, reused by 03c cell content) ── */

export const usageBarTrack = cva('relative w-full overflow-hidden', {
  variants: {
    size: {
      /** Original ToolBars stroke (simple rows). */
      md: 'h-2.5 rounded-[5px]',
      /** Original AgentRanking stroke (multi rows, mini cells). */
      sm: 'h-[5px] rounded-[3px]',
    },
    /** Gray background — the progress variant's required track. */
    track: {
      false: 'bg-transparent',
      true: 'bg-surface-sunk',
    },
  },
  defaultVariants: { size: 'md', track: false },
});

export const usageBarFill = cva(
  'absolute inset-y-0 left-0 rounded-[inherit] bg-current',
);

/**
 * Overflow treatment (>100% progress — not in the original design, spec
 * asks for one): the track re-scales so the whole bar represents the
 * VALUE; the solid danger fill runs up to the goal tick, the overflow
 * region past the tick renders the same danger at reduced opacity, and
 * a contrast tick marks where 100% sits.
 */
export const usageBarOverflowFill = cva(
  'absolute inset-y-0 right-0 rounded-r-[inherit] bg-current opacity-40',
);

export const usageBarGoalTick = cva(
  'absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface-1',
);

/** Single-line variant: one segmented bar. */
export const usageChartSegmentBar = cva(
  'flex h-2.5 w-full overflow-hidden rounded-[5px]',
);

export const usageChartSegment = cva('h-full bg-current');

/** Single-line legend rows: `[color] {text} {value}`. */
export const usageChartLegendSwatch = cva(
  'size-2.5 shrink-0 rounded-[3px] bg-current',
);

export type UsageChartRowValueVariants = VariantProps<
  typeof usageChartRowValue
>;
export type UsageBarTrackVariants = VariantProps<typeof usageBarTrack>;
