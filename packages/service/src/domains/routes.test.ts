/**
 * `src/domains/routes.ts` — what each of the five routes answers,
 * both when it refuses and when it lands: the status, the envelope
 * and the details each reaches the wire with. Driven over supertest
 * against a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation, and
 * only the translation. That a taken slug is a `ConflictError`, that
 * a guarded delete carries its counts, that a patched `settings`
 * replaces rather than merges — those are claims about the RULES and
 * are pinned one file over, over direct calls. What no call can
 * report is whether the rule reached a caller: the status
 * `errorHandler` or the handler chose, the envelope written around
 * it, the members that envelope carried, and whether a handler
 * swallowed a throw on the way. So every case below reads a
 * response and none of them reads a return value.
 *
 * NINETEEN CASES IN TWO HALVES — eleven refusals, then eight
 * answers, with two of the eight guarding the shapes the other six
 * are held to.
 *
 * FIVE REFUSALS, GROUPED BY WHICH PART OF THE REQUEST WAS WRONG.
 *
 * THE ADDRESS. A slug naming no row is `404` on all three operations
 * that take one, asserted against ONE shared body constant rather
 * than three that agree today — three handlers are three chances to
 * answer a missing domain three different ways, and this file is the
 * only place that could report it. A segment that is not a slug at
 * all is `422` naming `slug` and never `404`: a `404` says the row
 * is not there, and a request that never named a row has not
 * established that.
 *
 * THE PAYLOAD. A slug already taken is `409` with
 * `code: 'CONFLICT'`, which is the translation being pinned rather
 * than merely that something was thrown — `StoreRefusal` is
 * deliberately not an `AppError`, so an untranslated one answers
 * `500`. A create body the schema refuses is `422` carrying one
 * detail per fault, asserted as the whole list because a refusal for
 * one reason and a refusal for two are different answers to a caller
 * reading details.
 *
 * THE WINDOW. A `?perPage` above the cap is `422` naming `perPage`
 * with `code: 'too_big'`, raised before the store is asked anything.
 * An undeclared query parameter is `422` naming `query` — the root
 * field `parseQuery` gives a query-string fault, which no other file
 * in this package reaches through a real route.
 *
 * THE GUARD. A delete of a domain still holding rows it accumulated
 * is `409` whose `details` carries the three counts. Those counts
 * are swept off the interface rather than named one by one, so a
 * fourth counted table reddens this case instead of quietly
 * travelling unasserted. WHERE the guard runs relative to the
 * destructive call is `service.test.ts`'s subject, measured there
 * through a recording wrapper; what this case adds is that the
 * refusal and its counts survive the trip to the wire.
 *
 * FIVE ANSWERS, ONE PER ROUTE, AND EACH READ AS A WHOLE SHAPE.
 *
 * THE LIST. A page is `200` carrying `data` beside a `meta` of
 * `{ page, perPage, total, totalPages }`. Two windows over one
 * three-row collection say the rows are the window's and the
 * `total` is the COLLECTION's: page one of two answers two rows,
 * page two answers the remaining one, and `total` is 3 across both.
 * A page past the end is the same envelope with an empty `data`,
 * `page` echoed rather than clamped and `total` still describing a
 * collection that page could not have been counted from.
 *
 * THE RESOURCE. A create is `201` carrying the STORED row —
 * `featureVersion` and `embeddingModel` arrive as null although
 * neither is on the request or on the port's insert input, which is
 * what says the body came from the store. A read is `200` carrying
 * the same row the list carries, member for member. A patch is
 * `200` carrying the row afterwards, with a payload disjoint from
 * the stored one so that a merge would leave the old members
 * standing and be reported rather than hidden.
 *
 * THE CASCADE. `?cascade=confirm` is `204`, no body at all, and the
 * row reads back `404` afterwards.
 *
 * THE KEY SET IS ASSERTED ON EVERY ANSWER, which is the discipline
 * the positive half is built around rather than a detail of it. A
 * body carrying stamps and a store-assigned id has no whole-body
 * literal available, and a case reading fields alone is blind to
 * every member it does not name — so `keysOf` sits beside the field
 * reads on each answer, and a member arriving that nobody asserted
 * is a red case rather than a silent addition to the wire. The two
 * envelopes are told apart by that set and by nothing else: a
 * resource carries `data` and `success`, a page carries `meta` too.
 * The list constants are pinned in both directions — `satisfies`
 * against the type, `EVERY_KEY_LISTED` back the other way — so a
 * member added to `DomainRecord` or to either envelope and to no
 * list is a TS2322 rather than an assertion that quietly stopped
 * describing its subject.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy every
 * refusal assertion, and one that answered a fixed body would
 * satisfy several of the positive ones, so each case carries its own
 * control in the same body, varied along the axis under test: each
 * `404` reads the domain that IS stored through the SAME operation,
 * the `409` creates under a free slug, the over-cap `perPage` is
 * paired with a request at exactly the cap, the guarded delete reads
 * the row back to say it is still standing, the two list windows are
 * each other's control, the create is read back through the GET, the
 * read is compared against the same row in the list, the settings
 * patch is followed by a name-only patch that must leave the payload
 * alone, and the confirmed delete is preceded by the identical
 * request WITHOUT the confirmation, which has to be refused.
 *
 * CONTAINMENT. The undeclared-key case names the key with a sentinel
 * and counts its occurrences in the serialised response rather than
 * asserting absence — a search that would find nothing anywhere
 * reports a clean refusal and a leaking one alike. Its live control
 * is the same count over the request payload, which must be
 * non-zero. That channel is the one the sanitiser actually closes:
 * zod's own message quotes an unrecognized key back verbatim, and
 * `zodToValidationError` in `lib/errors/handler.ts` would copy it to
 * the wire. The submitted VALUE in the same body is closed further
 * upstream — zod puts a value in no path and no message — so its
 * zero is evidence about zod rather than about this router.
 *
 * MUTATION GRID, re-measured over all nineteen cases by mutating
 * `routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count. Nine legs, and every
 * figure below moved when the positive half landed — a grid is a
 * measurement over a case list, so it belongs to the file as it
 * stands rather than to the task that first wrote it.
 *
 * Answering the `POST` with `200` reddens TWO: the create case, and
 * the duplicate-slug case through its CONTROL rather than through
 * its refusal. Dropping the `readSlug` call from the `GET` handler
 * reddens ONE, the not-a-slug case, and leaves all three `404`s
 * green — an unnarrowed slug still finds no row, which is exactly
 * why that case asserts a `422` rather than an absence. Widening
 * `cascade` from the literal to any string reddens ONE, the
 * misspelt-confirmation case, which then reads the guard's `409`
 * instead: the two answers that case exists to keep apart.
 * Answering `204` as a `200` with a body reddens TWO, the confirmed
 * delete and the `404`-on-a-delete case whose own control is a
 * `204`.
 *
 * The four list legs are the ones worth reading as a set, because
 * three of them overlap and the overlap is the point. Skipping
 * `parseQuery` for a hardcoded window reddens FOUR — both window
 * refusals and both list answers. Answering `ok(page.rows)` with no
 * `meta` reddens THREE, that set minus the undeclared-parameter
 * case, so the two are nested rather than independent. Taking
 * `total` from the rows in hand reddens TWO, the list answers
 * alone, which is what separates a fault in the window from a fault
 * in the count — a distinction a service-level grid could not draw,
 * since there both faults redden one set.
 *
 * The last two legs are what say the key-set assertions are
 * load-bearing. Answering the read with one member spread onto the
 * row reddens TWO — the read case and the CREATE case, which reads
 * its row back through that same handler. Adding a member to each
 * listed row reddens TWO as well — the list case and, again, the
 * read case, which compares its row against the list's. Neither leg
 * reddens through a field assertion anywhere: every one of those
 * four reds is a `keysOf` comparison, and the cross-operation
 * controls are what carry each leg into a second case.
 */
