/**
 * `src/taxonomy/categories-routes.ts` — what each of the four routes
 * answers, both when it refuses and when it lands: the status, the
 * envelope and the details each reaches the wire with. Driven over
 * supertest against a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `categories-service.test.ts` is the
 * translation, and only the translation. That a taken key is a
 * `ConflictError`, that all three depth branches arrive as one
 * `check-violation`, that a delete refused by children is a
 * `ConflictError` where a parent that is not there is a
 * `ValidationError`, that a list read carries a counted term count
 * on every row — those are claims about the RULES and are pinned one
 * file over, over direct calls. What no call can report is whether
 * the rule reached a caller: the status `errorHandler` or the
 * handler chose, the envelope written around it, the members that
 * envelope carried, and whether a handler swallowed a throw on the
 * way. So every case below reads a response and none of them reads
 * a return value.
 *
 * EIGHTEEN CASES IN TWO HALVES — ten refusals, then eight answers,
 * with two of the eight guarding the shapes the other six are held
 * to.
 *
 * TEN REFUSALS, GROUPED BY WHICH PART OF THE REQUEST WAS WRONG.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no category is `404` on both that
 * take one, each asserted against ONE shared body constant per
 * address rather than four literals that agree today: four handlers
 * are four chances to answer a missing row four different ways, and
 * this file is the only place that could report it. A `:id` segment
 * that is not an id at all is `422` naming `id` and never `404` —
 * a `404` says the row is not there, and a request that never named
 * a row has not established that.
 *
 * THE QUERY. `GET /domains/:slug/categories` takes no window at
 * all, so a `?page` sent to it is `422` naming `query` rather than
 * silently ignored — the one refusal on this router that exists to
 * stop an answer from being MISREAD rather than to stop a write.
 * Every other list route on this surface takes that parameter,
 * which is what makes stripping it the wrong answer: a caller would
 * read the whole taxonomy believing it had read the first page of
 * one.
 *
 * THE PAYLOAD. A key the domain already carries is `409` with
 * `code: 'CONFLICT'`, which is the translation being pinned rather
 * than merely that something was thrown: `StoreRefusal` is
 * deliberately not an `AppError`, so an untranslated one answers
 * `500`. A parent that would make a third level is `422` whose one
 * detail names `parentId` and states the one-level rule, asserted as
 * the WHOLE envelope on both writes that can raise it — the code in
 * that detail is this service's own rather than zod's, since no
 * schema can raise a rule the database holds, and a caller switching
 * on it is reading a vocabulary nothing else in the package emits.
 *
 * THE GUARD. A delete of a category that still holds children is
 * `409` and not the `422` a parent fault gets, although both arrive
 * from the store under ONE constraint name — which is the whole
 * reason the service takes the write as an argument, and this is
 * where that distinction is shown surviving the trip to the wire.
 *
 * SIX ANSWERS, AND EACH READ AS A WHOLE SHAPE.
 *
 * THE LIST. A taxonomy is `200` carrying `data` and NOTHING ELSE
 * beside `success`: this is the one list route on the surface that
 * applies no window, so it answers the same resource envelope the two
 * writes that carry a body do, and there is no `meta` for a caller to
 * read a page out of. Every row carries the record's five members
 * plus a `termCount`, and every count is zero — the dataset rather
 * than a stub, since no method on the in-memory store writes a term.
 * What only this layer can add is that the member SURVIVED
 * serialisation at all: `JSON.stringify` drops an `undefined`
 * outright, so an uncounted bucket would reach a caller with no
 * member rather than with a zero. A domain whose taxonomy is
 * unwritten is the same envelope with an empty `data`, which is what
 * makes the `404` above a claim about the DOMAIN. The ORDER those
 * rows arrive in is `categories-service.test.ts`'s claim and not this
 * file's: the fixture writes its three rows in key order, so a router
 * handing back whatever the store gave it answers the same list here.
 *
 * THE RESOURCE. A create is `201` carrying the STORED row — the id
 * is a number the request never sent, and the `domainId` is the one
 * the `:slug` resolved to. An omitted `parentId` arrives as an
 * explicit `null` and a named one as the root's id, which are the
 * two shapes the one-level rule leaves this surface; the child's
 * parent is asserted against the FIXTURE rather than against the
 * read-back, because a write that lies consistently answers its own
 * lie to both operations. What is STORED is a second case rather
 * than the same shape written twice: both rows read back through
 * the list equal to what the create answered, the root they hang
 * off untouched, and the taxonomy five rows rather than four.
 *
 * THE MOVE. A patch naming a root is `200` with the row under it,
 * and the three requests `parentId` distinguishes are asserted in
 * one body: a number moves the row, an ABSENT member leaves it
 * where the move put it, and an explicit `null` promotes it back to
 * a root. Absent and null are one request to anything reading a
 * body loosely, so the pair is what says the router kept them
 * apart. `key` comes through every one of them untouched, which is
 * `patchCategorySchema` refusing to carry one.
 *
 * THE DELETE. A `204` carries no body, no text and no content type,
 * asserted as the EMPTY key set rather than left unread. The
 * category that was refused while it held children is deleted by
 * the same request once the child is gone, which is what makes the
 * guard a guard rather than a route that refuses parents forever.
 *
 * THE KEY SET IS ASSERTED ON EVERY ANSWER, which is the discipline
 * the positive half is built around rather than a detail of it. A
 * body carrying a store-assigned id has no whole-body literal
 * available, and a case reading fields alone is blind to every
 * member it does not name — so `keysOf` sits beside the field reads
 * on each answer, and a member arriving that nobody asserted is a
 * red case rather than a silent addition to the wire. The lists are
 * pinned in both directions: `satisfies` against the type, and
 * `EVERY_KEY_LISTED` back the other way, so a member added to
 * `CategoryRecord`, to `CategoryWithTermCount` or to the envelope
 * and to no list is a TS2322 rather than an assertion that quietly
 * stopped describing its subject.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every refusal below, and one that answered a fixed body would
 * satisfy several of the answers, so each case carries its own
 * control in the same body, varied along the axis under test and
 * reached through the SAME operation: each `404` acts on the row
 * that IS stored, the `409` on the key creates under a free one,
 * both depth refusals are paired with the same write naming a ROOT
 * as the parent, the not-an-id segment is paired with the id it
 * would have been, the refused delete is paired with a childless
 * one that lands, the taxonomy read is paired with a SECOND domain
 * carrying one bucket, the empty taxonomy is paired with the `404`
 * a slug naming no domain gets, the root create is paired with a
 * create that names a parent, the move is paired with a patch that
 * names none, and the confirmed delete is preceded by the identical
 * request while the children were still there.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN is `categories-service.test.ts`'s at this
 * layer and `tests/api/request-echo.test.ts`'s across the surface —
 * none of the eighteen requests below submits a sentinel, because
 * none of the four refusal paths this file reaches builds a detail
 * out of anything a request carried.
 *
 * MUTATION GRID, re-measured over all eighteen cases by mutating
 * `categories-routes.ts` and reading the failed `fullName` SET from
 * a `--reporter=json` run rather than a count. Twelve legs, and
 * every figure below moved when the positive half landed — a grid
 * is a measurement over a case list, so it belongs to the file as
 * it stands rather than to the task that first wrote it. The shape
 * moved with them: on the refusal half alone four of six legs
 * reddened ONLY through controls, and each status leg now lands on
 * a case named for the answer it changes.
 *
 * THE STATUS LEGS. Answering the `POST` with `200` reddens FOUR:
 * the create that lands, plus the three refusals whose `201`
 * controls it breaks. Answering `204` as a `200` with a body
 * reddens FOUR the same way — the delete that lands, plus the `204`
 * controls of the delete `404`, the not-an-id case and the guard.
 *
 * THE ENVELOPE LEGS. Dropping the envelope from the list answer
 * reddens NINE, half the file, and SEVEN of those are cases about
 * something else reading `body.data` as a control. Adding a `meta`
 * to that same answer reddens TWO, exactly the two taxonomy reads,
 * and both through their key sets — a member arriving on an
 * envelope is invisible to every field read in the file, which is
 * the whole reason the key set is asserted. Spreading one member
 * onto the created record reddens TWO (its own case, and the stored
 * case that compares a listed row against it), onto each listed row
 * THREE (the list case, and the two cases that read a written row
 * back through it), and onto the patched record ONE. Every one of
 * those six reds arrives through a `keysOf` comparison or a
 * whole-row `toStrictEqual`, and not one through a field
 * assertion.
 *
 * THE NARROWING LEGS, where the leg has to be picked to match the
 * claim. Replacing `readId` with a bare `Number(...)` reddens ONE
 * on each of the two routes that take an `:id`, and it is the SAME
 * case both times: that case asserts both routes against one body
 * constant, so the two legs are two halves of one reading and each
 * is invisible to the other's assertion. Taking the segment RAW
 * reddens FOUR apiece instead, but three of the four are lookups
 * failing rather than a narrowing being missed — a wider leg
 * measuring a wider fault, and only the coerced one says the SCHEMA
 * is what is load-bearing. Skipping the list's query parse reddens
 * ONE, the case that route exists to make unignorable.
 */
