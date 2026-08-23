/**
 * @packageDocumentation
 * The operator's surface over the approval gate in `research_pool`:
 * read what is waiting on a ruling, rule on it a row at a time, and
 * read the command line that asks for either.
 *
 * Every function that reaches the database takes the one it works
 * through, which is what lets a live test drive it against a database
 * of its own. One place opens a connection — `openApproveConnection`
 * at the foot of this file, over the URL `src/config.ts` resolves —
 * and the entry point beside it hands that database to whichever
 * function the command line named, then closes it whether or not the
 * command succeeded.
 *
 * So `bun scripts/approve.ts list` reads the queue, while importing
 * this module hands over its exports and runs nothing.
 * `runApproveCli` is guarded on whether this file is what the process
 * was started with, which is what lets a test reach
 * `parseApproveArgs` or `formatPendingTable` with no database
 * anywhere in sight.
 */
import type { Db } from '../src/db/index.js';
import type { ResearchPoolStatus } from '../src/db/schema/values.js';

import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { config } from '../src/config.js';
import { researchPool } from '../src/db/schema.js';
import * as schema from '../src/db/schema.js';

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
 * A class of its own rather than a bare `Error`, so `runApproveCli`
 * below can tell a mistyped command line — which wants its message
 * and nothing else — from a failure inside a run, where the stack is
 * what a reader needs. `SeedValidationError` in `scripts/seed.ts` is
 * the same arrangement for the same reason.
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
 * a row. A command line this cannot read is refused whole, before
 * `runApproveCli` below opens anything.
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

/**
 * How many pending rows one `list` prints.
 *
 * `listPending` above takes the ceiling rather than carrying one, so
 * this is where the command chooses it. The number is a legibility
 * decision: a listing nobody reads to the end is a backlog reported
 * as a wall of text, and one that stops short of the queue hides the
 * rest of it.
 *
 * That it stopped short is the thing a listing cannot leave unsaid.
 * There is no cursor here, so a full page and a drained queue print
 * the same table — which is why {@link formatPendingTable} below
 * closes a listing that came back at the ceiling with a line saying
 * so.
 */
const PENDING_LIST_LIMIT = 50;

/** What a listing opens with, so a block of it is greppable in a log. */
const PENDING_TITLE = 'pending approvals';

/**
 * What a listing says in place of a table when nothing is waiting.
 *
 * A row of headings over no rows reads as a tool that failed rather
 * than as a queue that is clear, and the two are the outcomes an
 * operator most needs to tell apart.
 */
const PENDING_EMPTY = 'nothing is pending';

/** What closes a listing whose rows came back at the ceiling. */
const PENDING_CAPPED = 'more may be pending: this listing is capped at';

/**
 * What a cell holds where its column holds nothing.
 *
 * One dash covers two absences that are not the same thing, and the
 * columns below are what keep them apart. A NULL in `entity_id` or
 * `finding_id` is an intention naming no subject, or one no finding
 * raised — both ordinary states. In the terms column it is an empty
 * list, which `research_pool.search_terms` in
 * `src/db/schema/entities.ts` records as a real state rather than a
 * missing value: an intention nobody could turn into a query.
 */
const ABSENT_CELL = '-';

/**
 * A timestamp as this tool prints it: ISO 8601, UTC, to the
 * millisecond.
 *
 * `toISOString` rather than the default rendering, which is the
 * reader's local zone at second resolution. Both halves of that cost
 * something here. `now()` is the server's clock, so a stamp shown in
 * another zone invites a comparison against the wrong one, and a
 * queue ordered on `created_at` deserves to be read at the precision
 * it was stored with.
 *
 * Rows raised in one pass tie all the same, at any precision this can
 * print: `now()` is the transaction's start time. That is why
 * `listPending` above breaks the tie on `id` rather than on anything
 * shown here.
 *
 * @param at - The column's value, or `null` where it holds none.
 * @returns The stamp, or `ABSENT_CELL` where there is none.
 */