import type { DomainDependentCounts, DomainRecord } from './store.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { DomainSettings } from '../db/schema/domains.js';
import type {
  PaginatedEnvelope,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildDomainsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('domains-routes-test', { level: 'silent' });

/**
 * The slug every case that needs a stored domain plants under.
 *
 * The seeded worked example's own slug, so the fixtures here read in
 * the same register as `data/domains.json` and the naming invariant
 * has nothing to find.
 */
const STORED_SLUG = 'example-tech-radar';

/** What the stored domain is called. */
const STORED_NAME = 'Example Tech Radar';

/** A slug no case plants, in the same register as a real one. */
const ABSENT_SLUG = 'no-domain-carries-this';

/**
 * The whole body every `404` on this router answers with.
 *
 * One constant asserted by three cases rather than three literals,
 * which is how this file says the three operations answer ONE
 * envelope rather than three that happen to agree today. The message
 * is `src/domains/service.ts`'s constant; what is pinned here is
 * that it arrives unmodified with `code` beside it and nothing else.
 */
const NOT_FOUND_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/**
 * Three zeros, annotated by the interface so that a fourth counted
 * table is a red `check-types` at this line before it can silently
 * narrow the sweep the guard case runs.
 */
const NO_DEPENDENTS: DomainDependentCounts = {
  topics: 0,
  sources: 0,
  findings: 0,
};

/**
 * The members `DomainRecord` declares, as a response carries them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about. The second is the direction a
 * key-set assertion exists for: a column added to the projection
 * reaches the wire unasserted otherwise, and no field read anywhere
 * in this file would notice.
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

/** The members a body carrying one resource has. */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/** The members a body carrying one page has. */
const PAGE_KEYS = [
  'data',
  'meta',
  'success',
] as const satisfies readonly (keyof PaginatedEnvelope<unknown>)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** All three lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<DomainRecord, typeof DOMAIN_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `DomainRecord`, to `SuccessEnvelope` or to
 * `PaginatedEnvelope` and to none of the lists above turns
 * {@link EveryKeyListed} into `never`, and this initializer is then
 * a TS2322 at this line — before any case can compare a response
 * against a set that has quietly stopped describing it. Read in a
 * case below so it is a symbol the file uses rather than one lint
 * reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/**
 * The three key sets as an assertion reads them: sorted here rather
 * than by hand, so a list written out of order still compares
 * against a sorted `Object.keys`.
 */
const DOMAIN_KEY_SET: readonly string[] = [...DOMAIN_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/**
 * The three domains a windowed read pages through, in the order
 * `DomainStore.listDomains` promises to answer them.
 *
 * Planted in REVERSE by {@link withThreeDomains}, so the ascending
 * order a case asserts is the store's own rather than the order the
 * rows arrived in. That the table itself is ascending is a case
 * below, since an expectation compared against an unsorted list
 * would pin the wrong order just as quietly.
 */
const LISTED_DOMAINS = [
  { slug: 'example-seed-bank', name: 'Example Seed Bank' },
  { slug: STORED_SLUG, name: STORED_NAME },
  { slug: 'example-transit-map', name: 'Example Transit Map' },
] as const;

/** Just the slugs, which is what a list case reads. */
const LISTED_SLUGS = LISTED_DOMAINS.map((row) => row.slug);

/**
 * The label the patch case renames the stored domain to. Distinct
 * from {@link STORED_NAME}, so the control that a name-only patch
 * moved something is a reading rather than an assumption.
 */
const REVISED_NAME = 'Example Tech Radar, revised';

/**
 * What the patched domain is holding before the patch arrives.
 *
 * Annotated by the interface rather than inferred, so a member
 * added to `DomainSettings` reddens `check-types` here before it can
 * quietly narrow what the replacement below is disjoint from.
 */
const STORED_SETTINGS: DomainSettings = {
  scoringWeights: { novelty: 2 },
  findingsDisplayName: 'Signals',
};

/**
 * What the patch sends instead, sharing NO member with
 * {@link STORED_SETTINGS}.
 *
 * Disjointness is what makes the whole-unit rule observable: a
 * merge of two payloads that overlap answers the replacement's
 * members and is indistinguishable from a replace. With nothing in
 * common, a merge leaves the stored weights and display name
 * standing and the case reports it.
 */
const REPLACEMENT_SETTINGS: DomainSettings = {
  verdictVocabulary: ['keep', 'watch', 'drop'],
};

/**
 * Just enough of a row for a page assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * that is already declared in `./store.ts`.
 */
interface SluggedRow {
  /** The natural key a list is ordered by and a row is found by. */
  readonly slug: string;
}

/**
 * Builds an app carrying one freshly built domains router.
 *
 * `errorHandler` is registered LAST, exactly as `createService` does
 * it, because that registration is what turns a bare `throw` inside
 * an `async` handler into a typed body — without it every case here
 * would read Express's own 500 page. What this app leaves out is the
 * framework's middleware stack and the auth guard: that the routes
 * are mounted behind `ctx.requireAuth` is `tests/api/wiring.test.ts`'s
 * claim, and a limiter counting across cases would only make this
 * file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be reached
 * by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildDomainsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildDomainsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * A store holding one domain, and the app in front of it.
 *
 * Planted through the PORT rather than through `POST /domains`, so a
 * case about a read is not also a case about the create route — and
 * so the duplicate-slug case is refused by a row it did not have to
 * create successfully first.
 *
 * @returns The app, the store behind it, and the planted row's id.
 */
async function withStoredDomain(): Promise<{
  app: Application;
  store: MemoryResearchStore;
  id: number;
}> {
  const store = createMemoryResearchStore();
  const row = await store.insertDomain({
    slug: STORED_SLUG,
    name: STORED_NAME,
    settings: {},
  });

  return { app: buildDomainsApp(store), store, id: row.id };
}

/**
 * How many times a string occurs in a serialised value.
 *
 * A count rather than a `toContain` assertion: zero over the
 * answered envelope is only evidence beside a known positive over
 * something that DOES carry the string, and a boolean cannot give
 * that pair.
 *
 * @param value - What to serialise and search.
 * @param needle - The sentinel to count.
 * @returns The number of occurrences.
 */
function countIn(value: unknown, needle: string): number {
  return JSON.stringify(value).split(needle).length - 1;
}

/**
 * A store holding {@link LISTED_DOMAINS}, and the app in front of
 * it.
 *
 * Planted in reverse slug order, which is the whole reason this
 * helper exists rather than a loop inside each case: a list read
 * answering rows in insertion order would satisfy every ascending
 * assertion below if the fixture had been planted ascending, and
 * nothing else in the file would report it.
 *
 * @returns The app and the store behind it.
 */
async function withThreeDomains(): Promise<{
  app: Application;
  store: MemoryResearchStore;
}> {
  const store = createMemoryResearchStore();

  for (const row of [...LISTED_DOMAINS].reverse()) {
    await store.insertDomain({ slug: row.slug, name: row.name, settings: {} });
  }

  return { app: buildDomainsApp(store), store };
}

/**
 * The row a page carries under one slug.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row
 * would otherwise reach `toStrictEqual` as `undefined` and pass
 * against any other absent row, which is a green nobody wrote.
 *
 * @param rows - A page's `data`, as it came off the wire.
 * @param slug - The slug to find.
 * @returns The row carrying it.
 * @throws Error - When the page carries no such row.
 */
function rowFor(rows: SluggedRow[], slug: string): SluggedRow {
  const row = rows.find((candidate) => candidate.slug === slug);

  if (row === undefined) {
    throw new Error(`The page carries no row under the slug ${slug}`);
  }

  return row;
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute at this boundary: a body carrying
 * a `Date` reaches the wire as a string and a row's id is the
 * store's own, so a whole-body literal is unavailable — while a key
 * set catches the fault a field read cannot, which is a member
 * arriving that nobody asserted.
 *
 * @param value - The body, or a member of it.
 * @returns Its own enumerable keys, sorted. An empty list for a
 *   response that carried no body at all, which is what a `204`
 *   answers and is the claim that case makes.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

// ---------------------------------------------------------------------------
// The address: a slug naming no row, and a segment that is no slug
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a read, and 200 for the stored slug', async () => {
    const { app } = await withStoredDomain();

    const missing = await request(app).get(`/domains/${ABSENT_SLUG}`);
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own.
    const found = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NOT_FOUND_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.slug).toBe(STORED_SLUG);
  });

  it('answers 404 on a patch, and 200 for the stored slug', async () => {
    const { app } = await withStoredDomain();
    const patch = { name: 'Renamed' };

    const missing = await request(app)
      .patch(`/domains/${ABSENT_SLUG}`)
      .send(patch);
    const found = await request(app)
      .patch(`/domains/${STORED_SLUG}`)
      .send(patch);

    // The patch body is VALID on both calls, which is what makes
    // this a case about the slug: `patchDomain` parses the body
    // before it resolves the slug, so a malformed one would be
    // answered 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NOT_FOUND_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe(patch.name);
  });

  it('answers 404 on a delete, and 204 for the stored slug', async () => {
    const { app } = await withStoredDomain();

    const missing = await request(app).delete(`/domains/${ABSENT_SLUG}`);
    const removed = await request(app).delete(`/domains/${STORED_SLUG}`);
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NOT_FOUND_BODY);
    // The stored domain holds nothing it accumulated, so the guard
    // has nothing to refuse and no confirmation is needed. That it
    // then reads back as a 404 is what says the 204 was a delete
    // rather than a handler answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.status).toBe(404);
  });
});

