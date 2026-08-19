import type { Meta, StoryObj } from '@storybook/react-vite';

import { ShellFiller } from '../../stories/fixtures';

import { Shell } from './Shell';

const meta = {
  title: 'Atoms/Shell',
  component: Shell,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    tone: { control: 'select', options: ['bg', 'surface', 'sunk'] },
    rounded: { control: 'select', options: ['none', 'lg', 'xl'] },
  },
  args: { children: <ShellFiller /> },
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: page-level wrapper — bg tone, lg padding, square, borderless. */
export const Default: Story = {};

export const PaddingNone: Story = {
  args: { padding: 'none' },
};

export const PaddingSm: Story = {
  args: { padding: 'sm' },
};

export const PaddingMd: Story = {
  args: { padding: 'md' },
};

export const SurfaceTone: Story = {
  args: { tone: 'surface' },
};

export const SunkTone: Story = {
  args: { tone: 'sunk' },
};

export const Bordered: Story = {
  args: { bordered: true, rounded: 'lg', tone: 'surface' },
};

export const RoundedXl: Story = {
  args: { rounded: 'xl', tone: 'sunk' },
};
