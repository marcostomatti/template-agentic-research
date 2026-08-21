/**
 * @packageDocumentation
 * The apply half of the seed pipeline: the pass that writes a
 * validated bundle to the database.
 *
 * Split from `./seed.ts`, which re-exports it whole, so importing
 * `applySeedBundle` from either path works. Reading a bundle and
 * writing one are separate concerns with separate failure modes — one
 * refuses a file, the other refuses a reference — and the module
 * header of each says which it owns.
 *
 * Nothing here opens a connection. Every function takes the
 * transaction or the database it writes through, which is what lets a
 * live test and the CLI each hand over one of their own.
 */
import type {
  CategorySeed,
  DomainSeed,
  PersonaSeed,
  TermSeed,
  TopicSeed,
} from './seed-schemas.js';
import type { SeedBundle } from './seed.js';
import type { Db } from '../src/db/index.js';

import { and, eq, sql } from 'drizzle-orm';

import {
  categories,
  domains,
  personas,
  terms,
  topics,
} from '../src/db/schema.js';

/**
 * The transaction every write in the apply pass runs inside, as
 * drizzle types it.
 *
 * Derived from {@link Db} rather than written out: naming the type
 * means restating `PgTransaction`'s arguments, and an annotation that
 * drifts from what `db.transaction` actually hands over is a cast
 * waiting to be added.
 */
type SeedTx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * What every refusal from the apply pass opens with, so a failure
 * raised while writing is greppable and reads apart from one
 * `SeedValidationError` raised before anything was opened.
 */
const APPLY_ERROR_PREFIX = 'seed apply:';

/**
 * How one concern's rows came out of a pass.
 *
 * Three tallies rather than a written/skipped pair, because what an
 * operator asks after a run is whether it did what the edit intended:
 * `updated: 1` beside `unchanged: 40` answers that, and one total of
 * the rows a pass touched does not.
 */
export interface SeedRowCounts {
  /** Rows inserted, the natural key naming none before the pass. */
  readonly created: number;

  /** Rows rewritten, a stored value differing from the seed's. */
  readonly updated: number;

  /** Rows left alone, every value the pass writes already stored. */
  readonly unchanged: number;
}

/**
 * What one {@link applySeedBundle} pass did, a concern at a time.
 *
 * One member per `SEED_ROSTER` entry and named the same way, so
 * a concern's file in `data/`, its rows in a {@link SeedBundle} and
 * its counts here all carry one name.
 */
export interface SeedCounts {
  readonly domains: SeedRowCounts;
  readonly personas: SeedRowCounts;
  readonly categories: SeedRowCounts;
  readonly terms: SeedRowCounts;
  readonly topics: SeedRowCounts;
}

/** What a pass did to one row. */
type SeedOutcome = 'created' | 'updated' | 'unchanged';

/**
 * One concern's outcomes, counted.
 *
 * @param outcomes - One entry per row the concern carried, in the
 * order the pass reached them.
 */
function seedRowCounts(outcomes: readonly SeedOutcome[]): SeedRowCounts {
  const total = (outcome: SeedOutcome): number => (
    outcomes.filter((member) => member === outcome).length
  );

  return {
    created: total('created'),
    updated: total('updated'),
    unchanged: total('unchanged'),
  };
}

/**
 * Whether a value is a plain JSON object rather than an array, a
 * scalar, `null`, or an instance of something.
 *
 * The prototype test is what keeps {@link sameStoredValue} honest
 * about values it was not written for. A `Date` is an object with no
 * own enumerable keys, so a comparison by key set would report any
 * two of them as the same value.
 */
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/**
 * Whether the database already holds the value this pass would write.
 *
 * Structural rather than `===`, because two of the compared columns
 * are JSONB and come back as a fresh object on every read, so
 * identity is false for a row nothing has touched. `JSON.stringify`
 * on both sides would not serve either: Postgres stores a jsonb
 * object's keys sorted by length and then bytewise rather than as
 * they were written, so a settings block round-trips with its members
 * reordered and the two strings differ where the two values do not.
 *
 * The value space is JSON's — strings, numbers, booleans, `null`,
 * arrays and plain objects — which is what these columns hold. A
 * value outside it falls through to identity and reports the row as
 * changed, so the cost of meeting one is a write nobody needed rather
 * than a change nobody made.
 *
 * @param stored - What the database came back with.
 * @param written - What this pass would write.
 */