import type { CategoryRecord, CategoryWithTermCount } from './store.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { SuccessEnvelope } from '../http/envelope.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildCategoriesRouter } from './categories-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('categories-routes-test', {
  level: 'silent',
});

/**
 * The slug every case plants its taxonomy under.
 *
 * The seeded worked example's own slug, so the fixtures here read in
 * the same register as `data/domains.json` and the naming invariant
 * has nothing to find.
 */
const STORED_SLUG = 'example-tech-radar';

/** A slug no case plants, in the same register as a real one. */
const ABSENT_SLUG = 'no-domain-carries-this';

/**
 * An id no planted category carries.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The root the fixture plants, which is the one holding a child. */
const ROOT_KEY = 'phrases';

/** The label {@link ROOT_KEY} carries, and keeps through every write. */
const ROOT_NAME = 'Phrases';

/** The child hanging off {@link ROOT_KEY}, and the third level's parent. */
const CHILD_KEY = 'signals';

/** The root holding nothing, which every control writes against. */
const LONE_KEY = 'tools';

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals, which
 * is how this file says the two operations that take a slug answer
 * ONE envelope rather than two that happen to agree today. The
 * message is `src/taxonomy/categories-service.ts`'s constant; what
 * is pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a category answers with. */
const NO_SUCH_CATEGORY_BODY = {
  code: 'NOT_FOUND',
  message: 'No category carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on both routes that
 * take an `:id`.
 */
const NOT_AN_ID_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'id',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The sentence a depth refusal's one detail carries.
 *
 * `src/taxonomy/categories-service.ts`'s constant, spelled again
 * rather than imported: importing it would make this file green
 * against any wording that module happened to be carrying, which is
 * the one thing an assertion over a message must not be.
 */
const ONE_LEVEL_RULE
  = 'A category is a root or the child of a root, and nothing deeper';

/**
 * The whole body both depth refusals answer with.
 *
 * Asserted on the create AND on the patch, from one constant, so a
 * handler that let one of the two answer differently is a red case
 * rather than a difference nobody looked for. `depth_violation` is
 * this service's own code and not zod's — no schema can raise the
 * rule the trigger holds — which is what makes the whole-envelope
 * assertion worth more here than a status read.
 */
const TOO_DEEP_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'parentId',
    message: ONE_LEVEL_RULE,
    code: 'depth_violation',
  }],
};

