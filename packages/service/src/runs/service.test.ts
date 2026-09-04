/**
 * `src/runs/service.ts` — what the two runs reads REFUSE, and what
 * each refusal is careful not to say. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * FIVE SECTIONS AND FOURTEEN CASES. Four sections are the refusals
 * this surface can raise and their controls: a `?domain` slug no
 * domain carries, an id no run carries, a `perPage` above the cap
 * `src/http/schemas.ts` declares, and a `?domain` that could not be
 * a slug at all. The fifth is what those refusals carry, read per
 * channel.
 *
 * TWO OF THE FOUR ARE THIS MODULE'S OWN AND TWO ARE THE SCHEMA'S,
 * and saying which is half of what this file is for. `listRuns` and
 * `getRun` raise one 404 each; the over-cap window and the unshaped
 * `?domain` are {@link runListQuerySchema} refusing a query that
 * never reached a function. So those rows are submitted to
 * `parseQuery` — the call a router makes — and what is pinned is
 * that no window and no narrowing can be BUILT from a query outside
 * the rules, rather than that something downstream would have caught
 * it.
 *
 * NOTHING HERE READS EITHER ORDER, and every reading over more than
 * one row sorts by id first. `started_at DESC, id DESC` and
 * `called_at DESC, id DESC` are `RunStore`'s promises and
 * `tests/helpers/memory-research-store.test.ts` is where they are
 * held, so a case about a refusal cannot fail for an ordering reason
 * and an ordering that broke is reported in one place rather than in
 * two files disagreeing about which.
 *
 * WHAT A PAGE AND A DETAIL CARRY IS THE NEXT HALF'S SUBJECT, and
 * this one deliberately stops short of it. The domain-less tick
 * standing in an unfiltered page, a ledger longer than
 * `RUN_LEDGER_CAP` answering its newest rows, and `llmCallCount`
 * reporting the full number beside a cut list are positive readings;
 * every assertion below is a refusal, a control varied along that
 * refusal's own axis, or a count. The honest consequence is that no
 * leg aimed at the cap, the truncation flag or either order can
 * report in this revision, and the grid below records those zeros
 * rather than leaving them to be read as coverage.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A function refusing everything and a schema
 * refusing every query each pass a refusal case written on its own,
 * so the control has to sit in the same case and has to differ from
 * the refused input in exactly the thing under test: the same window
 * under a slug that resolves; the same call under an id that
 * resolves; the same parse with the `perPage` moved one step back
 * onto the cap; the same parse with the `?domain` respelt into a
 * shape a slug can have.
 *
 * THE CAP IS BRACKETED RATHER THAN ASSERTED, and the pair is read
 * through BOTH schemas in one case. {@link runListQuerySchema}
 * extends `paginationQuerySchema` rather than restating its rules,
 * so a ceiling of its own would be a second cap agreeing today; a
 * value at the cap accepted and the next one refused, answered
 * identically by the base schema and by the composed one, is what
 * says there is one ceiling and this file did not bring a second.
 * {@link SHARED_CAP} is transcribed rather than imported, on
 * `src/http/schemas.test.ts`'s terms: the constant is private to
 * that module, and a change to it should redden a case rather than
 * agree silently.
 *
 * THE FIXTURE IS BUILT TO DISCRIMINATE RATHER THAN MERELY TO EXIST.
 * Two domains hold passes, so every page read here is a scoping
 * reading as well and a store that had stopped taking the filter
 * answers four rows where two are asserted. A DOMAIN-LESS TICK is
 * planted from the first case rather than added by the half that
 * reads it, because a scope arriving later moves every count in the
 * file. One of the two passes named by {@link RADAR} ledgers two
 * calls and the other ledgers none, so a case about a run that
 * resolves is not also a case about a run that spent something. And
 * one call is attributed to NO run at all — the row a run-keyed seam
 * could not hold — so the ledger reads here are taken over a table
 * that carries the state they cannot reach.
 *
 * THAT A SLUG NAMING NO DOMAIN IS A 404 RATHER THAN AN EMPTY PAGE.
 * That distinction is the whole reason `listRuns` reads the domain
 * at all: `RunStore` answers an empty page and a count of `0` for an
 * id no domain carries, both correctly, so a function that skipped
 * the lookup would answer a mistyped slug exactly as it answers a
 * domain nothing has ever dispatched for. Two readings make the
 * claim rather than one. The run reads are never ISSUED, counted off
 * a store that tallies all five methods, with the same tally taken
 * over a slug that resolves in the same case — a lookup moved below
 * the reads passes the status assertion and fails this one. And
 * passes really PLANTED under a domain id no row carries are still
 * refused, which is the reading that says the 404 comes from the
 * lookup rather than from there being nothing to answer.
 *
 * THAT AN ABSENT `?domain` COSTS `domains` NO READ AT ALL, which is
 * the third tally in that same case and the only one that can report
 * it. Widening is the default answer, and a resolver that looked the
 * absent slug up anyway would answer every one of these requests
 * identically while asking `domains` a question nobody posed.
 *
 * THAT AN ID NAMING NO RUN IS A 404 RATHER THAN AN EMPTY DETAIL, on
 * the same two readings one route over. Both ledger reads answer
 * emptily for an id no run carries — `RunStore.countRunLedger` says
 * so from its own side — so the lookup is what separates a pass that
 * called nothing from a pass that is not there, and calls really
 * planted under an unused id are still refused.
 *
 * THAT NO REFUSAL QUOTES ANYTHING, READ PER CHANNEL. An `AppError`
 * can carry a submitted value out through three of them — the
 * message, the details and the CAUSE — and a count taken over the
 * three joined together cannot say which one leaked.
 * {@link leaksIn} renders them separately, and the zeros are read
 * against a planted refusal that leaks through all three, counted by
 * the same helper in the same case: a renderer that ignored `cause`
 * fails on the third member alone. The needles are the values a
 * caller submitted — the slug, the id, the over-cap number and the
 * unshaped domain — and one STORED value rides along beside each of
 * the first two, planted under the very id the refusal resolved
 * nothing for, because a refusal composed from a row it had just
 * read would be the leak this rule exists to close.
 *
 * EVERY ID A CASE SUBMITS IS SEVEN DIGITS, which is a containment
 * rule rather than a fixture accident: the cause channel renders a
 * STACK, a stack carries line and column numbers, and a three-digit
 * id matches one of those by coincidence often enough to read as a
 * leak.
 *
 * Mutation grid, run WHOLE over this file TWICE with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. The two runs agreed member for member on all SEVENTEEN
 * legs, which is what separates a measurement from a bad capture.
 * Fourteen mutate `./service.ts` and three mutate
 * `tests/helpers/memory-research-store.ts`. There is no HEAD-vs-tip
 * diff beside them: the file is new, so every figure below is its
 * first.
 *
 * THE TWO 404 BRANCHES ARE THE LARGEST LEGS AND THEIR SETS ARE
 * DISJOINT. Comparing the resolved domain against `undefined` so
 * that branch never fires reddens 5 — the three cases of the first
 * section that refuse, the tail of the shape section, which drives
 * a slug that parses and resolves to nothing, and the containment
 * case that goes through it. Comparing the resolved run the same
 * way reddens 4, the whole of the second section plus its own
 * containment case. That the two sets share no member is what says
 * the two refusals are separately covered rather than one of them
 * standing in for both.
 *
 * THE THREE ORDERING LEGS REDDEN ONE CASE EACH, and each of those
 * cases is a tally no assertion on a status could replace. Issuing
 * the run reads above the lookup reddens 1; issuing the ledger
 * reads above it reddens 1; and looking the domain up even when no
 * `?domain` was sent reddens 1, the widening tally, which is the
 * only reading in the file that can report it.
 *
 * COMPOSING A SUBMITTED VALUE INTO A MESSAGE REDDENS ONE CASE PER
 * REFUSAL. The slug rendered into the missing-domain sentence
 * reddens 1 and the id rendered into the missing-run one reddens 1,
 * each on its own containment case — which is what says the
 * per-channel counts are reading the refusal they name.
 *
 * THE CEILING LEG NEEDS A CEILING THAT DIFFERS, which is the one
 * place a leg's spelling changes its answer. A `perPage`
 * re-declared on the composed schema with the SAME bounds reddens
 * ZERO, agreeing with the shared one in every request; the same
 * declaration with the ceiling RAISED reddens 3 — the bracketing
 * case, the boundary case, and the containment case whose refusal
 * stops being raised. That zero is the state the bracketing case
 * exists to catch the day either number moves, and a grid run with
 * the agreeing spelling alone would record the case as dead.
 *
 * THE TWO LOOSENING LEGS REDDEN WHAT THEY CAN REACH. Giving the
 * composed schema a catchall reddens 1, the undeclared-key case
 * alone. Swapping `slugParamSchema` for `z.string()` on `?domain`
 * reddens 2 — the shape refusal and the containment case beside it
 * — and leaves every case that sends a well-shaped slug green,
 * which is the honest limit rather than a gap: a looser type still
 * accepts every value those cases send.
 *
 * THE FOUR FIXTURE LEGS ARE WHAT SAY THE PLANTED ROWS ARE REACHED.
 * Planting nothing reddens 7. Dropping the store's runs predicate
 * reddens 2 and answering `0` for every ledger count reddens 2,
 * each pair being that half's scoping control and its orphan plant.
 * Building the filter with no `domainId` reddens 1, the scoping
 * control alone.
 *
 * THE PLANT-NOTHING SURVIVORS ARE THE COVERAGE STATEMENT RATHER
 * THAN ITS COUNT. Seven of fourteen stay green, and every one is a
 * case that needs no planted row to make its point: the four whose
 * subject is a query the schema refuses or accepts, the two of the
 * first section whose readings are a status and a tally, and the
 * containment case over the two boundary refusals. A survivor that
 * could not be explained that way would be a case asserting
 * something it does not mean.
 *
 * THREE LEGS READ 0 AND ARE RECORDED RATHER THAN WIDENED AWAY, and
 * two of the three belong to the half this revision does not reach.
 * Handing the store a limit of 1 instead of `RUN_LEDGER_CAP`
 * reddens nothing, and pinning `ledgerTruncated` to `false` reddens
 * nothing: no case here reads the length of an embedded ledger or
 * the flag beside it. What closes those two is a pass whose ledger
 * EXCEEDS the cap, which is the next half's fixture and not this
 * one's. The third is the agreeing ceiling above.
 */
