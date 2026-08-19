import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatusIndicator } from './StatusIndicator';

const meta = {
  title: 'Atoms/StatusIndicator',
  component: StatusIndicator,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['ok', 'warn', 'err', 'info', 'disabled'],
    },
    shape: { control: 'select', options: ['circle', 'square'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pulse: { control: 'boolean' },
  },
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: ok tone, circle, md, no pulse. */
export const Default: Story = {
  args: { label: 'ok' },
};

/** Spec: the accent tone scale — ok / warn / err / info / disabled. */
export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <StatusIndicator tone="ok" label="ok" />
      <StatusIndicator tone="warn" label="warning" />
      <StatusIndicator tone="err" label="error" />
      <StatusIndicator tone="info" label="info" />
      <StatusIndicator tone="disabled" label="disabled" />
    </div>
  ),
};

/** Spec: circle or rounded square. */
export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <StatusIndicator shape="circle" label="circle" />
      <StatusIndicator shape="square" label="square" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <StatusIndicator size="sm" label="small" />
      <StatusIndicator size="md" label="medium" />
      <StatusIndicator size="lg" label="large" />
    </div>
  ),
};

/** Spec: `pulse` — live-activity ring (motion-reduce safe). */
export const Pulse: Story = {
  args: { pulse: true, label: 'running' },
};

/** Inline usage next to text — the session-row pattern. */
export const InlineWithText: Story = {
  render: () => (
    <span className="inline-flex items-center gap-2 text-sm text-fg1">
      <StatusIndicator tone="ok" pulse />
      refactor-bot · running
    </span>
  ),
};
