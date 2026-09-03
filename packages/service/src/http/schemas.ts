/**
 * @packageDocumentation
 * How a route reads everything that is not its BODY: the slug that
 * names a domain, the id that names everything else, the `?page` /
 * `?perPage` window a list is read through, the `?since` / `?until`
 * window a collection over time is narrowed by, and the `?sort` key
 * an ordering is asked for by. Each vocabulary declared once, so
 * `:slug` means the same thing on `/domains/:slug` as it does on
 * `/domains/:slug/personas`, and no route invents a second spelling
 * of a page, a window or an order.
 *
 * Two shapes here are QUERY vocabularies and not query schemas. A
 * route composes them — `timeWindowQuerySchema` extended with
 * `paginationQuerySchema.shape` and `sortQuerySchema(keys).shape`
 * — rather than parsing against one whole, because a collection
 * decides for itself which of the three it reads. What none of them
 * decides is what a page, a window or an order MEANS.
 *
 * Nothing here parses a BODY. A body's shape belongs to the resource
 * that owns it — `src/domains/settings-payload.ts`,
 * `src/settings/payload.ts`, `src/taxonomy/seed-format.ts` — and
 * what the resource groups genuinely share is only the address and
 * the way a collection is narrowed.
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
 * The `:slug` that names a domain, the `slug` a create body
 * supplies for one, and the slug a stored payload refers to one
 * BY — `OperatorSettings.defaultDomainSlug`, held to this same
 * shape in `src/settings/payload.ts`.
 *
 * A value schema rather than an object schema: a route composes it
 * into whatever it is parsing — `z.object({ slug: slugParamSchema })`
 * over `req.params` — so the `field` path in a 422 detail names the
 * parameter, and one declaration serves the path segment, the body
 * member and the reference without any of them being a special
 * case of the others.
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
 * The `?page` / `?perPage` window every PAGINATED list route in wave
 * 1 is read through, and the only pagination vocabulary any of them
 * accepts. Neither `limit`/`offset`, nor `pageSize`, nor `per_page`
 * is a spelling of anything here.
 *
 * One wave-1 list route is not among them.
 * `GET /domains/:slug/categories` answers a domain's taxonomy WHOLE
 * — the taxonomy is shallow, operator-authored and capped at two
 * levels, so there is no page to describe — and
 * `src/taxonomy/categories-routes.ts` therefore parses its query
 * against an empty strict schema of its own rather than against
 * this one, so a `?page` sent there is refused rather than quietly
 * dropped. That is the one route this schema does not reach, and
 * `docs/architecture/08-http-api.md` records it beside these rules.
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

/**
 * The stamp a `?since` or `?until` carries, and the `Date` it
 * becomes.
 *
 * ISO-8601 WITH A ZONE, which is the narrowing worth the argument.
 * Measured under the zod 4.5.1 in this tree,
 * `z.iso.datetime({ offset: true })` accepts `2026-01-02T03:04:05Z`
 * and `2026-01-02T03:04:05+02:00`, and refuses the zone-less
 * `2026-01-02T03:04:05`, the date alone `2026-01-02`, and the
 * calendar-impossible `2026-02-31T00:00:00Z`. So a bound names an
 * instant, and a day that does not exist is a refusal here rather
 * than the 3rd of March arrived at through `Date`'s own rollover.
 *
 * `local: true` is deliberately not passed. A zone-less stamp is a
 * wall-clock reading whose meaning is the SERVER's zone, and that
 * is a silent per-deployment difference in which rows a window
 * holds: `new Date('2026-01-02T03:04:05')` measured here answers
 * `2026-01-02T02:04:05.000Z`, and would answer something else on a
 * host set to another offset. It is the same fault
 * `GET /spend/summary` buckets explicitly at UTC to avoid.
 *
 * The format is parsed FIRST and the `Date` constructed second,
 * which is what `z.coerce.date()` would not do: that schema is
 * `new Date(value)` over anything, and measured here it accepts
 * `'2026'`, the bare number `1767225845000` and `'March 3 2026'`.
 * A window bound is a parameter a person types, so the accepted set
 * has to be a format rather than whatever `Date` can be talked
 * into.
 */
