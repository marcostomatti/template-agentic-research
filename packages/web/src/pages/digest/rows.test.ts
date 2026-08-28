import type { Document, Entity, Finding, Source } from '../../data/types';

import { describe, expect, it } from 'vitest';

import {
  listDocuments,
  listEntities,
  listFindings,
} from '../../data/digest';
import { DEFAULT_DOMAIN_SLUG, getDomain } from '../../data/domains';
import { listSources } from '../../data/sources';
import { filterByQuery } from '../filters';

import {
  DIGEST_QUERY_FIELDS,
  NO_SOURCE_LABEL,
  TAG_SEPARATOR,
  UNKNOWN_SOURCE_LABEL,
  buildDigestRows,
  rowCountLabel,
  tagLine,
  verdictTone,
} from './rows';

/**
 * The four reads for the seeded domain, as a page holds them.
 *
 * A function rather than a describe-scope constant: `getDomain` throws,
 * and a throw at collection time takes the whole FILE down instead of
 * reporting the one test that depends on it.
 *
 * @returns The lists `buildDigestRows` takes.
 */
function seededReads() {
  const domainId = getDomain(DEFAULT_DOMAIN_SLUG).id;

  return {
    findings: listFindings(domainId),
    documents: listDocuments(domainId),
    entities: listEntities(domainId),
    sources: listSources(domainId),
  };
}

/** A finding carrying only what a test names. */
function findingWith(overrides: Partial<Finding>): Finding {
  return {
    id: 1,
    domainId: 1,
    documentId: 1,
    entityId: null,
    fields: { summary: 'A reading.' },
    score: null,
    scoreVersion: null,
    verdict: null,
    createdAt: '2026-06-11T06:00:00.000Z',
    ...overrides,
  };
}

/** A document carrying only what a test names. */
function documentWith(overrides: Partial<Document>): Document {
  return {
    id: 1,
    domainId: 1,
    sourceId: null,
    hash: 'a'.repeat(64),
    url: null,
    body: 'Body.',
    capturedAt: '2026-06-11T05:00:00.000Z',
    parseStatus: 'ok',
    parseError: null,
    ...overrides,
  };
}

/** An entity carrying only what a test names. */
function entityWith(overrides: Partial<Entity>): Entity {
  return {
    id: 1,
    domainId: 1,
    name: 'A Subject',
    nameNorm: 'a subject',
    aliasOf: null,
    attributes: {},
    ...overrides,
  };
}

/** A source carrying only what a test names. */
function sourceWith(overrides: Partial<Source>): Source {
  return {
    id: 1,
    domainId: 1,
    kind: 'rss',
    endpoint: 'https://example.org/feed.xml',
    cursor: null,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    enabled: true,
    flagged: false,
    ...overrides,
  };
}

describe('verdictTone', () => {
  it('draws each verdict of the seeded ladder in its own tone', () => {
    // Compared against a literal map rather than against the module's
    // own table, so a re-toned verdict is a failure here and not a
    // silent restyle of the digest.
    // Arrange
    const ladder = ['avoid', 'caution', 'neutral', 'interested'];

    // Act
    const tones = ladder.map((verdict) => verdictTone(verdict));

    // Assert
    expect(tones).toEqual(['danger', 'warning', 'neutral', 'success']);
  });

  it('draws a finding with no verdict as neutral', () => {
    // Arrange / Act / Assert
    expect(verdictTone(null)).toBe('neutral');
  });

  it('draws a verdict it has no colour for as informational', () => {
    // Another domain's vocabulary reaches this. The tone has to differ
    // from the no-verdict one, or a ruling this shell cannot colour
    // looks exactly like no ruling at all — which is the case this
    // module's header says the middle branch exists for.
    // Arrange / Act
    const unknown = verdictTone('promising');

    // Assert
    expect(unknown).toBe('info');
    expect(unknown).not.toBe(verdictTone(null));
  });
});

describe('tagLine', () => {
  it('says nothing at all for a row with no tags', () => {
    // Undefined rather than `''`: the cell's second line is optional,
    // and an empty string would reserve its height on every untagged
    // row.
    // Arrange / Act / Assert
    expect(tagLine([])).toBeUndefined();
  });

  it('hands back a single tag unchanged', () => {
    // Arrange / Act / Assert
    expect(tagLine(['message queue'])).toBe('message queue');
  });

  it('joins several with the separator the cell draws', () => {
    // Arrange / Act
    const line = tagLine(['message queue', 'generally available']);

    // Assert
    expect(line).toBe(`message queue${TAG_SEPARATOR}generally available`);
  });
});

