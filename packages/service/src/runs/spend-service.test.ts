/**
 * `src/runs/spend-service.ts` — what the one spend read REFUSES,
 * what window it takes when the caller named none, and what its
 * answer is careful not to be called. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * EIGHT SECTIONS AND FOURTEEN CASES. Three sections are the
 * refusals this surface can raise and their controls: a span above
 * {@link SPEND_MAX_WINDOW_DAYS}, a `?domain` slug no domain
 * carries, and the queries {@link spendQuerySchema} refuses before
 * any function is reached. Four are what the read ANSWERS — which
 * window it was taken over when a bound was left open, which UTC
 * day a call falls on, where the calls belonging to nobody land,
 * and what the answer's members are named. The last is what the two
 * refusals carry, read per channel.
 *
 * ONE OF THE THREE REFUSAL SECTIONS IS THIS MODULE'S OWN, ONE IS
 * SHARED WITH THE PAGE, AND ONE IS THE SCHEMA'S, and saying which
 * is half of what this file is for. The span is bounded by
 * {@link summariseSpend} itself and by nothing else, because the
 * bound depends on the CLOCK whenever a bound was left open and no
 * schema has one. The 404 is the same lookup `./service.ts` makes.
 * The inverted window, the unshaped `?domain` and the undeclared
 * `?page` are a query that never reached a function at all, so
 * those rows are submitted to `parseQuery` — the call a router
 * makes — and what is pinned is that no window can be BUILT from a
 * query outside the rules rather than that something downstream
 * would have caught it.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A function refusing everything and a schema
 * refusing every query each pass a refusal case written on its own,
 * so the control sits in the same case and differs from the refused
 * input in exactly the thing under test: the same window with the
 * span ONE MILLISECOND narrower; the same request under a slug that
 * resolves; the same pair of stamps the right way round; the same
 * `?domain` respelt into a shape a slug can have.
 *
 * THE SPAN IS BRACKETED RATHER THAN ASSERTED, and the bracket is
 * one millisecond wide. `SPEND_MAX_WINDOW_DAYS` is the widest
 * window a caller may NAME rather than the first one refused, so a
 * span at exactly the maximum accepted and the next one refused is
 * what says the comparison is strictly greater — and the grid
 * below records that only the accepted half can report it, the
 * refused half answering the same 422 under either spelling.
 *
 * NOTHING HERE READS THE BUCKET ORDER. `day` descending then
 * `domainId` ascending with the null bucket last is
 * `RunStore.summariseSpend`'s promise and
 * `tests/helpers/memory-research-store.test.ts` is where it is
 * held, so every reading over more than one bucket sorts by a key
 * of its own and no case here can fail for an ordering reason. The
 * grid records that as a measured zero rather than as an intention:
 * reversing the store's own comparator reddens nothing in this
 * file.
 *
 * THE FIXTURE IS BUILT TO DISCRIMINATE RATHER THAN MERELY TO
 * EXIST. Two domains have spent something, so every narrowed
 * summary read here is a scoping reading as well. Two calls
 * straddle a UTC midnight by one millisecond, which is the only
 * gap nothing but the truncation can separate. Two more reach no
 * domain, by the two different routes `runs.domain_id` and
 * `llm_calls.run_id` being nullable each open, and they fall on ONE
 * day so that the bucket holding both is a count of two rather than
 * two buckets of one. One call falls OUTSIDE the thirty-day
 * default window, which is what makes the defaulting readable over
 * rows and not only over the argument. And the magnitudes are
 * planted on some calls and not others, so a bucket that summed
 * nothing answers null while a bucket that summed something
 * answers the sum, both states standing in the same summary.
 *
 * THAT A SPAN ABOVE THE MAXIMUM COSTS `domains` AND THE LEDGER NO
 * READ AT ALL, which no assertion on a status can make. A span
 * check moved below the lookup answers the same 422 having already
 * asked about a slug, and one moved below the aggregate having
 * scanned the ledger it exists to bound; both are counted off a
 * store that tallies its two methods, with the same tally taken
 * over a window one millisecond narrower in the same case.
 *
 * THAT A SLUG NAMING NO DOMAIN IS A 404 RATHER THAN AN EMPTY
 * SUMMARY. That distinction is the whole reason the lookup happens
 * at all: `RunStore.summariseSpend` answers an empty list for an id
 * no domain carries, correctly, so a function that skipped it would
 * answer a mistyped slug exactly as it answers a domain that has
 * spent nothing. The tally is what says the ledger was never
 * reached, and an ABSENT `?domain` asking `domains` nothing at all
 * is the third tally in that case — the widening path, and the
 * only reading in this file that can report a resolver looking up a
 * slug nobody sent.
 *
 * THAT THE WINDOW A CALLER LEFT OPEN IS CLOSED BEFORE THE STORE
 * SEES IT, READ OFF WHAT THE STORE WAS HANDED. A window this module
 * chose and a window the caller sent produce answers of the same
 * shape, so the argument is the only thing that separates them and
 * a recording port is the only instrument that has it. All three
 * spellings are read: neither bound sent answers the last
 * {@link SPEND_DEFAULT_WINDOW_DAYS} days, an `until` alone closes
 * below it by the same span and leaves the clock UNREAD, and a
 * `since` alone closes above it at the clock. The same span travels
 * back on {@link summariseSpend}'s own answer, which is what a
 * caller reads to learn which window it got.
 *
 * THAT THE DEFAULT IS READABLE OVER ROWS TOO. The call made
 * sixty-four days before the fixture clock is outside the
 * thirty-day window and its day is absent from the answer, while
 * the same request naming a window wide enough DOES carry it — so
 * a module ignoring the bounds altogether fails on the first and a
 * module refusing everything fails on the second.
 *
 * THAT THE CLOCK IS READ AT MOST ONCE AND ONLY WHEN THE UPPER BOUND
 * WAS LEFT OPEN. Two reads of a real clock could differ, and the
 * second would be the instant the caller is told about while the
 * first is the one the ledger was aggregated over — a difference
 * no response could show, both being plausible. The tally on
 * {@link clockAt} is the only reading of it.
 *
 * THAT THE DAY BUCKET IS UTC, held on a pair of instants one
 * millisecond apart. The gap is asserted in the same case as the
 * buckets, so a pair that came out right did so for the reason
 * under test rather than because the fixture put a day between
 * them.
 *
 * THAT THE CALLS BELONGING TO NOBODY ARE COUNTED AND NOT DROPPED,
 * and that narrowing excludes them. The null bucket holds both
 * kinds in one row; each narrowed summary is missing that day; and
 * the two domains together fall SHORT of the unnarrowed answer by
 * exactly those two calls. The arithmetic is the reading no single
 * narrowed summary can make, a filter that had stopped being
 * applied answering every narrowed summary plausibly, and it is
 * the positive form of this wave's decision that no spelling of
 * `?domain` asks for those calls alone.
 *
 * THAT NO MEMBER OF THE ANSWER IS NAMED FOR MONEY, at all three
 * levels of it and against a roster of the words a member would be
 * named with. Two guards make that a reading rather than a sweep
 * over nothing. The member roster is asserted WHOLE against a
 * written-out list, so a member added at any level reddens here
 * rather than passing unswept; and the same classifier is run in
 * the same case over that roster plus `estimatedCostUsd` and
 * `ratePerCall`, which it must REPORT. The summary is asserted to
 * carry buckets first, a member sweep over an empty list reporting
 * nothing while reading nothing.
 *
 * THAT NEITHER REFUSAL QUOTES ANYTHING, READ PER CHANNEL. An
 * `AppError` can carry a submitted value out through three of them
 * — the message, the details and the CAUSE — and a count taken
 * over the three joined together cannot say which one leaked.
 * {@link leaksIn} renders them separately, and the zeros are read
 * against a planted refusal that leaks every needle through all
 * three, counted by the same helper in the same case. The needles
 * are the two values a caller submitted (the slug, and the lower
 * bound as it would be rendered) and one STORED value, planted on a
 * call filed under a domain id no row carries and asserted
 * REACHABLE through the port in the same case — because a refusal
 * composed from a row it had just read would be the leak this rule
 * exists to close, and a search over nothing planted finds nothing
 * either way. What the span refusal DOES name is the maximum,
 * which is a constant of the module rather than anything sent.
 *
 * Mutation grid, TWENTY-EIGHT legs. The twenty-four that report
 * were run WHOLE over this file TWICE with `--reporter=json` and
 * read as the failed case SET rather than as a count; the two runs
 * agreed member for member on every one, which is what separates a
 * measurement from a bad capture. The four that read zero were
 * measured once each and are recorded below rather than fixed.
 * Twenty-one mutate `./spend-service.ts` and seven mutate
 * `tests/helpers/memory-research-store.ts`.
 *
 * THE SPAN BOUND IS FOUR LEGS. `>=` in place of `>` reddens 2 —
 * the span case and the tally case, both through their AT-MAX
 * controls, the refused half answering alike either way. Removing
 * the check entirely reddens 3, those two plus the containment
 * case, whose over-wide request stops being refused at all.
 * Naming `until` instead of `since` in the detail reddens 2 and
 * dropping the maximum out of the message reddens 1, both on the
 * containment case, which is the only reading of what the refusal
 * says as opposed to that it happened.
 *
 * THE WINDOW RESOLUTION IS SEVEN LEGS AND THE LARGEST OF THEM ARE
 * THE ONES THAT MOVE BOTH BOUNDS. Swapping the two bounds reddens
 * 7 and adding the default span instead of subtracting it reddens
 * 6, each emptying most of the answer; defaulting to the MAXIMUM
 * span rather than the declared one reddens 4; ignoring a
 * submitted `since` reddens 5 and ignoring a submitted `until`
 * reddens 2. Answering a window rebuilt from the QUERY rather than
 * the object the store was handed reddens exactly 1, the default
 * case, which is the case that exists for it. Reading the clock
 * twice reddens 2, both cases that count it.
 *
 * THE TWO REFUSALS' ORDERING IS TWO LEGS AND EACH LANDS ON A TALLY.
 * Resolving the slug before the window reddens 2 — the over-wide
 * tally and the containment case — and looking an ABSENT slug up
 * anyway reddens 1, the widening tally, which nothing else in this
 * file could report.
 *
 * THE 404 AND THE NARROWING ARE THREE LEGS WITH DISJOINT SETS.
 * Comparing the resolved domain against `undefined` so that branch
 * never fires reddens 3, building the filter with no `domainId`
 * reddens 3, and composing the submitted slug into the message
 * reddens 1. The first two share no member: one is about whether
 * the refusal happens and the other about what the narrowing does.
 *
 * THE SCHEMA IS THREE LEGS AND EACH REDDENS EXACTLY ITS OWN CASE.
 * Composing the query the other way round — extending INTO the
 * window schema rather than out of it — reddens 1, the inverted
 * window alone, which is what the measurement about `.extend()`
 * carrying an object check outwards predicts. Holding `domain` to
 * `z.string()` reddens 1 and a catchall on the composed shape
 * reddens 1.
 *
 * THE STORE IS FOUR OF THE REPORTING LEGS AND ONE OF THOSE IS
 * ENVIRONMENTAL.
 * Planting no calls at all reddens 7 of 14 and its SURVIVORS are
 * the coverage statement rather than its count: the three cases
 * whose subject is a query the schema refuses or accepts, the two
 * tallies and the status case of the 404 section, and the
 * open-bound case, which reads only the window the store was
 * handed. A survivor that could not be explained that way would be
 * a case asserting something it does not mean. Truncating the day
 * in the process's LOCAL zone rather than at UTC reddens 4, and
 * that figure was taken at UTC+02:00 — the two accessor families
 * agree under `TZ=UTC`, so the leg is a literal no-op there and a
 * verifier in that zone reads a dead leg as a covered rule. Making
 * the join to `runs` inner reddens 2 and never applying the spend
 * filter reddens 4.
 *
 * FOUR LEGS READ 0 OF 14 AND EACH IS RECORDED RATHER THAN CLOSED.
 * The two half-open BOUNDARIES — an inclusive upper bound and an
 * exclusive lower one — redden nothing here, because no case
 * plants a call stamped exactly on a bound: that is
 * `RunStore.summariseSpend`'s claim and
 * `tests/helpers/memory-research-store.test.ts` is where a fixture
 * for it belongs, this file's windows being chosen to select rows
 * rather than to sit on them. `||` in place of `??` on the upper
 * bound reddens nothing because a `Date` is never falsy, so the
 * two spellings are the same program — the mistake a reader
 * reaches for when told the rule is not the reachable one, and the
 * leg that DOES report is the one ignoring a submitted `until`
 * above. And reversing the store's bucket comparator reddens
 * nothing, which is this file's own rule reporting itself.
 */
