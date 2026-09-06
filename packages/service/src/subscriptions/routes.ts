/**
 * @packageDocumentation
 * The HTTP surface over `src/subscriptions/service.ts`: five
 * routes, and nothing in them that decides anything.
 *
 * `GET /domains/:slug/exports` is {@link listSubscriptions},
 * `POST /domains/:slug/exports` is {@link createSubscription},
 * `PATCH /exports/:id` is {@link patchSubscription},
 * `DELETE /exports/:id` is {@link deleteSubscription} and
 * `POST /exports/:id/run-now` is {@link runSubscriptionNow}. What
 * a handler adds over the call it wraps is an address to read, a
 * window to derive, a status to choose and an envelope to write —
 * so a change to a subscription RULE belongs one file over, and
 * the cases that pin those rules still need no server.
 *
 * THE PATH BASE AND THE DIRECTORY NAME DIFFER, WHICH IS DELIBERATE
 * AND IS THE FIRST THING TO SAY HERE. The routes answer under
 * `/exports` and this module sits in `src/subscriptions/`, because
 * `src/exports/` is already taken by the RENDERER registry q12
 * fills and a subscription is not a renderer: one is a standing
 * request to deliver a domain's material on a cadence, the other
 * is the code that turns that material into bytes of one format.
 * The table is `export_subscriptions`, so the directory is named
 * for what it holds. The prefix is `/exports` because that is what
 * a caller is asking for — an export, delivered on a schedule —
 * and because `/subscriptions` would read as a billing noun on a
 * surface that has none.
 * `docs/architecture/08-http-api.md` records the split twice, once
 * in the wave-2 prefix table and once in this group's own section,
 * so neither reads as a directory somebody misfiled.
 *
 * FIVE ROUTES RATHER THAN FOUR, and the fifth is the schedule
 * verb. It takes no window, answers no collection, and writes one
 * column the other four cannot name at all:
 * `POST /exports/:id/run-now` moves `next_run_at` to the clock's
 * instant. `docs/architecture/08-http-api.md` states the rules it
 * answers to once, under `Schedule verbs`, because the topics
 * group has a run-now of its own answering to the same ones.
 *
 * THERE IS NO PAUSE UNDER THIS PREFIX, which is the one place this
 * router is SHORTER than `src/topics/routes.ts` rather than a
 * transcription of it. A pause defers a question that would
 * otherwise be asked; a delivery nobody wants for a while is one
 * an operator switches off with `enabled: false` and switches back
 * on, since a subscription that skipped three cycles and one that
 * was suspended are the same thing to a reader of the digest. The
 * verb would be additive if that turns out to be wrong.
 *
 * THE CONTAINMENT IS WHAT A HANDLER DOES AND NOT WHAT IT HOLDS.
 * `SubscriptionServiceStore` names `updateSubscriptionSchedule`,
 * so the store every handler below is given CAN write
 * `next_run_at`. What keeps the four resource routes off the
 * column is that none of them derives an instant to write,
 * `SubscriptionPatch` carries no such member, and both request
 * schemas refuse the key. The verb derives one and writes it
 * through the single service function that owns the column, which
 * is the same containment read from the other side.
 * `tests/invariants/api-schedule-containment.test.ts` makes it a
 * property of the tree, since it reads the modules rather than the
 * types.
 *
 * THE CLOCK IS SUPPLIED RATHER THAN READ, and it is a thunk for
 * the reason `AuthRouterOptions.clock` gives: a router is built
 * once at boot and answers for the life of the process, so a
 * captured `Date` would freeze every instant the verb writes at
 * the moment the wiring ran. It is REQUIRED rather than defaulted,
 * so no caller can mount the verb without having said which
 * present it answers against — which is also what lets a case
 * compare a written instant exactly rather than against a window
 * around the real one.
 *
 * TWO PATH SHAPES, BECAUSE A SUBSCRIPTION IS MET IN ITS DOMAIN AND
 * WRITTEN BY ITS ID. The collection hangs off `/domains/:slug`,
 * since a subscription is a standing request for what one domain
 * produces and a caller holding a slug should not have to look an
 * id up to read it. The other three address `/exports/:id`: the
 * row carries its own `domainId`, the one rule that spans a domain
 * — a format delivered to a connector at most once — is the
 * database's, and repeating the slug in the path would let a
 * request name a domain the row does not belong to, a disagreement
 * this router would then have to answer for.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in every router before
 * it and for the same reason. {@link createSubscription} and
 * {@link patchSubscription} take an `unknown` and parse it
 * themselves, because a body contract belongs to the operation
 * rather than to whichever caller reached it, and a body validated
 * by the router would leave a second caller validating against a
 * second schema nobody would notice drifting.
 * `src/mcp/tools/wave-2.ts` reaches {@link runSubscriptionNow} and
 * neither write, so the rule is about where the contract lives
 * rather than about who calls it.
 * What a router owns instead is what only HTTP has: the `:slug`
 * and the `:id` in the path, and the `?page`/`?perPage` window.
 *
 * THIS LIST ROUTE IS PAGINATED and reads no parameter beyond the
 * window, which is where it follows every list route on the
 * surface except `GET /connectors`. Nothing caps how many standing
 * requests a domain may hold, and a `?format` or a `?connectorId`
 * filter would be a narrowing nobody has asked for over a
 * collection a page already holds.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON A PATCH, and NOT on
 * a create — which is the service's ordering rather than this
 * file's, and is worth naming here because the two routes look
 * symmetric. {@link patchSubscription} is handed an id this file
 * has already narrowed, so `PATCH /exports/abc` carrying a
 * malformed body is answered about the segment.
 * {@link createSubscription} parses its body before it resolves
 * the slug, so a `POST` carrying both an unroutable slug and a
 * malformed body is answered about the body: a body's shape is a
 * fact about the request alone, and answering it a 422 or a 404
 * depending on what happens to be stored would make a caller's
 * error depend on rows it never asked about.
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
 * triple the domain already subscribes to is a 409, a disabled row
 * met by the verb is a 409, and a `ValidationError` raised by the
 * boundary parser or by the connector lookup is a 422 carrying its
 * sanitised `details`, with no line of this file involved in any
 * of them.
 *
 * THE RECORD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` and
 * `okPage()` carry their argument by reference and reshape
 * nothing, which is those functions' stated contract, so what a
 * store projected is what `JSON.stringify` sees. The one
 * conversion a client should know about is the framework's rather
 * than this file's: `nextRunAt` is a `Date` across the port and
 * reaches the wire as an ISO-8601 string, because `res.json`
 * serialises through `Date#toJSON` — or as `null`, which is what a
 * subscription nobody has scheduled carries and what every create
 * below lands. Nothing is added, hidden or renamed on the way out;
 * `SubscriptionRecord` in `./store.ts` records why the whole row
 * is safe to answer with, and this table holds no secret: the
 * credential a delivery authenticates with lives in a connector's
 * `config`, which `GET /connectors` masks and which nothing here
 * reads at all.
 *
 * THE PIPELINE-OWNED COLUMN IS ANSWERED AND NEVER ACCEPTED, which
 * is the surface-wide rule applied to the one column on this table
 * the dispatcher writes. `nextRunAt` is projected on every read
 * here and refused as an unrecognized key by both request schemas
 * one file over, so a caller can see when a delivery next comes
 * due and cannot move it except through the verb below — which
 * names the column in no body and works out what to store from the
 * clock instead.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule. The string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository: a `/domains` mount would put `/domains/:slug` in one
 * file and `/domains/:slug/exports` in this one. The argument is
 * in `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas
 * refuse like any other bad shape.
 */
