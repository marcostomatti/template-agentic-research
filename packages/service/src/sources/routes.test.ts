/**
 * `src/sources/routes.ts` — what each of the four routes answers,
 * refusing and landing: the status, the envelope and the members
 * each reaches the wire with. Driven over supertest against a
 * router built by the real factory, standing on
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
 * TWENTY CASES IN FOURTEEN GROUPS. Three guard the fixture and the
 * key lists every answer is read through; ten cover the ways a
 * request here can be wrong — six the address, one the window, two
 * the payload, and one the delete guard driven against both counted
 * tables in turn; and seven cover what the four routes answer when
 * they LAND.
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
 * is handed. What that pair cannot say is that the window SELECTS,
 * since both of its reads are wide enough to carry the whole
 * collection; the positive half reads two windows of one over the
 * same three rows for that.
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
 * WHAT A LIST ANSWERS IS A WINDOW AND THE COLLECTION AROUND IT.
 * One wide read carries all three of the domain's sources beside a
 * `meta` asserted WHOLE, and two windows of one over those same
 * rows are read with it: a handler ignoring the window answers all
 * three to every call, and a `total` taken from the rows in hand
 * answers 1 to each of the narrow pair. The order is id ascending,
 * which the addresses alone cannot report — the archive row sorts
 * first alphabetically and was planted last — so the page's order
 * is the store's own rule rather than the fixture's.
 *
 * THE FIVE HEALTH COLUMNS AND THE AGGREGATE ARE READ ON EVERY ROW,
 * which is what this list has that no sibling group's does. The
 * five are compared as a whole record per row against one roster
 * — {@link HEALTH_KEYS}, held to `SourceRecord` by `satisfies` —
 * with one row RETIRED first, so a read filling them with constants
 * answers all three alike and fails there. The aggregate is keyed
 * by the whole `DOCUMENT_PARSE_STATUSES` tuple on every row and not
 * by the statuses that happen to have documents: a grouped read
 * answers a row per status that HAS some, and an implementation
 * handing those groups straight back answers a record whose members
 * differ per source.
 *
 * AND THE FIXTURE CARRIES BOTH ABSENCE SHAPES A GROUPED READ HAS.
 * The feed captured under BOTH members with DIFFERENT counts, so a
 * record built with the two statuses swapped is a red case rather
 * than a total that still adds up; its two neighbours captured
 * nothing at all and answer a COUNTED zero under each member, which
 * is the trap `ParseStatusCounts` names — a status with no rows
 * contributes no group, and letting that through would make `0` and
 * never-counted one value. One row is read member by member off the
 * tuple so a failure names the status that went missing, and every
 * expectation derived from the tuple is guarded by a length read,
 * since an emptied tuple would make each of them vacuously true.
 *
 * A CREATE ANSWERS `201` AND THE STORED ROW, compared WHOLE against
 * the request rather than by the members the case is named for: a
 * create reaching a column nobody submitted is exactly as wrong as
 * one dropping a member, and invisible to a pair of field reads.
 * Its control is the same operation carrying the two members the
 * schema requires and nothing else, which is what makes the three
 * values that differ between them DEFAULTS rather than constants —
 * an empty arrangement, an empty contract and an enabled feed. The
 * five pipeline-owned columns are the point of the compare: no body
 * may name one, so a create is the only place their landing value
 * is decided at all.
 *
 * A PATCH REPLACES ITS ARRANGEMENT WHOLE AND MERGES NOTHING INTO
 * IT, which is legible only because the stored config and the
 * submitted one are keyed DISJOINTLY: the answer carries one key
 * where a merge would carry three. The rest of that row is compared
 * whole in the same breath, so the transport, the address, the
 * sibling jsonb member and all five pipeline columns coming through
 * untouched is the same assertion rather than five more. A second
 * patch naming a member the first did not is the control that the
 * write is not a rewrite of every column.
 *
 * RETIRING A FEED IS ITS OWN CASE, because `enabled` is the one
 * health column an operator can move and because the refused delete
 * earlier in this file names that very operation as the one that
 * was wanted. The address, the arrangement and everything captured
 * through the feed are read back afterwards: a retirement that took
 * the corpus with it would leave the status and the flag green.
 * Its control is the identical request carrying `true`.
 *
 * A DELETE ANSWERS `204` AND CARRIES NOTHING, asserted as an empty
 * key set beside an empty body and an empty content type — a
 * deleted resource has no representation, so what is claimed is
 * that NOTHING travelled rather than that some envelope did. The
 * row is gone, both neighbours are standing, the second domain
 * still reads its own feed, and the identical request afterwards is
 * a `404`: that last is what makes the `204` a delete rather than
 * what this route answers to any id it is handed.
 *
 * EVERY WRITE IS READ BACK THROUGH THE OTHER OPERATION. What a
 * create, a patch and a retirement answered is compared against
 * what a list carries afterwards, because a write returning a row
 * it never stored satisfies every assertion made against its own
 * response. The collection is read WHOLE in each of those cases, so
 * a write reaching more rows than the one it addressed is a red
 * case rather than an answer nobody compared against anything.
 *
 * ANTI-VACUITY. A router that refused everything, or that answered
 * every read the same row, would satisfy most of what is below, so
 * each case carries its own control in the same body, varied along
 * the axis under test: each `404` reads what IS there through the
 * SAME operation, the not-an-id case ends on an id that is one, the
 * over-cap `perPage` is paired with a request at exactly the cap,
 * the refused `kind` is paired with a member of the tuple through
 * both writes, the refused member is removed and resent, the
 * refused delete is paired with a source nothing cites, the wide
 * list read is paired with two windows of one, the health read is
 * taken after one row was retired, the full create body is paired
 * with the two members the schema requires and nothing else, the
 * arrangement patch is followed by one naming a member it never
 * did, the retirement is paired with the same request carrying
 * `true`, and the `204` is followed by the same request answering
 * `404`.
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
 * MUTATION GRID, re-derived over all twenty cases by mutating
 * `routes.ts` one edit at a time and reading the failed `fullName`
 * SET from a `--reporter=json` run rather than a count. EIGHT legs,
 * each named by the EDIT it makes rather than by its effect, since
 * a leg described only by its effect is one nobody can run again.
 * All eight were re-run rather than carried forward, and SEVEN
 * moved: a positive half addresses rows, reads statuses and reads
 * `meta`, which is most of what this router does.
 *
 * THE TWO ADDRESS LEGS ARE NOT ONE LEG TWICE, and only one of them
 * moved. Returning the segment raw from {@link readId} reddens
 * NINE, up from five — every case that addresses a row by id AND
 * gets an answer out of the store, which is now the two `404`
 * cases, the not-an-id case, the delete guard, the kind case's
 * accepted patch, both patch cases, the list's health read and the
 * delete that lands. Returning it raw from {@link readSlug} still
 * reddens exactly ONE, the not-a-slug case, and that is this file's
 * shape rather than an omission: every other slug it sends is well
 * formed, so an unnarrowed segment answers the same `404` those
 * cases already assert, and no route this file added takes a
 * `:slug` it does not already send well.
 *
 * THE `flagged` PATCH IS STILL IN NEITHER SET, which is the
 * ordering showing up as a measurement: `patchSource` parses the
 * body before it writes, so a body the schema refuses is answered
 * whatever the id was. Nine reds against TEN cases that send an
 * `:id` is that one case, and the kind case's patch is in the
 * `readId` set only through the ACCEPTED control beside it.
 *
 * THE THREE STATUS LEGS SEPARATE AND ALL THREE MOVED, each by
 * exactly the cases now named for it. `res.status(201)` written as
 * `200` on the create reddens FOUR, up from three: the landing
 * controls plus the case that is about a create.
 * `res.status(204)` written as `200` on the delete reddens FOUR, up
 * from three, on the same terms. `res.status(200)` written as `204`
 * on the patch reddens FIVE, up from two — the two patch cases and
 * the list's health read, which retires a row through that route
 * before it reads.
 *
 * `ok(page.rows)` IN PLACE OF `okPage(page.rows, meta)` REDDENS
 * FIVE, up from one: every case that reads a `meta` at all, which
 * is the window refusal, the list envelope, and the three write
 * cases that count a collection through `meta.total`.
 *
 * AND THE TWO LEGS THAT REDDENED NOTHING BOTH REPORT NOW, each by
 * the single case that gave them something to report. A fixed
 * `{ limit: 50, offset: 0 }` in place of `toStoreWindow(query)`
 * reddens ONE, and `total: page.rows.length` in place of
 * `total: page.total` reddens ONE — the list case, and the same
 * one for both. The recorded zeros were the refusal half's shape
 * rather than a hole in it: no case there could afford a window
 * narrower than the collection it read, so every page held every
 * row and the two numbers agreed. Both legs are still ONE rather
 * than more, because every other case here reads its `meta.total`
 * through the default window over a collection that fits inside it.
 */
