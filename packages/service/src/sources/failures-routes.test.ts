/**
 * `src/sources/failures-routes.ts` — what the one route answers,
 * refusing and landing: the status, the envelope and the members
 * each reaches the wire with. Driven over supertest against a
 * router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `failures-service.test.ts` is the
 * translation, and only the translation. That an id naming no
 * source is a `NotFoundError` rather than an empty queue, that no
 * window can be built outside the schema's bounds, that a body is
 * masked and a cut one reports the stored length — those are claims
 * about the RULES and are pinned one file over, over direct calls.
 * What no call can report is whether the rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, the members that envelope carried, whether a handler
 * swallowed a throw on the way, and — the reading this queue needs
 * more than any other route on the surface — what the SERIALISED
 * response carries. So every case below reads a response and none
 * of them reads a return value.
 *
 * TWELVE CASES IN NINE GROUPS. Three guard the fixture, the
 * vocabulary every refusal is read against and the shapes every
 * answer is held to. Four are refusals: the address, the segment
 * that is not one, the window, and the parameter this route does
 * not declare, that last one twice. And three are what the route
 * answers when it LANDS — the page and its `meta`, a stored control
 * byte reaching the wire masked, and the read-only reading taken
 * off the router's own `stack` and off the port it is handed.
 *
 * THE ADDRESS. An id naming no source is `404` asserted against
 * ONE whole body constant, and its control is the SAME operation
 * over an id that resolves. That control is two requests rather
 * than one, because the pair is the claim: a source holding a
 * queue answers its rows, and a source whose captures ALL PARSED
 * answers an empty page with a `200`. The second is what says the
 * `404` is about the source being absent rather than about there
 * being nothing to answer — the two states are indistinguishable
 * to a handler that skipped the lookup, and identical in every
 * assertion a status alone can make.
 *
 * A SEGMENT THAT IS NOT AN ADDRESS is `422` naming `id` and never
 * `404`: a `404` says the row is not there, and a request that
 * never named a row has not established that. Its control ends on
 * an id that IS one, without which the assertion is equally green
 * against a router refusing every `:id` it is handed.
 *
 * AND THE SAME SEGMENT CARRYING A WINDOW THE SCHEMA REFUSES IS
 * ANSWERED ABOUT THE WINDOW, which is the one reading in this file
 * that the query is parsed BEFORE the address. Both faults are
 * facts about the request alone and neither costs a read, so the
 * ordering shows only when a request gets both wrong — and a
 * handler in the other order answers about `id` and passes every
 * other case here.
 *
 * THE WINDOW. This route IS paginated and takes the surface's
 * ordinary vocabulary, so a `?perPage` above the cap is `422`
 * naming `perPage` rather than a silent clamp. It is paired with a
 * request at exactly the cap, which is what says the refusal is a
 * CAP and not a route that refuses every window it is handed, and
 * that pair reads the echoed `meta.perPage` — the number reaching
 * the wire is how a caller learns it asked for more than this
 * surface serves.
 *
 * A PARAMETER THIS ROUTE DOES NOT DECLARE is `422` whose ONE
 * detail names `query` rather than the parameter, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * REQUEST said. The envelope is asserted whole, and its control is
 * the identical request with that parameter removed — so the pair
 * says the refusal is about the undeclared key rather than about a
 * route refusing every query it is handed.
 *
 * AND NEITHER THE PARAMETER NOR ITS VALUE COMES BACK. That case
 * COUNTS their occurrences in the serialised body rather than
 * asserting an absence, and takes the same count over a PLANTED
 * envelope carrying both — because a search that would find
 * nothing anywhere reports a clean refusal and a leaking one
 * alike. Those two strings are the whole of what a request in this
 * file submits that a refusal could plausibly repeat: no route
 * here reads a body, and the only other thing a caller types is
 * the id.
 *
 * THE VOCABULARY IS READ OFF THE SCHEMA AT RUNTIME rather than
 * trusted as a literal, so the pair stays two-directional: a
 * parameter ADDED to `paginationQuerySchema` makes the refused row
 * legal and reddens the fixture guard instead of leaving a case
 * nobody notices is wrong.
 *
 * THE PAGE. One request with no window at all beside two windows of
 * ONE over the same three rows, which is the reading no refusal
 * case here could take: none of them can afford a window narrower
 * than its collection, so every page they read holds every row and
 * a `total` counted off the rows in hand agrees with the counted
 * one. The narrow pair is disjoint and each names the total of the
 * COLLECTION, and the wide read is what makes them read as
 * narrowings OF something. The envelope is asserted as a key SET
 * with `meta` whole, one row is compared whole against the
 * constants the fixture plants from, and every row's key set is
 * read rather than the first's — a page cannot carry one
 * well-shaped record beside one that leaked a column.
 *
 * THE ORDER REACHES THE WIRE AS THE PORT ANSWERED IT, which is the
 * only half of the ordering this file owns: the sort itself is the
 * store's and `./failures-service.test.ts` is where it is pinned.
 * The three planted captures are what make even that reading
 * possible — two share an instant and the third is older and
 * carries the largest id, so `capturedAt` alone, `id` alone and
 * either of them ascending each answer something different from the
 * one right answer, and the plant is oldest-first so the answer is
 * never the order the rows arrived in.
 *
 * A MASKED BODY IS RE-READ ON THE WIRE and not only in the parsed
 * body, which is the whole reason that case is in a routes file.
 * `JSON.stringify` escapes C0 and lone surrogates on its own and
 * passes DEL and the entire C1 range through as themselves, so a
 * body reaching `res.json` as stored would put two raw control
 * bytes into the text a client, a log or a terminal receives while
 * a reader of the PARSED body saw nothing at all. The reader is
 * numeric and shares nothing with the module's own class, so it
 * cannot agree with a masking regex however wrong that regex is;
 * every zero it answers over an answered value sits beside a
 * non-zero it answers over the stored one; and the planted control
 * is that same reader over the text an unmasked serialisation would
 * have written, where exactly two of the four survive.
 *
 * READ-ONLY IS STRUCTURAL AND IS READ AS THREE SHAPES. The router's
 * whole route inventory is derived from its own `stack` — one path,
 * one `get`, no second verb — rather than transcribed, since a list
 * of paths written into a test agrees with itself whatever the
 * router registered. Every method NAME `SourceStore` declares is
 * classified against a document vocabulary, with two fabricated
 * writers put through the same call in the same case so the empty
 * answer is a reading rather than a search that could only ever
 * come back empty. And every SIGNATURE whose name names the corpus
 * table is held to ids and windows by a type derived from `keyof`,
 * with a port carrying a planted writer as its negative control. A
 * method added to that port reaches both port readings the day it
 * lands: one through the roster's own two-directional pin, one
 * through the template literal that derives the checked set.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and
 * what a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s — the containment reading
 * below is scoped to the one channel this route opens. The four
 * routes over a `sources` ROW are not this router's at all and
 * have a file of their own.
 *
 * MUTATION GRID, re-derived WHOLE over all twelve cases by mutating
 * one file one edit at a time and reading the failed `fullName` SET
 * from a `--reporter=json` run rather than a count. FIFTEEN legs,
 * each named by the EDIT it makes rather than by its effect, since
 * a leg described only by its effect is one nobody can run again.
 * Eleven mutate `./failures-routes.ts`, two mutate
 * `src/http/schemas.ts` (the only target that can reach the bounds
 * and the strictness this file submits queries against), one
 * mutates `tests/helpers/memory-research-store.ts`, whose sort no
 * mutation of the router could reach, and three mutate
 * `./failures-service.ts`, which owns the masking.
 *
 * THE TEN LEGS RECORDED WHILE THIS FILE WAS REFUSALS ONLY WERE ALL
 * RE-RUN, and SEVEN of them moved, which is what the positive half
 * was for — five of them here, the `post` leg and the two recorded
 * zeros in paragraphs of their own below. Returning the segment raw
 * from {@link readId} goes 5 to 7 — every case that addresses a row
 * by id AND gets an answer out of the store, the page and the
 * masked row now among them — while the containment case is still
 * in NEITHER address set, because its request is answered about the
 * query before the id is used at all. Issuing the address parse
 * FIRST still reddens exactly 1, the not-an-id case, which is the
 * half of that case its over-cap segment exists for. Not parsing
 * the query at all goes 4 to 5. `res.status(200)` written as `201`
 * goes 4 to 6. `ok(page.rows)` in place of
 * `okPage(page.rows, meta)` goes 1 to 2.
 *
 * THE TWO SCHEMA LEGS ARE UNCHANGED AT 2 APIECE, which is the
 * reading that says they are still live, and they are still
 * separate: dropping `.max(MAX_PER_PAGE)` reddens the window case
 * and the not-an-id case's over-cap half, dropping `.strict()`
 * reddens both undeclared-parameter cases, and neither is reachable
 * from the other.
 *
 * THE TWO LEGS RECORDED AS REDDENING NOTHING NOW REDDEN ONE EACH,
 * and it is the SAME case for both. A fixed window in place of
 * `toStoreWindow(query)` and `total: page.rows.length` in place of
 * `total: page.total` are reported only by the page case, the one
 * read in this file that takes a window narrower than its
 * collection. ONE list case that pages is what those two legs cost,
 * and no other case moves either of them.
 *
 * THE `post` LEG GOES 6 TO 9 AND IS STILL BLUNT — every case that
 * sends a request, plus the structural one. What makes the verb a
 * claim rather than a fixture reading is the leg beside it:
 * registering a SECOND `post` on the same path reddens exactly 1,
 * the structural case, because no request in the file changes its
 * answer and only a reading off the `stack` can see the extra
 * handler at all.
 *
 * AND FOUR NEW LEGS AIM AT WHAT THE POSITIVE HALF ADDED. Sorting
 * the store's queue oldest-first reddens 1, the page case. Dropping
 * the mask from `body` reddens 1 and dropping it from `parseError`
 * reddens the SAME 1 — the two members share a case and are told
 * apart only by the assertion that fails inside it, which is what
 * one case mutating both members buys over two cases mutating one
 * each. Taking `bodyBytes` from the ANSWERED text rather than from
 * the stored row reddens that case too, and it is the leg the
 * expansive-masking assertion exists for: on a body with nothing to
 * mask the two numbers agree and no other fixture here would report
 * it.
 */
