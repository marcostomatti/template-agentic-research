/**
 * The wave-1 stores driven against a real Postgres, through the real
 * migrations: a domain written, a taxonomy hung off it, and a
 * lexicon written into a bucket of that taxonomy. Self-skips when
 * AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * WHAT ONLY A SERVER CAN ANSWER is why this file is worth its
 * container, and it is not the rules. Every decision the wave-1
 * surface takes — the 404 for an unknown slug, the 409 for a taken
 * one, the 422 for a parent the taxonomy may not have — is a
 * decision about rows, and `tests/helpers/memory-research-store.ts`
 * supplies rows with no database, so all of it is already pinned by
 * the colocated service and route suites. What is left is the half
 * those suites structurally cannot reach: every operation below is
 * SQL, and a statement that is valid drizzle and invalid SQL passes
 * `lint`, `check-types` and the entire isolated suite. A projection
 * naming a column the migration never created, an `ON CONFLICT`
 * target naming the wrong key, a `RETURNING` list drifted from the
 * `SELECT` beside it — each is reported here and nowhere else.
 *
 * FOUR READINGS BELOW ARE THINGS AN IN-MEMORY MAP CANNOT DO, which
 * is the same argument put sharply enough to be checkable.
 *
 * THE IDENTITY AND THE STAMPS ARE THE DATABASE'S. `id` is a
 * `bigserial` mapped in `number` mode, so it arrives as a number
 * rather than as the string a raw driver hands back; `created_at`
 * and `updated_at` come from column defaults on the insert and are
 * therefore EQUAL, one statement carrying one timestamp, while a
 * patch stamps `updated_at` from `now()` and leaves `created_at`
 * exactly where it was.
 *
 * JSONB REORDERS WHAT IT STORES. A settings payload written with its
 * members in one order is answered with them in another, because
 * jsonb holds keys by length and then by bytes rather than by
 * insertion — measured here at the top level and inside
 * `scoringWeights`. That is the reading which says the `RETURNING`
 * list READ the stored row rather than echoing the argument it was
 * handed, and it is exactly the measured zero the in-memory store
 * and the service suites hand over by name: where a store copies its
 * argument in and copies it out again, answering the argument and
 * answering the stored value are the same object graph, so no leg
 * over there can tell the two apart.
 *
 * THE TERM COUNT IS A GROUPED LEFT JOIN, and the member it exists
 * for is the EMPTY bucket. `count(terms.id)` answers 0 for a
 * category holding nothing, where the `count(*)` spelling of the
 * same statement answers 1 — a left join gives a parent with no
 * children exactly one null-extended row — so the one number an
 * operator scans the list for is the one an unwatched change
 * inverts, and it is green in every isolated suite either way.
 *
 * THE UPSERT ANSWERS THE STORED ROW. A second pass over a pattern
 * the category already carries rewrites that row and hands back the
 * id it already had, which is what lets import, export and
 * re-import settle instead of accumulating a second row that would
 * then count the same match twice.
 *
 * THE SCHEMA COMES FROM THE MIGRATIONS. `applyMigrations` in the
 * `beforeAll` below runs the real `drizzle/*.sql` rather than
 * pushing the schema, which is what `bun run db:migrate` does to a
 * deployment — so the tables these cases meet are the ones the
 * generated migrations create, and a migration that does not apply
 * reddens this file before a case is reached.
 * `tests/live/live-postgres.ts` argues the difference: a push
 * produces the right tables while never executing the migration,
 * which is precisely the gap that lets a broken one ship.
 *
 * THE RESET IS THE PRECONDITION, WRITTEN OUT. Every case below
 * plants everything it reads, so `resetTables` in the `beforeEach`
 * is what makes "nothing it read back was planted by anything but
 * itself" a fact rather than an ordering to keep. It also restarts
 * the identity sequences, which is why a case may name an id no row
 * carries and be sure of it. The first case takes that precondition
 * as a reading of its own rather than leaving it to a comment.
 *
 * THIS COMMIT LANDS THE ROUND TRIP AND NOTHING ELSE, and the
 * paragraphs a reader arriving from `tests/live/auth.live.test.ts`
 * will look for are deliberately absent rather than forgotten. No
 * case here provokes a REFUSAL: the depth trigger, the `parent_id`
 * `NO ACTION` that refuses a delete of a category still holding
 * children, the four natural keys and the domain cascade are the
 * next task's, and the personas and settings stores are the one
 * after that — nothing below writes `personas` or
 * `operator_settings`. One further read has no live case anywhere in
 * the plan and is named here so it can be picked up rather than
 * silently missed: `DomainStore.countDomainDependents` is one
 * `UNION ALL` over three LABELLED aggregates, and a branch coming
 * back out of order would attribute one table's count to another
 * with nothing reporting it. Reaching that needs a `topics`, a
 * `sources` and a `findings` row planted with raw SQL, which no port
 * method here writes. This paragraph is the missing half named
 * rather than left to be noticed, and it goes when they land.
 *
 * SEVEN MUTATIONS WERE RUN AGAINST THESE NINE CASES, each leg twice,
 * with every red SET identical across the two passes. The figures
 * are a measurement over this case list and nothing else: the two
 * tasks named above add cases to this file, and every number here
 * moves when they land, so the successor re-derives the grid rather
 * than inheriting it.
 *
 * TWO LEGS COLLAPSE INTO ONE READING rather than counting as two.
 * Counting `count(*)` instead of `count(terms.id)`, and ordering the
 * category list by id instead of by `key`, redden the IDENTICAL two
 * — the taxonomy case and the term-count case — because each of
 * those compares a whole ordered list of whole rows, so either fault
 * moves the same assertion and only the diff inside it says which.
 * Ordering the term list by id reddens two as well, the term read
 * and the rewrite, the second through a standing-rows control rather
 * than through its own subject.
 *
 * THE OTHER FOUR REDDEN EXACTLY ONE APIECE, and that narrowness is
 * what says each claim is isolated. Answering the insert's own
 * `settings` argument instead of the stored payload reddens the
 * jsonb case alone, because every other case stores `{}` — where an
 * echo and a read are the same value. Stamping `updated_at` from
 * `created_at` instead of `now()` reddens the patch case alone.
 * Dropping the `WHERE` from the category list reddens the taxonomy
 * case alone, which is the only one that plants a second domain.
 * Naming the wrong `ON CONFLICT` target reddens the rewrite case
 * alone: against a target no row collides on, the first pass still
 * lands and only a second pass has anything to conflict with.
 *
 * THE KEY-SET PIN IS A `check-types` LEG rather than a red case, and
 * was measured the same way: a fabricated member on `DomainRecord`
 * answers TS2322 at {@link EVERY_KEY_LISTED} with all nine cases
 * still green, which is what says the `satisfies` lists close only
 * the direction that does not matter.
 *
 * EVERY ERROR THIS FILE CONSTRUCTS CARRIES `[api-live]`, so a
 * failure raised by a helper names the suite that raised it. That
 * does not extend to a case's own assertion failures, and nothing
 * here catches one: vitest renders an assertion error's expected and
 * actual as the diff that says what differed, a re-wrap would
 * replace it with a prefix the case name already carries, and the
 * rule the case stands for is in that name too.
 */
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { DomainStore } from '../../src/domains/index.js';
import type { DomainRecord } from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type {
  CategoryRecord,
  CategoryWithTermCount,
  TaxonomyStore,
  TermRecord,
  TermValues,
} from '../../src/taxonomy/store.js';
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { createDbDomainStore } from '../../src/domains/index.js';
import { createDbTaxonomyStore } from '../../src/taxonomy/db-store.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The slug every case plants its domain under.
 *
 * `example-tech-radar` is the seeded worked example, so a fixture
 * here stays in the register `data/domains.json` set: neutral about
 * the subject, and recognisable as an example rather than as
 * anybody's deployment.
 */
