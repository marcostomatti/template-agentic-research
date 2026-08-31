/**
 * @packageDocumentation
 * The drizzle half of {@link DomainStore}: one statement per method,
 * over the `domains` table `src/db/schema/domains.ts` declares plus
 * the three dependent tables the delete guard reads.
 *
 * THE DATABASE ARRIVES AS A THUNK, and the reason is an ordering one
 * rather than a style shared with `src/auth/db-store.ts`. The store
 * is a value `createService` is handed while the service is still
 * registering, which is BEFORE the Postgres dependency has started,
 * so a store demanding a live {@link Db} at construction could not
 * be built at the point it is needed. Deferring the lookup costs one
 * property read per call and breaks that cycle: every method
 * resolves the database when a caller arrives, and a caller only
 * ever arrives after start.
 *
 * EVERY WRITE IS TRANSLATED THROUGH {@link classifyPgError}, not
 * only the one refusal {@link DomainStore} declares. The port is
 * right that a duplicate slug on {@link DomainStore.insertDomain} is
 * the whole of this surface's refusal set today — every foreign key
 * onto `domains.id` is `ON DELETE CASCADE`, and the table carries no
 * CHECK — so the patch and the delete have no mechanism to refuse
 * them. They go through the same wrapper anyway, because what the
 * alternative risks is not an untranslated error but a
 * REQUEST-CONTENT LEAK. Both links of the error drizzle throws carry
 * the caller's bytes: the `DrizzleQueryError` spells `Failed query:`
 * plus the SQL and the bound `params:` line, and the pg
 * `DatabaseError` under it spells `Key (slug)=(<the submitted slug>)
 * already exists.` `errorHandler` logs an unhandled error with its
 * `cause`, so an untranslated refusal puts a submitted value in a
 * log line with no code change anywhere. A `StoreRefusal`
 * carries neither, structurally — see `src/db/store-errors.ts`. So
 * the wrapper is a containment boundary that also classifies, and a
 * constraint added to this table later inherits it rather than
 * having to discover it.
 *
 * READS ARE COLUMN-SCOPED even though {@link DomainRecord} is the
 * whole table today. Naming the eight columns pins the projection to
 * the port's record type, so a column added to `domains` reaches no
 * caller until somebody puts it on the port deliberately. Milder
 * than the rule `src/auth/store.ts` states for its hash columns —
 * nothing on `domains` is secret — but `src/domains/routes.ts`
 * hands this record straight to `ok()`, so an unscoped read would
 * put a new column on the wire in the commit that added it.
 *
 * `updated_at` IS WRITTEN AS `now()` RATHER THAN FROM A JS `Date`.
 * `src/db/schema/domains.ts` declares no trigger and no drizzle
 * `$onUpdate` behind the column, deliberately, because the pipeline
 * writes these rows through hand-written SQL as well and a hook
 * firing on only one of the two paths leaves a column that is stale
 * exactly when it is consulted. Maintaining it is therefore the
 * writer's, and spelling it in the statement means two rows this
 * store stamped cannot disagree however far the service host's clock
 * has drifted from the database's.
 */
