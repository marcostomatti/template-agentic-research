/**
 * `src/personas/routes.ts` — what each of the four routes
 * answers, both when it refuses and when it lands: the status, the
 * envelope and the details each reaches the wire with. Driven over
 * supertest against a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a taken role is a `ConflictError`
 * from both writes that can propose one, that an unknown slug and
 * an unknown id are told apart, that a body missing `systemText` is
 * refused where a patch omitting it is not — those are claims
 * about the RULES and are pinned one file over, over direct calls.
 * What no call can report is whether the rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, the members that envelope carried, and whether a
 * handler swallowed a throw on the way. So every case below reads a
 * response and none of them reads a return value.
 *
 * NINETEEN CASES IN TWO HALVES — eleven refusals, then eight
 * answers, two of the eight guarding the shapes the other six are
 * held to.
 *
 * THE REFUSALS ARE GROUPED BY WHICH PART OF THE REQUEST WAS WRONG.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no persona is `404` on both that
 * take one, each asserted against ONE shared body constant per
 * ADDRESS rather than four literals that agree today. The constants
 * are per address and not per status: a `404` about a domain and a
 * `404` about a persona are two envelopes on one router, and four
 * handlers are four chances to answer a missing row four different
 * ways. A segment that is not an address at all is `422` naming
 * `id` or `slug` and never `404` — a `404` says the row is not
 * there, and a request that never named a row has not established
 * that. Both of those are asserted across the TWO routes that share
 * the segment inside one case, because two handlers are two chances
 * to narrow only one of them.
 *
 * THE WINDOW. This list route IS paginated, unlike the taxonomy's,
 * so it owes the two refusals every paginated list on the surface
 * owes: a `?perPage` above the cap is `422` naming `perPage` rather
 * than a silent clamp, and an undeclared parameter is `422` naming
 * `query` rather than a typo stripped on the way in. The first is
 * paired with the cap itself, which is what says the refusal is a
 * CAP and not a route that refuses every window it is handed.
 *
 * THE PAYLOAD. A role the domain already carries is `409` with
 * `code: 'CONFLICT'` from the create AND from the rename, which is
 * the translation being pinned rather than merely that something
 * was thrown: `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers `500`. Both writes are driven because
 * this is the only wave-1 patch that can reach a unique key at all,
 * and each is a separate call site a module could stop translating
 * on its own. The create carries the control the other two cannot
 * stand in for: the same role under a SECOND domain is accepted,
 * which is what says the key is per-domain rather than global.
 *
 * A BODY MISSING `systemText` is `422` whose ONE detail names the
 * member, asserted as the WHOLE envelope. Its control is the same
 * member absent from a PATCH, which is legal and answers `200`
 * — so the pair says the refusal is about what a create must
 * state rather than about a router that refuses every body without
 * a `systemText` in it. A field name is the whole of what that
 * detail carries: no request below submits a value any refusal
 * could quote back.
 *
 * FOUR ANSWERS, ONE PER ROUTE, AND EACH READ AS A WHOLE SHAPE.
 *
 * THE PAGE. A read is `200` carrying `data` beside a `meta` of
 * `{ page, perPage, total, totalPages }`. Three windows over one
 * two-role roster say the rows are the WINDOW's and the `total` is
 * the COLLECTION's: the wide read answers both roles ascending, and
 * two windows of one answer a role each with `total` still 2 across
 * all three. Ascending is the store's own rather than the fixture's
 * — the scorer is planted first and sorts second. A page past
 * the end is the same envelope with an empty `data`, `page` echoed
 * rather than clamped, and a `total` that page could not have been
 * counted from.
 *
 * THE RESOURCE. A create is `201` carrying the STORED row, and
 * `domainId` is what says so: no request body carries one, and the
 * path named the domain by slug. Its control is a second create
 * stating an EMPTY `systemText`, which is a legal value meaning the
 * role has no instructions yet — absent is refused and empty
 * is written, and the two are one request to anything reading a
 * body loosely. A second case reads the roster back afterwards, so
 * a create answering a row it never wrote is red there rather than
 * green everywhere.
 *
 * THE PATCH. Rewriting `systemText` is `200` carrying the row
 * afterwards, with the role, the id and the domain each asserted
 * unmoved although the request named none of them. Its two controls
 * are the two requests an optional member has to be told apart
 * from: a patch naming only `role` leaves the new text standing,
 * and a patch naming an EMPTY text writes one.
 *
 * THE DELETE. A `204`, no body at all, and three readings of what
 * it left behind: the sibling role still answers, the SECOND
 * domain's persona is untouched, and the identical request again is
 * a `404`.
 *
 * THE KEY SET IS ASSERTED ON EVERY ANSWER, which is the discipline
 * the positive half is built around rather than a detail of it. A
 * body carrying a store-assigned id has no whole-body literal
 * available, and a case reading fields alone is blind to every
 * member it does not name — so `keysOf` sits beside the field
 * reads on each answer, and a member arriving that nobody asserted
 * is a red case rather than a silent addition to the wire. The two
 * envelopes are told apart by that set and by nothing else: a
 * resource carries `data` and `success`, a page carries `meta` too.
 * The lists are pinned in both directions — `satisfies`
 * against the type, {@link EVERY_KEY_LISTED} back the other way
 * — so a member added to `PersonaRecord`, to either envelope
 * or to `meta` and to no list is a TS2322 rather than an assertion
 * that quietly stopped describing its subject.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every refusal assertion, and one that answered a fixed body would
 * satisfy several of the positive ones, so each case carries its
 * own control in the same body, varied along the axis under test:
 * each `404` reads what IS there through the SAME operation, the
 * two `409`s create and rename under a free role, the over-cap
 * `perPage` is paired with a request at exactly the cap, the wide
 * list read is the control for the two windows of one, the create
 * is read back through the list, the patch is followed by two
 * patches that must leave what it wrote standing, and the delete is
 * followed by the identical request, which has to be refused.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN is `service.test.ts`'s at this layer and
 * `tests/api/request-echo.test.ts`'s across the surface — none
 * of the requests below submits a sentinel, because none of the
 * refusal paths this file reaches builds a detail out of anything a
 * request carried.
 *
 * MUTATION GRID, re-measured over all nineteen cases by mutating
 * `routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count. Thirteen legs, and
 * every figure below moved when the positive half landed — a
 * grid is a measurement over a case list, so it belongs to the file
 * as it stands rather than to the task that first wrote it.
 *
 * THE STATUS LEGS NOW LAND ON THEIR OWN SUBJECT, which is what the
 * positive half changed about this file rather than merely moving
 * its numbers. Answering the `POST` with `200` reddens THREE: the
 * create case, and the `201` controls of the create's `404` and of
 * its `409`. Answering `204` as a `200` reddens THREE the same way:
 * the delete case, and the `204` controls of the delete's `404` and
 * of the not-an-id case. While this file was refusals only neither
 * leg touched a case named for the answer it changed, and those
 * controls were the load-bearing assertions.
 *
 * THE ENVELOPE LEGS ARE NESTED, and most of what they redden is not
 * about the list. Dropping the envelope from the list answer
 * reddens EIGHT and dropping only `meta` reddens FIVE, the second
 * set inside the first. The three they differ by are exactly the
 * cases that read a row back through `body.data` and never read
 * `meta`: the patch, the list's own `404` and the delete's `404`.
 * So the pair splits the file by WHICH member each read-back
 * reaches rather than by which cases are about the list.
 *
 * THE TWO WINDOW LEGS REDDEN AN IDENTICAL SET AND ARE STILL TWO
 * READINGS. Replacing `toStoreWindow(query)` with a fixed
 * `{ limit: 50, offset: 0 }` reddens TWO, and taking `total` from
 * the rows in hand reddens the SAME TWO — both list answers,
 * because a window narrow enough to expose a dropped offset is also
 * narrow enough to expose a total counted from a page. Only the
 * assertion failing inside each case tells them apart: the first
 * moves which roles came back, the second moves `meta.total`. The
 * first of the two was this file's one measured ZERO while it was
 * refusals only, since no refusal case could afford a window
 * narrower than its collection. Skipping `parseQuery` for a
 * hardcoded window is the widest of the three and reddens FOUR,
 * both window refusals and both list answers, so the pair above
 * sits inside it.
 *
 * THE ADDRESS LEGS HAVE TWO WIDTHS AND THEY MEASURE DIFFERENT
 * CLAIMS. Taking the `:id` segment RAW reddens SEVEN, which is
 * exactly every case that addresses a persona by id — the
 * control saying those cases reach the router at all rather than
 * passing over a fixture nothing touched. Replacing `readId` with a
 * bare `Number(...)` reddens ONE, the not-an-id case, and it
 * reaches the PATCH alone: the anchor that spells the call out as
 * `const id = readId(req.params);` matches one of the two sites,
 * and the `DELETE`, which calls the same helper inline, is
 * invisible to it. Only the coerced leg says the SCHEMA is what is
 * load-bearing. Unnarrowing the `:slug` reddens ONE, and one leg
 * covers both routes that take one because {@link readSlug} is
 * where the narrowing lives.
 *
 * THE THREE SPREAD LEGS SAY THE KEY SETS ARE LOAD-BEARING, and two
 * of the three carry into a second case through a cross-operation
 * control rather than through their own subject. One member spread
 * onto each LISTED row reddens THREE: the list case, the create's
 * stored-row case, which compares a listed row against what the
 * create answered, and the patch case, which reads its row back
 * through the list. One spread onto the CREATED row reddens TWO,
 * both create cases, for that same reason from the other side. One
 * spread onto the PATCHED row reddens ONE, the patch case alone,
 * since no other case reads a row back through that route. All six
 * reds arrive through a `keysOf` or whole-row comparison and none
 * through a field read.
 */
