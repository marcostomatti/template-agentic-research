import type { Meta, StoryObj } from '@storybook/react-vite';

import { ResetCodePage } from './ResetCodePage';

/** Code + new password, single screen — keeps the recovery loop tight. */
const meta = {
  title: 'Pages/Auth/ResetCode',
  component: ResetCodePage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ResetCodePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
