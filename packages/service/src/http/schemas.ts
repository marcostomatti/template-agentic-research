/**
 * @packageDocumentation
 * How every wave-1 route reads its ADDRESS: the slug that names a
 * domain, the id that names everything else, and the `?page` /
 * `?perPage` window a list is read through. Three schemas declared
 * once, so `:slug` means the same thing on `/domains/:slug` as it
 * does on `/domains/:slug/personas`, and no list route invents a
 * pagination vocabulary of its own.
 *
 * Nothing here parses a BODY. A body's shape belongs to the resource
 * that owns it — `src/domains/settings-payload.ts`,
 * `src/settings/payload.ts`, `src/taxonomy/seed-format.ts` — and what
 * all four resource groups genuinely share is only the address.
 *
 * Nothing here THROWS either. These are schemas, not parsers:
 * `src/http/validation.ts` is what turns a failed parse into a
 * `ValidationError` whose details name a field path and never a
 * submitted value. The separation is load-bearing rather than tidy.
 * A router that reached for `.parse()` instead would let a raw
 * `ZodError` travel to `errorHandler`, which copies `issue.message`
 * verbatim — and on an `unrecognized_keys` issue that message quotes
 * the submitted key straight back to the caller and into the warn
 * line. `docs/architecture/08-http-api.md` carries the measurement
 * and the argument; the TSDoc below states the half that governs the
 * code beside it.
 */
import { z } from 'zod';

/**
 * A domain slug: lowercase alphanumerics and hyphens, opening on an
 * alphanumeric.
 *
 * The same pattern as `DOMAIN_SLUG_PATTERN` in
 * `packages/web/src/routes/paths.ts`, and deliberately the same. That
 * module validates the slug it builds a `/d/<slug>` link from; this
 * one validates the slug that link then asks for. A slug the app
 * routes and this service refuses is a broken link with a 422 behind
 * it, and no gate in either package would report the disagreement.
 * The two are not shared because neither package depends on the other
 * in that direction — they are held equal by this comment and the one
 * over there, which is what the eventual API swap has to check.
 *
 * The opening anchor is the part that is not cosmetic. Without it
 * `-` and `--` are slugs, and a `:slug` reaches a handler
 * URL-DECODED, so `%2F` arrives as a real `/` (measured: a request
 * for `/p/a%2Fb` gives a handler `params.slug === 'a/b'`). This
 * pattern is what refuses both.
 *
 * What it does NOT do is normalise. `a--b` and `a-` match, because
 * they match over in `packages/web` too and this is an address check
 * rather than a canonical form. A slug is whatever the row says it
 * is; the only question here is whether it can be one.
 *
 * It is NARROWER than the column, which is a deliberate trade rather
 * than an oversight. `domains.slug` is `text NOT NULL UNIQUE` with no
 * CHECK, and `scripts/seed-schemas.ts` holds a seeded slug to
 * `.min(1)` and nothing more, so a row written by hand or by a seed
 * can carry a slug this schema refuses — and that row is then
 * unreachable over HTTP entirely. The alternative is accepting any
 * text at all in a path segment, and a natural key that is not
 * URL-shaped is the same problem discovered later and with rows
 * already hanging off it.
 */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The `:slug` that names a domain, and the `slug` a create body
 * supplies for one.
 *
 * A value schema rather than an object schema: a route composes it
 * into whatever it is parsing — `z.object({ slug: slugParamSchema })`
 * over `req.params` — so the `field` path in a 422 detail names the
 * parameter, and one declaration serves both the path segment and the
 * body member without either being a special case of the other.
 *
 * @see {@link SLUG_PATTERN} for what the shape is and what it costs.
 */
export const slugParamSchema = z.string().regex(SLUG_PATTERN);

/**
 * The `:id` that names a category, a term or a persona: a positive
 * integer, coerced from the string a path segment always is.
 *
 * Every id column in schema v2 is `bigserial` in drizzle's `number`
 * mode — chosen there because an id crossing the API and MCP surfaces
 * is serialized to JSON, where a `bigint` throws rather than
 * rendering — so the parsed value is a `number` and that is what the
 * store ports take.
 *
 * The safe-integer ceiling comes free, and is measured rather than
 * assumed: under the zod 4.5.1 in this tree `.int()` refuses anything
 * above `Number.MAX_SAFE_INTEGER` with `too_big`, so an id of
 * `9007199254740993` is a 422 rather than a lookup of its rounded
 * neighbour. No `.max()` is written here, because a literal ceiling
 * would restate a bound this schema does not own and would then have
 * to be maintained against it. The colocated case pins the behaviour
 * so a zod major that drops the check is a red test rather than a
 * silently rounded id.
 *
 * A non-numeric `:id` is therefore a 422 raised before any store call
 * rather than a 404 raised after one. The distinction is worth the
 * schema: a 404 says the row is not there, and a request that never
 * named a row has not established that.
 *
 * Coercion is `Number()`, which is wider than it looks — `' 7 '` is
 * 7, `'1e3'` is 1000, `'0x10'` is 16 and `true` is 1, all measured.
 * None of those is reachable from a link this service emits, each of
 * the numeric ones names exactly one row, and the boolean is
 * unreachable from a path segment at all, which is what the `Param`
 * in the name is saying: this schema addresses a row. Narrowing to a
 * digits-only regex would buy nothing and would have to be kept in
 * step with `Number` forever.
 */
