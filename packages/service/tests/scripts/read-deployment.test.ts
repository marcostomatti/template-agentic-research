/**
 * What `scripts/read-deployment.ts` sends and what each of its legs
 * exits with, in front of a stub fetch and a recording database
 * client, with no instance and no database anywhere in the run.
 *
 * THE FIRST BLOCK IS THE REFUSALS. A command line naming no single
 * leg is refused, near misses of a leg's spelling included, and every
 * leg with the key unset is refused as `UnconfiguredInstanceError`
 * having made no request, sent no statement and opened no database.
 * That absence is worth what the stub it was read off is worth, so
 * the block closes on the same four legs with the key set, each of
 * which reaches its seam.
 *
 * THEN ONE BLOCK PER LEG, each reading the exit code the command
 * answers rather than the verdict's status alone, and each ordered
 * the way `tests/scripts/deployment-verdict.test.ts` orders its
 * blocks: unreadable first, then unhealthy, then healthy. The
 * `workflows` block reads this package's own workflow sources, so the
 * instance it is held against is built from what `workflows/src/`
 * declares rather than from names written here.
 *
 * THE READ-ONLY BLOCK is the one the module's first promise rests on.
 * Every request the two instance legs make, over healthy, unhealthy,
 * refused and paged runs, is recorded as a `GET`, and the recorder is
 * shown to record a `POST` when one is handed to it. Every statement
 * the two database legs send is held whole and read as a single
 * `SELECT`, and the predicate that says so is shown refusing a delete,
 * a delete behind a `SELECT`, and a delete inside a `WITH`.
 *
 * Nothing here reaches the `INVOKED_AS_CLI` block or `pg`'s `Pool`:
 * every run hands over its own fetch and its own database, and the
 * base URL is a `.invalid` host that resolves nowhere.
 *
 * Measured that these cases can fail, by planting twelve mutations in
 * the module one at a time and restoring it after each. Eleven
 * reddened at least one case: readiness sent as a POST, readiness
 * carrying the key, the connector statement wrapped around a delete,
 * the pre-flight removed, a system error's address kept in its
 * reason, the database never closed, the listing skipped once the
 * sources failed, a text id left unconverted, the 403 reading
 * dropped, an untyped node accepted, and the instance's body quoted
 * in a reason. The twelfth reddened none: dropping the check that
 * holds each source file to the name `expectedNames` read at its
 * position. Both walks agree on every tree a case can plant, so that
 * check stands behind a drift nothing here reaches. The unmutated
 * module reddened no case.
 */
import type { InstanceSettings } from '../../scripts/deploy-external.js';
import type { SourceWorkflow } from '../../scripts/deployment-verdict.js';
import type { HttpFetch, HttpRequest, RemoteWorkflow } from '../../scripts/n8n-client.js';
import type {
  DeploymentDatabase,
  ReadDeploymentOptions,
} from '../../scripts/read-deployment.js';

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { expectedNames } from '../../scripts/audit-workflows.js';
import { WORKFLOW_SOURCE_DIR } from '../../scripts/build-workflows.js';
import { UnconfiguredInstanceError } from '../../scripts/deploy-external.js';
import { CONNECTOR_REACH_LIMIT, LEG_NAMES } from '../../scripts/deployment-verdict.js';
import { readMigrationJournal } from '../../scripts/migration-ledger.js';
import { createWorkflow, deactivateWorkflow } from '../../scripts/n8n-client.js';
import { activatableTriggers } from '../../scripts/n8n-workflow.js';
import {
  LegArgumentError,
  legOf,
  readSourceWorkflows,
  runReadDeploymentCli,
} from '../../scripts/read-deployment.js';

// ---------------------------------------------------------------------------
// The deployment these runs are pointed at
// ---------------------------------------------------------------------------

/** A reserved `.invalid` host, which resolves nowhere. */
const BASE_URL = 'https://read-deployment.invalid';

/** A key no real instance issued, so a reading of it is about this value. */
const API_KEY = 'zzreaddeploymentkeyzz';

/** Both settings answered for. */
const SETTINGS: InstanceSettings = { apiKey: API_KEY, baseUrl: BASE_URL };

