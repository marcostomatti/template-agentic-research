/**
 * @packageDocumentation
 * The drizzle half of the CATEGORY surface of {@link TaxonomyStore}:
 * one statement per method, over the `categories` table
 * `src/db/schema/taxonomy.ts` declares, plus the `terms` rows the
 * list read counts alongside them.
 *
 * THE CATEGORY HALF AND NOT THE PORT ENTIRE, which is what
 * {@link DbCategoryStore} says in the type system rather than in a
 * comment. The seven term methods land in their own stage and widen
 * the alias to `TaxonomyStore` whole; until they do, a caller wanting
 * the port entire cannot be handed this store, which is the honest
 * statement of what has been built rather than five real methods
 * beside seven that throw.
 *
 * THE DATABASE ARRIVES AS A THUNK, for the ordering reason
 * `src/domains/db-store.ts` sets out at length: the store is a value
 * `createService` is handed while the service is still registering,
 * which is before the Postgres dependency has started, so a store
 * demanding a live {@link Db} at construction could not be built at
 * the point it is needed. Every method resolves the database when a
 * caller arrives, and a caller only ever arrives after start.
 *
 * EVERY WRITE IS TRANSLATED THROUGH {@link classifyPgError}, and on
 * this table all three mechanisms are live rather than one: the
 * natural key refuses a duplicate `(domain_id, key)`, the foreign key
 * refuses a `parent_id` naming no row and a delete of a category that
 * still holds children, and the depth trigger refuses the three
 * parents it will not accept. `TaxonomyStore` states which method
 * raises which, and this module adds nothing to that classification
 * beyond running it.
 *
 * The wrapper is also a CONTAINMENT boundary, exactly as its sibling
 * argues. Both links of the error drizzle throws carry the caller's
 * bytes: the `DrizzleQueryError` spells `Failed query:` plus the SQL
 * and the bound `params:` line, and the pg `DatabaseError` under it
 * spells `Key (domain_id, key)=(<the submitted key>) already exists.`
 * `errorHandler` logs an unhandled error with its `cause`, so an
 * untranslated refusal would put a submitted key in a log line with
 * no code change anywhere. A `StoreRefusal` from
 * `src/db/store-errors.ts` carries neither, structurally.
 *
 * READS ARE COLUMN-SCOPED even though `CategoryRecord` is the whole
 * table today. Naming the five columns pins the projection to the
 * port's record type, so a column added to `categories` reaches no
 * caller until somebody puts it on the port deliberately —
 * `src/taxonomy/categories-routes.ts` hands this record straight to
 * `ok()`, so an unscoped read would put a new column on the wire in
 * the commit that added it.
 *
 * THE TERM COUNT IS ONE GROUPED LEFT JOIN, not a count per category.
 * A domain's taxonomy is read whole rather than paged, so the query
 * per category the obvious implementation issues is unbounded in the
 * number of round trips it takes; one statement is also one snapshot,
 * so no two of the counts a caller reads together can come from
 * different instants.
 *
 * IT COUNTS `terms.id` RATHER THAN ROWS, and that is the whole of
 * what makes an empty bucket answer zero. A LEFT JOIN gives a
 * category holding nothing exactly one null-extended row, so
 * `count(*)` would answer `1` for it — inverting the one member the
 * count exists for, since an operator scanning the list is looking
 * for the bucket that has nothing in it. `count(<column>)` counts
 * non-null values, so the same row contributes zero.
 * `CategoryWithTermCount` requires a counted zero rather than an
 * absent member, and grouping this way is what supplies one without a
 * fill-in step.
 *
 * The `GROUP BY` names the primary key alone. Postgres derives the
 * other four projected columns from it functionally, so repeating
 * them would state the same grouping at four times the length, and a
 * column added to the projection would then need adding twice.
 *
 * NOTHING HERE STAMPS A TIMESTAMP, which is why an empty patch is a
 * branch in this module and is not one in its sibling. `categories`
 * carries no `updated_at` for a write to maintain — the table has no
 * timestamp columns at all — so a patch naming no member leaves
 * genuinely nothing to set, and drizzle throws `No values to set` on
 * an empty update list rather than issuing a harmless statement.
 * `TaxonomyStore.updateCategory` declares that call legal, so the
 * implementation reads the row instead of writing it.
 */
import type {
  CategoryPatch,
  CategoryRecord,
  CategoryWithTermCount,
  InsertCategoryInput,
  TaxonomyStore,
} from './store.js';
import type { Db } from '../db/index.js';

