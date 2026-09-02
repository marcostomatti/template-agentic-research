import type { Document, Finding, Source } from '../../data/types';

import { describe, expect, it } from 'vitest';

import {
  listDocuments,
  listEntities,
  listFindings,
} from '../../data/digest';
import { DEFAULT_DOMAIN_SLUG, getDomain } from '../../data/domains';
import { listSources } from '../../data/sources';

import { RESEARCH_REQUEST_FIELD, sendToResearch } from './actions';
import {
  EXCERPT_ELLIPSIS,
  EXCERPT_LIMIT,
  UNREADABLE_FIELD_VALUE,
  bodyExcerpt,
  buildFindingDetail,
  detailFields,
  findingSummary,
  readFieldValue,
} from './detail';
import {
  NO_SOURCE_LABEL,
  UNKNOWN_SOURCE_LABEL,
  buildDigestRows,
} from './rows';

/** The instant a queued intention is stamped with, in these cases. */
const REQUESTED_AT = '2026-06-11T14:30:00.000Z';

/**
 * The three reads a detail is joined from, for the seeded domain.
 *
 * A function rather than a describe-scope constant: `getDomain`
 * throws, and a throw at collection time takes the whole FILE down
 * instead of reporting the one test that depends on it.
 *
 * @returns The lists {@link buildFindingDetail} takes, plus the
 * entities the row builder wants for the agreement case below.
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

/**
 * One seeded finding, by id.
 *
 * Throws rather than answering a nullable, so every `expect` below a
 * call is about a row that exists — a case that quietly asserted
 * against `undefined` would report the fixture rather than the code.
 *
 * @param id - The `findings.id` wanted.
 * @returns That finding.
 */
function seededFinding(id: number): Finding {
  const found = seededReads().findings.find((finding) => finding.id === id);

  if (found === undefined) {
    throw new Error(`No seeded finding carries id ${id}.`);
  }

  return found;
}

/** A finding carrying only what a case names. */
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

/** A source carrying only what a case names. */
function sourceWith(overrides: Partial<Source>): Source {
  return {
    id: 1,
    domainId: 1,
    kind: 'rss',
    endpoint: 'https://feed.test/rss.xml',
    cursor: null,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    enabled: true,
    flagged: false,
    ...overrides,
  };
}

/** A document carrying only what a case names. */
function documentWith(overrides: Partial<Document>): Document {
  return {
    id: 1,
    domainId: 1,
    sourceId: null,
    hash: 'hash-1',
    url: null,
    body: 'Extracted text.',
    capturedAt: '2026-06-11T05:00:00.000Z',
    parseStatus: 'ok',
    parseError: null,
    ...overrides,
  };
}

describe('findingSummary', () => {
  it('answers null for a payload carrying no summary at all', () => {
    // Arrange / Act / Assert
    expect(findingSummary(findingWith({ fields: {} }))).toBeNull();
  });

  it('answers null for a summary that is not text', () => {
    // A payload is JSON, so `required` is a rule the pipeline applies
    // rather than one the type enforces: a number here would be drawn
    // as the dialog's own title and would hide the fault.
    // Arrange / Act / Assert
    expect(findingSummary(findingWith({ fields: { summary: 42 } })))
      .toBeNull();
  });

  it('reads the same summary the table cell reads', () => {
    // The claim the shared `SUMMARY_FIELD` buys: a modal opened over a
    // row must name the finding the way the row named it. Compared
    // against the row BUILDER rather than a literal, so a key that
    // drifted in either module reddens here.
    // Arrange
    const reads = seededReads();
    const rows = buildDigestRows(reads);

    // Act
    const named = reads.findings.map((finding) => findingSummary(finding));

    // Assert
    expect(rows).not.toHaveLength(0);
    expect(named).toEqual(rows.map((row) => row.summary));
  });
});

describe('readFieldValue', () => {
  it('answers the unreadable line for a value JSON cannot write', () => {
    // Negative first, and the branch the header says a detail view
    // must never be a blank screen over. A circular value throws
    // inside `JSON.stringify`.
    // Arrange
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    // Assert
    expect(readFieldValue(circular)).toBe(UNREADABLE_FIELD_VALUE);
    expect(readFieldValue(undefined)).toBe(UNREADABLE_FIELD_VALUE);
    expect(readFieldValue(() => undefined)).toBe(UNREADABLE_FIELD_VALUE);
  });

  it('passes a string through without quoting it', () => {
    // Arrange / Act / Assert
    expect(readFieldValue('deprecated')).toBe('deprecated');
  });

  it('writes every other JSON value as JSON', () => {
    // The distinctions the quoting keeps: a zero from the text zero, a
    // null from a key nobody set, an empty list from an empty object.
    // Arrange / Act / Assert
    expect(readFieldValue(0)).toBe('0');
    expect(readFieldValue(false)).toBe('false');
    expect(readFieldValue(null)).toBe('null');
    expect(readFieldValue([])).toBe('[]');
    expect(readFieldValue({})).toBe('{}');
    expect(readFieldValue(['a', 'b'])).toBe('["a","b"]');
    expect(readFieldValue({ docs: 'https://example.net/x' }))
      .toBe('{"docs":"https://example.net/x"}');
  });
});