/**
 * The three planted keys, in the order a read answers them.
 *
 * The ORDER is `categories-service.test.ts`'s claim and not this
 * file's: the fixture writes its rows in key order, so a router
 * handing back whatever the store gave it and a store ordering by
 * `key` answer the same list here. What the read below takes from
 * this constant is that every planted row travelled.
 */
const PLANTED_KEYS = [ROOT_KEY, CHILD_KEY, LONE_KEY];

/** A second domain, carrying a taxonomy of its own. */
const OTHER_SLUG = 'example-transit-map';

/** The one bucket {@link OTHER_SLUG} holds. */
const OTHER_KEY = 'modes';

/** A domain whose taxonomy nobody has written yet. */
const EMPTY_SLUG = 'example-ocean-health';

/** The key an accepted create writes as a root. */
const NEW_ROOT_KEY = 'industries';

/** The key an accepted create writes as a child of {@link ROOT_KEY}. */
const NEW_CHILD_KEY = 'languages';

/** The label both creates carry, since neither reads it back apart. */
const NEW_NAME = 'Example Bucket';

/**
 * What the patch case renames the moved row to.
 *
 * Distinct from every planted label, so the control that a name-only
 * patch moved something is a reading rather than an assumption.
 */
const REVISED_NAME = 'Tools, revised';

/**
 * The members `CategoryRecord` declares, as a response carries them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at all
 * against the drift that matters. `satisfies` closes the direction
 * where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about. The second is the direction a
 * key-set assertion exists for: a column added to the projection
 * reaches the wire unasserted otherwise, and no field read anywhere
 * in this file would notice.
 */
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

