/**
 * `src/entities/routes.ts` — what the four routes answer,
 * refusing and landing: the statuses, the envelopes, the members a
 * row reaches the wire with, and the key half no caller can
 * submit. Driven over supertest against a router built by the real
 * factory, standing on `tests/helpers/memory-research-store.ts`,
 * so every claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `./service.test.ts` is the translation
 * and only the translation. Which names reduce to which keys, that
 * a self-alias and a cross-registry alias are each refused, that a
 * closed intention ratifies without complaint and that a second
 * ruling keeps the first one's instant are claims about the RULES,
 * and are pinned one file over, over direct calls with no server.
 * What no call can report is whether a rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, the members that envelope carried, and what the
 * SERIALISED response says — which is where the ruling projection
 * matters most, four members out of a nine-column row being
 * something a body carries rather than something a function
 * returned.
 *
 * NINE CASES IN NINE GROUPS. Two guard the fixture and the shapes
 * every answer is compared to, one is the subject read whole, one
 * is the rename and the key it computed, one is the research page
 * and the `meta` beside it, one is the ruling projection, one is
 * the intention raised about another subject, one is the rename
 * onto a key already held, and one is the undeclared key — that
 * last one over BOTH writes in a single case, because the two
 * schemas are separate declarations answering one body and only a
 * case sending to both can say so.
 *
 * TWO REGISTRIES, AND THE SECOND EARNS ITS PLACE TWICE.
 * `entities_domain_id_name_norm_unique` is per DOMAIN, so one
 * subject on each side reduces to the same key and neither is in
 * conflict with the other — which makes every read below a scoping
 * reading, and gives the `409` a control that LANDS over the same
 * name in the other registry. A fixture with one domain could not
 * tell that constraint from a store refusing a name wherever it
 * appears, and the mutation grid below measures exactly that: the
 * leg dropping the per-domain scope reddens the collision case and
 * nothing else.
 *
 * THE PATCH IS AIMED AWAY FROM THE SUBJECT EVERY OTHER CASE READS.
 * Two of these four routes WRITE, so a fresh app and a fresh store
 * are built per case and the rename lands on a second subject:
 * without both, one case would be reading a registry another had
 * already rewritten.
 *
 * THE ANSWERS ARE HELD AGAINST THE STORE'S OWN READS rather than
 * member by member, on all three write-adjacent cases. `nameNorm`
 * on a rename and `approvedAt` on a ruling are the two members no
 * request carried, so a response rebuilt around the parsed body
 * would satisfy any comparison whose every member came from the
 * body — and the grid confirms it: answering the READ row rather
 * than the write's own reddens two cases, and answering the
 * request beside the ruling reddens two more.
 *
 * THE RESEARCH PAGE IS PLANTED SO NO ORDER CAN AGREE BY ACCIDENT.
 * Three passes go in oldest-then-newest-then-middle, and the
 * newest carries the LOWEST id, so the answered order is neither
 * the plant order, nor its reverse, nor either direction of the
 * id. The fixture guard computes all four wrong answers rather
 * than naming them.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and
 * what a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s. The alias rules, the empty
 * key, the idempotent second ruling, the closed row that ratifies
 * anyway and the empty patch that is a legal `200` are
 * `./service.test.ts`'s, taken over direct calls. That
 * `EntityStore` writes no `entity_research` is
 * `tests/invariants/api-read-first.test.ts`'s, derived from
 * `keyof` for the whole wave at once.
 *
 * MUTATION GRID, taken by mutating one file one edit at a time and
 * reading the failed `fullName` SET off a `--reporter=json` run
 * rather than a count. EIGHTEEN runtime legs and FOUR that only
 * `check-types` can report: six mutate `./routes.ts`, six
 * `./service.ts`, five `tests/helpers/memory-research-store.ts`,
 * and one of the type legs mutates `src/approvals/ruling.ts` while
 * the other three mutate this file.
 *
 * THE WHOLE GRID WAS RUN TWICE and the per-leg sets diffed between
 * the two runs of one tree. Every leg's set was identical member
 * for member across both runs, so no figure below is a capture.
 *
 * THE WHOLE-HALF CONTROLS FIRST, since their SURVIVORS are the
 * coverage statement rather than their counts. Planting no entity
 * at all reddens 8 of 9 and the one survivor is the shapes case,
 * which reads the router's own stack and the key rosters and needs
 * no row to do it. Planting no intention reddens 4 — the two
 * approval cases, the undeclared-key case whose controls rule, and
 * the fixture guard — and planting no research reddens 2, the page
 * and the guard. Each survivor set is explainable as `needs no row
 * of this half`, which is what says no case is asserting something
 * it does not mean.
 *
 * THE STATUS AND THE ENVELOPE. `res.status(201)` on the subject
 * get reddens 4, every case that reads a subject back, which is
 * what makes it the bluntest leg here rather than a reading.
 * Dropping `ok()` from the patch reddens 3 — the rename, the
 * collision case whose control renames, and the undeclared-key
 * case whose control does — told apart from the status leg by
 * which assertion fails inside each.
 *
 * THE PAGE, TWO LEGS ON ONE CASE. `total: page.rows.length` in
 * place of `total: page.total` and a fixed store window in place
 * of `toStoreWindow(query)` each redden 1 and it is the same 1,
 * that being the only read in this file taking a window narrower
 * than its collection. Reversing the in-memory research ordering
 * reddens the same case again, from the store's side.
 *
 * THE ROW COMES FROM THE WRITE. Answering the row the LOOKUP read
 * rather than the one `updateEntity` returned reddens 2, the
 * rename and the collision case; leaving the reduction out so the
 * key half is the display half reddens the same 2. They are told
 * apart by the assertion that fails inside each, which is what
 * holding the answer against the store's own read buys over a
 * member-by-member compare.
 *
 * THE RULING. Spreading the request over the projection reddens 2,
 * the ruling and the undeclared-key case whose control rules. Not
 * translating the store's unique refusal into a `ConflictError`
 * reddens 1, the collision case, as does dropping the per-domain
 * scope from the in-memory unique key — the route's half and the
 * store's half of one constraint, told apart by which file the
 * edit is in. Never comparing the intention's parent against the
 * addressed subject reddens 1, the `404`.
 *
 * THE TWO STRICT SCHEMAS. Dropping `.strict()` from
 * `patchEntitySchema` reddens 1 and dropping it from
 * `approveResearchSchema` reddens the same 1, which is the whole
 * reason both routes are driven in ONE case: two independent
 * declarations answering one body, where two cases would each have
 * measured half of it.
 *
 * THE STRUCTURE. Registering a SECOND `get` on `/entities/:id`
 * reddens exactly 1, the shapes case, because no request in the
 * file changes its answer and only a reading off the `stack` can
 * see the extra handler at all.
 *
 * AND FOUR LEGS NO RUN CAN REPORT, each taken off `bun x tsc
 * --noEmit` against a base at exit 0 with no diagnostics. Dropping
 * `nameNorm` from {@link ENTITY_KEYS}, `closedAt` from
 * {@link RULING_KEYS} and `approvePoolRow` from
 * {@link SERVICE_METHODS} are each ONE error, all three at
 * {@link EVERY_KEY_LISTED} — which is what an intersection of nine
 * `CoversEveryKey` answers buys over nine separate initializers.
 * And a member ADDED to the `Ruling` projection is three errors of
 * which one is here, the other two being that vocabulary's own
 * suite and its describing function reporting themselves.
 *
 * AND ONE HONEST ZERO, measured rather than assumed. Spreading
 * the raw request body over the ANSWERED row on the patch route
 * reddens NOTHING, and it is the language rather than the module
 * reporting: every member any request in this file submits is one
 * the write stores unchanged, so that spread is byte-equivalent to
 * the answer it replaces. What would report is a port keeping the
 * arguments it was handed, which `src/findings/routes.test.ts` has
 * and this file does not — the leg above that DOES report the
 * answer-versus-the-write rule is the service-side one, discarding
 * the write and answering the row the lookup read.
 */
