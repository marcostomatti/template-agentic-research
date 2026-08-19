import type { Meta, StoryObj } from '@storybook/react-vite';

import { TomatoMark } from './TomatoMark';

/** The mascot mark. Sanctioned appearances: EmptyState and the auth BrandLockup. */
const meta = {
  title: 'Atoms/TomatoMark',
  component: TomatoMark,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof TomatoMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 30px — the EmptyState size. */
export const Default: Story = {};

/** 28px — the auth BrandLockup size. */
export const Lockup: Story = { args: { size: 28 } };