export const resourceIdParamSchema = z.coerce.number().int()
  .positive();

/** The page a list route reads when `?page` is absent. */
const DEFAULT_PAGE = 1;

/** The window a list route reads when `?perPage` is absent. */
const DEFAULT_PER_PAGE = 50;

/**
 * The largest window a list route will read. A `perPage` with no
 * ceiling is a query with no ceiling.
 */
const MAX_PER_PAGE = 200;

/**
 * The `?page` / `?perPage` window every list route in wave 1 is read
 * through, and the only pagination vocabulary any of them accepts.
 * Neither `limit`/`offset`, nor `pageSize`, nor `per_page` is a
 * spelling of anything here.
 *
 * `page` is 1-based and defaults to 1; `perPage` defaults to 50 and
 * is refused above {@link MAX_PER_PAGE}. Both are coerced, because a
 * query value is a string on the wire and there is nowhere else the
 * conversion could happen.
 *
 * An over-cap `perPage` is a refusal and NOT a silent clamp. A clamp
 * makes the answered `meta.perPage` disagree with what was asked,
 * and a client computing its own page count from the number it SENT
 * then walks off the end of the collection with nothing reporting an
 * error. A refusal costs one round trip and answers nothing wrong.
 * `buildPaginationMeta` in `./envelope.ts` makes the same argument
 * from the other side for echoing `page` rather than clamping it.
 *
 * Strict, like every request schema on this surface, so `?pge=2` is a
 * refusal naming the query object rather than a silently ignored typo
 * that answers page 1 and looks like an empty collection. Express 5's
 * default `simple` query parser gives every value as `string` or
 * `string[]` and never nests (measured), so `?page[]=1` arrives as
 * the literal key `page[]` and is refused by that strictness rather
 * than by anything about arrays; a repeated `?page=1&page=2` arrives
 * as `['1','2']`, which `Number` makes `NaN` and `.int()` refuses.
 *
 * An absent query is `{}` — what Express hands a handler when there
 * is no query string at all — and parses to both defaults. `{}` is
 * therefore the shape a list route sees most often, and it is a
 * success rather than something a route has to guard.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int()
    .positive()
    .default(DEFAULT_PAGE),
  perPage: z.coerce.number().int()
    .positive()
    .max(MAX_PER_PAGE)
    .default(DEFAULT_PER_PAGE),
}).strict();

/**
 * A parsed pagination window: both members present, because both
 * carry a default.
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * The window in the vocabulary a store port takes.
 *
 * A separate shape from {@link PaginationQuery} rather than the same
 * one renamed, because the two are different statements: one is what
 * a caller asked for, the other is what SQL is handed.
 */
export interface StoreWindow {
  /** Rows to read. */
  readonly limit: number;
  /** Rows to skip first. `0` on the first page. */
  readonly offset: number;
}

/**
 * Translates a parsed `?page` / `?perPage` window into the `limit`
 * and `offset` a store port takes.
 *
 * The store ports speak `limit` and `offset` because that is what SQL
 * takes, and the wire speaks `page` and `perPage` because that is
 * what a client can page with. This function is the whole of the
 * translation between them, and it is here rather than in each
 * service so that the off-by-one lives in one place: four
 * implementations of `(page - 1) * perPage` is three chances to write
 * `page * perPage` and answer page two's rows to a request for page
 * one.
 *
 * @param query - A window that has already been through
 *   {@link paginationQuerySchema}. Both members are therefore
 *   positive integers, which is what makes `offset` non-negative
 *   without a guard here.
 * @returns The same window as `{ limit, offset }`.
 */
export function toStoreWindow(query: PaginationQuery): StoreWindow {
  return { limit: query.perPage, offset: (query.page - 1) * query.perPage };
}
