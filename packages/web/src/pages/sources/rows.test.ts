import type { SourceStatus } from '../../data/sources';
import type { Source, SourceKind } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { SOURCES } from '../../data/sources';
import { FIXTURE_NOW } from '../../data/types';
import { repeated } from '../../test-support/repeated';
import { ALL_FILTER_VALUE, filterByQuery } from '../filters';

import {
  NO_CURSOR_LABEL,
  SOURCE_KINDS,
  SOURCE_QUERY_FIELDS,
  SOURCE_STAT_CARDS,
  SOURCE_STATUS_FACETS,
  cursorAgeStamp,
  cursorLabel,
  failureStreakLabel,
  isRunLive,
  kindOptions,
  kindTone,
  sourceCountLabel,
  splitEndpoint,
  statusFacet,
} from './rows';

/**
 * The statuses this surface draws, in the order it draws them.
 *
 * Written out as a TYPED literal rather than derived from the module,
 * which is what makes it worth having: annotating it
 * `readonly SourceStatus[]` means a status dropped from the union
 * upstream reddens `check-types` here, and comparing the module's list
 * against it catches an order or membership change in the suite. The
 * opposite drift — a status ADDED upstream — is refused in `./rows.ts`
 * by the record the list is built from.
 */
const SURFACE_ORDER: readonly SourceStatus[] = [
  'active',
  'failing',
  'pending',
  'disabled',
];

/** The kinds the filter offers, as a typed literal, for the same reason. */
const KIND_ORDER: readonly SourceKind[] = ['api', 'rss', 'url', 'push'];

/**
 * A feed the pipeline is reading with nothing outstanding.
 *
 * Local rather than taken from `../../data/sources`: the query tests
 * below need a value that appears in exactly ONE field, and a needle
 * chosen out of a fixture set nobody controls is one edit away from
 * matching two rows for a reason the test does not state.
 */
const ACTIVE_SOURCE: Source = {
  id: 101,
  domainId: 1,
  kind: 'api',
  endpoint: 'https://api.example.com/v1/releases',
  // The one value carried by no other field of any row here, which is
  // what the never-searched-for-a-cursor case rests on.
  cursor: 'since=2026-06-11T06:12:00Z',
  consecutiveFailures: 0,
  lastSuccessAt: '2026-06-11T06:12:00.000Z',
  lastFailureAt: null,
  enabled: true,
  flagged: false,
};

/** A feed the rot detector has flagged, with its streak already reset. */
const FLAGGED_SOURCE: Source = {
  id: 102,
  domainId: 1,
  kind: 'rss',
  endpoint: 'https://example.org/feeds/public-sector.xml',
  cursor: 'guid:example.org/feeds/public-sector/2026-06-09-002',
  consecutiveFailures: 0,
  lastSuccessAt: '2026-06-09T12:05:00.000Z',
  lastFailureAt: '2026-06-02T12:00:00.000Z',
  enabled: true,
  flagged: true,
};

/** A feed an operator switched off. */
const DISABLED_SOURCE: Source = {
  id: 103,
  domainId: 1,
  kind: 'url',
  endpoint: 'https://example.org/archive/weekly-roundup',
  cursor: 'week=2026-W18',
  consecutiveFailures: 0,
  lastSuccessAt: '2026-05-04T07:30:00.000Z',
  lastFailureAt: null,
  enabled: false,
  flagged: false,
};

/**
 * The reference clock the live-run cases measure against.
 *
 * Its own literal rather than `FIXTURE_NOW`: the stamps below are
 * written as offsets from it in prose, and a case reading a clock some
 * other module owns would move the moment that module did. The
 * fixture-reach case at the end of the block is the one that uses the
 * real one, because reaching the shipped rows is the whole of what it
 * claims.
 */
const RUN_CLOCK = '2026-06-11T14:30:00.000Z';

/**
 * How long a touch keeps a feed pulsing, in hours.
 *
 * Written out rather than imported: `./rows.ts` holds the policy, so a
 * literal here is what turns a change to that number into a red case
 * instead of two files agreeing with each other about nothing.
 */
