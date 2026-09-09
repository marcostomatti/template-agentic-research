/**
 * `scripts/llm-connector.ts`'s `ensureLlmConnector`, driven over a
 * real Postgres through `createDbConnectorStore` rather than over
 * `MemoryResearchStore`. Self-skips when AR_LIVE_DATABASE_URL is
 * unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * `tests/scripts/llm-connector.test.ts` covers every DECISION the
 * command takes — the kind-keyed idempotency, the settings, the four
 * cases `configText` distinguishes, the report — with no database
 * anywhere in the run, and that file's own header says outright what
 * it cannot reach: whether the address a row carries answers, and
 * whether Postgres agrees with the port. This file is the second
 * half, over three claims the task names.
 *
 * A FIRST RUN CREATES EXACTLY ONE `llm` ROW. Proven by a real INSERT
 * against `connectors_kind_check` and `connectors_kind_name_unique`
 * — the two mechanisms `src/connectors/db-store.ts` argues at length
 * and neither of which a `MemoryResearchStore` write can violate — and
 * by a real `count(*)` read afterwards rather than by the command's
 * own account of itself.
 *
 * A RERUN CREATES NOTHING AND REPORTS THE SAME ROW. The read that
 * decides this — `countConnectors({ kind: 'llm' })` then, on a hit,
 * `projectModelConnector` over the widened list — is a real
 * round trip each time, so this is where a mistaken `WHERE` or a
 * dropped filter would surface as a second row rather than as a
 * green case over an in-memory map that never had one to miss.
 *
 * A ROW WHOSE ENDPOINT IS ABSENT, NON-STRING OR EMPTY READS AS
 * UNREACHABLE. `configText` in `scripts/llm-connector.ts` is a pure
 * re-implementation of `jsonb_typeof(...) = 'string'` plus
 * `nullif(..., '')`, and the strongest thing a unit test can do with
 * it is agree with its own transcription. What only a live row can
 * prove is that a JS object handed to `insertConnector` — a bare
 * number for the non-string case included — comes back out through
 * the real `pg`/drizzle jsonb round trip as the same TYPED value it
 * went in as, which is the premise `configText`'s `typeof value !==
 * 'string'` branch rests on. Nothing in this package registers a
 * custom `pg` type parser for jsonb (grepped for `setTypeParser` and
 * found none), so this is the driver's stock behaviour and not a
 * local override — worth proving live for exactly that reason. A
 * reachable positive control sits beside the three unreachable cases:
 * an unreachable-only file cannot tell a working read from one that
 * always answers null.
 *
 * `resetTables` includes `connectors` and runs `RESTART IDENTITY`, so
 * every case below starts from an empty table and the first row any
 * case writes is `id = 1` — asserted rather than assumed, since it is
 * part of what `projectModelConnector` reports back.
 *
 * `store` is built at describe scope over the `() => db` thunk and
 * touches nothing before `beforeAll` assigns it, the one construction
 * `tests/live/api-wave2.live.test.ts` makes the same choice for and
 * for the same reason: it is a free liveness leg for the deferral
 * claim, since a thunk resolved eagerly here would capture `undefined`
 * and redden every case in this file rather than only the ones that
 * touch it.
 */
import type { LlmEnv } from '../../scripts/llm-connector.js';
import type { ConnectorStore } from '../../src/connectors/store.js';
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  LLM_CONNECTOR_KIND,
  LLM_CONNECTOR_NAME,
  LLM_SETTING_NAMES,
  ensureLlmConnector,
  formatLlmConnectorReport,
} from '../../scripts/llm-connector.js';
import { createDbConnectorStore } from '../../src/connectors/db-store.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * An environment naming both settings, matching
 * `tests/scripts/llm-connector.test.ts`'s `CONFIGURED` so a reader
 * holding the two files side by side sees the same shape answer the
 * same way.
 */
const CONFIGURED: LlmEnv = {
  [LLM_SETTING_NAMES.endpoint]: 'http://host.docker.internal:11434/v1',
  [LLM_SETTING_NAMES.model]: 'a-live-model',
};

/** What the write branch stores when {@link CONFIGURED} drives it. */
const CONFIGURED_SELECTED = {
  connectorId: 1,
  connectorName: LLM_CONNECTOR_NAME,
  endpoint: CONFIGURED[LLM_SETTING_NAMES.endpoint],
  model: CONFIGURED[LLM_SETTING_NAMES.model],
};

/**
 * One config this module did not write, and what reading its
 * endpoint back through a real round trip is supposed to answer.
 *
 * Every entry projects null: these three are the absent, non-string
 * and empty arms `configText` distinguishes from a genuine address.
 * The fourth, reachable arm is a separate case below rather than a
 * fourth row here, since its assertions are the opposite shape.
 */
interface UnreachableCase {
  /** What the case is about. */
  readonly reading: string;

  /** The `config` a row is planted with. */
  readonly config: Readonly<Record<string, unknown>>;
}

const UNREACHABLE_CASES: readonly UnreachableCase[] = [
  {
    config: { model: 'already-configured' },
    reading: 'an absent endpoint member',
  },
  {
    config: { endpoint: 8080 },
    reading: 'a non-string endpoint',
  },
  {
    config: { endpoint: '' },
    reading: 'the empty string',
  },
];

