/**
 * @packageDocumentation
 * The in-memory {@link AuthStore}: the second implementation behind
 * the port, and the one the isolated suite drives every session rule
 * through.
 *
 * `src/auth/store.ts` declares the port so that a decision about rows
 * can be exercised by anything able to supply rows, and this file is
 * what supplies them. Two maps, two counters, and nothing to await:
 * expiry, revocation, an unknown user and a token matching no row all
 * land in the half of the suite that needs no service running, and
 * what the live half is left proving is that real Postgres agrees.
 *
 * THE CLOCK IS INJECTED, which is what an expiry case would otherwise
 * have to wait for. The store stamps `created_at` and `revoked_at`
 * and compares `expires_at` against the present when it sweeps, so
 * behind the wall clock a case about a session that has aged out has
 * to let an instant pass — a sleep, in a suite whose whole point is
 * that it runs with nothing up. Handing the clock in turns that wait
 * into a call to {@link MovableClock.advanceSeconds}, and makes the
 * sweep's cutoff a value the case chose rather than whatever the run
 * happened to take.
 *
 * `expires_at` stays caller-supplied here exactly as it is over
 * drizzle, so a case may equally leave the clock alone and hand in an
 * expiry already in the past — which is what the contract in
 * `tests/auth/store-contract.ts` does, because those entries have to
 * hold against a store whose clock is the database's. The injected
 * clock is for the claims about the STORE's own timestamps, which are
 * the ones no caller can reach around.
 *
 * IT ENFORCES THE CONSTRAINTS THE TABLES CARRY — the unique keys on
 * `username`, `sub` and `token_hash`, and the foreign key from a
 * session onto its credential — because a fake that accepts a write
 * Postgres refuses is how one contract quietly becomes two that agree
 * until the day they do not. Each refusal is a plain `Error` naming
 * the constraint: there is no driver error shape here worth
 * imitating, so what a caller can assert is that the write was
 * refused and which key refused it. No message carries a hash, per
 * the containment rule `src/auth/store.ts` states.
 *
 * EVERY DATE CROSSING THE BOUNDARY IS COPIED, in both directions.
 * `Date` is mutable, so a store holding the caller's instance — or
 * handing its own back — lets a caller write into stored state
 * through a field the port declares `readonly`, which is a corruption
 * the drizzle implementation cannot have. Copying makes the two
 * behave alike for the same reason enforcing the constraints does.
 *
 * What crosses the port is column-scoped the way `db-store.ts`
 * projects its reads. Rows here carry `created_at` and `updated_at`,
 * and {@link AuthStore.upsertUser} hands back the four
 * {@link AuthUserCredential} fields and nothing else. Those
 * timestamps are reachable through {@link MemoryAuthStore.listUsers}
 * instead, which is where a case asserting that a repeated bootstrap
 * left `sub` and `created_at` alone has to look: the port has no
 * spelling for that claim, and giving it one would put a field on the
 * record type that nothing in `src/` would ever read.
 */
import type {
  AuthSessionRecord,
  AuthStore,
  AuthUserCredential,
  InsertAuthSessionInput,
  UpsertAuthUserInput,
} from '../../src/auth/store.js';

/**
 * A clock a caller moves by hand.
 *
 * Everything about it is the {@link now} thunk; the mutator exists
 * so that a case can put an instant behind it without waiting for
 * one to arrive.
 */
export interface MovableClock {
  /**
   * The instant the clock currently reads.
   *
   * A property holding an arrow rather than a method, so that it can
   * be detached and handed straight to
   * {@link MemoryAuthStoreOptions.now} without a binding step. Each
   * call answers a fresh `Date`, so a caller cannot move the clock
   * by mutating something it returned.
   */
  readonly now: () => Date;

  /**
   * Moves the clock, forward or — with a negative offset — back.
   *
   * @param seconds - How far to move it from where it now reads.
   */
  advanceSeconds(seconds: number): void;
}

/**
 * One `auth_users` row as this store holds it: the credential plus
 * the two timestamps the port does not carry.
 *
 * The extra fields are the whole reason the type exists. They are
 * the record of when the store last wrote the row, which is what a
 * case about a repeated bootstrap is asking after and what a case
 * about a login has no business seeing.
 */
export interface MemoryAuthUserRow extends AuthUserCredential {
  /** When the row was inserted. Never rewritten by an upsert. */
  readonly createdAt: Date;
  /** When an upsert last rewrote the hash. */
  readonly updatedAt: Date;
}

/**
 * The store, plus the two readers that see what the port hides.
 *
 * Both readers are for assertions rather than for the code under
 * test: nothing in `src/` is handed a {@link MemoryAuthStore}, so
 * they cannot become a way for a caller to route around the port.
 */