function formatStamp(at: Date | null): string {
  return at === null
    ? ABSENT_CELL
    : at.toISOString();
}

/**
 * A row id as a cell, for the two columns that may hold none.
 *
 * @param id - The column's value, or `null` where it holds none.
 * @returns The id, or `ABSENT_CELL` where there is none.
 */
function formatRowId(id: number | null): string {
  return id === null
    ? ABSENT_CELL
    : String(id);
}

/** One column of the pending listing. */
interface PendingColumn {
  /** The heading it prints under, and the least wide it can be. */
  readonly heading: string;

  /**
   * Which side its cells are padded on. Numbers on the right so
   * digits line up, text on the left so words start together.
   */
  readonly align: 'left' | 'right';

  /**
   * What the column reads off one row.
   *
   * @param row - The row being printed.
   * @returns Its cell, rendered.
   */
  cell(row: ResearchPoolRow): string;
}

/**
 * The listing's columns, left to right.
 *
 * What a ruling is decided on, and nothing beside it. The terms are
 * the substance: `research_pool.search_terms` in
 * `src/db/schema/entities.ts` records that approval is given to those
 * strings rather than to an account of what will be assembled from
 * them later, so a listing leaving them out would be asking consent
 * for something it had not shown.
 *
 * `status` is not a column because every row here carries the same
 * one — it is what `listPending` selects on. `approved_at` and
 * `researched_at` are not columns either, and that omission has a
 * limit worth stating: the status column and the two timestamps are
 * separate accounts of one row, tied together by nothing, so a row
 * can be pending here and already carry an `approved_at`. Along the
 * ordinary path it does not, and this listing would not show it if it
 * did.
 *
 * The terms sit last because their width disturbs nothing there.
 * Every column is measured off its own contents, so a long list of
 * terms in the middle would push everything after it out of line;
 * there is nothing after it.
 */
const PENDING_COLUMNS: readonly PendingColumn[] = [
  { heading: 'id', align: 'right', cell: (row) => String(row.id) },
  { heading: 'domain', align: 'right', cell: (row) => String(row.domainId) },
  { heading: 'entity', align: 'right', cell: (row) => formatRowId(row.entityId) },
  { heading: 'finding', align: 'right', cell: (row) => formatRowId(row.findingId) },
  { heading: 'raised', align: 'left', cell: (row) => formatStamp(row.createdAt) },
  {
    heading: 'terms',
    align: 'left',
    cell: (row) => (
      row.searchTerms.length === 0
        ? ABSENT_CELL
        : row.searchTerms.join(', ')
    ),
  },
];

/**
 * One cell padded to its column's width.
 *
 * @param text - The cell as it was rendered.
 * @param width - The widest cell in that column, headings included.
 * @param align - Which side to pad on.
 * @returns The cell, padded.
 */
function padCell(
  text: string,
  width: number,
  align: PendingColumn['align'],
): string {
  return align === 'right'
    ? text.padStart(width)
    : text.padEnd(width);
}

/**
 * The pending rows as a table, or a line saying there are none.
 *
 * A heading row over one line per row, every column padded to the
 * widest thing in it. The widths are measured off what is being
 * printed, so an id of five figures widens its column instead of
 * pushing its row out of line — `formatSeedSummary` in
 * `scripts/seed.ts` renders its block the same way and for the same
 * reason.
 *
 * The rows are printed in the order they were handed over, and this
 * does not sort them. The order is `listPending`'s, argued there; a
 * renderer holding a second opinion about the queue is one that
 * disagrees with it the day either changes.
 *
 * @param rows - What `listPending` returned, in the order it returned
 * them.
 * @param limit - The ceiling they were read under, so a listing that
 * came back full can say so. Passed rather than read off
 * `PENDING_LIST_LIMIT`, so what the note claims is the number the
 * rows were actually fetched with.
 * @returns The block: newline-separated, no trailing newline, every
 * line below the title indented, so a caller can print it under a
 * line of its own without the two running together.
 */
