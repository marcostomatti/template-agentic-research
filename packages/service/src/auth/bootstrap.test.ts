/**
 * `bootstrapAuthUser` and the dependency wrapping it, driven over the
 * in-memory {@link AuthStore} and the real argon2 primitives rather
 * than over stubs of them.
 *
 * Three claims. The first is what a boot against an empty table
 * leaves behind: one row, carrying the configured login name, the
 * namespaced subject derived from it, and a hash the configured
 * password verifies against and a different password does not. The
 * second is what the boots AFTER it leave, which is the restart
 * idempotency this module upserts in order to have: three
 * consecutive runs leave ONE row, whose `sub` and `created_at` are
 * still the ones the first run wrote. The third is what a boot
 * against a store that refuses does: the dependency's `start()`
 * rejects with the store's own error and the dependency lands in
 * `error`, which is the state `createService` reads when it aborts
 * a boot and names the dependency.
 *
 * The store is the in-memory implementation from
 * `tests/helpers/memory-auth-store.ts` — a second implementation of
 * the port rather than a stub, so it refuses what Postgres refuses
 * and copies every date crossing the boundary. Reaching across into
 * `tests/` from a colocated test is what keeps both halves of the
 * auth suite driving ONE fake.
 *
 * THE HASH IS REAL, for the same reason it is in
 * `src/auth/service.test.ts`: argon2 answers false for anything it
 * cannot decode, so a fixture shaped like a PHC string would make
 * the wrong-password control pass against a column holding
 * nonsense. Hashing is deliberately slow and happens once per case
 * here, which is what the whole file costs.
 *
 * THE EXPECTED SUBJECT IS SPELLED OUT rather than computed. The
 * derivation is a private function in the module under test, and a
 * case importing it to build its expectation would agree with any
 * derivation whatsoever — including one that dropped the namespace
 * the module exists to add.
 *
 * THE DEPS CLOCK THROWS, which is how the unread `_deps` parameter
 * is pinned rather than merely documented. The bootstrap mints no
 * session and stamps no timestamp of its own, so a read of
 * `deps.now()` is a change of behaviour and not a refactor; the
 * store keeps a clock of its own and is unaffected. `ttlSeconds` has
 * no equivalent trap available, so it is a marker value.
 *
 * THE STORE'S CLOCK IS MOVED BY HAND in the idempotency case, which
 * is what makes its two timestamp readings separable. Behind the
 * wall clock the three writes land at whatever instants three argon2
 * hashes happen to take, so `created_at` standing still and
 * `updated_at` moving would both be facts about how long the run
 * took. Moved by hand, the three expected instants are spelled out,
 * and a store that quietly ignored the second and third runs is a
 * red `updated_at` rather than a green everything.
 *
 * Anti-vacuity. The insert case's password assertions are a pair:
 * the configured password must verify and a different one must not,
 * because a hash that accepted everything would pass the first
 * alone. Its containment assertion is a pair for the same reason —
 * `not.toContain` passes against any haystack, a misspelt needle
 * included, so the same matcher runs over a value the row does
 * carry. And the refusal case ends on a healthy store, which is what
 * separates a factory reporting a store that refused from one that
 * rejects unconditionally; that control carries a second claim for
 * free, since the row it asserts is absent before `start()` and
 * present after is what says construction writes nothing.
 *
 * The idempotency case needs two controls of its own, because an
 * unchanged `created_at` is exactly what a store that dropped the
 * second and third runs would answer. One is the `updated_at`
 * reading above. The other is independent of the clock: argon2
 * salts at random, so three hashes of one password are three
 * different strings, and asserting they are is what says each run
 * hashed and wrote — which is also the only pin on the module's
 * remark that it hashes whether or not the stored hash would have
 * verified.
 *
 * The grid, re-measured over all THREE cases rather than carried
 * forward: a leg's split is a property of the file's own case list,
 * so appending a case falsifies every number in it. Storing the
 * plaintext instead of the hash reddens TWO, both `bootstrapAuthUser`
 * cases. Dropping the subject namespace reddens the same two.
 * Swallowing the store's rejection inside `onStart` reddens ONE, the
 * refusal case. Running the bootstrap at construction rather than on
 * start reddens ONE, the refusal case again — through the control
 * at its end, which is what says that control is load-bearing
 * rather than decorative. Reading `deps.now()` in the bootstrap
 * reddens all THREE, since every call in the file is made under the
 * throwing clock.
 *
 * Two further legs are on the FAKE rather than on the module, and
 * they are the only ones that reach the idempotency claim: the
 * upsert asymmetry it is about lives in the store, so no mutation of
 * `bootstrap.ts` can move it. Rewriting `created_at` on conflict
 * reddens that case at the `created_at` assertion, and dropping the
 * `updated_at` rewrite reddens it at the control instead — one leg
 * per reading, which is what says the control is not a restatement
 * of the claim. Both move a file the rest of the auth suite shares,
 * so both were run against this file alone.
 */
import type { AuthDeps } from './service.js';
import type { AuthStore, AuthUserCredential } from './store.js';
import type {
  MemoryAuthUserRow,
} from '../../tests/helpers/memory-auth-store.js';

