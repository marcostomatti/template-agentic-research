/**
 * The integration seed's apply pass against a real Postgres.
 *
 * `tests/seed/seed-integration-validation.test.ts` covers everything
 * `loadIntegrationBundle` does without a server: reading
 * `tests/fixtures/integration/`, holding every file to its schema,
 * and refusing a bundle whose references do not resolve against each
 * other. What it cannot cover is what only a live database answers —
 * whether the guard refuses a pool that is not `ar_live`, and whether
 * a reference that slips past that isolated validation (because it
 * was planted on a bundle already loaded, the way `seed-integration.ts`
 * says a hand-assembled bundle can be) rolls back every table the pass
 * had already written in the same transaction, not only the one whose
 * write failed.
 *
 * The clean-run cases close the loop `seed.live.test.ts` opened for
 * `db:seed`: on top of a migrated database that pass has already
 * seeded, one integration pass reports every fixture row created and
 * leaves the tables holding exactly that many, and a second pass over
 * the same bundle reports every row matched and moves no count.
 */
import type {
  IntegrationBundle,
  IntegrationCounts,
  IntegrationRowCounts,
} from '../../scripts/seed-integration.js';
import type { Pool } from 'pg';

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import {
  applyIntegrationBundle,
  loadIntegrationBundle,
} from '../../scripts/seed-integration.js';
import { applySeedBundle, loadSeedBundle } from '../../scripts/seed.js';
import {
  connectors,
  documents,
  entities,
  exportSubscriptions,
  findingLabels,
  findings,
  llmCalls,
  runs,
  sources,
} from '../../src/db/schema.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * A `documents.json` fixture id no row of the shipped bundle declares.
 * Planted onto a finding's `documentFixtureId` after the bundle has
 * already loaded, so the reference reaches `applyIntegrationBundle`
 * the way a hand-assembled bundle would rather than being caught by
 * `loadIntegrationBundle`'s own cross-file check.
 */
const DANGLING_DOCUMENT_ID = 999_999;

/**
 * Every table the integration pass writes, at zero rows — what each
 * holds before a first pass, and what a rolled-back pass must leave
 * them at, since the failure is planted on the last concern the pass
 * writes and a rollback that reached only some of the earlier tables
 * would still read as "every table" here.
 */
const NO_INTEGRATION_ROWS_STORED = {
  connectors: 0,
  sources: 0,
  entities: 0,
  documents: 0,
  findings: 0,
  findingLabels: 0,
  exportSubscriptions: 0,
  runs: 0,
  llmCalls: 0,
};

/**
 * What each fixture-backed table should hold once a bundle has been
 * applied whole: one row per row the bundle carries. `findingLabels`
 * is not a roster entry — its rows travel nested under `findings` —
 * so it is counted by summing each finding's `labels`.
 *
 * @param bundle - Every concern's rows, as `loadIntegrationBundle`
 * returns them.
 */
function rowsStoredFor(bundle: IntegrationBundle): Record<string, number> {
  return {
    connectors: bundle.connectors.length,
    sources: bundle.sources.length,
    entities: bundle.entities.length,
    documents: bundle.documents.length,
    findings: bundle.findings.length,
    findingLabels: bundle.findings.reduce(
      (sum, finding) => sum + finding.labels.length,
      0,
    ),
    exportSubscriptions: bundle.exportSubscriptions.length,
    runs: bundle.runs.length,
    llmCalls: bundle.llmCalls.length,
  };
}

/** Every row a concern carries, reported created and none matched. */
function allCreated(rows: number): IntegrationRowCounts {
  return { inserted: rows, matched: 0 };
}

/** Every row a concern carries, reported matched and none created. */
function allMatched(rows: number): IntegrationRowCounts {
  return { inserted: 0, matched: rows };
}

/**
 * The counts `applyIntegrationBundle` should report for a bundle, a
 * concern at a time, with `tally` deciding whether each concern's rows
 * are expected created (a first pass) or matched (a repeat).
 *
 * @param bundle - Every concern's rows.
 * @param tally - `allCreated` or `allMatched`.
 */
function expectedIntegrationCounts(
  bundle: IntegrationBundle,
  tally: (rows: number) => IntegrationRowCounts,
): IntegrationCounts {
  const stored = rowsStoredFor(bundle);

  return {
    connectors: tally(stored['connectors']!),
    sources: tally(stored['sources']!),
    entities: tally(stored['entities']!),
    documents: tally(stored['documents']!),
    findings: tally(stored['findings']!),
    findingLabels: tally(stored['findingLabels']!),
    exportSubscriptions: tally(stored['exportSubscriptions']!),
    runs: tally(stored['runs']!),
    llmCalls: tally(stored['llmCalls']!),
  };
}

