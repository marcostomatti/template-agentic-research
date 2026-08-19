import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ChipList, type ChipOption } from './ChipList';
import { FormField } from './FormField';

/**
 * Chip input with typeahead suggestions (spec: the component spec
 * "ChipList"): typing opens the list with the first result preselected;
 * ↑↓/Enter or click select; chips render in-container with a remove X.
 * Multi mode excludes selected options from further results; single
 * mode lets the chip take over; `allowNew` creates chips from free
 * text.
 */
const meta = {
  title: 'Organisms/ChipList',
  component: ChipList,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ChipList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** the tools-page spec "Call webhook on" — known system events. */
const EVENTS: ChipOption[] = [
  { value: 'session.started', label: 'session.started' },
  { value: 'session.finished', label: 'session.finished' },
  { value: 'session.failed', label: 'session.failed' },
  { value: 'agent.created', label: 'agent.created' },
  { value: 'task.moved', label: 'task.moved' },
  { value: 'budget.exceeded', label: 'budget.exceeded' },
];

const MultiDemo = ({ initial = ['session.failed'] }: { initial?: string[] }) => {
  const [picked, setPicked] = useState(initial);
  return (
    <div className="w-[380px]">
      <FormField
        label="Call webhook on"
        hint="Which system events should fire this tool?"
      >
        <ChipList
          options={EVENTS}
          value={picked}
          onChange={setPicked}
          ariaLabel="System events"
          placeholder="Add an event…"
        />
      </FormField>
    </div>
  );
};

/**
 * Spec: multi mode — chips stack at the top of the container, the input
 * stays below, and selected options stop appearing in the results
 * (removing a chip brings its option back).
 */
export const Multi: Story = {
  args: { options: EVENTS, value: [], onChange: () => {} },
  render: () => <MultiDemo />,
};

/**
 * Keyboard path with real events: typing preselects the FIRST result,
 * bare Enter takes it; ↑↓ move the active row; selected options are
 * excluded from later searches.
 */
export const MultiKeyboard: Story = {
  args: { options: EVENTS, value: [], onChange: () => {} },
  render: () => <MultiDemo initial={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    // Typing opens the list, first result preselected; Enter takes it.
    await userEvent.type(input, 'session');
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'));
    const first = canvas.getAllByRole('option');
    await expect(first[0]).toHaveTextContent('session.started');
    await expect(first[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('session.started')).toBeVisible();
    // The selected option is excluded from the next search; arrows move.
    await userEvent.type(input, 'session');
    const next = canvas.getAllByRole('option');
    await expect(next.map((o) => o.textContent)).not.toContain('session.started');
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(next[1]).toHaveAttribute('aria-selected', 'true'));
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('session.failed')).toBeVisible();
  },
};

const SingleDemo = () => {
  const [picked, setPicked] = useState(['agent.created']);
  return (
    <div className="w-[380px]">
      <FormField label="Trigger event" hint="Single mode — remove the chip to search again.">
        <ChipList
          mode="single"
          options={EVENTS}
          value={picked}
          onChange={setPicked}
          ariaLabel="Trigger event"
        />
      </FormField>
    </div>
  );
};

/**
 * Spec: single mode — the chip takes over the container (input hidden)
 * until its X removes it.
 */
export const Single: Story = {
  args: { mode: 'single', options: EVENTS, value: [], onChange: () => {} },
  render: () => <SingleDemo />,
};

const AllowNewDemo = () => {
  const [tags, setTags] = useState(['infra']);
  return (
    <div className="w-[380px]">
      <FormField label="Tags" hint="Pick existing tags or define new ones on the fly.">
        <ChipList
          options={[
            { value: 'infra', label: 'infra' },
            { value: 'frontend', label: 'frontend' },
            { value: 'billing', label: 'billing' },
          ]}
          value={tags}
          onChange={setTags}
          allowNew
          ariaLabel="Tags"
          placeholder="Add a tag…"
        />
      </FormField>
    </div>
  );
};

/**
 * Spec: `allowNew` — unmatched typed text leads the list as a Create
 * option and becomes a chip when selected.
 */
export const AllowNew: Story = {
  args: { options: [], value: [], onChange: () => {}, allowNew: true },
  render: () => <AllowNewDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    await userEvent.type(input, 'observability');
    const options = await canvas.findAllByRole('option');
    await expect(options[0]).toHaveTextContent('Create');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('observability')).toBeVisible();
  },
};
