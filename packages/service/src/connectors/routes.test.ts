/**
 * `src/connectors/routes.ts` — what each of the four routes
 * answers when it REFUSES: the status, the envelope and the
 * members each reaches the wire with. Driven over supertest
 * against a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a `kind` outside the tuple is a
 * `ValidationError`, that an unknown id is a `NotFoundError`, that
 * the mask literal is refused wherever it sits, that a delete
 * reads its one count before it refuses — those are claims about
 * the RULES and are pinned one file over, over direct calls. What
 * no call can report is whether the rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, the members that envelope carried, and whether a
 * handler swallowed a throw on the way. So every case below reads
 * a response and none of them reads a return value.
 *
 * TWELVE CASES IN EIGHT GROUPS. Four guard the fixture, the two
 * vocabularies every refusal is read against and the shapes every
 * answer is held to. Three cover the address, two the query, two
 * the payload, and one the delete guard. The POSITIVE half — what
 * a list, a create, a patch and a delete answer when they LAND —
 * is a task of its own, and every control below is a landing
 * answer read only as far as the axis its own case is about.
 *
 * ONE ADDRESS SHAPE AND NOT TWO, which is where this file is
 * shorter than every other resource group's. `connectors` hangs
 * off no domain, so there is no `:slug` to narrow and no second
 * `404` to tell the first from: an id naming no connector is
 * `404` on the two operations that take one, asserted against ONE
 * shared body constant rather than two literals that agree today.
 * A segment that is not an id at all is `422` naming `id` and
 * never `404` — a `404` says the row is not there, and a request
 * that never named a row has not established that. Each is
 * asserted across BOTH routes that take the segment inside one
 * case, because a handler is a chance to narrow only its own.
 *
 * THE LIST TAKES A PARAMETER NO OTHER LIST ON THIS SURFACE DOES,
 * and both cases about it are about what that cost. A `?kind`
 * outside `CONNECTOR_KINDS` is `422` naming the parameter with
 * code `invalid_value`, and its control is a member of the tuple
 * that planted rows carry — so the pair says the refusal is about
 * the TUPLE rather than about a route refusing every `?kind` it is
 * handed. Both halves read the tuple at RUNTIME rather than
 * trusting two literals, so a member added to `CONNECTOR_KINDS`
 * reddens the fixture guard instead of leaving a row nobody
 * notices is wrong.
 *
 * AND THE CAP AND THE STRICTNESS SURVIVED THE EXTENSION, which is
 * the case the `.extend()` in `routes.ts` exists to be checked by.
 * `connectorListQuerySchema` adds one member to the schema
 * `src/http/schemas.ts` declares, and an extension that dropped
 * either property would leave every other case in this file green:
 * a `?perPage` above the cap would be served rather than refused,
 * and `?knid=llm` would be an unfiltered page rather than a `422`
 * naming `query`. Both are asserted in one case, told apart by
 * which assertion fails, and the cap is paired with a request at
 * exactly the cap.
 *
 * THE PAIR IS THE KEY, AND IT IS PER-KIND. A create naming a kind
 * and name the deployment already carries is `409`, and so is a
 * patch whose RESULTING name is one that kind already holds. The
 * two are asserted from ONE body constant, because two handlers
 * are two chances to answer a taken pair two different ways. The
 * control is the same NAME under a different kind, accepted
 * through the create — a router comparing names alone passes both
 * refusals and fails it.
 *
 * THE MASK IS REFUSED ON THE WAY IN, AND THE DETAIL NAMES A PATH
 * WITH NO KEY IN IT. The create submits the literal at the root of
 * a config and answers `config.*`; the patch submits it one level
 * down and answers `config.*.*`, so the DEPTH survives on the wire
 * and the operator's own key does not. The wildcard is spelled as
 * a literal here, which is the only thing that pins it: the
 * constant behind it is private to the service and a test
 * importing it would agree with itself however it were respelt.
 * The control is a REAL secret submitted through the same two
 * operations, accepted and answered as the mask — without it both
 * refusals are equally green against a router refusing every
 * config it is handed.
 *
 * AND THE KEY IT WALKED PAST DOES NOT COME BACK. The operator
 * chose that key, so a detail naming it would be the same leak the
 * `*` exists to prevent. That case COUNTS its occurrences in the
 * serialised body rather than asserting an absence, and takes the
 * same count over a PLANTED envelope carrying it — because a
 * search that would find nothing anywhere reports a clean refusal
 * and a leaking one alike. The same count is taken over the
 * unregistered `?kind`, which is the one other VALUE any request
 * in this file submits that a refusal could plausibly repeat.
 *
 * THE DELETE GUARD IS ONE COUNTED TABLE, not the sources group's
 * two: `export_subscriptions_connector_id_connectors_id_fk` is the
 * whole of what refuses a connector delete, re-derived from the
 * generated SQL in `./store.ts` rather than from a plan. The
 * refusal is asserted WHOLE, `details` included, because the count
 * is the answer rather than an accompaniment to the status — an
 * operator reading what a delete would have taken is reading that
 * number. The key set is swept off `ConnectorDependentCounts`
 * rather than named twice, so a second counted table reddens this
 * case instead of travelling unasserted.
 *
 * ANTI-VACUITY. A router that refused everything, or that answered
 * every read the same row, would satisfy most of what is below, so
 * each case carries its own control in the same body, varied along
 * the axis under test: each `404` reads what IS there through the
 * SAME operation, the not-an-id case ends on an id that is one,
 * the refused `?kind` is paired with a member of the tuple, the
 * over-cap `perPage` is paired with a request at exactly the cap,
 * the taken pair is paired with the same name under another kind,
 * the submitted mask is paired with a real secret through both
 * writes, and the refused delete is paired with a connector
 * nothing names.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim; what a
 * refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s; and that no sentinel secret
 * reaches a response body or the process output is
 * `tests/api/connector-secret.test.ts`'s. The containment readings
 * below are scoped to the two channels these routes open, which
 * are the operator's own config key and the value a bad `?kind`
 * carries.
 *
 * MUTATION GRID, derived over all twelve cases by mutating one
 * file one edit at a time and reading the failed `fullName` SET
 * from a `--reporter=json` run rather than a count. FOURTEEN legs,
 * each named by the EDIT it makes rather than by its effect, since
 * a leg described only by its effect is one nobody can run again.
 * Ten mutate `./routes.ts`, two mutate `src/http/schemas.ts` — the
 * only target that can reach the bound and the strictness the list
 * schema INHERITS — and two mutate `./service.ts`, which owns the
 * masking and the delete guard.
 *
 * THE ONE ADDRESS LEG REDDENS SIX, which is every case that
 * addresses a row by id. Returning the segment raw from
 * {@link readId} reaches both `404` cases, the not-an-id case, the
 * taken-pair case, the delete guard and the mask case — that last
 * one only through the ACCEPTED control beside it, since
 * `patchConnector` parses the body before it uses the id and the
 * refused half of that case is answered whatever the segment was.
 * There is no second address leg here: `connectors` hangs off no
 * domain, so this group has no `:slug` to narrow.
 *
 * THE THREE STATUS LEGS SEPARATE. `res.status(201)` written as
 * `200` on the create reddens TWO, both of them landing controls
 * rather than cases named for a create. `res.status(200)` written
 * as `204` on the patch reddens TWO. `res.status(204)` written as
 * `200` on the delete reddens THREE. So the statuses ARE pinned
 * here, by no case that is about them — which is what a
 * refusals-only file's controls buy.
 *
 * `ok(page.rows)` IN PLACE OF `okPage(page.rows, meta)` REDDENS
 * ONE, the extension case, which is the only read here that looks
 * at `meta` at all.
 *
 * THE FOUR QUERY LEGS REDDEN ONE EACH, IN TWO PAIRS, and neither
 * member of either pair is reachable from the other. Spelling
 * `kind` as `z.string()` and dropping the `.extend()` altogether
 * both land on the `?kind` case — the first serves the
 * unregistered family, the second refuses the registered one — so
 * they are told apart by which assertion inside it fails. Dropping
 * `.max(MAX_PER_PAGE)` and dropping `.strict()` in
 * `src/http/schemas.ts` both land on the case beside it, which is
 * exactly what that case exists to report: an extension that lost
 * either property is invisible everywhere else in this file.
 *
 * THE TWO SERVICE LEGS REDDEN ONE EACH. Answering a create's row
 * UNMASKED reddens the mask case, through the control that reads
 * the literal back in place of a real credential — the refusals in
 * that case cannot report it, being refusals. Skipping the
 * dependent guard reddens the delete case.
 *
 * AND THREE LEGS REDDEN NOTHING, all recorded rather than
 * repaired. A fixed `{ limit: 50, offset: 0 }` in place of
 * `toStoreWindow(query)` reddens ZERO, and taking `total` from
 * `page.rows.length` rather than from `page.total` reddens ZERO,
 * for one reason: no refusal case can afford a window narrower
 * than the collection it is reading, so every page here holds
 * every row and the two numbers agree. Both become exactly one
 * red — the SAME red — as soon as one list case pages, which is
 * the positive half's.
 * Passing `{}` where the filter is built reddens ZERO for the
 * complementary reason: the `?kind` control asserts that a
 * registered member was SERVED, which an unfiltered page also is.
 * Which rows a `?kind` answers is the positive half's claim too,
 * and this file records the zero rather than pretending to it.
 */
