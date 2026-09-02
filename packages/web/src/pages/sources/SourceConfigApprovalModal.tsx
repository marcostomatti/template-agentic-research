/**
 * @packageDocumentation
 * The sources surface's approval gate: the arrangement something
 * proposed for reading a feed, and the two answers an operator has
 * to it.
 *
 * ## A proposal is ruled on as a ROW, not edited in place
 *
 * This is why the two documents below are SHOWN and not offered for
 * editing, and it is the whole shape of the screen.
 *
 * `sources.parser_config` says how a feed is read and
 * `sources.contract` says what a correct reading of it looks like.
 * When neither exists, or when the contract has started failing,
 * something proposes both together — and the answer is deliberately
 * not written onto the source row. It lands in
 * `source_config_proposals` as a pending row, and only a ruling moves
 * it across. `../../data/proposals.ts` carries the schema's argument
 * for that at length.
 *
 * The argument has a consequence this file has to honour. What is
 * being approved is a specific pair of documents that something
 * produced, and the value of a person in the loop is that the exact
 * document they read is the one that gets applied. An editable box
 * here would let an approval rewrite the very `parser_config` it was
 * approving, unreviewed, in the one gesture the gate exists to make
 * deliberate — and a rewritten document is not the answer anything
 * proposed, so approving it would record a ruling about something
 * nobody else has ever seen.
 *
 * So the ruling is a whole-ROW act. `../../data/api.ts` types
 * `approveSourceConfig` as a POST rather than a PUT for the same
 * reason, and `./approval.ts`'s two transitions move a status and a
 * stamp and carry both documents through by identity. An operator who
 * wants a different arrangement rejects this one; making a better
 * proposal is a job for whatever produces them.
 *
 * The documents still go through `../../components/JsonEditor.tsx`,
 * in its non-editing presentation, rather than through a `<pre>` of
 * their own. Two things come with it that are worth having and are
 * not decoration: the payload is formatted the one way this app
 * formats payloads, so a document here and the same document in the
 * lexicon's fallback read identically; and the schema still runs, so
 * a stored document this app cannot even read as an object is
 * reported ABOVE the decision rather than discovered after it. That
 * component's header carries what its read-only mode is and is not.
 *
 * ## Four states, and the third is really two
 *
 * A rejected read, a pending read, a proposal to rule on, and no
 * proposal to rule on. The last is the one that splits: a source
 * whose config was ruled on last week and a source nothing has ever
 * proposed anything for both have nothing pending, and they are
 * different sentences. `./approval.ts`'s three-way reading is what
 * keeps them apart, and `../../data/api.ts` answering EVERY status is
 * what makes that reading possible at all.
 *
 * A source with a ruling still shows its two documents. What it does
 * not show is a footer: there is nothing left to decide, and the
 * notice above the documents says what was decided instead.
 *
 * ## Ruling does not close the modal
 *
 * Its neighbour `./SourceEditorModal.tsx` closes on a successful
 * save, because the table behind it draws the very row that was saved
 * and the result is visible the moment the dialog is out of the way.
 * Nothing on the sources table draws a proposal, so closing here
 * would take an operator away from the only screen that could confirm
 * what they just did.
 *
 * So the write is recorded, `useApproveSourceConfig` invalidates the
 * queue, the re-read comes back carrying the status it was ruled to,
 * and the modal turns into the ruled state around the same two
 * documents. That is also the one way the demo reaches a `skipped`
 * proposal, which no fixture ships.
 *
 * ## Two reads, and only one of them can reject
 *
 * `useSource` is what makes a source id nothing answers to a live
 * address rather than a crash: `:entityId` is a required segment, but
 * nothing constrains it to a number a source carries, and
 * `../../data/api.ts` refuses a foreign row with the same message a
 * missing one gets. It is also what names the dialog.
 *
 * `useSourceProposals` reads the DOMAIN's queue and can only reject
 * on a slug nothing answers to — which has already failed the source
 * read, so the rejected state is taken off that one alone. This is
 * the same arrangement `../digest/DigestDetailModal.tsx` is in.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects
 * `.ts` alone — this file's decisions are next door in
 * `./approval.ts`, its bindings are proven by a `check-types`
 * mutation grid, and what it renders falls to the Playwright specs.
 */

import type { SourceConfigReview } from './approval';
import type { SourceConfigProposal } from '../../data/proposals';

import {
  Badge,
  Banner,
  Button,
  EmptyState,
  FormattedRelativeTime,
  Modal,
  Skeleton,
} from '@ar/ui';
import { useLocation, useNavigate, useParams } from 'react-router';

