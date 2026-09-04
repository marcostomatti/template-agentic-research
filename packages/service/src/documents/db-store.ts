/**
 * @packageDocumentation
 * The drizzle half of {@link DocumentStore}: one statement per
 * method, two methods, over one table — `documents` from
 * `src/db/schema/documents.ts`.
 *
 * THE DATABASE ARRIVES AS A THUNK, for the ordering reason
 * `src/domains/db-store.ts` sets out at length: the store is a value
 * `createService` is handed while the service is still registering,
 * which is BEFORE the Postgres dependency has started, so a store
 * demanding a live {@link Db} at construction could not be built at
 * the point it is needed. Every method resolves the database when a
 * caller arrives, and a caller only ever arrives after start.
 *
 * NOTHING BELOW WRITES, AND SO NOTHING BELOW CLASSIFIES AN ERROR.
 * Every sibling drizzle store here wraps each write in a `refusing`
 * helper turning a recognised SQLSTATE into the `StoreRefusal` its
 * port declares; this module has no such helper, because
 * {@link DocumentStore} declares no writer and a wrapper with
 * nothing to wrap is a shape inviting the next edit to supply one.
 * `documents_parse_status_check`, `documents_hash_unique` and the
 * table's two foreign keys are mechanisms only an INSERT or an
 * UPDATE reaches, so a throw out of either statement below is a
 * fault rather than a rule — which is what the port means when it
 * says no refusal can cross it.
 *
 * The honest limit of leaving the two reads unwrapped is the one
 * `src/findings/db-store.ts` states for its own six: drizzle's error
 * spells `Failed query:` plus the SQL and a bound `params:` line, so
 * an untranslated failure would carry the bound values into a log
 * line through `errorHandler`'s `cause`. Here those are two values,
 * a domain id resolved from a slug and a parse status `./service.ts`
 * refused unless it is a member of `DOCUMENT_PARSE_STATUSES`, so
 * neither is a caller's own bytes.
 *
 * THE PROJECTION IS SEVEN OF FOURTEEN COLUMNS, and naming them is
 * load-bearing rather than tidy. `documents` carries `raw`,
 * `features`, `feature_version`, `embedding` and `embedding_model`
 * — a stored payload and two derived vectors, each of which would
 * dwarf the whole record on the wire — and `./routes.ts` hands what
 * `./service.ts` built straight to the envelope. An unscoped
 * `select()` would put those five on the wire today, and a column
 * added to this table on the wire in the commit that added it.
 * {@link DocumentRecord} states the same containment from the
 * type's side; {@link DOCUMENT_COLUMNS} is what makes it true of
 * the statement.
 *
 * BOTH DESCENDING KEYS SPELL `DESC NULLS LAST`, which the port
 * declares part of the contract rather than a detail of one
 * implementation. Drizzle renders `.desc()` on an INDEX column as
 * `DESC NULLS LAST`, the opposite of what the bare word means to
 * Postgres, and `documents_domain_id_captured_at_idx` is declared
 * that way; a pathkey carries its nulls ordering and the planner
 * matches it literally, so a statement writing a bare
 * `ORDER BY captured_at DESC` cannot use that index even though
 * neither column is nullable and the two orders are identical over
 * every row that exists. What it gets instead is a `Sort` above the
 * scan, and nothing reports it.
 *
 * THE FILTER IS A PREDICATE AND NEVER A POST-FILTER, which is a
 * claim about correctness before it is one about work. Both
 * statements compare `parse_status` in their `WHERE`, so the
 * database settles which rows exist BEFORE `LIMIT` and `OFFSET`
 * cut a window out of them. A read fetching a window and then
 * dropping the rows that do not match would answer SHORT pages — a
 * page of fifty holding three — with `meta.total` still describing
 * the whole collection, so a caller paging through would see rows
 * vanish rather than a narrowing. It would also read `raw`, both
 * vectors and every other column of every row it then discarded.
 *
 * ONE PREDICATE BEHIND THE PAGE AND THE COUNT.
 * {@link DocumentStore.listDocuments} says outright that an
 * implementation answering the two through different predicates
 * would put a page's `meta.total` at odds with the page, and
 * {@link documentWhere} is what makes that impossible here rather
 * than merely unlikely. The ordering is deliberately not part of
 * it, matching the port: a count cannot be handed a sort it would
 * have to ignore.
 */

