/**
 * @packageDocumentation
 * The drizzle half of {@link FindingStore}: one statement per
 * method, over the four tables the findings surface reads —
 * `findings`, `finding_sightings` and `finding_labels` from
 * `src/db/schema/findings.ts`, and `entity_research` from
 * `src/db/schema/entities.ts`.
 *
 * THE DATABASE ARRIVES AS A THUNK, for the ordering reason
 * `src/domains/db-store.ts` sets out at length: the store is a value
 * `createService` is handed while the service is still registering,
 * which is BEFORE the Postgres dependency has started, so a store
 * demanding a live {@link Db} at construction could not be built at
 * the point it is needed. Every method resolves the database when a
 * caller arrives, and a caller only ever arrives after start.
 *
 * ONE WRITE, AND {@link classifyPgError} SITS BEHIND IT. Six of the
 * seven methods read, so the wrapper the sibling stores put on every
 * write has exactly one statement to cover here, and there is one
 * mechanism it can meet: `finding_labels_finding_id_findings_id_fk`
 * refuses a ruling naming no finding. The reads are unwrapped, as
 * they are in `src/topics/db-store.ts` and
 * `src/connectors/db-store.ts`, and the honest limit of that is
 * worth stating rather than leaving to be met. Both links of the
 * error drizzle throws carry the caller's bytes — the
 * `DrizzleQueryError` spells `Failed query:` plus the SQL and the
 * bound `params:` line — so an untranslated failure out of the page
 * read would put a submitted verdict and a submitted category key
 * into a log line through `errorHandler`'s `cause`. What keeps that
 * unreachable is that no read below has a mechanism: none of the
 * four tables carries a CHECK a `SELECT` could violate, so a throw
 * from one is a fault rather than a rule, and a rule added to any of
 * them would arrive on the write.
 *
 * EVERY STATEMENT PROJECTS THROUGH A NAMED COLUMN OBJECT, one per
 * table, and on this surface that is load-bearing rather than tidy.
 * `findings` carries `fields`, an open jsonb payload that travels to
 * the wire whole, and `src/findings/routes.ts` hands a record
 * straight to `ok()`; an unscoped `select()` would put a column
 * added to any of these tables on the wire in the commit that added
 * it. Naming the columns means a new one reaches no caller until
 * somebody puts it on the matching record in `./store.ts`
 * deliberately, and a column REMOVED reddens the projection rather
 * than silently thinning the record. The `RETURNING` list projects
 * through the same object the label read does, which is what stops a
 * read and a write drifting into different shapes.
 *
 * EVERY DESCENDING KEY SPELLS `DESC NULLS LAST`, on all four
 * orderings, and that is a planner fact rather than a style. Drizzle
 * renders `.desc()` on an INDEX column as `DESC NULLS LAST`, which
 * is the opposite of what the bare word means to Postgres, and no
 * spelling the index builder offers emits a bare `DESC`. A pathkey
 * carries its nulls ordering and the planner matches it literally,
 * so a statement writing `ORDER BY created_at DESC` cannot use
 * `findings_domain_id_score_created_at_idx` even though the column
 * is NOT NULL and the two orders are identical over the rows that
 * exist. Measured on PG 16 with `enable_seqscan` off: the
 * fully qualified page plans as an index-only scan, the same page
 * writing a bare `DESC` on the two NOT NULL keys degrades to an
 * incremental sort presorted on `score` alone, and a bare `DESC`
 * throughout degrades to a full sort over a bitmap scan. On `score`
 * the qualifier is load-bearing twice over, since an absent score
 * sorting LAST is what `compareFindings` says and NULLS FIRST is
 * what Postgres would otherwise do.
 *
 * THE LATEST-VERDICT FILTER IS A `DISTINCT ON` SUBQUERY AND THE
 * PREDICATE SITS OUTSIDE IT. Which row of a finding's rulings is in
 * force is settled by `DISTINCT ON (finding_id)` under
 * `ORDER BY finding_id, labelled_at DESC NULLS LAST, id DESC NULLS
 * LAST`, and the verdict is compared against what that answered.
 * Pushing the comparison INSIDE would be the exact bug
 * `FindingFilter.verdict` forbids: it would keep the latest row
 * CARRYING the asked-for verdict rather than the latest row, so a
 * finding judged one way and then re-judged another would still
 * match the verdict an operator has already moved on from — with
 * nothing raised and every count beside it agreeing. The tiebreak is
 * not optional either, `labelled_at` defaulting to the transaction's
 * start time, and the subquery's order is the one
 * `finding_labels_finding_id_labelled_at_idx` was added for.
 *
 * ONE PREDICATE BEHIND THE PAGE AND THE COUNT.
 * {@link FindingStore.listFindings} says outright that an
 * implementation answering the two through different predicates
 * would put a page's `meta.total` at odds with the page, and
 * {@link findingWhere} is what makes that impossible here rather
 * than merely unlikely. The ordering is deliberately NOT part of it,
 * matching the port: a count cannot be handed a sort it would have
 * to ignore.
 */

