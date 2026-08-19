import type { Meta, StoryObj } from '@storybook/react-vite';

import { Segmented } from './Segmented';

const VIEWS = [
  { key: 'list', label: 'List' },
  { key: 'board', label: 'Board' },
  { key: 'timeline', label: 'Timeline' },
];

const meta = {
  title: 'Molecules/Segmented',
  component: Segmented,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md'] },
  },
  args: { items: VIEWS, index: 0 },
} satisfies Meta<typeof Segmented>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: md, first option active. */
export const Default: Story = {};

export const SmallSize: Story = {
  args: { size: 'sm', index: 1 },
};
