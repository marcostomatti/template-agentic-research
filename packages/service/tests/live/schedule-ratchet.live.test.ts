/**
 * The schedule ratchet, run against a real Postgres over the
 * statement a build of `ar-research` ships. Self-skips when
 * AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * A research pass that proposes a sooner run writes the time onto
 * the topic it was invoked for and counts the write, and that count
 * is what the next proposal is held against. `Close Research Run`
 * folds both into one `UPDATE topics` with a `CASE` per column,
 * because two data-modifying CTEs touching one row apply only one of
 * themselves and say nothing about which. What the fold buys is
 * invisible to every other gate here: the roster in
 * `tests/invariants/pool-sql.ts` asks the statement to NAME the
 * column and the comparison, and a statement re-expressed as two
 * writes carries both names while the counter silently stops moving.
 * This file is what puts the two columns to a server and reads them
 * back off the row.
 *
 * Three arms, and every pass that names a topic takes one. A gap
 * proposed under the domain's ceiling moves the due time and counts
 * the move; a gap proposed at or over it leaves both columns exactly
 * as they were; a pass proposing none resets the count to nought and
 * leaves the due time where the dispatcher put it. The walk below
 * drives all three in order over ONE topic, which is the whole of
 * what makes them arms of one rule rather than three statements: the
 * streak each pass is held against is the streak the pass before it
 * wrote.
 *
 * The refusal is an absence and its controls are the passes either
 * side of it. A statement that refused every proposal, and one that
 * never wrote the column at all, satisfy a refusal case exactly as
 * the ceiling does — so the two passes in front of it write, and the
 * pass after the reset writes again. Every one of them carries the
 * same payload apart from the gap it proposes, so what separates
 * them is the streak the topic stood at and nothing else.
 *
 * Each written pass proposes a DIFFERENT gap, which is not
 * decoration. Everything here runs inside one transaction, so
 * `now()` is fixed for every statement in it and a second write of
 * the same gap would land on the same instant as the first: a due
 * time read back after two passes would be the number one write is
 * enough to produce. Distinct gaps make each move visible as the
 * number that pass asked for, and they make a refusal legible as the
 * PREVIOUS pass's gap still standing.
 *
 * The due time is read as seconds from `now()` rather than as an
 * instant, which is the reading the fixed clock makes exact rather
 * than close. A row planted at seven thousand two hundred seconds
 * out is that far out at every statement in the transaction, and a
 * row the write moved is exactly the gap that pass proposed. So an
 * untouched row and a moved one are two integers whose arithmetic a
 * reader can check, rather than two timestamps.
 *
 * Where the ceiling comes from is the second axis, and it is rows
 * rather than a claim. A domain declaring `maxAgentReschedules` is
 * held to its own number and a domain declaring none to the build's
 * fallback, and the number this file gives a domain is refused
 * unless it is strictly UNDER that fallback. That is what makes the
 * walk's own refusal a reading of the settings member: a statement
 * ignoring `settings` and holding every domain to the fallback would
 * write where the walk expects a refusal, and the two rows at the
 * fallback are what say the other branch of the same CASE is read at
 * all.
 *
 * A third row is the type guard's alone. `settings` is jsonb and
 * holds whatever a writer put there, so a ceiling somebody wrote as
 * a STRING is not a number and the statement is written to fall back
 * rather than to read it. The row seeds a streak that string would
 * refuse and the fallback admits, so a `jsonb_typeof` test dropped
 * from the CASE turns that row from a write into a refusal while
 * nothing else here moves.
 *
 * A fourth is planted past both ceilings, and it is the only row
 * where the streak and the ceiling are DIFFERENT numbers. At a
 * ceiling they are equal by construction — a walk stops exactly
 * where it is held — so the failure entry naming both would read the
 * same under a statement that named one of them twice. An operator
 * lowering a domain's ceiling under a topic already past it is how
 * the two come apart, and this row is that operator.
 *
 * The fifth names a topic nobody holds, and it is what the
 * suppressed count is for. Its proposal writes no due time and its
 * run records `interval`, and yet no ceiling refused it: the join in
 * front of the write dropped the row. So a count of one and a count
 * of nought part the two states `scheduled_by` alone spells the same
 * way, and the entries part them again, the pass that met a ceiling
 * carrying two and the pass that named no row carrying one.
 *
 * What this file does not drive is the rest of the withheld arm.
 * `Propose Next Run` answers a null gap for four distinct reasons
 * and this file drives one of them; all four arrive here as the same
 * absent member and take the same arm, which is that arm's own width
 * and is argued where the statement is.
 *
 * The grid this file was measured against is eight legs, each
 * applied, rebuilt, run and reverted. Seven rewrite the shipped SQL
 * in `workflows/src/ar-research.json` and the eighth renames the
 * node on the canvas, and what a leg is worth is WHICH cases moved
 * rather than that the run went red.
 *
 * Two are the fold's, and they are what this file exists for.
 * Re-expressing the one write as two data-modifying CTEs, the second
 * counting what the first moved, reddens four of the five cases —
 * and driving the statement directly under it says why: the counter
 * never moves at all, the due time moves on every proposal, and the
 * ceiling therefore never engages. Removing the comparison from both
 * arms of the write reddens two, and leaves the run's own answer
 * alone, `gap_written` being spelled against the streak the walk
 * read rather than against the column: a write that refused nothing
 * still reports a refusal.
 *
 * Two more are the ceiling's source. Misspelling the settings
 * member, which leaves the fallback standing for every domain,
 * reddens the same four cases the fold does and for the opposite
 * reason: the counter moves exactly as it should and only the number
 * it is held against moved, so the walk's third proposal is written.
 * Dropping the `jsonb_typeof` test reddens three, and the one it
 * leaves alone is the walk's own precondition — the row it moves is
 * a single pass, so no later pass is held against a streak it
 * changed.
 *
 * The fifth is the arm a refusal must not take. Resetting the streak
 * where the ceiling refused reddens the same two cases removing the
 * comparison does. A reset there would spend the refusal rather than
 * keep it: the next proposals would be written again and the ceiling
 * would slow a walk rather than end one.
 *
 * Those are two PAIRS coming back equal at the granularity of a
 * case, which is a reading about this grid rather than about the
 * statement, and each pair is parted by a drive of the statement
 * rather than by a count. The fold leaves the walk's streak at
 * nought through all five passes where the misspelling walks it up
 * one at a time; removing the comparison writes the third proposal
 * and moves the due time with it where resetting the refused arm
 * leaves the due time exactly where it was and puts the streak back
 * at nought.
 *
 * The last two are the ledger's, and they are the narrowest here.
 * Dropping the suppressed count from the counts object reddens the
 * run's own case and nothing else, and dropping the ceiling's
 * failure entry reddens the entries case and nothing else. Two
 * disjoint singletons, which is what says the count and the pair are
 * two readings rather than one written twice.
 *
 * The eighth is the lookup's, and it reports at the FILE rather than
 * at a case. Renaming the node leaves the statement unfindable, the
 * refusal fires in `beforeAll`, and the JSON reporter answers nought
 * failed of five tests beside two failed suites — the shape a grid
 * scored on the per-case red count reads as a leg nobody ran. It is
 * also the only leg the first case moves under: nothing that
 * rewrites the SQL touches the build guard, so that case is weak on
 * its own and this is what says the tree is read for one statement
 * rather than for the first one found.
 *
 * The statement comes out of `workflows/dist/` and never
 * `workflows/src/`. A source carries an `__ENVVAR:` marker where the
 * artifact carries the number the build resolved it to, so the
 * fallback in the text under `src/` is not a number at all — and
 * what an instance runs is the artifact rather than what a source
 * said before a build.
 *
 * That artifact is rebuilt in front of the drive rather than read
 * where it lies: `pretest` builds it before the default suite and
 * bun's hook is exact-name scoped, so `bun run test:live` fires none
 * and the tree on disk is otherwise whatever last built it. The
 * build is a subprocess rather than a call for the reason
 * `tests/live/schedule-clamp.live.test.ts` records, a vitest worker
 * having no `Bun.Transpiler` for the Code node splice to run
 * through.
 *
 * The fallback the settings rows are placed either side of is read
 * from `ENV_DEFAULTS` rather than written out. That table is what
 * the default build resolves the marker from, so the streaks this
 * file seeds and the number the statement compares them against come
 * from one place; a fleet default moved in that table moves both
 * sides together, where a literal here would quietly stop straddling
 * it.
 *
 * Everything runs inside one transaction, rolled back at the end,
 * and the tables are reset in front of it by the harness's own
 * helper, which refuses to run against any database but the live
 * one. What that is for is a previous live file's leftovers: every
 * slug this file plants is its own, so a collision would arrive as a
 * failed seed rather than as a reading.
 *
 * Everything this file does sits inside the gate rather than beside
 * it. `describeLivePg` binds a `describe` and nothing above one, so
 * module scope runs on the skipped branch too, on every
 * `bun run test`: a build spawned or a connection opened at module
 * scope would run inside the isolated suite. So module scope here
 * holds constants and pure functions, and the drive is in
 * `beforeAll`.
 */
