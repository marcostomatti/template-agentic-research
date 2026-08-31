/**
 * @packageDocumentation
 * The drizzle half of {@link SettingsStore}: two statements, one
 * per method, over the `operator_settings` table that
 * `src/db/schema/settings.ts` declares.
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
 * A FIRST WRITE AND A REWRITE ARE ONE STATEMENT, which is the
 * whole substance of this module and what the port asks for.
 * `INSERT ... ON CONFLICT (id) DO UPDATE` writes the row when the
 * table is empty and rewrites it when it is not, so nothing above
 * has to ask which state the deployment is in and no caller has
 * to sequence a read against a create-or-update. The alternative
 * is not merely longer: a read followed by a branch is two
 * statements with a gap between them, and two first writes racing
 * across that gap both read an empty table, after which the
 * primary key refuses the loser and a caller that did nothing
 * wrong is answered an error.
 *
 * ITS ARBITER IS THE PRIMARY KEY, NAMED BY ITS COLUMN AND NOT BY
 * ITS NAME. `onConflictDoUpdate` takes a column or a list of them
 * and a raw `sql` fragment in that position throws inside the
 * builder, so `ON CONFLICT ON CONSTRAINT <name>` is unreachable
 * without abandoning the query builder and the typed `RETURNING`
 * list with it — measured under drizzle 0.45.2, and the same
 * limit `src/taxonomy/db-store.ts` works around for its bulk
 * import. Postgres INFERS the arbiter from the column instead,
 * and `id` is the primary key, so what it infers is
 * `operator_settings_pkey`. That name is Postgres's own
 * derivation rather than anything this repository spells: a
 * `git grep` for it finds nothing, and that zero is expected
 * rather than drift, since only explicitly-named constraints are
 * greppable.
 *
 * ITS `SET` LIST IS LITERAL AND DOES NOT READ `excluded`, which
 * is the opposite of the choice `src/taxonomy/db-store.ts` makes
 * and is right for the reason that module gives: `excluded` is
 * what a conflicting row needs when ONE statement carries MANY
 * rows and each must take its own submitted values. This
 * statement carries exactly one row, always, so the value in hand
 * is the value the conflict would otherwise fetch back out of
 * `excluded` — the shape `scripts/seed-apply.ts` uses for its
 * own single-row upserts.
 *
 * THE PAYLOAD IS ASSIGNED AND NEVER MERGED. A `jsonb` column in a
 * `set` list is written whole, so the whole-unit rule
 * {@link SettingsStore.writeSettings} states needs nothing
 * enforcing it here: a member absent from the argument is absent
 * from the stored payload afterwards, which is the only way a
 * member is ever cleared.
 *
 * `updated_at` IS WRITTEN AS `now()` RATHER THAN FROM A JS
 * `Date`, and only on the conflict path. The schema module
 * declares no trigger and no drizzle `$onUpdate` behind the
 * column — a hook firing on the schema path and not on
 * hand-written SQL leaves a column that is stale exactly when it
 * is consulted — so maintaining it is the writer's, and
 * spelling it in the statement means two rows this store stamped
 * cannot disagree however far the service host's clock has
 * drifted from the database's. The INSERT path leaves both stamps
 * to the column defaults, which is what keeps `created_at`
 * meaning when this deployment was FIRST configured: a rewrite
 * moves one stamp and not the other.
 *
 * READS ARE COLUMN-SCOPED, AND HERE THAT IS THE PORT'S SHAPE
 * RATHER THAN A PRECAUTION. `./store.ts` says no timestamp
 * crosses this port and declares no record type at all — the
 * payload IS what a read and a write deal in — so projecting
 * through {@link SETTINGS_COLUMNS} is what makes that structural.
 * An unscoped read would hand `id`, `created_at` and `updated_at`
 * to a caller the port never promised them to, and on this
 * surface a caller is one envelope away from the wire.
 *
 * NO NARROWING SITS BETWEEN A SELECTED ROW AND AN ANSWER, which
 * is the difference from `src/taxonomy/db-store.ts` and is
 * measured rather than assumed. That module narrows
 * `terms.polarity` because a `text` column under a CHECK infers
 * as `string` while its record types it by the union the CHECK is
 * generated from. Here the column is typed by
 * {@link OperatorSettings} through `$type<>()` and the port
 * imports that same interface rather than restating it, so the
 * two are identical in both assignability directions and the
 * projection is the whole of the translation.
 *
 * NO REFUSAL IS REACHABLE, AND THE WRITE IS WRAPPED ANYWAY. The
 * table's two mechanisms are live and were both seen firing —
 * `./store.ts` carries the measurement — but this module spells
 * the id from {@link OPERATOR_SETTINGS_ID} rather than from
 * anything a request supplies, and absorbs the conflict by
 * upserting on it, so neither the singleton CHECK nor the primary
 * key can refuse a caller. {@link refusing} is here for the
 * reason `src/personas/db-store.ts` gives for wrapping a delete
 * nothing can refuse: what the alternative risks is not an
 * untranslated error but a REQUEST-CONTENT LEAK. The
 * `DrizzleQueryError` drizzle throws spells `Failed query:` plus
 * the SQL and the bound `params:` line, and the payload is one of
 * those bound parameters, so the whole submitted configuration is
 * in that message. `errorHandler` logs an unhandled error with
 * its `cause`, so an untranslated refusal would put it in a log
 * line with no code change anywhere. A `StoreRefusal` from
 * `src/db/store-errors.ts` carries neither the SQL nor the
 * parameters, structurally. So the wrapper is a containment
 * boundary that also classifies, and a constraint added to this
 * table later inherits it rather than having to discover it.
 *
 * The pg `DatabaseError` one link down is the exception that
 * proves the rule and is worth naming, because the three sibling
 * stores document it as a leak and here it is not one: its
 * `detail` names the key that conflicted, which on this table is
 * `id` and is therefore a value this module chose rather than one
 * a caller sent. The wrapper is warranted by the link above it.
 */
