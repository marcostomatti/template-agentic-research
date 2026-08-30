/**
 * @packageDocumentation
 * The drizzle half of {@link PersonaStore}: one statement per
 * method, over the `personas` table `src/db/schema/domains.ts`
 * declares.
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
 * EVERY WRITE IS TRANSLATED THROUGH {@link classifyPgError}, THE
 * DELETE INCLUDED — and the delete is why the rule is worth
 * stating rather than reading off the port. Nothing in schema v2
 * points at `personas`, so {@link PersonaStore.deletePersona} has
 * no mechanism that can refuse it and its wrapper cannot fire
 * today. It is wrapped because what the alternative risks is not
 * an untranslated error but a REQUEST-CONTENT LEAK. Both links of
 * the error drizzle throws carry the caller's bytes: the
 * `DrizzleQueryError` spells `Failed query:` plus the SQL and the
 * bound `params:` line, and the pg `DatabaseError` under it
 * spells `Key (domain_id, role)=(<the submitted role>) already
 * exists.` `errorHandler` logs an unhandled error with its
 * `cause`, so an untranslated refusal would put a submitted role
 * in a log line with no code change anywhere. A `StoreRefusal`
 * from `src/db/store-errors.ts` carries neither, structurally. So
 * the wrapper is a containment boundary that also classifies, and
 * a constraint added to this table later inherits it rather than
 * having to discover it.
 *
 * TWO MECHANISMS ARE LIVE AND THEY CANNOT FIRE AT ONCE.
 * `personas_domain_id_role_unique` refuses a duplicate
 * `(domain_id, role)` on an INSERT and on an UPDATE alike, and
 * `personas_domain_id_domains_id_fk` refuses a `domainId` naming
 * no row; the table carries no CHECK and no trigger, so a
 * `check-violation` out of any method below would be a fault
 * rather than a rule. `./store.ts` records both measured against
 * the live server, each beside its own positive control, and
 * records why there is no refusal ORDER for this module to
 * translate: the unique key opens on the very column the foreign
 * key constrains, so a write naming a domain that is not there
 * can duplicate nothing. This module adds nothing to that
 * classification beyond running it.
 *
 * READS ARE COLUMN-SCOPED even though {@link PersonaRecord} is the
 * whole table today. Naming the four columns pins every projection
 * to the port's record type, so a column added to `personas`
 * reaches no caller until somebody puts it on the port
 * deliberately. `./store.ts` says this record IS the resource the
 * route group answers with, so an unscoped read would put a new
 * column on the wire in the commit that added it. The `RETURNING`
 * lists project through the same object the `SELECT`s do, which is
 * what stops a read and a write drifting into different shapes.
 *
 * NO COLUMN IS NARROWER ON THE PORT THAN IT IS ON THE TABLE, which
 * is the difference from `src/taxonomy/db-store.ts` and the reason
 * nothing sits between a selected row and an answer here.
 * `terms.polarity` is a `text` column under a CHECK whose record
 * types it by the union that CHECK is generated from, so a
 * selected row is not assignable to that record by projection
 * alone and a narrowing has to be written. `personas.role` is free
 * text under no CHECK — deliberately, per
 * `src/db/schema/domains.ts`, because the roles a pipeline plays
 * grow with the pipeline — so the port types it `string` too.
 * Measured rather than assumed: each of the two shapes is
 * assignable to the other and neither declares a member the other
 * lacks, which is what makes {@link PERSONA_COLUMNS} the whole of
 * the translation.
 *
 * NOTHING HERE STAMPS A TIMESTAMP, and that is what makes an empty
 * patch a branch in this module. `personas` carries no
 * `updated_at` for a write to maintain — it has no timestamp
 * column at all — so a patch naming no member leaves
 * genuinely nothing to set, and drizzle throws `No values to set`
 * on an empty update list rather than issuing a harmless
 * statement. {@link PersonaStore.updatePersona} declares that call
 * legal and owes the stored row, so this reads instead of writing.
 * `src/domains/db-store.ts` needs no such branch because `domains`
 * has a stamp to write; both taxonomy patches carry one, for this
 * reason. The branch is unobservable in the answered row, in the
 * stored row and in a statement COUNT: what separates it from a
 * write that sets every member back to itself is the statement
 * TEXT, which is what a probe over an instrumented client reads
 * and what nothing else can.
 */
