/**
 * @packageDocumentation
 * The digest's time-window filter — the one control on this surface
 * whose value is not a column to match but a cutoff to measure
 * against.
 *
 * It lives here rather than in `../filters` for the reason that module
 * states about itself: `filterBySelect` compares a row's value to the
 * chosen one, and no comparison of `createdAt` to `24h` is ever going
 * to be equality. Exactly one page wants this today, so generalising
 * it before a second caller exists would be a shape guessed rather
 * than observed.
 *
 * ## Measured against a passed clock
 *
 * {@link withinTimeWindow} takes `now` rather than reading the wall
 * clock, and the page passes `FIXTURE_NOW` — the same constant every
 * relative-time cell is rendered against. Fixtures dated against a
 * fixed instant and filtered against a moving one would disagree the
 * day after the fixtures were written: a row reading `8 hours ago`
 * would drop out of the 24-hour window while still saying it.
 *
 * That also makes this module a pure function of its arguments, which
 * is what the node-environment unit suite can reach.
 *
 * ## An unrecognised window filters nothing
 *
 * The value arrives from the URL, so it can be anything. `Select`
 * falls back to its FIRST option when the value it holds matches none
 * of them, which means a hand-edited `?window=nonsense` renders a
 * control reading `Any time` — so this answers what that control
 * says and lets every row through.
 *
 * That is a deliberate disagreement with `matchesSelect`, where an
 * unoffered value passes nothing and the page empties beneath a
 * control claiming to filter nothing. The two rules differ because
 * the values do: there is no cutoff to apply for a window nothing
 * names, where an equality filter always has a comparison to make.
 */

import type { SelectOption } from '@ar/ui';

import { ALL_FILTER_VALUE, withAllOption } from '../filters';

/** Milliseconds in an hour — the unit every window is written in. */
const HOUR_MS = 60 * 60 * 1000;

/** Hours in a day, so the windows below read as the spans they are. */
const DAY_HOURS = 24;

/** One span an operator can narrow the digest to. */
export interface TimeWindow {
  /** What the URL carries, and what the select holds. */
  readonly value: string;
  /** What the control reads. */
  readonly label: string;
  /** How far back it reaches from the reference clock. */
  readonly hours: number;
}

/**
 * The spans this surface offers, widest last.
 *
 * Three rather than one per plausible span: a digest is read to see
 * what has arrived since the operator last looked, so the useful
 * question is `today`, `this week` or `this month` and anything
 * finer is a date range the toolbar has no room for.
 *
 * The unfiltered state is NOT a member — it is `ALL_FILTER_VALUE`,
 * added as the leading option by {@link TIME_WINDOW_OPTIONS} — so that
 * every filter select on this page agrees on the one value that is
 * never written to the URL.
 */
export const TIME_WINDOWS: readonly TimeWindow[] = [
  { value: '24h', label: 'Last 24 hours', hours: DAY_HOURS },
  { value: '7d', label: 'Last 7 days', hours: DAY_HOURS * 7 },
  { value: '30d', label: 'Last 30 days', hours: DAY_HOURS * 30 },
];

const WINDOWS_BY_VALUE = new Map<string, TimeWindow>(
  TIME_WINDOWS.map((window) => [window.value, window]),
);

/**
 * The select's options, led by the one that filters nothing.
 *
 * Built once rather than per render: the spans are static, and
 * `Select` only reads the array it is given.
 */
export const TIME_WINDOW_OPTIONS: SelectOption[] = withAllOption(
  'Any time',
  TIME_WINDOWS.map((window) => ({
    value: window.value,
    label: window.label,
  })),
);

/**
 * Whether a timestamp falls inside the chosen window.
 *
 * A stamp AHEAD of the reference clock passes every window, because a
 * negative age is inside any cutoff. That is the reading a digest
 * wants — something dated in the future is as new as it gets — and it
 * is why the comparison is signed rather than taken as a magnitude.
 *
 * @param stamp - The row's timestamp, ISO.
 * @param selected - What the window select currently holds.
 * @param now - The reference clock, ISO.
 * @returns Whether the row passes.
 */
export function withinTimeWindow(
  stamp: string,
  selected: string,
  now: string,
): boolean {
  if (selected === ALL_FILTER_VALUE) {
    return true;
  }

  const window = WINDOWS_BY_VALUE.get(selected);

  if (window === undefined) {
    return true;
  }

  return Date.parse(now) - Date.parse(stamp) <= window.hours * HOUR_MS;
}
