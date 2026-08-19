import type { Meta, StoryObj } from '@storybook/react-vite';

import { SignupEmailPage } from './SignupEmailPage';

/** Email sign-up, step 1 of 2 — username, email, password with strength meter. */
const meta = {
  title: 'Pages/Auth/SignupEmail',
  component: SignupEmailPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof SignupEmailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