/** The near miss: the same pair with nothing set for the key. */
const UNSET_KEY: InstanceSettings = { ...SETTINGS, apiKey: undefined };

/** The readiness request, at the instance root. */
const READINESS_URL = `${BASE_URL}/healthz/readiness`;

/** The first listing request, under the API. */
const LISTING_URL = `${BASE_URL}/api/v1/workflows?limit=250`;

/** The statement the ledger reader sends, spelled here rather than imported. */
const LEDGER_STATEMENT = 'SELECT "created_at" FROM drizzle."__drizzle_migrations" ORDER BY "id"';

/** The statement the connector leg sends, spelled here rather than imported. */
const CONNECTOR_STATEMENT
  = 'SELECT "id", "kind", "name", "config" FROM "connectors" WHERE "kind" = \'llm\' ORDER BY "id"';

/** Where planted source trees are written; removed when the file ends. */
const PLANT_DIR = mkdtempSync(join(tmpdir(), 'ar-read-deployment-'));

afterAll(() => {
  rmSync(PLANT_DIR, { force: true, recursive: true });
});

// ---------------------------------------------------------------------------
// The stub fetch
// ---------------------------------------------------------------------------

/** One request, as the stub was handed it. */
interface RecordedCall {
  /** The method and headers. */
  readonly init: HttpRequest;

  /** The absolute URL. */
  readonly url: string;
}

/** What an instance answers one request with. */
interface Reply {
  /** The body, as text. */
  readonly body: string;

  /** The HTTP status. */
  readonly status: number;
}

/**
 * An instance, as a function of the request: a reply, or the error a
 * request that got no reply rejects with.
 */
type Instance = (call: RecordedCall) => Error | Reply;

/**
 * A fresh stub fetch, recording every request it is handed.
 *
 * @param instance - What answers each request.
 * @returns The calls so far and the fetch that records them.
 */
function recorder(instance: Instance): { readonly calls: readonly RecordedCall[]; readonly fetch: HttpFetch } {
  const calls: RecordedCall[] = [];

  return {
    calls,
    fetch: (url, init) => {
      const call = { init, url };

      calls.push(call);

      const reply = instance(call);

      if (reply instanceof Error) {
        return Promise.reject(reply);
      }

      return Promise.resolve({
        ok: reply.status >= 200 && reply.status < 300,
        status: reply.status,
        text: () => Promise.resolve(reply.body),
      });
    },
  };
}

/**
 * A listing page as body text.
 *
 * @param workflows - The workflows on the page.
 * @param nextCursor - The cursor after it, or `null` on the last page.
 * @returns The page.
 */
function page(workflows: readonly RemoteWorkflow[], nextCursor: string | null = null): string {
  return JSON.stringify({ data: workflows, nextCursor });
}

/**
 * An instance answering readiness with `readiness` and the listing
 * with `workflows` on one page, and 404 to anything else.
 *
 * @param readiness - The readiness status.
 * @param workflows - What the listing holds.
 * @returns The instance.
 */
function instanceHolding(readiness: number, workflows: readonly RemoteWorkflow[]): Instance {
  return (call) => {
    if (call.url.endsWith('/healthz/readiness')) {
      return { body: '{}', status: readiness };
    }

    if (call.url.includes('/api/v1/workflows?limit=250')) {
      return { body: page(workflows), status: 200 };
    }

    return { body: '{"message":"not found"}', status: 404 };
  };
}

// ---------------------------------------------------------------------------
// The recording database
// ---------------------------------------------------------------------------

/** What a database answers one statement with: rows, or an error. */
type Database = (statement: string) => Error | readonly unknown[];

/** A recording database and what it has seen. */
interface DatabaseRecord {
  /** How many times it was closed. */
  readonly closed: () => number;

  /** What a run is handed as its `connect`. */
  readonly connect: () => DeploymentDatabase;

  /** How many times it was opened. */
  readonly opened: () => number;

  /** Every statement sent, in order. */
  readonly statements: readonly string[];
}

/**
 * A fresh recording database.
 *
 * @param database - What answers each statement.
 * @returns The record and the `connect` that writes to it.
 */
