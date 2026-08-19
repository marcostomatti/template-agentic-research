import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { CodeInput, type CodeInputProps } from './CodeInput';

/** 6-digit code entry — auto-advance, backspace-to-previous, accent when filled. */
const meta = {
  title: 'Molecules/CodeInput',
  component: CodeInput,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof CodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (props: Partial<CodeInputProps>) => {
  const [value, setValue] = useState(props.value ?? '');
  return <CodeInput {...props} value={value} onChange={setValue} />;
};

export const Empty: Story = {
  args: { value: '', onChange: () => {} },
  render: () => <Controlled />,
};

/** Three digits in — filled cells carry the accent border. */
export const PartiallyFilled: Story = {
  args: { value: '143', onChange: () => {} },
  render: () => <Controlled value="143" />,
};

/** Behavior: typing advances focus; backspace on an empty cell retreats. */
export const AutoAdvance: Story = {
  args: { value: '', onChange: () => {} },
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole('textbox');
    await userEvent.click(cells[0]!);
    await userEvent.keyboard('1');
    await expect(cells[1]).toHaveFocus();
    await userEvent.keyboard('4');
    await expect(cells[2]).toHaveFocus();
    await userEvent.keyboard('{Backspace}');
    await expect(cells[1]).toHaveFocus();
  },
};
