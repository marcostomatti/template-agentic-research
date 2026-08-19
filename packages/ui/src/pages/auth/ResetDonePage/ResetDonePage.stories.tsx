import type { Meta, StoryObj } from '@storybook/react-vite';

import { ResetDonePage } from './ResetDonePage';

/** Reset complete — security note about other devices. */
const meta = {
  title: 'Pages/Auth/ResetDone',
  component: ResetDonePage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ResetDonePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
