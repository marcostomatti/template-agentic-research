/**
 * @packageDocumentation
 * The session store: the one place the web app holds an operator's
 * bearer token.
 *
 * A session is the `{ token, sub, expiresAt }` triple `POST /auth/login`
 * answers, kept exactly as the wire carries it — `expiresAt` included,
 * which stays the ISO-8601 string the service pins rather than becoming a
 * `Date` here. The store holds it in memory and mirrors it into ONE
 * `sessionStorage` entry under {@link SESSION_STORAGE_KEY}, so a reload of
 * the tab keeps the operator signed in and nothing else does.
 *
 * Where the token is NOT kept is the point of the module:
 *
 * - Never `localStorage`. That store outlives the tab and the browser
 *   session and is shared by every tab of the origin, so a token written
 *   there stays readable long after the operator walked away, including
 *   on a shared machine. `sessionStorage` is scoped to the one tab and is
 *   discarded with it.
 * - Never a cookie. The browser attaches a cookie to every request to its
 *   origin whether or not this app made the request, which turns the token
 *   into ambient authority a cross-site form can spend (CSRF). A bearer
 *   header is attached only by the client that holds the token, so no
 *   CSRF defence is needed because no ambient credential exists.
 * - Never a URL. A query string or fragment lands in browser history, in
 *   the `Referer` of the next navigation, and in every access log between
 *   the browser and the service — the reason every one of the service's
 *   auth routes is a `POST` taking its token in the body.
 *
 * Storage is a boundary, so a stored value is validated on every read and
 * never trusted: an unparseable, incomplete or expired value is removed
 * and read as no session at all.
 *
 * The browser globals are injected ports ({@link SessionStoragePort},
 * {@link Clock}) because the unit runner is node-only. Nothing here reads
 * `window` at import time; {@link createBrowserSession} binds
 * `window.sessionStorage` on first use, not when it is called.
 */

/**
 * The single `sessionStorage` key the session is mirrored under.
 *
 * Namespaced like `ar.theme`, because the dev server and the built app
 * share an origin with anything else served from it.
 */
export const SESSION_STORAGE_KEY = 'ar.session';

/** An operator session as `POST /auth/login` answers it. */
export interface Session {
  /** The opaque bearer token, as issued. */
  readonly token: string;
  /** The subject the token was issued to. */
  readonly sub: string;
  /** When the token stops being accepted, as an ISO-8601 string. */
  readonly expiresAt: string;
}

/**
 * The three `Storage` members the store uses — `window.sessionStorage`
 * satisfies it as is, and a test hands in a map-backed stand-in.
 */
export type SessionStoragePort = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

/** Answers the current time in epoch milliseconds, like `Date.now`. */
export type Clock = () => number;

/** Called after the session is explicitly cleared. */
export type ClearListener = () => void;

/** What {@link createSessionStore} is built over. */
export interface SessionStoreDeps {
  /** Where the session is mirrored so a reload keeps it. */
  readonly storage: SessionStoragePort;
  /** The time an expiry is compared against. */
  readonly now: Clock;
}

/** The session store's surface. */
export interface SessionStore {
  /**
   * The held session, or `null` when there is none or it has expired.
   *
   * Reads memory first and falls back to storage, which is how a reloaded
   * tab recovers its session. An expired or malformed value is dropped
   * from both on the way — WITHOUT notifying clear listeners, because a
   * read must not run callbacks. The next request answering `401` is what
   * reports it.
   */
  get(): Session | null;
  /**
   * Hold a session and mirror it into storage.
   *
   * @throws TypeError when `session` is not a well-formed {@link Session}.
   */
  set(session: Session): void;
  /** Drop the session from memory and storage, then notify listeners. */
  clear(): void;
  /**
   * Be told when the session is cleared.
   *
   * @returns A function that removes the listener.
   */
  subscribe(listener: ClearListener): () => void;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Narrow an unknown value to a {@link Session}, keeping only its three
 * members so nothing else a writer put beside them travels onward.
 */
function toSession(value: unknown): Session | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const { token, sub, expiresAt } = value as Record<string, unknown>;

  if (!isNonEmptyString(token) || !isNonEmptyString(sub)) {
    return null;
  }

  if (!isNonEmptyString(expiresAt) || Number.isNaN(Date.parse(expiresAt))) {
    return null;
  }

  return { token, sub, expiresAt };
}

function isExpired(session: Session, now: number): boolean {
  return Date.parse(session.expiresAt) <= now;
}

/**
 * Decode a raw stored value into a live session.
 *
 * @param raw - What storage handed back; `null` when nothing is stored.
 * @param now - The current time in epoch milliseconds.
 * @returns The session, or `null` when `raw` is absent, not JSON, missing
 * a member, or expired at `now`.
 */
export function parseStoredSession(
  raw: string | null,
  now: number,
): Session | null {
  if (raw === null) {
    return null;
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  const session = toSession(decoded);

  return session === null || isExpired(session, now)
    ? null
    : session;
}

/**
 * Run a storage call, treating a throwing store as an absent one.
 *
 * `sessionStorage` throws rather than answering when storage is disabled
 * for the origin. The session still lives in memory for the tab; only the
 * survival of a reload is lost, which the operator cannot act on anyway.
 */
function tolerate<T>(call: () => T, fallback: T): T {
  try {
    return call();
  } catch {
    return fallback;
  }
}

/**
 * Build a session store over an injected storage port and clock.
 *
 * @param deps - The storage the session is mirrored into and the clock.
 * @returns A store holding no session until one is set or found stored.
 */
export function createSessionStore(deps: SessionStoreDeps): SessionStore {
  const { storage, now } = deps;
  let held: Session | null = null;
  let listeners: readonly ClearListener[] = [];

  const drop = (): void => {
    held = null;
    tolerate(() => storage.removeItem(SESSION_STORAGE_KEY), undefined);
  };

  return {
    get() {
      const raw = held === null
        ? tolerate(() => storage.getItem(SESSION_STORAGE_KEY), null)
        : JSON.stringify(held);
      const session = parseStoredSession(raw, now());

      if (session === null) {
        if (raw !== null) {
          drop();
        }

        return null;
      }

      held = session;

      return session;
    },

    set(session) {
      const valid = toSession(session);

      if (valid === null) {
        throw new TypeError(
          'A session needs a token, a sub and an ISO-8601 expiresAt.',
        );
      }

      held = valid;
      tolerate(
        () => storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(valid)),
        undefined,
      );
    },

    clear() {
      drop();
      listeners.forEach((listener) => listener());
    },

    subscribe(listener) {
      listeners = [...listeners, listener];

      return () => {
        listeners = listeners.filter((entry) => entry !== listener);
      };
    },
  };
}

/**
 * A storage port that resolves `window.sessionStorage` on each call
 * rather than when it is built, so building it touches no browser global.
 */
function lazySessionStorage(): SessionStoragePort {
  return {
    getItem: (key) => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    removeItem: (key) => window.sessionStorage.removeItem(key),
  };
}

/**
 * The app's session store, bound to `window.sessionStorage` and
 * `Date.now`.
 *
 * Calling it reads no browser global: `window.sessionStorage` is resolved
 * when the store first reads or writes, so a module may build the store at
 * import time and still load under the node unit runner. Where no storage
 * can be reached, the store degrades to memory alone.
 *
 * @param now - The clock; `Date.now` unless a caller needs another.
 * @returns A session store for this tab.
 */
export function createBrowserSession(now: Clock = Date.now): SessionStore {
  return createSessionStore({ storage: lazySessionStorage(), now });
}
