/**
 * What `scripts/deployment-verdict.ts` makes of a deployment's readings,
 * asked with no deployment anywhere in the run. Every verdict there is
 * pure, so every reading here is a literal, or a value the module's own
 * readers build from literals, and nothing is stubbed.
 *
 * One block per verdict, in the order a verification reaches the legs,
 * then the report lines and the exit codes. Inside every block the
 * refusals come first — a reading that could not be taken, then a
 * reading that found a fault — and the healthy answers close it, so
 * each healthy case sits below the cases proving the same verdict can
 * answer otherwise.
 *
 * UNREADABLE IS HELD APART FROM UNHEALTHY in every block that has both,
 * by asserting the status whole rather than asserting it is not
 * healthy. The `workflows` block also asserts what an unreadable
 * listing does NOT report — no missing workflow — which is the other
 * half of keeping a failed read from reading as findings.
 *
 * The `workflows` block pins its trigger fixtures before using them.
 * Which node types arm a workflow is `activatableTriggers`'s answer in
 * `scripts/n8n-workflow.ts`, not this file's, so the first case in that
 * block asks it about each fixture type; a roster that moved reddens
 * that case by name, beside whichever verdicts the move reaches. It
 * closes on the workflow sources themselves: the sources this package
 * deploys, an instance holding each of them armed exactly where its
 * source arms, and the same instance with each armable one disarmed in
 * turn.
 *
 * Measured that these cases can fail, by planting eleven mutations in
 * the module one at a time and restoring it after each: an odd
 * readiness status read as unhealthy, every duplicate failing, empty
 * sources read, no legs aggregating to 0, a label left unmasked, the
 * schema decided on `matchesJournal`, `active` tested for falsiness,
 * an unreadable listing read as an empty one, the connector limit
 * dropped from an unreadable verdict, a manual-only workflow held to
 * being armed, and strays failing. Each reddened at least one case
 * here, and the unmutated module reddened none.
 */
import type { SourceWorkflow } from '../../scripts/deployment-verdict.js';
import type { ModelConnectorProjection } from '../../scripts/llm-connector.js';
import type { MigrationComparison } from '../../scripts/migration-ledger.js';
import type { RemoteWorkflow } from '../../scripts/n8n-client.js';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { expectedNames } from '../../scripts/audit-workflows.js';
import {
  CONNECTOR_REACH_LIMIT,
  LEG_EXIT_CODES,
  LEG_NAMES,
  aggregateExitCode,
  connectorVerdict,
  instanceVerdict,
  legExitCode,
  reportLines,
  schemaVerdict,
  workflowsVerdict,
} from '../../scripts/deployment-verdict.js';
import { projectModelConnector } from '../../scripts/llm-connector.js';
import { compareMigrationTags } from '../../scripts/migration-ledger.js';
import { activatableTriggers } from '../../scripts/n8n-workflow.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A reading that was taken.
 *
 * @param value - What was read.
 * @returns The reading.
 */
function read<T>(value: T): { readonly outcome: 'read'; readonly value: T } {
  return { outcome: 'read', value };
}

/**
 * A reading that could not be taken.
 *
 * @param reason - Why not.
 * @returns The reading.
 */
function unread(reason: string): { readonly outcome: 'unreadable'; readonly reason: string } {
  return { outcome: 'unreadable', reason };
}

/** A clock: armable by the suffix rule in `isActivatableTrigger`. */
const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';

/** A webhook: armable, named on `ARMED_TRIGGER_TYPES`. */
const WEBHOOK = 'n8n-nodes-base.webhook';

/** Called by another workflow: a manual starter. */
const CALLED = 'n8n-nodes-base.executeWorkflowTrigger';

/** No trigger at all. */
const CODE = 'n8n-nodes-base.code';

/**
 * A workflow source declaring `name` over nodes of the given types.
 *
 * @param name - The display name.
 * @param types - One node per type, in order.
 * @returns The source.
 */
function source(name: string, types: readonly string[]): SourceWorkflow {
  return { name, nodes: types.map((type) => ({ type })) };
}

/**
 * A workflow as an instance lists one.
 *
 * @param id - Its id.
 * @param name - Its display name.
 * @param active - Whether the instance has it armed.
 * @returns The workflow.
 */
function held(id: unknown, name: unknown, active: unknown): RemoteWorkflow {
  return { active, id, name };
}

/** Two armable sources and one manual-only one. */
const SOURCES: readonly SourceWorkflow[] = [
  source('Clock', [SCHEDULE, CODE]),
  source('Hook', [WEBHOOK]),
  source('Callee', [CALLED, CODE]),
];

