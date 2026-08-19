import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Button } from '../Button';

import { Overlay, type OverlayProps } from './Overlay';

/**
 * Demo panel: all decoration lives in
 * the child — Overlay itself only positions, dims, and manages behavior.
 */
const DemoPanel = ({ side = false }: { side?: boolean }) => (
  <div
    className={
      side
        ? 'flex h-dvh w-[260px] flex-col gap-3.5 border-l border-border-soft bg-surface-1 p-5 shadow-lg'
        : 'flex w-[min(360px,calc(100vw-48px))] flex-col gap-3.5 rounded-xl border border-border-soft bg-surface-1 p-5 shadow-lg'
    }
  >
    <span className="font-display text-[17px] font-bold text-fg1">
      Overlay body
    </span>
    <p className="m-0 text-[13.5px] leading-relaxed text-fg2">
      Tab cycles only these buttons. Press Esc or click the backdrop to close.
    </p>
    <span className="flex gap-2">
      <Button variant="secondary" size="sm">
        Action one
      </Button>
      <Button variant="accent" size="sm">
        Done
      </Button>
    </span>
  </div>
);

const meta = {
  title: 'Atoms/Overlay',
  component: Overlay,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['center', 'right', 'left', 'bottom'],
    },
    backdrop: { control: 'select', options: ['dim', 'blur', 'none'] },
    dismiss: {
      control: 'select',
      options: ['both', 'escape', 'backdrop', 'manual'],
    },
  },
  args: {
    open: true,
    onClose: () => {},
    label: 'Demo overlay',
    children: <DemoPanel />,
  },
  decorators: [
    // Ambient page content behind the overlay so backdrops read against
    // something (the portal ignores the decorator box otherwise).
    (Story) => (
      <div className="h-dvh bg-bg p-10 text-fg3 font-mono text-xs">
        page content behind the overlay
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Overlay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: centered panel on a dim backdrop, dismiss via Esc or backdrop. */
export const Default: Story = {};

export const RightSheet: Story = {
  args: { position: 'right', children: <DemoPanel side /> },
};

export const BottomSheet: Story = {
  args: { position: 'bottom' },
};

export const BackdropBlur: Story = {
  args: { backdrop: 'blur' },
};

export const BackdropNone: Story = {
  args: { backdrop: 'none' },
};

/** Closed by default — the interactive usage shape with a trigger. */
const PlaygroundDemo = (args: OverlayProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-10">
      <Button onClick={() => setOpen(true)}>Open overlay</Button>
      <Overlay
        {...args}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
};

export const Playground: Story = {
  args: { open: false },
  render: (args) => <PlaygroundDemo {...args} />,
};
