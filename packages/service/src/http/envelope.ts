/**
 * @packageDocumentation
 * The success half of the wire contract: `{ success: true, data }`,
 * plus the `meta` a paginated list carries beside it. Every wave-1
 * route answers through {@link ok} or {@link okPage}, and this module
 * is the only place either object is built.
 *
 * THE FAILURE HALF IS NOT BUILT HERE, AND IS NOT THIS SHAPE. A
 * refusal answers the framework's own `{ code, message, details? }`
 * — what `AppError.toJSON()` in `lib/errors/errors.ts` produces and
 * the `errorHandler` that `createService` registers LAST writes —
 * with the HTTP status carrying the failure. Nothing here ever emits
 * `{ success: false }`, so `success` is a discriminator that is `true`
 * on every body this module writes rather than a status code in
 * disguise. That shape IS described at the bottom of this module, as
 * {@link errorEnvelopeSchema}, so one document can carry both halves
 * of this wire; no function here produces it and nothing here parses
 * it.
 *
 * That asymmetry is a decision, and the cheaper of the two available.
 * Reshaping the failure half means editing `lib/errors/handler.ts`:
 * vendored framework code, with its own characterization tests,
 * already answering for `/health`, `/_control`, `/auth` and every
 * unhandled throw in the process. The choice is between one asymmetry
 * written down and two error shapes on the wire, and two shapes costs
 * more for everyone downstream — starting with `parseApiError` in
 * `lib/errors/client.ts`, which reads the shape the framework already
 * emits.
 *
 * The second reason is that a single envelope could not carry this
 * surface anyway. The one-envelope form's `error?: string` has nowhere
 * to put the `FieldError[]` a 422 owes, and a single string would
 * either drop those field paths or encode them into prose — which is
 * the one thing a machine-readable failure must not be.
 *
 * `docs/architecture/08-http-api.md` argues both envelopes at length
 * and is where a change to either is recorded. This comment states the
 * half that governs the code beside it, so a reader who arrives here
 * first is not left inferring a `{ success: false }` that no route
 * writes.
 *
 * The last third of this module states those same two shapes a
 * SECOND time, as zod schemas, for the OpenAPI document to carry as
 * reusable components, and adds the failure shape above as a third.
 * Nothing there parses a response at runtime and nothing there is
 * derived from the interfaces above; the comment over each says what
 * holds the two declarations equal — and, for the failure schema,
 * what holds it equal to a shape another package declares.
 */
import { z } from 'zod';

/**
 * The window a paginated list was read through, and the size of the
 * collection it was read from.
 *
 * Built only by {@link buildPaginationMeta}, which derives
 * {@link PaginationMeta.totalPages} from the other three — so no
 * caller can hand a client a page count that disagrees with the page
 * it describes.
 *
 * The four member names match `PaginationMeta` in
 * `packages/ui/src/cache/types.ts`, which declares the same four under
 * a `pagination` key rather than `meta` and has no consumer anywhere
 * today. The two shapes are not yet in contact; reconciling them is a
 * decision for whoever swaps `@ar/web`'s fixtures for this API.
 */
export interface PaginationMeta {
  /** 1-based index of the page this body carries. */
  readonly page: number;
  /** The window size that was asked for, not the row count answered. */
  readonly perPage: number;
  /** Rows in the whole collection, ignoring the window. */
  readonly total: number;
  /** Pages the collection spans at this `perPage`. `0` when empty. */
  readonly totalPages: number;
}

/**
 * The three facts {@link buildPaginationMeta} derives a page count
 * from: the window the caller asked for, and what the store counted.
 */
export interface PaginationInput {
  /** 1-based page, as parsed from `?page`. */
  readonly page: number;
  /** Rows per page, as parsed from `?perPage`. */
  readonly perPage: number;
  /** The store's own count of the whole collection. */
  readonly total: number;
}

/**
 * A success body carrying one resource.
 *
 * @typeParam T - The resource shape `data` holds.
 */
export interface SuccessEnvelope<T> {
  /** Always `true`. The discriminator, never a status code. */
  readonly success: true;
  /** The resource. */
  readonly data: T;
}

/**
 * A success body carrying one page of a collection.
 *
 * `data` is an array and the body is still an object, so a member can
 * be added beside it later without changing the type of the response.
 *
 * @typeParam T - The row shape `data` holds.
 */
