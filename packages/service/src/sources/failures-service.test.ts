/**
 * `src/sources/failures-service.ts` — what the review queue
 * refuses, and what it lets through. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * SEVEN CLAIMS IN FIVE SECTIONS. The first three are refusals and
 * the last four are what a page carries, and the two halves need
 * opposite controls. A refusal case carries the narrow control its
 * refusal needs, varied along the one axis that refusal turns on,
 * because a function refusing everything passes every assertion a
 * refusal case makes on its own. A positive case carries the wrong
 * answer it was built to separate — the order neither sort column
 * alone produces, the cut a UTF-16 slice would have made, the
 * control byte the stored value really held — because an
 * assertion over a value nothing could have got wrong is green
 * against every implementation there is.
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
 * THAT A PAGE IS ORDERED, BOUNDED AND FILTERED BY THE PORT. The
 * ordering fixture is three rows whose right order is neither sort
 * column's alone: two share an instant and the third is older and
 * carries the largest id, so `capturedAt` alone, `id` alone and
 * either of them ascending each answer something different from
 * the one right answer. A window past the end is an empty page
 * beside a `total` that still describes the whole queue, with the
 * same limit at offset zero in the same case as its control — and
 * that is this file's one window NARROWER than its collection, so
 * it is also where the rows in hand and the counted total can
 * disagree. A source whose captures all parsed is an empty page
 * too, with the parse-status aggregate read in the same case to
 * say the rows really are stored.
 *
 * THAT WHAT IS MASKED IS RE-READ RATHER THAN ASSERTED ABSENT. The
 * reader is numeric and shares nothing with the module's pattern,
 * so it cannot agree with a masking regex however wrong that regex
 * is, and every zero it answers over an ANSWERED value sits beside
 * a non-zero it answers over the STORED one in the same case. Both
 * members are covered separately, because a mask reaching `body`
 * alone leaves a parse error raw and a mask applied unconditionally
 * throws on the null one.
 *
 * THAT THE CAP CUTS BY CODE POINT AND REPORTS THE STORED LENGTH.
 * The boundary is read from both sides: a body of exactly
 * {@link BODY_CODE_POINT_CAP} code points comes back whole with
 * `bodyTruncated` false, and one an overshoot past it comes back at
 * the cap with the STORED byte count still answered. The lengths
 * are derived from the exported constant rather than transcribed,
 * so a cap that moved takes the fixtures with it.
 *
 * THAT THE CUT ITSELF MANUFACTURES NO LONE SURROGATE. One BMP
 * character then astral ones puts every pair boundary on an odd
 * UTF-16 index, so the even cap falls between two halves of one,
 * and the case reads the naive cut of the SAME body at the SAME cap
 * as its own control: that slice carries exactly one lone high
 * surrogate. The answer carries neither a raw surrogate nor the
 * escape the mask would have written for one.
 *
 * Mutation grid, re-run whole over this file with `--reporter=json`
 * and read as the failed case SET rather than as a count. Eighteen
 * legs over the twenty-three cases here: twelve mutate
 * `./failures-service.ts`, two mutate `src/http/schemas.ts` (the
 * only target that can reach the bounds this file submits queries
 * against), one mutates `src/http/control-bytes.ts`, and three
 * mutate `tests/helpers/memory-research-store.ts`, because the
 * page's ORDER and its `failed` filter are the STORE's and no
 * mutation of this module reaches either.
 *
 * The five legs recorded before the positive half landed came back
 * at their recorded figures, which is what says they are still
 * live. Comparing the lookup's null against `undefined`, so the
 * branch never fires, reddens 4 — every case in the id section
 * except the positive control, which resolves an id that is there
 * and could not move. Issuing the lookup BELOW the two document
 * reads reddens exactly 1, the counting case, which is the whole
 * reason that case counts calls at all: every status assertion is
 * green either way. Re-checking the window inside this module
 * reddens exactly the case named for it, dropping the ceiling from
 * `paginationQuerySchema` reddens exactly the above-the-cap row,
 * and LOWERING that ceiling to a hundred reddens exactly the
 * control that parses the largest legal one — so a schema that had
 * stopped enforcing the bound and one that had started refusing
 * legal windows are reported by different cases.
 *
 * The `total` leg is TWO legs, and separating them is what the
 * recorded prose could not do. Dropping the count read entirely and
 * answering the rows in hand reddens 2: the counting case, which is
 * the figure recorded before, plus the new past-the-end case.
 * KEEPING the call and only changing the number reddens exactly the
 * second of those — so the call and the number are two claims, and
 * the case that reads a window narrower than its collection is the
 * only one that could ever have reported the second.
 *
 * The two body legs recorded as reddening ZERO no longer do, which
 * is the whole of what this half was for. Removing the cut reddens
 * 2, both cases that plant a body past the cap. Removing the mask
 * from `body` reddens 1 and removing it from `parseError` reddens
 * the other 1, disjoint, because the two members are separate
 * cases. Taking `bodyBytes` from the CUT text rather than the
 * stored row reddens 2 and pinning `bodyTruncated` to false reddens
 * the same 2 — the two rows that were actually cut, since neither
 * number can move on a body that fits.
 *
 * Cutting by UTF-16 unit in `src/http/control-bytes.ts` reddens
 * exactly 1, the astral case, which is the leg that says the cap's
 * composition is pinned here and not only in that module's own
 * file.
 *
 * The three store legs are where the page's shape is pinned.
 * Dropping the `id` tiebreak reddens 2 and running `capturedAt`
 * ascending reddens 4; the second is BLUNT rather than thorough,
 * two of its four being cases in other sections whose fixtures
 * carry two instants and read their rows in order, so score it as
 * the fixture reporting. Dropping the `failed` filter reddens 4
 * across three sections, including both empty-page controls — the
 * filter has no parameter, so the only way to report it is a source
 * whose captures all parsed.
 *
 * Two projection legs cover the key-set pin's runtime half. Adding
 * a `parseStatus` member to the answered row and removing `url`
 * from it each redden 2, the key-set case and one whole-record
 * comparison. Its type half is not a vitest leg at all: planting an
 * OPTIONAL member on `SourceFailure` and running `check-types`
 * answers exactly one diagnostic, a TS2322 at the
 * {@link EVERY_KEY_LISTED} line, and nothing else in the package
 * moves.
 */
