/**
 * @packageDocumentation
 * The `AuthStore` port — the whole of what the authentication module
 * asks a database for, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * EVERY SESSION RULE IS EXERCISABLE WITH NO DATABASE, and that is the
 * reason the port exists. Expiry, revocation, an unknown user, a wrong
 * password, a token matching no row: none of those are facts about
 * Postgres. They are decisions taken about rows, and a decision about
 * rows can be driven by anything that supplies rows. So the isolated
 * suite puts an in-memory implementation behind this interface and
 * the live suite puts drizzle behind it, both answering one contract,
 * and every rule lands in the half of the suite that needs no service
 * running at all. What the live half is left proving is the narrower
 * claim that real Postgres agrees — which is the only part of this
 * that a container has to be up to answer.
 *
 * That testability is a consequence of a design rule rather than the
 * rule itself: THE STORE DECIDES NOTHING. It reads and writes rows.
 * {@link AuthStore.findSessionByTokenHash} hands back an expired
 * session and a revoked one exactly as readily as a live one, because
 * "expired" is a comparison against a clock and the clock belongs to
 * the caller. A store that filtered would look tidier and would move
 * the rule into the one part of the module that cannot be exercised
 * without a database — the arrangement this file exists to avoid.
 *
 * The store does own one clock, and which timestamps fall to it
 * follows from the same rule. A timestamp recording when the STORE
 * acted is the store's to stamp: `created_at`, `updated_at`,
 * `revoked_at`, and the cutoff {@link AuthStore.deleteExpiredSessions}
 * sweeps against. A timestamp encoding a DECISION arrives as a value
 * instead — `expires_at` is an issue time plus a configured TTL,
 * which is a policy the store has no business holding an opinion
 * about. An implementation may therefore read the wall clock, and
 * nothing above it has to.
 *
 * `passwordHash` CROSSES THIS PORT AND GOES NO FURTHER. It is
 * declared on {@link AuthUserCredential}, supplied to
 * {@link AuthStore.upsertUser} and returned by
 * {@link AuthStore.findUserCredential}, and the rule about those
 * three is that every call site of them sits inside `src/auth/` —
 * whatever produces a hash, whatever writes one, whatever verifies
 * against one. Across `src/` and `lib/`, two files may name the
 * field and no third: this directory, and `src/db/schema/auth.ts`,
 * where the column it maps onto is declared.
 *
 * That containment is the point of routing the credential read
 * through a port at all. A repository handing whole `auth_users`
 * rows to whoever asked would spread the column across every caller,
 * and no rule about where a hash may travel survives that. A later
 * stage adds `tests/invariants/auth-containment.ts`, which walks
 * those two trees with exactly those two exclusions and treats any
 * other hit as a finding; until it lands the rule is carried by this
 * paragraph alone.
 */

/**
 * One `auth_users` row, as the login path needs it.
 *
 * A credential rather than a user, and the name is the scope: these
 * four columns answer "is this the right password, and whose is it",
 * which is the entirety of what any reader of the table does.
 * `created_at` and `updated_at` are deliberately absent — they record
 * when the bootstrap last wrote, which is an operational fact about
 * the row and no part of verifying anybody.
 */
export interface AuthUserCredential {
  /** `auth_users.id`, the value {@link AuthSessionRecord.userId} points at. */
  readonly id: number;
  /**
   * The stable subject identifier session claims carry, copied onto
   * every session minted against this credential.
   */
  readonly sub: string;
  /** The login name a client presents. */
  readonly username: string;
  /**
   * The argon2id PHC string from `src/auth/password.ts`. Never the
   * password, and never logged — see the containment rule above.
   */
  readonly passwordHash: string;
}

/**
 * What {@link AuthStore.upsertUser} is handed: the credential to make
 * true, with no id and no timestamps.
 *
 * `sub` is an insert-time value and not an update-time one, which is
 * the whole asymmetry of the upsert: a caller supplies a subject for
 * the row it might create, and gets back whatever subject the row
 * that now exists actually carries. The two differ on every boot
 * after the first.
 */
export interface UpsertAuthUserInput {
  /** The natural key the upsert conflicts on. */
  readonly username: string;
  /** The subject to write if this insert creates the row. */
  readonly sub: string;
  /** The argon2id PHC string to store, replacing any existing one. */
  readonly passwordHash: string;
}

/**
 * One `auth_sessions` row, whole.
 *
 * Carries `expiresAt` and `revokedAt` because the caller is the one
 * that reads them: handing back the raw row is what lets the validity
 * rules sit above the port rather than inside it. `tokenHash` is on
 * the record for the same reason it is in the table — it is the
 * stored form, and the token it was reduced from appears nowhere in
 * this type, which is a shape a test can assert rather than a
 * promise a comment makes.
 */
