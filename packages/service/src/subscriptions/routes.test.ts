/**
 * `src/subscriptions/routes.ts` — what each of the five routes
 * puts on the wire, when it refuses and when it lands: the status,
 * the envelope, the details a refusal carries and the row an
 * answer does. Driven over supertest against a router built by the
 * real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the WIRE, and
 * only the wire. That a taken triple is a `ConflictError` from
 * both writes that can propose one, that a `connectorId` naming
 * no row is a `ValidationError` and not a `NotFoundError`, that a
 * disabled row refuses the verb, that a create defaults `enabled`
 * and a patch rewrites only what it names — those are claims
 * about the RULES and are pinned one file over, over direct
 * calls. What no call can report is whether the rule reached a
 * caller: the status `errorHandler` or the handler chose, the
 * envelope written around it, the members that envelope carried,
 * the window a page was cut to, the shape a `Date` took crossing
 * `res.json`, and whether a handler swallowed a throw on the way.
 * So every case below reads a response and none of them reads a
 * return value.
 *
 * TWENTY-THREE CASES IN TWO HALVES, plus three guards. TWELVE
 * cover eight ways a request to this router can be WRONG: an
 * unknown slug, an unknown id, a segment that is not an id, a
 * segment that is not a slug, a `format` outside the tuple, a
 * `connectorId` naming no row, a triple the domain already holds,
 * and a disabled row met by the verb. EIGHT cover what the five
 * routes answer when they LAND, one section per route, with the
 * page, the create and the verb taking two apiece. The three
 * guards are the two the tuple and triple cases rest on and one
 * holding every shape the second half asserts against the type
 * that declares it.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no subscription is `404` on all
 * three that take one, each asserted against ONE shared body
 * constant per ADDRESS rather than five literals that agree today.
 * The constants are per address and not per status: a `404` about a
 * domain and a `404` about a subscription are two envelopes on one
 * router, and five handlers are five chances to answer a missing
 * row five different ways. A segment that is not an ADDRESS at all
 * is `422` naming `id` or `slug` and never `404` — a `404` says the
 * row is not there, and a request that never named a row has not
 * established that. Both of those are asserted across every route
 * that shares each segment inside one case, because three handlers
 * are three chances to narrow only two of them. The slug half is
 * the only reading here that `readSlug` narrows at all: every other
 * slug case sends a well-formed slug, so an unnarrowed segment
 * answers exactly the `404` they already assert — measured, as the
 * grid below records, and the same zero `src/topics/routes.test.ts`
 * found on its own slug leg.
 *
 * THE PAYLOAD. A `format` outside `EXPORT_FORMATS` is `422` whose
 * one detail names `format` with code `invalid_value`, from the
 * create AND from the rename of a format, because
 * `patchSubscriptionSchema` carries the member. Its control is the
 * only one in the file taken off a RUNTIME tuple rather than a
 * literal: the guard below asserts that the refused spelling is
 * absent from `EXPORT_FORMATS` and that the accepted one is in it,
 * so a member added to that tuple reddens the guard rather than
 * leaving a case asserting a refusal that has quietly become legal.
 *
 * A `connectorId` NAMING NO CONNECTOR is `422` and not `404`, from
 * both writes that can name one, which is the difference between an
 * address and a payload: a `:slug` is where the request was SENT
 * and a `connectorId` is something it SUBMITTED. The detail names
 * `connectorId` and carries `code: 'unknown_connector'`, the
 * service's own code rather than one of zod's, and the whole
 * envelope is asserted — the id the request sent is the one value
 * this refusal could quote back and does not.
 *
 * A TRIPLE THE DOMAIN ALREADY SUBSCRIBES TO is `409` with
 * `code: 'CONFLICT'` from the create AND from the re-format, which
 * is the translation being pinned rather than merely that something
 * was thrown: `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers `500`. Both writes are driven because
 * `patchSubscriptionSchema` carries two thirds of the key, so each
 * is a separate call site a module could stop translating on its
 * own. The create carries the control the other two cannot stand in
 * for: the SAME pair under a SECOND domain is accepted, which is
 * what says the key is a triple rather than a pair.
 *
 * THE STATE. A run now against a disabled subscription is `409`,
 * asserted as the WHOLE envelope — `code`, `message` and no
 * `details` at all, since this verb reads no body and has no member
 * to name. Its control is the identical call against a row
 * differing in `enabled` alone, which answers `200`. That pair is
 * what makes the refusal a guard on a COLUMN rather than a route
 * refusing every run now it is handed.
 *
 * THE PAGE. `okPage` writes THREE members where `ok` writes two,
 * and the `meta` is the difference: the list case reads it whole
 * against a window it asked for, then twice more through windows
 * of ONE over the same three rows — which is the only shape that
 * separates a `total` describing the COLLECTION from one counted
 * off the page in hand. Both are readings no refusal case can
 * take, since none of them can afford a window narrower than its
 * own collection. The page is ordered by `format` ascending with
 * the connector id beside it, and the planted rows make the first
 * column a claim: the digest row was written first and sorts
 * second while the staged row was written last and sorts first.
 * The second column is a claim in the create section instead, for
 * the reason that section gives. A page past the end of the
 * collection is `200` with an empty `data` and a `meta` still
 * describing the whole, not a `404`.
 *
 * THE WRITES ARE READ BACK THROUGH THE OTHER OPERATION, every one
 * of them, because a handler answering a row it never stored
 * satisfies every assertion made against its own response and this
 * surface has no single-item GET to ask with. So the create, the
 * patch and the verb each end on a LIST, and what they compare
 * there is a whole record rather than the members they wrote — a
 * neighbour gaining a member or losing one on the way past a write
 * is then a red case rather than something nobody looked at.
 *
 * THE ROW IS ANSWERED WHOLE AND ITS KEY SET IS ASSERTED, which is
 * the drift guard a field read cannot be: a column added to the
 * projection reaches the wire unasserted otherwise. Both
 * directions are closed — `satisfies` where a list names a member
 * the record lacks, {@link EVERY_KEY_LISTED} where the record
 * grows one nothing here learned about — and the second matters
 * on this table, since `export_subscriptions` takes its
 * schedulable columns from a helper `topics` shares.
 *
 * THE VERB WRITES THE CLOCK'S INSTANT AND NOTHING ELSE. The
 * equality is exact because the router is HANDED its clock rather
 * than reading the present, and it is read against the due time
 * the row carried until the request was sent — a value the same
 * response could otherwise have answered. What no assertion on the
 * verb's own subject could report is a write that spread, landed
 * on the wrong row or cleared the column, so both verb cases end
 * on a record of every row's due time: the fixture plants two rows
 * sharing an instant and one carrying none, which is what makes
 * all three of those faults visible in one comparison.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every refusal assertion below, and one that answered a fixed row
 * to everything would satisfy most of the rest, so each case
 * carries its own control in the same body, varied along the axis
 * under test: each `404` reads what IS there through the SAME
 * operation, the not-an-id case ends on an id that is one, the two
 * `409`s create and re-format under a free triple, the bad
 * `format` and the bad `connectorId` are each resent with that one
 * member corrected, and the disabled row is read against an
 * enabled one. On the second half the controls are the sparse
 * create beside the whole one, the two narrow windows beside the
 * wide read, the untouched neighbour beside every write, the
 * second delete answering `404`, and — for the retry — the first
 * call having MOVED the row, without which a pair of matching
 * answers is equally green against a verb that wrote nothing
 * either time.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s. The pagination window is
 * `src/http/schemas.ts`'s and is pinned against a route by the
 * sibling groups that extend or replace it; this list route reads
 * that schema unchanged and adds no parameter of its own, so what
 * the cases below read of it is the window it SERVED rather than
 * the bounds it holds. That a create, a patch and the verb move
 * `next_run_at` and no other column is
 * `src/subscriptions/service.test.ts`'s claim over direct calls —
 * what is added here is that the row reaching a caller is the
 * stored one. And the collation the page's order rests on is the
 * in-memory store's `<`, so the drizzle implementation answering
 * the same order is `tests/live/api-wave2.live.test.ts`'s.
 *
 * MUTATION GRID, measured over all twenty-three cases by reading
 * the failed `fullName` SET from a `--reporter=json` run rather
 * than a count, with each leg's collected count asserted at
 * twenty-three so an edit that broke collection cannot score a
 * zero. FOURTEEN legs, each named by the EDIT it makes: ten over
 * `routes.ts` and four over
 * `tests/helpers/memory-research-store.ts`, which is where the
 * page's order and the schedule write live and where no mutation
 * of this router could reach. Every ten-leg figure is split into
 * the reds OUTSIDE the second half and the reds inside it, because
 * the first number is what says a leg was rebuilt rather than
 * re-derived into a neighbour: all ten came back at exactly the
 * figure the refusals-only file recorded.
 *
 * THE ADDRESS LEGS ARE THE BIGGEST AND THE SMALLEST. Returning the
 * `:id` segment raw reddens ELEVEN, seven outside the second half
 * and four in it, which is every case that gets an answer OUT OF
 * THE STORE by id rather than every case that names one: the two
 * `format` writes are absent because the create names no id at
 * all and the patch's body is parsed before its id is used, the
 * connector case is in the set only through the accepted control
 * beside it, and neither list case nor either create case names an
 * id in the first place. Returning the `:slug` segment raw still
 * reddens exactly ONE — the not-a-slug case — and the second half
 * moved it not at all, every slug this file sends outside that
 * case being well-formed. That one is the whole reason the case
 * exists.
 *
 * THE FOUR STATUS LEGS EACH GAINED THE CASES NOW NAMED FOR THEM,
 * and the halves read differently. Answering the `POST` with `200`
 * reddens FIVE, the three refusal controls no one of which is
 * named for a create plus both create cases. Answering `204` as
 * `200` reddens THREE (two, plus the delete), the `PATCH` with
 * `204` FOUR (three, plus the patch), and the verb `202` FOUR
 * (two, plus both verb cases). So each status was pinned by a
 * control before it had a case, and is now pinned by both.
 *
 * THE INJECTED CLOCK IS LIVE, and that is worth saying because the
 * equivalent leg on the topics pause is absorbed by a later-of
 * pivot and reads zero. Reading `new Date()` in place of
 * `options.clock` reddens FOUR, two apiece: the router is handed a
 * FIXED instant and every case reading the answered `nextRunAt`
 * back compares against it exactly.
 *
 * THE THREE WINDOW ZEROS THE REFUSALS-ONLY FILE RECORDED ARE THE
 * ONES THIS HALF EXISTS TO CLOSE, and all three land on the list
 * section. Fixing `toStoreWindow` to `{ limit: 50, offset: 0 }`
 * and taking `total` from the rows in hand each redden TWO, the
 * same two, since only a window narrower than the collection can
 * report either. Dropping `meta` from the list envelope reddens
 * FIVE rather than two: `okPage` to `ok` takes the member every
 * read-back in the file counts a collection through, so the
 * create, the patch and the delete are in the set as well.
 *
 * FOUR STORE LEGS, because the page's ORDER and the schedule WRITE
 * are the fake's rather than this router's and no edit to
 * `routes.ts` can reach either. Dropping the connector tie-break
 * from `orderedSubscriptions` reddens exactly ONE — the second
 * create case, which is the only place two rows share a format —
 * and that single red is the whole reason that case writes its two
 * rows in the wrong order. Reversing the format comparison is
 * BLUNT at five, every case that reads a page. Having
 * `updateSubscriptionSchedule` write the instant onto EVERY row
 * reddens THREE, both verb cases and the patch's due-time record;
 * having it store nothing at all is blunt at five, both because
 * the fixture plants its two due times through that same method.
 */
