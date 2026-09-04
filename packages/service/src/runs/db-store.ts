/**
 * @packageDocumentation
 * The drizzle half of {@link RunStore}: one statement per method,
 * six methods, over the two tables the runs and spend surfaces read
 * — `runs` and `llm_calls`, both from `src/db/schema/runs.ts`.
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
 * port declares; this module has no such helper, for the reason
 * `src/documents/db-store.ts` gives one group over —
 * {@link RunStore} declares no writer, and a wrapper with nothing
 * to wrap is a shape inviting the next edit to supply one.
 * `runs_status_check`, `runs_scheduled_by_check` and the foreign
 * keys either table carries are mechanisms only an INSERT or an
 * UPDATE reaches, so a throw out of any statement below is a fault
 * rather than a rule — which is what the port means when it says no
 * refusal can cross it.
 *
 * The honest limit of leaving six reads unwrapped is the one
 * `src/findings/db-store.ts` states for its own: drizzle's error
 * spells `Failed query:` plus the SQL and a bound `params:` line, so
 * an untranslated failure would carry the bound values into a log
 * line through `errorHandler`'s `cause`, and the summary's two
 * window bounds are instants a caller sent. What keeps that
 * unreachable is that no read below has a mechanism — neither table
 * carries a CHECK a `SELECT` could violate, and a rule added to
 * either would arrive on a write this port does not have.
 *
 * EVERY STATEMENT PROJECTS THROUGH A NAMED COLUMN OBJECT.
 * {@link RUN_COLUMNS} is all eight columns `runs` declares, so it
 * narrows nothing today and stands ready for the ninth somebody
 * adds; {@link LLM_CALL_COLUMNS} is six of the seven on `llm_calls`,
 * `run_id` being the path a ledger row was read through rather than
 * news to the caller that sent it. `./routes.ts` hands what
 * `./service.ts` built straight to the envelope, so an unscoped
 * `select()` would put a column added to either table on the wire in
 * the commit that added it, and a column REMOVED reddens the
 * projection here rather than silently thinning a record.
 *
 * THE DAY BUCKET IS `date_trunc` AT UTC EXPLICITLY, in the
 * three-argument form, and the zone is named rather than inherited.
 * `called_at` is a `timestamptz`, so it fixes an absolute instant
 * and the truncation is what chooses a calendar to name it in; the
 * two-argument form reads whatever `TimeZone` the session carries,
 * which is a setting rather than a constant. Measured against PG 16
 * under a session set to a non-UTC zone: two calls a millisecond
 * either side of a UTC midnight land in TWO buckets under
 * `date_trunc('day', called_at, 'UTC')` and in ONE under
 * `date_trunc('day', called_at)`, with every number beside them
 * still adding up. {@link SpendBucket.day} argues why that silence
 * is the thing to design against.
 *
 * `AT TIME ZONE` IS THE REWRITE THIS DOES NOT TAKE.
 * `date_trunc('day', called_at AT TIME ZONE 'UTC')` truncates at UTC
 * too and answers a `timestamp` carrying no zone — which the driver
 * then reads in whatever zone the process runs in, so the instant a
 * caller is handed moves with the deployment even though the
 * grouping did not. The three-argument form answers a `timestamptz`
 * (measured: `pg_typeof` says `timestamp with time zone`), which is
 * what {@link SpendBucket.day} declares.
 *
 * ITS TWO LITERALS ARE SPELLED AND NOT BOUND, which is where this
 * store departs from the rule `src/findings/db-store.ts` states for
 * the payload member its category filter reads. The expression
 * appears three times — in the select list, in the `GROUP BY` and in
 * the `ORDER BY` — and drizzle renders a fresh placeholder at every
 * occurrence, so the parameterised form asks Postgres to match
 * `date_trunc($1, called_at, $2)` against
 * `date_trunc($3, called_at, $4)`. Grouping expressions are matched
 * structurally and those are two expressions: measured, Postgres
 * refuses that statement with `column "llm_calls.called_at" must
 * appear in the GROUP BY clause`, where the same statement written
 * with identical placeholders in both positions prepares cleanly.
 * Neither literal is a caller's byte — both are this module's own
 * constants — so what is given up is a parameter and not a
 * containment.
 *
 * THE JOIN IS LEFT AND IT CANNOT MULTIPLY OR DROP A ROW. `runs.id`
 * is the primary key and the predicate is an equality on it, so each
 * ledger row joins at most one run, and LEFT is what keeps the calls
 * attributed to NO run in the summary at all. Those and the calls of
 * a domain-less tick both arrive carrying a null `domain_id` and
 * land in one bucket, which is what makes the buckets' `calls` add
 * up to the number of calls the window holds — the property
 * {@link RunStore.summariseSpend} says a total taken from this
 * summary rests on. An INNER join would drop the first kind, and
 * every bucket it did answer would still be right.
 *
 * NARROWING BY DOMAIN EXCLUDES BOTH KINDS, and it does so from the
 * `WHERE` rather than from the join predicate: an equality against
 * `runs.domain_id` is false on a null-extended row, so a named
 * domain sees neither the unattributed calls nor another domain's.
 * That is correct rather than a side effect, per the port — none of
 * them is that domain's — so the summaries of every domain do NOT
 * sum to the unfiltered one, and the difference is the unattributed
 * spend.
 *
 * THE TWO SUMS COME BACK AS TEXT AND {@link toMagnitude} IS THE
 * WHOLE OF THE CONVERSION. `sum(integer)` is `bigint` in Postgres,
 * and node-postgres hands a bigint out as a string because one does
 * not fit a JavaScript number safely — which is why drizzle types
 * `sum()` as `string | null`, where {@link SpendBucket} declares
 * `number | null` — so the coercion happens once in a named
 * function rather than at whichever member a reader adds next. Its
 * honest limit is why the driver hands out a string at all: a
 * bucket totalling past `Number.MAX_SAFE_INTEGER` loses precision,
 * which is some four million maximum-sized calls landing on one
 * domain in one day.
 *
 * NULL SURVIVES THAT SUM AND IS NOT COALESCED. A `sum` over calls
 * that measured nothing is SQL NULL rather than zero, drizzle maps a
 * null driver value without consulting a decoder at all, and
 * {@link toMagnitude} answers null for it — which
 * {@link SpendBucket.promptChars} argues at length: zero is a real
 * reading here, so a coalesced bucket would report a day of calls
 * that sent nothing, with nothing left to tell the two apart.
 *
 * EVERY DESCENDING KEY SPELLS `NULLS LAST` AND THE ONE ASCENDING KEY
 * SPELLS NOTHING, which is one rule rather than an inconsistency:
 * NULLS LAST is already Postgres's default for `ASC` and the
 * opposite of its default for `DESC`. The page's order is
 * `runs_domain_id_started_at_idx` read in its own direction, and
 * drizzle's index builder renders `.desc()` there as
 * `DESC NULLS LAST` with no spelling that emits the bare word — a
 * pathkey carries its nulls ordering and the planner matches it
 * literally, so the shorter form puts a `Sort` above the scan and
 * nothing reports it. That both columns are NOT NULL does not save
 * it, nothing in the planner reading the constraint to decide the
 * two are equivalent; `src/findings/db-store.ts` carries the
 * measurement this repository took against a real Postgres.
 *
 * THE OTHER TWO DESCENDING ORDERS MATCH NO INDEX AND SPELL IT
 * ANYWAY, for the reason `src/entities/db-store.ts` gives about its
 * own two page reads. `llm_calls_called_at_idx` is one column and
 * does not lead on `run_id`, so the ledger read is a filtered scan
 * bounded by the limit its caller passes, and the summary's order is
 * a sort ABOVE an aggregate where no pathkey is involved at all.
 * Spelling both fully is what makes the DDL that serves either one a
 * pure addition rather than an edit here.
 *
 * THE ASCENDING KEY IS THE ONE PLACE ON THIS STORE WHERE A NULL
 * SORTS. Every descending key above is over a NOT NULL column;
 * `runs.domain_id` reached through a LEFT JOIN is not, and `ASC`
 * already puts those buckets last, which is the order
 * {@link RunStore.summariseSpend} contracts. Spelling the qualifier
 * would render a different string for an identical order.
 *
 * ONE PREDICATE BEHIND THE PAGE AND ITS COUNT.
 * {@link RunStore.listRuns} says outright that an implementation
 * answering the two through different predicates would put a page's
 * `meta.total` at odds with the page, and {@link runWhere} is what
 * makes that impossible here rather than merely unlikely. The
 * ordering is deliberately not part of it, matching the port: a
 * count cannot be handed a sort it would have to ignore. The
 * ledger's own pair share an equality plain enough to stand twice.
 */

