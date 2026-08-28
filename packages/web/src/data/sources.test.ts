import type { Source, SourceKind } from './types';

import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import { DOCUMENTS } from './digest';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from './domains';
import {
  SOURCES,
  classifySource,
  countSourceStatuses,
  findSource,
  getSource,
  listSources,
  summarizeSources,
} from './sources';
import { FIXTURE_NOW } from './types';

/**
 * Every member of the kind union, as a record rather than as a list.
 *
 * A `Record` over {@link SourceKind} is refused by the compiler when a
 * member is added, where an array of the same strings would still type
 * and would quietly stop covering the union. The values carry nothing;
 * the KEYS are the assertion.
 */
const EVERY_KIND: Readonly<Record<SourceKind, true>> = {
  url: true,
  api: true,
  rss: true,
  push: true,
};

/**
 * A source built here rather than taken from the table.
 *
 * The precedence rules in `classifySource` need combinations the
 * fixtures deliberately do not carry — a row that is disabled AND
 * flagged AND failing says nothing about a real deployment and would
 * be four states pretending to be one row. Built locally, the
 * combination is exactly what is under test and nothing else reads it.
 *
 * Defaults describe a plain healthy source, so each caller states only
 * the columns its case is about.
 *
 * @param overrides - The columns this case cares about.
 * @returns A source differing from a healthy one in nothing else.
 */
function sourceWith(overrides: Partial<Source>): Source {
  return {
    id: 99,
    domainId: 99,
    kind: 'url',
    endpoint: 'https://example.com/local-probe',
    cursor: 'page=1',
    consecutiveFailures: 0,
    lastSuccessAt: '2026-06-10T00:00:00.000Z',
    lastFailureAt: null,
    enabled: true,
    flagged: false,
    ...overrides,
  };
}

