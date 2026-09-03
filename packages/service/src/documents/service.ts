/**
 * @packageDocumentation
 * The documents surface's one read: a window of a domain's corpus,
 * with every stored string put through the two passes a response
 * owes text that nobody here chose.
 *
 * ONE FUNCTION AND NO WRITE, which is the port's shape rather than
 * this module's restraint. `src/documents/store.ts` declares two
 * methods, both reads, and there is no third — no insert, no
 * update, no delete, and no escape hatch to reach `documents`
 * through some other way — so nothing here can offer to re-parse a
 * failed capture, by mistake or by a later edit, because there is
 * nothing to call. `docs/architecture/08-http-api.md` states that
 * read-first law for the whole wave and
 * `tests/invariants/api-read-first.test.ts` derives it from `keyof`
 * over the port types rather than from either paragraph.
 *
 * THE DOMAIN IS RESOLVED BEFORE ANY DOCUMENT IS READ, and that read
 * is the entire difference between a domain that has captured
 * nothing and a domain that is not there. `DocumentStore` answers
 * an empty list and a count of `0` for an id no domain carries,
 * both correctly — nothing points at a row that is not there — so
 * the two document reads alone could not tell those two states
 * apart, and a mistyped slug would read as a domain whose first
 * poll had not run. The lookup is awaited on its own rather than
 * folded into the pair below, which is the one place this module
 * deliberately pays a round trip: a 404 that had already issued two
 * reads over `documents` would be scanning the corpus to answer
 * about a domain that does not exist.
 *
 * THE TWO PASSES COMPOSE IN ONE ORDER AND THIS MODULE OWES IT.
 * `takeCodePoints` runs on the STORED text and `maskControlBytes`
 * on what that answers, per the header of
 * `src/http/control-bytes.ts`. Masking first would let a single NUL
 * spend six of the cap's budget and would let the cut land in the
 * middle of an escape it had just written; cutting by code point is
 * what stops the cap itself from manufacturing a lone surrogate
 * that was never stored.
 *
 * WHAT IS MASKED IS TWO MEMBERS, NAMED RATHER THAN INFERRED. `body`
 * and `parseError` are the two `docs/architecture/08-http-api.md`
 * enumerates, and they are the two most likely to carry a control
 * byte at all: one is a payload somebody else sent, and the other
 * is a message built out of the bytes that broke a parser.
 * {@link CorpusDocument.url} is answered AS STORED, which is a
 * narrower promise than the two beside it and is recorded here
 * rather than left to be discovered — widening the masking to cover
 * it is a change to that document first and to this module second.
 *
 * THE CAP IS SHARED AND READ FROM ITS DECLARATION.
 * `BODY_CODE_POINT_CAP` lives in `src/http/control-bytes.ts` beside
 * the two passes it is spent on, because more than one surface
 * answers stored untrusted text and two literals that agreed on the
 * day they were written would be two caps. This module imports it
 * and forwards nothing: `src/sources/failures-service.ts`
 * re-exports its own view of that binding so its cases can go on
 * deriving fixtures from the surface they are about, and a second
 * forward here would be a third name for one number.
 *
 * THE FILTER AND THE WINDOW ARRIVE ALREADY DERIVED, on the terms
 * every list on this surface keeps. `?parseStatus`, `?page` and
 * `?perPage` are how a caller ASKED — a vocabulary belonging to
 * HTTP that an MCP tool would not spell at all — and
 * {@link documentListQuerySchema} is the whole of what this module
 * says about it. `toStoreWindow` in `src/http/schemas.ts` owns the
 * translation, so nothing here re-checks a bound: that schema is
 * what refuses a `perPage` above the cap and a status outside
 * `DOCUMENT_PARSE_STATUSES`, and a second check here would be a
 * second rule nobody would notice drifting from the first.
 *
 * A STATUS IS REFUSED AT THE BOUNDARY RATHER THAN PASSED THROUGH,
 * which is the opposite of what the connectors list does with a
 * `?kind` and is why `DocumentFilter.parseStatus` is the union
 * where `DocumentRecord.parseStatus` is `string`. The tuple has two
 * members, a page carries both by default, and a third value is a
 * caller asking for something the column cannot hold — an empty
 * page would answer that as though the corpus simply held none.
 *
 * THE ONE REFUSAL THIS MODULE RAISES QUOTES NOTHING. The sentence
 * below is a constant of its own, neither function builds any
 * `details` at all, and no value a caller submitted is composed
 * into either. `./service.test.ts` counts occurrences of a planted
 * sentinel in each CHANNEL of each refusal rather than asserting
 * absence, with the same count taken over a planted refusal that
 * leaks through all three, so a search that would find nothing
 * anywhere cannot report a clean refusal.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * `documents` rows behind both reads, no port writing one.
 */