/**
 * The members every body this router answers has.
 *
 * ONE list rather than two, which is this router's departure from
 * its siblings stated as a shape: the list route applies no window,
 * so it answers `ok()` exactly as the two writes that carry a body
 * do, and there is no `meta` on anything this router answers.
 * `PaginatedEnvelope` is therefore not imported here at all, and a
 * `meta` arriving is a red key SET rather than a member nobody
 * looked at — measured, by adding one to the list answer.
 */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

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

/** All three lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<CategoryRecord, typeof CATEGORY_KEYS>
  & CoversEveryKey<CategoryWithTermCount, typeof LISTED_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `CategoryRecord`, to `CategoryWithTermCount` or
 * to `SuccessEnvelope` and to none of the lists above turns
 * {@link EveryKeyListed} into `never`, and this initializer is then
 * a TS2322 at this line — before any case can compare a response
 * against a set that has quietly stopped describing it. Read in a
 * case below so it is a symbol this file uses rather than one lint
 * reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link CATEGORY_KEYS}, sorted at use rather than by hand. */
const CATEGORY_KEY_SET: readonly string[] = [...CATEGORY_KEYS].sort();

/** {@link LISTED_KEYS}, sorted. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/**
 * Just enough of a listed row for an assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record that
 * is already declared in `./store.ts` — the two members the cases
 * project out of a list, and never a substitute for the key-set
 * assertion that says what the rest of the row was.
 */
interface KeyedRow {
  /** The natural key a category is found by within its domain. */
  readonly key: string;

  /** How many terms hang off it, as the list read counted them. */
  readonly termCount: number;
}

/**
 * Builds an app carrying one freshly built categories router.
 *
 * `errorHandler` is registered LAST, exactly as `createService` does
 * it, because that registration is what turns a bare `throw` inside
 * an `async` handler into a typed body — without it every case here
 * would read Express's own 500 page. What this app leaves out is the
 * framework's middleware stack and the auth guard: that the routes
 * are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be reached
 * by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildCategoriesApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildCategoriesRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One domain carrying a two-level taxonomy, and the app in front of
 * it.
 *
 * Three categories, which is the smallest fixture every refusal here
 * can be reached from: a root holding a child (so a delete has
 * children to refuse and the child is a parent the depth rule
 * refuses), and a second root holding nothing (so every control has
 * a row it can write against without disturbing the first two).
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/categories`, so a case about a delete is not
 * also a case about the create route — and so the duplicate-key case
 * is refused by a row it did not have to create successfully first.
 *
 * @returns The app, the store behind it, the domain's own id and
 *   the ids the planted rows were given. The store is handed back
 *   for the cases that plant a SECOND domain, which no route on this
 *   router can write.
 */
async function withTaxonomy(): Promise<{
  app: Application;
  store: MemoryResearchStore;
  domainId: number;
  rootId: number;
  childId: number;
  loneId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const root = await store.insertCategory({
    domainId: domain.id,
    key: ROOT_KEY,
    name: ROOT_NAME,
    parentId: null,
  });
  const child = await store.insertCategory({
    domainId: domain.id,
    key: CHILD_KEY,
    name: 'Signals',
    parentId: root.id,
  });
  const lone = await store.insertCategory({
    domainId: domain.id,
    key: LONE_KEY,
    name: 'Tools',
    parentId: null,
  });

  return {
    app: buildCategoriesApp(store),
    store,
    domainId: domain.id,
    rootId: root.id,
    childId: child.id,
    loneId: lone.id,
  };
}

