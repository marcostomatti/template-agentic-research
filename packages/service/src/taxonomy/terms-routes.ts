/**
 * @packageDocumentation
 * The HTTP surface over `src/taxonomy/terms-service.ts`: four
 * routes, and nothing in them that decides anything.
 *
 * FOUR ROUTES OVER SIX FUNCTIONS, because two of the four carry
 * two operations apiece. `GET /categories/:id/terms` is
 * {@link listTerms} or {@link exportTermsAsSeed} and
 * `POST /categories/:id/terms` is {@link createTerm} or
 * {@link importTerms}; `PATCH /terms/:id` is {@link patchTerm} and
 * `DELETE /terms/:id` is {@link deleteTerm}. What a handler adds
 * over the call it wraps is an address to read, an operation to
 * pick, a status to choose and an envelope to write — so a change
 * to a term RULE belongs one file over, and the cases that pin
 * those rules still need no server.
 *
 * TWO PATH SHAPES, for the reason `./categories-routes.ts` gives
 * about its own two. The collection hangs off `/categories/:id`,
 * since a lexicon has no meaning apart from the bucket it scores
 * for; the two writes address `/terms/:id`, because the row carries
 * its own `category_id` and repeating it in the path would let a
 * request name a bucket the term does not sit in — a disagreement
 * this router would then have to answer for. A term is never
 * addressed by a `:slug`: nothing relates it to a domain except
 * through its category, which is the same absence
 * `TermServiceStore` records by naming no `DomainStore` at all.
 * `docs/architecture/08-http-api.md` carries the split beside the
 * rest of the surface.
 *
 * THE READ ANSWERS TWO DIFFERENT THINGS AND `?format` PICKS.
 * Without it the route answers one page of the lexicon in the
 * paginated envelope every other list route on this surface uses.
 * With `?format=seed` it answers the category's terms WHOLE, as
 * the bytes `data/terms.json` carries — no envelope, no `meta` and
 * no window, because a document describing a page would not import
 * back into the category it came out of.
 *
 * THE TWO VOCABULARIES ARE EXCLUSIVE, AND THAT IS WHY THE QUERY IS
 * READ IN TWO STEPS. A request naming `?format` is parsed against a
 * schema declaring that member and NOTHING else, so
 * `?format=seed&page=2` is refused as an undeclared key rather than
 * answered a whole document with the window silently dropped — the
 * same fault `./categories-routes.ts` refuses a bare `?page` for,
 * reached from the other direction. A request naming no `?format`
 * is parsed against `paginationQuerySchema` exactly as its siblings
 * are, so an over-cap `?perPage` still answers a detail naming
 * `perPage`. One schema covering both would have to choose: a union
 * answers every fault as `invalid_union` naming the query, and a
 * single object cannot tell an absent `page` from a defaulted one.
 *
 * THE WRITE ANSWERS TO TWO SHAPES AND THE BODY PICKS. A body
 * carrying `terms` is a seed document and reaches
 * {@link importTerms}; anything else is one term and reaches
 * {@link createTerm}. The discriminator is the MEMBER and not a
 * second path or a `?mode`, because the two bodies are already
 * distinguishable and a caller holding a document should not have
 * to describe it as well as send it. Both schemas are strict, so a
 * body carrying `terms` beside `pattern` is refused rather than
 * quietly read as one of the two.
 *
 * The two also answer a duplicate pattern differently, which is the
 * service's rule rather than this file's: a document upserts and a
 * single create asserts a new row. {@link importTerms} says why.
 *
 * THE BULK ANSWER IS A COUNT AND NOT THE ROWS.
 * `TaxonomyStore.upsertTerms` answers in an UNSPECIFIED order, so
 * putting those rows on the wire would hand a caller a list it
 * cannot line up against the document it sent — and the two reads
 * that ARE ordered are one request away. So a bulk import answers
 * {@link TermImportSummary}, and a caller wanting the stored rows
 * re-reads the category.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in
 * `./categories-routes.ts` and `src/domains/routes.ts`. All four
 * service functions taking a body take an `unknown` and parse it
 * themselves, because an operation owns its own input contract and
 * a body validated by the router would leave a second caller
 * validating against a schema nobody would notice drifting. The
 * wave-1 MCP module IS that second caller on this group:
 * {@link createTerm} and {@link patchTerm} are the term edits the
 * API spec names among its safe mutations, and the tool-input
 * schemas below are what it imports rather than restates.
 *
 * What a router owns instead is the SPELLING only HTTP has — the
 * `:id` in a path, and the `?format` in a query string, which is
 * the one member of this router vocabulary no tool spells at all.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so a `NotFoundError` raised in the service is a 404
 * carrying `{ code: 'NOT_FOUND', message }` on the wire, a taken
 * pattern is a 409, and a row naming another category is a 422
 * whose detail names the row by INDEX, with no line of this file
 * involved in any of them.
 *
 * THE RECORD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` and
 * `okPage()` carry their argument by reference and reshape nothing,
 * so what a store projected is what `JSON.stringify` sees. `terms`
 * carries no timestamp columns, so there is no `Date` on the way
 * out and nothing the framework converts: `TermRecord` in
 * `./store.ts` is on the wire member for member.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule. `/categories/:id/terms` and
 * `/categories/:id` sit in two different files, so a `/categories`
 * mount would split one resource across both — the same argument
 * `/domains/:slug/categories` already made against a `/domains`
 * mount. The string below is the string on the wire, and a path
 * seen in a log stays greppable in this repository.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the service's own schemas refuse
 * like any other bad shape.
 */
