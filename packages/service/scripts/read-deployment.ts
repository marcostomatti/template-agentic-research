/**
 * @packageDocumentation
 * The readings a verification of an external-mode deployment takes,
 * one leg per process: `bun scripts/read-deployment.ts <leg>`, where
 * the leg is `instance`, `workflows`, `schema` or `connector`. A run
 * takes that leg's reading, hands it to the verdict of the same name
 * in `deployment-verdict.ts`, prints the lines the verdict answers,
 * and exits 0 healthy, 1 unhealthy or 2 unreadable.
 *
 * ONE LEG PER PROCESS, SO ONE FAILURE CANNOT HIDE ANOTHER. The script
 * running a whole verification starts this once per leg, so a
 * database that will not answer leaves the instance legs still
 * reading, and a leg that dies leaves the other three answering.
 * What a process here decides is one leg's answer; what the answers
 * add up to is `aggregateExitCode` in `deployment-verdict.ts`, for
 * the caller to apply.
 *
 * IT SENDS `GET` REQUESTS AND `SELECT` STATEMENTS AND NOTHING ELSE.
 * The deployment belongs to someone else. Two requests can leave this
 * module: `GET /healthz/readiness` at the instance root, and the
 * paged `GET /workflows` listing `listWorkflows` makes, which is the
 * one function of `n8n-client.ts` imported here. Two statements can:
 * the ledger `SELECT` `readAppliedMigrationTags` in
 * `migration-ledger.ts` sends, and {@link CONNECTOR_QUERY}. Both
 * seams are handed in through {@link ReadDeploymentOptions}, and
 * `tests/scripts/read-deployment.test.ts` records every method and
 * every statement that crosses them. What such a record cannot say is
 * what a module imported here does on some other path:
 * `audit-workflows.ts` and `deploy-external.ts` each import mutating
 * client calls by name for their own commands, and importing either
 * runs none of it, because each guards its run the way this file
 * does.
 *
 * EVERY LEG IS BEHIND `requireInstance`, the two database legs
 * included. A verification is of one deployment and `AR_N8N_URL` is
 * what names it, so a leg run by hand with the pair unset is refused
 * the way a whole verification is, before any request, any statement
 * or any connection. The refusal and an argument naming no leg both
 * exit 2: nothing was read, which is what 2 says.
 *
 * A READING THAT FAILS IS AN ANSWER, NOT A CRASH. Whatever a reading
 * throws becomes an unreadable reading carrying a reason, so a leg
 * that could not read still prints its verdict and exits 2. The
 * reason names the failure and never the address it happened at. A
 * system error is named by its call and its code, because `pg`'s
 * message for one carries the host and port it dialled — measured
 * under bun, `connect ECONNREFUSED` followed by the address — and a
 * verification's lines are quoted wherever it is recorded. A call
 * the instance refused is named by method, endpoint and status, and
 * never by the body, which is the instance's own text. The verdict
 * masks every control byte in what is left.
 *
 * WHAT THIS DOES NOT CHECK. No leg reaches the model server: the n8n
 * container dials it, so a probe from this host would be a reading
 * from the wrong network position, and the `connector` verdict prints
 * that limit on every answer. Neither seam carries a deadline, so an
 * address that never answers holds its leg open for as long as the
 * connect underneath takes to give up. And `DATABASE_URL` has a
 * fallback in `src/config.ts`, the compose dev database, so with
 * nothing set the two database legs read that database rather than
 * refusing: the setting a verification needs exported is the one
 * this module cannot tell was never given.
 */

import type { InstanceSettings } from './deploy-external.js';
import type {
  LegName,
  LegReading,
  LegVerdict,
  SourceWorkflow,
} from './deployment-verdict.js';
import type { MigrationComparison, MigrationLedgerClient, MigrationLedgerRow } from './migration-ledger.js';
import type { HttpFetch, N8nInstance } from './n8n-client.js';
import type { ConnectorRecord } from '../src/connectors/store.js';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';

import { config } from '../src/config.js';

