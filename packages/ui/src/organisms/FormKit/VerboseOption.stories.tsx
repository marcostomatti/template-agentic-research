import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Badge } from '../../atoms/Badge';

import {
  VerboseOptionList,
  type VerboseOptionData,
} from './VerboseOption';

/**
 * Rich option rows generalized from the original design ModelOption
 * (the original AgentEditor demo; spec: the component spec): radio or checkbox
 * semantics, accent tone change when selected, name + badges + short
 * description (+ optional mono meta line). The model picker below is
 * just data — the component is not tied to models.
 */
const meta = {
  title: 'Organisms/VerboseOption',
  component: VerboseOptionList,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof VerboseOptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Original design MODELS seed (the original Agents demo) as VerboseOption data. */
const MODELS: VerboseOptionData[] = [
  {
    value: 'haiku-4-5',
    label: 'claude-haiku-4-5',
    badges: [<Badge key="speed" tone="success" size="sm">fast</Badge>, 'web', 'chat'],
    description: 'Fast, light tasks. Web + content tools.',
    meta: '$0.25/Mtok in · $1.25/Mtok out',
  },
  {
    value: 'sonnet-4-5',
    label: 'claude-sonnet-4-5',
    badges: [<Badge key="speed" tone="info" size="sm">medium</Badge>, 'web', 'code', 'chat'],
    description: 'Balanced reasoning. Full code-exec surface.',
    meta: '$3/Mtok in · $15/Mtok out',
  },
  {
    value: 'opus-4-5',
    label: 'claude-opus-4-5',
    badges: [<Badge key="speed" tone="warning" size="sm">slow</Badge>, 'web', 'code', 'chat'],
    description: 'Deepest reasoning. Browser + parallel exec.',
    meta: '$15/Mtok in · $75/Mtok out',
  },
];

const RadioDemo = ({ verbose }: { verbose?: boolean }) => {
  const [model, setModel] = useState('sonnet-4-5');
  return (
    <div className="w-[440px]">
      <VerboseOptionList
        ariaLabel="Model"
        options={MODELS.map((m) => (verbose
          ? m
          : { ...m, meta: undefined }))}
        value={model}
        onChange={setModel}
      />
    </div>
  );
};

/**
 * Spec: radio behavior — exclusive pick, selected row tints accent with
 * the filled radio glyph. Badges mix real Badges with the original mono
 * capability pills (plain strings).
 */
export const Radio: Story = {
  args: { options: MODELS, value: 'sonnet-4-5', onChange: () => {} },
  render: () => <RadioDemo />,
};

/** The original `verbose` flag: an extra mono meta line (cost) per option. */
export const RadioVerbose: Story = {
  args: { options: MODELS, value: 'sonnet-4-5', onChange: () => {} },
  render: () => <RadioDemo verbose />,
};

const CheckboxDemo = () => {
  const [picked, setPicked] = useState(['haiku-4-5', 'sonnet-4-5']);
  return (
    <div className="w-[440px]">
      <VerboseOptionList
        mode="checkbox"
        ariaLabel="Fallback models"
        options={MODELS.map((m) => ({ ...m, meta: undefined }))}
        value={picked}
        onChange={setPicked}
      />
    </div>
  );
};

/**
 * Spec: checkbox behavior — independent toggles, square check glyph,
 * same selected tone change.
 */
export const Checkbox: Story = {
  args: {
    mode: 'checkbox',
    options: MODELS,
    value: ['haiku-4-5'],
    onChange: () => {},
  },
  render: () => <CheckboxDemo />,
};

/** Disabled options render at half opacity and ignore clicks. */
export const WithDisabled: Story = {
  args: {
    options: [
      ...MODELS.slice(0, 2),
      ...MODELS.slice(2).map((m) => ({ ...m, disabled: true })),
    ],
    value: 'haiku-4-5',
    onChange: () => {},
  },
  render: (args) => (
    <div className="w-[440px]">
      <VerboseOptionList {...args} />
    </div>
  ),
};
