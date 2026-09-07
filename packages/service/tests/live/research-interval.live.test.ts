/**
 * The per-entity research interval, run against a real Postgres over
 * the statements a build of the two raisers ships. Self-skips when
 * AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * Both raisers refuse to raise an intention about a subject whose own
 * `research_pool` row is closed at `done` with a `researched_at`
 * inside the window its domain sets, and the refusal is written into
 * the SQL rather than into anything that calls it, so every caller of
 * either workflow inherits it. What that buys costs a rule stated
 * only inside a string: nothing in this package evaluates one, and
 * the roster in `tests/invariants/pool-sql.ts` asks only that the
 * statement NAME the pool timestamp and the window beside each other
 * — a guard comparing the two the wrong way round carries both
 * names and leaves that entry green, which its own `property` member
 * says in as many words. This file is what puts the comparison to a
 * server.
 *
 * Three window rows per raiser per hand-over, and the two that raise
 * are the controls the one that refuses cannot do without. A refusal
 * is an absence, so a statement that raised nothing at all — a term
 * guard that stopped matching, a payload this file spells wrongly, a
 * batch that reached no finding — satisfies it exactly as the rule
 * does. The two controls vary the two OPERANDS of the comparison and
 * nothing else: one moves the pool timestamp back past the window and
 * must raise, the other leaves the timestamp where it is and sets the
 * domain's own window to zero and must raise. Each is otherwise the
 * same seed, spread from the refusal's own literal, so the axis is
 * visible in the table rather than asserted about it.
 *
 * The pair also reaches both branches of the window expression with
 * no case of its own. The refusing row's domain declares no
 * `minResearchIntervalSeconds`, so the number it is refused by is the
 * build's own fallback and a `CASE` answering NULL there would leave
 * the comparison NULL and the subject raised. The row that sets the
 * member to zero is refused by nothing, and would be refused by the
 * fallback if the settings branch were not read. So the two
 * directions of one comparison and the two sources of one number are
 * one grid of three.
 *
 * Both raisers rather than one standing in for the other, because
 * they source the subject differently. `ar-ingest` reads
 * `findings.entity_id` off the row it is raising from; `ar-score`
 * reads an `entity_id` its payload carries beside the finding id.
 * That is also the whole of what makes the guard live here for a
 * workflow the pipeline leaves it inert in: `ar-ingest` writes
 * findings with no entity today, so its guard sees NULL and never
 * fires, while the statement itself is perfectly able to refuse and
 * this file seeds the column to show it. What is claimed here is a
 * property of the statement, not a prediction about the pass.
 *
 * The other axis is the run an intention is stamped with, and it is
 * the hand-over rather than the window that moves it. Both raisers
 * write `research_pool.root_event_id`, and both read it off a value
 * the pass already resolved rather than looking one up: `ar-ingest`
 * binds the run its own dispatcher opened, and `ar-score` binds
 * whatever a caller put on the hand-over item. So the two can be
 * handed different things, and this file drives every hand-over each
 * of them can express.
 *
 * `ar-ingest` expresses one. Its node resolves the run out of Load
 * Domain Context and binds it bare, and that same parameter is the
 * `ingest_run_id` it answers with, so there is no state of that
 * canvas under which it names none. A drive binding NULL there would
 * be driving a value the expression cannot produce: a member
 * resolving to nothing at all binds the string `undefined` rather
 * than a null, which the cast refuses outright. What that node says
 * about the column is that it cannot write anything but the
 * dispatcher's run, and this file drives that rather than a state
 * contradicting it.
 *
 * `ar-score` expresses both, which is what makes the NULL reachable
 * here at all. Its hand-over member is stringified before it is
 * bound, so a pass carrying no run binds the JSON null literal and
 * the CTE in front of the insert answers NULL for it. A pull-path
 * pass carries the run `ar-ingest` opened; a capture-initiated pass
 * carries none, `ar-capture` opening its `runs` row in the node that
 * closes the pass. Both are ordinary, and the column says as much: a
 * NULL there is no originating run recorded rather than a gap.
 *
 * The stamp is read back off the stored row rather than off the
 * statement's `RETURNING`, for the reason the outcome above is read
 * twice. What a statement says it raised and what the table holds are
 * two readings, and a value that never reached the column is exactly
 * the shape either one alone would miss.
 *
 * The run is planted apart from every other id its seed writes, and
 * that is the precondition without which the stamp reading proves
 * nothing. Sequences start at one apiece, so a seed planting one
 * domain and one run gives both the id 1, and a statement stamping
 * the domain would be indistinguishable from one stamping the run.
 * Two filler runs per seed put the run ahead of every id beside it,
 * and the case below reads that rather than assuming it. They sit on
 * the seed's own domain as well, so the stamp naming the run handed
 * over rather than merely some run of that domain is a reading.
 *
 * The third axis is the batch, and it is the one neither grid above
 * can be read for. Both drive a single subject, so every list either
 * statement answers with holds nothing or holds that subject, and a
 * projection naming one subject in two of them would look exactly
 * like a projection naming it in the right one. What a raise answers
 * is three lists over the subjects it called searchable — what it
 * raised, what the repeat guard refused and what the interval guard
 * refused — and the close statement downstream turns their lengths
 * into three of the run's own counts. A batch is what puts that
 * partition to a server.
 *
 * Four subjects, and the fourth is the whole of what makes the sum a
 * reading. One per guard says the two lists are answered at all; one
 * that BOTH guards refuse is the subject a statement could count
 * twice, where three subjects each tripping one guard sum correctly
 * under a classifier that had stopped being exclusive. It carries the
 * precedence with it as well: both guards refuse it, and the repeat
 * list is where the raise statements put it.
 *
 * The second batch is the zero, and nothing in it is refused at all.
 * Both suppression lists have to come back EMPTY rather than absent,
 * because what the tally downstream turns into a count is a length
 * and `jsonb_agg` over no rows answers NULL. Only the `COALESCE` in
 * front of each projection separates a `0` a reader can find from a
 * key nobody wrote, so a reading here that coerced a null to an empty
 * list would report the fault that coalesce exists for as the rule
 * working.
 *
 * The grid this file was measured against is thirteen legs, each
 * applied, run and reverted. Eleven rewrite the shipped SQL in one
 * source or in both and two rewrite the seed here, and what a leg
 * is worth is WHICH labels moved rather than that the run went red.
 * The nine window drives carry two readings apiece and the four
 * batch drives carry a record of five, so a label can move in the
 * outcome table, in the stamp table, in the batch table, or in more
 * than one of them.
 *
 * Four are the window's. Removing the guard outright reddens the
 * three `researched inside the window` labels in both tables, the
 * guarded-node reading in the first case besides — the words that
 * case looks for leave the statement along with the guard, so there
 * is no removal of it that case can survive — and the two batch
 * drives whose interval subject then comes back raised. Dropping
 * the window out of the comparison, so that any closed row refuses,
 * reddens the six accepting labels in both tables and nothing else.
 * Those two label sets are DISJOINT and together they are every
 * window drive there is: the refusals and their controls defend
 * different halves of one rule rather than the controls riding
 * along on the refusals.
 *
 * Misspelling the settings member, which leaves the fallback
 * standing for every domain, reddens the three `a window of zero`
 * labels alone — and leaves the first case GREEN, the alias its
 * guard words name surviving in the CTE above. That is the leg this
 * file is worth: the roster next door requires those same phrases
 * and is green through it too, so a window read off the wrong place
 * is a change nothing short of a server reports.
 *
 * The fourth is the seed's rather than the pipeline's. Leaving the
 * planted pool row at `pending` reddens the closed-row reading and
 * the three `researched inside` labels together, which is what says
 * that reading is live rather than a restatement of the plant.
 *
 * Three of those four leave the batch table alone, and that is a
 * reading rather than a gap. Every batch seeds its closed rows at
 * one offset under a domain declaring no window, so nothing there
 * varies either operand of the comparison: the window grid is where
 * that axis lives, and the batch grid is where the lists do.
 *
 * Four more are the stamp's, and what those report is a
 * RELATIONSHIP between their label sets rather than four exit
 * codes. The nine drives carry three stamp readings between them:
 * three raise nothing at all, four expect the run their caller
 * named, and two expect nothing stamped.
 *
 * Dropping `root_event_id` out of both INSERTs reddens the four
 * labels expecting a run and leaves the two expecting NULL alone,
 * which is the whole of what a column that stopped being written
 * looks like from here. Misspelling the guard in `ar-score`'s run
 * CTE, so the value bound for it never matches and every pass
 * stamps NULL, reddens two of those four. Binding the domain where
 * `ar-ingest` binds the run reddens the other two. So the second
 * and the third PARTITION the first by raiser, which is what says
 * each raiser's stamp is defended by a reading of its own rather
 * than by the pair riding on one.
 *
 * The eighth is the seed's again, and it is the one that says the
 * apartness reading is load-bearing rather than decoration. Binding
 * the domain a second time with the filler runs removed leaves the
 * stamp GREEN on all nine drives, the domain and the run being the
 * same number for a seed that planted one of each, and moves the
 * apartness member alone — on all nine. A wrong parameter is
 * invisible to a stamp reading whose ids were never forced apart,
 * and this is the leg that measures that rather than the argument
 * for it. None of the stamp's four reaches the batch table either,
 * those drives naming a run and reading nothing off what it
 * stamped.
 *
 * Five are the batch's, and what they report is which MEMBER of the
 * record moved rather than which drive: two of them move the same
 * pair of drives and nothing else tells them apart. Swapping the
 * two bucket literals in the outer projections moves all three
 * suppressed subjects, the interval count from one to two and the
 * repeat count from two to one. Killing the classifier's repeat
 * arm, so a subject the repeat guard refused falls through to the
 * remainder, moves two subjects, the repeat count to nought and the
 * interval count to three. The subject both guards refuse changes
 * list under either, which is what makes the precedence the thing
 * separating them.
 *
 * The sum has two legs of its own and it needs them, holding
 * unmoved under every leg above: the per-subject buckets are what
 * carries this case, and the two counts beside them are weak on
 * their own. Widening the interval list to every suppressed subject
 * answers six bucketed subjects over four searchable ones and names
 * two subjects in both lists at once. Emptying the searchable list
 * answers nought searchable against one bucketed and calls every
 * subject unsearchable, the raisable one having gained its row all
 * the same, and it is the only batch leg that reaches all four
 * drives. Those are the two directions a partition comes apart in,
 * and they are what make the two anomaly words in the bucket
 * vocabulary something this file has seen rather than branches
 * nothing reaches.
 *
 * The last is the zero's, and it is the narrowest leg here.
 * Dropping the `COALESCE` off both suppression projections reddens
 * the two batch drives nothing suppresses and NOTHING else: the two
 * mixed batches answer non-empty lists either way, and the nine
 * window drives never read those projections at all. What moves is
 * both counts, from a zero to no list at all, which is the whole
 * distinction the close statement downstream rests on.
 *
 * The statements come out of `workflows/dist/` and never
 * `workflows/src/`. A source carries `__ENVVAR:` markers where the
 * artifact carries the number one resolved to, so the window in the
 * text under `src/` is not a number at all — and what an instance
 * runs is the artifact rather than what a source said before a build.
 * That artifact is rebuilt in front of the drive rather than read
 * where it lies: `pretest` builds it before the default suite and
 * bun's hook is exact-name scoped, so `bun run test:live` fires none
 * and the tree on disk is otherwise whatever last built it. The build
 * is a subprocess rather than a call for the reason
 * `tests/live/schedule-clamp.live.test.ts` records, a vitest worker
 * having no `Bun.Transpiler` for the Code node splice to run through.
 *
 * The window the two fallback rows are placed either side of is read
 * from `ENV_DEFAULTS` rather than written out. That table is what the
 * default build resolves the marker from, so the seconds this file
 * plants and the number the statement compares them against come from
 * one place; a fleet default moved in that table moves both sides
 * together, where a literal here would quietly stop straddling it.
 *
 * Everything runs inside one transaction, rolled back at the end, and
 * that is what makes the comparison exact rather than close. `now()`
 * is fixed for every statement inside one, so a row planted at
 * `now() - '302400 seconds'` is read by the guard as exactly 302400
 * seconds old and not that minus a round trip — which at half a
 * window is a precision nothing here would notice going wrong, and is
 * the reason it is not rested on.
 *
 * Everything this file does sits inside the gate rather than beside
 * it. `describeLivePg` binds a `describe` and nothing above one, so
 * module scope runs on the skipped branch too, on every
 * `bun run test`: a build spawned or a connection opened at module
 * scope would run inside the isolated suite. So module scope here
 * holds constants and pure functions, and the drive is in
 * `beforeAll`.
 */
