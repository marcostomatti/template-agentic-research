/**
 * `src/runs/routes.ts` — what the two reads answer, refusing and
 * landing: the status, the envelope, the members a row reaches the
 * wire with, and the counters that say a ledger was cut. Driven
 * over supertest against a router built by the real factory,
 * standing on `tests/helpers/memory-research-store.ts`, so every
 * claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `./service.test.ts` is the translation
 * and only the translation. Which passes a `?domain` selects, where
 * the cap cuts, that an id no run carries is a `NotFoundError` and
 * that no refusal quotes anything back are claims about the RULES,
 * and are pinned one file over, over direct calls with no server.
 * What no call can report is whether a rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, the members that envelope carried, and what the
 * SERIALISED response says — which is where the two stamp columns
 * matter most, a `Date` being something a response BODY carries as
 * a string rather than a value a function returned.
 *
 * TEN CASES IN SEVEN GROUPS. Two guard the fixture and the shapes
 * every answer is compared to, one is the page and the `meta`
 * beside it, one is the narrowing as the wire has it, two are the
 * pass a single get answers and the cut its ledger reports, one is
 * the id no run carries, one is the parameter this surface does not
 * declare, and TWO are the structure: the verb inventory read off
 * the router's own stack, and the port classified against a write
 * vocabulary.
 *
 * THE PAGE. One request with no query at all beside two windows of
 * ONE over the same five rows, which is the reading a refusal could
 * not take: a refusal cannot afford a window narrower than its
 * collection, so every page it reads holds every row and a `total`
 * counted off the rows in hand agrees with the counted one. The
 * narrow pair is disjoint and each names the total of the
 * COLLECTION. The envelope is asserted as a key SET with `meta`
 * whole, one row is compared whole against the constants the
 * fixture plants from, and EVERY row's key set is read rather than
 * the first's — a page cannot carry one well-shaped record beside
 * one that leaked a column.
 *
 * THE ORDER REACHES THE WIRE AS THE PORT ANSWERED IT, which is the
 * only half of the ordering this file owns; the sort itself is the
 * store's and `tests/helpers/memory-research-store.test.ts` is
 * where the two keys are held apart. The plant is what makes even
 * that reading possible — the five passes go in middle-first, so
 * the answered order is neither the order they arrived in nor its
 * reverse, and their ids DISAGREE with their stamps, so a handler
 * re-sorting a page it was handed by the one column a reader would
 * reach for answers a different list. The fixture guard computes
 * all three wrong answers rather than naming them.
 *
 * THE NARROWING IS READ OVER THE ROWS AND OVER THE PARTITION. An
 * absent `?domain` is every pass INCLUDING the maintenance tick
 * that belongs to none, a present one is that domain's alone, and
 * the two narrowed totals together fall short of the unnarrowed one
 * by exactly the passes belonging to nobody. That arithmetic is the
 * positive form of this wave's decision that no spelling of
 * `?domain` asks for those passes alone, and no single narrowed
 * page can report it: a filter that had stopped being applied
 * answers every narrowed page plausibly and only the sum catches
 * it.
 *
 * THE CUT IS BRACKETED RATHER THAN ASSERTED, and both halves of the
 * bracket are on the wire. A pass under the cap answers its ledger
 * whole with `ledgerTruncated` false and `llmCallCount` equal to
 * the length that came back; a pass past it answers exactly
 * {@link RUN_LEDGER_CAP} rows, `true`, and the FULL count — the two
 * differing by what was withheld. Only the under-cap half can
 * report a comparison written `>=`, since a count of two hundred
 * and three exceeds the cap under either spelling, which is why the
 * short ledger sits in the same case as the long one rather than
 * being left to the section above it. The over-cap fixture is
 * DERIVED from the exported constant, so a cap that moved moves the
 * plant with it instead of leaving a case that no longer reaches
 * one.
 *
 * THE END THE CUT TOOK IS THE OLDEST ONE, which a length alone
 * cannot say. The kept ids are asserted in the order they arrived
 * and the dropped ones asserted absent, and the whole planted
 * ledger is read off the port in the same case first, so the rows
 * missing from the answer were CUT rather than never stored.
 *
 * THE ID NO RUN CARRIES is a `404` asserted as one whole body, and
 * its control is the SAME operation over an id that resolves. The
 * id is not quoted back, counted rather than asserted absent and
 * held against a known positive taken by the same function in the
 * same case — the request path, where the digits a caller typed do
 * occur exactly once.
 *
 * THE PARAMETER THIS SURFACE DOES NOT DECLARE is a `422` naming
 * `query` rather than the key, which is the container refusal
 * rather than the value one, with `?page=1` alone landing as its
 * control. THE SINGLE GET IS THE DEPARTURE AND IT IS MEASURED
 * RATHER THAN PREDICTED: `/runs/:id` parses no query at all, so the
 * identical parameter reaches it and is IGNORED, and the same case
 * reads the `200` that follows. A reader taking the list's rule for
 * the router's would predict a refusal there, which is why the
 * absence is pinned rather than described.
 *
 * THE STRUCTURE IS TWO CASES BECAUSE THE READ-ONLY RULE IS TWO
 * SHAPES. One reads the router's own `stack`: two paths, one verb
 * each, and the whole inventory in one comparison, so a `post`
 * added beside a `get` is a different value here rather than a
 * route no case happens to send to. The other classifies `RunStore`
 * itself — every method it declares, pinned in both directions at
 * its declaration, names a run, a ledger or the spend and begins
 * with a reading verb, with the liveness control through the same
 * call in the same case. Beside that runs the SIGNATURE half, which
 * `check-types` owns and no name can report: not one of those
 * methods can be handed a row, and the same derivation over a port
 * carrying a planted writer answers `false` — twice, once for a
 * `runs` row and once for an `llm_calls` one, since the two would
 * enter through differently named methods.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim, and what
 * a refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s. That a `?domain` no domain
 * carries is a `404` rather than an empty page, that an unshaped
 * one is a `422` raised before any read, that a `perPage` above the
 * shared ceiling is refused and that the composed query inherited
 * that ceiling rather than declaring a second one are
 * `./service.test.ts`'s, taken over direct calls and over the
 * schema itself. And `/spend/summary` is a second router in this
 * directory, read in `./spend-routes.test.ts`.
 *
 * MUTATION GRID, taken by mutating one file one edit at a time and
 * reading the failed `fullName` SET off a `--reporter=json` run
 * rather than a count. SEVENTEEN legs: eight mutate `./routes.ts`,
 * five `./service.ts` and four
 * `tests/helpers/memory-research-store.ts`. THE WHOLE GRID WAS RUN
 * TWICE and the per-leg sets diffed between the two runs of one
 * tree; every set was identical member for member, which is what
 * separates a measurement from a bad capture.
 *
 * THE STATUS AND THE ENVELOPE, three legs and the bluntest here.
 * `res.status(201)` on the page reddens 4 and on the single get 5 —
 * every case that sends that kind of request — and answering the
 * detail WITHOUT `ok()` reddens the same 5 as the second, told apart
 * only by the assertion that fails inside each.
 *
 * THE PAGE, two legs on one case. `total: page.rows.length` in place
 * of `total: page.total` reddens 1 and a fixed store window in place
 * of `toStoreWindow(query)` reddens the SAME 1, the page case being
 * the only read in this file taking a window narrower than its
 * collection.
 *
 * THE NARROWING, ONE RULE IN TWO FILES. Handing `undefined` in place
 * of `query.domain` reddens 1, the narrowing case, and replacing the
 * in-memory runs predicate with `true` reddens the same 1 — the
 * router's half and the store's half, told apart by which file the
 * edit is in rather than by the case that reports.
 *
 * THE CUT, FOUR LEGS, EACH LANDING WHERE THE BOUNDARY LETS IT.
 * Handing the store a limit of 1 reddens 3, the two ledger cases and
 * the undeclared-key case whose ignored-query reading counts the
 * short ledger. Pinning `ledgerTruncated` to `false` reddens 1, the
 * long ledger alone. Comparing on `>=` rather than `>` reddens 2 and
 * NEITHER member is an over-cap assertion: two hundred and three
 * exceeds the cap under either spelling, so what reports is the
 * under-cap ledger in the first case and the under-cap CONTROL
 * inside the second, which is why the short ledger sits in the
 * same case as the long one. Answering `llmCallCount` off the cut
 * list reddens 2, the long ledger and the fixture guard that reads
 * the full count through the same route.
 *
 * THE ADDRESS. Comparing the resolved run against `undefined` so
 * that branch never fires reddens 1, the id case alone.
 *
 * THE STORE'S ORDER AND ITS SCOPE. Reversing the in-memory runs
 * ordering reddens 1, the page case. Reading a ledger unscoped by
 * its run reddens 3, the same set the ledger-limit leg names — the
 * other domain's call and the call naming no pass at all are what
 * make that leg reportable rather than a no-op.
 *
 * THE STRUCTURE. Registering a SECOND `get` on `/runs` BENEATH the
 * real one reddens exactly 1, the inventory case: Express answers
 * from the first, so no request in this file changes its answer and
 * only a reading off the `stack` can see the extra handler at all.
 *
 * THE MEASURED DEPARTURE. Parsing the list query on the SINGLE GET
 * reddens exactly 1, the undeclared-key case, which is the only
 * place in either runs file that reads what `/runs/:id` does with a
 * query it was not asked about. Without that case the route could
 * grow a refusal nobody asked for and nothing here would say so.
 *
 * THE PLANT-NOTHING WHOLE-HALF CONTROL reddens 7 of 10, and the
 * SURVIVORS are the coverage statement rather than the count: the
 * shapes case and the two structural cases, each of which reads a
 * declaration rather than a row. A survivor that could not be
 * explained that way would be a case asserting something it does not
 * mean.
 */
