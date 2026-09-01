/**
 * `src/sources/routes.ts` — what each of the four routes answers
 * when it REFUSES: the status, the envelope and the members each
 * reaches the wire with. Driven over supertest against a router
 * built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a `kind` outside `SOURCE_KINDS` is
 * a `ValidationError`, that an unknown slug and an unknown id are
 * told apart, that `flagged` is an unrecognized key on both request
 * schemas, that a delete reads both counts before it refuses —
 * those are claims about the RULES and are pinned one file over,
 * over direct calls. What no call can report is whether the rule
 * reached a caller: the status `errorHandler` or the handler chose,
 * the envelope written around it, the members that envelope carried,
 * and whether a handler swallowed a throw on the way. So every case
 * below reads a response and none of them reads a return value.
 *
 * THIRTEEN CASES IN NINE GROUPS. Three guard the fixture and the
 * key lists every answer is read through; six cover the address;
 * one covers the window; two cover the two payload refusals; and
 * one is the delete guard, driven against both counted tables in
 * turn. The POSITIVE half —
 * what a list, a create, a patch and a delete answer when they LAND
 * — is a task of its own, and every control below is a landing
 * answer read only as far as the axis its own case is about.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no source is `404` on both that
 * take one, each asserted against ONE shared body constant per
 * ADDRESS rather than four literals that agree today. The constants
 * are per address and not per status: a `404` about a domain and a
 * `404` about a source are two envelopes on one router, and four
 * handlers are four chances to answer a missing row four different
 * ways. A segment that is not an ADDRESS at all is `422` naming
 * `id` or `slug` and never `404` — a `404` says the row is not
 * there, and a request that never named a row has not established
 * that. Each is asserted across BOTH routes sharing its segment
 * inside one case, because a handler is a chance to narrow only its
 * own.
 *
 * THE WINDOW. This list route IS paginated, so a `?perPage` above
 * the cap is `422` naming `perPage` rather than a silent clamp. It
 * is paired with a request at exactly the cap, which is what says
 * the refusal is a CAP and not a route that refuses every window it
 * is handed.
 *
 * A `kind` OUTSIDE THE TUPLE is `422` whose one detail names `kind`
 * with code `invalid_value`, from the create AND from the patch,
 * and the pair is the claim: `kind` is patchable on this table, so
 * each write is a separate call site a module could stop holding to
 * the tuple on its own. Its control is a member of `SOURCE_KINDS`
 * no planted row carries, accepted through the SAME two operations
 * — so the pair says the refusal is about the tuple rather than
 * about a router refusing every `kind` it is handed. Both halves
 * read the tuple at RUNTIME rather than trusting two literals, so a
 * member added to `SOURCE_KINDS` reddens the fixture guard instead
 * of leaving a row nobody notices is wrong.
 *
 * A BODY NAMING `flagged` is `422` whose ONE detail names `body`,
 * asserted as the WHOLE envelope and from both writes. That is the
 * pipeline-owned-column rule reaching a caller: `flagged` is the
 * adapter-rot detector's output, so clearing it without repairing
 * the config that failed brings it straight back, and this surface
 * does not offer the button. Its control is the same body with the
 * member removed, which is accepted and lands a `flagged` of false
 * — so the pair says the refusal is about that MEMBER rather than
 * about a router refusing every create it is handed, and that the
 * column is projected rather than hidden.
 *
 * AND THE KEY IT NAMED DOES NOT COME BACK. `flagged` is a member
 * name a refusal could quote, so that case COUNTS its occurrences
 * in the serialised body rather than asserting an absence — and
 * takes the same count over a PLANTED envelope carrying it, because
 * a search that would find nothing anywhere reports a clean refusal
 * and a leaking one alike. The same count is taken over the
 * unregistered `kind`, which is the one VALUE any request in this
 * file submits that a refusal could plausibly repeat.
 *
 * THE DELETE GUARD IS THE ONLY `409` THIS ROUTER CAN ANSWER, which
 * is the departure from every other resource group on this surface:
 * `sources` carries no unique key at all, so neither write can
 * reach one and no create here is ever a duplicate. The refusal is
 * asserted WHOLE, `details` included, because the counts are the
 * answer rather than an accompaniment to the status — an operator
 * reading what a delete would have taken is reading those two
 * numbers.
 *
 * AND THE TWO COUNTED TABLES ARE PLANTED ON SEPARATE ROWS. One
 * source holds documents and no sightings, another holds sightings
 * and no documents, and each is refused with the counted ZERO of
 * the table it does not hold. A guard reading one of the two, or
 * summing them into a boolean before either is counted, answers a
 * row that holds both perfectly and fails exactly one of these —
 * which is a failure naming the table it missed. The two counts
 * also differ from each other, so a record built with the members
 * swapped is a red case rather than a total that still adds up.
 * The key set is swept off `SourceDependentCounts` rather than
 * named twice, so a third counted table reddens this case instead
 * of travelling unasserted.
 *
 * ANTI-VACUITY. A router that refused everything, or that answered
 * every read the same row, would satisfy most of what is below, so
 * each case carries its own control in the same body, varied along
 * the axis under test: each `404` reads what IS there through the
 * SAME operation, the not-an-id case ends on an id that is one, the
 * over-cap `perPage` is paired with a request at exactly the cap,
 * the refused `kind` is paired with a member of the tuple through
 * both writes, the refused member is removed and resent, and the
 * refused delete is paired with a source nothing cites.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s — the containment readings
 * below are scoped to the two channels these routes open, which are
 * the refused member's own name and the value a bad `kind` carries.
 * `GET /sources/:id/failures` is not this router's route at all and
 * has a file of its own.
 *
 * MUTATION GRID, derived over all thirteen cases by mutating
 * `routes.ts` one edit at a time and reading the failed `fullName`
 * SET from a `--reporter=json` run rather than a count. EIGHT legs,
 * each named by the EDIT it makes rather than by its effect, since
 * a leg described only by its effect is one nobody can run again.
 *
 * THE TWO ADDRESS LEGS ARE NOT ONE LEG TWICE. Returning the segment
 * raw from {@link readId} reddens FIVE — every case that addresses
 * a row by id and gets an answer out of the store, which is the two
 * `404` cases, the not-an-id case, the delete guard and the kind
 * case's accepted patch. Returning it raw from {@link readSlug}
 * reddens exactly ONE, the not-a-slug case, and that is this file's
 * shape rather than an omission: every other slug it sends is well
 * formed, so an unnarrowed segment answers the same `404` those
 * cases already assert.
 *
 * THE `flagged` PATCH IS IN NEITHER SET, which is the ordering
 * showing up as a measurement: `patchSource` parses the body before
 * it writes, so a body the schema refuses is answered whatever the
 * id was. The kind case's patch is in the `readId` set only through
 * the ACCEPTED control beside it.
 *
 * THE THREE STATUS LEGS SEPARATE. `res.status(201)` written as
 * `200` on the create reddens THREE, all of them landing controls
 * rather than cases named for a create. `res.status(204)` written
 * as `200` on the delete reddens THREE. `res.status(200)` written
 * as `204` on the patch reddens TWO. So the statuses ARE pinned
 * here, by no case that is about them — which is what a
 * refusals-only file's controls buy.
 *
 * `ok(page.rows)` IN PLACE OF `okPage(page.rows, meta)` REDDENS
 * ONE, the window case, which is the only read here that looks at
 * `meta` at all.
 *
 * AND TWO LEGS REDDEN NOTHING, both recorded rather than repaired.
 * A fixed `{ limit: 50, offset: 0 }` in place of
 * `toStoreWindow(query)` reddens ZERO, and `total: page.rows.length`
 * in place of `total: page.total` reddens ZERO, for one reason: no
 * refusal case can afford a window narrower than the collection it
 * is reading, so every page here holds every row and the two
 * numbers agree. Both are the positive half's claims — two windows
 * of one over the same rows — and this file records the zeros
 * rather than pretending to them.
 */
