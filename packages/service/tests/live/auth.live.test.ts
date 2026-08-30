/**
 * The AuthStore contract driven against the drizzle store over a real
 * Postgres, and the operator path above it — bootstrap, login,
 * introspect, logout — run end to end against the same database.
 * Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * THE ENTRIES ARE THE SAME ONES, NOT COPIES.
 * `tests/auth/store-contract.ts` writes each rule the port owes
 * exactly once, `tests/auth/store-contract.test.ts` is the first of
 * the two readers it was written for, and this file is the second.
 * What that run establishes is that the rules hold of a store; what
 * this one adds is that they hold of the store the service ships
 * with. Neither substitutes for the other, and the entries are shared
 * rather than restated so the two runs cannot come to be about
 * different rules.
 *
 * WHAT ONLY A SERVER CAN ANSWER is why the second run is worth its
 * container. The isolated half exercises the rules against two maps,
 * where a rule is whatever the fake was written to do. Here every
 * entry is SQL: the `ON CONFLICT (username) DO UPDATE` behind the
 * upsert's keep-the-subject asymmetry, the column-scoped `RETURNING`
 * lists, `created_at` from a column default against `updated_at` and
 * `revoked_at` from `now()`, the `IS NULL` guard that makes a second
 * revoke answer false, and the `expires_at < now()` sweep — plus the
 * two unique keys and the foreign key, which a store built on maps
 * can only imitate. A statement that is valid drizzle and invalid SQL
 * — a conflict target naming the wrong key, a projection naming a
 * column the migration never created — passes `lint`, `check-types`
 * and the whole isolated suite, and is reported here and nowhere
 * else.
 *
 * THE SCHEMA COMES FROM THE MIGRATIONS. `applyMigrations` in the
 * `beforeAll` below runs the real `drizzle/*.sql` rather than pushing
 * the schema, which is what `bun run db:migrate` does to a deployment
 * — so the tables these cases meet are the ones the generated
 * migration creates, and a migration that does not apply reddens this
 * file before a case is reached. `tests/live/live-postgres.ts` argues
 * the difference: a push produces the right tables while never
 * executing the migration, which is exactly the gap that lets a
 * broken one reach production.
 *
 * THE RESET IS THE CONTRACT'S PRECONDITION, written out. Every entry
 * is promised a store whose two tables are empty, and two of them
 * depend on it in a way a reader would not guess — the sweep asserts
 * the exact number of rows it removed, and the lookup misses assert a
 * null a leftover row could fill. The isolated reader meets that by
 * constructing a store per entry, which for it IS the reset. A
 * database cannot be constructed per entry, so here it is
 * `resetTables` in a `beforeEach`, and the round trip below takes it
 * on the same terms: nothing it reads back was planted by anything
 * but itself.
 *
 * THE ROUND TRIP IS WHAT THE CONTRACT CANNOT EXPRESS. The contract is
 * about the port, one method at a time; the round trip is about the
 * four modules above it meeting one database — an argon2id hash
 * written by the bootstrap dependency and verified at a login, a
 * token minted and reduced to a digest, that digest found again at
 * introspection, and the revocation standing afterwards.
 * `tests/auth/wiring.test.ts` runs the same path over the in-memory
 * store through `createService`, and is the composition's own test.
 * This one substitutes the other half — the real store, and no
 * framework — so between the two files each half of the pair is held
 * against the shipped code once. `createService` is deliberately not
 * booted here: it would add a listening port and a lifecycle to a
 * file whose subject is what the database does, and it is already
 * covered where a database is not needed to cover it.
 *
 * Anti-vacuity for the round trip, since it is one case and every
 * reading in it is downstream of the one before. The credential is
 * written by NOTHING here: `resetTables` empties both tables, the
 * dependency's `start()` is the only writer, and it is called the way
 * `createService` calls it. The login response is read as a whole key
 * SET rather than as three fields, because a `passwordHash` or a
 * `tokenHash` arriving by spread is caught by nothing else. The token
 * is taken through {@link tokenFrom}, which throws rather than let an
 * absent one travel into the next request as a field JSON drops — the
 * introspection that followed would be a malformed body answered
 * `400`, reported as a failure of the endpoint that was fine. The
 * persisted row is read back twice, so the revocation timestamp is
 * the DATABASE's rather than a value this file supplied, and the
 * serialised row is checked to contain the stored digest before it is
 * checked not to contain the token — a stringify of nothing satisfies
 * the second reading on its own.
 *
 * Four mutations were run against these ten cases, each split
 * identical across two passes. Emptying
 * `createAuthBootstrapDependency`'s `onStart` reddens ONE — the round
 * trip, on the user row it reads back — since no contract entry
 * reaches the bootstrap at all. Answering a token the stored row was
 * not derived from at `POST /login` reddens the same ONE and only
 * through the digest reading, the failure comparing two hex strings:
 * the key set and the subject above it are satisfied by any string,
 * which is what says that reading is not a restatement of them.
 *
 * The other two run wide, and both are findings rather than legs to
 * isolate. Making the revoke rewrite `expires_at` alongside
 * `revoked_at` reddens FOUR rather than the round trip's
 * moved-that-column-and-nothing-else reading alone: two entries
 * compare a whole session record across a revoke, and the sweep's
 * revoked-but-unexpired row becomes expired and is taken by the very
 * sweep it was planted to survive. Resolving the database at
 * construction rather than per call reddens EIGHT — every case that
 * touches the store — and leaves the two table guards green, which is
 * what says those two are about the contract table rather than about
 * the store.
 *
 * EVERY ERROR THIS FILE CONSTRUCTS CARRIES `[auth-live]`, so a
 * failure in a helper names the suite that raised it. That does not
 * extend to an entry's own assertion failures, and nothing here
 * catches one: vitest renders an assertion error's expected and
 * actual as the diff that says what differed, a re-wrap would replace
 * that with a prefix the case name already carries, and the rule the
 * entry stands for is in the case name too.
 */
