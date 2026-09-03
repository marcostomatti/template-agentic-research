import type {
  ProposalStatus,
  SourceConfigProposal,
} from '../../data/proposals';

import { describe, expect, it } from 'vitest';

import { SOURCE_CONFIG_PROPOSALS } from '../../data/proposals';

import {
  PROPOSAL_DOCUMENT_SCHEMA,
  approveProposal,
  describeRuling,
  readSourceConfigReview,
  rejectProposal,
} from './approval';

/** The source every hand-built row below is about unless it says so. */
const SUBJECT_SOURCE_ID = 11;

/** A second source, so a scoping claim has something to be scoped off. */
const OTHER_SOURCE_ID = 12;

/** The instant a ruling in this file is made at. */
const RULED_AT = '2026-06-12T09:00:00.000Z';

/**
 * One proposal, as the shape the modal reads rather than as a fixture.
 *
 * Hand-built because the states this module has to tell apart reach
 * past what `../../data/proposals.ts` ships: that set gives each
 * source at most one proposal, and the two orderings below — the
 * oldest pending, the most recent ruling — have no subject until a
 * source carries several. The shipped rows are still driven, at the
 * bottom of the first block, as the reading against the real tree.
 *
 * @param id - The row id, which is also its queue position here.
 * @param status - Where the row stands in the gate.
 * @param sourceId - Which source it is about.
 * @returns The row.
 */
function proposalRow(
  id: number,
  status: ProposalStatus,
  sourceId: number = SUBJECT_SOURCE_ID,
): SourceConfigProposal {
  return {
    id,
    domainId: 1,
    sourceId,
    parserConfig: { recordsPath: `items-${id}` },
    contract: { fields: { title: { required: true } } },
    status,
    proposedAt: `2026-06-0${id}T00:00:00.000Z`,
    approvedAt: status === 'approved'
      ? RULED_AT
      : null,
  };
}

/**
 * The `sources.id` of the shipped row in each of the three states.
 *
 * Derived from the fixture set rather than written as literals, so
 * these stay the rows `../../data/proposals.ts` actually ships: it
 * documents that one source has a pending proposal, one has an
 * approved one and one has none, and this is that documentation read
 * back.
 */
const SHIPPED_PENDING_SOURCE_ID = SOURCE_CONFIG_PROPOSALS
  .find((proposal) => proposal.status === 'pending')?.sourceId;
const SHIPPED_RULED_SOURCE_ID = SOURCE_CONFIG_PROPOSALS
  .find((proposal) => proposal.status === 'approved')?.sourceId;

/** A `sources.id` no shipped proposal names. */
const SHIPPED_UNPROPOSED_SOURCE_ID = 9_999;

