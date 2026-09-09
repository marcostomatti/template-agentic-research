/**
 * What `scripts/llm-connector.ts` decides, asked with no database
 * anywhere in the run.
 *
 * Every decision that command takes is answerable from values —
 * rows in, a projection and a report out — and the one place it
 * needs a store it takes a port, so `MemoryResearchStore` behind
 * `createMemoryResearchStore()` is the whole of the substitution.
 * The live suite proves real Postgres agrees; these cases prove
 * what agreement would be about.
 *
 * Six subjects. The projection, which is the module's
 * re-implementation of one workflow node. The statement that node
 * carries, read out of the workflow sources so the transcription is
 * not the only thing holding the two together. The settings and the
 * one refusal. The ensure pass over a store. The report a run
 * prints. And the command wrapper, whose only jobs are printing
 * once and letting go of the connection.
 *
 * THE STRONGEST LEG HERE IS THE ONE THAT READS THE SQL. Every other
 * claim about the projection is a transcription of a statement
 * living inside a node parameter in `workflows/src/`, and a
 * transcription agrees with its own mistakes. {@link SELECT_MODEL}
 * reads that statement out of all three sources that carry the
 * node, strips its comments, and holds the module's kind literal,
 * its ordering rule, its two member names and its column roster
 * against what the statement actually says.
 *
 * A SECOND CROSS-CHECK RODE OUTSIDE THIS FILE and is worth
 * recording because nothing here re-proves it. The exact statement
 * out of `ar-ingest.json` was run against a real Postgres over a
 * `CREATE TEMP TABLE connectors` shadow on one dedicated connection
 * (`pool.totalCount` read back at 1), with nineteen planted row
 * sets covering every case below and several this file does not
 * carry, and `projectModelConnector` was run over the same rows in
 * the same process: nineteen agreements and no disagreement, every
 * statement answering exactly one row. Two planted controls say the
 * comparison could have failed — dropping the empty-string rule
 * from the module made the empty-endpoint set DIFFER, and ordering
 * by name instead of by id made the three-row set DIFFER — and each
 * left the other sets agreeing.
 *
 * WHAT NO CASE HERE REACHES. Nothing opens a socket, so nothing
 * says the endpoint a row carries answers, and nothing says the
 * address is reachable from inside the n8n container, which is
 * where it is actually dialled. Nothing runs the CLI block either:
 * it runs only when this module is what the process was started
 * with, and {@link runLlmConnectorCli} is what stands in for it.
 * And no case writes through the drizzle store, so what these
 * prove about `ensureLlmConnector` is what it decides rather than
 * what Postgres does with the decision.
 *
 * The mutation grid, run against the module a mutation at a time,
 * with a green no-patch control at 69 cases.
 *
 * Ordering the selection by name rather than by id reddens 2, both
 * of them cases whose planted rows put the two orders in conflict.
 * Dropping the empty-string arm of the config read reddens 3 and
 * adding a trim to it reddens 3, two of each being the per-member
 * table and the third the pair that tells a blank-looking endpoint
 * from an absent one. Dropping the kind filter reddens 3, and the
 * third of those is the case about the array a caller handed over:
 * `filter` is what makes the array `sort` runs on a fresh one, so
 * removing it turns the projection into something that reorders
 * its caller's rows.
 *
 * Keying the ensure on the connector NAME rather than on the kind
 * reddens 2. Resolving the settings before the read rather than
 * after it reddens 1 — the run that reports a stored row with
 * nothing configured. Writing the model member as an empty string
 * instead of omitting it reddens 1, and dropping the widening
 * second read reddens 1. Projecting the created record instead of
 * re-reading the collection reddens NONE, which is why that choice
 * is argued in the module rather than asserted here.
 *
 * One mutation outside the module belongs in the same grid, since
 * what it moves is a roster the module reads through rather than
 * owns: adding `endpoint` to `SECRET_CONFIG_KEYS` in
 * `src/connectors/secrets.ts` reddens 7 — the two cases written
 * about the mask, and five that only ever meant to read an address
 * back through the service and get the sentinel instead.
 */