import type { BuiltWorkflow, BuiltWorkflowNode } from '../invariants/workflow-dist.js';
import type { Pool, PoolClient } from 'pg';

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ENV_DEFAULTS } from '../../scripts/workflow-markers.js';
import { normalizeEntityName } from '../../src/lib/entity-name-norm.js';
import { sqlWords } from '../invariants/dispatch-sql.js';
import { loadBuiltWorkflows } from '../invariants/workflow-dist.js';
import { queryParametersOf } from '../invariants/workflow-rosters.js';

import {
  applyMigrations,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The build entry point, resolved from this file's own location
 * rather than from the working directory.
 *
 * The suite is launched from the package and from the repo root
 * alike, and only one of those makes a relative path name this
 * script.
 */
const BUILD_ENTRY = fileURLToPath(
  new URL('../../scripts/build-workflows.ts', import.meta.url),
);

/** The prefix of every line that build prints an artifact on. */
const BUILT_LINE = 'built ';

/** What {@link runBuild} reports for a run that completed. */
const BUILD_RAN = 'exit 0';

/**
 * The setting the fleet fallback is read from, spelled once.
 *
 * The name a marker in either raiser's source carries, so the number
 * this table answers with is the number the build wrote into the
 * artifact the drive runs.
 */
const FLEET_WINDOW_SETTING = 'AR_RESEARCH_MIN_INTERVAL_SECONDS';

/**
 * The words a statement applying the interval guard carries.
 *
 * Read through {@link sqlWords}, which drops the `--` comments before
 * it reads a word. Both of these statements argue the guard at length
 * in prose — they are better than four fifths comment by character
 * — so a reading of the raw text would answer for the argument as
 * readily as for the expression.
 *
 * Four words rather than the window alias alone. The alias says a
 * window was computed, `researched_at` and `epoch` say a pool
 * timestamp is being measured against something, and `done` says
 * which rows are counted; a statement naming the window and none of
 * the rest has not compared anything to it.
 */
const INTERVAL_GUARD_WORDS: readonly string[] = [
  'done',
  'epoch',
  'min_research_interval_seconds',
  'researched_at',
];

/**
 * What a raise statement can do with a subject, and the whole of it.
 *
 * Total over every reading, so a drive whose two halves disagree
 * names its own shape instead of being absorbed into one of the two
 * a case expects.
 */
const RAISED = 'raised';
const REFUSED = 'refused';

/**
 * What a raise statement can do with the run its caller named, and
 * the whole of that too.
 *
 * Total for the reason the pair above is: a drive that stamped a
 * number which is neither the run handed over nor nothing at all
 * names what it did rather than being read as one of the two.
 */
const NOTHING_RAISED = 'nothing raised';
const STAMPED_THE_RUN = 'stamped the run handed over';
const STAMPED_NOTHING = 'stamped nothing';

/**
 * The terms every seeded finding carries.
 *
 * One string member, which is what the raise reads a term off: the
 * statements build `search_terms` out of the string members of
 * `findings.fields` and refuse a finding yielding none, so a payload
 * with no string here would be refused by the term guard and read
 * exactly like a refusal by the window.
 *
 * The same list on the finding that was already researched and on the
 * one being raised, the two rows differing in nothing this file does
 * not vary on purpose.
 */
const SEEDED_FIELDS = { subject: 'chromium supply agreements' } as const;

/**
 * The fleet fallback, in seconds, refused rather than read off
 * nothing.
 *
 * Two refusals rather than one. An absent entry would arrive as `NaN`
 * and every offset derived from it would plant a row at an invalid
 * timestamp, which surfaces as a failed seed rather than as a table
 * this file can no longer straddle. And a fallback of zero would put
 * the refusing row's offset at zero too, so the row that has to be
 * refused would be raised and the grid below would be reporting
 * arithmetic rather than the guard.
 *
 * @returns The seconds a domain declaring no window is held to.
 * @throws Error When the table names no such setting, or names it at
 * something no window can be placed either side of.
 */
function fleetWindowSeconds(): number {
  const declared = ENV_DEFAULTS[FLEET_WINDOW_SETTING];
  const seconds = Number(declared);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(
      `[research-interval] ENV_DEFAULTS answers ${String(declared)} for ` +
      `${FLEET_WINDOW_SETTING}, which is not a window a subject can be ` +
      'planted either side of. Every offset below is derived from it, ' +
      'so the grid would be reporting its own arithmetic rather than ' +
      'the guard the statements carry.',
    );
  }

  return seconds;
}

/** The window a domain declaring none is held to, in seconds. */
const FLEET_WINDOW_SECONDS = fleetWindowSeconds();

/**
 * One seed this file drives a raise over: what the domain declares,
 * how long ago the subject was last researched, and what the
 * statement has to do about it.
 *
 * The two rows that raise are spread from the one that is refused, so
 * a member added here reaches all three and the axis each control
 * varies stays the only thing that separates it from the refusal.
 */
interface WindowScenario {
  /** What the row is called in a failure, and in the seed's slug. */
  readonly id: string;

  /**
   * The window the domain's own `settings` declare, or `null` where
   * it declares none and the build's fallback stands.
   */
  readonly domainWindowSeconds: number | null;

  /** How long before the drive the subject was last researched. */
  readonly researchedAgoSeconds: number;

  /** What the statement has to do with it. */
  readonly outcome: string;
}

/**
 * The row the two controls are varied from: a domain declaring no
 * window of its own, and a subject researched half the fleet fallback
 * ago.
 *
 * Half rather than some smaller offset because the reading has to
 * survive the fallback moving: any positive fraction under one is
 * inside whatever window the table declares, where a fixed number of
 * seconds would fall outside a fallback somebody shortened.
 */
const RESEARCHED_INSIDE: WindowScenario = {
  id: 'researched inside the window',
  domainWindowSeconds: null,
  researchedAgoSeconds: Math.floor(FLEET_WINDOW_SECONDS / 2),
  outcome: REFUSED,
};

/**
 * The three rows each raise statement is driven over.
 *
 * The two controls are spread from {@link RESEARCHED_INSIDE} and each
 * overrides ONE member, which is the whole of what makes them
 * controls: the first moves the pool timestamp and the second the
 * window, and between them they vary both operands of the comparison
 * without varying anything else. A control written out separately
 * could drift from the refusal in a member neither case mentions, and
 * the grid would go on reading as a guard working.
 */
const WINDOW_SCENARIOS: readonly WindowScenario[] = [
  RESEARCHED_INSIDE,
  {
    ...RESEARCHED_INSIDE,
    id: 'researched outside the window',
    outcome: RAISED,
    researchedAgoSeconds: FLEET_WINDOW_SECONDS * 2,
  },
  {
    ...RESEARCHED_INSIDE,
    domainWindowSeconds: 0,
    id: 'a window of zero',
    outcome: RAISED,
  },
];

/**
 * What a caller names as the originating run of the intentions a
 * raise writes, and what a drive under it is called.
 *
 * A raiser declares the hand-overs it can be driven under rather than
 * this roster spanning both of them, because they do not both reach
 * both. `ar-score` reads the run off an item a caller put it on, and
 * a caller with none to put there is an ordinary pass; `ar-ingest`
 * resolves its own dispatcher's run and binds it bare, and has no
 * state under which it names none.
 */
interface Handover {
  /** What the drive is called in a failure, and in its seed's slug. */
  readonly id: string;

  /**
   * Whether the caller names a run at all.
   *
   * What the drive binds where a raiser reads one, and what the case
   * below expects to find stamped on whatever it raised.
   */
  readonly namesARun: boolean;
}

/**
 * The hand-over both raisers can be driven under: a caller naming the
 * run this pass belongs to.
 */
const RUN_HANDED_OVER: Handover = {
  id: 'a run handed over',
  namesARun: true,
};

/**
 * The hand-over only `ar-score` can be driven under: a caller that
 * names no run at all.
 *
 * This is where the NULL stamp is reachable, and it is reachable
 * because `ar-capture` opens its `runs` row in the node that closes
 * its pass — so at the moment it invokes the scorer there is no run
 * id in existence to hand over. The value bound for it is the JSON
 * null the node's own expression produces, which is what its
 * stringify is there for.
 */