import type {
  DomainDependentCounts,
  DomainPatch,
  DomainRecord,
  DomainStore,
  InsertDomainInput,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { asc, count, eq, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';

import { domains, findings, sources, topics } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The `domains` columns {@link DomainRecord} is made of, as one
 * object every `SELECT` and every `RETURNING` below projects
 * through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the
 * table.
 */
const DOMAIN_COLUMNS = {
  id: domains.id,
  slug: domains.slug,
  name: domains.name,
  settings: domains.settings,
  featureVersion: domains.featureVersion,
  embeddingModel: domains.embeddingModel,
  createdAt: domains.createdAt,
  updatedAt: domains.updatedAt,
};

/**
 * One branch of the dependent-count union: which table was counted,
 * and how many rows it holds for the domain.
 *
 * `dependent` is a plain `string` because it comes back off the
 * wire. Narrowing it to `keyof DomainDependentCounts` here would be
 * a claim about what Postgres returned rather than a check of it,
 * and {@link countedTotal} is where the two are actually reconciled.
 */
interface DependentCountRow {
  /** The label its branch of the union selected. */
  readonly dependent: string;
  /** `count(*)` over that table, for one `domain_id`. */
  readonly total: number;
}

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
    throw new Error(`domain store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Reads one dependent table's count out of the union's result.
 *
 * @param rows - What the union answered, in whatever order.
 * @param dependent - Which branch to read, spelled as the member of
 *   {@link DomainDependentCounts} it fills. Typed against that
 *   interface so a fourth counted table cannot be read here without
 *   the port having declared it.
 * @returns That branch's `count(*)`.
 * @throws Error When the union answered no row for this label.
 *
 * @remarks
 * KEYED BY LABEL RATHER THAN BY POSITION, because `UNION ALL`
 * promises no order at all without an `ORDER BY`. Reading the three
 * results positionally would be correct on every run that happened
 * to come back in branch order and silently attribute one table's
 * count to another on the run that did not — on a guard whose whole
 * output is three numbers an operator reads before confirming a
 * destructive delete.
 *
 * THE THROW IS NOT THE `0` CASE. Each branch is an aggregate with no
 * `GROUP BY`, and such an aggregate answers exactly one row whatever
 * the table holds, so a domain with nothing hanging off it still
 * produces three rows carrying three zeros. A MISSING row therefore
 * cannot mean "no rows to count" — it means the statement did not
 * take the shape this function reads, which is the one thing
 * {@link DomainStore.countDomainDependents} may not answer as a zero.
 * Its docblock puts it exactly that way: `0` and "never counted" are
 * different facts to a guard whose job is telling them apart.
 */
function countedTotal(
  rows: readonly DependentCountRow[],
  dependent: keyof DomainDependentCounts,
): number {
  const row = rows.find((candidate) => candidate.dependent === dependent);

  if (row === undefined) {
    throw new Error(
      `domain store: dependent count returned no ${dependent} row`,
    );
  }

  return row.total;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type {@link DomainStore} lets cross it.
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
 */
async function refusing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw classifyPgError(err) ?? err;
  }
}

/**
 * Builds the {@link DomainStore} backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method — including the
 *   dependent count, which is one `UNION ALL` rather than three
 *   round trips. It holds no state of its own, so building a second
 *   one over the same thunk is free and equivalent.
 */
export function createDbDomainStore(getDb: () => Db): DomainStore {
  return {
    /**
     * One window, ordered by `slug` ascending because the port makes
     * the order part of the contract: Postgres promises nothing
     * about row order without an `ORDER BY`, so consecutive pages
     * over an unordered read can repeat one row and skip another
     * while every count on the wire still adds up. `slug` is UNIQUE,
     * so the order is total and there is no tie-break to forget.
     *
     * The window arrives already validated, per
     * {@link DomainStore.listDomains}, so nothing here re-checks its
     * bounds.
     */
    async listDomains(window: StoreWindow): Promise<readonly DomainRecord[]> {
      return await getDb().select(DOMAIN_COLUMNS)
        .from(domains)
        .orderBy(asc(domains.slug))
        .limit(window.limit)
        .offset(window.offset);
    },

    /**
     * `SELECT count(*) FROM domains`, with no window and no
     * predicate: a page's total describes the collection rather than
     * the page.
     *
     * drizzle's `count()` maps the result with `Number`, so what
     * arrives is a JS number rather than the string the pg driver
     * hands back for a `bigint`.
     */
    async countDomains(): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(domains);

      return writtenRow(row, 'countDomains').total;
    },

    /**
     * One row by `domains_slug_unique`, so the result is at most one
     * row by construction rather than by a `LIMIT`.
     *
     * Null rather than a throw when nothing carries the slug: that
     * is the fact the service decides a 404 from, and it is not this
     * layer's decision to take.
     */
    async findDomainBySlug(slug: string): Promise<DomainRecord | null> {
      const [row] = await getDb().select(DOMAIN_COLUMNS)
        .from(domains)
        .where(eq(domains.slug, slug));

      return row ?? null;
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id and both stamps are the database's
     * own.
     *
     * `created_at` and `updated_at` come from their column defaults
     * here — both are `defaultNow()` — which is the same clock the
     * patch below spells explicitly.
     *
     * The duplicate slug this refuses is the one mechanism
     * {@link DomainStore} declares: `domains_slug_unique`, as a
     * `unique-violation` carrying that constraint name.
     */
    async insertDomain(input: InsertDomainInput): Promise<DomainRecord> {
      const [row] = await refusing(() => getDb().insert(domains)
        .values({
          slug: input.slug,
          name: input.name,
          settings: input.settings,
        })
        .returning(DOMAIN_COLUMNS));

      return writtenRow(row, 'insertDomain');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, stamping `updated_at` from
     * the database's clock on every call.
     *
     * AN ABSENT MEMBER IS NOT WRITTEN, and that falls out of the
     * statement rather than out of a branch: drizzle drops every
     * `undefined` value from a `set` list before rendering it, so an
     * omitted `name` or `settings` never reaches the SQL and the
     * stored value stands. A PRESENT `settings` replaces the stored
     * payload WHOLE, because a `set` list assigns a jsonb column
     * rather than merging into it — the whole-unit rule
     * {@link DomainPatch} states, and one nothing here has to
     * enforce separately.
     *
     * The unconditional `updated_at` is also what keeps a patch
     * carrying no member at all a legal write: drizzle throws `No
     * values to set` on an empty list, and the stamp means the list
     * is never empty.
     *
     * Null rather than a throw when no row carries the id. Reachable
     * even after a successful read, since the row may go in between,
     * and what that means is the caller's to decide.
     */
    async updateDomain(
      id: number,
      patch: DomainPatch,
    ): Promise<DomainRecord | null> {
      const [row] = await refusing(() => getDb().update(domains)
        .set({
          name: patch.name,
          settings: patch.settings,
          updatedAt: sql`now()`,
        })
        .where(eq(domains.id, id))
        .returning(DOMAIN_COLUMNS));

      return row ?? null;
    },

    /**
     * All three dependent counts in ONE statement: a `UNION ALL`
     * over three labelled aggregates, rather than three awaits.
     *
     * Three round trips would answer the same numbers, and would
     * answer them from three different instants — a topic inserted
     * between the first and the third is counted or not depending on
     * which table it landed in. One statement takes all three counts
     * inside one snapshot, so the numbers a refusal names are
     * mutually consistent, which is the least an operator reading
     * them before confirming a destructive delete is owed.
     *
     * Each branch is `count(*)` with no `GROUP BY`, which is what
     * makes a table holding nothing contribute a row carrying `0`
     * instead of contributing no row at all — the failure
     * {@link DomainStore.countDomainDependents} warns a grouped
     * implementation to fill in. An id no domain carries therefore
     * answers three zeros, as the port requires, without a lookup in
     * front of it.
     *
     * {@link countedTotal} reads the result by label and refuses to
     * invent a missing one; see its remarks for why neither the
     * ordering nor the zero can be assumed here.
     */
    async countDomainDependents(id: number): Promise<DomainDependentCounts> {
      const db = getDb();
      const counted = await unionAll(
        db.select({ dependent: sql<string>`'topics'`, total: count() })
          .from(topics)
          .where(eq(topics.domainId, id)),
        db.select({ dependent: sql<string>`'sources'`, total: count() })
          .from(sources)
          .where(eq(sources.domainId, id)),
        db.select({ dependent: sql<string>`'findings'`, total: count() })
          .from(findings)
          .where(eq(findings.domainId, id)),
      );

      return {
        topics: countedTotal(counted, 'topics'),
        sources: countedTotal(counted, 'sources'),
        findings: countedTotal(counted, 'findings'),
      };
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * THE CASCADE IS THE DATABASE'S. Every foreign key onto
     * `domains.id` is `ON DELETE CASCADE`, so this single statement
     * takes the taxonomy, the personas, the topics, the sources and
     * the findings with it. Nothing here deletes a dependent row
     * itself and nothing reports what went, which is exactly why
     * {@link DomainStore.countDomainDependents} is a separate read
     * taken BEFORE the decision.
     */
    async deleteDomain(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(domains)
        .where(eq(domains.id, id))
        .returning({ id: domains.id }));

      return removed.length > 0;
    },
  };
}