import type { RunDetail, RunsServiceStore } from './service.js';
import type {
  LlmCallRecord,
  RunFilter,
  RunRecord,
  RunStore,
} from './store.js';
import type {
  MemoryLlmCall,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { RunScheduler, RunStatus } from '../db/schema/values.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
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

import { buildRunsRouter } from './routes.js';
import { RUN_LEDGER_CAP, runListQuerySchema } from './service.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('runs-routes-test', {
  level: 'silent',
});

/** The seeded worked example, and the domain the pages narrow to. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, with a pass of its own.
 *
 * IT HAS RUN SOMETHING, which is what makes every narrowed page
 * here a scoping reading too: a handler that had stopped handing
 * the slug on answers five rows where that case asserts three.
 */
const SIBLING = 'example-newsroom';

/**
 * A run id no `runs` row carries.
 *
 * SEVEN DIGITS, which is a containment rule rather than a fixture
 * accident: the number is submitted and then counted in what came
 * back, and a shorter one matches a length, a total or a stamp by
 * coincidence often enough to read as a leak.
 */
const MISSING_RUN_ID = 9114523;

/**
 * A query parameter no schema on this router declares.
 *
 * Asserted absent from {@link runListQuerySchema}'s own shape by
 * the fixture guard rather than trusted here, so a parameter ADDED
 * to that schema makes this request legal and reddens there instead
 * of leaving a case asserting a refusal that has quietly stopped
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

/** When the oldest planted pass began. */
const FIRST_START = '2026-03-01T00:00:00.000Z';

/** When the next one did. */
const SECOND_START = '2026-03-02T00:00:00.000Z';

/** When the middle one did. */
const THIRD_START = '2026-03-03T00:00:00.000Z';

/** When the next-to-newest one did. */
const FOURTH_START = '2026-03-04T00:00:00.000Z';

/** When the newest one did. */
const FIFTH_START = '2026-03-05T00:00:00.000Z';

/** When the pass that is still open finished, which is not yet. */
const BUSY_FINISH = '2026-03-04T02:30:00.000Z';

/** The pass {@link RADAR} made that called nothing. */
const RUN_QUIET = 4110001;

/** The pass {@link RADAR} made that ledgered two calls. */
const RUN_BUSY = 4110002;

/** The pass {@link SIBLING} made. */
const RUN_ELSEWHERE = 4220001;

/** The maintenance tick that belongs to no domain. */
const RUN_TICK = 4330001;

/** The pass whose ledger runs past {@link RUN_LEDGER_CAP}. */
const RUN_LONG = 4550001;

/** Whose pass a planted row is, as the fixture names it. */
type PassOwner = 'nobody' | 'radar' | 'sibling';

/** One row of the runs fixture, before the ids are known. */
interface PlantedPass {
  /** `runs.id`, which the page's tiebreak would sort by. */
  readonly id: number;

  /** Which of the two domains made it, or neither. */
  readonly owner: PassOwner;

  /** When it began, as an ISO stamp. */
  readonly startedAt: string;

  /** When it ended, as an ISO stamp, or null while it is open. */
  readonly finishedAt: string | null;

  /** What it came to. */
  readonly status: RunStatus;

  /** What it did, as the jsonb column holds it. */
  readonly counts: Record<string, number>;

  /** What it could not do, as that jsonb column holds it. */
  readonly errors: unknown;

  /** What asked for it. */
  readonly scheduledBy: RunScheduler;
}

/**
 * The five passes {@link plantRuns} gives the store, PLANTED
 * MIDDLE-FIRST.
 *
 * PLANTED RATHER THAN WRITTEN, because `RunStore` declares no
 * insert at all: `src/runs/store.ts` states that the absence IS the
 * read-first rule, so `MemoryResearchStore.setRuns` is the only way
 * this table gets rows and every page below would otherwise be
 * empty.
 *
 * THE OWNER IS A LABEL AND NOT AN ID, because the ids are the
 * store's and are only known once the domains are inserted. That is
 * what lets the rosters below be DERIVED from this one table rather
 * than written out beside it, so a row that changed hands moves
 * both and no case is left asserting about a split the plant no
 * longer has.
 *
 * THE PLANT ORDER IS NEITHER THE ANSWERED ORDER NOR ITS REVERSE,
 * and the ids DISAGREE with the stamps — the newest pass does not
 * carry the highest id, and the oldest does not carry the lowest.
 * So a store answering rows in insertion order, one answering them
 * backwards and a handler re-sorting by the one numeric column a
 * reader would reach for each produce a different list from the one
 * right answer, and the fixture guard computes all three rather
 * than naming them.
 *
 * They differ along every axis a case here reads. Three belong to
 * one domain, one to the other and one to nobody, so a filter has
 * something to leave out on either side and the tick is standing
 * from the first case. One is still open and one has finished, so
 * the nullable stamp is read in both of its states. One carries
 * counts and one carries errors, so neither jsonb column is
 * answered whole out of an empty object.
 */
const PLANTED_PASSES: readonly PlantedPass[] = [
  {
    id: RUN_ELSEWHERE,
    owner: 'sibling',
    startedAt: THIRD_START,
    finishedAt: null,
    status: 'ok',
    counts: {},
    errors: [],
    scheduledBy: 'interval',
  },
  {
    id: RUN_TICK,
    owner: 'nobody',
    startedAt: FIFTH_START,
    finishedAt: null,
    status: 'partial',
    counts: {},
    errors: [{ node: 'maintenance', reason: 'a source timed out' }],
    scheduledBy: 'operator',
  },
  {
    id: RUN_QUIET,
    owner: 'radar',
    startedAt: FIRST_START,
    finishedAt: null,
    status: 'ok',
    counts: {},
    errors: [],
    scheduledBy: 'interval',
  },
  {
    id: RUN_BUSY,
    owner: 'radar',
    startedAt: FOURTH_START,
    finishedAt: BUSY_FINISH,
    status: 'ok',
    counts: { captured: 4, scored: 2 },
    errors: [],
    scheduledBy: 'agent',
  },
  {
    id: RUN_LONG,
    owner: 'radar',
    startedAt: SECOND_START,
    finishedAt: null,
    status: 'running',
    counts: {},
    errors: [],
    scheduledBy: 'agent',
  },
];