describe('readSourceConfigReview', () => {
  it('answers none for a queue with nothing in it', () => {
    // Arrange / Act
    const review = readSourceConfigReview([], SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'none' });
  });

  it('answers none for a source no proposal in the queue names', () => {
    // The queue is a DOMAIN\'s, so most of what is in it is about
    // other feeds. A reading that forgot to filter would report one
    // of them as this source\'s.
    // Arrange
    const queue = [
      proposalRow(1, 'pending', OTHER_SOURCE_ID),
      proposalRow(2, 'approved', OTHER_SOURCE_ID),
    ];

    // Act
    const review = readSourceConfigReview(queue, SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'none' });
  });

  it('does not read another source\'s pending proposal as this one\'s', () => {
    // The same claim one step in: this source HAS a proposal, so a
    // reading that dropped the filter would answer `pending` off the
    // neighbour rather than `ruled` off the row it was asked about.
    // Arrange
    const mine = proposalRow(1, 'approved');
    const theirs = proposalRow(2, 'pending', OTHER_SOURCE_ID);

    // Act
    const review = readSourceConfigReview([mine, theirs], SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'ruled', proposal: mine });
  });

  it('rules on the OLDEST pending proposal where a source has several', () => {
    // Review-queue order is oldest first and a queue is worked from
    // the front, so the row an operator is being asked about is the
    // one that has waited longest.
    // Arrange
    const first = proposalRow(1, 'pending');
    const second = proposalRow(2, 'pending');

    // Act
    const review = readSourceConfigReview([first, second], SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'pending', proposal: first });
  });

  it('reports a pending proposal even where a ruling already stands', () => {
    // A feed whose approved config has drifted gets a fresh proposal,
    // and the fresh one is what there is to decide.
    // Arrange
    const ruled = proposalRow(1, 'approved');
    const fresh = proposalRow(2, 'pending');

    // Act
    const review = readSourceConfigReview([ruled, fresh], SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'pending', proposal: fresh });
  });

  it('reports the MOST RECENT ruling where nothing is pending', () => {
    // The opposite end of the same list, for the opposite reason: a
    // superseded answer is not the one to put in front of anybody.
    // Arrange
    const earlier = proposalRow(1, 'skipped');
    const later = proposalRow(2, 'approved');

    // Act
    const review = readSourceConfigReview([earlier, later], SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'ruled', proposal: later });
  });

  it('reads a refusal as a ruling rather than as nothing', () => {
    // `skipped` is a ruling: somebody looked and said no, which is a
    // different sentence from a feed nobody has proposed anything
    // for.
    // Arrange
    const refused = proposalRow(1, 'skipped');

    // Act
    const review = readSourceConfigReview([refused], SUBJECT_SOURCE_ID);

    // Assert
    expect(review).toEqual({ kind: 'ruled', proposal: refused });
  });

  it('finds all three states in the proposals the app ships', () => {
    // The reading against the real tree. Every case above is driven
    // with rows this file built, so all of them would pass over a
    // fixture set that reached none of these states — which is
    // exactly what `../../data/proposals.ts` says it was shaped to
    // avoid.
    // Arrange
    expect(SHIPPED_PENDING_SOURCE_ID).toBeTypeOf('number');
    expect(SHIPPED_RULED_SOURCE_ID).toBeTypeOf('number');

    // Act
    const kinds = [
      SHIPPED_PENDING_SOURCE_ID,
      SHIPPED_RULED_SOURCE_ID,
      SHIPPED_UNPROPOSED_SOURCE_ID,
    ].map((sourceId) => readSourceConfigReview(
      SOURCE_CONFIG_PROPOSALS,
      sourceId ?? SHIPPED_UNPROPOSED_SOURCE_ID,
    ).kind);

    // Assert
    expect(kinds).toEqual(['pending', 'ruled', 'none']);
  });
});

describe('approveProposal', () => {
  it('moves the status and records the stamp it was handed', () => {
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    const ruled = approveProposal(proposal, RULED_AT);

    // Assert
    expect(ruled.status).toBe('approved');
    expect(ruled.approvedAt).toBe(RULED_AT);
  });

  it('carries both documents through by identity', () => {
    // The ROW argument, as an assertion: an approval records that
    // somebody accepted THIS document, so there is no path through
    // here by which the document could be a different object.
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    const ruled = approveProposal(proposal, RULED_AT);

    // Assert
    expect(ruled.parserConfig).toBe(proposal.parserConfig);
    expect(ruled.contract).toBe(proposal.contract);
  });

  it('leaves the proposal it was handed where it was', () => {
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    approveProposal(proposal, RULED_AT);

    // Assert
    expect(proposal.status).toBe('pending');
    expect(proposal.approvedAt).toBeNull();
  });

  it('keeps every member the ruling does not move', () => {
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    const ruled = approveProposal(proposal, RULED_AT);

    // Assert
    expect({ ...ruled, status: proposal.status, approvedAt: null })
      .toEqual(proposal);
  });
});

describe('rejectProposal', () => {
  it('moves the status to the member a closed gate carries', () => {
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    const ruled = rejectProposal(proposal);

    // Assert
    expect(ruled.status).toBe('skipped');
  });

  it('records no approval, even over a row that already carried one', () => {
    // `approved_at` is the column the database holds to a rule, so a
    // refused row that kept a stamp would claim an approval nobody
    // made and the status beside it could not take that back.
    // Arrange
    const approved = proposalRow(1, 'approved');

    // Assert
    expect(approved.approvedAt).toBe(RULED_AT);

    // Act
    const ruled = rejectProposal(approved);

    // Assert
    expect(ruled.approvedAt).toBeNull();
  });

  it('carries both documents through by identity', () => {
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    const ruled = rejectProposal(proposal);

    // Assert
    expect(ruled.parserConfig).toBe(proposal.parserConfig);
    expect(ruled.contract).toBe(proposal.contract);
  });

  it('leaves the proposal it was handed where it was', () => {
    // Arrange
    const proposal = proposalRow(1, 'pending');

    // Act
    rejectProposal(proposal);

    // Assert
    expect(proposal.status).toBe('pending');
  });
});

