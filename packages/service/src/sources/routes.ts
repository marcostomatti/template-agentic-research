/**
 * @packageDocumentation
 * The HTTP surface over `src/sources/service.ts`: four routes, and
 * nothing in them that decides anything.
 *
 * `GET /domains/:slug/sources` is {@link listSources},
 * `POST /domains/:slug/sources` is {@link createSource},
 * `PATCH /sources/:id` is {@link patchSource} and
 * `DELETE /sources/:id` is {@link deleteSource}. What a handler
 * adds over the call it wraps is an address to read, a window to
 * derive, a status to choose and an envelope to write — so a
 * change to a source RULE belongs one file over, and the cases
 * that pin those rules still need no server.
 *
 * FOUR ROUTES AND NOT FIVE. `GET /sources/:id/failures` shares
 * this prefix and is NOT declared here: it belongs to
 * `./failures-routes.ts` over `./failures-service.ts`, because its
 * subject is a `documents` row rather than a `sources` one. Two
 * routers under one prefix is what `src/index.ts` mounts and what
 * `docs/architecture/08-http-api.md` tabulates, and the split is
 * the same one `./store.ts` draws through the port.
 *
 * NO SCHEDULE VERB IS DECLARED HERE, which is where this file
 * differs in SHAPE from `src/topics/routes.ts` rather than in
 * subject. `sources` spreads no `schedulableColumns()` and carries
 * no `next_run_at` at all — a feed is read when the topic that
 * needs it comes due — so there is no due time for a run-now to
 * bring forward and no cycle for a pause to count. This router
 * takes no clock for the same reason: nothing on it reads the
 * present.
 *
 * TWO PATH SHAPES, BECAUSE A SOURCE IS MET IN ITS DOMAIN AND
 * WRITTEN BY ITS ID. The collection hangs off `/domains/:slug`,
 * since a source is a feed a domain reads and a caller holding a
 * slug should not have to look an id up to list one. The two
 * writes address `/sources/:id` instead: the row carries its own
 * `domainId`, no rule on this table spans a domain at all, and
 * repeating the slug in the path would let a request name a domain
 * the row does not belong to, a disagreement this router would
 * then have to answer for. `docs/architecture/08-http-api.md`
 * records that split beside the rest of the surface.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in the wave-1 routers
 * and for the same reason. {@link createSource} and
 * {@link patchSource} take an `unknown` and parse it themselves,
 * because wave 3 exposes those same functions as MCP tools and a
 * body validated by the router would leave that caller validating
 * against a second schema nobody would notice drifting. That is
 * also what keeps the `openPaths` argument — the two prefixes
 * below which a key is the operator's own — in the service that
 * declares the schemas rather than in a handler.
 *
 * THIS LIST ROUTE IS PAGINATED, which is where it follows
 * `GET /domains/:slug/personas` rather than
 * `GET /domains/:slug/categories`. Nothing caps how many feeds a
 * domain may read, and a collection that grows unbounded is one a
 * caller should be paging through before it has to.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON A PATCH, and NOT on
 * a create — which is the service's ordering rather than this
 * file's, and is worth naming here because the two routes look
 * symmetric. {@link patchSource} is handed an id this file has
 * already narrowed, so a `PATCH /sources/abc` carrying a malformed
 * body is answered about the segment. {@link createSource} parses
 * its body before it resolves the slug, so a `POST` carrying both
 * an unroutable slug and a malformed body is answered about the
 * body: a body's shape is a fact about the request alone, and
 * answering it a 422 or a 404 depending on what happens to be
 * stored would make a caller's error depend on rows it never asked
 * about.
 *
 * THE QUERY IS READ BEFORE THE ADDRESS ON THE LIST, as it is on
 * every paginated list route here. Both faults are facts about the
 * request alone and neither costs a read, so the ordering shows
 * only when a request gets both wrong — and a window this surface
 * will not serve is the half a caller can fix without knowing
 * anything about what is stored.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a {@link NotFoundError} raised in the service is
 * a 404 carrying `{ code: 'NOT_FOUND', message }` on the wire, a
 * delete the corpus refuses is a 409 carrying its two counts in
 * `details`, and a `ValidationError` raised by the boundary parser
 * is a 422 carrying its sanitised `details`, with no line of this
 * file involved in any of them.
 *
 * THE RECORD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * which is those functions' stated contract, so what a store
 * projected is what `JSON.stringify` sees. Three conversions a
 * client should know about are the framework's rather than this
 * file's: `lastSuccessAt` and `lastFailureAt` are `Date` across the
 * port and reach the wire as ISO-8601 strings or as `null`, because
 * `res.json` serialises through `Date#toJSON`; and `parserConfig`
 * and `contract` are whatever jsonb held, answered whole. Nothing
 * is added, hidden or renamed on the way out; `SourceRecord` in
 * `./store.ts` records why the whole row is safe to answer with.
 *
 * THE FIVE PIPELINE-OWNED COLUMNS ARE ANSWERED AND NEVER ACCEPTED,
 * which is the surface-wide rule applied to the columns this table
 * carries for the pipeline. `cursor`, `consecutiveFailures`,
 * `lastSuccessAt`, `lastFailureAt` and `flagged` are projected on
 * every read here and refused as unrecognized keys by both request
 * schemas one file over, so an operator can read a feed's health
 * and cannot edit it. `enabled` is the operator's own column and IS
 * patchable — that is what retires a feed, and it is what the
 * delete's refusal names.
 *
 * THE LIST ANSWERS MORE THAN THE TABLE, and it is the only read on
 * this router that does. Each row carries a `parseStats` record
 * keyed by `DOCUMENT_PARSE_STATUSES`, counted by the store in one
 * grouped read over the whole page rather than one query per row.
 * A source that has captured nothing answers a counted zero under
 * every member. Nothing here assembles or fills that record: a gap
 * filled at this layer would be filled on this path alone and not
 * on the live one.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule. The string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository: a `/domains` mount would put `/domains/:slug` in one
 * file and `/domains/:slug/sources` in this one. The argument is in
 * `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas refuse
 * like any other bad shape.
 */
