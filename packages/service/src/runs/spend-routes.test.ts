/**
 * `src/runs/spend-routes.ts` — what the one aggregate answers,
 * refusing and landing: the status, the envelope, the window it
 * says it was taken over, the members a bucket reaches the wire
 * with, and the two refusals this route can raise on its own.
 * Driven over supertest against a router built by the real factory,
 * standing on `tests/helpers/memory-research-store.ts`, so every
 * claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `./spend-service.test.ts` is the
 * translation and only the translation. Which day a call falls on,
 * where the calls belonging to nobody land, which window an
 * unqualified request is answered over and that the span is bounded
 * before any read are claims about the RULES, and are pinned one
 * file over, over direct calls with no server. What no call can
 * report is whether a rule reached a caller: the status
 * `errorHandler` or the handler chose, the envelope written around
 * it, and what the SERIALISED response says — which is where a
 * bucket's `day` matters most, a UTC midnight being something a
 * response BODY carries as a string rather than a value a function
 * returned.
 *
 * SEVEN CASES IN SIX GROUPS. Two guard the fixture and the shapes
 * every answer is compared to, one is the summary and the window
 * beside it, one is the span this route will not take, one is the
 * parameter it does not declare, and TWO are the structure: the
 * verb inventory read off the router's own stack, and the port
 * classified against a write vocabulary.
 *
 * ONE ROW PER DOMAIN AND PER DAY, READ AS A PARTITION AND NOT AS A
 * LIST. The fixture puts two calls under one domain on one day, a
 * third under that domain on the NEXT day, one under the other
 * domain on the FIRST day, and two that reach no domain at all — so
 * the four buckets that come back are the four ways the grouping
 * can differ: same domain and same day COLLAPSE, same domain and
 * different days SPLIT, different domains and one day SPLIT, and
 * the calls belonging to nobody are a bucket of their own rather
 * than being dropped or folded into somebody's. A grouping keyed on
 * the day alone, on the domain alone, or on neither answers a
 * different number of buckets from the same rows.
 *
 * THE TWO ROUTES TO A NULL DOMAIN ARE BOTH PLANTED and both land in
 * ONE bucket, which is what says the null is a domain rather than a
 * marker for a kind of call: `runs.domain_id` and `llm_calls.run_id`
 * are each nullable, so a call reaches no domain by naming a
 * domain-less pass or by naming no pass at all, and the bucket
 * holding both counts two.
 *
 * THE MAGNITUDES ARE READ IN BOTH OF THEIR STATES INSIDE ONE
 * ANSWER. One bucket sums calls that measured something and one
 * bucket holds only calls that measured nothing, so `promptChars`
 * and `estTokens` reach the wire as numbers and as null in the same
 * response — a store coalescing an unmeasured sum to zero and a
 * store answering the count in its place are both visible here
 * rather than in a fixture where every call carried a number.
 *
 * THE WINDOW ON THE WIRE IS READ TWICE, AND THE SECOND READING IS
 * THIS ROUTER'S OWN. A window the caller named must travel back
 * unchanged, which is what says nothing between the parse and the
 * answer re-derived it; and a request naming NO bounds must be
 * answered over a span measured back from THIS ROUTER'S clock,
 * which is the only claim in either file that reaches
 * `SpendRouterOptions.clock` at all. A handler reading the wall
 * clock in place of the thunk it was built with answers a window
 * three days out here and every other assertion in the file goes on
 * holding.
 *
 * THE SPAN CEILING IS BRACKETED RATHER THAN ASSERTED, and the
 * bracket is one millisecond wide. `SPEND_MAX_WINDOW_DAYS` is the
 * widest window a caller may NAME rather than the first one
 * refused, so the case sends a span of exactly the maximum and a
 * span one millisecond wider — and only the ACCEPTED half can
 * report a comparison written `>=`, the refused half answering the
 * same `422` under either spelling. A task told to add a request
 * above the maximum owes the request AT it in the same case, or the
 * comparison is pinned by nothing.
 *
 * THE REFUSAL NAMES THE MAXIMUM AND NOT THE SPAN SUBMITTED, which
 * is asserted as ONE WHOLE BODY: `window_too_wide` naming `since`
 * under the service's own sentence, where the schema's own refusals
 * on this route reach the wire as `custom` under a generic one. The
 * two are told apart here rather than by a shared `422`, and the
 * stamps the request carried are counted in what came back against
 * a known positive taken by the same function in the same case.
 *
 * THE PARAMETER THIS ROUTE DOES NOT DECLARE is a `422` naming
 * `query` rather than the key, with a declared parameter landing as
 * its control. TWO KEYS ARE SENT AND THE SECOND IS THE READING: a
 * sentinel nothing on this surface declares, and `?page`, which is
 * legal on every paginated list in this repository and undeclared
 * HERE — a summary being bounded by its span rather than by a row
 * limit, so there is no window over it for a caller to move.
 *
 * THE STRUCTURE IS TWO CASES BECAUSE THE READ-ONLY RULE IS TWO
 * SHAPES. One reads the router's own `stack`: one path, one verb,
 * and the whole inventory in one comparison, so a `post` added
 * beside the `get` is a different value here rather than a route no
 * case happens to send to. The other classifies `RunStore` itself —
 * every method it declares names a run, a ledger or the spend and
 * begins with a reading verb, with the liveness control through the
 * same call in the same case, and the narrower surface THIS router
 * holds is read beside it: two methods, which is the smallest store
 * on this surface. Beside that runs the SIGNATURE half, which
 * `check-types` owns and no name can report.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s. That a `?domain` no domain
 * carries is a `404`, that an inverted window and an unparseable
 * stamp are refused before any read, that the clock is read at most
 * once, that no answered member is named for money and that the
 * bucket order is the store's are `./spend-service.test.ts`'s,
 * taken over direct calls, over a recording port and over the
 * schema itself. And `/runs` is a second router in this directory,
 * read in `./routes.test.ts`.
 *
 * MUTATION GRID, taken by mutating one file one edit at a time and
 * reading the failed `fullName` SET off a `--reporter=json` run
 * rather than a count. FOURTEEN legs: four mutate
 * `./spend-routes.ts`, four `./spend-service.ts` and six
 * `tests/helpers/memory-research-store.ts`. THE WHOLE GRID WAS RUN
 * TWICE and the per-leg sets diffed between the two runs of one
 * tree; every set was identical member for member, which is what
 * separates a measurement from a bad capture.
 *
 * THE STATUS AND THE ENVELOPE. `res.status(201)` reddens 4 — every
 * case that sends a request — and answering the summary WITHOUT
 * `ok()` reddens the same 4, told apart only by the assertion that
 * fails inside each.
 *
 * THE CLOCK, AND IT IS THIS ROUTER'S OWN. Passing
 * `() => new Date()` in place of `options.clock` reddens 2: the
 * summary case, whose defaulted window is held against the fixed
 * instant, and the undeclared-key case, whose landing control closes
 * its open upper bound at the same one. Nothing else in either spend
 * file reaches `SpendRouterOptions.clock` at all.
 *
 * THE WINDOW A CALLER NAMED. Ignoring the submitted upper bound
 * reddens 1, the summary case. Ignoring the submitted lower bound
 * reddens 3, every bounded request in the file then being answered
 * over a window it did not ask for.
 *
 * THE SPAN CEILING, TWO LEGS LANDING ON ONE CASE. Comparing on `>=`
 * reddens 1 and removing the bound altogether reddens the same 1,
 * the bracket living in one case — so the grid cannot separate them
 * and they are recorded as two legs rather than as one figure
 * covering both. The `>=` leg reports through the ACCEPTED half
 * alone: the over-wide request is refused under either spelling, so
 * a case sending it without the request AT the maximum beside it
 * would pin nothing about the comparison.
 *
 * THE GROUPING, FOUR LEGS. Dropping the day from the in-memory
 * bucket key reddens 2, dropping the domain reddens 2, and
 * attributing every call to nobody reddens 2 — each of them the
 * summary case and the fixture guard, which reads the bucket count
 * through the same route. Coalescing an unmeasured sum to zero
 * reddens 1, which only the two buckets that summed nothing can
 * report.
 *
 * THE UTC DAY, ONE LEG AND IT IS ENVIRONMENT-DEPENDENT. Truncating
 * in the process's own zone rather than at UTC reddens 1, the
 * summary case, MEASURED AT +02:00 — under `TZ=UTC` the two
 * accessor families agree and the leg is a literal no-op, so that
 * figure is a reading about this machine as much as about the
 * fixture.
 *
 * THE STRUCTURE. Registering a SECOND `get` on the one path BENEATH
 * the real one reddens exactly 1, the inventory case: Express
 * answers from the first, so no request in this file changes its
 * answer and only a reading off the `stack` can see the extra
 * handler at all.
 *
 * THE PLANT-NOTHING WHOLE-HALF CONTROL reddens 3 of 7, and the FOUR
 * SURVIVORS are the coverage statement rather than the count: the
 * shapes case and the two structural cases read declarations rather
 * than rows, and the undeclared-key case's subject is a query that
 * never reaches a store at all.
 */