import type {
  DocumentFilter,
  DocumentRecord,
  DocumentStore,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';
import type { SQL } from 'drizzle-orm';

import { and, count, eq, sql } from 'drizzle-orm';

import { documents } from '../db/schema.js';

/**
 * The `documents` columns {@link DocumentRecord} is made of, as one
 * object the page read projects through.
 *
 * SEVEN OF THE TABLE'S FOURTEEN, so unlike the sibling stores'
 * column objects this one narrows something today rather than
 * standing ready for a column somebody adds. The record's own TSDoc
 * carries which seven are left out and why they divide in three:
 * five for their size, `hash` because it answers a question about
 * the CORPUS rather than about a document, and `domain_id` because
 * the domain is the path.
 *
 * A COLUMN REMOVED REDDENS THIS OBJECT rather than silently
 * thinning the record, which is the half of the naming a reader
 * diffing this list against the table would not think to look for.
 */
const DOCUMENT_COLUMNS = {
  id: documents.id,
  sourceId: documents.sourceId,
  url: documents.url,
  body: documents.body,
  parseStatus: documents.parseStatus,
  parseError: documents.parseError,
  capturedAt: documents.capturedAt,
};

/**
 * The row an aggregate was supposed to return, or a refusal naming
 * the statement that came back empty.
 *
 * NOT `writtenRow`, which is what every sibling store calls the
 * same three lines: there is no write on this port, so the only
 * destructure below is a `count()`. An aggregate `SELECT` yields
 * exactly one row on every path Postgres takes, so an empty result
 * is not a case to handle — it is a state this module has no
 * account of. Under `noUncheckedIndexedAccess` the destructure is
 * `T | undefined` regardless, so the choice is between a refusal
 * naming the statement that produced nothing and a cast pretending
 * the question never arose.
 *
 * @param row - The destructured first row of an aggregate result.
 * @param statement - What was being counted, for the message.
 * @returns The row, narrowed.
 * @throws Error When the statement returned no row at all. The
 *   message names the METHOD and never the row, which matters here
 *   for the reason `src/connectors/db-store.ts` gives for its own:
 *   the error is raised where nothing has classified it, so
 *   `errorHandler` logs it whole.
 */
function countedRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`document store: ${statement} returned no row`);
  }

  return row;
}

/**
 * The `WHERE` one domain and one {@link DocumentFilter} stand for.
 *
 * Written once because the page and its count ask the same
 * question, and read by both statements below; the header carries
 * why answering them through two predicates would put a page's
 * `meta.total` at odds with the page.
 *
 * THE DOMAIN IS NOT A FILTER MEMBER and is never omitted, per
 * {@link DocumentFilter}: it names an OWNER, and the one member
 * beside it narrows a collection that is already scoped.
 *
 * AN ABSENT `parseStatus` IS BOTH STATUSES, expressed as no
 * predicate at all rather than as an `IN` list over the tuple.
 * Drizzle drops an undefined member of `and`, so an unnarrowed read
 * issues the domain equality alone — and a failed document is IN
 * that default page, which is the fail-flag-keep rule
 * `src/db/schema/documents.ts` records at the column.
 *
 * THE COMPARISON IS AGAINST THE COLUMN AS STORED. No reduction, no
 * lower-casing and no fallback for the column's `ok` default: the
 * boundary has already held the submitted value to
 * `DOCUMENT_PARSE_STATUSES`, and a store that also normalised would
 * answer rows for a spelling `./service.ts` refuses.
 *
 * @param domainId - The domain to read within, as
 *   `DomainStore.findDomainBySlug` resolved `:slug` into before
 *   either method was called.
 * @param filter - What to narrow to. An omitted member widens.
 * @returns The conjunction. Never undefined in practice, the domain
 *   equality always being present, but typed as drizzle types `and`.
 */
