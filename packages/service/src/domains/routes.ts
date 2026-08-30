/**
 * @packageDocumentation
 * The HTTP surface over `src/domains/service.ts`: five routes, and
 * nothing in them that decides anything.
 *
 * `GET /domains` is {@link listDomains}, `POST /domains` is
 * {@link createDomain}, `GET /domains/:slug` is {@link getDomain},
 * `PATCH /domains/:slug` is {@link patchDomain} and
 * `DELETE /domains/:slug` is {@link deleteDomain}. What a handler
 * adds over the call it wraps is an address to read, a window to
 * derive, a status to choose and an envelope to write — so a change
 * to a domain RULE belongs one file over, and the cases that pin
 * those rules still need no server.
 *
 * THE BODY IS NOT PARSED HERE, and the asymmetry with the address is
 * the whole shape of this file. `createDomain` and `patchDomain`
 * take an `unknown` and parse it themselves, because wave 3 exposes
 * those same functions as MCP tools and a body validated by the
 * router would leave that caller validating against a second schema
 * nobody would notice drifting. What a router owns instead is what
 * only HTTP has: the `:slug` in the path, the `?page`/`?perPage`
 * window and the `?cascade` confirmation. None of those three is a
 * vocabulary an MCP tool would spell.
 *
 * THE ADDRESS IS CHECKED BEFORE THE PAYLOAD. {@link readSlug} runs
 * ahead of the service call that would parse the body, so a `PATCH`
 * carrying both an unroutable slug and a malformed body is answered
 * about the slug. A request that has not named a resource has not
 * yet asked anything about a payload, and answering the payload
 * first would tell a caller what is wrong with a body it was never
 * going to be allowed to send.
 *
 * `DELETE` is the one route that reads something ahead of the
 * address, and it is the query rather than a body: a misspelt
 * `?cascade` is one keystroke from a destructive call, so it is the
 * half of that request worth answering first.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a {@link NotFoundError} raised in the service is a
 * 404 carrying `{ code: 'NOT_FOUND', message }` on the wire, and a
 * `ValidationError` raised by the boundary parser is a 422 carrying
 * its sanitised `details`, with no line of this file involved in
 * either.
 *
 * THE RECORD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` carries its
 * argument by reference and reshapes nothing, which is that
 * function's stated contract, so what a store projected is what
 * `JSON.stringify` sees. The one conversion a client should know
 * about is the framework's rather than this file's: `createdAt` and
 * `updatedAt` are `Date`s across the port and reach the wire as
 * ISO-8601 strings, because `res.json` serialises through
 * `Date#toJSON`. Nothing is added, hidden or renamed on the way out
 * — `DomainRecord` in `./store.ts` records why the whole row is
 * safe to answer with.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`. The string
 * below is the string on the wire, which is what keeps a path seen
 * in a log greppable in this repository. The argument is in
 * `docs/architecture/08-http-api.md`: `/domains/:slug/categories`
 * belongs to the taxonomy router, so a `/domains` mount would split
 * one path prefix across two files — and that document records the
 * `/auth` mount as the deliberate exception.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas refuse
 * like any other bad shape.
 */
import type { DomainStore } from './store.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { buildPaginationMeta, ok, okPage } from '../http/envelope.js';
import {
  paginationQuerySchema,
  slugParamSchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseBody, parseQuery } from '../http/validation.js';

import {
  createDomain,
  deleteDomain,
  getDomain,
  listDomains,
  patchDomain,
} from './service.js';

/**
 * The one spelling of `?cascade` that gets a delete past the guard.
 *
 * A word rather than a boolean, and this word rather than `true` or
 * `1`, because the query string is where a confirmation is easiest
 * to arrive at by accident — a stale form field, a copied URL, a
 * client that sends every parameter it knows. `cascade=confirm` is
 * not a value anything produces without meaning it.
 *
 * Declared once and read twice: {@link domainDeleteQuerySchema}
 * refuses every other value, and the `DELETE` handler compares
 * against it. Written twice they would be free to drift into a
 * schema that accepts a confirmation the handler does not act on.
 */