describeLivePg('ensureLlmConnector (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  const store: ConnectorStore = createDbConnectorStore(() => db);

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);
    db = createLiveDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  it('creates exactly one llm row on a first run', async () => {
    // The empty table, read back rather than assumed — the same
    // discipline `tests/live/seed.live.test.ts` argues for: a
    // `created: true` this case does not itself earn is a claim
    // about the wrong thing if `resetTables` missed this table.
    expect(await store.countConnectors({ kind: LLM_CONNECTOR_KIND }))
      .toBe(0);

    const outcome = await ensureLlmConnector(store, CONFIGURED);

    expect(outcome.created).toBe(true);
    expect(outcome.total).toBe(1);
    expect(outcome.selected).toStrictEqual(CONFIGURED_SELECTED);

    // A real `count(*)`, independent of the outcome the command
    // handed back — its own account of itself is not evidence about
    // what the table holds.
    expect(await store.countConnectors({ kind: LLM_CONNECTOR_KIND }))
      .toBe(1);

    // And the stored row itself, read back by id rather than
    // re-derived: what a first run wrote is a row of this module's
    // own kind and name, carrying exactly the two settings and no
    // third member.
    const stored = await store.findConnectorById(1);

    expect(stored?.kind).toBe(LLM_CONNECTOR_KIND);
    expect(stored?.name).toBe(LLM_CONNECTOR_NAME);
    expect(stored?.config).toStrictEqual({
      endpoint: CONFIGURED[LLM_SETTING_NAMES.endpoint],
      model: CONFIGURED[LLM_SETTING_NAMES.model],
    });
  });

  it('creates nothing on a rerun and reports the same row', async () => {
    const first = await ensureLlmConnector(store, CONFIGURED);
    const second = await ensureLlmConnector(store, CONFIGURED);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.total).toBe(1);

    // The claim the task names: a rerun reports the SAME row rather
    // than a row that merely looks alike, so the two outcomes'
    // `selected` halves are held to each other and not only to the
    // fixture.
    expect(second.selected).toStrictEqual(first.selected);

    // A rerun that mis-keyed on the name rather than the kind would
    // find CONFIGURED's row absent under a differently-set
    // environment and write a second, younger one — which is exactly
    // what a real unique constraint would still allow, since the two
    // would carry different names. The row count is what a wrongly
    // name-keyed rerun could not pass.
    const third = await ensureLlmConnector(store, {
      [LLM_SETTING_NAMES.endpoint]: 'http://elsewhere:9999/v1',
      [LLM_SETTING_NAMES.model]: 'a-different-model',
    });

    expect(third.created).toBe(false);
    expect(third.selected).toStrictEqual(first.selected);
    expect(await store.countConnectors({ kind: LLM_CONNECTOR_KIND }))
      .toBe(1);
  });

  describe('a stored row this module did not write', () => {
    it('has a case for every reading this file means to cover', () => {
      // The guard the generated block below needs: an emptied roster
      // would take every generated case with it and leave the block
      // green over nothing.
      expect(UNREACHABLE_CASES.length).toBeGreaterThanOrEqual(3);
      expect(new Set(UNREACHABLE_CASES.map((one) => one.reading)).size)
        .toBe(UNREACHABLE_CASES.length);
    });

    for (const one of UNREACHABLE_CASES) {
      it(`reports ${one.reading} as one the pipeline cannot reach`, async () => {
        await store.insertConnector({
          config: one.config,
          kind: LLM_CONNECTOR_KIND,
          name: 'planted',
        });

        // The branch that writes is never reached — a row of this
        // kind already exists — so an empty environment is enough,
        // and it doubles as the read-through-existing-row leg
        // `tests/scripts/llm-connector.test.ts` covers with a store
        // double.
        const outcome = await ensureLlmConnector(store, {});

        expect(outcome.created).toBe(false);
        expect(outcome.selected.connectorId).toBe(1);
        expect(outcome.selected.endpoint).toBeNull();
        expect(formatLlmConnectorReport(outcome))
          .toContain('nowhere to reach');
      });
    }

    it('the positive control: a real endpoint reads back as reachable', async () => {
      // Without this case, every assertion above would pass just as
      // readily against a projection that always answered null —
      // the axis this case varies is the same config member, planted
      // with a genuine value instead of one of the three that are
      // not.
      await store.insertConnector({
        config: {
          endpoint: 'http://host.docker.internal:11434/v1',
          model: 'a-model',
        },
        kind: LLM_CONNECTOR_KIND,
        name: 'planted',
      });

      const outcome = await ensureLlmConnector(store, {});

      expect(outcome.created).toBe(false);
      expect(outcome.selected).toStrictEqual({
        connectorId: 1,
        connectorName: 'planted',
        endpoint: 'http://host.docker.internal:11434/v1',
        model: 'a-model',
      });

      const report = formatLlmConnectorReport(outcome);

      expect(report).not.toContain('nowhere to reach');
      expect(report).toContain('somewhere to call');
    });
  });
});
