import type { DraftScope } from './drafts';

import { beforeEach, describe, expect, it } from 'vitest';

import * as api from './api';
import { listConnectors, listExportSubscriptions } from './connectors';
import { listDocuments, listFindings } from './digest';
import { DEFAULT_DOMAIN_SLUG, SPARSE_DOMAIN_SLUG, getDomain } from './domains';
import {
  DEPLOYMENT_DRAFT_SCOPE,
  applyDrafts,
  applySingletonDraft,
  clearDrafts,
  clearSingletonDraft,
  deploymentDraftScope,
  domainDraftScope,
  recordDraft,
  recordSingletonDraft,
  resetDrafts,
} from './drafts';
import { listCategories, listTerms } from './lexicon';
import { listPersonas } from './personas';
import { listSourceProposals } from './proposals';
import { SETTINGS } from './settings';
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

describe('the singleton slot', () => {
  it('answers the stored value where nothing has been saved', () => {
    // The commonest state, and the singleton's half of the rule the
    // row overlay keeps: nothing saved is a pass-through of the very
    // object it was handed, by IDENTITY. That is what lets
    // `./settings.ts` go on handing every reader one frozen object.
    // Arrange
    const stored: TestRow = { id: 1, label: 'stored' };

    // Act
    const applied = applySingletonDraft('settings', stored);

    // Assert
    expect(applied).toBe(stored);
  });

  it('answers the value this tab saved once one is recorded', () => {
    // Arrange
    const stored: TestRow = { id: 1, label: 'stored' };

    recordSingletonDraft('settings', { id: 1, label: 'saved' });

    // Act
    const applied = applySingletonDraft<TestRow>('settings', stored);

    // Assert
    expect(applied).toEqual({ id: 1, label: 'saved' });
    expect(applied).not.toBe(stored);
  });

  it('stores a copy, so editing the value afterwards changes nothing', () => {
    // The same claim `recordDraft` makes, and it needs making twice
    // because the two writers are two functions: a surface that holds
    // its draft object and goes on editing it after a save would
    // otherwise rewrite the saved value behind the save's back.
    // Arrange
    const draft: TestRow = { id: 1, label: 'at save time' };

    recordSingletonDraft('settings', draft);

    // Act
    draft.label = 'typed afterwards';

    // Assert
    expect(applySingletonDraft<TestRow>('settings', { id: 1, label: 'x' }))
      .toEqual({ id: 1, label: 'at save time' });
  });

  it('replaces the value already saved rather than merging it', () => {
    // A preference set is saved whole, so the last save is the answer.
    // Merging two would resurrect a setting the operator had already
    // put back.
    // Arrange
    recordSingletonDraft('settings', { id: 1, label: 'first' });
    recordSingletonDraft('settings', { id: 1, label: 'second' });

    // Act
    const applied = applySingletonDraft<TestRow>(
      'settings',
      { id: 1, label: 'stored' },
    );

    // Assert
    expect(applied).toEqual({ id: 1, label: 'second' });
  });

  it('shares no key space with a row draft of the same resource name', () => {
    // The two maps are two stores, which is the whole reason there are
    // two: a singleton has no id segment, so a key built for one could
    // only collide with a row draft by accident. Driven through the
    // cast the unknown-resource cases above use, since `settings` is
    // deliberately not a member of either row union.
    // Arrange
    const asRow = {
      kind: 'deployment',
      resource: 'settings',
    } as unknown as DraftScope;

    recordDraft(asRow, { id: 1, label: 'row edit' });

    // Act
    const applied = applySingletonDraft<TestRow>(
      'settings',
      { id: 1, label: 'stored' },
    );

    // Assert
    expect(applied).toEqual({ id: 1, label: 'stored' });
  });

  it('is dropped by clearSingletonDraft and nothing else is', () => {
    // The discard gesture, at the only granularity a singleton has.
    // Arrange
    const rows = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');

    recordSingletonDraft('settings', { id: 1, label: 'saved' });
    recordDraft(rows, { id: 1, label: 'sources edit' });

    // Act
    clearSingletonDraft('settings');

    // Assert
    expect(applySingletonDraft<TestRow>('settings', { id: 1, label: 'x' }))
      .toEqual({ id: 1, label: 'x' });
    expect(applyDrafts<TestRow>(rows, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'sources edit' }]);
  });

  it('is silent about a resource holding nothing', () => {
    // Discarding a surface nobody changed is an ordinary gesture.
    // Arrange / Act / Assert
    expect(() => clearSingletonDraft('settings')).not.toThrow();
  });
});

