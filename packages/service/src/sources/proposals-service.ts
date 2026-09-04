/**
 * @packageDocumentation
 * The parser-config gate's HTTP half: one feed's queue of proposed
 * arrangements, and the ruling that approves one of them and has
 * it written onto the feed it was proposed for.
 *
 * TWO FUNCTIONS, ONE READING AND ONE RULING.
 * {@link listPendingConfigs} pages what is waiting on a person,
 * and {@link approveSourceConfig} is the whole of what this module
 * changes — through one port method, which writes both tables or
 * neither.
 *
 * A THIRD FILE OVER ONE PORT, and the split is the one
 * `./failures-service.ts` already makes. `./service.ts` rules on a
 * `sources` ROW, that module rules on the `documents` captured
 * through one, and this one rules on the `source_config_proposals`
 * queued against one. `./store.ts` carries the whole argument for
 * the port all three narrow, and each narrows it with a `Pick`, so
 * a method a module does not name is one it cannot call.
 *
 * THE SOURCE IS RESOLVED BEFORE ANY PROPOSAL IS READ OR RULED ON,
 * and that lookup is the entire difference between a feed with
 * nothing waiting and a feed that is not there. `SourceStore`
 * answers an empty list and a count of `0` for an id no row
 * carries, both correctly — nothing points at a row that is not
 * there — so the two queue reads alone could not tell a mistyped
 * id apart from a queue somebody has already drained. The approval
 * pays that lookup for a second reason besides: it is the
 * ADDRESSED source the stored proposal has to name, so the
 * containment rule below is decidable only from a row this module
 * has already read.
 *
 * NOTHING HERE APPLIES ANYTHING, AND `proposalToSourceUpdate` IS
 * CALLED NOWHERE IN THIS FILE. Neither proposed document is read
 * here: deriving the two `sources` columns is statement 2 of
 * `SourceStore.approveAndApplyProposal`, inside the transaction
 * that stamps the approval above it and the application below it,
 * and both implementations of that method go through the one
 * function in `./config-proposer.ts`. A service reading
 * `parserConfig` and `contract` off the row to hand them anywhere
 * would be a second applier — the drift that port method's own
 * comment names — and the refusal standing between an unruled
 * proposal and the columns every later pass reads would then be
 * restated once per caller instead of being one function every
 * writer goes through.
 *
 * THAT FUNCTION'S REFUSAL IS UNREACHABLE FROM HERE, which is why
 * nothing below catches it. It throws on a row carrying no
 * `approved_at`, and the row it is handed was approved one
 * statement earlier, so reaching it would be a fault in the store
 * rather than a request somebody got wrong. The cases beside this
 * file drive it DIRECTLY with an unapproved row, which is the only
 * way that throw is exercisable at all.
 *
 * THE GATE'S VOCABULARY IS `src/approvals/ruling.ts` AND NOT THIS
 * MODULE'S. `refuseRuling` decides, `describeRuling` projects the
 * four members a ruling is answered with, and the ordering that
 * puts the parent check ahead of the closed one is argued there —
 * so this gate and the research gate in `src/entities/service.ts`
 * cannot drift into answering differently about the same act.
 *
 * THE ACT IS {@link APPLY}, AND THAT IS THE ONE AXIS THE TWO GATES
 * DIFFER ON. Ratifying an intention twice is a no-op; applying a
 * proposal twice is not, because the first application already
 * wrote the two documents onto the feed and a second would write
 * them again with nothing left to account for the first. So
 * `already-ruled` is REACHABLE here where it is unreachable one
 * directory over, and it is the one refusal on this surface that
 * is a `409`. `RULING_ACTS` is where that difference is declared,
 * rather than as an `if` in either gate.
 *
 * THE OTHER TWO REFUSALS ANSWER ONE SENTENCE BETWEEN THEM.
 * `refuseRuling` separates `no-such-ruling` from
 * `not-on-this-parent` so that a gate can act differently on them;
 * what a CALLER reads is the same `404` either way, or the two
 * answers together tell it that a proposal it does not own exists.
 * The write's own null answers the same sentence a third time, the
 * row having gone between the read and the ruling.
 *
 * THE QUEUE IS THE PORT'S AND NOT THIS MODULE'S. There is no
 * status parameter to forward and nothing here re-sorts or
 * re-filters a page it was handed: the predicate and both ordering
 * keys are `SourceStore.listPendingProposals`, which is
 * `listPendingProposals` in `scripts/approve.ts` member for member
 * — one backlog with two clients rather than two that happen to
 * agree today.
 *
 * THE ROWS COME BACK AS STORED, which is where this queue differs
 * from the failures one next door. That module cuts and masks a
 * captured body because nobody chose the text; here the whole
 * point of the page is that a person rules on the exact document a
 * proposer answered, so an account of it would make the ruling a
 * ruling about something else. `./store.ts` states it at
 * `listPendingProposals`, and what a response may carry is
 * `./proposals-routes.ts`' half rather than this one's.
 *
 * NO REFUSAL HERE QUOTES ANYTHING A CALLER SUBMITTED. Every
 * sentence below is a constant of this module's own, none of them
 * carries a hole for a value to arrive through, no refusal builds
 * `details` at all, and none keeps a `cause`: all three are
 * decisions this gate takes about a row it read rather than
 * refusals it translates from somewhere else.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * queue behind the reads and answers the writer behind the port.
 */
