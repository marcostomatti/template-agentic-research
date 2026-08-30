/**
 * @packageDocumentation
 * The in-memory dataset every wave-1 store port is driven through in
 * the isolated suite. The domains half and the taxonomy's CATEGORY
 * half are here; the terms, personas and settings halves land in
 * this same file, over this same dataset, as their stages arrive.
 *
 * ONE DATASET RATHER THAN FOUR FAKES, which is why this file is not
 * named for the one port it currently satisfies. `src/domains/store.ts`
 * records that the taxonomy, personas and settings services all
 * resolve a `:slug` through {@link DomainStore.findDomainBySlug}
 * before doing anything of their own, and every one of their tables
 * hangs off `domains.id` with `ON DELETE CASCADE`. A domain deleted
 * through one port has to be gone from the others, and only shared
 * state makes that true: four independent fakes would agree with
 * each other right up until a case deleted something.
 *
 * IT REFUSES WHAT POSTGRES REFUSES, as the {@link StoreRefusal} the
 * port declares and as nothing else. A fake that merely stores what
 * it is handed is a second contract rather than a second
 * implementation, agreeing with the first until the deployment that
 * does not. `domains_slug_unique` is the whole of the domains half's
 * refusal surface — a slug is written once and is not patchable —
 * so this half has one mechanism to imitate and imitates it by
 * name, with the same `reason` a SQLSTATE 23505 classifies to.
 *
 * THE CATEGORY HALF HAS THREE MECHANISMS AND SIX WAYS TO REACH THEM,
 * AND THE ORDER THEY FIRE IN IS PART OF WHAT IS BEING IMITATED. A
 * fake writing them in the order they read well gets a request
 * carrying two faults at once wrong, which is the shape nothing else
 * would report. Measured against the live Postgres: an insert with a
 * duplicate `(domain_id, key)` BESIDE a parent that is itself a child
 * answers 23514, because `categories_enforce_depth_trigger` is a
 * BEFORE trigger and runs while the row is still being formed, ahead
 * of the unique index; the same insert with a duplicate key beside a
 * parent naming NO row answers 23505, because the foreign key is
 * checked after the index. So the order below is trigger, then key,
 * then foreign key.
 *
 * THE THREE DEPTH REFUSALS NAME NOTHING, and that is the database's
 * doing rather than a simplification here. Every branch of the
 * trigger raises through `RAISE ... USING ERRCODE`, which sets no
 * constraint name, so all three cross the port as a
 * `check-violation` carrying no `constraint` and are
 * indistinguishable from one another. The branches are still written
 * out separately, in the trigger's own order, because a reader
 * checking this file against
 * `drizzle/0002_category_depth_guard.sql` has nothing else to check
 * against — not because anything downstream can tell which fired.
 *
 * TWO REFUSALS SHARE ONE CONSTRAINT NAME, and the port is written
 * around it: `categories_parent_id_categories_id_fk` is what refuses
 * a `parentId` naming no row AND what refuses the delete of a
 * category still holding children. `reason` and `constraint` are
 * identical across the two, so which METHOD raised it is the only
 * discriminator — which is why they are thrown from the writes and
 * from the delete rather than from one shared guard.
 *
 * A DOMAIN DELETE IS NOT REFUSED BY THAT GUARD, which is the trap
 * `NO ACTION` sets for a fake. The rule is checked at the end of the
 * statement, by which point the domain's cascade has removed a
 * parent and its children together — measured, the delete answers
 * and the table is left empty. A fake reusing its own
 * `deleteCategory` inside the cascade would refuse a delete Postgres
 * takes.
 *
 * EVERY `Date` CROSSING THE BOUNDARY IS COPIED, in both directions.
 * `Date` is mutable, so a store holding the caller's instance, or
 * handing its own back, lets a caller write into stored state
 * through a field the port declares `readonly` — a corruption the
 * drizzle implementation cannot have, since every row it answers is
 * built fresh out of the driver. The clock reading is copied too:
 * `() => FIXED` is the obvious way to write a fixed clock, and
 * without the copy every row it stamped would share that one `Date`.
 *
 * SO IS EVERY `settings` PAYLOAD, for the same reason and by the
 * route a `jsonb` column takes. Drizzle serialises the payload on
 * the way in and parses a fresh object on the way out, so no caller
 * of the drizzle store can hold a reference into a stored row. The
 * JSON round trip here is that same disconnection, and it is what
 * makes {@link DomainPatch}'s whole-unit rule assertable at all: a
 * merge and an aliased payload are indistinguishable once a caller
 * can write through the object it sent.
 *
 * IDS COME FROM 1 AND ARE NOT GAPLESS, which is the half a reader
 * would not predict. Measured against the live Postgres on a
 * `bigserial` carrying a UNIQUE key: inserting `a`, having a second
 * `a` refused, then inserting `b` leaves `b` holding id 3. The
 * sequence is read while the row is formed and the unique index
 * refuses the row afterwards, and a sequence does not roll back. So
 * the counter below advances BEFORE the key is checked, and a case
 * that would come to depend on a gapless id fails here rather than
 * only against a database. `categories` carries a sequence of its
 * own and burns ids the same way, the DEPTH trigger included:
 * measured on that table, two refused inserts between two accepted
 * ones left a gap of two, so its counter advances ahead of every
 * check rather than ahead of the key check alone.
 */
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type {
  DomainDependentCounts,
  DomainPatch,
  DomainRecord,
  DomainStore,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type {
  CategoryPatch,
  CategoryRecord,
  CategoryWithTermCount,
  InsertCategoryInput,
  TaxonomyStore,
} from '../../src/taxonomy/store.js';

import { StoreRefusal } from '../../src/db/store-errors.js';

/**
 * The half of `TaxonomyStore` this file implements today: the five
 * category methods, and none of the seven term ones.
 *
 * A `Pick` OF THE PORT RATHER THAN A LIST OF ITS OWN, so a signature
 * here cannot drift from the thing being imitated — a hand-copied
 * method would go on type-checking against a port that had moved
 * under it. The term half lands in its own stage and widens this to
 * `TaxonomyStore` whole; until it does, a caller wanting the port
 * entire cannot be handed this store, which is the honest statement
 * of what has been built rather than a gap to paper over with stubs.
 */
export type MemoryCategoryStore = Pick<
  TaxonomyStore,
  | 'listCategoriesWithTermCounts'
  | 'findCategoryById'
  | 'insertCategory'
  | 'updateCategory'
  | 'deleteCategory'
>;

/**
 * Both implemented ports over one dataset, plus the one seam a case
 * needs that no port declares.
 *
 * Nothing in `src/` is handed a {@link MemoryResearchStore} — a
 * service takes the port — so the seam cannot become a way for the
 * code under test to route around it.
 */
export interface MemoryResearchStore
  extends DomainStore, MemoryCategoryStore {
  /**
   * Plants what a domain has ACCUMULATED, for the delete guard to
   * read back through {@link DomainStore.countDomainDependents}.
   *
   * NOTHING IN WAVE 1 WRITES `topics`, `sources` OR `findings`. No
   * port declares an insert for any of the three, and the pipeline
   * that fills them arrives in a later phase — so the state the
   * delete guard exists for is unreachable through the port itself,
   * and without this seam every count answers zero and the guard is
   * exercisable only against a real database. That would put the
   * one rule the spec argues hardest for in the half of the suite
   * that needs a container up.
   *
   * @param domainId - The domain the rows hang off. Need not name a
   *   stored domain: the counts are plantable ahead of the row, and
   *   `countDomainDependents` answers about an id rather than about
   *   a domain.
   * @param counts - What to record, WHOLE. An absent member is zero
   *   rather than left standing, and a second call replaces the
   *   first rather than merging into it — the same whole-unit rule
   *   {@link DomainPatch} states for `settings`, for the same
   *   reason: a merge makes clearing a member unexpressible.
   */
  setDomainDependents(
    domainId: number,
    counts: Partial<DomainDependentCounts>,
  ): void;
}

/** What {@link createMemoryResearchStore} may be handed. */
export interface MemoryResearchStoreOptions {
  /**
   * The clock every stamped timestamp is read from.
   *
   * Defaults to the wall clock, which is right for any case that
   * asserts a timestamp by kind — that a patch moved `updated_at`
   * and left `created_at` — rather than by instant. A case about an
   * instant hands in a clock it controls, and gets there without
   * waiting for one to arrive.
   */
  readonly now?: () => Date;
}

/**
 * The natural key on `categories`, spelled as
 * `src/db/schema/taxonomy.ts` spells it.
 */
const CATEGORY_KEY_UNIQUE = 'categories_domain_id_key_unique';

/**
 * The self-referencing foreign key on `categories.parent_id`, and the
 * one name TWO different refusals arrive under: a parent that names
 * no row, and a delete of a category that still holds children.
 */
const CATEGORY_PARENT_FK = 'categories_parent_id_categories_id_fk';

/** Three zeros: what a domain nothing points at has accumulated. */
const NO_DEPENDENTS: DomainDependentCounts = {
  topics: 0,
  sources: 0,
  findings: 0,
};

/**
 * A `Date` with the same instant and no shared identity.
 *
 * @param instant - The date to copy.
 * @returns A new `Date` reading the same millisecond.
 */
function copyInstant(instant: Date): Date {
  return new Date(instant.getTime());
}

/**
 * A settings payload sharing no object with the one handed in.
 *
 * A JSON round trip rather than a spread, because a spread copies
 * only the top level and `scoringWeights`, `verdictVocabulary` and
 * `fieldContract` are all one level down — a caller would still hold
 * a reference into the stored weights. The round trip is also what a
 * `jsonb` column does to a payload in each direction, which is the
 * behaviour being imitated rather than merely a deep copy.
 *
 * @param settings - The payload to copy.
 * @returns An equal payload sharing nothing with it.
 */
function copySettings(settings: DomainSettings): DomainSettings {
  return JSON.parse(JSON.stringify(settings)) as DomainSettings;
}

/**
 * The refusal every branch of the depth trigger produces.
 *
 * One function rather than three, because the trigger names no
 * constraint: `RAISE ... USING ERRCODE` sets none, so a service sees
 * one `check-violation` whichever branch fired. A fake spelling three
 * distinguishable refusals would be offering a discrimination the
 * database does not, and the first caller to read it would be right
 * about this store and wrong about a deployment.
 *
 * @returns The refusal to throw.
 */
function depthRefusal(): StoreRefusal {
  return new StoreRefusal({ reason: 'check-violation' });
}

/**
 * A category record whose members belong to nobody else.
 *
 * A shallow copy is the whole of it, unlike {@link copyDomain}: every
 * member of `CategoryRecord` is a number, a string or null, so there
 * is nothing one level down for a caller to reach. The copy still has
 * to happen — a caller handed the stored object could rewrite `key`
 * or `parentId` straight through the `readonly` the port declares.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyCategory(row: CategoryRecord): CategoryRecord {
  return { ...row };
}

/**
 * A domain record whose mutable members belong to nobody else.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyDomain(row: DomainRecord): DomainRecord {
  return {
    ...row,
    settings: copySettings(row.settings),
    createdAt: copyInstant(row.createdAt),
    updatedAt: copyInstant(row.updatedAt),
  };
}

/**
 * Builds a store over one dataset, holding no rows.
 *
 * @param options - Where the clock comes from; see
 *   {@link MemoryResearchStoreOptions}.
 * @returns A store whose ids start at 1, as the `bigserial` columns
 *   do. Each call builds a dataset of its own, so constructing one
 *   IS the reset a case needs and there is nothing to tear down.
 */
export function createMemoryResearchStore(
  options: MemoryResearchStoreOptions = {},
): MemoryResearchStore {
  const readClock = options.now ?? (() => new Date());
  const domains = new Map<number, DomainRecord>();
  const dependents = new Map<number, DomainDependentCounts>();
  const categories = new Map<number, CategoryRecord>();
  let nextDomainId = 1;
  let nextCategoryId = 1;

  /**
   * Reads the clock and copies what it answered.
   *
   * @returns The instant to write onto a row.
   */
  function stamp(): Date {
    return copyInstant(readClock());
  }

  /**
   * @param slug - The natural key to look under.
   * @returns The row carrying it, or undefined. At most one row can,
   *   which is what `domains_slug_unique` guarantees and what
   *   {@link DomainStore.insertDomain} below enforces.
   */
  function domainBySlug(slug: string): DomainRecord | undefined {
    return [...domains.values()].find((row) => row.slug === slug);
  }

  /**
   * Every stored domain, ordered as
   * {@link DomainStore.listDomains} promises.
   *
   * The comparison is by code unit rather than locale-aware, and
   * agrees with the live server's `en_US.utf8` collation on the one
   * punctuation a slug may carry: `a-b`, `a-c`, `ab` is the order
   * both produce (measured, both sides).
   *
   * @returns The rows, slug ascending. The order is total because
   *   the key is unique, so there is no tie-break to forget.
   */
  function orderedDomains(): DomainRecord[] {
    return [...domains.values()].sort((left, right) => {
      if (left.slug === right.slug) {
        return 0;
      }

      return left.slug < right.slug
        ? -1
        : 1;
    });
  }

  /**
   * @param domainId - The domain to look within.
   * @param key - The key to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `categories_domain_id_key_unique` guarantees
   *   and what `insertCategory` below enforces.
   */
  function categoryByKey(
    domainId: number,
    key: string,
  ): CategoryRecord | undefined {
    return [...categories.values()].find(
      (row) => row.domainId === domainId && row.key === key,
    );
  }

  /**
   * @param id - The category to ask about.
   * @returns Whether any stored category names it as its parent. Read
   *   by two rules that share nothing else: the depth trigger's third
   *   branch, and the `NO ACTION` on `categories.parent_id` that
   *   refuses the delete.
   */
  function hasChildren(id: number): boolean {
    return [...categories.values()].some((row) => row.parentId === id);
  }

  /**
   * One domain's categories, ordered as
   * `TaxonomyStore.listCategoriesWithTermCounts` promises.
   *
   * By `key` ascending, compared by code unit for the reason
   * {@link orderedDomains} gives: a taxonomy key carries the same
   * restricted alphabet a slug does, and the live server's
   * `en_US.utf8` orders that alphabet exactly as `<` does (measured,
   * both sides). The order is total because the key is unique within
   * the domain, so there is no tie-break to forget.
   *
   * @param domainId - The domain to read.
   * @returns Its categories, key ascending.
   */
  function orderedCategories(domainId: number): CategoryRecord[] {
    return [...categories.values()]
      .filter((row) => row.domainId === domainId)
      .sort((left, right) => {
        if (left.key === right.key) {
          return 0;
        }

        return left.key < right.key
          ? -1
          : 1;
      });
  }

  /**
   * Runs the depth trigger over a write, in the trigger's own order.
   *
   * The three branches of `categories_enforce_depth()`, asked as
   * `drizzle/0002_category_depth_guard.sql` asks them: the parent's
   * domain, then the parent's own parent, then this row's children.
   * All three answer the same refusal — see {@link depthRefusal} — so
   * the order is unobservable from outside, and is kept anyway
   * because it is the only thing a reader can check this against.
   *
   * IT RUNS AHEAD OF BOTH KEYS, which is measured rather than chosen.
   * `BEFORE INSERT OR UPDATE` fires while the row is still being
   * formed, so an insert carrying a duplicate `(domain_id, key)`
   * beside a parent that is itself a child answers 23514 and not
   * 23505 against the live server.
   *
   * A null parent returns immediately, exactly as the trigger's first
   * branch does — so promoting a row to a root is legal however many
   * children it holds.
   *
   * @param writtenId - The id of the row being written: the fresh
   *   counter value on an insert, the stored id on a patch. Only the
   *   third branch reads it, and it finds nothing on an insert
   *   because no row can point at an id the counter has just handed
   *   out.
   * @param domainId - The domain the written row belongs to.
   * @param parentId - The parent it is asking for, after the patch.
   * @throws A `check-violation` {@link StoreRefusal} for any of the
   *   three branches. A parent naming NO row is not refused here: the
   *   trigger's lookup finds nothing, both of its parent rules are
   *   guarded on that, and the write falls through to the foreign
   *   key.
   */
  function guardDepth(
    writtenId: number,
    domainId: number,
    parentId: number | null,
  ): void {
    if (parentId === null) {
      return;
    }

    const parent = categories.get(parentId);

    // Asked first because the trigger asks it first: a parent in
    // another domain is out of scope rather than too deep, and
    // reporting where it sits in its own taxonomy would send a reader
    // to the wrong domain.
    if (parent !== undefined && parent.domainId !== domainId) {
      throw depthRefusal();
    }

    if (parent !== undefined && parent.parentId !== null) {
      throw depthRefusal();
    }

    // The same cap from the other end. Left unguarded on which call
    // made it, as the trigger leaves it unguarded on TG_OP: an
    // insert's id is fresh from the counter, so nothing can name it
    // yet and the branch refuses nothing.
    if (hasChildren(writtenId)) {
      throw depthRefusal();
    }
  }

  /**
   * Refuses a parent that names no stored category.
   *
   * Split from {@link guardDepth} rather than folded into it because
   * the two fire at different points, measured: an insert carrying a
   * duplicate key beside a parent naming no row answers 23505, so the
   * unique index is checked between them.
   *
   * @param parentId - The parent being asked for, or null.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `categories_parent_id_categories_id_fk` — the SAME name a
   *   delete refused for holding children carries, which is why the
   *   two are raised from different methods rather than told apart by
   *   anything on the refusal itself.
   */
  function guardParentExists(parentId: number | null): void {
    if (parentId !== null && !categories.has(parentId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: CATEGORY_PARENT_FK,
      });
    }
  }

  return {
    /** One window of the list, slug ascending. */
    async listDomains(window: StoreWindow): Promise<readonly DomainRecord[]> {
      return orderedDomains()
        .slice(window.offset, window.offset + window.limit)
        .map(copyDomain);
    },

    /** How many rows the dataset holds, ignoring any window. */
    async countDomains(): Promise<number> {
      return domains.size;
    },

    /** One domain by its natural key, or null. */
    async findDomainBySlug(slug: string): Promise<DomainRecord | null> {
      const row = domainBySlug(slug);

      return row === undefined
        ? null
        : copyDomain(row);
    },

    /**
     * Inserts a domain, stamping both timestamps off the clock.
     *
     * The id is taken from the counter BEFORE the slug is checked,
     * so a refused insert burns it exactly as the sequence behind a
     * `bigserial` does. This module's header carries the
     * measurement.
     *
     * `feature_version` and `embedding_model` are null on a fresh
     * row, which is the column default rather than a decision taken
     * here: neither is on {@link InsertDomainInput}, because they
     * are the feature pipeline's own pins and an operator has no
     * business writing them.
     */
    async insertDomain(input: InsertDomainInput): Promise<DomainRecord> {
      const id = nextDomainId;

      nextDomainId += 1;

      if (domainBySlug(input.slug) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: 'domains_slug_unique',
        });
      }

      // One clock reading, two `Date` objects: a row whose stamps
      // were the same object would let a write to one move the
      // other.
      const written = stamp();
      const row: DomainRecord = {
        id,
        slug: input.slug,
        name: input.name,
        settings: copySettings(input.settings),
        featureVersion: null,
        embeddingModel: null,
        createdAt: written,
        updatedAt: copyInstant(written),
      };

      domains.set(row.id, row);

      return copyDomain(row);
    },

    /**
     * Rewrites the supplied members and stamps `updated_at`.
     *
     * `settings` REPLACES the stored payload rather than merging
     * into it, and an absent `settings` leaves it standing — the two
     * halves of the whole-unit rule {@link DomainPatch} states. The
     * stamp moves on every call, including one carrying no member at
     * all.
     */
    async updateDomain(
      id: number,
      patch: DomainPatch,
    ): Promise<DomainRecord | null> {
      const existing = domains.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: DomainRecord = {
        ...existing,
        name: patch.name ?? existing.name,
        settings: patch.settings === undefined
          ? existing.settings
          : copySettings(patch.settings),
        updatedAt: stamp(),
      };

      domains.set(id, updated);

      return copyDomain(updated);
    },

    /**
     * What the domain has accumulated, per dependent table.
     *
     * Every member is present, including a zero, because a counted
     * zero and a missing group are different facts to a guard whose
     * whole job is telling them apart. An id no domain carries
     * answers three zeros rather than failing: nothing points at a
     * row that is not there.
     */
    async countDomainDependents(id: number): Promise<DomainDependentCounts> {
      return { ...(dependents.get(id) ?? NO_DEPENDENTS) };
    },

    /**
     * Deletes one domain, and everything hanging off it.
     *
     * The cascade is the database's: every foreign key onto
     * `domains.id` is `ON DELETE CASCADE`, so dropping the planted
     * counts and the domain's categories here is this dataset's half
     * of the same behaviour. The rows the later halves of this file
     * add join it in the same place.
     *
     * IT IS NOT REFUSED BY THE `NO ACTION` ON `categories.parent_id`,
     * and this is deliberately not `deleteCategory` in a loop. That
     * rule is checked at the end of the statement, by which point the
     * cascade has removed a parent and its children together —
     * measured, the delete answers and the table is left empty. A
     * fake reusing its own guard here would refuse a delete Postgres
     * takes, and would do it only for the domains whose taxonomy has
     * more than one level.
     */
    async deleteDomain(id: number): Promise<boolean> {
      dependents.delete(id);

      for (const [categoryId, row] of categories) {
        if (row.domainId === id) {
          categories.delete(categoryId);
        }
      }

      return domains.delete(id);
    },

    /**
     * Every category in one domain, key ascending, each with its
     * term count.
     *
     * THE COUNT IS ZERO FOR EVERY ROW, and that is a fact about the
     * dataset rather than a stub standing in for one. No method on
     * this store writes a term, so no category it can hold has one,
     * and a counted zero is the true answer for all of them — which
     * is what `CategoryWithTermCount` asks for, an absent member
     * being the one answer it forbids. The term half brings the
     * collection this count is taken over.
     */
    async listCategoriesWithTermCounts(
      domainId: number,
    ): Promise<readonly CategoryWithTermCount[]> {
      return orderedCategories(domainId).map(
        (row) => ({ ...copyCategory(row), termCount: 0 }),
      );
    },

    /** One category by its id, or null. */
    async findCategoryById(id: number): Promise<CategoryRecord | null> {
      const row = categories.get(id);

      return row === undefined
        ? null
        : copyCategory(row);
    },

    /**
     * Inserts a category, checking what the database checks in the
     * order the database checks it.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does — measured on
     * `categories` itself, where two refused inserts between two
     * accepted ones left a gap of two, the depth refusal included.
     * Then the trigger, then the natural key, then the foreign key:
     * that order is measured rather than read off the schema, and it
     * is what an insert carrying two faults at once can see.
     */
    async insertCategory(input: InsertCategoryInput): Promise<CategoryRecord> {
      const id = nextCategoryId;

      nextCategoryId += 1;

      guardDepth(id, input.domainId, input.parentId);

      if (categoryByKey(input.domainId, input.key) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: CATEGORY_KEY_UNIQUE,
        });
      }

      guardParentExists(input.parentId);

      const row: CategoryRecord = {
        id,
        domainId: input.domainId,
        key: input.key,
        name: input.name,
        parentId: input.parentId,
      };

      categories.set(row.id, row);

      return copyCategory(row);
    },

    /**
     * Rewrites the supplied members of one category.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, which the port states rather than leaving to its two
     * implementations: `categories` carries no `updated_at`, so an
     * empty patch has genuinely nothing to set and drizzle throws on
     * an empty update list rather than issuing a harmless statement.
     *
     * Anything else re-runs the depth guard over the EFFECTIVE
     * parent — the patched one where the patch names it, the stored
     * one where it does not — because the trigger fires on every
     * write, a rename included. A stored row is always legal, so a
     * rename cannot be refused by it; running the guard anyway is
     * what keeps that a consequence rather than an assumption.
     *
     * `key` is not patchable, so this method raises no
     * `unique-violation` at all.
     */
    async updateCategory(
      id: number,
      patch: CategoryPatch,
    ): Promise<CategoryRecord | null> {
      const existing = categories.get(id);

      if (existing === undefined) {
        return null;
      }

      if (patch.name === undefined && patch.parentId === undefined) {
        return copyCategory(existing);
      }

      // Absent and null are different requests here, which is why the
      // test is against `undefined` rather than a nullish default:
      // absent leaves the row where it is, and null promotes it to a
      // root.
      const parentId = patch.parentId === undefined
        ? existing.parentId
        : patch.parentId;

      guardDepth(id, existing.domainId, parentId);
      guardParentExists(parentId);

      const updated: CategoryRecord = {
        ...existing,
        name: patch.name ?? existing.name,
        parentId,
      };

      categories.set(id, updated);

      return copyCategory(updated);
    },

    /**
     * Deletes one category, unless something still hangs off it.
     *
     * ITS CHILDREN REFUSE THE DELETE, which is `categories.parent_id`
     * being `NO ACTION` rather than a rule invented here: a category
     * holding children is not removable until they are reparented or
     * removed, and that is what makes losing them an explicit
     * decision. The refusal names
     * `categories_parent_id_categories_id_fk`, the same name a parent
     * naming no row carries, and the two are told apart by which call
     * raised them and by nothing else.
     *
     * ITS TERMS AND ITS CRITERIA WOULD GO WITH IT — both cascade on
     * `category_id` — and there is nothing here to take, since no
     * method on this store writes either. The term half joins the
     * cascade in this same place.
     */
    async deleteCategory(id: number): Promise<boolean> {
      if (hasChildren(id)) {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: CATEGORY_PARENT_FK,
        });
      }

      return categories.delete(id);
    },

    setDomainDependents(
      domainId: number,
      counts: Partial<DomainDependentCounts>,
    ): void {
      dependents.set(domainId, { ...NO_DEPENDENTS, ...counts });
    },
  };
}
