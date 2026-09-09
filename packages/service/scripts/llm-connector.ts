/**
 * @packageDocumentation
 * The one `connectors` row of kind `llm` a deployment carries: the
 * command that writes it when there is none, and the read that says
 * what a pass would make of whatever is there.
 *
 * THE GAP THIS FILLS. `connectors` is not one of the five files
 * `scripts/seed.ts` applies and there is no `data/connectors.json`,
 * so a freshly seeded deployment reaches the model nodes of
 * `ar-digest`, `ar-ingest` and `ar-research` with nothing to call.
 * Those nodes take their address and their model name off a row —
 * as data, through each workflow's `Select Model Connector` node —
 * so until one exists every model-reaching pass refuses on a null
 * endpoint. This is the command that writes it.
 *
 * WHY IT IS NOT A SIXTH SEED FILE. `data/` is the seed authority
 * for domain CONTENT: a domain, its personas, its categories, its
 * terms and its topics, five files whose rows mean the same thing
 * on every machine that applies them. A connector is neither of
 * those things. It is deployment-level rather than domain-scoped —
 * nothing on a domain row names one — and an endpoint is a
 * per-machine address, so a tracked file naming one would be right
 * on the machine that wrote it and wrong on the next. The rule the
 * general case would break is sharper than this row makes it look:
 * a config for another kind DOES carry a credential, which
 * `SECRET_CONFIG_KEYS` in `src/connectors/secrets.ts` already
 * enumerates, so a `data/connectors.json` would put a secret in git
 * as soon as the second kind arrived. What this row holds is not
 * one — the endpoint and the model name are addresses, and the key
 * the passes authenticate with is the `ar-model` n8n credential,
 * built by `scripts/n8n-credentials.ts` and never written here.
 *
 * WHY IT WRITES THROUGH THE SERVICE. `createConnector` and
 * `listConnectors` in `src/connectors/service.ts` are what this
 * calls, so the kind enum, the one-character name floor, the empty
 * config default and the conflict translation are the rules the
 * HTTP surface already holds a request to. Raw SQL here would be a
 * second set of rules over one table, and the two would agree only
 * until somebody changed either. The store behind the service is
 * the seam rather than a database: a deployment hands over
 * `createDbConnectorStore`, and a case hands over
 * `tests/helpers/memory-research-store.ts`, which is what lets
 * every decision below be driven with no server anywhere in the
 * run.
 *
 * IDEMPOTENCY IS KEYED ON THE PIPELINE'S OWN SELECTION RULE, which
 * is why it is keyed on the KIND and not on the name.
 * `Select Model Connector` reads
 * `WHERE c.kind = 'llm' ORDER BY c.id LIMIT 1`, so the row a pass
 * calls is the OLDEST of its kind whatever it is called. A rerun
 * keyed on {@link LLM_CONNECTOR_NAME} would find a differently
 * named row absent and write a second one — younger, and therefore
 * a row the pipeline would never read. So the question a rerun asks
 * is whether the deployment carries ANY `llm` connector, and the
 * answer when it does is to leave it alone and report it.
 *
 * THE COMMAND OWES A READING AS WELL AS A WRITE.
 * {@link projectModelConnector} is a pure re-implementation of that
 * node's projection over rows already in hand, so a run reports
 * what the pipeline would see without opening n8n and without
 * reaching a database twice for it. What it re-implements and what
 * it deliberately leaves out are set out at the function itself.
 *
 * THE ADDRESS IS THE CONTAINER'S VIEW AND NOT THIS MACHINE'S. The
 * socket is opened by the n8n container, so a model server
 * listening on the host is reached at `host.docker.internal`, which
 * `docker-compose.yml` carries a `host-gateway` entry for. Nothing
 * here can check that — no run opens a socket to the model server,
 * and a row naming an address nothing answers at is written exactly
 * as one naming a working one is. What a wrong address costs is a
 * pass that fails at its first call rather than a refusal here.
 *
 * WHAT THE MASK DOES TO THE READ, AND WHY IT DOES NOTHING TODAY.
 * `listConnectors` masks every member of `SECRET_CONFIG_KEYS` on
 * the way out, and neither `endpoint` nor `model` is on that
 * roster, so the projection below reads the stored values. That is
 * a property of a roster this module does not own, which is why a
 * case holds the two member names against it — and the dependency
 * is not a narrow one. Measured by adding `endpoint` to that
 * roster: seven of this module's cases redden, the two written
 * about the mask and five more that only ever meant to read an
 * address back through the service.
 */
