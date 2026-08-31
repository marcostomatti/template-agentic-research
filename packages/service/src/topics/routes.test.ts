/**
 * `src/topics/routes.ts` — what each of the six routes answers,
 * refusing and landing: the status, the envelope and the members
 * each reaches the wire with. Driven over supertest against a
 * router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a taken name is a `ConflictError`
 * from both writes that can propose one, that an unknown slug and
 * an unknown id are told apart, that `nextRunAt` is an unrecognized
 * key on both request schemas — those are claims about the RULES
 * and are pinned one file over, over direct calls. What no call can
 * report is whether the rule reached a caller: the status
 * `errorHandler` or the handler chose, the envelope written around
 * it, the members that envelope carried, and whether a handler
 * swallowed a throw on the way. So every case below reads a
 * response and none of them reads a return value.
 *
 * TWENTY-FIVE CASES IN THREE GROUPS. Fifteen cover the ways a
 * request to this router can be wrong; six cover what the four
 * resource routes answer when they LAND; four are guards over the
 * two fixtures and over the key lists every half is read through.
 *
 * TWO FIXTURES, BECAUSE THE VERBS NEED A STATE THE LIST CASES
 * COUNT. {@link withTopics} is the collection every case above the
 * verbs reads whole — its length, its order and the neighbour a
 * write left alone — so a fourth row planted there for a verb
 * would be a row every one of those assertions had to be taught
 * about. {@link withSchedulable} plants its own three instead, one
 * per state a verb decides on, and no case reads both.
 *
 * THE ADDRESS. A slug naming no domain is `404` on both operations
 * that take one, and an id naming no topic is `404` on all FOUR
 * that take one, each asserted against ONE shared body constant
 * per ADDRESS rather than six literals that agree today. The
 * constants are per address and not per status: a `404` about a
 * domain and a `404` about a topic are two envelopes on one
 * router, and six handlers are six chances to answer a missing row
 * six different ways. A segment that is not an ADDRESS at all is
 * `422` naming `id` or `slug` and never `404` — a `404` says the
 * row is not there, and a request that never named a row has not
 * established that. Each is asserted across EVERY route sharing
 * its segment inside one case, the id half over all four, because
 * a handler is a chance to narrow only its own. The slug half is
 * the only reading in this file that `readSlug` narrows at all:
 * every other slug sent anywhere here is well-formed, so an
 * unnarrowed segment answers exactly what those cases already
 * assert — measured, as the grid below records.
 *
 * THE WINDOW. This list route IS paginated, unlike the taxonomy's,
 * so a `?perPage` above the cap is `422` naming `perPage` rather
 * than a silent clamp. It is paired with a request at exactly the
 * cap, which is what says the refusal is a CAP and not a route that
 * refuses every window it is handed. What that pair cannot say is
 * that the window SELECTS, since both of its reads are wide enough
 * to carry the whole collection; the positive half reads two
 * windows of one over the same two rows for that.
 *
 * THE PAYLOAD. A name the domain already researches is `409` with
 * `code: 'CONFLICT'` from the create AND from the rename, which is
 * the translation being pinned rather than merely that something
 * was thrown: `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers `500`. Both writes are driven because
 * `patchTopicSchema` carries `name`, so each is a separate call
 * site a module could stop translating on its own. The create
 * carries the control the other two cannot stand in for: the same
 * name under a SECOND domain is accepted, which is what says the
 * key is per-domain rather than global.
 *
 * A BODY NAMING `nextRunAt` is `422` whose ONE detail names `body`,
 * asserted as the WHOLE envelope and from both writes. That is the
 * pipeline-owned-column rule reaching a caller: the column is
 * answered on every read and accepted by nothing, and the two
 * routes that may write it are the verbs below, which name it in
 * neither body. Its control is the same body with the member
 * removed, which is accepted and lands a `nextRunAt` of null — so
 * the pair says the refusal is about that MEMBER rather than about
 * a router refusing every create it is handed. Every positive case
 * below reads the column too, from the list, the create, the patch
 * and the row a delete leaves standing, so both halves of that rule
 * are pinned here rather than only the half that refuses.
 *
 * AND NOTHING SUBMITTED COMES BACK THROUGH IT. The instant those
 * two requests submit is a value a refusal could quote, unlike
 * every other request in this file, so the case counts its
 * occurrences in the serialised body rather than asserting absence
 * — and takes the same count over a PLANTED envelope carrying it,
 * because a search that would find nothing anywhere reports a clean
 * refusal and a leaking one alike.
 *
 * THE VERBS REFUSE TWO STATES, AND THE PAIR IS WHAT SEPARATES
 * THEM. `POST /topics/:id/run-now` is `409` for a row whose
 * `enabled` is false; `POST /topics/:id/pause` is `409` for one
 * whose `nextRunAt` is null. Each case drives the OTHER verb
 * against its OWN subject and reads a `200`, which is available
 * only because the fixture made the disabled row scheduled and the
 * unscheduled row enabled: so the run-now's refusal can only be
 * about `enabled` and the pause's can only be about the NULL. A
 * verb that had copied its neighbour's guard passes one of the two
 * cases and fails the other. The pause of the disabled row also
 * reads `enabled` back false, which is the schema's rule that a
 * pause is not a disable reaching a caller.
 *
 * `cycles` IS REFUSED AT TWO DIFFERENT FIELDS, and that pair is
 * the reading rather than either half. A pause that sent NO body
 * is `422` naming `body`, because there is nothing for the member
 * to be missing from; a pause sending `{}` is `422` naming
 * `cycles`. A handler defaulting the body with `?? {}` answers
 * both the second way and passes every other case in this file. A
 * `cycles` of zero is `too_small` at `cycles` and a `cycles` of
 * one is accepted, which is the same one-past-the-refusal control
 * the over-cap `perPage` case uses. What the schema refuses beyond
 * those — a negative, a fraction, a count above the ceiling —
 * is `src/topics/service.test.ts`'s claim over direct calls: those
 * are RULES, and what this file adds is that one of them reached a
 * caller in this envelope.
 *
 * WHAT THE VERBS ANSWER WHEN THEY LAND IS NOT THIS FILE'S CLAIM
 * YET. Every `200` above is a control read for its status alone,
 * so no case here compares a written instant against
 * {@link CLOCK_INSTANT} except the one that needed a scheduled row
 * to exist at all. The instant, the clamped cycle length and the
 * idempotence of a second run-now land with the positive half.
 *
 * WHAT THE POSITIVE HALF READS IS A KEY SET AND NOT A FIELD. Every
 * answer below is held against a sorted list of the members it may
 * carry — `TopicRecord`'s nine, the success envelope's two, the
 * page envelope's three and `meta`'s four — because a field read
 * is equally green against a response that grew a member nobody
 * asserted. The lists are pinned in BOTH directions: `satisfies`
 * refuses one naming a member the type lacks, and
 * {@link EVERY_KEY_LISTED} is a TS2322 when the type grows one the
 * list does not name. That second direction is not decoration on
 * this table, which spreads `schedulableColumns()` from a helper
 * `export_subscriptions` spreads too, so a column added there
 * reaches this projection with nothing in this directory edited.
 *
 * AND EVERY WRITE IS READ BACK THROUGH THE OTHER OPERATION. What a
 * create answered is compared against what a list carries
 * afterwards, and what three patches answered against the same,
 * because a write returning a row it never stored satisfies every
 * assertion made against its own response. The neighbour row is
 * asserted WHOLE in both cases, so a write reaching more rows than
 * the one it addressed is a red case rather than an answer nobody
 * compared against anything.
 *
 * ANTI-VACUITY. A router that refused everything, or that answered
 * every read the same row, would satisfy most of what is below, so
 * each case carries its own control in the same body, varied along
 * the axis under test: each `404` reads what IS there through the
 * SAME operation, the not-an-id case ends on an id that is one, the
 * two `409`s create and rename under a free name, the over-cap
 * `perPage` is paired with a request at exactly the cap, the
 * refused member is removed and resent, the wide list read is
 * paired with two windows of one, the full create body is paired
 * with the two members the schema requires and nothing else, the
 * patch is followed by two more that name other members, the
 * `204` is followed by the same request answering `404`, each verb
 * refusal is paired with the same verb against a row it takes AND
 * with the other verb against its own subject, the absent body is
 * paired with an empty one refused at a different field, and the
 * zero count is paired with a count of one.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s — the containment reading
 * below is scoped to the one channel these routes open, which is
 * the value a refused pipeline-owned member carries.
 *
 * MUTATION GRID, re-derived over all twenty-five cases by mutating
 * `routes.ts` one edit at a time and reading the failed `fullName`
 * SET from a `--reporter=json` run rather than a count. THIRTEEN
 * legs now, each named by the EDIT it makes rather than by its
 * effect, since a leg described only by its effect is one nobody
 * can run again. The eight the file already carried were all
 * re-run rather than carried forward, and only the `:id` one moved.
 *
 * THE FOUR RESOURCE-ROUTE STATUS LEGS ARE UNMOVED BY THE VERBS.
 * `res.status(201)` written as `200` on the create reddens FOUR;
 * `res.status(204)` written as `200` on the delete reddens THREE;
 * `res.status(200)` written as `204` on the patch reddens THREE.
 * Every figure is the one the positive half left, which is what
 * says the verb cases reach none of those four handlers.
 *
 * THE `:id` LEG IS THE ONE THE VERBS MOVED, from SIX to ELEVEN:
 * returning the segment raw from {@link readId} reddens every case
 * that addresses a row, and each of the five verb cases does.
 * Returning the `:slug` raw from {@link readSlug} still reddens
 * exactly ONE, the not-a-slug case, and that is this file's shape
 * rather than an omission: every other slug it sends is
 * well-formed, and no verb takes a `:slug` at all.
 *
 * THE THREE WINDOW LEGS ARE UNMOVED AND STILL SEPARATE. A fixed
 * `{ limit: 50, offset: 0 }` in place of `toStoreWindow(query)`
 * reddens the TWO list cases and NOT the over-cap refusal, whose
 * at-cap control asks for 200 and is answered the whole two-row
 * collection either way. `ok(page.rows)` in place of
 * `okPage(page.rows, meta)` reddens FIVE, every case that reads a
 * `meta` at all. `total: page.rows.length` in place of
 * `total: page.total` reddens the TWO list cases.
 *
 * THE TWO VERB STATUS LEGS SEPARATE, and neither is redundant with
 * the other. `res.status(200)` written as `201` on the run-now
 * reddens THREE — the two cases whose control is a run-now, and
 * the 404 case that drives both verbs. On the pause it reddens
 * FIVE, which is every verb case: four drive a pause as their
 * control and the fifth is about one. A router registering one
 * handler's status on the other's route is a red set of eight.
 *
 * THE BODY LEG IS EXACTLY THE PAIR IT WAS WRITTEN FOR. `req.body`
 * written as `req.body ?? {}` in the pause call reddens ONE, the
 * absent-body case, and nothing else: every other pause in this
 * file sends a body. That single red is the whole argument for the
 * `{}` reading sitting inside that case rather than in one of its
 * own.
 *
 * AND TWO CLOCK LEGS, OF WHICH ONE IS A MEASURED ZERO. Having the
 * run-now read `new Date()` rather than `options.clock` reddens
 * ONE — the pause case, whose run-now control reads the answered
 * instant back. Having the PAUSE read the real present reddens
 * NOTHING, and that zero is the scope boundary showing up as a
 * measurement rather than thin coverage: no case here compares a
 * paused instant against anything, because the arithmetic is the
 * positive half's subject. Recorded so the leg is re-run there
 * rather than re-derived.
 *
 * ONE FALSE RED WAS MEASURED AND DISCARDED. The run-now status leg
 * first answered FOUR, the extra being a delete case that drives no
 * verb; three re-runs of that leg answered THREE with an identical
 * set. That is the macOS supertest port-steal flake, which
 * `packages/service/AGENTS.md` describes and which no helper in
 * `tests/helpers/` closes on this HEAD. A leg answering one case
 * more than its edit can reach is worth re-running before it is
 * written down.
 */
