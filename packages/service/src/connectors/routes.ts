/**
 * @packageDocumentation
 * The HTTP surface over `src/connectors/service.ts`: four routes,
 * and nothing in them that decides anything.
 *
 * `GET /connectors` is {@link listConnectors}, `POST /connectors`
 * is {@link createConnector}, `PATCH /connectors/:id` is
 * {@link patchConnector} and `DELETE /connectors/:id` is
 * {@link deleteConnector}. What a handler adds over the call it
 * wraps is an address to read, a window and a filter to derive, a
 * status to choose and an envelope to write — so a change to a
 * connector RULE belongs one file over, and the cases that pin
 * those rules still need no server.
 *
 * ONE PATH SHAPE AND NOT TWO, which is where this router differs
 * in SHAPE from every other resource group on the surface rather
 * than in subject. `connectors` carries no `domain_id`: which
 * model endpoint answers, or which notebook an export is handed
 * to, is a fact about the deployment rather than about a domain.
 * So the collection hangs off the root, there is no `:slug` to
 * narrow, no `readSlug` helper beside {@link readId}, and no `404`
 * about a domain that any handler here could answer. A connector
 * outlives every domain that named it.
 *
 * THE LIST TAKES A THIRD PARAMETER, AND IT IS THE ONLY LIST ROUTE
 * ON THIS SURFACE THAT DOES. `?kind` narrows the page to one
 * family of service, held to `CONNECTOR_KINDS` — the same tuple
 * `connectors_kind_check` is generated from — so a kind nobody
 * registered is a `422` naming the parameter rather than an empty
 * page whose emptiness the caller cannot account for.
 *
 * IT IS EXTENDED FROM `paginationQuerySchema` RATHER THAN
 * RESPELT. {@link connectorListQuerySchema} adds one member to the
 * schema `src/http/schemas.ts` declares, so `?page` and `?perPage`
 * mean here exactly what they mean everywhere else and this router
 * declares no pagination vocabulary of its own. `.strict()`
 * survives the extension, which is the half that matters: `?knid`
 * is still a refusal naming `query` rather than a typo silently
 * answered as an unfiltered page.
 *
 * A KIND IS A FILTER AND NOT A SCOPE. Absent answers every
 * connector the deployment holds, and a kind no row carries
 * answers an empty page with a `200` — the collection exists and
 * the narrowing over it is empty, exactly as a window past the end
 * is. `meta.total` counts the rows the SAME filter selects, which
 * is the port's own rule rather than anything this handler
 * arranges.
 *
 * NO CONFIG IS MASKED HERE, and that is worth stating in the file
 * a reader checks first. `./secrets.ts` holds the roster and the
 * one literal, `./service.ts` is the single layer that applies
 * them, and every record reaching a handler below has already been
 * through it — the list, and the rows the create and the patch
 * answer with. A mask applied here would be applied on the HTTP
 * path alone, and wave 3 exposes those same service functions as
 * MCP tools.
 *
 * NOTHING HERE MERGES A CONFIG EITHER. A `config` a patch supplies
 * REPLACES the stored document whole, which is the store's rule
 * and the schema's rather than a handler's. The consequence a
 * caller feels is that a patch omitting a secret's key has CLEARED
 * that secret, and that request is byte-identical to the one doing
 * it on purpose; `docs/architecture/08-http-api.md` argues why a
 * merge would be the worse trade.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in the wave-1 routers
 * and for the same reason. {@link createConnector} and
 * {@link patchConnector} take an `unknown` and parse it
 * themselves, because wave 3 registers those same functions as
 * tools and a body validated by the router would leave that caller
 * validating against a second schema nobody would notice drifting.
 * That is also what keeps the `openPaths` argument — the one
 * prefix below which a key is the operator's own — in the service
 * that declares the schemas rather than in a handler.
 *
 * NO PATCH CAN REACH `kind`, and the containment is the service
 * schema's rather than a check here: `patchConnectorSchema`
 * declares no member that could carry one. A body naming it is
 * therefore an unrecognized key whose detail names `body`, and not
 * an enum fault naming `kind` — the same word, refused by a
 * different mechanism from the one that refuses a `?kind`. The
 * argument for the asymmetry is at the schema: a connector's kind
 * is read by rows and by queries that are not this one, and
 * neither can see the edit.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON A PATCH, which is
 * this file's ordering rather than the service's:
 * {@link patchConnector} is handed an id {@link readId} has
 * already narrowed, so a `PATCH /connectors/abc` carrying a
 * malformed body is answered about the SEGMENT. There is no
 * corresponding claim on the create, which addresses nothing at
 * all — `POST /connectors` names no row and the body is the whole
 * of what it can get wrong.
 *
 * AND THE LIST HAS NO ADDRESS EITHER, so the query-before-address
 * ordering the other paginated lists here state does not exist on
 * this router. The only narrowing `GET /connectors` reads is the
 * query, and a request that gets it wrong is answered about the
 * parameter it typed.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a {@link NotFoundError} raised in the service is
 * a 404 carrying `{ code: 'NOT_FOUND', message }` on the wire, a
 * delete a subscription refuses is a 409 carrying its count in
 * `details`, and a `ValidationError` raised by the boundary parser
 * is a 422 carrying its sanitised `details`, with no line of this
 * file involved in any of them.
 *
 * THE RECORD IS ANSWERED AS THE SERVICE ANSWERED IT. `ok()` and
 * `okPage()` carry their argument by reference and reshape
 * nothing, which is those functions' stated contract, so what the
 * service masked is what `JSON.stringify` sees. `connectors`
 * declares no timestamp at all, so unlike every other group here
 * there is no `Date` for `res.json` to render; `config` is
 * whatever jsonb held, answered whole and answered MASKED.
 *
 * NO CLOCK IS TAKEN, as on the sources router and unlike the
 * topics one. Nothing on this group reads the present:
 * `connectors` spreads no `schedulableColumns()`, carries no
 * `next_run_at`, and has no verb that could write one.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule. The string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. The argument is in
 * `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas
 * refuse like any other bad shape.
 */