export interface MemoryAuthStore extends AuthStore {
  /**
   * Every `auth_users` row, whole, in insertion order.
   *
   * @returns Copies, so writing to one changes nothing stored.
   */
  listUsers(): readonly MemoryAuthUserRow[];

  /**
   * Every `auth_sessions` row, in insertion order, expired and
   * revoked ones included — the store filters nothing.
   *
   * @returns Copies, on the same terms as {@link listUsers}.
   */
  listSessions(): readonly AuthSessionRecord[];
}

/** What {@link createMemoryAuthStore} may be handed. */
export interface MemoryAuthStoreOptions {
  /**
   * The clock the store stamps and sweeps against.
   *
   * Defaults to the wall clock, which is the right answer for every
   * case that supplies its own expiries and asserts a timestamp by
   * kind rather than by instant.
   */
  readonly now?: () => Date;
}

/**
 * A `Date` with the same instant and no shared identity.
 *
 * @param instant - The date to copy.
 * @returns A new `Date` reading the same millisecond.
 */
function copyInstant(instant: Date): Date {
  return new Date(instant.getTime());
}

/**
 * A session record whose dates belong to nobody else.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copySession(row: AuthSessionRecord): AuthSessionRecord {
  return {
    ...row,
    createdAt: copyInstant(row.createdAt),
    expiresAt: copyInstant(row.expiresAt),
    revokedAt: row.revokedAt === null
      ? null
      : copyInstant(row.revokedAt),
  };
}

/**
 * A user row whose dates belong to nobody else.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand to a reader.
 */
function copyUser(row: MemoryAuthUserRow): MemoryAuthUserRow {
  return {
    ...row,
    createdAt: copyInstant(row.createdAt),
    updatedAt: copyInstant(row.updatedAt),
  };
}

/**
 * The four columns the port declares, projected off a stored row.
 *
 * The counterpart of `db-store.ts`'s `CREDENTIAL_COLUMNS`: a caller
 * of {@link AuthStore.findUserCredential} sees the same fields from
 * either implementation, so a case cannot come to depend on a
 * timestamp only this one holds.
 *
 * @param row - The stored row.
 * @returns The credential, with no timestamps on it.
 */
function credentialOf(row: MemoryAuthUserRow): AuthUserCredential {
  return {
    id: row.id,
    sub: row.sub,
    username: row.username,
    passwordHash: row.passwordHash,
  };
}

/**
 * Builds an {@link AuthStore} over two maps.
 *
 * @param options - Where the clock comes from; see
 *   {@link MemoryAuthStoreOptions}.
 * @returns A store holding no rows, whose ids start at 1 as the
 *   `bigserial` columns do. Each call builds a store of its own, so
 *   the contract's empty-tables precondition is satisfied by
 *   constructing one per entry.
 */