import type { EntitiesServiceStore } from './service.js';
import type {
  EntityRecord,
  EntityResearchRecord,
  ResearchPoolRecord,
} from './store.js';
import type {
  MemoryDomainEntity,
  MemoryEntityResearch,
  MemoryResearchPoolRow,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { Ruling } from '../approvals/ruling.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { Application, Router } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { normalizeEntityName } from '../lib/entity-name-norm.js';

import { buildEntitiesRouter } from './routes.js';
import {
  approveResearchSchema,
  patchEntitySchema,
} from './service.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('entities-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the registry most cases read. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, holding a registry of its own.
 *
 * NOT DECORATION HERE, because the unique key is PER DOMAIN: one
 * of its subjects reduces to the key the collision case renames
 * onto, so the `409` below has a control that lands over the same
 * name in the other registry. A fixture with one domain could not
 * tell that rule from a store refusing the name outright.
 */
const SIBLING = 'example-newsroom';

/**
 * The subject every read and every approval is addressed to.
 *
 * SEVEN DIGITS, like every id in this file, so that a containment
 * count over a rendered `cause` — which carries a stack, and a
 * stack carries line and column numbers — cannot match one by
 * accident.
 */
const KUBE = 4101733;

/**
 * A second subject of {@link RADAR}, and the one the patch case
 * rewrites.
 *
 * The patch is aimed away from {@link KUBE} deliberately: every
 * other case here reads that row, so a rename landing on it would
 * make this file's cases depend on the order they run in.
 */
const MESH = 4102744;

/**
 * A third subject of {@link RADAR}, holding the key the collision
 * case renames onto.
 *
 * Planted under a SENTINEL spelling rather than a readable one, so
 * the containment counts over that refusal are taken on a string
 * no constraint name, module path or stack frame could contain.
 */
const TAKEN = 4103755;

/**
 * A subject of {@link SIBLING} reducing to {@link KUBE}'s key.
 *
 * What says the registry read is scoped: it carries the same key
 * as a subject of the other domain and no page or lookup here
 * answers it.
 */
const ELSEWHERE = 4201766;

/**
 * A second subject of {@link SIBLING}, and the collision case's
 * cross-registry control.
 *
 * Renaming it onto {@link TAKEN_NAME} LANDS, because the key it
 * would take is held in the other domain: that is one request
 * separating `entities_domain_id_name_norm_unique` from a store
 * refusing a name wherever it appears.
 */
const DESK = 4202777;

/** An id no entity carries, in either registry. */
const MISSING_ENTITY = 8888999;

/** The display half {@link TAKEN} is planted under. */
const TAKEN_NAME = 'ZZ Sentinel Subject';

/**
 * The key half it is planted under, computed rather than written
 * out.
 *
 * Through the module the rename itself goes through, so a fixture
 * and a service cannot disagree about the reduction while the
 * collision case goes on passing — which is the drift
 * `normalizeEntityName` exists to make impossible.
 */
const TAKEN_KEY = normalizeEntityName(TAKEN_NAME);

/**
 * A name whose key is free in both registries.
 *
 * The rename every control that has to SUCCEED uses, so a control
 * can never pass or fail for the collision rule's reasons.
 */
const FREE_NAME = 'Kubernetes Fleet';

/**
 * The key {@link FREE_NAME} reduces to, through the same module.
 *
 * The member the patch case reads BACK and no request ever sends:
 * a response rebuilt around the parsed body could not carry it.
 */
const FREE_KEY = normalizeEntityName(FREE_NAME);

/** The intention every approval case rules on: open, and KUBE's. */
const OPEN_INTENTION = 6001822;

/**
 * A second open intention of the same subject.
 *
 * The approval case's control that nothing else moved: one ruling
 * stamps one row, and this is the row it must have left alone.
 */
const SECOND_INTENTION = 6002833;

/**
 * An intention raised about {@link MESH} rather than
 * {@link KUBE}.
 *
 * The `404` case's whole subject: a well-formed address carrying
 * an intention somebody else raised is refused rather than ruled
 * on, and the sentence a caller reads says nothing about whose it
 * is.
 */
const OTHERS_INTENTION = 6003844;

/** When every planted intention was raised. */
const QUEUED_AT = '2026-02-01T00:00:00.000Z';

/** The status every planted intention is queued under. */
const PENDING = 'pending';

/** Where a ruled intention stands afterwards. */
const APPROVED = 'approved';

/** The terms every planted intention would be searched under. */
const INTENDED_TERMS: readonly string[] = ['kubernetes releases'];

/** A key neither write schema declares, submitted as one. */
const UNDECLARED_KEY = 'zzsentinelkeyzz';

/** What that key is submitted with, on the same terms. */
const UNDECLARED_KEY_VALUE = 'zzsentinelbodyvaluezz';

/**
 * The computed member a caller might plausibly try to submit.
 *
 * The one key `patchEntitySchema`'s strictness is load-bearing
 * for: the key half of a name is COMPUTED from the display half,
 * so a submitted one would be a second reduction competing with
 * the single definition. Refused as an undeclared key rather than
 * dropped, which on the wire would be indistinguishable from the
 * service having honoured it.
 */
const NAME_NORM_KEY = 'nameNorm';

/** The pass recorded first, and the OLDEST of the three. */
const FIRST_ID = 7001811;

/** The pass recorded second, and the one holding the HIGHEST id. */
const SECOND_ID = 7002833;

/**
 * The newest pass, and the one holding the LOWEST id.
 *
 * THE ARRANGEMENT IS THE POINT. Newest first answers
 * `[THIRD_ID, SECOND_ID, FIRST_ID]`, which is none of the orders a
 * page could reach by accident: not the planted order, not its
 * reverse, and neither direction of the id. All four are asserted
 * UNEQUAL by the fixture guard, so a three-row page cannot agree
 * with the expectation for a reason the fixture handed it.
 */
const THIRD_ID = 7000800;

/** When the first planted pass was recorded. */
const FIRST_PASS = '2026-03-01T00:00:00.000Z';

/** When the second was. */
const SECOND_PASS = '2026-03-02T00:00:00.000Z';

/** When the third was, which is the NEWEST of the three. */
const THIRD_PASS = '2026-03-03T00:00:00.000Z';

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the research page, which asserts `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * having been a default.
 */
const DEFAULT_PER_PAGE = 50;

/** The path TEMPLATE the two subject routes register. */
const ENTITY_TEMPLATE = '/entities/:id';

/** The path TEMPLATE the research collection registers. */
const RESEARCH_TEMPLATE = '/entities/:id/research';

/** The path TEMPLATE the gate registers. */
const APPROVE_TEMPLATE = '/entities/:id/approve-research';

/**
 * Builds one row for `setDomainEntities`.
 *
 * @param id - The subject's id, which every route here addresses.
 * @param name - The display half.
 * @param nameNorm - The key half, planted rather than computed:
 *   nothing under the port reduces a name, and the seam standing
 *   in for a writer is what keeps `normalizeEntityName` the single
 *   definition.
 * @returns The row to plant, aliasing nothing and carrying no
 *   attributes — the two states every case here starts from.
 */
function registered(
  id: number,
  name: string,
  nameNorm: string,
): MemoryDomainEntity {
  return { id, name, nameNorm, aliasOf: null, attributes: {} };
}

/** The subjects {@link RADAR}'s registry holds. */
const RADAR_ENTITIES: readonly MemoryDomainEntity[] = [
  registered(KUBE, 'Kubernetes', 'kubernetes'),
  registered(MESH, 'Service Mesh', 'service mesh'),
  registered(TAKEN, TAKEN_NAME, TAKEN_KEY),
];

/** The subjects {@link SIBLING}'s registry holds. */
const SIBLING_ENTITIES: readonly MemoryDomainEntity[] = [
  registered(ELSEWHERE, 'Kubernetes', 'kubernetes'),
  registered(DESK, 'Newsdesk', 'newsdesk'),
];

/** The ids {@link SIBLING} holds, which no read here may answer. */
const SIBLING_IDS: readonly number[] = SIBLING_ENTITIES.map(
  (row) => row.id,
);

/**
 * What has been found out about {@link KUBE}, PLANTED
 * OLDEST-FIRST-THEN-NEWEST.
 *
 * The plant order is deliberately neither the order a page comes
 * back in nor its reverse, which is what makes the ordering
 * assertion a reading at all: a store answering rows in insertion
 * order and one answering them backwards each produce a different
 * list from the one right answer, and the fixture guard computes
 * all four wrong answers rather than naming them.
 *
 * They differ along every axis a case here reads. Two name the run
 * that recorded them and one names none, one wrote a summary and
 * one did not, and their three stamps are distinct while their ids
 * DISAGREE with those stamps — the newest pass carries the lowest
 * id, so a page ordered by the id alone cannot reproduce the
 * answer.
 */
const KUBE_RESEARCH: readonly MemoryEntityResearch[] = [
  {
    id: FIRST_ID,
    runId: 5100822,
    summary: 'A first pass',
    payload: { depth: 1 },
    researchedAt: new Date(FIRST_PASS),
  },
  {
    id: THIRD_ID,
    runId: 5100822,
    summary: 'A third pass',
    payload: { depth: 3 },
    researchedAt: new Date(THIRD_PASS),
  },
  {
    id: SECOND_ID,
    runId: null,
    summary: null,
    payload: { depth: 2 },
    researchedAt: new Date(SECOND_PASS),
  },
];

/** How many passes {@link KUBE} holds. */
const RESEARCH_COUNT = KUBE_RESEARCH.length;

/** Their ids in the order they were planted. */
const PLANT_ORDER: readonly number[] = KUBE_RESEARCH.map(
  (row) => row.id,
);

/**
 * The order a page answers them in: `researchedAt` descending.
 *
 * Written out rather than derived, on the terms
 * `src/findings/routes.test.ts` states for its own page: the sort
 * is the port's rule and the in-memory implementation's own suite
 * is where the two keys are held apart, so what this file claims
 * is only that whatever the port answered reached the wire in that
 * order.
 */
const RESEARCH_ORDER: readonly number[] = [
  THIRD_ID,
  SECOND_ID,
  FIRST_ID,
];

/**
 * Builds one open intention for `setDomainPool`.
 *
 * @param id - The row's own id, which an approval names.
 * @param entityId - The subject it is about.
 * @returns The row to plant: pending, unapproved and unclosed,
 *   which is the state every intention starts in and the one a
 *   ruling has somewhere to move it from.
 */
function queued(id: number, entityId: number): MemoryResearchPoolRow {
  return {
    id,
    entityId,
    findingId: null,
    status: PENDING,
    searchTerms: INTENDED_TERMS,
    createdAt: new Date(QUEUED_AT),
    approvedAt: null,
    researchedAt: null,
  };
}

/**
 * The intentions queued under {@link RADAR}.
 *
 * THREE ROWS FOR THREE READINGS: the one the approval rules on,
 * the one it must leave alone, and the one raised about another
 * subject that the `404` is taken over. All three are open, so a
 * gate that had started refusing closed rows would be answering
 * about a state none of them is in.
 */
const RADAR_POOL: readonly MemoryResearchPoolRow[] = [
  queued(OPEN_INTENTION, KUBE),
  queued(SECOND_INTENTION, KUBE),
  queued(OTHERS_INTENTION, MESH),
];

/** The ids {@link RADAR}'s queue holds. */
const POOL_IDS: readonly number[] = RADAR_POOL.map((row) => row.id);

/**
 * One answered subject, as the WIRE has it.
 *
 * `EntityRecord` re-declared rather than imported, and here every
 * member survives the crossing unchanged: `entities` carries no
 * timestamp column at all, so this is the one answered shape on
 * this surface with no `Date` to become a string. It is declared
 * anyway, and held to the same roster the port's record is, so a
 * member renamed on either side is a refusal at
 * {@link EVERY_KEY_LISTED} rather than a member no case looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter
 * that `check-types` refuses.
 */
interface WireEntity {
  /** `entities.id`, and the segment every route addresses. */
  readonly id: number;

  /** The registry the subject sits in. */
  readonly domainId: number;

  /** The subject's name as a person reads it. */
  readonly name: string;

  /** The same name reduced to the key the registry matches on. */
  readonly nameNorm: string;

  /** The subject this row turned out to be, or null. */
  readonly aliasOf: number | null;

  /** Whatever the domain records about it beyond its name. */
  readonly attributes: unknown;
}

/**
 * One answered research pass, as the WIRE has it.
 *
 * `EntityResearchRecord` WITH ONE MEMBER RETYPED: `researchedAt`
 * is a `Date` across the port and arrives here as an ISO-8601
 * string, because `res.json` serialises through `Date#toJSON`.
 */
interface WireResearch {
  /** `entity_research.id`, and the tiebreak on the page's order. */
  readonly id: number;

  /** The pass that recorded it, or null when none is named. */
  readonly runId: number | null;

  /** What it came to in prose, or null when nothing was written. */
  readonly summary: string | null;

  /** The structured findings of the pass, answered whole. */
  readonly payload: unknown;

  /** When the research was recorded, as JSON carries it. */
  readonly researchedAt: string;
}

/**
 * One answered ruling, as the WIRE has it.
 *
 * `Ruling` WITH BOTH STAMPS RETYPED, on the terms
 * {@link WireResearch} states for its one.
 */
interface WireRuling {
  /** The `research_pool` row that was ruled on. */
  readonly id: number;

  /** Where it stands afterwards, as stored. */
  readonly status: string;

  /** When a person agreed, as JSON carries it, or null. */
  readonly approvedAt: string | null;

  /** When the intention was closed, or null while it is open. */
  readonly closedAt: string | null;
}

/**
 * One path a router registered, with the verbs on it.
 *
 * Read off the router's own stack by {@link routesOf}, never
 * written out: a list of paths spelled here would agree with
 * itself whatever the router did.
 */
interface RegisteredRoute {
  /** The express path TEMPLATE, as the router declared it. */
  readonly path: string;

  /** Every verb registered on it, lowercased and sorted. */
  readonly verbs: readonly string[];
}

/** The two registries, the research and the queue behind them. */
interface PlantedRegistries {
  /** The store every case below is driven against. */
  readonly store: MemoryResearchStore;

  /** {@link RADAR}'s own id, which every answered row carries. */
  readonly radarId: number;

  /** {@link SIBLING}'s, which no answered row here may carry. */
  readonly siblingId: number;
}

/**
 * The members an answered subject carries.
 *
 * Written out because an interface has no runtime form to read
 * keys off, and pinned in BOTH directions: `satisfies` refuses a
 * name the port's record does not declare, and
 * {@link EVERY_KEY_LISTED} refuses a member added to it and not to
 * this list.
 */
const ENTITY_KEYS = [
  'aliasOf',
  'attributes',
  'domainId',
  'id',
  'name',
  'nameNorm',
] as const satisfies readonly (keyof EntityRecord)[];

/** The members an answered research pass carries. */
const RESEARCH_KEYS = [
  'id',
  'payload',
  'researchedAt',
  'runId',
  'summary',
] as const satisfies readonly (keyof EntityResearchRecord)[];

/**
 * The four members a ruling is projected onto.
 *
 * `src/approvals/ruling.ts` is where the vocabulary is argued; what
 * this roster claims is that all four of it reach the wire, which
 * is the half no direct call can report.
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
 * Every method the router's own store type declares.
 *
 * SIX OF THE PORT'S EIGHT, and the two that are absent are a
 * statement rather than a narrowing dressed up as one:
 * `listEntityPool` and `countEntityPool` page a queue no route on
 * this wave serves. The shapes case holds this roster against the
 * two writers by name, so a third writer arriving on the `Pick` is
 * a red there rather than a method no case looks at.
 */
const SERVICE_METHODS = [
  'approvePoolRow',
  'countEntityResearch',
  'findEntityById',
  'findPoolRowById',
  'listEntityResearch',
  'updateEntity',
] as const satisfies readonly (keyof EntitiesServiceStore)[];

/**
 * The two of those six that WRITE.
 *
 * `updateEntity` rewrites the supplied members of one `entities`
 * row and `approvePoolRow` stamps two columns of one
 * `research_pool` row. Nothing on this store writes
 * `entity_research`, which is the ratify-and-never-research split
 * `src/entities/store.ts` holds structurally and
 * `tests/invariants/api-read-first.test.ts` derives for the whole
 * wave; what this roster is for is the arithmetic beside it — the
 * four READS are the rest, named by subtraction rather than by a
 * second list free to disagree.
 */
const WRITER_METHODS: readonly string[] = [
  'approvePoolRow',
  'updateEntity',
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

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<EntityRecord, typeof ENTITY_KEYS>
  & CoversEveryKey<WireEntity, typeof ENTITY_KEYS>
  & CoversEveryKey<EntityResearchRecord, typeof RESEARCH_KEYS>
  & CoversEveryKey<WireResearch, typeof RESEARCH_KEYS>
  & CoversEveryKey<Ruling, typeof RULING_KEYS>
  & CoversEveryKey<WireRuling, typeof RULING_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<EntitiesServiceStore, typeof SERVICE_METHODS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to an answered row, to the ruling projection, to
 * the envelope, to `meta` or to the `Pick` this router is handed,
 * and to none of the lists above, turns {@link EveryKeyListed}
 * into a `never` — `false` for the list that missed it,
 * intersected with the `true` the others still answer — and this
 * initializer is then a TS2322 at this line, before any case can
 * compare an answer against a set that has quietly stopped
 * describing it. Read in a case below, so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link ENTITY_KEYS}, sorted at use rather than by hand. */
const ENTITY_KEY_SET: readonly string[] = [...ENTITY_KEYS].sort();

/** {@link RESEARCH_KEYS}, sorted. */
const RESEARCH_KEY_SET: readonly string[] = [...RESEARCH_KEYS].sort();

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
 * @returns The rows' ids, IN THE ORDER THEY ARRIVED, since what
 *   this file claims about the order is that it survived the
 *   handler unchanged.
 */
function idsOf(body: { data: readonly WireResearch[] }): number[] {
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
 * Every route a router declares, read off its own stack.
 *
 * DERIVED RATHER THAN TRANSCRIBED, which is the whole of what the
 * shapes case is worth: `router.stack` carries one layer per
 * registered path, and that layer's own `stack` carries one
 * handler layer per verb — which is where a method is legible at
 * all. A second `get` on the same path is a second entry in the
 * inner list rather than a second route.
 *
 * @param router - A built router.
 * @returns One entry per registered path.
 */
function routesOf(router: Router): RegisteredRoute[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;

    if (route === undefined) return [];

    return [{
      path: String(route.path),
      verbs: route.stack.map((inner) => inner.method).sort(),
    }];
  });
}