import type { ConnectorServiceStore } from './service.js';
import type { ConnectorFilter } from './store.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { CONNECTOR_KINDS } from '../db/schema/values.js';
import { buildPaginationMeta, ok, okPage } from '../http/envelope.js';
import {
  paginationQuerySchema,
  resourceIdParamSchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import {
  createConnector,
  deleteConnector,
  listConnectors,
  patchConnector,
} from './service.js';

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * `resourceIdParamSchema` coerces, because a path segment is
 * always a string and every id column in schema v2 is `bigserial`
 * in drizzle's `number` mode. What reaches {@link patchConnector}
 * and {@link deleteConnector} is therefore the `number` their
 * signatures take, narrowed at the boundary rather than inside the
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
 * surface is, and it can never fire here: Express hands a handler
 * a null-prototype object whose keys are exactly the parameters
 * the path declared, so the only field a detail built from this
 * parse can name is `id`.
 */
const connectorAddressSchema = z.object({ id: resourceIdParamSchema })
  .strict();

/**
 * The query `GET /connectors` is read through: the surface's own
 * window, plus the one filter this group has.
 *
 * EXTENDED RATHER THAN REDECLARED, which is what keeps `?page` and
 * `?perPage` a single vocabulary. `.extend()` preserves the
 * `.strict()` `paginationQuerySchema` was declared with (measured
 * against this tree's zod), so an undeclared parameter is still
 * ONE detail naming `query` rather than a typo answered as an
 * unfiltered page — and the default and the cap are still the ones
 * `src/http/schemas.ts` argues for rather than a second pair that
 * agrees today.
 *
 * `kind` is optional and holds to `CONNECTOR_KINDS`, so it answers
 * `invalid_value` naming the parameter for a family nobody
 * registered — and for an explicit `null`, which an enum refuses
 * with that same code rather than as a type fault. An absent
 * member is every kind; there is no spelling here that means "no
 * kind at all", because a filter selecting nothing is a request no
 * caller has a reason to make.
 *
 * The tuple is the one `connectors_kind_check` is generated from,
 * so this parameter and the column are two readings of a single
 * declaration: a member added to it becomes filterable without
 * this file being edited, and a member removed from it stops being
 * filterable on the same day the column stops accepting it.
 */
const connectorListQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(CONNECTOR_KINDS).optional(),
});