import type {
  InsertPersonaInput,
  PersonaPatch,
  PersonaRecord,
  PersonaStore,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { asc, count, eq } from 'drizzle-orm';

import { personas } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The `personas` columns {@link PersonaRecord} is made of, as one
 * object every `SELECT` and every `RETURNING` below projects
 * through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the
 * table.
 */
const PERSONA_COLUMNS = {
  id: personas.id,
  domainId: personas.domainId,
  role: personas.role,
  systemText: personas.systemText,
};

/**
 * The row a write was supposed to return, or a refusal naming the
 * statement that came back empty.
 *
 * An insert with a `RETURNING` list yields exactly one row on every
 * path Postgres takes, so an empty result is not a case to handle
 * — it is a state this module has no account of. Under
 * `noUncheckedIndexedAccess` the destructure is `T | undefined`
 * regardless, so the choice is between a refusal naming the
 * statement that produced nothing and a cast pretending the
 * question never arose.
 *
 * @param row - The destructured first row of a `RETURNING` result.
 * @param statement - What was being written, for the message.
 * @returns The row, narrowed.
 * @throws Error When the write returned no row at all.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`persona store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link PersonaStore} lets cross it.
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
 * The siblings in `src/domains/db-store.ts` and
 * `src/taxonomy/db-store.ts` are the same three lines and are
 * deliberately not imported. Each drizzle store is reached only
 * from inside its own directory — measured, and a containment
 * `src/domains/index.ts` states about itself — so importing one
 * from another would be the first edge between two groups' data
 * layers, bought for three lines. Folding all three into a shared
 * home is a refactor of finished modules rather than a part of
 * building this one.
 */
async function refusing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw classifyPgError(err) ?? err;
  }
}

/**
 * One persona by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members ask this same question: the lookup a route
 * naming `/personas/:id` enters through, and the row an empty patch
 * is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The {@link PersonaRecord.id} to read.
 * @returns The row, or null. Null is neither an error nor a
 *   refusal: it is the fact the service decides a 404 from.
 */
async function selectPersonaById(
  db: Db,
  id: number,
): Promise<PersonaRecord | null> {
  const [row] = await db.select(PERSONA_COLUMNS)
    .from(personas)
    .where(eq(personas.id, id));

  return row ?? null;
}

/**
 * Builds the {@link PersonaStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per
 *   method call and never at construction, which is what lets the
 *   store be built before the Postgres dependency has started; see
 *   the thunk paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method, and at most
 *   one. It holds no state of its own, so building a second one
 *   over the same thunk is free and equivalent.
 */