describe('detailFields', () => {
  it('drops the key this shell reserves on the row', () => {
    // Driven through `sendToResearch` rather than by planting the key
    // by hand: what must not appear in an operator's payload block is
    // whatever the queue action actually wrote, and a case writing its
    // own copy would pass over a reservation the action had stopped
    // making.
    // Arrange
    const outcome = sendToResearch(
      findingWith({ fields: { summary: 'A reading.', mentions: 3 } }),
      REQUESTED_AT,
    );

    if (!outcome.sent) {
      throw new Error('Expected the finding to be queued, and it was not.');
    }

    // Act
    const names = detailFields(outcome.finding.fields).map((row) => row.name);

    // Assert
    expect(Object.keys(outcome.finding.fields))
      .toContain(RESEARCH_REQUEST_FIELD);
    expect(names).not.toContain(RESEARCH_REQUEST_FIELD);
    expect(names).toEqual(['summary', 'mentions']);
  });

  it('answers nothing for a payload with no keys', () => {
    // `{}` is a valid `fields` value — `../../data/types.ts` says so.
    // Arrange / Act / Assert
    expect(detailFields({})).toEqual([]);
  });

  it('keeps the order the payload recorded, not the alphabet', () => {
    // The contract's own ordering is a statement about which fields
    // matter; sorting would replace it. `mentions` before `firstSeenAt`
    // is exactly what an alphabetiser would swap.
    // Arrange / Act
    const names = detailFields({
      summary: 'A reading.',
      mentions: 3,
      firstSeenAt: '2026-06-08T00:00:00.000Z',
    }).map((row) => row.name);

    // Assert
    expect(names).toEqual(['summary', 'mentions', 'firstSeenAt']);
  });

  it('shows every seeded finding its whole payload', () => {
    // The composition claim behind "nothing else is dropped": no
    // seeded payload carries a reserved key, so every one of them must
    // come back at full width. Written as a per-finding comparison
    // rather than a total, which is what catches a filter that emptied
    // one payload and left the rest.
    // Arrange
    const findings = seededReads().findings;

    // Act
    const widths = findings.map((finding) => ({
      id: finding.id,
      shown: detailFields(finding.fields).length,
    }));

    // Assert
    expect(findings).not.toHaveLength(0);
    expect(widths).toEqual(findings.map((finding) => ({
      id: finding.id,
      shown: Object.keys(finding.fields).length,
    })));
  });
});

describe('bodyExcerpt', () => {
  it('answers the empty string for a body that is only whitespace', () => {
    // Negative first: this is the reading the modal turns into "there
    // is no text to show", so a blank body must not draw an excerpt
    // block made of spaces.
    // Arrange / Act / Assert
    expect(bodyExcerpt('   \n\t ', EXCERPT_LIMIT)).toBe('');
    expect(bodyExcerpt('', EXCERPT_LIMIT)).toBe('');
  });

  it('cuts a single token at the limit when there is no space', () => {
    // The other refusal: backing up to the last space would answer the
    // empty string here, which shows nothing at all.
    // Arrange
    const solid = 'x'.repeat(20);

    // Act
    const cut = bodyExcerpt(solid, 8);

    // Assert
    expect(cut).toBe(`xxxxxxxx${EXCERPT_ELLIPSIS}`);
  });

  it('answers a short body whole, and unmarked', () => {
    // The mark means there is more; a mark here would be a lie about
    // the document.
    // Arrange / Act
    const shown = bodyExcerpt('  Conference notes.  ', EXCERPT_LIMIT);

    // Assert
    expect(shown).toBe('Conference notes.');
    expect(shown).not.toContain(EXCERPT_ELLIPSIS);
  });

  it('cuts a long body at a word boundary and marks it', () => {
    // Arrange
    const words = 'alpha beta gamma delta epsilon';

    // Act
    const cut = bodyExcerpt(words, 14);

    // Assert
    expect(cut).toBe(`alpha beta${EXCERPT_ELLIPSIS}`);
    expect(words.startsWith('alpha beta')).toBe(true);
  });

  it('leaves every seeded body whole at the shipped limit', () => {
    // The composition claim the header states as a property of the
    // SEED: the truncating branch is unreachable from the app today,
    // so the cases above drive it directly and this one records why
    // they had to.
    // Arrange
    const documents = seededReads().documents;

    // Act
    const marked = documents.filter(
      (document) => bodyExcerpt(document.body, EXCERPT_LIMIT)
        .endsWith(EXCERPT_ELLIPSIS),
    );

    // Assert
    expect(documents).not.toHaveLength(0);
    expect(marked).toEqual([]);
    expect(Math.max(...documents.map((document) => document.body.length)))
      .toBeLessThan(EXCERPT_LIMIT);
  });
});

