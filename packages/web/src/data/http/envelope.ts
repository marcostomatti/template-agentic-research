/**
 * @packageDocumentation
 * The service's wire envelopes, decoded: one success reading, one
 * paginated reading, and one failure reading that folds every refusal the
 * service can answer into a single {@link ApiError}.
 *
 * Every function here is pure. Each takes the HTTP status and the body as
 * the raw text `Response.text()` answered, so the client stays the only
 * module that touches `fetch` and this one can be tested with no stub at
 * all. A body is parsed here rather than by the caller because "not JSON"
 * is itself one of the readings — a `429` or an unmatched path answers
 * `text/html`.
 *
 * The shapes decoded, as `packages/service/docs/architecture/08-http-api.md`
 * records them:
 *
 * - success: `{ success: true, data }`;
 * - list: `{ success: true, data: [], meta: { page, perPage, total,
 *   totalPages } }`, `totalPages` being `0` when `total` is `0`;
 * - the framework's failure: `{ code, message, details? }`;
 * - `requireAuth`: `401 { error: 'Unauthorized' }`;
 * - the login limiter: `429 { error: 'Too Many Requests' }`;
 * - anything else: a body in neither shape, often not JSON at all.
 *
 * `parseApiError` in the service's `lib/errors/client.ts` is deliberately
 * NOT ported: it reads a bare `401` as `NETWORK_ERROR`, and this client
 * keys its sign-out on {@link ApiError.code} being `UNAUTHORIZED`.
 */

/** The code a success body that is not a `{ success: true, data }` gets. */
export const BAD_ENVELOPE = 'BAD_ENVELOPE';

/** The code a refused credential gets, whichever body carried it. */
export const UNAUTHORIZED = 'UNAUTHORIZED';

/** The code a rate-limited request gets, whichever body carried it. */
export const RATE_LIMITED = 'RATE_LIMITED';

/**
 * The code for a status no framework error class names. Exported so the
 * status-derived fallback is a value a caller can compare against rather
 * than a string it re-spells.
 */
export const HTTP_ERROR = 'HTTP_ERROR';

/**
 * The status-derived codes, spelled as the framework's own error classes
 * spell them (`lib/errors/errors.ts`) so a body-less refusal and a
 * framework one discriminate on the same word.
 */
const STATUS_CODES: Readonly<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: UNAUTHORIZED,
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: RATE_LIMITED,
};

/** The bare `{ error }` strings that name a code of their own. */
const BARE_ERROR_CODES: Readonly<Record<string, string>> = {
  'Unauthorized': UNAUTHORIZED,
  'Too Many Requests': RATE_LIMITED,
};

const SERVER_ERROR_FLOOR = 500;

/** What {@link ApiError} is built from. */
export interface ApiErrorInit {
  /** The HTTP status; `0` when no response arrived. */
  readonly status: number;
  /** The machine-readable name a caller discriminates on. */
  readonly code: string;
  /** A human-readable sentence. */
  readonly message: string;
  /** Whatever the service attached, such as a field error list. */
  readonly details?: unknown;
}

/**
 * The one error every request made through the client rejects with.
 *
 * `code` is what a caller branches on; `status` is kept because the
 * status is what the service treats as the verdict, and `details` is
 * passed through untouched because only the route that raised it knows
 * its shape.
 */
export class ApiError extends Error {
  /** The HTTP status; `0` when no response arrived. */
  readonly status: number;
  /** The machine-readable name a caller discriminates on. */
  readonly code: string;
  /** What the service attached, or `undefined` when it attached nothing. */
  readonly details: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
  }
}

/** The four members a paginated list answers beside its rows. */
export interface PageMeta {
  /** The 1-based page answered. */
  readonly page: number;
  /** The window size answered. */
  readonly perPage: number;
  /** The size of the whole collection. */
  readonly total: number;
  /** `ceil(total / perPage)`, and so `0` for an empty collection. */
  readonly totalPages: number;
}

/** A decoded paginated list. */
export interface Page<T> {
  /** The rows of this page, possibly none past the end. */
  readonly rows: readonly T[];
  /** The window the rows were read through. */
  readonly meta: PageMeta;
}

type JsonReading =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false };

function readJson(text: string): JsonReading {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown, floor: number): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= floor;
}

function badEnvelope(status: number, message: string): ApiError {
  return new ApiError({ status, code: BAD_ENVELOPE, message });
}

/**
 * Read a success body down to its `{ success: true, data }` record.
 *
 * @throws ApiError with code {@link BAD_ENVELOPE} when the body is not
 * JSON, not an object, lacks `success: true` or lacks `data`.
 */