import type {
  ConnectorPage,
  ConnectorServiceStore,
} from '../src/connectors/service.js';
import type { ConnectorRecord } from '../src/connectors/store.js';
import type { ConnectorKind } from '../src/db/schema/values.js';

import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { config } from '../src/config.js';
import { createDbConnectorStore } from '../src/connectors/db-store.js';
import {
  createConnector,
  listConnectors,
} from '../src/connectors/service.js';
import * as schema from '../src/db/schema.js';

/**
 * The kind every read and the one write below is scoped to.
 *
 * Annotated with {@link ConnectorKind} rather than left to
 * inference, so the literal is held against `CONNECTOR_KINDS` in
 * `src/db/schema/values.ts` by `check-types`. Without the
 * annotation the literal reaches `createConnector`'s body as
 * `unknown` and nothing refuses it until the enum does, at run
 * time. Measured, dropping the annotation and misspelling the kind:
 * `check-types` exits 0 and the cases redden — so the annotation
 * moves the report from a suite to a type checker rather than
 * inventing one.
 *
 * It is also the literal the workflows spell in their own `WHERE`
 * clause. Neither side can read the other — one is SQL inside a
 * node parameter — so the two agree by transcription, and the case
 * that holds them together reads the statement out of the workflow
 * sources rather than trusting this line.
 */
export const LLM_CONNECTOR_KIND: ConnectorKind = 'llm';

/**
 * The name the created row carries.
 *
 * A label and never a key. Nothing selects by it: the pipeline
 * takes the oldest row of the kind, and this module asks whether
 * any exists. What the name is for is the operator reading a list
 * and the `connector_name` the projection carries down a canvas, so
 * it says which row this is rather than which service it fronts —
 * the endpoint says that, and it differs per machine.
 *
 * `connectors_kind_name_unique` makes the pair the natural key, so
 * a second run against a deployment that somehow lost its row and
 * kept another of this name would be refused as a conflict rather
 * than writing a duplicate. That branch is unreachable from here —
 * a row of any name stops the write — and it is the database's
 * guard rather than this module's.
 */
export const LLM_CONNECTOR_NAME = 'default';

/**
 * The member of a connector's `config` the model nodes read the
 * address off, spelled here exactly as the SQL spells it.
 *
 * Read twice on purpose: the write below puts the endpoint under
 * this name and {@link projectModelConnector} reads it back from
 * the same constant, so a row this command wrote and a row this
 * command reports on cannot disagree about where the value sits.
 * What holds the constant to the pipeline is the workflow sources,
 * which spell it in `c.config ->> 'endpoint'`.
 */
const ENDPOINT_MEMBER = 'endpoint';

/** The same, for the model name: `c.config ->> 'model'`. */
const MODEL_MEMBER = 'model';

/**
 * An environment as this module reads one.
 *
 * The same shape `process.env` has and the same one
 * `scripts/n8n-credentials.ts` takes, which is what lets a case
 * hand over a literal object and get the run an operator would get.
 */
export type LlmEnv = Readonly<Record<string, string | undefined>>;

/**
 * The environment entries the created row is built from, and the
 * only place either name is spelled.
 *
 * Both are declared in `src/config.ts` and neither is read through
 * it, which is the split `scripts/n8n-credentials.ts` already
 * makes: declaring a name is that schema's job, and resolving one
 * for a command is the command's. The values here travel into a
 * ROW rather than into anything this process does, so a boot has no
 * reason to hold an opinion about them — which is why both entries
 * there are optional with no floor, and why the refusal for an
 * absent endpoint is {@link UnsetModelEndpointError} here rather
 * than a parse failure at import.
 *
 * `DATABASE_URL` is NOT among them. It says where to write, not
 * what to write, and it is read through `src/config.ts` at the
 * connection below exactly as `scripts/seed.ts` reads it — one
 * setting resolved one way by the command and by the service.
 *
 * Keyed by the member of {@link LlmSettings} each answers for, so
 * the two sit side by side and a rename cannot leave a resolved
 * member reading the wrong name.
 */
