/**
 * The migrations under `drizzle/` apply against a real Postgres with
 * no error, and this database carries every one the journal names.
 * Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * This is the half `tests/invariants/schema-sql.test.ts` cannot reach:
 * that suite reads `drizzle/*.sql` as text, so it reports what the
 * files say, and whether the statements RUN is a question only a
 * server answers.
 *
 * Where it gets answered is `applyMigrations` in the hook below —
 * against a fresh live container that executes every statement, and a
 * migration that does not apply reddens this file before a case is
 * reached. The cases assert what it left behind, and they read the
 * migrator's LEDGER rather than the absence of a throw for a reason
 * worth stating: the migrator issues nothing against a database that
 * already carries every migration, which is every run after the first
 * against a container still up, so a case that only awaited the call
 * would pass without a statement having been executed. The ledger is
 * what says the migrations were applied at all — and applied by the
 * migrator, rather than the tables having been produced by a schema
 * push, which is the gap `tests/live/live-postgres.ts` is written
 * around.
 *
 * `resetTables` names the schema's own tables and never the `drizzle`
 * schema the ledger lives in, so the reset between cases leaves what
 * these cases read alone.
 */
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import {
  applyMigrations,
  createLivePool,
  describeLivePg,
  readAppliedMigrationTags,
  readMigrationJournal,
  resetTables,
} from './live-postgres.js';

describeLivePg('schema migrations (live Postgres)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  it('records every migration the journal names, in journal order', async () => {
    // Both sides are derived rather than written down here: the
    // journal is what the migrator reads, the ledger is what it wrote.
    // Comparing them by TAG rather than by count is what names the
    // migration that never applied, and what reports a ledger row the
    // journal no longer carries instead of letting two differences
    // cancel into a matching total.
    const expected = readMigrationJournal().map((entry) => entry.tag);
    const applied = await readAppliedMigrationTags(pool);

    expect(applied).toEqual(expected);
  });

  it('re-applies against ar_live with no error and adds no ledger row', async () => {
    // The migrator writes a ledger row in the same transaction that
    // runs the migration's own statements, so an unchanged ledger is
    // what says nothing was re-issued rather than that a re-issue
    // happened to survive.
    const before = await readAppliedMigrationTags(pool);

    await expect(applyMigrations(pool)).resolves.toBeUndefined();

    const after = await readAppliedMigrationTags(pool);
    expect(after).toEqual(before);
  });
});