import type { RunsServiceStore } from './service.js';
import type { RunFilter, RunRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryLlmCall,
  MemoryResearchStore,
  MemoryRun,
} from '../../tests/helpers/memory-research-store.js';
import type { RunScheduler, RunStatus } from '../db/schema/values.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { paginationQuerySchema } from '../http/schemas.js';
import { parseQuery } from '../http/validation.js';

import { getRun, listRuns, runListQuerySchema } from './service.js';

/** The seeded worked example, and the domain most cases narrow to. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, with a pass of its own.
 *
 * IT HAS RUN SOMETHING, which is what makes every narrowed page read
 * here a scoping reading too: a store that had stopped taking the
 * filter answers four rows where each of those cases asserts two.
 */
const SIBLING = 'example-newsroom';

/**
 * A slug shaped like one and carried by no domain in any case here.
 *
 * SENTINEL-SHAPED ON PURPOSE, so the containment block's count of it
 * in a refusal is a reading of the refusal rather than a coincidence
 * of wording. It still satisfies `slugParamSchema`, because what is
 * under test is a slug that PARSED and resolved to nothing, not a
 * value the boundary would have refused.
 */
const MISSING_SLUG = 'zzsentinelslugzz';

/**
 * A `?domain` that could not be a slug at all.
 *
 * UPPERCASE, which `slugParamSchema` refuses on the opening
 * character. Sentinel-shaped for {@link MISSING_SLUG}'s reason: the
 * containment block counts it in what the boundary refusal carries.
 */