import type { TermServiceStore } from './terms-service.js';
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
  createTerm,
  createTermSchema,
  deleteTerm,
  exportTermsAsSeed,
  importTerms,
  listTerms,
  patchTerm,
  patchTermSchema,
} from './terms-service.js';

/**
 * The one spelling of `?format` that asks for a seed document.
 *
 * A word rather than a boolean, and the same word the seed files
 * are called by, so a caller reading `?format=seed` knows which
 * shape it is asking for rather than which flag it is setting.
 *
 * Declared once and read twice: {@link seedQuerySchema} refuses
 * every other value, and the `GET` handler compares against it.
 */
const SEED_FORMAT = 'seed';

/**
 * The query member that picks the read.
 *
 * Read by {@link asksForSeed} against the RAW query, which is the
 * one place on this router a member name is spelled outside a
 * schema. The module header says why the discrimination has to
 * happen before either parse; this const is what keeps the two
 * spellings from drifting.
 */
const FORMAT_MEMBER = 'format';

/**
 * The body member that picks the write.
 *
 * `terms` is the only member `TermsFileSchema` declares, and no
 * member of `createTermSchema` shares the name, so its
 * presence is what tells a lexicon from a term.
 */
const TERMS_MEMBER = 'terms';

/**
 * What a `?format=seed` response is typed as.
 *
 * The body is a JSON document written by
 * `serializeTermSeedDocument`, so the type is the same one an
 * envelope goes out under — what differs is that the bytes are the
 * serialiser's rather than `JSON.stringify`'s, which is why the
 * handler reaches for `send` and not `json`. `res.send` on a string
 * would otherwise answer `text/html`.
 */
const SEED_CONTENT_TYPE = 'application/json';

/**
 * What `GET /categories/:id/terms` accepts once `?format` is
 * present: that member, at that value, and nothing else.
 *
 * `.strict()` is doing real work here rather than closing a
 * theoretical hole. A caller sending `?format=seed&page=2` is
 * asking for two different answers at once, and a schema that
 * merely ignored the window would hand back a whole document while
 * the caller believed it had read a page of one. Refused, it is a
 * 422 naming `query` — the same answer `?pge=2` gets from every
 * paginated list route on this surface.
 *
 * `z.literal` rather than an enum with one member, so a
 * `?format=json` is `invalid_value` naming `format` and a caller
 * learns which parameter it got wrong. A second format would be an
 * enum here and a second branch in the handler; there is one today.
 */
const seedQuerySchema = z.object({
  format: z.literal(SEED_FORMAT),
}).strict();

/**
 * The `:id` segment, as an object schema over `req.params`.
 *
 * ONE SCHEMA FOR BOTH ADDRESSES, because both paths declare exactly
 * one parameter and both narrow it the same way: `/categories/:id`
 * names the bucket and `/terms/:id` names the row, and neither is
 * anything but a positive integer. What the two mean is decided by
 * the handler that reads it, not by the schema.
 *
 * `resourceIdParamSchema` coerces, because a path segment is always
 * a string and every id column in schema v2 is `bigserial` in
 * drizzle's `number` mode.
 *
 * `.strict()` for the same reason every request schema on this
 * surface is, and it can never fire here: Express hands a handler a
 * null-prototype object whose keys are exactly the parameters the
 * path declared (measured), so the only field a detail built from
 * this parse can name is `id`.
 */
