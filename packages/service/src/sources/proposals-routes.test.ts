/**
 * `src/sources/proposals-routes.ts` — what the two routes answer,
 * refusing and landing: the status, the envelope and the members
 * each reaches the wire with. Driven over supertest against a
 * router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `proposals-service.test.ts` is the
 * translation, and only the translation. Which proposal a caller
 * may rule on, what a second application answers, the one sentence
 * three refusals share, and the order one backlog comes back in
 * are claims about the RULES and are pinned one file over, over
 * direct calls. What no call can report is whether a rule reached
 * a caller: the status `errorHandler` or the handler chose, the
 * envelope written around it, the members that envelope carried,
 * whether a handler swallowed a throw on the way, and — the
 * reading this gate needs more than any other route on the surface
 * — what the SERIALISED response carries. So every case below
 * reads a response, and the only store reads any of them takes are
 * of the state a write did or did not leave.
 *
 * NINE CASES IN EIGHT GROUPS. Three of them guard: two the fixture
 * every case is read through, one the shapes every answer is held
 * to. Then the six this file is scoped to: the paginated queue and
 * its `meta`, the `200` approval carrying the ruling projection,
 * the `404` for a proposal raised against another feed, the `409`
 * for one already applied, the `422` for a body key this write
 * does not declare, and the containment row holding that no answer
 * carries part of a stored arrangement its caller did not ask for.
 *
 * THE QUEUE. One request with no window at all beside three
 * windows of ONE over the same three rows — the first, the last
 * and one past the end. A handler ignoring the window answers all
 * three rows to every call, a `total` taken from the rows in hand
 * answers 1 to each of the narrow pair and 0 to the overshoot, and
 * `meta` echoing the rows rather than the window asked for cannot
 * answer `page: 9` at all. The envelope is asserted as a key SET
 * with `meta` whole, one row is compared whole against the
 * constants the fixture plants from, and EVERY row key set is read
 * rather than the first — a page cannot carry one well-shaped
 * record beside one that leaked a column.
 *
 * THE ORDER REACHES THE WIRE AS THE PORT ANSWERED IT, which is the
 * only half of the ordering this file owns. The three pending rows
 * are planted in an order that is none of the four a store could
 * reach without reading both keys, and the case computes all four
 * rather than naming them: the planted order, its reverse, the id
 * ascending and the id descending are each a different list from
 * the one right answer. The oldest row carries the LARGEST id, so
 * the ordering key and the tiebreak beneath it disagree about
 * where it goes.
 *
 * THE RULING. `200` and not `201`, because nothing was created:
 * the proposal already existed and what changed is three of its
 * columns and two of the feed. The four-member projection is
 * asserted as a key set and then HELD AGAINST THE STORE'S OWN READ
 * rather than member by member — both stamps are instants the
 * WRITE chose and `status` is a member it moved, so none of the
 * three came from the request and an answer rebuilt around the
 * parsed body could carry none of them. `closedAt` is non-null
 * here where the research gate leaves it open, which is the one
 * axis the two gates differ on.
 *
 * AND THE RULED ROW LEAVES THE BACKLOG, read through the same
 * route rather than through the store: the queue answers two rows
 * and a `total` of two afterwards, and the approved id is in
 * neither. That is the whole of what an operator sees of an
 * approval having landed, and it is a reading only a routes file
 * takes.
 *
 * THE `404`. A proposal raised against the OTHER feed of the same
 * domain, so a refusal cannot be a scoping accident between two
 * domains. Its whole body is asserted, `details` is asserted
 * ABSENT rather than empty, and the submitted id is counted in the
 * response text against a known positive taken by the same
 * function over the request body — the one document a caller could
 * read it back off is the one it sent. Two controls, and the
 * second is the one only two feeds can supply: the SAME proposal
 * approved against the feed it WAS raised for lands, which is what
 * makes this a reading about `source_id` rather than about a gate
 * refusing every ruling it is handed.
 *
 * THE `409`. The one refusal on this surface that is not a `404`,
 * and its axis is `applied_at` rather than `approved_at`. Its
 * control is therefore an APPROVED-BUT-UNAPPLIED proposal ruled on
 * in the same case and answered `200` — the state
 * `scripts/approve.ts` leaves behind when an operator rules from a
 * terminal. Without that row the case is equally green against a
 * gate refusing every proposal anybody has ruled on, which is a
 * different rule and the wrong one.
 *
 * THE `422`. A body carrying a key the write does not declare, and
 * then the key that key rule exists for: a submitted
 * `parserConfig`, which would be a way to write
 * `sources.parser_config` through the gate without ever having
 * proposed it. Both are refused naming `body` rather than the key,
 * because an `unrecognized_keys` issue names the CONTAINER — the
 * key itself is something the request said. Neither key nor value
 * comes back, counted against a planted envelope carrying both,
 * and the feed is read afterwards to say the strict parse ran
 * before anything was written.
 *
 * THE CONTAINMENT ROW IS THIS SURFACE'S OWN, and it is not the
 * no-echo reading the resource groups take. What a model proposed
 * about a feed is STORED text a caller may be entitled to read in
 * one place and nowhere else: the queue of the feed it addressed.
 * So the four answers that are NOT that queue — the ruling and the
 * three refusals — are counted for every needle the fixture
 * planted inside the proposed `parser_config`, the `contract`
 * beside it and the provenance, and every count is zero. The
 * positive control is the QUEUE PAGE, taken by the same function
 * in the same case: a caller that DID ask for the arrangement gets
 * every needle, which is what makes the zeros a reading rather
 * than a search that could only ever come back empty.
 *
 * MUTATION GRID, derived WHOLE over all nine cases by mutating one
 * file one edit at a time and reading the failed `fullName` SET
 * from a `--reporter=json` run rather than a count. TWENTY LEGS,
 * each named by the EDIT it makes rather than by its effect, since
 * a leg described only by its effect is one nobody can run again.
 * Five mutate `./proposals-routes.ts`, seven the service it wraps,
 * six `tests/helpers/memory-research-store.ts` and two
 * `src/approvals/ruling.ts`. THE WHOLE GRID WAS RUN TWICE OVER ONE
 * TREE and all twenty failed sets were identical member for member,
 * which is what separates a measurement from a bad capture — one
 * leg had disagreed with itself across an earlier pair of runs and
 * was 4/4 on re-measurement, the extra red being the whole-suite
 * supertest flake this repository already records.
 *
 * THE TWO BLUNT LEGS ARE THE STATUSES, and between them they say
 * every case reaches a response: `res.status(200)` written as `201`
 * reddens 6 on the queue and 5 on the ruling, and the two sets
 * cover all nine.
 *
 * THE ENVELOPE AND THE WINDOW. `ok(page.rows)` in place of
 * `okPage(page.rows, meta)` reddens 2, the queue and the ruling —
 * the second because it reads `meta.total` back after its write. A
 * fixed window in place of `toStoreWindow(query)` and
 * `total: page.rows.length` in place of `total: page.total` redden
 * 1 apiece, both times the queue, which is the one case here taking
 * a window narrower than its collection.
 *
 * THE ORDER IS THREE LEGS AND TWO FIGURES. Dropping the first sort
 * key and reversing the whole order redden the SAME 3, told apart
 * only by the assertion that fails inside each; dropping the id
 * tiebreak reddens 2, a subset. That the fixture guard is in all
 * three is the point of computing the four wrong orders there
 * rather than naming them. Dropping the queue's status predicate
 * reddens 4, adding the `404` case, whose control reads the
 * addressed backlog.
 *
 * THE PROJECTION. Answering the stamped ROW in place of
 * `describeRuling(ruled)` reddens 4 — the ruling, the `409`, the
 * `422` and the containment row — and it is the leg the last of
 * those exists for: nothing else in this file separates a
 * four-member projection from a row carrying both proposed
 * documents. Answering a fixed `status` reddens 3, and answering
 * `approved_at` as `closedAt` reddens exactly 1, the `409` case,
 * through its control rather than its refusal: an approved-
 * but-unapplied proposal then reads as CLOSED and is refused
 * `409` where it must land, which is `expected 409 to be 200` and
 * is the whole reason that row is planted.
 *
 * THE GATE. Answering `already-ruled` as a `404` and declaring the
 * act as the other member of `RULING_ACTS` redden the same 2 (the
 * `409` and the containment row), and answering the other two
 * reasons as `409`s and making the containment comparison match
 * itself redden the same other 2 (the `404` and the containment
 * row). Two identical pairs, each told apart only by the assertion
 * that fails inside each, and the containment row is in all four
 * because it asserts each of the three statuses before counting
 * anything.
 *
 * THE STAMPS AND THE WRITE. Re-dating an approval already given
 * reddens 1, the `409` case, through the approved-but-unapplied
 * control alone. Leaving the two `sources` columns unwritten
 * reddens 1, the `422` case — and it read ZERO until that case
 * asserted the feed AFTER its control lands, which is what makes
 * the three `unwritten` readings in this file discriminating: a
 * store that never wrote those columns at all satisfied every one
 * of them.
 *
 * THE CONTAINMENT LEGS. Composing the submitted `proposalId` into
 * the refusal's own sentence reddens 2, the `404` case that counts
 * it and the `409` case that asserts its whole body. Dropping
 * `.strict()` from `approveConfigSchema` reddens 2, the `422` and
 * the containment row.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That either route sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and
 * what a refusal may contain across the whole surface is
 * `tests/api/request-echo.test.ts`'s. The four routes over a
 * `sources` ROW and the read-only capture queue under the same
 * prefix are different routers with files of their own.
 */
