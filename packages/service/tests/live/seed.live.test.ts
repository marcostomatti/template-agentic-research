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
 * What the first case reads is the counts the pass returns rather than
 * the rows it wrote. Those are the operator-facing half —
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
 * that already carries them. The second case asks both of a repeat: it
 * seeds, counts the stored rows, hands the same bundle over again, and
 * holds the tallies that pass returns and the row counts either side
 * of it against what the files carry.
 *
 * Two guards sit ahead of the comparisons in both of those cases and
 * neither is decoration. No file schema carries a non-empty floor, so
 * a `data/` whose every file held an empty list loads clean and a pass
 * over it creates nothing — against an expectation derived from those
 * same files, which expects nothing. The roster count in front of that
 * guard is what keeps it honest: an emptied roster leaves it nothing
 * to filter, and an empty list equals an empty list whatever the files
 * hold.
 *
 * The empty database the first case is named for is read back rather
 * than assumed. `resetTables` truncates the tables
 * `tests/live/live-postgres.ts` names before each case, and one
 * dropped from that list leaves rows the pass then reports as
 * unchanged — a red naming the pass, where what went is the reset. The
 * second case reads its own precondition the same way, and needs to:
 * an identity between two row counts is satisfied by two zeros, so the
 * count taken after the first pass is held against the rows the bundle
 * carries before the repeat is asked for.
 *
 * Every one of those comparisons is over a count, though, and a count
 * cannot see inside a row: a pass that created each row the bundle
 * names and left every payload empty satisfies the tallies and the row
 * counts alike. The third case reads a payload back — the verdict
 * vocabulary `data/domains.json` states for `example-tech-radar` — and
 * holds it against `DEFAULT_VERDICT_VOCABULARY` in
 * `src/db/schema/values.ts` rather than against the file the pass was
 * handed, so its two sides are two artifacts and not one file compared
 * with itself. Nothing in the database holds either to the other:
 * `finding_labels.verdict` carries no CHECK, deliberately, because the
 * ladder is a per-domain setting a domain is entitled to rename.
 *
 * Three decisions in it are worth naming. The constant is a
 * `readonly string[]` with no floor under it and the seed writes the
 * same four out by hand, so a list emptied on both sides compares
 * equal and the non-empty guard in front is the only thing between
 * that state and a green case. The slug is written out rather than
 * read off the bundle, since read off it makes the case about
 * whichever domain the bundle happens to carry. And the row is read
 * back under that slug before its vocabulary is: the example renamed
 * across `data/` loads clean and seeds under the new slug, which
 * otherwise leaves the comparison with nothing to read and reports as
 * the setting having gone missing, where what moved is the row.
 */
import type { SeedBundle, SeedRowCounts } from '../../scripts/seed.js';
import type { Pool } from 'pg';

import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { applySeedBundle, loadSeedBundle, SEED_ROSTER } from '../../scripts/seed.js';
import { DEFAULT_VERDICT_VOCABULARY } from '../../src/db/schema/values.js';
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
 * The domain `data/domains.json` seeds, written out here rather than
 * read off the bundle.
 *
 * Read off, the case below asks about whichever domain the bundle
 * happens to carry. Written out, it asks about the worked example this
 * package ships — the same row today, and a claim that survives a
 * second domain being seeded beside it.
 */
const EXAMPLE_DOMAIN_SLUG = 'example-tech-radar';

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
 * What the seeded tables hold once a pass has applied a bundle they
 * held none of: one row per row the bundle carries, a concern at a
 * time.
 *
 * Keyed the way `NO_ROWS_STORED` is and derived the way `allCreated`
 * below is, so it is the stored rows that have to follow `data/` and
 * never the other way about. It serves a precondition rather than a
 * subject: the case reading it compares two row counts to each other,
 * and this is what stops them being two zeros.
 *
 * @param bundle - Every concern's rows, as `loadSeedBundle` returns
 * them.
 * @returns The row count each concern's table should hold.
 */
function rowsStoredFor(bundle: SeedBundle): Record<string, number> {
  return Object.fromEntries(
    SEED_CONCERNS.map((concern): [string, number] => [
      concern,
      (bundle[concern] ?? []).length,
    ]),
  );
}

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

/**
 * The counts a concern reports when every row it carries is already
 * stored as the file states it.
 *
 * Derived from the same rows `allCreated` counts and for the reason
 * recorded there. Its own half is which tally those rows land under: a
 * pass that read each stored row and found nothing to write reports
 * them unchanged, where one that rewrote them all reports the same
 * count as updated.
 *
 * @param rows - The concern's rows, as the bundle carries them.
 * @returns Every row unchanged, and none created or updated.
 */
function allUnchanged(rows: readonly unknown[]): SeedRowCounts {
  return { created: 0, updated: 0, unchanged: rows.length };
}

/**
 * What each concern's table holds, counted a concern at a time.
 *
 * One statement rather than five, so every count is read at one
 * instant, and aliased by concern rather than by table so the row it
 * returns compares straight against `NO_ROWS_STORED` and
 * `rowsStoredFor`. A concern the roster gains and this query does not
 * count is then a key missing from one side of that comparison rather
 * than a table nobody looked at.
 *
 * Hands back the whole list rather than the one row in it, for the
 * reason `tests/live/schema.live.test.ts` records: destructuring an
 * empty result yields undefined and a case dies on a property access
 * instead of on an assertion.
 *
 * @param db - An open database.
 * @returns The single row the query returned, in the list it came back
 * in.
 */