import type {
  ParseStatusCounts,
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
import {
  DOCUMENT_PARSE_STATUSES,
  SOURCE_KINDS,
} from '../db/schema/values.js';

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

/**
 * A second endpoint no planted row carries.
 *
 * The sparse create's address, so the two creates in one case land
 * two rows rather than one: `sources` has no unique key at all, so
 * a pair sharing an address would be storable and the page they
 * joined could not tell them apart.
 */
const SPARE_ENDPOINT = 'https://example.test/radar/digest.json';

/** A third, and the address the patch case repoints a feed onto. */
const MOVED_ENDPOINT = 'https://example.test/radar/items.v2';

/**
 * The arrangement {@link ITEMS_ENDPOINT} is read under.
 *
 * TWO keys rather than one, because the patch case's whole claim is
 * that a submitted arrangement REPLACES this one: a merge answers
 * the union, and a union is only distinguishable from a replacement
 * where the stored value carries a key the request did not send.
 */
const ITEMS_CONFIG = { itemsAt: 'data.releases', page: 'cursor' };

/** The contract its payloads are held to, and no patch names. */
const ITEMS_CONTRACT = { required: ['title'] };

/** The arrangement a create submits, keyed unlike every other. */
const FRESH_CONFIG = { selector: 'main article', follow: false };

/** The contract that create submits beside it. */
const FRESH_CONTRACT = { required: ['title', 'url'] };

/**
 * The arrangement the patch case writes over {@link ITEMS_CONFIG}.
 *
 * Keyed DISJOINTLY from what is stored, so a merge is legible as a
 * key set of three where a replacement is one of one.
 */
const PATCHED_CONFIG = { xmlPath: 'channel.item' };

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the list case, which asserts `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * being a default.
 */
const DEFAULT_PER_PAGE = 50;

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
 * How many documents {@link FEED_ENDPOINT} captured that PARSED.
 *
 * DIFFERENT from {@link FAILED_CAPTURES}, which is what makes the
 * aggregate legible on the page: a record built with the two
 * statuses swapped counts correctly under any fixture that gives
 * them the same total.
 */
const OK_CAPTURES = 2;

/** How many of its captures did not parse under their contract. */
const FAILED_CAPTURES = 1;

/**
 * How many documents the corpus holds through {@link FEED_ENDPOINT}.
 *
 * The two statuses summed rather than a third literal beside them,
 * so the delete guard's count and the aggregate's are one reading:
 * `countSourceDependents` counts a source's documents whatever
 * side of the parse check they sit on.
 *
 * DIFFERENT from {@link HELD_SIGHTINGS}, which is what makes the
 * two counts in a refusal legible: a record built with the members
 * swapped answers a total that still adds up and two numbers in the
 * wrong places.
 */
const HELD_DOCUMENTS = OK_CAPTURES + FAILED_CAPTURES;

/** How many sightings cite {@link ITEMS_ENDPOINT}. */
const HELD_SIGHTINGS = 4;

/** How many sources {@link STORED_SLUG} is planted with. */
const PLANTED_SOURCES = 3;

/**
 * The addresses those three answer at, in the order a page carries
 * them.
 *
 * ID ASCENDING, which the endpoints alone cannot report: the
 * archive row sorts FIRST alphabetically and was planted LAST, so a
 * list answering this order is the store's own rule rather than the
 * addresses' or the fixture's. Held to the count above by a guard,
 * so a fourth planted row cannot leave this list describing three.
 */
const LISTED_ENDPOINTS = [
  FEED_ENDPOINT,
  ITEMS_ENDPOINT,
  ARCHIVE_ENDPOINT,
];

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

/**
 * The columns an operator reads a feed's HEALTH off.
 *
 * Four are the pipeline's own and `enabled` is the operator's,
 * which is the pairing that makes the reading useful: a feed
 * failing every pass and a feed somebody switched off are two
 * states an operator has to tell apart, and both reach the wire
 * here. `cursor` is the pipeline's fifth column and is not a health
 * reading at all — it is where the last pass got to — so it sits
 * in {@link SOURCE_KEYS} and in every whole-row compare below
 * rather than in this roster.
 *
 * Held to `SourceRecord` by `satisfies`, so a renamed column is a
 * refusal here rather than a string nobody reads, and to
 * {@link ListedRow} by the `Pick` beneath it.
 */
const HEALTH_KEYS = [
  'consecutiveFailures',
  'enabled',
  'flagged',
  'lastFailureAt',
  'lastSuccessAt',
] as const satisfies readonly (keyof SourceRecord)[];

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
 * What the aggregate reads as for a source that captured nothing.
 *
 * Built from `DOCUMENT_PARSE_STATUSES` rather than from two
 * literals, so a member added to that tuple is expected here the
 * day it lands rather than left out of every comparison below. The
 * cast is what `Object.fromEntries` costs: it answers an index
 * signature, and the record this stands for is keyed by the tuple.
 *
 * An emptied tuple would make every expectation built from it
 * vacuously true, which the shapes case guards with a length read.
 */
const NO_CAPTURES: ParseStatusCounts = Object.fromEntries(
  DOCUMENT_PARSE_STATUSES.map((status) => [status, 0]),
) as ParseStatusCounts;

/**
 * What it reads as for {@link FEED_ENDPOINT}, the one planted
 * source that captured anything.
 *
 * Spread over {@link NO_CAPTURES} rather than written out, so a
 * status added to the tuple arrives here as a counted zero. The two
 * named members carry DIFFERENT numbers, which is what makes the
 * record legible: one built with the two statuses swapped counts
 * correctly under any fixture that gives them the same total.
 */
const FEED_COUNTS: ParseStatusCounts = {
  ...NO_CAPTURES,
  ok: OK_CAPTURES,
  failed: FAILED_CAPTURES,
};

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
 * The same row as a LIST answers it: the five health columns, and
 * the aggregate no other read on this router carries.
 *
 * `string | null` on the two stamps rather than `Date`, because
 * this is the row as it came back OFF the wire — `res.json`
 * serialises through `Date#toJSON`, so a source a pass has read
 * answers an ISO-8601 spelling where one nothing has read answers
 * null. Every row this file plants or creates is the second, which
 * is what {@link NEVER_FETCHED} records.
 */
interface ListedRow extends AddressedRow {
  /** How many passes in a row have failed since the last success. */
  readonly consecutiveFailures: number;

  /** Whether the pipeline may read the feed at all. */
  readonly enabled: boolean;

  /** Whether the adapter-rot detector has spoken about it. */
  readonly flagged: boolean;

  /** When a pass last failed, as JSON carries it. */
  readonly lastFailureAt: string | null;

  /** When a pass last succeeded, on the same terms. */
  readonly lastSuccessAt: string | null;

  /** The parse-status aggregate, keyed by the whole tuple. */
  readonly parseStats: Readonly<Record<string, number>>;
}

/**
 * Exactly the members {@link HEALTH_KEYS} names, as the wire has
 * them.
 *
 * `Pick` over {@link ListedRow} rather than a second hand-written
 * interface, so the roster is the only place those five are listed:
 * a member added to it that the wire row does not declare is a
 * refusal at this line.
 */
type SourceHealth = Pick<ListedRow, (typeof HEALTH_KEYS)[number]>;

/**
 * What every health column reads as on a source nothing has
 * fetched, which is every source this file plants or creates.
 *
 * Typed as {@link SourceHealth}, so a column added to
 * {@link HEALTH_KEYS} is a missing member here rather than a roster
 * the expectations below quietly stopped covering.
 */
const NEVER_FETCHED: SourceHealth = {
  consecutiveFailures: 0,
  enabled: true,
  flagged: false,
  lastFailureAt: null,
  lastSuccessAt: null,
};

/**
 * One planted `documents` row, as the seam takes it.
 *
 * @param id - The document id, unique here because it is also the
 *   tiebreak the failures queue orders on — a queue this router
 *   does not serve, but one dataset stands behind both.
 * @returns The row, on the `ok` side of the parse check. The
 *   delete guard needs only that a document CITES a source, which
 *   is the `documents_source_id_sources_id_fk` refusal and is the
 *   same whichever side it sits on; the list's aggregate groups
 *   ACROSS both members of `DOCUMENT_PARSE_STATUSES`, so
 *   {@link failedCapture} supplies the other.
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
 * One planted `documents` row that did NOT parse.
 *
 * @param id - The document id, on the same terms {@link capture}
 *   gives.
 * @returns The row, `failed` and carrying the reason. A fixture
 *   that could plant only the `ok` side would leave a record keyed
 *   by the wrong status counting correctly, which is the whole of
 *   why this exists beside its sibling.
 */
function failedCapture(id: number): MemorySourceDocument {
  return {
    ...capture(id),
    parseError: 'the payload did not match the contract',
    parseStatus: 'failed',
  };
}

/**
 * Every document the corpus holds through {@link FEED_ENDPOINT}.
 *
 * Built FROM the two counts rather than beside them, so the plant
 * and every expectation read off {@link FEED_COUNTS} are one
 * statement: a fixture listing its rows by hand can disagree with
 * the constants a case compares against, and nothing would report
 * it.
 *
 * @returns {@link OK_CAPTURES} rows that parsed followed by
 *   {@link FAILED_CAPTURES} that did not, ids ascending and
 *   distinct — the failures queue orders on that tiebreak, and one
 *   dataset stands behind both readers.
 */
function feedCaptures(): MemorySourceDocument[] {
  const parsed = Array.from(
    { length: OK_CAPTURES },
    (_unused, index) => capture(index + 1),
  );
  const refused = Array.from(
    { length: FAILED_CAPTURES },
    (_unused, index) => failedCapture(OK_CAPTURES + index + 1),
  );

  return [...parsed, ...refused];
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
 * The row a read carries at one address.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row would
 * otherwise reach `toStrictEqual` as `undefined` and pass against
 * any other absent row, which is a green nobody wrote. Two rows may
 * share an address on this table — `sources` carries no unique key
 * — which no case below plants and which would answer the first.
 *
 * @param rows - A read's `data`, as it came off the wire.
 * @param endpoint - The address to look for.
 * @returns The row reading it.
 * @throws Error - When the read carries no such row.
 */
function sourceFor(
  rows: readonly ListedRow[],
  endpoint: string,
): ListedRow {
  const row = rows.find((candidate) => candidate.endpoint === endpoint);

  if (row === undefined) {
    throw new Error(`The page carries no source reading ${endpoint}`);
  }

  return row;
}

/**
 * The health of one answered source.
 *
 * Written out member by member rather than folded off the roster,
 * because {@link SourceHealth} is then what checks it: a column
 * added to {@link HEALTH_KEYS} is a missing member here rather than
 * a key a fold would have silently skipped.
 *
 * @param row - The source, as a read answered it.
 * @returns Exactly the members {@link HEALTH_KEYS} names.
 */
function healthOf(row: ListedRow): SourceHealth {
  return {
    consecutiveFailures: row.consecutiveFailures,
    enabled: row.enabled,
    flagged: row.flagged,
    lastFailureAt: row.lastFailureAt,
    lastSuccessAt: row.lastSuccessAt,
  };
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
 * ITS DOCUMENTS STRADDLE THE PARSE CHECK, which the delete guard
 * has no use for and the list's aggregate does: {@link OK_CAPTURES}
 * of them parsed and {@link FAILED_CAPTURES} did not, so the record
 * on that row carries a different number under each member of
 * `DOCUMENT_PARSE_STATUSES` while its two neighbours carry a
 * counted zero under both. Those are the two absence shapes a
 * grouped read has — a source contributing no group at all, and one
 * contributing some groups but not all — and a fixture holding only
 * one of them leaves half the fold unproven.
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
    parserConfig: ITEMS_CONFIG,
    contract: ITEMS_CONTRACT,
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

  store.setSourceDocuments(feed.id, feedCaptures());
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
    // The page's order is the count's, so a fourth planted row
    // cannot leave the list of addresses describing three.
    expect(LISTED_ENDPOINTS).toHaveLength(PLANTED_SOURCES);
    // The two counts differ, which is what makes a refusal's
    // `details` legible: a record built with the members swapped
    // answers a total that still adds up.
    expect(HELD_DOCUMENTS).not.toBe(HELD_SIGHTINGS);
    // And the two parse statuses differ from each other for the
    // same reason one level down: an aggregate built with the two
    // members swapped counts correctly under any fixture that gives
    // them the same total. Both are above zero, so the row reaches
    // the page having captured under each.
    expect(OK_CAPTURES).not.toBe(FAILED_CAPTURES);
    expect(OK_CAPTURES).toBeGreaterThan(0);
    expect(FAILED_CAPTURES).toBeGreaterThan(0);
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
    // The health roster is a SUBSET of the record rather than a
    // list of its own: `satisfies` says so at the declaration for
    // the type, and this is that pin's runtime half — a column
    // renamed on the record and not on the roster is named here.
    expect(HEALTH_KEYS.filter((key) => !SOURCE_KEY_SET.includes(key)))
      .toStrictEqual([]);
    // The expectations read a health off name exactly the roster.
    expect(keysOf(NEVER_FETCHED)).toStrictEqual([...HEALTH_KEYS].sort());
    // Every aggregate expectation below is DERIVED from the status
    // tuple, so an emptied tuple would make each of them vacuously
    // true. Two members is what `documents_parse_status_check`
    // carries.
    expect(DOCUMENT_PARSE_STATUSES.length).toBeGreaterThan(1);
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

// ---------------------------------------------------------------------------
// The page: one window of a domain's sources, beside the meta for it
// ---------------------------------------------------------------------------

describe('a source list that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, domainId, itemsId } = await withSources();
    const sources = sourcesPath(STORED_SLUG);

    const whole = await request(app).get(sources);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, and a total taken from the rows in hand answers 1
    // to each of the narrow pair — which is the reading the refusal
    // half could not take, since no case there can afford a window
    // narrower than its collection. The wide read is what makes the
    // narrow ones read as narrowings OF something.
    const first = await request(app)
      .get(sources)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(sources)
      .query({ page: PLANTED_SOURCES, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    // THREE members and not two: this list applies a window, so it
    // carries the `meta` describing one — which is the difference
    // between the envelope `okPage` writes and the one `ok` does.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_SOURCES,
      totalPages: 1,
    });
    // Id ascending, which the addresses alone cannot report: the
    // archive row sorts FIRST alphabetically and was planted LAST,
    // so this order is the store's own rather than the endpoints'
    // or the order a case happened to read them in.
    expect(endpointsOf(whole.body)).toStrictEqual(LISTED_ENDPOINTS);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column. The list
    // row is the record PLUS the aggregate, which is the one read
    // on this router that answers more than the table holds.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(LISTED_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering every
    // read the same wrong row would satisfy any cross-response
    // compare. `domainId` is here because nothing else in this case
    // could say which domain the rows came out of, and the five
    // pipeline-owned columns because this projection is the whole
    // of how they reach a caller at all.
    expect(sourceFor(whole.body.data as ListedRow[], ITEMS_ENDPOINT))
      .toStrictEqual({
        id: itemsId,
        domainId,
        kind: API_KIND,
        endpoint: ITEMS_ENDPOINT,
        parserConfig: ITEMS_CONFIG,
        contract: ITEMS_CONTRACT,
        cursor: null,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        enabled: true,
        flagged: false,
        parseStats: NO_CAPTURES,
      });
    // The two windows are disjoint and each names the total of the
    // COLLECTION, which no page could have counted from its rows.
    expect(endpointsOf(first.body)).toStrictEqual([FEED_ENDPOINT]);
    expect(endpointsOf(last.body)).toStrictEqual([ARCHIVE_ENDPOINT]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_SOURCES,
      totalPages: PLANTED_SOURCES,
    });
    expect(last.body.meta).toStrictEqual({
      page: PLANTED_SOURCES,
      perPage: 1,
      total: PLANTED_SOURCES,
      totalPages: PLANTED_SOURCES,
    });
    // And every row came out of the ONE domain the path named,
    // which a length alone cannot say: the fixture plants a fourth
    // source under a second domain, and a store answering the whole
    // table would satisfy every count above and fail here.
    expect(new Set(domainIdsOf(whole.body))).toStrictEqual(
      new Set([domainId]),
    );
  });

  it('carries the health and the aggregate on every row', async () => {
    const { app, itemsId } = await withSources();

    // One feed is retired first, so a read filling the health
    // columns with constants answers all three rows alike and fails
    // here. `enabled` is the one of the five an operator can move
    // at all — the other four are the pipeline's, and both request
    // schemas refuse them.
    const retired = await request(app)
      .patch(`/sources/${itemsId}`)
      .send({ enabled: false });
    const listed = await request(app).get(sourcesPath(STORED_SLUG));
    const rows = listed.body.data as ListedRow[];

    expect(retired.status).toBe(200);
    expect(listed.status).toBe(200);
    // All five columns on all three rows, as whole records per row:
    // a projection dropping one of them answers a perfectly
    // plausible source, and the retired row is what says the read
    // is a reading rather than a constant.
    expect(rows.map(healthOf)).toStrictEqual([
      NEVER_FETCHED,
      { ...NEVER_FETCHED, enabled: false },
      NEVER_FETCHED,
    ]);
    // The aggregate is keyed by the WHOLE tuple on every row and
    // not by the statuses that happen to have documents: a grouped
    // read answers a row per status that HAS some, so an
    // implementation handing those groups straight back answers a
    // record whose members differ per source. Read off the tuple
    // `documents_parse_status_check` is generated from, so the two
    // are one reading rather than two literals that agree today.
    const tuple = [...DOCUMENT_PARSE_STATUSES].sort();

    expect(rows.map((row) => keysOf(row.parseStats)))
      .toStrictEqual(rows.map(() => tuple));
    // The counts, per row. The feed captured under BOTH members and
    // the two numbers differ, so a record built with the statuses
    // swapped is a red case rather than a total that still adds up;
    // its two neighbours captured nothing at all and answer a
    // COUNTED zero under each member, which is a different fact
    // from a member nobody counted.
    expect(sourceFor(rows, FEED_ENDPOINT).parseStats)
      .toStrictEqual(FEED_COUNTS);
    expect(sourceFor(rows, ITEMS_ENDPOINT).parseStats)
      .toStrictEqual(NO_CAPTURES);
    expect(sourceFor(rows, ARCHIVE_ENDPOINT).parseStats)
      .toStrictEqual(NO_CAPTURES);
    // And member by member off the same tuple for the row that
    // captured none, so a failure names the STATUS that went
    // missing rather than the record it sat in.
    const empty = sourceFor(rows, ARCHIVE_ENDPOINT).parseStats;

    expect(DOCUMENT_PARSE_STATUSES.map((status) => ({
      status,
      count: empty[status],
    }))).toStrictEqual(DOCUMENT_PARSE_STATUSES.map((status) => ({
      status,
      count: 0,
    })));
  });
});

