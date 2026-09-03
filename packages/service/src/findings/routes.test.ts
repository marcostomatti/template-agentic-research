/**
 * `src/findings/routes.ts` — what the two reads answer, refusing
 * and landing: the status, the envelope, the members each reaches
 * the wire with, and the value objects the handler hands the port.
 * Driven over supertest against a router built by the real
 * factory, standing on `tests/helpers/memory-research-store.ts`,
 * so every claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation
 * and only the translation. Which rows a verdict selects, which
 * bound a half-open window takes, that an unknown slug is a
 * `NotFoundError` rather than an empty page, and that the digest
 * ordering is `compareFindings` — those are claims about the RULES
 * and are pinned one file over, over direct calls. What no call
 * can report is whether a rule reached a caller: the status
 * `errorHandler` or the handler chose, the envelope written around
 * it, the members that envelope carried, what the SERIALISED
 * response says, and — the reading this router needs most — what
 * the handler BUILT out of the query before it called anything at
 * all. So every case below reads a response, and the one that
 * cannot reads the arguments a recording port was handed.
 *
 * ELEVEN CASES IN SEVEN GROUPS. Two guard the fixture and the
 * query vocabulary every refusal is read against, one holds the
 * shapes every answer is compared to, one is the page, two are
 * what the handler hands the port, two are the single get, one is
 * the address, and two are the parameter this route does not
 * declare.
 *
 * THE PAGE. One request with no query at all beside two windows of
 * ONE over the same three rows, which is the reading a refusal
 * could not take: a refusal cannot afford a window narrower than
 * its collection, so every page it reads holds every row and a
 * `total` counted off the rows in hand agrees with the counted
 * one. The narrow pair is disjoint and each names the total of the
 * COLLECTION. The envelope is asserted as a key SET with `meta`
 * whole, one row is compared whole against the constants the
 * fixture plants from, and EVERY row's key set is read rather than
 * the first's — a page cannot carry one well-shaped record beside
 * one that leaked a column.
 *
 * A SECOND DOMAIN HOLDS A FINDING OF ITS OWN, so every page here
 * is a scoping reading too: a handler that had stopped resolving
 * the slug answers four rows where each case asserts three.
 *
 * THE ORDER REACHES THE WIRE AS THE PORT ANSWERED IT, which is the
 * only half of the ordering this file owns; the sort itself is the
 * store's and `./service.test.ts` is where it is held against
 * `orderFindings`. The plant is what makes even that reading
 * possible — the three rows go in unscored-first, so the answered
 * order is neither the order they arrived in nor its reverse, and
 * the fixture guard computes both wrong answers rather than
 * naming them.
 *
 * WHAT THE HANDLER HANDS THE STORE is the one claim in this file
 * that no response can carry, and it is the router's own: the
 * query is parsed once and split THREE ways. A recording port
 * standing in front of the planted store keeps the arguments of
 * both list reads, and the case reads them as SETS. The filter is
 * exactly `category`, `verdict` and `window`; the window inside it
 * is `sinceInclusive`/`untilExclusive` holding `Date`s rather than
 * the strings a caller typed; the sort travels BESIDE the filter,
 * since `countFindings` takes no ordering; and the page window is
 * `limit`/`offset` rather than `page`/`perPage`.
 *
 * THAT SET IS READ AGAINST THE QUERY SCHEMA AT RUNTIME rather than
 * against a list written out here. `findingListQuerySchema.shape`
 * names all seven parameters a caller may send, the two narrowings
 * are removed from it, and what is left is the five names no value
 * object below may carry. A parameter ADDED to the query is in
 * that checked set the day it lands. And the zero it produces is
 * read against a PLANTED filter built by forwarding the parsed
 * query whole, counted by the same function in the same case —
 * which is what a handler that passed `req.query` through would
 * have produced, and what makes the clean answer a reading rather
 * than a search that could only ever come back empty.
 *
 * THE SINGLE GET IS TWO CASES BECAUSE AN EMPTY LIST IS A STATE.
 * One finding carries a sighting, two rulings and three research
 * rows — three DIFFERENT lengths, deliberately, because two
 * embedded lists swapped in the assembly is invisible to any
 * reading over lists of equal length. The other is attributed to
 * nobody, judged by nobody and cited by nothing, and answers
 * `200` with three empty lists rather than a `404`.
 *
 * THE ADDRESS. An id naming no finding is `404` asserted against
 * ONE whole body constant, and its control is the SAME operation
 * over an id that resolves. Beside it, a slug naming no domain is
 * a `404` carrying a DIFFERENT sentence — which is what says the
 * two lookups are two lookups rather than one message answered
 * for every address this router does not find.
 *
 * A PARAMETER THIS ROUTE DOES NOT DECLARE is `422` whose ONE
 * detail names `query` rather than the parameter, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * REQUEST said. The envelope is asserted whole, and its control is
 * the identical request with that parameter removed.
 *
 * AND NOTHING A REQUEST SUBMITTED COMES BACK. That case counts SIX
 * sentinels across FOUR responses — a refused undeclared parameter
 * and its value, a refused sort key, a verdict and a category no
 * row carries, and a slug no domain does — rather than asserting
 * an absence, and takes the same count over a planted envelope
 * carrying all six. Two of the four responses LAND: a `?verdict`
 * and a `?category` that matched nothing answer an empty page, and
 * an empty page is exactly where a handler echoing its filter back
 * would be least visible.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and
 * what a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s — the containment reading
 * below is scoped to the channels these two GETs open. The ruling
 * that appends a `finding_labels` row IS on this router now, and
 * NO case in this file reads it: every envelope, every count and
 * every containment window below is about the two reads, so a
 * regression in `PATCH /findings/:id/verdict` would leave this
 * file green. Those cases are owed, and until they land the only
 * readings of that route are `./verdict-service.test.ts`'s, taken
 * over direct calls with no server.
 *
 * MUTATION GRID, taken by mutating one file one edit at a time and
 * reading the failed `fullName` SET off a `--reporter=json` run
 * rather than a count. TEN legs, each named by the EDIT it makes
 * rather than by its effect, since a leg described only by its
 * effect is one nobody can run again. Seven mutate `./routes.ts`
 * or `./service.ts`, one mutates the composed query schema and one
 * mutates `tests/helpers/memory-research-store.ts`, whose ordering
 * no mutation of the router could reach.
 *
 * THE HANDOFF. Building the filter as a SPREAD of the parsed query
 * beside its window reddens 2, both recording cases, and nothing
 * else — no response in the file changes at all, which is the
 * whole reason that pair reads arguments rather than bodies.
 * Handing the tuple default in place of `query.sort` reddens 1,
 * the narrowing one. A fixed store window in place of
 * `toStoreWindow(query)` reddens 2 and `total: page.rows.length`
 * in place of `total: page.total` reddens the SAME 2, the page and
 * the narrowing recording case, which are the only two reads here
 * that take a window narrower than their collection.
 *
 * THE SINGLE GET. `res.status(201)` reddens 3 — both of its cases
 * and the control inside the address case. Swapping `sightings`
 * and `labels` in the assembled detail reddens exactly 1, the
 * populated one, and only because those two lists are one and two
 * rows long; emptying the research list reddens 2, the second
 * being the empty-lists case, whose own control reads the
 * populated finding research back. Reversing the in-memory label
 * ordering reddens 2, and the second is worth naming: the
 * narrowing recording case filters on a verdict, and a verdict
 * filter reads the LATEST ruling, so an ordering answered
 * backwards moves which finding that page counts.
 *
 * THE QUERY. Making `findingListQuerySchema` loose reddens 2, both
 * undeclared-parameter cases, and reaches nothing else.
 *
 * AND ONE HONEST ZERO. Parsing the address BEFORE the query on the
 * list route reddens NOTHING here, because no request in this file
 * gets both wrong at once — the reading
 * `src/sources/failures-routes.test.ts` takes with an over-cap
 * window on a segment that is not an id. The ordering
 * `./routes.ts` argues for is therefore unpinned by this file, and
 * saying so is cheaper than a case that would have to name a
 * refusal about a slug to make the point.
 */