import type { TopicRecord } from './store.js';
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

import { buildTopicsRouter } from './routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('topics-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain every case plants in. */
const STORED_SLUG = 'example-tech-radar';

/**
 * A second domain, invented in the same neutral register.
 *
 * It researches {@link STORED_NAME} too, which is the widening
 * control the duplicate case rests on:
 * `topics_domain_id_name_unique` is per-domain, so a store or a
 * service holding it globally cannot even build this fixture.
 */
const OTHER_SLUG = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const ABSENT_SLUG = 'example-not-a-domain';

/**
 * An id no planted topic carries.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would answer
 * `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** The name both planted domains research, and every duplicate takes. */
const STORED_NAME = 'transformers';

/** The second topic of {@link STORED_SLUG}, which every patch moves. */
const PATCHED_NAME = 'edge inference';

/** A name no planted domain researches, and every control writes. */
const FREE_NAME = 'retrieval augmentation';

/**
 * A second free name, written only by the create case's control.
 *
 * Distinct from {@link FREE_NAME} because that case lands TWO rows
 * in one domain and the second would otherwise be refused by the
 * first — which would read as a fault in the route rather than as
 * a case that collided with itself.
 */
const SPARE_NAME = 'context windows';

/**
 * An hour, as the cadence every planted topic and every accepted
 * body below runs at.
 *
 * Named rather than repeated, so no reader has to wonder which of
 * the cases is varying the number.
 */
const HOURLY = 3600;

/** Half an hour, as the cadence the patch case retunes to. */
const HALF_HOURLY = 1800;

/**
 * Ten minutes, as the floor one planted topic carries and every
 * bounded body below writes.
 */
const TEN_MINUTES = 600;

/** A day, as the ceiling those same rows carry. */
const DAILY = 86400;

/**
 * The terms {@link STORED_NAME} is planted with under
 * {@link STORED_SLUG}.
 *
 * Named rather than inlined in the fixture because the positive
 * half compares that row WHOLE: the neighbour a write left alone is
 * asserted member for member, and a literal repeated at the
 * assertion would agree with the plant by transcription rather than
 * by derivation.
 */
const STORED_TERMS = ['attention', 'transformer architecture'];

/** The terms {@link PATCHED_NAME} is planted with. */
const INFERENCE_TERMS = ['on-device inference'];

/** The terms a create submits, carried by no planted row. */
const CREATED_TERMS = ['retrieval index freshness'];

/** The terms a patch replaces {@link INFERENCE_TERMS} with. */
const PATCHED_TERMS = ['npu scheduling', 'quantisation'];

