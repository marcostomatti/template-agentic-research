import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CalendarHeatmap — activity intensity grid. Design source: original design
 * `ActivityHeatmap` (7×24 week grid) in
 * the original Usage screen; contract:
 * "Calendar heatmap" (adds the last-90/180-days
 * modes, Monday week start, tooltip + drill-down click).
 */
export const calendarHeatmapLabel = cva(
  'font-mono text-[10px] leading-none text-fg3',
);

export const calendarHeatmapHourLabel = cva(
  'text-center font-mono text-[9px] leading-none text-fg3',
  {
    variants: {
      hidden: {
        false: 'visible',
        true: 'invisible',
      },
    },
    defaultVariants: { hidden: false },
  },
);

/**
 * One cell. Intensity is a continuous color-mix of the accent into
 * transparent (original formula: `accent × round(v·90)%`) — genuinely dynamic,
 * so it rides the style attr; the quiet floor (<5%) uses surface-sunk.
 */
export const calendarHeatmapCell = cva(
  'aspect-square w-full rounded-sm border border-border-soft',
  {
    variants: {
      quiet: {
        false: '',
        true: 'bg-surface-sunk',
      },
      /** Rendered as a button when the drill-down callback is present. */
      clickable: {
        false: '',
        true: 'cursor-pointer transition-transform hover:scale-125 focus-visible:outline-1 focus-visible:outline-border-focus',
      },
      /** Pads the grid outside the range (90/180-day mode edges). */
      ghost: {
        false: '',
        true: 'invisible',
      },
    },
    defaultVariants: { quiet: false, clickable: false, ghost: false },
  },
);

export const calendarHeatmapLegendSwatch = cva(
  'size-3 rounded-sm border border-border-soft',
);

export type CalendarHeatmapCellVariants = VariantProps<
  typeof calendarHeatmapCell
>;