const NO_RUN_HANDED_OVER: Handover = {
  id: 'no run handed over',
  namesARun: false,
};

/** Everything one seeded scenario wrote, as the drive reads it. */
interface PlantedSubject {
  /** The domain the seed's rows hang off. */
  readonly domainId: string;

  /** The subject both findings name. */
  readonly entityId: string;

  /**
   * Every other id this seed wrote, sorted by nothing and read for
   * one thing: whether the run above could be told from any of them.
   *
   * The stamp is a bigint and so is everything else here, so a
   * statement binding the wrong parameter writes a number of the
   * right shape. On a seed whose sequences all sat at one it would
   * write the right number as well, which is why the run is planted
   * past them and why the case below reads this rather than taking it
   * on trust.
   */
  readonly otherIds: readonly string[];

  /** The run a caller of this raise names, where the drive names one. */
  readonly runId: string;

  /** The finding the raise is driven over. */
  readonly subjectFindingId: string;
}

/**
 * One subject a payload names, as either raiser spells it.
 *
 * Both members on every subject, because the two raisers read the
 * subject from different places and one shape here has to serve
 * both: `ar-ingest` reads `findings.entity_id` off the row it is
 * raising from and its payload names the finding alone, while
 * `ar-score` reads an `entity_id` the item beside it carries.
 */
interface BoundSubject {
  /** The subject the finding is about. */
  readonly entityId: string;

  /** The finding an intention would be raised from. */
  readonly findingId: string;
}

/**
 * What a drive hands a raise statement: the subjects its payload
 * names, and the pass they were found in.
 *
 * One shape for a drive over a single subject and a drive over a
 * batch, so what each raiser is handed is spelled once. A batch
 * composing its own payload would be a second spelling of what the
 * canvas already fixes, and an expression that changed would go on
 * being driven the old way in whichever of the two was not edited.
 */
interface PayloadBinding {
  /** The domain the pass ran under. */
  readonly domainId: string;

  /** The run the pass belongs to. */
  readonly runId: string;

  /** Every subject the payload names, in the order it names them. */
  readonly subjects: readonly BoundSubject[];
}

/**
 * One raise statement this file drives: where to read it, and what
 * the node's own `queryReplacement` hands it.
 *
 * Keyed by the artifact AND the node name. Both raisers spell their
 * node `Raise Research Intentions`, so a lookup on the name alone
 * reads whichever artifact it meets first and this file would drive
 * one statement twice while reporting two.
 */
interface RaiseFixture {
  /** The built artifact the statement is read out of. */
  readonly artifact: string;

  /**
   * The hand-overs a caller of this raiser can make, and so the
   * drives this file makes over it.
   *
   * Declared per raiser rather than spanning both, because the two do
   * not reach the same set. Driving `ar-ingest` under a caller naming
   * no run would be driving a binding its own expression cannot
   * produce, which is a claim about neither the statement nor the
   * pass.
   */
  readonly handovers: readonly Handover[];

  /** The node running it, as the canvas spells it. */
  readonly nodeName: string;

  /**
   * The parameters the node's expression resolves to, for one drive.
   *
   * Written out per raiser rather than derived from the statement,
   * because the two bind different things: `ar-ingest` hands the
   * findings it wrote plus its run and domain, and `ar-score` hands a
   * pair per scored finding and nothing else. What each list stands
   * for is the `queryReplacement` on the node itself.
   *
   * Takes the subjects as a list rather than one at a time, which is
   * what lets the batch drives below reach these same two expressions
   * instead of writing a payload of their own.
   *
   * @param payload - The subjects to name, and the pass they sit in.
   * @param rootEventId - The run its caller names, or null for none.
   * @returns The bound values, in the order the statement takes them.
   */
  parameters(
    payload: PayloadBinding,
    rootEventId: string | null,
  ): readonly unknown[];
}

/**
 * The two raisers, and the statements this file drives.
 *
 * Written out rather than derived from the built tree, for the reason
 * a fixture always is: a statement over a shape nothing here knows
 * how to seed has no rows to answer about. What the artifact is read
 * for instead is whether this roster still covers every statement
 * carrying the guard, which is the first case below.
 */
const RAISE_FIXTURES: readonly RaiseFixture[] = [
  {
    artifact: 'ar-ingest.json',
    handovers: [RUN_HANDED_OVER],
    nodeName: 'Raise Research Intentions',
    // The run is bound as a bigint and read twice by the statement,
    // as the stamp on each row raised and as the ingest_run_id it
    // answers with. The hand-over is not a parameter of this one: the
    // node resolves the run itself, so a drive naming none would be
    // binding a value the canvas has no way to produce.
    parameters: (payload) => [
      JSON.stringify(payload.subjects.map((subject) => ({
        finding_id: subject.findingId,
      }))),
      payload.runId,
      payload.domainId,
    ],
  },
  {
    artifact: 'ar-score.json',
    handovers: [RUN_HANDED_OVER, NO_RUN_HANDED_OVER],
    nodeName: 'Raise Research Intentions',
    // The run is stringified before it is bound, exactly as the
    // node's own expression stringifies the hand-over member it reads
    // it off. That is what makes a caller naming none bind the JSON
    // null literal rather than nothing at all, which is one value
    // where an unresolved member would bind none and shift every
    // placeholder after it.
    parameters: (payload, rootEventId) => [
      JSON.stringify(payload.subjects.map((subject) => ({
        entity_id: subject.entityId,
        finding_id: subject.findingId,
      }))),
      JSON.stringify(rootEventId),
    ],
  },
];

/**
 * One drive: a raiser, the hand-over it is made under, and the window
 * row it is made over.
 */
interface Drive {
  /** The raiser driven. */
  readonly fixture: RaiseFixture;

  /** What its caller names as the originating run. */
  readonly handover: Handover;

  /** The window row it is driven over. */
  readonly scenario: WindowScenario;
}

/**
 * Every drive this file makes, spread once and read everywhere.
 *
 * The loop that makes the drives and the three tables that say what
 * each one had to do are all built off this list, so a drive present
 * in one and absent from another is not a shape this file can take.
 * It is not a full cross product: a raiser is driven over every
 * window row under each hand-over IT declares, and `ar-ingest`
 * declares one.
 */
const EVERY_DRIVE: readonly Drive[] = RAISE_FIXTURES.flatMap(
  (fixture) => fixture.handovers.flatMap(
    (handover) => WINDOW_SCENARIOS.map(
      (scenario) => ({ fixture, handover, scenario }),
    ),
  ),
);

/**
 * The nodes carrying the guard, written out rather than read off
 * either side.
 *
 * The case below holds the built tree's answer AND the roster's
 * against this, so a list derived from one of them would be that side
 * agreeing with itself.
 */
const GUARDED_NODE_LABELS: readonly string[] = [
  'ar-ingest.json: Raise Research Intentions',
  'ar-score.json: Raise Research Intentions',
];

/** Sorted copy, so an equality is over members rather than order. */
function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

/**
 * The label a node is reported under, and the key the roster above is
 * written in.
 *
 * A label to read rather than one to split: a node name carries
 * whatever the canvas says, and nothing stops one holding a colon.
 *
 * @param artifact - The built file it sits in.
 * @param nodeName - Its name on the canvas.
 * @returns The pair, as one label.
 */
function nodeLabel(artifact: string, nodeName: string): string {
  return `${artifact}: ${nodeName}`;
}

/**
 * The label one drive is reported under.
 *
 * Three parts rather than two, and the hand-over is the middle one.
 * Both raisers are driven over every window row and one of them is
 * driven over each row twice, so a label naming the artifact and the
 * row alone would name two drives and the record a case compares
 * would silently hold one of them.
 *
 * @param artifact - The raiser driven.
 * @param handoverId - What its caller named.
 * @param scenarioId - The row it was driven over.
 * @returns The three, as one label.
 */
function driveLabel(
  artifact: string,
  handoverId: string,
  scenarioId: string,
): string {
  return `${artifact}: ${handoverId}: ${scenarioId}`;
}

/**
 * The label one drive is reported under, read off the drive.
 *
 * @param drive - One member of {@link EVERY_DRIVE}.
 * @returns Its label.
 */
function labelOf(drive: Drive): string {
  return driveLabel(
    drive.fixture.artifact,
    drive.handover.id,
    drive.scenario.id,
  );
}

/**
 * The slug a seed's domain is stored under.
 *
 * `domains.slug` is unique and every seed here shares one
 * transaction, so two seeds under one slug would be refused on the
 * second insert — which arrives as a failed drive rather than as
 * anything about the guard. The drive's whole label is what makes it
 * distinct, the hand-over included: one raiser is driven over each
 * row twice and the two seeds have to be separate rows, or the second
 * drive would meet the first one's pool row and be refused by the
 * repeat guard.
 *
 * @param drive - The drive this seed is for.
 * @returns A slug this seed alone occupies.
 */