import type {
  DocumentFilter,
  DocumentRecord,
  DocumentStore,
} from './store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { NotFoundError } from '../../lib/errors/index.js';
import { DOCUMENT_PARSE_STATUSES } from '../db/schema/values.js';
import {
  BODY_CODE_POINT_CAP,
  maskControlBytes,
  takeCodePoints,
} from '../http/control-bytes.js';
import { paginationQuerySchema } from '../http/schemas.js';

/**
 * Exactly the port methods {@link listDocuments} reaches, across
 * both ports it reaches them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, for the
 * reason `SourceServiceStore` in `src/sources/service.ts` gives.
 * Resolving a slug is one method of `DomainStore`, and asking for
 * that port whole would have this module claim to need the domain
 * writes it never issues.
 *
 * THE SECOND `Pick` NAMES BOTH METHODS `DocumentStore` HAS, and
 * that is not a redundancy dressed as a narrowing. A method added
 * to that port — which `src/documents/store.ts` argues would have
 * to be another read — stays off this module's surface until
 * somebody names it here too, and the `Pick` is what makes that an
 * edit rather than an inheritance.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type DocumentsServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<DocumentStore, 'countDocuments' | 'listDocuments'>;

/**
 * The whole query `GET /domains/:slug/documents` reads: a page over
 * one domain's corpus, and one narrowing.
 *
 * EXTENDED FROM THE SHARED DECLARATION RATHER THAN RESPELT, so the
 * default page, the 200 cap and the coercion a query string needs
 * are inherited and none of them is stated twice. It is the same
 * composition `connectorListQuerySchema` in
 * `src/connectors/routes.ts` makes over the same base, and the
 * direction carries nothing: neither side declares an object-level
 * refinement, so unlike the window chain in
 * `src/findings/service.ts` there is no check that a composition
 * built the other way round could silently drop.
 *
 * STRICT, which it inherits rather than re-declares.
 * `paginationQuerySchema` is `.strict()` and `.extend()` keeps the
 * catchall, so `?parseStatis=failed` is a `422` naming `query`
 * rather than a narrowing quietly dropped — which is the difference
 * between a caller being told its filter was ignored and a caller
 * reading the whole corpus as the answer to it.
 *
 * `parseStatus` HOLDS TO THE TUPLE, so a value outside
 * `DOCUMENT_PARSE_STATUSES` answers `invalid_value` naming the
 * parameter rather than reaching the port and paging nothing. The
 * tuple is the one `documents_parse_status_check` is generated
 * from, so this parameter and the column are two readings of a
 * single declaration: a member added to it becomes filterable with
 * this file unedited, and a member removed from it stops being
 * filterable on the day the column stops accepting it.
 *
 * AN ABSENT MEMBER IS BOTH STATUSES, and there is no spelling here
 * that means neither. A failed document is IN the corpus rather
 * than behind a flag, per `src/db/schema/documents.ts`, so the
 * default page is the whole corpus and this parameter narrows it.
 */
export const documentListQuerySchema = paginationQuerySchema.extend({
  parseStatus: z.enum(DOCUMENT_PARSE_STATUSES).optional(),
});

/**
 * A parsed documents query: the page always present because both
 * its members carry a default, the narrowing present only when it
 * was sent.
 */
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it, per this module's header, and it is the
 * same sentence the wave-1 and wave-2 services answer for their own
 * `:slug` — spelled again rather than imported, because the several
 * are equal by intent rather than by derivation and any of them is
 * free to change without dragging the others with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/**
 * One document of a domain's corpus, as the surface answers it.
 *
 * {@link DocumentRecord} WITH TWO MEMBERS CHANGED AND TWO ADDED,
 * rather than the port record passed through. `body` is cut and
 * masked, `parseError` is masked, and `bodyBytes` and
 * `bodyTruncated` are the two numbers that make the cut legible.
 * The record and this type deliberately do not share a
 * declaration: what the column holds and what a response carries
 * are different facts, and a single type would leave nowhere to
 * say so. `SourceFailure` in `src/sources/failures-service.ts` is
 * the same split over the same table one collection along.
 */