export interface PaginatedEnvelope<T> {
  /** Always `true`. The discriminator, never a status code. */
  readonly success: true;
  /** The rows in this page, in the order the store returned them. */
  readonly data: readonly T[];
  /** The window those rows were read through. */
  readonly meta: PaginationMeta;
}

/**
 * Wraps one resource in the success envelope.
 *
 * @param data - The resource to answer with. Carried by reference and
 *   never copied, cloned or reshaped: what a route hands in is what
 *   `JSON.stringify` sees, so a column a store should not have
 *   projected is not hidden by anything here.
 * @returns `{ success: true, data }`.
 */
export function ok<T>(data: T): SuccessEnvelope<T> {
  return { success: true, data };
}

/**
 * Wraps one page of a collection in the success envelope, beside the
 * window it was read through.
 *
 * @param rows - The page's rows. May be empty: a page past the end of
 *   a collection is an empty list and not a 404, because the
 *   collection exists and only the window over it is empty.
 * @param meta - The window, from {@link buildPaginationMeta}.
 * @returns `{ success: true, data: rows, meta }`.
 *
 * @remarks
 * Built by spreading {@link ok}, so the literal `success: true` is
 * written once in this package and both envelopes cannot drift apart
 * on the member that discriminates them.
 */
export function okPage<T>(
  rows: readonly T[],
  meta: PaginationMeta,
): PaginatedEnvelope<T> {
  return { ...ok(rows), meta };
}

/**
 * Derives the `meta` of a paginated answer from the window that was
 * asked for and the count the store answered with.
 *
 * @param input - The parsed window plus the store's total.
 * @returns The three inputs echoed, plus `totalPages` as
 *   `Math.ceil(total / perPage)` — which is `0` for an empty
 *   collection rather than `1`, since a collection with no rows has no
 *   pages to ask for.
 *
 * @remarks
 * `page` is echoed and never clamped, so a `?page=99` over a two-page
 * collection answers `99` beside `totalPages: 2` and the caller can
 * see that it overshot. Clamping would make `meta` disagree with the
 * request that produced it, which is the same argument
 * `src/http/schemas.ts` makes for refusing an over-cap `perPage`
 * instead of quietly lowering it.
 *
 * `perPage` is not re-checked here for being at least 1. It arrives
 * from `paginationQuerySchema`, which refuses anything else at the
 * boundary; a second, silent guard in this module would be exactly
 * the `meta`-disagrees-with-the-request shape the paragraph above
 * exists to prevent, and would move a boundary rule to a place no
 * reader of the boundary would look for it.
 */
export function buildPaginationMeta(input: PaginationInput): PaginationMeta {
  const { page, perPage, total } = input;

  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}

// ---------------------------------------------------------------------------
// The same shapes, as schemas
// ---------------------------------------------------------------------------

/**
 * {@link PaginationMeta} as a schema, for the OpenAPI document to
 * carry as a reusable component.
 *
 * A SECOND declaration of a shape this module already states as an
 * interface, and that is the standing cost of documenting a
 * response: nothing here is derived from `PaginationMeta`, and
 * neither `lint` nor `check-types` holds the two equal. What holds
 * them equal is `./envelope.test.ts`, which parses what
 * {@link buildPaginationMeta} actually built rather than a literal
 * written out beside it — so a member renamed on one side is a red
 * case instead of a document describing a body no route writes.
 *
 * `total` and `totalPages` are non-negative where `page` and
 * `perPage` are positive, and the asymmetry is the empty
 * collection: it answers `0` for both counts, which is the one
 * window shape a positive bound would refuse. The other two are
 * echoes of a query `src/http/schemas.ts` has already held to being
 * positive.
 *
 * The `perPage` CEILING is deliberately not restated. It is a bound
 * on the REQUEST and it belongs to that module; a literal 200 here
 * would be a second authority for it, kept in step with the first by
 * nothing at all. The same argument `resourceIdParamSchema` makes
 * for writing no `.max()` beside its `.int()`.
 */
export const paginationMetaSchema = z.object({
  page: z.number().int()
    .positive(),
  perPage: z.number().int()
    .positive(),
  total: z.number().int()
    .nonnegative(),
  totalPages: z.number().int()
    .nonnegative(),
}).strict();

