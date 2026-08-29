/**
 * `createDbSessionVerifier`, driven over the in-memory
 * {@link AuthStore} and the real argon2 and `node:crypto` primitives
 * rather than over stubs of them.
 *
 * Four claims, one per way a bearer token can present itself to
 * `buildRequireAuth`: a token naming a live session, one whose
 * session the clock has moved past, one whose session was revoked,
 * and one naming no session at all. The first answers claims and the
 * other three answer null, undifferentiated, because a caller is a
 * `401` either way.
 *
 * WHAT THIS FILE IS ABOUT THAT `service.test.ts` IS NOT. The rules
 * behind those four answers are pinned there, over `verifySession`
 * directly, and repeating them here would only say twice that a
 * delegation delegates. What is new at this layer is what the seam
 * adds: a verifier is built ONCE, held for the life of the process,
 * and asked per request. So the expiry case builds its verifier
 * BEFORE moving the clock and asks the same object afterwards —
 * which is the fixture that separates a thunk consulted per call
 * from an instant captured at construction, and the second is a
 * verifier that would accept an expired session forever with nothing
 * in the response to say so.
 *
 * The live case makes the containment claim about the VALUE that
 * crosses the seam, which is the widest audience anything in this
 * module reaches: whatever `verify` resolves is what
 * `buildRequireAuth` writes to `res.locals.auth` and what every
 * route reading `getSession` is handed. `SessionClaims` has an index
 * signature, so the type refuses nothing here — a session row spread
 * into the answer would type-check clean, and the type is what makes
 * the assignment legal rather than what keeps it narrow.
 *
 * The store is the in-memory implementation from
 * `tests/helpers/memory-auth-store.ts` — a second implementation of
 * the port rather than a stub, so it refuses what Postgres refuses
 * and copies every date crossing the boundary. Reaching across into
 * `tests/` from a colocated test is what keeps the two halves of the
 * auth suite driving ONE fake.
 *
 * THE PASSWORD HASH IS REAL, hashed once in a `beforeAll` because
 * argon2id is deliberately expensive. Every session here is minted
 * by logging in rather than by planting a row, so the token each
 * case presents is one `issueSession` actually returned and the
 * digest it is looked up by is one `hashSessionToken` actually
 * wrote — the composition, not a fixture standing in for it.
 *
 * THE CLOCK IS FIXED AND INJECTED, and store and deps read the same
 * one, so a `revoked_at` the store stamps lands at the instant the
 * case chose. That is what lets the revoked case assert the session
 * it was refused over had not also expired.
 *
 * Anti-vacuity, since "resolves null" is what a verifier answering
 * null unconditionally resolves. Each refusal case asks the SAME
 * verifier for the SAME token BEFORE the thing that should refuse
 * it, so what the case reports is a token that stopped being
 * accepted rather than one that was never accepted at all; the
 * unknown-token case does that job with the real token instead, and
 * adds the session count, so its refusal is about the token rather
 * than about a store with nothing in it. The live case needs no such
 * control — a verifier refusing everything is exactly what it fails
 * against, which is why it is the accept guard the three refusals
 * leave the file without. Its two absences are the vacuous half
 * instead: `not.toHaveProperty` passes against any object lacking
 * the key, a misspelt needle included, so the same matcher runs over
 * the credential row and the session row, which do carry them.
 *
 * The grid, measured over these four cases rather than carried over,
 * and each leg a defect this layer can actually have rather than the
 * smallest edit available.
 *
 * Capturing `deps.now()` at construction and comparing against that
 * instant forever reddens ONE, the expiry case, on the assertion
 * AFTER the clock moved — `expected { sub: ... } to be null`, which
 * is the whole reason that verifier is built before the move and
 * asked after it. Widening the answer with a session-row field
 * reddens ONE, the live case, on the `tokenHash` absence: it sits
 * above the `toStrictEqual` and reports first, and no other case
 * looks at what a claims object carries.
 *
 * Swallowing the refusal — answering claims where `verifySession`
 * answered null — reddens THREE, every refusal and not the live
 * case. Resolving null unconditionally reddens all FOUR: the live
 * case directly, the three refusals only through their
 * before-the-refusal controls, each failing on `expected null not to
 * be null` rather than on the refusal assertion it is named for,
 * which is what says those controls are load-bearing rather than
 * decorative.
 */
import type { AuthDeps } from './service.js';
import type { SessionVerifier } from '../../lib/express/auth.js';
import type {
  MemoryAuthStore,
  MovableClock,
} from '../../tests/helpers/memory-auth-store.js';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createMemoryAuthStore,
  createMovableClock,
} from '../../tests/helpers/memory-auth-store.js';

import { hashPassword } from './password.js';
import { issueSession, revokeSession } from './service.js';
import { createDbSessionVerifier } from './verifier.js';

/** The login name every case in this file plants and logs in as. */
const USERNAME = 'verifier-user';

/** The subject that credential is planted with. */
const SUBJECT = 'verifier-sub';

/** The password that credential accepts. */
const PASSWORD = 'verifier-password';

/**
 * A token no login ever minted.
 *
 * Shaped like one — base64url, no padding — so the refusal below is
 * about a digest matching no row rather than about anything
 * rejecting the string before a lookup. Nothing here does, and a
 * fixture that made it look like it might would be misleading.
 */
const UNKNOWN_TOKEN = 'dmVyaWZpZXItdG9rZW4tbm8tc3VjaC1zZXNzaW9u';

/** Where the injected clock starts, so `expiresAt` is exact. */
const FIXED_INSTANT = new Date('2026-01-02T03:04:05.000Z');

/** The TTL every session here is issued under, in seconds. */
const TTL_SECONDS = 3600;