import type {
  FindingDetail,
  FindingsServiceStore,
} from './service.js';
import type {
  FindingFilter,
  FindingLabelRecord,
  FindingRecord,
  FindingResearchRecord,
  FindingSightingRecord,
  FindingSort,
  InsertFindingLabelInput,
} from './store.js';
import type { VerdictServiceStore } from './verdict-service.js';
import type {
  MemoryDomainFinding,
  MemoryEntityResearch,
  MemoryFindingSighting,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { StoreWindow, TimeWindow } from '../http/schemas.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildFindingsRouter } from './routes.js';
import {
  FINDING_SORT_KEYS,
  findingListQuerySchema,
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
const silentLogger = createLogger('findings-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every page reads. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, holding a finding of its own.
 *
 * What makes every page below a SCOPING reading as well: a handler
 * that had stopped resolving the slug answers four rows where each
 * case asserts three, and no count in this file would need
 * changing for it to pass.
 */
const SIBLING = 'example-newsroom';

/**
 * A slug shaped like one and carried by no domain here.
 *
 * SENTINEL-SHAPED ON PURPOSE, so the containment case counting it
 * in a `404` is reading the refusal rather than a coincidence of
 * wording. It still satisfies `slugParamSchema`, because what is
 * under test is a slug that PARSED and resolved to nothing, not a
 * segment the boundary would have refused.
 */
const MISSING_SLUG = 'zzsentinelslugzz';

/**
 * An id shaped like one and carried by no finding here.
 *
 * Far past the three the fixture plants, and a positive integer so
 * that `resourceIdParamSchema` narrows it happily — a value the
 * schema refused would answer `422` and pin the wrong thing.
 */
const MISSING_ID = 9999;

/** The entity the one attributed finding names. */
const ENTITY_ID = 501;

/**
 * The finding the single get addresses: attributed, cited once,
 * judged twice and the top of the score ordering.
 */
const JUDGED_ID = 11;

/** The finding in the middle of that ordering, judged by nobody. */
const MIDDLE_ID = 12;

/**
 * The finding carrying no score, attributed to nobody and judged
 * by nobody: the empty-lists case, and the TAIL of the score
 * ordering rather than its floor.
 */
const BARE_ID = 13;

/** The finding {@link SIBLING} holds, which no page answers. */
const SIBLING_ID = 14;

/** The category key the two scored findings are filed under. */
const PEOPLE = 'people';

/** The verdict the last ruling on {@link JUDGED_ID} carries. */
const CONFIRMED = 'confirmed';

/** The verdict the ruling before it carried. */
const REJECTED = 'rejected';

/** When {@link JUDGED_ID} was made, and the top of the ordering. */
const FIRST_MADE = '2026-03-01T00:00:00.000Z';

/** When {@link MIDDLE_ID} was made. */
const SECOND_MADE = '2026-03-02T00:00:00.000Z';

/** When {@link BARE_ID} was made, the NEWEST of the three. */
const THIRD_MADE = '2026-03-03T00:00:00.000Z';

/** Where the store clock starts, so a stamp is assertable. */
const CLOCK_START = '2026-03-10T00:00:00.000Z';

/** How far that clock moves on every reading, in milliseconds. */
const CLOCK_STEP_MS = 60000;

/** The lower bound the filter-recording case submits. */
const SINCE_STAMP = '2026-03-01T00:00:00.000Z';

/** The upper bound it submits, strictly after the one above. */
const UNTIL_STAMP = '2026-03-03T00:00:00.000Z';

/** The ordering that case asks for, which is not the default. */
const RECENCY_SORT: FindingSort = 'recency';

/** A sort key shaped like one and outside the declared tuple. */
const MISSING_SORT = 'zzsentinelsortzz';

/** A verdict shaped like one and carried by no label here. */
const MISSING_VERDICT = 'zzsentinelverdictzz';

/** A category key shaped like one and filed under by nothing. */
const MISSING_CATEGORY = 'zzsentinelcategoryzz';

/**
 * A query parameter `findingListQuerySchema` does not declare.
 *
 * Read against that schema at runtime by the fixture guard rather
 * than trusted here, so a parameter ADDED to the query vocabulary
 * makes this request legal and reddens there instead of leaving a
 * case asserting a refusal that has quietly stopped happening.
 *
 * Distinctive as a substring for the same reason its value is: the
 * containment case counts both in the refusal they produced, and a
 * short realistic token would be satisfiable by some other member
 * of the envelope.
 */
const UNDECLARED_PARAM = 'zzsortparamzz';

/** What that parameter is submitted with, on the same terms. */
const UNDECLARED_VALUE = 'zzsortvaluezz';

/**
 * Every sentinel a request in this file submits.
 *
 * ONE ROSTER BEHIND THE CONTAINMENT CASE, so a needle added to a
 * request without being added here is the only way a channel goes
 * unread — and the planted control below is built from this same
 * list, which is what keeps the two halves of that case describing
 * one set.
 */
const SUBMITTED_SENTINELS: readonly string[] = [
  MISSING_CATEGORY,
  MISSING_SLUG,
  MISSING_SORT,
  MISSING_VERDICT,
  UNDECLARED_PARAM,
  UNDECLARED_VALUE,
];

/**
 * The three findings {@link RADAR} holds, PLANTED UNSCORED-FIRST.
 *
 * The plant order is deliberately neither the order a page comes
 * back in nor its reverse, which is what makes the ordering
 * assertion below a reading at all: a store answering rows in
 * insertion order and a store answering them backwards each
 * produce a different list from the one right answer, and the
 * fixture guard computes both rather than naming them.
 *
 * PLANTED RATHER THAN WRITTEN, because `FindingStore` declares no
 * insert: `src/findings/store.ts` states that the absence IS the
 * read-first rule, so `MemoryResearchStore.setDomainFindings` is
 * the only way this table gets rows and every page below would
 * otherwise be empty.
 *
 * The three differ along every axis a case here reads. One is
 * attributed to an entity and two are not; one carries no score at
 * all; two are filed under a category and one is filed under
 * nothing; one is judged twice and two are judged by nobody.
 */
const PLANTED_FINDINGS: readonly MemoryDomainFinding[] = [
  {
    id: BARE_ID,
    documentId: 3,
    entityId: null,
    fields: {},
    score: null,
    scoreVersion: null,
    createdAt: new Date(THIRD_MADE),
  },
  {
    id: JUDGED_ID,
    documentId: 1,
    entityId: ENTITY_ID,
    fields: { category: PEOPLE },
    score: 0.9,
    scoreVersion: 1,
    createdAt: new Date(FIRST_MADE),
  },
  {
    id: MIDDLE_ID,
    documentId: 2,
    entityId: null,
    fields: { category: PEOPLE },
    score: 0.4,
    scoreVersion: 1,
    createdAt: new Date(SECOND_MADE),
  },
];

/** How many findings {@link RADAR} holds. */
const PLANTED_COUNT = PLANTED_FINDINGS.length;

/** Their ids in the order they were planted. */
const PLANT_ORDER: readonly number[] = PLANTED_FINDINGS.map(
  (row) => row.id,
);

/**
 * The order a page answers them in: score descending with an
 * absent score LAST.
 *
 * Written out rather than derived, on the terms
 * `src/sources/failures-routes.test.ts` states for its own queue:
 * the sort is the port's rule and `./service.test.ts` holds it
 * against `orderFindings`, so what this file claims is only that
 * whatever the port answered reached the wire in that order.
 */
const SCORE_ORDER: readonly number[] = [JUDGED_ID, MIDDLE_ID, BARE_ID];

/** The one finding {@link SIBLING} holds, so no page may show it. */
const SIBLING_FINDINGS: readonly MemoryDomainFinding[] = [
  {
    id: SIBLING_ID,
    documentId: 4,
    entityId: null,
    fields: { category: PEOPLE },
    score: 0.7,
    scoreVersion: 1,
    createdAt: new Date(FIRST_MADE),
  },
];

/**
 * Where {@link JUDGED_ID} has been seen: ONE row, the shortest of
 * the three embedded lists.
 */
const PLANTED_SIGHTINGS: readonly MemoryFindingSighting[] = [
  {
    id: 21,
    sourceId: 31,
    externalId: 'radar-11',
    seenAt: new Date('2026-03-01T01:00:00.000Z'),
  },
];

/**
 * What research recorded about {@link ENTITY_ID}: THREE rows,
 * planted oldest first, and the longest of the three lists.
 *
 * Reached through the finding rather than named by a request —
 * only {@link JUDGED_ID} is attributed, so this is what the other
 * two answer an empty list instead of.
 */
const PLANTED_RESEARCH: readonly MemoryEntityResearch[] = [
  {
    id: 41,
    runId: 51,
    summary: 'what a pass made of it',
    payload: { note: 'stored' },
    researchedAt: new Date('2026-03-01T02:00:00.000Z'),
  },
  {
    id: 42,
    runId: 52,
    summary: 'what a later pass added',
    payload: { note: 'added' },
    researchedAt: new Date('2026-03-02T02:00:00.000Z'),
  },
  {
    id: 43,
    runId: null,
    summary: null,
    payload: { note: 'outside a run' },
    researchedAt: new Date('2026-03-03T02:00:00.000Z'),
  },
];

/**
 * The order a read answers them in, derived from the plant rather
 * than restated: the rows go in oldest first, so newest first is
 * that list reversed.
 */
const RESEARCH_NEWEST_FIRST: readonly number[] = PLANTED_RESEARCH
  .map((row) => row.id)
  .reverse();

/**
 * The TWO rulings {@link JUDGED_ID} carries, in append order.
 *
 * THE SECOND IS THE VERDICT IN FORCE, and the two differ, so the
 * newest-first ordering the port promises is separable from the
 * order they were written in. Appended through the port rather
 * than planted, because `finding_labels` is the one table in this
 * half a method writes.
 */
const PLANTED_RULINGS: readonly InsertFindingLabelInput[] = [
  { findingId: JUDGED_ID, verdict: REJECTED, note: null },
  { findingId: JUDGED_ID, verdict: CONFIRMED, note: 'read again' },
];

/** The verdicts that read answers, newest first. */
const RULINGS_NEWEST_FIRST: readonly string[] = [...PLANTED_RULINGS]
  .map((row) => row.verdict)
  .reverse();

/** How long each of the three embedded lists is, in read order. */
const EMBEDDED_LENGTHS: readonly number[] = [
  PLANTED_SIGHTINGS.length,
  PLANTED_RULINGS.length,
  PLANTED_RESEARCH.length,
];

/**
 * `paginationQuerySchema`'s own default, spelled here because
 * that module keeps it private.
 *
 * Read by the page case, which asserts `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * having been a default.
 */
const DEFAULT_PER_PAGE = 50;

/** The path TEMPLATE the list route registers. */
const FINDINGS_TEMPLATE = '/domains/:slug/findings';

/** The path TEMPLATE the single get registers. */
const FINDING_TEMPLATE = '/findings/:id';

/**
 * One answered finding, as the WIRE has it.
 *
 * `FindingRecord` WITH ONE MEMBER RETYPED: `createdAt` is a `Date`
 * across the port and arrives here as an ISO-8601 string, because
 * `res.json` serialises through `Date#toJSON`. That is why it is
 * declared rather than imported — and it is held to the same
 * roster the port type is, so a column renamed on either side is a
 * refusal at {@link EVERY_KEY_LISTED} rather than a member no case
 * looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter
 * that `check-types` refuses.
 */
interface WireFinding {
  /** `findings.id`, and the last key of both orderings. */
  readonly id: number;

  /** The domain whose criteria produced it. */
  readonly domainId: number;

  /** The document it was read out of. */
  readonly documentId: number;

  /** The entity it is about, or null. */
  readonly entityId: number | null;

  /** What the pass extracted, answered whole. */
  readonly fields: Record<string, unknown>;

  /** What scoring made of it, or null while nothing has. */
  readonly score: number | null;

  /** Which scoring pass that was, or null beside a null score. */
  readonly scoreVersion: number | null;

  /** When it was made, as JSON carries it. */
  readonly createdAt: string;
}

/** One answered sighting, on {@link WireFinding}'s terms. */
interface WireSighting {
  /** `finding_sightings.id`. */
  readonly id: number;

  /** The finding it cites. */
  readonly findingId: number;

  /** The feed it was seen at. */
  readonly sourceId: number;

  /** What that feed called it, or null. */
  readonly externalId: string | null;

  /** When it was seen, as JSON carries it. */
  readonly seenAt: string;
}

/** One answered ruling, on {@link WireFinding}'s terms. */
interface WireLabel {
  /** `finding_labels.id`, and the tiebreak on the read order. */
  readonly id: number;

  /** The finding it judges. */
  readonly findingId: number;

  /** What was decided. */
  readonly verdict: string;

  /** What was written beside it, or null. */
  readonly note: string | null;

  /** When it was decided, as JSON carries it. */
  readonly labelledAt: string;
}

/** One answered research row, on {@link WireFinding}'s terms. */
interface WireResearch {
  /** `entity_research.id`. */
  readonly id: number;

  /** The subject it is about. */
  readonly entityId: number;

  /** The pass that recorded it, or null. */
  readonly runId: number | null;

  /** What it came to in prose, or null. */
  readonly summary: string | null;

  /** The structured findings of the pass, answered whole. */
  readonly payload: unknown;

  /** When it was recorded, as JSON carries it. */
  readonly researchedAt: string;
}

/** The members a finding row carries, as a response has them. */
const FINDING_KEYS = [
  'createdAt',
  'documentId',
  'domainId',
  'entityId',
  'fields',
  'id',
  'score',
  'scoreVersion',
] as const satisfies readonly (keyof FindingRecord)[];

/** The members a sighting carries. */
const SIGHTING_KEYS = [
  'externalId',
  'findingId',
  'id',
  'seenAt',
  'sourceId',
] as const satisfies readonly (keyof FindingSightingRecord)[];

/** The members a ruling carries. */
const LABEL_KEYS = [
  'findingId',
  'id',
  'labelledAt',
  'note',
  'verdict',
] as const satisfies readonly (keyof FindingLabelRecord)[];

/** The members a research row carries. */
const RESEARCH_KEYS = [
  'entityId',
  'id',
  'payload',
  'researchedAt',
  'runId',
  'summary',
] as const satisfies readonly (keyof FindingResearchRecord)[];

/** The four members a single get answers under `data`. */
const DETAIL_KEYS = [
  'finding',
  'labels',
  'research',
  'sightings',
] as const satisfies readonly (keyof FindingDetail)[];

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
 * The members the value object the handler BUILDS carries.
 *
 * THREE, and no member of the query beside them. This is the
 * roster the recording case reads a handed filter against, and it
 * is pinned two ways: `satisfies` refuses a member `FindingFilter`
 * does not declare, and {@link EVERY_KEY_LISTED} refuses one added
 * to that type and not to this list.
 */
const FILTER_KEYS = [
  'category',
  'verdict',
  'window',
] as const satisfies readonly (keyof FindingFilter)[];

/** The two bounds the port takes, saying which side each closes. */
const WINDOW_KEYS = [
  'sinceInclusive',
  'untilExclusive',
] as const satisfies readonly (keyof TimeWindow)[];

/** The two members a page window is expressed in for a store. */
const STORE_WINDOW_KEYS = [
  'limit',
  'offset',
] as const satisfies readonly (keyof StoreWindow)[];

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
  CoversEveryKey<FindingRecord, typeof FINDING_KEYS>
  & CoversEveryKey<WireFinding, typeof FINDING_KEYS>
  & CoversEveryKey<FindingSightingRecord, typeof SIGHTING_KEYS>
  & CoversEveryKey<WireSighting, typeof SIGHTING_KEYS>
  & CoversEveryKey<FindingLabelRecord, typeof LABEL_KEYS>
  & CoversEveryKey<WireLabel, typeof LABEL_KEYS>
  & CoversEveryKey<FindingResearchRecord, typeof RESEARCH_KEYS>
  & CoversEveryKey<WireResearch, typeof RESEARCH_KEYS>
  & CoversEveryKey<FindingDetail, typeof DETAIL_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<FindingFilter, typeof FILTER_KEYS>
  & CoversEveryKey<TimeWindow, typeof WINDOW_KEYS>
  & CoversEveryKey<StoreWindow, typeof STORE_WINDOW_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to an answered row, to either envelope, to
 * `meta`, to the filter, to either window shape or to the detail,
 * and to none of the lists above, turns {@link EveryKeyListed}
 * into a `never` — `false` for the list that missed it,
 * intersected with the `true` the others still answer — and this
 * initializer is then a TS2322 at this line, before any case can
 * compare an answer against a set that has quietly stopped
 * describing it. Read in a case below, so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link FINDING_KEYS}, sorted at use rather than by hand. */
const FINDING_KEY_SET: readonly string[] = [...FINDING_KEYS].sort();

/** {@link SIGHTING_KEYS}, sorted. */
const SIGHTING_KEY_SET: readonly string[] = [...SIGHTING_KEYS].sort();

/** {@link LABEL_KEYS}, sorted. */
const LABEL_KEY_SET: readonly string[] = [...LABEL_KEYS].sort();

/** {@link RESEARCH_KEYS}, sorted. */
const RESEARCH_KEY_SET: readonly string[] = [...RESEARCH_KEYS].sort();

/** {@link DETAIL_KEYS}, sorted. */
const DETAIL_KEY_SET: readonly string[] = [...DETAIL_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/** {@link FILTER_KEYS}, sorted. */
const FILTER_KEY_SET: readonly string[] = [...FILTER_KEYS].sort();

/** {@link WINDOW_KEYS}, sorted. */
const WINDOW_KEY_SET: readonly string[] = [...WINDOW_KEYS].sort();

/** {@link STORE_WINDOW_KEYS}, sorted. */
const STORE_WINDOW_KEY_SET: readonly string[] = [
  ...STORE_WINDOW_KEYS,
].sort();

/**
 * Every parameter a caller may send that no value object below may
 * carry.
 *
 * DERIVED FROM THE SCHEMA rather than written out: all seven
 * declared parameters, minus the two narrowings the filter really
 * does take. So `page`, `perPage`, `since`, `sort` and `until` are
 * the names a handler forwarding `req.query` would leak into what
 * it hands the port, and a parameter ADDED to the query is in this
 * checked set the day it lands with nothing edited here.
 */
const QUERY_ONLY_KEYS: readonly string[] = Object
  .keys(findingListQuerySchema.shape)
  .filter((key) => !FILTER_KEY_SET.includes(key))
  .sort();

/**
 * @param value - Any answered object.
 * @returns Its keys, sorted, so a comparison is about the SET.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/**
 * @param body - A page as the wire carried it.
 * @returns The rows ids, IN THE ORDER THEY ARRIVED, since what
 *   this file claims about the order is that it survived the
 *   handler unchanged.
 */
function idsOf(body: { data: readonly WireFinding[] }): number[] {
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
 * @param rows - Rows an answer carried, in the order it carried
 *   them.
 * @returns Their ids, order preserved.
 */
function orderedIdsOf(rows: readonly { readonly id: number }[]): number[] {
  return rows.map((row) => row.id);
}

/**
 * The row a page carries at one id.
 *
 * THROWS rather than answering undefined, because what it returns
 * is compared as a whole record: an absent row would otherwise
 * reach `toStrictEqual` as `undefined` and pass against any other
 * absent one, which is a green nobody wrote.
 *
 * @param rows - The page rows.
 * @param id - The finding id to find.
 * @returns That row.
 * @throws Error - When the page carries no row at that id.
 */
function rowFor(rows: readonly WireFinding[], id: number): WireFinding {
  const found = rows.find((row) => row.id === id);

  if (found === undefined) {
    throw new Error(`no answered row carries the id ${id}`);
  }

  return found;
}

/**
 * @param value - A value object a handler built.
 * @returns Which of {@link QUERY_ONLY_KEYS} it carries, sorted. An
 *   empty list is the whole claim, and the planted control in the
 *   same case is what makes that emptiness a reading.
 */
function queryKeysIn(value: object): string[] {
  return keysOf(value).filter((key) => QUERY_ONLY_KEYS.includes(key));
}

/** The list arguments one recorded read was handed. */
interface RecordedRead {
  /** The domain the slug resolved to, never the slug itself. */
  readonly domainId: number;

  /** The value object the handler rebuilt from the query. */
  readonly filter: FindingFilter;

  /** The ordering, which travels BESIDE the filter. */
  readonly sort: FindingSort;

  /** The page window, in the two members a store takes. */
  readonly window: StoreWindow;
}

/**
 * The port with the list arguments kept beside it.
 *
 * A RECORDING WRAPPER RATHER THAN A STUB: every call is forwarded
 * to the planted store, so the case reading these arguments is
 * reading a call that really happened and really answered. A stub
 * would pin the handoff and lose the response in the same case.
 *
 * `countFindings` is recorded separately from `listFindings`,
 * because the claim is that ONE filter reached BOTH — a page whose
 * `meta.total` was counted through a different narrowing describes
 * a different collection from the page beside it.
 *
 * THE RULING'S TWO METHODS ARE FORWARDED AND NOT RECORDED, which
 * is what the router's own store type now asks for. Nothing in
 * this file reads a PATCH through a recording port — the ruling
 * hands the body on unparsed, so there is no rebuilt value object
 * for a log to be the only reading of. They are here to satisfy
 * `VerdictServiceStore`, and a case that wants them recorded adds
 * a log beside the two above rather than a second wrapper.
 *
 * @param store - Where the calls go.
 * @returns The port to build a router over, and the two logs.
 */
function recordingStore(store: MemoryResearchStore): {
  recorded: FindingsServiceStore & VerdictServiceStore;
  reads: RecordedRead[];
  counts: FindingFilter[];
} {
  const reads: RecordedRead[] = [];
  const counts: FindingFilter[] = [];
  const recorded: FindingsServiceStore & VerdictServiceStore = {
    findDomainBySlug: (slug) => store.findDomainBySlug(slug),
    listFindings(domainId, filter, sort, window) {
      reads.push({ domainId, filter, sort, window });

      return store.listFindings(domainId, filter, sort, window);
    },
    countFindings(domainId, filter) {
      counts.push(filter);

      return store.countFindings(domainId, filter);
    },
    findFindingById: (id) => store.findFindingById(id),
    listFindingSightings: (id) => store.listFindingSightings(id),
    listFindingLabels: (id) => store.listFindingLabels(id),
    listFindingResearch: (id) => store.listFindingResearch(id),
    findDomainById: (id) => store.findDomainById(id),
    insertFindingLabel: (input) => store.insertFindingLabel(input),
  };

  return { recorded, reads, counts };
}

/**
 * The first read a recording port kept.
 *
 * THROWS when nothing was recorded, so a handler that answered
 * without calling the port fails here naming the read it wanted
 * rather than asserting over an undefined.
 *
 * @param reads - What {@link recordingStore} kept.
 * @returns The first of them.
 * @throws Error - When the list is empty.
 */
function firstRead(reads: readonly RecordedRead[]): RecordedRead {
  const [read] = reads;

  if (read === undefined) {
    throw new Error('the handler issued no list read at all');
  }

  return read;
}

/**
 * The first filter a recording port kept for a count.
 *
 * @param filters - What {@link recordingStore} kept.
 * @returns The first of them.
 * @throws Error - When the list is empty, on {@link firstRead}'s
 *   terms.
 */
function firstCount(filters: readonly FindingFilter[]): FindingFilter {
  const [filter] = filters;

  if (filter === undefined) {
    throw new Error('the handler issued no count at all');
  }

  return filter;
}

/**
 * The path one domain findings are read under.
 *
 * @param slug - The domain slug, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 *   Derived from {@link FINDINGS_TEMPLATE} rather than spelled
 *   again, and the shapes case asserts no `:` survives the
 *   substitution — an unreplaced parameter still reaches the
 *   router as a literal segment and still answers a plausible
 *   refusal.
 */
function findingsPath(slug: string): string {
  return FINDINGS_TEMPLATE.replace(':slug', slug);
}

/**
 * The path one finding is read under.
 *
 * @param id - The finding id, or whatever a case is sending in its
 *   place.
 * @returns The wire path, on {@link findingsPath}'s terms.
 */
function findingPath(id: number | string): string {
  return FINDING_TEMPLATE.replace(':id', String(id));
}

/**
 * A clock that moves one step on every reading.
 *
 * FIXED AND ADVANCING RATHER THAN THE WALL CLOCK, which is what
 * makes a ruling stamp something a case can assert. Two appends
 * inside one millisecond of wall time tie on `labelled_at`, and
 * the newest-first reading would then rest on the `id` tiebreak
 * alone — a true ordering, but not the one this file says it is
 * reading.
 *
 * @returns A clock of its own, so two stores never share a count.
 */
function advancingClock(): () => Date {
  let readings = 0;

  return () => {
    const at = new Date(Date.parse(CLOCK_START) + readings * CLOCK_STEP_MS);

    readings += 1;

    return at;
  };
}

/**
 * Builds an app carrying one freshly built findings router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read the Express 500 page. What this app leaves
 * out is the framework middleware stack and the auth guard: that
 * the router is mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file failures depend on their
 * order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied to the
 * router, because it takes none: nothing on any of its three
 * routes reads the present, a ruling's `labelledAt` being the
 * store's own stamp.
 *
 * `express.json()` is mounted here for the same reason
 * `applyMiddleware` mounts it in the deployment: the router sets
 * up no body parsing of its own, so without it the ruling's body
 * would reach the service as `undefined`.
 *
 * @param store - What the router acts against. The router's own
 *   intersection rather than either half, so the app this returns
 *   carries all three routes.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildFindingsApp(
  store: FindingsServiceStore & VerdictServiceStore,
): Application {
  const app = express();

  app.use(express.json());
  app.use(buildFindingsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains, four findings and everything hanging off one of
 * them.
 *
 * The smallest fixture every case here can be reached from, and
 * the second domain earns its place: it holds a finding filed
 * under the same category key, so every page below is a scoping
 * reading as well as whatever else it says.
 *
 * @returns The store and the id {@link RADAR} resolved to. The
 *   store rather than an app, because two cases build a router
 *   over a recording port in front of it and the rest build one
 *   over it directly.
 */
async function plantFindings(): Promise<{
  store: MemoryResearchStore;
  domainId: number;
}> {
  const store = createMemoryResearchStore({ now: advancingClock() });
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

  store.setDomainFindings(domain.id, PLANTED_FINDINGS);
  store.setDomainFindings(sibling.id, SIBLING_FINDINGS);
  store.setFindingSightings(JUDGED_ID, PLANTED_SIGHTINGS);
  store.setEntityResearch(ENTITY_ID, PLANTED_RESEARCH);

  for (const ruling of PLANTED_RULINGS) {
    await store.insertFindingLabel(ruling);
  }

  return { store, domainId: domain.id };
}

/**
 * The same fixture with an app in front of it.
 *
 * @returns The app and the domain id, the second so a whole-row
 *   comparison can name the `domainId` a response must carry.
 */
async function withFindings(): Promise<{
  app: Application;
  domainId: number;
}> {
  const { store, domainId } = await plantFindings();

  return { app: buildFindingsApp(store), domainId };
}

/**
 * The whole body a `404` about a finding answers with.
 *
 * One constant rather than a literal at the assertion, which is
 * how this file says the message is the service own sentence
 * arriving unmodified with `code` beside it and nothing else.
 */
const NO_SUCH_FINDING_BODY = {
  code: 'NOT_FOUND',
  message: 'No finding carries that id',
};

/**
 * The whole body a `404` about a domain answers with.
 *
 * A DIFFERENT SENTENCE, which is what the pair is for: a router
 * answering one message for every address it cannot find would
 * satisfy either constant on its own.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/**
 * The whole body an undeclared query parameter answers with.
 *
 * ONE detail naming `query` rather than the parameter, and `query`
 * rather than `body` because `parseQuery` is what the handler
 * called: the two parsers differ ONLY in the name a root-level
 * issue takes, so this constant is also the reading that the list
 * route reached for the right one.
 */
const UNDECLARED_QUERY_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'query',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a sort key outside the tuple answers with.
 *
 * `invalid_value` naming the parameter the caller typed, and the
 * repository fixed sentence for that code rather than the options
 * zod itself would have listed.
 */
const BAD_SORT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'sort',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * @param needle - One sentinel.
 * @returns Whether another sentinel contains it, which would make
 *   a count of one indistinguishable from a count of its
 *   neighbour.
 */
function containedInAnother(needle: string): boolean {
  return SUBMITTED_SENTINELS.some((other) => other !== needle
    && other.includes(needle));
}

/**
 * @param texts - Every response text a case is reading.
 * @param needle - The string to count across all of them.
 * @returns How many times it occurs in total.
 */
function totalOccurrences(texts: readonly string[], needle: string): number {
  return texts.reduce((sum, text) => sum + countOccurrences(text, needle), 0);
}

/**
 * @param texts - The response texts.
 * @param occurrences - What each sentinel must be counted at.
 * @returns One `{ needle, occurrences }` per sentinel, so a
 *   failure names WHICH one leaked rather than reporting a total.
 */
function sentinelCounts(
  texts: readonly string[],
  occurrences?: number,
): { needle: string; occurrences: number }[] {
  return SUBMITTED_SENTINELS.map((needle) => ({
    needle,
    occurrences: occurrences ?? totalOccurrences(texts, needle),
  }));
}

// ---------------------------------------------------------------------------
// What the fixture plants, and the vocabulary behind every refusal
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants findings a page must reorder to answer', async () => {
    const { app } = await withFindings();

    // The answered order is neither the order the rows were
    // planted in nor its reverse, which is what makes the ordering
    // assertion in the page case a reading: a store answering rows
    // in insertion order and one answering them backwards each
    // produce a different list from the one right answer.
    expect(SCORE_ORDER).not.toStrictEqual(PLANT_ORDER);
    expect(SCORE_ORDER).not.toStrictEqual([...PLANT_ORDER].reverse());
    // The second domain holds a finding of its own, so every page
    // below is a scoping reading as well.
    expect(SIBLING_FINDINGS.length).toBeGreaterThan(0);
    expect(PLANT_ORDER).not.toContain(SIBLING_ID);
    // No planted finding carries the id the `404` case names,
    // which no assertion in that case could say for itself: an id
    // that had collided with a planted row would answer `200` and
    // read as a refusal that stopped happening.
    expect(PLANT_ORDER).not.toContain(MISSING_ID);
    // The three embedded lists are three DIFFERENT lengths, so two
    // of them swapped in the assembly is reportable at all.
    expect([...new Set(EMBEDDED_LENGTHS)]).toHaveLength(
      EMBEDDED_LENGTHS.length,
    );
    // And the rows really are there, which the counts above cannot
    // say: a fixture whose plant seam had stopped planting would
    // satisfy every premise in this case.
    const page = await request(app).get(findingsPath(RADAR));

    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(PLANTED_COUNT);
  });

  it('reads the query vocabulary off the schema', () => {
    // Read off `findingListQuerySchema`'s own shape rather than
    // trusting a literal, so the undeclared-parameter pair stays
    // two-directional: a parameter ADDED to the query makes the
    // refused request legal and reddens here, and one REMOVED
    // makes a declared member refusable and reddens here too.
    const declared = Object.keys(findingListQuerySchema.shape);

    expect(declared).toContain('page');
    expect(declared).toContain('sort');
    expect(declared).toContain('since');
    expect(declared).not.toContain(UNDECLARED_PARAM);
    // The checked set is that vocabulary minus the two narrowings
    // a filter really does take, so it is non-empty and disjoint
    // from what a filter may carry. Both halves matter: an empty
    // roster would make the recording case a search that could
    // only ever come back clean.
    expect(QUERY_ONLY_KEYS.length).toBe(declared.length - 2);
    expect(QUERY_ONLY_KEYS.length).toBeGreaterThan(0);
    expect(QUERY_ONLY_KEYS.filter((key) => FILTER_KEY_SET.includes(key)))
      .toStrictEqual([]);
    // No sentinel contains another, so a count of one in the
    // containment case cannot be a count of a substring of its
    // neighbour, and none of them is a word an envelope says.
    expect(SUBMITTED_SENTINELS.filter(containedInAnother))
      .toStrictEqual([]);
    expect(new Set(SUBMITTED_SENTINELS).size)
      .toBe(SUBMITTED_SENTINELS.length);
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to an answered row, to either envelope, to `meta`, to
    // the filter, to either window or to the detail and to none of
    // the lists is a TS2322 at that declaration, before any
    // assertion below can compare an answer against a set that has
    // quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // between the two success shapes this router writes.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And the derived paths are real substitutions rather than
    // templates that reached Express as one: an unreplaced
    // parameter is still a literal segment and still answers a
    // plausible refusal.
    expect(FINDINGS_TEMPLATE).toContain(':slug');
    expect(FINDING_TEMPLATE).toContain(':id');
    expect(findingsPath(RADAR)).not.toContain(':');
    expect(findingPath(MISSING_ID)).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// The page: the envelope, the window it echoes and the rows in it
// ---------------------------------------------------------------------------

describe('a findings page that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, domainId } = await withFindings();
    const findings = findingsPath(RADAR);

    const whole = await request(app).get(findings);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, and a `total` taken from the rows in hand
    // answers 1 to each of the narrow pair.
    const first = await request(app)
      .get(findings)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(findings)
      .query({ page: PLANTED_COUNT, perPage: 1 });

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
    // having been a default.
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_COUNT,
      totalPages: 1,
    });
    // The order reaches the wire as the port answered it, which is
    // the only half of the ordering this file owns: nothing in the
    // handler re-sorts a page it was handed, and a handler that
    // did would be answering a different order from the one the
    // window was taken under.
    expect(idsOf(whole.body)).toStrictEqual(SCORE_ORDER);
    // And the page is scoped: the second domain finding is filed
    // under the same category key and carries a score between two
    // of these, so a handler that had stopped resolving the slug
    // would answer four rows here.
    expect(idsOf(whole.body)).not.toContain(SIBLING_ID);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data as WireFinding[]) {
      expect(keysOf(row)).toStrictEqual(FINDING_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. `createdAt` is asserted as the ISO
    // spelling because that conversion is the framework own and is
    // the one member whose type changes crossing `res.json`.
    expect(rowFor(whole.body.data as WireFinding[], JUDGED_ID))
      .toStrictEqual({
        id: JUDGED_ID,
        domainId,
        documentId: 1,
        entityId: ENTITY_ID,
        fields: { category: PEOPLE },
        score: 0.9,
        scoreVersion: 1,
        createdAt: new Date(FIRST_MADE).toISOString(),
      });
    // The two narrow windows are disjoint, each holds the row the
    // ordering puts at that position, and each names the total of
    // the COLLECTION, which no page could have counted from its
    // own rows.
    expect(idsOf(first.body)).toStrictEqual([SCORE_ORDER[0]]);
    expect(idsOf(last.body)).toStrictEqual([SCORE_ORDER[PLANTED_COUNT - 1]]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_COUNT,
      totalPages: PLANTED_COUNT,
    });
    expect(last.body.meta).toStrictEqual({
      page: PLANTED_COUNT,
      perPage: 1,
      total: PLANTED_COUNT,
      totalPages: PLANTED_COUNT,
    });
  });
});

