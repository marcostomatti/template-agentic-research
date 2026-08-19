import type { Meta, StoryObj } from '@storybook/react-vite';

import { ForgotEmailPage } from './ForgotEmailPage';

/** Password recovery — email input, OAuth-users callout. */
const meta = {
  title: 'Pages/Auth/ForgotEmail',
  component: ForgotEmailPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ForgotEmailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