const RADAR = 'example-tech-radar';

/** Its operator-facing label. */
const RADAR_NAME = 'Example Tech Radar';

/**
 * A second domain, invented in the same register.
 *
 * It exists for the scope reading alone: the category list takes a
 * `domain_id`, and a `WHERE` clause that had stopped narrowing would
 * answer both taxonomies while every count still added up.
 */
const TRANSIT = 'example-urban-transit';

/** Its label. */
const TRANSIT_NAME = 'Example Urban Transit';

/** The root of the planted taxonomy. */
const ROOT_KEY = 'technologies';

/** Its label. */
const ROOT_NAME = 'Technologies';

/**
 * The child that sits under the root, and the bucket every term
 * below lands in.
 *
 * Its key sorts BEFORE the root's, and the fixture writes the root
 * first — so a list read answering insertion order rather than key
 * order answers these two the other way round, which is what makes
 * the ordering assertion a reading instead of a restatement.
 */
const CHILD_KEY = 'frameworks';

/** Its label. */
const CHILD_NAME = 'Frameworks';

/** The label a patch renames the domain to. */
const RENAMED = 'Example Tech Radar (renamed)';

/**
 * A window wider than anything this file plants.
 *
 * What a window SELECTS is `src/domains/routes.test.ts`'s claim and
 * not this file's; here it is wide on purpose, so no reading below
 * can depend on where a row happened to fall.
 */