/** An instance holding each of {@link SOURCES} once, armed where it arms. */
const LEVEL: readonly RemoteWorkflow[] = [
  held('c1', 'Clock', true),
  held('h1', 'Hook', true),
  held('k1', 'Callee', false),
];

/** Control characters, built from code points so none is in this file. */
const ESC = String.fromCharCode(0x1b);
const LF = String.fromCharCode(0x0a);

/**
 * Whether a line carries a C0 control or DEL.
 *
 * @param line - The line.
 * @returns Whether any code point in it is below U+0020 or is U+007F.
 */
function carriesControl(line: string): boolean {
  return [...line].some((char) => {
    const code = char.codePointAt(0) ?? 0;

    return code < 0x20 || code === 0x7f;
  });
}

// ---------------------------------------------------------------------------
// instance
// ---------------------------------------------------------------------------

describe('instanceVerdict', () => {
  it('answers unreadable, not unhealthy, when no status was read, naming why', () => {
    const verdict = instanceVerdict(unread('connection refused'));

    expect(verdict.leg).toBe('instance');
    expect(verdict.status).toBe('unreadable');
    expect(verdict.findings).toEqual(['readiness could not be read: connection refused']);
  });

  it('answers unreadable for every status the readiness route does not give', () => {
    const statuses = [204, 301, 401, 403, 404, 500, 502];

    expect(statuses.map((status) => instanceVerdict(read(status)).status)).toEqual(
      statuses.map(() => 'unreadable'),
    );
    expect(instanceVerdict(read(404)).findings[0]).toContain('answered 404');
  });

  it('answers unhealthy for 503, the status an instance gives while not ready', () => {
    const verdict = instanceVerdict(read(503));

    expect(verdict.status).toBe('unhealthy');
    expect(verdict.findings[0]).toContain('503');
  });

  it('answers healthy for 200', () => {
    expect(instanceVerdict(read(200))).toEqual({
      findings: ['readiness answered 200: connected, migrated and fully ready'],
      leg: 'instance',
      status: 'healthy',
    });
  });
});

// ---------------------------------------------------------------------------
// workflows
// ---------------------------------------------------------------------------

