import type { Meta, StoryObj } from '@storybook/react-vite';

import { Progress } from './Progress';

const meta = {
  title: 'Molecules/Progress',
  component: Progress,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['accent', 'danger', 'leaf'] },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-[420px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Determinate, accent — the token-budget bar at 34%. */
export const Default: Story = {
  args: { value: 34, 'aria-label': 'Token budget' },
};

/** Past the caller's threshold — danger tone. */
export const DangerThreshold: Story = {
  args: { value: 92, tone: 'danger', 'aria-label': 'Token budget' },
};

/** Indeterminate — "agent thinking". */
export const Indeterminate: Story = {
  args: { indeterminate: true, 'aria-label': 'Working' },
};