const resourceAddressSchema = z.object({
  id: resourceIdParamSchema,
}).strict();

/**
 * What the MCP tool over the paginated read is called with.
 *
 * ONE OBJECT WHERE A REQUEST HAS TWO HALVES. An HTTP route parses
 * its address and its query apart, and a tool is handed a single
 * arguments object — so every entry in `src/mcp/tools/wave-1.ts`
 * names one schema covering the whole request, spread from the
 * pieces the route already parses rather than written again.
 *
 * THE SEED BRANCH IS NOT ON THAT PROTOCOL. `?format=seed` answers
 * a whole document, written byte for byte by
 * `serializeTermSeedDocument` so that it imports back unchanged,
 * which is a file rather than a result — and
 * {@link seedQuerySchema} is deliberately absent from the spread
 * above. A tool caller reads a category's lexicon a page at a
 * time; an operator moving one between deployments uses the route.
 */
export const termListToolInputSchema = z.object({
  ...resourceAddressSchema.shape,
  ...paginationQuerySchema.shape,
}).strict();

/**
 * What the MCP tool over the single-term create is called with.
 *
 * The address names the category and `createTermSchema` names the
 * term, so the two spreads are the whole request. Neither schema
 * declares a member the other does, which is what lets them share
 * one object without either having to rename anything.
 *
 * THE BULK IMPORT IS NOT REACHABLE THROUGH IT, and `.strict()` is
 * what makes that structural rather than a convention: the member
 * a document is recognised by is {@link TERMS_MEMBER}, which no
 * member of `createTermSchema` shares, so a document sent here is
 * refused as a key this input does not declare. The route's own
 * dispatch is unchanged; what a tool cannot do is take the branch.
 */
export const termCreateToolInputSchema = z.object({
  ...resourceAddressSchema.shape,
  ...createTermSchema.shape,
}).strict();

/**
 * What the MCP tool over the term patch is called with.
 *
 * `id` is the term being rewritten and `categoryId` is where a move
 * lands it — two ids meaning two different things, exactly as the
 * wire carries them, one in the path and one in the body.
 */
export const termPatchToolInputSchema = z.object({
  ...resourceAddressSchema.shape,
  ...patchTermSchema.shape,
}).strict();

/** What a bulk import answers instead of the rows it wrote. */
export interface TermImportSummary {
  /**
   * How many rows the document put in the category.
   *
   * The submitted row count, since an upsert writes one row per
   * submitted row — a pattern the category already carried is
   * rewritten rather than skipped, so this is not a count of NEW
   * terms and a caller comparing it against the category's size
   * would be reading it wrong. `GET /categories/:id/terms` answers
   * that question.
   */
  readonly imported: number;
}

/** Everything {@link buildTermsRouter} needs. */
export interface TermsRouterOptions {
  /**
   * Where the category is read and the terms are read and written.
   * `TermServiceStore` and not `TaxonomyStore` whole: it is the
   * `Pick` the service declares, so this router asks for exactly
   * the methods the six functions below reach and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * The only member, and an options object regardless, so the
   * sibling wave-1 routers are built the same way and a dependency
   * added here later is not a signature change at the one call site
   * in `src/index.ts`.
   */
  readonly store: TermServiceStore;
}

/**
 * Whether a request asked for the seed document.
 *
 * @param query - `req.query`, unparsed. Typed `unknown` on purpose:
 *   Express types it as a record of strings, and a boundary that
 *   trusts its own framework's typing is not one.
 * @returns `true` while the query names {@link FORMAT_MEMBER} at
 *   all, whatever value it carries.
 *
 * @remarks
 * PRESENCE AND NOT VALUE, which is what makes a misspelt format a
 * 422 naming `format` rather than a silently paginated answer: a
 * `?format=json` reaches {@link seedQuerySchema} and is refused
 * there, where a value check here would have sent it down the
 * pagination branch to be refused as an undeclared key instead.
 *
 * A raw read rather than a zod parse, and it is the only one on
 * this router. The question is which of two schemas the query is to
 * be judged against, so it cannot itself be answered by either of
 * them — the module header carries the argument. `in` rather than a
 * member read, because Express 5's `simple` query parser hands over
 * a null-prototype object and a present-but-empty `?format=` is
 * still a request that named the parameter.
 */