const LIVE_WINDOW_HOURS = 12;

/** Milliseconds in an hour, for building the stamps below. */
const HOUR_MS = 60 * 60 * 1000;

/**
 * A stamp a given number of hours before {@link RUN_CLOCK}.
 *
 * Negative hours put it AFTER the clock, which is the skew case.
 *
 * @param hours - How far back to reach.
 * @returns The instant, ISO.
 */
const hoursBefore = (hours: number): string => new Date(
  Date.parse(RUN_CLOCK) - (hours * HOUR_MS),
).toISOString();

/**
 * A feed with the two stamps and the switch a case wants.
 *
 * Built off {@link ACTIVE_SOURCE} so every other column stays a value
 * no case reads, which is what keeps each case about the one thing it
 * varies.
 *
 * @param patch - The members this case cares about.
 * @returns The row.
 */
const sourceWith = (patch: Partial<Source>): Source => ({
  ...ACTIVE_SOURCE,
  ...patch,
});

/** The three above, as the search box sees them. */
const QUERY_ROWS: readonly Source[] = [
  ACTIVE_SOURCE,
  FLAGGED_SOURCE,
  DISABLED_SOURCE,
];

/** Which rows a query leaves, by id. */
const searchIds = (query: string): readonly number[] => filterByQuery(
  QUERY_ROWS,
  query,
  SOURCE_QUERY_FIELDS,
).map((source) => source.id);

describe('SOURCE_STATUS_FACETS', () => {
  it('draws every status once, in surface order', () => {
    // The non-emptiness guard the claims below rest on, and the order
    // claim, in one: the expected side is a literal, so an emptied or
    // reordered table cannot satisfy it.
    // Arrange / Act
    const drawn = SOURCE_STATUS_FACETS.map((facet) => facet.status);

    // Assert
    expect(drawn).toEqual(SURFACE_ORDER);
    expect(repeated(drawn)).toEqual([]);
  });

  it('gives every status a name of its own', () => {
    // Arrange / Act
    const labels = SOURCE_STATUS_FACETS.map((facet) => facet.label);
    const blank = labels.filter((label) => label.trim() === '');

    // Assert
    expect(blank).toEqual([]);
    expect(repeated(labels)).toEqual([]);
  });

  it('gives every status a tone of its own', () => {
    // Four states an operator has to tell apart at a glance, so a tone
    // used twice would make two of them look like one.
    // Arrange / Act
    const tones = SOURCE_STATUS_FACETS.map((facet) => facet.tone);

    // Assert
    expect(repeated(tones)).toEqual([]);
  });

  it('draws the operator decision in the library muted tone', () => {
    // The one tone that is a deliberate recession rather than a
    // reading — pinned against a literal so a restyle has to say so.
    // Arrange / Act
    const disabled = statusFacet('disabled');

    // Assert
    expect(disabled.tone).toBe('disabled');
  });
});

describe('statusFacet', () => {
  it('answers with the facet each status is filed under', () => {
    // Identity rather than equality: the lookup is meant to hand back
    // the very entry the table holds, so a copy would pass a `toEqual`
    // and lose the property.
    // Arrange / Act / Assert
    SOURCE_STATUS_FACETS.forEach((facet) => {
      expect(statusFacet(facet.status)).toBe(facet);
    });
  });

  it('refuses a status this surface lists no facet for', () => {
    // The cast is the point: the union cannot produce this, and the
    // throw is what a status left out of the private order list would
    // reach.
    // Arrange
    const unlisted = 'retired' as SourceStatus;

    // Act / Assert
    expect(() => statusFacet(unlisted)).toThrow(/retired/);
  });
});

