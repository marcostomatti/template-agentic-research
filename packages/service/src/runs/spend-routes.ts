/**
 * @packageDocumentation
 * The HTTP surface over `src/runs/spend-service.ts`: ONE route, and
 * nothing in it that decides anything.
 *
 * `GET /spend/summary` is {@link summariseSpend}. What the handler
 * adds over the call it wraps is a query to take apart, a clock to
 * supply, a status to choose and an envelope to write — so a change
 * to how the ledger is WINDOWED, BOUNDED, NARROWED or BUCKETED
 * belongs one file over, and the cases that pin those rules still
 * need no server.
 *
 * A SECOND ROUTER IN THE `src/runs/` DIRECTORY, AND THAT IS THE
 * WHOLE REASON THIS FILE EXISTS SEPARATELY. The aggregation is over
 * `llm_calls`, that table hangs off `runs`, and a `src/spend/`
 * holding one read over somebody else's table would be a directory
 * named for a question rather than for a subject. So the group
 * carries two routers under one prefix each — `./routes.ts` for
 * `/runs` and this file for `/spend` — and `src/index.ts` mounts
 * both. `docs/architecture/08-http-api.md` records the six-routers-
 * over-five-prefixes arithmetic that follows from it.
 *
 * READ-ONLY IS STRUCTURAL AND NOT OBSERVED HERE. This file
 * registers one `get` and no other verb, and the store it is handed
 * is {@link SpendServiceStore} — two reads, with no writer of a
 * `runs` or an `llm_calls` row anywhere on it, because
 * `./store.ts` declares none for any caller to reach. So a
 * write-back of a computed cost cannot be added to this router by a
 * small edit: there would be nothing for it to call. `Read-first`
 * in `docs/architecture/08-http-api.md` states that rule once for
 * the whole wave.
 *
 * NO MEMBER OF WHAT THIS ANSWERS IS CURRENCY, AND NO LINE OF THIS
 * FILE IS WHY. `llm_calls` carries `node`, `model`, `prompt_chars`,
 * `est_tokens` and `called_at`, and no price, rate, amount or
 * currency column at all, so there is nothing behind a cost for
 * this route to answer. A rate applied on the way out would be the
 * one place such a number could enter without a column, and this
 * handler multiplies nothing, sums nothing across buckets and adds
 * no member of its own: what `res.json` sees is exactly what
 * {@link summariseSpend} built. `The spend ledger` in
 * `docs/architecture/08-http-api.md` argues it for the surface and
 * `./spend-service.test.ts` holds the answered member roster
 * against a roster of money words.
 *
 * THE PATH ADDRESSES NOTHING, WHICH IS THE SHAPE `/settings`
 * ALREADY TAKES. There is no `:id` and no `:slug` to narrow, so
 * this file declares no address schema and reads no `req.params` at
 * all: a summary over the whole deployment's ledger is the ordinary
 * request rather than a special case of one. The domain it may be
 * narrowed to therefore travels as `?domain=<slug>`, exactly as it
 * does on `GET /runs`.
 *
 * SO THE FILTER IS NOT REBUILT HERE EITHER, on the terms
 * `./routes.ts` states: `RunFilter.domainId` is an ID, only a store
 * call turns a slug into one, and a handler has nowhere to make
 * one. The parsed query is handed on WHOLE rather than member by
 * member — which is the second departure from the sibling lists and
 * a narrower one than it looks, {@link spendQuerySchema} declaring
 * exactly the three members {@link summariseSpend} reads and no
 * page at all.
 *
 * THERE IS NO SPELLING HERE THAT ANSWERS THE UNATTRIBUTED CALLS
 * ALONE. An absent `?domain` is every call INCLUDING the ones
 * belonging to no domain, a present one is that domain's alone, and
 * there is no third request. Both `runs.domain_id` and
 * `llm_calls.run_id` are nullable, so a call can reach no domain by
 * two routes; both land in the bucket whose `domainId` is null, and
 * narrowing excludes both — correctly, neither being that domain's.
 * `docs/architecture/08-http-api.md` records that the per-domain
 * summaries therefore do not sum to the unnarrowed one, the
 * difference being the unattributed spend rather than a rounding.
 *
 * THE WINDOW IS RESOLVED ONE FILE OVER, AND SO IS EVERY BOUND ON
 * IT. The default span, the ceiling the request is refused against
 * and the closing of a half-open request are all
 * {@link summariseSpend}'s; this handler supplies the clock those
 * rules are measured against and nothing else. A `?since` or
 * `?until` that is not an ISO-8601 stamp, and a `?since` at or
 * after its `?until`, are refused by the schema before any of that.
 *
 * NOTHING HERE TRUNCATES, RE-BUCKETS OR RE-ORDERS ANYTHING. The
 * UTC day bucket, the `day` descending then `domainId` ascending
 * order with the null bucket last, and the count and two magnitudes
 * per bucket are all the store's. A handler bucketing again would
 * be a second calendar for the one question where a default
 * calendar is a silent per-deployment difference in every number a
 * widget shows.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a `NotFoundError` raised in the service is a 404
 * carrying `{ code: 'NOT_FOUND', message }` on the wire and the
 * `ValidationError` the span ceiling raises is a 422 carrying its
 * sanitised `details`, with no line of this file involved in
 * either.
 *
 * THE SUMMARY IS ANSWERED AS THE SERVICE BUILT IT. `ok()` carries
 * its argument by reference and reshapes nothing, which is that
 * function's stated contract. The one conversion is the
 * framework's rather than this file's: the two window bounds and
 * every bucket's `day` are `Date` across the service and reach the
 * wire as ISO-8601 strings, because `res.json` serialises through
 * `Date#toJSON` — so a bucket's day arrives as the instant that
 * opens it at UTC, `...T00:00:00.000Z`, which is the calendar
 * written into the value rather than left to a reader.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. The argument is in
 * `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here, and the one route below reads no
 * body at all: a `GET` carrying one is answered exactly as one that
 * did not.
 */