/** How many passes the deployment has made altogether. */
const PLANTED_COUNT = PLANTED_PASSES.length;

/** Their ids in the order they were planted. */
const PLANT_ORDER: readonly number[] = PLANTED_PASSES.map(
  (pass) => pass.id,
);

/**
 * The order a page answers them in: `startedAt` descending.
 *
 * Written out rather than derived, on the terms
 * `src/documents/routes.test.ts` states for its own page: the sort
 * is the port's rule and the in-memory implementation's own suite
 * is where the two keys are held apart, so what this file claims is
 * only that whatever the port answered reached the wire in that
 * order.
 */
const START_ORDER: readonly number[] = [
  RUN_TICK,
  RUN_BUSY,
  RUN_ELSEWHERE,
  RUN_LONG,
  RUN_QUIET,
];

/**
 * The ids of the planted passes each owner made, ASCENDING.
 *
 * DERIVED FROM THE TABLE ABOVE rather than written out, so a row
 * that changed owner moves the roster it is read against.
 *
 * @param owner - Whose passes to name.
 * @returns Their ids, ascending, for a membership reading that says
 *   nothing about the order a page came back in.
 */
function idsOwnedBy(owner: PassOwner): number[] {
  return PLANTED_PASSES
    .filter((pass) => pass.owner === owner)
    .map((pass) => pass.id)
    .sort((left, right) => left - right);
}

/** {@link RADAR}'s three passes. */
const RADAR_RUN_IDS: readonly number[] = idsOwnedBy('radar');

/** {@link SIBLING}'s one. */
const SIBLING_RUN_IDS: readonly number[] = idsOwnedBy('sibling');

/** The maintenance tick, which belongs to neither. */
const TICK_RUN_IDS: readonly number[] = idsOwnedBy('nobody');

/** One planted `llm_calls` row, before the store holds it. */
interface PlantedCall {
  /** `llm_calls.id`, and the ledger's tiebreak. */
  readonly id: number;

  /** The pass it belongs to, or null when it belongs to none. */
  readonly runId: number | null;

  /** Which step made it. */
  readonly node: string;

  /** Which model answered it, or null when none was recorded. */
  readonly model: string | null;

  /** How long the prompt was, or null when nothing measured it. */
  readonly promptChars: number | null;

  /** The estimate over that length, or null on the same terms. */
  readonly estTokens: number | null;

  /** When it was made, as an ISO stamp. */
  readonly calledAt: string;
}

/**
 * The call {@link RUN_BUSY} made first, and the one case reads
 * whole.
 *
 * IT CARRIES BOTH MAGNITUDES AND A MODEL, so the three nullable
 * members of a ledger row are read in their measured state here and
 * in their unmeasured one on the call beside it.
 */
const BUSY_OLDEST_CALL: PlantedCall = {
  id: 5110001,
  runId: RUN_BUSY,
  node: 'capture',
  model: 'example-model-8b',
  promptChars: 1240,
  estTokens: 310,
  calledAt: '2026-03-04T01:00:00.000Z',
};

/** The call it made second, which measured nothing. */
const BUSY_NEWEST_CALL: PlantedCall = {
  id: 5110002,
  runId: RUN_BUSY,
  node: 'score',
  model: null,
  promptChars: null,
  estTokens: null,
  calledAt: '2026-03-04T02:00:00.000Z',
};

/**
 * The four short-ledger calls {@link plantRuns} gives the store.
 *
 * TWO UNDER ONE PASS AND NONE UNDER ANOTHER, so a case reading a
 * run that resolves is not also a case about a run that spent
 * something, and the empty ledger is a state the fixture holds
 * rather than one a later half has to arrange.
 *
 * ONE IS UNDER THE OTHER DOMAIN'S PASS and one NAMES NO RUN AT ALL.
 * The second is the row `RunStore.listRunLedger` and
 * `RunStore.countRunLedger` structurally cannot reach, both being
 * addressed by a run id; the first is a row a ledger read that had
 * stopped scoping would answer. Both are planted so every ledger
 * reading below is taken over a table that carries them.
 */
const PLANTED_CALLS: readonly PlantedCall[] = [
  BUSY_OLDEST_CALL,
  BUSY_NEWEST_CALL,
  {
    id: 5220001,
    runId: RUN_ELSEWHERE,
    node: 'capture',
    model: null,
    promptChars: null,
    estTokens: null,
    calledAt: '2026-03-03T01:00:00.000Z',
  },
  {
    id: 5330001,
    runId: null,
    node: 'maintenance',
    model: null,
    promptChars: null,
    estTokens: null,
    calledAt: '2026-03-05T01:00:00.000Z',
  },
];

/**
 * The ids of the calls one pass ledgered, NEWEST FIRST.
 *
 * DERIVED FROM {@link PLANTED_CALLS} rather than written out, on
 * {@link idsOwnedBy}'s reasoning one table down: a call that
 * changed pass moves every roster it is read against. Newest first
 * because that is the order the answered ledger is compared to, and
 * the stamps rather than the ids are what it sorts on.
 *
 * @param runId - Whose ledger to name, or null for the calls that
 *   name no pass at all.
 * @returns Their ids, newest first.
 */
function callIdsUnder(runId: number | null): number[] {
  return PLANTED_CALLS
    .filter((call) => call.runId === runId)
    .sort((left, right) => Date.parse(right.calledAt)
      - Date.parse(left.calledAt))
    .map((call) => call.id);
}

/** {@link RUN_BUSY}'s two calls, newest first. */
const BUSY_CALL_IDS: readonly number[] = callIdsUnder(RUN_BUSY);

/** How many calls {@link LONG_LEDGER} runs past the cap. */
const LEDGER_OVERSHOOT = 3;

/** The first id {@link LONG_LEDGER} takes. */
const LONG_CALL_FIRST_ID = 5550001;

/**
 * A ledger longer than the cap: {@link RUN_LEDGER_CAP} calls plus
 * {@link LEDGER_OVERSHOOT}, OLDEST FIRST.
 *
 * DERIVED FROM THE CAP RATHER THAN TRANSCRIBED, which is what
 * exporting the constant is for: a fixture of two hundred and three
 * literal rows would go on reading as a ledger past the cap after
 * the cap had moved above it, and the case would answer nothing.
 *
 * ITS STAMPS AND ITS IDS AGREE, one minute apart and one id apart,
 * so the newest {@link RUN_LEDGER_CAP} calls are also the highest
 * ids and the case can read WHICH rows survived the cut as a
 * membership as well as as an order.
 *
 * THE STAMPS ARE BUILT FROM `Date.UTC` AND NOT FROM A STRING, so
 * nothing here depends on a parse: the month is 0-based, so the
 * calls are made through the morning of 6 March 2026.
 */
const LONG_LEDGER: readonly MemoryLlmCall[] = Array.from(
  { length: RUN_LEDGER_CAP + LEDGER_OVERSHOOT },
  (_unused, index) => ({
    id: LONG_CALL_FIRST_ID + index,
    runId: RUN_LONG,
    node: 'step',
    model: null,
    promptChars: null,
    estTokens: null,
    calledAt: new Date(Date.UTC(2026, 2, 6, 0, index)),
  }),
);