const WHOLE: StoreWindow = { limit: 50, offset: 0 };

/**
 * An id no row carries, which the reset is what guarantees.
 *
 * `resetTables` truncates with `RESTART IDENTITY`, so every sequence
 * is back at 1 when a case starts and the first id any table issues
 * is this one. Reading it before anything is planted is therefore a
 * read of a table that is genuinely empty rather than of an id that
 * merely happens to be free.
 */
const FIRST_ID = 1;

/**
 * The settings payload the jsonb reading is taken over.
 *
 * The member order here is chosen to be one jsonb will NOT keep:
 * keys are held by length and then by bytes, so `scoringWeights`
 * (15) comes back ahead of `verdictVocabulary` (17) and
 * `findingsDisplayName` (19), and `recency` (7) ahead of `termMatch`
 * (9) inside the nested record. Written in the answered order this
 * whole case would be green against a store that echoed its
 * argument.
 */
const SENT_SETTINGS: DomainSettings = {
  verdictVocabulary: ['adopt', 'trial', 'hold'],
  findingsDisplayName: 'Signals',
  scoringWeights: { termMatch: 3, recency: 1 },
};

/** The order {@link SENT_SETTINGS} was written in. */
const SENT_TOP_ORDER: readonly string[] = [
  'verdictVocabulary',
  'findingsDisplayName',
  'scoringWeights',
];

/** The order jsonb answers it in. Measured, not derived. */
const STORED_TOP_ORDER: readonly string[] = [
  'scoringWeights',
  'verdictVocabulary',
  'findingsDisplayName',
];

/** The same reordering one level down, inside `scoringWeights`. */
const STORED_NESTED_ORDER: readonly string[] = ['recency', 'termMatch'];

/**
 * The lexicon a bulk import writes into {@link CHILD_KEY}.
 *
 * Written in an order that is neither the pattern order the store
 * reads back in nor its reverse, so an answer echoing the submitted
 * order and an answer sorted by the database are three different
 * lists rather than two.
 */
const LEXICON = [
  {
    pattern: 'graph database',
    weight: 3,
    polarity: 'positive',
    notes: 'A worked example, not a recommendation.',
  },
  { pattern: 'vector search', weight: 2, polarity: 'positive', notes: null },
  { pattern: 'legacy stack', weight: 1, polarity: 'negative', notes: null },
] as const satisfies readonly TermValues[];

