/**
 * @packageDocumentation
 * The HTTP surface over `src/findings/service.ts`: TWO routes, and
 * nothing in them that decides anything.
 *
 * `GET /domains/:slug/findings` is {@link listFindings} and
 * `GET /findings/:id` is {@link getFinding}. What a handler adds
 * over the call it wraps is an address to read, a query to take
 * apart, a status to choose and an envelope to write — so a change
 * to what the findings surface NARROWS, ORDERS or EMBEDS belongs
 * one file over, and the cases that pin those rules still need no
 * server.
 *
 * READ-ONLY IS STRUCTURAL AND NOT OBSERVED HERE. This file
 * registers `get` and no other verb, and the store it is handed is
 * {@link FindingsServiceStore} — six reads, and no writer of any of
 * the four findings tables anywhere on it. So a re-score button
 * cannot be added to this router by a small edit: there would be
 * nothing for it to call. `Read-first` in
 * `docs/architecture/08-http-api.md` states that rule once for the
 * whole wave, and names the small edit it exists to stop.
 *
 * THE RULING IS NOT ON THIS ROUTER YET AND WILL BE. The prefix
 * table in that same document lists `PATCH /findings/:id/verdict`
 * under this builder, and its rules live in `./verdict-service.ts`
 * beside the two reads' own module. It is absent here rather than
 * elsewhere, and the absence is visible in the OPTIONS type: the
 * store below cannot reach `insertFindingLabel`, so declaring the
 * route means widening what this router asks for, which is a change
 * a reader sees rather than one that hides in a handler.
 *
 * TWO PATH SHAPES, BECAUSE A FINDING IS MET IN ITS DOMAIN AND READ
 * BY ITS ID. The collection hangs off `/domains/:slug`, since a
 * finding is what a domain's criteria produced and a caller holding
 * a slug should not have to look an id up to read one. The single
 * get addresses `/findings/:id` instead: the row carries its own
 * `domainId`, no rule on this table spans a domain, and repeating
 * the slug in the path would let a request name a domain the row
 * does not belong to, a disagreement this router would then have to
 * answer for. `docs/architecture/08-http-api.md` records that split
 * beside the rest of the surface.
 *
 * THE QUERY IS PARSED ONCE AND SPLIT THREE WAYS. One
 * `findingListQuerySchema` parse answers for the window over time,
 * the window over the collection and the ordering, and the handler
 * hands each to the parameter that takes it: a
 * {@link FindingFilter} rebuilt as the port's own value object, a
 * `StoreWindow` derived by `toStoreWindow`, and the sort key passed
 * through. The filter is REBUILT rather than forwarded, for the
 * reason `GET /connectors` gives about its `?kind`: what a caller
 * asked for and what a port narrows on are different statements,
 * and a query object forwarded whole would put `?page` on the far
 * side of a boundary that has no use for it.
 *
 * NOTHING HERE RE-SORTS, RE-COUNTS OR RE-CHECKS A BOUND. The page
 * arrives in the order the sort key names, which is the store's
 * rule; the inverted window and the over-cap `perPage` are refused
 * by the schema one file over. A handler sorting again would be
 * answering a different order from the one the window was taken
 * under, which is exactly how two pages come to disagree about
 * which row they hold, and a second bound check here would be a
 * second rule nobody would notice drifting from the first.
 *
 * THE QUERY IS READ BEFORE THE ADDRESS ON THE LIST, as it is on
 * every paginated list route on this surface. Both faults are facts
 * about the request alone and neither costs a read, so the ordering
 * shows only when a request gets both wrong — and a window this
 * surface will not serve is the half a caller can fix without
 * knowing anything about what is stored.
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
 * THE ROWS ARE ANSWERED AS THE PORT ANSWERED THEM. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * which is those functions' stated contract, so what a store
 * projected is what `JSON.stringify` sees. The conversions a client
 * should know about are the framework's rather than this file's:
 * `createdAt`, `seenAt`, `labelledAt` and `researchedAt` are `Date`
 * across the port and reach the wire as ISO-8601 strings, because
 * `res.json` serialises through `Date#toJSON`; `fields` and a
 * research row's `payload` are whatever jsonb held, answered whole.
 * Nothing is added, hidden, cut or masked on the way out, and
 * `src/findings/service.ts` records why this surface masks where
 * the failures queue and the documents list do not.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. A `/domains` mount would put `/domains/:slug` in one
 * file and `/domains/:slug/findings` in this one. The argument is
 * in `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here, and neither route below reads a
 * body at all: a `GET` carrying one is answered exactly as one that
 * did not.
 */