describe('describeRuling', () => {
  /**
   * Every status the column carries, written out.
   *
   * The one literal in this file that is not derived, and it has to
   * be: the claim is that the notice table is TOTAL over the union,
   * and a list read back off the table under test could only ever
   * agree with it. `check-types` is the other half — a member added
   * to `ProposalStatus` reddens both this list and the table.
   */
  const EVERY_STATUS: readonly ProposalStatus[] = [
    'pending',
    'approved',
    'done',
    'skipped',
  ];

  it('says something about every status the column can carry', () => {
    // `done` and `skipped` are storable and no fixture ships either,
    // so nothing in the running demo would report a hole here.
    // Arrange / Act
    const readings = EVERY_STATUS.map(describeRuling);

    // Assert
    expect(readings.filter((reading) => reading.title === '')).toEqual([]);
    expect(readings.filter((reading) => reading.sentence === ''))
      .toEqual([]);
  });

  it('gives each status its own words', () => {
    // A table filled by copying one row would satisfy the case above.
    // Arrange / Act
    const titles = EVERY_STATUS.map((status) => describeRuling(status).title);

    // Assert
    expect(new Set(titles).size).toBe(EVERY_STATUS.length);
  });

  it('carries the refusal in a different tone from the approvals', () => {
    // The one tone claim worth pinning: a rejection that read as a
    // success would be the surface agreeing with a decision it was
    // reporting the opposite of.
    // Arrange / Act / Assert
    expect(describeRuling('skipped').tone).toBe('warning');
    expect(describeRuling('approved').tone).toBe('success');
    expect(describeRuling('pending').tone).toBe('info');
  });

  it('describes the status a rejection actually writes', () => {
    // The two are one claim: `rejectProposal` writes a member and
    // this table has to have words for THAT member, not for whatever
    // a reader assumed a refusal is called.
    // Arrange
    const refused = rejectProposal(proposalRow(1, 'pending'));

    // Act
    const reading = describeRuling(refused.status);

    // Assert
    expect(reading).toBe(describeRuling('skipped'));
  });
});

describe('PROPOSAL_DOCUMENT_SCHEMA', () => {
  it('refuses a payload that is not a document at all', () => {
    // The one refusal this schema has, and the only one it could
    // honestly make — see `./approval.ts` on why a richer shape here
    // would be a second account of a validator that already exists.
    // Arrange
    const refused: readonly unknown[] = [[], null, 'a string', 3, true];

    // Act
    const outcomes = refused.map(
      (payload) => PROPOSAL_DOCUMENT_SCHEMA.safeParse(payload).success,
    );

    // Assert
    expect(outcomes).toEqual(refused.map(() => false));
  });

  it('accepts a document with nothing in it', () => {
    // A config proposing no fields is a poor config and not a
    // malformed one, and the modal shows it either way.
    // Arrange / Act / Assert
    expect(PROPOSAL_DOCUMENT_SCHEMA.safeParse({}).success).toBe(true);
  });

  it('accepts every document the app ships', () => {
    // The positive control the refusal case above needs: a schema
    // that refused everything would satisfy that one on its own.
    // Arrange
    expect(SOURCE_CONFIG_PROPOSALS.length).toBeGreaterThan(0);

    // Act
    const accepted = SOURCE_CONFIG_PROPOSALS.flatMap((proposal) => [
      PROPOSAL_DOCUMENT_SCHEMA.safeParse(proposal.parserConfig).success,
      PROPOSAL_DOCUMENT_SCHEMA.safeParse(proposal.contract).success,
    ]);

    // Assert
    expect(accepted.filter((ok) => !ok)).toEqual([]);
    expect(accepted).toHaveLength(SOURCE_CONFIG_PROPOSALS.length * 2);
  });
});
