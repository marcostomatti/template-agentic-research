/**
 * Intl-based formatter utility — the single i18n/l10n seam behind the
 * Formatted* display family (spec-defined). No third-party
 * dependencies: everything builds on Intl.NumberFormat,
 * Intl.DateTimeFormat and Intl.RelativeTimeFormat.
 *
 * Locale priority (spec): explicit argument (Settings locale) → browser
 * locale → system locale.
 */
import { devWarn } from './dev';

/** Anything a caller may hold a date as. */
export type DateInput = Date | string | number;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize a DateInput to a Date. Date-only ISO strings
 * (`"2026-05-04"`) are treated as LOCAL calendar dates (local midnight):
 * per ECMA-262 `new Date("2026-05-04")` parses as UTC midnight, so local
 * getters downstream (FormattedDate, CalendarHeatmap day bucketing)
 * would report the previous day in negative-UTC-offset timezones.
 * Datetime strings and epoch numbers keep standard `Date` parsing.
 */
export const toDate = (input: DateInput): Date => {
  if (input instanceof Date) return input;
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    const [year, month, day] = input.split('-').map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  }
  return new Date(input);
};

export const resolveLocale = (explicit?: string): string => {
  if (explicit) return explicit;
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return new Intl.DateTimeFormat().resolvedOptions().locale;
};

export interface FormatNumberOptions {
  locale?: string;
  /** Compact human-readable notation (`12.5K`). */
  short?: boolean;
  /** Max fraction digits. Defaults: 1 when short, 0 otherwise. */
  precision?: number;
}

export const formatNumber = (
  value: number,
  { locale, short = false, precision }: FormatNumberOptions = {},
): string => new Intl.NumberFormat(resolveLocale(locale), {
  notation: short
    ? 'compact'
    : 'standard',
  maximumFractionDigits: precision ?? (short
    ? 1
    : 0),
}).format(value);

export interface FormatCurrencyOptions {
  /** Fraction digits shown. Spec default: 2. Ignored when `short`. */
  precision?: number;
  /** Compact human-readable notation (`$1.2K`). */
  short?: boolean;
  locale?: string;
}

export const formatCurrency = (
  value: number,
  currency: string,
  { precision = 2, short = false, locale }: FormatCurrencyOptions = {},
): string => new Intl.NumberFormat(resolveLocale(locale), {
  style: 'currency',
  currency: currency.toUpperCase(),
  ...(short
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }),
}).format(value);

export interface FormatPercentageOptions {
  /**
   * Required by spec: `ratio` reads 0.1 as 10%, `raw` reads 10 as 10%.
   */
  mode: 'ratio' | 'raw';
  /** Max fraction digits (default 0). */
  precision?: number;
  /** Prepend an explicit +/- sign on non-zero values. */
  signed?: boolean;
  locale?: string;
}

export const formatPercentage = (
  value: number,
  { mode, precision = 0, signed = false, locale }: FormatPercentageOptions,
): string => new Intl.NumberFormat(resolveLocale(locale), {
  style: 'percent',
  maximumFractionDigits: precision,
  signDisplay: signed
    ? 'exceptZero'
    : 'auto',
}).format(mode === 'raw'
  ? value / 100
  : value);

const SECONDS_PER = { d: 86_400, h: 3_600, m: 60, s: 1 } as const;

export type DurationInput = number | { from: DateInput; to: DateInput };

/**
 * `1h 3m 10s` from a total of seconds or a date range. Zero units are
 * omitted (`3670s` → `1h 1m 10s`, `3610s` → `1h 10s`); a zero duration
 * reads `0s`. Sub-second precision is dropped.
 *
 * Negative input (negative seconds, or a range whose `to` precedes `from` —
 * usually swapped arguments) is deliberately lenient: it CLAMPS to `0s`
 * rather than throwing, and emits a dev-only console.warn so the mistake
 * surfaces during development without breaking production rendering.
 */
export const formatDuration = (input: DurationInput): string => {
  const total = typeof input === 'number'
    ? input
    : (toDate(input.to).getTime() - toDate(input.from).getTime()) / 1_000;
  if (total < 0) {
    devWarn(typeof input === 'number'
      ? `formatDuration: negative seconds (${input}) clamped to 0s`
      : 'formatDuration: range ends before it starts (swapped from/to?) — clamped to 0s');
  }
  let rest = Math.max(0, Math.floor(total));
  const parts: string[] = [];
  for (const [unit, seconds] of Object.entries(SECONDS_PER)) {
    const count = Math.floor(rest / seconds);
    rest -= count * seconds;
    if (count > 0) parts.push(`${count}${unit}`);
  }
  return parts.length > 0
    ? parts.join(' ')
    : '0s';
};

export interface FormatDateOptions {
  locale?: string;
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
}

export const formatDate = (
  input: DateInput,
  { locale, dateStyle = 'medium' }: FormatDateOptions = {},
): string => new Intl.DateTimeFormat(resolveLocale(locale), { dateStyle }).format(toDate(input));

/** `hh:mm` in the locale's clock. */
export const formatTime = (input: DateInput, locale?: string): string => new Intl.DateTimeFormat(resolveLocale(locale), {
  hour: '2-digit',
  minute: '2-digit',
}).format(toDate(input));

export interface FormatRelativeTimeOptions {
  locale?: string;
  /** Reference "now" — inject a fixed date for deterministic output. */
  now?: DateInput;
}

const isSameCalendarDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

const AVG_DAYS_PER_MONTH = 30.44;
const AVG_DAYS_PER_YEAR = 365.25;
const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 3_600_000;

/**
 * Relative-time ladder (spec): same calendar day → `hh:mm`; then
 * `6 hours ago` (crossed midnight but <24h) → `yesterday` → `x days ago` →
 * `last week` → `x weeks ago` → `last month` → `x months ago` →
 * `last year` → `x years ago`. Month/year buckets use average lengths
 * (30.44 / 365.25 days). Future dates mirror the ladder (`tomorrow`,
 * `in 3 days`, …) via Intl.RelativeTimeFormat's sign handling.
 */
export const formatRelativeTime = (
  input: DateInput,
  { locale, now }: FormatRelativeTimeOptions = {},
): string => {
  const date = toDate(input);
  const ref = now != null
    ? toDate(now)
    : new Date();
  if (isSameCalendarDay(date, ref)) return formatTime(date, locale);

  const rtf = new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: 'auto' });
  const diffMs = date.getTime() - ref.getTime();
  const sign = diffMs < 0
    ? -1
    : 1;
  const hours = Math.abs(diffMs) / MS_PER_HOUR;
  if (hours < HOURS_PER_DAY) return rtf.format(sign * Math.max(1, Math.floor(hours)), 'hour');

  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days < DAYS_PER_WEEK) return rtf.format(sign * days, 'day');

  const months = Math.floor(days / AVG_DAYS_PER_MONTH);
  if (months < 1) return rtf.format(sign * Math.floor(days / DAYS_PER_WEEK), 'week');

  const years = Math.floor(days / AVG_DAYS_PER_YEAR);
  if (years < 1) return rtf.format(sign * months, 'month');

  return rtf.format(sign * years, 'year');
};