/**
 * The path one subject is read and rewritten under.
 *
 * @param id - The subject's id, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 *   Derived from {@link ENTITY_TEMPLATE} rather than spelled
 *   again, and the shapes case asserts no `:` survives the
 *   substitution — an unreplaced parameter still reaches the
 *   router as a literal segment and still answers a plausible
 *   refusal.
 */
function entityPath(id: number): string {
  return ENTITY_TEMPLATE.replace(':id', String(id));
}

/**
 * The path one subject's research is paged under.
 *
 * @param id - The subject's id.
 * @returns The wire path, derived on {@link entityPath}'s terms.
 */
function researchPath(id: number): string {
  return RESEARCH_TEMPLATE.replace(':id', String(id));
}

/**
 * The path a ruling on one subject's queue is posted to.
 *
 * @param id - The subject's id.
 * @returns The wire path, derived on {@link entityPath}'s terms.
 */
function approvePath(id: number): string {
  return APPROVE_TEMPLATE.replace(':id', String(id));
}

/**
 * The subject a lookup answered, or a failure naming the id.
 *
 * THROWS rather than answering null, because what it returns is
 * compared as a whole record: an absent row would otherwise reach
 * `toStrictEqual` as `null` and pass against any other absent one,
 * which is a green nobody wrote.
 *
 * @param row - What the port answered.
 * @param id - The id it was asked about.
 * @returns That row.
 * @throws Error - When the port answered nothing.
 */