function sameStoredValue(stored: unknown, written: unknown): boolean {
  if (Array.isArray(stored) && Array.isArray(written)) {
    return stored.length === written.length
      && stored.every((item, at) => sameStoredValue(item, written[at]));
  }

  if (isJsonRecord(stored) && isJsonRecord(written)) {
    const keys = Object.keys(stored);

    return keys.length === Object.keys(written).length
      && keys.every((key) => sameStoredValue(stored[key], written[key]));
  }

  return stored === written;
}

/** A row the database holds, as much of it as a pass reads. */
interface StoredRow {
  /** The id the database issued for it. */
  readonly id: number;

  /**
   * Every column this pass writes, as the database holds them, under
   * the member names the pass writes them under.
   */
  readonly written: unknown;
}

/**
 * What a pass does to one row, carrying the id where it does nothing.
 *
 * The id rides on the unchanged branch alone because that is the one
 * branch with no `RETURNING` to read it from, and the concerns below
 * still need it: skipping the write for an unchanged domain must not
 * leave the personas naming it with no foreign key to resolve to.
 */
type SeedRowPlan =
  | { readonly outcome: 'created' }
  | { readonly outcome: 'updated' }
  | { readonly outcome: 'unchanged'; readonly id: number };

/**
 * What writing one seed row over what the database holds would do.
 *
 * @param stored - What the natural key selected, or `undefined` when
 * it selected nothing.
 * @param written - Every value this pass would write, as one object.
 * That same object supplies the insert and the DO UPDATE set, which
 * is what stops the comparison and the write being edited apart: a
 * column written but not compared would let a genuinely changed row
 * report unchanged and skip the update it needed.
 */
function plannedRow(
  stored: StoredRow | undefined,
  written: unknown,
): SeedRowPlan {
  if (stored === undefined) {
    return { outcome: 'created' };
  }

  if (sameStoredValue(stored.written, written)) {
    return { outcome: 'unchanged', id: stored.id };
  }

  return { outcome: 'updated' };
}

/**
 * What a concern the concerns below resolve keys against came back
 * with.
 */
interface AppliedConcern {
  /** Each natural key against the id the database holds it under. */
  readonly ids: ReadonlyMap<string, number>;

  /** How this concern's own rows came out. */
  readonly counts: SeedRowCounts;
}

/**
 * The id an upsert returned.
 *
 * The empty case cannot arise as this module calls it: `ON CONFLICT
 * … DO UPDATE` writes the row whichever branch it takes, so
 * `RETURNING` yields exactly one. It is written out rather than
 * asserted away because `onConflictDoNothing` is one word from
 * `onConflictDoUpdate` and DOES return nothing on a conflict — under
 * an assertion that edit would put an `undefined` id into the next
 * concern's foreign key rather than raise anything here.
 *
 * @param rows - What the upsert's `RETURNING` came back with.
 * @param what - The row being written, for the message.
 * @throws Error When the upsert returned no row.
 */
function upsertedId(
  rows: readonly { readonly id: number }[],
  what: string,
): number {
  const [row] = rows;

  if (row === undefined) {
    throw new Error(`${APPLY_ERROR_PREFIX} upserting ${what} returned no row`);
  }

  return row.id;
}

