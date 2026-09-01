/**
 * @packageDocumentation
 * The HTTP surface over `src/sources/failures-service.ts`: ONE
 * route, and nothing in it that decides anything.
 *
 * `GET /sources/:id/failures` is {@link listSourceFailures}. What
 * the handler adds over the call it wraps is an address to read, a
 * window to derive, a status to choose and an envelope to write —
 * so a change to what the queue MASKS, CUTS or ORDERS belongs one
 * file over, and the cases that pin those rules still need no
 * server.
 *
 * A ROUTER OF ITS OWN UNDER A PREFIX ANOTHER ROUTER OWNS. The four
 * routes over a `sources` row are `./routes.ts`, and this queue is
 * not a fifth: its subject is a `documents` row captured through a
 * source, which is the same split `./store.ts` draws through the
 * port and `./failures-service.ts` draws through the rules. Express
 * matches across mounted routers rather than within one, so two
 * routers under `/sources/:id` is an ordinary mount rather than a
 * trick — `src/index.ts` mounts both behind `ctx.requireAuth`, and
 * `docs/architecture/08-http-api.md` tabulates them together.
 *
 * READ-ONLY IS STRUCTURAL AND NOT OBSERVED HERE. This file
 * registers `get` and no other verb, and the store it is handed is
 * {@link SourceFailuresServiceStore} — three reads, no writer of a
 * `documents` row anywhere on it. So a retry button cannot be added
 * to this router by a small edit: there would be nothing for it to
 * call. Re-running a failed capture is a pipeline operation with a
 * cost and a dedupe question attached, and
 * `docs/architecture/08-http-api.md` states why a review surface
 * that could also re-run work would be a second schedule trigger.
 *
 * THE ORDER AND THE CAP ARE ANSWERED, NOT CHOSEN HERE. The page
 * arrives `capturedAt` descending with `id` descending breaking a
 * tie, which is the port's rule; the bodies arrive cut to
 * `BODY_CODE_POINT_CAP` code points and masked, which is the
 * service's. Nothing below re-sorts a page it was handed or trims a
 * string it was given: a handler sorting again would be answering a
 * different order from the one the window was taken under, which is
 * exactly how two pages come to disagree about which row they hold.
 *
 * NO ROUTE HERE TAKES A `:slug`, which is where this file differs
 * in SHAPE from `./routes.ts`. A queue is met through the source
 * that captured it, and the source carries its own `domainId` — so
 * there is no second address for a request to name and no
 * disagreement between two addresses for this router to answer for.
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
 * reaches it — so a {@link NotFoundError} raised in the service is
 * a 404 carrying `{ code: 'NOT_FOUND', message }` on the wire and a
 * `ValidationError` raised by the boundary parser is a 422 carrying
 * its sanitised `details`, with no line of this file involved in
 * either.
 *
 * THE ROWS ARE ANSWERED AS THE SERVICE ANSWERED THEM. `okPage()`
 * carries its argument by reference and reshapes nothing, which is
 * that function's stated contract, so what
 * {@link listSourceFailures} built is what `JSON.stringify` sees.
 * One conversion is the framework's rather than this file's:
 * `capturedAt` is a `Date` across the service and reaches the wire
 * as an ISO-8601 string, because `res.json` serialises through
 * `Date#toJSON`. Nothing is added, hidden or renamed on the way
 * out.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. The argument is in
 * `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here, and no route below reads a body
 * at all: a `GET` carrying one is answered exactly as one that did
 * not.
 */