function seedSlug(drive: Drive): string {
  return `research-interval-${labelOf(drive)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

/**
 * Whether a node's statement applies the interval guard.
 *
 * Read as WORDS rather than as text, and membership is of a whole
 * word, so a longer identifier that merely spells one of these inside
 * itself is not one.
 *
 * @param node - A node of any built workflow.
 * @returns Whether one of its statements carries every guard word.
 */
function carriesTheIntervalGuard(node: BuiltWorkflowNode): boolean {
  return queryParametersOf(node).some((query) => {
    const words = new Set(sqlWords(query).split(' '));

    return INTERVAL_GUARD_WORDS.every((word) => words.has(word));
  });
}

/**
 * The first row of a result, refused rather than read off nothing.
 *
 * Destructuring an empty result yields undefined and a drive then
 * dies on a property access, naming neither the statement that
 * returned nothing nor what it was asked to do.
 *
 * @param rows - Whatever the statement returned.
 * @param wrote - What the statement was asked for.
 * @returns Its first row.
 * @throws Error When it returned none.
 */
function firstRow<T>(rows: readonly T[], wrote: string): T {
  const row = rows[0];

  if (row === undefined) {
    throw new Error(
      `[research-interval] the statement asked for ${wrote} returned ` +
      'no row, so there is nothing to read it back off. Whatever it ' +
      'did, it did not do what this drive asked it for.',
    );
  }

  return row;
}

/**
 * The intention ids a raise reported, refused rather than coerced.
 *
 * Both statements project the column under one name and both build it
 * with a `COALESCE` onto the empty array, so an absent member or a
 * member that is not an array is a projection that changed rather
 * than a pass that raised nothing — and reading it as empty would
 * report the refusal every case here is written to distrust.
 *
 * @param row - The single row the statement returned.
 * @param label - The drive it belongs to.
 * @returns The ids it says it raised.
 * @throws Error When the projection carries no such array.
 */
function intentionIdsOf(
  row: Record<string, unknown>,
  label: string,
): readonly unknown[] {
  const raised = row['intention_ids'];

  if (!Array.isArray(raised)) {
    throw new Error(
      `[research-interval] ${label} returned a row carrying no ` +
      'intention_ids array, so what it raised cannot be read off it. ' +
      'The statement projects that column under that name and ' +
      'coalesces it onto an empty array, so this is the projection ' +
      'having changed rather than a pass that raised nothing.',
    );
  }

  return raised;
}

/**
 * Runs planted before the one a drive hands over, so the id a raise
 * stamps cannot be read off anything else its seed wrote.
 *
 * Every sequence starts at one, so a seed planting one domain and one
 * run gives both the id 1 and a statement stamping the domain writes
 * the run's number by accident. Two put the run past every other id
 * the seed writes, and they sit on that seed's own domain, so the
 * stamp naming the run handed over rather than merely some run of the
 * domain is a reading as well.
 *
 * Two rather than one because a seed writes two findings, and one
 * filler would only put the run past the first of them.
 */
const FILLER_RUNS_PER_SEED = 2;

/**
 * Seed one domain, subject, document, run, researched finding and
 * closed pool row, and the finding a raise is then driven over.
 *
 * Every row is planted per seed rather than shared, so the three
 * scenarios and the two raisers cannot reach each other's rows: the
 * repeat guard in front of the window guard refuses a finding already
 * in the pool, and one raiser's insert would otherwise be what
 * refused the next drive.
 *
 * The pool row is stamped `approved_at` as well as `researched_at`,
 * which is not decoration: `research_pool_approval_check` refuses a
 * row recording that it was closed without recording that it was
 * approved first, so the researched row this whole file is about is
 * unstorable without it.
 *
 * @param client - The open transaction to write through.
 * @param artifact - The raiser this seed is for.
 * @param scenario - The row it stands for.
 * @returns The ids the drive binds and reads back.
 */
async function plantSubject(
  client: PoolClient,
  drive: Drive,
): Promise<PlantedSubject> {
  const slug = seedSlug(drive);
  const window = drive.scenario.domainWindowSeconds;
  const settings = window === null
    ? {}
    : { minResearchIntervalSeconds: window };
  const domain = await client.query<{ row_id: string }>(
    `
      INSERT INTO domains (slug, name, settings)
      VALUES ($1, $1, $2::jsonb)
      RETURNING id::text AS row_id
    `,
    [slug, JSON.stringify(settings)],
  );
  const domainId = firstRow(domain.rows, `the ${slug} domain`).row_id;
  const entity = await client.query<{ row_id: string }>(
    `
      INSERT INTO entities (domain_id, name, name_norm)
      VALUES ($1::bigint, $2, $3)
      RETURNING id::text AS row_id
    `,
    [domainId, slug, normalizeEntityName(slug)],
  );
  const entityId = firstRow(entity.rows, `the ${slug} entity`).row_id;
  const document = await client.query<{ row_id: string }>(
    `
      INSERT INTO documents (domain_id, hash, body)
      VALUES ($1::bigint, $2, $3)
      RETURNING id::text AS row_id
    `,
    [domainId, slug, `a document for ${slug}`],
  );
  const documentId = firstRow(document.rows, `the ${slug} document`).row_id;

  // The fillers, written in one statement because their ids are all
  // this seed wants of them. What they are for is the constant above.
  await client.query(
    `
      INSERT INTO runs (domain_id, scheduled_by)
      SELECT $1::bigint, 'interval'
      FROM generate_series(1, $2::int)
    `,
    [domainId, FILLER_RUNS_PER_SEED],
  );

  const run = await client.query<{ row_id: string }>(
    `
      INSERT INTO runs (domain_id, scheduled_by)
      VALUES ($1::bigint, 'interval')
      RETURNING id::text AS row_id
    `,
    [domainId],
  );
  const runId = firstRow(run.rows, `the ${slug} run`).row_id;
  const researched = await client.query<{ row_id: string }>(
    `
      INSERT INTO findings (domain_id, document_id, entity_id, fields)
      VALUES ($1::bigint, $2::bigint, $3::bigint, $4::jsonb)
      RETURNING id::text AS row_id
    `,
    [domainId, documentId, entityId, JSON.stringify(SEEDED_FIELDS)],
  );
  const researchedFindingId = firstRow(
    researched.rows,
    `the ${slug} researched finding`,
  ).row_id;

  await client.query(
    `
      INSERT INTO research_pool (
        domain_id, entity_id, finding_id, status,
        search_terms, approved_at, researched_at
      )
      VALUES (
        $1::bigint, $2::bigint, $3::bigint, 'done',
        $4::jsonb, now(), now() - $5::interval
      )
    `,
    [
      domainId,
      entityId,
      researchedFindingId,
      JSON.stringify(Object.values(SEEDED_FIELDS)),
      `${drive.scenario.researchedAgoSeconds} seconds`,
    ],
  );

  const subject = await client.query<{ row_id: string }>(
    `
      INSERT INTO findings (domain_id, document_id, entity_id, fields)
      VALUES ($1::bigint, $2::bigint, $3::bigint, $4::jsonb)
      RETURNING id::text AS row_id
    `,
    [domainId, documentId, entityId, JSON.stringify(SEEDED_FIELDS)],
  );

  const subjectFindingId = firstRow(
    subject.rows,
    `the ${slug} subject finding`,
  ).row_id;

  return {
    domainId,
    entityId,
    otherIds: [
      domainId,
      entityId,
      documentId,
      researchedFindingId,
      subjectFindingId,
    ],
    runId,
    subjectFindingId,
  };
}

/** What one drive read, before the statement ran and after. */
interface RaiseReading {
  /**
   * Closed rows the guard had to look at when the statement ran.
   *
   * Read from the database rather than assumed off the seed. A guard
   * with nothing to find refuses nothing, so a seed that failed to
   * write the researched row leaves every refusal case here being
   * satisfied by a statement that never had a subject.
   */
  readonly closedRowsForTheSubject: number;

  /**
   * Pool rows the finding being raised already had.
   *
   * The repeat guard sits in front of the window guard and produces
   * the identical outcome, so this is what says which of the two
   * answered: at zero, the only guard left that could have refused is
   * the window.
   */
  readonly poolRowsBefore: number;

  /** How many ids the statement reported raising. */
  readonly intentionIdsReturned: number;

  /** How many pool rows the finding had after it ran. */
  readonly poolRowsAfter: number;

  /**
   * The run this drive named as the originating one, or null where it
   * named none.
   *
   * What the stamp below is held against, carried on the reading
   * rather than looked up again: the ids a seed writes are its own,
   * so a table written at module scope has no number to compare.
   */
  readonly runHandedOver: string | null;

  /**
   * The `root_event_id` on every pool row the finding carries after
   * the statement ran, in the order they were written.
   *
   * Read off the stored rows rather than off the statement's own
   * `RETURNING`, which projects the id and nothing else. A list
   * rather than one value, so a raise that wrote two rows names its
   * own shape rather than being read as the first of them.
   */
  readonly stampsOnTheRowsRaised: readonly (string | null)[];

  /**
   * Whether the run this drive named can be told apart from every
   * other id its seed wrote.
   *
   * The precondition of the stamp reading rather than a claim about
   * the statement. At false, a raise binding the domain or a finding
   * where it should bind the run writes the same number the rule asks
   * for, and the stamp above is satisfied by a statement reading the
   * wrong parameter.
   */
  readonly theRunIsApartFromEveryOtherIdSeeded: boolean;
}

/**
 * Count the pool rows matching one column, as a number.
 *
 * `count(*)` comes back from `pg` as a string, bigint having no
 * lossless JS number to arrive as, so a comparison against a numeric
 * literal would be false for every count including zero.
 *
 * @param client - The open transaction to read through.
 * @param sql - The counting statement.
 * @param values - Its bound values.
 * @returns What it counted.
 */
async function countRows(
  client: PoolClient,
  sql: string,
  values: readonly unknown[],
): Promise<number> {
  const { rows } = await client.query<{ tally: string }>(sql, [...values]);

  return Number(firstRow(rows, 'a pool row count').tally);
}

/**
 * The `root_event_id` on every pool row one finding carries, as text.
 *
 * A bigint comes back off the driver as a string, so the column is
 * cast here and the comparison is between two strings rather than
 * between a string and a number that would be unequal for every id
 * including the right one. A SQL NULL still arrives as null, which is
 * the whole of the second reading this file makes.
 *
 * @param client - The open transaction to read through.
 * @param findingId - The finding whose rows to read.
 * @returns One stamp per row, in the order they were written.
 */
async function stampsFor(
  client: PoolClient,
  findingId: string,
): Promise<readonly (string | null)[]> {
  const { rows } = await client.query<{ stamp: string | null }>(
    `
      SELECT root_event_id::text AS stamp
      FROM research_pool
      WHERE finding_id = $1::bigint
      ORDER BY id
    `,
    [findingId],
  );

  return rows.map((row) => row.stamp);
}

/**
 * Seed one scenario, run one raise statement over it verbatim, and
 * read back what it did.
 *
 * The statement is run as the artifact carries it. What is under test
 * is the text an instance would run, so a fragment lifted out of it
 * and evaluated on its own would be a second spelling of the rule
 * rather than a reading of the shipped one.
 *
 * Two readings of the outcome rather than one. The statement's own
 * `RETURNING` says what it thinks it raised, and the table says what
 * is there afterwards; a statement whose insert and whose projection
 * disagree is a shape neither reading alone would report.
 *
 * @param client - The open transaction to drive through.
 * @param workflows - Every built workflow, to read the statement out of.
 * @param drive - The raiser, hand-over and row to drive.
 * @returns Everything the cases below read for this drive.
 */
async function driveRaise(
  client: PoolClient,
  workflows: readonly BuiltWorkflow[],
  drive: Drive,
): Promise<RaiseReading> {
  const planted = await plantSubject(client, drive);
  const closedRowsForTheSubject = await countRows(
    client,
    `
      SELECT count(*) AS tally
      FROM research_pool
      WHERE entity_id = $1::bigint
        AND status = 'done'
        AND researched_at IS NOT NULL
    `,
    [planted.entityId],
  );
  const poolRowsFor = `
    SELECT count(*) AS tally
    FROM research_pool
    WHERE finding_id = $1::bigint
  `;
  const poolRowsBefore = await countRows(
    client,
    poolRowsFor,
    [planted.subjectFindingId],
  );
  const label = labelOf(drive);
  const runHandedOver = drive.handover.namesARun
    ? planted.runId
    : null;
  const payload: PayloadBinding = {
    domainId: planted.domainId,
    runId: planted.runId,
    subjects: [{
      entityId: planted.entityId,
      findingId: planted.subjectFindingId,
    }],
  };
  const raise = await client.query<Record<string, unknown>>(
    raiseStatement(workflows, drive.fixture),
    [...drive.fixture.parameters(payload, runHandedOver)],
  );
  const raised = intentionIdsOf(firstRow(raise.rows, label), label);
  const poolRowsAfter = await countRows(
    client,
    poolRowsFor,
    [planted.subjectFindingId],
  );

  return {
    closedRowsForTheSubject,
    intentionIdsReturned: raised.length,
    poolRowsAfter,
    poolRowsBefore,
    runHandedOver,
    stampsOnTheRowsRaised: await stampsFor(
      client,
      planted.subjectFindingId,
    ),
    theRunIsApartFromEveryOtherIdSeeded:
      !planted.otherIds.includes(planted.runId),
  };
}

/**
 * What one drive did to its subject, as one word.
 *
 * Total over both readings, so a statement whose projection and whose
 * insert part names its own shape in the diff rather than being
 * absorbed into {@link RAISED} or {@link REFUSED}.
 *
 * @param reading - What the drive read.
 * @returns What the statement did.
 */
function raiseOutcome(reading: RaiseReading): string {
  if (reading.intentionIdsReturned === 1 && reading.poolRowsAfter === 1) {
    return RAISED;
  }

  if (reading.intentionIdsReturned === 0 && reading.poolRowsAfter === 0) {
    return REFUSED;
  }

  return `returned ${String(reading.intentionIdsReturned)} and stored ` +
    `${String(reading.poolRowsAfter)}`;
}

/**
 * What one drive stamped on what it raised, as one word.
 *
 * Total the way {@link raiseOutcome} is, and for the same reason: a
 * stamp that is neither the run handed over nor nothing at all is a
 * third thing, and reading it as one of the two would report a
 * statement binding the wrong parameter as one obeying the rule.
 *
 * A drive that raised nothing has no stamp to read and says so. That
 * is not a weaker reading of the same claim — the three refusals in
 * the table are the window's cases and the outcome above is what
 * judges them.
 *
 * @param reading - What the drive read.
 * @returns What it stamped.
 */
function stampOutcome(reading: RaiseReading): string {
  const [stamp, ...rest] = reading.stampsOnTheRowsRaised;

  if (stamp === undefined) {
    return NOTHING_RAISED;
  }

  if (rest.length > 0) {
    return `stamped ${String(reading.stampsOnTheRowsRaised.length)} rows`;
  }

  if (stamp === null) {
    return STAMPED_NOTHING;
  }

  return stamp === reading.runHandedOver
    ? STAMPED_THE_RUN
    : `stamped ${stamp} where its caller named ` +
      `${reading.runHandedOver ?? 'nothing'}`;
}

/**
 * What one drive had to stamp, read off the drive rather than off
 * what it did.
 *
 * The window decides whether there is a row at all and the hand-over
 * decides what is on it, which is the whole of why the two axes are
 * crossed: neither table alone would say that a raiser refusing a
 * subject also stamps nothing, or that one raising it stamps whatever
 * its caller named whichever window row it was raised under.
 *
 * @param drive - One member of {@link EVERY_DRIVE}.
 * @returns The word {@link stampOutcome} has to answer for it.
 */
function stampExpected(drive: Drive): string {
  if (drive.scenario.outcome !== RAISED) {
    return NOTHING_RAISED;
  }

  return drive.handover.namesARun
    ? STAMPED_THE_RUN
    : STAMPED_NOTHING;
}

/**
 * What a raise statement did with one subject of a batch, and the
 * whole of what it can have done.
 *
 * Total the way the outcome pair above the window grid is, and for a
 * reason the lists make sharper. The three a statement answers with
 * are claimed to PARTITION the subjects it called searchable, so a
 * subject named by two of them and a subject named by none are both
 * faults this reading has to be able to say out loud — a word that
 * could only ever be one of the three would read a partition that had
 * come apart as one that held.
 */
const BUCKET_RAISED = 'raised';
const BUCKET_REPEAT = 'suppressed by the repeat guard';
const BUCKET_INTERVAL = 'suppressed by the interval guard';
const BUCKET_BOTH_LISTS = 'named by both suppression lists';
const BUCKET_UNSEARCHABLE = 'not called searchable at all';

/**
 * What the table did about one subject while the statement ran.
 *
 * The bucket above is read off the statement's own projection, and
 * the raised one is the REMAINDER of the two suppression lists rather
 * than a list of its own: what a raise answers raising with are
 * `research_pool` ids, so nothing it returns names the findings it
 * raised. A remainder can be an honest label or a catch-all and no
 * reading of the lists alone tells the two apart, so each subject's
 * bucket travels beside what the table gained for it. A subject
 * called raised that gained no row, or one called suppressed that
 * gained one, then names itself instead of being absorbed.
 */
const NO_NEW_ROW = 'no new pool row';
const ONE_NEW_ROW = 'one new pool row';

/**
 * What a suppression projection answering no list at all is reported
 * as.
 *
 * The claim a pass suppressing nothing makes is that both lists come
 * back EMPTY rather than absent, and that is what lets the close
 * statement downstream tally a zero into `runs.counts` instead of
 * omitting the key: `jsonb_agg` over no rows answers NULL, and only
 * the `COALESCE` onto `'[]'` in front of each projection turns that
 * into a list a tally can measure. So a null and an empty list have
 * to read differently here, and a reading that coerced the first to
 * the second would report exactly the fault the coalesce exists for.
 */
const NO_LIST_AT_ALL = 'no list at all';

/**
 * One subject a batch seeds: what its seed puts in front of it, and
 * which of the statement's three lists it has to come back in.
 *
 * The two guard members are what the seed reads and the bucket is
 * what the case expects, and they are separate members rather than
 * one because the precedence between them is a property of the
 * statement rather than of the seed: a subject BOTH guards refuse is
 * answered by the repeat guard alone, and a row declaring both
 * refusals against a bucket of {@link BUCKET_REPEAT} is what puts
 * that to a server.
 */
interface BatchSubject {
  /** Whether the seed gives its finding a pool row before the drive. */
  readonly alreadyInThePool: boolean;

  /** The list the statement has to come back with it in. */
  readonly bucket: string;

  /** What it is called in the record, and in its own entity's name. */
  readonly id: string;

  /**
   * Whether the seed closes a row for its subject inside the window.
   *
   * Written on a SECOND finding of the same entity rather than on the
   * subject's own, so a subject this member refuses is not also one
   * the repeat guard refuses. That is the whole of what makes the two
   * guards separable here, both of them reading `research_pool` and
   * one of them keyed on the finding the other is keyed beside.
   */
  readonly researchedInsideTheWindow: boolean;
}

/** The subject a batch plants that neither guard refuses. */
const NOTHING_REFUSES_IT: BatchSubject = {
  alreadyInThePool: false,
  bucket: BUCKET_RAISED,
  id: 'nothing refuses it',
  researchedInsideTheWindow: false,
};

/**
 * The batch that trips both guards, and the one the partition is read
 * off.
 *
 * Four subjects rather than three, and the fourth is what makes the
 * sum a reading rather than arithmetic. One subject per guard says
 * the two lists are answered at all; the subject both guards refuse
 * is the one a statement could count twice, and a partition that put
 * it in both lists would answer five bucketed subjects over four
 * searchable ones. The one nothing refuses is the control the three
 * refusals cannot do without, a statement that raised nothing
 * satisfying a refusal exactly as the rule does.
 *
 * Spread from that row, so a member added to it reaches all four and
 * the guards each one declares stay the only thing separating them.
 */
const BOTH_GUARDS_TRIPPED: readonly BatchSubject[] = [
  NOTHING_REFUSES_IT,
  {
    ...NOTHING_REFUSES_IT,
    alreadyInThePool: true,
    bucket: BUCKET_REPEAT,
    id: 'the repeat guard',
  },
  {
    ...NOTHING_REFUSES_IT,
    bucket: BUCKET_INTERVAL,
    id: 'the interval guard',
    researchedInsideTheWindow: true,
  },
  {
    ...NOTHING_REFUSES_IT,
    alreadyInThePool: true,
    bucket: BUCKET_REPEAT,
    id: 'both guards',
    researchedInsideTheWindow: true,
  },
];

/**
 * The batch nothing suppresses, and the one the two zeroes are read
 * off.
 *
 * Two subjects rather than one, because what the close statement
 * downstream tallies is a PASS and not a subject: a batch of one
 * cannot tell a list answered per pass from a list answered per row,
 * and both would report the same zero.
 */
const NOTHING_SUPPRESSED: readonly BatchSubject[] = [
  NOTHING_REFUSES_IT,
  { ...NOTHING_REFUSES_IT, id: 'nothing refuses it either' },
];

/** One batch this file drives each raiser over. */
interface BatchScenario {
  /** What the batch is called in a failure, and in its seed's slug. */
  readonly id: string;

  /** The subjects it plants, in the order its payload names them. */
  readonly subjects: readonly BatchSubject[];
}

/**
 * The two batches, and the two halves of what this file claims about
 * the lists a raise answers with.
 */
const BATCH_SCENARIOS: readonly BatchScenario[] = [
  { id: 'a batch tripping both guards', subjects: BOTH_GUARDS_TRIPPED },
  { id: 'a batch nothing suppresses', subjects: NOTHING_SUPPRESSED },
];

/**
 * One batch drive: a raiser, and the batch it is driven over.
 *
 * No hand-over member. Both raisers are driven under a caller naming
 * the run, which is the hand-over both of them express, and what gets
 * stamped on the rows raised is the window grid's own case to judge.
 */
interface BatchDrive {
  /** The raiser driven. */
  readonly fixture: RaiseFixture;

  /** The batch it is driven over. */
  readonly scenario: BatchScenario;
}

/**
 * Every batch drive this file makes, spread once and read everywhere.
 *
 * A full cross product, unlike {@link EVERY_DRIVE}: neither batch
 * varies the hand-over, so there is no raiser here that cannot be
 * driven over both.
 */
const EVERY_BATCH_DRIVE: readonly BatchDrive[] = RAISE_FIXTURES.flatMap(
  (fixture) => BATCH_SCENARIOS.map((scenario) => ({ fixture, scenario })),
);

/**
 * The label one batch drive is reported under.
 *
 * @param drive - One member of {@link EVERY_BATCH_DRIVE}.
 * @returns The raiser and the batch, as one label.
 */
function batchLabel(drive: BatchDrive): string {
  return `${drive.fixture.artifact}: ${drive.scenario.id}`;
}

/**
 * The slug one batch seed's domain is stored under.
 *
 * `domains.slug` is unique and every seed in this file shares one
 * transaction, so two seeds under one slug would be refused on the
 * second insert. The batch's whole label is what makes it distinct,
 * and the prefix is what keeps it clear of {@link seedSlug}'s.
 *
 * @param drive - The drive this seed is for.
 * @returns A slug this seed alone occupies.
 */
function batchSlug(drive: BatchDrive): string {
  return `research-interval-batch-${batchLabel(drive)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

/** One subject of a batch, as its seed wrote it. */
interface PlantedBatchSubject {
  /** Its own registry row, which no other subject of the batch shares. */
  readonly entityId: string;

  /** The finding the payload names. */
  readonly findingId: string;

  /** The row it was seeded from. */
  readonly seeded: BatchSubject;
}

/** Everything one batch seed wrote. */
interface PlantedBatch {
  /** The domain every row hangs off. */
  readonly domainId: string;

  /** The run the drive names as the originating one. */
  readonly runId: string;

  /** One entry per subject, in the order the payload names them. */
  readonly subjects: readonly PlantedBatchSubject[];
}

/**
 * One finding of a batch seed, with the terms every seeded finding in
 * this file carries.
 *
 * @param client - The open transaction to write through.
 * @param ids - The domain, document and subject it hangs off.
 * @param wrote - What it is called if the insert answers no row.
 * @returns Its id.
 */
async function plantFinding(
  client: PoolClient,
  ids: { documentId: string; domainId: string; entityId: string },
  wrote: string,
): Promise<string> {
  const finding = await client.query<{ row_id: string }>(
    `
      INSERT INTO findings (domain_id, document_id, entity_id, fields)
      VALUES ($1::bigint, $2::bigint, $3::bigint, $4::jsonb)
      RETURNING id::text AS row_id
    `,
    [ids.domainId, ids.documentId, ids.entityId, JSON.stringify(SEEDED_FIELDS)],
  );

  return firstRow(finding.rows, wrote).row_id;
}

/**
 * Seed one batch: a domain, a run and a document, and per subject an
 * entity of its own, the finding the payload names, and whichever
 * rows the guards that subject declares need in front of it.
 *
 * An entity per subject rather than one for the batch, because the
 * interval guard is keyed on the subject: a shared entity would put
 * one closed row in front of every finding in the batch and the three
 * lists would come back with everything in one of them.
 *
 * The domain declares no window of its own, so the number every
 * closed row here is measured against is the build's own fallback —
 * the same one {@link RESEARCHED_INSIDE} is placed half of, which is
 * why the offset is read off that row rather than written out again.
 *
 * @param client - The open transaction to write through.
 * @param drive - The raiser and batch this seed is for.
 * @returns The ids the drive binds and reads back.
 */
async function plantBatch(
  client: PoolClient,
  drive: BatchDrive,
): Promise<PlantedBatch> {
  const slug = batchSlug(drive);
  const domain = await client.query<{ row_id: string }>(
    `
      INSERT INTO domains (slug, name, settings)
      VALUES ($1, $1, '{}'::jsonb)
      RETURNING id::text AS row_id
    `,
    [slug],
  );
  const domainId = firstRow(domain.rows, `the ${slug} domain`).row_id;
  const document = await client.query<{ row_id: string }>(
    `
      INSERT INTO documents (domain_id, hash, body)
      VALUES ($1::bigint, $2, $3)
      RETURNING id::text AS row_id
    `,
    [domainId, slug, `a document for ${slug}`],
  );
  const documentId = firstRow(document.rows, `the ${slug} document`).row_id;
  const run = await client.query<{ row_id: string }>(
    `
      INSERT INTO runs (domain_id, scheduled_by)
      VALUES ($1::bigint, 'interval')
      RETURNING id::text AS row_id
    `,
    [domainId],
  );
  const runId = firstRow(run.rows, `the ${slug} run`).row_id;
  const terms = JSON.stringify(Object.values(SEEDED_FIELDS));
  const subjects: PlantedBatchSubject[] = [];

  for (const seeded of drive.scenario.subjects) {
    const name = `${slug}-${seeded.id}`;
    const entity = await client.query<{ row_id: string }>(
      `
        INSERT INTO entities (domain_id, name, name_norm)
        VALUES ($1::bigint, $2, $3)
        RETURNING id::text AS row_id
      `,
      [domainId, name, normalizeEntityName(name)],
    );
    const entityId = firstRow(entity.rows, `the ${name} entity`).row_id;
    const ids = { documentId, domainId, entityId };
    const findingId = await plantFinding(
      client,
      ids,
      `the ${name} subject finding`,
    );

    // The repeat guard's own subject. Left open at `pending` rather
    // than closed, so a row planted for this guard cannot also be the
    // closed row the other one looks for.
    if (seeded.alreadyInThePool) {
      await client.query(
        `
          INSERT INTO research_pool (
            domain_id, entity_id, finding_id, status, search_terms
          )
          VALUES ($1::bigint, $2::bigint, $3::bigint, 'pending', $4::jsonb)
        `,
        [domainId, entityId, findingId, terms],
      );
    }

    // The interval guard's, on a finding of its own. `approved_at` is
    // not decoration: `research_pool_approval_check` refuses a row
    // recording that it was closed without recording that it was
    // approved first, so the researched row is unstorable without it.
    if (seeded.researchedInsideTheWindow) {
      const researchedFindingId = await plantFinding(
        client,
        ids,
        `the ${name} researched finding`,
      );

      await client.query(
        `
          INSERT INTO research_pool (
            domain_id, entity_id, finding_id, status,
            search_terms, approved_at, researched_at
          )
          VALUES (
            $1::bigint, $2::bigint, $3::bigint, 'done',
            $4::jsonb, now(), now() - $5::interval
          )
        `,
        [
          domainId,
          entityId,
          researchedFindingId,
          terms,
          `${RESEARCHED_INSIDE.researchedAgoSeconds} seconds`,
        ],
      );
    }

    subjects.push({ entityId, findingId, seeded });
  }

  return { domainId, runId, subjects };
}

/** What one batch drive read. */
interface BatchReading {
  /** The three lists' lengths, added up. */
  readonly bucketedSubjects: number;

  /** What the interval projection carried, as one phrase. */
  readonly intervalSuppressions: string;

  /** What the repeat projection carried, as one phrase. */
  readonly repeatSuppressions: string;

  /** How many subjects the statement called searchable. */
  readonly searchableSubjects: number;

  /**
   * Which list each seeded subject came back in and what the table
   * gained for it, by that subject's own name.
   */
  readonly subjects: Readonly<Record<string, string>>;
}

/** The three lists one batch drive's subjects are classified against. */
interface BucketLists {
  /** The ids the interval projection named. */
  readonly interval: ReadonlySet<string>;

  /** The ids the repeat projection named. */
  readonly repeat: ReadonlySet<string>;

  /** The ids the searchable projection named. */
  readonly searchable: ReadonlySet<string>;
}

/**
 * The ids one projection carried, as strings.
 *
 * A bigint inside a `jsonb_agg` arrives off the driver as a JS number
 * where an id read back off a column arrives as a string, so both
 * sides are spelled as text rather than compared across two types —
 * which would be unequal for every id including the right one.
 *
 * A value that is not an array at all yields nothing rather than
 * throwing: which projection failed to answer a list is the reading
 * {@link suppressionReading} makes, and a bucket reading that threw
 * would take that one down with it.
 *
 * @param value - Whatever the projection carried.
 * @returns Its members, as strings.
 */
function idSetOf(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value)) {
    return new Set();
  }

  return new Set(value.map((member) => String(member)));
}

