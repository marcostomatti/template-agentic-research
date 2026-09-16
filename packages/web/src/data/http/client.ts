/**
 * @packageDocumentation
 * The HTTP client: the one module in the web app that calls `fetch`.
 *
 * {@link createApiClient} answers typed `get`, `post`, `put`, `patch` and
 * `delete` calls plus a {@link ApiClient.fetchAllPages} walk, and every
 * one of them either resolves to the envelope's decoded payload or
 * rejects with ONE error type, {@link ApiError}:
 *
 * - a `2xx` body is unwrapped by `envelope.ts`, and a `204` resolves to
 *   `undefined` because a delete answers no body at all;
 * - any other status is normalised by `decodeFailure`, so the framework's
 *   `{ code, message, details? }` and the bare `{ error }` bodies arrive as
 *   the same class;
 * - a `fetch` that rejects, or a body that cannot be read, is code
 *   {@link NETWORK} with status `0`, because no verdict arrived.
 *
 * A code of `UNAUTHORIZED` is the one reading the client acts on itself:
 * it clears the session and calls `onUnauthorized` BEFORE the promise
 * rejects, so the redirect to the login route is already under way by the
 * time the caller's error state renders, and a token the service has
 * refused is never sent a second time.
 *
 * The bearer header is attached from the injected session port on every
 * request, read at request time rather than when the client is built, so a
 * login or logout needs no new client. The session store's `get` is what
 * drops an expired session, which is why an expired token is never sent.
 *
 * `fetch` and the session are injected ports because the unit runner is
 * node-only and because only `src/data/http/`, `src/data/auth.ts` and
 * `src/routes/login/` may import this module; a page reads data through
 * `src/data/hooks.ts` and never holds a client.
 */

import type { Page } from './envelope';
import type { SessionStore } from '../../auth/session';

import { ApiError, decodeData, decodeFailure, decodePage, UNAUTHORIZED } from './envelope';

/** The code a request that got no response rejects with. */
export const NETWORK = 'NETWORK';

/**
 * The code a page walk rejects with when a later page's `meta` answers a
 * different `totalPages` than the first page did. The collection changed
 * under the walk, so the rows gathered so far describe no single moment.
 */
export const PAGINATION_DRIFT = 'PAGINATION_DRIFT';

/** The window size a page walk requests: the service's cap. */
export const WALK_PER_PAGE = 200;

const NO_CONTENT = 204;
const SUCCESS_FLOOR = 200;
const SUCCESS_CEILING = 300;

/** The two members of a `Response` the client reads. */
export interface ResponsePort {
  /** The HTTP status. */
  readonly status: number;
  /** The whole body as text; it may reject when the connection drops. */
  text(): Promise<string>;
}

/** The request the client hands `fetch`: a subset of `RequestInit`. */
export interface RequestPort {
  /** The HTTP method, upper-case. */
  readonly method: string;
  /** `Accept`, plus `Content-Type` with a body and the bearer when held. */
  readonly headers: Readonly<Record<string, string>>;
  /** The JSON-encoded body; absent when the call sends none. */
  readonly body?: string;
}

/**
 * The `fetch` the client is built over. The global `fetch` satisfies it,
 * but must be passed bound (`(url, init) => fetch(url, init)`), since
 * calling `window.fetch` detached from `window` throws in a browser.
 */
export type FetchPort = (url: string, init: RequestPort) => Promise<ResponsePort>;

/** The part of the session store the client reads and clears. */
export type SessionPort = Pick<SessionStore, 'get' | 'clear'>;

/** A query-string value; `undefined` leaves the parameter out. */
export type QueryValue = string | number | boolean | undefined;

/** Query parameters, appended in the order given. */
export type Query = Readonly<Record<string, QueryValue>>;

/** What a request takes beside its path and body. */
export interface RequestOptions {
  /** Appended to the path as a query string. */
  readonly query?: Query;
}

/** What {@link createApiClient} is built over. */
export interface ApiClientDeps {
  /**
   * Prefixed to every path: `''` for same-origin, `/api` behind the dev
   * proxy, or an absolute origin. A trailing `/` is ignored.
   */
  readonly baseUrl: string;
  /** The transport. */
  readonly fetch: FetchPort;
  /** Where the bearer token is read from, and cleared on `UNAUTHORIZED`. */
  readonly session: SessionPort;
  /** Called once per `UNAUTHORIZED` response, after the session is cleared. */
  readonly onUnauthorized: () => void;
}

