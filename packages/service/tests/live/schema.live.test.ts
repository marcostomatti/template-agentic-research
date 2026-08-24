/**
 * The migrations under `drizzle/` apply against a real Postgres with
 * no error, this database carries every one the journal names, and the
 * rules they install refuse a write that breaks them and admit one
 * that does not. Self-skips when AR_LIVE_DATABASE_URL is unset — run
 * via:
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
 * Each refusal is pinned twice. The SQLSTATE is the class a caller
 * programs against, and it names no rule of its own: the depth cap
 * and the approval gate both answer `check_violation`, and the hash
 * key answers `unique_violation` alongside every other unique key on
 * its table, so a case asserting the code alone passes on a
 * neighbouring rule. The second pin is what names WHICH rule refused,
 * and which field carries it follows from the mechanism. A CHECK and
 * a unique key both put their own constraint name on the error. A
 * trigger's RAISE leaves that field empty, so the depth cases pin the
 * message it raises instead — and they have to, since that guard
 * refuses from three separate branches and two of them share a HINT.
 *
 * An accepted write sits beside each set of refusals, and it is what
 * says where a rule stops. A guard that refused every category, or one
 * that silently dropped what it was handed, reddens the depth cases in
 * their SETUP rather than in an assertion, where a rejected query and
 * a missing row both read as a broken test and not as a finding. So
 * the shape a taxonomy is mostly made of is asserted on its own rather
 * than left standing as their precondition.
 *
 * The approval pair's accepted write answers a second question the
 * depth one cannot. It is the same UPDATE its refusal watched
 * rejected, aimed at a row that differs only in carrying an approval,
 * so accepting it is what pins that refusal to the row's state rather
 * than to the statement — which a refusal on its own cannot say.
 *
 * The hash key is read from both ends inside one case, because a
 * repeat capture meets it both ways: refused where nothing absorbs
 * it, and absorbed where the insert carries `ON CONFLICT DO NOTHING`,
 * which leaves the corpus as the first capture left it.
 *
 * What that pair does not reach is what the NOT NULL under the key
 * buys. Two non-null hashes conflict whichever way the column is
 * declared, so nothing it asserts would move were the hash nullable —
 * the defect that would cause appears only among rows whose hash is
 * absent, and these writes produce none. A control table shaped that
 * way, standing beside the real one, is what reproduces it, and it
 * lands here later in this phase.
 */
import type { Pool } from 'pg';

import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { categories, documents, domains, researchPool } from '../../src/db/schema.js';

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
 * none of these is reachable on the error it hands back and all are
 * read off its `cause`.
 */
interface DriverError {
  /**
   * Postgres SQLSTATE. `23514` for a check violation, `23505` for a
   * unique one.
   */
  readonly code?: string;

  /** The server's own text, which for a trigger is its RAISE. */
  readonly message?: string;

  /**
   * The constraint the refusal came from. A CHECK and a unique key
   * both name themselves here; a trigger's RAISE leaves it
   * undefined, which is why the depth cases pin `message` where the
   * approval and hash cases pin this.
   */
  readonly constraint?: string;
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

/**
 * The key of the category the guard must ADMIT — a root, naming no
 * parent at all.
 *
 * Spelled once and used twice for the reason `TWO_DEEP_KEY` records,
 * with the second use being the difference between this case and those
 * two: the value comes back out of the ROW rather than out of a
 * refusal, because what this case watches is a write Postgres
 * accepted.
 */
const ADMITTED_ROOT_KEY = 'a-root-of-its-own';

/**
 * The content hash both captures carry, and the whole of what makes
 * the second one a repeat.
 *
 * Spelled once and used across three writes — the capture that lands,
 * the repeat Postgres refuses, and the repeat the conflict clause
 * absorbs — because a repeat capture differing in its hash is not a
 * repeat at all. Nothing converts or derives it, so the three cannot
 * be written apart.
 */
const REPEATED_HASH = 'sha256:0f9d2c6b4a17e35810c2f4d9b6e0a7c3';

/**
 * The body of the capture that lands, and the one the corpus must
 * still hold at the end.
 *
 * It is what says the surviving row is the FIRST capture rather than
 * the repeat written over it: `ON CONFLICT DO UPDATE` is one word
 * from the clause under test and would have left
 * `REPEAT_CAPTURE_BODY` here instead.
 */
const FIRST_CAPTURE_BODY = 'The item as it first reached the corpus.';

/**
 * The body both repeat writes carry, and the one that must never be
 * stored.
 *
 * Different from the capture above on purpose. Two identical bodies
 * would leave the closing assertion passing whether the repeat was
 * absorbed or written over the row it conflicted with.
 */
const REPEAT_CAPTURE_BODY = 'The same item, reaching the corpus again.';

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