describe('isRunLive', () => {
  it('pulses a feed touched inside the window', () => {
    // Arrange
    const source = sourceWith({
      lastSuccessAt: hoursBefore(LIVE_WINDOW_HOURS - 1),
      lastFailureAt: null,
    });

    // Act / Assert
    expect(isRunLive(source, RUN_CLOCK)).toBe(true);
  });

  it('leaves a feed touched a whole window ago still', () => {
    // The boundary itself is outside: a pass that lasted exactly as
    // long as the window has finished, and drawing it as running would
    // put the one moving thing on the surface on a row that is not.
    // Arrange
    const source = sourceWith({
      lastSuccessAt: hoursBefore(LIVE_WINDOW_HOURS),
      lastFailureAt: null,
    });

    // Act / Assert
    expect(isRunLive(source, RUN_CLOCK)).toBe(false);
    expect(isRunLive(
      sourceWith({
        lastSuccessAt: hoursBefore(LIVE_WINDOW_HOURS + 1),
        lastFailureAt: null,
      }),
      RUN_CLOCK,
    )).toBe(false);
  });

  it('takes whichever stamp is later, not the successful one', () => {
    // The reading is that the pipeline has been here, and a failed
    // fetch is a visit. A feed whose last success is weeks old and
    // whose last failure is minutes old is being read right now.
    // Arrange
    const failedSince = sourceWith({
      lastSuccessAt: hoursBefore(LIVE_WINDOW_HOURS * 10),
      lastFailureAt: hoursBefore(1),
    });
    const succeededSince = sourceWith({
      lastSuccessAt: hoursBefore(1),
      lastFailureAt: hoursBefore(LIVE_WINDOW_HOURS * 10),
    });
    // The control that says the pair above is measuring the LATER
    // stamp rather than answering true for any row with two.
    const bothStale = sourceWith({
      lastSuccessAt: hoursBefore(LIVE_WINDOW_HOURS * 10),
      lastFailureAt: hoursBefore(LIVE_WINDOW_HOURS * 2),
    });

    // Act / Assert
    expect(isRunLive(failedSince, RUN_CLOCK)).toBe(true);
    expect(isRunLive(succeededSince, RUN_CLOCK)).toBe(true);
    expect(isRunLive(bothStale, RUN_CLOCK)).toBe(false);
  });

  it('never pulses a feed an operator switched off', () => {
    // Whatever its counters remember: nothing is reading it, so
    // nothing about it can be in flight.
    // Arrange
    const stamps = {
      lastSuccessAt: hoursBefore(1),
      lastFailureAt: null,
    };

    // Act / Assert
    expect(isRunLive(sourceWith({ ...stamps, enabled: false }), RUN_CLOCK))
      .toBe(false);
    // The positive control: the same row, switched on. Without it a
    // reading that had stopped pulsing anything would pass this case.
    expect(isRunLive(sourceWith({ ...stamps, enabled: true }), RUN_CLOCK))
      .toBe(true);
  });

  it('never pulses a feed nothing has touched', () => {
    // Configured and never reached. There is no age to take, which is
    // a different answer from an age that is too old.
    // Arrange
    const source = sourceWith({
      lastSuccessAt: null,
      lastFailureAt: null,
    });

    // Act / Assert
    expect(isRunLive(source, RUN_CLOCK)).toBe(false);
  });

  it('pulses a stamp that lands ahead of the clock', () => {
    // A service clock a moment fast is ordinary; a row that stopped
    // pulsing over it would be a rendering fault rather than a
    // reading.
    // Arrange
    const source = sourceWith({
      lastSuccessAt: hoursBefore(-1),
      lastFailureAt: null,
    });

    // Act / Assert
    expect(isRunLive(source, RUN_CLOCK)).toBe(true);
  });

  it('leaves a stamp that will not parse still', () => {
    // `IsoTimestamp` is a string, so nothing stops one arriving. The
    // signed comparison answers false for it, which is the
    // conservative half: an unreadable stamp draws no motion.
    // Arrange
    const source = sourceWith({
      lastSuccessAt: 'not a timestamp',
      lastFailureAt: null,
    });

    // Act / Assert
    expect(isRunLive(source, RUN_CLOCK)).toBe(false);
  });

  it('reaches both readings over the shipped sources', () => {
    // The demo and every later spec rest on this: a window nothing
    // falls inside leaves the pulse with no subject, and one
    // everything falls inside leaves its absence with none. Measured
    // against the clock the page renders with, not against
    // `RUN_CLOCK`.
    // Arrange / Act
    const live = SOURCES.filter((source) => isRunLive(source, FIXTURE_NOW));
    const still = SOURCES.filter((source) => !isRunLive(source, FIXTURE_NOW));

    // Assert
    expect(live.length).toBeGreaterThan(0);
    expect(still.length).toBeGreaterThan(0);
    expect(live.length + still.length).toBe(SOURCES.length);
  });
});

