import type { Meta, StoryObj } from '@storybook/react-vite';

import { Banner } from './Banner';

const meta = {
  title: 'Molecules/Banner',
  component: Banner,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info', 'neutral'],
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: info tone with title + dismiss. */
export const Default: Story = {
  args: {
    title: 'New model available',
    children: 'sonnet-4.5 is now the default for fresh sessions.',
    onClose: () => {},
  },
};

export const Success: Story = {
  args: {
    tone: 'success',
    title: 'Session complete',
    children: 'refactor-bot finished in 4m 12s and opened a diff for review.',
    onClose: () => {},
  },
};

export const WarningWithAction: Story = {
  args: {
    tone: 'warning',
    title: 'Token budget at 80%',
    children: 'This workspace has used 3.2M of 4M tokens this week.',
    action: { label: 'Upgrade', onClick: () => {} },
    onClose: () => {},
  },
};

export const DangerWithAction: Story = {
  args: {
    tone: 'danger',
    title: 'Run failed',
    children: 'perf-bot hit an unrecoverable error on bundle-trim. No changes were written.',
    action: { label: 'Retry', onClick: () => {} },
    onClose: () => {},
  },
};

export const Neutral: Story = {
  args: {
    tone: 'neutral',
    children: 'Scheduled maintenance window this Sunday 02:00–03:00 UTC.',
  },
};
