/**
 * The domains half of `tests/helpers/memory-research-store.ts`: the
 * three claims that make it a second implementation of `DomainStore`
 * rather than a bag that stores what it is handed.
 *
 * THAT IT REFUSES WHAT POSTGRES REFUSES. `domains_slug_unique` is
 * the only mechanism this half can raise, so the cases assert the
 * refusal is a `StoreRefusal` carrying the reason a SQLSTATE 23505
 * classifies to and the constraint name spelled in
 * `src/db/schema/domains.ts` — not merely that something was thrown.
 * A refusal that named nothing would be indistinguishable from a bug
 * in the fake, and the service above switches on `reason`.
 *
 * THAT ITS IDS COME FROM 1 AND ARE NOT GAPLESS. A refused insert
 * burns an id here because it burns one in Postgres, measured on a
 * `bigserial` carrying a UNIQUE key against the live server: insert
 * `a`, have a second `a` refused, insert `b`, and `b` holds id 3.
 * The case pins that, so a later case cannot come to depend on a
 * gaplessness only the fake has.
 *
 * THAT NOTHING MUTABLE IS SHARED ACROSS THE BOUNDARY. Every `Date`
 * and every `settings` payload is copied in both directions, so a
 * caller cannot write into stored state through a field the port
 * declares `readonly`. Each of those cases MUTATES what it was
 * handed and reads the row back: an assertion by value would pass
 * against a store handing out its own objects, which is exactly the
 * leak being ruled out.
 *
 * Two cases carry a positive control in the same body rather than in
 * a sibling case, because both are asking a question a broken store
 * answers the same way by accident. The duplicate-slug refusal is
 * paired with a second insert under a DIFFERENT slug, so a store
 * refusing every write cannot pass it. And the containment reading
 * over the serialised refusal counts occurrences rather than
 * asserting absence, with the same count taken over a planted
 * message: a search that would find nothing anywhere reports a clean
 * refusal and a leaking one alike.
 *
 * Mutation grid, measured over the 30 cases here. Nine legs, read as
 * the SET each reddened rather than as a count, and two of the sets
 * are wider than the leg suggests. Dropping the copy on the way OUT
 * reddens 4: the three date cases and the settings case that writes
 * through what it was answered, because one helper copies both.
 * Accepting the duplicate slug reddens 6, and five of those are
 * `refusalFrom` throwing because the call ANSWERED rather than an
 * assertion about the error failing. The sixth is the id-burn case,
 * which would otherwise have read 3 anyway and passed for the wrong
 * reason — the helper is what catches it. The remaining seven legs
 * redden exactly one case apiece: stamping the clock's own object,
 * storing the payload it was handed, taking the id after the key
 * check rather than before, merging `settings` on a patch, listing
 * in insertion order, leaving a deleted domain's counts standing,
 * and answering the stored counts by reference.
 */
import type { MemoryResearchStore } from './memory-research-store.js';
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type {
  DomainRecord,
  InsertDomainInput,
} from '../../src/domains/store.js';

import { describe, expect, it } from 'vitest';

import { StoreRefusal } from '../../src/db/store-errors.js';

import { createMemoryResearchStore } from './memory-research-store.js';

/** The seeded worked example's slug, and this file's first domain. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A window wide enough to read every row any case here writes. */
const WHOLE_COLLECTION = { limit: 50, offset: 0 };

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
