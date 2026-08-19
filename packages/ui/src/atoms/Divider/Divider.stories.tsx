import type { Meta, StoryObj } from '@storybook/react-vite';

import { Divider } from './Divider';

/** A rule, optionally interrupted by a mono label — the auth forms' "or with email". */
const meta = {
  title: 'Atoms/Divider',
  component: Divider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Plain rule. */
export const Plain: Story = {};

/** The login screen's labeled divider. */
export const Labeled: Story = { args: { label: 'or with email' } };