export interface CorpusDocument {
  /** `documents.id`, and the tiebreak on the corpus page's order. */
  readonly id: number;

  /**
   * The feed this document was captured through, or null when it
   * came through none.
   *
   * NULL IS AN ORDINARY STATE rather than an edge case, and it is
   * what makes this collection wider than the failures queue: an
   * ingested file and a pasted body sit in the middle of this page
   * by capture time and are unreachable through a queue keyed on
   * `source_id`.
   */
  readonly sourceId: number | null;

  /**
   * Where the document can be read at its source, or null when
   * there is no such place.
   *
   * AS STORED — not masked and not cut. The module header says why
   * and what that costs.
   */
  readonly url: string | null;

  /**
   * The captured text, cut to `BODY_CODE_POINT_CAP` code points and
   * then masked.
   *
   * Possibly empty, and empty is a capture that yielded no text and
   * was kept anyway rather than a row somebody skipped.
   */
  readonly body: string;

  /**
   * How many bytes the STORED body occupies, whatever was answered
   * above.
   *
   * The stored length rather than the answered one, and the two
   * differ by exactly what was withheld — which is the number worth
   * having when deciding whether to go to the database for the
   * rest. Bytes rather than code points because it is a size, and
   * because the answered `body` is a masked rendering whose own
   * length says nothing about the row.
   */
  readonly bodyBytes: number;

  /**
   * Whether the cap took anything.
   *
   * Beside {@link CorpusDocument.bodyBytes} rather than derived
   * from it by a reader: a client cannot compare a byte count
   * against a code-point cap without re-encoding the answer, and a
   * body whose bytes merely exceed the cap need not have been cut
   * at all.
   */
  readonly bodyTruncated: boolean;

  /**
   * Which side of `documents_parse_status_check` the row sits on,
   * as stored.
   *
   * `string` rather than the union, which is what a SELECT actually
   * answers: the tuple is a CHECK in the database rather than a
   * union in the type system, so a row written before a member was
   * removed still reads back. The narrowing belongs to
   * {@link documentListQuerySchema}, an input having been held to
   * the tuple at the boundary before it got anywhere near a row.
   *
   * ANSWERED BECAUSE THE PAGE CARRIES BOTH MEMBERS BY DEFAULT: a
   * reader shown a mixed page is owed the column that says which of
   * the two a row is.
   */
  readonly parseStatus: string;

  /**
   * What the writer that saw it recorded, masked, or null when
   * nothing was recorded.
   *
   * Null on a `failed` row is storable and is the shape that costs
   * an operator the most; this surface answers it as null rather
   * than papering over it with a message no writer wrote.
   *
   * NOT CUT, unlike the body beside it. A parse error is a sentence
   * a writer in this system composed rather than a payload somebody
   * else sent, and cutting one would take the end of the sentence
   * that names the fault. It is masked for the same reason the body
   * is: what a writer quotes into it is often the bytes that broke
   * the parse.
   */
  readonly parseError: string | null;

  /**
   * When the pipeline captured the document, which is not when its
   * source published it. What the page is ordered by, newest first.
   */
  readonly capturedAt: Date;
}

/**
 * One page of a domain's corpus, and the size of the collection it
 * was read from.
 *
 * Two members rather than a rendered envelope, for the reason every
 * page on this surface gives: building `meta` is the router's half,
 * and this module was never told what the window was in
 * `page`/`perPage` terms.
 */
export interface DocumentPage {
  /**
   * The rows the window selected, `capturedAt` descending with `id`
   * descending breaking a tie.
   *
   * The order is the store's, per `DocumentStore.listDocuments`,
   * and nothing here re-sorts: a service sorting a page it was
   * handed would be answering a different order from the one the
   * window was taken under, which is how two pages come to disagree
   * about which row they hold.
   */
  readonly rows: readonly CorpusDocument[];

