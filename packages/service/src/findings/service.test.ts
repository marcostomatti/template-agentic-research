/**
 * `src/findings/service.ts` — what the two findings reads refuse,
 * and what each refusal is careful not to say. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * FIVE SECTIONS AND NINETEEN CASES, all of them about a refusal.
 * What a page CARRIES — the scoping, the two filters, the window's
 * boundaries and the single get's three embedded lists — is the
 * next task's half, and every assertion below reads a membership,
 * a count or a call tally rather than a position, so nothing here
 * pre-empts an ordering claim it could not support.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A function refusing everything and a schema
 * refusing every query each pass a refusal case written on its own,
 * so the control has to be in the same case and has to differ from
 * the refused input in exactly the thing under test: the same
 * filter, sort and window under a slug that resolves; the same
 * three-read call under an id that resolves; the same parse under a
 * key the tuple declares; the same two stamps the right way round.
 *
 * THAT A SLUG NAMING NO DOMAIN IS A 404 RATHER THAN AN EMPTY PAGE.
 * That distinction is the whole reason `listFindings` reads the
 * domain at all: `FindingStore` answers an empty list and a count
 * of `0` for an id no domain carries, both correctly, so a function
 * that skipped the lookup would answer a mistyped slug exactly as
 * it answers a domain whose scoring pass has not run. Two readings
 * make the claim rather than one. The finding reads are never
 * ISSUED, counted off a store that tallies all seven methods, with
 * the same tally taken over a slug that resolves in the same case —
 * a lookup moved below the reads passes the status assertion and
 * fails this one. And findings really PLANTED under a domain id no
 * row carries are still refused, which is the reading that says the
 * 404 comes from the lookup rather than from there being nothing to
 * answer. `getFinding` is held to both readings one function over,
 * where the cost of getting the ordering wrong is three reads
 * rather than two.
 *
 * THAT THE SORT AND THE WINDOW ARE REFUSED AT THE BOUNDARY AND NOT
 * IN THE SERVICE. Every one of those rows is submitted to
 * `parseQuery` over {@link findingListQuerySchema} — the call a
 * router makes — so what is pinned is that no filter, sort or
 * window can be BUILT from a query outside the rules, rather than
 * that something downstream would have caught it. The sort section
 * closes the loop from the other side: every key the tuple declares
 * is parsed and then driven end to end through `listFindings`, so a
 * tuple that had grown a member the port does not take is reported
 * here rather than on the wire.
 *
 * THAT THE COMPOSED QUERY IS WHAT REFUSES AN INVERTED WINDOW, AND
 * NOT THE WINDOW SCHEMA ALONE. `.extend()` carries an object-level
 * check OUTWARDS and never inwards, so a chain built the other way
 * round accepts an inverted window while type-checking and
 * answering every other request identically. The case that reports
 * it submits the two bounds BESIDE every other member this schema
 * declares, which is why it reads as a composition claim rather
 * than as a second copy of `src/http/schemas.test.ts`.
 *
 * THAT NO REFUSAL QUOTES ANYTHING. The containment block counts
 * occurrences of a planted sentinel in each serialised refusal
 * rather than asserting absence, and takes the same count over a
 * planted envelope in the same case — a search that would find
 * nothing anywhere reports a clean refusal and a leaking one alike.
 * The needles are the four things a caller submitted: the slug, the
 * finding id, the sort key, and the two window stamps. Two stored
 * values ride along beside them — a `fields` payload and a
 * sighting's external id, both planted under the missing address —
 * because a refusal composed from a row it had just read would be
 * the leak this rule exists to close.
 *
 * Mutation grid, run whole over this file with `--reporter=json`
 * and read as the failed case SET rather than as a count. Ten legs
 * over the nineteen cases here, every one of them a mutation of
 * `./service.ts`, because nothing in this file rests on the store's
 * own ordering or filtering.
 *
 * The two lookup legs are the sharpest. Comparing the resolved row
 * against `undefined`, so the branch never fires, reddens 4 in the
 * slug section and 4 in the id section — every case in each except
 * the positive control, which resolves an address that is there and
 * could not move. Issuing the reads ABOVE the lookup reddens
 * exactly 1 in each, the counting case, which is the whole reason
 * those two cases count calls at all: every status assertion is
 * green either way.
 *
 * Reversing the `.extend()` direction reddens 3: both inverted-
 * window cases and the containment case that submits one, since a
 * query that is no longer refused reaches the helper's own throw.
 * Reordering `FINDING_SORT_KEYS` reddens exactly 1, the default
 * case — and only because that case reads the tuple's first member
 * AND the word `score`, a case reading the tuple alone moving both
 * sides of its assertion together.
 *
 * The two quoting legs are what the containment block is for.
 * Composing the slug into its refusal reddens exactly 1 and
 * composing the id into its own reddens exactly 1, disjoint,
 * because the two refusals are separate cases.
 *
 * TWO LEGS REDDEN NOTHING AND SAYING SO IS THE POINT. Dropping the
 * filter from the count read, so a page's `total` describes a
 * different collection, reddens 0 — no case here narrows, every
 * planted filter being the unbounded one. Swapping two of the
 * single get's three embedded lists reddens 0 — all three fixtures
 * carry one row, so a case reading lengths cannot separate them.
 * Both are the next task's to close, and a reader taking this
 * file's green for a claim about either would be taking it for more
 * than it is.
 */