import { expectedNames } from './audit-workflows.js';
import { WORKFLOW_SOURCE_DIR } from './build-workflows.js';
import {
  UnconfiguredInstanceError,
  requireInstance,
} from './deploy-external.js';
import {
  LEG_EXIT_CODES,
  LEG_NAMES,
  connectorVerdict,
  instanceVerdict,
  legExitCode,
  reportLines,
  schemaVerdict,
  workflowsVerdict,
} from './deployment-verdict.js';
import {
  LLM_CONNECTOR_KIND,
  projectModelConnector,
} from './llm-connector.js';
import {
  compareMigrationTags,
  readAppliedMigrationTags,
  readMigrationJournal,
} from './migration-ledger.js';
import {
  UnsuccessfulReplyError,
  listWorkflows,
} from './n8n-client.js';

/**
 * What a database leg sends a statement through: one query, as text,
 * answering rows whose shape nothing here takes on trust.
 *
 * `MigrationLedgerClient` in `migration-ledger.ts` is the same slice
 * with the ledger's row shape promised, and a promise about rows out
 * of somebody else's database is the one this module does not make:
 * every row arrives as `unknown` and is checked where its leg reads
 * it. A case hands over a client that records each statement and
 * answers rows written beside it; a real run hands over `pg`'s
 * `Pool`, whose `query` over a text answers `{ rows }`.
 */
export interface DeploymentQueryClient {
  query(text: string): Promise<{ readonly rows: readonly unknown[] }>;
}

/** A database a leg reads, and the way to let go of it. */
export interface DeploymentDatabase {
  /** What the leg's one statement goes through. */
  readonly client: DeploymentQueryClient;

  /** Releases it, whether or not the reading succeeded. */
  close(): Promise<void>;
}

/**
 * Everything a leg cannot find out for itself.
 *
 * Four seams, and the whole of what parts a run from a case: where
 * the database is, what the requests go through, what the two
 * instance settings answered, and where the workflow sources are. The
 * settings arrive unrefused, beside the fetch, which is the pair
 * `PanicOptions` in `panic-external.ts` takes for the same reason:
 * `requireInstance` is what turns the two into something a call can
 * be made with, and holding an already refused value here would put
 * the refusal outside the run that is meant to report it.
 */
export interface ReadDeploymentOptions {
  /**
   * Opens the database the `schema` and `connector` legs read. Called
   * by those two legs only, and only after the settings cleared, so a
   * leg that never reads a database never opens one.
   */
  readonly connect: () => DeploymentDatabase;

  /**
   * What the requests go through, taken as an argument so that a case
   * drives them against a stub and the isolated suite stays isolated
   * by construction.
   */
  readonly fetch: HttpFetch;

  /** The two instance settings, either of them possibly unset. */
  readonly settings: InstanceSettings;

  /** The directory the workflow sources are read out of. */
  readonly sourceDir: string;
}

/**
 * Where the public API is mounted under an instance, spelled as
 * `apiRoot` in `n8n-client.ts` spells it.
 *
 * Written again rather than imported because that module exports its
 * calls and not its paths, and the one call this module takes from it
 * is the listing. The two spellings are held together by a case that
 * reads a readiness request and a listing request off one stub, for
 * a base URL written with the API path and without it.
 */
const API_PATH = '/api/v1';

/**
 * The route an instance answers readiness on, at its root rather than
 * under the API.
 *
 * Readiness rather than `/healthz`: the image's own server answers
 * `/healthz` whenever the process is up, and readiness only once it
 * is connected to its database, migrated and fully started, which is
 * the question a verification asks.
 */
const READINESS_PATH = '/healthz/readiness';

/**
 * The headers the readiness request sends, which carry no key.
 *
 * The route sits behind no authentication and ignores a key it is
 * handed, so sending one would put the credential on a request that
 * has no use for it. The key travels on the listing, where
 * `n8n-client.ts` sets it.
 */
const READINESS_HEADERS: Readonly<Record<string, string>> = {
  accept: 'application/json',
};