/** How many calls {@link RUN_LONG} made altogether. */
const LONG_LEDGER_COUNT = LONG_LEDGER.length;

/**
 * The ids the cap keeps, NEWEST FIRST: the highest
 * {@link RUN_LEDGER_CAP} of them.
 */
const LONG_KEPT_IDS: readonly number[] = LONG_LEDGER
  .slice(LEDGER_OVERSHOOT)
  .map((call) => call.id)
  .reverse();

/** The ids it drops: the {@link LEDGER_OVERSHOOT} oldest. */
const LONG_DROPPED_IDS: readonly number[] = LONG_LEDGER
  .slice(0, LEDGER_OVERSHOOT)
  .map((call) => call.id);

/** The path the collection is read under. */
const RUNS_PATH = '/runs';

/** The path TEMPLATE one pass is read under. */
const RUN_TEMPLATE = '/runs/:id';

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the page case, which asserts `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * having been a default.
 */
const DEFAULT_PER_PAGE = 50;

/**
 * One answered pass, as the WIRE has it.
 *
 * `RunRecord` WITH TWO MEMBERS RETYPED: both stamps are `Date`
 * across the port and arrive here as ISO-8601 strings, because
 * `res.json` serialises through `Date#toJSON`. That is why it is
 * declared rather than imported — and it is held to the same roster
 * the port's own row is, so a member renamed on either side is a
 * refusal at {@link EVERY_KEY_LISTED} rather than a member no case
 * looks at.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` would otherwise take an implicit `any` parameter that
 * `check-types` refuses.
 */
interface WireRun {
  /** `runs.id`, and the tiebreak on the page's order. */
  readonly id: number;

  /** The domain that made it, or null for a maintenance tick. */
  readonly domainId: number | null;

  /** When it began, as JSON carries it. */
  readonly startedAt: string;

  /** When it ended, or null while it is still open. */
  readonly finishedAt: string | null;

  /** What it came to, as stored. */
  readonly status: string;

  /** What it did, as the jsonb column held it. */
  readonly counts: Record<string, number>;

  /** What it could not do, answered whole. */
  readonly errors: unknown;

  /** What asked for it, as stored. */
  readonly scheduledBy: string;
}

/**
 * One answered model call, as the WIRE has it.
 *
 * `LlmCallRecord` with its one stamp retyped, on
 * {@link WireRun}'s terms. It carries no `runId`: the run is the
 * path, and `src/runs/store.ts` leaves the column off the record
 * rather than repeating an address the caller already named.
 */
interface WireCall {
  /** `llm_calls.id`, and the ledger's tiebreak. */
  readonly id: number;

  /** Which step made it. */
  readonly node: string;

  /** Which model answered it, or null. */
  readonly model: string | null;

  /** How long the prompt was, or null when unmeasured. */
  readonly promptChars: number | null;

  /** The estimate over that length, or null on the same terms. */
  readonly estTokens: number | null;

  /** When it was made, as JSON carries it. */
  readonly calledAt: string;
}

/** One pass and the head of its ledger, as the WIRE has it. */
interface WireDetail {
  /** The row itself. */
  readonly run: WireRun;

  /** Its newest calls, at most {@link RUN_LEDGER_CAP} of them. */
  readonly ledger: readonly WireCall[];

  /** How many it ledgered altogether. */
  readonly llmCallCount: number;

  /** Whether the cap took anything. */
  readonly ledgerTruncated: boolean;
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
 * `RunStore` with one `runs` WRITER planted on it.
 *
 * One of the two negative controls for the signature pin below, and
 * the reason that pin is worth having: a method that could open or
 * close a pass would have to TAKE one, and this is what that looks
 * like on a signature. `RunRecord` rather than a narrower shape
 * because `RunFilter` is all-optional — a row without a conflicting
 * member would be assignable to it, and the control would read
 * `true` while pinning nothing. This row's `domainId` is
 * `number | null` where the filter's is an optional `number`, which
 * is what makes it genuinely unassignable.
 */
interface PlantedRunWriterPort extends RunStore {
  insertRun(row: RunRecord): Promise<void>;
}

/**
 * `RunStore` with one `llm_calls` WRITER planted on it.
 *
 * The second control, and it is not the first one under another
 * name: a ledger row would enter through a differently NAMED method
 * and carry a different shape, so a derivation that reported a run
 * writer could still be blind to this one.
 */
interface PlantedCallWriterPort extends RunStore {
  appendRunLedger(row: LlmCallRecord): Promise<void>;
}

/**
 * The members an answered pass carries.
 *
 * Written out because an interface has no runtime form to read keys
 * off, and pinned in BOTH directions: `satisfies` refuses a name
 * the port's row does not declare, and {@link EVERY_KEY_LISTED}
 * refuses a member added to it and not to this list.
 */
const RUN_KEYS = [
  'counts',
  'domainId',
  'errors',
  'finishedAt',
  'id',
  'scheduledBy',
  'startedAt',
  'status',
] as const satisfies readonly (keyof RunRecord)[];

/** The members an answered ledger row carries. */
const LEDGER_KEYS = [
  'calledAt',
  'estTokens',
  'id',
  'model',
  'node',
  'promptChars',
] as const satisfies readonly (keyof LlmCallRecord)[];

/**
 * The members one pass's answer carries.
 *
 * FOUR AND NOT A ROW WITH A LIST ON IT, which is the whole of what
 * the two counters are for: a ledger of exactly {@link
 * RUN_LEDGER_CAP} rows and one cut to it are indistinguishable
 * without them.
 */
const DETAIL_KEYS = [
  'ledger',
  'ledgerTruncated',
  'llmCallCount',
  'run',
] as const satisfies readonly (keyof RunDetail)[];

/**
 * The members every body this router answers a resource in has.
 *
 * This router writes BOTH success envelopes — the paged one for the
 * collection and the bare one for a single pass — so the pair below
 * is what makes `meta` legible as the difference `okPage` adds
 * rather than as one of three keys somebody listed. The shapes case
 * holds the two against each other, which is that function's stated
 * contract read from the outside.
 */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/** The same members, plus the one a windowed read adds to them. */
const PAGE_KEYS = [
  ...RESOURCE_KEYS,
  'meta',
] as const satisfies readonly (keyof PaginatedEnvelope<unknown>)[];

/** The members `meta` describes the window and collection with. */
const META_KEYS = [
  'page',
  'perPage',
  'total',
  'totalPages',
] as const satisfies readonly (keyof PaginationMeta)[];

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
 * FIVE OF THE PORT'S SIX PLUS THE DOMAIN LOOKUP, and the one left
 * out is the split between this router and `./spend-routes.ts`:
 * `summariseSpend` buckets the ledger where these page it, and
 * neither router can reach the other's half by a later edit because
 * neither store type has a member for it. The shapes case asserts
 * that arithmetic rather than this comment.
 */
const SERVICE_METHODS = [
  'countRunLedger',
  'countRuns',
  'findDomainBySlug',
  'findRunById',
  'listRunLedger',
  'listRuns',
] as const satisfies readonly (keyof RunsServiceStore)[];

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
  CoversEveryKey<RunRecord, typeof RUN_KEYS>
  & CoversEveryKey<WireRun, typeof RUN_KEYS>
  & CoversEveryKey<LlmCallRecord, typeof LEDGER_KEYS>
  & CoversEveryKey<WireCall, typeof LEDGER_KEYS>
  & CoversEveryKey<RunDetail, typeof DETAIL_KEYS>
  & CoversEveryKey<WireDetail, typeof DETAIL_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<RunStore, typeof PORT_METHODS>
  & CoversEveryKey<RunsServiceStore, typeof SERVICE_METHODS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to either answered row, to the detail, to the
 * envelope, to `meta`, to the port or to the `Pick` the router is
 * handed, and to none of the lists above, turns
 * {@link EveryKeyListed} into a `never` — `false` for the list that
 * missed it, intersected with the `true` the others still answer —
 * and this initializer is then a TS2322 at this line, before any
 * case can compare an answer against a set that has quietly stopped
 * describing it. Read in a case below, so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link RUN_KEYS}, sorted at use rather than by hand. */
const RUN_KEY_SET: readonly string[] = [...RUN_KEYS].sort();

/** {@link LEDGER_KEYS}, sorted. */
const LEDGER_KEY_SET: readonly string[] = [...LEDGER_KEYS].sort();

/** {@link DETAIL_KEYS}, sorted. */
const DETAIL_KEY_SET: readonly string[] = [...DETAIL_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

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
 * lists distributes, the answer is `boolean`, and all three
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
 * nothing else, so not one of them can be given a row to store. A
 * writer added to the port is a TS2322 at this line rather than a
 * method the runtime classification would have had to notice on its
 * own.
 */
const RUN_READS_TAKE_NO_ROW: ReadsOnly<Parameters<
  RunStore[Extract<keyof RunStore, RunNamed>]
>> = true;

/** The same over {@link PlantedRunWriterPort}, which is false. */
const A_PLANTED_RUN_WRITER_IS_REPORTED: ReadsOnly<Parameters<
  PlantedRunWriterPort[Extract<keyof PlantedRunWriterPort, RunNamed>]
>> = false;

/** And over {@link PlantedCallWriterPort}, which is false too. */
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
 * @param body - A page as the wire carried it.
 * @returns The rows' ids, IN THE ORDER THEY ARRIVED, since what
 *   this file claims about the order is that it survived the
 *   handler unchanged.
 */
function idsOf(body: { data: readonly WireRun[] }): number[] {
  return body.data.map((row) => row.id);
}

/**
 * The row a page carries at one id.
 *
 * THROWS rather than answering undefined, because what it returns
 * is compared as a whole record: an absent row would otherwise
 * reach `toStrictEqual` as `undefined` and pass against any other
 * absent one, which is a green nobody wrote.
 *
 * @param rows - The page's rows.
 * @param id - The run id to find.
 * @returns That row.
 * @throws Error - When the page carries no row at that id.
 */
function rowFor(rows: readonly WireRun[], id: number): WireRun {
  const found = rows.find((row) => row.id === id);

  if (found === undefined) {
    throw new Error(`no answered row carries the id ${id}`);
  }

  return found;
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
 * The path one pass is read under.
 *
 * @param id - The run id, or whatever a case is sending in its
 *   place.
 * @returns The wire path, root-absolute as the router declares it.
 *   Derived from {@link RUN_TEMPLATE} rather than spelled again,
 *   and the shapes case asserts no `:` survives the substitution —
 *   an unreplaced parameter still reaches the router as a literal
 *   segment and still answers a plausible refusal.
 */
function runPath(id: number): string {
  return RUN_TEMPLATE.replace(':id', String(id));
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
 * Builds one row for `MemoryResearchStore.setLlmCalls`.
 *
 * @param call - The fixture's own spelling of a call.
 * @returns The row to plant, with its stamp parsed.
 */
function ledgered(call: PlantedCall): MemoryLlmCall {
  return {
    id: call.id,
    runId: call.runId,
    node: call.node,
    model: call.model,
    promptChars: call.promptChars,
    estTokens: call.estTokens,
    calledAt: new Date(call.calledAt),
  };
}

/**
 * Builds an app carrying one freshly built runs router.
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
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on either route reads the
 * present, a pass's stamps being what the dispatcher wrote.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildRunsApp(store: RunsServiceStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildRunsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/** The two domains, the five passes across them, and the store. */
interface PlantedRuns {
  /** The store, holding both domains and everything planted. */
  readonly store: MemoryResearchStore;

  /** The id {@link RADAR} resolved to, which the rows carry. */
  readonly radarId: number;

  /** The id {@link SIBLING} resolved to. */
  readonly siblingId: number;
}

/**
 * Two domains, the five passes between them and every planted call.
 *
 * The smallest fixture every case here can be reached from, and the
 * second domain earns its place: it has run something, so every
 * narrowed page below is a scoping reading as well as whatever else
 * it says.
 *
 * BOTH SEAMS ARE FLAT AND BOTH REBUILD, which is why the long
 * ledger is planted here rather than by the one case that reads it:
 * `setLlmCalls` replaces the collection, so a case planting it
 * afterwards would have to re-plant the four short-ledger calls
 * beside it or silently drop them.
 *
 * @returns The store and the two domain ids, so a case can compare
 *   an answered `domainId` against the id its slug resolved to.
 */
async function plantRuns(): Promise<PlantedRuns> {
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

  store.setRuns(PLANTED_PASSES.map((pass) => ({
    id: pass.id,
    domainId: owners[pass.owner],
    startedAt: new Date(pass.startedAt),
    finishedAt: pass.finishedAt === null
      ? null
      : new Date(pass.finishedAt),
    status: pass.status,
    counts: pass.counts,
    errors: pass.errors,
    scheduledBy: pass.scheduledBy,
  })));
  store.setLlmCalls([
    ...PLANTED_CALLS.map(ledgered),
    ...LONG_LEDGER,
  ]);

  return { store, radarId: domain.id, siblingId: sibling.id };
}

/**
 * The same fixture with an app in front of it.
 *
 * @returns The app every request-sending case below drives, beside
 *   the store it stands on and the two domain ids.
 */
async function withRuns(): Promise<PlantedRuns & {
  readonly app: Application;
}> {
  const planted = await plantRuns();

  return { ...planted, app: buildRunsApp(planted.store) };
}

/**
 * The whole body a `404` about a run answers with.
 *
 * One constant rather than a literal at the assertion, which is how
 * this file says the message is the service's own sentence arriving
 * unmodified with `code` beside it and nothing else. The id the
 * request named is not in it, which the same case counts rather
 * than assumes.
 */
const NO_SUCH_RUN_BODY = {
  code: 'NOT_FOUND',
  message: 'No run carries that id',
};

/**
 * The whole body a query parameter this endpoint does not declare
 * answers with.
 *
 * IT NAMES `query` AND NOT THE KEY, which is the difference between
 * the container refusal and the value one: an enum or a format
 * refusing a VALUE names the parameter the caller typed, and this
 * one cannot, the key being the thing that is wrong. That is also
 * what keeps the sentinel out of the answer without anything
 * masking it.
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
  it('plants passes a page must reorder to answer', async () => {
    const { app } = await withRuns();

    // The answered order is neither the order the rows were planted
    // in nor its reverse, and it is not the order their ids give
    // either — so a store answering rows in insertion order, one
    // answering them backwards and a handler re-sorting a page it
    // was handed by the one numeric column a reader would reach for
    // each produce a different list from the one right answer.
    expect(START_ORDER).not.toStrictEqual(PLANT_ORDER);
    expect(START_ORDER).not.toStrictEqual([...PLANT_ORDER].reverse());
    expect(START_ORDER)
      .not.toStrictEqual([...START_ORDER].sort((a, b) => b - a));
    expect([...START_ORDER].sort()).toStrictEqual([...PLANT_ORDER].sort());
    // The three owners partition the collection, so the narrowing
    // case's arithmetic is over rosters the plant defines rather
    // than over numbers a case chose. All three are non-empty,
    // which is what gives each narrowed page something to leave
    // out and the tick something to be left out OF.
    expect(RADAR_RUN_IDS.length).toBeGreaterThan(0);
    expect(SIBLING_RUN_IDS.length).toBeGreaterThan(0);
    expect(TICK_RUN_IDS.length).toBeGreaterThan(0);
    expect(RADAR_RUN_IDS.length + SIBLING_RUN_IDS.length
      + TICK_RUN_IDS.length).toBe(PLANTED_COUNT);
    // The cap is BRACKETED by the plant rather than approached from
    // one side: one ledger runs past it and one falls short, which
    // is what makes `ledgerTruncated` readable in both of its
    // states and a comparison written `>=` reportable at all.
    expect(LONG_LEDGER_COUNT).toBeGreaterThan(RUN_LEDGER_CAP);
    expect(BUSY_CALL_IDS.length).toBeLessThan(RUN_LEDGER_CAP);
    expect(BUSY_CALL_IDS.length).toBeGreaterThan(0);
    expect(LONG_KEPT_IDS).toHaveLength(RUN_LEDGER_CAP);
    expect(LONG_DROPPED_IDS).toHaveLength(LEDGER_OVERSHOOT);
    // No planted pass carries the id the `404` case names, which no
    // assertion in that case could say for itself: an id that had
    // collided with a planted pass would answer `200` and read as a
    // refusal that stopped happening.
    expect(PLANT_ORDER).not.toContain(MISSING_RUN_ID);
    // And the parameter the refusal case submits is undeclared,
    // read off the schema rather than trusted: a parameter ADDED to
    // it makes that request legal and reddens here instead of
    // leaving a case asserting a refusal that no longer happens.
    expect(Object.keys(runListQuerySchema.shape))
      .not.toContain(UNDECLARED_PARAM);
    expect(Object.keys(runListQuerySchema.shape)).toContain('domain');
    // And the rows really are there, which the counts above cannot
    // say: a fixture whose plant seams had stopped planting would
    // satisfy every premise in this case.
    const page = await request(app).get(RUNS_PATH);
    const long = await request(app).get(runPath(RUN_LONG));

    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(PLANTED_COUNT);
    expect(long.status).toBe(200);
    expect(long.body.data.llmCallCount).toBe(LONG_LEDGER_COUNT);
  });
});

// ---------------------------------------------------------------------------
// The shapes every answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // either answered row, to the detail, to the envelope, to
    // `meta`, to the port or to the `Pick` the router is handed and
    // to none of the lists is a TS2322 at that declaration, before
    // any assertion below can compare an answer against a set that
    // has quietly stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`, which
    // is `okPage`'s stated contract and the one difference between
    // the two success shapes this router writes — and it writes
    // both, the single get answering the bare one.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // The router's own store surface is the port MINUS the
    // aggregate plus the domain lookup, which is the split
    // `src/runs/spend-routes.ts` is on the other side of: the
    // summary is unreachable from this router because its store
    // type has no member for it.
    expect(SERVICE_METHOD_SET).toStrictEqual(
      [...PORT_METHODS.filter((method) => method !== 'summariseSpend'),
        'findDomainBySlug'].sort(),
    );
    expect(SERVICE_METHOD_SET).not.toContain('summariseSpend');
    // And the derived path is a real substitution rather than a
    // template that reached Express as one: an unreplaced parameter
    // is still a literal segment and still answers a plausible
    // refusal.
    expect(RUN_TEMPLATE).toContain(':id');
    expect(runPath(RUN_BUSY)).not.toContain(':');
    expect(runPath(MISSING_RUN_ID)).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// The page: the envelope, the window it echoes and the rows in it