describe('workflowsVerdict', () => {
  it('rests on fixtures activatableTriggers reads the way their names say', () => {
    const arming = [SCHEDULE, WEBHOOK, CALLED, CODE].map(
      (type) => activatableTriggers(source('probe', [type])).length,
    );

    expect(arming).toEqual([1, 1, 0, 0]);
  });

  it('answers unreadable when the instance could not be listed, and names nothing missing', () => {
    const verdict = workflowsVerdict(unread('401 from the listing'), read(SOURCES));

    expect(verdict.status).toBe('unreadable');
    expect(verdict.findings).toEqual(['the instance could not be listed: 401 from the listing']);
  });

  it('answers unreadable when the sources could not be read', () => {
    const verdict = workflowsVerdict(read(LEVEL), unread('ENOENT'));

    expect(verdict.status).toBe('unreadable');
    expect(verdict.findings).toEqual(['the workflow sources could not be read: ENOENT']);
  });

  it('names both failed readings when neither was taken', () => {
    const verdict = workflowsVerdict(unread('no route'), unread('ENOENT'));

    expect(verdict.status).toBe('unreadable');
    expect(verdict.findings).toEqual([
      'the workflow sources could not be read: ENOENT',
      'the instance could not be listed: no route',
    ]);
  });

  it('answers unreadable over sources declaring nothing, whatever the instance holds', () => {
    const verdicts = [[], LEVEL].map((listing) => workflowsVerdict(read(listing), read([])));

    expect(verdicts.map((verdict) => verdict.status)).toEqual(['unreadable', 'unreadable']);
    expect(verdicts[1]?.findings[0]).toContain('declare no workflow');
  });

  it('answers unhealthy for a declared workflow the instance does not hold', () => {
    const verdict = workflowsVerdict(read(LEVEL.slice(1)), read(SOURCES));

    expect(verdict.status).toBe('unhealthy');
    expect(verdict.findings).toContain('missing Clock: the instance holds no workflow under it');
  });

  it('answers unhealthy for a declared name held twice, naming each id', () => {
    const verdict = workflowsVerdict(read([...LEVEL, held('k2', 'Callee', false)]), read(SOURCES));

    expect(verdict.status).toBe('unhealthy');
    expect(verdict.findings).toContain('duplicate Callee: 2 workflows answer to it, ids k1, k2');
  });

  it('answers unhealthy for an armable workflow that is anything but active true', () => {
    const disarmed = [false, undefined, null, 'true', 1].map((active) => workflowsVerdict(
      read([held('c1', 'Clock', active), ...LEVEL.slice(1)]),
      read(SOURCES),
    ));

    expect(disarmed.map((verdict) => verdict.status)).toEqual(disarmed.map(() => 'unhealthy'));
    expect(disarmed[0]?.findings).toContain(
      `inactive Clock (inert) id c1: its source arms it through ${SCHEDULE}`,
    );
  });

  it('names an inert copy of an armable duplicate by id, beside the duplicate', () => {
    const verdict = workflowsVerdict(read([...LEVEL, held('h2', 'Hook', false)]), read(SOURCES));

    expect(verdict.status).toBe('unhealthy');
    expect(verdict.findings.filter((line) => line.startsWith('duplicate ') || line.startsWith('inactive '))).toEqual([
      'duplicate Hook: 2 workflows answer to it, ids h1, h2',
      `inactive Hook (inert) id h2: its source arms it through ${WEBHOOK}`,
    ]);
  });

  it('keeps an unreadable listing distinct from an empty one, which misses everything', () => {
    const empty = workflowsVerdict(read([]), read(SOURCES));
    const failed = workflowsVerdict(unread('timeout'), read(SOURCES));

    expect(empty.status).toBe('unhealthy');
    expect(empty.findings.filter((line) => line.startsWith('missing '))).toHaveLength(3);
    expect(failed.status).toBe('unreadable');
    expect(failed.findings.some((line) => line.startsWith('missing '))).toBe(false);
  });

  it('reads a source whose only trigger is disabled as manual-only, as activatableTriggers does', () => {
    const disabledClock: SourceWorkflow = {
      name: 'Clock',
      nodes: [{ disabled: true, type: SCHEDULE }],
    };
    const verdict = workflowsVerdict(
      read([held('c1', 'Clock', false), ...LEVEL.slice(1)]),
      read([disabledClock, ...SOURCES.slice(1)]),
    );

    expect(verdict.status).toBe('healthy');
  });

  it('reports strays, armed, unnamed and sharing a name, and fails on none of them', () => {
    const strays = [
      held('s1', 'Theirs', true),
      held('s2', undefined, false),
      held('s3', 'Pair', false),
      held(undefined, 'Pair', true),
    ];
    const verdict = workflowsVerdict(read([...LEVEL, ...strays]), read(SOURCES));

    expect(verdict.status).toBe('healthy');
    expect(verdict.findings.filter((line) => line.startsWith('stray '))).toEqual([
      'stray Theirs (armed) id s1: no source declares it, reported and not failed',
      'stray <no display name> (inert) id s2: no source declares it, reported and not failed',
      'stray Pair (inert) id s3: no source declares it, reported and not failed',
      'stray Pair (armed) id <no id>: no source declares it, reported and not failed',
    ]);
    expect(verdict.findings.some((line) => line.startsWith('duplicate '))).toBe(false);
  });

  it('closes on a line counting every reading', () => {
    const verdict = workflowsVerdict(
      read([held('c1', 'Clock', false), held('c2', 'Clock', true), held('s1', 'Theirs', true)]),
      read(SOURCES),
    );

    expect(verdict.findings.at(-1)).toBe(
      '3 on the instance, 3 declared, 2 accounted for, 2 missing, 1 duplicated, '
      + '1 armable and inactive, 1 stray (1 of them armed)',
    );
  });

  it('answers healthy with a manual-only workflow armed as well as inert', () => {
    const inert = workflowsVerdict(read(LEVEL), read(SOURCES));
    const armed = workflowsVerdict(read([...LEVEL.slice(0, 2), held('k1', 'Callee', true)]), read(SOURCES));

    expect([inert.status, armed.status]).toEqual(['healthy', 'healthy']);
    expect(inert.findings).toEqual([
      '3 on the instance, 3 declared, 3 accounted for, 0 missing, 0 duplicated, '
      + '0 armable and inactive, 0 stray (0 of them armed)',
    ]);
  });

  it('holds the sources this package deploys: healthy armed where each arms, unhealthy per disarmed one', () => {
    const sourceDir = fileURLToPath(new URL('../../workflows/src', import.meta.url));
    const sources = readdirSync(sourceDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => JSON.parse(readFileSync(join(sourceDir, file), 'utf8')) as SourceWorkflow);
    const armable = sources.filter((each) => activatableTriggers(each).length > 0);
    const instance = sources.map((each, index) => held(`w${String(index)}`, each.name, activatableTriggers(each).length > 0));

    // Both kinds present, so the case is about arming and not about names.
    expect(new Set(sources.map((each) => each.name))).toEqual(new Set(expectedNames({ sourceDir })));
    expect(armable.length).toBeGreaterThan(0);
    expect(armable.length).toBeLessThan(sources.length);
    expect(workflowsVerdict(read(instance), read(sources)).status).toBe('healthy');

    for (const each of armable) {
      const disarmed = instance.map((workflow) => workflow.name === each.name
        ? { ...workflow, active: false }
        : workflow);
      const verdict = workflowsVerdict(read(disarmed), read(sources));

      expect(verdict.status).toBe('unhealthy');
      expect(verdict.findings.filter((line) => line.startsWith('inactive '))).toHaveLength(1);
      expect(verdict.findings.find((line) => line.startsWith('inactive '))).toContain(`inactive ${each.name} (inert)`);
    }
  });
});