import type { SourceProposalsServiceStore } from './proposals-service.js';
import type { SourceConfigProposalRecord } from './store.js';
import type {
  MemoryResearchStore,
  MemorySourceProposal,
} from '../../tests/helpers/memory-research-store.js';
import type { Ruling } from '../approvals/ruling.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildSourceProposalsRouter } from './proposals-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('source-proposals-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const RADAR = 'example-tech-radar';

/** The feed every case addresses. */
const RADAR_FEED = 'https://example.test/radar/feed.xml';

/**
 * A second feed of the SAME domain, which the `404` is read
 * against.
 *
 * The same domain rather than a second one, deliberately: the rule
 * that case is about is over `source_id`, and a sibling in another
 * domain could be refused by a scoping accident no assertion here
 * would separate from the rule.
 */
const RADAR_ITEMS = 'https://example.test/radar/items';

/**
 * The oldest proposal in the addressed feed's backlog, and the row
 * that makes `oldest first` a reading rather than a name.
 *
 * ITS ID IS THE HIGHEST OF THE THREE PENDING ONES, so the ordering
 * key and the tiebreak beneath it DISAGREE about where it goes: a
 * store reading the id alone answers it last, where the queue
 * answers it first.
 */
const EARLY_PROPOSAL = 4009911;

/**
 * The proposal the approval rules on, and the one row this file
 * moves through the gate.
 *
 * SEVEN DIGITS, LIKE EVERY ID THIS FILE SUBMITS. A refusal is
 * counted for the id a case sent, and a short one matches a line
 * or column number inside a rendered stack by accident — at which
 * point the zero the count exists for reads as a leak.
 */
const OPEN_PROPOSAL = 4001822;

/**
 * A second open proposal on the same feed, tied with
 * {@link OPEN_PROPOSAL} on the ordering key.
 *
 * Two jobs. It is the tie the queue's second key has to break, and
 * it is the control for every case that has already spent
 * {@link OPEN_PROPOSAL} on a ruling of its own — so no control is
 * ever ruling on a row another assertion in the same case moved.
 */
const SECOND_PROPOSAL = 4002833;

/**
 * A proposal a person has already ruled in favour of, and which
 * nothing has applied.
 *
 * THE `409`'S CONTROL, AND THE REASON THAT REFUSAL IS ABOUT
 * `applied_at`. `describeRuling` reads that stamp as the closing
 * one for this subject, so this row is OPEN and is applied here
 * rather than turned away — which is the state `scripts/approve.ts`
 * leaves behind when an operator rules from a terminal, that
 * function deliberately writing the one stamp and not the other.
 */
const AGREED_PROPOSAL = 4003844;

/** A proposal already ruled on AND already applied: the `409`. */
const APPLIED_PROPOSAL = 4004855;

/** An open proposal raised for {@link RADAR_ITEMS} instead. */
const OTHERS_PROPOSAL = 4005866;

/** When every planted proposal but one was made. */
const PROPOSED_AT = '2026-02-01T00:00:00.000Z';

/**
 * When {@link EARLY_PROPOSAL} was made: before every other row,
 * and the whole of what the queue's first key has to read.
 */
const EARLY_AT = '2026-01-15T00:00:00.000Z';

/** When the two already-ruled rows were agreed to. */
const AGREED_AT = '2026-02-02T00:00:00.000Z';

/** When the applied one was written onto its feed. */
const WRITTEN_AT = '2026-02-03T00:00:00.000Z';

/**
 * The `recordsPath` every planted proposal proposes.
 *
 * A SENTINEL RATHER THAN A READABLE PATH, and the first of three
 * needles that live INSIDE the proposed `parser_config`. What a
 * model answered about how to read a feed is exactly the text an
 * answer other than that feed's own queue must not carry out, and
 * a realistic token could match a module path or a stack frame by
 * accident.
 */
const SENTINEL_RECORDS = 'zzsentinelrecordszz';

/** A sentinel used as a field NAME inside that config. */
const SENTINEL_FIELD = 'zzsentinelfieldzz';

/** A sentinel used as that field's selector: a config VALUE. */
const SENTINEL_SELECTOR = 'zzsentinelselectorzz';

/** A sentinel planted inside the proposed `contract` beside it. */
const SENTINEL_EXPECTS = 'zzsentinelexpectszz';

/** What every planted proposal records as having proposed it. */
const SENTINEL_PROPOSER = 'zzsentinelproposerzz';

/**
 * The `parser_config` every planted proposal carries.
 *
 * THREE SENTINELS IN TWO POSITIONS: one is a key and two are
 * values, so the containment row below reads both shapes a stored
 * document leaks in. Well-formed as `parserConfigErrors` in
 * `src/lib/parser-config.ts` has it — a field map is the whole of
 * what that function requires — because nothing in this file is
 * about a document the parse engine cannot read, and a fixture
 * that happened to be malformed would make that silently true of
 * every case here.
 */
const PROPOSED_PARSER = {
  recordsPath: SENTINEL_RECORDS,
  fields: { [SENTINEL_FIELD]: { selector: SENTINEL_SELECTOR } },
};

/** The `contract` beside it, proposed and approved together. */
const PROPOSED_CONTRACT = { expects: SENTINEL_EXPECTS, minimum: 3 };

/**
 * What a feed is INSERTED holding, and what a refused approval has
 * to leave on it.
 *
 * Empty, so it shares no member with either proposed document: a
 * case reading the feed after a refusal can say the two columns
 * were not written without depending on which of them moved.
 */
const UNWRITTEN_CONFIG = {};

/**
 * The three needles that are part of the proposed `parser_config`
 * itself.
 *
 * The task this file answers is scoped to that column, and these
 * are it: the records path, the field name and the selector under
 * it. {@link STORED_NEEDLES} widens the reading to the whole
 * stored arrangement.
 */
const PARSER_NEEDLES: readonly string[] = [
  SENTINEL_RECORDS,
  SENTINEL_FIELD,
  SENTINEL_SELECTOR,
];

/**
 * Every sentinel the fixture stores, and what no answer other than
 * the addressed feed's own queue may carry.
 *
 * THE PROPOSED DOCUMENTS PLUS THE PROVENANCE. All five are shaped
 * like nothing this surface writes, so a hit is the stored value
 * rather than a coincidence of wording, and each is distinct from
 * every other — asserted in the fixture guard, since a needle that
 * was a substring of its neighbour would make one count answer for
 * two claims.
 *
 * NO ID IS AMONG THEM. `insertSource` assigns from one, so a
 * planted feed's id is a single digit and the `404` case counts
 * the seven-digit id it SUBMITTED instead.
 */
const STORED_NEEDLES: readonly string[] = [
  ...PARSER_NEEDLES,
  SENTINEL_EXPECTS,
  SENTINEL_PROPOSER,
];

/** The status every row is planted in, and the queue's predicate. */
const PENDING = 'pending';

/** The status one ruling moves a row to. */
const APPROVED = 'approved';

/** What the two already-ruled rows are planted carrying. */
const DONE = 'done';

/**
 * A body key `approveConfigSchema` does not declare.
 *
 * Distinctive as a substring for the same reason its value is: the
 * `422` case counts both in the refusal they produced, and a short
 * realistic token would be satisfiable by some other member of the
 * envelope.
 */
const UNDECLARED_KEY = 'zzsentinelkeyzz';

/** What that key is submitted with, on the same terms. */
const UNDECLARED_KEY_VALUE = 'zzsentinelbodyvaluezz';

/**
 * The one undeclared key this router exists to refuse by name.
 *
 * A body able to carry it would be a way to write
 * `sources.parser_config` through the gate without ever having
 * proposed it, so the strictness that refuses it is the whole of
 * what keeps an approval an approval of something queued.
 */
const PARSER_CONFIG_KEY = 'parserConfig';

/**
 * The addressed feed's backlog, in the order it comes back: oldest
 * first, with the id breaking the tie the two later rows make.
 *
 * Its LENGTH is the queue's own size as well, which is what
 * `meta.total` names and what one approval takes a row off.
 */
const QUEUE_ORDER: readonly number[] = [
  EARLY_PROPOSAL,
  OPEN_PROPOSAL,
  SECOND_PROPOSAL,
];

/**
 * The order {@link plantGate} stores those three in, which is none
 * of the orders a store could answer by accident.
 *
 * THE GUARD AGAINST A PAGE THAT IS THE SEAM READ BACK. Neither
 * this order nor its reverse is {@link QUEUE_ORDER}, and neither
 * is the id ascending or descending, so a page of three cannot
 * agree with a store that never sorted. The tied pair is stored in
 * the order the tiebreak reverses for the same reason:
 * `Array.prototype.sort` is stable, so a tiebreak that answered
 * zero would preserve whatever the seam happened to store.
 */
const PLANTED_ORDER: readonly number[] = [
  EARLY_PROPOSAL,
  SECOND_PROPOSAL,
  OPEN_PROPOSAL,
];

/** How many proposals the addressed feed has waiting. */
const QUEUE_SIZE = QUEUE_ORDER.length;

/** What one approval leaves waiting behind it. */
const QUEUE_AFTER_RULING = QUEUE_SIZE - 1;

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the queue case, which asserts `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * having been a default.
 */
const DEFAULT_PER_PAGE = 50;

/** A page far past the end of a three-row backlog. */
const OVERSHOT_PAGE = 9;

/** The path TEMPLATE the router registers the queue under. */
const PENDING_TEMPLATE = '/sources/:id/pending-configs';

/** The one it registers the ruling under. */
const APPROVE_TEMPLATE = '/sources/:id/approve-config';

/**
 * The whole body a proposal this feed does not hold answers with.
 *
 * One constant rather than a literal at the assertion, which is
 * how this file says the message is the service's own sentence
 * arriving unmodified with `code` beside it and nothing else. ONE
 * SENTENCE FOR THREE REASONS — a proposal nothing carries, one
 * raised against another feed, and the row having gone between the
 * read and the ruling — because two sentences between them would
 * tell a caller that a proposal it does not own exists.
 */
const NO_SUCH_PROPOSAL_BODY = {
  code: 'NOT_FOUND',
  message: 'No config proposal of this source carries that id',
};

/**
 * The whole body a proposal already applied answers with.
 *
 * A sentence about the ROW's state and not about the feed's: what
 * `sources.parser_config` holds now may have been edited since,
 * and a caller refused an approval is not thereby entitled to read
 * the arrangement it would have replaced.
 */
const ALREADY_APPLIED_BODY = {
  code: 'CONFLICT',
  message: 'That config proposal has already been applied',
};

/**
 * The whole body an undeclared key in the request body answers
 * with.
 *
 * ONE detail naming `body` rather than the key, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * REQUEST said. `body` rather than `query` because `parseBody` is
 * what the service called — the two parsers differ ONLY in the
 * name a root-level issue takes, so this constant is also the
 * reading that the ruling reached for the right one.
 */
const UNDECLARED_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * One answered proposal, as the WIRE has it.
 *
 * `SourceConfigProposalRecord` WITH ITS THREE STAMPS RETYPED: they
 * are `Date`s across the port and arrive here as ISO-8601 strings,
 * because `res.json` serialises through `Date#toJSON`. That is why
 * this is declared rather than imported — and it is held to the
 * same roster the record is, so a column renamed on either side is
 * a refusal at {@link EVERY_KEY_LISTED} rather than a member no
 * case looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter
 * that `check-types` refuses.
 */
interface WireProposal {
  /** `source_config_proposals.id`, and the id a ruling names. */
  readonly id: number;

  /** The domain whose feed the proposal is about. */
  readonly domainId: number;

  /** The feed it was raised for, and the `404`'s own subject. */
  readonly sourceId: number;

  /** The proposed `parser_config`, whole and as stored. */
  readonly parserConfig: unknown;

  /** The proposed `contract` beside it, on the same terms. */
  readonly contract: unknown;

  /** What proposed it, as provenance and nothing addressable. */
  readonly proposedBy: string;

  /** Where the row stands at the gate, as stored. */
  readonly status: string;

  /** When it was made, as JSON carries it: the queue's first key. */
  readonly proposedAt: string;

  /** When a person agreed, or null while nobody has. */
  readonly approvedAt: string | null;

  /** When the arrangement was written onto the feed, or null. */
  readonly appliedAt: string | null;
}

/**
 * One answered ruling, as the WIRE has it.
 *
 * `Ruling` WITH BOTH STAMPS RETYPED, on the terms
 * {@link WireProposal} states for its three.
 */
interface WireRuling {
  /** The `source_config_proposals` row that was ruled on. */
  readonly id: number;

  /** Where it stands afterwards, as stored. */
  readonly status: string;

  /** When a person agreed, as JSON carries it, or null. */
  readonly approvedAt: string | null;

  /**
   * When the arrangement was written onto the feed, or null.
   *
   * `applied_at` for this subject, per `describeRuling`. It is
   * NON-null after a ruling here, where the research gate leaves
   * its own closing stamp open — the one axis the two gates
   * differ on.
   */
  readonly closedAt: string | null;
}

/** A domain, two feeds and one backlog, and the store holding them. */
interface PlantedGate {
  /** The store every case below is driven against. */
  readonly store: MemoryResearchStore;

  /** The feed every case addresses. */
  readonly feedId: number;

  /**
   * Its sibling, which the `404` is read against.
   *
   * Planted holding one proposal of its own AND carrying an empty
   * `parser_config`, so a case refusing a proposal raised for it
   * can say the refusal left that feed alone as well as the
   * addressed one.
   */
  readonly itemsId: number;
}

/**
 * The members an answered proposal carries.
 *
 * Written out because an interface has no runtime form to read
 * keys off, and pinned in BOTH directions, since a one-directional
 * list is exactly as green as no list at all against the drift
 * that matters. `satisfies` closes the direction where this names
 * a member the record lacks; {@link EVERY_KEY_LISTED} closes the
 * one where either the record or {@link WireProposal} grows a
 * member nothing here learned about.
 *
 * The second direction is the one a QUEUE of PROPOSED DOCUMENTS
 * needs. This is the one projection on this router where stored
 * text a model composed reaches a response at all, so a member
 * added beside them is a disclosure rather than an untidiness.
 */
const PROPOSAL_KEYS = [
  'appliedAt',
  'approvedAt',
  'contract',
  'domainId',
  'id',
  'parserConfig',
  'proposedAt',
  'proposedBy',
  'sourceId',
  'status',
] as const satisfies readonly (keyof SourceConfigProposalRecord)[];

/**
 * The four members a ruling is projected onto.
 *
 * `src/approvals/ruling.ts` is where the vocabulary is argued;
 * what this roster claims is that all four of it reach the wire
 * and that nothing of the ruled ROW travels beside them — which is
 * the containment row's structural half.
 */
const RULING_KEYS = [
  'approvedAt',
  'closedAt',
  'id',
  'status',
] as const satisfies readonly (keyof Ruling)[];

/** The members every body this router answers a resource in has. */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/** The same members, plus the one a windowed read adds to them. */
const PAGE_KEYS = [
  ...RESOURCE_KEYS,
  'meta',
] as const satisfies readonly (keyof PaginatedEnvelope<unknown>)[];

/** The members `meta` describes the window and collection with. */
const META_KEYS = [
  'page',
  'perPage',
  'total',
  'totalPages',
] as const satisfies readonly (keyof PaginationMeta)[];

/**
 * Exactly the five port methods this router is handed.
 *
 * EIGHT OF THE THIRTEEN `SourceStore` DECLARES ARE ABSENT, and the
 * absence is what keeps each router under this prefix to its own
 * subject: the three `sources` writes belong to `./routes.ts` and
 * the two `documents` reads to `./failures-routes.ts`. Pinned two
 * ways — `satisfies` refuses a name the `Pick` does not carry, and
 * {@link EVERY_KEY_LISTED} refuses a method added to the `Pick`
 * and not to this list, which is what a widened `Pick` would look
 * like.
 */
const SERVICE_METHODS = [
  'approveAndApplyProposal',
  'countPendingProposals',
  'findProposalById',
  'findSourceById',
  'listPendingProposals',
] as const satisfies readonly (keyof SourceProposalsServiceStore)[];

/**
 * The one method among those five that WRITES.
 *
 * The runtime half of the router header's claim that one call is
 * the whole of what this router can change. Held against the
 * roster above by the shapes case, with the four readers named
 * beside it so a classifier that had stopped classifying is
 * reported rather than passing.
 */
const WRITER_METHODS: readonly string[] = ['approveAndApplyProposal'];

/** The four that only read, and the non-vacuity half beside it. */
const READER_METHODS: readonly string[] = [
  'countPendingProposals',
  'findProposalById',
  'findSourceById',
  'listPendingProposals',
];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration:
 * without it the union distributes over the conditional and the
 * answer is `boolean`, which accepts `true` as an initializer and
 * pins nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Every list above, held against the types it describes. */
type EveryKeyListed =
  CoversEveryKey<SourceConfigProposalRecord, typeof PROPOSAL_KEYS>
  & CoversEveryKey<WireProposal, typeof PROPOSAL_KEYS>
  & CoversEveryKey<Ruling, typeof RULING_KEYS>
  & CoversEveryKey<WireRuling, typeof RULING_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<SourceProposalsServiceStore, typeof SERVICE_METHODS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to the answered proposal, to the ruling, to
 * either envelope, to `meta` or to the `Pick` this router is
 * handed, and to none of the lists above, turns
 * {@link EveryKeyListed} into a `never` — `false` for the list
 * that missed it, intersected with the `true` the others still
 * answer — and this initializer is then a TS2322 at this line,
 * before any case can compare an answer against a set that has
 * quietly stopped describing it. Read in a case below, so it is a
 * symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link PROPOSAL_KEYS}, sorted at use rather than by hand. */