function recordingDatabase(database: Database): DatabaseRecord {
  const statements: string[] = [];
  const counts = { closed: 0, opened: 0 };

  return {
    closed: () => counts.closed,
    connect: () => {
      counts.opened += 1;

      return {
        client: {
          query: (text) => {
            statements.push(text);

            const rows = database(text);

            return rows instanceof Error
              ? Promise.reject(rows)
              : Promise.resolve({ rows });
          },
        },
        close: () => {
          counts.closed += 1;

          return Promise.resolve();
        },
      };
    },
    opened: () => counts.opened,
    statements,
  };
}

/** The package journal's stamps, as ledger rows the driver answers. */
function ledgerRows(): readonly unknown[] {
  return readMigrationJournal().map((entry) => ({ created_at: String(entry.when) }));
}

/** An `llm` connector row as `pg` answers one: the `bigint` id as text. */
const MODEL_ROW = {
  config: { endpoint: 'http://model.invalid/v1', model: 'zzmodelzz' },
  id: '7',
  kind: 'llm',
  name: 'default',
};

/**
 * A database answering the ledger and the connector statements with
 * the rows given, and refusing any other statement.
 *
 * @param ledger - The ledger rows.
 * @param connectors - The connector rows.
 * @returns The database.
 */
function databaseHolding(ledger: readonly unknown[], connectors: readonly unknown[]): Database {
  return (statement) => {
    if (statement === LEDGER_STATEMENT) {
      return ledger;
    }

    if (statement === CONNECTOR_STATEMENT) {
      return connectors;
    }

    return new Error(`unexpected statement: ${statement}`);
  };
}

/** A database whose connection is refused, as `pg` reports one. */
function refusedDatabase(): Error {
  return Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:55432'), {
    address: '127.0.0.1',
    code: 'ECONNREFUSED',
    port: 55432,
    syscall: 'connect',
  });
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

/** Stands in for the thrown value when the run returned. */
const RETURNED = Symbol('nothing thrown');

/** One run, as the stub, the database and the console saw it. */
interface LegRun {
  /** Every request, in order. */
  readonly calls: readonly RecordedCall[];

  /** The exit code returned, or `undefined` where the run threw. */
  readonly code: number | undefined;

  /** How many times the database was closed. */
  readonly closed: number;

  /** Every line written. */
  readonly lines: readonly string[];

  /** How many times the database was opened. */
  readonly opened: number;

  /** Every statement, in order. */
  readonly statements: readonly string[];

  /** What was thrown, or {@link RETURNED}. */
  readonly thrown: unknown;
}

/** What a run may be configured with; every member has a default. */
interface RunSetup {
  readonly connect?: () => DeploymentDatabase;
  readonly database?: Database;
  readonly instance?: Instance;
  readonly settings?: InstanceSettings;
  readonly sourceDir?: string;
}

/**
 * Run the command over one command line, against a stub and a
 * database of its own, collecting what it wrote.
 *
 * @param argv - The arguments after the script path.
 * @param setup - The seams to configure the run with.
 * @returns Everything the run produced.
 */
async function run(argv: readonly string[], setup: RunSetup = {}): Promise<LegRun> {
  const stub = recorder(setup.instance ?? instanceHolding(200, []));
  const database = recordingDatabase(setup.database ?? databaseHolding(ledgerRows(), [MODEL_ROW]));
  const options: ReadDeploymentOptions = {
    connect: setup.connect ?? database.connect,
    fetch: stub.fetch,
    settings: setup.settings ?? SETTINGS,
    sourceDir: setup.sourceDir ?? WORKFLOW_SOURCE_DIR,
  };
  const written: string[] = [];
  const printed = { error: console.error, log: console.log };
  const collect = (...args: readonly unknown[]): void => {
    written.push(args.map((arg) => String(arg)).join(' '));
  };
  const finish = (code: number | undefined, thrown: unknown): LegRun => ({
    calls: stub.calls,
    closed: database.closed(),
    code,
    lines: written.flatMap((entry) => entry.split('\n')),
    opened: database.opened(),
    statements: database.statements,
    thrown,
  });

  console.error = collect;
  console.log = collect;

  try {
    return finish(await runReadDeploymentCli(argv, options), RETURNED);
  } catch (thrown) {
    return finish(undefined, thrown);
  } finally {
    console.error = printed.error;
    console.log = printed.log;
  }
}

