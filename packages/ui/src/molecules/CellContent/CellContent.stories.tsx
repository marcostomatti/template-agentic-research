import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { Avatar } from '../../atoms/Avatar';
import { Badge } from '../../atoms/Badge';
import { FormattedCurrency } from '../../atoms/Formatted/FormattedCurrency';
import { FormattedDate } from '../../atoms/Formatted/FormattedDate';
import { Icon } from '../../atoms/Icon';

import { CellBar } from './CellBar';
import { CellDecoration } from './CellDecoration';
import { CellDoubleLine } from './CellDoubleLine';
import { CellLabel } from './CellLabel';
import { CellStatus } from './CellStatus';
import { CellValue } from './CellValue';
import { SpendOverTime } from './SpendOverTime';
import { TokensConsumption, TokensProgress } from './TokensConsumption';

/**
 * Deterministic fixtures — fixed locale + reference dates so visual
 * baselines never depend on the machine's clock or locale.
 */
const LOCALE = 'en-US';
const REF_NOW = new Date(2026, 6, 22, 15, 0, 0);
const TODAY_NOON = new Date(2026, 6, 22, 12, 4, 0);
const YESTERDAY = new Date(2026, 6, 21, 9, 0, 0);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-3 text-sm text-fg2">
    <span className="w-44 shrink-0 font-mono text-[11px] text-fg3">
      {label}
    </span>
    <div className="w-56">{children}</div>
  </div>
);

const meta = {
  title: 'Molecules/CellContent',
  component: CellValue,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof CellValue>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Spec: Value with unit — right aligned, value accentuated, unit greyed,
 * human readable. Plain Value takes pre-formatted children instead
 * (currency, date, time).
 */
export const Value: Story = {
  args: { value: 184200, unit: 'tokens', locale: LOCALE },
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="value + unit (end)">
        <CellValue value={184200} unit="tokens" locale={LOCALE} />
      </Row>
      <Row label="value only">
        <CellValue value={128} locale={LOCALE} />
      </Row>
      <Row label="pre-formatted currency">
        <CellValue>
          <FormattedCurrency value={0.42} currency="usd" locale={LOCALE} size="sm" />
        </CellValue>
      </Row>
      <Row label="pre-formatted date, start">
        <CellValue align="start">
          <FormattedDate date={YESTERDAY} locale={LOCALE} />
        </CellValue>
      </Row>
    </div>
  ),
};

/**
 * Spec: Decoration — avatar / icon / badge slot; when a row has one it
 * must be the FIRST column (documented on the component).
 */
export const Decoration: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="avatar">
        <CellDecoration>
          <Avatar name="Sam Lin" size="sm" status="none" />
        </CellDecoration>
      </Row>
      <Row label="icon tile">
        <CellDecoration>
          <Icon name="bot" size={14} accent="accent" bg="accent" />
        </CellDecoration>
      </Row>
      <Row label="badge">
        <CellDecoration>
          <Badge tone="info" size="sm">done</Badge>
        </CellDecoration>
      </Row>
    </div>
  ),
};

/** Spec: DoubleLine — short accentuated name over a truncating subtitle. */
export const DoubleLine: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="name + subtitle">
        <CellDoubleLine title="auth-refactor" subtitle="agent-7d2f · feat/jwt-sessions" />
      </Row>
      <Row label="truncating subtitle">
        <CellDoubleLine
          title="schema-migration"
          subtitle="a very long subtitle that will not fit the column and truncates with an ellipsis"
        />
      </Row>
    </div>
  ),
};

/**
 * Spec: Status — ok / warn / err / info / disabled tones; rounded /
 * square / icon formats; optional text.
 */
export const Status: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="rounded + text">
        <div className="flex gap-4">
          <CellStatus tone="ok" text="running" pulse />
          <CellStatus tone="warn" text="waiting" />
        </div>
      </Row>
      <Row label="square + text">
        <div className="flex gap-4">
          <CellStatus tone="err" format="square" text="failed" />
          <CellStatus tone="info" format="square" text="done" />
        </div>
      </Row>
      <Row label="icon format">
        <div className="flex gap-4">
          <CellStatus tone="ok" format="icon" text="passed" />
          <CellStatus tone="err" format="icon" text="failed" />
          <CellStatus tone="disabled" format="icon" text="disabled" />
        </div>
      </Row>
      <Row label="indicator only">
        <div className="flex gap-4">
          <CellStatus tone="ok" />
          <CellStatus tone="warn" />
          <CellStatus tone="err" />
          <CellStatus tone="info" />
          <CellStatus tone="disabled" />
        </div>
      </Row>
    </div>
  ),
};

/**
 * Spec: Label — accent-colored label format with array support. The soft
 * background variant mirrors the Overview "Top 5" rank labels.
 */
export const Label: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="single, accent">
        <CellLabel labels="running" tone="success" />
      </Row>
      <Row label="rank, soft bg">
        <CellLabel labels="01" tone="accent" bg="soft" />
      </Row>
      <Row label="array, per-label tone">
        <CellLabel
          labels={[
            { text: 'done', tone: 'info' },
            { text: 'failed', tone: 'danger' },
            { text: 'ui · feat', tone: 'muted' },
          ]}
        />
      </Row>
    </div>
  ),
};

/**
 * Spec: Bar indicator — the UsageChart bar re-used as cell content, with
 * `mini` (5px) and `regular` (10px) stroke variants; `track` adds the
 * progress-variant gray background.
 */
export const BarIndicator: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="regular">
        <CellBar ratio={0.62} tone="accent" />
      </Row>
      <Row label="mini + track">
        <CellBar ratio={0.62} stroke="mini" track />
      </Row>
      <Row label="mini, overflow >100%">
        <CellBar ratio={1.24} stroke="mini" track />
      </Row>
    </div>
  ),
};

/**
 * Spec: tokens-consumption — bold FULL used number, greyed human-readable
 * quota; tokens-progress stacks the mini bar below, green below 45%,
 * yellow from 45%, red from 85% (threshold cutoffs are a documented spec
 * interpretation). Spec-over-original: the original Sessions table colors this bar
 * by session status; the spec's consumption thresholds win.
 */
export const Tokens: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="consumption">
        <TokensConsumption used={8240} quota={50000} locale={LOCALE} />
      </Row>
      <Row label="progress, low (green)">
        <TokensProgress used={8240} quota={50000} locale={LOCALE} />
      </Row>
      <Row label="progress, ~50% (yellow)">
        <TokensProgress used={27450} quota={50000} locale={LOCALE} />
      </Row>
      <Row label="progress, ~100% (red)">
        <TokensProgress used={48900} quota={50000} locale={LOCALE} />
      </Row>
      <Row label="progress, over quota">
        <TokensProgress used={61000} quota={50000} locale={LOCALE} />
      </Row>
    </div>
  ),
};

/**
 * Spec: spend-over-time — FormattedCurrency over a smaller greyed
 * `FormattedDuration · FormattedRelativeTime` line. Separator note: spec
 * prose writes `-`, the original design renders `·` — the middot wins (DS-wide
 * meta separator).
 */
export const SpendTime: Story = {
  args: { value: 0 },
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="same day (hh:mm)">
        <SpendOverTime
          cost={0.42}
          seconds={437}
          date={TODAY_NOON}
          now={REF_NOW}
          locale={LOCALE}
        />
      </Row>
      <Row label="yesterday">
        <SpendOverTime
          cost={1.92}
          seconds={1104}
          date={YESTERDAY}
          now={REF_NOW}
          locale={LOCALE}
        />
      </Row>
    </div>
  ),
};
