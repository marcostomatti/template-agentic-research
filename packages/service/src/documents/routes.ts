/**
 * @packageDocumentation
 * The HTTP surface over `src/documents/service.ts`: ONE route, and
 * nothing in it that decides anything.
 *
 * `GET /domains/:slug/documents` is {@link listDocuments}. What the
 * handler adds over the call it wraps is an address to read, a
 * query to take apart, a window to derive, a status to choose and
 * an envelope to write — so a change to what the corpus page
 * NARROWS, MASKS, CUTS or ORDERS belongs one file over, and the
 * cases that pin those rules still need no server.
 *
 * READ-ONLY IS STRUCTURAL AND NOT OBSERVED HERE. This file
 * registers `get` and no other verb, and the store it is handed is
 * {@link DocumentsServiceStore} — three reads, with no writer of a
 * `documents` row anywhere on it, because `./store.ts` declares
 * none for any caller to reach. So a re-parse button cannot be
 * added to this router by a small edit: there would be nothing for
 * it to call. `Read-first` in `docs/architecture/08-http-api.md`
 * states that rule once for the whole wave, and
 * `tests/invariants/api-read-first.test.ts` derives it from `keyof`
 * over the port types rather than from any paragraph here.
 *
 * ONE PATH SHAPE, BECAUSE A RAW DOCUMENT IS MET IN ITS DOMAIN AND
 * ADDRESSED NOWHERE ELSE. The collection hangs off `/domains/:slug`
 * for the reason the findings list does: a corpus is what a
 * domain's polls brought in, and a caller holding a slug should not
 * have to look an id up to read one. There is no `GET
 * /documents/:id` beside it and no route on this router that takes
 * an `:id` at all — so the `/documents` prefix
 * `docs/architecture/08-http-api.md` tabulates is claimed against
 * the framework and the earlier waves rather than taken, and a
 * document addressed by its own id is a path that stays free.
 *
 * A SECOND ROUTER OVER A TABLE THIS ONE SHARES. `GET
 * /sources/:id/failures` in `src/sources/failures-routes.ts` reads
 * the same `documents` rows and writes none of them either, and the
 * two are two collections rather than one with a parameter: that
 * one is one SOURCE's failures worked from the top, this one is one
 * DOMAIN's corpus whatever its status and whatever it arrived
 * through. The rows that only this route can answer are the ones
 * that came through no feed — an ingested file, a pasted body —
 * which a queue keyed on `source_id` structurally cannot hold.
 * `./store.ts` draws that split through the port and
 * `./service.ts` through the rules.
 *
 * THE QUERY IS PARSED BY A SCHEMA THIS FILE DOES NOT DECLARE.
 * {@link documentListQuerySchema} is exported from `./service.ts`,
 * which is where the wave-3 groups keep theirs and where the
 * wave-1 and wave-2 groups kept theirs private in a router. What
 * that buys is a boundary a caller can be refused at from more than
 * one direction: `./service.test.ts` drives the over-cap `?perPage`
 * and the status outside the tuple through the same declaration
 * this handler parses with, and an MCP tool over the same read
 * parses through it rather than restating it. This file names the
 * schema and adds nothing to it — no second bound, no second
 * status check, and no default of its own.
 *
 * THE FILTER IS REBUILT RATHER THAN FORWARDED, for the reason the
 * findings list gives about its own two narrowings: what a caller
 * ASKED FOR and what a port NARROWS ON are different statements. A
 * parsed query handed over whole would put `?page` on the far side
 * of a boundary that has no use for it, and would make a parameter
 * added to the wire reach the port with nothing edited.
 * {@link DocumentFilter} is built member by member below, so a
 * second narrowing is an edit here as well as there.
 *
 * THE ORDER, THE MASKING AND THE CUT ARE ANSWERED, NOT CHOSEN HERE.
 * The page arrives `capturedAt` descending with `id` descending
 * breaking a tie, which is the port's rule; the bodies arrive cut
 * to `BODY_CODE_POINT_CAP` code points and masked, and the parse
 * errors masked, which is the service's. Nothing below re-sorts a
 * page it was handed or trims a string it was given: a handler
 * sorting again would be answering a different order from the one
 * the window was taken under, which is exactly how two pages come
 * to disagree about which row they hold, and a handler trimming
 * again would be a second cap nobody would notice drifting from the
 * first.
 *
 * THE QUERY IS READ BEFORE THE ADDRESS, as it is on every paginated
 * list route on this surface. Both faults are facts about the
 * request alone and neither costs a read, so the ordering shows
 * only when a request gets both wrong — and a window this surface
 * will not serve is the half a caller can fix without knowing
 * anything about what is stored.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a `NotFoundError` raised in the service is a 404
 * carrying `{ code: 'NOT_FOUND', message }` on the wire and a
 * `ValidationError` raised by the boundary parser is a 422 carrying
 * its sanitised `details`, with no line of this file involved in
 * either.
 *
 * THE ROWS ARE ANSWERED AS THE SERVICE ANSWERED THEM. `okPage()`
 * carries its argument by reference and reshapes nothing, which is
 * that function's stated contract, so what {@link listDocuments}
 * built is what `JSON.stringify` sees. One conversion is the
 * framework's rather than this file's: `capturedAt` is a `Date`
 * across the service and reaches the wire as an ISO-8601 string,
 * because `res.json` serialises through `Date#toJSON`. Nothing is
 * added, hidden or renamed on the way out — and nothing is masked
 * on the way out either, the masking having happened one file over,
 * on the stored text rather than on the rendering.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. A `/domains` mount would put `/domains/:slug` in one
 * file and `/domains/:slug/documents` in this one. The argument is
 * in `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here, and the one route below reads no
 * body at all: a `GET` carrying one is answered exactly as one that
 * did not.
 */
