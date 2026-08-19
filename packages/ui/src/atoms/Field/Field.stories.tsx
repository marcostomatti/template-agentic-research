import type { Meta, StoryObj } from '@storybook/react-vite';

import { Field } from './Field';

const SearchIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const meta = {
  title: 'Atoms/Field',
  component: Field,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['default', 'error', 'success', 'disabled'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
  },
  args: {
    label: 'Workspace name',
    defaultValue: 'open-garden',
    helper: 'Lowercase, no spaces.',
  },
  decorators: [
    (Story) => (
      <div className="w-[240px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: labelled md control with a neutral helper. */
export const Default: Story = {};

export const Error: Story = {
  args: { state: 'error', helper: 'That name is already taken.' },
};

export const Success: Story = {
  args: { state: 'success', helper: 'Looks good.' },
};

export const Disabled: Story = {
  args: { state: 'disabled' },
};

export const SmallSize: Story = {
  args: { size: 'sm' },
};

export const WithIcon: Story = {
  args: { icon: <SearchIcon />, placeholder: 'Search agents…', defaultValue: '' },
};

export const NoLabel: Story = {
  args: { label: undefined, helper: undefined },
};
