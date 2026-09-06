/**
 * @packageDocumentation
 * The drizzle half of {@link EntityStore}: one statement per
 * method, eight methods, over the three tables the entities
 * surface reaches — `entities`, `entity_research` and
 * `research_pool`, all three from `src/db/schema/entities.ts`.
 *
 * THE DATABASE ARRIVES AS A THUNK, for the ordering reason
 * `src/domains/db-store.ts` sets out at length: the store is a
 * value `createService` is handed while the service is still
 * registering, which is BEFORE the Postgres dependency has
 * started, so a store demanding a live {@link Db} at construction
 * could not be built at the point it is needed. Every method
 * resolves the database when a caller arrives, and a caller only
 * ever arrives after start.
 *
 * TWO WRITES, AND {@link classifyPgError} SITS BEHIND BOTH —
 * including the one that can raise nothing. Of the two,
 * {@link EntityStore.updateEntity} is the only one with a
 * mechanism today, and it has two:
 * `entities_domain_id_name_norm_unique` as a `unique-violation`
 * when a rename lands on a key another subject in the same domain
 * already holds, and the `alias_of` foreign key as a
 * `foreign-key-violation` when the patch names an id no entity
 * carries. {@link EntityStore.approvePoolRow} meets neither of its
 * own table's constraints from either side:
 * `research_pool_status_check` reads a member of
 * `RESEARCH_POOL_STATUSES` and that write sets one, and
 * `research_pool_approval_check` refuses a CLOSED row carrying no
 * approval, which a write that only ever ADDS an approval cannot
 * produce. The wrapper is on it regardless, because `./store.ts`
 * declares `StoreRefusal` the one error that may cross this port
 * and because a CHECK added to that table would otherwise arrive
 * as a driver error. `src/documents/db-store.ts` declines the same
 * wrapper for a port with NO writer, which is the other side of
 * one line rather than a different rule.
 *
 * The six reads are unwrapped, as they are in
 * `src/findings/db-store.ts` and `src/topics/db-store.ts`, and the
 * honest limit of that is worth stating rather than leaving to be
 * met. drizzle's error spells `Failed query:` plus the SQL and a
 * bound `params:` line, so an untranslated failure would carry the
 * bound values into a log line through `errorHandler`'s `cause`.
 * What keeps that unreachable is that no read below has a
 * mechanism: none of the three tables carries a CHECK a `SELECT`
 * could violate, so a throw from one is a fault rather than a
 * rule. Every value bound below is an id or a window bound in any
 * case, and none of them is a caller's own bytes.
 *
 * EVERY STATEMENT PROJECTS THROUGH A NAMED COLUMN OBJECT, one per
 * table, and TWO OF THE THREE NARROW SOMETHING TODAY rather than
 * standing ready for a column somebody adds.
 * {@link RESEARCH_COLUMNS} leaves out `entity_id`, the entity
 * being the path on the one route those rows are answered under,
 * and {@link POOL_COLUMNS} leaves out `domain_id`, which no method
 * here reads; `./store.ts` argues both at the records themselves.
 * `entities` is projected WHOLE, there being nothing on that table
 * a reader of the API may not have. Naming the columns is what
 * keeps a column added to any of these tables off the wire until
 * somebody puts it on the matching record deliberately —
 * `./routes.ts` hands what `./service.ts` built straight to the
 * envelope — and a column REMOVED reddens the projection rather
 * than silently thinning the record. The two `RETURNING` lists
 * project through the same objects the reads do, which is what
 * stops a read and a write drifting into different shapes.
 *
 * THE TWO COLLECTIONS RUN OPPOSITE WAYS, per the port. Research is
 * `researched_at DESC NULLS LAST, id DESC NULLS LAST`: the table
 * accumulates rather than replacing, so what is known about a
 * subject is the head of that order. The pool is
 * `created_at ASC, id ASC`, which is `listPending` in
 * `scripts/approve.ts` member for member — a queue worked
 * top-down empties, where newest-first buries whatever has waited
 * longest.
 *
 * THE DESCENDING KEYS SPELL `NULLS LAST` AND THE ASCENDING ONES
 * SPELL NOTHING, which is one rule rather than an inconsistency:
 * NULLS LAST is already Postgres's default for `ASC` and the
 * opposite of its default for `DESC`. A pathkey carries its nulls
 * ordering and the planner matches it literally, so a statement
 * writing a bare `ORDER BY researched_at DESC` could not use an
 * index declared the way drizzle's index builder declares one —
 * it renders `.desc()` there as `DESC NULLS LAST` and offers no
 * spelling that emits the bare word — and that both columns are
 * NOT NULL does not save the shorter form, nothing in the planner
 * reading the constraint to decide the two are equivalent.
 * `src/findings/db-store.ts` carries the measurement this
 * repository took against a real Postgres.
 *
 * NEITHER COLLECTION HAS AN INDEX OF ITS OWN. Wave 3 adds six read
 * indexes and none is over `entity_research` or `research_pool`,
 * and Postgres indexes no foreign key by itself, so both page
 * reads below are a scan filtered on `entity_id`. That is a fact
 * about how little those tables hold today rather than a claim
 * they will stay small, and spelling the order fully is what makes
 * the DDL that fixes it a pure addition rather than an edit here.
 *
 * BOTH TIEBREAKS ARE LOAD-BEARING. `researched_at` and
 * `created_at` default to `now()`, the TRANSACTION's start time,
 * so rows written by one pass tie to the microsecond and a page
 * boundary falling inside a tie would show one row twice and
 * another never.
 *
 * ONE PREDICATE BEHIND EACH PAGE AND ITS COUNT.
 * {@link EntityStore.countEntityPool} says outright that an
 * implementation answering the two through different predicates
 * would put a page's `meta.total` at odds with the page, and
 * {@link researchOf} and {@link queuedAgainst} are what make that
 * impossible here rather than merely unlikely. Neither carries an
 * ordering, matching the port: a count cannot be handed a sort it
 * would have to ignore.
 *
 * THE APPROVAL IS ONE STATEMENT AND IT IS `approveById`'S.
 * {@link EntityStore.approvePoolRow} writes
 * `coalesce(approved_at, now())` and the approved status in one
 * `UPDATE`, member for member with `approveById` in
 * `scripts/approve.ts`, so the CLI and the route are one gate with
 * two clients rather than two gates that agree today. Ruling twice
 * keeps the FIRST ruling's instant rather than re-dating a search
 * already paid for, and that is a property of the STATEMENT rather
 * than of a branch: nothing here reads the stored stamp in order
 * to decide whether to write one, so there is no window between a
 * read and a write for a second ruling to land in.
 *
 * THE EMPTY PATCH READS RATHER THAN WRITES, which is a branch in
 * this module for the reason `src/personas/db-store.ts` gives for
 * its own. `entities` carries no `updated_at` — it has no
 * timestamp column at all, which `EntityRecord` records as a fact
 * about the table — so a patch naming no member leaves genuinely
 * nothing to set, and drizzle throws `No values to set` on an
 * empty update list rather than issuing a harmless statement.
 * `src/domains/db-store.ts` needs no such branch because `domains`
 * has a stamp to write. The branch is unobservable in the answered
 * row and in the stored row alike; what separates it from a write
 * setting every member back to itself is the statement TEXT, which
 * is what a probe over an instrumented client reads and what
 * nothing else can.
 */