import { JsonEditor } from '../../components/JsonEditor';
import {
  useApproveSourceConfig,
  useSource,
  useSourceProposals,
} from '../../data/hooks';
import { FIXTURE_NOW } from '../../data/types';
import { activeSurfaceId, getSurface } from '../../routes/paths';

import {
  PROPOSAL_DOCUMENT_SCHEMA,
  approveProposal,
  describeRuling,
  readSourceConfigReview,
  rejectProposal,
} from './approval';

/**
 * The route this modal closes to: the sources list it hangs under.
 *
 * The fourth copy of this pair. `../digest/DigestDetailModal.tsx`
 * says why it is not extracted yet — one of the copies is
 * `../../components/PlaceholderModal.tsx`, which this wave is
 * deleting surface by surface, so a module shared with it would
 * outlive it by about a task.
 */
const CLOSE_TO = '..';

/** Resolve `..` against the ROUTE tree, not against the path. */
const CLOSE_OPTIONS = { relative: 'route' } as const;

/**
 * The locale the proposal's stamp is rendered in.
 *
 * Pinned for the reason `./SourcesPage.tsx` pins its own: a reading
 * that changes with the machine makes the text a property of who is
 * looking rather than of the data.
 */
const DISPLAY_LOCALE = 'en-US';

/** What the header says while the source's own read is in flight. */
const PENDING_TITLE = 'Source config';

/** What each document is called, here and in the specs. */
const PARSER_CONFIG_LABEL = 'Parser config';
const CONTRACT_LABEL = 'Contract';

/** What the two rulings are called, here and in the specs. */
const APPROVE_LABEL = 'Approve config';
const REJECT_LABEL = 'Reject';

/** What the footer says beside the buttons. */
const PROPOSED_PREFIX = 'Proposed';

/** What a ruling that did not record is announced as. */
const RULING_FAILED_TITLE = 'This ruling was not recorded';

/**
 * What a read-only document reports back: nothing.
 *
 * `JsonEditor` requires `onChange` and never calls it in its
 * non-editing presentation — a `readonly` textarea fires no change
 * event at all. Named rather than written inline at both call sites,
 * so the reason is stated once: there is nothing for a document to
 * report here, because the whole point of the screen is that this
 * document is not the operator's to change. See the header.
 */
const ignoreDocumentEdit = () => undefined;

/**
 * The sources surface's config approval.
 *
 * @returns The modal: the proposed documents with the ruling that is
 * owed or the one that was made, or whichever read state it is in.
 */
export const SourceConfigApprovalModal = () => {
  const { domainSlug, entityId } = useParams<{
    domainSlug?: string;
    entityId?: string;
  }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no source carries it, and the read refuses — which is the
  // rejected state below rather than a special case.
  const sourceId = Number(entityId);

  const sourceRead = useSource(domainSlug, sourceId);
  const proposalsRead = useSourceProposals(domainSlug);
  const ruling = useApproveSourceConfig(domainSlug);

  const surfaceId = activeSurfaceId(pathname);
  const source = sourceRead.data;
  const proposals = proposalsRead.data;

  // Named so the check below narrows: `useCache` answers
  // `T | undefined` until it settles, and a property access is not
  // something the compiler can narrow through a flag.
  const review = proposals === undefined
    ? undefined
    : readSourceConfigReview(proposals, sourceId);

  // The proposal a ruling would be about, which is exactly the one
  // state that has both buttons. A ruled proposal is rendered and not
  // decided again.
  const undecided = review?.kind === 'pending'
    ? review.proposal
    : undefined;

  const stamped = review?.kind === 'none'
    ? undefined
    : review?.proposal;

  return (
    <Modal
      open
      size="lg"
      onClose={() => {
        void navigate(CLOSE_TO, CLOSE_OPTIONS);
      }}
      eyebrow={surfaceId === undefined
        ? undefined
        : getSurface(surfaceId).title}
      // The endpoint WHOLE, for the reason `./SourceEditorModal.tsx`
      // gives: three seeded feeds share one host, so a dialog titled
      // with the host would name any of them. Wrapped in a span that
      // may break, since `OverlayHeader` sets no wrapping rule and an
      // endpoint has no spaces to break at.
      title={source === undefined
        ? PENDING_TITLE
        : <span className="break-words">{source.endpoint}</span>}
      // How long this has been waiting, which is the reading a review
      // queue is worked by. Absent along with the buttons where there
      // is no proposal at all, so the footer row does not open on
      // nothing.
      footerStatus={stamped === undefined
        ? undefined
        : (
          <span>
            {PROPOSED_PREFIX}
            {' '}
            <FormattedRelativeTime
              date={stamped.proposedAt}
              // The fixtures are dated against this instant, so the
              // ladder reads the same today as the day they were
              // written.
              now={FIXTURE_NOW}
              locale={DISPLAY_LOCALE}
            />
          </span>
        )}
      footer={undecided === undefined
        ? undefined
        : (
          <>
            <Button
              variant="ghost"
              disabled={ruling.isPending}
              onClick={() => {
                ruling.mutate(rejectProposal(undecided));
              }}
            >
              {REJECT_LABEL}
            </Button>
            <Button
              variant="primary"
              disabled={ruling.isPending}
              onClick={() => {
                // The stamp is handed in rather than read off a
                // clock, on the rule `./approval.ts` follows.
                ruling.mutate(approveProposal(undecided, FIXTURE_NOW));
              }}
            >
              {APPROVE_LABEL}
            </Button>
          </>
        )}
    >
      <SourceConfigApprovalBody
        failed={sourceRead.isError}
        review={review}
        rulingError={ruling.error}
      />
    </Modal>
  );
};

