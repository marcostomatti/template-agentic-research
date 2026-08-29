/**
 * `issueSession` and `verifySession`, driven over the in-memory
 * {@link AuthStore} and the real argon2 and `node:crypto` primitives
 * rather than over stubs of them.
 *
 * Three claims about the login path: that a login name matching no
 * row is refused, that a login name that DOES match but whose
 * password does not verify is refused the same way, and that a
 * session which is issued leaves the minted token unrecoverable from
 * the row it was written as.
 *
 * Three more about the request path, which are the three ways a
 * token that once named a session stops naming one: the clock has
 * moved past its expiry, it was revoked, or the clock reads the
 * expiry exactly. All three answer null, because a caller has the
 * same nothing to do about each and telling them apart would hand an
 * unauthenticated client a reading of the session table.
 *
 * The store is the in-memory implementation from
 * `tests/helpers/memory-auth-store.ts` — a second implementation of
 * the port rather than a stub, so it refuses what Postgres refuses
 * and copies every date crossing the boundary. Reaching across into
 * `tests/` from a colocated test is what keeps the two halves of the
 * auth suite driving ONE fake: a second one built here for
 * convenience would agree with that one until the day it did not.
 *
 * THE PASSWORD HASHES ARE REAL. Every other fixture in this file is
 * a string, but `hashPassword` output is what `issueSession` hands to
 * `verifyPassword`, and a fixture shaped like a PHC string would make
 * both refusal cases pass for the wrong reason — argon2 answers
 * `false` for anything it cannot decode, so a fake hash refuses the
 * CORRECT password too and the wrong-password case would no longer
 * separate a wrong password from an unreadable row. They are hashed
 * once in a `beforeAll` because argon2id is deliberately expensive.
 *
 * Anti-vacuity, since "answers null" is what a function returning
 * null unconditionally answers. Each login refusal ends by handing
 * the SAME store the credentials that should work and demanding a
 * session back, and each also asserts that the refusal wrote no
 * session row — a refusal that had already minted one would
 * otherwise look identical from the return value alone. Each verify
 * refusal does that job with the clock instead: the SAME token is
 * verified once BEFORE the thing that should refuse it, so what the
 * case reports is a session that stopped being accepted rather than
 * one that was never accepted at all.
 *
 * THE CLOCK IS FIXED AND INJECTED, and the verify cases are what it
 * is for. Expiry is a comparison against an instant, so against the
 * wall clock a case about an aged-out session has to let one arrive
 * — a sleep, in a suite whose whole point is that it runs with
 * nothing up. `advanceSeconds` turns that wait into a value the case
 * chose, and an hour of TTL costs the run nothing. Store and deps
 * read ONE clock, so a `revoked_at` the store stamps lands at the
 * instant the case put behind it.
 *
 * The boundary case is why a chosen instant is worth more than a
 * fast one. `verifySession` refuses on `expiresAt <= now`, so the
 * interval a session is live over ends BEFORE the value in the
 * column, and the only fixture separating that from a strict `<` is
 * a clock reading the expiry to the millisecond. Nothing but an
 * injected clock can be put there at all.
 *
 * The grid, measured over the six cases rather than predicted, and
 * every leg lands where it should. On the login half: ignoring the
 * `verifyPassword` result reddens ONE, the wrong-password case;
 * persisting the raw token instead of its digest reddens ONE, the
 * containment case; and testing the credential lookup against
 * `undefined` rather than `null` — the confusion a port answering
 * `T | null` invites — reddens ONE, the unknown-user case, which is
 * what says that case is about the guard rather than about a store
 * that had no row to give. Returning null unconditionally from
 * `issueSession` reddens all three, the two refusal cases only
 * through their in-band controls, which is what says those controls
 * are load-bearing rather than decorative.
 *
 * On the request half, each guard is separable and the grid shows
 * it. Relaxing the expiry comparison to a strict `<` reddens ONE,
 * the boundary case, and no other — which is what makes that case
 * the one that pins the half-open interval. Dropping the revocation
 * guard reddens ONE, the revoked case, though the clock has moved
 * nowhere. Dropping the expiry guard reddens TWO, the aged-out case
 * and the boundary one, and leaves the revoked case green. And
 * returning null unconditionally from `verifySession` reddens all
 * THREE, entirely through the before-the-refusal controls, since
 * every `toBeNull` in the three would pass against it.
 */
import type { AuthDeps, IssuedSession } from './service.js';
import type {
  MemoryAuthStore,
  MemoryAuthStoreOptions,
  MovableClock,
} from '../../tests/helpers/memory-auth-store.js';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createMemoryAuthStore,
  createMovableClock,
} from '../../tests/helpers/memory-auth-store.js';

import { hashPassword } from './password.js';
import { issueSession, revokeSession, verifySession } from './service.js';
import { hashSessionToken } from './tokens.js';

/** The login name every case in this file plants and looks up. */
const USERNAME = 'issue-session-user';

