import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import {
  AvatarSelector,
} from './AvatarSelector';
import { type AvatarSelectorTone } from './FormKit.variants';

/**
 * Big avatar preview + initials input + color-swatch grid (original design
 * AvatarPicker, the original AgentEditor demo; spec: the component spec
 * "AvatarSelector"). Controlled: the parent owns initials and tone.
 */
const meta = {
  title: 'Organisms/AvatarSelector',
  component: AvatarSelector,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof AvatarSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const Demo = ({ maxLength = 2 as 1 | 2, start = 'R' }) => {
  const [initials, setInitials] = useState(start);
  const [tone, setTone] = useState<AvatarSelectorTone>('primary');
  return (
    <AvatarSelector
      initials={initials}
      onInitialsChange={setInitials}
      tone={tone}
      onToneChange={setTone}
      maxLength={maxLength}
    />
  );
};

/**
 * Spec: preview + input (2 chars max here) + 3-column swatch grid — the
 * original palette's 6 colors, selected swatch ringed. Input uppercases.
 */
export const Default: Story = {
  args: { initials: 'R', tone: 'primary' },
  render: () => <Demo />,
};

/** The original agent picker's single-character mode. */
export const SingleCharacter: Story = {
  args: { initials: 'A', tone: 'primary', maxLength: 1 },
  render: () => <Demo maxLength={1} start="A" />,
};

/** Empty initials fall back to the original "?" placeholder. */
export const EmptyFallback: Story = {
  args: { initials: '', tone: 'primary' },
  render: () => <Demo start="" />,
};
