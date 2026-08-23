/**
 * @packageDocumentation
 * The operator's surface over the approval gate in `research_pool`:
 * read what is waiting on a ruling, rule on it a row at a time, and
 * read the command line that asks for either.
 *
 * Nothing here opens a connection. Every function that reaches the
 * database takes the one it works through, which is what lets a live
 * test drive it against a database of its own — and what will let the
 * entry point arriving later in this stage hand over the one it
 * opened.
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
 * what makes this safe to hand an id read off a terminal.
 * `parseApproveArgs` below refuses a non-numeric id before it gets
 * here; that is a second guard, not the one this rests on.
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

/**
 * The status a row carries once it has been ruled against.
 *
 * Annotated against {@link ResearchPoolStatus} for the reason
 * `APPROVED_STATUS` above gives: it is the same write side, and the
 * same `research_pool_status_check` refuses a member the tuple no
 * longer names.
 *
 * What is particular to this member is that it has a second writer.
 * The drain stamps the same `skipped` on a row it declines to search,
 * closing it as it goes, so the member alone does not say which of
 * the two rulings a row carries — `research_pool.status` in
 * `src/db/schema/entities.ts` records both readings. Along the
 * ordinary path the timestamps tell them apart: a row reached through
 * the pending queue carries no `researched_at`, and this function
 * does not give it one.
 */
const SKIPPED_STATUS: ResearchPoolStatus = 'skipped';

/**
 * Rule against one intention: move it to `skipped` and leave both
 * timestamps where they are.
 *
 * The id is bound and the row is matched by id alone, for the reasons
 * `approveById` above records; nothing is asked of the status here
 * either, and the queue an operator reads offers only a pending row.
 *
 * What differs is that nothing is stamped. `approved_at` is not
 * cleared, so a row approved and then ruled against records both, in
 * the order they happened, rather than reading as one nobody ever
 * approved. That is also what keeps this total over every state a row
 * can be in: clearing the column on a row already closed is precisely
 * the write `research_pool_approval_check` refuses, so the tidier
 * variant would fail on the rows furthest along and nowhere else.
 *
 * The constraint cannot refuse this write at all. It reads only
 * `approved_at` and `researched_at`, and a status-only UPDATE leaves
 * the pair exactly as the stored row already had it — a pair that was
 * storable a moment ago. It is re-evaluated against the whole new row
 * all the same, which is why that is worth knowing rather than
 * assuming.
 *
 * A ruling against is a change to the account of the row and not a
 * withdrawal from the drain. `research_pool.researched_at` records
 * the drain as selecting on approved and not yet closed, and neither
 * column moves here, so an already-approved row ruled against by id
 * is still one the drain will reach — what closes a row is the write
 * that stamps it. Along the ordinary path there is nothing to
 * withdraw, since a pending row was never approved.
 *
 * @param db - The database to write through.
 * @param id - The `research_pool` row to rule on.
 * @returns The row as it stands after the ruling, or `null` when no
 * row carries that id, which says what it says at `approveById`
 * above.
 */
export async function rejectById(
  db: Db,
  id: number,
): Promise<ResearchPoolRow | null> {
  const [row] = await db.update(researchPool)
    .set({ status: SKIPPED_STATUS })
    .where(eq(researchPool.id, id))
    .returning();

  return row ?? null;
}

/**
 * What a command line asked this tool for, once it has been read.
 *
 * Discriminated on `command` rather than one shape carrying an
 * optional id: a caller switching over it is handed the row id
 * exactly where a ruling names one, so neither ruling can be written
 * against an id nothing established. `list` carries nothing because
 * it asks for nothing — what it reads is whatever is pending.
 */
export type ApproveCommand =
  | { readonly command: 'list' }
  | { readonly command: 'approve'; readonly id: number }
  | { readonly command: 'reject'; readonly id: number };

/**
 * How the three commands are spelled, shown by every refusal below.
 *
 * One declaration rather than a line per message: a refusal is
 * usually where a caller learns the spelling, and a usage line that
 * had drifted from what the parser accepts would send them round
 * again.
 */
const USAGE = 'usage: list | approve <id> | reject <id>';

/**
 * Thrown when the arguments name no command this can run.
 *
 * A class of its own rather than a bare `Error`, so the entry point
 * arriving later in this stage can tell a mistyped command line —
 * which wants its message and nothing else — from a failure inside a
 * run, where the stack is what a reader needs. `SeedValidationError`
 * in `scripts/seed.ts` is the same arrangement for the same reason.
 *
 * `USAGE` is appended here rather than by each refusal, so one added
 * later cannot forget to say what should have been typed.
 */