import type { SpendServiceStore, SpendSummary } from './spend-service.js';
import type { RunFilter, SpendBucket } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryLlmCall,
  MemoryResearchStore,
  MemoryRun,
} from '../../tests/helpers/memory-research-store.js';
import type { TimeWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { parseQuery } from '../http/validation.js';

import {
  SPEND_DEFAULT_WINDOW_DAYS,
  SPEND_MAX_WINDOW_DAYS,
  spendQuerySchema,
  summariseSpend,
} from './spend-service.js';

/** The seeded worked example, and the domain most cases narrow to. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, with a pass and a call of its own.
 *
 * IT HAS SPENT SOMETHING, which is what makes every narrowed
 * summary read here a scoping reading too: a store that had stopped
 * taking the filter answers four buckets where each of those cases
 * asserts one or two.
 */
const SIBLING = 'example-newsroom';

/**
 * A slug shaped like one and carried by no domain in any case here.
 *
 * SENTINEL-SHAPED ON PURPOSE, so the containment block's count of
 * it in a refusal is a reading of the refusal rather than a
 * coincidence of wording. It still satisfies `slugParamSchema`,
 * because what is under test is a slug that PARSED and resolved to
 * nothing, not a value the boundary would have refused.
 */
const MISSING_SLUG = 'zzsentinelslugzz';

/**
 * A `?domain` that could not be a slug at all.
 *
 * UPPERCASE, which `slugParamSchema` refuses on the opening
 * character.
 */
const UNSHAPED_DOMAIN = 'ZZSENTINELSHAPEZZ';

/** A domain id no `domains` row carries, for the plant below. */
const MISSING_DOMAIN_ID = 8880001;

/**
 * The `node` of a call filed under a domain id no row carries.
 *
 * WHAT A REFUSAL COMPOSED FROM A ROW IT HAD READ WOULD LEAK. It is
 * planted behind {@link MISSING_SLUG}, so the one refusal on this
 * surface that reads anything at all has a stored value within
 * reach of it.
 */
const SENTINEL_NODE = 'zzsentinelnodezz';

/**
 * How long a day is, in milliseconds, written down rather than
 * imported.
 *
 * `MILLISECONDS_PER_DAY` is private to `./spend-service.ts`, and
 * this file transcribes it for the reason `src/http/schemas.test.ts`
 * transcribes the page cap: a change to the arithmetic should be a
 * red case somewhere rather than a silent agreement on both sides.
 */
const DAY_MS = 86_400_000;

/** {@link SPEND_MAX_WINDOW_DAYS} in milliseconds. */
const MAX_SPAN_MS = SPEND_MAX_WINDOW_DAYS * DAY_MS;

/** {@link SPEND_DEFAULT_WINDOW_DAYS} in milliseconds. */
const DEFAULT_SPAN_MS = SPEND_DEFAULT_WINDOW_DAYS * DAY_MS;

/**
 * What the clock reads in every case here.
 *
 * BUILT FROM `Date.UTC` AND NOT FROM A STRING, so nothing in this
 * file depends on the parse under test: the month is 0-based, so
 * this is midday on 10 March 2026.
 */
const NOW = new Date(Date.UTC(2026, 2, 10, 12, 0, 0));

/** The lower bound an unqualified request is answered over. */
const DEFAULT_SINCE = new Date(NOW.getTime() - DEFAULT_SPAN_MS);

/**
 * A window wide enough to hold every planted call and narrow enough
 * to be accepted.
 *
 * Sixty-eight days, against a maximum of ninety-two, so it is a
 * legal window rather than one that happens to pass.
 */
const WIDE_SINCE = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

/**
 * The two instants the UTC-day claim rests on: one millisecond
 * either side of a UTC midnight.
 *
 * NOTHING BUT THE TRUNCATION CAN SEPARATE THEM, which is what makes
 * the pair a reading of the bucket rather than of the fixture. The
 * case asserts the gap as well as the buckets.
 */
const BEFORE_MIDNIGHT = new Date(Date.UTC(2026, 2, 4, 23, 59, 59, 999));

/** Its neighbour, one millisecond later and one day on. */
const AFTER_MIDNIGHT = new Date(Date.UTC(2026, 2, 5, 0, 0, 0, 0));

/** When the domain-less tick made its call. */
const TICK_CALLED_AT = new Date(Date.UTC(2026, 2, 6, 10, 0, 0));

/** When the call that names no pass at all was made. */
const UNRUN_CALLED_AT = new Date(Date.UTC(2026, 2, 6, 11, 0, 0));

/** When {@link SIBLING}'s one call was made. */
const SIBLING_CALLED_AT = new Date(Date.UTC(2026, 2, 7, 9, 0, 0));

/**
 * When the one call OUTSIDE the default window was made.
 *
 * Sixty-four days before {@link NOW}, so it is inside
 * {@link WIDE_SINCE}'s window and outside the thirty-day default.
 * That is what turns the default-window case into a reading over
 * ROWS as well as over the window the store was handed.
 */
const OLD_CALLED_AT = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));