import type {
  ConnectorDependentCounts,
  ConnectorRecord,
} from './store.js';
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
import { CONNECTOR_KINDS } from '../db/schema/values.js';

import { buildConnectorsRouter } from './routes.js';
import { MASKED_SECRET, SECRET_CONFIG_KEYS } from './secrets.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('connectors-routes-test', {
  level: 'silent',
});

/** The kind the fixture's two model connectors are filed under. */
const LLM_KIND = 'llm';

/** The kind the one subscribed connector is filed under. */
const NOTEBOOK_KIND = 'notebook';

/** The name of the `llm` row carrying a credential. */
const MODEL_NAME = 'primary';

/** A second `llm` row, so a rename has a pair to collide with. */
const FALLBACK_NAME = 'fallback';

/** The `notebook` row an export subscription still names. */
const ARCHIVE_NAME = 'archive';

/**
 * A name no planted row carries, and the one every create that has
 * to LAND submits.
 *
 * Colliding would turn a `422` into a `409` on some requests and
 * change nothing on others, which is a control that reads
 * ambiguously rather than one that fails.
 */
const FRESH_NAME = 'staging';

/**
 * An id shaped like one and carried by no row in any case here.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const MISSING_ID = 9999;

/** Where the fixture's model connector says its service answers. */
const MODEL_ENDPOINT = 'https://model.example.test/v1';