/**
 * The trailing slashes an operator's base URL may carry.
 */
const TRAILING_SLASHES = /\/+$/u;

/**
 * The readiness URL for an operator's base URL.
 *
 * Both spellings `apiRoot` in `n8n-client.ts` takes are taken here,
 * the instance root and the root with the API path on the end, and
 * both answer the same URL: the API path and any trailing slash come
 * off, and the readiness route goes on.
 *
 * @param baseUrl - The configured base URL, either spelling.
 * @returns The absolute URL readiness is asked at.
 */
function readinessUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(TRAILING_SLASHES, '');
  const root = trimmed.endsWith(API_PATH)
    ? trimmed.slice(0, -API_PATH.length).replace(TRAILING_SLASHES, '')
    : trimmed;

  return `${root}${READINESS_PATH}`;
}

/**
 * What an instance's refusal of the listing means, by status, where
 * the status alone says it.
 *
 * Read off n8n 2.15.1's public API middleware: a key the instance
 * does not accept is a 401, and a key it accepts that lacks the one
 * scope the listing needs is a 403 before any handler runs.
 */
const STATUS_READINGS: ReadonlyMap<number, string> = new Map([
  [401, 'which is a key the instance does not accept'],
  [403, 'which is a key without the workflow:list scope'],
]);

/**
 * Why a reading failed, in one sentence that names no address.
 *
 * Three shapes, each with what is worth printing of it. A refusal
 * from the instance is its method, endpoint and status, and a reading
 * of the status where {@link STATUS_READINGS} has one; the body is the
 * instance's own text and is left out. A system error, one carrying a
 * `syscall` and a `code`, is those two alone, because its message
 * repeats the address that was dialled. Anything else is its message,
 * with its code beside it where it carries one, which is how a
 * database names the error it raised.
 *
 * @param cause - What the reading threw.
 * @returns The reason an unreadable reading carries.
 */
function reasonOf(cause: unknown): string {
  if (cause instanceof UnsuccessfulReplyError) {
    const answered = `the instance answered ${cause.method} ${cause.endpoint} `
      + `with ${String(cause.status)}`;
    const reading = STATUS_READINGS.get(cause.status);

    return reading === undefined
      ? answered
      : `${answered}, ${reading}`;
  }

  if (!(cause instanceof Error)) {
    return String(cause);
  }

  const { code, syscall } = cause as { readonly code?: unknown; readonly syscall?: unknown };

  if (typeof syscall === 'string' && typeof code === 'string') {
    return `${syscall} ${code}`;
  }

  const said = cause.message === ''
    ? cause.name
    : cause.message;

  return typeof code === 'string'
    ? `${said} (${code})`
    : said;
}

/**
 * Take one reading, and hand back what was read or why it was not.
 *
 * The catch is the whole point and it is broad on purpose: every way
 * a reading can fail is a leg that could not read, and a leg that
 * could not read answers 2 with its reason rather than a stack.
 *
 * @param read - The reading.
 * @returns The value read, or the reason it was not.
 */
async function attempt<T>(read: () => Promise<T> | T): Promise<LegReading<T>> {
  try {
    return { outcome: 'read', value: await read() };
  } catch (cause) {
    return { outcome: 'unreadable', reason: reasonOf(cause) };
  }
}

/**
 * The status an instance answers its readiness route with.
 *
 * The status and not the body: `instanceVerdict` decides on the
 * status alone, and the body is not read.
 *
 * @param instance - The instance to ask.
 * @returns The HTTP status of the reply.
 */
async function readReadiness(instance: N8nInstance): Promise<number> {
  const reply = await instance.fetch(readinessUrl(instance.baseUrl), {
    headers: READINESS_HEADERS,
    method: 'GET',
  });

  return reply.status;
}

/** One node of a workflow source, as the arming question reads it. */
type SourceNode = SourceWorkflow['nodes'][number];

/**
 * Whether a parsed value is a node the arming question can read.
 *
 * @param value - One entry of a source's `nodes`.
 * @returns Whether it is an object naming its type as a string.
 */