function documentWhere(
  domainId: number,
  filter: DocumentFilter,
): SQL | undefined {
  return and(
    eq(documents.domainId, domainId),
    filter.parseStatus === undefined
      ? undefined
      : eq(documents.parseStatus, filter.parseStatus),
  );
}

/**
 * Builds the {@link DocumentStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and exactly two
 *   methods — both reads, with no third and no escape hatch, per
 *   {@link DocumentStore}. It holds no state of its own, so building
 *   a second one over the same thunk is free and equivalent.
 */
export function createDbDocumentStore(getDb: () => Db): DocumentStore {
  return {
    /**
     * One window of a domain's corpus, narrowed and ordered.
     *
     * THE ORDER IS PART OF THE CONTRACT, per the port: Postgres
     * promises nothing about row order without an `ORDER BY`, so
     * two requests for consecutive pages over an unordered read can
     * repeat one row and skip another while every count on the wire
     * still adds up. Both descending keys spell `NULLS LAST`, and
     * the header carries what a bare `DESC` costs silently.
     *
     * THE TIEBREAK IS NOT OPTIONAL AND THE TIE IS THE SERVER'S.
     * `captured_at` defaults to `now()`, the transaction's start
     * time, so a batch capture writes rows tying to the microsecond
     * and a page boundary falling inside that tie would show one
     * document twice and another never.
     *
     * NEWEST FIRST, because the page is a debug view of what just
     * arrived: an ascending order would put the first document a
     * long-running domain ever captured on page one forever.
     *
     * READS DOCUMENTS AND WRITES NONE — there is no statement here
     * that could re-parse one or move a status, the read-first law
     * being structural rather than kept.
     *
     * BODIES COME BACK AS STORED, unmasked and uncut. `./service.ts`
     * is what replaces a control byte with its text form, cuts the
     * body at `BODY_CODE_POINT_CAP` and answers `bodyBytes` beside
     * the cut, and keeping that out of here is what lets it be
     * tested against a planted control byte with no database.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. A window past the end, a domain
     * that has captured nothing, a status no document carries and an
     * id no domain carries are all an empty list rather than an
     * error.
     */
    async listDocuments(
      domainId: number,
      filter: DocumentFilter,
      window: StoreWindow,
    ): Promise<readonly DocumentRecord[]> {
      return await getDb().select(DOCUMENT_COLUMNS)
        .from(documents)
        .where(documentWhere(domainId, filter))
        .orderBy(
          sql`${documents.capturedAt} desc nulls last`,
          sql`${documents.id} desc nulls last`,
        )
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many of a domain's documents the same filter selects,
     * ignoring any window.
     *
     * The same {@link documentWhere} the page read through — one
     * predicate behind both is what makes a page's `meta.total`
     * describe the page's own collection here rather than by
     * coincidence.
     *
     * `count()` and not `count(documents.id)`, matching
     * `src/topics/db-store.ts` and for its reason: there is no LEFT
     * JOIN in this statement, so every row counted is a real row and
     * the bare form has no null-extended row to miscount.
     *
     * NO WINDOW AND NO ORDERING, which the port states as claims
     * rather than leaves to be inferred: a page's total describes
     * the collection and not the page, and an ordering cannot change
     * how many rows a predicate selects.
     *
     * drizzle maps the result with `Number`, so what arrives is a JS
     * number rather than the string the pg driver hands back for a
     * `bigint`. An id no domain carries answers zero rather than
     * failing: nothing points at a row that is not there.
     */
    async countDocuments(
      domainId: number,
      filter: DocumentFilter,
    ): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(documents)
        .where(documentWhere(domainId, filter));

      return countedRow(row, 'countDocuments').total;
    },
  };
}