/** {@link LEXICON} read back in the order the store answers. */
const LEXICON_PATTERNS: readonly string[] = [
  'graph database',
  'legacy stack',
  'vector search',
];

/**
 * What a second import pass writes over one row of {@link LEXICON}.
 *
 * Every member the upsert rewrites differs from what the first pass
 * stored — the weight, the polarity and the note — because a
 * rewrite agreeing with the stored value in any of them is a member
 * the case cannot report on.
 */
const REWRITTEN = {
  pattern: 'vector search',
  weight: 9,
  polarity: 'negative',
  notes: 'Rewritten by the second pass.',
} as const satisfies TermValues;

/**
 * Every member `DOMAIN_COLUMNS` in `src/domains/db-store.ts`
 * projects.
 *
 * Asserted as a SET beside the field reads rather than instead of
 * them, and it is the half that catches what a field read cannot: a
 * column added to `domains` and put on the projection reaches every
 * route the same day, and no assertion naming a member notices a
 * member arriving.
 */
const DOMAIN_KEYS = [
  'createdAt',
  'embeddingModel',
  'featureVersion',
  'id',
  'name',
  'settings',
  'slug',
  'updatedAt',
] as const satisfies readonly (keyof DomainRecord)[];

/** Every member the taxonomy store projects for a category. */
const CATEGORY_KEYS = [
  'domainId',
  'id',
  'key',
  'name',
  'parentId',
] as const satisfies readonly (keyof CategoryRecord)[];

/** The same members, plus the one a list read adds to them. */
const LISTED_KEYS = [
  ...CATEGORY_KEYS,
  'termCount',
] as const satisfies readonly (keyof CategoryWithTermCount)[];

/** Every member the taxonomy store projects for a term. */
const TERM_KEYS = [
  'categoryId',
  'id',
  'notes',
  'pattern',
  'polarity',
  'weight',
] as const satisfies readonly (keyof TermRecord)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins nothing
 * at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** All four lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<DomainRecord, typeof DOMAIN_KEYS>
  & CoversEveryKey<CategoryRecord, typeof CATEGORY_KEYS>
  & CoversEveryKey<CategoryWithTermCount, typeof LISTED_KEYS>
  & CoversEveryKey<TermRecord, typeof TERM_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * The `satisfies` clauses above close the direction where a list
 * names a member its record lacks; this one closes the direction
 * that actually matters, a record growing a member no list knows
 * about. That turns {@link EveryKeyListed} into `never` and this
 * initializer into a TS2322 at this line — before any case can
 * compare an answer against a set that has quietly stopped
 * describing it. Read by a case below so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link DOMAIN_KEYS}, sorted at use rather than by hand. */
const DOMAIN_KEY_SET: readonly string[] = [...DOMAIN_KEYS].sort();

/** {@link CATEGORY_KEYS}, sorted. */
const CATEGORY_KEY_SET: readonly string[] = [...CATEGORY_KEYS].sort();

/** {@link LISTED_KEYS}, sorted. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/** {@link TERM_KEYS}, sorted. */
const TERM_KEY_SET: readonly string[] = [...TERM_KEYS].sort();

/**
 * The sorted key set of one answered record.
 *
 * @param row - Whatever a store handed back.
 * @returns Its own keys, sorted, ready for a set comparison.
 */
function keysOf(row: object): readonly string[] {
  return Object.keys(row).sort();
}

/**
 * The value a live read was supposed to answer.
 *
 * A read that came back null breaks the case in its SETUP, where a
 * missing row and a wrong value otherwise read alike — so the
 * refusal names what was being read rather than leaving every
 * assertion below it to fail against a null.
 *
 * @param value - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns The row, without the `null`.
 * @throws Error When the read answered null.
 */
function present<T>(value: T | null, read: string): T {
  if (value === null) {
    throw new Error(
      `[api-live] reading ${read} answered null, so every assertion `
      + 'below it would be about nothing.',
    );
  }

  return value;
}

