/**
 * The clamp a claimed row is rescheduled by, run against a real
 * Postgres and held against the TypeScript that states the same
 * rule. Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * `ar-dispatch` moves a claimed row's `next_run_at` forward inside
 * the statement that claims it, the claim holding its lock until the
 * reschedule is written, so the clamp there is a SQL expression over
 * the bound columns rather than a call into `clampIntervalSeconds`.
 * Both of its claims carry one, over `topics` and over
 * `export_subscriptions`. This file drives every node in the built
 * workflow whose statement does, over the rows
 * `tests/lib/schedule-cases.ts` carries, and holds the interval each
 * statement applied against what the imported function answers for
 * the same row.
 *
 * Nothing else in this package reads a value out of both expressions,
 * so this file is the whole of what would report the two stating
 * different rules. `tests/lib/schedule.test.ts` drives the function
 * against the answers the shared table records and never reaches a
 * statement; the splice comparison in
 * `tests/build/schedule-splice.test.ts` has TypeScript on both of its
 * sides. The reader likeliest to be taken for a second one is
 * `tests/invariants/dispatch-sql.ts`, and it is a claim about the
 * columns rather than about their arrangement: it requires each
 * reschedule to name `min_interval_seconds` and
 * `max_interval_seconds`, and measured, both of the wrongly written
 * clamps this comparison is keyed to carry those words and leave that
 * entry green — a missing bound stood in with `COALESCE`, and a
 * ceiling applied before the floor. Its own roster says as much,
 * pointing at `clampIntervalSeconds` and at the live seam behind it.
 *
 * The limit that comes with being the only one is the self-skip.
 * `bun run test:live` is the only script anywhere in the repository
 * that sets `AR_LIVE_DATABASE_URL`, so a green verification order
 * leaves the pair unread: between runs of this file the two
 * expressions sit in two languages and two files with nothing holding
 * them together. That is what a red run here is worth, and it is
 * equally why a clamp written wrongly on one side is a change that can
 * land with every gate green.
 *
 * The statements come out of `workflows/dist/` and never
 * `workflows/src/`. A source carries `LIMIT` against an unresolved
 * setting marker where the artifact carries a number, so the text
 * under `src/` is not SQL at all — and what an instance runs is the
 * artifact rather than what a source said before a build.
 *
 * That artifact is rebuilt in front of the drive rather than read
 * where it lies. `pretest` builds it before the default suite and
 * bun's hook is exact-name scoped, so `bun run test:live` fires
 * none: the tree on disk is then whatever last built it, and a
 * stale artifact is byte-identical to a fresh one apart from the
 * stamp in a sticky note, which no reading here would notice. The
 * build is a subprocess rather than a call because it constructs a
 * `Bun.Transpiler` — `ar-dispatch` inlines `src/lib/schedule.ts`
 * into a Code node — and a vitest worker has none, the polyfill
 * `vitest.config.ts` installs leaving a partial `Bun` global behind.
 *
 * Everything this file does sits inside the gate, which is
 * load-bearing rather than tidy. `describeLivePg` binds a `describe`
 * and nothing above one, so module scope runs on the skipped branch
 * as well, on every `bun run test`: a build spawned or a connection
 * opened beside the block would run inside the isolated suite. So
 * module scope here holds constants and pure functions, and the
 * drive is in `beforeAll`.
 *
 * One drive, made once and read by every case below. It resets the
 * tables the harness names, plants a row per case in each schedulable
 * table, runs each claim statement verbatim and reads back the
 * interval each claimed row was moved by. The reset in front of it is
 * what stops a previous live file's leftovers being claimed alongside:
 * a claim takes whatever is due, and a foreign row would arrive as one
 * this file never planted. The whole of it is one transaction, rolled
 * back at the end, so nothing planted here outlives the run. `now()`
 * is fixed for every statement inside one, which is what makes the
 * reading the interval a statement applied rather than that interval
 * minus a round trip. Measured, no row here parts the two: the reading
 * is cast to whole seconds and a round trip rounds away under it. So
 * the transaction keeps that true of a machine slow enough for it not
 * to be, rather than of this one.
 *
 * Three guards sit in front of the comparison. The first is that what
 * is under test came out of a build made here, and that the nodes
 * driven are every node in the built dispatcher whose statement
 * carries the clamp — derived from the artifact and held against a
 * written-out pair, so a third schedulable table's claim is driven or
 * reported rather than quietly left out. The second is that those
 * statements moved rows: two expressions that each answered the
 * proposal they were handed agree over a table that clamps nothing, so
 * agreement is a claim only where the expression agreed with does
 * something, and only the outcomes Postgres produced say whether it
 * did. The third is that the rows driven are the rows
 * `tests/lib/schedule.test.ts` is written over. What is claimed here
 * is that the two expressions agree, and that the answer they agree on
 * is the right one is that file's claim — made over the five declared
 * groups its sections walk rather than over the composed table this
 * one drives — so the two compose only while the groups and the table
 * hold one set of rows. The groups are named again here for that
 * comparison, a union taken off the table being the table agreeing
 * with itself.
 *
 * What is deliberately not asserted here is which ROWS make the
 * comparison able to report a clamp written wrongly. A floor with no
 * ceiling is the only shape an expression standing a MISSING bound in
 * answers differently, and rows whose two bounds cross are the only
 * ones an expression applying the bounds in the other order answers
 * differently. Both are pinned in `tests/lib/schedule.test.ts`, which
 * the default suite runs on every verification and which
 * `bun run test:live` collects not at all — so a copy here would say
 * the same thing in the one run that needs it least. The third guard
 * is not that claim restated: it asks only that the rows driven here
 * are the rows those pins are written over, which is the whole of what
 * makes leaving them there safe.
 */