import type {
  LlmConnectorOutcome,
  ModelConnectorProjection,
} from '../../scripts/llm-connector.js';
import type { ConnectorRecord } from '../../src/connectors/store.js';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  LLM_CONNECTOR_KIND,
  LLM_CONNECTOR_NAME,
  LLM_SETTING_NAMES,
  MODEL_PROJECTION_COLUMNS,
  UnsetModelEndpointError,
  ensureLlmConnector,
  formatLlmConnectorReport,
  projectModelConnector,
  resolveLlmSettings,
  runLlmConnectorCli,
} from '../../scripts/llm-connector.js';
import { SECRET_CONFIG_KEYS } from '../../src/connectors/secrets.js';
import { listConnectors } from '../../src/connectors/service.js';
import { createMemoryResearchStore } from '../helpers/memory-research-store.js';

// ---------------------------------------------------------------------------
// The statement the module re-implements
// ---------------------------------------------------------------------------

/** The workflow sources carrying a `Select Model Connector` node. */
const SOURCES_WITH_THE_NODE = [
  'ar-digest',
  'ar-ingest',
  'ar-research',
] as const;

/** The node name each of them spells it under. */
const NODE_NAME = 'Select Model Connector';

/** One workflow source, as much of it as this file reads. */
interface WorkflowSource {
  readonly nodes: readonly {
    readonly name: string;
    readonly parameters: { readonly query?: string };
  }[];
}

/**
 * The `Select Model Connector` statement out of one source, with
 * its comments stripped.
 *
 * Only `--` comments exist to strip, and no string literal in the
 * statement contains that pair, so a line-tail strip is exact here
 * rather than approximate. The parentheses and the dots are LEFT
 * ALONE, unlike `sqlWords()` in `tests/invariants/dispatch-sql.ts`:
 * every question below is about structure or about a literal, and
 * flattening either would answer both wrongly.
 *
 * @param stem - The source file's stem.
 * @returns The statement text with no comment lines in it.
 * @throws When the file carries no node of that name, or the node
 *   carries no statement — either of which would otherwise make
 *   every case reading it vacuously true.
 */
function selectModelStatement(stem: string): string {
  const source = JSON.parse(
    readFileSync(
      new URL(`../../workflows/src/${stem}.json`, import.meta.url),
      'utf8',
    ),
  ) as WorkflowSource;
  const node = source.nodes.find((one) => one.name === NODE_NAME);
  const statement = node?.parameters.query;

  if (statement === undefined || statement.trim() === '') {
    throw new Error(`${stem} carries no ${NODE_NAME} statement`);
  }

  return statement
    .split('\n')
    .map((line) => line.replace(/--.*$/u, ''))
    .join('\n');
}

/** Every statement, read once, keyed by the source it came from. */
const SELECT_MODEL = SOURCES_WITH_THE_NODE.map((stem) => ({
  statement: selectModelStatement(stem),
  stem,
}));

/**
 * Every `AS` alias one statement declares, in order.
 *
 * `WITH connector AS (` is not one: the capture requires a word
 * after the keyword and that occurrence is followed by a
 * parenthesis, which is what keeps the CTE's own name out of the
 * column list.
 *
 * @param statement - A comment-stripped statement.
 * @returns The aliases, in the order the statement declares them.
 */
function aliasesOf(statement: string): readonly string[] {
  return [...statement.matchAll(/\bAS\s+([a-z_]+)/giu)]
    .map((found) => found[1] ?? '');
}

// ---------------------------------------------------------------------------
// Row fixtures
// ---------------------------------------------------------------------------

/**
 * A connector row as a store would answer it.
 *
 * @param id - The row's id, which is what the selection orders on.
 * @param name - Its name, which nothing selects on.
 * @param storedConfig - Its config, as stored.
 * @param kind - Its kind, defaulting to the one the pipeline reads.
 * @returns The record.
 */
function row(
  id: number,
  name: string,
  storedConfig: unknown,
  kind: string = LLM_CONNECTOR_KIND,
): ConnectorRecord {
  return { config: storedConfig, id, kind, name };
}

