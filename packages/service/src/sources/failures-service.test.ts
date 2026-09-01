/**
 * `src/sources/failures-service.ts` — what the review queue
 * refuses. Driven over `tests/helpers/memory-research-store.ts`, so
 * every claim here is answered with no database anywhere.
 *
 * THREE CLAIMS IN TWO SECTIONS, AND EVERY ONE IS ABOUT SOMETHING
 * BEING REFUSED. What this function lets through — the masked body,
 * the cap, the order of a page — is the half below this file rather
 * than a gap in it. Each claim carries the narrow CONTROL its
 * refusal needs, varied along the one axis that refusal turns on,
 * because a function refusing everything passes every assertion a
 * refusal case makes on its own.
 *
 * THAT AN `:id` NAMING NO SOURCE IS A 404 RATHER THAN AN EMPTY
 * QUEUE. That distinction is the whole reason this function reads
 * the source at all: `SourceStore` answers an empty list and a
 * count of `0` for an id no row carries, both correctly, so a
 * function that skipped the lookup would answer a mistyped id
 * exactly as it answers a feed that has never broken. Two readings
 * make the claim rather than one. The document reads are never
 * ISSUED, counted off a store that records which of its three
 * methods were called, with the same counts taken over an id that
 * resolves in the same case — a lookup moved below the reads passes
 * the status assertion and fails this one. And a queue really
 * PLANTED under the missing id is still refused, which is the
 * reading that says the 404 comes from the lookup rather than from
 * there being nothing to answer.
 *
 * THAT THE WINDOW IS REFUSED AT THE BOUNDARY AND NOT HERE. Every
 * row of the query table is submitted to `parseQuery` over
 * `paginationQuerySchema` — the two calls a router makes, in the
 * order it makes them — so what is pinned is that no `StoreWindow`
 * can be BUILT from a query outside the bounds, rather than that
 * something downstream would have caught it. The control is the
 * largest legal `perPage` parsed through the same pair and driven
 * end to end, so a schema that had started refusing everything
 * fails it. Beside them sits the complementary reading, which is
 * this function's own: a window handed to it directly is answered
 * whatever its limit, because the bounds are `src/http/schemas.ts`'
 * claim and a second check here would be a second rule nobody would
 * notice drifting from the first.
 *
 * THAT NEITHER REFUSAL QUOTES ANYTHING. The containment block
 * counts occurrences of a sentinel in the serialised refusal rather
 * than asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. The needles are the id
 * that was asked for and a stored body planted under it, which is
 * the channel this surface has and no other resource group does: a
 * document that broke a parser is the last text in the corpus that
 * should reach a log line through an error message.
 *
 * Mutation grid, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count. Eight legs over
 * the fourteen cases here: six mutate `./failures-service.ts`, and
 * two mutate `src/http/schemas.ts`, which is the only target that
 * can reach the bounds this file submits queries against.
 *
 * Comparing the lookup's null against `undefined`, so the branch
 * never fires, reddens 4 — every case in the id section except the
 * positive control, which resolves an id that is there and could
 * not move. Issuing the lookup BELOW the two document reads reddens
 * exactly 1, the counting case, which is the whole reason that case
 * counts calls at all: every status assertion is green either way.
 *
 * Taking `total` from the rows in hand rather than from
 * `countSourceFailures` reddens exactly that same one case, and the
 * reason is this file's shape rather than thin coverage. Its one
 * window is wider than the planted queue, so the two numbers agree
 * and the CALL is the only channel left; the number itself needs a
 * window narrower than its collection, which belongs to the half
 * below.
 *
 * The two body legs redden ZERO and are recorded rather than
 * repaired. Removing the cut and removing the mask each leave every
 * case here green, because nothing in a refusals file reads an
 * answered row: the cap, the escape form, `bodyBytes` and
 * `bodyTruncated` are that half's, and
 * `src/http/control-bytes.test.ts` is where the two passes
 * themselves are pinned.
 *
 * The three window legs are two-directional, and neither direction
 * is reachable from the other. Re-checking the window inside this
 * module reddens exactly the case named for it. Dropping the
 * ceiling from `paginationQuerySchema` reddens exactly the
 * above-the-cap row, and LOWERING that ceiling to a hundred reddens
 * exactly the control that parses the largest legal one — so a
 * schema that had stopped enforcing the bound and one that had
 * started refusing legal windows are reported by different cases.
 */
