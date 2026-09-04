/**
 * `src/sources/proposals-service.ts` — what the parser-config gate
 * REFUSES, and what each refusal is careful not to say. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * SIX SECTIONS AND NINE CASES, ALL OF THEM ABOUT A REFUSAL. What a
 * queue page SELECTS and what an approval WRITES are the next
 * task's, so no case here reads an order, a window or the two
 * columns an apply lands on. The successful calls inside these
 * cases stay CONTROLS rather than coverage of any of that, and each
 * still reads the one member its own refusal is about.
 *
 * THE FIVE REFUSALS SPLIT THREE WAYS BY WHO RAISES THEM. TWO are
 * this MODULE's, raised off a lookup it made: an `:id` naming no
 * source, and the write's own null. THREE are the shared GATE's,
 * `refuseRuling` in `src/approvals/ruling.ts` answering
 * `no-such-ruling`, `not-on-this-parent` and `already-ruled` — the
 * first two translated into one `404` and the third into the one
 * `409` on this surface. And ONE belongs to `./config-proposer.ts`
 * and is UNREACHABLE from this module at all, which is why it is
 * driven directly rather than through a request.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A gate refusing everything passes a refusal case
 * written on its own, so the control sits in the same case and
 * differs from the refused call in exactly the thing under test:
 * the same window against a feed that resolves; the same body
 * naming a proposal that is really queued; the same closed state on
 * a proposal made for the ADDRESSED feed.
 *
 * THE FIXTURE IS BUILT TO DISCRIMINATE RATHER THAN MERELY TO EXIST,
 * and the shape doing the work is TWO FEEDS OF ONE DOMAIN. The
 * containment rule is over `source_id`, so a sibling in a second
 * domain could be refused by a scoping accident no assertion here
 * would separate from the rule. Eight proposals are planted across
 * the two, one per state: two open on the addressed feed (the
 * second so no control ever rules on a row another assertion in the
 * same case has moved), one approved and unapplied, one applied,
 * one whose `status` says `done` with no approval behind it, one
 * open and one applied on the sibling, and one naming an id no
 * source carries at all.
 *
 * THE LAST OF THOSE IS WHAT MAKES THE `404` A READING RATHER THAN
 * AN EMPTY PAGE. `SourceStore` answers an empty list and a count of
 * `0` for an id no row carries, both correctly, so a gate that
 * skipped the lookup would answer a mistyped id exactly as it
 * answers a feed with nothing waiting. The seam is keyed by the
 * DOMAIN and every read is scoped by the feed, so a proposal naming
 * an unheld source is plantable — and the queue under that id is
 * asserted non-empty in the same case that reads the refusal.
 *
 * THE READ-BEFORE-WRITE ORDERING IS COUNTED AND NOT ASSERTED. No
 * status can say whether the lookup happened before the queue was
 * read, so four cases wrap the planted store in a tally and read
 * WHICH methods a refused call reached. Each takes the same tally
 * over the call that succeeds, in the same case: a wrapper that had
 * stopped counting reports zero for the refusal and zero for the
 * control.
 *
 * EVERY STATE READ IS TAKEN BEFORE THE CONTROL IS ISSUED, because
 * three of these controls WRITE the feed the refusal is asserted to
 * have left alone. A read taken afterwards answers the control's
 * own write and reddens as though the refusal had applied
 * something, which is a message indistinguishable from a rule that
 * had stopped holding.
 *
 * THAT THE PARENT CHECK RUNS BEFORE THE CLOSED ONE. A proposal made
 * for the sibling feed AND already applied has both checks firing
 * on it, and only the order decides which one a caller is answered
 * with: a `409` there would tell a caller that a feed it did not
 * address holds a proposal and that the proposal is already live.
 * The control is the SAME closed state on a proposal of the
 * addressed feed, which answers the `409` instead — without it a
 * gate checking the parent and nothing else passes.
 *
 * THAT THE `409`'S AXIS IS `applied_at` AND NOT `approved_at`.
 * `describeRuling` reads the application as the closing stamp for
 * this subject, so a proposal a person has already agreed to and
 * nothing has applied is OPEN and is applied here rather than
 * refused — which is exactly the state `scripts/approve.ts` leaves
 * behind, that function writing the one stamp and deliberately not
 * the other. The two rows differ in nothing else.
 *
 * THAT THE APPLIER READS THE STAMP AND NEVER THE STATUS.
 * `proposalToSourceUpdate` is driven DIRECTLY, because its refusal
 * is unreachable through the gate: the approval is stamped one
 * statement before the derivation, so a row reaching it unapproved
 * is a fault in the store rather than a request somebody got wrong.
 * The row handed to it is READ OFF THE PORT rather than written out
 * here, which is also what says a `SourceConfigProposalRecord`
 * satisfies `ApprovedProposal` with nothing copied out. The throw
 * is pinned by MESSAGE and not by class — every raise in JavaScript
 * satisfies `toThrow(Error)` — with a near miss of that message
 * asserted absent by the same matcher in the same case, and the row
 * whose column claims `done` with no approval behind it refused
 * exactly as the pending one is.
 *
 * THAT MESSAGE NAMES THE ROW'S ID, and it is the one sentence on
 * this path that quotes anything. It is a plain `Error` answering
 * 500 rather than an `AppError` a caller reads, and nothing in the
 * gate can reach it, so it is outside the containment block's
 * subject rather than an exception to its rule.
 *
 * THAT NO REFUSAL QUOTES ANYTHING, READ PER CHANNEL. An `AppError`
 * can carry a value out through three of them — the message, the
 * details and the CAUSE — and a count taken over the three joined
 * together cannot say which one leaked. {@link leaksIn} renders
 * them separately, and the sixteen zeros are read against a planted
 * refusal that leaks every needle through all three, counted by the
 * same helper in the same case. The needle count is asserted
 * against the roster's own arithmetic, so a matrix that had
 * silently shrunk fails rather than reporting fewer zeros.
 *
 * THE NEEDLES ARE FOUR PER REFUSAL: the id that refusal SUBMITTED,
 * plus the three sentinels every planted proposal STORES. The
 * stored half is the channel this surface has that the resource
 * groups beside it do not — what a model answered about a feed a
 * caller does not own is exactly the text a refusal must not carry
 * out. The addressed feed's own id is deliberately not a needle,
 * for the reason {@link STORED_NEEDLES} gives.
 *
 * EVERY LOOKUP BEFORE THE ONE EACH REFUSAL IS ABOUT IS ASSERTED TO
 * RESOLVE INSIDE THE CONTAINMENT CASE. A gate whose path resolves a
 * subject before its body resolves a queued row refuses earlier
 * when nothing is planted, at which point every needle is absent
 * for the wrong reason and the case passes over a store holding no
 * feed and no queue at all.
 *
 * THE GRID BELOW WAS MEASURED RATHER THAN PREDICTED, over these
 * nine cases, TWICE, with the two runs agreeing member for member
 * on every one of eighteen legs. One rule patched at a time, the
 * file restored between legs, and `git status --short -uall` left
 * naming no file but the two this task adds.
 *
 * ELEVEN LEGS PATCH `./proposals-service.ts`. Comparing the source
 * lookup's null against `undefined`, so the branch never fires,
 * reddens 4 — all three cases of the first section plus the
 * containment case, which submits an id no source carries. Issuing
 * that lookup BELOW the two queue reads reddens exactly 1 and
 * issuing it below the proposal read reddens exactly 1, disjoint,
 * and both are tally cases: every status assertion is green either
 * way, which is the whole reason those cases count calls at all.
 *
 * The gate's translation separates cleanly in both directions.
 * Answering `already-ruled` as a `404` too reddens 3 and answering
 * the other two reasons as `409`s reddens 4, sharing only the
 * containment case — so a gate that had lost the `409` and one that
 * had started giving it out are reported by different cases.
 * Declaring the act as `ratify` reddens the SAME 3 as the first of
 * those, told apart only by the assertion that fails inside each:
 * `RULING_ACTS` is what puts a closed row out of a ratification's
 * reach, so the two mutations reach one behaviour by two routes.
 * Comparing the candidate's parent against the ADDRESSED id rather
 * than against the row's own `source_id`, so the check can never
 * fire, reddens 3. Never throwing the gate's refusal at all reddens
 * 5, which is the bluntest leg here and is a whole-half control
 * rather than a claim.
 *
 * Spelling one sentence for both 404s reddens exactly 1, the case
 * that asserts the two are different things. Rebuilding the ruling
 * from the request rather than from the row the write answered
 * reddens exactly 1, the `409` case, whose control reads back an
 * `approved_at` older than the request that applied it — the
 * idempotence, which no member of the request carries.
 *
 * DROPPING `.strict()` FROM THE BODY REDDENS 0, and it is an honest
 * zero rather than a gap: no case here submits an undeclared key,
 * that refusal being the routes task's to read on the wire. What
 * closes it is a request naming `sourceId` or `approvedAt` beside
 * the `proposalId`.
 *
 * TWO LEGS PROVE THE CONTAINMENT COUNTS ARE LIVE, which the zeros
 * cannot do for themselves: quoting the path segment into the
 * source refusal's sentence and appending the resolved row to the
 * gate's refusal each redden exactly 1, the containment case, and
 * nothing else. The first reaches the submitted half of the needle
 * set and the second the stored half.
 *
 * ONE LEG PATCHES `src/approvals/ruling.ts`. Putting the closed
 * check ABOVE the parent check reddens exactly 1, the ordering
 * case, which is the only request in the file that gets both wrong
 * at once.
 *
 * TWO PATCH `./config-proposer.ts` AND BOTH REDDEN THE SAME 1.
 * Refusing nothing at all, and rewording the sentence the case
 * pins, each redden the applier case alone — told apart only by the
 * assertion that fails inside each, and the pair is what says the
 * message pin and the throw itself are two claims.
 *
 * TWO PATCH THE IN-MEMORY STORE. Leaving the two source columns
 * unwritten reddens exactly 1: the `409` case's closing control,
 * which reads the feed moving after a proposal really is applied —
 * without it the untouched reading above it is satisfied by a gate
 * that never writes anything. Planting no proposal at all reddens
 * 9 of 9, with NO survivors, which is the reading that says every
 * case here reaches a row somebody planted.
 */