function isSourceNode(value: unknown): value is SourceNode {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { readonly type?: unknown }).type === 'string';
}

/**
 * One workflow source, read for its nodes under the name
 * `expectedNames` read out of it.
 *
 * The name is held against what the file declares rather than taken
 * from it, which is what makes the pairing in
 * {@link readSourceWorkflows} checked rather than assumed.
 *
 * @param path - The source file.
 * @param name - The display name `expectedNames` read at this file's
 *   position, or `undefined` where it read none.
 * @returns The source, named and with its nodes.
 * @throws Error When the file no longer declares that name, or carries
 *   no list of nodes each naming a type.
 */
function sourceWorkflowOf(path: string, name: string | undefined): SourceWorkflow {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const declared = typeof parsed === 'object' && parsed !== null
    ? (parsed as { readonly name?: unknown; readonly nodes?: unknown })
    : {};

  if (name === undefined || declared.name !== name) {
    throw new Error(
      `${path} does not declare the display name the workflow sources were `
      + 'read under at its position, so its nodes cannot be paired with a name.',
    );
  }

  const { nodes } = declared;

  if (!Array.isArray(nodes) || !nodes.every(isSourceNode)) {
    throw new Error(
      `${path} carries no list of nodes each naming a type, so whether an `
      + 'activation would arm it cannot be asked.',
    );
  }

  return { name, nodes };
}

/**
 * Every workflow source, named and with the nodes that decide whether
 * an activation would arm it.
 *
 * The names are `expectedNames`'s in `audit-workflows.ts`, so a
 * source that is not a workflow object, declares no display name or
 * declares one carrying build-marker text is refused by the rule an
 * audit refuses it by, and a directory that cannot be listed raises
 * what that function raises. The nodes are read by the same walk that
 * function takes — top level, `*.json`, files only, sorted — because
 * it answers names and not files, and each file is held to the name
 * read at its position, so a walk that had drifted from that one
 * throws rather than pairing a name with another source's nodes.
 *
 * @param sourceDir - The directory the sources are read out of.
 * @returns Every source, in the order `expectedNames` reads them.
 * @throws Error When the sources cannot be listed or read, or when a
 *   source is refused.
 */
export function readSourceWorkflows(sourceDir: string): readonly SourceWorkflow[] {
  const names = expectedNames({ sourceDir });
  const files = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (files.length !== names.length) {
    throw new Error(
      `${sourceDir} listed ${String(files.length)} workflow sources and `
      + `${String(names.length)} display names were read out of it.`,
    );
  }

  return files.map((file, index) => sourceWorkflowOf(join(sourceDir, file), names[index]));
}

/**
 * One ledger row as `readAppliedMigrationTags` reads it, checked.
 *
 * The migrator's column is a `bigint` the driver answers as text, and
 * a null is what the column admits. A number is taken as its text,
 * which is the same stamp; anything else names no migration, and a
 * ledger carrying one is not a ledger this leg can read.
 *
 * @param row - One row as the database answered it.
 * @returns The row, as the ledger reader types it.
 * @throws Error When the row carries no stamp of either shape.
 */
function ledgerRowOf(row: unknown): MigrationLedgerRow {
  const stamp = typeof row === 'object' && row !== null
    ? (row as { readonly created_at?: unknown }).created_at
    : undefined;

  if (typeof stamp === 'string' || stamp === null) {
    return { created_at: stamp };
  }

  if (typeof stamp === 'number') {
    return { created_at: String(stamp) };
  }

  throw new Error('a migration ledger row carried no created_at stamp, so it names no migration');
}

/**
 * The ledger reader's client, over a client whose rows are checked.
 *
 * @param client - The client the statement goes through.
 * @returns The same client, answering ledger rows.
 */
function ledgerClientOf(client: DeploymentQueryClient): MigrationLedgerClient {
  return {
    query: async (text) => {
      const { rows } = await client.query(text);

      return { rows: rows.map(ledgerRowOf) };
    },
  };
}