describe('rowCountLabel', () => {
  it('states a plain count while nothing is narrowing the list', () => {
    // Arrange / Act / Assert
    expect(rowCountLabel(6, 6)).toBe('6 findings');
  });

  it('says what the rows on screen are a subset of', () => {
    // The reading that tells an operator the rows they cannot see are
    // still there.
    // Arrange / Act / Assert
    expect(rowCountLabel(2, 6)).toBe('2 of 6 findings');
  });

  it('counts a single finding in the singular', () => {
    // Arrange / Act / Assert
    expect(rowCountLabel(1, 1)).toBe('1 finding');
  });

  it('keeps the noun with the total, not with what is shown', () => {
    // One row of one domain's six is still six findings — the noun
    // agrees with the set, which is the half a naive plural gets
    // wrong.
    // Arrange / Act / Assert
    expect(rowCountLabel(1, 6)).toBe('1 of 6 findings');
  });
});

describe('buildDigestRows over the seeded fixtures', () => {
  it('builds one row per finding, in the order they arrived', () => {
    // The guard every whole-table claim below rests on — an empty
    // findings list would satisfy all of them — and the ordering
    // claim: the digest shows the latest readings, and the order is
    // the accessor's rather than this module's.
    // Arrange
    const reads = seededReads();

    // Act
    const rows = buildDigestRows(reads);

    // Assert
    expect(rows).not.toHaveLength(0);
    expect(rows.map((row) => row.id))
      .toEqual(reads.findings.map((finding) => finding.id));
  });

  it('reads every joined column off the fixtures', () => {
    // The single highest-yield assertion in the file: every row, keyed
    // by its own id, with each derivation that reaches a cell. A
    // changed lookup, a dropped alias hop, a mis-parsed endpoint or a
    // parse flag read off the wrong row all print the offending row.
    // Arrange / Act
    const rows = buildDigestRows(seededReads()).map((row) => ({
      id: row.id,
      verdict: row.verdict,
      score: row.score,
      categoryKey: row.categoryKey,
      sourceLabel: row.sourceLabel,
      parseFailed: row.parseFailed,
    }));

    // Assert
    expect(rows).toEqual([
      {
        id: 6,
        verdict: 'interested',
        score: 8.5,
        categoryKey: 'technologies',
        sourceLabel: 'api · api.example.com',
        parseFailed: false,
      },
      {
        id: 5,
        verdict: 'caution',
        score: 2.5,
        categoryKey: 'technologies',
        sourceLabel: 'rss · example.org',
        // The finding read out of a document whose parse failed. A
        // row, not an absence — see `../../data/digest.ts`.
        parseFailed: true,
      },
      {
        id: 4,
        verdict: 'neutral',
        // Scored to zero, which the null two rows down is not.
        score: 0,
        // Reached through the alias row: finding 4 names entity 4,
        // which stands for entity 2. Nothing else in this table
        // exercises the hop.
        categoryKey: 'technologies',
        sourceLabel: 'url · example.net',
        parseFailed: false,
      },
      {
        id: 3,
        verdict: 'caution',
        score: 5,
        categoryKey: 'technologies',
        sourceLabel: 'url · example.net',
        parseFailed: false,
      },
      {
        id: 2,
        verdict: 'avoid',
        score: 1.5,
        // A subject recording no bucket at all.
        categoryKey: null,
        sourceLabel: 'api · api.example.com',
        parseFailed: false,
      },
      {
        id: 1,
        verdict: null,
        // Never scored — the pair with the zero above.
        score: null,
        // A finding about no subject.
        categoryKey: null,
        sourceLabel: NO_SOURCE_LABEL,
        parseFailed: false,
      },
    ]);
  });

  it('reads the summary and the tags out of each payload', () => {
    // Both ends of the contract in one claim: the payload carrying
    // every field it names, and the sparse one carrying the required
    // field alone.
    // Arrange / Act
    const rows = buildDigestRows(seededReads());
    const fullest = rows.find((row) => row.id === 6);
    const sparsest = rows.find((row) => row.id === 5);

    // Assert
    expect(fullest?.tags).toEqual(['message queue', 'generally available']);
    expect(fullest?.summary).toMatch(/general availability/);
    expect(sparsest?.tags).toEqual([]);
    expect(sparsest?.summary).not.toBeNull();
  });
});

