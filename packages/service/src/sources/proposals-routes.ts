/**
 * @packageDocumentation
 * The HTTP surface over `src/sources/proposals-service.ts`: TWO
 * routes, and nothing in them that decides anything.
 *
 * `GET /sources/:id/pending-configs` is {@link listPendingConfigs}
 * and `POST /sources/:id/approve-config` is
 * {@link approveSourceConfig}. What a handler adds over the call it
 * wraps is an address to narrow, a window to derive or a body to
 * hand on, a status to choose and an envelope to write — so a
 * change to what the queue HOLDS, what a ruling REFUSES or what an
 * approval WRITES belongs one file over, and the cases that pin
 * those rules still need no server.
 *
 * A THIRD ROUTER UNDER A PREFIX TWO OTHERS ALREADY SHARE. The four
 * routes over a `sources` row are `./routes.ts` and the read-only
 * capture queue is `./failures-routes.ts`; this pair is neither,
 * its subject being a `source_config_proposals` row queued against
 * a source. That is the same split `./store.ts` draws through the
 * port and `./proposals-service.ts` draws through the rules.
 * Express matches across mounted routers rather than within one, so
 * three routers under `/sources/:id` is an ordinary mount rather
 * than a trick — `src/index.ts` mounts each of the three behind
 * `ctx.requireAuth`, and `docs/architecture/08-http-api.md`
 * tabulates them together.
 *
 * THE GATE'S VOCABULARY IS `src/approvals/ruling.ts` AND ITS RULES
 * ARE `./proposals-service.ts`'. Which proposal a caller may rule
 * on, what a second application answers, and the one sentence three
 * refusals share are decided one file over, against rows no handler
 * here reads. So this gate and the research gate in
 * `src/entities/routes.ts` cannot drift into answering differently
 * about the same act, and neither router is where that would show.
 *
 * NOTHING HERE APPLIES ANYTHING, AND NEITHER DOES THE SERVICE.
 * Deriving the two `sources` columns from a ruled proposal is
 * `proposalToSourceUpdate` in `./config-proposer.ts`, called as
 * statement 2 of `SourceStore.approveAndApplyProposal` inside the
 * transaction that stamps the approval above it and the application
 * below it. A handler reading `parserConfig` off a row to hand it
 * anywhere would be a second applier, which that port method's own
 * comment names as the drift it exists to prevent.
 *
 * THIS IS THE ONE APPROVAL GATE ON THIS SURFACE THAT CAN ANSWER
 * `409`. Ratifying an intention twice is a no-op and applying a
 * proposal twice is not, because the first application already
 * wrote two documents onto the feed — `RULING_ACTS` in
 * `src/approvals/ruling.ts` is where that difference is declared
 * and `./proposals-service.ts` is where it is raised. Nothing
 * below anticipates it: the row's own `applied_at` is the account
 * of it, and a handler that read the queue first would be
 * answering about a row that could have gone in between.
 *
 * THE QUEUE ARRIVES AS STORED, which is where this router differs
 * from the one next door under the same prefix. The failures queue
 * cuts and masks a captured body because nobody chose that text;
 * here the whole point of the page is that a person rules on the
 * exact document a proposer answered, so an account of it would
 * make the ruling a ruling about something else. Nothing below
 * cuts, masks, re-sorts or re-filters a page it was handed.
 *
 * THE ORDER IS ANSWERED AND NOT CHOSEN HERE. The page arrives
 * `proposed_at` ascending with `id` ascending breaking a tie,
 * which is the port's rule and is the predicate and both ordering
 * keys `listPendingProposals` in `scripts/approve.ts` walks — one
 * backlog with two clients rather than two that happen to agree
 * today. A handler re-sorting a page it was handed would be
 * answering a different order from the one the window was taken
 * under, which is how two pages come to disagree about which row
 * they hold.
 *
 * OLDEST FIRST, WHICH INVERTS EVERY OTHER LIST ON THIS SURFACE. A
 * feed, a capture and a run are read newest first because the
 * recent row is the interesting one; a backlog is read oldest first
 * because the oldest row is the one that has been waiting longest.
 * `The pending queue is the CLI's queue` in
 * `docs/architecture/08-http-api.md` argues it.
 *
 * THE BODY IS HANDED ON UNPARSED. `approveConfigSchema` belongs to
 * {@link approveSourceConfig} — `.strict()` over one `proposalId`
 * and nothing else — so one parse serves this route and the MCP
 * tool over the same act, and a handler cannot come to disagree
 * with the operation about what an approval is. There is no
 * spelling here for a `parserConfig`, which would be a way to write
 * `sources.parser_config` through the gate without ever having
 * proposed it, and none for approving a feed's backlog wholesale.
 *
 * THE QUERY IS READ BEFORE THE ADDRESS ON THE LIST, as it is on
 * every paginated list route on this surface. Both faults are facts
 * about the request alone and neither costs a read, so the ordering
 * shows only when a request gets both wrong — and a window this
 * surface will not serve is the half a caller can fix without
 * knowing anything about what is stored. On the write the ADDRESS
 * is narrowed here and the body is parsed one file over, so a
 * segment that is not an id is answered about the segment whatever
 * the body carries.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a `NotFoundError` raised in the service is a
 * `404` carrying `{ code: 'NOT_FOUND', message }` on the wire, a
 * `ConflictError` is a `409`, and a `ValidationError` raised by the
 * boundary parser is a `422` carrying its sanitised `details`, with
 * no line of this file involved in any of the three.
 *
 * THE ROWS ARE ANSWERED AS THE SERVICE ANSWERED THEM. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * which is those functions' stated contract, so what the port
 * projected is what `JSON.stringify` sees. One conversion is the
 * framework's rather than this file's: `proposedAt`, `approvedAt`
 * and `appliedAt` are `Date`s across the port and reach the wire as
 * ISO-8601 strings, because `res.json` serialises through
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
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which `approveConfigSchema` refuses
 * like any other bad shape. The `get` reads no body at all: one
 * carrying a body is answered exactly as one that did not.
 *
 * `./proposals-routes.test.ts` is where the wire is read. It is
 * scoped to what a client sees — the paginated queue envelope and
 * its `meta`, the `200` approval carrying the ruling projection,
 * the `404` for a proposal queued against another feed, the `409`
 * for one already applied, the `422` for an undeclared body key,
 * and a containment row holding that a response carries no part of
 * a stored `parser_config` a caller did not ask for.
 */
