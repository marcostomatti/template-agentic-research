import type { Meta, StoryObj } from '@storybook/react-vite';

import { LineChart, type LineChartSeries } from './LineChart';

/**
 * Deterministic 30-day seed mirroring the original DAILY_USAGE generator
 * (weekend damping + upward ramp + arithmetic noise; reference date
 * 2026-05-27, no Math.random).
 */
const DAYS = 30;
const LABELS: string[] = [];
const SONNET: number[] = [];
const OPUS: number[] = [];
const HAIKU: number[] = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(2026, 4, 27 - i);
  const day = d.getDay();
  const weekendDamp = day === 0 || day === 6
    ? 0.35
    : 1;
  const ramp = 0.6 + 0.4 * (1 - i / 30);
  const noise = 0.85 + ((i * 137) % 30) / 100;
  const base = 38_000 * weekendDamp * ramp * noise;
  LABELS.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  SONNET.push(Math.round(base * 0.62));
  OPUS.push(Math.round(base * 0.22));
  HAIKU.push(Math.round(base * 0.16));
}

const MODEL_SERIES: LineChartSeries[] = [
  { id: 'sonnet', label: 'sonnet', tone: 'accent', data: SONNET },
  { id: 'opus', label: 'opus', tone: 'primary', data: OPUS },
  { id: 'haiku', label: 'haiku', tone: 'gold', data: HAIKU },
];

const meta = {
  title: 'Molecules/LineChart',
  component: LineChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Overview "Tokens by model" chart (the original usage screen): stacked cumulative
 * areas, dashed y-grid with compact ticks, sparse x labels, auto legend
 * with per-series totals in the header. Hand-rolled SVG per the D1
 * decision (D1-DECISION.md).
 */
export const Default: Story = {
  args: {
    title: 'Tokens by model',
    subtitle: 'Daily totals · 30 days',
    series: MODEL_SERIES,
    labels: LABELS,
    locale: 'en-US',
  },
};

/** Independent lines on a shared y scale (`variant="line"`). */
export const Lines: Story = {
  args: {
    title: 'Tokens by model',
    subtitle: 'Daily totals · 30 days',
    variant: 'line',
    series: MODEL_SERIES,
    labels: LABELS,
    locale: 'en-US',
  },
};

/** Single series — the degenerate multi-series case stays legible. */
export const SingleSeries: Story = {
  args: {
    title: 'Sessions',
    subtitle: 'Daily · 30 days',
    series: [
      {
        id: 'sessions',
        label: 'sessions',
        tone: 'info',
        data: SONNET.map((v) => Math.round(v / 14_000)),
      },
    ],
    labels: LABELS,
    locale: 'en-US',
  },
};

/**
 * Legend off + hover affordance off — bare chart for dense dashboards;
 * `hover` (default on) draws a vertical guide, series dots and a
 * per-series readout at the pointer index.
 */
export const Bare: Story = {
  args: {
    series: MODEL_SERIES,
    labels: LABELS,
    showLegend: false,
    hover: false,
    locale: 'en-US',
  },
};

/** Short window (7 points) — every x label renders. */
export const Weekly: Story = {
  args: {
    title: 'Tokens by model',
    subtitle: 'Daily totals · 7 days',
    series: MODEL_SERIES.map((s) => ({ ...s, data: s.data.slice(-7) })),
    labels: LABELS.slice(-7),
    locale: 'en-US',
  },
};
