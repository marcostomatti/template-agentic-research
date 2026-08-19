import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { Icon } from '../../atoms';
import { Segmented } from '../Segmented';

import { UsageChart, type UsageChartItem } from './UsageChart';

/** Original-design TOOL_TOTALS (the original usage screen "Tool calls" section), fixed. */
const TOOL_CALLS: UsageChartItem[] = [
  { name: 'fs.read', value: 1840, tone: 'accent' },
  { name: 'fs.edit', value: 1120, tone: 'primary' },
  { name: 'shell', value: 690, tone: 'gold' },
  { name: 'git', value: 420, tone: 'info' },
  { name: 'tests', value: 280, tone: 'success' },
  { name: 'github', value: 210, tone: 'neutral' },
  { name: 'search', value: 174, tone: 'muted' },
];

const TILE_TONES = {
  accent: 'text-accent',
  primary: 'text-primary',
  gold: 'text-gold-500',
} as const;

const agentTile = (tone: keyof typeof TILE_TONES): ReactNode => (
  <div
    className={`flex size-[26px] items-center justify-center rounded-sm bg-current/15 ${TILE_TONES[tone]}`}
  >
    <Icon name="bot" size={13} />
  </div>
);

/** Original-design AGENT_USAGE (the original usage screen "Spend by agent"), fixed. */
const AGENT_SPEND: UsageChartItem[] = [
  {
    name: 'the-profiler',
    value: 9.86,
    displayValue: '$9.86',
    tone: 'gold',
    decoration: agentTile('gold'),
    meta: '28 runs',
    columns: ['318k'],
  },
  {
    name: 'the-architect',
    value: 8.31,
    displayValue: '$8.31',
    tone: 'accent',
    decoration: agentTile('accent'),
    meta: '14 runs',
    columns: ['268k'],
  },
  {
    name: 'the-refactorer',
    value: 5.15,
    displayValue: '$5.15',
    tone: 'primary',
    decoration: agentTile('primary'),
    meta: '42 runs',
    columns: ['412k'],
  },
  {
    name: 'the-investigator',
    value: 2.48,
    displayValue: '$2.48',
    tone: 'primary',
    decoration: agentTile('primary'),
    meta: '22 runs',
    columns: ['198k'],
  },
  {
    name: 'the-writer',
    value: 1.63,
    displayValue: '$1.63',
    tone: 'accent',
    decoration: agentTile('accent'),
    meta: '36 runs',
    columns: ['144k'],
  },
];

const meta = {
  title: 'Molecules/UsageChart',
  component: UsageChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UsageChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Simple usage mode — the original "Tool calls" section (the original usage screen): name /
 * bar / value rows, bars scaled to the list max. Spec-driven divergence
 * from the original design: the usage variant draws NO gray track (raw
 * ToolBars always drew one; per spec only progress shows it).
 */
export const SimpleUsage: Story = {
  args: {
    title: 'Tool calls',
    subtitle: '4,734 calls',
    items: TOOL_CALLS,
    locale: 'en-US',
  },
};

/**
 * Progress variant — `total` is required (spec; dev-warned when
 * missing) and the bar reads value/total on the spec's gray track.
 */
export const SimpleProgress: Story = {
  args: {
    title: 'Token budgets',
    subtitle: 'per agent, this month',
    variant: 'progress',
    total: 500_000,
    items: [
      { name: 'the-refactorer', value: 412_000, displayValue: '412k', tone: 'accent' },
      { name: 'the-profiler', value: 318_000, displayValue: '318k', tone: 'accent' },
      { name: 'the-architect', value: 268_000, displayValue: '268k', tone: 'accent' },
      { name: 'the-editor', value: 174_000, displayValue: '174k', tone: 'accent' },
    ],
    locale: 'en-US',
  },
};

/**
 * Progress past 100% — the spec asks for a treatment the original design
 * lacks. Design decision: the track re-scales so full width = the value,
 * the fill turns danger, a contrast tick marks where the goal (100%)
 * sits, and the overflow region past it renders dimmed; the value
 * accents danger.
 */
export const ProgressOverflow: Story = {
  args: {
    title: 'Token budgets',
    subtitle: 'per agent, this month',
    variant: 'progress',
    total: 500_000,
    items: [
      { name: 'the-refactorer', value: 750_000, displayValue: '750k (150%)', tone: 'accent' },
      { name: 'the-profiler', value: 505_000, displayValue: '505k (101%)', tone: 'accent' },
      { name: 'the-architect', value: 268_000, displayValue: '268k', tone: 'accent' },
    ],
    locale: 'en-US',
  },
};

/**
 * Degenerate progress: `total={0}` (dev-warned — the spec requires a
 * non-zero total). Positive values render as the full-overflow state
 * (all-dimmed danger, goal tick at 0) instead of a silently empty
 * track; zero values stay empty.
 */
export const ProgressZeroTotal: Story = {
  args: {
    title: 'Token budgets',
    subtitle: 'misconfigured — no quota set',
    variant: 'progress',
    total: 0,
    items: [
      { name: 'the-refactorer', value: 412_000, displayValue: '412k', tone: 'accent' },
      { name: 'the-idler', value: 0, displayValue: '0', tone: 'accent' },
    ],
    locale: 'en-US',
  },
};

/**
 * Multi mode — the original "Spend by agent" section: decoration column,
 * condensed name+meta over a thin bar, bold value, free extra columns
 * (tokens). Header `action` carries the filter selector. Spec-driven
 * divergence from the original design: the VALUE is the 3rd static column and
 * free columns follow it (the original page rendered tokens before cost);
 * and the usage bars drop the original sunk track (progress-only per spec).
 */
export const Multi: Story = {
  args: {
    title: 'Spend by agent',
    subtitle: '8 active',
    mode: 'multi',
    items: AGENT_SPEND,
    locale: 'en-US',
    action: (
      <Segmented
        index={0}
        items={[
          { key: 'cost', label: '$' },
          { key: 'tokens', label: 'tokens' },
          { key: 'runs', label: 'runs' },
        ]}
      />
    ),
  },
};

/**
 * Single-line variant (usage only, per spec): one segmented bar and a
 * 2-column `[color] {text} {value}` legend — the Sessions view's "Tool
 * calls" card (the sessions-page spec).
 */
export const SingleLine: Story = {
  args: {
    title: 'Tool calls',
    subtitle: 'this session',
    mode: 'single',
    items: TOOL_CALLS.slice(0, 6),
    locale: 'en-US',
  },
};

/** Footer line with divider (spec: footer supports a divider prop). */
export const WithFooter: Story = {
  args: {
    title: 'Tool calls',
    items: TOOL_CALLS.slice(0, 4),
    locale: 'en-US',
    footer: 'Counts include retries.',
    footerDivider: true,
  },
};

/** Long names truncate; the full text stays reachable via title attr. */
export const Truncation: Story = {
  args: {
    title: 'Endpoints',
    items: [
      { name: 'workspace-orchestrator.sessions.list-with-filters', value: 840, tone: 'accent' },
      { name: 'api.tools.invoke', value: 512, tone: 'info' },
      { name: 'short', value: 230, tone: 'muted' },
    ],
    locale: 'en-US',
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