/**
 * The deployment's migration ledger, held against this checkout's
 * journal.
 *
 * The journal is this checkout's: what the deployment is held to is
 * the migrations the commit a verification runs from declares, as
 * `workflows/src/` is for the `workflows` leg.
 *
 * @param client - The client the ledger statement goes through.
 * @returns Where the ledger and the journal disagree.
 * @throws Error When the journal or the ledger cannot be read.
 */
async function readMigrationComparison(
  client: DeploymentQueryClient,
): Promise<MigrationComparison> {
  const journal = readMigrationJournal().map((entry) => entry.tag);
  const applied = await readAppliedMigrationTags(ledgerClientOf(client));

  return compareMigrationTags(journal, applied);
}

/**
 * The one statement the `connector` leg sends.
 *
 * It selects the kind `Select Model Connector` selects, oldest first,
 * and the four columns a `ConnectorRecord` carries. The selection and
 * the order are restated in SQL so the leg reads no row of any other
 * kind, another kind's config being where a credential is stored;
 * `projectModelConnector` in `llm-connector.ts` applies both again
 * over what comes back, so the projection is that function's and not
 * this statement's.
 *
 * Written through the connector's table rather than through
 * `listConnectors` in `src/connectors/service.ts`, which is what
 * `llm-connector.ts` reads through: that surface is a port over a
 * drizzle store, and the reading here has to cross one text client a
 * case can record.
 */
export const CONNECTOR_QUERY
  = `SELECT "id", "kind", "name", "config" FROM "connectors" WHERE "kind" = '${LLM_CONNECTOR_KIND}' ORDER BY "id"`;

/** A row id as the driver answers a `bigserial`: digits, as text. */
const ROW_ID_TEXT = /^\d+$/u;

/**
 * One connector row, checked into the record the projection reads.
 *
 * The id arrives as text, `pg` answering a `bigint` that way where the
 * service's drizzle store is told to read it as a number, so digits
 * are taken as the integer they spell. A row without an integer id, a
 * kind and a name is refused: the projection orders by the id and
 * names the row it selected, and could do neither.
 *
 * @param row - One row as the database answered it.
 * @returns The row as a record.
 * @throws Error When the row carries no integer id, kind and name.
 */
function connectorRecordOf(row: unknown): ConnectorRecord {
  const read = typeof row === 'object' && row !== null
    ? (row as { readonly config?: unknown; readonly id?: unknown; readonly kind?: unknown; readonly name?: unknown })
    : {};
  const id = typeof read.id === 'string' && ROW_ID_TEXT.test(read.id)
    ? Number(read.id)
    : read.id;

  if (typeof id !== 'number' || !Number.isSafeInteger(id)
    || typeof read.kind !== 'string' || typeof read.name !== 'string') {
    throw new Error(
      'a connectors row carried no integer id, kind and name, so which row a '
      + 'pass would select cannot be said',
    );
  }

  return { config: read.config, id, kind: read.kind, name: read.name };
}

/**
 * What `Select Model Connector` would read off the deployment.
 *
 * @param client - The client the connector statement goes through.
 * @returns The projection of the rows {@link CONNECTOR_QUERY} answers.
 * @throws Error When the statement fails or a row is refused.
 */
async function readModelConnector(
  client: DeploymentQueryClient,
): Promise<ReturnType<typeof projectModelConnector>> {
  const { rows } = await client.query(CONNECTOR_QUERY);

  return projectModelConnector(rows.map(connectorRecordOf));
}

/**
 * Open the database, read it, and let it go whatever the reading did.
 *
 * Inside the reading's attempt rather than around it, so a database
 * that cannot even be opened is an unreadable leg like one that
 * refused the statement.
 *
 * @param connect - How to open the database.
 * @param read - The reading to take over it.
 * @returns What the reading answered.
 */
async function withDatabase<T>(
  connect: () => DeploymentDatabase,
  read: (client: DeploymentQueryClient) => Promise<T>,
): Promise<T> {
  const database = connect();

  try {
    return await read(database.client);
  } finally {
    await database.close();
  }
}