import type {
  FindingListQuery,
  FindingsServiceStore,
} from './service.js';
import type { FindingFilter, FindingRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryDomainFinding,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import { AppError, NotFoundError } from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { toStoreWindow, toTimeWindow } from '../http/schemas.js';
import { parseQuery } from '../http/validation.js';

import {
  FINDING_SORT_KEYS,
  findingListQuerySchema,
  getFinding,
  listFindings,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/**
 * A slug shaped like one and carried by no domain in any case here.
 *
 * SENTINEL-SHAPED ON PURPOSE, so the containment block's count of
 * it in a refusal is a reading of the refusal rather than a
 * coincidence of wording. It still satisfies `slugParamSchema`,
 * because what is under test is a slug that PARSED and resolved to
 * nothing, not a segment the boundary would have refused.
 */
const MISSING_SLUG = 'zzsentinelslugzz';

/** An id shaped like one and carried by no finding in any case. */
const MISSING_ID = 9999;

/** A domain id no `domains` row carries, for the plant below. */
const MISSING_DOMAIN_ID = 8888;

/** The entity the attributed finding names. */
const ENTITY_ID = 501;

/** A sort key shaped like one and outside {@link FINDING_SORT_KEYS}. */
const MISSING_SORT = 'zzsentinelsortzz';

/** A category value planted in a stored `fields` payload. */
const SENTINEL_FIELD = 'zzsentinelfieldzz';

/** The lower bound of every inverted window submitted here. */
const LATER_STAMP = '2026-03-02T00:00:00.000Z';

/** The upper bound of every inverted window submitted here. */
const EARLIER_STAMP = '2026-03-01T00:00:00.000Z';

/**
 * A window wider than any page planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would make
 * each refusal depend on where its rows happened to fall. What a
 * window SELECTS is the next task's half, and the case that parses
 * a `perPage` above the schema's ceiling is not this file's.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * The filter that narrows nothing: no verdict, no category, and an
 * unbounded window.
 *
 * `window` is REQUIRED and unbounded is two nulls rather than an
 * omitted member, which is what `FindingFilter` declares and what
 * `toTimeWindow` answers for a query carrying neither bound.
 */
const EVERY_FINDING: FindingFilter = {
  window: { sinceInclusive: null, untilExclusive: null },
};

/**
 * The three findings {@link plantFindings} gives {@link RADAR}.
 *
 * PLANTED RATHER THAN WRITTEN, because `FindingStore` declares no
 * insert at all: `src/findings/store.ts` states that the absence IS
 * the read-first rule, so `MemoryResearchStore.setDomainFindings`
 * is the only way this table gets rows and every read below would
 * otherwise answer an empty page.
 *
 * The three differ along the axes the refusals here need and along
 * no others: one is attributed to an entity and two are not, one
 * carries no score at all, and one carries the sentinel category so
 * the containment block has a stored value to look for. What the
 * ORDER of them is belongs to the next task, which is why every
 * assertion below reads a count or a membership rather than a
 * position.
 */
const PLANTED_FINDINGS: readonly MemoryDomainFinding[] = [
  {
    id: 11,
    documentId: 1,
    entityId: ENTITY_ID,
    fields: { category: SENTINEL_FIELD },
    score: 0.9,
    scoreVersion: 1,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
  },
  {
    id: 12,
    documentId: 2,
    entityId: null,
    fields: { category: 'people' },
    score: 0.4,
    scoreVersion: 1,
    createdAt: new Date('2026-03-02T00:00:00.000Z'),
  },
  {
    id: 13,
    documentId: 3,
    entityId: null,
    fields: {},
    score: null,
    scoreVersion: null,
    createdAt: new Date('2026-03-03T00:00:00.000Z'),
  },
];

/** How many findings {@link plantFindings} gives its domain. */
const PLANTED_COUNT = PLANTED_FINDINGS.length;

/** A domain holding {@link PLANTED_FINDINGS}, and the store. */
interface PlantedDomain {
  /** The store, holding {@link RADAR} and its three findings. */
  readonly store: MemoryResearchStore;

  /** The id `RADAR` resolved to, for the direct port reads. */
  readonly domainId: number;

  /** The id of the finding every single-get case addresses. */
  readonly findingId: number;
}

/**
 * Plants that shape.
 *
 * @returns The store, the domain's id and one finding's id.
 */
async function plantFindings(): Promise<PlantedDomain> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });

  store.setDomainFindings(domain.id, PLANTED_FINDINGS);
  store.setFindingSightings(11, [
    {
      id: 21,
      sourceId: 31,
      externalId: 'radar-11',
      seenAt: new Date('2026-03-01T01:00:00.000Z'),
    },
  ]);
  store.setEntityResearch(ENTITY_ID, [
    {
      id: 41,
      runId: 51,
      summary: 'what a pass made of it',
      payload: { note: 'stored' },
      researchedAt: new Date('2026-03-01T02:00:00.000Z'),
    },
  ]);
  await store.insertFindingLabel({
    findingId: 11,
    verdict: 'confirmed',
    note: null,
  });

  return { store, domainId: domain.id, findingId: 11 };
}

