/**
 * @packageDocumentation
 * `auth_users` and `auth_sessions` — the two tables behind the basic
 * authentication strategy: one credential row per operator, and one
 * row per opaque session token issued against it.
 *
 * Nothing outside `src/auth/` reads or writes either table. The hash
 * columns are the reason: a password hash and a session-token hash
 * are the two values this schema exists to keep contained, and the
 * containment is a rule about which modules may name the columns
 * rather than anything the database enforces.
 *
 * `sub` is the one value both tables hold, and the rule that keeps
 * them agreeing is that it is written once and never rewritten. The
 * session row carries its own copy so that verifying a token is a
 * single-row read; that copy is only trustworthy because the value
 * behind it cannot move.
 */
import { bigint, bigserial, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

/**
 * `auth_users` — one operator credential, keyed by login name.
 *
 * The bootstrap dependency upserts a single row here from
 * `AUTH_BASIC_USER` and `AUTH_BASIC_PASSWORD` once the Postgres pool
 * is proven live. No other writer inserts, and no request path
 * writes at all.
 */
export const authUsers = pgTable('auth_users', {
  /**
   * Surrogate key. `bigserial` in `number` mode rather than `bigint`
   * mode: an id crossing the API and MCP surfaces is serialized to
   * JSON, and a JS `bigint` throws there rather than rendering.
   */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The stable subject identifier session claims carry, written once
   * at insert and never rewritten by the bootstrap upsert.
   *
   * The upsert runs on every boot and replaces the hash, so leaving
   * `sub` out of what it rewrites is what separates the credential
   * from the identity: an operator rotating their password stays the
   * same subject, and nothing downstream that keys on `sub` has to
   * care that the row was touched.
   *
   * Rewriting it would fail quietly rather than loudly. Every live
   * session in `auth_sessions` holds its own copy taken at mint time,
   * so a token issued before the restart keeps verifying and keeps
   * answering the old subject — a value the credential row no longer
   * names. Nothing errors; the claims just stop meaning what they say.
   */
  sub: text('sub').notNull(),

  /** The login name `POST /auth/login` is presented with. */
  username: text('username').notNull(),

  /**
   * The argon2id PHC string produced by `src/auth/password.ts`. The
   * submitted password itself is never stored and never logged.
   */
  passwordHash: text('password_hash').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * Rewritten by the bootstrap upsert whenever it replaces the hash,
   * on the same terms as `domains.updated_at`: maintained by the
   * writer, with no trigger and no `$onUpdate` behind it.
   */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, (table) => [
  /**
   * One credential row per subject. The identifier session claims
   * carry has to name exactly one row, or a verified token is
   * ambiguous about whose it is.
   */
  unique('auth_users_sub_unique').on(table.sub),

  /**
   * The natural key: the bootstrap upserts on the login name, so a
   * restart adjusts the existing operator's hash rather than leaving
   * two rows answering the same login.
   */
  unique('auth_users_username_unique').on(table.username),
]);

/**
 * `auth_sessions` — one row per issued session token.
 *
 * A row is written when `POST /auth/login` mints a token and read on
 * every guarded request, which is what the denormalised `sub` and the
 * unique index on `token_hash` are shaped for.
 */
export const authSessions = pgTable('auth_sessions', {
  /** Surrogate key; see `authUsers.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The SHA-256 hash of the opaque token, from
   * `src/auth/tokens.ts`. The token itself is returned to the caller
   * once and never persisted, so a reader of this table cannot mint a
   * request from what it holds.
   */
  tokenHash: text('token_hash').notNull(),

  /**
   * The subject this session authenticates, copied from
   * `auth_users.sub` at mint time so verifying a token reads one row
   * rather than joining on the request hot path.
   *
   * A deliberate denormalisation: `user_id` already reaches the same
   * value through the foreign key, so the normalised read is a join,
   * and it is a join every guarded request would pay. Carrying the
   * copy makes one lookup by `token_hash` answer the whole of the
   * claims the verifier owes its caller.
   *
   * The copy cannot drift, because the value it copies is never
   * rewritten (see `auth_users.sub`). That immutability is what makes
   * the denormalisation safe rather than merely fast: there is no
   * update path that would have to keep the two columns in step, and
   * so no window in which they disagree.
   */
  sub: text('sub').notNull(),

  /**
   * The credential this session was issued against. Cascading on
   * delete: a session outliving its user authenticates a subject that
   * no longer exists, and goes on doing so until it expires.
   */
  userId: bigint('user_id', { mode: 'number' }).notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * When this session stops being valid, written at mint time from
   * `AUTH_SESSION_TTL_SECONDS`. NOT NULL because a session with no
   * expiry is one nothing ever takes away.
   */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  /**
   * When this session was revoked, or NULL if it was not. A timestamp
   * rather than a boolean so a revoked session stays distinguishable
   * from an expired one after the fact.
   *
   * NULL is the encoding of "not revoked", not a missing value: one
   * column carries both the state and when it was entered, so there
   * is no second flag to keep in step with the timestamp and no row
   * that can say revoked without saying when.
   *
   * The two ways a token stops working stay separate reads — this
   * column IS NULL, and `expires_at` still ahead of now. A boolean
   * would collapse both into "not valid" and lose which applied: a
   * session that ran out did so on its own schedule, while one that
   * was revoked was taken away by a logout or by an operator pulling
   * it, and only the timestamp says when that happened.
   */
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  /**
   * The verifier's lookup key, and the guarantee it stands on: one
   * hash identifies at most one session, so a token either resolves
   * to a single row or to none.
   */
  unique('auth_sessions_token_hash_unique').on(table.tokenHash),
]);