describe('SOURCES', () => {
  it('carries at least one source to read anything else from', () => {
    // The non-emptiness guard every table-driven claim below rests on:
    // each of them is a filter compared against `[]`, and an empty
    // table satisfies the lot at once.
    // Arrange / Act / Assert
    expect(SOURCES.length).toBeGreaterThan(0);
  });

  it('gives every source a distinct id', () => {
    // A document names its source by id, so a collision would attribute
    // captures to whichever row the map happened to keep.
    // Arrange / Act
    const ids = SOURCES.map((source) => source.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every source a distinct endpoint within its domain', () => {
    // Fixture hygiene rather than a mirrored constraint: `sources`
    // declares no unique key, so two rows on one endpoint is a state
    // the schema permits. It is still two adapters fetching the same
    // feed and storing each document twice, which is not what any
    // fixture here means to show.
    // Arrange / Act
    const pairs = SOURCES.map(
      (source) => `${source.domainId}/${source.endpoint}`,
    );

    // Assert
    expect(repeated(pairs)).toEqual([]);
  });

  it('never leaves an endpoint empty', () => {
    // NOT NULL is not the same as non-empty: an empty endpoint is
    // configuration somebody has not finished — nothing to fetch from
    // and nowhere to listen — and the sources table renders it as the
    // row's first cell, so an empty one is a row with no name.
    // Arrange / Act
    const blank = SOURCES.filter((source) => source.endpoint.trim() === '');

    // Assert
    expect(blank).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // The sparse domain is the shell's route to its empty states, so a
    // row leaking into it would fill a page that is meant to be bare.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = SOURCES.filter((source) => source.domainId !== seededId);

    // Assert
    expect(strays).toEqual([]);
  });

  it('carries every source kind', () => {
    // The toolbar renders a kind `Select` over the union, so a kind no
    // fixture carries is a filter option that selects nothing in the
    // running demo.
    // Arrange
    const wanted = Object.keys(EVERY_KIND);

    // Act
    const held = SOURCES.map((source) => source.kind);
    const missing = wanted.filter((kind) => !held.includes(kind as SourceKind));

    // Assert
    expect(missing).toEqual([]);
  });

  it('keeps every failure count a non-negative whole number', () => {
    // A counter, so zero is a reading and not an absence. A fraction or
    // a negative is neither, and would render as a health figure that
    // cannot have been counted.
    // Arrange / Act
    const offenders = SOURCES.filter(
      (source) => !Number.isInteger(source.consecutiveFailures)
        || source.consecutiveFailures < 0,
    );

    // Assert
    expect(offenders).toEqual([]);
  });

  it('dates every stamp at or before the reference clock', () => {
    // Every relative time in the shell is rendered against
    // `FIXTURE_NOW`, so a stamp past it renders as a fetch that has not
    // happened yet — "in 3 hours" on a page describing what a pipeline
    // has already done.
    // Arrange
    const now = Date.parse(FIXTURE_NOW);

    // Act
    const future = SOURCES.filter((source) => {
      const stamps = [source.lastSuccessAt, source.lastFailureAt]
        .filter((stamp) => stamp !== null);

      return stamps.some((stamp) => Date.parse(stamp) > now);
    });

    // Assert
    expect(future).toEqual([]);
  });

  it('records no cursor on a source that has never succeeded', () => {
    // A cursor is written by a fetch that worked, so a source with no
    // success behind it has nowhere to have got one. Only this
    // direction is asserted: the converse is not an invariant, because
    // a null cursor also means an adapter that keeps none at all.
    // Arrange / Act
    const impossible = SOURCES.filter(
      (source) => source.lastSuccessAt === null && source.cursor !== null,
    );

    // Assert
    expect(impossible).toEqual([]);
  });

  it('carries a source that recovered from an earlier failure', () => {
    // Failed once, succeeded since, no current streak. The near-miss
    // for any health reading keyed off `lastFailureAt` — that one shows
    // this row as broken forever.
    // Arrange / Act
    const recovered = SOURCES.filter(
      (source) => source.lastFailureAt !== null
        && source.lastSuccessAt !== null
        && source.consecutiveFailures === 0
        && !source.flagged,
    );

    // Assert
    expect(recovered.length).toBeGreaterThan(0);
  });

  it('carries a flagged source with no current failure streak', () => {
    // Half of the pair that keeps `flagged` and `consecutive_failures`
    // from being collapsed: the streak reset on the next success and
    // nothing clears the flag but an operator.
    // Arrange / Act
    const flaggedOnly = SOURCES.filter(
      (source) => source.flagged && source.consecutiveFailures === 0,
    );

    // Assert
    expect(flaggedOnly.length).toBeGreaterThan(0);
  });

  it('carries an unflagged source with a current failure streak', () => {
    // The other half: failing below the threshold the rot detector
    // trips at, so the streak is the only thing saying so.
    // Arrange / Act
    const streakOnly = SOURCES.filter(
      (source) => !source.flagged && source.consecutiveFailures > 0,
    );

    // Assert
    expect(streakOnly.length).toBeGreaterThan(0);
  });

  it('carries a source that has failed but never succeeded', () => {
    // Reached and coming back unusable — which shares a null
    // `lastSuccessAt` with the never-fetched row below and is not the
    // same state. This pair is what makes `pending` a reading of both
    // stamps rather than of one.
    // Arrange / Act
    const neverWorked = SOURCES.filter(
      (source) => source.lastSuccessAt === null && source.lastFailureAt !== null,
    );

    // Assert
    expect(neverWorked.length).toBeGreaterThan(0);
  });

  it('carries a source that has never been fetched at all', () => {
    // Both stamps null: configured, never reached. The state the
    // pending card counts.
    // Arrange / Act
    const untouched = SOURCES.filter(
      (source) => source.lastSuccessAt === null && source.lastFailureAt === null,
    );

    // Assert
    expect(untouched.length).toBeGreaterThan(0);
  });

  it('carries a source an operator switched off', () => {
    // `enabled` is operator-owned and nothing automatic clears it, so
    // the demo needs a row in that state or the disabled indicator is
    // reachable only from this file.
    // Arrange / Act
    const disabled = SOURCES.filter((source) => !source.enabled);

    // Assert
    expect(disabled.length).toBeGreaterThan(0);
  });
});

describe('classifySource', () => {
  it('reads a source being read with nothing outstanding as active', () => {
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({}))).toBe('active');
  });

  it('reads a current failure streak as failing', () => {
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({ consecutiveFailures: 1 })))
      .toBe('failing');
  });

  it('reads a flag with no streak behind it as failing', () => {
    // The flag alone is enough: it is the rot detector's conclusion and
    // only an operator clears it, so a source that has succeeded once
    // since is still asking somebody to look.
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({ flagged: true }))).toBe('failing');
  });

  it('reads a source with neither stamp written as pending', () => {
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({
      cursor: null,
      lastSuccessAt: null,
      lastFailureAt: null,
    }))).toBe('pending');
  });

  it('reads a source that has only ever failed as failing', () => {
    // Null success, real failure: it has been reached, so it is not
    // pending. A reading of `lastSuccessAt` alone gets this backwards
    // and reports a broken feed as one nobody has tried yet.
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({
      cursor: null,
      consecutiveFailures: 2,
      lastSuccessAt: null,
      lastFailureAt: '2026-06-10T22:15:00.000Z',
    }))).toBe('failing');
  });

  it('reads a switched-off source as disabled', () => {
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({ enabled: false }))).toBe('disabled');
  });

  it('lets disabled outrank every other reading', () => {
    // The precedence, on a row no fixture carries: what an operator
    // decided outranks what the pipeline believes, because a source
    // nothing reads cannot be failing right now — its counters are the
    // record of when it was last read.
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({
      consecutiveFailures: 9,
      flagged: true,
      enabled: false,
    }))).toBe('disabled');
    expect(classifySource(sourceWith({
      cursor: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      enabled: false,
    }))).toBe('disabled');
  });

  it('lets pending outrank a flag on a source nothing has fetched', () => {
    // A flag on a row neither stamp has been written for describes
    // nothing that happened. Pending is the honest reading, and the
    // order of the branches is what decides it.
    // Arrange / Act / Assert
    expect(classifySource(sourceWith({
      cursor: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      flagged: true,
    }))).toBe('pending');
  });

  it('gives every fixture source the status its row describes', () => {
    // The whole table, pinned by endpoint so a failure names the row
    // rather than an index. This is the assertion the stat cards and
    // the `StatusIndicator` column both rest on.
    // Arrange / Act
    const classified = SOURCES.map((source) => ({
      endpoint: source.endpoint,
      status: classifySource(source),
    }));

    // Assert
    expect(classified).toEqual([
      { endpoint: 'https://api.example.com/v1/releases', status: 'active' },
      { endpoint: 'https://example.net/graph-store/blog/', status: 'active' },
      {
        endpoint: 'https://example.org/feeds/infrastructure.xml',
        status: 'failing',
      },
      {
        endpoint: 'https://ingest.example.org/hooks/example-tech-radar',
        status: 'pending',
      },
      {
        endpoint: 'https://example.org/archive/weekly-roundup',
        status: 'disabled',
      },
      { endpoint: 'https://api.example.net/v2/index', status: 'failing' },
      {
        endpoint: 'https://example.org/feeds/public-sector.xml',
        status: 'failing',
      },
    ]);
  });

  it('reaches every status from the fixture table', () => {
    // Each stat card and each indicator tone needs a row behind it, or
    // the state is reachable from this file and from nowhere in the
    // running demo.
    // Arrange / Act
    const counts = countSourceStatuses(SOURCES);
    const empty = Object.entries(counts).filter(([, count]) => count === 0);

    // Assert
    expect(empty).toEqual([]);
  });
});

