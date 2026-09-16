/**
 * @packageDocumentation
 * The integration seed: the path that takes the fixture files in
 * `tests/fixtures/integration/` and writes them onto a live test
 * database that `db:seed` has already given the example domain.
 *
 * A TEST asset rather than a seed. `data/README.md` makes
 * `scripts/seed.ts` the only reader of `data/`, so this module opens
 * nothing there: the domain every fixture row names is resolved
 * against the database a `db:seed` pass wrote, and the pass refuses
 * a slug it does not find there. What it writes is the operational
 * half of the web's fixture story — sources, connectors, documents,
 * findings with their labels, entities, export subscriptions, runs
 * and model calls — so a web run against `ar_live` reads what the
 * web's fixture modules state.
 *
 * The reading half is here: the roster, `loadIntegrationBundle`,
 * which refuses the whole bundle when any file fails and then holds
 * the surviving rows against each other, and the entry point below
 * both. `./seed-integration-schemas.ts` holds the per-file schemas
 * and `./seed-integration-apply.ts` the write half; both are
 * re-exported whole, so either path imports them.
 *
 * Validation completes before a connection is opened, and the split
 * is what makes that structural: the loader is handed no database and
 * opens none, so `runIntegrationSeedCli` has nothing to write through
 * until it has a whole bundle in hand. The database guard sits on
 * the other side of that line, inside the apply pass, because it is
 * a question only a connection can answer: `assertLiveDatabase`
 * refuses every database not named `ar_live` before the pass issues
 * a single write.
 */
import type { IntegrationCounts } from './seed-integration-apply.js';
import type {
  ConnectorFixture,
  DocumentFixture,
  EntityFixture,
  ExportSubscriptionFixture,
  FindingFixture,
  LlmCallFixture,
  RunFixture,
  SourceFixture,
} from './seed-integration-schemas.js';
import type { SeedFailure } from './seed.js';
import type { z } from 'zod';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';

import { config } from '../src/config.js';
import { normalizeEntityName } from '../src/lib/entity-name-norm.js';

import { applyIntegrationBundle } from './seed-integration-apply.js';
import {
  ConnectorsFileSchema,
  DocumentsFileSchema,
  EntitiesFileSchema,
  ExportSubscriptionsFileSchema,
  FindingsFileSchema,
  LlmCallsFileSchema,
  RunsFileSchema,
  SourcesFileSchema,
} from './seed-integration-schemas.js';
import { stripUnderscoreKeys } from './seed.js';

export * from './seed-integration-apply.js';
export * from './seed-integration-schemas.js';

/**
 * The fixture directory this package ships, resolved from this
 * file's own location for the reason `SEED_DATA_DIR` gives: a path
 * built from the working directory names nothing from the repo root.
 */
export const INTEGRATION_FIXTURE_DIR = fileURLToPath(
  new URL('../tests/fixtures/integration', import.meta.url),
);

/**
 * Every fixture file, keyed by the concern it carries, parent before
 * child, which is also the order failures are reported in.
 *
 * A roster rather than a directory listing, so which rows reach the
 * database is a decision worth a diff. The listing is still read, and
 * for the opposite reason: a `.json` file in the directory that no
 * entry names is refused rather than skipped, so every file there is
 * either validated or reported.
 */
export const INTEGRATION_ROSTER = {
  connectors: { file: 'connectors.json', schema: ConnectorsFileSchema },
  sources: { file: 'sources.json', schema: SourcesFileSchema },
  entities: { file: 'entities.json', schema: EntitiesFileSchema },
  documents: { file: 'documents.json', schema: DocumentsFileSchema },
  findings: { file: 'findings.json', schema: FindingsFileSchema },
  exportSubscriptions: {
    file: 'export-subscriptions.json',
    schema: ExportSubscriptionsFileSchema,
  },
  runs: { file: 'runs.json', schema: RunsFileSchema },
  llmCalls: { file: 'llm-calls.json', schema: LlmCallsFileSchema },
} as const;

/** One of the concerns {@link INTEGRATION_ROSTER} names. */
export type IntegrationConcern = keyof typeof INTEGRATION_ROSTER;

/**
 * Every fixture file's rows, validated, in one value, a member per
 * {@link INTEGRATION_ROSTER} entry. A bundle only exists whole:
 * {@link loadIntegrationBundle} returns one or throws.
 */