import type {
  SourceFailure,
  SourceFailuresServiceStore,
} from './failures-service.js';
import type { SourceFailureRecord, SourceStore } from './store.js';
import type {
  MemoryResearchStore,
  MemorySourceDocument,
} from '../../tests/helpers/memory-research-store.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { StoreWindow } from '../http/schemas.js';
import type { Application, Router } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { paginationQuerySchema } from '../http/schemas.js';

import { buildSourceFailuresRouter } from './failures-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('source-failures-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/** The feed whose captures include the ones that would not parse. */
const FEED_ENDPOINT = 'https://example.test/radar/feed.xml';

/**
 * A second source of the same domain, whose captures ALL parsed.
 *
 * The half of the `404`'s control that a length cannot supply: its
 * page is empty and its status is `200`, which is the state a
 * handler that skipped the lookup answers a mistyped id with.
 */
const ITEMS_ENDPOINT = 'https://example.test/radar/items';

/**
 * An id no planted source carries.
 *
 * Far past the two the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** How many failed captures {@link FEED_ENDPOINT} holds. */
const PLANTED_FAILURES = 3;

/**
 * The instant two of those three captures share.
 *
 * A TIE, so the queue's second sort column has something to break,
 * and the three ids below are chosen so the right order is neither
 * column's alone: by `id` the answer is 700, 502, 501 and so is
 * `capturedAt` ASCENDING, while dropping the tiebreak leaves the
 * pair in plant order. Three wrong answers, each of them different
 * from the one right one.
 */
