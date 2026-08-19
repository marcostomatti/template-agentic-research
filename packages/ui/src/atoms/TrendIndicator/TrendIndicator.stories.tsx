import type { Meta, StoryObj } from '@storybook/react-vite';

import { TrendIndicator } from './TrendIndicator';

const meta = {
  title: 'Atoms/TrendIndicator',
  component: TrendIndicator,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    trend: { control: { type: 'number', step: 0.05 } },
    showValue: { control: 'boolean' },
    showZero: { control: 'boolean' },
  },
} satisfies Meta<typeof TrendIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spec: `trend={0.1} showValue` — accent green, arrow up, `+10%`. */
export const Default: Story = {
  args: { trend: 0.1, showValue: true, locale: 'en-US' },
};

/** Spec: `trend={-0.3}` — accent red, arrow down (value optional). */
export const Down: Story = {
  args: { trend: -0.3, showValue: true, locale: 'en-US' },
};

/** Spec: arrow-only when `showValue` is off. */
export const ArrowOnly: Story = {
  args: { trend: 0.25 },
};

/**
 * Spec: `trend={0}` — gray horizontal dash. Shown by default (`showZero`);
 * pass `showZero={false}` to render nothing on flat trends instead.
 */
export const Flat: Story = {
  args: { trend: 0 },
};

/** Fraction digits via `precision`. */
export const Precise: Story = {
  args: { trend: 0.153, showValue: true, precision: 1, locale: 'en-US' },
};

/** The stat-card header pattern: label left, trend right. */
export const InStatHeader: Story = {
  args: { trend: -0.08, showValue: true, locale: 'en-US' },
  render: (args) => (
    <div className="flex w-56 items-center justify-between rounded-lg border border-border-soft bg-surface-1 px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg3">
        errors
      </span>
      <TrendIndicator {...args} />
    </div>
  ),
};
