/**
 * `src/documents/routes.ts` — what the one read answers, refusing
 * and landing: the status, the envelope, the members a row reaches
 * the wire with, and the two shapes the read-only rule is written
 * in. Driven over supertest against a router built by the real
 * factory, standing on `tests/helpers/memory-research-store.ts`,
 * so every claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `./service.test.ts` is the translation
 * and only the translation. Which rows a status narrows to, what
 * the masking takes out, where the cap cuts and that an unknown
 * slug is a `NotFoundError` rather than an empty page are claims
 * about the RULES, and are pinned one file over, over direct calls
 * with no server. What no call can report is whether a rule
 * reached a caller: the status `errorHandler` or the handler
 * chose, the envelope written around it, the members that envelope
 * carried, and what the SERIALISED response says — which is where
 * the masking matters most, a control character being something a
 * response BODY carries rather than a value a function returned.
 *
 * EIGHT CASES IN SEVEN GROUPS. Two guard the fixture and the
 * shapes every answer is compared to, one is the page and the
 * `meta` beside it, one is the masking as the wire has it, one is
 * the status this route will not take, one is the slug no domain
 * carries, and TWO are the structure: the verb inventory read off
 * the router's own stack, and the port classified against a write
 * vocabulary.
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
 * A SECOND DOMAIN HOLDS A CORPUS OF ITS OWN, one document on each
 * side of `documents_parse_status_check`, so every page here is a
 * scoping reading too: a handler that had stopped resolving the
 * slug answers five rows where each case asserts three, and no
 * narrowed page below is narrow because the other domain happened
 * to hold nothing to leave out.
 *
 * THE ORDER REACHES THE WIRE AS THE PORT ANSWERED IT, which is the
 * only half of the ordering this file owns; the sort itself is the
 * store's and `tests/helpers/memory-research-store.test.ts` is
 * where the two keys are held apart. The plant is what makes even
 * that reading possible — the three rows go in middle-first, so
 * the answered order is neither the order they arrived in nor its
 * reverse, and the fixture guard computes both wrong answers
 * rather than naming them.
 *
 * THE MASKING IS READ OFF THE BASE FIXTURE rather than off a
 * corpus planted for it, and off BOTH members this surface masks
 * in one response: a body carrying a NUL, a lone surrogate and a
 * valid astral pair, and a parse error carrying an ESC and a DEL.
 * The two are the characters `JSON.stringify` passes through as
 * themselves, so a response built from unmasked text carries them
 * onto the wire intact and a reader of the answer would not see
 * it. Both are re-read through a code-point scan that shares
 * nothing with the class the module masks by, and the valid pair
 * is asserted PRESENT beside them, which is what says only a
 * surrogate standing on its own was taken.
 *
 * THE STATUS THIS ROUTE WILL NOT TAKE is a `422` asserted as ONE
 * whole body, naming the parameter under `invalid_value` rather
 * than naming `query`: the enum refused a VALUE, where a key the
 * endpoint does not declare would have named the container. Its
 * control is the identical request carrying a member the tuple
 * DOES declare, which lands — a schema refusing every status
 * passes the refusal and fails the control.
 *
 * THE SLUG NO DOMAIN CARRIES is a `404` asserted as one whole
 * body, and its control is the SAME operation over the slug that
 * resolves. It is a slug that PARSED: a segment the boundary would
 * have refused answers `422` about the address and would pin the
 * wrong thing entirely, so the sentinel satisfies
 * `slugParamSchema` and fails only at the lookup.
 *
 * THE STRUCTURE IS TWO CASES BECAUSE THE READ-ONLY RULE IS TWO
 * SHAPES. One reads the router's own `stack`: one path, one verb,
 * and the whole inventory in one comparison, so a `post` added
 * beside the `get` is a different value here rather than a route
 * no case happens to send to. The other classifies `DocumentStore`
 * itself — every method it declares, pinned in both directions at
 * its declaration, names the corpus table and begins with a
 * reading verb, with the liveness control through the same call in
 * the same case. Beside that runs the SIGNATURE half, which
 * `check-types` owns and no name can report: not one of those
 * methods can be handed a row, and the same derivation over a port
 * carrying a planted writer answers `false`.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and
 * what a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s. Which rows a status selects,
 * where the cap cuts, what a `perPage` above the shared ceiling
 * answers and that the composed query inherited that ceiling
 * rather than declaring a second one are `./service.test.ts`'s,
 * taken over direct calls and over the schema itself.
 *
 * MUTATION GRID, taken by mutating one file one edit at a time and
 * reading the failed `fullName` SET off a `--reporter=json` run
 * rather than a count. FIFTEEN runtime legs and THREE that only
 * `check-types` can report: seven mutate `./routes.ts`, five
 * `./service.ts`, two `tests/helpers/memory-research-store.ts`,
 * and the three type legs mutate `./store.ts` and this file.
 *
 * THE WHOLE GRID WAS RUN TWICE and the per-leg sets diffed between
 * the two runs of one tree. ONE MOVED and was re-measured on its
 * own: the always-true parse-status predicate read 2 once and 1 in
 * 3/3 runs of the identical patched tree, so 1 is the figure and
 * the 2 was a bad capture rather than a result. Every other leg's
 * set was identical member for member across both runs.
 *
 * THE STATUS AND THE ENVELOPE. `res.status(201)` reddens 5, every
 * case that sends a request — which is what makes it the bluntest
 * leg here rather than a reading. `total: page.rows.length` in
 * place of `total: page.total` reddens 1 and a fixed store window
 * in place of `toStoreWindow(query)` reddens the SAME 1, the page
 * case, that being the only read in the file taking a window
 * narrower than its collection.
 *
 * THE NARROWING, ONE RULE IN TWO FILES. Dropping
 * `query.parseStatus` from the rebuilt filter reddens 1, the
 * status case, and replacing the in-memory predicate with `true`
 * reddens the same 1 — the route's half and the store's half, told
 * apart by which file the edit is in rather than by the case that
 * reports.
 *
 * THE MASKING, FOUR LEGS ON ONE CASE. Dropping the mask from
 * `body`, dropping it from `parseError`, taking `bodyBytes` from
 * the ANSWERED text rather than from the stored row, and applying
 * the cut AFTER the mask each redden 1, and it is the same 1. They
 * are told apart only by the assertion that fails inside it, which
 * is what one case reading both masked members buys over two cases
 * reading one each. The pass-order leg is the one worth naming:
 * `maskControlBytes` is idempotent, so a double-masked body
 * answers the same TEXT and what moves is `bodyTruncated` —
 * reportable only because that case asserts the flag FALSE over a
 * body that has something to mask.
 *
 * THE ADDRESS. Answering an empty page in place of the
 * `NotFoundError` reddens 1 and rewording the sentence reddens the
 * same 1, the slug case, the second being what the whole-body
 * comparison is for: a status assertion alone stays green through
 * it. Reversing the in-memory documents ordering reddens 1, the
 * page case.
 *
 * THE STRUCTURE. Registering a SECOND `get` on the same path
 * reddens exactly 1, the inventory case, because no request in the
 * file changes its answer and only a reading off the `stack` can
 * see the extra handler at all.
 *
 * AND THREE LEGS NO RUN CAN REPORT, each taken off `bun x tsc
 * --noEmit` against a base at exit 0 with no diagnostics. Adding
 * an `insertDocument(row: DocumentRecord)` to `DocumentStore` is
 * four errors, TWO of them here and firing independently: the
 * roster coverage pin and the signature pin. Emptying
 * {@link DocumentNamed} so it matches no method is one error, at
 * the NEGATIVE control — `Parameters<never>` satisfies the check
 * trivially, which is the whole reason that control is declared
 * `false`. And dropping a member from {@link DOCUMENT_KEYS} is one
 * error, at the roster pin.
 *
 * AND TWO HONEST ZEROS, both measured rather than assumed. Parsing
 * the address BEFORE the query reddens NOTHING, because no request
 * in this file gets both wrong at once — the reading
 * `src/sources/failures-routes.test.ts` takes with an over-cap
 * window on a segment that is not an id. And building the filter
 * as a SPREAD of the parsed query reddens nothing either: this
 * file drives no recording port, and the in-memory predicate reads
 * `parseStatus` alone, so a filter carrying `page` and `perPage`
 * beside it answers the identical page. That rule needs a port
 * keeping the arguments it was handed, which
 * `src/findings/routes.test.ts` has and this file does not.
 */