import type {
  SourceDependentCounts,
  SourceRecord,
  SourceWithParseStats,
} from './store.js';
import type {
  MemoryResearchStore,
  MemorySourceDocument,
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
import { SOURCE_KINDS } from '../db/schema/values.js';

import { buildSourcesRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('sources-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It reads a feed of its own, which is what makes the list a page
 * of ONE domain's sources rather than of the table: a router or a
 * store answering every source it holds passes every length
 * assertion below only while this row is absent.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * An id no planted source carries.
 *
 * Far past the four the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The endpoint of the source the corpus holds documents through. */
const FEED_ENDPOINT = 'https://example.test/radar/feed.xml';

/** The endpoint of the source a finding sighting cites. */
const ITEMS_ENDPOINT = 'https://example.test/radar/items';

/**
 * The endpoint of the source nothing cites at all.
 *
 * The control every delete case ends on, and the row every patch
 * control writes: it is the one planted source no case has a reason
 * to leave standing.
 */
const ARCHIVE_ENDPOINT = 'https://example.test/radar/archive.json';

/** The endpoint {@link OTHER_SLUG} reads, and no case addresses. */
const TRANSIT_ENDPOINT = 'https://example.test/transit/feed.xml';

/** An endpoint no planted row carries, and every create submits. */
const FRESH_ENDPOINT = 'https://example.test/radar/releases.atom';

/** The transport {@link FEED_ENDPOINT} and the neighbour are read under. */
const RSS_KIND = 'rss';

/** The transport {@link ITEMS_ENDPOINT} is read under. */
const API_KIND = 'api';

/** The transport {@link ARCHIVE_ENDPOINT} is read under. */
const URL_KIND = 'url';

/**
 * A member of `SOURCE_KINDS` no planted row carries.
 *
 * The control both halves of the kind case are accepted under, and
 * a member rather than an arbitrary string on purpose: what it says
 * is that the refusal beside it is about the TUPLE and not about a
 * router refusing every `kind` it is handed. The fixture guard
 * below reads it against the runtime tuple, so a member removed
 * from `SOURCE_KINDS` reddens there rather than here.
 */
const ACCEPTED_KIND = 'push';

/**
 * A transport nobody registered, and the value the kind case
 * submits.
 *
 * Distinctive as a substring, because this case counts its
 * occurrences in the refusal it produced: it is the one VALUE any
 * request in this file submits that a refusal could plausibly
 * repeat, and a short realistic token would be satisfiable by some
 * other member of the envelope.
 */
const UNREGISTERED_KIND = 'sftp-mirror';

/**
 * The pipeline-owned member both refused bodies name.
 *
 * Counted rather than merely absent from the two envelopes, for the
 * reason {@link UNREGISTERED_KIND} gives about a value: a key is
 * also something the request said, and an `unrecognized_keys`
 * detail naming it back would be the same leak in the other half of
 * the pair.
 */
const REFUSED_MEMBER = 'flagged';

/** When every planted document was captured. */
const CAPTURED_AT = new Date('2026-08-30T11:00:00.000Z');

/**
 * How many documents the corpus holds through {@link FEED_ENDPOINT}.
 *
 * DIFFERENT from {@link HELD_SIGHTINGS}, which is what makes the
 * two counts in a refusal legible: a record built with the members
 * swapped answers a total that still adds up and two numbers in the
 * wrong places.
 */
const HELD_DOCUMENTS = 2;

/** How many sightings cite {@link ITEMS_ENDPOINT}. */
const HELD_SIGHTINGS = 3;

/** How many sources {@link STORED_SLUG} is planted with. */
const PLANTED_SOURCES = 3;

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/sources/service.ts`'s constant; what is
 * pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a source answers with. */
const NO_SUCH_SOURCE_BODY = {
  code: 'NOT_FOUND',
  message: 'No source carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on both routes that
 * take an `:id`.
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
 * which are not the two that take an `:id`.
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
 * The whole body a `?perPage` above the cap answers with.
 *
 * `too_big` and naming the parameter the caller typed, which is
 * what makes the refusal the only way a client learns it asked for
 * more than this surface serves.
 */
const OVER_CAP_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'perPage',
    message: 'Above the allowed maximum.',
    code: 'too_big',
  }],
};

/**
 * The whole body a `kind` outside the tuple answers with.
 *
 * `invalid_value` and not `invalid_type`, which is what an enum
 * answers to a member it does not carry — and to a MISSING one as
 * well, so a schema widened to `z.string()` reddens this case from
 * both directions. The detail names `kind`, because the fault has a
 * path of its own; nothing the request submitted is in this
 * envelope at all, and that is the claim its case makes by counting
 * the submitted value in it.
 */
const BAD_KIND_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'kind',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a request naming `flagged` answers with.
 *
 * ONE detail naming `body` rather than the key, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * request said. Nothing the request submitted is in this envelope
 * at all, and that is the claim its case makes by asserting the
 * whole of it.
 */
const FLAGGED_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The `code` and `message` a refused delete answers with, without
 * the counts.
 *
 * The counts differ per subject and are spread onto this at the
 * assertion, so the SENTENCE is one constant read by both refusals
 * while each carries the two numbers its own row produced. The
 * message names `enabled` because the repair is a different request
 * rather than a correction to this one, and there is no
 * confirmation that gets past the guard for it to name instead.
 */
const SOURCE_HOLDS_ROWS_BODY = {
  code: 'CONFLICT',
  message: 'This source has captured rows that still cite it; retire it '
    + 'by setting enabled to false',
};

/**
 * The members `SourceRecord` declares, as a response carries them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about. The second is the direction a
 * key-set assertion exists for: a column added to the projection
 * reaches the wire unasserted otherwise, and no field read anywhere
 * in this file would notice.
 *
 * FIVE OF THE TWELVE ARE THE PIPELINE'S, and they are in this list
 * for the same reason the rest are: this surface ANSWERS them on
 * every read and accepts them on no write, so a projection that
 * dropped one would leave every status assertion below green.
 */
const SOURCE_KEYS = [
  'consecutiveFailures',
  'contract',
  'cursor',
  'domainId',
  'enabled',
  'endpoint',
  'flagged',
  'id',
  'kind',
  'lastFailureAt',
  'lastSuccessAt',
  'parserConfig',
] as const satisfies readonly (keyof SourceRecord)[];

/**
 * What a LIST row carries on top of those: the aggregate, and
 * nothing else.
 *
 * Spread from {@link SOURCE_KEYS} rather than written out again, so
 * the one member is the whole of the difference between the two
 * reads — a projection dropping a column on the list alone is this
 * list disagreeing with the row a write answers.
 */
const LISTED_KEYS = [
  ...SOURCE_KEYS,
  'parseStats',
] as const satisfies readonly (keyof SourceWithParseStats)[];

/**
 * The two counts a refused delete carries in `details`.
 *
 * Held to the interface by `satisfies`, so a third counted table
 * has to be named here before this file can be green again — which
 * is the one edit that would otherwise let a count travel to a
 * caller with nothing asserting it.
 */
const DEPENDENT_KEYS = [
  'documents',
  'findingSightings',
] as const satisfies readonly (keyof SourceDependentCounts)[];

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
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<SourceRecord, typeof SOURCE_KEYS>
  & CoversEveryKey<SourceWithParseStats, typeof LISTED_KEYS>
  & CoversEveryKey<SourceDependentCounts, typeof DEPENDENT_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `SourceRecord`, to `SourceWithParseStats`, to
 * `SourceDependentCounts`, to either envelope or to `meta` and to
 * none of the lists above turns {@link EveryKeyListed} into `never`,
 * and this initializer is then a TS2322 at this line — before any
 * case can compare a response against a set that has quietly
 * stopped describing it. Read in a case below so it is a symbol
 * this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link SOURCE_KEYS}, sorted at use rather than by hand. */
const SOURCE_KEY_SET: readonly string[] = [...SOURCE_KEYS].sort();

/** {@link LISTED_KEYS}, sorted. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/** {@link DEPENDENT_KEYS}, sorted. */
const DEPENDENT_KEY_SET: readonly string[] = [...DEPENDENT_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/**
 * Just enough of an answered source for an assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the two members the cases
 * below project out of a page.
 */
interface AddressedRow {
  /** Where the feed is read, and what a case finds a row by. */
  readonly endpoint: string;

  /** Which adapter family reads it. */
  readonly kind: string;

  /**
   * Which domain the row came out of.
   *
   * The one member no request in this file names, which is what
   * makes it a reading rather than an echo: a row answering it is
   * the store having said where the row sat.
   */
  readonly domainId: number;
}

/**
 * One planted `documents` row, as the seam takes it.
 *
 * @param id - The document id, unique here because it is also the
 *   tiebreak the failures queue orders on — a queue this router
 *   does not serve, but one dataset stands behind both.
 * @returns The row, `ok` rather than `failed`: what these cases
 *   need from a document is that it CITES a source, which is the
 *   `documents_source_id_sources_id_fk` refusal and is the same
 *   whichever side of the parse check the row sits on.
 */
function capture(id: number): MemorySourceDocument {
  return {
    id,
    url: `${FEED_ENDPOINT}#${id}`,
    body: 'a captured document',
    parseError: null,
    capturedAt: CAPTURED_AT,
    parseStatus: 'ok',
  };
}

/**
 * The path a domain's sources are listed and created under.
 *
 * @param slug - The domain's natural key, or whatever a case is
 *   sending in its place.
 * @returns The wire path, root-absolute as the router declares it.
 */
function sourcesPath(slug: string): string {
  return `/domains/${slug}/sources`;
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's endpoint.
 */
function endpointsOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.endpoint);
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's domain id, so a page can be held to ONE
 *   domain rather than to a length that a second domain's rows
 *   would also satisfy.
 */
function domainIdsOf(body: { data: readonly AddressedRow[] }): number[] {
  return body.data.map((row) => row.domainId);
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
 *   answers.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
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
 * Builds an app carrying one freshly built sources router.
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
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on this group reads the present.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildSourcesApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSourcesRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains, four sources, two planted dependent states, and the
 * app in front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each of its four rows earns its place. The three under
 * {@link STORED_SLUG} are a collection a window can be narrower
 * than, and they are one per state the delete guard decides on:
 * {@link FEED_ENDPOINT} holds documents and no sightings,
 * {@link ITEMS_ENDPOINT} is cited by sightings and holds no
 * documents, and {@link ARCHIVE_ENDPOINT} is held by nothing at
 * all. The row under {@link OTHER_SLUG} is the scope control — it
 * is what says a list is a page of one DOMAIN's sources rather than
 * of the table, and it is the row every delete leaves standing.
 *
 * EACH COUNTED TABLE IS PLANTED ALONE, which is what makes the
 * refusal name a table rather than a total. A guard reading one of
 * the two, or summing them before either is counted, answers a row
 * holding both perfectly and fails exactly one of the two subjects
 * below.
 *
 * Planted through the PORT and the two seams rather than through
 * `POST /domains/:slug/sources`, so a case about a delete is not
 * also a case about the create route — and so the refused delete
 * is refused by rows it did not have to write successfully first.
 * No route on this router can write a `documents` row or a sighting
 * at all, which is the read-only rule `./store.ts` states as an
 * absence of methods.
 *
 * @returns The app, the id of the domain the three rows sit in, and
 *   their own ids. The store is not handed back: every reading a
 *   case takes afterwards is a response, so a case reaching past
 *   the surface under test would be pinning the fixture rather than
 *   the router. The source ids are addresses rather than readings
 *   — a request cannot name a row without one. The DOMAIN id is a
 *   reading, and the only one here that is: no request below names
 *   it, so a row answering it is the store having said which domain
 *   the row came out of.
 */
async function withSources(): Promise<{
  app: Application;
  domainId: number;
  feedId: number;
  itemsId: number;
  archiveId: number;
}> {
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
  const feed = await store.insertSource({
    domainId: stored.id,
    kind: RSS_KIND,
    endpoint: FEED_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const items = await store.insertSource({
    domainId: stored.id,
    kind: API_KIND,
    endpoint: ITEMS_ENDPOINT,
    parserConfig: { itemsAt: 'data.releases' },
    contract: { required: ['title'] },
    enabled: true,
  });
  const archive = await store.insertSource({
    domainId: stored.id,
    kind: URL_KIND,
    endpoint: ARCHIVE_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  await store.insertSource({
    domainId: other.id,
    kind: RSS_KIND,
    endpoint: TRANSIT_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  store.setSourceDocuments(feed.id, [capture(1), capture(2)]);
  store.setSourceSightings(items.id, HELD_SIGHTINGS);

  return {
    app: buildSourcesApp(store),
    domainId: stored.id,
    feedId: feed.id,
    itemsId: items.id,
    archiveId: archive.id,
  };
}

// ---------------------------------------------------------------------------
// What the fixture below plants, and what every answer is held to
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants one source per state the delete guard decides on', () => {
    // Distinct endpoints, so a case finding a row by its address
    // cannot find the wrong one. `sources` has no unique key at
    // all, so nothing in the store would have refused a repeat and
    // the fixture is the only thing that can say they differ.
    const endpoints = [
      FEED_ENDPOINT,
      ITEMS_ENDPOINT,
      ARCHIVE_ENDPOINT,
      TRANSIT_ENDPOINT,
      FRESH_ENDPOINT,
    ];

    expect(new Set(endpoints).size).toBe(endpoints.length);
    // The two counts differ, which is what makes a refusal's
    // `details` legible: a record built with the members swapped
    // answers a total that still adds up.
    expect(HELD_DOCUMENTS).not.toBe(HELD_SIGHTINGS);
    // And both are above zero, so each refusal below is reached by
    // a table that actually holds something. A plant of none would
    // leave the delete landing and the case reading as a guard that
    // stopped guarding.
    expect(HELD_DOCUMENTS).toBeGreaterThan(0);
    expect(HELD_SIGHTINGS).toBeGreaterThan(0);
    // The two `409`s below spread their counts onto ONE sentence,
    // so that sentence must carry no counts of its own: a message
    // naming a number would make both assertions green against a
    // refusal that had stopped reading either table.
    expect(keysOf(SOURCE_HOLDS_ROWS_BODY))
      .toStrictEqual(['code', 'message']);
  });

  it('reads both kind controls off the runtime tuple', () => {
    // Read off `SOURCE_KINDS` rather than trusting two literals, so
    // the pair stays two-directional: a member ADDED to the tuple
    // makes the refused row legal and reddens here, and a member
    // REMOVED makes the accepted row illegal and reddens here too.
    // Neither direction is reachable from the other, and neither is
    // reported by any assertion in the case itself.
    const kinds: readonly string[] = SOURCE_KINDS;

    expect(kinds).toContain(ACCEPTED_KIND);
    expect(kinds).not.toContain(UNREGISTERED_KIND);
    // The three transports the fixture plants are members too, so a
    // planted row is not itself a row the schema would refuse.
    expect(kinds).toContain(RSS_KIND);
    expect(kinds).toContain(API_KIND);
    expect(kinds).toContain(URL_KIND);
    // And the accepted control is a kind NO planted row carries, so
    // the create it lands is legible as this case's own row.
    expect([RSS_KIND, API_KIND, URL_KIND]).not.toContain(ACCEPTED_KIND);
  });
});

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // `SourceRecord`, to the list row, to the dependent counts, to
    // either envelope or to `meta` and to none of the lists is a
    // TS2322 at that declaration, before any assertion below can
    // compare a response against a set that has quietly stopped
    // describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`, which
    // is `okPage`'s stated contract and the one difference this
    // router's two success shapes are read apart by.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // The list row IS the record plus the aggregate, which is the
    // one place a read on this router answers more than the table.
    expect(LISTED_KEY_SET)
      .toStrictEqual([...SOURCE_KEY_SET, 'parseStats'].sort());
    // And the member both payload cases refuse is ON the record,
    // which is what those cases are FOR: `flagged` is answered on
    // every read here and accepted by no request, and a projection
    // that dropped it would leave both of them green.
    expect(SOURCE_KEY_SET).toContain(REFUSED_MEMBER);
  });
});

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no source
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withSources();

    const missing = await request(app).get(sourcesPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own. It also says what the 404 is FOR
    // — a domain reading nothing is a 200 carrying `data: []`, so
    // only a domain that is not there answers this way.
    const found = await request(app).get(sourcesPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(PLANTED_SOURCES);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withSources();
    const body = { kind: RSS_KIND, endpoint: FRESH_ENDPOINT };

    const missing = await request(app)
      .post(sourcesPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(sourcesPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createSource` parses the body BEFORE it
    // resolves the slug, so a malformed one would be answered 422
    // and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.endpoint).toBe(FRESH_ENDPOINT);
  });
});

describe('an id naming no source', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, archiveId } = await withSources();
    const patch = { enabled: false };

    const missing = await request(app)
      .patch(`/sources/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/sources/${archiveId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SOURCE_BODY);
    expect(found.status).toBe(200);
    // Retiring a feed is this route, and the control is what says
    // so: `enabled` is the operator's own column, where the five
    // beside it are the pipeline's and are refused below.
    expect(found.body.data.enabled).toBe(false);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, archiveId } = await withSources();

    const missing = await request(app).delete(`/sources/${ABSENT_ID}`);
    const removed = await request(app).delete(`/sources/${archiveId}`);
    const afterwards = await request(app).get(sourcesPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SOURCE_BODY);
    // Nothing cites the archive row, so this delete meets no guard.
    // That the domain reads two feeds afterwards is what says the
    // 204 was a delete rather than a handler answering without
    // acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(PLANTED_SOURCES - 1);
    expect(endpointsOf(afterwards.body)).not.toContain(ARCHIVE_ENDPOINT);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, archiveId } = await withSources();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    //
    // The patch carries a body the schema WOULD refuse, sent under
    // a segment that is not an id. The answer names the SEGMENT,
    // which is the one reading in this file that the router narrows
    // its address before `patchSource` sees a body: a handler in
    // the other order answers about `kind` and passes every other
    // case here.
    const onPatch = await request(app)
      .patch('/sources/abc')
      .send({ kind: UNREGISTERED_KIND });
    const onDelete = await request(app).delete('/sources/abc');
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).delete(`/sources/${archiveId}`);

    // BOTH routes that take an `:id`, against ONE body constant:
    // two handlers are two chances to narrow the segment in only
    // one of them, and nothing else in this package would report
    // the half that was left raw.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });

  it('answers 422 naming the slug rather than 404', async () => {
    const { app } = await withSources();

    // Upper case, which `slugParamSchema` refuses and which a
    // lookup would simply not find. The two routes that take a
    // `:slug` are not the two that take an `:id`, so this case and
    // the one above narrow disjoint halves of the router — and
    // this one is the only reading in the file that the narrowing
    // is load-bearing at all: an unnarrowed segment answers the
    // same 404 every other slug case asserts.
    const onList = await request(app).get(sourcesPath('Example-Radar'));
    const onCreate = await request(app)
      .post(sourcesPath('Example-Radar'))
      .send({ kind: RSS_KIND, endpoint: FRESH_ENDPOINT });
    const aSlug = await request(app).get(sourcesPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap this surface serves
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app, domainId } = await withSources();
    const sources = sourcesPath(STORED_SLUG);

    const overCap = await request(app).get(`${sources}?perPage=201`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get(`${sources}?perPage=200`);

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
    expect(endpointsOf(atCap.body)).toHaveLength(PLANTED_SOURCES);
    // Every row came out of the ONE domain the path named, which a
    // length alone cannot say: the fixture plants a fourth source
    // under a second domain, and a store answering the whole table
    // would satisfy the count and fail here.
    expect(new Set(domainIdsOf(atCap.body))).toStrictEqual(
      new Set([domainId]),
    );
    // The three shapes this answer is held to, read as key SETS
    // rather than as fields: a member arriving that nobody asserted
    // is invisible to every field read in this file.
    expect(keysOf(atCap.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(atCap.body.meta)).toStrictEqual(META_KEY_SET);
    expect(atCap.body.data.map(keysOf)).toStrictEqual(
      Array.from({ length: PLANTED_SOURCES }, () => LISTED_KEY_SET),
    );
  });
});

// ---------------------------------------------------------------------------
// The payload: a transport nobody registered, and a flag nobody owns
// ---------------------------------------------------------------------------

describe('a body naming a transport nobody registered', () => {
  it('answers 422 from both writes, quoting nothing sent', async () => {
    const { app, archiveId } = await withSources();

    const created = await request(app)
      .post(sourcesPath(STORED_SLUG))
      .send({ kind: UNREGISTERED_KIND, endpoint: FRESH_ENDPOINT });
    const patched = await request(app)
      .patch(`/sources/${archiveId}`)
      .send({ kind: UNREGISTERED_KIND });
    // The controls, along the axis under test and through the SAME
    // two operations: a member of `SOURCE_KINDS` no planted row
    // carries. Without them the pair above is equally green against
    // a router refusing every `kind` it is handed — and `kind` is
    // patchable on this table, which no natural key on this surface
    // is, so each write is a separate call site that could stop
    // holding to the tuple on its own.
    const accepted = await request(app)
      .post(sourcesPath(STORED_SLUG))
      .send({ kind: ACCEPTED_KIND, endpoint: FRESH_ENDPOINT });
    const repointed = await request(app)
      .patch(`/sources/${archiveId}`)
      .send({ kind: ACCEPTED_KIND });

    // `invalid_value` and not `invalid_type`, which is what an enum
    // answers: the whole envelope on both, because the detail is
    // the answer here rather than an accompaniment to the status.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(BAD_KIND_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(BAD_KIND_BODY);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.kind).toBe(ACCEPTED_KIND);
    expect(repointed.status).toBe(200);
    expect(repointed.body.data.kind).toBe(ACCEPTED_KIND);
    // The record a write answers is the whole row and not the list
    // row: no `parseStats` on either, which is the one member the
    // aggregate adds and the difference the two shapes are read
    // apart by.
    expect(keysOf(accepted.body.data)).toStrictEqual(SOURCE_KEY_SET);
    expect(keysOf(repointed.body.data)).toStrictEqual(SOURCE_KEY_SET);
    expect(keysOf(accepted.body)).toStrictEqual(RESOURCE_KEY_SET);

    // A COUNT rather than an absence, over the serialised body: the
    // unregistered transport is the one VALUE any request in this
    // file submits that a refusal could plausibly repeat.
    const leaked = JSON.stringify({
      ...BAD_KIND_BODY,
      details: [{
        field: 'kind',
        message: `Not one of the accepted values: ${UNREGISTERED_KIND}.`,
        code: 'invalid_value',
      }],
    });

    expect(countOccurrences(JSON.stringify(created.body), UNREGISTERED_KIND))
      .toBe(0);
    expect(countOccurrences(JSON.stringify(patched.body), UNREGISTERED_KIND))
      .toBe(0);
    // The planted control: without it both zeros above are equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, UNREGISTERED_KIND)).toBe(1);
  });
});

describe('a body naming the flag the pipeline owns', () => {
  it('answers 422 from both writes, naming the body itself', async () => {
    const { app, archiveId } = await withSources();

    const created = await request(app)
      .post(sourcesPath(STORED_SLUG))
      .send({
        kind: RSS_KIND,
        endpoint: FRESH_ENDPOINT,
        flagged: true,
      });
    const patched = await request(app)
      .patch(`/sources/${archiveId}`)
      .send({ flagged: false });
    // The control, along the axis under test and through the SAME
    // operation: the identical create with the member removed. It
    // is accepted, and the column it named is ANSWERED as false —
    // so the pair says the refusal is about that member rather than
    // about a router refusing every create it is handed, and that
    // the column is projected rather than hidden.
    const accepted = await request(app)
      .post(sourcesPath(STORED_SLUG))
      .send({ kind: RSS_KIND, endpoint: FRESH_ENDPOINT });

    // The WHOLE envelope on both, because the detail is the answer
    // here rather than an accompaniment to the status: it names
    // `body` rather than the key, since the key itself is something
    // the request said.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(FLAGGED_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(FLAGGED_BODY);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.flagged).toBe(false);
    // The four pipeline-owned columns beside it are answered on
    // that same create, which is the other half of the rule: this
    // surface reports a feed's history and accepts none of it.
    expect(accepted.body.data.cursor).toBeNull();
    expect(accepted.body.data.consecutiveFailures).toBe(0);
    expect(accepted.body.data.lastSuccessAt).toBeNull();
    expect(accepted.body.data.lastFailureAt).toBeNull();

    // A COUNT rather than an absence, over the serialised body: a
    // key is something the request said, so a detail naming it back
    // would be the same leak the value half of this pair guards.
    const leaked = JSON.stringify({
      ...FLAGGED_BODY,
      details: [{
        field: 'body',
        message: `Carries the unknown key ${REFUSED_MEMBER}.`,
        code: 'unrecognized_keys',
      }],
    });

    expect(countOccurrences(JSON.stringify(created.body), REFUSED_MEMBER))
      .toBe(0);
    expect(countOccurrences(JSON.stringify(patched.body), REFUSED_MEMBER))
      .toBe(0);
    // The planted control: without it both zeros above are equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, REFUSED_MEMBER)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete the corpus refuses, one counted table at a time
// ---------------------------------------------------------------------------

describe('a delete of a source the corpus still cites', () => {
  it('answers 409 carrying both counts, one table each', async () => {
    const { app, feedId, itemsId, archiveId } = await withSources();

    const byDocuments = await request(app).delete(`/sources/${feedId}`);
    const bySightings = await request(app).delete(`/sources/${itemsId}`);
    // The control, along the axis under test and through the SAME
    // operation: a source nothing cites. Without it both refusals
    // are equally green against a router refusing every delete it
    // is handed, and against a guard that had stopped counting and
    // started refusing.
    const removed = await request(app).delete(`/sources/${archiveId}`);
    const afterwards = await request(app).get(sourcesPath(STORED_SLUG));

    // The WHOLE envelope on both, `details` included, because the
    // counts ARE the answer: an operator reading what a delete
    // would have taken is reading those two numbers. Each carries
    // the counted ZERO of the table it does not hold, which is a
    // different fact from a table nobody counted.
    expect(byDocuments.status).toBe(409);
    expect(byDocuments.body).toStrictEqual({
      ...SOURCE_HOLDS_ROWS_BODY,
      details: { documents: HELD_DOCUMENTS, findingSightings: 0 },
    });
    expect(bySightings.status).toBe(409);
    expect(bySightings.body).toStrictEqual({
      ...SOURCE_HOLDS_ROWS_BODY,
      details: { documents: 0, findingSightings: HELD_SIGHTINGS },
    });
    // Swept off the interface rather than named twice, so a third
    // counted table reddens this case rather than travelling
    // unasserted.
    expect(keysOf(byDocuments.body.details)).toStrictEqual(DEPENDENT_KEY_SET);
    expect(keysOf(bySightings.body.details)).toStrictEqual(DEPENDENT_KEY_SET);
    expect(removed.status).toBe(204);
    // No body at all on the way that lands, which is what `204`
    // means and what an envelope here would contradict.
    expect(keysOf(removed.body)).toStrictEqual([]);
    // And both refused rows are still standing, which is what says
    // the 409 left the table where it was rather than refusing
    // after acting.
    expect(endpointsOf(afterwards.body)).toStrictEqual(
      [FEED_ENDPOINT, ITEMS_ENDPOINT],
    );
  });
});