const timeStampSchema = z.iso.datetime({ offset: true })
  .transform((value) => new Date(value));

/**
 * The parameter an inverted window is refused against.
 *
 * One field rather than both, because two details would say the
 * same thing twice about one pair, and `since` rather than `until`
 * because the refusal is stated that way round in
 * `docs/architecture/08-http-api.md`: a `since` at or after its
 * `until`.
 */
const WINDOW_ORDER_FIELD = 'since';

/**
 * What the ordering refusal is worded as.
 *
 * This repo's own sentence, carrying neither bound. It does not
 * reach the wire through `./validation.ts`, whose vocabulary is
 * keyed on the issue CODE and answers `custom` with a fixed
 * message of its own — but `zodToValidationError` in
 * `lib/errors/handler.ts` copies `issue.message` verbatim for any
 * raw `ZodError` that reaches `errorHandler`, so a message written
 * out of the submitted stamps would be a leak waiting on one
 * handler calling `.parse()`.
 */
const INVERTED_WINDOW_MESSAGE = 'since must be before until';

/**
 * Whether a parsed pair of bounds names a window at all.
 *
 * @param window - The parsed members, either or both absent.
 * @returns `true` unless both bounds are present and `since` is at
 *   or after `until`. A half-bounded or unbounded window is
 *   ordered by construction, there being nothing for it to
 *   contradict.
 *
 * @remarks
 * Strictly before, so an EMPTY window is the one thing an operator
 * cannot ask for by accident: equal bounds hold no row under
 * half-open semantics, and a caller that sent the same stamp twice
 * meant a day rather than nothing.
 */
function isOrderedWindow(window: {
  readonly since?: Date;
  readonly until?: Date;
}): boolean {
  if (window.since === undefined || window.until === undefined) {
    return true;
  }

  return window.since.getTime() < window.until.getTime();
}

/**
 * The `?since` / `?until` window the findings list and the spend
 * summary are read through, and the only time vocabulary either
 * accepts. No `?from`/`?to`, no `?days`, no bare `?date`.
 *
 * Both members are optional and neither carries a default, because
 * an absent bound is a real state rather than a missing one: a
 * window open at one end is what a caller asking for everything
 * since a stamp means, and {@link toTimeWindow} carries that
 * openness to the store as a `null` instead of inventing an
 * endpoint here.
 *
 * A ROUTE EXTENDS THIS SCHEMA, IT DOES NOT EXTEND INTO IT, and the
 * direction is load-bearing rather than stylistic. The ordering
 * refusal is a check on the OBJECT, and measured under this tree's
 * zod, `timeWindowQuerySchema.extend(paginationQuerySchema.shape)`
 * carries that check onto the extended schema while
 * `paginationQuerySchema.extend(timeWindowQuerySchema.shape)`
 * silently drops it and ACCEPTS an inverted window. Both spellings
 * type-check, both answer every other case identically, and only
 * one of them refuses. So a list route reading a window composes
 * from here outwards, and `src/http/schemas.test.ts` holds an
 * inverted window through that composition rather than through
 * this schema alone.
 *
 * Strict, like `paginationQuerySchema`, and the two strictnesses
 * are the same claim about opting in: a `?since` sent to a route
 * that declares no window is a `422` naming `query` rather than a
 * filter quietly dropped, which is the difference between a caller
 * being told its narrowing was ignored and a caller reading an
 * unnarrowed page as the answer to it.
 */
export const timeWindowQuerySchema = z.object({
  since: timeStampSchema.optional(),
  until: timeStampSchema.optional(),
})
  .strict()
  .refine(isOrderedWindow, {
    path: [WINDOW_ORDER_FIELD],
    message: INVERTED_WINDOW_MESSAGE,
  });

/**
 * A parsed window: either bound, both, or neither.
 */
export type TimeWindowQuery = z.infer<typeof timeWindowQuerySchema>;

