/**
 * `issueSession`, driven over the in-memory {@link AuthStore} and the
 * real argon2 and `node:crypto` primitives rather than over stubs of
 * them.
 *
 * Three claims, which are the three the login path rests on: that a
 * login name matching no row is refused, that a login name that DOES
 * match but whose password does not verify is refused the same way,
 * and that a session which is issued leaves the minted token
 * unrecoverable from the row it was written as.
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
 * null unconditionally answers: each refusal case ends by handing the
 * SAME store the credentials that should work and demanding a session
 * back, and each also asserts that the refusal wrote no session row —
 * a refusal that had already minted one would otherwise look
 * identical from the return value alone.
 *
 * The clock is fixed and injected, though nothing here depends on
 * which instant it reads: the expiry cases that do arrive with a
 * later task in this plan. What it does buy already is the assertion
 * that `expiresAt` is the issue time plus the configured TTL exactly,
 * which against the wall clock could only be asserted as a range.
 *
 * The grid, measured over the three cases rather than predicted, and
 * every leg lands where it should. Ignoring the `verifyPassword`
 * result reddens ONE, the wrong-password case. Persisting the raw
 * token instead of its digest reddens ONE, the containment case.
 * Testing the credential lookup against `undefined` rather than
 * `null` — the confusion a port answering `T | null` invites —
 * reddens ONE, the unknown-user case, which is what says that case
 * is about the guard rather than about a store that had no row to
 * give. And returning null unconditionally reddens all THREE, the
 * two refusal cases only through the in-band controls, which is what
 * says those controls are load-bearing rather than decorative.
 */
import type { AuthDeps } from './service.js';
import type { MemoryAuthStore } from '../../tests/helpers/memory-auth-store.js';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createMemoryAuthStore,
  createMovableClock,
} from '../../tests/helpers/memory-auth-store.js';

import { hashPassword } from './password.js';
import { issueSession } from './service.js';
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
 * @returns The store, ready for a login attempt.
 */
async function storeWithCredential(): Promise<MemoryAuthStore> {
  const store = createMemoryAuthStore();

  await store.upsertUser({
    username: USERNAME,
    sub: SUBJECT,
    passwordHash,
  });

  return store;
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
