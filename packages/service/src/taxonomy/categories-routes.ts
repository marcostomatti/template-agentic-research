/**
 * @packageDocumentation
 * The HTTP surface over `src/taxonomy/categories-service.ts`: four
 * routes, and nothing in them that decides anything.
 *
 * `GET /domains/:slug/categories` is {@link listCategories},
 * `POST /domains/:slug/categories` is {@link createCategory},
 * `PATCH /categories/:id` is {@link patchCategory} and
 * `DELETE /categories/:id` is {@link deleteCategory}. What a handler
 * adds over the call it wraps is an address to read, a status to
 * choose and an envelope to write — so a change to a category RULE
 * belongs one file over, and the cases that pin those rules still
 * need no server.
 *
 * TWO PATH SHAPES, BECAUSE A CATEGORY IS MET IN A DOMAIN AND WRITTEN
 * BY ID. The collection hangs off `/domains/:slug`, since a taxonomy
 * has no meaning apart from the domain it describes and a caller
 * that has a slug should not have to look an id up to read one. The
 * two writes address `/categories/:id` instead: the row carries its
 * own `domainId`, every rule that needs one is the database's, and
 * repeating the slug in the path would let a request name a domain
 * the row does not belong to — a disagreement this router would then
 * have to answer for. `docs/architecture/08-http-api.md` records
 * that split beside the rest of the surface.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in `src/domains/routes.ts`
 * and for the same reason. `createCategory` and `patchCategory` take
 * an `unknown` and parse it themselves, because an operation owns
 * its own input contract and a body validated by the router would
 * leave a second caller validating against a schema nobody would
 * notice drifting. What a router owns instead is the SPELLING only
 * HTTP has: the `:slug` and the `:id` in a path. The wave-1 MCP
 * module takes the same `:slug` as a member of one arguments object
 * — see the tool-input schema below — and reads this group without
 * writing it.
 *
 * THERE IS NO WINDOW ON THIS ROUTER AT ALL, which is the one place
 * it departs from its sibling. `GET /domains/:slug/categories`
 * answers a domain's taxonomy WHOLE — no `?page`, no `?perPage` and
 * no `meta` — because the taxonomy is shallow, operator-authored and
 * capped at two levels, so there is no page to describe. A `?page`
 * sent to it is refused as an undeclared parameter rather than
 * silently ignored, since a caller that sent one believes it is
 * reading a page. The asymmetry with `GET /domains` is the
 * collections differing rather than the two surfaces disagreeing.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD ON A PATCH, and NOT on a
 * create — which is the service's ordering rather than this file's
 * and is worth naming here because the two routes look symmetric.
 * `patchCategory` is handed an id this file has already narrowed, so
 * a `PATCH /categories/abc` carrying a malformed body is answered
 * about the segment. `createCategory` parses its body before it
 * resolves the slug, so a `POST` carrying both an unroutable slug
 * and a malformed body is answered about the body: a body's shape is
 * a fact about the request alone, and answering it a 422 or a 404
 * depending on what happens to be stored would make a caller's error
 * depend on rows it never asked about.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a {@link NotFoundError} raised in the service is a
 * 404 carrying `{ code: 'NOT_FOUND', message }` on the wire, the
 * depth trigger's refusal is a 422 carrying one detail naming
 * `parentId`, and a category still holding children is a 409, with
 * no line of this file involved in any of them.
 *
 * THE RECORD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` carries its
 * argument by reference and reshapes nothing, so what a store
 * projected is what `JSON.stringify` sees. `categories` carries no
 * timestamp columns, so unlike a domain there is no `Date` on the
 * way out and nothing the framework converts: `CategoryRecord` in
 * `./store.ts` is on the wire member for member, and the list adds
 * `termCount` beside them.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule and is the one this router forces. A
 * `/domains` mount would put `/domains/:slug` in one file and
 * `/domains/:slug/categories` in this one, so the string below is
 * the string on the wire and a path seen in a log stays greppable in
 * this repository.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas refuse
 * like any other bad shape.
 */
import type { CategoryServiceStore } from './categories-service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { ok } from '../http/envelope.js';
import { resourceIdParamSchema, slugParamSchema } from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import {
  createCategory,
  deleteCategory,
  listCategories,
  patchCategory,
} from './categories-service.js';