import type { PersonaRecord } from './store.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
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

import { buildPersonasRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('personas-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It carries {@link STORED_ROLE} too, which is the widening control
 * the duplicate case rests on: `personas_domain_id_role_unique` is
 * per-domain, so a store or a service holding it globally cannot
 * even build this fixture.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * An id no planted persona carries.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is
 * the `404` case's subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The role both planted domains carry, and every duplicate takes. */
const STORED_ROLE = 'scorer';

/** The second role of {@link STORED_SLUG}, which every patch moves. */
const PATCHED_ROLE = 'drafter';

/** A role no planted domain carries, and every control writes. */
const FREE_ROLE = 'researcher';

/**
 * A second free role, for the one case that writes twice.
 *
 * The create case needs two accepted writes to say the ids differ
 * and that the empty text is the request's rather than a default,
 * and {@link FREE_ROLE} can only be taken once inside one domain.
 */
const SPARE_ROLE = 'reviewer';

/** The system text a create sends when the text is not the subject. */
const SOME_TEXT = 'Weigh what the researcher brought back.';

/** The system text {@link STORED_ROLE} is planted carrying. */
const SCORER_TEXT = 'Score what the researcher found.';

/** The system text {@link PATCHED_ROLE} is planted carrying. */
const DRAFTER_TEXT = 'Draft the digest.';

/**
 * What a patch of the system text writes instead.
 *
 * Distinct from both texts above, so the control that a patch
 * naming no `systemText` left the stored one standing is a reading
 * rather than an assumption.
 */
const PATCHED_TEXT = 'Draft the digest, and say what it left out.';

/**
 * The two roles {@link STORED_SLUG} is planted with, in the order
 * `PersonaStore.listPersonas` promises to answer them.
 *
 * Planted the other way round by {@link withPersonas} — the
 * scorer first — so the ascending order a list case asserts is
 * the store's own rather than the order the rows arrived in. That
 * this table is itself ascending is a case below, since an
 * expectation compared against an unsorted list would pin the wrong
 * order just as quietly as no assertion would.
 */
const LISTED_ROLES = [PATCHED_ROLE, STORED_ROLE];

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the two list cases, which assert `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * being a default.
 */
const DEFAULT_PER_PAGE = 50;

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/personas/service.ts`'s constant; what is
 * pinned here is that it arrives unmodified with `code` beside it
 * and nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a persona answers with. */
const NO_SUCH_PERSONA_BODY = {
  code: 'NOT_FOUND',
  message: 'No persona carries that id',
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
 * The whole body a segment that is not a slug answers with.
 *
 * `invalid_format` and not `invalid_type`, because a path segment
 * is already a string: what `slugParamSchema` refuses is its
 * SHAPE. Asserted from one constant on both routes that take a
 * `:slug`, which are not the two that take an `:id`.
 */
const NOT_A_SLUG_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'slug',
    message: 'Not in the expected format.',
    code: 'invalid_format',
  }],
};