/** The projection for a deployment with no `llm` row at all. */
const NOTHING: ModelConnectorProjection = {
  connectorId: null,
  connectorName: null,
  endpoint: null,
  model: null,
};

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

describe('projectModelConnector', () => {
  it('answers one projection where no connector exists at all', () => {
    expect(projectModelConnector([])).toStrictEqual(NOTHING);
  });

  it('answers nulls where every row is of another kind', () => {
    const rows = [
      row(1, 'search', { endpoint: 'http://search' }, 'search'),
      row(2, 'vault', { endpoint: 'http://vault' }, 'notebook'),
    ];

    expect(projectModelConnector(rows)).toStrictEqual(NOTHING);
  });

  it('selects the oldest id, not the first name', () => {
    // Names ascending is the order the PORT lists a page in, so a
    // module reading the first row of a page would answer `alpha`
    // here where the pipeline answers `zeta`.
    const rows = [
      row(5, 'alpha', { endpoint: 'http://younger' }),
      row(2, 'zeta', { endpoint: 'http://oldest' }),
    ];

    expect(projectModelConnector(rows)).toStrictEqual({
      connectorId: 2,
      connectorName: 'zeta',
      endpoint: 'http://oldest',
      model: null,
    });
  });

  it('answers the same whatever order the rows arrive in', () => {
    const rows = [
      row(9, 'c', { endpoint: 'http://c' }),
      row(2, 'a', { endpoint: 'http://a' }),
      row(6, 'b', { endpoint: 'http://b' }),
    ];
    const reversed = [...rows].reverse();

    expect(projectModelConnector(reversed))
      .toStrictEqual(projectModelConnector(rows));
    expect(projectModelConnector(rows).connectorId).toBe(2);
  });

  it('leaves the array it was handed in the order it was handed', () => {
    const rows = [
      row(9, 'c', { endpoint: 'http://c' }),
      row(2, 'a', { endpoint: 'http://a' }),
    ];

    projectModelConnector(rows);

    expect(rows.map((one) => one.id)).toStrictEqual([9, 2]);
  });

  it('answers the same for every row as for the llm rows alone', () => {
    const llm = [
      row(4, 'model', { endpoint: 'http://model', model: 'm' }),
      row(8, 'spare', { endpoint: 'http://spare' }),
    ];
    const everything = [
      row(1, 'crawler', { endpoint: 'http://crawler' }, 'search'),
      ...llm,
      row(2, 'drive', { endpoint: 'http://drive' }, 'export_target'),
    ];

    expect(projectModelConnector(everything))
      .toStrictEqual(projectModelConnector(llm));
    expect(projectModelConnector(everything).connectorId).toBe(4);
  });

  it('reports the row it selected by id and by name', () => {
    const rows = [row(7, 'default', { endpoint: 'http://e', model: 'm' })];

    expect(projectModelConnector(rows)).toStrictEqual({
      connectorId: 7,
      connectorName: 'default',
      endpoint: 'http://e',
      model: 'm',
    });
  });
});

// ---------------------------------------------------------------------------
// The four cases the SQL distinguishes, per member
// ---------------------------------------------------------------------------

/** One stored config, and what the two members project as. */
interface MemberCase {
  /** What was stored under the member. */
  readonly stored: unknown;

  /** What the SQL and this module both read it as. */
  readonly projected: string | null;

  /** What the case is about. */
  readonly reading: string;
}

/**
 * The four cases `jsonb_typeof(...) = 'string'` and
 * `nullif(..., '')` distinguish between them, plus the values that
 * say which side of each rule a borderline case falls on.
 *
 * Every entry is driven against BOTH members, so a rule applied to
 * the endpoint and forgotten on the model is reported.
 */
const MEMBER_CASES: readonly MemberCase[] = [
  { projected: null, reading: 'an absent member', stored: undefined },
  { projected: null, reading: 'a json null', stored: null },
  { projected: null, reading: 'a number', stored: 8080 },
  { projected: null, reading: 'a boolean', stored: true },
  { projected: null, reading: 'an object', stored: { url: 'http://x' } },
  { projected: null, reading: 'an array', stored: ['http://x'] },
  { projected: null, reading: 'the empty string', stored: '' },
  { projected: ' ', reading: 'a single space', stored: ' ' },
  { projected: 'http://e', reading: 'text', stored: 'http://e' },
];