import type { BuiltWorkflow } from '../invariants/workflow-dist.js';
import type { Pool, PoolClient } from 'pg';

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ENV_DEFAULTS } from '../../scripts/workflow-markers.js';
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

/** The prefix of every line the build prints an artifact on. */
const BUILT_LINE = 'built ';

/** What {@link runBuild} reports for a run that completed. */
const BUILD_RAN = 'exit 0';

/** The artifact this file drives. */
const RESEARCH_ARTIFACT = 'ar-research.json';

/**
 * The node inside it, by the name it carries on the canvas.
 *
 * Read across the whole built tree rather than out of one artifact,
 * and counted: two workflows here already carry a node under one
 * name, so a lookup answering the first match found is a lookup that
 * could be reading somebody else's statement.
 */
const CLOSE_NODE = 'Close Research Run';

/**
 * The setting the fleet fallback is read from, spelled once.
 *
 * The name the marker in `workflows/src/ar-research.json` carries,
 * so the number this table answers with is the number the build
 * wrote into the artifact the drive runs.
 */
const FLEET_CEILING_SETTING = 'AR_RESEARCH_MAX_AGENT_RESCHEDULES';

/** The settings member a domain states a ceiling of its own in. */
const CEILING_SETTING_MEMBER = 'maxAgentReschedules';

/** The counts key a proposal the ceiling refused is counted into. */
const SUPPRESSED_COUNT_KEY = 'schedule_proposals_suppressed';

/**
 * What a pass records as having set the due time it leaves behind.
 *
 * The two answers `runs.scheduled_by` carries on this path. A third,
 * `operator`, is written by workflows that reschedule nothing, so it
 * is not one this statement can produce.
 */
const BY_THE_AGENT = 'agent';
const BY_THE_INTERVAL = 'interval';

/**
 * What the write did to each of the two columns, in the halves a
 * reading is composed out of.
 *
 * Total over both, so a write that moved one column and not the
 * other names its own shape in the diff rather than being absorbed
 * into one of the three arms. A streak that went neither up by one
 * nor to nought nor nowhere is spelled with the number it wrote.
 */
const MOVED_THE_DUE_TIME = 'moved the due time';
const LEFT_THE_DUE_TIME = 'left the due time';
const COUNTED_THE_MOVE = 'counted the move';
const LEFT_THE_STREAK = 'left the streak';
const RESET_THE_STREAK = 'reset the streak';

/**
 * The three arms, spelled out of the halves above.
 *
 * A reset from a streak that already stood at nought is
 * indistinguishable from a column left alone, and reads as the
 * second: what the column holds is the same number either way, and
 * no drive below resets from nought.
 */
const WROTE_THE_GAP = `${MOVED_THE_DUE_TIME} and ${COUNTED_THE_MOVE}`;
const LEFT_BOTH_ALONE = `${LEFT_THE_DUE_TIME} and ${LEFT_THE_STREAK}`;
const ENDED_THE_WALK = `${LEFT_THE_DUE_TIME} and ${RESET_THE_STREAK}`;

/**
 * The entry a pass writes when it proposed a gap and no due time was
 * written, in the words this file reads it back as.
 *
 * It is written for a ceiling that refused and for a topic nobody
 * holds alike, which is why the reading below is a LIST: what parts
 * the two states is whether the ceiling's own entry stands beside
 * it.
 */
const A_GAP_WITH_NO_WRITE = 'a gap proposed and no due time written';

/** What the entries reading answers for an error entry it cannot read. */
const NOT_AN_ENTRY_OBJECT = 'an entry that is not an object';
const NO_LIST_OF_ENTRIES = 'no list of entries on the row';

/** What the suppressed reading answers where there is no count to read. */
const NO_COUNTS_OBJECT = 'no counts object on the row';
const NO_SUPPRESSED_COUNT = 'no suppressed count a reader could find';

/**
 * How far out every seeded topic's due time is planted, in seconds.
 *
 * Distinct from every gap any pass below proposes, so a topic
 * reading this number back is one the write left alone rather than
 * one it happened to move to the same instant.
 */
const SEEDED_DUE_IN_SECONDS = 7200;

/**
 * What this file adds to a topic id to name one nobody holds.
 *
 * Far enough past the sequence that no row this seed writes can
 * carry it, and the case below counts the rows carrying it rather
 * than taking that on trust.
 */
const AN_ID_NOBODY_HOLDS = 10_000_000;

/**
 * What a pass records as having recorded, and what it drained.
 *
 * Both are lengths rather than rows: the statement counts the lists
 * the gathered pass carries and joins none of them, so what a member
 * holds decides nothing and how many there are decides every count.
 *
 * The pair is what makes each payload one `Propose Next Run` can
 * produce. That node withholds its proposal where the pass recorded
 * everything it drained, so a pass proposing a gap has left
 * something behind and a pass proposing none has not.
 */
const CANDIDATES_RECORDED = 1;
const CANDIDATES_DRAINED_WITH_A_GAP = 2;

/**
 * The sentence that node writes beside a withheld proposal.
 *
 * Carried on the payload because the node carries it, and read by
 * nothing: `runs` has nowhere to put it, and this statement takes
 * its arm off the absent gap rather than off the reason for one.
 */
