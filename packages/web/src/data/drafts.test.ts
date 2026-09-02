import type { DraftScope } from './drafts';

import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_DOMAIN_SLUG, SPARSE_DOMAIN_SLUG, getDomain } from './domains';
import {
  DEPLOYMENT_DRAFT_SCOPE,
  applyDrafts,
  clearDrafts,
  deploymentDraftScope,
  domainDraftScope,
  recordDraft,
  resetDrafts,
} from './drafts';
import { listSources } from './sources';

/**
 * The seeded domain's sources — the real list the sources surface
 * reads, used here so that "a row no fixture carries" is literally
 * true rather than true of a list invented for the assertion.
 */
const SEEDED_SOURCES = listSources(getDomain(DEFAULT_DOMAIN_SLUG).id);

/**
 * An id no seeded source carries, derived rather than written: a
 * fixture gaining a row would silently turn a hardcoded 9999 into a
 * real id and the stale-draft case into its opposite.
 */
const ABSENT_SOURCE_ID = Math.max(
  ...SEEDED_SOURCES.map((source) => source.id),
) + 1;

/**
 * The row at `index`, or a failure naming how short the list came up.
 *
 * Also the non-emptiness guard every case reading a real fixture row
 * rests on: a `SEEDED_SOURCES` that lost its rows would otherwise make
 * the assertions below pass over nothing at all.
 *
 * @typeParam T - The row shape.
 * @param rows - The list to read.
 * @param index - Which row is wanted.
 * @returns That row.
 * @throws If the list is shorter than the index.
 */
function rowAt<T>(rows: readonly T[], index: number): T {
  const row = rows[index];

  if (row === undefined) {
    throw new Error(`No row at index ${index} of ${rows.length}.`);
  }

  return row;
}

/** A mutable stand-in row, for the cases about the store itself. */
interface TestRow {
  id: number;
  label: string;
}

beforeEach(() => {
  // Module-scoped state outlives a case, so without this every
  // assertion here would read whatever the case before it recorded and
  // the file would pass or fail on an order nobody chose.
  resetDrafts();
});

