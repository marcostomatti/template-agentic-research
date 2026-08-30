/**
 * @packageDocumentation
 * The in-memory dataset every wave-1 store port is driven through in
 * the isolated suite. The domains half is here; the taxonomy,
 * personas and settings halves land in this same file, over this
 * same dataset, as their stages arrive.
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
 * only against a database.
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

import { StoreRefusal } from '../../src/db/store-errors.js';

/**
 * The store, plus the one seam a case needs that no port declares.
 *
 * Nothing in `src/` is handed a {@link MemoryResearchStore} — a
 * service takes the port — so the seam cannot become a way for the
 * code under test to route around it.
 */
export interface MemoryResearchStore extends DomainStore {
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
  let nextDomainId = 1;

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
     * Deletes one domain, and the counts planted against it.
     *
     * The cascade is the database's: every foreign key onto
     * `domains.id` is `ON DELETE CASCADE`, so dropping the planted
     * counts here is this dataset's half of the same behaviour. The
     * rows the later halves of this file add join it in the same
     * place.
     */
    async deleteDomain(id: number): Promise<boolean> {
      dependents.delete(id);

      return domains.delete(id);
    },

    setDomainDependents(
      domainId: number,
      counts: Partial<DomainDependentCounts>,
    ): void {
      dependents.set(domainId, { ...NO_DEPENDENTS, ...counts });
    },
  };
}