describe('countSourceStatuses', () => {
  it('counts each status of the list it is handed', () => {
    // Arrange
    const sources = [
      sourceWith({}),
      sourceWith({}),
      sourceWith({ flagged: true }),
      sourceWith({ enabled: false }),
    ];

    // Act / Assert
    expect(countSourceStatuses(sources))
      .toEqual({ active: 2, failing: 1, pending: 0, disabled: 1 });
  });

  it('reports a zero for a status the list does not carry', () => {
    // Every card reads its own figure, so an absent status has to be a
    // count of none rather than a member the caller branches on.
    // Arrange / Act / Assert
    expect(countSourceStatuses([]))
      .toEqual({ active: 0, failing: 0, pending: 0, disabled: 0 });
    expect(countSourceStatuses([sourceWith({ enabled: false })]))
      .toEqual({ active: 0, failing: 0, pending: 0, disabled: 1 });
  });

  it('counts every source exactly once', () => {
    // A stat row whose figures do not add up to the table beneath it is
    // a page contradicting itself. Run over the whole fixture table so
    // the claim covers the rows the demo actually renders.
    // Arrange / Act
    const counts = countSourceStatuses(SOURCES);
    const total = counts.active + counts.failing
      + counts.pending + counts.disabled;

    // Assert
    expect(SOURCES.length).toBeGreaterThan(0);
    expect(total).toBe(SOURCES.length);
  });
});

describe('listSources', () => {
  it('returns the seeded domain sources in configuration order', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listSources(seededId);

    // Assert
    expect(listed.map((source) => source.id))
      .toEqual(SOURCES.map((source) => source.id));
  });

  it('returns nothing for the sparse domain', () => {
    // Not an error: the empty sources page is a state the demo reaches
    // by switching domain rather than by emptying a table.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listSources(sparseId)).toEqual([]);
  });

  it('returns nothing for a domain id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listSources(-1)).toEqual([]);
  });

  it('never hands back the stored table', () => {
    // Handing out the array itself would let a caller sorting it in
    // place reorder every later reader in the same process.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listSources(seededId)).not.toBe(SOURCES);
  });
});

