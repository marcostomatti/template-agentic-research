/**
 * @packageDocumentation
 * The HTTP surface over `src/personas/service.ts`: four routes, and
 * nothing in them that decides anything.
 *
 * `GET /domains/:slug/personas` is {@link listPersonas},
 * `POST /domains/:slug/personas` is {@link createPersona},
 * `PATCH /personas/:id` is {@link patchPersona} and
 * `DELETE /personas/:id` is {@link deletePersona}. What a handler
 * adds over the call it wraps is an address to read, a window to
 * derive, a status to choose and an envelope to write — so a
 * change to a persona RULE belongs one file over, and the cases
 * that pin those rules still need no server.
 *
 * TWO PATH SHAPES, BECAUSE A PERSONA IS MET IN ITS DOMAIN AND
 * WRITTEN BY ITS ID. The collection hangs off `/domains/:slug`,
 * since system text is written ABOUT the subject a domain names and
 * a caller holding a slug should not have to look an id up to read
 * it. The two writes address `/personas/:id` instead: the row
 * carries its own `domainId`, the one rule that spans a domain — a
 * role unique within it — is the database's, and repeating the
 * slug in the path would let a request name a domain the row does
 * not belong to, a disagreement this router would then have to
 * answer for. `docs/architecture/08-http-api.md` records that split
 * beside the rest of the surface.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in the two sibling
 * routers and for the same reason. {@link createPersona} and
 * {@link patchPersona} take an `unknown` and parse it themselves,
 * because wave 3 exposes those same functions as MCP tools and a
 * body validated by the router would leave that caller validating
 * against a second schema nobody would notice drifting. What a
 * router owns instead is what only HTTP has: the `:slug` and the
 * `:id` in the path, and the `?page`/`?perPage` window.
 *
 * THIS LIST ROUTE IS PAGINATED, which is where it follows
 * `GET /domains` and `GET /categories/:id/terms` rather than
 * `GET /domains/:slug/categories`. A domain's personas are the same
 * kind of collection its terms are: operator-authored, unbounded in
 * principle, and read one window at a time. The taxonomy is the one
 * wave-1 list that is not, because a two-level tree has no page to
 * describe; nothing caps how many roles a pipeline may come to
 * play, so this collection does.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON A PATCH, and NOT on
 * a create — which is the service's ordering rather than this
 * file's, and is worth naming here because the two routes look
 * symmetric. {@link patchPersona} is handed an id this file has
 * already narrowed, so a `PATCH /personas/abc` carrying a malformed
 * body is answered about the segment. {@link createPersona} parses
 * its body before it resolves the slug, so a `POST` carrying both
 * an unroutable slug and a malformed body is answered about the
 * body: a body's shape is a fact about the request alone, and
 * answering it a 422 or a 404 depending on what happens to be
 * stored would make a caller's error depend on rows it never asked
 * about.
 *
 * THE QUERY IS READ BEFORE THE ADDRESS ON THE LIST, as it is on
 * both sibling list routes that declare one. Both faults are facts
 * about the request alone and neither costs a read, so the ordering
 * shows only when a request gets both wrong — and a window this
 * surface will not serve is the half a caller can fix without
 * knowing anything about what is stored.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a {@link NotFoundError} raised in the service
 * is a 404 carrying `{ code: 'NOT_FOUND', message }` on the wire, a
 * role the domain already carries is a 409, and a
 * `ValidationError` raised by the boundary parser is a 422 carrying
 * its sanitised `details`, with no line of this file involved in
 * any of them.
 *
 * THE RECORD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * which is those functions' stated contract, so what a store
 * projected is what `JSON.stringify` sees. `personas` carries no
 * timestamp columns, so unlike a domain there is no `Date` on the
 * way out and nothing the framework converts: `PersonaRecord` in
 * `./store.ts` is on the wire member for member, system text
 * included — that record's own header records why the whole row
 * is safe to answer with.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule. The string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository: a `/domains` mount would put `/domains/:slug` in one
 * file and `/domains/:slug/personas` in this one. The argument is
 * in `docs/architecture/08-http-api.md`, which records the `/auth`
 * mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas refuse
 * like any other bad shape.
 */
import type { PersonaServiceStore } from './service.js';
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
  createPersona,
  deletePersona,
  listPersonas,
  patchPersona,
} from './service.js';

/**
 * The `:slug` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from either sibling router,
 * where the identical const is private. The three are equal by
 * intent rather than by derivation: exporting one router's address
 * schema would make that agreement look like a dependency, and the
 * day a group needs a second path parameter it would be editing a
 * symbol three other routers read.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared (measured — `Object.keys(req.params)` is
 * `['slug']` on the two routes that take one), so the only field a
 * detail built from this parse can name is `slug`.
 */
const domainAddressSchema = z.object({ slug: slugParamSchema }).strict();

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and every id column in schema v2 is `bigserial` in
 * drizzle's `number` mode. What reaches {@link patchPersona} and
 * {@link deletePersona} is therefore the `number` their signatures
 * take, narrowed at the boundary rather than inside the rules.
 */
const personaAddressSchema = z.object({ id: resourceIdParamSchema }).strict();