/**
 * The id a planned row ends up under: the one already stored where
 * the pass has nothing to write, and the upsert's own otherwise.
 *
 * The two concerns other concerns resolve keys against — domains and
 * categories — need an id whichever branch a row takes, so an
 * unchanged row skipping its write must not also skip the map entry
 * a later concern's foreign key resolves through.
 *
 * @param plan - What {@link plannedRow} decided for the row.
 * @param upsert - The write to issue, deferred so an unchanged row
 * never issues it.
 * @param what - The row being written, for the message.
 */
async function plannedId(
  plan: SeedRowPlan,
  upsert: () => PromiseLike<readonly { readonly id: number }[]>,
  what: string,
): Promise<number> {
  if (plan.outcome === 'unchanged') {
    return plan.id;
  }

  return upsertedId(await upsert(), what);
}

/**
 * The id a natural key names, among the ids an earlier concern of the
 * same pass wrote.
 *
 * `loadSeedBundle` already refuses a bundle whose personas,
 * categories or topics name a domain it does not carry, or whose
 * terms name a category it does not declare, so every lookup here
 * resolves for a bundle that came from there. This covers the other
 * caller: a {@link SeedBundle} assembled by hand type checks without
 * going through that pass, and an unresolved key would otherwise
 * reach a foreign key as `undefined`.
 *
 * @param ids - Keys an earlier concern wrote, against the ids the
 * database issued for them.
 * @param key - The key to resolve.
 * @param reference - The referring row and the thing it names, read
 * ahead of the key itself.
 * @throws Error When the key names no row this bundle declares.
 */
function resolvedId(
  ids: ReadonlyMap<string, number>,
  key: string,
  reference: string,
): number {
  const id = ids.get(key);

  if (id === undefined) {
    throw new Error(
      `${APPLY_ERROR_PREFIX} ${reference} '${key}', ` +
      'which this bundle does not declare',
    );
  }

  return id;
}

/**
 * Every domain the bundle carries, upserted by `slug`.
 *
 * `updated_at` is stamped by the DO UPDATE clause and so moves only
 * on the rows this pass actually rewrites, which is what the
 * comparison ahead of the write buys the column: it goes on recording
 * when the domain last changed rather than when the seed was last
 * applied.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/domains.json` row.
 * @returns Each slug against the id the database holds that domain
 * under, which is what every concern below resolves `domainSlug`
 * against, and how these rows came out.
 */
async function applyDomains(
  tx: SeedTx,
  rows: readonly DomainSeed[],
): Promise<AppliedConcern> {
  const ids = new Map<string, number>();
  const outcomes: SeedOutcome[] = [];

  for (const row of rows) {
    const written = { name: row.name, settings: row.settings ?? {} };
    const [stored] = await tx.select({
      id: domains.id,
      written: { name: domains.name, settings: domains.settings },
    })
      .from(domains)
      .where(eq(domains.slug, row.slug));
    const plan = plannedRow(stored, written);

    outcomes.push(plan.outcome);

    ids.set(row.slug, await plannedId(
      plan,
      () => tx.insert(domains)
        .values({ slug: row.slug, ...written })
        .onConflictDoUpdate({
          target: domains.slug,
          set: { ...written, updatedAt: sql`now()` },
        })
        .returning({ id: domains.id }),
      `domain '${row.slug}'`,
    ));
  }

  return { ids, counts: seedRowCounts(outcomes) };
}

/**
 * Every persona the bundle carries, upserted by the (domain, role)
 * pair `personas_domain_id_role_unique` holds.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/personas.json` row.
 * @param domainIds - What {@link applyDomains} returned.
 */
