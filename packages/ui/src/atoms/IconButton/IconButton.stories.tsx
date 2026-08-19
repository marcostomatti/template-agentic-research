import type { Meta, StoryObj } from '@storybook/react-vite';

import { StrokeIcon } from '../../lib/icons';

import { IconButton } from './IconButton';

/** 32px ghost square with one glyph — copy/download affordances. */
const meta = {
  title: 'Atoms/IconButton',
  component: IconButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { icon: <StrokeIcon name="copy" size={18} />, label: 'Copy secret' },
};

export const Active: Story = {
  args: { icon: <StrokeIcon name="download" size={18} />, label: 'Download', active: true },
};