const TIED_CAPTURE = new Date('2026-03-01T00:00:00.000Z');

/** When the third was taken, which is older than the pair. */
const EARLIER_CAPTURE = new Date('2026-02-27T00:00:00.000Z');

/** The newest capture, and the higher id of the tied pair. */
const NEWEST_ID = 502;

/** The lower id of that pair, and the row that stores a control. */
const TIED_ID = 501;

/** The oldest capture, which also carries the largest id. */
const OLDEST_ID = 700;

/**
 * What the queue answers: newest first, the id breaking the tie.
 *
 * The plant is oldest-first, so this is never the order the rows
 * arrived in — and this file's claim is only that the page reaches
 * the wire in it, since the sort itself is the port's and
 * `./failures-service.test.ts` is where it is pinned.
 */
const QUEUED_IDS: readonly number[] = [NEWEST_ID, TIED_ID, OLDEST_ID];

/** The one capture that parsed, under {@link ITEMS_ENDPOINT}. */
const PARSED_ID = 800;

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the page case, which asserts `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * having been a default.
 */
const DEFAULT_PER_PAGE = 50;

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/** A NUL, which silences a diff and a grep of whatever holds it. */
const NUL = charFrom(0x00);

/** A C1 control, which `JSON.stringify` passes through as itself. */
const C1_CSI = charFrom(0x9b);

/** An ESC, which lets stored text rewrite a terminal. */
const ESC = charFrom(0x1b);

/** A DEL, the other character serialisation leaves raw. */
const DEL = charFrom(0x7f);

/** A stored body carrying one C0 control and one C1 control. */
const CONTROL_BODY = `a capture${NUL}that would not${C1_CSI}parse`;

/** What {@link CONTROL_BODY} must reach the wire as. */
const MASKED_BODY = 'a capture\\u0000that would not\\u009bparse';

/** A stored parse error carrying an ESC and a DEL. */
const CONTROL_ERROR = `unexpected${ESC}end of${DEL}input`;

/** What {@link CONTROL_ERROR} must reach the wire as. */
const MASKED_ERROR = 'unexpected\\u001bend of\\u007finput';

/** The two code points {@link CONTROL_BODY} stores, in order. */
const STORED_BODY_CODES: readonly number[] = [0x00, 0x9b];

/** The two {@link CONTROL_ERROR} stores, on the same terms. */
const STORED_ERROR_CODES: readonly number[] = [0x1b, 0x7f];

/**
 * The two a serialiser that had NOT masked would leave raw.
 *
 * `JSON.stringify` escapes C0 and lone surrogates on its own and
 * passes DEL and the whole C1 range through as themselves, so this
 * is what the response TEXT would carry if the two members reached
 * `res.json` as stored — which is the half of the masking that
 * only a reading of the wire can report at all.
 */
const SERIALISED_RAW_CODES: readonly number[] = [0x9b, 0x7f];

/** The body of the two captures that stored nothing to mask. */
const CLEAN_BODY = 'a capture that would not parse';

/** What the writer recorded against the newest of them. */
const CLEAN_ERROR = 'unexpected end of input';

/** The oldest capture's body, distinct so the row is legible. */
const OLDEST_BODY = 'the oldest capture, and the largest id';

/**
 * The largest `perPage` the schema takes.
 *
 * Written out rather than imported, because `MAX_PER_PAGE` in
 * `src/http/schemas.ts` is not exported: this file holds the
 * BOUNDARY rather than the constant, and the refusal above it and
 * the control at it are what make it one.
 */
const LARGEST_PER_PAGE = 200;

/** One past it, and the only window this file is refused for. */
const OVER_CAP_PER_PAGE = LARGEST_PER_PAGE + 1;

/**
 * A query parameter `paginationQuerySchema` does not declare.
 *
 * Read against that schema's own shape by the fixture guard rather
 * than trusted here, so a parameter added to the window vocabulary
 * reddens there instead of leaving this case asserting a refusal
 * that has quietly become a legal request.
 *
 * Distinctive as a substring for the same reason its value is:
 * the containment case counts both in the refusal they produced,
 * and a short realistic token would be satisfiable by some other
 * member of the envelope.
 */
const UNDECLARED_PARAM = 'zzsortparamzz';

/** What that parameter is submitted with, on the same terms. */
const UNDECLARED_VALUE = 'zzsortvaluezz';

/**
 * The whole body a `404` about a source answers with.
 *
 * One constant rather than a literal at the assertion, which is
 * how this file says the message is the service's own sentence
 * arriving unmodified with `code` beside it and nothing else.
 */
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
 * positivity one.
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
 * One planted `documents` row that did not parse.
 *
 * @param row - The three members a case varies: the id, which is
 *   also the tiebreak the queue orders on; the stored text; and
 *   the reason a writer recorded, or null for the row that proves
 *   the member is nullable on the wire too.
 * @returns The row, `failed` and addressed under
 *   {@link FEED_ENDPOINT}. Every capture planted under that source
 *   is one, so the queue's `failed` filter is not what any case
 *   here turns on.
 */
function failedCapture(row: {
  readonly id: number;
  readonly body: string;
  readonly parseError: string | null;
  readonly capturedAt: Date;
}): MemorySourceDocument {
  return {
    ...row,
    url: `${FEED_ENDPOINT}#${row.id}`,
    parseStatus: 'failed',
  };
}

/**
 * The three captures {@link FEED_ENDPOINT} holds, planted oldest
 * first so the answered order is never the order they arrived in.
 *
 * ONE OF THEM STORES CONTROL BYTES and it is the MIDDLE row of the
 * answer rather than the first, so a masking pass that reached
 * only the head of a page would still be reported. The other two
 * carry text with nothing to mask, which is what lets the page
 * case compare a whole row without asserting anything about the
 * masking and the masking case read a row whose neighbours are
 * clean.
 */