const CASCADE_CONFIRMATION = 'confirm';

/**
 * The `:slug` segment, as an object schema over `req.params`.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared (measured — `Object.keys(req.params)` is `['slug']`
 * on this route, encoded segments included). So the only field a
 * detail built from this parse can name is `slug`, and the root
 * field {@link readSlug} borrows is unreachable rather than merely
 * unlikely.
 */
const domainAddressSchema = z.object({ slug: slugParamSchema }).strict();

/**
 * What `DELETE /domains/:slug` accepts in its query string.
 *
 * `cascade` is optional and, when present, is
 * {@link CASCADE_CONFIRMATION} and nothing else. A misspelt
 * confirmation is therefore a 422 naming `cascade` rather than a
 * silently unconfirmed delete: a caller that wrote `?cascade=yes`
 * meant to get past the guard, and answering it the 409 the guard
 * raises would send it looking for rows to remove instead of for
 * the typo it made.
 *
 * `.strict()`, so `?casacde=confirm` is refused as an undeclared key
 * naming the query object. That one matters more than most: a
 * stripped typo there is a delete the caller believes it confirmed.
 */
const domainDeleteQuerySchema = z.object({
  cascade: z.literal(CASCADE_CONFIRMATION).optional(),
}).strict();

/** Everything {@link buildDomainsRouter} needs. */
export interface DomainsRouterOptions {
  /**
   * Where domains are read and written. The port, not the drizzle
   * implementation: this router is drivable against
   * `tests/helpers/memory-research-store.ts` with no database up.
   *
   * The only member, and an options object regardless, so the three
   * sibling wave-1 routers can be built the same way and a
   * dependency added here later is not a signature change at the one
   * call site in `src/index.ts`.
   */
  readonly store: DomainStore;
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
 * A 422 and not a 404, which is the same argument
 * `resourceIdParamSchema` makes for a non-numeric `:id`: a 404 says
 * the row is not there, and a request that never named a row has not
 * established that. The narrowing is load-bearing rather than
 * decorative — a route parameter reaches a handler URL-DECODED, so
 * `%2F` arrives as a real `/` (measured), and only a pattern refuses
 * it.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link domainAddressSchema}. Every detail it can produce names
 * `slug`.
 */
function readSlug(params: unknown): string {
  return parseBody(domainAddressSchema, params).slug;
}