describe('buildDigestRows on reads that disagree', () => {
  // What the fixtures cannot produce and four HTTP reads eventually
  // will: each list arriving at its own time, from its own commit.

  it('keeps a row whose document did not arrive', () => {
    // Arrange
    const reads = {
      findings: [findingWith({ documentId: 99 })],
      documents: [],
      entities: [],
      sources: [],
    };

    // Act
    const rows = buildDigestRows(reads);

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceLabel).toBe(UNKNOWN_SOURCE_LABEL);
    expect(rows[0]?.parseFailed).toBe(false);
  });

  it('keeps a row whose source did not arrive', () => {
    // Distinct from the case above: the document is here and names a
    // source, so the miss is one level further down.
    // Arrange
    const reads = {
      findings: [findingWith({ documentId: 7 })],
      documents: [documentWith({ id: 7, sourceId: 42 })],
      entities: [],
      sources: [],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.sourceLabel)
      .toBe(UNKNOWN_SOURCE_LABEL);
  });

  it('keeps a row whose subject did not arrive', () => {
    // Arrange
    const reads = {
      findings: [findingWith({ entityId: 42 })],
      documents: [documentWith({})],
      entities: [],
      sources: [],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.categoryKey).toBeNull();
  });

  it('falls back to the alias row when its target did not arrive', () => {
    // The tolerant half of the one-hop rule: the alias itself is what
    // is left, so whatever IT records is what the row says.
    // Arrange
    const reads = {
      findings: [findingWith({ entityId: 8 })],
      documents: [documentWith({})],
      entities: [
        entityWith({ id: 8, aliasOf: 42, attributes: { category: 'phrases' } }),
      ],
      sources: [],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.categoryKey).toBe('phrases');
  });

  it('prefers the subject a live alias points at', () => {
    // The opposite leg, and the one that fails if the hop is dropped:
    // both rows carry a bucket, so only following the alias gives the
    // subject's.
    // Arrange
    const reads = {
      findings: [findingWith({ entityId: 8 })],
      documents: [documentWith({})],
      entities: [
        entityWith({ id: 8, aliasOf: 9, attributes: { category: 'phrases' } }),
        entityWith({ id: 9, attributes: { category: 'industries' } }),
      ],
      sources: [],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.categoryKey).toBe('industries');
  });

  it('follows an alias once and no further', () => {
    // The cap `../../data/types.ts` records: a chain resolves to the
    // middle row, because following it to the end is what a cycle
    // would hang the render on.
    // Arrange
    const reads = {
      findings: [findingWith({ entityId: 8 })],
      documents: [documentWith({})],
      entities: [
        entityWith({ id: 8, aliasOf: 9 }),
        entityWith({ id: 9, aliasOf: 10, attributes: { category: 'phrases' } }),
        entityWith({ id: 10, attributes: { category: 'industries' } }),
      ],
      sources: [],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.categoryKey).toBe('phrases');
  });

  it('says nothing rather than something wrong for a payload that lies', () => {
    // `fields` is JSON: the contract is a rule the pipeline applies,
    // not one the type enforces. A summary that is not text reads as
    // absent, and tags that are not text are dropped rather than
    // stringified into the cell.
    // Arrange
    const reads = {
      findings: [findingWith({ fields: { summary: 42, tags: ['a', 7, null] } })],
      documents: [documentWith({})],
      entities: [],
      sources: [],
    };

    // Act
    const row = buildDigestRows(reads)[0];

    // Assert
    expect(row?.summary).toBeNull();
    expect(row?.tags).toEqual(['a']);
  });

  it('drops a tags field that is not a list', () => {
    // Arrange
    const reads = {
      findings: [findingWith({ fields: { summary: 'A reading.', tags: 'a' } })],
      documents: [documentWith({})],
      entities: [],
      sources: [],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.tags).toEqual([]);
  });

  it('labels a source whose endpoint will not parse with the endpoint', () => {
    // Operator-entered, so it can be anything. `URL` throws on a
    // relative one, and a row that threw would take the surface down.
    // Arrange
    const reads = {
      findings: [findingWith({ documentId: 7 })],
      documents: [documentWith({ id: 7, sourceId: 3 })],
      entities: [],
      sources: [sourceWith({ id: 3, kind: 'push', endpoint: 'not a url' })],
    };

    // Act / Assert
    expect(buildDigestRows(reads)[0]?.sourceLabel)
      .toBe(`push${TAG_SEPARATOR}not a url`);
  });
});

describe('DIGEST_QUERY_FIELDS', () => {
  it('searches the summary, the tags, the verdict and the source', () => {
    // One query per field, each matching exactly one row of the
    // seeded set — the claim a single reader would pass without
    // making.
    // Arrange
    const rows = buildDigestRows(seededReads());
    const queries = ['general availability', 'end of life', 'avoid', 'hand'];

    // Act
    const matched = queries.map(
      (query) => filterByQuery(rows, query, DIGEST_QUERY_FIELDS)
        .map((row) => row.id),
    );

    // Assert
    expect(matched).toEqual([[6], [2], [2], [1]]);
  });

  it('does not search what the row shows as a number or a date', () => {
    // Both have a control of their own, and a search box matching a
    // year against a date rendered as `2 days ago` is a hit that looks
    // like a bug.
    // Arrange
    const rows = buildDigestRows(seededReads());

    // Act
    const byScore = filterByQuery(rows, '8.5', DIGEST_QUERY_FIELDS);
    const byDate = filterByQuery(rows, '2026-06-11', DIGEST_QUERY_FIELDS);

    // Assert
    expect(byScore).toEqual([]);
    expect(byDate).toEqual([]);
  });
});
