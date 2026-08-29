import { describe, expect, it } from 'vitest';

import { repeated } from '../../test-support/repeated';
import { ALL_FILTER_VALUE } from '../filters';

import {
  TIME_WINDOWS,
  TIME_WINDOW_OPTIONS,
  withinTimeWindow,
} from './timeWindow';

/**
 * The clock every case below measures against.
 *
 * A literal rather than `FIXTURE_NOW`: this module takes its reference
 * instant as an argument precisely so it is not tied to the fixtures,
 * and a test reading the fixture clock would stop saying so.
 */
const NOW = '2026-06-11T14:30:00.000Z';

/** Milliseconds in an hour, for building a stamp of a given age. */
const HOUR_MS = 60 * 60 * 1000;

/**
 * A stamp exactly `hours` before {@link NOW}.
 *
 * @param hours - How far back, negative for the future.
 * @returns The ISO stamp.
 */
function ago(hours: number): string {
  return new Date(Date.parse(NOW) - hours * HOUR_MS).toISOString();
}

describe('TIME_WINDOWS', () => {
  it('offers spans, widest last', () => {
    // The non-emptiness guard every whole-table claim below rests on,
    // plus the ordering the control renders in: an empty table would
    // satisfy the distinctness and sentinel claims at once.
    // Arrange / Act
    const hours = TIME_WINDOWS.map((window) => window.hours);

    // Assert
    expect(TIME_WINDOWS).not.toHaveLength(0);
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
  });

  it('gives every span a distinct value', () => {
    // A duplicate value renders a second, unreachable radio item in
    // `Select` rather than an error.
    // Arrange / Act
    const values = TIME_WINDOWS.map((window) => window.value);

    // Assert
    expect(repeated(values)).toEqual([]);
  });

  it('never names a span with the unfiltered sentinel', () => {
    // The leading option carries that value. A span claiming it too
    // would be the same duplicate, and the window would read as
    // filtering nothing while naming a cutoff.
    // Arrange / Act
    const clashing = TIME_WINDOWS
      .filter((window) => window.value === ALL_FILTER_VALUE);

    // Assert
    expect(clashing).toEqual([]);
  });

  it('never leaves a label empty', () => {
    // Arrange / Act
    const blank = TIME_WINDOWS.filter((window) => window.label.trim() === '');

    // Assert
    expect(blank).toEqual([]);
  });
});

describe('TIME_WINDOW_OPTIONS', () => {
  it('leads with the option that filters nothing', () => {
    // Compared against the sentinel itself rather than against the
    // string, because the whole point of routing this through
    // `withAllOption` is that the page's fallback and the control's
    // first option are one value.
    // Arrange / Act
    const [first] = TIME_WINDOW_OPTIONS;

    // Assert
    expect(first?.value).toBe(ALL_FILTER_VALUE);
  });

  it('then offers every span, in table order', () => {
    // Arrange / Act
    const values = TIME_WINDOW_OPTIONS.slice(1).map((option) => option.value);

    // Assert
    expect(values).toEqual(TIME_WINDOWS.map((window) => window.value));
  });
});

describe('withinTimeWindow', () => {
  it('passes every row while the control filters nothing', () => {
    // Arrange
    const stamps = ['2020-01-01T00:00:00.000Z', ago(1), ago(24 * 400)];

    // Act
    const passed = stamps
      .filter((stamp) => withinTimeWindow(stamp, ALL_FILTER_VALUE, NOW));

    // Assert
    expect(passed).toEqual(stamps);
  });

  it('passes every row for a window nothing names', () => {
    // What a hand-edited URL reaches: the control shows its first
    // option, so the rows must agree with it. See the module header on
    // why this differs from `matchesSelect`.
    // Arrange / Act / Assert
    expect(withinTimeWindow(ago(24 * 400), 'nonsense', NOW)).toBe(true);
  });

  it('keeps a row inside the chosen span', () => {
    // Arrange / Act / Assert
    expect(withinTimeWindow(ago(6), '24h', NOW)).toBe(true);
  });

  it('drops a row older than the chosen span', () => {
    // The leg that separates a real cutoff from a function returning
    // true: without it every case above passes over `return true`.
    // Arrange / Act / Assert
    expect(withinTimeWindow(ago(30), '24h', NOW)).toBe(false);
  });

  it('keeps a row landing exactly on the cutoff', () => {
    // `<=` rather than `<`, asserted at the boundary because that is
    // the only place the two differ.
    // Arrange / Act / Assert
    expect(withinTimeWindow(ago(24), '24h', NOW)).toBe(true);
  });

  it('drops a row one millisecond past the cutoff', () => {
    // The other side of the same boundary, so widening the comparison
    // is caught as well as narrowing it.
    // Arrange
    const stamp = new Date(Date.parse(ago(24)) - 1).toISOString();

    // Act / Assert
    expect(withinTimeWindow(stamp, '24h', NOW)).toBe(false);
  });

  it('keeps a row dated after the reference clock', () => {
    // A negative age is inside every cutoff, which is the reading the
    // header states — and the case a magnitude comparison would fail.
    // Arrange / Act / Assert
    expect(withinTimeWindow(ago(-3), '24h', NOW)).toBe(true);
  });

  it('measures each span against its own hours', () => {
    // One stamp, every span: the row sits between the narrowest and
    // the widest, so a table reading the wrong `hours` — or the same
    // one for every span — reddens here rather than in one case.
    // Arrange
    const stamp = ago(24 * 10);

    // Act
    const passed = TIME_WINDOWS
      .filter((window) => withinTimeWindow(stamp, window.value, NOW))
      .map((window) => window.value);

    // Assert
    expect(passed).toEqual(['30d']);
  });
});