// ---------------------------------------------------------------------------

describe('a runs page that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, radarId } = await withRuns();

    const whole = await request(app).get(RUNS_PATH);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same five
    // rows. A handler ignoring the window answers all five to every
    // call, and a `total` taken from the rows in hand answers 1 to
    // each of the narrow pair.
    const first = await request(app)
      .get(RUNS_PATH)
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get(RUNS_PATH)
      .query({ page: PLANTED_COUNT, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    // THREE members and not two: this read applies a window, so it
    // carries the `meta` describing one, which is the difference
    // between the envelope `okPage` writes and the one `ok` does.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    // `meta` WHOLE, including the window nobody asked for: a
    // default is still a window a caller is told about, and the
    // number reaching the wire is the claim rather than the number
    // having been a default.
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_COUNT,
      totalPages: 1,
    });
    // The order reaches the wire as the port answered it, which is
    // the only half of the ordering this file owns: nothing in the
    // handler re-sorts a page it was handed, and a handler that did
    // would be answering a different order from the one the window
    // was taken under.
    expect(idsOf(whole.body)).toStrictEqual(START_ORDER);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data as WireRun[]) {
      expect(keysOf(row)).toStrictEqual(RUN_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering every
    // read the same wrong row would satisfy any cross-response
    // compare. Both stamps are asserted as their ISO spellings
    // because that conversion is the framework's own and they are
    // the two members whose type changes crossing `res.json`, and
    // both jsonb columns are asserted whole — this row is the one
    // carrying counts, so neither is compared as an empty object.
    expect(rowFor(whole.body.data as WireRun[], RUN_BUSY))
      .toStrictEqual({
        id: RUN_BUSY,
        domainId: radarId,
        startedAt: new Date(FOURTH_START).toISOString(),
        finishedAt: new Date(BUSY_FINISH).toISOString(),
        status: 'ok',
        counts: { captured: 4, scored: 2 },
        errors: [],
        scheduledBy: 'agent',
      });
    // The two narrow windows are disjoint, each holds the row the
    // ordering puts at that position, and each names the total of
    // the COLLECTION, which no page could have counted from its own
    // rows.
    expect(idsOf(first.body)).toStrictEqual(START_ORDER.slice(0, 1));
    expect(idsOf(last.body)).toStrictEqual(START_ORDER.slice(-1));
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_COUNT,
      totalPages: PLANTED_COUNT,
    });
    expect(last.body.meta).toStrictEqual({
      page: PLANTED_COUNT,
      perPage: 1,
      total: PLANTED_COUNT,
      totalPages: PLANTED_COUNT,
    });
  });
});

