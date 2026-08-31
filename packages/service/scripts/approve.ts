/**
 * @packageDocumentation
 * The operator's surface over the approval gates this schema holds:
 * read what is waiting on a ruling, rule on one row at a time, and
 * read the command line that asks for either.
 *
 * There are two gates and they are one tool because they are one
 * job. `research_pool` carries an intention to research something,
 * raised by one workflow and drained by another;
 * `source_config_proposals` carries a `parser_config` and a
 * `contract` a model proposed for one source, which only an
 * approval writes onto the source row. Both are a person's ruling
 * standing between a machine's suggestion and a machine acting on
 * it, both are `pending` until somebody looks, and both are held by
 * a CHECK over a pair of timestamps rather than by a branch.
 *
 * A ruling therefore names its subject: `approve pool 7` and
 * `approve config 7` are rulings on different rows. Both tables key
 * on `bigserial`, so row 7 exists in each and there is no id a tool
 * could sort by itself — a subject inferred from a number would be
 * a guess, made silently, on the one command that writes. `list`
 * names neither and reports both, each under its own heading, which
 * is where an operator learns the two words.
 *
 * What holds each gate shut is a CHECK of its own. They are named
 * `research_pool_approval_check`, in `src/db/schema/entities.ts`,
 * and `source_config_proposals_approval_check`, in
 * `src/db/schema/sources.ts`, and this is a client of both rather
 * than a substitute for either. Nothing here decides what may be
 * written. The server refuses a `researched_at` stamped on a row
 * nobody approved, and an `applied_at` stamped on a proposal nobody
 * approved, whoever issues the statement — this tool, a workflow,
 * an operator at a psql prompt — and it would go on refusing both
 * with this file deleted. The four rulings below stay on the
 * permitted side by construction: each approval only ever sets
 * `approved_at`, which can satisfy either constraint and never
 * breach it, and each rejection leaves both of its table's
 * timestamps exactly as the stored row already had them. So a run
 * of this tool never meets a refusal at all, which is what being a
 * client of one means.
 *
 * The reverse direction is what makes that worth stating. Neither
 * constraint reads `status` at all, so everything this adds above
 * them — the order each listing reads in, the `coalesce` that stops
 * a second approval re-dating the first, an id read narrowly enough
 * to rule on no neighbouring row — is the writer's discipline and
 * enforced nowhere. A reader of the rows cannot recover any of it,
 * and the writer that comes next either carries it or drops it
 * silently.
 *
 * The writer that comes next is the API and the UI, which arrive
 * outside this port's phases and take approvals over when they do.
 * Until then this is the whole of the operator surface, and interim
 * in a way the schema does not pay for: neither table carries a
 * column this tool asked for, and what replaces it reaches the same
 * two tables through the same two constraints. Each table's own
 * header names this file from that side.
 *
 * A subject is a registry entry rather than a branch. The selectors
 * are declared once in `SUBJECT_SELECTORS`, the usage line every
 * refusal closes with is built from that declaration, and
 * `APPROVAL_SUBJECTS` is typed to hold exactly one entry per
 * selector — so a third gate is an entry and a word, and cannot
 * land with the usage line still naming two.
 *
 * Every function that reaches the database takes the one it works
 * through, which is what lets a live test drive it against a
 * database of its own. One place opens a connection —
 * `openApproveConnection` at the foot of this file, over the URL
 * `src/config.ts` resolves — and the entry point beside it hands
 * that database to whichever function the command line named, then
 * closes it whether or not the command succeeded.
 *
 * So `bun scripts/approve.ts list` reads both queues, while
 * importing this module hands over its exports and runs nothing.
 * `runApproveCli` is guarded on whether this file is what the
 * process was started with, which is what lets a test reach
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
import { researchPool, sourceConfigProposals } from '../src/db/schema.js';
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
 * One `source_config_proposals` row, as the table selects it.
 *
 * Derived from the table for the reason {@link ResearchPoolRow}
 * above records, and the two are separate declarations because the
 * two tables are separate: they share a status tuple and the shape
 * of their gate, and nothing else. `research_pool` names a subject
 * and carries search terms; a proposal names a source and carries
 * two JSONB documents. A single row type over both would be a
 * shape neither table has.
 */
export type SourceConfigProposalRow =
  typeof sourceConfigProposals.$inferSelect;