/** The subject that credential is planted with. */
const SUBJECT = 'issue-session-sub';

/** The password that credential accepts. */
const PASSWORD = 'issue-session-password';

/** A password of the same length that it does not accept. */
const WRONG_PASSWORD = 'issue-session-passwoRd';

/** A login name no case plants, so no row can carry it. */
const UNKNOWN_USERNAME = 'issue-session-nobody';

/** Where the fixed clock reads, so `expiresAt` is an exact value. */
const FIXED_INSTANT = new Date('2026-01-02T03:04:05.000Z');

/** The TTL every case is issued under, in seconds. */
const TTL_SECONDS = 3600;

/** Milliseconds in a second, for the expiry arithmetic below. */
const MS_PER_SECOND = 1000;

/**
 * The step the boundary case walks the clock onto the expiry with.
 *
 * A half is exactly representable in binary and stays exact through
 * the multiplication by a thousand that the clock does, so two of
 * them land the clock ON the expiry rather than a rounding away from
 * it — which is the whole of what that case asserts.
 */
const HALF_SECOND = 0.5;

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

/**
 * The deps every case is run under: a clock that does not move, and
 * the fixture TTL.
 *
 * Built per call so no case can move another's clock, which costs
 * nothing and removes an ordering question entirely.
 *
 * @returns The deps object.
 */
function fixedDeps(): AuthDeps {
  return {
    now: createMovableClock(FIXED_INSTANT).now,
    ttlSeconds: TTL_SECONDS,
  };
}

/**
 * A store holding exactly one credential: {@link USERNAME}, with the
 * real hash of {@link PASSWORD} on it.
 *
 * @param options - Passed straight through, which is how a case that
 *   moves time gets a store reading its clock rather than the wall
 *   one. Defaulted, so the login cases need say nothing about time.
 * @returns The store, ready for a login attempt.
 */
async function storeWithCredential(
  options: MemoryAuthStoreOptions = {},
): Promise<MemoryAuthStore> {
  const store = createMemoryAuthStore(options);

  await store.upsertUser({
    username: USERNAME,
    sub: SUBJECT,
    passwordHash,
  });

  return store;
}

/** What {@link movableFixture} hands a case. */
interface MovableFixture {
  /** The clock the store stamps with and the deps compare against. */
  readonly clock: MovableClock;
  /** A store holding one credential and, at first, no sessions. */
  readonly store: MemoryAuthStore;
  /** Deps reading {@link MovableFixture.clock}, at the fixture TTL. */
  readonly deps: AuthDeps;
}

/**
 * A store, its deps and one clock that both of them read.
 *
 * ONE clock rather than two, so that a timestamp the store stamps
 * lands at the instant the case chose rather than at whatever the
 * run happened to reach. That is what lets the revoked case say the
 * session it was refused over had not also expired.
 *
 * @returns The three, with {@link USERNAME}'s credential planted.
 */
async function movableFixture(): Promise<MovableFixture> {
  const clock = createMovableClock(FIXED_INSTANT);
  const store = await storeWithCredential({ now: clock.now });

  return {
    clock,
    store,
    deps: { now: clock.now, ttlSeconds: TTL_SECONDS },
  };
}

/**
 * Logs the fixture credential in and insists it worked.
 *
 * @param fixture - What {@link movableFixture} returned.
 * @returns The issued session. A refusal throws here rather than
 *   narrowing in each case below, so a case that reads `.token` is
 *   never quietly reporting a login the fixture broke.
 */
async function loginOrThrow(fixture: MovableFixture): Promise<IssuedSession> {
  const issued = await issueSession(fixture.store, fixture.deps, {
    user: USERNAME,
    password: PASSWORD,
  });

  if (issued === null) {
    throw new Error('expected the fixture credential to log in');
  }

  return issued;
}

// ---------------------------------------------------------------------------
// issueSession
// ---------------------------------------------------------------------------

