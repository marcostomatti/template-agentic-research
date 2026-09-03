import type { DraftableRow } from './drafts';

import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from './domains';
import {
  SOURCE_CONFIG_PROPOSALS,
  findSourceProposal,
  getSourceProposal,
  listSourceProposals,
} from './proposals';
import { findSource, listSources } from './sources';
import { FIXTURE_NOW } from './types';

/**
 * The id of a row handed over as a ruling, read through the structural
 * constraint `api.approveSourceConfig` takes.
 *
 * The point is the PARAMETER type and not the body. That accessor is
 * typed on `DraftableRow` rather than on a proposal, its TSDoc saying
 * that a caller handing over a proposal row satisfies the signature
 * unchanged the day this module lands — a claim nothing could check
 * until today. Passing a proposal to this function is that check, made
 * by the compiler; the returned id is only what gives the assertion
 * something to compare.
 *
 * @param row - Any row carrying an id, as the draft store constrains.
 * @returns The row's id.
 */
function ruledRowId(row: DraftableRow): number {
  return row.id;
}

/**
 * Every object reachable from a value that is not frozen, by path.
 *
 * Recursive rather than a check of the top level, because that is
 * exactly the distinction the module's freeze is about: a shallow
 * freeze over a row whose interesting members are documents protects
 * nothing worth protecting, and both documents nest a `fields` record
 * inside them. Paths rather than a count, so a failure names the
 * member that was left open instead of saying how many were.
 *
 * @param value - The value to walk. Non-objects are answered `[]`.
 * @param path - What to call this value in a reported path.
 * @returns One path per unfrozen object, outermost first; `[]` when
 * everything reachable is frozen.
 */
function unfrozenPaths(value: unknown, path: string): readonly string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const here = Object.isFrozen(value)
    ? []
    : [path];
  const within = Object.entries(value).flatMap(
    ([key, member]) => unfrozenPaths(member, `${path}.${key}`),
  );

  return [...here, ...within];
}

