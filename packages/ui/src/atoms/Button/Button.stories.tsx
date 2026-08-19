import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'accent', 'secondary', 'ghost', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Run agent' },
};

export const Accent: Story = {
  args: { variant: 'accent', children: 'Done' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Skip' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete agent' },
};

export const SmallSize: Story = {
  args: { size: 'sm', children: 'Small' },
};

export const LargeSize: Story = {
  args: { size: 'lg', children: 'Large' },
};

export const Block: Story = {
  args: { block: true, children: 'Full width' },
  parameters: { layout: 'padded' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
};

export const WithLeadingIcon: Story = {
  args: {
    children: 'Run agent',
    iconLeading: (
      // Stroked zap icon (size = text + 2px).
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
};