// ---------------------------------------------------------------------------
// The handoff: what the handler builds out of the query
// ---------------------------------------------------------------------------

describe('what the handler hands the store', () => {
  it('rebuilds the query as the value objects the port takes', async () => {
    const { store, domainId } = await plantFindings();
    const { recorded, reads, counts } = recordingStore(store);
    const app = buildFindingsApp(recorded);

    const page = await request(app)
      .get(findingsPath(RADAR))
      .query({
        category: PEOPLE,
        page: 2,
        perPage: 1,
        since: SINCE_STAMP,
        sort: RECENCY_SORT,
        until: UNTIL_STAMP,
        verdict: CONFIRMED,
      });
    const read = firstRead(reads);

    expect(page.status).toBe(200);
    // The slug was RESOLVED before anything was read: what reaches
    // the port is the id the domain lookup answered, and a handler
    // forwarding the segment could not produce it.
    expect(read.domainId).toBe(domainId);
    // THE FILTER IS THE PORT OWN VALUE OBJECT AND NOT THE QUERY.
    // Three members, and not one of the five parameters a caller
    // may send beside the two narrowings.
    expect(keysOf(read.filter)).toStrictEqual(FILTER_KEY_SET);
    expect(queryKeysIn(read.filter)).toStrictEqual([]);
    expect(read.filter.category).toBe(PEOPLE);
    expect(read.filter.verdict).toBe(CONFIRMED);
    // The window inside it says which side each bound closes and
    // holds instants rather than the strings a caller typed, which
    // is the whole of what `toTimeWindow` was called for.
    expect(keysOf(read.filter.window)).toStrictEqual(WINDOW_KEY_SET);
    expect(read.filter.window.sinceInclusive).toBeInstanceOf(Date);
    expect(read.filter.window.untilExclusive).toBeInstanceOf(Date);
    expect(read.filter.window.sinceInclusive?.getTime())
      .toBe(Date.parse(SINCE_STAMP));
    expect(read.filter.window.untilExclusive?.getTime())
      .toBe(Date.parse(UNTIL_STAMP));
    // The sort travels BESIDE the filter rather than inside it,
    // because `countFindings` takes no ordering: an ordering
    // cannot change how many rows a predicate selects.
    expect(read.sort).toBe(RECENCY_SORT);
    // And the page window is the two members a store takes rather
    // than the two a caller sent, with the offset arithmetic
    // already done: `?page=2&perPage=1` is one row skipped.
    expect(keysOf(read.window)).toStrictEqual(STORE_WINDOW_KEY_SET);
    expect(read.window).toStrictEqual({ limit: 1, offset: 1 });
    // ONE filter reached BOTH reads, which is what keeps a page
    // `meta.total` describing the page own collection: a total
    // counted through a different narrowing would be answering
    // about a different set of rows.
    expect(firstCount(counts)).toStrictEqual(read.filter);
    expect(reads).toHaveLength(1);
    expect(counts).toHaveLength(1);
    // The planted control for the empty list above, counted by the
    // same function in the same case: a filter built by forwarding
    // the parsed query carries EVERY one of those five names, so
    // the zero is a reading rather than a search that could only
    // ever come back clean.
    const forwarded = {
      category: PEOPLE,
      page: 2,
      perPage: 1,
      since: SINCE_STAMP,
      sort: RECENCY_SORT,
      until: UNTIL_STAMP,
      verdict: CONFIRMED,
    };

    expect(queryKeysIn(forwarded)).toStrictEqual(QUERY_ONLY_KEYS);
    // And the narrowing really narrowed, so the recording above is
    // of a call that answered rather than of one that was made:
    // three planted findings, one of them under this category,
    // inside this window and standing under this verdict.
    expect(page.body.meta.total).toBe(1);
    expect(page.body.data).toHaveLength(0);
  });

  it('hands the same three shapes when nothing narrows', async () => {
    const { store } = await plantFindings();
    const { recorded, reads } = recordingStore(store);
    const app = buildFindingsApp(recorded);

    const page = await request(app).get(findingsPath(RADAR));
    const read = firstRead(reads);

    expect(page.status).toBe(200);
    // The filter carries the SAME three members with nothing to
    // narrow on, which is what says it is rebuilt member by member
    // rather than assembled out of whichever parameters arrived: a
    // handler spreading the parsed query would answer a filter of
    // two members here and of seven above.
    expect(keysOf(read.filter)).toStrictEqual(FILTER_KEY_SET);
    expect(queryKeysIn(read.filter)).toStrictEqual([]);
    expect(read.filter.category).toBeUndefined();
    expect(read.filter.verdict).toBeUndefined();
    // Unbounded is two nulls rather than an omitted member, which
    // is what `FindingFilter` declares and what the port reads as
    // every instant.
    expect(read.filter.window).toStrictEqual({
      sinceInclusive: null,
      untilExclusive: null,
    });
    // The default ordering is the tuple FIRST member, taken from
    // the tuple rather than spelled again here.
    expect(read.sort).toBe(FINDING_SORT_KEYS[0]);
    expect(read.window).toStrictEqual({
      limit: DEFAULT_PER_PAGE,
      offset: 0,
    });
    expect(page.body.data).toHaveLength(PLANTED_COUNT);
  });
});