import type {
  LlmCallRecord,
  RunFilter,
  RunRecord,
  RunStore,
  SpendBucket,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow, TimeWindow } from '../http/schemas.js';
import type { SQL } from 'drizzle-orm';

import { and, asc, count, eq, gte, lt, sql, sum } from 'drizzle-orm';

import { llmCalls, runs } from '../db/schema.js';

/**
 * The `runs` columns {@link RunRecord} is made of, as one object
 * both reads over that table project through.
 *
 * ALL EIGHT OF THE TABLE'S COLUMNS, so this object narrows nothing
 * today; the header carries what it is for, which is the ninth
 * column somebody adds. `counts` and `errors` are the two that make
 * the naming urgent rather than tidy — both are open jsonb payloads
 * that reach the wire whole.
 *
 * ONE OBJECT BEHIND THE PAGE AND THE SINGLE GET, which is what stops
 * `GET /runs/:id` and a row of `GET /runs` drifting into different
 * shapes for the same pass.
 */
const RUN_COLUMNS = {
  id: runs.id,
  domainId: runs.domainId,
  startedAt: runs.startedAt,
  finishedAt: runs.finishedAt,
  status: runs.status,
  counts: runs.counts,
  errors: runs.errors,
  scheduledBy: runs.scheduledBy,
};

