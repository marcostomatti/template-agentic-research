import type { Meta, StoryObj } from '@storybook/react-vite';

import { CalendarHeatmap, type CalendarHeatmapDatum } from './CalendarHeatmap';

/** Fixed reference "now" — 2026-05-27 (a Wednesday), like the original seed. */
const END = '2026-05-27T12:00:00';

/**
 * Deterministic 7×24 week seed mirroring the original HEATMAP generator
 * (working-hours skew + arithmetic noise, no Math.random).
 */
const WEEK_DATA: CalendarHeatmapDatum[] = (() => {
  const out: CalendarHeatmapDatum[] = [];
  // Monday of the week containing END.
  const monday = new Date(2026, 4, 25);
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let intensity = 0.04;
      if (hour >= 9 && hour <= 18 && day <= 4) {
        intensity = 0.55 + 0.45 * Math.sin(((hour - 9) / 9) * Math.PI);
      } else if (hour >= 7 && hour <= 22 && day !== 6) {
        intensity = 0.18;
      }
      intensity += (((hour * 13 + day * 7) % 5) - 2) * 0.04;
      const value = Math.round(Math.max(0, Math.min(1, intensity)) * 120);
      out.push({ date: new Date(2026, 4, 25 + day), hour, value });
    }
  }
  return out;
})();

/** Deterministic daily totals for the 90/180-day modes. */
const daysData = (days: number): CalendarHeatmapDatum[] => Array.from({ length: days }, (_, i) => {
  const date = new Date(2026, 4, 27 - (days - 1) + i);
  const weekday = date.getDay();
  const weekend = weekday === 0 || weekday === 6;
  const base = weekend
    ? 8
    : 60;
  return { date, value: Math.max(0, base + (((i * 37) % 23) - 11) * 4) };
});

const meta = {
  title: 'Molecules/CalendarHeatmap',
  component: CalendarHeatmap,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CalendarHeatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Week mode — the original "When agents run" section (the original usage screen): 7 day rows
 * × 24 hour columns, hour labels every 4h, Monday week start, quiet→busy
 * legend. Intensity is the original color-mix formula (accent × value/max).
 */
export const Week: Story = {
  args: {
    title: 'When agents run',
    subtitle: 'Local time · this week',
    range: 'week',
    data: WEEK_DATA,
    end: END,
    unit: 'runs',
    locale: 'en-US',
  },
};

/**
 * Last 90 days — spec addition (no design artboard). Interpretation
 * decision: the spec's "90 columns" cannot coexist with its own 7
 * weekday rows + bottom-right-is-last-day rule, so the grid renders
 * GitHub-style: 7 weekday rows × 13 week columns, out-of-range corners
 * invisible.
 */
export const Last90Days: Story = {
  args: {
    title: 'Activity',
    subtitle: 'Last 90 days',
    range: '90d',
    data: daysData(90),
    end: END,
    unit: 'runs',
    locale: 'en-US',
  },
};

/** Last 180 days — 26 week columns. */
export const Last180Days: Story = {
  args: {
    title: 'Activity',
    subtitle: 'Last 180 days',
    range: '180d',
    data: daysData(180),
    end: END,
    unit: 'runs',
    locale: 'en-US',
  },
};

/**
 * Spec: week start is a prop (settings-driven later; default monday).
 * Sunday start shifts the rows, labels follow the locale.
 */
export const SundayStart: Story = {
  args: {
    title: 'When agents run',
    subtitle: 'Local time · week starts Sunday',
    range: 'week',
    weekStart: 'sunday',
    data: WEEK_DATA,
    end: END,
    unit: 'runs',
    locale: 'en-US',
  },
};

/**
 * Spec: optional drill-down click — cells become buttons (hover scale +
 * focus ring); the callback receives `{ date, hour?, value }`.
 */
export const Clickable: Story = {
  args: {
    title: 'When agents run',
    subtitle: 'Click a cell to drill into the hour',
    range: 'week',
    data: WEEK_DATA,
    end: END,
    unit: 'runs',
    locale: 'en-US',
    onCellClick: () => {},
  },
};

/** Legend off, tooltips disabled (`formatTooltip={null}`). */
export const Bare: Story = {
  args: {
    range: 'week',
    data: WEEK_DATA,
    end: END,
    showLegend: false,
    formatTooltip: null,
    locale: 'en-US',
  },
};
