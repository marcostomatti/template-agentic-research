/**
 * @packageDocumentation
 * The shape half of the integration seed: one strict schema per file
 * in `tests/fixtures/integration/`, re-exported whole from
 * `./seed-integration.ts`.
 *
 * Every object is strict, for the reason `./seed-schemas.ts` gives:
 * Zod's default drops a key it does not recognize and says nothing,
 * so a mistyped member would reach the apply pass as one never
 * written. Every closed set is imported from
 * `src/db/schema/values.ts`, the tuple each column's check constraint
 * is generated from, so a fixture cannot carry a value the database
 * would refuse for being outside it.
 *
 * `fixtureId` and every member ending in `FixtureId` stand in for
 * an id the database issues, and `domainSlug` for the domain
 * `db:seed` wrote. None of them is a column; the apply pass resolves
 * each.
 */
import { z } from 'zod';

import {
  CONNECTOR_KINDS,
  DOCUMENT_PARSE_STATUSES,
  EXPORT_FORMATS,
  RUN_SCHEDULERS,
  RUN_STATUSES,
  SOURCE_KINDS,
} from '../src/db/schema/values.js';

/**
 * An instant as the fixtures write one. Zod's ISO form requires the
 * time and a `Z`, so a bare date is refused rather than read as
 * midnight in whatever zone the process runs in.
 */
const instant = z.iso.datetime();

/** The id a fixture row carries in place of the database's. */
const fixtureId = z.number().int()
  .positive();

/** A slug naming a domain `db:seed` is expected to have written. */
const domainSlug = z.string().min(1);

/** A JSON object column: `config`, `fields`, `attributes`. */
const jsonObject = z.record(z.string(), z.unknown());

/** A non-negative integer column that may be absent. */
const optionalCount = z.number().int()
  .nonnegative()
  .nullable();

const sourceRowSchema = z.object({
  fixtureId,
  domainSlug,
  kind: z.enum(SOURCE_KINDS),
  endpoint: z.string().min(1),
  cursor: z.string().nullable(),
  consecutiveFailures: z.number().int()
    .nonnegative(),
  lastSuccessAt: instant.nullable(),
  lastFailureAt: instant.nullable(),
  enabled: z.boolean(),
  flagged: z.boolean(),
}).strict();

const connectorRowSchema = z.object({
  fixtureId,
  kind: z.enum(CONNECTOR_KINDS),
  name: z.string().min(1),
  config: jsonObject,
}).strict();

const entityRowSchema = z.object({
  fixtureId,
  domainSlug,
  name: z.string().min(1),
  nameNorm: z.string().min(1),
  aliasOfFixtureId: fixtureId.nullable(),
  attributes: jsonObject,
}).strict();

const documentRowSchema = z.object({
  fixtureId,
  domainSlug,
  sourceFixtureId: fixtureId.nullable(),
  hash: z.string().min(1),
  url: z.string().nullable(),
  body: z.string(),
  capturedAt: instant,
  parseStatus: z.enum(DOCUMENT_PARSE_STATUSES),
  parseError: z.string().nullable(),
}).strict();

const findingLabelRowSchema = z.object({
  verdict: z.string().min(1),
  note: z.string().nullable(),
  labelledAt: instant,
}).strict();

const findingRowSchema = z.object({
  fixtureId,
  domainSlug,
  documentFixtureId: fixtureId,
  entityFixtureId: fixtureId.nullable(),
  fields: jsonObject,
  score: z.number().nullable(),
  scoreVersion: z.number().int()
    .nullable(),
  createdAt: instant,
  labels: z.array(findingLabelRowSchema),
}).strict();

const exportSubscriptionRowSchema = z.object({
  fixtureId,
  domainSlug,
  format: z.enum(EXPORT_FORMATS),
  connectorKind: z.enum(CONNECTOR_KINDS),
  connectorName: z.string().min(1),
  intervalSeconds: z.number().int()
    .positive(),
  nextRunAt: instant.nullable(),
  enabled: z.boolean(),
  minIntervalSeconds: z.number().int()
    .positive()
    .nullable(),
  maxIntervalSeconds: z.number().int()
    .positive()
    .nullable(),
}).strict();

const runRowSchema = z.object({
  fixtureId,
  domainSlug,
  scheduledBy: z.enum(RUN_SCHEDULERS),
  status: z.enum(RUN_STATUSES),
  startedAt: instant,
  finishedAt: instant.nullable(),
  counts: z.record(z.string(), z.number()),
  errors: z.array(z.unknown()),
}).strict();

const llmCallRowSchema = z.object({
  runFixtureId: fixtureId.nullable(),
  node: z.string().min(1),
  model: z.string().nullable(),
  promptChars: optionalCount,
  estTokens: optionalCount,
  calledAt: instant,
}).strict();

export const SourcesFileSchema = z.object({
  sources: z.array(sourceRowSchema),
}).strict();

export const ConnectorsFileSchema = z.object({
  connectors: z.array(connectorRowSchema),
}).strict();

export const EntitiesFileSchema = z.object({
  entities: z.array(entityRowSchema),
}).strict();

export const DocumentsFileSchema = z.object({
  documents: z.array(documentRowSchema),
}).strict();

export const FindingsFileSchema = z.object({
  findings: z.array(findingRowSchema),
}).strict();

export const ExportSubscriptionsFileSchema = z.object({
  exportSubscriptions: z.array(exportSubscriptionRowSchema),
}).strict();

export const RunsFileSchema = z.object({
  runs: z.array(runRowSchema),
}).strict();

export const LlmCallsFileSchema = z.object({
  llmCalls: z.array(llmCallRowSchema),
}).strict();

/** One `sources.json` row. */
export type SourceFixture = z.infer<typeof sourceRowSchema>;

/** One `connectors.json` row. */
export type ConnectorFixture = z.infer<typeof connectorRowSchema>;

/** One `entities.json` row. */
export type EntityFixture = z.infer<typeof entityRowSchema>;

/** One `documents.json` row. */
export type DocumentFixture = z.infer<typeof documentRowSchema>;

/** One `findings.json` row, its labels nested under it. */
export type FindingFixture = z.infer<typeof findingRowSchema>;

/** One `export-subscriptions.json` row. */
export type ExportSubscriptionFixture = z.infer<
  typeof exportSubscriptionRowSchema
>;

/** One `runs.json` row. */
export type RunFixture = z.infer<typeof runRowSchema>;

/** One `llm-calls.json` row. */
export type LlmCallFixture = z.infer<typeof llmCallRowSchema>;
