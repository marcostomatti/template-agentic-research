/**
 * @packageDocumentation
 * The session rules: minting a session against a credential, deciding
 * whether a presented token still names one, and taking one away.
 *
 * Three functions and one shape between them. `POST /auth/login`
 * reduces to {@link issueSession}, an authenticated request reduces
 * to {@link verifySession}, and `POST /auth/logout` reduces to
 * {@link revokeSession} — so what a route adds over this module is
 * HTTP and nothing else, and the rules are exercisable without one.
 *
 * THE CLOCK IS INJECTED, and that is what a rule about an aged-out
 * session costs otherwise. Expiry is a comparison against an instant,
 * so behind the wall clock a case about a session that has expired
 * has to let one arrive — a sleep, in a suite whose whole point is
 * that it runs with nothing up. {@link AuthDeps.now} turns that wait
 * into a value the case chose. It is a thunk rather than a `Date` for
 * the obvious reason: a verifier built once at boot would otherwise
 * hold the instant it was built for the life of the process.
 *
 * NOTHING HERE DECIDES BY QUERY. `src/auth/store.ts` hands back
 * expired and revoked rows exactly as readily as live ones, and every
 * validity rule below is a comparison this module makes over a row it
 * was given. That is the arrangement that puts the rules in the half
 * of the suite that needs no database, and it is why a store is a
 * parameter rather than an import.
 *
 * REFUSALS ARE NULL, uniformly, and on the login path the same null
 * covers an unknown user and a wrong password alike. Answering those
 * two apart is what turns a login endpoint into a username oracle,
 * and the caller has nothing to do with the difference anyway: both
 * are `401`. What this module cannot equalise is how LONG the two
 * take — an unknown user returns before any argon2 call and a wrong
 * password pays one, which leaves a timing signal that a guessed
 * login name exists. That is a known and accepted property of this
 * shape rather than an oversight; closing it means verifying against
 * a decoy hash on the unknown-user path, which is a change with a
 * silent failure mode of its own and belongs to whoever decides the
 * signal is worth the decoy.
 *
 * THE RAW TOKEN EXISTS HERE AND NOWHERE BELOW. {@link issueSession}
 * mints one, hands it to its caller, and puts only its digest on the
 * row; {@link verifySession} and {@link revokeSession} reduce the
 * token they are given before the store is reached. So no
 * implementation of the port is ever in a position to persist the
 * credential itself, and `service.test.ts` asserts that against the
 * stored row rather than trusting this paragraph.
 *
 * `expires_at` is computed here, which is the half of the clock split
 * `src/auth/store.ts` declined to hold: an issue time plus a
 * configured TTL is a policy, and a store has no business having an
 * opinion about one. The store still stamps every timestamp that
 * records when the store ITSELF acted.
 */
import type { AuthStore } from './store.js';

import { verifyPassword } from './password.js';
import { generateSessionToken, hashSessionToken } from './tokens.js';

/** Milliseconds in a second, for the TTL arithmetic below. */
const MS_PER_SECOND = 1000;

/**
 * What every function in this module needs besides a store.
 *
 * One shape rather than a parameter list per function, so a caller
 * holding a store and a deps object calls all three the same way —
 * including {@link revokeSession}, which reads neither field. A
 * uniform signature is what lets the later rule that does need the
 * clock arrive without moving any call site.
 */
export interface AuthDeps {
  /**
   * Reads the present.
   *
   * A thunk, so the instant is resolved per call rather than at the
   * point the deps object was built. Every implementation of the
   * port stamps its own timestamps off its own clock; this one is
   * for the comparisons and the arithmetic that happen ABOVE the
   * port, which is the only place a test can reach them.
   */
  readonly now: () => Date;

  /**
   * How long a newly minted session lives, in seconds.
   *
   * Read at mint time and written into `auth_sessions.expires_at`,
   * never consulted again — so changing it moves only the sessions
   * minted afterwards, and live ones expire on the terms they were
   * issued under. Carried by `AUTH_SESSION_TTL_SECONDS`.
   */
  readonly ttlSeconds: number;
}

/**
 * What a client presents to `POST /auth/login`.
 *
 * `user` rather than `username` because that is the field name on
 * the wire and the one `AUTH_BASIC_USER` names; the column it is
 * looked up against is `auth_users.username`.
 */
export interface LoginCredentials {
  /** The login name to look up. */
  readonly user: string;
  /** The candidate plaintext password. */
  readonly password: string;
}

/**
 * A session that was just minted, as its holder needs it.
 *
 * The one place in the system where a raw token is a value rather
 * than an input: {@link issueSession} returns it, the login route
 * writes it into a response body, and nothing writes it down.
 */