export const LLM_SETTING_NAMES = {
  /** Read for `config.endpoint`; required. */
  endpoint: 'AR_LLM_ENDPOINT',

  /** Read for `config.model`; optional. */
  model: 'AR_LLM_MODEL',
} as const;

/**
 * The settings a row is built from, resolved.
 *
 * THE TWO ARE NOT REQUIRED ALIKE, and the asymmetry is the
 * pipeline's rather than a convenience. `Select Model Connector`
 * says both halves of it in its own comments: a null endpoint means
 * there is nowhere to reach and the node below it refuses by name,
 * while a null model is an ordinary state — a gateway that routes,
 * or a runtime serving whatever it was started with, takes no model
 * name, and `llm_calls.model` is nullable for exactly that. So an
 * unset endpoint is a refusal here and an unset model is a row
 * carrying no `model` member.
 */
export interface LlmSettings {
  /** Whatever `AR_LLM_ENDPOINT` was set to. */
  readonly endpoint: string;

  /**
   * Whatever `AR_LLM_MODEL` was set to, or undefined where nothing
   * was set. Undefined rather than an empty string, because that is
   * what leaves the member OFF the config: an empty string projects
   * as null anyway, so writing one would put a value in the column
   * that every reader takes for an absence. The rest of that
   * argument is at {@link llmConnectorConfig}.
   */
  readonly model: string | undefined;
}

/**
 * Whether a setting was answered for at all.
 *
 * Absent and set-to-blank are one answer, which is the reading the
 * other setting-resolving modules here already give — `isSet` in
 * `deploy-external.ts` and in `n8n-credentials.ts`, `resolveEnvVar`
 * in `workflow-markers.ts`. A `.env` line whose value has been
 * deleted is a setting taken back out of the file rather than one
 * set to the empty string.
 *
 * THE TRIM IS THE TEST AND NEVER THE ANSWER, and here that matters
 * more than usual, because {@link projectModelConnector} does NOT
 * trim. `nullif(..., '')` in the SQL takes the empty string for an
 * absence and takes a single space for a value, so a stored
 * endpoint of one space is an address as far as a pass is
 * concerned. This predicate refuses to WRITE one; it does not
 * pretend a row carrying one is empty.
 *
 * @param value - The setting as an environment answered for it.
 * @returns Whether it is present and not blank.
 */
function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * Thrown when a row would have to be written and nothing names an
 * endpoint to write into it.
 *
 * ONE SETTING AND NOT A LIST, unlike `UnsetCredentialSettingError`
 * in `scripts/n8n-credentials.ts`, which names every setting that
 * went unanswered. There is only one required setting here: the
 * model name is optional by the pipeline's own reading, so a run
 * with an endpoint and no model is a complete configuration rather
 * than a half-finished one.
 *
 * It carries nothing that came from an environment. The name is
 * this module's own ({@link LLM_SETTING_NAMES}) and no value is
 * held, so there is no route by which a configured address reaches
 * the message, the stack, or a `JSON.stringify` over the error.
 * That matters less here than on a credential — an endpoint is not
 * a secret — and the shape is the same one for the same reason: a
 * refusal is about the configuration and not about its contents.
 */
export class UnsetModelEndpointError extends Error {
  /** The name of the setting nothing was configured for. */
  readonly setting: string;

  /**
   * @param setting - The name that went unanswered, which is always
   *   {@link LLM_SETTING_NAMES.endpoint} and is passed rather than
   *   read so the message and the field come from one value.
   */
  constructor(setting: string) {
    super(
      `${setting} is not set, so no connector was created and the ` +
      'deployment still has no model to call. It is the base URL ' +
      'the model-reaching workflows dial, and they dial it from ' +
      'INSIDE the n8n container: a server listening on this ' +
      'machine is reached at `host.docker.internal` and never at ' +
      '`localhost`, which inside that container is n8n talking to ' +
      'itself. Set it in the untracked environment, in `.env` or ' +
      'in the launching shell. A value that is present but blank ' +
      'is read here as unset, so a line with nothing after the ' +
      '`=` is this. A deployment that already carries a connector ' +
      'of kind llm never reaches this refusal: the setting is read ' +
      'only where a row has to be written.',
    );
    this.name = this.constructor.name;
    this.setting = setting;
  }
}