// ---------------------------------------------------------------------------
// schema
// ---------------------------------------------------------------------------

describe('schemaVerdict', () => {
  const JOURNAL = Object.freeze(['0000_first', '0001_second', '0002_third']);

  it('answers unreadable, not unhealthy, when the ledger could not be read', () => {
    expect(schemaVerdict(unread('ECONNREFUSED'))).toEqual({
      findings: ['the migration ledger could not be read: ECONNREFUSED'],
      leg: 'schema',
      status: 'unreadable',
    });
  });

  it('answers unhealthy naming the tag a ledger behind its journal is missing', () => {
    const verdict = schemaVerdict(read(compareMigrationTags(JOURNAL, JOURNAL.slice(0, -1))));

    expect(verdict).toEqual({
      findings: [
        'pending 0002_third: the journal names it and the ledger holds no row for it',
        '1 pending, 0 unrecognized, 0 out of order',
      ],
      leg: 'schema',
      status: 'unhealthy',
    });
  });

  it('names every disagreement under its own reading', () => {
    const comparison = compareMigrationTags(JOURNAL, ['0002_third', 'unrecognized(7)', '0000_first']);

    expect(schemaVerdict(read(comparison)).findings).toEqual([
      'pending 0001_second: the journal names it and the ledger holds no row for it',
      'unrecognized unrecognized(7): the ledger holds a row the journal does not name',
      'out of order 0000_first: the ledger holds it behind a migration the journal '
      + 'places after it, or holds it twice',
      '1 pending, 1 unrecognized, 1 out of order',
    ]);
  });

  it('decides on the lists and not on matchesJournal, in both directions', () => {
    const flaggedClean: MigrationComparison = {
      matchesJournal: true,
      outOfOrder: [],
      pending: ['0002_third'],
      unrecognized: [],
    };
    const flaggedDirty: MigrationComparison = {
      matchesJournal: false,
      outOfOrder: [],
      pending: [],
      unrecognized: [],
    };

    expect(schemaVerdict(read(flaggedClean)).status).toBe('unhealthy');
    expect(schemaVerdict(read(flaggedDirty)).status).toBe('healthy');
  });

  it('answers healthy for a ledger naming the journal in full and in order', () => {
    expect(schemaVerdict(read(compareMigrationTags(JOURNAL, [...JOURNAL])))).toEqual({
      findings: ['the ledger names every migration the journal does, once each and in journal order'],
      leg: 'schema',
      status: 'healthy',
    });
  });
});

// ---------------------------------------------------------------------------
// connector
// ---------------------------------------------------------------------------

