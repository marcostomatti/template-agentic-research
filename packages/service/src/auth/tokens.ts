/**
 * @packageDocumentation
 * Session tokens — minting the opaque bearer credential a client holds,
 * and reducing one to the lookup key that is stored in its place.
 *
 * ONLY THE HASH IS EVER PERSISTED. `auth_sessions.token_hash` holds
 * what {@link hashSessionToken} returns, and the raw token exists in
 * exactly two places: the body of the `POST /auth/login` response, and
 * wherever the client puts it afterwards. The service writes it down
 * nowhere and cannot recover it from a stored row, so a database
 * backup, a query log, an operator with SELECT, or an injection that
 * dumps the whole table all yield values that cannot be replayed as an
 * `Authorization: Bearer` credential.
 *
 * The hash is SHA-256 and NOT argon2id, which is the opposite of the
 * choice `password.ts` makes about a superficially similar problem.
 * A password is low-entropy and human-chosen, so its stored form has
 * to be deliberately expensive to compute — that expense is the only
 * thing standing between a leaked table and an offline dictionary run.
 * A session token is 32 bytes straight off the CSPRNG: there is no
 * dictionary to run, and a 256-bit search space is not what a slow
 * hash was invented to defend. So the memory-hard KDF buys nothing
 * here while costing something real, because the verifier hashes the
 * presented token on EVERY authenticated request rather than once per
 * login — argon2id's 19 MiB and two passes would be paid per request.
 *
 * That the digest is unsalted and deterministic is a requirement and
 * not an oversight. The session lookup is an equality probe against a
 * UNIQUE index, so one token must reduce to exactly one string, for
 * ever. `password.ts` needs precisely the reverse and takes a fresh
 * salt per call; the two modules look alike and share no reasoning.
 */
import { createHash, randomBytes } from 'node:crypto';

/**
 * The number of CSPRNG bytes behind one session token.
 *
 * 32 bytes is 256 bits, which puts guessing a live session out of
 * reach by the same margin that protects a modern symmetric key. It is
 * also the size whose base64url form is a round 43 characters with no
 * padding left over.
 */
const TOKEN_BYTES = 32;

/**
 * Mints a new opaque session token.
 *
 * @returns 32 CSPRNG bytes encoded as base64url — 43 characters drawn
 *   from `A-Z`, `a-z`, `0-9`, `-` and `_`, with no `=` padding. The
 *   alphabet is the deliberate part: the value travels in an
 *   `Authorization` header and a JSON body, and base64url's
 *   substitutions for `+` and `/` keep it from needing to be escaped
 *   should a caller ever put it in a URL or a cookie.
 *
 * @remarks
 * The token carries no structure, no claims and no encoded identity —
 * it is a random handle, and everything it means lives in the
 * `auth_sessions` row it looks up. That is what makes revocation a
 * single row write rather than a key rotation, and it is why nothing
 * downstream should ever try to parse one.
 */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Reduces a session token to the value stored in its place.
 *
 * @param token - A session token, as minted by
 *   {@link generateSessionToken} or as presented by a client.
 * @returns The SHA-256 digest as 64 lowercase hex characters. Hex
 *   rather than raw bytes because `auth_sessions.token_hash` is a
 *   `text` column under a UNIQUE index, and hex is the encoding that
 *   leaves the stored value one spelling and the lookup a plain index
 *   probe.
 *
 * @remarks
 * This is a one-way reduction and not a comparison, so it carries no
 * constant-time obligation of its own: the equality check happens in
 * Postgres, over a digest of a value the caller already supplied in
 * full. The in-process compare that DOES need `timingSafeEqual` is the
 * shared-secret one in `lib/express/control/middleware.ts`, and this
 * is not it.
 *
 * Accepts any string, including one no mint would ever produce. A
 * token a client invented hashes to something, that something matches
 * no row, and the caller gets the same "no such session" answer an
 * expired token gets — the refusal belongs to the lookup, and putting
 * a format check here would only add a second way to say no.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}