import type {
  SpendServiceStore,
  SpendSummary,
  SpendWindow,
} from './spend-service.js';
import type {
  LlmCallRecord,
  RunFilter,
  RunStore,
  SpendBucket,
} from './store.js';
import type {
  MemoryLlmCall,
  MemoryResearchStore,
  MemoryRun,
} from '../../tests/helpers/memory-research-store.js';
import type { SuccessEnvelope } from '../http/envelope.js';
import type { StoreWindow, TimeWindow } from '../http/schemas.js';
import type { Application, Router } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { buildSpendRouter } from './spend-routes.js';
import {
  SPEND_DEFAULT_WINDOW_DAYS,
  SPEND_MAX_WINDOW_DAYS,
  spendQuerySchema,
} from './spend-service.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('spend-routes-test', {
  level: 'silent',
});

/** The path the one route registers, and the whole of its address. */
const SUMMARY_PATH = '/spend/summary';

/** The seeded worked example, and the domain that spent most. */
const RADAR = 'example-tech-radar';

/** A second domain, which spent on one of the same days. */
const SIBLING = 'example-newsroom';

/**
 * How long a day is, in milliseconds.
 *
 * The unit the span bracket is built in, and the same one
 * `./spend-service.ts` counts its two constants in — spelled again
 * rather than imported, because that module keeps it private and a
 * change to it should redden a case rather than agree silently.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * The present every request in this file is answered against.
 *
 * A FIXED INSTANT AND NOT THE WALL CLOCK, which is what makes the
 * defaulted window readable at all: a router handed
 * `() => new Date()` answers a span that moves with the run, and
 * the case that reads the default would have nothing to compare it
 * to. Built from `Date.UTC` so nothing here depends on a parse —
 * the month is 0-based, so this is noon on 10 March 2026.
 */
const CLOCK_AT = new Date(Date.UTC(2026, 2, 10, 12, 0, 0));

/** The UTC day two of the planted calls were made on. */
const FIRST_DAY = '2026-03-03T00:00:00.000Z';

/** The UTC day the rest were made on. */
const SECOND_DAY = '2026-03-04T00:00:00.000Z';

/**
 * A query parameter no schema on this route declares.
 *
 * Asserted absent from {@link spendQuerySchema}'s own shape by the
 * fixture guard rather than trusted here, so a parameter ADDED to
 * that schema makes this request legal and reddens there instead of
 * leaving a case asserting a refusal that has quietly stopped
 * happening.
 */
const UNDECLARED_PARAM = 'zzsentinelkeyzz';

/**
 * What that parameter carries.
 *
 * A needle of its own, so the containment reading in that case is
 * about the VALUE as well as about the key it arrived under.
 */
const UNDECLARED_VALUE = 'zzsentinelvaluezz';

/**
 * A parameter every paginated list in this repository declares, and
 * this route does not.
 *
 * THE SHARPER HALF OF THE UNDECLARED-KEY CASE: a sentinel is
 * obviously nobody's, where this is a parameter a client would
 * reasonably send. A summary is bounded by the span it aggregates
 * over rather than by a row limit, so there is no window over it
 * for a `?page` to move, and being undeclared on a `.strict()`
 * shape it is refused rather than ignored.
 */
const PAGED_PARAM = 'page';

/** The pass {@link RADAR} made, which called three times. */
const RUN_RADAR = 4110001;

/** The pass {@link SIBLING} made, which called once. */
const RUN_SIBLING = 4220001;

/** The maintenance tick that belongs to no domain. */
const RUN_TICK = 4330001;

/** Whose pass a planted row is, as the fixture names it. */
type PassOwner = 'nobody' | 'radar' | 'sibling';

/** One row of the runs fixture, before the ids are known. */
interface PlantedPass {
  /** `runs.id`, which the calls below name. */
  readonly id: number;

