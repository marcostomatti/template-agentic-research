import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../Button';

import { Menu, MenuContent, MenuItem, MenuLabel, MenuSep, MenuTrigger } from './Menu';

/** Stroked icons at menu-item scale (16px). */
const ItemIcon = ({ d }: { d: string }) => (
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
    {d.split('M').filter(Boolean)
      .map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
  </svg>
);

const eye = 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z';
const zap = 'M13 2L3 14h9l-1 8 10-12h-9l1-8z';
const copy = 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1';
const x = 'M18 6L6 18M6 6l12 12';

/** Demo item set: three actions, a separator, a danger action. */
const DemoItems = () => (
  <>
    <MenuItem icon={<ItemIcon d={eye} />}>Open session</MenuItem>
    <MenuItem icon={<ItemIcon d={zap} />}>Re-seed</MenuItem>
    <MenuItem icon={<ItemIcon d={copy} />}>Duplicate</MenuItem>
    <MenuSep />
    <MenuItem tone="danger" icon={<ItemIcon d={x} />}>
      Delete agent
    </MenuItem>
  </>
);

const meta = {
  title: 'Atoms/Menu',
  component: MenuContent,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'select', options: ['start', 'end'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  // Open + non-modal so every story renders its menu for the screenshot
  // suite without interaction (and without locking the preview's scroll).
  decorators: [
    (Story) => (
      <div className="flex h-[320px] w-[400px] justify-center pt-6">
        <Menu open modal={false}>
          <MenuTrigger asChild>
            <Button variant="secondary">Agent actions</Button>
          </MenuTrigger>
          <Story />
        </Menu>
      </div>
    ),
  ],
} satisfies Meta<typeof MenuContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: md width, start-aligned under its trigger. */
export const Default: Story = {
  args: { children: <DemoItems /> },
};

export const AlignEnd: Story = {
  args: { align: 'end', children: <DemoItems /> },
};

export const SizeSm: Story = {
  args: { size: 'sm', children: <DemoItems /> },
};

export const SizeLg: Story = {
  args: { size: 'lg', children: <DemoItems /> },
};

export const WithLabel: Story = {
  args: {
    children: (
      <>
        <MenuLabel>Session</MenuLabel>
        <DemoItems />
      </>
    ),
  },
};