import type {
  EntityPatch,
  EntityRecord,
  EntityResearchRecord,
  EntityStore,
  ResearchPoolRecord,
} from './store.js';
import type { Db } from '../db/index.js';
import type { ResearchPoolStatus } from '../db/schema/values.js';
import type { StoreWindow } from '../http/schemas.js';
import type { SQL } from 'drizzle-orm';

import { asc, count, eq, sql } from 'drizzle-orm';

import {
  entities,
  entityResearch,
  researchPool,
} from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The status {@link EntityStore.approvePoolRow} writes.
 *
 * Annotated against {@link ResearchPoolStatus} rather than left a
 * bare string literal, which is what `APPROVED_STATUS` in
 * `scripts/approve.ts` does for the identical write and for the
 * identical reason: the member belongs to `RESEARCH_POOL_STATUSES`
 * in `src/db/schema/values.ts`, the tuple
 * `research_pool_status_check` is generated from, so renaming it
 * there fails this file's compile instead of leaving a statement
 * the database refuses at the moment somebody is trying to clear a
 * backlog.
 */
const APPROVED_STATUS: ResearchPoolStatus = 'approved';

/**
 * The `entities` columns {@link EntityRecord} is made of, as one
 * object the three statements over that table project through.
 *
 * All six of the table's columns, so this object narrows nothing
 * today; the header carries what it is for, which is the seventh
 * column somebody adds. `attributes` is the one that makes the
 * naming urgent rather than tidy — it is an open payload and it
 * travels to the wire whole.
 */