/**
 * What the fixture's model connector authenticates with.
 *
 * A live credential in every sense this file cares about: it is
 * stored under a `SECRET_CONFIG_KEYS` member, so every read of
 * that row answers the mask in its place.
 */
const MODEL_SECRET = 'model-live-credential';

/**
 * The rostered key {@link MODEL_SECRET} is stored under, and the
 * key both mask controls submit a real secret under.
 *
 * Held against the runtime roster by the fixture guard, so a key
 * REMOVED from `SECRET_CONFIG_KEYS` reddens there rather than
 * leaving these controls quietly asserting a mask nobody applies.
 */
const ROSTERED_KEY = 'apiKey';

/**
 * A credential the two mask controls rotate in.
 *
 * Distinct from {@link MODEL_SECRET}, so a control asserting a
 * masked answer cannot be satisfied by the value that was already
 * there.
 */
const ROTATED_SECRET = 'model-rotated-credential';

/**
 * A config key nobody rostered, and the key the mask cases submit
 * the literal under.
 *
 * The operator's own, which is the whole point of it: the walk
 * that finds the literal reports a VALUE wherever it sits, so this
 * key is walked past, and a detail naming it back would be the
 * leak the `*` exists to prevent. Distinctive as a substring,
 * because that case counts its occurrences in the refusal it
 * produced.
 */
const OPERATOR_KEY = 'deploymentSlot';

/**
 * A family of service nobody registered, and the value the query
 * case submits.
 *
 * Distinctive as a substring for the reason {@link OPERATOR_KEY}
 * gives: it is the one other VALUE any request in this file
 * submits that a refusal could plausibly repeat, and a short
 * realistic token would be satisfiable by some other member of the
 * envelope.
 */
const UNREGISTERED_KIND = 'sftp-mirror';

/** How many export subscriptions name {@link ARCHIVE_NAME}. */
const HELD_SUBSCRIPTIONS = 2;

/** How many connectors the fixture plants. */
const PLANTED_CONNECTORS = 3;

/**
 * The whole body a `404` about a connector answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take an
 * `:id` answer ONE envelope rather than two that happen to agree
 * today. The message is `src/connectors/service.ts`'s constant;
 * what is pinned here is that it arrives unmodified with `code`
 * beside it and nothing else.
 */
const NO_SUCH_CONNECTOR_BODY = {
  code: 'NOT_FOUND',
  message: 'No connector carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on both routes that
 * take an `:id`, which on this group is the whole of the address
 * vocabulary.
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
 * The whole body a `?kind` outside the tuple answers with.
 *
 * `invalid_value` and not `invalid_type`, which is what an enum
 * answers to a member it does not carry — and to an explicit
 * `null` as well, so a parameter widened to `z.string()` reddens
 * this case from more than one direction. The detail names `kind`,
 * because the fault has a path of its own; nothing the request
 * submitted is in this envelope at all, and that is the claim its
 * case makes by counting the submitted value in it.
 */
const BAD_KIND_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'kind',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a `?perPage` above the cap answers with.
 *
 * `too_big` and naming the parameter the caller typed, which is
 * what makes the refusal the only way a client learns it asked for
 * more than this surface serves.
 */
const OVER_CAP_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'perPage',
    message: 'Above the allowed maximum.',
    code: 'too_big',
  }],
};