import type { AuthDeps, AuthStore } from '../../src/auth/index.js';
import type { Application } from 'express';
import type { Pool } from 'pg';

import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { createLogger } from '../../lib/logger/node.js';
import {
  buildAuthRouter,
  createAuthBootstrapDependency,
  createDbAuthStore,
} from '../../src/auth/index.js';
import { hashSessionToken } from '../../src/auth/tokens.js';
import { authSessions, authUsers } from '../../src/db/schema.js';
import { AUTH_STORE_CONTRACT } from '../auth/store-contract.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/** The `AUTH_BASIC_USER` the round trip boots with. */
const BASIC_USER = 'auth-live-operator';

/** The `AUTH_BASIC_PASSWORD` that goes with it. */
const BASIC_PASSWORD = 'auth-live-operator-password';

/**
 * The subject `bootstrapAuthUser` derives from {@link BASIC_USER},
 * spelled out rather than computed.
 *
 * `subjectFor` is unexported precisely so that a case cannot build
 * its expectation with the function under test. The prefix is the
 * strategy's namespace; see `src/auth/bootstrap.ts`.
 */
const BOOTSTRAPPED_SUBJECT = 'basic:auth-live-operator';

/** The `AUTH_SESSION_TTL_SECONDS` the minted session lives under. */
const SESSION_TTL_SECONDS = 3600;

/**
 * The `AUTH_INTROSPECT_SECRET` the router is configured with.
 *
 * A real value rather than an empty string, so the introspection
 * readings below are of an open gate rather than of the closed-gate
 * fallback. What a WRONG secret is answered is
 * `src/auth/routes.test.ts`'s subject.
 */
const INTROSPECT_SECRET = 'auth-live-introspect-secret';

/**
 * A real logger with every level suppressed.
 *
 * The router logs a fixed line on each refusal path, and silence is
 * the whole requirement here; what those lines say is
 * `src/auth/routes.test.ts`'s subject.
 */
const silentLogger = createLogger('auth-live-test', { level: 'silent' });

/**
 * Ids of the entries whose case ran, written as each one starts.
 *
 * Recorded from inside the case rather than off the loop that
 * declared it, which is the difference between a table the sweep was
 * written over and one it reached. Written before the entry runs, so
 * an entry whose rule is broken still counts as exercised — otherwise
 * one broken rule is reported twice, the second time as an entry
 * nothing covers.
 *
 * A set rather than a list, so two entries sharing an id arrive here
 * once and fail against a table carrying it twice.
 */
const EXERCISED_IDS = new Set<string>();

