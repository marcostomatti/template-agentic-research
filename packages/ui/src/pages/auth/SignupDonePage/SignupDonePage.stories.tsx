import type { Meta, StoryObj } from '@storybook/react-vite';

import { SignupDonePage } from './SignupDonePage';

/** Sign-up complete — confirmation, next steps, CTA into the dashboard. */
const meta = {
  title: 'Pages/Auth/SignupDone',
  component: SignupDonePage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof SignupDonePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