const ENTITY_COLUMNS = {
  id: entities.id,
  domainId: entities.domainId,
  name: entities.name,
  nameNorm: entities.nameNorm,
  aliasOf: entities.aliasOf,
  attributes: entities.attributes,
};

/**
 * The `entity_research` columns {@link EntityResearchRecord} is
 * made of.
 *
 * FIVE OF THE TABLE'S SIX, and the one left out is `entity_id`:
 * the entity is the path on `GET /entities/:id/research`, so
 * answering it back would echo the request rather than report a
 * row. `src/findings/db-store.ts` projects that same column off
 * the same table for the complementary reason — a caller there
 * named a FINDING, and the entity is what the port resolved.
 *
 * A TABLE THIS STORE READS AND DOES NOT OWN. There is no insert,
 * update or delete over `entity_research` anywhere below, so the
 * collection is read-only structurally rather than by convention.
 * Those rows are `ar-research`'s to write.
 */
const RESEARCH_COLUMNS = {
  id: entityResearch.id,
  runId: entityResearch.runId,
  summary: entityResearch.summary,
  payload: entityResearch.payload,
  researchedAt: entityResearch.researchedAt,
};

/**
 * The `research_pool` columns {@link ResearchPoolRecord} is made
 * of, projected by both reads over that table and by the
 * approval's `RETURNING` list alike.
 *
 * EIGHT OF THE TABLE'S NINE, and the one left out is `domain_id`:
 * every read here is scoped by the entity, and the containment
 * check {@link EntityStore.findPoolRowById} exists for is over
 * `entity_id`, so nothing on this surface reads whose domain an
 * intention was raised under. `entity_id` IS projected, where the
 * research list drops its own parent, because that lookup takes a
 * pool id ALONE — the member is what a service holds against the
 * addressed entity before it approves anything.
 *
 * One object behind the reads and the write is what lets a ruled
 * row be read back rather than reconstructed from the argument, so
 * a caller sees the instant `coalesce` settled on rather than the
 * one this process would have guessed.
 */
const POOL_COLUMNS = {
  id: researchPool.id,
  entityId: researchPool.entityId,
  findingId: researchPool.findingId,
  status: researchPool.status,
  searchTerms: researchPool.searchTerms,
  createdAt: researchPool.createdAt,
  approvedAt: researchPool.approvedAt,
  researchedAt: researchPool.researchedAt,
};

/**
 * The row an aggregate was supposed to return, or a refusal naming
 * the statement that came back empty.
 *
 * An aggregate `SELECT` yields exactly one row on every path
 * Postgres takes, so an empty result is not a case to handle — it
 * is a state this module has no account of. Under
 * `noUncheckedIndexedAccess` the destructure is `T | undefined`
 * regardless, so the choice is between a refusal naming the
 * statement that produced nothing and a cast pretending the
 * question never arose.
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
    throw new Error(`entity store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link EntityStore} lets cross it.
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
 * The `WHERE` one subject's research stands for.
 *
 * Written once because the page and its count ask the same
 * question; the header carries why answering them through two
 * predicates would put a page's `meta.total` at odds with the
 * page. There is no filter on this collection at all, so the
 * predicate is the scope and nothing else.
 *
 * @param entityId - The subject to read about, as the path carried
 *   it. An id no entity carries selects nothing, which is an empty
 *   page and a zero rather than an error.
 * @returns The equality both statements read through.
 */
function researchOf(entityId: number): SQL {
  return eq(entityResearch.entityId, entityId);
}

/**
 * The `WHERE` one subject's queued intentions stand for.
 *
 * Written once for the reason {@link researchOf} gives, and NOT
 * narrowed to `pending`, which is where this differs from the CLI
 * listing it shares an order with: a subject's own queue is a
 * history of what was ever asked about it, and an approved or
 * closed row is the part a reader is most likely checking for.
 *
 * A ROW NAMING NO SUBJECT MATCHES NOTHING, which falls out of the
 * comparison rather than out of a branch: `entity_id` is nullable
 * and an equality against NULL is UNKNOWN, so an intention raised
 * from a finding nobody has attributed yet appears in no page
 * here.
 *
 * @param entityId - The subject whose intentions to select.
 * @returns The equality both statements read through.
 */