import type { SubscriptionServiceStore } from './service.js';
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
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  patchSubscription,
  runSubscriptionNow,
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
 * drizzle's `number` mode. What reaches {@link patchSubscription},
 * {@link deleteSubscription} and {@link runSubscriptionNow} is
 * therefore the `number` their signatures take, narrowed at the
 * boundary rather than inside the rules.
 */
const subscriptionAddressSchema = z.object({
  id: resourceIdParamSchema,
}).strict();

/**
 * What the MCP tool over this group's one read is called with.
 *
 * ONE OBJECT WHERE A REQUEST HAS TWO HALVES. An HTTP route parses
 * its address and its query apart, and a tool is handed a single
 * arguments object — so every entry in `src/mcp/tools/wave-2.ts`
 * names one schema covering the whole request, spread from the
 * pieces this route already parses rather than written again.
 *
 * The address consts above stay private. Nothing here exports one,
 * so the sibling routers' claim that they agree by intent rather
 * than by derivation is untouched by this pair.
 */
export const subscriptionListToolInputSchema = z.object({
  ...domainAddressSchema.shape,
  ...paginationQuerySchema.shape,
}).strict();

/**
 * What the MCP tool over `POST /exports/:id/run-now` is called
 * with.
 *
 * The address is the whole of this request. The route reads no
 * body and {@link runSubscriptionNow} takes none, so the tool
 * declares no member beyond the id and `.strict()` refuses
 * anything a caller added — which is the same answer the route
 * gives a body, arrived at by refusing rather than by ignoring.
 */