async function storedRowCounts(
  db: ReturnType<typeof createLiveDb>,
): Promise<readonly Record<string, unknown>[]> {
  const stored = await db.execute(sql`
    select
      (select count(*) from ${domains})::int as "domains",
      (select count(*) from ${personas})::int as "personas",
      (select count(*) from ${categories})::int as "categories",
      (select count(*) from ${terms})::int as "terms",
      (select count(*) from ${topics})::int as "topics"
  `);

  return stored.rows;
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
    expect(await storedRowCounts(db)).toStrictEqual([NO_ROWS_STORED]);

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

  it('reports nothing created on a second pass and moves no row count', async () => {
    // The pass `bun run db:seed` runs every time after the first, and
    // what an operator wants of it is that running it again was not an
    // edit. It is also the only pass that asks whether a natural key
    // finds the row it was chosen for: a first pass writes the same
    // rows whether or not it could ever read them back, so a key
    // naming the wrong thing costs nothing until a second pass goes
    // looking.
    const bundle = loadSeedBundle();
    const emptyConcerns = SEED_CONCERNS
      .filter((concern) => (bundle[concern] ?? []).length === 0)
      .map((concern) => SEED_ROSTER[concern].file);

    // The two guards the module header argues for, here for the
    // sharper reason: an empty `data/` settles every comparison below
    // by making both of its sides nothing, and an identity between two
    // nothings holds however the pass behaved.
    expect(SEED_CONCERNS.length).toBeGreaterThan(0);
    expect(emptyConcerns).toEqual([]);

    await applySeedBundle(db, bundle);

    // The state the repeat is measured against, read back rather than
    // assumed and held against the files. A first pass that wrote
    // nothing would leave the counts either side of the second one
    // identical too — and report a database nobody seeded as
    // idempotent.
    const afterFirst = await storedRowCounts(db);

    expect(afterFirst).toStrictEqual([rowsStoredFor(bundle)]);

    const counts = await applySeedBundle(db, bundle);

    // Pinned as the whole shape rather than at the zero this case is
    // named for. A pass that rewrote every row it was handed reports
    // nothing created just as readily as one that read each stored row
    // and found nothing to write, and only `updated: 0` tells the two
    // apart — which is the claim `applySeedBundle`'s
    // compare-before-write exists to make, and the one no row count
    // can see.
    //
    // Compared whole for the reason the first case records: the key
    // sets are compared with the tallies, so a concern the roster
    // names that the pass never reports is a failure here.
    expect(counts).toStrictEqual(Object.fromEntries(
      SEED_CONCERNS.map((concern): [string, SeedRowCounts] => [
        concern,
        allUnchanged(bundle[concern] ?? []),
      ]),
    ));

    // The tallies above are the pass's account of itself; this is the
    // state. Nothing in the pass ties the two: an outcome is recorded
    // where each write is decided, so tallies that are right about
    // what the pass meant to do and wrong about what it did read as
    // idempotent from the return value alone.
    //
    // What this does not cover is the half the tallies do: two
    // identical row counts are equally satisfied by a pass that
    // rewrote every row in place, which moves each `updated_at` and no
    // count anywhere.
    expect(await storedRowCounts(db)).toStrictEqual(afterFirst);
  });

  it('stores the default verdict vocabulary in the example domain settings', async () => {
    // The constant the comparison below is against, held to having
    // members. It is a `readonly string[]` with no floor under it and
    // the seed writes the same four out by hand, so a list emptied on
    // both sides compares equal, and every assertion after this one
    // then holds for a domain configured with no verdicts at all.
    expect(DEFAULT_VERDICT_VOCABULARY.length).toBeGreaterThan(0);

    await applySeedBundle(db, loadSeedBundle());

    // Read back as lists rather than as a row, so the count comes with
    // each member: a domain the pass never wrote reports as a list
    // that came back empty, where a destructured row would yield
    // undefined and die on a property access instead of on a claim.
    const stored = await db.select({
      slug: domains.slug,
      settings: domains.settings,
    })
      .from(domains)
      .where(eq(domains.slug, EXAMPLE_DOMAIN_SLUG));

    // The precondition first. The example renamed across `data/` loads
    // clean and seeds a domain under the new slug, which leaves the
    // vocabulary below read off nothing — and reddens that comparison
    // as the setting having gone missing, where what moved is the row.
    // The wrong diagnosis, in the one place a reader would act on it.
    expect(stored.map((row) => row.slug)).toStrictEqual([EXAMPLE_DOMAIN_SLUG]);

    // Two artifacts, neither derived from the other: the stored list
    // came out of `data/domains.json` through the pass, the
    // expectation out of `src/db/schema/values.ts`, and the seed is
    // held to the constant nowhere else. Compared in ORDER, which
    // `toStrictEqual` over two arrays does, because a vocabulary is a
    // ladder rather than a set.
    expect(stored.map((row) => row.settings.verdictVocabulary))
      .toStrictEqual([DEFAULT_VERDICT_VOCABULARY]);
  });
});