export function createMemoryAuthStore(
  options: MemoryAuthStoreOptions = {},
): MemoryAuthStore {
  const readClock = options.now ?? (() => new Date());
  const users = new Map<number, MemoryAuthUserRow>();
  const sessions = new Map<number, AuthSessionRecord>();
  let nextUserId = 1;
  let nextSessionId = 1;

  /**
   * Reads the clock and copies what it answered.
   *
   * The copy is what makes a fixed clock safe: `() => FIXED` is the
   * obvious way to write one, and without this every row it stamped
   * would share that single `Date`.
   *
   * @returns The instant to write onto a row.
   */
  function stamp(): Date {
    return copyInstant(readClock());
  }

  /**
   * @param username - The login name to look under.
   * @returns The row carrying it, or undefined. At most one row can,
   *   which `auth_users_username_unique` is what guarantees.
   */
  function userByUsername(username: string): MemoryAuthUserRow | undefined {
    return [...users.values()].find((row) => row.username === username);
  }

  /**
   * @param sub - The subject to look under.
   * @returns The row carrying it, or undefined.
   */
  function userBySub(sub: string): MemoryAuthUserRow | undefined {
    return [...users.values()].find((row) => row.sub === sub);
  }

  /**
   * @param tokenHash - The stored hash to look under.
   * @returns The session carrying it, or undefined. Whether it is
   *   live is no part of the question.
   */
  function sessionByHash(tokenHash: string): AuthSessionRecord | undefined {
    return [...sessions.values()].find((row) => row.tokenHash === tokenHash);
  }

  return {
    /**
     * Inserts, or on a login-name conflict rewrites the hash and
     * `updated_at` and carries `sub` and `created_at` over — the
     * asymmetry {@link AuthStore.upsertUser} describes, here as the
     * fields the replacement row keeps from the row it replaces.
     *
     * An insert whose subject another login name already holds is
     * refused: `auth_users.sub` carries a unique key of its own, and
     * the conflict target is the login name rather than the subject.
     */
    async upsertUser(input: UpsertAuthUserInput): Promise<AuthUserCredential> {
      const existing = userByUsername(input.username);

      if (existing !== undefined) {
        const updated: MemoryAuthUserRow = {
          ...existing,
          passwordHash: input.passwordHash,
          updatedAt: stamp(),
        };

        users.set(existing.id, updated);

        return credentialOf(updated);
      }

      if (userBySub(input.sub) !== undefined) {
        throw new Error(
          `memory auth store: auth_users_sub_unique already holds ${input.sub}`,
        );
      }

      // One clock reading, two `Date` objects: a row whose two
      // timestamps were the same object would let a later write to
      // one of them move the other.
      const written = stamp();
      const inserted: MemoryAuthUserRow = {
        id: nextUserId,
        sub: input.sub,
        username: input.username,
        passwordHash: input.passwordHash,
        createdAt: written,
        updatedAt: copyInstant(written),
      };

      nextUserId += 1;
      users.set(inserted.id, inserted);

      return credentialOf(inserted);
    },

    /**
     * One credential by login name, projected to the port's four
     * columns.
     */
    async findUserCredential(
      username: string,
    ): Promise<AuthUserCredential | null> {
      const row = userByUsername(username);

      return row === undefined
        ? null
        : credentialOf(row);
    },

    /**
     * Stores a session, stamping `created_at` off the clock and
     * taking `expires_at` from the caller.
     *
     * Refuses a hash some session already carries and a `user_id`
     * no credential holds, which are the unique key and the foreign
     * key the live half enforces — a session planted against an
     * invented id is a row Postgres would never have accepted.
     */
    async insertSession(
      input: InsertAuthSessionInput,
    ): Promise<AuthSessionRecord> {
      if (!users.has(input.userId)) {
        throw new Error(
          'memory auth store: auth_sessions_user_id_auth_users_id_fk '
          + `has no auth_users row with id ${input.userId}`,
        );
      }

      if (sessionByHash(input.tokenHash) !== undefined) {
        throw new Error(
          'memory auth store: auth_sessions_token_hash_unique already '
          + 'holds that hash',
        );
      }

      const row: AuthSessionRecord = {
        id: nextSessionId,
        tokenHash: input.tokenHash,
        sub: input.sub,
        userId: input.userId,
        createdAt: stamp(),
        expiresAt: copyInstant(input.expiresAt),
        revokedAt: null,
      };

      nextSessionId += 1;
      sessions.set(row.id, row);

      return copySession(row);
    },

    /**
     * One session by its stored hash, expired and revoked rows
     * included. Deciding what either means is the caller's, per
     * {@link AuthStore}.
     */
    async findSessionByTokenHash(
      tokenHash: string,
    ): Promise<AuthSessionRecord | null> {
      const row = sessionByHash(tokenHash);

      return row === undefined
        ? null
        : copySession(row);
    },

    /**
     * Stamps `revoked_at` on a session that has none.
     *
     * The already-revoked branch answers false and leaves the
     * standing timestamp, which is what makes the answer mean "this
     * call revoked it" rather than "a row exists". Expiry is no part
     * of the condition, so an aged-out session is revocable here as
     * it is over drizzle.
     */
    async revokeSessionByTokenHash(tokenHash: string): Promise<boolean> {
      const row = sessionByHash(tokenHash);

      if (row === undefined || row.revokedAt !== null) {
        return false;
      }

      sessions.set(row.id, { ...row, revokedAt: stamp() });

      return true;
    },

    /**
     * Removes every session whose expiry is strictly behind the
     * clock, matching the `expires_at < now()` the drizzle sweep
     * issues: a row expiring on this very instant survives.
     *
     * Revocation is not consulted, so a revoked session that has not
     * yet expired stays — it is already refused on read, and the
     * timestamp on it is an audit trail.
     */
    async deleteExpiredSessions(): Promise<number> {
      const cutoff = readClock().getTime();
      const expired = [...sessions.values()].filter(
        (row) => row.expiresAt.getTime() < cutoff,
      );

      for (const row of expired) {
        sessions.delete(row.id);
      }

      return expired.length;
    },

    listUsers(): readonly MemoryAuthUserRow[] {
      return [...users.values()].map(copyUser);
    },

    listSessions(): readonly AuthSessionRecord[] {
      return [...sessions.values()].map(copySession);
    },
  };
}

/**
 * Builds a clock a case can move.
 *
 * @param start - Where it first reads. Defaults to the present, so a
 *   case that only ever moves it forward needs no fixture instant.
 * @returns The clock. Its {@link MovableClock.now} is safe to detach
 *   and hand to {@link createMemoryAuthStore}.
 */
export function createMovableClock(start: Date = new Date()): MovableClock {
  let epochMs = start.getTime();

  return {
    now: () => new Date(epochMs),

    advanceSeconds(seconds: number): void {
      epochMs += seconds * 1000;
    },
  };
}
