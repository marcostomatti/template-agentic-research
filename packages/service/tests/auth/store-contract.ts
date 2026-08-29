/**
 * @packageDocumentation
 * The {@link AuthStore} contract as data: one ordered entry per rule
 * the port owes, each an async function handed a store of its own.
 *
 * The port exists so that every session rule is exercisable with no
 * database, and this file is the other half of that arrangement —
 * the rules themselves, written once and driven twice. The isolated
 * suite runs them against the in-memory implementation in
 * `tests/helpers/memory-auth-store.ts`, and the live suite runs the
 * same entries against `createDbAuthStore` over a real Postgres. Two
 * implementations answering one contract is the whole claim; a rule
 * written out separately per suite would be two contracts that agree
 * until the day they do not.
 *
 * THE ENTRIES ARE FUNCTIONS RATHER THAN ROWS, which is where this
 * table parts from `tests/lib/schedule-cases.ts` and every other
 * case table here. Those describe a pure function, so an input and
 * an expected answer say the whole of it. A store rule is a
 * SEQUENCE with state between the calls — insert, then revoke, then
 * read back and find the revocation still standing — and no column
 * of inputs and answers expresses that. So each entry runs the
 * sequence and asserts as it goes.
 *
 * Asserting means importing `expect` from vitest, which no other
 * shared module under `tests/` does, and the reason it is safe here
 * is that both readers are vitest suites and no third is planned.
 * The alternative is a matcher vocabulary hand-rolled for one file,
 * which would give a reader of a failure something to learn before
 * they could read it. Failures surface as thrown assertion errors
 * either way, so a caller is free to catch and re-label them.
 *
 * EVERY ENTRY IS HANDED A STORE WHOSE TWO TABLES ARE EMPTY. That is
 * a precondition rather than a convenience, and two entries depend
 * on it in a way a reader would not guess: {@link EXPIRY_SWEEP}
 * asserts the exact number of rows the sweep removed, and the
 * lookup misses assert a null that a leftover row could fill. A
 * caller that resets between entries satisfies it; one that
 * constructs a new store per entry satisfies it too.
 *
 * Fixture values are namespaced by the id of the entry that writes
 * them, so nothing here collides with anything else here even when
 * that precondition is broken. That is deliberately not a way of
 * tolerating a broken reset: it means a leak shows up as an entry
 * failing on its own row rather than as an entry quietly reading
 * somebody else's, which is the difference between a report and a
 * silence.
 *
 * Every entry that touches a session plants a credential first, and
 * that is contractual rather than tidy: `auth_sessions.user_id`
 * carries a foreign key onto `auth_users.id`, so a session inserted
 * against an id no credential holds is a row the live half cannot
 * write at all. Planting it through {@link AuthStore.upsertUser} is
 * also what supplies the id, since the port hands ids out and no
 * caller invents one.
 *
 * What is asserted about timestamps follows the clock split the port
 * declares. `expiresAt` is caller-supplied, so an entry may hold the
 * value it handed in against the value that came back. `createdAt`
 * and `revokedAt` are stamped by the store — by the DATABASE in the
 * drizzle implementation — so they are asserted by KIND and by
 * whether they moved, never by instant. Nothing here would hold if
 * it were otherwise, and an entry pinning an instant would fail
 * against a store whose clock is correct.
 *
 * The past and future expiries are an hour out for the same reason.
 * The live sweep compares a caller-computed `expires_at` against the
 * database's own `now()`, so the margin has to swallow whatever
 * those two clocks disagree by; an hour is far past any skew between
 * a host and a container on it, and nothing here is slow enough for
 * a margin that generous to cost anything.
 *
 * The password hashes are fixture strings shaped like argon2id PHC
 * output and are not argon2id PHC output. The store treats the
 * column as opaque text — it stores what it is handed and returns
 * it — so a real hash would buy nothing here and would cost every
 * entry an argon2 call, which is deliberately slow. Whether a hash
 * verifies is `src/auth/password.ts`'s claim and is made in that
 * module's own tests.
 *
 * Two claims that look like they belong here are deliberately
 * elsewhere. That a minted token is absent from the row persisted
 * for it is `src/auth/service.ts`'s, because the store is never
 * handed a raw token and so could not have stored one — asserting it
 * here would pass for a store that had. And that an unknown user and
 * a wrong password are one refusal is the login path's, because the
 * port answers those with a null and a hash respectively and has no
 * opinion about what a caller does with either.
 */
import type { AuthStore } from '../../src/auth/store.js';

import { expect } from 'vitest';