import type { SpendServiceStore } from './spend-service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';

import { ok } from '../http/envelope.js';
import { parseQuery } from '../http/validation.js';

import {
  spendQuerySchema,
  summariseSpend,
} from './spend-service.js';

/**
 * What the MCP tool over this router one route is called with.
 *
 * ONE OBJECT WHERE A REQUEST HAS TWO HALVES, which is the rule
 * every `...ToolInputSchema` on this surface is composed under: an
 * HTTP route parses its address and its query apart, and a tool is
 * handed a single arguments object. This route has no address at
 * all, so the whole of what it reads is {@link spendQuerySchema}
 * and there is nothing to compose it with.
 *
 * SO IT IS THAT BINDING AND NOT A COPY OF IT. The sibling groups
 * build a fresh strict object out of their pieces; doing that here
 * would drop the object-level check {@link spendQuerySchema}
 * inherits from `timeWindowQuerySchema`, zod carrying such a check
 * outwards only — measured, the spread form accepts a `since`
 * after its `until` while refusing every undeclared key exactly as
 * the real schema does. A tool composed that way would take a
 * window its own route refuses, and only that one request would
 * ever say so. Aliasing instead makes the tool argument object the
 * VERY object `parseQuery` is handed below, which is the strongest
 * form the identity rule can take.
 *
 * IT IS DECLARED HERE ALL THE SAME, rather than left to
 * `src/mcp/tools/wave-3.ts` to import from the service, so every
 * entry in that module names one contract per ROUTE and reads the
 * same way whether or not the route it mirrors has an address.
 */
export const spendSummaryToolInputSchema = spendQuerySchema;

/** Everything {@link buildSpendRouter} needs. */
export interface SpendRouterOptions {
  /**
   * Where the domain is resolved and the ledger is aggregated.
   *
   * `SpendServiceStore` and not `RunStore` whole, and not
   * `DomainStore` at all: it is the `Pick` pair
   * `./spend-service.ts` declares, so this router asks for the two
   * reads that one function reaches and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * TWO METHODS, WHICH IS THE NARROWEST STORE ON THIS SURFACE.
   * Five of `RunStore`'s six are absent, and their absence is the
   * split between this router and `./routes.ts`: that one pages the
   * ledger and this one buckets it, and neither can reach the
   * other's half by a later edit because neither store type has a
   * member for it.
   *
   * NO WRITER IS AMONG THEM, and there is none to be among them:
   * `RunStore` declares six methods and all six are reads. That is
   * this router's read-only claim written as a type rather than as
   * a promise.
   */
  readonly store: SpendServiceStore;

  /**
   * Reads the present, for the bound a request left open.
   *
   * Named `clock` here and `now` one level down, exactly as
   * `TopicsRouterOptions` names the same dependency: at this level
   * it is what is being supplied, and at that one it is the reading
   * being taken. A thunk rather than a `Date`, because a router
   * built once at boot answers for the life of the process and a
   * captured instant would freeze the default window at the moment
   * of wiring — every later request would be answered over the
   * thirty days before the service started.
   *
   * REQUIRED rather than defaulted to `() => new Date()`, on the
   * terms the two schedule routers state. A default would let a
   * caller mount this route without having said which present its
   * window is measured back from, and the one place that silence
   * would show is a case comparing a defaulted window against one
   * it chose.
   *
   * IT IS A READ AND NOT A WRITE, which is where this clock departs
   * from theirs. `POST /topics/:id/run-now` stamps the instant it
   * reads into a stored column; this one only closes an open bound,
   * so the instant reaches no table — but it does reach the answer,
   * `SpendSummary.window` carrying the resolved span so a caller
   * can see which one it was given.
   *
   * {@link summariseSpend} READS IT AT MOST ONCE, and only when the
   * caller left `?until` open. Two reads could differ, and the
   * second would be the one the caller is told about while the
   * first is the one the ledger was aggregated over.
   */
  readonly clock: () => Date;
}

