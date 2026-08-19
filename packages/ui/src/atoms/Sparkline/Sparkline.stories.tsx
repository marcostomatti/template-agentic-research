import type { Meta, StoryObj } from '@storybook/react-vite';

import { Sparkline } from './Sparkline';

/** Fixed 30-point series mirroring the original MetricTile's weekly rhythm. */
const TOKENS_30D = [
  22, 26, 30, 12, 10, 28, 34, 38, 31, 14,
  11, 33, 39, 41, 36, 15, 13, 38, 44, 40,
  37, 16, 14, 42, 47, 45, 41, 18, 46, 52,
];

const COST_30D = TOKENS_30D.map((v, i) => v * 0.8 + (i % 5));

const meta = {
  title: 'Atoms/Sparkline',
  component: Sparkline,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: [
        'accent',
        'primary',
        'gold',
        'info',
        'success',
        'danger',
        'neutral',
        'muted',
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Original-design MetricTile treatment: accent line over a faint area fill.
 * Fidelity source: the original MetricTile screen Sparkline (the original usage screen hero
 * tiles).
 */
export const Default: Story = {
  args: { data: TOKENS_30D },
};

/** Line only — `fill={false}` for dense contexts (table cells). */
export const LineOnly: Story = {
  args: { data: TOKENS_30D, fill: false },
};

/** Table-cell scale (`size="sm"`), muted tone. */
export const CellSize: Story = {
  args: { data: COST_30D, size: 'sm', tone: 'muted' },
};

/** Series colors ride the shared chart palette (`tone`). */
export const Tones: Story = {
  args: { data: TOKENS_30D },
  render: (args) => (
    <div className="flex w-56 flex-col gap-2">
      <Sparkline {...args} tone="accent" />
      <Sparkline {...args} tone="primary" />
      <Sparkline {...args} tone="gold" />
      <Sparkline {...args} tone="danger" />
    </div>
  ),
};

/**
 * Degenerate input: fewer than 2 points renders nothing (a sparkline
 * shows shape, and one point has none).
 */
export const TooFewPoints: Story = {
  args: { data: [42] },
  render: (args) => (
    <div className="flex w-56 items-center justify-center border border-dashed border-border-soft p-2 text-[11px] text-fg3">
      <Sparkline {...args} />
      renders nothing
    </div>
  ),
};
