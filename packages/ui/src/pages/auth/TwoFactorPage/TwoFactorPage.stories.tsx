import type { Meta, StoryObj } from '@storybook/react-vite';

import { FakeQrCode } from '../../../stories/fake-qr';

import { TwoFactorPage } from './TwoFactorPage';

/** Full-page 2FA enrollment — the standalone equivalent of Settings' modal flow. */
const meta = {
  title: 'Pages/Auth/TwoFactor',
  component: TwoFactorPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof TwoFactorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Authenticator app vs passkey — recommended badge on TOTP. */
export const Pick: Story = { args: { step: 'pick' } };

/** QR + copy-paste secret. The QR is a deterministic story fixture. */
export const Scan: Story = { args: { step: 'scan', qr: <FakeQrCode size={172} /> } };

/** 6-digit confirmation with the passkey fallback link. */
export const Confirm: Story = { args: { step: 'confirm' } };

/** Success + downloadable recovery codes. */
export const Done: Story = { args: { step: 'done' } };
