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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { describe } from 'vitest';

import * as schema from '../../src/db/schema.js';

export const LIVE_DATABASE_URL = process.env['AR_LIVE_DATABASE_URL'];

export const describeLivePg: (name: string, fn: () => void) => void = LIVE_DATABASE_URL
  ? describe
  : describe.skip;

/**
 * Tables the suite is allowed to truncate — a deliberate, literal list,
 * hand-maintained to hold one entry per table in `src/db/schema/`.
 *
 * Growing it from a single entry to all of them did not widen the blast
 * radius: what bounds the damage is the database this runs against, not
 * the number of tables named here. `assertLiveDatabase` still opens both
 * destructive helpers below, so against any database but `ar_live` it
 * throws before a statement is issued and this list is never read. A name
 * added here changes what a live run resets between its own cases, and
 * nothing else.
 *
 * Two things that scoping does not cover, so neither is read into it. The
 * guard compares `current_database()` and knows nothing about which server
 * holds it, so a second database named `ar_live` would pass. And it binds
 * the helpers below rather than SQL a case issues for itself on the pool
 * `createLivePool` hands it.
 */
const TABLES = [
  'auth_sessions',
  'auth_users',
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

/**
 * One entry of `drizzle/meta/_journal.json` — the file that decides
 * which migrations the migrator runs, and in what order.
 */
export interface MigrationJournalEntry {
  /** The migration's file stem, without the `.sql` extension. */
  readonly tag: string;

  /**
   * The millisecond stamp drizzle-kit wrote into the entry, and the
   * value its migrator stores as `created_at` on applying it.
   *
   * The only key the journal and the ledger share. The ledger keeps no
   * name, so a row there is attributable to a migration through this
   * and through nothing else.
   */
  readonly when: number;
}

const MIGRATION_JOURNAL = fileURLToPath(
  new URL('../../drizzle/meta/_journal.json', import.meta.url),
);

/**
 * The migrations the journal names, in the order it names them.
 *
 * Resolved from this file's own location rather than the working
 * directory, the way `tests/invariants/schema-sql.ts` resolves the
 * same directory. `applyMigrations` above hands the migrator a
 * cwd-relative `./drizzle`, which is right only while the suite is
 * started from the package; a reader keyed the same way would inherit
 * that for no gain.
 *
 * Throws rather than returning an empty list when the journal names
 * nothing. A comparison against `[]` passes for a database that has
 * applied no migration at all, which is the one answer a case
 * asserting they were applied must not accept.
 *
 * @param journalPath - Journal to read. Defaults to this package's
 * own; a caller passes one of its own only to reach the refusal
 * above, which is otherwise reachable only by emptying the package.
 * @returns The journal's entries, in journal order.
 */
export function readMigrationJournal(
  journalPath: string = MIGRATION_JOURNAL,
): readonly MigrationJournalEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(journalPath, 'utf8'));
  const { entries = [] } = parsed as { entries?: readonly MigrationJournalEntry[] };

  if (entries.length === 0) {
    throw new Error(
      `[live-postgres] ${journalPath} names no migration — a comparison against nothing would pass for any database.`,
    );
  }

  return entries;
}

/**
 * The migrations this database records as applied, named, in the order
 * the migrator applied them.
 *
 * Reads drizzle's own ledger — schema `drizzle`, table
 * `__drizzle_migrations`. Both are the migrator's defaults and
 * `applyMigrations` above overrides neither, so they are where it
 * writes; a drizzle that moved them fails this query loudly rather
 * than reporting an empty ledger.
 *
 * The ledger stores a stamp and no name, so each row is named back
 * through `readMigrationJournal`. A row whose stamp the journal does
 * not carry comes back as `unrecognized(<stamp>)` rather than being
 * dropped — a migration applied here and since removed from the
 * journal is a difference worth reporting, not one worth hiding.
 *
 * @param pool - Pool to read the ledger through.
 * @returns One tag per ledger row, in application order.
 */
export async function readAppliedMigrationTags(pool: Pool): Promise<readonly string[]> {
  const tagByWhen = new Map(
    readMigrationJournal().map((entry): [number, string] => [entry.when, entry.tag]),
  );
  const { rows } = await pool.query<{ created_at: string | null }>(
    'SELECT "created_at" FROM drizzle."__drizzle_migrations" ORDER BY "id"',
  );

  return rows.map((row) => tagByWhen.get(Number(row.created_at)) ?? `unrecognized(${row.created_at})`);
}

/** Truncates the suite's tables between cases. */
export async function resetTables(pool: Pool): Promise<void> {
  await assertLiveDatabase(pool);
  await pool.query(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}
