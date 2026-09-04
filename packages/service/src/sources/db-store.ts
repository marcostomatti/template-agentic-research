/**
 * @packageDocumentation
 * The drizzle half of {@link SourceStore}: the `sources` table
 * `src/db/schema/sources.ts` declares, plus the two other tables
 * this port reads without ever writing — `documents`, for the
 * parse-status aggregate and the review queue, and
 * `finding_sightings`, for the second half of the delete guard.
 *
 * THE DATABASE ARRIVES AS A THUNK, for the ordering reason
 * `src/domains/db-store.ts` sets out at length: the store is a value
 * `createService` is handed while the service is still registering,
 * which is BEFORE the Postgres dependency has started, so a store
 * demanding a live {@link Db} at construction could not be built at
 * the point it is needed. Every method resolves the database when a
 * caller arrives, and a caller only ever arrives after start.
 *
 * EVERY WRITE IS TRANSLATED THROUGH {@link classifyPgError}, THE
 * DELETE INCLUDED — and on this table the delete is the method
 * that needs it most rather than the one it is stretched to cover.
 * Three foreign keys point at `sources.id` and every one of them
 * emits `ON DELETE no action`, so all three refuse; `./store.ts`
 * carries which two the guard counts and why the third does not.
 *
 * What the alternative risks is a REQUEST-CONTENT LEAK rather than
 * an untranslated error, and `src/domains/db-store.ts` carries that
 * argument in full: both links of the error drizzle throws spell the
 * caller's bytes, and `errorHandler` logs an unhandled error with
 * its `cause`. Here that would be a submitted endpoint and, through
 * the bound `params:` line, the whole parser arrangement submitted
 * beside it. A `StoreRefusal` from `src/db/store-errors.ts` carries
 * neither, structurally, so the wrapper is a containment boundary
 * that also classifies and a constraint added later inherits it.
 *
 * TWO MECHANISMS ARE LIVE ON A WRITE AND THEY SIT ON DIFFERENT
 * METHODS. `sources_kind_check` refuses a `kind` outside
 * `SOURCE_KINDS` on the INSERT and on the UPDATE alike, since `kind`
 * is patchable — which is where this store departs from
 * `src/topics/db-store.ts`, for whose table a `check-violation`
 * would be a fault rather than a rule.
 * `sources_domain_id_domains_id_fk` refuses a `domainId` naming no
 * domain, and only the insert can reach it: {@link SourcePatch}
 * carries no `domainId`. There is no unique key on this table at
 * all, so no method below can raise a `unique-violation`.
 *
 * THE FOURTH WRITER REACHES NO MECHANISM AT ALL, and
 * {@link refusing} sits on it regardless.
 * {@link SourceStore.approveAndApplyProposal} writes a status the
 * tuple `source_config_proposals_status_check` is generated from
 * names, satisfies `source_config_proposals_approval_check` by the
 * order it stamps in, and touches no constrained column on
 * `sources` — so a `StoreRefusal` out of it would be a fault rather
 * than a rule, which is what the port says outright. What the
 * wrapper buys is the containment above, and it buys it where the
 * bytes are worst: its second statement binds both proposed
 * documents whole, so an untranslated failure would spell an entire
 * parser arrangement into a log line through `errorHandler`'s
 * `cause`. `src/entities/db-store.ts` wraps the other gate's
 * approval on the same terms and records the same reasoning.
 *
 * TWO METHODS ISSUE MORE THAN ONE STATEMENT AND EVERY OTHER ONE
 * ISSUES A SINGLE STATEMENT, which is where this module departs
 * from the shape its siblings hold to. The page of sources is read
 * first, and then ONE `GROUP BY (source_id, parse_status)` over
 * exactly the ids that page returned — never a count per source,
 * which {@link SourceStore.listSourcesWithParseStats} rules out by
 * putting the aggregate on the read rather than on a second method.
 * The grouped read is skipped altogether when the page is empty, so
 * a window past the end of the collection costs one statement.
 *
 * THE OTHER IS {@link SourceStore.approveAndApplyProposal}, three
 * statements inside ONE `db.transaction`, and it is the only
 * transaction in this file. The `UNION ALL` below buys ONE SNAPSHOT
 * for a pair of numbers that would misread an operator if they came
 * from two instants; this buys ATOMICITY over a pair of TABLES,
 * which is a different thing to want and the only place here that
 * wants it. `./store.ts` argues why neither half of that write is a
 * state anybody meant on its own, and the method below carries the
 * order of the three and why neither swap is available.
 *
 * `documents_source_parse_status_idx` over (`source_id`,
 * `parse_status`) is what both of this module's `documents` readers
 * stand on, and `src/db/schema/documents.ts` carries why it is not
 * partial: a `WHERE parse_status = 'failed'` would serve the queue
 * below and leave this aggregate on a sequential scan of the corpus
 * table, which a plan that falls back reports nowhere.
 *
 * The two statements are NOT in one transaction, and what that costs
 * is worth naming rather than leaving to be met. A capture landing
 * between them is counted for a source on the page, so the aggregate
 * can be a moment newer than the row it sits beside. Nothing here
 * turns on the pair being one instant — these are health
 * readings an operator scans for the feed that has stopped working
 * — and a transaction bought for them would hold a snapshot
 * open across the corpus table for the length of a page render.
 *
 * THE AGGREGATE IS FOLDED INTO A RECORD BUILT FROM
 * `DOCUMENT_PARSE_STATUSES` AND THEN FILLED, never accumulated as
 * the grouped rows are walked. A status carrying no rows contributes
 * NO ROW to a `GROUP BY`, so a source that has captured nothing
 * comes back from that statement as nothing at all, and a source
 * whose captures all parsed comes back with no `failed` group. Let
 * either absence reach a caller and `0` and never-counted become one
 * value — the trap {@link ParseStatusCounts} names and
 * `DomainDependentCounts` in `src/domains/store.ts` records over a
 * different read. Initialising from the tuple is what supplies the
 * counted zero without a second query asking which statuses exist.
 *
 * THE DEPENDENT COUNT IS ONE `UNION ALL` READ BY LABEL, the shape
 * `src/domains/db-store.ts` uses for its three tables and for the
 * same two reasons: one statement rather than two round trips, and
 * one snapshot, so the two numbers a `409` reports cannot come from
 * different instants. {@link countedTotal} reads them by label
 * because `UNION ALL` promises no order without an `ORDER BY`.
 *
 * NOTHING HERE WRITES A `documents` ROW, and the absence is the
 * read-only rule rather than a description of it. Three of the
 * thirteen methods touch that table — the aggregate above, the
 * queue and its count — and none is an insert, an update or a
 * delete.
 *
 * ALL THREE PROJECTIONS NAME THEIR COLUMNS, and for different
 * reasons. {@link SOURCE_COLUMNS} names all twelve of the table's
 * columns, so a column added to `sources` reaches no caller until
 * somebody puts it on {@link SourceRecord} deliberately —
 * `src/sources/routes.ts` hands a record straight to `ok()`.
 * {@link PROPOSAL_COLUMNS} names all ten of its table's on the same
 * terms, and answers a record that is deliberately WHOLE:
 * {@link SourceConfigProposalRecord} argues that an operator rules
 * on exactly what will be written. {@link FAILURE_COLUMNS} names
 * five of the fifteen `documents` carries, and there the scoping is
 * the record's own subject, which {@link SourceFailureRecord} sets
 * out.
 *
 * THE PROPOSALS HALF READS AND WRITES `source_config_proposals`,
 * which is the fourth table this module touches and the second it
 * writes. Three of those four methods read — the pending queue,
 * its count, and the unscoped lookup a ruling resolves through —
 * and the fourth rules and applies.
 *
 * `source_config_proposals_source_id_status_idx` over (`source_id`,
 * `status`) is what the queue and its count stand on, and both
 * spell an equality on BOTH of its columns so the pair is a key
 * rather than a filter applied to a scan. `proposed_at` is
 * deliberately not in that index and `src/db/schema/sources.ts`
 * argues why at length; what it costs here is that the ORDER BY
 * sorts what the index found rather than reading it out in order,
 * which is bounded by how many proposals one feed can have waiting
 * at once.
 *
 * THE QUEUE'S ASCENDING KEYS SPELL NO NULLS QUALIFIER AND THE
 * FAILURES QUEUE'S DESCENDING ONES SPELL `NULLS LAST`, which is one
 * rule rather than an inconsistency: NULLS LAST is already
 * Postgres's default for `ASC` and the opposite of its default for
 * `DESC`. `src/entities/db-store.ts` carries the measurement, and
 * both orders here are over NOT NULL columns in any case.
 *
 * THE APPLIER IS IMPORTED RATHER THAN RESTATED, and it is the only
 * value this module takes from a sibling. `proposalToSourceUpdate`
 * in `./config-proposer.ts` is what turns an approved row into the
 * two columns an approval authorizes and it answers the SET clause
 * itself, so nothing spread here can widen what was agreed to.
 * Reading `parserConfig` and `contract` off the row instead would
 * make this a second applier, and the refusal standing between an
 * unruled proposal and the columns every later pass reads would be
 * restated once per implementation rather than being one function
 * both go through. `tests/helpers/memory-research-store.ts` makes
 * its single call into `src/` for the same reason, and
 * {@link SourceStore.approveAndApplyProposal} assigns the function
 * to statement 2 by name.
 *
 * NOTHING HERE STAMPS A TIMESTAMP, which is what makes an empty
 * patch a branch in this module rather than a statement. `sources`
 * carries no `created_at` and no `updated_at` — its two stamps
 * are outcomes the pipeline writes and no patch may reach — so a
 * patch naming no member leaves genuinely nothing to set, and
 * drizzle throws `No values to set` on an empty update list.
 * `src/topics/db-store.ts` and `src/personas/db-store.ts` carry the
 * same branch; `src/domains/db-store.ts` needs none, because
 * `domains` has a stamp to write.
 */