  /** Which of the two domains made it, or neither. */
  readonly owner: PassOwner;
}

/**
 * The three passes the planted calls hang off.
 *
 * PLANTED RATHER THAN WRITTEN, because `RunStore` declares no
 * insert at all: `src/runs/store.ts` states that the absence IS the
 * read-first rule, so `MemoryResearchStore.setRuns` is the only way
 * this table gets rows and every summary below would otherwise be
 * empty.
 *
 * THE THIRD BELONGS TO NOBODY, which is one of the two routes a
 * call reaches the null bucket by — the other being a call that
 * names no pass at all, and both are planted so the bucket holding
 * them counts two rather than being a state one row could produce.
 */
const PLANTED_PASSES: readonly PlantedPass[] = [
  { id: RUN_RADAR, owner: 'radar' },
  { id: RUN_SIBLING, owner: 'sibling' },
  { id: RUN_TICK, owner: 'nobody' },
];

/** One planted `llm_calls` row, before the store holds it. */
interface PlantedCall {
  /** `llm_calls.id`. */
  readonly id: number;

  /** The pass it belongs to, or null when it belongs to none. */
  readonly runId: number | null;

  /** When it was made, as an ISO stamp. */
  readonly calledAt: string;

  /** How long the prompt was, or null when nothing measured it. */
  readonly promptChars: number | null;

  /** The estimate over that length, or null on the same terms. */
  readonly estTokens: number | null;
}

/**
 * The six calls {@link plantSpend} gives the store.
 *
 * BUILT TO SEPARATE THE FOUR WAYS A GROUPING CAN DIFFER, which is
 * what makes the summary case a reading rather than a listing. Two
 * are one domain's on one day and COLLAPSE into a bucket of two; a
 * third is that domain's on the NEXT day and SPLITS from them; a
 * fourth is the other domain's on the FIRST day and splits from
 * them the other way; and the last two reach no domain at all, by
 * the two different routes `runs.domain_id` and `llm_calls.run_id`
 * being nullable each open. A grouping keyed on the day alone, on
 * the domain alone or on neither answers a different number of
 * buckets from these six rows.
 *
 * THE MAGNITUDES ARE PLANTED ON SOME AND NOT OTHERS, so one bucket
 * sums two measured calls, one sums a measured call beside an
 * unmeasured one, and two sum nothing at all — which is what puts
 * a number and a null in the same answer under each of the two
 * members. A store coalescing an unmeasured sum to zero fails on
 * the buckets that measured nothing while every count beside them
 * still adds up.
 *
 * THE STAMPS ARE HOURS RATHER THAN MIDNIGHTS, so the day a bucket
 * carries is a TRUNCATION of what was stored rather than a value
 * that was already there.
 */
const PLANTED_CALLS: readonly PlantedCall[] = [
  {
    id: 5110001,
    runId: RUN_RADAR,
    calledAt: '2026-03-03T05:00:00.000Z',
    promptChars: 1240,
    estTokens: 310,
  },
  {
    id: 5110002,
    runId: RUN_RADAR,
    calledAt: '2026-03-03T06:00:00.000Z',
    promptChars: 860,
    estTokens: 215,
  },
  {
    id: 5110003,
    runId: RUN_RADAR,
    calledAt: '2026-03-04T05:00:00.000Z',
    promptChars: null,
    estTokens: null,
  },
  {
    id: 5220001,
    runId: RUN_SIBLING,
    calledAt: '2026-03-03T07:00:00.000Z',
    promptChars: null,
    estTokens: null,
  },
  {
    id: 5330001,
    runId: RUN_TICK,
    calledAt: '2026-03-03T08:00:00.000Z',
    promptChars: 40,
    estTokens: 10,
  },
  {
    id: 5330002,
    runId: null,
    calledAt: '2026-03-03T09:00:00.000Z',
    promptChars: null,
    estTokens: null,
  },
];

/** How many calls the deployment ledgered altogether. */
const PLANTED_CALL_COUNT = PLANTED_CALLS.length;

/**
 * How many calls reached no domain, by either route.
 *
 * DERIVED FROM THE TABLE ABOVE rather than written out, so a call
 * that changed pass moves the number the null bucket is read
 * against.
 */
const UNATTRIBUTED_COUNT = PLANTED_CALLS.filter(
  (call) => call.runId === null || call.runId === RUN_TICK,
).length;

/** The lower bound every bounded request in this file sends. */
const WINDOW_SINCE = '2026-03-01T00:00:00.000Z';

/** The upper bound it sends, which is exclusive. */
const WINDOW_UNTIL = '2026-03-06T00:00:00.000Z';

/**
 * One answered bucket, as the WIRE has it.
 *
 * `SpendBucket` WITH ONE MEMBER RETYPED: `day` is a `Date` across
 * the port and arrives here as an ISO-8601 string, because
 * `res.json` serialises through `Date#toJSON`. That is why it is
 * declared rather than imported — and it is held to the same roster
 * the port's own bucket is, so a member renamed on either side is a
 * refusal at {@link EVERY_KEY_LISTED} rather than a member no case
 * looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter that
 * `check-types` refuses.
 */
interface WireBucket {
  /** Whose spend it is, or null for the calls that are nobody's. */
  readonly domainId: number | null;

  /** The UTC day it covers, as JSON carries it. */
  readonly day: string;

  /** How many calls landed in it. A count of rows, never money. */
  readonly calls: number;

  /** What they summed to, or null when none measured it. */
  readonly promptChars: number | null;

  /** The estimate over that sum, or null on the same terms. */
  readonly estTokens: number | null;
}

/** The resolved span, as the WIRE has it. */
interface WireWindow {
  /** The lower bound. A call stamped exactly here is IN. */
  readonly sinceInclusive: string;

  /** The upper bound. A call stamped exactly here is OUT. */
  readonly untilExclusive: string;
}

/** One answered summary, as the WIRE has it. */
interface WireSummary {
  /** The span the buckets were taken over, as resolved. */
  readonly window: WireWindow;

  /** One row per domain per UTC day inside it. */
  readonly buckets: readonly WireBucket[];
}

/**
 * One path a router registered, with the verbs on it.
 *
 * Read off the router's own stack by {@link routesOf}, never
 * written out: a list of paths spelled here would agree with itself
 * whatever the router did.
 */
interface RegisteredRoute {
  /** The express path TEMPLATE, as the router declared it. */
  readonly path: string;

  /** Every verb registered on it, lowercased and sorted. */
  readonly verbs: readonly string[];
}

