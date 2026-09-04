/**
 * @packageDocumentation
 * The review queue: one source's failed captures, read a page at a
 * time, every stored string put through the two passes a response
 * owes text that nobody here chose.
 *
 * ONE FUNCTION, AND IT IS A SIBLING OF `./service.ts` RATHER THAN A
 * MEMBER OF IT. That module rules on a `sources` ROW — reading a
 * domain's feeds, adding one, retuning one, retiring one — and this
 * one rules on the `documents` captured through one of them. Two
 * subjects, two files, and the split is what keeps the resource
 * operations and the queue from growing into each other:
 * `SourceServiceStore` over there names neither read below, and
 * {@link SourceFailuresServiceStore} names none of the writes.
 * `./store.ts` carries the whole of that argument for the one port
 * the two of them narrow.
 *
 * THE SOURCE IS RESOLVED BEFORE ANY DOCUMENT IS READ, and that read
 * is the entire difference between a source whose captures all
 * parsed and a source that is not there. `SourceStore` answers an
 * empty list and a count of `0` for an id no row carries, both
 * correctly — nothing points at a row that is not there — so the
 * two document reads alone could not tell the two states apart, and
 * a mistyped id would read as a feed that has never broken. The
 * lookup is awaited on its own rather than joined to them, which is
 * the one place this module deliberately pays a round trip: a 404
 * that had already issued two reads over `documents` would be
 * scanning the corpus to answer about a row that does not exist.
 *
 * READ-ONLY IS THE PORT'S CLAIM AND NOT THIS MODULE'S OBSERVANCE.
 * `SourceStore` declares no method that writes a `documents` row at
 * all, so nothing here could mutate `parse_status` even by mistake
 * — there is nothing to call — and the `Pick` below narrows that to
 * three reads besides. Retrying a failed capture is a pipeline
 * operation with a cost and a dedupe question attached, and
 * `docs/architecture/08-http-api.md` states why a review surface
 * that could also re-run work would be a second schedule trigger.
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
 * enumerates, and they are the two a failed parse is likeliest to
 * have put a control byte into: what made a payload fail to parse
 * is often what carries one. {@link SourceFailure.url} is answered
 * AS STORED, which is a narrower promise than the two beside it and
 * is recorded here rather than left to be discovered — widening the
 * masking to cover it is a change to that document first and to
 * this module second.
 *
 * THE CAP IS SHARED RATHER THAN THIS MODULE'S OWN, and it is a
 * constant rather than a query parameter, so no caller can ask for
 * the whole of a stored payload and no route can be talked into
 * serving one. {@link BODY_CODE_POINT_CAP} is declared in
 * `src/http/control-bytes.ts` beside the two passes and forwarded
 * from here; it carries the arithmetic. What travels beside the cut
 * body is the STORED byte length rather than the answered one,
 * which is what lets a reader tell a cut body from a short one and
 * how much was withheld.
 *
 * THE WINDOW ARRIVES ALREADY DERIVED, exactly as `./service.ts`
 * argues for the list beside this one. `?page` and `?perPage` are
 * how a caller ASKED, a vocabulary belonging to HTTP that an MCP
 * tool would not spell at all, and `toStoreWindow` in
 * `src/http/schemas.ts` owns the translation. Nothing here
 * re-checks the bounds: `paginationQuerySchema` is what refuses a
 * `perPage` above the cap, and a second check here would be a
 * second rule nobody would notice drifting from the first.
 *
 * NOTHING READ REACHES A MESSAGE BUILT HERE. The one sentence below
 * is a constant of this module's own, this function builds no
 * `details` at all, and no stored value is quoted into either. A
 * body that broke a parser is the last text in the corpus that
 * should reach a log line through an error message.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * `documents` rows behind all three reads, since no port writes
 * one.
 */
import type { SourceFailureRecord, SourceStore } from './store.js';
import type { StoreWindow } from '../http/schemas.js';

import { NotFoundError } from '../../lib/errors/index.js';
import {
  BODY_CODE_POINT_CAP,
  maskControlBytes,
  takeCodePoints,
} from '../http/control-bytes.js';

/**
 * Exactly the port methods {@link listSourceFailures} reaches.
 *
 * TEN OF THE THIRTEEN `SourceStore` METHODS ARE ABSENT, and the
 * absence is this module's read-only claim written as a type. Every
 * write on that port — the insert, the update, the delete and the
 * config approval — and every read about the `sources` row itself
 * belongs to `./service.ts` or to `./proposals-service.ts`, and a
 * queue handed the whole port would be claiming to need them.
 *
 * `findSourceById` is here and is not a document read: it is what
 * turns an id naming nothing into a 404 rather than into an empty
 * page. The other two are the whole of what this port does with
 * `documents`, and there is no third — no insert, no update, no
 * delete, and no escape hatch to reach that table through.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type SourceFailuresServiceStore = Pick<
  SourceStore,
  'countSourceFailures' | 'findSourceById' | 'listSourceFailures'
>;

/**
 * The cap this surface cuts a stored body at, forwarded rather
 * than declared.
 *
 * `src/http/control-bytes.ts` holds the number, beside the two
 * passes it is spent on, because more than one surface answers
 * stored untrusted text and two literals that agree today are two
 * caps. The whole of the argument — the arithmetic that bounds a
 * page, why it counts code points, and why it is a constant rather
 * than a query parameter — lives with the declaration.
 *
 * Forwarded rather than merely imported so the queue's own cases
 * can go on deriving their fixtures from the surface they are
 * about, and so `./failures-routes.ts` can name the cap it says it
 * does not choose. `src/http/control-bytes.test.ts` holds this
 * binding against the declaration and reads both modules for a
 * second declaration, which is what makes it one cap rather than
 * two that happen to agree.
 */