export interface IntegrationBundle {
  readonly connectors: readonly ConnectorFixture[];
  readonly sources: readonly SourceFixture[];
  readonly entities: readonly EntityFixture[];
  readonly documents: readonly DocumentFixture[];
  readonly findings: readonly FindingFixture[];
  readonly exportSubscriptions: readonly ExportSubscriptionFixture[];
  readonly runs: readonly RunFixture[];
  readonly llmCalls: readonly LlmCallFixture[];
}

/**
 * Thrown when any fixture file fails to read, to validate, or to
 * agree with the others. Carries every failure its pass found rather
 * than the first, in the {@link SeedFailure} shape `db:seed` reports
 * in, so both refusals read one way.
 */
export class IntegrationValidationError extends Error {
  /** Directory that was read, exactly as the caller named it. */
  readonly directory: string;

  /** Every problem found, in roster then issue order. */
  readonly failures: readonly SeedFailure[];

  /**
   * @param directory - Fixture directory that was read.
   * @param failures - Every problem found in it.
   */
  constructor(directory: string, failures: readonly SeedFailure[]) {
    super(
      `${failures.length} problem(s) in the integration fixtures ` +
      `under ${directory}. Nothing was applied.\n` +
      failures.map((failure) => (
        failure.field === null
          ? `  ${failure.file}: ${failure.message}`
          : `  ${failure.file} (${failure.field}): ${failure.message}`
      ))
        .join('\n'),
    );
    this.name = this.constructor.name;
    this.directory = directory;
    this.failures = failures;
  }
}

/**
 * A Zod issue path as a field a reader finds in the file:
 * `['findings', 2, 'labels', 0, 'verdict']` becomes
 * `findings[2].labels[0].verdict`, and an empty path is `null`.
 *
 * @param path - The path to render.
 */
function fieldPath(path: readonly PropertyKey[]): string | null {
  if (path.length === 0) {
    return null;
  }

  return path.reduce<string>((rendered, segment) => {
    if (typeof segment === 'number') {
      return `${rendered}[${segment}]`;
    }

    return rendered === ''
      ? String(segment)
      : `${rendered}.${String(segment)}`;
  }, '');
}

/**
 * Every issue in a Zod refusal as a failure naming file and field,
 * with an unrecognized-keys issue split one failure per key so the
 * field names the typo rather than the row holding it.
 *
 * @param file - File the refusal came from.
 * @param error - Zod's refusal.
 */
function schemaFailures(
  file: string,
  error: z.ZodError,
): readonly SeedFailure[] {
  return error.issues.flatMap((issue): readonly SeedFailure[] => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        file,
        field: fieldPath([...issue.path, key]),
        message: 'unrecognized key: no schema member carries that name',
      }));
    }

    return [{ file, field: fieldPath(issue.path), message: issue.message }];
  });
}

/** One roster entry's validated payload, or why there is none. */
type FileOutcome<Payload> =
  | { readonly ok: true; readonly value: Payload }
  | { readonly ok: false; readonly failures: readonly SeedFailure[] };

/**
 * One roster entry read, stripped of its underscore commentary and
 * validated. An absent file and one holding no JSON come back as a
 * failure rather than a throw, so the whole roster is still read.
 *
 * The strip walks every depth, so an underscore-prefixed key inside a
 * `config`, `fields` or `attributes` object is dropped as commentary
 * too; no fixture carries one as a value.
 *
 * @param directory - Directory to read from.
 * @param entry - The roster entry.
 */
function readFixtureFile<Schema extends z.ZodTypeAny>(
  directory: string,
  entry: { readonly file: string; readonly schema: Schema },
): FileOutcome<z.infer<Schema>> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(join(directory, entry.file), 'utf8'));
  } catch (cause) {
    const detail = cause instanceof Error
      ? cause.message
      : String(cause);
    const message = cause instanceof SyntaxError
      ? `holds no valid JSON (${detail})`
      : `could not be read (${detail})`;

    return {
      ok: false,
      failures: [{ file: entry.file, field: null, message }],
    };
  }

  const validated = entry.schema.safeParse(stripUnderscoreKeys(parsed));

  if (!validated.success) {
    return {
      ok: false,
      failures: schemaFailures(entry.file, validated.error),
    };
  }

  return { ok: true, value: validated.data };
}

