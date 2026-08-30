/**
 * @packageDocumentation
 * The drizzle half of {@link TaxonomyStore}: one statement per
 * method, over the `categories` and `terms` tables
 * `src/db/schema/taxonomy.ts` declares.
 *
 * THE PORT ENTIRE, as of the term half landing here. The category
 * surface stood behind a narrowed alias while the seven term methods
 * were unwritten — the honest statement of what existed, rather than
 * five real methods beside seven that threw — and this module and
 * `tests/helpers/memory-research-store.ts` now answer the same twelve
 * questions from either side of the same contract.
 *
 * THE DATABASE ARRIVES AS A THUNK, for the ordering reason
 * `src/domains/db-store.ts` sets out at length: the store is a value
 * `createService` is handed while the service is still registering,
 * which is before the Postgres dependency has started, so a store
 * demanding a live {@link Db} at construction could not be built at
 * the point it is needed. Every method resolves the database when a
 * caller arrives, and a caller only ever arrives after start.
 *
 * EVERY WRITE IS TRANSLATED THROUGH {@link classifyPgError}, and
 * across the two tables all three mechanisms are live rather than
 * one: the natural keys refuse a duplicate `(domain_id, key)` and a
 * duplicate `(category_id, pattern)`, the foreign keys refuse a
 * `parent_id` naming no row, a delete of a category that still holds
 * children and a `category_id` naming no row, and the depth trigger
 * refuses the three parents it will not accept. `TaxonomyStore`
 * states which method raises which, and this module adds nothing to
 * that classification beyond running it.
 *
 * ONE REFUSAL IS DELIBERATELY LEFT UNTRANSLATED, and it belongs to
 * the batch upsert alone. Postgres answers SQLSTATE 21000 — `ON
 * CONFLICT DO UPDATE command cannot affect row a second time` —
 * when one statement's values carry the same conflict target twice,
 * and `classifyPgError` does not recognise it, so it reaches a route
 * as a 500. That is the port's decision rather than an oversight:
 * the duplicate is a fault in the submitted document rather than in
 * the request, a tidy 4xx would name neither of the two colliding
 * rows, and `./terms-service.ts` refuses such a document by name and
 * by position before any of this runs.
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
 * READS ARE COLUMN-SCOPED even though `CategoryRecord` and
 * {@link TermRecord} are each the whole table today. Naming the
 * columns pins every projection to the port's record type, so a
 * column added to either table reaches no caller until somebody puts
 * it on the port deliberately — the routers hand these records
 * straight to `ok()`, so an unscoped read would put a new column on
 * the wire in the commit that added it. The `RETURNING` lists project
 * through the same objects the `SELECT`s do, which is what stops a
 * read and a write drifting into different shapes.
 *
 * ONE COLUMN IS NARROWER ON THE PORT THAN IT IS ON THE TABLE, and
 * that gap has to be crossed rather than assumed away. `polarity` is
 * a `text` column, so drizzle infers a selected row's member as
 * `string`, while {@link TermRecord} types it by the `TermPolarity`
 * union `terms_polarity_check` is generated from — measured, and
 * the reason a selected row is not assignable to the record by
 * spreading. {@link toTermRecord} is where the narrowing happens, and
 * it re-checks membership rather than casting: the CHECK makes the
 * cast safe today, and a check that reads the value costs one
 * comparison per row and turns a dropped constraint into a loud
 * throw instead of a union quietly admitting a fourth member.
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
 * branch in this module and is not one in its sibling. NEITHER table
 * carries an `updated_at` for a write to maintain — neither has any
 * timestamp column at all — so a patch naming no member leaves
 * genuinely nothing to set, and drizzle throws `No values to set` on
 * an empty update list rather than issuing a harmless statement.
 * `TaxonomyStore.updateCategory` and `TaxonomyStore.updateTerm` both
 * declare that call legal, so both implementations read the row
 * instead of writing it, and both branches are unobservable in the
 * answered row, in the stored row and in a statement COUNT: what
 * separates them from a write that sets every member back to itself
 * is the statement TEXT, which is what a probe over an instrumented
 * client reads and what nothing else can.
 *
 * THE BULK IMPORT IS ONE STATEMENT, AND ATOMICITY IS THE REASON
 * RATHER THAN ROUND TRIPS. `TaxonomyStore.upsertTerms` forbids an
 * implementation that loops: a document must land whole or not at
 * all, and a loop would leave a partial lexicon behind on the first
 * refusal and make the answered count a description of how far it
 * got. One `INSERT ... ON CONFLICT DO UPDATE` over a multi-row
 * `VALUES` list is what that requires.
 *
 * ITS ARBITER IS `terms_category_id_pattern_unique`, NAMED BY ITS
 * COLUMNS AND NOT BY ITS NAME, and the difference is drizzle's rather
 * than a choice. `onConflictDoUpdate` takes a column or a list of
 * them and renders `on conflict ("category_id","pattern")`; a raw
 * `sql` fragment in that position throws inside the builder, so
 * `ON CONFLICT ON CONSTRAINT <name>` is unreachable without
 * abandoning the query builder and the typed `RETURNING` list with
 * it — measured under drizzle 0.45.2. Postgres then INFERS the
 * arbiter, and it infers this one: that pair is the column list of
 * exactly one unique index on `terms`, and the primary key over `id`
 * does not match it. {@link TERM_CONFLICT_TARGET} is where the pair
 * is written, so the name it stands for is stated once beside the
 * columns rather than in each caller's head.
 *
 * ITS `SET` LIST READS `excluded`, WHICH IS WHAT MAKES THE BATCH A
 * BATCH. `scripts/seed-apply.ts` upserts the same rows one at a time
 * and can set literal values because each statement carries exactly
 * one row; here every row conflicting must take ITS OWN submitted
 * values, and `excluded` is the row Postgres was proposing when the
 * conflict fired. The identifiers are built from the schema columns'
 * own `name` rather than typed out, so a renamed column moves the
 * statement with it.
 *
 * `categoryId` AND `pattern` ARE NOT IN THAT `SET` LIST, and their
 * absence is the design rather than an omission: they are what the
 * row was MATCHED on, so there is nothing in either to rewrite. A
 * conflicting row therefore keeps its stored id, which is what lets
 * import, export and re-import settle instead of accumulating a
 * second row that would count the same match twice.
 */