const WITHHELD_SENTENCE = 'the pass recorded every candidate it drained';

/**
 * The fleet fallback, refused rather than read off nothing.
 *
 * Two refusals rather than one. An absent entry would arrive as
 * `NaN` and every streak derived from it would be planted as an
 * invalid integer, which surfaces as a failed seed rather than as a
 * table this file can no longer straddle. And a fallback under two
 * leaves no whole number strictly under it for a domain to be held
 * to, so the row that has to be refused by a domain's own ceiling
 * would be refused by the fallback as well and the grid would report
 * the two as one.
 *
 * @returns The consecutive agent reschedules a domain declaring no
 * ceiling of its own is held to.
 * @throws Error When the table names no such setting, or names it at
 * something this file cannot place a domain either side of.
 */
function fleetCeiling(): number {
  const declared = ENV_DEFAULTS[FLEET_CEILING_SETTING];
  const ceiling = Number(declared);

  if (!Number.isInteger(ceiling) || ceiling < 2) {
    throw new Error(
      `[schedule-ratchet] ENV_DEFAULTS answers ${String(declared)} for ` +
      `${FLEET_CEILING_SETTING}, which is not a ceiling a domain can be ` +
      'held under. Every streak below is planted against it, so the ' +
      'rows would be reporting their own arithmetic rather than the ' +
      'ceiling the statement applied.',
    );
  }

  return ceiling;
}

/** The ceiling a domain declaring none of its own is held to. */
const FLEET_CEILING = fleetCeiling();

/**
 * The ceiling this file gives a domain that declares one.
 *
 * A literal rather than a number derived from the fallback, because
 * the walk below is written out for it: two proposals written, a
 * third refused, and the reset and restart after that. What the
 * refusal below pins is that it is strictly UNDER the fallback,
 * which is the whole of what makes that third pass a reading of the
 * settings member rather than of the build's own number.
 */
const DOMAIN_CEILING = 2;

/** The streak a topic past both ceilings is planted at. */
const PAST_BOTH_CEILINGS = FLEET_CEILING + 2;

if (DOMAIN_CEILING >= FLEET_CEILING) {
  throw new Error(
    '[schedule-ratchet] the ceiling this file gives a domain ' +
    `(${String(DOMAIN_CEILING)}) is not under the fleet fallback ` +
    `(${String(FLEET_CEILING)}), so a statement that never read ` +
    'a domain\'s own settings would refuse the walk\'s third ' +
    'proposal exactly as one that did. The walk below is written ' +
    'out for a ceiling of two.',
  );
}

/**
 * What one pass is expected to have done, read four ways.
 *
 * One record per pass rather than one table per case, so the members
 * a case does not read are declared beside the ones it does and a
 * pass cannot go half-expected. Each case below projects the members
 * it is about.
 */
interface PassExpectation {
  /** The streak the topic stood at when the statement ran. */
  readonly theStreakItWasHeldAgainst: number;

  /** How far out its due time stood then, in seconds. */
  readonly theDueTimeItStoodAt: number;

  /** Which of the three arms the write took. */
  readonly theWrite: string;

  /** The streak the topic carries afterwards. */
  readonly theStreak: number;

  /** How far out its due time stands afterwards, in seconds. */
  readonly theDueTimeInSeconds: number;

  /**
   * Whether the statement's own answer names a rescheduled topic.
   *
   * The second reading of the same write. What a statement projects
   * and what the table holds are two things, and a due time that never
   * reached the column is exactly the shape either one alone would
   * miss.
   */
  readonly theStatementSaysItRescheduledTheTopic: boolean;

  /** What the run it opened records as having set the due time. */
  readonly scheduledBy: string;

  /** How many of its own proposals the ceiling refused. */
  readonly proposalsSuppressed: number;

  /** What it could not do, in the order the row records it. */
  readonly entries: readonly string[];
}

/** One pass a scenario drives, and what it has to have done. */
interface Pass {
  /** What the pass is called in a failure, and in its label. */
  readonly id: string;

  /**
   * The gap it proposes, or null where it proposes none.
   *
   * The one member the passes of a walk differ in, which is what makes
   * the streak the axis the walk varies.
   */
  readonly gapSeconds: number | null;

  /** What the statement has to have done about it. */
  readonly expected: PassExpectation;
}

/** One domain and topic, and the passes driven over them in order. */
interface Scenario {
  /** What the row is called in a failure, and in its seed's slug. */
  readonly id: string;

  /**
   * What the domain's `settings` state for the ceiling member, or null
   * where they state nothing at all.
   *
   * `unknown` rather than a number, because one row states it as a
   * string on purpose: the column is jsonb and holds whatever a writer
   * put there, and the statement is written to fall back rather than
   * to read a value that is not a number.
   */
  readonly ceiling: unknown;

  /** The streak its topic is planted at. */
  readonly seededStreak: number;

  /**
   * Whether the payload names a topic id nobody holds.
   *
   * The seeded topic is planted either way and read back either way,
   * so what this varies is only which id the proposal carries: at true
   * the write's own join drops the row, and the topic below has to
   * come back untouched.
   */
  readonly proposesATopicNobodyHolds: boolean;

  /** The passes driven over that topic, in order. */
  readonly passes: readonly Pass[];
}

/**
 * The walk, and the rows beside it.
 *
 * The first scenario is the claim: one topic, five passes, and the
 * streak each is held against is the one the pass before it left.
 * The two after it are where the ceiling came from, the fourth is
 * the pair of numbers a ceiling reached at its own value cannot tell
 * apart, and the fifth is the state `scheduled_by` spells the same
 * way as a refusal.
 */
