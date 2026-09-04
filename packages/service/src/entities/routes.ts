/**
 * @packageDocumentation
 * The HTTP surface over `src/entities/service.ts`: FOUR routes over
 * one subject, and nothing in them that decides anything.
 *
 * `GET /entities/:id` is {@link getEntity}, `PATCH /entities/:id`
 * is {@link patchEntity}, `GET /entities/:id/research` is
 * {@link listEntityResearch} and
 * `POST /entities/:id/approve-research` is
 * {@link approveEntityResearch}. What a handler adds over the call
 * it wraps is an address to narrow, a query to take apart or a body
 * to hand on, a status to choose and an envelope to write — so a
 * change to what the registry ACCEPTS, COMPUTES, REFUSES or
 * RATIFIES belongs one file over, and the cases that pin those
 * rules still need no server.
 *
 * ONE PATH SHAPE, BECAUSE A SUBJECT CARRIES THE REGISTRY IT SITS
 * IN. Every route here opens on `/entities/:id` and none opens on
 * `/domains/:slug`, which is the opposite of the two groups this
 * wave landed before it. A finding and a document are met in their
 * domain because a caller holding a slug should not have to look an
 * id up to read one; an entity is met by its id because the row
 * carries its own `domainId`, and that column is what the
 * cross-domain alias rule one file over is decided against. A slug
 * in the path would be a second answer to a question the row has
 * already settled, and this router would then have to say what a
 * disagreement between the two means. There is no
 * `GET /domains/:slug/entities` on this wave at all, so a registry
 * is read one subject at a time.
 *
 * THE RESEARCH COLLECTION HANGS OFF THE SUBJECT AND NOT OFF THE
 * DOMAIN, for the same reason: a research pass is about one entity,
 * `entity_research` carries that entity's id and nothing else that
 * addresses it, and a caller reading passes is already holding the
 * subject they were read about.
 *
 * `name_norm` IS COMPUTED ONE FILE OVER AND NOTHING HERE TOUCHES
 * IT. A patch carrying a `name` is reduced through
 * `normalizeEntityName` by {@link patchEntity}, and a body naming
 * `nameNorm` is refused by that module's strict schema as an
 * unrecognized key. No line below reads a name, reduces one or
 * copies a key half onto a patch — which is what keeps the single
 * definition `entities.name_norm` asked for from acquiring a second
 * one at the boundary. `docs/architecture/08-http-api.md` argues
 * the rule; this file is where it is visible as an absence.
 *
 * THE TWO ALIAS RULES ARE THE SERVICE'S TOO, and they are rules
 * about two ROWS rather than about a request: a subject aimed at
 * itself, and a subject aimed into another registry. Neither is
 * decidable from anything a handler holds — the second needs the
 * addressed row's `domainId` and the target's, which is two reads —
 * so both are raised where the reads are. What reaches the wire is
 * a `422` naming `aliasOf`, through the same `errorHandler` every
 * other refusal on this surface goes through.
 *
 * THE APPROVAL'S SUBJECT IS IN THE PATH AND ITS ROW IS IN THE BODY,
 * and the two are narrowed at different layers. This file checks
 * the segment and hands the body on whole;
 * {@link approveEntityResearch} parses `{ poolId }`, reads the
 * queued row and refuses one raised about another subject. So a
 * `POST /entities/abc/approve-research` is answered about the
 * segment before any row is read, and a well-formed address
 * carrying an intention somebody else raised is a `404` this file
 * has no part in composing.
 *
 * RATIFY AND NEVER RESEARCH, AND THAT IS THE STORE RATHER THAN
 * THIS ROUTER. {@link EntitiesRouterOptions} is handed the six
 * methods `src/entities/service.ts` reaches, of which two write:
 * `updateEntity` and `approvePoolRow`. Nothing on it writes
 * `entity_research`, because `EntityStore` declares no method that
 * does — that table is what a research pass found out and is
 * `ar-research`'s to write. So a route that recorded a summary
 * beside the approval could not be added here by a small edit:
 * there would be nothing for it to call. `Read-first` in
 * `docs/architecture/08-http-api.md` states that law once for the
 * whole wave, and `tests/invariants/api-read-first.test.ts` derives
 * it from `keyof` over the port types rather than from any
 * paragraph here.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON BOTH WRITES, which
 * is the ordering every sibling router keeps. Both service
 * functions parse their body BEFORE they resolve the subject, so a
 * malformed patch against an id nothing carries is a `422` about
 * the body rather than a `404` about the row — but each is handed
 * an id this file has already narrowed, so a segment that is not an
 * id is answered about the segment whatever the body says.
 *
 * THE QUERY IS READ BEFORE THE ADDRESS ON THE ONE PAGINATED LIST,
 * as it is on every paginated list route on this surface. Both
 * faults are facts about the request alone and neither costs a
 * read, so the ordering shows only when a request gets both wrong
 * — and a window this surface will not serve is the half a caller
 * can fix without knowing anything about what is stored.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a `NotFoundError` raised in the service is a
 * `404` carrying `{ code: 'NOT_FOUND', message }` on the wire, a
 * `ConflictError` is a `409`, and a `ValidationError` raised by the
 * boundary parser or by an alias rule is a `422` carrying its
 * sanitised `details`, with no line of this file involved in any of
 * the three.
 *
 * THIS IS THE ONE WAVE-3 GROUP THAT CAN ANSWER `409`. The findings
 * and documents routers cannot, having no conflicting state to
 * refuse; a rename here can collide with
 * `entities_domain_id_name_norm_unique`, and the write is where
 * that is found out. Nothing below anticipates it: the constraint
 * is the deployment's own authority at the instant of the write,
 * and a read-then-write pair in a handler would answer about a row
 * that had gone in between.
 *
 * THE ROWS ARE ANSWERED AS THE SERVICE ANSWERED THEM. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * which is those functions' stated contract, so what the port
 * projected is what `JSON.stringify` sees. The conversions a client
 * should know about are the framework's rather than this file's:
 * `researchedAt`, `createdAt` and both ruling stamps are `Date`
 * across the port and reach the wire as ISO-8601 strings, because
 * `res.json` serialises through `Date#toJSON`; an entity's
 * `attributes` and a research row's `payload` are whatever jsonb
 * held, answered whole. Nothing is added, hidden, cut or masked on
 * the way out — a registry entry is what a domain wrote about a
 * subject, and `src/entities/service.ts` records why this surface
 * masks where the failures queue and the documents list do.
 *
 * THE PATCH ANSWERS THE STORED ROW RATHER THAN THE REQUEST. What
 * comes back is read off the write, so the key half the caller
 * never submitted is in it — which is what makes the response a
 * reading of what happened rather than an echo of what was asked
 * for, and is the only way a client learns what the name reduced
 * to.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule: the string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. An `/entities` mount would put the prefix in
 * `src/index.ts` and the rest of each path here. The argument is in
 * `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which `approveResearchSchema` refuses
 * like any other bad shape and `patchEntitySchema` refuses for the
 * same reason, every member of it being optional but the object
 * itself not being. Neither GET reads a body at all: one carrying a
 * body is answered exactly as one that did not.
 *
 * `./routes.test.ts` is where the wire is read. It is scoped to
 * what a client sees — the two `200` reads, the `200` patch
 * answering the stored row, the paginated research envelope and its
 * `meta`, the `200` approval carrying the ruling projection, the
 * `404` for an intention raised about another subject, the `409`
 * for a rename onto a key already held, and the `422` for an
 * undeclared key on either write — rather than to the structural
 * claims above, which `tests/invariants/api-read-first.test.ts`
 * makes over the port types for the whole wave at once.
 */