/** The path a domain's taxonomy is read and written at. */
function taxonomyPath(slug: string): string {
  return `/domains/${slug}/categories`;
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute at this boundary: a row's id is the
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

/**
 * The row a taxonomy read carries under one key.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row would
 * otherwise reach `toStrictEqual` as `undefined` and pass against
 * any other absent row, which is a green nobody wrote.
 *
 * @param rows - A read's `data`, as it came off the wire.
 * @param key - The key to find.
 * @returns The row carrying it.
 * @throws Error - When the read carries no such row.
 */
function rowFor(rows: readonly KeyedRow[], key: string): KeyedRow {
  const row = rows.find((candidate) => candidate.key === key);

  if (row === undefined) {
    throw new Error(`The taxonomy carries no row under the key ${key}`);
  }

  return row;
}

/**
 * Plants a second domain beside the fixture's own.
 *
 * Written through the PORT because no route on this router can: a
 * categories router reads domains and writes none, so a case that
 * needs a second taxonomy to compare against has to reach past the
 * surface under test to get one.
 *
 * @param store - The store behind the app under test.
 * @param slug - The domain's natural key.
 * @param name - Its operator-facing label.
 * @param keys - The category keys to plant under it, as roots.
 */
async function plantDomain(
  store: MemoryResearchStore,
  slug: string,
  name: string,
  keys: readonly string[],
): Promise<void> {
  const domain = await store.insertDomain({ slug, name, settings: {} });

  for (const key of keys) {
    await store.insertCategory({
      domainId: domain.id,
      key,
      name: 'Example Bucket',
      parentId: null,
    });
  }
}

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no category
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withTaxonomy();

    const missing = await request(app).get(taxonomyPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own. It also says what the 404 is FOR
    // — an empty taxonomy is a 200 carrying `data: []`, so only a
    // domain that is not there answers this way.
    const found = await request(app).get(taxonomyPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(3);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withTaxonomy();
    const body = { key: 'example-bucket', name: 'Example Bucket' };

    const missing = await request(app)
      .post(taxonomyPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createCategory` parses the body BEFORE
    // it resolves the slug, so a malformed one would be answered
    // 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.key).toBe(body.key);
  });
});

describe('an id naming no category', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, loneId } = await withTaxonomy();
    const patch = { name: 'Tooling' };

    const missing = await request(app)
      .patch(`/categories/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/categories/${loneId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe(patch.name);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, loneId } = await withTaxonomy();

    const missing = await request(app).delete(`/categories/${ABSENT_ID}`);
    const removed = await request(app).delete(`/categories/${loneId}`);
    const afterwards = await request(app).get(taxonomyPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    // The lone root holds no children, so the guard has nothing to
    // refuse. That the taxonomy is two rows afterwards is what says
    // the 204 was a delete rather than a handler answering without
    // acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(2);
  });
});

describe('a path segment that is not an id', () => {
  it('answers 422 naming the segment rather than 404', async () => {
    const { app, loneId } = await withTaxonomy();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(app)
      .patch('/categories/abc')
      .send({});
    const onDelete = await request(app).delete('/categories/abc');
    const anId = await request(app).delete(`/categories/${loneId}`);

    // Both writes that take an `:id`, against ONE body constant:
    // two handlers are two chances to narrow the segment in only
    // one of them, and nothing else in this package would report
    // the half that was left raw.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter on the one list route that takes no window
// ---------------------------------------------------------------------------

describe('a query parameter on a route that takes none', () => {
  it('answers 422 naming the query rather than ignoring it', async () => {
    const { app } = await withTaxonomy();

    // `?page` is the parameter a caller is likeliest to send here,
    // because every OTHER list route on this surface takes it.
    // Stripped rather than refused, it would answer the whole
    // taxonomy and look to that caller like a first page with
    // nothing after it.
    const whole = taxonomyPath(STORED_SLUG);

    const paged = await request(app).get(`${whole}?page=2`);
    const listed = await request(app).get(whole);

    expect(paged.status).toBe(422);
    expect(paged.body).toStrictEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{
        field: 'query',
        message: 'Carries a key this endpoint does not declare.',
        code: 'unrecognized_keys',
      }],
    });
    // The control: the same read with no query at all, which is
    // what says the route serves the taxonomy rather than refusing
    // every list it is asked for.
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// The payload: a key already taken, and a parent one level too deep
// ---------------------------------------------------------------------------

describe('a create naming a key the domain carries', () => {
  it('answers 409, where a free key answers 201', async () => {
    const { app } = await withTaxonomy();

    const duplicate = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: ROOT_KEY, name: 'A second phrases bucket' });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: 'example-bucket', name: 'Example Bucket' });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'This domain already carries a category under that key',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.key).toBe('example-bucket');
  });
});

describe('a parent that would make a third level', () => {
  it('answers 422 on a create, where a root answers 201', async () => {
    const { app, rootId, childId } = await withTaxonomy();
    const body = { key: 'example-bucket', name: 'Example Bucket' };

    const tooDeep = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ ...body, parentId: childId });
    // The control is one level up rather than a parent left out
    // entirely: it says the refusal is about DEPTH and not about a
    // route that refuses every `parentId` it is given.
    const created = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ ...body, parentId: rootId });

    expect(tooDeep.status).toBe(422);
    expect(tooDeep.body).toStrictEqual(TOO_DEEP_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.parentId).toBe(rootId);
  });

  it('answers 422 on a patch, where a root answers 200', async () => {
    const { app, rootId, childId, loneId } = await withTaxonomy();

    const tooDeep = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ parentId: childId });
    const moved = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ parentId: rootId });

    // The same body constant as the create, which is the claim: two
    // writes reach one trigger, and a handler letting either answer
    // differently is a red case rather than a difference nobody
    // looked for.
    expect(tooDeep.status).toBe(422);
    expect(tooDeep.body).toStrictEqual(TOO_DEEP_BODY);
    expect(moved.status).toBe(200);
    expect(moved.body.data.parentId).toBe(rootId);
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete of a category that still holds children
// ---------------------------------------------------------------------------