const SCENARIOS: readonly Scenario[] = [
  {
    id: 'a domain that sets its own ceiling',
    ceiling: DOMAIN_CEILING,
    seededStreak: 0,
    proposesATopicNobodyHolds: false,
    passes: [
      {
        id: 'a first proposal',
        gapSeconds: 900,
        expected: {
          theStreakItWasHeldAgainst: 0,
          theDueTimeItStoodAt: SEEDED_DUE_IN_SECONDS,
          theWrite: WROTE_THE_GAP,
          theStreak: 1,
          theDueTimeInSeconds: 900,
          theStatementSaysItRescheduledTheTopic: true,
          scheduledBy: BY_THE_AGENT,
          proposalsSuppressed: 0,
          entries: [],
        },
      },
      {
        id: 'a second proposal',
        gapSeconds: 1800,
        expected: {
          theStreakItWasHeldAgainst: 1,
          theDueTimeItStoodAt: 900,
          theWrite: WROTE_THE_GAP,
          theStreak: 2,
          theDueTimeInSeconds: 1800,
          theStatementSaysItRescheduledTheTopic: true,
          scheduledBy: BY_THE_AGENT,
          proposalsSuppressed: 0,
          entries: [],
        },
      },
      {
        id: 'a third proposal, at the ceiling',
        gapSeconds: 2700,
        expected: {
          theStreakItWasHeldAgainst: 2,
          theDueTimeItStoodAt: 1800,
          theWrite: LEFT_BOTH_ALONE,
          theStreak: 2,
          theDueTimeInSeconds: 1800,
          theStatementSaysItRescheduledTheTopic: false,
          scheduledBy: BY_THE_INTERVAL,
          proposalsSuppressed: 1,
          entries: [A_GAP_WITH_NO_WRITE, aStreakUnderACeiling(2, 2)],
        },
      },
      {
        id: 'a pass proposing no gap',
        gapSeconds: null,
        expected: {
          theStreakItWasHeldAgainst: 2,
          theDueTimeItStoodAt: 1800,
          theWrite: ENDED_THE_WALK,
          theStreak: 0,
          theDueTimeInSeconds: 1800,
          theStatementSaysItRescheduledTheTopic: false,
          scheduledBy: BY_THE_INTERVAL,
          proposalsSuppressed: 0,
          entries: [],
        },
      },
      {
        id: 'a proposal after the reset',
        gapSeconds: 3600,
        expected: {
          theStreakItWasHeldAgainst: 0,
          theDueTimeItStoodAt: 1800,
          theWrite: WROTE_THE_GAP,
          theStreak: 1,
          theDueTimeInSeconds: 3600,
          theStatementSaysItRescheduledTheTopic: true,
          scheduledBy: BY_THE_AGENT,
          proposalsSuppressed: 0,
          entries: [],
        },
      },
    ],
  },
  {
    id: 'a domain that sets none, one under the fallback',
    ceiling: null,
    seededStreak: FLEET_CEILING - 1,
    proposesATopicNobodyHolds: false,
    passes: [
      {
        id: 'a proposal the fallback admits',
        gapSeconds: 4500,
        expected: {
          theStreakItWasHeldAgainst: FLEET_CEILING - 1,
          theDueTimeItStoodAt: SEEDED_DUE_IN_SECONDS,
          theWrite: WROTE_THE_GAP,
          theStreak: FLEET_CEILING,
          theDueTimeInSeconds: 4500,
          theStatementSaysItRescheduledTheTopic: true,
          scheduledBy: BY_THE_AGENT,
          proposalsSuppressed: 0,
          entries: [],
        },
      },
    ],
  },
  {
    id: 'a domain that sets none, at the fallback',
    ceiling: null,
    seededStreak: FLEET_CEILING,
    proposesATopicNobodyHolds: false,
    passes: [
      {
        id: 'a proposal the fallback refuses',
        gapSeconds: 5400,
        expected: {
          theStreakItWasHeldAgainst: FLEET_CEILING,
          theDueTimeItStoodAt: SEEDED_DUE_IN_SECONDS,
          theWrite: LEFT_BOTH_ALONE,
          theStreak: FLEET_CEILING,
          theDueTimeInSeconds: SEEDED_DUE_IN_SECONDS,
          theStatementSaysItRescheduledTheTopic: false,
          scheduledBy: BY_THE_INTERVAL,
          proposalsSuppressed: 1,
          entries: [
            A_GAP_WITH_NO_WRITE,
            aStreakUnderACeiling(FLEET_CEILING, FLEET_CEILING),
          ],
        },
      },
    ],
  },
  {
    id: 'a domain whose ceiling is written as a string',
    ceiling: String(DOMAIN_CEILING),
    seededStreak: DOMAIN_CEILING,
    proposesATopicNobodyHolds: false,
    passes: [
      {
        id: 'a proposal the fallback admits',
        gapSeconds: 6300,
        expected: {
          theStreakItWasHeldAgainst: DOMAIN_CEILING,
          theDueTimeItStoodAt: SEEDED_DUE_IN_SECONDS,
          theWrite: WROTE_THE_GAP,
          theStreak: DOMAIN_CEILING + 1,
          theDueTimeInSeconds: 6300,
          theStatementSaysItRescheduledTheTopic: true,
          scheduledBy: BY_THE_AGENT,
          proposalsSuppressed: 0,
          entries: [],
        },
      },
    ],
  },
  {
    id: 'a topic already past both ceilings',
    ceiling: DOMAIN_CEILING,
    seededStreak: PAST_BOTH_CEILINGS,
    proposesATopicNobodyHolds: false,
    passes: [
      {
        id: 'a proposal under a ceiling somebody lowered',
        gapSeconds: 7020,
        expected: {
          theStreakItWasHeldAgainst: PAST_BOTH_CEILINGS,
          theDueTimeItStoodAt: SEEDED_DUE_IN_SECONDS,
          theWrite: LEFT_BOTH_ALONE,
          theStreak: PAST_BOTH_CEILINGS,
          theDueTimeInSeconds: SEEDED_DUE_IN_SECONDS,
          theStatementSaysItRescheduledTheTopic: false,
          scheduledBy: BY_THE_INTERVAL,
          proposalsSuppressed: 1,
          entries: [
            A_GAP_WITH_NO_WRITE,
            aStreakUnderACeiling(PAST_BOTH_CEILINGS, DOMAIN_CEILING),
          ],
        },
      },
    ],
  },
  {
    id: 'a proposal naming a topic nobody holds',
    ceiling: DOMAIN_CEILING,
    seededStreak: 0,
    proposesATopicNobodyHolds: true,
    passes: [
      {
        id: 'a gap proposed for no row',
        gapSeconds: 8100,
        expected: {
          theStreakItWasHeldAgainst: 0,
          theDueTimeItStoodAt: SEEDED_DUE_IN_SECONDS,
          theWrite: LEFT_BOTH_ALONE,
          theStreak: 0,
          theDueTimeInSeconds: SEEDED_DUE_IN_SECONDS,
          theStatementSaysItRescheduledTheTopic: false,
          scheduledBy: BY_THE_INTERVAL,
          proposalsSuppressed: 0,
          entries: [A_GAP_WITH_NO_WRITE],
        },
      },
    ],
  },
];

/** One pass of one scenario, which is what a drive is. */
interface Drive {
  readonly scenario: Scenario;
  readonly pass: Pass;
}

/** Every pass this file drives, in the order the walks run. */
const EVERY_DRIVE: readonly Drive[] = SCENARIOS.flatMap(
  (scenario) => scenario.passes.map((pass) => ({ pass, scenario })),
);

/**
 * The entry a ceiling writes, in the words this file reads it back
 * as.
 *
 * The pair rather than either number alone. The entry exists because
 * a count of refusals cannot say how far the walk had got or what it
 * was stopped at, so a reading that dropped one of the two would be
 * the count again.
 *
 * @param streak - The streak the topic stood at.
 * @param ceiling - The ceiling it was held against.
 * @returns The two numbers, as one legible string.
 */
function aStreakUnderACeiling(streak: number, ceiling: number): string {
  return `a streak of ${String(streak)} against a ceiling of ` +
    String(ceiling);
}

/**
 * What one drive is called in a failure.
 *
 * @param drive - The scenario and pass.
 * @returns The label both the readings and the expectations key on.
 */
function driveLabel(drive: Drive): string {
  return `${drive.scenario.id} / ${drive.pass.id}`;
}

/**
 * The slug one scenario's rows are planted under.
 *
 * Derived from the scenario's own id, so two scenarios cannot share
 * one and `domains.slug` being UNIQUE turns a collision into a
 * failed seed rather than into a drive reading another row's topic.
 *
 * @param scenario - The scenario to name.
 * @returns A slug for its domain, entity-free and ASCII.
 */