/**
 * The `llm_calls` columns {@link LlmCallRecord} is made of.
 *
 * SIX OF THE TABLE'S SEVEN, and the omission is `run_id`: the ledger
 * is read through {@link RunStore.listRunLedger}, which is addressed
 * by a run id and filters on that column, so every row it answers
 * carries the id the caller already sent. That is the rule
 * `DocumentRecord` states about the scope column it leaves out, met
 * from the same side.
 */
const LLM_CALL_COLUMNS = {
  id: llmCalls.id,
  node: llmCalls.node,
  model: llmCalls.model,
  promptChars: llmCalls.promptChars,
  estTokens: llmCalls.estTokens,
  calledAt: llmCalls.calledAt,
};

/**
 * The instant that opens the UTC day one call falls on.
 *
 * ONE VALUE READ IN THREE PLACES — the select list, the `GROUP BY`
 * and the `ORDER BY` — so the grouping key and the answered member
 * are one expression rather than three spellings that agree today.
 * The header carries why its two arguments are SQL literals rather
 * than bound parameters, and what Postgres does to the statement
 * when they are not.
 *
 * DECODED BY THE COLUMN IT TRUNCATES. `date_trunc` in this form
 * answers a `timestamptz`, which is exactly what `called_at` is, so
 * handing {@link llmCalls.calledAt} to `mapWith` reuses that
 * column's own decoder instead of declaring a second reading of one
 * driver value.
 */
const SPEND_DAY = sql`date_trunc('day', ${llmCalls.calledAt}, 'UTC')`
  .mapWith(llmCalls.calledAt);

/**
 * What one row of the spend summary is selected as.
 *
 * THE ONE PROJECTION HERE THAT IS NOT A LIST OF COLUMNS, because a
 * bucket is not a row of anything: `domain_id` is a joined column,
 * `day` is {@link SPEND_DAY}, and the last three are aggregates. It
 * is named beside the other two for the same reason they are — a
 * member added to {@link SpendBucket} reaches the wire only when
 * somebody adds it here.
 *
 * `count()` AND NOT `count(llm_calls.id)`, which is the opposite of
 * the choice `src/taxonomy/db-store.ts` makes for its own grouped
 * left join and is right for the opposite reason: there the joined
 * table is the one being counted, and here it is not. Every row
 * entering the group is a real `llm_calls` row, so there is no
 * null-extended row for the bare form to miscount, and
 * {@link SpendBucket.calls} counts calls rather than measured ones.
 */
const SPEND_COLUMNS = {
  domainId: runs.domainId,
  day: SPEND_DAY,
  calls: count(),
  promptChars: sum(llmCalls.promptChars),
  estTokens: sum(llmCalls.estTokens),
};

/**
 * One grouped row as the driver hands it over, before
 * {@link toSpendBucket} makes a {@link SpendBucket} of it.
 *
 * The two magnitudes are `string | null` and not `number | null`,
 * which is the whole reason this shape is written down: the header
 * carries why a `bigint` arrives as text, and naming the arriving
 * type is what keeps the conversion visible rather than implicit.
 */