import type { DocumentsServiceStore } from './service.js';
import type { DocumentFilter } from './store.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, okPage } from '../http/envelope.js';
import { slugParamSchema, toStoreWindow } from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import { documentListQuerySchema, listDocuments } from './service.js';

/**
 * The `:slug` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from the findings router or
 * from a wave-1 one, where the identical const is private. The
 * routers are equal by intent rather than by derivation: exporting
 * one router's address schema would make that agreement look like a
 * dependency, and the day a group needs a second path parameter it
 * would be editing a symbol every other router reads.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared, so the only field a detail built from this parse
 * can name is `slug`.
 */
const domainAddressSchema = z.object({ slug: slugParamSchema }).strict();

/** Everything {@link buildDocumentsRouter} needs. */
export interface DocumentsRouterOptions {
  /**
   * Where the domain is resolved and its corpus is read.
   *
   * `DocumentsServiceStore` and not `DocumentStore` whole, and not
   * `DomainStore` at all: it is the `Pick` pair `./service.ts`
   * declares, so this router asks for the three reads that module
   * reaches and `tests/helpers/memory-research-store.ts` can stand
   * behind it with no database up.
   *
   * TWO OF THE THREE ARE EVERY METHOD `DocumentStore` HAS, and that
   * is not a narrowing dressed up as one. A method added to that
   * port — which `./store.ts` argues would have to be another read
   * — stays off this router's surface until somebody names it in
   * the service too, and the `Pick` is what makes that an edit
   * rather than an inheritance.
   *
   * NO WRITER IS AMONG THEM, and there is none to be among them:
   * `DocumentStore` declares two methods and both are reads. That
   * is this router's read-only claim written as a type rather than
   * as a promise — no handler below could write a `documents` row,
   * re-file a `parse_status` or clear a `parse_error` even by
   * accident, there being nothing on the store to call.
   *
   * NO CLOCK SITS BESIDE IT. Nothing on this route reads the
   * present: a capture instant is what the pipeline stamped, and
   * the window is a window over stored rows.
   */
  readonly store: DocumentsServiceStore;
}

/**
 * Reads the `:slug` a request addressed a domain by.
 *
 * @param params - `req.params`. Typed `unknown` on purpose: Express
 *   types it as a record of strings, and a boundary that trusts its
 *   own framework's typing is not one.
 * @returns The slug, narrowed by `slugParamSchema` in
 *   `src/http/schemas.ts`.
 * @throws ValidationError - When the segment is not a slug. A 422
 *   whose one detail names `slug`.
 *
 * @remarks
 * A 422 and not a 404: a 404 says no domain carries the slug, which
 * is a claim about the table, and a request that never named a
 * well-formed slug has not established that. The narrowing is
 * load-bearing rather than decorative — a route parameter reaches a
 * handler URL-DECODED, so `%2F` arrives as a real `/`, and only a
 * pattern refuses it.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link domainAddressSchema}.
 */
function readSlug(params: unknown): string {
  return parseBody(domainAddressSchema, params).slug;
}

