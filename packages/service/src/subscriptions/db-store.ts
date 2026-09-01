/**
 * @packageDocumentation
 * The drizzle half of {@link SubscriptionStore}: one statement per
 * method, over the `export_subscriptions` table
 * `src/db/schema/scheduling.ts` declares.
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
 * schema v2 points at `export_subscriptions`, so
 * {@link SubscriptionStore.deleteSubscription} has no mechanism that
 * can refuse it; `next_run_at` sits under no CHECK and no trigger,
 * so {@link SubscriptionStore.updateSubscriptionSchedule} has none
 * either and the port says outright that it throws nothing. Both go
 * through the wrapper anyway, because what the alternative risks is
 * not an untranslated error but a REQUEST-CONTENT LEAK. Both links
 * of the error drizzle throws carry the caller's bytes: the
 * `DrizzleQueryError` spells `Failed query:` plus the SQL and the
 * bound `params:` line, and the pg `DatabaseError` under it spells
 * `Key (domain_id, format, connector_id)=(...) already exists.`
 * `errorHandler` logs an unhandled error with its `cause`, so an
 * untranslated refusal would put a submitted format, and the id of
 * the connector it was aimed at, into a log line with no code change
 * anywhere. A `StoreRefusal` from `src/db/store-errors.ts` carries
 * neither, structurally. So the wrapper is a containment boundary
 * that also classifies, and a constraint added to this table later
 * inherits it rather than having to discover it.
 *
 * FOUR MECHANISMS ARE LIVE AND THEY SPLIT ACROSS THE TWO WRITES,
 * read off the generated SQL rather than off the schema module.
 * `export_subscriptions_domain_id_format_connector_id_unique`
 * refuses a triple the domain already subscribes to, on an INSERT
 * and on an UPDATE alike, two thirds of the key being patchable.
 * `export_subscriptions_format_check` refuses a `format` outside
 * `EXPORT_FORMATS`, and it too reaches both writes — where
 * `src/connectors/db-store.ts` reaches its own CHECK on the insert
 * alone, `connectors.kind` being unpatchable for the reason that
 * port gives. `export_subscriptions_domain_id_domains_id_fk` refuses
 * a `domainId` naming no domain, and only the insert can reach it:
 * {@link SubscriptionPatch} carries no `domainId` for an update to
 * touch. The fourth is the one worth reading carefully.
 *
 * `export_subscriptions_connector_id_connectors_id_fk` IS A RACE ON
 * THIS SIDE AND A DELETE GUARD ON THE OTHER, which is the opposite
 * of the direction a foreign key is usually read in. It exists to
 * refuse a CONNECTOR delete — that refusal is
 * `ConnectorStore.deleteConnector`'s, counted in advance by
 * `ConnectorStore.countConnectorDependents`, whose one member counts
 * exactly these rows — so the two writes below reach it only when
 * the connector goes away between the read `./service.ts` takes and
 * the statement here. Both declare the throw for that alone, exactly
 * as `TopicStore.insertTopic` declares its own parent key.
 *
 * WHICH STATUS THAT RACE WEARS IS `./service.ts`'S DECISION AND NOT
 * THIS MODULE'S, and what this module owes it is the constraint name
 * on the refusal. That service says in its header that an insert
 * reaching either foreign key answers one status, so the two keys
 * are deliberately not told apart there; the `StoreRefusal` this
 * store raises still names which one fired, which is what keeps a
 * later change of mind a readable edit rather than a rewrite.
 *
 * NOTHING POINTS AT `export_subscriptions`, so this store has no
 * dependent count and its delete has no guard — the one shape it
 * does not share with `src/connectors/db-store.ts` and
 * `src/sources/db-store.ts`. Re-derived rather than taken from the
 * port: grepping the generated SQL for a reference to
 * `public.export_subscriptions` answers nothing at this commit, with
 * the same grep over `connectors` answering one line in the same
 * invocation — which is what says the needle matches something and
 * that the zero is a fact about the schema rather than a typo. So
 * the delete either removes a row or reports that no row carried the
 * id, and there is no third answer for a service to translate.
 *
 * EVERY READ AND EVERY WRITE PROJECTS THROUGH
 * {@link SUBSCRIPTION_COLUMNS}, and on this table that is
 * load-bearing rather than tidy. `export_subscriptions` does not
 * declare its schedulable columns: it spreads `schedulableColumns()`
 * from `src/db/schema/scheduling.ts`, which `topics` spreads as
 * well. A column added to that ONE helper — for a scheduling mode
 * nobody in this directory is thinking about — therefore lands on
 * this table with no file here edited at all. An unscoped `select()`
 * or a bare `.returning()` would put it on every record this store
 * answers, and the router landing beside this file hands a record
 * straight to `ok()` the way `src/topics/routes.ts` already does, so
 * it would reach the wire in the commit that added it. Naming the
 * nine columns means it reaches no caller until somebody puts it on
 * {@link SubscriptionRecord} deliberately, and a column REMOVED from
 * the helper reddens this projection rather than silently thinning
 * the record. The `RETURNING` lists project through the same object
 * the `SELECT`s do, which is what stops a read and a write drifting
 * into different shapes.
 *
 * NOTHING HERE STAMPS A TIMESTAMP, and that is what makes an empty
 * patch a branch in this module rather than a statement.
 * `export_subscriptions` carries no `created_at` and no
 * `updated_at` — its only temporal column is the due time, which no
 * patch may write — so a patch naming no member leaves genuinely
 * nothing to set, and drizzle throws `No values to set` on an empty
 * update list rather than issuing a no-op statement.
 * {@link SubscriptionStore.updateSubscription} declares that call
 * legal and owes the stored row, so this reads instead of writing.
 * `src/topics/db-store.ts`, `src/connectors/db-store.ts`,
 * `src/sources/db-store.ts` and `src/personas/db-store.ts` carry the
 * same branch; `src/domains/db-store.ts` needs none, because
 * `domains` has a stamp to write.
 */