/**
 * `RunStore` with one `llm_calls` WRITER planted on it.
 *
 * The negative control for the signature pin below, and the reason
 * that pin is worth having: a method that could append to the
 * ledger this route aggregates would have to TAKE a row, and this
 * is what that looks like on a signature. `LlmCallRecord` rather
 * than a narrower shape because `RunFilter` is all-optional — a
 * shape carrying a compatible member would be assignable to it, and
 * the control would read `true` while pinning nothing.
 */
interface PlantedCallWriterPort extends RunStore {
  appendRunLedger(row: LlmCallRecord): Promise<void>;
}

/**
 * The members an answered bucket carries.
 *
 * Written out because an interface has no runtime form to read keys
 * off, and pinned in BOTH directions: `satisfies` refuses a name
 * the port's bucket does not declare, and
 * {@link EVERY_KEY_LISTED} refuses a member added to it and not to
 * this list — which is the drift a money member would arrive as.
 */
const BUCKET_KEYS = [
  'calls',
  'day',
  'domainId',
  'estTokens',
  'promptChars',
] as const satisfies readonly (keyof SpendBucket)[];

/** The members the resolved window is answered with. */
const WINDOW_KEYS = [
  'sinceInclusive',
  'untilExclusive',
] as const satisfies readonly (keyof SpendWindow)[];

/**
 * The members the summary itself carries.
 *
 * TWO AND NOT A BARE LIST, because the window may not be the one
 * the caller named: a request that sent no bounds is answered over
 * a span this service chose, and a list on its own would leave a
 * reader to infer which one from the days that happen to carry
 * calls.
 */
const SUMMARY_KEYS = [
  'buckets',
  'window',
] as const satisfies readonly (keyof SpendSummary)[];

/**
 * The members every body this router answers carries.
 *
 * TWO AND NOT THREE. This route writes the BARE success envelope
 * and never the paged one: there is no window over a collection to
 * describe, the answer being bounded by the span it aggregates over
 * rather than by a row limit, so `meta` is a member no response
 * here has.
 */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/**
 * Every method `RunStore` declares.
 *
 * The NAME half of the read-only reading, and pinned two ways so it
 * cannot go quietly stale: `satisfies` refuses a name the port does
 * not carry, and {@link EVERY_KEY_LISTED} refuses a method added to
 * the port and not to this list. Without the second, a writer
 * landing on the port would simply be absent from the
 * classification below and the case would stay green.
 */
const PORT_METHODS = [
  'countRunLedger',
  'countRuns',
  'findRunById',
  'listRunLedger',
  'listRuns',
  'summariseSpend',
] as const satisfies readonly (keyof RunStore)[];

/**
 * Every method this router's own store type carries.
 *
 * TWO, WHICH IS THE NARROWEST STORE ON THIS SURFACE: the aggregate
 * and the lookup that resolves a `?domain`. The other five of
 * `RunStore` are `./routes.ts`'s, and their absence is the split
 * between the two routers — that one pages the ledger and this one
 * buckets it, and neither can reach the other's half by a later
 * edit because neither store type has a member for it.
 */
const SERVICE_METHODS = [
  'findDomainBySlug',
  'summariseSpend',
] as const satisfies readonly (keyof SpendServiceStore)[];

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
  CoversEveryKey<SpendBucket, typeof BUCKET_KEYS>
  & CoversEveryKey<WireBucket, typeof BUCKET_KEYS>
  & CoversEveryKey<SpendWindow, typeof WINDOW_KEYS>
  & CoversEveryKey<WireWindow, typeof WINDOW_KEYS>
  & CoversEveryKey<SpendSummary, typeof SUMMARY_KEYS>
  & CoversEveryKey<WireSummary, typeof SUMMARY_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<RunStore, typeof PORT_METHODS>
  & CoversEveryKey<SpendServiceStore, typeof SERVICE_METHODS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to the bucket, to the window, to the summary, to
 * the envelope, to the port or to the `Pick` the router is handed,
 * and to none of the lists above, turns {@link EveryKeyListed} into
 * a `never` — `false` for the list that missed it, intersected with
 * the `true` the others still answer — and this initializer is then
 * a TS2322 at this line, before any case can compare an answer
 * against a set that has quietly stopped describing it. Read in a
 * case below, so it is a symbol this file uses rather than one lint
 * reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link BUCKET_KEYS}, sorted at use rather than by hand. */
const BUCKET_KEY_SET: readonly string[] = [...BUCKET_KEYS].sort();

/** {@link WINDOW_KEYS}, sorted. */
const WINDOW_KEY_SET: readonly string[] = [...WINDOW_KEYS].sort();

/** {@link SUMMARY_KEYS}, sorted. */
const SUMMARY_KEY_SET: readonly string[] = [...SUMMARY_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link SERVICE_METHODS}, sorted. */
const SERVICE_METHOD_SET: readonly string[] = [
  ...SERVICE_METHODS,
].sort();

/** The verbs a method that only READS can begin with. */
const READING_VERBS = ['count', 'find', 'list', 'summarise'] as const;

/**
 * The words a port method name uses to name what this group holds.
 *
 * Four rather than the two the real methods spell, because what
 * this roster has to catch is the method somebody ADDS: a writer
 * would as readily be called after the ledger, the call it appends
 * or the spend it settles as after the table itself.
 */
const RUN_NOUNS = [
  'call',
  'ledger',
  'run',
  'spend',
] as const;

/**
 * @param method - A port method name.
 * @returns Whether it names a pass, its ledger or the spend at all.
 */
function namesARun(method: string): boolean {
  const lower = method.toLowerCase();

  return RUN_NOUNS.some((noun) => lower.includes(noun));
}

/**
 * @param methods - The names to classify.
 * @returns Those that name one of those and do NOT begin with a
 *   reading verb, which is the whole of what this file means by a
 *   method whose NAME writes one.
 */
function runWritersIn(methods: readonly string[]): string[] {
  return methods.filter((method) => namesARun(method)
    && !READING_VERBS.some((verb) => method.startsWith(verb)));
}

/**
 * The port methods whose names DO name one of those subjects.
 *
 * ALL SIX, which is the non-vacuity reading beside the empty writer
 * list: a classifier matching nothing at all answers no writers
 * over any roster, and this is what says it matched something.
 */
const RUN_READERS: readonly string[] = [...PORT_METHODS];