import type { SourceFailuresServiceStore } from './failures-service.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
  MemorySourceDocument,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import { AppError, NotFoundError } from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import {
  paginationQuerySchema,
  toStoreWindow,
} from '../http/schemas.js';
import { parseQuery } from '../http/validation.js';

import { listSourceFailures } from './failures-service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** An id shaped like one and carried by no source in any case here. */
const MISSING_ID = 9999;

/** The feed the fixture reads {@link RADAR} through. */
const RADAR_FEED = 'https://example.test/radar/feed.xml';

/** A second address under {@link RADAR}, whose captures all parsed. */
const RADAR_ITEMS = 'https://example.test/radar/items';

/**
 * A window wider than any queue planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would make
 * each refusal depend on where its rows happened to fall. What a
 * window SELECTS is the section below this one, and the case that
 * reads a limit above the schema's ceiling passes its own.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * Text planted in a stored body, for the containment block to look
 * for in a refusal that must not carry it.
 *
 * Shaped like nothing this module writes, so a hit is the stored
 * value rather than a coincidence of wording.
 */
const SENTINEL_BODY = 'zzsentinelbodyzz';

/**
 * A domain, two sources and one queue, and the store holding them.
 *
 * The documents are PLANTED rather than written, because no port
 * writes a `documents` row at all — `src/sources/store.ts` states
 * the absence IS the read-only rule — so
 * `MemoryResearchStore.setSourceDocuments` is the only way this
 * table gets rows, and the queue would otherwise be empty under
 * every case here.
 */
interface PlantedQueue {
  /** The store, holding {@link RADAR} and its two sources. */
  readonly store: MemoryResearchStore;

  /** The source whose captures include failures. */
  readonly feedId: number;

  /**
   * A second source of the same domain, whose captures all parsed.
   *
   * Not the subject of any case here, and planted anyway: an id
   * that resolves and holds no failure is what the positive control
   * for the 404 wants, since a control whose page happened to carry
   * rows would pass against a function answering any page at all.
   */
  readonly quietId: number;
}

/** How many failed captures {@link plantQueue} gives its feed. */
const PLANTED_FAILURES = 3;

/**
 * Plants that shape.
 *
 * @returns The store and the two source ids.
 */