export const subscriptionRunNowToolInputSchema = z.object({
  ...subscriptionAddressSchema.shape,
}).strict();

/** Everything {@link buildSubscriptionsRouter} needs. */
export interface SubscriptionsRouterOptions {
  /**
   * Where the domain and the connector are resolved and the
   * subscriptions are read and written. `SubscriptionServiceStore`
   * and not any of the three ports whole: it is the intersection of
   * the three `Pick`s the service declares, so this router asks for
   * the methods that module reaches and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * It NAMES `updateSubscriptionSchedule`, and exactly one of the
   * five handlers below calls it: one type stands for all five
   * functions rather than a second `Pick` being kept in step with
   * the first. What keeps the other four off `next_run_at` is
   * stated in this module's header.
   */
  readonly store: SubscriptionServiceStore;

  /**
   * Reads the present, for the instant the run-now writes.
   *
   * Named `clock` here and `now` one level down, exactly as
   * `AuthRouterOptions` names the same dependency: at this level it
   * is what is being supplied, and at that one it is the reading
   * being taken. A thunk rather than a `Date`, because a router
   * built once at boot answers for the life of the process and a
   * captured instant would freeze every write.
   *
   * REQUIRED rather than defaulted to `() => new Date()`. A default
   * would let a caller mount the verb without having said which
   * present it answers against, and the one place that silence
   * would show is a case comparing a written instant against one it
   * chose.
   */
  readonly clock: () => Date;
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
 * Reads the `:id` a request addressed a subscription by.
 *
 * @param params - `req.params`, unknown for the reason
 *   {@link readSlug} gives.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `PATCH /exports/abc` is a 422 raised before any store call rather
 * than the 404 an uncoerced lookup would eventually answer, and the
 * distinction is the whole reason this runs first: a 404 says no
 * subscription carries that id, which is a claim about the table,
 * and `abc` is not an id for the table to have been asked about.
 */
function readId(params: unknown): number {
  return parseBody(subscriptionAddressSchema, params).id;
}

/**
 * Builds the export subscriptions router.
 *
 * @param options - The store to act against and the clock the verb
 *   reads; see {@link SubscriptionsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /domains/:slug/exports` — one page of the domain's
 *   standing export requests, format ascending with the connector
 *   id ascending beside it. `200` with
 *   `{ success: true, data: [...], meta }`, where `meta` is
 *   `{ page, perPage, total, totalPages }`. `404` with
 *   `code: 'NOT_FOUND'` when no domain carries the slug, which is
 *   what tells a domain exporting nothing from a domain that is not
 *   there. `422` when the segment is not a slug, for a `?page`
 *   below 1, a `?perPage` above 200, a non-integer in either, or
 *   any undeclared query parameter — the last of those naming
 *   `query` rather than the parameter. A page past the end of the
 *   collection is `200` with an empty `data` and not a `404`.
 * - `POST /domains/:slug/exports` — adds one subscription,
 *   UNSCHEDULED. `201` with `{ success: true, data }` carrying the
 *   stored row, the database's own id, a `nextRunAt` of `null` and
 *   an `enabled` of true unless the body said otherwise. `422` for
 *   a body `createSubscriptionSchema` refuses, one detail per
 *   fault, for a `connectorId` no connector carries, and for a
 *   segment that is not a slug; `404` for an unknown slug, and for
 *   a domain deleted between the lookup and the write; `409` with
 *   `code: 'CONFLICT'` when the domain already exports that format
 *   to that connector.
 * - `PATCH /exports/:id` — rewrites the supplied members. `200`
 *   with the stored row afterwards. `422` for a body
 *   `patchSubscriptionSchema` refuses, for a `connectorId` no
 *   connector carries, and for a segment that is not an id; `404`
 *   when no subscription carries the id; `409` when the resulting
 *   triple is one the domain already subscribes to. A patch
 *   carrying no member is a legal call answering the row unchanged,
 *   and `domainId` is not patchable at all, so no request here can
 *   move a subscription between domains.
 * - `DELETE /exports/:id` — cancels one. `204` with no body.
 *   `404` when no subscription carries the id, `422` for a segment
 *   that is not one. Never `409`: nothing in schema v2 points at
 *   `export_subscriptions`, so there is no guard here and no
 *   `?cascade=confirm` for one to be waived by.
 * - `POST /exports/:id/run-now` — brings the next delivery forward
 *   to the clock's instant. `200` with the stored row afterwards,
 *   whose `nextRunAt` is that instant. `404` when no subscription
 *   carries the id, `422` for a segment that is not one, `409` with
 *   `code: 'CONFLICT'` when the subscription is disabled — such a
 *   row is outside `export_subscriptions_dispatch_claim_idx` and
 *   would look due forever without ever being claimed. Reads no
 *   body, and calling it twice is not refused.
 *
 * A TRIPLE IS A 409 FROM BOTH WRITES, which this group has in
 * common with the topics, personas and connectors groups.
 * `patchSubscriptionSchema` carries `format` and `connectorId`, two
 * thirds of the natural key, so a re-format or a re-point can reach
 * `export_subscriptions_domain_id_format_connector_id_unique`
 * exactly as a create can.
 *
 * A `connectorId` NAMING NO ROW IS A 422 AND NOT A 404 from both
 * writes that can name one, which is the difference between an
 * address and a payload: a `:slug` is where the request was SENT,
 * and a `connectorId` is something it SUBMITTED. The detail names
 * `connectorId` and carries `code: 'unknown_connector'`, which is
 * the service's own code rather than one of zod's.
 *
 * `nextRunAt` IS ANSWERED BY ALL FIVE AND ACCEPTED BY NONE. It is
 * refused as an unrecognized key by both request schemas, which is
 * `.strict()` doing its ordinary work rather than a check of its
 * own. The one route that MAY write it is the verb, and what it
 * writes is the injected clock's instant rather than anything read
 * off a request.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildSubscriptionsRouter(
  options: SubscriptionsRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /domains/:slug/exports
   *
   * One page of a domain's export subscriptions.
   *
   * **Side effects:** none.
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
   *
   * No connector is joined in. A row answers the id it delivers to,
   * and a caller wanting to know where that is reads
   * `GET /connectors` — one request for the whole page rather than
   * one per row, and the surface that masks a config.
   */
  router.get('/domains/:slug/exports', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const slug = readSlug(req.params);
    const window = toStoreWindow(query);
    const page = await listSubscriptions(options.store, slug, window);
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /domains/:slug/exports
   *
   * Adds one export subscription to a domain, unscheduled.
   *
   * **Side effects:** writes one `export_subscriptions` row.
   *
   * `201` rather than `200`, because the answer is a resource that
   * did not exist when the request was made. No `Location` header:
   * the created row travels in the body carrying the id the three
   * routes below address it by, so a header would restate what the
   * caller already has back.
   *
   * The row lands with a `nextRunAt` of null whatever was
   * submitted, which is `InsertSubscriptionInput` carrying no such
   * member rather than anything this handler does. Scheduling it is
   * the separate act `POST /exports/:id/run-now` performs.
   *
   * The body reaches {@link createSubscription} unparsed. That is
   * the module header's rule rather than an omission here.
   */
  router.post('/domains/:slug/exports', async (req, res) => {
    const slug = readSlug(req.params);
    const created = await createSubscription(options.store, slug, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * PATCH /exports/:id
   *
   * Rewrites the supplied members of one subscription.
   *
   * **Side effects:** writes one `export_subscriptions` row, or
   * none at all for a patch carrying no member —
   * `export_subscriptions` has no `updated_at` for an empty write
   * to stamp, so answering the stored row without writing is the
   * port's declared contract rather than an optimisation here.
   *
   * `200` with the row afterwards rather than `204`, because a
   * patch whose whole point is a rewrite has an answer worth
   * reading: the format, the destination and the cadence as they
   * now stand, which is what an operator retuning a delivery came
   * to see.
   *
   * The edit takes effect on the following delivery and there is
   * nothing to announce afterwards, including when the cadence
   * itself moved: `ar-dispatch` reads `interval_seconds` inside the
   * claim it reschedules with, so a new cadence is in force from
   * the next tick without anything here touching `next_run_at`.
   */
  router.patch('/exports/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchSubscription(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /exports/:id
   *
   * Cancels one export subscription.
   *
   * **Side effects:** removes one `export_subscriptions` row, and
   * nothing else: no foreign key in schema v2 points at this table,
   * so there is nothing to cascade and nothing to guard. What has
   * already gone out is unaffected — the dispatcher claims a row
   * and commits its reschedule in one transaction, so by the time a
   * delete can take the row the render it claimed for has shipped.
   *
   * `204` and no body, because a cancelled subscription has no
   * representation to carry. A delete and a disable are different
   * operations and this surface offers both: `enabled: false`
   * through the patch keeps the format, the destination and the
   * cadence and stops the subscription coming due.
   */
  router.delete('/exports/:id', async (req, res) => {
    await deleteSubscription(options.store, readId(req.params));

    res.status(204).end();
  });

  /**
   * POST /exports/:id/run-now
   *
   * Brings one subscription's next delivery forward to the clock's
   * instant.
   *
   * **Side effects:** writes `next_run_at` on one
   * `export_subscriptions` row and no other column —
   * `SubscriptionStore.updateSubscriptionSchedule` takes a bare
   * instant, so there is no member a second one could reach.
   *
   * `200` rather than `202`, and the difference is worth naming
   * because a route spelled `run-now` invites the other reading. A
   * `202` would say the work has been accepted and is under way,
   * which is not what happened: nothing here renders or delivers
   * anything. What the request produced is a stored row whose due
   * time has moved, the answer carries that row, and `ar-dispatch`
   * picks it up on the tick that follows.
   *
   * No body is read. `express.json()` having parsed one changes
   * nothing, because {@link runSubscriptionNow} takes no such
   * argument, so a request that sent a body is answered exactly as
   * one that did not.
   */
  router.post('/exports/:id/run-now', async (req, res) => {
    const id = readId(req.params);
    const ran = await runSubscriptionNow(options.store, options.clock, id);

    res.status(200).json(ok(ran));
  });

  return router;
}