/**
 * How many ids one projection carried, counting a projection that
 * carried no list at all as none.
 *
 * @param value - Whatever the projection carried.
 * @returns Its length.
 */
function listLength(value: unknown): number {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value.length;
}

/**
 * How a suppression count is spelled, in one place.
 *
 * @param count - What a pass suppressed.
 * @returns The phrase the reading and the table below both use.
 */
function suppressionWord(count: number): string {
  return `${count} suppressed`;
}

/**
 * What one suppression projection carried, as one phrase.
 *
 * @param value - Whatever the projection carried.
 * @returns The count it named, or that it named no list at all.
 */
function suppressionReading(value: unknown): string {
  if (!Array.isArray(value)) {
    return NO_LIST_AT_ALL;
  }

  return suppressionWord(value.length);
}

/**
 * Which of the statement's lists one subject came back in.
 *
 * Total over the three, and over the two ways a partition comes
 * apart: a subject in both suppression lists and a subject the
 * statement never called searchable each name themselves.
 *
 * @param findingId - The subject's finding, as text.
 * @param lists - What the statement answered with.
 * @returns The one word this subject's bucket is.
 */
function bucketOf(findingId: string, lists: BucketLists): string {
  const inRepeat = lists.repeat.has(findingId);
  const inInterval = lists.interval.has(findingId);

  if (inRepeat && inInterval) {
    return BUCKET_BOTH_LISTS;
  }

  if (inRepeat) {
    return BUCKET_REPEAT;
  }

  if (inInterval) {
    return BUCKET_INTERVAL;
  }

  if (!lists.searchable.has(findingId)) {
    return BUCKET_UNSEARCHABLE;
  }

  return BUCKET_RAISED;
}