describe('a path segment that is not a slug', () => {
  it('answers 422 naming the segment rather than 404', async () => {
    const { app } = await withStoredDomain();

    // Uppercase and a trailing hyphen: refused by `slugParamSchema`,
    // and equally a slug no row carries — which is the whole point
    // of the case, since a router that skipped the narrowing would
    // answer the 404 the group above asserts instead.
    const response = await request(app).get('/domains/NotASlug-');

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'slug',
        message: 'Not in the expected format.',
        code: 'invalid_format',
      }],
    });
  });
});

// ---------------------------------------------------------------------------
// The payload: a slug already taken, and a body the schema refuses
// ---------------------------------------------------------------------------

describe('a create naming a slug that is taken', () => {
  it('answers 409, where a free slug answers 201', async () => {
    const { app } = await withStoredDomain();

    const duplicate = await request(app)
      .post('/domains')
      .send({ slug: STORED_SLUG, name: 'A second radar' });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post('/domains')
      .send({ slug: 'example-transit-map', name: 'Example Transit Map' });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'A domain already exists under that slug',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('example-transit-map');
  });
});

describe('a create body the schema refuses', () => {
  it('answers 422 carrying one detail per fault', async () => {
    const store = createMemoryResearchStore();
    const app = buildDomainsApp(store);

    const response = await request(app)
      .post('/domains')
      .send({
        slug: STORED_SLUG,
        name: '',
        settings: { scoringWeights: { novelty: 'heavy' } },
      });
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(response.status).toBe(422);
    // The whole list, not a member of it: a refusal for one reason
    // and a refusal for two are different answers to a caller
    // reading details, and only this says which happened. The
    // weight's key is masked to `*` because it is the operator's own
    // rather than this service's, while `name` keeps its name.
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        {
          field: 'name',
          message: 'Below the allowed minimum.',
          code: 'too_small',
        },
        {
          field: 'settings.scoringWeights.*',
          message: 'Missing, or not of the expected type.',
          code: 'invalid_type',
        },
      ],
    });
    // A refused create must not have written the row it named.
    expect(afterwards.status).toBe(404);
  });

  it('answers 422 naming the body, not the undeclared key', async () => {
    const { app } = await withStoredDomain();
    // The sentinel is the KEY, which is the channel the sanitiser
    // closes: zod's own message for this issue quotes the key back
    // verbatim, and `zodToValidationError` would copy that string to
    // the wire. The VALUE beside it is closed further upstream, so
    // its own containment is evidence about zod rather than about
    // this router.
    const sentinel = 'zzsentinelkeyzz';
    const payload = { [sentinel]: sentinel };

    const response = await request(app)
      .patch(`/domains/${STORED_SLUG}`)
      .send(payload);

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'body',
        message: 'Carries a key this endpoint does not declare.',
        code: 'unrecognized_keys',
      }],
    });
    expect(countIn(response.body, sentinel)).toBe(0);
    // The live control: the same search over something that DOES
    // carry the sentinel. Without it a zero says only that the
    // search found nothing anywhere.
    expect(countIn(payload, sentinel)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap, and a parameter nothing declares
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app } = await withStoredDomain();

    const overCap = await request(app).get('/domains?perPage=201');
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get('/domains?perPage=200');

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'perPage',
        message: 'Above the allowed maximum.',
        code: 'too_big',
      }],
    });
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
  });

  it('answers 422 naming the query for an undeclared parameter', async () => {
    const { app } = await withStoredDomain();

    // A misspelt `page`. Stripped rather than refused, it would
    // answer page 1 and look to the caller like a collection that
    // has nothing past its first page.
    const response = await request(app).get('/domains?pge=2');

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'query',
        message: 'Carries a key this endpoint does not declare.',
        code: 'unrecognized_keys',
      }],
    });
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete of a domain that still holds rows
// ---------------------------------------------------------------------------