import type { SettingsStore } from './store.js';
import type { Db } from '../db/index.js';
import type { OperatorSettings } from '../db/schema/settings.js';

import { eq, sql } from 'drizzle-orm';

import { OPERATOR_SETTINGS_ID, operatorSettings } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The `operator_settings` columns this port deals in, as one
 * object both statements below project through.
 *
 * One member, and the list is short for a reason rather than by
 * coincidence: `./store.ts` declares no record type, so the
 * payload is the whole of what a read and a write answer, and the
 * table's other three columns are an implementation's business.
 * Written once so a read and a write cannot drift into projecting
 * different shapes.
 */
const SETTINGS_COLUMNS = { settings: operatorSettings.settings };

/**
 * The row a write was supposed to return, or a refusal naming the
 * statement that came back empty.
 *
 * An upsert with a `RETURNING` list yields exactly one row on both
 * paths it can take — the insert and the update — so an empty
 * result is not a case to handle but a state this module has no
 * account of. Under `noUncheckedIndexedAccess` the destructure is
 * `T | undefined` regardless, so the choice is between a refusal
 * naming the statement that produced nothing and a cast
 * pretending the question never arose.
 *
 * @param row - The destructured first row of a `RETURNING`
 *   result.
 * @param statement - What was being written, for the message.
 * @returns The row, narrowed.
 * @throws Error When the write returned no row at all.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`settings store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type `src/db/store-errors.ts` declares.
 *
 * ONE CALL SITE, deliberately. `./store.ts` measures that no
 * refusal on this table is reachable through this port, so the
 * classifying half of this helper has no live subject and the
 * containment half is the whole of why the write goes through it;
 * the header carries which of the error's two links is the leak.
 * The read is not wrapped, and needs no rule of its own: a
 * `SELECT` by primary key binds one integer this module chose and
 * carries nothing a caller sent.
 *
 * @param run - The statement, as a thunk rather than an already
 *   started promise, so the `try` covers the query builder's own
 *   throw as well as the driver's.
 * @returns Whatever the statement answered.
 * @throws StoreRefusal When {@link classifyPgError} recognised the
 *   SQLSTATE, walking the `cause` chain drizzle wraps the driver
 *   error in. A refusal reaching a caller of this store would be a
 *   fault rather than a rule, per the port; what this line decides
 *   is that the fault arrives carrying names this repository chose
 *   instead of the submitted payload.
 * @throws unknown Otherwise the original value, unchanged. A
 *   classifier answering `null` means "not one of the three
 *   mechanisms", never "nothing went wrong", so swallowing it here
 *   would turn a bug in this package into a silent success.
 *
 * @remarks
 * The siblings in `src/domains/db-store.ts`,
 * `src/taxonomy/db-store.ts` and `src/personas/db-store.ts` are
 * the same three lines and are deliberately not imported. Each
 * drizzle store is reached only from inside its own directory, so
 * importing one from another would be the first edge between two
 * groups' data layers, bought for three lines. Folding all four
 * into a shared home is a refactor of finished modules rather
 * than a part of building this one.
 */