import type {
  CategoryPatch,
  CategoryRecord,
  CategoryWithTermCount,
  InsertCategoryInput,
  InsertTermInput,
  TaxonomyStore,
  TermPatch,
  TermRecord,
  TermValues,
} from './store.js';
import type { Db } from '../db/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { asc, count, eq, sql } from 'drizzle-orm';

import { TERM_POLARITIES } from '../db/schema/values.js';
import { categories, terms } from '../db/schema.js';
import { classifyPgError } from '../db/store-errors.js';

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
 * The `terms` columns {@link TermRecord} is made of, projected by
 * every `SELECT` and every `RETURNING` on the term half.
 *
 * The counterpart of {@link CATEGORY_COLUMNS} and written for the
 * same two reasons: a read and a write cannot drift into different
 * shapes, and the list is what a reader diffs against the record
 * type rather than against the table.
 *
 * What it does NOT do is settle the record's TYPE. `polarity` comes
 * back as `string` from a `text` column however it is projected, so
 * {@link toTermRecord} sits between this and every answer.
 */
const TERM_COLUMNS = {
  id: terms.id,
  categoryId: terms.categoryId,
  pattern: terms.pattern,
  weight: terms.weight,
  polarity: terms.polarity,
  notes: terms.notes,
};

/**
 * The arbiter of the bulk upsert: the column pair
 * `terms_category_id_pattern_unique` is declared on.
 *
 * The constraint's NAME cannot appear in the statement — see the
 * header for the measurement — so this is the one place the pair and
 * the name it stands for are written together, and a caller reaches
 * the arbiter through the constant rather than restating two columns
 * and hoping they are the right two.
 */
const TERM_CONFLICT_TARGET = [terms.categoryId, terms.pattern];