export function formatPendingTable(
  rows: readonly ResearchPoolRow[],
  limit: number,
): string {
  if (rows.length === 0) {
    return `${PENDING_TITLE}\n  ${PENDING_EMPTY}`;
  }

  const sized = PENDING_COLUMNS.map((column) => ({
    column,
    width: Math.max(
      column.heading.length,
      ...rows.map((row) => column.cell(row).length),
    ),
  }));
  const renderLine = (cell: (column: PendingColumn) => string): string => sized
    .map(({ column, width }) => padCell(cell(column), width, column.align))
    .join('  ')
    .trimEnd();
  const lines = [
    PENDING_TITLE,
    `  ${renderLine((column) => column.heading)}`,
    ...rows.map((row) => `  ${renderLine((column) => column.cell(row))}`),
  ];

  if (rows.length >= limit) {
    lines.push(`  ${PENDING_CAPPED} ${limit}`);
  }

  return lines.join('\n');
}

/**
 * What a ruling left the row looking like.
 *
 * The three columns a ruling is about, whether or not it wrote them.
 * `rejectById` above stamps neither timestamp on purpose, and a
 * report showing only what changed would leave that indistinguishable
 * from a ruling that cleared them — which is the one write
 * `research_pool_approval_check` refuses.
 *
 * @param row - The row as the writer returned it.
 * @returns Its id, then a line per column, indented under it.
 */
function formatRuling(row: ResearchPoolRow): string {
  const fields: readonly [string, string][] = [
    ['status', row.status],
    ['approved_at', formatStamp(row.approvedAt)],
    ['researched_at', formatStamp(row.researchedAt)],
  ];
  const labelWidth = Math.max(...fields.map(([label]) => label.length));

  return [
    `row ${row.id}`,
    ...fields.map(([label, value]) => `  ${label.padEnd(labelWidth)}  ${value}`),
  ].join('\n');
}

/**
 * Thrown when a ruling names a row the gate does not carry.
 *
 * `approveById` and `rejectById` above report that with `null` rather
 * than raising, which is the right answer for a function: nothing
 * happened, and whether that matters belongs to whoever asked. Here
 * it matters. Somebody asked for a ruling and got none, so the
 * command says so and leaves a nonzero exit behind it — a ruling that
 * reported success over nothing is the failure a queue tool can least
 * afford.
 *
 * A class of its own beside {@link ApproveArgsError} above, and for
 * the same reason: the entry point prints the message and no stack,
 * because neither is a fault in this tool. Two classes rather than
 * one because only a misread command line is answered by a usage
 * line.
 */
export class ApproveRulingError extends Error {
  /**
   * @param command - The ruling that was asked for.
   * @param id - The row id it named.
   */
  constructor(command: 'approve' | 'reject', id: number) {
    super(`${command} names row ${id}, and the gate carries no such row`);
    this.name = this.constructor.name;
  }
}

/**
 * Whichever function the command named, run against the database
 * given, rendered.
 *
 * The two rulings share a body because they differ in nothing but the
 * writer they call. What separates them is written at those two
 * functions, and repeating it in a dispatch would be a third account
 * of one decision.
 *
 * Nothing is asked of the arguments here. `parseApproveArgs` above
 * has already established that a ruling names exactly one row id and
 * that `list` names none, which is what leaves this with a database
 * call and a renderer per branch.
 *
 * @param db - The database to work through.
 * @param command - What the command line asked for.
 * @returns What to print.
 * @throws ApproveRulingError When a ruling names no row.
 */
async function runCommand(
  db: Db,
  command: ApproveCommand,
): Promise<string> {
  if (command.command === 'list') {
    return formatPendingTable(
      await listPending(db, PENDING_LIST_LIMIT),
      PENDING_LIST_LIMIT,
    );
  }

  const rule = command.command === 'approve'
    ? approveById
    : rejectById;
  const row = await rule(db, command.id);

  if (row === null) {
    throw new ApproveRulingError(command.command, command.id);
  }

  return formatRuling(row);
}