async function refusing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw classifyPgError(err) ?? err;
  }
}

/**
 * Builds the {@link SettingsStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per
 *   method call and never at construction, which is what lets the
 *   store be built before the Postgres dependency has started; see
 *   the thunk paragraph above for why that ordering is forced.
 * @returns A store issuing exactly one statement per method. It
 *   holds no state of its own, so building a second one over the
 *   same thunk is free and equivalent.
 */
export function createDbSettingsStore(getDb: () => Db): SettingsStore {
  return {
    /**
     * `SELECT settings FROM operator_settings WHERE id = $1`.
     *
     * By primary key rather than unfiltered, so the result is at
     * most one row by construction rather than because the CHECK
     * happens to hold. The two are the same query plan today —
     * `operator_settings_singleton_check` pins `id` to 1, so no
     * second row can exist for a `WHERE` to exclude — but a read
     * that leans on a constraint to be single-valued needs a
     * `LIMIT` or an `ORDER BY` the moment the constraint is
     * relaxed, and this one does not.
     *
     * Null when the table holds no row, which the port is explicit
     * is a fact rather than an error: `./service.ts` is the single
     * place it and the empty payload become one answer. No
     * `StoreRefusal` can arrive, and nothing here builds one.
     */
    async readSettings(): Promise<OperatorSettings | null> {
      const [row] = await getDb().select(SETTINGS_COLUMNS)
        .from(operatorSettings)
        .where(eq(operatorSettings.id, OPERATOR_SETTINGS_ID));

      return row?.settings ?? null;
    },

    /**
     * One `INSERT ... ON CONFLICT (id) DO UPDATE`, which is a
     * first write and a rewrite in the same statement.
     *
     * The id is spelled from {@link OPERATOR_SETTINGS_ID} rather
     * than defaulted, because the column carries no default and
     * because `ON CONFLICT (id)` has nothing to conflict on unless
     * the insert supplied it. That single constant is also what
     * puts both of this table's mechanisms out of a caller's
     * reach: the CHECK cannot refuse a value the module chose, and
     * the primary key's conflict is what the statement is for.
     *
     * `updated_at` is stamped in the `DO UPDATE` alone. On the
     * insert path both timestamps come from the column defaults,
     * so a rewrite moves `updated_at` and leaves `created_at`
     * meaning when this deployment was first configured.
     *
     * THE ANSWER IS READ BACK RATHER THAN ECHOED, and unlike the
     * in-memory implementation this store can tell the two apart.
     * `tests/helpers/memory-research-store.ts` copies the payload
     * in and copies it out, so a copy of the argument and a copy
     * of stored state are the same object graph there and the leg
     * swapping one for the other reddens nothing. Here the
     * database can change what it stored: `jsonb` normalises a
     * payload's key order and drops a duplicate key, so the
     * `RETURNING` list is what discharges that claim rather than
     * restating it.
     */
    async writeSettings(
      settings: OperatorSettings,
    ): Promise<OperatorSettings> {
      const [row] = await refusing(() => getDb().insert(operatorSettings)
        .values({ id: OPERATOR_SETTINGS_ID, settings })
        .onConflictDoUpdate({
          target: operatorSettings.id,
          set: { settings, updatedAt: sql`now()` },
        })
        .returning(SETTINGS_COLUMNS));

      return writtenRow(row, 'writeSettings').settings;
    },
  };
}
