/**
 * @packageDocumentation
 * The drizzle half of {@link ConnectorStore}: one statement per
 * method, over the `connectors` table `src/db/schema/sources.ts`
 * declares, plus the one other table this port reads without ever
 * writing — `export_subscriptions`, for the delete guard.
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
 * DELETE INCLUDED — and on this table the wrapper is a CREDENTIAL
 * boundary before it is a classifier, which is a sharper version of
 * the request-content argument its four siblings carry. Both links
 * of the error drizzle throws spell the caller's bytes: the
 * `DrizzleQueryError` spells `Failed query:` plus the SQL and the
 * bound `params:` line, and the pg `DatabaseError` under it spells
 * `Key (kind, name)=(...) already exists.` `errorHandler` logs an
 * unhandled error with its `cause`, so an untranslated refusal out
 * of {@link ConnectorStore.insertConnector} would put the whole
 * submitted config — the API key included, through the `params:`
 * line — into a log line, which is the one place
 * `src/connectors/secrets.ts` cannot reach and nobody can go and
 * redact. A `StoreRefusal` from `src/db/store-errors.ts` carries
 * neither the statement nor its parameters, structurally. So the
 * wrapper is what keeps this module inside the containment
 * `tests/api/connector-secret.test.ts` watches, and a constraint
 * added to this table later inherits it rather than having to
 * discover it.
 *
 * TWO MECHANISMS ARE LIVE AND THEY SIT ON DIFFERENT METHODS.
 * `connectors_kind_name_unique` refuses a kind and name pair the
 * deployment already carries, on an INSERT and on an UPDATE alike,
 * since `name` is patchable. `connectors_kind_check` refuses a
 * `kind` outside `CONNECTOR_KINDS`, and only the insert can reach
 * it: {@link ConnectorPatch} carries no `kind`, which `./store.ts`
 * argues is a containment rather than a gap — a connector's kind is
 * read by rows and by queries that are not this one. So an update
 * here raises exactly one mechanism where
 * `src/sources/db-store.ts`'s raises two, and the two tables differ
 * by that patch type alone.
 *
 * NOTHING POINTS AT `connectors` EXCEPT `export_subscriptions`, so
 * the delete has one refusing key and the guard counts it. That is
 * the opposite of `src/sources/db-store.ts`, which counts two of
 * three and carries an uncounted key its service cannot promise
 * about; here a zero means every key was asked, and what stays
 * unpromised is only the row a subscription could be written into
 * between the count and the delete.
 *
 * EVERY READ AND EVERY WRITE PROJECTS THROUGH
 * {@link CONNECTOR_COLUMNS}, which on this table names all four
 * columns and is therefore not a narrowing. It is written for what
 * a column ADDED to `connectors` would otherwise do: an unscoped
 * `select()` or a bare `.returning()` would put it on every record
 * this store answers, and `src/connectors/routes.ts` hands a
 * service-masked record straight to `ok()`, so a new column would
 * reach the wire in the commit that added it — with
 * `maskConnectorConfig` looking only inside `config` and therefore
 * masking nothing in it. Naming the four means a new column reaches
 * no caller until somebody puts it on {@link ConnectorRecord}
 * deliberately, and a column REMOVED reddens this projection rather
 * than silently thinning the record.
 *
 * NOTHING HERE MASKS, and the omission is the port's rule rather
 * than an oversight — `./store.ts` argues it at length. Every row
 * below carries `config` AS STORED, credential and all;
 * `maskConnectorConfig` is applied one layer up, on the way out of
 * `src/connectors/service.ts`. A store that masked would agree with
 * itself when `tests/live/api-wave2.live.test.ts` reads a write back
 * against the raw row, and would move the rule out from under the
 * boundary the sentinel capture actually watches.
 *
 * NOTHING HERE STAMPS A TIMESTAMP, and that is what makes an empty
 * patch a branch in this module rather than a statement.
 * `connectors` carries no `created_at` and no `updated_at` at all —
 * the table has four columns and none of them is temporal — so a
 * patch naming no member leaves genuinely nothing to set, and
 * drizzle throws `No values to set` on an empty update list rather
 * than issuing a harmless statement.
 * {@link ConnectorStore.updateConnector} declares that call legal
 * and owes the stored row, so this reads instead of writing.
 * `src/topics/db-store.ts`, `src/sources/db-store.ts` and
 * `src/personas/db-store.ts` carry the same branch;
 * `src/domains/db-store.ts` needs none, because `domains` has a
 * stamp to write.
 */