/**
 * Refuse a write that has no endpoint configured, and hand back the
 * settings it cleared.
 *
 * It answers {@link LlmSettings} rather than `void` for the reason
 * `resolveCredentialSettings` does: this is the only place one is
 * made, so a config built on an unresolved setting is not a value
 * this module can produce.
 *
 * @param env - The environment to read the two settings out of.
 * @returns The endpoint, and the model name where one was set.
 * @throws UnsetModelEndpointError When the endpoint is absent or
 *   blank.
 */
export function resolveLlmSettings(env: LlmEnv): LlmSettings {
  const endpoint = env[LLM_SETTING_NAMES.endpoint];
  const model = env[LLM_SETTING_NAMES.model];

  if (!isSet(endpoint)) {
    throw new UnsetModelEndpointError(LLM_SETTING_NAMES.endpoint);
  }

  return {
    endpoint,
    model: isSet(model)
      ? model
      : undefined,
  };
}

/**
 * The `config` document the created row carries.
 *
 * Two members at most, and where nothing named a model the member
 * is OMITTED rather than written as undefined or as a blank.
 *
 * Not writing a BLANK is the load-bearing half. An empty string is
 * a value in the column that {@link configText} reads as an
 * absence, so the row would say something no reader can see, and
 * `connectors.config` has no shape annotation for anything else to
 * catch it with. The projection reads absent and empty alike, so
 * what the omission buys is an honest row rather than a different
 * answer downstream.
 *
 * Not writing UNDEFINED is the smaller half, and measured rather
 * than assumed: both implementations of this port drop such a key
 * anyway — drizzle serializes the column and
 * `tests/helpers/memory-research-store.ts` copies a stored document
 * through a JSON round trip, and a config carrying
 * `model: undefined` comes back with `endpoint` alone from either.
 * So the row is the same either way and the reason to build the
 * document without the key is that then the document handed over
 * is the document stored, with no serialisation step in between
 * that a port promises nothing about.
 *
 * @param settings - The resolved settings.
 * @returns The document, with `endpoint` always and `model` only
 *   where one was configured.
 */
function llmConnectorConfig(
  settings: LlmSettings,
): Readonly<Record<string, string>> {
  if (settings.model === undefined) {
    return { [ENDPOINT_MEMBER]: settings.endpoint };
  }

  return {
    [ENDPOINT_MEMBER]: settings.endpoint,
    [MODEL_MEMBER]: settings.model,
  };
}

/**
 * What `Select Model Connector` answers, as this module
 * re-implements it.
 *
 * The member names are the SQL's own column aliases in camel case,
 * so a report built from this and a node's output on a canvas can
 * be read against each other line by line.
 */
export interface ModelConnectorProjection {
  /** `connector_id`: the selected row's id, or null when none. */
  readonly connectorId: number | null;

  /** `connector_name`: its name, or null when none. */
  readonly connectorName: string | null;

  /**
   * `endpoint`: the address a pass would call, or null. Null is
   * what the node below refuses on by name, and it is the answer
   * for a deployment with no `llm` row at all as much as for one
   * whose row names no address.
   */
  readonly endpoint: string | null;

  /**
   * `model`: the model name a pass would ask for, or null. Null is
   * an ordinary state rather than a fault — see {@link LlmSettings}
   * for whose reading that is.
   */
  readonly model: string | null;
}

/** What the projection answers where no `llm` row exists. */
const NOTHING_SELECTED: ModelConnectorProjection = {
  connectorId: null,
  connectorName: null,
  endpoint: null,
  model: null,
};

