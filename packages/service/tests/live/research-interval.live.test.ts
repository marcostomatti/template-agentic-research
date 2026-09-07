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
 * Three rows per raiser, and the two that raise are the controls the
 * one that refuses cannot do without. A refusal is an absence, so a
 * statement that raised nothing at all — a term guard that stopped
 * matching, a payload this file spells wrongly, a batch that reached
 * no finding — satisfies it exactly as the rule does. The two
 * controls vary the two OPERANDS of the comparison and nothing else:
 * one moves the pool timestamp back past the window and must raise,
 * the other leaves the timestamp where it is and sets the domain's
 * own window to zero and must raise. Each is otherwise the same seed,
 * spread from the refusal's own literal, so the axis is visible in
 * the table rather than asserted about it.
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
 * The grid this file was measured against is four legs, each
 * applied, run and reverted. Three rewrite the shipped SQL in BOTH
 * sources and the fourth rewrites the seed here, and what a leg is
 * worth is WHICH labels moved rather than that the run went red.
 *
 * Removing the guard outright reddens the two `researched inside
 * the window` labels and nothing else. Dropping the window out of
 * the comparison, so that any closed row refuses, reddens the four
 * accepting labels and nothing else. Those two sets are DISJOINT,
 * and together they are every drive in the table: the refusal and
 * its two controls defend different halves of one rule rather than
 * the controls riding along on the refusal.
 *
 * Misspelling the settings member, which leaves the fallback
 * standing for every domain, reddens the two `a window of zero`
 * labels alone — and leaves the first case below GREEN, all four
 * guard words surviving it. That is the leg this file is worth: the
 * roster next door requires those same phrases and is green through
 * it too, so a window read off the wrong place is a change nothing
 * short of a server reports.
 *
 * The fourth leg is the seed's rather than the pipeline's. Leaving
 * the planted pool row at `pending` reddens the closed-row reading
 * and the two `researched inside` labels together, which is what
 * says that reading is live rather than a restatement of the plant.
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

/** Everything one seeded scenario wrote, as the drive reads it. */
interface PlantedSubject {
  /** The domain the seed's rows hang off. */
  readonly domainId: string;

  /** The subject both findings name. */
  readonly entityId: string;

  /** The run `ar-ingest` binds as the pass this raise belongs to. */
  readonly runId: string;

  /** The finding the raise is driven over. */
  readonly subjectFindingId: string;
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

  /** The node running it, as the canvas spells it. */
  readonly nodeName: string;

  /**
   * The parameters the node's expression resolves to, for one seed.
   *
   * Written out per raiser rather than derived from the statement,
   * because the two bind different things: `ar-ingest` hands the
   * findings it wrote plus its run and domain, and `ar-score` hands a
   * pair per scored finding and nothing else. What each list stands
   * for is the `queryReplacement` on the node itself.
   *
   * @param planted - What the seed for this drive wrote.
   * @returns The bound values, in the order the statement takes them.
   */
  parameters(planted: PlantedSubject): readonly unknown[];
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
    nodeName: 'Raise Research Intentions',
    parameters: (planted) => [
      JSON.stringify([{ finding_id: planted.subjectFindingId }]),
      planted.runId,
      planted.domainId,
    ],
  },
  {
    artifact: 'ar-score.json',
    nodeName: 'Raise Research Intentions',
    parameters: (planted) => [
      JSON.stringify([{
        entity_id: planted.entityId,
        finding_id: planted.subjectFindingId,
      }]),
    ],
  },
];

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
 * @param artifact - The raiser driven.
 * @param scenarioId - The row it was driven over.
 * @returns The pair, as one label.
 */
function driveLabel(artifact: string, scenarioId: string): string {
  return `${artifact}: ${scenarioId}`;
}

/**
 * The slug a seed's domain is stored under.
 *
 * `domains.slug` is unique and every seed here shares one
 * transaction, so two seeds under one slug would be refused on the
 * second insert — which arrives as a failed drive rather than as
 * anything about the guard. The artifact and the row together are
 * what make it distinct, both raisers being driven over all three
 * rows.
 *
 * @param artifact - The raiser this seed is for.
 * @param scenarioId - The row it stands for.
 * @returns A slug this seed alone occupies.
 */