/**
 * The window in the vocabulary a store port takes: half-open, and
 * saying so in its member NAMES.
 *
 * A separate shape from {@link TimeWindowQuery} on the same terms
 * {@link StoreWindow} is separate from {@link PaginationQuery} —
 * one is what a caller asked for and the other is what SQL is
 * handed. The renaming does more work here, though. `since` and
 * `until` are two words that do not say which side they close, and
 * a store writing `<= untilExclusive` is a bug no type could
 * report; a member called `untilExclusive` is read by whoever
 * writes the predicate, which is where the mistake would be made.
 *
 * Both members are always present and `null` is what unbounded
 * looks like. An absent key and a key holding `undefined` are two
 * spellings of one state, and a store branching on `!== null` over
 * a required member cannot meet a third.
 */
export interface TimeWindow {
  /** The lower bound. A row stamped exactly here is IN. */
  readonly sinceInclusive: Date | null;
  /** The upper bound. A row stamped exactly here is OUT. */
  readonly untilExclusive: Date | null;
}

/**
 * Translates a parsed `?since` / `?until` pair into the half-open
 * bounds a store port takes.
 *
 * @param query - A window that has already been through
 *   {@link timeWindowQuerySchema}, or a query that extended it.
 *   Either bound may be absent; if both are present the schema has
 *   already established that `since` is strictly before `until`, so
 *   there is no ordering guard here.
 * @returns The same window as `[sinceInclusive, untilExclusive)`,
 *   with an absent bound answered as `null`.
 *
 * @remarks
 * The whole of the translation, for the reason
 * {@link toStoreWindow} is the whole of the other one: two surfaces
 * each writing `query.since ?? null` is one chance to write
 * `?? new Date(0)` and answer a window nobody asked for. That it is
 * currently a rename is the point — the store ports never see the
 * wire's spelling, so the day a bound needs normalising there is
 * one place it happens.
 */
export function toTimeWindow(query: TimeWindowQuery): TimeWindow {
  return {
    sinceInclusive: query.since ?? null,
    untilExclusive: query.until ?? null,
  };
}

/**
 * The `?sort` a list route reads, over the ordering keys THAT
 * route declares.
 *
 * A function rather than a schema, because there is no shared set
 * of orderings to declare: the findings list offers `score` and
 * `recency`, and a later collection will offer neither. What IS
 * shared is the vocabulary — one parameter called `sort`, holding
 * one member of a written-out tuple — and that is what this
 * builder fixes.
 *
 * A KEY NAMES AN ORDERING, NEVER A COLUMN, and the tuple is what
 * makes that true rather than a convention. `score` on the findings
 * list is three keys deep, and the whole of it lives behind that
 * one word. A route accepting a column name would be accepting an
 * order no index answers; one accepting a direction beside the key
 * would be putting a second authority on an order this repository
 * has settled once, in `compareFindings`.
 *
 * The FIRST member is the default, so the tuple states the default
 * ordering by its own order and no route repeats it. A key outside
 * the tuple is `invalid_value` naming `sort` and carrying the
 * accepted options in zod's own message — which
 * `./validation.ts` does not copy, so what a caller reads is this
 * repo's fixed sentence for that code.
 *
 * @param keys - The orderings this route offers, most-default
 *   first. A non-empty tuple, so `keys[0]` is a key rather than
 *   possibly nothing.
 * @returns A strict object schema over one optional `sort`,
 *   defaulted to `keys[0]`, for a route to `.extend()` into its own
 *   query schema.
 *
 * @example
 * ```ts
 * const SORT_KEYS = ['score', 'recency'] as const;
 *
 * const findingListQuerySchema = timeWindowQuerySchema
 *   .extend(paginationQuerySchema.shape)
 *   .extend(sortQuerySchema(SORT_KEYS).shape);
 * ```
 */
export function sortQuerySchema<Key extends string>(
  keys: readonly [Key, ...Key[]],
) {
  return z.object({
    sort: z.enum(keys).default(keys[0]),
  }).strict();
}