const QUEUED_CAPTURES: readonly MemorySourceDocument[] = [
  failedCapture({
    id: OLDEST_ID,
    body: OLDEST_BODY,
    parseError: null,
    capturedAt: EARLIER_CAPTURE,
  }),
  failedCapture({
    id: TIED_ID,
    body: CONTROL_BODY,
    parseError: CONTROL_ERROR,
    capturedAt: TIED_CAPTURE,
  }),
  failedCapture({
    id: NEWEST_ID,
    body: CLEAN_BODY,
    parseError: CLEAN_ERROR,
    capturedAt: TIED_CAPTURE,
  }),
];

/**
 * The path TEMPLATE the router registers, as its stack spells it.
 *
 * One string behind both the requests below and the structural
 * reading, so a case cannot be addressing a path Express never
 * matched while a separate assertion reads the registered one and
 * agrees with itself.
 */
const FAILURES_TEMPLATE = '/sources/:id/failures';

/**
 * The path one source's failures are read under.
 *
 * @param id - The source's id, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 *   Derived from {@link FAILURES_TEMPLATE} rather than spelled
 *   again, and the structural case asserts no `:` survives the
 *   substitution — an unreplaced parameter still reaches the
 *   router as a literal segment and still answers a plausible
 *   `422`.
 */
