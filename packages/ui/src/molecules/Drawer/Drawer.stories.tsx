import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar } from '../../atoms/Avatar';
import { Button } from '../../atoms/Button';
import { Tag } from '../../atoms/Tag';

import { Drawer } from './Drawer';

/** Demo session-detail body. */
const DemoBody = () => (
  <div className="flex flex-col gap-[18px]">
    <div className="flex items-center gap-3">
      <Avatar name="refactor-bot" size="lg" status="none" />
      <div>
        <div className="text-[15px] font-bold text-fg1">refactor-bot</div>
        <div className="font-mono text-xs text-fg3">agt_8x21</div>
      </div>
      <span className="ml-auto">
        <Tag tone="success">running</Tag>
      </span>
    </div>
    <div>
      <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-fg3">
        Goal
      </div>
      <p className="m-0 text-[13.5px] leading-relaxed text-fg2">
        Split the monolith Primitives file into per-role wrappers and update
        every import across the dashboard kit.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[
        ['Model', 'sonnet-4.5'],
        ['Elapsed', '4m 12s'],
        ['Tokens', '184.2k'],
        ['Tools', '4 active'],
      ].map(([k, v]) => (
        <div
          key={k}
          className="rounded-md border border-border-soft bg-surface-sunk px-3 py-[11px]"
        >
          <div className="mb-[3px] text-[11px] text-fg3">{k}</div>
          <div className="font-mono text-[13.5px] font-semibold text-fg1">{v}</div>
        </div>
      ))}
    </div>
    <div>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-fg3">
        Tools
      </div>
      <div className="flex flex-wrap gap-[7px]">
        {['read_file', 'str_replace', 'grep', 'run_tests'].map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
    </div>
  </div>
);

const meta = {
  title: 'Molecules/Drawer',
  component: Drawer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['right', 'left'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    open: true,
    onClose: () => {},
    eyebrow: 'Session',
    title: 'refactor-bot · split-primitives',
    children: <DemoBody />,
    footer: (
      <>
        <Button variant="ghost">Close</Button>
        <Button>Re-seed</Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="h-dvh bg-bg p-10 font-mono text-xs text-fg3">
        page content behind the drawer
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: right side, md width. */
export const Default: Story = {};

export const LeftSide: Story = {
  args: { side: 'left' },
};

export const Large: Story = {
  args: { size: 'lg' },
};
