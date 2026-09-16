/**
 * @packageDocumentation
 * The three auth calls the web app makes to the service: sign in, sign
 * out, and ask whether signing in is required at all.
 *
 * Every one of them is a WRITE to the session, or a reading only the
 * session makes sense of, which is why they live apart from
 * `./api.ts`'s 34 read accessors rather than beside them. The
 * separation is also what lets `src/data/auth.ts` hand a fixture build
 * `undefined` for {@link logout} and {@link probeAuth} and drop this
 * module — and with it `zod` and the client — out of that bundle.
 *
 * ## All three routes answer BARE bodies
 *
 * `POST /auth/login` answers `{ token, sub, expiresAt }`, `POST
 * /auth/logout` answers `{ ok: true }` and `GET /me` answers
 * `{ ok: true, sub }`. None of the three is the `{ success: true,
 * data }` envelope the client decodes, so the transport here lifts
 * EVERY `2xx` JSON body into that envelope before the client reads it
 * — unconditionally, because those three paths are the only ones this
 * client is ever handed. (`./api.ts` lifts by URL instead: its client
 * also carries the enveloped resource routes.) A `2xx` whose body is
 * not JSON is passed through untouched, so it still reads as
 * `BAD_ENVELOPE` rather than as a payload: a proxy's HTML `200` is not
 * the service answering.
 *
 * Everything else about a request stays the client's — the bearer
 * header, the `UNAUTHORIZED` sign-out and the `NETWORK` reading — and
 * the login body is checked against {@link sessionSchema} at the
 * boundary, since an envelope being well-formed says nothing about
 * what it carried.
 *
 * ## One session store per tab
 *
 * {@link authSessionStore} is the store this module's client reads its
 * bearer from and the store {@link login} and {@link logout} write, and
 * it is exported so that the login route and the auth gate subscribe to
 * the SAME store rather than building a second one. A second store
 * would not merely be redundant: each store caches the session in
 * memory and falls back to storage only when that cache is empty, so a
 * clear on one instance leaves a warm instance still answering — and
 * still sending — the token that was just dropped.
 *
 * The client and the store are built on the first call and never at
 * import time, for `./api.ts`'s reason: this module must load where
 * there is no `window` and no Vite define — the node unit runner and
 * Playwright's loader — and `VITE_AR_API_URL` is read only when a
 * request is actually made.
 *
 * Only `src/data/http/`, `src/data/auth.ts` and `src/routes/login/` may
 * import this module or the client and session it is built over.
 */

import type { ApiClient, FetchPort, ResponsePort } from './client';
import type { Session, SessionStore } from '../../auth/session';

import { z } from 'zod';

import { createBrowserSession } from '../../auth/session';
import { resolveDataSource } from '../source';

import { createApiClient } from './client';
import { ApiError, BAD_ENVELOPE, UNAUTHORIZED } from './envelope';

/** Where a credential is exchanged for a session. */
const LOGIN_PATH = '/auth/login';

/** Where a held token is revoked. */
const LOGOUT_PATH = '/auth/logout';

/** Where the service reports whether it checks a credential at all. */
const ME_PATH = '/me';

/** Shortest string accepted for a token or a subject: not empty. */
const MIN_TEXT_LENGTH = 1;

const SUCCESS_FLOOR = 200;
const SUCCESS_CEILING = 300;

/** What an operator presents to {@link login}. */
export interface Credential {
  /** The login name, exactly as typed. */
  readonly user: string;
  /** The password, exactly as typed. */
  readonly password: string;
}

/**
 * Whether the service requires a credential.
 *
 * `'open'` means it runs with no `AUTH_BASIC_*` configured and its
 * guard is a passthrough; `'required'` means a session is needed.
 */
export type AuthRequirement = 'open' | 'required';

/**
 * What `POST /auth/login` has to answer before a session is stored.
 *
 * `z.object` rather than `z.strictObject`: an unknown member a later
 * service adds is STRIPPED rather than refused, so the value handed to
 * the store is exactly the three members `Session` declares and a
 * widened wire shape does not lock an operator out of a deployed app.
 *
 * `expiresAt` is checked as an ISO-8601 instant rather than as a
 * string, and offsets are allowed: the service writes `toISOString`
 * output today, and the store compares the value with `Date.parse`,
 * which would read a plain sentence as `NaN` and drop every session
 * the moment it was stored.
 */
const sessionSchema = z.object({
  token: z.string().min(MIN_TEXT_LENGTH),
  sub: z.string().min(MIN_TEXT_LENGTH),
  expiresAt: z.iso.datetime({ offset: true }),
});

function isSuccess(status: number): boolean {
  return status >= SUCCESS_FLOOR && status < SUCCESS_CEILING;
}

/** Answer a `2xx` JSON body as `{ success: true, data: body }`. */
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
 * Wrap a transport so every bare `2xx` body reads as enveloped.
 *
 * @param fetch - The transport to wrap.
 * @returns A transport answering the same failures untouched.
 */