/**
 * One member of a stored config, read the way the SQL reads it.
 *
 * `jsonb_typeof(c.config -> '<member>') = 'string'` and
 * `nullif(..., '')` are one rule between them, and it distinguishes
 * four cases where a `??` would distinguish two: a member that is
 * absent, one whose value is not a string, one that is the empty
 * string, and one that is text. The first three are null and only
 * the fourth is a value.
 *
 * NOTHING IS TRIMMED and nothing is coerced. A number is not text
 * whatever it would render as, and an endpoint of one space is a
 * value — both of those are the SQL's answers rather than choices
 * made here, and a trim added for tidiness would make this function
 * disagree with the node it exists to predict.
 *
 * A config that is not an object at all — the column carries no
 * shape annotation and nothing validates a row written by hand —
 * has no member to read under either name, so both project null.
 *
 * @param storedConfig - The `config` column as the port answered
 *   it, which is `unknown` because the column says nothing about
 *   its shape.
 * @param member - The member to read.
 * @returns The text, or null on any of the three absences.
 */
function configText(storedConfig: unknown, member: string): string | null {
  if (typeof storedConfig !== 'object' || storedConfig === null) {
    return null;
  }

  const value = (storedConfig as Readonly<Record<string, unknown>>)[member];

  if (typeof value !== 'string' || value === '') {
    return null;
  }

  return value;
}

/**
 * What the pipeline would read, given the rows a deployment holds.
 *
 * A PURE RE-IMPLEMENTATION OF ONE NODE, and the whole of what it
 * re-implements is worth stating, because the point of the function
 * is that an operator can answer the definition-of-done question —
 * does this deployment project a non-null endpoint and model —
 * without opening n8n. The node is a `n8n-nodes-base.postgres` node
 * present in `ar-digest`, `ar-ingest` and `ar-research`, and its
 * statement is a CTE selecting `WHERE c.kind = 'llm' ORDER BY c.id
 * LIMIT 1` followed by an outer `SELECT` of scalar subqueries over
 * it. Three properties of that shape are reproduced here:
 *
 * The SELECTION IS BY KIND, oldest first. So the filter below is
 * the CTE's `WHERE` and the sort is its `ORDER BY`, and handing
 * this function every connector a deployment holds answers exactly
 * what handing it the `llm` ones alone answers. Ordering by id
 * rather than taking the first row is not a formality: the port
 * orders a list by `kind` then `name`, so the FIRST row of a
 * kind-filtered page is the alphabetically first name and the
 * pipeline's row is the oldest id, and the two are the same row
 * only by coincidence.
 *
 * The OUTER SELECT NAMES NO `FROM`, so the node answers exactly one
 * item however many rows the table holds — a deployment with no
 * `llm` row at all gets one item carrying nulls rather than no item
 * at all. {@link NOTHING_SELECTED} is that item, which is why this
 * function has no empty answer and no throw.
 *
 * EACH CONFIG MEMBER IS READ AS TEXT ONLY WHERE IT IS TEXT, which
 * is {@link configText}'s four cases.
 *
 * WHAT IT DOES NOT REPRODUCE, deliberately: the statement's first
 * column, `$1::bigint AS run_id`. That is a parameter the node is
 * handed off the item it ran against — the ledger row below it is
 * charged to a run — rather than anything read out of a row, so
 * there is nothing here to project it from and nothing about a
 * connector it would say.
 *
 * The array a caller handed over is not touched. `filter` answers
 * a fresh array and `sort` runs on that one, which is what makes
 * the sort safe on a `readonly` input — remove the filter and the
 * same expression reorders the caller's rows in place.
 *
 * @param rows - Connectors as a store answered them, of any kinds.
 *   Masked or not: `listConnectors` masks every member of
 *   `SECRET_CONFIG_KEYS` and neither member read here is on that
 *   roster, so a masked page and a raw one project the same.
 * @returns One projection, always.
 */
export function projectModelConnector(
  rows: readonly ConnectorRecord[],
): ModelConnectorProjection {
  const [selected] = rows
    .filter((row) => row.kind === LLM_CONNECTOR_KIND)
    .sort((left, right) => left.id - right.id);

  if (selected === undefined) {
    return NOTHING_SELECTED;
  }

  return {
    connectorId: selected.id,
    connectorName: selected.name,
    endpoint: configText(selected.config, ENDPOINT_MEMBER),
    model: configText(selected.config, MODEL_MEMBER),
  };
}

