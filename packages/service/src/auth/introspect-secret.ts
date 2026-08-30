/**
 * @packageDocumentation
 * The service-to-service secret that guards `POST /auth/introspect` —
 * pulling it out of an `Authorization` header and deciding, in
 * constant time, whether it is the configured one.
 *
 * The credential checked here is NOT an end user's session token. RFC
 * 7662 §2.1 requires the introspection endpoint be protected, because
 * its response discloses a session's full claims to whoever asks; this
 * secret is what says the caller is a sibling SERVICE entitled to ask
 * at all. `AUTH_INTROSPECT_SECRET` is the same variable the framework's
 * `createIntrospectVerifier` SENDS when this service is the client of
 * somebody else's introspection endpoint, so this module is the other
 * end of that same arrangement: same header, same spelling, opposite
 * side of the call.
 *
 * The compare follows the precedent set by `controlAuth` in
 * `lib/express/control/middleware.ts`, for the reason given on
 * {@link secretDigest}: reduce both sides to a fixed-length digest
 * first, then hand those to `crypto.timingSafeEqual`.
 *
 * The bearer parsing is deliberately written out again rather than
 * shared with the framework's `extractBearer`. That one is
 * module-private to `lib/express/auth.ts` and takes an Express
 * `Request`, which is the wrong shape twice over: `lib/` is the
 * vendored framework half and `src/` the app half, and a helper taking
 * a whole request could not be driven by a unit test that has no
 * request to give it. What IS shared is the grammar — the same
 * case-insensitive scheme match, the same rejection of an empty
 * credential — so a header this module accepts is one the framework
 * would accept too.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Matches `Authorization: Bearer <credential>`, capturing the
 * credential.
 *
 * The scheme name is matched case-insensitively because RFC 7235 §2.1
 * defines it that way; the credential behind it is not, and reaches an
 * exact compare untouched apart from surrounding whitespace.
 */
const BEARER = /^Bearer (.+)$/i;

/**
 * Reduces a secret to its SHA-256 digest, a fixed 32 bytes for every
 * input.
 *
 * `timingSafeEqual` requires operands of equal length and throws a
 * `RangeError` otherwise, so comparing the raw strings would turn a
 * wrong-length secret into an exception rather than a rejection — and
 * which of the two paths ran would itself disclose the secret's length,
 * to say nothing of the 500 the exception would become. Digesting first
 * removes the length difference, so a presented secret shorter than the
 * configured one, one longer than it, and one the same length but
 * different in content all reach the same constant-time compare and are
 * refused the same way.
 *
 * That the digest of a longer input costs marginally more to compute is
 * not a leak: the length being measured is the length of the value the
 * CALLER supplied, which the caller already knows. What must not vary
 * with the secret is the compare, and that is the operation
 * `timingSafeEqual` owns.
 *
 * @param secret - The presented or configured secret value.
 * @returns The 32-byte SHA-256 digest of `secret`.
 */
function secretDigest(secret: string): Buffer {
  return createHash('sha256')
    .update(secret, 'utf8')
    .digest();
}

/**
 * Decides whether an `Authorization` header carries the configured
 * introspection secret.
 *
 * @param authorizationHeader - The raw `Authorization` request header,
 *   or `undefined` when the request carried none. Node collapses
 *   duplicate `authorization` headers to the first rather than joining
 *   them, so unlike the custom `x-control-token` header no array can
 *   arrive here — the runtime `typeof` guard is belt to that braces,
 *   and treats any non-string as absent.
 * @param secret - The configured `AUTH_INTROSPECT_SECRET`.
 * @returns `true` only for a well-formed `Bearer` header whose
 *   credential is exactly `secret`.
 *
 * @remarks
 * Fail-closed on every shape that is not a match: an absent header, a
 * header in some other scheme, a `Bearer` with nothing (or only
 * whitespace) behind it, and a credential that is simply wrong all
 * answer `false`. A caller cannot tell those apart from the outside,
 * because the route above this answers one flat `401` for all of them.
 *
 * The early returns are not a hole in the constant-time property. What
 * must not be measurable is how much of a WRONG secret was right, and
 * every candidate that got as far as being a credential at all reaches
 * the same digest-and-compare. Whether a request carried an
 * `Authorization` header, and whether it named the `Bearer` scheme, are
 * facts the sender already has.
 *
 * Whitespace around the credential is trimmed, which has one
 * consequence worth stating: a configured secret with leading or
 * trailing whitespace can never match. It could not have matched
 * anyway — HTTP strips optional whitespace around a field value at the
 * parser, so the trailing half never survives the wire — and a
 * credential that works in one direction and silently fails in the
 * other is a worse outcome than one that fails outright.
 */
export function matchesIntrospectSecret(
  authorizationHeader: string | undefined,
  secret: string,
): boolean {
  if (typeof authorizationHeader !== 'string') return false;

  const match = BEARER.exec(authorizationHeader);
  const presented = match?.[1]?.trim();
  if (presented === undefined || presented === '') return false;

  return timingSafeEqual(secretDigest(presented), secretDigest(secret));
}