/**
 * Builds the spend router.
 *
 * @param options - The store and the clock to act against; see
 *   {@link SpendRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so this is the wire path:
 *
 * - `GET /spend/summary` — what the model ledger holds over one
 *   window, taken apart per domain and per UTC day. `200` with
 *   `{ success: true, data }` carrying `window` — the RESOLVED span
 *   as `{ sinceInclusive, untilExclusive }` — and `buckets`, one
 *   row per domain per day as `{ domainId, day, calls, promptChars,
 *   estTokens }`, `day` descending then `domainId` ascending with
 *   the null bucket last. `404` with `code: 'NOT_FOUND'` when a
 *   `?domain` was sent and no domain carries it. `422` for a
 *   `?domain` that could not be a slug, for a `?since` or `?until`
 *   that is not an ISO-8601 stamp with an offset, for a `?since` at
 *   or after its `?until`, for a resolved span wider than
 *   `SPEND_MAX_WINDOW_DAYS` — that last under a code of the
 *   service's own, naming `since` and carrying the maximum rather
 *   than the span submitted — and for any undeclared query
 *   parameter, `?page` and `?perPage` included, the last of those
 *   naming `query` rather than the parameter. A window in which
 *   nothing was called, a domain that has spent nothing and a
 *   deployment that has called nothing are each `200` with an empty
 *   `buckets`.
 *
 * NO `meta`, BECAUSE THERE IS NO WINDOW OVER A COLLECTION TO
 * DESCRIBE. This is the second unpaginated read on the surface
 * after `GET /domains/:slug/categories`, and the two are
 * unpaginated for different reasons: a taxonomy is small by
 * construction, and a summary is bounded by the SPAN it aggregates
 * over, one bucket per domain per day. So the ceiling
 * `./spend-service.ts` refuses a wide window against is what stands
 * in for a `?perPage` here, and `window` is what stands in for
 * `meta` — the answer says which span it covers, rather than which
 * slice of a collection.
 *
 * THE DEFAULTED WINDOW IS ON THE WIRE, which is what makes an
 * unqualified request readable. A caller that sent no bounds is
 * answered over a span this service chose, and `window` is how it
 * learns which one; the `sinceInclusive`/`untilExclusive` spelling
 * is what puts the half-open rule in the value rather than in a
 * document. `RunDetail.ledgerTruncated` one route over is the same
 * decision about a cut: a caller cannot compare what it got against
 * a constant it was never told.
 *
 * NEVER `409`, AND NEVER `204`. Nothing on this route decides on
 * stored state beyond whether the domain is there, and nothing on
 * it writes, so the only refusals it can answer are the `404` about
 * the narrowing and the `422` about the request.
 *
 * It can also answer `401` with `{ error: 'Unauthorized' }` — the
 * guard's own body, in neither envelope — because `src/index.ts`
 * mounts this router behind `ctx.requireAuth`.
 * `docs/architecture/08-http-api.md` tabulates that answer beside
 * the three other framework-shaped ones.
 *
 * `./spend-routes.test.ts` is where the route is read as a client
 * sees it — the envelope carrying one row per domain and day, the
 * span refusal and the undeclared parameter. What this file can be
 * read for on its own is the inventory: one `get`, no other verb,
 * and one store with no writer on it.
 */
export function buildSpendRouter(
  options: SpendRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /spend/summary
   *
   * What the model ledger holds, per domain and per UTC day, over a
   * window the caller named or this service chose.
   *
   * **Side effects:** none, and none reachable. The one ledger read
   * behind this handler is a read, as is the domain lookup beside
   * it, and no method on the store it holds can write either table.
   *
   * The query is parsed before the clock is passed and before
   * anything is read, so an unparseable stamp, an inverted window
   * or an undeclared parameter costs no read at all. What a schema
   * cannot hold is the SPAN, which depends on the clock whenever a
   * bound was left open — so that one refusal is
   * {@link summariseSpend}'s, and it is still raised before any
   * store call.
   *
   * The parsed query is handed on WHOLE rather than taken apart,
   * which is this handler's one departure from the sibling lists
   * and is argued in this module's header: every member of
   * {@link spendQuerySchema} is a member {@link summariseSpend}
   * reads, there is no `?page` to leave behind, and the slug cannot
   * be resolved without a store call a handler has nowhere to make.
   *
   * The clock is supplied rather than read here. `options.clock` is
   * a thunk, so the instant is taken inside the call that needs it
   * and only when the caller left `?until` open — this line does
   * not read the present, it hands over the ability to.
   *
   * `ok()` rather than `okPage()`, because what is answered is one
   * summary rather than a window over a collection: there is no
   * `meta` for a router to build, no total to derive and no
   * pagination arithmetic anywhere in this handler.
   */
  router.get('/spend/summary', async (req, res) => {
    const query = parseQuery(spendQuerySchema, req.query);
    const summary = await summariseSpend(
      options.store,
      options.clock,
      query,
    );

    res.status(200).json(ok(summary));
  });

  return router;
}