/** Everything {@link buildConnectorsRouter} needs. */
export interface ConnectorsRouterOptions {
  /**
   * Where the deployment's connectors are read and written.
   *
   * `ConnectorServiceStore` and not `ConnectorStore` whole: it is
   * the `Pick` the service declares, so this router asks for the
   * six methods that module reaches and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * The method it leaves out is `findConnectorById`, and its
   * absence is a containment this router is handed rather than one
   * it enforces: no operation on this group reads a row before it
   * writes one, so no handler below can come to hold a STORED
   * config — which on this table is a live credential. The list is
   * the only read here, and what it answers is masked before it
   * arrives.
   *
   * NO CLOCK SITS BESIDE IT, unlike `TopicsRouterOptions`. Nothing
   * on this group reads the present.
   */
  readonly store: ConnectorServiceStore;
}

/**
 * Reads the `:id` a request addressed a connector by.
 *
 * @param params - `req.params`. Typed `unknown` on purpose:
 *   Express types it as a record of strings, and a boundary that
 *   trusts its own framework's typing is not one.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `PATCH /connectors/abc` is a 422 raised before any store call
 * rather than the 404 an uncoerced lookup would eventually answer,
 * and the distinction is the whole reason this runs first: a 404
 * says no connector carries that id, which is a claim about the
 * table, and `abc` is not an id for the table to have been asked
 * about.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link connectorAddressSchema}.
 */
function readId(params: unknown): number {
  return parseBody(connectorAddressSchema, params).id;
}