/**
 * What the table gained for one subject while the statement ran, as
 * one phrase.
 *
 * @param gained - Pool rows after the drive, less the rows before it.
 * @returns What it gained.
 */
function rowsReading(gained: number): string {
  if (gained === 0) {
    return NO_NEW_ROW;
  }

  if (gained === 1) {
    return ONE_NEW_ROW;
  }

  return `${gained} new pool rows`;
}

/**
 * How many pool rows each subject of a batch holds, in the order the
 * payload names them.
 *
 * @param client - The open transaction to read through.
 * @param planted - What the seed wrote.
 * @returns One count per subject.
 */
async function poolRowsPerSubject(
  client: PoolClient,
  planted: PlantedBatch,
): Promise<readonly number[]> {
  const counts: number[] = [];

  for (const subject of planted.subjects) {
    counts.push(await countRows(
      client,
      `
        SELECT count(*) AS tally
        FROM research_pool
        WHERE finding_id = $1::bigint
      `,
      [subject.findingId],
    ));
  }

  return counts;
}

/**
 * Seed one batch, run one raise statement over it verbatim, and read
 * back how it divided the subjects up.
 *
 * Two readings again, for the reason the single-subject drive makes
 * two: the lists say how the statement divided the batch and the
 * table says what it actually wrote, and a subject the lists leave in
 * the raised remainder that gained no row is a shape neither reading
 * alone would report.
 *
 * @param client - The open transaction to drive through.
 * @param workflows - Every built workflow, to read the statement out of.
 * @param drive - The raiser and batch to drive.
 * @returns Everything the case below reads for this drive.
 */
