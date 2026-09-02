/**
 * @packageDocumentation
 * The drizzle half of {@link TopicStore}: one statement per method,
 * over the `topics` table `src/db/schema/scheduling.ts` declares.
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
 * DELETE AND THE SCHEDULE WRITE INCLUDED — and those two are why the
 * rule is worth stating rather than reading off the port. Nothing in
 * schema v2 points at `topics`, so {@link TopicStore.deleteTopic} has
 * no mechanism that can refuse it; `next_run_at` sits under no CHECK
 * and no trigger, so {@link TopicStore.updateTopicSchedule} has none
 * either and the port says outright that it throws nothing. Both go
 * through the wrapper anyway, because what the alternative risks is
 * not an untranslated error but a REQUEST-CONTENT LEAK. Both links
 * of the error drizzle throws carry the caller's bytes: the
 * `DrizzleQueryError` spells `Failed query:` plus the SQL and the
 * bound `params:` line, and the pg `DatabaseError` under it spells
 * `Key (domain_id, name)=(<the submitted name>) already exists.`
 * `errorHandler` logs an unhandled error with its `cause`, so an
 * untranslated refusal would put a submitted topic name — and,
 * through the `params:` line, the whole term list submitted beside
 * it — in a log line with no code change anywhere. A `StoreRefusal`
 * from `src/db/store-errors.ts` carries neither, structurally. So
 * the wrapper is a containment boundary that also classifies, and a
 * constraint added to this table later inherits it rather than
 * having to discover it.
 *
 * TWO MECHANISMS ARE LIVE AND THEY CANNOT FIRE AT ONCE.
 * `topics_domain_id_name_unique` refuses a name the domain already
 * carries, on an INSERT and on an UPDATE alike, since `name` is
 * patchable. `topics_domain_id_domains_id_fk` refuses a `domainId`
 * naming no domain, and only the insert can reach it: `TopicPatch`
 * carries no `domainId` for an update to touch. The table has no
 * CHECK and no trigger — the interval bounds are clamped by a writer
 * and constrain nothing at the database, which `schedulableColumns()`
 * states in as many words — so a `check-violation` out of any method
 * below would be a fault rather than a rule. `./store.ts` records why
 * there is no refusal ORDER for this module to translate: the unique
 * key opens on the very column the foreign key constrains, so a write
 * naming a domain that is not there can duplicate nothing.
 *
 * EVERY READ AND EVERY WRITE PROJECTS THROUGH {@link TOPIC_COLUMNS},
 * and on this table that is load-bearing rather than tidy. `topics`
 * does not declare its schedulable columns: it spreads
 * `schedulableColumns()` from `src/db/schema/scheduling.ts`, which
 * `export_subscriptions` spreads as well. A column added to that ONE
 * helper — for a scheduling mode nobody in this directory is
 * thinking about — therefore lands on this table with no file here
 * edited at all. An unscoped `select()` or a bare `.returning()`
 * would put it on every record this store answers, and
 * `src/topics/routes.ts` hands a record straight to `ok()`, so it
 * would reach the wire in the commit that added it. Naming the nine
 * columns means it reaches no caller until somebody puts it on
 * {@link TopicRecord} deliberately, and a column REMOVED from the
 * helper reddens this projection rather than silently thinning the
 * record. The `RETURNING` lists project through the same object the
 * `SELECT`s do, which is what stops a read and a write drifting into
 * different shapes.
 *
 * NOTHING HERE STAMPS A TIMESTAMP, and that is what makes an empty
 * patch a branch in this module rather than a statement. `topics`
 * carries no `created_at` and no `updated_at` — its only temporal
 * column is the due time, which no patch may write — so a patch
 * naming no member leaves genuinely nothing to set, and drizzle
 * throws `No values to set` on an empty update list rather than
 * issuing a harmless statement. {@link TopicStore.updateTopic}
 * declares that call legal and owes the stored row, so this reads
 * instead of writing. `src/personas/db-store.ts` carries the same
 * branch for the same reason; `src/domains/db-store.ts` needs none,
 * because `domains` has a stamp to write.
 */