/**
 * The whole body a taken role answers with, from either write.
 *
 * Asserted on the create AND on the rename, from one constant, so a
 * module that stopped translating one of the two call sites is a
 * red case rather than a difference nobody looked for.
 */
const ROLE_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This domain already carries a persona for that role',
};

/**
 * The whole body a create with no `systemText` answers with.
 *
 * ONE detail, naming the member and nothing the request said. The
 * message is this repository's own vocabulary rather than zod's,
 * which `src/http/validation.ts` carries the argument for, and
 * `invalid_type` covers both a missing member and a wrongly typed
 * one — zod raises one code for the two, and they differ only in
 * the field path, which is where the difference belongs.
 */
const NO_SYSTEM_TEXT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'systemText',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The members `PersonaRecord` declares, as a response carries them.
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
const PERSONA_KEYS = [
  'domainId',
  'id',
  'role',
  'systemText',
] as const satisfies readonly (keyof PersonaRecord)[];

/** The members every body this router answers a resource in has. */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/** The same members, plus the one a windowed read adds to them. */
const PAGE_KEYS = [
  ...RESOURCE_KEYS,
  'meta',
] as const satisfies readonly (keyof PaginatedEnvelope<unknown>)[];

/** The members `meta` describes the window and the collection with. */
const META_KEYS = [
  'page',
  'perPage',
  'total',
  'totalPages',
] as const satisfies readonly (keyof PaginationMeta)[];

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

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<PersonaRecord, typeof PERSONA_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `PersonaRecord`, to either envelope or to
 * `meta` and to none of the lists above turns
 * {@link EveryKeyListed} into `never`, and this initializer is then
 * a TS2322 at this line — before any case can compare a response
 * against a set that has quietly stopped describing it. Read in a
 * case below so it is a symbol this file uses rather than one lint
 * reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link PERSONA_KEYS}, sorted at use rather than by hand. */