describe('SOURCE_KINDS', () => {
  it('offers every kind once, in filter order', () => {
    // Arrange / Act / Assert
    expect(SOURCE_KINDS).toEqual(KIND_ORDER);
    expect(repeated(SOURCE_KINDS)).toEqual([]);
  });

  it('gives every kind a tone', () => {
    // Arrange / Act
    const missing = SOURCE_KINDS.filter((kind) => kindTone(kind) == null);

    // Assert
    expect(missing).toEqual([]);
  });

  it('sets the pushed kind apart from the polled ones', () => {
    // The one distinction this surface draws in colour, and the reason
    // the tone table is not four copies of one value.
    // Arrange / Act
    const polled = SOURCE_KINDS
      .filter((kind) => kind !== 'push')
      .map((kind) => kindTone(kind));

    // Assert
    expect(polled).toEqual(['neutral', 'neutral', 'neutral']);
    expect(kindTone('push')).toBe('info');
  });
});

describe('splitEndpoint', () => {
  it('leads with the host and follows with the path', () => {
    // Arrange / Act
    const parts = splitEndpoint('https://api.example.com/v1/releases');

    // Assert
    expect(parts).toEqual({ host: 'api.example.com', path: '/v1/releases' });
  });

  it('keeps a query string on the second line', () => {
    // A window cursor is often expressed in the endpoint rather than
    // in the cursor column, so dropping the query would hide what
    // distinguishes two rows of one host.
    // Arrange / Act
    const parts = splitEndpoint('https://example.net/blog/?tag=infra');

    // Assert
    expect(parts).toEqual({ host: 'example.net', path: '/blog/?tag=infra' });
  });

  it('draws no second line for a bare host', () => {
    // Arrange / Act
    const parts = splitEndpoint('https://example.org/');

    // Assert
    expect(parts).toEqual({ host: 'example.org', path: null });
  });

  it('hands back an endpoint it cannot take apart', () => {
    // `URL` throws on anything that is not absolute, and an endpoint is
    // operator-entered — so this is a state the running app reaches.
    // Arrange / Act
    const parts = splitEndpoint('example.org/feeds');

    // Assert
    expect(parts).toEqual({ host: 'example.org/feeds', path: null });
  });

  it('leaves every fixture source with something to lead with', () => {
    // A whole-table claim over the real rows: a cell whose first line
    // was empty would render a blank identity for a feed that has one.
    // Arrange / Act
    const blank = SOURCES.filter(
      (source) => splitEndpoint(source.endpoint).host.trim() === '',
    );

    // Assert
    expect(blank).toEqual([]);
    expect(SOURCES.length).toBeGreaterThan(0);
  });
});

describe('failureStreakLabel', () => {
  it('names a clean counter rather than printing a zero', () => {
    // Arrange / Act / Assert
    expect(failureStreakLabel(0)).toBe('No failures');
  });

  it('reads singular at exactly one', () => {
    // Arrange / Act / Assert
    expect(failureStreakLabel(1)).toBe('1 failure');
  });

  it('reads plural above one', () => {
    // Arrange / Act / Assert
    expect(failureStreakLabel(2)).toBe('2 failures');
    expect(failureStreakLabel(3)).toBe('3 failures');
  });

  it('shows a negative counter rather than hiding it', () => {
    // No counter can produce one, which is exactly why a row carrying
    // it should look wrong instead of looking healthy.
    // Arrange / Act / Assert
    expect(failureStreakLabel(-1)).toBe('-1 failures');
  });
});

