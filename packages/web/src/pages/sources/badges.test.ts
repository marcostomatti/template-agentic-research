import type { SourceStatusBadge } from './badges';
import type { SourceStatus, SourceStatusCounts } from '../../data/sources';

import { describe, expect, it } from 'vitest';

import {
  SOURCES,
  classifySource,
  countSourceStatuses,
} from '../../data/sources';
import { serializeSearchParam } from '../../routes/useSearchParamState';
import { repeated } from '../../test-support/repeated';
import { ALL_FILTER_VALUE, matchesSelect } from '../filters';

import { isStatusPressed, statusBadges, statusPressValue } from './badges';
import { SOURCE_STATUS_FACETS } from './rows';

/**
 * The statuses the row offers, in the order it offers them.
 *
 * Derived from the facet table rather than written out, unlike the
 * typed literal `./rows.test.ts` keeps. That file owns the claim about
 * what the table CONTAINS and what order it runs in; this one is about
 * whether `./badges.ts` derived from it or quietly restated it, and a
 * second literal here would let both files be edited into agreeing
 * about a row the surface no longer draws.
 */
const SURFACE_STATUSES: readonly SourceStatus[] = SOURCE_STATUS_FACETS
  .map((facet) => facet.status);

/**
 * A count per status, all four different.
 *
 * Distinct on purpose: a badge reading the record positionally, or
 * under a neighbour key, then reports another status figure rather
 * than a plausible one. Four equal counts would pass either way.
 */
const DISTINCT_COUNTS: SourceStatusCounts = {
  active: 4,
  failing: 3,
  pending: 2,
  disabled: 1,
};

/**
 * What the counts read once the other controls have left only healthy
 * feeds — three statuses carrying nothing at all.
 */
const ONLY_ACTIVE: SourceStatusCounts = {
  active: 2,
  failing: 0,
  pending: 0,
  disabled: 0,
};

/**
 * A status parameter no badge carries.
 *
 * Reachable from a hand-edited address bar and from a link written
 * against a vocabulary this surface never had.
 */
const UNKNOWN_STATUS = 'banana';

/**
 * The search parameter the status filter owns.
 *
 * Restates the private constant in `./SourcesPage.tsx`, because the
 * one case that reads it is about what the SENTINEL does to a set of
 * params rather than about the key it does it to.
 */
const STATUS_PARAM = 'status';

/**
 * The badge for one status.
 *
 * Throws rather than answering a nullable, so every assertion beneath
 * a call is about a badge that exists. The row is total over the union
 * — the module header says why — so a miss here is this file asking
 * for something that is not a status rather than a state a surface has
 * to render around.
 *
 * @param badges - What {@link statusBadges} answered.
 * @param status - The status wanted.
 * @returns That status badge.
 */
function badgeFor(
  badges: readonly SourceStatusBadge[],
  status: SourceStatus,
): SourceStatusBadge {
  const found = badges.find((badge) => badge.status === status);

  if (found === undefined) {
    throw new Error(`No badge offered for status: ${status}`);
  }

  return found;
}

/**
 * The three states a badge row has to survive.
 *
 * Grouped by state rather than under the export each one drives: they
 * are one claim about a row meeting a count set and a URL that nobody
 * on this surface chose, and each of the three lands on a different
 * function. The per-export blocks below carry the ordinary readings.
 */
