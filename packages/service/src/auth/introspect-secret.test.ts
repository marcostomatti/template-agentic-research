/**
 * `matchesIntrospectSecret`, driven over real `Authorization` header
 * strings rather than over an Express request.
 *
 * The header is the whole input, so the cases here are the header
 * shapes a caller can actually put on the wire: none at all, some other
 * scheme, a `Bearer` with nothing behind it, and a `Bearer` carrying a
 * credential that is shorter than the configured secret, longer than
 * it, exactly its length but wrong, or right.
 *
 * The three length cases are the ones that would not exist if this were
 * an ordinary string compare, and they are what pins the digest step
 * the module borrows from `controlAuth`. `crypto.timingSafeEqual`
 * throws a `RangeError` on operands of different lengths, so a
 * shorter-than or longer-than secret handed to it raw is an EXCEPTION
 * and not a rejection — a 500 where a 401 belongs, and a disclosure of
 * the secret's length in the difference between the two. Reducing both
 * sides to a 32-byte SHA-256 digest first is what turns all three into
 * one answer, so those cases assert `false` AND assert that reaching it
 * did not throw.
 *
 * What no test in this file can see is the constant-time property
 * itself. Replacing `timingSafeEqual` with `===` over the two digests
 * leaves every case below green, because the two functions agree on
 * every input and differ only in how long they take to disagree. That
 * is a limit worth naming rather than papering over with a timing
 * assertion, which on a JIT under a shared CI runner would measure the
 * machine rather than the code. The digest reduction is testable and is
 * tested; the compare primitive is a code-review obligation.
 *
 * Anti-vacuity, since "answers false" is what a function returning
 * `false` unconditionally would also answer: the refusal roster pins
 * its own length and asserts the id set it actually executed against
 * the id set it declares, and the same case ends by handing the CORRECT
 * header to the same call and demanding `true`. The grid, measured over
 * eight cases rather than predicted. Dropping the digest reduction
 * reddens FIVE, not the two the length cases alone would suggest —
 * `timingSafeEqual` throws on nearly every refusal fixture, since
 * almost none of them happen to be the secret's length. Each of the
 * three remaining guards is caught by exactly one case and by no other:
 * the empty-credential guard by the empty-secret case, the runtime
 * `typeof` guard by the non-string case, and the case-insensitive
 * scheme by the scheme case. A module that answered `true`
 * unconditionally reddens six — including both acceptance cases that
 * carry an in-band negative control, which is what those controls are
 * for. The two it leaves green are the one case that is purely an
 * acceptance, and the non-string case, which never reaches the compare
 * because the `typeof` guard has already returned.
 */
import { describe, expect, it } from 'vitest';

import { matchesIntrospectSecret } from './introspect-secret.js';

/** The configured `AUTH_INTROSPECT_SECRET` every case is judged against. */
const SECRET = 'introspect-secret-fixture';

/** A credential of exactly `SECRET`'s length that is not `SECRET`. */
const EQUAL_LENGTH_WRONG = 'x'.repeat(SECRET.length);

/** A credential four characters short of `SECRET`. */
const SHORTER = SECRET.slice(0, -4);

/** A credential longer than `SECRET` that starts by agreeing with it. */
const LONGER = `${SECRET}-and-then-some`;

/** The right secret carried under the WRONG scheme, as `Basic` would send it. */
const BASIC_CREDENTIAL = Buffer.from(`svc:${SECRET}`).toString('base64');

/**
 * Every header shape that must be refused, paired with the id the
 * anti-vacuity guard checks off. Each is a header a real caller could
 * send: `no-scheme` is a client that forgot the scheme word,
 * `basic-scheme` is one that carries the right secret under the wrong
 * scheme, and the two `bearer-` entries are a scheme word with no
 * usable credential behind it.
 */
const REFUSED = [
  { id: 'absent', header: undefined },
  { id: 'empty-header', header: '' },
  { id: 'no-scheme', header: SECRET },
  { id: 'basic-scheme', header: `Basic ${BASIC_CREDENTIAL}` },
  { id: 'bearer-alone', header: 'Bearer' },
  { id: 'bearer-whitespace-only', header: 'Bearer    ' },
  { id: 'shorter-secret', header: `Bearer ${SHORTER}` },
  { id: 'longer-secret', header: `Bearer ${LONGER}` },
  { id: 'equal-length-wrong-secret', header: `Bearer ${EQUAL_LENGTH_WRONG}` },
] as const;

/** The ids `REFUSED` declares, as the guard's expected set. */
const REFUSED_IDS = [
  'absent',
  'empty-header',
  'no-scheme',
  'basic-scheme',
  'bearer-alone',
  'bearer-whitespace-only',
  'shorter-secret',
  'longer-secret',
  'equal-length-wrong-secret',
];

// ---------------------------------------------------------------------------
// matchesIntrospectSecret — refusals
// ---------------------------------------------------------------------------