const PERSONA_KEY_SET: readonly string[] = [...PERSONA_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/**
 * Just enough of an answered persona for an assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the one member the cases
 * project out of a page, and never a substitute for the key-set
 * assertion that says what the rest of the row was.
 */
interface RoledRow {
  /** Which role the text is for, and what a case finds it by. */
  readonly role: string;
}

/**
 * Builds an app carrying one freshly built personas router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app leaves
 * out is the framework's middleware stack and the auth guard: that
 * the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildPersonasApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildPersonasRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains, three personas, and the app in front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each of its three rows earns its place twice. The two roles under
 * {@link STORED_SLUG} are what a duplicate takes and what every
 * patch addresses, and they are also a collection a window can be
 * narrower than, which is what the list answers are read through.
 * The row under {@link OTHER_SLUG} carries the FIRST domain's
 * role: it is the widening control the `409` cases rest on, and the
 * one the delete reads afterwards to say it took a row by id rather
 * than every row playing that role.
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/personas`, so a case about a patch is not
 * also a case about the create route — and so the duplicate case
 * is refused by a row it did not have to create successfully first.
 * No route on this router can write a domain at all.
 *
 * @returns The app, the id {@link STORED_SLUG} was given, and the
 *   ids of the two rows planted under it. The store is not handed
 *   back: every reading a case takes afterwards is a response, so a
 *   case reaching past the surface under test would be pinning the
 *   fixture rather than the router. The ids are the exception and
 *   are addresses rather than readings — a request cannot name a
 *   row without one, and `domainId` is the member no request body
 *   carries, which is what makes its arrival the store's answer.
 */
async function withPersonas(): Promise<{
  app: Application;
  domainId: number;
  scorerId: number;
  drafterId: number;
}> {
  const store = createMemoryResearchStore();
  const stored = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });
  const other = await store.insertDomain({
    slug: OTHER_SLUG,
    name: 'Example Urban Transit',
    settings: {},
  });
  const scorer = await store.insertPersona({
    domainId: stored.id,
    role: STORED_ROLE,
    systemText: SCORER_TEXT,
  });
  const drafter = await store.insertPersona({
    domainId: stored.id,
    role: PATCHED_ROLE,
    systemText: DRAFTER_TEXT,
  });

  await store.insertPersona({
    domainId: other.id,
    role: STORED_ROLE,
    systemText: 'Score what the transit researcher found.',
  });

  return {
    app: buildPersonasApp(store),
    domainId: stored.id,
    scorerId: scorer.id,
    drafterId: drafter.id,
  };
}

