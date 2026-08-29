/**
 * @packageDocumentation
 * The drizzle half of {@link AuthStore}: one statement per method,
 * over the two tables `src/db/schema/auth.ts` declares.
 *
 * THE HASH COLUMNS ARE READ AND WRITTEN HERE AND NOWHERE ELSE.
 * Across `src/` and `lib/`, every query naming
 * `auth_users.password_hash` or `auth_sessions.token_hash` is
 * written below; the schema module declares those two columns, and
 * the rest of `src/auth/` names them only as fields on the port's
 * record types or in prose. That is the containment rule
 * `src/auth/store.ts` states, sited at the one place it could
 * actually be broken — a module building its own query against
 * these tables would route around the port entirely, and no rule
 * about where a hash may travel survives that.
 *
 * Reads are column-scoped for the same reason. Nothing here selects
 * a whole row: every `SELECT` and `RETURNING` list names exactly
 * the fields {@link AuthUserCredential} and
 * {@link AuthSessionRecord} declare, so a column added to either
 * table reaches no caller of this store until somebody puts it on
 * the port deliberately.
 *
 * THE DATABASE ARRIVES AS A THUNK, which settles an ordering
 * problem rather than a stylistic one. The store is a value
 * `createService` is handed: the session verifier closes over it,
 * the bootstrap dependency closes over it, and both are arguments
 * to the call that starts the dependency graph. A store demanding a
 * live {@link Db} up front could not be built until Postgres had
 * started, which is after the call that needs it. Deferring the
 * lookup to call time breaks that cycle and costs nothing — every
 * method resolves the database when a caller arrives, which is
 * always after start, and `ctx.deps.get(dbDep)`, the sanctioned
 * accessor and one only reachable while the service registers, is a
 * legal thunk body.
 *
 * The timestamps this file writes are the DATABASE's, spelled
 * `now()` in the statement rather than read off a JS `Date`:
 * `created_at` from the column default, `updated_at` on the upsert,
 * `revoked_at` on a revoke. They therefore cannot disagree with one
 * another however far the service host's clock has drifted, and
 * ordering two rows by when the store touched them is a question
 * one clock answered.
 *
 * `expires_at` stays a caller-supplied value, because an issue time
 * plus a TTL is a policy rather than a record of when the store
 * acted. The sweep consequently compares a value computed off the
 * caller's clock against the database's, and where the database
 * runs ahead it removes a session a verify taken at the same
 * instant would still have accepted — by exactly the skew between
 * the two, at the very end of that session's life. That is
 * affordable because the sweep enforces nothing: a session is
 * refused because a verify read its expiry, never because a sweep
 * had run.
 */
import type {
  AuthSessionRecord,
  AuthStore,
  AuthUserCredential,
  InsertAuthSessionInput,
  UpsertAuthUserInput,
} from './store.js';
import type { Db } from '../db/index.js';

import { and, eq, isNull, lt, sql } from 'drizzle-orm';

import { authSessions, authUsers } from '../db/schema.js';

/**
 * The `auth_users` columns {@link AuthUserCredential} is made of, as
 * one object both the select and the upsert's `RETURNING` project
 * through.
 *
 * Written once so the two cannot drift: a credential read on the
 * login path and a credential handed back by the bootstrap are the
 * same four columns, and a list maintained twice is a list that
 * eventually names `password_hash` in one place and not the other.
 */
const CREDENTIAL_COLUMNS = {
  id: authUsers.id,
  sub: authUsers.sub,
  username: authUsers.username,
  passwordHash: authUsers.passwordHash,
};

/**
 * The `auth_sessions` columns {@link AuthSessionRecord} is made of.
 *
 * Every column of the table today, which is a coincidence rather
 * than a shortcut — naming them keeps the projection pinned to the
 * port's record type, so the next column added to the table stops
 * at this file.
 */
const SESSION_COLUMNS = {
  id: authSessions.id,
  tokenHash: authSessions.tokenHash,
  sub: authSessions.sub,
  userId: authSessions.userId,
  createdAt: authSessions.createdAt,
  expiresAt: authSessions.expiresAt,
  revokedAt: authSessions.revokedAt,
};