  it('accepts a root category, so the guard refuses only what it is meant to', async () => {
    // The two refusals above say what the guard stops. This says where
    // it stops, and it is the branch most of a taxonomy takes: a root
    // names no parent, so `categories_enforce_depth()` returns on its
    // first rule without a lookup and without a depth to measure.
    //
    // It is asserted here rather than left standing as a precondition
    // of those two, which each insert a root before reaching their
    // refusal. A guard that stopped admitting roots does redden them,
    // but in the setup and as a rejected query naming no constraint,
    // or as a TypeError over a row that never came back. Either reads
    // as a broken test rather than as the rule having changed.
    //
    // The returned row is the assertion, and not the absence of a
    // throw. A BEFORE ... FOR EACH ROW trigger that returns NULL
    // cancels the write for that row and raises nothing whatever:
    // SQLSTATE 00000, `INSERT 0 0`, and a table with nothing in it.
    // Awaiting the insert passes over that; the row coming back is
    // what rules it out.
    //
    // What this case does not say is that the guard is installed at
    // all. Detach the trigger and it goes on passing, because a table
    // with no guard admits a root too. Only the refusals above tell
    // those apart, which is why this sits beside them rather than
    // standing in for them.
    const [domain] = await db.insert(domains)
      .values({ slug: 'depth-cap-root', name: 'Depth cap (root)' })
      .returning({ id: domains.id });

    const inserted = await db.insert(categories)
      .values({
        domainId: domain.id,
        key: ADMITTED_ROOT_KEY,
        name: 'A root of its own',
        parentId: null,
      })
      .returning({ key: categories.key, parentId: categories.parentId });

    // One row, holding what it was handed. The count says the write
    // was not cancelled, and the NULL says the trigger left the column
    // it reads alone rather than filling it in on the way past.
    expect(inserted).toStrictEqual([{ key: ADMITTED_ROOT_KEY, parentId: null }]);
  });

  it('refuses stamping researched_at on a row nobody approved', async () => {
    // The approval gate as a rule the database holds: a row may record
    // that it was closed only if it already records that it was
    // approved. Both columns belong to the row being written, so
    // `research_pool_approval_check` carries it as a plain CHECK
    // generated out of `src/db/schema/entities.ts` — where the depth
    // cap above, whose rule is about rows other than the written one,
    // needed a trigger.
    //
    // The insert below is the near-miss the case rests on. Both
    // timestamps NULL is the open state every row is raised in and the
    // same CHECK admits it, so what goes red here is the pair the
    // UPDATE would leave behind and not the act of writing the column.
    //
    // An UPDATE rather than an INSERT because that is the path a drain
    // takes — a row is raised open and closed later — and not because
    // the statement kind matters. What is refused is a state, so the
    // same pair is refused however the row arrives at it.
    const [domain] = await db.insert(domains)
      .values({ slug: 'approval-gate', name: 'Approval gate' })
      .returning({ id: domains.id });
    const [queued] = await db.insert(researchPool)
      .values({ domainId: domain.id })
      .returning({ id: researchPool.id, approvedAt: researchPool.approvedAt });

    // The precondition this case is named for, read back rather than
    // inferred. Give the column a default and the UPDATE below is
    // accepted; without this that reports as the CHECK having gone
    // rather than as the row having arrived approved.
    expect(queued.approvedAt).toBeNull();

    const failure = await db.update(researchPool)
      .set({ researchedAt: new Date() })
      .where(eq(researchPool.id, queued.id))
      .then(() => null, (thrown: unknown) => thrown);

    // Both halves sit on the cause for the reason the depth cases
    // record. The constraint name is what separates this rule from
    // `research_pool_status_check`, which sits on the same table and
    // answers with the same SQLSTATE — and unlike the text a trigger
    // raises, it is a name this repository chose rather than the
    // server's own prose.
    expect(failure).toBeInstanceOf(Error);
    const { cause } = failure as { cause?: DriverError };
    expect(cause?.code).toBe('23514');
    expect(cause?.constraint).toBe('research_pool_approval_check');
  });