function asksForSeed(query: unknown): boolean {
  return typeof query === 'object'
    && query !== null
    && FORMAT_MEMBER in query;
}

/**
 * Whether a request body is a seed document rather than one term.
 *
 * @param body - `req.body`, unparsed, and `undefined` for a request
 *   that sent none.
 * @returns `true` while the body names {@link TERMS_MEMBER}.
 *
 * @remarks
 * PRESENCE AND NOT SHAPE, for the reason {@link asksForSeed} gives:
 * a body carrying `terms: 3` is a document whose `terms` is not an
 * array, and `TermsFileSchema` says so in a detail naming `terms`.
 * Reading the shape here would send it to {@link createTerm}
 * instead, which would report the same body as a missing `pattern`.
 *
 * A body that is not an object at all — a JSON array, a bare string,
 * or nothing sent — names no member and is therefore one term, which
 * `createTermSchema` refuses with a detail naming `body`. That is
 * the honest answer: a caller that sent no document did not send a
 * malformed one.
 */
function isSeedDocument(body: unknown): boolean {
  return typeof body === 'object'
    && body !== null
    && TERMS_MEMBER in body;
}

/**
 * Reads the `:id` a request addressed a category or a term by.
 *
 * @param params - `req.params`, unknown for the reason
 *   {@link asksForSeed} gives about the query.
 * @returns The id, as a positive integer.
 * @throws ValidationError - When the segment is not one. A 422
 *   whose one detail names `id`.
 *
 * @remarks
 * `DELETE /terms/abc` is a 422 raised before any store call rather
 * than the 404 an uncoerced lookup would eventually answer, and the
 * distinction is the whole reason this runs first: a 404 says no
 * term carries that id, which is a claim about the table, and `abc`
 * is not an id for the table to have been asked about.
 *
 * Parsed through `parseBody` rather than `parseQuery` because the
 * two differ ONLY in the name a root-level issue takes, and this
 * parse can raise no root-level issue at all — see
 * {@link resourceAddressSchema}.
 */
function readId(params: unknown): number {
  return parseBody(resourceAddressSchema, params).id;
}

/**
 * Builds the terms router.
 *
 * @param options - The store to act against; see
 *   {@link TermsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /categories/:id/terms` — one page of the category's
 *   lexicon, pattern ascending. `200` with
 *   `{ success: true, data: [...], meta }`, where `meta` is
 *   `{ page, perPage, total, totalPages }`. `404` with
 *   `code: 'NOT_FOUND'` when no category carries the id, which is
 *   what tells an empty lexicon from a bucket that is not there.
 *   `422` for a segment that is not an id, for a `?page` below 1,
 *   for a `?perPage` above 200, and for any undeclared query
 *   parameter — the last of those naming `query` rather than the
 *   parameter. A page past the end is `200` with an empty `data`.
 * - `GET /categories/:id/terms?format=seed` — the category's terms
 *   WHOLE, as a seed document. `200` whose body is the document's
 *   own bytes under `application/json`, in NEITHER envelope and
 *   with no `meta`: what `POST` accepts back, ending in one
 *   newline. `404` for an unknown id, and `422` for any other
 *   `?format` value and for `?format` beside any other parameter.
 * - `POST /categories/:id/terms` — adds one term, or applies a
 *   whole seed document. A body carrying `terms` is the document
 *   and answers `201` with `{ imported }`; anything else is one
 *   term and answers `201` with the stored row. `404` for an
 *   unknown id. `409` with `code: 'CONFLICT'` when a single create
 *   names a pattern the category already carries — a document
 *   REWRITES that row instead and never conflicts. `422` for a body
 *   either schema refuses, for a document row naming another
 *   category, and for a document stating one pattern twice.
 * - `PATCH /terms/:id` — rewrites the supplied members, moving the
 *   term between categories when the patch names one. `200` with
 *   the stored row afterwards. `404` when no term carries the id;
 *   `422` for a body the schema refuses, for a segment that is not
 *   an id, and for a `categoryId` naming no category or one in
 *   another domain; `409` when the resulting pattern is taken in
 *   the resulting category. A patch carrying no member is a legal
 *   call answering the row unchanged.
 * - `DELETE /terms/:id` — removes one. `204` with no body. `404`
 *   when no term carries the id, `422` for a segment that is not
 *   one. Nothing hangs off a term, so this is the one delete on the
 *   taxonomy surface with neither a guard nor a cascade.
 *
 * Every one of them can also answer `401` with
 * `{ error: 'Unauthorized' }` — the guard's own body, in neither
 * envelope — because `src/index.ts` mounts this router behind
 * `ctx.requireAuth`. `docs/architecture/08-http-api.md` tabulates
 * that answer beside the three other framework-shaped ones.
 */