import type { SourceFailuresServiceStore } from './failures-service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, okPage } from '../http/envelope.js';
import {
  paginationQuerySchema,
  resourceIdParamSchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import { listSourceFailures } from './failures-service.js';

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from `./routes.ts`, where the
 * identical const is private. The two routers are equal by intent
 * rather than by derivation: exporting one router's address schema
 * would make that agreement look like a dependency, and the day
 * either grows a second path parameter it would be editing a symbol
 * the other reads.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and `sources.id` is `bigserial` in drizzle's `number`
 * mode. What reaches {@link listSourceFailures} is therefore the
 * `number` its signature takes, narrowed at the boundary rather
 * than inside the rules.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared, so the only field a detail built from this parse
 * can name is `id`.
 */
const sourceAddressSchema = z.object({ id: resourceIdParamSchema }).strict();

/** Everything {@link buildSourceFailuresRouter} needs. */
export interface SourceFailuresRouterOptions {
  /**
   * Where the source is resolved and its failed captures are read.
   *
   * `SourceFailuresServiceStore` and not `SourceStore` whole: it is
   * the `Pick` the service declares, so this router asks for the
   * three reads that module reaches and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * SIX OF THE NINE PORT METHODS ARE ABSENT, and the absence is
   * this router's read-only claim written as a type rather than as
   * a promise. Every write on `SourceStore` belongs to the router
   * beside this one, so no handler here could reach a `documents`
   * row or a `sources` one even by accident.
   *
   * NO CLOCK SITS BESIDE IT. Nothing on this route reads the
   * present: a capture instant is what the pipeline stamped, and
   * the window is a window over stored rows.
   */
  readonly store: SourceFailuresServiceStore;
}

/**
 * Reads the `:id` a request addressed a source by.
 *
 * @param params - `req.params`. Typed `unknown` on purpose: Express
 *   types it as a record of strings, and a boundary that trusts its
 *   own framework's typing is not one.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `GET /sources/abc/failures` is a 422 raised before any store call
 * rather than the 404 an uncoerced lookup would eventually answer,
 * and the distinction is the whole reason this runs first: a 404
 * says no source carries that id, which is a claim about the table,
 * and `abc` is not an id for the table to have been asked about.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link sourceAddressSchema}.
 */
function readId(params: unknown): number {
  return parseBody(sourceAddressSchema, params).id;
}

/**
 * Builds the source failures router.
 *
 * @param options - The store to act against; see
 *   {@link SourceFailuresRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so this is the wire path:
 *
 * - `GET /sources/:id/failures` — one page of the source's failed
 *   captures, `capturedAt` descending with `id` descending breaking
 *   a tie. `200` with `{ success: true, data: [...], meta }`, where
 *   `meta` is `{ page, perPage, total, totalPages }` and `total`
 *   counts the whole queue rather than the page. Each row carries
 *   the stored `url`, the body cut to a code-point cap and masked,
 *   the STORED byte length as `bodyBytes`, a `bodyTruncated` flag,
 *   the masked `parseError` and `capturedAt`. `404` with
 *   `code: 'NOT_FOUND'` when no source carries the id, which is
 *   what tells a mistyped id from a feed that has never broken.
 *   `422` when the segment is not an id, for a `?page` below 1, a
 *   `?perPage` above 200, a non-integer in either, or any
 *   undeclared query parameter — the last of those naming `query`
 *   rather than the parameter. A page past the end of the queue is
 *   `200` with an empty `data` and not a `404`, exactly as a source
 *   whose captures all parsed is.
 *
 * ONE VERB AND NO OTHER. This router registers no `post`, `patch`,
 * `put` or `delete`, and the store it holds declares no writer of a
 * `documents` row, so the read-only rule is two shapes rather than
 * an observance. Both are read structurally in
 * `./failures-routes.test.ts` and neither by a request: the route
 * inventory comes off this router's own `stack`, and the port's
 * method names and signatures are classified there against a
 * document vocabulary. Registering this handler as a `post` instead
 * reddens nine of that file's twelve cases and registering a SECOND
 * `post` beside it reddens exactly one — the first is the fixture
 * reporting, the second is the claim.
 *
 * NEVER `409`. Nothing on this route decides on stored state beyond
 * whether the source is there, so the only refusals it can answer
 * are the `404` about the address and the `422` about the request.
 *
 * It can also answer `401` with `{ error: 'Unauthorized' }` — the
 * guard's own body, in neither envelope — because `src/index.ts`
 * mounts this router behind `ctx.requireAuth`.
 * `docs/architecture/08-http-api.md` tabulates that answer beside
 * the three other framework-shaped ones.
 */
export function buildSourceFailuresRouter(
  options: SourceFailuresRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /sources/:id/failures
   *
   * One page of what a source captured and could not parse.
   *
   * **Side effects:** none, and none reachable. Both document reads
   * behind this handler are reads, and no method on the store it
   * holds can write the table they read.
   *
   * The window is parsed before anything else, so an over-cap
   * `?perPage` costs no read and is answered about the parameter
   * the caller typed. `toStoreWindow` owns the
   * `(page - 1) * perPage` arithmetic and `buildPaginationMeta`
   * derives `totalPages`, so the two numbers a client pages by are
   * computed in one place each and this handler does no arithmetic
   * of its own.
   *
   * `meta` echoes the window that was ASKED FOR rather than the
   * rows that came back: `?page=99` over a one-page queue answers
   * `page: 99` beside `totalPages: 1`, which is how a caller sees
   * that it overshot.
   */
  router.get('/sources/:id/failures', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const id = readId(req.params);
    const window = toStoreWindow(query);
    const page = await listSourceFailures(options.store, id, window);
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  return router;
}
