import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './Badge';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'danger', 'info', 'accent', 'leaf'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: success tone, md — the "running" state. */
export const Default: Story = {
  args: { children: 'running', dot: true },
};

export const Warning: Story = {
  args: { tone: 'warning', dot: true, children: 'waiting' },
};

export const Danger: Story = {
  args: { tone: 'danger', children: 'failed' },
};

export const Info: Story = {
  args: { tone: 'info', children: 'done' },
};

export const Neutral: Story = {
  args: { tone: 'neutral', children: 'idle' },
};

export const Accent: Story = {
  args: { tone: 'accent', children: 'agent' },
};

/** Portal marketing release pill — garden-green leaf tint. */
export const Leaf: Story = {
  args: { tone: 'leaf', children: 'v0.4.2 — fresh from the garden' },
};

export const SmallSize: Story = {
  args: { size: 'sm', children: 'running' },
};
