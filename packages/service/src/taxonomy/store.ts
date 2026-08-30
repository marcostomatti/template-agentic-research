/**
 * @packageDocumentation
 * The `TaxonomyStore` port — every database operation the categories
 * and terms surfaces perform, declared as one interface so that the
 * asking is separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts` states
 * for its own surface. An unknown category id, a `parentId` naming a
 * row in another domain, a bulk document with one bad entry: none of
 * those are facts about Postgres, they are decisions taken about
 * rows, and a decision about rows can be driven by anything that
 * supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * ONE PORT FOR BOTH HALVES, because they are one resource. A term
 * has no address of its own that does not go through a category — a
 * bulk import names its category, an export is scoped to one, and
 * deleting a category takes its terms with it — so splitting this in
 * two would mean two interfaces one implementation always satisfies
 * together and no caller ever holds separately. The service layer is
 * split instead (`./categories-service.ts` and `./terms-service.ts`),
 * which is where the two halves genuinely have different rules.
 *
 * READS TAKE THE SURROGATE KEY, unlike the domains port. A route
 * addresses a category and a term by `:id` rather than by a natural
 * key, because neither natural key is addressable on its own: a
 * category is `(domain_id, key)` and a term is `(category_id,
 * pattern)`, so a path naming one of them alone names nothing. Only
 * the collection reads take another row's id — a domain's for
 * {@link TaxonomyStore.listCategoriesWithTermCounts}, a category's
 * for {@link TaxonomyStore.listTerms} — and the service resolves
 * `:slug` through `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts` before it gets there.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. No
 * implementation raises a driver error, a SQLSTATE, or an error class
 * of its own, which is what lets each service catch one thing and
 * switch over a closed reason set, and why the in-memory
 * implementation has to refuse what Postgres refuses rather than
 * accept it.
 *
 * Which mechanisms can fire, measured against the live Postgres
 * rather than read off the schema. A duplicate `(domain_id, key)` is
 * 23505 naming `categories_domain_id_key_unique`; a duplicate
 * `(category_id, pattern)` is 23505 naming
 * `terms_category_id_pattern_unique`; a `parentId` naming no row and
 * a delete of a category that still holds children are both 23503
 * naming `categories_parent_id_categories_id_fk`; and all three
 * branches of the depth rule are 23514 naming NOTHING AT ALL. Each
 * was measured beside a positive control — a second root accepted
 * where the duplicate was refused, a childless root accepted a parent
 * where the one with children was refused — so each reading is about
 * its own rule rather than about the operation failing.
 *
 * TWO OF THOSE SHARE ONE CONSTRAINT NAME, which is the fact a service
 * has to be written around. `categories_parent_id_categories_id_fk`
 * is what refuses a parent that does not exist AND what refuses the
 * delete of a category holding children, so `reason` and `constraint`
 * together cannot tell the two apart — and they are a 422 and a 409
 * respectively. What separates them is WHICH METHOD raised it:
 * a `foreign-key-violation` out of
 * {@link TaxonomyStore.insertCategory} or
 * {@link TaxonomyStore.updateCategory} is a parent that is not there,
 * and one out of {@link TaxonomyStore.deleteCategory} is children
 * that are. Each method below states its own refusals for that
 * reason, rather than the port stating them once.
 *
 * THE DEPTH CAP BELONGS TO THE DATABASE, NOT TO ANY WRITER, and this
 * port is the shape that follows from it. A `BEFORE INSERT OR UPDATE`
 * trigger on `categories` calls `categories_enforce_depth()`, which
 * refuses a parent that is itself a child, a parent in another
 * domain, and a parent given to a row that already has children — the
 * same cap broken from the other end. No method below checks any of
 * that before writing, and none should. Depth is not a property of
 * the row being written but of that row's parent and of its own
 * children, so there is nothing for a caller to look at that another
 * writer could not change underneath it; and rows reach `categories`
 * from the seed script, from hand-written SQL in workflow nodes and
 * from an operator at a psql prompt, so a check written in this
 * package would bind this package alone. A guard here would therefore
 * be a second, weaker statement of a rule that already holds — and
 * the first one to disagree with the trigger would do so silently,
 * accepting a write the database then refuses or refusing one it
 * would have taken. `src/db/schema/taxonomy.ts` carries the whole
 * argument; what this port adds is that the trigger's refusal is
 * something to CLASSIFY on the way out, never something to
 * anticipate on the way in.
 *
 * That refusal is also the one with no constraint name, so a service
 * recognises it by `reason` alone. `StoreRefusal.constraint` is
 * `undefined` for a `RAISE ... USING ERRCODE` — the measurement is
 * recorded in `src/db/store-errors.ts` and confirmed here — which is
 * why a `check-violation` out of a category write means the depth
 * rule and nothing else: it is the only CHECK on the table.
 *
 * ONE REFUSAL DELIBERATELY DOES NOT CROSS THIS PORT, and it is the
 * one a bulk import can produce. Postgres answers SQLSTATE 21000,
 * `ON CONFLICT DO UPDATE command cannot affect row a second time`,
 * when a single statement's `VALUES` list carries the same conflict
 * target twice — measured here, against a control proving the same
 * batch with distinct patterns is accepted, so it is the repeat and
 * not the batching that is refused. `classifyPgError` does not
 * recognise 21000 and must not learn to: it is not a fact about the
 * request so much as about the statement, and a store that turned it
 * into a `StoreRefusal` would let a caller submit a document naming
 * one pattern twice and receive a tidy 4xx that says nothing about
 * which two rows collided. {@link TaxonomyStore.upsertTerms}
 * therefore states it as a PRECONDITION, and `./terms-service.ts`
 * refuses the document before any of it is written.
 */