import type { BuiltWorkflow, BuiltWorkflowNode } from '../invariants/workflow-dist.js';
import type { ClampCase } from '../lib/schedule-cases.js';
import type { Pool, PoolClient } from 'pg';

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { clampIntervalSeconds } from '../../src/lib/schedule.js';
import { sqlWords } from '../invariants/dispatch-sql.js';
import { loadBuiltWorkflows } from '../invariants/workflow-dist.js';
import { queryParametersOf } from '../invariants/workflow-rosters.js';
import {
  CAPPED_CLAMP_CASES,
  CLAMP_CASES,
  CROSSED_BOUND_CLAMP_CASES,
  FLOORED_CLAMP_CASES,
  INERT_BOUND_CLAMP_CASES,
  UNBOUNDED_CLAMP_CASES,
} from '../lib/schedule-cases.js';

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
 * script — the same reason the build and invariant suites resolve
 * their roots this way.
 */
const BUILD_ENTRY = fileURLToPath(
  new URL('../../scripts/build-workflows.ts', import.meta.url),
);

/** The prefix of every line that build prints an artifact on. */
const BUILT_LINE = 'built ';

/** What {@link runBuild} reports for a run that completed. */
const BUILD_RAN = 'exit 0';

/** The artifact this file reads its statements out of. */
const DISPATCH_ARTIFACT = 'ar-dispatch.json';

/**
 * The words a statement applying the clamp carries, and the whole of
 * what makes a node one this file has to drive.
 *
 * Read through {@link sqlWords}, which drops `--` comments before it
 * reads a word — this port argues at length inside its statements
 * and both claims spell the bound columns in prose, so a reading of
 * the raw text would answer for the argument as readily as for the
 * expression.
 *
 * Four words rather than the two bound columns alone. A statement
 * naming both bounds and nothing else does not apply them, and the
 * pair of functions is what says the expression is a clamp rather
 * than a projection that happens to carry the columns.
 */
const CLAMP_WORDS: readonly string[] = [
  'greatest',
  'least',
  'max_interval_seconds',
  'min_interval_seconds',
];

/** What a clamp can do to a proposal, and the whole of it. */
const CLAMP_OUTCOMES = ['left alone', 'lowered', 'raised'] as const;

/**
 * One schedulable table this file drives a claim over: the node
 * running the statement, the table it moves, and what a row of the
 * case table looks like in it.
 *
 * Keyed by node name and not by an id of its own, because the node
 * name is what the guard below joins on: the artifact answers with
 * node names, and an id beside them would be a second name for one
 * thing.
 */