import type {
  InsertSourceInput,
  ParseStatusCounts,
  SourceConfigProposalRecord,
  SourceDependentCounts,
  SourceFailureRecord,
  SourcePatch,
  SourceRecord,
  SourceStore,
  SourceWithParseStats,
} from './store.js';
import type { Db } from '../db/index.js';
import type {
  DocumentParseStatus,
  ResearchPoolStatus,
} from '../db/schema/values.js';
import type { StoreWindow } from '../http/schemas.js';
import type { SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';

import { DOCUMENT_PARSE_STATUSES } from '../db/schema/values.js';
import {
  documents,
  findingSightings,
  sourceConfigProposals,
  sources,
} from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

import { proposalToSourceUpdate } from './config-proposer.js';

/**
 * The `sources` columns {@link SourceRecord} is made of, as one
 * object every `SELECT` and every `RETURNING` below projects
 * through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the
 * table. Five of the twelve are the pipeline-owned columns
 * {@link SourceRecord} answers and no input type carries, so this
 * object is also where the read half of that asymmetry is spelled.
 */
const SOURCE_COLUMNS = {
  id: sources.id,
  domainId: sources.domainId,
  kind: sources.kind,
  endpoint: sources.endpoint,
  parserConfig: sources.parserConfig,
  contract: sources.contract,
  cursor: sources.cursor,
  consecutiveFailures: sources.consecutiveFailures,
  lastSuccessAt: sources.lastSuccessAt,
  lastFailureAt: sources.lastFailureAt,
  enabled: sources.enabled,
  flagged: sources.flagged,
};

/**
 * The `documents` columns {@link SourceFailureRecord} is made of.
 *
 * Five of the fifteen that table carries, and the narrowing is the
 * record's subject rather than a trim for size — see the header,
 * and {@link SourceFailureRecord} for why `parse_status` and
 * `source_id` are absent from a queue that filters on both.
 */
const FAILURE_COLUMNS = {
  id: documents.id,
  url: documents.url,
  body: documents.body,
  parseError: documents.parseError,
  capturedAt: documents.capturedAt,
};

/**
 * The `source_config_proposals` columns
 * {@link SourceConfigProposalRecord} is made of, as one object the
 * three reads and both `RETURNING` lists below project through.
 *
 * All ten of the table's columns, so this object narrows nothing
 * today — the header carries what naming them is for, which is the
 * eleventh column somebody adds. That the record is WHOLE is its
 * own decision rather than this file's:
 * {@link SourceConfigProposalRecord} argues that an approval is an
 * approval OF THESE TWO DOCUMENTS, so a projection describing them
 * instead of carrying them would make the ruling a ruling about
 * something else.
 *
 * The reads and the write project through one object, which is what
 * stops them drifting into different shapes.
 */
const PROPOSAL_COLUMNS = {
  id: sourceConfigProposals.id,
  domainId: sourceConfigProposals.domainId,
  sourceId: sourceConfigProposals.sourceId,
  parserConfig: sourceConfigProposals.parserConfig,
  contract: sourceConfigProposals.contract,
  proposedBy: sourceConfigProposals.proposedBy,
  status: sourceConfigProposals.status,
  proposedAt: sourceConfigProposals.proposedAt,
  approvedAt: sourceConfigProposals.approvedAt,
  appliedAt: sourceConfigProposals.appliedAt,
};

/**
 * The status the review queue reads, spelled once.
 *
 * Annotated with {@link DocumentParseStatus} rather than left as a
 * bare literal, so the value is checked against
 * `DOCUMENT_PARSE_STATUSES` at compile time: a member renamed in
 * that tuple reddens here instead of leaving two statements
 * filtering on a status the CHECK no longer admits.
 */
const FAILED_STATUS: DocumentParseStatus = 'failed';

/**
 * The status the pending queue selects on.
 *
 * Annotated on {@link FAILED_STATUS} above's terms, one tuple over:
 * the member belongs to `RESEARCH_POOL_STATUSES` in
 * `src/db/schema/values.ts`, which
 * `source_config_proposals_status_check` is generated from, so a
 * member renamed there reddens here instead of leaving both queue
 * readers filtering on a status no row can carry — which reports an
 * empty backlog rather than an error.
 *
 * NAMED FOR ITS TABLE rather than spelled `PENDING_STATUS`, which
 * is what `scripts/approve.ts` and
 * `tests/helpers/memory-research-store.ts` both call the identical
 * value. {@link FAILED_STATUS} above is a `DocumentParseStatus`, and
 * two bare `*_STATUS` constants over different tuples in one file
 * would read as one vocabulary.
 */
const PENDING_PROPOSAL_STATUS: ResearchPoolStatus = 'pending';

/**
 * The status {@link SourceStore.approveAndApplyProposal} writes.
 *
 * Annotated and named on {@link PENDING_PROPOSAL_STATUS}'s terms.
 * What the annotation heads off differs on this side, exactly as
 * `scripts/approve.ts` records over the same pair: a READ against a
 * member that no longer exists reports an empty queue, where a
 * WRITE of one is refused by the CHECK at the moment somebody is
 * trying to clear a backlog.
 */
const APPROVED_PROPOSAL_STATUS: ResearchPoolStatus = 'approved';

/**
 * One row of the grouped parse-status read: which source, which
 * status, and how many of its documents stand at it.
 *
 * `parseStatus` is a plain `string` because that is what comes back
 * off a `text` column; {@link countedParseStatus} is where it is
 * reconciled with the tuple rather than cast. `sourceId` is nullable
 * for the same off-the-wire reason — `documents.source_id` is
 * nullable, a document handed in as a file having no feed behind it
 * — and {@link countedSourceId} is where that is met.
 */
interface ParseStatusCountRow {
  /** `documents.source_id`, as the `GROUP BY` grouped on it. */
  readonly sourceId: number | null;
  /** `documents.parse_status`, as stored. */
  readonly parseStatus: string;
  /** `count(*)` over that pair. */
  readonly total: number;
}

/**
 * One branch of the dependent-count union: which table was counted,
 * and how many rows it holds for the source.
 *
 * `dependent` is a plain `string` because it comes back off the
 * wire. Narrowing it to `keyof SourceDependentCounts` here would be
 * a claim about what Postgres returned rather than a check of it,
 * and {@link countedTotal} is where the two are actually reconciled.
 */
interface DependentCountRow {
  /** The label its branch of the union selected. */
  readonly dependent: string;
  /** `count(*)` over that table, for one `source_id`. */
  readonly total: number;
}

/**
 * The row a write was supposed to return, or a refusal naming the
 * statement that came back empty.
 *
 * An aggregate and an insert with a `RETURNING` list each yield
 * exactly one row on every path Postgres takes, so an empty result
 * is not a case to handle — it is a state this module has no
 * account of. Under `noUncheckedIndexedAccess` the destructure is
 * `T | undefined` regardless, so the choice is between a refusal
 * naming the statement and a cast pretending the question never
 * arose.
 *
 * @param row - The destructured first row of a `RETURNING` result.
 * @param statement - What was being written, for the message.
 * @returns The row, narrowed.
 * @throws Error When the write returned no row at all.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`source store: ${statement} returned no row`);
  }

  return row;
}

/**
 * A zero under every member of `DOCUMENT_PARSE_STATUSES`, as the
 * starting point the grouped counts are written into.
 *
 * BUILT FROM THE TUPLE AND NOT FROM TWO LITERALS, which is the whole
 * of what makes an uncounted status a counted zero: a member added
 * to `DOCUMENT_PARSE_STATUSES` appears here without this file being
 * edited, where a hand-written pair would leave the new status
 * silently absent from every row of every page.
 *
 * @returns A fresh mutable record, one per source, since the caller
 *   writes the counts into it.
 */
function emptyParseStats(): Record<DocumentParseStatus, number> {
  return Object.fromEntries(
    DOCUMENT_PARSE_STATUSES.map((status) => [status, 0]),
  ) as Record<DocumentParseStatus, number>;
}

/**
 * Reconciles a grouped row's status with the tuple the record is
 * keyed by.
 *
 * @param status - `documents.parse_status` as stored.
 * @returns The same value, narrowed.
 * @throws Error When the corpus holds a status
 *   `DOCUMENT_PARSE_STATUSES` does not name.
 *
 * @remarks
 * READS THE VALUE RATHER THAN CASTING IT, the choice
 * `src/taxonomy/db-store.ts` makes at `polarity` and for the same
 * reason: `documents_parse_status_check` makes a cast safe today, so
 * a comparison per grouped row costs nothing and turns a dropped
 * constraint into a loud throw instead of a record quietly gaining a
 * member no reader expects. Dropping the row instead would be worse
 * still — the counts would stop summing to the corpus and the
 * page would look exactly as it does now.
 */
function countedParseStatus(status: string): DocumentParseStatus {
  if (!(DOCUMENT_PARSE_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`source store: unknown parse status ${status}`);
  }

  return status as DocumentParseStatus;
}

/**
 * Reconciles a grouped row's source id with the page it was counted
 * for.
 *
 * @param sourceId - `documents.source_id` as the `GROUP BY` answered
 *   it.
 * @returns The same value, narrowed.
 * @throws Error When the group carries no source at all.
 *
 * @remarks
 * STRUCTURALLY UNREACHABLE, AND A THROW RATHER THAN A SKIP. The
 * column is nullable — an ingested file and a pasted body carry
 * no feed — but the grouped read is filtered by an `IN` list of
 * the page's ids, and `NULL IN (...)` is UNKNOWN in SQL rather than
 * true, so Postgres cannot answer a group whose source is absent.
 * Silently skipping such a row would make a fault in that filter
 * look like a page of sources that happen to have captured nothing.
 */
function countedSourceId(sourceId: number | null): number {
  if (sourceId === null) {
    throw new Error('source store: parse-status group carries no source');
  }

  return sourceId;
}

/**
 * Folds one grouped read into a record per source id.
 *
 * @param rows - Every group the statement answered, in whatever
 *   order, for every source on the page at once.
 * @returns The counts by source id. A source contributing no group
 *   at all is ABSENT from the map rather than present with zeros;
 *   {@link parseStatsFor} is what turns that absence into the
 *   counted zeros {@link ParseStatusCounts} requires.
 */
function parseStatsBySource(
  rows: readonly ParseStatusCountRow[],
): ReadonlyMap<number, ParseStatusCounts> {
  const bySource = new Map<number, Record<DocumentParseStatus, number>>();

  for (const row of rows) {
    const sourceId = countedSourceId(row.sourceId);
    const counts = bySource.get(sourceId) ?? emptyParseStats();

    counts[countedParseStatus(row.parseStatus)] = row.total;
    bySource.set(sourceId, counts);
  }

  return bySource;
}

/**
 * One source's aggregate, whether or not the grouped read had
 * anything to say about it.
 *
 * @param bySource - What {@link parseStatsBySource} folded.
 * @param sourceId - The row on the page being answered.
 * @returns Every member of `DOCUMENT_PARSE_STATUSES`, present. A
 *   source that has captured nothing answers a counted zero under
 *   each, which is the promise {@link ParseStatusCounts} makes and
 *   the reason this lookup has a fallback rather than a `Map.get`
 *   whose miss a caller would have to interpret.
 */
function parseStatsFor(
  bySource: ReadonlyMap<number, ParseStatusCounts>,
  sourceId: number,
): ParseStatusCounts {
  return bySource.get(sourceId) ?? emptyParseStats();
}

/**
 * Reads one dependent table's count out of the union's result.
 *
 * @param rows - What the union answered, in whatever order.
 * @param dependent - Which branch to read, spelled as the member of
 *   {@link SourceDependentCounts} it fills. Typed against that
 *   interface so a third counted table cannot be read here without
 *   the port having declared it.
 * @returns That branch's `count(*)`.
 * @throws Error When the union answered no row for this label.
 *
 * @remarks
 * KEYED BY LABEL RATHER THAN BY POSITION, because `UNION ALL`
 * promises no order at all without an `ORDER BY`. Reading the two
 * results positionally would be correct on every run that happened
 * to come back in branch order and silently attribute one table's
 * count to the other on the run that did not — on a guard whose
 * whole output is the two numbers a `409` reports.
 *
 * THE THROW IS NOT THE `0` CASE. Each branch is an aggregate with no
 * `GROUP BY`, so it answers exactly one row whatever its table
 * holds and a source with nothing hanging off it still produces two
 * rows carrying two zeros. A MISSING row therefore cannot mean "no
 * rows to count" — it means the statement did not take the shape
 * this function reads, which is the one thing
 * {@link SourceStore.countSourceDependents} may not answer as a
 * zero.
 */
function countedTotal(
  rows: readonly DependentCountRow[],
  dependent: keyof SourceDependentCounts,
): number {
  const row = rows.find((candidate) => candidate.dependent === dependent);

  if (row === undefined) {
    throw new Error(
      `source store: dependent count returned no ${dependent} row`,
    );
  }

  return row.total;
}

/**
 * Runs one statement — or, for the ruling at the foot, one
 * whole transaction — translating a Postgres refusal into the
 * one error type {@link SourceStore} lets cross it.
 *
 * @param run - The work, as a thunk rather than an already started
 *   promise, so the `try` covers the query builder's own throw as
 *   well as the driver's. Wrapping a transaction wraps its
 *   `ROLLBACK` too: drizzle rolls back and rethrows, so a refusal
 *   raised by any of the three statements is translated once, on
 *   the way out of a transaction that has already been undone.
 * @returns Whatever the statement answered.
 * @throws StoreRefusal When {@link classifyPgError} recognised the
 *   SQLSTATE, walking the `cause` chain drizzle wraps the driver
 *   error in.
 * @throws unknown Otherwise the original value, unchanged. A
 *   classifier answering `null` means "not one of the three
 *   mechanisms", never "nothing went wrong", so swallowing it here
 *   would turn a bug in this package into a silent success.
 *
 * @remarks
 * The sibling drizzle stores are the same three lines and are
 * deliberately not imported, for the reason `src/topics/db-store.ts`
 * states: each is reached only from inside its own directory, so
 * importing one from another would be the first edge between two
 * groups' data layers, bought for three lines.
 */
async function refusing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw classifyPgError(err) ?? err;
  }
}

