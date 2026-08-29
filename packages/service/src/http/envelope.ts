/**
 * @packageDocumentation
 * The success half of the wire contract: `{ success: true, data }`,
 * plus the `meta` a paginated list carries beside it. Every wave-1
 * route answers through {@link ok} or {@link okPage}, and this module
 * is the only place either object is built.
 *
 * THE FAILURE HALF IS NOT HERE, AND IS NOT THIS SHAPE. A refusal
 * answers the framework's own `{ code, message, details? }` — what
 * `AppError.toJSON()` in `lib/errors/errors.ts` produces and the
 * `errorHandler` that `createService` registers LAST writes — with
 * the HTTP status carrying the failure. Nothing here ever emits
 * `{ success: false }`, so `success` is a discriminator that is `true`
 * on every body this module writes rather than a status code in
 * disguise.
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
 */

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