describe('cursorAgeStamp', () => {
  it('dates a position by the fetch that wrote it', () => {
    // Arrange
    const source = sourceWith({
      lastSuccessAt: '2026-06-10T18:40:00.000Z',
      lastFailureAt: null,
    });

    // Act / Assert
    expect(cursorAgeStamp(source)).toBe('2026-06-10T18:40:00.000Z');
  });

  it('is not moved by a failure since', () => {
    // A failed fetch moves no cursor, so the position is exactly as
    // old as it was. This is the whole difference between this
    // reading and the one behind the pulse, which takes either stamp.
    // Arrange
    const source = sourceWith({
      lastSuccessAt: '2026-06-05T21:10:00.000Z',
      lastFailureAt: '2026-06-11T05:58:00.000Z',
    });

    // Act / Assert
    expect(cursorAgeStamp(source)).toBe('2026-06-05T21:10:00.000Z');
  });

  it('reads a feed that only ever failed as one with no position', () => {
    // The documented narrowing: a feed reached and never usable
    // answers the same as one never reached at all, so the cursor
    // column cannot separate them and the health column is what does.
    // Asserted against each other rather than each against null, so
    // the claim is the indistinguishability rather than two nulls.
    // Arrange
    const failedOnly = sourceWith({
      lastSuccessAt: null,
      lastFailureAt: '2026-06-10T22:15:00.000Z',
    });
    const neverTouched = sourceWith({
      lastSuccessAt: null,
      lastFailureAt: null,
    });

    // Act / Assert
    expect(cursorAgeStamp(failedOnly)).toBe(cursorAgeStamp(neverTouched));
    expect(cursorAgeStamp(failedOnly)).toBeNull();
  });
});

describe('cursorLabel', () => {
  it('hands back a stored position untouched', () => {
    // Opaque by contract: shortening or parsing it would be this
    // surface guessing at the adapter's bookkeeping.
    // Arrange
    const cursor = 'guid:example.org/feeds/infrastructure/2026-06-11-004';

    // Act / Assert
    expect(cursorLabel(cursor)).toBe(cursor);
  });

  it('names the absence for a source that has kept none', () => {
    // Arrange / Act / Assert
    expect(cursorLabel(null)).toBe(NO_CURSOR_LABEL);
  });

  it('reads a blank position as no position', () => {
    // A cell drawing an empty string looks like a column that failed
    // rather than a source with nothing to keep.
    // Arrange / Act / Assert
    expect(cursorLabel('')).toBe(NO_CURSOR_LABEL);
    expect(cursorLabel('   ')).toBe(NO_CURSOR_LABEL);
  });
});

describe('sourceCountLabel', () => {
  it('states the count and its noun', () => {
    // Arrange / Act / Assert
    expect(sourceCountLabel(7, 7)).toBe('7 sources');
  });

  it('reads singular at exactly one', () => {
    // Arrange / Act / Assert
    expect(sourceCountLabel(1, 1)).toBe('1 source');
  });

  it('says what a filtered list is a subset of', () => {
    // The reading that tells an operator the rows they cannot see
    // still exist.
    // Arrange / Act / Assert
    expect(sourceCountLabel(2, 7)).toBe('2 of 7 sources');
  });

  it('states a zero rather than a word for it', () => {
    // Arrange / Act / Assert
    expect(sourceCountLabel(0, 7)).toBe('0 of 7 sources');
  });
});