import type {
  SourceFailure,
  SourceFailurePage,
  SourceFailuresServiceStore,
} from './failures-service.js';
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

import {
  BODY_CODE_POINT_CAP,
  listSourceFailures,
} from './failures-service.js';

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
// ---------------------------------------------------------------------------
// What a page selects
// ---------------------------------------------------------------------------

/**
 * A capture instant two rows of the ordering fixture share.
 *
 * A TIE IS THE FIXTURE'S SUBJECT RATHER THAN AN ACCIDENT. A batch
 * capture writes many rows inside one statement and `defaultNow()`
 * gives them all one timestamp, so this is the ordinary shape of a
 * real queue and the one `captured_at` alone cannot order.
 */
const TIED_CAPTURE = new Date('2026-03-02T00:00:00.000Z');

/** An instant strictly before {@link TIED_CAPTURE}. */
const EARLIER_CAPTURE = new Date('2026-03-01T00:00:00.000Z');

/**
 * One `failed` capture, as the sections below plant them.
 *
 * @param row - The five members these cases vary between them.
 * @returns The document to plant. `parseStatus` is fixed at
 *   `failed` because that is what a queue holds; the case that
 *   reads the FILTER plants `ok` rows of its own rather than
 *   through here.
 */
function failedCapture(row: {
  readonly id: number;
  readonly url: string | null;
  readonly body: string;
  readonly parseError: string | null;
  readonly capturedAt: Date;
}): MemorySourceDocument {
  return { ...row, parseStatus: 'failed' };
}

/**
 * A domain and one source, with the captures a case names planted
 * under it.
 *
 * A FIXTURE OF ITS OWN RATHER THAN {@link plantQueue}, which every
 * refusal above shares. A refusal turns on a window wider than its
 * queue and an id, and these cases turn on what the rows CARRY —
 * so a shared plant would have each half quietly depending on the
 * other's rows, and a case here would move when a refusal above
 * needed one more.
 *
 * @param captures - The documents to plant, in any order: what the
 *   queue answers is the port's sort and never the plant's.
 * @returns The store, the source the captures hang off, and the
 *   domain holding it.
 */
