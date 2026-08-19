import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../Button';

import { EmptyState } from './EmptyState';

const meta = {
  title: 'Atoms/EmptyState',
  component: EmptyState,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    align: { control: 'select', options: ['center', 'start'] },
  },
  args: {
    title: 'No agents running',
    description: 'Drop a roadmap item in and we\'ll seed an agent session for it.',
  },
  decorators: [
    (Story) => (
      <div className="w-[280px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: md, centered, no action. */
export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: <Button size="sm">New agent</Button>,
  },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const AlignStart: Story = {
  args: { align: 'start' },
};
