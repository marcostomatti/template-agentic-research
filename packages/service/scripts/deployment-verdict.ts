/**
 * @packageDocumentation
 * What a verification of an external-mode deployment makes of what it
 * read: one verdict per leg, the lines a leg prints, and the exit code
 * the legs add up to. Four legs, one reading each — the instance's
 * readiness, the workflows it holds against the workflow sources, the
 * migration ledger against the journal, and the model connector a pass
 * would select — and three answers for every one of them: healthy,
 * unhealthy, or unreadable.
 *
 * PURE, SO EVERY VERDICT IS DRIVABLE FROM LITERALS. Nothing here opens
 * a socket, sends a statement or reads a file. Each verdict takes the
 * value a reader already has in hand, so what a deployment is worth is
 * settled by a case holding a literal, with nothing stubbed and no
 * deployment anywhere in the run. Taking the readings is not this
 * module's work, and neither is running a leg or ending a process:
 * no `package.json` script names this file and it carries no
 * `INVOKED_AS_CLI` block.
 *
 * UNREADABLE IS NOT UNHEALTHY. A leg that could not take its reading
 * answers 2 and a leg that took it and found a fault answers 1, and
 * every verdict takes a {@link LegReading} rather than a bare value so
 * that the difference arrives as data instead of being inferred from
 * one. The two ask for different acts. An unhealthy deployment wants a
 * deploy, an activation or a migration; an unreadable one wants the
 * reading's own position checked — a stopped database, a key the
 * instance refused, an address naming something that is not n8n — and
 * folding either answer into the other sends an operator to repair the
 * wrong thing. It also keeps a failed read from reporting findings of
 * its own: a listing that could not be taken names no missing
 * workflow, because none was looked for.
 *
 * WHAT FAILS AND WHAT IS ONLY REPORTED. A workflow the sources declare
 * and the instance does not hold, a declared name the instance holds
 * more than one workflow under, and a workflow whose source would arm
 * it sitting inactive are each unhealthy. A workflow no source
 * declares is a stray, and a stray is reported and never fails: the
 * instance belongs to someone else, who may host workflows of their
 * own on it, and what they keep there is not this repository's to
 * rule on. That is the line `audit-workflows.ts` does not draw — its
 * verdict turns on strays, and it exits 0 whatever it finds, where a
 * verification is allowed to fail and fails on what this repository
 * deploys.
 *
 * REUSED RATHER THAN RESTATED. {@link workflowsVerdict} sorts a listing
 * through `classify` in `audit-workflows.ts` and asks which sources arm
 * through `activatableTriggers` in `n8n-workflow.ts`, so a verification
 * reads an instance by the same partition an audit prints and the same
 * trigger rosters the activate path sorts by. {@link schemaVerdict}
 * takes the comparison `compareMigrationTags` in `migration-ledger.ts`
 * answers, and {@link connectorVerdict} the projection
 * `projectModelConnector` in `llm-connector.ts` answers. Neither of
 * those two is imported as a value here; their shapes are.
 *
 * WHAT A REPORT LINE CARRIES. Every value interpolated into a finding
 * passes through `maskControlBytes` in `src/http/control-bytes.ts`
 * first. The deployment belongs to someone else, a workflow name is
 * free text on its canvas and a ledger tag is text out of its
 * database, and a raw ESC or CR in either would let that deployment
 * rewrite the terminal printing its own verdict. The mask escapes every
 * C0 control, LF included, so one finding is always one line. No
 * connector value is printed at all, which is argued at
 * {@link connectorVerdict}.
 *
 * WHAT IMPORTING IT PULLS IN. `classify` is the one value taken from
 * `audit-workflows.ts`, and that module imports `src/config.ts`, which
 * parses the environment at import, and by name the two client
 * functions its acting flags reach, `deactivateWorkflow` and
 * `deleteWorkflow`. Importing it runs that parse and calls neither
 * function: its `INVOKED_AS_CLI` guard compares its own path against
 * `process.argv[1]` and answers false in a process that imported it.
 */

import type { ModelConnectorProjection } from './llm-connector.js';
import type { MigrationComparison } from './migration-ledger.js';
import type { RemoteWorkflow } from './n8n-client.js';
import type { ActivationWorkflow } from './n8n-workflow.js';

import { maskControlBytes } from '../src/http/control-bytes.js';

import { classify } from './audit-workflows.js';
import { activatableTriggers } from './n8n-workflow.js';

/**
 * The four legs a verification runs, in the order a deployment is
 * reached: the instance first, then what it holds, then the database
 * beside it, then the one row that says where a pass calls.
 */
