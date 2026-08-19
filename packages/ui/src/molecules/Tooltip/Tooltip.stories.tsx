import type { Meta, StoryObj } from '@storybook/react-vite';

import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { Tooltip } from './Tooltip';

/**
 * A hoverable stat pill. Radix's Trigger (asChild) clones
 * this element and injects ref + hover/focus handlers — the anchor MUST
 * forward its ref and spread the injected props onto the DOM node, or the
 * tooltip has nothing to position against and never shows.
 */
const StatPill = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip anchor must be focusable so keyboard users can reveal it
      tabIndex={0}
      className={cn(
        'inline-flex cursor-help items-center gap-1.5 rounded-md border border-dashed border-border-strong bg-surface-1 px-3 py-[7px] font-mono text-[13px] text-fg1',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
);
StatPill.displayName = 'StatPill';

const meta = {
  title: 'Molecules/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
  },
  decorators: [
    (Story) => (
      <div className="flex h-[160px] items-center justify-center">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open for the screenshot; hover/focus drives it in real usage. */
export const Default: Story = {
  args: {
    open: true,
    label: '184,210 of 200,000 tokens',
    children: <StatPill>⚡ 184k</StatPill>,
  },
};

export const BottomSide: Story = {
  args: {
    open: true,
    side: 'bottom',
    label: 'Last run 4 minutes ago',
    children: <StatPill>4m ago</StatPill>,
  },
};

/** Closed by default — the interactive hover/focus shape. */
export const HoverMe: Story = {
  args: {
    label: 'Defined in 3 agents',
    children: <StatPill>read_file</StatPill>,
  },
};
