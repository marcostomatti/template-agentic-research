import type { Meta, StoryObj } from '@storybook/react-vite';

import { LoginPage } from './LoginPage';

/** Login — OAuth first, email second, links bookending the form. */
const meta = {
  title: 'Pages/Auth/Login',
  component: LoginPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cold start — no errors yet. */
export const Default: Story = {};

/** Bad credentials — inline message under the password field. */
export const ErrorState: Story = { args: { mode: 'error' } };