/**
 * The package's workflow sources, and an instance holding each once,
 * armed exactly where its source arms.
 *
 * @returns The sources and that listing.
 */
function levelDeployment(): {
  readonly listing: readonly RemoteWorkflow[];
  readonly sources: readonly SourceWorkflow[];
} {
  const sources = readSourceWorkflows(WORKFLOW_SOURCE_DIR);

  return {
    listing: sources.map((source, index) => ({
      active: activatableTriggers(source).length > 0,
      id: `w${String(index)}`,
      name: source.name,
    })),
    sources,
  };
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

describe('legOf', () => {
  it('refuses a command line naming no leg, naming every leg it takes', () => {
    expect(() => legOf([])).toThrow(LegArgumentError);
    expect(() => legOf([])).toThrow('one of instance, workflows, schema, connector');
  });

  it('refuses two legs, although each is a leg', () => {
    expect(() => legOf(['instance', 'schema'])).toThrow(LegArgumentError);
  });

  it('refuses near misses of a leg spelling, quoting what was typed', () => {
    for (const nearMiss of ['Instance', 'instance ', 'workflow', 'connectors', '']) {
      expect(() => legOf([nearMiss])).toThrow(JSON.stringify(nearMiss));
    }
  });

  it('answers each leg handed alone', () => {
    expect(LEG_NAMES.map((leg) => legOf([leg]))).toEqual([...LEG_NAMES]);
  });
});

describe('the pre-flight', () => {
  it('refuses every leg with the key unset, before any request, statement or connection', async () => {
    for (const leg of LEG_NAMES) {
      const refused = await run([leg], { settings: UNSET_KEY });

      expect(refused.thrown).toBeInstanceOf(UnconfiguredInstanceError);
      expect((refused.thrown as UnconfiguredInstanceError).settings).toEqual(['AR_N8N_API_KEY']);
      expect(refused.calls).toEqual([]);
      expect(refused.statements).toEqual([]);
      expect(refused.opened).toBe(0);
    }
  });

  it('reads the command line before the settings', async () => {
    const refused = await run(['nothing'], { settings: UNSET_KEY });

    expect(refused.thrown).toBeInstanceOf(LegArgumentError);
    expect(refused.calls).toEqual([]);
  });

  it('lets each leg reach its seam once the key is set, which is what the absence above is held against', async () => {
    const reached = await Promise.all(LEG_NAMES.map((leg) => run([leg])));

    expect(reached.map((each) => each.thrown)).toEqual(LEG_NAMES.map(() => RETURNED));
    expect(reached.map((each) => each.calls.length + each.statements.length > 0)).toEqual(
      LEG_NAMES.map(() => true),
    );
  });
});

// ---------------------------------------------------------------------------
// instance
// ---------------------------------------------------------------------------

describe('the instance leg', () => {
  it('exits 2 when the request got no reply', async () => {
    const unread = await run(['instance'], {
      instance: () => new Error('Unable to connect. Is the computer able to access the url?'),
    });

    expect(unread.code).toBe(2);
    expect(unread.lines).toContain(
      'instance: readiness could not be read: Unable to connect. Is the computer able to access the url?',
    );
  });

  it('exits 2 for a status the readiness route does not give', async () => {
    expect((await run(['instance'], { instance: instanceHolding(404, []) })).code).toBe(2);
  });

  it('exits 1 for 503, and 0 for 200', async () => {
    expect((await run(['instance'], { instance: instanceHolding(503, []) })).code).toBe(1);

    const healthy = await run(['instance'], { instance: instanceHolding(200, []) });

    expect(healthy.code).toBe(0);
    expect(healthy.lines.at(-1)).toBe('instance: healthy, exit 0');
  });

  it('asks readiness at the instance root with no key, however the base URL is spelled', async () => {
    for (const baseUrl of [BASE_URL, `${BASE_URL}/`, `${BASE_URL}/api/v1`, ` ${BASE_URL}/api/v1/ `]) {
      const settings = { ...SETTINGS, baseUrl };
      const ready = await run(['instance'], { settings });
      const listed = await run(['workflows'], { settings });

      expect(ready.calls.map((call) => call.url)).toEqual([READINESS_URL]);
      expect(ready.calls[0]?.init.headers).not.toHaveProperty('X-N8N-API-KEY');

      // The control: the listing through the same spelling is under the
      // API, and carries the key readiness was not sent.
      expect(listed.calls.map((call) => call.url)).toEqual([LISTING_URL]);
      expect(listed.calls[0]?.init.headers).toHaveProperty('X-N8N-API-KEY', API_KEY);
    }
  });
});

// ---------------------------------------------------------------------------
// workflows
// ---------------------------------------------------------------------------

describe('the workflows leg', () => {
  it('exits 2 when the listing is refused, naming the status and the scope and no missing workflow', async () => {
    const refused = await run(['workflows'], {
      instance: () => ({ body: '{"message":"Forbidden"}', status: 403 }),
    });

    expect(refused.code).toBe(2);
    expect(refused.lines).toContain(
      'workflows: the instance could not be listed: the instance answered GET '
      + '/workflows?limit=250 with 403, which is a key without the workflow:list scope',
    );
    expect(refused.lines.some((line) => line.includes('missing'))).toBe(false);
    expect(refused.lines.some((line) => line.includes('Forbidden'))).toBe(false);
  });

  it('takes the listing even where the sources cannot be read, and names both failures', async () => {
    const both = await run(['workflows'], {
      instance: () => ({ body: '{}', status: 401 }),
      sourceDir: join(PLANT_DIR, 'absent'),
    });

    expect(both.code).toBe(2);
    expect(both.calls).toHaveLength(1);
    expect(both.lines.filter((line) => line.startsWith('workflows: the workflow sources could not be read: '))).toHaveLength(1);
    expect(both.lines.filter((line) => line.startsWith('workflows: the instance could not be listed: '))).toHaveLength(1);
  });

  it('exits 2 over a source directory declaring no workflow', async () => {
    const empty = join(PLANT_DIR, 'empty');

    mkdirSync(empty);

    const unread = await run(['workflows'], { sourceDir: empty });

    expect(unread.code).toBe(2);
    expect(unread.lines[0]).toContain('declare no workflow');
  });

  it('exits 1 when each armable workflow in turn sits inert', async () => {
    const { listing, sources } = levelDeployment();
    const armable = sources.filter((source) => activatableTriggers(source).length > 0);

    expect(armable.length).toBeGreaterThan(0);

    for (const source of armable) {
      const disarmed = listing.map((workflow) => workflow.name === source.name
        ? { ...workflow, active: false }
        : workflow);
      const unhealthy = await run(['workflows'], { instance: instanceHolding(200, disarmed) });

      expect(unhealthy.code).toBe(1);
      expect(unhealthy.lines.filter((line) => line.startsWith(`workflows: inactive ${source.name} (inert)`))).toHaveLength(1);
    }
  });

  it('exits 0 over each source held once and armed where it arms, a stray beside them reported', async () => {
    const { listing } = levelDeployment();
    const healthy = await run(['workflows'], {
      instance: instanceHolding(200, [...listing, { active: true, id: 's1', name: 'Someone Else' }]),
    });

    expect(healthy.code).toBe(0);
    expect(healthy.lines).toContain('workflows: stray Someone Else (armed) id s1: no source declares it, reported and not failed');
  });

  it('reads every page of the listing before it judges', async () => {
    const { listing } = levelDeployment();
    const half = Math.ceil(listing.length / 2);
    const paged = await run(['workflows'], {
      instance: (call) => ({
        body: call.url.includes('cursor=page-2')
          ? page(listing.slice(half))
          : page(listing.slice(0, half), 'page-2'),
        status: 200,
      }),
    });

    expect(paged.calls.map((call) => call.url)).toEqual([LISTING_URL, `${LISTING_URL}&cursor=page-2`]);
    expect(paged.code).toBe(0);
  });
});

describe('readSourceWorkflows', () => {
  it('refuses a source whose nodes are not a list, naming the file', () => {
    const dir = join(PLANT_DIR, 'no-nodes');

    mkdirSync(dir);
    writeFileSync(join(dir, 'broken.json'), JSON.stringify({ name: 'Broken', nodes: {} }));

    expect(() => readSourceWorkflows(dir)).toThrow(`${join(dir, 'broken.json')} carries no list of nodes`);
  });

  it('refuses a node naming no type', () => {
    const dir = join(PLANT_DIR, 'untyped-node');

    mkdirSync(dir);
    writeFileSync(join(dir, 'untyped.json'), JSON.stringify({ name: 'Untyped', nodes: [{ name: 'x' }] }));

    expect(() => readSourceWorkflows(dir)).toThrow('carries no list of nodes each naming a type');
  });

  it('passes over what the audit walk passes over, reading the sources beside it', () => {
    const dir = join(PLANT_DIR, 'walk');

    mkdirSync(join(dir, 'nested.json'), { recursive: true });
    writeFileSync(join(dir, 'README.md'), '# not a source');
    writeFileSync(join(dir, 'b.json'), JSON.stringify({ name: 'Second', nodes: [] }));
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ name: 'First', nodes: [{ type: 'n8n-nodes-base.code' }] }));

    expect(readSourceWorkflows(dir)).toEqual([
      { name: 'First', nodes: [{ type: 'n8n-nodes-base.code' }] },
      { name: 'Second', nodes: [] },
    ]);
    expect(expectedNames({ sourceDir: dir })).toEqual(['First', 'Second']);
  });

  it('reads the package sources under the names expectedNames reads, armable and manual-only both', () => {
    const sources = readSourceWorkflows(WORKFLOW_SOURCE_DIR);
    const armable = sources.filter((source) => activatableTriggers(source).length > 0);

    expect(sources.map((source) => source.name)).toEqual(expectedNames({ sourceDir: WORKFLOW_SOURCE_DIR }));
    expect(armable.length).toBeGreaterThan(0);
    expect(armable.length).toBeLessThan(sources.length);
  });
});