describe('a delete of a domain holding rows it accumulated', () => {
  it('answers 409 with the counts and leaves the row standing', async () => {
    const { app, store, id } = await withStoredDomain();
    const held: DomainDependentCounts = {
      topics: 2,
      sources: 0,
      findings: 5,
    };

    store.setDomainDependents(id, held);

    const refused = await request(app).delete(`/domains/${STORED_SLUG}`);
    // The control: without it this case is equally green against a
    // route that refused and deleted anyway.
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'This domain holds rows a delete would take with it',
      details: held,
    });
    // Swept off the interface rather than named one by one, so a
    // fourth counted table reddens this case rather than travelling
    // unasserted. The spread is what gives an interface an index
    // signature; `NO_DEPENDENTS` is annotated by the interface, so
    // the member is owed at `check-types` too.
    expect(Object.keys({ ...refused.body.details }).sort())
      .toStrictEqual(Object.keys({ ...NO_DEPENDENTS }).sort());
    expect(afterwards.status).toBe(200);
    expect(afterwards.body.data.slug).toBe(STORED_SLUG);
  });

  it('answers 422 for a cascade spelled any other way', async () => {
    const { app, store, id } = await withStoredDomain();

    store.setDomainDependents(id, { findings: 1 });

    // A caller that wrote this meant to get past the guard.
    // Answering it the guard's own 409 would send it looking for
    // rows to remove instead of for the typo it made.
    const response = await request(app)
      .delete(`/domains/${STORED_SLUG}?cascade=yes`);
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'cascade',
        message: 'Not one of the accepted values.',
        code: 'invalid_value',
      }],
    });
    expect(afterwards.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// What every positive answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every positive answer is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // `DomainRecord` or to either envelope and to none of the three
    // lists is a TS2322 at that declaration, before any assertion
    // below can compare a response against a set that has quietly
    // stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`, which
    // is `okPage`'s stated contract and the one difference the
    // cases below read the two apart by.
    expect(PAGE_KEY_SET).toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
  });

  it('orders the planted table by the key it is read by', () => {
    // An ascending expectation compared against an unsorted table
    // pins the wrong order just as quietly as no assertion would,
    // and the ordering claim is the one thing a list case cannot
    // borrow from anywhere else in this file.
    expect([...LISTED_SLUGS].sort()).toStrictEqual(LISTED_SLUGS);
    expect(new Set(LISTED_SLUGS).size).toBe(LISTED_SLUGS.length);
  });
});