import type { ApprovedProposal } from './config-proposer.js';
import type {
  SourceProposalsServiceStore,
} from './proposals-service.js';
import type {
  MemoryResearchStore,
  MemorySourceProposal,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { proposalToSourceUpdate } from './config-proposer.js';
import {
  approveSourceConfig,
  listPendingConfigs,
} from './proposals-service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** The feed every case here addresses. */
const RADAR_FEED = 'https://example.test/radar/feed.xml';

/**
 * A second feed of the SAME domain, which the cross-source rule is
 * read against.
 *
 * The same domain rather than a second one, deliberately: the
 * containment rule this file is about is over `source_id`, and a
 * sibling in another domain could be refused by a scoping accident
 * no assertion here would separate from the rule.
 */
const RADAR_ITEMS = 'https://example.test/radar/items';

/**
 * An id no source carries, and the ONE path segment this file
 * submits that it also chose.
 *
 * Seven digits, on the terms {@link OPEN_PROPOSAL} states, so the
 * containment block can search a refusal for the id it addressed
 * as well as for the id it named.
 */
const MISSING_SOURCE = 9990111;

/**
 * The proposal every approval that has to SUCCEED rules on: open,
 * pending, unapproved and made for the addressed feed.
 *
 * SEVEN DIGITS, LIKE EVERY ID THIS FILE SUBMITS. A refusal's `cause`
 * channel renders a STACK, a stack carries line and column numbers,
 * and a three-digit id matches one by accident — at which point the
 * zero the containment block exists for reads as a leak.
 */
const OPEN_PROPOSAL = 4001822;

/**
 * A second open proposal on the same feed.
 *
 * The control for every case that has already spent
 * {@link OPEN_PROPOSAL} on one of its own, so no control is ever
 * ruling on a row another assertion in the same case has moved.
 */
const SECOND_PROPOSAL = 4002833;

/**
 * A proposal a person has already ruled in favour of, and which
 * nothing has applied.
 *
 * THE AXIS OF THE `409`, AND THE REASON IT IS NOT `approved_at`.
 * `describeRuling` reads `applied_at` as the closing stamp for this
 * subject, so this row is OPEN and is applied rather than refused —
 * which is the state `scripts/approve.ts` leaves behind when an
 * operator rules from a terminal, since that function deliberately
 * writes the one stamp and not the other.
 */
const AGREED_PROPOSAL = 4003844;

/** A proposal already ruled on AND already applied: the `409`. */
const APPLIED_PROPOSAL = 4004855;

/** An open proposal made for {@link RADAR_ITEMS} instead. */
const OTHERS_PROPOSAL = 4005866;

/**
 * A proposal made for {@link RADAR_ITEMS} and already applied.
 *
 * THE ORDERING CASE'S SUBJECT. Both checks fire on it, and only the
 * order `src/approvals/ruling.ts` argues decides which one a caller
 * is answered with: a `409` here would tell a caller that a feed it
 * did not address holds a proposal, and that it is already live.
 */
const OTHERS_APPLIED = 4006877;

/**
 * A proposal whose `status` says `done` and whose `approved_at` is
 * null.
 *
 * STORABLE, AND THAT IS THE POINT.
 * `source_config_proposals_approval_check` holds the two stamps
 * against each other and never consults the status, so this row is
 * legal — and it is what says the gate reads the stamp rather than
 * the column that claims to describe it.
 */
const DONE_UNAPPROVED = 4007888;

/**
 * An open proposal naming {@link MISSING_SOURCE}.
 *
 * Plantable because the seam is keyed by the DOMAIN and every read
 * below answers about an id rather than about a stored feed, which
 * is what lets the queue be non-empty under an id nothing carries.
 * A deployment cannot reach that state —
 * `source_config_proposals_source_id_sources_id_fk` is
 * `ON DELETE no action` — and the case that plants it is about what
 * refuses BEFORE the queue is reached, not about the state itself.
 */
const ORPHAN_PROPOSAL = 4008899;

/** An id no proposal carries, in either feed's queue. */
const MISSING_PROPOSAL = 4444555;

/** When every planted proposal was made. */
const PROPOSED_AT = '2026-02-01T00:00:00.000Z';

/** When the two already-ruled rows were agreed to. */
const AGREED_AT = '2026-02-02T00:00:00.000Z';

/** When the two already-applied rows were written onto their feed. */
const WRITTEN_AT = '2026-02-03T00:00:00.000Z';

/**
 * What every planted proposal records as having proposed it.
 *
 * A SENTINEL RATHER THAN A READABLE NAME, so the containment block
 * has a STORED needle as well as two submitted ones: what a model
 * answered about a feed a caller does not own is exactly the text a
 * refusal must not carry out, and a readable name could match a
 * module path or a stack frame by accident.
 */
const SENTINEL_PROPOSER = 'zzsentinelproposerzz';

/** A sentinel planted INSIDE the proposed `parser_config`. */
const SENTINEL_SELECTOR = 'zzsentinelselectorzz';

/** A sentinel planted inside the proposed `contract`. */
const SENTINEL_EXPECTS = 'zzsentinelexpectszz';

/** The `parser_config` every planted proposal carries. */
const PROPOSED_PARSER = { item: 'entry', select: SENTINEL_SELECTOR };

/** The `contract` beside it, proposed and approved together. */
const PROPOSED_CONTRACT = { expects: SENTINEL_EXPECTS, minimum: 3 };

/**
 * What a feed is INSERTED holding, and what an unapplied approval
 * has to leave on it.
 *
 * Empty, so it shares no member with either proposed document: a
 * case reading the feed after a refusal can say the two columns
 * were not written without depending on which of them moved.
 */
const UNWRITTEN_CONFIG = {};

/**
 * A window wider than any queue planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would make
 * each refusal depend on where its rows happened to fall. What a
 * window SELECTS is the next task's half.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * The three sentinels every planted proposal carries, and which no
 * refusal may hand back.
 *
 * A STORED needle rather than a submitted one, and the channel this
 * surface has that the resource groups beside it do not: what a
 * model answered about a feed a caller does not own is exactly the
 * text a refusal must not carry out. All three are shaped like
 * nothing this module writes, so a hit is the stored value rather
 * than a coincidence of wording.
 *
 * THE ADDRESSED FEED'S OWN ID IS DELIBERATELY NOT AMONG THEM.
 * `insertSource` assigns from one, so the id under test is a single
 * digit, and the `cause` channel renders a STACK whose line and
 * column numbers a one-digit needle matches by accident — at which
 * point the zero reads as a leak. The two ids this file CHOSE cover
 * the submitted half instead, seven digits apiece.
 */
const STORED_NEEDLES: readonly string[] = [
  SENTINEL_PROPOSER,
  SENTINEL_SELECTOR,
  SENTINEL_EXPECTS,
];

/** What {@link proposedRow} defaults when a case is not about it. */
type ProposalDefaults = Partial<
  Omit<MemorySourceProposal, 'id' | 'sourceId'>
>;

/**
 * Builds one row for `MemoryResearchStore.setDomainProposals`.
 *
 * @param id - The proposal's id: what a ruling names and what the
 *   queue's tiebreak reads.
 * @param sourceId - The feed it was made for. Required rather than
 *   defaulted, `source_config_proposals.source_id` being NOT NULL
 *   and being the member the containment rule is decided on.
 * @param values - The five members a case may care about. Both
 *   stamps default to null, which is the open state every row
 *   starts in and the one side of
 *   `source_config_proposals_approval_check` that is always legal.
 * @returns The row to plant, carrying both sentinels.
 */
function proposedRow(
  id: number,
  sourceId: number,
  values: ProposalDefaults = {},
): MemorySourceProposal {
  return {
    id,
    sourceId,
    parserConfig: values.parserConfig ?? { ...PROPOSED_PARSER },
    contract: values.contract ?? { ...PROPOSED_CONTRACT },
    proposedBy: values.proposedBy ?? SENTINEL_PROPOSER,
    status: values.status ?? 'pending',
    proposedAt: values.proposedAt ?? new Date(PROPOSED_AT),
    approvedAt: values.approvedAt ?? null,
    appliedAt: values.appliedAt ?? null,
  };
}

/** A domain, two feeds and one queue, and the store holding them. */
interface PlantedGate {
  /** The store, holding {@link RADAR} and both its feeds. */
  readonly store: MemoryResearchStore;

  /** The feed every case addresses. */
  readonly feedId: number;

  /**
   * Its sibling, which the cross-source rule is read against.
   *
   * Planted holding two proposals of its own AND carrying an empty
   * `parser_config`, so a case refusing a proposal made for it can
   * say the refusal left that feed alone as well as the addressed
   * one.
   */
  readonly itemsId: number;
}

/**
 * Plants that shape.
 *
 * THE PROPOSALS ARE PLANTED RATHER THAN WRITTEN, because no port
 * declares an insert over `source_config_proposals` at all — a
 * proposal is made by `proposeSourceConfig` in
 * `./config-proposer.ts`, and
 * `MemoryResearchStore.setDomainProposals` is the whole of how one
 * arrives here.
 *
 * THE SEAM IS KEYED BY THE DOMAIN AND THE READS ARE SCOPED BY THE
 * FEED, which is what lets the last planted row name a source this
 * dataset does not hold. Every row is stored under one call, since
 * a second call would replace the first rather than adding to it.
 *
 * @returns The store and both feed ids.
 */
async function plantGate(): Promise<PlantedGate> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const feed = await store.insertSource({
    domainId: domain.id,
    kind: 'rss',
    endpoint: RADAR_FEED,
    parserConfig: { ...UNWRITTEN_CONFIG },
    contract: { ...UNWRITTEN_CONFIG },
    enabled: true,
  });
  const items = await store.insertSource({
    domainId: domain.id,
    kind: 'api',
    endpoint: RADAR_ITEMS,
    parserConfig: { ...UNWRITTEN_CONFIG },
    contract: { ...UNWRITTEN_CONFIG },
    enabled: true,
  });

  store.setDomainProposals(domain.id, [
    proposedRow(OPEN_PROPOSAL, feed.id),
    proposedRow(SECOND_PROPOSAL, feed.id),
    proposedRow(AGREED_PROPOSAL, feed.id, {
      approvedAt: new Date(AGREED_AT),
      status: 'approved',
    }),
    proposedRow(APPLIED_PROPOSAL, feed.id, {
      approvedAt: new Date(AGREED_AT),
      appliedAt: new Date(WRITTEN_AT),
      status: 'done',
    }),
    proposedRow(DONE_UNAPPROVED, feed.id, { status: 'done' }),
    proposedRow(OTHERS_PROPOSAL, items.id),
    proposedRow(OTHERS_APPLIED, items.id, {
      approvedAt: new Date(AGREED_AT),
      appliedAt: new Date(WRITTEN_AT),
      status: 'done',
    }),
    proposedRow(ORPHAN_PROPOSAL, MISSING_SOURCE),
  ]);

  return { store, feedId: feed.id, itemsId: items.id };
}

