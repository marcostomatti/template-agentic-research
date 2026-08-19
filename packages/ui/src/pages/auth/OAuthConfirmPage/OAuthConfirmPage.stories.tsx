import type { Meta, StoryObj } from '@storybook/react-vite';

import { OAuthConfirmPage } from './OAuthConfirmPage';

/** OAuth sign-up confirm — the provider gave us the basics, pick a handle. */
const meta = {
  title: 'Pages/Auth/OAuthConfirm',
  component: OAuthConfirmPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof OAuthConfirmPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Prefilled from GitHub — only the username is missing. */
export const GitHub: Story = { args: { provider: 'github' } };

/** Prefilled from Google — pick a handle, Google doesn't have one. */
export const Google: Story = { args: { provider: 'google' } };