/** How many times each read these two functions issue was issued. */
interface ReadCounts {
  /** Lookups of the domain a list path named. */
  findDomainBySlug: number;

  /** Reads of one window of that domain's findings. */
  listFindings: number;

  /** Reads of how many the same filter selects. */
  countFindings: number;

  /** Lookups of the finding a single-get path named. */
  findFindingById: number;

  /** Reads of where one finding has been seen. */
  listFindingSightings: number;

  /** Reads of one finding's rulings. */
  listFindingLabels: number;

  /** Reads of its entity's research. */
  listFindingResearch: number;
}

/** A tally with every member at zero. */
const NO_READS: ReadCounts = {
  findDomainBySlug: 0,
  listFindings: 0,
  countFindings: 0,
  findFindingById: 0,
  listFindingSightings: 0,
  listFindingLabels: 0,
  listFindingResearch: 0,
};

/**
 * The seven-method port with a tally beside it.
 *
 * A COUNTING WRAPPER RATHER THAN A STUB: every call is forwarded to
 * the planted store, so a case reading the tally is reading a call
 * that really happened and really answered. A stub would pin the
 * ordering and lose every other claim in the same case.
 *
 * @param store - Where the calls go.
 * @returns The port to hand the functions, and the tally it fills.
 */
function countingStore(store: MemoryResearchStore): {
  counted: FindingsServiceStore;
  calls: ReadCounts;
} {
  const calls: ReadCounts = { ...NO_READS };
  const counted: FindingsServiceStore = {
    findDomainBySlug(slug) {
      calls.findDomainBySlug += 1;

      return store.findDomainBySlug(slug);
    },
    listFindings(domainId, filter, sort, window) {
      calls.listFindings += 1;

      return store.listFindings(domainId, filter, sort, window);
    },
    countFindings(domainId, filter) {
      calls.countFindings += 1;

      return store.countFindings(domainId, filter);
    },
    findFindingById(id) {
      calls.findFindingById += 1;

      return store.findFindingById(id);
    },
    listFindingSightings(findingId) {
      calls.listFindingSightings += 1;

      return store.listFindingSightings(findingId);
    },
    listFindingLabels(findingId) {
      calls.listFindingLabels += 1;

      return store.listFindingLabels(findingId);
    },
    listFindingResearch(findingId) {
      calls.listFindingResearch += 1;

      return store.listFindingResearch(findingId);
    },
  };

  return { counted, calls };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so a refusal that quietly stopped
 *   happening fails here — naming the refusal it wanted — rather
 *   than asserting over an error nobody built. Anything that is not
 *   an `AppError` is rethrown unchanged.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * Parses a query the composed schema has to refuse, and hands back
 * the refusal.
 *
 * @param query - The query string members, as Express hands them.
 * @returns The `AppError` the parse raised.
 * @throws When the parse ANSWERED, so a rule that quietly stopped
 *   being enforced fails here rather than leaving a case asserting
 *   over an error nobody built. Anything that is not an `AppError`
 *   is rethrown unchanged.
 */
function refusalFromQuery(query: Record<string, string>): AppError {
  try {
    parseQuery(findingListQuerySchema, query);
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refused query, and the parse answered');
}

/**
 * The filter a router rebuilds from a parsed query.
 *
 * The two calls a list handler makes between the parse and the
 * service, spelled here so a case can drive the store with a query
 * that really went through {@link findingListQuerySchema} rather
 * than with a filter written by hand.
 *
 * @param query - The parsed query.
 * @returns What `FindingStore` narrows on.
 */
function filterFrom(query: FindingListQuery): FindingFilter {
  return {
    verdict: query.verdict,
    category: query.category,
    window: toTimeWindow(query),
  };
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them: every detail here was built by
 * `src/http/validation.ts`, whose wording is asserted in that
 * module's own file.
 *
 * @param details - `err.details`, absent when nothing built any.
 * @returns One `{ field, code }` per detail, in the order raised.
 */
function detailsOf(
  details: readonly FieldError[] | undefined,
): { field: string; code: string }[] {
  return [...details ?? []].map((detail) => ({
    field: detail.field,
    code: detail.code ?? '',
  }));
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * @param rows - The page a read answered.
 * @returns The ids in it, for a membership reading that says
 *   nothing about the order — which belongs to the next task.
 */
function idsOf(rows: readonly FindingRecord[]): number[] {
  return [...rows].map((row) => row.id).sort((left, right) => left - right);
}

// ---------------------------------------------------------------------------
// A slug that names no domain
// ---------------------------------------------------------------------------

describe('a slug that names no domain', () => {
  it('answers 404', async () => {
    const { store } = await plantFindings();
    const refusal = await refusalFrom(() => listFindings(
      store,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers a page for a slug that is', async () => {
    // The positive control for the case above, varied along the one
    // axis under test: the same filter, the same sort, the same
    // window, a slug that resolves. A function refusing everything
    // passes the refusal and fails this.
    const { store } = await plantFindings();
    const page = await listFindings(
      store,
      RADAR,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    );

    expect(idsOf(page.rows)).toEqual([11, 12, 13]);
    expect(page.total).toBe(PLANTED_COUNT);
  });

  it('reads no finding before it refuses', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a lookup moved below the two reads answers the same 404
    // having already scanned the corpus for a domain that is not
    // there. Counted rather than asserted absent, and the control is
    // the same tally taken over a slug that resolves — a wrapper
    // that had stopped counting reports zero for both.
    const { store } = await plantFindings();
    const refused = countingStore(store);

    await refusalFrom(() => listFindings(
      refused.counted,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));

    expect(refused.calls).toEqual({ ...NO_READS, findDomainBySlug: 1 });

    const answered = countingStore(store);

    await listFindings(
      answered.counted,
      RADAR,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    );

    expect(answered.calls).toEqual({
      ...NO_READS,
      findDomainBySlug: 1,
      listFindings: 1,
      countFindings: 1,
    });
  });

  it('refuses though findings are planted', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from there being nothing to answer. The planting seam
    // takes a domain id that names no row on purpose, so this state
    // is reachable: findings really are there, the port answers them
    // to whoever asks it directly, and the refusal is still what a
    // slug naming no domain gets.
    const { store } = await plantFindings();

    store.setDomainFindings(MISSING_DOMAIN_ID, PLANTED_FINDINGS);

    await expect(
      store.countFindings(MISSING_DOMAIN_ID, EVERY_FINDING),
    ).resolves.toBe(PLANTED_COUNT);

    const refusal = await refusalFrom(() => listFindings(
      store,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// An id that names no finding
// ---------------------------------------------------------------------------

describe('an id that names no finding', () => {
  it('answers 404', async () => {
    const { store } = await plantFindings();
    const refusal = await refusalFrom(() => getFinding(store, MISSING_ID));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers the finding for an id that is', async () => {
    // The positive control, varied along the one axis under test: an
    // id that resolves. What the three embedded lists CARRY is the
    // next task's half; what this reads is that an id resolving is
    // enough for the four members to be built at all.
    const { store, findingId } = await plantFindings();
    const detail = await getFinding(store, findingId);

    expect(detail.finding.id).toBe(findingId);
    expect(detail.sightings).toHaveLength(1);
    expect(detail.labels).toHaveLength(1);
    expect(detail.research).toHaveLength(1);
  });

  it('reads no embedded list before it refuses', async () => {
    // The same ordering claim one function over, and it costs three
    // reads rather than two. The control is the same tally over an
    // id that resolves, in the same case.
    const { store, findingId } = await plantFindings();
    const refused = countingStore(store);

    await refusalFrom(() => getFinding(refused.counted, MISSING_ID));

    expect(refused.calls).toEqual({ ...NO_READS, findFindingById: 1 });

    const answered = countingStore(store);

    await getFinding(answered.counted, findingId);

    expect(answered.calls).toEqual({
      ...NO_READS,
      findFindingById: 1,
      listFindingSightings: 1,
      listFindingLabels: 1,
      listFindingResearch: 1,
    });
  });

  it('refuses an id sightings were planted under', async () => {
    // The lookup is what refuses, not the embedded reads. The
    // sightings seam takes an id that names no planted finding on
    // purpose, so rows really are reachable under the missing id and
    // the 404 is still the answer.
    const { store } = await plantFindings();

    store.setFindingSightings(MISSING_ID, [
      {
        id: 22,
        sourceId: 32,
        externalId: SENTINEL_FIELD,
        seenAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ]);

    await expect(
      store.listFindingSightings(MISSING_ID),
    ).resolves.toHaveLength(1);

    const refusal = await refusalFrom(() => getFinding(store, MISSING_ID));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A sort outside the declared tuple
// ---------------------------------------------------------------------------

describe('a sort outside the declared tuple', () => {
  it('refuses the key at the boundary', async () => {
    const refusal = refusalFromQuery({ sort: MISSING_SORT });

    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'sort', code: 'invalid_value' },
    ]);

    // The control, inside the case and varied along this row's own
    // axis: the same parse with a key the tuple DOES declare. A
    // schema refusing every sort passes the assertions above and
    // fails this one.
    const taken = parseQuery(findingListQuerySchema, {
      sort: FINDING_SORT_KEYS[0],
    });

    expect(taken.sort).toBe(FINDING_SORT_KEYS[0]);
  });

  it('takes every key the tuple declares', async () => {
    // The whole tuple rather than its first member, so a key added
    // to `FINDING_SORT_KEYS` and refused by the schema is reported
    // here rather than discovered on the wire. The fabricated key is
    // asserted absent in the same case, which is what makes the
    // membership above discriminating.
    const parsed = FINDING_SORT_KEYS.map(
      (key) => parseQuery(findingListQuerySchema, { sort: key }).sort,
    );

    expect(parsed).toEqual([...FINDING_SORT_KEYS]);
    expect([...FINDING_SORT_KEYS]).not.toContain(MISSING_SORT);
  });

  it('defaults an absent sort to the first key', async () => {
    // The tuple states its own default by its ORDER, per
    // `sortQuerySchema`, so this reads the tuple rather than a
    // transcribed word: reordering `FINDING_SORT_KEYS` moves both
    // sides of the assertion together and reordering only one of
    // them is what fails.
    const empty = parseQuery(findingListQuerySchema, {});

    expect(empty.sort).toBe(FINDING_SORT_KEYS[0]);
    expect(FINDING_SORT_KEYS[0]).toBe('score');
  });

  it('drives the store with each declared key', async () => {
    // What ties the tuple to the port: every key the schema takes is
    // an ordering `FindingStore.listFindings` accepts, driven end to
    // end over the planted rows. Which ORDER each answers in belongs
    // to the next task, so this reads membership and a total.
    const { store } = await plantFindings();

    for (const key of FINDING_SORT_KEYS) {
      const query = parseQuery(findingListQuerySchema, { sort: key });
      const page = await listFindings(
        store,
        RADAR,
        filterFrom(query),
        query.sort,
        toStoreWindow(query),
      );

      expect(idsOf(page.rows)).toEqual([11, 12, 13]);
      expect(page.total).toBe(PLANTED_COUNT);
    }
  });
});

// ---------------------------------------------------------------------------
// A window that is not ordered
// ---------------------------------------------------------------------------

describe('a window that is not ordered', () => {
  it('refuses a since equal to its until', async () => {
    const refusal = refusalFromQuery({
      since: EARLIER_STAMP,
      until: EARLIER_STAMP,
    });

    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'custom' },
    ]);

    // The control, varied along this row's own axis: the same pair
    // with `until` moved past `since`. A schema refusing every
    // two-bound window passes the assertions above and fails this.
    const taken = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
      until: LATER_STAMP,
    });

    expect(toTimeWindow(taken).untilExclusive)
      .toEqual(new Date(LATER_STAMP));
  });

  it('refuses a since after its until', async () => {
    // Submitted BESIDE every other member this schema declares,
    // which is the reading that says the composed query refuses
    // rather than the window schema alone. `.extend()` carries an
    // object-level check outwards and not inwards, so a chain built
    // the other way round accepts this and fails nowhere else.
    const refusal = refusalFromQuery({
      since: LATER_STAMP,
      until: EARLIER_STAMP,
      sort: 'recency',
      page: '2',
      perPage: '10',
      category: 'people',
      verdict: 'confirmed',
    });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'custom' },
    ]);

    // The control, same members, the two bounds the right way round.
    const taken = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
      until: LATER_STAMP,
      sort: 'recency',
      page: '2',
      perPage: '10',
      category: 'people',
      verdict: 'confirmed',
    });

    expect(taken.page).toBe(2);
    expect(taken.verdict).toBe('confirmed');
  });

  it('takes either bound alone and neither', async () => {
    // The half-bounded controls, which the two cases above cannot
    // supply: a schema refusing every window carrying ONE bound
    // leaves both of them green, and only these three readings
    // report it. The unbounded one is what `EVERY_FINDING` above is
    // derived from, so it is read here rather than assumed.
    const lower = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
    });
    const upper = parseQuery(findingListQuerySchema, {
      until: LATER_STAMP,
    });
    const neither = parseQuery(findingListQuerySchema, {});

    expect(toTimeWindow(lower)).toEqual({
      sinceInclusive: new Date(EARLIER_STAMP),
      untilExclusive: null,
    });
    expect(toTimeWindow(upper)).toEqual({
      sinceInclusive: null,
      untilExclusive: new Date(LATER_STAMP),
    });
    expect(toTimeWindow(neither)).toEqual(EVERY_FINDING.window);
  });

  it('refuses an undeclared query parameter', async () => {
    // What says `.strict()` survived three `.extend()` calls. An
    // undeclared parameter is a `422` naming the CONTAINER rather
    // than a narrowing quietly dropped, and the detail names `query`
    // because `src/http/validation.ts` never reads `issue.keys`.
    const refusal = refusalFromQuery({ [MISSING_SORT]: 'anything' });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'query', code: 'unrecognized_keys' },
    ]);

    // The control: the same parse with that key removed and every
    // declared one present. A schema refusing every query passes the
    // assertions above and fails this.
    const taken = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
      sort: 'score',
      page: '1',
    });

    expect(taken.page).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// What a refusal carries