// ---------------------------------------------------------------------------
// The single get: one finding and the three lists under it
// ---------------------------------------------------------------------------

describe('one finding and the three lists under it', () => {
  it('answers 200 with sightings, labels and research', async () => {
    const { app, domainId } = await withFindings();

    const answer = await request(app).get(findingPath(JUDGED_ID));
    const detail = answer.body.data as {
      finding: WireFinding;
      sightings: readonly WireSighting[];
      labels: readonly WireLabel[];
      research: readonly WireResearch[];
    };

    expect(answer.status).toBe(200);
    // TWO members and not three: this read applies no window, so
    // there is no `meta` to describe one. The three lists inside
    // are embedded rather than paged.
    expect(keysOf(answer.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(answer.body.data)).toStrictEqual(DETAIL_KEY_SET);
    expect(keysOf(detail.finding)).toStrictEqual(FINDING_KEY_SET);
    expect(detail.finding).toStrictEqual({
      id: JUDGED_ID,
      domainId,
      documentId: 1,
      entityId: ENTITY_ID,
      fields: { category: PEOPLE },
      score: 0.9,
      scoreVersion: 1,
      createdAt: new Date(FIRST_MADE).toISOString(),
    });
    // THREE DIFFERENT LENGTHS, in the order the detail declares
    // them: two lists swapped in the assembly is invisible to any
    // reading over lists of equal length, and the fixture guard is
    // what says these three are distinguishable at all.
    expect([
      detail.sightings.length,
      detail.labels.length,
      detail.research.length,
    ]).toStrictEqual(EMBEDDED_LENGTHS);
    // Every row of each list, so an embedded list cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of detail.sightings) {
      expect(keysOf(row)).toStrictEqual(SIGHTING_KEY_SET);
    }

    for (const row of detail.labels) {
      expect(keysOf(row)).toStrictEqual(LABEL_KEY_SET);
    }

    for (const row of detail.research) {
      expect(keysOf(row)).toStrictEqual(RESEARCH_KEY_SET);
    }

    // The rulings arrive NEWEST FIRST, which is what makes the
    // head of that list the verdict in force. The two were
    // appended in the opposite order and carry different verdicts,
    // so a read answering them as written is a different list.
    expect(detail.labels.map((row) => row.verdict))
      .toStrictEqual(RULINGS_NEWEST_FIRST);
    const [newest, older] = detail.labels;

    expect(Date.parse(newest?.labelledAt ?? ''))
      .toBeGreaterThan(Date.parse(older?.labelledAt ?? ''));
    // The research arrives newest first too, and it is reached
    // through the finding own `entityId` rather than named by the
    // request: nothing in the path says which entity this is.
    expect(orderedIdsOf(detail.research))
      .toStrictEqual(RESEARCH_NEWEST_FIRST);
    // One row of each of the two lists WHOLE, against the
    // constants the fixture plants from. The research row chosen
    // is the one carrying two nulls, so the nullable members reach
    // the wire as themselves rather than as absent keys.
    expect(detail.sightings[0]).toStrictEqual({
      id: 21,
      findingId: JUDGED_ID,
      sourceId: 31,
      externalId: 'radar-11',
      seenAt: new Date('2026-03-01T01:00:00.000Z').toISOString(),
    });
    expect(detail.research[0]).toStrictEqual({
      id: 43,
      entityId: ENTITY_ID,
      runId: null,
      summary: null,
      payload: { note: 'outside a run' },
      researchedAt: new Date('2026-03-03T02:00:00.000Z').toISOString(),
    });
  });

  it('answers three empty lists rather than a 404', async () => {
    const { app } = await withFindings();

    // The control the case above cannot supply, and the state that
    // says an empty list is a STATE: a finding attributed to
    // nobody, judged by nobody and cited by nothing is answered
    // with the same envelope and three empty positions rather than
    // with a refusal or with a member left out.
    const answer = await request(app).get(findingPath(BARE_ID));
    const detail = answer.body.data as {
      finding: WireFinding;
      sightings: readonly WireSighting[];
      labels: readonly WireLabel[];
      research: readonly WireResearch[];
    };

    expect(answer.status).toBe(200);
    expect(keysOf(answer.body.data)).toStrictEqual(DETAIL_KEY_SET);
    expect(detail.finding.id).toBe(BARE_ID);
    // Attributed to nothing, which is why the research list is
    // empty however much was planted under the entity beside it.
    expect(detail.finding.entityId).toBeNull();
    expect(detail.finding.score).toBeNull();
    expect(detail.finding.scoreVersion).toBeNull();
    expect(detail.sightings).toStrictEqual([]);
    expect(detail.labels).toStrictEqual([]);
    expect(detail.research).toStrictEqual([]);
    // And the planted rows are still reachable through the finding
    // that owns them, so the three empty lists above are about
    // THIS finding rather than about a fixture that planted
    // nothing.
    const judged = await request(app).get(findingPath(JUDGED_ID));

    expect(judged.body.data.research).toHaveLength(
      PLANTED_RESEARCH.length,
    );
  });
});

