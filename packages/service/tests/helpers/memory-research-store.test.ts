/**
 * `tests/helpers/memory-research-store.ts` in both the halves it
 * implements — the claims that make it a second implementation of
 * `DomainStore` and of the CATEGORY half of `TaxonomyStore`, rather
 * than a bag that stores what it is handed.
 *
 * THAT IT REFUSES WHAT POSTGRES REFUSES. Every refusal case names the
 * `reason` a SQLSTATE classifies to and the constraint the mechanism
 * gave, not merely that something was thrown: a refusal naming
 * nothing would be indistinguishable from a bug in the fake, and the
 * services above switch on `reason`. Three mechanisms are reachable
 * across six writes — `domains_slug_unique` and
 * `categories_domain_id_key_unique` as unique violations, the three
 * branches of the depth trigger as one `check-violation` naming
 * NOTHING (a `RAISE ... USING ERRCODE` sets no constraint), and
 * `categories_parent_id_categories_id_fk` under both of the refusals
 * that share its name.
 *
 * THAT IT REFUSES THEM IN THE MEASURED ORDER. Two cases exist only
 * for that, because a request carrying two faults at once is the only
 * thing that can see it: a duplicate key beside a parent that is
 * itself a child answers the DEPTH refusal, and a duplicate key
 * beside a parent naming no row answers the KEY. Both were measured
 * against the live Postgres, where the BEFORE trigger runs while the
 * row is still being formed and the foreign key is checked after the
 * unique index. It is the half a fake gets wrong by writing its
 * checks in the order they read well.
 *
 * THAT ITS IDS COME FROM 1 AND ARE NOT GAPLESS. A refused insert
 * burns an id here because it burns one in Postgres, measured on a
 * `bigserial` carrying a UNIQUE key against the live server: insert
 * `a`, have a second `a` refused, insert `b`, and `b` holds id 3. The
 * same holds on `categories` for a DEPTH refusal as well as a key
 * one, measured there too. The cases pin both, so a later case cannot
 * come to depend on a gaplessness only the fake has.
 *
 * THAT NOTHING MUTABLE IS SHARED ACROSS THE BOUNDARY. Every `Date`,
 * every `settings` payload and every category row is copied in both
 * directions, so a caller cannot write into stored state through a
 * field the port declares `readonly`. Each of those cases MUTATES
 * what it was handed and reads the row back: an assertion by value
 * would pass against a store handing out its own objects, which is
 * exactly the leak being ruled out.
 *
 * THAT A DOMAIN DELETE IS NOT REFUSED BY THE GUARD THAT REFUSES A
 * CATEGORY DELETE. `categories.parent_id` is `NO ACTION`, so removing
 * a category that still holds children is refused — and the domain
 * cascade, which removes a parent and its children in one statement,
 * is not. The two sit in adjacent describes because a fake that
 * reused one for the other would look right in every case that has
 * only one level of taxonomy.
 *
 * Several cases carry a positive control in the same body rather than
 * in a sibling case, because each is asking a question a broken store
 * answers the same way by accident: a store refusing every write
 * passes a refusal assertion, and a store refusing nothing passes an
 * acceptance one. So the duplicate-key cases insert a second row
 * under a different key, the depth cases repeat the same write from a
 * position the rule allows, and the delete-refused case removes the
 * childless row with the very same call. The two containment readings
 * over a serialised refusal count occurrences rather than asserting
 * absence, with the same count taken over a planted message: a search
 * that would find nothing anywhere reports a clean refusal and a
 * leaking one alike.
 *
 * MUTATION GRID, measured over the 66 cases here across 27 legs, read
 * as the SET each reddened rather than as a count. Every figure below
 * moves when the TERM half adds its cases to this file.
 *
 * The nine domains legs are unchanged by the 36 category cases, which
 * is itself the reading: the two halves' red sets are disjoint.
 * Answering the stored domain object reddens 4 (three date cases and
 * the settings case that writes through what it was answered, because
 * one helper copies both). Accepting the duplicate slug reddens 6,
 * and five of those are `refusalFrom` throwing because the call
 * ANSWERED rather than an assertion about the error failing; the
 * sixth is the id-burn case, which would have read 3 anyway and
 * passed for the wrong reason. The other seven redden one case
 * apiece: stamping the clock's own object, storing the payload it was
 * handed, taking the id after the key check, merging `settings` on a
 * patch, listing in insertion order, leaving a deleted domain's
 * counts standing, and answering those counts by reference.
 *
 * Fifteen category legs redden between 0 and 6. Accepting the
 * duplicate `(domain_id, key)` reddens 6, one of them in another
 * describe — the ordering case whose whole subject is the key firing
 * first. Dropping the parent-is-a-child branch reddens 4, dropping
 * the other-domain branch 2 and dropping the own-children branch 2,
 * which is the shape to expect: only one of the three is reachable
 * from a patch. Accepting the delete of a category holding children
 * reddens 4, one of them through `refusalFrom` again. Running the
 * children guard INSIDE the domain cascade reddens 3, all of them in
 * the cascade describe. The two ordering legs — asking the key before
 * the depth, and the foreign key before the key — redden exactly one
 * case each, and they are DIFFERENT cases: the pair pins a three-step
 * order no single case can. Refusing nothing for a parent that names
 * no row reddens 2, one shared with the delete leg, since the case
 * comparing the two refusals as values needs both to be raised.
 * Conflating an absent and a null `parentId` reddens 2. Taking the
 * category id after the checks, ordering by insertion, and answering
 * the stored category by reference redden one apiece.
 *
 * Two of those deserve their attribution stated. Answering the stored
 * category by reference and handing out the stored object from the
 * LIST redden DISJOINT single cases, because the list builds a fresh
 * object with its own spread whatever the copy helper does — neither
 * leg substitutes for the other. And writing on a patch that names no
 * member reddens NOTHING at all. That is honest rather than a hole:
 * the early return exists because drizzle throws `No values to set`
 * on an empty update list, and this store has no such throw to
 * observe, so the claim is unobservable here and is pinned by the
 * port's TSDoc and by the drizzle half's own cases instead.
 *
 * Three legs WIDEN rather than narrow, which is the only direction
 * that can redden a positive control. Making the category key unique
 * across domains instead of within one reddens 2. Dropping the depth
 * guard's early return on a null parent reddens 1 — the case that a
 * row with children may always be made a root again. And refusing a
 * null parent as though it named a missing row reddens 31 of the 36
 * category cases, which is the whole-half control: it says those
 * cases exercise the store rather than passing over an empty dataset.
 */
import type { MemoryResearchStore } from './memory-research-store.js';
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type {
  DomainRecord,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type { CategoryRecord } from '../../src/taxonomy/store.js';

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

    // Zero because no method on this store writes a term, which is
    // the true answer rather than a stub — and a counted zero rather
    // than an absent member, which is the one answer
    // `CategoryWithTermCount` forbids.
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