import type {
  ConnectorDependentCounts,
  ConnectorFilter,
  ConnectorPatch,
  ConnectorRecord,
  ConnectorStore,
  InsertConnectorInput,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';
import type { SQL } from 'drizzle-orm';

import { asc, count, eq } from 'drizzle-orm';

import { connectors, exportSubscriptions } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The `connectors` columns {@link ConnectorRecord} is made of, as
 * one object every `SELECT` and every `RETURNING` below projects
 * through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the
 * table. All four of the table's columns are here, so this object
 * narrows nothing today; the header carries what it is for, which
 * is the fifth column somebody adds.
 */
const CONNECTOR_COLUMNS = {
  id: connectors.id,
  kind: connectors.kind,
  name: connectors.name,
  config: connectors.config,
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
 *   names the METHOD and never the row, which on this table is not
 *   the stylistic choice it is on the four siblings: a connector row
 *   carries a credential, and this error is raised where nothing has
 *   classified it, so `errorHandler` logs it whole.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`connector store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link ConnectorStore} lets cross it.
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
 * The five sibling drizzle stores are the same three lines and are
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
 * The `WHERE` one {@link ConnectorFilter} stands for, or nothing.
 *
 * Written once because the list and its count ask the same question
 * and {@link ConnectorStore.listConnectors} says outright that an
 * implementation answering the two through different predicates
 * would put a page's `meta.total` at odds with the page. One
 * function is what makes that impossible here rather than merely
 * unlikely.
 *
 * `undefined` rather than a tautology for the unfiltered case:
 * drizzle drops an undefined `where` before rendering, so an
 * unnarrowed read issues a statement with no predicate at all.
 *
 * @param filter - What to narrow to, or `{}` for every connector.
 * @returns The equality on `kind`, or undefined for every row.
 */
function kindFilter(filter: ConnectorFilter): SQL | undefined {
  return filter.kind === undefined
    ? undefined
    : eq(connectors.kind, filter.kind);
}

/**
 * One connector by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members ask this same question: the lookup every
 * request naming `/connectors/:id` enters through, and the row an
 * empty patch is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The {@link ConnectorRecord.id} to read.
 * @returns The row, CONFIG UNMASKED, or null. Null is neither an
 *   error nor a refusal: it is the fact the service decides a 404
 *   from.
 */
async function selectConnectorById(
  db: Db,
  id: number,
): Promise<ConnectorRecord | null> {
  const [row] = await db.select(CONNECTOR_COLUMNS)
    .from(connectors)
    .where(eq(connectors.id, id));

  return row ?? null;
}

/**
 * Builds the {@link ConnectorStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and at most
 *   one — the dependent count included, there being a single table
 *   to ask. It holds no state of its own, so building a second one
 *   over the same thunk is free and equivalent.
 */
export function createDbConnectorStore(getDb: () => Db): ConnectorStore {
  return {
    /**
     * One window of the connector list, narrowed to a kind or not,
     * ordered by `kind` ascending with `name` ascending beside it
     * because {@link ConnectorStore.listConnectors} makes the order
     * part of the contract: Postgres promises nothing about row
     * order without an `ORDER BY`, so consecutive pages over an
     * unordered read can repeat one row and skip another while every
     * count on the wire still adds up.
     *
     * THE PAIR IS UNIQUE, so unlike every other ordered read in this
     * package the order is total and there is no tie-break to
     * forget. That is a property of `connectors_kind_name_unique`
     * rather than of this statement, which is why the port states it
     * and this module only obeys it.
     *
     * Kind first rather than name first, so an unfiltered page reads
     * as the deployment's services grouped by what they are.
     *
     * THIS COLLECTION IS NOT SCOPED TO A DOMAIN, which is where this
     * read departs from every wave-1 and wave-2 list beside it: a
     * connector is deployment-level, so there is no owner id in the
     * predicate and {@link kindFilter} is the only narrowing there
     * is. A kind no row carries reads as an empty list, the same
     * answer a window past the end gives — neither is a failure to
     * read.
     *
     * The window arrives already validated, per the port, so nothing
     * here re-checks its bounds. Every row answers CONFIG UNMASKED.
     */
    async listConnectors(
      filter: ConnectorFilter,
      window: StoreWindow,
    ): Promise<readonly ConnectorRecord[]> {
      return await getDb().select(CONNECTOR_COLUMNS)
        .from(connectors)
        .where(kindFilter(filter))
        .orderBy(asc(connectors.kind), asc(connectors.name))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * `SELECT count(*) FROM connectors` under the same predicate and
     * no window: a page's total describes the collection rather than
     * the page, which is why the port keeps this separate from the
     * read above rather than answering it alongside.
     *
     * THE PREDICATE IS THE LIST'S OWN, through {@link kindFilter},
     * so the two cannot describe different collections.
     *
     * `count()` and not `count(connectors.id)`: there is no LEFT
     * JOIN in this statement, so every row counted is a real row and
     * the bare form has no null-extended row to miscount — the
     * opposite of the choice `src/taxonomy/db-store.ts` makes for
     * its grouped category list, and right for the same reason.
     *
     * drizzle maps the result with `Number`, so what arrives is a JS
     * number rather than the string the pg driver hands back for a
     * `bigint`. A kind no row carries answers zero, which is correct
     * rather than a special case.
     */
    async countConnectors(filter: ConnectorFilter): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(connectors)
        .where(kindFilter(filter));

      return writtenRow(row, 'countConnectors').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where every request naming `/connectors/:id` enters — the
     * patch and the delete — and the only method on this store that
     * an id reaches without a collection behind it.
     */
    async findConnectorById(id: number): Promise<ConnectorRecord | null> {
      return await selectConnectorById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id is the database's own and the stored
     * defaults are the ones actually stored.
     *
     * `config` IS SPELLED EVEN THOUGH THE COLUMN DEFAULTS TO `{}`,
     * because {@link InsertConnectorInput} requires it. The port
     * carries why: a default is a decision about what an omission
     * means, and leaving it to the column would make this
     * implementation quietly right and the in-memory one quietly
     * wrong, only one of the two having a column to default from.
     * `src/connectors/service.ts` supplies the empty object where
     * the choice is visible and a test can reach it.
     *
     * IT IS STORED AS SUBMITTED AND NOT COPIED HERE. drizzle
     * serialises the value on the way into the statement, so nothing
     * this store answers later shares a reference with the argument
     * and there is no stored object a caller could go on mutating.
     * That is exactly the copy the in-memory store under
     * `tests/helpers/` has to write by hand, having no serialisation
     * step to stand on.
     *
     * ASSERTS A NEW ROW AND DOES NOT UPSERT, though the schema
     * describes `connectors_kind_name_unique` as a key an upsert
     * lands on. The port carries the argument: a `POST` is a caller
     * stating the deployment has no connector of that kind by that
     * name yet, so a duplicate is a refusal rather than a silent
     * rewrite of an address and a credential somebody set.
     *
     * Both of this table's mechanisms can refuse it and both arrive
     * as a `StoreRefusal`: `connectors_kind_name_unique` on a pair
     * already taken, and `connectors_kind_check` on a `kind` outside
     * `CONNECTOR_KINDS`. This is the only method that can raise the
     * CHECK, `kind` being unpatchable.
     */
    async insertConnector(
      input: InsertConnectorInput,
    ): Promise<ConnectorRecord> {
      const [row] = await refusing(() => getDb().insert(connectors)
        .values({
          kind: input.kind,
          name: input.name,
          config: input.config,
        })
        .returning(CONNECTOR_COLUMNS));

      return writtenRow(row, 'insertConnector');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, which the port
     * declares a legal call and the header explains: `connectors`
     * has no timestamp for a write to stamp — it has no temporal
     * column at all — so a patch naming no member leaves drizzle
     * with an empty `set` list and it throws `No values to set`
     * rather than issuing a no-op statement.
     *
     * THE GUARD READS THE `set` LIST ITSELF rather than a second
     * list of member names beside it, the shape
     * `src/topics/db-store.ts` argues for: a member added to
     * {@link ConnectorPatch} and forgotten in a separate condition
     * would make an update carrying ONLY that member take the READ
     * branch and answer the unwritten row, with no error anywhere
     * and every type green. Building the values first and asking
     * whether drizzle would find anything in them leaves one list,
     * and it is the list the statement actually carries.
     *
     * NEVER WRITES `kind`, WHATEVER IT IS HANDED, because
     * {@link ConnectorPatch} declares no member that could carry one
     * — the containment expressed as a type rather than as a check
     * this module could forget. That is also what keeps
     * `connectors_kind_check` off this statement, so an update
     * raises exactly one mechanism.
     *
     * `config` REPLACES THE STORED DOCUMENT WHOLE and is never
     * merged into it: a `set` list assigns a jsonb column. So a
     * patch that omits a secret's key has cleared that secret, which
     * `./store.ts` states rather than smooths over and
     * `docs/architecture/08-http-api.md` argues for.
     *
     * NEITHER MEMBER HAS A THIRD REQUEST TO EXPRESS. Both columns
     * are NOT NULL, so drizzle dropping every `undefined` from a
     * `set` list is the whole of absent-means-leave-it-alone, and
     * there is no explicit `null` to keep apart from it — unlike
     * `src/topics/db-store.ts`, whose two nullable bounds turn on
     * exactly that distinction.
     *
     * `connectors_kind_name_unique` is the one refusal this can
     * raise, on the RESULTING pair, which the database checks
     * without this method having to compute it. A row is not in
     * conflict with itself, so writing a connector's own name back
     * over it is accepted.
     *
     * Null rather than a throw when no row carries the id.
     * Reachable even after a successful read, since the row may go
     * in between, and what that means is the caller's to decide.
     */
    async updateConnector(
      id: number,
      patch: ConnectorPatch,
    ): Promise<ConnectorRecord | null> {
      const db = getDb();
      const values = {
        name: patch.name,
        config: patch.config,
      };

      if (Object.values(values).every((value) => value === undefined)) {
        return await selectConnectorById(db, id);
      }

      const [row] = await refusing(() => db.update(connectors)
        .set(values)
        .where(eq(connectors.id, id))
        .returning(CONNECTOR_COLUMNS));

      return row ?? null;
    },

    /**
     * `SELECT count(*) FROM export_subscriptions WHERE connector_id
     * = $1` — the whole delete guard, in one statement.
     *
     * ONE STATEMENT BECAUSE THERE IS ONE REFUSING KEY, which is
     * where this method departs from its two siblings rather than
     * simplifying them. `src/domains/db-store.ts` and
     * `src/sources/db-store.ts` each fold several tables into a
     * `UNION ALL` read by label, for two reasons: one round trip,
     * and one snapshot, so the numbers a `409` reports cannot come
     * from different instants. Neither reason survives a single
     * count — a lone `SELECT` is already one round trip and already
     * one snapshot — and a `UNION ALL` over one branch would buy a
     * label lookup that could go wrong for a number that cannot.
     *
     * A SECOND KEY LANDING LATER IS A CHANGE OF SHAPE HERE, and
     * that is the cost of this decision stated rather than hidden:
     * whoever adds one folds this into the sibling `UNION ALL`
     * form. {@link ConnectorDependentCounts} is a record over one
     * member precisely so that the record does not also have to
     * change.
     *
     * THIS IS A COUNTED ZERO, not an absent group. A plain
     * aggregate with no `GROUP BY` answers one row whatever the
     * predicate selects, so a connector nothing names comes back as
     * `0` rather than as nothing at all — the trap the grouped read
     * in `src/sources/db-store.ts` has to fill in from a tuple, and
     * which this statement's shape simply does not have.
     *
     * An id no connector carries answers zero too, which is correct
     * rather than a special case: nothing points at a row that is
     * not there. Whether that id should have existed is a question
     * {@link ConnectorStore.findConnectorById} already answered.
     *
     * NOT WRAPPED IN {@link refusing}, in common with every other
     * read here: a `SELECT` under no CHECK and no unique key has no
     * mechanism to classify, and the header's containment argument
     * is about a statement carrying a caller's SUBMITTED bytes,
     * which this one does not — its only parameter is an id the
     * router already parsed as a number.
     */
    async countConnectorDependents(
      id: number,
    ): Promise<ConnectorDependentCounts> {
      const [row] = await getDb().select({ total: count() })
        .from(exportSubscriptions)
        .where(eq(exportSubscriptions.connectorId, id));

      return {
        exportSubscriptions: writtenRow(
          row,
          'countConnectorDependents',
        ).total,
      };
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * NO CASCADE ANYWHERE, which is the opposite of what
     * `DomainStore.deleteDomain` does and is the schema's decision
     * rather than this method's. The one foreign key onto
     * `connectors.id` emits `ON DELETE no action`, so this either
     * removes a row nothing references or is refused; it never takes
     * a second row with it, and it never takes an
     * `export_subscriptions` row — cancelling a delivery is
     * `SubscriptionStore`'s, under `/exports`, where the domain that
     * asked for it is the one being edited.
     *
     * THE GUARD ABOVE MAKES THE REFUSAL LEGIBLE AND THIS STATEMENT
     * IS WHAT MAKES IT TRUE. A service consulting only the count
     * would be enforcing a convention; the database refuses whoever
     * asks, this store included, so a subscription written between
     * the count and this call is refused rather than silently
     * stranded.
     *
     * The refusal arrives as a `StoreRefusal` with `reason`
     * `foreign-key-violation` and `constraint`
     * `export_subscriptions_connector_id_connectors_id_fk`, through
     * {@link refusing} — which here is the containment boundary the
     * header describes rather than only a classifier, this being a
     * statement whose parameter is an id.
     */
    async deleteConnector(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(connectors)
        .where(eq(connectors.id, id))
        .returning({ id: connectors.id }));

      return removed.length > 0;
    },
  };
}