function storedEntity(
  row: EntityRecord | null,
  id: number,
): EntityRecord {
  if (row === null) {
    throw new Error(`no stored entity carries the id ${id}`);
  }

  return row;
}

/**
 * The intention a lookup answered, or a failure naming the id.
 *
 * THROWS on the terms {@link storedEntity} states, and for the
 * same reason: what a case reads off this row is the pair of
 * stamps a ruling moved, and `null` would satisfy an absence
 * comparison the case never meant to make.
 *
 * @param row - What the port answered.
 * @param id - The id it was asked about.
 * @returns That row.
 * @throws Error - When the port answered nothing.
 */
function storedPool(
  row: ResearchPoolRecord | null,
  id: number,
): ResearchPoolRecord {
  if (row === null) {
    throw new Error(`no stored intention carries the id ${id}`);
  }

  return row;
}

/**
 * Builds an app carrying one freshly built entities router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * refusal below would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the router is mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file's failures depend on
 * their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. That matters more here than
 * on the two read-only groups this wave landed before it: two of
 * these four routes WRITE, so a shared fixture would leave one
 * case ruling on a row another had already ruled on.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildEntitiesApp(store: EntitiesServiceStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildEntitiesRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two registries, one subject's research, and three queued
 * intentions.
 *
 * The smallest fixture every case here can be reached from, and
 * the second registry earns its place twice over: one of its
 * subjects reduces to the key a subject of the first holds, so
 * every read below is a scoping reading, and the other is what the
 * collision case renames onto the taken key WITHOUT colliding —
 * which is the one request separating a per-domain unique key from
 * a store refusing a name wherever it appears.
 *
 * @returns The store and both domain ids, so a case can compare an
 *   answered `domainId` against the registry it was read from
 *   rather than against a number spelled here.
 */
async function plantRegistries(): Promise<PlantedRegistries> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const sibling = await store.insertDomain({
    slug: SIBLING,
    name: 'Newsroom',
    settings: {},
  });

  store.setDomainEntities(domain.id, RADAR_ENTITIES);
  store.setDomainEntities(sibling.id, SIBLING_ENTITIES);
  store.setEntityResearch(KUBE, KUBE_RESEARCH);
  store.setDomainPool(domain.id, RADAR_POOL);

  return { store, radarId: domain.id, siblingId: sibling.id };
}