async function driveBatch(
  client: PoolClient,
  workflows: readonly BuiltWorkflow[],
  drive: BatchDrive,
): Promise<BatchReading> {
  const planted = await plantBatch(client, drive);
  const label = batchLabel(drive);
  const payload: PayloadBinding = {
    domainId: planted.domainId,
    runId: planted.runId,
    subjects: planted.subjects,
  };
  const before = await poolRowsPerSubject(client, planted);
  const raise = await client.query<Record<string, unknown>>(
    raiseStatement(workflows, drive.fixture),
    [...drive.fixture.parameters(payload, planted.runId)],
  );
  const row = firstRow(raise.rows, label);
  const after = await poolRowsPerSubject(client, planted);
  const repeat = row['suppressed_repeat_finding_ids'];
  const interval = row['suppressed_interval_finding_ids'];
  const lists: BucketLists = {
    interval: idSetOf(interval),
    repeat: idSetOf(repeat),
    searchable: idSetOf(row['searchable_finding_ids']),
  };
  const raised = intentionIdsOf(row, label);

  return {
    bucketedSubjects:
      raised.length + listLength(repeat) + listLength(interval),
    intervalSuppressions: suppressionReading(interval),
    repeatSuppressions: suppressionReading(repeat),
    searchableSubjects: lists.searchable.size,
    subjects: Object.fromEntries(planted.subjects.map(
      (subject, index): [string, string] => [
        subject.seeded.id,
        `${bucketOf(subject.findingId, lists)}, ` +
        rowsReading((after[index] ?? 0) - (before[index] ?? 0)),
      ],
    )),
  };
}

/**
 * What one seeded subject has to come back as.
 *
 * @param subject - One member of a batch.
 * @returns The phrase {@link driveBatch} has to answer for it.
 */
function subjectExpected(subject: BatchSubject): string {
  const rows = subject.bucket === BUCKET_RAISED
    ? ONE_NEW_ROW
    : NO_NEW_ROW;

  return `${subject.bucket}, ${rows}`;
}

/**
 * What one batch had to come back as, derived from the batch itself.
 *
 * The two counts are the partition claim and they are two numbers
 * rather than one boolean on purpose: a boolean holding the three
 * lists against the searchable count is satisfied where both sides
 * are zero, which is exactly the shape a statement that answered
 * nothing at all would take.
 *
 * @param scenario - The batch driven.
 * @returns The record {@link driveBatch} has to answer with.
 */
function batchExpected(scenario: BatchScenario): Record<string, unknown> {
  const suppressedBy = (bucket: string): number => scenario.subjects
    .filter((subject) => subject.bucket === bucket).length;

  return {
    bucketedSubjects: scenario.subjects.length,
    intervalSuppressions: suppressionWord(suppressedBy(BUCKET_INTERVAL)),
    repeatSuppressions: suppressionWord(suppressedBy(BUCKET_REPEAT)),
    searchableSubjects: scenario.subjects.length,
    subjects: Object.fromEntries(scenario.subjects.map(
      (subject): [string, string] => [subject.id, subjectExpected(subject)],
    )),
  };
}

/** What every batch drive is expected to have come back as. */
const EVERY_BATCH_OUTCOME: Readonly<Record<string, unknown>> =
  Object.fromEntries(EVERY_BATCH_DRIVE.map((drive): [string, unknown] => [
    batchLabel(drive),
    batchExpected(drive.scenario),
  ]));

/** Everything the drives inside one transaction read. */
interface DriveReadings {
  /** What each batch drive read, by {@link batchLabel}. */
  readonly batchReadings: Readonly<Record<string, BatchReading>>;

  /** What each single-subject drive read, by {@link driveLabel}. */
  readonly readings: Readonly<Record<string, RaiseReading>>;
}

/** What `beforeAll` drove, and every case below reads. */
interface IntervalDrive {
  /** How the build in front of the drive went. */
  readonly buildOutcome: string;

  /** The artifacts that build reported writing, by file name. */
  readonly artifactsBuilt: readonly string[];

  /** What each batch drive read, by {@link batchLabel}. */
  readonly batchReadings: Readonly<Record<string, BatchReading>>;

  /** Every built node carrying the interval guard, sorted. */
  readonly guardedNodes: readonly string[];

  /** What each drive read, by {@link driveLabel}. */
  readonly readings: Readonly<Record<string, RaiseReading>>;
}

/**
 * Build the workflows the way `bun run build:workflows` does, and
 * answer with what it wrote and how it went.
 *
 * The shipped entry point as a subprocess rather than `buildAll` with
 * a stand-in loader: what the statements below are read out of has to
 * be the artifact the shipped command writes.
 *
 * The default build rather than `--external`, so its settings come
 * from `ENV_DEFAULTS` alone — which is what lets the fallback the
 * seeds are placed either side of be read from that table.
 *
 * @returns Its outcome, and the file names it reported writing.
 */
function runBuild(): { outcome: string; written: readonly string[] } {
  const run = spawnSync('bun', [BUILD_ENTRY], { encoding: 'utf8' });
  const written = (run.stdout ?? '')
    .split('\n')
    .filter((line) => line.startsWith(BUILT_LINE))
    .map((line) => basename(line.slice(BUILT_LINE.length)));

  return {
    outcome: run.status === 0
      ? BUILD_RAN
      : `exit ${String(run.status)}: ${run.error?.message ?? ''}${run.stderr ?? ''}`,
    written,
  };
}

/**
 * One fixture's statement, refused rather than stood in for.
 *
 * @param workflows - Every built workflow.
 * @param fixture - The raiser to read.
 * @returns The node's own SQL.
 * @throws Error When the artifact, the node or its query is gone.
 */
function raiseStatement(
  workflows: readonly BuiltWorkflow[],
  fixture: RaiseFixture,
): string {
  const workflow = workflows.find(
    (built) => built.file === fixture.artifact,
  );

  if (workflow === undefined) {
    throw new Error(
      `[research-interval] the built tree holds no ${fixture.artifact}, ` +
      'so there is no raise statement to run and every reading below ' +
      'would be about a workflow nobody built. It is written from ' +
      `workflows/src/${fixture.artifact}.`,
    );
  }

  const statements = workflow.nodes
    .filter((node) => node.name === fixture.nodeName)
    .flatMap((node) => queryParametersOf(node));
  const statement = statements[0];

  if (statement === undefined) {
    throw new Error(
      `[research-interval] ${fixture.artifact} holds no node named ` +
      `${fixture.nodeName} running SQL, so this fixture has nothing to ` +
      'drive. Either the node was renamed on the canvas, or this ' +
      'roster names one that was.',
    );
  }

  return statement;
}

/**
 * Drive every raiser over every row once, inside one transaction, and
 * answer with everything the cases below read.
 *
 * The tables are reset in front of the transaction rather than inside
 * it, and the reset is the harness's own, which refuses to run
 * against any database but the live one. What it is for is a previous
 * live file's leftovers: a domain slug or a document hash this file
 * plants is unique, so a collision would arrive as a failed seed
 * rather than as a reading.
 *
 * The transaction is rolled back at the end, which leaves the tables
 * as the reset left them.
 *
 * Both drive families run inside that one transaction rather than
 * one apiece, so a batch seed cannot meet a window seed's rows and
 * neither can be left behind by a failure in the other.
 *
 * @param pool - The live pool.
 * @param workflows - Every built workflow.
 * @returns What every drive read, by its own label.
 */
async function driveRaises(
  pool: Pool,
  workflows: readonly BuiltWorkflow[],
): Promise<DriveReadings> {
  await resetTables(pool);

  const batchReadings: Record<string, BatchReading> = {};
  const readings: Record<string, RaiseReading> = {};
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const drive of EVERY_DRIVE) {
      readings[labelOf(drive)] = await driveRaise(client, workflows, drive);
    }

    for (const drive of EVERY_BATCH_DRIVE) {
      batchReadings[batchLabel(drive)] = await driveBatch(
        client,
        workflows,
        drive,
      );
    }
  } finally {
    // Swallowed for the reason the sibling live files swallow theirs:
    // this runs whether or not the body threw, and a rollback that
    // raises in its turn would replace whatever did.
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }

  return { batchReadings, readings };
}

/**
 * What every drive is expected to have found in front of it: one
 * closed row for the subject, and no pool row for the finding being
 * raised.
 */
const EVERY_GUARD_HAD_A_SUBJECT: Readonly<Record<string, unknown>> =
  Object.fromEntries(EVERY_DRIVE.map((drive): [string, unknown] => [
    labelOf(drive),
    { closedRowsForTheSubject: 1, poolRowsBefore: 0 },
  ]));

/** What every drive is expected to have done, by the table above. */
const EVERY_OUTCOME: Readonly<Record<string, string>> = Object.fromEntries(
  EVERY_DRIVE.map((drive): [string, string] => [
    labelOf(drive),
    drive.scenario.outcome,
  ]),
);