describe('the config members the projection reads', () => {
  it('has a case for every reading it means to cover', () => {
    // The guard the two generated blocks below need: an emptied
    // roster would take every case it generates with it and leave
    // two green blocks over nothing.
    expect(MEMBER_CASES.length).toBeGreaterThanOrEqual(9);
    expect(new Set(MEMBER_CASES.map((one) => one.reading)).size)
      .toBe(MEMBER_CASES.length);
  });

  for (const one of MEMBER_CASES) {
    it(`reads ${one.reading} as the endpoint`, () => {
      const stored = one.stored === undefined
        ? { model: 'm' }
        : { endpoint: one.stored, model: 'm' };

      expect(projectModelConnector([row(1, 'x', stored)])).toStrictEqual({
        connectorId: 1,
        connectorName: 'x',
        endpoint: one.projected,
        model: 'm',
      });
    });

    it(`reads ${one.reading} as the model`, () => {
      const stored = one.stored === undefined
        ? { endpoint: 'http://e' }
        : { endpoint: 'http://e', model: one.stored };

      expect(projectModelConnector([row(1, 'x', stored)])).toStrictEqual({
        connectorId: 1,
        connectorName: 'x',
        endpoint: 'http://e',
        model: one.projected,
      });
    });
  }

  it('tells a blank-looking endpoint from an absent one', () => {
    // The pair the no-trim rule lives or dies on, and the reason
    // the report quotes a value: to the SQL these are different
    // answers, and a trim added here for tidiness would collapse
    // them into one.
    const blank = projectModelConnector([row(1, 'x', { endpoint: '  ' })]);
    const empty = projectModelConnector([row(1, 'x', { endpoint: '' })]);

    expect(blank.endpoint).toBe('  ');
    expect(empty.endpoint).toBeNull();
  });

  it('reads no member off a config that is not an object', () => {
    for (const stored of [null, 'endpoint', 42, true, ['endpoint']]) {
      expect(projectModelConnector([row(3, 'x', stored)])).toStrictEqual({
        connectorId: 3,
        connectorName: 'x',
        endpoint: null,
        model: null,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// The statement in the workflow sources
// ---------------------------------------------------------------------------

describe('the Select Model Connector statement', () => {
  it('was found in all three sources that declare the node', () => {
    // The guard in front of every case below: a rename in
    // `workflows/src/` would otherwise leave them asserting over an
    // empty list.
    expect(SELECT_MODEL.map((one) => one.stem))
      .toStrictEqual([...SOURCES_WITH_THE_NODE]);

    for (const one of SELECT_MODEL) {
      expect(one.statement.length).toBeGreaterThan(100);
      expect(one.statement).not.toContain('--');
    }
  });

  for (const one of SELECT_MODEL) {
    it(`selects by this module's kind literal in ${one.stem}`, () => {
      expect(one.statement)
        .toContain(`c.kind = '${LLM_CONNECTOR_KIND}'`);
    });

    it(`orders by id and caps at one row in ${one.stem}`, () => {
      expect(one.statement).toContain('ORDER BY c.id');
      expect(one.statement).toContain('LIMIT 1');
      expect(one.statement).not.toContain('ORDER BY c.name');
    });

    it(`reads the two members this module writes in ${one.stem}`, () => {
      expect(one.statement).toContain('c.config -> \'endpoint\'');
      expect(one.statement).toContain('c.config ->> \'endpoint\'');
      expect(one.statement).toContain('c.config -> \'model\'');
      expect(one.statement).toContain('c.config ->> \'model\'');
    });

    it(`declares the roster's columns after run_id in ${one.stem}`, () => {
      expect(aliasesOf(one.statement))
        .toStrictEqual(['run_id', ...MODEL_PROJECTION_COLUMNS]);
    });
  }

  it('names every projected column as a member of the answer', () => {
    const projected = projectModelConnector([
      row(1, 'x', { endpoint: 'http://e', model: 'm' }),
    ]);
    const asColumns = Object.keys(projected)
      .map((member) => member.replace(/[A-Z]/gu, (up) => `_${up.toLowerCase()}`))
      .sort();

    expect(asColumns).toStrictEqual([...MODEL_PROJECTION_COLUMNS].sort());
  });
});

// ---------------------------------------------------------------------------
// The mask the read comes back through
// ---------------------------------------------------------------------------

describe('the members this module reads against the secret roster', () => {
  it('reads two members neither of which is masked on the way out', () => {
    const rostered = SECRET_CONFIG_KEYS.map((key) => key.toLowerCase());

    expect(rostered).toContain('apikey');
    expect(rostered).not.toContain('endpoint');
    expect(rostered).not.toContain('model');
  });

  it('projects the stored values off a masked page', async () => {
    const store = createMemoryResearchStore();

    await ensureLlmConnector(store, {
      [LLM_SETTING_NAMES.endpoint]: 'http://host.docker.internal:11434/v1',
      [LLM_SETTING_NAMES.model]: 'a-model',
    });
    await store.insertConnector({
      config: { apiKey: 'sk-planted', endpoint: 'http://other' },
      kind: LLM_CONNECTOR_KIND,
      name: 'second',
    });

    const page = await listConnectors(
      store,
      { kind: LLM_CONNECTOR_KIND },
      { limit: 50, offset: 0 },
    );
    const masked = page.rows.find((one) => one.name === 'second');

    expect(JSON.stringify(masked?.config)).not.toContain('sk-planted');
    expect(projectModelConnector(page.rows)).toStrictEqual({
      connectorId: 1,
      connectorName: LLM_CONNECTOR_NAME,
      endpoint: 'http://host.docker.internal:11434/v1',
      model: 'a-model',
    });
  });
});

// ---------------------------------------------------------------------------
// The settings
// ---------------------------------------------------------------------------

describe('resolveLlmSettings', () => {
  it('answers both settings when both are set', () => {
    expect(resolveLlmSettings({
      [LLM_SETTING_NAMES.endpoint]: 'http://e',
      [LLM_SETTING_NAMES.model]: 'm',
    })).toStrictEqual({ endpoint: 'http://e', model: 'm' });
  });

  it('answers an undefined model where none is set', () => {
    expect(resolveLlmSettings({ [LLM_SETTING_NAMES.endpoint]: 'http://e' }))
      .toStrictEqual({ endpoint: 'http://e', model: undefined });
  });

  it('reads a blank model as unset', () => {
    expect(resolveLlmSettings({
      [LLM_SETTING_NAMES.endpoint]: 'http://e',
      [LLM_SETTING_NAMES.model]: '   ',
    })).toStrictEqual({ endpoint: 'http://e', model: undefined });
  });

  it('carries the endpoint through exactly as it was set', () => {
    // The trim is the test and never the answer, so a configured
    // value keeps whatever whitespace it was given.
    expect(resolveLlmSettings({
      [LLM_SETTING_NAMES.endpoint]: ' http://e ',
    }).endpoint).toBe(' http://e ');
  });

  it('refuses an absent endpoint by name', () => {
    expect(() => resolveLlmSettings({}))
      .toThrow(UnsetModelEndpointError);

    try {
      resolveLlmSettings({ [LLM_SETTING_NAMES.model]: 'm' });
      expect.unreachable('an unset endpoint must refuse');
    } catch (refusal) {
      expect(refusal).toBeInstanceOf(UnsetModelEndpointError);
      expect((refusal as UnsetModelEndpointError).setting)
        .toBe(LLM_SETTING_NAMES.endpoint);
      expect((refusal as Error).message)
        .toContain(LLM_SETTING_NAMES.endpoint);
    }
  });

  it('refuses a blank endpoint the way it refuses an absent one', () => {
    for (const blank of ['', ' ', '\t\n']) {
      expect(() => resolveLlmSettings({
        [LLM_SETTING_NAMES.endpoint]: blank,
      })).toThrow(UnsetModelEndpointError);
    }
  });

  it('says nothing about the values it was handed', () => {
    // A refusal names settings and never contents. The model is
    // the only value in reach on this branch, so it is what a leak
    // would show up as.
    try {
      resolveLlmSettings({ [LLM_SETTING_NAMES.model]: 'planted-model-name' });
      expect.unreachable('an unset endpoint must refuse');
    } catch (refusal) {
      const error = refusal as Error;
      const readable = [
        error.message,
        String(error.stack ?? ''),
        String(JSON.stringify(refusal)),
      ];

      for (const text of readable) {
        expect(text).not.toContain('planted-model-name');
      }

      expect(readable[0]).toContain(LLM_SETTING_NAMES.endpoint);
    }
  });
});

// ---------------------------------------------------------------------------
// The ensure pass
// ---------------------------------------------------------------------------

/** An environment naming both settings. */
const CONFIGURED = {
  [LLM_SETTING_NAMES.endpoint]: 'http://host.docker.internal:1234/v1',
  [LLM_SETTING_NAMES.model]: 'planted-model',
};

describe('ensureLlmConnector', () => {
  it('writes one row into a deployment that carries none', async () => {
    const store = createMemoryResearchStore();
    const outcome = await ensureLlmConnector(store, CONFIGURED);

    expect(outcome).toStrictEqual({
      created: true,
      selected: {
        connectorId: 1,
        connectorName: LLM_CONNECTOR_NAME,
        endpoint: CONFIGURED[LLM_SETTING_NAMES.endpoint],
        model: CONFIGURED[LLM_SETTING_NAMES.model],
      },
      total: 1,
    });
    expect(await store.countConnectors({})).toBe(1);
  });

  it('writes it under the kind and the name this module declares', async () => {
    const store = createMemoryResearchStore();

    await ensureLlmConnector(store, CONFIGURED);

    const stored = await store.findConnectorById(1);

    expect(stored?.kind).toBe(LLM_CONNECTOR_KIND);
    expect(stored?.name).toBe(LLM_CONNECTOR_NAME);
    expect(stored?.config).toStrictEqual({
      endpoint: CONFIGURED[LLM_SETTING_NAMES.endpoint],
      model: CONFIGURED[LLM_SETTING_NAMES.model],
    });
  });

  it('omits the model member where none was configured', async () => {
    const store = createMemoryResearchStore();
    const outcome = await ensureLlmConnector(store, {
      [LLM_SETTING_NAMES.endpoint]: 'http://e',
    });
    const stored = await store.findConnectorById(1);

    expect(Object.keys(stored?.config as object)).toStrictEqual(['endpoint']);
    expect(outcome.selected.model).toBeNull();
  });

  it('creates nothing on a rerun and reports the stored row', async () => {
    const store = createMemoryResearchStore();
    const first = await ensureLlmConnector(store, CONFIGURED);
    const second = await ensureLlmConnector(store, CONFIGURED);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.selected).toStrictEqual(first.selected);
    expect(second.total).toBe(1);
    expect(await store.countConnectors({})).toBe(1);
  });

  it('leaves a stored row alone when the environment has moved', async () => {
    const store = createMemoryResearchStore();

    await ensureLlmConnector(store, CONFIGURED);

    const second = await ensureLlmConnector(store, {
      [LLM_SETTING_NAMES.endpoint]: 'http://somewhere-else',
      [LLM_SETTING_NAMES.model]: 'another-model',
    });

    expect(second.created).toBe(false);
    expect(second.selected.endpoint)
      .toBe(CONFIGURED[LLM_SETTING_NAMES.endpoint]);
    expect(await store.countConnectors({})).toBe(1);
  });

  it('reads no setting at all once a row exists', async () => {
    // The refusal belongs to the branch that writes, so a
    // deployment that is already configured reports rather than
    // refusing an operator who never set the endpoint.
    const store = createMemoryResearchStore();

    await ensureLlmConnector(store, CONFIGURED);

    const second = await ensureLlmConnector(store, {});

    expect(second.created).toBe(false);
    expect(second.selected.connectorId).toBe(1);
  });

  it('is stopped by an llm row under any other name', async () => {
    // Idempotency is keyed on the KIND, because that is what the
    // pipeline selects on. A rerun keyed on the name would write a
    // second row here, younger than this one and never read.
    const store = createMemoryResearchStore();

    await store.insertConnector({
      config: { endpoint: 'http://theirs' },
      kind: LLM_CONNECTOR_KIND,
      name: 'somebody-elses-name',
    });

    const outcome = await ensureLlmConnector(store, CONFIGURED);

    expect(outcome).toStrictEqual({
      created: false,
      selected: {
        connectorId: 1,
        connectorName: 'somebody-elses-name',
        endpoint: 'http://theirs',
        model: null,
      },
      total: 1,
    });
  });

  it('is not stopped by a row of another kind', async () => {
    // The control for the case above: what blocks the write is a
    // connector of THIS kind and not a connector.
    const store = createMemoryResearchStore();

    await store.insertConnector({
      config: { endpoint: 'http://crawler' },
      kind: 'search',
      name: LLM_CONNECTOR_NAME,
    });

    const outcome = await ensureLlmConnector(store, CONFIGURED);

    expect(outcome.created).toBe(true);
    expect(outcome.total).toBe(1);
    expect(outcome.selected.connectorId).toBe(2);
    expect(await store.countConnectors({})).toBe(2);
  });

  it('writes nothing when the endpoint is not configured', async () => {
    const store = createMemoryResearchStore();

    await expect(ensureLlmConnector(store, {}))
      .rejects.toThrow(UnsetModelEndpointError);
    expect(await store.countConnectors({})).toBe(0);
  });

  it('finds the oldest row past the end of one read window', async () => {
    // The widening read, planted where a single window cannot
    // answer: the port pages a kind by NAME, so the oldest row is
    // named to sort last and falls off the end of the first window.
    const store = createMemoryResearchStore();

    await store.insertConnector({
      config: { endpoint: 'http://oldest' },
      kind: LLM_CONNECTOR_KIND,
      name: 'zzz-oldest',
    });

    for (let more = 0; more < 60; more += 1) {
      await store.insertConnector({
        config: { endpoint: `http://filler-${more}` },
        kind: LLM_CONNECTOR_KIND,
        name: `filler-${String(more).padStart(3, '0')}`,
      });
    }

    const outcome = await ensureLlmConnector(store, CONFIGURED);

    expect(outcome.created).toBe(false);
    expect(outcome.total).toBe(61);
    expect(outcome.selected).toStrictEqual({
      connectorId: 1,
      connectorName: 'zzz-oldest',
      endpoint: 'http://oldest',
      model: null,
    });
  });
});

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/**
 * An outcome to render.
 *
 * @param created - Whether the pass wrote the row.
 * @param total - How many `llm` connectors there are.
 * @param selected - What the pipeline would read.
 * @returns The outcome.
 */
function outcomeOf(
  created: boolean,
  total: number,
  selected: ModelConnectorProjection,
): LlmConnectorOutcome {
  return { created, selected, total };
}

describe('formatLlmConnectorReport', () => {
  it('says what it created and what the deployment now carries', () => {
    const report = formatLlmConnectorReport(outcomeOf(true, 1, {
      connectorId: 4,
      connectorName: LLM_CONNECTOR_NAME,
      endpoint: 'http://e',
      model: 'm',
    }));

    expect(report).toContain('created one connector');
    expect(report).toContain(LLM_CONNECTOR_KIND);
    expect(report).toContain(LLM_CONNECTOR_NAME);
    expect(report).toContain('carries 1');
  });

  it('says when it created nothing and how many it found', () => {
    const report = formatLlmConnectorReport(outcomeOf(false, 3, {
      connectorId: 4,
      connectorName: 'x',
      endpoint: 'http://e',
      model: null,
    }));

    expect(report).toContain('created nothing');
    expect(report).toContain('already carries 3');
    expect(report).not.toContain('created one connector');
  });

  it('labels one line per projected column, in the SQL order', () => {
    const report = formatLlmConnectorReport(outcomeOf(false, 1, {
      connectorId: 4,
      connectorName: 'x',
      endpoint: 'http://e',
      model: 'm',
    }));
    const labelled = report.split('\n')
      .filter((line) => line.startsWith('  '))
      .map((line) => line.trim().split(/\s+/u)[0]);

    expect(labelled).toStrictEqual([...MODEL_PROJECTION_COLUMNS]);
  });

  it('prints a null bare and a value quoted', () => {
    const report = formatLlmConnectorReport(outcomeOf(false, 1, {
      connectorId: 4,
      connectorName: 'x',
      endpoint: null,
      model: null,
    }));

    expect(report).toContain('connector_id    4');
    expect(report).toContain('connector_name  \'x\'');
    expect(report).toContain('endpoint        null');
    expect(report).toContain('model           null');
  });

  it('shows a blank-looking endpoint as the value it is', () => {
    // Unquoted, this line and a null one would read the same, and
    // the difference is what decides whether a pass can call.
    const report = formatLlmConnectorReport(outcomeOf(false, 1, {
      connectorId: 4,
      connectorName: 'x',
      endpoint: '  ',
      model: null,
    }));

    expect(report).toContain('endpoint        \'  \'');
  });

  it('gives the verdict a null endpoint earns', () => {
    const unreachable = formatLlmConnectorReport(outcomeOf(false, 1, {
      connectorId: 4,
      connectorName: 'x',
      endpoint: null,
      model: 'm',
    }));
    const reachable = formatLlmConnectorReport(outcomeOf(false, 1, {
      connectorId: 4,
      connectorName: 'x',
      endpoint: 'http://e',
      model: null,
    }));

    expect(unreachable).toContain('nowhere to reach');
    expect(reachable).not.toContain('nowhere to reach');
    expect(reachable).toContain('somewhere to call');
  });
});

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

/** What one collected run wrote, and whatever stopped it. */
interface CapturedRun {
  /** One entry per write, in the order the run made them. */
  readonly written: readonly string[];

  /** How many times the connection was closed. */
  readonly closed: number;

  /** What it threw, or undefined where it returned. */
  readonly thrown: unknown;
}

/**
 * Run the command over a store, with the console collected rather
 * than printed.
 *
 * `console.log` is put back in a `finally`, so a run that threw
 * leaves the console as it found it and whatever the suite prints
 * next prints normally.
 *
 * @param store - The connectors surface to drive it over.
 * @param env - The environment to hand it.
 * @returns What it wrote, what it threw, and how often it closed.
 */
async function captureRun(
  store: ReturnType<typeof createMemoryResearchStore>,
  env: Readonly<Record<string, string | undefined>>,
): Promise<CapturedRun> {
  const written: string[] = [];
  const printed = console.log;
  let closed = 0;

  console.log = (...args: readonly unknown[]): void => {
    written.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    await runLlmConnectorCli(
      () => ({
        close: async () => {
          closed += 1;
        },
        store,
      }),
      env,
    );

    return { closed, thrown: undefined, written };
  } catch (thrown) {
    return { closed, thrown, written };
  } finally {
    console.log = printed;
  }
}

describe('runLlmConnectorCli', () => {
  it('prints the report once and lets go of the connection', async () => {
    const store = createMemoryResearchStore();
    const run = await captureRun(store, CONFIGURED);

    expect(run.thrown).toBeUndefined();
    expect(run.closed).toBe(1);
    expect(run.written).toHaveLength(1);
    expect(run.written[0]).toContain('created one connector');
    expect(run.written[0]).toContain(CONFIGURED[LLM_SETTING_NAMES.endpoint]);
    expect(await store.countConnectors({})).toBe(1);
  });

  it('lets go of the connection when the pass refused', async () => {
    const store = createMemoryResearchStore();
    const run = await captureRun(store, {});

    expect(run.thrown).toBeInstanceOf(UnsetModelEndpointError);
    expect(run.closed).toBe(1);
    expect(run.written).toStrictEqual([]);
  });
});