export interface AuthSessionRecord {
  /** `auth_sessions.id`. */
  readonly id: number;
  /** The SHA-256 hex digest from `src/auth/tokens.ts`. */
  readonly tokenHash: string;
  /**
   * The subject this session authenticates, copied from the
   * credential at mint time so a verify is a single-row read.
   */
  readonly sub: string;
  /** The {@link AuthUserCredential.id} this session was issued against. */
  readonly userId: number;
  /** When the session was minted, stamped by the store. */
  readonly createdAt: Date;
  /** When the session stops being valid, supplied by the caller. */
  readonly expiresAt: Date;
  /**
   * When the session was revoked, or null when it was not. Null is
   * the encoding of "not revoked" rather than a missing value.
   */
  readonly revokedAt: Date | null;
}

/**
 * What {@link AuthStore.insertSession} is handed.
 *
 * Everything the row needs except its id and its `created_at`, both
 * of which belong to the write. The raw token is not here and has no
 * spelling in this file: the caller reduces it to a hash before the
 * port is reached, so no implementation is ever in a position to
 * persist the credential itself.
 */
export interface InsertAuthSessionInput {
  /** The SHA-256 hex digest of the minted token. */
  readonly tokenHash: string;
  /** The subject to copy onto the session. */
  readonly sub: string;
  /** The credential this session is issued against. */
  readonly userId: number;
  /** Issue time plus the configured TTL, computed by the caller. */
  readonly expiresAt: Date;
}

/**
 * Every database operation the authentication module performs.
 *
 * Six methods and no escape hatch: there is no `query`, no exposed
 * connection and no transaction handle, so an implementation is
 * substitutable by anything that can hold rows. That closure is what
 * makes the in-memory implementation a genuine second implementation
 * rather than a stub covering the easy calls.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 */
export interface AuthStore {
  /**
   * Makes a credential exist, conflicting on
   * {@link UpsertAuthUserInput.username}.
   *
   * On insert, writes every supplied field. On conflict, rewrites
   * `password_hash` and `updated_at` and leaves `sub` and
   * `created_at` alone — which is what lets the bootstrap run on
   * every boot without an operator's subject moving underneath the
   * sessions already carrying a copy of it.
   *
   * @returns The row that now exists. Its `sub` is the STORED one, so
   *   on any run but the first it is not the one that was supplied.
   *   Callers that need the subject must read it from here rather
   *   than reusing what they passed in.
   */
  upsertUser(input: UpsertAuthUserInput): Promise<AuthUserCredential>;

  /**
   * Looks a credential up by login name.
   *
   * @returns The credential, or null when no row carries that name.
   *   Null is not an error and not a distinct outcome to a caller: an
   *   unknown user and a wrong password are the same refusal on the
   *   login path, because answering them differently is what turns a
   *   login endpoint into a username oracle.
   */
  findUserCredential(username: string): Promise<AuthUserCredential | null>;

  /**
   * Persists a newly minted session, stamping `created_at`.
   *
   * @returns The stored row, which is the shape a caller can assert
   *   the minted token is absent from.
   */
  insertSession(input: InsertAuthSessionInput): Promise<AuthSessionRecord>;

  /**
   * Reads one session by its stored hash. The request hot path.
   *
   * @returns The row, or null when no session carries that hash. An
   *   expired session and a revoked one both come back as rows —
   *   deciding what they mean is the caller's, per the rule above.
   */
  findSessionByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;

  /**
   * Stamps `revoked_at` on a session that does not already have one.
   *
   * Expiry is no part of the condition: an expired row is revocable
   * and revoking it is harmless, whereas testing expiry here would
   * put a clock comparison back inside the store.
   *
   * @returns Whether a row moved. False covers both an unknown hash
   *   and an already-revoked session, which is deliberate: the first
   *   revocation is when the session was taken away, and overwriting
   *   the timestamp on a second call would lose that in exchange for
   *   recording when somebody asked again.
   */
  revokeSessionByTokenHash(tokenHash: string): Promise<boolean>;

  /**
   * Deletes every session whose `expires_at` has passed.
   *
   * Housekeeping, not enforcement — a session is refused because a
   * verify read its expiry, never because a sweep happened to have
   * run. Revoked sessions that have not yet expired are left in
   * place: they are already refused on read, and removing them early
   * would discard the audit trail `revoked_at` exists to keep.
   *
   * @returns How many rows were removed.
   */
  deleteExpiredSessions(): Promise<number>;
}