/** The path a domain's personas are read and written at. */
function personasPath(slug: string): string {
  return `/domains/${slug}/personas`;
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute at this boundary: a row's id is
 * the store's own, so a whole-body literal is unavailable for an
 * answer carrying one — while a key set catches the fault a field
 * read cannot, which is a member arriving that nobody asserted.
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
 * The roles a read answered, in the order it answered them.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's role.
 */
function rolesOf(body: { data: readonly RoledRow[] }): string[] {
  return body.data.map((row) => row.role);
}

/**
 * The row a read carries under one role.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row would
 * otherwise reach `toStrictEqual` as `undefined` and pass against
 * any other absent row, which is a green nobody wrote.
 *
 * @param rows - A read's `data`, as it came off the wire.
 * @param role - The role to find.
 * @returns The row carrying it.
 * @throws Error - When the read carries no such row.
 */
function personaFor(rows: readonly RoledRow[], role: string): RoledRow {
  const row = rows.find((candidate) => candidate.role === role);

  if (row === undefined) {
    throw new Error(`The roster carries no row under the role ${role}`);
  }

  return row;
}

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no persona
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withPersonas();

    const missing = await request(app).get(personasPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies
    // the assertion above on its own. It also says what the 404 is
    // FOR — a domain with no personas is a 200 carrying
    // `data: []`, so only a domain that is not there answers this
    // way.
    const found = await request(app).get(personasPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(2);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withPersonas();
    const body = { role: FREE_ROLE, systemText: SOME_TEXT };

    const missing = await request(app)
      .post(personasPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(personasPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createPersona` parses the body BEFORE
    // it resolves the slug, so a malformed one would be answered
    // 422 and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe(FREE_ROLE);
  });
});

describe('an id naming no persona', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, drafterId } = await withPersonas();
    const patch = { systemText: 'Draft the digest, briefly.' };

    const missing = await request(app)
      .patch(`/personas/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/personas/${drafterId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_PERSONA_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.systemText).toBe(patch.systemText);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, drafterId } = await withPersonas();

    const missing = await request(app).delete(`/personas/${ABSENT_ID}`);
    const removed = await request(app).delete(`/personas/${drafterId}`);
    const afterwards = await request(app).get(personasPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_PERSONA_BODY);
    // Nothing hangs off a persona, so this delete has no guard to
    // refuse it. That the domain carries one persona afterwards is
    // what says the 204 was a delete rather than a handler
    // answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(1);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, drafterId } = await withPersonas();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(app)
      .patch('/personas/abc')
      .send({});
    const onDelete = await request(app).delete('/personas/abc');
    const anId = await request(app).delete(`/personas/${drafterId}`);

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

  it('answers 422 naming the slug rather than 404', async () => {
    const { app } = await withPersonas();

    // Upper case, which `slugParamSchema` refuses and which a
    // lookup would simply not find. The two routes that take a
    // `:slug` are not the two that take an `:id`, so this case and
    // the one above narrow disjoint halves of the router.
    const onList = await request(app).get(personasPath('Example-Radar'));
    const onCreate = await request(app)
      .post(personasPath('Example-Radar'))
      .send({ role: FREE_ROLE, systemText: SOME_TEXT });
    const aSlug = await request(app).get(personasPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap, and a parameter nothing declares
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app } = await withPersonas();
    const personas = personasPath(STORED_SLUG);

    const overCap = await request(app).get(`${personas}?perPage=201`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get(`${personas}?perPage=200`);

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
    const { app } = await withPersonas();

    // A misspelt `page`. Stripped rather than refused, it would
    // answer page 1 and look to the caller like a collection that
    // has nothing past its first page. This route is paginated,
    // unlike the taxonomy's, so the parameter it refuses here is a
    // typo rather than a vocabulary it does not speak.
    const response = await request(app)
      .get(`${personasPath(STORED_SLUG)}?pge=2`);

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
// The payload: a role the domain carries, and a member a create owes
// ---------------------------------------------------------------------------

describe('a write proposing a role the domain carries', () => {
  it('answers 409 on a create, where a free role answers 201', async () => {
    const { app } = await withPersonas();

    const duplicate = await request(app)
      .post(personasPath(STORED_SLUG))
      .send({ role: STORED_ROLE, systemText: SOME_TEXT });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post(personasPath(STORED_SLUG))
      .send({ role: FREE_ROLE, systemText: SOME_TEXT });
    // The widening control, which neither of the two above can
    // stand in for: the key is unique within the DOMAIN and not
    // across the table, so the SAME role under a second domain has
    // to be accepted. A router or a store holding it globally is
    // green against every other case in this file.
    const elsewhere = await request(app)
      .post(personasPath(OTHER_SLUG))
      .send({ role: PATCHED_ROLE, systemText: SOME_TEXT });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ROLE_TAKEN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe(FREE_ROLE);
    expect(elsewhere.status).toBe(201);
  });

  it('answers 409 on a rename, where a free role answers 200', async () => {
    const { app, drafterId } = await withPersonas();

    const duplicate = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: STORED_ROLE });
    // The control is a rename that lands, through the SAME
    // operation: without it this case is equally green against a
    // route that refuses every rename it is given.
    const renamed = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: FREE_ROLE });

    // The same body constant as the create, which is the claim:
    // two writes reach one unique key, and this is the only wave-1
    // patch that can reach one at all. A module that stopped
    // translating either call site is a red case rather than a
    // difference nobody looked for.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(ROLE_TAKEN_BODY);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.role).toBe(FREE_ROLE);
  });
});

describe('a create body carrying no systemText', () => {
  it('answers 422 naming the member a patch may omit', async () => {
    const { app, drafterId } = await withPersonas();

    const created = await request(app)
      .post(personasPath(STORED_SLUG))
      .send({ role: FREE_ROLE });
    // The control is the SAME member absent from a patch, which is
    // legal: `patchPersonaSchema` holds both members optional
    // because a patch names what to rewrite, while a create states
    // a whole persona. Without this the case is equally green
    // against a router refusing every body with no `systemText` in
    // it.
    const patched = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: FREE_ROLE });

    // The WHOLE envelope, because the detail is the answer here
    // rather than an accompaniment to the status: a caller reads
    // `field` to know which member to add, and nothing it sent is
    // in the body at all.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NO_SYSTEM_TEXT_BODY);
    expect(patched.status).toBe(200);
    expect(patched.body.data.role).toBe(FREE_ROLE);
  });
});

// ---------------------------------------------------------------------------
// What every positive answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every positive answer is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // `PersonaRecord`, to either envelope or to `meta` and to none
    // of the lists is a TS2322 at that declaration, before any
    // assertion below can compare a response against a set that has
    // quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`, which
    // is `okPage`'s stated contract and the one difference the
    // cases below read this router's two success shapes apart by.
    expect(PAGE_KEY_SET).toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And `systemText` is on the record, which is the member this
    // group is FOR: a persona is its text, and a projection that
    // dropped it would leave every status assertion here green.
    expect(PERSONA_KEY_SET).toContain('systemText');
  });

  it('plants distinct roles and writes under a free one', () => {
    // Without this, a create case naming a planted role would be
    // refused 409 and read as a router fault rather than as a
    // fixture that overlapped itself — and `personaFor` would have
    // two rows to choose between.
    expect(new Set(LISTED_ROLES).size).toBe(LISTED_ROLES.length);
    // An ascending expectation compared against an unsorted table
    // pins the wrong order just as quietly as no assertion would,
    // and the ordering claim is the one thing a list case cannot
    // borrow from anywhere else in this file.
    expect([...LISTED_ROLES].sort()).toStrictEqual(LISTED_ROLES);
    expect(LISTED_ROLES).not.toContain(FREE_ROLE);
    // And the three texts differ, which is what makes each patch
    // control below a reading rather than an assumption: a handler
    // rewriting the text with the one already stored would satisfy
    // every assertion made against equal strings.
    expect(new Set([SCORER_TEXT, DRAFTER_TEXT, PATCHED_TEXT]).size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The page: one window of a domain's roster, beside the meta for it
// ---------------------------------------------------------------------------

describe('a roster read that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, domainId, scorerId } = await withPersonas();
    const personas = personasPath(STORED_SLUG);

    const whole = await request(app).get(personas);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same two
    // rows. A handler ignoring the window answers both rows to all
    // three calls, and a total taken from the rows in hand answers
    // 1 to each of the narrow pair. The wide read is what makes the
    // narrow ones read as narrowings OF something.
    const first = await request(app)
      .get(personas)
      .query({ page: 1, perPage: 1 });
    const second = await request(app)
      .get(personas)
      .query({ page: 2, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // THREE members and not two: this list applies a window, so it
    // carries the `meta` describing one — which is the difference
    // between the envelope `okPage` writes and the one `ok` does.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: LISTED_ROLES.length,
      totalPages: 1,
    });
    // Role ascending, which the fixture cannot have arranged: the
    // scorer was planted first and sorts second, so this order is
    // the store's own rather than the order the rows arrived in.
    expect(rolesOf(whole.body)).toStrictEqual(LISTED_ROLES);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(PERSONA_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering every
    // read the same wrong row would satisfy any cross-response
    // compare. `domainId` is here because no list case could
    // otherwise say which domain the rows came out of.
    expect(personaFor(whole.body.data as RoledRow[], STORED_ROLE))
      .toStrictEqual({
        id: scorerId,
        domainId,
        role: STORED_ROLE,
        systemText: SCORER_TEXT,
      });
    // The two windows are disjoint and each names the total of the
    // COLLECTION, which no page could have counted from its rows.
    expect(rolesOf(first.body)).toStrictEqual([PATCHED_ROLE]);
    expect(rolesOf(second.body)).toStrictEqual([STORED_ROLE]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: LISTED_ROLES.length,
      totalPages: LISTED_ROLES.length,
    });
    expect(second.body.meta).toStrictEqual({
      page: 2,
      perPage: 1,
      total: LISTED_ROLES.length,
      totalPages: LISTED_ROLES.length,
    });
  });

  it('answers an empty page past the end of the roster', async () => {
    const { app } = await withPersonas();
    const personas = personasPath(STORED_SLUG);

    const past = await request(app).get(`${personas}?page=99`);
    // The control: the same collection through a window that
    // reaches it. Without it an empty `data` is equally green
    // against a list route answering nothing to anybody.
    const reached = await request(app).get(personas);

    expect(past.status).toBe(200);
    // The envelope does not change shape when the page is empty,
    // which is what makes an overshot page a page rather than a
    // 404: the domain is there, its roster is there, and only the
    // window over it is empty.
    expect(keysOf(past.body)).toStrictEqual(PAGE_KEY_SET);
    expect(past.body.data).toStrictEqual([]);
    // `meta` echoes the page that was ASKED FOR and describes the
    // COLLECTION, so 99 sits beside a `totalPages` of 1 and a
    // `total` no empty page could have been counted from.
    expect(past.body.meta).toStrictEqual({
      page: 99,
      perPage: DEFAULT_PER_PAGE,
      total: LISTED_ROLES.length,
      totalPages: 1,
    });
    expect(rolesOf(reached.body)).toStrictEqual(LISTED_ROLES);
    expect(reached.body.meta.total).toBe(LISTED_ROLES.length);
  });
});

