/**
 * @packageDocumentation
 * The HTTP accessor barrel: the fixture barrel's 34 names and signatures,
 * answered by the service instead of by modules in the tab.
 *
 * Every export is typed as the fixture accessor of the same name, so a
 * selector can hand out either namespace and no hook or page can tell the
 * two apart by type. Only {@link fetchOperator} is wired. The other 33 are
 * NOT_WIRED stubs: each is an `async` function that rejects with an
 * {@link ApiError} of code {@link NOT_WIRED} naming itself. It rejects
 * rather than throws, so the cache hook reading it gets an error state a
 * page renders, and the shell stays up around it. A later spec replaces
 * the stubs one accessor at a time.
 *
 * The client and the session store are built as ONE pair, on the first
 * request, and never at import time. Building them lazily is what lets
 * this module load where there is no `window` and no Vite define — the
 * node unit runner and Playwright's loader — and it reads
 * `VITE_AR_API_URL` only when a request is actually made.
 *
 * `GET /me` answers a bare `{ ok: true, sub }` that is in neither envelope,
 * and the client decodes a `2xx` as `{ success: true, data }` only, so a
 * direct `client.get('/me')` rejects with `BAD_ENVELOPE`. The client's
 * transport is therefore wrapped: a `2xx` JSON answer from that one URL is
 * lifted into the success envelope before the client reads it. Everything
 * else about the request stays the client's — the bearer header, the
 * sign-out on `UNAUTHORIZED` and the `NETWORK` reading — and
 * {@link readMeSub} still checks the lifted body's shape.
 *
 * Only `src/data/http/`, `src/data/auth.ts` and `src/routes/login/` may
 * import `client.ts` or `src/auth/session.ts`; a page reaches this module
 * through `src/data/hooks.ts` and never holds either.
 */

import type { ApiClient, FetchPort, ResponsePort } from './client';
import type * as FixtureApi from '../fixture/api';

import { createBrowserSession } from '../../auth/session';
import { resolveDataSource } from '../source';

import { createApiClient, joinUrl } from './client';
import { ApiError } from './envelope';
import { operatorFromSub, readMeSub } from './operator';

/** The code every accessor not yet wired to the service rejects with. */
export const NOT_WIRED = 'NOT_WIRED';

/** The path the operator is read from. */
const ME_PATH = '/me';

const SUCCESS_FLOOR = 200;
const SUCCESS_CEILING = 300;

/** The fixture barrel's accessors, by name. */
type Accessors = typeof FixtureApi;

/** The name of one accessor. */
type AccessorName = keyof Accessors;

/**
 * Answer a `2xx` JSON body as `{ success: true, data: body }`.
 *
 * A body that is not JSON is handed on untouched, so the client still
 * reads it as `BAD_ENVELOPE` rather than as a payload.
 */
function liftResponse(response: ResponsePort, text: string): ResponsePort {
  let lifted = text;

  try {
    lifted = JSON.stringify({ success: true, data: JSON.parse(text) as unknown });
  } catch {
    lifted = text;
  }

  return { status: response.status, text: () => Promise.resolve(lifted) };
}

/**
 * Wrap a transport so the bare-bodied `GET /me` reads as enveloped.
 *
 * @param fetch - The transport to wrap.
 * @param meUrl - The one URL whose success body is lifted.
 */
function liftingBareMe(fetch: FetchPort, meUrl: string): FetchPort {
  return async (url, init) => {
    const response = await fetch(url, init);
    const isSuccess = response.status >= SUCCESS_FLOOR
      && response.status < SUCCESS_CEILING;

    if (url !== meUrl || !isSuccess) {
      return response;
    }

    return liftResponse(response, await response.text());
  };
}

let client: ApiClient | undefined;

/**
 * The one client, built with its session store on first use.
 *
 * The base URL is read here rather than at import, so the module loads
 * where `VITE_AR_API_URL` cannot be read; an unset value falls back to
 * same-origin. The sign-out redirect belongs to the login route, so the
 * `onUnauthorized` hook does nothing beyond the session clear the client
 * already performs.
 */
function apiClient(): ApiClient {
  if (client === undefined) {
    const source = resolveDataSource(import.meta.env.VITE_AR_API_URL);
    const baseUrl = source.kind === 'api'
      ? source.baseUrl
      : '';

    client = createApiClient({
      baseUrl,
      fetch: liftingBareMe((url, init) => fetch(url, init), joinUrl(baseUrl, ME_PATH)),
      session: createBrowserSession(),
      onUnauthorized: () => undefined,
    });
  }

  return client;
}

/**
 * Build the stub for an accessor the service does not answer yet.
 *
 * @param name - The accessor's name, carried on the error.
 * @returns An `async` function with the fixture accessor's signature
 * that ignores its arguments and rejects with code {@link NOT_WIRED}.
 */
function notWired<K extends AccessorName>(name: K): Accessors[K] {
  const stub = async (): Promise<never> => {
    throw new ApiError({
      status: 0,
      code: NOT_WIRED,
      message: `${name} is not wired to the service yet.`,
      details: { accessor: name },
    });
  };

  return stub as unknown as Accessors[K];
}

/**
 * The operator the service reports, for the topbar's avatar.
 *
 * @returns {@link LOCAL_OPERATOR} under an open service, or the operator
 * named after the session's `basic:` subject; rejects with the client's
 * {@link ApiError} — `UNAUTHORIZED` once the session is refused, and
 * `BAD_ENVELOPE` for a body that is not `{ ok: true, sub }`.
 */
export const fetchOperator: Accessors['fetchOperator'] = async () => {
  const body = await apiClient().get<unknown>(ME_PATH);

  return operatorFromSub(readMeSub(body, SUCCESS_FLOOR));
};

/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchDomains = notWired('fetchDomains');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchDomain = notWired('fetchDomain');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchVerdicts = notWired('fetchVerdicts');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchDocuments = notWired('fetchDocuments');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchFindings = notWired('fetchFindings');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchEntities = notWired('fetchEntities');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchCategorySummaries = notWired('fetchCategorySummaries');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSources = notWired('fetchSources');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSourceStatusCounts = notWired('fetchSourceStatusCounts');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSourceProposals = notWired('fetchSourceProposals');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchPersonas = notWired('fetchPersonas');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchExportSubscriptions = notWired('fetchExportSubscriptions');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchConnectors = notWired('fetchConnectors');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSettings = notWired('fetchSettings');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSpendSummary = notWired('fetchSpendSummary');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSearchSuggestions = notWired('fetchSearchSuggestions');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchNotifications = notWired('fetchNotifications');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchFinding = notWired('fetchFinding');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSource = notWired('fetchSource');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchPersona = notWired('fetchPersona');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchConnector = notWired('fetchConnector');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchCategory = notWired('fetchCategory');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchTerms = notWired('fetchTerms');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const fetchSourceFailures = notWired('fetchSourceFailures');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const saveCategoryTerms = notWired('saveCategoryTerms');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const saveFinding = notWired('saveFinding');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const saveSource = notWired('saveSource');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const approveSourceConfig = notWired('approveSourceConfig');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const resolveSourceFailure = notWired('resolveSourceFailure');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const savePersona = notWired('savePersona');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const saveConnector = notWired('saveConnector');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const saveExportSubscriptions = notWired('saveExportSubscriptions');
/** Not wired: rejects with code {@link NOT_WIRED}. */
export const saveSettings = notWired('saveSettings');