/**
 * The argon2id hash of {@link PASSWORD}, computed once.
 *
 * Assigned in `beforeAll` rather than at module scope because
 * hashing is asynchronous and deliberately slow; every case reads
 * the one value.
 */
let passwordHash = '';

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

/** What {@link verifierFixture} hands a case. */
interface VerifierFixture {
  /** The clock the store stamps with and the verifier reads. */
  readonly clock: MovableClock;
  /** A store holding one credential and, at first, no sessions. */
  readonly store: MemoryAuthStore;
  /**
   * The deps the verifier was built over, for the two cases that
   * read the present or revoke through them themselves.
   */
  readonly deps: AuthDeps;
  /** The subject under test, built before any case moves anything. */
  readonly verifier: SessionVerifier;
  /** A token naming a live session, as `issueSession` returned it. */
  readonly token: string;
  /** When that session stops being accepted. */
  readonly expiresAt: Date;
}

/**
 * A store with one credential, one session logged into it, and a
 * verifier over both — built in that order, so every case holds a
 * verifier that predates whatever it does to the clock.
 *
 * @returns The fixture. A login that refuses throws here rather than
 *   narrowing in each case below, so a case reading `token` is never
 *   quietly reporting a login the fixture broke.
 */
async function verifierFixture(): Promise<VerifierFixture> {
  const clock = createMovableClock(FIXED_INSTANT);
  const store = createMemoryAuthStore({ now: clock.now });

  await store.upsertUser({
    username: USERNAME,
    sub: SUBJECT,
    passwordHash,
  });

  const deps: AuthDeps = { now: clock.now, ttlSeconds: TTL_SECONDS };
  const verifier = createDbSessionVerifier(store, deps);

  const issued = await issueSession(store, deps, {
    user: USERNAME,
    password: PASSWORD,
  });

  if (issued === null) {
    throw new Error('expected the fixture credential to log in');
  }

  return {
    clock,
    store,
    deps,
    verifier,
    token: issued.token,
    expiresAt: issued.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// createDbSessionVerifier
// ---------------------------------------------------------------------------

describe('createDbSessionVerifier', () => {
  it('resolves the subject and nothing else for a live token', async () => {
    const fixture = await verifierFixture();

    const claims = await fixture.verifier.verify(fixture.token);

    expect(claims).not.toBeNull();
    // Narrowing rather than a non-null assertion, so a null here
    // fails as this case's own assertion instead of as a TypeError
    // on the line below it.
    if (claims === null) {
      return;
    }

    expect(claims.sub).toBe(SUBJECT);

    // The containment claim, made about the value that crosses the
    // seam. `SessionClaims` carries an index signature, so a session
    // row spread into the answer type-checks clean and nothing but
    // an assertion over the value refuses one.
    expect(claims).not.toHaveProperty('passwordHash');
    expect(claims).not.toHaveProperty('tokenHash');

    // And no third field either, whatever it might be called.
    // `toStrictEqual` fails on an extra key even when it holds
    // `undefined`, so this is more than a restatement of the two
    // absences above.
    expect(claims).toStrictEqual({ sub: SUBJECT });

    // In-band control on those absences. `not.toHaveProperty` passes
    // against any object not carrying the key, a misspelt needle
    // included, so the same matcher runs over the two rows this
    // answer was derived from, which do carry them.
    const credential = await fixture.store.findUserCredential(USERNAME);

    expect(credential).toHaveProperty('passwordHash');

    const [row] = fixture.store.listSessions();

    if (row === undefined) {
      throw new Error('expected exactly one persisted session row');
    }

    expect(row).toHaveProperty('tokenHash');
  });

  it('refuses a token the clock has moved past the expiry of', async () => {
    const fixture = await verifierFixture();

    // The in-band control, and the load-bearing half of this case:
    // the same verifier, the same token, before the clock moved.
    expect(await fixture.verifier.verify(fixture.token)).not.toBeNull();

    fixture.clock.advanceSeconds(TTL_SECONDS + 1);

    // The verifier was built before that move and is asked after it,
    // which is the fixture that separates a clock read per call from
    // an instant captured at construction. Under the second this
    // answer is still the claims above.
    expect(await fixture.verifier.verify(fixture.token)).toBeNull();

    // Nothing sweeps here, so the row the refusal was taken over is
    // still there — which the two answers above cannot tell apart
    // from a row that stopped existing.
    expect(fixture.store.listSessions()).toHaveLength(1);
  });

  it('refuses a token whose session was revoked', async () => {
    const fixture = await verifierFixture();

    expect(await fixture.verifier.verify(fixture.token)).not.toBeNull();

    // True rather than merely truthy: the answer means THIS call
    // revoked it, so a false here would be a session that was
    // already gone and a refusal below that proved nothing.
    expect(
      await revokeSession(fixture.store, fixture.deps, fixture.token),
    ).toBe(true);

    expect(await fixture.verifier.verify(fixture.token)).toBeNull();

    // The clock never moved, so the session just refused is one
    // whose expiry is still ahead of the present: what refused it is
    // the revocation and nothing else.
    expect(fixture.expiresAt.getTime()).toBeGreaterThan(
      fixture.deps.now().getTime(),
    );
  });

  it('refuses a token that names no session', async () => {
    const fixture = await verifierFixture();

    expect(await fixture.verifier.verify(UNKNOWN_TOKEN)).toBeNull();

    // Two in-band controls, because a refusal here has two vacuous
    // readings. The session count says the store was not simply
    // empty, and the same verifier answering the token that IS live
    // says the refusal is about which token was presented rather
    // than about a verifier that refuses whatever it is given.
    expect(fixture.store.listSessions()).toHaveLength(1);
    expect(await fixture.verifier.verify(fixture.token)).not.toBeNull();
  });
});