/**
 * The one row of an unordered answer carrying a pattern.
 *
 * `TaxonomyStore.upsertTerms` promises no order at all — `RETURNING`
 * follows the statement's own processing order — so a case reading a
 * specific row out of a batch has to find it rather than index it.
 * The throw is the vacuity guard: two `undefined`s compare equal, so
 * a `toStrictEqual` over a row that was never answered is green for
 * nobody's reason.
 *
 * Exactly one rather than at least one, because the pattern is half
 * of `terms_category_id_pattern_unique` within a category: two rows
 * carrying it is the very accumulation the upsert exists to prevent,
 * and reporting it here names it rather than letting a later count
 * report a number nobody can attribute.
 *
 * @param rows - Whatever the write or the read answered.
 * @param pattern - The pattern to find, a constant of this file.
 * @returns The single row carrying it.
 * @throws Error When the rows carry it anything but once.
 */
function termNamed(
  rows: readonly TermRecord[],
  pattern: string,
): TermRecord {
  const matching = rows.filter((row) => row.pattern === pattern);
  const [row] = matching;

  if (row === undefined || matching.length !== 1) {
    throw new Error(
      `[api-live] expected exactly one row for pattern "${pattern}", `
      + `read ${String(matching.length)} of ${String(rows.length)}.`,
    );
  }

  return row;
}

/**
 * The domain, the root and the child one case plants.
 *
 * Named rather than inlined so the plant helper below has a return
 * type a reader can hold the cases against.
 */
interface PlantedTaxonomy {
  /** The domain both categories hang off. */
  readonly domain: DomainRecord;

  /** The root, written FIRST and read back second. */
  readonly root: CategoryRecord;

  /** The child under it, and the bucket every term lands in. */
  readonly child: CategoryRecord;
}