describe('applyDrafts', () => {
  it('answers the same rows for a resource nothing was recorded under', () => {
    // The commonest state by far: most reads on most renders have no
    // draft to overlay, so the pass-through has to be the cheap and
    // exactly-faithful case rather than the interesting one.
    // Arrange
    const scope = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');

    // Act
    const applied = applyDrafts(scope, SEEDED_SOURCES);

    // Assert
    expect(applied).toEqual(SEEDED_SOURCES);
  });

  it('answers the same rows for a resource outside the union', () => {
    // The resource unions are compile-time only. Nothing in this
    // module switches on the value, so a resource it has never heard
    // of is a key that misses rather than a case table falling off its
    // end — which is what a q15 endpoint naming a resource this app
    // does not know would reach, and what a plain JS caller reaches
    // today. Driving it needs the double cast: the literal types do
    // not overlap, so a single `as` is refused.
    // Arrange
    const scope = {
      kind: 'domain',
      slug: DEFAULT_DOMAIN_SLUG,
      resource: 'no-such-resource',
    } as unknown as DraftScope;

    // Act / Assert
    expect(() => applyDrafts(scope, SEEDED_SOURCES)).not.toThrow();
    expect(applyDrafts(scope, SEEDED_SOURCES)).toEqual(SEEDED_SOURCES);
  });

  it('never reaches a draft for a row the list does not carry', () => {
    // A stale draft — the row it edited is not in this answer. It must
    // not be appended: an overlay that could grow a list would be
    // inventing a row with no fixture and no endpoint behind it, which
    // reads as saved until the first reload.
    // Arrange
    const scope = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');

    recordDraft(scope, {
      ...rowAt(SEEDED_SOURCES, 0),
      id: ABSENT_SOURCE_ID,
      endpoint: 'https://example.test/never-rendered',
    });

    // Act
    const applied = applyDrafts(scope, SEEDED_SOURCES);

    // Assert
    expect(applied).toHaveLength(SEEDED_SOURCES.length);
    expect(applied).toEqual(SEEDED_SOURCES);
  });

  it('never shows one domain a draft recorded under another', () => {
    // The leak this module exists to make impossible. Both scopes name
    // the same resource and the same row id, and the rows handed over
    // are identical — only the slug differs, so the slug is the whole
    // of what is being tested.
    // Arrange
    const stored = rowAt(SEEDED_SOURCES, 0);
    const seeded = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const sparse = domainDraftScope(SPARSE_DOMAIN_SLUG, 'sources');

    recordDraft(seeded, { ...stored, endpoint: 'https://example.test/seeded' });

    // Act
    const applied = applyDrafts(sparse, [stored]);

    // Assert
    expect(applied).toEqual([stored]);
    expect(rowAt(applied, 0).endpoint).toBe(stored.endpoint);
  });

  it('never lets a deployment draft reach a domain read of one id', () => {
    // The other half of the split, and the half no cast can even
    // express through the constructors: `connectors` is not a
    // `DomainDraftResource`, so the two key spaces are separated by
    // the resource segment as well as by the scope segment. This pins
    // the runtime half of that claim.
    // Arrange
    const stored = rowAt(SEEDED_SOURCES, 0);
    const deployment = deploymentDraftScope('connectors');

    recordDraft(deployment, { id: stored.id, label: 'connector edit' });

    // Act
    const applied = applyDrafts(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources'),
      [stored],
    );

    // Assert
    expect(applied).toEqual([stored]);
  });

  it('replaces an edited row in the position its stored row held', () => {
    // Position matters as much as content: the accessor's own ordering
    // is part of what a surface MEANS, so an overlay that appended the
    // edit and dropped the original would reorder a table nobody
    // sorted.
    // Arrange
    const scope = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const stored = rowAt(SEEDED_SOURCES, 1);
    const edited = { ...stored, endpoint: 'https://example.test/edited' };

    recordDraft(scope, edited);

    // Act
    const applied = applyDrafts(scope, SEEDED_SOURCES);

    // Assert
    expect(applied).toHaveLength(SEEDED_SOURCES.length);
    expect(rowAt(applied, 1)).toEqual(edited);
    expect(applied.map((source) => source.id))
      .toEqual(SEEDED_SOURCES.map((source) => source.id));
  });

  it('hands back every unedited row as the object it was given', () => {
    // Identity, not just equality: this is what makes "an unedited row
    // is the fixture row" a property a later read can rely on rather
    // than a coincidence of two objects agreeing member by member.
    // Arrange
    const scope = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const edited = {
      ...rowAt(SEEDED_SOURCES, 1),
      endpoint: 'https://example.test/edited',
    };

    recordDraft(scope, edited);

    // Act
    const applied = applyDrafts(scope, SEEDED_SOURCES);
    const aliased = applied.filter(
      (row, index) => row === SEEDED_SOURCES[index],
    );

    // Assert — every row except the drafted one came back untouched.
    expect(aliased).toHaveLength(SEEDED_SOURCES.length - 1);
  });

  it('builds a fresh list and never writes to a frozen argument', () => {
    // The fixture arrays are readonly by type; freezing here makes the
    // claim hold at RUNTIME too, which is the only way an in-place
    // write would ever announce itself. A frozen array is also exactly
    // what a fixture accessor handing back its shared table looks
    // like.
    // Arrange
    const scope = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const rows = Object.freeze([...SEEDED_SOURCES]);
    const before = [...rows];

    recordDraft(scope, {
      ...rowAt(SEEDED_SOURCES, 0),
      endpoint: 'https://example.test/edited',
    });

    // Act
    const applied = applyDrafts(scope, rows);

    // Assert
    expect(applied).not.toBe(rows);
    expect(rows).toEqual(before);
  });

  it('answers an empty list for an empty list', () => {
    // The vacuity guard: every assertion above is a claim about rows,
    // and a version of this function that answered `[]` unconditionally
    // would fail them all — but a caller reading an empty domain still
    // needs the empty answer rather than a throw.
    // Arrange
    const scope = domainDraftScope(SPARSE_DOMAIN_SLUG, 'sources');

    recordDraft(scope, { id: 1, label: 'unreachable' });

    // Act / Assert
    expect(applyDrafts(scope, [])).toEqual([]);
  });
});

describe('recordDraft', () => {
  it('stores a copy, so editing the row afterwards changes nothing', () => {
    // A component holds its draft object and goes on editing it after
    // a save. Storing the reference would let those later keystrokes
    // rewrite the saved value behind the save's back, which presents
    // as a save that captured the wrong moment.
    // Arrange
    const scope = deploymentDraftScope('connectors');
    const draft: TestRow = { id: 1, label: 'at save time' };

    recordDraft(scope, draft);

    // Act
    draft.label = 'typed afterwards';

    const applied = applyDrafts<TestRow>(scope, [{ id: 1, label: 'stored' }]);

    // Assert
    expect(applied).toEqual([{ id: 1, label: 'at save time' }]);
  });

  it('replaces an edit already held for the same row', () => {
    // Every save is the whole row, so the last one is the answer.
    // Merging two drafts would resurrect a field the operator had
    // already changed back.
    // Arrange
    const scope = deploymentDraftScope('connectors');

    recordDraft(scope, { id: 1, label: 'first' });
    recordDraft(scope, { id: 1, label: 'second' });

    // Act
    const applied = applyDrafts<TestRow>(scope, [{ id: 1, label: 'stored' }]);

    // Assert
    expect(applied).toEqual([{ id: 1, label: 'second' }]);
  });

  it('keeps two domains edits of the same row id apart', () => {
    // The write-side half of the leak guard: the same id under two
    // slugs is two keys, so neither edit can ever be read as the
    // other's.
    // Arrange
    const seeded = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'personas');
    const sparse = domainDraftScope(SPARSE_DOMAIN_SLUG, 'personas');

    recordDraft(seeded, { id: 1, label: 'seeded edit' });
    recordDraft(sparse, { id: 1, label: 'sparse edit' });

    // Act
    const fromSeeded = applyDrafts<TestRow>(seeded, [{ id: 1, label: 'x' }]);
    const fromSparse = applyDrafts<TestRow>(sparse, [{ id: 1, label: 'x' }]);

    // Assert
    expect(fromSeeded).toEqual([{ id: 1, label: 'seeded edit' }]);
    expect(fromSparse).toEqual([{ id: 1, label: 'sparse edit' }]);
  });
});