/** What one {@link ensureLlmConnector} pass did and what it found. */
export interface LlmConnectorOutcome {
  /**
   * Whether THIS call wrote the row. False says the deployment
   * already carried one, which is the ordinary answer on every run
   * after the first.
   */
  readonly created: boolean;

  /**
   * How many connectors of kind `llm` the deployment carries after
   * the pass. One on a bootstrapped deployment; more only where
   * somebody added another, which the pipeline ignores.
   */
  readonly total: number;

  /**
   * What `Select Model Connector` would read, taken AFTER the pass
   * whichever branch ran — so the report describes the table rather
   * than what this module thinks it wrote.
   */
  readonly selected: ModelConnectorProjection;
}

/**
 * How many rows one read of the `llm` collection asks for.
 *
 * A window rather than everything, because the service read takes
 * one; the size is a guess at the largest number of model
 * connectors a deployment would plausibly carry, and being wrong
 * about it costs a second read rather than a wrong answer —
 * {@link readLlmConnectors} widens to the reported total.
 */
const LLM_READ_LIMIT = 50;

/**
 * Every `llm` connector the deployment holds, and how many there
 * are.
 *
 * TWO READS AT MOST, AND THE SECOND IS RARE. `ConnectorPage`
 * carries the size of the whole collection beside the page, so a
 * first read of {@link LLM_READ_LIMIT} rows says both what the
 * first fifty are and whether there are more; only the second case
 * costs another round trip. Reading the whole collection is what
 * {@link projectModelConnector} needs — the pipeline's row is the
 * oldest id, which a page ordered by name can leave off the end.
 *
 * The widening read is not racy in the way it looks. Ids come off a
 * `bigserial`, so a row inserted between the two reads is younger
 * than every row the first read saw and cannot be the one the
 * pipeline selects. Only a DELETE of the oldest row would move the
 * answer, and nothing in a bootstrap deletes a connector.
 *
 * @param store - Where to read from.
 * @returns The rows and the collection's size.
 */
async function readLlmConnectors(
  store: ConnectorServiceStore,
): Promise<ConnectorPage> {
  const filter = { kind: LLM_CONNECTOR_KIND };
  const first = await listConnectors(store, filter, {
    limit: LLM_READ_LIMIT,
    offset: 0,
  });

  if (first.total <= first.rows.length) {
    return first;
  }

  return listConnectors(store, filter, { limit: first.total, offset: 0 });
}

/**
 * Give the deployment a model to call, if it has none, and report
 * what a pass would read either way.
 *
 * The read comes FIRST and decides everything. A deployment
 * carrying any connector of kind `llm` is one this command leaves
 * alone: no row is written, and — the part worth saying separately
 * — no setting is read, so an operator whose `.env` never named an
 * endpoint still gets a report rather than a refusal once the row
 * exists. The refusal belongs to the branch that writes.
 *
 * The collection is read AGAIN after a write rather than the
 * created record being projected. It costs one round trip and buys
 * a report about the table: `createConnector` answers the stored
 * row masked, and projecting that would be reporting on what this
 * command believes it wrote where re-reading reports on what is
 * there.
 *
 * @param store - The connectors surface to read and write through.
 *   A deployment's is `createDbConnectorStore`'s; a case's is
 *   `createMemoryResearchStore`'s.
 * @param env - Where the endpoint and the model name are read from,
 *   on the branch that writes.
 * @returns What the pass did and what a pass would now read.
 * @throws UnsetModelEndpointError When a row has to be written and
 *   `AR_LLM_ENDPOINT` is absent or blank. Nothing has been written
 *   when it is thrown: the settings are resolved before the create.
 * @throws ConflictError When the write loses a race with another
 *   writer creating {@link LLM_CONNECTOR_NAME}, which is
 *   `connectors_kind_name_unique` refusing the second of two and
 *   not a state this command can reach on its own.
 */