const UNSHAPED_DOMAIN = 'ZZSENTINELSHAPEZZ';

/** A domain id no `domains` row carries, for the plants below. */
const MISSING_DOMAIN_ID = 8880001;

/**
 * A run id no `runs` row carries.
 *
 * SEVEN DIGITS, per this file's header: it is submitted and then
 * counted in a rendered stack, where a shorter number would match a
 * line or column by accident.
 */
const MISSING_RUN_ID = 9114523;

/**
 * A value planted in the `errors` of a pass filed under a domain id
 * no row carries.
 *
 * WHAT A REFUSAL COMPOSED FROM A ROW IT HAD READ WOULD LEAK. `errors`
 * is the one member of a run that carries a writer's own text, so it
 * is where such a leak would come from.
 */
const SENTINEL_ERROR = 'zzsentinelerrorzz';

/**
 * A value planted in the `node` of a call filed under a run id no
 * row carries, on {@link SENTINEL_ERROR}'s reasoning one table down.
 */
const SENTINEL_NODE = 'zzsentinelnodezz';

/**
 * The `perPage` ceiling `src/http/schemas.ts` declares, written down
 * rather than imported.
 *
 * `MAX_PER_PAGE` is private to that module, and
 * `src/http/schemas.test.ts` transcribes it for the same reason this
 * file does: a change to the constant should be a red case somewhere
 * rather than a silent agreement. What THIS file adds is that the
 * pair is read through both schemas, which is what says the composed
 * query inherited the ceiling instead of declaring a second one.
 */
const SHARED_CAP = 200;

/** When the oldest planted pass began. */
const FIRST_START = '2026-03-01T00:00:00.000Z';

/** When the next two did. */
const SECOND_START = '2026-03-02T00:00:00.000Z';

/** When the newest one did. */
const THIRD_START = '2026-03-03T00:00:00.000Z';

/** When every planted call was made. */
const CALLED_AT = '2026-03-03T01:00:00.000Z';

/**
 * A window wider than any page planted here.
 *
 * Wide on purpose: a `limit` narrow enough to be interesting would
 * make each refusal depend on where its rows happened to fall, and
 * what a window SELECTS is the next half's subject rather than this
 * one's.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * The filter that narrows nothing.
 *
 * AN ABSENT MEMBER IS EVERY RUN, per `RunFilter`, so the empty
 * object is the whole table rather than a filter waiting to be
 * filled in.
 */
const EVERY_RUN: RunFilter = {};

/** What the planted orphan pass is reachable through. */
const ORPHAN_FILTER: RunFilter = { domainId: MISSING_DOMAIN_ID };

/** The pass {@link RADAR} made that called nothing. */
const RUN_QUIET = 4110001;

/** The pass {@link RADAR} made that ledgered two calls. */
const RUN_BUSY = 4110002;

/** The pass {@link SIBLING} made. */
const RUN_ELSEWHERE = 4220001;

/** The maintenance tick that belongs to no domain. */
const RUN_TICK = 4330001;

/** A pass filed under a domain id no row carries. */
const RUN_ORPHAN = 4440001;

/** Whose pass a planted row is, as the fixture names it. */
type PassOwner = 'nobody' | 'radar' | 'sibling';

/** One row of the runs fixture, before the ids are known. */
interface PlantedPass {
  /** `runs.id`, which every reading below sorts by. */
  readonly id: number;