export function buildTermsRouter(options: TermsRouterOptions): RouterType {
  const router = Router();

  /**
   * GET /categories/:id/terms
   *
   * One page of a category's lexicon, or the whole of it as a seed
   * document.
   *
   * **Side effects:** none.
   *
   * THE QUERY IS READ BEFORE THE ADDRESS, which is this route's
   * one departure from the address-first ordering its siblings
   * keep. The query is what decides which operation runs, so it
   * cannot be the second thing looked at: a `?format` this route
   * does not serve has to be answered as a query fault whether or
   * not the segment ahead of it was an id.
   *
   * The seed branch answers with `send` and not `json`, because
   * `serializeTermSeedDocument` has already written the bytes and
   * `res.json` would re-serialise them — two-space indent, key
   * order and trailing newline included, which is the whole of what
   * makes the document import back byte for byte.
   */
  router.get('/categories/:id/terms', async (req, res) => {
    if (asksForSeed(req.query)) {
      parseQuery(seedQuerySchema, req.query);

      const document = await exportTermsAsSeed(
        options.store,
        readId(req.params),
      );

      res.status(200)
        .type(SEED_CONTENT_TYPE)
        .send(document);

      return;
    }

    const query = parseQuery(paginationQuerySchema, req.query);
    const id = readId(req.params);
    const page = await listTerms(options.store, id, toStoreWindow(query));
    const meta = buildPaginationMeta({
      page: query.page,
      perPage: query.perPage,
      total: page.total,
    });

    res.status(200).json(okPage(page.rows, meta));
  });

  /**
   * POST /categories/:id/terms
   *
   * Adds one term to a category, or applies a whole seed document
   * to it.
   *
   * **Side effects:** writes one `terms` row, or upserts as many as
   * the document carries. An empty document writes none.
   *
   * `201` on both, because both answer a category that now carries
   * rows it did not. No `Location` header on either: a created term
   * travels in the body carrying the id the two write routes
   * address it by, and a document's rows are re-read through the
   * `GET` rather than followed one at a time.
   *
   * The body reaches whichever service function it names UNPARSED.
   * That is the module header's rule rather than an omission here,
   * and it is what lets a document carrying `terms` beside a stray
   * member be refused as a document rather than mistaken for a
   * term.
   */
  router.post('/categories/:id/terms', async (req, res) => {
    const id = readId(req.params);

    if (isSeedDocument(req.body)) {
      const rows = await importTerms(options.store, id, req.body);
      const summary: TermImportSummary = { imported: rows.length };

      res.status(201).json(ok(summary));

      return;
    }

    const created = await createTerm(options.store, id, req.body);

    res.status(201).json(ok(created));
  });

  /**
   * PATCH /terms/:id
   *
   * Rewrites the supplied members of one term, moving it between
   * categories when the patch names one.
   *
   * **Side effects:** writes one `terms` row, or none at all for a
   * patch carrying no member — `terms` has no `updated_at` for an
   * empty write to stamp, so answering the stored row without
   * writing is the port's declared contract rather than an
   * optimisation.
   *
   * `200` with the row afterwards rather than `204`, because a
   * patch whose whole point is a rewrite has an answer worth
   * reading: the pattern as it now stands, the weight a scorer will
   * use, and the `categoryId` a move landed on.
   */
  router.patch('/terms/:id', async (req, res) => {
    const id = readId(req.params);
    const patched = await patchTerm(options.store, id, req.body);

    res.status(200).json(ok(patched));
  });

  /**
   * DELETE /terms/:id
   *
   * Removes one term.
   *
   * **Side effects:** removes one `terms` row, and nothing else.
   * Nothing in the schema points at a term, so there is neither a
   * cascade to take nor a guard to refuse.
   *
   * `204` and no body, because a deleted resource has no
   * representation to carry.
   */
  router.delete('/terms/:id', async (req, res) => {
    await deleteTerm(options.store, readId(req.params));

    res.status(204).end();
  });

  return router;
}