interface ClaimFixture {
  /** The node in `ar-dispatch` whose statement is driven. */
  readonly nodeName: string;

  /**
   * The table that statement claims from, and the one the applied
   * interval is read back out of.
   *
   * Interpolated into the read-back's own SQL rather than passed as
   * a parameter, a table name being no place a parameter can stand.
   * What makes that safe is that it is written out here.
   */
  readonly table: string;

  /**
   * Write one due row per case, and answer with the row id each
   * case's row was stored under.
   *
   * The row id is the join key rather than anything a case carries,
   * because the two tables have no column in common that would
   * serve: `topics` has a name and `export_subscriptions` has none.
   *
   * @param client - The open transaction to write through.
   * @param cases - The rows to plant, one row each.
   * @returns The stored row id, keyed by case id.
   */
  plant(
    client: PoolClient,
    cases: readonly ClampCase[],
  ): Promise<Record<string, string>>;
}

/**
 * How far in the past a planted row's due time is set.
 *
 * Any past time claims the same, so the value carries nothing. What a
 * small one buys is a legible failure: it is also what a row nothing
 * claimed reads back as, and a claim reporting the same modest
 * negative for every row of a table says at a glance that the
 * statement took none of them.
 */
const PLANTED_DUE_AGO = '1 minute';

/**
 * The domain every planted row belongs to, one per table so the two
 * plants can share a transaction.
 *
 * `domains.slug` is unique and both plants run inside one
 * transaction, so a single slug would refuse the second insert —
 * which would arrive as a failed drive rather than as anything about
 * the clamp.
 *
 * @param table - The table whose rows this domain owns.
 * @returns Its slug, which the plant stores as its name as well.
 */
function fixtureDomainSlug(table: string): string {
  return `clamp-seam-${table}`;
}

/**
 * The first row of a result, refused rather than read off nothing.
 *
 * Destructuring an empty result yields undefined and a drive then
 * dies on a property access, naming neither the statement that
 * returned nothing nor what was being planted at the time.
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
      `[schedule-clamp] the statement writing ${wrote} returned no ` +
      'row, so there is no id to join a planted row back to the case ' +
      'it stands for. Whatever it did, it did not write what this ' +
      'fixture asked it for.',
    );
  }

  return row;
}

/**
 * Store the domain a table's planted rows hang off.
 *
 * @param client - The open transaction to write through.
 * @param table - The table whose rows it owns.
 * @returns Its stored id, as text.
 */
async function plantDomain(
  client: PoolClient,
  table: string,
): Promise<string> {
  const slug = fixtureDomainSlug(table);
  const { rows } = await client.query<{ row_id: string }>(
    `
      INSERT INTO domains (slug, name)
      VALUES ($1, $1)
      RETURNING id::text AS row_id
    `,
    [slug],
  );

  return firstRow(rows, `the ${slug} domain`).row_id;
}

/**
 * Plant one due `topics` row per case.
 *
 * The case id is stored as the topic's name, which is half that
 * table's natural key, so two cases cannot occupy one row.
 *
 * @param client - The open transaction to write through.
 * @param cases - The rows to plant.
 * @returns The stored row id, keyed by case id.
 */
async function plantTopics(
  client: PoolClient,
  cases: readonly ClampCase[],
): Promise<Record<string, string>> {
  const domainId = await plantDomain(client, 'topics');
  const planted: Record<string, string> = {};

  for (const testCase of cases) {
    const { rows } = await client.query<{ row_id: string }>(
      `
        INSERT INTO topics (
          domain_id, name, interval_seconds,
          min_interval_seconds, max_interval_seconds, next_run_at
        )
        VALUES (
          $1::bigint, $2, $3::int, $4::int, $5::int,
          now() - $6::interval
        )
        RETURNING id::text AS row_id
      `,
      [
        domainId,
        testCase.id,
        testCase.intervalSeconds,
        testCase.bounds.minIntervalSeconds,
        testCase.bounds.maxIntervalSeconds,
        PLANTED_DUE_AGO,
      ],
    );

    planted[testCase.id] = firstRow(rows, `the ${testCase.id} topic`).row_id;
  }

  return planted;
}