/** Everything {@link buildPersonasRouter} needs. */
export interface PersonasRouterOptions {
  /**
   * Where the domain is resolved and its personas are read and
   * written. `PersonaServiceStore` and not either port whole: it is
   * the intersection of the two `Pick`s the service declares, so
   * this router asks for exactly the methods the four functions
   * below reach and `tests/helpers/memory-research-store.ts` can
   * stand behind it with no database up.
   *
   * The only member, and an options object regardless, so the four
   * sibling wave-1 routers are built the same way and a dependency
   * added here later is not a signature change at the one call site
   * in `src/index.ts`.
   */
  readonly store: PersonaServiceStore;
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
 * load-bearing rather than decorative — a route parameter
 * reaches a handler URL-DECODED, so `%2F` arrives as a real `/`
 * (measured), and only a pattern refuses it.
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
 * Reads the `:id` a request addressed a persona by.
 *
 * @param params - `req.params`, unknown for the reason
 *   {@link readSlug} gives.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `PATCH /personas/abc` is a 422 raised before any store call
 * rather than the 404 an uncoerced lookup would eventually answer,
 * and the distinction is the whole reason this runs first: a 404
 * says no persona carries that id, which is a claim about the
 * table, and `abc` is not an id for the table to have been asked
 * about.
 */
function readId(params: unknown): number {
  return parseBody(personaAddressSchema, params).id;
}

/**
 * Builds the personas router.
 *
 * @param options - The store to act against; see
 *   {@link PersonasRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /domains/:slug/personas` — one page of the domain's
 *   personas, role ascending. `200` with
 *   `{ success: true, data: [...], meta }`, where `meta` is
 *   `{ page, perPage, total, totalPages }`. `404` with
 *   `code: 'NOT_FOUND'` when no domain carries the slug, which is
 *   what tells a domain with no personas from a domain that is not
 *   there. `422` when the segment is not a slug, for a `?page`
 *   below 1, a `?perPage` above 200, a non-integer in either, or
 *   any undeclared query parameter — the last of those naming
 *   `query` rather than the parameter. A page past the end of the
 *   collection is `200` with an empty `data` and not a `404`.
 * - `POST /domains/:slug/personas` — adds one persona. `201`
 *   with `{ success: true, data }` carrying the stored row and the
 *   database's own id. `422` for a body `createPersonaSchema`
 *   refuses, one detail per fault, and for a segment that is not a
 *   slug; `404` for an unknown slug, and for a domain deleted
 *   between the lookup and the write; `409` with
 *   `code: 'CONFLICT'` when the domain already carries a persona
 *   for that role.
 * - `PATCH /personas/:id` — rewrites the supplied members.
 *   `200` with the stored row afterwards. `422` for a body
 *   `patchPersonaSchema` refuses and for a segment that is not an
 *   id; `404` when no persona carries the id; `409` when the
 *   resulting role is one the domain already carries on another
 *   row. A patch carrying no member is a legal call answering the
 *   row unchanged, and `domainId` is not patchable at all, so no
 *   request here can move a persona between domains.
 * - `DELETE /personas/:id` — removes one. `204` with no body.
 *   `404` when no persona carries the id, `422` for a segment that
 *   is not one. Never `409`: nothing in schema v2 points at
 *   `personas`, so there is no guard here and no
 *   `?cascade=confirm` for one to be waived by.
 *
 * A ROLE IS A 409 FROM BOTH WRITES, which is this group's one
 * substantive difference from its siblings. `patchPersonaSchema`
 * carries `role`, where `patchCategorySchema` refuses to carry a
 * `key` and `patchDomainSchema` a `slug`, so this is the only
 * wave-1 patch that can reach a unique key at all.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in
 * neither envelope — because `src/index.ts` mounts this router
 * behind `ctx.requireAuth`. `docs/architecture/08-http-api.md`
 * tabulates that answer beside the three other framework-shaped
 * ones.
 */
export function buildPersonasRouter(
  options: PersonasRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /domains/:slug/personas
   *
   * One page of a domain's personas.
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
   */
  router.get('/domains/:slug/personas', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const slug = readSlug(req.params);
    const window = toStoreWindow(query);
    const page = await listPersonas(options.store, slug, window);
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /domains/:slug/personas
   *
   * Adds one persona to a domain.
   *
   * **Side effects:** writes one `personas` row.
   *
   * `201` rather than `200`, because the answer is a resource that
   * did not exist when the request was made. No `Location` header:
   * the created row travels in the body carrying the id the two
   * write routes address it by, so a header would restate what the
   * caller already has back.
   *
   * The body reaches {@link createPersona} unparsed. That is the
   * module header's rule rather than an omission here.
   */
  router.post('/domains/:slug/personas', async (req, res) => {
    const slug = readSlug(req.params);
    const created = await createPersona(options.store, slug, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * PATCH /personas/:id
   *
   * Rewrites the supplied members of one persona.
   *
   * **Side effects:** writes one `personas` row, or none at all for
   * a patch carrying no member — `personas` has no `updated_at`
   * for an empty write to stamp, so answering the stored row
   * without writing is the port's declared contract rather than an
   * optimisation here.
   *
   * `200` with the row afterwards rather than `204`, because a
   * patch whose whole point is a rewrite has an answer worth
   * reading: the system text as it now stands, which is what an
   * operator retuning a prompt came to see.
   *
   * The edit takes effect on the following run and there is nothing
   * to announce afterwards; `./store.ts` carries why that needs no
   * invalidation anywhere.
   */
  router.patch('/personas/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchPersona(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /personas/:id
   *
   * Removes one persona.
   *
   * **Side effects:** removes one `personas` row, and nothing else:
   * no foreign key in schema v2 points at this table, so there is
   * nothing to cascade and nothing to guard.
   *
   * `204` and no body, because a deleted resource has no
   * representation to carry.
   */
  router.delete('/personas/:id', async (req, res) => {
    await deletePersona(options.store, readId(req.params));

    res.status(204).end();
  });

  return router;
}