/** What the approval shows in place of the two documents. */
interface SourceConfigApprovalBodyProps {
  /** Whether the source read rejected — an unknown row, today. */
  readonly failed: boolean;
  /** Where the source stands, or undefined until the queue settles. */
  readonly review: SourceConfigReview | undefined;
  /** Why the last ruling did not record, if one did not. */
  readonly rulingError: Error | null;
}

/**
 * The modal's body: the notice over the two documents, or the reason
 * there are none.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else. It is also the half a static render can reach: `Modal` is a
 * Radix dialog and renders through a portal, so a probe of the frame
 * sees nothing while a probe of this sees the whole surface.
 *
 * @param props - Which state the reads are in, and what the last
 * ruling did.
 * @returns The documents, or whichever state is standing.
 */
const SourceConfigApprovalBody = ({
  failed,
  review,
  rulingError,
}: SourceConfigApprovalBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This source could not be read"
        description="Nothing in this domain answers to that source. Close this and pick one from the table."
      />
    );
  }

  if (review === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (review.kind === 'none') {
    return (
      <EmptyState
        title="Nothing has been proposed for this feed"
        description="A config is proposed when a feed has none, or when its contract stops holding. This one has neither, so there is nothing to rule on."
      />
    );
  }

  return (
    <ProposalDocuments
      proposal={review.proposal}
      rulingError={rulingError}
    />
  );
};

/** What the two-document view is given. */
interface ProposalDocumentsProps {
  /** The proposal being ruled on, or the one that was ruled on. */
  readonly proposal: SourceConfigProposal;
  /** Why the last ruling did not record, if one did not. */
  readonly rulingError: Error | null;
}

/**
 * The notice, then the arrangement: how the feed would be read, and
 * what a correct reading of it looks like.
 *
 * One component for both states that have a proposal, rather than one
 * apiece. The documents do not change when a ruling lands — that is
 * the header's ROW argument again — so rendering them from a single
 * place is what keeps the two `JsonEditor`s mounted across the
 * transition, text and scroll position included, instead of
 * remounting a box the operator was reading.
 *
 * @param props - The proposal, and what the last ruling did.
 * @returns The notice and the two documents.
 */
const ProposalDocuments = ({
  proposal,
  rulingError,
}: ProposalDocumentsProps) => {
  const notice = describeRuling(proposal.status);

  return (
    <div className="flex flex-col gap-5">
      {rulingError !== null && (
        // Announced on arrival rather than politely: it lands in
        // response to the operator's own click, and it is the reason
        // the thing they asked for did not happen.
        <Banner role="alert" tone="danger" title={RULING_FAILED_TITLE}>
          {rulingError.message}
        </Banner>
      )}

      <Banner tone={notice.tone} title={notice.title}>
        {/* The stored status beside the sentence about it, because
            the column is what a service reads and the sentence is
            what a person does. `./approval.ts` owns which words go
            with which member; this is the member itself. A span
            rather than a div: `Banner` puts its children in flow
            beside a leading icon, and the two readings are one line
            wherever there is room for one. */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone="neutral" size="sm">{proposal.status}</Badge>
          <span>{notice.sentence}</span>
        </span>
      </Banner>

      <JsonEditor
        label={PARSER_CONFIG_LABEL}
        value={proposal.parserConfig}
        schema={PROPOSAL_DOCUMENT_SCHEMA}
        onChange={ignoreDocumentEdit}
        readOnly
      />

      <JsonEditor
        label={CONTRACT_LABEL}
        value={proposal.contract}
        schema={PROPOSAL_DOCUMENT_SCHEMA}
        onChange={ignoreDocumentEdit}
        readOnly
      />
    </div>
  );
};