function seedSlug(scenario: Scenario): string {
  return `schedule-ratchet-${scenario.id.replace(/[^a-z]+/gu, '-')}`;
}

/**
 * The first row of an answer, refused rather than coerced.
 *
 * @param rows - What the statement answered.
 * @param wrote - What was being read, for the failure.
 * @returns The first row.
 * @throws Error When there is none.
 */
function firstRow<T>(rows: readonly T[], wrote: string): T {
  const row = rows[0];

  if (row === undefined) {
    throw new Error(
      `[schedule-ratchet] ${wrote} answered no row at all, so there is ` +
      'nothing to read and every comparison below would be against an ' +
      'undefined.',
    );
  }

  return row;
}

/** The ids one scenario's seed wrote, and the one its payload names. */
interface PlantedTopic {
  /** The domain every row of the seed hangs off. */
  readonly domainId: string;

  /** The run a caller of this pass names as its own. */
  readonly callerRunId: string;

  /** The topic planted, and the row every reading is taken off. */
  readonly topicId: string;

  /**
   * The topic id the payload carries, which is the planted one on
   * every scenario but the last.
   */
  readonly proposedTopicId: string;
}

/**
 * Seed one domain, one caller's run and one topic.
 *
 * The topic is planted with a due time and a streak of its own,
 * which is what lets a row stand for a walk already in progress
 * without the passes that would have got it there. The column is a
 * plain counter with a NOT NULL default of nought, so a number
 * written into it is the same state a walk would have left.
 *
 * The run is seeded because the payload names one and this file
 * binds what the node above binds. The statement reads the member
 * and uses it nowhere — the row it opens is its own — so nothing
 * here turns on it, and seeding it is what keeps that true of the
 * payload rather than of this file.
 *
 * @param client - The open transaction to write through.
 * @param scenario - The row being planted.
 * @returns The ids the drive binds and reads back.
 */
async function plantTopic(
  client: PoolClient,
  scenario: Scenario,
): Promise<PlantedTopic> {
  const slug = seedSlug(scenario);
  const settings = scenario.ceiling === null
    ? {}
    : { [CEILING_SETTING_MEMBER]: scenario.ceiling };
  const domain = await client.query<{ row_id: string }>(
    `
      INSERT INTO domains (slug, name, settings)
      VALUES ($1, $1, $2::jsonb)
      RETURNING id::text AS row_id
    `,
    [slug, JSON.stringify(settings)],
  );
  const domainId = firstRow(domain.rows, `the ${slug} domain`).row_id;
  const run = await client.query<{ row_id: string }>(
    `
      INSERT INTO runs (domain_id, scheduled_by)
      VALUES ($1::bigint, 'interval')
      RETURNING id::text AS row_id
    `,
    [domainId],
  );
  const callerRunId = firstRow(run.rows, `the ${slug} run`).row_id;
  const topic = await client.query<{ row_id: string }>(
    `
      INSERT INTO topics (
        domain_id, name, interval_seconds, next_run_at, agent_reschedules
      )
      VALUES ($1::bigint, $2, $3::integer, now() + $4::interval, $5::integer)
      RETURNING id::text AS row_id
    `,
    [
      domainId,
      slug,
      SEEDED_INTERVAL_SECONDS,
      `${String(SEEDED_DUE_IN_SECONDS)} seconds`,
      scenario.seededStreak,
    ],
  );
  const topicId = firstRow(topic.rows, `the ${slug} topic`).row_id;

  return {
    callerRunId,
    domainId,
    proposedTopicId: scenario.proposesATopicNobodyHolds
      ? String(BigInt(topicId) + BigInt(AN_ID_NOBODY_HOLDS))
      : topicId,
    topicId,
  };
}

/**
 * The cadence every seeded topic carries of its own.
 *
 * Read by nothing this statement does — the column is NOT NULL and a
 * topic needs one — and distinct from every gap below, so a due time
 * that came from the row's own interval rather than from a proposal
 * would be visible.
 */
const SEEDED_INTERVAL_SECONDS = 5;

/**
 * The gathered pass, as the node's own expression stringifies it.
 *
 * One parameter and one JSON object, which is what the node binds:
 * the members are read out of it inside the statement rather than
 * bound one per node, so a payload built here is the whole of what a
 * drive varies.
 *
 * Every list is as long as the pass drained or recorded and holds
 * nothing the statement joins, because it joins none of them: what a
 * member holds decides nothing and how many there are decides a
 * count.
 *
 * @param planted - The ids this scenario seeded.
 * @param pass - The pass being driven.
 * @returns The one value the statement is bound with.
 */
function passPayload(planted: PlantedTopic, pass: Pass): string {
  const drained = pass.gapSeconds === null
    ? CANDIDATES_RECORDED
    : CANDIDATES_DRAINED_WITH_A_GAP;
  const pool = Array.from(
    { length: drained },
    (_, index) => `pool-${String(index + 1)}`,
  );

  return JSON.stringify({
    answers: pool.map(() => ({ refused: null })),
    drained: pool,
    gated: pool.map(() => ({ name_ok: true })),
    proposal: {
      candidates_drained: drained,
      domain_id: planted.domainId,
      gap_seconds: pass.gapSeconds,
      max_interval_seconds: null,
      min_interval_seconds: null,
      proposal_withheld: pass.gapSeconds === null
        ? WITHHELD_SENTENCE
        : null,
      proposed_seconds: pass.gapSeconds,
      research_recorded: CANDIDATES_RECORDED,
      run_id: planted.callerRunId,
      topic_id: planted.proposedTopicId,
    },
    records: Array.from(
      { length: CANDIDATES_RECORDED },
      (_, index) => ({ research_id: `research-${String(index + 1)}` }),
    ),
    staged: pool,
  });
}

/** What a topic carried at one moment. */
interface TopicReading {
  /** The streak on the row. */
  readonly streak: number;

  /**
   * How far out its due time stands, in seconds from `now()`.
   *
   * Null only where the column is, which no seed here leaves it and no
   * arm of the write can produce.
   */
  readonly dueInSeconds: number | null;
}

/**
 * Read one topic's two columns.
 *
 * The due time is read as a difference from `now()` rather than as
 * an instant, and inside one transaction that clock does not move: a
 * row planted at a fixed offset reads back at exactly that offset,
 * and a row the write moved reads back at exactly the gap that pass
 * proposed.
 *
 * @param client - The open transaction to read through.
 * @param topicId - The row to read.
 * @returns Its streak and its due time.
 */
async function topicReading(
  client: PoolClient,
  topicId: string,
): Promise<TopicReading> {
  const { rows } = await client.query<{
    agent_reschedules: number;
    due_in_seconds: number | null;
  }>(
    `
      SELECT
        agent_reschedules,
        EXTRACT(EPOCH FROM (next_run_at - now()))::integer
          AS due_in_seconds
      FROM topics
      WHERE id = $1::bigint
    `,
    [topicId],
  );
  const row = firstRow(rows, 'the planted topic');

  return { dueInSeconds: row.due_in_seconds, streak: row.agent_reschedules };
}

