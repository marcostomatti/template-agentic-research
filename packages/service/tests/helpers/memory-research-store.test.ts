/**
 * `tests/helpers/memory-research-store.ts` in both the ports it
 * implements — the claims that make it a second implementation of
 * `DomainStore` and of `TaxonomyStore` WHOLE, categories and terms
 * together, rather than a bag that stores what it is handed.
 *
 * THAT IT REFUSES WHAT POSTGRES REFUSES. Every refusal case names
 * the `reason` a SQLSTATE classifies to and the constraint the
 * mechanism gave, not merely that something was thrown: a refusal
 * naming nothing would be indistinguishable from a bug in the fake,
 * and the services above switch on `reason`. Five mechanisms are
 * reachable across nine writes — `domains_slug_unique`,
 * `categories_domain_id_key_unique` and
 * `terms_category_id_pattern_unique` as unique violations, the
 * three branches of the depth trigger as one `check-violation`
 * naming NOTHING (a `RAISE ... USING ERRCODE` sets no constraint),
 * `categories_parent_id_categories_id_fk` under both of the
 * refusals that share its name, and
 * `terms_category_id_categories_id_fk` under the one that does not.
 *
 * THAT IT REFUSES THEM IN THE MEASURED ORDER. Four cases exist only
 * for that, because a request carrying two faults at once is the
 * only thing that can see any of it. On `categories`: a duplicate
 * key beside a parent that is itself a child answers the DEPTH
 * refusal, and a duplicate key beside a parent naming no row
 * answers the KEY — the BEFORE trigger runs while the row is still
 * being formed, and the foreign key is checked after the unique
 * index. On `terms`: a document repeating a pattern beside a
 * category that does not exist answers the REPEAT, and an empty
 * document into that same missing category is not refused at all,
 * because no statement runs for it. Every one was measured against
 * the live Postgres. It is the half a fake gets wrong by writing
 * its checks in the order they read well.
 *
 * THE TERM HALF ADDS NO ORDER OF ITS OWN, and saying so is part of
 * the claim rather than a gap in it. Its key and its foreign key
 * are both about `category_id`, so a write naming a category that
 * does not exist cannot also duplicate a pattern inside it — there
 * is nothing stored there to duplicate — and no case can tell which
 * is asked first.
 *
 * THAT ITS IDS COME FROM 1 AND ARE NOT GAPLESS. A refused insert
 * burns an id here because it burns one in Postgres, measured on a
 * `bigserial` carrying a UNIQUE key against the live server: insert
 * `a`, have a second `a` refused, insert `b`, and `b` holds id 3.
 * The same holds on `categories` for a DEPTH refusal as well as a
 * key one, and on `terms` for a duplicate pattern, both measured
 * there too. The case a reader would not predict is the UPSERT: a
 * two-row batch moved the sequence by two while inserting one row
 * and rewriting one, so a conflicting row takes an id and leaves it
 * unused. The cases pin all of it, so a later case cannot come to
 * depend on a gaplessness only the fake has.
 *
 * THAT AN UPSERT REWRITES THREE COLUMNS AND KEEPS THE STORED ROW'S
 * ID. Measured: the statement answered the STORED id with `weight`,
 * `polarity` and `notes` rewritten from the submitted row. Both
 * halves are cases of their own, because a term keeping its id
 * across a re-import is what lets import, export and re-import
 * settle rather than accumulate a second row counting the same
 * match twice — and a store writing a fresh row would pass every
 * assertion about the three columns.
 *
 * THAT ONE FAULT IS DELIBERATELY NOT A `StoreRefusal`. A document
 * repeating a pattern is SQLSTATE 21000, `classifyPgError` does not
 * recognise it, and `src/taxonomy/store.ts` states the no-repeat
 * rule as a PRECONDITION its caller checks — so the store throws a
 * plain `Error`, which reaches a route as a 500 exactly as a
 * deployment would. Those cases go through `plainErrorFrom` rather
 * than `refusalFrom`, and it throws when what arrived WAS a
 * refusal: a `StoreRefusal` would satisfy any assertion about a
 * thrown error, and offering a caller a tidy status the database
 * never gave is the failure being ruled out.
 *
 * THAT NOTHING MUTABLE IS SHARED ACROSS THE BOUNDARY. Every `Date`,
 * every `settings` payload and every category and term row is
 * copied in both directions, so a caller cannot write into stored
 * state through a field the port declares `readonly`. Each of those
 * cases MUTATES what it was handed and reads the row back, and each
 * compares against a CONSTANT or a primitive captured beforehand
 * rather than against the record an earlier write answered: a store
 * handing out its own objects has aliased the two, and the
 * comparison then holds one lie against itself and passes. Measured
 * — two of the four term copy cases were green under the leg until
 * their expectations stopped naming the seeded record.
 *
 * THAT A DOMAIN DELETE IS NOT REFUSED BY THE GUARD THAT REFUSES A
 * CATEGORY DELETE. `categories.parent_id` is `NO ACTION`, so
 * removing a category that still holds children is refused — and
 * the domain cascade, which removes a parent and its children in
 * one statement, is not. The two sit in adjacent describes because
 * a fake that reused one for the other would look right in every
 * case that has only one level of taxonomy.
 *
 * THAT THE CASCADE REACHES TWO LEVELS DOWN AND REFUSES NOTHING.
 * `terms.category_id` is `ON DELETE CASCADE`, so a category delete
 * takes its terms and a domain delete takes its categories AND
 * theirs — measured, both left zero rows behind. Holding terms is
 * therefore no reason to refuse a category delete, which is a case
 * of its own: only CHILDREN refuse it, and a store reusing that
 * guard over its terms refuses a delete Postgres takes.
 *
 * Several cases carry a positive control in the same body rather
 * than in a sibling case, because each is asking a question a broken
 * store answers the same way by accident: a store refusing every
 * write passes a refusal assertion, and a store refusing nothing
 * passes an acceptance one. So the duplicate-key cases insert a
 * second row under a different key, the depth cases repeat the same
 * write from a position the rule allows, the delete-refused case
 * removes the childless row with the very same call, and the term
 * foreign-key case writes the same row into a category that exists.
 * The three containment readings over a serialised error count
 * occurrences rather than asserting absence, with the same count
 * taken over a planted message: a search that would find nothing
 * anywhere reports a clean refusal and a leaking one alike.
 *
 * MUTATION GRID, RE-DERIVED over the 125 cases here across 52 legs
 * with `--reporter=json`, and read as the SET each leg reddened
 * rather than as a count. Every figure moves when the personas or
 * settings half adds its cases to this file, exactly as the term
 * half moved three of the figures the category half had written
 * here.
 *
 * The nine domains legs are unchanged by the term half as they were
 * by the category half — 4, 6 and seven ones, over the same sets —
 * which is itself the reading: the halves' red sets are disjoint.
 * Answering the stored domain object reddens 4 (three date cases
 * and the settings case that writes through what it was answered,
 * because one helper copies both). Accepting the duplicate slug
 * reddens 6, five of them `refusalFrom` throwing because the call
 * ANSWERED rather than an assertion failing. The other seven redden
 * one case apiece: stamping the clock's own object, storing the
 * payload it was handed, taking the id after the key check, merging
 * `settings` on a patch, listing in insertion order, leaving a
 * deleted domain's counts standing, and answering those counts by
 * reference.
 *
 * Eighteen category legs redden between 0 and 86, and THREE moved
 * when the term half landed — each because a term case reaches a
 * category rule, which is what one dataset behind two ports means.
 * Accepting the delete of a category holding children went 4 to 5,
 * running the children guard inside the domain cascade 3 to 4, and
 * making the category key unique across domains 2 to 5. The rest
 * stand: the duplicate `(domain_id, key)` reddens 6, one of them in
 * another describe; the three depth branches 4, 2 and 2, which is
 * the shape to expect since only one is reachable from a patch;
 * refusing nothing for a parent that names no row 2; conflating an
 * absent and a null `parentId` 2; and the two ordering legs one
 * case EACH and different cases, a pair pinning a three-step order
 * no single case can. Taking the category id after the checks,
 * ordering by insertion, answering the stored category by reference
 * and handing the stored object out of the list redden one apiece —
 * the last two DISJOINT, because the list builds a fresh object
 * with its own spread whatever the copy helper does. Dropping the
 * depth guard's early return on a null parent reddens 1, and
 * refusing a null parent as though it named a missing row reddens
 * 86 of the 125: the category half's whole-half control.
 *
 * Twenty-five term legs redden between 0 and 55. Refusing every
 * term insert as a duplicate is this half's whole-half control and
 * reddens 55 of the 59 term cases, the four survivors being exactly
 * the reads that write no term at all (an unknown category, an
 * unknown term, a patch and a delete naming neither). Making the
 * key global rather than per category reddens 9 across five
 * describes, which is the widening leg the sibling-category
 * acceptance case exists for. Accepting the duplicate pattern
 * reddens 5, and ALL FIVE are `refusalFrom` throwing rather than an
 * assertion failing — including the id-burn case, which would have
 * read the wrong id and passed for nobody's reason.
 *
 * The upsert carries six legs and they are not independent.
 * Leaving a conflicting row as it stands reddens 3 and writing a
 * second row rather than conflicting reddens 4, OVERLAPPING in 2:
 * two different faults on one path, and only the assertion that
 * fails inside each case tells them apart. Burning an id only for
 * the rows it inserts reddens 1. Applying the last of a repeated
 * pattern reddens 4, the whole repeat describe. The two ordering
 * legs redden 1 and 2 — asking the category before the repeat, and
 * checking the category above the empty-document return — and they
 * are what the port's precondition rests on.
 *
 * The cascade legs are DISJOINT rather than nested: leaving a
 * category's terms behind reddens 1 and leaving the domain
 * cascade's behind reddens 2, because reaching two levels down is a
 * separate claim from reaching one. Refusing a category delete over
 * its terms — a widening leg — reddens 5, four in the cascade
 * describe and the fifth the term-delete control, which is that
 * control earning its place.
 *
 * The three list legs nest differently in each direction. Ignoring
 * the window reddens 2 and reading one row where no window was
 * given reddens 5, and the two sets are DISJOINT: the windowed
 * claims and the whole-category claim are pinned by different
 * cases. Ordering by insertion reddens 4, a strict SUBSET of that
 * 5, so the two read as one leg unless the sets are compared.
 * Answering an uncounted zero from the category list reddens
 * exactly the 3 count cases.
 *
 * Answering the stored term by reference reddens 4 — every read
 * path — and handing the stored object out of the list reddens 1,
 * NESTED inside it rather than disjoint. That is the opposite of
 * the category pair above and has a reason: `listTerms` maps
 * through the copy helper, while `listCategoriesWithTermCounts`
 * builds a fresh object with its own spread.
 *
 * The remaining term legs redden one or two: taking the id after
 * the key check, skipping the foreign key on an insert, skipping it
 * on a patch, conflating an absent and a null `notes`, and skipping
 * the resulting-pair check (2 — the rename and the bucket move).
 * Refusing a term in conflict with ITSELF is a widening leg and
 * reddens 4: three ordinary patch cases plus the one named for it,
 * which is what says the patch cases exercise the rule rather than
 * passing over it. And writing on a term patch that names no member
 * reddens NOTHING, exactly as the category leg does and for the
 * same reason: the early return exists because drizzle throws on an
 * empty update list, and this store has no such throw to observe.
 * Both zeros are honest rather than holes, and both are pinned by
 * the port's TSDoc and by the drizzle half's own cases instead.
 */