/**
 * The two names {@link STORED_SLUG} is planted with, in the order
 * `TopicStore.listTopics` promises to answer them.
 *
 * Planted the other way round by {@link withTopics} — the
 * transformers row first — so a list read here is answered in the
 * store's own order rather than in the order the rows arrived. This
 * file asserts only the LENGTH of a page; that the order is the
 * store's is the positive half's claim.
 */
const LISTED_NAMES = [PATCHED_NAME, STORED_NAME];

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
 * The instant the two refused bodies submit for `nextRunAt`.
 *
 * A well-formed ISO-8601 string, so what refuses it is `.strict()`
 * rather than a shape check that would never have reached the
 * unrecognized-key clause. It is also the one value any request in
 * this file submits that a refusal could plausibly quote back,
 * which is why that case counts it rather than reading the envelope
 * alone.
 */
const SENTINEL_INSTANT = '2031-02-03T04:05:06.000Z';

/**
 * The present every case here is answered against.
 *
 * FIXED rather than real, which is what lets a verb's answer be
 * compared exactly instead of against a window around the actual
 * present — and what makes {@link DUE_LATER} reliably later than
 * it. Far enough into the future that no planted row's due time
 * can be confused with the moment the suite ran.
 */
const CLOCK_INSTANT = '2031-06-07T08:09:10.000Z';

/**
 * The due time {@link withSchedulable} plants on the two rows that
 * are scheduled at all.
 *
 * LATER than {@link CLOCK_INSTANT}, and a whole day later so the
 * gap is unmistakable in a failure message. Which of the two a
 * pause bases on is `src/topics/service.test.ts`'s claim; what it
 * has to be here is a value neither verb could answer by accident.
 */
const DUE_LATER = '2031-06-08T00:00:00.000Z';

/** The name of the row both verbs take, scheduled and enabled. */
const SCHEDULED_NAME = 'model routing';

/** The name of the row the pause refuses: enabled, never scheduled. */
const UNSCHEDULED_NAME = 'silicon supply';

/** The name of the row the run-now refuses: scheduled, disabled. */
const DISABLED_NAME = 'error correction';

/**
 * The whole body a `404` about a domain answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take a slug
 * answer ONE envelope rather than two that happen to agree today.
 * The message is `src/topics/service.ts`'s constant; what is pinned
 * here is that it arrives unmodified with `code` beside it and
 * nothing else.
 */
const NO_SUCH_DOMAIN_BODY = {
  code: 'NOT_FOUND',
  message: 'No domain carries that slug',
};

/** The whole body a `404` about a topic answers with. */
const NO_SUCH_TOPIC_BODY = {
  code: 'NOT_FOUND',
  message: 'No topic carries that id',
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
 * The whole body a taken name answers with, from either write.
 *
 * Asserted on the create AND on the rename, from one constant, so a
 * module that stopped translating one of the two call sites is a
 * red case rather than a difference nobody looked for.
 */
const NAME_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This domain already researches a topic of that name',
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
 * The whole body a request naming `nextRunAt` answers with.
 *
 * ONE detail naming `body` rather than the key, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * request said. Nothing the request submitted is in this envelope
 * at all, and that is the claim its case makes by asserting the
 * whole of it.
 */
const NEXT_RUN_AT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a run-now against a disabled topic answers with.
 *
 * `CONFLICT` and not `422`: the request is well formed and names a
 * row that is there, and what refuses it is a STATE.
 * {@link TOPIC_NOT_SCHEDULED_BODY} is its opposite number, and the
 * two are asserted as WHOLES so a router answering one where the
 * other was due is a red case rather than a matching status
 * nobody looked past.
 */
const TOPIC_DISABLED_BODY = {
  code: 'CONFLICT',
  message: 'This topic is disabled, so a run now would never be claimed',
};

/** The whole body a pause against an unscheduled topic answers with. */
const TOPIC_NOT_SCHEDULED_BODY = {
  code: 'CONFLICT',
  message: 'This topic is not scheduled, so there is no run to defer',
};

/**
 * The whole body a pause that sent NO body at all answers with.
 *
 * The detail names `body` and not `cycles`, because there is
 * nothing for the member to be missing FROM: `express.json()`
 * leaves `req.body` undefined for a request that carried none, and
 * an object schema handed one raises at its own root.
 * {@link NO_CYCLES_BODY} is what the same route answers to `{}`,
 * and the two together are what say this envelope is about the
 * absent BODY rather than about any refused pause.
 */
const NO_BODY_SENT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/** The whole body a pause sending `{}` answers with. */
const NO_CYCLES_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'cycles',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The whole body a `cycles` of zero answers with.
 *
 * `too_small` rather than `invalid_type`, which is
 * `.positive()` firing after `.int()` has passed. A fraction, a
 * negative and a count above the ceiling are refusals of
 * `pauseTopicSchema` and are pinned over direct calls in
 * `src/topics/service.test.ts`; what this constant is here for is
 * that ONE of them reaches a caller in this shape.
 */
const ZERO_CYCLES_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'cycles',
    message: 'Below the allowed minimum.',
    code: 'too_small',
  }],
};

/**
 * The members `TopicRecord` declares, as a response carries them.
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
 *
 * That second direction is not decoration on THIS table. `topics`
 * spreads `schedulableColumns()` from
 * `src/db/schema/scheduling.ts`, which `export_subscriptions`
 * spreads too, so a column added to that ONE helper reaches this
 * record and every projection under it with no module in this
 * directory edited at all.
 */
const TOPIC_KEYS = [
  'domainId',
  'enabled',
  'id',
  'intervalSeconds',
  'maxIntervalSeconds',
  'minIntervalSeconds',
  'name',
  'nextRunAt',
  'searchTerms',
] as const satisfies readonly (keyof TopicRecord)[];

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
  CoversEveryKey<TopicRecord, typeof TOPIC_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `TopicRecord`, to either envelope or to `meta`
 * and to none of the lists above turns {@link EveryKeyListed} into
 * `never`, and this initializer is then a TS2322 at this line —
 * before any case can compare a response against a set that has
 * quietly stopped describing it. Read in a case below so it is a
 * symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link TOPIC_KEYS}, sorted at use rather than by hand. */