/**
 * An open database and the way to let go of it.
 *
 * The pair `SeedConnection` in `scripts/seed.ts` is, for its reasons:
 * a command that opens a connection, runs a statement and closes it
 * wants neither the eager probe nor the managed stop
 * `src/db/index.ts` gives a pool held for a service's lifetime. It is
 * also the seam a test drives {@link runApproveCli} through, against
 * a double rather than a server.
 */
export interface ApproveConnection {
  /** What the command reads and writes through. */
  readonly db: Db;

  /** Releases it, whether or not the command succeeded. */
  close(): Promise<void>;
}

/**
 * A pool over the database `DATABASE_URL` names.
 *
 * The URL is read through `src/config.ts` rather than off
 * `process.env`, for the reason `openSeedConnection` in
 * `scripts/seed.ts` records: one setting resolved one way by every
 * process in this package that reads it, and refused once, at import,
 * by the schema that owns it.
 *
 * One connection, because the most this command issues is one
 * statement. Nothing here opens a transaction either — a ruling is a
 * single UPDATE, and the row it returns is the row the server wrote.
 *
 * @returns The pool, and the way to end it.
 */
function openApproveConnection(): ApproveConnection {
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 });

  return {
    db: drizzle({ client: pool, schema }),
    close: () => pool.end(),
  };
}

/**
 * One command end to end: read the arguments, run what they named,
 * print what it did.
 *
 * The arguments are read before anything is opened, and that order is
 * the point rather than an accident of layout. `parseApproveArgs`
 * refuses a command line whole, so a run nobody can make ends with no
 * connection made — the arrangement `scripts/seed.ts` sets out at
 * length for a seed pass, where what it saves is a half-applied
 * bundle. Here it saves less and holds for the same structural
 * reason: the parser is handed no database and opens none.
 *
 * The connection is closed in a `finally`, so a run that threw
 * releases it too. A pool nobody ended keeps the process alive, and a
 * command that printed its error and then hung reads as a worse
 * failure than the one it reported.
 *
 * @param argv - The arguments after the script name. Defaults to
 * `process.argv.slice(2)`, which is what a launcher leaves; a caller
 * passing its own is what makes this drivable with no command line.
 * @param connect - How to reach a database. Defaults to a pool over
 * `DATABASE_URL`; a caller handing over its own is what makes this
 * drivable with no server.
 * @throws ApproveArgsError When the arguments name no command this
 * can run, which is before `connect` is called at all.
 * @throws ApproveRulingError When a ruling names no row. The
 * connection is closed on the way out.
 */
export async function runApproveCli(
  argv: readonly string[] = process.argv.slice(2),
  connect: () => ApproveConnection = openApproveConnection,
): Promise<void> {
  const command = parseApproveArgs(argv);
  const connection = connect();

  try {
    console.log(await runCommand(connection.db, command));
  } finally {
    await connection.close();
  }
}

/**
 * Whether this file is what the process was started with, rather than
 * something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started, and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all,
 * which is why neither half of it is a line to tidy away.
 * `scripts/seed.ts` carries the same guard.
 *
 * Worth asking because this module is both a command and a library.
 * `bun scripts/approve.ts list` reads the queue, while a test
 * importing `parseApproveArgs` or {@link formatPendingTable} gets the
 * exports and nothing else: under a test runner `process.argv[1]` is
 * the runner's own binary, so the comparison is false and there is
 * nothing for the test to opt out of.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runApproveCli();
  } catch (cause) {
    // Both of these are reports rather than faults in this tool — a
    // command line nobody can read, and a ruling on a row that is not
    // there — so the message is the whole of what a reader needs and
    // a stack above it buries the thing worth reading. Anything else
    // is unexpected, and there the stack is what a reader needs.
    process.exitCode = 1;
    console.error(
      cause instanceof ApproveArgsError || cause instanceof ApproveRulingError
        ? cause.message
        : cause,
    );
  }
}