export async function ensureLlmConnector(
  store: ConnectorServiceStore,
  env: LlmEnv,
): Promise<LlmConnectorOutcome> {
  const before = await readLlmConnectors(store);

  if (before.total > 0) {
    return {
      created: false,
      selected: projectModelConnector(before.rows),
      total: before.total,
    };
  }

  const settings = resolveLlmSettings(env);

  await createConnector(store, {
    kind: LLM_CONNECTOR_KIND,
    name: LLM_CONNECTOR_NAME,
    config: llmConnectorConfig(settings),
  });

  const after = await readLlmConnectors(store);

  return {
    created: true,
    selected: projectModelConnector(after.rows),
    total: after.total,
  };
}

/**
 * The columns `Select Model Connector` projects out of a row, named
 * as its own `AS` aliases name them and in the order it selects
 * them.
 *
 * FOUR OF THE STATEMENT'S FIVE. `run_id` is left off for
 * {@link projectModelConnector}'s reason — it is a parameter the
 * node was handed rather than anything read out of a connector — so
 * a case holding this roster against the aliases in the workflow
 * sources holds it against those aliases MINUS that one, which is
 * the only difference between the two lists and is asserted rather
 * than assumed.
 *
 * Exported because it is the tie between three things that cannot
 * see each other: the SQL inside a node parameter, the member names
 * of {@link ModelConnectorProjection}, and the labels
 * {@link formatLlmConnectorReport} prints. A report an operator
 * reads beside a canvas is only useful while all three agree.
 */
export const MODEL_PROJECTION_COLUMNS = [
  'connector_id',
  'connector_name',
  'endpoint',
  'model',
] as const;

/** One column of {@link MODEL_PROJECTION_COLUMNS}. */
type ModelProjectionColumn = (typeof MODEL_PROJECTION_COLUMNS)[number];

/** What a null projects as, spelled the way SQL spells it. */
const NULL_TEXT = 'null';

/** The heading over the projection block. */
const PROJECTION_HEADING = 'Select Model Connector would read:';

/** The verdict where an address was projected. */
const REACHABLE
  = 'The endpoint is set, so a pass has somewhere to call.';

/** The verdict where none was. */
const UNREACHABLE
  = 'The endpoint is null, so every model-reaching pass will refuse '
  + 'before it calls: there is nowhere to reach.';

/**
 * One projected value as a line of the report reads it.
 *
 * Text is QUOTED and null is bare, which is the one place this
 * report deliberately does not look like a node's output. An
 * endpoint of one space is a value to the SQL and to
 * {@link configText}, and an unquoted report would print it as
 * nothing at all — the one reading an operator most needs to be
 * able to tell from a null.
 *
 * @param value - The projected member.
 * @returns Its rendering.
 */
