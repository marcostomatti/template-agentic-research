import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorkspaceMark } from './WorkspaceMark';

/** Workspace identity block — initials on a brand fill, squarer than Avatar. */
const meta = {
  title: 'Atoms/WorkspaceMark',
  component: WorkspaceMark,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkspaceMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Accent: Story = { args: { name: 'open-garden' } };

export const Primary: Story = { args: { name: 'tomato-mainline', tone: 'primary' } };

export const Gold: Story = { args: { name: 'seed-bank', tone: 'gold' } };

/** The fresh-workspace card's 44px block with the wider radius. */
export const Large: Story = { args: { name: 'default', size: 'lg' } };