import type { MemoryResearchStore } from './memory-research-store.js';
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type {
  DomainRecord,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type {
  CategoryRecord,
  TermRecord,
  TermValues,
} from '../../src/taxonomy/store.js';

import { describe, expect, it } from 'vitest';

import { StoreRefusal } from '../../src/db/store-errors.js';

import { createMemoryResearchStore } from './memory-research-store.js';

/** The seeded worked example's slug, and this file's first domain. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A window wide enough to read every row any case here writes. */
const WHOLE_COLLECTION = { limit: 50, offset: 0 };

/** Three taxonomy keys, in the same neutral register as the slugs. */
const PLATFORMS = 'platforms';
const RUNTIMES = 'runtimes';
const TOOLING = 'tooling';

/**
 * A fresh insert payload.
 *
 * A function rather than a constant: several cases WRITE into the
 * settings they submitted, which is the whole point of them, and a
 * shared fixture would carry that write into every case after it.
 *
 * @param slug - The natural key to insert under.
 * @param settings - The payload, empty by default.
 * @returns A complete {@link InsertDomainInput}.
 */
function domainInput(
  slug: string,
  settings: DomainSettings = {},
): InsertDomainInput {
  return { slug, name: `Domain ${slug}`, settings };
}

/**
 * Inserts a category, defaulting the members a case is not about.
 *
 * @param store - The store to write to.
 * @param domainId - The domain the category belongs to.
 * @param key - Its natural key, within that domain.
 * @param parentId - The root to sit under, null for a root. Required
 *   on the port and defaulted here, so a case naming no parent is
 *   visibly asking for a root rather than leaving it to a column.
 * @returns The stored row.
 */
async function addCategory(
  store: MemoryResearchStore,
  domainId: number,
  key: string,
  parentId: number | null = null,
): Promise<CategoryRecord> {
  return store.insertCategory({
    domainId,
    key,
    name: `Category ${key}`,
    parentId,
  });
}

/**
 * A domain carrying a root with one child under it.
 *
 * The state three of the five category refusals need before they can
 * be reached at all: a parent that is itself a child, a parent given
 * to a row that already has children, and a delete refused for
 * holding them.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build the taxonomy under.
 * @returns The domain, its root, and the child under that root.
 */
async function seedOneLevel(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  root: CategoryRecord;
  child: CategoryRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));
  const root = await addCategory(store, domain.id, PLATFORMS);
  const child = await addCategory(store, domain.id, TOOLING, root.id);

  return { domain, root, child };
}

/**
 * Reads a category that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readCategory(
  store: MemoryResearchStore,
  id: number,
): Promise<CategoryRecord> {
  const row = await store.findCategoryById(id);

  if (row === null) {
    throw new Error(`expected a stored category under ${id}`);
  }

  return row;
}

/**
 * Reads a domain that must be there.
 *
 * @param store - The store to read.
 * @param slug - The key to read under.
 * @returns The row.
 * @throws When no row carries the slug, rather than letting a null
 *   reach an assertion that would then be comparing two absences.
 */
async function readDomain(
  store: MemoryResearchStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new Error(`expected a stored domain under ${slug}`);
  }

  return row;
}

/**
 * Runs a call that must be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The {@link StoreRefusal} it raised.
 * @throws When the call ANSWERED, so a case whose write quietly
 *   started succeeding fails here rather than asserting over an
 *   error that was never built. Anything else thrown is rethrown
 *   unchanged: a bug in the fake is not a refusal.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<StoreRefusal> {
  try {
    await run();
  } catch (err) {
    if (err instanceof StoreRefusal) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a StoreRefusal, and the call answered');
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken by
 *   the same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Four term patterns, in the same register as the taxonomy keys. */
const KUBERNETES = 'kubernetes';
const SERVICE_MESH = 'service mesh';
const WEBASSEMBLY = 'webassembly';
const EDGE = 'edge compute';

/** What {@link addTerm} defaults when a case is not about it. */
type TermDefaults = Partial<Omit<TermValues, 'pattern'>>;

/**
 * Inserts a term, defaulting the members a case is not about.
 *
 * @param store - The store to write to.
 * @param categoryId - The bucket it lands in.
 * @param pattern - What it looks for, within that bucket.
 * @param values - The three members a case may care about. `notes`
 *   defaults to null rather than to a string, because null is what a
 *   row with nothing recorded carries and a default note would make
 *   every case that clears one start from the wrong state.
 * @returns The stored row.
 */