/** The UTC day {@link BEFORE_MIDNIGHT} falls on. */
const DAY_BEFORE = '2026-03-04T00:00:00.000Z';

/** The UTC day {@link AFTER_MIDNIGHT} falls on. */
const DAY_AFTER = '2026-03-05T00:00:00.000Z';

/** The UTC day both unattributed calls fall on. */
const DAY_NOBODY = '2026-03-06T00:00:00.000Z';

/** The UTC day {@link SIBLING}'s call falls on. */
const DAY_SIBLING = '2026-03-07T00:00:00.000Z';

/** The UTC day the pre-default-window call falls on. */
const DAY_OLD = '2026-01-05T00:00:00.000Z';

/** The pass {@link RADAR} made. */
const RUN_RADAR = 4110001;

/** The pass {@link SIBLING} made. */
const RUN_SIBLING = 4220001;

/** The maintenance tick that belongs to no domain. */
const RUN_TICK = 4330001;

/** A pass filed under a domain id no row carries. */
const RUN_ORPHAN = 4440001;

/** Whose pass a planted row is, as the fixture names it. */
type PassOwner = 'nobody' | 'radar' | 'sibling';

/**
 * The three passes {@link plantSpend} gives the store.
 *
 * PLANTED RATHER THAN WRITTEN, because `RunStore` declares no
 * insert at all: `src/runs/store.ts` states that the absence IS the
 * read-first rule, so `MemoryResearchStore.setRuns` is the only way
 * this table gets rows.
 *
 * THE OWNER IS A LABEL AND NOT AN ID, because the ids are the
 * store's and are only known once the domains are inserted.
 *
 * THE DOMAIN-LESS TICK IS PLANTED FOR EVERY CASE rather than added
 * by the half that reads it, because a row arriving later moves
 * every count in the file.
 */