export interface IssuedSession {
  /**
   * The opaque bearer token. Never stored, and not recoverable from
   * the row this session was written as.
   */
  readonly token: string;
  /** The subject the session authenticates, copied off the credential. */
  readonly sub: string;
  /** When the session stops being accepted. */
  readonly expiresAt: Date;
}

/**
 * What a token turned out to name, when it named a live session.
 *
 * Deliberately a type alias and not an interface. An interface has no
 * implicit index signature, so it is NOT assignable to the framework's
 * `SessionClaims` (measured: TS2322) even though the two agree on
 * every member — and the whole point of this shape is that
 * `src/auth/verifier.ts` can hand it straight to the `SessionVerifier`
 * seam that `lib/express/auth.ts` declares.
 *
 * It carries the subject and nothing else. In particular there is no
 * spelling here for a password hash or a token hash, which is a claim
 * a test can make about the returned object rather than one this
 * comment has to be believed about.
 */
export type VerifiedSession = {
  /** The stable subject identifier the session was minted against. */
  readonly sub: string;
};

/**
 * Mints a session for a caller that proved a credential.
 *
 * @param store - Where the credential is read and the session written.
 * @param deps - The clock the expiry is computed off, and the TTL.
 * @param credentials - What the client presented.
 * @returns The session, or null when the login name matches no row or
 *   the password does not verify. The two are one answer on purpose;
 *   see the oracle note above.
 *
 * @remarks
 * The subject written onto the session is the credential's STORED
 * one, which matters on any boot after the first: the bootstrap
 * upsert leaves `auth_users.sub` alone, so what a session carries is
 * whatever the row that already existed says rather than whatever the
 * last boot proposed.
 */
export async function issueSession(
  store: AuthStore,
  deps: AuthDeps,
  credentials: LoginCredentials,
): Promise<IssuedSession | null> {
  const credential = await store.findUserCredential(credentials.user);

  if (credential === null) {
    return null;
  }

  const verified = await verifyPassword(
    credential.passwordHash,
    credentials.password,
  );

  if (!verified) {
    return null;
  }

  const token = generateSessionToken();
  const issuedAt = deps.now();
  const expiresAt = new Date(
    issuedAt.getTime() + deps.ttlSeconds * MS_PER_SECOND,
  );

  const session = await store.insertSession({
    tokenHash: hashSessionToken(token),
    sub: credential.sub,
    userId: credential.id,
    expiresAt,
  });

  return {
    token,
    sub: session.sub,
    expiresAt: session.expiresAt,
  };
}

/**
 * Decides whether a presented token names a session that is still
 * good for a request.
 *
 * @param store - Where the session row is read.
 * @param deps - The clock the expiry is compared against.
 * @param token - The bearer credential as presented, unreduced.
 * @returns The claims, or null. Null covers a token matching no row,
 *   a revoked session and an expired one, which are the same answer
 *   to a caller for the same reason the login refusals are.
 *
 * @remarks
 * Revocation is checked before expiry, which changes no answer and is
 * ordered that way because it needs no clock — a revoked session is
 * refused identically whatever the host thinks the time is.
 *
 * The expiry comparison is `expiresAt <= now`, so a session is
 * refused ON its expiry rather than one instant after: the interval a
 * session is live over is half-open, starting at its mint and ending
 * before the value in the column. That deliberately disagrees with
 * the store's sweep, which deletes on a strict `expires_at < now()`
 * and therefore keeps a row for the one instant this refuses it. The
 * disagreement is in the safe direction and only that direction
 * matters: the sweep never removes a session a verify would still
 * have accepted.
 */
export async function verifySession(
  store: AuthStore,
  deps: AuthDeps,
  token: string,
): Promise<VerifiedSession | null> {
  const session = await store.findSessionByTokenHash(hashSessionToken(token));

  if (session === null) {
    return null;
  }

  if (session.revokedAt !== null) {
    return null;
  }

  if (session.expiresAt.getTime() <= deps.now().getTime()) {
    return null;
  }

  return { sub: session.sub };
}

/**
 * Takes a session away.
 *
 * @param store - Where the revocation is stamped.
 * @param _deps - Unread. Present so the three exported functions
 *   share one signature; see {@link AuthDeps}. The revocation
 *   timestamp belongs to the store, which stamps it off the clock it
 *   stamps every other write with.
 * @param token - The bearer credential as presented, unreduced.
 * @returns Whether this call is the one that revoked the session.
 *   False covers an unknown token and a session already revoked, and
 *   a caller that answers those apart hands an unauthenticated client
 *   a way to ask whether a token it holds was ever real.
 *
 * @remarks
 * Expiry is no part of this. An expired session is revocable and
 * revoking it is harmless, whereas refusing to would mean a logout
 * whose answer depends on the clock.
 */
export async function revokeSession(
  store: AuthStore,
  _deps: AuthDeps,
  token: string,
): Promise<boolean> {
  return store.revokeSessionByTokenHash(hashSessionToken(token));
}