describe('issueSession', () => {
  it('refuses a login name no credential carries', async () => {
    const store = await storeWithCredential();

    const refused = await issueSession(store, fixedDeps(), {
      user: UNKNOWN_USERNAME,
      password: PASSWORD,
    });

    expect(refused).toBeNull();
    // A refusal that had already minted a session would look
    // identical from the return value, so the row count is what says
    // nothing was written.
    expect(store.listSessions()).toHaveLength(0);

    // In-band control: the same store, the same call, the login name
    // it does carry. Without this the case passes against a function
    // that refuses everything.
    const issued = await issueSession(store, fixedDeps(), {
      user: USERNAME,
      password: PASSWORD,
    });

    expect(issued).not.toBeNull();
  });

  it('refuses a password the stored hash does not accept', async () => {
    const store = await storeWithCredential();

    const refused = await issueSession(store, fixedDeps(), {
      user: USERNAME,
      password: WRONG_PASSWORD,
    });

    expect(refused).toBeNull();
    expect(store.listSessions()).toHaveLength(0);

    // The same in-band control, and here it carries a second load:
    // it is what proves the fixture hash is a hash argon2 can read at
    // all, so the refusal above is a wrong password rather than an
    // undecodable column.
    const issued = await issueSession(store, fixedDeps(), {
      user: USERNAME,
      password: PASSWORD,
    });

    expect(issued).not.toBeNull();
  });

  it('issues a session whose token is absent from the stored row', async () => {
    const store = await storeWithCredential();

    const issued = await issueSession(store, fixedDeps(), {
      user: USERNAME,
      password: PASSWORD,
    });

    expect(issued).not.toBeNull();
    // Narrowing rather than a non-null assertion, so a null here
    // fails as this case's own assertion instead of as a TypeError
    // somewhere below.
    if (issued === null) {
      return;
    }

    expect(issued.sub).toBe(SUBJECT);

    const sessions = store.listSessions();

    expect(sessions).toHaveLength(1);

    const [row] = sessions;

    if (row === undefined) {
      throw new Error('expected exactly one persisted session row');
    }

    // The whole claim, asserted three ways over the same row. No
    // field equals the token; the row serialised carries it nowhere,
    // which catches a token that reached a column this file does not
    // name; and what IS stored is the digest, so the row is a lookup
    // key rather than a credential.
    expect(Object.values(row)).not.toContain(issued.token);
    expect(JSON.stringify(row)).not.toContain(issued.token);
    expect(row.tokenHash).toBe(hashSessionToken(issued.token));

    // In-band control on the two `not.toContain`s above: the same
    // assertions over the value that IS there must fail the same way
    // if the needle is findable at all.
    expect(JSON.stringify(row)).toContain(row.tokenHash);

    expect(row.sub).toBe(SUBJECT);
    expect(row.revokedAt).toBeNull();
    expect(row.expiresAt.getTime()).toBe(
      FIXED_INSTANT.getTime() + TTL_SECONDS * MS_PER_SECOND,
    );
    expect(issued.expiresAt.getTime()).toBe(row.expiresAt.getTime());
  });
});

// ---------------------------------------------------------------------------
// verifySession
// ---------------------------------------------------------------------------

describe('verifySession', () => {
  it('refuses a session the clock has moved past', async () => {
    const fixture = await movableFixture();
    const issued = await loginOrThrow(fixture);

    // The in-band control, and the load-bearing half of this case:
    // the same token, the same store, before the clock moved. What
    // the case reports is a session that STOPPED being accepted.
    expect(
      await verifySession(fixture.store, fixture.deps, issued.token),
    ).not.toBeNull();

    fixture.clock.advanceSeconds(TTL_SECONDS + 1);

    expect(
      await verifySession(fixture.store, fixture.deps, issued.token),
    ).toBeNull();

    // Nothing sweeps here, so the row the refusal was taken over is
    // still there — which the two answers above cannot tell apart
    // from a row that stopped existing.
    expect(fixture.store.listSessions()).toHaveLength(1);
  });

  it('refuses a session that was revoked', async () => {
    const fixture = await movableFixture();
    const issued = await loginOrThrow(fixture);

    expect(
      await verifySession(fixture.store, fixture.deps, issued.token),
    ).not.toBeNull();

    // True rather than merely truthy: the answer means THIS call
    // revoked it, so a false here would be a session that was
    // already gone and a refusal below that proved nothing.
    expect(
      await revokeSession(fixture.store, fixture.deps, issued.token),
    ).toBe(true);

    expect(
      await verifySession(fixture.store, fixture.deps, issued.token),
    ).toBeNull();

    // The clock never moved, so the session just refused is one
    // whose expiry is still ahead of the present: what refused it is
    // the revocation and nothing else.
    expect(issued.expiresAt.getTime()).toBeGreaterThan(
      fixture.deps.now().getTime(),
    );
  });

  it('refuses a session at the instant its expiry names', async () => {
    const fixture = await movableFixture();
    const issued = await loginOrThrow(fixture);

    // Two halves rather than one step, so the control below sits
    // inside the interval by a known amount and the second step
    // lands the clock exactly on its end. See `HALF_SECOND` above.
    fixture.clock.advanceSeconds(TTL_SECONDS - HALF_SECOND);

    expect(
      await verifySession(fixture.store, fixture.deps, issued.token),
    ).not.toBeNull();

    fixture.clock.advanceSeconds(HALF_SECOND);

    // The assertion this case turns on. The clock and the column now
    // read one millisecond, which is the only fixture that separates
    // the half-open interval `verifySession` implements from a rule
    // refusing an instant later — under `expiresAt < now` the answer
    // below would be a live session.
    expect(fixture.deps.now().getTime()).toBe(issued.expiresAt.getTime());

    expect(
      await verifySession(fixture.store, fixture.deps, issued.token),
    ).toBeNull();
  });
});
