/**
 * @packageDocumentation
 * The config-approval modal's decisions: which proposal a source is
 * being ruled on, and what each of the two rulings records.
 *
 * Beside the modal rather than inside it, for the reason `./editor.ts`
 * gives about its own: the unit runner collects `.ts` files under
 * `src` in a node environment, so a decision living in a `.tsx` is
 * reachable by no test in this package at all.
 *
 * ## A proposal is ruled on as a ROW
 *
 * `./SourceConfigApprovalModal.tsx` carries that argument in full.
 * The half this module encodes is the consequence: the two rulings
 * below move a STATUS and a stamp and copy both documents through
 * untouched, so there is nothing here that could edit a
 * `parser_config` on the way past an approval of it.
 *
 * ## "No pending proposal" is two states, not one
 *
 * `../../data/api.ts` answers a domain's proposals at EVERY status on
 * purpose, so that this module can tell apart the two ways a source
 * has nothing to be ruled on:
 *
 * - a source whose config was already ruled on, where the modal has a
 *   ruling to report; and
 * - a source nothing has ever proposed a config for, which is the
 *   ordinary state of a feed that is working.
 *
 * A queue filtered to `pending` upstream would answer the same empty
 * list for both, and the modal would have one sentence to put in
 * front of two situations. {@link readSourceConfigReview} is the
 * three-way reading that keeps them apart.
 *
 * ## Which proposal, where a source has several
 *
 * `source_config_proposals` has no unique key over its source — a
 * feed failing every pass would otherwise be refused a fresh proposal
 * — so a source may carry more than one row, and the two ends of the
 * list mean different things. The list arrives in review-queue order,
 * oldest first, so the pending one to rule on is the FIRST (the queue
 * is worked from the front) while the ruling to report is the LAST
 * (the most recent answer, not the one that has been superseded).
 *
 * ## One notice per status, and why the table is here
 *
 * {@link describeRuling} is the sentence the modal puts above the two
 * documents, and it is a table over the whole of `ProposalStatus`
 * rather than a branch over the two the fixtures ship. Two reasons,
 * and the second is the load-bearing one:
 *
 * - `../../data/proposals.ts` carries a `pending` row and an
 *   `approved` one and says so — `done` and `skipped` are storable
 *   and no fixture holds either. A branch written against what the
 *   demo shows would have nothing to say about half the column.
 * - This surface CREATES one of the unrehearsed two. A rejection
 *   writes `skipped`, so the first thing an operator sees after
 *   refusing a config is a status the fixtures never carried.
 *
 * Total over the union, so a member added to the column is a
 * `check-types` error here rather than a modal rendering a blank.
 *
 * ## The document schema refuses almost nothing, and that is honest
 *
 * `JsonEditor` is handed what a payload has to satisfy, and what a
 * `parser_config` has to satisfy is not something this package knows:
 * `../../data/proposals.ts` redeclares both columns as an open record
 * because their shape differs by the source's kind, and the service
 * checks a document with a validator rather than with a type. So
 * {@link PROPOSAL_DOCUMENT_SCHEMA} mirrors exactly that — a document
 * is an object of keys, and the only thing it can refuse is a payload
 * that is not one.
 *
 * Declared here rather than in a `schema.ts` of its own, unlike
 * `../lexicon/schema.ts`: that one describes a shape with rules worth
 * stating separately, and this one is the ABSENCE of such a shape.
 * Inventing a richer schema would be a second, weaker account of a
 * validator that already exists on the other side of the seam.
 */

import type {
  ProposalDocument,
  ProposalStatus,
  SourceConfigProposal,
} from '../../data/proposals';
import type { IsoTimestamp } from '../../data/types';
import type { ZodType } from 'zod';

import { z } from 'zod';

/**
 * The status a proposal carries once somebody has ruled in favour.
 *
 * Spelled here rather than imported as a value because
 * `ProposalStatus` is a type: this is the one member of it this
 * module writes, and `check-types` holds it to the union at the
 * return below.
 */
const APPROVED_STATUS = 'approved';

/**
 * The status a refused proposal carries.
 *
 * `skipped` and not a spelling of its own — the column is constrained
 * to the tuple `../../data/proposals.ts` mirrors, and a rejection is
 * the gate being closed without the config being applied, which is
 * what that member already means.
 */
const REJECTED_STATUS = 'skipped';

/**
 * What the modal says above the documents, per status.
 *
 * A reading rather than markup: the tone is a `Banner` tone and the
 * two strings are what an operator reads, and all three are decisions
 * — which is why they are here and not in the `.tsx`, where no test
 * in this package could reach them.
 */
export interface RulingReading {
  /** The banner's title: what has happened, or what has not yet. */
  readonly title: string;
  /** The line under it: what that means for the feed. */
  readonly sentence: string;
  /** Which `Banner` tone carries it. */
  readonly tone: 'success' | 'warning' | 'info';
}

/**
 * The notice each status carries, total over the column.
 *
 * See the header on why every member is written out rather than the
 * two the fixtures reach.
 *
 * `approved` and `done` are two points on one path and read as such:
 * this package cannot tell them apart on the feed itself, because
 * `../../data/proposals.ts` leaves `applied_at` out and says what
 * that costs. So the approved sentence stops at the ruling, which is
 * the part this surface can honestly report.
 */