import type { TermPolarity } from '../db/schema/values.js';
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `categories` row, whole.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: this record IS the resource the route
 * group answers with, and there is nothing on `categories` a reader
 * of the API may not have.
 *
 * THERE ARE NO TIMESTAMPS, and their absence is the table's rather
 * than this record's. `categories` carries no `created_at` and no
 * `updated_at`, so a category cannot report when it was last edited
 * and nothing here pretends otherwise. A record inventing them would
 * have to derive them from something, and the only honest source
 * would be the moment the row was read.
 */
export interface CategoryRecord {
  /** `categories.id`, and the key every write below takes. */
  readonly id: number;

  /**
   * The domain whose taxonomy this category belongs to. Read by the
   * rules that cannot be expressed as a path: a `PATCH /categories/
   * :id` names no domain, so this is what says whether a requested
   * parent or a requested bucket move stays inside one taxonomy.
   */
  readonly domainId: number;

  /**
   * The stable identifier the category is named by from outside the
   * table — a seed file, a `criteria` row, the `categoryKey` on a
   * term seed row. Unique within the domain, and half of the row's
   * natural key.
   */
  readonly key: string;

  /** Operator-facing label. Free text, and safe to rename. */
  readonly name: string;

  /**
   * The category this one sits under, or null for a root. Null is the
   * common case and the honest one: a root is not a category missing
   * a parent.
   */
  readonly parentId: number | null;
}

/**
 * A category, plus how many terms hang off it.
 *
 * The count is what makes the category list readable as a lexicon
 * rather than as a list of names: an operator scanning it is looking
 * for the bucket that has nothing in it, or the one that has far too
 * much. It is on the list read and on nothing else, because that is
 * the only place the question is asked — a single category read would
 * answer a number nobody displayed.
 *
 * A ZERO IS A COUNTED ZERO, and an implementation grouping one query
 * over `terms` has to fill the missing groups in. A category holding
 * no terms contributes no row to a grouped result, and letting that
 * reach a caller as an absent member would make `0` and "not counted"
 * the same value — on the one member whose whole job is telling an
 * empty bucket from a full one. The same rule
 * `DomainDependentCounts` states for its three counts.
 */
export interface CategoryWithTermCount extends CategoryRecord {
  /** Rows in `terms` carrying this `category_id`. Never absent. */
  readonly termCount: number;
}