/**
 * The status a row waiting on a ruling holds.
 *
 * Annotated against {@link ResearchPoolStatus} rather than left a
 * bare string literal. The member belongs to `RESEARCH_POOL_STATUSES`
 * in `src/db/schema/values.ts`, the tuple
 * `research_pool_status_check` is generated from, so renaming it
 * there fails this file's compile instead of leaving a query that
 * matches nothing and reports an empty queue.
 *
 * One constant for both queues, because both columns are
 * constrained to that one tuple —
 * `source_config_proposals_status_check` is generated from it too.
 * The type keeps the first table's name, which that module argues
 * for where the tuple is declared; the member is the same member.
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
 * The proposals waiting on a ruling: `pending`, oldest first.
 *
 * Oldest first for the reason {@link listPending} above argues, and
 * with a second one of its own. `source_config_proposals` carries
 * no unique key over `source_id`, deliberately, so a feed that has
 * been failing collects several pending proposals; the oldest is
 * the one whose absence of a ruling has cost the most passes, and
 * `source_config_proposals.proposed_at` in
 * `src/db/schema/sources.ts` names this order at the column.
 *
 * `proposed_at` does not order these rows on its own either.
 * `now()` is the transaction's start time, so several proposals
 * written in one pass tie to the microsecond, and `id` breaks the
 * tie.
 *
 * The limit is a ceiling on what is read rather than a page, which
 * says here what it says at {@link listPending}.
 *
 * @param db - The database to read through.
 * @param limit - How many rows to take at most. Required rather
 * than defaulted, for the reason {@link listPending} gives.
 * @returns The pending proposals, oldest first, at most `limit` of
 * them.
 */