describe('matchesIntrospectSecret refuses', () => {
  it('refuses every header that is not the configured secret', () => {
    const seen: string[] = [];

    for (const { id, header } of REFUSED) {
      seen.push(id);
      expect(matchesIntrospectSecret(header, SECRET)).toBe(false);
    }

    // The roster is a list of ids and not merely a count, so a case
    // renamed, dropped or duplicated fails here rather than quietly
    // shrinking what the loop above proved.
    expect(seen).toHaveLength(REFUSED_IDS.length);
    expect(new Set(seen)).toEqual(new Set(REFUSED_IDS));

    // Positive control, in band: the same call over the same secret
    // must answer `true` for the right header, so none of the refusals
    // above can be read as a function that answers `false` to
    // everything.
    expect(matchesIntrospectSecret(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it('answers false rather than throwing on a wrong-length secret', () => {
    // The guard the digest reduction exists for. These three fixtures
    // must genuinely differ in length from the secret, or the case
    // asserts nothing about the length path at all.
    expect(SHORTER.length).toBeLessThan(SECRET.length);
    expect(LONGER.length).toBeGreaterThan(SECRET.length);
    expect(EQUAL_LENGTH_WRONG).toHaveLength(SECRET.length);
    expect(EQUAL_LENGTH_WRONG).not.toBe(SECRET);

    for (const credential of [SHORTER, LONGER, EQUAL_LENGTH_WRONG]) {
      const call = () => matchesIntrospectSecret(`Bearer ${credential}`, SECRET);

      expect(call).not.toThrow();
      expect(call()).toBe(false);
    }
  });

  it('treats a non-string header value as absent', () => {
    // Node collapses duplicate `authorization` headers rather than
    // joining them, so this is the runtime guard and not a shape the
    // types admit — hence the casts.
    const single = [`Bearer ${SECRET}`] as unknown as string;
    const repeated = [`Bearer ${SECRET}`, `Bearer ${SECRET}`] as unknown as string;

    // The one-element array is the discriminating fixture. It stringifies
    // back to exactly the header it wraps, so it MATCHES the moment the
    // `typeof` guard goes; the two-element form stringifies to a
    // comma-joined value that fails the compare either way and would
    // leave a missing guard invisible.
    expect(matchesIntrospectSecret(single, SECRET)).toBe(false);
    expect(matchesIntrospectSecret(repeated, SECRET)).toBe(false);
  });

  it('refuses everything when the configured secret is empty', () => {
    // An unset or blank `AUTH_INTROSPECT_SECRET` must not become a
    // secret that something matches. This is what the empty-credential
    // guard is for: a `Bearer` header carrying only whitespace trims to
    // `''`, which without the guard compares equal to an empty secret
    // and authorizes the caller.
    const headers = [undefined, 'Bearer', 'Bearer ', 'Bearer    ', `Bearer ${SECRET}`];

    expect(headers).toHaveLength(5);
    for (const header of headers) {
      expect(matchesIntrospectSecret(header, '')).toBe(false);
    }
  });

  it('refuses a secret that only differs in its surrounding whitespace', () => {
    // Whitespace is trimmed off the presented credential and NOT off
    // the configured secret, so a padded secret can never match. The
    // module documents this; the case is here so the claim is pinned
    // rather than merely asserted in prose.
    expect(matchesIntrospectSecret(`Bearer ${SECRET}`, ` ${SECRET}`)).toBe(false);
    expect(matchesIntrospectSecret(`Bearer  ${SECRET} `, SECRET)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchesIntrospectSecret — acceptance
// ---------------------------------------------------------------------------

describe('matchesIntrospectSecret accepts', () => {
  it('accepts the configured secret behind a Bearer scheme', () => {
    expect(matchesIntrospectSecret(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it('matches the scheme name case-insensitively', () => {
    // RFC 7235 §2.1 makes the scheme name case-insensitive, and a
    // sibling service is free to spell it any of these ways.
    const schemes = ['Bearer', 'bearer', 'BEARER', 'BeArEr'];

    expect(schemes).toHaveLength(4);
    for (const scheme of schemes) {
      expect(matchesIntrospectSecret(`${scheme} ${SECRET}`, SECRET)).toBe(true);
    }

    // In-band control: the case-insensitivity is the SCHEME's alone.
    // The credential is compared byte for byte, so re-casing it must
    // stop matching.
    const recased = `Bearer ${SECRET.toUpperCase()}`;

    expect(matchesIntrospectSecret(recased, SECRET)).toBe(false);
  });

  it('accepts a secret carrying characters a header can hold', () => {
    // The secret is operator-supplied and nothing constrains its
    // alphabet, so the compare must not depend on it being word-shaped.
    const awkward = 'sK9+/=~!@#$%^&*()_[]{}|;:,.<>?-a1';

    expect(matchesIntrospectSecret(`Bearer ${awkward}`, awkward)).toBe(true);
    expect(matchesIntrospectSecret(`Bearer ${awkward}`, SECRET)).toBe(false);
  });
});