/**
 * One source by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members ask this same question: the lookup every
 * request naming `/sources/:id` enters through, and the row an empty
 * patch is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The {@link SourceRecord.id} to read.
 * @returns The row, or null. Null is neither an error nor a refusal:
 *   it is the fact the service decides a 404 from.
 */
async function selectSourceById(
  db: Db,
  id: number,
): Promise<SourceRecord | null> {
  const [row] = await db.select(SOURCE_COLUMNS)
    .from(sources)
    .where(eq(sources.id, id));

  return row ?? null;
}

/**
 * The predicate both `documents` readers share: one source's failed
 * captures and nothing else.
 *
 * Written once so the queue and its total cannot drift into
 * describing different collections — `meta.total` on that page
 * is derived from the count, so a predicate that agreed with the
 * rows on one of the two and not the other would be a page whose own
 * header contradicted it.
 *
 * @param sourceId - The {@link SourceRecord.id} to read within.
 * @returns The `WHERE` clause, for both statements below.
 */
function failedCaptures(sourceId: number) {
  return and(
    eq(documents.sourceId, sourceId),
    eq(documents.parseStatus, FAILED_STATUS),
  );
}

/**
 * `coalesce(<column>, now())`: the stamp a ruling writes, which
 * keeps whatever instant is already there.
 *
 * BOTH OF {@link SourceStore.approveAndApplyProposal}'S STAMPS GO
 * THROUGH ONE SPELLING, which is what makes the idempotence one
 * rule rather than two that agree today. `approveById` and
 * `approveProposalById` in `scripts/approve.ts` write this same
 * expression over `approved_at`, and `EntityStore.approvePoolRow`
 * in `src/entities/db-store.ts` over the other gate's.
 *
 * IDEMPOTENT BY CONSTRUCTION RATHER THAN BY A BRANCH. The stored
 * value is read INSIDE the statement that rewrites it, so nothing
 * here reads a stamp in order to decide whether to write one and
 * there is no window between a read and a write for a second ruling
 * to land in.
 *
 * `now()` is the server's clock rather than this process's, and it
 * is the TRANSACTION's start time — so the two stamps a single
 * ruling writes carry one instant, and rows written by one pass tie
 * to the microsecond with `id` breaking the tie.
 *
 * @param column - The timestamp column to keep where it is already
 *   set.
 * @returns The `set` value, as SQL naming a column rather than
 *   carrying anything a caller chose.
 */