/**
 * What a conflicting row is rewritten to: the three columns that are
 * neither the row's identity nor its arbiter, each taken from the row
 * the statement was proposing.
 *
 * `excluded.<column>` and not a literal, because one statement
 * carries many rows and each conflicting one must take ITS OWN
 * submitted values. The identifiers come off the schema columns'
 * `name`, so this cannot drift from the table.
 */
const TERM_CONFLICT_UPDATE = {
  weight: sql`excluded.${sql.identifier(terms.weight.name)}`,
  polarity: sql`excluded.${sql.identifier(terms.polarity.name)}`,
  notes: sql`excluded.${sql.identifier(terms.notes.name)}`,
};

/**
 * A `terms` row as drizzle hands it back: {@link TermRecord} with the
 * one member the table types more widely than the port does.
 *
 * Derived from the record rather than listed, so a column added to
 * both moves this shape with them and only the genuine difference is
 * spelled out. `polarity` is that difference and the whole of it: every
 * other column's inferred type already matches the port, measured.
 */
type SelectedTerm = Omit<TermRecord, 'polarity'> & {
  readonly polarity: string;
};

/**
 * A selected `terms` row as the port's {@link TermRecord}, with
 * `polarity` narrowed from the column's `string` to the union.
 *
 * THE NARROWING IS CHECKED RATHER THAN ASSERTED. `terms_polarity_check`
 * is generated from the same `TERM_POLARITIES` tuple the union is,
 * so a stored value outside it is unreachable while the constraint
 * stands — which is exactly why a cast would be silent if it ever
 * stopped standing. Reading the value costs one comparison per row
 * and turns a dropped or widened CHECK into a throw naming the
 * column, rather than a `TermRecord` circulating with a member no
 * reader of the union expects.
 *
 * The message names the column and the constraint and no part of the
 * value, so nothing a caller submitted reaches a log line through it
 * — the same containment the `StoreRefusal` translation gives the
 * write path.
 *
 * @param row - A row projected through {@link TERM_COLUMNS}.
 * @returns The same row, typed by the port.
 * @throws Error When `polarity` is outside `TERM_POLARITIES`.
 */
function toTermRecord(row: SelectedTerm): TermRecord {
  const polarity = TERM_POLARITIES
    .find((member) => member === row.polarity);

  if (polarity === undefined) {
    throw new Error(
      'taxonomy store: terms.polarity holds a value outside '
      + 'terms_polarity_check',
    );
  }

  return { ...row, polarity };
}

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
 * One term by id, or null when no row carries it.
 *
 * A function for the same reason {@link selectCategoryById} is one:
 * two members ask this question, the `/terms/:id` lookup and the row
 * an empty patch is owed without a write.
 *
 * @param db - The already resolved client, so a caller that has one
 *   in hand does not resolve it twice.
 * @param id - The {@link TermRecord.id} to read.
 * @returns The row, or null. Null is neither an error nor a refusal:
 *   it is the fact the service decides a 404 from.
 */