function projectedText(value: number | string | null): string {
  if (value === null) {
    return NULL_TEXT;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return `'${value}'`;
}

/**
 * What a run prints.
 *
 * A function over the outcome rather than a series of `console.log`
 * calls inside the pass, for the reason `formatSeedSummary` in
 * `scripts/seed.ts` is one: what a command SAYS is then a value a
 * case can read, and the command is left with one write.
 *
 * The projection block is labelled with the SQL's own column names
 * ({@link MODEL_PROJECTION_COLUMNS}) so an operator can hold this
 * report against a node's output on a canvas without translating
 * between them, and the labels are padded to the longest of them
 * rather than to a number written here. The values are keyed by
 * column rather than listed beside the labels, so a column added to
 * that roster is a `check-types` error here and not a line printed
 * against the wrong name.
 *
 * @param outcome - What the pass did.
 * @returns The whole report, newline-separated and unterminated.
 */
export function formatLlmConnectorReport(
  outcome: LlmConnectorOutcome,
): string {
  const width = Math.max(
    ...MODEL_PROJECTION_COLUMNS.map((column) => column.length),
  );
  const projected: Readonly<
    Record<ModelProjectionColumn, number | string | null>
  > = {
    connector_id: outcome.selected.connectorId,
    connector_name: outcome.selected.connectorName,
    endpoint: outcome.selected.endpoint,
    model: outcome.selected.model,
  };

  return [
    outcome.created
      ? `created one connector of kind ${LLM_CONNECTOR_KIND} named `
        + `'${LLM_CONNECTOR_NAME}'; the deployment now carries `
        + `${outcome.total}.`
      : `created nothing; the deployment already carries ${outcome.total} `
        + `of kind ${LLM_CONNECTOR_KIND}.`,
    PROJECTION_HEADING,
    ...MODEL_PROJECTION_COLUMNS.map(
      (column) => `  ${column.padEnd(width)}  `
        + projectedText(projected[column]),
    ),
    outcome.selected.endpoint === null
      ? UNREACHABLE
      : REACHABLE,
  ].join('\n');
}

/**
 * A connectors surface over a real database, and the way to let go
 * of it.
 *
 * The seam is the STORE rather than the {@link Db} behind it, which
 * is what parts this from `SeedConnection` in `scripts/seed.ts`:
 * that command writes five concerns through a transaction and needs
 * the database itself, where everything here goes through one port.
 * So a case hands over `createMemoryResearchStore()` and a `close`
 * that resolves, and drives the command with no server.
 */
export interface LlmConnection {
  /** What the pass reads and writes through. */
  readonly store: ConnectorServiceStore;

  /** Releases it, whether or not the pass succeeded. */
  close(): Promise<void>;
}

/**
 * A pool over the database `DATABASE_URL` names, with the drizzle
 * connectors store over it.
 *
 * The URL is read through `src/config.ts` rather than off
 * `process.env`, so this command and the service resolve one
 * setting the same way and a malformed environment is refused once,
 * at import, by the schema that owns it — `scripts/seed.ts`'s
 * argument for the same connection, and the reason the two settings
 * this module reads off an environment are read differently: those
 * travel into a row, and this one says which database the row goes
 * into.
 *
 * The pool is small because a pass is a handful of statements on
 * one connection, and the store takes the database as a thunk
 * because `ConnectorStore`'s drizzle implementation does — the
 * service passes one that resolves after its dependency has
 * started, and here it is resolved already.
 *
 * @returns The store and the way to release the pool behind it.
 */
function openLlmConnection(): LlmConnection {
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 2 });
  const db = drizzle({ client: pool, schema });

  return {
    store: createDbConnectorStore(() => db),
    close: () => pool.end(),
  };
}

/**
 * One pass end to end: read, write if there is nothing there,
 * report what a pipeline pass would read.
 *
 * The connection is closed in a `finally`, so a pass that threw
 * releases it too — a pool nobody ended keeps the process alive,
 * and a command that printed its refusal and then hung reads as a
 * worse failure than the one it reported.
 *
 * @param connect - How to reach a connectors surface. Defaults to a
 *   pool over `DATABASE_URL`; a caller handing over its own is what
 *   makes this drivable with no server.
 * @param env - Where the settings are read from. Defaults to the
 *   process environment, which under bun carries `.env` as read
 *   from the working directory.
 * @returns What the pass did.
 * @throws UnsetModelEndpointError When a row has to be written and
 *   no endpoint is configured. The connection is opened before the
 *   settings are read — the read that decides comes first — so this
 *   refusal is one the pass reached a database to discover.
 */
export async function runLlmConnectorCli(
  connect: () => LlmConnection = openLlmConnection,
  env: LlmEnv = process.env,
): Promise<LlmConnectorOutcome> {
  const connection = connect();

  try {
    const outcome = await ensureLlmConnector(connection.store, env);

    console.log(formatLlmConnectorReport(outcome));

    return outcome;
  } finally {
    await connection.close();
  }
}

/**
 * Whether this file is what the process was started with, rather
 * than something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all;
 * `scripts/build-workflows.ts` carries the measurement behind that
 * and the reason the guard cannot be moved into a shared helper.
 *
 * Worth asking because this module is both a command and a library:
 * `bun scripts/llm-connector.ts` runs a pass, while a case
 * importing {@link ensureLlmConnector} or
 * {@link projectModelConnector} gets the exports and no pass.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runLlmConnectorCli();
  } catch (cause) {
    // The one refusal this command raises on its own names the
    // setting and says where to set it, so a stack over it buries
    // the thing worth reading. Anything else — a database that
    // refused, a conflict lost to another writer — is unexpected,
    // and there the stack is what a reader needs.
    process.exitCode = 1;
    console.error(
      cause instanceof UnsetModelEndpointError
        ? cause.message
        : cause,
    );
  }
}