export const LEG_NAMES = ['instance', 'workflows', 'schema', 'connector'] as const;

/** One leg of {@link LEG_NAMES}. */
export type LegName = (typeof LEG_NAMES)[number];

/**
 * The exit code each answer ends a leg's process with.
 *
 * Three codes and not two, for the reason the package documentation
 * gives: a leg that could not read is kept apart from one that read a
 * fault. Keyed by the answer so that the code is looked up rather than
 * branched on, and `as const` so a lookup is typed as the literal it
 * answers.
 */
export const LEG_EXIT_CODES = {
  healthy: 0,
  unhealthy: 1,
  unreadable: 2,
} as const;

/** What a leg found: one key of {@link LEG_EXIT_CODES}. */
export type LegStatus = keyof typeof LEG_EXIT_CODES;

/**
 * One reading as a reader hands it over: the value it read, or why it
 * could not read one.
 *
 * A union rather than a value that may be absent, so a verdict cannot
 * be handed a reading without also being told whether the reading was
 * taken. The reason is printed as given, masked and otherwise
 * untouched, so what goes into one is the reader's decision.
 */
export type LegReading<T> =
  | { readonly outcome: 'read'; readonly value: T }
  | { readonly outcome: 'unreadable'; readonly reason: string };

/**
 * One leg's answer: what it found and the lines that say so.
 *
 * The findings carry no leg prefix and no closing verdict line; that
 * rendering is {@link reportLines}'s, so a case can read a finding
 * without also reading a format.
 */
export interface LegVerdict {
  /** Every finding, in the order a report prints them. */
  readonly findings: readonly string[];

  /** Which leg answered. */
  readonly leg: LegName;

  /** What it found. */
  readonly status: LegStatus;
}

/**
 * One workflow source, as {@link workflowsVerdict} reads it: the
 * display name it declares and the nodes that decide whether an
 * activation would arm it.
 *
 * One value rather than a list of names beside a list of workflows,
 * so a name and the nodes it is judged by cannot come apart. The name
 * is a string because `expectedNames` in `audit-workflows.ts` refuses
 * a source whose name is not one, and whatever reads the sources for
 * this module is expected to have been through that refusal.
 */
export interface SourceWorkflow extends ActivationWorkflow {
  /** The display name the source declares. */
  readonly name: string;
}

/**
 * Builds one verdict.
 *
 * @param leg - Which leg answered.
 * @param status - What it found.
 * @param findings - The lines that say so.
 * @returns The verdict.
 */
function verdictOf(
  leg: LegName,
  status: LegStatus,
  findings: readonly string[],
): LegVerdict {
  return { findings, leg, status };
}

/**
 * The status n8n's readiness route answers once the instance is
 * connected to its database, migrated and marked fully ready.
 */
const READY_STATUS = 200;

/**
 * The status the same route answers until all three of those hold.
 * `docker-compose.yml` records it, read off the image's own
 * `abstract-server.js`, where its healthcheck argues readiness over
 * `/healthz`; the success that healthcheck waits for is the 200.
 */
const NOT_READY_STATUS = 503;

/**
 * Whether the instance says it can run what it holds.
 *
 * Three answers from one status, and only two of them are the route's.
 * A 200 is ready and a 503 is up and not ready yet, which is unhealthy:
 * the instance answered and the answer was no. Any other status is
 * not an answer that route gives, so whatever sits at that address —
 * a proxy refusing the request, a server with no such route — did not
 * answer the question, and the leg is unreadable rather than
 * unhealthy. So is a request that got no reply at all, which reaches
 * here as an unreadable reading.
 *
 * @param readiness - The HTTP status `GET /healthz/readiness`
 *   answered, or why no status was read.
 * @returns The `instance` leg's verdict.
 */
export function instanceVerdict(readiness: LegReading<number>): LegVerdict {
  if (readiness.outcome === 'unreadable') {
    return verdictOf('instance', 'unreadable', [
      `readiness could not be read: ${maskControlBytes(readiness.reason)}`,
    ]);
  }

  const status = readiness.value;

  if (status === READY_STATUS) {
    return verdictOf('instance', 'healthy', [
      'readiness answered 200: connected, migrated and fully ready',
    ]);
  }

  if (status === NOT_READY_STATUS) {
    return verdictOf('instance', 'unhealthy', [
      'readiness answered 503: the instance is up and not ready, its '
      + 'database connection, its migrations or its own start not done',
    ]);
  }

  return verdictOf('instance', 'unreadable', [
    `readiness answered ${String(status)}, which is neither answer the `
    + 'readiness route gives, so whatever is at that address did not '
    + 'answer whether an instance is ready',
  ]);
}