const RULING_READINGS: Readonly<Record<ProposalStatus, RulingReading>> = {
  pending: {
    title: 'Waiting on a decision',
    sentence: 'Approving records this arrangement for the pipeline to '
      + 'apply. Rejecting closes it without changing the feed.',
    tone: 'info',
  },
  approved: {
    title: 'This arrangement was approved',
    sentence: 'The feed is read this way once the pipeline applies it. '
      + 'Whether it already has is not something this screen can say.',
    tone: 'success',
  },
  done: {
    title: 'This arrangement was approved and applied',
    sentence: 'The feed is being read this way. A later proposal is '
      + 'what changes it.',
    tone: 'success',
  },
  skipped: {
    title: 'This arrangement was refused',
    sentence: 'Nothing was written to the feed. It goes on being read '
      + 'the way it was.',
    tone: 'warning',
  },
};

/**
 * What the modal says above the documents of a proposal.
 *
 * @param status - Where the proposal stands in the gate.
 * @returns The title, the sentence and the tone to carry them.
 */
export function describeRuling(status: ProposalStatus): RulingReading {
  return RULING_READINGS[status];
}

/**
 * What a proposal document has to satisfy: it has to be a document.
 *
 * An open record, mirroring the columns. See the header on why this
 * is the whole of it, and why a richer schema here would be a claim
 * this package cannot back.
 *
 * Annotated rather than inferred, so the day the redeclared document
 * type narrows, this stops compiling instead of quietly going on
 * accepting more than the type allows.
 */
export const PROPOSAL_DOCUMENT_SCHEMA: ZodType<ProposalDocument>
  = z.record(z.string(), z.unknown());

/** What a source's config proposals amount to, for one source. */
export type SourceConfigReview =
  | {
    /** A proposal is waiting on somebody. */
    readonly kind: 'pending';
    /** The one to rule on — the oldest still pending. */
    readonly proposal: SourceConfigProposal;
  }
  | {
    /** Every proposal for this source has been ruled on. */
    readonly kind: 'ruled';
    /** The most recent ruling, which is the one worth reporting. */
    readonly proposal: SourceConfigProposal;
  }
  | {
    /** Nothing has ever proposed a config for this source. */
    readonly kind: 'none';
  };

/**
 * Where one source stands in the config-approval gate.
 *
 * Reads the DOMAIN's proposals rather than a source's, because that
 * is what `useSourceProposals` answers and the filter belongs where
 * the modal knows which source it is about —
 * `../../data/proposals.ts` says both in one paragraph.
 *
 * A source with no proposals and a source id nothing answers to are
 * the same reading here, and deliberately: this module cannot tell
 * them apart, and the modal does not ask it to — an unknown source is
 * refused by its own read, which rejects, before this is consulted.
 *
 * @param proposals - The domain's proposals, in review-queue order.
 * @param sourceId - The `sources.id` the modal was opened on.
 * @returns Which of the three states that source is in, carrying the
 * proposal for the two that have one.
 */
export function readSourceConfigReview(
  proposals: readonly SourceConfigProposal[],
  sourceId: number,
): SourceConfigReview {
  const mine = proposals.filter(
    (proposal) => proposal.sourceId === sourceId,
  );

  // The FRONT of the queue: several pending proposals are worked
  // oldest first, which is the order the list already arrives in.
  const pending = mine.find((proposal) => proposal.status === 'pending');

  if (pending !== undefined) {
    return { kind: 'pending', proposal: pending };
  }

  // The BACK of it, for the opposite reason: the ruling worth
  // reporting is the most recent answer rather than one it replaced.
  const ruled = mine.at(-1);

  return ruled === undefined
    ? { kind: 'none' }
    : { kind: 'ruled', proposal: ruled };
}

/**
 * Approve a proposal — the row as the operator ruled it.
 *
 * Both documents are carried through by reference and neither is
 * read, which is the shape the header's ROW argument asks for: this
 * records that somebody accepted THIS document, and there is no path
 * through it by which the document being accepted could change.
 *
 * The stamp is an argument rather than a clock read, on the rule
 * `../digest/actions.ts` follows: a module reading the wall clock
 * would be a pure function of nothing, and the shell has a pinned
 * instant for exactly this.
 *
 * @param proposal - The proposal as it stands.
 * @param approvedAt - The instant the ruling is made at.
 * @returns The row to record.
 */
export function approveProposal(
  proposal: SourceConfigProposal,
  approvedAt: IsoTimestamp,
): SourceConfigProposal {
  return { ...proposal, status: APPROVED_STATUS, approvedAt };
}

/**
 * Reject a proposal — the row as the operator ruled it.
 *
 * `approvedAt` is written to `null` rather than left alone, and the
 * schema is why: that column is the one thing the database actually
 * holds a rule over, and an approval recorded on it is what an apply
 * step reads. A refused row carrying a stamp would be a row claiming
 * an approval nobody made, which the status beside it could not
 * take back.
 *
 * No stamp of its own. `source_config_proposals` records WHEN a
 * proposal was approved and does not record when one was refused, so
 * a rejection time has nowhere to go — `../../data/proposals.ts`
 * carries the narrowing that column list is.
 *
 * @param proposal - The proposal as it stands.
 * @returns The row to record.
 */
export function rejectProposal(
  proposal: SourceConfigProposal,
): SourceConfigProposal {
  return { ...proposal, status: REJECTED_STATUS, approvedAt: null };
}