describe('resetDrafts', () => {
  it('empties every scope at once', () => {
    // What the `beforeEach` above leans on, asserted rather than
    // assumed: a reset that cleared only one scope would leave every
    // later case in this file reading the one before it. The singleton
    // is asserted beside the rows because they are two MAPS — a reset
    // that emptied one would leak a case into the next through the
    // other, and every row-shaped case here would still pass.
    // Arrange
    const sources = domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources');
    const connectors = deploymentDraftScope('connectors');

    recordDraft(sources, { id: 1, label: 'sources edit' });
    recordDraft(connectors, { id: 1, label: 'connectors edit' });
    recordSingletonDraft('settings', { id: 1, label: 'settings edit' });

    // Act
    resetDrafts();

    // Assert
    expect(applyDrafts<TestRow>(sources, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'stored' }]);
    expect(applyDrafts<TestRow>(connectors, [{ id: 1, label: 'stored' }]))
      .toEqual([{ id: 1, label: 'stored' }]);
    expect(applySingletonDraft<TestRow>('settings', { id: 1, label: 'x' }))
      .toEqual({ id: 1, label: 'x' });
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

/**
 * The seeded domain's id, resolved once for the pair table below.
 *
 * Read off `./domains.ts` rather than written as a `1`, for the reason
 * every derived constant in this file is derived: a reseeded table
 * silently turns a hardcoded id into somebody else's domain and the
 * cases go on passing against rows nobody meant.
 */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * The seeded domain's first taxonomy category, whose terms the lexicon
 * pair reads and writes.
 */
const FIRST_CATEGORY_ID = rowAt(listCategories(SEEDED_DOMAIN_ID), 0).id;

/**
 * A seeded source whose captures include one that failed to parse.
 *
 * Derived through the same predicate `api.fetchSourceFailures` applies,
 * so the pair below is asking about a queue the fixtures really carry.
 * A document with no source at all is skipped rather than coerced:
 * `Document.sourceId` is nullable, and a capture nothing captured for
 * is not a source's failure.
 *
 * @returns Its id.
 * @throws If no seeded capture failed against a source, which would
 * make the failures pair vacuous rather than merely empty.
 */
function failingSourceId(): number {
  const failed = listDocuments(SEEDED_DOMAIN_ID).find(
    (document) => document.parseStatus === 'failed'
      && document.sourceId !== null,
  );

  if (failed === undefined || failed.sourceId === null) {
    throw new Error('No seeded capture failed against a source.');
  }

  return failed.sourceId;
}

/** The source whose failures the `resolveSourceFailure` pair rules on. */
const FAILING_SOURCE_ID = failingSourceId();

/** That source's failed captures, in the order the read answers them. */
const FAILED_CAPTURES = listDocuments(SEEDED_DOMAIN_ID).filter(
  (document) => document.parseStatus === 'failed'
    && document.sourceId === FAILING_SOURCE_ID,
);

/** A term weight no seeded term carries. */
const TERM_MARK = 91;

/** A verdict no seeded finding carries. */
const VERDICT_MARK = 'seam-verdict';

/** An endpoint no seeded source carries. */
const ENDPOINT_MARK = 'https://seam.example.test/feed';

/** A proposal status no seeded proposal carries. */
const PROPOSAL_MARK = 'skipped';

/** A parse error no seeded capture carries. */
const FAILURE_MARK = 'ruled on through the seam';

/** A system text no seeded persona carries. */
const PERSONA_MARK = 'Saved through the seam.';

/** A name no configured connector carries. */
const CONNECTOR_MARK = 'seam-connector';

/** A delivery interval no seeded subscription carries. */
const INTERVAL_MARK = 987_654;

/**
 * The prefix `./api.ts` gives every READ accessor and no write.
 *
 * What makes the coverage case below a derivation rather than a second
 * hand-written list: the writes are whatever the barrel exports that
 * does not begin with this, so a write added to `./api.ts` and to no
 * pair is reported by the set comparison instead of being quietly
 * uncovered. The partition claim beside it is what keeps the prefix
 * itself under test.
 */
const READ_PREFIX = 'fetch';

/** Every export of `./api.ts`, by name, with its value. */
const ACCESSORS = new Map<string, unknown>(Object.entries(api));

/** Every export of `./api.ts`, by name. */
const ACCESSOR_NAMES: readonly string[] = [...ACCESSORS.keys()];

/**
 * How many parameters one barrel export declares.
 *
 * Read off the FUNCTION rather than off the pair's own closure, which
 * would only ever report its own arity: the claim is about the
 * accessor, and a write that lost or gained its slug is exactly what
 * this has to be able to see.
 *
 * @param name - The export's name.
 * @returns Its declared parameter count.
 * @throws If the barrel exports no function by that name.
 */
function arityOf(name: string): number {
  const accessor = ACCESSORS.get(name);

  if (typeof accessor !== 'function') {
    throw new Error(`No accessor named ${name}.`);
  }

  return accessor.length;
}

/**
 * One write and the read that has to show it, as its case declares it.
 *
 * Generic in the READ's answer, which is the whole reason this shape
 * exists: {@link SeamPairSpec.marksIn} is checked against whatever the
 * accessor really resolves to, so a projector naming a member the row
 * does not carry is a COMPILE error rather than a run of `undefined`s
 * that every assertion below would happily compare. The pairs are
 * heterogeneous — a list, a join, a singleton, two parent-scoped
 * lists — and that is exactly what `./api.test.ts` says stopped it
 * making this claim over its own write table uniformly.
 *
 * @typeParam T - What the pair's read resolves to.
 */
interface SeamPairSpec<T> {
  /** The write accessor's exported name. */
  readonly write: string;
  /** The read accessor's exported name. */
  readonly read: string;
  /** Whether the write takes a resolved domain slug. */
  readonly scoped: boolean;
  /** The value the write puts where {@link marksIn} looks. */
  readonly mark: unknown;
  /** Save one edited SEEDED row, filed under this slug. */
  readonly save: (slug: string) => Promise<void>;
  /** What the matching read answers for this slug. */
  readonly load: (slug: string) => Promise<T>;
  /** That answer reduced to the field the mark was written into. */
  readonly marksIn: (answered: T) => readonly unknown[];
}

/**
 * One pair with its answer type erased, so the table can hold all
 * nine.
 */
interface SeamPair {
  /** The write accessor's exported name. */
  readonly write: string;
  /** The read accessor's exported name. */
  readonly read: string;
  /** Whether the write takes a resolved domain slug. */
  readonly scoped: boolean;
  /** The value the write puts where {@link marksIn} looks. */
  readonly mark: unknown;
  /** Save one edited SEEDED row, filed under this slug. */
  readonly save: (slug: string) => Promise<void>;
  /** What the matching read answers for this slug. */
  readonly load: (slug: string) => Promise<unknown>;
  /** That answer reduced to the field the mark was written into. */
  readonly marksIn: (answered: unknown) => readonly unknown[];
}

/**
 * Erase one pair's answer type, having checked its projector against
 * it.
 *
 * The single cast in this section, and it is the boundary the generic
 * exists to make safe: `load` and `marksIn` come from ONE spec, so the
 * value handed to the projector is the value that spec's own read
 * produced. Writing the table as {@link SeamPair} directly would have
 * moved that cast into all nine cases and taken the checking with it.
 *
 * @typeParam T - What the pair's read resolves to.
 * @param spec - The pair, fully checked.
 * @returns It, with the answer widened to `unknown`.
 */
function seamPair<T>(spec: SeamPairSpec<T>): SeamPair {
  return {
    write: spec.write,
    read: spec.read,
    scoped: spec.scoped,
    mark: spec.mark,
    save: spec.save,
    load: spec.load,
    marksIn: (answered) => spec.marksIn(answered as T),
  };
}

/**
 * Every write `./api.ts` exports, beside the read that has to show it.
 *
 * Each `save` edits a SEEDED row and files it under whichever slug it
 * is handed, which is what makes the cross-domain case below a real
 * leak test rather than two domains passing each other in the dark:
 * the row id exists on both sides, so only the scope can keep the edit
 * where it belongs.
 */
const PAIRS: readonly SeamPair[] = [
  seamPair({
    write: 'saveCategoryTerms',
    read: 'fetchTerms',
    scoped: true,
    mark: TERM_MARK,
    save: (slug) => api.saveCategoryTerms(slug, [
      { ...rowAt(listTerms(FIRST_CATEGORY_ID), 0), weight: TERM_MARK },
    ]),
    load: (slug) => api.fetchTerms(slug, FIRST_CATEGORY_ID),
    marksIn: (terms) => terms.map((term) => term.weight),
  }),
  seamPair({
    write: 'saveFinding',
    read: 'fetchFindings',
    scoped: true,
    mark: VERDICT_MARK,
    save: (slug) => api.saveFinding(slug, {
      ...rowAt(listFindings(SEEDED_DOMAIN_ID), 0),
      verdict: VERDICT_MARK,
    }),
    load: (slug) => api.fetchFindings(slug),
    marksIn: (findings) => findings.map((finding) => finding.verdict),
  }),
  seamPair({
    write: 'saveSource',
    read: 'fetchSources',
    scoped: true,
    mark: ENDPOINT_MARK,
    save: (slug) => api.saveSource(slug, {
      ...rowAt(listSources(SEEDED_DOMAIN_ID), 0),
      endpoint: ENDPOINT_MARK,
    }),
    load: (slug) => api.fetchSources(slug),
    marksIn: (sources) => sources.map((source) => source.endpoint),
  }),
  seamPair({
    write: 'approveSourceConfig',
    read: 'fetchSourceProposals',
    scoped: true,
    mark: PROPOSAL_MARK,
    save: (slug) => {
      // A named value rather than a literal at the call site: the
      // accessor's parameter is the store's structural `DraftableRow`,
      // and a fresh literal would be excess-property-checked against
      // it rather than against the proposal it is.
      const ruled = {
        ...rowAt(listSourceProposals(SEEDED_DOMAIN_ID), 0),
        status: PROPOSAL_MARK,
      };

      return api.approveSourceConfig(slug, ruled);
    },
    load: (slug) => api.fetchSourceProposals(slug),
    marksIn: (proposals) => proposals.map((proposal) => proposal.status),
  }),
  seamPair({
    write: 'resolveSourceFailure',
    read: 'fetchSourceFailures',
    scoped: true,
    mark: FAILURE_MARK,
    // The parse STATUS is left alone deliberately. The read's
    // predicate runs over the overlay, so a ruling that cleared the
    // status would take the row out of the queue and there would be
    // nothing left to find the mark on — a real behaviour, and the
    // failures modal's to choose rather than this file's.
    save: (slug) => api.resolveSourceFailure(slug, {
      ...rowAt(FAILED_CAPTURES, 0),
      parseError: FAILURE_MARK,
    }),
    load: (slug) => api.fetchSourceFailures(slug, FAILING_SOURCE_ID),
    marksIn: (documents) => documents.map((document) => document.parseError),
  }),
  seamPair({
    write: 'savePersona',
    read: 'fetchPersonas',
    scoped: true,
    mark: PERSONA_MARK,
    save: (slug) => api.savePersona(slug, {
      ...rowAt(listPersonas(SEEDED_DOMAIN_ID), 0),
      systemText: PERSONA_MARK,
    }),
    load: (slug) => api.fetchPersonas(slug),
    marksIn: (personas) => personas.map((persona) => persona.systemText),
  }),
  seamPair({
    write: 'saveConnector',
    read: 'fetchConnectors',
    scoped: false,
    mark: CONNECTOR_MARK,
    // Both halves ignore the slug, which is the claim rather than an
    // oversight: `connectors` carries no `domain_id`, so this pair is
    // the one the cross-domain block below cannot ask anything of.
    save: () => api.saveConnector({
      ...rowAt(listConnectors(), 0),
      name: CONNECTOR_MARK,
    }),
    load: () => api.fetchConnectors(),
    marksIn: (connectors) => connectors.map((connector) => connector.name),
  }),
  seamPair({
    write: 'saveExportSubscriptions',
    read: 'fetchExportSubscriptions',
    scoped: true,
    mark: INTERVAL_MARK,
    save: (slug) => api.saveExportSubscriptions(slug, [
      {
        ...rowAt(listExportSubscriptions(SEEDED_DOMAIN_ID), 0),
        intervalSeconds: INTERVAL_MARK,
      },
    ]),
    load: (slug) => api.fetchExportSubscriptions(slug),
    // The one projector that reaches THROUGH the read's own shape: the
    // export list answers summaries, so the drafted row is a member of
    // the answer rather than the answer itself.
    marksIn: (summaries) => summaries.map(
      (summary) => summary.subscription.intervalSeconds,
    ),
  }),
  seamPair({
    write: 'saveSettings',
    read: 'fetchSettings',
    scoped: false,
    mark: SPARSE_DOMAIN_SLUG,
    // The singleton pair. It has no row and no id, so it travels
    // through the store's second map — and the cases below reach it
    // without knowing that, which is the point of asking at the seam.
    save: () => api.saveSettings({
      ...SETTINGS,
      defaultDomainSlug: SPARSE_DOMAIN_SLUG,
    }),
    load: () => api.fetchSettings(),
    marksIn: (settings) => [settings.defaultDomainSlug],
  }),
];

/** The pairs a second domain can be asked about. */
const SCOPED_PAIRS = PAIRS.filter((pair) => pair.scoped);

describe('the seam, end to end', () => {
  // Everything above this block is about the store on its own: rows
  // in, rows out, one scope invisible to another. These cases drive
  // the WHOLE seam — `./api.ts`'s write, this store, and `./api.ts`'s
  // matching read — because the two invariants an operator actually
  // depends on span all three and neither module's own file can make
  // them. `./api.test.ts` says why it makes its write claims at the
  // SCOPE instead: its reads do not share a shape, so no one assertion
  // covers its table. The projector per pair is what buys that here.

  it('pairs every write the seam exports with the read that shows it', () => {
    // The coverage guard every claim below rests on. Derived from the
    // barrel rather than written out, so a write added to `./api.ts`
    // and to no pair is reported here instead of being covered by
    // nothing and named by nothing.
    // Arrange
    const paired = PAIRS.map((pair) => pair.write).sort();

    // Act
    const written = ACCESSOR_NAMES
      .filter((name) => !name.startsWith(READ_PREFIX))
      .sort();
    const read = ACCESSOR_NAMES.filter((name) => name.startsWith(READ_PREFIX));

    // Assert
    expect(paired).toEqual(written);
    // The prefix itself, under test: it has to split the barrel with
    // nothing left over and neither half empty, or the derivation
    // above is a filter that happens to answer the right names.
    expect(written.length + read.length).toBe(ACCESSOR_NAMES.length);
    expect(written.length).toBeGreaterThan(0);
    expect(read.length).toBeGreaterThan(0);
  });

  it('names a real read once per pair', () => {
    // Two near misses the set comparison above cannot catch: a pair
    // pointed at a read the barrel does not export, and two pairs
    // sharing one read — which would leave some other write's read
    // unexercised while every count still agreed.
    // Arrange
    const named = PAIRS.map((pair) => pair.read);

    // Act
    const unexported = named.filter((name) => !ACCESSOR_NAMES.includes(name));
    const duplicated = named.filter(
      (name, index) => named.indexOf(name) !== index,
    );

    // Assert
    expect(unexported).toEqual([]);
    expect(duplicated).toEqual([]);
  });

  it('agrees with the accessors about which writes take a slug', () => {
    // `scoped` decides which pairs the cross-domain block below runs
    // over, so a flag that disagreed with the accessor would silently
    // shrink that block. Read off the function's own arity rather than
    // off a second literal list.
    // Arrange
    const declared = PAIRS.map((pair) => ({
      write: pair.write,
      scoped: pair.scoped,
      arity: arityOf(pair.write),
    }));

    // Act
    const disagreeing = declared.filter(
      (entry) => entry.scoped !== (entry.arity === 2),
    );

    // Assert
    expect(disagreeing).toEqual([]);
    expect(declared.filter((entry) => !entry.scoped).map((e) => e.write))
      .toEqual(['saveConnector', 'saveSettings']);
    expect(SCOPED_PAIRS).toHaveLength(PAIRS.length - 2);
  });

  PAIRS.forEach((pair) => {
    it(`marks a field the read really answers: ${pair.write}`, async () => {
      // The vacuity guard the two invariants rest on, and it has three
      // halves. A read answering nothing makes every `toContain` below
      // unfalsifiable; a projector reading a member the row does not
      // carry answers `undefined`s that would compare cleanly forever;
      // and a mark the fixture already holds round-trips perfectly
      // while proving nothing about the write.
      // Arrange / Act
      const marks = pair.marksIn(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Assert
      expect(marks.length).toBeGreaterThan(0);
      expect(marks).not.toContain(undefined);
      expect(marks).not.toContain(pair.mark);
    });

    it(`shows a write through the matching read: ${pair.write}`, async () => {
      // The first invariant, end to end. Not "the edit reached the
      // store" — `./api.test.ts` asks that at the scope — but "the
      // read a surface holds open beside the editor answers what the
      // save just recorded", which is the whole reason the store
      // exists.
      // Arrange
      const before = pair.marksIn(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Act
      await pair.save(DEFAULT_DOMAIN_SLUG);

      const after = pair.marksIn(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Assert
      expect(after).toContain(pair.mark);
      // The overlay replaces a row rather than adding one, so a save
      // that grew the answer would be inventing a record no endpoint
      // ever issued — and exactly one row may wear the mark, or the
      // save landed on more of the list than it was handed.
      expect(after).toHaveLength(before.length);
      expect(after.filter((value) => value === pair.mark)).toHaveLength(1);
    });

    it(`forgets the write when the tab reloads: ${pair.write}`, async () => {
      // What makes the case above evidence about the STORE rather than
      // about a mutated fixture: a save that had written through to
      // the fixture rows would satisfy it identically and survive
      // this. `resetDrafts` is a reload at this layer — the module
      // header says a reload is the app's own reset, and the
      // Playwright specs lean on the same property.
      // Arrange
      const stored = pair.marksIn(await pair.load(DEFAULT_DOMAIN_SLUG));

      await pair.save(DEFAULT_DOMAIN_SLUG);

      const saved = pair.marksIn(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Act
      resetDrafts();

      const reloaded = pair.marksIn(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Assert — the save is asserted here rather than assumed, so a
      // write that recorded nothing cannot pass this as a clean
      // reload.
      expect(saved).toContain(pair.mark);
      expect(reloaded).not.toContain(pair.mark);
      expect(reloaded).toEqual(stored);
    });
  });

  SCOPED_PAIRS.forEach((pair) => {
    it(`leaves a second domain byte-identical: ${pair.write}`, async () => {
      // The second invariant, end to end and in the one direction this
      // package can ask it. The SPARSE domain carries no rows, so a
      // read of it overlays an empty list whatever scope it built and
      // an accessor hardcoded to the seeded slug would pass; asked the
      // other way round — save under the sparse slug, read the seeded
      // domain — the same fault puts the edit straight into the answer
      // and this fails. The row saved is the SEEDED one, so its id
      // exists on both sides and only the scope keeps it out.
      //
      // The control is in this case and not beside it: a save the
      // whole seam had quietly stopped performing would leave the
      // second domain byte-identical too, and nothing else here would
      // say so.
      // Arrange
      const before = JSON.stringify(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Act
      await pair.save(SPARSE_DOMAIN_SLUG);

      const across = JSON.stringify(await pair.load(DEFAULT_DOMAIN_SLUG));

      await pair.save(DEFAULT_DOMAIN_SLUG);

      const control = JSON.stringify(await pair.load(DEFAULT_DOMAIN_SLUG));

      // Assert
      expect(across).toBe(before);
      expect(control).not.toBe(before);
    });
  });
});