import { hashSessionToken } from '../../src/auth/tokens.js';

/**
 * One rule the port owes, and the sequence of calls that says so.
 *
 * Ids are the join key across the two suites that read this table.
 * An entry is matched by id rather than by position, so appending
 * cannot re-point a claim in a file that never sees the entry
 * itself, and the coverage guard each suite carries is a set
 * comparison rather than a count.
 */
export interface AuthStoreContractCase {
  /**
   * Stable id, and what a reader of this table is matched by. Never
   * re-used and never re-pointed at a different entry.
   */
  readonly id: string;

  /**
   * What the entry stands for, so a failure names the rule that
   * broke rather than the call that happened to be first.
   */
  readonly standsFor: string;

  /**
   * Runs the sequence, asserting as it goes.
   *
   * @param store - An implementation whose `auth_users` and
   *   `auth_sessions` are both empty. See the precondition above.
   * @throws Error When any assertion in the sequence fails.
   */
  run(store: AuthStore): Promise<void>;
}

/** The id of {@link UNKNOWN_USER}, used to namespace its fixtures. */
const UNKNOWN_USER_ID = 'unknown-user';

/** The id of {@link DUPLICATE_USERNAME_UPSERT}. */
const DUPLICATE_USERNAME_UPSERT_ID = 'duplicate-username-upsert';

/** The id of {@link SESSION_LOOKUP_MISS}. */
const SESSION_LOOKUP_MISS_ID = 'session-lookup-miss';

/** The id of {@link EXPIRED_SESSION_READ}. */
const EXPIRED_SESSION_READ_ID = 'expired-session-read';

/** The id of {@link REVOKED_SESSION_READ}. */
const REVOKED_SESSION_READ_ID = 'revoked-session-read';

/** The id of {@link EXPIRY_SWEEP}. */
const EXPIRY_SWEEP_ID = 'expiry-sweep';

/** The id of {@link MINT_READ_REVOKE}. */
const MINT_READ_REVOKE_ID = 'mint-read-revoke';

/**
 * How far out of date, and how far into the future, an expiry is put.
 *
 * An hour rather than a second, so the live half's comparison of a
 * caller-computed timestamp against the database's `now()` cannot be
 * decided by the skew between the two clocks. See the margin
 * paragraph above.
 */
const CLOCK_MARGIN_SECONDS = 3600;

/**
 * The login name an entry writes, namespaced by the entry's id.
 *
 * @param caseId - The entry doing the writing.
 * @returns A name no other entry in this table writes.
 */
function usernameFor(caseId: string): string {
  return `${caseId}-user`;
}

/**
 * The subject an entry writes, namespaced the same way.
 *
 * `auth_users.sub` carries a unique key of its own, so it needs the
 * namespacing as much as the login name does.
 *
 * @param caseId - The entry doing the writing.
 * @returns A subject no other entry in this table writes.
 */
function subFor(caseId: string): string {
  return `${caseId}-sub`;
}

/**
 * A stored token hash, namespaced by entry and by role within it.
 *
 * Run through {@link hashSessionToken} rather than written out, so
 * what reaches the unique `token_hash` column is the 64-character
 * hex the real mint path produces rather than a short literal no
 * column would ever hold. It stays deterministic, so a failure is
 * reproducible.
 *
 * @param caseId - The entry doing the writing.
 * @param role - What the session stands for within that entry.
 * @returns A hash no other session in this table carries.
 */
function tokenHashFor(caseId: string, role: string): string {
  return hashSessionToken(`${caseId}:${role}`);
}

/**
 * A password hash fixture: PHC-shaped, and unmistakably not one.
 *
 * The `generation` is what lets an entry tell a rewritten hash from
 * the hash it replaced, which is the whole of what the upsert's
 * conflict branch has to be held to.
 *
 * @param caseId - The entry doing the writing.
 * @param generation - Which write of that entry produced it.
 * @returns An opaque string of the shape the column carries.
 */
function fixtureHash(caseId: string, generation: number): string {
  return `$argon2id$v=19$m=19456,t=2,p=1$fixture-${caseId}$not-a-hash-${generation}`;
}

/**
 * An expiry that many seconds from now, negative for the past.
 *
 * @param seconds - Offset from the caller's clock.
 * @returns The instant to hand to `insertSession`.
 */
function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

/**
 * A login name that was never written answers null, while one that
 * was answers the credential.
 *
 * Both halves, because the null on its own is satisfied by a store
 * holding nothing at all — which is what a store handed to this
 * entry is, right up until the plant. The plant is what makes the
 * null a lookup that missed rather than a table that is empty.
 */