import type {
  FindingFilter,
  FindingLabelRecord,
  FindingRecord,
  FindingResearchRecord,
  FindingSightingRecord,
  FindingSort,
  FindingStore,
  InsertFindingLabelInput,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';
import type { SQL } from 'drizzle-orm';

import { and, count, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import {
  entityResearch,
  findingLabels,
  findingSightings,
  findings,
} from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The member of a finding's `fields` payload naming the category it
 * is filed under.
 *
 * A THIRD DECLARATION OF ONE NAME, and saying so is the honest
 * reading rather than a gap this module can close. `ar-digest`'s
 * assembly node declares `FINDING_CATEGORY_FIELD` for the same
 * string, `tests/helpers/memory-research-store.ts` declares it again
 * for the same string, and nothing in the tree exports either.
 * `./store.ts` names the digest's constant as the authority; this
 * one is what the column read is keyed on, so the two surfaces file
 * a finding under one member rather than under two that agree
 * today.
 *
 * BOUND AS A PARAMETER RATHER THAN SPELLED INTO THE SQL, which is
 * why it is a value here at all. Postgres infers `text` for an
 * untyped parameter on the right of `->>` (measured against PG 16:
 * `pg_prepared_statements` reports `{text}` for
 * `fields->>$1`, with no ambiguity against the `jsonb ->> integer`
 * overload), so the name travels as data and no statement below
 * builds SQL text out of a constant.
 */
const FINDING_CATEGORY_FIELD = 'category';

/**
 * The `findings` columns {@link FindingRecord} is made of, as one
 * object every `SELECT` over that table projects through.
 *
 * All eight of the table's columns, so this object narrows nothing
 * today; the header carries what it is for, which is the ninth
 * column somebody adds. `fields` is the one that makes the naming
 * urgent rather than tidy — it reaches the wire whole.
 */
const FINDING_COLUMNS = {
  id: findings.id,
  domainId: findings.domainId,
  documentId: findings.documentId,
  entityId: findings.entityId,
  fields: findings.fields,
  score: findings.score,
  scoreVersion: findings.scoreVersion,
  createdAt: findings.createdAt,
};

/**
 * The `finding_sightings` columns {@link FindingSightingRecord} is
 * made of.
 *
 * `findingId` is projected though the caller supplied it, per the
 * record: these rows are embedded in a single finding's answer, so
 * the member is what lets a reader — and a live case — see that the
 * rows answered are the addressed finding's, at no cost.
 */
const SIGHTING_COLUMNS = {
  id: findingSightings.id,
  findingId: findingSightings.findingId,
  sourceId: findingSightings.sourceId,
  externalId: findingSightings.externalId,
  seenAt: findingSightings.seenAt,
};

/**
 * The `finding_labels` columns {@link FindingLabelRecord} is made
 * of, projected by the read and by the write's `RETURNING` list
 * alike.
 *
 * One object behind both is what lets the appended row be read back
 * rather than reconstructed from the argument, so a caller sees the
 * id the write stamped and the instant the column defaulted.
 */
const LABEL_COLUMNS = {
  id: findingLabels.id,
  findingId: findingLabels.findingId,
  verdict: findingLabels.verdict,
  note: findingLabels.note,
  labelledAt: findingLabels.labelledAt,
};

/**
 * The `entity_research` columns {@link FindingResearchRecord} is
 * made of.
 *
 * A TABLE THIS STORE READS AND DOES NOT OWN, so the projection is
 * doing more work here than on the three above: `src/entities/`
 * declares its own record over the same table for the windowed
 * collection it serves, and a column added there has no business
 * arriving on this embedded list because somebody widened a select.
 * Nothing below writes it — there is no insert, update or delete
 * over `entity_research` anywhere on this port.
 */
const RESEARCH_COLUMNS = {
  id: entityResearch.id,
  entityId: entityResearch.entityId,
  runId: entityResearch.runId,
  summary: entityResearch.summary,
  payload: entityResearch.payload,
  researchedAt: entityResearch.researchedAt,
};

/**
 * The row a read or a write was supposed to return, or a refusal
 * naming the statement that came back empty.
 *
 * An aggregate `SELECT` yields exactly one row on every path
 * Postgres takes, and an insert with a `RETURNING` list does too, so
 * an empty result is not a case to handle — it is a state this
 * module has no account of. Under `noUncheckedIndexedAccess` the
 * destructure is `T | undefined` regardless, so the choice is
 * between a refusal naming the statement that produced nothing and a
 * cast pretending the question never arose.
 *
 * @param row - The destructured first row of a result.
 * @param statement - What was being read or written, for the
 *   message.
 * @returns The row, narrowed.
 * @throws Error When the statement returned no row at all. The
 *   message names the METHOD and never the row, which matters on
 *   this surface for the reason `src/connectors/db-store.ts` gives
 *   for its own: the error is raised where nothing has classified
 *   it, so `errorHandler` logs it whole.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`finding store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link FindingStore} lets cross it.
 *
 * @param run - The statement, as a thunk rather than an already
 *   started promise, so the `try` covers the query builder's own
 *   throw as well as the driver's.
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
 * The keys one {@link FindingSort} orders by, written out.
 *
 * `compareFindings` in `src/lib/digest-assemble.ts` EXPRESSED IN
 * SQL, not that comparator reached for: a library sorting JavaScript
 * objects cannot order a `LIMIT`ed read, and importing it here would
 * leave `./service.test.ts` holding a page this store answered
 * against `orderFindings` over the same rows as one authority
 * against itself. The comparison in that suite is a real one between
 * two derivations of one rule, and this is the second derivation.
 *
 * `recency` IS THE SAME ORDER WITH THE SCORE KEY DROPPED rather than
 * a second rule, which is why the two share the tail rather than
 * spelling it twice.
 *
 * Every descending key carries `NULLS LAST`, per the header: on
 * `score` because an absent score sorts LAST and not lowest, and on
 * the two NOT NULL keys because the index declares them that way and
 * a pathkey is matched literally.
 *
 * @param sort - Which ordering to answer in.
 * @returns The `ORDER BY` list, three keys for `score` and two for
 *   `recency`. Both end in `id`: `created_at` defaults to the
 *   transaction's start time, so findings written by one pass tie to
 *   the microsecond and a page boundary falling inside that tie
 *   would show a row twice.
 */
function findingOrder(sort: FindingSort): readonly SQL[] {
  const recency = [
    sql`${findings.createdAt} desc nulls last`,
    sql`${findings.id} desc nulls last`,
  ];

  return sort === 'recency'
    ? recency
    : [sql`${findings.score} desc nulls last`, ...recency];
}

/**
 * The predicate matching findings whose LATEST ruling carries one
 * verdict.
 *
 * `DISTINCT ON (finding_id)` under
 * `ORDER BY finding_id, labelled_at DESC NULLS LAST, id DESC NULLS
 * LAST` answers one row per judged finding — the one in force — and
 * the verdict is compared against THAT, outside the subquery. The
 * header carries why the comparison cannot be pushed inside, and the
 * short of it is that doing so would match a verdict an operator has
 * already moved on from.
 *
 * A FINDING CARRYING NO RULING MATCHES NOTHING, which follows rather
 * than being decided here: it contributes no row to the subquery, so
 * it is in no `IN` list any verdict could produce. Asking for
 * findings nobody has judged is a different question and
 * {@link FindingFilter} cannot express it.
 *
 * @param db - The already resolved client, needed because the
 *   subquery is built through the same builder the outer statement
 *   is.
 * @param verdict - The ruling to match, AS SUBMITTED. No vocabulary
 *   is consulted anywhere below; a verdict no label carries is an
 *   empty `IN` list and so an empty page, which
 *   {@link FindingFilter.verdict} declares correct rather than an
 *   error.
 * @returns A membership test over `findings.id`.
 */
function latestVerdictIs(db: Db, verdict: string): SQL {
  const latest = db.selectDistinctOn(
    [findingLabels.findingId],
    {
      findingId: findingLabels.findingId,
      verdict: findingLabels.verdict,
    },
  )
    .from(findingLabels)
    .orderBy(
      findingLabels.findingId,
      sql`${findingLabels.labelledAt} desc nulls last`,
      sql`${findingLabels.id} desc nulls last`,
    )
    .as('latest_label');

  const ruled = db.select({ findingId: latest.findingId })
    .from(latest)
    .where(eq(latest.verdict, verdict));

  return inArray(findings.id, ruled);
}

/**
 * The predicate matching findings filed under one category key.
 *
 * TWO FRAGMENTS RATHER THAN ONE, and the split is where the reading
 * is: the first is the member's TEXT as `->>` answers it, and the
 * second is the comparison. `->>` yields `text`, so a numeric member
 * answers its digits and a boolean answers `true` — which is what a
 * caller asking for an ordinary key never meets, and what a store
 * comparing only string members would answer an empty page for.
 *
 * @param category - The key to match, AS SUBMITTED. Compared against
 *   the STORED member rather than against a reduction of it, which
 *   `FindingFilter.category` names as the one place this filter and
 *   the digest's own filing could part.
 * @returns The comparison. A payload not carrying the member, and
 *   one carrying the JSON null, are both SQL NULL here, so neither
 *   matches any key.
 */
function categoryIs(category: string): SQL {
  const held = sql`${findings.fields}->>${FINDING_CATEGORY_FIELD}`;

  return sql`${held} = ${category}`;
}

/**
 * The `WHERE` one domain and one {@link FindingFilter} stand for.
 *
 * Written once because the page and its count ask the same question
 * and {@link FindingStore.listFindings} says outright that an
 * implementation answering the two through different predicates
 * would put a page's `meta.total` at odds with the page. One
 * function is what makes that impossible here rather than merely
 * unlikely.
 *
 * THE DOMAIN IS NOT A FILTER MEMBER and it is never omitted, per
 * {@link FindingFilter}: it names an OWNER, and every member of the
 * filter narrows a collection that is already scoped.
 *
 * THE WINDOW IS HALF-OPEN, `[sinceInclusive, untilExclusive)`, which
 * is `>=` on the lower bound and `<` on the upper. A store writing
 * `<=` on the upper is a bug no type could report, and two adjacent
 * windows would then both take the seam a caller paging through time
 * crosses most often. Neither bound is re-checked for order:
 * `timeWindowQuerySchema` refuses an inverted window before a store
 * is reached.
 *
 * THE CATEGORY READ IS `fields->>'category'` AND NOT A JOIN. No
 * column links a finding to a category, so this is a jsonb read, and
 * a member the payload does not carry — or one holding the JSON null
 * — is SQL NULL, which matches no key a caller can name. A key the
 * domain never declared is therefore an empty page rather than a
 * `404`, which {@link FindingFilter.category} argues at length.
 *
 * @param db - The already resolved client, for the verdict
 *   subquery.
 * @param domainId - The domain to read within, as
 *   `DomainStore.findDomainBySlug` resolved `:slug` into.
 * @param filter - What to narrow to. An omitted member widens.
 * @returns The conjunction. Never undefined in practice, the domain
 *   equality always being present, but typed as drizzle types `and`.
 */
function findingWhere(
  db: Db,
  domainId: number,
  filter: FindingFilter,
): SQL | undefined {
  const since = filter.window.sinceInclusive;
  const until = filter.window.untilExclusive;

  return and(
    eq(findings.domainId, domainId),
    filter.verdict === undefined
      ? undefined
      : latestVerdictIs(db, filter.verdict),
    filter.category === undefined
      ? undefined
      : categoryIs(filter.category),
    since === null
      ? undefined
      : gte(findings.createdAt, since),
    until === null
      ? undefined
      : lt(findings.createdAt, until),
  );
}

/**
 * Builds the {@link FindingStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and at most
 *   one — the research read included, which resolves a finding's
 *   entity through a join rather than through a second call. It
 *   holds no state of its own, so building a second one over the
 *   same thunk is free and equivalent.
 */
export function createDbFindingStore(getDb: () => Db): FindingStore {
  return {
    /**
     * One window of a domain's findings, narrowed and ordered.
     *
     * THE ORDER IS PART OF THE CONTRACT, per the port: Postgres
     * promises nothing about row order without an `ORDER BY`, so
     * consecutive pages over an unordered read can repeat one row
     * and skip another while every count on the wire still adds up.
     * {@link findingOrder} carries which keys and why each
     * descending one spells `NULLS LAST`.
     *
     * READS FINDINGS AND WRITES NONE. Nothing on this port inserts,
     * patches or deletes a finding, so there is no statement here
     * that could re-score one — the read-first law being structural
     * rather than kept.
     *
     * FIELDS COME BACK AS STORED, unreduced and uncut. What
     * `ar-digest` does to a payload before filing it is that
     * pipeline's, and a store imitating it would make the column
     * read {@link categoryIs} filters on unreachable.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. A window past the end, a domain
     * that has made no findings, a verdict no label carries, a
     * category key the domain never declared, a span in which
     * nothing was made, and an id no domain carries are all an empty
     * list rather than an error.
     */
    async listFindings(
      domainId: number,
      filter: FindingFilter,
      sort: FindingSort,
      window: StoreWindow,
    ): Promise<readonly FindingRecord[]> {
      const db = getDb();

      return await db.select(FINDING_COLUMNS)
        .from(findings)
        .where(findingWhere(db, domainId, filter))
        .orderBy(...findingOrder(sort))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many of a domain's findings the same filter selects,
     * ignoring any window and any ordering.
     *
     * The same {@link findingWhere} the page read through — one
     * predicate behind both is what makes a page's `meta.total`
     * describe the page's own collection here rather than by
     * coincidence.
     *
     * `count()` and not `count(findings.id)`, matching
     * `src/topics/db-store.ts` and for its reason: there is no LEFT
     * JOIN in this statement, so every row counted is a real row and
     * the bare form has no null-extended row to miscount. The
     * verdict filter's subquery is a membership test rather than a
     * join, so it cannot multiply rows either.
     *
     * NO SORT PARAMETER, which the port states as a claim: an
     * ordering cannot change how many rows a predicate selects.
     *
     * drizzle maps the result with `Number`, so what arrives is a JS
     * number rather than the string the pg driver hands back for a
     * `bigint`. An id no domain carries answers zero rather than
     * failing: nothing points at a row that is not there.
     */
    async countFindings(
      domainId: number,
      filter: FindingFilter,
    ): Promise<number> {
      const db = getDb();
      const [row] = await db.select({ total: count() })
        .from(findings)
        .where(findingWhere(db, domainId, filter));

      return writtenRow(row, 'countFindings').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where every request naming `/findings/:id` enters — the single
     * get and the verdict append alike — and it is what
     * `./verdict-service.ts` reads the owning domain off, the path
     * naming none.
     *
     * TAKES NO DOMAIN, which is the addressing rule this surface
     * keeps: a domain is met by slug and everything else is written
     * by its id. Null rather than a throw when no row carries the
     * id; it is the fact the service decides a 404 from.
     */
    async findFindingById(id: number): Promise<FindingRecord | null> {
      const [row] = await getDb().select(FINDING_COLUMNS)
        .from(findings)
        .where(eq(findings.id, id));

      return row ?? null;
    },

    /**
     * Where one finding has been seen, newest first: `seen_at`
     * descending with `id` descending breaking a tie.
     *
     * UNBOUNDED, as the port declares: these rows are embedded in a
     * single finding's answer rather than paged on their own, so
     * there is no `?page` to take and nothing here cuts them. Where
     * a cap is wanted it belongs at the service with a count beside
     * it, as `RUN_LEDGER_CAP` does one group over, rather than as a
     * silent limit inside an implementation.
     *
     * A finding seen at no feed and an id no finding carries are
     * both an empty list rather than an error.
     */
    async listFindingSightings(
      findingId: number,
    ): Promise<readonly FindingSightingRecord[]> {
      return await getDb().select(SIGHTING_COLUMNS)
        .from(findingSightings)
        .where(eq(findingSightings.findingId, findingId))
        .orderBy(
          sql`${findingSightings.seenAt} desc nulls last`,
          sql`${findingSightings.id} desc nulls last`,
        );
    },

    /**
     * One finding's rulings, newest first and WHOLE: `labelled_at`
     * descending with `id` descending breaking a tie.
     *
     * THE FIRST ROW IS THE VERDICT IN FORCE, which is what makes
     * this ordering load-bearing rather than a presentation choice.
     * The table carries no unique key at all, so re-judging appends,
     * and a read that forgot to order would report whichever row the
     * scan reached first — with nothing raised and no guarantee it
     * reaches the same one twice.
     *
     * THE TIEBREAK IS NOT OPTIONAL. `labelled_at` defaults to
     * `now()`, the transaction's start time, so two rulings written
     * in one transaction carry the same stamp to the microsecond.
     *
     * The order is `finding_labels_finding_id_labelled_at_idx`'s
     * own, and it is the order {@link latestVerdictIs} takes the row
     * in force with — one rule, two statements.
     */
    async listFindingLabels(
      findingId: number,
    ): Promise<readonly FindingLabelRecord[]> {
      return await getDb().select(LABEL_COLUMNS)
        .from(findingLabels)
        .where(eq(findingLabels.findingId, findingId))
        .orderBy(
          sql`${findingLabels.labelledAt} desc nulls last`,
          sql`${findingLabels.id} desc nulls last`,
        );
    },

    /**
     * What research has recorded about the entity one finding names,
     * newest first: `researched_at` descending with `id` descending
     * breaking a tie.
     *
     * ADDRESSED BY THE FINDING, RESOLVED THROUGH ITS ENTITY, and the
     * join is what makes that one statement rather than two. A
     * caller holding a finding does not read `entityId`, branch on
     * its nullability and address a second surface; it names the
     * finding and this reads the rest.
     *
     * AN UNATTRIBUTED FINDING ANSWERS AN EMPTY LIST, and that falls
     * out of the join rather than out of a branch: `entity_id` is
     * NULL on such a row, and an equality against NULL is UNKNOWN,
     * so no `entity_research` row joins to it. An id no finding
     * carries answers empty for the plainer reason that the `WHERE`
     * selects nothing. Neither is a failure to read.
     *
     * THE JOIN CANNOT MULTIPLY ROWS. `findings.id` is the primary
     * key and the predicate is an equality on it, so exactly one
     * finding row enters the join and the answer is one row per
     * research row.
     *
     * READS `entity_research` AND WRITES NOTHING — no insert, no
     * update, no delete over that table anywhere on this port, so
     * the embedding is read-only structurally rather than by
     * convention. Those rows are `ar-research`'s to write.
     */
    async listFindingResearch(
      findingId: number,
    ): Promise<readonly FindingResearchRecord[]> {
      const onEntity = eq(findings.entityId, entityResearch.entityId);

      return await getDb().select(RESEARCH_COLUMNS)
        .from(entityResearch)
        .innerJoin(findings, onEntity)
        .where(eq(findings.id, findingId))
        .orderBy(
          sql`${entityResearch.researchedAt} desc nulls last`,
          sql`${entityResearch.id} desc nulls last`,
        );
    },

    /**
     * Appends one ruling to a finding. THE ONE WRITE ON THIS STORE.
     *
     * APPENDS AND NEVER UPDATES. There is no upsert here and no key
     * to upsert on — `finding_labels` carries no unique key at all
     * — so a second ruling on one finding is a second row and both
     * are readable afterwards. The sequence is the record of an
     * operator changing their mind.
     *
     * TAKES THE VERDICT AS GIVEN. The owning domain's vocabulary is
     * read per request by `./verdict-service.ts`, one layer up, and
     * nothing here consults one. A store refusing a verdict on its
     * own would refuse writes the database accepts, and would move a
     * per-domain rule into the half that cannot be exercised without
     * a database.
     *
     * `labelledAt` IS NOT IN THE `values` LIST and
     * {@link InsertFindingLabelInput} has no member for it, so the
     * column defaults to `now()`. That is the containment expressed
     * as a statement as well as a type: a back-dated ruling is the
     * one thing that would make the newest row stop being the
     * verdict in force.
     *
     * `note` IS SPELLED even though the column is nullable and would
     * default, because the port requires the member: a ruling with
     * no note is `null` written out, so the two implementations are
     * handed the same three values rather than one of them
     * defaulting from a column the other does not have.
     *
     * The row is read back through {@link LABEL_COLUMNS} rather than
     * reconstructed from the argument, so a caller sees the id the
     * write stamped and the instant the column defaulted.
     *
     * ONE MECHANISM CAN REFUSE IT and it arrives as a
     * `StoreRefusal` carrying `foreign-key-violation`:
     * `finding_labels_finding_id_findings_id_fk`, on a `findingId`
     * naming no finding. The service resolves the finding first, so
     * that is a race rather than the ordinary path.
     */
    async insertFindingLabel(
      input: InsertFindingLabelInput,
    ): Promise<FindingLabelRecord> {
      const [row] = await refusing(() => getDb().insert(findingLabels)
        .values({
          findingId: input.findingId,
          verdict: input.verdict,
          note: input.note,
        })
        .returning(LABEL_COLUMNS));

      return writtenRow(row, 'insertFindingLabel');
    },
  };
}
