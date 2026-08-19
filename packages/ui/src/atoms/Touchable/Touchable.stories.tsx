import type { Meta, StoryObj } from '@storybook/react-vite';

import { Touchable } from './Touchable';

/**
 * Card-like filler: surface, soft border, xs shadow,
 * inherited radius, zap icon + label. Touchable itself carries zero
 * decoration — everything visible here belongs to the child.
 */
const DemoSurface = ({ stretch = false }: { stretch?: boolean }) => (
  <span
    className={`flex items-center justify-center gap-2.5 px-4 py-2.5 bg-surface-1 border border-border-soft rounded-[inherit] shadow-xs text-fg1 font-semibold text-sm ${
      stretch
        ? 'w-full'
        : ''
    }`}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent shrink-0"
      aria-hidden
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
    Run agent
  </span>
);

const meta = {
  title: 'Atoms/Touchable',
  component: Touchable,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    rounded: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'full'],
    },
  },
} satisfies Meta<typeof Touchable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: behavior only, no decoration of its own. */
export const Default: Story = {
  args: {
    children: <DemoSurface />,
  },
};

export const Inline: Story = {
  args: { ...Default.args, inline: true },
};

export const Stretch: Story = {
  args: { children: <DemoSurface stretch />, stretch: true },
  parameters: { layout: 'padded' },
};

export const RoundedFull: Story = {
  args: { ...Default.args, rounded: 'full' },
};

export const NoBrightness: Story = {
  args: { ...Default.args, noBrightness: true },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};

/** asChild: hand off to whatever composes inside — here a card surface. */
export const AsChildCard: Story = {
  args: {
    asChild: true,
    rounded: 'lg',
    children: (
      <div className="flex flex-col gap-2 p-5 bg-surface-1 border border-border-soft text-fg1">
        <span className="font-display font-bold text-base">refactor-bot</span>
        <span className="text-xs text-fg3 font-mono">running · 12m</span>
      </div>
    ),
  },
};