/**
 * The whole body a query naming an undeclared parameter answers
 * with.
 *
 * ONE detail naming `query` rather than the parameter, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * REQUEST said. That it survives `.extend()` is what its case is
 * for.
 */
const UNDECLARED_QUERY_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'query',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a taken kind and name pair answers with.
 *
 * The sentence names the PAIR rather than the name, because the
 * key is per-kind: one name under two kinds is ordinary, and a
 * message naming the name alone would send an operator looking for
 * a collision that is not there. Asserted from one constant on
 * both writes that can propose a pair.
 */
const PAIR_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This deployment already carries a connector of that kind '
    + 'by that name',
};

/**
 * The whole body a config submitting the mask at the ROOT answers
 * with.
 *
 * One wildcard per segment the operator chose, so `config.*` is a
 * member of the config and the depth is the whole of what
 * survives. The literal `*` is spelled here rather than imported,
 * because the constant behind it is private to
 * `src/http/validation.ts` and to the service that respells it —
 * a test importing either would agree with itself however it were
 * respelt.
 */
const ROOT_MASK_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'config.*',
    message: 'Carries the value a read answers in place of a secret.',
    code: 'masked_secret',
  }],
};

/**
 * The whole body a config submitting the mask ONE LEVEL DOWN
 * answers with.
 *
 * The same sentence and the same code under a longer path, which
 * is the reading that says the depth survives: a service reporting
 * every occurrence as `config.*` would pass the case above and
 * fail this one.
 */
const NESTED_MASK_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'config.*.*',
    message: 'Carries the value a read answers in place of a secret.',
    code: 'masked_secret',
  }],
};

/**
 * The `code` and `message` a refused delete answers with, without
 * the count.
 *
 * The count is spread onto this at the assertion, so the SENTENCE
 * is one constant while the number is the subject's own. The
 * message names `/exports` because the repair is a different
 * request rather than a correction to this one, and there is no
 * confirmation that gets past the guard for it to name instead.
 */
const CONNECTOR_SUBSCRIBED_BODY = {
  code: 'CONFLICT',
  message: 'Export subscriptions still deliver through this connector; '
    + 'retire those under /exports first',
};

/**
 * The members `ConnectorRecord` declares, as a response carries
 * them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about.
 *
 * FOUR MEMBERS AND NO TIMESTAMP, which is what makes this the one
 * resource group on the surface whose answers carry no `Date`:
 * `connectors` declares neither stamp, so nothing here is
 * rendered by `Date#toJSON` on the way out.
 */
const CONNECTOR_KEYS = [
  'config',
  'id',
  'kind',
  'name',
] as const satisfies readonly (keyof ConnectorRecord)[];

/**
 * The one count a refused delete carries in `details`.
 *
 * Held to the interface by `satisfies`, so a second counted table
 * has to be named here before this file can be green again —
 * which is the one edit that would otherwise let a count travel to
 * a caller with nothing asserting it.
 */
const DEPENDENT_KEYS = [
  'exportSubscriptions',
] as const satisfies readonly (keyof ConnectorDependentCounts)[];

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
 * The tuple wrapper is load-bearing rather than decoration:
 * without it the union distributes over the conditional and the
 * answer is `boolean`, which accepts `true` as an initializer and
 * pins nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<ConnectorRecord, typeof CONNECTOR_KEYS>
  & CoversEveryKey<ConnectorDependentCounts, typeof DEPENDENT_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `ConnectorRecord`, to the dependent counts, to
 * either envelope or to `meta` and to none of the lists above
 * turns {@link EveryKeyListed} into `never`, and this initializer
 * is then a TS2322 at this line — before any case can compare a
 * response against a set that has quietly stopped describing it.
 * Read in a case below so it is a symbol this file uses rather
 * than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link CONNECTOR_KEYS}, sorted at use rather than by hand. */
const CONNECTOR_KEY_SET: readonly string[] = [...CONNECTOR_KEYS].sort();