/**
 * Plant one due `export_subscriptions` row per case.
 *
 * A connector per case rather than one shared between them.
 * `(domain_id, format, connector_id)` is that table's natural key
 * and there are five formats in all, so what has to differ per row
 * is the connector — and `connectors` is keyed on `(kind, name)`,
 * which the case id fills.
 *
 * @param client - The open transaction to write through.
 * @param cases - The rows to plant.
 * @returns The stored row id, keyed by case id.
 */
async function plantExportSubscriptions(
  client: PoolClient,
  cases: readonly ClampCase[],
): Promise<Record<string, string>> {
  const domainId = await plantDomain(client, 'export_subscriptions');
  const planted: Record<string, string> = {};

  for (const testCase of cases) {
    const connector = await client.query<{ row_id: string }>(
      `
        INSERT INTO connectors (kind, name)
        VALUES ('export_target', $1)
        RETURNING id::text AS row_id
      `,
      [testCase.id],
    );
    const connectorId = firstRow(
      connector.rows,
      `the ${testCase.id} connector`,
    ).row_id;
    const { rows } = await client.query<{ row_id: string }>(
      `
        INSERT INTO export_subscriptions (
          domain_id, format, connector_id, interval_seconds,
          min_interval_seconds, max_interval_seconds, next_run_at
        )
        VALUES (
          $1::bigint, 'rss', $2::bigint, $3::int, $4::int, $5::int,
          now() - $6::interval
        )
        RETURNING id::text AS row_id
      `,
      [
        domainId,
        connectorId,
        testCase.intervalSeconds,
        testCase.bounds.minIntervalSeconds,
        testCase.bounds.maxIntervalSeconds,
        PLANTED_DUE_AGO,
      ],
    );

    planted[testCase.id] = firstRow(
      rows,
      `the ${testCase.id} export subscription`,
    ).row_id;
  }

  return planted;
}

/**
 * The claims this file drives, one per schedulable table.
 *
 * Written out rather than derived from the artifact, because a
 * fixture cannot be: a claim over a table nothing here knows how to
 * plant a row in has no rows to answer about. What the artifact is
 * read for instead is whether this roster still covers it, which is
 * the guard below.
 */
const CLAIM_FIXTURES: readonly ClaimFixture[] = [
  {
    nodeName: 'Claim Due Topics',
    table: 'topics',
    plant: plantTopics,
  },
  {
    nodeName: 'Claim Due Export Subscriptions',
    table: 'export_subscriptions',
    plant: plantExportSubscriptions,
  },
];

/**
 * The two claim nodes, written out rather than read off either side.
 * The guard below holds the artifact's answer AND the roster's against
 * this, so a list derived from one of them would be that side agreeing
 * with itself.
 */
const DRIVEN_NODE_NAMES: readonly string[] = [
  'Claim Due Export Subscriptions',
  'Claim Due Topics',
];

/**
 * The groups `tests/lib/schedule.test.ts` writes its claims over,
 * and the whole of them.
 *
 * Named again here rather than taken off the table this file drives.
 * `CLAMP_CASES` is composed from these five, so a union read off it
 * would be that table agreeing with itself — and what a roster here
 * reaches instead is a sixth group landing beside these, or one of
 * these dropped out of the composition, neither of which this file
 * would otherwise notice.
 *
 * Groups rather than the ids they hold, so both sides of that
 * comparison read their ids the same way and a divergence is about
 * which rows each side carries rather than about how either was
 * spelled.
 */
const ASSERTED_CLAMP_GROUPS: readonly (readonly ClampCase[])[] = [
  CAPPED_CLAMP_CASES,
  CROSSED_BOUND_CLAMP_CASES,
  FLOORED_CLAMP_CASES,
  INERT_BOUND_CLAMP_CASES,
  UNBOUNDED_CLAMP_CASES,
];

/** Sorted copy, so an equality is over members rather than order. */
function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

/**
 * The ids a list of rows carries, in the order it carries them.
 *
 * @param cases - The rows to read.
 * @returns Their ids.
 */
function caseIds(cases: readonly ClampCase[]): readonly string[] {
  return cases.map((testCase) => testCase.id);
}