function failuresPath(id: number | string): string {
  return FAILURES_TEMPLATE.replace(':id', String(id));
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
 * Every code point a response must not carry raw: C0, DEL, C1 and
 * both surrogate ranges.
 *
 * @param text - The text to read, walked as CODE POINTS rather
 *   than as UTF-16 units: `[...text]` answers a valid astral pair
 *   as one element above U+FFFF, so only a surrogate standing on
 *   its own is ever in the range below.
 * @returns The offending code points in the order they occur, so a
 *   zero can be read against a known positive taken by this same
 *   function in the same case.
 *
 * @remarks
 * A SECOND READER RATHER THAN THE MODULE'S OWN CLASS. Numeric
 * comparisons rather than a pattern, so this cannot agree with a
 * masking regex however wrong that regex is — the whole value of
 * re-reading an output is that the reader shares nothing with what
 * wrote it.
 */
function unsafeCodePoints(text: string): number[] {
  return [...text]
    .map((character) => character.codePointAt(0) ?? 0)
    .filter((code) => code <= 0x1f
      || (code >= 0x7f && code <= 0x9f)
      || (code >= 0xd800 && code <= 0xdfff));
}

/**
 * One answered failure, as the WIRE has it.
 *
 * `SourceFailure` WITH ONE MEMBER RETYPED: `capturedAt` is a
 * `Date` across the service and arrives here as an ISO-8601
 * string, because `res.json` serialises through `Date#toJSON`.
 * That is why it is declared rather than imported — and it is
 * held to the same roster the service type is, so a column renamed
 * on either side is a refusal at {@link EVERY_KEY_LISTED} rather
 * than a member no case looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter
 * that `check-types` refuses.
 */
interface QueuedRow {
  /** `documents.id`, and the tiebreak the queue orders on. */
  readonly id: number;

  /** Where the document can be read at its source, or null. */
  readonly url: string | null;

  /** The captured text, cut to the service's cap and masked. */
  readonly body: string;

  /** How many bytes the STORED body occupies. */
  readonly bodyBytes: number;

  /** Whether the cap took anything. */
  readonly bodyTruncated: boolean;

  /** What the writer that saw it recorded, masked, or null. */
  readonly parseError: string | null;

  /** When the pipeline captured it, as JSON carries it. */
  readonly capturedAt: string;
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

/**
 * The members a failure row carries, as a response has them.
 *
 * Written out because an interface has no runtime form to read
 * keys off, and pinned in BOTH directions, since a one-directional
 * list is exactly as green as no list at all against the drift
 * that matters. `satisfies` closes the direction where this names
 * a member `SourceFailure` lacks; {@link EVERY_KEY_LISTED} closes
 * the one where either that type or {@link QueuedRow} grows a
 * member nothing here learned about.
 *
 * The second direction is the one a QUEUE needs. Every member is a
 * stored column rewritten on the way out or a number describing
 * that rewrite, and this is the one projection on the whole
 * surface where a stored payload reaches a response — so a member
 * added beside them is a disclosure rather than an untidiness.
 */
const FAILURE_KEYS = [
  'body',
  'bodyBytes',
  'bodyTruncated',
  'capturedAt',
  'id',
  'parseError',
  'url',
] as const satisfies readonly (keyof SourceFailure)[];

/** The members every body this router answers a page in has. */
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
 * Every method `SourceStore` declares.
 *
 * The NAME half of the read-only reading, and pinned two ways so
 * it cannot go quietly stale: `satisfies` refuses a name the port
 * does not carry, and {@link EVERY_KEY_LISTED} refuses a method
 * added to the port and not to this list. Without the second, a
 * writer landing on the port would simply be absent from the
 * classification below and the case would stay green.
 */
const PORT_METHODS = [
  'approveAndApplyProposal',
  'countPendingProposals',
  'countSourceDependents',
  'countSourceFailures',
  'countSources',
  'deleteSource',
  'findProposalById',
  'findSourceById',
  'insertSource',
  'listPendingProposals',
  'listSourceFailures',
  'listSourcesWithParseStats',
  'updateSource',
] as const satisfies readonly (keyof SourceStore)[];

/**
 * Exactly the three the router's own store narrows those to.
 *
 * TEN OF THE THIRTEEN ARE ABSENT, which is the router's read-only
 * claim written as a type rather than promised in prose: every
 * write on `SourceStore` belongs to a router beside this one — the
 * three `sources` writes to `./routes.ts` and the config approval
 * to `./proposals-routes.ts`.
 */
const QUEUE_METHODS = [
  'countSourceFailures',
  'findSourceById',
  'listSourceFailures',
] as const satisfies readonly (keyof SourceFailuresServiceStore)[];

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
  CoversEveryKey<SourceFailure, typeof FAILURE_KEYS>
  & CoversEveryKey<QueuedRow, typeof FAILURE_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<SourceStore, typeof PORT_METHODS>
  & CoversEveryKey<SourceFailuresServiceStore, typeof QUEUE_METHODS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to the answered row, to either envelope, to
 * `meta`, to the port or to the `Pick` the router is handed, and
 * to none of the lists above, turns {@link EveryKeyListed} into a
 * `never` — `false` for the list that missed it, intersected with
 * the `true` the others still answer — and this initializer is
 * then a TS2322 at this line, before any case can compare an
 * answer against a set that has quietly stopped describing it.
 * Read in a case below, so it is a symbol this file uses rather
 * than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link FAILURE_KEYS}, sorted at use rather than by hand. */
const FAILURE_KEY_SET: readonly string[] = [...FAILURE_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/** {@link QUEUE_METHODS}, sorted. */
const QUEUE_METHOD_SET: readonly string[] = [...QUEUE_METHODS].sort();

/** The verbs a method that only READS can begin with. */
const READING_VERBS = ['count', 'find', 'list'] as const;

/**
 * The words a port method name uses to name the corpus table.
 *
 * `dependent` is here beside the three obvious ones because
 * `countSourceDependents` counts `documents` rows without spelling
 * the word — a roster keyed on the three would classify the one
 * method that reaches that table by counting as naming nothing.
 */
const DOCUMENT_NOUNS = [
  'capture',
  'dependent',
  'document',
  'failure',
  'parsestat',
] as const;

/**
 * @param method - A port method name.
 * @returns Whether it names the corpus table at all.
 */
function namesADocument(method: string): boolean {
  const lower = method.toLowerCase();

  return DOCUMENT_NOUNS.some((noun) => lower.includes(noun));
}

/**
 * @param methods - The names to classify.
 * @returns Those that name a document and do NOT begin with a
 *   reading verb, which is the whole of what this file means by a
 *   method whose NAME writes one.
 */
function documentWritersIn(methods: readonly string[]): string[] {
  return methods.filter((method) => namesADocument(method)
    && !READING_VERBS.some((verb) => method.startsWith(verb)));
}

/**
 * The four port methods whose names DO name the corpus table.
 *
 * The non-vacuity reading beside the empty writer list: a
 * classifier matching nothing at all answers no writers over any
 * roster, and this is what says it matched something.
 */
const DOCUMENT_READERS: readonly string[] = [
  'countSourceDependents',
  'countSourceFailures',
  'listSourceFailures',
  'listSourcesWithParseStats',
];

/**
 * Two names that would each write a `documents` row.
 *
 * The liveness control for the classification: the same call over
 * the real roster PLUS these two must name both, so the empty
 * answer over the roster alone is a reading rather than a search
 * that could only ever come back empty.
 */
const PLANTED_WRITERS: readonly string[] = [
  'insertSourceFailure',
  'markCaptureParsed',
];

/**
 * A method name that names the corpus table.
 *
 * A TEMPLATE-LITERAL union rather than a list of method names, so
 * the two pins below are DERIVED from `keyof` rather than
 * transcribed: a method added to the port and matching any arm is
 * in the checked set the day it lands, with nothing edited here.
 */
type DocumentNamed =
  | `${string}Capture${string}`
  | `${string}Dependent${string}`
  | `${string}Document${string}`
  | `${string}Failure${string}`
  | `${string}ParseStat${string}`;

/**
 * `true` only while `T` is a list of ids and windows.
 *
 * The tuple wrapper around `T` is load-bearing for the reason
 * {@link CoversEveryKey}'s is: without it the union of parameter
 * lists distributes, the answer is `boolean`, and both
 * initializers below are accepted whatever the port declares.
 *
 * @typeParam T - A `Parameters<...>` union.
 */
type ReadsOnly<T> = [T] extends [readonly (number | StoreWindow)[]]
  ? true
  : false;

/**
 * `SourceStore` with one document WRITER planted on it.
 *
 * The negative control for the pin below, and the reason the pin
 * is worth having: a method that could write a `documents` row
 * would have to TAKE one, and this is what that looks like on a
 * signature. Its own pin reads `false`, so a derivation that had
 * stopped matching any name — an emptied {@link DocumentNamed},
 * say — makes `Parameters<never>` a `never` that satisfies the
 * check trivially and turns this into a TS2322.
 */
interface PlantedWriterPort extends SourceStore {
  markCaptureParsed(row: SourceFailureRecord): Promise<void>;
}

/**
 * The SIGNATURE half of the read-only claim, `check-types`' own.
 *
 * Every method of `SourceStore` whose name names the corpus table
 * is handed an id and a window and nothing else, so not one of
 * them can be given a row to store. A writer added to the port is
 * a TS2322 at this line rather than a method the runtime
 * classification would have had to notice on its own.
 */
const DOCUMENT_READS_TAKE_NO_ROW: ReadsOnly<Parameters<
  SourceStore[Extract<keyof SourceStore, DocumentNamed>]
>> = true;

/** The same over {@link PlantedWriterPort}, which is false. */
const A_PLANTED_WRITER_IS_REPORTED: ReadsOnly<Parameters<
  PlantedWriterPort[Extract<keyof PlantedWriterPort, DocumentNamed>]
>> = false;

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
function idsOf(body: { data: readonly QueuedRow[] }): number[] {
  return body.data.map((row) => row.id);
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
 * @param id - The document id to find.
 * @returns That row.
 * @throws Error - When the page carries no row at that id.
 */
function rowFor(rows: readonly QueuedRow[], id: number): QueuedRow {
  const found = rows.find((row) => row.id === id);

  if (found === undefined) {
    throw new Error(`no answered row carries the id ${id}`);
  }

  return found;
}

/**
 * Every route a router declares, read off its own stack.
 *
 * DERIVED RATHER THAN TRANSCRIBED, which is the whole of what the
 * structural case is worth: `router.stack` carries one layer per
 * registered path, and that layer's own `stack` carries one
 * handler layer per verb — which is where a method is legible at
 * all. A second `post` on the same path is a second entry in the
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
 * Builds an app carrying one freshly built failures router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the route is mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file's failures depend on
 * their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on this route reads the present.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildFailuresApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSourceFailuresRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One domain, two sources and one queue, and the app in front of
 * them.
 *
 * The smallest fixture every case here can be reached from, and
 * both sources earn their place: {@link FEED_ENDPOINT} holds
 * {@link PLANTED_FAILURES} captures that did not parse, and
 * {@link ITEMS_ENDPOINT} holds one that did and nothing else. The
 * second is the `404`'s other control — an id that RESOLVES and
 * answers an empty page — which is the state a handler that
 * skipped the lookup would answer a mistyped id with.
 *
 * The documents are PLANTED rather than written, because no port
 * writes a `documents` row at all — `src/sources/store.ts` states
 * the absence IS the read-only rule — so
 * `MemoryResearchStore.setSourceDocuments` is the only way this
 * table gets rows, and every queue below would otherwise be empty.
 *
 * @returns The app and the two source ids. The store is not handed
 *   back: every reading a case takes afterwards is a response, so
 *   a case reaching past the surface under test would be pinning
 *   the fixture rather than the router. The ids are addresses
 *   rather than readings — a request cannot name a row without
 *   one.
 */
async function withFailures(): Promise<{
  app: Application;
  feedId: number;
  quietId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const feed = await store.insertSource({
    domainId: domain.id,
    kind: 'rss',
    endpoint: FEED_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const quiet = await store.insertSource({
    domainId: domain.id,
    kind: 'api',
    endpoint: ITEMS_ENDPOINT,
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  store.setSourceDocuments(feed.id, QUEUED_CAPTURES);
  store.setSourceDocuments(quiet.id, [
    {
      id: PARSED_ID,
      url: `${ITEMS_ENDPOINT}#ok`,
      body: 'a capture that parsed',
      parseError: null,
      capturedAt: TIED_CAPTURE,
      parseStatus: 'ok',
    },
  ]);

  return { app: buildFailuresApp(store), feedId: feed.id, quietId: quiet.id };
}

// ---------------------------------------------------------------------------
// What the fixture plants, and the vocabulary behind every refusal
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants one source with a queue and one with none', async () => {
    const { app, feedId, quietId } = await withFailures();

    // Two distinct sources, so the `404`'s control and the empty
    // page it is paired with cannot be the same row answered twice.
    expect(feedId).not.toBe(quietId);
    // Neither is the id the `404` case names, which no assertion in
    // that case could say for itself: an `ABSENT_ID` that had
    // collided with a planted row would answer `200` and read as a
    // refusal that stopped happening.
    expect([feedId, quietId]).not.toContain(ABSENT_ID);
    // The queue is non-empty, so the control beside the `404` reads
    // rows rather than the empty page its neighbour reads.
    expect(PLANTED_FAILURES).toBeGreaterThan(0);

    const queued = await request(app).get(failuresPath(feedId));
    const quiet = await request(app).get(failuresPath(quietId));

    expect(queued.body.data).toHaveLength(PLANTED_FAILURES);
    // And the second source's captures really did all parse: an
    // empty page here is what the `404` is told apart FROM, so a
    // fixture that had planted a failure under it would make that
    // case's control the same reading as its neighbour.
    expect(quiet.body.data).toHaveLength(0);
  });

  it('reads the undeclared parameter off the schema', async () => {
    // Read off `paginationQuerySchema`'s own shape rather than
    // trusting a literal, so the pair below stays two-directional:
    // a parameter ADDED to the window vocabulary makes the refused
    // request legal and reddens here, and one REMOVED makes a
    // declared member refusable and reddens here too. Neither
    // direction is reported by any assertion in the cases
    // themselves.
    const declared = Object.keys(paginationQuerySchema.shape);

    expect(declared).toContain('page');
    expect(declared).toContain('perPage');
    expect(declared).not.toContain(UNDECLARED_PARAM);
    // The two needles the containment case counts are distinct from
    // each other and from everything the envelope says, so a zero
    // there is about the request rather than about a substring that
    // could not have appeared anyway.
    expect(UNDECLARED_PARAM).not.toBe(UNDECLARED_VALUE);
    const envelope = JSON.stringify(UNDECLARED_QUERY_BODY);

    expect(countOccurrences(envelope, UNDECLARED_PARAM)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The address: an id naming no source
// ---------------------------------------------------------------------------

describe('an id naming no source', () => {
  it('answers 404, and 200 for an id that is', async () => {
    const { app, feedId, quietId } = await withFailures();

    const missing = await request(app).get(failuresPath(ABSENT_ID));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own.
    const found = await request(app).get(failuresPath(feedId));
    // And the half a length cannot supply. A source whose captures
    // ALL PARSED answers an empty page with a 200, which is exactly
    // what a handler that skipped the lookup would have answered
    // the missing id with — so this is what says the 404 is about
    // the source being absent rather than about there being nothing
    // to answer.
    const quiet = await request(app).get(failuresPath(quietId));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_SOURCE_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(PLANTED_FAILURES);
    expect(quiet.status).toBe(200);
    expect(quiet.body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// The segment: an address that is not one, and the ordering it shows
// ---------------------------------------------------------------------------

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, feedId } = await withFailures();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const notAnId = await request(app).get(failuresPath('abc'));
    // The same segment carrying a window the schema refuses is
    // answered about the WINDOW, which is the one reading in this
    // file that the query is parsed BEFORE the address: a handler
    // in the other order answers about `id` here and passes every
    // other case in the file.
    const alsoOverCap = await request(app)
      .get(`${failuresPath('abc')}?perPage=${OVER_CAP_PER_PAGE}`);
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).get(failuresPath(feedId));

    expect(notAnId.status).toBe(422);
    expect(notAnId.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(alsoOverCap.status).toBe(422);
    expect(alsoOverCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(anId.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap this surface serves
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app, feedId } = await withFailures();
    const failures = failuresPath(feedId);

    const overCap = await request(app)
      .get(`${failures}?perPage=${OVER_CAP_PER_PAGE}`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app)
      .get(`${failures}?perPage=${LARGEST_PER_PAGE}`);

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(LARGEST_PER_PAGE);
    expect(atCap.body.data).toHaveLength(PLANTED_FAILURES);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter this route does not declare
// ---------------------------------------------------------------------------

describe('a query parameter this route does not declare', () => {
  it('answers 422 naming the query rather than the parameter', async () => {
    const { app, feedId } = await withFailures();
    const failures = failuresPath(feedId);

    const undeclared = await request(app)
      .get(failures)
      .query({ page: 1, [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    // The control is the identical request with that parameter
    // removed, so the pair says the refusal is about the key rather
    // than about a route refusing every query it is handed — and
    // `?page=1` is legal on its own, which is what makes the
    // difference between the two requests the one member.
    const declared = await request(app)
      .get(failures)
      .query({ page: 1 });

    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(declared.status).toBe(200);
    expect(declared.body.data).toHaveLength(PLANTED_FAILURES);
  });

  it('quotes neither the parameter nor the value it carried', async () => {
    const { app, feedId } = await withFailures();

    const undeclared = await request(app)
      .get(failuresPath(feedId))
      .query({ [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    const answered = JSON.stringify(undeclared.body);
    const needles = [UNDECLARED_PARAM, UNDECLARED_VALUE];
    const found = needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }));

    expect(undeclared.status).toBe(422);
    expect(found).toStrictEqual(needles.map((needle) => ({
      needle,
      occurrences: 0,
    })));

    // The search would find them: a planted envelope carrying both
    // needles is counted by the same function in the same case, so
    // the zeros above are a reading rather than a search that could
    // only ever answer nothing.
    const planted = JSON.stringify({
      ...UNDECLARED_QUERY_BODY,
      message: `${UNDECLARED_PARAM} is not ${UNDECLARED_VALUE}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toStrictEqual(needles.map((needle) => ({
      needle,
      occurrences: 1,
    })));

    // The envelope was built at all: a body that never arrived
    // would satisfy every count above.
    expect(answered.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to the answered row, to either envelope, to `meta`, to
    // `SourceStore` or to the `Pick` the router is handed and to
    // none of the lists is a TS2322 at that declaration, before
    // any assertion below can compare an answer against a set that
    // has quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // between the two success shapes this surface writes.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // The router's store is a SUBSET of the port rather than a
    // list of its own, and a strict one: `satisfies` says so at
    // the declaration for the type, and this is that pin's runtime
    // half.
    const port: readonly string[] = PORT_METHODS;

    expect(QUEUE_METHOD_SET.filter((name) => !port.includes(name)))
      .toStrictEqual([]);
    expect(QUEUE_METHOD_SET.length).toBeLessThan(port.length);
    // And the derived path is a real substitution rather than a
    // template that reached Express as one: an unreplaced `:id`
    // is still a literal segment and still answers a plausible
    // refusal.
    expect(FAILURES_TEMPLATE).toContain(':id');
    expect(failuresPath(ABSENT_ID)).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// The page: the envelope, the window it echoes and the rows in it
// ---------------------------------------------------------------------------

describe('a failures page that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, feedId } = await withFailures();
    const failures = failuresPath(feedId);

    const whole = await request(app).get(failures);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, and a `total` taken from the rows in hand
    // answers 1 to each of the narrow pair — which is the reading
    // no refusal case could take, since none of them can afford a
    // window narrower than its collection.
    const first = await request(app)
      .get(failures)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(failures)
      .query({ page: PLANTED_FAILURES, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    // THREE members and not two: this read applies a window, so it
    // carries the `meta` describing one — which is the difference
    // between the envelope `okPage` writes and the one `ok` does.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_FAILURES,
      totalPages: 1,
    });
    // The order reaches the wire as the port answered it, which is
    // this file's half of that claim: nothing in the handler
    // re-sorts a page it was handed, and a handler that did would
    // be answering a different order from the one the window was
    // taken under.
    expect(idsOf(whole.body)).toStrictEqual(QUEUED_IDS);
    // And one of the wrong answers the fixture was built to
    // separate, computed here rather than named: the same three
    // ids sorted by id alone are a different list, so the order
    // above is neither sort column's on its own.
    const byIdAlone = [...QUEUED_IDS].sort((left, right) => right - left);

    expect(byIdAlone).not.toStrictEqual(QUEUED_IDS);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(FAILURE_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. `capturedAt` is asserted as the ISO
    // spelling because that conversion is the framework's and is
    // the one member whose type changes crossing `res.json`.
    expect(rowFor(whole.body.data as QueuedRow[], NEWEST_ID))
      .toStrictEqual({
        id: NEWEST_ID,
        url: `${FEED_ENDPOINT}#${NEWEST_ID}`,
        body: CLEAN_BODY,
        bodyBytes: Buffer.byteLength(CLEAN_BODY, 'utf8'),
        bodyTruncated: false,
        parseError: CLEAN_ERROR,
        capturedAt: TIED_CAPTURE.toISOString(),
      });
    // The two narrow windows are disjoint and each names the total
    // of the COLLECTION, which no page could have counted from its
    // own rows.
    expect(idsOf(first.body)).toStrictEqual([NEWEST_ID]);
    expect(idsOf(last.body)).toStrictEqual([OLDEST_ID]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_FAILURES,
      totalPages: PLANTED_FAILURES,
    });
    expect(last.body.meta).toStrictEqual({
      page: PLANTED_FAILURES,
      perPage: 1,
      total: PLANTED_FAILURES,
      totalPages: PLANTED_FAILURES,
    });
  });
});

// ---------------------------------------------------------------------------
// The rows: what a stored control byte reaches the wire as
// ---------------------------------------------------------------------------

describe('a masked body on the wire', () => {
  it('serialises neither control byte the row stored', async () => {
    const { app, feedId } = await withFailures();

    const page = await request(app).get(failuresPath(feedId));
    const rows = page.body.data as QueuedRow[];
    const dirty = rowFor(rows, TIED_ID);

    expect(page.status).toBe(200);
    // The whole row, so `bodyBytes` and `bodyTruncated` are read
    // beside the two masked members rather than left to a key set:
    // the stored length is what tells a cut body from a short one,
    // and masking is EXPANSIVE, so a `bodyBytes` derived from the
    // answered text would be larger here than the row it describes.
    expect(dirty).toStrictEqual({
      id: TIED_ID,
      url: `${FEED_ENDPOINT}#${TIED_ID}`,
      body: MASKED_BODY,
      bodyBytes: Buffer.byteLength(CONTROL_BODY, 'utf8'),
      bodyTruncated: false,
      parseError: MASKED_ERROR,
      capturedAt: TIED_CAPTURE.toISOString(),
    });
    expect(dirty.bodyBytes)
      .not.toBe(Buffer.byteLength(dirty.body, 'utf8'));
    // Re-read rather than asserted absent, and against a positive
    // taken by the SAME reader in the same case: the stored values
    // carry exactly four offending code points between them and
    // the answered ones carry none. A search that could only ever
    // come back empty reports a masked row and a raw one alike.
    expect(unsafeCodePoints(dirty.body)).toStrictEqual([]);
    expect(unsafeCodePoints(dirty.parseError ?? '')).toStrictEqual([]);
    expect(unsafeCodePoints(CONTROL_BODY)).toStrictEqual(STORED_BODY_CODES);
    expect(unsafeCodePoints(CONTROL_ERROR))
      .toStrictEqual(STORED_ERROR_CODES);
    // The reading no direct call can take, and the reason this
    // case is in a routes file at all: the SERIALISED response.
    // `JSON.stringify` escapes C0 and lone surrogates on its own
    // and passes DEL and the whole C1 range through as themselves,
    // so a body reaching `res.json` as stored would put two raw
    // control bytes into the text a client, a log or a terminal
    // receives while a reader of the parsed body saw nothing.
    expect(unsafeCodePoints(page.text)).toStrictEqual([]);
    expect(page.text.length).toBeGreaterThan(0);
    // The planted control for exactly that search: the same reader
    // over the text an unmasked serialisation of these two values
    // would have written. Two of the four survive, which is what
    // makes the zero above a reading rather than a property of
    // `JSON.stringify`.
    const unmasked = JSON.stringify({
      body: CONTROL_BODY,
      parseError: CONTROL_ERROR,
    });

    expect(unsafeCodePoints(unmasked)).toStrictEqual(SERIALISED_RAW_CODES);
    // And the nullable branch, on the row beside it: a mask
    // applied unconditionally throws on a null error, and one
    // applied to `body` alone leaves the row above's error raw —
    // so the two rows are two claims rather than one.
    const clean = rowFor(rows, OLDEST_ID);

    expect(clean.parseError).toBeNull();
    expect(clean.body).toBe(OLDEST_BODY);
  });
});

// ---------------------------------------------------------------------------
// The structure: one verb, and a port that cannot write a document
// ---------------------------------------------------------------------------

describe('what this router structurally cannot do', () => {
  it('registers one get on one path and no other verb', () => {
    // Built here rather than reached through {@link withFailures},
    // because what this reads is the router's own DECLARATION: a
    // factory registers its routes at construction and reads
    // nothing, so no fixture is involved in the answer.
    const store = createMemoryResearchStore();
    const registered = routesOf(buildSourceFailuresRouter({ store }));

    // The whole inventory in one comparison, derived from the
    // stack rather than transcribed: a second path, a second verb
    // on this one, or a `post` in place of the `get` are each a
    // different value here. An empty stack is too, which is what
    // keeps this from being a search that could only answer
    // nothing.
    expect(registered).toStrictEqual([
      { path: FAILURES_TEMPLATE, verbs: ['get'] },
    ]);
    // The verb SET across the whole router, read separately, so a
    // failure says whether a path or a verb moved.
    expect(registered.flatMap((route) => route.verbs)).toStrictEqual(['get']);
    // And the same reading over a router this file did NOT build
    // read-only would differ, which is what the comparison above
    // is worth: `sources` writes are a different router entirely
    // and `./routes.test.ts` is where they are read.
    expect(registered).toHaveLength(1);
  });

  it('names no port method that writes a document', () => {
    // The roster is pinned in both directions at its declaration,
    // so what this classifies is every method `SourceStore`
    // declares and not a list that stopped tracking it.
    const methods: readonly string[] = PORT_METHODS;

    expect(documentWritersIn(methods)).toStrictEqual([]);
    // Non-vacuous: the port DOES name the corpus table, four times
    // over, and a classifier matching nothing would answer the
    // empty list above against any roster at all.
    expect(methods.filter(namesADocument)).toStrictEqual(DOCUMENT_READERS);
    // And the liveness control, through the same call in the same
    // case: two names that WOULD write a row are both reported
    // when they sit in the roster beside the real ones.
    expect(documentWritersIn([...methods, ...PLANTED_WRITERS]))
      .toStrictEqual([...PLANTED_WRITERS]);
    // The signature half, which `check-types` owns and which no
    // name can report: every one of those four methods is handed
    // an id and a window, so not one of them can be given a row to
    // store. Its own negative control sits beside it — the same
    // derivation over a port carrying a planted writer answers
    // `false`, which is what says the derivation discriminates
    // rather than answering `true` for everything.
    expect(DOCUMENT_READS_TAKE_NO_ROW).toBe(true);
    expect(A_PLANTED_WRITER_IS_REPORTED).toBe(false);
  });
});