function seedSlug(artifact: string, scenarioId: string): string {
  return `research-interval-${driveLabel(artifact, scenarioId)}`
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
  artifact: string,
  scenario: WindowScenario,
): Promise<PlantedSubject> {
  const slug = seedSlug(artifact, scenario.id);
  const settings = scenario.domainWindowSeconds === null
    ? {}
    : { minResearchIntervalSeconds: scenario.domainWindowSeconds };
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
      `${scenario.researchedAgoSeconds} seconds`,
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

  return {
    domainId,
    entityId,
    runId,
    subjectFindingId: firstRow(
      subject.rows,
      `the ${slug} subject finding`,
    ).row_id,
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
 * @param fixture - The raiser to drive.
 * @param statement - Its node's SQL, as the artifact carries it.
 * @param scenario - The row to drive it over.
 * @returns Everything the cases below read for this drive.
 */
async function driveRaise(
  client: PoolClient,
  fixture: RaiseFixture,
  statement: string,
  scenario: WindowScenario,
): Promise<RaiseReading> {
  const planted = await plantSubject(client, fixture.artifact, scenario);
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
  const label = driveLabel(fixture.artifact, scenario.id);
  const raise = await client.query<Record<string, unknown>>(
    statement,
    [...fixture.parameters(planted)],
  );
  const raised = intentionIdsOf(firstRow(raise.rows, label), label);

  return {
    closedRowsForTheSubject,
    intentionIdsReturned: raised.length,
    poolRowsAfter: await countRows(
      client,
      poolRowsFor,
      [planted.subjectFindingId],
    ),
    poolRowsBefore,
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

/** What `beforeAll` drove, and every case below reads. */
interface IntervalDrive {
  /** How the build in front of the drive went. */
  readonly buildOutcome: string;

  /** The artifacts that build reported writing, by file name. */
  readonly artifactsBuilt: readonly string[];

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
 * @param pool - The live pool.
 * @param workflows - Every built workflow.
 * @returns What each drive read, by {@link driveLabel}.
 */
async function driveRaises(
  pool: Pool,
  workflows: readonly BuiltWorkflow[],
): Promise<Record<string, RaiseReading>> {
  await resetTables(pool);

  const readings: Record<string, RaiseReading> = {};
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const fixture of RAISE_FIXTURES) {
      const statement = raiseStatement(workflows, fixture);

      for (const scenario of WINDOW_SCENARIOS) {
        readings[driveLabel(fixture.artifact, scenario.id)] =
          await driveRaise(client, fixture, statement, scenario);
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

/**
 * What every drive is expected to have found in front of it: one
 * closed row for the subject, and no pool row for the finding being
 * raised.
 */
const EVERY_GUARD_HAD_A_SUBJECT: Readonly<Record<string, unknown>> =
  Object.fromEntries(RAISE_FIXTURES.flatMap(
    (fixture) => WINDOW_SCENARIOS.map((scenario): [string, unknown] => [
      driveLabel(fixture.artifact, scenario.id),
      { closedRowsForTheSubject: 1, poolRowsBefore: 0 },
    ]),
  ));

/** What every drive is expected to have done, by the table above. */
const EVERY_OUTCOME: Readonly<Record<string, string>> = Object.fromEntries(
  RAISE_FIXTURES.flatMap(
    (fixture) => WINDOW_SCENARIOS.map((scenario): [string, string] => [
      driveLabel(fixture.artifact, scenario.id),
      scenario.outcome,
    ]),
  ),
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

    live = {
      artifactsBuilt: build.written,
      buildOutcome: build.outcome,
      guardedNodes: sorted(workflows.flatMap(
        (workflow) => workflow.nodes
          .filter(carriesTheIntervalGuard)
          .map((node) => nodeLabel(workflow.file, node.name)),
      )),
      readings: await driveRaises(pool, workflows),
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

  // The claim. Both shipped statements, run verbatim over three seeds
  // that differ from one another in one member each.
  //
  // Compared as one whole record rather than a case per row, so the
  // refusal and the two controls fail in one diff and a reader sees
  // which of the three moved. A drive that produced no reading at all
  // fails on its label rather than going unread.
  //
  // What a red here means depends on which labels moved. The two
  // raising rows going red with the refusing row green is a statement
  // that raises nothing, which is the shape a refusal case cannot
  // report by itself. The refusing row alone going red is the guard
  // gone or comparing the wrong way round. One artifact's three
  // labels moving together is a rule that landed in one raiser and not
  // the other, which is exactly what putting both in this table is
  // for: the property is written into both statements so that a later
  // change to attribution cannot reopen it in one of them.
  it('refuses a subject researched inside its window and raises it outside', () => {
    const drive = fixture();

    expect(Object.fromEntries(
      Object.entries(drive.readings).map(
        ([label, reading]) => [label, raiseOutcome(reading)],
      ),
    )).toEqual(EVERY_OUTCOME);
  });
});
