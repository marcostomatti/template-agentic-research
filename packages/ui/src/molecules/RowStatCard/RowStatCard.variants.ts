import { cva, type VariantProps } from 'class-variance-authority';

/**
 * RowStatCard — full-width single-row stat card. Design source: original design
 * `BudgetBar` + `BudgetReadout` in
 * the original Usage screen (inline styles, no CVA
 * source); contract: "RowStatCard".
 *
 * Spec deltas vs the original design (specs win):
 * - the forecast legend is re-aligned under its tick (see
 *   `RowStatCardMeter`) — the spec calls the original version misaligned;
 * - the meter track uses the theme's surface-sunk instead of the original
 *   literal cream-300 so dark mode stays coherent.
 */
export const rowStatCard = cva(
  'flex flex-col gap-3 rounded-lg border border-border-soft bg-surface-1 p-[18px]',
);

export const rowStatCardTitle = cva(
  'font-display text-base font-bold text-fg1',
);

export const rowStatCardSubtitle = cva('mt-0.5 text-[13px] text-fg3');

/** One "invisible column" ministat: label on top, value below. */
export const rowStatCardStatLabel = cva(
  'font-mono text-[10px] uppercase tracking-[0.1em] text-fg3',
);

export const rowStatCardStatValue = cva(
  'mt-0.5 font-mono text-base font-bold',
  {
    variants: {
      tone: {
        neutral: 'text-fg1',
        muted: 'text-fg3',
        success: 'text-success',
        danger: 'text-danger',
        warning: 'text-gold-500',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/* ── RowStatCardMeter (colocated indicator for row 2) ─────────────── */

export const rowStatCardMeterTrack = cva(
  'relative h-3 overflow-hidden rounded-md bg-surface-sunk',
);

/** Fill tone thresholds belong to the caller; the tone axis is the mechanism. */
export const rowStatCardMeterFill = cva('h-full', {
  variants: {
    tone: {
      accent: 'bg-accent',
      warning: 'bg-gold-500',
      danger: 'bg-danger',
    },
  },
  defaultVariants: { tone: 'accent' },
});

/** The marker tick — overhangs the track like the original forecast tick. */
export const rowStatCardMeterTick = cva(
  'absolute -bottom-0.5 -top-0.5 w-0.5 -translate-x-1/2 bg-fg2 opacity-45',
);

export const rowStatCardMeterLabels = cva(
  'relative flex justify-between font-mono text-[10px] text-fg3',
);

/** Marker legend, centered under its tick (the original design centered it in the row — misaligned; spec calls it out). */
export const rowStatCardMeterMarkerLabel = cva(
  'absolute -translate-x-1/2 whitespace-nowrap text-fg2',
);

export type RowStatCardStatValueVariants = VariantProps<
  typeof rowStatCardStatValue
>;
export type RowStatCardMeterFillVariants = VariantProps<
  typeof rowStatCardMeterFill
>;