/**
 * What `GET /domains/:slug/categories` accepts in its query string,
 * which is nothing.
 *
 * An empty STRICT object rather than no parse at all. Express hands
 * `req.query` past a handler that never reads it, so a `?page=2`
 * here would be silently ignored and the caller would read a whole
 * taxonomy believing it had read the first page of one. This makes
 * it a 422 naming `query` — the root field `parseQuery` gives a
 * query-string fault — which is the same answer `GET /domains` gives
 * a parameter it does not declare, reached from the opposite
 * direction.
 *
 * That this route takes no window at all is the taxonomy being
 * shallow and operator-authored rather than an omission; the module
 * header carries the argument, and
 * `docs/architecture/08-http-api.md` records it beside the surface's
 * pagination rules so a reader of those rules meets the one route
 * they do not reach.
 */
const noQuerySchema = z.object({}).strict();

/**
 * The `:slug` segment, as an object schema over `req.params`.
 *
 * Declared here rather than imported from `src/domains/routes.ts`,
 * where the identical const is private. The two are equal by intent
 * rather than by derivation: exporting one router's address schema
 * would make the agreement look like a dependency, and the day a
 * group needs a second path parameter it would be editing a symbol
 * three other routers read.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared (measured — `Object.keys(req.params)` is `['slug']`
 * on the two routes that take one), so the only field a detail built
 * from this parse can name is `slug`.
 */
const domainAddressSchema = z.object({ slug: slugParamSchema }).strict();

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and every id column in schema v2 is `bigserial` in
 * drizzle's `number` mode. What reaches {@link patchCategory} and
 * {@link deleteCategory} is therefore the `number` their signatures
 * take, narrowed at the boundary rather than inside the rules.
 */
const categoryAddressSchema = z.object({ id: resourceIdParamSchema }).strict();

/**
 * What the MCP tool over this group's one read is called with.
 *
 * ONE OBJECT WHERE A REQUEST HAS TWO HALVES. An HTTP route parses
 * its address and its query apart, and a tool is handed a single
 * arguments object — so every entry in `src/mcp/tools/wave-1.ts`
 * names one schema covering the whole request, and both halves are
 * spread here rather than written again.
 *
 * {@link noQuerySchema} CONTRIBUTES NOTHING, AND IS SPREAD ANYWAY.
 * This route declares no parameter, so a tool accepting one would
 * be answering a request the route itself refuses; taking the
 * emptiness from the schema rather than from a comment is what
 * keeps that true if the route ever grows one.
 *
 * The address const above stays private. Nothing here exports one,
 * so its own claim that the two routers agree by intent rather than
 * by derivation is untouched by this schema.
 */
export const categoryListToolInputSchema = z.object({
  ...domainAddressSchema.shape,
  ...noQuerySchema.shape,
}).strict();

