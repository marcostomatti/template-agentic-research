/**
 * @packageDocumentation
 * The HTTP surface over `src/findings/service.ts` and
 * `src/findings/verdict-service.ts`: THREE routes, and nothing in
 * them that decides anything.
 *
 * `GET /domains/:slug/findings` is {@link listFindings},
 * `GET /findings/:id` is {@link getFinding}, and
 * `PATCH /findings/:id/verdict` is {@link recordVerdict}. What a
 * handler adds over the call it wraps is an address to read, a
 * query or a body to hand on, a status to choose and an envelope
 * to write — so a change to what the findings surface NARROWS,
 * ORDERS, EMBEDS or ACCEPTS belongs one file over, and the cases
 * that pin those rules still need no server.
 *
 * READ-FIRST IS STRUCTURAL AND NOT OBSERVED HERE. The store this
 * file is handed is the intersection of the two narrowed ports its
 * two service modules declare, and across the four findings tables
 * it carries exactly ONE writer: the append onto `finding_labels`.
 * Nothing on it writes `findings.score` or `score_version`, and
 * nothing on it reaches a sighting or a research row except to read
 * one. So a re-score button cannot be added to this router by a
 * small edit — there would be nothing for it to call. `Read-first`
 * in `docs/architecture/08-http-api.md` states that rule once for
 * the whole wave, and names the small edit it exists to stop.
 *
 * THE RULING IS HERE AND IS SERVED BY A SECOND MODULE.
 * `PATCH /findings/:id/verdict` is declared below beside the two
 * reads, and every rule it keeps lives in `./verdict-service.ts`:
 * the ladder read per request off the OWNING domain's row, the
 * refusal that names that ladder and never the string a caller
 * sent, and the append that leaves the ruling it replaced readable.
 * The widening that admitted it is visible in the OPTIONS type
 * rather than hidden in a handler — this router asks for
 * `insertFindingLabel` and for `findDomainById`, which is a change
 * a reader sees.
 *
 * TWO PATH SHAPES, BECAUSE A FINDING IS MET IN ITS DOMAIN AND
 * ADDRESSED BY ITS ID. The collection hangs off `/domains/:slug`,
 * since a finding is what a domain's criteria produced and a caller
 * holding a slug should not have to look an id up to read one. The
 * single get and the ruling address `/findings/:id` instead: the
 * row carries its own `domainId`, no rule on this table spans a
 * domain, and repeating the slug in the path would let a request
 * name a domain the row does not belong to, a disagreement this
 * router would then have to answer for. The ruling is where that
 * would cost most — the ladder it is judged against is read off
 * `domainId`, so a slug in the path would be a second answer to a
 * question the row has already settled.
 * `docs/architecture/08-http-api.md` records that split beside the
 * rest of the surface.
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
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON THE PATCH, which is
 * the other half of that rule and the ordering every sibling router
 * keeps. {@link recordVerdict} is handed an id this file has
 * already narrowed, so a `PATCH /findings/abc/verdict` carrying a
 * malformed body is answered about the segment. Below that the
 * service parses the body BEFORE it resolves the finding, so a
 * malformed ruling on a finding nobody has is a 422 about the body
 * rather than a 404 about the row.
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
 * THE RULING ANSWERS ON THE SAME TERMS, and what it answers is the
 * row the append STORED rather than the body rebuilt around an id.
 * Its `id` and its `labelledAt` are the two members no request
 * carried, which is what makes the response a reading of the write
 * rather than an echo of the request.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. A `/domains` mount would put `/domains/:slug` in one
 * file and `/domains/:slug/findings` in this one. The argument is
 * in `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which `verdictBodySchema` refuses like
 * any other bad shape. Neither GET reads a body at all: one
 * carrying a body is answered exactly as one that did not.
 */
