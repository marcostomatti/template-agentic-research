/**
 * The seed pipeline's apply pass against a real Postgres:
 * `applySeedBundle` handed the bundle this package ships, writing to a
 * database that holds none of it. Self-skips when AR_LIVE_DATABASE_URL
 * is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * `tests/seed/seed-validation.test.ts` covers everything the pipeline
 * does without a server — reading `data/`, holding every file to the
 * schema that names it, resolving the references across them, and
 * watching a refused bundle open no connection at all. What it stops
 * at is a database double. Everything past that point is statements:
 * an upsert per row against a natural key, a read under that key ahead
 * of each write, and one transaction around all of them. Whether those
 * keys are keys, and what a database holding none of these rows does
 * when it is handed them, are questions only a server answers.
 *
 * What the case reads is the counts the pass returns rather than the
 * rows it wrote. Those are the operator-facing half —
 * `formatSeedSummary` renders them and `bun run db:seed` prints that
 * block — and `created` among them is a claim about the database
 * rather than about the file: the pass reads the row under its natural
 * key first, and reports a row created only where that read came back
 * with nothing.
 *
 * A count is still the pass's own account of itself. It says what each
 * write was decided to be and not what the tables ended up holding, so
 * reading the rows back is a separate question — and a pass over a
 * database holding none of them says nothing about a pass over one
 * that already carries them.
 *
 * Two guards sit ahead of the comparison and neither is decoration. No
 * file schema carries a non-empty floor, so a `data/` whose every file
 * held an empty list loads clean and a pass over it creates nothing —
 * against an expectation derived from those same files, which expects
 * nothing. The roster count in front of that guard is what keeps it
 * honest: an emptied roster leaves it nothing to filter, and an empty
 * list equals an empty list whatever the files hold.
 *
 * The empty database the case is named for is read back rather than
 * assumed. `resetTables` truncates the tables
 * `tests/live/live-postgres.ts` names before each case, and one
 * dropped from that list leaves rows the pass then reports as
 * unchanged — a red naming the pass, where what went is the reset.
 */
import type { SeedRowCounts } from '../../scripts/seed.js';
import type { Pool } from 'pg';

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { applySeedBundle, loadSeedBundle, SEED_ROSTER } from '../../scripts/seed.js';
import { categories, domains, personas, terms, topics } from '../../src/db/schema.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * Every concern the roster names, which is every concern a pass
 * reports on.
 *
 * Read off `SEED_ROSTER` rather than listed here, so a concern added
 * to it is one this file covers rather than one it never hears about.
 */
const SEED_CONCERNS = Object.keys(SEED_ROSTER) as (keyof typeof SEED_ROSTER)[];

/**
 * What the seeded tables hold before a first pass: no rows, a concern
 * at a time.
 *
 * Keyed by concern rather than by table, so it is the query below that
 * has to name the table each concern writes and this expectation that
 * says which concerns were asked about. A concern the roster gains and
 * the query does not count is then a missing key here rather than a
 * silent gap.
 */
const NO_ROWS_STORED = Object.fromEntries(
  SEED_CONCERNS.map((concern): [string, number] => [concern, 0]),
);

/**
 * The counts a concern reports when the database held none of its
 * rows.
 *
 * Derived from the rows the file carries rather than written out, so
 * the expectation moves with `data/` and the case goes on asking what
 * it was written to ask once a term is added. The two sides stay
 * independent for all that: this counts what came off disk, and the
 * pass counts what it did with each row.
 *
 * @param rows - The concern's rows, as the bundle carries them.
 * @returns Every row created, and none updated or unchanged.
 */
function allCreated(rows: readonly unknown[]): SeedRowCounts {
  return { created: rows.length, updated: 0, unchanged: 0 };
}

describeLivePg('seed apply pass (live Postgres)', () => {
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

  it('reports every concern as created on a first pass', async () => {
    // Seeding a database that holds none of these rows is what
    // `bun run db:seed` does on a machine being set up, and it is the
    // one pass where every natural key resolves to nothing. Which
    // makes it the pass that exercises those keys: an upsert naming
    // columns that are no unique key of the table is refused outright,
    // so a conflict target drifting from what `src/db/schema/`
    // declares fails here rather than quietly writing something else.
    const bundle = loadSeedBundle();
    const emptyConcerns = SEED_CONCERNS
      .filter((concern) => (bundle[concern] ?? []).length === 0)
      .map((concern) => SEED_ROSTER[concern].file);

    // The guards the module header argues for. A `data/` emptied to
    // five empty lists loads clean and creates nothing, against an
    // expectation of nothing; the roster count is what stops the
    // filter above passing because it had nothing to filter.
    expect(SEED_CONCERNS.length).toBeGreaterThan(0);
    expect(emptyConcerns).toEqual([]);

    // The empty database, read back rather than assumed. `created` is
    // a claim about what the tables held before the pass, so a reset
    // reaching some of them and not others reports below as the pass
    // having failed to create — the wrong diagnosis in the one place a
    // reader would act on it.
    //
    // Read as the whole returned list for the reason
    // `tests/live/schema.live.test.ts` records: destructuring an empty
    // one yields undefined and the case dies on a property access
    // instead of on an assertion.
    const stored = await db.execute(sql`
      select
        (select count(*) from ${domains})::int as "domains",
        (select count(*) from ${personas})::int as "personas",
        (select count(*) from ${categories})::int as "categories",
        (select count(*) from ${terms})::int as "terms",
        (select count(*) from ${topics})::int as "topics"
    `);

    expect(stored.rows).toStrictEqual([NO_ROWS_STORED]);

    const counts = await applySeedBundle(db, bundle);

    // Both sides are derived, and from different places. The
    // expectation counts the rows each file carries; the counts come
    // back from a pass that read and wrote each of them. Neither is
    // written down here, and neither derives from the other.
    //
    // The whole object rather than a concern at a time, so the key
    // sets are compared as well: a concern the roster names that the
    // pass never reports, and one the pass reports that the roster
    // does not name, are each a failure here.
    expect(counts).toStrictEqual(Object.fromEntries(
      SEED_CONCERNS.map((concern): [string, SeedRowCounts] => [
        concern,
        allCreated(bundle[concern] ?? []),
      ]),
    ));
  });
});