async function applyPersonas(
  tx: SeedTx,
  rows: readonly PersonaSeed[],
  domainIds: ReadonlyMap<string, number>,
): Promise<SeedRowCounts> {
  const outcomes: SeedOutcome[] = [];

  for (const row of rows) {
    const domainId = resolvedId(
      domainIds,
      row.domainSlug,
      `persona '${row.role}' names domain`,
    );
    const written = { systemText: row.systemText };
    const [stored] = await tx.select({
      id: personas.id,
      written: { systemText: personas.systemText },
    })
      .from(personas)
      .where(and(
        eq(personas.domainId, domainId),
        eq(personas.role, row.role),
      ));
    const plan = plannedRow(stored, written);

    outcomes.push(plan.outcome);

    if (plan.outcome === 'unchanged') {
      continue;
    }

    await tx.insert(personas)
      .values({ domainId, role: row.role, ...written })
      .onConflictDoUpdate({
        target: [personas.domainId, personas.role],
        set: written,
      });
  }

  return seedRowCounts(outcomes);
}

/**
 * The id a category's `parentKey` names, or `null` for a root.
 *
 * Resolved against the ROOTS of this bundle alone, which is what
 * makes the refusal say something true: nesting is capped at one
 * level by the trigger on `categories`, so the only row a parent key
 * can legitimately name is a root, and a key naming a child would
 * otherwise be reported as absent from a bundle that declares it.
 *
 * @param rootIds - The keys of every root category this pass reached,
 * against their ids — written this pass or already stored, since an
 * unchanged root still resolves.
 * @param row - The category whose parent is being resolved.
 * @throws Error When the row names a parent that is no root of this
 * bundle's taxonomy.
 */
function resolveParentId(
  rootIds: ReadonlyMap<string, number>,
  row: CategorySeed,
): number | null {
  if (row.parentKey === null) {
    return null;
  }

  const parentId = rootIds.get(row.parentKey);

  if (parentId === undefined) {
    throw new Error(
      `${APPLY_ERROR_PREFIX} category '${row.key}' names parent ` +
      `'${row.parentKey}', which is no root of this bundle's taxonomy`,
    );
  }

  return parentId;
}

/**
 * Every category the bundle carries, upserted by the (domain, key)
 * pair `categories_domain_id_key_unique` holds.
 *
 * Roots are written before the rows naming one, because a parent has
 * to exist as a row before a child can point at it. That ordering is
 * not the depth cap and does not stand in for it: a category naming a
 * child rather than a root is refused here for naming no root, and a
 * row that reached the database another way is refused by the
 * trigger, which is where the rule lives.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/categories.json` row.
 * @param domainIds - What {@link applyDomains} returned.
 * @returns Each category key against its id — roots and children
 * together, since a term names either — and how these rows came out.
 */
async function applyCategories(
  tx: SeedTx,
  rows: readonly CategorySeed[],
  domainIds: ReadonlyMap<string, number>,
): Promise<AppliedConcern> {
  const ids = new Map<string, number>();
  const rootIds = new Map<string, number>();
  const outcomes: SeedOutcome[] = [];
  const roots = rows.filter((row) => row.parentKey === null);
  const children = rows.filter((row) => row.parentKey !== null);

  for (const row of [...roots, ...children]) {
    const domainId = resolvedId(
      domainIds,
      row.domainSlug,
      `category '${row.key}' names domain`,
    );
    const parentId = resolveParentId(rootIds, row);
    const written = { name: row.name, parentId };
    const [stored] = await tx.select({
      id: categories.id,
      written: { name: categories.name, parentId: categories.parentId },
    })
      .from(categories)
      .where(and(
        eq(categories.domainId, domainId),
        eq(categories.key, row.key),
      ));
    const plan = plannedRow(stored, written);

    outcomes.push(plan.outcome);

    const id = await plannedId(
      plan,
      () => tx.insert(categories)
        .values({ domainId, key: row.key, ...written })
        .onConflictDoUpdate({
          target: [categories.domainId, categories.key],
          set: written,
        })
        .returning({ id: categories.id }),
      `category '${row.key}'`,
    );

    ids.set(row.key, id);

    if (parentId === null) {
      rootIds.set(row.key, id);
    }
  }

  return { ids, counts: seedRowCounts(outcomes) };
}