async function addTerm(
  store: MemoryResearchStore,
  categoryId: number,
  pattern: string,
  values: TermDefaults = {},
): Promise<TermRecord> {
  return store.insertTerm({
    categoryId,
    pattern,
    weight: values.weight ?? 1,
    polarity: values.polarity ?? 'positive',
    notes: values.notes ?? null,
  });
}

/**
 * A domain carrying two roots, one holding two terms and one holding
 * a third.
 *
 * The state every claim about a term COLLECTION needs: an order to
 * read, a count that is not the same on both buckets, and a second
 * bucket for a cascade to leave standing.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build the lexicon under.
 * @returns The domain, its two roots, and the three terms.
 */
async function seedLexicon(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  platforms: CategoryRecord;
  runtimes: CategoryRecord;
  mesh: TermRecord;
  kube: TermRecord;
  wasm: TermRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));
  const platforms = await addCategory(store, domain.id, PLATFORMS);
  const runtimes = await addCategory(store, domain.id, RUNTIMES);

  // Inserted out of pattern order, so every read-order claim below
  // is a claim about the sort rather than about insertion.
  const mesh = await addTerm(store, platforms.id, SERVICE_MESH, { weight: 5 });
  const kube = await addTerm(store, platforms.id, KUBERNETES, { weight: 3 });
  const wasm = await addTerm(store, runtimes.id, WEBASSEMBLY, {
    polarity: 'negative',
    notes: 'a runtime rather than a platform',
  });

  return { domain, platforms, runtimes, mesh, kube, wasm };
}

/**
 * Reads a term that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readTerm(
  store: MemoryResearchStore,
  id: number,
): Promise<TermRecord> {
  const row = await store.findTermById(id);

  if (row === null) {
    throw new Error(`expected a stored term under ${id}`);
  }

  return row;
}

/**
 * Runs a call that must throw something that is NOT a
 * {@link StoreRefusal}, and hands the error back.
 *
 * The counterpart of {@link refusalFrom} for the one fault this
 * store deliberately does not translate: a document repeating a
 * pattern is SQLSTATE 21000, `classifyPgError` does not recognise
 * it, and a `StoreRefusal` here would be offering a caller a tidy
 * status the database never gave.
 *
 * @param run - The call.
 * @returns The error it raised.
 * @throws When the call ANSWERED, and when what it raised WAS a
 *   `StoreRefusal` — the second being the whole point, since a
 *   refusal would satisfy any assertion about a thrown error.
 */
async function plainErrorFrom(run: () => Promise<unknown>): Promise<Error> {
  try {
    await run();
  } catch (err) {
    if (err instanceof StoreRefusal) {
      throw new Error(
        'expected a plain Error, and a StoreRefusal arrived',
        { cause: err },
      );
    }

    if (err instanceof Error) {
      return err;
    }

    throw err;
  }

  throw new Error('expected an Error, and the call answered');
}

// ---------------------------------------------------------------------------
// The one key this half can refuse on
// ---------------------------------------------------------------------------

describe('the domains_slug_unique key', () => {
  it('refuses a second domain on a slug one already holds', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await store.insertDomain(domainInput(TRANSIT));

    expect(accepted.slug).toBe(TRANSIT);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('domains_slug_unique');
  });

  it('carries only the two names this repository chose', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );

    // `message`, `stack` and `cause` are non-enumerable on an
    // `Error`, so these are the fields a logger walking the object
    // writes — and a submitted value arriving on one of them would
    // be a red case rather than a new line on the wire.
    expect(Object.keys(refusal).sort()).toStrictEqual([
      'constraint',
      'name',
      'reason',
    ]);
  });

  it('puts the refused slug in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, RADAR)).toBe(0);

    // The same search over a message that DOES carry the slug, so
    // the zero above is a reading rather than a search that finds
    // nothing anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${RADAR}`,
    });

    expect(countOccurrences(planted, RADAR)).toBe(1);
  });

  it('leaves the standing row exactly as it was', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));
    await refusalFrom(() => store.insertDomain({
      slug: RADAR,
      name: 'Rewritten by a refused insert',
      settings: { findingsDisplayName: 'Signal' },
    }));

    const stored = await readDomain(store, RADAR);

    expect(await store.countDomains()).toBe(1);
    expect(stored.name).toBe(`Domain ${RADAR}`);
    expect(stored.settings).toStrictEqual({});
  });

  it('frees the slug when the domain holding it is deleted', async () => {
    const store = createMemoryResearchStore();
    const first = await store.insertDomain(domainInput(RADAR));

    expect(await store.deleteDomain(first.id)).toBe(true);

    const second = await store.insertDomain(domainInput(RADAR));

    expect(second.slug).toBe(RADAR);
    expect(await store.countDomains()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The ids, and the gap a refusal leaves in them
// ---------------------------------------------------------------------------

describe('the id sequence', () => {
  it('hands the first domain id 1', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    expect(inserted.id).toBe(1);
  });

  it('hands each domain the next id', async () => {
    const store = createMemoryResearchStore();
    const ids: number[] = [];

    for (const slug of [RADAR, TRANSIT, 'example-coastal-weather']) {
      const inserted = await store.insertDomain(domainInput(slug));

      ids.push(inserted.id);
    }

    expect(ids).toStrictEqual([1, 2, 3]);
  });

  it('does not reuse the id of a deleted domain', async () => {
    const store = createMemoryResearchStore();
    const first = await store.insertDomain(domainInput(RADAR));

    await store.deleteDomain(first.id);

    const second = await store.insertDomain(domainInput(TRANSIT));

    expect(second.id).toBe(2);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));
    await refusalFrom(() => store.insertDomain(domainInput(RADAR)));

    const third = await store.insertDomain(domainInput(TRANSIT));

    // 3 rather than 2, measured against the live Postgres on a
    // `bigserial` carrying a UNIQUE key: the sequence is read while
    // the row is formed, the index refuses the row afterwards, and a
    // sequence does not roll back.
    expect(third.id).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// What a caller can and cannot write into
// ---------------------------------------------------------------------------

describe('the dates crossing the boundary', () => {
  it('answers stamps a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));
    const stampedAt = inserted.createdAt.getTime();

    inserted.createdAt.setTime(0);
    inserted.updatedAt.setTime(0);

    const stored = await readDomain(store, RADAR);

    expect(stored.createdAt.getTime()).toBe(stampedAt);
    expect(stored.updatedAt.getTime()).toBe(stampedAt);
  });

  it('answers stamps the list read cannot be written through', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const [listed] = await store.listDomains(WHOLE_COLLECTION);

    if (listed === undefined) {
      throw new Error('expected one row in the window');
    }

    const stampedAt = listed.createdAt.getTime();

    listed.createdAt.setTime(0);

    const stored = await readDomain(store, RADAR);

    expect(stored.createdAt.getTime()).toBe(stampedAt);
  });

  it('answers a fresh pair of dates on every read', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const first = await readDomain(store, RADAR);
    const second = await readDomain(store, RADAR);

    expect(first.createdAt).not.toBe(second.createdAt);
    expect(first.createdAt.getTime()).toBe(second.createdAt.getTime());
  });

  it('does not read the clock object itself into a row', async () => {
    // `() => FIXED` is how a fixed clock gets written, and a store
    // that stamped the object it was handed would let this later
    // write move every row it had already stamped.
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => fixed });

    await store.insertDomain(domainInput(RADAR));

    fixed.setTime(Date.parse('2030-06-01T00:00:00.000Z'));

    const stored = await readDomain(store, RADAR);

    expect(stored.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('moves updatedAt on a patch and leaves createdAt standing', async () => {
    let clockMs = Date.parse('2026-01-01T00:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => new Date(clockMs) });
    const inserted = await store.insertDomain(domainInput(RADAR));

    clockMs += 60_000;

    const patched = await store.updateDomain(inserted.id, {});

    expect(patched?.createdAt.getTime()).toBe(inserted.createdAt.getTime());
    expect(patched?.updatedAt.getTime()).toBe(clockMs);
  });
});

describe('the settings payload crossing the boundary', () => {
  it('does not store the object it was handed', async () => {
    const store = createMemoryResearchStore();
    const submitted: DomainSettings = { scoringWeights: { novelty: 1 } };

    await store.insertDomain(domainInput(RADAR, submitted));

    // A cast, because the port declares the payload deeply
    // `readonly` — which is exactly the promise a shared reference
    // would break behind the type system's back.
    (submitted.scoringWeights as Record<string, number>).novelty = 99;

    const stored = await readDomain(store, RADAR);

    expect(stored.settings).toStrictEqual({ scoringWeights: { novelty: 1 } });
  });

  it('does not answer the object it stores', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(
      domainInput(RADAR, { scoringWeights: { novelty: 1 } }),
    );

    (inserted.settings.scoringWeights as Record<string, number>).novelty = 99;

    const stored = await readDomain(store, RADAR);

    expect(stored.settings).toStrictEqual({ scoringWeights: { novelty: 1 } });
  });

  it('replaces the payload whole rather than merging into it', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR, {
      findingsDisplayName: 'Signal',
      scoringWeights: { novelty: 1 },
    }));

    await store.updateDomain(inserted.id, {
      settings: { scoringWeights: { recency: 2 } },
    });

    const stored = await readDomain(store, RADAR);

    expect(stored.settings).toStrictEqual({ scoringWeights: { recency: 2 } });
  });

  it('leaves the payload standing when a patch omits it', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(
      domainInput(RADAR, { findingsDisplayName: 'Signal' }),
    );

    await store.updateDomain(inserted.id, { name: 'Renamed' });

    const stored = await readDomain(store, RADAR);

    expect(stored.name).toBe('Renamed');
    expect(stored.settings).toStrictEqual({ findingsDisplayName: 'Signal' });
  });
});