/**
 * The whole body a `404` about a subject answers with.
 *
 * One constant rather than a literal at the assertion, which is
 * how this file says the message is the service's own sentence
 * arriving unmodified with `code` beside it and nothing else. The
 * id the request named is not in it, which the same case counts
 * rather than assumes.
 */
const NO_SUCH_ENTITY_BODY = {
  code: 'NOT_FOUND',
  message: 'No entity carries that id',
};

/**
 * The whole body a `404` about a queued intention answers with.
 *
 * A DIFFERENT SENTENCE, which is what the pair is for: a router
 * answering one message for every address it cannot find would
 * satisfy either constant on its own. It is also the sentence
 * THREE refusals share — no such row, somebody else's row, and the
 * row having gone between the read and the ruling — because a
 * caller is not entitled to learn that a row it does not own
 * exists.
 */
const NO_SUCH_INTENTION_BODY = {
  code: 'NOT_FOUND',
  message: 'No intention of this subject carries that id',
};

/**
 * The whole body a rename onto a taken key answers with.
 *
 * NO `details` KEY AT ALL, which is the shape rather than an empty
 * array: `ConflictError` is raised with `undefined` details and
 * the framework's serialiser omits the member. Which subject holds
 * the key is a fact about a row the caller did not ask about and,
 * the display spelling being free to differ, may never have seen.
 */
const NAME_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'Another subject in this domain reduces to the same key',
};