// ---------------------------------------------------------------------------
// The resource: one persona added, and the row the store answered
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the stored row, not the request', async () => {
    const { app, domainId } = await withPersonas();
    const personas = personasPath(STORED_SLUG);

    const created = await request(app)
      .post(personas)
      .send({ role: FREE_ROLE, systemText: SOME_TEXT });
    // The control, along the axis under test and through the SAME
    // operation: the identical write stating an EMPTY text. That is
    // a legal value and means something — the role exists and has
    // no instructions yet — so the pair says the create writes the
    // text it was handed rather than defaulting or dropping it, and
    // an empty string reaching the wire as no member at all would
    // be caught by the key set rather than by the read below.
    const silent = await request(app)
      .post(personas)
      .send({ role: SPARE_ROLE, systemText: '' });

    expect(created.status).toBe(201);
    expect(silent.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(silent.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(created.body.data)).toStrictEqual(PERSONA_KEY_SET);
    expect(keysOf(silent.body.data)).toStrictEqual(PERSONA_KEY_SET);
    expect(created.body.success).toBe(true);
    expect(created.body.data.role).toBe(FREE_ROLE);
    expect(created.body.data.systemText).toBe(SOME_TEXT);
    expect(silent.body.data.systemText).toBe('');
    // Neither member is on either request body — the path named
    // the domain and nothing named an id — so both arriving right
    // is the STORE having answered rather than the request having
    // been echoed back under a 201.
    expect(created.body.data.domainId).toBe(domainId);
    expect(silent.body.data.domainId).toBe(domainId);
    expect(typeof created.body.data.id).toBe('number');
    expect(created.body.data.id).not.toBe(silent.body.data.id);
  });

  it('stores it, and leaves the roster it joined alone', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const { app, domainId, scorerId } = await withPersonas();
    const personas = personasPath(STORED_SLUG);

    const created = await request(app)
      .post(personas)
      .send({ role: FREE_ROLE, systemText: SOME_TEXT });
    const listed = await request(app).get(personas);
    const rows = listed.body.data as RoledRow[];
    const expected = [...LISTED_ROLES, FREE_ROLE].sort();

    expect(listed.status).toBe(200);
    // The whole roster, so a create reaching more rows than the one
    // it wrote is a red case here rather than an answer nobody
    // compared against anything. Sorted at use, because where the
    // new role falls among the planted ones is the store's ordering
    // rather than this case's subject.
    expect(rolesOf(listed.body)).toStrictEqual(expected);
    expect(listed.body.meta.total).toBe(expected.length);
    expect(personaFor(rows, FREE_ROLE)).toStrictEqual(created.body.data);
    // And the row that was already there still carries what it
    // carried, which no assertion over a created row could say: a
    // create lands ONE row. A whole-row literal rather than a field
    // read, since the fault worth catching here is a neighbour
    // gaining a member or losing one on the way past a write.
    expect(personaFor(rows, STORED_ROLE)).toStrictEqual({
      id: scorerId,
      domainId,
      role: STORED_ROLE,
      systemText: SCORER_TEXT,
    });
  });
});

