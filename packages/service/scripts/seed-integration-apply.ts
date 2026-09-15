/**
 * @packageDocumentation
 * The apply half of the integration seed: the pass that writes a
 * validated fixture bundle onto `ar_live`, re-exported whole from
 * `./seed-integration.ts`.
 *
 * Three rules shape it.
 *
 * The guard comes first. {@link applyIntegrationBundle} is handed a
 * pool and asks it `assertLiveDatabase` before it builds anything to
 * write through, so a pool on any database not named `ar_live` is
 * refused having issued one `SELECT` and nothing else.
 *
 * The whole pass is one transaction. A slug `db:seed` never wrote, a
 * reference a hand-built bundle leaves unresolved, a constraint the
 * database holds — any refusal rolls back every table already
 * written, so a broken pass leaves what the previous one left.
 *
 * A rerun matches rather than adds. Most of these tables carry no
 * natural key, so each concern names the identity a row is found by
 * — a document by `hash`, a run by its domain, scheduler and start —
 * and a row found there is rewritten with the fixture's values
 * rather than inserted beside itself. `loadIntegrationBundle` refuses
 * a bundle in which two rows share one, which is what keeps a second
 * pass's row counts equal to the first's.
 *
 * Connectors are written through `src/connectors/service.ts`, never
 * as a raw insert: `createConnector` and `patchConnector` are what
 * store a submitted `config` for the HTTP surface, secret members
 * included, and what refuse the read mask as a value.
 */
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
import type { IntegrationBundle } from './seed-integration.js';
import type { Db } from '../src/db/index.js';
import type { Pool } from 'pg';

import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

import { createDbConnectorStore } from '../src/connectors/db-store.js';
import {
  createConnector,
  patchConnector,
} from '../src/connectors/service.js';
import * as schema from '../src/db/schema.js';
import {
  connectors,
  documents,
  domains,
  entities,
  exportSubscriptions,
  findingLabels,
  findings,
  llmCalls,
  runs,
  sources,
} from '../src/db/schema.js';
import { assertLiveDatabase } from '../tests/live/live-postgres.js';

/** The pass's transaction, derived as `seed-apply.ts` derives it. */
type IntegrationTx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** What every refusal raised while writing opens with. */
const APPLY_ERROR_PREFIX = 'integration seed apply:';

/** How one concern's rows came out of a pass. */
export interface IntegrationRowCounts {
  /** Rows no earlier pass had written. */
  readonly inserted: number;

  /** Rows found by their identity and rewritten with the fixture. */
  readonly matched: number;
}

/**
 * What one pass did, a member per table it writes, in the order it
 * writes them. `findingLabels` is the one member no fixture file is
 * named for, the labels travelling nested under their findings.
 */
export interface IntegrationCounts {
  readonly connectors: IntegrationRowCounts;
  readonly sources: IntegrationRowCounts;
  readonly entities: IntegrationRowCounts;
  readonly documents: IntegrationRowCounts;
  readonly findings: IntegrationRowCounts;
  readonly findingLabels: IntegrationRowCounts;
  readonly exportSubscriptions: IntegrationRowCounts;
  readonly runs: IntegrationRowCounts;
  readonly llmCalls: IntegrationRowCounts;
}

/** One concern's written ids, keyed by fixture id, and its counts. */
interface Applied {
  readonly ids: ReadonlyMap<number, number>;
  readonly counts: IntegrationRowCounts;
}

/** Counts a pass accumulates for one concern. */
class Tally {
  inserted = 0;
  matched = 0;

  /** The counts as reported. */
  get counts(): IntegrationRowCounts {
    return { inserted: this.inserted, matched: this.matched };
  }
}

/**
 * The id a row ends up under: the one its identity already selects,
 * rewritten, or a fresh insert's.
 *
 * @param tally - Where the outcome is counted.
 * @param found - The id the identity selected, if any.
 * @param update - Rewrites the found row with the fixture's values.
 * @param insert - Inserts the row and answers its id.
 */
async function matchOrInsert(
  tally: Tally,
  found: { readonly id: number } | undefined,
  update: (id: number) => PromiseLike<unknown>,
  insert: () => PromiseLike<readonly { readonly id: number }[]>,
): Promise<number> {
  if (found !== undefined) {
    await update(found.id);
    tally.matched += 1;
    return found.id;
  }

  const [row] = await insert();

  if (row === undefined) {
    throw new Error(`${APPLY_ERROR_PREFIX} an insert returned no row`);
  }

  tally.inserted += 1;
  return row.id;
}