/**
 * What every drive is expected to have stamped, and the reading that
 * has to hold for the first half to mean anything.
 *
 * The two travel in one record rather than in two tables, so a stamp
 * that is right for the wrong reason cannot be read as a stamp that
 * is right. A seed whose run is not apart from its other ids fails on
 * the second member whatever the first one says.
 */
const EVERY_STAMP: Readonly<Record<string, unknown>> = Object.fromEntries(
  EVERY_DRIVE.map((drive): [string, unknown] => [
    labelOf(drive),
    {
      stamp: stampExpected(drive),
      theRunIsApartFromEveryOtherIdSeeded: true,
    },
  ]),
);

let live: IntervalDrive | null = null;

/**
 * What `beforeAll` drove, refused rather than coerced.
 *
 * Called from inside a case rather than resolved beside it, so a hook
 * that did not finish reports as a named failure in the case that
 * wanted the value instead of as an assertion about `undefined` —
 * which for a comparison over an empty record is a green.
 *
 * @returns The shared drive.
 * @throws Error When `beforeAll` did not reach the end.
 */
function fixture(): IntervalDrive {
  if (live === null) {
    throw new Error(
      '[research-interval] the drive for this block was never made, so ' +
      'no statement was run and nothing was read back. Whatever ' +
      'beforeAll raised is above this in the run log.',
    );
  }

  return live;
}

describeLivePg('per-entity research interval (live Postgres)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);

    const build = runBuild();
    const workflows = loadBuiltWorkflows();
    const drives = await driveRaises(pool, workflows);

    live = {
      artifactsBuilt: build.written,
      batchReadings: drives.batchReadings,
      buildOutcome: build.outcome,
      guardedNodes: sorted(workflows.flatMap(
        (workflow) => workflow.nodes
          .filter(carriesTheIntervalGuard)
          .map((node) => nodeLabel(workflow.file, node.name)),
      )),
      readings: drives.readings,
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  // The first guard, and the one that says what was driven came out of
  // a build made here rather than off whatever last wrote the tree.
  //
  // Four halves, each reading a different thing: the build's own
  // outcome, whether what it reported writing carries both raisers,
  // which built nodes apply the guard, and which nodes this file has a
  // fixture for.
  //
  // The first is a membership rather than the whole list, the build
  // writing every source under `workflows/src/`: which artifacts the
  // tree ships is the roster case in `tests/invariants/workflows.test.ts`
  // to judge rather than this one.
  //
  // The last two are the pair that matters, and they are derived from
  // opposite sides. A third statement growing the guard reddens the
  // one read off the artifacts, and a fixture dropped from the roster
  // reddens the one read off this file, rather than either going
  // quietly undriven. The list they are both held against is written
  // out above, so neither is compared against the other alone.
  it('drives every guard a fresh build of the two raisers carries', () => {
    const drive = fixture();

    expect({
      artifactsBuiltCarryTheRaisers: RAISE_FIXTURES.every(
        (raiser) => drive.artifactsBuilt.includes(raiser.artifact),
      ),
      buildOutcome: drive.buildOutcome,
      guardedNodesInTheBuiltTree: drive.guardedNodes,
      nodesThisFileDrives: sorted(RAISE_FIXTURES.map(
        (raiser) => nodeLabel(raiser.artifact, raiser.nodeName),
      )),
    }).toEqual({
      artifactsBuiltCarryTheRaisers: true,
      buildOutcome: BUILD_RAN,
      guardedNodesInTheBuiltTree: GUARDED_NODE_LABELS,
      nodesThisFileDrives: GUARDED_NODE_LABELS,
    });
  });

  // The second guard, and the one the refusal below cannot do without.
  // Both halves are read from the database at the moment each
  // statement ran, and each answers a way the refusal could be true
  // for a reason that is not the rule.
  //
  // A guard with nothing to look at refuses nothing, so a closed row
  // that failed to store — the approval CHECK refusing it, an
  // entity the seed did not write — would leave the refusing row
  // being raised and the two controls saying so. That is the half this
  // reading makes legible rather than the half it catches.
  //
  // The other is the one it alone can catch. The repeat guard sits in
  // front of the window guard in both statements and produces the
  // identical outcome, so a finding that already had a pool row would
  // be refused by that instead, and the row this file calls refused
  // would be refused for a reason its two controls also share. At zero
  // rows before the drive, the window is the only guard left that
  // could have answered.
  it('puts a closed row in front of a subject nothing had raised yet', () => {
    const drive = fixture();

    expect(Object.fromEntries(
      Object.entries(drive.readings).map(([label, reading]) => [
        label,
        {
          closedRowsForTheSubject: reading.closedRowsForTheSubject,
          poolRowsBefore: reading.poolRowsBefore,
        },
      ]),
    )).toEqual(EVERY_GUARD_HAD_A_SUBJECT);
  });

  // The first claim. Both shipped statements, run verbatim over nine
  // seeds — three window rows per raiser under each hand-over it
  // declares — each differing from the refusal it was spread from in
  // one member.
  //
  // Compared as one whole record rather than a case per row, so the
  // refusals and their controls fail in one diff and a reader sees
  // which of the nine moved. A drive that produced no reading at all
  // fails on its label rather than going unread.
  //
  // What a red here means depends on which labels moved. The raising
  // rows going red with the refusing rows green is a statement that
  // raises nothing, which is the shape a refusal case cannot report by
  // itself. The refusing rows alone going red is the guard gone or
  // comparing the wrong way round. One artifact's labels moving
  // together — three for `ar-ingest` and six for `ar-score`, which is
  // driven under two hand-overs — is a rule that landed in one raiser
  // and not the other, which is exactly what putting both in this
  // table is for: the property is written into both statements so that
  // a later change to attribution cannot reopen it in one of them.
  it('refuses a subject researched inside its window and raises it outside', () => {
    const drive = fixture();

    expect(Object.fromEntries(
      Object.entries(drive.readings).map(
        ([label, reading]) => [label, raiseOutcome(reading)],
      ),
    )).toEqual(EVERY_OUTCOME);
  });

  // The second claim, and the axis the window grid above holds still.
  // Every drive that raised a row is asked what it stamped on it, and
  // the answer is read off the stored row rather than off what the
  // statement said it did.
  //
  // Two directions of one rule. A caller naming the run its pass
  // belongs to gets that run on every row raised, which is the whole
  // of what makes the attribution join answerable — this column, to
  // `runs.id`, to `llm_calls.run_id`, for what one scheduled run
  // ultimately spent. A caller naming none gets NULL, and that NULL is
  // the column's own reading of itself: no originating run was
  // recorded, rather than one that went missing.
  //
  // Only one raiser reaches the second direction and that is a fact
  // about the two canvases rather than about this table. `ar-ingest`
  // resolves its own dispatcher's run and binds it bare, so the NULL
  // is unreachable from there and driving it would be driving a value
  // the expression cannot produce. `ar-score` is invoked, reads the
  // run off the item its caller handed over, and a capture-initiated
  // pass hands none — `ar-capture` opening its `runs` row in the node
  // that closes the pass, so at the moment it invokes the scorer there
  // is no id in existence to hand on.
  //
  // The apartness member is not decoration and it is what a stamp
  // reading is worth. Every id a seed writes is a bigint, so a
  // statement binding the domain where it should bind the run writes a
  // number of exactly the right shape, and on a seed whose sequences
  // all sat at one it writes the right number as well. Two filler runs
  // per seed put the run past every id beside it; this reading is what
  // says they did.
  //
  // Compared as one record for the reason the outcome above is. A
  // raiser whose stamp went missing moves the two labels that raised
  // under a caller naming a run, and leaves the other raiser's pair
  // alone: measured, dropping the column from both statements moves
  // all four and the two per-raiser legs partition them. That is the
  // shape that says the property landed in one canvas and not the
  // other, which is what both raisers are in this table for.
  it('stamps the run its caller named, and nothing where none was', () => {
    const drive = fixture();

    expect(Object.fromEntries(
      Object.entries(drive.readings).map(([label, reading]) => [
        label,
        {
          stamp: stampOutcome(reading),
          theRunIsApartFromEveryOtherIdSeeded:
            reading.theRunIsApartFromEveryOtherIdSeeded,
        },
      ]),
    )).toEqual(EVERY_STAMP);
  });

  // The third claim, and the one the two counters downstream rest on.
  // Each raiser is driven over a batch rather than over a subject,
  // and what is read is how it divided that batch up: four subjects
  // in the first, one per guard plus one both refuse plus one neither
  // does, and two in the second that nothing refuses at all.
  //
  // The partition is the first half. Each statement answers three
  // lists — what it raised, what the repeat guard refused and what
  // the interval guard refused — and they are claimed to divide the
  // subjects it called searchable rather than merely to describe
  // them. The subject BOTH guards refuse is what makes that a
  // reading: a statement counting it twice answers five bucketed
  // subjects over four searchable ones, and one counting it in
  // neither answers three. Both counts are numbers in the record
  // rather than a boolean holding them equal, which would be
  // satisfied where both sides are zero.
  //
  // Precedence is the second, and the same subject carries it. Both
  // guards refuse it and the record expects it in the repeat list
  // alone, which is the rule the raise statements are written to:
  // the cheaper guard is asked again as the second arm of a CASE and
  // the interval bucket is the remainder, so a subject in both lists
  // is a classifier that stopped being exclusive.
  //
  // The zero is the third, and it is the one the ledger downstream
  // reads. Over the batch nothing suppresses, both lists have to come
  // back EMPTY rather than absent: `jsonb_agg` over no rows answers
  // NULL, and only the `COALESCE` onto an empty array in front of each
  // projection makes the difference between a count of 0 in
  // `runs.counts` and a key nobody wrote. `NO_LIST_AT_ALL` is what
  // keeps the two apart here, a reading that coerced a null to an
  // empty list being one that could never report it.
  //
  // Every subject's bucket travels beside what the table gained for
  // it, because the raised bucket is a REMAINDER. What a raise
  // answers raising with are `research_pool` ids, so no projection
  // names the findings it raised and a subject in neither suppression
  // list is called raised by subtraction. A remainder that is really
  // a catch-all is invisible to the lists and obvious the moment the
  // table is asked whether the row appeared.
  it('divides a batch three ways and writes a zero for each guard', () => {
    const drive = fixture();

    expect(drive.batchReadings).toEqual(EVERY_BATCH_OUTCOME);
  });
});
