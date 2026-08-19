import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { FormattedCurrency } from './FormattedCurrency';
import { FormattedDate } from './FormattedDate';
import { FormattedDuration } from './FormattedDuration';
import { FormattedPercentage } from './FormattedPercentage';
import { FormattedRelativeTime } from './FormattedRelativeTime';
import { FormattedValue } from './FormattedValue';
import { HumanReadableValue } from './HumanReadableValue';

/**
 * Deterministic fixtures: every story pins locale + reference dates so the
 * visual baselines never depend on the machine's clock, locale, or zone.
 */
const LOCALE = 'en-US';
const REF_NOW = new Date(2026, 6, 22, 15, 0, 0);
const SAME_DAY = new Date(2026, 6, 22, 9, 5, 0);
const CROSSED_MIDNIGHT = new Date(2026, 6, 21, 22, 0, 0);
const YESTERDAY = new Date(2026, 6, 21, 9, 0, 0);
const THREE_DAYS_AGO = new Date(2026, 6, 19, 9, 0, 0);
const LAST_WEEK = new Date(2026, 6, 13, 9, 0, 0);
const THREE_WEEKS_AGO = new Date(2026, 6, 1, 9, 0, 0);
const LAST_MONTH = new Date(2026, 5, 10, 9, 0, 0);
const SIX_MONTHS_AGO = new Date(2026, 0, 10, 9, 0, 0);
const LAST_YEAR = new Date(2025, 5, 10, 9, 0, 0);
const THREE_YEARS_AGO = new Date(2023, 5, 10, 9, 0, 0);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline gap-3 text-sm text-fg2">
    <span className="w-44 shrink-0 font-mono text-[11px] text-fg3">
      {label}
    </span>
    {children}
  </div>
);

/** Render-only stories still need args (the dispatcher's props are required). */
const BASE_ARGS = { type: 'number', value: 0, locale: LOCALE } as const;

const meta = {
  title: 'Atoms/Formatted',
  component: FormattedValue,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof FormattedValue>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Spec: FormattedValue dispatches to the right family member by `type` —
 * the contract self-describing tables and generated cards format through.
 */
export const Default: Story = {
  args: { type: 'number', value: 8240, unit: 'tokens', locale: LOCALE },
};

/** Spec: value + small greyed unit suffix; `short` compacts (default). */
export const HumanReadable: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="short (default)">
        <HumanReadableValue value={8240} unit="tokens" locale={LOCALE} />
      </Row>
      <Row label="short=false">
        <HumanReadableValue value={8240} unit="tokens" short={false} locale={LOCALE} />
      </Row>
      <Row label="no unit">
        <HumanReadableValue value={128} locale={LOCALE} />
      </Row>
      <Row label="size=sm / md / lg">
        <HumanReadableValue value={12500} unit="runs" size="sm" locale={LOCALE} />
        <HumanReadableValue value={12500} unit="runs" size="md" locale={LOCALE} />
        <HumanReadableValue value={12500} unit="runs" size="lg" locale={LOCALE} />
      </Row>
    </div>
  ),
};

/**
 * Spec: currency + value, symbol on the left, bold; `precision` defaults
 * to 2; `short` switches to compact human-readable.
 */
export const Currency: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="usd, default precision">
        <FormattedCurrency value={1234.5} currency="usd" locale={LOCALE} />
      </Row>
      <Row label="precision=0">
        <FormattedCurrency value={1234.5} currency="usd" precision={0} locale={LOCALE} />
      </Row>
      <Row label="short">
        <FormattedCurrency value={1234.5} currency="usd" short locale={LOCALE} />
      </Row>
      <Row label="eur">
        <FormattedCurrency value={99.9} currency="eur" locale={LOCALE} />
      </Row>
      <Row label="ars">
        <FormattedCurrency value={420000} currency="ars" locale={LOCALE} />
      </Row>
    </div>
  ),
};

/** Spec: required ratio|raw mode — 0.1 and 10 both read 10%. */
export const Percentage: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="ratio: 0.1">
        <FormattedPercentage value={0.1} mode="ratio" locale={LOCALE} />
      </Row>
      <Row label="raw: 10">
        <FormattedPercentage value={10} mode="raw" locale={LOCALE} />
      </Row>
      <Row label="signed, precision=1">
        <FormattedPercentage value={0.153} mode="ratio" signed precision={1} locale={LOCALE} />
      </Row>
      <Row label="signed negative">
        <FormattedPercentage value={-0.3} mode="ratio" signed locale={LOCALE} />
      </Row>
    </div>
  ),
};