// ---------------------------------------------------------------------------
// The list, which is a window over an order
// ---------------------------------------------------------------------------

describe('the list read', () => {
  it('orders by slug ascending rather than by insertion', async () => {
    const store = createMemoryResearchStore();

    for (const slug of [TRANSIT, RADAR, 'example-coastal-weather']) {
      await store.insertDomain(domainInput(slug));
    }

    const listed = await store.listDomains(WHOLE_COLLECTION);

    expect(listed.map((row) => row.slug)).toStrictEqual([
      'example-coastal-weather',
      RADAR,
      TRANSIT,
    ]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();

    for (const slug of [TRANSIT, RADAR, 'example-coastal-weather']) {
      await store.insertDomain(domainInput(slug));
    }

    const listed = await store.listDomains({ limit: 1, offset: 1 });

    expect(listed.map((row) => row.slug)).toStrictEqual([RADAR]);
    expect(await store.countDomains()).toBe(3);
  });

  it('answers an empty window past the end of the collection', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    expect(await store.listDomains({ limit: 50, offset: 50 })).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The counts the delete guard reads
// ---------------------------------------------------------------------------

describe('the dependent counts', () => {
  it('answers three zeros for a domain nothing points at', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 0,
    });
  });

  it('answers what was planted, with an absent member as zero', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4, topics: 2 });

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 2,
      sources: 0,
      findings: 4,
    });
  });

  it('replaces the planted counts rather than merging into them', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4, topics: 2 });
    store.setDomainDependents(inserted.id, { sources: 1 });

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 1,
      findings: 0,
    });
  });

  it('answers three zeros for an id no domain carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countDomainDependents(404)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 0,
    });
  });

  it('answers counts a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4 });

    const counts = await store.countDomainDependents(inserted.id);

    (counts as { findings: number }).findings = 99;

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 4,
    });
  });

  it('forgets the counts of a deleted domain', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4 });

    await store.deleteDomain(inserted.id);

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// The writes that find no row
// ---------------------------------------------------------------------------

