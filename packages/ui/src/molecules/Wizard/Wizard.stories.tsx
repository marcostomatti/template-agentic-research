import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Field } from '../../atoms/Field';
import { TomatoMark } from '../../atoms/TomatoMark';

import { Wizard, type WizardProps, type WizardStep } from './Wizard';

interface Answers {
  name: string;
  model: string;
}

/** A compact workspace-setup step set. */
const STEPS: WizardStep<Answers>[] = [
  {
    key: 'name',
    title: 'Name your workspace',
    short: 'Name',
    blurb: 'This is where your agents, sessions and roadmap live. You can change it later.',
    validate: (a) => /^[a-z0-9][a-z0-9-]{2,}$/.test(a.name)
      ? null
      : 'Lowercase letters, numbers and dashes — at least 3 characters.',
    render: ({ answers, set, error }) => (
      <Field
        label="Workspace name"
        state={error
          ? 'error'
          : 'default'}
        helper={error ?? 'Lowercase, no spaces. Used in your URL.'}
        value={answers.name}
        placeholder="open-garden"
        onChange={(e) => set('name', e.target.value)}
      />
    ),
  },
  {
    key: 'model',
    title: 'Pick a default model',
    short: 'Model',
    blurb: 'Every new agent session starts here. Per-session overrides are always available.',
    validate: (a) => (a.model
      ? null
      : 'Choose a model to continue.'),
    render: ({ answers, set }) => (
      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Default model">
        {['haiku-4', 'sonnet-4.5', 'opus-4'].map((m) => {
          const on = answers.model === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set('model', m)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-[15px] py-[13px] text-left ${
                on
                  ? 'border-primary bg-[color-mix(in_oklab,var(--primary)_9%,var(--surface-1))] shadow-sm'
                  : 'border-border-soft bg-surface-1'
              }`}
            >
              <span
                className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                  on
                    ? 'border-primary'
                    : 'border-border-strong'
                }`}
              >
                {on && <span className="size-[9px] rounded-full bg-primary" />}
              </span>
              <span className="font-mono text-sm font-bold text-fg1">{m}</span>
            </button>
          );
        })}
      </div>
    ),
  },
  {
    key: 'review',
    title: 'Review & create',
    short: 'Review',
    blurb: 'One last look. We\'ll seed an empty workspace and drop you on the dashboard.',
    validate: () => null,
    render: ({ answers }) => (
      <div className="flex flex-col overflow-hidden rounded-lg border border-border-soft">
        {[
          ['Workspace', answers.name
            ? `example.dev/${answers.name}`
            : '—'],
          ['Default model', answers.model || '—'],
        ].map(([k, v], i) => (
          <div
            key={k}
            className={`flex justify-between gap-4 px-4 py-[13px] ${
              i % 2
                ? 'bg-surface-1'
                : 'bg-surface-sunk'
            } ${i === 0
              ? 'border-b border-border-soft'
              : ''}`}
          >
            <span className="text-[13px] text-fg3">{k}</span>
            <span className="break-words text-right font-mono text-[13.5px] font-semibold text-fg1">
              {v}
            </span>
          </div>
        ))}
      </div>
    ),
  },
];

const Heading = () => (
  <>
    <TomatoMark size={22} />
    <span className="font-display text-sm font-bold text-fg1">New workspace</span>
  </>
);

const meta = {
  title: 'Molecules/Wizard',
  component: Wizard,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    open: true,
    steps: STEPS,
    step: 0,
    answers: { name: '', model: 'sonnet-4.5' },
    heading: <Heading />,
    onAnswer: () => {},
    onBack: () => {},
    onNext: () => {},
    onClose: () => {},
    onFinish: () => {},
  },
  decorators: [
    (Story) => (
      <div className="h-dvh bg-bg p-10 font-mono text-xs text-fg3">
        page content behind the wizard
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Wizard<Answers>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1: empty name — Continue gated by validate(). */
export const Default: Story = {};

/** Model step: radio cards, valid → Continue enabled. */
export const ModelStep: Story = {
  args: { step: 1, answers: { name: 'open-garden', model: 'sonnet-4.5' } },
};

/** Last step: review rows + the primary Create action. */
export const ReviewStep: Story = {
  args: { step: 2, answers: { name: 'open-garden', model: 'sonnet-4.5' } },
};

/** Fully interactive: parent owns step + answers (the controlled contract). */
const PlaygroundDemo = (args: WizardProps<Answers>) => {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ name: '', model: 'sonnet-4.5' });
  return (
    <Wizard
      {...args}
      open={open}
      step={step}
      answers={answers}
      onAnswer={(k, v) => setAnswers((a) => ({ ...a, [k]: v as string }))}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
      onClose={() => setOpen(false)}
      onFinish={() => setOpen(false)}
    />
  );
};

export const Playground: Story = {
  render: (args) => <PlaygroundDemo {...args} />,
};
