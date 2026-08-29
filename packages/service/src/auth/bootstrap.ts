/**
 * @packageDocumentation
 * The bootstrap: making the configured operator credential exist,
 * once per boot, before the service answers a request.
 *
 * `AUTH_BASIC_USER` and `AUTH_BASIC_PASSWORD` are the source of
 * truth for that credential, and this module is what makes the
 * table agree with them. One upsert per boot, conflicting on the
 * login name: the first boot inserts, every boot after rewrites the
 * hash, and an operator rotating a password does it by editing the
 * environment and restarting rather than by reaching for SQL.
 *
 * IT IS A MANAGED DEPENDENCY because both properties it needs are
 * ones the dependency array already has. It must run AFTER the
 * Postgres pool is proven live, which is what ordering it behind
 * the database dependency in that array means. And it must abort a
 * boot it cannot complete, which is what a rejecting `onStart`
 * does: `createService` stops at the first dependency that fails
 * and logs its name. A call inside `register()` would have neither
 * property, and its failure mode is a service answering logins
 * against a credential nothing ever wrote.
 *
 * MIGRATIONS ARE NOT RUN HERE, which is a deliberate departure from
 * the spec's "right after migrations run". Nothing in this package
 * migrates at boot: `bun run db:migrate` is an operator step, and
 * drizzle's migrator does an unlocked check-then-write that
 * concurrent callers race into catalog errors. So a boot against an
 * unmigrated database fails at this dependency rather than
 * migrating one for itself, which is the loud version of the same
 * outcome and the one whose log line names the cause.
 *
 * THE SUBJECT IS DERIVED FROM THE LOGIN NAME, not generated. A
 * random subject would be reproducible from nothing: drop the row,
 * point the service at a fresh database, and the same operator
 * comes back as somebody else, while anything that recorded the old
 * subject now names a subject that does not exist. Deriving it
 * makes configuration alone enough to reconstruct the identity. The
 * cost is that the subject discloses the login name, which is a
 * disclosure to callers already holding a valid session, and the
 * login name is not a secret in the first place.
 *
 * The namespace prefix is for the identity source that does not
 * exist yet. The spec keeps a provider-based flow as a later module
 * sitting beside this one, and two sources minting bare login names
 * as subjects would eventually mint the same subject for two
 * different people. A prefix costs nothing now and is not something
 * that can be added later, because the subjects already issued
 * would not have it.
 *
 * WHAT THIS PROPOSES IS NOT WHAT IT IMPOSES. The upsert leaves
 * `sub` and `created_at` alone on conflict, so on every boot but
 * the first the subject computed here is discarded and the stored
 * one stands. That is the point rather than a limitation: sessions
 * carry a copy of the subject taken at mint time, and a bootstrap
 * that rewrote it would leave live tokens answering a value the
 * credential row no longer names. Callers wanting the subject read
 * it off the returned credential.
 *
 * NOTHING HERE LOGS. There is no logger parameter and no message
 * built from a credential, so this module has no line the password
 * could reach. It is hashed on the way to the port and is a
 * parameter and nothing else; `hashPassword` is what makes the
 * value that gets stored, and the plaintext never becomes part of
 * an error message either.
 */
import type { AuthDeps } from './service.js';
import type { AuthStore, AuthUserCredential } from './store.js';
import type { Dependency } from '../../lib/service-core/index.js';

import { createDependency } from '../../lib/service-core/index.js';

import { hashPassword } from './password.js';

/**
 * The name this dependency reports to `createService`.
 *
 * It reaches two places a reader looks at when a boot fails: the
 * `dependency failed to start` log line, and the entry under
 * `/_control/dependencies` for a service that started.
 */
const DEPENDENCY_NAME = 'auth-bootstrap';

/**
 * The namespace every subject proposed here carries.
 *
 * Names the strategy that minted it rather than the deployment, so
 * a second identity source arriving later is distinguishable by the
 * subject alone. See the packageDocumentation above for why a
 * prefix cannot be retrofitted.
 */
const SUBJECT_NAMESPACE = 'basic:';