function liftingBareBodies(fetch: FetchPort): FetchPort {
  return async (url, init) => {
    const response = await fetch(url, init);

    if (!isSuccess(response.status)) {
      return response;
    }

    return liftResponse(response, await response.text());
  };
}

let store: SessionStore | undefined;
let client: ApiClient | undefined;

/**
 * The tab's one session store, built on first use.
 *
 * @returns The store {@link login} writes and {@link logout} clears —
 * the same instance on every call, so a `subscribe` taken here is
 * notified by a clear made anywhere in the app.
 */
export function authSessionStore(): SessionStore {
  store ??= createBrowserSession();

  return store;
}

/**
 * The one client these three calls share, built on first use.
 *
 * The sign-out redirect belongs to the login route, so `onUnauthorized`
 * does nothing beyond the session clear the client already performs.
 */
function apiClient(): ApiClient {
  if (client === undefined) {
    const source = resolveDataSource(import.meta.env.VITE_AR_API_URL);
    const baseUrl = source.kind === 'api'
      ? source.baseUrl
      : '';

    client = createApiClient({
      baseUrl,
      fetch: liftingBareBodies((url, init) => fetch(url, init)),
      session: authSessionStore(),
      onUnauthorized: () => undefined,
    });
  }

  return client;
}

/**
 * Exchange a credential for a session and hold it.
 *
 * The body sent is rebuilt from the two members rather than forwarded,
 * so nothing a caller attached to its credential object travels to the
 * service beside them.
 *
 * The answer is validated BEFORE the store is written, so a service
 * answering a shape this app cannot use leaves no half-session behind:
 * either a well-formed session is held and returned, or nothing
 * changed.
 *
 * @param credential - The login name and password, as typed.
 * @returns The session now held, as the wire carried it.
 * @throws ApiError with code `UNAUTHORIZED` for a refused credential,
 * `RATE_LIMITED` past the login limiter's budget, `NETWORK` when no
 * answer arrived, and `BAD_ENVELOPE` when the `2xx` body is not
 * `{ token, sub, expiresAt }`.
 */
export async function login(credential: Credential): Promise<Session> {
  const { user, password } = credential;
  const body = await apiClient().post<unknown>(LOGIN_PATH, { user, password });
  const parsed = sessionSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError({
      status: SUCCESS_FLOOR,
      code: BAD_ENVELOPE,
      message: 'The login body is not { token, sub, expiresAt } with an ISO-8601 expiresAt.',
      details: { issues: parsed.error.issues },
    });
  }

  authSessionStore().set(parsed.data);

  return parsed.data;
}

/**
 * Revoke the held session at the service and drop it here.
 *
 * The local clear happens whether or not the request succeeded, and
 * BEFORE the failure is reported: an operator who asked to sign out is
 * signed out of this tab even when the service could not be reached,
 * and the caller still learns that the token may be live elsewhere.
 * Reporting first and clearing in a `finally` would be the same two
 * effects in the order that leaves a rejected caller holding a session
 * it thinks it dropped.
 *
 * With no session held there is nothing to revoke and no token to post,
 * so no request is made — the store is still cleared, which is a no-op
 * on memory and storage but does notify clear listeners, so the same
 * sign-out consequences follow either way.
 *
 * @throws ApiError with whatever the request rejected with, raised
 * after the session has been dropped.
 */
export async function logout(): Promise<void> {
  const held = authSessionStore().get();
  let failure: unknown;

  if (held !== null) {
    try {
      await apiClient().post<unknown>(LOGOUT_PATH, { token: held.token });
    } catch (error) {
      failure = error;
    }
  }

  authSessionStore().clear();

  if (failure !== undefined) {
    throw failure;
  }
}

/**
 * Ask whether this service requires a login.
 *
 * `GET /me` is the question: a `200` says the guard let the request
 * through, and a refused credential says it did not. The body is not
 * read — who the operator is belongs to `./operator.ts` — but it still
 * has to BE a body the service could have written, so a `200` carrying
 * something that is not JSON rejects rather than reading as open.
 *
 * A `401` also clears the session on the way, by the client's own rule,
 * so a probe that finds a refused token leaves nothing stale behind.
 *
 * @returns `'open'` on a `200`, `'required'` on `UNAUTHORIZED`.
 * @throws ApiError for every other reading — a `5xx`, a `NETWORK`
 * failure, a `BAD_ENVELOPE` — because none of them says whether a
 * login is needed, and answering either way would guess.
 */
export async function probeAuth(): Promise<AuthRequirement> {
  try {
    await apiClient().get<unknown>(ME_PATH);

    return 'open';
  } catch (error) {
    if (error instanceof ApiError && error.code === UNAUTHORIZED) {
      return 'required';
    }

    throw error;
  }
}