const PLANTED_PASSES: readonly { id: number; owner: PassOwner }[] = [
  { id: RUN_RADAR, owner: 'radar' },
  { id: RUN_SIBLING, owner: 'sibling' },
  { id: RUN_TICK, owner: 'nobody' },
];

/** One planted `llm_calls` row, before the store holds it. */
interface PlantedCall {
  /** `llm_calls.id`. */
  readonly id: number;

  /** The pass it was made during, or null when it names none. */
  readonly runId: number | null;

  /** When it was made: the column the window bounds. */
  readonly calledAt: Date;

  /** How many characters it sent, or null when unmeasured. */
  readonly promptChars: number | null;

  /** What that was estimated at, or null on the same terms. */
  readonly estTokens: number | null;
}

/**
 * The six calls {@link plantSpend} gives the store.
 *
 * THEY DIFFER ALONG EVERY AXIS A CASE HERE READS. Two straddle a
 * UTC midnight by one millisecond; two reach no domain, by the two
 * different routes `runs.domain_id` and `llm_calls.run_id` being
 * nullable each open, and land in ONE bucket because they fall on
 * one day; one belongs to the other domain, so every narrowed
 * summary has something to leave out; and one falls OUTSIDE the
 * thirty-day default window, which is what makes the defaulting
 * readable over rows.
 *
 * THE MAGNITUDES ARE PLANTED ON SOME CALLS AND NOT OTHERS, so a
 * bucket that summed nothing answers null rather than zero and a
 * bucket that summed something answers the sum. Both states are in
 * the summary every case reads.
 */
const PLANTED_CALLS: readonly PlantedCall[] = [
  {
    id: 5110001,
    runId: RUN_RADAR,
    calledAt: BEFORE_MIDNIGHT,
    promptChars: 100,
    estTokens: 25,
  },
  {
    id: 5110002,
    runId: RUN_RADAR,
    calledAt: AFTER_MIDNIGHT,
    promptChars: 200,
    estTokens: 50,
  },
  {
    id: 5220001,
    runId: RUN_SIBLING,
    calledAt: SIBLING_CALLED_AT,
    promptChars: null,
    estTokens: null,
  },
  {
    id: 5330001,
    runId: RUN_TICK,
    calledAt: TICK_CALLED_AT,
    promptChars: 7,
    estTokens: null,
  },
  {
    id: 5330002,
    runId: null,
    calledAt: UNRUN_CALLED_AT,
    promptChars: null,
    estTokens: 3,
  },
  {
    id: 5440001,
    runId: RUN_RADAR,
    calledAt: OLD_CALLED_AT,
    promptChars: 1,
    estTokens: 1,
  },
];

/** The two domains, everything planted, and the store. */
interface PlantedSpend {
  /** The store, holding both domains and every planted row. */
  readonly store: MemoryResearchStore;

  /** The id {@link RADAR} resolved to. */
  readonly radarId: number;

  /** The id {@link SIBLING} resolved to. */
  readonly siblingId: number;

  /** The passes as planted, so a case can re-plant around them. */
  readonly runs: readonly MemoryRun[];
}

/**
 * Builds one row for `MemoryResearchStore.setLlmCalls`.
 *
 * @param call - The five members a case here cares about.
 * @returns The row to plant. `node` and `model` are the same for
 *   every call, neither being anything the summary reads.
 */
function ledgered(call: PlantedCall): MemoryLlmCall {
  return {
    id: call.id,
    runId: call.runId,
    node: 'step',
    model: null,
    promptChars: call.promptChars,
    estTokens: call.estTokens,
    calledAt: call.calledAt,
  };
}

/**
 * Builds one row for `MemoryResearchStore.setRuns`.
 *
 * @param id - `runs.id`.
 * @param domainId - Whose pass it was, or null for the tick.
 * @returns The row to plant. Only the domain matters to a summary:
 *   the stamp, the status and the scheduler are the page's business
 *   one module over.
 */
function passed(id: number, domainId: number | null): MemoryRun {
  return {
    id,
    domainId,
    startedAt: NOW,
    finishedAt: null,
    status: 'ok',
    counts: {},
    errors: [],
    scheduledBy: 'interval',
  };
}

/**
 * Plants that shape.
 *
 * @returns The store, both domain ids, and the pass rows.
 *
 * @remarks
 * BOTH DOMAINS ARE PLANTED FOR EVERY CASE, including the ones about
 * a refusal, which is what turns each narrowed summary below into a
 * scoping reading as well. The orphan rows are NOT planted here:
 * one case wants them, and a fixture carrying rows under an id
 * nothing resolves to would make every count in this file depend on
 * a state that is deliberately unreachable.
 *
 * The pass rows travel back because `setRuns` REBUILDS the
 * collection rather than adding to it, the seam being flat, so a
 * case planting an orphan pass has to re-plant these beside it or
 * it silently drops the fixture.
 */