/**
 * Four names that would each write a row this group reads.
 *
 * The liveness control for the classification: the same call over
 * the real roster PLUS these four must name all four, so the empty
 * answer over the roster alone is a reading rather than a search
 * that could only ever come back empty. One per noun the roster
 * carries, so a noun dropped from it is reported here rather than
 * left un-exercised.
 */
const PLANTED_WRITERS: readonly string[] = [
  'appendRunLedger',
  'insertRun',
  'recordLlmCall',
  'settleSpend',
];

/**
 * A method name that names a pass, its ledger or the spend.
 *
 * A TEMPLATE-LITERAL union rather than a list of method names, so
 * the pins below are DERIVED from `keyof` rather than transcribed:
 * a method added to the port and matching any arm is in the checked
 * set the day it lands, with nothing edited here.
 */
type RunNamed =
  | `${string}Call${string}`
  | `${string}Ledger${string}`
  | `${string}Run${string}`
  | `${string}Spend${string}`;

/**
 * What a method that only READS can be handed.
 *
 * An id or a limit, a narrowing, a page window or a time window.
 * Named rather than written into the conditional below, where the
 * union spans more than one line and a wrapped tuple type is a
 * style error rather than a reading.
 */
type ReadArgument = number | RunFilter | StoreWindow | TimeWindow;

/**
 * `true` only while `T` is a list of {@link ReadArgument}s.
 *
 * The tuple wrapper around `T` is load-bearing for the reason
 * {@link CoversEveryKey}'s is: without it the union of parameter
 * lists distributes, the answer is `boolean`, and both
 * initializers below are accepted whatever the port declares.
 *
 * @typeParam T - A `Parameters<...>` union.
 */
type ReadsOnly<T> =
  [T] extends [readonly ReadArgument[]] ? true : false;

/**
 * The SIGNATURE half of the read-only claim, `check-types`' own.
 *
 * Every method of `RunStore` whose name names a pass, a ledger or
 * the spend is handed an id, a limit, a narrowing and a window and
 * nothing else, so not one of them can be given a row to store —
 * and the aggregate this router reaches is among them, which is
 * what says a computed cost could not be written back through it.
 * A writer added to the port is a TS2322 at this line rather than a
 * method the runtime classification would have had to notice on its
 * own.
 */
const RUN_READS_TAKE_NO_ROW: ReadsOnly<Parameters<
  RunStore[Extract<keyof RunStore, RunNamed>]
>> = true;

/** The same over {@link PlantedCallWriterPort}, which is false. */
const A_PLANTED_CALL_WRITER_IS_REPORTED: ReadsOnly<Parameters<
  PlantedCallWriterPort[
    Extract<keyof PlantedCallWriterPort, RunNamed>
  ]
>> = false;

/**
 * @param value - Any answered object.
 * @returns Its keys, sorted, so a comparison is about the SET.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/**
 * Every route a router declares, read off its own stack.
 *
 * DERIVED RATHER THAN TRANSCRIBED, which is the whole of what the
 * structural case is worth: `router.stack` carries one layer per
 * registered path, and that layer's own `stack` carries one handler
 * layer per verb — which is where a method is legible at all. A
 * second `get` on the same path is a second entry in the inner list
 * rather than a second route.
 *
 * @param router - A built router.
 * @returns One entry per registered path.
 */
function routesOf(router: Router): RegisteredRoute[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;

    if (route === undefined) return [];

    return [{
      path: String(route.path),
      verbs: route.stack.map((inner) => inner.method).sort(),
    }];
  });
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
 * An instant a whole number of days from {@link CLOCK_AT}.
 *
 * DERIVED FROM THE CONSTANT THE SERVICE EXPORTS rather than written
 * out, which is what exporting it is for: a bracket built from two
 * literal stamps would go on reading as a span at the maximum after
 * the maximum had moved, and the case would answer nothing.
 *
 * @param days - How many days before the clock.
 * @param offsetMs - A further shift, in milliseconds, so the one
 *   millisecond that separates the accepted span from the refused
 *   one is arithmetic rather than a second stamp.
 * @returns That instant as an ISO-8601 string, which is the only
 *   spelling `timeWindowQuerySchema` takes.
 */
function daysBeforeClock(days: number, offsetMs = 0): string {
  const at = CLOCK_AT.getTime() - days * MILLISECONDS_PER_DAY;

  return new Date(at + offsetMs).toISOString();
}

/**
 * Builds an app carrying one freshly built spend router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app leaves
 * out is the framework's middleware stack and the auth guard: that
 * the router is mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. THE CLOCK IS A FIXED INSTANT
 * and is this router's own required option: nothing else in either
 * file reaches it, and the summary case is what reads that the
 * window it defaulted was measured back from THIS one.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildSpendApp(store: SpendServiceStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildSpendRouter({ store, clock: () => CLOCK_AT }));
  app.use(errorHandler(silentLogger));

  return app;
}

/** The two domains, the three passes across them, and the store. */
interface PlantedSpend {
  /** The store, holding both domains and everything planted. */
  readonly store: MemoryResearchStore;

  /** The id {@link RADAR} resolved to, which the buckets carry. */
  readonly radarId: number;

  /** The id {@link SIBLING} resolved to. */
  readonly siblingId: number;
}

/**
 * Two domains, the three passes between them and the six calls.
 *
 * The smallest fixture every case here can be reached from, and the
 * second domain earns its place twice: it spent on one of the same
 * days as the first, so a grouping keyed on the day alone answers
 * one bucket where two are asserted, and it makes every narrowed
 * summary a scoping reading as well.
 *
 * @returns The store and the two domain ids, so a case can compare
 *   an answered `domainId` against the id its slug resolved to.
 */
async function plantSpend(): Promise<PlantedSpend> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const sibling = await store.insertDomain({
    slug: SIBLING,
    name: 'Newsroom',
    settings: {},
  });
  const owners: Record<PassOwner, number | null> = {
    nobody: null,
    radar: domain.id,
    sibling: sibling.id,
  };
  const runs: readonly MemoryRun[] = PLANTED_PASSES.map((pass) => ({
    id: pass.id,
    domainId: owners[pass.owner],
    startedAt: new Date(WINDOW_SINCE),
    finishedAt: null,
    status: 'ok' as const,
    counts: {},
    errors: [],
    scheduledBy: 'interval' as const,
  }));
  const calls: readonly MemoryLlmCall[] = PLANTED_CALLS.map((call) => ({
    id: call.id,
    runId: call.runId,
    node: 'capture',
    model: null,
    promptChars: call.promptChars,
    estTokens: call.estTokens,
    calledAt: new Date(call.calledAt),
  }));

  store.setRuns(runs);
  store.setLlmCalls(calls);

  return { store, radarId: domain.id, siblingId: sibling.id };
}