/** How a workflow with no display name is printed. */
const NO_NAME = '<no display name>';

/** How a workflow with no id is printed. */
const NO_ID = '<no id>';

/**
 * An id as a finding prints it.
 *
 * @param id - The member as the instance answered it.
 * @returns The id, masked, or {@link NO_ID} where it is not a string.
 */
function idText(id: unknown): string {
  return typeof id === 'string'
    ? maskControlBytes(id)
    : NO_ID;
}

/**
 * One workflow as a finding names it: its name, whether the instance
 * has it armed, and its id.
 *
 * Armed is an `active` of exactly `true`, the comparison `classify`
 * makes for an armed stray, so a finding and the partition it was
 * drawn from agree about which workflows are armed.
 *
 * @param workflow - The workflow to name.
 * @returns Its label.
 */
function workflowLabel(workflow: RemoteWorkflow): string {
  const { active, id, name } = workflow;
  const called = typeof name === 'string'
    ? maskControlBytes(name)
    : NO_NAME;
  const state = active === true
    ? 'armed'
    : 'inert';

  return `${called} (${state}) id ${idText(id)}`;
}

/**
 * The trigger node types each declared name would be armed by.
 *
 * An empty list is a manual-only source, which is fine armed or not.
 * Two sources declaring one name have their triggers read together:
 * the instance holds that name either way, and a deploy refuses the
 * second source before one could land.
 *
 * @param sources - Every workflow source.
 * @returns Arming node types, keyed by display name.
 */
function armingTypesByName(
  sources: readonly SourceWorkflow[],
): ReadonlyMap<string, readonly string[]> {
  const byName = new Map<string, readonly string[]>();

  for (const source of sources) {
    const types = activatableTriggers(source).map((node) => node.type);

    byName.set(source.name, [...(byName.get(source.name) ?? []), ...types]);
  }

  return byName;
}

/**
 * Why the `workflows` leg could not read, one finding per reading
 * that failed.
 *
 * @param listing - The instance's workflows, or why they were not read.
 * @param sources - The workflow sources, or why they were not read.
 * @returns A finding per unreadable reading; empty where both were read.
 */
function unreadWorkflowFindings(
  listing: LegReading<readonly RemoteWorkflow[]>,
  sources: LegReading<readonly SourceWorkflow[]>,
): readonly string[] {
  const findings: string[] = [];

  if (sources.outcome === 'unreadable') {
    findings.push(
      `the workflow sources could not be read: ${maskControlBytes(sources.reason)}`,
    );
  }

  if (listing.outcome === 'unreadable') {
    findings.push(
      `the instance could not be listed: ${maskControlBytes(listing.reason)}`,
    );
  }

  return findings;
}

/**
 * Whether an instance holds the workflows this repository deploys,
 * once each, and armed wherever their sources would arm them.
 *
 * Unreadable where either reading failed, naming each that did, and
 * where the sources declare nothing at all. An empty expectation is
 * refused rather than read: over it every workflow sorts as a stray,
 * strays never fail, and so every instance whatever it holds would be
 * healthy — a verification that cannot fail.
 *
 * Otherwise `classify` sorts the listing against the declared names
 * and three of its readings decide:
 *
 * - every declared name the instance holds nothing under is missing;
 * - every DECLARED name it holds more than one workflow under is a
 *   duplicate, naming each id. A name two strays share is not one:
 *   `classify` reports it among its duplicates, and here it stays a
 *   pair of strays, because it is not this repository's name;
 * - every accounted-for workflow whose source `activatableTriggers`
 *   finds an arming node in, and which the instance does not have
 *   armed, is inactive. A duplicate's copies are each asked, so an
 *   inert copy beside an armed one is named by id. A manual-only
 *   source is never asked, armed or not.
 *
 * Any of the three makes the leg unhealthy. Strays are named, each
 * with whether it is armed, and change nothing; a closing line counts
 * every reading.
 *
 * @param listing - Every workflow the instance answered with, or why
 *   none was read.
 * @param sources - Every workflow source, or why none was read.
 * @returns The `workflows` leg's verdict.
 */