// ---------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes neither the slug nor a planted finding', async () => {
    const { store } = await plantFindings();

    store.setDomainFindings(MISSING_DOMAIN_ID, PLANTED_FINDINGS);

    const needles = [MISSING_SLUG, SENTINEL_FIELD];
    const refusal = await refusalFrom(() => listFindings(
      store,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));
    const answered = JSON.stringify(refusal.toJSON());

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 0 })));

    // The search would find them: a planted envelope carrying both
    // needles is counted by the same function in the same case, so
    // the zeros above are a reading rather than a search that could
    // only ever answer nothing.
    const planted = JSON.stringify({
      code: 'NOT_FOUND',
      message: `no domain ${MISSING_SLUG} filing ${SENTINEL_FIELD}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 1 })));

    // The envelope was built at all: a helper answering an empty
    // string would satisfy every count above.
    expect(answered.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the id nor a planted sighting', async () => {
    const { store } = await plantFindings();

    store.setFindingSightings(MISSING_ID, [
      {
        id: 22,
        sourceId: 32,
        externalId: SENTINEL_FIELD,
        seenAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ]);

    const needles = [String(MISSING_ID), SENTINEL_FIELD];
    const refusal = await refusalFrom(() => getFinding(store, MISSING_ID));
    const answered = JSON.stringify(refusal.toJSON());

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 0 })));

    const planted = JSON.stringify({
      code: 'NOT_FOUND',
      message: `no finding ${MISSING_ID} seen as ${SENTINEL_FIELD}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 1 })));

    expect(answered.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the sort key nor the window', async () => {
    // The two boundary refusals, whose submitted values are a key a
    // caller chose and two stamps it sent. `src/http/validation.ts`
    // copies the issue's CODE and a fixed sentence and never
    // `issue.message`, in which zod quotes both — so what this reads
    // is that the parse went through that module rather than through
    // a raw `.parse()`.
    const sorted = refusalFromQuery({ sort: MISSING_SORT });
    const windowed = refusalFromQuery({
      since: LATER_STAMP,
      until: EARLIER_STAMP,
    });
    const needles = [MISSING_SORT, LATER_STAMP, EARLIER_STAMP];
    const answered = [sorted, windowed]
      .map((refusal) => JSON.stringify(refusal.toJSON()))
      .join(' ');

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 0 })));

    const planted = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: `${MISSING_SORT} ${LATER_STAMP} ${EARLIER_STAMP}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 1 })));

    // Both envelopes carry their details, so the zeros above are
    // taken over text that really described the two faults.
    expect(detailsOf(sorted.details as FieldError[] | undefined))
      .toHaveLength(1);
    expect(detailsOf(windowed.details as FieldError[] | undefined))
      .toHaveLength(1);
  });
});