interface SpendRow {
  /** `runs.domain_id`, null on a call the join did not attribute. */
  readonly domainId: number | null;
  /** Midnight UTC of the day, per {@link SPEND_DAY}. */
  readonly day: Date;
  /** How many rows fell in the group. */
  readonly calls: number;
  /** `sum(prompt_chars)` as text, or null when none measured. */
  readonly promptChars: string | null;
  /** `sum(est_tokens)` as text, or null when none measured. */
  readonly estTokens: string | null;
}

/**
 * The row an aggregate was supposed to return, or a refusal naming
 * the statement that came back empty.
 *
 * NOT `writtenRow`, which is what the stores with a write call the
 * same three lines: there is no write on this port, so the only
 * destructures below are two `count()`s. An aggregate `SELECT`
 * yields exactly one row on every path Postgres takes, so an empty
 * result is not a case to handle — it is a state this module has no
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
    throw new Error(`run store: ${statement} returned no row`);
  }

  return row;
}

/**
 * One summed magnitude as {@link SpendBucket} declares it.
 *
 * NULL IN IS NULL OUT, and that is the member's whole contract: a
 * bucket in which nothing measured an axis answers null rather than
 * the zero a real reading of nothing sent would give. `Number('')`
 * is `0` and `Number(null)` is `0`, so a conversion written as a
 * bare coercion would answer the wrong one of those two silently.
 *
 * @param total - What `sum()` answered: the digits of a `bigint`, or
 *   null when the group held no measured call.
 * @returns The same total as a number, or null.
 */
function toMagnitude(total: string | null): number | null {
  return total === null
    ? null
    : Number(total);
}

/**
 * One grouped row as the port answers it.
 *
 * A REBUILD MEMBER BY MEMBER RATHER THAN A SPREAD, so a column added
 * to {@link SPEND_COLUMNS} reaches a caller only when somebody adds
 * it to {@link SpendBucket} too — the rule the column objects above
 * keep for the two row reads, kept here for the one aggregate.
 *
 * @param row - The row the driver handed over.
 * @returns The bucket, with both magnitudes converted.
 */
function toSpendBucket(row: SpendRow): SpendBucket {
  return {
    domainId: row.domainId,
    day: row.day,
    calls: row.calls,
    promptChars: toMagnitude(row.promptChars),
    estTokens: toMagnitude(row.estTokens),
  };
}

/**
 * The `WHERE` one {@link RunFilter} stands for over `runs`.
 *
 * Written once because the page and its count ask the same question;
 * the header carries why answering them through two predicates would
 * put a page's `meta.total` at odds with the page.
 *
 * AN ABSENT MEMBER IS NO PREDICATE AT ALL, which is the whole of
 * `GET /runs` unfiltered: every pass the service has made, the
 * domain-less ticks included. A filter that quietly dropped them
 * would make the page disagree with the table about how much work
 * has been done, and the maintenance passes are exactly the rows a
 * reader goes looking for after something stopped happening.
 *
 * A NAMED DOMAIN EXCLUDES THEM BY THE COMPARISON AND NOT BY A
 * BRANCH: `domain_id = $1` is UNKNOWN on a null row, so a tick is
 * out of one domain's page for the same reason it is out of any
 * other's.
 *
 * @param filter - What to narrow to. An omitted member widens.
 * @returns The equality, or undefined for every run. drizzle drops
 *   an undefined `where`, so the unnarrowed page issues no
 *   predicate.
 */
function runWhere(filter: RunFilter): SQL | undefined {
  return filter.domainId === undefined
    ? undefined
    : eq(runs.domainId, filter.domainId);
}

/**
 * The `WHERE` one {@link RunFilter} and one window stand for over
 * the joined ledger.
 *
 * THE WINDOW IS HALF-OPEN, `[sinceInclusive, untilExclusive)`, which
 * is `>=` on the lower bound and `<` on the upper. A store writing
 * `<=` on the upper is a bug no type could report, and two adjacent
 * windows would then both take the seam a caller paging through time
 * crosses most often. Neither bound is re-checked for order or for
 * span: `./spend-service.ts` defaults an absent window to a declared
 * number of days and refuses an inverted or over-wide one before a
 * store is reached.
 *
 * EITHER BOUND MAY STILL BE NULL, that being what the shared type
 * admits, and a null one is no predicate rather than an epoch stood
 * in for it. No request arrives that way, per the port.
 *
 * THE DOMAIN NARROWS THROUGH THE JOINED COLUMN, `llm_calls` carrying
 * none of its own — and it sits here rather than in the join
 * predicate, which is what makes it exclude the unattributed calls
 * instead of keeping them.
 *
 * @param filter - What to narrow to. An omitted member widens.
 * @param window - The span over `called_at`.
 * @returns The conjunction, or undefined when nothing narrows at
 *   all.
 */