/**
 * The label one applied interval is reported under.
 *
 * A label to read rather than one to split: a node name carries
 * whatever the canvas says, and nothing stops one holding a colon.
 *
 * @param nodeName - The node whose statement applied it.
 * @param caseId - The row it was applied to.
 * @returns The pair, as one label.
 */
function driveLabel(nodeName: string, caseId: string): string {
  return `${nodeName}: ${caseId}`;
}

/**
 * Whether a node's statement applies the clamp.
 *
 * Read as WORDS rather than as text. {@link sqlWords} drops the `--`
 * comments first, so a bound column named in the prose beside a
 * statement is not one; and membership is of a whole word, so a longer
 * identifier that merely spells one of these inside itself is not one
 * either.
 *
 * @param node - A node of the built dispatcher.
 * @returns Whether one of its statements carries every clamp word.
 */
function carriesTheClamp(node: BuiltWorkflowNode): boolean {
  return queryParametersOf(node).some((query) => {
    const words = new Set(sqlWords(query).split(' '));

    return CLAMP_WORDS.every((word) => words.has(word));
  });
}

/**
 * Which of {@link CLAMP_OUTCOMES} a statement did to a proposal.
 *
 * Total over every pair, so an interval a statement left where it
 * found it names its own shape rather than being absorbed into one
 * of the other two.
 *
 * @param appliedSeconds - What the statement wrote.
 * @param proposedSeconds - What the row asked for.
 * @returns What was done to it.
 */
function appliedOutcome(
  appliedSeconds: number,
  proposedSeconds: number,
): string {
  if (appliedSeconds > proposedSeconds) {
    return 'raised';
  }

  return appliedSeconds < proposedSeconds
    ? 'lowered'
    : 'left alone';
}

/** What `beforeAll` drove, and every case below reads. */
interface ClampDrive {
  /** How the build in front of the drive went. */
  readonly buildOutcome: string;

  /** The artifacts that build reported writing, by file name. */
  readonly artifactsBuilt: readonly string[];

  /** The built dispatcher's nodes whose statements clamp, sorted. */
  readonly clampNodes: readonly string[];

  /** How many rows each claim statement returned, by node name. */
  readonly rowsClaimed: Readonly<Record<string, number>>;

  /** The seconds each statement applied, by {@link driveLabel}. */
  readonly applied: Readonly<Record<string, number>>;
}

/**
 * Build the workflows the way `bun run build:workflows` does, and
 * answer with what it wrote and how it went.
 *
 * The shipped entry point as a subprocess rather than `buildAll`
 * with a stand-in loader: what the statements below are read out of
 * has to be the artifact the shipped command writes, and a build
 * assembled here would be about some other one.
 *
 * The default build rather than `--external`, so its settings come
 * from the build's own defaults table alone and nothing an operator
 * exported moves the `LIMIT` these statements carry.
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
 * The built dispatcher, refused rather than searched for silently.
 *
 * @param built - Everything `loadBuiltWorkflows` handed back.
 * @returns The one artifact this file reads statements out of.
 * @throws Error When the built tree does not hold it.
 */
function dispatchWorkflow(
  built: readonly BuiltWorkflow[],
): BuiltWorkflow {
  const found = built.find((workflow) => workflow.file === DISPATCH_ARTIFACT);

  if (found === undefined) {
    throw new Error(
      `[schedule-clamp] the built tree holds no ${DISPATCH_ARTIFACT}, so ` +
      'there is no claim statement to run and every reading below ' +
      'would be about a workflow nobody built. It is written from ' +
      `workflows/src/${DISPATCH_ARTIFACT}.`,
    );
  }

  return found;
}

/**
 * The statement one fixture's node runs, refused rather than
 * standing in for.
 *
 * @param workflow - The built dispatcher.
 * @param fixture - The claim to read.
 * @returns The node's own SQL.
 * @throws Error When the node is gone or runs none.
 */
function claimStatement(
  workflow: BuiltWorkflow,
  fixture: ClaimFixture,
): string {
  const statements = workflow.nodes
    .filter((node) => node.name === fixture.nodeName)
    .flatMap((node) => queryParametersOf(node));
  const statement = statements[0];

  if (statement === undefined) {
    throw new Error(
      `[schedule-clamp] ${DISPATCH_ARTIFACT} holds no node named ` +
      `${fixture.nodeName} running SQL, so this fixture has nothing to ` +
      'drive. Either the node was renamed on the canvas, or this ' +
      'roster names one that was.',
    );
  }

  return statement;
}