// ---------------------------------------------------------------------------
// The list: one window of rows, beside the meta describing the whole
// ---------------------------------------------------------------------------

describe('a list read and the window it answers through', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app } = await withThreeDomains();

    const first = await request(app).get('/domains?page=1&perPage=2');
    // The control, varied along the axis under test: a handler
    // ignoring the window answers all three rows to both calls, and
    // a total taken from the rows in hand answers 2 and then 1.
    const second = await request(app).get('/domains?page=2&perPage=2');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(keysOf(first.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(second.body)).toStrictEqual(PAGE_KEY_SET);
    expect(first.body.success).toBe(true);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 2,
      total: 3,
      totalPages: 2,
    });
    expect(second.body.meta).toStrictEqual({
      page: 2,
      perPage: 2,
      total: 3,
      totalPages: 2,
    });
    // Ascending, and the two pages disjoint: the rows were planted
    // in reverse, so this order is the store's own.
    expect(first.body.data.map((row: SluggedRow) => row.slug))
      .toStrictEqual(LISTED_SLUGS.slice(0, 2));
    expect(second.body.data.map((row: SluggedRow) => row.slug))
      .toStrictEqual(LISTED_SLUGS.slice(2));
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of [...first.body.data, ...second.body.data]) {
      expect(keysOf(row)).toStrictEqual(DOMAIN_KEY_SET);
    }
  });

  it('answers an empty page past the end of the list', async () => {
    const { app } = await withThreeDomains();

    const past = await request(app).get('/domains?page=99');
    // The control: the same collection through a window that
    // reaches it. Without it an empty `data` is equally green
    // against a list route answering nothing to anybody.
    const reached = await request(app).get('/domains');

    expect(past.status).toBe(200);
    // The envelope does not change shape when the page is empty,
    // which is what makes an overshot page a page rather than a
    // 404: the collection exists and only the window over it is
    // empty.
    expect(keysOf(past.body)).toStrictEqual(PAGE_KEY_SET);
    expect(past.body.data).toStrictEqual([]);
    // `meta` echoes the window that was ASKED FOR and describes the
    // COLLECTION, so 99 sits beside a `totalPages` of 1 and a
    // `total` no empty page could have been counted from.
    expect(past.body.meta).toStrictEqual({
      page: 99,
      perPage: 50,
      total: 3,
      totalPages: 1,
    });
    expect(reached.body.data).toHaveLength(LISTED_SLUGS.length);
    expect(reached.body.meta.total).toBe(LISTED_SLUGS.length);
  });
});