import type { SubscriptionRecord } from './store.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
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
import { EXPORT_FORMATS } from '../db/schema/values.js';

import { buildSubscriptionsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('subscriptions-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It subscribes to {@link STORED_FORMAT} at the same connector the
 * first domain does, which is the widening control the duplicate
 * case rests on: the key is over the whole triple, so a store or a
 * service holding only the pair cannot even build this fixture.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * A slug the schema itself refuses, rather than one no row carries.
 *
 * Upper case, which `slugParamSchema` refuses and which a lookup
 * would simply not find. That is the whole point of the case it
 * serves: without a segment the pattern rejects, an unnarrowed
 * `:slug` answers exactly the `404` every other slug case asserts.
 */
const MALFORMED_SLUG = 'Example-Radar';

/**
 * An id no planted subscription carries.
 *
 * Far past the four the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/**
 * An id no planted connector carries.
 *
 * Distinct from {@link ABSENT_ID} rather than shared with it: the
 * two stand for missing rows in two different tables and the
 * refusals they produce differ in status, so one number standing
 * for both would let a case pass while naming the wrong table.
 */
const ABSENT_CONNECTOR_ID = 424242;

/** The format {@link STORED_SLUG} and {@link OTHER_SLUG} share. */
const STORED_FORMAT = 'obsidian_md';

/** A second format {@link STORED_SLUG} takes to the same connector. */
const SECOND_FORMAT = 'rss';

/** The format the disabled row the verb refuses delivers in. */
const STAGED_FORMAT = 'notion_md';

/**
 * A member of {@link EXPORT_FORMATS} no planted row delivers in.
 *
 * Every control that has to LAND a write uses it, so no control in
 * this file can be refused by the natural key it is not about.
 */
const FREE_FORMAT = 'pdf';

/**
 * A format the tuple does not carry, shaped like one that could.
 *
 * Lower case with no separator, so what refuses it is the
 * membership rule rather than any narrowing of the string: a
 * sentinel shaped unlike a format would be testing a rule this
 * schema does not have.
 */
const UNKNOWN_FORMAT = 'csv';

/**
 * A day, as the cadence every planted subscription and every
 * accepted body below delivers at.
 *
 * Named rather than repeated, so no reader has to wonder which of
 * the cases is varying the number.
 */
const DAILY = 86400;

/**
 * The instant the router's clock answers in every case here.
 *
 * A literal rather than the present, because the run-now control
 * writes what its clock answered and reads it back off the
 * response. A router reading the real present answers a plausible
 * instant no assertion could pin at all.
 */
const FIXED_INSTANT = '2026-08-31T09:00:00.000Z';

/**
 * The due time two of the planted rows carry.
 *
 * LATER than {@link FIXED_INSTANT} rather than merely different,
 * and the guard below asserts that ordering: what the run-now case
 * reads is that a row due tomorrow came back due NOW, so a verb
 * that had quietly become a no-op answers the value this constant
 * holds and is reported by name rather than by a null.
 */
const DUE_LATER = '2026-09-01T00:00:00.000Z';

/** Ten minutes, as the floor one patch below sets and then clears. */
const TEN_MINUTES = 600;

/** Half a day, as the cadence one patch below retunes to. */
const HALF_DAILY = 43200;

/** A week, as the ceiling one patch below sets and leaves alone. */
const WEEKLY = 604800;

/** The window this surface serves when a request asked for none. */
const DEFAULT_PER_PAGE = 50;

/**
 * A page past the end of every collection this file builds.
 *
 * Far enough that no window the cases below ask for reaches it, so
 * the empty page it answers is an overshoot rather than a
 * collection that happens to have run out.
 */
const PAST_THE_END = 99;

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/subscriptions/service.ts`'s constant; what is
 * pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/**
 * The whole body a `404` about a subscription answers with.
 *
 * Names the resource in full rather than as a subscription, which
 * is the service's own wording for the reason it gives: a caller
 * reading this sentence has just addressed `/exports/:id`, and the
 * table is `export_subscriptions`.
 */
const NO_SUCH_SUBSCRIPTION_BODY = {
  code: 'NOT_FOUND',
  message: 'No export subscription carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on all three routes
 * that take an `:id`.
 */
const NOT_AN_ID_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'id',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The whole body a segment that is not a slug answers with.
 *
 * `invalid_format` and not `invalid_type`, because a path segment
 * is already a string: what `slugParamSchema` refuses is its SHAPE.
 * Asserted from one constant on both routes that take a `:slug`,
 * which are not the three that take an `:id`.
 */
const NOT_A_SLUG_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'slug',
    message: 'Not in the expected format.',
    code: 'invalid_format',
  }],
};

/**
 * The whole body a `format` outside the tuple answers with.
 *
 * `invalid_value`, which is what a zod enum raises, and its message
 * names the fact rather than the five members or the one submitted
 * — `src/http/validation.ts` draws every detail message from a
 * fixed vocabulary and copies nothing out of the request.
 */
const NOT_A_FORMAT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'format',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a `connectorId` naming no row answers with.
 *
 * `422` rather than `404`, and a `code` the service declares rather
 * than one of zod's: the shape was legal and the value was a
 * positive integer, and what failed is a question only the store
 * could answer. The id the request sent is nowhere in it, which is
 * the claim its case makes by asserting the whole envelope.
 */
const NO_SUCH_CONNECTOR_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'connectorId',
    message: 'No connector carries that id',
    code: 'unknown_connector',
  }],
};

/**
 * The whole body a taken triple answers with, from either write.
 *
 * Asserted on the create AND on the re-format, from one constant,
 * so a module that stopped translating one of the two call sites is
 * a red case rather than a difference nobody looked for. The
 * sentence names all three parts of the key, because two thirds of
 * it are patchable and either is what a caller may have moved.
 */
const ALREADY_SUBSCRIBED_BODY = {
  code: 'CONFLICT',
  message: 'This domain already exports that format to that connector',
};

/**
 * The whole body a run now against a disabled row answers with.
 *
 * No `details` at all, which is the half worth asserting: this verb
 * reads no body, so there is no member for a detail to name and
 * inventing one would say the refusal was about something the
 * request sent.
 */
const NOT_ENABLED_BODY = {
  code: 'CONFLICT',
  message:
    'This subscription is disabled, so a run now would never be claimed',
};

/**
 * Just enough of an answered subscription for an assertion to read
 * it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the members the cases project
 * out of a page.
 */
interface AddressedRow {
  /** The row's own id, which every control addresses it by. */
  readonly id: number;

  /** The renderer it delivers through, and a third of its key. */
  readonly format: string;
}

/**
 * The same row, plus the two members the positive half reads.
 *
 * `string | null` on the due time rather than `Date`, because this
 * is the row as it came back OFF the wire: `Date.prototype.toJSON`
 * ran on the way out, so what a case compares is an ISO-8601
 * spelling or the null a subscription nobody has scheduled
 * carries. The connector is the other half of the key a page is
 * ordered by, and there is no reading here that one alone gives.
 */
interface ListedRow extends AddressedRow {
  /** Where the artifact goes, and the tie-break the page sorts on. */
  readonly connectorId: number;

  /** When the dispatcher may next claim it, as JSON spells it. */
  readonly nextRunAt: string | null;
}

/**
 * The members `SubscriptionRecord` declares, as a response carries
 * them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about, which is the direction a
 * key-set assertion exists for: a column added to the projection
 * reaches the wire unasserted otherwise, and no field read
 * anywhere in this file would notice.
 *
 * That second direction is not decoration on THIS table.
 * `export_subscriptions` spreads `schedulableColumns()` from
 * `src/db/schema/scheduling.ts`, which `topics` spreads too, so a
 * column added to that ONE helper reaches this record and every
 * projection under it with no module in this directory edited at
 * all.
 */
const SUBSCRIPTION_KEYS = [
  'connectorId',
  'domainId',
  'enabled',
  'format',
  'id',
  'intervalSeconds',
  'maxIntervalSeconds',
  'minIntervalSeconds',
  'nextRunAt',
] as const satisfies readonly (keyof SubscriptionRecord)[];

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

/** The members `meta` describes the window and the collection with. */
const META_KEYS = [
  'page',
  'perPage',
  'total',
  'totalPages',
] as const satisfies readonly (keyof PaginationMeta)[];

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
  CoversEveryKey<SubscriptionRecord, typeof SUBSCRIPTION_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `SubscriptionRecord`, to either envelope or to
 * `meta` and to none of the lists above turns
 * {@link EveryKeyListed} into `never`, and this initializer is
 * then a TS2322 at this line — before any case can compare a
 * response against a set that has quietly stopped describing it.
 * Read in a case below so it is a symbol this file uses rather
 * than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link SUBSCRIPTION_KEYS}, sorted at use rather than by hand. */
const SUBSCRIPTION_KEY_SET: readonly string[] = [
  ...SUBSCRIPTION_KEYS,
].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/**
 * Builds an app carrying one freshly built subscriptions router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app leaves
 * out is the framework's middleware stack and the auth guard: that
 * the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * The clock is FIXED and is a thunk answering a fresh `Date` per
 * call, so no handler can hand a case back the very object it would
 * compare against.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildSubscriptionsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSubscriptionsRouter({
    store,
    clock: () => new Date(FIXED_INSTANT),
  }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * What {@link withSubscriptions} hands a case.
 *
 * Ids and an app rather than the store: every reading a case takes
 * afterwards is a response, so a case reaching past the surface
 * under test would be pinning the fixture rather than the router.
 * The ids are addresses rather than readings — a request cannot
 * name a row without one.
 */
interface PlantedSubscriptions {
  /** The app, with the router in front of the planted store. */
  readonly app: Application;

  /**
   * The domain {@link STORED_SLUG} names.
   *
   * A reading rather than an address, and the only one here that
   * is: no request in this file carries a `domainId`, so a row
   * answering it is the store having said which domain the row
   * came out of rather than the request having been echoed back.
   */
  readonly domainId: number;

  /**
   * The connector all four planted rows deliver to, and so the one
   * a duplicate collides at.
   */
  readonly vaultId: number;

  /**
   * A second connector nothing planted delivers to, so a control
   * naming it collides with nothing.
   */
  readonly inboxId: number;

  /**
   * {@link STORED_SLUG}'s subscription in {@link STORED_FORMAT},
   * which is the triple a create and a re-format both collide with
   * and the enabled row the verb's control runs. Planted DUE at
   * {@link DUE_LATER}, so the instant the verb writes replaces one
   * the same request could otherwise have answered.
   */
  readonly digestId: number;

  /**
   * A second subscription of {@link STORED_SLUG}, taking
   * {@link SECOND_FORMAT} to the same connector. The row every
   * re-format moves, and the fixture's own statement that one
   * domain may take two formats to one connector. Planted DUE at
   * {@link DUE_LATER} as well, so a verb reaching a row it was not
   * sent to shows up as a due time that moved.
   */
  readonly feedId: number;

  /**
   * A subscription of {@link STORED_SLUG} switched OFF, and the
   * subject of the one case about a state rather than a request.
   * Planted SCHEDULED-less and enabled-false, differing from
   * {@link digestId} in `enabled` — the only column a guard on
   * this router reads — and in the due time it never got. It is
   * the null the verb cases read their neighbours against, since a
   * write that CLEARED the column is invisible on a row already
   * holding one.
   */
  readonly stagedId: number;
}

/**
 * Two domains, two connectors, four subscriptions, and the app in
 * front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each row earns its place twice. The feed row takes a SECOND
 * format to the connector the digest already delivers to, and the
 * row under {@link OTHER_SLUG} takes the digest's own pair under
 * the other domain — so a store or a service holding any PAIR of
 * the triple cannot even build this fixture, and the explicit
 * widening control in the duplicate case is what turns that blunt
 * signal into a named one.
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/exports`, so a case about a patch is not
 * also a case about the create route — and so the duplicate case is
 * refused by a row it did not have to create successfully first. No
 * route on this router can write a domain or a connector at all.
 *
 * TWO OF THE THREE ARE DUE and the third is not, which is the
 * fixture's whole contribution to the verb cases: the digest row
 * is the subject and carries an instant the verb replaces, the
 * feed row carries the same instant and must not move, and the
 * staged row carries none, so a handler that spread its write and
 * one that cleared the column are each reported by a neighbour.
 *
 * @returns The app, the domain id, the two connector ids and the
 *   three ids under {@link STORED_SLUG} that a request addresses.
 */
async function withSubscriptions(): Promise<PlantedSubscriptions> {
  const store = createMemoryResearchStore();
  const stored = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const other = await store.insertDomain({
    slug: OTHER_SLUG,
    name: 'Example Urban Transit',
    settings: {},
  });
  const vault = await store.insertConnector({
    kind: 'notebook',
    name: 'research vault',
    config: {},
  });
  const inbox = await store.insertConnector({
    kind: 'export_target',
    name: 'weekly inbox',
    config: {},
  });
  const digest = await store.insertSubscription({
    domainId: stored.id,
    format: STORED_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const feed = await store.insertSubscription({
    domainId: stored.id,
    format: SECOND_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const staged = await store.insertSubscription({
    domainId: stored.id,
    format: STAGED_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: false,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  await store.insertSubscription({
    domainId: other.id,
    format: STORED_FORMAT,
    connectorId: vault.id,
    intervalSeconds: DAILY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  // Through the PORT, which is the one method that writes the
  // column at all: a case about the verb is then never also a case
  // about the verb that would have had to set its fixture up. Two
  // rows share the instant and the third carries none, which is
  // what makes both a spread write and a cleared column reportable
  // — either one alone is blind to the direction it is not in.
  await store.updateSubscriptionSchedule(digest.id, new Date(DUE_LATER));
  await store.updateSubscriptionSchedule(feed.id, new Date(DUE_LATER));

  return {
    app: buildSubscriptionsApp(store),
    domainId: stored.id,
    vaultId: vault.id,
    inboxId: inbox.id,
    digestId: digest.id,
    feedId: feed.id,
    stagedId: staged.id,
  };
}

/** The path a domain's export subscriptions are read and written at. */
function exportsPath(slug: string): string {
  return `/domains/${slug}/exports`;
}

/** The path one subscription is written and cancelled at. */
function subscriptionPath(id: number): string {
  return `/exports/${id}`;
}

/** The path the schedule verb is posted to. */
function runNowPath(id: number): string {
  return `/exports/${id}/run-now`;
}

/**
 * The formats a read answered, in the order it answered them.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's format.
 */
function formatsOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.format);
}

/**
 * One `format/connectorId` key, spelled once.
 *
 * Both sides of every ordering assertion below are built through
 * this, so a case and the reader it compares against cannot
 * disagree about the spelling.
 *
 * @param format - The renderer half of the key.
 * @param connectorId - The destination half.
 * @returns The two joined by a slash.
 */
function pairKey(format: string, connectorId: number): string {
  return `${format}/${connectorId}`;
}

/**
 * The natural key one answered row carries.
 *
 * @param row - A row as it came off the wire.
 * @returns Its {@link pairKey}.
 */
function keyOf(row: ListedRow): string {
  return pairKey(row.format, row.connectorId);
}

/**
 * The keys a read answered, in the order it answered them.
 *
 * `format/connectorId` is what the natural key has left once the
 * domain is fixed, so ONE list of these says which rows came back
 * AND in what order — where two single-column lists would leave
 * the pairing unasserted.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's key.
 */
function pairsOf(body: { data: readonly ListedRow[] }): string[] {
  return body.data.map(keyOf);
}

/**
 * The ids a read answered, in the order it answered them.
 *
 * Read BESIDE {@link pairsOf} rather than instead of it: the keys
 * say which rows and the ids say the order is not the one the
 * store stamped them in.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's id.
 */
function idsOf(body: { data: readonly ListedRow[] }): number[] {
  return body.data.map((row) => row.id);
}

/**
 * Every row a read carries, by its key, against its due time.
 *
 * The reading the verb cases take over the rows they did NOT
 * address. A verb writing the column on every row it can reach, or
 * on the wrong one, answers its own subject perfectly and is
 * reported only by the neighbours.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each key against the instant that row is due, or null.
 *   A record rather than a list, so a failure names the ROW whose
 *   due time moved instead of an index into a page.
 */
function dueTimes(
  body: { data: readonly ListedRow[] },
): Record<string, string | null> {
  const pairs = body.data.map(
    (row): [string, string | null] => [keyOf(row), row.nextRunAt],
  );

  return Object.fromEntries(pairs);
}

/**
 * The row a read carries under one key.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row
 * would otherwise reach `toStrictEqual` as `undefined` and pass
 * against any other absent row, which is a green nobody wrote.
 *
 * @param rows - A read's `data`, as it came off the wire.
 * @param key - The {@link pairKey} to find.
 * @returns The row carrying it.
 * @throws Error - When the read carries no such row.
 */
function subscriptionFor(
  rows: readonly ListedRow[],
  key: string,
): ListedRow {
  const row = rows.find((candidate) => keyOf(candidate) === key);

  if (row === undefined) {
    throw new Error(`The domain exports nothing under ${key}`);
  }

  return row;
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute at this boundary: a row's id is
 * the store's own, so a whole-body literal is unavailable for an
 * answer carrying one — while a key set catches the fault a field
 * read cannot, which is a member arriving that nobody asserted.
 *
 * @param value - The body, or a member of it.
 * @returns Its own enumerable keys, sorted. An empty list for a
 *   response that carried no body at all, which is what a `204`
 *   answers and is the claim that case makes.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/** How many subscriptions {@link STORED_SLUG} is planted with. */
const PLANTED_UNDER_STORED = 3;

/**
 * The three planted keys, in the order the port promises them.
 *
 * Format ascending with the connector id ascending beside it — an
 * order the fixture cannot have arranged, since the digest row was
 * planted FIRST and sorts second while the staged row was planted
 * LAST and sorts first. So a page in this order is the store's own
 * rather than the order the rows arrived in.
 *
 * A function rather than a const, because half of every key is an
 * id the store stamps.
 *
 * @param connectorId - The connector all three deliver to.
 * @returns Their keys, in order.
 */
function plantedPairs(connectorId: number): string[] {
  return [
    pairKey(STAGED_FORMAT, connectorId),
    pairKey(STORED_FORMAT, connectorId),
    pairKey(SECOND_FORMAT, connectorId),
  ];
}

// ---------------------------------------------------------------------------
// What the fixture below plants, and what every answer is held to
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants distinct triples and writes under a free one', () => {
    // Without this, a create case naming a planted triple would be
    // refused 409 and read as a router fault rather than as a
    // fixture that overlapped itself.
    const planted = [STORED_FORMAT, SECOND_FORMAT, STAGED_FORMAT];

    expect(new Set(planted).size).toBe(planted.length);
    expect(planted).not.toContain(FREE_FORMAT);
    expect(planted).toHaveLength(PLANTED_UNDER_STORED);
  });

  it('reads both format controls off the runtime tuple', () => {
    // Two-directional, and read off `EXPORT_FORMATS` rather than
    // off a literal list: a member ADDED to that tuple reddens
    // this instead of leaving the case below asserting a refusal
    // that has quietly become a legal request, and a member
    // REMOVED reddens it instead of leaving a control that can no
    // longer land.
    const formats: readonly string[] = EXPORT_FORMATS;

    expect(formats).not.toContain(UNKNOWN_FORMAT);
    expect(formats).toContain(FREE_FORMAT);
    expect(formats).toContain(STORED_FORMAT);
    expect(formats).toContain(STAGED_FORMAT);
  });
});

describe('the shapes every positive answer is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to `SubscriptionRecord`, to either envelope or to
    // `meta` and to none of the lists is a TS2322 at that
    // declaration, before any assertion below can compare a
    // response against a set that has quietly stopped describing
    // it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // the cases below read this router's two success shapes apart
    // by.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And `nextRunAt` is on the record, which is the member this
    // group is FOR: the column the dispatcher owns is ANSWERED on
    // every read here and accepted by no request, and a projection
    // that dropped it would leave every status assertion green.
    expect(SUBSCRIPTION_KEY_SET).toContain('nextRunAt');
    // The clock reads EARLIER than the instant two rows are
    // planted due at, which is what makes the verb cases claims: a
    // verb that had quietly become a no-op answers `DUE_LATER` by
    // name rather than a null nobody would look twice at.
    expect(new Date(FIXED_INSTANT).getTime())
      .toBeLessThan(new Date(DUE_LATER).getTime());
  });
});

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no row
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withSubscriptions();

    const missing = await request(app).get(exportsPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies
    // the assertion above on its own. It also says what the 404 is
    // FOR — a domain exporting nothing is a 200 carrying
    // `data: []`, so only a domain that is not there answers this
    // way.
    const found = await request(app).get(exportsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(PLANTED_UNDER_STORED);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const planted = await withSubscriptions();
    const body = {
      format: FREE_FORMAT,
      connectorId: planted.vaultId,
      intervalSeconds: DAILY,
    };

    const missing = await request(planted.app)
      .post(exportsPath(ABSENT_SLUG))
      .send(body);
    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createSubscription` parses the body
    // BEFORE it resolves the slug, so a malformed one would be
    // answered 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.format).toBe(FREE_FORMAT);
  });
});

describe('an id naming no subscription', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const planted = await withSubscriptions();
    const patch = { intervalSeconds: 43200 };

    const missing = await request(planted.app)
      .patch(subscriptionPath(ABSENT_ID))
      .send(patch);
    const found = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.intervalSeconds).toBe(patch.intervalSeconds);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const planted = await withSubscriptions();

    const missing = await request(planted.app)
      .delete(subscriptionPath(ABSENT_ID));
    const removed = await request(planted.app)
      .delete(subscriptionPath(planted.feedId));
    const afterwards = await request(planted.app)
      .get(exportsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
    // Nothing in schema v2 points at `export_subscriptions`, so
    // this delete has no guard to refuse it. That the domain holds
    // one fewer afterwards is what says the 204 was a delete
    // rather than a handler answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(PLANTED_UNDER_STORED - 1);
  });

  it('answers 404 on a run now, and 200 for the stored id', async () => {
    const planted = await withSubscriptions();

    const missing = await request(planted.app).post(runNowPath(ABSENT_ID));
    // The control runs the ENABLED row, which is the one axis this
    // verb refuses on: without it a verb refusing every run now
    // satisfies the 404 above by answering the wrong reason.
    const ran = await request(planted.app).post(runNowPath(planted.digestId));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
    expect(ran.status).toBe(200);
    expect(ran.body.data.nextRunAt).toBe(FIXED_INSTANT);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const planted = await withSubscriptions();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(planted.app)
      .patch('/exports/abc')
      .send({});
    const onDelete = await request(planted.app).delete('/exports/abc');
    const onRunNow = await request(planted.app).post('/exports/abc/run-now');
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(planted.app)
      .delete(subscriptionPath(planted.feedId));

    // All three routes that take an `:id`, against ONE body
    // constant: three handlers are three chances to narrow only
    // two of them, and nothing else in this package would report
    // the one that was left raw.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onRunNow.status).toBe(422);
    expect(onRunNow.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });

  it('answers 422 naming the slug rather than 404', async () => {
    const planted = await withSubscriptions();

    // The two routes that take a `:slug` are not the three that
    // take an `:id`, so this case and the one above narrow
    // disjoint halves of the router — and this one is the only
    // reading in the file that the slug narrowing is load-bearing
    // at all: an unnarrowed segment answers the same 404 every
    // other slug case asserts.
    const onList = await request(planted.app)
      .get(exportsPath(MALFORMED_SLUG));
    const onCreate = await request(planted.app)
      .post(exportsPath(MALFORMED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    const aSlug = await request(planted.app).get(exportsPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The payload: a format, a connector and a triple this router bars
// ---------------------------------------------------------------------------

describe('a format outside the tuple', () => {
  it('answers 422 from both writes, naming the member', async () => {
    const planted = await withSubscriptions();

    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: UNKNOWN_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    // `patchSubscriptionSchema` carries `format`, so the tuple is
    // held on the update too and that is a second call site a
    // module could stop holding on its own.
    const patched = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ format: UNKNOWN_FORMAT });
    // The control, along the axis under test and through the SAME
    // operation: the identical body with a MEMBER of the tuple in
    // place of the sentinel. It lands, so the refusal is about
    // membership rather than about a router refusing every write
    // it is handed — and the guard above reads both spellings off
    // `EXPORT_FORMATS` rather than off this file.
    const accepted = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });

    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NOT_A_FORMAT_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NOT_A_FORMAT_BODY);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.format).toBe(FREE_FORMAT);
  });
});

describe('a connectorId naming no connector', () => {
  it('answers 422 from both writes, quoting no id', async () => {
    const planted = await withSubscriptions();

    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: ABSENT_CONNECTOR_ID,
        intervalSeconds: DAILY,
      });
    // `connectorId` is patchable, so the update reaches the same
    // lookup and answers the same detail for the same fact.
    const patched = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ connectorId: ABSENT_CONNECTOR_ID });
    // The control: the identical patch naming a connector the
    // deployment DOES carry, and one nothing planted delivers to,
    // so the accepted call cannot be refused by the triple it is
    // not about.
    const accepted = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ connectorId: planted.inboxId });

    // 422 and not 404, which is the whole claim: a `:slug` is
    // where the request was SENT and a `connectorId` is something
    // it SUBMITTED, so this refusal names the member at fault
    // rather than saying the address is gone. The WHOLE envelope,
    // because the id the request sent is the one value this
    // refusal could quote back — and it is not in the constant.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.connectorId).toBe(planted.inboxId);
  });
});

describe('a triple the domain already subscribes to', () => {
  it('answers 409 on a create, and 201 for a free triple', async () => {
    const planted = await withSubscriptions();

    const duplicate = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: STORED_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(planted.app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });
    // The widening control, which neither of the two above can
    // stand in for: the key is over the whole TRIPLE, so the same
    // format at the same connector under a SECOND domain has to
    // be accepted. This is the only case here that widens on the
    // DOMAIN — the create section widens on the CONNECTOR
    // instead, taking one format to two of them.
    const elsewhere = await request(planted.app)
      .post(exportsPath(OTHER_SLUG))
      .send({
        format: SECOND_FORMAT,
        connectorId: planted.vaultId,
        intervalSeconds: DAILY,
      });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ALREADY_SUBSCRIBED_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.format).toBe(FREE_FORMAT);
    expect(elsewhere.status).toBe(201);
  });

  it('answers 409 on a re-format, and 200 for a free one', async () => {
    const planted = await withSubscriptions();

    const duplicate = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ format: STORED_FORMAT });
    // The control is a re-format that lands, through the SAME
    // operation: without it this case is equally green against a
    // route that refuses every patch it is given.
    const reformatted = await request(planted.app)
      .patch(subscriptionPath(planted.feedId))
      .send({ format: FREE_FORMAT });

    // The same body constant as the create, which is the claim:
    // two writes reach one unique key, because
    // `patchSubscriptionSchema` carries two thirds of it. A module
    // that stopped translating either call site is a red case
    // rather than a difference nobody looked for.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ALREADY_SUBSCRIBED_BODY);
    expect(reformatted.status).toBe(200);
    expect(reformatted.body.data.format).toBe(FREE_FORMAT);
  });
});

// ---------------------------------------------------------------------------
// The state: a run now against a subscription nothing would claim
// ---------------------------------------------------------------------------

describe('a run now against a disabled subscription', () => {
  it('answers 409 whole, where an enabled row answers 200', async () => {
    const planted = await withSubscriptions();

    // `enabled` false excludes the row from the partial index the
    // dispatch claim walks, so writing the clock onto it would
    // produce a row looking due forever and never claimed — a
    // silent no-op the caller cannot see.
    const refused = await request(planted.app)
      .post(runNowPath(planted.stagedId));
    // The control, varied along the ONE axis under test: the same
    // verb against a row of the same domain at the same connector,
    // differing in `enabled` and in nothing a guard reads. It is
    // what makes the refusal a guard on a column rather than a
    // route refusing every run now it is handed.
    const ran = await request(planted.app)
      .post(runNowPath(planted.digestId));
    // And the disabled row is still there and still refused, so
    // the 409 was a refusal rather than a delete or an enable.
    const again = await request(planted.app)
      .post(runNowPath(planted.stagedId));
    const afterwards = await request(planted.app)
      .get(exportsPath(STORED_SLUG));

    // The WHOLE envelope, which for this verb means `details` is
    // ABSENT rather than empty: it reads no body, so there is no
    // member for a detail to name and inventing one would say the
    // refusal was about something the request sent.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual(NOT_ENABLED_BODY);
    expect(Object.keys(refused.body).sort())
      .toStrictEqual(['code', 'message']);
    expect(ran.status).toBe(200);
    expect(ran.body.data.nextRunAt).toBe(FIXED_INSTANT);
    expect(again.status).toBe(409);
    expect(formatsOf(afterwards.body)).toContain(STAGED_FORMAT);
  });
});

// ---------------------------------------------------------------------------
// The page: one window of a domain's exports, beside its own meta
// ---------------------------------------------------------------------------

describe('a subscription list that lands', () => {
  it('answers one window of rows beside its own meta', async () => {
    const planted = await withSubscriptions();
    const { app, domainId, vaultId, digestId } = planted;
    const ordered = plantedPairs(vaultId);

    const whole = await request(app).get(exportsPath(STORED_SLUG));
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, and a `total` taken from the rows in hand
    // answers 1 to each of the narrow pair — neither of which the
    // refusal half above could read, since no case there can
    // afford a window narrower than its collection.
    const first = await request(app)
      .get(exportsPath(STORED_SLUG))
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(exportsPath(STORED_SLUG))
      .query({ page: PLANTED_UNDER_STORED, perPage: 1 });
    // And the second domain, which subscribes to the digest's own
    // pair: a list that ignored the `:slug` answers four rows to
    // both reads, and every length the refusal half asserts would
    // still be green.
    const elsewhere = await request(app).get(exportsPath(OTHER_SLUG));

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    // THREE members and not two: this list applies a window, so it
    // carries the `meta` describing one — which is the whole
    // difference between the envelope `okPage` writes and the one
    // `ok` does, and the only place in this file it is read.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_UNDER_STORED,
      totalPages: 1,
    });
    // Format ascending, which neither the arrival order nor the
    // connector could have agreed with: all three deliver to one
    // connector, the digest row was written first and sorts
    // second, and the staged row was written last and sorts first.
    // The ids read beside the keys are what say the page is not
    // simply the order the store stamped rows in.
    expect(pairsOf(whole.body)).toStrictEqual(ordered);
    expect(idsOf(whole.body))
      .toStrictEqual([planted.stagedId, digestId, planted.feedId]);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(SUBSCRIPTION_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. `domainId` is here because no case
    // could otherwise say which domain the rows came out of, and
    // `nextRunAt` because the column the dispatcher owns is
    // answered on this surface rather than hidden.
    const rows = whole.body.data as ListedRow[];

    expect(subscriptionFor(rows, pairKey(STORED_FORMAT, vaultId)))
      .toStrictEqual({
        id: digestId,
        domainId,
        format: STORED_FORMAT,
        connectorId: vaultId,
        intervalSeconds: DAILY,
        nextRunAt: DUE_LATER,
        enabled: true,
        minIntervalSeconds: null,
        maxIntervalSeconds: null,
      });
    // The two narrow windows are disjoint and each names the total
    // of the COLLECTION, which no page could have counted from its
    // own rows.
    expect(pairsOf(first.body)).toStrictEqual(ordered.slice(0, 1));
    expect(pairsOf(last.body)).toStrictEqual(ordered.slice(-1));
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_UNDER_STORED,
      totalPages: PLANTED_UNDER_STORED,
    });
    expect(last.body.meta).toStrictEqual({
      page: PLANTED_UNDER_STORED,
      perPage: 1,
      total: PLANTED_UNDER_STORED,
      totalPages: PLANTED_UNDER_STORED,
    });
    // The other domain's page is ONE row, and not the digest: the
    // two carry the same key, so the id is the only reading that
    // separates a scoped list from one answering both domains at
    // whatever length the window allowed.
    expect(elsewhere.status).toBe(200);
    expect(idsOf(elsewhere.body)).toHaveLength(1);
    expect(idsOf(elsewhere.body)).not.toContain(digestId);
    expect(elsewhere.body.meta.total).toBe(1);
  });

  it('answers an empty page past the end of it', async () => {
    const { app, vaultId } = await withSubscriptions();

    const past = await request(app)
      .get(exportsPath(STORED_SLUG))
      .query({ page: PAST_THE_END });
    // The control: the same collection through a window that
    // reaches it. Without it an empty `data` is equally green
    // against a list route answering nothing to anybody.
    const reached = await request(app).get(exportsPath(STORED_SLUG));

    expect(past.status).toBe(200);
    // The envelope does not change shape when the page is empty,
    // which is what makes an overshot page a page rather than a
    // 404: the domain is there, its subscriptions are there, and
    // only the window over them is empty.
    expect(keysOf(past.body)).toStrictEqual(PAGE_KEY_SET);
    expect(past.body.data).toStrictEqual([]);
    // `meta` echoes the page that was ASKED FOR and describes the
    // COLLECTION, so the overshoot sits beside a `totalPages` of 1
    // and a `total` no empty page could have been counted from.
    expect(past.body.meta).toStrictEqual({
      page: PAST_THE_END,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_UNDER_STORED,
      totalPages: 1,
    });
    expect(pairsOf(reached.body)).toStrictEqual(plantedPairs(vaultId));
  });
});

// ---------------------------------------------------------------------------
// The resource: one subscription added, and the row the store kept
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the stored row, not the request', async () => {
    const planted = await withSubscriptions();
    const { app, domainId, vaultId, inboxId } = planted;

    const created = await request(app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: inboxId,
        intervalSeconds: HALF_DAILY,
        enabled: false,
        minIntervalSeconds: TEN_MINUTES,
        maxIntervalSeconds: WEEKLY,
      });
    // The control, along the axis under test and through the SAME
    // operation: the three members the schema requires and nothing
    // else. Three of this record's members are then the SERVICE's
    // defaults rather than the request's, so the pair says a
    // create writes what it was handed where a member was handed
    // and defaults only where one was not — a handler defaulting
    // unconditionally answers the first request wrongly, and one
    // dropping absent members answers the second wrongly. It also
    // takes the SAME format to a second connector, which is the
    // widening the natural key permits.
    const sparse = await request(app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: vaultId,
        intervalSeconds: DAILY,
      });

    expect(created.status).toBe(201);
    expect(sparse.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(sparse.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(created.body.data)).toStrictEqual(SUBSCRIPTION_KEY_SET);
    expect(keysOf(sparse.body.data)).toStrictEqual(SUBSCRIPTION_KEY_SET);
    expect(created.body.success).toBe(true);
    // The whole row, so a create reaching a member nobody
    // submitted is a red case rather than an answer six field
    // reads agreed with. UNSCHEDULED whatever else the body said,
    // which is `InsertSubscriptionInput` carrying no such member
    // rather than anything the handler does: scheduling it is the
    // separate act `POST /exports/:id/run-now` performs.
    expect(created.body.data).toStrictEqual({
      id: created.body.data.id,
      domainId,
      format: FREE_FORMAT,
      connectorId: inboxId,
      intervalSeconds: HALF_DAILY,
      nextRunAt: null,
      enabled: false,
      minIntervalSeconds: TEN_MINUTES,
      maxIntervalSeconds: WEEKLY,
    });
    // The three defaults, none of them on the sparse request:
    // enabled, and neither bound.
    expect(sparse.body.data).toStrictEqual({
      id: sparse.body.data.id,
      domainId,
      format: FREE_FORMAT,
      connectorId: vaultId,
      intervalSeconds: DAILY,
      nextRunAt: null,
      enabled: true,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });
    // `domainId` is on neither request — the path named a slug —
    // and no id is either, so both arriving right is the STORE
    // having answered rather than the request echoed back under a
    // 201.
    expect(typeof created.body.data.id).toBe('number');
    expect(created.body.data.id).not.toBe(sparse.body.data.id);
  });

  it('stores both, and orders them where they belong', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const planted = await withSubscriptions();
    const { app, domainId, vaultId, inboxId, digestId } = planted;

    // The row at the LATER connector first, which is what turns
    // the second half of the page's order into a claim: the two
    // land under one format, so a store ordering by the format
    // alone answers them in the order they arrived and a store
    // ordering by the pair answers the vault row first.
    const atInbox = await request(app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: inboxId,
        intervalSeconds: DAILY,
      });
    const atVault = await request(app)
      .post(exportsPath(STORED_SLUG))
      .send({
        format: FREE_FORMAT,
        connectorId: vaultId,
        intervalSeconds: DAILY,
      });
    const listed = await request(app).get(exportsPath(STORED_SLUG));
    const rows = listed.body.data as ListedRow[];
    const expected = [
      pairKey(STAGED_FORMAT, vaultId),
      pairKey(STORED_FORMAT, vaultId),
      pairKey(FREE_FORMAT, vaultId),
      pairKey(FREE_FORMAT, inboxId),
      pairKey(SECOND_FORMAT, vaultId),
    ];

    expect(atInbox.status).toBe(201);
    expect(atVault.status).toBe(201);
    expect(listed.status).toBe(200);
    // The whole collection in order, so a create reaching more
    // rows than the one it wrote is a red case here rather than an
    // answer nobody compared against anything. Both new rows sort
    // into the MIDDLE though they were written last, and the pair
    // of them sorts by the connector though it arrived the other
    // way round — which is the tie-break no single-column reading
    // of this page could have got right.
    expect(pairsOf(listed.body)).toStrictEqual(expected);
    expect(idsOf(listed.body)).toStrictEqual([
      planted.stagedId,
      digestId,
      atVault.body.data.id,
      atInbox.body.data.id,
      planted.feedId,
    ]);
    expect(listed.body.meta.total).toBe(PLANTED_UNDER_STORED + 2);
    // The stored rows are the ones the creates answered.
    expect(subscriptionFor(rows, pairKey(FREE_FORMAT, inboxId)))
      .toStrictEqual(atInbox.body.data);
    expect(subscriptionFor(rows, pairKey(FREE_FORMAT, vaultId)))
      .toStrictEqual(atVault.body.data);
    // And a row that was already there still carries what it
    // carried, which no assertion over a created row could say: a
    // create lands ONE row. A whole-row literal rather than a
    // field read, since the fault worth catching here is a
    // neighbour gaining a member or losing one on the way past a
    // write.
    expect(subscriptionFor(rows, pairKey(STORED_FORMAT, vaultId)))
      .toStrictEqual({
        id: digestId,
        domainId,
        format: STORED_FORMAT,
        connectorId: vaultId,
        intervalSeconds: DAILY,
        nextRunAt: DUE_LATER,
        enabled: true,
        minIntervalSeconds: null,
        maxIntervalSeconds: null,
      });
  });
});

// ---------------------------------------------------------------------------
// The patch: the members rewritten, and the ones it never named
// ---------------------------------------------------------------------------

describe('a patch that retunes one subscription', () => {
  it('answers 200 with the stored row afterwards', async () => {
    const planted = await withSubscriptions();
    const { app, domainId, vaultId, inboxId, feedId } = planted;
    const feed = subscriptionPath(feedId);

    const retuned = await request(app)
      .patch(feed)
      .send({
        intervalSeconds: HALF_DAILY,
        minIntervalSeconds: TEN_MINUTES,
        maxIntervalSeconds: WEEKLY,
      });
    // The first control: a member a patch does not name is left
    // alone. Without it the case is equally green against a
    // handler rewriting every column on every patch — and it runs
    // the other way round here, since this request names only the
    // destination and the state, and the three members written
    // above have to survive it.
    const repointed = await request(app)
      .patch(feed)
      .send({ connectorId: inboxId, enabled: false });
    // The second: `null` CLEARS a bound where ABSENT leaves it
    // standing, which is the distinction
    // `patchSubscriptionSchema` declares `.nullable().optional()`
    // for and the only way an operator removes a floor. A handler
    // collapsing the two with a `??` answers these two requests
    // the same way, and the ceiling this one never names is what
    // reports it.
    const unfloored = await request(app)
      .patch(feed)
      .send({ minIntervalSeconds: null });
    // The third: a patch carrying no member at all, which is a
    // legal call answering the stored row. `export_subscriptions`
    // has no `updated_at` for an empty write to stamp, so the port
    // answers without writing rather than refusing.
    const untouched = await request(app)
      .patch(subscriptionPath(planted.digestId))
      .send({});
    const listed = await request(app).get(exportsPath(STORED_SLUG));

    expect(retuned.status).toBe(200);
    // Two members, not three: a patch answers one resource, and a
    // `meta` arriving here would be the page envelope on a body
    // that describes no window.
    expect(keysOf(retuned.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(retuned.body.data)).toStrictEqual(SUBSCRIPTION_KEY_SET);
    expect(retuned.body.success).toBe(true);
    // The WHOLE row afterwards, which is what says the members
    // this request did not name came through untouched — the
    // format it delivers, the connector it delivers to, the domain
    // it belongs to and the due time no request on this router may
    // write.
    expect(retuned.body.data).toStrictEqual({
      id: feedId,
      domainId,
      format: SECOND_FORMAT,
      connectorId: vaultId,
      intervalSeconds: HALF_DAILY,
      nextRunAt: DUE_LATER,
      enabled: true,
      minIntervalSeconds: TEN_MINUTES,
      maxIntervalSeconds: WEEKLY,
    });
    expect(repointed.status).toBe(200);
    // Two thirds of the natural key are patchable and this moved
    // one of them, so the row is now delivered somewhere else —
    // and the cadence and both bounds written a request ago came
    // through a second write that named neither.
    expect(repointed.body.data).toStrictEqual({
      id: feedId,
      domainId,
      format: SECOND_FORMAT,
      connectorId: inboxId,
      intervalSeconds: HALF_DAILY,
      nextRunAt: DUE_LATER,
      enabled: false,
      minIntervalSeconds: TEN_MINUTES,
      maxIntervalSeconds: WEEKLY,
    });
    expect(unfloored.status).toBe(200);
    expect(unfloored.body.data.minIntervalSeconds).toBeNull();
    expect(unfloored.body.data.maxIntervalSeconds).toBe(WEEKLY);
    expect(untouched.status).toBe(200);
    expect(untouched.body.data).toStrictEqual({
      id: planted.digestId,
      domainId,
      format: STORED_FORMAT,
      connectorId: vaultId,
      intervalSeconds: DAILY,
      nextRunAt: DUE_LATER,
      enabled: true,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });
    // And the store holds what the last patch answered, read back
    // through the OTHER operation: a patch answering a row it
    // never wrote satisfies every assertion above. The row has
    // MOVED on the page too, the key it is ordered by having gone
    // with its new destination.
    const rows = listed.body.data as ListedRow[];

    expect(subscriptionFor(rows, pairKey(SECOND_FORMAT, inboxId)))
      .toStrictEqual(unfloored.body.data);
    expect(pairsOf(listed.body)).toStrictEqual([
      pairKey(STAGED_FORMAT, vaultId),
      pairKey(STORED_FORMAT, vaultId),
      pairKey(SECOND_FORMAT, inboxId),
    ]);
    expect(listed.body.meta.total).toBe(PLANTED_UNDER_STORED);
    // And every due time is where the fixture left it, including
    // on the two rows four writes above named: no request on this
    // route can reach the column the dispatcher owns.
    expect(dueTimes(listed.body)).toStrictEqual({
      [pairKey(STAGED_FORMAT, vaultId)]: null,
      [pairKey(STORED_FORMAT, vaultId)]: DUE_LATER,
      [pairKey(SECOND_FORMAT, inboxId)]: DUE_LATER,
    });
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what it leaves behind
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing at all, and takes the row', async () => {
    const planted = await withSubscriptions();
    const { app, vaultId, digestId } = planted;

    const removed = await request(app).delete(subscriptionPath(digestId));
    const listed = await request(app).get(exportsPath(STORED_SLUG));
    const elsewhere = await request(app).get(exportsPath(OTHER_SLUG));
    // The control, through the SAME operation: the identical
    // request against an id that named a row a moment ago is a
    // 404, which is what makes the 204 above a delete rather than
    // what this route answers to any id it is handed.
    const again = await request(app).delete(subscriptionPath(digestId));

    expect(removed.status).toBe(204);
    // An EMPTY key set, which is this route's half of the shape
    // the rest of the file reads: a cancelled subscription has no
    // representation, so what is asserted is that NOTHING
    // travelled rather than that some envelope did.
    expect(keysOf(removed.body)).toStrictEqual([]);
    expect(removed.text).toBe('');
    expect(removed.type).toBe('');
    // The row is gone, both neighbours are not, and the domain
    // still answers a page: nothing in schema v2 points at
    // `export_subscriptions`, so this delete has neither a guard
    // nor a cascade, and a 204 that took the collection with it
    // would be caught here rather than by anything the delete
    // answered.
    expect(listed.status).toBe(200);
    expect(pairsOf(listed.body)).toStrictEqual([
      pairKey(STAGED_FORMAT, vaultId),
      pairKey(SECOND_FORMAT, vaultId),
    ]);
    expect(listed.body.meta.total).toBe(PLANTED_UNDER_STORED - 1);
    // The second domain still exports the pair this delete took,
    // which is the widening control: the row was addressed by an
    // id, and a store deleting by the format and the connector
    // would have taken that one too.
    expect(elsewhere.status).toBe(200);
    expect(pairsOf(elsewhere.body))
      .toStrictEqual([pairKey(STORED_FORMAT, vaultId)]);
    expect(again.status).toBe(404);
    expect(again.body).toStrictEqual(NO_SUCH_SUBSCRIPTION_BODY);
  });
});

// ---------------------------------------------------------------------------
// The verb: the instant it writes, and the retry that repeats it
// ---------------------------------------------------------------------------

describe('a run now that lands', () => {
  it('answers 200 carrying the instant the clock read', async () => {
    const planted = await withSubscriptions();
    const { app, domainId, vaultId, digestId } = planted;

    const ran = await request(app).post(runNowPath(digestId));
    // Read back through the OTHER operation, per this file's rule
    // for every write: a verb answering a row it never stored
    // satisfies every assertion made against its own response, and
    // this surface has no single-item GET for a case to use
    // instead.
    const listed = await request(app).get(exportsPath(STORED_SLUG));

    expect(ran.status).toBe(200);
    // Two members and not three: a verb answers one resource, so a
    // `meta` arriving here would be the page envelope on a body
    // that describes no window at all.
    expect(keysOf(ran.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(ran.body.data)).toStrictEqual(SUBSCRIPTION_KEY_SET);
    expect(ran.body.success).toBe(true);
    // The EQUALITY the injected clock exists for, and the reason
    // this router requires the thunk rather than defaulting it: a
    // handler reading the real present answers a plausible instant
    // no assertion could pin, and this line would have to be a
    // window around the moment the suite happened to run.
    expect(ran.body.data.nextRunAt).toBe(FIXED_INSTANT);
    // And NOT the due time it replaced, named rather than left
    // implied. That value is a real instant this same request
    // could have answered — it is what the row carried until it
    // was sent — so naming it is what makes the equality above a
    // WRITE rather than the row handed back as it was found.
    expect(ran.body.data.nextRunAt).not.toBe(DUE_LATER);
    // The whole row as the store holds it AFTERWARDS, member for
    // member. That the verb moves `next_run_at` and no other
    // column is `src/subscriptions/service.test.ts`'s claim over
    // direct calls; what this adds is that the row reaching a
    // caller is the stored one, `domainId` included — the one
    // member no request in this file names.
    const rows = listed.body.data as ListedRow[];

    expect(subscriptionFor(rows, pairKey(STORED_FORMAT, vaultId)))
      .toStrictEqual({
        id: digestId,
        domainId,
        format: STORED_FORMAT,
        connectorId: vaultId,
        intervalSeconds: DAILY,
        nextRunAt: FIXED_INSTANT,
        enabled: true,
        minIntervalSeconds: null,
        maxIntervalSeconds: null,
      });
    // And the two rows the request never named are where the
    // fixture left them, one due tomorrow and one due never. A
    // handler writing the column on every row it can reach, on the
    // wrong one, or clearing it, answers its own subject perfectly
    // and is reported by nothing else here.
    expect(dueTimes(listed.body)).toStrictEqual({
      [pairKey(STAGED_FORMAT, vaultId)]: null,
      [pairKey(STORED_FORMAT, vaultId)]: FIXED_INSTANT,
      [pairKey(SECOND_FORMAT, vaultId)]: DUE_LATER,
    });
  });

  it('answers a second run now the same way, not a 409', async () => {
    const planted = await withSubscriptions();
    const { app, vaultId, digestId } = planted;

    const first = await request(app).post(runNowPath(digestId));
    // The row is now due AT the clock rather than a day out, which
    // is exactly the state `ar-dispatch`'s claim reads as
    // claimable (`enabled AND next_run_at <= now()`). So this is
    // the request an operator sends when the first appeared to do
    // nothing, and what it needs back is the row. A `409` here
    // would be this surface guessing at whether a delivery is
    // already under way — a state it cannot observe, since it
    // neither claims a row nor opens a `runs` row.
    const again = await request(app).post(runNowPath(digestId));
    const listed = await request(app).get(exportsPath(STORED_SLUG));

    // The first request MOVED it, which is the control the second
    // needs: without it a pair of matching answers is equally
    // green against a verb that wrote nothing either time.
    expect(first.status).toBe(200);
    expect(first.body.data.nextRunAt).toBe(FIXED_INSTANT);
    expect(first.body.data.nextRunAt).not.toBe(DUE_LATER);
    // `200` with a resource envelope, asserted by its KEY SET:
    // every refusal this router answers carries `code` and
    // `message` where this carries `data`, so a handler that had
    // grown a guard against a delivery it thinks is pending is a
    // red case here rather than a status nobody looked past.
    expect(again.status).toBe(200);
    expect(keysOf(again.body)).toStrictEqual(RESOURCE_KEY_SET);
    // And it answered exactly what the first did, whole. The verb
    // WRITES an instant rather than advancing one, so a second
    // call against the same clock is the same call — which is
    // what makes a retry safe after a response nobody saw.
    expect(again.body).toStrictEqual(first.body);
    expect(dueTimes(listed.body)).toStrictEqual({
      [pairKey(STAGED_FORMAT, vaultId)]: null,
      [pairKey(STORED_FORMAT, vaultId)]: FIXED_INSTANT,
      [pairKey(SECOND_FORMAT, vaultId)]: DUE_LATER,
    });
  });
});