/**
 * Plant, claim and read back one fixture's rows inside an open
 * transaction.
 *
 * The statement is run VERBATIM. What is under test is the text an
 * instance would run, so a fragment lifted out of it and evaluated
 * on its own would be a second spelling of the rule rather than a
 * reading of the shipped one.
 *
 * The interval is read back out of the table under the ids the claim
 * RETURNED rather than out of everything planted. A row the statement
 * passed over still carries the due time this fixture wrote, which
 * comes back as that offset — measured, the same small negative for
 * every such row, reading as a clamp answering wrongly rather than as
 * a row nobody claimed.
 *
 * @param client - The open transaction to drive through.
 * @param fixture - The claim to drive.
 * @param statement - Its node's SQL, as the artifact carries it.
 * @param cases - The rows to drive it over.
 * @returns How many rows it claimed, and the seconds each was moved
 * by, keyed by case id.
 */
async function driveClaim(
  client: PoolClient,
  fixture: ClaimFixture,
  statement: string,
  cases: readonly ClampCase[],
): Promise<{ claimed: number; applied: Record<string, number> }> {
  const rowIdByCase = await fixture.plant(client, cases);
  const claim = await client.query<{ id: string }>(statement);
  const claimedIds = claim.rows.map((row) => String(row.id));
  const { rows } = await client.query<{
    applied_seconds: number;
    row_id: string;
  }>(
    `
      SELECT
        id::text AS row_id,
        EXTRACT(EPOCH FROM (next_run_at - now()))::int AS applied_seconds
      FROM ${fixture.table}
      WHERE id = ANY($1::bigint[])
    `,
    [claimedIds],
  );
  const appliedByRow = new Map(rows.map((row) => [row.row_id, row.applied_seconds]));
  const applied: Record<string, number> = {};

  for (const testCase of cases) {
    const rowId = rowIdByCase[testCase.id];
    const seconds = rowId === undefined
      ? undefined
      : appliedByRow.get(rowId);

    if (seconds !== undefined) {
      applied[testCase.id] = seconds;
    }
  }

  return { applied, claimed: claim.rows.length };
}

/**
 * Drive every fixture once, inside one transaction, and answer with
 * everything the cases below read.
 *
 * The tables are reset in front of the transaction rather than
 * inside it. A claim takes whatever is due, so a row another live
 * file left behind would be claimed alongside these and counted as
 * one this file planted — and the reset is the harness's own, which
 * refuses to run against any database but the live one.
 *
 * The transaction makes the reading exact rather than close. `now()`
 * is fixed for every statement inside one, so the difference between a
 * written `next_run_at` and it is the interval the statement applied
 * and not that interval minus a round trip — which at these magnitudes
 * is a precision this file states in its header and does not rest on.
 * It is rolled back at the end, which leaves the tables as the reset
 * left them.
 *
 * @param pool - The live pool.
 * @param workflow - The built dispatcher.
 * @returns What every case below is asserted over.
 */
async function driveClaims(
  pool: Pool,
  workflow: BuiltWorkflow,
): Promise<Pick<ClampDrive, 'applied' | 'rowsClaimed'>> {
  await resetTables(pool);

  const applied: Record<string, number> = {};
  const rowsClaimed: Record<string, number> = {};
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const claim of CLAIM_FIXTURES) {
      const statement = claimStatement(workflow, claim);
      const driven = await driveClaim(client, claim, statement, CLAMP_CASES);

      rowsClaimed[claim.nodeName] = driven.claimed;

      for (const [caseId, seconds] of Object.entries(driven.applied)) {
        applied[driveLabel(claim.nodeName, caseId)] = seconds;
      }
    }
  } finally {
    // Swallowed for the reason `applyMigrations` swallows its own
    // unlock: this runs whether or not the body threw, and a
    // rollback that raises in its turn would replace whatever did.
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }

  return { applied, rowsClaimed };
}

