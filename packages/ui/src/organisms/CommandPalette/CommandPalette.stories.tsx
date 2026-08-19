import type { Meta, StoryObj } from '@storybook/react-vite';

import { useEffect, useState, type ComponentProps } from 'react';

import { CommandPalette, type Command } from './CommandPalette';

/** Demo icon paths for the demo command registry. */
const D: Record<string, string> = {
  home: 'M3 12L12 3l9 9M5 10v10h14V10',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  bot: 'M12 8V4H8M4 20h16a2 2 0 002-2v-8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2zM2 14h2M20 14h2M15 13v2M9 13v2',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 110-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V2a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H22a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  leaf: 'M11 20A7 7 0 014 13C4 8 11 3 20 4c1 9-3 16-9 16zM2 22c4-4 5-8 7-12',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
};

const Glyph = ({ name }: { name: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={D[name]} />
  </svg>
);

/** The original demo's command registry (COMMANDS). */
const COMMANDS: Command[] = [
  { id: 'go-overview', group: 'Go to', icon: <Glyph name="home" />, label: 'Overview', keys: 'dashboard home' },
  { id: 'go-sessions', group: 'Go to', icon: <Glyph name="terminal" />, label: 'Sessions', keys: 'runs logs' },
  { id: 'go-agents', group: 'Go to', icon: <Glyph name="bot" />, label: 'Agents', keys: 'definitions' },
  { id: 'go-roadmap', group: 'Go to', icon: <Glyph name="list" />, label: 'Roadmap', keys: 'tasks plan' },
  { id: 'go-usage', group: 'Go to', icon: <Glyph name="zap" />, label: 'Usage', keys: 'tokens billing spend' },
  { id: 'go-settings', group: 'Go to', icon: <Glyph name="settings" />, label: 'Settings', keys: 'preferences config' },
  { id: 'new-session', group: 'Actions', icon: <Glyph name="plus" />, label: 'New session', hint: '⌘N', keys: 'create run start' },
  { id: 'new-agent', group: 'Actions', icon: <Glyph name="bot" />, label: 'New agent', keys: 'create define' },
  { id: 'new-workspace', group: 'Actions', icon: <Glyph name="leaf" />, label: 'New workspace', keys: 'create org team' },
  { id: 'invite', group: 'Actions', icon: <Glyph name="user" />, label: 'Invite teammate', keys: 'add member people' },
  { id: 'theme', group: 'Actions', icon: <Glyph name="moon" />, label: 'Toggle theme', hint: '⌘⇧L', keys: 'dark light mode' },
  { id: 'agent-refactor', group: 'Agents', icon: <Glyph name="bot" />, label: 'refactor-bot', hint: 'running', keys: 'split monolith' },
  { id: 'agent-docs', group: 'Agents', icon: <Glyph name="bot" />, label: 'docs-writer', hint: 'waiting', keys: 'documentation' },
  { id: 'agent-test', group: 'Agents', icon: <Glyph name="bot" />, label: 'test-runner', hint: 'done', keys: 'tests ci' },
];

const RECENT = ['go-sessions', 'new-session', 'agent-refactor', 'theme'];

const meta = {
  title: 'Organisms/CommandPalette',
  component: CommandPalette,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
    onRun: () => {},
    commands: COMMANDS,
    recent: RECENT,
  },
  decorators: [
    (Story) => (
      <div className="h-dvh bg-bg p-10 font-mono text-xs text-fg3">
        page content behind the palette
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty query — the Recent group from the original demo. */
export const Default: Story = {};

/** All groups, no recent list provided. */
export const FullRegistry: Story = {
  args: { recent: undefined },
};

/** Stateful demo host: binds the ⌘K hotkey and the trigger button. */
const HotkeyDrivenDemo = (args: ComponentProps<typeof CommandPalette>) => {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="flex items-center gap-3.5 p-10">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-w-[280px] cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface-1 px-[15px] py-[11px] text-sm text-fg2 shadow-xs"
      >
        <span className="text-fg3">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <span className="flex-1 text-left">Search commands…</span>
        <kbd className="rounded-md border border-border-soft bg-surface-sunk px-2 py-[3px] font-mono text-xs text-fg3">
          ⌘K
        </kbd>
      </button>
      {last != null && (
        <span className="text-[13px] font-semibold text-success">
          ran &ldquo;{last}&rdquo;
        </span>
      )}
      <CommandPalette
        {...args}
        open={open}
        onClose={() => setOpen(false)}
        onRun={(c) => setLast(c.label)}
      />
    </div>
  );
};

/** ⌘K / Ctrl-K toggles it, like the original demo's live section. */
export const HotkeyDriven: Story = {
  args: { open: false },
  render: (args) => <HotkeyDrivenDemo {...args} />,
};