import type {
  InsertSubscriptionInput,
  SubscriptionPatch,
  SubscriptionRecord,
  SubscriptionStore,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { asc, count, eq } from 'drizzle-orm';

import { exportSubscriptions } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The `export_subscriptions` columns {@link SubscriptionRecord} is
 * made of, as one object every `SELECT` and every `RETURNING` below
 * projects through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the
 * table. Four of the nine are the table's own and five arrive by the
 * `schedulableColumns()` spread, which is the reason the header
 * gives for naming them at all rather than selecting the table.
 */
const SUBSCRIPTION_COLUMNS = {
  id: exportSubscriptions.id,
  domainId: exportSubscriptions.domainId,
  format: exportSubscriptions.format,
  connectorId: exportSubscriptions.connectorId,
  intervalSeconds: exportSubscriptions.intervalSeconds,
  nextRunAt: exportSubscriptions.nextRunAt,
  enabled: exportSubscriptions.enabled,
  minIntervalSeconds: exportSubscriptions.minIntervalSeconds,
  maxIntervalSeconds: exportSubscriptions.maxIntervalSeconds,
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
 * @throws Error When the write returned no row at all. The message
 *   names the METHOD and never the row, which is the same discipline
 *   `src/connectors/db-store.ts` keeps for a sharper reason: this
 *   error is raised where nothing has classified it, so
 *   `errorHandler` logs it whole.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`subscription store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link SubscriptionStore} lets cross it.
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
 * One subscription by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members ask this same question: the lookup every
 * request naming `/exports/:id` enters through, and the row an empty
 * patch is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The {@link SubscriptionRecord.id} to read.
 * @returns The row, or null. Null is neither an error nor a refusal:
 *   it is the fact the service decides a 404 from.
 */
async function selectSubscriptionById(
  db: Db,
  id: number,
): Promise<SubscriptionRecord | null> {
  const [row] = await db.select(SUBSCRIPTION_COLUMNS)
    .from(exportSubscriptions)
    .where(eq(exportSubscriptions.id, id));

  return row ?? null;
}

/**
 * Builds the {@link SubscriptionStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and at most
 *   one — there being no dependent count here to fold a second table
 *   into. It holds no state of its own, so building a second one
 *   over the same thunk is free and equivalent.
 */
export function createDbSubscriptionStore(
  getDb: () => Db,
): SubscriptionStore {
  return {
    /**
     * One window of one domain's export subscriptions, ordered by
     * `format` ascending with `connector_id` ascending beside it
     * because {@link SubscriptionStore.listSubscriptions} makes the
     * order part of the contract: Postgres promises nothing about
     * row order without an `ORDER BY`, so consecutive pages over an
     * unordered read can repeat one row and skip another while every
     * count on the wire still adds up.
     *
     * THE PAIR IS UNIQUE WITHIN ONE DOMAIN, being what the natural
     * key has left once the domain is fixed, and this read is scoped
     * to one domain — so the order is total and there is no
     * tie-break to forget. That is a property of
     * `export_subscriptions_domain_id_format_connector_id_unique`
     * rather than of this statement, which is why the port states it
     * and this module only obeys it.
     *
     * Format first, so a page reads as what the domain receives,
     * grouped by what it gets rather than by where it goes. Not by
     * `next_run_at`, which the port argues at length: a due time is
     * nullable, non-unique and MOVES, so a page over it is a page
     * over a collection the dispatcher reorders underneath it.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. An id no domain carries reads as an
     * empty list, which is the same answer as a domain subscribing
     * to nothing: whether the domain exists was settled by the slug
     * lookup before this call.
     */
    async listSubscriptions(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly SubscriptionRecord[]> {
      return await getDb().select(SUBSCRIPTION_COLUMNS)
        .from(exportSubscriptions)
        .where(eq(exportSubscriptions.domainId, domainId))
        .orderBy(
          asc(exportSubscriptions.format),
          asc(exportSubscriptions.connectorId),
        )
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * `SELECT count(*) FROM export_subscriptions WHERE domain_id =
     * $1`, with no window: a page's total describes the collection
     * rather than the page, which is why the port keeps this
     * separate from the read above rather than answering it
     * alongside.
     *
     * `count()` and not `count(exportSubscriptions.id)`: there is no
     * LEFT JOIN in this statement, so every row counted is a real
     * row and the bare form has no null-extended row to miscount —
     * the opposite of the choice `src/taxonomy/db-store.ts` makes
     * for its grouped category list, and right for the same reason.
     *
     * drizzle maps the result with `Number`, so what arrives is a JS
     * number rather than the string the pg driver hands back for a
     * `bigint`. An id no domain carries answers zero rather than
     * failing: nothing points at a row that is not there.
     */
    async countSubscriptions(domainId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(exportSubscriptions)
        .where(eq(exportSubscriptions.domainId, domainId));

      return writtenRow(row, 'countSubscriptions').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where every request naming `/exports/:id` enters — the patch,
     * the delete and the run-now — and where that last verb gets the
     * fact its rule turns on, reading `enabled` off this row before
     * deciding whether to write a due time at all. It is also the
     * only thing saying which domain an addressed subscription
     * belongs to, since the path names none.
     */
    async findSubscriptionById(
      id: number,
    ): Promise<SubscriptionRecord | null> {
      return await selectSubscriptionById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id is the database's own and the stored
     * defaults are the ones actually stored.
     *
     * THE ROW LANDS UNSCHEDULED, and that falls out of the statement
     * rather than out of a decision taken here: `next_run_at` is
     * absent from the `values` list because
     * {@link InsertSubscriptionInput} carries no member that could
     * fill it, and the column has no default, so Postgres stores
     * NULL. Scheduling the subscription is a second, separate act
     * through {@link SubscriptionStore.updateSubscriptionSchedule} —
     * the one-writer rule the port makes structural.
     *
     * Every other member IS spelled, `enabled` included, even though
     * that column defaults to true. The port requires it so that the
     * two implementations cannot disagree about what an omission
     * means: only one of the two has a column to default from, and
     * `./service.ts` supplies the `true` where a test can reach the
     * choice.
     *
     * ASSERTS A NEW ROW AND DOES NOT UPSERT, though
     * `src/db/schema/scheduling.ts` describes the natural key as one
     * a seed pass upserts on. The port carries the argument: a
     * `POST` is a caller stating the domain does not take that
     * format at that destination yet, so a duplicate is a refusal
     * rather than a silent rewrite of a cadence somebody tuned. No
     * seed writes this table at all today, so this port is its only
     * writer.
     *
     * THREE OF THE TABLE'S FOUR MECHANISMS CAN REFUSE IT and all
     * three arrive as a `StoreRefusal`: the unique key on a triple
     * the domain already subscribes to,
     * `export_subscriptions_format_check` on a format outside
     * `EXPORT_FORMATS`, and
     * `export_subscriptions_domain_id_domains_id_fk` on a `domainId`
     * naming no row. The connector key is the fourth and reaches
     * this statement only as the race the header describes. This is
     * the only method that can raise the domain key, `domainId`
     * being unpatchable.
     */
    async insertSubscription(
      input: InsertSubscriptionInput,
    ): Promise<SubscriptionRecord> {
      const [row] = await refusing(() => getDb()
        .insert(exportSubscriptions)
        .values({
          domainId: input.domainId,
          format: input.format,
          connectorId: input.connectorId,
          intervalSeconds: input.intervalSeconds,
          enabled: input.enabled,
          minIntervalSeconds: input.minIntervalSeconds,
          maxIntervalSeconds: input.maxIntervalSeconds,
        })
        .returning(SUBSCRIPTION_COLUMNS));

      return writtenRow(row, 'insertSubscription');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, which the port
     * declares a legal call and the header explains:
     * `export_subscriptions` has no timestamp a write could stamp,
     * so a patch naming no member leaves drizzle with an empty `set`
     * list and it throws `No values to set` rather than issuing a
     * no-op statement.
     *
     * THE GUARD READS THE `set` LIST ITSELF rather than a second
     * list of member names beside it, the shape
     * `src/topics/db-store.ts` argues for: a member added to
     * {@link SubscriptionPatch} and forgotten in a separate
     * condition would make an update carrying ONLY that member take
     * the READ branch and answer the unwritten row, with no error
     * anywhere and every type green. Building the values first and
     * asking whether drizzle would find anything in them leaves one
     * list, and it is the list the statement actually carries.
     *
     * NEVER WRITES `next_run_at`, WHATEVER IT IS HANDED, because
     * {@link SubscriptionPatch} declares no member that could carry
     * one — the containment expressed as a type rather than as a
     * check this module could forget. It never writes `domain_id`
     * either, and for the same structural reason, which is what
     * keeps `export_subscriptions_domain_id_domains_id_fk` off this
     * statement.
     *
     * ABSENT AND `null` ARE DIFFERENT REQUESTS on the two bounds and
     * the statement keeps them apart without a branch: drizzle drops
     * every `undefined` value from a `set` list before rendering it,
     * so an omitted bound never reaches the SQL and the stored value
     * stands, while an explicit `null` is written and clears it. The
     * other four members are NOT NULL columns and so distinguish
     * only two requests.
     *
     * TWO THIRDS OF THE NATURAL KEY ARE PATCHABLE, which is what
     * puts the unique key on this method: a re-format or a
     * re-pointing can collide exactly as a create can, and the
     * database checks the RESULTING triple without this method
     * having to compute it. A row is not in conflict with itself, so
     * writing a subscription's own format back over it is accepted.
     * `export_subscriptions_format_check` reaches this statement for
     * the same reason, `format` being patchable — the one place this
     * table's update differs from `connectors`'.
     *
     * Null rather than a throw when no row carries the id. Reachable
     * even after a successful read, since the row may go in between,
     * and what that means is the caller's to decide.
     */
    async updateSubscription(
      id: number,
      patch: SubscriptionPatch,
    ): Promise<SubscriptionRecord | null> {
      const db = getDb();
      const values = {
        format: patch.format,
        connectorId: patch.connectorId,
        intervalSeconds: patch.intervalSeconds,
        enabled: patch.enabled,
        minIntervalSeconds: patch.minIntervalSeconds,
        maxIntervalSeconds: patch.maxIntervalSeconds,
      };

      if (Object.values(values).every((value) => value === undefined)) {
        return await selectSubscriptionById(db, id);
      }

      const [row] = await refusing(() => db.update(exportSubscriptions)
        .set(values)
        .where(eq(exportSubscriptions.id, id))
        .returning(SUBSCRIPTION_COLUMNS));

      return row ?? null;
    },

    /**
     * `UPDATE export_subscriptions SET next_run_at = $1 WHERE id =
     * $2`, and that is the whole statement: the one write on this
     * store permitted to reach the column, writing nothing else.
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
     * `./service.ts`'s because all four are decisions: the clock is
     * injected there so a test can fix it, and the refusal of a
     * run-now against a disabled row is a status a rule chose rather
     * than a fact a database reported. The clamp has no caller on
     * this group at all — there is no pause verb under `/exports`,
     * so `pauseFrom` in `src/lib/schedule.ts` is unreached from here
     * and the two bounds are read by the dispatcher's own reschedule
     * alone.
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
    async updateSubscriptionSchedule(
      id: number,
      nextRunAt: Date,
    ): Promise<SubscriptionRecord | null> {
      const [row] = await refusing(() => getDb()
        .update(exportSubscriptions)
        .set({ nextRunAt })
        .where(eq(exportSubscriptions.id, id))
        .returning(SUBSCRIPTION_COLUMNS));

      return row ?? null;
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * NOTHING HANGS OFF A SUBSCRIPTION, so this delete has neither a
     * guard nor a cascade: no foreign key in schema v2 points at
     * `export_subscriptions`, re-derived from the generated SQL per
     * the header, and the port says outright that it cannot be
     * refused. `briefings` is the near miss and is not one — it
     * carries no `subscription_id`, so a rendered digest outlives
     * the subscription that asked for it as stored text rather than
     * as a reference. The cascade that takes a domain's
     * subscriptions with it runs on `export_subscriptions.domain_id`
     * from the other side, inside `DomainStore.deleteDomain`, and
     * nothing here takes part in it.
     *
     * It is what CLEARS the way for a refused connector delete
     * rather than something a connector delete clears: these rows
     * are what `export_subscriptions_connector_id_connectors_id_fk`
     * refuses on behalf of, so cancelling here is the explicit step
     * that schema decision exists to require.
     *
     * It is wrapped in {@link refusing} anyway, per the header: a
     * bare statement here would make the one exception the place
     * where a constraint added later put a caller's bytes into a log
     * line through an untranslated `cause`.
     */
    async deleteSubscription(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb()
        .delete(exportSubscriptions)
        .where(eq(exportSubscriptions.id, id))
        .returning({ id: exportSubscriptions.id }));

      return removed.length > 0;
    },
  };
}
