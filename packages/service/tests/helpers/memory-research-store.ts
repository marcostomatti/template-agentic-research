/**
 * @packageDocumentation
 * The in-memory dataset every wave-1 store port is driven through in
 * the isolated suite. All four halves are here — the domains half,
 * the taxonomy half with categories and terms together, the personas
 * beside them, and the operator settings the deployment as a whole is
 * configured by.
 *
 * ONE DATASET RATHER THAN FOUR FAKES, which is why this file is not
 * named for any one of the ports it satisfies. `src/domains/store.ts`
 * records that the taxonomy, personas and settings services all
 * resolve a `:slug` through {@link DomainStore.findDomainBySlug}
 * before doing anything of their own, and the taxonomy and persona
 * tables hang off `domains.id` with `ON DELETE CASCADE`. A domain
 * deleted through one port has to be gone from the others, and only
 * shared state makes that true: four independent fakes would agree
 * with each other right up until a case deleted something.
 *
 * `operator_settings` IS THE ONE TABLE THAT HANGS OFF NOTHING, and
 * it belongs in the shared dataset for the other direction of that
 * same rule. It carries no `domain_id` and no foreign key, so a
 * domain delete leaves it exactly as it was — including a
 * `defaultDomainSlug` naming the domain that has just gone. That is
 * the behaviour rather than an omission: `src/settings/store.ts`
 * carries why a dangling slug reads as no default being set, and a
 * settings fake standing on its own could not be asked the question
 * at all.
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
 * A CATEGORY'S TERMS GO WITH IT, and a domain's go two levels down.
 * `terms.category_id` is `ON DELETE CASCADE`, so removing a category
 * takes its terms — measured, the delete answers and its rows are
 * gone — and removing a domain takes its categories, which take
 * theirs. None of that is refused: the guard above is about
 * CHILDREN, and a term is not a child.
 *
 * THE TERM HALF HAS ONE KEY AND ONE FOREIGN KEY, AND NO SINGLE CALL
 * CAN REACH BOTH. `terms_category_id_pattern_unique` is
 * `(category_id, pattern)` and `terms_category_id_categories_id_fk`
 * is that same `category_id`, so a write naming a category that does
 * not exist cannot also duplicate a pattern inside it — there is
 * nothing stored there to duplicate. So this half has no measured
 * refusal ORDER of its own the way the category half does: the order
 * below is copied from that half and is unobservable either way,
 * which is stated rather than dressed up as a measurement.
 *
 * THE UPSERT REWRITES THREE COLUMNS AND KEEPS THE STORED ROW'S ID.
 * Measured against the live Postgres: an `ON CONFLICT ... DO UPDATE`
 * on that key answered the STORED id, with `weight`, `polarity` and
 * `notes` rewritten from the submitted row. A term therefore keeps
 * its id across a re-import, which is what lets import, export and
 * re-import settle instead of accumulating a second row that would
 * count the same match twice.
 *
 * AND IT BURNS AN ID FOR EVERY SUBMITTED ROW, INCLUDING THE ROWS IT
 * DOES NOT INSERT. Measured on the same statement: a two-row batch
 * moved the sequence by two while writing one new row and rewriting
 * one stored one, and a two-row batch refused outright by the
 * foreign key moved it by two as well. So the counter here advances
 * once per SUBMITTED row, ahead of every check, and a conflicting
 * row leaves the id it took unused.
 *
 * A REPEAT INSIDE ONE DOCUMENT IS NOT A `StoreRefusal`, and it is
 * the one refusal here deliberately left untranslated. Postgres
 * answers SQLSTATE 21000 when a statement's values carry the same
 * conflict target twice, `classifyPgError` does not recognise it,
 * and `src/taxonomy/store.ts` states the no-repeat rule as a
 * PRECONDITION its caller checks. A plain `Error` is thrown for it
 * rather than nothing at all, because a fake quietly applying the
 * last of the colliding rows would be ACCEPTING what the database
 * refuses — the one thing this file exists to rule out. Measured
 * beside the foreign key: a batch that both repeated a pattern and
 * named a missing category answered 21000 and not 23503, so the
 * repeat is what fires first.
 *
 * THE PERSONA HALF HAS ONE KEY AND ONE FOREIGN KEY, AND NO SINGLE
 * CALL CAN REACH BOTH EITHER. `personas_domain_id_role_unique` is
 * `(domain_id, role)` and `personas_domain_id_domains_id_fk` is that
 * same `domain_id`, so the term half's sentence carries here word
 * for word: a write naming a domain that does not exist can
 * duplicate nothing, because nothing is stored under a domain that
 * is not there. `personas` carries no CHECK and no trigger at all,
 * so this half imitates two mechanisms and no order — measured
 * against the live Postgres, where a duplicate answered 23505 on
 * INSERT and on UPDATE alike and a missing domain answered 23503,
 * each beside a positive control: a second role under the same
 * domain accepted where the duplicate was refused, and the SAME
 * role under another domain accepted, which is what says the key is
 * per-domain rather than global.
 *
 * A PERSONA DELETE CANNOT BE REFUSED, which is the one thing this
 * half has that neither of the others does. Nothing in schema v2
 * points at `personas`, so there is no guard below it and no
 * cascade: `deletePersona` is `deleteTerm`'s shape rather than
 * `deleteCategory`'s, and a persona removed is a whole operation
 * rather than half of one with a reference left behind.
 *
 * AND A DOMAIN TAKES ITS PERSONAS WITH IT. `personas.domain_id` is
 * `ON DELETE CASCADE`, as every foreign key onto `domains.id` is, so
 * the domain delete below drops them where it drops the domain's
 * categories and their terms. None of that is refusable either: the
 * `NO ACTION` a cascade has to be careful of is on
 * `categories.parent_id` and reaches no other table.
 *
 * THE SETTINGS HALF REFUSES NOTHING, AND THAT IS A MEASUREMENT
 * RATHER THAN A SIMPLIFICATION. `operator_settings` carries two
 * mechanisms and neither is reachable through the port: a second
 * insert at the singleton id is 23505 naming
 * `operator_settings_pkey` and any id but 1 is 23514 naming
 * `operator_settings_singleton_check`, both seen firing against the
 * live Postgres beside the control that makes them discriminating
 * — the upsert run twice in the same transaction left ONE row
 * carrying the second payload. But `SettingsStore` takes no id and
 * writes the one it chose itself, so a caller can reach neither.
 * This half has nothing to imitate, which is why it is the one half
 * below that throws no {@link StoreRefusal} at all.
 *
 * SO A FIRST WRITE AND A REWRITE ARE ONE CALL, and holding one
 * payload is how this half satisfies it. The drizzle implementation
 * gets there by upserting on the singleton id; there is no row to
 * count here and no second one to hold, which is the singleton
 * being unexpressible rather than enforced — exactly what
 * `src/settings/store.ts` says of the port's own shape.
 *
 * AND NULL IS NOT `{}` HERE, though `src/settings/service.ts`
 * answers `{}` for both. A read before any write is null and a read
 * after a write of `{}` is `{}`, because whether a row exists is a
 * fact while treating the two as one state is a decision, and the
 * port leaves that decision to its caller. A store collapsing them
 * would leave nothing able to tell a never-configured deployment
 * from a configured-to-nothing one.
 *
 * THERE IS NO SETTINGS COUNTER, which is where this half departs
 * from the three above rather than copying them.
 * `operator_settings.id` is `integer` with no default — measured
 * off `information_schema.columns` — so nothing hands out a value
 * and a refused write could not leave a gap even if one were
 * reachable. The id-burn fidelity the other three halves owe has no
 * subject here.
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
 * can write through the object it sent. `OperatorSettings` crosses
 * the same kind of column and is copied by a helper of its own, for
 * the reason `copyCategory`, `copyTerm` and `copyPersona` are three
 * functions rather than one: what a copy promises is a fact about
 * the shape it copies.
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
 * check rather than ahead of the key check alone. `terms` carries a
 * third sequence and burns it the same way — measured there too, a
 * duplicate pattern between two accepted inserts left a gap of one
 * — with the `ON CONFLICT` rewrite above as the case a reader would
 * not predict. `personas` carries a fourth, and the measurement
 * there is the widest of them: two refused inserts between two
 * accepted ones left a gap of two with the FOREIGN KEY refusal
 * included, so its counter advances ahead of every check rather
 * than ahead of the key check alone.
 */
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { OperatorSettings } from '../../src/db/schema/settings.js';
import type {
  DomainDependentCounts,
  DomainPatch,
  DomainRecord,
  DomainStore,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type {
  InsertPersonaInput,
  PersonaPatch,
  PersonaRecord,
  PersonaStore,
} from '../../src/personas/store.js';
import type { SettingsStore } from '../../src/settings/store.js';
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
} from '../../src/taxonomy/store.js';