import type {
  InsertTopicInput,
  TopicPatch,
  TopicRecord,
  TopicStore,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { asc, count, eq } from 'drizzle-orm';

import { topics } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The `topics` columns {@link TopicRecord} is made of, as one object
 * every `SELECT` and every `RETURNING` below projects through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the
 * table. Four of the nine are the table's own and five arrive by the
 * `schedulableColumns()` spread, which is the reason the header
 * gives for naming them at all rather than selecting the table.
 */
const TOPIC_COLUMNS = {
  id: topics.id,
  domainId: topics.domainId,
  name: topics.name,
  searchTerms: topics.searchTerms,
  intervalSeconds: topics.intervalSeconds,
  nextRunAt: topics.nextRunAt,
  enabled: topics.enabled,
  minIntervalSeconds: topics.minIntervalSeconds,
  maxIntervalSeconds: topics.maxIntervalSeconds,
};

/**
 * The row a write was supposed to return, or a refusal naming the
 * statement that came back empty.
 *
 * An insert with a `RETURNING` list yields exactly one row on every
 * path Postgres takes, so an empty result is not a case to handle —
 * it is a state this module has no account of. Under
 * `noUncheckedIndexedAccess` the destructure is `T | undefined`
 * regardless, so the choice is between a refusal naming the
 * statement that produced nothing and a cast pretending the question
 * never arose.
 *
 * @param row - The destructured first row of a `RETURNING` result.
 * @param statement - What was being written, for the message.
 * @returns The row, narrowed.
 * @throws Error When the write returned no row at all.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`topic store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link TopicStore} lets cross it.
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
 * The siblings in `src/domains/db-store.ts`,
 * `src/taxonomy/db-store.ts` and `src/personas/db-store.ts` are the
 * same three lines and are deliberately not imported, for the reason
 * the last of those states: each drizzle store is reached only from
 * inside its own directory, so importing one from another would be
 * the first edge between two groups' data layers, bought for three
 * lines.
 */
async function refusing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw classifyPgError(err) ?? err;
  }
}

/**
 * One topic by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members ask this same question: the lookup every
 * request naming `/topics/:id` enters through, and the row an empty
 * patch is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The {@link TopicRecord.id} to read.
 * @returns The row, or null. Null is neither an error nor a refusal:
 *   it is the fact the service decides a 404 from.
 */
async function selectTopicById(
  db: Db,
  id: number,
): Promise<TopicRecord | null> {
  const [row] = await db.select(TOPIC_COLUMNS)
    .from(topics)
    .where(eq(topics.id, id));

  return row ?? null;
}

/**
 * Builds the {@link TopicStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and at most
 *   one. It holds no state of its own, so building a second one over
 *   the same thunk is free and equivalent.
 */