async function plantQueue(): Promise<PlantedQueue> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const feed = await store.insertSource({
    domainId: domain.id,
    kind: 'rss',
    endpoint: RADAR_FEED,
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const quiet = await store.insertSource({
    domainId: domain.id,
    kind: 'api',
    endpoint: RADAR_ITEMS,
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  store.setSourceDocuments(feed.id, [
    ...Array.from(
      { length: PLANTED_FAILURES },
      (_unused, index): MemorySourceDocument => ({
        id: 100 + index,
        url: `${RADAR_FEED}#${index}`,
        body: `a capture that would not parse (${index})`,
        parseError: 'unexpected end of input',
        capturedAt: new Date('2026-02-01T00:00:00.000Z'),
        parseStatus: 'failed',
      }),
    ),
    {
      id: 200,
      url: `${RADAR_FEED}#ok`,
      body: 'a capture that parsed',
      parseError: null,
      capturedAt: new Date('2026-02-02T00:00:00.000Z'),
      parseStatus: 'ok',
    },
  ]);
  store.setSourceDocuments(quiet.id, [
    {
      id: 300,
      url: `${RADAR_ITEMS}#ok`,
      body: 'a capture that parsed',
      parseError: null,
      capturedAt: new Date('2026-02-03T00:00:00.000Z'),
      parseStatus: 'ok',
    },
  ]);

  return { store, feedId: feed.id, quietId: quiet.id };
}

/** How many times each read this function can issue was issued. */
interface ReadCounts {
  /** Lookups of the source the path named. */
  findSourceById: number;

  /** Reads of one window of that source's failed captures. */
  listSourceFailures: number;

  /** Reads of how many failed captures it holds. */
  countSourceFailures: number;
}

/**
 * The three-method port with a tally beside it.
 *
 * A COUNTING WRAPPER RATHER THAN A STUB: every call is forwarded to
 * the planted store, so a case reading the tally is reading a call
 * that really happened and really answered. A stub would pin the
 * ordering and lose every other claim in the same case.
 *
 * @param store - Where the calls go.
 * @returns The port to hand the function, and the tally it fills.
 */
function countingStore(store: MemoryResearchStore): {
  counted: SourceFailuresServiceStore;
  calls: ReadCounts;
} {
  const calls: ReadCounts = {
    findSourceById: 0,
    listSourceFailures: 0,
    countSourceFailures: 0,
  };
  const counted: SourceFailuresServiceStore = {
    findSourceById(id) {
      calls.findSourceById += 1;

      return store.findSourceById(id);
    },
    listSourceFailures(sourceId, window) {
      calls.listSourceFailures += 1;

      return store.listSourceFailures(sourceId, window);
    },
    countSourceFailures(sourceId) {
      calls.countSourceFailures += 1;

      return store.countSourceFailures(sourceId);
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
 * Runs the two calls a router makes to build a window, and hands
 * back the refusal one of them raised.
 *
 * @param query - The query string members, as Express hands them.
 * @returns The `AppError` the pair raised.
 * @throws When the pair ANSWERED, so a bound that quietly stopped
 *   being enforced fails here rather than leaving a case asserting
 *   over an error nobody built. Anything that is not an `AppError`
 *   is rethrown unchanged.
 */
function refusalFromWindow(query: Record<string, string>): AppError {
  try {
    toStoreWindow(parseQuery(paginationQuerySchema, query));
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refused window, and the pair answered');
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them: every detail a refused window
 * carries was built by `src/http/validation.ts`, whose wording is
 * asserted in that module's own file.
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

// ---------------------------------------------------------------------------
// An id that names no source
// ---------------------------------------------------------------------------

describe('an id that names no source', () => {
  it('answers 404', async () => {
    const { store } = await plantQueue();
    const refusal = await refusalFrom(
      () => listSourceFailures(store, MISSING_ID, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers a page for an id that is', async () => {
    // The positive control for the case above, varied along the one
    // axis under test: the same window, an id that resolves. A
    // function refusing everything passes the refusal and fails
    // this. The quiet source is deliberate — its page is EMPTY, so
    // what this asserts is that an id resolving is enough, not that
    // rows came back.
    const { store, quietId } = await plantQueue();
    const page = await listSourceFailures(store, quietId, WIDE_WINDOW);

    expect(page.rows).toEqual([]);
    expect(page.total).toBe(0);
  });

  it('reads no document before it refuses', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a lookup moved below the two reads answers the same
    // 404 having already scanned the corpus for a row that is not
    // there. Counted rather than asserted absent, and the control
    // is the same tally taken over an id that resolves — a wrapper
    // that had stopped counting reports zero for both.
    const { store, feedId } = await plantQueue();
    const refused = countingStore(store);

    await refusalFrom(
      () => listSourceFailures(refused.counted, MISSING_ID, WIDE_WINDOW),
    );

    expect(refused.calls).toEqual({
      findSourceById: 1,
      listSourceFailures: 0,
      countSourceFailures: 0,
    });

    const answered = countingStore(store);

    await listSourceFailures(answered.counted, feedId, WIDE_WINDOW);

    expect(answered.calls).toEqual({
      findSourceById: 1,
      listSourceFailures: 1,
      countSourceFailures: 1,
    });
  });

  it('refuses an id a queue was planted under', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from there being nothing to answer. The planting seam
    // takes an id that names no source on purpose, so this state is
    // reachable: rows really are there, and the refusal is still
    // the answer.
    const { store } = await plantQueue();

    store.setSourceDocuments(MISSING_ID, [
      {
        id: 400,
        url: null,
        body: SENTINEL_BODY,
        parseError: 'unexpected end of input',
        capturedAt: new Date('2026-02-04T00:00:00.000Z'),
        parseStatus: 'failed',
      },
    ]);

    // The plant is real: the port answers it to whoever asks the
    // port directly, so the refusal below is this module's decision
    // and not an empty table.
    await expect(store.countSourceFailures(MISSING_ID)).resolves.toBe(1);

    const refusal = await refusalFrom(
      () => listSourceFailures(store, MISSING_ID, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('quotes neither the id nor anything stored under it', async () => {
    const { store } = await plantQueue();

    store.setSourceDocuments(MISSING_ID, [
      {
        id: 400,
        url: null,
        body: SENTINEL_BODY,
        parseError: 'unexpected end of input',
        capturedAt: new Date('2026-02-04T00:00:00.000Z'),
        parseStatus: 'failed',
      },
    ]);

    const needles = [SENTINEL_BODY, String(MISSING_ID)];
    const refusal = await refusalFrom(
      () => listSourceFailures(store, MISSING_ID, WIDE_WINDOW),
    );
    const answered = JSON.stringify(refusal.toJSON());
    const found = needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }));

    expect(found).toEqual(needles.map((needle) => ({
      needle,
      occurrences: 0,
    })));

    // The search would find them: a planted envelope carrying both
    // needles is counted by the same function in the same case, so
    // the zeros above are a reading rather than a search that could
    // only ever answer nothing.
    const planted = JSON.stringify({
      code: 'NOT_FOUND',
      message: `no source ${MISSING_ID} holding ${SENTINEL_BODY}`,
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
});

// ---------------------------------------------------------------------------
// A window the pagination schema refuses
// ---------------------------------------------------------------------------

/** One query no `StoreWindow` may be derived from. */
interface RefusedQuery {
  /** The row label, and what the query gets wrong. */
  readonly label: string;

  /** The query string members, as Express hands them over. */
  readonly query: Record<string, string>;

  /** Which field the one detail names. */
  readonly field: string;

  /** The zod code that detail carries. */
  readonly code: string;
}

/**
 * The largest `perPage` the schema takes, as its own cases pin it.
 *
 * Written out rather than imported, because `MAX_PER_PAGE` in
 * `src/http/schemas.ts` is not exported: this file holds the
 * BOUNDARY rather than the constant, and the row above it and the
 * control below it are what make it one.
 */
const LARGEST_PER_PAGE = '200';

/** Every window fault this route can be asked for. */
const REFUSED_QUERIES: readonly RefusedQuery[] = [
  {
    label: 'a perPage above the cap',
    query: { perPage: '201' },
    field: 'perPage',
    code: 'too_big',
  },
  {
    label: 'a perPage of zero',
    query: { perPage: '0' },
    field: 'perPage',
    code: 'too_small',
  },
  {
    label: 'a perPage that is not a number',
    query: { perPage: 'many' },
    field: 'perPage',
    code: 'invalid_type',
  },
  {
    label: 'a page of zero',
    query: { page: '0' },
    field: 'page',
    code: 'too_small',
  },
  {
    label: 'a page that is not whole',
    query: { page: '1.5' },
    field: 'page',
    code: 'invalid_type',
  },
  {
    // The one row whose detail names the QUERY rather than a member
    // of it: `.strict()` answers once at its own root however many
    // undeclared keys were submitted, and the key itself is
    // deliberately not in the detail.
    label: 'a parameter this route does not declare',
    query: { page: '1', sort: 'newest' },
    field: 'query',
    code: 'unrecognized_keys',
  },
];

describe('a window the pagination schema refuses', () => {
  it('names both members of the window and the query itself', () => {
    // A table guard rather than a claim about the schema: a row
    // deleted from the list leaves every case below still passing,
    // and this is what reports it.
    expect([...new Set(REFUSED_QUERIES.map((row) => row.field))].sort())
      .toEqual(['page', 'perPage', 'query']);
  });

  for (const row of REFUSED_QUERIES) {
    it(`refuses ${row.label} before any window exists`, () => {
      // Submitted to the two calls a router makes, in the order it
      // makes them, so what is pinned is that no window can be
      // BUILT from this query — not that something downstream
      // would have caught it.
      const refusal = refusalFromWindow(row.query);

      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([{ field: row.field, code: row.code }]);
    });
  }

  it('takes the largest window it declares, end to end', async () => {
    // The positive control for every row above, varied along the
    // one axis they turn on: the same two calls over a query one
    // step inside the boundary, and the window that answers driven
    // through the function itself. A schema refusing everything
    // fails here and passes all six.
    const { store, feedId } = await plantQueue();
    const window = toStoreWindow(
      parseQuery(paginationQuerySchema, { perPage: LARGEST_PER_PAGE }),
    );

    expect(window).toEqual({ limit: Number(LARGEST_PER_PAGE), offset: 0 });

    const page = await listSourceFailures(store, feedId, window);

    expect(page.total).toBe(PLANTED_FAILURES);
    expect(page.rows).toHaveLength(PLANTED_FAILURES);
  });

  it('re-checks nothing about the window it is handed', async () => {
    // The complementary reading, and this function's own: the
    // bounds are the boundary's claim, so a window built by hand
    // above the ceiling is ANSWERED. A second check here would be a
    // second rule nobody would notice drifting from the first, and
    // this case is what would report one arriving.
    const { store, feedId } = await plantQueue();
    const beyond: StoreWindow = {
      limit: Number(LARGEST_PER_PAGE) + 1,
      offset: 0,
    };
    const page = await listSourceFailures(store, feedId, beyond);

    expect(page.total).toBe(PLANTED_FAILURES);
    expect(page.rows).toHaveLength(PLANTED_FAILURES);
  });
});