import { asc, count, eq } from 'drizzle-orm';

import { categories, terms } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

/**
 * The category half of `TaxonomyStore`, as the five methods that have
 * an implementation here.
 *
 * A `Pick` OF THE PORT RATHER THAN A LIST OF ITS OWN, so a signature
 * here cannot drift from the thing it is naming: a hand-copied one
 * would go on type-checking against a port that had moved under it.
 * The same shape `tests/helpers/memory-research-store.ts` picks for
 * the same reason, so the two implementations are narrowed to one
 * another's surface rather than each to its own.
 */
export type DbCategoryStore = Pick<
  TaxonomyStore,
  | 'listCategoriesWithTermCounts'
  | 'findCategoryById'
  | 'insertCategory'
  | 'updateCategory'
  | 'deleteCategory'
>;

/**
 * The `categories` columns `CategoryRecord` is made of, as one object
 * every `SELECT` and every `RETURNING` below projects through.
 *
 * Written once so a read and a write cannot drift into projecting
 * different shapes, and named exhaustively so the list is what a
 * reader diffs against the record type rather than against the table.
 */
const CATEGORY_COLUMNS = {
  id: categories.id,
  domainId: categories.domainId,
  key: categories.key,
  name: categories.name,
  parentId: categories.parentId,
};

/**
 * What the list read projects: the record, plus the count the join
 * supplies.
 *
 * `count(terms.id)` and not `count()` — see the header for why the
 * bare form answers `1` for every empty bucket. drizzle maps the
 * result with `Number`, so what arrives is a JS number rather than
 * the string the pg driver hands back for a `bigint`.
 */
const CATEGORY_LIST_COLUMNS = {
  ...CATEGORY_COLUMNS,
  termCount: count(terms.id),
};

/**
 * The row a write was supposed to return, or a refusal naming the
 * statement that came back empty.
 *
 * An insert with a `RETURNING` list yields exactly one row on every
 * path Postgres takes, so an empty result is not a case to handle —
 * it is a state this module has no account of. Under
 * `noUncheckedIndexedAccess` the destructure is `T | undefined`
 * regardless, so the choice is between a refusal naming the statement
 * that produced nothing and a cast pretending the question never
 * arose.
 *
 * @param row - The destructured first row of a `RETURNING` result.
 * @param statement - What was being written, for the message.
 * @returns The row, narrowed.
 * @throws Error When the write returned no row at all.
 */
function writtenRow<T>(row: T | undefined, statement: string): T {
  if (row === undefined) {
    throw new Error(`taxonomy store: ${statement} returned no row`);
  }

  return row;
}

/**
 * Runs one statement, translating a Postgres refusal into the one
 * error type `TaxonomyStore` lets cross it.
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
 * The sibling in `src/domains/db-store.ts` is the same three lines
 * and is deliberately not imported: nothing outside `src/domains/`
 * reaches that module, which is a containment its own barrel states
 * about itself. Folding both into a shared home is a refactor of two
 * finished modules rather than a part of building this one.
 */
async function refusing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw classifyPgError(err) ?? err;
  }
}

/**
 * One category by id, or null when no row carries it.
 *
 * A function rather than a method call on the returned object,
 * because two members answer this same question: the lookup a route
 * naming `/categories/:id` enters through, and the row an empty patch
 * is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The `CategoryRecord.id` to read.
 * @returns The row, or null. Null is neither an error nor a refusal:
 *   it is the fact the service decides a 404 from.
 */
async function selectCategoryById(
  db: Db,
  id: number,
): Promise<CategoryRecord | null> {
  const [row] = await db.select(CATEGORY_COLUMNS)
    .from(categories)
    .where(eq(categories.id, id));

  return row ?? null;
}

/**
 * Builds the category half of `TaxonomyStore` backed by Postgres.
 *
 * @param getDb - Resolves the drizzle client. Called once per method
 *   call and never at construction, which is what lets the store be
 *   built before the Postgres dependency has started; see the thunk
 *   paragraph above for why that ordering is forced.
 * @returns A store issuing one statement per method — the list read
 *   included, which is a single grouped left join rather than a count
 *   per category. It holds no state of its own, so building a second
 *   one over the same thunk is free and equivalent.
 */