/**
 * The database id a fixture reference names.
 *
 * `loadIntegrationBundle` resolves every such reference already; this
 * covers a bundle assembled by hand, whose unresolved key would
 * otherwise reach a foreign key as `undefined`.
 *
 * @param ids - What an earlier concern wrote, by key.
 * @param key - The reference.
 * @param what - The referring row and what it names, for the message.
 * @throws Error When the key names nothing written this pass.
 */
function resolved<Key>(
  ids: ReadonlyMap<Key, number>,
  key: Key,
  what: string,
): number {
  const id = ids.get(key);

  if (id === undefined) {
    throw new Error(
      `${APPLY_ERROR_PREFIX} ${what} '${String(key)}', which this ` +
      'pass has not written',
    );
  }

  return id;
}

/**
 * A nullable fixture reference resolved, `null` staying `null`.
 *
 * @param ids - What an earlier concern wrote, by fixture id.
 * @param key - The reference, or `null`.
 * @param what - For the message.
 */
function resolvedOrNull(
  ids: ReadonlyMap<number, number>,
  key: number | null,
  what: string,
): number | null {
  return key === null
    ? null
    : resolved(ids, key, what);
}

/**
 * An instant as the fixtures write one, or `null`, as a `Date`.
 *
 * @param at - The instant.
 */
function instantOrNull(at: string | null): Date | null {
  return at === null
    ? null
    : new Date(at);
}

/**
 * Every domain slug the bundle names, against the id `db:seed` wrote
 * it under — refused before any write when one is missing, since
 * this pass does not create a domain and must not read `data/` to.
 *
 * @param tx - The pass's transaction.
 * @param bundle - The bundle.
 * @throws Error Naming every slug the database does not hold.
 */
async function resolveDomains(
  tx: IntegrationTx,
  bundle: IntegrationBundle,
): Promise<ReadonlyMap<string, number>> {
  const slugs = [...new Set([
    ...bundle.sources,
    ...bundle.entities,
    ...bundle.documents,
    ...bundle.findings,
    ...bundle.exportSubscriptions,
    ...bundle.runs,
  ].map((row) => row.domainSlug))];

  if (slugs.length === 0) {
    return new Map();
  }

  const rows = await tx.select({ id: domains.id, slug: domains.slug })
    .from(domains)
    .where(inArray(domains.slug, slugs));
  const ids = new Map(rows.map((row) => [row.slug, row.id]));
  const missing = slugs.filter((slug) => !ids.has(slug));

  if (missing.length > 0) {
    throw new Error(
      `${APPLY_ERROR_PREFIX} no domain in this database carries ` +
      `${missing.map((slug) => `'${slug}'`).join(', ')}; ` +
      'run `bun run db:seed` against it first',
    );
  }

  return ids;
}

/**
 * Every connector, through the service's own create and patch, found
 * by the (`kind`, `name`) key `connectors_kind_name_unique` holds.
 * A patch replaces `config` whole, which is the fixture's own rule.
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `connectors.json` row.
 * @returns Each (`kind`/`name`) against its id, and the counts.
 */
async function applyConnectors(
  tx: IntegrationTx,
  rows: readonly ConnectorFixture[],
): Promise<{
  readonly ids: ReadonlyMap<string, number>;
  readonly counts: IntegrationRowCounts;
}> {
  // The store is written against the database handle and asks it
  // only for query builders, which a transaction carries under the
  // same names; the cast is what routes its writes into this pass's
  // transaction rather than onto a second connection outside it.
  const store = createDbConnectorStore(() => tx as unknown as Db);
  const ids = new Map<string, number>();
  const tally = new Tally();

  for (const row of rows) {
    const [found] = await tx.select({ id: connectors.id })
      .from(connectors)
      .where(and(eq(connectors.kind, row.kind), eq(connectors.name, row.name)));
    const key = `${row.kind}/${row.name}`;

    if (found === undefined) {
      const created = await createConnector(store, {
        kind: row.kind,
        name: row.name,
        config: row.config,
      });

      tally.inserted += 1;
      ids.set(key, created.id);
      continue;
    }

    await patchConnector(store, found.id, { config: row.config });
    tally.matched += 1;
    ids.set(key, found.id);
  }

  return { ids, counts: tally.counts };
}

/**
 * Every source, found by (domain, `kind`, `endpoint`).
 * `parser_config` and `contract` are not written, so a first insert
 * takes their `{}` default and a rerun leaves whatever a later writer
 * put there.
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `sources.json` row.
 * @param domainIds - What {@link resolveDomains} returned.
 */
