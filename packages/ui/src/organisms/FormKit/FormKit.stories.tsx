import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Button } from '../../atoms/Button';
import { Switch } from '../../atoms/Switch';
import { StrokeIcon } from '../../lib/icons';
import { Select } from '../../molecules/Select/Select';

import { CheckGroup } from './Checkbox';
import { FileDrop, type FileValue } from './FileDrop';
import { FormField } from './FormField';
import { RadioGroup } from './RadioGroup';
import { Slider } from './Slider';
import { Textarea } from './Textarea';
import { TextInput } from './TextInput';

/** Demo data from the original form-kit demo — the "New agent" form. */
const FK_MODELS = [
  { value: 'haiku-4', label: 'haiku-4' },
  { value: 'sonnet-4.5', label: 'sonnet-4.5' },
  { value: 'opus-4', label: 'opus-4' },
];
const FK_TOOLS = [
  { value: 'read', label: 'Read files', hint: 'Inspect the repo' },
  { value: 'edit', label: 'Edit files', hint: 'Write changes' },
  { value: 'shell', label: 'Run commands', hint: 'Execute in a sandbox' },
  { value: 'web', label: 'Web search', hint: 'Fetch external docs' },
];
const FK_VISIBILITY = [
  { value: 'private', label: 'Private', hint: 'Only you can run it' },
  { value: 'team', label: 'Team', hint: 'Anyone in the workspace' },
];

const BotIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 8V4H8M4 20h16a2 2 0 002-2v-8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2zM2 14h2M20 14h2M15 13v2M9 13v2" />
  </svg>
);