/**
 * The whole body a key neither write declares answers with.
 *
 * IT NAMES THE CONTAINER AND NOT THE KEY, which is the whole of
 * why an undeclared key can be refused without quoting anything
 * back: the key is something the REQUEST said, and a detail naming
 * it would be the echo the refusal exists to avoid.
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

// ---------------------------------------------------------------------------
// What the fixture plants, and the vocabulary behind every refusal
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants a registry and a queue every case reads', async () => {
    const { store, radarId, siblingId } = await plantRegistries();
    const app = buildEntitiesApp(store);

    // The answered order is none of the four a page could reach by
    // accident: not the order the rows were planted in, not its
    // reverse, and neither direction of the id. The last two are
    // what stop a store ordering by the tiebreak alone from
    // reproducing the right answer.
    expect(RESEARCH_ORDER).not.toStrictEqual(PLANT_ORDER);
    expect(RESEARCH_ORDER)
      .not.toStrictEqual([...PLANT_ORDER].reverse());
    expect(RESEARCH_ORDER)
      .not.toStrictEqual([...PLANT_ORDER].sort((a, b) => a - b));
    expect(RESEARCH_ORDER)
      .not.toStrictEqual([...PLANT_ORDER].sort((a, b) => b - a));
    // The two registries are distinct and disjoint, so every read
    // below is a scoping reading as well.
    expect(radarId).not.toBe(siblingId);
    expect(SIBLING_IDS.length).toBeGreaterThan(0);
    expect(RADAR_ENTITIES.map((row) => row.id)
      .filter((id) => SIBLING_IDS.includes(id))).toStrictEqual([]);
    // AND THE TWO REGISTRIES OVERLAP ON A KEY, which is what makes
    // the `409` a reading about `entities_domain_id_name_norm_unique`
    // rather than about a store refusing a name outright: one
    // subject on each side reduces to the same thing and neither
    // is in conflict with the other.
    const kube = storedEntity(await store.findEntityById(KUBE), KUBE);
    const elsewhere = storedEntity(
      await store.findEntityById(ELSEWHERE),
      ELSEWHERE,
    );

    expect(kube.nameNorm).toBe(elsewhere.nameNorm);
    expect(kube.domainId).not.toBe(elsewhere.domainId);
    // The key the collision case renames onto is HELD in RADAR and
    // FREE in SIBLING, which is what its two answers turn on, and
    // the key every control renames onto is free in both.
    const keys = RADAR_ENTITIES.map((row) => row.nameNorm);
    const siblingKeys = SIBLING_ENTITIES.map((row) => row.nameNorm);

    expect(keys).toContain(TAKEN_KEY);
    expect(siblingKeys).not.toContain(TAKEN_KEY);
    expect(keys).not.toContain(FREE_KEY);
    expect(siblingKeys).not.toContain(FREE_KEY);
    // The intention the `404` names really is raised about another
    // subject, and the one the approval rules on really is this
    // one's — without the pair the refusal and the ruling could be
    // one answer under two names.
    expect(RADAR_POOL.filter((row) => row.id === OTHERS_INTENTION)
      .map((row) => row.entityId)).toStrictEqual([MESH]);
    expect(RADAR_POOL.filter((row) => row.id === OPEN_INTENTION)
      .map((row) => row.entityId)).toStrictEqual([KUBE]);
    expect(MESH).not.toBe(KUBE);
    // Every planted intention starts OPEN, so a gate that had
    // begun refusing closed rows would be answering about a state
    // none of them is in.
    expect(RADAR_POOL.map((row) => row.approvedAt))
      .toStrictEqual(RADAR_POOL.map(() => null));
    expect(RADAR_POOL.map((row) => row.status))
      .toStrictEqual(RADAR_POOL.map(() => PENDING));
    expect(PENDING).not.toBe(APPROVED);
    // No planted subject carries the id the `404` case names, and
    // the keys the undeclared-key cases submit are declared by
    // NEITHER write schema — read off the schemas rather than
    // trusted, so a member ADDED to either makes that request
    // legal and reddens here instead of leaving a case asserting a
    // refusal that has quietly stopped happening.
    const planted = [...RADAR_ENTITIES, ...SIBLING_ENTITIES];
    const patchKeys = Object.keys(patchEntitySchema.shape);
    const approveKeys = Object.keys(approveResearchSchema.shape);

    expect(planted.map((row) => row.id)).not.toContain(MISSING_ENTITY);
    expect(patchKeys).not.toContain(UNDECLARED_KEY);
    expect(patchKeys).not.toContain(NAME_NORM_KEY);
    expect(approveKeys).not.toContain(UNDECLARED_KEY);
    expect(patchKeys).toContain('name');
    expect(approveKeys).toStrictEqual(['poolId']);
    // And the rows really are there, which none of the premises
    // above can say: a fixture whose plant seams had stopped
    // planting would satisfy every one of them.
    const subject = await request(app).get(entityPath(KUBE));
    const passes = await request(app).get(researchPath(KUBE));

    expect(subject.status).toBe(200);
    expect(subject.body.data.id).toBe(KUBE);
    expect(passes.status).toBe(200);
    expect(passes.body.data).toHaveLength(RESEARCH_COUNT);
    expect(POOL_IDS).toHaveLength(RADAR_POOL.length);
    expect(storedPool(
      await store.findPoolRowById(OPEN_INTENTION),
      OPEN_INTENTION,
    ).status).toBe(PENDING);
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', async () => {
    const { store } = await plantRegistries();
    const registered = routesOf(buildEntitiesRouter({ store }));

    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to an answered row, to the ruling projection, to the
    // envelope, to `meta` or to the `Pick` the router is handed
    // and to none of the lists is a TS2322 at that declaration,
    // before any assertion below can compare an answer against a
    // set that has quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // between the two success shapes this router writes.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // The whole inventory in one comparison, derived from the
    // router's own stack rather than transcribed: a fifth route, a
    // second verb on one of these three paths, or a `post` in
    // place of a `get` is a different value here. An empty stack
    // is too, which is what keeps this from being a search that
    // could only answer nothing.
    expect(registered).toStrictEqual([
      { path: ENTITY_TEMPLATE, verbs: ['get'] },
      { path: ENTITY_TEMPLATE, verbs: ['patch'] },
      { path: RESEARCH_TEMPLATE, verbs: ['get'] },
      { path: APPROVE_TEMPLATE, verbs: ['post'] },
    ]);
    // TWO OF THE FOUR WRITE, and the store surface says which: the
    // six methods the router is handed carry exactly two writers,
    // so the four reads are the rest by subtraction rather than by
    // a second list free to disagree.
    expect(SERVICE_METHOD_SET).toHaveLength(6);
    for (const writer of WRITER_METHODS) {
      expect(SERVICE_METHOD_SET).toContain(writer);
    }
    expect(SERVICE_METHOD_SET
      .filter((method) => !WRITER_METHODS.includes(method)))
      .toHaveLength(4);
    // And every derived path is a real substitution rather than a
    // template that reached Express as one: an unreplaced
    // parameter is still a literal segment and still answers a
    // plausible refusal.
    expect(ENTITY_TEMPLATE).toContain(':id');
    expect(entityPath(KUBE)).not.toContain(':');
    expect(researchPath(KUBE)).not.toContain(':');
    expect(approvePath(KUBE)).not.toContain(':');
    expect(entityPath(MISSING_ENTITY)).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// One subject of one registry
// ---------------------------------------------------------------------------

describe('a subject read by its own id', () => {
  it('answers 200 with the stored row whole', async () => {
    const { store, radarId, siblingId } = await plantRegistries();
    const app = buildEntitiesApp(store);

    const answer = await request(app).get(entityPath(KUBE));
    // The control, through the SAME operation and varied along
    // this row's own axis: the subject of the OTHER registry that
    // reduces to the same key. A router answering one row to every
    // address satisfies every assertion above it and fails this,
    // and a lookup that had stopped reading the registry would
    // answer this row's `domainId` for both.
    const other = await request(app).get(entityPath(ELSEWHERE));
    // The second control, along the axis this route refuses on: an
    // id no registry carries.
    const missing = await request(app).get(entityPath(MISSING_ENTITY));

    expect(answer.status).toBe(200);
    // TWO members and not three: a single get applies no window,
    // so there is no `meta` to describe one. This is `ok()`'s
    // envelope rather than `okPage()`'s.
    expect(keysOf(answer.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(answer.body.success).toBe(true);
    expect(keysOf(answer.body.data)).toStrictEqual(ENTITY_KEY_SET);
    // The row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. `domainId` is the planter's own id
    // rather than a number spelled here, and `nameNorm` is
    // answered beside `name` — the one member of a registry entry
    // no caller can ever submit, and therefore the one a response
    // rebuilt from a request could not carry.
    expect(answer.body.data).toStrictEqual({
      id: KUBE,
      domainId: radarId,
      name: 'Kubernetes',
      nameNorm: 'kubernetes',
      aliasOf: null,
      attributes: {},
    });
    // Nothing is cut, masked or resolved on the way out: what the
    // port projected is what `JSON.stringify` saw, which is the
    // rule `./routes.ts` states for both of this router's reads.
    expect(answer.body.data).toStrictEqual({
      ...storedEntity(await store.findEntityById(KUBE), KUBE),
    });
    // The control lands and it is a DIFFERENT registry's row,
    // carrying the same key under the other domain's id.
    expect(other.status).toBe(200);
    expect(other.body.data.id).toBe(ELSEWHERE);
    expect(other.body.data.domainId).toBe(siblingId);
    expect(other.body.data.nameNorm).toBe(answer.body.data.nameNorm);
    // And the id nothing carries is a `404` rather than an empty
    // body, asserted whole so the sentence is the service's own
    // arriving unmodified with `code` beside it and nothing else.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_ENTITY_BODY);
    expect(keysOf(missing.body)).not.toContain('data');
  });
});

// ---------------------------------------------------------------------------
// The patch: the stored row afterwards, and the key it computed
// ---------------------------------------------------------------------------

describe('a rename that lands', () => {
  it('answers 200 with the row the write left', async () => {
    const { store, radarId } = await plantRegistries();
    const app = buildEntitiesApp(store);

    const answer = await request(app)
      .patch(entityPath(MESH))
      .send({ name: FREE_NAME });
    const stored = storedEntity(await store.findEntityById(MESH), MESH);
    // The sequence as the route's own read-back path carries it:
    // there is no second address for a `Location` to name, so the
    // single get is where a client sees the rename again.
    const detail = await request(app).get(entityPath(MESH));

    expect(answer.status).toBe(200);
    // `200` with a body rather than `204`, because the answer
    // carries something the request did not.
    expect(keysOf(answer.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(answer.body.data)).toStrictEqual(ENTITY_KEY_SET);
    // THE ANSWER IS HELD AGAINST THE STORE'S OWN READ rather than
    // member by member, and that is the whole reading: `nameNorm`
    // is the member no request carried, so a response rebuilt
    // around the parsed body would satisfy any comparison whose
    // every member came from the body. This one cannot — it is the
    // row as the write left it.
    expect(answer.body.data).toStrictEqual({ ...stored });
    // What the request DID carry is in it too, so the pair says
    // the row is the subject that was asked about rather than some
    // other row the store happened to hold.
    expect(stored.name).toBe(FREE_NAME);
    expect(stored.id).toBe(MESH);
    expect(stored.domainId).toBe(radarId);
    // AND THE KEY WAS RECOMPUTED. The reduced half moved with the
    // display half, through the same module the fixture reduces
    // by, and the caller never sent it: this is the only way a
    // client learns what its name reduced to.
    expect(stored.nameNorm).toBe(FREE_KEY);
    expect(stored.nameNorm).not.toBe(FREE_NAME);
    expect(countOccurrences(answer.text, FREE_KEY)).toBe(1);
    expect(countOccurrences(
      JSON.stringify({ name: FREE_NAME }),
      FREE_KEY,
    )).toBe(0);
    // The members the patch did not name are as they were planted,
    // which is what says a rewrite of the supplied members is not
    // a rewrite of the row.
    expect(stored.aliasOf).toBeNull();
    expect(stored.attributes).toStrictEqual({});
    // And the same row reaches the wire through the single get,
    // which is the read a client makes of it afterwards.
    expect(detail.status).toBe(200);
    expect(detail.body.data).toStrictEqual(answer.body.data);
    // The control inside the case, varied along the axis under
    // test: the subject NOT addressed is untouched. A write
    // reaching every row would satisfy every assertion above.
    expect(storedEntity(await store.findEntityById(KUBE), KUBE).name)
      .toBe('Kubernetes');
  });
});

// ---------------------------------------------------------------------------
// The research page: the envelope, the window it echoes and the rows
// ---------------------------------------------------------------------------

describe('a research page that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { store } = await plantRegistries();
    const app = buildEntitiesApp(store);
    const research = researchPath(KUBE);

    const whole = await request(app).get(research);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, and a `total` taken from the rows in hand
    // answers 1 to each of the narrow pair.
    const first = await request(app)
      .get(research)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(research)
      .query({ page: RESEARCH_COUNT, perPage: 1 });
    // The second control, along the axis this collection is scoped
    // by: a subject nobody has researched. It is a `200` with an
    // empty `data` rather than a `404`, which is the distinction
    // the route's own 404 is reserved for.
    const none = await request(app).get(researchPath(MESH));

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    // THREE members and not two: this read applies a window, so it
    // carries the `meta` describing one, which is the difference
    // between the envelope `okPage` writes and the one `ok` does.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    // `meta` WHOLE, including the window nobody asked for: a
    // default is still a window a caller is told about, and the
    // number reaching the wire is the claim rather than the number
    // having been a default. There is no filter on this
    // collection, so `total` is the whole of it.
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: RESEARCH_COUNT,
      totalPages: 1,
    });
    // The order reaches the wire as the port answered it, which is
    // the only half of the ordering this file owns: nothing in the
    // handler re-sorts a page it was handed, and a handler that
    // did would be answering a different order from the one the
    // window was taken under.
    expect(idsOf(whole.body)).toStrictEqual(RESEARCH_ORDER);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column — the
    // `entityId` the path already named among them.
    for (const row of whole.body.data as WireResearch[]) {
      expect(keysOf(row)).toStrictEqual(RESEARCH_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants
    // from. `researchedAt` is asserted as the ISO spelling because
    // that conversion is the framework's own and is the one member
    // whose type changes crossing `res.json`, and `payload` is
    // answered as jsonb held it rather than reshaped.
    expect((whole.body.data as WireResearch[])
      .find((row) => row.id === SECOND_ID)).toStrictEqual({
      id: SECOND_ID,
      runId: null,
      summary: null,
      payload: { depth: 2 },
      researchedAt: new Date(SECOND_PASS).toISOString(),
    });
    // The two narrow windows are disjoint, each holds the row the
    // ordering puts at that position, and each names the total of
    // the COLLECTION, which no page could have counted from its
    // own rows.
    expect(idsOf(first.body)).toStrictEqual([RESEARCH_ORDER[0]]);
    expect(idsOf(last.body))
      .toStrictEqual([RESEARCH_ORDER[RESEARCH_COUNT - 1]]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: RESEARCH_COUNT,
      totalPages: RESEARCH_COUNT,
    });
    expect(last.body.meta).toStrictEqual({
      page: RESEARCH_COUNT,
      perPage: 1,
      total: RESEARCH_COUNT,
      totalPages: RESEARCH_COUNT,
    });
    // And a subject nobody has researched is an empty page whose
    // `meta` still describes the window that was asked for: a read
    // scoped to the addressed subject rather than to the domain,
    // which a page answering the same three rows would fail.
    expect(none.status).toBe(200);
    expect(none.body.data).toStrictEqual([]);
    expect(none.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: 0,
      totalPages: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// The gate: a ruling that lands, and the ruling projection on the wire
// ---------------------------------------------------------------------------

describe('a ruling on one queued intention', () => {
  it('answers 200 with the four-member ruling', async () => {
    const { store } = await plantRegistries();
    const app = buildEntitiesApp(store);

    const answer = await request(app)
      .post(approvePath(KUBE))
      .send({ poolId: OPEN_INTENTION });
    const ruled = storedPool(
      await store.findPoolRowById(OPEN_INTENTION),
      OPEN_INTENTION,
    );
    // The control, along the axis under test: the second open
    // intention of the same subject. One ruling stamps one row,
    // and a gate ruling on the queue wholesale would satisfy every
    // assertion below and fail this.
    const untouched = storedPool(
      await store.findPoolRowById(SECOND_INTENTION),
      SECOND_INTENTION,
    );

    // `200` and not `201`, because nothing was created: the queued
    // row already existed and what changed is two of its columns.
    expect(answer.status).toBe(200);
    // TWO members and not three: a ruling applies no window. And
    // FOUR in the projection, which is `src/approvals/ruling.ts`'s
    // whole vocabulary reaching the wire rather than the stored
    // row: the terms, the domain, the finding that raised it and
    // the id of nothing else are not answerable here.
    expect(keysOf(answer.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(answer.body.data)).toStrictEqual(RULING_KEY_SET);
    // THE ANSWER IS HELD AGAINST THE STORE'S OWN READ rather than
    // member by member: `approvedAt` is the instant the WRITE
    // chose and `status` is the member it moved, so neither came
    // from the request and a response rebuilt around the parsed
    // body could carry neither.
    const wire = answer.body.data as WireRuling;

    expect(wire).toStrictEqual({
      id: ruled.id,
      status: ruled.status,
      approvedAt: ruled.approvedAt?.toISOString() ?? null,
      closedAt: ruled.researchedAt?.toISOString() ?? null,
    });
    // The row MOVED, in both the columns the write names and in
    // neither of the others: it was planted pending and unapproved
    // and it is neither now, and it is still open, which is what
    // `closedAt` reads and what says no research was recorded.
    expect(wire.id).toBe(OPEN_INTENTION);
    expect(wire.status).toBe(APPROVED);
    expect(wire.status).not.toBe(PENDING);
    expect(wire.approvedAt).not.toBeNull();
    expect(wire.closedAt).toBeNull();
    expect(ruled.searchTerms).toStrictEqual(INTENDED_TERMS);
    expect(ruled.createdAt.toISOString()).toBe(QUEUED_AT);
    // And the intention beside it is exactly as it was planted,
    // which is the reading no assertion over the ruled row can
    // make: the write reached one row.
    expect(untouched.status).toBe(PENDING);
    expect(untouched.approvedAt).toBeNull();
    expect(untouched.researchedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The gate: an intention raised about another subject
// ---------------------------------------------------------------------------

describe('an intention raised about another subject', () => {
  it('answers 404 without saying whose it is', async () => {
    const { store } = await plantRegistries();
    const app = buildEntitiesApp(store);

    const refused = await request(app)
      .post(approvePath(KUBE))
      .send({ poolId: OTHERS_INTENTION });
    const after = storedPool(
      await store.findPoolRowById(OTHERS_INTENTION),
      OTHERS_INTENTION,
    );
    // EVERY LOOKUP BEFORE THE ONE UNDER TEST RESOLVES, asserted in
    // the case rather than assumed: without it a fixture that had
    // planted no registry would refuse this request one rule
    // earlier and satisfy every containment count below for the
    // wrong reason.
    const subject = await request(app).get(entityPath(KUBE));
    // The control, through the SAME operation and varied along
    // this row's own axis: the intention that IS this subject's.
    // A gate refusing every ruling passes the refusal and fails
    // this.
    const taken = await request(app)
      .post(approvePath(KUBE))
      .send({ poolId: OPEN_INTENTION });

    expect(refused.status).toBe(404);
    // The whole body rather than the status, which is where the
    // refusal says WHICH sentence it answered: this one is shared
    // by the row nothing carries, the row somebody else raised and
    // the row having gone in between, because a caller is not
    // entitled to learn that a row it does not own exists. It is
    // NOT the sentence a missing subject answers, which the pair
    // below holds apart.
    expect(refused.body).toStrictEqual(NO_SUCH_INTENTION_BODY);
    expect(NO_SUCH_INTENTION_BODY.message)
      .not.toBe(NO_SUCH_ENTITY_BODY.message);
    expect(keysOf(refused.body)).not.toContain('details');
    // The submitted id is not quoted back, counted rather than
    // asserted absent and held against a known positive taken by
    // the same function in the same case: the body a caller could
    // read it off is the one it sent.
    const submitted = String(OTHERS_INTENTION);

    expect(countOccurrences(refused.text, submitted)).toBe(0);
    expect(countOccurrences(
      JSON.stringify({ poolId: OTHERS_INTENTION }),
      submitted,
    )).toBe(1);
    // THE REFUSAL WROTE NOTHING. The row somebody else raised is
    // exactly as it was planted, which is what separates a gate
    // that refused from one that ruled and then reported a 404.
    expect(after.status).toBe(PENDING);
    expect(after.approvedAt).toBeNull();
    expect(after.entityId).toBe(MESH);
    // The addressed subject resolves and the ruling it IS entitled
    // to give lands, so the refusal above is about the row rather
    // than about the address or about the gate.
    expect(subject.status).toBe(200);
    expect(taken.status).toBe(200);
    expect((taken.body.data as WireRuling).id).toBe(OPEN_INTENTION);
  });
});

// ---------------------------------------------------------------------------
// The patch: a rename onto a key another subject already holds
// ---------------------------------------------------------------------------

describe('a rename onto a key another subject holds', () => {
  it('answers 409 carrying no detail at all', async () => {
    const { store } = await plantRegistries();
    const app = buildEntitiesApp(store);

    const refused = await request(app)
      .patch(entityPath(KUBE))
      .send({ name: TAKEN_NAME });
    const after = storedEntity(await store.findEntityById(KUBE), KUBE);
    // The control, through the SAME operation and varied along
    // this row's own axis: the identical rename onto a key nothing
    // holds. A router refusing every rename passes the refusal and
    // fails this.
    const free = await request(app)
      .patch(entityPath(MESH))
      .send({ name: FREE_NAME });
    // The SECOND control, and the one only two registries can
    // supply: the SAME name onto a subject of the other domain,
    // where the key is not taken. It lands, which is what makes
    // this a reading about
    // `entities_domain_id_name_norm_unique` rather than about a
    // store refusing a name wherever it appears.
    const elsewhere = await request(app)
      .patch(entityPath(DESK))
      .send({ name: TAKEN_NAME });

    expect(refused.status).toBe(409);
    // The whole body rather than the status: `CONFLICT` with the
    // rule's own sentence, and NO `details` key at all rather than
    // an empty one. Which subject holds the key is a fact about a
    // row the caller did not ask about and, the display spelling
    // being free to differ, may never have seen — naming it would
    // let a caller enumerate a registry by proposing names.
    expect(refused.body).toStrictEqual(NAME_TAKEN_BODY);
    expect(keysOf(refused.body)).toStrictEqual(['code', 'message']);
    expect(keysOf(refused.body)).not.toContain('details');
    // Neither the name submitted nor the key it reduces to comes
    // back, counted rather than asserted absent and held against a
    // planted envelope carrying both, counted by the same function
    // in the same case. Both needles are sentinel spellings, so no
    // constraint name, module path or stack frame could hold one.
    const text = refused.text;
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `${TAKEN_NAME} reduces to ${TAKEN_KEY}`,
    });

    expect([
      countOccurrences(text, TAKEN_NAME),
      countOccurrences(text, TAKEN_KEY),
    ]).toStrictEqual([0, 0]);
    expect([
      countOccurrences(planted, TAKEN_NAME),
      countOccurrences(planted, TAKEN_KEY),
    ]).toStrictEqual([1, 1]);
    // THE REFUSAL WROTE NOTHING. The subject is exactly as it was
    // planted, both halves of the name included, which is what
    // says the constraint refused the write rather than a read
    // pre-empting it after the row had moved.
    expect(after.name).toBe('Kubernetes');
    expect(after.nameNorm).toBe('kubernetes');
    // The free rename lands, so the router is not refusing every
    // patch it is handed.
    expect(free.status).toBe(200);
    expect(free.body.data.nameNorm).toBe(FREE_KEY);
    // And the same name lands in the OTHER registry, taking the
    // key there while it stays held here: two subjects reduce to
    // one key across two domains and neither is in conflict.
    expect(elsewhere.status).toBe(200);
    expect(elsewhere.body.data.nameNorm).toBe(TAKEN_KEY);
    expect(elsewhere.body.data.id).toBe(DESK);
    expect(elsewhere.body.data.domainId)
      .not.toBe(after.domainId);
    expect(storedEntity(await store.findEntityById(TAKEN), TAKEN)
      .nameNorm).toBe(TAKEN_KEY);
  });
});

// ---------------------------------------------------------------------------
// Both writes: a body carrying a key the endpoint does not declare
// ---------------------------------------------------------------------------

describe('a body carrying a key neither write declares', () => {
  it('answers 422 naming the body on both routes', async () => {
    const { store } = await plantRegistries();
    const app = buildEntitiesApp(store);

    const patched = await request(app)
      .patch(entityPath(MESH))
      .send({
        name: FREE_NAME,
        [UNDECLARED_KEY]: UNDECLARED_KEY_VALUE,
      });
    const ruled = await request(app)
      .post(approvePath(KUBE))
      .send({
        poolId: OPEN_INTENTION,
        [UNDECLARED_KEY]: UNDECLARED_KEY_VALUE,
      });
    // THE COMPUTED MEMBER, which is the key this router's
    // strictness exists for: `nameNorm` is derived from the
    // display half, so a submitted one would be a second reduction
    // competing with the single definition. It is refused as an
    // undeclared key rather than dropped — a dropped one would be
    // indistinguishable, on the wire, from the service having
    // honoured it.
    const computed = await request(app)
      .patch(entityPath(MESH))
      .send({ [NAME_NORM_KEY]: 'zzsentinelkeyhalfzz' });
    const afterRefusals = storedEntity(
      await store.findEntityById(MESH),
      MESH,
    );
    const openAfterRefusals = storedPool(
      await store.findPoolRowById(OPEN_INTENTION),
      OPEN_INTENTION,
    );
    // The controls, one per route, each the identical request with
    // the undeclared key removed: the pair says each refusal is
    // about the KEY rather than about a route refusing every body
    // it is handed, and each remaining member is legal on its own.
    const declaredPatch = await request(app)
      .patch(entityPath(MESH))
      .send({ name: FREE_NAME });
    const declaredRuling = await request(app)
      .post(approvePath(KUBE))
      .send({ poolId: OPEN_INTENTION });

    // ONE ANSWER FROM TWO SCHEMAS, which is the reading two routes
    // in one case buys: `patchEntitySchema` and
    // `approveResearchSchema` are separate declarations and both
    // are `.strict()`, so a strictness dropped from either is
    // visible here rather than in whichever file happened to have
    // a case.
    expect(patched.status).toBe(422);
    expect(ruled.status).toBe(422);
    expect(computed.status).toBe(422);
    expect(patched.body).toStrictEqual(UNDECLARED_BODY);
    expect(ruled.body).toStrictEqual(UNDECLARED_BODY);
    expect(computed.body).toStrictEqual(UNDECLARED_BODY);
    // NEITHER THE KEY NOR ITS VALUE COMES BACK, which is what the
    // detail naming the container is for: the key is something the
    // REQUEST said. Counted rather than asserted absent, against a
    // planted envelope carrying both, counted by the same function
    // in the same case.
    const bodies = [patched.text, ruled.text].join('');
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
    // NEITHER REFUSAL WROTE. The subject is as it was planted and
    // the intention is still open, so the strict parse ran before
    // anything was read or rewritten on either route.
    expect(afterRefusals.name).toBe('Service Mesh');
    expect(afterRefusals.nameNorm).toBe('service mesh');
    expect(openAfterRefusals.approvedAt).toBeNull();
    expect(openAfterRefusals.status).toBe(PENDING);
    // And both controls land, each answering its own route's
    // shape: the rename comes back as a registry entry and the
    // ruling as the four-member projection.
    expect(declaredPatch.status).toBe(200);
    expect(keysOf(declaredPatch.body.data))
      .toStrictEqual(ENTITY_KEY_SET);
    expect(declaredPatch.body.data.name).toBe(FREE_NAME);
    expect(declaredRuling.status).toBe(200);
    expect(keysOf(declaredRuling.body.data))
      .toStrictEqual(RULING_KEY_SET);
    expect((declaredRuling.body.data as WireRuling).status)
      .toBe(APPROVED);
  });
});