import type { EntitiesServiceStore } from './service.js';
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
  approveEntityResearch,
  getEntity,
  listEntityResearch,
  patchEntity,
} from './service.js';

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from the findings router or
 * from a wave-1 one, where the identical const is private. The
 * routers are equal by intent rather than by derivation: exporting
 * one router's address schema would make that agreement look like a
 * dependency, and the day a group needs a second path parameter it
 * would be editing a symbol every other router reads.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and `entities.id` is `bigserial` in drizzle's `number`
 * mode. What reaches each service function is therefore the
 * `number` its signature takes, narrowed at the boundary rather
 * than inside the rules.
 *
 * ONE SCHEMA FOR ALL FOUR ROUTES, because all four address the same
 * row by the same segment. The two writes and the two reads differ
 * in what they do with the subject and not in how they name it.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared, so the only field a detail built from this parse
 * can name is `id`.
 */
const entityAddressSchema = z
  .object({ id: resourceIdParamSchema })
  .strict();

/** Everything {@link buildEntitiesRouter} needs. */
export interface EntitiesRouterOptions {
  /**
   * Where the subject is read, rewritten, researched and ruled on.
   *
   * `EntitiesServiceStore` and not `EntityStore` whole: it is the
   * `Pick` of six `src/entities/service.ts` declares, so this
   * router asks for exactly what those four functions reach and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * TWO OF THE PORT'S EIGHT METHODS ARE ABSENT, and the absence is
   * a statement rather than a narrowing dressed up as one.
   * `listEntityPool` and `countEntityPool` page a queue no route on
   * this wave serves, which `src/entities/store.ts` records on each
   * of them; naming them here would have this router claim to need
   * a collection it does not answer.
   *
   * NO `DomainStore` SITS BESIDE IT, which is where this group
   * departs from the two before it. A findings or a documents route
   * resolves a slug before it can read anything; every route here
   * opens on the row's own id, and the registry a subject belongs
   * to arrives on the subject.
   *
   * TWO WRITERS AMONG THE SIX, and both are named: `updateEntity`
   * rewrites the supplied members of one `entities` row, and
   * `approvePoolRow` stamps two columns of one `research_pool` row.
   * Nothing on this store writes `entity_research`, `findings` or a
   * schedule column, so no handler below could record a research
   * pass even by accident — there being nothing to call.
   *
   * NO CLOCK SITS BESIDE IT EITHER. Nothing on these four routes
   * reads the present: a research pass carries the instant it ran
   * at, and the approval's own stamp is `coalesce(approved_at,
   * now())` inside the write rather than a value composed here.
   */
  readonly store: EntitiesServiceStore;
}