/**
 * Builds an app carrying one freshly built auth router over a store.
 *
 * A fresh router per call rather than one shared: the login limiter
 * counts against a store living on the middleware instance, so a
 * router shared between cases would make each one's remaining budget
 * a function of how many ran before it.
 *
 * `express.json()` is installed here because the router does not
 * install it — in the deployment `applyMiddleware` does, before any
 * router is mounted, which is the arrangement this reproduces.
 *
 * @param store - What the router acts against. The drizzle store, in
 *   every call this file makes.
 * @returns The app, with the router mounted at `/auth`.
 */
function buildLiveAuthApp(store: AuthStore): Application {
  const app = express();

  app.use(express.json());
  app.use('/auth', buildAuthRouter({
    store,
    clock: () => new Date(),
    ttlSeconds: SESSION_TTL_SECONDS,
    introspectSecret: INTROSPECT_SECRET,
    logger: silentLogger,
  }));

  return app;
}

/**
 * Asks `POST /auth/introspect` about a token, presenting the secret.
 *
 * @param app - The app to post to.
 * @param token - The bearer token to ask about.
 * @returns The supertest response.
 */
async function introspect(
  app: Application,
  token: string,
): Promise<request.Response> {
  return request(app)
    .post('/auth/introspect')
    .set('Authorization', `Bearer ${INTROSPECT_SECRET}`)
    .send({ token });
}

/**
 * Reads the token out of a login response.
 *
 * The throw is the vacuity guard, and what it guards against is a
 * misattributed failure rather than a silent pass. An absent token
 * reaches the next request as `{ token: undefined }`, a field
 * `JSON.stringify` drops — so introspection is handed a malformed
 * body and answers `400`, and the case is reported against the
 * endpoint that behaved correctly.
 *
 * The message carries the status and the field NAMES only. A response
 * that did carry a token carries a bearer credential, and a failure
 * message is not a place to put one.
 *
 * @param response - The response to a `POST /auth/login`.
 * @returns The token it carried.
 * @throws Error When the body carries no non-empty string token.
 */
function tokenFrom(response: request.Response): string {
  const token: unknown = (response.body as { token?: unknown }).token;

  if (typeof token !== 'string' || token === '') {
    const keys = Object.keys(response.body as object)
      .sort()
      .join(', ');

    throw new Error(
      '[auth-live] expected a token from POST /auth/login, read status '
      + `${String(response.status)} with keys [${keys}]`,
    );
  }

  return token;
}

/**
 * The single row a live read was supposed to return.
 *
 * A read that came back empty breaks the case in its SETUP, where a
 * missing row and a wrong value otherwise read alike — so the refusal
 * names what was being read rather than leaving the assertions below
 * it to fail against an undefined.
 *
 * Read as the first element rather than by asserting the length: each
 * read here names one row, and a result carrying more is a different
 * finding than the one this helper is placed to report.
 *
 * @param rows - Whatever the read returned.
 * @param read - What was being read, quoted back in the refusal.
 * @returns Its single row, typed without the `undefined`
 *   `noUncheckedIndexedAccess` gives the index access.
 * @throws Error When the read returned no row at all.
 */
function oneRow<T>(rows: readonly T[], read: string): T {
  const row = rows[0];

  if (row === undefined) {
    throw new Error(
      `[auth-live] reading ${read} returned no row, so every `
      + 'assertion below it would be about nothing.',
    );
  }

  return row;
}

