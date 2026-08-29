/**
 * @packageDocumentation
 * The adapter that puts this service's own session rules behind the
 * framework's `SessionVerifier` seam.
 *
 * `lib/express/auth.ts` declares that seam around "verify a token"
 * and ships one implementation of it: `createIntrospectVerifier`,
 * which asks another deployment over HTTP. This is the other one.
 * The sessions a request presents here were minted here and the rows
 * naming them are in this service's own database, so the question
 * `buildRequireAuth` asks per request is answered in-process by
 * `src/auth/service.ts` rather than over a loopback hop to this
 * service's own `POST /auth/introspect`. That endpoint stays, and it
 * is for a SIBLING deployment pointing its `AUTH_INTROSPECT_URL`
 * here; the two paths are deliberate and they do not meet.
 *
 * THIS FILE DECIDES NOTHING. Every rule about what makes a session
 * good — the expiry comparison, the revocation guard, the digest a
 * presented token is reduced to before any lookup — belongs to
 * {@link verifySession}, and what is added here is the shape the seam
 * asks for and no more. So a change to a session rule is a change one
 * file over, the cases pinning those rules keep needing no server,
 * and the cases here are about the adapter instead.
 *
 * THE CLOCK IS READ PER CALL, which is the one way this shape can go
 * wrong quietly. A verifier is built once, at boot, and then answers
 * every authenticated request for the life of the process, so a deps
 * object holding an instant rather than a thunk would freeze the
 * present at the moment the service started: sessions minted before
 * it would be refused forever and sessions expiring after it would be
 * accepted forever, with nothing in the response to say so.
 * {@link AuthDeps.now} is a thunk precisely so that cannot happen,
 * and `verifier.test.ts` pins it by moving a clock underneath a
 * verifier it built before the move.
 *
 * THE CLAIMS CROSS UNCHANGED, and the type is only half of why. What
 * this returns is what `buildRequireAuth` writes to `res.locals.auth`
 * and hands to every route that reads `getSession` — the widest
 * audience any value in this module reaches — so nothing is added on
 * the way through. `VerifiedSession` carries the subject and has no
 * spelling for a password hash or a token hash, and it is a type
 * alias rather than an interface for exactly this assignment: an
 * interface has no implicit index signature and is therefore NOT
 * assignable to `SessionClaims` (measured: TS2322), even spelling
 * every member identically.
 *
 * A STORE FAILURE IS AN ERROR AND NOT A REFUSAL. Nothing here catches
 * anything: a database that is down rejects, the rejection reaches
 * `buildRequireAuth`'s own `catch`, and the request becomes a `500`
 * through the shared error handler. Turning it into a null instead
 * would answer `401` for an outage — telling a caller its credential
 * was rejected when nothing looked at it, and hiding the outage
 * behind the one status an operator reads as somebody else's problem.
 * The introspection adapter's `null`-on-failure is not a precedent
 * for that: what it swallows is a network call to another service.
 *
 * The store arrives as a value rather than as a database handle for
 * the ordering `src/index.ts` has to satisfy. `createService` needs
 * the verifier in its config to build the auth middleware, and by
 * then the Postgres pool is a managed dependency that has not
 * started; `createDbAuthStore` takes its database as a thunk, so a
 * store — and this verifier over it — is constructible before there
 * is a connection behind either.
 */
import type { AuthDeps } from './service.js';
import type { AuthStore } from './store.js';
import type {
  SessionClaims,
  SessionVerifier,
} from '../../lib/express/auth.js';

import { verifySession } from './service.js';

/**
 * Builds the local {@link SessionVerifier}: the one that answers from
 * this service's own session table.
 *
 * @param store - Where the session row is read. Held for the life of
 *   the returned verifier, which is the life of the process.
 * @param deps - The clock every expiry comparison is made against,
 *   and the TTL {@link verifySession} does not read. Held the same
 *   way, which is why `now` being a thunk is load-bearing.
 * @returns A verifier resolving the claims a live session carries, or
 *   null. Null covers a token matching no row, a revoked session and
 *   an expired one, undifferentiated — the caller is a `401` either
 *   way, and answering them apart would hand an unauthenticated
 *   client a reading of the session table.
 */
export function createDbSessionVerifier(
  store: AuthStore,
  deps: AuthDeps,
): SessionVerifier {
  return {
    async verify(token: string): Promise<SessionClaims | null> {
      return verifySession(store, deps, token);
    },
  };
}