  /** Which of the two domains made it, or neither. */
  readonly owner: PassOwner;

  /** When it began, as an ISO stamp. */
  readonly startedAt: string;

  /** What it came to. */
  readonly status: RunStatus;

  /** What asked for it. */
  readonly scheduledBy: RunScheduler;
}

/**
 * The four passes {@link plantRuns} gives the store.
 *
 * PLANTED RATHER THAN WRITTEN, because `RunStore` declares no insert
 * at all: `src/runs/store.ts` states that the absence IS the
 * read-first rule, so `MemoryResearchStore.setRuns` is the only way
 * this table gets rows and every read below would otherwise answer
 * an empty page.
 *
 * THE OWNER IS A LABEL AND NOT AN ID, because the ids are the
 * store's and are only known once the domains are inserted. That is
 * what lets the rosters below be DERIVED from this one table rather
 * than written out beside it, so a row that changed hands moves both
 * and no case is left asserting about a split the plant no longer
 * has.
 *
 * They differ along every axis a case here narrows on. Two belong to
 * one domain, one to the other and one to nobody, so a filter has
 * something to leave out on either side and the tick is standing
 * from the first case. Their stamps are not all distinct, which
 * costs nothing: what the page's ORDER is belongs to
 * `tests/helpers/memory-research-store.test.ts`, and every assertion
 * in this file reads a membership or a count.
 */