/**
 * How many topics carry the id a payload names.
 *
 * The precondition of the last scenario rather than a claim about
 * the statement. At one, a proposal this file calls unanswerable
 * names a row that is there, and the untouched topic below would be
 * a write that chose not to rather than a join that found nothing.
 *
 * @param client - The open transaction to read through.
 * @param topicId - The id the payload names.
 * @returns How many rows carry it.
 */
async function topicsCarrying(
  client: PoolClient,
  topicId: string,
): Promise<number> {
  const { rows } = await client.query<{ tally: string }>(
    'SELECT count(*) AS tally FROM topics WHERE id = $1::bigint',
    [topicId],
  );

  return Number(firstRow(rows, 'a topic count').tally);
}

/**
 * How many proposals a closed run records the ceiling as having
 * refused.
 *
 * Total over the two ways there is no number to read. A key nobody
 * wrote and a zero are the distinction the whole count rests on, so
 * a reading coercing one to the other could never report it.
 *
 * @param counts - The `counts` object off the run row.
 * @returns The count, or what stood where one should have.
 */
function suppressedReading(counts: unknown): number | string {
  if (typeof counts !== 'object' || counts === null) {
    return NO_COUNTS_OBJECT;
  }

  const value = (counts as Record<string, unknown>)[SUPPRESSED_COUNT_KEY];

  return typeof value === 'number'
    ? value
    : NO_SUPPRESSED_COUNT;
}

/**
 * One failure entry, in the words this file reads it back as.
 *
 * Total over what an entry can be. An entry naming neither pair is
 * spelled with its own member names, so a fourth entry landing here
 * is a line in the diff rather than a silent member of the list.
 *
 * @param entry - One member of the run's `errors`.
 * @returns What it says, as one legible string.
 */
function entryReading(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null) {
    return NOT_AN_ENTRY_OBJECT;
  }

  const record = entry as Record<string, unknown>;
  const streak = record['agent_reschedules'];
  const ceiling = record['max_agent_reschedules'];

  if (typeof streak === 'number' && typeof ceiling === 'number') {
    return aStreakUnderACeiling(streak, ceiling);
  }

  if (record['schedule_proposed'] === true) {
    return A_GAP_WITH_NO_WRITE;
  }

  const named = Object.keys(record).sort();

  return `an entry naming ${named.join(', ')}`;
}

/**
 * Everything a closed run records that this file reads.
 *
 * @param client - The open transaction to read through.
 * @param runId - The row the statement said it opened.
 * @returns What the row holds, reduced to what the cases compare.
 */
async function runReading(
  client: PoolClient,
  runId: string,
): Promise<{
  entries: readonly string[];
  proposalsSuppressed: number | string;
  scheduledBy: string;
}> {
  const { rows } = await client.query<{
    counts: unknown;
    errors: unknown;
    scheduled_by: string;
  }>(
    `
      SELECT scheduled_by, counts, errors
      FROM runs
      WHERE id = $1::bigint
    `,
    [runId],
  );
  const row = firstRow(rows, 'the run the statement opened');
  const errors = row.errors;

  return {
    entries: Array.isArray(errors)
      ? (errors as readonly unknown[]).map((entry) => entryReading(entry))
      : [NO_LIST_OF_ENTRIES],
    proposalsSuppressed: suppressedReading(row.counts),
    scheduledBy: row.scheduled_by,
  };
}

/** Everything one pass read, before the statement ran and after. */
interface PassReading {
  /** How many topics carried the id its proposal named. */
  readonly topicsCarryingTheIdTheProposalNames: number;

  /** What the topic carried when the statement ran. */
  readonly before: TopicReading;

  /** What it carries now. */
  readonly after: TopicReading;

  /** Whether the statement's own answer names a rescheduled topic. */
  readonly theStatementSaysItRescheduledTheTopic: boolean;

  /** What the statement answered for the schedule that set the time. */
  readonly scheduledByTheStatementAnswered: string;

  /** What the stored row records for the same thing. */
  readonly scheduledByOnTheRow: string;

  /** How many proposals that row records the ceiling as refusing. */
  readonly proposalsSuppressed: number | string;

  /** What it records the pass as having been unable to do. */
  readonly entries: readonly string[];
}

/**
 * A member of the statement's own answer, as text.
 *
 * @param answered - The row the statement returned.
 * @param member - The member to read.
 * @param label - The drive, for the failure.
 * @returns The value.
 * @throws Error When it is not a string, which for a bigint read off
 * this driver and for a text column alike is the only shape either
 * arrives in.
 */
function answeredText(
  answered: Record<string, unknown>,
  member: string,
  label: string,
): string {
  const value = answered[member];

  if (typeof value !== 'string') {
    throw new Error(
      `[schedule-ratchet] ${label} answered ${String(value)} for ` +
      `${member}, which is not a value this file can read the row it ` +
      'names back by. Either the statement stopped projecting it, or ' +
      'the column it comes off changed type.',
    );
  }

  return value;
}

/**
 * Run one pass over one planted topic and read back what it did.
 *
 * The statement is run as the artifact carries it. What is under
 * test is the text an instance would run, so a fragment lifted out
 * of it and evaluated on its own would be a second spelling of the
 * rule rather than a reading of the shipped one.
 *
 * @param client - The open transaction to drive through.
 * @param statement - The shipped SQL.
 * @param planted - The ids this scenario seeded.
 * @param drive - The scenario and pass being driven.
 * @returns Everything the cases below read for this pass.
 */
async function drivePass(
  client: PoolClient,
  statement: string,
  planted: PlantedTopic,
  drive: Drive,
): Promise<PassReading> {
  const label = driveLabel(drive);
  const before = await topicReading(client, planted.topicId);
  const answer = await client.query<Record<string, unknown>>(
    statement,
    [passPayload(planted, drive.pass)],
  );
  const answered = firstRow(answer.rows, label);
  const after = await topicReading(client, planted.topicId);
  const closed = await runReading(
    client,
    answeredText(answered, 'run_id', label),
  );

  return {
    after,
    before,
    entries: closed.entries,
    proposalsSuppressed: closed.proposalsSuppressed,
    scheduledByOnTheRow: closed.scheduledBy,
    scheduledByTheStatementAnswered: answeredText(
      answered,
      'scheduled_by',
      label,
    ),
    theStatementSaysItRescheduledTheTopic:
      typeof answered['topic_rescheduled'] === 'string',
    topicsCarryingTheIdTheProposalNames: await topicsCarrying(
      client,
      planted.proposedTopicId,
    ),
  };
}

/**
 * Which of the three arms one write took, in the halves it is
 * composed of.
 *
 * Total over both columns. A write that moved the due time without
 * counting it, or counted without moving, is spelled as what it did
 * rather than being read as one of the three arms, and a streak that
 * went somewhere else entirely is spelled with its own number.
 *
 * @param reading - What the pass read.
 * @returns The arm, as one string.
 */
function writeOutcome(reading: PassReading): string {
  const dueTime = reading.after.dueInSeconds === reading.before.dueInSeconds
    ? LEFT_THE_DUE_TIME
    : MOVED_THE_DUE_TIME;

  return `${dueTime} and ${streakOutcome(reading)}`;
}

