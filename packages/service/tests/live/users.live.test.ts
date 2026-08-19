/**
 * Live repository round-trip against the real Postgres in the stress
 * profile. Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 */
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { createUser, listUsers } from '../../src/db/users.js';

import {
  applyMigrations,
  assertLiveDatabase,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

describeLivePg('users repository (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

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

  it('round-trips a user through the real schema', async () => {
    const created = await createUser(db, 'live@example.dev');
    expect(created).toMatchObject({ email: 'live@example.dev' });

    const all = await listUsers(db);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ email: 'live@example.dev' });
  });

  it('enforces the unique email constraint from the real migration', async () => {
    await createUser(db, 'dup@example.dev');
    // Drizzle wraps the pg error; the reliable signal is the Postgres
    // unique-violation code on the cause.
    const failure = await createUser(db, 'dup@example.dev').then(
      () => null,
      (e: unknown) => e,
    );
    expect(failure).toBeInstanceOf(Error);
    expect((failure as { cause?: { code?: string } }).cause?.code).toBe('23505');
  });

  it('db-guard: destructive helpers refuse a non-live database', async () => {
    // The same stress container's built-in `postgres` database is reachable
    // with the same credentials — the guard must reject it.
    const url = process.env['AR_LIVE_DATABASE_URL']!.replace(/\/ar_live$/, '/postgres');
    const { Pool: PgPool } = await import('pg');
    const wrongPool = new PgPool({ connectionString: url, max: 1 });
    try {
      await expect(assertLiveDatabase(wrongPool)).rejects.toThrow(/refusing/);
    } finally {
      await wrongPool.end();
    }
  });
});