// ---------------------------------------------------------------------------
// schema
// ---------------------------------------------------------------------------

describe('the schema leg', () => {
  it('exits 2 when the connection is refused, naming the call and code and not the address', async () => {
    const refusal = refusedDatabase();
    const unread = await run(['schema'], { database: () => refusal });

    expect(unread.code).toBe(2);
    expect(unread.lines).toContain('schema: the migration ledger could not be read: connect ECONNREFUSED');

    // The control: the error handed over does carry the address, so its
    // absence from every line is the module leaving it out.
    expect(refusal.message).toContain('127.0.0.1');
    expect(unread.lines.some((line) => line.includes('127.0.0.1'))).toBe(false);
  });

  it('exits 2 when the database cannot be opened, having made no request', async () => {
    const unopened = await run(['schema'], {
      connect: () => {
        throw new Error('the pool could not be built');
      },
    });

    expect(unopened.code).toBe(2);
    expect(unopened.lines).toContain('schema: the migration ledger could not be read: the pool could not be built');
    expect(unopened.calls).toEqual([]);
  });

  it('exits 2 for a ledger row carrying no stamp', async () => {
    const unread = await run(['schema'], { database: databaseHolding([{ id: 1 }], []) });

    expect(unread.code).toBe(2);
    expect(unread.lines[0]).toContain('names no migration');
  });

  it('exits 1 naming the newest tag pending once the newest ledger row is gone', async () => {
    const journal = readMigrationJournal();
    const behind = await run(['schema'], { database: databaseHolding(ledgerRows().slice(0, -1), []) });

    expect(behind.code).toBe(1);
    expect(behind.lines).toContain(
      `schema: pending ${journal.at(-1)?.tag ?? '<empty journal>'}: the journal names it and the ledger holds no row for it`,
    );
  });

  it('exits 0 for a ledger naming the journal in full, closing the database it opened', async () => {
    const level = await run(['schema']);

    expect(level.code).toBe(0);
    expect([level.opened, level.closed]).toEqual([1, 1]);
  });

  it('closes the database after a refused statement too', async () => {
    const refused = await run(['schema'], { database: () => refusedDatabase() });

    expect([refused.opened, refused.closed]).toEqual([1, 1]);
  });
});

