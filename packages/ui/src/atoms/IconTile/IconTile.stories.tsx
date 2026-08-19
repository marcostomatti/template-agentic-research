import type { Meta, StoryObj } from '@storybook/react-vite';

import { StrokeIcon } from '../../lib/icons';

import { IconTile } from './IconTile';

/** Tinted icon square/circle — method cards, next-step rows, status circles. */
const meta = {
  title: 'Atoms/IconTile',
  component: IconTile,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof IconTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The 2FA method card's 36px accent tile. */
export const Default: Story = {
  args: { icon: <StrokeIcon name="shield" size={17} /> },
};

export const Primary: Story = {
  args: { icon: <StrokeIcon name="key" size={17} />, tone: 'primary' },
};

/** A confirmation screen's status circle. */
export const StatusCircle: Story = {
  args: {
    icon: <StrokeIcon name="shieldCheck" size={32} />,
    tone: 'success',
    size: 'lg',
    shape: 'circle',
  },
};

/** SignupDone's 80px pulsing success mark. */
export const Pulsing: Story = {
  args: {
    icon: <StrokeIcon name="check" size={36} />,
    tone: 'success',
    size: '2xl',
    shape: 'circle',
    pulse: true,
  },
};
