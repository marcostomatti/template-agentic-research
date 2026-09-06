/**
 * @packageDocumentation
 * The HTTP surface over `src/runs/service.ts`: TWO routes, and
 * nothing in them that decides anything.
 *
 * `GET /runs` is {@link listRuns} and `GET /runs/:id` is
 * {@link getRun}. What a handler adds over the call it wraps is an
 * address to read or a query to take apart, a window to derive, a
 * status to choose and an envelope to write — so a change to what
 * the runs surface NARROWS, ORDERS, EMBEDS or CUTS belongs one file
 * over, and the cases that pin those rules still need no server.
 *
 * READ-ONLY IS STRUCTURAL AND NOT OBSERVED HERE. This file
 * registers `get` twice and no other verb, and the store it is
 * handed is {@link RunsServiceStore} — six reads, with no writer of
 * a `runs` or an `llm_calls` row anywhere on it, because
 * `./store.ts` declares none for any caller to reach. So a
 * cancel-this-run button cannot be added to this router by a small
 * edit: there would be nothing for it to call. `Read-first` in
 * `docs/architecture/08-http-api.md` states that rule once for the
 * whole wave, and `tests/invariants/api-read-first.test.ts` derives
 * it from `keyof` over the port types rather than from any
 * paragraph here.
 *
 * THE COLLECTION IS DEPLOYMENT-WIDE, SO THE DOMAIN ARRIVES AS A
 * QUERY PARAMETER AND NOT AS A PATH SEGMENT. `/runs` is the whole
 * of what the service has done: a pass belongs to a domain or to
 * none, and `?domain=<slug>` NARROWS a page that exists without it
 * rather than naming the collection being read. That is where this
 * router departs from `GET /domains/:slug/findings` and
 * `GET /domains/:slug/documents`, which cannot be met outside a
 * domain at all and say so in their paths.
 *
 * SO THE FILTER IS NOT REBUILT HERE, WHICH INVERTS THE RULE EVERY
 * OTHER LIST ON THIS SURFACE KEEPS. A `?kind`, a `?verdict` or a
 * `?parseStatus` is turned into the port's own value object by the
 * handler that read it, because what a caller ASKED FOR and what a
 * port NARROWS ON are different statements. `RunFilter.domainId` is
 * an ID, and the only thing that turns a slug into one is a store
 * call — which a handler has nowhere to make. So the slug is handed
 * on as the string it arrived as and `./service.ts` builds the
 * filter, where every sibling router builds one member by member.
 * The value object is still built once and in one place; that place
 * is one file further in.
 *
 * THERE IS NO SPELLING HERE THAT ANSWERS THE DOMAIN-LESS TICKS
 * ALONE. An absent `?domain` is every run INCLUDING them, a present
 * one is that domain's alone, and there is no third request:
 * `RunFilter.domainId` is an optional `number` rather than a
 * `number | null`, so no value exists to send that would mean the
 * rows belonging to nobody, and {@link runListQuerySchema} is
 * `.strict()`, so a parameter invented to carry one is a `422`
 * naming `query`. `docs/architecture/08-http-api.md` records that
 * as this wave's decision rather than as an omission.
 *
 * TWO PATH SHAPES, AND THE SECOND IS AN ID. A run carries its own
 * nullable `domainId`, no rule on either table spans a domain, and
 * `/runs/:id` therefore repeats no slug — which would let a request
 * name a domain the row does not belong to, a disagreement this
 * router would then have to answer for. `A domain is addressed by
 * slug` in `docs/architecture/08-http-api.md` is the rule this
 * follows rather than an exception to it.
 *
 * THE LEDGER IS EMBEDDED, CUT AND REPORTED, AND NONE OF THE THREE
 * IS DECIDED HERE. `RUN_LEDGER_CAP` is the service's constant, the
 * rows arrive `calledAt` descending, and `llmCallCount` and
 * `ledgerTruncated` travel beside them so a reader shown a short
 * ledger is told whether it is looking at the head of a longer one.
 * There is no `?perPage` over the embedded list and no parameter
 * here that could raise the cap: a caller cannot ask for the whole
 * of a long pass's ledger through this route.
 *
 * NOTHING HERE RE-SORTS, RE-COUNTS OR RE-CHECKS A BOUND. Both
 * orders are the store's; the over-cap `?perPage` and the
 * mis-shaped `?domain` are refused by the schema one file over. A
 * handler sorting again would be answering a different order from
 * the one the window was taken under, which is exactly how two
 * pages come to disagree about which row they hold.
 *
 * THE QUERY-BEFORE-ADDRESS ORDERING HAS NOTHING TO DECIDE ON THIS
 * ROUTER, and saying so is cheaper than leaving a reader to look
 * for it. Every paginated list on this surface parses the query
 * first, so a request that got both halves wrong is answered about
 * the half a caller can fix without knowing what is stored. Here
 * the list reads a query and no address and the single get reads an
 * address and no query, so no request can get both wrong at once.
 * The ordering is a claim about the routes that HAVE both, and
 * neither of these is one.
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
 * THE ROWS ARE ANSWERED AS THE PORT ANSWERED THEM. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * which is those functions' stated contract, so what a store
 * projected is what `JSON.stringify` sees. The conversions a client
 * should know about are the framework's rather than this file's:
 * `startedAt`, `finishedAt` and `calledAt` are `Date` across the
 * port and reach the wire as ISO-8601 strings, because `res.json`
 * serialises through `Date#toJSON`; `counts` and `errors` are
 * whatever jsonb held, answered whole. Nothing is added, hidden,
 * cut or masked on the way out — no column on either table holds a
 * credential or text somebody else sent, and
 * `docs/architecture/08-http-api.md` names the two surfaces that
 * do.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. The argument is in
 * `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here, and neither route below reads a
 * body at all: a `GET` carrying one is answered exactly as one that
 * did not.
 */