const TOPIC_KEY_SET: readonly string[] = [...TOPIC_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/**
 * Just enough of an answered topic for an assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the one member the cases
 * project out of a page.
 */
interface NamedRow {
  /** The subject the domain researches, and what a case finds it by. */
  readonly name: string;
}

/**
 * Reads the present, as every router built here is given it.
 *
 * A FRESH `Date` per call rather than one captured instant, so no
 * handler can hand a case back the very object it would compare
 * against — an equality that held because both sides were one
 * reference would say nothing about what was stored.
 *
 * @returns {@link CLOCK_INSTANT}, always.
 */
function fixedClock(): Date {
  return new Date(CLOCK_INSTANT);
}

/**
 * Builds an app carrying one freshly built topics router.
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
 * The clock is {@link fixedClock} and is REQUIRED by the router, so
 * every app here answers the two verbs against one instant this
 * file chose. A real clock would leave a written `nextRunAt`
 * comparable only against a window.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildTopicsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildTopicsRouter({ store, clock: fixedClock }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Two domains, three topics, and the app in front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each of its three rows earns its place twice. The two topics
 * under {@link STORED_SLUG} are what a duplicate takes and what
 * every patch addresses, and they are also a collection a window
 * can be narrower than. The row under {@link OTHER_SLUG} carries
 * the FIRST domain's name: it is the widening control the `409`
 * cases rest on, and the one a delete leaves standing.
 *
 * Planted through the PORT rather than through
 * `POST /domains/:slug/topics`, so a case about a patch is not also
 * a case about the create route — and so the duplicate case is
 * refused by a row it did not have to create successfully first. No
 * route on this router can write a domain at all.
 *
 * @returns The app, the id of the domain the two rows sit in, and
 *   their own ids. The store is not handed back: every reading a
 *   case takes afterwards is a response, so a case reaching past
 *   the surface under test would be pinning the fixture rather
 *   than the router. The topic ids are addresses rather than
 *   readings — a request cannot name a row without one. The
 *   DOMAIN id is a reading, and the only one here that is: no
 *   request below names it, so a row answering it is the store
 *   having said which domain the row came out of.
 */
async function withTopics(): Promise<{
  app: Application;
  domainId: number;
  transformersId: number;
  inferenceId: number;
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
  const transformers = await store.insertTopic({
    domainId: stored.id,
    name: STORED_NAME,
    searchTerms: STORED_TERMS,
    intervalSeconds: HOURLY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const inference = await store.insertTopic({
    domainId: stored.id,
    name: PATCHED_NAME,
    searchTerms: INFERENCE_TERMS,
    intervalSeconds: HOURLY,
    enabled: true,
    minIntervalSeconds: TEN_MINUTES,
    maxIntervalSeconds: DAILY,
  });

  await store.insertTopic({
    domainId: other.id,
    name: STORED_NAME,
    searchTerms: ['transformer routing'],
    intervalSeconds: HOURLY,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  return {
    app: buildTopicsApp(store),
    domainId: stored.id,
    transformersId: transformers.id,
    inferenceId: inference.id,
  };
}

/**
 * One topic per state the two verbs decide on, and the app in front
 * of them.
 *
 * A fixture of its own rather than three more rows in
 * {@link withTopics}, because every case above reads that
 * collection WHOLE — its length, its order, and the neighbour a
 * write left alone — so a row added there for the verbs would be
 * a row every list assertion had to be taught about.
 *
 * The three rows are the two-by-two the verbs read differently,
 * minus the corner neither of them needs. {@link SCHEDULED_NAME} is
 * enabled AND scheduled, so both verbs take it and it is the
 * control in every case here. {@link UNSCHEDULED_NAME} is ENABLED
 * and carries no due time, so the pause's `409` can only be about
 * the NULL. {@link DISABLED_NAME} IS scheduled and disabled, so the
 * run-now's `409` can only be about `enabled`. Each refusal case
 * then drives the OTHER verb against its own subject and reads a
 * `200`, which is what says the two guards are two rather than one
 * guard reached twice.
 *
 * The two due times are planted through the PORT, which is the one
 * method that writes the column at all. So a case about a verb is
 * never also a case about the verb that would otherwise have had to
 * set its fixture up.
 *
 * @returns The app and the three ids a request addresses the rows
 *   by. Ids are addresses rather than readings, per
 *   {@link withTopics}; the clock is not handed back either, since
 *   {@link CLOCK_INSTANT} is the constant every case compares
 *   against and reading it off the fixture would compare the
 *   fixture with itself.
 */
async function withSchedulable(): Promise<{
  app: Application;
  scheduledId: number;
  unscheduledId: number;
  disabledId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: STORED_SLUG,
    name: 'Example Tech Radar',
    settings: {},
  });

  async function plant(name: string, enabled: boolean): Promise<number> {
    const topic = await store.insertTopic({
      domainId: domain.id,
      name,
      searchTerms: [],
      intervalSeconds: HOURLY,
      enabled,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });

    return topic.id;
  }

  const scheduledId = await plant(SCHEDULED_NAME, true);
  const unscheduledId = await plant(UNSCHEDULED_NAME, true);
  const disabledId = await plant(DISABLED_NAME, false);

  await store.updateTopicSchedule(scheduledId, new Date(DUE_LATER));
  await store.updateTopicSchedule(disabledId, new Date(DUE_LATER));

  return {
    app: buildTopicsApp(store),
    scheduledId,
    unscheduledId,
    disabledId,
  };
}

/** The path a domain's topics are read and written at. */
function topicsPath(slug: string): string {
  return `/domains/${slug}/topics`;
}

/** The path `POST /topics/:id/run-now` is sent to. */
function runNowPath(id: number | string): string {
  return `/topics/${id}/run-now`;
}

/** The path `POST /topics/:id/pause` is sent to. */
function pausePath(id: number | string): string {
  return `/topics/${id}/pause`;
}

/**
 * The names a read answered, in the order it answered them.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's name.
 */
function namesOf(body: { data: readonly NamedRow[] }): string[] {
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
 *   answers and is the claim that case makes.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/**
 * The row a read carries under one name.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row would
 * otherwise reach `toStrictEqual` as `undefined` and pass against
 * any other absent row, which is a green nobody wrote.
 *
 * @param rows - A read's `data`, as it came off the wire.
 * @param name - The name to find.
 * @returns The row carrying it.
 * @throws Error - When the read carries no such row.
 */
function topicFor(rows: readonly NamedRow[], name: string): NamedRow {
  const row = rows.find((candidate) => candidate.name === name);

  if (row === undefined) {
    throw new Error(`The domain researches no topic named ${name}`);
  }

  return row;
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
// What the fixture below plants, and what every answer is held to
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants distinct names and writes under free ones', () => {
    // Without this, a create case naming a planted topic would be
    // refused 409 and read as a router fault rather than as a
    // fixture that overlapped itself.
    expect(new Set(LISTED_NAMES).size).toBe(LISTED_NAMES.length);
    expect(LISTED_NAMES).not.toContain(FREE_NAME);
    // Two free names rather than one, because the create case lands
    // TWO rows in the same domain and the second would otherwise be
    // refused by the first.
    expect(LISTED_NAMES).not.toContain(SPARE_NAME);
    expect(FREE_NAME).not.toBe(SPARE_NAME);
    // Name ASCENDING, which is the order a list case asserts. An
    // expectation compared against an unsorted table pins the wrong
    // order just as quietly as no assertion would, and the ordering
    // claim is the one thing a list case cannot borrow from
    // anywhere else in this file.
    expect([...LISTED_NAMES].sort()).toStrictEqual(LISTED_NAMES);
    // And the submitted instant is not a substring of anything else
    // a refusal could carry, so the containment count below cannot
    // be satisfied by some other member of the envelope.
    expect(countOccurrences(
      JSON.stringify(NEXT_RUN_AT_BODY),
      SENTINEL_INSTANT,
    )).toBe(0);
  });

  it('plants one row per state the two verbs decide on', () => {
    // The three names are distinct, so the fixture cannot refuse
    // its own second write on `topics_domain_id_name_unique` and
    // leave a case addressing an id that was never planted.
    const names = [SCHEDULED_NAME, UNSCHEDULED_NAME, DISABLED_NAME];

    expect(new Set(names).size).toBe(names.length);
    // And the fixture's present is EARLIER than the due time it
    // plants. Both verb refusals below drive their control against
    // a scheduled row, and a due time already in the past would
    // make the pause's base the clock rather than the stored value
    // — a difference the positive half reads and this half must
    // not depend on either way.
    expect(new Date(CLOCK_INSTANT).getTime())
      .toBeLessThan(new Date(DUE_LATER).getTime());
    // The two `409` sentences differ, which is what lets the two
    // state guards be told apart at all: one constant answering
    // both would make either case green against the other's
    // refusal.
    expect(TOPIC_DISABLED_BODY.message)
      .not.toBe(TOPIC_NOT_SCHEDULED_BODY.message);
  });

  it('plants four term lists that differ from each other', () => {
    // What makes each replace-whole reading below a reading rather
    // than an assumption: a store merging a submitted list into the
    // stored one, or a handler answering the list it was handed
    // instead of the row, satisfies every assertion made against
    // two equal arrays.
    const lists = [
      STORED_TERMS,
      INFERENCE_TERMS,
      CREATED_TERMS,
      PATCHED_TERMS,
    ];
    const joined = lists.map((list) => list.join('|'));

    expect(new Set(joined).size).toBe(lists.length);
    // And the two cadences differ, for the same reason: a patch
    // that never wrote the interval answers the planted one.
    expect(HALF_HOURLY).not.toBe(HOURLY);
  });
});

describe('the shapes every positive answer is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // `TopicRecord`, to either envelope or to `meta` and to none of
    // the lists is a TS2322 at that declaration, before any
    // assertion below can compare a response against a set that has
    // quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`, which
    // is `okPage`'s stated contract and the one difference the
    // cases below read this router's two success shapes apart by.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And `nextRunAt` is on the record, which is the member this
    // group is FOR: the column the dispatcher owns is ANSWERED on
    // every read here and accepted by no request, and a projection
    // that dropped it would leave every status assertion green.
    expect(TOPIC_KEY_SET).toContain('nextRunAt');
  });
});

