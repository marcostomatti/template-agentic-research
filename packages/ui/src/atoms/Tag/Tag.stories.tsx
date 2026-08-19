import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tag } from './Tag';

/** Stroked icon at Tag scale (13px). */
const TagIcon = ({ d }: { d: string }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden
  >
    {d.split('M').filter(Boolean)
      .map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
  </svg>
);

const meta = {
  title: 'Atoms/Tag',
  component: Tag,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
    },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: neutral, monospace — an id. */
export const Default: Story = {
  args: { children: 'agt_8x21' },
};

export const Info: Story = {
  args: { tone: 'info', children: 'sonnet-4.5' },
};

export const SuccessVerified: Story = {
  args: {
    tone: 'success',
    children: 'verified',
    icon: <TagIcon d="M20 6L9 17l-5-5" />,
  },
};

export const WithToolIcon: Story = {
  args: {
    children: 'read_file',
    icon: <TagIcon d="M4 17l6-6-6-6M12 19h8" />,
  },
};

export const Warning: Story = {
  args: { tone: 'warning', children: 'deprecated' },
};

export const Danger: Story = {
  args: { tone: 'danger', children: 'revoked' },
};