describe('connectorVerdict', () => {
  const ENDPOINT = 'http://model.invalid:9';
  const MODEL = 'model-under-test';

  /**
   * A projection of one selected row.
   *
   * @param endpoint - Its projected endpoint.
   * @param model - Its projected model name.
   * @returns The projection.
   */
  function selected(endpoint: string | null, model: string | null): ModelConnectorProjection {
    return { connectorId: 3, connectorName: 'default', endpoint, model };
  }

  it('answers unreadable when the connectors could not be read, and still prints its limit', () => {
    expect(connectorVerdict(unread('ECONNREFUSED'))).toEqual({
      findings: ['the connectors could not be read: ECONNREFUSED', CONNECTOR_REACH_LIMIT],
      leg: 'connector',
      status: 'unreadable',
    });
  });

  it('answers unhealthy where no llm row is selected, as the projection of no rows is', () => {
    const verdict = connectorVerdict(read(projectModelConnector([])));

    expect(verdict.status).toBe('unhealthy');
    expect(verdict.findings).toEqual([
      'no connector of kind llm, so every model-reaching pass refuses before it calls',
      CONNECTOR_REACH_LIMIT,
    ]);
  });

  it('answers unhealthy where the selected row projects no endpoint, whatever its model', () => {
    const verdicts = [MODEL, null].map((model) => connectorVerdict(read(selected(null, model))));

    expect(verdicts.map((verdict) => verdict.status)).toEqual(['unhealthy', 'unhealthy']);
    expect(verdicts[0]?.findings[0]).toBe(
      'connector 3 named default projects no endpoint, so every model-reaching pass refuses before it calls',
    );
  });

  it('answers healthy with a model name and without one', () => {
    const verdicts = [MODEL, null].map((model) => connectorVerdict(read(selected(ENDPOINT, model))));

    expect(verdicts.map((verdict) => verdict.status)).toEqual(['healthy', 'healthy']);
    expect(verdicts.map((verdict) => verdict.findings[0])).toEqual([
      'connector 3 named default projects an endpoint and a model name',
      'connector 3 named default projects an endpoint and no model name, which a pass reads as ordinary',
    ]);
  });

  it('prints neither projected value, and closes every verdict on its limit', () => {
    const verdicts = [
      connectorVerdict(unread('down')),
      connectorVerdict(read(selected(null, MODEL))),
      connectorVerdict(read(selected(ENDPOINT, MODEL))),
    ];
    const lines = verdicts.flatMap((verdict) => reportLines(verdict));

    expect(lines.some((line) => line.includes(ENDPOINT) || line.includes(MODEL))).toBe(false);
    expect(verdicts.map((verdict) => verdict.findings.at(-1))).toEqual(
      verdicts.map(() => CONNECTOR_REACH_LIMIT),
    );
  });
});

// ---------------------------------------------------------------------------
// Report lines and exit codes
// ---------------------------------------------------------------------------

describe('reportLines', () => {
  it('masks control characters from the deployment, so one finding stays one line', () => {
    const planted = `Theirs${ESC}[2K${LF}workflows: healthy, exit 0`;
    const lines = [
      ...reportLines(workflowsVerdict(read([...LEVEL, held(planted, planted, false)]), read(SOURCES))),
      ...reportLines(instanceVerdict(unread(`refused${LF}instance: healthy, exit 0`))),
      ...reportLines(schemaVerdict(read(compareMigrationTags(['0000_first'], ['0000_first', planted])))),
    ];

    // The plant is live: unmasked, it would put a raw ESC and a raw LF in a line.
    expect(carriesControl(planted)).toBe(true);
    expect(lines.filter((line) => carriesControl(line))).toEqual([]);
    // The stray line carries the plant as name and as id, the schema line as a tag.
    expect(lines.filter((line) => line.includes('\\u001b[2K\\u000aworkflows: healthy, exit 0'))).toHaveLength(2);
    expect(lines).toContain('instance: readiness could not be read: refused\\u000ainstance: healthy, exit 0');
  });

  it('prefixes each finding with its leg and closes on the answer and its exit code', () => {
    expect(reportLines(schemaVerdict(unread('down')))).toEqual([
      'schema: the migration ledger could not be read: down',
      'schema: unreadable, exit 2',
    ]);
    expect(reportLines(instanceVerdict(read(503))).at(-1)).toBe('instance: unhealthy, exit 1');
    expect(reportLines(instanceVerdict(read(200))).at(-1)).toBe('instance: healthy, exit 0');
  });
});

describe('legExitCode', () => {
  it('maps unreadable to 2 and unhealthy to 1, apart from each other', () => {
    expect(legExitCode(instanceVerdict(read(404)))).toBe(2);
    expect(legExitCode(instanceVerdict(read(503)))).toBe(1);
    expect(legExitCode(instanceVerdict(read(200)))).toBe(0);
    expect(LEG_EXIT_CODES).toEqual({ healthy: 0, unhealthy: 1, unreadable: 2 });
  });

  it('names the four legs in the order a verification runs them', () => {
    expect(LEG_NAMES).toEqual(['instance', 'workflows', 'schema', 'connector']);
  });
});

describe('aggregateExitCode', () => {
  it('answers 1 over no legs at all', () => {
    expect(aggregateExitCode([])).toBe(1);
  });

  it('answers 1 where any leg answered anything but 0, an unreadable 2 included', () => {
    const runs = [[0, 0, 0, 1], [2, 0, 0, 0], [0, 2, 1, 0], [0, 0, 127, 0], [0, 0, 0, -1], [0, Number.NaN]];

    expect(runs.map((codes) => aggregateExitCode(codes))).toEqual(runs.map(() => 1));
  });

  it('answers 0 only where every leg answered 0', () => {
    expect(aggregateExitCode([0, 0, 0, 0])).toBe(0);
    expect(aggregateExitCode([0])).toBe(0);
  });
});
