import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../atoms';

import { RowStatCard } from './RowStatCard';
import { RowStatCardMeter } from './RowStatCardMeter';

const meta = {
  title: 'Molecules/RowStatCard',
  component: RowStatCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RowStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The original-design "Monthly budget" BudgetBar (the original usage screen): title/subtitle
 * left, used/forecast ministats + action right, budget meter with
 * forecast tick below. Spec-driven divergences from the original design:
 * the forecast legend is CENTERED UNDER ITS TICK (the original version
 * centered it in the caption row — the spec calls it misaligned), and
 * the track uses surface-sunk instead of the original literal cream-300 so
 * dark mode stays coherent.
 */
export const Default: Story = {
  args: {
    title: 'Monthly budget',
    subtitle: '1.07M of 4M tokens used · $13.35 spent so far',
    stats: [
      { title: 'used', value: '27%' },
      { title: 'forecast', value: '3.9M', tone: 'muted' },
    ],
    action: (
      <Button variant="secondary" size="sm">
        Adjust
      </Button>
    ),
    footer: (
      <RowStatCardMeter
        value={0.27}
        marker={{ ratio: 0.45, label: 'forecast end-of-month' }}
        startLabel="May 1"
        endLabel="May 31"
        label="27% of monthly budget used"
      />
    ),
  },
};

/**
 * Spec: automatic accent for trending ministats — `trend` colors the
 * value (up → success, down → danger); explicit `tone` overrides.
 */
export const AutoAccentedStats: Story = {
  args: {
    title: 'This week',
    subtitle: '128 sessions across 9 agents',
    stats: [
      { title: 'done', value: 117, trend: 0.06 },
      { title: 'failed', value: 11, trend: -0.4 },
      { title: 'queued', value: 4 },
    ],
  },
};

/** Row 2 as contextual text/link instead of an indicator. */
export const TextFooter: Story = {
  args: {
    title: 'Token quota',
    subtitle: 'Workspace-wide, resets on the 1st',
    stats: [
      { title: 'remaining', value: '2.93M' },
      { title: 'burn rate', value: '96k/day', tone: 'warning' },
    ],
    footer: (
      <div className="text-xs text-fg3">
        Forecast exceeds quota around May 26 ·{' '}
        <a href="#usage" className="text-accent underline-offset-2 hover:underline">
          View usage
        </a>
      </div>
    ),
  },
};

/** Meter near the warning threshold (tone axis: accent → warning → danger). */
export const MeterWarning: Story = {
  args: {
    title: 'Monthly budget',
    subtitle: '3.4M of 4M tokens used · $41.20 spent so far',
    stats: [
      { title: 'used', value: '85%', tone: 'warning' },
      { title: 'forecast', value: '4.6M', tone: 'muted' },
    ],
    footer: (
      <RowStatCardMeter
        value={0.85}
        tone="warning"
        marker={{ ratio: 0.97, label: 'forecast end-of-month' }}
        startLabel="May 1"
        endLabel="May 31"
        label="85% of monthly budget used"
      />
    ),
  },
};

/** Row 1 only — no footer, no action. */
export const StatsOnly: Story = {
  args: {
    title: 'Agents',
    subtitle: '9 configured',
    stats: [
      { title: 'active', value: 6 },
      { title: 'errors', value: 1, tone: 'danger' },
      { title: 'idle', value: 2, tone: 'muted' },
    ],
  },
};