/**
 * Builds the domains router.
 *
 * @param options - The store to act against; see
 *   {@link DomainsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /domains` — one page of the domain list, slug ascending.
 *   `200` with `{ success: true, data: [...], meta }`, where `meta`
 *   is `{ page, perPage, total, totalPages }`. `422` with
 *   `code: 'VALIDATION_ERROR'` for a `?page` below 1, a `?perPage`
 *   above 200, a non-integer in either, or any undeclared query
 *   parameter — the last of those naming `query` rather than the
 *   parameter. A page past the end of the collection is `200` with
 *   an empty `data` and not a `404`.
 * - `POST /domains` — creates one. `201` with
 *   `{ success: true, data }` carrying the stored row, id and both
 *   stamps included. `422` for a body `createDomainSchema` refuses,
 *   one detail per fault. `409` with `code: 'CONFLICT'` when a
 *   domain already carries the slug.
 * - `GET /domains/:slug` — reads one. `200` with
 *   `{ success: true, data }`. `404` with `code: 'NOT_FOUND'` when
 *   no domain carries the slug, and `422` when the segment is not a
 *   slug at all.
 * - `PATCH /domains/:slug` — rewrites the supplied members. `200`
 *   with the stored row afterwards. `422` for a body
 *   `patchDomainSchema` refuses, `404` for an unknown slug. A patch
 *   carrying no member is a legal write that moves `updated_at`
 *   alone, and `settings` REPLACES the stored payload whole rather
 *   than merging into it.
 * - `DELETE /domains/:slug` — removes one. `204` with no body.
 *   `404` for an unknown slug. `409` with `code: 'CONFLICT'` and
 *   `details` carrying `{ topics, sources, findings }` when the
 *   domain still holds rows it accumulated and the cascade is
 *   unconfirmed. `?cascade=confirm` is the only spelling that gets
 *   past that guard; any other value of `cascade`, and any other
 *   query parameter, is a `422`.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildDomainsRouter(options: DomainsRouterOptions): RouterType {
  const router = Router();

  /**
   * GET /domains
   *
   * One page of the domain list.
   *
   * **Side effects:** none.
   *
   * The window is parsed before the store is asked anything, so an
   * over-cap `?perPage` costs no read. `toStoreWindow` owns the
   * `(page - 1) * perPage` arithmetic and `buildPaginationMeta`
   * derives `totalPages`, so the two numbers a client pages by are
   * computed in one place each and this handler does no arithmetic
   * of its own.
   *
   * `meta` echoes the window that was ASKED FOR rather than the rows
   * that came back: `?page=99` over a two-page collection answers
   * `page: 99` beside `totalPages: 2`, which is how a caller sees
   * that it overshot.
   */
  router.get('/domains', async (req, res) => {
    const query = parseQuery(paginationQuerySchema, req.query);
    const page = await listDomains(options.store, toStoreWindow(query));
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /domains
   *
   * Creates one domain.
   *
   * **Side effects:** writes one `domains` row.
   *
   * `201` rather than `200`, because the answer is a resource that
   * did not exist when the request was made. No `Location` header:
   * the created row travels in the body, whose `slug` IS the address
   * every other route on this group takes, so a header would restate
   * what the caller already sent and already has back.
   *
   * The body reaches {@link createDomain} unparsed. That is the
   * module header's rule rather than an omission here.
   */
  router.post('/domains', async (req, res) => {
    const created = await createDomain(options.store, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * GET /domains/:slug
   *
   * Reads one domain by its natural key.
   *
   * **Side effects:** none.
   */
  router.get('/domains/:slug', async (req, res) => {
    const domain = await getDomain(options.store, readSlug(req.params));

    res.status(200).json(ok(domain));
  });

  /**
   * PATCH /domains/:slug
   *
   * Rewrites the supplied members of one domain.
   *
   * **Side effects:** writes one `domains` row, stamping
   * `updated_at` whether or not any other member moved.
   *
   * `200` with the row afterwards rather than `204`, because a patch
   * whose whole point is a rewrite has an answer worth reading: the
   * stored `settings` after a whole-unit replacement, and the stamp
   * the write moved.
   */
  router.patch('/domains/:slug', async (req, res) => {
    const slug = readSlug(req.params);
    const patched = await patchDomain(options.store, slug, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /domains/:slug
   *
   * Removes one domain, and everything the database cascades with
   * it.
   *
   * **Side effects:** removes one `domains` row, plus every row in
   * every table carrying its `domain_id` — the taxonomy, the
   * personas, the topics, the sources and the findings. The cascade
   * is the schema's; see {@link deleteDomain}.
   *
   * `204` and no body, because a deleted resource has no
   * representation to carry and the counts that would be worth
   * reading are the ones the guard already refused with.
   *
   * The query is parsed before the slug so that a misspelt
   * confirmation is answered about the confirmation. This is the one
   * route where the address is NOT read first, and it is deliberate:
   * a caller that got `?cascade=` wrong is one keystroke from a
   * destructive call, and telling it the slug is fine while leaving
   * the typo unnamed is the wrong half of the request to answer.
   */
  router.delete('/domains/:slug', async (req, res) => {
    const query = parseQuery(domainDeleteQuerySchema, req.query);
    const slug = readSlug(req.params);

    await deleteDomain(options.store, slug, {
      cascadeConfirmed: query.cascade === CASCADE_CONFIRMATION,
    });

    res.status(204).end();
  });

  return router;
}