  /**
   * How many of that domain's documents the same FILTER selects,
   * ignoring the window.
   *
   * The same filter the page was read through, which is what keeps
   * `meta.total` describing the page's own collection: a total
   * counted without the status narrowing would tell a caller
   * filtering by `failed` how many documents the domain holds
   * altogether.
   */
  readonly total: number;
}

/**
 * One stored document as the corpus page answers it.
 *
 * @param row - The row as the store read it, unmasked and uncut.
 * @returns The answered shape: the body cut and then masked, the
 *   stored byte length and the truncation flag beside it, and the
 *   error masked.
 *
 * @remarks
 * THE ORDER OF THE TWO PASSES IS THE WHOLE OF THIS FUNCTION and the
 * module header argues it. `takeCodePoints` first, on the stored
 * text, so the cap counts what was stored rather than what the
 * masking wrote.
 *
 * `bodyTruncated` is read off the CUT rather than off a comparison
 * of lengths: `kept !== row.body` is true exactly when something
 * was taken, whatever the cap is and whatever the body is made of,
 * where a length comparison has to agree separately with how
 * `takeCodePoints` counts.
 *
 * `capturedAt` is passed through rather than copied. Every
 * implementation of this port answers a `Date` that belongs to
 * nobody else — the drizzle one builds it per read and the
 * in-memory one copies on the way out — so a copy here would be a
 * second defence against a hazard the port already rules out.
 */
function answeredDocument(row: DocumentRecord): CorpusDocument {
  const kept = takeCodePoints(row.body, BODY_CODE_POINT_CAP);

  return {
    id: row.id,
    sourceId: row.sourceId,
    url: row.url,
    body: maskControlBytes(kept),
    bodyBytes: Buffer.byteLength(row.body, 'utf8'),
    bodyTruncated: kept !== row.body,
    parseStatus: row.parseStatus,
    parseError: row.parseError === null
      ? null
      : maskControlBytes(row.parseError),
    capturedAt: row.capturedAt,
  };
}

/**
 * Resolves the `:slug` the documents collection path opens with.
 *
 * @param store - Where the domain is read.
 * @param slug - The natural key, already narrowed by
 *   `slugParamSchema` at whichever boundary the request entered.
 * @returns The domain row, for its id.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * Private, and its message is this module's own. Every service on
 * this surface keeps the identical helper unexported for exactly
 * this reason: a shared one would put one route group's wording on
 * another's refusals, and each is free to diverge the moment it has
 * something of its own to say.
 */
async function requireDomain(
  store: DocumentsServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Reads one window of a domain's corpus, narrowed as the caller
 * asked and masked as the wire requires.
 *
 * @param store - Where the domain and its documents are read.
 * @param slug - The domain's natural key.
 * @param filter - What to narrow to, as the router rebuilt it from
 *   the parsed query. An empty filter is the whole corpus, both
 *   parse statuses included.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   derived it from `?page` and `?perPage`. Already validated, so
 *   nothing here re-checks its bounds.
 * @returns The masked rows and the size of the whole narrowed
 *   collection.
 * @throws NotFoundError - When no domain carries the slug. The only
 *   refusal this function has: a domain that has captured nothing,
 *   a status no document carries and a window past the end are each
 *   an empty page.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE TWO READS ARE ISSUED, which is
 * the ordering the module header argues and the one thing a reader
 * might otherwise fold into the `Promise.all` below. A 404 must
 * cost `documents` no read at all.
 *
 * The two reads that DO run are issued together, for the reason
 * every list on this surface gives: a page's rows and its
 * collection's size are independent questions, and awaiting them in
 * sequence would make every request pay two round trips to answer
 * one body. Both are handed the SAME filter, which is what keeps a
 * page's `meta.total` from describing a different collection than
 * the page.
 *
 * A WINDOW PAST THE END IS AN EMPTY PAGE RATHER THAN A 404. The
 * collection exists and only the window over it is empty, which a
 * caller can see from `meta` once the router has built one.
 */
export async function listDocuments(
  store: DocumentsServiceStore,
  slug: string,
  filter: DocumentFilter,
  window: StoreWindow,
): Promise<DocumentPage> {
  const domain = await requireDomain(store, slug);
  const [rows, total] = await Promise.all([
    store.listDocuments(domain.id, filter, window),
    store.countDocuments(domain.id, filter),
  ]);

  return { rows: rows.map(answeredDocument), total };
}