describe('a write naming no stored domain', () => {
  it('answers null from a patch', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateDomain(404, { name: 'Nothing' })).toBeNull();
  });

  it('answers false from a delete', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteDomain(404)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The natural key on categories
// ---------------------------------------------------------------------------

describe('the categories_domain_id_key_unique key', () => {
  it('refuses a second category on a key the domain holds', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every category passes the line above.
    const accepted = await addCategory(store, domain.id, TOOLING);

    expect(accepted.key).toBe(TOOLING);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('categories_domain_id_key_unique');
  });

  it('takes the same key in a second domain', async () => {
    const store = createMemoryResearchStore();
    const first = await store.insertDomain(domainInput(RADAR));
    const second = await store.insertDomain(domainInput(TRANSIT));

    await addCategory(store, first.id, PLATFORMS);

    const accepted = await addCategory(store, second.id, PLATFORMS);

    expect(accepted.domainId).toBe(second.id);
    expect(accepted.key).toBe(PLATFORMS);
  });

  it('leaves the standing category exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const standing = await addCategory(store, domain.id, PLATFORMS);

    await refusalFrom(() => store.insertCategory({
      domainId: domain.id,
      key: PLATFORMS,
      name: 'Rewritten by a refused insert',
      parentId: null,
    }));

    const stored = await readCategory(store, standing.id);
    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed).toHaveLength(1);
    expect(stored.name).toBe(`Category ${PLATFORMS}`);
  });

  it('puts the refused key in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, PLATFORMS)).toBe(0);

    // The same search over a message that DOES carry the key, so the
    // zero above is a reading rather than a search finding nothing
    // anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${PLATFORMS}`,
    });

    expect(countOccurrences(planted, PLATFORMS)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind categories.id
// ---------------------------------------------------------------------------

describe('the category id sequence', () => {
  it('hands the first category id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addCategory(store, domain.id, PLATFORMS);

    // Its own counter, and not the domains one: the domain above
    // holds id 1 as well.
    expect(inserted.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a key refusal and on a depth one', async () => {
    const store = createMemoryResearchStore();
    const { domain, child } = await seedOneLevel(store, RADAR);

    await refusalFrom(() => addCategory(store, domain.id, PLATFORMS));
    await refusalFrom(
      () => addCategory(store, domain.id, 'analytics', child.id),
    );

    const next = await addCategory(store, domain.id, RUNTIMES);

    // 5 rather than 3: the root and the child took 1 and 2, and both
    // refusals took one apiece. Measured on `categories` against the
    // live Postgres, where two refused inserts between two accepted
    // ones left a gap of two — the depth refusal included, since the
    // sequence is read before the trigger runs.
    expect(next.id).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// The three branches of the depth trigger
// ---------------------------------------------------------------------------

describe('the depth rule the trigger holds', () => {
  it('refuses a parent that is itself a child', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, RUNTIMES, child.id),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The control: the same key under the ROOT is accepted, so the
    // refusal is about the depth and not about the write.
    const accepted = await addCategory(store, domain.id, RUNTIMES, root.id);

    expect(accepted.parentId).toBe(root.id);
  });

  it('refuses a parent belonging to another domain', async () => {
    const store = createMemoryResearchStore();
    const here = await store.insertDomain(domainInput(RADAR));
    const elsewhere = await store.insertDomain(domainInput(TRANSIT));
    const theirRoot = await addCategory(store, elsewhere.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, here.id, TOOLING, theirRoot.id),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The control: the same parent, asked for by a category in its
    // own domain.
    const accepted = await addCategory(
      store,
      elsewhere.id,
      TOOLING,
      theirRoot.id,
    );

    expect(accepted.parentId).toBe(theirRoot.id);
  });

  it('refuses a parent given to a row that has children', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);
    const other = await addCategory(store, domain.id, RUNTIMES);

    const refusal = await refusalFrom(
      () => store.updateCategory(root.id, { parentId: other.id }),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The control: a CHILDLESS root takes the very same parent, so
    // the refusal is about this row's children rather than about the
    // parent it named. Measured the same way against the live server.
    const moved = await store.updateCategory(other.id, { parentId: root.id });

    expect(moved?.parentId).toBe(root.id);
  });

  it('answers one check violation naming no constraint', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);
    const elsewhere = await store.insertDomain(domainInput(TRANSIT));
    const theirRoot = await addCategory(store, elsewhere.id, RUNTIMES);
    const branches = [
      () => addCategory(store, domain.id, 'a-parent-is-a-child', child.id),
      () => addCategory(store, domain.id, 'a-parent-elsewhere', theirRoot.id),
      () => store.updateCategory(root.id, { parentId: theirRoot.id }),
    ];

    for (const branch of branches) {
      const refusal = await refusalFrom(branch);

      // A trigger raising through `RAISE ... USING ERRCODE` names no
      // constraint, so the three branches are indistinguishable from
      // one another here — which is what makes `reason` alone the
      // discriminator a service is entitled to read.
      expect(refusal.reason).toBe('check-violation');
      expect(refusal.constraint).toBeUndefined();
    }
  });

  it('asks the depth question before the natural key', async () => {
    const store = createMemoryResearchStore();
    const { domain, child } = await seedOneLevel(store, RADAR);

    // Two faults at once: a key the domain already holds, and a
    // parent that is itself a child. Measured against the live
    // Postgres, this answers 23514 and not 23505 — the trigger is
    // BEFORE INSERT, so it runs while the row is still being formed
    // and ahead of the unique index.
    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS, child.id),
    );

    expect(refusal.reason).toBe('check-violation');
  });

  it('promotes a child to a root with an explicit null', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    const promoted = await store.updateCategory(child.id, { parentId: null });

    expect(promoted?.parentId).toBeNull();
  });

  it('takes a null parent on a row that has children', async () => {
    const store = createMemoryResearchStore();
    const { root } = await seedOneLevel(store, RADAR);

    // The trigger's first branch returns before any of the three
    // rules, so a root may always be made a root again — which is
    // what leaves a way back up for a row the branch above refuses.
    const patched = await store.updateCategory(root.id, { parentId: null });

    expect(patched?.parentId).toBeNull();
  });

  it('takes a rename of a child, re-running the guard', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    // The trigger fires on every UPDATE, so a rename re-asks all
    // three questions about the parent the row already has. A stored
    // row is always legal, so this cannot be refused — the case is
    // what keeps that a consequence rather than an assumption.
    const renamed = await store.updateCategory(child.id, { name: 'Renamed' });

    expect(renamed?.name).toBe('Renamed');
    expect(renamed?.parentId).toBe(child.parentId);
  });

  it('leaves the row where it was when it refuses a move', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);
    const other = await addCategory(store, domain.id, RUNTIMES);

    await refusalFrom(
      () => store.updateCategory(root.id, { parentId: other.id }),
    );

    const stored = await readCategory(store, root.id);

    expect(stored.parentId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The one foreign key, and the two refusals that share its name
// ---------------------------------------------------------------------------

describe('the parent_id foreign key', () => {
  it('refuses a parent naming no stored category', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, TOOLING, 404),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('categories_parent_id_categories_id_fk');
  });

  it('refuses a delete of a category holding children', async () => {
    const store = createMemoryResearchStore();
    const { root, child } = await seedOneLevel(store, RADAR);

    const refusal = await refusalFrom(() => store.deleteCategory(root.id));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('categories_parent_id_categories_id_fk');

    // The control: the CHILD, which nothing points at, is removable
    // by the same call — so the refusal is about what hangs off the
    // row rather than about deleting a category at all.
    expect(await store.deleteCategory(child.id)).toBe(true);
  });

  it('answers both under one reason and one constraint', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);

    const missingParent = await refusalFrom(
      () => addCategory(store, domain.id, RUNTIMES, 404),
    );
    const heldChildren = await refusalFrom(
      () => store.deleteCategory(root.id),
    );

    // Identical as VALUES, which is the fact the services above are
    // written around: a 422 and a 409 out of one name, told apart by
    // which call was made and by nothing on the refusal.
    expect(missingParent.reason).toBe(heldChildren.reason);
    expect(missingParent.constraint).toBe(heldChildren.constraint);
    expect(Object.keys(missingParent).sort()).toStrictEqual(
      Object.keys(heldChildren).sort(),
    );
  });

  it('asks the natural key before the missing parent', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    // Two faults again, and this pair goes the other way: measured
    // against the live Postgres, a duplicate key beside a parent
    // naming no row answers 23505, because the unique index is
    // checked at insertion and the foreign key afterwards.
    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS, 404),
    );

    expect(refusal.reason).toBe('unique-violation');
  });

  it('takes the delete once the children are reparented', async () => {
    const store = createMemoryResearchStore();
    const { root, child } = await seedOneLevel(store, RADAR);

    await refusalFrom(() => store.deleteCategory(root.id));
    await store.updateCategory(child.id, { parentId: null });

    expect(await store.deleteCategory(root.id)).toBe(true);
    expect(await store.findCategoryById(child.id)).not.toBeNull();
  });

  it('leaves the children standing when it refuses', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);

    await refusalFrom(() => store.deleteCategory(root.id));

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.id).sort()).toStrictEqual(
      [root.id, child.id].sort(),
    );
  });

  it('answers false for an id no category carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteCategory(404)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The cascade a domain delete runs, and what it must not consult
// ---------------------------------------------------------------------------

describe('the domain cascade over a taxonomy', () => {
  it('takes a parent and its children together', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);

    // The trap `NO ACTION` sets for a fake: the rule is checked at
    // the end of the statement, by which point the cascade has taken
    // both rows. Measured against the live Postgres, where the same
    // delete answered and left the table empty. A store reusing its
    // own `deleteCategory` here would refuse this.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findCategoryById(root.id)).toBeNull();
    expect(await store.findCategoryById(child.id)).toBeNull();
  });

  it('leaves a second domain taxonomy standing', async () => {
    const store = createMemoryResearchStore();
    const going = await seedOneLevel(store, RADAR);
    const staying = await seedOneLevel(store, TRANSIT);

    await store.deleteDomain(going.domain.id);

    const listed = await store.listCategoriesWithTermCounts(
      staying.domain.id,
    );

    expect(listed.map((row) => row.key)).toStrictEqual([PLATFORMS, TOOLING]);
  });

  it('frees the keys the deleted domain held', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedOneLevel(store, RADAR);

    await store.deleteDomain(domain.id);

    const rebuilt = await store.insertDomain(domainInput(RADAR));
    const accepted = await addCategory(store, rebuilt.id, PLATFORMS);

    expect(accepted.key).toBe(PLATFORMS);
  });
});

// ---------------------------------------------------------------------------
// The category reads
// ---------------------------------------------------------------------------

describe('the category list', () => {
  it('orders by key rather than by insertion', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    for (const key of [TOOLING, RUNTIMES, PLATFORMS]) {
      await addCategory(store, domain.id, key);
    }

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.key)).toStrictEqual([
      PLATFORMS,
      RUNTIMES,
      TOOLING,
    ]);
  });

  it('lists only the categories of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const here = await store.insertDomain(domainInput(RADAR));
    const elsewhere = await store.insertDomain(domainInput(TRANSIT));

    await addCategory(store, here.id, PLATFORMS);
    await addCategory(store, elsewhere.id, RUNTIMES);

    const listed = await store.listCategoriesWithTermCounts(here.id);

    expect(listed.map((row) => row.key)).toStrictEqual([PLATFORMS]);
  });

  it('answers a counted zero rather than an absent member', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedOneLevel(store, RADAR);

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    // Zero because THIS case writes no term, rather than because
    // the store cannot: the term half below plants them and reads
    // the same list back with mixed counts. What is pinned here is
    // the counted zero rather than an absent member, which is the
    // one answer `CategoryWithTermCount` forbids.
    expect(listed.map((row) => row.termCount)).toStrictEqual([0, 0]);
  });

  it('answers an empty list for a domain with no taxonomy', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    expect(await store.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);
    const [listed] = await store.listCategoriesWithTermCounts(domain.id);

    if (listed === undefined) {
      throw new Error('expected the taxonomy to carry a first row');
    }

    (listed as { name: string }).name = 'Written through the port';

    const stored = await readCategory(store, root.id);

    expect(stored.name).toBe(`Category ${PLATFORMS}`);
  });
});