/** The client's surface. Every path is root-absolute, such as `/domains`. */
export interface ApiClient {
  /** `GET` a resource and resolve to its envelope's `data`. */
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  /** `POST` a JSON body and resolve to the answer's `data`. */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  /** `PUT` a JSON body and resolve to the answer's `data`. */
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  /** `PATCH` a JSON body and resolve to the answer's `data`. */
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  /**
   * `DELETE` a resource. Resolves to `undefined` on a `204`, the answer
   * every delete route gives, and to `data` when a body is sent.
   */
  delete<T = undefined>(path: string, options?: RequestOptions): Promise<T>;
  /**
   * Read a whole paginated list, one `GET` per page at `perPage=200`.
   *
   * Starts at `page=1` and stops at `page === totalPages`, so an empty
   * collection (`total: 0`, and so `totalPages: 0`) costs one request.
   *
   * @param path - The list's root-absolute path.
   * @param query - Filters sent with every page; `page` and `perPage`
   * belong to the walk and are refused here.
   * @returns Every row, in page order.
   * @throws ApiError with code {@link PAGINATION_DRIFT} when a later page's
   * `meta.totalPages` differs from the first page's, and whatever a single
   * request rejects with — a failed page ends the walk.
   * @throws TypeError when `query` names `page` or `perPage`.
   */
  fetchAllPages<T>(path: string, query?: Query): Promise<readonly T[]>;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Call {
  readonly method: Method;
  readonly path: string;
  readonly query?: Query;
  readonly body?: unknown;
}

/**
 * Join the base URL and a root-absolute path.
 *
 * A path that is not root-absolute is refused rather than resolved: an
 * absolute URL, or a protocol-relative `//host`, would carry the bearer
 * token to a host that is not the service.
 *
 * @throws TypeError when `path` does not open with exactly one `/`.
 */
export function joinUrl(baseUrl: string, path: string, query?: Query): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError(`A request path must be root-absolute, got "${path}".`);
  }

  const params = new URLSearchParams(
    Object.entries(query ?? {}).flatMap(([key, value]) => value === undefined
      ? []
      : [[key, String(value)]]),
  ).toString();
  const search = params === ''
    ? ''
    : `?${params}`;

  return `${baseUrl.replace(/\/+$/, '')}${path}${search}`;
}

function reasonOf(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : String(cause);
}

function networkError(cause: unknown): ApiError {
  return new ApiError({
    status: 0,
    code: NETWORK,
    message: `The request did not reach the service: ${reasonOf(cause)}`,
  });
}

function headersFor(session: SessionPort, hasBody: boolean): Record<string, string> {
  const held = session.get();

  return {
    Accept: 'application/json',
    ...(hasBody
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(held === null
      ? {}
      : { Authorization: `Bearer ${held.token}` }),
  };
}

/**
 * Build an API client over an injected transport and session.
 *
 * @param deps - The base URL, `fetch`, the session and the sign-out hook.
 * @returns A client holding no state of its own.
 */
export function createApiClient(deps: ApiClientDeps): ApiClient {
  const { baseUrl, fetch, session, onUnauthorized } = deps;

  /** Send one request and answer its status and body text. */
  const send = async (call: Call): Promise<{ status: number; text: string }> => {
    const url = joinUrl(baseUrl, call.path, call.query);
    const hasBody = call.body !== undefined;
    const init: RequestPort = {
      method: call.method,
      headers: headersFor(session, hasBody),
      ...(hasBody
        ? { body: JSON.stringify(call.body) }
        : {}),
    };

    try {
      const response = await fetch(url, init);

      return { status: response.status, text: await response.text() };
    } catch (cause) {
      throw networkError(cause);
    }
  };

  /** Throw the normalised failure, signing out first on `UNAUTHORIZED`. */
  const refuse = (status: number, text: string): never => {
    const error = decodeFailure(status, text);

    if (error.code === UNAUTHORIZED) {
      session.clear();
      onUnauthorized();
    }

    throw error;
  };

  const isSuccess = (status: number): boolean => status >= SUCCESS_FLOOR && status < SUCCESS_CEILING;

  const request = async <T>(call: Call): Promise<T> => {
    const { status, text } = await send(call);

    if (!isSuccess(status)) {
      return refuse(status, text);
    }

    return status === NO_CONTENT
      ? (undefined as T)
      : decodeData<T>(status, text);
  };

  const requestPage = async <T>(
    path: string,
    query: Query,
  ): Promise<{ status: number; page: Page<T> }> => {
    const { status, text } = await send({ method: 'GET', path, query });

    if (!isSuccess(status)) {
      return refuse(status, text);
    }

    return { status, page: decodePage<T>(status, text) };
  };

  const fetchAllPages = async <T>(
    path: string,
    query: Query = {},
  ): Promise<readonly T[]> => {
    if ('page' in query || 'perPage' in query) {
      throw new TypeError('fetchAllPages owns page and perPage; leave them out of the query.');
    }

    const pageAt = (page: number) => requestPage<T>(path, { ...query, page, perPage: WALK_PER_PAGE });
    const first = (await pageAt(1)).page;
    const { totalPages } = first.meta;
    let rows: readonly T[] = first.rows;

    for (let page = 2; page <= totalPages; page += 1) {
      const { status, page: next } = await pageAt(page);

      if (next.meta.totalPages !== totalPages) {
        throw new ApiError({
          status,
          code: PAGINATION_DRIFT,
          message: `totalPages changed from ${String(totalPages)} to ${String(next.meta.totalPages)} at page ${String(page)}.`,
          details: { page, expected: totalPages, received: next.meta.totalPages },
        });
      }

      rows = [...rows, ...next.rows];
    }

    return rows;
  };

  return {
    get: (path, options) => request({ method: 'GET', path, query: options?.query }),
    post: (path, body, options) => request({ method: 'POST', path, body, query: options?.query }),
    put: (path, body, options) => request({ method: 'PUT', path, body, query: options?.query }),
    patch: (path, body, options) => request({ method: 'PATCH', path, body, query: options?.query }),
    delete: (path, options) => request({ method: 'DELETE', path, query: options?.query }),
    fetchAllPages,
  };
}