/** How many times each port method a case drives was called. */
interface CallCounts {
  /** Lookups of the source the path named. */
  findSourceById: number;

  /** Reads of one window of that feed's pending proposals. */
  listPendingProposals: number;

  /** Reads of how many it has waiting. */
  countPendingProposals: number;

  /** Lookups of one proposal by its own id. */
  findProposalById: number;

  /** Rulings given, and the two-table write behind each. */
  approveAndApplyProposal: number;
}

/** A tally with every member at zero. */
const NO_CALLS: CallCounts = {
  findSourceById: 0,
  listPendingProposals: 0,
  countPendingProposals: 0,
  findProposalById: 0,
  approveAndApplyProposal: 0,
};

/**
 * The five-method port with a tally beside it.
 *
 * A COUNTING WRAPPER RATHER THAN A STUB: every call is forwarded to
 * the planted store, so a case reading the tally is reading a call
 * that really happened and really answered. A stub would pin the
 * ordering and lose every other claim in the same case.
 *
 * @param store - Where the calls go.
 * @returns The port to hand the function, and the tally it fills.
 */
function countingStore(store: MemoryResearchStore): {
  counted: SourceProposalsServiceStore;
  calls: CallCounts;
} {
  const calls: CallCounts = { ...NO_CALLS };
  const counted: SourceProposalsServiceStore = {
    findSourceById(id) {
      calls.findSourceById += 1;

      return store.findSourceById(id);
    },
    listPendingProposals(sourceId, window) {
      calls.listPendingProposals += 1;

      return store.listPendingProposals(sourceId, window);
    },
    countPendingProposals(sourceId) {
      calls.countPendingProposals += 1;

      return store.countPendingProposals(sourceId);
    },
    findProposalById(id) {
      calls.findProposalById += 1;

      return store.findProposalById(id);
    },
    approveAndApplyProposal(id) {
      calls.approveAndApplyProposal += 1;

      return store.approveAndApplyProposal(id);
    },
  };

  return { counted, calls };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so a refusal that quietly stopped
 *   happening fails here — naming the refusal it wanted — rather
 *   than asserting over an error nobody built. Anything that is not
 *   an `AppError` is rethrown unchanged.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * @param store - Where the proposal is read.
 * @param id - The proposal's own id.
 * @returns The row, whole.
 * @throws When no proposal carries the id, so a case reading a
 *   planted row back cannot quietly assert over nothing.
 */
async function storedProposal(
  store: MemoryResearchStore,
  id: number,
): Promise<ApprovedProposal & {
  status: string;
  appliedAt: Date | null;
  sourceId: number;
}> {
  const row = await store.findProposalById(id);

  if (row === null) {
    throw new Error(`expected proposal ${id} to be planted`);
  }

  return row;
}

/**
 * @param store - Where the feed is read.
 * @param id - The feed's own id.
 * @returns Its two proposable columns, as stored.
 * @throws When no source carries the id.
 */
async function storedConfig(
  store: MemoryResearchStore,
  id: number,
): Promise<{ parserConfig: unknown; contract: unknown }> {
  const row = await store.findSourceById(id);

  if (row === null) {
    throw new Error(`expected source ${id} to be planted`);
  }

  return { parserConfig: row.parserConfig, contract: row.contract };
}

/**
 * Renders an error's `cause` into text a search can read.
 *
 * @param cause - `err.cause`, which is `unknown` by declaration.
 * @returns The name, the message and the stack for an `Error`; the
 *   serialised value otherwise; and the empty string when there is
 *   no cause. The STACK is in it deliberately: a driver error's own
 *   message is repeated there, so a channel that read only
 *   `cause.message` would miss the copy underneath it.
 */
function renderCause(cause: unknown): string {
  if (cause === undefined) {
    return '';
  }

  if (cause instanceof Error) {
    return [cause.name, cause.message, cause.stack ?? ''].join(' ');
  }

  return JSON.stringify(cause) ?? String(cause);
}

/**
 * The three channels a refusal could carry a submitted or a stored
 * value out through, rendered separately.
 *
 * SEPARATELY RATHER THAN JOINED, so a count of zero in each is
 * three readings and a leak names the channel it came through. The
 * order is fixed: the message, the details, the cause.
 *
 * @param err - The refusal.
 * @returns The three renderings.
 */
function channelsOf(err: AppError): string[] {
  return [
    err.message,
    JSON.stringify(err.details ?? null),
    renderCause(err.cause),
  ];
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * @param err - The refusal.
 * @param needle - The string that must not be in it.
 * @returns One count per channel, in {@link channelsOf}'s order.
 */
function leaksIn(err: AppError, needle: string): number[] {
  return channelsOf(err).map((text) => countOccurrences(text, needle));
}

/**
 * A refusal built to leak every needle through all three channels.
 *
 * THE CONTROL FOR EVERY ZERO IN THE CONTAINMENT SECTION, and it has
 * to carry EVERY needle in EVERY channel or it reddens where the
 * subject is fine. So each one is interpolated into the message,
 * into the one detail's message AND into the cause.
 *
 * @param needles - The values a real refusal must not carry.
 * @returns The planted refusal, to be counted by {@link leaksIn}.
 */
function leakingRefusal(needles: readonly string[]): ValidationError {
  const quoted = needles.join(' ');

  return new ValidationError(`Refused ${quoted}`, [{
    field: 'planted',
    message: `Refused ${quoted}`,
    code: 'planted_leak',
  }], { cause: new Error(`Refused ${quoted}`) });
}

// ---------------------------------------------------------------------------
// An id no source carries
// ---------------------------------------------------------------------------

describe('an id no source carries', () => {
  it('answers 404 from the pending queue', async () => {
    // The queue reads are never ISSUED, which no assertion on the
    // status can say: `SourceStore` answers an empty list and a
    // count of `0` for an id no row carries, both correctly, so a
    // function that skipped the lookup would answer a mistyped id
    // exactly as it answers a feed with nothing waiting.
    const { store, feedId } = await plantGate();
    const refused = countingStore(store);
    const refusal = await refusalFrom(
      () => listPendingConfigs(
        refused.counted,
        MISSING_SOURCE,
        WIDE_WINDOW,
      ),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
    expect(refusal.cause).toBeUndefined();
    expect(refused.calls).toEqual({ ...NO_CALLS, findSourceById: 1 });

    // The control, inside the case and varied along the one axis
    // under test: the same window against a feed that resolves. A
    // function refusing everything passes every assertion above and
    // fails this one, and a wrapper that had stopped counting
    // reports zero for the refusal and zero for the control.
    const answered = countingStore(store);
    const page = await listPendingConfigs(
      answered.counted,
      feedId,
      WIDE_WINDOW,
    );

    expect(page.total).toBeGreaterThan(0);
    expect(answered.calls).toEqual({
      ...NO_CALLS,
      findSourceById: 1,
      listPendingProposals: 1,
      countPendingProposals: 1,
    });
  });

  it('refuses though a queue is planted under the id', async () => {
    // The reading that says the `404` comes from the LOOKUP rather
    // than from there being nothing to answer. The seam is keyed by
    // the DOMAIN and every read is scoped by the feed, so a
    // proposal naming an id this dataset holds no source for is
    // plantable — and the queue under that id is not empty.
    const { store } = await plantGate();
    const planted = await store.listPendingProposals(
      MISSING_SOURCE,
      WIDE_WINDOW,
    );

    expect(planted.map((row) => row.id)).toEqual([ORPHAN_PROPOSAL]);

    const refusal = await refusalFrom(
      () => listPendingConfigs(store, MISSING_SOURCE, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('refuses the approval before the queue is read', async () => {
    // The source is resolved first, so an id nothing carries costs
    // one lookup and never reaches the queue — read directly here,
    // where a status assertion would pass over a gate that had read
    // somebody's proposal before noticing.
    const { store, feedId } = await plantGate();
    const refused = countingStore(store);
    const refusal = await refusalFrom(
      () => approveSourceConfig(refused.counted, MISSING_SOURCE, {
        proposalId: ORPHAN_PROPOSAL,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refused.calls).toEqual({ ...NO_CALLS, findSourceById: 1 });

    // The row it named really is there and really names the id the
    // path did, so a gate that read the queue first would have
    // found it, matched it against the segment, and reached a store
    // whose own fault is that no such feed exists.
    const stood = await storedProposal(store, ORPHAN_PROPOSAL);

    expect(stood.sourceId).toBe(MISSING_SOURCE);
    expect(stood.approvedAt).toBeNull();
    expect(stood.appliedAt).toBeNull();

    // The two 404s this call can answer are about different things,
    // and only the sentence says which: no feed at all, against no
    // proposal of a feed that is there.
    const other = await refusalFrom(
      () => approveSourceConfig(store, feedId, {
        proposalId: MISSING_PROPOSAL,
      }),
    );

    expect(refusal.message).not.toBe(other.message);

    // The control, varied along the one axis under test: the same
    // shape of request against a feed that resolves, reaching all
    // three methods.
    const answered = countingStore(store);
    const ruling = await approveSourceConfig(answered.counted, feedId, {
      proposalId: OPEN_PROPOSAL,
    });

    expect(ruling.id).toBe(OPEN_PROPOSAL);
    expect(answered.calls).toEqual({
      ...NO_CALLS,
      findSourceById: 1,
      findProposalById: 1,
      approveAndApplyProposal: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// An id no proposal carries
// ---------------------------------------------------------------------------

describe('an id no proposal carries', () => {
  it('refuses without reaching the writer', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a gate that ruled first and looked afterwards would
    // answer the same `404` off the write's own null.
    const { store, feedId } = await plantGate();
    const refused = countingStore(store);
    const refusal = await refusalFrom(
      () => approveSourceConfig(refused.counted, feedId, {
        proposalId: MISSING_PROPOSAL,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
    expect(refused.calls).toEqual({
      ...NO_CALLS,
      findSourceById: 1,
      findProposalById: 1,
    });

    // Read BEFORE the control is issued, the control writing this
    // same feed: a state read taken afterwards would answer the
    // control's own write and redden as though the refusal had
    // applied something.
    const untouched = await storedConfig(store, feedId);

    expect(untouched).toEqual({
      parserConfig: UNWRITTEN_CONFIG,
      contract: UNWRITTEN_CONFIG,
    });

    // The control, varied along this case's own axis: the same
    // request naming a proposal that is really queued.
    const answered = countingStore(store);
    const ruling = await approveSourceConfig(answered.counted, feedId, {
      proposalId: OPEN_PROPOSAL,
    });

    expect(ruling.id).toBe(OPEN_PROPOSAL);
    expect(answered.calls).toEqual({
      ...NO_CALLS,
      findSourceById: 1,
      findProposalById: 1,
      approveAndApplyProposal: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// A proposal made for another feed
// ---------------------------------------------------------------------------

describe('a proposal made for another feed', () => {
  it('refuses it rather than applying it', async () => {
    // `findProposalById` is UNSCOPED, so the row is read and then
    // judged: the whole containment rule lives in this comparison
    // and in nothing the store did. A `404` rather than a `403`,
    // because a caller is not entitled to learn that another feed's
    // proposal exists.
    const { store, feedId, itemsId } = await plantGate();
    const refused = countingStore(store);
    const refusal = await refusalFrom(
      () => approveSourceConfig(refused.counted, feedId, {
        proposalId: OTHERS_PROPOSAL,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
    expect(refused.calls).toEqual({
      ...NO_CALLS,
      findSourceById: 1,
      findProposalById: 1,
    });

    // RATHER THAN APPLYING IT, which no assertion on the status
    // could say: the row stands where it was planted and NEITHER
    // feed was written — not the one addressed, and not the one the
    // proposal was actually made for. Read before either control.
    const stood = await storedProposal(store, OTHERS_PROPOSAL);
    const addressed = await storedConfig(store, feedId);
    const owner = await storedConfig(store, itemsId);

    expect(stood.status).toBe('pending');
    expect(stood.approvedAt).toBeNull();
    expect(addressed.parserConfig).toEqual(UNWRITTEN_CONFIG);
    expect(owner.parserConfig).toEqual(UNWRITTEN_CONFIG);

    // The control, varied along the one axis under test: the same
    // call for a proposal made for the ADDRESSED feed.
    const ruling = await approveSourceConfig(store, feedId, {
      proposalId: OPEN_PROPOSAL,
    });

    expect(ruling.id).toBe(OPEN_PROPOSAL);
    expect(ruling.status).toBe('approved');

    // And the MIRROR, which is what says the rule reads the row's
    // own `source_id` rather than one fixed feed: a gate comparing
    // every proposal against the first source it ever saw refuses
    // this one too, and passes every assertion above.
    const mirrored = await approveSourceConfig(store, itemsId, {
      proposalId: OTHERS_PROPOSAL,
    });

    expect(mirrored.id).toBe(OTHERS_PROPOSAL);
    expect(mirrored.closedAt).not.toBeNull();
  });

  it('answers 404 for one already applied elsewhere', async () => {
    // BOTH CHECKS FIRE ON THIS ROW, and only the order decides
    // which one a caller is answered with. A `409` here would tell
    // a caller that a feed it did not address holds a proposal AND
    // that the proposal is already live on it — the disclosure the
    // ordering in `src/approvals/ruling.ts` exists to prevent.
    const { store, feedId } = await plantGate();
    const refusal = await refusalFrom(
      () => approveSourceConfig(store, feedId, {
        proposalId: OTHERS_APPLIED,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);

    // The control, varied along the one axis that separates the two
    // refusals: the SAME closed state on a proposal made for the
    // addressed feed answers the `409` instead. Without it a gate
    // checking the parent and nothing else passes the assertions
    // above.
    const owned = await refusalFrom(
      () => approveSourceConfig(store, feedId, {
        proposalId: APPLIED_PROPOSAL,
      }),
    );

    expect(owned).toBeInstanceOf(ConflictError);
    expect(owned.statusCode).toBe(409);
    expect(refusal.message).not.toBe(owned.message);
  });
});

// ---------------------------------------------------------------------------
// A proposal already applied
// ---------------------------------------------------------------------------

describe('a proposal already applied', () => {
  it('answers 409 and leaves the feed as it was', async () => {
    const { store, feedId } = await plantGate();
    const refused = countingStore(store);
    const refusal = await refusalFrom(
      () => approveSourceConfig(refused.counted, feedId, {
        proposalId: APPLIED_PROPOSAL,
      }),
    );

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
    expect(refusal.details).toBeUndefined();
    expect(refusal.cause).toBeUndefined();
    expect(refused.calls).toEqual({
      ...NO_CALLS,
      findSourceById: 1,
      findProposalById: 1,
    });

    // Read BEFORE the control is issued, since the control writes
    // this same feed. Both stamps stand where they were planted,
    // which is the half `applied it again` would move.
    const untouched = await storedConfig(store, feedId);
    const stood = await storedProposal(store, APPLIED_PROPOSAL);

    expect(untouched).toEqual({
      parserConfig: UNWRITTEN_CONFIG,
      contract: UNWRITTEN_CONFIG,
    });
    expect(stood.approvedAt).toEqual(new Date(AGREED_AT));
    expect(stood.appliedAt).toEqual(new Date(WRITTEN_AT));

    // The control, varied along the one axis the `409` turns on: a
    // proposal a person has ALREADY approved and nothing has
    // applied. `describeRuling` reads `applied_at` as the closing
    // stamp for this subject, so an approval alone leaves the row
    // OPEN and it is applied here rather than refused — which is
    // exactly the state `scripts/approve.ts` leaves behind.
    const ruling = await approveSourceConfig(store, feedId, {
      proposalId: AGREED_PROPOSAL,
    });

    expect(ruling.id).toBe(AGREED_PROPOSAL);
    expect(ruling.approvedAt).toEqual(new Date(AGREED_AT));
    expect(ruling.closedAt).not.toBeNull();

    // And the feed really can be written, which is what makes the
    // untouched reading above a claim about this refusal rather
    // than about a gate that never writes anything. WHAT it holds
    // afterwards is the next task's half, so only the move is read.
    const written = await storedConfig(store, feedId);

    expect(written).not.toEqual(untouched);
  });
});

// ---------------------------------------------------------------------------
// A proposal nobody approved
// ---------------------------------------------------------------------------

describe('a proposal nobody approved', () => {
  it('refuses to derive the two columns from it', async () => {
    // DRIVEN DIRECTLY, because this refusal is unreachable through
    // the gate: `approveAndApplyProposal` stamps the approval one
    // statement before the derivation, so a row reaching it without
    // one is a fault in the store rather than a request somebody
    // got wrong. The row is READ OFF THE PORT rather than written
    // out here, which is also what says a
    // `SourceConfigProposalRecord` satisfies `ApprovedProposal`
    // with nothing copied out and no second shape in between.
    const { store, feedId } = await plantGate();
    const unapproved = await storedProposal(store, OPEN_PROPOSAL);

    expect(unapproved.approvedAt).toBeNull();
    expect(() => proposalToSourceUpdate(unapproved))
      .toThrow(/carries no approved_at/);

    // PINNED BY MESSAGE AND NOT BY CLASS, every raise in JavaScript
    // satisfying `toThrow(Error)`. The near miss is asserted absent
    // by the same matcher in the same case, so the match above is
    // shown discriminating rather than merely matching.
    expect(() => proposalToSourceUpdate(unapproved))
      .not.toThrow(/carries no applied_at/);

    // `status` IS NOT CONSULTED, which is the account
    // `source_config_proposals_approval_check` keeps too: a row
    // whose column says `done` and whose stamp says nobody agreed
    // is refused exactly as the pending one is.
    const claiming = await storedProposal(store, DONE_UNAPPROVED);

    expect(claiming.status).toBe('done');
    expect(() => proposalToSourceUpdate(claiming))
      .toThrow(/carries no approved_at/);

    // The control, inside the case and varied along the one axis
    // the refusal turns on: the same shape of row with
    // `approved_at` stamped. An applier refusing every row passes
    // all three assertions above and fails this one.
    const agreed = await storedProposal(store, AGREED_PROPOSAL);

    expect(agreed.approvedAt).not.toBeNull();
    expect(proposalToSourceUpdate(agreed)).toEqual({
      parserConfig: PROPOSED_PARSER,
      contract: PROPOSED_CONTRACT,
    });

    // And the gate really does reach past a status that lies: the
    // row whose column claims to be finished is stamped and applied
    // here, which is the service-level half of the paragraph above.
    const ruling = await approveSourceConfig(store, feedId, {
      proposalId: DONE_UNAPPROVED,
    });

    expect(ruling.id).toBe(DONE_UNAPPROVED);
    expect(ruling.status).toBe('approved');
    expect(ruling.closedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What a refusal carries
// ---------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes neither a submitted id nor a stored one', async () => {
    const { store, feedId, itemsId } = await plantGate();

    // Every lookup BEFORE the one each refusal is about has to
    // RESOLVE, or the needles are absent for the wrong reason and
    // this case passes over a store holding no feed and no queue at
    // all — the refusals would then all be the source lookup's, and
    // nothing planted would ever have been in reach of a message.
    const addressed = await storedConfig(store, feedId);
    const sibling = await storedProposal(store, OTHERS_PROPOSAL);
    const applied = await storedProposal(store, APPLIED_PROPOSAL);

    expect(addressed.parserConfig).toEqual(UNWRITTEN_CONFIG);
    expect(sibling.sourceId).toBe(itemsId);
    expect(applied.appliedAt).not.toBeNull();

    const noSource = await refusalFrom(
      () => listPendingConfigs(store, MISSING_SOURCE, WIDE_WINDOW),
    );
    const noProposal = await refusalFrom(
      () => approveSourceConfig(store, feedId, {
        proposalId: MISSING_PROPOSAL,
      }),
    );
    const others = await refusalFrom(
      () => approveSourceConfig(store, feedId, {
        proposalId: OTHERS_PROPOSAL,
      }),
    );
    const twice = await refusalFrom(
      () => approveSourceConfig(store, feedId, {
        proposalId: APPLIED_PROPOSAL,
      }),
    );
    const refusals = [
      { refusal: noSource, submitted: String(MISSING_SOURCE) },
      { refusal: noProposal, submitted: String(MISSING_PROPOSAL) },
      { refusal: others, submitted: String(OTHERS_PROPOSAL) },
      { refusal: twice, submitted: String(APPLIED_PROPOSAL) },
    ];
    const counted = refusals.flatMap(
      (row) => [row.submitted, ...STORED_NEEDLES]
        .map((needle) => leaksIn(row.refusal, needle)),
    );

    expect(counted).toHaveLength(
      refusals.length * (STORED_NEEDLES.length + 1),
    );
    expect(counted).toEqual(counted.map(() => [0, 0, 0]));

    // The two 404s answer ONE sentence, which is what makes those
    // counts a containment reading rather than merely eight of
    // them: a caller able to tell `no such proposal` from `not this
    // feed's` has been told that a row it does not own exists. The
    // `409` is a different sentence on purpose — it is about a row
    // the caller does own.
    expect(noProposal.message).toBe(others.message);
    expect(twice.message).not.toBe(others.message);

    // None of the four keeps a cause at all, all four being
    // decisions this gate takes about a row it read rather than
    // refusals it translates from somewhere else.
    expect(refusals.map((row) => row.refusal.cause))
      .toEqual(refusals.map(() => undefined));

    // The control, as above and for the same reason: a search that
    // would find nothing anywhere reports a clean refusal and a
    // leaking one alike.
    const needles = refusals.flatMap(
      (row) => [row.submitted, ...STORED_NEEDLES],
    );
    const planted = leakingRefusal(needles);
    const seen = needles.map(
      (needle) => leaksIn(planted, needle).map((count) => count > 0),
    );

    expect(seen).toEqual(needles.map(() => [true, true, true]));
  });
});