describe('the single category read', () => {
  it('answers null for an id no category carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findCategoryById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { root } = await seedOneLevel(store, RADAR);
    const read = await readCategory(store, root.id);

    (read as { key: string }).key = 'rewritten';

    expect((await readCategory(store, root.id)).key).toBe(PLATFORMS);
  });
});

// ---------------------------------------------------------------------------
// The category patch
// ---------------------------------------------------------------------------

describe('the category patch', () => {
  it('renames without touching the key or the parent', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    const patched = await store.updateCategory(child.id, { name: 'Renamed' });

    expect(patched?.name).toBe('Renamed');
    expect(patched?.key).toBe(TOOLING);
    expect(patched?.parentId).toBe(child.parentId);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    // A legal call rather than a no-op to be avoided: `categories`
    // carries no `updated_at`, so an empty patch has nothing to set
    // and answers the row without writing.
    const patched = await store.updateCategory(child.id, {});

    expect(patched).toStrictEqual(child);
  });

  it('answers null from a patch naming no stored category', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateCategory(404, { name: 'Nothing' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The key the term half can refuse on
// ---------------------------------------------------------------------------

describe('the terms_category_id_pattern_unique key', () => {
  it('refuses a second term on a pattern the category holds', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id, KUBERNETES),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await addTerm(store, platforms.id, WEBASSEMBLY);

    expect(accepted.pattern).toBe(WEBASSEMBLY);
    expect(await store.countTerms(platforms.id)).toBe(3);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id, KUBERNETES),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('terms_category_id_pattern_unique');
  });

  it('takes the same pattern in a sibling category', async () => {
    const store = createMemoryResearchStore();
    const { platforms, runtimes } = await seedLexicon(store, RADAR);

    // The key is `(category_id, pattern)` and not `pattern`, so this
    // is the widening control: a store holding patterns globally
    // unique refuses a write the database takes.
    const accepted = await addTerm(store, runtimes.id, KUBERNETES);

    expect(accepted.categoryId).toBe(runtimes.id);
    expect(await store.countTerms(platforms.id)).toBe(2);
    expect(await store.countTerms(runtimes.id)).toBe(2);
  });

  it('leaves the standing term exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    await refusalFrom(() => store.insertTerm({
      categoryId: platforms.id,
      pattern: KUBERNETES,
      weight: 99,
      polarity: 'negative',
      notes: 'rewritten by a refused insert',
    }));

    expect(await readTerm(store, kube.id)).toStrictEqual(kube);
    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('puts the refused pattern in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id, KUBERNETES),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, KUBERNETES)).toBe(0);

    // The same search over a message that DOES carry the pattern, so
    // the zero above is a reading rather than a search finding
    // nothing anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${KUBERNETES}`,
    });

    expect(countOccurrences(planted, KUBERNETES)).toBe(1);
  });

  it('refuses a rename onto a pattern the category holds', async () => {
    const store = createMemoryResearchStore();
    const { mesh, kube } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => store.updateTerm(mesh.id, { pattern: KUBERNETES }),
    );

    expect(refusal.constraint).toBe('terms_category_id_pattern_unique');
    expect(await readTerm(store, mesh.id)).toStrictEqual(mesh);
    expect(await readTerm(store, kube.id)).toStrictEqual(kube);
  });

  it('refuses a bucket move onto a pair already taken', async () => {
    const store = createMemoryResearchStore();
    const { runtimes, kube } = await seedLexicon(store, RADAR);

    await addTerm(store, runtimes.id, KUBERNETES);

    // Both halves of the key are patchable, so the rule is about the
    // RESULTING pair: this move renames nothing and is refused all
    // the same.
    const refusal = await refusalFrom(
      () => store.updateTerm(kube.id, { categoryId: runtimes.id }),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect((await readTerm(store, kube.id)).categoryId).toBe(kube.categoryId);
  });

  it('takes a patch writing a term pattern back over itself', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    // A row is not in conflict with itself — measured against the
    // live Postgres, where an update writing a term's own pattern
    // back over it is accepted. A store looking the pair up without
    // excluding the row being written refuses this.
    const patched = await store.updateTerm(kube.id, {
      pattern: KUBERNETES,
      weight: 8,
    });

    expect(patched?.weight).toBe(8);
    expect(patched?.pattern).toBe(KUBERNETES);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind terms.id
// ---------------------------------------------------------------------------

describe('the term id sequence', () => {
  it('hands the first term id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const category = await addCategory(store, domain.id, PLATFORMS);
    const inserted = await addTerm(store, category.id, KUBERNETES);

    // Its own counter, and neither of the other two: the domain and
    // the category above hold id 1 as well.
    expect(inserted.id).toBe(1);
    expect(category.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await refusalFrom(() => addTerm(store, platforms.id, KUBERNETES));

    const next = await addTerm(store, platforms.id, WEBASSEMBLY);

    // 5 rather than 4: the three seeded terms took 1, 2 and 3, and
    // the refusal took the fourth. Measured on `terms` against the
    // live Postgres, where a duplicate pattern between two accepted
    // inserts left a gap of exactly one.
    expect(next.id).toBe(5);
  });

  it('burns one id per submitted row of an upsert', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 7, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'positive', notes: null },
    ]);

    const next = await addTerm(store, platforms.id, EDGE);

    // The rewritten row took an id and left it unused, so the new
    // row of that batch is 5 and the next insert is 6 — measured
    // against the live Postgres, where a two-row batch moved the
    // sequence by two while writing one new row.
    expect((await readTerm(store, 5)).pattern).toBe(WEBASSEMBLY);
    expect(next.id).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// The foreign key onto categories.id
// ---------------------------------------------------------------------------

describe('the term category foreign key', () => {
  it('refuses an insert naming no stored category', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id + 400, KUBERNETES),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('terms_category_id_categories_id_fk');

    // The positive control: the same write into a category that
    // exists is taken.
    const accepted = await addTerm(store, platforms.id, WEBASSEMBLY);

    expect(accepted.categoryId).toBe(platforms.id);
  });

  it('refuses an upsert naming no stored category', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(() => store.upsertTerms(
      platforms.id + 400,
      [{ pattern: KUBERNETES, weight: 1, polarity: 'positive', notes: null }],
    ));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('terms_category_id_categories_id_fk');
  });

  it('takes an empty upsert into a category that is not there', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // No statement runs for an empty document, so there is no
    // foreign key to check — which the port states and which is why
    // the early return sits above every check.
    expect(await store.upsertTerms(platforms.id + 400, [])).toStrictEqual([]);
  });

  it('takes a bucket move into another domain category', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);
    const other = await store.insertDomain(domainInput(TRANSIT));
    const elsewhere = await addCategory(store, other.id, PLATFORMS);

    // Measured: nothing in the schema relates a term to a domain, so
    // the database takes this. The rule that a bucket move must stay
    // inside one domain is the service's, and a store enforcing it
    // would be refusing something no deployment refuses.
    const moved = await store.updateTerm(kube.id, {
      categoryId: elsewhere.id,
    });

    expect(moved?.categoryId).toBe(elsewhere.id);
    expect(moved?.id).toBe(kube.id);
  });

  it('refuses a bucket move onto a category that is not there', async () => {
    const store = createMemoryResearchStore();
    const { kube, platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => store.updateTerm(kube.id, { categoryId: platforms.id + 400 }),
    );

    expect(refusal.constraint).toBe('terms_category_id_categories_id_fk');
    expect((await readTerm(store, kube.id)).categoryId).toBe(platforms.id);
  });
});

// ---------------------------------------------------------------------------
// The upsert on that same key
// ---------------------------------------------------------------------------