import type { FindingsServiceStore } from './service.js';
import type { FindingFilter } from './store.js';
import type { VerdictServiceStore } from './verdict-service.js';
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
import { recordVerdict } from './verdict-service.js';

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
   * Where the domain is resolved, its findings are read and a
   * ruling is appended.
   *
   * THE INTERSECTION OF TWO NARROWED PORTS AND NOT EITHER PORT
   * WHOLE. `FindingsServiceStore` is the seven methods
   * `src/findings/service.ts` reaches and `VerdictServiceStore` is
   * the three `./verdict-service.ts` does, overlapping on
   * `findFindingById` alone: nine methods, of which two are
   * `DomainStore`'s and seven are every method `FindingStore`
   * declares. `tests/helpers/memory-research-store.ts` stands
   * behind all nine with no database up.
   *
   * THAT THE UNION IS THE WHOLE PORT IS NOT THE SAME AS EITHER
   * MODULE HOLDING IT, which is what the split buys. The reads are
   * handed a store with no writer on it and the ruling is handed
   * one with no list read, so neither can reach the other's half by
   * a later edit; only this declaration, which a reader sees, puts
   * the two in one place.
   *
   * `insertFindingLabel` IS THE ONE WRITER AMONG THEM, and its
   * being the only one is this router's read-first claim written as
   * a type rather than as a promise. No handler below could
   * re-score a finding, re-file a sighting or write a research row
   * even by accident, there being nothing on the store to call.
   *
   * NO CLOCK SITS BESIDE IT. Nothing on any of the three routes
   * reads the present: a finding's `createdAt` is what the scoring
   * pass stamped, the window is a window over stored rows, and a
   * ruling's `labelledAt` is defaulted by the column rather than
   * supplied here.
   */
  readonly store: FindingsServiceStore & VerdictServiceStore;
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
 * - `PATCH /findings/:id/verdict` — one operator ruling, appended.
 *   `200` with `{ success: true, data }` carrying the stored
 *   `finding_labels` row. `404` when no finding carries the id,
 *   `422` for a segment that is not one, for a body that is not
 *   `{ verdict, note? }`, for an undeclared key in it, and for a
 *   verdict outside the owning domain's ladder — that last under a
 *   code of the service's own, naming `verdict` and carrying the
 *   accepted set and nothing the caller sent.
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
 * NEVER `409`, ON ANY OF THE THREE. Neither read decides on stored
 * state beyond whether the domain and the finding are there, and
 * the ruling has no conflicting state to refuse: `finding_labels`
 * carries no unique key, so a second ruling — the same verdict
 * included — is a second row rather than a collision. The only
 * refusals this router can answer are the `404` about the address
 * and the `422` about the request.
 *
 * All three can also answer `401` with
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
   * **Side effects:** none, and none reachable from here. All
   * three port methods behind this handler are reads, and the one
   * writer on the store below is `insertFindingLabel`, which
   * {@link listFindings} does not name and cannot call — the
   * narrowing is in `FindingsServiceStore` rather than in this
   * handler's discipline.
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

  /**
   * PATCH /findings/:id/verdict
   *
   * One operator ruling on one finding.
   *
   * **Side effects:** appends one `finding_labels` row, or none.
   * Every refusal {@link recordVerdict} raises is raised before
   * the insert, so a request that is turned away leaves the table
   * exactly as it found it. This is the ONE write reachable from
   * this router, and it is reachable from this handler alone.
   *
   * `PATCH` AND NOT `POST`, because the addressed resource is the
   * FINDING and what the request changes about it is the verdict
   * in force. That the table records the act rather than replacing
   * the earlier one is a fact about `finding_labels` rather than
   * about the verb, and `A ruling is appended` in
   * `docs/architecture/08-http-api.md` is where it is argued.
   *
   * `200` AND NOT `201`, on the same reading. The appended row is
   * not a resource this surface addresses: there is no
   * `/findings/:id/verdict/:labelId` to answer a `Location` for,
   * and the sequence is read back through
   * `GET /findings/:id`, whose `labels` carries it newest first.
   *
   * THE BODY IS HANDED ON UNPARSED. `verdictBodySchema` belongs to
   * {@link recordVerdict}, so one parse serves this route and the
   * MCP tool over the same act, and a handler cannot come to
   * disagree with the operation about what a ruling is. What this
   * file narrows is the ADDRESS and nothing else.
   *
   * NOTHING HERE READS THE VOCABULARY, compares a verdict against
   * it or composes the refusal. All three are the service's, which
   * is what keeps the accepted set read per request off the owning
   * domain's row rather than decided twice; the 422 it raises
   * reaches the wire through `errorHandler` carrying that set and
   * nothing the caller submitted.
   */
  router.patch('/findings/:id/verdict', async (req, res) => {
    const id = readId(req.params);
    const label = await recordVerdict(options.store, id, req.body);

    res.status(200).json(ok(label));
  });

  return router;
}