// ---------------------------------------------------------------------------
// The resource: one source added, and the row the store answered
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the stored row, not the request', async () => {
    const { app, domainId } = await withSources();
    const sources = sourcesPath(STORED_SLUG);

    const created = await request(app)
      .post(sources)
      .send({
        kind: ACCEPTED_KIND,
        endpoint: FRESH_ENDPOINT,
        parserConfig: FRESH_CONFIG,
        contract: FRESH_CONTRACT,
        enabled: false,
      });
    // The control, along the axis under test and through the SAME
    // operation: the two members the schema requires and nothing
    // else. Three of this record's members are then the SERVICE's
    // defaults rather than the request's, so the pair says a create
    // writes what it was handed where a member was handed and
    // defaults only where one was not — a handler defaulting
    // unconditionally answers the first request wrongly, and one
    // dropping absent members answers the second wrongly.
    const sparse = await request(app)
      .post(sources)
      .send({ kind: RSS_KIND, endpoint: SPARE_ENDPOINT });

    expect(created.status).toBe(201);
    expect(sparse.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(sparse.body)).toStrictEqual(RESOURCE_KEY_SET);
    // The record and NOT the list row: no `parseStats` on either,
    // which is the one member the aggregate adds and the difference
    // the two success shapes are read apart by.
    expect(keysOf(created.body.data)).toStrictEqual(SOURCE_KEY_SET);
    expect(keysOf(sparse.body.data)).toStrictEqual(SOURCE_KEY_SET);
    expect(created.body.success).toBe(true);
    // The whole row, so a create reaching a member nobody submitted
    // is a red case rather than an answer three field reads agreed
    // with. The five pipeline-owned columns are the point of the
    // compare: no body may name one, so a create is the only place
    // their landing value is decided at all.
    expect(created.body.data).toStrictEqual({
      id: created.body.data.id,
      domainId,
      kind: ACCEPTED_KIND,
      endpoint: FRESH_ENDPOINT,
      parserConfig: FRESH_CONFIG,
      contract: FRESH_CONTRACT,
      cursor: null,
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      enabled: false,
      flagged: false,
    });
    // The three defaults, none of them on the sparse request: an
    // empty arrangement, an empty contract, and a feed the pipeline
    // may read. The `enabled: false` above is what makes the last
    // of those a DEFAULT rather than a constant — a handler writing
    // true whatever arrived passes here and fails the compare.
    expect(sparse.body.data.parserConfig).toStrictEqual({});
    expect(sparse.body.data.contract).toStrictEqual({});
    expect(sparse.body.data.enabled).toBe(true);
    expect(sparse.body.data.flagged).toBe(false);
    // Neither member is on either request body — the path named
    // the domain and nothing named an id — so both arriving right
    // is the STORE having answered rather than the request having
    // been echoed back under a 201.
    expect(sparse.body.data.domainId).toBe(domainId);
    expect(typeof created.body.data.id).toBe('number');
    expect(created.body.data.id).not.toBe(sparse.body.data.id);
  });

  it('stores it, and leaves the feeds already read alone', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const { app, domainId, itemsId } = await withSources();
    const sources = sourcesPath(STORED_SLUG);

    const created = await request(app)
      .post(sources)
      .send({ kind: ACCEPTED_KIND, endpoint: FRESH_ENDPOINT });
    const listed = await request(app).get(sources);
    const elsewhere = await request(app).get(sourcesPath(OTHER_SLUG));
    const rows = listed.body.data as ListedRow[];

    expect(listed.status).toBe(200);
    // The whole collection, so a create reaching more rows than the
    // one it wrote is a red case here rather than an answer nobody
    // compared against anything. It sorts LAST because the page is
    // ordered by id and this row is the newest.
    expect(endpointsOf(listed.body))
      .toStrictEqual([...LISTED_ENDPOINTS, FRESH_ENDPOINT]);
    expect(listed.body.meta.total).toBe(PLANTED_SOURCES + 1);
    // The created row on the page is the record the create answered
    // PLUS the aggregate, which is what says a source arrives with
    // counted zeros rather than with no counts at all.
    expect(sourceFor(rows, FRESH_ENDPOINT)).toStrictEqual({
      ...created.body.data,
      parseStats: NO_CAPTURES,
    });
    // And a row that was already there still carries what it
    // carried, which no assertion over a created row could say: a
    // create lands ONE row. A whole-row literal rather than a field
    // read, since the fault worth catching is a neighbour gaining a
    // member or losing one on the way past a write.
    expect(sourceFor(rows, ITEMS_ENDPOINT)).toStrictEqual({
      id: itemsId,
      domainId,
      kind: API_KIND,
      endpoint: ITEMS_ENDPOINT,
      parserConfig: ITEMS_CONFIG,
      contract: ITEMS_CONTRACT,
      cursor: null,
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      enabled: true,
      flagged: false,
      parseStats: NO_CAPTURES,
    });
    // The second domain read one feed before this create and reads
    // one after it. The path named a domain, and a write stamping
    // another one answers a perfectly plausible row filed under
    // configuration nobody asked about — nothing on this table
    // refuses a misfiled row, there being no unique key for it to
    // collide with, so the two collections read whole are the only
    // reading that reports it.
    expect(endpointsOf(elsewhere.body)).toStrictEqual([TRANSIT_ENDPOINT]);
  });
});