import type {
  SourceConfigProposalRecord,
  SourceStore,
} from './store.js';
import type {
  Ruling,
  RulingAct,
  RulingRefusalReason,
} from '../approvals/ruling.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { ConflictError, NotFoundError } from '../../lib/errors/index.js';
import { describeRuling, refuseRuling } from '../approvals/ruling.js';
import { parseBody } from '../http/validation.js';

/**
 * Exactly the port methods this module reaches, and no others.
 *
 * EIGHT OF `SourceStore`'S THIRTEEN METHODS ARE ABSENT, and the
 * absence is what makes this file's reach a shape rather than an
 * observance. The three writes over a `sources` row — the insert,
 * the update and the delete — belong to `./service.ts`, the two
 * `documents` reads to `./failures-service.ts`, and the domain's
 * own source list and its parse-status aggregate to neither. A
 * queue handed the whole port would be claiming to need them.
 *
 * `findSourceById` is here and is not a proposal read: it is what
 * turns an id naming nothing into a `404` rather than into an
 * empty page or an approval given against a feed that is not
 * there. The other four are the whole of the proposals half, and
 * exactly one of them writes.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had
 * moved under it.
 */
export type SourceProposalsServiceStore = Pick<
  SourceStore,
  | 'approveAndApplyProposal'
  | 'countPendingProposals'
  | 'findProposalById'
  | 'findSourceById'
  | 'listPendingProposals'
>;

/**
 * The act this gate performs, named from `RULING_ACTS`.
 *
 * ANNOTATED RATHER THAN INFERRED, so a member removed from that
 * roster reports on this line instead of at a call site further
 * down. It is also the whole of what tells `refuseRuling` that a
 * closed row is refused here where it ratifies again one directory
 * over: the difference between the two gates is a value declared
 * once, and not an `if` in either of them.
 */
const APPLY: RulingAct = 'apply';

/**
 * The body `POST /sources/:id/approve-config` accepts.
 *
 * ONE MEMBER, AND IT NAMES A ROW RATHER THAN DESCRIBING ONE. An
 * approval is given to one stored proposal, whose exact two
 * documents are what an operator read before agreeing, so the
 * request carries that row's id and nothing a caller composed.
 * There is no spelling here for approving a feed's queue
 * wholesale, and adding one would be approving arrangements nobody
 * was shown.
 *
 * NO SPELLING FOR THE DOCUMENTS THEMSELVES EITHER, which is the
 * half that matters most: a body able to carry a `parserConfig`
 * would be a way to write `sources.parser_config` through the gate
 * without ever proposing it, and the gate would then be approving
 * a document that had never been in the queue an operator read.
 * `./config-proposer.ts` is where a proposal is made.
 *
 * STRICT, so a body naming `sourceId`, `status`, `approvedAt` or
 * `appliedAt` is refused rather than quietly ignored. The first is
 * already in the path; the other three are columns this surface
 * WRITES rather than accepts, and a caller able to set any of them
 * could rule, back-date the ruling and record an application that
 * never happened in one request.
 */
export const approveConfigSchema = z.object({
  proposalId: z.number().int()
    .positive(),
}).strict();

/** A parsed approval request: the proposal being ruled on. */
export type ApproveConfigBody = z.infer<typeof approveConfigSchema>;

/**
 * One page of a feed's pending proposals, and the size of the
 * whole queue.
 *
 * The same shape `SourceFailurePage` in `./failures-service.ts`
 * takes, for the same reason: `meta.total` describes the
 * COLLECTION, and a page cannot be asked how large the thing it is
 * a window onto is.
 */
export interface PendingConfigPage {
  /**
   * The rows the window selected, `proposedAt` ascending with `id`
   * ascending breaking a tie.
   *
   * The order is the store's, per
   * `SourceStore.listPendingProposals`, and nothing here re-sorts:
   * a service sorting a page it was handed would be answering a
   * different order from the one the window was taken under, which
   * is how two pages come to disagree about which row they hold.
   *
   * `SourceConfigProposalRecord` passed through rather than
   * projected. Nothing on this row is cut and nothing is masked — a
   * proposal comes back as stored, per the module header — so a
   * shape of this module's own would be a second authority for that
   * table's own columns.
   */
  readonly rows: readonly SourceConfigProposalRecord[];