/** What every leg is handed once the settings have cleared. */
interface LegContext {
  /** How to open the database, for the two legs that read one. */
  readonly connect: () => DeploymentDatabase;

  /** The instance the settings named. */
  readonly instance: N8nInstance;

  /** Where the workflow sources are. */
  readonly sourceDir: string;
}

/**
 * The `instance` leg: whether the instance says it is ready.
 *
 * @param context - What the leg reads through.
 * @returns Its verdict.
 */
async function instanceLeg(context: LegContext): Promise<LegVerdict> {
  return instanceVerdict(await attempt(() => readReadiness(context.instance)));
}

/**
 * The `workflows` leg: what the instance holds, against the sources.
 *
 * Both readings are taken whatever became of the first, so a verdict
 * over two failures names both. The sources go first, being a read of
 * this checkout that reaches nothing.
 *
 * @param context - What the leg reads through.
 * @returns Its verdict.
 */
async function workflowsLeg(context: LegContext): Promise<LegVerdict> {
  const sources = await attempt(() => readSourceWorkflows(context.sourceDir));
  const listing = await attempt(() => listWorkflows(context.instance));

  return workflowsVerdict(listing, sources);
}

/**
 * The `schema` leg: the migration ledger against the journal.
 *
 * @param context - What the leg reads through.
 * @returns Its verdict.
 */
async function schemaLeg(context: LegContext): Promise<LegVerdict> {
  return schemaVerdict(
    await attempt(() => withDatabase(context.connect, readMigrationComparison)),
  );
}

/**
 * The `connector` leg: the model connector a pass would select.
 *
 * @param context - What the leg reads through.
 * @returns Its verdict.
 */
async function connectorLeg(context: LegContext): Promise<LegVerdict> {
  return connectorVerdict(
    await attempt(() => withDatabase(context.connect, readModelConnector)),
  );
}

/**
 * Each leg's reader, keyed by the leg.
 *
 * A record over `LegName` rather than a branch per name, so a leg
 * added to `LEG_NAMES` with no reader here is a `check-types` error
 * rather than a leg that answers nothing.
 */
const LEG_READERS: Readonly<Record<LegName, (context: LegContext) => Promise<LegVerdict>>> = {
  connector: connectorLeg,
  instance: instanceLeg,
  schema: schemaLeg,
  workflows: workflowsLeg,
};

/**
 * Read one leg of a deployment, behind the instance settings.
 *
 * `requireInstance` runs first and for every leg, so nothing is
 * requested, sent or opened for a leg whose settings did not clear.
 *
 * @param leg - Which leg to read.
 * @param options - What to read through.
 * @returns The leg's verdict.
 * @throws UnconfiguredInstanceError When either instance setting is
 *   absent or blank, before any request, statement or connection.
 */
export async function readLeg(
  leg: LegName,
  options: ReadDeploymentOptions,
): Promise<LegVerdict> {
  const { connect, fetch: through, settings, sourceDir } = options;
  const instance = requireInstance(settings, through);

  return LEG_READERS[leg]({ connect, instance, sourceDir });
}

/**
 * Thrown when a command line names no leg, more than one, or a word
 * that is not a leg.
 *
 * A class of its own so a case can pin the refusal and the command
 * can print its message without a stack. What was typed is quoted, so
 * a stray space reads as one.
 */
export class LegArgumentError extends Error {
  /** The arguments as they were handed over. */
  readonly argv: readonly string[];

  /**
   * @param argv - The arguments after the script path.
   */
  constructor(argv: readonly string[]) {
    const handed = argv.length === 0
      ? 'nothing'
      : argv.map((argument) => JSON.stringify(argument)).join(' ');

    super(
      'bun scripts/read-deployment.ts takes exactly one leg, one of '
      + `${LEG_NAMES.join(', ')}, and was handed ${handed}. Nothing was read.`,
    );
    this.name = this.constructor.name;
    this.argv = argv;
  }
}