import { describe, expect, it } from 'vitest';

import {
  createMemoryAuthStore,
  createMovableClock,
} from '../../tests/helpers/memory-auth-store.js';

import {
  bootstrapAuthUser,
  createAuthBootstrapDependency,
} from './bootstrap.js';
import { verifyPassword } from './password.js';

/** The login name every case here bootstraps. */
const USER = 'bootstrap-operator';

/**
 * The subject that login name must derive, spelled out.
 *
 * Written as a literal rather than built from the module's own
 * namespace constant, which is not exported for exactly this
 * reason: an expectation computed the way the value was computed
 * agrees with any derivation at all.
 */
const EXPECTED_SUBJECT = 'basic:bootstrap-operator';

/** The password bootstrapped, long enough to clear the env floor. */
const PASSWORD = 'bootstrap-password';

/** A password of the same length the stored hash must not accept. */
const WRONG_PASSWORD = 'bootstrap-passwoRd';

/** The message the refusing store throws, asserted by the case. */
const REFUSAL = 'memory auth store: planted upsert refusal';

/**
 * When the first of the idempotency case's three runs happens.
 *
 * The three instants are spelled out rather than computed from
 * {@link RUN_GAP_SECONDS}, for the reason {@link EXPECTED_SUBJECT}
 * is: an expectation built the way the value was built agrees with
 * whatever the value turns out to be.
 */
const FIRST_RUN_ISO = '2026-01-02T03:04:05.000Z';

/** When the second happens, one gap after the first. */
const SECOND_RUN_ISO = '2026-01-02T03:05:05.000Z';

/** When the third happens, one gap after that. */
const THIRD_RUN_ISO = '2026-01-02T03:06:05.000Z';

/**
 * How far the clock moves between two consecutive runs.
 *
 * Any non-zero gap would do. A whole minute keeps the three
 * instants above readable as the same clock at three times.
 */
const RUN_GAP_SECONDS = 60;

/**
 * What the bootstrap is configured with in every case.
 */
const CREDENTIALS = { user: USER, password: PASSWORD };

/**
 * Deps whose clock refuses to be read.
 *
 * The bootstrap declares both fields unread — it mints no session,
 * so there is no TTL, and every timestamp its write stamps belongs
 * to the store's clock rather than this one. Making the thunk throw
 * turns that from a sentence in a docblock into something the run
 * reports: a bootstrap that started reading the clock would fail
 * every case in this file. The store is untouched by it, keeping a
 * clock of its own.
 *
 * `ttlSeconds` cannot be trapped the same way, so it is a value no
 * arithmetic could produce a sensible answer from.
 */
const UNREAD_DEPS: AuthDeps = {
  now: () => {
    throw new Error('the bootstrap must not read the clock');
  },
  ttlSeconds: Number.NaN,
};

/**
 * The one row a listing holds, narrowed.
 *
 * Narrowing rather than a non-null assertion, so a run that left
 * the wrong number of rows fails here, naming the count, instead of
 * as a `TypeError` on whichever field the next line reads.
 *
 * @param users - What {@link MemoryAuthStore.listUsers} answered.
 * @returns That row.
 */
function soleUserRow(
  users: readonly MemoryAuthUserRow[],
): MemoryAuthUserRow {
  const [row] = users;

  if (users.length !== 1 || row === undefined) {
    throw new Error(
      `expected exactly one auth_users row, found ${users.length}`,
    );
  }

  return row;
}

// ---------------------------------------------------------------------------
// bootstrapAuthUser
// ---------------------------------------------------------------------------