async function plantCaptures(
  captures: readonly MemorySourceDocument[],
): Promise<{
  store: MemoryResearchStore;
  sourceId: number;
  domainId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const source = await store.insertSource({
    domainId: domain.id,
    kind: 'rss',
    endpoint: RADAR_FEED,
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  store.setSourceDocuments(source.id, captures);

  return { store, sourceId: source.id, domainId: domain.id };
}

/**
 * The members `SourceFailure` declares.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the type lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the type grows a
 * member nothing here learned about.
 *
 * The second direction is the one THIS type needs. Every member
 * below is either a stored column rewritten on the way out or a
 * number describing that rewrite, so a member added beside them is
 * answered to every caller the day it lands — and a queue is where
 * a stored payload reaches a response, which is the one projection
 * on this surface where an unnoticed new member is a disclosure
 * rather than an untidiness.
 */
const FAILURE_KEYS = [
  'body',
  'bodyBytes',
  'bodyTruncated',
  'capturedAt',
  'id',
  'parseError',
  'url',
] as const satisfies readonly (keyof SourceFailure)[];

/** The two members a page carries around its rows. */
const FAILURE_PAGE_KEYS = [
  'rows',
  'total',
] as const satisfies readonly (keyof SourceFailurePage)[];

/**
 * `true` when `L` names every key of `T`, and `false` otherwise.
 *
 * The tuple wrapper around `Exclude` is load-bearing: without it
 * the union distributes, the answer is `boolean`, and a `true`
 * initializer is assignable to it whatever is missing.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** The two lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<SourceFailure, typeof FAILURE_KEYS>
  & CoversEveryKey<SourceFailurePage, typeof FAILURE_PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `SourceFailure` or to `SourceFailurePage` and
 * to neither list above turns {@link EveryKeyListed} into `never` —
 * `false` for the list that missed it, intersected with the `true`
 * the other still answers — and this initializer is then a TS2322
 * at this line, before any case can compare a row against a set
 * that has quietly stopped describing it. Read in a case below, so
 * it is a symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link FAILURE_KEYS}, sorted at use rather than by hand. */
const FAILURE_KEY_SET: readonly string[] = [...FAILURE_KEYS].sort();

/** {@link FAILURE_PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...FAILURE_PAGE_KEYS].sort();

/**
 * Three captures whose right order is not either column's alone.
 *
 * TWO SHARE AN INSTANT AND THE THIRD IS OLDER AND HAS THE LARGEST
 * ID, which is what makes the pair of sort keys separable. The
 * right answer is `[502, 501, 700]`, and each way of getting it
 * wrong answers something else: sorting by `id` alone gives
 * `[700, 502, 501]`, and so does running `capturedAt` ASCENDING,
 * while dropping the tiebreak leaves the tie in the order it was
 * planted and gives `[501, 502, 700]`. THREE wrong answers rather
 * than four, since two of them coincide — recorded rather than
 * tidied away, because what the case needs is that every one of
 * them differs from the right one and not that they differ from
 * each other.
 *
 * Planted oldest-first, so the answered order is never the order
 * the rows arrived in.
 */
const ORDERED_CAPTURES: readonly MemorySourceDocument[] = [
  failedCapture({
    id: 700,
    url: `${RADAR_FEED}#700`,
    body: 'the oldest capture, and the largest id',
    parseError: 'unexpected end of input',
    capturedAt: EARLIER_CAPTURE,
  }),
  failedCapture({
    id: 501,
    url: `${RADAR_FEED}#501`,
    body: 'the lower id of the tie',
    parseError: 'unexpected end of input',
    capturedAt: TIED_CAPTURE,
  }),
  failedCapture({
    id: 502,
    url: `${RADAR_FEED}#502`,
    body: 'the higher id of the tie',
    parseError: 'unexpected end of input',
    capturedAt: TIED_CAPTURE,
  }),
];

/** What {@link ORDERED_CAPTURES} answers, newest first. */
const ORDERED_IDS: readonly number[] = [502, 501, 700];

describe('what a page selects', () => {
  it('answers every member it declares and no other', async () => {
    // The projection, read as a SET rather than field by field: a
    // member added to `SourceFailure` and answered from a stored
    // column reaches every caller silently, and every whole-record
    // comparison below would go on passing beside it.
    const { store, sourceId } = await plantCaptures(ORDERED_CAPTURES);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);
    const [first] = page.rows;

    expect(Object.keys(page).sort()).toEqual(PAGE_KEY_SET);
    expect(page.rows).toHaveLength(ORDERED_CAPTURES.length);
    expect(Object.keys(first ?? {}).sort()).toEqual(FAILURE_KEY_SET);

    // Not that the constant is `true` — that is a constant — but
    // that the symbol exists to be read: its VALUE is the statement
    // `check-types` makes at the declaration, which is a TS2322 the
    // moment either type grows a member no list names.
    expect(EVERY_KEY_LISTED).toBe(true);
  });

  it('orders newest first, with the id breaking a tie', async () => {
    const { store, sourceId } = await plantCaptures(ORDERED_CAPTURES);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);

    expect(page.rows.map((row) => row.id)).toEqual(ORDERED_IDS);

    // The fixture really exercises both halves, asserted here
    // rather than trusted: two distinct instants, so the capture
    // column orders something, and a tie inside them, so the id
    // does too.
    const stamps = ORDERED_CAPTURES.map((row) => row.capturedAt.getTime());

    expect(new Set(stamps).size).toBe(2);
    expect(stamps).toHaveLength(ORDERED_CAPTURES.length);

    // And one of the wrong answers this fixture was built to
    // separate, computed here rather than named: sorting the same
    // rows by id alone is a different list.
    const byIdAlone = [...ORDERED_CAPTURES]
      .map((row) => row.id)
      .sort((left, right) => right - left);

    expect(byIdAlone).not.toEqual(ORDERED_IDS);
    expect(page.rows.map((row) => row.capturedAt)).toEqual([
      TIED_CAPTURE,
      TIED_CAPTURE,
      EARLIER_CAPTURE,
    ]);
  });

  it('answers an empty page past the end of the queue', async () => {
    // A window past the end is a page with no rows and not a
    // refusal, and `total` still describes the whole queue — which
    // is what tells a caller it paged off the end rather than
    // reached a source that has never broken.
    const { store, sourceId } = await plantCaptures(ORDERED_CAPTURES);
    const beyond: StoreWindow = {
      limit: 2,
      offset: ORDERED_CAPTURES.length,
    };
    const page = await listSourceFailures(store, sourceId, beyond);

    expect(page.rows).toEqual([]);
    expect(page.total).toBe(ORDERED_CAPTURES.length);

    // The control, varied along the one axis this case turns on:
    // the same store and the same limit at offset zero answers
    // rows. Without it an empty page is equally green against a
    // read that had stopped answering anything at all — and this
    // is the file's one window NARROWER than its collection, so it
    // is also where `total` and the rows in hand disagree.
    const first: StoreWindow = { limit: 2, offset: 0 };
    const opening = await listSourceFailures(store, sourceId, first);

    expect(opening.rows.map((row) => row.id)).toEqual([502, 501]);
    expect(opening.total).toBe(ORDERED_CAPTURES.length);
    expect(opening.total).toBeGreaterThan(opening.rows.length);
  });

  it('answers an empty page when every capture parsed', async () => {
    // The filter is the port's and there is no status parameter, so
    // this is what a source with a healthy history answers. The
    // rows are planted directly rather than through
    // `failedCapture`, which fixes the status this case is about.
    const parsed: readonly MemorySourceDocument[] = [
      {
        id: 800,
        url: `${RADAR_FEED}#800`,
        body: 'a capture that parsed',
        parseError: null,
        capturedAt: TIED_CAPTURE,
        parseStatus: 'ok',
      },
      {
        id: 801,
        url: `${RADAR_FEED}#801`,
        body: 'a second capture that parsed',
        parseError: null,
        capturedAt: EARLIER_CAPTURE,
        parseStatus: 'ok',
      },
    ];
    const { store, sourceId, domainId } = await plantCaptures(parsed);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);

    expect(page.rows).toEqual([]);
    expect(page.total).toBe(0);

    // The rows ARE there, read through the aggregate the list route
    // answers: without this the empty queue above is equally green
    // against a plant that never landed, which is a different fact
    // and the one that would make this case say nothing.
    const sources = await store.listSourcesWithParseStats(
      domainId,
      WIDE_WINDOW,
    );

    expect(sources.map((row) => row.parseStats)).toEqual([
      { ok: parsed.length, failed: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// What the masking takes out
// ---------------------------------------------------------------------------

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/**
 * Every code point a response must not carry raw: C0, DEL, C1 and
 * both surrogate ranges.
 *
 * @param text - The text to read, decoded rather than scanned as
 *   UTF-16 units: `[...text]` walks CODE POINTS, so a valid astral
 *   pair arrives as one element above U+FFFF and only a surrogate
 *   standing on its own is ever in the range below.
 * @returns The offending code points in the order they occur, so a
 *   zero can be read against a known positive taken by this same
 *   function in the same case.
 *
 * @remarks
 * A SECOND READER RATHER THAN THE MODULE'S OWN CLASS. Numeric
 * comparisons rather than a pattern, so this cannot agree with a
 * masking regex however wrong that regex is — the whole value of
 * re-reading an output is that the reader shares nothing with what
 * wrote it.
 */
function unsafeCodePoints(text: string): number[] {
  return [...text]
    .map((character) => character.codePointAt(0) ?? 0)
    .filter((code) => code <= 0x1f
      || (code >= 0x7f && code <= 0x9f)
      || (code >= 0xd800 && code <= 0xdfff));
}

/** The instant every capture in the two sections below carries. */
const MASKED_CAPTURE = new Date('2026-03-03T00:00:00.000Z');

/** A NUL, which silences a diff and a grep of whatever holds it. */
const NUL = charFrom(0x00);

/** A C1 control, which `JSON.stringify` passes through as itself. */
const C1_CSI = charFrom(0x9b);

/** An ESC, which lets stored text rewrite a terminal. */
const ESC = charFrom(0x1b);

/** A DEL, the other character serialization leaves raw. */
const DEL = charFrom(0x7f);

/** A stored body carrying one C0 control and one C1 control. */
const CONTROL_BODY = `a capture${NUL}that would not${C1_CSI}parse`;

/** What {@link CONTROL_BODY} must answer as. */
const MASKED_BODY = 'a capture\\u0000that would not\\u009bparse';

/** A stored parse error carrying an ESC and a DEL. */
const CONTROL_ERROR = `unexpected${ESC}end of${DEL}input`;

/** What {@link CONTROL_ERROR} must answer as. */
const MASKED_ERROR = 'unexpected\\u001bend of\\u007finput';

describe('what the masking takes out', () => {
  it('answers a body with neither control byte present', async () => {
    const { store, sourceId } = await plantCaptures([
      failedCapture({
        id: 901,
        url: null,
        body: CONTROL_BODY,
        parseError: null,
        capturedAt: MASKED_CAPTURE,
      }),
    ]);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);

    expect(page.rows).toStrictEqual([{
      id: 901,
      url: null,
      body: MASKED_BODY,
      bodyBytes: Buffer.byteLength(CONTROL_BODY, 'utf8'),
      bodyTruncated: false,
      parseError: null,
      capturedAt: MASKED_CAPTURE,
    }]);

    // Re-read rather than asserted absent, and against a positive
    // taken by the same reader in the same case: the STORED body
    // carries exactly the two code points, the answered one carries
    // none. A search that could only ever answer nothing reports a
    // masked body and an unmasked one alike.
    const [answered] = page.rows;

    expect(unsafeCodePoints(answered?.body ?? '')).toEqual([]);
    expect(unsafeCodePoints(CONTROL_BODY)).toEqual([0x00, 0x9b]);

    // `bodyBytes` is the STORED length and not the answered one.
    // Masking is expansive — two characters became twelve — so the
    // two numbers disagree here, which is what makes this a
    // reading rather than a coincidence of a body carrying nothing
    // to mask.
    expect(answered?.bodyBytes)
      .not.toBe(Buffer.byteLength(answered?.body ?? '', 'utf8'));
  });

  it('masks a parse error and answers a missing one as null', async () => {
    // Two rows, because the member is nullable and the two branches
    // are different claims: a mask applied unconditionally throws
    // on the null row, and a mask applied to the body alone leaves
    // the first row's error raw.
    const { store, sourceId } = await plantCaptures([
      failedCapture({
        id: 902,
        url: null,
        body: 'a capture that would not parse',
        parseError: CONTROL_ERROR,
        capturedAt: MASKED_CAPTURE,
      }),
      failedCapture({
        id: 903,
        url: null,
        body: 'a capture nobody wrote an error for',
        parseError: null,
        capturedAt: EARLIER_CAPTURE,
      }),
    ]);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);
    const errors = page.rows.map((row) => ({
      id: row.id,
      parseError: row.parseError,
    }));

    expect(errors).toEqual([
      { id: 902, parseError: MASKED_ERROR },
      { id: 903, parseError: null },
    ]);

    // The same re-reading against the same positive: the stored
    // error carries both code points and the answered one carries
    // neither.
    const [masked] = page.rows;

    expect(unsafeCodePoints(masked?.parseError ?? '')).toEqual([]);
    expect(unsafeCodePoints(CONTROL_ERROR)).toEqual([0x1b, 0x7f]);

    // And the body beside it is untouched, so what the case above
    // reads is the error's own pass rather than one applied to
    // whichever member happened to be dirty.
    expect(masked?.body).toBe('a capture that would not parse');
  });
});

// ---------------------------------------------------------------------------
// What the cap keeps and what it cuts
// ---------------------------------------------------------------------------

/**
 * How many code points past the cap the long body runs.
 *
 * Small on purpose: what is being read is that the cut HAPPENS at
 * the declared cap, and a body twice its length would say the same
 * thing while making every count harder to check by eye.
 */
const OVERSHOOT = 64;

/** A body of exactly {@link BODY_CODE_POINT_CAP} code points. */
const AT_CAP_BODY = 'x'.repeat(BODY_CODE_POINT_CAP);

/** What the front of the long body carries. */
const HEAD_MARK = 'head-of-the-capture';

/** What its tail carries, which the cut has to take. */
const TAIL_MARK = 'tail-of-the-capture';

/** How much of the long body is neither mark. */
const FILL = BODY_CODE_POINT_CAP + OVERSHOOT
  - HEAD_MARK.length - TAIL_MARK.length;

/**
 * A body {@link OVERSHOOT} code points past the cap.
 *
 * MARKED AT BOTH ENDS rather than a run of one character, and that
 * is what makes the comparison below a claim rather than a
 * tautology: a uniform body equals every slice of itself of the
 * same length, so a cut taking the TAIL would satisfy an assertion
 * written to say the FRONT was kept. {@link OVERSHOOT} is wider
 * than {@link TAIL_MARK}, so the mark falls wholly past the cap.
 */
const PAST_CAP_BODY = HEAD_MARK + 'x'.repeat(FILL) + TAIL_MARK;

/**
 * One astral character, as its two UTF-16 halves.
 *
 * Built from code units rather than written as itself, so this file
 * carries no character a reviewer's editor renders differently
 * from the next one's.
 */
const ASTRAL_PAIR = charFrom(0xd83d, 0xde00);

/**
 * A body the cap cuts INSIDE an astral pair.
 *
 * ONE BMP CHARACTER AND THEN ASTRAL ONES, which is the whole of the
 * arithmetic. Each pair is two UTF-16 units, so the odd leading
 * character puts every pair boundary on an odd index and the cap —
 * an even number — falls between the two halves of one. A cut by
 * UTF-16 unit therefore ends on a lone high surrogate, and the
 * case below reads that naive cut as its own control.
 */
const ASTRAL_BODY = 'a' + ASTRAL_PAIR.repeat(BODY_CODE_POINT_CAP);

describe('what the cap keeps and what it cuts', () => {
  it('answers a body inside the cap whole', async () => {
    // Two rows, a short one and one of exactly the cap's length:
    // the boundary is the row that matters, since a cut written as
    // `>=` rather than `>` takes a character from a body that fits.
    const { store, sourceId } = await plantCaptures([
      failedCapture({
        id: 910,
        url: null,
        body: AT_CAP_BODY,
        parseError: null,
        capturedAt: MASKED_CAPTURE,
      }),
      failedCapture({
        id: 911,
        url: null,
        body: 'a short capture that would not parse',
        parseError: null,
        capturedAt: EARLIER_CAPTURE,
      }),
    ]);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);

    expect(page.rows.map((row) => ({
      id: row.id,
      body: row.body,
      bodyBytes: row.bodyBytes,
      bodyTruncated: row.bodyTruncated,
    }))).toEqual([
      {
        id: 910,
        body: AT_CAP_BODY,
        bodyBytes: BODY_CODE_POINT_CAP,
        bodyTruncated: false,
      },
      {
        id: 911,
        body: 'a short capture that would not parse',
        bodyBytes: 'a short capture that would not parse'.length,
        bodyTruncated: false,
      },
    ]);

    // The boundary row really sits ON the cap, derived from the
    // exported constant rather than transcribed: a cap that moved
    // takes this fixture with it instead of leaving a case green
    // against a number nobody re-read.
    expect([...AT_CAP_BODY]).toHaveLength(BODY_CODE_POINT_CAP);
  });

  it('cuts a body past the cap and still reports its bytes', async () => {
    const { store, sourceId } = await plantCaptures([
      failedCapture({
        id: 912,
        url: null,
        body: PAST_CAP_BODY,
        parseError: null,
        capturedAt: MASKED_CAPTURE,
      }),
    ]);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);
    const [answered] = page.rows;

    expect([...answered?.body ?? '']).toHaveLength(BODY_CODE_POINT_CAP);
    expect(answered?.bodyTruncated).toBe(true);

    // The STORED byte length, which is the number that says how
    // much was withheld. The body is ASCII, so its bytes and its
    // code points are the same count and the overshoot is legible.
    expect(answered?.bodyBytes).toBe(BODY_CODE_POINT_CAP + OVERSHOOT);
    expect(answered?.bodyBytes)
      .toBeGreaterThan(answered?.body.length ?? 0);

    // What was kept is the FRONT of the stored body. The two marks
    // are what make that readable: a cut taking the tail answers
    // the same length and the same flag, and would differ from the
    // slice below in nothing else.
    expect(answered?.body)
      .toBe(PAST_CAP_BODY.slice(0, BODY_CODE_POINT_CAP));
    expect(answered?.body.startsWith(HEAD_MARK)).toBe(true);
    expect(answered?.body.includes(TAIL_MARK)).toBe(false);

    // And the stored body really carries the mark the answer does
    // not, so the `false` above is a reading and not a needle that
    // was never in the haystack.
    expect(PAST_CAP_BODY.includes(TAIL_MARK)).toBe(true);
  });

  it('cuts by code point, so no lone surrogate is made', async () => {
    const { store, sourceId } = await plantCaptures([
      failedCapture({
        id: 913,
        url: null,
        body: ASTRAL_BODY,
        parseError: null,
        capturedAt: MASKED_CAPTURE,
      }),
    ]);
    const page = await listSourceFailures(store, sourceId, WIDE_WINDOW);
    const [answered] = page.rows;

    // The control, and the reason this fixture is shaped as it is:
    // cutting the SAME body by UTF-16 unit at the SAME cap really
    // does manufacture a lone high surrogate. Without it the
    // assertions below pass against a body no cut could have split.
    expect(unsafeCodePoints(ASTRAL_BODY.slice(0, BODY_CODE_POINT_CAP)))
      .toEqual([0xd83d]);

    // Neither raw nor escaped: the mask would have written a
    // `\ud83d` for a half the cut had left behind, so the escape
    // is where a split pair survives being masked.
    expect(unsafeCodePoints(answered?.body ?? '')).toEqual([]);
    expect(answered?.body.includes('\\ud')).toBe(false);

    // Cut where the cap says, ending on a whole character.
    expect([...answered?.body ?? '']).toHaveLength(BODY_CODE_POINT_CAP);
    expect([...answered?.body ?? ''].at(-1)).toBe(ASTRAL_PAIR);
    expect(answered?.bodyTruncated).toBe(true);

    // Four bytes per astral character plus the leading one, and
    // the stored length again rather than the answered one.
    expect(answered?.bodyBytes)
      .toBe(1 + (4 * BODY_CODE_POINT_CAP));
  });
});
