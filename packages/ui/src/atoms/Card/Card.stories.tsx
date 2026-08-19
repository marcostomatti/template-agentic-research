import type { Meta, StoryObj } from '@storybook/react-vite';

import { CardFiller } from '../../stories/fixtures';

import { Card } from './Card';

/** Demo header content for the header flag. */
const DemoHeader = () => (
  <>
    <span className="font-semibold text-sm text-fg1">Card header</span>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-fg3 shrink-0"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </>
);

const meta = {
  title: 'Atoms/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'select', options: ['sm', 'md', 'lg'] },
    density: { control: 'select', options: ['comfortable', 'compact'] },
    rounded: { control: 'select', options: ['md', 'lg', 'xl'] },
  },
  args: { children: <CardFiller /> },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: bordered surface, lg radius, md padding, no shadow. */
export const Default: Story = {};

export const WithHeader: Story = {
  args: { header: <DemoHeader /> },
};

export const Compact: Story = {
  args: { density: 'compact', header: <DemoHeader /> },
};

export const PaddingSm: Story = {
  args: { padding: 'sm' },
};

export const PaddingLg: Story = {
  args: { padding: 'lg' },
};

export const Elevated: Story = {
  args: { noShadow: false, bordered: false },
};

export const RoundedMd: Story = {
  args: { rounded: 'md' },
};

export const RoundedXl: Story = {
  args: { rounded: 'xl' },
};