const UNKNOWN_USER: AuthStoreContractCase = {
  id: UNKNOWN_USER_ID,
  standsFor: 'a login name no row carries, told apart from one that does',

  async run(store: AuthStore): Promise<void> {
    const planted = await store.upsertUser({
      username: usernameFor(UNKNOWN_USER_ID),
      sub: subFor(UNKNOWN_USER_ID),
      passwordHash: fixtureHash(UNKNOWN_USER_ID, 1),
    });

    expect(planted.username).toBe(usernameFor(UNKNOWN_USER_ID));
    expect(planted.sub).toBe(subFor(UNKNOWN_USER_ID));
    expect(planted.passwordHash).toBe(fixtureHash(UNKNOWN_USER_ID, 1));

    const found = await store.findUserCredential(usernameFor(UNKNOWN_USER_ID));

    expect(found).toEqual(planted);

    const missed = await store.findUserCredential(`${UNKNOWN_USER_ID}-nobody`);

    expect(missed).toBeNull();
  },
};

/**
 * Upserting an existing login name rewrites the hash and leaves the
 * subject and the row alone.
 *
 * The asymmetry the port declares, and the reason the bootstrap can
 * run on every boot: a second upsert supplies a subject and gets the
 * STORED one back, so the sessions already carrying a copy of it do
 * not find it moved underneath them. Both directions are asserted —
 * that the returned subject is the first one, and that it is not the
 * second — because the first alone holds for an upsert that ignores
 * the whole input, and the second alone holds for one that writes
 * anything at all.
 *
 * That the conflict UPDATED rather than INSERTED is read off the id,
 * which is the only reading the port affords: it exposes no count,
 * so a second row would have to announce itself by carrying an id of
 * its own. The read-back afterwards is what closes that — a store
 * with two rows under one login name answers the lookup with one of
 * them, and it would have to be this one.
 */
const DUPLICATE_USERNAME_UPSERT: AuthStoreContractCase = {
  id: DUPLICATE_USERNAME_UPSERT_ID,
  standsFor: 'a second upsert on one login name, rewriting only the hash',

  async run(store: AuthStore): Promise<void> {
    const username = usernameFor(DUPLICATE_USERNAME_UPSERT_ID);
    const storedSub = subFor(DUPLICATE_USERNAME_UPSERT_ID);
    const rejectedSub = `${storedSub}-second`;

    const first = await store.upsertUser({
      username,
      sub: storedSub,
      passwordHash: fixtureHash(DUPLICATE_USERNAME_UPSERT_ID, 1),
    });

    const second = await store.upsertUser({
      username,
      sub: rejectedSub,
      passwordHash: fixtureHash(DUPLICATE_USERNAME_UPSERT_ID, 2),
    });

    expect(second.id).toBe(first.id);
    expect(second.username).toBe(username);
    expect(second.sub).toBe(storedSub);
    expect(second.sub).not.toBe(rejectedSub);
    expect(second.passwordHash)
      .toBe(fixtureHash(DUPLICATE_USERNAME_UPSERT_ID, 2));
    expect(second.passwordHash).not.toBe(first.passwordHash);

    const found = await store.findUserCredential(username);

    expect(found).toEqual(second);
  },
};

/**
 * A token hash that was never stored answers null, while one that
 * was answers the session.
 *
 * The same pairing as {@link UNKNOWN_USER} and for the same reason:
 * the miss is a claim about a lookup only once something is there to
 * be missed.
 */
const SESSION_LOOKUP_MISS: AuthStoreContractCase = {
  id: SESSION_LOOKUP_MISS_ID,
  standsFor: 'a token hash no session carries, told apart from one that does',

  async run(store: AuthStore): Promise<void> {
    const user = await store.upsertUser({
      username: usernameFor(SESSION_LOOKUP_MISS_ID),
      sub: subFor(SESSION_LOOKUP_MISS_ID),
      passwordHash: fixtureHash(SESSION_LOOKUP_MISS_ID, 1),
    });

    const tokenHash = tokenHashFor(SESSION_LOOKUP_MISS_ID, 'planted');
    const planted = await store.insertSession({
      tokenHash,
      sub: user.sub,
      userId: user.id,
      expiresAt: secondsFromNow(CLOCK_MARGIN_SECONDS),
    });

    const found = await store.findSessionByTokenHash(tokenHash);

    expect(found).toEqual(planted);

    const neverMinted = tokenHashFor(SESSION_LOOKUP_MISS_ID, 'never-minted');
    const missed = await store.findSessionByTokenHash(neverMinted);

    expect(missed).toBeNull();
  },
};

