import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { StepUpPage, type StepUpPageProps } from './StepUpPage';

/** Step-up re-check — 6-digit confirm for an action already in progress. */
const meta = {
  title: 'Pages/Auth/StepUp',
  component: StepUpPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof StepUpPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (props: Partial<StepUpPageProps> & Pick<StepUpPageProps, 'method'>) => {
  const [code, setCode] = useState(props.code ?? '');
  return (
    <StepUpPage
      maskedEmail="s••@example.dev"
      {...props}
      code={code}
      onCodeChange={setCode}
      onSubmit={props.onSubmit ?? (() => {})}
    />
  );
};

/** L2 re-check — code lands in the inbox on the masked address. */
export const EmailOtp: Story = {
  args: { method: 'email_otp', code: '', onCodeChange: () => {}, onSubmit: () => {} },
  render: (args) => <Controlled {...args} />,
};

/** L3 re-check — the code already lives on the user's authenticator app. */
export const Totp: Story = {
  args: { method: 'totp', code: '', onCodeChange: () => {}, onSubmit: () => {} },
  render: (args) => <Controlled {...args} />,
};

/** Wrong or expired code — the "Use a different method" escape hatch is available. */
export const WithError: Story = {
  args: {
    method: 'email_otp',
    code: '1',
    onCodeChange: () => {},
    onSubmit: () => {},
    error: 'That code is wrong or has expired. Request a new one.',
    onUseOtherMethod: () => {},
  },
  render: (args) => <Controlled {...args} />,
};

/** Submitted — the confirm button is disabled while the code is checked. */
export const Busy: Story = {
  args: {
    method: 'totp',
    code: '143829',
    onCodeChange: () => {},
    onSubmit: () => {},
    busy: true,
  },
  render: (args) => <Controlled {...args} />,
};