/**
 * What {@link TaxonomyStore.insertCategory} is handed: a complete
 * category, minus the id the write stamps.
 *
 * `parentId` is REQUIRED and nullable rather than optional, and that
 * is the port deciding nothing again — the same argument
 * `InsertDomainInput` makes for its `settings`. Optional would make
 * an omission mean "root", which is a decision about what an absence
 * means; left to the column, the drizzle implementation would be
 * quietly right and the in-memory one quietly wrong, since only one
 * of the two has a column to default from. The service writes the
 * `null` where the choice is visible and a test can reach it.
 */
export interface InsertCategoryInput {
  /**
   * The domain this category belongs to, as
   * `DomainStore.findDomainBySlug` in `src/domains/store.ts` already
   * resolved it from the `:slug` in the path.
   */
  readonly domainId: number;

  /**
   * The natural key, within the domain.
   * `categories_domain_id_key_unique` refuses a duplicate.
   */
  readonly key: string;

  /** Operator-facing label. */
  readonly name: string;

  /**
   * The root to sit under, or null to be a root. A parent that is
   * itself a child, or one belonging to another domain, is refused by
   * the depth trigger; a parent naming no row at all is refused by
   * the foreign key.
   */
  readonly parentId: number | null;
}

/**
 * What {@link TaxonomyStore.updateCategory} is handed: the members to
 * rewrite, and no others.
 *
 * `key` is deliberately absent, so a category cannot be re-keyed
 * through this port — the same rule, for the same reason, that keeps
 * `slug` off `DomainPatch`. The key is what every other surface names
 * the category by: the seed upserts on `(domain, key)`, a term seed
 * row resolves its `categoryKey` against it, and neither of those is
 * a foreign key the database would follow. Re-keying is therefore a
 * different operation from an edit, with a fan-out of its own to
 * settle first, rather than a member on a patch. It also means
 * {@link TaxonomyStore.updateCategory} raises no
 * `unique-violation` at all.
 *
 * `parentId` distinguishes THREE requests rather than two. Absent
 * leaves the row where it is; a number moves it under that root;
 * `null` promotes it to a root, which is the only way back up and
 * would be unexpressible if absent and null meant the same thing.
 */
export interface CategoryPatch {
  /** The new label, or absent to leave it alone. */
  readonly name?: string;

  /**
   * The root to sit under, `null` to become a root, or absent to
   * leave the row where it is. Every depth refusal reachable from an
   * UPDATE is reachable through this member, including the one an
   * INSERT cannot raise: giving a parent to a row that already has
   * children.
   */
  readonly parentId?: number | null;
}

/**
 * One `terms` row, whole.
 *
 * Whole for the reason {@link CategoryRecord} is, and carrying no
 * timestamps for the same reason: `terms` has no `created_at` and no
 * `updated_at` either.
 */
export interface TermRecord {
  /** `terms.id`, and the key every term write below takes. */
  readonly id: number;

  /**
   * The category this term matches for. Half of the row's natural
   * key, and what a bucket move rewrites.
   */
  readonly categoryId: number;

  /**
   * What the row looks for, as the operator wrote it. Free text
   * rather than a slug: a pattern carries spaces, punctuation and
   * case, and none of that is normalised on the way in.
   */
  readonly pattern: string;

  /**
   * How much a match is worth. MAGNITUDE ONLY — the sign is not
   * consulted anywhere, because which way a match points is
   * {@link TermRecord.polarity}'s to say. A negative number means
   * what its positive means, which is what makes a typed minus sign
   * unable to invert a term.
   */
  readonly weight: number;

  /**
   * Which way a match moves the score. Typed by `TermPolarity` in
   * `src/db/schema/values.ts`, which is the single declaration
   * `terms_polarity_check` is generated from, so the stored domain
   * and this union cannot drift apart.
   *
   * NARROWER THAN THE COLUMN, which is an obligation on the drizzle
   * implementation rather than a description of it. `polarity` is a
   * `text` column, so drizzle infers it as `string` and a selected
   * row is not assignable to this record by spreading — measured.
   * The narrowing is safe because the CHECK holds, and it has to be
   * written rather than assumed.
   */
  readonly polarity: TermPolarity;