/**
 * Whether an argument names a leg, spelled exactly.
 *
 * @param argument - One argument, or `undefined` where there was none.
 * @returns Whether it is one of `LEG_NAMES`.
 */
function isLegName(argument: string | undefined): argument is LegName {
  return LEG_NAMES.some((leg) => leg === argument);
}

/**
 * The leg a command line names.
 *
 * @param argv - The arguments after the script path.
 * @returns The one leg they name.
 * @throws LegArgumentError When they name no leg, more than one
 *   argument, or a word that is not a leg.
 */
export function legOf(argv: readonly string[]): LegName {
  const [leg] = argv;

  if (argv.length !== 1 || !isLegName(leg)) {
    throw new LegArgumentError(argv);
  }

  return leg;
}

/**
 * One leg end to end: read the command line, clear the settings, take
 * the reading, print the verdict's lines, and answer the exit code.
 *
 * The argument is read before the settings, both being free, so a
 * mistyped leg is named before an unconfigured environment is.
 *
 * @param argv - The arguments after the script path.
 * @param options - What to read through. Defaults to what
 *   configuration answers for; a caller handing over its own is what
 *   makes this drivable with no instance and no database.
 * @returns 0 healthy, 1 unhealthy, 2 unreadable.
 * @throws LegArgumentError When the command line names no single leg.
 * @throws UnconfiguredInstanceError When either instance setting is
 *   absent or blank.
 */
export async function runReadDeploymentCli(
  argv: readonly string[] = process.argv.slice(2),
  options: ReadDeploymentOptions = configuredOptions(),
): Promise<number> {
  const leg = legOf(argv);
  const verdict = await readLeg(leg, options);

  console.log(reportLines(verdict).join('\n'));

  return legExitCode(verdict);
}

/**
 * A pool over the database `DATABASE_URL` names, one connection wide.
 *
 * Read through `src/config.ts`, as `scripts/seed.ts` and
 * `scripts/llm-connector.ts` read it, so a malformed environment is
 * refused once, at import, by the schema that owns it. A pool
 * connects on its first statement, so opening one here reaches
 * nothing yet.
 *
 * @returns The client and the way to end the pool behind it.
 */
function openDatabase(): DeploymentDatabase {
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 });

  return { client: pool, close: () => pool.end() };
}

/**
 * The four seams with their real values in them.
 *
 * @returns The database, the global fetch, the two settings and the
 *   workflow source directory a real run uses.
 */
function configuredOptions(): ReadDeploymentOptions {
  return {
    connect: openDatabase,
    fetch,
    settings: {
      apiKey: config.AR_N8N_API_KEY,
      baseUrl: config.AR_N8N_URL,
    },
    sourceDir: WORKFLOW_SOURCE_DIR,
  };
}

/**
 * Every refusal this command raises on purpose and can name by class.
 *
 * Two: a command line naming no single leg, and an environment naming
 * no instance. A failed reading reaches no roster, being an answer the
 * leg prints rather than something thrown.
 */
const READ_REFUSALS = [LegArgumentError, UnconfiguredInstanceError];

/**
 * Whether a caught value is one this command reports as a message.
 *
 * @param cause - What the run threw.
 * @returns Whether its message is the whole report.
 */
function isReadRefusal(cause: unknown): cause is Error {
  return READ_REFUSALS.some((refusal) => cause instanceof refusal);
}

/**
 * Whether this file is what the process was started with, rather than
 * something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so `fileURLToPath` is what lets the two compare at all;
 * `scripts/build-workflows.ts` carries the measurement behind that and
 * the reason the guard cannot move into a shared helper. A case
 * importing {@link readLeg} gets the exports and reads nothing.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    process.exitCode = await runReadDeploymentCli();
  } catch (cause) {
    // Nothing was read, which is what an unreadable leg's code says.
    // A refusal on the roster is already a report; anything else is
    // unexpected, and there the stack is what a reader needs.
    process.exitCode = LEG_EXIT_CODES.unreadable;
    console.error(
      isReadRefusal(cause)
        ? cause.message
        : cause,
    );
  }
}
