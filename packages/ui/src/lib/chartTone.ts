import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Shared chart color vocabulary — the fixed series palette the original design uses
 * across the Usage dashboard (MODEL_COLORS / TOOL_COLORS / AGENT_USAGE in
 * the original Usage screen), expressed as theme-aware
 * text-color utilities. Chart marks paint with `currentColor` (SVG
 * stroke/fill, or `bg-current` on divs), so a single axis colors every
 * chart component the same way and follows light/dark automatically.
 *
 * `neutral`/`muted` map to fg2/fg3 (char-200 / warm-500 in light) rather
 * than the original literals so dark mode stays legible.
 */
export const chartTone = cva('', {
  variants: {
    tone: {
      accent: 'text-accent',
      primary: 'text-primary',
      gold: 'text-gold-500',
      info: 'text-info',
      success: 'text-success',
      danger: 'text-danger',
      neutral: 'text-fg2',
      muted: 'text-fg3',
    },
  },
  defaultVariants: { tone: 'accent' },
});

export type ChartToneVariants = VariantProps<typeof chartTone>;
export type ChartTone = NonNullable<ChartToneVariants['tone']>;