/**
 * The row a write was supposed to return, or a refusal naming the
 * statement that came back empty.
 *
 * An insert with a `RETURNING` list yields exactly one row on every
 * path Postgres takes, so an empty result is not a case to handle —
 * it is a state this module has no account of. Under
 * `noUncheckedIndexedAccess` the destructure is typed
 * `T | undefined` regardless, so the choice is between a refusal
 * that says which statement produced nothing and a cast that
 * pretends the question never arose.
 *
 * @param row - The destructured first row of a `RETURNING` result.
 * @param statement - What was being written, for the message.
 * @returns The row, narrowed.
 * @throws Error When the write returned no row at all.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`auth store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Builds the {@link AuthStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per
 *   method call and never at construction, which is what lets the
 *   store be built before the Postgres dependency has started; see
 *   the thunk paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method. It holds no
 *   state of its own, so building a second one over the same thunk
 *   is free and equivalent.
 */
export function createDbAuthStore(getDb: () => Db): AuthStore {
  return {
    /**
     * `INSERT ... ON CONFLICT (username) DO UPDATE`, rewriting the
     * hash and `updated_at` and touching neither `sub` nor
     * `created_at` — the asymmetry {@link AuthStore.upsertUser}
     * describes, expressed as the `set` list rather than enforced
     * anywhere else.
     */
    async upsertUser(input: UpsertAuthUserInput): Promise<AuthUserCredential> {
      const [row] = await getDb().insert(authUsers)
        .values({
          username: input.username,
          sub: input.sub,
          passwordHash: input.passwordHash,
        })
        .onConflictDoUpdate({
          target: authUsers.username,
          set: { passwordHash: input.passwordHash, updatedAt: sql`now()` },
        })
        .returning(CREDENTIAL_COLUMNS);

      return writtenRow(row, 'upsertUser');
    },

    /**
     * One row by login name, under `auth_users_username_unique`, so
     * the result is at most one row by construction rather than by
     * a `LIMIT`.
     */
    async findUserCredential(
      username: string,
    ): Promise<AuthUserCredential | null> {
      const [row] = await getDb().select(CREDENTIAL_COLUMNS)
        .from(authUsers)
        .where(eq(authUsers.username, username));

      return row ?? null;
    },

    /**
     * One insert. `created_at` comes from the column default and
     * `expires_at` from the caller, per the clock split above.
     */
    async insertSession(
      input: InsertAuthSessionInput,
    ): Promise<AuthSessionRecord> {
      const [row] = await getDb().insert(authSessions)
        .values({
          tokenHash: input.tokenHash,
          sub: input.sub,
          userId: input.userId,
          expiresAt: input.expiresAt,
        })
        .returning(SESSION_COLUMNS);

      return writtenRow(row, 'insertSession');
    },

    /**
     * The request hot path: one row by
     * `auth_sessions_token_hash_unique`, handed back whatever its
     * expiry and revocation say. Reading those is the caller's, per
     * {@link AuthStore}.
     */
    async findSessionByTokenHash(
      tokenHash: string,
    ): Promise<AuthSessionRecord | null> {
      const [row] = await getDb().select(SESSION_COLUMNS)
        .from(authSessions)
        .where(eq(authSessions.tokenHash, tokenHash));

      return row ?? null;
    },

    /**
     * `UPDATE ... SET revoked_at = now() WHERE token_hash = $1 AND
     * revoked_at IS NULL`.
     *
     * The `IS NULL` half is what makes the answer mean "this call
     * revoked it" rather than "a row exists": a second logout with
     * the same token matches nothing, so the first revocation's
     * timestamp stands and the caller is told no row moved. An
     * unknown hash is the same answer for the same reason, and one
     * statement covers both without a read in front of it.
     */
    async revokeSessionByTokenHash(tokenHash: string): Promise<boolean> {
      const revoked = await getDb().update(authSessions)
        .set({ revokedAt: sql`now()` })
        .where(and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
        ))
        .returning({ id: authSessions.id });

      return revoked.length > 0;
    },

    /**
     * `DELETE ... WHERE expires_at < now()`, counted by its
     * `RETURNING` list rather than by a driver's affected-row
     * field, which keeps the count a property of the statement.
     *
     * Strictly before, not at: a row whose expiry is this instant
     * survives the sweep and is refused on read like any other. The
     * predicate says nothing about `revoked_at`, so a revoked
     * session that has not yet expired stays — it is already
     * refused, and removing it early would discard the audit trail
     * the column exists to keep.
     */
    async deleteExpiredSessions(): Promise<number> {
      const removed = await getDb().delete(authSessions)
        .where(lt(authSessions.expiresAt, sql`now()`))
        .returning({ id: authSessions.id });

      return removed.length;
    },
  };
}