// ---------------------------------------------------------------------------
// The resource: a create, a read and a patch that land
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the stored row, not the request', async () => {
    const store = createMemoryResearchStore();
    const app = buildDomainsApp(store);
    const body = {
      slug: 'example-transit-map',
      name: 'Example Transit Map',
      settings: { findingsDisplayName: 'Signals' },
    };

    const created = await request(app)
      .post('/domains')
      .send(body);
    // The control, and what lets the case claim the answer is the
    // STORED row: a read of the same slug afterwards has to answer
    // the same object, member for member.
    const read = await request(app).get(`/domains/${body.slug}`);

    expect(created.status).toBe(201);
    // Two members and not three: a single resource carries no
    // `meta`, which is the whole difference between the envelope
    // `ok` writes and the one `okPage` does.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(created.body.data)).toStrictEqual(DOMAIN_KEY_SET);
    expect(created.body.success).toBe(true);
    expect(created.body.data.slug).toBe(body.slug);
    expect(created.body.data.name).toBe(body.name);
    expect(created.body.data.settings).toStrictEqual(body.settings);
    // Neither member is on the request body or on the port's insert
    // input, so both arriving is the STORE having answered rather
    // than the request having been echoed back under a 201.
    expect(created.body.data.featureVersion).toBeNull();
    expect(created.body.data.embeddingModel).toBeNull();
    expect(typeof created.body.data.id).toBe('number');
    expect(read.status).toBe(200);
    expect(read.body.data).toStrictEqual(created.body.data);
  });
});

