/**
 * The record a research pass writes, put to a real Postgres, and the
 * refusal that stands between an intention and a result. Self-skips
 * when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * `ar-research`'s `Record Research` node inserts the `entity_research`
 * row and stamps `research_pool.researched_at` in ONE statement, and
 * what makes it one is `research_pool_approval_check`. That check
 * reads the pair of timestamps on the row being written and refuses
 * any row recording that it was closed without recording that it was
 * approved first, so the stamp carries the whole gate: split across
 * two statements, a result would outlive its own refusal. This file is
 * where that argument is put to a server rather than to a reader.
 *
 * ## What is new here, and what is next door
 *
 * `tests/live/schema.live.test.ts` already holds the CHECK itself. It
 * raises an open row, aims a hand-written UPDATE at it, reads the
 * refusal, and takes the same write over an approved row. What it
 * never touches is the statement an instance runs. This file drives
 * THAT — the text as the built artifact carries it, unedited, with the
 * parameter bound the way the canvas binds it — so a rewrite moving
 * the stamp out of the recording statement, or gating the two halves
 * on members able to disagree, is reported here and nowhere else.
 *
 * The two suites either side of it never issue it.
 * `tests/invariants/workflows.test.ts` reads this node's members
 * without running anything, and `tests/workflows/ar-research.test.ts`
 * drives the Code node that composes the item the statement is handed.
 * Between them sits the statement, and only a database can answer for
 * it.
 *
 * ## The refusal is paired with an acceptance, over one row
 *
 * A case asserting that a write was refused passes against a statement
 * that refuses everything, and equally against a fixture that planted
 * nothing for it to refuse. So the same statement, with the same
 * parameter, is put to the same row twice, and one UPDATE granting the
 * approval is the whole of the difference between the two: refused
 * while the intention is pending, taken once it is approved. Two rows
 * argued to differ in nothing else would be an argument; one row and
 * one column is a reading.
 *
 * The state the row was planted in rides in the same comparisons.
 * Give `approved_at` a default and the refusal below never happens,
 * which without the planted reading beside it reports as the CHECK
 * having gone rather than as the row having arrived approved.
 *
 * ## What each case reports, measured rather than argued
 *
 * Three mutations, each run against the live cluster and each
 * restored:
 *
 * THE CHECK DROPPED from the server. The two refusal cases redden and
 * the two acceptance cases stay green, which is the gate-removal
 * control the pairing above exists for.
 *
 * THE STAMP REMOVED from the shipped statement, in
 * `workflows/src/ar-research.json`. The two refusal cases and the
 * stamp case redden while the recording case stays green, so what is
 * being read is the artifact rather than a statement spelled here.
 *
 * THE INSERT HALF made to write nothing, same source. Exactly the two
 * acceptance cases redden and the refusal half stays green, which is
 * what says the positive control is not passing vacuously.
 *
 * The last two are planted under `workflows/src/` and not in the built
 * tree, where the rest of this port plants one: the drive below
 * rebuilds before it reads, so an artifact edited in place is
 * overwritten before any case sees it.
 *
 * ## The refusal is pinned on a name this repository chose
 *
 * `research_pool` carries TWO checks and both answer SQLSTATE 23514,
 * so the code does not say which rule refused: a statement that merely
 * misspelled the status it writes would satisfy a case pinned on it
 * alone. The constraint name says `research_pool_approval_check`, and
 * that is a name `src/db/schema/entities.ts` chose, which moves only
 * in a diff. The message names it too and is read by nothing here: it
 * is the server's own prose, it moves with a Postgres release, and it
 * quotes the failing row's values back, which is the last thing an
 * assertion should be carrying.
 *
 * Where those two fields sit depends on the client, and the reading
 * here is measured rather than assumed. An ORM wraps the driver error,
 * so `schema.live.test.ts` next door reads `cause.code` and
 * `cause.constraint` off a wrapper whose own fields are both
 * undefined. This file issues through a raw pool client and is handed
 * pg's `DatabaseError` itself — fields on the error, `cause`
 * undefined. The drive records that emptiness and a case below asserts
 * it, so a later move onto the ORM reddens naming the reason instead
 * of on two pins that quietly went undefined.
 *
 * ## The statement comes out of a build made here
 *
 * `workflows/dist/` and never `workflows/src/`. The two carry the same
 * text for this node today — measured, no marker stands anywhere in
 * this query — so what the dist read buys is not a difference in this
 * statement but the rule the rest of the port keeps: what an instance
 * runs is the artifact, a node that later takes a setting marker
 * carries text under `src/` that is not SQL at all, and a reader keyed
 * to the source would go on passing over the gap.
 *
 * The artifact is rebuilt in front of the drive rather than read where
 * it lies, for the reason `schedule-clamp.live.test.ts` sets out at
 * length: `pretest` is exact-name scoped, so `bun run test:live` fires
 * none and the tree on disk is whatever last built it, while a stale
 * artifact differs from a fresh one by a stamp in a sticky note that
 * no reading here would notice. The build is a subprocess rather than
 * a call because it constructs a `Bun.Transpiler` — this workflow
 * inlines libraries into four Code nodes — and a vitest worker has
 * none, the polyfill `vitest.config.ts` installs leaving a partial
 * `Bun` global behind.
 *
 * ## Everything sits inside the gate
 *
 * `describeLivePg` binds a `describe` and nothing above one, so module
 * scope runs on the skipped branch as well, on every `bun run test`: a
 * build spawned or a connection opened beside the block would run
 * inside the isolated suite. So module scope here holds constants and
 * pure functions, and the drive is in `beforeAll`.
 *
 * ## One drive, made once and read by every case
 *
 * It resets the tables the harness names, plants one domain, one
 * subject, one run and one intention, and puts the statement to that
 * intention twice. The reset in front of it is what stops another live
 * file's leftovers being counted as rows this file wrote.
 *
 * The whole of it is one transaction, rolled back at the end, so
 * nothing planted here outlives the run. The refused statement sits
 * between a SAVEPOINT and a ROLLBACK TO SAVEPOINT, which is
 * load-bearing rather than tidy: a CHECK violation aborts the
 * transaction, so every reading after it — the entire claim that both
 * tables were left as they were — comes back as `current transaction
 * is aborted` without one. That rollback is also what lets the
 * acceptance run against the same row, undoing the refused statement
 * while leaving the plant standing.
 *
 * The first of the two rollbacks is CONDITIONAL, and the drive says
 * why at the line: taken unconditionally it also undoes a statement
 * that was never refused, which is precisely the state the untouched
 * -tables case is written to report. Measured with the constraint
 * dropped from the server, that case stayed green over a write that
 * had landed and been rolled back out from under it.
 */