/**
 * Every term the bundle carries, upserted by the (category, pattern)
 * pair `terms_category_id_pattern_unique` holds.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/terms.json` row.
 * @param categoryIds - What {@link applyCategories} returned.
 */
async function applyTerms(
  tx: SeedTx,
  rows: readonly TermSeed[],
  categoryIds: ReadonlyMap<string, number>,
): Promise<SeedRowCounts> {
  const outcomes: SeedOutcome[] = [];

  for (const row of rows) {
    const categoryId = resolvedId(
      categoryIds,
      row.categoryKey,
      `term '${row.pattern}' names category`,
    );
    const written = {
      weight: row.weight,
      polarity: row.polarity,
      notes: row.notes,
    };
    const [stored] = await tx.select({
      id: terms.id,
      written: {
        weight: terms.weight,
        polarity: terms.polarity,
        notes: terms.notes,
      },
    })
      .from(terms)
      .where(and(
        eq(terms.categoryId, categoryId),
        eq(terms.pattern, row.pattern),
      ));
    const plan = plannedRow(stored, written);

    outcomes.push(plan.outcome);

    if (plan.outcome === 'unchanged') {
      continue;
    }

    await tx.insert(terms)
      .values({ categoryId, pattern: row.pattern, ...written })
      .onConflictDoUpdate({
        target: [terms.categoryId, terms.pattern],
        set: written,
      });
  }

  return seedRowCounts(outcomes);
}

/**
 * Every topic the bundle carries, upserted by the (domain, name) pair
 * `topics_domain_id_name_unique` holds.
 *
 * The same object supplies the compared values, the inserted values
 * and the DO UPDATE set, so what a first pass writes, what a second
 * rewrites and what either holds a stored row against cannot be
 * edited apart. `next_run_at` and `enabled` are in none of the three:
 * they are the dispatcher's and the operator's, and
 * `data/topics.json`'s header states the consequence a seeded topic
 * then has — configured and not yet due.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/topics.json` row.
 * @param domainIds - What {@link applyDomains} returned.
 */
async function applyTopics(
  tx: SeedTx,
  rows: readonly TopicSeed[],
  domainIds: ReadonlyMap<string, number>,
): Promise<SeedRowCounts> {
  const outcomes: SeedOutcome[] = [];

  for (const row of rows) {
    const domainId = resolvedId(
      domainIds,
      row.domainSlug,
      `topic '${row.name}' names domain`,
    );
    const written = {
      searchTerms: row.searchTerms ?? [],
      intervalSeconds: row.intervalSeconds,
      minIntervalSeconds: row.minIntervalSeconds,
      maxIntervalSeconds: row.maxIntervalSeconds,
    };
    const [stored] = await tx.select({
      id: topics.id,
      written: {
        searchTerms: topics.searchTerms,
        intervalSeconds: topics.intervalSeconds,
        minIntervalSeconds: topics.minIntervalSeconds,
        maxIntervalSeconds: topics.maxIntervalSeconds,
      },
    })
      .from(topics)
      .where(and(
        eq(topics.domainId, domainId),
        eq(topics.name, row.name),
      ));
    const plan = plannedRow(stored, written);

    outcomes.push(plan.outcome);

    if (plan.outcome === 'unchanged') {
      continue;
    }

    await tx.insert(topics)
      .values({ domainId, name: row.name, ...written })
      .onConflictDoUpdate({
        target: [topics.domainId, topics.name],
        set: written,
      });
  }

  return seedRowCounts(outcomes);
}