/**
 * Builds the documents router.
 *
 * @param options - The store to act against; see
 *   {@link DocumentsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so this is the wire path:
 *
 * - `GET /domains/:slug/documents` — one page of the domain's
 *   corpus, `capturedAt` descending with `id` descending breaking a
 *   tie. `200` with `{ success: true, data: [...], meta }`, where
 *   `meta` is `{ page, perPage, total, totalPages }` and `total`
 *   counts what the same FILTER selects rather than what the domain
 *   holds. Each row carries the stored `sourceId` and `url`, the
 *   body cut to a code-point cap and masked, the STORED byte length
 *   as `bodyBytes`, a `bodyTruncated` flag, the `parseStatus` as
 *   stored, the masked `parseError` and `capturedAt`. `404` with
 *   `code: 'NOT_FOUND'` when no domain carries the slug, which is
 *   what tells a mistyped slug from a domain whose first poll has
 *   not run. `422` when the segment is not a slug, for a
 *   `?parseStatus` outside `DOCUMENT_PARSE_STATUSES`, for a `?page`
 *   below 1, a `?perPage` above 200, a non-integer in either, or
 *   any undeclared query parameter — the last of those naming
 *   `query` rather than the parameter. A domain that has captured
 *   nothing, a status no document carries and a page past the end
 *   are each `200` with an empty `data`.
 *
 * THE DEFAULT PAGE CARRIES BOTH PARSE STATUSES. `?parseStatus`
 * narrows and there is no spelling here that widens, because an
 * absent parameter is already both: a failed document is IN the
 * corpus rather than behind a flag, which is fail-flag-keep, the
 * rule `src/db/schema/documents.ts` records at the column.
 * `docs/architecture/08-http-api.md` argues why a default that hid
 * them would make this page agree with every other reader precisely
 * where an operator is looking for the disagreement.
 *
 * ONE VERB AND NO OTHER. This router registers no `post`, `patch`,
 * `put` or `delete`, and the store it holds declares no writer of a
 * `documents` row, so the read-only rule is two shapes rather than
 * an observance. `./routes.test.ts` reads the second of them
 * structurally rather than by a request, classifying the port's
 * method names and signatures against a write vocabulary; the
 * first is visible in this file, where a second verb would be a
 * line a reader sees.
 *
 * NEVER `409`. Nothing on this route decides on stored state beyond
 * whether the domain is there, so the only refusals it can answer
 * are the `404` about the address and the `422` about the request.
 *
 * It can also answer `401` with `{ error: 'Unauthorized' }` — the
 * guard's own body, in neither envelope — because `src/index.ts`
 * mounts this router behind `ctx.requireAuth`.
 * `docs/architecture/08-http-api.md` tabulates that answer beside
 * the three other framework-shaped ones.
 */
export function buildDocumentsRouter(
  options: DocumentsRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /domains/:slug/documents
   *
   * One page of what a domain's polls captured, whatever became of
   * the parse.
   *
   * **Side effects:** none, and none reachable. Both document reads
   * behind this handler are reads, and no method on the store it
   * holds can write the table they read.
   *
   * The query is parsed before anything else, so an over-cap
   * `?perPage` or a `?parseStatus` outside the tuple costs no read
   * and is answered about the parameter the caller typed.
   * `toStoreWindow` owns the `(page - 1) * perPage` arithmetic and
   * `buildPaginationMeta` derives `totalPages`, so the two numbers
   * a client pages by are computed in one place each and this
   * handler does no arithmetic of its own.
   *
   * The filter is rebuilt as a {@link DocumentFilter} rather than
   * passed as the parsed query, because the two are different
   * statements: one is what a caller asked for, the other is what
   * the port narrows on. An absent `?parseStatus` reaches the store
   * as an absent member, which is what that port reads as both
   * members of the set.
   *
   * `meta` echoes the window that was ASKED FOR rather than the
   * rows that came back: `?page=99` over a one-page corpus answers
   * `page: 99` beside `totalPages: 1`, which is how a caller sees
   * that it overshot.
   */
  router.get('/domains/:slug/documents', async (req, res) => {
    const query = parseQuery(documentListQuerySchema, req.query);
    const slug = readSlug(req.params);
    const filter: DocumentFilter = { parseStatus: query.parseStatus };
    const page = await listDocuments(
      options.store,
      slug,
      filter,
      toStoreWindow(query),
    );
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  return router;
}