/**
 * What the write did to the streak alone.
 *
 * @param reading - What the pass read.
 * @returns The half of the arm the counter carries.
 */
function streakOutcome(reading: PassReading): string {
  const { after, before } = reading;

  if (after.streak === before.streak + 1) {
    return COUNTED_THE_MOVE;
  }

  if (after.streak === before.streak) {
    return LEFT_THE_STREAK;
  }

  return after.streak === 0
    ? RESET_THE_STREAK
    : `wrote a streak of ${String(after.streak)}`;
}

/**
 * The statement this file drives, refused rather than stood in for.
 *
 * Counted across the whole built tree rather than looked up in one
 * artifact, because a node name is not unique across artifacts here
 * and a lookup answering the first match found could be reading
 * another workflow's statement.
 *
 * @param workflows - Every built workflow.
 * @returns Every statement any node of that name runs.
 */
function closeStatements(
  workflows: readonly BuiltWorkflow[],
): readonly string[] {
  return workflows.flatMap(
    (workflow) => workflow.nodes
      .filter((node) => node.name === CLOSE_NODE)
      .flatMap((node) => queryParametersOf(node)),
  );
}

/**
 * The one statement, refused where the tree carries any other number
 * of them.
 *
 * @param workflows - Every built workflow.
 * @returns The node's own SQL.
 * @throws Error When the built tree carries none, or more than one.
 */
function closeStatement(workflows: readonly BuiltWorkflow[]): string {
  const statements = closeStatements(workflows);
  const statement = statements[0];

  if (statement === undefined || statements.length !== 1) {
    throw new Error(
      '[schedule-ratchet] the built tree carries ' +
      `${String(statements.length)} nodes named ${CLOSE_NODE} running ` +
      'SQL, where this file drives one. It is written in ' +
      `workflows/src/${RESEARCH_ARTIFACT}.`,
    );
  }

  return statement;
}

/**
 * Build the workflow artifacts, in a subprocess.
 *
 * The default build rather than an external one, so its settings
 * come from `ENV_DEFAULTS` alone — which is what lets the fallback
 * the seeded streaks are placed either side of be read from that
 * table.
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
 * Drive every scenario's walk, inside one transaction, and answer
 * with everything the cases below read.
 *
 * The tables are reset in front of the transaction rather than
 * inside it, and the reset is the harness's own, which refuses to
 * run against any database but the live one.
 *
 * The transaction is rolled back at the end, which leaves the tables
 * as the reset left them. One transaction for every walk rather than
 * one apiece, so `now()` is one instant for the whole file and a due
 * time read in seconds is exact.
 *
 * @param pool - The live pool.
 * @param workflows - Every built workflow.
 * @returns What every pass read, by its own label.
 */
async function driveWalks(
  pool: Pool,
  workflows: readonly BuiltWorkflow[],
): Promise<Readonly<Record<string, PassReading>>> {
  await resetTables(pool);

  const statement = closeStatement(workflows);
  const readings: Record<string, PassReading> = {};
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const scenario of SCENARIOS) {
      const planted = await plantTopic(client, scenario);

      for (const pass of scenario.passes) {
        const drive = { pass, scenario };

        readings[driveLabel(drive)] = await drivePass(
          client,
          statement,
          planted,
          drive,
        );
      }
    }
  } finally {
    // Swallowed for the reason the sibling live files swallow theirs:
    // this runs whether or not the body threw, and a rollback that
    // raises in its turn would replace whatever did.
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }

  return readings;
}

/** What one drive of this file is, once it has been made. */
interface RatchetDrive {
  /** The artifacts the build reported writing. */
  readonly artifactsBuilt: readonly string[];

  /** What the build itself did. */
  readonly buildOutcome: string;

  /** How many statements the built tree carries under the node name. */
  readonly statementsTheTreeCarries: number;

  /** What every pass read, by its label. */
  readonly readings: Readonly<Record<string, PassReading>>;
}

/** What every pass is expected to have found in front of it. */
const EVERY_PRECONDITION: Readonly<Record<string, unknown>> =
  Object.fromEntries(EVERY_DRIVE.map((drive): [string, unknown] => [
    driveLabel(drive),
    {
      theDueTimeItStoodAt: drive.pass.expected.theDueTimeItStoodAt,
      theStreakItWasHeldAgainst: drive.pass.expected.theStreakItWasHeldAgainst,
      topicsCarryingTheIdTheProposalNames:
        drive.scenario.proposesATopicNobodyHolds
          ? 0
          : 1,
    },
  ]));

/** What every pass is expected to have written. */
const EVERY_WRITE: Readonly<Record<string, unknown>> =
  Object.fromEntries(EVERY_DRIVE.map((drive): [string, unknown] => [
    driveLabel(drive),
    {
      theDueTimeInSeconds: drive.pass.expected.theDueTimeInSeconds,
      theStatementSaysItRescheduledTheTopic:
        drive.pass.expected.theStatementSaysItRescheduledTheTopic,
      theStreak: drive.pass.expected.theStreak,
      theWrite: drive.pass.expected.theWrite,
    },
  ]));

/** What every pass is expected to have recorded on the run it opened. */
const EVERY_LEDGER: Readonly<Record<string, unknown>> =
  Object.fromEntries(EVERY_DRIVE.map((drive): [string, unknown] => [
    driveLabel(drive),
    {
      proposalsSuppressed: drive.pass.expected.proposalsSuppressed,
      scheduledByOnTheRow: drive.pass.expected.scheduledBy,
      scheduledByTheStatementAnswered: drive.pass.expected.scheduledBy,
    },
  ]));

/** What every pass is expected to have been unable to do. */
const EVERY_ENTRY_LIST: Readonly<Record<string, unknown>> =
  Object.fromEntries(EVERY_DRIVE.map((drive): [string, unknown] => [
    driveLabel(drive),
    drive.pass.expected.entries,
  ]));

let live: RatchetDrive | null = null;

/**
 * What `beforeAll` drove, refused rather than coerced.
 *
 * Called from inside a case rather than resolved beside it, so a
 * hook that did not finish reports as a named failure in the case
 * that wanted the value instead of as an assertion about `undefined`
 * — which for a comparison over an empty record is a green.
 *
 * @returns The shared drive.
 * @throws Error When `beforeAll` did not reach the end.
 */
function fixture(): RatchetDrive {
  if (live === null) {
    throw new Error(
      '[schedule-ratchet] the drive for this block was never made, so ' +
      'no statement was run and nothing was read back. Whatever ' +
      'beforeAll raised is above this in the run log.',
    );
  }

  return live;
}

/**
 * One member of every reading, projected the way a case reads it.
 *
 * @param readings - What every pass read.
 * @param project - What that case reads out of one pass.
 * @returns The same labels, carrying what the case compares.
 */
function readingsAs(
  readings: Readonly<Record<string, PassReading>>,
  project: (reading: PassReading) => unknown,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(readings).map(([label, reading]) => [
      label,
      project(reading),
    ]),
  );
}