/**
 * The same fixture with an app in front of it.
 *
 * @returns The app every request-sending case below drives, beside
 *   the store it stands on and the two domain ids.
 */
async function withSpend(): Promise<PlantedSpend & {
  readonly app: Application;
}> {
  const planted = await plantSpend();

  return { ...planted, app: buildSpendApp(planted.store) };
}

/**
 * The whole body a span above the maximum answers with.
 *
 * IT NAMES THE MAXIMUM AND NOT THE SPAN SUBMITTED, which is what
 * the whole-body comparison is for: a caller learns what it may ask
 * for rather than being told back what it asked, and the two stamps
 * it sent are nowhere in the answer. The code is the service's own
 * rather than the `custom` a schema refinement reaches the wire as,
 * so the over-wide window and the inverted one are told apart here
 * rather than by a shared `422`.
 */
const WIDE_WINDOW_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'since',
    message:
      `The window may not span more than ${SPEND_MAX_WINDOW_DAYS} days`,
    code: 'window_too_wide',
  }],
};

/**
 * The whole body a query parameter this endpoint does not declare
 * answers with.
 *
 * IT NAMES `query` AND NOT THE KEY, which is the difference between
 * the container refusal and the value one: a format refusing a
 * VALUE names the parameter the caller typed, and this one cannot,
 * the key being the thing that is wrong. That is also what keeps
 * the sentinel out of the answer without anything masking it.
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

// ---------------------------------------------------------------------------
// What the fixture plants, and the vocabulary behind every refusal
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants calls a grouping must take apart', async () => {
    const { app } = await withSpend();

    // The four ways a grouping can differ are each planted, which
    // is what makes the summary case a reading rather than a
    // listing: two calls share a domain AND a day, a third shares
    // the domain and not the day, a fourth shares the day and not
    // the domain, and two share neither because they reach no
    // domain at all.
    const days = new Set(PLANTED_CALLS.map(
      (call) => call.calledAt.slice(0, 10),
    ));

    expect(days.size).toBe(2);
    expect(UNATTRIBUTED_COUNT).toBe(2);
    expect(PLANTED_CALL_COUNT).toBeGreaterThan(UNATTRIBUTED_COUNT);
    // BOTH ROUTES TO A NULL DOMAIN, which is what says the null
    // bucket is a domain rather than a marker for a kind of call:
    // one call names a pass that belongs to nobody and one names no
    // pass at all.
    expect(PLANTED_CALLS.filter((call) => call.runId === null))
      .toHaveLength(1);
    expect(PLANTED_CALLS.filter((call) => call.runId === RUN_TICK))
      .toHaveLength(1);
    // Both magnitude states are planted, so a number and a null
    // reach the wire under each of the two members in one answer.
    expect(PLANTED_CALLS.filter((call) => call.promptChars !== null)
      .length).toBeGreaterThan(0);
    expect(PLANTED_CALLS.filter((call) => call.promptChars === null)
      .length).toBeGreaterThan(0);
    // Every stamp is an hour rather than a midnight, so the day a
    // bucket carries is a TRUNCATION of what was stored rather than
    // a value that was already there.
    for (const call of PLANTED_CALLS) {
      expect(call.calledAt).not.toContain('T00:00:00');
    }
    // The bounded window every case sends really holds them all,
    // and the span it names is inside the ceiling — so a bounded
    // request in this file is never also a span refusal.
    const since = Date.parse(WINDOW_SINCE);
    const until = Date.parse(WINDOW_UNTIL);

    for (const call of PLANTED_CALLS) {
      expect(Date.parse(call.calledAt)).toBeGreaterThanOrEqual(since);
      expect(Date.parse(call.calledAt)).toBeLessThan(until);
    }
    expect(until - since)
      .toBeLessThan(SPEND_MAX_WINDOW_DAYS * MILLISECONDS_PER_DAY);
    // And they are inside the DEFAULT window too, measured back
    // from the fixture clock, which is what lets the unqualified
    // request be compared against the bounded one row for row.
    expect(since).toBeGreaterThanOrEqual(CLOCK_AT.getTime()
      - SPEND_DEFAULT_WINDOW_DAYS * MILLISECONDS_PER_DAY);
    expect(until).toBeLessThanOrEqual(CLOCK_AT.getTime());
    // The two parameters the refusal case submits are undeclared,
    // read off the schema rather than trusted: a parameter ADDED to
    // it makes that request legal and reddens here instead of
    // leaving a case asserting a refusal that no longer happens.
    const declared = Object.keys(spendQuerySchema.shape);

    expect(declared).not.toContain(UNDECLARED_PARAM);
    expect(declared).not.toContain(PAGED_PARAM);
    expect(declared).toContain('domain');
    expect(declared).toContain('since');
    expect(declared).toContain('until');
    // And the rows really are there, which the counts above cannot
    // say: a fixture whose plant seams had stopped planting would
    // satisfy every premise in this case.
    const summary = await request(app)
      .get(SUMMARY_PATH)
      .query({ since: WINDOW_SINCE, until: WINDOW_UNTIL });

    expect(summary.status).toBe(200);
    expect((summary.body.data as WireSummary).buckets).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // the bucket, to the window, to the summary, to the envelope,
    // to the port or to the `Pick` the router is handed and to none
    // of the lists is a TS2322 at that declaration, before any
    // assertion below can compare an answer against a set that has
    // quietly stopped describing it — which is the shape a money
    // member would arrive in.
    expect(EVERY_KEY_LISTED).toBe(true);
    // This route writes the BARE envelope and never the paged one,
    // so `meta` is a member no response here has: the answer is
    // bounded by the span it aggregates over rather than by a row
    // limit, and `window` is what stands in for one.
    expect(RESOURCE_KEY_SET).not.toContain('meta');
    expect(SUMMARY_KEY_SET).toContain('window');
    // The router's own store surface is TWO methods, which is the
    // split `src/runs/routes.ts` is on the other side of: the page
    // and the single get are unreachable from this router because
    // its store type has no member for them.
    expect(SERVICE_METHOD_SET)
      .toStrictEqual(['findDomainBySlug', 'summariseSpend']);
    expect(SERVICE_METHOD_SET).toHaveLength(2);
    for (const method of ['listRuns', 'findRunById', 'listRunLedger']) {
      expect(SERVICE_METHOD_SET).not.toContain(method);
    }
    // And the path this file drives is the one the router
    // registers, spelled once rather than at each request.
    expect(SUMMARY_PATH).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// The summary: one row per domain and day, and the window beside it
// ---------------------------------------------------------------------------

describe('a summary that lands', () => {
  it('answers one bucket per domain and day', async () => {
    const { app, radarId, siblingId } = await withSpend();

    const bounded = await request(app)
      .get(SUMMARY_PATH)
      .query({ since: WINDOW_SINCE, until: WINDOW_UNTIL });
    // The control, varied along the axis under test and through the
    // SAME operation: the identical read with NO bounds at all,
    // which must be answered over a span measured back from this
    // router's own clock. A handler reading the wall clock in place
    // of the thunk it was built with answers a window three days
    // out here while every bucket beside it goes on agreeing.
    const defaulted = await request(app).get(SUMMARY_PATH);

    expect(bounded.status).toBe(200);
    expect(defaulted.status).toBe(200);
    // TWO members and not three: this read applies no window over a
    // collection, so there is no `meta` for a router to build and
    // `window` is what says which span the buckets belong to.
    expect(keysOf(bounded.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(bounded.body.success).toBe(true);
    const summary = bounded.body.data as WireSummary;

    expect(keysOf(summary)).toStrictEqual(SUMMARY_KEY_SET);
    expect(keysOf(summary.window)).toStrictEqual(WINDOW_KEY_SET);
    // The window a caller NAMED travels back unchanged, which is
    // what says nothing between the parse and the answer re-derived
    // it, and both bounds reach the wire as their ISO spellings —
    // that conversion being the framework's own.
    expect(summary.window).toStrictEqual({
      sinceInclusive: WINDOW_SINCE,
      untilExclusive: WINDOW_UNTIL,
    });
    // FOUR BUCKETS OUT OF SIX CALLS, asserted WHOLE and in order.
    // Same domain and same day COLLAPSE into a count of two, same
    // domain and different days SPLIT, two domains on one day
    // SPLIT, and the calls reaching no domain are a bucket of their
    // own rather than being dropped or folded into somebody's — so
    // a grouping keyed on the day alone answers two rows here, one
    // keyed on the domain alone answers three, and one keyed on
    // neither answers one. Each `day` is the UTC midnight that
    // opens it, which is the calendar written into the value rather
    // than left to a reader, and the magnitudes sum only the calls
    // that measured something.
    expect(summary.buckets).toStrictEqual([
      {
        domainId: radarId,
        day: SECOND_DAY,
        calls: 1,
        promptChars: null,
        estTokens: null,
      },
      {
        domainId: radarId,
        day: FIRST_DAY,
        calls: 2,
        promptChars: 2100,
        estTokens: 525,
      },
      {
        domainId: siblingId,
        day: FIRST_DAY,
        calls: 1,
        promptChars: null,
        estTokens: null,
      },
      {
        domainId: null,
        day: FIRST_DAY,
        calls: 2,
        promptChars: 40,
        estTokens: 10,
      },
    ]);
    // Every bucket rather than the first, so an answer cannot carry
    // one well-shaped row beside one that leaked a member.
    for (const bucket of summary.buckets) {
      expect(keysOf(bucket)).toStrictEqual(BUCKET_KEY_SET);
    }
    // THE PARTITION: the buckets account for every call in the
    // window and for no more, which is the one reading no
    // per-bucket assertion can make — an aggregate that had dropped
    // the calls belonging to nobody answers three plausible buckets
    // and a total that is short by exactly them.
    const counted = summary.buckets.reduce(
      (total, bucket) => total + bucket.calls,
      0,
    );

    expect(counted).toBe(PLANTED_CALL_COUNT);
    expect(summary.buckets.filter(
      (bucket) => bucket.domainId === null,
    )).toHaveLength(1);
    expect(summary.buckets.find(
      (bucket) => bucket.domainId === null,
    )?.calls).toBe(UNATTRIBUTED_COUNT);
    // And the unqualified request is answered over the DEFAULTED
    // span, closed above at this router's clock and below it by the
    // service's own default — the same buckets, since the fixture
    // sits inside both windows, under a window the caller never
    // named.
    const chosen = defaulted.body.data as WireSummary;

    expect(chosen.window).toStrictEqual({
      sinceInclusive: daysBeforeClock(SPEND_DEFAULT_WINDOW_DAYS),
      untilExclusive: CLOCK_AT.toISOString(),
    });
    expect(chosen.window).not.toStrictEqual(summary.window);
    expect(chosen.buckets).toStrictEqual(summary.buckets);
  });
});

// ---------------------------------------------------------------------------
// The span: the widest window this route will take, and the next one
// ---------------------------------------------------------------------------

describe('a span above the maximum', () => {
  it('refuses it and takes the maximum itself', async () => {
    const { app } = await withSpend();

    const since = daysBeforeClock(SPEND_MAX_WINDOW_DAYS, -1);
    const until = CLOCK_AT.toISOString();
    const wide = await request(app)
      .get(SUMMARY_PATH)
      .query({ since, until });
    // The control, inside the case and varied along this row's own
    // axis by ONE MILLISECOND: the same request over a span of
    // exactly the maximum, which is the widest a caller may NAME
    // rather than the first one refused. Only this half can report
    // a comparison written `>=` — the refused request above answers
    // the same 422 under either spelling, so a case sending the
    // over-wide window alone pins nothing about the boundary.
    const atMax = await request(app)
      .get(SUMMARY_PATH)
      .query({ since: daysBeforeClock(SPEND_MAX_WINDOW_DAYS), until });

    expect(wide.status).toBe(422);
    // The whole body rather than the status, which is where the
    // refusal says WHICH rule it was: `window_too_wide` naming
    // `since` under the service's own sentence, where this route's
    // other 422s reach the wire as `custom` or as `invalid_format`.
    // The maximum is in it and the span submitted is not.
    expect(wide.body).toStrictEqual(WIDE_WINDOW_BODY);
    expect(wide.body.details[0].message)
      .toContain(String(SPEND_MAX_WINDOW_DAYS));
    // Neither stamp is quoted back, counted rather than asserted
    // absent and held against known positives taken by the same
    // function in the same case — the query string a caller could
    // read either off is the one it sent.
    const sent = `?since=${since}&until=${until}`;

    expect(countOccurrences(wide.text, since)).toBe(0);
    expect(countOccurrences(wide.text, until)).toBe(0);
    expect(countOccurrences(sent, since)).toBe(1);
    expect(countOccurrences(sent, until)).toBe(1);
    // And the span AT the maximum lands, carrying the window it
    // named: a route refusing every wide window passes the
    // assertions above and fails these.
    expect(atMax.status).toBe(200);
    const summary = atMax.body.data as WireSummary;

    expect(summary.window.untilExclusive).toBe(until);
    expect(summary.window.sinceInclusive)
      .toBe(daysBeforeClock(SPEND_MAX_WINDOW_DAYS));
    expect(summary.buckets.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter this route does not declare
// ---------------------------------------------------------------------------

describe('a query parameter this route does not declare', () => {
  it('answers 422 naming the query rather than the key', async () => {
    const { app } = await withSpend();

    const undeclared = await request(app)
      .get(SUMMARY_PATH)
      .query({
        since: WINDOW_SINCE,
        [UNDECLARED_PARAM]: UNDECLARED_VALUE,
      });
    // THE SHARPER HALF: `?page` is legal on every paginated list in
    // this repository and undeclared here, a summary being bounded
    // by the span it aggregates over rather than by a row limit. So
    // this is the parameter a client would actually send, and it is
    // refused rather than ignored.
    const paged = await request(app)
      .get(SUMMARY_PATH)
      .query({ [PAGED_PARAM]: 1 });
    // The control is the identical first request with the
    // undeclared member removed, so the pair says the refusal is
    // about the key rather than about a route refusing every query
    // it is handed — and `?since` alone is legal, which is what
    // makes the difference between the two requests the one member.
    const declared = await request(app)
      .get(SUMMARY_PATH)
      .query({ since: WINDOW_SINCE });

    expect(undeclared.status).toBe(422);
    expect(paged.status).toBe(422);
    // The whole body rather than the status, which is where the
    // refusal says WHICH rule it was: `unrecognized_keys` naming
    // the CONTAINER rather than the key, where a format refusing a
    // value names the parameter the caller typed. That is also what
    // keeps the sentinel out of the answer with nothing masking it.
    // BOTH keys answer the identical body, which is what says the
    // refusal is about the shape rather than about either name.
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(paged.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    // Neither the key nor its value is quoted back, counted against
    // known positives taken by the same function in the same case.
    const sent = `?${UNDECLARED_PARAM}=${UNDECLARED_VALUE}`;

    expect(countOccurrences(undeclared.text, UNDECLARED_PARAM)).toBe(0);
    expect(countOccurrences(undeclared.text, UNDECLARED_VALUE)).toBe(0);
    expect(countOccurrences(sent, UNDECLARED_PARAM)).toBe(1);
    expect(countOccurrences(sent, UNDECLARED_VALUE)).toBe(1);
    // The declared member LANDS, which is what says the strictness
    // is about the key rather than about the query, and it closes
    // its own open bound at the clock rather than refusing.
    expect(declared.status).toBe(200);
    const summary = declared.body.data as WireSummary;

    expect(summary.window).toStrictEqual({
      sinceInclusive: WINDOW_SINCE,
      untilExclusive: CLOCK_AT.toISOString(),
    });
  });
});

// ---------------------------------------------------------------------------
// The structure: one get, and a port that cannot write a call
// ---------------------------------------------------------------------------

describe('what this router structurally cannot do', () => {
  it('registers one get on one path and no other verb', async () => {
    // Built here rather than reached through {@link withSpend},
    // because what this reads is the router's own DECLARATION: a
    // factory registers its routes at construction and reads
    // nothing, so no fixture is involved in the answer.
    const { store } = await plantSpend();
    const registered = routesOf(
      buildSpendRouter({ store, clock: () => CLOCK_AT }),
    );

    // The whole inventory in one comparison, derived from the stack
    // rather than transcribed: a second path, a second verb on this
    // one, or a `post` in place of the `get` are each a different
    // value here. An empty stack is too, which is what keeps this
    // from being a search that could only answer nothing.
    expect(registered).toStrictEqual([
      { path: SUMMARY_PATH, verbs: ['get'] },
    ]);
    // The verb SET across the whole router, read separately, so a
    // failure says whether a path or a verb moved.
    expect(registered.flatMap((route) => route.verbs))
      .toStrictEqual(['get']);
    expect(registered).toHaveLength(1);
  });

  it('names no port method that writes a call or a cost', () => {
    // The roster is pinned in both directions at its declaration,
    // so what this classifies is every method `RunStore` declares
    // and not a list that stopped tracking it.
    const methods: readonly string[] = PORT_METHODS;

    expect(runWritersIn(methods)).toStrictEqual([]);
    // Non-vacuous: the port DOES name a pass, its ledger or the
    // spend in every one of its methods, and a classifier matching
    // nothing would answer the empty list above against any roster
    // at all.
    expect(methods.filter(namesARun)).toStrictEqual(RUN_READERS);
    // And every one of them begins with a reading verb, which is
    // the other half of what the empty writer list is made of.
    expect(methods.filter(
      (method) => READING_VERBS.some((verb) => method.startsWith(verb)),
    )).toStrictEqual([...PORT_METHODS]);
    // The liveness control, through the same call in the same case:
    // four names that WOULD write a row are all reported when they
    // sit in the roster beside the real ones — one per noun the
    // roster carries, so a noun dropped from it is reported here
    // rather than left un-exercised.
    expect(runWritersIn([...methods, ...PLANTED_WRITERS]))
      .toStrictEqual([...PLANTED_WRITERS]);
    // The same reading over the narrower surface the ROUTER holds,
    // which is where a write-back of a computed cost would have to
    // appear to be reachable from this handler at all: the domain
    // lookup names no call and the aggregate is the port's own
    // read.
    expect(runWritersIn(SERVICE_METHOD_SET)).toStrictEqual([]);
    expect(SERVICE_METHOD_SET.filter(namesARun))
      .toStrictEqual(['summariseSpend']);
    // The signature half, which `check-types` owns and which no
    // name can report: the aggregate is handed a narrowing and a
    // window, so a cost computed on the way out has nothing to be
    // written back through. Its negative control sits beside it —
    // the same derivation over a port carrying a planted ledger
    // writer answers `false`, which is what says the derivation
    // discriminates rather than answering `true` for everything.
    expect(RUN_READS_TAKE_NO_ROW).toBe(true);
    expect(A_PLANTED_CALL_WRITER_IS_REPORTED).toBe(false);
  });
});
