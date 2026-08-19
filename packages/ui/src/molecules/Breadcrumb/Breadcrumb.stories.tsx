import type { Meta, StoryObj } from '@storybook/react-vite';

import { Breadcrumb } from './Breadcrumb';

const PATH = [
  { key: 'ws', label: 'ripe-tomatoes' },
  { key: 'ag', label: 'Agents' },
  { key: 'bot', label: 'refactor-bot' },
  { key: 's', label: 'Session #4128' },
];

const meta = {
  title: 'Molecules/Breadcrumb',
  component: Breadcrumb,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { items: PATH, index: 3 },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Current = last segment — the usual "where am I" shape. */
export const Default: Story = {};

/** Mid-path current: later segments render as upcoming. */
export const MidPath: Story = {
  args: { index: 1 },
};