describeLivePg('auth store and operator path (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  // Built before the pool exists, which is the ordering the thunk in
  // `createDbAuthStore` is there for: `src/index.ts` builds the store
  // to hand to the bootstrap dependency and the verifier, and both
  // are arguments to the call that starts Postgres. Constructing it
  // here touches nothing — a store that resolved `db` eagerly would
  // capture an undefined and fail every case in this file, which is
  // this run's reading of that claim.
  const store: AuthStore = createDbAuthStore(() => db);

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);
    db = createLiveDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  // In front of the loop rather than left to it. A table that came
  // back empty generates no case at all, and a live block with
  // nothing in it is the whole contract going quiet against the
  // database — this is what names the list it went quiet over.
  it('declares at least one entry to run', () => {
    expect(AUTH_STORE_CONTRACT.length).toBeGreaterThan(0);
  });

  for (const entry of AUTH_STORE_CONTRACT) {
    // Named for the id and for what the entry stands for, so a
    // verbose run lists the contract itself and a new entry is
    // visible as a case that was collected rather than as a count
    // that moved. No body of its own: the entry asserts as it goes,
    // so a failure carries the rule that broke.
    it(`${entry.id} — ${entry.standsFor}`, async () => {
      EXERCISED_IDS.add(entry.id);

      await entry.run(store);
    });
  }

  // Asked of the run rather than of the loop. The cases are generated
  // from the table, so an id counted off the loop would be the table
  // compared against itself; counted off the cases that executed,
  // what is asserted is that every entry reached one — which is what
  // notices a sweep narrowed away from the table later on.
  it('runs a case for every entry the contract declares', () => {
    const exercised = [...EXERCISED_IDS].sort();
    const declared = AUTH_STORE_CONTRACT.map((each) => each.id).sort();

    expect(exercised).toEqual(declared);
  });

  it('bootstraps a credential, then logs in, introspects and out', async () => {
    const deps: AuthDeps = {
      now: () => new Date(),
      ttlSeconds: SESSION_TTL_SECONDS,
    };
    const app = buildLiveAuthApp(store);

    // The bootstrap, driven the way `createService` drives it: one
    // `start()` on the dependency `src/index.ts` orders behind the
    // Postgres one. Nothing else in this file writes a credential and
    // `resetTables` emptied the table above, so the row read back is
    // this call having run.
    await createAuthBootstrapDependency(store, deps, {
      user: BASIC_USER,
      password: BASIC_PASSWORD,
    }).start();

    const users = await db.select().from(authUsers);

    expect(users).toHaveLength(1);
    expect(users[0]?.username).toBe(BASIC_USER);
    expect(users[0]?.sub).toBe(BOOTSTRAPPED_SUBJECT);
    // What the column holds is argon2id PHC output, so the configured
    // password reached the table hashed. The inequality is the weaker
    // half and is here because the prefix alone would be satisfied by
    // a constant.
    expect(users[0]?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(users[0]?.passwordHash).not.toBe(BASIC_PASSWORD);

    const loggedIn = await request(app)
      .post('/auth/login')
      .send({ user: BASIC_USER, password: BASIC_PASSWORD });

    expect(loggedIn.status).toBe(200);
    // The whole key set, not the three fields: `token` is random and
    // cannot be part of a `toStrictEqual`, and a `tokenHash` or a
    // `passwordHash` arriving by spread is caught by nothing else.
    expect(Object.keys(loggedIn.body as object).sort())
      .toEqual(['expiresAt', 'sub', 'token']);
    // The subject the bootstrap derived, on the wire. A login served
    // against a credential nothing here wrote could not answer this.
    expect(loggedIn.body.sub).toBe(BOOTSTRAPPED_SUBJECT);

    const token = tokenFrom(loggedIn);
    const minted = oneRow(
      await db.select().from(authSessions),
      'auth_sessions after the login',
    );
    const persisted = JSON.stringify(minted);

    expect(minted.tokenHash).toBe(hashSessionToken(token));
    // The control first: a serialisation carrying nothing satisfies
    // the absence below on its own, and the digest is the one value
    // in the row derived from the token.
    expect(persisted).toContain(minted.tokenHash);
    expect(persisted).not.toContain(token);
    expect(minted.revokedAt).toBeNull();

    const active = await introspect(app, token);

    expect(active.status).toBe(200);
    expect(active.body).toStrictEqual({
      active: true,
      sub: BOOTSTRAPPED_SUBJECT,
    });

    const loggedOut = await request(app)
      .post('/auth/logout')
      .send({ token });

    expect(loggedOut.status).toBe(200);
    expect(loggedOut.body).toStrictEqual({ ok: true });

    const revoked = oneRow(
      await db.select().from(authSessions),
      'auth_sessions after the logout',
    );

    // Stamped by the database rather than supplied here, which is the
    // reading this file adds over the in-memory run: nothing in the
    // case carries an instant, and the revoke wrote `now()`.
    expect(revoked.revokedAt).toBeInstanceOf(Date);
    // The revoke moved that column and no other. A row rewritten
    // wholesale would answer the same `{ ok: true }` above.
    expect(revoked.tokenHash).toBe(minted.tokenHash);
    expect(revoked.expiresAt.getTime()).toBe(minted.expiresAt.getTime());

    const inactive = await introspect(app, token);

    expect(inactive.status).toBe(200);
    expect(inactive.body).toStrictEqual({ active: false });
  });
});