  /**
   * Why the term is here, for whoever meets the row next. Null means
   * nobody wrote one, and nothing derives anything from its absence.
   */
  readonly notes: string | null;
}

/**
 * What a term states about itself: the four columns that are neither
 * its identity nor its bucket.
 *
 * Declared once and extended rather than repeated, because the two
 * writes that take it disagree only about where the category comes
 * from — {@link TaxonomyStore.insertTerm} takes one per row, and
 * {@link TaxonomyStore.upsertTerms} takes one for the whole batch.
 * This is also the shape a validated seed row becomes once its
 * `categoryKey` has been resolved, which is what lets the import path
 * hand rows straight to the store.
 *
 * `notes` is REQUIRED and nullable, matching the seed row schema in
 * `scripts/seed-schemas.ts` and for the reason that schema gives: a
 * row with nothing recorded says so, rather than being
 * indistinguishable from a member somebody left off.
 */
export interface TermValues {
  /** What to look for. */
  readonly pattern: string;

  /** How much a match is worth, as a magnitude. */
  readonly weight: number;

  /** Which way a match points. */
  readonly polarity: TermPolarity;

  /** Why the term is here, or null when nobody said. */
  readonly notes: string | null;
}

/**
 * What {@link TaxonomyStore.insertTerm} is handed: a complete term,
 * minus the id the write stamps.
 */
export interface InsertTermInput extends TermValues {
  /**
   * The bucket this term fills, as the service already resolved it
   * from the `:id` in the path.
   * `terms_category_id_pattern_unique` refuses a pattern this
   * category already carries.
   */
  readonly categoryId: number;
}

/**
 * What {@link TaxonomyStore.updateTerm} is handed: the members to
 * rewrite, and no others.
 *
 * ALL FIVE MEMBERS ARE PATCHABLE, INCLUDING BOTH HALVES OF THE
 * NATURAL KEY, and that is the substantive difference from
 * {@link CategoryPatch}. Nothing outside the table names a term by
 * `(category_id, pattern)`: a seed file upserts on it, and a re-run
 * of the seed after a rewrite writes the row the file describes
 * rather than stranding a reference — which is precisely the fan-out
 * that keeps `key` off a category patch and `slug` off a domain one.
 * So a term is editable in place, and moving one between buckets is
 * an UPDATE of `categoryId` rather than a delete and an insert that
 * would lose the row's id and its weight together.
 *
 * `notes` distinguishes three requests the way `CategoryPatch`'s
 * `parentId` does: absent leaves the note alone, a string replaces
 * it, `null` clears it.
 */
export interface TermPatch {
  /**
   * The bucket to move the term into, or absent to leave it where it
   * is. A category in another domain is not refused by the database
   * — no constraint relates a term to a domain — so that rule is the
   * service's, and it is stated there rather than pretended to here.
   */
  readonly categoryId?: number;

  /** The new pattern, or absent to leave it alone. */
  readonly pattern?: string;

  /** The new magnitude, or absent to leave it alone. */
  readonly weight?: number;

  /** The new direction, or absent to leave it alone. */
  readonly polarity?: TermPolarity;

  /**
   * The new note, `null` to clear it, or absent to leave it alone.
   */
  readonly notes?: string | null;
}

/**
 * Every database operation the categories and terms surfaces perform.
 *
 * Twelve methods and no escape hatch: there is no `query`, no exposed
 * connection and no transaction handle, so an implementation is
 * substitutable by anything that can hold rows. That closure is what
 * makes the in-memory implementation a genuine second implementation
 * rather than a stub covering the easy calls.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * NEITHER HALF RESOLVES A DOMAIN. `:slug` is turned into a
 * `DomainRecord` by `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts` before either service does anything of its
 * own, which is what keeps one lookup in one place and why
 * `tests/helpers/memory-research-store.ts` stands behind both ports
 * over one dataset: a domain deleted through one of them is deleted
 * in the other, cascade included.
 */