export { BODY_CODE_POINT_CAP };

/**
 * What a caller is told when no source carries the id it named.
 *
 * Equal by intent to the sentence `./service.ts` answers for the
 * same `:id`, and spelled again rather than imported, on the terms
 * every service on this surface keeps its own: the two are free to
 * diverge the moment either has something of its own to say, and a
 * shared constant would make that divergence an edit to both.
 */
const NO_SUCH_SOURCE = 'No source carries that id';

/**
 * One row of the failures queue, as the surface answers it.
 *
 * {@link SourceFailureRecord} WITH THREE MEMBERS CHANGED AND ONE
 * ADDED, rather than the port record passed through. `body` is cut
 * and masked, `parseError` is masked, and `bodyBytes` and
 * `bodyTruncated` are the two numbers that make the cut legible.
 * The record and this type deliberately do not share a declaration:
 * what the column holds and what a response carries are different
 * facts, and a single type would leave nowhere to say so.
 */
export interface SourceFailure {
  /** `documents.id`, and the tiebreak on the queue's order. */
  readonly id: number;

  /**
   * Where the document can be read at its source, or null when
   * there is no such place.
   *
   * AS STORED — not masked and not cut. The module header says why
   * and what that costs.
   */
  readonly url: string | null;

  /**
   * The captured text, cut to {@link BODY_CODE_POINT_CAP} code
   * points and then masked.
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
   * Beside {@link SourceFailure.bodyBytes} rather than derived from
   * it by a reader: a client cannot compare a byte count against a
   * code-point cap without re-encoding the answer, and a body whose
   * bytes merely exceed the cap need not have been cut at all.
   */
  readonly bodyTruncated: boolean;

  /**
   * What the writer that saw it recorded, masked, or null when
   * nothing was recorded.
   *
   * Null on a `failed` row is storable and is the shape that costs
   * an operator the most; the queue answers it as null rather than
   * papering over it with a message no writer wrote.
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
   * source published it. What the queue is ordered by, newest
   * first.
   */
  readonly capturedAt: Date;
}

/**
 * One page of a source's failures, and the size of the whole queue.
 *
 * The same shape `SourcePage` in `./service.ts` takes, for the same
 * reason: `meta.total` describes the COLLECTION and a page cannot
 * be asked how large the thing it is a window onto is.
 */
export interface SourceFailurePage {
  /**
   * The rows the window selected, `capturedAt` descending with `id`
   * descending breaking a tie.
   *
   * The order is the store's, per `SourceStore.listSourceFailures`,
   * and nothing here re-sorts: a service sorting a page it was
   * handed would be answering a different order from the one the
   * window was taken under, which is how two pages come to disagree
   * about which row they hold.
   */
  readonly rows: readonly SourceFailure[];

  /** How many failed captures the source holds, ignoring the window. */
  readonly total: number;
}

/**
 * One stored document as the queue answers it.
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
function answeredFailure(row: SourceFailureRecord): SourceFailure {
  const kept = takeCodePoints(row.body, BODY_CODE_POINT_CAP);

  return {
    id: row.id,
    url: row.url,
    body: maskControlBytes(kept),
    bodyBytes: Buffer.byteLength(row.body, 'utf8'),
    bodyTruncated: kept !== row.body,
    parseError: row.parseError === null
      ? null
      : maskControlBytes(row.parseError),
    capturedAt: row.capturedAt,
  };
}

/**
 * Reads one window of a source's failed captures.
 *
 * @param store - Where the source is resolved and its failures
 *   read.
 * @param sourceId - The id as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   derived it from `?page` and `?perPage`. Already validated, so
 *   nothing here re-checks its bounds.
 * @returns The masked rows and the size of the whole queue.
 * @throws NotFoundError - When no source carries the id. The only
 *   refusal this function has: a source whose captures all parsed,
 *   a source that has captured nothing and a window past the end
 *   are each an empty page.
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
 * one body.
 *
 * NEITHER READ CAN BE ASKED FOR AN `ok` DOCUMENT. The filter is the
 * port's — there is no status parameter on either method — so this
 * function cannot become a way to page the corpus, and that is a
 * shape rather than a rule it observes.
 */
export async function listSourceFailures(
  store: SourceFailuresServiceStore,
  sourceId: number,
  window: StoreWindow,
): Promise<SourceFailurePage> {
  const source = await store.findSourceById(sourceId);

  if (source === null) {
    throw new NotFoundError(NO_SUCH_SOURCE);
  }

  const [rows, total] = await Promise.all([
    store.listSourceFailures(sourceId, window),
    store.countSourceFailures(sourceId),
  ]);

  return { rows: rows.map(answeredFailure), total };
}