/** {@link DEPENDENT_KEYS}, sorted. */
const DEPENDENT_KEY_SET: readonly string[] = [...DEPENDENT_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/** The roster read at run time, for the fixture guard below. */
const ROSTERED: readonly string[] = SECRET_CONFIG_KEYS;

/** The kind tuple read at run time, for that same guard. */
const KINDS: readonly string[] = CONNECTOR_KINDS;

/**
 * Just enough of an answered connector for an assertion to read
 * it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts`.
 */
interface AddressedRow {
  /** Which family of service the row reaches. */
  readonly kind: string;

  /** What the row is filed under within that family. */
  readonly name: string;
}

/**
 * The path one connector is patched and deleted under.
 *
 * @param id - The connector's id, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 */
function connectorPath(id: number | string): string {
  return `/connectors/${id}`;
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's kind, so a filtered page can be held to one
 *   family rather than to a length another narrowing would also
 *   satisfy.
 */
function kindsOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.kind);
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's name.
 */
function namesOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.name);
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
 *   answers.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
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
 * Builds an app carrying one freshly built connectors router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file's failures depend on
 * their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on this group reads the present.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildConnectorsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildConnectorsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Three connectors, one planted dependent state, and the app in
 * front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each row earns its place. Two share the `llm` kind, which is
 * where a rename has a pair to collide with and what a `?kind`
 * control narrows to; the `notebook` row is what the delete guard
 * refuses over, and its kind is also what says the natural key is
 * per-kind rather than per-name. Only the model row carries a
 * credential, so a case reading a masked answer is reading one row
 * rather than any row.
 *
 * NO DOMAIN IS PLANTED AND NONE IS NEEDED, which is the one shape
 * difference from every other resource fixture on this surface —
 * and it costs this file the reading a domain id would have given
 * it. On a domain-scoped group the row's `domainId` is the one
 * member no request names, so a row answering it is the store
 * having said where the row sat. Every member of a connector is
 * something a request can name, so there is no such member here
 * and this file makes no claim of that shape.
 *
 * Planted through the PORT rather than through `POST /connectors`,
 * so a case about a patch is not also a case about the create
 * route — and so the refused delete is refused by a subscription
 * count no route on this router could have written. The
 * subscription itself is a seam rather than a row:
 * `export_subscriptions` is not a table this port can write at
 * all.
 *
 * @returns The app and the three ids. The store is not handed
 *   back: every reading a case takes afterwards is a response, so
 *   a case reaching past the surface under test would be pinning
 *   the fixture rather than the router. The ids are addresses
 *   rather than readings — a request cannot name a row without
 *   one.
 */
async function withConnectors(): Promise<{
  app: Application;
  modelId: number;
  fallbackId: number;
  archiveId: number;
}> {
  const store = createMemoryResearchStore();
  const model = await store.insertConnector({
    kind: LLM_KIND,
    name: MODEL_NAME,
    config: { endpoint: MODEL_ENDPOINT, [ROSTERED_KEY]: MODEL_SECRET },
  });
  const fallback = await store.insertConnector({
    kind: LLM_KIND,
    name: FALLBACK_NAME,
    config: {},
  });
  const archive = await store.insertConnector({
    kind: NOTEBOOK_KIND,
    name: ARCHIVE_NAME,
    config: { vault: 'research' },
  });

  store.setConnectorSubscriptions(archive.id, HELD_SUBSCRIPTIONS);

  return {
    app: buildConnectorsApp(store),
    modelId: model.id,
    fallbackId: fallback.id,
    archiveId: archive.id,
  };
}

