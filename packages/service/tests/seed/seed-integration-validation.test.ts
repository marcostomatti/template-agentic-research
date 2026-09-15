/**
 * What `loadIntegrationBundle` refuses before a connection is opened,
 * and what `runIntegrationSeedCli` does with a bundle it accepts —
 * isolated, so no case here reaches a database.
 *
 * Three cases, in the order the plan fixes: a dangling reference, a
 * malformed file, and a clean bundle. The clean bundle is the control
 * the two refusals rest on, and it sits last rather than first only
 * because that order is prescribed. A loader refusing whatever it was
 * handed would satisfy both refusal cases, so the last case shows the
 * same copy of the fixtures loading whole with nothing planted in it,
 * and a run over it reaching the database double where the refused
 * runs reached nothing.
 *
 * Every mutated bundle is a copy of the fixtures this package ships,
 * differing in one member or one file. That is what lets each refusal
 * be asserted as the whole failure list rather than searched for in
 * it: a second failure would be a row refused for a reason the case
 * is not about.
 *
 * The database double stands in for a pool. It answers the one
 * query `assertLiveDatabase` asks with a database name that is not
 * `ar_live` and throws on any other member, so a run that reached it
 * and a run that refused before opening anything come apart in the
 * call log, and a statement issued ahead of the guard would show in
 * that log as a second call.
 */
import type { IntegrationSeedConnection } from '../../scripts/seed-integration.js';
import type { SeedFailure } from '../../scripts/seed.js';
import type { Pool } from 'pg';

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  INTEGRATION_FIXTURE_DIR,
  INTEGRATION_ROSTER,
  IntegrationValidationError,
  loadIntegrationBundle,
  runIntegrationSeedCli,
} from '../../scripts/seed-integration.js';

// ---------------------------------------------------------------------------
// Fixture copies
// ---------------------------------------------------------------------------

/** Every scratch directory a case wrote, removed at the end. */
const scratchDirectories: string[] = [];