async function applySources(
  tx: IntegrationTx,
  rows: readonly SourceFixture[],
  domainIds: ReadonlyMap<string, number>,
): Promise<Applied> {
  const ids = new Map<number, number>();
  const tally = new Tally();

  for (const row of rows) {
    const domainId = resolved(domainIds, row.domainSlug, 'source names domain');
    const written = {
      cursor: row.cursor,
      consecutiveFailures: row.consecutiveFailures,
      lastSuccessAt: instantOrNull(row.lastSuccessAt),
      lastFailureAt: instantOrNull(row.lastFailureAt),
      enabled: row.enabled,
      flagged: row.flagged,
    };
    const [found] = await tx.select({ id: sources.id })
      .from(sources)
      .where(and(
        eq(sources.domainId, domainId),
        eq(sources.kind, row.kind),
        eq(sources.endpoint, row.endpoint),
      ));

    ids.set(row.fixtureId, await matchOrInsert(
      tally,
      found,
      (id) => tx.update(sources).set(written)
        .where(eq(sources.id, id)),
      () => tx.insert(sources)
        .values({ domainId, kind: row.kind, endpoint: row.endpoint, ...written })
        .returning({ id: sources.id }),
    ));
  }

  return { ids, counts: tally.counts };
}

/**
 * Every entity in file order, found by (domain, `nameNorm`), so an
 * alias resolves to a row this pass already reached.
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `entities.json` row.
 * @param domainIds - What {@link resolveDomains} returned.
 */
async function applyEntities(
  tx: IntegrationTx,
  rows: readonly EntityFixture[],
  domainIds: ReadonlyMap<string, number>,
): Promise<Applied> {
  const ids = new Map<number, number>();
  const tally = new Tally();

  for (const row of rows) {
    const domainId = resolved(domainIds, row.domainSlug, 'entity names domain');
    const written = {
      name: row.name,
      aliasOf: resolvedOrNull(ids, row.aliasOfFixtureId, 'entity aliases'),
      attributes: row.attributes,
    };
    const [found] = await tx.select({ id: entities.id })
      .from(entities)
      .where(and(
        eq(entities.domainId, domainId),
        eq(entities.nameNorm, row.nameNorm),
      ));

    ids.set(row.fixtureId, await matchOrInsert(
      tally,
      found,
      (id) => tx.update(entities).set(written)
        .where(eq(entities.id, id)),
      () => tx.insert(entities)
        .values({ domainId, nameNorm: row.nameNorm, ...written })
        .returning({ id: entities.id }),
    ));
  }

  return { ids, counts: tally.counts };
}

/**
 * Every document, found by the `hash` `documents_hash_unique` holds.
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `documents.json` row.
 * @param domainIds - What {@link resolveDomains} returned.
 * @param sourceIds - What {@link applySources} returned.
 */
async function applyDocuments(
  tx: IntegrationTx,
  rows: readonly DocumentFixture[],
  domainIds: ReadonlyMap<string, number>,
  sourceIds: ReadonlyMap<number, number>,
): Promise<Applied> {
  const ids = new Map<number, number>();
  const tally = new Tally();

  for (const row of rows) {
    const written = {
      domainId: resolved(domainIds, row.domainSlug, 'document names domain'),
      sourceId: resolvedOrNull(
        sourceIds,
        row.sourceFixtureId,
        'document names source',
      ),
      url: row.url,
      body: row.body,
      capturedAt: new Date(row.capturedAt),
      parseStatus: row.parseStatus,
      parseError: row.parseError,
    };
    const [found] = await tx.select({ id: documents.id })
      .from(documents)
      .where(eq(documents.hash, row.hash));

    ids.set(row.fixtureId, await matchOrInsert(
      tally,
      found,
      (id) => tx.update(documents).set(written)
        .where(eq(documents.id, id)),
      () => tx.insert(documents)
        .values({ hash: row.hash, ...written })
        .returning({ id: documents.id }),
    ));
  }

  return { ids, counts: tally.counts };
}

/** The ids {@link applyFindings} resolves its rows against. */
interface FindingParents {
  readonly domainIds: ReadonlyMap<string, number>;
  readonly documentIds: ReadonlyMap<number, number>;
  readonly entityIds: ReadonlyMap<number, number>;
}

/**
 * Every finding, found by (domain, document, `createdAt`), and under
 * each its labels, found by (finding, `verdict`, `labelledAt`).
 * `finding_labels` is append-only for the service; a label found here
 * is left as the fixture states it rather than appended to again.
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `findings.json` row.
 * @param parents - The ids the rows resolve against.
 */