// ---------------------------------------------------------------------------
// The address: an id naming no finding, and a slug naming no domain
// ---------------------------------------------------------------------------

describe('an id naming no finding', () => {
  it('answers 404, and 200 for an id that is', async () => {
    const { app } = await withFindings();

    const missing = await request(app).get(findingPath(MISSING_ID));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies
    // the assertion above on its own.
    const found = await request(app).get(findingPath(JUDGED_ID));
    // And the sibling refusal, which is what says the two lookups
    // are two lookups: a handler answering one sentence for every
    // address it cannot find would satisfy either constant alone.
    const noDomain = await request(app).get(findingsPath(MISSING_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_FINDING_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.finding.id).toBe(JUDGED_ID);
    expect(noDomain.status).toBe(404);
    expect(noDomain.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(NO_SUCH_FINDING_BODY.message)
      .not.toBe(NO_SUCH_DOMAIN_BODY.message);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter this route does not declare, and what
// nothing a caller submitted comes back as
// ---------------------------------------------------------------------------

describe('a query parameter this route does not declare', () => {
  it('answers 422 naming the query rather than the parameter', async () => {
    const { app } = await withFindings();
    const findings = findingsPath(RADAR);

    const undeclared = await request(app)
      .get(findings)
      .query({ page: 1, [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    // The control is the identical request with that parameter
    // removed, so the pair says the refusal is about the key
    // rather than about a route refusing every query it is handed
    // — and `?page=1` is legal on its own, which is what makes the
    // difference between the two requests the one member.
    const declared = await request(app)
      .get(findings)
      .query({ page: 1 });

    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(declared.status).toBe(200);
    expect(declared.body.data).toHaveLength(PLANTED_COUNT);
  });

  it('quotes no value any request in this file submitted', async () => {
    const { app } = await withFindings();
    const findings = findingsPath(RADAR);

    // FOUR RESPONSES AND FOUR CHANNELS. Two refuse the request and
    // two answer it, which is the half that matters most: an empty
    // page is exactly where a handler echoing its own filter back
    // would be least visible, there being no rows to read it
    // against.
    const undeclared = await request(app)
      .get(findings)
      .query({ [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    const badSort = await request(app)
      .get(findings)
      .query({ sort: MISSING_SORT });
    const unmatched = await request(app)
      .get(findings)
      .query({ category: MISSING_CATEGORY, verdict: MISSING_VERDICT });
    const noDomain = await request(app).get(findingsPath(MISSING_SLUG));

    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(badSort.status).toBe(422);
    expect(badSort.body).toStrictEqual(BAD_SORT_BODY);
    // The narrowed page LANDS and holds nothing, which is what the
    // port answers for a verdict no label carries and a category
    // key the domain never declared: an empty page rather than a
    // refusal, so this surface never tells a caller that a value
    // it filtered on does not exist.
    expect(unmatched.status).toBe(200);
    expect(unmatched.body.data).toStrictEqual([]);
    expect(unmatched.body.meta.total).toBe(0);
    expect(noDomain.status).toBe(404);

    const answered = [
      JSON.stringify(undeclared.body),
      JSON.stringify(badSort.body),
      JSON.stringify(unmatched.body),
      JSON.stringify(noDomain.body),
    ];

    expect(sentinelCounts(answered)).toStrictEqual(sentinelCounts([], 0));
    // The search would find them: a planted envelope carrying
    // every needle is counted by the same function in the same
    // case, so the zeros above are a reading rather than a search
    // that could only ever answer nothing.
    const planted = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: SUBMITTED_SENTINELS.join(' and '),
    });

    expect(sentinelCounts([planted]))
      .toStrictEqual(sentinelCounts([], 1));
    // Every envelope was built at all: a body that never arrived
    // would satisfy every count above.
    for (const text of answered) {
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
