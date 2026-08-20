/**
 * Live-Postgres harness — the isolated-vs-live seam of this template.
 *
 * The default `bun run test` never touches a database: this module exports a
 * `describeLivePg` that is `describe.skip` unless AR_LIVE_DATABASE_URL
 * is set (which `bun run test:live` does, pointing at the `postgres-live`
 * compose service). Live files self-skip rather than fail — they assert
 * properties of the SERVER, so a dev without the stress profile up has
 * broken nothing.
 *
 * The explicit type annotation on `describeLivePg` is load-bearing: inferred,
 * the `describe.skip | describe` union resolves to unnameable vitest-internal
 * types and `tsc --noEmit` fails repo-wide (TS2742/TS4023).
 *
 * assertLiveDatabase guards BOTH destructive helpers rather than a single
 * call site, so a future test inherits the protection: dev is
 * `…:5432/ar` WITH a persistent volume, live is `…:5433/ar_live`
 * — one digit and one name apart. A copy-pasted URL yields a WORKING
 * connection to dev, and the TRUNCATE below would destroy local data
 * permanently. The guard queries current_database() and refuses anything
 * but `ar_live`.
 *
 * Schema comes from running the real `drizzle/*.sql` migrations (not a
 * schema push) — a push produces the right tables while never executing the
 * migration, exactly the gap that lets a broken one reach a deployment.
 * Isolation is TRUNCATE between cases, not wrap-in-a-transaction: the code
 * under test may itself use transactions, and nesting turns its COMMIT into
 * a savepoint release with different visibility rules.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { describe } from 'vitest';

import * as schema from '../../src/db/schema.js';

export const LIVE_DATABASE_URL = process.env['AR_LIVE_DATABASE_URL'];

export const describeLivePg: (name: string, fn: () => void) => void = LIVE_DATABASE_URL
  ? describe
  : describe.skip;

/** Tables the suite is allowed to truncate — a deliberate, literal list. */
const TABLES = [
  'benchmark_cases',
  'briefings',
  'categories',
  'connectors',
  'criteria',
  'documents',
  'domains',
  'entities',
  'entity_research',
  'export_subscriptions',
  'finding_labels',
  'finding_sightings',
  'findings',
  'ingested_files',
  'llm_calls',
  'personas',
  'research_pool',
  'runs',
  'sources',
  'terms',
  'topics',
  'users',
];

const LIVE_DB_NAME = 'ar_live';

export function createLivePool(): Pool {
  if (!LIVE_DATABASE_URL) {
    throw new Error('AR_LIVE_DATABASE_URL is not set — run via `bun run test:live`');
  }
  return new Pool({ connectionString: LIVE_DATABASE_URL, max: 8 });
}

export function createLiveDb(pool: Pool) {
  return drizzle({ client: pool, schema });
}

/** Refuses to proceed against any database except the live-test one. */
export async function assertLiveDatabase(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ current_database: string }>('SELECT current_database()');
  const name = rows[0]?.current_database;
  if (name !== LIVE_DB_NAME) {
    throw new Error(
      `[live-postgres] refusing to run destructive helpers against database "${name}" — expected "${LIVE_DB_NAME}". Check AR_LIVE_DATABASE_URL.`,
    );
  }
}

/**
 * Applies the real drizzle migrations, serialized across parallel callers
 * with a Postgres advisory lock (drizzle's migrator does an unlocked
 * check-then-write and concurrent callers race it into catalog errors).
 */
const MIGRATION_LOCK_KEY = 7_312_406_557;

export async function applyMigrations(pool: Pool): Promise<void> {
  await assertLiveDatabase(pool);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await migrate(createLiveDb(pool), { migrationsFolder: './drizzle' });
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

/** Truncates the suite's tables between cases. */
export async function resetTables(pool: Pool): Promise<void> {
  await assertLiveDatabase(pool);
  await pool.query(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}