describe('a delete of a category holding children', () => {
  it('answers 409 and leaves the category standing', async () => {
    const { app, rootId, loneId } = await withTaxonomy();

    const refused = await request(app).delete(`/categories/${rootId}`);
    // The control: a childless root, deleted through the SAME
    // operation. Without it this case is equally green against a
    // route that refuses every delete it is given.
    const removed = await request(app).delete(`/categories/${loneId}`);
    const afterwards = await request(app).get(taxonomyPath(STORED_SLUG));
    const keys = (afterwards.body.data as KeyedRow[]).map((row) => row.key);

    // 409 and not the 422 a parent fault gets, although the store
    // raised both under ONE constraint name — which is why the
    // service takes the write as an argument, and why this is the
    // case that shows the distinction surviving to the wire.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual({
      code: 'CONFLICT',
      message: 'This category holds children, which have to move or go first',
    });
    expect(removed.status).toBe(204);
    // The refused row is still there and the confirmed one is gone,
    // which is the pair: a route that refused and deleted anyway
    // satisfies the status assertions above on their own.
    expect(keys).toStrictEqual([ROOT_KEY, CHILD_KEY]);
  });
});

// ---------------------------------------------------------------------------
// What every positive answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every positive answer is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // `CategoryRecord`, to `CategoryWithTermCount` or to the
    // envelope and to none of the three lists is a TS2322 at that
    // declaration, before any assertion below can compare a
    // response against a set that has quietly stopped describing
    // it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // A listed row IS the record plus the count, which is the one
    // difference the read cases tell the two shapes apart by.
    expect(LISTED_KEY_SET)
      .toStrictEqual([...CATEGORY_KEY_SET, 'termCount'].sort());
  });

  it('plants distinct keys and creates under unplanted ones', () => {
    // Without this, a create case colliding with a planted key
    // would be refused 409 and read as a router fault rather than
    // as a fixture that overlapped itself — and `rowFor` would have
    // two rows to choose between.
    expect(new Set(PLANTED_KEYS).size).toBe(PLANTED_KEYS.length);
    expect(PLANTED_KEYS).not.toContain(NEW_ROOT_KEY);
    expect(PLANTED_KEYS).not.toContain(NEW_CHILD_KEY);
    expect(NEW_ROOT_KEY).not.toBe(NEW_CHILD_KEY);
  });
});

// ---------------------------------------------------------------------------
// The list: one domain's taxonomy, whole, and each row's term count
// ---------------------------------------------------------------------------

