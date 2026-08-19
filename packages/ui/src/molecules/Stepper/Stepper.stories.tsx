import type { Meta, StoryObj } from '@storybook/react-vite';

import { Stepper } from './Stepper';

const STAGES = [
  { key: 'seed', label: 'Seed' },
  { key: 'plan', label: 'Plan' },
  { key: 'execute', label: 'Execute' },
  { key: 'review', label: 'Review' },
];

const meta = {
  title: 'Molecules/Stepper',
  component: Stepper,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { items: STAGES, index: 1, onChange: () => {} },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 2 of 4: one done, one active, two upcoming. */
export const Default: Story = {};

export const FirstStep: Story = {
  args: { index: 0 },
};

export const LastStep: Story = {
  args: { index: 3 },
};

/** Read-only rail — no onChange, spans render instead of buttons. */
export const ReadOnly: Story = {
  args: { index: 2, onChange: undefined },
};

/** Auth flows' FlowStepper — accent tone, 22px dots, connectors never fill, read-only. */
export const AuthFlow: Story = {
  args: {
    items: [
      { key: 'account', label: 'Account' },
      { key: 'workspace', label: 'Workspace' },
    ],
    index: 1,
    tone: 'accent',
    size: 'sm',
    onChange: undefined,
  },
};