export function createDbPersonaStore(getDb: () => Db): PersonaStore {
  return {
    /**
     * One window of one domain's personas, ordered by `role`
     * ascending because {@link PersonaStore.listPersonas} makes the
     * order part of the contract: Postgres promises nothing about
     * row order without an `ORDER BY`, so consecutive pages over an
     * unordered read can repeat one row and skip another while
     * every count on the wire still adds up. `role` is unique
     * WITHIN the domain and this read is scoped to one domain, so
     * the order is total and there is no tie-break to forget.
     *
     * The order is the database's own, under its own collation, and
     * the port is explicit that it is not a promise of a JavaScript
     * sort over the same strings: a role is free text carrying
     * case, spaces and punctuation. Nothing on this surface
     * serialises personas byte-for-byte, so nothing here has to
     * notice if a deployment's collation differs.
     *
     * The window arrives already validated, per the port, so
     * nothing here re-checks its bounds. An id no domain carries
     * reads as an empty list, which is the same answer as a domain
     * with no personas: whether the domain exists was settled by
     * the slug lookup before this call.
     */
    async listPersonas(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly PersonaRecord[]> {
      return await getDb().select(PERSONA_COLUMNS)
        .from(personas)
        .where(eq(personas.domainId, domainId))
        .orderBy(asc(personas.role))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * `SELECT count(*) FROM personas WHERE domain_id = $1`, with no
     * window: a page's total describes the collection rather than
     * the page, which is why the port keeps this separate from the
     * read above rather than answering it alongside.
     *
     * `count()` and not `count(personas.id)`, which is the opposite
     * of the choice `src/taxonomy/db-store.ts` makes for its
     * grouped category list and is right for the same reason: there
     * is no LEFT JOIN in this statement, so every row counted is a
     * real row and the bare form has no null-extended row to
     * miscount.
     *
     * drizzle maps the result with `Number`, so what arrives is a
     * JS number rather than the string the pg driver hands back for
     * a `bigint`. An id no domain carries answers zero rather than
     * failing: nothing points at a row that is not there.
     */
    async countPersonas(domainId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(personas)
        .where(eq(personas.domainId, domainId));

      return writtenRow(row, 'countPersonas').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where a request naming `/personas/:id` enters, and the only
     * thing that says which domain a `PATCH /personas/:id` is
     * editing: the answered record carries its own `domainId`, and
     * the path names none.
     */
    async findPersonaById(id: number): Promise<PersonaRecord | null> {
      return await selectPersonaById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing
     * it from the input, so the id is the database's own.
     *
     * ASSERTS A NEW ROW AND DOES NOT UPSERT, unlike
     * `scripts/seed-apply.ts`, which writes this same table through
     * an `ON CONFLICT` on this same natural key. The port carries
     * the argument: a `POST` is a caller stating the domain has no
     * persona for the role yet, so a duplicate is a refusal rather
     * than a silent rewrite of system text somebody spent an
     * afternoon tuning.
     *
     * Both of this table's mechanisms can refuse it and both arrive
     * as a `StoreRefusal`: `personas_domain_id_role_unique` on a
     * role the domain already carries, and
     * `personas_domain_id_domains_id_fk` on a `domainId` naming no
     * row. Unlike the taxonomy half's parent foreign key, neither
     * name is shared with another method, so a service reads both
     * off the refusal without knowing which call it made.
     */
    async insertPersona(input: InsertPersonaInput): Promise<PersonaRecord> {
      const [row] = await refusing(() => getDb().insert(personas)
        .values({
          domainId: input.domainId,
          role: input.role,
          systemText: input.systemText,
        })
        .returning(PERSONA_COLUMNS));

      return writtenRow(row, 'insertPersona');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, which the port
     * declares a legal call and the header explains: `personas`
     * carries no timestamp to stamp, so an omitted `role` and an
     * omitted `systemText` leave drizzle with an empty `set` list
     * and it throws `No values to set` rather than issuing a no-op
     * statement.
     *
     * The branch tests against `undefined` and there is no null to
     * test for: both columns are `NOT NULL`, so absent means leave
     * it alone and an empty `systemText` is a value being written
     * rather than a member being cleared. Past the branch that
     * costs nothing anyway — drizzle drops every `undefined`
     * value from a `set` list before rendering it, so the statement
     * writes exactly the members the caller named.
     *
     * THE ROLE IS PATCHABLE, which is the substantive difference
     * from `updateDomain` and `updateCategory` and the reason
     * `personas_domain_id_role_unique` is reachable from here at
     * all: a rename can collide exactly as a create can, measured
     * on the live server as the same 23505 naming the same
     * constraint. The database checks the RESULTING pair without
     * this method having to compute it, and a row is not in
     * conflict with itself, so writing a persona's own role back
     * over it is accepted. No `foreign-key-violation` can arrive:
     * `PersonaPatch` does not carry `domainId`, so no update
     * touches the constrained column.
     *
     * Null rather than a throw when no row carries the id.
     * Reachable even after a successful read, since the row may go
     * in between, and what that means is the caller's to decide.
     */
    async updatePersona(
      id: number,
      patch: PersonaPatch,
    ): Promise<PersonaRecord | null> {
      const db = getDb();

      if (patch.role === undefined && patch.systemText === undefined) {
        return await selectPersonaById(db, id);
      }

      const [row] = await refusing(() => db.update(personas)
        .set({ role: patch.role, systemText: patch.systemText })
        .where(eq(personas.id, id))
        .returning(PERSONA_COLUMNS));

      return row ?? null;
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by
     * a driver's affected-row field, which keeps the count a
     * property of the statement.
     *
     * NOTHING HANGS OFF A PERSONA, so this delete has neither a
     * guard nor a cascade: no foreign key in schema v2 points at
     * `personas`, and the port says outright that it cannot be
     * refused. The cascade that takes a domain's personas with it
     * runs on `personas.domain_id` from the other side, inside
     * `DomainStore.deleteDomain`, and nothing here participates in
     * it.
     *
     * It is wrapped in {@link refusing} anyway, per the header: a
     * bare statement here would make the one exception the place
     * where a constraint added later put a caller's bytes into a
     * log line through an untranslated `cause`.
     */
    async deletePersona(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(personas)
        .where(eq(personas.id, id))
        .returning({ id: personas.id }));

      return removed.length > 0;
    },
  };
}