function spendWhere(
  filter: RunFilter,
  window: TimeWindow,
): SQL | undefined {
  const since = window.sinceInclusive;
  const until = window.untilExclusive;

  return and(
    filter.domainId === undefined
      ? undefined
      : eq(runs.domainId, filter.domainId),
    since === null
      ? undefined
      : gte(llmCalls.calledAt, since),
    until === null
      ? undefined
      : lt(llmCalls.calledAt, until),
  );
}

/**
 * Builds the {@link RunStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and exactly six
 *   methods — all six reads, with no seventh and no escape hatch,
 *   per {@link RunStore}. It holds no state of its own, so building
 *   a second one over the same thunk is free and equivalent.
 */
export function createDbRunStore(getDb: () => Db): RunStore {
  return {
    /**
     * One window of the passes the service has made, narrowed and
     * ordered newest first.
     *
     * THE ORDER IS PART OF THE CONTRACT, per the port: Postgres
     * promises nothing about row order without an `ORDER BY`, so two
     * requests for consecutive pages over an unordered read can
     * repeat one row and skip another while every count on the wire
     * still adds up. Both descending keys spell `NULLS LAST`, and
     * the header carries what the shorter form costs silently.
     *
     * THE TIEBREAK IS NOT OPTIONAL AND THE TIE IS THE SERVER'S.
     * `started_at` defaults to `now()`, the transaction's start
     * time, so passes opened by one tick tie to the microsecond and
     * a page boundary falling inside that tie would show one run
     * twice and another never.
     *
     * NEWEST FIRST, because the page is read to see what just
     * happened: an ascending order would put the first pass a
     * long-running deployment ever made on page one forever.
     *
     * EVERY RUN BY DEFAULT, THE DOMAIN-LESS TICKS INCLUDED, per
     * {@link runWhere}. There is no spelling that answers those
     * alone, and that is {@link RunFilter.domainId} being an
     * optional `number` rather than a decision taken here.
     *
     * READS RUNS AND WRITES NONE — there is no statement here that
     * could open a pass, close one or move a status, the read-first
     * law being structural rather than kept.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. A window past the end, a deployment
     * that has run nothing and an id no domain carries are all an
     * empty list rather than an error.
     */
    async listRuns(
      filter: RunFilter,
      window: StoreWindow,
    ): Promise<readonly RunRecord[]> {
      return await getDb().select(RUN_COLUMNS)
        .from(runs)
        .where(runWhere(filter))
        .orderBy(
          sql`${runs.startedAt} desc nulls last`,
          sql`${runs.id} desc nulls last`,
        )
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many runs the same filter selects, ignoring any window.
     *
     * The same {@link runWhere} the page read through — one
     * predicate behind both is what makes a page's `meta.total`
     * describe the page's own collection here rather than by
     * coincidence.
     *
     * `count()` and not `count(runs.id)`, matching
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
    async countRuns(filter: RunFilter): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(runs)
        .where(runWhere(filter));

      return countedRow(row, 'countRuns').total;
    },

    /**
     * One pass by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * WHERE EVERY `GET /runs/:id` REQUEST ENTERS, and it takes no
     * domain: a domain is met by slug and everything else on this
     * surface is written by its id.
     *
     * A NULL {@link RunRecord.domainId} ON THE ANSWER IS THE
     * ORDINARY READING for a maintenance tick rather than a row that
     * failed to resolve. Null from this METHOD is the other thing
     * entirely — no run carries that id — and it is the fact
     * `./service.ts` decides a 404 from.
     */
    async findRunById(id: number): Promise<RunRecord | null> {
      const [row] = await getDb().select(RUN_COLUMNS)
        .from(runs)
        .where(eq(runs.id, id));

      return row ?? null;
    },

    /**
     * The head of one run's ledger: its model calls newest first,
     * cut at the limit its caller passes.
     *
     * THE LIMIT IS THE CALLER'S AND THE CUT IS NOT SILENT.
     * `./service.ts` passes `RUN_LEDGER_CAP`, reads
     * {@link RunStore.countRunLedger} beside this and answers a
     * truncation flag from the two, so nothing here chooses a limit
     * of its own — which would answer a short list with nothing
     * saying it was short.
     *
     * NEWEST FIRST, SO THE CUT DROPS THE OLDEST END. That is why the
     * order is the contract rather than a presentation choice: a
     * read that forgot to order would cut an arbitrary subset and
     * report the same count beside it. The tiebreak is not optional
     * either — `called_at` defaults to the transaction's start time
     * and this table has no unique key above it to separate calls
     * ledgered together.
     *
     * NO INDEX SERVES THIS AND THE ORDER SPELLS `NULLS LAST`
     * ANYWAY, per the header: `llm_calls_called_at_idx` does not
     * lead on `run_id`, so this is a filtered scan bounded by the
     * limit, and spelling the order fully leaves the DDL that would
     * serve it a pure addition.
     *
     * A CALL NAMING NO RUN IS UNREACHABLE HERE, whatever id is asked
     * for: `run_id = $1` is UNKNOWN on such a row.
     * {@link RunStore.summariseSpend} is the one method that sees
     * them.
     */
    async listRunLedger(
      runId: number,
      limit: number,
    ): Promise<readonly LlmCallRecord[]> {
      return await getDb().select(LLM_CALL_COLUMNS)
        .from(llmCalls)
        .where(eq(llmCalls.runId, runId))
        .orderBy(
          sql`${llmCalls.calledAt} desc nulls last`,
          sql`${llmCalls.id} desc nulls last`,
        )
        .limit(limit);
    },

    /**
     * How many calls one pass ledgered, ignoring any limit.
     *
     * THE FULL COUNT IS WHAT MAKES THE CUT REPORTABLE, per the port:
     * it is the number the service answers beside the capped list
     * and compares against the cap.
     *
     * The same equality the ledger read through, spelled again
     * rather than shared: one comparison on a primary-key column is
     * plainer written twice than reached through a helper, and the
     * header records the choice against the page's own pair.
     *
     * An id no run carries answers zero, and so does a pass that
     * called nothing: the two are one fact from this method's side,
     * and {@link RunStore.findRunById} is what separates them.
     */
    async countRunLedger(runId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(llmCalls)
        .where(eq(llmCalls.runId, runId));

      return countedRow(row, 'countRunLedger').total;
    },

    /**
     * The ledger inside one window, aggregated into one bucket per
     * domain per UTC day, in ONE statement.
     *
     * COUNTS AND MAGNITUDES, NEVER CURRENCY. `llm_calls` carries no
     * price, rate or amount column, so there is nothing behind a
     * cost for a bucket to answer and no member here is named for
     * one.
     *
     * THE GROUP IS THE JOINED DOMAIN AND {@link SPEND_DAY}, the same
     * expression the select list answers and the order sorts by —
     * one value read in three places rather than three spellings
     * Postgres has to agree are the same.
     *
     * EVERY ROW IN THE WINDOW IS COUNTED, which is the property that
     * stops a total taken from this summary under-reporting: the
     * LEFT JOIN keeps the calls of a domain-less tick and the calls
     * attributed to no run at all, and both land in the null bucket.
     * The header carries why an INNER join would drop the second
     * kind while every bucket it did answer stayed right.
     *
     * A BUCKET EXISTS BECAUSE CALLS LANDED IN IT. There is no row
     * for a day nothing was called on and none for a domain that
     * made no calls — `GROUP BY` emits a group only where rows are,
     * and a store inventing empty buckets would be answering a
     * calendar it was never told which of.
     *
     * READS THE LEDGER AND WRITES NOTHING, on the terms every method
     * above keeps.
     */
    async summariseSpend(
      filter: RunFilter,
      window: TimeWindow,
    ): Promise<readonly SpendBucket[]> {
      const rows = await getDb().select(SPEND_COLUMNS)
        .from(llmCalls)
        .leftJoin(runs, eq(runs.id, llmCalls.runId))
        .where(spendWhere(filter, window))
        .groupBy(runs.domainId, SPEND_DAY)
        .orderBy(sql`${SPEND_DAY} desc nulls last`, asc(runs.domainId));

      return rows.map(toSpendBucket);
    },
  };
}