function keptStamp(column: PgColumn): SQL {
  return sql`coalesce(${column}, now())`;
}

/**
 * The predicate both queue readers share: one source's PENDING
 * config proposals and nothing else.
 *
 * Written once so the queue and its total cannot drift into
 * describing different collections — the argument
 * {@link failedCaptures} above makes over the other queue, and true
 * here for the same reason: `meta.total` on that page is derived
 * from the count.
 *
 * AN EQUALITY ON BOTH COLUMNS OF
 * `source_config_proposals_source_id_status_idx`, in the order that
 * index declares them, which is what puts both readers on it.
 *
 * PENDING ONLY, AND THE FILTER IS THIS MODULE'S RATHER THAN A
 * CALLER'S. There is no status parameter on either method, so
 * neither can be asked for approved or applied rows and neither can
 * become a way to page the gate's history.
 *
 * @param sourceId - The {@link SourceRecord.id} to read within.
 * @returns The `WHERE` clause, for both statements below.
 */
function pendingProposals(sourceId: number) {
  return and(
    eq(sourceConfigProposals.sourceId, sourceId),
    eq(sourceConfigProposals.status, PENDING_PROPOSAL_STATUS),
  );
}

/**
 * Builds the {@link SourceStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, with two
 *   exceptions the header argues: the list read issues a second for
 *   the whole page's parse-status aggregate, and the ruling at the
 *   foot issues three inside one transaction. The dependent count is
 *   one `UNION ALL` rather than two round trips. It holds no state
 *   of its own, so building a second one over the same thunk is free
 *   and equivalent.
 */