async function applyFindings(
  tx: IntegrationTx,
  rows: readonly FindingFixture[],
  parents: FindingParents,
): Promise<{
  readonly findings: IntegrationRowCounts;
  readonly findingLabels: IntegrationRowCounts;
}> {
  const tally = new Tally();
  const labelTally = new Tally();

  for (const row of rows) {
    const domainId = resolved(
      parents.domainIds,
      row.domainSlug,
      'finding names domain',
    );
    const documentId = resolved(
      parents.documentIds,
      row.documentFixtureId,
      'finding names document',
    );
    const createdAt = new Date(row.createdAt);
    const written = {
      entityId: resolvedOrNull(
        parents.entityIds,
        row.entityFixtureId,
        'finding names entity',
      ),
      fields: row.fields,
      score: row.score,
      scoreVersion: row.scoreVersion,
    };
    const [found] = await tx.select({ id: findings.id })
      .from(findings)
      .where(and(
        eq(findings.domainId, domainId),
        eq(findings.documentId, documentId),
        eq(findings.createdAt, createdAt),
      ));
    const findingId = await matchOrInsert(
      tally,
      found,
      (id) => tx.update(findings).set(written)
        .where(eq(findings.id, id)),
      () => tx.insert(findings)
        .values({ domainId, documentId, createdAt, ...written })
        .returning({ id: findings.id }),
    );

    for (const label of row.labels) {
      const labelledAt = new Date(label.labelledAt);
      const [foundLabel] = await tx.select({ id: findingLabels.id })
        .from(findingLabels)
        .where(and(
          eq(findingLabels.findingId, findingId),
          eq(findingLabels.verdict, label.verdict),
          eq(findingLabels.labelledAt, labelledAt),
        ));

      await matchOrInsert(
        labelTally,
        foundLabel,
        (id) => tx.update(findingLabels).set({ note: label.note })
          .where(eq(findingLabels.id, id)),
        () => tx.insert(findingLabels)
          .values({
            findingId,
            verdict: label.verdict,
            note: label.note,
            labelledAt,
          })
          .returning({ id: findingLabels.id }),
      );
    }
  }

  return { findings: tally.counts, findingLabels: labelTally.counts };
}

/**
 * Every export subscription, found by the (domain, `format`,
 * connector) key its unique constraint holds.
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `export-subscriptions.json` row.
 * @param domainIds - What {@link resolveDomains} returned.
 * @param connectorIds - What {@link applyConnectors} returned.
 */
async function applyExportSubscriptions(
  tx: IntegrationTx,
  rows: readonly ExportSubscriptionFixture[],
  domainIds: ReadonlyMap<string, number>,
  connectorIds: ReadonlyMap<string, number>,
): Promise<IntegrationRowCounts> {
  const tally = new Tally();

  for (const row of rows) {
    const domainId = resolved(
      domainIds,
      row.domainSlug,
      'export subscription names domain',
    );
    const connectorId = resolved(
      connectorIds,
      `${row.connectorKind}/${row.connectorName}`,
      'export subscription names connector',
    );
    const written = {
      intervalSeconds: row.intervalSeconds,
      nextRunAt: instantOrNull(row.nextRunAt),
      enabled: row.enabled,
      minIntervalSeconds: row.minIntervalSeconds,
      maxIntervalSeconds: row.maxIntervalSeconds,
    };
    const [found] = await tx.select({ id: exportSubscriptions.id })
      .from(exportSubscriptions)
      .where(and(
        eq(exportSubscriptions.domainId, domainId),
        eq(exportSubscriptions.format, row.format),
        eq(exportSubscriptions.connectorId, connectorId),
      ));

    await matchOrInsert(
      tally,
      found,
      (id) => tx.update(exportSubscriptions).set(written)
        .where(eq(exportSubscriptions.id, id)),
      () => tx.insert(exportSubscriptions)
        .values({ domainId, format: row.format, connectorId, ...written })
        .returning({ id: exportSubscriptions.id }),
    );
  }

  return tally.counts;
}

/**
 * Every run, found by (domain, `scheduledBy`, `startedAt`).
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `runs.json` row.
 * @param domainIds - What {@link resolveDomains} returned.
 */