import type { RunsServiceStore } from './service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, ok, okPage } from '../http/envelope.js';
import {
  resourceIdParamSchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import { getRun, listRuns, runListQuerySchema } from './service.js';

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and `runs.id` is `bigserial` in drizzle's `number` mode.
 * What reaches {@link getRun} is therefore the `number` its
 * signature takes, narrowed at the boundary rather than inside the
 * rules.
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
 * can name is `id`.
 */
const runAddressSchema = z
  .object({ id: resourceIdParamSchema })
  .strict();

/**
 * What the MCP tool over `GET /runs` is called with.
 *
 * ONE OBJECT WHERE A REQUEST HAS TWO HALVES. An HTTP route parses
 * its address and its query apart, and a tool is handed a single
 * arguments object — so each entry in `src/mcp/tools/wave-3.ts`
 * names one schema covering the whole request, spread from the
 * pieces the route already parses rather than written again. This
 * collection has no address at all, so its whole request is the
 * query and that is all this object holds.
 *
 * SPREAD RATHER THAN EXTENDED, on the terms the documents list
 * states: {@link runListQuerySchema} adds one optional narrowing
 * to the shared page and carries no object-level refinement for a
 * fresh object to lose. The spend summary beside it does carry
 * one, and its own comment says what that costs.
 *
 * AN ABSENT `domain` WIDENS ON THIS PROTOCOL TOO. There is no
 * spelling here that asks for the domain-less ticks ALONE, exactly
 * as there is none on the wire — the module header argues that
 * once for both faces of the route.
 */
export const runListToolInputSchema = z.object({
  ...runListQuerySchema.shape,
}).strict();

/**
 * What the MCP tool over `GET /runs/:id` is called with.
 *
 * The address is the whole of this request — the single get parses
 * no query at all, and an undeclared parameter sent to it on the
 * wire is IGNORED rather than refused — so the object carries that
 * one member, spread from {@link runAddressSchema}. The tool is
 * therefore the stricter of the two faces of this route.
 *
 * The address const above stays private. Nothing here exports one,
 * so the sibling routers claim that they agree by intent rather
 * than by derivation is untouched by this pair.
 */
export const runReadToolInputSchema = z.object({
  ...runAddressSchema.shape,
}).strict();

/** Everything {@link buildRunsRouter} needs. */
export interface RunsRouterOptions {
  /**
   * Where the domain is resolved and the passes are read.
   *
   * `RunsServiceStore` and not `RunStore` whole, and not
   * `DomainStore` at all: it is the `Pick` pair `./service.ts`
   * declares, so this router asks for the six reads those two
   * functions reach and `tests/helpers/memory-research-store.ts`
   * can stand behind it with no database up.
   *
   * FIVE OF THE SIX ARE `RunStore`'S AND THE SIXTH IS THE SLUG
   * LOOKUP, which is the shape a query-parameter narrowing forces:
   * a domain-scoped list resolves its slug in the service too, but
   * this one would have no filter to build without the lookup.
   *
   * `summariseSpend` IS THE ONE METHOD OF THAT PORT ABSENT, and its
   * absence is the split between this router and
   * `./spend-routes.ts`. The page and the single get page the
   * ledger, the summary buckets it, and neither router can reach
   * the other's half by a later edit because neither store type has
   * a member for it.
   *
   * NO WRITER IS AMONG THEM, and there is none to be among them:
   * `RunStore` declares six methods and all six are reads. That is
   * this router's read-only claim written as a type rather than as
   * a promise — no handler below could open a run, close one or
   * append a ledger row even by accident, there being nothing on
   * the store to call.
   *
   * NO CLOCK SITS BESIDE IT, unlike `SpendRouterOptions` one file
   * over. Nothing on either route reads the present: a run's stamps
   * are what the dispatcher wrote, and the window is a window over
   * stored rows.
   */
  readonly store: RunsServiceStore;
}

/**
 * Reads the `:id` a request addressed a run by.
 *
 * @param params - `req.params`. Typed `unknown` on purpose: Express
 *   types it as a record of strings, and a boundary that trusts its
 *   own framework's typing is not one.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `GET /runs/abc` is a 422 raised before any store call rather than
 * the 404 an uncoerced lookup would eventually answer, and the
 * distinction is the whole reason this runs first: a 404 says no
 * run carries that id, which is a claim about the table, and `abc`
 * is not an id for the table to have been asked about.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link runAddressSchema}.
 */
function readId(params: unknown): number {
  return parseBody(runAddressSchema, params).id;
}

/**
 * Builds the runs router.
 *
 * @param options - The store to act against; see
 *   {@link RunsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /runs` — one page of the passes the service has made,
 *   `startedAt` descending with `id` descending breaking a tie.
 *   `200` with `{ success: true, data: [...], meta }`, where `meta`
 *   is `{ page, perPage, total, totalPages }` and `total` counts
 *   what the same FILTER selects rather than what the deployment
 *   holds. `404` with `code: 'NOT_FOUND'` when a `?domain` was sent
 *   and no domain carries it, which is what tells a mistyped slug
 *   from a domain nothing has been dispatched for. `422` for a
 *   `?domain` that could not be a slug, for a `?page` below 1, a
 *   `?perPage` above 200, a non-integer in either, or any
 *   undeclared query parameter — the last of those naming `query`
 *   rather than the parameter. A deployment that has run nothing, a
 *   domain that has run nothing and a page past the end are each
 *   `200` with an empty `data`.
 * - `GET /runs/:id` — one pass and the head of what it spent. `200`
 *   with `{ success: true, data }` carrying `run`, its `ledger`
 *   newest first and at most `RUN_LEDGER_CAP` rows long, the full
 *   `llmCallCount` and a `ledgerTruncated` flag. `404` when no run
 *   carries the id, `422` for a segment that is not one. Reads no
 *   query at all, so there is no window to get wrong: the ledger is
 *   embedded and capped rather than paged, and a pass that called
 *   nothing answers an empty list beside a `200`.
 *
 * THE `?domain` NARROWS AND NEVER SCOPES, which is the difference
 * between the `404` above and the one a `/domains/:slug` route
 * answers. A slug this deployment does not carry is refused because
 * the narrowing cannot be resolved, not because the collection is
 * missing: `/runs` exists for every deployment, including one that
 * runs no domains at all.
 *
 * NEVER `409`, ON EITHER. Nothing on this router decides on stored
 * state beyond whether the domain and the run are there, and
 * nothing on it writes, so the only refusals it can answer are the
 * `404` about an address or a narrowing and the `422` about a
 * request.
 *
 * Both can also answer `401` with `{ error: 'Unauthorized' }` — the
 * guard's own body, in neither envelope — because `src/index.ts`
 * mounts this router behind `ctx.requireAuth`.
 * `docs/architecture/08-http-api.md` tabulates that answer beside
 * the three other framework-shaped ones.
 *
 * `./routes.test.ts` is where the two routes are read as a client
 * sees them — the paginated envelope and its `meta`, the `?domain`
 * narrowing on the wire, the capped ledger beside both its
 * counters, and the two refusals. What this file can be read for on
 * its own is the inventory: two `get` calls, no other verb, and one
 * store with no writer on it.
 */
export function buildRunsRouter(options: RunsRouterOptions): RouterType {
  const router = Router();

  /**
   * GET /runs
   *
   * One page of the passes the service has made, narrowed to a
   * domain when the caller named one.
   *
   * **Side effects:** none, and none reachable. Both run reads
   * behind this handler are reads, and no method on the store it
   * holds can write either table.
   *
   * The query is parsed before anything else, so an over-cap
   * `?perPage` or a `?domain` that could not be a slug costs no
   * read and is answered about the parameter the caller typed.
   * `toStoreWindow` owns the `(page - 1) * perPage` arithmetic and
   * `buildPaginationMeta` derives `totalPages`, so the two numbers
   * a client pages by are computed in one place each and this
   * handler does no arithmetic of its own.
   *
   * The `?domain` is handed on as the string it arrived as rather
   * than rebuilt into a `RunFilter`, which is this router's
   * one departure from every sibling list and is argued in this
   * module's header: only a store call turns a slug into the id the
   * port narrows on. An absent parameter reaches
   * {@link listRuns} as `undefined`, which is what that function
   * reads as every run including the domain-less ticks.
   *
   * `meta` echoes the window that was ASKED FOR rather than the
   * rows that came back: `?page=99` over a one-page collection
   * answers `page: 99` beside `totalPages: 1`, which is how a
   * caller sees that it overshot.
   */
  router.get('/runs', async (req, res) => {
    const query = parseQuery(runListQuerySchema, req.query);
    const page = await listRuns(
      options.store,
      query.domain,
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
   * GET /runs/:id
   *
   * One pass, and the newest of what it spent.
   *
   * **Side effects:** none, and none reachable, per the list above.
   *
   * `ok()` rather than `okPage()`, because what is answered is one
   * run rather than a window over a collection. The ledger inside
   * it carries no `meta` of its own: it is embedded in one run's
   * answer and CUT rather than paged, so there is no `?page` for a
   * caller to send and no window for a total to be read against.
   * What travels instead is the full `llmCallCount` and the
   * `ledgerTruncated` flag, which is how a reader tells a cut
   * ledger from a short one.
   *
   * An empty ledger is a state rather than a gap: a tick that found
   * no work to do ledgers nothing at all, and answers `200` with an
   * empty list, which is what lets a client tell it from a pass it
   * failed to read.
   */
  router.get('/runs/:id', async (req, res) => {
    const detail = await getRun(options.store, readId(req.params));

    res.status(200).json(ok(detail));
  });

  return router;
}