export interface TaxonomyStore {
  /**
   * Reads every category in one domain, each with the number of terms
   * hanging off it, ordered by {@link CategoryRecord.key} ascending.
   *
   * UNWINDOWED, AND THERE IS NO `countCategories` BESIDE IT. A
   * domain's taxonomy is shallow and operator-authored — one level
   * deep, written by hand, read as a whole to be edited — so there is
   * no page to describe and a `meta` block would be describing a
   * collection that always arrives complete. The terms half is the
   * opposite and is paginated for it; see
   * {@link TaxonomyStore.listTerms}.
   *
   * The order is by key and NOT by tree position, so a child does not
   * follow its parent and the roots do not come first. Assembling the
   * tree is the reader's, out of {@link CategoryRecord.parentId} —
   * which is the honest shape for a list whose consumer is as likely
   * to be a table as an outline. `key` is what to order on because it
   * is unique within the domain, so the order is total and there is
   * no tie-break to forget.
   *
   * @param domainId - The `DomainRecord.id` a slug lookup already
   *   returned.
   * @returns Every category in that domain, possibly empty. A domain
   *   with no taxonomy and an id no domain carries are the same
   *   answer here; whether the domain exists was settled before this
   *   call.
   */
  listCategoriesWithTermCounts(
    domainId: number,
  ): Promise<readonly CategoryWithTermCount[]>;

  /**
   * Looks one category up by its id. Where a request naming
   * `/categories/:id` enters.
   *
   * Answers a {@link CategoryRecord} and not a
   * {@link CategoryWithTermCount}: the count exists for the list, and
   * a single read would be paying for a number nobody asked for.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no category carries that id. Null
   *   is neither an error nor a refusal: it is the fact from which
   *   the service decides a 404. The row carries
   *   {@link CategoryRecord.domainId}, which is what lets the service
   *   answer a path that named no domain.
   */
  findCategoryById(id: number): Promise<CategoryRecord | null>;

  /**
   * Inserts a category.
   *
   * @param input - The complete row, minus its id.
   * @returns The stored row, read back rather than reconstructed from
   *   the input, so the id is the database's own.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `categories_domain_id_key_unique`, when the domain
   *   already carries that key.
   * @throws A `StoreRefusal` with `reason` `check-violation` and NO
   *   `constraint`, when the depth trigger refuses the parent — for
   *   being itself a child, or for belonging to another domain. The
   *   two arrive as one reason because a trigger names no constraint,
   *   which is measured in `src/db/store-errors.ts`; the service
   *   answers 422 naming `parentId` either way rather than trying to
   *   tell them apart. The trigger asks the domain question FIRST, so
   *   a parent that is both is reported as the domain fault.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint` `categories_parent_id_categories_id_fk`, when
   *   `parentId` names no row at all. The trigger deliberately does
   *   not report that case — it leaves it to the foreign key, which
   *   refuses it in its own terms.
   */
  insertCategory(input: InsertCategoryInput): Promise<CategoryRecord>;

  /**
   * Rewrites the supplied members of one category.
   *
   * A PATCH CARRYING NO MEMBER IS A LEGAL CALL and answers the stored
   * row unchanged. It has to be stated rather than left to the
   * implementations, because `categories` carries no `updated_at` for
   * a write to stamp — the arrangement that makes the same call
   * trivially legal on the domains port — so there is genuinely
   * nothing to set, and drizzle throws `No values to set` on an empty
   * update list rather than issuing a no-op statement. An
   * implementation answers the row without writing.
   *
   * @param id - The {@link CategoryRecord.id} a read already
   *   returned.
   * @param patch - The members to rewrite. `key` is not among them;
   *   see {@link CategoryPatch}.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read, since
   *   the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   * @throws A `StoreRefusal` with `reason` `check-violation` and no
   *   `constraint`, for any of the THREE depth branches. This is the
   *   only method that can reach the third — giving a parent to a row
   *   that already has children — since an INSERT produces an id
   *   nothing can point at yet.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint` `categories_parent_id_categories_id_fk`, when
   *   `parentId` names no row.
   * @throws No `unique-violation`, ever. `key` is not patchable, and
   *   nothing else on the row is unique.
   */
  updateCategory(
    id: number,
    patch: CategoryPatch,
  ): Promise<CategoryRecord | null>;