// ---------------------------------------------------------------------------
// The narrowing: what a ?domain selects, and what it leaves out
// ---------------------------------------------------------------------------

describe('a page narrowed to one domain', () => {
  it('holds that domain alone and widens without it', async () => {
    const { app, radarId, siblingId } = await withRuns();

    const narrowed = await request(app)
      .get(RUNS_PATH)
      .query({ domain: RADAR });
    // The controls, varied along the axis under test and through
    // the SAME operation: the other domain's passes, and the page
    // with no parameter at all. A handler that had stopped handing
    // the slug on answers five rows to all three.
    const elsewhere = await request(app)
      .get(RUNS_PATH)
      .query({ domain: SIBLING });
    const widened = await request(app).get(RUNS_PATH);

    expect(narrowed.status).toBe(200);
    expect(elsewhere.status).toBe(200);
    expect(widened.status).toBe(200);
    // Read off the ROWS rather than off a total, and as a
    // membership rather than as an order, which is the page case's
    // subject one section up.
    expect(idsOf(narrowed.body).sort()).toStrictEqual([...RADAR_RUN_IDS]);
    expect(idsOf(elsewhere.body).sort())
      .toStrictEqual([...SIBLING_RUN_IDS]);
    // Each answered row carries the id the slug resolved to, which
    // is what says the narrowing selected on the domain rather than
    // on anything that happens to correlate with it here.
    for (const row of narrowed.body.data as WireRun[]) {
      expect(row.domainId).toBe(radarId);
    }
    for (const row of elsewhere.body.data as WireRun[]) {
      expect(row.domainId).toBe(siblingId);
    }
    // `meta.total` counts what the same FILTER selects rather than
    // what the deployment holds, which is the one number a page
    // narrowed to a domain would otherwise report about everybody.
    expect(narrowed.body.meta.total).toBe(RADAR_RUN_IDS.length);
    expect(elsewhere.body.meta.total).toBe(SIBLING_RUN_IDS.length);
    // The unnarrowed page holds the maintenance tick, whose
    // `domainId` is null — so widening is every pass INCLUDING the
    // ones belonging to nobody rather than every pass some domain
    // made, and the tick is asserted whole because it is the row
    // carrying errors and the only one whose domain is absent.
    expect(idsOf(widened.body).sort())
      .toStrictEqual([...PLANT_ORDER].sort());
    expect(rowFor(widened.body.data as WireRun[], RUN_TICK))
      .toStrictEqual({
        id: RUN_TICK,
        domainId: null,
        startedAt: new Date(FIFTH_START).toISOString(),
        finishedAt: null,
        status: 'partial',
        counts: {},
        errors: [{ node: 'maintenance', reason: 'a source timed out' }],
        scheduledBy: 'operator',
      });
    // And neither narrowed page holds it, which is the half a
    // membership over the narrowed rows alone does not state: the
    // tick is excluded from BOTH domains rather than from one.
    expect(idsOf(narrowed.body)).not.toContain(RUN_TICK);
    expect(idsOf(elsewhere.body)).not.toContain(RUN_TICK);
    // THE PARTITION, which no single narrowed page can report: a
    // filter that had stopped being applied answers every narrowed
    // page plausibly and only the sum catches it. The two totals
    // fall SHORT of the unnarrowed one by exactly the passes
    // belonging to nobody, which is the positive form of this
    // wave's decision that no spelling of `?domain` asks for those
    // alone.
    expect(narrowed.body.meta.total + elsewhere.body.meta.total)
      .toBeLessThan(widened.body.meta.total);
    expect(narrowed.body.meta.total + elsewhere.body.meta.total
      + TICK_RUN_IDS.length).toBe(widened.body.meta.total);
  });
});