const PROPOSAL_KEY_SET: readonly string[] = [...PROPOSAL_KEYS].sort();

/** {@link RULING_KEYS}, sorted. */
const RULING_KEY_SET: readonly string[] = [...RULING_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/** {@link SERVICE_METHODS}, sorted. */
const SERVICE_METHOD_SET: readonly string[] = [
  ...SERVICE_METHODS,
].sort();

/**
 * @param value - Any answered object.
 * @returns Its keys, sorted, so a comparison is about the SET.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/**
 * @param body - A page as the wire carried it.
 * @returns The rows' ids, in the order they arrived.
 */
function idsOf(body: { data: readonly WireProposal[] }): number[] {
  return body.data.map((row) => row.id);
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
 * How often each stored sentinel occurs in one answer.
 *
 * @param text - A response as the wire carried it.
 * @param needles - The sentinels to count.
 * @returns One entry per needle, in the roster's own order, so a
 *   failure names WHICH sentinel travelled rather than reporting a
 *   total nobody can attribute.
 */
function needleCounts(
  text: string,
  needles: readonly string[],
): { needle: string; occurrences: number }[] {
  return needles.map((needle) => ({
    needle,
    occurrences: countOccurrences(text, needle),
  }));
}

/**
 * The same shape with one count on every needle.
 *
 * @param needles - The sentinels being counted.
 * @param occurrences - What each must answer.
 * @returns The expected table, built rather than written out.
 */
function everyNeedle(
  needles: readonly string[],
  occurrences: number,
): { needle: string; occurrences: number }[] {
  return needles.map((needle) => ({ needle, occurrences }));
}

/**
 * The row a page carries at one id.
 *
 * THROWS rather than answering undefined, because what it returns
 * is compared as a whole record: an absent row would otherwise
 * reach `toStrictEqual` as `undefined` and pass against any other
 * absent one, which is a green nobody wrote.
 *
 * @param rows - The page's rows.
 * @param id - The proposal id to find.
 * @returns That row.
 * @throws Error - When the page carries no row at that id.
 */
function rowFor(rows: readonly WireProposal[], id: number): WireProposal {
  const found = rows.find((row) => row.id === id);

  if (found === undefined) {
    throw new Error(`no answered row carries the id ${id}`);
  }

  return found;
}

/**
 * The path one feed's backlog is read under.
 *
 * @param id - The feed's id, or whatever a case is sending in its
 *   place.
 * @returns The wire path, root-absolute as the router declares it.
 *   Derived from {@link PENDING_TEMPLATE} rather than spelled
 *   again, and the shapes case asserts no `:` survives the
 *   substitution — an unreplaced parameter still reaches the
 *   router as a literal segment and still answers a plausible
 *   refusal.
 */
function pendingPath(id: number | string): string {
  return PENDING_TEMPLATE.replace(':id', String(id));
}

/**
 * The path one feed is ruled on under.
 *
 * @param id - The feed's id, on {@link pendingPath}'s terms.
 * @returns The wire path.
 */
function approvePath(id: number | string): string {
  return APPROVE_TEMPLATE.replace(':id', String(id));
}

/**
 * The proposal a store holds at one id.
 *
 * THROWS rather than answering null, because what it returns is
 * read member by member: an absent row would otherwise reach an
 * assertion as `null` and fail somewhere that names the wrong
 * subject.
 *
 * @param row - What `findProposalById` answered.
 * @param id - The id it was asked for, for the message.
 * @returns That row.
 * @throws Error - When the store carries no proposal at that id.
 */
function storedProposal(
  row: SourceConfigProposalRecord | null,
  id: number,
): SourceConfigProposalRecord {
  if (row === null) {
    throw new Error(`no stored proposal carries the id ${id}`);
  }

  return row;
}

/**
 * What a feed's two proposed columns hold right now.
 *
 * @param store - The store to read.
 * @param id - The feed's id.
 * @returns The two columns one approval writes, and nothing else:
 *   a case reading the whole record would be pinning columns no
 *   route here can reach.
 * @throws Error - When no source carries the id.
 */
async function storedConfig(
  store: MemoryResearchStore,
  id: number,
): Promise<{ parserConfig: unknown; contract: unknown }> {
  const source = await store.findSourceById(id);

  if (source === null) {
    throw new Error(`no stored source carries the id ${id}`);
  }

  return {
    parserConfig: source.parserConfig,
    contract: source.contract,
  };
}

/** What {@link proposedRow} defaults when a case is not about it. */
type ProposalDefaults = Partial<
  Omit<MemorySourceProposal, 'id' | 'sourceId'>
>;

/**
 * Builds one row for `MemoryResearchStore.setDomainProposals`.
 *
 * @param id - The proposal's id: what a ruling names and what the
 *   queue's tiebreak reads.
 * @param sourceId - The feed it was raised for. Required rather
 *   than defaulted, `source_config_proposals.source_id` being NOT
 *   NULL and being the member the `404` is decided on.
 * @param values - The members a case may care about. Both stamps
 *   default to null, which is the open state every row starts in
 *   and the one side of
 *   `source_config_proposals_approval_check` that is always legal.
 * @returns The row to plant, carrying all five sentinels.
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
    status: values.status ?? PENDING,
    proposedAt: values.proposedAt ?? new Date(PROPOSED_AT),
    approvedAt: values.approvedAt ?? null,
    appliedAt: values.appliedAt ?? null,
  };
}

/**
 * Builds an app carrying one freshly built proposals router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * refusal below would read Express's own 500 page.
 * `express.json()` is registered FIRST for the same reason:
 * `applyMiddleware` installs it before any router is mounted, so
 * `req.body` reaches the ruling already parsed.
 *
 * What this app leaves out is the framework's middleware stack and
 * the auth guard: that both routes are mounted behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and a
 * limiter counting across cases would only make this file's
 * failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on either route reads the
 * present, both ruling stamps being written inside the store.
 *
 * @param store - What the router acts against, typed as the
 *   router's own options member rather than as the memory store —
 *   so the app is built through the five-method `Pick` and a case
 *   cannot reach a port method the router could not.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildProposalsApp(
  store: SourceProposalsServiceStore,
): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSourceProposalsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Plants one domain, two feeds and six proposals.
 *
 * THE PROPOSALS ARE PLANTED RATHER THAN WRITTEN, because no port
 * declares an insert over `source_config_proposals` at all — a
 * proposal is made by `proposeSourceConfig` in
 * `./config-proposer.ts`, and
 * `MemoryResearchStore.setDomainProposals` is the whole of how one
 * arrives here.
 *
 * THE SEAM IS KEYED BY THE DOMAIN AND THE READS ARE SCOPED BY THE
 * FEED, so both feeds queue through one call. A second call would
 * replace the first rather than adding to it.
 *
 * THE THREE PENDING ROWS OF THE ADDRESSED FEED ARE STORED IN
 * {@link PLANTED_ORDER}, which the queue answers in none of the
 * orders a store could reach without reading both keys. The other
 * three are ruled on to differing degrees and are what the `409`,
 * its control and the `404` address.
 *
 * BOTH FEEDS ARE INSERTED HOLDING {@link UNWRITTEN_CONFIG}, which
 * shares no member with either proposed document — so a case
 * reading a feed after a refusal can say the two columns were not
 * written without depending on which of them moved.
 *
 * @returns The store and both feed ids. The store is handed back
 *   because four cases below read the state a write did or did not
 *   leave, which is the one reading a response cannot make; the
 *   ids are addresses rather than readings, a request being unable
 *   to name a feed without one.
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
    proposedRow(EARLY_PROPOSAL, feed.id, {
      proposedAt: new Date(EARLY_AT),
    }),
    proposedRow(SECOND_PROPOSAL, feed.id),
    proposedRow(OPEN_PROPOSAL, feed.id),
    proposedRow(AGREED_PROPOSAL, feed.id, {
      approvedAt: new Date(AGREED_AT),
      status: APPROVED,
    }),
    proposedRow(APPLIED_PROPOSAL, feed.id, {
      approvedAt: new Date(AGREED_AT),
      appliedAt: new Date(WRITTEN_AT),
      status: DONE,
    }),
    proposedRow(OTHERS_PROPOSAL, items.id),
  ]);

  return { store, feedId: feed.id, itemsId: items.id };
}

// ---------------------------------------------------------------------------
// What the fixture plants, and the needles every count is read for
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants one backlog in none of the orders it answers', async () => {
    const { store, feedId, itemsId } = await plantGate();
    const app = buildProposalsApp(store);

    // Two distinct feeds, so the `404` and its second control
    // cannot be the same row addressed twice.
    expect(feedId).not.toBe(itemsId);
    const queue = await request(app).get(pendingPath(feedId));
    const answered = idsOf(queue.body);

    expect(queue.status).toBe(200);
    expect(answered).toHaveLength(QUEUE_SIZE);
    // THE ANSWER IS NONE OF THE FOUR ORDERS A STORE COULD REACH
    // WITHOUT READING BOTH KEYS, computed here rather than named:
    // the order the seam stored, its reverse, and the id in either
    // direction. A page of three that agreed with any of them
    // would be a seam read back rather than a queue.
    const reversed = [...PLANTED_ORDER].reverse();
    const ascending = [...answered].sort((left, right) => left - right);
    const descending = [...ascending].reverse();

    expect(answered).toStrictEqual(QUEUE_ORDER);
    expect(answered).not.toStrictEqual(PLANTED_ORDER);
    expect(answered).not.toStrictEqual(reversed);
    expect(answered).not.toStrictEqual(ascending);
    expect(answered).not.toStrictEqual(descending);
    // The oldest row carries the LARGEST id, which is what makes
    // the two keys disagree about where it goes rather than agree
    // by accident.
    expect(Math.max(...answered)).toBe(EARLY_PROPOSAL);
    expect(answered[0]).toBe(EARLY_PROPOSAL);
    // The three rows nobody is waiting on are NOT in it: two of
    // this feed that have been ruled on, and the sibling feed's.
    // Without this the queue's predicate is satisfied by a store
    // answering the whole table.
    expect(answered).not.toContain(AGREED_PROPOSAL);
    expect(answered).not.toContain(APPLIED_PROPOSAL);
    expect(answered).not.toContain(OTHERS_PROPOSAL);
    // And each of those three is really there, read off the store
    // rather than inferred from its absence above: a fixture that
    // planted none of them would satisfy every assertion in the
    // `409` and `404` cases for the wrong reason.
    const applied = storedProposal(
      await store.findProposalById(APPLIED_PROPOSAL),
      APPLIED_PROPOSAL,
    );
    const agreed = storedProposal(
      await store.findProposalById(AGREED_PROPOSAL),
      AGREED_PROPOSAL,
    );
    const others = storedProposal(
      await store.findProposalById(OTHERS_PROPOSAL),
      OTHERS_PROPOSAL,
    );

    expect(applied.appliedAt?.toISOString()).toBe(WRITTEN_AT);
    expect(agreed.approvedAt?.toISOString()).toBe(AGREED_AT);
    expect(agreed.appliedAt).toBeNull();
    expect(others.sourceId).toBe(itemsId);
  });

  it('plants five distinct needles inside one arrangement', async () => {
    const { store, feedId } = await plantGate();
    const app = buildProposalsApp(store);

    // Distinct from one another, so no count answers for two
    // claims: a needle that was a substring of its neighbour would
    // make one zero cover both and one positive prove neither.
    expect(new Set(STORED_NEEDLES).size).toBe(STORED_NEEDLES.length);
    for (const needle of STORED_NEEDLES) {
      const others = STORED_NEEDLES.filter((other) => other !== needle);

      expect(others.some((other) => other.includes(needle))).toBe(false);
    }
    // The three the scoped claim is about really are part of the
    // proposed `parser_config` rather than of the row around it,
    // read off the planted document rather than asserted.
    const config = JSON.stringify(PROPOSED_PARSER);

    expect(needleCounts(config, PARSER_NEEDLES))
      .toStrictEqual(everyNeedle(PARSER_NEEDLES, 1));
    const widened: readonly string[] = STORED_NEEDLES;
    const missing = PARSER_NEEDLES.filter(
      (needle) => !widened.includes(needle),
    );

    expect(missing).toStrictEqual([]);
    // None of them is anything the three refusal constants say, so
    // a zero counted in one of those bodies is about the request
    // rather than about a substring that could not have appeared
    // anyway.
    const refusals = [
      NO_SUCH_PROPOSAL_BODY,
      ALREADY_APPLIED_BODY,
      UNDECLARED_BODY,
    ].map((body) => JSON.stringify(body)).join('');

    expect(needleCounts(refusals, STORED_NEEDLES))
      .toStrictEqual(everyNeedle(STORED_NEEDLES, 0));
    // And every one of them IS reachable, through the one answer a
    // caller is entitled to read them in: the addressed feed's own
    // queue. Without this the containment row's zeros are counted
    // over text the fixture may never have planted.
    const queue = await request(app).get(pendingPath(feedId));

    expect(queue.status).toBe(200);
    for (const { needle, occurrences } of needleCounts(
      queue.text,
      STORED_NEEDLES,
    )) {
      expect({ needle, present: occurrences > 0 })
        .toStrictEqual({ needle, present: true });
    }
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to the answered proposal, to the ruling, to either
    // envelope, to `meta` or to the `Pick` this router is handed
    // and to none of the lists is a TS2322 at that declaration,
    // before any assertion below can compare an answer against a
    // set that has quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // between the two success shapes this router writes.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // A RULING IS NOT A ROW, which is the containment row's
    // structural half: the four members a ruling is projected onto
    // and the ten an answered proposal carries share `id`,
    // `status` and the approval stamp, and NEITHER proposed
    // document is among them. So no approval can answer an
    // arrangement whatever the row it ruled on held.
    expect(RULING_KEY_SET).not.toContain('parserConfig');
    expect(RULING_KEY_SET).not.toContain('contract');
    expect(RULING_KEY_SET.length)
      .toBeLessThan(PROPOSAL_KEY_SET.length);
    expect(PROPOSAL_KEY_SET).toContain('parserConfig');
    // One writer among the five, which is the runtime half of the
    // router header's claim that one call is the whole of what
    // this router can change. The four readers are named beside it
    // so a split that had stopped splitting is reported: a
    // classification answering nothing would leave both lists
    // agreeing with an empty roster.
    expect([...WRITER_METHODS, ...READER_METHODS].sort())
      .toStrictEqual(SERVICE_METHOD_SET);
    expect(WRITER_METHODS).toHaveLength(1);
    expect(READER_METHODS).toHaveLength(SERVICE_METHODS.length - 1);
    // And the derived paths are real substitutions rather than
    // templates that reached Express as one: an unreplaced `:id`
    // is still a literal segment and still answers a plausible
    // refusal.
    expect(PENDING_TEMPLATE).toContain(':id');
    expect(APPROVE_TEMPLATE).toContain(':id');
    expect(pendingPath(OPEN_PROPOSAL)).not.toContain(':');
    expect(approvePath(OPEN_PROPOSAL)).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// The queue: the envelope, the window it echoes and the rows in it
// ---------------------------------------------------------------------------

describe('a pending-configs page that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { store, feedId } = await plantGate();
    const app = buildProposalsApp(store);
    const pending = pendingPath(feedId);

    const whole = await request(app).get(pending);
    // The controls, varied along the axis under test and through
    // the SAME operation: three windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, a `total` taken from the rows in hand answers 1
    // to each of the first pair and 0 to the overshoot, and a
    // `meta` echoing the rows rather than the window asked for
    // cannot answer `page: 9` at all.
    const first = await request(app)
      .get(pending)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(pending)
      .query({ page: QUEUE_SIZE, perPage: 1 });
    const past = await request(app)
      .get(pending)
      .query({ page: OVERSHOT_PAGE, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    expect(past.status).toBe(200);
    // THREE members and not two: this read applies a window, so it
    // carries the `meta` describing one — which is the difference
    // between the envelope `okPage` writes and the one `ok` does.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: QUEUE_SIZE,
      totalPages: 1,
    });
    // The order reaches the wire as the port answered it, which is
    // this file's half of that claim: nothing in the handler
    // re-sorts a page it was handed, and a handler that did would
    // be answering a different order from the one the window was
    // taken under.
    expect(idsOf(whole.body)).toStrictEqual(QUEUE_ORDER);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data as WireProposal[]) {
      expect(keysOf(row)).toStrictEqual(PROPOSAL_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. The three stamps are asserted in
    // their ISO spelling because that conversion is the
    // framework's and is the one thing that happens to this row
    // crossing `res.json`. The domain is read off the STORE, it
    // being the one answered member no constant here plants and
    // no path names.
    const domainId = (await store.findSourceById(feedId))?.domainId;

    expect(domainId).toBeGreaterThan(0);
    expect(rowFor(whole.body.data as WireProposal[], EARLY_PROPOSAL))
      .toStrictEqual({
        id: EARLY_PROPOSAL,
        domainId,
        sourceId: feedId,
        parserConfig: PROPOSED_PARSER,
        contract: PROPOSED_CONTRACT,
        proposedBy: SENTINEL_PROPOSER,
        status: PENDING,
        proposedAt: EARLY_AT,
        approvedAt: null,
        appliedAt: null,
      });
    // The two narrow windows are disjoint and each names the total
    // of the COLLECTION, which no page could have counted from its
    // own rows — and the overshoot names it too, from a page with
    // nothing in it at all.
    expect(idsOf(first.body)).toStrictEqual([EARLY_PROPOSAL]);
    expect(idsOf(last.body)).toStrictEqual([SECOND_PROPOSAL]);
    expect(idsOf(past.body)).toStrictEqual([]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: QUEUE_SIZE,
      totalPages: QUEUE_SIZE,
    });
    expect(last.body.meta).toStrictEqual({
      page: QUEUE_SIZE,
      perPage: 1,
      total: QUEUE_SIZE,
      totalPages: QUEUE_SIZE,
    });
    // `meta` ECHOES THE WINDOW THAT WAS ASKED FOR rather than the
    // rows that came back, which is how a caller sees that it
    // overshot: `page: 9` beside `totalPages: 3` and an empty
    // `data`, and never a clamp to the last page that holds rows.
    expect(past.body.meta).toStrictEqual({
      page: OVERSHOT_PAGE,
      perPage: 1,
      total: QUEUE_SIZE,
      totalPages: QUEUE_SIZE,
    });
    expect(keysOf(past.body)).toStrictEqual(PAGE_KEY_SET);
  });
});

// ---------------------------------------------------------------------------
// The ruling: four members, and one row off the backlog
// ---------------------------------------------------------------------------

describe('a ruling on one queued arrangement', () => {
  it('answers 200 with the four-member ruling', async () => {
    const { store, feedId } = await plantGate();
    const app = buildProposalsApp(store);

    const answer = await request(app)
      .post(approvePath(feedId))
      .send({ proposalId: OPEN_PROPOSAL });
    const ruled = storedProposal(
      await store.findProposalById(OPEN_PROPOSAL),
      OPEN_PROPOSAL,
    );
    // The control, along the axis under test: the OTHER open
    // proposal tied with it on the ordering key. One ruling stamps
    // one row, and a gate ruling on the backlog wholesale would
    // satisfy every assertion below and fail this.
    const untouched = storedProposal(
      await store.findProposalById(SECOND_PROPOSAL),
      SECOND_PROPOSAL,
    );
    // And the backlog afterwards, read through the same ROUTE
    // rather than through the store: what an operator sees of an
    // approval having landed is the row leaving the queue.
    const after = await request(app).get(pendingPath(feedId));

    // `200` and not `201`, because nothing was created: the
    // proposal already existed and what changed is three of its
    // columns and two of the feed.
    expect(answer.status).toBe(200);
    // TWO members and not three: a ruling applies no window. And
    // FOUR in the projection, which is `src/approvals/ruling.ts`'s
    // whole vocabulary reaching the wire rather than the ruled
    // row: the two proposed documents, the provenance and the
    // domain are not answerable here.
    expect(keysOf(answer.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(answer.body.data)).toStrictEqual(RULING_KEY_SET);
    // THE ANSWER IS HELD AGAINST THE STORE'S OWN READ rather than
    // member by member: both stamps are instants the WRITE chose
    // and `status` is a member it moved, so none of the three came
    // from the request and an answer rebuilt around the parsed
    // body could carry none of them.
    const wire = answer.body.data as WireRuling;

    expect(wire).toStrictEqual({
      id: ruled.id,
      status: ruled.status,
      approvedAt: ruled.approvedAt?.toISOString() ?? null,
      closedAt: ruled.appliedAt?.toISOString() ?? null,
    });
    // The row MOVED, in the three columns the write names and in
    // none of the others: it was planted pending, unapproved and
    // unapplied and it is none of the three now. `closedAt` is
    // NON-null, which is the one axis this gate differs from the
    // research one on — ruling here applies, and applying is what
    // a second request is refused for.
    expect(wire.id).toBe(OPEN_PROPOSAL);
    expect(wire.status).toBe(APPROVED);
    expect(wire.status).not.toBe(PENDING);
    expect(wire.approvedAt).not.toBeNull();
    expect(wire.closedAt).not.toBeNull();
    expect(ruled.proposedAt.toISOString()).toBe(PROPOSED_AT);
    // And the proposal beside it is exactly as it was planted,
    // which is the reading no assertion over the ruled row can
    // make: the write reached one row.
    expect(untouched.status).toBe(PENDING);
    expect(untouched.approvedAt).toBeNull();
    expect(untouched.appliedAt).toBeNull();
    // THE RULED ROW LEAVES THE BACKLOG, and the queue counts it
    // out as well as pages it out: a `total` that had stayed at
    // three would say the row is still waiting on somebody.
    expect(after.status).toBe(200);
    expect(idsOf(after.body)).toStrictEqual(
      QUEUE_ORDER.filter((id) => id !== OPEN_PROPOSAL),
    );
    expect(after.body.meta.total).toBe(QUEUE_AFTER_RULING);
    expect(idsOf(after.body)).not.toContain(OPEN_PROPOSAL);
  });
});

// ---------------------------------------------------------------------------
// The gate: a proposal raised for another feed
// ---------------------------------------------------------------------------

describe('a proposal raised for another feed', () => {
  it('answers 404 without saying whose it is', async () => {
    const { store, feedId, itemsId } = await plantGate();
    const app = buildProposalsApp(store);

    const refused = await request(app)
      .post(approvePath(feedId))
      .send({ proposalId: OTHERS_PROPOSAL });
    // THE REFUSAL WROTE NOTHING, read BEFORE either control is
    // issued: one of them rules on this very row, so a read taken
    // afterwards would answer the control's own approval and the
    // case would fail naming the wrong subject.
    const after = storedProposal(
      await store.findProposalById(OTHERS_PROPOSAL),
      OTHERS_PROPOSAL,
    );
    const feedAfter = await storedConfig(store, feedId);
    // EVERY LOOKUP BEFORE THE ONE UNDER TEST RESOLVES, asserted in
    // the case rather than assumed: without it a fixture that had
    // planted no feed would refuse this request one rule earlier
    // and satisfy every count below for the wrong reason.
    const addressed = await request(app).get(pendingPath(feedId));
    // The first control, through the SAME operation and varied
    // along this row's own axis: a proposal that IS this feed's. A
    // gate refusing every ruling passes the refusal and fails
    // this.
    const taken = await request(app)
      .post(approvePath(feedId))
      .send({ proposalId: OPEN_PROPOSAL });
    // The second, and the one only two feeds can supply: the SAME
    // proposal ruled on under the feed it WAS raised for. It
    // lands, which is what makes this a reading about `source_id`
    // rather than about a gate refusing a row it has already seen
    // refused.
    const elsewhere = await request(app)
      .post(approvePath(itemsId))
      .send({ proposalId: OTHERS_PROPOSAL });

    expect(refused.status).toBe(404);
    // The whole body rather than the status, which is where the
    // refusal says WHICH sentence it answered: this one is shared
    // by the row nothing carries, the row raised for somebody else
    // and the row having gone in between, because a caller is not
    // entitled to learn that a proposal it does not own exists.
    // `details` is asserted ABSENT rather than empty — an empty
    // list is a shape a client can branch on.
    expect(refused.body).toStrictEqual(NO_SUCH_PROPOSAL_BODY);
    expect(keysOf(refused.body)).toStrictEqual(['code', 'message']);
    expect(keysOf(refused.body)).not.toContain('details');
    // The submitted id is not quoted back, counted rather than
    // asserted absent and held against a known positive taken by
    // the same function in the same case: the one document a
    // caller could read it off is the one it sent.
    const submitted = String(OTHERS_PROPOSAL);

    expect(countOccurrences(refused.text, submitted)).toBe(0);
    expect(countOccurrences(
      JSON.stringify({ proposalId: OTHERS_PROPOSAL }),
      submitted,
    )).toBe(1);
    // The row is exactly as it was planted, and it still names the
    // feed it was raised for — which is what separates a gate that
    // refused from one that ruled and then reported a 404.
    expect(after.status).toBe(PENDING);
    expect(after.approvedAt).toBeNull();
    expect(after.appliedAt).toBeNull();
    expect(after.sourceId).toBe(itemsId);
    // And the ADDRESSED feed was not written either, which is the
    // half that matters: a gate that applied before it compared
    // would have put another feed's arrangement onto this one.
    expect(feedAfter).toStrictEqual({
      parserConfig: UNWRITTEN_CONFIG,
      contract: UNWRITTEN_CONFIG,
    });
    // The address resolves and the ruling this caller IS entitled
    // to give lands, so the refusal above is about the row rather
    // than about the address or about the gate.
    expect(addressed.status).toBe(200);
    expect(addressed.body.data).toHaveLength(QUEUE_SIZE);
    expect(taken.status).toBe(200);
    expect((taken.body.data as WireRuling).id).toBe(OPEN_PROPOSAL);
    // The same row, the other parent, accepted.
    expect(elsewhere.status).toBe(200);
    expect((elsewhere.body.data as WireRuling).id).toBe(OTHERS_PROPOSAL);
    expect((elsewhere.body.data as WireRuling).status).toBe(APPROVED);
  });
});

// ---------------------------------------------------------------------------
// The gate: a proposal whose arrangement is already on the feed
// ---------------------------------------------------------------------------

describe('a proposal already applied', () => {
  it('answers 409 and leaves the feed as it was', async () => {
    const { store, feedId } = await plantGate();
    const app = buildProposalsApp(store);

    const refused = await request(app)
      .post(approvePath(feedId))
      .send({ proposalId: APPLIED_PROPOSAL });
    // THE REFUSAL WROTE NOTHING, read before either control: the
    // two stamps are exactly the instants the fixture planted, so
    // a gate that had re-ruled and then reported a 409 is
    // reported here rather than passing.
    const after = storedProposal(
      await store.findProposalById(APPLIED_PROPOSAL),
      APPLIED_PROPOSAL,
    );
    const feedAfter = await storedConfig(store, feedId);
    // THE CONTROL, AND THE WHOLE REASON THIS REFUSAL IS ABOUT
    // `applied_at`: a proposal a person has ALREADY RULED IN
    // FAVOUR OF and which nothing has applied. It is applied here
    // rather than turned away — the state `scripts/approve.ts`
    // leaves behind when an operator rules from a terminal, that
    // function writing the one stamp and not the other. Without
    // this row the case is equally green against a gate refusing
    // every proposal anybody has ruled on, which is a different
    // rule and the wrong one.
    const agreed = await request(app)
      .post(approvePath(feedId))
      .send({ proposalId: AGREED_PROPOSAL });

    expect(refused.status).toBe(409);
    // The whole body rather than the status. `CONFLICT` with the
    // rule's own sentence and NO `details` key at all rather than
    // an empty one: what the feed holds now is a fact about a row
    // the caller was refused a ruling over and which may have been
    // edited since.
    expect(refused.body).toStrictEqual(ALREADY_APPLIED_BODY);
    expect(keysOf(refused.body)).toStrictEqual(['code', 'message']);
    expect(keysOf(refused.body)).not.toContain('details');
    // A DIFFERENT SENTENCE FROM THE `404`'S, asserted here rather
    // than assumed: one refusal about a row a caller may not rule
    // on and one about a row nobody may rule on twice are two
    // answers, and a gate answering one sentence to both would
    // pass every status assertion in this file.
    expect(ALREADY_APPLIED_BODY.message)
      .not.toBe(NO_SUCH_PROPOSAL_BODY.message);
    expect(refused.body.code).not.toBe(NO_SUCH_PROPOSAL_BODY.code);
    // Neither stamp moved, which is what `coalesce` on each of
    // them would have made invisible had the write run at all: a
    // second application that re-dated the first would leave these
    // two instants unchanged only if it never happened.
    expect(after.approvedAt?.toISOString()).toBe(AGREED_AT);
    expect(after.appliedAt?.toISOString()).toBe(WRITTEN_AT);
    expect(after.status).toBe(DONE);
    // And the feed still holds what it was inserted with, so the
    // two documents were not written a second time.
    expect(feedAfter).toStrictEqual({
      parserConfig: UNWRITTEN_CONFIG,
      contract: UNWRITTEN_CONFIG,
    });
    // The approved-but-unapplied proposal lands, answering the
    // four-member ruling with the FIRST approval's instant kept
    // and a closing stamp written beside it. That instant is what
    // says the ruling was idempotent on the stamp a person made
    // rather than re-dated by this request.
    expect(agreed.status).toBe(200);
    const ruled = agreed.body.data as WireRuling;

    expect(keysOf(ruled)).toStrictEqual(RULING_KEY_SET);
    expect(ruled.id).toBe(AGREED_PROPOSAL);
    expect(ruled.approvedAt).toBe(AGREED_AT);
    expect(ruled.closedAt).not.toBeNull();
    expect(ruled.closedAt).not.toBe(WRITTEN_AT);
  });
});

// ---------------------------------------------------------------------------
// The body: a key this write does not declare
// ---------------------------------------------------------------------------

describe('a body carrying a key this write does not declare', () => {
  it('answers 422 naming the body rather than the key', async () => {
    const { store, feedId } = await plantGate();
    const app = buildProposalsApp(store);
    const approve = approvePath(feedId);

    const undeclared = await request(app)
      .post(approve)
      .send({
        proposalId: OPEN_PROPOSAL,
        [UNDECLARED_KEY]: UNDECLARED_KEY_VALUE,
      });
    // THE KEY THIS ROUTER'S STRICTNESS EXISTS FOR. A body able to
    // carry a `parserConfig` would be a way to write
    // `sources.parser_config` through the gate without ever having
    // proposed it, so it is refused as undeclared rather than
    // dropped — a dropped one would be indistinguishable, on the
    // wire, from the service having honoured it.
    const smuggled = await request(app)
      .post(approve)
      .send({
        proposalId: OPEN_PROPOSAL,
        [PARSER_CONFIG_KEY]: { ...PROPOSED_PARSER },
      });
    // NEITHER REFUSAL WROTE, read before the control: the proposal
    // is still open and the feed still holds what it was inserted
    // with, so the strict parse ran before anything was read or
    // rewritten.
    const after = storedProposal(
      await store.findProposalById(OPEN_PROPOSAL),
      OPEN_PROPOSAL,
    );
    const feedAfter = await storedConfig(store, feedId);
    // The control, the identical request with the undeclared key
    // removed: the pair says the refusal is about the KEY rather
    // than about a route refusing every body it is handed, and the
    // remaining member is legal on its own.
    const declared = await request(app)
      .post(approve)
      .send({ proposalId: OPEN_PROPOSAL });

    expect(undeclared.status).toBe(422);
    expect(smuggled.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_BODY);
    expect(smuggled.body).toStrictEqual(UNDECLARED_BODY);
    // ONE detail naming `body` and not the key, and `body` rather
    // than `query`: an `unrecognized_keys` issue names the
    // CONTAINER, because the key itself is something the request
    // said, and the two parsers differ only in that name.
    expect(undeclared.body.details).toHaveLength(1);
    expect(undeclared.body.details[0].field).toBe('body');
    expect(undeclared.body.details[0].field).not.toBe(UNDECLARED_KEY);
    expect(undeclared.body.details[0].field).not.toBe('query');
    // NEITHER THE KEY NOR ITS VALUE COMES BACK, counted rather
    // than asserted absent and held against a planted envelope
    // carrying both, counted by the same function in the same
    // case. The smuggled config is counted on the same terms: it
    // is text this request SUBMITTED as well as text the fixture
    // stored, so a refusal echoing it would leak both ways at
    // once.
    const bodies = [undeclared.text, smuggled.text].join('');
    const planted = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: `Unrecognized key: "${UNDECLARED_KEY}"`,
      details: [{ field: UNDECLARED_KEY_VALUE }],
    });

    expect([
      countOccurrences(bodies, UNDECLARED_KEY),
      countOccurrences(bodies, UNDECLARED_KEY_VALUE),
    ]).toStrictEqual([0, 0]);
    expect([
      countOccurrences(planted, UNDECLARED_KEY),
      countOccurrences(planted, UNDECLARED_KEY_VALUE),
    ]).toStrictEqual([1, 1]);
    expect(needleCounts(bodies, PARSER_NEEDLES))
      .toStrictEqual(everyNeedle(PARSER_NEEDLES, 0));
    // The proposal is still waiting and the feed is unwritten.
    expect(after.status).toBe(PENDING);
    expect(after.approvedAt).toBeNull();
    expect(after.appliedAt).toBeNull();
    expect(feedAfter).toStrictEqual({
      parserConfig: UNWRITTEN_CONFIG,
      contract: UNWRITTEN_CONFIG,
    });
    // And the control lands, answering this route's own shape —
    // with the feed now carrying the arrangement that proposal
    // proposed, which is what makes the two unwritten readings
    // above discriminating. A store that never wrote those two
    // columns at all would satisfy both of them.
    const feedRuled = await storedConfig(store, feedId);

    expect(declared.status).toBe(200);
    expect(keysOf(declared.body.data)).toStrictEqual(RULING_KEY_SET);
    expect((declared.body.data as WireRuling).status).toBe(APPROVED);
    expect(feedRuled).toStrictEqual({
      parserConfig: PROPOSED_PARSER,
      contract: PROPOSED_CONTRACT,
    });
  });
});

// ---------------------------------------------------------------------------
// Containment: what an answer carries of a config nobody asked for
// ---------------------------------------------------------------------------

describe('what an answer carries of a stored arrangement', () => {
  it('quotes no part of a config a caller did not ask for', async () => {
    const { store, feedId } = await plantGate();
    const app = buildProposalsApp(store);
    const approve = approvePath(feedId);

    // THE FOUR ANSWERS THAT ARE NOT THE ADDRESSED FEED'S QUEUE.
    // Every one of them is reached through a row the fixture
    // planted carrying all five sentinels, so each had something
    // to leak: the ruling reads the row it stamps, the `404` and
    // the `409` each read a row before refusing on it, and the
    // `422` is refused over a request naming one.
    const refused404 = await request(app)
      .post(approve)
      .send({ proposalId: OTHERS_PROPOSAL });
    const refused409 = await request(app)
      .post(approve)
      .send({ proposalId: APPLIED_PROPOSAL });
    const refused422 = await request(app)
      .post(approve)
      .send({
        proposalId: OPEN_PROPOSAL,
        [UNDECLARED_KEY]: UNDECLARED_KEY_VALUE,
      });
    const ruling = await request(app)
      .post(approve)
      .send({ proposalId: OPEN_PROPOSAL });
    // THE POSITIVE CONTROL, taken by the same function in the same
    // case over an answer from the same router: the one place a
    // caller IS entitled to read a proposed arrangement, which is
    // the backlog of the feed it addressed. A search that could
    // only ever come back empty reports a contained answer and a
    // leaking one alike, and this is what says it could not.
    const queue = await request(app).get(pendingPath(feedId));

    expect(refused404.status).toBe(404);
    expect(refused409.status).toBe(409);
    expect(refused422.status).toBe(422);
    expect(ruling.status).toBe(200);
    expect(queue.status).toBe(200);
    // The answers were built at all: a response that never arrived
    // would satisfy every zero below.
    const answers = [
      { name: 'no-such-proposal', text: refused404.text },
      { name: 'already-applied', text: refused409.text },
      { name: 'undeclared-key', text: refused422.text },
      { name: 'ruling', text: ruling.text },
    ];

    for (const answer of answers) {
      expect({ name: answer.name, empty: answer.text.length === 0 })
        .toStrictEqual({ name: answer.name, empty: false });
    }
    // NOT ONE OF THE FIVE TRAVELS, per answer and per needle
    // rather than as one total, so a failure names WHICH sentinel
    // reached WHICH answer. Counted over the SERIALISED text and
    // not the parsed body, because that is what a client, a log or
    // a proxy receives.
    for (const answer of answers) {
      expect({
        name: answer.name,
        found: needleCounts(answer.text, STORED_NEEDLES),
      }).toStrictEqual({
        name: answer.name,
        found: everyNeedle(STORED_NEEDLES, 0),
      });
    }
    // THE RULING IS THE SHARPEST OF THE FOUR, because it is the
    // one answer built FROM the row that carries the sentinels:
    // the four-member projection reaches the wire and neither
    // proposed document rides along with it. A handler answering
    // the stamped row rather than the projection would pass every
    // status assertion in this file and fail here.
    expect(keysOf(ruling.body.data)).toStrictEqual(RULING_KEY_SET);
    expect(needleCounts(JSON.stringify(ruling.body), STORED_NEEDLES))
      .toStrictEqual(everyNeedle(STORED_NEEDLES, 0));
    // And the three that are part of the proposed `parser_config`
    // itself, which is what this row is scoped to, read once more
    // across all four answers joined — a needle split across two
    // responses would still be counted here.
    const joined = answers.map((answer) => answer.text).join('');

    expect(needleCounts(joined, PARSER_NEEDLES))
      .toStrictEqual(everyNeedle(PARSER_NEEDLES, 0));
    // THE CONTROL. Every needle IS in the queue this caller asked
    // for, counted by the same function over the same kind of
    // text, and the config sentinels appear more than once — the
    // backlog holds three rows and each proposes the same
    // arrangement.
    const counted = needleCounts(queue.text, STORED_NEEDLES);
    const present = counted.map((entry) => ({
      needle: entry.needle,
      seen: entry.occurrences > 0,
    }));

    expect(present).toStrictEqual(
      STORED_NEEDLES.map((needle) => ({ needle, seen: true })),
    );
    expect(countOccurrences(queue.text, SENTINEL_SELECTOR))
      .toBeGreaterThan(1);
  });
});