// ---------------------------------------------------------------------------
// connector
// ---------------------------------------------------------------------------

describe('the connector leg', () => {
  it('exits 2 when the statement is refused, still printing its limit', async () => {
    const unread = await run(['connector'], {
      database: () => Object.assign(new Error('relation "connectors" does not exist'), { code: '42P01' }),
    });

    expect(unread.code).toBe(2);
    expect(unread.lines).toContain(
      'connector: the connectors could not be read: relation "connectors" does not exist (42P01)',
    );
    expect(unread.lines).toContain(`connector: ${CONNECTOR_REACH_LIMIT}`);
  });

  it('exits 2 for a row whose id is not an integer', async () => {
    for (const id of ['7a', 7.5, null]) {
      const unread = await run(['connector'], { database: databaseHolding([], [{ ...MODEL_ROW, id }]) });

      expect(unread.code).toBe(2);
    }
  });

  it('exits 1 where no llm row is selected', async () => {
    const none = await run(['connector'], { database: databaseHolding([], []) });

    expect(none.code).toBe(1);
  });

  it('exits 0 for a row whose bigint id arrives as text, printing neither its endpoint nor its model', async () => {
    const healthy = await run(['connector']);

    expect(healthy.code).toBe(0);
    expect(healthy.lines[0]).toBe('connector: connector 7 named default projects an endpoint and a model name');
    expect(healthy.lines.some((line) => line.includes('model.invalid') || line.includes('zzmodelzz'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Read-only
// ---------------------------------------------------------------------------

/**
 * Whether a statement is one `SELECT` and nothing more.
 *
 * @param statement - The statement as sent.
 * @returns Whether it opens on `SELECT` and carries no second statement.
 */
function isSingleSelect(statement: string): boolean {
  return /^SELECT\s/u.test(statement) && !statement.includes(';');
}

describe('read-only', () => {
  it('records every request the instance legs make as a GET, over every kind of run', async () => {
    const { listing } = levelDeployment();
    const disarmed = listing.map((workflow) => ({ ...workflow, active: false }));
    const runs = await Promise.all([
      run(['instance'], { instance: instanceHolding(200, []) }),
      run(['instance'], { instance: instanceHolding(503, []) }),
      run(['instance'], { instance: () => new Error('no reply') }),
      run(['workflows'], { instance: instanceHolding(200, listing) }),
      run(['workflows'], { instance: instanceHolding(200, disarmed) }),
      run(['workflows'], { instance: () => ({ body: '{}', status: 403 }) }),
      run(['workflows'], {
        instance: (call) => ({
          body: call.url.includes('cursor=')
            ? page([])
            : page(listing, 'next'),
          status: 200,
        }),
      }),
    ]);
    const calls = runs.flatMap((each) => each.calls);

    expect(calls.length).toBeGreaterThanOrEqual(runs.length + 1);
    expect(new Set(calls.map((call) => call.init.method))).toEqual(new Set(['GET']));
    expect(runs.map((each) => each.statements)).toEqual(runs.map(() => []));
  });

  it('records a POST when one is handed to the same recorder, so a GET-only reading could fail', async () => {
    const stub = recorder(() => ({ body: '{"id":"w1","active":false}', status: 200 }));
    const instance = { apiKey: API_KEY, baseUrl: BASE_URL, fetch: stub.fetch };

    await deactivateWorkflow(instance, 'w1');
    await createWorkflow(instance, { connections: {}, name: 'x', nodes: [], settings: {} });

    expect(stub.calls.map((call) => call.init.method)).toEqual(['POST', 'POST']);
  });

  it('records every statement the database legs send as one SELECT, held whole', async () => {
    const schema = await run(['schema']);
    const connector = await run(['connector']);
    const statements = [...schema.statements, ...connector.statements];

    expect(statements).toEqual([LEDGER_STATEMENT, CONNECTOR_STATEMENT]);
    expect(statements.every(isSingleSelect)).toBe(true);
    expect([schema.calls, connector.calls]).toEqual([[], []]);
  });

  it('refuses a delete, a delete behind a SELECT and a delete inside a WITH as a single SELECT', () => {
    expect(isSingleSelect('DELETE FROM "connectors"')).toBe(false);
    expect(isSingleSelect('SELECT 1; DELETE FROM "connectors"')).toBe(false);
    expect(isSingleSelect('WITH gone AS (DELETE FROM "connectors" RETURNING "id") SELECT "id" FROM gone')).toBe(false);
  });
});