/**
 * What the imported rule answers, keyed the way the drive is.
 *
 * The rows' own recorded column is no part of this. Reading it here
 * would be this file claiming the answers are RIGHT, which is
 * `tests/lib/schedule.test.ts`'s claim over the same rows. What is
 * claimed here is that the two expressions agree.
 *
 * @returns One answer per node per row, keyed by {@link driveLabel}.
 */
function importedAnswers(): Record<string, number> {
  return Object.fromEntries(CLAIM_FIXTURES.flatMap(
    (claim) => CLAMP_CASES.map((testCase): [string, number] => [
      driveLabel(claim.nodeName, testCase.id),
      clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
    ]),
  ));
}

/**
 * What the statements did to the proposals they were handed.
 *
 * Walks the roster and the case table rather than the drive's own
 * keys, and skips a row nothing came back for — which is the
 * rows-claimed guard's to report, not this one's.
 *
 * @param drive - What `beforeAll` drove.
 * @returns Every outcome reached, deduped.
 */
function outcomesApplied(drive: ClampDrive): readonly string[] {
  const reached = new Set<string>();

  for (const claim of CLAIM_FIXTURES) {
    for (const testCase of CLAMP_CASES) {
      const seconds = drive.applied[driveLabel(claim.nodeName, testCase.id)];

      if (seconds !== undefined) {
        reached.add(appliedOutcome(seconds, testCase.intervalSeconds));
      }
    }
  }

  return [...reached];
}

/** One row per fixture, holding what a full claim would return. */
const EVERY_ROW_CLAIMED: Readonly<Record<string, number>> = Object.fromEntries(
  CLAIM_FIXTURES.map((claim): [string, number] => [
    claim.nodeName,
    CLAMP_CASES.length,
  ]),
);

let live: ClampDrive | null = null;

/**
 * What `beforeAll` drove, refused rather than coerced.
 *
 * Called from inside a case rather than resolved beside it, so a
 * hook that did not finish reports as a named failure in the case
 * that wanted the value instead of as an assertion about
 * `undefined` — which for a comparison over an empty record is a
 * green.
 *
 * @returns The shared drive.
 * @throws Error When `beforeAll` did not reach the end.
 */
function fixture(): ClampDrive {
  if (live === null) {
    throw new Error(
      '[schedule-clamp] the drive for this block was never made, so ' +
      'no statement was run and nothing was read back. Whatever ' +
      'beforeAll raised is above this in the run log.',
    );
  }

  return live;
}