// ---------------------------------------------------------------------------
// One pass: what it answers beside its own row
// ---------------------------------------------------------------------------

describe('one pass and the head of what it spent', () => {
  it('answers 200 with the run, its ledger and both counters', async () => {
    const { app, radarId } = await withRuns();

    const busy = await request(app).get(runPath(RUN_BUSY));
    // The control, varied along the axis under test and through the
    // SAME operation: a pass that called nothing. A handler
    // answering one stored ledger to every id satisfies every
    // assertion below and fails this one.
    const quiet = await request(app).get(runPath(RUN_QUIET));

    expect(busy.status).toBe(200);
    // TWO members and not three: this read applies no window, so
    // there is no `meta` for a router to build — the ledger inside
    // is cut rather than paged, and the two counters below are what
    // stands in for one.
    expect(keysOf(busy.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(busy.body.success).toBe(true);
    const detail = busy.body.data as WireDetail;

    expect(keysOf(detail)).toStrictEqual(DETAIL_KEY_SET);
    expect(keysOf(detail.run)).toStrictEqual(RUN_KEY_SET);
    // The row is the one the lookup read, answered whole and not
    // re-read: it is the same record the page answers for this
    // pass, which is what says one shape serves both routes.
    expect(detail.run).toStrictEqual({
      id: RUN_BUSY,
      domainId: radarId,
      startedAt: new Date(FOURTH_START).toISOString(),
      finishedAt: new Date(BUSY_FINISH).toISOString(),
      status: 'ok',
      counts: { captured: 4, scored: 2 },
      errors: [],
      scheduledBy: 'agent',
    });
    // The ledger is SCOPED to this pass and ordered newest first,
    // which the fixture makes a reading rather than a coincidence:
    // another domain's pass ledgered a call and one call names no
    // pass at all, so a read that had stopped scoping answers rows
    // this assertion does not name.
    expect(detail.ledger.map((call) => call.id))
      .toStrictEqual([...BUSY_CALL_IDS]);
    for (const call of detail.ledger) {
      expect(keysOf(call)).toStrictEqual(LEDGER_KEY_SET);
    }
    // One row WHOLE, and it is the one that measured something: the
    // three nullable members reach the wire carrying values here
    // and carrying null on the call beside it, so neither state is
    // read alone. `calledAt` is asserted as its ISO spelling, that
    // conversion being the framework's own.
    expect(detail.ledger[detail.ledger.length - 1]).toStrictEqual({
      id: BUSY_OLDEST_CALL.id,
      node: BUSY_OLDEST_CALL.node,
      model: BUSY_OLDEST_CALL.model,
      promptChars: BUSY_OLDEST_CALL.promptChars,
      estTokens: BUSY_OLDEST_CALL.estTokens,
      calledAt: new Date(BUSY_OLDEST_CALL.calledAt).toISOString(),
    });
    expect(detail.ledger[0]).toStrictEqual({
      id: BUSY_NEWEST_CALL.id,
      node: BUSY_NEWEST_CALL.node,
      model: null,
      promptChars: null,
      estTokens: null,
      calledAt: new Date(BUSY_NEWEST_CALL.calledAt).toISOString(),
    });
    // BOTH COUNTERS, on a ledger the cap did not reach: the count
    // is the full number and equals the length that came back, and
    // the flag is false. That equality is what makes this case the
    // only place a comparison written `>=` can report — the long
    // ledger one case down answers `true` under either spelling.
    expect(detail.llmCallCount).toBe(BUSY_CALL_IDS.length);
    expect(detail.llmCallCount).toBe(detail.ledger.length);
    expect(detail.ledgerTruncated).toBe(false);
    // A pass that called nothing is a `200` with an empty list
    // rather than a `404`: both ledger reads answer emptily for an
    // id no run carries too, so the empty list is a state the
    // lookup separated from the refusal one section down.
    expect(quiet.status).toBe(200);
    const empty = quiet.body.data as WireDetail;

    expect(empty.run.id).toBe(RUN_QUIET);
    expect(empty.ledger).toStrictEqual([]);
    expect(empty.llmCallCount).toBe(0);
    expect(empty.ledgerTruncated).toBe(false);
  });

  it('cuts a long ledger to the cap and reports the whole', async () => {
    const { app, store } = await withRuns();

    const long = await request(app).get(runPath(RUN_LONG));
    // The control, varied along the axis under test and through the
    // SAME operation: the pass whose ledger falls short of the cap.
    // A handler cutting every ledger to two hundred rows and
    // flagging every one satisfies the assertions above it and
    // fails these.
    const short = await request(app).get(runPath(RUN_BUSY));

    expect(long.status).toBe(200);
    const detail = long.body.data as WireDetail;

    // The cut is exactly the cap, the flag says it happened, and
    // the count is the FULL number rather than the answered one —
    // the two differing by exactly what was withheld, which is the
    // number worth having when deciding whether to go to the
    // database for the rest.
    expect(detail.ledger).toHaveLength(RUN_LEDGER_CAP);
    expect(detail.ledgerTruncated).toBe(true);
    expect(detail.llmCallCount).toBe(LONG_LEDGER_COUNT);
    expect(detail.llmCallCount - detail.ledger.length)
      .toBe(LEDGER_OVERSHOOT);
    // The end the cut took is the OLDEST one, which a length alone
    // cannot say: the kept ids are the newest in the order they
    // arrived, and the dropped ones are absent.
    expect(detail.ledger.map((call) => call.id))
      .toStrictEqual([...LONG_KEPT_IDS]);
    for (const dropped of LONG_DROPPED_IDS) {
      expect(detail.ledger.map((call) => call.id)).not.toContain(dropped);
    }
    // The dropped rows were CUT rather than never stored, read off
    // the port in the same case: without this the assertions above
    // are satisfied by a fixture that planted two hundred calls.
    const stored = await store.countRunLedger(RUN_LONG);

    expect(stored).toBe(LONG_LEDGER_COUNT);
    // And the pass under the cap answers its ledger whole, so the
    // flag is read in both of its states rather than asserted in
    // one.
    expect(short.status).toBe(200);
    const under = short.body.data as WireDetail;

    expect(under.ledger).toHaveLength(BUSY_CALL_IDS.length);
    expect(under.ledgerTruncated).toBe(false);
    expect(under.llmCallCount).toBe(BUSY_CALL_IDS.length);
  });
});

// ---------------------------------------------------------------------------
// The address: an id naming no pass
// ---------------------------------------------------------------------------

describe('an id naming no run', () => {
  it('refuses the address without quoting it back', async () => {
    const { app } = await withRuns();

    const missing = await request(app).get(runPath(MISSING_RUN_ID));
    // The control, through the SAME operation: the identical
    // request over an id that resolves. A router refusing every
    // address passes every assertion above and fails this one.
    const found = await request(app).get(runPath(RUN_QUIET));

    expect(missing.status).toBe(404);
    // A 404 and not an empty detail, which is the whole
    // distinction: both ledger reads answer emptily for an id no
    // run carries, so a handler that had skipped the lookup would
    // answer a mistyped id with a run-shaped body carrying nothing.
    // The body is asserted whole, so the sentence is the service's
    // own arriving unmodified with `code` beside it and nothing
    // else at all.
    expect(missing.body).toStrictEqual(NO_SUCH_RUN_BODY);
    expect(keysOf(missing.body)).not.toContain('data');
    expect(keysOf(missing.body)).not.toContain('meta');
    // The id is not quoted back, counted rather than asserted
    // absent and held against a known positive taken by the same
    // function in the same case — the request path, where the
    // digits a caller typed do occur exactly once.
    const submitted = String(MISSING_RUN_ID);

    expect(countOccurrences(missing.text, submitted)).toBe(0);
    expect(countOccurrences(runPath(MISSING_RUN_ID), submitted)).toBe(1);
    // And the refusal came from the LOOKUP rather than from the
    // address parse: this segment satisfies `resourceIdParamSchema`
    // and a boundary that had refused it would answer `422` naming
    // `id`, which the whole-body comparison above rules out.
    expect(found.status).toBe(200);
    expect((found.body.data as WireDetail).run.id).toBe(RUN_QUIET);
  });
});

// ---------------------------------------------------------------------------
// The query: a parameter this surface does not declare
// ---------------------------------------------------------------------------

describe('a query parameter this router does not declare', () => {
  it('refuses it on the page and ignores it on one pass', async () => {
    const { app } = await withRuns();

    const undeclared = await request(app)
      .get(RUNS_PATH)
      .query({ page: 1, [UNDECLARED_PARAM]: UNDECLARED_VALUE });
    // The control is the identical request with that parameter
    // removed, so the pair says the refusal is about the key rather
    // than about a route refusing every query it is handed — and
    // `?page=1` is legal on its own, which is what makes the
    // difference between the two requests the one member.
    const declared = await request(app)
      .get(RUNS_PATH)
      .query({ page: 1 });
    // THE SAME PARAMETER ON THE SINGLE GET, which is this router's
    // one departure and is measured rather than predicted:
    // `/runs/:id` parses no query at all, so nothing on it can
    // refuse one and the request is answered as though it carried
    // none. A reader taking the page's rule for the router's would
    // predict a `422` here.
    const ignored = await request(app)
      .get(runPath(RUN_BUSY))
      .query({ [UNDECLARED_PARAM]: UNDECLARED_VALUE, perPage: 500 });

    expect(undeclared.status).toBe(422);
    // The whole body rather than the status, which is where the
    // refusal says WHICH rule it was: `unrecognized_keys` naming
    // the CONTAINER rather than the key, where a format or an enum
    // refusing a value names the parameter the caller typed. That
    // is also what keeps the sentinel out of the answer with
    // nothing masking it.
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    // Neither the key nor its value is quoted back, counted against
    // known positives taken by the same function in the same case —
    // the query string a caller could read either off is the one it
    // sent.
    const sent = `?${UNDECLARED_PARAM}=${UNDECLARED_VALUE}`;

    expect(countOccurrences(undeclared.text, UNDECLARED_PARAM)).toBe(0);
    expect(countOccurrences(undeclared.text, UNDECLARED_VALUE)).toBe(0);
    expect(countOccurrences(sent, UNDECLARED_PARAM)).toBe(1);
    expect(countOccurrences(sent, UNDECLARED_VALUE)).toBe(1);
    // The declared member LANDS, which is what says the strictness
    // is about the key rather than about the query.
    expect(declared.status).toBe(200);
    expect(declared.body.data).toHaveLength(PLANTED_COUNT);
    // And the single get answers the pass, an over-cap `?perPage`
    // riding along beside the undeclared key without either being
    // read: there is no window over the embedded ledger for a
    // caller to move, and no schema on that route to refuse one.
    expect(ignored.status).toBe(200);
    expect((ignored.body.data as WireDetail).run.id).toBe(RUN_BUSY);
    expect((ignored.body.data as WireDetail).ledger)
      .toHaveLength(BUSY_CALL_IDS.length);
  });
});

// ---------------------------------------------------------------------------
// The structure: two gets, and a port that cannot write a pass
// ---------------------------------------------------------------------------

describe('what this router structurally cannot do', () => {
  it('registers one get on each of two paths', async () => {
    // Built here rather than reached through {@link withRuns},
    // because what this reads is the router's own DECLARATION: a
    // factory registers its routes at construction and reads
    // nothing, so no fixture is involved in the answer.
    const { store } = await plantRuns();
    const registered = routesOf(buildRunsRouter({ store }));

    // The whole inventory in one comparison, derived from the stack
    // rather than transcribed: a third path, a second verb on
    // either of these, or a `post` in place of a `get` are each a
    // different value here. An empty stack is too, which is what
    // keeps this from being a search that could only answer
    // nothing.
    expect(registered).toStrictEqual([
      { path: RUNS_PATH, verbs: ['get'] },
      { path: RUN_TEMPLATE, verbs: ['get'] },
    ]);
    // The verb SET across the whole router, read separately, so a
    // failure says whether a path or a verb moved.
    expect(registered.flatMap((route) => route.verbs))
      .toStrictEqual(['get', 'get']);
    expect(registered).toHaveLength(2);
  });

  it('names no port method that writes a pass or a call', () => {
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
    // the other half of what the empty writer list is made of: a
    // method naming one of those subjects and starting with none of
    // the four is exactly what `runWritersIn` reports.
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
    // which is where a writer would have to appear to be reachable
    // from a handler at all: the domain lookup names no pass and
    // the five that do are the port's own reads.
    expect(runWritersIn(SERVICE_METHOD_SET)).toStrictEqual([]);
    expect(SERVICE_METHOD_SET.filter(namesARun))
      .toStrictEqual(RUN_READERS.filter(
        (method) => method !== 'summariseSpend',
      ));
    // The signature half, which `check-types` owns and which no
    // name can report: every one of those methods is handed an id,
    // a limit, a narrowing and a window, so none can be given a row
    // to store. Its two negative controls sit beside it — the same
    // derivation over a port carrying a planted `runs` writer and
    // over one carrying a planted `llm_calls` writer each answer
    // `false`, which is what says the derivation discriminates
    // rather than answering `true` for everything.
    expect(RUN_READS_TAKE_NO_ROW).toBe(true);
    expect(A_PLANTED_RUN_WRITER_IS_REPORTED).toBe(false);
    expect(A_PLANTED_CALL_WRITER_IS_REPORTED).toBe(false);
  });
});
