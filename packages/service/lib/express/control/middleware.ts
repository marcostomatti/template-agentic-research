import type { RequestHandler } from 'express';

import { createHash, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/**
 * Zod schema for the `x-control-token` request header.
 *
 * Express may parse repeated headers as `string[]`. This schema treats any
 * non-string value (including arrays and `undefined`) as absent by
 * preprocessing to `undefined` before applying the optional string check.
 */
const controlTokenSchema = z.preprocess(
  (val) => (typeof val === 'string'
    ? val
    : undefined),
  z.string().optional(),
);

/**
 * Reduces a token to its SHA-256 digest, a fixed 32 bytes for every input.
 *
 * `timingSafeEqual` requires operands of equal length and throws a
 * `RangeError` otherwise, so comparing raw tokens would turn a
 * wrong-length token into an exception rather than a rejection — and which
 * of the two paths ran would itself disclose the secret's length. Digesting
 * first removes the length difference, so a token shorter than the secret,
 * one longer than it, and one the same length but different in content all
 * reach the same constant-time compare.
 *
 * @param token - The supplied or expected token value.
 * @returns The 32-byte SHA-256 digest of `token`.
 */
function tokenDigest(token: string): Buffer {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest();
}

/**
 * Express middleware that enforces shared-secret authentication for control
 * plane routes.
 *
 * Reads the `x-control-token` request header and compares it to `secret`
 * with a timing-safe compare: both sides are reduced to fixed-length
 * SHA-256 digests and checked with `crypto.timingSafeEqual`, so the time a
 * rejection takes does not vary with how much of the supplied token was
 * correct. Non-string header values (e.g. repeated headers parsed as
 * arrays) are treated as absent. Responds with HTTP 403
 * `{ error: 'forbidden' }` when the header is absent or does not match.
 * Calls `next()` when the token is valid.
 *
 * @param secret - The expected token value. Must match `x-control-token` exactly.
 */
export function controlAuth(secret: string): RequestHandler {
  const expected = tokenDigest(secret);
  return (req, res, next) => {
    const token = controlTokenSchema.parse(req.headers['x-control-token']);
    if (token === undefined || !timingSafeEqual(tokenDigest(token), expected)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}

/**
 * Express middleware that gates control plane routes based on whether the
 * control plane is enabled.
 *
 * Responds with HTTP 404 `{ error: 'not found' }` when `enabled` is `false`.
 * Calls `next()` when `enabled` is `true`.
 *
 * @param enabled - Whether the control plane is enabled.
 */
export function controlEnabled(enabled: boolean): RequestHandler {
  return (_req, res, next) => {
    if (!enabled) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    next();
  };
}