/**
 * An outcome's failures, and an empty list when it carries rows.
 *
 * @param outcome - Any roster entry's outcome.
 */
function failuresOf(outcome: FileOutcome<unknown>): readonly SeedFailure[] {
  return outcome.ok
    ? []
    : outcome.failures;
}

/**
 * Every `.json` file in the directory that no roster entry names.
 * A directory that cannot be listed contributes nothing here, since
 * every roster file then fails to read and says so itself.
 *
 * @param directory - Directory to list.
 */
function unrosteredFiles(directory: string): readonly SeedFailure[] {
  const rostered = new Set<string>(
    Object.values(INTEGRATION_ROSTER).map((entry) => entry.file),
  );
  let names: readonly string[];

  try {
    names = readdirSync(directory);
  } catch {
    return [];
  }

  return names
    .filter((name) => name.endsWith('.json') && !rostered.has(name))
    .sort()
    .map((name) => ({
      file: name,
      field: null,
      message: 'is named by no roster entry, so nothing would apply it',
    }));
}

/**
 * What {@link duplicates} holds one list of rows to: the concern
 * whose file they are in, the rows, the path to their array where it
 * is not the concern's own root (a finding's labels sit deeper), the
 * member a failure names, the key two rows may not share, and what
 * that key is, for the message.
 */
interface DuplicateCheck<Row> {
  readonly concern: IntegrationConcern;
  readonly rows: readonly Row[];
  readonly at?: readonly PropertyKey[];
  readonly member: string;
  readonly keyOf: (row: Row) => string;
  readonly what: string;
}

/**
 * One failure per row whose key an earlier row of the same list
 * already carries. The later row is the one reported, since it is the
 * one a reader added.
 *
 * @param check - The rows and the key they are held to.
 */
function duplicates<Row>(check: DuplicateCheck<Row>): readonly SeedFailure[] {
  const seen = new Set<string>();

  return check.rows.flatMap((row, index): readonly SeedFailure[] => {
    const key = check.keyOf(row);

    if (!seen.has(key)) {
      seen.add(key);
      return [];
    }

    return [{
      file: INTEGRATION_ROSTER[check.concern].file,
      field: fieldPath([...check.at ?? [check.concern], index, check.member]),
      message: `repeats the ${check.what} of an earlier row: ${key}`,
    }];
  });
}

/**
 * What {@link dangling} holds one list of references to: the
 * referring concern and its rows, the referring member as the file
 * spells it, that member's value for a row as a key (`null` for
 * none), every key the referenced concern declares, and that concern.
 */
interface ReferenceCheck<Row> {
  readonly concern: IntegrationConcern;
  readonly rows: readonly Row[];
  readonly member: string;
  readonly valueOf: (row: Row) => string | null;
  readonly known: ReadonlySet<string>;
  readonly target: IntegrationConcern;
}

/**
 * One failure per row whose reference names nothing the bundle
 * carries. A `null` reference is an absent one and always resolves.
 *
 * @param check - The rows and what their references must name.
 */
function dangling<Row>(check: ReferenceCheck<Row>): readonly SeedFailure[] {
  return check.rows.flatMap((row, index): readonly SeedFailure[] => {
    const value = check.valueOf(row);

    if (value === null || check.known.has(value)) {
      return [];
    }

    return [{
      file: INTEGRATION_ROSTER[check.concern].file,
      field: fieldPath([check.concern, index, check.member]),
      message:
        `names a row no entry in ${INTEGRATION_ROSTER[check.target].file} ` +
        `declares: ${value}`,
    }];
  });
}

/** A nullable fixture id as a set key, `null` staying `null`. */
function idKey(id: number | null): string | null {
  return id === null
    ? null
    : String(id);
}

/** Every `fixtureId` a concern declares, as set keys. */
function fixtureIds(
  rows: readonly { readonly fixtureId: number }[],
): ReadonlySet<string> {
  return new Set(rows.map((row) => String(row.fixtureId)));
}

/** The (`kind`, `name`) pair a connector is found by, as one key. */
function connectorKey(kind: string, name: string): string {
  return `${kind}/${name}`;
}

