/**
 * The migrations under `drizzle/` apply against a real Postgres with
 * no error, this database carries every one the journal names, and the
 * rules they install hold against a write that breaks them. Self-skips
 * when AR_LIVE_DATABASE_URL is unset — run via:
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
 * those two read alone.
 *
 * The cases after them read the rules the migrations INSTALLED rather
 * than the record of their applying, and they need a server for the
 * same reason: a scan over `drizzle/*.sql` reports what the files say,
 * so a database the depth guard's migration never reached, or one
 * where the trigger was dropped at a psql prompt, reads exactly like
 * one where the rule holds. Only a refused write tells them apart.
 *
 * Each pins the refusal twice. The SQLSTATE is the class a caller
 * programs against, and the message is the only thing naming WHICH
 * rule refused — the depth guard raises `check_violation` from three
 * separate branches and two of them share a HINT, so a case asserting
 * the code alone passes on a neighbouring rule.
 */
import type { Pool } from 'pg';

import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { categories, domains } from '../../src/db/schema.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  readAppliedMigrationTags,
  readMigrationJournal,
  resetTables,
} from './live-postgres.js';

/**
 * What the pg driver puts on a rejected query, as far as these cases
 * read it. Drizzle wraps that error rather than rethrowing it, so
 * neither field is reachable on the error it hands back and both are
 * read off its `cause`.
 */
interface DriverError {
  /** Postgres SQLSTATE. `23514` for a check violation. */
  readonly code?: string;

  /** The server's own text, which for a trigger is its RAISE. */
  readonly message?: string;
}

/**
 * The key of the category refused for reaching UP — the one naming a
 * parent that is itself a child.
 *
 * Spelled once and used twice on purpose: the value goes into the
 * insert and comes back inside the message Postgres raises, so the two
 * cannot be written apart. Nothing is being converted between them,
 * which is what separates this from a fixture pair that has to be
 * written out by hand on both sides.
 */
const TWO_DEEP_KEY = 'two-levels-down';

/**
 * The key of the category refused for what is already UNDER it — the
 * root handed a parent while its own child stays where it is.
 *
 * Read back out of the refusal for the reason `TWO_DEEP_KEY` records
 * above, and it is the whole of what the message quotes about the
 * moved row: the guard names this row by key and its intended parent
 * by id, so nothing else in the setup has to be spelled twice.
 */
const ROOT_WITH_CHILD_KEY = 'root-with-a-child';

describeLivePg('schema migrations (live Postgres)', () => {
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

  it('refuses a category whose parent is itself a child', async () => {
    // Two levels is the one shape the shallow taxonomy does not admit,
    // and the `categories_enforce_depth()` trigger shipped by
    // `drizzle/0002_category_depth_guard.sql` is the whole of what
    // refuses it: depth is a property of the parent, so there is
    // nothing here for a column constraint to read.
    //
    // The child insert below is the near-miss the case rests on. The
    // same statement shape — a category naming an existing parent in
    // its own domain — is accepted one level down and refused two, so
    // what goes red here is the parent's depth and not the presence of
    // a parent.
    //
    // The parent has to EXIST for that to hold. A `parent_id` naming
    // no row leaves the trigger's lookup empty and falls through to
    // the foreign key, which refuses the insert as 23503 — a rejection
    // that reads the same from here while saying nothing about the
    // guard.
    const [domain] = await db.insert(domains)
      .values({ slug: 'depth-cap', name: 'Depth cap' })
      .returning({ id: domains.id });
    const [root] = await db.insert(categories)
      .values({ domainId: domain.id, key: 'root', name: 'Root', parentId: null })
      .returning({ id: categories.id });
    const [child] = await db.insert(categories)
      .values({ domainId: domain.id, key: 'child', name: 'Child', parentId: root.id })
      .returning({ id: categories.id });

    const failure = await db.insert(categories)
      .values({
        domainId: domain.id,
        key: TWO_DEEP_KEY,
        name: 'Two levels down',
        parentId: child.id,
      })
      .then(() => null, (thrown: unknown) => thrown);

    // Drizzle wraps the driver's error, so both halves sit on the
    // cause rather than on the error itself. The code is the class;
    // the message names the branch, and interpolating the two ids back
    // into it is what ties the refusal to the rows this case made
    // rather than to some row a neighbour left behind.
    expect(failure).toBeInstanceOf(Error);
    const { cause } = failure as { cause?: DriverError };
    expect(cause?.code).toBe('23514');
    expect(cause?.message).toBe(
      `categories: parent ${child.id} is itself a child of ${root.id}, so ${TWO_DEEP_KEY} would be two levels deep`,
    );
  });

  it('refuses giving a parent to a category that already has children', async () => {
    // The cap breaks from two ends and this is the end an INSERT
    // cannot reach: giving a root a parent pushes whatever sits under
    // it a level down without touching those rows, and the branch the
    // case above exercises reads the written row's PARENT rather than
    // its children, so it never sees them. On INSERT the id is fresh
    // from the sequence and nothing can point at it yet, which leaves
    // the UPDATE as the only statement that gets here.
    //
    // The new parent is a root on purpose. Hand this row a parent that
    // is itself a child and the depth branch refuses the very same
    // statement first — the case goes green having watched the
    // neighbouring rule, which is why the message and not the SQLSTATE
    // is what says which branch answered.
    //
    // The child below is the near-miss the case rests on. The same
    // UPDATE against a root with nothing under it is accepted, so what
    // goes red here is this row's children and not the act of giving a
    // root a parent.
    const [domain] = await db.insert(domains)
      .values({ slug: 'depth-cap-update', name: 'Depth cap (update)' })
      .returning({ id: domains.id });
    const [moved] = await db.insert(categories)
      .values({
        domainId: domain.id,
        key: ROOT_WITH_CHILD_KEY,
        name: 'Root with a child',
        parentId: null,
      })
      .returning({ id: categories.id });
    await db.insert(categories)
      .values({ domainId: domain.id, key: 'child', name: 'Child', parentId: moved.id });
    const [newParent] = await db.insert(categories)
      .values({ domainId: domain.id, key: 'other-root', name: 'Other root', parentId: null })
      .returning({ id: categories.id });

    const failure = await db.update(categories)
      .set({ parentId: newParent.id })
      .where(eq(categories.id, moved.id))
      .then(() => null, (thrown: unknown) => thrown);

    // Both halves sit on the cause for the reason the case above
    // records. The message is what separates this branch from the two
    // that share its SQLSTATE, and interpolating the parent id back
    // into it ties the refusal to the row this case made.
    expect(failure).toBeInstanceOf(Error);
    const { cause } = failure as { cause?: DriverError };
    expect(cause?.code).toBe('23514');
    expect(cause?.message).toBe(
      `categories: ${ROOT_WITH_CHILD_KEY} already has children, so parent ${newParent.id} would push them two levels deep`,
    );
  });
});