import type {
  CorpusDocument,
  DocumentsServiceStore,
} from './service.js';
import type {
  DocumentFilter,
  DocumentRecord,
  DocumentStore,
} from './store.js';
import type {
  MemoryDomainDocument,
  MemoryResearchStore,
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
import { DOCUMENT_PARSE_STATUSES } from '../db/schema/values.js';

import { buildDocumentsRouter } from './routes.js';
import { documentListQuerySchema } from './service.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('documents-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every page reads. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, holding a corpus of its own.
 *
 * What makes every page below a SCOPING reading as well: a handler
 * that had stopped resolving the slug answers five rows where each
 * case asserts three, and no count in this file would need
 * changing for it to pass.
 */
const SIBLING = 'example-newsroom';

/**
 * A slug shaped like one and carried by no domain here.
 *
 * It satisfies `slugParamSchema`, which is the whole point: what
 * is under test is a slug that PARSED and resolved to nothing, not
 * a segment the boundary would have refused. The second answers
 * `422` about the address and would pin the wrong rule entirely.
 */
const MISSING_SLUG = 'zzsentinelslugzz';

/**
 * A parse status shaped like one and outside
 * `DOCUMENT_PARSE_STATUSES`.
 *
 * Asserted absent from that tuple by the fixture guard rather than
 * trusted here, so a member ADDED to it makes this request legal
 * and reddens there instead of leaving a case asserting a refusal
 * that has quietly stopped happening.
 */
const MISSING_STATUS = 'zzsentinelstatuszz';

/**
 * The two members of `DOCUMENT_PARSE_STATUSES`, destructured
 * rather than respelt.
 *
 * A tuple member and not a string literal, so a member renamed in
 * `src/db/schema/values.ts` moves the fixture with it and a member
 * REMOVED is a `check-types` error here rather than a case
 * asserting about a status the column no longer accepts.
 */
const [OK_STATUS, FAILED_STATUS] = DOCUMENT_PARSE_STATUSES;

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/** A NUL, which silences a diff and a grep of whatever holds it. */
const NUL = charFrom(0x00);

/** An ESC, which lets stored text rewrite a terminal. */
const ESC = charFrom(0x1b);

/** A DEL, which `JSON.stringify` passes through as itself. */
const DEL = charFrom(0x7f);

/**
 * A high surrogate standing on its own.
 *
 * A STORED BODY CAN CARRY ONE: a truncating writer, a bad
 * transcode or a parser that gave up mid-character each leave one
 * behind, and it is the one character class that cannot be
 * serialised as itself.
 */
const LONE_SURROGATE = charFrom(0xd800);

/**
 * One astral character, as its two UTF-16 halves.
 *
 * Built from code units rather than written as itself, so this
 * file carries no character a reviewer's editor renders
 * differently from the next one's. Its two halves are a VALID
 * pair, which is what the masking must leave alone.
 */
const ASTRAL_PAIR = charFrom(0xd83d, 0xde00);

/** The stored body the masking case reads, carrying all three. */
const CONTROL_BODY =
  `a page${NUL}holding${LONE_SURROGATE}and${ASTRAL_PAIR}`;

/** What {@link CONTROL_BODY} must reach the wire as. */
const MASKED_CONTROL_BODY =
  `a page\\u0000holding\\ud800and${ASTRAL_PAIR}`;

/**
 * The parse error the planted failure carries.
 *
 * IT HOLDS TWO CONTROL CHARACTERS, and they are the pair
 * `JSON.stringify` would pass through raw. A message built out of
 * the bytes that broke a parser is the likeliest stored string on
 * this surface to carry one, so a response built from an unmasked
 * error carries them onto the wire intact.
 */
const FAILED_ERROR = `unexpected${ESC}end of${DEL}input`;

/** What {@link FAILED_ERROR} must reach the wire as. */
const MASKED_FAILED_ERROR = 'unexpected\\u001bend of\\u007finput';

/** When the oldest planted document was captured. */
const FIRST_CAPTURE = '2026-03-01T00:00:00.000Z';

/** When the next one was. */
const SECOND_CAPTURE = '2026-03-02T00:00:00.000Z';

/** When the newest one was. */
const THIRD_CAPTURE = '2026-03-03T00:00:00.000Z';

/** The document that came through a feed and parsed. */
const FEED_ID = 101;

/**
 * The document that came through NO feed, and the one carrying
 * every character the masking takes out.
 *
 * The two states are on one row deliberately: a body with
 * something to mask is the sharpest place to also read that a
 * `sourceId` of null reaches the wire as null rather than being
 * dropped from the record.
 */
const PASTED_ID = 102;

/** The document whose parse failed, and the newest of the three. */
const BROKEN_ID = 103;

/** The feed two of the three were captured through. */
const SOURCE_ID = 31;

/** Where {@link FEED_ID} can be read at its source. */
const FEED_URL = 'https://example.test/one';

/**
 * What {@link FEED_ID} captured.
 *
 * ENTIRELY ASCII, which is what makes it the masking case's own
 * control: a row on the same page whose stored text has nothing to
 * mask must reach the wire as itself. It is also why the page case
 * can read `bodyBytes` off its length, bytes and characters
 * coinciding here where the row beside it separates them.
 */
const FEED_BODY = 'a captured page';

/**
 * The three documents {@link plantDocuments} gives {@link RADAR},
 * PLANTED MIDDLE-FIRST.
 *
 * PLANTED RATHER THAN WRITTEN, because `DocumentStore` declares no
 * insert at all: `src/documents/store.ts` states that the absence
 * IS the read-first rule, so
 * `MemoryResearchStore.setDomainDocuments` is the only way this
 * table gets rows and every page below would otherwise be empty.
 *
 * The plant order is deliberately neither the order a page comes
 * back in nor its reverse, which is what makes the ordering
 * assertion a reading at all: a store answering rows in insertion
 * order and one answering them backwards each produce a different
 * list from the one right answer, and the fixture guard computes
 * both rather than naming them.
 *
 * They differ along every axis a case here reads. Two parsed and
 * one did not, so a status narrowing has something to leave out.
 * One came through no feed, which is the state the failures queue
 * beside this collection has no key to hold. One body carries
 * every character the masking takes out and one parse error
 * carries two more. And their three stamps are distinct, so the
 * page's order is a function of the fixture rather than of the
 * order they were planted in.
 */
const PLANTED_DOCUMENTS: readonly MemoryDomainDocument[] = [
  {
    id: PASTED_ID,
    sourceId: null,
    url: null,
    body: CONTROL_BODY,
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(SECOND_CAPTURE),
  },
  {
    id: FEED_ID,
    sourceId: SOURCE_ID,
    url: FEED_URL,
    body: FEED_BODY,
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(FIRST_CAPTURE),
  },
  {
    id: BROKEN_ID,
    sourceId: SOURCE_ID,
    url: 'https://example.test/three',
    body: 'a payload that would not parse',
    parseStatus: FAILED_STATUS,
    parseError: FAILED_ERROR,
    capturedAt: new Date(THIRD_CAPTURE),
  },
];

/** How many documents {@link RADAR} holds. */
const PLANTED_COUNT = PLANTED_DOCUMENTS.length;

/** Their ids in the order they were planted. */
const PLANT_ORDER: readonly number[] = PLANTED_DOCUMENTS.map(
  (row) => row.id,
);

/**
 * The order a page answers them in: `capturedAt` descending.
 *
 * Written out rather than derived, on the terms
 * `src/findings/routes.test.ts` states for its own page: the sort
 * is the port's rule and the in-memory implementation's own suite
 * is where the two keys are held apart, so what this file claims
 * is only that whatever the port answered reached the wire in that
 * order.
 */
const CAPTURE_ORDER: readonly number[] = [
  BROKEN_ID,
  PASTED_ID,
  FEED_ID,
];

/**
 * The two documents {@link SIBLING} holds, one on each side of
 * `documents_parse_status_check`.
 *
 * ONE OF EACH STATUS, so no narrowed page in this file is narrow
 * because the other domain happened to hold nothing to exclude.
 */
const SIBLING_DOCUMENTS: readonly MemoryDomainDocument[] = [
  {
    id: 201,
    sourceId: 41,
    url: 'https://example.test/sibling',
    body: 'a captured column',
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(FIRST_CAPTURE),
  },
  {
    id: 202,
    sourceId: null,
    url: null,
    body: 'an ingested file that would not parse',
    parseStatus: FAILED_STATUS,
    parseError: 'unexpected token',
    capturedAt: new Date(SECOND_CAPTURE),
  },
];

/** The ids {@link SIBLING} holds, which no page here may answer. */
const SIBLING_IDS: readonly number[] = SIBLING_DOCUMENTS.map(
  (row) => row.id,
);

/**
 * The ids of the planted documents on each side of
 * `documents_parse_status_check`.
 *
 * DERIVED FROM THE FIXTURE rather than written out, so a row that
 * changed sides moves both rosters and no case is left asserting
 * about a split the plant no longer has. Both are non-empty, and
 * the case that narrows says so rather than assuming it.
 */
const FAILED_IDS: readonly number[] = PLANTED_DOCUMENTS
  .filter((row) => row.parseStatus === FAILED_STATUS)
  .map((row) => row.id);

/** The other side of it, on the same terms. */
const PARSED_IDS: readonly number[] = PLANTED_DOCUMENTS
  .filter((row) => row.parseStatus === OK_STATUS)
  .map((row) => row.id);

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

/** The path TEMPLATE the one route registers. */
const DOCUMENTS_TEMPLATE = '/domains/:slug/documents';

/**
 * One answered document, as the WIRE has it.
 *
 * `CorpusDocument` WITH ONE MEMBER RETYPED: `capturedAt` is a
 * `Date` across the service and arrives here as an ISO-8601
 * string, because `res.json` serialises through `Date#toJSON`.
 * That is why it is declared rather than imported — and it is held
 * to the same roster the answered type is, so a member renamed on
 * either side is a refusal at {@link EVERY_KEY_LISTED} rather than
 * a member no case looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter
 * that `check-types` refuses.
 */
interface WireDocument {
  /** `documents.id`, and the tiebreak on the page's order. */
  readonly id: number;

  /** The feed it was captured through, or null for neither. */
  readonly sourceId: number | null;

  /** Where it can be read at its source, or null. */
  readonly url: string | null;

  /** The stored text, cut to the cap and then masked. */
  readonly body: string;

  /** How many bytes the STORED body occupies. */
  readonly bodyBytes: number;

  /** Whether the cap took anything. */
  readonly bodyTruncated: boolean;

  /** Which side of the CHECK the row sits on, as stored. */
  readonly parseStatus: string;

  /** What the writer recorded, masked, or null. */
  readonly parseError: string | null;

  /** When it was captured, as JSON carries it. */
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
 * `DocumentStore` with one document WRITER planted on it.
 *
 * The negative control for the signature pin below, and the reason
 * that pin is worth having: a method that could write a
 * `documents` row would have to TAKE one, and this is what that
 * looks like on a signature. It takes a `DocumentRecord`, whose
 * `parseStatus` is the `string` a SELECT answers — a row typed
 * with the narrow union would be assignable to
 * {@link DocumentFilter}, which carries only an optional member of
 * it, and the control would read `true` while pinning nothing.
 */
interface PlantedWriterPort extends DocumentStore {
  insertDocument(row: DocumentRecord): Promise<void>;
}

/**
 * The members an answered document carries.
 *
 * Written out because an interface has no runtime form to read
 * keys off, and pinned in BOTH directions: `satisfies` refuses a
 * name the answered type does not declare, and
 * {@link EVERY_KEY_LISTED} refuses a member added to it and not to
 * this list.
 */
const DOCUMENT_KEYS = [
  'body',
  'bodyBytes',
  'bodyTruncated',
  'capturedAt',
  'id',
  'parseError',
  'parseStatus',
  'sourceId',
  'url',
] as const satisfies readonly (keyof CorpusDocument)[];

/**
 * The members every body this router answers a resource in has.
 *
 * This router writes only the PAGED envelope, so the pair below is
 * here to make `meta` legible as the difference `okPage` adds
 * rather than as one of three keys somebody listed. The shapes
 * case holds the two against each other, which is that function's
 * stated contract read from the outside.
 */
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
 * Every method `DocumentStore` declares.
 *
 * The NAME half of the read-only reading, and pinned two ways so
 * it cannot go quietly stale: `satisfies` refuses a name the port
 * does not carry, and {@link EVERY_KEY_LISTED} refuses a method
 * added to the port and not to this list. Without the second, a
 * writer landing on the port would simply be absent from the
 * classification below and the case would stay green.
 */
const PORT_METHODS = [
  'countDocuments',
  'listDocuments',
] as const satisfies readonly (keyof DocumentStore)[];

/**
 * Every method the router's own store type narrows those to.
 *
 * BOTH OF THE PORT'S TWO ARE HERE, plus the domain lookup, and
 * that is not a narrowing dressed up as one: `src/documents/
 * routes.ts` argues that a method added to `DocumentStore` — which
 * would have to be another read — stays off this router's surface
 * until somebody names it in the service too, and the `Pick` is
 * what makes that an edit rather than an inheritance.
 */
const SERVICE_METHODS = [
  'countDocuments',
  'findDomainBySlug',
  'listDocuments',
] as const satisfies readonly (keyof DocumentsServiceStore)[];

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
  CoversEveryKey<CorpusDocument, typeof DOCUMENT_KEYS>
  & CoversEveryKey<WireDocument, typeof DOCUMENT_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<DocumentStore, typeof PORT_METHODS>
  & CoversEveryKey<DocumentsServiceStore, typeof SERVICE_METHODS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to the answered row, to the envelope, to `meta`,
 * to the port or to the `Pick` the router is handed, and to none
 * of the lists above, turns {@link EveryKeyListed} into a `never`
 * — `false` for the list that missed it, intersected with the
 * `true` the others still answer — and this initializer is then a
 * TS2322 at this line, before any case can compare an answer
 * against a set that has quietly stopped describing it. Read in a
 * case below, so it is a symbol this file uses rather than one
 * lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link DOCUMENT_KEYS}, sorted at use rather than by hand. */
const DOCUMENT_KEY_SET: readonly string[] = [...DOCUMENT_KEYS].sort();

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

/** The verbs a method that only READS can begin with. */
const READING_VERBS = ['count', 'find', 'list'] as const;

/**
 * The words a port method name uses to name the corpus table.
 *
 * Four rather than the one both real methods spell, because what
 * this roster has to catch is the method somebody ADDS: a writer
 * would as readily be called after the capture, the corpus or the
 * column it re-files as after the table itself.
 */
const DOCUMENT_NOUNS = [
  'capture',
  'corpus',
  'document',
  'parsestatus',
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
 * The port methods whose names DO name the corpus table.
 *
 * BOTH OF THEM, which is the non-vacuity reading beside the empty
 * writer list: a classifier matching nothing at all answers no
 * writers over any roster, and this is what says it matched
 * something.
 */
const DOCUMENT_READERS: readonly string[] = [
  'countDocuments',
  'listDocuments',
];

/**
 * Three names that would each write a `documents` row.
 *
 * The liveness control for the classification: the same call over
 * the real roster PLUS these three must name all three, so the
 * empty answer over the roster alone is a reading rather than a
 * search that could only ever come back empty. One per noun the
 * roster carries beyond the table's own name, so a noun dropped
 * from it is reported here rather than left un-exercised.
 */
const PLANTED_WRITERS: readonly string[] = [
  'insertDocument',
  'markCaptureParsed',
  'setParseStatus',
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
  | `${string}Corpus${string}`
  | `${string}Document${string}`
  | `${string}ParseStatus${string}`;

/**
 * `true` only while `T` is a list of ids, filters and windows.
 *
 * The tuple wrapper around `T` is load-bearing for the reason
 * {@link CoversEveryKey}'s is: without it the union of parameter
 * lists distributes, the answer is `boolean`, and both
 * initializers below are accepted whatever the port declares.
 *
 * @typeParam T - A `Parameters<...>` union.
 */
type ReadsOnly<T> =
  [T] extends [readonly (number | DocumentFilter | StoreWindow)[]]
    ? true
    : false;

/**
 * The SIGNATURE half of the read-only claim, `check-types`' own.
 *
 * Every method of `DocumentStore` whose name names the corpus
 * table is handed an id, a narrowing and a window and nothing
 * else, so not one of them can be given a row to store. A writer
 * added to the port is a TS2322 at this line rather than a method
 * the runtime classification would have had to notice on its own.
 */
const DOCUMENT_READS_TAKE_NO_ROW: ReadsOnly<Parameters<
  DocumentStore[Extract<keyof DocumentStore, DocumentNamed>]
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
 * @returns The rows' ids, IN THE ORDER THEY ARRIVED, since what
 *   this file claims about the order is that it survived the
 *   handler unchanged.
 */
function idsOf(body: { data: readonly WireDocument[] }): number[] {
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
function rowFor(
  rows: readonly WireDocument[],
  id: number,
): WireDocument {
  const found = rows.find((row) => row.id === id);

  if (found === undefined) {
    throw new Error(`no answered row carries the id ${id}`);
  }

  return found;
}

/**
 * The code points this surface must never let onto the wire.
 *
 * A SECOND READING OF THE MASKING CLASS, sharing nothing with the
 * one `src/http/control-bytes.ts` masks by: it walks code points
 * and compares ranges, where that module runs one regular
 * expression. Both readings are taken in the same case, so the
 * zero over an answered body is held against a known positive over
 * the stored one.
 *
 * @param text - Any answered or stored string.
 * @returns Every C0, DEL, C1 or lone-surrogate code point in it,
 *   in the order they occur.
 */
function unsafeCodePoints(text: string): number[] {
  const found: number[] = [];

  for (const character of text) {
    const point = character.codePointAt(0) ?? 0;
    const isControl = point < 0x20
      || (point >= 0x7f && point <= 0x9f);

    if (isControl || (point >= 0xd800 && point <= 0xdfff)) {
      found.push(point);
    }
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
 * The path one domain's corpus is read under.
 *
 * @param slug - The domain slug, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 *   Derived from {@link DOCUMENTS_TEMPLATE} rather than spelled
 *   again, and the shapes case asserts no `:` survives the
 *   substitution — an unreplaced parameter still reaches the
 *   router as a literal segment and still answers a plausible
 *   refusal.
 */
function documentsPath(slug: string): string {
  return DOCUMENTS_TEMPLATE.replace(':slug', slug);
}

/**
 * Builds an app carrying one freshly built documents router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the router is mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file's failures depend on
 * their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on this route reads the present,
 * a capture instant being what the pipeline stamped.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildDocumentsApp(store: DocumentsServiceStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildDocumentsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains and the five documents between them.
 *
 * The smallest fixture every case here can be reached from, and
 * the second domain earns its place: it holds one document on each
 * side of the parse-status CHECK, so every page below is a scoping
 * reading as well as whatever else it says.
 *
 * @returns The store, so the structural case can build a router
 *   over it without sending a request.
 */
async function plantDocuments(): Promise<MemoryResearchStore> {
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

  store.setDomainDocuments(domain.id, PLANTED_DOCUMENTS);
  store.setDomainDocuments(sibling.id, SIBLING_DOCUMENTS);

  return store;
}

/**
 * The same fixture with an app in front of it.
 *
 * @returns The app every request-sending case below drives.
 */
async function withDocuments(): Promise<Application> {
  return buildDocumentsApp(await plantDocuments());
}

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant rather than a literal at the assertion, which is
 * how this file says the message is the service's own sentence
 * arriving unmodified with `code` beside it and nothing else. The
 * slug the request named is not in it, which the same case counts
 * rather than assumes.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/**
 * The whole body a parse status outside the tuple answers with.
 *
 * `invalid_value` naming the parameter the caller typed, and the
 * repository's fixed sentence for that code rather than the
 * options zod itself would have listed — which is also what says
 * nothing submitted is quoted back. `parseStatus` rather than
 * `query`, because the enum refused a VALUE: a key this endpoint
 * does not declare is the other refusal this schema can raise, and
 * it names the container instead.
 */
const BAD_STATUS_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'parseStatus',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

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

// ---------------------------------------------------------------------------
// What the fixture plants, and the vocabulary behind every refusal
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants a corpus a page must reorder to answer', async () => {
    const app = await withDocuments();

    // The answered order is neither the order the rows were
    // planted in nor its reverse, which is what makes the ordering
    // assertion in the page case a reading: a store answering rows
    // in insertion order and one answering them backwards each
    // produce a different list from the one right answer.
    expect(CAPTURE_ORDER).not.toStrictEqual(PLANT_ORDER);
    expect(CAPTURE_ORDER).not.toStrictEqual([...PLANT_ORDER].reverse());
    // The second domain holds a corpus of its own, so every page
    // below is a scoping reading as well.
    expect(SIBLING_IDS.length).toBeGreaterThan(0);
    expect(PLANT_ORDER.filter((id) => SIBLING_IDS.includes(id)))
      .toStrictEqual([]);
    // Both sides of `documents_parse_status_check` are planted, so
    // the narrowing case has something to leave out and its 200 is
    // a PARTITION rather than the whole corpus under another name.
    expect(FAILED_IDS.length).toBeGreaterThan(0);
    expect(PARSED_IDS.length).toBeGreaterThan(0);
    expect(FAILED_IDS.length + PARSED_IDS.length).toBe(PLANTED_COUNT);
    // The status the refusal case submits is outside the tuple and
    // the parameter it submits it under is IN the query, both read
    // off the declarations rather than trusted: a member added to
    // `DOCUMENT_PARSE_STATUSES` makes that request legal and a
    // parameter renamed makes it undeclared, and either is a red
    // here rather than a refusal that quietly changed its reason.
    expect([...DOCUMENT_PARSE_STATUSES]).not.toContain(MISSING_STATUS);
    expect(Object.keys(documentListQuerySchema.shape))
      .toContain('parseStatus');
    // No planted domain carries the slug the `404` case names,
    // which no assertion in that case could say for itself: a slug
    // that had collided with a planted domain would answer `200`
    // and read as a refusal that stopped happening.
    expect([RADAR, SIBLING]).not.toContain(MISSING_SLUG);
    // The two members this surface masks really carry something to
    // mask, which is the premise the masking case rests on: a
    // fixture whose control characters had been normalised away
    // would satisfy every assertion there over text that never
    // needed touching.
    expect(unsafeCodePoints(CONTROL_BODY)).toEqual([0x00, 0xd800]);
    expect(unsafeCodePoints(FAILED_ERROR)).toEqual([0x1b, 0x7f]);
    // And the rows really are there, which the counts above cannot
    // say: a fixture whose plant seam had stopped planting would
    // satisfy every premise in this case.
    const page = await request(app).get(documentsPath(RADAR));

    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(PLANTED_COUNT);
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to the answered row, to the envelope, to `meta`, to
    // the port or to the `Pick` the router is handed and to none
    // of the lists is a TS2322 at that declaration, before any
    // assertion below can compare an answer against a set that has
    // quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // between the two success shapes this surface writes.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // The router's own store surface is the port WHOLE plus the
    // domain lookup, which is what `src/documents/routes.ts` claims
    // about its `Pick`: a method added to `DocumentStore` stays off
    // this router until somebody names it in the service too.
    expect(SERVICE_METHOD_SET)
      .toStrictEqual([...PORT_METHODS, 'findDomainBySlug'].sort());
    // And the derived path is a real substitution rather than a
    // template that reached Express as one: an unreplaced
    // parameter is still a literal segment and still answers a
    // plausible refusal.
    expect(DOCUMENTS_TEMPLATE).toContain(':slug');
    expect(documentsPath(RADAR)).not.toContain(':');
    expect(documentsPath(MISSING_SLUG)).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// The page: the envelope, the window it echoes and the rows in it
// ---------------------------------------------------------------------------

describe('a corpus page that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const app = await withDocuments();
    const documents = documentsPath(RADAR);

    const whole = await request(app).get(documents);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same three
    // rows. A handler ignoring the window answers all three to
    // every call, and a `total` taken from the rows in hand
    // answers 1 to each of the narrow pair.
    const first = await request(app)
      .get(documents)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(documents)
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
    expect(idsOf(whole.body)).toStrictEqual(CAPTURE_ORDER);
    // And the page is scoped: the second domain holds one document
    // on each side of the CHECK, so a handler that had stopped
    // resolving the slug would answer five rows here.
    expect(idsOf(whole.body).filter((id) => SIBLING_IDS.includes(id)))
      .toStrictEqual([]);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column — the
    // stored `hash`, the `domainId` the path already named, or any
    // of the four payloads `src/documents/store.ts` leaves out.
    for (const row of whole.body.data as WireDocument[]) {
      expect(keysOf(row)).toStrictEqual(DOCUMENT_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. `capturedAt` is asserted as the ISO
    // spelling because that conversion is the framework's own and
    // is the one member whose type changes crossing `res.json`,
    // and `bodyBytes` is the length of an ASCII body, where bytes
    // and characters coincide — the masking case beside this one
    // is where the two are separated.
    expect(rowFor(whole.body.data as WireDocument[], FEED_ID))
      .toStrictEqual({
        id: FEED_ID,
        sourceId: SOURCE_ID,
        url: FEED_URL,
        body: FEED_BODY,
        bodyBytes: FEED_BODY.length,
        bodyTruncated: false,
        parseStatus: OK_STATUS,
        parseError: null,
        capturedAt: new Date(FIRST_CAPTURE).toISOString(),
      });
    // The two narrow windows are disjoint, each holds the row the
    // ordering puts at that position, and each names the total of
    // the COLLECTION, which no page could have counted from its
    // own rows.
    expect(idsOf(first.body)).toStrictEqual([CAPTURE_ORDER[0]]);
    expect(idsOf(last.body))
      .toStrictEqual([CAPTURE_ORDER[PLANTED_COUNT - 1]]);
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
// What the masking takes out, as the wire has it
// ---------------------------------------------------------------------------

describe('what the masking takes out on the wire', () => {
  it('answers a stored body and error as their escapes', async () => {
    const app = await withDocuments();
    const page = await request(app).get(documentsPath(RADAR));
    const rows = page.body.data as WireDocument[];
    const pasted = rowFor(rows, PASTED_ID);
    const broken = rowFor(rows, BROKEN_ID);

    expect(page.status).toBe(200);
    // BOTH members this surface masks, in ONE response: the body
    // of one row and the parse error of another. The two are the
    // characters `JSON.stringify` passes through as themselves, so
    // a response built from unmasked text carries them onto the
    // wire intact and nothing a reader of the answer sees says so.
    expect(pasted.body).toBe(MASKED_CONTROL_BODY);
    expect(broken.parseError).toBe(MASKED_FAILED_ERROR);
    // Re-read through a code-point scan that shares nothing with
    // the class the module masks by: the stored text carries the
    // control points and the answered text carries none. Both
    // readings are taken in the same case, so each zero is held
    // against a known positive over the same string.
    expect(unsafeCodePoints(pasted.body)).toEqual([]);
    expect(unsafeCodePoints(CONTROL_BODY)).toEqual([0x00, 0xd800]);
    expect(unsafeCodePoints(broken.parseError ?? '')).toEqual([]);
    expect(unsafeCodePoints(FAILED_ERROR)).toEqual([0x1b, 0x7f]);
    // The valid pair beside them is UNTOUCHED, which is what says
    // only a surrogate standing on its own was masked. That rests
    // on the `u` flag on the module's class: dropped, this
    // character answers as two escapes while every assertion above
    // goes on holding, so the pair is asserted present AND its
    // escaped spelling asserted absent.
    expect(pasted.body.includes(ASTRAL_PAIR)).toBe(true);
    expect(pasted.body.includes('\\ud83d')).toBe(false);
    // Nothing was cut, and `bodyBytes` is the STORED length rather
    // than the answered one. Masking is expansive — two characters
    // became twelve — so the two numbers disagree here, which is
    // what makes the member a reading rather than a coincidence of
    // a body with nothing in it to mask.
    expect(pasted.bodyTruncated).toBe(false);
    expect(pasted.bodyBytes)
      .toBe(Buffer.byteLength(CONTROL_BODY, 'utf8'));
    expect(pasted.bodyBytes)
      .not.toBe(Buffer.byteLength(pasted.body, 'utf8'));
    // The control inside the case, varied along the axis under
    // test: a row on the same page whose stored text has nothing
    // to mask reaches the wire as itself. A masker rewriting every
    // body would satisfy every assertion above and fail this one.
    expect(rowFor(rows, FEED_ID).body).toBe(FEED_BODY);
    // And a null parse error stays null rather than becoming the
    // masking of an empty string, which is the shape a reader
    // would have no way to tell from a writer that recorded
    // nothing.
    expect(pasted.parseError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A parse status this route will not take
// ---------------------------------------------------------------------------

describe('a parse status outside the tuple', () => {
  it('refuses the status and lands the one beside it', async () => {
    const app = await withDocuments();
    const documents = documentsPath(RADAR);

    const refused = await request(app)
      .get(documents)
      .query({ parseStatus: MISSING_STATUS });
    // The control, inside the case and varied along this row's own
    // axis: the same request with a status the tuple DOES declare.
    // A schema refusing every status passes the refusal below and
    // fails this.
    const taken = await request(app)
      .get(documents)
      .query({ parseStatus: FAILED_STATUS });

    expect(refused.status).toBe(422);
    // The whole body rather than the status, which is where the
    // refusal says WHICH rule it was: `invalid_value` naming the
    // parameter the caller typed, under the repository's own fixed
    // sentence for that code rather than the options zod would
    // have listed. A key this endpoint does not declare is the
    // other refusal this schema can raise and it names `query`
    // instead, so the two are told apart here rather than by a
    // shared 422.
    expect(refused.body).toStrictEqual(BAD_STATUS_BODY);
    // Nothing the request submitted is in that envelope, counted
    // rather than asserted absent and held against a known
    // positive taken by the same function in the same case: the
    // path a caller could read the status back off is the one it
    // sent. What a refusal may contain across the whole surface is
    // `tests/api/request-echo.test.ts`'s subject.
    expect(countOccurrences(refused.text, MISSING_STATUS)).toBe(0);
    expect(countOccurrences(
      `?parseStatus=${MISSING_STATUS}`,
      MISSING_STATUS,
    )).toBe(1);
    // And the declared member LANDS, narrowing rather than
    // refusing: the page it answers is one side of the CHECK, its
    // `total` counts that side rather than the corpus, and the
    // side is a proper part of it.
    expect(taken.status).toBe(200);
    expect(idsOf(taken.body).sort()).toStrictEqual([...FAILED_IDS].sort());
    expect(taken.body.meta.total).toBe(FAILED_IDS.length);
    expect(FAILED_IDS.length).toBeLessThan(PLANTED_COUNT);
  });
});

// ---------------------------------------------------------------------------
// A slug no domain carries
// ---------------------------------------------------------------------------

describe('a slug that names no domain', () => {
  it('refuses the address without quoting it back', async () => {
    const app = await withDocuments();

    const missing = await request(app).get(documentsPath(MISSING_SLUG));
    // The control, through the SAME operation: the identical
    // request over the slug that resolves. A router refusing every
    // address passes every assertion above and fails this one.
    const found = await request(app).get(documentsPath(RADAR));

    expect(missing.status).toBe(404);
    // A 404 and not an empty page, which is the whole distinction:
    // a mistyped slug and a domain whose first poll has not run
    // are different answers, and the second is the `200` with an
    // empty `data` this one is not. The body is asserted whole, so
    // the sentence is the service's own arriving unmodified with
    // `code` beside it and nothing else at all.
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(keysOf(missing.body)).not.toContain('data');
    expect(keysOf(missing.body)).not.toContain('meta');
    // The slug is not quoted back, counted rather than asserted
    // absent and held against a known positive taken by the same
    // function in the same case — the request path, where the
    // segment a caller typed does occur exactly once.
    expect(countOccurrences(missing.text, MISSING_SLUG)).toBe(0);
    expect(countOccurrences(documentsPath(MISSING_SLUG), MISSING_SLUG))
      .toBe(1);
    // And the refusal came from the LOOKUP rather than from the
    // address parse: this slug satisfies `slugParamSchema`, so a
    // boundary that had refused it would answer `422` naming
    // `slug`, which the whole-body comparison above rules out.
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(PLANTED_COUNT);
  });
});

// ---------------------------------------------------------------------------
// The structure: one verb, and a port that cannot write a document
// ---------------------------------------------------------------------------

describe('what this router structurally cannot do', () => {
  it('registers one get on one path and no other verb', async () => {
    // Built here rather than reached through {@link withDocuments},
    // because what this reads is the router's own DECLARATION: a
    // factory registers its routes at construction and reads
    // nothing, so no fixture is involved in the answer.
    const store = await plantDocuments();
    const registered = routesOf(buildDocumentsRouter({ store }));

    // The whole inventory in one comparison, derived from the
    // stack rather than transcribed: a second path, a second verb
    // on this one, or a `post` in place of the `get` are each a
    // different value here. An empty stack is too, which is what
    // keeps this from being a search that could only answer
    // nothing.
    expect(registered).toStrictEqual([
      { path: DOCUMENTS_TEMPLATE, verbs: ['get'] },
    ]);
    // The verb SET across the whole router, read separately, so a
    // failure says whether a path or a verb moved.
    expect(registered.flatMap((route) => route.verbs))
      .toStrictEqual(['get']);
    expect(registered).toHaveLength(1);
  });

  it('names no port method that writes a document', () => {
    // The roster is pinned in both directions at its declaration,
    // so what this classifies is every method `DocumentStore`
    // declares and not a list that stopped tracking it.
    const methods: readonly string[] = PORT_METHODS;

    expect(documentWritersIn(methods)).toStrictEqual([]);
    // Non-vacuous: the port DOES name the corpus table, in both of
    // its methods, and a classifier matching nothing would answer
    // the empty list above against any roster at all.
    expect(methods.filter(namesADocument)).toStrictEqual(DOCUMENT_READERS);
    // And every one of them begins with a reading verb, which is
    // the other half of what the empty writer list is made of: a
    // method naming the table and starting with none of the three
    // is exactly what `documentWritersIn` reports.
    expect(methods.filter(
      (method) => READING_VERBS.some((verb) => method.startsWith(verb)),
    )).toStrictEqual([...PORT_METHODS]);
    // The liveness control, through the same call in the same
    // case: three names that WOULD write a row are all reported
    // when they sit in the roster beside the real ones — one per
    // noun the roster carries beyond the table's own name.
    expect(documentWritersIn([...methods, ...PLANTED_WRITERS]))
      .toStrictEqual([...PLANTED_WRITERS]);
    // The same reading over the narrower surface the ROUTER holds,
    // which is where a writer would have to appear to be reachable
    // from a handler at all: the domain lookup names no document
    // and the two that do are the port's own reads.
    expect(documentWritersIn(SERVICE_METHOD_SET)).toStrictEqual([]);
    expect(SERVICE_METHOD_SET.filter(namesADocument))
      .toStrictEqual(DOCUMENT_READERS);
    // The signature half, which `check-types` owns and which no
    // name can report: both of those methods are handed an id, a
    // narrowing and a window, so neither can be given a row to
    // store. Its own negative control sits beside it — the same
    // derivation over a port carrying a planted writer answers
    // `false`, which is what says the derivation discriminates
    // rather than answering `true` for everything.
    expect(DOCUMENT_READS_TAKE_NO_ROW).toBe(true);
    expect(A_PLANTED_WRITER_IS_REPORTED).toBe(false);
  });
});