describe('the states nobody chooses', () => {
  it('keeps a badge for a status carrying no rows', () => {
    // The row is total over the union: a zero is a reading an operator
    // came for — nothing is failing right now — and not an option to
    // drop.
    // Arrange / Act
    const badges = statusBadges(ONLY_ACTIVE, ALL_FILTER_VALUE);

    // Assert
    expect(badges.map((badge) => badge.status)).toEqual(SURFACE_STATUSES);
    expect(badgeFor(badges, 'failing').count).toBe(0);
    expect(badgeFor(badges, 'active').count).toBe(2);
  });

  it('keeps the pressed badge when the count under it falls to zero', () => {
    // The counts move with every keystroke in the search box, so the
    // PRESSED badge is free to fall to zero. A row that dropped it
    // would leave `?status=failing` in the address with no control
    // able to clear it — the whole reason the row is total.
    // Arrange / Act
    const badges = statusBadges(ONLY_ACTIVE, 'failing');
    const pressed = badgeFor(badges, 'failing');

    // Assert
    expect(pressed.count).toBe(0);
    expect(pressed.pressed).toBe(true);
    // Still the way out, which is what "not stranded" means here.
    expect(pressed.pressValue).toBe(ALL_FILTER_VALUE);
  });

  it('presses nothing for a status value no badge carries', () => {
    // Arrange / Act
    const badges = statusBadges(DISTINCT_COUNTS, UNKNOWN_STATUS);

    // Assert
    expect(badges.map((badge) => badge.pressed)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(isStatusPressed('active', UNKNOWN_STATUS)).toBe(false);

    // Nothing pressed AND nothing left in the table: `matchesSelect`
    // compares exactly, so the row saying nothing is narrowing is
    // wrong here and no other value makes the two disagree. Pinned
    // rather than left implied, because it is the one state where the
    // badges alone do not describe the list.
    const narrowed = SURFACE_STATUSES
      .filter((status) => matchesSelect(status, UNKNOWN_STATUS));

    expect(narrowed).toEqual([]);

    // And the way out: every badge is offering to replace the value,
    // so an operator reaches a real filter with one press.
    expect(badges.map((badge) => badge.pressValue)).toEqual(SURFACE_STATUSES);
  });

  it('clears the filter when the pressed badge is pressed again', () => {
    // Arrange
    const badges = statusBadges(DISTINCT_COUNTS, 'failing');
    const pressed = badgeFor(badges, 'failing');

    // Act
    const written = serializeSearchParam(
      new URLSearchParams(`${STATUS_PARAM}=failing&q=rust`),
      STATUS_PARAM,
      pressed.pressValue,
      ALL_FILTER_VALUE,
    );

    // Assert
    expect(pressed.pressValue).toBe(ALL_FILTER_VALUE);
    expect(statusPressValue('failing', 'failing')).toBe(ALL_FILTER_VALUE);
    // The sentinel DELETES the key rather than writing `?status=all`
    // onto every link the page produces — the whole reason the value
    // is imported from `../filters.ts` instead of spelled here.
    expect(written.has(STATUS_PARAM)).toBe(false);
    // The positive control: a serializer that had quietly stopped
    // answering anything would drop the status key too.
    expect(written.get('q')).toBe('rust');
  });
});

describe('statusBadges', () => {
  it('offers one badge per status, in the order the cells draw them', () => {
    // The derivation, not the table: `./rows.test.ts` owns what
    // `SOURCE_STATUS_FACETS` contains. What this catches is a row that
    // re-sorted or re-worded it, which would put the toolbar and the
    // status column into two vocabularies.
    // Arrange / Act
    const badges = statusBadges(DISTINCT_COUNTS, ALL_FILTER_VALUE);

    // Assert
    expect(badges.map((badge) => badge.status)).toEqual(SURFACE_STATUSES);
    expect(badges.map((badge) => badge.label)).toEqual(
      SOURCE_STATUS_FACETS.map((facet) => facet.label),
    );
    expect(repeated(badges.map((badge) => badge.status))).toEqual([]);
    // Vacuity guard: an empty facet table would satisfy every line
    // above it.
    expect(badges.length).toBeGreaterThan(1);
  });

  it('leaves the count out of the label it draws', () => {
    // Unlike `statusOptions`, which had one string to put both in.
    // A label carrying its figure would draw the count twice once the
    // row renders it as its own element.
    // Arrange / Act
    const badges = statusBadges(DISTINCT_COUNTS, ALL_FILTER_VALUE);

    // Assert
    expect(badgeFor(badges, 'active').label).toBe('Active');
    expect(
      badges.every((badge) => !badge.label.includes(String(badge.count))),
    ).toBe(true);
  });

  it('reads each count under its own status key', () => {
    // Arrange
    const counts = SURFACE_STATUSES.map((status) => DISTINCT_COUNTS[status]);

    // Act
    const badges = statusBadges(DISTINCT_COUNTS, ALL_FILTER_VALUE);

    // Assert
    expect(badges.map((badge) => badge.count)).toEqual(counts);
    // The guard that makes the line above mean anything: equal counts
    // would pass under any key at all.
    expect(repeated(counts)).toEqual([]);
  });

  it('takes its two pressed readings from the two exported readers', () => {
    // One claim, three exports: a row disagreeing with the readers a
    // component could call directly is a surface answering the same
    // question two ways.
    // Arrange
    const selections = [ALL_FILTER_VALUE, 'pending', UNKNOWN_STATUS];

    // Act / Assert
    selections.forEach((selected) => {
      statusBadges(DISTINCT_COUNTS, selected).forEach((badge) => {
        expect(badge.pressed).toBe(isStatusPressed(badge.status, selected));
        expect(badge.pressValue)
          .toBe(statusPressValue(badge.status, selected));
      });
    });
  });

  it('builds a fresh array for every caller', () => {
    // The mutable stance the header states: built fresh per call and
    // owned by nobody, so a component sorting what it was handed
    // cannot reorder the toolbar for the rest of the tab.
    // Arrange
    const first = statusBadges(DISTINCT_COUNTS, ALL_FILTER_VALUE);

    // Act
    first.push(badgeFor(first, 'active'));
    const second = statusBadges(DISTINCT_COUNTS, ALL_FILTER_VALUE);

    // Assert
    expect(second).toHaveLength(SURFACE_STATUSES.length);
    expect(second).not.toBe(first);
  });

  it('partitions the rows it was handed a count of', () => {
    // What makes a badge figure a promise rather than a decoration:
    // press one and the table shows that number, and the four add up
    // to the list the other controls left. Driven over the fixture
    // feeds, so the classifier the stat band reads through is the one
    // being counted here.
    // Arrange
    const counts = countSourceStatuses(SOURCES);

    // Act
    const badges = statusBadges(counts, ALL_FILTER_VALUE);
    const total = badges.reduce((sum, badge) => sum + badge.count, 0);

    // Assert
    expect(total).toBe(SOURCES.length);
    badges.forEach((badge) => {
      expect(badge.count).toBe(
        SOURCES.filter((source) => classifySource(source) === badge.status)
          .length,
      );
    });
    // Vacuity guard: an empty fixture table sums to zero either way.
    expect(SOURCES.length).toBeGreaterThan(0);
  });
});

describe('isStatusPressed', () => {
  it('presses nothing for the value that filters nothing', () => {
    // Arrange / Act
    const readings = SURFACE_STATUSES
      .map((status) => isStatusPressed(status, ALL_FILTER_VALUE));

    // Assert
    expect(readings).toEqual([false, false, false, false]);

    // Nothing pressed and nothing narrowed, which is the pairing that
    // makes the sentinel need no case of its own here.
    const passing = SURFACE_STATUSES
      .filter((status) => matchesSelect(status, ALL_FILTER_VALUE));

    expect(passing).toEqual(SURFACE_STATUSES);

    // The coincidence that pairing rests on: no status is spelled
    // like the sentinel, so one comparison serves both readings. A
    // status spelled `all` would draw a badge as pressed while the
    // filter passed every row, and nothing in `./badges.ts` would
    // report it — so this line is the guard rather than a restatement
    // of the union. Asserted over a WIDENED list because the narrow
    // form does not compile: `ALL_FILTER_VALUE` is a literal type, so
    // `status === ALL_FILTER_VALUE` is TS2367 for having no overlap.
    const spellings: readonly string[] = SURFACE_STATUSES;

    expect(spellings).not.toContain(ALL_FILTER_VALUE);
  });

  it('presses exactly the status the parameter names', () => {
    // Act / Assert
    SURFACE_STATUSES.forEach((selected) => {
      const pressed = SURFACE_STATUSES
        .filter((status) => isStatusPressed(status, selected));

      expect(pressed).toEqual([selected]);
    });
  });
});

describe('statusPressValue', () => {
  it('writes its own status while another badge is pressed', () => {
    // Act / Assert
    expect(statusPressValue('failing', 'active')).toBe('failing');
  });

  it('writes its own status while nothing is pressed', () => {
    // Act / Assert
    expect(statusPressValue('failing', ALL_FILTER_VALUE)).toBe('failing');
  });

  it('returns to the unfiltered value on a second press', () => {
    // The toggle, end to end: a badge is the only control that applied
    // the filter, so it has to be the one that takes it back.
    // Arrange
    const applied = statusPressValue('pending', ALL_FILTER_VALUE);

    // Act
    const cleared = statusPressValue('pending', applied);

    // Assert
    expect(applied).toBe('pending');
    expect(cleared).toBe(ALL_FILTER_VALUE);
  });

  it('answers a value the status filter can act on', () => {
    // Every press writes either the sentinel or a status, whatever the
    // parameter held — including a value no badge carries, which is
    // how a stale link is escaped.
    // Arrange
    const offered = [ALL_FILTER_VALUE, ...SURFACE_STATUSES];

    // Act / Assert
    [ALL_FILTER_VALUE, 'active', UNKNOWN_STATUS].forEach((selected) => {
      SURFACE_STATUSES.forEach((status) => {
        expect(offered).toContain(statusPressValue(status, selected));
      });
    });
  });
});