async function plantSpend(): Promise<PlantedSpend> {
  const store = createMemoryResearchStore();
  const radar = await store.insertDomain({
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
    radar: radar.id,
    sibling: sibling.id,
  };
  const runs = PLANTED_PASSES.map(
    (pass) => passed(pass.id, owners[pass.owner]),
  );

  store.setRuns(runs);
  store.setLlmCalls(PLANTED_CALLS.map(ledgered));

  return {
    store,
    radarId: radar.id,
    siblingId: sibling.id,
    runs,
  };
}

/**
 * A pass filed under a domain id no row carries, and one call under
 * it carrying {@link SENTINEL_NODE}.
 *
 * Reachable through the port and reachable through no slug, which
 * is what the containment case reads it for: nothing the lookup
 * refused is quoted back, and there really was a row within reach.
 */
const ORPHAN_PASS: MemoryRun = passed(RUN_ORPHAN, MISSING_DOMAIN_ID);

/** The call planted under that pass. */
const ORPHAN_CALL: MemoryLlmCall = {
  ...ledgered({
    id: 5550001,
    runId: RUN_ORPHAN,
    calledAt: TICK_CALLED_AT,
    promptChars: null,
    estTokens: null,
  }),
  node: SENTINEL_NODE,
};

/** A clock a case can read and count. */
interface Clock {
  /** What every read answers: a copy, so nothing can move it. */
  readonly now: () => Date;

  /** How many times it has been read. */
  readonly reads: () => number;
}

/**
 * Builds one.
 *
 * @param at - The instant every read answers.
 * @returns The clock, and the tally beside it.
 *
 * @remarks
 * THE TALLY IS THE ONLY READING OF `at most once, and only when the
 * upper bound was left open`. Two reads of a real clock could
 * differ, and the second would be the instant the caller is told
 * about while the first is the one the ledger was aggregated over —
 * a difference no response could show, both being plausible.
 */
function clockAt(at: Date): Clock {
  let reads = 0;

  return {
    now: () => {
      reads += 1;

      return new Date(at.getTime());
    },
    reads: () => reads,
  };
}

/** How many times each read this file drives was issued. */
interface ReadCounts {
  /** Lookups of the domain a `?domain` named. */
  findDomainBySlug: number;

  /** Aggregations of the ledger. */
  summariseSpend: number;
}

/** A tally with both members at zero. */
const NO_READS: ReadCounts = {
  findDomainBySlug: 0,
  summariseSpend: 0,
};

/** What one aggregation was asked for. */
interface SpendAsk {
  /** The filter it was narrowed by. */
  readonly filter: RunFilter;

  /** The window it was bounded by. */
  readonly window: TimeWindow;
}

/**
 * The two-method port with a tally and a record beside it.
 *
 * A COUNTING AND RECORDING WRAPPER RATHER THAN A STUB: every call
 * is forwarded to the planted store, so a case reading either is
 * reading a call that really happened and really answered.
 *
 * THE RECORD IS THE ONLY READING OF WHAT THE STORE WAS HANDED,
 * which is the whole of the defaulting claim: a window this module
 * chose and a window the caller sent produce answers of the same
 * shape, and only the argument separates them.
 *
 * @param store - Where the calls go.
 * @returns The port to hand the function, the tally it fills, and
 *   the arguments each aggregation was issued with.
 */
function countingStore(store: MemoryResearchStore): {
  counted: SpendServiceStore;
  calls: ReadCounts;
  asked: SpendAsk[];
} {
  const calls: ReadCounts = { ...NO_READS };
  const asked: SpendAsk[] = [];
  const counted: SpendServiceStore = {
    findDomainBySlug(slug) {
      calls.findDomainBySlug += 1;

      return store.findDomainBySlug(slug);
    },
    summariseSpend(filter, window) {
      calls.summariseSpend += 1;
      asked.push({ filter, window });

      return store.summariseSpend(filter, window);
    },
  };

  return { counted, calls, asked };
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
 * Parses a query the schema has to refuse, and hands back the
 * refusal.
 *
 * @param query - The query string members, as Express hands them.
 * @returns The `AppError` the parse raised.
 * @throws When the parse ANSWERED, so a rule that quietly stopped
 *   being enforced fails here rather than leaving a case asserting
 *   over an error nobody built.
 */
function refusalFromQuery(query: Record<string, string>): AppError {
  try {
    parseQuery(spendQuerySchema, query);
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
 *   no cause. The STACK is in it deliberately: an error's own
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
 * SEPARATELY RATHER THAN JOINED, so a count of zero in each is
 * three readings and a leak names the channel it came through. The
 * order is fixed: the message, the details, the cause.
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
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
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
 * A refusal that leaks every needle through all three channels.
 *
 * THE CONTROL FOR EVERY ZERO IN THE CONTAINMENT CASE, and it has to
 * carry each needle in each channel: a control leaking through two
 * of the three would fail on the third while the subject under test
 * is fine, which reads as a leak.
 *
 * @param needles - Everything the case searches for.
 * @returns The planted refusal.
 */
function leakingRefusal(needles: readonly string[]): ValidationError {
  const written = needles.join(' ');

  return new ValidationError(
    `Validation failed ${written}`,
    [{ field: 'since', message: written, code: 'planted' }],
    { cause: new Error(written) },
  );
}

/** One bucket, in a shape two cases can compare. */
interface BucketReading {
  /** Whose calls they were, or null for the unattributed ones. */
  readonly domainId: number | null;

  /** The UTC day, as the instant that opens it. */
  readonly day: string;

  /** How many landed in it. */
  readonly calls: number;

  /** What they sent, summed over the measured ones, or null. */
  readonly promptChars: number | null;

  /** What that was estimated at, on the same terms. */
  readonly estTokens: number | null;
}

/**
 * @param bucket - One reading.
 * @returns A key that orders it, so a case can compare a SET of
 *   buckets rather than the array the store answered.
 */
function bucketKey(bucket: BucketReading): string {
  return `${bucket.day}:${bucket.domainId ?? 'none'}`;
}

/**
 * Renders a summary's buckets into that shape, ORDERED BY KEY.
 *
 * BY KEY AND NOT AS ANSWERED, on the terms `./service.test.ts`
 * states for its own pages: `day` descending then `domainId`
 * ascending with the null bucket last is
 * `RunStore.summariseSpend`'s promise and
 * `tests/helpers/memory-research-store.test.ts` is where it is
 * held, so no case here can fail for an ordering reason and an
 * ordering that broke is reported in one place rather than in two
 * files disagreeing about which.
 *
 * @param buckets - What a summary answered.
 * @returns The readings, ordered by {@link bucketKey}.
 */
function readingsOf(buckets: readonly SpendBucket[]): BucketReading[] {
  return buckets
    .map((bucket) => ({
      domainId: bucket.domainId,
      day: bucket.day.toISOString(),
      calls: bucket.calls,
      promptChars: bucket.promptChars,
      estTokens: bucket.estTokens,
    }))
    .sort((left, right) => bucketKey(left).localeCompare(bucketKey(right)));
}

/**
 * @param buckets - What a summary answered.
 * @returns The distinct UTC days in it, ascending, for a membership
 *   reading that says nothing about the order or the magnitudes.
 */
function daysIn(buckets: readonly SpendBucket[]): string[] {
  const days = buckets.map((bucket) => bucket.day.toISOString());

  return [...new Set(days)].sort();
}

/**
 * @param buckets - What a summary answered.
 * @returns How many calls they hold between them, which is what the
 *   partition readings add up.
 */
function callsIn(buckets: readonly SpendBucket[]): number {
  return buckets.reduce((total, bucket) => total + bucket.calls, 0);
}

/**
 * Words a member of a spend answer must not be named after.
 *
 * WRITTEN OUT RATHER THAN DERIVED, because there is nothing to
 * derive it from: `llm_calls` carries no money column, so the
 * roster is what a reader would REACH for rather than what the
 * schema holds. `docs/architecture/08-http-api.md` names three of
 * them as the shapes this surface is most likely to grow — a
 * member called `cost`, a `usd` beside a total, and a rate applied
 * on the way out.
 */
const MONEY_WORDS: readonly string[] = [
  'amount',
  'billed',
  'charge',
  'cost',
  'currency',
  'dollar',
  'fee',
  'invoice',
  'money',
  'price',
  'rate',
  'usd',
];

/**
 * @param names - Member names to judge.
 * @returns The ones naming money, matched case-insensitively and as
 *   a SUBSTRING: `estimatedCostUsd` is what such a member would
 *   really be called, not a bare `cost`.
 */
function moneyMembersIn(names: readonly string[]): string[] {
  const lowered = MONEY_WORDS;

  return names.filter(
    (name) => lowered.some((word) => name.toLowerCase().includes(word)),
  );
}

/**
 * Every member name a summary answers, at all three levels.
 *
 * @param summary - What {@link summariseSpend} answered.
 * @returns The distinct names, sorted: the summary's own, its
 *   window's, and every bucket's.
 */
function answeredMembers(summary: SpendSummary): string[] {
  const names = [
    ...Object.keys(summary),
    ...Object.keys(summary.window),
    ...summary.buckets.flatMap((bucket) => Object.keys(bucket)),
  ];

  return [...new Set(names)].sort();
}

/**
 * Every member name the answer is expected to carry.
 *
 * WRITTEN OUT, so a member ADDED to any of the three levels is a
 * red case here rather than a name nobody swept — which is what
 * the money roster above could never report on its own, being a
 * list of what a member must not be called.
 */
const ANSWERED_MEMBERS: readonly string[] = [
  'buckets',
  'calls',
  'day',
  'domainId',
  'estTokens',
  'promptChars',
  'sinceInclusive',
  'untilExclusive',
  'window',
];

/** A stamp the ordering cases send as the earlier bound. */
const ORDERED_SINCE = '2026-03-01T00:00:00.000Z';

/** The instant it names, built without the parser under test. */
const ORDERED_SINCE_AT = new Date(Date.UTC(2026, 2, 1, 0, 0, 0));

/** The stamp they send as the later one. */
const ORDERED_UNTIL = '2026-03-02T00:00:00.000Z';

/** The instant that one names, on the same terms. */
const ORDERED_UNTIL_AT = new Date(Date.UTC(2026, 2, 2, 0, 0, 0));

/** A lower bound one millisecond past the widest legal span. */
const OVER_WIDE_SINCE = new Date(NOW.getTime() - MAX_SPAN_MS - 1);

/** A lower bound at exactly that span, which is accepted. */
const AT_MAX_SINCE = new Date(NOW.getTime() - MAX_SPAN_MS);

// ---------------------------------------------------------------------------
// A window wider than the maximum
// ---------------------------------------------------------------------------

describe('a window wider than the maximum', () => {
  it('refuses a span above the maximum', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const overWide = { since: OVER_WIDE_SINCE, until: NOW };
    const refusal = await refusalFrom(
      () => summariseSpend(store, clock.now, overWide),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'window_too_wide' },
    ]);

    // The positive control, varied along this row's own axis by ONE
    // MILLISECOND: the same request with the span exactly at the
    // maximum is answered. A module refusing every window passes
    // every assertion above and fails this one, and the pair is
    // what says the comparison is strictly greater rather than
    // refusing the widest span the constant documents as allowed.
    const atMax = { since: AT_MAX_SINCE, until: NOW };
    const summary = await summariseSpend(store, clock.now, atMax);

    expect(summary.window).toEqual({
      sinceInclusive: AT_MAX_SINCE,
      untilExclusive: NOW,
    });
    expect(callsIn(summary.buckets)).toBeGreaterThan(0);
  });

  it('reads nothing at all before it refuses', async () => {
    // The ordering claim, which no assertion on a status can make:
    // a span check moved below the lookup answers the same 422
    // having already asked `domains` about a slug, and one moved
    // below the aggregate having scanned the ledger it exists to
    // bound. Counted rather than asserted absent, and the control
    // is the same tally over a window one millisecond narrower.
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const refused = countingStore(store);
    const overWide = {
      since: OVER_WIDE_SINCE,
      until: NOW,
      domain: RADAR,
    };

    await refusalFrom(
      () => summariseSpend(refused.counted, clock.now, overWide),
    );

    expect(refused.calls).toEqual(NO_READS);
    expect(refused.asked).toEqual([]);

    const answered = countingStore(store);
    const atMax = { since: AT_MAX_SINCE, until: NOW, domain: RADAR };

    await summariseSpend(answered.counted, clock.now, atMax);

    expect(answered.calls).toEqual({
      findDomainBySlug: 1,
      summariseSpend: 1,
    });

    // And neither request read the clock, both having named their
    // own upper bound.
    expect(clock.reads()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A domain slug that names no row
// ---------------------------------------------------------------------------

describe('a domain slug that names no row', () => {
  it('answers 404', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const refusal = await refusalFrom(
      () => summariseSpend(store, clock.now, { domain: MISSING_SLUG }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers a summary for a slug that is', async () => {
    // The positive control for the case above, varied along the one
    // axis under test: the same request, a slug that resolves.
    const { store, radarId, siblingId } = await plantSpend();
    const clock = clockAt(NOW);
    const radar = await summariseSpend(store, clock.now, {
      domain: RADAR,
    });

    expect(readingsOf(radar.buckets)).toEqual([
      {
        domainId: radarId,
        day: DAY_BEFORE,
        calls: 1,
        promptChars: 100,
        estTokens: 25,
      },
      {
        domainId: radarId,
        day: DAY_AFTER,
        calls: 1,
        promptChars: 200,
        estTokens: 50,
      },
    ]);

    // And the other domain answers its own calls, which is what
    // makes the reading above a scoping one rather than a rendering
    // of everything planted: a store that had stopped taking the
    // filter answers four buckets to both of these.
    const sibling = await summariseSpend(store, clock.now, {
      domain: SIBLING,
    });

    expect(readingsOf(sibling.buckets)).toEqual([{
      domainId: siblingId,
      day: DAY_SIBLING,
      calls: 1,
      promptChars: null,
      estTokens: null,
    }]);
  });

  it('reads no ledger before it refuses', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const refused = countingStore(store);

    await refusalFrom(
      () => summariseSpend(refused.counted, clock.now, {
        domain: MISSING_SLUG,
      }),
    );

    expect(refused.calls).toEqual({ ...NO_READS, findDomainBySlug: 1 });
    expect(refused.asked).toEqual([]);

    const answered = countingStore(store);

    await summariseSpend(answered.counted, clock.now, { domain: RADAR });

    expect(answered.calls).toEqual({
      findDomainBySlug: 1,
      summariseSpend: 1,
    });

    // And an ABSENT `?domain` asks `domains` nothing at all, which
    // is the widening path and the only reading in this file that
    // can report a resolver looking up a slug nobody sent.
    const widened = countingStore(store);

    await summariseSpend(widened.counted, clock.now, {});

    expect(widened.calls).toEqual({ ...NO_READS, summariseSpend: 1 });
  });
});

// ---------------------------------------------------------------------------
// The query the boundary refuses
// ---------------------------------------------------------------------------

describe('the query the boundary refuses', () => {
  it('refuses a since at or after its until', () => {
    const inverted = refusalFromQuery({
      since: ORDERED_UNTIL,
      until: ORDERED_SINCE,
    });

    expect(inverted.statusCode).toBe(422);
    expect(detailsOf(inverted.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'custom' },
    ]);

    // Equal bounds are the same refusal. Under half-open semantics
    // such a window holds nothing, so a caller that sent one stamp
    // twice meant a day rather than nothing.
    const equal = refusalFromQuery({
      since: ORDERED_SINCE,
      until: ORDERED_SINCE,
    });

    expect(detailsOf(equal.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'custom' },
    ]);

    // The control, varied along this row's own axis: the same pair
    // the right way round parses. It is sent through the COMPOSED
    // schema rather than through the window schema alone, because
    // `.extend()` carries an object-level check outwards and never
    // inwards — a case driving the base would stay green through a
    // composition built the other way round.
    const parsed = parseQuery(spendQuerySchema, {
      since: ORDERED_SINCE,
      until: ORDERED_UNTIL,
    });

    expect(parsed.since).toEqual(ORDERED_SINCE_AT);
    expect(parsed.until).toEqual(ORDERED_UNTIL_AT);
  });

  it('refuses a domain that could not be a slug', () => {
    const refusal = refusalFromQuery({ domain: UNSHAPED_DOMAIN });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'domain', code: 'invalid_format' },
    ]);

    // The control: the same value respelt into a shape a slug can
    // have parses. Whether a row carries it is a question only a
    // store can answer, and this boundary does not ask it.
    const parsed = parseQuery(spendQuerySchema, {
      domain: UNSHAPED_DOMAIN.toLowerCase(),
    });

    expect(parsed.domain).toBe(UNSHAPED_DOMAIN.toLowerCase());
  });

  it('refuses a page parameter it does not declare', () => {
    // This route reads no page at all, so `?page` is undeclared
    // rather than merely unused — and on a strict shape that is a
    // 422 naming the container instead of a parameter quietly
    // dropped. The detail names `query` and not the submitted key.
    const refusal = refusalFromQuery({ page: '2' });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'query', code: 'unrecognized_keys' },
    ]);

    // The control: the three parameters it DOES declare parse.
    const parsed = parseQuery(spendQuerySchema, {
      since: ORDERED_SINCE,
      until: ORDERED_UNTIL,
      domain: MISSING_SLUG,
    });

    expect(Object.keys(parsed).sort()).toEqual([
      'domain',
      'since',
      'until',
    ]);
  });
});