  it('accepts stamping researched_at once approved_at is set', async () => {
    // Where `research_pool_approval_check` stops — and, unlike the
    // root-category case above, a state-removal control as well. This
    // is the identical UPDATE the case before it watched refused,
    // aimed at a row differing only in carrying an approval, so
    // accepting it here is what pins that refusal to the row's STATE
    // rather than to the act of writing the column. A rule refusing
    // every write of `researched_at` whatever else the row held would
    // have reddened nothing above.
    //
    // The approval is a separate UPDATE rather than a column set at
    // the insert, so the two cases differ by one statement instead of
    // by how the row arrived. The CHECK reads the whole NEW row on
    // every write either way, so what it admits here is the pair it
    // refused above with one member filled in.
    //
    // The returned row is the assertion for the reason the
    // root-category case records, though not for its mechanism: no
    // CHECK cancels a write in silence, but an UPDATE whose WHERE
    // matches nothing resolves exactly like one that wrote, so
    // awaiting the call passes over a setup that never landed. Both
    // timestamps come back because the state admitted is the pair
    // rather than either half of it.
    //
    // What it does not say is that the constraint is installed, for
    // that case's reason about its own guard: a table carrying no such
    // rule takes this pair too. Only the refusal above tells the two
    // apart.
    const [domain] = await db.insert(domains)
      .values({ slug: 'approval-gate-closed', name: 'Approval gate (closed)' })
      .returning({ id: domains.id });
    const [queued] = await db.insert(researchPool)
      .values({ domainId: domain.id })
      .returning({ id: researchPool.id });

    // Two distinct instants rather than one reused clock reading. Each
    // column is read back to the value its OWN statement wrote, so a
    // write landing in the wrong column fails here instead of
    // matching.
    const approvedAt = new Date('2026-03-01T09:00:00.000Z');
    const researchedAt = new Date('2026-03-02T09:00:00.000Z');

    const approved = await db.update(researchPool)
      .set({ approvedAt })
      .where(eq(researchPool.id, queued.id))
      .returning({ approvedAt: researchPool.approvedAt });

    // The approval, read back rather than assumed. An UPDATE matching
    // no row resolves like one that wrote, so without this the close
    // below runs against a row still open and is refused — a red
    // reporting the CHECK as gone when what failed was this statement.
    // Read as the whole returned list for the same reason:
    // destructuring an empty one yields undefined and the case dies on
    // a property access instead of on an assertion.
    expect(approved).toStrictEqual([{ approvedAt }]);

    const closed = await db.update(researchPool)
      .set({ researchedAt })
      .where(eq(researchPool.id, queued.id))
      .returning({
        approvedAt: researchPool.approvedAt,
        researchedAt: researchPool.researchedAt,
      });

    // One row, holding both stamps. The count says the UPDATE reached
    // the row rather than none, and the pair is the state the CHECK
    // admitted: `approved_at` still where the approval put it,
    // `researched_at` now beside it.
    expect(closed).toStrictEqual([{ approvedAt, researchedAt }]);
  });