/**
 * Builds the connectors router.
 *
 * @param options - The store to act against; see
 *   {@link ConnectorsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /connectors` — one page of the deployment's connectors,
 *   kind ascending with name ascending beside it, EVERY CONFIG
 *   MASKED. `200` with `{ success: true, data: [...], meta }`,
 *   where `meta` is `{ page, perPage, total, totalPages }`. `422`
 *   for a `?kind` outside `CONNECTOR_KINDS`, for a `?page` below
 *   1, a `?perPage` above 200, a non-integer in either, or any
 *   undeclared query parameter — the last of those naming `query`
 *   rather than the parameter. Never `404`: this collection has no
 *   address, so there is no row for a read to miss. A page past
 *   the end of the collection, and a `?kind` no row carries, are
 *   each `200` with an empty `data`.
 * - `POST /connectors` — adds one connector, NEVER REACHED. `201`
 *   with `{ success: true, data }` carrying the stored row and the
 *   database's own id, its config MASKED though the caller just
 *   sent the secret. `422` for a body `createConnectorSchema`
 *   refuses — a `kind` outside the tuple, an empty `name`, a
 *   `config` submitting the mask literal, or any undeclared key.
 *   `409` with `code: 'CONFLICT'` when the deployment already
 *   carries a connector of that kind by that name. The mask
 *   refusal is reached BEFORE the conflict, so a body that is both
 *   is a `422`.
 * - `PATCH /connectors/:id` — rewrites the supplied members. `200`
 *   with the stored row afterwards, MASKED. `422` for a body
 *   `patchConnectorSchema` refuses and for a segment that is not
 *   an id; `404` when no connector carries the id; `409` when the
 *   RESULTING name is one that kind already holds. A patch
 *   carrying no member is a legal call answering the row
 *   unchanged, `config` REPLACES the stored document whole, and
 *   `kind` is not patchable — a body naming it is refused as an
 *   unrecognized key, so its detail names `body`.
 * - `DELETE /connectors/:id` — removes one. `204` with no body,
 *   which on this group also means no last unmasked read. `404`
 *   when no connector carries the id, `422` for a segment that is
 *   not one. `409` while export subscriptions still deliver
 *   through the connector, carrying `exportSubscriptions` in
 *   `details` and naming `/exports` as where those are retired;
 *   and `409` again, with NO `details`, when a subscription is
 *   written between the count and the write. There is no
 *   `?cascade=confirm` here and nothing for one to authorise.
 *
 * EVERY CONFIG THAT LEAVES THIS ROUTER IS MASKED, and none of the
 * three routes that answer one does the masking. That rule is
 * `./service.ts`'s and is stated there; what this file contributes
 * is that no fourth path out exists — there is no single-item
 * `GET` on this group, so the list and the two writes are the
 * whole of what answers a config at all.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildConnectorsRouter(
  options: ConnectorsRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /connectors
   *
   * One page of the deployment's connectors, every config masked.
   *
   * **Side effects:** none.
   *
   * The query carries both the window and the filter, so one parse
   * answers for both and a request getting either wrong costs no
   * read. `toStoreWindow` owns the `(page - 1) * perPage`
   * arithmetic and `buildPaginationMeta` derives `totalPages`, so
   * the two numbers a client pages by are computed in one place
   * each and this handler does no arithmetic of its own.
   *
   * The filter is rebuilt as `ConnectorFilter` rather than passed
   * as the parsed query, because the two are different statements:
   * one is what a caller asked for, the other is what the port
   * narrows on. An absent `?kind` reaches the store as an absent
   * member, which is what that port reads as every kind.
   *
   * `meta` echoes the window that was ASKED FOR rather than the
   * rows that came back, and `total` counts the rows the same
   * FILTER selects — so `?kind=llm` answers how many `llm`
   * connectors there are and not how many connectors there are.
   */
  router.get('/connectors', async (req, res) => {
    const query = parseQuery(connectorListQuerySchema, req.query);
    const filter: ConnectorFilter = { kind: query.kind };
    const window = toStoreWindow(query);
    const page = await listConnectors(options.store, filter, window);
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /connectors
   *
   * Adds one connector to the deployment, never reached.
   *
   * **Side effects:** writes one `connectors` row.
   *
   * `201` rather than `200`, because the answer is a resource that
   * did not exist when the request was made. No `Location` header:
   * the created row travels in the body carrying the id the two
   * write routes address it by, so a header would restate what the
   * caller already has back.
   *
   * The answer is MASKED though the caller just sent the secret,
   * which is deliberate rather than pedantic: a create is answered
   * by the same shape a read answers, and a response body carrying
   * the credential back would be the very artifact the masking
   * exists to keep it out of. Nothing is called at the address the
   * config names, so a credential that turns out to be wrong is
   * discovered by the next pipeline pass.
   *
   * The body reaches {@link createConnector} unparsed. That is the
   * module header's rule rather than an omission here.
   */
  router.post('/connectors', async (req, res) => {
    const created = await createConnector(options.store, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * PATCH /connectors/:id
   *
   * Rewrites the supplied members of one connector.
   *
   * **Side effects:** writes one `connectors` row, or none at all
   * for a patch carrying no member — `connectors` has no
   * `updated_at` for an empty write to stamp, so answering the
   * stored row without writing is the port's declared contract
   * rather than an optimisation here.
   *
   * `200` with the row afterwards rather than `204`, because a
   * patch whose whole point is a rewrite has an answer worth
   * reading: the name and the configuration as they now stand,
   * with every credential among them masked.
   *
   * ROTATING A CREDENTIAL IS THIS ROUTE, through a `config`
   * carrying the new value — and so is clearing one, through a
   * `config` that leaves its key out. The two requests differ only
   * in what they carry, because the document is replaced whole.
   */
  router.patch('/connectors/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchConnector(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /connectors/:id
   *
   * Removes one connector, while nothing still delivers through
   * it.
   *
   * **Side effects:** removes one `connectors` row, or none — the
   * count {@link deleteConnector} reads first is a read, and the
   * refusal it raises leaves the row exactly where it was.
   *
   * `204` and no body on the way that lands, because a deleted
   * resource has no representation to carry — and on this group
   * that also means the delete is not a last chance to read a
   * config.
   *
   * The two `409`s are different facts. The counted one names the
   * subscriptions holding the row and is answered without the
   * write being attempted; the uncounted one is the same foreign
   * key refusing at the database, after a subscription landed
   * between the count and the write. Retrying is the right next
   * act for the second and not for the first.
   *
   * NO CONFIRMATION GETS PAST EITHER. A domain cascade takes the
   * domain's own configuration, which an operator can authorise;
   * this would cancel deliveries other domains asked for, so the
   * refusal names `/exports` instead of offering a `?cascade`.
   */
  router.delete('/connectors/:id', async (req, res) => {
    await deleteConnector(options.store, readId(req.params));

    res.status(204).end();
  });

  return router;
}
