/**
 * @packageDocumentation
 * The operator's surface over the approval gate in `research_pool`:
 * read what is waiting on a ruling, and rule on it a row at a time.
 *
 * Nothing here opens a connection. Every function takes the database
 * it works through, which is what lets a live test drive it against a
 * database of its own — and what will let the entry point arriving
 * later in this stage hand over the one it opened.
 */
import type { Db } from '../src/db/index.js';
import type { ResearchPoolStatus } from '../src/db/schema/values.js';

import { asc, eq, sql } from 'drizzle-orm';

import { researchPool } from '../src/db/schema.js';

/**
 * One `research_pool` row, as the table selects it.
 *
 * Derived from the table rather than written out. A hand-written copy
 * is a second declaration of one fact and the half that rots is
 * always the copy: a column added to the gate reaches every caller
 * here with no edit, and one renamed cannot leave this file claiming
 * the old name.
 */
export type ResearchPoolRow = typeof researchPool.$inferSelect;

/**
 * The status a row waiting on a ruling holds.
 *
 * Annotated against {@link ResearchPoolStatus} rather than left a
 * bare string literal. The member belongs to `RESEARCH_POOL_STATUSES`
 * in `src/db/schema/values.ts`, the tuple
 * `research_pool_status_check` is generated from, so renaming it
 * there fails this file's compile instead of leaving a query that
 * matches nothing and reports an empty queue.
 */
const PENDING_STATUS: ResearchPoolStatus = 'pending';

/**
 * The rows waiting on a ruling: `pending`, oldest first.
 *
 * Oldest first so a queue worked top-down empties rather than churns.
 * The row at risk of never being read is the one that has waited
 * longest, and a newest-first list pushes it further down with every
 * intention raised — which is the backlog the gate exists to make
 * visible, not to bury.
 *
 * `created_at` does not order these rows on its own. `now()` is the
 * transaction's start time, so every intention a single pass raised
 * carries the same value to the microsecond and timestamptz stores
 * nothing finer. `id` breaks the tie, which is what makes two calls
 * return the same order rather than merely look stable.
 *
 * The limit is a ceiling on what is read, not a page: there is no
 * cursor here, so a backlog longer than it keeps its tail out of
 * sight until the rows in front of it are ruled on.
 *
 * @param db - The database to read through.
 * @param limit - How many rows to take at most. Required rather than
 * defaulted, so the ceiling over an undrained queue is a number a
 * caller chose rather than one inherited from here.
 * @returns The pending rows, oldest first, at most `limit` of them.
 */
export async function listPending(
  db: Db,
  limit: number,
): Promise<ResearchPoolRow[]> {
  return db.select().from(researchPool)
    .where(eq(researchPool.status, PENDING_STATUS))
    .orderBy(asc(researchPool.createdAt), asc(researchPool.id))
    .limit(limit);
}

/**
 * The status a row carries once it has been ruled in favour of.
 *
 * Annotated against {@link ResearchPoolStatus} for the reason
 * `PENDING_STATUS` above records. What the annotation heads off
 * differs on this side: a read against a member that no longer
 * exists reports an empty queue, while a write of one is refused by
 * `research_pool_status_check` at the moment somebody is trying to
 * clear a backlog.
 */
const APPROVED_STATUS: ResearchPoolStatus = 'approved';

/**
 * Rule in favour of one intention: move it to `approved` and stamp
 * `approved_at`.
 *
 * The id is bound rather than interpolated. drizzle renders
 * `eq(column, value)` as a placeholder and sends the value beside
 * the statement, so nothing a caller passes becomes SQL — which is
 * what makes this safe to hand an id read off a terminal. The
 * argument parser arriving later in this stage refuses a
 * non-numeric id before it gets here; that is a second guard, not
 * the one this rests on.
 *
 * `approved_at` is written `coalesce(approved_at, now())` rather
 * than as a bare `now()`, so an approval already given keeps the
 * time it was given and ruling twice on one row is a no-op. That is
 * the discipline `research_pool.approved_at` in
 * `src/db/schema/entities.ts` records as the writer's rather than
 * the schema's: nothing in the database refuses a second approval
 * that re-dates the first, so it is refused here.
 *
 * `now()` is the server's clock rather than this process's, and it
 * is the transaction's start time — so approvals written in one
 * transaction tie to the microsecond, exactly as `created_at` does,
 * with `id` breaking the tie.
 *
 * The row is matched by id alone and nothing is asked of its
 * status. An id typed for a row already closed moves it back to
 * `approved` without moving `approved_at`, and
 * `research_pool_approval_check` permits that: the constraint holds
 * the two timestamps against each other and never consults the
 * status column. `listPending` above is the queue an operator
 * reads, so the ordinary path offers only a pending row — this is
 * what a mistyped id reaches.
 *
 * @param db - The database to write through.
 * @param id - The `research_pool` row to rule on.
 * @returns The row as it stands after the ruling, or `null` when no
 * row carries that id. An id that never existed and one deleted
 * since the queue was read are indistinguishable here, and both say
 * the same thing to a caller: there was nothing to rule on.
 */
export async function approveById(
  db: Db,
  id: number,
): Promise<ResearchPoolRow | null> {
  const [row] = await db.update(researchPool)
    .set({
      approvedAt: sql`coalesce(${researchPool.approvedAt}, now())`,
      status: APPROVED_STATUS,
    })
    .where(eq(researchPool.id, id))
    .returning();

  return row ?? null;
}
