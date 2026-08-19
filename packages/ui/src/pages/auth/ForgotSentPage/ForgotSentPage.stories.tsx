import type { Meta, StoryObj } from '@storybook/react-vite';

import { ForgotSentPage } from './ForgotSentPage';

/** Code sent — confirmation with resend + use-different-email escape hatches. */
const meta = {
  title: 'Pages/Auth/ForgotSent',
  component: ForgotSentPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ForgotSentPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