describe('SOURCE_CONFIG_PROPOSALS', () => {
  it('carries the two proposals, in review-queue order', () => {
    // The payload pin, and the non-emptiness guard every table-driven
    // claim below rests on. Written out whole rather than sampled,
    // because the two documents are the whole of what the approval
    // modal renders: a member quietly edited in one of them is a
    // different arrangement offered for approval, and no other
    // assertion here would notice.
    //
    // Nothing joins these rows to a seed — `packages/service/data/`
    // ships no proposals, a proposal being an answer about one
    // instance's feed rather than vocabulary an operator writes — so
    // unlike `./personas.test.ts` this pin is not a drift check. It is
    // the record of what the fixture offers.
    // Arrange / Act / Assert
    expect(SOURCE_CONFIG_PROPOSALS).toEqual([
      {
        id: 1,
        domainId: getDomain(DEFAULT_DOMAIN_SLUG).id,
        sourceId: 4,
        parserConfig: {
          recordsPath: 'items',
          fields: {
            title: { path: 'title' },
            url: { path: 'link' },
            publishedAt: { path: 'published_at' },
          },
        },
        contract: {
          fields: {
            title: { required: true, type: 'text' },
            url: { required: true, pattern: '^https://' },
          },
        },
        status: 'approved',
        proposedAt: '2026-06-08T09:15:00.000Z',
        approvedAt: '2026-06-09T08:05:00.000Z',
      },
      {
        id: 2,
        domainId: getDomain(DEFAULT_DOMAIN_SLUG).id,
        sourceId: 3,
        parserConfig: {
          recordsPath: 'channel.item',
          fields: {
            title: { path: 'title' },
            url: { path: 'guid' },
            summary: {
              path: 'description',
              selector: 'p',
              type: 'text',
            },
            publishedAt: { path: 'pubDate' },
          },
        },
        contract: {
          fields: {
            title: { required: true, type: 'text' },
            url: { required: true, pattern: '^https://' },
            publishedAt: { required: true },
          },
        },
        status: 'pending',
        proposedAt: '2026-06-11T06:20:00.000Z',
        approvedAt: null,
      },
    ]);
  });

  it('covers a pending proposal and an approved one', () => {
    // The two states the row set exists to reach, asserted as a set so
    // a fixture edit that left both rows in one state is reported
    // here rather than in whichever page test happened to render the
    // missing one. `done` and `skipped` are deliberately absent — the
    // module docblock names that as a limit, and this assertion is
    // what would report the day somebody adds one without saying so.
    // Arrange / Act
    const statuses = SOURCE_CONFIG_PROPOSALS.map(
      (proposal) => proposal.status,
    );

    // Assert
    expect([...statuses].sort()).toEqual(['approved', 'pending']);
  });

  it('gives every proposal a distinct id', () => {
    // A ruling carries the id of the row it is about, so a collision
    // would approve whichever row the lookup map happened to keep.
    // Arrange / Act
    const ids = SOURCE_CONFIG_PROPOSALS.map((proposal) => proposal.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('names a source that exists', () => {
    // `source_config_proposals.source_id` is a REFUSING foreign key, so
    // a row naming a source that is not there is one the database would
    // never have accepted. The module resolves each id through
    // `getSource` at module scope, which throws; this is the same claim
    // read from the rows rather than from the constants, so it survives
    // somebody inlining one of them.
    // Arrange / Act
    const dangling = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => findSource(proposal.sourceId) === undefined,
    );

    // Assert
    expect(dangling).toEqual([]);
  });

  it('agrees with its source about which domain it belongs to', () => {
    // The redundancy the schema carries on purpose: `domain_id` reaches
    // the same domain `source_id` does through `sources.domain_id`, and
    // carrying both is what lets a domain be dropped in one statement.
    // Nothing in a fixture array holds the two in step, so a row about
    // one domain's source filed under another would render a document
    // about a feed the modal's own domain does not have.
    // Arrange / Act
    const disagreeing = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => findSource(proposal.sourceId)?.domainId
        !== proposal.domainId,
    );

    // Assert
    expect(disagreeing).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // The sparse domain is the shell's route to its empty states, so a
    // row leaking into it would fill a page that is meant to be bare.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => proposal.domainId !== seededId,
    );

    // Assert
    expect(strays).toEqual([]);
  });

  it('leaves the healthy source with no proposal at all', () => {
    // The third state the set covers, and the only one that is a
    // property of the SET rather than of a row: the approval modal's
    // empty state needs a source nothing has ever proposed a config
    // for. Source 1 is the healthy one the module docblock names.
    //
    // Asserted as membership of the uncovered set rather than as a
    // count, so it still means the same thing when a later fixture
    // grows a third proposal.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;
    const proposedFor = new Set(
      SOURCE_CONFIG_PROPOSALS.map((proposal) => proposal.sourceId),
    );

    // Act
    const uncovered = listSources(seededId)
      .filter((source) => !proposedFor.has(source.id))
      .map((source) => source.id);

    // Assert
    expect(uncovered).toContain(1);
  });

  it('stamps every proposal at or before the fixture clock', () => {
    // Fixtures are dated against FIXTURE_NOW so relative-time renders
    // are a property of the data and not of the day the suite ran. A
    // proposal made in the future would render as a negative age in
    // the queue an operator reads oldest-first.
    // Arrange / Act
    const ahead = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => proposal.proposedAt > FIXTURE_NOW
        || (proposal.approvedAt !== null && proposal.approvedAt > FIXTURE_NOW),
    );

    // Assert
    expect(ahead).toEqual([]);
  });

  it('never approves a proposal before it was made', () => {
    // The one ordering the two stamps have to have. Nothing in the
    // schema relates them — the CHECK there pairs `approved_at` with
    // `applied_at`, which this shape narrows out — so this is the
    // fixture holding itself to a reading a person would otherwise
    // have to make of a queue.
    // Arrange / Act
    const inverted = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => proposal.approvedAt !== null
        && proposal.approvedAt < proposal.proposedAt,
    );

    // Assert
    expect(inverted).toEqual([]);
  });

  it('stamps an approval on exactly the rows that are not pending', () => {
    // A FIXTURE-authoring rule and deliberately not a claim about the
    // database, which allows the two accounts to disagree: `status` is
    // the operator-facing account and the CHECK reads only timestamps,
    // so a row stamped `approved` with a null `approved_at` is
    // storable. It is not something this surface should have to
    // render, and pinning it here is what keeps the modal's two
    // readings of one row saying the same thing.
    // Arrange / Act
    const contradictory = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => (proposal.status === 'pending')
        !== (proposal.approvedAt === null),
    );

    // Assert
    expect(contradictory).toEqual([]);
  });

  it('runs oldest first, with ids ascending alongside', () => {
    // Review-queue order, which is what makes several proposals for one
    // source workable without a unique key refusing the later ones. Ids
    // ascend with the stamps because a bigserial does, and both are
    // asserted: an accessor that answered id order would agree with the
    // queue here, so a set where the two had parted company would make
    // that coincidence into a bug nobody could see.
    // Arrange / Act
    const stamps = SOURCE_CONFIG_PROPOSALS.map(
      (proposal) => proposal.proposedAt,
    );
    const ids = SOURCE_CONFIG_PROPOSALS.map((proposal) => proposal.id);

    // Assert
    expect(stamps).toEqual([...stamps].sort());
    expect(ids).toEqual([...ids].sort((left, right) => left - right));
  });

  it('is frozen through, documents and nested records included', () => {
    // `readonly` is a compile-time claim a cast drops, and the JSON
    // editor that renders these documents is exactly the caller that
    // would drop it. Walked recursively rather than checked at the top
    // level, because the members worth protecting here are two levels
    // down.
    // Arrange / Act / Assert
    expect(unfrozenPaths(SOURCE_CONFIG_PROPOSALS, 'proposals')).toEqual([]);
  });

  it('hands rows the ruling accessor can already take', () => {
    // `api.approveSourceConfig` is typed on the draft store's
    // structural constraint rather than on a proposal, and its TSDoc
    // says a caller handing over a proposal row satisfies that
    // signature unchanged the day this module lands. Today is that
    // day, and this is the check: {@link ruledRowId} takes the same
    // parameter type, so the call below compiles only if the claim
    // holds.
    // Arrange / Act / Assert
    expect(SOURCE_CONFIG_PROPOSALS.map(ruledRowId)).toEqual([1, 2]);
  });
});