/**
 * {@link SuccessEnvelope} as a schema: the body every route
 * answering ONE resource writes.
 *
 * `data` is `z.unknown()` and stays that way. Every record on this
 * surface is a TypeScript interface with no schema behind it —
 * `DomainRecord` and 24 siblings — so a schema per record would be 25
 * more second declarations with nothing comparing them to the
 * interfaces they restate. What this one documents is the ENVELOPE:
 * that a success body carries these two members, that `success` is
 * the discriminator, and that whatever was answered sits under
 * `data`. Per-record response schemas are deferred rather than
 * forgotten, and this paragraph is the whole of that record until the
 * not-enforced row naming the deferral lands in the register in
 * `docs/architecture/01-invariants.md`, which carries no such row
 * today.
 *
 * An open `data` is not an ABSENT one. Measured under the zod 4.5.1
 * in this tree, `z.unknown()` still requires the key: a body with no
 * `data` member at all is refused, while one carrying an explicit
 * `undefined` parses and drops it. So the openness is about what
 * `data` holds, never about whether a route answered anything.
 *
 * Strict, which means the body {@link okPage} builds is NOT a member
 * of this shape — its `meta` is an unrecognized key here. That is
 * the point rather than an oversight: the two envelopes are
 * documented separately, and a list route bound to this one is a red
 * case in `./envelope.test.ts` rather than an OpenAPI document that
 * omits the window every page it describes carries.
 */
export const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
}).strict();

/**
 * {@link PaginatedEnvelope} as a schema: the body every route
 * answering one PAGE writes.
 *
 * Extended from {@link successEnvelopeSchema} for the reason
 * {@link okPage} is built by spreading {@link ok} — the literal
 * `success: true` is written once on this side of the module too, so
 * the two schemas cannot drift apart on the member that
 * discriminates them. Strictness survives the extension, measured
 * rather than assumed.
 *
 * `data` is an array of unknowns rather than a bare unknown, which
 * is the one thing knowable about a page without knowing its rows:
 * `okPage` takes `readonly T[]`, so a body under this schema always
 * carries a list. The rows themselves stay as open as the single
 * resource above.
 *
 * One measured consequence for anything that parses a live body
 * rather than merely documenting it: an array schema REBUILDS the
 * array, so this schema's parse output carries a new `data` holding
 * the same row references, where the single-resource schema hands
 * back the object it was given.
 */
export const paginatedEnvelopeSchema = successEnvelopeSchema.extend({
  data: z.array(z.unknown()),
  meta: paginationMetaSchema,
});

/**
 * The framework's failure body, `{ code, message, details? }`, as a
 * schema — so one document can carry both halves of this wire.
 *
 * The odd member of this section, and deliberately so: nothing in
 * this module BUILDS this shape. It is what `AppError.toJSON()` in
 * `lib/errors/errors.ts` produces and what the `errorHandler` that
 * `createService` registers LAST writes, with the HTTP status
 * carrying the failure. It is declared here because `src/http/` is
 * where this service's wire vocabulary lives and a document
 * describing only the success half would describe no route
 * completely — not because anything here answers a refusal.
 *
 * `details` is the member with a decision in it. `AppError` types it
 * `unknown`, and this schema claims something narrower: absent or
 * present, and when present STRUCTURED — the `FieldError[]` a
 * refused parse carries, or the dependent-count record a refused
 * delete carries — but never a bare string. That is the argument
 * the head of this module already makes, stated as a parse: a single
 * string would encode those field paths into prose, which is the one
 * thing a machine-readable failure must not be.
 *
 * Nothing in `lib/errors` enforces that, so what holds the claim
 * true is `./envelope.test.ts`, which parses bodies captured off
 * real responses rather than literals written out beside it. Both
 * union members are load-bearing, measured rather than assumed:
 * `z.record(z.string(), z.unknown())` refuses an array, so dropping
 * either one would refuse half of what this surface answers.
 *
 * Strict, which makes the THIRD body on this wire a non-member.
 * `requireAuth` in `lib/express/auth.ts` answers `401` with
 * `{ error: 'Unauthorized' }` before any handler runs, and that body
 * is in neither envelope — which several router modules already
 * say in prose and this schema now refuses. `statusCode` is not a
 * member either: `AppErrorShape` in `lib/errors/types.ts` declares
 * one, but `parseApiError` fills it CLIENT-side from the HTTP status
 * and no body on this wire carries it.
 */
export const errorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.union([
    z.array(z.unknown()),
    z.record(z.string(), z.unknown()),
  ]).optional(),
}).strict();