describeLivePg('the schedule ratchet (live Postgres)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);

    const build = runBuild();
    const workflows = loadBuiltWorkflows();

    live = {
      artifactsBuilt: build.written,
      buildOutcome: build.outcome,
      readings: await driveWalks(pool, workflows),
      statementsTheTreeCarries: closeStatements(workflows).length,
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  // The first guard, and the one that says what was driven came out of
  // a build made here rather than off whatever last wrote the tree.
  //
  // The statement count is a reading across every artifact rather than
  // inside one. Two workflows here already carry a node under one
  // name,
  // so a second `Close Research Run` landing on another canvas would
  // leave a lookup reading whichever it found first, and this is what
  // reports it.
  //
  // The last member is what makes the walk's third pass a reading of
  // the settings member at all. A statement that never opened a
  // domain's `settings` would hold every topic to the build's own
  // fallback, and the only thing separating that from the rule is that
  // the ceiling this file gives a domain is strictly under it.
  it('drives the close statement a fresh build of ar-research carries', () => {
    const drive = fixture();

    expect({
      artifactsBuiltCarryTheResearcher:
        drive.artifactsBuilt.includes(RESEARCH_ARTIFACT),
      buildOutcome: drive.buildOutcome,
      statementsTheTreeCarries: drive.statementsTheTreeCarries,
      theDomainCeilingIsUnderTheFleetFallback: DOMAIN_CEILING < FLEET_CEILING,
    }).toEqual({
      artifactsBuiltCarryTheResearcher: true,
      buildOutcome: BUILD_RAN,
      statementsTheTreeCarries: 1,
      theDomainCeilingIsUnderTheFleetFallback: true,
    });
  });

  // The second guard, and the one the walk below cannot do without.
  // Every pass is read for what stood in front of it, and the table it
  // is held against is written out pass by pass rather than derived
  // from the pass before it.
  //
  // That is what makes the walk a walk. A statement whose counter
  // never
  // moved would leave every pass held against the streak the seed
  // planted, and the arms below would go on being read as arms while
  // each one was answering the same question. Here the third pass is
  // expected to have met the ceiling because the two in front of it
  // put
  // it there, and this case is where that is a reading rather than an
  // assumption.
  //
  // The topic count is the last scenario's own precondition. Its
  // proposal names an id this file expects nobody to hold, and a seed
  // that happened to write that row would turn a join finding nothing
  // into a write that chose not to.
  it('holds every pass against the streak the pass before it left', () => {
    const drive = fixture();

    expect(readingsAs(drive.readings, (reading) => ({
      theDueTimeItStoodAt: reading.before.dueInSeconds,
      theStreakItWasHeldAgainst: reading.before.streak,
      topicsCarryingTheIdTheProposalNames:
        reading.topicsCarryingTheIdTheProposalNames,
    }))).toEqual(EVERY_PRECONDITION);
  });

  // The first claim, and the one the fold is for. Both columns are
  // read
  // off the row after every pass, and which arm the write took is read
  // out of the pair rather than asserted about either.
  //
  // The two travel together because a statement re-expressed as two
  // data-modifying CTEs writes one of them and not the other, silently
  // and without saying which. A due time that moved on every proposal
  // while the counter stayed where the seed put it is a ceiling that
  // can never engage, and it is green under a roster asking the
  // statement to name both columns.
  //
  // What a red here means depends on which labels moved. The walk's
  // first two passes going red with the third green is a statement
  // that
  // refuses everything, which is the shape a refusal case cannot
  // report
  // by itself. The third alone is the ceiling gone or read the wrong
  // way round. The fourth alone is the reset, and the fifth is what
  // says the reset put the walk back at the start rather than merely
  // writing a nought nobody reads again.
  //
  // The statement's own answer travels beside the columns for the
  // reason the run below is read off the stored row: what a statement
  // projects and what the table holds are two readings, and a due time
  // that never reached the column is exactly the shape either one
  // alone
  // would miss.
  it('writes, refuses and resets over one topic in one walk', () => {
    const drive = fixture();

    expect(readingsAs(drive.readings, (reading) => ({
      theDueTimeInSeconds: reading.after.dueInSeconds,
      theStatementSaysItRescheduledTheTopic:
        reading.theStatementSaysItRescheduledTheTopic,
      theStreak: reading.after.streak,
      theWrite: writeOutcome(reading),
    }))).toEqual(EVERY_WRITE);
  });

  // The second claim, and the half of a refusal that is not an
  // absence.
  // A pass the ceiling turned away still closes its run, and what that
  // row records is the whole of what a reader has: the schedule that
  // set the due time, and how many of this pass's own proposals were
  // refused.
  //
  // `scheduled_by` is read off the write rather than off the intent,
  // so
  // a pass that proposed a gap and had it refused records `interval`
  // exactly as a pass that proposed none. That is deliberate and it is
  // why the count beside it exists: the column says what happened to
  // the topic and the count says whether a ceiling is what stopped it.
  //
  // The last scenario is what makes that count a reading. It records
  // `interval` too, and nothing suppressed it — the write's own
  // join dropped the row — so a count that answered one for
  // every unwritten proposal would be a count of proposals rather than
  // of refusals, and a domain whose cadence is being held down would
  // be
  // indistinguishable from a caller naming a topic that is not there.
  //
  // A zero rather than an absent key, on every pass that met no
  // ceiling. `runs.counts` carries a measured nought for every
  // question
  // a reader asks of a pass, and the reading here is total over the
  // two
  // ways there is no number: a key nobody wrote is named as such
  // rather
  // than coerced to the zero it would be read as.
  it('records what it wrote and what the ceiling refused on the run', () => {
    const drive = fixture();

    expect(readingsAs(drive.readings, (reading) => ({
      proposalsSuppressed: reading.proposalsSuppressed,
      scheduledByOnTheRow: reading.scheduledByOnTheRow,
      scheduledByTheStatementAnswered:
        reading.scheduledByTheStatementAnswered,
    }))).toEqual(EVERY_LEDGER);
  });

  // The third claim, and the pair a count cannot carry. A refused
  // proposal writes two entries: one saying a gap was proposed and no
  // due time written, and one naming the streak the topic stood at and
  // the ceiling it was held against.
  //
  // Read as an ordered list rather than as a membership, because the
  // two states that write the first entry are told apart by whether
  // the
  // second stands beside it. A ceiling that refused writes both; a
  // proposal naming a topic nobody holds writes the first alone, there
  // being no row to have read a streak off.
  //
  // The scenario planted past both ceilings is the only place the two
  // numbers in the second entry are different, and it is what says the
  // entry names two things rather than one thing twice. A walk stops
  // exactly where it is held, so at a ceiling the streak and the
  // ceiling are the same number and an entry reading the column twice
  // would be indistinguishable from one reading both sides of the
  // comparison. An operator lowering a ceiling under a topic already
  // past it is how they come apart, and the streak read there is the
  // one the row stood at rather than the one it now carries.
  it('names the streak and the ceiling in the entry a refusal writes', () => {
    const drive = fixture();

    expect(readingsAs(drive.readings, (reading) => reading.entries))
      .toEqual(EVERY_ENTRY_LIST);
  });
});