export async function listPendingProposals(
  db: Db,
  limit: number,
): Promise<SourceConfigProposalRow[]> {
  return db.select().from(sourceConfigProposals)
    .where(eq(sourceConfigProposals.status, PENDING_STATUS))
    .orderBy(asc(sourceConfigProposals.proposedAt), asc(sourceConfigProposals.id))
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
 * Rule in favour of one proposal: move it to `approved` and stamp
 * `approved_at`.
 *
 * The id is bound rather than interpolated, and `approved_at` is
 * written `coalesce(approved_at, now())` so that ruling twice on
 * one row is a no-op — both for the reasons {@link approveById}
 * above sets out at length. What is particular here is what this
 * write does NOT touch.
 *
 * `applied_at` is not written, and it is the column the whole
 * arrangement exists to keep apart from this one. An approval says
 * a person agreed to the two documents; an application says
 * somebody copied them onto `sources`. Stamping both here would
 * make this tool the writer of a config it only ruled on, and the
 * refusal that then stands between an unruled proposal and the
 * source row is `proposalToSourceUpdate` in
 * `src/sources/config-proposer.ts`, which reads exactly the column
 * this writes.
 *
 * `source_config_proposals_approval_check` cannot refuse this write
 * either. It requires an `applied_at` to be accompanied by an
 * `approved_at`, and this only ever moves the second of those from
 * NULL to a stamp — the direction that can satisfy the rule and
 * never breach it, whatever the row already held.
 *
 * The row is matched by id alone and nothing is asked of its
 * status, which says here what it says at {@link approveById}: an
 * id typed for a proposal already applied moves its status without
 * moving either timestamp, and the queue an operator reads offers
 * only a pending row.
 *
 * @param db - The database to write through.
 * @param id - The `source_config_proposals` row to rule on.
 * @returns The row as it stands after the ruling, or `null` when no
 * row carries that id, which says what it says at
 * {@link approveById}.
 */
export async function approveProposalById(
  db: Db,
  id: number,
): Promise<SourceConfigProposalRow | null> {
  const [row] = await db.update(sourceConfigProposals)
    .set({
      approvedAt: sql`coalesce(${sourceConfigProposals.approvedAt}, now())`,
      status: APPROVED_STATUS,
    })
    .where(eq(sourceConfigProposals.id, id))
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
 * Rule against one proposal: move it to `skipped` and leave both
 * timestamps where they are.
 *
 * The id is bound and the row is matched by id alone, and nothing
 * is stamped, all for the reasons {@link rejectById} above records.
 * The same argument for leaving `approved_at` standing applies to
 * the same column here: clearing it on a row `applied_at` has
 * already stamped is precisely the write
 * `source_config_proposals_approval_check` refuses, so the tidier
 * variant would fail on the rows furthest along and nowhere else.
 *
 * A ruling against is a change to the account of the row and not a
 * withdrawal of an approval already given. A proposal approved and
 * then ruled against still carries the stamp that authorizes
 * `proposalToSourceUpdate` in `src/sources/config-proposer.ts` to
 * answer, since that function reads `approved_at` and not `status`
 * — which is deliberate on both sides, argued there, and worth
 * knowing before this is reached for as a way to take an approval
 * back. There is nothing to take back along the ordinary path: a
 * pending proposal was never approved.
 *
 * @param db - The database to write through.
 * @param id - The `source_config_proposals` row to rule on.
 * @returns The row as it stands after the ruling, or `null` when no
 * row carries that id, which says what it says at
 * {@link approveById}.
 */
export async function rejectProposalById(
  db: Db,
  id: number,
): Promise<SourceConfigProposalRow | null> {
  const [row] = await db.update(sourceConfigProposals)
    .set({ status: SKIPPED_STATUS })
    .where(eq(sourceConfigProposals.id, id))
    .returning();

  return row ?? null;
}

/**
 * Which gate a ruling is about, as it is spelled on the command
 * line.
 *
 * One declaration, read by three things that would otherwise drift:
 * the type below is derived from it, {@link USAGE} is built from
 * it, and {@link APPROVAL_SUBJECTS} is annotated as holding one
 * entry per member — so tsc refuses a selector with no gate behind
 * it and a gate no word reaches, and the usage line cannot name a
 * set the parser does not accept.
 *
 * A list rather than an object keyed by these words, and that is
 * not a preference. A word read off a terminal used as a key into
 * an object reaches `Object.prototype` for `constructor` and for
 * `__proto__`, so `approve __proto__ 1` would resolve to something
 * rather than be refused; a membership test over an array reaches
 * no prototype at all. `getSourceAdapter` in `src/sources/index.ts`
 * answers the same hazard with `Object.hasOwn` because it is handed
 * a registry it does not own — here the registry is two entries in
 * this file, so the cheaper shape is also the safer one.
 *
 * Short words rather than table names. `pool` and `config` are what
 * an operator types repeatedly, and each is unambiguous inside a
 * tool that rules on exactly these two things; the tables they name
 * are `research_pool` and `source_config_proposals`, said in full
 * by every listing heading and every refusal.
 */
const SUBJECT_SELECTORS = ['pool', 'config'] as const;

/**
 * One of the two words above, as everything downstream carries it.
 *
 * Derived rather than written out, so the union and the list cannot
 * disagree about what a subject is.
 */
export type SubjectSelector = typeof SUBJECT_SELECTORS[number];

/**
 * The selectors as a plain list, for a caller that wants to sweep
 * them.
 *
 * Exported because the usage line is derived from this same
 * declaration and a test asserting the two agree needs the
 * declaration to hold them to. It is the ORDER as well as the
 * membership: the list is what the usage line reads in, so a gate
 * added at the front moves the word every refusal shows first.
 */
export const APPROVAL_SUBJECT_SELECTORS: readonly SubjectSelector[] =
  SUBJECT_SELECTORS;

/**
 * How a ruling names its subject, as every refusal below shows it.
 *
 * Built from {@link SUBJECT_SELECTORS} rather than typed out, which
 * is the whole of what stops the usage line from naming a set the
 * parser has stopped accepting. A refusal is usually where an
 * operator learns the spelling, and the one thing a usage line must
 * not do is send them round again.
 */
const SUBJECT_ALTERNATION = `<${SUBJECT_SELECTORS.join('|')}>`;

/**
 * What a command line asked this tool for, once it has been read.
 *
 * Discriminated on `command` rather than one shape carrying an
 * optional id and an optional subject: a caller switching over it
 * is handed both exactly where a ruling names them, so neither
 * ruling can be written against an id nothing established or
 * against a gate nobody chose. `list` carries neither because it
 * asks for neither — what it reads is whatever is pending, in both.
 *
 * The subject is the selector rather than the registry entry it
 * resolves to. What a parser establishes is that a word names a
 * gate; which functions that gate is made of is the run's business,
 * and a parsed command carrying them would be a value a test has to
 * compare against two closures to say what was read.
 */
export type ApproveCommand =
  | { readonly command: 'list' }
  | {
    readonly command: 'approve';
    readonly subject: SubjectSelector;
    readonly id: number;
  }
  | {
    readonly command: 'reject';
    readonly subject: SubjectSelector;
    readonly id: number;
  };

/**
 * How the three commands are spelled, shown by every refusal below.
 *
 * One declaration rather than a line per message, for the reason
 * {@link SUBJECT_ALTERNATION} above gives about the half of it that
 * is derived.
 */
const USAGE = `usage: list | approve ${SUBJECT_ALTERNATION} <id> `
  + `| reject ${SUBJECT_ALTERNATION} <id>`;

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
 * @param operands - Whatever followed the subject.
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
      `${command} rules on one row, and ${operands.length + 1} ` +
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
 * The one gate a ruling names, read out of the word after it.
 *
 * A membership test over {@link SUBJECT_SELECTORS} rather than a
 * lookup, for the prototype reason that declaration records: a word
 * off a terminal is never used as a key here. Nothing is guessed
 * either. There is no default subject, because the charity that
 * would let a bare `approve 41` mean the research pool is the same
 * charity that would let it mean a config proposal on the day a
 * second gate landed — and it is the day a second gate landed.
 * There is no prefix match for the same reason `parseApproveArgs`
 * below refuses `approv`: a near miss resolved charitably rules on
 * a row.
 *
 * The refusal quotes the word and then names the set, which is what
 * separates a typo from a subject this tool does not have. The
 * usage line following it repeats the set in the alternation, and
 * that repetition is deliberate: this sentence says which of the
 * two arguments was wrong, and the usage line says what the whole
 * command should have looked like.
 *
 * @param command - The ruling being asked for, so a refusal names
 * which one.
 * @param word - The argument that should name a gate, or
 * `undefined` where nothing followed the ruling.
 * @returns The selector it names.
 * @throws ApproveArgsError When nothing followed the ruling, or
 * what did names no gate this tool rules on.
 */
function readSubject(
  command: 'approve' | 'reject',
  word: string | undefined,
): SubjectSelector {
  if (word === undefined) {
    throw new ApproveArgsError(`${command} names no subject`);
  }

  const subject = SUBJECT_SELECTORS.find((selector) => selector === word);

  if (subject === undefined) {
    throw new ApproveArgsError(
      `${command} was given '${word}', which names none of the ` +
      `gates this rules on (${SUBJECT_SELECTORS.join(', ')})`,
    );
  }

  return subject;
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
 * refused rather than ignored. `approve pool 41 42` is two rulings to
 * whoever typed it: ignoring the second would rule on one row and say
 * nothing at all about the other.
 *
 * A ruling is read in the order it is typed — the gate, then the row
 * — and each is refused where it stands. So `approve 41` is refused
 * for naming no subject rather than for naming a row id that is not
 * a gate, which is the sentence that tells an operator what to add.
 *
 * What this establishes is that the arguments could name a row in a
 * gate that exists, never that they do. Nothing here reaches a
 * database, so an id no row carries parses clean and is answered
 * further down, by the `null` the four writers return.
 *
 * @param argv - The arguments after the script name.
 * @returns The command, discriminated on `command` so a subject and
 * a row id are reachable exactly where one was named.
 * @throws ApproveArgsError When the arguments name no command this
 * can run, name one with arguments it does not take, or name a gate
 * it does not rule on.
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
    const [word, ...rest] = operands;

    return {
      command,
      subject: readSubject(command, word),
      id: readRowId(command, rest),
    };
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

/**
 * What every listing block opens with, so a block of one is
 * greppable in a log whichever gate it is about.
 *
 * The gate's own name follows it, because `list` prints both blocks
 * and a reader scrolling to the second needs to know which it is
 * looking at. A shared prefix is what keeps one needle finding
 * either.
 */
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
 * One dash covers several absences that are not the same thing, and
 * the columns below are what keep them apart. A NULL in `entity_id`
 * or `finding_id` is an intention naming no subject, or one no
 * finding raised — both ordinary states. In the terms column it is
 * an empty list, which `research_pool.search_terms` in
 * `src/db/schema/entities.ts` records as a real state rather than a
 * missing value: an intention nobody could turn into a query.
 *
 * On a proposal it is one of two things, and both are the column's
 * default rather than a missing value. In the `by` column it is an
 * empty `proposed_by`, which that column records as a writer that
 * did not say. In either document column it is an empty object,
 * which `source_config_proposals.parser_config` in
 * `src/db/schema/sources.ts` names as a model asked for a config
 * and answering with nothing usable — a proposal to reject rather
 * than a row to wonder about.
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

/**
 * What a document cell holds where the column holds no object.
 *
 * `parser_config` and `contract` are `jsonb` and NOT NULL, so they
 * always hold valid JSON — and JSON that is a number, a string or
 * an array is valid and is not a config. Rendering the member names
 * of such a value would print the indices of an array or nothing at
 * all, so it says what it found instead. It is one of the readings
 * a ruling turns on: a proposal whose config is not an object is
 * one nothing could ever apply.
 */
const NON_OBJECT_CELL = '(not an object)';

/**
 * A text column's value as a cell, with an empty one shown as
 * absent.
 *
 * An empty string collapses a column to its heading's width and
 * reads as a rendering fault rather than as a value, which is
 * exactly what {@link ABSENT_CELL} is for.
 *
 * @param text - The column's value.
 * @returns The text, or `ABSENT_CELL` where it is empty.
 */
function formatText(text: string): string {
  return text === ''
    ? ABSENT_CELL
    : text;
}

/**
 * A proposed document as a cell: the names of its top-level
 * members, in the order it carries them.
 *
 * The shape rather than the document, and that is the listing's one
 * real limit rather than a rendering shortcut. A `parser_config` is
 * a nested document of paths, patterns and field maps; there is no
 * width at which it belongs in a table cell beside six other
 * columns. What the member names do answer is the question a queue
 * is read for — which of several pending proposals for one source
 * is the one worth opening, and whether a proposal declares
 * anything at all.
 *
 * So approving on the strength of this listing alone is approving a
 * shape. The documents themselves are one SELECT away, and the API
 * and the UI that take approvals over are where a diff of them
 * belongs; the header above says what else is interim about this
 * tool, and this is the part an operator can feel.
 *
 * Read with `Object.keys`, which walks own enumerable keys and no
 * prototype. A document arriving from `jsonb` has been through
 * `JSON.parse`, so a stored `"__proto__"` member is an own key
 * here and is listed as the member it is rather than resolving to
 * anything.
 *
 * @param document - The column's value, as `jsonb` returned it.
 * @returns Its member names, or `ABSENT_CELL` where it declares
 * none, or `NON_OBJECT_CELL` where it is not an object at all.
 */
function formatDocumentShape(document: unknown): string {
  if (
    typeof document !== 'object'
    || document === null
    || Array.isArray(document)
  ) {
    return NON_OBJECT_CELL;
  }

  const members = Object.keys(document);

  return members.length === 0
    ? ABSENT_CELL
    : members.join(', ');
}

/**
 * Which side a column's cells are padded on. Numbers on the right
 * so digits line up, text on the left so words start together.
 *
 * Named rather than written inline at both sites, because
 * {@link PendingColumn} is generic: `PendingColumn['align']` would
 * need a row type nobody has to hand, only to answer the two
 * members spelled here.
 */
type CellAlign = 'left' | 'right';

/**
 * One column of a pending listing.
 *
 * Generic over the row, because the two gates hand over different
 * rows and a column is the only place that difference shows. The
 * table renderer below is generic for the same reason and reads
 * nothing off a row itself — every reading is a `cell` a column
 * brought with it.
 *
 * @typeParam Row - The row this column reads a cell off.
 */
interface PendingColumn<Row> {
  /** The heading it prints under, and the least wide it can be. */
  readonly heading: string;

  /** Which side its cells are padded on. */
  readonly align: CellAlign;

  /**
   * What the column reads off one row.
   *
   * @param row - The row being printed.
   * @returns Its cell, rendered.
   */
  cell(row: Row): string;
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
const PENDING_COLUMNS: readonly PendingColumn<ResearchPoolRow>[] = [
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
 * The proposal listing's columns, left to right.
 *
 * What a ruling is decided on, under the same rule
 * {@link PENDING_COLUMNS} above states: the substance is shown, not
 * summarized away. Here the substance is two documents, and
 * {@link formatDocumentShape} is where the compromise that forces
 * is argued.
 *
 * `source` is a column and `domain` is beside it because a proposal
 * is about one feed and several may be pending for it — which of
 * them to open is the question this listing exists to answer, and
 * an id is what an operator carries to a psql prompt to read the
 * documents in full.
 *
 * `by` is provenance rather than an address.
 * `source_config_proposals.proposed_by` in
 * `src/db/schema/sources.ts` resolves against nothing, so what is
 * shown is what a writer called itself. It is a column because a
 * proposal from an endpoint nobody recognizes is a proposal to look
 * at twice.
 *
 * `status` is not a column because every row here carries the same
 * one, and the two timestamps are not columns for the reason
 * {@link PENDING_COLUMNS} gives about the pair on its own table:
 * they are a separate account of the row, tied to `status` by
 * nothing, so a row can be pending here and already carry an
 * `approved_at`. Along the ordinary path it does not.
 *
 * The two document columns sit last because their width disturbs
 * nothing after them — and only the last of the two is fully
 * undisturbed, since a wide `config` still pushes `contract` out.
 * They travel together on purpose: the schema approves them
 * together, and a listing showing one would be showing half of what
 * is being agreed to.
 */
const PROPOSAL_COLUMNS: readonly PendingColumn<SourceConfigProposalRow>[] = [
  { heading: 'id', align: 'right', cell: (row) => String(row.id) },
  { heading: 'domain', align: 'right', cell: (row) => String(row.domainId) },
  { heading: 'source', align: 'right', cell: (row) => String(row.sourceId) },
  { heading: 'proposed', align: 'left', cell: (row) => formatStamp(row.proposedAt) },
  { heading: 'by', align: 'left', cell: (row) => formatText(row.proposedBy) },
  {
    heading: 'config',
    align: 'left',
    cell: (row) => formatDocumentShape(row.parserConfig),
  },
  {
    heading: 'contract',
    align: 'left',
    cell: (row) => formatDocumentShape(row.contract),
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
  align: CellAlign,
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
 * does not sort them. The order is the reader's — `listPending` or
 * {@link listPendingProposals}, each argued where it is written; a
 * renderer holding a second opinion about a queue is one that
 * disagrees with it the day either changes.
 *
 * Generic over the row, and it reads nothing off one: the title,
 * the columns and the rows all arrive as arguments, so the two
 * gates share this function rather than a copy of it. Its widths
 * are measured per call, so the two blocks a `list` prints line up
 * inside themselves and not with each other, which is right — they
 * are different tables and a shared width would suggest otherwise.
 *
 * @typeParam Row - The row the columns read cells off.
 * @param title - What the block opens with, naming its gate.
 * @param columns - The columns, left to right.
 * @param rows - What the reader returned, in the order it returned
 * them.
 * @param limit - The ceiling they were read under, so a listing that
 * came back full can say so. Passed rather than read off
 * `PENDING_LIST_LIMIT`, so what the note claims is the number the
 * rows were actually fetched with.
 * @returns The block: newline-separated, no trailing newline, every
 * line below the title indented, so a caller can print it under a
 * line of its own without the two running together.
 */
export function formatPendingTable<Row>(
  title: string,
  columns: readonly PendingColumn<Row>[],
  rows: readonly Row[],
  limit: number,
): string {
  if (rows.length === 0) {
    return `${title}\n  ${PENDING_EMPTY}`;
  }

  const sized = columns.map((column) => ({
    column,
    width: Math.max(
      column.heading.length,
      ...rows.map((row) => column.cell(row).length),
    ),
  }));
  const renderLine = (
    cell: (column: PendingColumn<Row>) => string,
  ): string => sized
    .map(({ column, width }) => padCell(cell(column), width, column.align))
    .join('  ')
    .trimEnd();
  const lines = [
    title,
    `  ${renderLine((column) => column.heading)}`,
    ...rows.map((row) => `  ${renderLine((column) => column.cell(row))}`),
  ];

  if (rows.length >= limit) {
    lines.push(`  ${PENDING_CAPPED} ${limit}`);
  }

  return lines.join('\n');
}

/** One column of a ruling report: its label, and what it holds. */
type RulingField = readonly [string, string];

/**
 * What a ruling left the row looking like.
 *
 * The columns a ruling is about, whether or not it wrote them.
 * Every rejection here stamps no timestamp on purpose, and a report
 * showing only what changed would leave that indistinguishable from
 * a ruling that cleared them — which is the one write each gate's
 * CHECK refuses.
 *
 * The fields arrive from the subject rather than being read here,
 * because the pair a gate is held by differs:
 * `approved_at`/`researched_at` on `research_pool`,
 * `approved_at`/`applied_at` on the proposals. What is shared is
 * the shape of the report, which is all this renders.
 *
 * @param id - The row that was ruled on.
 * @param fields - Its columns, in the order they should print.
 * @returns Its id, then a line per field, indented under it.
 */
function formatRuling(id: number, fields: readonly RulingField[]): string {
  const labelWidth = Math.max(...fields.map(([label]) => label.length));

  return [
    `row ${id}`,
    ...fields.map(([label, value]) => `  ${label.padEnd(labelWidth)}  ${value}`),
  ].join('\n');
}

/**
 * What an intention's ruling report shows.
 *
 * @param row - The row as the writer returned it.
 * @returns Its status and the two timestamps its CHECK reads.
 */
function poolRulingFields(row: ResearchPoolRow): readonly RulingField[] {
  return [
    ['status', row.status],
    ['approved_at', formatStamp(row.approvedAt)],
    ['researched_at', formatStamp(row.researchedAt)],
  ];
}

/**
 * What a proposal's ruling report shows.
 *
 * `applied_at` sits where `researched_at` sits above, being the
 * other half of the pair
 * `source_config_proposals_approval_check` holds — and a rejection
 * showing it still NULL is the whole of what says an approval was
 * refused before anything reached the source row.
 *
 * @param row - The row as the writer returned it.
 * @returns Its status and the two timestamps its CHECK reads.
 */
function proposalRulingFields(
  row: SourceConfigProposalRow,
): readonly RulingField[] {
  return [
    ['status', row.status],
    ['approved_at', formatStamp(row.approvedAt)],
    ['applied_at', formatStamp(row.appliedAt)],
  ];
}

/**
 * Everything one gate is made of, before its row type is erased.
 *
 * Generic over the row, and it is the last place that type is
 * visible: {@link approvalSubject} below turns one of these into an
 * {@link ApprovalSubject}, whose members answer rendered text. That
 * boundary is what lets {@link APPROVAL_SUBJECTS} be one list and
 * `runCommand` be one branch, rather than a union nothing can
 * dispatch over without knowing which arm it holds.
 *
 * @typeParam Row - The row this gate's readers and writers answer.
 */
interface SubjectSpec<Row extends { readonly id: number }> {
  /** What the gate is called, in a heading and in a refusal. */
  readonly label: string;

  /** Its listing's columns, left to right. */
  readonly columns: readonly PendingColumn<Row>[];

  /**
   * Reads its rows waiting on a ruling, oldest first.
   *
   * @param db - The database to read through.
   * @param limit - How many rows to take at most.
   * @returns The pending rows, in the order they should print.
   */
  listPending(db: Db, limit: number): Promise<Row[]>;

  /**
   * Rules in favour of one of its rows.
   *
   * @param db - The database to write through.
   * @param id - The row to rule on.
   * @returns The row as it stands after, or `null` for no such row.
   */
  approveById(db: Db, id: number): Promise<Row | null>;

  /**
   * Rules against one of its rows.
   *
   * @param db - The database to write through.
   * @param id - The row to rule on.
   * @returns The row as it stands after, or `null` for no such row.
   */
  rejectById(db: Db, id: number): Promise<Row | null>;

  /**
   * What its ruling report shows.
   *
   * @param row - The row as the writer returned it.
   * @returns Its fields, in the order they should print.
   */
  rulingFields(row: Row): readonly RulingField[];
}

/**
 * One gate, as everything downstream of the parser holds it: a name
 * and three things that answer text.
 *
 * No row type, deliberately. A command line names a gate and a row
 * id, and what a run then wants is a block to print — so the row
 * shape stops at this boundary, and the code that dispatches over a
 * subject never learns which of two tables it is talking to.
 */
interface ApprovalSubject {
  /** What the gate is called, in a heading and in a refusal. */
  readonly label: string;

  /**
   * Its pending rows, as a block ready to print.
   *
   * @param db - The database to read through.
   * @param limit - How many rows to take at most.
   * @returns The listing block, no trailing newline.
   */
  formatPending(db: Db, limit: number): Promise<string>;

  /**
   * Rules in favour of one of its rows, rendered.
   *
   * @param db - The database to write through.
   * @param id - The row to rule on.
   * @returns The report, or `null` when no row carries that id.
   */
  approve(db: Db, id: number): Promise<string | null>;

  /**
   * Rules against one of its rows, rendered.
   *
   * @param db - The database to write through.
   * @param id - The row to rule on.
   * @returns The report, or `null` when no row carries that id.
   */
  reject(db: Db, id: number): Promise<string | null>;
}

/**
 * One gate's readers, writers and columns, closed over its row
 * type.
 *
 * The erasure happens here and only here, which is what makes it
 * one function rather than a pattern each entry repeats. The `null`
 * a writer answers is passed through rather than turned into a
 * refusal: whether a missing row matters belongs to the caller, and
 * `runCommand` below is where it does.
 *
 * @typeParam Row - The row this gate's readers and writers answer.
 * @param spec - The gate, before its row type is erased.
 * @returns The same gate, answering text.
 */
function approvalSubject<Row extends { readonly id: number }>(
  spec: SubjectSpec<Row>,
): ApprovalSubject {
  return {
    label: spec.label,

    async formatPending(db, limit) {
      return formatPendingTable(
        `${PENDING_TITLE}: ${spec.label}`,
        spec.columns,
        await spec.listPending(db, limit),
        limit,
      );
    },

    async approve(db, id) {
      const row = await spec.approveById(db, id);

      return row === null
        ? null
        : formatRuling(row.id, spec.rulingFields(row));
    },

    async reject(db, id) {
      const row = await spec.rejectById(db, id);

      return row === null
        ? null
        : formatRuling(row.id, spec.rulingFields(row));
    },
  };
}

/**
 * The two gates this tool rules on, keyed by the word that names
 * one.
 *
 * Annotated as a `Record` over {@link SubjectSelector} rather than
 * inferred, and that annotation is the anti-drift half of the
 * arrangement {@link SUBJECT_SELECTORS} describes. tsc refuses a
 * selector this holds no entry for, and refuses an entry no
 * selector reaches — so the usage line derived from that list and
 * the gates reachable through this one cannot come apart, in either
 * direction, without a compile error.
 *
 * The order the entries are written in is not what a `list` prints;
 * that order is the selectors', read below.
 */
const APPROVAL_SUBJECTS: Record<SubjectSelector, ApprovalSubject> = {
  pool: approvalSubject({
    label: 'research pool',
    columns: PENDING_COLUMNS,
    listPending,
    approveById,
    rejectById,
    rulingFields: poolRulingFields,
  }),
  config: approvalSubject({
    label: 'source config proposals',
    columns: PROPOSAL_COLUMNS,
    listPending: listPendingProposals,
    approveById: approveProposalById,
    rejectById: rejectProposalById,
    rulingFields: proposalRulingFields,
  }),
};

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
 *
 * The gate is named in the message and it is the whole point of
 * naming it. Both tables key on `bigserial`, so the likeliest way
 * to reach this is a correct id typed against the wrong subject,
 * and a refusal saying only that row 7 is not there would send an
 * operator looking for a deleted row that is sitting in the other
 * queue.
 */
export class ApproveRulingError extends Error {
  /**
   * @param command - The ruling that was asked for.
   * @param subject - The gate it named, as it is called.
   * @param id - The row id it named.
   */
  constructor(
    command: 'approve' | 'reject',
    subject: string,
    id: number,
  ) {
    super(
      `${command} names row ${id} of the ${subject}, and that gate `
      + 'carries no such row',
    );
    this.name = this.constructor.name;
  }
}

/**
 * Every gate's pending rows, each block under its own heading.
 *
 * In the order {@link SUBJECT_SELECTORS} declares, which is also the
 * order the usage line names them in — so the two words an operator
 * reads in a refusal appear in the same order as the two blocks they
 * belong to.
 *
 * Both are read, always, and neither is dropped for being empty. A
 * gate with nothing pending says so in its own block, which is what
 * distinguishes a clear queue from a subject this build does not
 * have; a listing that printed only the busy gate would be silently
 * teaching an operator the wrong set of words.
 *
 * The blocks are read one after another rather than together. Two
 * concurrent reads over one pooled connection buy nothing an
 * operator can perceive, and a listing that interleaved its
 * failures would be harder to read than one that stops at the first.
 *
 * @param db - The database to read through.
 * @param limit - How many rows to take at most, per gate.
 * @returns The blocks, separated by a blank line.
 */
async function formatAllPending(db: Db, limit: number): Promise<string> {
  const blocks: string[] = [];

  for (const selector of SUBJECT_SELECTORS) {
    // Sequential on purpose; the paragraph above says why.
    blocks.push(await APPROVAL_SUBJECTS[selector].formatPending(db, limit));
  }

  return blocks.join('\n\n');
}

/**
 * Whichever function the command named, run against the database
 * given, rendered.
 *
 * The two rulings share a body because they differ in nothing but the
 * writer they call, and the two gates share it because a subject is
 * a registry entry rather than a branch. What separates any of them
 * is written at the four writers, and repeating it in a dispatch
 * would be a further account of one decision.
 *
 * Nothing is asked of the arguments here. `parseApproveArgs` above
 * has already established that a ruling names exactly one row id in
 * exactly one gate this tool has, and that `list` names neither —
 * which is what leaves this with a database call and a renderer per
 * branch.
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
    return formatAllPending(db, PENDING_LIST_LIMIT);
  }

  const subject = APPROVAL_SUBJECTS[command.subject];
  const report = command.command === 'approve'
    ? await subject.approve(db, command.id)
    : await subject.reject(db, command.id);

  if (report === null) {
    throw new ApproveRulingError(command.command, subject.label, command.id);
  }

  return report;
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
 * `bun scripts/approve.ts list` reads both queues, while a test
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