// ---------------------------------------------------------------------------
// The patch: the arrangement replaced, and the feed retired
// ---------------------------------------------------------------------------

describe('a patch of the arrangement that lands', () => {
  it('answers 200 with the arrangement replaced whole', async () => {
    const { app, domainId, itemsId } = await withSources();
    const source = `/sources/${itemsId}`;

    const retuned = await request(app)
      .patch(source)
      .send({ parserConfig: PATCHED_CONFIG });
    // The control: a second patch naming a member the first did
    // not. Without it the case is equally green against a handler
    // rewriting every column on every patch — and it runs the
    // other way round here, since the arrangement written above has
    // to survive a request that never names it.
    const repointed = await request(app)
      .patch(source)
      .send({ endpoint: MOVED_ENDPOINT });
    const listed = await request(app).get(sourcesPath(STORED_SLUG));
    const rows = listed.body.data as ListedRow[];

    expect(retuned.status).toBe(200);
    // Two members, not three: a patch answers one resource, and a
    // `meta` arriving here would be the page envelope on a body
    // that describes no window. The record and not the list row,
    // for the reason the create's answer is.
    expect(keysOf(retuned.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(retuned.body.data)).toStrictEqual(SOURCE_KEY_SET);
    expect(retuned.body.success).toBe(true);
    // The whole row afterwards, which is what says the members this
    // request did not name came through untouched: the transport,
    // the address, the sibling jsonb member and all five of the
    // pipeline's own. A silent repoint or a cleared contract would
    // leave a `parserConfig` read green on its own.
    expect(retuned.body.data).toStrictEqual({
      id: itemsId,
      domainId,
      kind: API_KIND,
      endpoint: ITEMS_ENDPOINT,
      parserConfig: PATCHED_CONFIG,
      contract: ITEMS_CONTRACT,
      cursor: null,
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      enabled: true,
      flagged: false,
    });
    // REPLACED and not merged into: ONE key rather than the three a
    // union of the stored arrangement and the submitted one would
    // carry. That is the store's rule reaching a caller, and the
    // only shape under which removing a selector is expressible at
    // all — the two are keyed disjointly so the difference has
    // somewhere to show.
    expect(keysOf(retuned.body.data.parserConfig))
      .toStrictEqual(keysOf(PATCHED_CONFIG));
    expect(keysOf(ITEMS_CONFIG)).toHaveLength(2);
    expect(repointed.status).toBe(200);
    // The arrangement the first patch wrote is still there under a
    // second that never named it, and the address it did name moved.
    expect(repointed.body.data.parserConfig).toStrictEqual(PATCHED_CONFIG);
    expect(repointed.body.data.endpoint).toBe(MOVED_ENDPOINT);
    // And the store holds what the last patch answered, read back
    // through the OTHER operation: a patch answering a row it never
    // wrote satisfies every assertion above. The collection is read
    // whole beside it, so a patch reaching a neighbour is a red
    // case rather than a write nobody looked past.
    expect(sourceFor(rows, MOVED_ENDPOINT)).toStrictEqual({
      ...repointed.body.data,
      parseStats: NO_CAPTURES,
    });
    expect(endpointsOf(listed.body)).toStrictEqual(
      [FEED_ENDPOINT, MOVED_ENDPOINT, ARCHIVE_ENDPOINT],
    );
    expect(listed.body.meta.total).toBe(PLANTED_SOURCES);
  });
});

describe('a patch that retires a feed', () => {
  it('answers 200 switched off, keeping the corpus it read', async () => {
    const { app, feedId } = await withSources();
    const source = `/sources/${feedId}`;

    const retired = await request(app)
      .patch(source)
      .send({ enabled: false });
    const listed = await request(app).get(sourcesPath(STORED_SLUG));
    const rows = listed.body.data as ListedRow[];
    // The control, along the axis under test and through the SAME
    // operation: the identical request carrying `true`. Without it
    // the reads above are equally green against a handler writing
    // false to whatever column it is handed.
    const revived = await request(app)
      .patch(source)
      .send({ enabled: true });

    expect(retired.status).toBe(200);
    expect(keysOf(retired.body.data)).toStrictEqual(SOURCE_KEY_SET);
    expect(retired.body.data.enabled).toBe(false);
    // RETIRING IS NOT DELETING, which is the whole reason this
    // column is patchable and no other health column is: the
    // address, the arrangement and everything captured through the
    // feed stay exactly where they were, and the refused delete
    // earlier in this file names this very operation as the one
    // that was wanted. `flagged` is read beside it because the two
    // are different facts — a feed somebody switched off is not
    // one an adapter found broken — and no request reaches the
    // second.
    expect(retired.body.data.endpoint).toBe(FEED_ENDPOINT);
    expect(retired.body.data.parserConfig).toStrictEqual({});
    expect(retired.body.data.flagged).toBe(false);
    expect(retired.body.data.consecutiveFailures).toBe(0);
    // Read back through the OTHER operation: the row is still on
    // the page, still switched off, and its documents are still
    // counted under both statuses. A retirement that took the
    // corpus with it would leave every read above green.
    expect(endpointsOf(listed.body)).toStrictEqual(LISTED_ENDPOINTS);
    expect(healthOf(sourceFor(rows, FEED_ENDPOINT)))
      .toStrictEqual({ ...NEVER_FETCHED, enabled: false });
    expect(sourceFor(rows, FEED_ENDPOINT).parseStats)
      .toStrictEqual(FEED_COUNTS);
    expect(revived.status).toBe(200);
    expect(revived.body.data.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what it leaves behind
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing at all, and takes the row', async () => {
    const { app, archiveId } = await withSources();

    const removed = await request(app).delete(`/sources/${archiveId}`);
    const listed = await request(app).get(sourcesPath(STORED_SLUG));
    const elsewhere = await request(app).get(sourcesPath(OTHER_SLUG));
    // The control, through the SAME operation: the identical
    // request against an id that named a row a moment ago is a 404,
    // which is what makes the 204 above a delete rather than what
    // this route answers to any id it is handed.
    const again = await request(app).delete(`/sources/${archiveId}`);

    expect(removed.status).toBe(204);
    // An EMPTY key set, which is this route's half of the shape the
    // rest of the file reads: a deleted resource has no
    // representation, so what is asserted is that NOTHING travelled
    // rather than that some envelope did.
    expect(keysOf(removed.body)).toStrictEqual([]);
    expect(removed.text).toBe('');
    expect(removed.type).toBe('');
    // The row is gone and both neighbours are not — including the
    // two whose corpus and sightings refuse their own deletes,
    // which is what says this delete was addressed by id rather
    // than applied to the domain's feeds.
    expect(listed.status).toBe(200);
    expect(endpointsOf(listed.body))
      .toStrictEqual([FEED_ENDPOINT, ITEMS_ENDPOINT]);
    expect(listed.body.meta.total).toBe(PLANTED_SOURCES - 1);
    // The second domain still reads its own feed, which is the
    // widening control: nothing about this request named a domain
    // at all, and a store deleting by ADDRESS rather than by id
    // would have had a second row to consider.
    expect(endpointsOf(elsewhere.body)).toStrictEqual([TRANSIT_ENDPOINT]);
    expect(again.status).toBe(404);
    expect(again.body).toStrictEqual(NO_SUCH_SOURCE_BODY);
  });
});