/**
 * What the bootstrap is configured with.
 *
 * Structurally identical to `LoginCredentials` in
 * `src/auth/service.ts` and deliberately a separate type: that one
 * is what a client presents over HTTP and this one is what an
 * operator wrote into an environment file, so they answer to
 * different things and neither docblock has to hedge about the
 * other. `user` rather than `username` in both, because that is the
 * word `AUTH_BASIC_USER` uses.
 */
export interface BootstrapCredentials {
  /** The login name to make exist, from `AUTH_BASIC_USER`. */
  readonly user: string;
  /**
   * The plaintext password for it, from `AUTH_BASIC_PASSWORD`.
   * Hashed before it reaches the store and never stored as given.
   */
  readonly password: string;
}

/**
 * The subject to propose for a login name.
 *
 * Not exported. A test asserting the stored subject spells the
 * expected value out, because a test computing its expectation with
 * the function under test asserts nothing about what that function
 * answers.
 *
 * @param user - The configured login name.
 * @returns The namespaced subject, which is injective in `user`:
 *   two login names cannot derive one subject, so this can never be
 *   what makes `auth_users_sub_unique` refuse an insert.
 */
function subjectFor(user: string): string {
  return `${SUBJECT_NAMESPACE}${user}`;
}

/**
 * Makes the configured credential exist, hashing the password on
 * the way in.
 *
 * @param store - Where the credential is written.
 * @param _deps - Unread. Present so this shares one signature with
 *   the session functions in `src/auth/service.ts`; see `AuthDeps`.
 *   Neither field applies: a bootstrap mints no session, so there
 *   is no TTL, and every timestamp this write stamps belongs to the
 *   store's own clock.
 * @param credentials - The login name and password to make true.
 * @returns The row that now exists. Its `sub` is the STORED one and
 *   therefore not the proposed one on any boot but the first, and
 *   its `passwordHash` is the hash just written. That field is why
 *   the caller that matters is `createAuthBootstrapDependency`,
 *   which discards this: the containment rule in
 *   `src/auth/store.ts` binds anything else that holds it.
 *
 * @remarks
 * Hashing is argon2id and deliberately slow, and it happens on
 * every boot whether or not the stored hash would have verified.
 * Checking first would mean reading the hash, verifying the
 * configured password against it, and writing only on a mismatch —
 * three operations and a branch to save one hash per process start.
 */
export async function bootstrapAuthUser(
  store: AuthStore,
  _deps: AuthDeps,
  credentials: BootstrapCredentials,
): Promise<AuthUserCredential> {
  const passwordHash = await hashPassword(credentials.password);

  return store.upsertUser({
    username: credentials.user,
    sub: subjectFor(credentials.user),
    passwordHash,
  });
}

/**
 * Wraps the bootstrap as a dependency for `createService`.
 *
 * @param store - Passed through to {@link bootstrapAuthUser}.
 * @param deps - Passed through unread; see that function.
 * @param credentials - The credential to make true on start.
 * @returns A `Dependency` that writes nothing until `start()` is
 *   called. Constructing it touches no database, which is what lets
 *   it be built in the same breath as the store it writes through
 *   and ordered behind the Postgres dependency in the array.
 *
 * @remarks
 * There is no `onStop`. The bootstrap holds no resource — it
 * borrows the pool the database dependency owns, and that
 * dependency is the one that drains it.
 *
 * A rejection propagates unwrapped. `createDependency` moves the
 * status to `error` and rethrows, and `createService` logs the
 * dependency name and aborts the boot, so a caught-and-summarised
 * error here would replace the store's account of what refused with
 * a less specific one.
 */
export function createAuthBootstrapDependency(
  store: AuthStore,
  deps: AuthDeps,
  credentials: BootstrapCredentials,
): Dependency {
  return createDependency({
    name: DEPENDENCY_NAME,
    async onStart() {
      // The credential is discarded rather than kept: it carries a
      // hash, and no consumer of this dependency has any use for
      // one. See the containment rule in `src/auth/store.ts`.
      await bootstrapAuthUser(store, deps, credentials);
    },
  });
}