/**
 * A session whose expiry has passed is handed back, not filtered.
 *
 * The store decides nothing: expiry is a comparison against a clock,
 * the clock belongs to the caller, and a store that answered null
 * here would have taken that decision on the caller's behalf in the
 * one part of the module that cannot be exercised without a
 * database. So what is asserted is a row, carrying the expiry that
 * was handed in and carrying it in the past.
 */
const EXPIRED_SESSION_READ: AuthStoreContractCase = {
  id: EXPIRED_SESSION_READ_ID,
  standsFor: 'an expired session, returned rather than filtered out',

  async run(store: AuthStore): Promise<void> {
    const user = await store.upsertUser({
      username: usernameFor(EXPIRED_SESSION_READ_ID),
      sub: subFor(EXPIRED_SESSION_READ_ID),
      passwordHash: fixtureHash(EXPIRED_SESSION_READ_ID, 1),
    });

    const tokenHash = tokenHashFor(EXPIRED_SESSION_READ_ID, 'expired');
    const expiresAt = secondsFromNow(-CLOCK_MARGIN_SECONDS);
    const inserted = await store.insertSession({
      tokenHash,
      sub: user.sub,
      userId: user.id,
      expiresAt,
    });

    expect(inserted.expiresAt.getTime()).toBe(expiresAt.getTime());
    expect(inserted.expiresAt.getTime()).toBeLessThan(Date.now());
    expect(inserted.revokedAt).toBeNull();

    const found = await store.findSessionByTokenHash(tokenHash);

    expect(found).toEqual(inserted);
  },
};

/**
 * A revoked session is handed back too, carrying its revocation.
 *
 * The twin of {@link EXPIRED_SESSION_READ}, over the other reason a
 * session stops being usable. The row that comes back is the one
 * that went in with `revokedAt` filled, which is a stronger reading
 * than a non-null timestamp on its own: it says the revoke moved
 * that column and nothing else, so an implementation that rewrote
 * the expiry or the subject while it was there is reported.
 */
const REVOKED_SESSION_READ: AuthStoreContractCase = {
  id: REVOKED_SESSION_READ_ID,
  standsFor: 'a revoked session, returned rather than filtered out',

  async run(store: AuthStore): Promise<void> {
    const user = await store.upsertUser({
      username: usernameFor(REVOKED_SESSION_READ_ID),
      sub: subFor(REVOKED_SESSION_READ_ID),
      passwordHash: fixtureHash(REVOKED_SESSION_READ_ID, 1),
    });

    const tokenHash = tokenHashFor(REVOKED_SESSION_READ_ID, 'revoked');
    const inserted = await store.insertSession({
      tokenHash,
      sub: user.sub,
      userId: user.id,
      expiresAt: secondsFromNow(CLOCK_MARGIN_SECONDS),
    });

    expect(inserted.revokedAt).toBeNull();
    expect(await store.revokeSessionByTokenHash(tokenHash)).toBe(true);

    const found = await store.findSessionByTokenHash(tokenHash);

    expect(found).toEqual({ ...inserted, revokedAt: expect.any(Date) });
  },
};

/**
 * The sweep removes the sessions whose expiry has passed, and only
 * those.
 *
 * Three rows, because the count on its own says very little: an
 * expired one to be removed, a live one to be left, and a REVOKED
 * one that has not yet expired, which the port promises to leave in
 * place because it is already refused on read and removing it would
 * discard the audit trail `revoked_at` exists to keep. A sweep
 * keyed on validity rather than on expiry takes that third row and
 * is reported here and nowhere else.
 *
 * The second sweep is what makes the count a count. A store
 * returning a constant, or returning how many rows it looked at,
 * answers the first call correctly and this one wrongly.
 */