/**
 * Every entity whose alias names no row listed before it — itself and
 * a later row included — and every entity whose `nameNorm` is not
 * what `normalizeEntityName` makes of its `name`, the service's one
 * definition of that column.
 *
 * @param rows - Every entity row.
 */
function entityFailures(
  rows: readonly EntityFixture[],
): readonly SeedFailure[] {
  const file = INTEGRATION_ROSTER.entities.file;

  return rows.flatMap((row, index): readonly SeedFailure[] => {
    const earlier = rows.slice(0, index).map((other) => other.fixtureId);
    const alias = row.aliasOfFixtureId;
    const failures: SeedFailure[] = [];

    if (alias !== null && !earlier.includes(alias)) {
      failures.push({
        file,
        field: fieldPath(['entities', index, 'aliasOfFixtureId']),
        message: `names no entity listed before it: ${alias}`,
      });
    }

    let normal: string | null;

    try {
      normal = normalizeEntityName(row.name);
    } catch {
      normal = null;
    }

    if (normal !== row.nameNorm) {
      failures.push({
        file,
        field: fieldPath(['entities', index, 'nameNorm']),
        message: 'is not what normalizeEntityName makes of name',
      });
    }

    return failures;
  });
}

/**
 * Every key the bundle declares twice, in roster order.
 *
 * This is what the apply pass's rerun rests on. Most of these tables
 * carry no natural key, so the pass finds a row it wrote before by
 * the identity each key below spells — two fixture rows sharing one
 * would collapse onto a single database row, and the counts a rerun
 * is held to would stop matching the files. A `fixtureId` repeated is
 * refused for a plainer reason: a reference to it names two rows.
 *
 * @param bundle - Every concern's rows, each already validated.
 */
function duplicateKeys(bundle: IntegrationBundle): readonly SeedFailure[] {
  const byFixtureId = (row: { readonly fixtureId: number }): string => (
    String(row.fixtureId)
  );
  const fixtureIdCheck = <Row extends { readonly fixtureId: number }>(
    concern: IntegrationConcern,
    rows: readonly Row[],
  ): readonly SeedFailure[] => duplicates({
    concern,
    rows,
    member: 'fixtureId',
    keyOf: byFixtureId,
    what: 'fixtureId',
  });

  return [
    ...fixtureIdCheck('connectors', bundle.connectors),
    ...duplicates({
      concern: 'connectors',
      rows: bundle.connectors,
      member: 'name',
      keyOf: (row) => connectorKey(row.kind, row.name),
      what: 'kind and name',
    }),
    ...fixtureIdCheck('sources', bundle.sources),
    ...duplicates({
      concern: 'sources',
      rows: bundle.sources,
      member: 'endpoint',
      keyOf: (row) => `${row.domainSlug} ${row.kind} ${row.endpoint}`,
      what: 'domain, kind and endpoint',
    }),
    ...fixtureIdCheck('entities', bundle.entities),
    ...duplicates({
      concern: 'entities',
      rows: bundle.entities,
      member: 'nameNorm',
      keyOf: (row) => `${row.domainSlug} ${row.nameNorm}`,
      what: 'domain and nameNorm',
    }),
    ...fixtureIdCheck('documents', bundle.documents),
    ...duplicates({
      concern: 'documents',
      rows: bundle.documents,
      member: 'hash',
      keyOf: (row) => row.hash,
      what: 'hash',
    }),
    ...fixtureIdCheck('findings', bundle.findings),
    ...duplicates({
      concern: 'findings',
      rows: bundle.findings,
      member: 'createdAt',
      keyOf: (row) => `${row.documentFixtureId} ${row.createdAt}`,
      what: 'document and createdAt',
    }),
    ...bundle.findings.flatMap((finding, index) => duplicates({
      concern: 'findings',
      rows: finding.labels,
      at: ['findings', index, 'labels'],
      member: 'labelledAt',
      keyOf: (label) => `${label.verdict} ${label.labelledAt}`,
      what: 'verdict and labelledAt',
    })),
    ...fixtureIdCheck('exportSubscriptions', bundle.exportSubscriptions),
    ...duplicates({
      concern: 'exportSubscriptions',
      rows: bundle.exportSubscriptions,
      member: 'format',
      keyOf: (row) => [
        row.domainSlug,
        row.format,
        connectorKey(row.connectorKind, row.connectorName),
      ].join(' '),
      what: 'domain, format and connector',
    }),
    ...fixtureIdCheck('runs', bundle.runs),
    ...duplicates({
      concern: 'runs',
      rows: bundle.runs,
      member: 'startedAt',
      keyOf: (row) => `${row.domainSlug} ${row.scheduledBy} ${row.startedAt}`,
      what: 'domain, scheduledBy and startedAt',
    }),
    ...duplicates({
      concern: 'llmCalls',
      rows: bundle.llmCalls,
      member: 'calledAt',
      keyOf: (row) => `${row.node} ${row.calledAt}`,
      what: 'node and calledAt',
    }),
  ];
}