export function workflowsVerdict(
  listing: LegReading<readonly RemoteWorkflow[]>,
  sources: LegReading<readonly SourceWorkflow[]>,
): LegVerdict {
  if (listing.outcome === 'unreadable' || sources.outcome === 'unreadable') {
    return verdictOf('workflows', 'unreadable', unreadWorkflowFindings(listing, sources));
  }

  if (sources.value.length === 0) {
    return verdictOf('workflows', 'unreadable', [
      'the workflow sources declare no workflow, so there is nothing to '
      + 'hold the instance against, and any instance would pass',
    ]);
  }

  const expected = sources.value.map((source) => source.name);
  const declared = new Set(expected);
  const armingTypes = armingTypesByName(sources.value);
  const sorted = classify(listing.value, expected);
  const duplicate = sorted.duplicate.filter(({ name }) => declared.has(name));
  const inactive = sorted.known.filter((workflow) => {
    const types = typeof workflow.name === 'string'
      ? armingTypes.get(workflow.name) ?? []
      : [];

    return types.length > 0 && workflow.active !== true;
  });

  const findings = [
    ...sorted.missing.map(
      (name) => `missing ${maskControlBytes(name)}: the instance holds no workflow under it`,
    ),
    ...duplicate.map(
      ({ name, workflows }) => `duplicate ${maskControlBytes(name)}: `
        + `${String(workflows.length)} workflows answer to it, ids `
        + workflows.map((workflow) => idText(workflow.id)).join(', '),
    ),
    ...inactive.map(
      (workflow) => `inactive ${workflowLabel(workflow)}: its source arms it through `
        + maskControlBytes((armingTypes.get(String(workflow.name)) ?? []).join(', ')),
    ),
    ...sorted.stray.map(
      (workflow) => `stray ${workflowLabel(workflow)}: no source declares it, reported and not failed`,
    ),
    `${String(listing.value.length)} on the instance, `
    + `${String(declared.size)} declared, `
    + `${String(sorted.known.length)} accounted for, `
    + `${String(sorted.missing.length)} missing, `
    + `${String(duplicate.length)} duplicated, `
    + `${String(inactive.length)} armable and inactive, `
    + `${String(sorted.stray.length)} stray `
    + `(${String(sorted.activeStray.length)} of them armed)`,
  ];
  const faults = sorted.missing.length + duplicate.length + inactive.length;

  return verdictOf(
    'workflows',
    faults > 0
      ? 'unhealthy'
      : 'healthy',
    findings,
  );
}

/**
 * Whether a database's migration ledger names the journal's migrations
 * in full, once each, in journal order.
 *
 * Every tag each of the comparison's three lists holds is named, under
 * its own reading, and any of them makes the leg unhealthy. The lists
 * decide and {@link MigrationComparison.matchesJournal} is not read: a
 * verdict decided on the flag could print a pending tag under a
 * healthy answer if the two ever disagreed, and a verdict decided on
 * the lists cannot. `compareMigrationTags` keeps them in agreement, so
 * the difference only shows on a comparison built some other way.
 *
 * A pending tag is not said to be one `db:migrate` away, because
 * `MigrationComparison.pending` records that the migrator passes over a
 * pending tag stamped below the ledger's newest row.
 *
 * @param comparison - The ledger held against the journal, or why the
 *   ledger was not read.
 * @returns The `schema` leg's verdict.
 */
export function schemaVerdict(
  comparison: LegReading<MigrationComparison>,
): LegVerdict {
  if (comparison.outcome === 'unreadable') {
    return verdictOf('schema', 'unreadable', [
      `the migration ledger could not be read: ${maskControlBytes(comparison.reason)}`,
    ]);
  }

  const { outOfOrder, pending, unrecognized } = comparison.value;
  const findings = [
    ...pending.map(
      (tag) => `pending ${maskControlBytes(tag)}: the journal names it and the ledger holds no row for it`,
    ),
    ...unrecognized.map(
      (tag) => `unrecognized ${maskControlBytes(tag)}: the ledger holds a row the journal does not name`,
    ),
    ...outOfOrder.map(
      (tag) => `out of order ${maskControlBytes(tag)}: the ledger holds it behind a `
        + 'migration the journal places after it, or holds it twice',
    ),
  ];

  if (findings.length === 0) {
    return verdictOf('schema', 'healthy', [
      'the ledger names every migration the journal does, once each and in journal order',
    ]);
  }

  return verdictOf('schema', 'unhealthy', [
    ...findings,
    `${String(pending.length)} pending, ${String(unrecognized.length)} `
    + `unrecognized, ${String(outOfOrder.length)} out of order`,
  ]);
}

/**
 * What the `connector` leg did not check, printed on every one of its
 * verdicts.
 *
 * The model server is dialled by the n8n container, so a probe of the
 * row's endpoint from the host running a verification would be a
 * reading from the wrong network position: `host.docker.internal`
 * names one thing inside that container and another, or nothing, out
 * here. The leg reads the row and says it stopped there.
 */