describe('a read of one domain', () => {
  it('answers the row the list carries, and no meta', async () => {
    const { app } = await withThreeDomains();

    const read = await request(app).get(`/domains/${STORED_SLUG}`);
    // The control, varied along the axis under test: the same row
    // through the other operation that answers it. A read
    // projecting one set of columns and a list projecting another
    // is a difference no single response could report.
    const listed = await request(app).get('/domains');

    expect(read.status).toBe(200);
    expect(keysOf(read.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(read.body.data)).toStrictEqual(DOMAIN_KEY_SET);
    expect(read.body.success).toBe(true);
    expect(read.body.data.slug).toBe(STORED_SLUG);
    expect(read.body.data.name).toBe(STORED_NAME);
    expect(read.body.data)
      .toStrictEqual(rowFor(listed.body.data, STORED_SLUG));
  });
});

describe('a settings patch', () => {
  it('answers 200 with the payload replaced as a unit', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain({
      slug: STORED_SLUG,
      name: STORED_NAME,
      settings: STORED_SETTINGS,
    });

    const app = buildDomainsApp(store);

    const patched = await request(app)
      .patch(`/domains/${STORED_SLUG}`)
      .send({ settings: REPLACEMENT_SETTINGS });
    // The control, varied along the axis under test: a patch
    // carrying no `settings` leaves the stored payload standing.
    // Without it the case is equally green against a handler that
    // cleared the column on every write.
    const renamed = await request(app)
      .patch(`/domains/${STORED_SLUG}`)
      .send({ name: REVISED_NAME });

    expect(patched.status).toBe(200);
    expect(keysOf(patched.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(patched.body.data)).toStrictEqual(DOMAIN_KEY_SET);
    // The two payloads share no member, which is what makes the
    // whole-unit rule observable at all: a merge of two overlapping
    // payloads answers the replacement and looks identical.
    expect(patched.body.data.settings).toStrictEqual(REPLACEMENT_SETTINGS);
    expect(patched.body.data.slug).toBe(STORED_SLUG);
    expect(patched.body.data.name).toBe(STORED_NAME);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe(REVISED_NAME);
    expect(renamed.body.data.settings).toStrictEqual(REPLACEMENT_SETTINGS);
  });
});

// ---------------------------------------------------------------------------
// The cascade: the one spelling that gets a delete past the guard
// ---------------------------------------------------------------------------

describe('a delete the caller confirmed', () => {
  it('answers 204 with no body and takes the row', async () => {
    const { app, store, id } = await withStoredDomain();

    store.setDomainDependents(id, { topics: 2, sources: 0, findings: 5 });

    // The control, in the same case body and along the axis under
    // test: the identical request WITHOUT the confirmation is
    // refused, which is what makes the 204 below a confirmation
    // getting past the guard rather than a guard that never ran.
    const guarded = await request(app).delete(`/domains/${STORED_SLUG}`);
    const confirmed = await request(app)
      .delete(`/domains/${STORED_SLUG}?cascade=confirm`);
    const afterwards = await request(app).get(`/domains/${STORED_SLUG}`);

    expect(guarded.status).toBe(409);
    expect(confirmed.status).toBe(204);
    // An EMPTY key set, which is this route's half of the rule the
    // rest of the file reads a shape from: a deleted resource has
    // no representation, so what is asserted is that NOTHING
    // travelled rather than that some envelope did.
    expect(keysOf(confirmed.body)).toStrictEqual([]);
    expect(confirmed.text).toBe('');
    // And the row is gone, which is what says the 204 was a delete
    // rather than a handler answering without acting.
    expect(afterwards.status).toBe(404);
    expect(afterwards.body).toStrictEqual(NOT_FOUND_BODY);
  });
});