  /**
   * Deletes one category.
   *
   * ITS TERMS GO WITH IT, and its criteria too: both tables are
   * `ON DELETE CASCADE` on `category_id`, so a single statement takes
   * the bucket's whole contents. That is the database's cascade and
   * not this method's — no implementation deletes a term itself, and
   * none reports how many went.
   *
   * ITS CHILDREN DO NOT, and that asymmetry is the point.
   * `categories.parent_id` is `NO ACTION`, so deleting a category
   * that still holds children is REFUSED rather than quietly taking
   * them, and their terms, with it. Reparenting or removing the
   * children first is what makes that an explicit decision. It does
   * not obstruct dropping the whole domain: `NO ACTION` is checked at
   * the end of the statement, by which point the domain's cascade has
   * removed parent and children together.
   *
   * @param id - The {@link CategoryRecord.id} a read already
   *   returned.
   * @returns Whether a row was removed. False means no category
   *   carried that id.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint` `categories_parent_id_categories_id_fk`, when
   *   the category still holds children. That is the SAME name
   *   {@link TaxonomyStore.insertCategory} raises for a parent that
   *   does not exist, and the service tells the two apart by which
   *   call it made rather than by anything on the refusal: here it is
   *   a 409, there a 422.
   */
  deleteCategory(id: number): Promise<boolean>;

  /**
   * Reads the terms of one category, ordered by
   * {@link TermRecord.pattern} ascending.
   *
   * THE WINDOW IS OPTIONAL, AND OMITTING IT READS THE WHOLE CATEGORY.
   * Two callers want two different things and both are legitimate:
   * `GET /categories/:id/terms` pages, while a `?format=seed` export
   * is a document about the category as a whole and refuses a
   * pagination parameter outright. Serving the export by counting
   * first and then asking for a window that size would be two reads
   * whose answers can disagree — a term written in between is simply
   * missing from a document that claims to be the category.
   *
   * @param categoryId - The {@link CategoryRecord.id} a read already
   *   returned.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them, or absent for every row.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows, possibly empty. A window past the end of the
   *   collection is an empty list rather than an error.
   *
   * @remarks
   * `pattern` is what to order on because it is unique within the
   * category, so the order is total. What it is NOT is a promise that
   * the order matches a JavaScript sort of the same strings: the
   * database orders under its own collation, and a pattern is free
   * text carrying case, spaces and punctuation rather than a slug, so
   * the agreement `progress.txt` records for slugs and taxonomy keys
   * does not carry here on its own reasoning. Measured on the live
   * Postgres, whose `en_US.utf8` ordered a mixed-case,
   * punctuation-heavy set exactly as a code-unit compare did — but
   * that is a fact about a deployment's locale and not about this
   * port. So the seed serialiser sorts the rows itself rather than
   * trusting this order, and the byte-for-byte round trip rests on
   * its own sort. Nothing here needs changing if a deployment's
   * collation differs; the export just must not be the thing that
   * notices.
   */
  listTerms(
    categoryId: number,
    window?: StoreWindow,
  ): Promise<readonly TermRecord[]>;

  /**
   * Counts the terms in one category, ignoring any window.
   *
   * Separate from {@link TaxonomyStore.listTerms} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page.
   *
   * @param categoryId - The category to count within.
   * @returns How many rows `terms` holds for it. An id no category
   *   carries answers `0`, which is correct rather than a special
   *   case: nothing points at a row that is not there.
   */
  countTerms(categoryId: number): Promise<number>;

  /**
   * Looks one term up by its id. Where a request naming `/terms/:id`
   * enters.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no term carries that id. The row
   *   carries {@link TermRecord.categoryId}, which is what a bucket
   *   move is checked against.
   */
  findTermById(id: number): Promise<TermRecord | null>;

  /**
   * Inserts one term.
   *
   * ASSERTS A NEW ROW, and does not upsert. A single `POST` is a
   * caller stating that a pattern is not yet in the bucket, so a
   * duplicate is a 409 rather than a silent rewrite of somebody
   * else's weight. {@link TaxonomyStore.upsertTerms} is where a
   * rewrite is the intent.
   *
   * @param input - The complete row, minus its id.
   * @returns The stored row, read back rather than reconstructed.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `terms_category_id_pattern_unique`, when the
   *   category already carries that pattern.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`,
   *   when `categoryId` names no category. The service resolved the
   *   category before calling, so this is reachable only if the row
   *   went in between.
   */
  insertTerm(input: InsertTermInput): Promise<TermRecord>;