const PLANTED_PASSES: readonly PlantedPass[] = [
  {
    id: RUN_QUIET,
    owner: 'radar',
    startedAt: FIRST_START,
    status: 'ok',
    scheduledBy: 'interval',
  },
  {
    id: RUN_BUSY,
    owner: 'radar',
    startedAt: THIRD_START,
    status: 'running',
    scheduledBy: 'agent',
  },
  {
    id: RUN_ELSEWHERE,
    owner: 'sibling',
    startedAt: SECOND_START,
    status: 'ok',
    scheduledBy: 'interval',
  },
  {
    id: RUN_TICK,
    owner: 'nobody',
    startedAt: SECOND_START,
    status: 'partial',
    scheduledBy: 'operator',
  },
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

/** {@link RADAR}'s two passes. */
const RADAR_RUN_IDS: readonly number[] = idsOwnedBy('radar');

/** {@link SIBLING}'s one. */
const SIBLING_RUN_IDS: readonly number[] = idsOwnedBy('sibling');

/** One planted `llm_calls` row, before the store holds it. */
interface PlantedCall {
  /** `llm_calls.id`, and the ledger's tiebreak. */
  readonly id: number;

  /** The pass it belongs to, or null when it belongs to none. */
  readonly runId: number | null;

  /** Which step made it. */
  readonly node: string;
}

/**
 * The four calls {@link plantRuns} gives the store.
 *
 * TWO UNDER ONE PASS AND NONE UNDER THE OTHER, so a case reading a
 * run that resolves is not also a case about a run that spent
 * something, and the empty ledger is a state the fixture holds
 * rather than one a later half has to arrange.
 *
 * ONE OF THEM NAMES NO RUN, which is the row `RunStore.listRunLedger`
 * and `RunStore.countRunLedger` structurally cannot reach: both are
 * addressed by a run id. It is planted here so every ledger reading
 * below is taken over a table that carries it.
 */
const PLANTED_CALLS: readonly PlantedCall[] = [
  { id: 5110001, runId: RUN_BUSY, node: 'capture' },
  { id: 5110002, runId: RUN_BUSY, node: 'score' },
  { id: 5220001, runId: RUN_ELSEWHERE, node: 'capture' },
  { id: 5330001, runId: null, node: 'maintenance' },
];

/** How many calls {@link RUN_BUSY} ledgered, derived from the plant. */
const BUSY_LEDGER_COUNT = PLANTED_CALLS.filter(
  (call) => call.runId === RUN_BUSY,
).length;

/** The call planted under a run id no row carries. */
const ORPHAN_CALLS: readonly PlantedCall[] = [
  { id: 5440001, runId: MISSING_RUN_ID, node: `broke on ${SENTINEL_NODE}` },
];

/**
 * Builds one row for `MemoryResearchStore.setLlmCalls`.
 *
 * @param call - The three members a case here cares about.
 * @returns The row to plant. Both magnitudes are null, which is the
 *   unmeasured state and the cheaper fixture: what a magnitude SUMS
 *   to belongs to the spend summary and to no case in this file.
 */
function ledgered(call: PlantedCall): MemoryLlmCall {
  return {
    id: call.id,
    runId: call.runId,
    node: call.node,
    model: null,
    promptChars: null,
    estTokens: null,
    calledAt: new Date(CALLED_AT),
  };
}

/** The two domains, the four passes across them, and the store. */
interface PlantedRuns {
  /** The store, holding both domains and everything planted. */
  readonly store: MemoryResearchStore;

  /** The id {@link RADAR} resolved to, for the direct port reads. */
  readonly domainId: number;

  /** The rows as planted, so a case can re-plant around them. */
  readonly runs: readonly MemoryRun[];
}

/**
 * Plants that shape.
 *
 * @returns The store, the paged domain id, and the run rows.
 *
 * @remarks
 * BOTH DOMAINS ARE PLANTED FOR EVERY CASE, including the ones about
 * a refusal, and that is what turns each narrowed page below into a
 * scoping reading as well. The orphan rows are NOT planted here:
 * only three cases want them, and a fixture carrying rows under ids
 * nothing resolves to would make every count in this file depend on
 * a state that is deliberately unreachable.
 *
 * The run rows travel back because `setRuns` REBUILDS the collection
 * rather than adding to it — the seam is flat, `runs.domain_id`
 * being nullable — so a case planting an orphan pass has to re-plant
 * these beside it or it silently drops the fixture.
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
  const runs: MemoryRun[] = PLANTED_PASSES.map((pass) => ({
    id: pass.id,
    domainId: owners[pass.owner],
    startedAt: new Date(pass.startedAt),
    finishedAt: null,
    status: pass.status,
    counts: {},
    errors: [],
    scheduledBy: pass.scheduledBy,
  }));

  store.setRuns(runs);
  store.setLlmCalls(PLANTED_CALLS.map(ledgered));

  return { store, domainId: domain.id, runs };
}

/**
 * A pass filed under a domain id no row carries, carrying
 * {@link SENTINEL_ERROR} in the one member a writer's text reaches.
 *
 * Reachable through the port and reachable through no slug, which is
 * what the two cases that read it are each about: the refusal comes
 * from the lookup rather than from an empty page, and nothing the
 * lookup refused is quoted back.
 */
const ORPHAN_RUN: MemoryRun = {
  id: RUN_ORPHAN,
  domainId: MISSING_DOMAIN_ID,
  startedAt: new Date(FIRST_START),
  finishedAt: null,
  status: 'failed',
  counts: {},
  errors: [{ node: SENTINEL_ERROR }],
  scheduledBy: 'interval',
};

/** How many times each read this file drives was issued. */
interface ReadCounts {
  /** Lookups of the domain a `?domain` named. */
  findDomainBySlug: number;

  /** Reads of one window of the passes. */
  listRuns: number;

  /** Reads of how many the same filter selects. */
  countRuns: number;

  /** Lookups of the pass an `:id` named. */
  findRunById: number;

  /** Reads of the head of one pass's ledger. */
  listRunLedger: number;

  /** Reads of how many calls that pass ledgered. */
  countRunLedger: number;
}

/** A tally with every member at zero. */
const NO_READS: ReadCounts = {
  findDomainBySlug: 0,
  listRuns: 0,
  countRuns: 0,
  findRunById: 0,
  listRunLedger: 0,
  countRunLedger: 0,
};

/**
 * The five-method port with a tally beside it.
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
  counted: RunsServiceStore;
  calls: ReadCounts;
} {
  const calls: ReadCounts = { ...NO_READS };
  const counted: RunsServiceStore = {
    findDomainBySlug(slug) {
      calls.findDomainBySlug += 1;

      return store.findDomainBySlug(slug);
    },
    listRuns(filter, window) {
      calls.listRuns += 1;

      return store.listRuns(filter, window);
    },
    countRuns(filter) {
      calls.countRuns += 1;

      return store.countRuns(filter);
    },
    findRunById(id) {
      calls.findRunById += 1;

      return store.findRunById(id);
    },
    listRunLedger(runId, limit) {
      calls.listRunLedger += 1;

      return store.listRunLedger(runId, limit);
    },
    countRunLedger(runId) {
      calls.countRunLedger += 1;

      return store.countRunLedger(runId);
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
    parseQuery(runListQuerySchema, query);
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refused query, and the parse answered');
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
 * Renders an error's `cause` into text a search can read.
 *
 * @param cause - `err.cause`, which is `unknown` by declaration.
 * @returns The name, the message and the stack for an `Error`; the
 *   serialised value otherwise; and the empty string when there is
 *   no cause. The STACK is in it deliberately: a driver error's own
 *   message is repeated there, so a channel that read only
 *   `cause.message` would miss the copy underneath it.
 */
function renderCause(cause: unknown): string {
  if (cause === undefined) {
    return '';
  }

  if (cause instanceof Error) {
    return [cause.name, cause.message, cause.stack ?? ''].join(' ');
  }

  return JSON.stringify(cause) ?? String(cause);
}

/**
 * The three channels a refusal could carry a submitted value out
 * through, rendered separately.
 *
 * SEPARATELY RATHER THAN JOINED, so a count of zero in each is three
 * readings and a leak names the channel it came through. The order
 * is fixed: the message, the details, the cause.
 *
 * @param err - The refusal.
 * @returns The three renderings.
 */
function channelsOf(err: AppError): string[] {
  return [
    err.message,
    JSON.stringify(err.details ?? null),
    renderCause(err.cause),
  ];
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken by
 *   this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * @param err - The refusal.
 * @param needle - The string that must not be in it.
 * @returns One count per channel, in {@link channelsOf}'s order.
 */
function leaksIn(err: AppError, needle: string): number[] {
  return channelsOf(err).map((text) => countOccurrences(text, needle));
}

/**
 * @param rows - The page a read answered.
 * @returns The ids in it, ASCENDING, for a membership reading that
 *   says nothing about the order a page came back in. What that
 *   order is belongs to the store's own file, and reading it here
 *   would make a case about a refusal able to fail for an ordering
 *   reason.
 */
function idsOf(rows: readonly RunRecord[]): number[] {
  return [...rows].map((row) => row.id).sort((left, right) => left - right);
}

// ---------------------------------------------------------------------------
// A domain slug that names no row
// ---------------------------------------------------------------------------

describe('a domain slug that names no row', () => {
  it('answers 404', async () => {
    const { store } = await plantRuns();
    const refusal = await refusalFrom(
      () => listRuns(store, MISSING_SLUG, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers a page for a slug that is', async () => {
    // The positive control for the case above, varied along the one
    // axis under test: the same window, a slug that resolves. A
    // function refusing everything passes the refusal and fails
    // this. Read as a membership and a count, so it cannot fail for
    // an ordering reason.
    const { store } = await plantRuns();
    const page = await listRuns(store, RADAR, WIDE_WINDOW);

    expect(idsOf(page.rows)).toEqual([...RADAR_RUN_IDS]);
    expect(page.total).toBe(RADAR_RUN_IDS.length);

    // And the other domain answers its own passes, which is what
    // makes the count above a scoping reading rather than a tally of
    // everything planted: a store that had stopped taking the filter
    // answers four to both of these.
    const sibling = await listRuns(store, SIBLING, WIDE_WINDOW);

    expect(idsOf(sibling.rows)).toEqual([...SIBLING_RUN_IDS]);
    expect(idsOf(sibling.rows)).not.toEqual(idsOf(page.rows));

    // And the collection those two narrow is really wider than
    // either, which is what makes the counts above discriminating: a
    // store that had stopped reading the filter answers this number
    // to all three.
    const every = await store.countRuns(EVERY_RUN);

    expect(every).toBe(PLANTED_PASSES.length);
    expect(every).toBeGreaterThan(page.total);
  });

  it('reads no run before it refuses', async () => {
    // The ordering claim, which no assertion on the status can make:
    // a lookup moved below the two reads answers the same 404 having
    // already scanned every pass for a domain that is not there.
    // Counted rather than asserted absent, and the control is the
    // same tally taken over a slug that resolves — a wrapper that
    // had stopped counting reports zero for both.
    const { store } = await plantRuns();
    const refused = countingStore(store);

    await refusalFrom(
      () => listRuns(refused.counted, MISSING_SLUG, WIDE_WINDOW),
    );

    expect(refused.calls).toEqual({ ...NO_READS, findDomainBySlug: 1 });

    const answered = countingStore(store);

    await listRuns(answered.counted, RADAR, WIDE_WINDOW);

    expect(answered.calls).toEqual({
      ...NO_READS,
      findDomainBySlug: 1,
      listRuns: 1,
      countRuns: 1,
    });

    // And an ABSENT `?domain` asks `domains` nothing at all, which
    // is the widening path and the only reading that can report a
    // resolver looking up a slug nobody sent.
    const widened = countingStore(store);

    await listRuns(widened.counted, undefined, WIDE_WINDOW);

    expect(widened.calls).toEqual({
      ...NO_READS,
      listRuns: 1,
      countRuns: 1,
    });
  });

  it('refuses though passes are planted for it', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from there being nothing to answer. The planting seam
    // takes a domain id that names no row on purpose, so this state
    // is reachable: passes really are filed under it, the port
    // answers them to whoever asks it directly, and the refusal is
    // still what a slug naming no domain gets.
    const planted = await plantRuns();

    planted.store.setRuns([...planted.runs, ORPHAN_RUN]);

    const orphaned = await planted.store.countRuns(ORPHAN_FILTER);

    expect(orphaned).toBe(1);

    const refusal = await refusalFrom(
      () => listRuns(planted.store, MISSING_SLUG, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// An id that names no run
// ---------------------------------------------------------------------------

describe('an id that names no run', () => {
  it('answers 404 from the single get', async () => {
    const { store } = await plantRuns();
    const refusal = await refusalFrom(() => getRun(store, MISSING_RUN_ID));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();

    // The control, inside the case and varied along the one axis
    // under test: the same call against an id that resolves. A
    // function refusing everything passes the assertions above and
    // fails this one. The pass chosen is the one that ledgered
    // something, so the control also says the embedded reads ran.
    const answered = await getRun(store, RUN_BUSY);

    expect(answered.run.id).toBe(RUN_BUSY);
    expect(answered.llmCallCount).toBe(BUSY_LEDGER_COUNT);
  });

  it('reads no ledger before it refuses', async () => {
    // The ordering claim, which no assertion on the status can make:
    // both ledger reads answer emptily for an id no run carries, so
    // a function issuing them first answers the same 404 having
    // already scanned `llm_calls` twice. The control is the same
    // tally over an id that resolves — a wrapper that had stopped
    // counting reports zero for both.
    const { store } = await plantRuns();
    const refused = countingStore(store);

    await refusalFrom(() => getRun(refused.counted, MISSING_RUN_ID));

    expect(refused.calls).toEqual({ ...NO_READS, findRunById: 1 });

    const answered = countingStore(store);

    await getRun(answered.counted, RUN_QUIET);

    expect(answered.calls).toEqual({
      ...NO_READS,
      findRunById: 1,
      listRunLedger: 1,
      countRunLedger: 1,
    });
  });

  it('refuses though calls are planted under it', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from an empty ledger. The seam is keyed by the call's own
    // id with the run riding on the row, so a call naming a run
    // nothing stored is plantable: the port answers it to whoever
    // asks with that id, and the refusal is still what an id no run
    // carries gets.
    const { store } = await plantRuns();

    store.setLlmCalls([
      ...PLANTED_CALLS.map(ledgered),
      ...ORPHAN_CALLS.map(ledgered),
    ]);

    const orphaned = await store.countRunLedger(MISSING_RUN_ID);

    expect(orphaned).toBe(ORPHAN_CALLS.length);

    const refusal = await refusalFrom(() => getRun(store, MISSING_RUN_ID));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A perPage above the shared cap
// ---------------------------------------------------------------------------

describe('a perPage above the shared cap', () => {
  it('refuses a perPage one past the cap', () => {
    // Refused by the SCHEMA and not by either function: a window is
    // a rule about the QUERY, and nothing in `src/runs/service.ts`
    // re-checks a bound. `too_big` naming the parameter is what a
    // caller reads.
    const refusal = refusalFromQuery({ perPage: String(SHARED_CAP + 1) });

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'perPage', code: 'too_big' },
    ]);

    // The control, varied along this row's own axis by one step: the
    // same parse with the value moved back onto the cap. A schema
    // refusing every `perPage` passes the assertions above and fails
    // this one.
    const taken = parseQuery(runListQuerySchema, {
      perPage: String(SHARED_CAP),
    });

    expect(taken.perPage).toBe(SHARED_CAP);
  });

  it('reads the ceiling the shared schema sets', () => {
    // The cap is INHERITED rather than re-declared, and this is the
    // reading that says so: the same bracketing pair answered
    // identically by `paginationQuerySchema` and by the composed
    // one. A second ceiling agreeing today would pass the case above
    // and fail this the day either moved.
    const bracket = [SHARED_CAP, SHARED_CAP + 1].map(String);
    const shared = bracket.map(
      (perPage) => paginationQuerySchema.safeParse({ perPage }).success,
    );
    const composed = bracket.map(
      (perPage) => runListQuerySchema.safeParse({ perPage }).success,
    );

    expect(shared).toEqual([true, false]);
    expect(composed).toEqual(shared);
  });

  it('refuses an undeclared query parameter', () => {
    // What says `.strict()` survived the `.extend()`. An undeclared
    // parameter is a `422` naming the CONTAINER rather than a
    // narrowing quietly dropped, and the detail names `query`
    // because `src/http/validation.ts` never reads `issue.keys`.
    // It is also what refuses the parameter that would ask for the
    // domain-less ticks alone: there is no such spelling, and this
    // is the rule that says so.
    const refusal = refusalFromQuery({ [MISSING_SLUG]: 'anything' });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'query', code: 'unrecognized_keys' },
    ]);

    // The control: the same parse with that key removed and every
    // declared one present. A schema refusing every query passes the
    // assertions above and fails this.
    const taken = parseQuery(runListQuerySchema, {
      page: '1',
      perPage: String(SHARED_CAP),
      domain: RADAR,
    });

    expect(taken.page).toBe(1);
    expect(taken.domain).toBe(RADAR);
  });
});

// ---------------------------------------------------------------------------
// A domain that could not be a slug
// ---------------------------------------------------------------------------

describe('a domain that could not be a slug', () => {
  it('refuses the shape before any store call', async () => {
    // `?domain` is held to `slugParamSchema`, the same declaration a
    // `:slug` segment is, so a value that could not be a slug is a
    // `422` naming the parameter rather than a `404` raised after a
    // lookup: a request that never named a domain has not
    // established that no domain carries it.
    const refusal = refusalFromQuery({ domain: UNSHAPED_DOMAIN });

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'domain', code: 'invalid_format' },
    ]);

    // The control, varied along this row's own axis alone: the same
    // value lowercased, which IS a shape a slug can have. A schema
    // refusing every `?domain` passes the assertions above and fails
    // this one.
    const taken = parseQuery(runListQuerySchema, {
      domain: UNSHAPED_DOMAIN.toLowerCase(),
    });

    expect(taken.domain).toBe(UNSHAPED_DOMAIN.toLowerCase());

    // And a slug that PARSES is still a `404` when no domain carries
    // it, which is what keeps the two refusals separate claims: the
    // boundary answers the shape and the lookup answers the row.
    const { store } = await plantRuns();
    const missing = await refusalFrom(
      () => listRuns(store, UNSHAPED_DOMAIN.toLowerCase(), WIDE_WINDOW),
    );

    expect(missing).toBeInstanceOf(NotFoundError);
    expect(missing.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// What a refusal carries
// ---------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes neither the slug nor a planted pass', async () => {
    // Counted per CHANNEL rather than over a joined blob, so a leak
    // names the channel it came through. The stored needle rides
    // along beside the submitted one because a refusal composed from
    // a row it had just read is the other half of this rule.
    const planted = await plantRuns();

    planted.store.setRuns([...planted.runs, ORPHAN_RUN]);

    // The stored needle is really REACHABLE, which is what makes its
    // zero a reading rather than a search for something no row
    // carries. Read off the port directly, the row sitting under an
    // id no slug resolves to.
    const orphans = await planted.store.listRuns(ORPHAN_FILTER, WIDE_WINDOW);

    expect(JSON.stringify(orphans)).toContain(SENTINEL_ERROR);

    const needles = [MISSING_SLUG, SENTINEL_ERROR];
    const refusal = await refusalFrom(
      () => listRuns(planted.store, MISSING_SLUG, WIDE_WINDOW),
    );

    expect(needles.map((needle) => leaksIn(refusal, needle)))
      .toEqual(needles.map(() => [0, 0, 0]));

    // The search would find them: a planted refusal leaking through
    // all three channels is counted by the same helper in the same
    // case, so the zeros above are a reading rather than a search
    // that could only ever answer nothing. A renderer that ignored
    // `cause` fails on the third member alone.
    const leaking = new ValidationError(
      `refused ${MISSING_SLUG}, which filed ${SENTINEL_ERROR}`,
      [{
        field: 'domain',
        message: `no domain ${MISSING_SLUG} filing ${SENTINEL_ERROR}`,
        code: 'custom',
      }],
      { cause: new Error(`${MISSING_SLUG} held ${SENTINEL_ERROR}`) },
    );

    expect(needles.map((needle) => leaksIn(leaking, needle)
      .map((count) => count > 0)))
      .toEqual(needles.map(() => [true, true, true]));

    // And the refusal was built at all: a helper answering the empty
    // string would satisfy every zero above.
    expect(refusal.message.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the id nor a planted call', async () => {
    // The single get's refusal, whose submitted value is an id and
    // whose stored needle sits in the ledger the id would have
    // reached. Seven digits, per this file's header, so the count in
    // the rendered stack is a reading of the refusal rather than of
    // a line number.
    const { store } = await plantRuns();

    store.setLlmCalls([
      ...PLANTED_CALLS.map(ledgered),
      ...ORPHAN_CALLS.map(ledgered),
    ]);

    const wide = WIDE_WINDOW.limit;
    const orphans = await store.listRunLedger(MISSING_RUN_ID, wide);

    expect(JSON.stringify(orphans)).toContain(SENTINEL_NODE);

    const needles = [String(MISSING_RUN_ID), SENTINEL_NODE];
    const refusal = await refusalFrom(() => getRun(store, MISSING_RUN_ID));

    expect(needles.map((needle) => leaksIn(refusal, needle)))
      .toEqual(needles.map(() => [0, 0, 0]));

    const leaking = new ValidationError(
      `refused ${MISSING_RUN_ID}, which called ${SENTINEL_NODE}`,
      [{
        field: 'id',
        message: `no run ${MISSING_RUN_ID} calling ${SENTINEL_NODE}`,
        code: 'custom',
      }],
      { cause: new Error(`${MISSING_RUN_ID} held ${SENTINEL_NODE}`) },
    );

    expect(needles.map((needle) => leaksIn(leaking, needle)
      .map((count) => count > 0)))
      .toEqual(needles.map(() => [true, true, true]));

    expect(refusal.message.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the window nor the shape', async () => {
    // The two boundary refusals, whose submitted values are a number
    // a caller sent and a string it chose. `src/http/validation.ts`
    // copies the issue's CODE and a fixed sentence and never
    // `issue.message`, in which zod quotes both — so what this reads
    // is that the parse went through that module rather than through
    // a raw `.parse()`.
    const overCap = String(SHARED_CAP + 1);
    const refusals = [
      refusalFromQuery({ perPage: overCap }),
      refusalFromQuery({ domain: UNSHAPED_DOMAIN }),
    ];
    const needles = [overCap, UNSHAPED_DOMAIN];

    expect(refusals.flatMap(
      (refusal) => needles.map((needle) => leaksIn(refusal, needle)),
    )).toEqual(refusals.flatMap(() => needles.map(() => [0, 0, 0])));

    const leaking = new ValidationError(
      `refused ${UNSHAPED_DOMAIN} at ${overCap}`,
      [{
        field: 'domain',
        message: `not ${UNSHAPED_DOMAIN}, and not ${overCap}`,
        code: 'invalid_format',
      }],
      { cause: new Error(`saw ${UNSHAPED_DOMAIN} and ${overCap}`) },
    );

    expect(needles.map((needle) => leaksIn(leaking, needle)
      .map((count) => count > 0)))
      .toEqual(needles.map(() => [true, true, true]));

    // Both envelopes carry their details, so the zeros above are
    // taken over text that really described the two faults.
    expect(refusals.map(
      (refusal) => detailsOf(refusal.details as FieldError[] | undefined),
    ).map((details) => details.length)).toEqual([1, 1]);
  });
});