export function createDbTopicStore(getDb: () => Db): TopicStore {
  return {
    /**
     * One window of one domain's topics, ordered by `name` ascending
     * because {@link TopicStore.listTopics} makes the order part of
     * the contract: Postgres promises nothing about row order
     * without an `ORDER BY`, so consecutive pages over an unordered
     * read can repeat one row and skip another while every count on
     * the wire still adds up. `name` is unique WITHIN the domain and
     * this read is scoped to one domain, so the order is total and
     * there is no tie-break to forget.
     *
     * Ordered by name rather than by `next_run_at`, which the port
     * argues at length: a due time is nullable, non-unique and
     * MOVES, so a page over it is a page over a collection the
     * dispatcher reorders underneath it.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. An id no domain carries reads as an
     * empty list, which is the same answer as a domain with no
     * topics: whether the domain exists was settled by the slug
     * lookup before this call.
     */
    async listTopics(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly TopicRecord[]> {
      return await getDb().select(TOPIC_COLUMNS)
        .from(topics)
        .where(eq(topics.domainId, domainId))
        .orderBy(asc(topics.name))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * `SELECT count(*) FROM topics WHERE domain_id = $1`, with no
     * window: a page's total describes the collection rather than
     * the page, which is why the port keeps this separate from the
     * read above rather than answering it alongside.
     *
     * `count()` and not `count(topics.id)`, which is the opposite of
     * the choice `src/taxonomy/db-store.ts` makes for its grouped
     * category list and is right for the same reason: there is no
     * LEFT JOIN in this statement, so every row counted is a real
     * row and the bare form has no null-extended row to miscount.
     *
     * drizzle maps the result with `Number`, so what arrives is a JS
     * number rather than the string the pg driver hands back for a
     * `bigint`. An id no domain carries answers zero rather than
     * failing: nothing points at a row that is not there.
     */
    async countTopics(domainId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(topics)
        .where(eq(topics.domainId, domainId));

      return writtenRow(row, 'countTopics').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where every request naming `/topics/:id` enters, and where the
     * two schedule verbs get the facts their rules turn on: a
     * run-now reads `enabled` off this row and a pause reads
     * `nextRunAt` and both bounds. It is also the only thing saying
     * which domain an addressed topic belongs to, since the path
     * names none.
     */
    async findTopicById(id: number): Promise<TopicRecord | null> {
      return await selectTopicById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id is the database's own and the stored
     * defaults are the ones actually stored.
     *
     * THE ROW LANDS UNSCHEDULED, and that falls out of the statement
     * rather than out of a decision taken here: `next_run_at` is
     * absent from the `values` list because {@link InsertTopicInput}
     * carries no member that could fill it, and the column has no
     * default, so Postgres stores NULL. Scheduling the topic is a
     * second, separate act through
     * {@link TopicStore.updateTopicSchedule} — the one-writer rule
     * the port makes structural.
     *
     * Every other member IS spelled, `searchTerms` and `enabled`
     * included, even though both columns default. The port requires
     * them so that the two implementations cannot disagree about
     * what an omission means: only one of the two has a column to
     * default from, and `src/topics/service.ts` supplies the empty
     * list and the `true` where a test can reach the choice.
     *
     * ASSERTS A NEW ROW AND DOES NOT UPSERT, unlike
     * `scripts/seed-apply.ts`, which writes this same table through
     * an `ON CONFLICT` on this same natural key. The port carries
     * the argument: a `POST` is a caller stating the domain has no
     * topic on the subject yet, so a duplicate is a refusal rather
     * than a silent rewrite of terms and a cadence somebody tuned.
     *
     * Both of this table's mechanisms can refuse it and both arrive
     * as a `StoreRefusal`: `topics_domain_id_name_unique` on a name
     * the domain already carries, and
     * `topics_domain_id_domains_id_fk` on a `domainId` naming no
     * row. Neither name is shared with another method here, so a
     * service reads both off the refusal without knowing which call
     * it made.
     */
    async insertTopic(input: InsertTopicInput): Promise<TopicRecord> {
      const [row] = await refusing(() => getDb().insert(topics)
        .values({
          domainId: input.domainId,
          name: input.name,
          searchTerms: [...input.searchTerms],
          intervalSeconds: input.intervalSeconds,
          enabled: input.enabled,
          minIntervalSeconds: input.minIntervalSeconds,
          maxIntervalSeconds: input.maxIntervalSeconds,
        })
        .returning(TOPIC_COLUMNS));

      return writtenRow(row, 'insertTopic');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, which the port
     * declares a legal call and the header explains: `topics` has no
     * timestamp for a write to stamp, so a patch naming no member
     * leaves drizzle with an empty `set` list and it throws `No
     * values to set` rather than issuing a no-op statement.
     *
     * THE GUARD READS THE `set` LIST ITSELF rather than a second
     * list of member names beside it, which is the one place this
     * module departs from `src/personas/db-store.ts`. That store
     * tests two patch members in a condition; this table's patch has
     * six, and a seventh added to {@link TopicPatch} would have to
     * be remembered in two places — where forgetting it means an
     * update carrying only the new member silently takes the READ
     * branch and answers the unwritten row. Building the values
     * first and asking whether drizzle would find anything in them
     * leaves one list, and it is the list the statement actually
     * carries.
     *
     * NEVER WRITES `next_run_at`, WHATEVER IT IS HANDED, because
     * {@link TopicPatch} declares no member that could carry one —
     * the containment expressed as a type rather than as a check
     * this module could forget.
     *
     * ABSENT AND `null` ARE DIFFERENT REQUESTS on the two bounds and
     * the statement keeps them apart without a branch: drizzle drops
     * every `undefined` value from a `set` list before rendering it,
     * so an omitted bound never reaches the SQL and the stored value
     * stands, while an explicit `null` is written and clears it.
     * `searchTerms` is copied on the way in and REPLACES the stored
     * list whole, because a `set` list assigns a jsonb column rather
     * than merging into it.
     *
     * THE NAME IS PATCHABLE, which is what puts
     * `topics_domain_id_name_unique` on this method: a rename can
     * collide exactly as a create can, and the database checks the
     * RESULTING pair without this method having to compute it. A row
     * is not in conflict with itself, so writing a topic's own name
     * back over it is accepted. No `foreign-key-violation` can
     * arrive here: {@link TopicPatch} does not carry `domainId`, so
     * no update touches the constrained column.
     *
     * Null rather than a throw when no row carries the id. Reachable
     * even after a successful read, since the row may go in between,
     * and what that means is the caller's to decide.
     */
    async updateTopic(
      id: number,
      patch: TopicPatch,
    ): Promise<TopicRecord | null> {
      const db = getDb();
      const values = {
        name: patch.name,
        searchTerms: patch.searchTerms === undefined
          ? undefined
          : [...patch.searchTerms],
        intervalSeconds: patch.intervalSeconds,
        enabled: patch.enabled,
        minIntervalSeconds: patch.minIntervalSeconds,
        maxIntervalSeconds: patch.maxIntervalSeconds,
      };

      if (Object.values(values).every((value) => value === undefined)) {
        return await selectTopicById(db, id);
      }

      const [row] = await refusing(() => db.update(topics)
        .set(values)
        .where(eq(topics.id, id))
        .returning(TOPIC_COLUMNS));

      return row ?? null;
    },

    /**
     * `UPDATE topics SET next_run_at = $1 WHERE id = $2`, and that
     * is the whole statement: the one write on this store permitted
     * to reach the column, writing nothing else.
     *
     * Both halves are the port's and neither is re-decided here. The
     * `set` list carries one member because the signature takes one
     * instant rather than a patch object, so there is no member for
     * a second column to be added to later; and there is no other
     * method taking a due time, so the column has exactly one door.
     *
     * TAKES THE INSTANT AND TAKES NO VIEW OF IT. No clock is read,
     * nothing is clamped, `enabled` is not consulted and the stored
     * due time is not compared against. All four are
     * `src/topics/service.ts`'s, because all four are decisions: the
     * clock is injected there so a test can fix it, the clamp is
     * `clampIntervalSeconds`'s so the rule stays written once, and
     * the two refusals — a run-now against a disabled row, a pause
     * against an unscheduled one — are statuses a rule chose rather
     * than facts a database reported.
     *
     * THE INSTANT NEEDS NO COPYING HERE, unlike in
     * `tests/helpers/memory-research-store.ts`, which copies it on
     * the way in so a service holding the `Date` it passed cannot go
     * on moving stored state through it. A timestamp crossing the
     * driver is serialised on the way in and parsed fresh on the way
     * out, so the record this answers shares nothing with the
     * argument. `withTimezone` is on at the column, so what comes
     * back is the same instant however the two clocks are zoned.
     *
     * Wrapped in {@link refusing} even though the port declares that
     * this method throws nothing — `next_run_at` is under no CHECK
     * and no trigger — for the containment reason the header gives
     * rather than for a classification this statement can produce.
     *
     * Null rather than a throw when no row carries the id, with the
     * same shape and the same reachability as the patch above. The
     * whole record comes back so a route can answer the stored row
     * rather than echo what it sent, which is what lets a caller
     * read the instant that actually landed.
     */
    async updateTopicSchedule(
      id: number,
      nextRunAt: Date,
    ): Promise<TopicRecord | null> {
      const [row] = await refusing(() => getDb().update(topics)
        .set({ nextRunAt })
        .where(eq(topics.id, id))
        .returning(TOPIC_COLUMNS));

      return row ?? null;
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * NOTHING HANGS OFF A TOPIC, so this delete has neither a guard
     * nor a cascade: no foreign key in schema v2 points at `topics`,
     * and the port says outright that it cannot be refused. `runs`
     * is not a counter-example — it carries no `topic_id`, so what a
     * run was about survives its topic as recorded text rather than
     * as a reference. The cascade that takes a domain's topics with
     * it runs on `topics.domain_id` from the other side, inside
     * `DomainStore.deleteDomain`, and nothing here takes part in it.
     *
     * It is wrapped in {@link refusing} anyway, per the header: a
     * bare statement here would make the one exception the place
     * where a constraint added later put a caller's bytes into a log
     * line through an untranslated `cause`.
     */
    async deleteTopic(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(topics)
        .where(eq(topics.id, id))
        .returning({ id: topics.id }));

      return removed.length > 0;
    },
  };
}