// ---------------------------------------------------------------------------
// What the fixture below plants, and what every answer is held to
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants one connector per state a case needs', () => {
    const planted = [
      `${LLM_KIND}/${MODEL_NAME}`,
      `${LLM_KIND}/${FALLBACK_NAME}`,
      `${NOTEBOOK_KIND}/${ARCHIVE_NAME}`,
    ];

    // Distinct pairs, so a case finding a row by its key cannot
    // find the wrong one — and two of them share a kind, which is
    // what a rename has to collide inside and what the `?kind`
    // control narrows to.
    expect(new Set(planted).size).toBe(planted.length);
    expect(planted).toHaveLength(PLANTED_CONNECTORS);
    // The conflict control re-uses a planted NAME under a kind
    // that does not carry it, which is the whole of what says the
    // key is per-kind: a router comparing names alone refuses that
    // control and passes both refusals beside it.
    expect(planted).toContain(`${LLM_KIND}/${MODEL_NAME}`);
    expect(planted).not.toContain(`${NOTEBOOK_KIND}/${MODEL_NAME}`);
    // And the name every create that has to LAND submits is one no
    // planted row carries under any kind, so a `422` that turned
    // into a `409` would be this file's fixture rather than its
    // subject.
    expect(planted.map((pair) => pair.split('/').at(-1)))
      .not.toContain(FRESH_NAME);
    // The delete guard is reached by a table that actually holds
    // something. A plant of none would leave the delete landing
    // and its case reading as a guard that stopped guarding.
    expect(HELD_SUBSCRIPTIONS).toBeGreaterThan(0);
    // The refusal spreads that count onto ONE sentence, so the
    // sentence must carry no count of its own: a message naming a
    // number would be green against a guard that had stopped
    // reading the table.
    expect(keysOf(CONNECTOR_SUBSCRIBED_BODY))
      .toStrictEqual(['code', 'message']);
  });

  it('reads both config keys off the runtime roster', () => {
    // The key the fixture stores a credential under IS rostered,
    // so every read of that row answers the mask — a key removed
    // from `SECRET_CONFIG_KEYS` reddens here rather than leaving
    // the mask controls asserting a replacement nobody makes.
    expect(ROSTERED).toContain(ROSTERED_KEY);
    // And the key the mask cases submit the literal under is NOT,
    // which is what makes those cases about the VALUE: the walk
    // reports the literal wherever it sits, and this key is one it
    // walked past rather than one it was looking for.
    expect(ROSTERED).not.toContain(OPERATOR_KEY);
    // The two secrets differ, so a control asserting a rotated
    // credential was stored cannot be satisfied by the one that
    // was already there.
    expect(MODEL_SECRET).not.toBe(ROTATED_SECRET);
  });

  it('reads both kind controls off the runtime tuple', () => {
    // Read off `CONNECTOR_KINDS` rather than trusting two
    // literals, so the pair stays two-directional: a member ADDED
    // to the tuple makes the refused `?kind` legal and reddens
    // here, and a member REMOVED makes a planted kind illegal and
    // reddens here too. Neither direction is reachable from the
    // other, and neither is reported by any assertion in the cases
    // themselves.
    expect(KINDS).toContain(LLM_KIND);
    expect(KINDS).toContain(NOTEBOOK_KIND);
    expect(KINDS).not.toContain(UNREGISTERED_KIND);
  });
});

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to `ConnectorRecord`, to the dependent count, to
    // either envelope or to `meta` and to none of the lists is a
    // TS2322 at that declaration, before any assertion below can
    // compare a response against a set that has quietly stopped
    // describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // this router's two success shapes are read apart by.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And the member every mask claim in this file is about is ON
    // the record, which is what those claims are FOR: `config` is
    // answered on every read here and never answered as stored.
    expect(CONNECTOR_KEY_SET).toContain('config');
  });
});

// ---------------------------------------------------------------------------
// The address: an id naming no connector, and a segment naming none
// ---------------------------------------------------------------------------

describe('an id naming no connector', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, modelId } = await withConnectors();
    const patch = { name: FRESH_NAME };

    const missing = await request(app)
      .patch(connectorPath(MISSING_ID))
      .send(patch);
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every patch satisfies
    // the assertion above on its own.
    const found = await request(app)
      .patch(connectorPath(modelId))
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe(FRESH_NAME);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, modelId } = await withConnectors();

    const missing = await request(app).delete(connectorPath(MISSING_ID));
    const removed = await request(app).delete(connectorPath(modelId));
    const afterwards = await request(app).get('/connectors');

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    // No subscription names the model row, so this delete meets no
    // guard. That the deployment reads two connectors afterwards
    // is what says the 204 was a delete rather than a handler
    // answering without acting.
    expect(removed.status).toBe(204);
    expect(namesOf(afterwards.body)).not.toContain(MODEL_NAME);
    expect(afterwards.body.data).toHaveLength(PLANTED_CONNECTORS - 1);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, modelId } = await withConnectors();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    //
    // The patch carries a body the schema WOULD refuse, sent under
    // a segment that is not an id. The answer names the SEGMENT,
    // which is the one reading in this file that the router
    // narrows its address before `patchConnector` sees a body: a
    // handler in the other order answers about `body` and passes
    // every other case here.
    const onPatch = await request(app)
      .patch(connectorPath('abc'))
      .send({ kind: LLM_KIND });
    const onDelete = await request(app).delete(connectorPath('abc'));
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).delete(connectorPath(modelId));

    // BOTH routes that take an `:id`, against ONE body constant:
    // two handlers are two chances to narrow the segment in only
    // one of them, and nothing else in this package would report
    // the half that was left raw. They are also the WHOLE address
    // vocabulary of this group, which has no `:slug` at all.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// The query: a family nobody registered, and what extending kept
// ---------------------------------------------------------------------------