/**
 * Every reference across the bundle's files that resolves to nothing,
 * in roster order, and every entity the service would not have
 * written as the file states it.
 *
 * Domain slugs are NOT resolved here. The domain is `db:seed`'s and
 * lives in the database, which this pass cannot see; the apply pass
 * resolves every slug before its first write. `runs.json`'s
 * `errors[].source_id` is not resolved either, its header recording
 * that it is written verbatim and joined on by nothing.
 *
 * @param bundle - Every concern's rows, each already validated.
 */
function danglingReferences(
  bundle: IntegrationBundle,
): readonly SeedFailure[] {
  return [
    ...entityFailures(bundle.entities),
    ...dangling({
      concern: 'documents',
      rows: bundle.documents,
      member: 'sourceFixtureId',
      valueOf: (row) => idKey(row.sourceFixtureId),
      known: fixtureIds(bundle.sources),
      target: 'sources',
    }),
    ...dangling({
      concern: 'findings',
      rows: bundle.findings,
      member: 'documentFixtureId',
      valueOf: (row) => idKey(row.documentFixtureId),
      known: fixtureIds(bundle.documents),
      target: 'documents',
    }),
    ...dangling({
      concern: 'findings',
      rows: bundle.findings,
      member: 'entityFixtureId',
      valueOf: (row) => idKey(row.entityFixtureId),
      known: fixtureIds(bundle.entities),
      target: 'entities',
    }),
    ...dangling({
      concern: 'exportSubscriptions',
      rows: bundle.exportSubscriptions,
      member: 'connectorName',
      valueOf: (row) => connectorKey(row.connectorKind, row.connectorName),
      known: new Set(bundle.connectors.map(
        (row) => connectorKey(row.kind, row.name),
      )),
      target: 'connectors',
    }),
    ...dangling({
      concern: 'llmCalls',
      rows: bundle.llmCalls,
      member: 'runFixtureId',
      valueOf: (row) => idKey(row.runFixtureId),
      known: fixtureIds(bundle.runs),
      target: 'runs',
    }),
  ];
}

/**
 * Every fixture file under `directory`, read, stripped, validated and
 * held against the others.
 *
 * Two passes, in order. The first reads the whole roster and refuses
 * the bundle if any file is missing, holds no JSON, fails its schema,
 * or sits in the directory unnamed. The second runs only once every
 * file has validated, because a file refused for one mistyped key
 * declares no ids at all and every reference into it would otherwise
 * be reported beside the one real mistake.
 *
 * @param directory - Directory holding the fixture files. Defaults to
 * {@link INTEGRATION_FIXTURE_DIR}.
 * @returns Every concern's validated rows.
 * @throws IntegrationValidationError When either pass finds anything,
 * carrying every failure that pass found.
 */
