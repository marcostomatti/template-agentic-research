import type { Meta, StoryObj } from '@storybook/react-vite';

import { TomatoMark } from '../TomatoMark';

import { Wordmark } from './Wordmark';

/**
 * The "open tomato" type lockup. Theme-aware brand tokens: `open` green,
 * `tomato` red.
 */
const meta = {
  title: 'Atoms/Wordmark',
  component: Wordmark,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default size (22px) — the footer treatment. */
export const Default: Story = {};

/** Header size (20px). */
export const HeaderSize: Story = {
  args: { size: 20 },
};

/** Paired with the mascot for the full brand lockup. */
export const WithMark: Story = {
  render: () => (
    <span className="inline-flex items-center gap-2.5">
      <TomatoMark size={28} />
      <Wordmark size={20} />
    </span>
  ),
};