export function createDbSourceStore(getDb: () => Db): SourceStore {
  return {
    /**
     * One window of one domain's sources, each with its parse-status
     * aggregate, in two statements: the page, then ONE `GROUP BY
     * (source_id, parse_status)` over exactly the ids that page
     * returned.
     *
     * NEVER A QUERY PER SOURCE, which is what
     * {@link SourceStore.listSourcesWithParseStats} rules out by
     * putting the aggregate on this read rather than on a method of
     * its own. The second statement's cost is bounded by the
     * document counts of the sources on one page and by nothing
     * else, and `documents_source_parse_status_idx` is what serves
     * it.
     *
     * Ordered by `id` ascending because the port makes the order
     * part of the contract: Postgres promises nothing about row
     * order without an `ORDER BY`, so consecutive pages over an
     * unordered read can repeat one row and skip another while every
     * count on the wire still adds up. `id` rather than a natural
     * key because this table has none.
     *
     * THE EMPTY PAGE ISSUES NO SECOND STATEMENT. A window past the
     * end of the collection, a domain with no sources and an id no
     * domain carries all answer the same empty list, and there is
     * nothing to aggregate over: an `IN` list of no ids is a
     * statement asked to describe nothing.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. Whether the domain exists was
     * settled by the slug lookup before this call.
     */
    async listSourcesWithParseStats(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly SourceWithParseStats[]> {
      const db = getDb();
      const rows = await db.select(SOURCE_COLUMNS)
        .from(sources)
        .where(eq(sources.domainId, domainId))
        .orderBy(asc(sources.id))
        .limit(window.limit)
        .offset(window.offset);

      if (rows.length === 0) {
        return [];
      }

      const counted = await db.select({
        sourceId: documents.sourceId,
        parseStatus: documents.parseStatus,
        total: count(),
      })
        .from(documents)
        .where(inArray(documents.sourceId, rows.map((row) => row.id)))
        .groupBy(documents.sourceId, documents.parseStatus);
      const bySource = parseStatsBySource(counted);

      return rows.map((row) => ({
        ...row,
        parseStats: parseStatsFor(bySource, row.id),
      }));
    },

    /**
     * `SELECT count(*) FROM sources WHERE domain_id = $1`, with no
     * window: a page's total describes the collection rather than
     * the page, which is why the port keeps this separate from the
     * read above rather than answering it alongside.
     *
     * Counts SOURCES and never documents. The document counts belong
     * to the aggregate on each row; this is the number `meta.total`
     * on the page is derived from.
     *
     * `count()` and not `count(sources.id)`, which is the opposite
     * of the choice `src/taxonomy/db-store.ts` makes for its grouped
     * category list and is right for the same reason: there is no
     * LEFT JOIN here, so every row counted is a real row and the
     * bare form has no null-extended row to miscount. drizzle maps
     * the result with `Number`, and an id no domain carries answers
     * zero rather than failing.
     */
    async countSources(domainId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(sources)
        .where(eq(sources.domainId, domainId));

      return writtenRow(row, 'countSources').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where every request naming `/sources/:id` enters — the
     * patch, the delete, and the failures queue, which resolves the
     * source before it reads a document. It is also the only thing
     * saying which domain an addressed source belongs to, since the
     * path names none.
     *
     * WITHOUT THE PARSE-STATUS AGGREGATE, deliberately, per the
     * port: none of the three callers needs the counts, and counting
     * on every lookup would put a `documents` scan behind
     * `PATCH /sources/:id`.
     */
    async findSourceById(id: number): Promise<SourceRecord | null> {
      return await selectSourceById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id is the database's own and the stored
     * defaults are the ones actually stored.
     *
     * THE ROW LANDS NEVER FETCHED, and that falls out of the
     * statement rather than out of a decision taken here: the five
     * pipeline-owned columns are absent from the `values` list
     * because {@link InsertSourceInput} carries no member that could
     * fill one, so `cursor` and both stamps store NULL,
     * `consecutive_failures` its zero and `flagged` its false. There
     * is no way through this port to create a source claiming a
     * history it does not have.
     *
     * ALWAYS INSERTS AND CANNOT CONFLICT. `sources` carries no
     * unique key, so there is nothing for an `ON CONFLICT` to land
     * on and no `unique-violation` for a `409` to be answered from
     * — the one thing about this method a reader coming from
     * `src/topics/db-store.ts` will expect and not find. Two rows
     * naming one endpoint are ordinary rather than a fault.
     *
     * Every member IS spelled, `parserConfig`, `contract` and
     * `enabled` included, even though all three columns default, so
     * that the two implementations cannot disagree about what an
     * omission means: only one of them has a column to default from.
     *
     * The two jsonb members are passed as handed rather than copied.
     * A `values` list is serialised into the statement, so the
     * driver keeps no reference a later caller could write through
     * — the copy `tests/helpers/memory-research-store.ts` takes
     * on the way in is what an implementation holding live objects
     * needs and this one does not.
     *
     * Both of this table's write mechanisms can refuse it and both
     * arrive as a `StoreRefusal`: `sources_kind_check` on a `kind`
     * outside `SOURCE_KINDS`, and
     * `sources_domain_id_domains_id_fk` on a `domainId` naming no
     * row. Neither name is shared with another method here, so a
     * service reads both off the refusal without knowing which call
     * it made.
     */
    async insertSource(input: InsertSourceInput): Promise<SourceRecord> {
      const [row] = await refusing(() => getDb().insert(sources)
        .values({
          domainId: input.domainId,
          kind: input.kind,
          endpoint: input.endpoint,
          parserConfig: input.parserConfig,
          contract: input.contract,
          enabled: input.enabled,
        })
        .returning(SOURCE_COLUMNS));

      return writtenRow(row, 'insertSource');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, which the port
     * declares a legal call and the header explains: `sources` has
     * no timestamp for a write to stamp, so a patch naming no member
     * leaves drizzle with an empty `set` list and it throws `No
     * values to set` rather than issuing a no-op statement.
     *
     * THE GUARD READS THE `set` LIST ITSELF rather than a second
     * list of member names beside it, the shape
     * `src/topics/db-store.ts` takes and for the reason it gives: a
     * member added to {@link SourcePatch} and forgotten in a
     * separate condition would make an update carrying ONLY that
     * member take the READ branch and answer the unwritten row, with
     * no error anywhere and every type green.
     *
     * NEVER WRITES A PIPELINE-OWNED COLUMN, WHATEVER IT IS HANDED,
     * because {@link SourcePatch} declares no member that could
     * carry one — the containment expressed as a type rather
     * than as a check this module could forget. `cursor`,
     * `consecutive_failures`, both stamps and `flagged` appear
     * nowhere in the `set` list below.
     *
     * AN OMITTED MEMBER LEAVES THE STORED VALUE STANDING, because
     * drizzle drops every `undefined` value from a `set` list before
     * rendering it. No member of {@link SourcePatch} is nullable,
     * so nothing here can be cleared.
     *
     * `parserConfig` AND `contract` EACH REPLACE THE STORED DOCUMENT
     * WHOLE and are never merged into it, because a `set` list
     * assigns a jsonb column rather than merging into it. That is
     * the port's rule and the statement is where it is true: a
     * caller that omits a key from an arrangement has removed that
     * key.
     *
     * `kind` IS PATCHABLE, which is what puts `sources_kind_check`
     * on this method as well as on the insert, and the database
     * checks the RESULTING value without this method having to
     * compute it. No `foreign-key-violation` can arrive here:
     * {@link SourcePatch} does not carry `domainId`, so no update
     * touches the constrained column, and the table has no unique
     * key to violate.
     *
     * Null rather than a throw when no row carries the id.
     * Reachable even after a successful read, since the row may go
     * in between, and what that means is the caller's to decide.
     */
    async updateSource(
      id: number,
      patch: SourcePatch,
    ): Promise<SourceRecord | null> {
      const db = getDb();
      const values = {
        kind: patch.kind,
        endpoint: patch.endpoint,
        parserConfig: patch.parserConfig,
        contract: patch.contract,
        enabled: patch.enabled,
      };

      if (Object.values(values).every((value) => value === undefined)) {
        return await selectSourceById(db, id);
      }

      const [row] = await refusing(() => db.update(sources)
        .set(values)
        .where(eq(sources.id, id))
        .returning(SOURCE_COLUMNS));

      return row ?? null;
    },

    /**
     * Both dependent counts in ONE `UNION ALL`, read by label.
     *
     * The guard behind `DELETE /sources/:id`, and one statement
     * rather than two for the reason `src/domains/db-store.ts`
     * gives: one statement is one snapshot, so the two numbers a
     * `409` reports cannot come from different instants, and an
     * operator reading them is reading one moment.
     *
     * COUNTS TWO OF THE THREE REFUSING KEYS, and takes no view of
     * either number. `source_config_proposals` is deliberately not
     * counted here — `./store.ts` carries why, and why both
     * zeros is therefore not a promise the delete will land. Whether
     * a non-zero count refuses at all is `./service.ts`'s, and on
     * this resource it refuses absolutely.
     *
     * Each branch is an aggregate with no `GROUP BY`, so it answers
     * exactly one row whatever its table holds: an id no source
     * carries answers two counted zeros without a lookup in front of
     * it, as the port requires. {@link countedTotal} reads the
     * result by label and refuses to invent a missing one; see its
     * remarks for why neither the ordering nor the zero can be
     * assumed here.
     */
    async countSourceDependents(id: number): Promise<SourceDependentCounts> {
      const db = getDb();
      const counted = await unionAll(
        db.select({ dependent: sql<string>`'documents'`, total: count() })
          .from(documents)
          .where(eq(documents.sourceId, id)),
        db.select({
          dependent: sql<string>`'findingSightings'`,
          total: count(),
        })
          .from(findingSightings)
          .where(eq(findingSightings.sourceId, id)),
      );

      return {
        documents: countedTotal(counted, 'documents'),
        findingSightings: countedTotal(counted, 'findingSightings'),
      };
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * NO CASCADE ANYWHERE, which is the opposite of what
     * `DomainStore.deleteDomain` does and is the schema's decision
     * rather than this method's. All three foreign keys onto
     * `sources.id` emit `ON DELETE no action`, so this either
     * removes a row nothing references or is refused.
     *
     * THE GUARD ABOVE MAKES THE ORDINARY REFUSAL LEGIBLE AND THIS
     * STATEMENT IS WHAT MAKES IT TRUE. A service consulting only the
     * counts would be enforcing a convention; the third uncounted
     * key is the case where the difference is the only thing between
     * a request and a source a config proposal still names.
     *
     * Whichever key refuses arrives as a `foreign-key-violation`
     * `StoreRefusal` naming itself, so `./service.ts` tells the
     * counted refusal from the uncounted one by the constraint
     * rather than by guessing from a count it took earlier.
     */
    async deleteSource(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(sources)
        .where(eq(sources.id, id))
        .returning({ id: sources.id }));

      return removed.length > 0;
    },

    /**
     * One window of one source's failed captures, newest first.
     *
     * READS `documents` AND WRITES NOTHING. This method and the
     * count below are the whole of what this store does with that
     * table beyond the aggregate on the list read, and none of the
     * three is a write — the review queue is read-only
     * structurally rather than by convention.
     *
     * `failed` ROWS ONLY, and the filter is this method's rather
     * than a caller's. {@link failedCaptures} holds it once so the
     * queue and its total cannot describe different collections, and
     * there is no status parameter anywhere, so this cannot become a
     * way to page the corpus.
     *
     * THE TIEBREAK IS NOT OPTIONAL, per the port: `captured_at`
     * alone is not a total order, since a batch capture gives many
     * rows one `defaultNow()` timestamp and a tie spanning a page
     * boundary lets two pages disagree about which row they hold.
     * `id` descending closes it, descending so the tiebreak reads
     * the same direction as the sort.
     *
     * BODIES COME BACK AS STORED, unmasked and uncut.
     * `src/sources/failures-service.ts` is what replaces a control
     * byte with its text form and cuts the body to a cap, and
     * keeping that out of here is what lets it be tested against a
     * planted control byte with no database.
     */
    async listSourceFailures(
      sourceId: number,
      window: StoreWindow,
    ): Promise<readonly SourceFailureRecord[]> {
      return await getDb().select(FAILURE_COLUMNS)
        .from(documents)
        .where(failedCaptures(sourceId))
        .orderBy(desc(documents.capturedAt), desc(documents.id))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many of one source's documents stand at `failed`, ignoring
     * any window.
     *
     * The same predicate as the read above, through the same
     * {@link failedCaptures} clause, and separate from it for the
     * reason {@link SourceStore.countSources} gives: a page's total
     * describes the collection and not the page.
     *
     * THE SAME ROWS `parseStats.failed` COUNTS ON THE LIST ROUTE,
     * asked for differently and served by the same index. That
     * aggregate is answered for a page of sources so an operator can
     * see which feeds are failing; this is the total behind one
     * source's queue.
     *
     * An id no source carries answers zero rather than failing:
     * nothing points at a row that is not there.
     */
    async countSourceFailures(sourceId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(documents)
        .where(failedCaptures(sourceId));

      return writtenRow(row, 'countSourceFailures').total;
    },

    /**
     * One window of one source's PENDING config proposals, oldest
     * first.
     *
     * ONE QUEUE WITH TWO CLIENTS. The predicate and both ordering
     * keys are `listPendingProposals` in `scripts/approve.ts` member
     * for member, and `./store.ts` carries which parts of that are
     * the QUEUE and which are the CLIENT: an operator ruling from a
     * terminal and one ruling from the API have to be looking at the
     * same next row, and need not agree about how much of the
     * backlog either can see at once.
     *
     * OLDEST FIRST, BECAUSE THE QUEUE IS WORKED FROM THE TOP, which
     * is the opposite of {@link SourceStore.listSourceFailures}
     * above and right for the same reason: a failure queue is about
     * what broke most recently, and a gate about what has been
     * waiting longest.
     *
     * THE TIEBREAK IS NOT OPTIONAL, per the port. `proposed_at`
     * defaults to `now()`, which is the TRANSACTION's start time, so
     * several proposals written in one pass tie to the microsecond
     * and a tie spanning a page boundary would let two pages
     * disagree about which row they hold. `id` ascending closes it,
     * ascending so the tiebreak reads the same direction as the
     * sort.
     *
     * NEITHER KEY SPELLS A NULLS QUALIFIER and the failures queue
     * above spells one on both of its, which the header argues is
     * one rule rather than two: NULLS LAST is already Postgres's
     * default for `ASC`, so drizzle's `asc()` renders what the
     * planner wants and no `sql` fragment is needed.
     *
     * BOTH PROPOSED DOCUMENTS COME BACK AS STORED, unread and uncut.
     * The queue is what an approval is given from, so answering an
     * account of them instead would make the ruling a ruling about
     * something else. `src/sources/failures-service.ts` is where the
     * neighbouring queue's stored bytes are masked and cut; nothing
     * of the sort happens to these, and `./proposals-service.ts`
     * hands the rows on whole.
     *
     * The window arrives already validated, per the port. Whether
     * the source exists was settled by the lookup in front of this
     * call, and an id no source carries answers an empty list here
     * rather than failing.
     */
    async listPendingProposals(
      sourceId: number,
      window: StoreWindow,
    ): Promise<readonly SourceConfigProposalRecord[]> {
      return await getDb().select(PROPOSAL_COLUMNS)
        .from(sourceConfigProposals)
        .where(pendingProposals(sourceId))
        .orderBy(
          asc(sourceConfigProposals.proposedAt),
          asc(sourceConfigProposals.id),
        )
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many of one source's config proposals are waiting on a
     * ruling, ignoring any window.
     *
     * The same predicate as the read above, through the same
     * {@link pendingProposals} clause, and separate from it for the
     * reason {@link SourceStore.countSources} gives: a page's total
     * describes the collection and not the page.
     *
     * COUNTS THE QUEUE AND NOT THE TABLE. A source carrying fifty
     * applied proposals and nothing pending answers `0`, which is
     * the honest number for a backlog — what is closed is not
     * waiting on anybody.
     *
     * `count()` and not `count(sourceConfigProposals.id)`, for the
     * reason {@link SourceStore.countSources} above gives: there is
     * no LEFT JOIN here, so every row counted is a real row and the
     * bare form has no null-extended row to miscount. An id no
     * source carries answers zero rather than failing.
     */
    async countPendingProposals(sourceId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(sourceConfigProposals)
        .where(pendingProposals(sourceId));

      return writtenRow(row, 'countPendingProposals').total;
    },

    /**
     * One proposal by primary key, whatever source it names, so the
     * result is at most one row by construction rather than by a
     * `LIMIT`.
     *
     * UNSCOPED ON PURPOSE, AND THAT IS WHAT MAKES THE CONTAINMENT
     * RULE DECIDABLE ONE LAYER UP. A read scoped to the source would
     * answer null for `no such row` and for `not this source's row`
     * alike, which are a `404` for different reasons and only one of
     * which is honest; `./proposals-service.ts` holds
     * {@link SourceConfigProposalRecord.sourceId} against the
     * addressed source instead, and `./store.ts` argues it in full.
     *
     * ANY STATUS, NOT ONLY A PENDING ONE, which is what separates
     * this from the queue above beyond the window: the refusal a
     * service owes an already-applied proposal is decidable only
     * from a read that can see one.
     *
     * Null is neither an error nor a refusal — it is the fact the
     * service decides a 404 from, exactly as
     * {@link selectSourceById} above.
     */
    async findProposalById(
      id: number,
    ): Promise<SourceConfigProposalRecord | null> {
      const [row] = await getDb().select(PROPOSAL_COLUMNS)
        .from(sourceConfigProposals)
        .where(eq(sourceConfigProposals.id, id));

      return row ?? null;
    },

    /**
     * Rules in favour of one proposal AND writes its two documents
     * onto the source it names, in THREE STATEMENTS INSIDE ONE
     * `db.transaction`. THE PORT'S FOURTH WRITER, THE ONLY ONE HERE
     * THAT TOUCHES TWO TABLES, AND THE ONLY TRANSACTION IN THIS
     * FILE.
     *
     * THE ORDER OF THE THREE IS THE PORT'S RATHER THAN THIS
     * MODULE'S TASTE.
     *
     * 1. `UPDATE source_config_proposals SET status = $1,
     *    approved_at = coalesce(approved_at, now()) WHERE id = $2
     *    RETURNING ...`, which answers the row statement 2 derives
     *    from, and answers nothing when no row carries the id.
     * 2. `UPDATE sources SET parser_config = $1, contract = $2
     *    WHERE id = $3 RETURNING id`, the two columns derived from
     *    THAT returned row through `proposalToSourceUpdate` in
     *    `./config-proposer.ts`, and the id read off it too.
     * 3. `UPDATE source_config_proposals SET applied_at =
     *    coalesce(applied_at, now()) WHERE id = $1 RETURNING ...`,
     *    which is the answer.
     *
     * Each is its own prepared statement, so the numbering restarts
     * rather than running on, and drizzle orders a `set` list by the
     * table's column declaration order rather than by the object
     * literal's — which is why statement 1 writes the status first.
     *
     * NEITHER SWAP IS AVAILABLE.
     * `source_config_proposals_approval_check` refuses an
     * `applied_at` on a row carrying no `approved_at`, so stamping
     * the two the other way round is refused by the server
     * mid-transaction; and the derivation reads `approved_at`, so it
     * cannot run before statement 1 has written one.
     *
     * ONE TRANSACTION, BECAUSE THE APPROVAL AND THE SOURCE WRITE ARE
     * ONE DECISION, and `./store.ts` argues both half-states at
     * length. An approval recorded with the source unwritten leaves
     * a gate saying a config was agreed while every later pass still
     * reads the feed the old way; a source written with `applied_at`
     * unstamped is the worse half, because `sources.parser_config`
     * cannot say which proposal put it there and the only account of
     * why those two columns hold what they hold is gone. A failure
     * anywhere in the middle rolls all three statements back, which
     * leaves the state the request can be made from again.
     *
     * THE DERIVATION GOES THROUGH ONE FUNCTION, per the port and per
     * the header. `proposalToSourceUpdate` answers the SET clause
     * itself, so nothing spread here can widen what the approval
     * authorized. Its own refusal is unreachable from here —
     * statement 1 wrote the stamp it reads — and reaching it would
     * mean that statement did not do what it says. That is a fault
     * rather than a refusal of the request, so it is not a
     * `StoreRefusal` and no service catches it.
     *
     * IDEMPOTENT ON BOTH STAMPS, through the one {@link keptStamp}
     * spelling and by construction rather than by a branch. A second
     * ruling keeps the first one's instants rather than re-dating an
     * approval already given or an application already made.
     * `approveProposalById` in `scripts/approve.ts` writes
     * `approved_at` the same way and deliberately leaves
     * `applied_at` alone — the CLI rules, and this rules and
     * applies, one gate with two clients.
     *
     * NOTHING IS ASKED OF THE ROW'S STATE and nothing validates the
     * documents. Whether an already-applied proposal may be applied
     * again is `RULING_ACTS` in `src/approvals/ruling.ts`, decided
     * one layer up, and `./proposals-service.ts` answers the `409`
     * before this is called; a malformed `parser_config` somebody
     * approved anyway is written, because the approval IS the gate
     * and this is not a second one.
     *
     * THE STATUS AND EVERY ID ARE BOUND RATHER THAN SPELLED INTO THE
     * SQL, and so are the two derived documents: drizzle renders a
     * `set` value and an `eq` alike as a placeholder. The two
     * `coalesce` fragments are the only SQL text here and each names
     * a column.
     *
     * STATEMENT 2 IS COUNTED THROUGH ITS `RETURNING` LIST.
     * `source_config_proposals_source_id_sources_id_fk` emits `ON
     * DELETE no action`, so the source a proposal names cannot have
     * gone and that statement matches a row by construction — which
     * is what makes an empty result a state this module has no
     * account of rather than a race, and {@link writtenRow} the
     * answer to it. The throw rolls the transaction back, so a
     * database that had stopped holding its own keys leaves the
     * proposal unruled rather than stamped applied over a source
     * nothing was written to.
     *
     * Null rather than a throw when no row carries the id, and the
     * transaction then commits having written nothing. An id that
     * never existed and one deleted since it was read are
     * indistinguishable here, and both say the same thing: there was
     * nothing to rule on.
     *
     * The row is read back through {@link PROPOSAL_COLUMNS} rather
     * than reconstructed, so a caller sees the instants `coalesce`
     * settled on. The four members `describeRuling` in
     * `src/approvals/ruling.ts` reads are on the answer, so a
     * service can project the ruling without a second read.
     */
    async approveAndApplyProposal(
      id: number,
    ): Promise<SourceConfigProposalRecord | null> {
      return await refusing(() => getDb().transaction(async (tx) => {
        const [approved] = await tx.update(sourceConfigProposals)
          .set({
            approvedAt: keptStamp(sourceConfigProposals.approvedAt),
            status: APPROVED_PROPOSAL_STATUS,
          })
          .where(eq(sourceConfigProposals.id, id))
          .returning(PROPOSAL_COLUMNS);

        if (approved === undefined) {
          return null;
        }

        const [written] = await tx.update(sources)
          .set(proposalToSourceUpdate(approved))
          .where(eq(sources.id, approved.sourceId))
          .returning({ id: sources.id });

        writtenRow(written, 'the source update in approveAndApplyProposal');

        const [ruled] = await tx.update(sourceConfigProposals)
          .set({ appliedAt: keptStamp(sourceConfigProposals.appliedAt) })
          .where(eq(sourceConfigProposals.id, id))
          .returning(PROPOSAL_COLUMNS);

        return writtenRow(ruled, 'approveAndApplyProposal');
      }));
    },
  };
}