describe('clearDrafts', () => {
  it('drops only the scope and resource it names', () => {
    // Arrange
    const sources = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const personas = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'personas');
    const otherDomain = domainDraftScope(SPARSE_DOMAIN_SLUG, 'sources');

    recordDraft(sources, { id: 1, label: 'sources edit' });
    recordDraft(personas, { id: 1, label: 'personas edit' });
    recordDraft(otherDomain, { id: 1, label: 'other domain edit' });

    // Act
    clearDrafts(sources);

    // Assert
    expect(applyDrafts<TestRow>(sources, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'stored' }]);
    expect(applyDrafts<TestRow>(personas, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'personas edit' }]);
    expect(applyDrafts<TestRow>(otherDomain, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'other domain edit' }]);
  });

  it('leaves a resource whose name it is a prefix of standing', () => {
    // No member of either union is a string prefix of another as the
    // unions stand, so this drives the KEY MECHANISM rather than a
    // live pair: adding a `source` beside `sources` would be an
    // ordinary widening, and the trailing separator is the whole of
    // what would keep it from dropping its neighbour's edits. Same
    // cast as the unknown-resource case above, for the same reason.
    // Arrange
    const shortName = {
      kind: 'domain',
      slug: DEFAULT_DOMAIN_SLUG,
      resource: 'source',
    } as unknown as DraftScope;
    const longName = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');

    recordDraft(shortName, { id: 1, label: 'short name edit' });
    recordDraft(longName, { id: 1, label: 'long name edit' });

    // Act
    clearDrafts(shortName);

    // Assert
    expect(applyDrafts<TestRow>(longName, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'long name edit' }]);
  });

  it('leaves a domain whose slug it is a prefix of standing', () => {
    // The same guard one segment earlier. Slugs are operator-chosen,
    // so one being a prefix of another is an ordinary thing rather
    // than a contrived one.
    // Arrange
    const shortSlug = domainDraftScope('example', 'sources');
    const longSlug = domainDraftScope('example-two', 'sources');

    recordDraft(shortSlug, { id: 1, label: 'short edit' });
    recordDraft(longSlug, { id: 1, label: 'long edit' });

    // Act
    clearDrafts(shortSlug);

    // Assert
    expect(applyDrafts<TestRow>(longSlug, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'long edit' }]);
  });

  it('is silent about a scope holding nothing', () => {
    // Discarding an editor nobody changed is an ordinary gesture, not
    // an error.
    // Arrange
    const scope = domainDraftScope(SPARSE_DOMAIN_SLUG, 'terms');

    // Act / Assert
    expect(() => clearDrafts(scope)).not.toThrow();
  });
});

describe('resetDrafts', () => {
  it('empties every scope at once', () => {
    // What the `beforeEach` above leans on, asserted rather than
    // assumed: a reset that cleared only one scope would leave every
    // later case in this file reading the one before it.
    // Arrange
    const sources = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const connectors = deploymentDraftScope('connectors');

    recordDraft(sources, { id: 1, label: 'sources edit' });
    recordDraft(connectors, { id: 1, label: 'connectors edit' });

    // Act
    resetDrafts();

    // Assert
    expect(applyDrafts<TestRow>(sources, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'stored' }]);
    expect(applyDrafts<TestRow>(connectors, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'stored' }]);
  });
});

describe('DEPLOYMENT_DRAFT_SCOPE', () => {
  it('carries a character no domain slug can', () => {
    // The disjointness argument the key rests on. Slugs are lowercase
    // path segments, so the `@` is what keeps the deployment half of
    // the key space unreachable from the domain half however either
    // grows — the same reasoning `hooks.ts` applies to its cache keys,
    // reached independently because this module sits below it.
    // Arrange / Act / Assert
    expect(DEPLOYMENT_DRAFT_SCOPE).toContain('@');
    expect(DEFAULT_DOMAIN_SLUG).not.toContain('@');
    expect(SPARSE_DOMAIN_SLUG).not.toContain('@');
  });
});