import type { SourceServiceStore } from './service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, ok, okPage } from '../http/envelope.js';
import {
  paginationQuerySchema,
  resourceIdParamSchema,
  slugParamSchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import {
  createSource,
  deleteSource,
  listSources,
  patchSource,
} from './service.js';

/**
 * The `:slug` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from a sibling router, where
 * the identical const is private. The routers are equal by intent
 * rather than by derivation: exporting one router's address schema
 * would make that agreement look like a dependency, and the day a
 * group needs a second path parameter it would be editing a symbol
 * every other router reads.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared, so the only field a detail built from this parse
 * can name is `slug`.
 */
const domainAddressSchema = z.object({ slug: slugParamSchema }).strict();

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and every id column in schema v2 is `bigserial` in
 * drizzle's `number` mode. What reaches {@link patchSource} and
 * {@link deleteSource} is therefore the `number` their signatures
 * take, narrowed at the boundary rather than inside the rules.
 */
const sourceAddressSchema = z.object({ id: resourceIdParamSchema }).strict();

/** Everything {@link buildSourcesRouter} needs. */
export interface SourcesRouterOptions {
  /**
   * Where the domain is resolved and its sources are read and
   * written. `SourceServiceStore` and not either port whole: it is
   * the intersection of the two `Pick`s the service declares, so
   * this router asks for the methods that module reaches and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * It names SIX of the nine source methods, and the three it
   * leaves out are the containment this file is handed rather than
   * one it enforces: `listSourceFailures` and `countSourceFailures`
   * belong to the failures router, so no handler below could serve
   * that queue even by accident, and `findSourceById` is absent
   * because nothing on this router decides on a stored member.
   *
   * NO CLOCK SITS BESIDE IT, unlike `TopicsRouterOptions`. Nothing
   * on this group reads the present: `sources` carries no
   * `next_run_at`, and every stamp on the row is the pipeline's to
   * write.
   */
  readonly store: SourceServiceStore;
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
 * A 422 and not a 404, for the reason {@link readId} gives about
 * the id: a 404 says the row is not there, and a request that never
 * named a row has not established that. The narrowing is
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
 * Reads the `:id` a request addressed a source by.
 *
 * @param params - `req.params`, unknown for the reason
 *   {@link readSlug} gives.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `PATCH /sources/abc` is a 422 raised before any store call rather
 * than the 404 an uncoerced lookup would eventually answer, and the
 * distinction is the whole reason this runs first: a 404 says no
 * source carries that id, which is a claim about the table, and
 * `abc` is not an id for the table to have been asked about.
 */
function readId(params: unknown): number {
  return parseBody(sourceAddressSchema, params).id;
}

/**
 * Builds the sources router.
 *
 * @param options - The store to act against; see
 *   {@link SourcesRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /domains/:slug/sources` — one page of the domain's
 *   sources, id ascending, each carrying its health columns and a
 *   `parseStats` record counted over `DOCUMENT_PARSE_STATUSES`.
 *   `200` with `{ success: true, data: [...], meta }`, where `meta`
 *   is `{ page, perPage, total, totalPages }`. `404` with
 *   `code: 'NOT_FOUND'` when no domain carries the slug, which is
 *   what tells a domain reading nothing from a domain that is not
 *   there. `422` when the segment is not a slug, for a `?page`
 *   below 1, a `?perPage` above 200, a non-integer in either, or
 *   any undeclared query parameter — the last of those naming
 *   `query` rather than the parameter. A page past the end of the
 *   collection is `200` with an empty `data` and not a `404`.
 * - `POST /domains/:slug/sources` — adds one source, NEVER
 *   FETCHED. `201` with `{ success: true, data }` carrying the
 *   stored row, the database's own id, a null `cursor`, zero
 *   `consecutiveFailures`, null stamps, a `flagged` of false and an
 *   `enabled` of true unless the body said otherwise. `422` for a
 *   body `createSourceSchema` refuses — a `kind` outside
 *   `SOURCE_KINDS`, an empty `endpoint`, or any of the five
 *   pipeline-owned columns — and for a segment that is not a slug;
 *   `404` for an unknown slug, and for a domain deleted between the
 *   lookup and the write. NEVER `409`: `sources` carries no unique
 *   key at all, so two rows naming one endpoint are ordinary and a
 *   double POST leaves two feeds rather than a refusal.
 * - `PATCH /sources/:id` — rewrites the supplied members. `200`
 *   with the stored row afterwards. `422` for a body
 *   `patchSourceSchema` refuses and for a segment that is not an
 *   id; `404` when no source carries the id. A patch carrying no
 *   member is a legal call answering the row unchanged, `kind` IS
 *   patchable because this table has no natural key to protect, and
 *   `domainId` is not, so no request here can move a feed between
 *   domains.
 * - `DELETE /sources/:id` — removes one. `204` with no body.
 *   `404` when no source carries the id, `422` for a segment that
 *   is not one. `409` with `code: 'CONFLICT'` while documents or
 *   sightings still cite the source, carrying both counts in
 *   `details` and naming `enabled: false` as the operation that was
 *   wanted; and `409` again, with NO `details`, when the write is
 *   refused by a key the guard does not count. There is no
 *   `?cascade=confirm` here and nothing for one to authorise.
 *
 * NO ROUTE HERE ANSWERS A DUPLICATE, which is the departure from
 * every other resource group on this surface. `sources` has no
 * unique constraint, so neither write can reach one and a `409` on
 * this router is only ever the delete's.
 *
 * THE FIVE PIPELINE-OWNED COLUMNS ARE ANSWERED BY ALL FOUR AND
 * ACCEPTED BY NONE. They are refused as unrecognized keys by both
 * request schemas, which is `.strict()` doing its ordinary work
 * rather than a check of its own — and what makes the refusal hold
 * for a column added later, since it has to be argued ONTO a
 * request schema rather than quietly inherited by one.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildSourcesRouter(
  options: SourcesRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /domains/:slug/sources
   *
   * One page of a domain's sources, each with what it has captured.
   *
   * **Side effects:** none. The parse-status aggregate is a read
   * across `documents` and writes nothing there — no method on the
   * port can.
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
   * rows that came back: `?page=99` over a one-page collection
   * answers `page: 99` beside `totalPages: 1`, which is how a
   * caller sees that it overshot.
   */
  router.get('/domains/:slug/sources', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const slug = readSlug(req.params);
    const window = toStoreWindow(query);
    const page = await listSources(options.store, slug, window);
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /domains/:slug/sources
   *
   * Adds one feed to a domain, never fetched.
   *
   * **Side effects:** writes one `sources` row.
   *
   * `201` rather than `200`, because the answer is a resource that
   * did not exist when the request was made. No `Location` header:
   * the created row travels in the body carrying the id the two
   * write routes address it by, so a header would restate what the
   * caller already has back.
   *
   * The row lands with an untouched history whatever was submitted
   * — no cursor, no failures, no stamps and unflagged — which is
   * `InsertSourceInput` carrying none of those members rather than
   * anything this handler does. Nothing is fetched: whether the
   * endpoint answers is discovered by the next pipeline pass.
   *
   * The body reaches {@link createSource} unparsed. That is the
   * module header's rule rather than an omission here.
   */
  router.post('/domains/:slug/sources', async (req, res) => {
    const slug = readSlug(req.params);
    const created = await createSource(options.store, slug, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * PATCH /sources/:id
   *
   * Rewrites the supplied members of one source.
   *
   * **Side effects:** writes one `sources` row, or none at all for
   * a patch carrying no member — `sources` has no `updated_at` for
   * an empty write to stamp, so answering the stored row without
   * writing is the port's declared contract rather than an
   * optimisation here.
   *
   * `200` with the row afterwards rather than `204`, because a
   * patch whose whole point is a rewrite has an answer worth
   * reading: the endpoint, the arrangement and the health as they
   * now stand, which is what an operator retuning a feed came to
   * see.
   *
   * The edit takes effect on the next pipeline pass and there is
   * nothing to announce afterwards: nothing between this port and
   * the query a pass issues at its own start keeps a copy, so there
   * is no cache to expire. RETIRING A FEED IS THIS ROUTE, through
   * `enabled: false`, which keeps the endpoint, the arrangement and
   * the corpus and stops the pipeline reading.
   */
  router.patch('/sources/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchSource(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /sources/:id
   *
   * Removes one source, while nothing it captured still cites it.
   *
   * **Side effects:** removes one `sources` row, or none — the
   * counts {@link deleteSource} reads first are a read, and the
   * refusal it raises leaves the row exactly where it was.
   *
   * `204` and no body on the way that lands, because a deleted
   * resource has no representation to carry. The two `409`s are
   * what this route has that no other delete on the wave-2 surface
   * does, and they are different facts: the counted one names the
   * documents and sightings holding the row, and the uncounted one
   * is a key the guard cannot count refusing at the database.
   *
   * NO CONFIRMATION GETS PAST EITHER, which is the difference from
   * `DELETE /domains/:slug` and is a decision about what each act
   * takes. A domain cascade takes the domain's own configuration;
   * this would take a corpus and the syndication evidence citing
   * it. So there is no `?cascade` on this route to parse, and the
   * refusal names `enabled: false` as the operation that was
   * wanted.
   */
  router.delete('/sources/:id', async (req, res) => {
    await deleteSource(options.store, readId(req.params));

    res.status(204).end();
  });

  return router;
}