import type { BuiltWorkflow } from '../invariants/workflow-dist.js';
import type { Pool, PoolClient } from 'pg';

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { loadBuiltWorkflows } from '../invariants/workflow-dist.js';
import { queryParametersOf } from '../invariants/workflow-rosters.js';

import {
  applyMigrations,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The build entry point, resolved from this file's own location rather
 * than from the working directory.
 *
 * The suite is launched from the package and from the repo root alike,
 * and only one of those makes a relative path name this script — the
 * same reason the build and invariant suites resolve their roots this
 * way.
 */
const BUILD_ENTRY = fileURLToPath(
  new URL('../../scripts/build-workflows.ts', import.meta.url),
);

/** The prefix of every line that build prints an artifact on. */
const BUILT_LINE = 'built ';

/** What {@link runBuild} reports for a run that completed. */
const BUILD_RAN = 'exit 0';

/** The artifact this file reads its statement out of. */
const RESEARCH_ARTIFACT = 'ar-research.json';

/** The node on that canvas whose statement is driven. */
const RECORD_NODE = 'Record Research';

/**
 * The rule the refusal below is pinned to, by the name this repository
 * gave it in `src/db/schema/entities.ts`.
 */
const APPROVAL_CONSTRAINT = 'research_pool_approval_check';

/**
 * The SQLSTATE a CHECK answers with, and on its own no discriminator:
 * `research_pool_status_check` sits on the same table and answers the
 * same five characters.
 */
const CHECK_VIOLATION = '23514';

/** The domain the whole fixture hangs off. */
const FIXTURE_SLUG = 'research-record-seam';

/**
 * The subject the intention names, and the normalized half beside it.
 *
 * `entities.name_norm` is NOT NULL with no default, so a plant leaving
 * it out aborts the transaction at the first insert — which arrives as
 * a drive that never happened rather than as anything about the gate.
 *
 * Neutral vocabulary, like every other fixture in this port: what a
 * domain researches arrives from its own rows at run time and never
 * from a test.
 */
const SUBJECT_NAME = 'Rain gauge 4';

/** The stored normalization of {@link SUBJECT_NAME}. */
const SUBJECT_NAME_NORM = 'rain gauge 4';

/** The prose half of the result the statement is handed. */
const RESEARCH_SUMMARY = 'The gauge held its reading all week.';

/**
 * The structured half, and the member both writes are gated on.
 *
 * The statement reads it through `jsonb_typeof`, so an object is what
 * reaches a write; this file drives the recording path and leaves the
 * refusing one to `tests/workflows/ar-research.test.ts`, which reaches
 * it without a database.
 */
const RESEARCH_PAYLOAD = { rainfall_mm: 12 };

/**
 * The fields a driver error carries that name a rule.
 *
 * Declared here rather than imported because the two live files that
 * read one reach it through different clients: this one is handed pg's
 * `DatabaseError` and reads these off the error, `schema.live.test.ts`
 * is handed an ORM wrapper and reads them off its `cause`.
 */
interface DriverError {
  /** The SQLSTATE, five characters. */
  readonly code?: string;

  /** The constraint that refused, where the mechanism names one. */
  readonly constraint?: string;
}

/** What a pin reading answers, whether or not anything was refused. */
interface RefusalPins {
  /** Whether the statement was refused at all. */
  readonly refused: boolean;

  /** The SQLSTATE the refusal carried. */
  readonly code: string | undefined;

  /** The rule it named. */
  readonly constraint: string | undefined;

  /**
   * Whether the thrown value carried no `cause`.
   *
   * The pins above are read off the error itself, which is what a raw
   * client hands back. This is that reading's own control: an ORM
   * wrapping the driver error puts both fields on `cause` and leaves
   * its own undefined, so this member is what reddens naming the move
   * rather than leaving two pins quietly answering nothing.
   */
  readonly wrappedNothing: boolean;
}

/** One intention, as the table holds it at a moment. */
interface PoolState {
  /** The account of the row an operator reads. */
  readonly status: string;

  /** Whether somebody has ruled in favour. */
  readonly approved: boolean;

  /** Whether the row records that it was closed. */
  readonly stamped: boolean;
}

/** One stored result, as `entity_research` holds it. */
interface StoredResearch {
  /** Its own surrogate key, as text. */
  readonly row_id: string;

  /** The subject it is about. */
  readonly entity_id: string;

  /** The run that produced it. */
  readonly run_id: string | null;

  /** Its prose half. */
  readonly summary: string | null;

  /** Its structured half. */
  readonly payload: unknown;
}

/** The one row the statement answers, per item it was handed. */
interface RecordedRow {
  /** The run the pass was opened under. */
  readonly run_id: string;

  /** The intention it acted on. */
  readonly pool_id: string;

  /** The domain both belong to. */
  readonly domain_id: string;

  /** The subject researched. */
  readonly entity_id: string;

  /** The result written, or null where nothing was. */
  readonly research_id: string | null;

  /** The intention closed, or null where none was. */
  readonly pool_id_closed: string | null;
}

/** The ids one plant stored, as text. */
interface PlantedSubject {
  /** The domain everything below hangs off. */
  readonly domainId: string;

  /** The subject the intention names. */
  readonly entityId: string;

  /** The intention the statement is put to. */
  readonly poolId: string;

  /** The run the pass records against. */
  readonly runId: string;
}

/** What `beforeAll` drove, and every case below reads. */
interface RecordDrive {
  /** How the build in front of the drive went. */
  readonly buildOutcome: string;

  /** The artifacts that build reported writing, by file name. */
  readonly artifactsBuilt: readonly string[];

  /** How many statements the built record node runs. */
  readonly statementsInTheRecordNode: number;

  /** The ids the plant stored, and what every comparison is against. */
  readonly planted: PlantedSubject;

  /** The intention as it was planted, before anything ran. */
  readonly plantedPool: PoolState;

  /** What the refused statement raised. */
  readonly refusalPins: RefusalPins;

  /** The results standing after the refusal was rolled back. */
  readonly refusedResearch: readonly StoredResearch[];

  /** The intention as the refusal left it. */
  readonly refusedPool: PoolState;

  /** The intention as the approval left it. */
  readonly approvedPool: PoolState;

  /** What the accepted statement answered. */
  readonly recorded: readonly RecordedRow[];

  /** The results standing after it. */
  readonly storedResearch: readonly StoredResearch[];

  /** The intention as it left it. */
  readonly storedPool: PoolState;
}

/**
 * The first row of a result, refused rather than read off nothing.
 *
 * Destructuring an empty result yields undefined and a drive then dies
 * on a property access, naming neither the statement that returned
 * nothing nor what was being planted at the time.
 *
 * @param rows - Whatever the statement returned.
 * @param wrote - What the statement was asked to write.
 * @returns Its first row.
 * @throws Error When it returned none.
 */
function firstRow<T>(rows: readonly T[], wrote: string): T {
  const row = rows[0];

  if (row === undefined) {
    throw new Error(
      `[research-approval] the statement writing ${wrote} returned no ` +
      'row, so the plant this drive stands on is not there and every ' +
      'reading below would be about a fixture that was never made.',
    );
  }

  return row;
}

/**
 * Build the workflows the way `bun run build:workflows` does, and
 * answer with what it wrote and how it went.
 *
 * The shipped entry point as a subprocess rather than `buildAll` with
 * a stand-in loader: what the statement below is read out of has to be
 * the artifact the shipped command writes, and a build assembled here
 * would be about some other one.
 *
 * The default build rather than `--external`, so its settings come
 * from the build's own defaults table alone and nothing an operator
 * exported reaches the artifact this reads.
 *
 * @returns Its outcome, and the file names it reported writing.
 */
function runBuild(): { outcome: string; written: readonly string[] } {
  const run = spawnSync('bun', [BUILD_ENTRY], { encoding: 'utf8' });
  const failed = `exit ${String(run.status)}: `
    + `${run.error?.message ?? ''}${run.stderr ?? ''}`;
  const written = (run.stdout ?? '')
    .split('\n')
    .filter((line) => line.startsWith(BUILT_LINE))
    .map((line) => basename(line.slice(BUILT_LINE.length)));

  return {
    outcome: run.status === 0
      ? BUILD_RAN
      : failed,
    written,
  };
}

/**
 * The built research pass, refused rather than searched for silently.
 *
 * @param built - Everything `loadBuiltWorkflows` handed back.
 * @returns The one artifact this file reads its statement out of.
 * @throws Error When the built tree does not hold it.
 */
function researchWorkflow(built: readonly BuiltWorkflow[]): BuiltWorkflow {
  const found = built.find((workflow) => workflow.file === RESEARCH_ARTIFACT);

  if (found === undefined) {
    throw new Error(
      `[research-approval] the built tree holds no ${RESEARCH_ARTIFACT}, ` +
      'so there is no record statement to run and every reading below ' +
      'would be about a workflow nobody built. It is written from ' +
      `workflows/src/${RESEARCH_ARTIFACT}.`,
    );
  }

  return found;
}

/**
 * Every statement the record node runs, in canvas order.
 *
 * A list rather than the one statement, because how many there are is
 * a reading a case makes: a node running two is a canvas that split
 * the recording in half, which is the shape the whole file argues
 * against, and taking the first silently would drive one of them and
 * report nothing.
 *
 * @param workflow - The built research pass.
 * @returns Its record node's SQL, however many there is.
 */
function recordStatements(workflow: BuiltWorkflow): readonly string[] {
  return workflow.nodes
    .filter((node) => node.name === RECORD_NODE)
    .flatMap((node) => queryParametersOf(node));
}

/**
 * The one statement this file drives, refused rather than stood in
 * for.
 *
 * @param workflow - The built research pass.
 * @returns The record node's own SQL.
 * @throws Error When the node is gone or runs none.
 */
function recordStatement(workflow: BuiltWorkflow): string {
  const statement = recordStatements(workflow)[0];

  if (statement === undefined) {
    throw new Error(
      `[research-approval] ${RESEARCH_ARTIFACT} holds no node named ` +
      `${RECORD_NODE} running SQL, so there is nothing to drive. ` +
      'Either the node was renamed on the canvas, or this file names ' +
      'one that was.',
    );
  }

  return statement;
}

/**
 * What a refusal named, read off the error the client raised.
 *
 * Total over a statement that was not refused at all, which is the
 * answer a broken gate gives: `refused` false and both pins undefined
 * says the write went through, where a thrown value with empty pins
 * says the client wrapped it.
 *
 * @param thrown - Whatever the drive caught, or null for no refusal.
 * @returns The pins, and the two controls beside them.
 */
function refusalPins(thrown: unknown): RefusalPins {
  if (!(thrown instanceof Error)) {
    return {
      code: undefined,
      constraint: undefined,
      refused: false,
      wrappedNothing: true,
    };
  }

  const raised = thrown as Error & DriverError;

  return {
    code: raised.code,
    constraint: raised.constraint,
    refused: true,
    wrappedNothing: raised.cause === undefined,
  };
}

/**
 * The intention as the table holds it now.
 *
 * The two timestamps are read as booleans rather than as instants. It
 * is their presence the rule is about, and a clock reading in an
 * assertion would be a value this file cannot predict.
 *
 * @param client - The open transaction to read through.
 * @param poolId - The row to read.
 * @returns Its account and the pair of stamps, as presence.
 */
async function readPool(
  client: PoolClient,
  poolId: string,
): Promise<PoolState> {
  const { rows } = await client.query<PoolState>(
    `
      SELECT
        status,
        approved_at IS NOT NULL AS approved,
        researched_at IS NOT NULL AS stamped
      FROM research_pool
      WHERE id = $1::bigint
    `,
    [poolId],
  );

  return firstRow(rows, `no row: the ${poolId} intention`);
}

/**
 * Every result stored about one subject, oldest first.
 *
 * Scoped to the subject rather than counted over the table, so a row
 * another live file left behind is not read as one this drive wrote —
 * the reset in front of the transaction covers the same ground and
 * this is what keeps the reading true without it.
 *
 * @param client - The open transaction to read through.
 * @param entityId - The subject to read about.
 * @returns Its stored results, in the order they were written.
 */
async function readResearch(
  client: PoolClient,
  entityId: string,
): Promise<readonly StoredResearch[]> {
  const { rows } = await client.query<StoredResearch>(
    `
      SELECT
        id::text AS row_id,
        entity_id::text AS entity_id,
        run_id::text AS run_id,
        summary,
        payload
      FROM entity_research
      WHERE entity_id = $1::bigint
      ORDER BY id
    `,
    [entityId],
  );

  return rows;
}

/**
 * The content of a list of stored results, without their own ids.
 *
 * What a comparison over the whole row cannot say is anything: a
 * surrogate key is a value this file has no way to predict, so a case
 * holding one would either read it off the very list it is judging or
 * loosen into a shape assertion. The identity of the row the statement
 * says it wrote is read separately, against the id the statement
 * answered with.
 *
 * @param rows - Whatever was stored.
 * @returns The same rows, without `row_id`.
 */
function researchContent(
  rows: readonly StoredResearch[],
): readonly Omit<StoredResearch, 'row_id'>[] {
  return rows.map((row) => ({
    entity_id: row.entity_id,
    payload: row.payload,
    run_id: row.run_id,
    summary: row.summary,
  }));
}

/**
 * Plant the whole fixture: one domain, one subject, one run and one
 * intention nobody has ruled on.
 *
 * One of each, and one intention rather than two. What the drive
 * varies is a single column on a single row, so the acceptance below
 * is the identical statement over the identical row and the approval
 * is the whole of the difference — where two rows would have to be
 * argued to differ in nothing else.
 *
 * The intention is raised with its columns left out where a default
 * says what a fresh row means: `status` defaults to `pending` and both
 * timestamps to NULL, which is the open state every intention starts
 * in. Setting them here would be this fixture stating the precondition
 * rather than the table doing it, and the drive reads them back either
 * way.
 *
 * @param client - The open transaction to write through.
 * @returns The stored ids, as text.
 */
async function plantSubject(client: PoolClient): Promise<PlantedSubject> {
  const domain = await client.query<{ row_id: string }>(
    `
      INSERT INTO domains (slug, name)
      VALUES ($1, $1)
      RETURNING id::text AS row_id
    `,
    [FIXTURE_SLUG],
  );
  const domainId = firstRow(domain.rows, 'the fixture domain').row_id;
  const entity = await client.query<{ row_id: string }>(
    `
      INSERT INTO entities (domain_id, name, name_norm)
      VALUES ($1::bigint, $2, $3)
      RETURNING id::text AS row_id
    `,
    [domainId, SUBJECT_NAME, SUBJECT_NAME_NORM],
  );
  const entityId = firstRow(entity.rows, 'the fixture subject').row_id;
  const run = await client.query<{ row_id: string }>(
    `
      INSERT INTO runs (domain_id, scheduled_by)
      VALUES ($1::bigint, 'interval')
      RETURNING id::text AS row_id
    `,
    [domainId],
  );
  const pool = await client.query<{ row_id: string }>(
    `
      INSERT INTO research_pool (domain_id, entity_id)
      VALUES ($1::bigint, $2::bigint)
      RETURNING id::text AS row_id
    `,
    [domainId, entityId],
  );

  return {
    domainId,
    entityId,
    poolId: firstRow(pool.rows, 'the fixture intention').row_id,
    runId: firstRow(run.rows, 'the fixture run').row_id,
  };
}

/**
 * The item the statement is handed, serialized the way the canvas
 * serializes it.
 *
 * ONE parameter carrying the whole item, bound as TEXT and cast to
 * `jsonb` by the statement itself. That is what the node does: its
 * `queryReplacement` is `JSON.stringify($json)`, so an instance binds
 * a string and never a structured value, and a drive binding an object
 * would be testing a shape nothing ships.
 *
 * The members are the ones `Judge Research Answer` composes. A refused
 * answer arrives here with `research_payload` absent, which the
 * statement reads as recording nothing; this file always sends one,
 * the refusing path being reachable offline.
 *
 * @param planted - The ids the plant stored.
 * @returns The parameter, as the canvas would bind it.
 */
function recordItem(planted: PlantedSubject): string {
  return JSON.stringify({
    domain_id: planted.domainId,
    entity_id: planted.entityId,
    pool_id: planted.poolId,
    research_payload: RESEARCH_PAYLOAD,
    research_summary: RESEARCH_SUMMARY,
    run_id: planted.runId,
  });
}

/**
 * Grant the approval, and read back that it landed.
 *
 * A separate UPDATE rather than a column set at the insert, so the two
 * halves of the drive differ by one statement instead of by how the
 * row arrived. The CHECK reads the whole row on every write either
 * way.
 *
 * Both members are written because both are what an operator's ruling
 * does: `scripts/approve.ts` sets the stamp the CHECK reads and the
 * account beside it, and a fixture writing only the first would leave
 * a row whose two accounts disagree — the state this canvas argues
 * against everywhere else.
 *
 * @param client - The open transaction to write through.
 * @param poolId - The intention to approve.
 * @returns Its state once approved.
 */
async function approveIntention(
  client: PoolClient,
  poolId: string,
): Promise<PoolState> {
  const approved = await client.query<{ row_id: string }>(
    `
      UPDATE research_pool
         SET approved_at = now(), status = 'approved'
       WHERE id = $1::bigint
      RETURNING id::text AS row_id
    `,
    [poolId],
  );

  firstRow(approved.rows, 'the approval this drive turns on');

  return readPool(client, poolId);
}

/**
 * Put the statement to one intention twice, and answer with
 * everything the cases below read.
 *
 * The tables are reset in front of the transaction rather than inside
 * it, and the reset is the harness's own, which refuses to run against
 * any database but the live one.
 *
 * The statement is run VERBATIM, both times. What is under test is the
 * text an instance would run, so a fragment lifted out of it and
 * evaluated on its own would be a second spelling of the rule rather
 * than a reading of the shipped one.
 *
 * @param pool - The live pool.
 * @param statement - The record node's SQL, as the artifact carries it.
 * @returns What every case below is asserted over.
 */
async function driveRecord(
  pool: Pool,
  statement: string,
): Promise<Omit<RecordDrive, 'artifactsBuilt' | 'buildOutcome'
  | 'statementsInTheRecordNode'>> {
  await resetTables(pool);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const planted = await plantSubject(client);
    const item = recordItem(planted);
    const plantedPool = await readPool(client, planted.poolId);

    // The savepoint the whole refusal half rests on. A CHECK violation
    // aborts the transaction, so the two readings taken after it are
    // unreachable without one — and rolling back to it is also what
    // leaves the plant standing for the acceptance below.
    await client.query('SAVEPOINT before_the_refusal');

    const thrown: unknown = await client
      .query(statement, [item])
      .then(() => null, (raised: unknown) => raised);

    // Rolled back HERE only where the statement was refused, and that
    // condition is what gives the reading below anything to say. A
    // refusal aborts the transaction, so it has to be undone before
    // another reading is possible at all; a statement that was NOT
    // refused has written, and undoing it first would erase exactly
    // the state this reading exists to report — leaving it
    // indistinguishable from a refusal. Measured: with the constraint
    // dropped from the server, the unconditional form left the
    // untouched-tables case green over a write that had landed.
    if (thrown !== null) {
      await client.query('ROLLBACK TO SAVEPOINT before_the_refusal');
    }

    const refusedResearch = await readResearch(client, planted.entityId);
    const refusedPool = await readPool(client, planted.poolId);

    // Unconditional, so the acceptance below runs against the row as
    // it was planted whichever way the statement above went.
    await client.query('ROLLBACK TO SAVEPOINT before_the_refusal');
    const approvedPool = await approveIntention(client, planted.poolId);
    const recorded = await client.query<RecordedRow>(statement, [item]);

    return {
      approvedPool,
      planted,
      plantedPool,
      recorded: recorded.rows,
      refusalPins: refusalPins(thrown),
      refusedPool,
      refusedResearch,
      storedPool: await readPool(client, planted.poolId),
      storedResearch: await readResearch(client, planted.entityId),
    };
  } finally {
    // Swallowed for the reason `applyMigrations` swallows its own
    // unlock: this runs whether or not the body threw, and a rollback
    // that raises in its turn would replace whatever did.
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }
}