export function loadIntegrationBundle(
  directory: string = INTEGRATION_FIXTURE_DIR,
): IntegrationBundle {
  const roster = INTEGRATION_ROSTER;
  const connectors = readFixtureFile(directory, roster.connectors);
  const sources = readFixtureFile(directory, roster.sources);
  const entities = readFixtureFile(directory, roster.entities);
  const documents = readFixtureFile(directory, roster.documents);
  const findings = readFixtureFile(directory, roster.findings);
  const subscriptions = readFixtureFile(
    directory,
    roster.exportSubscriptions,
  );
  const runs = readFixtureFile(directory, roster.runs);
  const llmCalls = readFixtureFile(directory, roster.llmCalls);

  // Tested outcome by outcome rather than on a collected count, for
  // the reason `loadSeedBundle` gives: only a discriminant test on
  // each proves to the compiler that the rows below exist.
  if (
    !connectors.ok
    || !sources.ok
    || !entities.ok
    || !documents.ok
    || !findings.ok
    || !subscriptions.ok
    || !runs.ok
    || !llmCalls.ok
  ) {
    throw new IntegrationValidationError(directory, [
      ...failuresOf(connectors),
      ...failuresOf(sources),
      ...failuresOf(entities),
      ...failuresOf(documents),
      ...failuresOf(findings),
      ...failuresOf(subscriptions),
      ...failuresOf(runs),
      ...failuresOf(llmCalls),
      ...unrosteredFiles(directory),
    ]);
  }

  const unrostered = unrosteredFiles(directory);

  if (unrostered.length > 0) {
    throw new IntegrationValidationError(directory, unrostered);
  }

  const bundle: IntegrationBundle = {
    connectors: connectors.value.connectors,
    sources: sources.value.sources,
    entities: entities.value.entities,
    documents: documents.value.documents,
    findings: findings.value.findings,
    exportSubscriptions: subscriptions.value.exportSubscriptions,
    runs: runs.value.runs,
    llmCalls: llmCalls.value.llmCalls,
  };
  const unresolved = [
    ...duplicateKeys(bundle),
    ...danglingReferences(bundle),
  ];

  if (unresolved.length > 0) {
    throw new IntegrationValidationError(directory, unresolved);
  }

  return bundle;
}

/**
 * An open pool and the way to let go of it. A pool rather than a
 * drizzle handle because `assertLiveDatabase` asks the pool, and it
 * is the seam a test drives {@link runIntegrationSeedCli} through.
 */
export interface IntegrationSeedConnection {
  /** What the apply pass guards and then writes through. */
  readonly pool: Pool;

  /** Releases it, whether or not the pass succeeded. */
  close(): Promise<void>;
}

/**
 * A pool over the database `DATABASE_URL` names, read through
 * `src/config.ts` exactly as `db:seed` reads it, so the two commands
 * run against one database in one shell.
 */
function openIntegrationConnection(): IntegrationSeedConnection {
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 2 });

  return { pool, close: () => pool.end() };
}

/**
 * What one pass did, a line per table in the order it wrote them.
 *
 * @param counts - What the apply pass reported.
 * @returns The block, newline-separated, with no trailing newline.
 */
export function formatIntegrationSummary(counts: IntegrationCounts): string {
  const rows = Object.entries(counts);
  const width = Math.max(...rows.map(([label]) => label.length));

  return [
    'integration seed summary',
    ...rows.map(([label, tally]) => (
      `  ${label.padEnd(width)}  inserted ${tally.inserted}` +
      `  matched ${tally.matched}`
    )),
  ].join('\n');
}

/**
 * One integration seed pass end to end: load the bundle, then open a
 * connection, then apply, then close.
 *
 * The bundle is loaded before `connect` is called, so a refused
 * bundle ends the run with no connection made. The connection is
 * closed in a `finally`, so a pass the guard or the database refused
 * still releases its pool rather than holding the process open.
 *
 * @param connect - How to reach a database. Defaults to a pool over
 * `DATABASE_URL`.
 * @param directory - Fixture directory. Defaults to
 * {@link INTEGRATION_FIXTURE_DIR}.
 * @returns What the pass did.
 * @throws IntegrationValidationError Before `connect` is called.
 */
export async function runIntegrationSeedCli(
  connect: () => IntegrationSeedConnection = openIntegrationConnection,
  directory: string = INTEGRATION_FIXTURE_DIR,
): Promise<IntegrationCounts> {
  const bundle = loadIntegrationBundle(directory);
  const connection = connect();

  try {
    const counts = await applyIntegrationBundle(connection.pool, bundle);

    console.log(`integration fixtures applied from ${directory}`);
    console.log(formatIntegrationSummary(counts));

    return counts;
  } finally {
    await connection.close();
  }
}

/**
 * Whether this file is what the process was started with, compared
 * as paths for the reason `scripts/seed.ts` records.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runIntegrationSeedCli();
  } catch (cause) {
    process.exitCode = 1;
    console.error(
      cause instanceof IntegrationValidationError
        ? cause.message
        : cause,
    );
  }
}
