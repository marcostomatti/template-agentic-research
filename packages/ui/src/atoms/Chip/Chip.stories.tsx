import type { Meta, StoryObj } from '@storybook/react-vite';

import { Chip } from './Chip';

const meta = {
  title: 'Atoms/Chip',
  component: Chip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Removable token — the default shape. */
export const Default: Story = {
  args: { children: 'status: running', onRemove: () => {} },
};

export const NotRemovable: Story = {
  args: { children: 'assigned: me' },
};

export const WithIcon: Story = {
  args: {
    children: 'assigned: me',
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
    ),
  },
};