describe('buildFindingDetail', () => {
  it('tolerates a document the read did not carry', () => {
    // Negative first, and the whole of the header's total-never-
    // throwing rule: three reads that will one day arrive separately
    // over HTTP must not be able to empty the modal.
    // Arrange / Act
    const detail = buildFindingDetail({
      finding: findingWith({ documentId: 404 }),
      documents: [],
      sources: [],
    });

    // Assert
    expect(detail.sourceLabel).toBe(UNKNOWN_SOURCE_LABEL);
    expect(detail.capturedAt).toBeNull();
    expect(detail.excerpt).toBeNull();
    expect(detail.parseFailed).toBe(false);
    expect(detail.fields).toHaveLength(1);
  });

  it('answers no excerpt for a document whose body is blank', () => {
    // The second absence the one null covers, and the source label is
    // what tells the two apart — this one names the document's origin
    // where the case above cannot.
    // Arrange / Act
    const detail = buildFindingDetail({
      finding: findingWith({}),
      documents: [documentWith({ body: '  ' })],
      sources: [],
    });

    // Assert
    expect(detail.excerpt).toBeNull();
    expect(detail.sourceLabel).toBe(NO_SOURCE_LABEL);
    expect(detail.capturedAt).toBe('2026-06-11T05:00:00.000Z');
  });

  it('carries the failed parse and the capture stamp', () => {
    // Arrange
    const failed: Document = documentWith({
      parseStatus: 'failed',
      parseError: 'Truncated mid-record.',
      capturedAt: '2026-06-07T21:10:00.000Z',
    });

    // Act
    const detail = buildFindingDetail({
      finding: findingWith({}),
      documents: [failed],
      sources: [],
    });

    // Assert
    expect(detail.parseFailed).toBe(true);
    expect(detail.capturedAt).toBe('2026-06-07T21:10:00.000Z');
    expect(detail.excerpt).toBe('Extracted text.');
  });

  it('reads the same source the table cell reads, for every row', () => {
    // The claim the shared `readSourceLabel` buys, and the reason the
    // detail is not a second derivation: the modal opens over the very
    // cell an operator just read, so the two disagreeing would be
    // visible rather than theoretical. Compared per finding, which is
    // what catches a join that answered one row's source for another.
    // Arrange
    const reads = seededReads();
    const rows = buildDigestRows(reads);

    // Act
    const stated = reads.findings.map((finding) => ({
      id: finding.id,
      sourceLabel: buildFindingDetail({
        finding,
        documents: reads.documents,
        sources: reads.sources,
      }).sourceLabel,
    }));

    // Assert
    expect(rows).not.toHaveLength(0);
    expect(stated).toEqual(rows.map((row) => ({
      id: row.id,
      sourceLabel: row.sourceLabel,
    })));
  });

  it('names the source a seeded finding was fetched from', () => {
    // A positive control for the case above: a run in which every
    // label had collapsed to the unknown reading would satisfy an
    // equality between two derivations that both broke.
    // Arrange
    const reads = seededReads();

    // Act
    const labels = reads.findings.map((finding) => buildFindingDetail({
      finding,
      documents: reads.documents,
      sources: reads.sources,
    }).sourceLabel);

    // Assert
    expect(labels).not.toContain(UNKNOWN_SOURCE_LABEL);
    expect(labels.filter((label) => label.includes('example.com')))
      .not.toHaveLength(0);
  });

  it('joins one seeded finding to its own document', () => {
    // The join itself, against a row the fixture pins: finding 5 is
    // the degraded one read out of a document that failed its parse,
    // which is the pairing a build that ignored `documentId` would
    // get wrong while every other assertion here stayed green.
    // Arrange
    const reads = seededReads();
    const finding = seededFinding(5);
    const document = reads.documents.find(
      (candidate) => candidate.id === finding.documentId,
    );

    // Act
    const detail = buildFindingDetail({
      finding,
      documents: reads.documents,
      sources: reads.sources,
    });

    // Assert
    expect(document).toBeDefined();
    expect(detail.capturedAt).toBe(document?.capturedAt);
    expect(detail.parseFailed).toBe(true);
    expect(detail.excerpt).toBe(document?.body);
  });

  it('finds a source that is not first in the list', () => {
    // The lookup is by id and not by position, which a one-source
    // fixture could never say.
    // Arrange
    const decoy = sourceWith({ id: 900, endpoint: 'https://ignored.test/a' });
    const wanted = sourceWith({
      id: 901,
      endpoint: 'https://picked.test/feed',
    });

    // Act
    const detail = buildFindingDetail({
      finding: findingWith({ documentId: 7 }),
      documents: [documentWith({ id: 7, sourceId: 901 })],
      sources: [decoy, wanted],
    });

    // Assert
    expect(detail.sourceLabel).toContain('picked.test');
    expect(detail.sourceLabel).not.toContain('ignored.test');
  });
});