/** Everything {@link buildCategoriesRouter} needs. */
export interface CategoriesRouterOptions {
  /**
   * Where the domain is resolved and its categories are read and
   * written. `CategoryServiceStore` and not either port whole: it is
   * the intersection of the two `Pick`s the service declares, so
   * this router asks for exactly the methods the four functions
   * below reach and `tests/helpers/memory-research-store.ts` can
   * stand behind it with no database up.
   *
   * The only member, and an options object regardless, so the three
   * sibling wave-1 routers are built the same way and a dependency
   * added here later is not a signature change at the one call site
   * in `src/index.ts`.
   */
  readonly store: CategoryServiceStore;
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
 * A 422 and not a 404, for the reason {@link readId} gives about the
 * id: a 404 says the row is not there, and a request that never
 * named a row has not established that. The narrowing is
 * load-bearing rather than decorative — a route parameter reaches a
 * handler URL-DECODED, so `%2F` arrives as a real `/` (measured),
 * and only a pattern refuses it.
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
 * Reads the `:id` a request addressed a category by.
 *
 * @param params - `req.params`, unknown for the reason
 *   {@link readSlug} gives.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422 whose
 *   one detail names `id`.
 *
 * @remarks
 * `PATCH /categories/abc` is a 422 raised before any store call
 * rather than the 404 an uncoerced lookup would eventually answer,
 * and the distinction is the whole reason this runs first: a 404
 * says no category carries that id, which is a claim about the
 * table, and `abc` is not an id for the table to have been asked
 * about.
 */
function readId(params: unknown): number {
  return parseBody(categoryAddressSchema, params).id;
}

/**
 * Builds the categories router.
 *
 * @param options - The store to act against; see
 *   {@link CategoriesRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /domains/:slug/categories` — the domain's taxonomy WHOLE,
 *   key ascending, each row carrying the number of terms hanging off
 *   it. `200` with `{ success: true, data: [...] }` and NO `meta`,
 *   because there is no window. `404` with `code: 'NOT_FOUND'` when
 *   no domain carries the slug, which is what tells an empty
 *   taxonomy from a domain that is not there, and `422` when the
 *   segment is not a slug or the query carries any parameter at all.
 * - `POST /domains/:slug/categories` — adds one bucket. `201` with
 *   `{ success: true, data }` carrying the stored row and the
 *   database's own id. `422` for a body `createCategorySchema`
 *   refuses, one detail per fault; `422` naming `parentId` when the
 *   parent would make a third level or names no category at all;
 *   `404` for an unknown slug; `409` with `code: 'CONFLICT'` when
 *   the domain already carries that key.
 * - `PATCH /categories/:id` — rewrites the supplied members. `200`
 *   with the stored row afterwards. `422` for a body
 *   `patchCategorySchema` refuses and for a segment that is not an
 *   id; `422` naming `parentId` for a parent the depth rule or the
 *   foreign key refuses; `404` when no category carries the id. A
 *   patch carrying no member is a legal call answering the row
 *   unchanged, and `key` is not patchable at all.
 * - `DELETE /categories/:id` — removes one. `204` with no body, and
 *   its terms and criteria go with it. `404` when no category
 *   carries the id, `422` for a segment that is not one, and `409`
 *   with `code: 'CONFLICT'` while the category still holds
 *   children.
 *
 * There is no `?cascade=confirm` here, unlike `DELETE /domains/:slug`
 * — a domain's delete is guarded because the database would silently
 * take everything, and a category's is guarded by the database
 * itself, so there is nothing for a confirmation to authorise that
 * the caller could not do by moving the children first.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildCategoriesRouter(
  options: CategoriesRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /domains/:slug/categories
   *
   * One domain's taxonomy, whole.
   *
   * **Side effects:** none.
   *
   * No query is parsed and none is accepted, which is a decision
   * rather than an omission: with no window there is no parameter
   * this route could honour, and Express hands an unparsed
   * `req.query` straight past a handler that never looks at it. So a
   * `?page=2` sent here would be silently ignored and the caller
   * would read the whole taxonomy believing it had read a page. An
   * empty strict schema over the query is what makes that a 422
   * naming `query` instead.
   *
   * `ok()` and not `okPage()`, for the same reason: a `meta` here
   * would describe a window nobody applied.
   */
  router.get('/domains/:slug/categories', async (req, res) => {
    parseQuery(noQuerySchema, req.query);

    const rows = await listCategories(options.store, readSlug(req.params));

    res.status(200).json(ok(rows));
  });

  /**
   * POST /domains/:slug/categories
   *
   * Adds one category to a domain's taxonomy.
   *
   * **Side effects:** writes one `categories` row.
   *
   * `201` rather than `200`, because the answer is a resource that
   * did not exist when the request was made. No `Location` header:
   * the created row travels in the body carrying the id the two
   * write routes address it by, so a header would restate what the
   * caller already has back.
   *
   * The body reaches {@link createCategory} unparsed. That is the
   * module header's rule rather than an omission here.
   */
  router.post('/domains/:slug/categories', async (req, res) => {
    const slug = readSlug(req.params);
    const created = await createCategory(options.store, slug, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * PATCH /categories/:id
   *
   * Rewrites the supplied members of one category.
   *
   * **Side effects:** writes one `categories` row, or none at all
   * for a patch carrying no member — `categories` has no
   * `updated_at` for an empty write to stamp, so answering the
   * stored row without writing is the port's declared contract
   * rather than an optimisation.
   *
   * `200` with the row afterwards rather than `204`, because a patch
   * whose whole point is a rewrite has an answer worth reading: the
   * label as it now stands, and the `parentId` a move landed on.
   */
  router.patch('/categories/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchCategory(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /categories/:id
   *
   * Removes one category, unless it still holds children.
   *
   * **Side effects:** removes one `categories` row, plus every
   * `terms` and `criteria` row carrying its `category_id`. Both of
   * those cascade and `categories.parent_id` does not; see
   * {@link deleteCategory} for why that asymmetry is the point.
   *
   * `204` and no body, because a deleted resource has no
   * representation to carry.
   */
  router.delete('/categories/:id', async (req, res) => {
    await deleteCategory(options.store, readId(req.params));

    res.status(204).end();
  });

  return router;
}
