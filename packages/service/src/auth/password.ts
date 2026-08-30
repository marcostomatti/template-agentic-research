/**
 * @packageDocumentation
 * Password hashing — the only module that turns a plaintext password
 * into a stored credential, and the only one that checks a candidate
 * against one.
 *
 * The algorithm is argon2id, the hybrid RFC 9106 names as the default
 * for password storage. It is memory-hard, so an attacker's advantage
 * is bounded by the RAM each guess costs rather than by how many cores
 * they can point at the problem — the property PBKDF2 and the bare SHA
 * family do not have at all, and that bcrypt has only at a fixed 4 KiB.
 * The `id` suffix is the hybrid of the other two variants: the first
 * half-pass over memory is data-INDEPENDENT (Argon2i, which is what
 * stops the memory access pattern from leaking the password through a
 * side channel) and every pass after it is data-DEPENDENT (Argon2d,
 * which is what makes a time-memory tradeoff expensive). Either half on
 * its own gives up the other half's resistance, which is why neither is
 * the recommendation and the hybrid is.
 *
 * `Bun.password` is NOT an option here, and the reason is the test seam
 * rather than taste. The service runs under bun, but the default suite
 * runs under vitest in Node.js workers, where `Bun` does not exist at
 * all; `tests/helpers/bun-polyfill.ts` installs a stand-in global
 * carrying `serve` and nothing else. A `Bun.password.hash` call is
 * `undefined is not a function` in every isolated test — which would
 * leave the one step that decides whether a credential matches as the
 * single part of the login path no test could reach, on a surface where
 * every gate is green either way. `@node-rs/argon2` is a NAPI addon and
 * loads under both runtimes, so the suite drives the same hashing code
 * the service runs rather than a second implementation of it.
 */
import type { Algorithm } from '@node-rs/argon2';

import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

/**
 * The argon2id cost parameters, written down rather than left to the
 * library's defaults so that raising them is a diff somebody reviews.
 * They are OWASP's second recommended configuration (19 MiB of memory,
 * two passes, one lane), which is also what `@node-rs/argon2` 2.1.0
 * happens to default to today — spelling them out is what keeps that
 * coincidence from being load-bearing across a dependency bump.
 *
 * They are inputs to {@link hashPassword} only. {@link verifyPassword}
 * passes none of them, because a PHC string carries its own `v=`, `m=`,
 * `t=` and `p=` and argon2 verifies against those. That is exactly what
 * lets these numbers be raised later without invalidating a single hash
 * already stored.
 */
const MEMORY_COST_KIB = 19_456;
const TIME_COST_PASSES = 2;
const PARALLELISM_LANES = 1;

/**
 * `Algorithm.Argon2id`, spelled as its numeric value.
 *
 * `@node-rs/argon2` declares `Algorithm` as an AMBIENT `const enum`, and
 * this repo compiles with `isolatedModules` (`tsconfig.base.json`),
 * under which naming any member of one is TS2748. Measured on every
 * form that reaches the member — direct access, destructuring, index
 * access, a namespace import, and a cast through `unknown` — so there
 * is no spelling of `Algorithm.Argon2id` that survives `check-types`
 * here, and the literal is the honest way to write it rather than a
 * shortcut around a rule.
 *
 * Two things keep the literal from drifting. The `Algorithm` type
 * annotation makes tsc reject a number that is not a member of the enum
 * (measured: `7` is TS2322), and `password.test.ts` pins the choice
 * from the other side by asserting that what {@link hashPassword}
 * returns begins with `$argon2id$`.
 */
const ARGON2ID: Algorithm = 2;

/**
 * Hashes a plaintext password for storage.
 *
 * @param plain - The plaintext password. Deliberately not length- or
 *   content-checked here: the policy lives on `AUTH_BASIC_PASSWORD` in
 *   `src/config.ts`, and a primitive that quietly refused some inputs
 *   would put a second, invisible policy underneath it.
 * @returns A PHC string of the form
 *   `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<digest>`, carrying its own
 *   random salt and the parameters it was produced under. Two calls
 *   with the same password return different strings.
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2Hash(plain, {
    algorithm: ARGON2ID,
    memoryCost: MEMORY_COST_KIB,
    timeCost: TIME_COST_PASSES,
    parallelism: PARALLELISM_LANES,
  });
}

/**
 * Checks a candidate password against a stored hash.
 *
 * @param hash - The stored PHC string, as produced by
 *   {@link hashPassword}.
 * @param plain - The candidate plaintext password.
 * @returns `true` only when the candidate hashes to the stored digest
 *   under the parameters the stored string itself declares.
 *
 * @remarks
 * Fail-closed by construction. argon2 THROWS on a hash string it cannot
 * decode rather than answering `false` (`Decoding failed` for anything
 * unparseable, and `Output is too short` for a well-formed prefix with
 * a truncated digest behind it), and this function answers `false` for
 * all of it. A `password_hash` that was truncated, hand-edited, left
 * empty, or written by some other scheme entirely is a credential that
 * does not match — never a rejected promise that a route turns into a
 * 500.
 *
 * That is a containment decision and not a swallowed error: a caller
 * who can tell "your password is wrong" from "that account's stored
 * hash is unreadable" holds an account oracle, and the login route
 * answers `401` for both. The operator-facing signal for a corrupt row
 * is the row itself, which nothing here can repair anyway.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2Verify(hash, plain);
  } catch {
    return false;
  }
}