export class ApproveArgsError extends Error {
  /**
   * @param problem - What is wrong with the arguments, naming the
   * offending word wherever there is one.
   */
  constructor(problem: string) {
    super(`${problem}\n${USAGE}`);
    this.name = this.constructor.name;
  }
}

/**
 * What a row id looks like typed out: one or more digits, no leading
 * zero, no sign and no separator.
 *
 * Narrower than what a number parser accepts, and deliberately: both
 * of the obvious ones read a value out of input nobody typed as a
 * number. `parseInt('12abc', 10)` is 12 and `Number('')` is 0, so a
 * fumbled paste becomes a ruling on a row the operator never named,
 * reported as a success. The ids this tool is handed come off its own
 * listing, which prints them as `bigserial` issues them — from 1
 * upward, unpadded — so anything else is a typo rather than an
 * unusual spelling of an id.
 */
const ROW_ID_PATTERN = /^[1-9][0-9]*$/;

/**
 * The one row id a ruling names, read out of whatever followed it.
 *
 * The safe-integer test is the other half of the pattern above.
 * `research_pool.id` is a `bigserial` read in `number` mode, so an id
 * past `Number.MAX_SAFE_INTEGER` is not one JavaScript can hold apart
 * from its neighbours: `Number('9007199254740993')` is
 * 9007199254740992, the row next door. Refusing it keeps a ruling off
 * that row for the same reason the pattern keeps one off row 12 when
 * `12abc` was typed.
 *
 * @param command - The ruling being asked for, so a refusal names
 * which one.
 * @param operands - Whatever followed the command.
 * @returns The row id it names.
 * @throws ApproveArgsError When no id followed, more than one
 * argument did, or the id is one this cannot read exactly.
 */
function readRowId(
  command: 'approve' | 'reject',
  operands: readonly string[],
): number {
  const [raw, ...extra] = operands;

  if (raw === undefined) {
    throw new ApproveArgsError(`${command} names no row id`);
  }

  if (extra.length > 0) {
    throw new ApproveArgsError(
      `${command} rules on one row, and ${operands.length} ` +
      'arguments followed it',
    );
  }

  if (!ROW_ID_PATTERN.test(raw)) {
    throw new ApproveArgsError(
      `${command} was given '${raw}', which is not a row id: ` +
      'an id is digits, from 1 upward, unpadded',
    );
  }

  const id = Number(raw);

  if (!Number.isSafeInteger(id)) {
    throw new ApproveArgsError(
      `${command} was given '${raw}', which is past the largest ` +
      `id this reads exactly (${Number.MAX_SAFE_INTEGER})`,
    );
  }

  return id;
}

/**
 * The command line read into something an entry point can act on.
 *
 * `argv` is what followed the script name — `process.argv.slice(2)` —
 * and not `process.argv` itself. The launcher's own two entries say
 * nothing about what was asked for, and leaving them out is what
 * makes an empty list a real input here rather than an impossible
 * one: it is the case of a command run with no command at all.
 *
 * Nothing is guessed. There is no default, because the charity that
 * would let a bare run mean `list` is the same charity that would let
 * a mistyped `approve` mean something — and one of those two rules on
 * a row. A command line this cannot read is refused whole, before an
 * entry point opens anything.
 *
 * Each command takes exactly its own arguments, and a trailing one is
 * refused rather than ignored. `approve 41 42` is two rulings to
 * whoever typed it: ignoring the second would rule on one row and say
 * nothing at all about the other.
 *
 * What this establishes is that the arguments could name a row, never
 * that they do. Nothing here reaches a database, so an id no row
 * carries parses clean and is answered further down, by the `null`
 * `approveById` and `rejectById` return.
 *
 * @param argv - The arguments after the script name.
 * @returns The command, discriminated on `command` so a row id is
 * reachable exactly where one was named.
 * @throws ApproveArgsError When the arguments name no command this
 * can run, or name one with arguments it does not take.
 */
export function parseApproveArgs(
  argv: readonly string[],
): ApproveCommand {
  const [command, ...operands] = argv;

  if (command === undefined) {
    throw new ApproveArgsError('no command given');
  }

  if (command === 'list') {
    if (operands.length > 0) {
      throw new ApproveArgsError(
        `list takes no arguments, and ${operands.length} ` +
        'followed it',
      );
    }

    return { command: 'list' };
  }

  if (command === 'approve' || command === 'reject') {
    return { command, id: readRowId(command, operands) };
  }

  throw new ApproveArgsError(`unknown command '${command}'`);
}
