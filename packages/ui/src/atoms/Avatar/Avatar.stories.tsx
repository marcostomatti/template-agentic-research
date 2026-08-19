import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar } from './Avatar';

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    shape: { control: 'select', options: ['circle', 'rounded'] },
    status: { control: 'select', options: ['none', 'online', 'busy', 'away'] },
  },
  args: { name: 'refactor-bot' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: md circle with the online presence dot. */
export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const RoundedShape: Story = {
  args: { shape: 'rounded' },
};

export const Busy: Story = {
  args: { status: 'busy' },
};

export const Away: Story = {
  args: { status: 'away' },
};

export const NoStatus: Story = {
  args: { status: 'none' },
};