describeLivePg('wave-1 stores (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  // Both stores are built before the pool exists, which is the
  // ordering the thunk in each of them is there for: `src/index.ts`
  // builds all four wave-1 stores while `createService` is still
  // registering, and that is before the Postgres dependency has
  // started. Constructing them here touches nothing — a store that
  // resolved `db` eagerly would capture an undefined and fail every
  // case in this file, which is this run's reading of that claim.
  //
  // `createDbDomainStore` comes through `src/domains/index.js` and
  // not through the module declaring it, which is the containment
  // rule that barrel states about itself. Taxonomy carries no barrel,
  // so its constructor is a deep import; see `ls src/*/index.ts`.
  const domainStore: DomainStore = createDbDomainStore(() => db);
  const taxonomyStore: TaxonomyStore = createDbTaxonomyStore(() => db);

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);
    db = createLiveDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  /**
   * Writes the domain every case reads under.
   *
   * @param settings - The payload to store. Defaults to the empty
   *   object, which is a complete value rather than an absence.
   * @returns The stored row, as the database answered it.
   */
  async function plantDomain(
    settings: DomainSettings = {},
  ): Promise<DomainRecord> {
    return await domainStore.insertDomain({
      slug: RADAR,
      name: RADAR_NAME,
      settings,
    });
  }

  /**
   * Writes a domain, a root category and a child under that root.
   *
   * The root goes first, so every ordering assertion below is taken
   * against a table whose insertion order and key order disagree.
   *
   * @returns All three stored rows.
   */
  async function plantTaxonomy(): Promise<PlantedTaxonomy> {
    const domain = await plantDomain();
    const root = await taxonomyStore.insertCategory({
      domainId: domain.id,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
    });
    const child = await taxonomyStore.insertCategory({
      domainId: domain.id,
      key: CHILD_KEY,
      name: CHILD_NAME,
      parentId: root.id,
    });

    return { domain, root, child };
  }

  it('meets an empty database in every case', async () => {
    // The precondition every case below rests on, taken as a reading
    // rather than left to a comment: each of them plants everything
    // it reads, so a row surviving between cases would make some
    // later assertion true for a reason nobody wrote.
    //
    // Read through the stores rather than through SQL, so a table
    // missing from the `TABLES` roster in `./live-postgres.ts` — a
    // fault that leaves `lint`, `check-types` and the whole live run
    // green while leaking rows — is reported here too.
    expect(await domainStore.countDomains()).toBe(0);
    expect(await domainStore.listDomains(WHOLE)).toStrictEqual([]);
    expect(await domainStore.findDomainBySlug(RADAR)).toBeNull();
    expect(await taxonomyStore.listCategoriesWithTermCounts(FIRST_ID))
      .toStrictEqual([]);
    expect(await taxonomyStore.listTerms(FIRST_ID)).toStrictEqual([]);
    expect(await taxonomyStore.countTerms(FIRST_ID)).toBe(0);
  });

  it('holds every key list against the type it describes', () => {
    // The runtime half of the drift guard: the pin above is what
    // `check-types` reads, and a symbol nothing uses is a lint error,
    // so the two obligations are discharged by one line.
    expect(EVERY_KEY_LISTED).toBe(true);
    expect(DOMAIN_KEY_SET).toHaveLength(DOMAIN_KEYS.length);
    expect(LISTED_KEY_SET).toHaveLength(CATEGORY_KEYS.length + 1);
  });

  it('writes a domain the database identifies and stamps', async () => {
    const created = await plantDomain();

    // The whole key set beside the field reads, never instead of
    // them: a column added to `domains` and projected reaches every
    // route the same day, and no field assertion notices an arrival.
    expect(keysOf(created)).toStrictEqual(DOMAIN_KEY_SET);
    expect(created.slug).toBe(RADAR);
    expect(created.name).toBe(RADAR_NAME);
    expect(created.settings).toStrictEqual({});

    // Three members the insert never carried, all three the
    // database's. `bigserial` in `number` mode is what makes the id a
    // number here and a string off a raw driver.
    expect(typeof created.id).toBe('number');
    expect(created.featureVersion).toBeNull();
    expect(created.embeddingModel).toBeNull();

    // Both stamps come from column defaults on ONE statement, so they
    // are equal. A store supplying `updated_at` itself beside a
    // defaulted `created_at` would not answer this.
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt.toISOString())
      .toBe(created.createdAt.toISOString());

    // Read back through the natural key, which is where every wave-1
    // request naming a `:slug` enters. Compared whole, so the read
    // and the write are pinned to one projection rather than to two
    // that agree today.
    const read = present(
      await domainStore.findDomainBySlug(RADAR),
      'findDomainBySlug after the insert',
    );

    expect(read).toStrictEqual(created);
    expect(await domainStore.countDomains()).toBe(1);
  });

  it('answers the settings jsonb holds, not the ones sent', async () => {
    const created = await plantDomain(SENT_SETTINGS);

    // The VALUES survive whole — `toStrictEqual` compares members and
    // is blind to their order, which is what leaves the order below
    // as a separate claim rather than a restatement of this one.
    expect(created.settings).toStrictEqual(SENT_SETTINGS);

    // The control first: the payload really was written in an order
    // jsonb does not keep. Without this the reordering assertion is
    // equally green against a constant that was already sorted.
    expect(Object.keys(SENT_SETTINGS)).toStrictEqual(SENT_TOP_ORDER);
    expect(STORED_TOP_ORDER).not.toStrictEqual(SENT_TOP_ORDER);

    // And the ORDER did not survive, at both depths. This is the
    // reading that says the `RETURNING` list read the stored row
    // rather than echoing the argument it was handed — the one claim
    // about these stores that no in-memory implementation can be
    // made to fail, because a map cannot change what it was given.
    expect(Object.keys(created.settings)).toStrictEqual(STORED_TOP_ORDER);
    expect(Object.keys(present(
      created.settings.scoringWeights ?? null,
      'the stored scoringWeights record',
    ))).toStrictEqual(STORED_NESTED_ORDER);

    // The plain read agrees with the write's own `RETURNING`, which
    // is what says the reordering is the column's and not one
    // statement's.
    const read = present(
      await domainStore.findDomainBySlug(RADAR),
      'findDomainBySlug after the settings insert',
    );

    expect(Object.keys(read.settings)).toStrictEqual(STORED_TOP_ORDER);
    expect(read.settings).toStrictEqual(created.settings);
  });

  it('stamps updated_at on a patch and holds created_at', async () => {
    // Planted through the taxonomy helper rather than through
    // `plantDomain`, so the two category writes sit between the
    // insert and the patch. That matters because the comparison
    // below is a CLOCK comparison and a pg `timestamptz` reaches
    // JavaScript truncated to milliseconds: the intervening
    // statements are what put the two stamps further apart than the
    // resolution they are read at.
    const { domain } = await plantTaxonomy();
    const patched = present(
      await domainStore.updateDomain(domain.id, { name: RENAMED }),
      'updateDomain naming only the label',
    );

    expect(keysOf(patched)).toStrictEqual(DOMAIN_KEY_SET);
    expect(patched.id).toBe(domain.id);
    expect(patched.name).toBe(RENAMED);

    // Compared as ISO strings rather than through `String(date)`,
    // which truncates to whole SECONDS and would report a stamp that
    // moved correctly as one that never moved at all.
    expect(patched.createdAt.toISOString())
      .toBe(domain.createdAt.toISOString());
    expect(patched.updatedAt.getTime())
      .toBeGreaterThan(domain.updatedAt.getTime());

    // An absent member is not written: drizzle drops every
    // `undefined` from a `set` list before rendering it, so the
    // stored payload stands — and the empty one stored above is the
    // weaker half of that, which is why the slug is read too.
    expect(patched.slug).toBe(RADAR);
    expect(patched.settings).toStrictEqual({});
  });

  it('hangs a root and a child off the domain it was given', async () => {
    const { domain, root, child } = await plantTaxonomy();

    expect(keysOf(root)).toStrictEqual(CATEGORY_KEY_SET);
    expect(typeof root.id).toBe('number');
    expect(root.domainId).toBe(domain.id);
    expect(root.parentId).toBeNull();
    expect(child.domainId).toBe(domain.id);
    expect(child.parentId).toBe(root.id);

    // A second domain carrying the SAME root key, which is the
    // positive control on the natural key being per-domain rather
    // than global — and the fixture the scope reading below needs.
    const other = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });
    const otherRoot = await taxonomyStore.insertCategory({
      domainId: other.id,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
    });

    // Ordered by `key` ascending, so the child comes first even
    // though the root was written first — an answer in insertion
    // order is a different list, not the same one.
    expect(await taxonomyStore.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([
        { ...child, termCount: 0 },
        { ...root, termCount: 0 },
      ]);

    // And the read is scoped to the domain that was asked for. A
    // `WHERE` clause that stopped narrowing would answer three rows
    // here while every count in the case above still added up.
    expect(await taxonomyStore.listCategoriesWithTermCounts(other.id))
      .toStrictEqual([{ ...otherRoot, termCount: 0 }]);

    const read = present(
      await taxonomyStore.findCategoryById(child.id),
      'findCategoryById after the insert',
    );

    expect(read).toStrictEqual(child);
  });

  it('fills one bucket and counts the empty one at zero', async () => {
    const { domain, root, child } = await plantTaxonomy();
    const written = await taxonomyStore.upsertTerms(child.id, LEXICON);

    expect(written).toHaveLength(LEXICON.length);
    expect(await taxonomyStore.countTerms(child.id)).toBe(LEXICON.length);
    expect(await taxonomyStore.countTerms(root.id)).toBe(0);

    const listed = await taxonomyStore
      .listCategoriesWithTermCounts(domain.id);

    // THE reading the grouped left join exists for. `count(terms.id)`
    // answers 0 for the root, where the `count(*)` spelling of the
    // same statement answers 1 — a left join gives a category holding
    // nothing exactly one null-extended row — so the empty bucket is
    // the member an unwatched change inverts, and it is the one an
    // operator scans the list for.
    expect(listed).toStrictEqual([
      { ...child, termCount: LEXICON.length },
      { ...root, termCount: 0 },
    ]);
    expect(keysOf(present(listed[0] ?? null, 'the first listed row')))
      .toStrictEqual(LISTED_KEY_SET);
  });

  it('reads the terms of a category in the database order', async () => {
    const { root, child } = await plantTaxonomy();
    const single = await taxonomyStore.insertTerm({
      categoryId: child.id,
      ...REWRITTEN,
    });

    expect(keysOf(single)).toStrictEqual(TERM_KEY_SET);
    expect(typeof single.id).toBe('number');
    expect(single.categoryId).toBe(child.id);
    // `polarity` is a `text` column the port types by the union
    // `terms_polarity_check` is generated from, so a value crossing
    // back out of that union is a narrowing the store has to make
    // rather than one it may assume.
    expect(single.polarity).toBe(REWRITTEN.polarity);
    expect(single.weight).toBe(REWRITTEN.weight);
    expect(single.notes).toBe(REWRITTEN.notes);

    await taxonomyStore.deleteTerm(single.id);
    const written = await taxonomyStore.upsertTerms(child.id, LEXICON);

    // Ordered by `pattern` under the server's own collation, which is
    // neither the order the document was written in nor its reverse.
    const listed = await taxonomyStore.listTerms(child.id);

    expect(listed.map((row) => row.pattern))
      .toStrictEqual(LEXICON_PATTERNS);
    expect(listed).toStrictEqual(
      LEXICON_PATTERNS.map((pattern) => termNamed(written, pattern)),
    );

    // The window narrows the same order rather than reordering it.
    const page = await taxonomyStore
      .listTerms(child.id, { limit: 1, offset: 1 });

    expect(page.map((row) => row.pattern)).toStrictEqual(['legacy stack']);

    // Scoped to the bucket that was asked for, and an empty bucket
    // reads as an empty list rather than as the whole table.
    expect(await taxonomyStore.listTerms(root.id)).toStrictEqual([]);
  });

  it('rewrites a term in place on a second import pass', async () => {
    const { child } = await plantTaxonomy();
    const first = await taxonomyStore.upsertTerms(child.id, LEXICON);
    const before = termNamed(first, REWRITTEN.pattern);
    const untouched = termNamed(first, 'graph database');

    // The control that the rewrite has something to change: every
    // member the second pass carries differs from what is stored, so
    // an upsert that quietly did nothing is a red case rather than an
    // assertion satisfied by the value already there.
    expect(before.weight).not.toBe(REWRITTEN.weight);
    expect(before.polarity).not.toBe(REWRITTEN.polarity);
    expect(before.notes).not.toBe(REWRITTEN.notes);

    const second = await taxonomyStore.upsertTerms(child.id, [REWRITTEN]);
    const after = termNamed(second, REWRITTEN.pattern);

    // The conflict found the stored row and answered ITS id, which is
    // what lets import, export and re-import settle instead of
    // accumulating a second row that would count the same match
    // twice. A fake handing out a fresh id per write is the thing
    // this reading rules out.
    expect(after.id).toBe(before.id);
    expect(after).toStrictEqual({
      id: before.id,
      categoryId: child.id,
      ...REWRITTEN,
    });

    // The lexicon did not grow, and the rows the document did not
    // name stood exactly as they were.
    expect(await taxonomyStore.countTerms(child.id)).toBe(LEXICON.length);

    const listed = await taxonomyStore.listTerms(child.id);

    expect(listed.map((row) => row.pattern))
      .toStrictEqual(LEXICON_PATTERNS);
    expect(termNamed(listed, REWRITTEN.pattern)).toStrictEqual(after);
    expect(termNamed(listed, untouched.pattern)).toStrictEqual(untouched);
  });
});