afterAll(() => {
  for (const directory of scratchDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/**
 * A scratch copy of every `.json` file the shipped fixture directory
 * holds, byte for byte, so a case mutates the copy and never the
 * tracked files.
 *
 * @returns The copy's directory.
 */
function copyFixtures(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-seed-integration-'));

  scratchDirectories.push(directory);

  for (const name of readdirSync(INTEGRATION_FIXTURE_DIR)) {
    if (name.endsWith('.json')) {
      writeFileSync(
        join(directory, name),
        readFileSync(join(INTEGRATION_FIXTURE_DIR, name)),
      );
    }
  }

  return directory;
}

/**
 * One file of a copy, parsed. Typed loosely: a case has to be able to
 * plant a value the schemas refuse.
 *
 * @param directory - The copy.
 * @param file - The file in it.
 */
function readJson(directory: string, file: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(directory, file), 'utf8'),
  ) as Record<string, unknown>;
}

/**
 * Every failure a refusal carried. Throws when nothing was refused,
 * so a loader that accepted the bundle fails the case here rather
 * than comparing an empty list.
 *
 * @param directory - The bundle to load.
 */
function refusedFailures(directory: string): readonly SeedFailure[] {
  try {
    loadIntegrationBundle(directory);
  } catch (cause) {
    if (cause instanceof IntegrationValidationError) {
      return cause.failures;
    }

    throw cause;
  }

  throw new Error(`expected the bundle under ${directory} to be refused`);
}

// ---------------------------------------------------------------------------
// The database double
// ---------------------------------------------------------------------------

/** The name the double answers `current_database()` with. */
const NOT_THE_LIVE_DATABASE = 'ar';

/** What the double throws on anything but the guard's query. */
const DOUBLE_REACHED = 'the integration seed reached the pool double';

/** What a run asked of the double, and the opener to hand it. */
interface PoolDouble {
  /** Every request the run made, in order. */
  readonly calls: readonly string[];

  /** What `runIntegrationSeedCli` takes in place of a real opener. */
  readonly connect: () => IntegrationSeedConnection;
}

/**
 * A pool on a database that is not `ar_live`, and the log of what was
 * asked of it. `query` answers the guard; any other member throws, so
 * a pass that built a writer before asking would be logged doing so.
 *
 * @returns The log and the opener, sharing one closure.
 */
function poolDouble(): PoolDouble {
  const calls: string[] = [];
  const pool = new Proxy({}, {
    get: (_target, property) => {
      const call = `pool.${String(property)}`;

      calls.push(call);

      if (property === 'query') {
        return async () => ({
          rows: [{ current_database: NOT_THE_LIVE_DATABASE }],
        });
      }

      throw new Error(`${DOUBLE_REACHED}: ${call}`);
    },
  }) as unknown as Pool;

  return {
    calls,
    connect: () => {
      calls.push('connect');

      return {
        pool,
        close: async () => {
          calls.push('close');
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// A dangling reference
// ---------------------------------------------------------------------------

describe('loadIntegrationBundle — a dangling reference', () => {
  /** A document fixture id no row of `documents.json` declares. */
  const ABSENT_DOCUMENT_ID = 999;

  /**
   * The copy with the first finding pointed at that document, sound
   * file by file and wrong only across files.
   */
  function danglingBundle(): string {
    const directory = copyFixtures();
    const file = INTEGRATION_ROSTER.findings.file;
    const parsed = readJson(directory, file);
    const [first, ...rest] = parsed['findings'] as Record<string, unknown>[];

    writeFileSync(join(directory, file), JSON.stringify({
      ...parsed,
      findings: [{ ...first, documentFixtureId: ABSENT_DOCUMENT_ID }, ...rest],
    }));

    return directory;
  }

  // The guard that keeps the case below about an absent row: a
  // document added later under this id would make the reference
  // resolve, and this case says so rather than the next one failing
  // over a list.
  it('plants an id the shipped documents do not declare', () => {
    const ids = loadIntegrationBundle().documents.map((row) => row.fixtureId);

    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain(ABSENT_DOCUMENT_ID);
  });

  it('reports the file and the field, and nothing else', () => {
    expect(refusedFailures(danglingBundle())).toEqual([
      {
        file: INTEGRATION_ROSTER.findings.file,
        field: 'findings[0].documentFixtureId',
        message: expect.stringContaining(
          `${INTEGRATION_ROSTER.documents.file} declares: ${ABSENT_DOCUMENT_ID}`,
        ),
      },
    ]);
  });

  it('opens no connection', async () => {
    const double = poolDouble();

    await expect(runIntegrationSeedCli(double.connect, danglingBundle()))
      .rejects.toThrow(IntegrationValidationError);
    expect(double.calls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A malformed file
// ---------------------------------------------------------------------------

describe('loadIntegrationBundle — a malformed file', () => {
  /**
   * The copy with `runs.json` cut off halfway through its text, which
   * no parser accepts.
   *
   * `llm-calls.json` names its runs by fixture id, so a loader that
   * went on to resolve references after a file failed would report
   * every call naming a run beside this one failure. The whole-list
   * equality below is what holds that pass back.
   */
  function malformedBundle(): string {
    const directory = copyFixtures();
    const path = join(directory, INTEGRATION_ROSTER.runs.file);
    const text = readFileSync(path, 'utf8');

    writeFileSync(path, text.slice(0, Math.floor(text.length / 2)));

    return directory;
  }

  it('reports the file as holding no JSON, and nothing else', () => {
    expect(refusedFailures(malformedBundle())).toEqual([
      {
        file: INTEGRATION_ROSTER.runs.file,
        field: null,
        message: expect.stringContaining('holds no valid JSON'),
      },
    ]);
  });

  it('opens no connection', async () => {
    const double = poolDouble();

    await expect(runIntegrationSeedCli(double.connect, malformedBundle()))
      .rejects.toThrow(IntegrationValidationError);
    expect(double.calls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A clean bundle
// ---------------------------------------------------------------------------

describe('loadIntegrationBundle — a clean bundle', () => {
  // Counts derived from the files rather than written out, so a row
  // added to a fixture moves both sides of the comparison. The copy
  // is read rather than the shipped directory alone: it is the copy
  // the two refusals above mutated, and it loading whole is what
  // makes each of them about its one planted change.
  it('returns every row of every file, from the shipped files and a copy', () => {
    const expected = Object.fromEntries(
      Object.entries(INTEGRATION_ROSTER).map(([concern, entry]) => [
        concern,
        (readJson(INTEGRATION_FIXTURE_DIR, entry.file)[concern] as unknown[])
          .length,
      ]),
    );
    const counted = (directory: string): Record<string, number> => (
      Object.fromEntries(
        Object.entries(loadIntegrationBundle(directory))
          .map(([concern, rows]) => [concern, (rows as unknown[]).length]),
      )
    );

    expect(Object.values(expected).every((count) => count > 0)).toBe(true);
    expect(counted(INTEGRATION_FIXTURE_DIR)).toEqual(expected);
    expect(counted(copyFixtures())).toEqual(expected);
  });

  // The control for both "opens no connection" cases: the same run
  // over a bundle nothing is wrong with does open one. And what it
  // asks first is the guard, which refuses the double's database
  // having issued that one query — nothing built, nothing written —
  // and the pool is still closed on the way out.
  it('opens a connection, asks the guard first, and closes', async () => {
    const double = poolDouble();

    await expect(runIntegrationSeedCli(double.connect, copyFixtures()))
      .rejects.toThrow(`against database "${NOT_THE_LIVE_DATABASE}"`);
    expect(double.calls).toEqual(['connect', 'pool.query', 'close']);
  });
});