describe('a ?kind outside the tuple', () => {
  it('answers 422 naming the parameter, quoting nothing', async () => {
    const { app } = await withConnectors();

    const unregistered = await request(app)
      .get(`/connectors?kind=${UNREGISTERED_KIND}`);
    // The control, along the axis under test and through the SAME
    // read: a member of `CONNECTOR_KINDS` that planted rows carry.
    // Without it the assertion above is equally green against a
    // route refusing every `?kind` it is handed — which is a
    // plausible failure here, this being the one list parameter on
    // the surface that is not the window.
    const registered = await request(app)
      .get(`/connectors?kind=${LLM_KIND}`);

    // `invalid_value` and not `invalid_type`, which is what an
    // enum answers: the whole envelope, because the detail is the
    // answer here rather than an accompaniment to the status.
    expect(unregistered.status).toBe(422);
    expect(unregistered.body).toStrictEqual(BAD_KIND_BODY);
    expect(registered.status).toBe(200);
    // The narrowing answered rows rather than nothing, which is
    // what says the accepted member reached the store as a filter.
    // WHICH rows it answers is the positive half's claim.
    expect(registered.body.data.length).toBeGreaterThan(0);

    // A COUNT rather than an absence, over the serialised body:
    // the unregistered family is one of two VALUES any request in
    // this file submits that a refusal could plausibly repeat.
    const leaked = JSON.stringify({
      ...BAD_KIND_BODY,
      details: [{
        field: 'kind',
        message: `Not one of the accepted values: ${UNREGISTERED_KIND}.`,
        code: 'invalid_value',
      }],
    });
    const answered = JSON.stringify(unregistered.body);

    expect(countOccurrences(answered, UNREGISTERED_KIND)).toBe(0);
    // The planted control: without it the zero above is equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, UNREGISTERED_KIND)).toBe(1);
  });

  it('keeps the cap and the strictness it extended', async () => {
    const { app } = await withConnectors();

    // `connectorListQuerySchema` adds one member to the schema
    // `src/http/schemas.ts` declares. An extension that dropped
    // either property would leave every other case in this file
    // green, so both are read here — told apart by which
    // assertion fails rather than by two cases.
    const overCap = await request(app).get('/connectors?perPage=201');
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get('/connectors?perPage=200');
    const undeclared = await request(app).get('/connectors?knid=llm');

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
    // ONE detail naming `query` and not the parameter, because the
    // key itself is something the request said. A misspelt `?kind`
    // is the shape this refusal exists for: without it, the page
    // would be unfiltered and look like an answer.
    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    // The three shapes an answered page is held to, read as key
    // SETS rather than as fields: a member arriving that nobody
    // asserted is invisible to every field read in this file.
    expect(keysOf(atCap.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(atCap.body.meta)).toStrictEqual(META_KEY_SET);
    expect(atCap.body.data.map(keysOf)).toStrictEqual(
      Array.from({ length: PLANTED_CONNECTORS }, () => CONNECTOR_KEY_SET),
    );
  });
});

// ---------------------------------------------------------------------------
// The payload: a pair the deployment carries, and a submitted mask
// ---------------------------------------------------------------------------

describe('a kind and name pair the deployment already carries', () => {
  it('answers 409 from both writes, and lands it elsewhere', async () => {
    const { app, fallbackId } = await withConnectors();

    const created = await request(app)
      .post('/connectors')
      .send({ kind: LLM_KIND, name: MODEL_NAME });
    // The patch proposes a name its OWN kind already holds, which
    // is the other way a request can reach this key: the RESULTING
    // pair is what the store is asked for, not the submitted name
    // on its own. The subject is the second `llm` row for that
    // reason — a rename of the `notebook` row onto the same name
    // is the control below rather than a second refusal.
    const renamed = await request(app)
      .patch(connectorPath(fallbackId))
      .send({ name: MODEL_NAME });
    // The control, along the axis under test: the same NAME under
    // a kind that does not carry it. A router comparing names
    // alone refuses this and passes both refusals above, so this
    // is what makes the key per-kind rather than per-name.
    const elsewhere = await request(app)
      .post('/connectors')
      .send({ kind: NOTEBOOK_KIND, name: MODEL_NAME });

    // ONE body constant read by both writes, because two handlers
    // are two chances to answer a taken pair two different ways.
    expect(created.status).toBe(409);
    expect(created.body).toStrictEqual(PAIR_TAKEN_BODY);
    expect(renamed.status).toBe(409);
    expect(renamed.body).toStrictEqual(PAIR_TAKEN_BODY);
    expect(elsewhere.status).toBe(201);
    expect(elsewhere.body.data.kind).toBe(NOTEBOOK_KIND);
    expect(elsewhere.body.data.name).toBe(MODEL_NAME);
    // The record a write answers is the whole row, read as a key
    // SET: `connectors` has four columns and this create names
    // two, so the id and the defaulted config are the store's.
    expect(keysOf(elsewhere.body.data)).toStrictEqual(CONNECTOR_KEY_SET);
    expect(keysOf(elsewhere.body)).toStrictEqual(RESOURCE_KEY_SET);
    // And the refused row is still under its own name, which is
    // what says the 409 left the table where it was rather than
    // refusing after acting.
    const afterwards = await request(app).get('/connectors');

    expect(namesOf(afterwards.body)).toContain(FALLBACK_NAME);
  });
});

describe('a config submitting the mask literal', () => {
  it('answers 422 naming the path with no key in it', async () => {
    const { app, modelId } = await withConnectors();

    // At the ROOT of the config on the create, and one level DOWN
    // on the patch, so the two paths differ by exactly the segment
    // the depth adds: a service reporting every occurrence as
    // `config.*` passes the first and fails the second.
    const created = await request(app)
      .post('/connectors')
      .send({
        kind: NOTEBOOK_KIND,
        name: FRESH_NAME,
        config: { [OPERATOR_KEY]: MASKED_SECRET },
      });
    const patched = await request(app)
      .patch(connectorPath(modelId))
      .send({ config: { nested: { [OPERATOR_KEY]: MASKED_SECRET } } });
    // The controls, along the axis under test and through the SAME
    // two operations: a REAL secret, which is a step from the
    // boundary rather than an arbitrary value. Without them both
    // refusals are equally green against a router refusing every
    // config it is handed.
    const accepted = await request(app)
      .post('/connectors')
      .send({
        kind: NOTEBOOK_KIND,
        name: FRESH_NAME,
        config: { [ROSTERED_KEY]: ROTATED_SECRET },
      });
    const rotated = await request(app)
      .patch(connectorPath(modelId))
      .send({ config: { [ROSTERED_KEY]: ROTATED_SECRET } });

    // The WHOLE envelope on both, because the detail is the answer
    // here rather than an accompaniment to the status. The `*` is
    // spelled as a literal, which is the only thing that pins it:
    // the constant behind it is private to the module that builds
    // the path.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(ROOT_MASK_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NESTED_MASK_BODY);
    // The controls landed, and each answered the MASK in place of
    // the credential it had just been sent — which is the rule the
    // refusals above exist to protect, seen from the side a caller
    // stands on.
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.config[ROSTERED_KEY]).toBe(MASKED_SECRET);
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.config[ROSTERED_KEY]).toBe(MASKED_SECRET);

    // A COUNT rather than an absence, over the serialised bodies:
    // the operator chose that key, so a detail naming it back
    // would be the leak the `*` exists to prevent.
    const leaked = JSON.stringify({
      ...ROOT_MASK_BODY,
      details: [{
        field: `config.${OPERATOR_KEY}`,
        message: 'Carries the value a read answers in place of a secret.',
        code: 'masked_secret',
      }],
    });

    expect(countOccurrences(JSON.stringify(created.body), OPERATOR_KEY))
      .toBe(0);
    expect(countOccurrences(JSON.stringify(patched.body), OPERATOR_KEY))
      .toBe(0);
    // The planted control: without it both zeros above are equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, OPERATOR_KEY)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete an export subscription still refuses
// ---------------------------------------------------------------------------

describe('a delete of a connector a subscription names', () => {
  it('answers 409 carrying the count, and frees the rest', async () => {
    const { app, archiveId, fallbackId } = await withConnectors();

    const refused = await request(app).delete(connectorPath(archiveId));
    // The control, along the axis under test and through the SAME
    // operation: a connector nothing names. Without it the refusal
    // is equally green against a router refusing every delete it
    // is handed, and against a guard that had stopped counting and
    // started refusing.
    const removed = await request(app).delete(connectorPath(fallbackId));
    const afterwards = await request(app).get('/connectors');

    // The WHOLE envelope, `details` included, because the count IS
    // the answer: an operator reading what a delete would have
    // taken is reading that number. ONE counted table rather than
    // the sources group's two — one foreign key refuses a
    // connector delete and `./store.ts` re-derives that from the
    // generated SQL rather than from a plan.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual({
      ...CONNECTOR_SUBSCRIBED_BODY,
      details: { exportSubscriptions: HELD_SUBSCRIPTIONS },
    });
    // Swept off the interface rather than named twice, so a second
    // counted table reddens this case rather than travelling
    // unasserted.
    expect(keysOf(refused.body.details)).toStrictEqual(DEPENDENT_KEY_SET);
    expect(removed.status).toBe(204);
    // No body at all on the way that lands, which is what `204`
    // means and what an envelope here would contradict — and on
    // this group it also means the delete is not a last chance to
    // read a config.
    expect(keysOf(removed.body)).toStrictEqual([]);
    // And the refused row is still standing while the free one is
    // gone, which is what says the 409 left the table where it was
    // rather than refusing after acting.
    expect(namesOf(afterwards.body)).toContain(ARCHIVE_NAME);
    expect(namesOf(afterwards.body)).not.toContain(FALLBACK_NAME);
    expect(kindsOf(afterwards.body)).toContain(NOTEBOOK_KIND);
  });
});
