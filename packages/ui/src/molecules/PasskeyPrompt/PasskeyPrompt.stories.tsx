import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Modal } from '../Modal';

import { PasskeyPrompt } from './PasskeyPrompt';

/**
 * The post-"add passkey" waiting state (the original Profile screen,
 * 2FA modal; decision D5): the browser's WebAuthn interaction is
 * pending — pulsing key indicator, instruction copy, optional cancel
 * affordance. A TwoFactorPage step candidate between the method pick
 * and the done splash; app wiring is WS08 scope.
 */
const meta = {
  title: 'Molecules/PasskeyPrompt',
  component: PasskeyPrompt,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof PasskeyPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The original copy verbatim — pulsing indicator + instruction text. */
export const Default: Story = {
  args: {},
  render: (args) => (
    <div className="w-[460px]">
      <PasskeyPrompt {...args} />
    </div>
  ),
};

/**
 * With the cancel affordance — the WebAuthn prompt can be abandoned, so
 * the pending state must offer a way back.
 */
export const WithCancel: Story = {
  args: { onCancel: () => {} },
  render: (args) => (
    <div className="w-[460px]">
      <PasskeyPrompt {...args} />
    </div>
  ),
};

/**
 * Step-candidate context: how the prompt sits inside the original design 2FA
 * modal ("Set up two-factor", step 2 of 2, Back/Register footer). Pure
 * composition — TwoFactorPage itself is rewired in WS08.
 */
export const InTwoFactorModal: Story = {
  args: {},
  render: () => (
    <div className="h-[420px] w-[640px]">
      <Modal
        open
        onClose={() => {}}
        title="Set up two-factor"
        eyebrow="step 2 of 2"
        footer={(
          <>
            <Button variant="ghost">Back</Button>
            <Button
              variant="primary"
              iconLeading={<Icon name="key-round" size={15} />}
            >
              Register passkey
            </Button>
          </>
        )}
      >
        <PasskeyPrompt />
      </Modal>
    </div>
  ),
};