/**
 * Reads the `:id` a request addressed a subject by.
 *
 * @param params - `req.params`. Typed `unknown` on purpose: Express
 *   types it as a record of strings, and a boundary that trusts its
 *   own framework's typing is not one.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `GET /entities/abc` is a 422 raised before any store call rather
 * than the 404 an uncoerced lookup would eventually answer, and the
 * distinction is the whole reason this runs first: a 404 says no
 * entity carries that id, which is a claim about the registry, and
 * `abc` is not an id for the registry to have been asked about.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link entityAddressSchema}.
 */
function readId(params: unknown): number {
  return parseBody(entityAddressSchema, params).id;
}

/**
 * Builds the entities router.
 *
 * @param options - The store to act against; see
 *   {@link EntitiesRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /entities/:id` — one subject of one registry, whole.
 *   `200` with `{ success: true, data }` carrying the stored row:
 *   its `domainId`, its `name`, the `nameNorm` computed from it,
 *   its `aliasOf` and its `attributes`. `404` when no entity
 *   carries the id, `422` for a segment that is not one. Reads no
 *   query at all. A row that IS an alias is answered as it stands
 *   rather than resolved to what it points at.
 * - `PATCH /entities/:id` — rewrites the supplied members. `200`
 *   with the stored row afterwards, read off the write rather than
 *   rebuilt from the request. `404` when no entity carries the id.
 *   `409` when the reduced name is one another subject in the same
 *   domain already holds. `422` for a segment that is not an id,
 *   for a body that is not `{ name?, attributes?, aliasOf? }`, for
 *   an undeclared key in it — `nameNorm` among them — for a name
 *   that carries nothing identifying, for an `aliasOf` naming the
 *   subject itself, one naming a subject in another domain, and one
 *   naming no subject at all. A body of `{}` is a legal call
 *   answering the stored row.
 * - `GET /entities/:id/research` — one page of what has been found
 *   out about the subject, `researchedAt` descending with `id`
 *   descending breaking a tie. `200` with
 *   `{ success: true, data: [...], meta }`, where `meta` is
 *   `{ page, perPage, total, totalPages }` and `total` is the whole
 *   collection, there being no filter on it. `404` when no entity
 *   carries the id, which is what tells a mistyped id from a
 *   subject nothing has researched yet. `422` for a segment that is
 *   not an id, for a `?page` below 1, a `?perPage` above 200, a
 *   non-integer in either, or any undeclared query parameter — the
 *   last of those naming `query` rather than the parameter. A
 *   subject nobody has researched and a page past the end are each
 *   `200` with an empty `data`.
 * - `POST /entities/:id/approve-research` — one operator ruling on
 *   one queued intention. `200` with `{ success: true, data }`
 *   carrying the four-member ruling: the row's id, where it stands,
 *   when a person agreed, and when the intention was closed. `404`
 *   when no entity carries the id, and when the body names an
 *   intention nothing carries or one raised about another subject
 *   — one sentence for both, since a caller is not entitled to
 *   learn that a row it does not own exists. `422` for a segment
 *   that is not an id, for a body that is not `{ poolId }`, and for
 *   an undeclared key in it.
 *
 * TWO OF THE FOUR WRITE, AND NEITHER WRITES WHAT IT RULED ON. The
 * patch rewrites `entities` and the approval stamps `research_pool`
 * — per {@link EntitiesRouterOptions}, those are the only two
 * writers on the store this router holds. Both reads are reads.
 *
 * `409` IS AVAILABLE HERE AND ON NO OTHER WAVE-3 GROUP, and it has
 * exactly one cause: `entities_domain_id_name_norm_unique` refusing
 * a rename onto a key another subject in the same domain already
 * holds. It carries no `details`, because which subject holds the
 * key is a fact about a row the caller did not ask about and, the
 * display spelling being free to differ, may never have seen.
 *
 * All four can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildEntitiesRouter(
  options: EntitiesRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /entities/:id
   *
   * One subject of one registry.
   *
   * **Side effects:** none, and none reachable from here.
   * {@link getEntity} names one port method and it is a read; the
   * two writers on the store below are not among what it can call,
   * the narrowing being in that function's signature rather than in
   * this handler's discipline.
   *
   * `ok()` rather than `okPage()`, because what is answered is one
   * row rather than a window over a collection. Nothing on the row
   * is cut, masked or projected: every column of a registry entry
   * is answerable, including the `nameNorm` no caller can submit.
   */
  router.get('/entities/:id', async (req, res) => {
    const entity = await getEntity(options.store, readId(req.params));

    res.status(200).json(ok(entity));
  });

  /**
   * PATCH /entities/:id
   *
   * Rewrites the supplied members of one subject.
   *
   * **Side effects:** rewrites one `entities` row, or none. Every
   * refusal {@link patchEntity} raises other than the conflict is
   * raised before the write, and the conflict is the write being
   * refused — so a request that is turned away leaves the registry
   * exactly as it found it.
   *
   * THE BODY IS HANDED ON UNPARSED. `patchEntitySchema` belongs to
   * {@link patchEntity}, so one parse serves this route and the MCP
   * tool over the same act, and a handler cannot come to disagree
   * with the operation about what a patch is. What this file
   * narrows is the ADDRESS and nothing else — in particular it does
   * not reduce a name, compare two domains or ask whether a row is
   * its own alias, all three of which need reads this handler does
   * not make.
   *
   * `200` with the stored row rather than `204`, because the answer
   * carries something the request did not: a `name` patch is stored
   * beside a `nameNorm` computed from it, and reading that back is
   * the only way a client learns what its name reduced to.
   */
  router.patch('/entities/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchEntity(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * GET /entities/:id/research
   *
   * One page of what has been found out about a subject.
   *
   * **Side effects:** none, and none reachable, per the get above.
   * Both port methods behind this handler are reads, and neither
   * writes `entity_research`: this route ANSWERS that table and
   * nothing on this surface writes it.
   *
   * The query is parsed before the address, so an over-cap
   * `?perPage` costs no read and is answered about the parameter
   * the caller typed. `toStoreWindow` owns the
   * `(page - 1) * perPage` arithmetic and `buildPaginationMeta`
   * derives `totalPages`, so the two numbers a client pages by are
   * computed in one place each and this handler does no arithmetic
   * of its own.
   *
   * No filter is read, so there is none to rebuild and no value
   * object to hand across: `?page` and `?perPage` are the whole of
   * this route's query, and the total counts the whole collection
   * rather than a narrowed part of it.
   *
   * `meta` echoes the window that was ASKED FOR rather than the
   * rows that came back: `?page=99` over a subject with one page of
   * passes answers `page: 99` beside `totalPages: 1`, which is how
   * a caller sees that it overshot.
   */
  router.get('/entities/:id/research', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const id = readId(req.params);
    const page = await listEntityResearch(
      options.store,
      id,
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
   * POST /entities/:id/approve-research
   *
   * Records that a person ruled in favour of one queued intention.
   *
   * **Side effects:** stamps `approved_at` and `status` on one
   * `research_pool` row, or nothing. No research is recorded and no
   * search is issued: the ratify-and-never-write split is
   * `EntityStore`'s, per {@link EntitiesRouterOptions}, and this is
   * the one write reachable from this handler.
   *
   * `POST` AND NOT `PATCH`, because what the request does is give a
   * ruling rather than edit the row it is given about. The
   * addressed resource is the SUBJECT, the ruling is an act
   * performed against one of its queued intentions, and the row
   * that moves is named in the body rather than in the path.
   *
   * `200` AND NOT `201`, because nothing was created: the queued
   * row already existed and what changed is two of its columns.
   * There is no new resource to answer a `Location` for.
   *
   * A SECOND RULING IS A `200` AND NOT A `409`. The write is
   * `coalesce(approved_at, now())`, so ruling twice answers the
   * FIRST ruling's instant and a row already closed ratifies
   * without complaint — which is `RULING_ACTS` in
   * `src/approvals/ruling.ts` rather than a rule of this route's,
   * and is where this gate differs from the proposal gate one group
   * over. `An approval is idempotent` in
   * `docs/architecture/08-http-api.md` argues it.
   *
   * THE BODY IS HANDED ON UNPARSED, per the patch above.
   * {@link approveEntityResearch} owns `approveResearchSchema`, the
   * comparison that refuses an intention raised about another
   * subject, and the single sentence both of that comparison's
   * refusals answer. Nothing here composes a refusal or reads a
   * queued row.
   */
  router.post('/entities/:id/approve-research', async (req, res) => {
    const id = readId(req.params);
    const ruling = await approveEntityResearch(
      options.store,
      id,
      req.body,
    );

    res.status(200).json(ok(ruling));
  });

  return router;
}