import type { FindingsServiceStore } from './service.js';
import type { FindingFilter } from './store.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, ok, okPage } from '../http/envelope.js';
import {
  resourceIdParamSchema,
  slugParamSchema,
  toStoreWindow,
  toTimeWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import {
  findingListQuerySchema,
  getFinding,
  listFindings,
} from './service.js';

/**
 * The `:slug` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from a wave-1 or wave-2
 * router, where the identical const is private. The routers are
 * equal by intent rather than by derivation: exporting one router's
 * address schema would make that agreement look like a dependency,
 * and the day a group needs a second path parameter it would be
 * editing a symbol every other router reads.
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
 * a string and `findings.id` is `bigserial` in drizzle's `number`
 * mode. What reaches {@link getFinding} is therefore the `number`
 * its signature takes, narrowed at the boundary rather than inside
 * the rules.
 *
 * `.strict()` on the same terms as {@link domainAddressSchema}, and
 * it can never fire here for the same reason.
 */
const findingAddressSchema = z
  .object({ id: resourceIdParamSchema })
  .strict();

/** Everything {@link buildFindingsRouter} needs. */
export interface FindingsRouterOptions {
  /**
   * Where the domain is resolved and its findings are read.
   *
   * `FindingsServiceStore` and not either port whole: it is the
   * intersection of the two `Pick`s `src/findings/service.ts`
   * declares, so this router asks for the six reads that module
   * reaches and `tests/helpers/memory-research-store.ts` can stand
   * behind it with no database up.
   *
   * `insertFindingLabel` IS THE ONE `FindingStore` METHOD ABSENT,
   * and the absence is this router's read-only claim written as a
   * type rather than as a promise. No handler below could append a
   * ruling, re-score a finding or reach a `findings` row even by
   * accident, there being nothing on the store to call.
   *
   * NO CLOCK SITS BESIDE IT. Nothing on either route reads the
   * present: a finding's `createdAt` is what the scoring pass
   * stamped, and the window is a window over stored rows.
   */
  readonly store: FindingsServiceStore;
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
 * Reads the `:id` a request addressed a finding by.
 *
 * @param params - `req.params`, unknown for the reason
 *   {@link readSlug} gives.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `GET /findings/abc` is a 422 raised before any store call rather
 * than the 404 an uncoerced lookup would eventually answer, and the
 * distinction is the whole reason this runs first: a 404 says no
 * finding carries that id, which is a claim about the table, and
 * `abc` is not an id for the table to have been asked about.
 */
function readId(params: unknown): number {
  return parseBody(findingAddressSchema, params).id;
}

/**
 * Builds the findings router.
 *
 * @param options - The store to act against; see
 *   {@link FindingsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /domains/:slug/findings` — one page of the domain's
 *   findings, in the ordering `?sort` names and in the digest's own
 *   where it names none. `200` with
 *   `{ success: true, data: [...], meta }`, where `meta` is
 *   `{ page, perPage, total, totalPages }` and `total` counts what
 *   the same FILTER selects rather than what the domain holds.
 *   `404` with `code: 'NOT_FOUND'` when no domain carries the slug,
 *   which is what tells a mistyped slug from a domain whose scoring
 *   pass has produced nothing. `422` when the segment is not a
 *   slug, for an unparseable `?since` or `?until`, for a `?since`
 *   at or after its `?until`, for a `?sort` outside the two
 *   declared keys, for a `?page` below 1, a `?perPage` above 200, a
 *   non-integer in either, or any undeclared query parameter — the
 *   last of those naming `query` rather than the parameter. A
 *   `?verdict` no label carries, a `?category` the domain never
 *   declared, a span in which nothing was found and a page past the
 *   end are each `200` with an empty `data`.
 * - `GET /findings/:id` — one finding and the three collections
 *   hanging off it. `200` with `{ success: true, data }` carrying
 *   `finding`, its `sightings`, its `labels` newest first and the
 *   `research` recorded about the entity it names. `404` when no
 *   finding carries the id, `422` for a segment that is not one.
 *   Reads no query at all, so there is no window to get wrong: the
 *   three lists are embedded whole rather than paged.
 *
 * THE TWO NARROWINGS REFUSE NO VALUE, which is the port's decision
 * rather than this router's. `?verdict` and `?category` are strings
 * with no length rule and no union behind them: a domain's verdict
 * ladder is a per-domain setting a domain is free to retire from,
 * and a category key is whatever an operator declared. Both are
 * answered as an empty page rather than as a refusal, so this
 * surface never tells a caller that a value it filtered on does not
 * exist — which would be a claim about the taxonomy in force at the
 * moment of the request rather than about the rows.
 *
 * NEVER `409`. Neither route decides on stored state beyond whether
 * the domain and the finding are there, so the only refusals either
 * can answer are the `404` about the address and the `422` about
 * the request.
 *
 * Both of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildFindingsRouter(
  options: FindingsRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /domains/:slug/findings
   *
   * One page of what a domain's criteria produced.
   *
   * **Side effects:** none, and none reachable. All three port
   * methods behind this handler are reads, and no method on the
   * store it holds can write the tables they read.
   *
   * The query is parsed before anything else, so an inverted window
   * or an over-cap `?perPage` costs no read and is answered about
   * the parameter the caller typed. `toTimeWindow` turns the two
   * stamps into the half-open bounds the port takes,
   * `toStoreWindow` owns the `(page - 1) * perPage` arithmetic and
   * `buildPaginationMeta` derives `totalPages`, so each of the
   * three numbers a client reads is computed in one place and this
   * handler does no arithmetic of its own.
   *
   * The filter is rebuilt as a {@link FindingFilter} rather than
   * passed as the parsed query, because the two are different
   * statements: one is what a caller asked for, the other is what
   * the port narrows on. An absent `?verdict` or `?category`
   * reaches the store as an absent member, which is what that port
   * reads as every verdict and every category; an absent bound
   * reaches it as `null`, which is what `toTimeWindow` answers and
   * what the port reads as unbounded.
   *
   * The sort travels BESIDE the filter rather than inside it,
   * because `countFindings` takes no ordering: an ordering cannot
   * change how many rows a predicate selects, and a count that took
   * one would be inviting a page and its total to be read through
   * two different questions.
   *
   * `meta` echoes the window that was ASKED FOR rather than the
   * rows that came back: `?page=99` over a one-page collection
   * answers `page: 99` beside `totalPages: 1`, which is how a
   * caller sees that it overshot.
   */
  router.get('/domains/:slug/findings', async (req, res) => {
    const query = parseQuery(findingListQuerySchema, req.query);
    const slug = readSlug(req.params);
    const filter: FindingFilter = {
      category: query.category,
      verdict: query.verdict,
      window: toTimeWindow(query),
    };
    const page = await listFindings(
      options.store,
      slug,
      filter,
      query.sort,
      toStoreWindow(query),
    );
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * GET /findings/:id
   *
   * One finding, its sightings, its rulings and its entity's
   * research.
   *
   * **Side effects:** none, and none reachable, per the list above.
   *
   * `ok()` rather than `okPage()`, because what is answered is one
   * finding rather than a window over a collection. The three lists
   * inside it carry no `meta` of their own: they are embedded in
   * one finding's answer rather than paged, so there is no `?page`
   * for a caller to send and no total for a window to be read
   * against.
   *
   * An empty list is a state rather than a gap, and all three can
   * be empty at once. A finding nobody has judged, one no feed has
   * cited again and one attributed to no entity each answer `200`
   * with an empty list in that position, which is what lets a
   * client tell them apart from a finding it failed to read.
   */
  router.get('/findings/:id', async (req, res) => {
    const detail = await getFinding(options.store, readId(req.params));

    res.status(200).json(ok(detail));
  });

  return router;
}