describe('the upsert on the natural key', () => {
  it('rewrites weight, polarity and notes on a held pattern', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [{
      pattern: KUBERNETES,
      weight: 42,
      polarity: 'negative',
      notes: 'rewritten by the lexicon',
    }]);

    expect(written).toStrictEqual([{
      id: kube.id,
      categoryId: platforms.id,
      pattern: KUBERNETES,
      weight: 42,
      polarity: 'negative',
      notes: 'rewritten by the lexicon',
    }]);

    // The answered row and the stored row are two claims, not one
    // shape written twice: a write that lies consistently satisfies
    // the first on its own.
    expect(await readTerm(store, kube.id)).toStrictEqual(written[0]);
  });

  it('keeps the stored row id rather than writing a new row', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [{
      pattern: KUBERNETES,
      weight: 42,
      polarity: 'negative',
      notes: null,
    }]);

    // Measured against the live Postgres: the `ON CONFLICT ... DO
    // UPDATE` answered the STORED id. A term keeping its id across a
    // re-import is what lets import, export and re-import settle
    // instead of counting the same match twice.
    expect(written[0]?.id).toBe(kube.id);
    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('inserts a pattern the category does not already hold', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [{
      pattern: WEBASSEMBLY,
      weight: 6,
      polarity: 'positive',
      notes: null,
    }]);

    expect(written[0]?.pattern).toBe(WEBASSEMBLY);
    expect(await store.countTerms(platforms.id)).toBe(3);
  });

  it('writes every row of a batch that both rewrites and adds', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: 'moved' },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'positive', notes: null },
    ]);

    const stored = await store.listTerms(platforms.id);

    expect(stored.map((row) => [row.pattern, row.weight])).toStrictEqual([
      [KUBERNETES, 9],
      [SERVICE_MESH, 5],
      [WEBASSEMBLY, 2],
    ]);
    expect((await readTerm(store, kube.id)).notes).toBe('moved');
  });

  it('leaves the terms a document does not name standing', async () => {
    const store = createMemoryResearchStore();
    const { platforms, mesh } = await seedLexicon(store, RADAR);

    await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: null },
    ]);

    // An upsert is not a replace: a lexicon rewrites the rows it
    // names and takes nothing away, which is what makes a partial
    // document safe to apply.
    expect(await readTerm(store, mesh.id)).toStrictEqual(mesh);
  });

  it('answers an empty list for an empty document', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    expect(await store.upsertTerms(platforms.id, [])).toStrictEqual([]);
    expect(await store.countTerms(platforms.id)).toBe(2);

    // The counter is untouched too, since no statement ran: the next
    // insert takes the id the seeded rows left off at.
    expect((await addTerm(store, platforms.id, WEBASSEMBLY)).id).toBe(4);
  });

  it('settles when the same document is applied twice', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);
    const document: readonly TermValues[] = [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'positive', notes: 'w' },
    ];

    const first = await store.upsertTerms(platforms.id, document);
    const second = await store.upsertTerms(platforms.id, document);

    // Import, export, re-import: the second pass rewrites the same
    // rows rather than accumulating a second copy that would count
    // the same match twice.
    expect(second).toStrictEqual(first);
    expect(await store.countTerms(platforms.id)).toBe(3);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: null },
    ]);
    const answered = written[0];

    if (answered === undefined) {
      throw new Error('expected the upsert to answer one row');
    }

    // The mutation is the case: an assertion by value would pass
    // against a store handing its own objects out.
    (answered as { weight: number }).weight = 1234;

    expect((await readTerm(store, answered.id)).weight).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// The one refusal that is deliberately not a StoreRefusal
// ---------------------------------------------------------------------------

describe('a document repeating one pattern', () => {
  it('throws, rather than applying the last of the collision', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // Postgres answers SQLSTATE 21000 here and `classifyPgError`
    // does not recognise it, so this reaches a route as a 500 by
    // design: the fault is in the document rather than in the
    // request, and a tidy status would name neither colliding row.
    // A store applying the last row would be ACCEPTING what the
    // database refuses.
    await plainErrorFrom(() => store.upsertTerms(platforms.id, [
      { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
    ]));

    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('writes nothing at all, the rows before the repeat too', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube, mesh } = await seedLexicon(store, RADAR);

    await plainErrorFrom(() => store.upsertTerms(platforms.id, [
      { pattern: EDGE, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
    ]));

    // One statement is atomic, so a document lands whole or not at
    // all — a store looping row by row leaves the first row behind,
    // and nothing about the repeat would report it.
    expect(await store.listTerms(platforms.id)).toStrictEqual([kube, mesh]);
  });

  it('is checked before the category the document names', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // Measured against the live Postgres: a batch that BOTH repeats
    // a pattern and names a category that does not exist answers
    // 21000 and not 23503. Only a two-fault call can see it, which
    // is why it is a case of its own.
    const raised = await plainErrorFrom(() => store.upsertTerms(
      platforms.id + 400,
      [
        { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
        { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
      ],
    ));

    expect(raised).not.toBeInstanceOf(StoreRefusal);
  });

  it('names the constraint and no part of the document', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const raised = await plainErrorFrom(() => store.upsertTerms(platforms.id, [
      { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
    ]));
    const serialised = JSON.stringify({
      message: raised.message,
      stack: raised.stack,
    });

    expect(countOccurrences(serialised, WEBASSEMBLY)).toBe(0);
    expect(raised.message)
      .toContain('terms_category_id_pattern_unique');

    // The same search over a message that DOES carry the pattern, so
    // the zero above is a reading rather than a search finding
    // nothing anywhere.
    const planted = JSON.stringify({
      message: `two rows on ${WEBASSEMBLY}`,
      stack: raised.stack,
    });

    expect(countOccurrences(planted, WEBASSEMBLY)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The cascade that takes a category's terms with it
// ---------------------------------------------------------------------------

describe('the category cascade over its terms', () => {
  it('removes the terms of the category it deletes', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube, mesh } = await seedLexicon(store, RADAR);

    expect(await store.deleteCategory(platforms.id)).toBe(true);

    // `terms.category_id` is `ON DELETE CASCADE` — measured, the
    // delete answers and the category's rows are gone. Read back
    // through the term id as well as through the count: a store
    // dropping a bucket without its rows leaves them reachable by
    // id while every count reads zero.
    expect(await store.countTerms(platforms.id)).toBe(0);
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findTermById(mesh.id)).toBeNull();
  });

  it('is not refused by a category that holds only terms', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // The guard on this delete is about CHILDREN, and a term is not
    // a child: a store reusing the children guard over its terms
    // refuses a delete Postgres takes.
    expect(await store.deleteCategory(platforms.id)).toBe(true);
    expect(await store.findCategoryById(platforms.id)).toBeNull();
  });

  it('leaves a sibling category terms standing', async () => {
    const store = createMemoryResearchStore();
    const { platforms, runtimes, wasm } = await seedLexicon(store, RADAR);

    await store.deleteCategory(platforms.id);

    expect(await store.countTerms(runtimes.id)).toBe(1);
    expect(await readTerm(store, wasm.id)).toStrictEqual(wasm);
  });

  it('frees the pattern for a category written in its place', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms } = await seedLexicon(store, RADAR);

    await store.deleteCategory(platforms.id);

    const replacement = await addCategory(store, domain.id, PLATFORMS);
    const written = await addTerm(store, replacement.id, KUBERNETES);

    expect(written.pattern).toBe(KUBERNETES);
    expect(await store.countTerms(replacement.id)).toBe(1);
  });

  it('leaves the terms standing when the delete is refused', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);
    const held = await addTerm(store, root.id, KUBERNETES);

    await refusalFrom(() => store.deleteCategory(root.id));

    // The refusal happens before anything is dropped, so a store
    // cascading ahead of its guard loses rows on a call that
    // answered nothing.
    expect(await readTerm(store, held.id)).toStrictEqual(held);
    expect(await store.countTerms(root.id)).toBe(1);
    expect(await store.findCategoryById(child.id)).not.toBeNull();
    expect(await store.findDomainBySlug(domain.slug)).not.toBeNull();
  });
});