describe('SOURCE_QUERY_FIELDS', () => {
  it('leaves every row in place for an empty box', () => {
    // The guard the negative cases below rest on: a field list that
    // matched nothing would satisfy them all.
    // Arrange / Act / Assert
    expect(searchIds('')).toEqual([101, 102, 103]);
    expect(searchIds('   ')).toEqual([101, 102, 103]);
  });

  it('finds a feed by part of its endpoint', () => {
    // Arrange / Act / Assert
    expect(searchIds('weekly-roundup')).toEqual([103]);
  });

  it('finds a feed by its kind', () => {
    // Arrange / Act / Assert
    expect(searchIds('rss')).toEqual([102]);
  });

  it('finds a feed by the status it is in', () => {
    // The word the status column shows, not the stored columns behind
    // it — `disabled` is a reading of `enabled`, and an operator
    // searching for it is searching for what they can see.
    // Arrange / Act / Assert
    expect(searchIds('disabled')).toEqual([103]);
  });

  it('finds the flagged feeds by the word the tag uses', () => {
    // Drawn as a tag rather than as text, so it would be unsearchable
    // if the reader were not listed.
    // Arrange / Act / Assert
    expect(searchIds('flagged')).toEqual([102]);
  });

  it('never answers for something only a cursor carries', () => {
    // The deliberate narrowing: the token is the adapter's own
    // bookkeeping, so a hit here would be about the adapter rather
    // than about the feed.
    // Arrange / Act / Assert
    expect(searchIds('since=')).toEqual([]);
    expect(searchIds('week=2026-W18')).toEqual([]);
  });

  it('answers nothing for a query no field carries', () => {
    // Arrange / Act / Assert
    expect(searchIds('no-field-says-this')).toEqual([]);
  });
});

describe('kindOptions', () => {
  it('leads with the option that filters nothing', () => {
    // Arrange / Act
    const [first] = kindOptions();

    // Assert
    expect(first).toEqual({ value: ALL_FILTER_VALUE, label: 'All kinds' });
  });

  it('offers every kind under its stored token', () => {
    // Two names for one thing is what showing prose here would be:
    // the column tags each row with the token itself.
    // Arrange / Act
    const offered = kindOptions()
      .filter((option) => option.value !== ALL_FILTER_VALUE);

    // Assert
    expect(offered).toEqual(
      KIND_ORDER.map((kind) => ({ value: kind, label: kind })),
    );
  });

  it('builds a fresh array for every caller', () => {
    // `SelectProps.options` is declared mutable, so a shared array is
    // one component away from being edited in place.
    // Arrange / Act / Assert
    expect(kindOptions()).not.toBe(kindOptions());
  });
});

describe('SOURCE_STAT_CARDS', () => {
  it('draws three tiles, in the order the surface reads', () => {
    // Arrange / Act
    const shown = SOURCE_STAT_CARDS.map((card) => card.status);

    // Assert
    expect(shown).toEqual(['active', 'failing', 'pending']);
  });

  it('leaves the operator decision to the table', () => {
    // Derived against the facet table rather than restated, so a
    // status added to the surface shows up here as an uncounted
    // member instead of passing quietly.
    // Arrange
    const shown = SOURCE_STAT_CARDS.map((card) => card.status);

    // Act
    const uncounted = SOURCE_STATUS_FACETS
      .map((facet) => facet.status)
      .filter((status) => !shown.includes(status));

    // Assert
    expect(uncounted).toEqual(['disabled']);
  });

  it('gives every tile a title and a caption of its own', () => {
    // Arrange / Act
    const titles = SOURCE_STAT_CARDS.map((card) => card.title);
    const captions = SOURCE_STAT_CARDS.map((card) => card.caption);
    const written = [...titles, ...captions];
    const blank = written.filter((text) => text.trim() === '');

    // Assert
    expect(blank).toEqual([]);
    expect(repeated(titles)).toEqual([]);
    expect(repeated(captions)).toEqual([]);
  });

  it('says what the failures tile counts, since its title does not', () => {
    // The label says documents and the figure counts feeds; the
    // caption is where that gap is stated rather than discovered.
    // Arrange / Act
    const failures = SOURCE_STAT_CARDS.find(
      (card) => card.status === 'failing',
    );

    // Assert
    expect(failures?.caption).toContain('not failed documents');
  });
});