/**
 * Every row the bundle carries, written to the database.
 *
 * One pass is an upsert per row keyed on that concern's natural key —
 * a domain by `slug`, a persona by (domain, role), a category by
 * (domain, key), a term by (category, pattern), a topic by (domain,
 * name) — so a second pass over the same files leaves the same rows
 * rather than a second set beside the first. Those keys are the only
 * ones a seed can spell, an id being the database's to issue, and
 * they are also the only ones it would be safe to key on: a delete
 * and re-insert would reissue every id and take the findings,
 * criteria and research citing the old ones with it.
 *
 * The order is the one the foreign keys force. Domains first, since
 * everything else names one; categories before terms, since a term
 * hangs off a category id; and roots before the categories naming
 * one, for the reason {@link applyCategories} records.
 *
 * The whole pass is one transaction. A refusal partway through — the
 * depth trigger, a foreign key, a reference the bundle does not carry
 * — rolls back the concerns already written rather than leaving them,
 * so a broken bundle is an edit and another run rather than an edit
 * and a reconciliation. What that does not buy is exclusion: the
 * locks are taken row by row as the pass reaches them, so two passes
 * at once serialize per row and either may end up the last writer of
 * any given one, while neither leaves a half-applied bundle.
 *
 * Each DO UPDATE clause writes what the seed file states and nothing
 * beside it. `next_run_at` and `enabled` on a topic are absent, and
 * so are `feature_version` and `embedding_model` on a domain, so a
 * pass neither re-enables a topic somebody switched off nor clears a
 * pin the feature port (phase 4) wrote. A member the schema makes
 * optional because the column's default means the same as absence —
 * `settings` and `searchTerms` — is written as that default rather
 * than left out of the update, so the file states the whole row and a
 * settings block deleted from `domains.json` is deleted from the
 * database by the next pass rather than surviving it.
 *
 * Every row is read before it is written. What the natural key
 * selects is held against the values the pass would write, and a row
 * already carrying all of them is counted unchanged and left where it
 * is rather than rewritten with what it holds. That is what makes the
 * returned counts worth reading: a summary reporting every row as
 * updated on every pass reports only that the pass ran.
 *
 * Four limits. The pass adds and rewrites and never deletes, so a
 * term dropped from `terms.json` stays: a row removed from a seed and
 * a row somebody added through another path are indistinguishable
 * from here. The read and the write are two statements, so a row
 * another writer inserts between them is absorbed by the DO UPDATE
 * clause and counted created though it updated — the row is right and
 * the tally is one out. An unchanged row is unchanged in the columns
 * this pass writes and says nothing about the others, so a topic
 * whose `next_run_at` has moved is unchanged here. And a term names
 * its category by `key` alone, half of that table's (domain, key)
 * natural key, so two domains reusing one key would collapse onto
 * whichever was written last — `data/terms.json`'s header records
 * that as belonging to whoever adds the second domain.
 *
 * @param db - An open database. The caller owns it: nothing here
 * opens or closes a connection, which is what lets a live test and
 * the CLI arriving later in this stage each hand over one of their
 * own.
 * @param bundle - Every concern's rows, as `loadSeedBundle`
 * returns them.
 * @returns How each concern's rows came out — created, updated and
 * unchanged, counted a concern at a time.
 * @throws Error When a reference resolves to no row. A bundle from
 * `loadSeedBundle` has had every `domainSlug` and `categoryKey`
 * resolved already; `parentKey` is resolved here for the first time.
 */
export async function applySeedBundle(
  db: Db,
  bundle: SeedBundle,
): Promise<SeedCounts> {
  return db.transaction(async (tx) => {
    const appliedDomains = await applyDomains(tx, bundle.domains);
    const personas = await applyPersonas(
      tx,
      bundle.personas,
      appliedDomains.ids,
    );
    const appliedCategories = await applyCategories(
      tx,
      bundle.categories,
      appliedDomains.ids,
    );
    const terms = await applyTerms(tx, bundle.terms, appliedCategories.ids);
    const topics = await applyTopics(tx, bundle.topics, appliedDomains.ids);

    return {
      domains: appliedDomains.counts,
      personas,
      categories: appliedCategories.counts,
      terms,
      topics,
    };
  });
}