function readSuccess(status: number, text: string): Record<string, unknown> {
  const reading = readJson(text);

  if (!reading.ok) {
    throw badEnvelope(status, 'The response body is not JSON.');
  }

  const body = reading.value;

  if (!isRecord(body) || body.success !== true || !('data' in body)) {
    throw badEnvelope(
      status,
      'The response body is not a { success: true, data } envelope.',
    );
  }

  return body;
}

/**
 * Unwrap a success body to its `data`.
 *
 * The payload is returned as the caller's `T` without being validated:
 * checking a resource's shape belongs to the accessor that knows it.
 *
 * @param status - The HTTP status the body arrived with.
 * @param text - The raw body.
 * @returns The envelope's `data`.
 * @throws ApiError with code {@link BAD_ENVELOPE} when the body is not a
 * `{ success: true, data }` envelope.
 */
export function decodeData<T>(status: number, text: string): T {
  return readSuccess(status, text).data as T;
}

function toPageMeta(value: unknown): PageMeta | null {
  if (!isRecord(value)) {
    return null;
  }

  const { page, perPage, total, totalPages } = value;

  if (!isCount(page, 1) || !isCount(perPage, 1)) {
    return null;
  }

  if (!isCount(total, 0) || !isCount(totalPages, 0)) {
    return null;
  }

  return { page, perPage, total, totalPages };
}

/**
 * Unwrap a paginated body to `{ rows, meta }`.
 *
 * `meta` is checked member by member because the client's page walk
 * steers by it; a `meta` that is present but malformed is refused rather
 * than walked.
 *
 * @param status - The HTTP status the body arrived with.
 * @param text - The raw body.
 * @returns The page's rows and its four `meta` members.
 * @throws ApiError with code {@link BAD_ENVELOPE} when the body is not a
 * success envelope, `data` is not an array, or `meta` is missing or has
 * a member that is not a whole number in range.
 */
export function decodePage<T>(status: number, text: string): Page<T> {
  const body = readSuccess(status, text);

  if (!Array.isArray(body.data)) {
    throw badEnvelope(status, 'A paginated response needs an array of data.');
  }

  const meta = toPageMeta(body.meta);

  if (meta === null) {
    throw badEnvelope(
      status,
      'A paginated response needs meta { page, perPage, total, totalPages }.',
    );
  }

  return { rows: body.data as readonly T[], meta };
}

/**
 * The code a status implies when the body names none.
 *
 * @param status - The HTTP status.
 * @returns The framework's name for the status, `INTERNAL_ERROR` for any
 * `5xx`, and {@link HTTP_ERROR} for anything else.
 */
export function codeForStatus(status: number): string {
  const named = STATUS_CODES[status];

  if (named !== undefined) {
    return named;
  }

  return status >= SERVER_ERROR_FLOOR
    ? 'INTERNAL_ERROR'
    : HTTP_ERROR;
}

function statusMessage(status: number): string {
  return `The service answered ${String(status)}.`;
}

/**
 * Normalise a failed response into one {@link ApiError}.
 *
 * Read in this order:
 *
 * 1. The framework's `{ code, message, details? }` is taken as given —
 *    its `code` wins over the status, and `details` is kept only when
 *    the body carried it.
 * 2. A bare `{ error }` naming `Unauthorized` or `Too Many Requests`
 *    becomes {@link UNAUTHORIZED} or {@link RATE_LIMITED}; any other bare
 *    `{ error }` string keeps its sentence under the status-derived code.
 * 3. Anything else — not JSON, or JSON in neither shape — gets the
 *    status-derived code from {@link codeForStatus}.
 *
 * @param status - The HTTP status the body arrived with.
 * @param text - The raw body.
 * @returns The normalised error; returned rather than thrown, so the
 * caller decides where the rejection happens.
 */
export function decodeFailure(status: number, text: string): ApiError {
  const reading = readJson(text);
  const body = reading.ok
    ? reading.value
    : undefined;

  if (isRecord(body)) {
    const { code, message, error } = body;

    if (typeof code === 'string' && typeof message === 'string') {
      return new ApiError({
        status,
        code,
        message,
        ...('details' in body
          ? { details: body.details }
          : {}),
      });
    }

    if (typeof error === 'string') {
      return new ApiError({
        status,
        code: BARE_ERROR_CODES[error] ?? codeForStatus(status),
        message: error,
      });
    }
  }

  return new ApiError({
    status,
    code: codeForStatus(status),
    message: statusMessage(status),
  });
}
