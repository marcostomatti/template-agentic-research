/**
 * `bootstrapAuthUser` and the dependency wrapping it, driven over the
 * in-memory {@link AuthStore} and the real argon2 primitives rather
 * than over stubs of them.
 *
 * Two claims. The first is what a boot against an empty table
 * leaves behind: one row, carrying the configured login name, the
 * namespaced subject derived from it, and a hash the configured
 * password verifies against and a different password does not. The
 * second is what a boot against a store that refuses does: the
 * dependency's `start()` rejects with the store's own error and the
 * dependency lands in `error`, which is the state `createService`
 * reads when it aborts a boot and names the dependency.
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
 * The grid, measured over these two cases rather than predicted.
 * Storing the plaintext instead of the hash reddens ONE, the insert
 * case. Dropping the subject namespace reddens ONE, the same case.
 * Swallowing the store's rejection inside `onStart` reddens ONE, the
 * refusal case. Running the bootstrap at construction rather than on
 * start reddens ONE, the refusal case again — through the control
 * at its end, which is what says that control is load-bearing
 * rather than decorative. Reading `deps.now()` in the bootstrap
 * reddens BOTH, since every call in the file is made under the
 * throwing clock.
 */
import type { AuthDeps } from './service.js';
import type { AuthStore, AuthUserCredential } from './store.js';

import { describe, expect, it } from 'vitest';

import { createMemoryAuthStore } from '../../tests/helpers/memory-auth-store.js';

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