/** Spec: locale priority is the explicit prop → browser → system. */
export const DateStory: Story = {
  name: 'Date',
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="en-US, medium">
        <FormattedDate date={SAME_DAY} locale={LOCALE} />
      </Row>
      <Row label="en-US, full">
        <FormattedDate date={SAME_DAY} dateStyle="full" locale={LOCALE} />
      </Row>
      <Row label="de-DE">
        <FormattedDate date={SAME_DAY} locale="de-DE" />
      </Row>
      <Row label="es-AR, long">
        <FormattedDate date={SAME_DAY} dateStyle="long" locale="es-AR" />
      </Row>
    </div>
  ),
};

/**
 * Date-only ISO strings are LOCAL calendar dates: `"2026-05-04"` renders
 * May 4 in every timezone (naive `new Date` parsing would read it as UTC
 * midnight and show May 3 in negative-UTC-offset zones). Datetime
 * strings keep standard parsing.
 */
export const DateOnlyString: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label='"2026-05-04" (date-only)'>
        <FormattedDate date="2026-05-04" locale={LOCALE} />
      </Row>
      <Row label='"2026-05-04T12:00:00" (datetime)'>
        <FormattedDate date="2026-05-04T12:00:00" locale={LOCALE} />
      </Row>
    </div>
  ),
};

/** Spec: date range or total seconds → `1h 3m 10s`; zero units omitted. */
export const Duration: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="seconds=3790">
        <FormattedDuration seconds={3790} />
      </Row>
      <Row label="seconds=3610">
        <FormattedDuration seconds={3610} />
      </Row>
      <Row label="seconds=42">
        <FormattedDuration seconds={42} />
      </Row>
      <Row label="seconds=0">
        <FormattedDuration seconds={0} />
      </Row>
      <Row label="range (1d 1h 3m 10s)">
        <FormattedDuration
          from={new Date(2026, 6, 21, 10, 0, 0)}
          to={new Date(2026, 6, 22, 11, 3, 10)}
        />
      </Row>
    </div>
  ),
};

/**
 * Spec ladder: same-day `hh:mm` → hours ago → yesterday → days ago →
 * last week → weeks ago → last month → months ago → last year → years
 * ago. `now` is pinned so the story is deterministic.
 */
export const RelativeTime: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="same day">
        <FormattedRelativeTime date={SAME_DAY} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="crossed midnight, <24h">
        <FormattedRelativeTime date={CROSSED_MIDNIGHT} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="yesterday">
        <FormattedRelativeTime date={YESTERDAY} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="3 days ago">
        <FormattedRelativeTime date={THREE_DAYS_AGO} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="last week">
        <FormattedRelativeTime date={LAST_WEEK} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="3 weeks ago">
        <FormattedRelativeTime date={THREE_WEEKS_AGO} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="last month">
        <FormattedRelativeTime date={LAST_MONTH} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="6 months ago">
        <FormattedRelativeTime date={SIX_MONTHS_AGO} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="last year">
        <FormattedRelativeTime date={LAST_YEAR} now={REF_NOW} locale={LOCALE} />
      </Row>
      <Row label="3 years ago">
        <FormattedRelativeTime date={THREE_YEARS_AGO} now={REF_NOW} locale={LOCALE} />
      </Row>
    </div>
  ),
};

/** Every discriminant of the dispatcher, one per row. */
export const Dispatch: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-2">
      <Row label="type=number">
        <FormattedValue type="number" value={8240} unit="tokens" locale={LOCALE} />
      </Row>
      <Row label="type=currency">
        <FormattedValue type="currency" value={12.4} currency="usd" locale={LOCALE} />
      </Row>
      <Row label="type=percentage">
        <FormattedValue type="percentage" value={0.62} mode="ratio" locale={LOCALE} />
      </Row>
      <Row label="type=date">
        <FormattedValue type="date" date={SAME_DAY} locale={LOCALE} />
      </Row>
      <Row label="type=duration">
        <FormattedValue type="duration" seconds={3790} />
      </Row>
      <Row label="type=relative-time">
        <FormattedValue
          type="relative-time"
          date={YESTERDAY}
          now={REF_NOW}
          locale={LOCALE}
        />
      </Row>
    </div>
  ),
};