const meta = {
  title: 'Organisms/FormKit',
  component: FormField,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // Every story is render-based; these only satisfy the required props.
  args: { children: null },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Envelope + text control: label, required star, hint. */
export const TextField: Story = {
  render: function TextFieldDemo() {
    const [name, setName] = useState('');
    return (
      <div className="w-[360px]">
        <FormField
          label="Name"
          required
          htmlFor="fk-name"
          hint="Lowercase, no spaces. Used in the agent's URL."
        >
          <TextInput
            id="fk-name"
            value={name}
            onChange={setName}
            placeholder="refactor-bot"
            prefix="@"
          />
        </FormField>
      </div>
    );
  },
};

/** The error slot replaces the hint and flips the border. */
export const TextFieldError: Story = {
  render: function TextFieldErrorDemo() {
    const [name, setName] = useState('My Agent');
    return (
      <div className="w-[360px]">
        <FormField
          label="Name"
          required
          htmlFor="fk-name-err"
          error="Lowercase, numbers and dashes — at least 3 characters."
        >
          <TextInput
            id="fk-name-err"
            value={name}
            onChange={setName}
            invalid
            prefix="@"
          />
        </FormField>
      </div>
    );
  },
};

export const TextareaField: Story = {
  render: function TextareaFieldDemo() {
    const [desc, setDesc] = useState('');
    return (
      <div className="w-[360px]">
        <FormField
          label="Description"
          htmlFor="fk-desc"
          hint="Optional — what is this agent for?"
        >
          <Textarea
            id="fk-desc"
            value={desc}
            onChange={setDesc}
            placeholder="Splits monoliths into per-role modules and fixes imports."
            rows={2}
          />
        </FormField>
      </div>
    );
  },
};

export const CheckGroupField: Story = {
  render: function CheckGroupFieldDemo() {
    const [tools, setTools] = useState(['read', 'edit']);
    return (
      <div className="w-[420px]">
        <FormField
          label="Tools"
          required
          hint="What this agent is allowed to call."
        >
          <CheckGroup
            options={FK_TOOLS}
            value={tools}
            onChange={setTools}
            columns={2}
          />
        </FormField>
      </div>
    );
  },
};

export const RadioGroupField: Story = {
  render: function RadioGroupFieldDemo() {
    const [vis, setVis] = useState('team');
    return (
      <div className="w-[360px]">
        <FormField label="Visibility">
          <RadioGroup
            options={FK_VISIBILITY}
            value={vis}
            onChange={setVis}
            ariaLabel="Visibility"
          />
        </FormField>
      </div>
    );
  },
};

export const SliderField: Story = {
  render: function SliderFieldDemo() {
    const [tokens, setTokens] = useState(184000);
    return (
      <div className="w-[360px]">
        <FormField
          label="Max tokens"
          required
          htmlFor="fk-tokens"
          hint="Per-session ceiling."
        >
          <Slider
            id="fk-tokens"
            value={tokens}
            onChange={setTokens}
            min={20000}
            max={400000}
            step={4000}
            format={(n) => `${(n / 1000).toFixed(0)}k`}
          />
        </FormField>
      </div>
    );
  },
};

export const FileDropField: Story = {
  render: function FileDropFieldDemo() {
    const [ctx, setCtx] = useState<FileValue | null>(null);
    return (
      <div className="w-[420px]">
        <FormField
          label="Seed context"
          hint="Optional — a brief or spec the agent reads first. Drag a real .md file here."
        >
          <FileDrop
            value={ctx}
            onChange={(f) => setCtx(f
              ? { name: f.name, size: f.size }
              : null)
            }
            label="Drop a .md context file"
            hint=".md or .txt · up to 1 MB"
            accept={{ ext: ['.md', '.txt'], maxSize: 1048576, multiple: false }}
          />
        </FormField>
      </div>
    );
  },
};

/** The landed-file chip presentation. */
export const FileDropLanded: Story = {
  render: function FileDropLandedDemo() {
    const [ctx, setCtx] = useState<FileValue | null>({
      name: 'agent-brief.md',
      size: 4200,
    });
    return (
      <div className="w-[420px]">
        <FormField label="Seed context">
          <FileDrop
            value={ctx}
            onChange={(f) => setCtx(f
              ? { name: f.name, size: f.size }
              : null)
            }
          />
        </FormField>
      </div>
    );
  },
};

interface AgentDraft {
  name: string;
  desc: string;
  model: string;
  tokens: number;
  tools: string[];
  visibility: string;
  autorun: boolean;
  context: FileValue | null;
}

const FK_INITIAL: AgentDraft = {
  name: '',
  desc: '',
  model: 'sonnet-4.5',
  tokens: 184000,
  tools: ['read', 'edit'],
  visibility: 'team',
  autorun: false,
  context: null,
};

function validateForm(v: AgentDraft): Partial<Record<string, string>> {
  const e: Partial<Record<string, string>> = {};
  if (!/^[a-z0-9][a-z0-9-]{2,}$/.test(v.name))
    e.name = 'Lowercase, numbers and dashes — at least 3 characters.';
  if (v.desc.trim().length > 0 && v.desc.trim().length < 12)
    e.desc = 'Give it a sentence, or leave it blank.';
  if (v.tools.length === 0) e.tools = 'An agent needs at least one tool.';
  return e;
}

/** The whole bundle demo form — a pure function of one values object. */
export const NewAgentForm: Story = {
  parameters: { layout: 'padded' },
  render: function NewAgentFormDemo() {
    const [v, setV] = useState(FK_INITIAL);
    const [showErrors, setShowErrors] = useState(false);
    const set =
      <K extends keyof AgentDraft>(k: K) => (val: AgentDraft[K]) => setV((s) => ({ ...s, [k]: val }));
    const errors = validateForm(v);
    const errFor = (k: string) => (showErrors
      ? errors[k]
      : undefined);
    const fmtK = (n: number) => `${(n / 1000).toFixed(0)}k`;
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 rounded-xl border border-border-soft bg-surface-1 p-5 shadow-xs">
        <div className="mb-0.5 flex items-center gap-2.5">
          <span className="inline-flex size-[34px] items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--primary)_13%,var(--surface-1))] text-primary">
            <BotIcon />
          </span>
          <div>
            <div className="font-display text-[17px] font-bold text-fg1">
              New agent
            </div>
            <div className="text-[12.5px] text-fg3">
              Define a reusable agent for this workspace
            </div>
          </div>
        </div>

        <FormField
          label="Name"
          required
          htmlFor="naf-name"
          error={errFor('name')}
          hint="Lowercase, no spaces. Used in the agent's URL."
        >
          <TextInput
            id="naf-name"
            value={v.name}
            onChange={set('name')}
            invalid={!!errFor('name')}
            placeholder="refactor-bot"
            prefix="@"
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="naf-desc"
          error={errFor('desc')}
          hint="Optional — what is this agent for?"
        >
          <Textarea
            id="naf-desc"
            value={v.desc}
            onChange={set('desc')}
            invalid={!!errFor('desc')}
            placeholder="Splits monoliths into per-role modules and fixes imports."
            rows={2}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="Default model" htmlFor="naf-model">
            <Select
              value={v.model}
              options={FK_MODELS}
              onChange={set('model')}
              ariaLabel="Default model"
              width={180}
            />
          </FormField>
          <FormField
            label="Max tokens"
            required
            htmlFor="naf-tokens"
            hint="Per-session ceiling."
          >
            <Slider
              id="naf-tokens"
              value={v.tokens}
              onChange={set('tokens')}
              min={20000}
              max={400000}
              step={4000}
              format={fmtK}
            />
          </FormField>
        </div>

        <FormField
          label="Tools"
          required
          error={errFor('tools')}
          hint="What this agent is allowed to call."
        >
          <CheckGroup
            options={FK_TOOLS}
            value={v.tools}
            onChange={set('tools')}
            columns={2}
          />
        </FormField>

        <FormField label="Visibility">
          <RadioGroup
            options={FK_VISIBILITY}
            value={v.visibility}
            onChange={set('visibility')}
            ariaLabel="Visibility"
          />
        </FormField>

        <FormField
          label="Seed context"
          hint="Optional — a brief or spec the agent reads first. Drag a real .md file here."
        >
          <FileDrop
            value={v.context}
            onChange={(f) => set('context')(f
              ? { name: f.name, size: f.size }
              : null)
            }
            label="Drop a .md context file"
            hint=".md or .txt · up to 1 MB"
            accept={{ ext: ['.md', '.txt'], maxSize: 1048576, multiple: false }}
          />
        </FormField>

        <div className="flex items-center gap-3 rounded-md border border-border-soft bg-surface-sunk px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-fg1">
              Auto-run on roadmap items
            </div>
            <div className="mt-px text-xs text-fg3">
              Seed a session whenever a matching task appears
            </div>
          </div>
          <Switch
            checked={v.autorun}
            onChange={set('autorun')}
            aria-label="Auto-run"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Button onClick={() => setShowErrors(true)}>Create agent</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setV(FK_INITIAL);
              setShowErrors(false);
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  },
};

/** Auth-sourced extension: ReactNode prefix + interactive suffix, labelEnd, hint above. */
export const WithAffixes: Story = {
  render: function WithAffixesStory() {
    const [value, setValue] = useState('sam@example.dev');
    return (
      <div className="w-80">
        <FormField
          label="Email"
          labelEnd={<a href="#forgot" className="text-xs font-semibold text-accent">Forgot?</a>}
          hint="We'll send a confirmation link."
          hintPlacement="above"
        >
          <TextInput
            value={value}
            onChange={setValue}
            type="email"
            prefix={<StrokeIcon name="mail" size={14} />}
            suffix={<StrokeIcon name="check" size={14} className="text-success" />}
          />
        </FormField>
      </div>
    );
  },
};
