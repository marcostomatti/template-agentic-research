/**
 * `generateSessionToken` and `hashSessionToken`, driven over the real
 * `node:crypto` primitives rather than over a stub of them.
 *
 * Three claims, and they are the three a readable `auth_sessions`
 * table rests on: that no two sessions ever share a token, that one
 * token reduces to exactly one stored value so the lookup can be an
 * equality probe against a UNIQUE index, and that the stored value is
 * NOT the token — which is the whole reason a row can be read without
 * handing the reader a live credential.
 *
 * "Distinct" and "stable" are each an assertion a degenerate
 * implementation would also satisfy, so both carry an in-band control.
 * The distinctness case pins its batch length, so a loop that minted
 * nothing cannot pass over an empty set. The stability case ends by
 * hashing a DIFFERENT token and demanding a different answer, which is
 * what separates determinism from a function returning one constant.
 *
 * The algorithm and the output encoding are pinned from OUTSIDE the
 * module, by one hard-coded digest of one hard-coded string. Nothing
 * in `tokens.ts` would fail to compile or lint if `sha256` became
 * `sha512` or `'hex'` became `'base64'`, and neither would change a
 * single relative claim above — but either one silently stops every
 * `token_hash` already stored from matching the token that wrote it.
 * Measured over both mutations: TWO of the five cases go red, the
 * hard-coded digest and the stability case, whose `[0-9a-f]{64}` shape
 * check catches a 128-character digest and a base64 one alike. The
 * other three stay green under either, which is what makes the literal
 * load-bearing rather than decorative.
 *
 * The rest of that grid, same five cases. Zeroing the CSPRNG reddens
 * two — distinctness, plus the stability case's in-band control, which
 * is the only other place a constant mint is visible at all. Halving
 * `TOKEN_BYTES` reddens one, the alphabet case. Turning
 * `hashSessionToken` into a passthrough reddens three, leaving the two
 * mint-only cases green.
 */
import { describe, expect, it } from 'vitest';

import { generateSessionToken, hashSessionToken } from './tokens.js';

/** Batch size for the cases that assert over many mints at once. */
const MINT_COUNT = 64;

/** How many times the stability case re-asks for the same digest. */
const REHASH_COUNT = 8;

/** The byte count `generateSessionToken` claims to encode. */
const TOKEN_BYTES = 32;

/**
 * A token-shaped string and its SHA-256 digest as lowercase hex, both
 * written down rather than computed, so this file pins the algorithm
 * and the encoding instead of agreeing with whatever the module does.
 * Reproduce with `printf %s <FIXED_TOKEN> | shasum -a 256`.
 */
const FIXED_TOKEN = 'session-token-fixture';
const FIXED_DIGEST =
  'fff9a26e8eaab78cddf443eb80199729636dd22e7bcaa14cb28551ddc3a79fd5';

// ---------------------------------------------------------------------------
// generateSessionToken
// ---------------------------------------------------------------------------

describe('generateSessionToken', () => {
  it('mints a distinct token on every call', () => {
    const tokens = Array.from({ length: MINT_COUNT }, () => generateSessionToken());

    expect(tokens).toHaveLength(MINT_COUNT);
    expect(new Set(tokens).size).toBe(MINT_COUNT);
  });

  it('encodes 32 random bytes in the URL-safe alphabet', () => {
    const tokens = Array.from({ length: MINT_COUNT }, () => generateSessionToken());

    expect(tokens).toHaveLength(MINT_COUNT);
    for (const token of tokens) {
      // 43 unpadded characters over base64url's alphabet: no `+`, no
      // `/` and no `=`, so the value needs no escaping in a header, a
      // URL or a cookie.
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, 'base64url')).toHaveLength(TOKEN_BYTES);
    }
  });
});

// ---------------------------------------------------------------------------
// hashSessionToken
// ---------------------------------------------------------------------------

describe('hashSessionToken', () => {
  it('answers one digest for one token, however often it is asked', () => {
    const token = generateSessionToken();
    const digests = Array.from({ length: REHASH_COUNT }, () => hashSessionToken(token));

    expect(digests).toHaveLength(REHASH_COUNT);
    expect(new Set(digests).size).toBe(1);
    for (const digest of digests) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }

    // In-band control: a DIFFERENT token must not land on the same
    // digest, so the stability above reads as determinism rather than
    // as a function answering one constant for every input.
    const other = hashSessionToken(generateSessionToken());
    expect(other).not.toBe(hashSessionToken(token));
  });

  it('is SHA-256 rendered as lowercase hex', () => {
    expect(hashSessionToken(FIXED_TOKEN)).toBe(FIXED_DIGEST);
  });

  it('never answers the token it was given', () => {
    const tokens = Array.from({ length: MINT_COUNT }, () => generateSessionToken());

    expect(tokens).toHaveLength(MINT_COUNT);
    for (const token of tokens) {
      const digest = hashSessionToken(token);

      expect(digest).not.toBe(token);
      // The containment form is the one the storage claim needs: what
      // lands in `auth_sessions.token_hash` must not carry the bearer
      // secret anywhere inside it, not merely differ from it.
      expect(digest).not.toContain(token);
      expect(token).not.toContain(digest);
    }

    // Not a fixed point on hex-shaped input either. Feeding a digest
    // straight back in has to move it, or a passthrough that only
    // special-cased the base64url alphabet would pass everything above.
    expect(hashSessionToken(FIXED_DIGEST)).not.toBe(FIXED_DIGEST);
  });
});