let live: RecordDrive | null = null;

/**
 * What `beforeAll` drove, refused rather than coerced.
 *
 * Called from inside a case rather than resolved beside it, so a hook
 * that did not finish reports as a named failure in the case that
 * wanted the value instead of as an assertion about `undefined` —
 * which for a comparison over an empty list is a green.
 *
 * @returns The shared drive.
 * @throws Error When `beforeAll` did not reach the end.
 */
function fixture(): RecordDrive {
  if (live === null) {
    throw new Error(
      '[research-approval] the drive for this block was never made, ' +
      'so no statement was run and nothing was read back. Whatever ' +
      'beforeAll raised is above this in the run log.',
    );
  }

  return live;
}

describeLivePg('research approval gate (live Postgres)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);

    const build = runBuild();
    const workflow = researchWorkflow(loadBuiltWorkflows());
    const driven = await driveRecord(pool, recordStatement(workflow));

    live = {
      ...driven,
      artifactsBuilt: build.written,
      buildOutcome: build.outcome,
      statementsInTheRecordNode: recordStatements(workflow).length,
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  // The first guard, and the one that says what was driven came out of
  // a build made here rather than off whatever last wrote the tree.
  //
  // The artifact list is read as a membership rather than whole. The
  // build writes every source under `workflows/src/`, so a list held
  // entire reddens here whenever a workflow this file has nothing to
  // say about lands beside the research pass, and which artifacts the
  // tree ships is the roster case in `tests/invariants/workflows.test.ts`
  // to judge rather than this one.
  //
  // The statement count is the half that is about this file's subject.
  // ONE statement is the whole argument of the node: the insert and the
  // stamp are one decision, and a node grown to two is the split this
  // file exists to report — which a drive taking the first of them
  // would carry out in silence.
  it('drives one statement out of a fresh build of the research pass', () => {
    const drive = fixture();

    expect({
      artifactsBuiltCarryTheResearchPass:
        drive.artifactsBuilt.includes(RESEARCH_ARTIFACT),
      buildOutcome: drive.buildOutcome,
      statementsInTheRecordNode: drive.statementsInTheRecordNode,
    }).toEqual({
      artifactsBuiltCarryTheResearchPass: true,
      buildOutcome: BUILD_RAN,
      statementsInTheRecordNode: 1,
    });
  });

  // The refusal, pinned on the rule rather than on the prose.
  //
  // Four readings in one comparison, and each is answering a different
  // way the case could pass while saying nothing. `refused` separates a
  // statement the server turned away from one that went through, which
  // is what a gate removed looks like from here. The SQLSTATE says a
  // CHECK refused it rather than a NOT NULL or an FK. The constraint
  // says WHICH check: `research_pool_status_check` sits on the same
  // table and answers the same code, so a statement that had merely
  // misspelled the status it writes would satisfy the pair above.
  //
  // And `wrappedNothing` is the pin reading's own control. Both fields
  // are read off the error itself, which is what a raw pool client
  // hands back; an ORM puts them on `cause` and leaves its own
  // undefined, so without this a move onto one reddens as two pins
  // gone missing rather than as the client having changed.
  //
  // What the planted state next door adds is the near-miss: give
  // `approved_at` a default and this refusal never happens, and without
  // that reading it reports as the CHECK having gone rather than as the
  // row having arrived approved.
  it('refuses recording against an intention nobody approved', () => {
    const drive = fixture();

    expect({
      pins: drive.refusalPins,
      plantedPool: drive.plantedPool,
    }).toEqual({
      pins: {
        code: CHECK_VIOLATION,
        constraint: APPROVAL_CONSTRAINT,
        refused: true,
        wrappedNothing: true,
      },
      plantedPool: { approved: false, stamped: false, status: 'pending' },
    });
  });

  // What the refusal cost, which is the claim the single statement was
  // written for: neither half of it survives.
  //
  // Both tables in one comparison. A result stored against an intention
  // still open is the state `research_pool.researched_at` cannot report
  // — the row reads as queued to everything that looks — and a stamp
  // written with nothing behind it is the same disagreement from the
  // other end. Split across two statements one of them survives the
  // other's refusal, so this is the reading that says they are one.
  //
  // It reports a gate that is GONE as well as one that half-wrote, and
  // that is owed to the conditional rollback in the drive rather than
  // to anything here. Measured against a server with the constraint
  // dropped: with the rollback taken unconditionally this case passed,
  // reading the tables after a landed write had been undone, and the
  // refusal case above was the only one that reddened.
  //
  // The intention is compared whole rather than by its stamp alone. The
  // statement writes `status` beside `researched_at`, so a canvas that
  // had moved the account into its own statement would leave a row
  // reading `done` with both timestamps still empty, which a check over
  // the stamp would pass.
  it('leaves both tables as it found them when the record is refused', () => {
    const drive = fixture();

    expect({
      pool: drive.refusedPool,
      research: researchContent(drive.refusedResearch),
    }).toEqual({
      pool: { approved: false, stamped: false, status: 'pending' },
      research: [],
    });
  });

  // The positive control, and the case without which every assertion
  // above is satisfied by a server refusing everything.
  //
  // The same statement, with the same parameter, against the same row.
  // One UPDATE granting the approval is the whole of the difference
  // between this and the refusal above — which is what pins that
  // refusal to the row's STATE rather than to the act of writing the
  // column, and what says the statement records at all.
  //
  // The approval is read back beside the result for the reason the
  // planted state is read back next to the refusal: an UPDATE matching
  // no row resolves exactly like one that wrote, so a setup that never
  // landed would report here as the statement having failed to record.
  //
  // The stored row is compared by its content, against the ids the
  // plant stored rather than against anything the statement answered.
  // `run_id` says the result is charged to the pass that produced it
  // rather than left as the NULL the column admits for research
  // written by hand, and `payload` is the member both writes are gated
  // on, so a statement that stored the prose and dropped the structure
  // passes a check over the summary alone. Its own surrogate key is
  // left out and read next door: a case holding one would either take
  // it off the very list it is judging or loosen into a shape.
  it('records the research once the same intention is approved', () => {
    const drive = fixture();

    expect({
      approvedPool: drive.approvedPool,
      research: researchContent(drive.storedResearch),
    }).toEqual({
      approvedPool: { approved: true, stamped: false, status: 'approved' },
      research: [{
        entity_id: drive.planted.entityId,
        payload: RESEARCH_PAYLOAD,
        run_id: drive.planted.runId,
        summary: RESEARCH_SUMMARY,
      }],
    });
  });

  // The other half of the same write, and the one the CHECK is about.
  //
  // The statement answers one row per item it was handed whether or not
  // it wrote anything, so what says it wrote is the pair of ids in that
  // row: `research_id` naming the result and `pool_id_closed` naming
  // the intention. Each is held against a value from somewhere else
  // rather than checked for presence — `research_id` against the key
  // `entity_research` now carries, so the row the statement SAYS it
  // wrote is the row standing in the table, and `pool_id_closed`
  // against the id the plant stored, so it closed the intention it was
  // handed rather than some other one. A null check reaches neither.
  //
  // The intention is read back beside them. `researched_at` stamped is
  // the state the gate governs, and `done` beside it is the account an
  // operator reads; the two are written in this statement rather than
  // in another for the same reason the insert is, which is that two
  // accounts of one row updated separately are two accounts able to
  // disagree.
  it('stamps the intention it recorded against, in one statement', () => {
    const drive = fixture();
    const answered = drive.recorded;

    expect({
      itAnsweredOncePerItem: answered.length,
      itClosedTheIntentionHandedTo: answered[0]?.pool_id_closed,
      itNamedTheResultStanding: answered[0]?.research_id,
      pool: drive.storedPool,
    }).toEqual({
      itAnsweredOncePerItem: 1,
      itClosedTheIntentionHandedTo: drive.planted.poolId,
      itNamedTheResultStanding: drive.storedResearch[0]?.row_id,
      pool: { approved: true, stamped: true, status: 'done' },
    });
  });
});