  /**
   * Writes a whole lexicon into one category, rewriting the terms it
   * already carries.
   *
   * UPSERTS, BECAUSE A BULK IMPORT IS A LEXICON BEING APPLIED. It
   * conflicts on `terms_category_id_pattern_unique` and rewrites
   * `weight`, `polarity` and `notes` — exactly what `scripts/seed.ts`
   * does with the same file, which is what lets import, export and
   * re-import settle instead of accumulating a second row that would
   * then count the same match twice.
   *
   * ONE STATEMENT, AND NOT ONLY TO SAVE ROUND TRIPS. A single
   * statement is atomic, so a document either lands whole or not at
   * all — no implementation may loop and write row by row, which
   * would leave a partial lexicon behind on the first refusal and
   * make the answered count a description of how far it got.
   *
   * PRECONDITION: NO TWO ROWS MAY SHARE A PATTERN. Postgres answers
   * SQLSTATE 21000 — `ON CONFLICT DO UPDATE command cannot affect row
   * a second time` — when one statement's values carry the same
   * conflict target twice, and `classifyPgError` does not recognise
   * it, so it is NOT a `StoreRefusal` and reaches the route as a 500.
   * That is deliberate: the duplicate is a fault in the document, and
   * `./terms-service.ts` refuses it by name and by position before
   * any of this runs. A store that classified 21000 would answer a
   * tidy status that named neither of the two colliding rows.
   *
   * @param categoryId - The bucket every row lands in. Taken once
   *   rather than per row, which is what makes "one document, one
   *   category" structural instead of a promise each row repeats and
   *   an implementation would have to re-check.
   * @param rows - The terms to write. An EMPTY list is a legal call
   *   answering an empty list without touching the database — a seed
   *   document declaring no terms is not a special case for the
   *   caller, and it is stated here because drizzle throws on an
   *   empty `values` list rather than issuing a harmless statement.
   * @returns The stored rows, one per input row, in an UNSPECIFIED
   *   order. `RETURNING` follows the statement's own processing
   *   order, which is not something to promise; a caller that needs
   *   them ordered re-reads through {@link TaxonomyStore.listTerms}.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`,
   *   when `categoryId` names no category.
   */
  upsertTerms(
    categoryId: number,
    rows: readonly TermValues[],
  ): Promise<readonly TermRecord[]>;

  /**
   * Rewrites the supplied members of one term.
   *
   * A patch carrying no member answers the stored row unchanged,
   * without writing, for the reason
   * {@link TaxonomyStore.updateCategory} gives: `terms` carries no
   * `updated_at` either, so an empty patch has nothing to set.
   *
   * @param id - The {@link TermRecord.id} a read already returned.
   * @param patch - The members to rewrite, `categoryId` included —
   *   moving a term between buckets is an UPDATE, not a delete and an
   *   insert.
   * @returns The stored row afterwards, or null when no row carries
   *   that id.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `terms_category_id_pattern_unique`, when the
   *   RESULTING pair is already taken. Both halves of that pair are
   *   patchable, so this is reachable by rewriting the pattern, by
   *   moving the term, or by doing both at once.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`,
   *   when `categoryId` names no category. A category in another
   *   DOMAIN is not refused here — nothing in the schema relates a
   *   term to a domain — so that rule is the service's.
   */
  updateTerm(id: number, patch: TermPatch): Promise<TermRecord | null>;

  /**
   * Deletes one term.
   *
   * Nothing hangs off a term, so there is no cascade and no guard:
   * this is the one delete on the taxonomy surface that cannot be
   * refused.
   *
   * @param id - The {@link TermRecord.id} a read already returned.
   * @returns Whether a row was removed. False means no term carried
   *   that id.
   */
  deleteTerm(id: number): Promise<boolean>;
}