async function selectTermById(
  db: Db,
  id: number,
): Promise<TermRecord | null> {
  const [row] = await db.select(TERM_COLUMNS)
    .from(terms)
    .where(eq(terms.id, id));

  return row === undefined
    ? null
    : toTermRecord(row);
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
export function createDbTaxonomyStore(getDb: () => Db): TaxonomyStore {
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

    /**
     * One category's terms, `pattern` ascending, windowed only when
     * a window was given.
     *
     * AN ABSENT WINDOW READS THE WHOLE CATEGORY, which is a caller's
     * call rather than a default standing in for one. A `?format=seed`
     * export is a document about the category as a whole, and serving
     * it by counting first and then asking for a window that size
     * would be two reads whose answers can disagree.
     *
     * The order is the database's own, under its own collation, and
     * `TaxonomyStore.listTerms` is explicit that it is not a promise
     * of a JavaScript sort over the same strings: a pattern is free
     * text carrying case, spaces and punctuation. What `ORDER BY`
     * buys is a TOTAL order, so consecutive pages cannot repeat one
     * row and skip another; `pattern` is unique within the category,
     * so there is no tie-break to forget. The seed serialiser sorts
     * for itself rather than trusting this.
     *
     * The window arrives already validated, so nothing here re-checks
     * its bounds. An id no category carries reads as an empty list,
     * which is the same answer as an empty category: whether the
     * category exists was settled before this call.
     */
    async listTerms(
      categoryId: number,
      window?: StoreWindow,
    ): Promise<readonly TermRecord[]> {
      const read = getDb().select(TERM_COLUMNS)
        .from(terms)
        .where(eq(terms.categoryId, categoryId))
        .orderBy(asc(terms.pattern));
      const rows = window === undefined
        ? await read
        : await read.limit(window.limit).offset(window.offset);

      return rows.map(toTermRecord);
    },

    /**
     * `SELECT count(*) FROM terms WHERE category_id = $1`, with no
     * window: a page's total describes the collection and not the
     * page, which is why the port keeps this separate from the read
     * above rather than answering it alongside.
     *
     * `count()` and not `count(terms.id)` here, which is the opposite
     * of the choice the category list makes and is right for the same
     * reason: there is no LEFT JOIN in this statement, so every row
     * counted is a real row and the bare form has no null-extended
     * row to miscount.
     *
     * An id no category carries answers zero rather than failing.
     * Nothing points at a row that is not there.
     */
    async countTerms(categoryId: number): Promise<number> {
      const [row] = await getDb().select({ total: count() })
        .from(terms)
        .where(eq(terms.categoryId, categoryId));

      return writtenRow(row, 'countTerms').total;
    },

    /**
     * One row by primary key, so the result is at most one row by
     * construction rather than by a `LIMIT`.
     *
     * Where a request naming `/terms/:id` enters, and where a bucket
     * move reads the term's current category from before deciding
     * whether the move is legal.
     */
    async findTermById(id: number): Promise<TermRecord | null> {
      return await selectTermById(getDb(), id);
    },

    /**
     * One insert, reading the row back rather than reconstructing it
     * from the input, so the id is the database's own.
     *
     * ASSERTS A NEW ROW AND DOES NOT UPSERT, which is the whole
     * difference from the method below: a single `POST` is a caller
     * stating that a pattern is not yet in the bucket, so the natural
     * key refusing it is a 409 rather than a silent rewrite of
     * somebody else's weight.
     *
     * Two mechanisms can refuse it and both arrive as a
     * `StoreRefusal`: `terms_category_id_pattern_unique` on a pattern
     * the category already carries, and
     * `terms_category_id_categories_id_fk` on a `categoryId` naming
     * no row. Unlike the category half's foreign key, that one
     * refuses exactly one thing, so a service can read it off the
     * refusal without knowing which call it made.
     */
    async insertTerm(input: InsertTermInput): Promise<TermRecord> {
      const [row] = await refusing(() => getDb().insert(terms)
        .values({
          categoryId: input.categoryId,
          pattern: input.pattern,
          weight: input.weight,
          polarity: input.polarity,
          notes: input.notes,
        })
        .returning(TERM_COLUMNS));

      return toTermRecord(writtenRow(row, 'insertTerm'));
    },

    /**
     * A whole lexicon into one category, as ONE
     * `INSERT ... ON CONFLICT DO UPDATE` over a multi-row `VALUES`
     * list.
     *
     * One statement because the port forbids a loop, and it forbids a
     * loop for atomicity rather than for round trips: a document
     * lands whole or not at all, so no refusal can leave a partial
     * lexicon behind or make the answered count a description of how
     * far a loop got. See the header for the arbiter, for why its
     * name cannot appear in the statement, and for why the `SET` list
     * reads `excluded` while `scripts/seed-apply.ts` can use literals.
     *
     * THE EMPTY LIST RETURNS ABOVE EVERYTHING, the foreign key
     * included. A seed document declaring no terms is a legal call
     * the port states outright, drizzle throws on an empty `values`
     * list rather than issuing a harmless statement, and no statement
     * running is exactly why a `categoryId` naming no category is NOT
     * refused here. That is the database's behaviour being reported
     * rather than a shortcut: nothing was written, so nothing was
     * checked.
     *
     * `categoryId` is taken once and written onto every row, which is
     * what makes one document, one category structural rather than a
     * promise each row repeats and this method would have to re-check.
     *
     * The answered order is the statement's own processing order and
     * the port promises nothing about it. A caller wanting the rows
     * ordered re-reads through `listTerms`.
     */
    async upsertTerms(
      categoryId: number,
      rows: readonly TermValues[],
    ): Promise<readonly TermRecord[]> {
      if (rows.length === 0) {
        return [];
      }

      const written = await refusing(() => getDb().insert(terms)
        .values(rows.map((row) => ({
          categoryId,
          pattern: row.pattern,
          weight: row.weight,
          polarity: row.polarity,
          notes: row.notes,
        })))
        .onConflictDoUpdate({
          target: TERM_CONFLICT_TARGET,
          set: TERM_CONFLICT_UPDATE,
        })
        .returning(TERM_COLUMNS));

      return written.map(toTermRecord);
    },

    /**
     * `UPDATE ... SET ... WHERE id = $1`, or a plain read when the
     * patch names nothing.
     *
     * THE EMPTY PATCH READS RATHER THAN WRITES, for the reason
     * `updateCategory` gives and by the same mechanism: `terms`
     * carries no `updated_at` to stamp either, so a patch naming no
     * member leaves drizzle an empty `set` list and it throws `No
     * values to set`. The port declares that call legal, so this
     * answers the stored row instead.
     *
     * ABSENT AND NULL ARE DIFFERENT REQUESTS for `notes`, which is
     * why the branch tests every member against `undefined` rather
     * than reaching for a nullish default: absent leaves the note
     * alone and `null` clears it. Past the branch that costs nothing,
     * because drizzle drops every `undefined` value from a `set` list
     * before rendering it and keeps a null.
     *
     * BOTH HALVES OF THE NATURAL KEY ARE PATCHABLE, which is the
     * substantive difference from `updateCategory` and the reason
     * `terms_category_id_pattern_unique` is reachable from here at
     * all: a rename, a bucket move and both at once are one rule with
     * one refusal, and the database checks the RESULTING pair without
     * this method having to compute it. A row is not in conflict with
     * itself, so writing a term's own pattern back over it is
     * accepted.
     *
     * A CATEGORY IN ANOTHER DOMAIN IS NOT REFUSED, and no statement
     * here could refuse it: nothing in the schema relates a term to a
     * domain. That rule belongs to `./terms-service.ts`. A category
     * that does not exist IS refused, by the foreign key.
     *
     * Null rather than a throw when no row carries the id, reachable
     * even after a successful read since the row may go in between.
     */
    async updateTerm(
      id: number,
      patch: TermPatch,
    ): Promise<TermRecord | null> {
      const db = getDb();

      if (
        patch.categoryId === undefined
        && patch.pattern === undefined
        && patch.weight === undefined
        && patch.polarity === undefined
        && patch.notes === undefined
      ) {
        return await selectTermById(db, id);
      }

      const [row] = await refusing(() => db.update(terms)
        .set({
          categoryId: patch.categoryId,
          pattern: patch.pattern,
          weight: patch.weight,
          polarity: patch.polarity,
          notes: patch.notes,
        })
        .where(eq(terms.id, id))
        .returning(TERM_COLUMNS));

      return row === undefined
        ? null
        : toTermRecord(row);
    },

    /**
     * One `DELETE`, counted by its `RETURNING` list rather than by a
     * driver's affected-row field, which keeps the count a property
     * of the statement.
     *
     * NOTHING HANGS OFF A TERM, so this is the one delete on the
     * taxonomy surface with neither a guard nor a cascade: no foreign
     * key points at `terms`, and the port says outright that it
     * cannot be refused.
     *
     * It is wrapped in `refusing` anyway, and that is a containment
     * decision rather than a translation anybody expects to fire.
     * The header's rule is that every write on this module crosses
     * `classifyPgError`, and a bare statement here would make the one
     * exception the place where a table added later put a caller's
     * bytes into a log line through an untranslated `cause`.
     */
    async deleteTerm(id: number): Promise<boolean> {
      const removed = await refusing(() => getDb().delete(terms)
        .where(eq(terms.id, id))
        .returning({ id: terms.id }));

      return removed.length > 0;
    },
  };
}