const EXPIRY_SWEEP: AuthStoreContractCase = {
  id: EXPIRY_SWEEP_ID,
  standsFor: 'the sweep taking the expired sessions and leaving the rest',

  async run(store: AuthStore): Promise<void> {
    const user = await store.upsertUser({
      username: usernameFor(EXPIRY_SWEEP_ID),
      sub: subFor(EXPIRY_SWEEP_ID),
      passwordHash: fixtureHash(EXPIRY_SWEEP_ID, 1),
    });

    const expiredHash = tokenHashFor(EXPIRY_SWEEP_ID, 'expired');
    const liveHash = tokenHashFor(EXPIRY_SWEEP_ID, 'live');
    const revokedHash = tokenHashFor(EXPIRY_SWEEP_ID, 'revoked-but-unexpired');

    await store.insertSession({
      tokenHash: expiredHash,
      sub: user.sub,
      userId: user.id,
      expiresAt: secondsFromNow(-CLOCK_MARGIN_SECONDS),
    });

    const live = await store.insertSession({
      tokenHash: liveHash,
      sub: user.sub,
      userId: user.id,
      expiresAt: secondsFromNow(CLOCK_MARGIN_SECONDS),
    });

    await store.insertSession({
      tokenHash: revokedHash,
      sub: user.sub,
      userId: user.id,
      expiresAt: secondsFromNow(CLOCK_MARGIN_SECONDS),
    });
    expect(await store.revokeSessionByTokenHash(revokedHash)).toBe(true);

    expect(await store.deleteExpiredSessions()).toBe(1);

    expect(await store.findSessionByTokenHash(expiredHash)).toBeNull();
    expect(await store.findSessionByTokenHash(liveHash)).toEqual(live);
    expect(await store.findSessionByTokenHash(revokedHash)).not.toBeNull();

    expect(await store.deleteExpiredSessions()).toBe(0);
  },
};

/**
 * Mint a session, read it back, revoke it, and find the revocation
 * standing.
 *
 * The entry that composes the rest, and the only one that reaches
 * every method except the sweep. Three claims here are made nowhere
 * else in this table. That a second revoke answers false, which is
 * what makes the answer mean "this call revoked it" rather than "a
 * row exists". That the first revocation's timestamp survives that
 * second call, which is the audit trail the port trades the simpler
 * always-stamp behaviour for. And that revoking a hash no session
 * carries is the same false, so a caller cannot tell an unknown
 * token from an already-revoked one — the two are one refusal on the
 * logout path for the same reason an unknown user and a wrong
 * password are one refusal on the login path.
 */
const MINT_READ_REVOKE: AuthStoreContractCase = {
  id: MINT_READ_REVOKE_ID,
  standsFor: 'the whole round trip, from a minted session to a revoked one',

  async run(store: AuthStore): Promise<void> {
    const user = await store.upsertUser({
      username: usernameFor(MINT_READ_REVOKE_ID),
      sub: subFor(MINT_READ_REVOKE_ID),
      passwordHash: fixtureHash(MINT_READ_REVOKE_ID, 1),
    });

    const tokenHash = tokenHashFor(MINT_READ_REVOKE_ID, 'minted');
    const expiresAt = secondsFromNow(CLOCK_MARGIN_SECONDS);
    const minted = await store.insertSession({
      tokenHash,
      sub: user.sub,
      userId: user.id,
      expiresAt,
    });

    expect(minted.tokenHash).toBe(tokenHash);
    expect(minted.sub).toBe(user.sub);
    expect(minted.userId).toBe(user.id);
    expect(minted.expiresAt.getTime()).toBe(expiresAt.getTime());
    expect(minted.createdAt).toBeInstanceOf(Date);
    expect(minted.revokedAt).toBeNull();

    expect(await store.findSessionByTokenHash(tokenHash)).toEqual(minted);

    expect(await store.revokeSessionByTokenHash(tokenHash)).toBe(true);

    const revoked = await store.findSessionByTokenHash(tokenHash);

    expect(revoked).toEqual({ ...minted, revokedAt: expect.any(Date) });

    expect(await store.revokeSessionByTokenHash(tokenHash)).toBe(false);
    expect(await store.findSessionByTokenHash(tokenHash)).toEqual(revoked);

    const neverMinted = tokenHashFor(MINT_READ_REVOKE_ID, 'never-minted');

    expect(await store.revokeSessionByTokenHash(neverMinted)).toBe(false);
  },
};

/**
 * The contract, in the order it is meant to be read.
 *
 * Credentials before sessions, misses before writes, and the round
 * trip last because it composes what the entries above it establish
 * one at a time. Nothing in the order is load-bearing — each entry
 * is handed a store of its own and plants everything it reads — so a
 * reader driving them in any order gets the same answers.
 */
export const AUTH_STORE_CONTRACT: readonly AuthStoreContractCase[] = [
  UNKNOWN_USER,
  DUPLICATE_USERNAME_UPSERT,
  SESSION_LOOKUP_MISS,
  EXPIRED_SESSION_READ,
  REVOKED_SESSION_READ,
  EXPIRY_SWEEP,
  MINT_READ_REVOKE,
];