import { StoreRefusal } from '../../src/db/store-errors.js';

/**
 * All four wave-1 ports over one dataset, plus the one seam a case
 * needs that no port declares.
 *
 * EVERY ONE OF THEM WHOLE rather than a `Pick` of it. The category
 * half stood behind a narrowed alias while the term methods were
 * unwritten, which was the honest statement of what existed rather
 * than a gap papered over with stubs; all twelve taxonomy methods,
 * all six persona ones and both settings ones are here now, so a
 * caller wanting any of the four ports entire can be handed this
 * store.
 *
 * Nothing in `src/` is handed a {@link MemoryResearchStore} — a
 * service takes the port — so the seam below cannot become a way for
 * the code under test to route around it.
 */
export interface MemoryResearchStore
  extends DomainStore, TaxonomyStore, PersonaStore, SettingsStore {
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

/**
 * The natural key on `terms`, spelled as `src/db/schema/taxonomy.ts`
 * spells it. The one key both term writes and the upsert's conflict
 * target all name.
 */
const TERM_KEY_UNIQUE = 'terms_category_id_pattern_unique';

/**
 * The foreign key from `terms.category_id`.
 *
 * Unlike {@link CATEGORY_PARENT_FK} this name stands for ONE rule,
 * so a service reading it needs no help from which method raised it:
 * `terms.category_id` cascades on delete, so there is no
 * children-hold-the-delete refusal to share the name with.
 */
const TERM_CATEGORY_FK = 'terms_category_id_categories_id_fk';

/**
 * The natural key on `personas`, spelled as
 * `src/db/schema/domains.ts` spells it. The one key both persona
 * writes name, and the only mechanism an update here can reach.
 */
const PERSONA_KEY_UNIQUE = 'personas_domain_id_role_unique';

/**
 * The foreign key from `personas.domain_id`.
 *
 * Like {@link TERM_CATEGORY_FK} and unlike {@link CATEGORY_PARENT_FK}
 * this name stands for ONE rule: the column cascades on delete, so
 * there is no rows-hold-the-delete refusal to share the name with.
 */
const PERSONA_DOMAIN_FK = 'personas_domain_id_domains_id_fk';

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
 * An operator settings payload sharing no object with the one it was
 * handed.
 *
 * A JSON round trip for the reason {@link copySettings} gives, and a
 * function of its own rather than a widening of that one for the
 * reason {@link copyCategory}, {@link copyTerm} and
 * {@link copyPersona} are three functions with one body: what a copy
 * promises is a fact about the shape it copies, and
 * `notificationChannels` is this payload's one level down rather
 * than the three `DomainSettings` carries.
 *
 * @param settings - The payload to copy.
 * @returns An equal payload sharing nothing with it.
 */
function copyOperatorSettings(
  settings: OperatorSettings,
): OperatorSettings {
  return JSON.parse(JSON.stringify(settings)) as OperatorSettings;
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
 * A term record whose members belong to nobody else.
 *
 * A shallow copy is the whole of it, for the reason
 * {@link copyCategory} gives: every member of `TermRecord` is a
 * number, a string or null, so there is nothing one level down to
 * reach. The copy still has to happen, or a caller handed the stored
 * object could rewrite `pattern` straight through the `readonly` the
 * port declares.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyTerm(row: TermRecord): TermRecord {
  return { ...row };
}

/**
 * A persona record whose members belong to nobody else.
 *
 * A shallow copy is the whole of it, for the reason
 * {@link copyCategory} gives: every member of `PersonaRecord` is a
 * number or a string, so there is nothing one level down to reach.
 * The copy still has to happen, or a caller handed the stored object
 * could rewrite `systemText` straight through the `readonly` the port
 * declares.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyPersona(row: PersonaRecord): PersonaRecord {
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
  const terms = new Map<number, TermRecord>();
  const personas = new Map<number, PersonaRecord>();
  let nextDomainId = 1;
  let nextCategoryId = 1;
  let nextTermId = 1;
  let nextPersonaId = 1;

  // The whole of the settings half's state. Not a Map, because
  // there is no key: `src/settings/store.ts` states a second
  // configuration is something that port cannot express, and this
  // is what that looks like where the rows are held.
  let storedSettings: OperatorSettings | null = null;

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
   * By `key` ascending, compared by code unit — but NOT for the
   * reason {@link orderedDomains} gives, which is the alphabet a
   * slug is held to. A taxonomy key is free text: `categorySeedSchema`
   * in `scripts/seed-schemas.ts` holds it to non-empty and so does
   * `createCategorySchema` in `src/taxonomy/categories-service.ts`,
   * so a key may carry case, spaces and punctuation. What makes the
   * comparison right anyway is measured rather than argued — the live
   * server's `en_US.utf8` ordered a mixed-case, punctuation-heavy set
   * of keys exactly as `<` did (measured, both sides) — and that is a
   * fact about a deployment's collation rather than about this port,
   * so a reader holding this order against a real server should
   * re-measure rather than infer. The order is total because the key
   * is unique within the domain, so there is no tie-break to forget.
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
   * One category's terms, unordered.
   *
   * A fresh array every call, which is what lets {@link orderedTerms}
   * sort it in place without reaching into stored state.
   *
   * @param categoryId - The category to read.
   * @returns Its terms. Empty for a category holding none AND for an
   *   id no category carries — nothing points at a row that is not
   *   there, which is the answer `countTerms` is read for.
   */
  function termsOf(categoryId: number): TermRecord[] {
    return [...terms.values()].filter((row) => row.categoryId === categoryId);
  }

  /**
   * One category's terms, ordered as `TaxonomyStore.listTerms`
   * promises.
   *
   * By `pattern` ascending, compared by code unit — and the port is
   * explicit that this is NOT the same promise a server makes. A
   * pattern is free text carrying case, spaces and punctuation, and
   * a database orders it under its own collation, so the agreement
   * measured for slugs and taxonomy keys does not carry here on its
   * own reasoning. It was measured anyway: this container's
   * `en_US.utf8` ordered a mixed-case, punctuation-heavy set of
   * patterns exactly as `<` did, both sides. That is a fact about a
   * deployment's locale rather than about this port, which is why
   * the seed serialiser sorts for itself rather than trusting any
   * read order.
   *
   * @param categoryId - The category to read.
   * @returns Its terms, pattern ascending. The order is total
   *   because the pattern is unique within the category, so there is
   *   no tie-break to forget.
   */
  function orderedTerms(categoryId: number): TermRecord[] {
    return termsOf(categoryId).sort((left, right) => {
      if (left.pattern === right.pattern) {
        return 0;
      }

      return left.pattern < right.pattern
        ? -1
        : 1;
    });
  }

  /**
   * @param categoryId - The category to look within.
   * @param pattern - The pattern to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `terms_category_id_pattern_unique`
   *   guarantees and what the three writes below enforce.
   */
  function termByPattern(
    categoryId: number,
    pattern: string,
  ): TermRecord | undefined {
    return termsOf(categoryId).find((row) => row.pattern === pattern);
  }

  /**
   * Refuses a `categoryId` that names no stored category.
   *
   * @param categoryId - The bucket a term write is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `terms_category_id_categories_id_fk`. Unlike the category
   *   half's foreign key this one refuses exactly one thing, so a
   *   service can read it off the refusal without knowing which call
   *   it made.
   */
  function guardTermCategory(categoryId: number): void {
    if (!categories.has(categoryId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: TERM_CATEGORY_FK,
      });
    }
  }

  /**
   * Removes every term in one category, as `ON DELETE CASCADE` does.
   *
   * Reached from both deletes rather than from `deleteCategory`
   * alone: a domain delete removes its categories, and the cascade
   * on `terms.category_id` fires for each of them. Unlike the
   * children guard this is not a rule that can refuse anything, so
   * sharing it between the two is safe in the way reusing
   * `deleteCategory` there would not be.
   *
   * @param categoryId - The category being removed.
   */
  function dropTermsOf(categoryId: number): void {
    for (const [termId, row] of terms) {
      if (row.categoryId === categoryId) {
        terms.delete(termId);
      }
    }
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

  /**
   * One domain's personas, unordered.
   *
   * A fresh array every call, which is what lets
   * {@link orderedPersonas} sort it in place without reaching into
   * stored state.
   *
   * @param domainId - The domain to read.
   * @returns Its personas. Empty for a domain holding none AND for
   *   an id no domain carries — nothing points at a row that is not
   *   there, which is the answer `countPersonas` is read for.
   */
  function personasOf(domainId: number): PersonaRecord[] {
    return [...personas.values()].filter((row) => row.domainId === domainId);
  }

  /**
   * One domain's personas, ordered as
   * `PersonaStore.listPersonas` promises.
   *
   * By `role` ascending, compared by code unit, and the caveat
   * {@link orderedTerms} carries applies here word for word: a role
   * is free text holding case, spaces and punctuation, and a
   * database orders it under its own collation, so the agreement
   * measured for slugs does not carry here on its own reasoning. It
   * was measured anyway — this container's `en_US.utf8` ordered a
   * mixed-case, punctuation-bearing set of roles exactly as `<` did,
   * both sides — and that is a fact about a deployment's locale
   * rather than about this port. Nothing on the personas surface
   * serialises rows byte-for-byte, so there is nothing here that has
   * to notice if a deployment's collation differs.
   *
   * @param domainId - The domain to read.
   * @returns Its personas, role ascending. The order is total
   *   because the role is unique within the domain, so there is no
   *   tie-break to forget.
   */
  function orderedPersonas(domainId: number): PersonaRecord[] {
    return personasOf(domainId).sort((left, right) => {
      if (left.role === right.role) {
        return 0;
      }

      return left.role < right.role
        ? -1
        : 1;
    });
  }

  /**
   * @param domainId - The domain to look within.
   * @param role - The role to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `personas_domain_id_role_unique` guarantees
   *   and what the two writes below enforce.
   */
  function personaByRole(
    domainId: number,
    role: string,
  ): PersonaRecord | undefined {
    return personasOf(domainId).find((row) => row.role === role);
  }

  /**
   * Refuses a `domainId` that names no stored domain.
   *
   * @param domainId - The domain a persona insert is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `personas_domain_id_domains_id_fk`. Reached from the insert
   *   alone: `domainId` is not on `PersonaPatch`, so no update
   *   touches this key at all.
   */
  function guardPersonaDomain(domainId: number): void {
    if (!domains.has(domainId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: PERSONA_DOMAIN_FK,
      });
    }
  }

  /**
   * Removes every persona of one domain, as `ON DELETE CASCADE`
   * does.
   *
   * Reached from the domain delete alone, and unable to refuse
   * anything — which is what makes sharing it safe in the way
   * reusing a guarded delete would not be. There is no guarded
   * persona delete to reuse in any case: nothing points at
   * `personas`.
   *
   * @param domainId - The domain being removed.
   */
  function dropPersonasOf(domainId: number): void {
    for (const [personaId, row] of personas) {
      if (row.domainId === domainId) {
        personas.delete(personaId);
      }
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
     *
     * IT REACHES TWO LEVELS DOWN, because each category it removes
     * cascades onto its own terms. Measured: a domain delete left
     * zero rows in `categories` and zero in `terms`. The term drop
     * IS shared with `deleteCategory` below — {@link dropTermsOf} —
     * which is safe precisely where reusing the guarded category
     * delete is not, since removing terms refuses nothing.
     *
     * IT TAKES THE DOMAIN'S PERSONAS IN THE SAME PLACE, for the same
     * reason and with nothing to be careful of: `personas.domain_id`
     * is `ON DELETE CASCADE` and nothing points at `personas`, so
     * there is no guard anywhere below this one to run into.
     */
    async deleteDomain(id: number): Promise<boolean> {
      dependents.delete(id);
      dropPersonasOf(id);

      for (const [categoryId, row] of categories) {
        if (row.domainId === id) {
          dropTermsOf(categoryId);
          categories.delete(categoryId);
        }
      }

      return domains.delete(id);
    },

    /**
     * Every category in one domain, key ascending, each with its
     * term count.
     *
     * THE COUNT IS COUNTED, over the same `terms` collection the
     * term half below writes to. A category holding none answers a
     * counted zero rather than an absent member, which is the one
     * answer `CategoryWithTermCount` forbids — `JSON.stringify`
     * drops an `undefined` outright, so a bucket that was never
     * counted and a bucket holding nothing would otherwise reach a
     * caller as the same thing.
     */
    async listCategoriesWithTermCounts(
      domainId: number,
    ): Promise<readonly CategoryWithTermCount[]> {
      return orderedCategories(domainId).map(
        (row) => ({ ...copyCategory(row), termCount: termsOf(row.id).length }),
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
     * ITS TERMS GO WITH IT, which is `terms.category_id` being
     * `ON DELETE CASCADE` and is measured: the delete answers and
     * the category's rows are gone. Holding terms is therefore no
     * reason to refuse — only children are — and the two are checked
     * in that order here because only one of them can refuse
     * anything. Its CRITERIA would go the same way, and there is
     * still nothing to take: no method on this store writes one.
     */
    async deleteCategory(id: number): Promise<boolean> {
      if (hasChildren(id)) {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: CATEGORY_PARENT_FK,
        });
      }

      dropTermsOf(id);

      return categories.delete(id);
    },

    /**
     * One category's terms, pattern ascending, windowed only when a
     * window was given.
     *
     * AN ABSENT WINDOW READS THE WHOLE CATEGORY, which is the
     * export's call rather than a default standing in for one. A
     * `?format=seed` document is about the category as a whole, and
     * serving it by counting first and then asking for a window that
     * size would be two reads whose answers can disagree — a term
     * written in between is simply missing from a document claiming
     * to be the category.
     */
    async listTerms(
      categoryId: number,
      window?: StoreWindow,
    ): Promise<readonly TermRecord[]> {
      const ordered = orderedTerms(categoryId);
      const rows = window === undefined
        ? ordered
        : ordered.slice(window.offset, window.offset + window.limit);

      return rows.map(copyTerm);
    },

    /**
     * How many terms one category holds, ignoring any window.
     *
     * An id no category carries answers zero rather than failing,
     * which is correct rather than a special case.
     */
    async countTerms(categoryId: number): Promise<number> {
      return termsOf(categoryId).length;
    },

    /** One term by its id, or null. */
    async findTermById(id: number): Promise<TermRecord | null> {
      const row = terms.get(id);

      return row === undefined
        ? null
        : copyTerm(row);
    },

    /**
     * Inserts one term, asserting a new row rather than upserting.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does — measured on `terms`,
     * where a duplicate pattern between two accepted inserts left a
     * gap of one and a foreign-key refusal moved the sequence by one
     * as well.
     *
     * The key is checked ahead of the foreign key, matching
     * `insertCategory` above. NOTHING CAN OBSERVE THAT ORDER HERE,
     * and saying so is the honest half: both mechanisms are about
     * `category_id`, so a write naming a category that does not
     * exist cannot also duplicate a pattern inside it. The order is
     * copied from the half where it WAS measured rather than
     * measured here.
     */
    async insertTerm(input: InsertTermInput): Promise<TermRecord> {
      const id = nextTermId;

      nextTermId += 1;

      if (termByPattern(input.categoryId, input.pattern) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: TERM_KEY_UNIQUE,
        });
      }

      guardTermCategory(input.categoryId);

      const row: TermRecord = {
        id,
        categoryId: input.categoryId,
        pattern: input.pattern,
        weight: input.weight,
        polarity: input.polarity,
        notes: input.notes,
      };

      terms.set(row.id, row);

      return copyTerm(row);
    },

    /**
     * Writes a whole lexicon into one category, rewriting the terms
     * it already carries.
     *
     * A CONFLICTING ROW KEEPS THE STORED ROW'S ID and rewrites
     * `weight`, `polarity` and `notes` — measured against the live
     * Postgres, where the statement answered the stored id. The
     * conflict target itself is what the row was matched ON, so
     * there is nothing in `categoryId` or `pattern` to rewrite.
     *
     * ONE ID PER SUBMITTED ROW, TAKEN AHEAD OF EVERY CHECK. Measured
     * on the same statement: a two-row batch moved the sequence by
     * two while inserting one row and rewriting one, and a two-row
     * batch refused outright by the foreign key moved it by two as
     * well. So the counter advances by the whole length here and a
     * conflicting row leaves the id it took unused, which is what
     * keeps this fake's ids as gappy as a deployment's.
     *
     * AN EMPTY LIST TOUCHES NOTHING, the foreign key included: no
     * statement runs, so a `categoryId` naming no category is not
     * refused. The port states it, and it is why the early return
     * sits above the counter as well as above the checks.
     *
     * A REPEATED CONFLICT TARGET IS NOT A `StoreRefusal` — see this
     * module's header — and it is checked before the foreign key
     * because that is the order measured: a batch both repeating a
     * pattern and naming a missing category answered 21000 and not
     * 23503. The message names the constraint and the count and no
     * part of the document, so a logger reaching it learns nothing
     * about what was submitted.
     */
    async upsertTerms(
      categoryId: number,
      rows: readonly TermValues[],
    ): Promise<readonly TermRecord[]> {
      if (rows.length === 0) {
        return [];
      }

      const firstId = nextTermId;

      nextTermId += rows.length;

      const patterns = new Set(rows.map((row) => row.pattern));

      if (patterns.size !== rows.length) {
        throw new Error(
          `${rows.length} rows carry ${patterns.size} patterns, `
          + `and ${TERM_KEY_UNIQUE} admits one row per pattern`,
        );
      }

      guardTermCategory(categoryId);

      return rows.map((values, index) => {
        const existing = termByPattern(categoryId, values.pattern);
        const row: TermRecord = {
          id: existing === undefined
            ? firstId + index
            : existing.id,
          categoryId,
          pattern: values.pattern,
          weight: values.weight,
          polarity: values.polarity,
          notes: values.notes,
        };

        terms.set(row.id, row);

        return copyTerm(row);
      });
    },

    /**
     * Rewrites the supplied members of one term.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updateCategory` above gives: `terms`
     * carries no `updated_at` either, so an empty patch has nothing
     * to set and drizzle throws on an empty update list.
     *
     * BOTH HALVES OF THE NATURAL KEY ARE PATCHABLE, so what is
     * checked is the RESULTING pair rather than either member: a
     * rename, a bucket move and both at once are one rule with one
     * refusal. A row is not in conflict with itself — measured, an
     * update writing a term's own pattern back over it is accepted
     * — so the row found under the resulting pair is a refusal only
     * when it is a different row.
     *
     * A CATEGORY IN ANOTHER DOMAIN IS NOT REFUSED HERE, measured:
     * nothing in the schema relates a term to a domain, so the move
     * is accepted and that rule belongs to
     * `src/taxonomy/terms-service.ts`. A
     * category that does not exist IS refused, by the foreign key.
     */
    async updateTerm(
      id: number,
      patch: TermPatch,
    ): Promise<TermRecord | null> {
      const existing = terms.get(id);

      if (existing === undefined) {
        return null;
      }

      if (
        patch.categoryId === undefined
        && patch.pattern === undefined
        && patch.weight === undefined
        && patch.polarity === undefined
        && patch.notes === undefined
      ) {
        return copyTerm(existing);
      }

      const categoryId = patch.categoryId ?? existing.categoryId;
      const pattern = patch.pattern ?? existing.pattern;
      const holder = termByPattern(categoryId, pattern);

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: TERM_KEY_UNIQUE,
        });
      }

      guardTermCategory(categoryId);

      const updated: TermRecord = {
        ...existing,
        categoryId,
        pattern,
        weight: patch.weight ?? existing.weight,
        polarity: patch.polarity ?? existing.polarity,
        // Absent and null are different requests, which is why the
        // test is against `undefined` rather than a nullish default:
        // absent leaves the note alone and null clears it.
        notes: patch.notes === undefined
          ? existing.notes
          : patch.notes,
      };

      terms.set(id, updated);

      return copyTerm(updated);
    },

    /**
     * Deletes one term.
     *
     * Nothing hangs off a term, so this is the one delete on the
     * taxonomy surface with neither a guard nor a cascade.
     */
    async deleteTerm(id: number): Promise<boolean> {
      return terms.delete(id);
    },

    /**
     * One window of a domain's personas, role ascending.
     *
     * A domain holding none and an id no domain carries are one
     * answer here — the empty list — because whether the domain
     * exists was settled by `DomainStore.findDomainBySlug` before
     * this was called.
     */
    async listPersonas(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly PersonaRecord[]> {
      return orderedPersonas(domainId)
        .slice(window.offset, window.offset + window.limit)
        .map(copyPersona);
    },

    /**
     * How many personas one domain holds, ignoring any window.
     *
     * An id no domain carries answers zero rather than failing,
     * which is correct rather than a special case: nothing points at
     * a row that is not there.
     */
    async countPersonas(domainId: number): Promise<number> {
      return personasOf(domainId).length;
    },

    /** One persona by its id, or null. */
    async findPersonaById(id: number): Promise<PersonaRecord | null> {
      const row = personas.get(id);

      return row === undefined
        ? null
        : copyPersona(row);
    },

    /**
     * Inserts one persona, asserting a new row rather than
     * upserting — unlike `scripts/seed.ts`, which writes this same
     * table through an `ON CONFLICT` on this same natural key.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does. Measured on `personas`
     * against the live Postgres, and the widest of the three
     * measurements this file rests on: two refused inserts between
     * two accepted ones left a gap of two with the FOREIGN KEY
     * refusal included, so the counter advances ahead of every check
     * rather than ahead of the key check alone.
     *
     * The key is checked ahead of the foreign key, matching
     * `insertCategory` and `insertTerm` above. NOTHING CAN OBSERVE
     * THAT ORDER HERE, and saying so is the honest half: the unique
     * key opens on the very column the foreign key constrains, so a
     * write naming a domain that does not exist can duplicate
     * nothing. The order is copied from the half where it WAS
     * measured rather than measured here.
     */
    async insertPersona(input: InsertPersonaInput): Promise<PersonaRecord> {
      const id = nextPersonaId;

      nextPersonaId += 1;

      if (personaByRole(input.domainId, input.role) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: PERSONA_KEY_UNIQUE,
        });
      }

      guardPersonaDomain(input.domainId);

      const row: PersonaRecord = {
        id,
        domainId: input.domainId,
        role: input.role,
        systemText: input.systemText,
      };

      personas.set(row.id, row);

      return copyPersona(row);
    },

    /**
     * Rewrites the supplied members of one persona.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updateCategory` and `updateTerm` above
     * give: `personas` carries no `updated_at` either, so an empty
     * patch has nothing to set and drizzle throws on an empty update
     * list.
     *
     * `role` IS PATCHABLE AND `domainId` IS NOT, so what is checked
     * is the resulting role within the STORED domain — measured
     * against the live Postgres, where a duplicate answers 23505 on
     * an UPDATE exactly as it does on an INSERT — and no update
     * reaches the foreign key at all. A row is not in conflict with
     * itself, so the row found under the resulting pair is a refusal
     * only when it is a different row.
     *
     * AN EMPTY `systemText` IS A VALUE BEING WRITTEN rather than a
     * member being left alone, which is why the tests below are
     * against `undefined`: `PersonaRecord.systemText` states that a
     * role with nothing to say says so, and a store defaulting the
     * empty string to the stored text could not express it.
     */
    async updatePersona(
      id: number,
      patch: PersonaPatch,
    ): Promise<PersonaRecord | null> {
      const existing = personas.get(id);

      if (existing === undefined) {
        return null;
      }

      if (patch.role === undefined && patch.systemText === undefined) {
        return copyPersona(existing);
      }

      const role = patch.role ?? existing.role;
      const holder = personaByRole(existing.domainId, role);

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: PERSONA_KEY_UNIQUE,
        });
      }

      const updated: PersonaRecord = {
        ...existing,
        role,
        systemText: patch.systemText ?? existing.systemText,
      };

      personas.set(id, updated);

      return copyPersona(updated);
    },

    /**
     * Deletes one persona.
     *
     * Nothing hangs off a persona — no foreign key in schema v2
     * points at this table — so this is `deleteTerm`'s shape rather
     * than `deleteCategory`'s: neither a guard nor a cascade, and a
     * delete that cannot be refused.
     */
    async deletePersona(id: number): Promise<boolean> {
      return personas.delete(id);
    },

    /**
     * Reads the operator's configuration, or null before any write.
     *
     * NULL AND `{}` ARE TWO ANSWERS HERE, though
     * `src/settings/service.ts` answers `{}` for both. What crosses
     * this port is whether a row exists; collapsing that into the
     * empty payload is a decision, and a store taking it would
     * leave nothing able to tell a never-configured deployment from
     * a configured-to-nothing one.
     */
    async readSettings(): Promise<OperatorSettings | null> {
      return storedSettings === null
        ? null
        : copyOperatorSettings(storedSettings);
    },

    /**
     * Writes the operator's configuration, whole.
     *
     * A FIRST WRITE AND A REWRITE ARE ONE CALL, and neither can be
     * refused. The drizzle implementation gets there by upserting on
     * the singleton id; this one gets there by holding one payload,
     * and nothing here can hold a second.
     *
     * THE PAYLOAD REPLACES THE STORED ONE RATHER THAN MERGING INTO
     * IT, which is the only way a member is ever cleared: under a
     * merge, the request that omits a preference and the request
     * that removes it would be the same bytes. The assignment below
     * is the whole of the rule, exactly as a `jsonb` column in a
     * drizzle `set` list is assigned rather than merged.
     *
     * THE ANSWER IS READ BACK OUT OF STORED STATE rather than echoed
     * from the argument, so a caller sees what is held — and a
     * second copy is taken on the way out, since handing the stored
     * payload back would let a caller write into it through the
     * deeply `readonly` the port declares.
     *
     * Only the second half of that is observable here, and the
     * first is a MEASURED ZERO: the payload is copied in and copied
     * out, so a copy of the argument and a copy of stored state are
     * the same object graph, and the leg swapping one for the other
     * reddens no case in
     * `tests/helpers/memory-research-store.test.ts`. The claim has a
     * subject only where the database can change what it stored
     * — `jsonb` normalises key order and drops a duplicate key
     * — so it is `src/settings/db-store.ts`'s `RETURNING` list
     * that discharges it, and `tests/live/api.live.test.ts` is
     * where that now happens: a payload written with its keys out
     * of jsonb order comes back in the database's order, which is
     * an answer this implementation cannot give.
     */
    async writeSettings(
      settings: OperatorSettings,
    ): Promise<OperatorSettings> {
      storedSettings = copyOperatorSettings(settings);

      return copyOperatorSettings(storedSettings);
    },

    setDomainDependents(
      domainId: number,
      counts: Partial<DomainDependentCounts>,
    ): void {
      dependents.set(domainId, { ...NO_DEPENDENTS, ...counts });
    },
  };
}