// ---------------------------------------------------------------------------
// The patch: the text rewritten, and the members it never named
// ---------------------------------------------------------------------------

describe('a patch of the system text that lands', () => {
  it('answers 200 with the text the patch wrote', async () => {
    const { app, domainId, drafterId } = await withPersonas();

    const rewritten = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ systemText: PATCHED_TEXT });
    // The first control: a member the patch does not name is left
    // alone. Without it the case is equally green against a handler
    // rewriting every column on every patch — and it runs the
    // other way round here, since this patch names only the ROLE
    // and the text written above has to survive it.
    const renamed = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ role: FREE_ROLE });
    // The second: an EMPTY text is a value being written rather
    // than a member being removed, which is the distinction
    // `PersonaRecord` states and which absent-means-leave-it-alone
    // makes reachable at all. A handler reading a body loosely
    // answers these two requests the same way.
    const cleared = await request(app)
      .patch(`/personas/${drafterId}`)
      .send({ systemText: '' });
    const listed = await request(app).get(personasPath(STORED_SLUG));

    expect(rewritten.status).toBe(200);
    // Two members, not three: a patch answers one resource, and a
    // `meta` arriving here would be the page envelope on a body
    // that describes no window.
    expect(keysOf(rewritten.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(rewritten.body.data)).toStrictEqual(PERSONA_KEY_SET);
    expect(rewritten.body.success).toBe(true);
    expect(rewritten.body.data.systemText).toBe(PATCHED_TEXT);
    // The role, the id and the domain came through untouched, and
    // the request named none of them — asserted because a silent
    // rename or a move between domains would leave every text read
    // in this case green.
    expect(rewritten.body.data.role).toBe(PATCHED_ROLE);
    expect(rewritten.body.data.id).toBe(drafterId);
    expect(rewritten.body.data.domainId).toBe(domainId);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.role).toBe(FREE_ROLE);
    // The text written by the first patch is still there under a
    // second that never named it.
    expect(renamed.body.data.systemText).toBe(PATCHED_TEXT);
    expect(cleared.status).toBe(200);
    expect(keysOf(cleared.body.data)).toStrictEqual(PERSONA_KEY_SET);
    expect(cleared.body.data.systemText).toBe('');
    // And the store holds what the last patch answered, read back
    // through the OTHER operation: a patch answering a row it never
    // wrote satisfies every assertion above.
    expect(personaFor(listed.body.data as RoledRow[], FREE_ROLE))
      .toStrictEqual({
        id: drafterId,
        domainId,
        role: FREE_ROLE,
        systemText: '',
      });
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what it leaves behind
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing at all, and takes the row', async () => {
    const { app, drafterId } = await withPersonas();

    const removed = await request(app).delete(`/personas/${drafterId}`);
    const listed = await request(app).get(personasPath(STORED_SLUG));
    const elsewhere = await request(app).get(personasPath(OTHER_SLUG));
    // The control, through the SAME operation: the identical
    // request against an id that named a row a moment ago is a 404,
    // which is what makes the 204 above a delete rather than what
    // this route answers to any id it is handed.
    const again = await request(app).delete(`/personas/${drafterId}`);

    expect(removed.status).toBe(204);
    // An EMPTY key set, which is this route's half of the shape the
    // rest of the file reads: a deleted resource has no
    // representation, so what is asserted is that NOTHING travelled
    // rather than that some envelope did.
    expect(keysOf(removed.body)).toStrictEqual([]);
    expect(removed.text).toBe('');
    expect(removed.type).toBe('');
    // The row is gone, its neighbour is not, and the domain still
    // answers a page: nothing in schema v2 points at `personas`, so
    // this is the one wave-1 delete with neither a guard nor a
    // cascade, and a 204 that took the roster with it would be
    // caught here rather than by anything the delete answered.
    expect(listed.status).toBe(200);
    expect(rolesOf(listed.body)).toStrictEqual([STORED_ROLE]);
    expect(listed.body.meta.total).toBe(1);
    // The second domain still carries its own persona, which is the
    // widening control: this delete is addressed by an id, and a
    // store deleting by ROLE would take that row too.
    expect(rolesOf(elsewhere.body)).toStrictEqual([STORED_ROLE]);
    expect(again.status).toBe(404);
    expect(again.body).toStrictEqual(NO_SUCH_PERSONA_BODY);
  });
});