// ---------------------------------------------------------------------------
// The address: a slug naming no domain, and an id naming no topic
// ---------------------------------------------------------------------------

describe('a slug naming no domain', () => {
  it('answers 404 on a list, and 200 for the stored slug', async () => {
    const { app } = await withTopics();

    const missing = await request(app).get(topicsPath(ABSENT_SLUG));
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every read satisfies the
    // assertion above on its own. It also says what the 404 is FOR
    // — a domain researching nothing is a 200 carrying `data: []`,
    // so only a domain that is not there answers this way.
    const found = await request(app).get(topicsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data).toHaveLength(LISTED_NAMES.length);
  });

  it('answers 404 on a create, and 201 for the stored slug', async () => {
    const { app } = await withTopics();
    const body = { name: FREE_NAME, intervalSeconds: HOURLY };

    const missing = await request(app)
      .post(topicsPath(ABSENT_SLUG))
      .send(body);
    const created = await request(app)
      .post(topicsPath(STORED_SLUG))
      .send(body);

    // The body is VALID on both calls, which is what makes this a
    // case about the slug: `createTopic` parses the body BEFORE it
    // resolves the slug, so a malformed one would be answered 422
    // and this case would never reach the lookup.
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_DOMAIN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe(FREE_NAME);
  });
});

describe('an id naming no topic', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, inferenceId } = await withTopics();
    const patch = { intervalSeconds: 1800 };

    const missing = await request(app)
      .patch(`/topics/${ABSENT_ID}`)
      .send(patch);
    const found = await request(app)
      .patch(`/topics/${inferenceId}`)
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.intervalSeconds).toBe(patch.intervalSeconds);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, inferenceId } = await withTopics();

    const missing = await request(app).delete(`/topics/${ABSENT_ID}`);
    const removed = await request(app).delete(`/topics/${inferenceId}`);
    const afterwards = await request(app).get(topicsPath(STORED_SLUG));

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
    // Nothing in schema v2 points at `topics`, so this delete has
    // no guard to refuse it. That the domain researches one topic
    // afterwards is what says the 204 was a delete rather than a
    // handler answering without acting.
    expect(removed.status).toBe(204);
    expect(afterwards.body.data).toHaveLength(1);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, inferenceId } = await withTopics();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    const onPatch = await request(app)
      .patch('/topics/abc')
      .send({});
    const onDelete = await request(app).delete('/topics/abc');
    const onRunNow = await request(app).post(runNowPath('abc'));
    // A body the schema WOULD refuse, sent under a segment that is
    // not an id. The answer names the SEGMENT, which is the one
    // reading in this file that the pause narrows its address
    // before `pauseTopic` ever sees a body: a handler in the other
    // order answers about `cycles` and passes every other case
    // here.
    const onPause = await request(app)
      .post(pausePath('abc'))
      .send({ cycles: 0 });
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).delete(`/topics/${inferenceId}`);

    // All FOUR routes that take an `:id`, against ONE body
    // constant: four handlers are four chances to narrow the
    // segment in only some of them, and nothing else in this
    // package would report the half that was left raw.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onRunNow.status).toBe(422);
    expect(onRunNow.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onPause.status).toBe(422);
    expect(onPause.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });

  it('answers 422 naming the slug rather than 404', async () => {
    const { app } = await withTopics();

    // Upper case, which `slugParamSchema` refuses and which a
    // lookup would simply not find. The two routes that take a
    // `:slug` are not the two that take an `:id`, so this case and
    // the one above narrow disjoint halves of the router — and
    // this one is the only reading in the file that the narrowing
    // is load-bearing at all: an unnarrowed segment answers the
    // same 404 every other slug case asserts.
    const onList = await request(app).get(topicsPath('Example-Radar'));
    const onCreate = await request(app)
      .post(topicsPath('Example-Radar'))
      .send({ name: FREE_NAME, intervalSeconds: HOURLY });
    const aSlug = await request(app).get(topicsPath(STORED_SLUG));

    expect(onList.status).toBe(422);
    expect(onList.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(onCreate.status).toBe(422);
    expect(onCreate.body).toStrictEqual(NOT_A_SLUG_BODY);
    expect(aSlug.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The window: a perPage past the cap this surface serves
// ---------------------------------------------------------------------------

describe('a pagination window the schema refuses', () => {
  it('refuses a perPage past the cap and serves the cap', async () => {
    const { app } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const overCap = await request(app).get(`${topics}?perPage=201`);
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get(`${topics}?perPage=200`);

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
    expect(namesOf(atCap.body)).toHaveLength(LISTED_NAMES.length);
  });
});

// ---------------------------------------------------------------------------
// The payload: a name the domain has, and a column it does not own
// ---------------------------------------------------------------------------

describe('a write proposing a name the domain researches', () => {
  it('answers 409 on a create, where a free name answers 201', async () => {
    const { app } = await withTopics();

    const duplicate = await request(app)
      .post(topicsPath(STORED_SLUG))
      .send({ name: STORED_NAME, intervalSeconds: HOURLY });
    // The control: a store refusing every insert, or a handler
    // answering 409 unconditionally, passes the assertion above.
    const created = await request(app)
      .post(topicsPath(STORED_SLUG))
      .send({ name: FREE_NAME, intervalSeconds: HOURLY });
    // The widening control, which neither of the two above can
    // stand in for: the key is unique within the DOMAIN and not
    // across the table, so the SAME name under a second domain has
    // to be accepted. A router or a store holding it globally is
    // green against every other case in this file.
    const elsewhere = await request(app)
      .post(topicsPath(OTHER_SLUG))
      .send({ name: PATCHED_NAME, intervalSeconds: HOURLY });

    // 409 and not 500, which is the translation being pinned:
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one reaches `errorHandler`'s unknown branch.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(NAME_TAKEN_BODY);
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe(FREE_NAME);
    expect(elsewhere.status).toBe(201);
  });

  it('answers 409 on a rename, where a free name answers 200', async () => {
    const { app, inferenceId } = await withTopics();

    const duplicate = await request(app)
      .patch(`/topics/${inferenceId}`)
      .send({ name: STORED_NAME });
    // The control is a rename that lands, through the SAME
    // operation: without it this case is equally green against a
    // route that refuses every rename it is given.
    const renamed = await request(app)
      .patch(`/topics/${inferenceId}`)
      .send({ name: FREE_NAME });

    // The same body constant as the create, which is the claim:
    // two writes reach one unique key, because `patchTopicSchema`
    // carries `name`. A module that stopped translating either call
    // site is a red case rather than a difference nobody looked
    // for.
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(NAME_TAKEN_BODY);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe(FREE_NAME);
  });
});

describe('a body naming the column the dispatcher owns', () => {
  it('answers 422 from both writes, quoting nothing sent', async () => {
    const { app, transformersId } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const created = await request(app)
      .post(topics)
      .send({
        name: FREE_NAME,
        intervalSeconds: HOURLY,
        nextRunAt: SENTINEL_INSTANT,
      });
    const patched = await request(app)
      .patch(`/topics/${transformersId}`)
      .send({ nextRunAt: SENTINEL_INSTANT });
    // The control, along the axis under test and through the SAME
    // operation: the identical create with the member removed. It
    // is accepted, and the column it named is ANSWERED as null —
    // so the pair says the refusal is about that member rather than
    // about a router refusing every create it is handed, and that
    // the column is projected rather than hidden.
    const accepted = await request(app)
      .post(topics)
      .send({ name: FREE_NAME, intervalSeconds: HOURLY });

    // The WHOLE envelope on both, because the detail is the answer
    // here rather than an accompaniment to the status: it names
    // `body` rather than the key, since the key itself is something
    // the request said.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NEXT_RUN_AT_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NEXT_RUN_AT_BODY);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.nextRunAt).toBeNull();

    // A COUNT rather than an absence, over the serialised body: the
    // instant is the one value any request in this file submits
    // that a refusal could plausibly quote back.
    const leaked = JSON.stringify({
      ...NEXT_RUN_AT_BODY,
      details: [{
        field: 'body',
        message: `Carries the unknown key ${SENTINEL_INSTANT}.`,
        code: 'unrecognized_keys',
      }],
    });

    expect(countOccurrences(JSON.stringify(created.body), SENTINEL_INSTANT))
      .toBe(0);
    expect(countOccurrences(JSON.stringify(patched.body), SENTINEL_INSTANT))
      .toBe(0);
    // The planted control: without it both zeros above are equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, SENTINEL_INSTANT)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The verbs: two states each refuses, and the count one needs
// ---------------------------------------------------------------------------

describe('a verb naming no topic', () => {
  it('answers 404 from both, and 200 for the stored id', async () => {
    const { app, scheduledId } = await withSchedulable();

    const ranMissing = await request(app).post(runNowPath(ABSENT_ID));
    const pausedMissing = await request(app)
      .post(pausePath(ABSENT_ID))
      .send({ cycles: 1 });
    // The controls, along the axis under test and through the SAME
    // two operations. Both are needed rather than one: a verb that
    // refused every id it was handed satisfies its own assertion
    // above on its own, and the two verbs are two handlers.
    const ran = await request(app).post(runNowPath(scheduledId));
    const paused = await request(app)
      .post(pausePath(scheduledId))
      .send({ cycles: 1 });

    // The SAME constant the patch and the delete answer with, which
    // is the claim: the two verbs are a third and fourth chance to
    // answer a missing row a new way, and they read the row before
    // they write it rather than letting the write report it.
    expect(ranMissing.status).toBe(404);
    expect(ranMissing.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
    expect(pausedMissing.status).toBe(404);
    expect(pausedMissing.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
    expect(ran.status).toBe(200);
    expect(paused.status).toBe(200);
  });
});

describe('a run-now against a topic that is disabled', () => {
  it('answers 409 for a disabled row, which a pause takes', async () => {
    const { app, disabledId, scheduledId } = await withSchedulable();

    const refused = await request(app).post(runNowPath(disabledId));
    // The first control, through the SAME operation against an
    // enabled row: without it the assertion above is equally green
    // against a run-now that refuses every topic it is given.
    const ran = await request(app).post(runNowPath(scheduledId));
    // The second, and the one no other case can stand in for: the
    // SAME disabled row, PAUSED. That row is scheduled, so a pause
    // takes it — which is what says this `409` is the run-now's own
    // guard on `enabled` rather than something about the row, and
    // that a pause is not a disable. A verb that had copied its
    // neighbour's guard fails exactly here.
    const paused = await request(app)
      .post(pausePath(disabledId))
      .send({ cycles: 1 });

    // The WHOLE envelope, because the message is the answer: it
    // names the reason a write would have been a silent no-op, and
    // `409` rather than `422` says the request was well formed and
    // the row was there.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual(TOPIC_DISABLED_BODY);
    expect(ran.status).toBe(200);
    expect(paused.status).toBe(200);
    // And the pause did not enable it on the way past, which is the
    // column this pair is about.
    expect(paused.body.data.enabled).toBe(false);
  });
});

describe('a pause against a topic that is not scheduled', () => {
  it('answers 409 for an unscheduled row a run-now takes', async () => {
    const { app, unscheduledId, scheduledId } = await withSchedulable();

    const refused = await request(app)
      .post(pausePath(unscheduledId))
      .send({ cycles: 1 });
    // The first control, through the SAME operation against a
    // scheduled row.
    const paused = await request(app)
      .post(pausePath(scheduledId))
      .send({ cycles: 1 });
    // The second: the SAME unscheduled row, RUN NOW. That row is
    // enabled, so the run-now takes it and schedules it — which
    // is what says this `409` is the pause's own guard on a NULL
    // due time rather than a state both verbs refuse. It is also
    // the repair the refusal implies: there is no run to defer
    // until something has scheduled one.
    const ran = await request(app).post(runNowPath(unscheduledId));

    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual(TOPIC_NOT_SCHEDULED_BODY);
    expect(paused.status).toBe(200);
    expect(ran.status).toBe(200);
    // The row the pause refused was answered a due time by the
    // OTHER verb in the same case, so the NULL it refused was a
    // state and not a row nothing could schedule.
    expect(ran.body.data.nextRunAt).toBe(CLOCK_INSTANT);
  });
});

describe('a pause body the schema refuses', () => {
  it('answers 422 naming the body when none was sent', async () => {
    const { app, scheduledId } = await withSchedulable();

    const nothing = await request(app).post(pausePath(scheduledId));
    // The discriminating pair rather than a control: `{}` IS a body
    // and is refused at `cycles`, so the envelope above is about
    // the body being ABSENT rather than about any refused pause. A
    // handler passing `req.body ?? {}` answers both requests the
    // second way and passes every other case in this file.
    const empty = await request(app)
      .post(pausePath(scheduledId))
      .send({});
    // The control, along the axis under test and through the SAME
    // operation.
    const counted = await request(app)
      .post(pausePath(scheduledId))
      .send({ cycles: 1 });

    expect(nothing.status).toBe(422);
    expect(nothing.body).toStrictEqual(NO_BODY_SENT_BODY);
    expect(empty.status).toBe(422);
    expect(empty.body).toStrictEqual(NO_CYCLES_BODY);
    expect(counted.status).toBe(200);
  });

  it('answers 422 for a cycles of zero, and 200 for one', async () => {
    const { app, scheduledId } = await withSchedulable();

    const zero = await request(app)
      .post(pausePath(scheduledId))
      .send({ cycles: 0 });
    // The control is ONE past the refusal rather than an arbitrary
    // count, exactly as the over-cap `perPage` case is paired with
    // a request at the cap: it says the refusal is a FLOOR and not
    // a route that refuses every count it is handed.
    const one = await request(app)
      .post(pausePath(scheduledId))
      .send({ cycles: 1 });

    // `too_small` at `cycles`, asserted WHOLE: a zero writes the
    // base back unchanged, which on an overdue row IS the
    // extraordinary run a pause was asked to defer, so the refusal
    // is the difference between the two verbs surviving.
    expect(zero.status).toBe(422);
    expect(zero.body).toStrictEqual(ZERO_CYCLES_BODY);
    expect(one.status).toBe(200);
    // Nothing the request submitted is in the refusal, which the
    // whole-envelope assertion above already says and this states
    // as the rule it is an instance of.
    expect(countOccurrences(JSON.stringify(zero.body), 'cycles'))
      .toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The page: one window of a domain's topics, beside the meta for it
// ---------------------------------------------------------------------------

describe('a topic list that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, domainId, transformersId } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const whole = await request(app).get(topics);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same two
    // rows. A handler ignoring the window answers both rows to all
    // three calls, and a total taken from the rows in hand answers
    // 1 to each of the narrow pair — which is the reading the
    // refusal half could not take, since no case there can afford a
    // window narrower than its collection. The wide read is what
    // makes the narrow ones read as narrowings OF something.
    const first = await request(app)
      .get(topics)
      .query({ page: 1, perPage: 1 });
    const second = await request(app)
      .get(topics)
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
      total: LISTED_NAMES.length,
      totalPages: 1,
    });
    // Name ascending, which the fixture cannot have arranged: the
    // transformers row was planted first and sorts second, so this
    // order is the store's own rather than the order the rows
    // arrived in.
    expect(namesOf(whole.body)).toStrictEqual(LISTED_NAMES);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(TOPIC_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering every
    // read the same wrong row would satisfy any cross-response
    // compare. `domainId` is here because no list case could
    // otherwise say which domain the rows came out of, and
    // `nextRunAt` because a planted topic is UNSCHEDULED and the
    // column is answered rather than hidden.
    expect(topicFor(whole.body.data as NamedRow[], STORED_NAME))
      .toStrictEqual({
        id: transformersId,
        domainId,
        name: STORED_NAME,
        searchTerms: STORED_TERMS,
        intervalSeconds: HOURLY,
        nextRunAt: null,
        enabled: true,
        minIntervalSeconds: null,
        maxIntervalSeconds: null,
      });
    // The two windows are disjoint and each names the total of the
    // COLLECTION, which no page could have counted from its rows.
    expect(namesOf(first.body)).toStrictEqual([PATCHED_NAME]);
    expect(namesOf(second.body)).toStrictEqual([STORED_NAME]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: LISTED_NAMES.length,
      totalPages: LISTED_NAMES.length,
    });
    expect(second.body.meta).toStrictEqual({
      page: 2,
      perPage: 1,
      total: LISTED_NAMES.length,
      totalPages: LISTED_NAMES.length,
    });
  });

  it('answers an empty page past the end of the collection', async () => {
    const { app } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const past = await request(app).get(`${topics}?page=99`);
    // The control: the same collection through a window that
    // reaches it. Without it an empty `data` is equally green
    // against a list route answering nothing to anybody.
    const reached = await request(app).get(topics);

    expect(past.status).toBe(200);
    // The envelope does not change shape when the page is empty,
    // which is what makes an overshot page a page rather than a
    // 404: the domain is there, its topics are there, and only the
    // window over them is empty.
    expect(keysOf(past.body)).toStrictEqual(PAGE_KEY_SET);
    expect(past.body.data).toStrictEqual([]);
    // `meta` echoes the page that was ASKED FOR and describes the
    // COLLECTION, so 99 sits beside a `totalPages` of 1 and a
    // `total` no empty page could have been counted from.
    expect(past.body.meta).toStrictEqual({
      page: 99,
      perPage: DEFAULT_PER_PAGE,
      total: LISTED_NAMES.length,
      totalPages: 1,
    });
    expect(namesOf(reached.body)).toStrictEqual(LISTED_NAMES);
    expect(reached.body.meta.total).toBe(LISTED_NAMES.length);
  });
});

// ---------------------------------------------------------------------------
// The resource: one topic added, and the row the store answered
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the stored row, not the request', async () => {
    const { app, domainId } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const created = await request(app)
      .post(topics)
      .send({
        name: FREE_NAME,
        searchTerms: CREATED_TERMS,
        intervalSeconds: HOURLY,
        enabled: false,
        minIntervalSeconds: TEN_MINUTES,
        maxIntervalSeconds: DAILY,
      });
    // The control, along the axis under test and through the SAME
    // operation: the two members the schema requires and nothing
    // else. Four of this record's members are then the SERVICE's
    // defaults rather than the request's, so the pair says a create
    // writes what it was handed where a member was handed and
    // defaults only where one was not — a handler defaulting
    // unconditionally answers the first request wrongly, and one
    // dropping absent members answers the second wrongly.
    const sparse = await request(app)
      .post(topics)
      .send({ name: SPARE_NAME, intervalSeconds: HOURLY });

    expect(created.status).toBe(201);
    expect(sparse.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(sparse.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(created.body.data)).toStrictEqual(TOPIC_KEY_SET);
    expect(keysOf(sparse.body.data)).toStrictEqual(TOPIC_KEY_SET);
    expect(created.body.success).toBe(true);
    expect(created.body.data.name).toBe(FREE_NAME);
    // The list REPLACES nothing here and is simply stored, asserted
    // whole rather than by length: a create answering the two terms
    // in some other order, or one of them, is a red case.
    expect(created.body.data.searchTerms).toStrictEqual(CREATED_TERMS);
    expect(created.body.data.intervalSeconds).toBe(HOURLY);
    expect(created.body.data.enabled).toBe(false);
    expect(created.body.data.minIntervalSeconds).toBe(TEN_MINUTES);
    expect(created.body.data.maxIntervalSeconds).toBe(DAILY);
    // UNSCHEDULED whatever else the body said, which is
    // `InsertTopicInput` carrying no such member rather than
    // anything the handler does: scheduling it is the separate act
    // `POST /topics/:id/run-now` performs.
    expect(created.body.data.nextRunAt).toBeNull();
    // The four defaults, none of them on the sparse request: an
    // empty term list, enabled, and neither bound.
    expect(sparse.body.data.searchTerms).toStrictEqual([]);
    expect(sparse.body.data.enabled).toBe(true);
    expect(sparse.body.data.minIntervalSeconds).toBeNull();
    expect(sparse.body.data.maxIntervalSeconds).toBeNull();
    expect(sparse.body.data.nextRunAt).toBeNull();
    // Neither member is on either request body — the path named
    // the domain and nothing named an id — so both arriving right
    // is the STORE having answered rather than the request having
    // been echoed back under a 201.
    expect(created.body.data.domainId).toBe(domainId);
    expect(sparse.body.data.domainId).toBe(domainId);
    expect(typeof created.body.data.id).toBe('number');
    expect(created.body.data.id).not.toBe(sparse.body.data.id);
  });

  it('stores it, and leaves the collection it joined alone', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const { app, domainId, transformersId } = await withTopics();
    const topics = topicsPath(STORED_SLUG);

    const created = await request(app)
      .post(topics)
      .send({
        name: FREE_NAME,
        searchTerms: CREATED_TERMS,
        intervalSeconds: HOURLY,
      });
    const listed = await request(app).get(topics);
    const rows = listed.body.data as NamedRow[];
    const expected = [...LISTED_NAMES, FREE_NAME].sort();

    expect(listed.status).toBe(200);
    // The whole collection, so a create reaching more rows than the
    // one it wrote is a red case here rather than an answer nobody
    // compared against anything. Sorted at use, because where the
    // new name falls among the planted ones is the store's ordering
    // rather than this case's subject.
    expect(namesOf(listed.body)).toStrictEqual(expected);
    expect(listed.body.meta.total).toBe(expected.length);
    expect(topicFor(rows, FREE_NAME)).toStrictEqual(created.body.data);
    // And the row that was already there still carries what it
    // carried, which no assertion over a created row could say: a
    // create lands ONE row. A whole-row literal rather than a field
    // read, since the fault worth catching here is a neighbour
    // gaining a member or losing one on the way past a write.
    expect(topicFor(rows, STORED_NAME)).toStrictEqual({
      id: transformersId,
      domainId,
      name: STORED_NAME,
      searchTerms: STORED_TERMS,
      intervalSeconds: HOURLY,
      nextRunAt: null,
      enabled: true,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });
  });
});

// ---------------------------------------------------------------------------
// The patch: the members rewritten, and the ones it never named
// ---------------------------------------------------------------------------

describe('a patch of the terms and the cadence that lands', () => {
  it('answers 200 with the stored row afterwards', async () => {
    const { app, domainId, inferenceId } = await withTopics();
    const topic = `/topics/${inferenceId}`;

    const retuned = await request(app)
      .patch(topic)
      .send({ searchTerms: PATCHED_TERMS, intervalSeconds: HALF_HOURLY });
    // The first control: a member the patch does not name is left
    // alone. Without it the case is equally green against a handler
    // rewriting every column on every patch — and it runs the
    // other way round here, since this patch names only `enabled`
    // and the two members written above have to survive it.
    const disabled = await request(app)
      .patch(topic)
      .send({ enabled: false });
    // The second: `null` CLEARS a bound where ABSENT leaves it
    // standing, which is the distinction `patchTopicSchema`
    // declares `.nullable().optional()` for and the only way an
    // operator removes a floor. A handler collapsing the two with a
    // `??` answers these two requests the same way, and the
    // ceiling this request never names is what reports it.
    const unfloored = await request(app)
      .patch(topic)
      .send({ minIntervalSeconds: null });
    const listed = await request(app).get(topicsPath(STORED_SLUG));

    expect(retuned.status).toBe(200);
    // Two members, not three: a patch answers one resource, and a
    // `meta` arriving here would be the page envelope on a body
    // that describes no window.
    expect(keysOf(retuned.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(retuned.body.data)).toStrictEqual(TOPIC_KEY_SET);
    expect(retuned.body.success).toBe(true);
    // The list arrives REPLACED and not merged into: two members
    // rather than the three a union of the stored and the submitted
    // would carry, which is the store's rule reaching a caller.
    expect(retuned.body.data.searchTerms).toStrictEqual(PATCHED_TERMS);
    expect(retuned.body.data.intervalSeconds).toBe(HALF_HOURLY);
    // The name, the id, the domain and both bounds came through
    // untouched, and the request named none of them — asserted
    // because a silent rename, a move between domains or a cleared
    // bound would leave every read above green.
    expect(retuned.body.data.name).toBe(PATCHED_NAME);
    expect(retuned.body.data.id).toBe(inferenceId);
    expect(retuned.body.data.domainId).toBe(domainId);
    expect(retuned.body.data.minIntervalSeconds).toBe(TEN_MINUTES);
    expect(retuned.body.data.maxIntervalSeconds).toBe(DAILY);
    // And the column the dispatcher owns is still where the create
    // left it: this router has no route that may write it.
    expect(retuned.body.data.nextRunAt).toBeNull();
    expect(disabled.status).toBe(200);
    expect(keysOf(disabled.body.data)).toStrictEqual(TOPIC_KEY_SET);
    expect(disabled.body.data.enabled).toBe(false);
    // Both members written by the first patch are still there under
    // a second that never named either.
    expect(disabled.body.data.searchTerms).toStrictEqual(PATCHED_TERMS);
    expect(disabled.body.data.intervalSeconds).toBe(HALF_HOURLY);
    expect(unfloored.status).toBe(200);
    expect(unfloored.body.data.minIntervalSeconds).toBeNull();
    expect(unfloored.body.data.maxIntervalSeconds).toBe(DAILY);
    // And the store holds what the last patch answered, read back
    // through the OTHER operation: a patch answering a row it never
    // wrote satisfies every assertion above.
    expect(topicFor(listed.body.data as NamedRow[], PATCHED_NAME))
      .toStrictEqual({
        id: inferenceId,
        domainId,
        name: PATCHED_NAME,
        searchTerms: PATCHED_TERMS,
        intervalSeconds: HALF_HOURLY,
        nextRunAt: null,
        enabled: false,
        minIntervalSeconds: null,
        maxIntervalSeconds: DAILY,
      });
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what it leaves behind
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing at all, and takes the row', async () => {
    const { app, transformersId } = await withTopics();

    const removed = await request(app).delete(`/topics/${transformersId}`);
    const listed = await request(app).get(topicsPath(STORED_SLUG));
    const elsewhere = await request(app).get(topicsPath(OTHER_SLUG));
    // The control, through the SAME operation: the identical
    // request against an id that named a row a moment ago is a 404,
    // which is what makes the 204 above a delete rather than what
    // this route answers to any id it is handed.
    const again = await request(app).delete(`/topics/${transformersId}`);

    expect(removed.status).toBe(204);
    // An EMPTY key set, which is this route's half of the shape the
    // rest of the file reads: a deleted resource has no
    // representation, so what is asserted is that NOTHING travelled
    // rather than that some envelope did.
    expect(keysOf(removed.body)).toStrictEqual([]);
    expect(removed.text).toBe('');
    expect(removed.type).toBe('');
    // The row is gone, its neighbour is not, and the domain still
    // answers a page: nothing in schema v2 points at `topics`, so
    // this delete has neither a guard nor a cascade, and a 204 that
    // took the collection with it would be caught here rather than
    // by anything the delete answered.
    expect(listed.status).toBe(200);
    expect(namesOf(listed.body)).toStrictEqual([PATCHED_NAME]);
    expect(listed.body.meta.total).toBe(1);
    // The second domain still researches the name this delete took,
    // which is the widening control: the row is addressed by an id,
    // and a store deleting by NAME would take that one too.
    expect(namesOf(elsewhere.body)).toStrictEqual([STORED_NAME]);
    expect(again.status).toBe(404);
    expect(again.body).toStrictEqual(NO_SUCH_TOPIC_BODY);
  });
});