describe('a taxonomy read that lands', () => {
  it('answers every row in an envelope carrying no meta', async () => {
    const { app, store } = await withTaxonomy();

    await plantDomain(store, OTHER_SLUG, 'Example Transit Map', [OTHER_KEY]);

    const listed = await request(app).get(taxonomyPath(STORED_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a second domain carrying ONE bucket. A handler
    // answering a fixed body, or reading the table rather than the
    // domain the `:slug` resolved, answers three rows to both.
    const other = await request(app).get(taxonomyPath(OTHER_SLUG));

    expect(listed.status).toBe(200);
    // TWO members and not three, which is this router's one
    // departure from its siblings arriving on the wire: with no
    // window applied there is no `meta` to describe one, so the
    // list answers the same envelope the three writes do.
    expect(keysOf(listed.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(listed.body.success).toBe(true);
    expect(listed.body.data.map((row: KeyedRow) => row.key))
      .toStrictEqual(PLANTED_KEYS);
    // Every row rather than the first, so a taxonomy cannot carry
    // one well-shaped record beside one that leaked a column.
    for (const row of listed.body.data) {
      expect(keysOf(row)).toStrictEqual(LISTED_KEY_SET);
    }
    // THE COUNT IS ZERO ON EVERY ROW, AND THAT IS THE DATASET
    // RATHER THAN A STUB: no method on
    // `tests/helpers/memory-research-store.ts` writes a term, so no
    // category it can hold has one and a zero is the true answer
    // for all of them. What only this layer can add is that the
    // member SURVIVED — `JSON.stringify` drops an `undefined`
    // outright, so a store answering an uncounted bucket as absent
    // reaches a caller with no member at all, and `0` and "not
    // counted" become the same reading on the one member whose job
    // is telling them apart. The key set above is what catches it.
    expect(listed.body.data.map((row: KeyedRow) => row.termCount))
      .toStrictEqual(PLANTED_KEYS.map(() => 0));
    expect(other.status).toBe(200);
    expect(other.body.data.map((row: KeyedRow) => row.key))
      .toStrictEqual([OTHER_KEY]);
  });

  it('answers an empty taxonomy 200 rather than 404', async () => {
    const { app, store } = await withTaxonomy();

    await plantDomain(store, EMPTY_SLUG, 'Example Ocean Health', []);

    const empty = await request(app).get(taxonomyPath(EMPTY_SLUG));
    // The control, varied along the axis this case is about — is
    // the DOMAIN there — and the other half of the pair the address
    // group opens: a slug naming no domain is the 404, and this is
    // what makes that 404 a claim about the domain rather than
    // about its taxonomy being empty.
    const missing = await request(app).get(taxonomyPath(ABSENT_SLUG));

    expect(empty.status).toBe(200);
    // The envelope does not change shape when there is nothing to
    // carry, which is what makes an empty taxonomy a taxonomy: the
    // domain exists and only its buckets are unwritten.
    expect(keysOf(empty.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(empty.body.success).toBe(true);
    expect(empty.body.data).toStrictEqual([]);
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
  });
});

// ---------------------------------------------------------------------------
// The resource: a create that lands a root, and one that lands a child
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 for a root and 201 for a child', async () => {
    const { app, domainId, rootId } = await withTaxonomy();

    const root = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: NEW_ROOT_KEY, name: NEW_NAME });
    // The control, along the axis under test and through the SAME
    // operation: a create that DOES name a parent. Without it the
    // null above is equally green against a handler that stamps
    // every create a root, and the two shapes are the whole of what
    // the one-level rule leaves this surface.
    const child = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: NEW_CHILD_KEY, name: NEW_NAME, parentId: rootId });

    expect(root.status).toBe(201);
    expect(child.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(root.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(child.body)).toStrictEqual(RESOURCE_KEY_SET);
    // The record and NOT the listed shape: `termCount` is the list
    // read's own member, so a create answering one would be a
    // number nobody counted.
    expect(keysOf(root.body.data)).toStrictEqual(CATEGORY_KEY_SET);
    expect(keysOf(child.body.data)).toStrictEqual(CATEGORY_KEY_SET);
    expect(root.body.success).toBe(true);
    expect(root.body.data.key).toBe(NEW_ROOT_KEY);
    expect(root.body.data.name).toBe(NEW_NAME);
    // An explicit null on the wire, and the service's own rather
    // than the request's: the body named no parent at all, and an
    // absent member would have reached the caller as no member.
    expect(root.body.data.parentId).toBeNull();
    // Asserted against the FIXTURE and not against the read below,
    // because a write that lies consistently answers its own lie
    // back: a handler forcing every `parentId` null passes every
    // cross-operation compare in the case that follows.
    expect(child.body.data.parentId).toBe(rootId);
    // Neither member is on either request body, so both arriving
    // right is the STORE having answered rather than the request
    // having been echoed back under a 201.
    expect(typeof root.body.data.id).toBe('number');
    expect(root.body.data.domainId).toBe(domainId);
    expect(child.body.data.domainId).toBe(domainId);
    expect(root.body.data.id).not.toBe(child.body.data.id);
  });

  it('stores both, and leaves the root they hang off alone', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const { app, domainId, rootId } = await withTaxonomy();

    const root = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: NEW_ROOT_KEY, name: NEW_NAME });
    const child = await request(app)
      .post(taxonomyPath(STORED_SLUG))
      .send({ key: NEW_CHILD_KEY, name: NEW_NAME, parentId: rootId });
    const listed = await request(app).get(taxonomyPath(STORED_SLUG));
    const rows = listed.body.data as KeyedRow[];

    expect(listed.status).toBe(200);
    // The whole taxonomy, so a create reaching more rows than the
    // one it wrote is a red case here rather than an answer nobody
    // compared against anything.
    expect(rows.map((row) => row.key))
      .toStrictEqual([...PLANTED_KEYS, NEW_ROOT_KEY, NEW_CHILD_KEY].sort());
    expect(rowFor(rows, NEW_ROOT_KEY))
      .toStrictEqual({ ...root.body.data, termCount: 0 });
    expect(rowFor(rows, NEW_CHILD_KEY))
      .toStrictEqual({ ...child.body.data, termCount: 0 });
    // The parent the child named is still a root and still carries
    // what it carried, which no assertion over a created row could
    // say: a write lands ONE row. A whole-row literal rather than a
    // field read, since the fault worth catching here is the parent
    // gaining a member or losing one on the way past a write.
    expect(rowFor(rows, ROOT_KEY)).toStrictEqual({
      id: rootId,
      domainId,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
      termCount: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// The move: the three requests a patchable parent tells apart
// ---------------------------------------------------------------------------

describe('a patch that moves a category', () => {
  it('answers 200 with the row under the root it named', async () => {
    const { app, domainId, rootId, loneId } = await withTaxonomy();

    const moved = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ parentId: rootId });
    // The first control: `parentId` ABSENT leaves the row where the
    // move put it. Without it the case is equally green against a
    // handler that rewrote the column on every patch.
    const renamed = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ name: REVISED_NAME });
    // The second: an explicit `null` promotes it back to a root,
    // which is the only way up. Absent and null are ONE request to
    // anything reading a body loosely, and this is the pair that
    // says the router kept them apart.
    const promoted = await request(app)
      .patch(`/categories/${loneId}`)
      .send({ parentId: null });
    const listed = await request(app).get(taxonomyPath(STORED_SLUG));

    expect(moved.status).toBe(200);
    expect(keysOf(moved.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(moved.body.data)).toStrictEqual(CATEGORY_KEY_SET);
    expect(moved.body.success).toBe(true);
    expect(moved.body.data.parentId).toBe(rootId);
    // The key came through untouched, which is `patchCategorySchema`
    // refusing to carry one rather than anything this router does —
    // asserted here because a re-key would leave every other field
    // read in this case green.
    expect(moved.body.data.key).toBe(LONE_KEY);
    expect(moved.body.data.id).toBe(loneId);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe(REVISED_NAME);
    expect(renamed.body.data.parentId).toBe(rootId);
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.parentId).toBeNull();
    // And the store holds what the last patch answered, read back
    // through the OTHER operation: a patch answering a row it never
    // wrote satisfies all three assertions above.
    expect(rowFor(listed.body.data as KeyedRow[], LONE_KEY))
      .toStrictEqual({
        id: loneId,
        domainId,
        key: LONE_KEY,
        name: REVISED_NAME,
        parentId: null,
        termCount: 0,
      });
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what clears the children guard
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing at all, and takes the row', async () => {
    const { app, rootId, childId } = await withTaxonomy();

    // The control, first and in the same body: the identical
    // request while the children are still there is refused, which
    // is what makes the 204 below a guard being cleared rather than
    // a route that deletes whatever it is handed.
    const guarded = await request(app).delete(`/categories/${rootId}`);
    const child = await request(app).delete(`/categories/${childId}`);
    const root = await request(app).delete(`/categories/${rootId}`);
    const afterwards = await request(app).get(taxonomyPath(STORED_SLUG));

    expect(guarded.status).toBe(409);
    expect(child.status).toBe(204);
    expect(root.status).toBe(204);
    // An EMPTY key set, which is this route's half of the shape the
    // rest of the file reads: a deleted resource has no
    // representation, so what is asserted is that NOTHING travelled
    // rather than that some envelope did.
    expect(keysOf(root.body)).toStrictEqual([]);
    expect(root.text).toBe('');
    expect(root.type).toBe('');
    // And both rows are gone while the third is untouched, which is
    // what says the 204s were deletes rather than a handler
    // answering without acting — and that neither one took the
    // taxonomy with it.
    expect(afterwards.status).toBe(200);
    expect((afterwards.body.data as KeyedRow[]).map((row) => row.key))
      .toStrictEqual([LONE_KEY]);
  });
});