/**
 * What every table the integration pass writes holds, read at one
 * instant. Hands back the whole list rather than the one row in it,
 * for the reason `tests/live/schema.live.test.ts` records: destructuring
 * an empty result yields undefined and a case dies on a property
 * access instead of on an assertion.
 *
 * @param db - An open database.
 */
async function storedIntegrationCounts(
  db: ReturnType<typeof createLiveDb>,
): Promise<readonly Record<string, unknown>[]> {
  const stored = await db.execute(sql`
    select
      (select count(*) from ${connectors})::int as "connectors",
      (select count(*) from ${sources})::int as "sources",
      (select count(*) from ${entities})::int as "entities",
      (select count(*) from ${documents})::int as "documents",
      (select count(*) from ${findings})::int as "findings",
      (select count(*) from ${findingLabels})::int as "findingLabels",
      (select count(*) from ${exportSubscriptions})::int as "exportSubscriptions",
      (select count(*) from ${runs})::int as "runs",
      (select count(*) from ${llmCalls})::int as "llmCalls"
  `);

  return stored.rows;
}

describeLivePg('integration seed apply pass (live Postgres)', () => {
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
    // Every fixture-backed table starts at zero, and the domain the
    // fixtures name exists to resolve against: `resolveDomains`
    // refuses a slug `db:seed` has not written before this pass
    // issues a single insert.
    await resetTables(pool);
    await applySeedBundle(db, loadSeedBundle());
  });

  it('refuses a pool on a database not named ar_live', async () => {
    // The same stress container's built-in `postgres` database is
    // reachable with the same credentials — the guard must reject it
    // before the pass builds anything to write through.
    const url = process.env['AR_LIVE_DATABASE_URL']!
      .replace(/\/ar_live$/, '/postgres');
    const { Pool: PgPool } = await import('pg');
    const wrongPool = new PgPool({ connectionString: url, max: 1 });

    try {
      await expect(applyIntegrationBundle(wrongPool, loadIntegrationBundle()))
        .rejects.toThrow(/refusing/);
    } finally {
      await wrongPool.end();
    }
  });

  it('rolls back every table when a planted reference resolves to nothing', async () => {
    // The precondition first: the id below names no document the
    // shipped fixtures declare, so planting it is a reference this
    // pass cannot resolve rather than one it happens to.
    const bundle = loadIntegrationBundle();
    const documentIds = bundle.documents.map((row) => row.fixtureId);

    expect(documentIds).not.toContain(DANGLING_DOCUMENT_ID);

    // Planted after loading, not written into the fixture file, so it
    // reaches `applyIntegrationBundle` the way a hand-assembled bundle
    // would rather than being caught by `loadIntegrationBundle`'s own
    // cross-file check — the gap `resolved()` exists to guard.
    const [firstFinding, ...restFindings] = bundle.findings;

    expect(firstFinding).toBeDefined();

    const broken: IntegrationBundle = {
      ...bundle,
      findings: [
        { ...firstFinding!, documentFixtureId: DANGLING_DOCUMENT_ID },
        ...restFindings,
      ],
    };

    // Connectors, sources, entities and documents are all written
    // ahead of findings in the pass's own order, so a run that reaches
    // this failure has already inserted rows into every one of them —
    // which is what makes the all-zero read below a rollback and not
    // an untouched database.
    await expect(applyIntegrationBundle(pool, broken)).rejects.toThrow(
      'which this pass has not written',
    );

    expect(await storedIntegrationCounts(db))
      .toStrictEqual([NO_INTEGRATION_ROWS_STORED]);
  });

  it('yields per-table counts equal to the fixture row counts on a clean run', async () => {
    const bundle = loadIntegrationBundle();

    // The guard the module header argues for: a fixture bundle emptied
    // on every file would satisfy every comparison below by making
    // both of its sides nothing.
    expect(Object.values(rowsStoredFor(bundle)).every((count) => count > 0))
      .toBe(true);

    const counts = await applyIntegrationBundle(pool, bundle);

    expect(counts).toStrictEqual(expectedIntegrationCounts(bundle, allCreated));
    expect(await storedIntegrationCounts(db))
      .toStrictEqual([rowsStoredFor(bundle)]);
  });

  it('leaves the counts unchanged on a second run', async () => {
    const bundle = loadIntegrationBundle();

    await applyIntegrationBundle(pool, bundle);

    const afterFirst = await storedIntegrationCounts(db);

    expect(afterFirst).toStrictEqual([rowsStoredFor(bundle)]);

    const counts = await applyIntegrationBundle(pool, bundle);

    // Every row found by its identity and rewritten with the fixture's
    // values, none inserted — the claim `matchOrInsert`'s
    // read-before-write exists to make, and the one no row count alone
    // can see.
    expect(counts).toStrictEqual(expectedIntegrationCounts(bundle, allMatched));
    expect(await storedIntegrationCounts(db)).toStrictEqual(afterFirst);
  });
});