import type { SourceProposalsServiceStore } from './proposals-service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, ok, okPage } from '../http/envelope.js';
import {
  paginationQuerySchema,
  resourceIdParamSchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import {
  approveSourceConfig,
  listPendingConfigs,
} from './proposals-service.js';

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from `./routes.ts` or from
 * `./failures-routes.ts`, where the identical const is private in
 * each. The three routers under this prefix are equal by intent
 * rather than by derivation: exporting one router's address schema
 * would make that agreement look like a dependency, and the day any
 * of them grows a second path parameter it would be editing a
 * symbol the other two read.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and `sources.id` is `bigserial` in drizzle's `number`
 * mode. What reaches each service function is therefore the
 * `number` its signature takes, narrowed at the boundary rather
 * than inside the rules.
 *
 * ONE SCHEMA FOR BOTH ROUTES, because both address the same feed by
 * the same segment. The read and the write differ in what they do
 * with the source and not in how they name it.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared, so the only field a detail built from this parse
 * can name is `id`.
 */
const sourceAddressSchema = z
  .object({ id: resourceIdParamSchema })
  .strict();

/**
 * What the MCP tool over `GET /sources/:id/pending-configs` is
 * called with.
 *
 * ONE OBJECT WHERE A REQUEST HAS TWO HALVES. An HTTP route parses
 * its address and its query apart, and a tool is handed a single
 * arguments object — so the entry in `src/mcp/tools/wave-3.ts`
 * names one schema covering the whole request, spread from the
 * pieces this route already parses rather than written again.
 *
 * SPREAD RATHER THAN EXTENDED: neither piece carries an
 * object-level refinement, so a fresh strict object loses nothing.
 * The findings list and the spend summary are the two that compose
 * the other way round, and each says why beside itself.
 *
 * THE QUEUE ONE TOOL READS IS THE QUEUE THE CLI DRAINS. Both this
 * route and `scripts/approve.ts` select the pending rows in one
 * order, so a model reading the backlog over MCP and an operator
 * reading it from a terminal are told the same row is next.
 *
 * ONLY THE READ IS HERE. The approval beside it is a write, and
 * `src/mcp/tools/wave-3.ts` takes it in its own task, with its own
 * schema declared beside this one when it does.
 *
 * The address const above stays private. Nothing here exports one,
 * so the three routers under this prefix claim that they agree by
 * intent rather than by derivation is untouched by this schema.
 */
export const pendingConfigListToolInputSchema = z.object({
  ...sourceAddressSchema.shape,
  ...paginationQuerySchema.shape,
}).strict();

/** Everything {@link buildSourceProposalsRouter} needs. */
export interface SourceProposalsRouterOptions {
  /**
   * Where the source is resolved, its backlog read, and one
   * proposal ruled on and written onto the feed.
   *
   * `SourceProposalsServiceStore` and not `SourceStore` whole: it
   * is the five-method `Pick` `./proposals-service.ts` declares, so
   * this router asks for exactly what those two functions reach and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * EIGHT OF THE THIRTEEN PORT METHODS ARE ABSENT, and the absence
   * is what keeps each router under this prefix to its own subject.
   * The three writes over a `sources` row belong to `./routes.ts`
   * and the two `documents` reads to `./failures-routes.ts`, so no
   * handler below could insert a feed, retire one or read a failed
   * capture even by accident — there being nothing to call.
   *
   * ONE WRITER AMONG THE FIVE, and it writes two tables:
   * `approveAndApplyProposal` stamps the ruling on one proposal and
   * the two documents onto the source it was proposed for, in one
   * transaction. `findSourceById` is the fourth read rather than a
   * proposal read at all — it is what turns an id naming nothing
   * into a `404` rather than into an empty page or an approval
   * given against a feed that is not there.
   *
   * NO CLOCK SITS BESIDE IT. Nothing on these two routes reads the
   * present: a proposal carries the instant it was raised at, and
   * both ruling stamps are `coalesce(<column>, now())` inside the
   * write rather than values composed here.
   */
  readonly store: SourceProposalsServiceStore;
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
 * `POST /sources/abc/approve-config` is a 422 raised before any
 * store call rather than the 404 an uncoerced lookup would
 * eventually answer, and the distinction is the whole reason this
 * runs first: a 404 says no source carries that id, which is a
 * claim about the table, and `abc` is not an id for the table to
 * have been asked about.
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
 * Builds the source config proposals router.
 *
 * @param options - The store to act against; see
 *   {@link SourceProposalsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /sources/:id/pending-configs` — one page of what is
 *   waiting on a person for this feed, `proposed_at` ascending with
 *   `id` ascending breaking a tie. `200` with
 *   `{ success: true, data: [...], meta }`, where `meta` is
 *   `{ page, perPage, total, totalPages }` and `total` counts the
 *   whole backlog rather than the page. Each row carries the
 *   proposal as stored: the `domainId` and `sourceId` it was
 *   raised under, the proposed `parserConfig` and `contract`
 *   whole, who proposed it, where it stands, and its three stamps.
 *   `404` with `code: 'NOT_FOUND'` when no source carries the id,
 *   which is what tells a mistyped id from a backlog somebody has
 *   already drained. `422` for a segment that is not an id, for a
 *   `?page` below 1, a `?perPage` above 200, a non-integer in
 *   either, or any undeclared query parameter — the last of those
 *   naming `query` rather than the parameter. A feed
 *   with nothing pending, a feed whose proposals have all been
 *   ruled on, and a page past the end are each `200` with an empty
 *   `data`. Never `409`.
 * - `POST /sources/:id/approve-config` — one operator ruling on one
 *   proposed arrangement, and the arrangement written onto the feed
 *   in the same transaction. `200` with
 *   `{ success: true, data }` carrying the four-member ruling: the
 *   row's id, where it stands, when a person agreed, and when the
 *   arrangement was written. `404` when no source carries the id,
 *   and when the body names a proposal nothing carries or one
 *   raised against another feed — one sentence for both, since a
 *   caller is not entitled to learn that a proposal it does not own
 *   exists. `409` when the proposal has already been applied.
 *   `422` for a segment that is not an id, for a body that is not
 *   `{ proposalId }`, and for an undeclared key in it.
 *
 * ONE OF THE TWO WRITES, AND IT WRITES TWO TABLES. The `get` is a
 * read whose store cannot reach a writer of anything; the `post`
 * reaches exactly one, and that one method is the whole of what
 * this router can change — per
 * {@link SourceProposalsRouterOptions}.
 *
 * `409` IS AVAILABLE HERE AND ON NO OTHER APPROVAL GATE, and it has
 * exactly one cause: a proposal whose `applied_at` is already
 * stamped. It carries no `details`, because what the feed holds now
 * is a fact about a row the caller was refused a ruling over and
 * may have been edited since.
 *
 * Both can also answer `401` with `{ error: 'Unauthorized' }` — the
 * guard's own body, in neither envelope — because `src/index.ts`
 * mounts this router behind `ctx.requireAuth`.
 * `docs/architecture/08-http-api.md` tabulates that answer beside
 * the three other framework-shaped ones.
 */
export function buildSourceProposalsRouter(
  options: SourceProposalsRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /sources/:id/pending-configs
   *
   * One page of the arrangements proposed for a feed and not yet
   * ruled on.
   *
   * **Side effects:** none, and none reachable. Both proposal reads
   * behind this handler are reads, and neither can be asked for a
   * ruled row: the predicate is the port's and there is no status
   * parameter on either method, so this route cannot become a way
   * to page the gate's history.
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
   * rows that came back: `?page=99` over a one-page backlog answers
   * `page: 99` beside `totalPages: 1`, which is how a caller sees
   * that it overshot.
   */
  router.get('/sources/:id/pending-configs', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const id = readId(req.params);
    const window = toStoreWindow(query);
    const page = await listPendingConfigs(options.store, id, window);
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /sources/:id/approve-config
   *
   * Records that a person ruled in favour of one proposed
   * arrangement, and has it written onto the feed.
   *
   * **Side effects:** stamps `approved_at`, `status` and
   * `applied_at` on one `source_config_proposals` row and rewrites
   * `parser_config` and `contract` on the `sources` row it names,
   * or nothing at all. The two writes are one transaction, so a
   * failure in the middle leaves the feed untouched and the
   * proposal unruled — which is the state this request can be made
   * from again.
   *
   * `POST` AND NOT `PATCH`, because what the request does is give a
   * ruling rather than edit the row it is given about. The
   * addressed resource is the FEED, the ruling is an act performed
   * against one of its queued proposals, and the row that moves is
   * named in the body rather than in the path.
   *
   * `200` AND NOT `201`, because nothing was created: the proposal
   * already existed and what changed is three of its columns and
   * two of the source's. There is no new resource to answer a
   * `Location` for.
   *
   * A SECOND RULING IS A `409` AND NOT A `200`, which is where this
   * gate parts from the research one. Applying twice would write
   * the two documents again and leave the first application's stamp
   * standing for a write it no longer describes — `RULING_ACTS` in
   * `src/approvals/ruling.ts` declares the difference and
   * {@link approveSourceConfig} raises it.
   *
   * AN APPROVED-BUT-UNAPPLIED PROPOSAL IS NOT REFUSED. A ruling a
   * `scripts/approve.ts` operator already gave from a terminal is
   * applied here rather than turned away: the CLI rules and this
   * rules and writes, which is the whole reason both stamps exist.
   *
   * THE BODY IS HANDED ON UNPARSED, per the module header.
   * {@link approveSourceConfig} owns `approveConfigSchema`, the
   * comparison that refuses a proposal raised against another feed,
   * and the single sentence all three of its `404`s answer. Nothing
   * here composes a refusal, reads a queued row or derives a column
   * of the feed.
   */
  router.post('/sources/:id/approve-config', async (req, res) => {
    const id = readId(req.params);
    const ruling = await approveSourceConfig(
      options.store,
      id,
      req.body,
    );

    res.status(200).json(ok(ruling));
  });

  return router;
}