  /**
   * How many proposals are waiting on a ruling for this feed,
   * ignoring the window.
   *
   * The QUEUE and not the table: a feed carrying fifty applied
   * proposals and nothing pending answers `0`, which is the honest
   * number for a backlog.
   */
  readonly total: number;
}

/**
 * What a caller is told when no source carries the id it named.
 *
 * Equal by intent to the sentence `./service.ts` and
 * `./failures-service.ts` answer for the same `:id`, and spelled
 * again rather than imported, on the terms every service on this
 * surface keeps its own: the three are free to diverge the moment
 * any of them has something of its own to say, and a shared
 * constant would make that divergence an edit to all three.
 */
const NO_SUCH_SOURCE = 'No source carries that id';

/**
 * What a caller is told when the body names no proposal this feed
 * holds.
 *
 * ONE SENTENCE FOR THREE REFUSALS, WHICH IS THE CONTAINMENT RULE
 * RATHER THAN A SHORTCUT. `refuseRuling` separates
 * `no-such-ruling` from `not-on-this-parent` so that a gate can
 * act differently on them; what a CALLER reads has to be the same
 * either way, or the two answers between them tell it that a
 * proposal it does not own exists — and, since the sharper refusal
 * here is a `409` about an arrangement already live on somebody
 * else's feed, that would be worth more than it is one gate over.
 * The write's own null answers it for a third reason, the row
 * having gone in between.
 *
 * The submitted id is not in it, per this module's header.
 */
const NO_SUCH_PROPOSAL
  = 'No config proposal of this source carries that id';

/**
 * What a caller is told when the proposal has already been
 * applied.
 *
 * THE ONE `409` ON THIS SURFACE, and the one refusal the research
 * gate cannot reach: `RULING_ACTS` records that applying twice is
 * refused where ratifying twice is a no-op. The reason is
 * `SourceConfigProposalRecord.appliedAt`'s own — that stamp is the
 * only account of which proposal put what is on the feed, so a
 * second application would write the two documents again and leave
 * the first one's record standing for a write it no longer
 * describes.
 *
 * A sentence about the ROW's state and not about the feed's. What
 * `sources.parser_config` holds now is not said, because it may
 * have been edited since and because a caller refused an approval
 * is not thereby entitled to read the arrangement it would have
 * replaced.
 */
const ALREADY_APPLIED
  = 'That config proposal has already been applied';

/**
 * Turns a refusal reason into what the caller is told.
 *
 * @param reason - What `refuseRuling` answered.
 * @returns The error to throw. `already-ruled` is the `409` this
 *   gate alone can reach, per {@link ALREADY_APPLIED}; the other
 *   two are one `404` between them, per {@link NO_SUCH_PROPOSAL}.
 *
 * @remarks
 * IT RETURNS RATHER THAN THROWS, so the call site reads `throw`
 * and nothing here depends on the compiler taking a view about
 * whether this function comes back.
 *
 * ALL THREE REASONS ARE REACHABLE, which is what separates this
 * from `ratificationRefusal` in `src/entities/service.ts`, whose
 * third branch guards a roster rather than describing a request.
 * There is no plain `Error` here for that reason.
 */
function applicationRefusal(reason: RulingRefusalReason): Error {
  return reason === 'already-ruled'
    ? new ConflictError(ALREADY_APPLIED)
    : new NotFoundError(NO_SUCH_PROPOSAL);
}

/**
 * Reads the source the path named, or refuses.
 *
 * @param store - Where the row is read.
 * @param sourceId - The id as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @returns The source's own id, which is all either caller wants
 *   of it: one scopes a queue by it and the other holds a stored
 *   proposal's `source_id` against it. Answering the whole record
 *   would let a later edit read a column off it and quietly widen
 *   what this module knows about a feed it is not ruling on.
 * @throws NotFoundError - When no source carries the id.
 */
async function requireSourceId(
  store: SourceProposalsServiceStore,
  sourceId: number,
): Promise<number> {
  const source = await store.findSourceById(sourceId);

  if (source === null) {
    throw new NotFoundError(NO_SUCH_SOURCE);
  }

  return source.id;
}