describeLivePg('dispatcher reschedule clamp (live Postgres)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);

    const build = runBuild();
    const workflow = dispatchWorkflow(loadBuiltWorkflows());
    const driven = await driveClaims(pool, workflow);

    live = {
      applied: driven.applied,
      artifactsBuilt: build.written,
      buildOutcome: build.outcome,
      clampNodes: sorted(
        workflow.nodes.filter(carriesTheClamp).map((node) => node.name),
      ),
      rowsClaimed: driven.rowsClaimed,
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  // The first guard, and the one that says what is under test came out
  // of a build made here rather than off whatever last wrote the tree.
  // Four halves, each reading a different thing: the build's own
  // outcome, whether what it reported writing carries the dispatcher,
  // the nodes the built dispatcher runs a clamp in, and the nodes this
  // file has a fixture for.
  //
  // The first is a membership rather than the whole list. The build
  // writes every source under `workflows/src/`, so a list held whole
  // reddens here whenever a workflow this file has nothing to say
  // about lands beside the dispatcher, and which artifacts the tree
  // ships is the roster case in `tests/invariants/workflows.test.ts`
  // to judge rather than this one.
  //
  // The third and fourth are the pair that matters. One is derived
  // from the artifact and the other from the roster above, and both
  // are held against a list written out here — so a third schedulable
  // table's claim added to the workflow reddens the third half, and a
  // fixture dropped from the roster reddens the fourth, rather than
  // either going quietly undriven.
  it('drives every clamp a fresh build of the dispatcher carries', () => {
    const drive = fixture();

    expect({
      artifactsBuiltCarryTheDispatcher:
        drive.artifactsBuilt.includes(DISPATCH_ARTIFACT),
      buildOutcome: drive.buildOutcome,
      clampNodesInTheDispatcher: drive.clampNodes,
      nodesThisFileDrives: sorted(
        CLAIM_FIXTURES.map((claim) => claim.nodeName),
      ),
    }).toEqual({
      artifactsBuiltCarryTheDispatcher: true,
      buildOutcome: BUILD_RAN,
      clampNodesInTheDispatcher: DRIVEN_NODE_NAMES,
      nodesThisFileDrives: DRIVEN_NODE_NAMES,
    });
  });

  // The second guard, and the one the comparison below cannot do
  // without. Two expressions that each answered the proposal they were
  // handed agree on every row of a table that clamps nothing, so
  // agreement is a claim only where the statements moved something —
  // and only what Postgres wrote says whether they did.
  //
  // Set equality against a declared roster rather than a count. The
  // table carries more rows than there are outcomes, so the reached
  // list is deduped first: rows all sitting in one outcome would
  // satisfy a count while leaving two thirds of the rule unexercised.
  //
  // The claim counts sit beside it because they are what stops the
  // outcomes being read off a fraction of the table. A statement that
  // took fewer rows than were planted for it — a `LIMIT` under the
  // table's own length, a predicate that stopped matching, a plant
  // that wrote a row nothing would claim — leaves the comparison below
  // reporting a missing label and says nothing about why, where this
  // names the statement.
  it('is held against statements that claimed every planted row and moved some', () => {
    const drive = fixture();

    expect({
      outcomesReached: sorted(outcomesApplied(drive)),
      rowsClaimed: drive.rowsClaimed,
    }).toEqual({
      outcomesReached: sorted([...CLAMP_OUTCOMES]),
      rowsClaimed: EVERY_ROW_CLAIMED,
    });
  });

  // The third guard, and the only case in this file that reads no
  // drive: the rows this file plants and compares are the rows
  // `tests/lib/schedule.test.ts` is written over.
  //
  // The claim below is only that the two expressions agree. Whether
  // the answer they agree on is the right one is that file's claim,
  // and it makes it over the five declared groups its sections walk
  // rather than over the composed table this one drives — so the two
  // compose only while the groups and the table hold one set of rows.
  // Rows the composition stopped reaching are judged over there and
  // never put to a statement here; a row the composition grew past
  // these five is driven here and judged by nothing.
  //
  // That tie is read from the other side too, where each group is held
  // against the table filtered by the property it stands for. What is
  // new here is the invocation and the roster: `bun run test:live`
  // collects none of that file, and a sixth group landing beside these
  // five is a thing no guard over there can see this file failing to
  // drive.
  //
  // Sorted lists rather than sets, so one id written into a group and
  // into the table twice over reddens instead of being swallowed. The
  // non-empty half rides in the same record because two empty lists
  // compare equal — the guard over the outcomes Postgres produced
  // reddens for an emptied table as well, and this is what names the
  // cause in this comparison's own diff.
  it('drives the rows the clamp function is held against next door', () => {
    const assertedNextDoor = caseIds(ASSERTED_CLAMP_GROUPS.flat());

    expect({
      idsDrivenHere: sorted(caseIds(CLAMP_CASES)),
      theGroupsDeclareRows: assertedNextDoor.length > 0,
    }).toEqual({
      idsDrivenHere: sorted(assertedNextDoor),
      theGroupsDeclareRows: true,
    });
  });

  // The claim. Every row of the shared table is planted in both
  // schedulable tables, both claim statements are run as the built
  // artifact carries them, and the interval each row was moved by is
  // held against what `clampIntervalSeconds` answers for the same row.
  //
  // Compared as two whole records in one expression, so a row a
  // statement never answered for fails on the label rather than going
  // unread.
  //
  // What a disagreement means here is wider than it is for the spliced
  // copy in `tests/build/schedule-splice.test.ts`. The two sides of
  // that comparison come out of one file and can only part over a
  // build that rewrote them; these two are written separately, in two
  // languages, so a row they part on is one of them stating a
  // different rule.
  it('writes the interval the clamp function answers, for every row of the shared table', () => {
    expect(fixture().applied).toEqual(importedAnswers());
  });
});