  it('refuses a second document under a stored hash, and DO NOTHING adds no row', async () => {
    // One row per distinct item is `documents_hash_unique`'s doing,
    // and these are the two ways a repeat capture meets it. Content
    // reaching the corpus twice is not a second item — a second source
    // carries it, a poll overlaps the one before it, a file is handed
    // in again — and deduplicating on the content itself absorbs all
    // three without any reader having to know which happened.
    //
    // The first capture below is the near-miss the case rests on. The
    // same statement shape is accepted under a hash the corpus does
    // not hold and refused under one it does, so what goes red here is
    // the repeat rather than the act of storing a document.
    //
    // The constraint name is the second pin for a reason present on
    // this table rather than a future one. `documents_pkey` answers
    // the same SQLSTATE, so an insert supplying a key the sequence
    // already issued reads from here exactly like a repeated hash
    // while saying nothing whatever about the corpus.
    const [domain] = await db.insert(domains)
      .values({ slug: 'hash-dedupe', name: 'Hash dedupe' })
      .returning({ id: domains.id });
    const captured = await db.insert(documents)
      .values({ domainId: domain.id, hash: REPEATED_HASH, body: FIRST_CAPTURE_BODY })
      .returning({ hash: documents.hash });

    // The capture the two writes below repeat, read back rather than
    // assumed. Read as the whole returned list for the reason the
    // approval case records: destructuring an empty one yields
    // undefined and the case dies on a property access instead of on
    // an assertion.
    expect(captured).toStrictEqual([{ hash: REPEATED_HASH }]);

    const failure = await db.insert(documents)
      .values({ domainId: domain.id, hash: REPEATED_HASH, body: REPEAT_CAPTURE_BODY })
      .then(() => null, (thrown: unknown) => thrown);

    // Both halves sit on the cause for the reason the depth cases
    // record. The constraint name is what separates this key from
    // `documents_pkey` above it, and unlike the text a trigger raises
    // it is a name this repository chose — named explicitly on the
    // column so the static-SQL invariant suite could grep for it, so
    // it moves only in a diff.
    expect(failure).toBeInstanceOf(Error);
    const { cause } = failure as { cause?: DriverError };
    expect(cause?.code).toBe('23505');
    expect(cause?.constraint).toBe('documents_hash_unique');

    // The write a repeat capture actually makes. Naming the target
    // rather than leaving the clause bare is what keeps it narrow: a
    // conflict on any OTHER key of this table is then raised rather
    // than swallowed, so the clause absorbs the repetition capture is
    // allowed to have and nothing else.
    //
    // An empty RETURNING is the statement's own account of itself, and
    // it is what says the clause fired. Had it not fired the insert
    // would have proceeded and the row would be in that list — which
    // is exactly what a nullable hash would cost, since NULL conflicts
    // with nothing, another NULL included.
    const absorbed = await db.insert(documents)
      .values({ domainId: domain.id, hash: REPEATED_HASH, body: REPEAT_CAPTURE_BODY })
      .onConflictDoNothing({ target: documents.hash })
      .returning({ hash: documents.hash });

    expect(absorbed).toStrictEqual([]);

    const stored = await db.select({ hash: documents.hash, body: documents.body })
      .from(documents);

    // The corpus read back, which is the claim in its own terms rather
    // than in the statement's: one item, one row. `resetTables`
    // truncated the table before this case, so this list is all of it.
    //
    // The body is the half RETURNING cannot give. It says the row that
    // survived is the capture that landed first and not a repeat
    // written over it — which is what `ON CONFLICT DO UPDATE`, one
    // word from the clause above, would have left here instead.
    expect(stored).toStrictEqual([{ hash: REPEATED_HASH, body: FIRST_CAPTURE_BODY }]);

    // What this case does not say is what the NOT NULL under the key
    // buys. Both writes carry a hash, and two non-null hashes conflict
    // whichever way the column is declared, so every assertion here
    // would read the same were it nullable. Only the control table the
    // module header describes reaches that.
  });
});