function queuedAgainst(entityId: number): SQL {
  return eq(researchPool.entityId, entityId);
}

/**
 * One subject by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members ask this same question: the lookup every
 * entity route enters through, and the row an empty patch is owed
 * without a write.
 *
 * @param db - The already resolved client, so a caller that has
 *   one in hand does not resolve it twice.
 * @param id - The {@link EntityRecord.id} to read.
 * @returns The row, or null. Null is neither an error nor a
 *   refusal: it is the fact the service decides a 404 from.
 */
async function selectEntityById(
  db: Db,
  id: number,
): Promise<EntityRecord | null> {
  const [row] = await db.select(ENTITY_COLUMNS)
    .from(entities)
    .where(eq(entities.id, id));

  return row ?? null;
}

/**
 * Builds the {@link EntityStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per
 *   method call and never at construction, which is what lets the
 *   store be built before the Postgres dependency has started; see
 *   the thunk paragraph above for why that ordering is forced.
 * @returns A store issuing at most one statement per method —
 *   exactly one everywhere except an empty patch, which reads
 *   instead of writing rather than doing both. It holds no state
 *   of its own, so building a second one over the same thunk is
 *   free and equivalent.
 */
export function createDbEntityStore(getDb: () => Db): EntityStore {
  return {
    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where every entity route enters, the path carrying an id
     * rather than a slug and this table having no natural key a
     * route could address.
     *
     * THE DOMAIN COMES BACK ON THE ROW, which is what lets
     * `./service.ts` refuse an alias naming a subject in another
     * registry: nothing in the request says whose registry was
     * addressed, and {@link ENTITY_COLUMNS} projecting `domain_id`
     * is the only thing that can.
     *
     * Null rather than a throw when no row carries the id; it is
     * the fact the service decides a 404 from.
     */
    async findEntityById(id: number): Promise<EntityRecord | null> {
      return await selectEntityById(getDb(), id);
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing. ONE OF THE PORT'S TWO WRITES.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, per the header:
     * `entities` carries no timestamp column for a write to stamp,
     * so a patch naming no member leaves drizzle an empty `set`
     * list and it throws `No values to set` rather than issuing a
     * no-op statement.
     *
     * THE TEST IS AGAINST `undefined` AND NEVER AGAINST FALSINESS,
     * because two of the three members have a meaningful falsy
     * value: `attributes` of `{}` clears the payload whole, and an
     * `aliasOf` of `null` clears the pointer back to a row that is
     * its own subject. Absent is the only thing that means leave
     * it alone, which is the three-request shape `EntityPatch`
     * declares. Past the branch that costs nothing anyway —
     * drizzle drops every `undefined` value from a `set` list
     * before rendering it, so the statement writes exactly the
     * members the caller named and the stored values stand.
     *
     * THE NAME MOVES AS A PAIR OR NOT AT ALL, and that is
     * `EntityNamePatch`'s doing rather than a rule checked here: a
     * patch carrying one half is not a request this method can be
     * handed, so no statement below can leave the registry
     * matching on a key no spelling of the name reduces to.
     * Nothing here reduces a name either, which keeps
     * `normalizeEntityName` in `src/lib/entity-name-norm.ts` the
     * single definition that column asked for.
     *
     * A PRESENT `attributes` REPLACES THE STORED PAYLOAD WHOLE,
     * because a `set` list assigns a jsonb column rather than
     * merging into it — the whole-unit rule {@link EntityPatch}
     * states, and one nothing here has to enforce separately.
     *
     * BOTH OF THIS PORT'S MECHANISMS ARE ON THIS STATEMENT and
     * both arrive as a `StoreRefusal`:
     * `entities_domain_id_name_norm_unique` as a
     * `unique-violation` when a rename lands on a key another
     * subject in the same domain already holds, and the `alias_of`
     * foreign key as a `foreign-key-violation` when the patch
     * names an id no entity carries. The database checks the
     * RESULTING pair without this method having to compute it, and
     * a row is not in conflict with itself, so writing a subject's
     * own key back over it is accepted. The two alias rules the
     * database does NOT hold — a row pointing at itself, and one
     * pointing into another domain — are refused by
     * `./service.ts` before this port is called.
     *
     * Null rather than a throw when no row carries the id.
     * Reachable even after a successful read, since the row may go
     * in between, and what that means is the caller's to decide.
     */
    async updateEntity(
      id: number,
      patch: EntityPatch,
    ): Promise<EntityRecord | null> {
      const db = getDb();
      const values = {
        name: patch.name?.display,
        nameNorm: patch.name?.norm,
        attributes: patch.attributes,
        aliasOf: patch.aliasOf,
      };

      if (Object.values(values).every((value) => value === undefined)) {
        return await selectEntityById(db, id);
      }

      const [row] = await refusing(() => db.update(entities)
        .set(values)
        .where(eq(entities.id, id))
        .returning(ENTITY_COLUMNS));

      return row ?? null;
    },

    /**
     * One window of what has been found out about a subject,
     * newest first: `researched_at` descending with `id`
     * descending breaking a tie, both spelled `NULLS LAST`.
     *
     * THE ORDER IS PART OF THE CONTRACT, per the port: Postgres
     * promises nothing about row order without an `ORDER BY`, so
     * two requests for consecutive pages over an unordered read
     * can repeat one row and skip another while every count on the
     * wire still adds up. The header carries why both descending
     * keys carry the qualifier and what a bare `DESC` costs
     * silently.
     *
     * THE TIEBREAK IS NOT OPTIONAL AND THE TIE IS THE SERVER'S.
     * `researched_at` defaults to `now()`, the transaction's start
     * time, so passes recorded together tie to the microsecond.
     *
     * READS A TABLE THIS PORT DOES NOT WRITE — there is no
     * statement anywhere below that could record a pass, the
     * ratify-and-never-research split being structural rather than
     * kept. Summaries and payloads come back AS STORED.
     *
     * The window arrives already validated, per the port, so
     * nothing here re-checks its bounds. A window past the end, a
     * subject nothing has researched and an id no entity carries
     * are all an empty list rather than an error.
     */
    async listEntityResearch(
      entityId: number,
      window: StoreWindow,
    ): Promise<readonly EntityResearchRecord[]> {
      return await getDb().select(RESEARCH_COLUMNS)
        .from(entityResearch)
        .where(researchOf(entityId))
        .orderBy(
          sql`${entityResearch.researchedAt} desc nulls last`,
          sql`${entityResearch.id} desc nulls last`,
        )
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many passes have been recorded about a subject, ignoring
     * any window.
     *
     * The same {@link researchOf} the page read through — one
     * predicate behind both is what makes a page's `meta.total`
     * describe the page's own collection here rather than by
     * coincidence.
     *
     * `count()` and not `count(entityResearch.id)`, matching
     * `src/topics/db-store.ts` and for its reason: there is no
     * LEFT JOIN in this statement, so every row counted is a real
     * row and the bare form has no null-extended row to miscount.
     *
     * NO WINDOW AND NO ORDERING, which the port states as claims
     * rather than leaves to be inferred: a page's total describes
     * the collection and not the page, and an ordering cannot
     * change how many rows a predicate selects.
     *
     * drizzle maps the result with `Number`, so what arrives is a
     * JS number rather than the string the pg driver hands back
     * for a `bigint`. An id no entity carries answers zero rather
     * than failing: nothing points at a row that is not there.
     */
    async countEntityResearch(entityId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(entityResearch)
        .where(researchOf(entityId));

      return countedRow(row, 'countEntityResearch').total;
    },

    /**
     * One window of the intentions queued against a subject,
     * OLDEST first: `created_at` ascending with `id` ascending
     * breaking a tie.
     *
     * `listPending` IN `scripts/approve.ts` MEMBER FOR MEMBER, bar
     * that listing's narrowing to `pending`. A queue worked
     * top-down empties; a newest-first one buries whatever has
     * waited longest behind every intention raised since.
     *
     * NEITHER ASCENDING KEY CARRIES A NULLS QUALIFIER, and that is
     * the same rule the research read's `NULLS LAST` follows
     * rather than an exception to it: NULLS LAST is already what
     * `ASC` means to Postgres, so spelling it would render a
     * different string for an identical order.
     *
     * THE TIEBREAK IS NOT OPTIONAL. `created_at` defaults to
     * `now()`, the transaction's start time, so every intention a
     * single pass raised carries the same value to the microsecond
     * and timestamptz stores nothing finer.
     *
     * NO ROUTE ON THIS WAVE CALLS IT, per the port's own header,
     * which records the departure rather than smoothing it over.
     *
     * A subject nothing has queued, an id no entity carries and a
     * window past the end are all an empty list.
     */
    async listEntityPool(
      entityId: number,
      window: StoreWindow,
    ): Promise<readonly ResearchPoolRecord[]> {
      return await getDb().select(POOL_COLUMNS)
        .from(researchPool)
        .where(queuedAgainst(entityId))
        .orderBy(asc(researchPool.createdAt), asc(researchPool.id))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * How many intentions stand against a subject, in any state
     * and ignoring any window.
     *
     * The same {@link queuedAgainst} the page read through, for
     * the reason {@link countEntityResearch} gives one collection
     * over, and `count()` rather than a counted column for the
     * same reason again.
     *
     * NO ROUTE ON THIS WAVE CALLS IT either.
     */
    async countEntityPool(entityId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(researchPool)
        .where(queuedAgainst(entityId));

      return countedRow(row, 'countEntityPool').total;
    },

    /**
     * One intention by primary key, whatever subject it names.
     *
     * UNSCOPED ON PURPOSE, AND THAT IS WHAT MAKES THE CONTAINMENT
     * RULE DECIDABLE ONE LAYER UP. A read scoped to the entity
     * would answer null for `no such row` and for `not this
     * subject's row` alike, which are a `404` for different
     * reasons and only one of which is honest. So this answers the
     * row, and `./service.ts` holds
     * {@link ResearchPoolRecord.entityId} against the addressed
     * entity before it looks at anything else.
     *
     * Null rather than a throw when no intention carries the id.
     */
    async findPoolRowById(id: number): Promise<ResearchPoolRecord | null> {
      const [row] = await getDb().select(POOL_COLUMNS)
        .from(researchPool)
        .where(eq(researchPool.id, id));

      return row ?? null;
    },

    /**
     * Rules in favour of one intention: the approved status and
     * `coalesce(approved_at, now())`, in ONE statement. THE PORT'S
     * SECOND AND LAST WRITE.
     *
     * `approveById` IN `scripts/approve.ts` MEMBER FOR MEMBER, so
     * the CLI and the route are one gate with two clients rather
     * than two gates that agree today.
     *
     * IDEMPOTENT BY CONSTRUCTION RATHER THAN BY A BRANCH. The
     * stored stamp is read INSIDE the statement that rewrites it,
     * so a second ruling keeps the first one's instant and there
     * is no window between a read and a write for another ruling
     * to land in. `now()` is the server's clock and the
     * transaction's start time, not this process's — so approvals
     * written together tie to the microsecond, with `id` breaking
     * the tie exactly as `created_at` needs it broken.
     *
     * NOTHING IS ASKED OF THE ROW'S STATE. An id naming a row
     * already closed moves its status back to approved without
     * moving `approved_at`, and `research_pool_approval_check`
     * permits that: the constraint holds the two timestamps
     * against each other and never consults the status column.
     * Whether a closed row may be ratified AT ALL is `RULING_ACTS`
     * in `src/approvals/ruling.ts`, decided one layer up.
     *
     * IT RATIFIES AND NEVER RESEARCHES. Two columns of one row
     * move and nothing else does: no `entity_research` row is
     * written, and `researched_at` is not touched from here at all
     * — which is why this write cannot reach that CHECK from
     * either side, and why {@link refusing} sits on it against a
     * mechanism that does not exist yet rather than one it does.
     *
     * THE STATUS IS BOUND RATHER THAN SPELLED INTO THE SQL, as the
     * id is: drizzle renders a `set` value and an `eq` alike as a
     * placeholder, so nothing here builds SQL text out of a
     * value. The `coalesce` is the one fragment that is SQL, and
     * it names a column rather than carrying anything a caller
     * chose.
     *
     * The row is read back through {@link POOL_COLUMNS} rather
     * than reconstructed from the argument, so a caller sees the
     * instant `coalesce` settled on. The four members
     * `describeRuling` reads are on it, so a service can project
     * the ruling without a second read.
     *
     * Null rather than a throw when no row carries the id. An id
     * that never existed and one deleted since it was read are
     * indistinguishable here, and both say the same thing: there
     * was nothing to rule on.
     */
    async approvePoolRow(id: number): Promise<ResearchPoolRecord | null> {
      const [row] = await refusing(() => getDb().update(researchPool)
        .set({
          approvedAt: sql`coalesce(${researchPool.approvedAt}, now())`,
          status: APPROVED_STATUS,
        })
        .where(eq(researchPool.id, id))
        .returning(POOL_COLUMNS));

      return row ?? null;
    },
  };
}