async function applyRuns(
  tx: IntegrationTx,
  rows: readonly RunFixture[],
  domainIds: ReadonlyMap<string, number>,
): Promise<Applied> {
  const ids = new Map<number, number>();
  const tally = new Tally();

  for (const row of rows) {
    const domainId = resolved(domainIds, row.domainSlug, 'run names domain');
    const startedAt = new Date(row.startedAt);
    const written = {
      status: row.status,
      finishedAt: instantOrNull(row.finishedAt),
      counts: row.counts,
      errors: row.errors,
    };
    const [found] = await tx.select({ id: runs.id })
      .from(runs)
      .where(and(
        eq(runs.domainId, domainId),
        eq(runs.scheduledBy, row.scheduledBy),
        eq(runs.startedAt, startedAt),
      ));

    ids.set(row.fixtureId, await matchOrInsert(
      tally,
      found,
      (id) => tx.update(runs).set(written)
        .where(eq(runs.id, id)),
      () => tx.insert(runs)
        .values({ domainId, scheduledBy: row.scheduledBy, startedAt, ...written })
        .returning({ id: runs.id }),
    ));
  }

  return { ids, counts: tally.counts };
}

/**
 * Every model call, found by (`node`, `calledAt`).
 *
 * @param tx - The pass's transaction.
 * @param rows - Every `llm-calls.json` row.
 * @param runIds - What {@link applyRuns} returned.
 */
async function applyLlmCalls(
  tx: IntegrationTx,
  rows: readonly LlmCallFixture[],
  runIds: ReadonlyMap<number, number>,
): Promise<IntegrationRowCounts> {
  const tally = new Tally();

  for (const row of rows) {
    const calledAt = new Date(row.calledAt);
    const written = {
      runId: resolvedOrNull(runIds, row.runFixtureId, 'model call names run'),
      model: row.model,
      promptChars: row.promptChars,
      estTokens: row.estTokens,
    };
    const [found] = await tx.select({ id: llmCalls.id })
      .from(llmCalls)
      .where(and(eq(llmCalls.node, row.node), eq(llmCalls.calledAt, calledAt)));

    await matchOrInsert(
      tally,
      found,
      (id) => tx.update(llmCalls).set(written)
        .where(eq(llmCalls.id, id)),
      () => tx.insert(llmCalls)
        .values({ node: row.node, calledAt, ...written })
        .returning({ id: llmCalls.id }),
    );
  }

  return tally.counts;
}

/**
 * Every row the bundle carries, written onto `ar_live` in one
 * transaction, on top of the domain a `db:seed` pass wrote there.
 *
 * The order is the one the foreign keys force: connectors and sources
 * and entities first, documents naming a source, findings naming a
 * document and an entity with their labels under them, subscriptions
 * naming a connector, runs, and calls naming a run.
 *
 * Two limits. The pass adds and rewrites and never deletes, so a row
 * dropped from a fixture file stays in the database. And a matched
 * row is rewritten in the columns the fixture states and no others,
 * so what a later writer put in a column no fixture names survives.
 *
 * @param pool - A pool the caller owns; nothing here closes it.
 * @param bundle - What `loadIntegrationBundle` returned.
 * @returns What the pass did, a table at a time.
 * @throws Error From `assertLiveDatabase`, before any write, when the
 * pool is on any database not named `ar_live`; and from inside the
 * transaction, having rolled it back, when a slug, a reference or a
 * constraint refuses.
 */
export async function applyIntegrationBundle(
  pool: Pool,
  bundle: IntegrationBundle,
): Promise<IntegrationCounts> {
  await assertLiveDatabase(pool);

  const db = drizzle({ client: pool, schema });

  return db.transaction(async (tx) => {
    const domainIds = await resolveDomains(tx, bundle);
    const appliedConnectors = await applyConnectors(tx, bundle.connectors);
    const appliedSources = await applySources(tx, bundle.sources, domainIds);
    const appliedEntities = await applyEntities(
      tx,
      bundle.entities,
      domainIds,
    );
    const appliedDocuments = await applyDocuments(
      tx,
      bundle.documents,
      domainIds,
      appliedSources.ids,
    );
    const appliedFindings = await applyFindings(tx, bundle.findings, {
      domainIds,
      documentIds: appliedDocuments.ids,
      entityIds: appliedEntities.ids,
    });
    const subscriptions = await applyExportSubscriptions(
      tx,
      bundle.exportSubscriptions,
      domainIds,
      appliedConnectors.ids,
    );
    const appliedRuns = await applyRuns(tx, bundle.runs, domainIds);
    const calls = await applyLlmCalls(tx, bundle.llmCalls, appliedRuns.ids);

    return {
      connectors: appliedConnectors.counts,
      sources: appliedSources.counts,
      entities: appliedEntities.counts,
      documents: appliedDocuments.counts,
      findings: appliedFindings.findings,
      findingLabels: appliedFindings.findingLabels,
      exportSubscriptions: subscriptions,
      runs: appliedRuns.counts,
      llmCalls: calls,
    };
  });
}