// ---------------------------------------------------------------------------
// The window a caller left open
// ---------------------------------------------------------------------------

describe('the window a caller left open', () => {
  it('reads the last thirty days by default', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const watched = countingStore(store);
    const summary = await summariseSpend(watched.counted, clock.now, {});

    // What the STORE was handed, which is the only reading of a
    // default there is: a window this module chose and one the
    // caller sent produce answers of the same shape, and only the
    // argument separates them.
    expect(watched.asked).toEqual([{
      filter: {},
      window: {
        sinceInclusive: DEFAULT_SINCE,
        untilExclusive: NOW,
      },
    }]);

    // And the same span travels back, so a caller that sent no
    // bounds can see which one it was answered over rather than
    // inferring it from the days that happen to carry calls.
    expect(summary.window).toEqual({
      sinceInclusive: DEFAULT_SINCE,
      untilExclusive: NOW,
    });

    // Read over ROWS as well as over the argument: the call made
    // sixty-four days ago falls outside the default window, and its
    // day is not in the answer.
    expect(daysIn(summary.buckets)).toEqual([
      DAY_BEFORE,
      DAY_AFTER,
      DAY_NOBODY,
      DAY_SIBLING,
    ]);

    // The control, varied along this row's own axis: the same
    // request naming a window wide enough DOES answer that day. A
    // module ignoring the bounds altogether answers it to both.
    const wide = await summariseSpend(store, clock.now, {
      since: WIDE_SINCE,
    });

    expect(daysIn(wide.buckets)).toEqual([
      DAY_OLD,
      DAY_BEFORE,
      DAY_AFTER,
      DAY_NOBODY,
      DAY_SIBLING,
    ]);

    // And the clock was read once per request and no more: two
    // reads could differ, and the second would be the instant the
    // caller is told about while the first is the one the ledger
    // was aggregated over.
    expect(clock.reads()).toBe(2);
  });

  it('closes an open bound against the other', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const closed = countingStore(store);
    const until = new Date(Date.UTC(2026, 2, 6, 0, 0, 0));

    await summariseSpend(closed.counted, clock.now, { until });

    // An `until` alone closes BELOW it by the default span, and
    // leaves the clock unread — the request named its own upper
    // bound, so there is nothing here that depends on when it
    // arrived.
    expect(closed.asked).toEqual([{
      filter: {},
      window: {
        sinceInclusive: new Date(until.getTime() - DEFAULT_SPAN_MS),
        untilExclusive: until,
      },
    }]);
    expect(clock.reads()).toBe(0);

    // A `since` alone closes ABOVE it at the clock, which is what
    // stops `everything since` being a scan of the whole ledger and
    // what makes the span refusable at all.
    const open = countingStore(store);

    await summariseSpend(open.counted, clock.now, { since: WIDE_SINCE });

    expect(open.asked).toEqual([{
      filter: {},
      window: {
        sinceInclusive: WIDE_SINCE,
        untilExclusive: NOW,
      },
    }]);
    expect(clock.reads()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The day the bucket is keyed by
// ---------------------------------------------------------------------------

describe('the day the bucket is keyed by', () => {
  it('splits two calls either side of UTC midnight', async () => {
    const { store, radarId } = await plantSpend();
    const clock = clockAt(NOW);

    // The two calls are ONE MILLISECOND apart, so nothing but the
    // truncation can separate them and a bucket that came out
    // right did so for the reason under test.
    expect(AFTER_MIDNIGHT.getTime() - BEFORE_MIDNIGHT.getTime()).toBe(1);

    const summary = await summariseSpend(store, clock.now, {
      domain: RADAR,
    });

    // Two buckets, each holding one call, keyed by the UTC day the
    // call falls on and not by the day it falls on anywhere else.
    // The expected days are written out as the instants that OPEN
    // them, which is what `SpendBucket.day` promises.
    expect(readingsOf(summary.buckets)).toEqual([
      {
        domainId: radarId,
        day: DAY_BEFORE,
        calls: 1,
        promptChars: 100,
        estTokens: 25,
      },
      {
        domainId: radarId,
        day: DAY_AFTER,
        calls: 1,
        promptChars: 200,
        estTokens: 50,
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// The calls that belong to nobody
// ---------------------------------------------------------------------------

describe('the calls that belong to nobody', () => {
  it('buckets them under a null domain', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const every = await summariseSpend(store, clock.now, {});
    const nobody = every.buckets.filter(
      (bucket) => bucket.domainId === null,
    );

    // ONE bucket, holding BOTH kinds of unattributed call: the
    // tick's, whose run named no domain, and the one that named no
    // run at all. They fall on one UTC day, so a summary that
    // dropped either answers a count of one here. The two sums are
    // taken separately, so a bucket measured on one axis alone
    // contributes to one of them.
    expect(readingsOf(nobody)).toEqual([{
      domainId: null,
      day: DAY_NOBODY,
      calls: 2,
      promptChars: 7,
      estTokens: 3,
    }]);

    // Narrowing excludes both, correctly: neither is that domain's.
    const radar = await summariseSpend(store, clock.now, {
      domain: RADAR,
    });
    const sibling = await summariseSpend(store, clock.now, {
      domain: SIBLING,
    });

    expect(daysIn(radar.buckets)).not.toContain(DAY_NOBODY);
    expect(daysIn(sibling.buckets)).not.toContain(DAY_NOBODY);

    // The partition, which no single narrowed summary can report: a
    // filter that had stopped being applied answers every narrowed
    // summary plausibly, and only the arithmetic catches it. The
    // two domains together fall SHORT of the unnarrowed answer by
    // exactly the calls belonging to nobody, which is the positive
    // form of this wave's decision that no spelling of `?domain`
    // asks for those calls alone.
    const narrowed = callsIn(radar.buckets) + callsIn(sibling.buckets);

    expect(callsIn(every.buckets)).toBe(narrowed + 2);
    expect(callsIn(every.buckets)).toBeGreaterThan(narrowed);
  });
});

// ---------------------------------------------------------------------------
// What the summary answers
// ---------------------------------------------------------------------------

describe('what the summary answers', () => {
  it('names no member for money', async () => {
    const { store } = await plantSpend();
    const clock = clockAt(NOW);
    const summary = await summariseSpend(store, clock.now, {});

    // The roster really came off an answer with buckets in it: a
    // member sweep over an empty list reports nothing while reading
    // nothing, which is the shape a zero-hit scan fails in.
    expect(summary.buckets.length).toBeGreaterThan(0);

    // Written out rather than counted, so a member ADDED at any of
    // the three levels is a red case here rather than a name
    // nobody swept.
    expect(answeredMembers(summary)).toEqual([...ANSWERED_MEMBERS]);
    expect(moneyMembersIn(answeredMembers(summary))).toEqual([]);

    // The control: the same classifier over the same roster plus
    // the two members `docs/architecture/08-http-api.md` names this
    // surface as most likely to grow REPORTS them, so the zero
    // above is a reading rather than a matcher that had stopped
    // matching.
    const planted = [
      ...answeredMembers(summary),
      'estimatedCostUsd',
      'ratePerCall',
    ];

    expect(moneyMembersIn(planted)).toEqual([
      'estimatedCostUsd',
      'ratePerCall',
    ]);
  });
});

// ---------------------------------------------------------------------------
// What the refusals carry
// ---------------------------------------------------------------------------

describe('what the refusals carry', () => {
  it('quotes nothing a caller submitted', async () => {
    const planted = await plantSpend();

    planted.store.setRuns([...planted.runs, ORPHAN_PASS]);
    planted.store.setLlmCalls([
      ...PLANTED_CALLS.map(ledgered),
      ORPHAN_CALL,
    ]);

    const clock = clockAt(NOW);

    // The stored needle really is within reach of the refusal that
    // reads anything: a call carrying it is filed under a domain id
    // no `domains` row carries, and the port answers it to whoever
    // asks directly. Without this the search below is a search over
    // nothing planted.
    const orphans = await planted.store.summariseSpend(
      { domainId: MISSING_DOMAIN_ID },
      { sinceInclusive: WIDE_SINCE, untilExclusive: NOW },
    );

    expect(callsIn(orphans)).toBe(1);

    const notFound = await refusalFrom(
      () => summariseSpend(planted.store, clock.now, {
        domain: MISSING_SLUG,
      }),
    );

    expect(leaksIn(notFound, MISSING_SLUG)).toEqual([0, 0, 0]);
    expect(leaksIn(notFound, SENTINEL_NODE)).toEqual([0, 0, 0]);

    const overWide = {
      since: OVER_WIDE_SINCE,
      until: NOW,
      domain: MISSING_SLUG,
    };
    const tooWide = await refusalFrom(
      () => summariseSpend(planted.store, clock.now, overWide),
    );

    expect(leaksIn(tooWide, OVER_WIDE_SINCE.toISOString())).toEqual([
      0,
      0,
      0,
    ]);
    expect(leaksIn(tooWide, MISSING_SLUG)).toEqual([0, 0, 0]);

    // What it DOES name is the maximum, which is this module's own
    // constant: a caller learns what it may ask for rather than
    // being told back what it asked.
    const details = (tooWide.details ?? []) as FieldError[];
    const maximum = String(SPEND_MAX_WINDOW_DAYS);
    const messages = details.map((detail) => detail.message);

    expect(detailsOf(details)).toEqual([
      { field: 'since', code: 'window_too_wide' },
    ]);
    expect(messages.join(' ')).toContain(maximum);

    // The control for every zero above, counted by the same helper
    // in the same case: a refusal leaking all three needles through
    // all three channels is REPORTED. Read as booleans rather than
    // as counts, a stack repeating its own message making an exact
    // figure a flake waiting.
    const needles = [
      MISSING_SLUG,
      SENTINEL_NODE,
      OVER_WIDE_SINCE.toISOString(),
    ];
    const leaking = leakingRefusal(needles);
    const found = needles.map(
      (needle) => leaksIn(leaking, needle).map((count) => count > 0),
    );

    expect(found).toEqual([
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ]);
  });
});