describe('the domain cascade over its terms', () => {
  it('takes the categories and their terms together', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms, kube, wasm } = await seedLexicon(store, RADAR);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // Two levels down: the domain cascade removes its categories,
    // and each of those cascades onto its own terms. Measured — a
    // domain delete left zero rows in `categories` and zero in
    // `terms`.
    expect(await store.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([]);
    expect(await store.countTerms(platforms.id)).toBe(0);
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findTermById(wasm.id)).toBeNull();
  });

  it('leaves a second domain terms standing', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedLexicon(store, RADAR);
    const transit = await seedLexicon(store, TRANSIT);

    await store.deleteDomain(radar.domain.id);

    expect(await store.countTerms(transit.platforms.id)).toBe(2);
    expect(await readTerm(store, transit.wasm.id))
      .toStrictEqual(transit.wasm);
  });

  it('takes a parent, its children and both their terms', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);
    const onRoot = await addTerm(store, root.id, KUBERNETES);
    const onChild = await addTerm(store, child.id, WEBASSEMBLY);

    // The children guard is not consulted here: it is checked at the
    // end of the statement, by which point the cascade has removed
    // the parent and the child together. A store looping its own
    // guarded delete refuses this, and only for a taxonomy with more
    // than one level.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findTermById(onRoot.id)).toBeNull();
    expect(await store.findTermById(onChild.id)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The term reads
// ---------------------------------------------------------------------------

describe('the term list', () => {
  it('orders by pattern ascending rather than by insertion', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await addTerm(store, platforms.id, EDGE);

    expect((await store.listTerms(platforms.id)).map((row) => row.pattern))
      .toStrictEqual([EDGE, KUBERNETES, SERVICE_MESH]);
  });

  it('reads the whole category when it is given no window', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // The export's call: a `?format=seed` document is about the
    // category as a whole, and counting first and then asking for a
    // window that size would be two reads that can disagree.
    expect(await store.listTerms(platforms.id)).toHaveLength(2);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await addTerm(store, platforms.id, EDGE);

    const page = await store.listTerms(platforms.id, { limit: 1, offset: 1 });

    expect(page.map((row) => row.pattern)).toStrictEqual([KUBERNETES]);
  });

  it('answers an empty window past the end of the collection', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    expect(await store.listTerms(platforms.id, { limit: 50, offset: 9 }))
      .toStrictEqual([]);
  });

  it('lists only the terms of the category asked about', async () => {
    const store = createMemoryResearchStore();
    const { runtimes } = await seedLexicon(store, RADAR);

    expect((await store.listTerms(runtimes.id)).map((row) => row.pattern))
      .toStrictEqual([WEBASSEMBLY]);
  });

  it('answers an empty list for a category holding no terms', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedLexicon(store, RADAR);
    const empty = await addCategory(store, domain.id, TOOLING);

    expect(await store.listTerms(empty.id)).toStrictEqual([]);
    expect(await store.countTerms(empty.id)).toBe(0);
  });

  it('answers zero for an id no category carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countTerms(404)).toBe(0);
    expect(await store.listTerms(404)).toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const [listed] = await store.listTerms(platforms.id);

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    (listed as { pattern: string }).pattern = 'written through the list';

    // Against the constants rather than against the records the
    // writes answered: a store handing its own objects out has
    // ALIASED the two, and the comparison then holds one lie against
    // itself and passes.
    expect((await store.listTerms(platforms.id)).map((row) => row.pattern))
      .toStrictEqual([KUBERNETES, SERVICE_MESH]);
  });
});

describe('the single term read', () => {
  it('answers null for an id no term carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findTermById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);
    const weight = kube.weight;

    const read = await readTerm(store, kube.id);

    (read as { weight: number }).weight = 1234;

    // Against a primitive read BEFORE the mutation: comparing
    // against `kube.weight` would compare one lie against itself,
    // since a store handing its own objects out aliased the two.
    expect((await readTerm(store, kube.id)).weight).toBe(weight);
  });
});

describe('the term counts on the category list', () => {
  it('counts the terms of each category rather than guessing', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedLexicon(store, RADAR);

    await addCategory(store, domain.id, TOOLING);

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    // A zero beside two non-equal counts, so a store answering one
    // number for every bucket cannot pass: `platforms` holds two,
    // `runtimes` one and `tooling` none.
    expect(listed.map((row) => [row.key, row.termCount])).toStrictEqual([
      [PLATFORMS, 2],
      [RUNTIMES, 1],
      [TOOLING, 0],
    ]);
  });

  it('counts only the terms of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedLexicon(store, RADAR);

    await seedLexicon(store, TRANSIT);

    const listed = await store.listCategoriesWithTermCounts(radar.domain.id);

    expect(listed.map((row) => row.termCount)).toStrictEqual([2, 1]);
  });

  it('moves the count when a term changes bucket', async () => {
    const store = createMemoryResearchStore();
    const { domain, runtimes, kube } = await seedLexicon(store, RADAR);

    await store.updateTerm(kube.id, { categoryId: runtimes.id });

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.termCount)).toStrictEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// The term patch and the term delete
// ---------------------------------------------------------------------------

describe('the term patch', () => {
  it('rewrites the members it names and leaves the rest', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    const patched = await store.updateTerm(kube.id, {
      weight: 11,
      polarity: 'negative',
    });

    expect(patched).toStrictEqual({
      ...kube,
      weight: 11,
      polarity: 'negative',
    });
    expect(await readTerm(store, kube.id)).toStrictEqual(patched);
  });

  it('clears a note with a null and leaves it alone when absent', async () => {
    const store = createMemoryResearchStore();
    const { wasm } = await seedLexicon(store, RADAR);

    const kept = await store.updateTerm(wasm.id, { weight: 2 });

    expect(kept?.notes).toBe(wasm.notes);

    // Absent and null are two requests rather than one: only the
    // second clears the note, and a store defaulting one to the
    // other cannot express whichever it collapses.
    const cleared = await store.updateTerm(wasm.id, { notes: null });

    expect(cleared?.notes).toBeNull();
  });

  it('moves a term between buckets, keeping its id', async () => {
    const store = createMemoryResearchStore();
    const { runtimes, kube } = await seedLexicon(store, RADAR);

    const moved = await store.updateTerm(kube.id, { categoryId: runtimes.id });

    // An UPDATE rather than a delete and an insert, which is what
    // keeps the row's id and its weight together.
    expect(moved?.id).toBe(kube.id);
    expect(moved?.weight).toBe(kube.weight);
    expect((await readTerm(store, kube.id)).categoryId).toBe(runtimes.id);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    // A legal call rather than a no-op to be avoided: `terms`
    // carries no `updated_at`, so an empty patch has nothing to set
    // and answers the row without writing.
    expect(await store.updateTerm(kube.id, {})).toStrictEqual(kube);
  });

  it('answers null from a patch naming no stored term', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateTerm(404, { weight: 2 })).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    const patched = await store.updateTerm(kube.id, { weight: 11 });

    if (patched === null) {
      throw new Error('expected the patch to answer the stored row');
    }

    (patched as { weight: number }).weight = 1234;

    expect((await readTerm(store, kube.id)).weight).toBe(11);
  });
});

describe('the term delete', () => {
  it('removes one term and leaves its category standing', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    expect(await store.deleteTerm(kube.id)).toBe(true);
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.countTerms(platforms.id)).toBe(1);
    expect(await store.findCategoryById(platforms.id)).not.toBeNull();
  });

  it('answers false for an id no term carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteTerm(404)).toBe(false);
  });

  it('frees the pattern the deleted term held', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    await store.deleteTerm(kube.id);

    const written = await addTerm(store, platforms.id, KUBERNETES);

    expect(written.pattern).toBe(KUBERNETES);
    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('cannot be refused by anything, unlike the other two', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    // Nothing hangs off a term, so this is the one delete on the
    // taxonomy surface with neither a guard nor a cascade — and the
    // control that says so is a category holding a term refusing
    // nothing either.
    expect(await store.deleteTerm(kube.id)).toBe(true);
    expect(await store.deleteCategory(platforms.id)).toBe(true);
  });
});