describe('listSourceProposals', () => {
  it('returns nothing for a domain id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listSourceProposals(-1)).toEqual([]);
  });

  it('returns nothing for the sparse domain', () => {
    // Not an error: a domain with no sources has nothing to propose a
    // config for, and the empty approval queue is a state the demo
    // reaches by switching domain rather than by emptying a table.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listSourceProposals(sparseId)).toEqual([]);
  });

  it('returns the seeded domain proposals oldest first', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listSourceProposals(seededId);

    // Assert
    expect(listed.map((proposal) => proposal.id)).toEqual([1, 2]);
  });

  it('returns every status rather than the pending ones alone', () => {
    // The narrowing this accessor deliberately does not make. A modal
    // handed only the pending rows could not tell a source whose config
    // was already approved from one nothing has ever proposed for, and
    // those are different sentences to put in front of an operator.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const statuses = listSourceProposals(seededId)
      .map((proposal) => proposal.status);

    // Assert
    expect([...statuses].sort()).toEqual(['approved', 'pending']);
  });

  it('never hands back the stored table', () => {
    // Handing out the array itself would let a caller sorting it in
    // place reorder every later reader in the same process — and the
    // order is the review queue's.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listSourceProposals(seededId)).not.toBe(SOURCE_CONFIG_PROPOSALS);
  });
});

describe('findSourceProposal', () => {
  it('answers undefined for an id no fixture carries', () => {
    // The tolerant twin exists because a proposal id genuinely goes
    // stale: the table has no unique key over its source, so a queue an
    // operator is looking at may have moved on — somebody else ruled on
    // the row, or a later proposal replaced it — and the modal answers
    // that rather than treating it as a fault.
    // Arrange / Act / Assert
    expect(findSourceProposal(-1)).toBeUndefined();
  });

  it('finds every fixture proposal by its own id', () => {
    // Arrange / Act
    const missed = SOURCE_CONFIG_PROPOSALS.filter(
      (proposal) => findSourceProposal(proposal.id) !== proposal,
    );

    // Assert
    expect(missed).toEqual([]);
  });
});

describe('getSourceProposal', () => {
  it('throws naming the id it could not find', () => {
    // The message is what a fixture author reads first, so it carries
    // the id rather than only the fact of the miss.
    // Arrange / Act / Assert
    expect(() => getSourceProposal(-1)).toThrow('-1');
  });

  it('returns the proposal carrying the id', () => {
    // Arrange / Act
    const found = SOURCE_CONFIG_PROPOSALS.map(
      (proposal) => getSourceProposal(proposal.id),
    );

    // Assert
    expect(found).toEqual([...SOURCE_CONFIG_PROPOSALS]);
  });
});