describe('findSource', () => {
  it('finds every fixture source by its own id', () => {
    // Arrange / Act
    const missed = SOURCES.filter((source) => findSource(source.id) !== source);

    // Assert
    expect(missed).toEqual([]);
  });

  it('answers undefined for an id no fixture carries', () => {
    // The tolerant twin exists because a source id DOES arrive from the
    // URL — the sources edit sub-route carries one — so a stale link is
    // an ordinary outcome the page answers with a not-found state.
    // Arrange / Act / Assert
    expect(findSource(-1)).toBeUndefined();
  });
});

describe('getSource', () => {
  it('returns the source carrying the id', () => {
    // Arrange / Act
    const found = SOURCES.map((source) => getSource(source.id));

    // Assert
    expect(found).toEqual([...SOURCES]);
  });

  it('throws naming the id it could not find', () => {
    // The message is what a fixture author reads first, so it carries
    // the id rather than only the fact of the miss.
    // Arrange / Act / Assert
    expect(() => getSource(-1)).toThrow('-1');
  });
});

describe('summarizeSources', () => {
  it('counts the statuses of one domain sources', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(summarizeSources(seededId))
      .toEqual(countSourceStatuses(listSources(seededId)));
  });

  it('counts nothing belonging to another domain', () => {
    // The stat row is domain-scoped like the table under it; a figure
    // counting the whole fixture set would keep showing the seeded
    // domain numbers after a switch.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const counts = summarizeSources(seededId);
    const total = counts.active + counts.failing
      + counts.pending + counts.disabled;

    // Assert
    expect(total).toBe(listSources(seededId).length);
  });

  it('returns zeros for the sparse domain', () => {
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(summarizeSources(sparseId))
      .toEqual({ active: 0, failing: 0, pending: 0, disabled: 0 });
  });
});

describe('cross-module references', () => {
  it('answers every document source reference with a fixture source', () => {
    // The cross-check `digest.ts` asked for and could not make: its
    // documents cite `sourceId` 1, 2 and 3, and this is the first
    // module holding both halves. A dangling reference leaves the
    // digest's source cell resolving to nothing.
    // Arrange / Act
    const cited = DOCUMENTS
      .map((document) => document.sourceId)
      .filter((sourceId) => sourceId !== null);
    const dangling = cited.filter(
      (sourceId) => findSource(sourceId) === undefined,
    );

    // Assert
    expect(cited.length).toBeGreaterThan(0);
    expect(dangling).toEqual([]);
  });

  it('keeps a document and the source that captured it in one domain', () => {
    // A document captured for one domain by a source belonging to
    // another is a row two pages disagree about: the digest lists it,
    // the sources page has nothing to show beside it.
    // Arrange / Act
    const crossed = DOCUMENTS.filter((document) => {
      if (document.sourceId === null) {
        return false;
      }

      return getSource(document.sourceId).domainId !== document.domainId;
    });

    // Assert
    expect(crossed).toEqual([]);
  });

  it('never dates a success before the newest document it yielded', () => {
    // A source cannot have last succeeded before the most recent
    // payload it came back with. The stamps here are the captures in
    // `digest.ts`, and this is what keeps the two files saying the same
    // thing about one fetch.
    // Arrange / Act
    const impossible = DOCUMENTS.filter((document) => {
      if (document.sourceId === null || document.parseStatus !== 'ok') {
        return false;
      }

      const { lastSuccessAt } = getSource(document.sourceId);

      return lastSuccessAt === null
        || Date.parse(lastSuccessAt) < Date.parse(document.capturedAt);
    });

    // Assert
    expect(impossible).toEqual([]);
  });

  it('never dates a failure before the newest payload it rejected', () => {
    // The other half: fail-flag-keep stores a rejected payload as a
    // document and stamps the source, so a failed document newer than
    // its source's last failure is the same contradiction the other way
    // round.
    // Arrange / Act
    const impossible = DOCUMENTS.filter((document) => {
      if (document.sourceId === null || document.parseStatus !== 'failed') {
        return false;
      }

      const { lastFailureAt } = getSource(document.sourceId);

      return lastFailureAt === null
        || Date.parse(lastFailureAt) < Date.parse(document.capturedAt);
    });

    // Assert
    expect(impossible).toEqual([]);
  });
});