export function createDbTaxonomyStore(getDb: () => Db): DbCategoryStore {
  return {
    /**
     * Every category in one domain with its term count, in ONE
     * statement: a left join onto `terms`, grouped by the category's
     * primary key.
     *
     * Ordered by `key` ascending because the port makes the order
     * part of the contract, and `key` is unique within the domain, so
     * the order is total and there is no tie-break to forget. It is
     * not tree order: assembling the tree out of `parentId` is the
     * reader's, per `TaxonomyStore.listCategoriesWithTermCounts`.
     *
     * Unwindowed, because a domain's taxonomy is shallow and read
     * whole to be edited. There is no `countCategories` beside this
     * for the same reason.
     *
     * A domain with no taxonomy and an id no domain carries are the
     * same answer here — an empty list. Whether the domain exists was
     * settled by the slug lookup before this call.
     */
    async listCategoriesWithTermCounts(
      domainId: number,
    ): Promise<readonly CategoryWithTermCount[]> {
      return await getDb().select(CATEGORY_LIST_COLUMNS)
        .from(categories)
        .leftJoin(terms, eq(terms.categoryId, categories.id))
        .where(eq(categories.domainId, domainId))
        .groupBy(categories.id)
        .orderBy(asc(categories.key));
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Answers a `CategoryRecord` and not a `CategoryWithTermCount`:
     * the count exists for the list, and a single read would be
     * paying for a number nobody asked for.
     */
    async findCategoryById(id: number): Promise<CategoryRecord | null> {
      return await selectCategoryById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id is the database's own.
     *
     * `parentId` is written from the input on every call rather than
     * left to the column's default, which is the port refusing to let
     * an omission mean "root": `InsertCategoryInput` requires the
     * member and allows it to be null, so the choice is always the
     * service's and always visible.
     *
     * Three mechanisms can refuse this write and all three arrive as
     * a `StoreRefusal`: the natural key, the depth trigger with no
     * constraint name, and the parent foreign key. Telling the last
     * one from the delete's refusal — they share a name — is the
     * service's, by which call it made.
     */
    async insertCategory(input: InsertCategoryInput): Promise<CategoryRecord> {
      const [row] = await refusing(() => getDb().insert(categories)
        .values({
          domainId: input.domainId,
          key: input.key,
          name: input.name,
          parentId: input.parentId,
        })
        .returning(CATEGORY_COLUMNS));

      return writtenRow(row, 'insertCategory');
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, which the port
     * declares a legal call: `categories` carries no `updated_at` to
     * stamp, so an omitted `name` and an omitted `parentId` leave
     * drizzle with an empty `set` list and it throws `No values to
     * set` rather than issuing a no-op statement.
     *
     * ABSENT AND NULL ARE DIFFERENT REQUESTS, which is why the branch
     * tests against `undefined` rather than reaching for a nullish
     * default. Absent leaves the row where it is; `null` promotes it
     * to a root, and is the only way back up. Past the branch that
     * distinction costs nothing: drizzle drops every `undefined`
     * value from a `set` list before rendering it and keeps a null,
     * so the statement writes exactly the members the caller named.
     *
     * Null rather than a throw when no row carries the id. Reachable
     * even after a successful read, since the row may go in between,
     * and what that means is the caller's to decide.
     *
     * The depth trigger fires on an UPDATE too, and this is the only
     * method that can reach its third branch — giving a parent to a
     * row that already has children — since an INSERT produces an id
     * nothing can point at yet. No `unique-violation` can arrive:
     * `CategoryPatch` does not carry `key`, and nothing else on the
     * row is unique.
     */
    async updateCategory(
      id: number,
      patch: CategoryPatch,
    ): Promise<CategoryRecord | null> {
      const db = getDb();

      if (patch.name === undefined && patch.parentId === undefined) {
        return await selectCategoryById(db, id);
      }

      const [row] = await refusing(() => db.update(categories)
        .set({ name: patch.name, parentId: patch.parentId })
        .where(eq(categories.id, id))
        .returning(CATEGORY_COLUMNS));

      return row ?? null;
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * ITS TERMS AND ITS CRITERIA GO WITH IT AND ITS CHILDREN DO NOT,
     * and neither half happens here: both of the first two cascade on
     * `category_id`, so one statement takes the bucket's whole
     * contents, while `categories.parent_id` is `NO ACTION` and the
     * database refuses the delete outright. Nothing in this method
     * deletes a dependent row or checks for a child.
     *
     * That refusal names `categories_parent_id_categories_id_fk` —
     * the same constraint a parent naming no row raises on the two
     * writes above — so it is the calling method and nothing on the
     * refusal that separates a 409 here from a 422 there.
     */
    async deleteCategory(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(categories)
        .where(eq(categories.id, id))
        .returning({ id: categories.id }));

      return removed.length > 0;
    },
  };
}