describe('bootstrapAuthUser', () => {
  it('inserts the configured credential on a first run', async () => {
    const store = createMemoryAuthStore();

    // The precondition, asserted rather than assumed: everything
    // below reads as an insert only because there was nothing here
    // to update.
    expect(store.listUsers()).toHaveLength(0);

    const credential = await bootstrapAuthUser(
      store,
      UNREAD_DEPS,
      CREDENTIALS,
    );

    expect(credential.username).toBe(USER);
    expect(credential.sub).toBe(EXPECTED_SUBJECT);

    const users = store.listUsers();

    expect(users).toHaveLength(1);

    const [row] = users;

    // Narrowing rather than a non-null assertion, so an empty list
    // fails as this case's own assertion instead of as a TypeError
    // on the line below it.
    if (row === undefined) {
      throw new Error('expected exactly one persisted auth_users row');
    }

    // What was returned is what was stored, which is what lets the
    // idempotency claim be read off the return value.
    expect(row.id).toBe(credential.id);
    expect(row.sub).toBe(EXPECTED_SUBJECT);
    expect(row.username).toBe(USER);

    // The hash is real: argon2 verifies the configured password
    // against it, and refuses a different one. The pair is the
    // point — the first assertion alone passes against a hash that
    // accepted anything, including one built from a fixture string.
    expect(await verifyPassword(row.passwordHash, PASSWORD)).toBe(true);
    expect(await verifyPassword(row.passwordHash, WRONG_PASSWORD)).toBe(false);

    // And the plaintext is nowhere in the row, whatever column it
    // might have reached. In-band control on the needle: the login
    // name IS in there, so a `not.toContain` that can never match
    // would be caught here.
    expect(row.passwordHash).not.toBe(PASSWORD);
    expect(JSON.stringify(row)).not.toContain(PASSWORD);
    expect(JSON.stringify(row)).toContain(USER);
  });

  it('keeps one row, sub and created_at, over three runs', async () => {
    // ONE clock, moved by hand between the runs. Behind the wall
    // clock the three writes land at whatever instants three argon2
    // hashes happen to take, and both timestamp claims below become
    // readings of the run rather than of the upsert.
    const clock = createMovableClock(new Date(FIRST_RUN_ISO));
    const store = createMemoryAuthStore({ now: clock.now });

    await bootstrapAuthUser(store, UNREAD_DEPS, CREDENTIALS);

    const afterFirst = store.listUsers();

    clock.advanceSeconds(RUN_GAP_SECONDS);
    await bootstrapAuthUser(store, UNREAD_DEPS, CREDENTIALS);

    const afterSecond = store.listUsers();

    clock.advanceSeconds(RUN_GAP_SECONDS);
    await bootstrapAuthUser(store, UNREAD_DEPS, CREDENTIALS);

    const afterThird = store.listUsers();
    const runs = [afterFirst, afterSecond, afterThird];

    // The criterion's first half: a restart leaves one credential
    // rather than one per boot. A bootstrap that inserted instead of
    // upserting reads as 1, 2, 3 here.
    expect(runs.map((users) => users.length)).toStrictEqual([1, 1, 1]);

    const rows = runs.map(soleUserRow);

    // Its second half. The subject is spelled out rather than taken
    // off the first row, so a run proposing some other subject that
    // the store then discarded is not read as a bootstrap that
    // namespaced correctly all three times.
    expect(rows.map((row) => row.sub)).toStrictEqual([
      EXPECTED_SUBJECT,
      EXPECTED_SUBJECT,
      EXPECTED_SUBJECT,
    ]);
    expect(rows.map((row) => row.createdAt.toISOString())).toStrictEqual([
      FIRST_RUN_ISO,
      FIRST_RUN_ISO,
      FIRST_RUN_ISO,
    ]);

    // And it is the same row throughout, which `created_at` alone
    // does not say: three inserts with two deletes between them
    // would leave one row too.
    expect(rows.map((row) => row.id)).toStrictEqual([1, 1, 1]);

    // In-band control, and what makes every assertion above a claim
    // about an upsert rather than about a store that ignored the
    // second and third runs: `updated_at` moved with the clock each
    // time, so all three writes happened.
    expect(rows.map((row) => row.updatedAt.toISOString())).toStrictEqual([
      FIRST_RUN_ISO,
      SECOND_RUN_ISO,
      THIRD_RUN_ISO,
    ]);

    // The second control, independent of the clock. argon2 salts at
    // random, so three hashes of one password are three different
    // strings — which says each run hashed and wrote, and pins the
    // module's remark that it does so whether or not the stored hash
    // would have verified.
    expect(new Set(rows.map((row) => row.passwordHash)).size).toBe(3);
    expect(
      await Promise.all(
        rows.map((row) => verifyPassword(row.passwordHash, PASSWORD)),
      ),
    ).toStrictEqual([true, true, true]);
  });
});

// ---------------------------------------------------------------------------
// createAuthBootstrapDependency
// ---------------------------------------------------------------------------

describe('createAuthBootstrapDependency', () => {
  it('rejects the start when the store refuses the upsert', async () => {
    // The real store with one method replaced, rather than a stub of
    // the port: everything the bootstrap does not call still behaves
    // the way the contract says it does.
    const refusing: AuthStore = {
      ...createMemoryAuthStore(),
      async upsertUser(): Promise<AuthUserCredential> {
        throw new Error(REFUSAL);
      },
    };

    const dependency = createAuthBootstrapDependency(
      refusing,
      UNREAD_DEPS,
      CREDENTIALS,
    );

    // The store's own error, unwrapped. Asserting the planted
    // message rather than merely that something threw is what says
    // the rejection came from the upsert and not from the bootstrap
    // tripping over its own arguments on the way there.
    await expect(dependency.start()).rejects.toThrow(REFUSAL);

    // `createService` aborts on a rejecting `start()` and this is
    // the state the dependency is left in, which is what a reader of
    // `/_control/dependencies` would see had the boot survived.
    expect(dependency.status).toBe('error');

    // In-band control, and the load-bearing half of this case:
    // without it, a factory whose `start()` always rejected would
    // pass everything above.
    const store = createMemoryAuthStore();
    const healthy = createAuthBootstrapDependency(
      store,
      UNREAD_DEPS,
      CREDENTIALS,
    );

    // Constructing wrote nothing, which is what lets this dependency
    // be built before the Postgres pool it writes through is live.
    expect(store.listUsers()).toHaveLength(0);
    expect(healthy.status).toBe('stopped');

    await healthy.start();

    expect(healthy.status).toBe('running');
    expect(store.listUsers()).toHaveLength(1);
  });
});