export const CONNECTOR_REACH_LIMIT
  = 'the model server is dialled from inside the n8n container, so this '
  + 'leg read the connector row and reached no model server from this host';

/**
 * Whether a pass would find a model to call.
 *
 * Unhealthy where the projection selected no row, and where the row it
 * selected projects a null endpoint: `Select Model Connector` answers
 * a null endpoint in both cases, and every model-reaching pass refuses
 * on it before it calls. A null model is healthy, the pipeline reading
 * it as an ordinary state rather than a fault, as `LlmSettings` in
 * `llm-connector.ts` sets out.
 *
 * The row is named by id and name and its values are not printed:
 * whether an endpoint and a model are projected decides the verdict,
 * and what they are does not. An endpoint is an address inside
 * someone else's network, and a verification's lines are quoted
 * wherever the verification is recorded. `llm-connector.ts` prints
 * both in its own report, from a command that writes a row wherever
 * it finds none, which makes it no reader for a deployment somebody
 * else owns.
 *
 * {@link CONNECTOR_REACH_LIMIT} closes every verdict, unreadable
 * included, because what the leg does not reach is the same whether
 * or not it read the row.
 *
 * @param projection - What `Select Model Connector` would read, or
 *   why the connectors were not read.
 * @returns The `connector` leg's verdict.
 */
export function connectorVerdict(
  projection: LegReading<ModelConnectorProjection>,
): LegVerdict {
  if (projection.outcome === 'unreadable') {
    return verdictOf('connector', 'unreadable', [
      `the connectors could not be read: ${maskControlBytes(projection.reason)}`,
      CONNECTOR_REACH_LIMIT,
    ]);
  }

  const { connectorId, connectorName, endpoint, model } = projection.value;

  if (connectorId === null) {
    return verdictOf('connector', 'unhealthy', [
      'no connector of kind llm, so every model-reaching pass refuses before it calls',
      CONNECTOR_REACH_LIMIT,
    ]);
  }

  const called = connectorName === null
    ? NO_NAME
    : maskControlBytes(connectorName);
  const row = `connector ${String(connectorId)} named ${called}`;

  if (endpoint === null) {
    return verdictOf('connector', 'unhealthy', [
      `${row} projects no endpoint, so every model-reaching pass refuses before it calls`,
      CONNECTOR_REACH_LIMIT,
    ]);
  }

  return verdictOf('connector', 'healthy', [
    model === null
      ? `${row} projects an endpoint and no model name, which a pass reads as ordinary`
      : `${row} projects an endpoint and a model name`,
    CONNECTOR_REACH_LIMIT,
  ]);
}

/**
 * The lines a leg prints: each finding under the leg's name, then one
 * line naming the answer and the exit code it ends with.
 *
 * The leg's name leads every line so that four legs printed one after
 * another can be told apart line by line, and the last line is the
 * verdict a caller quotes.
 *
 * @param verdict - The leg's verdict.
 * @returns Every line, in print order, unterminated.
 */
export function reportLines(verdict: LegVerdict): readonly string[] {
  const { findings, leg, status } = verdict;

  return [
    ...findings.map((finding) => `${leg}: ${finding}`),
    `${leg}: ${status}, exit ${String(LEG_EXIT_CODES[status])}`,
  ];
}

/**
 * The exit code a leg's process ends with.
 *
 * @param verdict - The leg's verdict.
 * @returns 0 healthy, 1 unhealthy, 2 unreadable.
 */
export function legExitCode(verdict: LegVerdict): (typeof LEG_EXIT_CODES)[LegStatus] {
  return LEG_EXIT_CODES[verdict.status];
}

/**
 * The exit code a whole verification ends with, given each leg's.
 *
 * 0 only where there was at least one leg and every leg answered 0,
 * and 1 otherwise. An unreadable leg does not carry its 2 up: the
 * aggregate says whether the deployment verified, and the per-leg
 * lines say which leg did not and why. Nor does a code no leg gives —
 * a process killed by a signal, a runtime that was not found — which
 * is a leg that did not answer 0.
 *
 * No legs at all answers 1, although every one of none answered 0: a
 * verification that ran nothing has verified nothing.
 *
 * A setting left unset before any leg runs is not one of these codes.
 * That refusal is the calling script's to make, and to exit 2 on,
 * before there are leg codes to add up.
 *
 * @param legCodes - The exit code each leg's process ended with.
 * @returns 0 when every leg answered 0, and 1 otherwise.
 */
export function aggregateExitCode(legCodes: readonly number[]): 0 | 1 {
  return legCodes.length > 0 && legCodes.every((code) => code === 0)
    ? 0
    : 1;
}