/**
 * Reads one window of a feed's pending config proposals.
 *
 * @param store - Where the source is resolved and its queue read.
 * @param sourceId - The id as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   in `src/http/schemas.ts` derived it from `?page` and
 *   `?perPage`. Already validated, so nothing here re-checks a
 *   bound: `paginationQuerySchema` is what refuses a `perPage`
 *   above the cap, and a second check here would be a second rule
 *   nobody would notice drifting from the first.
 * @returns The rows as stored and the size of the whole queue.
 * @throws NotFoundError - When no source carries the id. The only
 *   refusal this function has: a feed with nothing pending, a feed
 *   whose proposals have all been ruled on, and a window past the
 *   end are each an empty page.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE TWO READS ARE ISSUED, which is
 * the ordering the module header argues and the one thing a reader
 * might otherwise fold into the `Promise.all` below. A `404` must
 * cost `source_config_proposals` no read at all.
 *
 * The two reads that DO run are issued together, for the reason
 * every list on this surface gives: a page's rows and its
 * collection's size are independent questions, and awaiting them
 * in sequence would make every request pay two round trips to
 * answer one body.
 *
 * NEITHER READ CAN BE ASKED FOR A RULED PROPOSAL. The predicate is
 * the port's — there is no status parameter on either method — so
 * this function cannot become a way to page the gate's history,
 * and that is a shape rather than a rule it observes.
 */
export async function listPendingConfigs(
  store: SourceProposalsServiceStore,
  sourceId: number,
  window: StoreWindow,
): Promise<PendingConfigPage> {
  const resolved = await requireSourceId(store, sourceId);
  const [rows, total] = await Promise.all([
    store.listPendingProposals(resolved, window),
    store.countPendingProposals(resolved),
  ]);

  return { rows, total };
}

/**
 * Records that a person ruled in favour of one proposed
 * arrangement, and has it written onto the feed it was proposed
 * for.
 *
 * @param store - Where the source and the proposal are read, and
 *   where the ruling and the two source columns are written.
 * @param sourceId - The feed's own id, from the path.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The four-member ruling `describeRuling` projects, taken
 *   off the row the write answered rather than rebuilt from the
 *   request: the row's id, where it stands, when a person agreed,
 *   and when the arrangement was written onto the feed.
 * @throws ValidationError - When the body does not satisfy
 *   {@link approveConfigSchema}.
 * @throws NotFoundError - When no source carries the id; when no
 *   proposal carries the submitted `proposalId`; and when the
 *   proposal it carries was made for another feed. The last two
 *   answer one sentence, per {@link NO_SUCH_PROPOSAL}.
 * @throws ConflictError - When the proposal has already been
 *   applied, per {@link ALREADY_APPLIED}.
 *
 * @remarks
 * THE SOURCE IS RESOLVED BEFORE THE PROPOSAL IS READ, so an id
 * nothing carries costs one lookup and never reaches the queue.
 * The ordering is also what makes the containment comparison
 * decidable: it is the ADDRESSED feed the stored row has to name.
 *
 * THE ROW IS READ AND THEN JUDGED RATHER THAN SELECTED. A lookup
 * scoped to the source would answer null for `no such row` and for
 * `not this feed's row` alike, and this gate has to tell the two
 * apart even though a caller reads one sentence for both —
 * `SourceStore.findProposalById` argues it from the port's end.
 *
 * NOTHING IS ASKED OF THE ROW'S STATE. `refuseRuling` reads the
 * two timestamps and never `status`, exactly as
 * `source_config_proposals_approval_check` does and exactly as
 * `proposalToSourceUpdate` in `./config-proposer.ts` does one
 * layer down — a row stamped `done` with no approval is storable,
 * and a gate reading the status would open for it.
 *
 * AN APPROVED-BUT-UNAPPLIED ROW IS NOT REFUSED. `closedAt` is
 * `applied_at` for this subject, per `describeRuling`, so a
 * proposal a `scripts/approve.ts` operator has already ruled on
 * from a terminal is applied here rather than refused: the CLI
 * rules and this rules and writes, which is the whole reason both
 * stamps exist.
 *
 * ONE CALL WRITES BOTH TABLES. `approveAndApplyProposal` stamps
 * the approval, derives the two `sources` columns from the row it
 * just stamped, and stamps the application, in one transaction —
 * so a failure anywhere in the middle leaves the feed untouched
 * and the proposal unruled, which is the state this request can be
 * made from again. Nothing of that derivation is this module's,
 * per the header.
 *
 * THE WRITE'S OWN NULL IS THE ROW HAVING GONE between the read and
 * the ruling, and it answers the sentence the read's own absence
 * answers. No ordinary sequence of calls produces it.
 */
export async function approveSourceConfig(
  store: SourceProposalsServiceStore,
  sourceId: number,
  body: unknown,
): Promise<Ruling> {
  const input = parseBody(approveConfigSchema, body);
  const resolved = await requireSourceId(store, sourceId);
  const row = await store.findProposalById(input.proposalId);
  const reason = refuseRuling({
    act: APPLY,
    parentId: resolved,
    candidate: row === null
      ? null
      : { parentId: row.sourceId, row },
  });

  if (reason !== null) {
    throw applicationRefusal(reason);
  }

  const ruled = await store.approveAndApplyProposal(input.proposalId);

  if (ruled === null) {
    throw new NotFoundError(NO_SUCH_PROPOSAL);
  }

  return describeRuling(ruled);
}
