/**
 * What `scripts/migration-ledger.ts` reads and names, asked with no
 * database anywhere in the run. Three blocks, one per function, in the
 * order a schema reading reaches them.
 *
 * THE FIRST BLOCK IS THE JOURNAL. The refusals come first — a journal
 * whose entries name nothing, and one carrying no `entries` member at
 * all — and the block closes on the two readings an absence claim
 * needs beside it: a planted journal naming one migration reads back
 * that migration, so the refusal is about emptiness and the path
 * handed in is the one read; and the default reads the same file this
 * test locates from its own position.
 *
 * THE SECOND BLOCK IS THE LEDGER, read through a client that records
 * every statement it is sent and answers rows written out here. The
 * stamps are the package journal's own, read rather than copied, so a
 * migration landing moves the fixtures with it. The statement is held
 * whole, which is what says it is one `SELECT` and nothing more; each
 * row is named back in the order the rows came, which is not journal
 * order; and a stamp the journal does not carry is kept in place under
 * the name the module gives it, beside a stamp one millisecond off a
 * real one, so matching near a stamp is not matching it.
 *
 * THE THIRD BLOCK IS THE COMPARISON, over literals, with every reading
 * that names a disagreement ahead of the one that names none. Each
 * case asserts all three lists, so a disagreement filed under the
 * wrong reading reddens rather than agreeing. It closes on the
 * composition the two readers make with it: the package journal, a
 * ledger echoing it, and the same ledger with its newest row gone.
 */
import type {
  MigrationLedgerClient,
  MigrationLedgerRow,
} from '../../scripts/migration-ledger.js';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import {
  compareMigrationTags,
  readAppliedMigrationTags,
  readMigrationJournal,
} from '../../scripts/migration-ledger.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Where every planted journal is written; removed when the file ends. */
const PLANT_DIR = mkdtempSync(join(tmpdir(), 'ar-migration-ledger-'));

afterAll(() => {
  rmSync(PLANT_DIR, { force: true, recursive: true });
});

/**
 * This package's journal, located from this file rather than through
 * the module under test.
 */
const PACKAGE_JOURNAL = fileURLToPath(
  new URL('../../drizzle/meta/_journal.json', import.meta.url),
);

/**
 * Writes a journal under its own file name and answers its path.
 *
 * @param name - File name inside the plant directory.
 * @param content - The value written, serialised as JSON.
 * @returns The absolute path written.
 */
function plantJournal(name: string, content: unknown): string {
  const path = join(PLANT_DIR, name);

  writeFileSync(path, JSON.stringify(content));
  return path;
}

/**
 * A client answering the rows it was built with, recording every
 * statement it is sent in the order it was sent them.
 *
 * @param rows - The rows every query answers with.
 * @returns The client, and the statements it has recorded so far.
 */
function recordingClient(rows: readonly MigrationLedgerRow[]): {
  readonly client: MigrationLedgerClient;
  readonly statements: readonly string[];
} {
  const statements: string[] = [];

  return {
    client: {
      query: (text) => {
        statements.push(text);
        return Promise.resolve({ rows });
      },
    },
    statements,
  };
}

/** A ledger row carrying a journal stamp, as the driver answers one. */
function rowFor(when: number): MigrationLedgerRow {
  return { created_at: String(when) };
}

// ---------------------------------------------------------------------------
// The journal
// ---------------------------------------------------------------------------

describe('readMigrationJournal', () => {
  it('refuses a journal whose entries name no migration, naming the file', () => {
    const path = plantJournal('empty-entries.json', { entries: [] });

    expect(() => readMigrationJournal(path)).toThrow(path);
    expect(() => readMigrationJournal(path)).toThrow('names no migration');
  });

  it('refuses a journal carrying no entries member at all', () => {
    const path = plantJournal('no-entries.json', { dialect: 'postgresql' });

    expect(() => readMigrationJournal(path)).toThrow('names no migration');
  });

  it('reads back a planted journal naming one migration', () => {
    const entry = { tag: '0000_planted', when: 1 };
    const path = plantJournal('one-entry.json', { entries: [entry] });

    expect(readMigrationJournal(path)).toEqual([entry]);
  });

  it('reads the package journal when handed no path', () => {
    expect(readMigrationJournal()).toEqual(readMigrationJournal(PACKAGE_JOURNAL));
  });
});

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

describe('readAppliedMigrationTags', () => {
  it('sends one statement, a SELECT of the drizzle ledger in id order', async () => {
    const { client, statements } = recordingClient([]);

    await readAppliedMigrationTags(client);

    expect(statements).toEqual([
      'SELECT "created_at" FROM drizzle."__drizzle_migrations" ORDER BY "id"',
    ]);
  });

  it('answers an empty ledger with no tag rather than a refusal', async () => {
    const { client } = recordingClient([]);

    await expect(readAppliedMigrationTags(client)).resolves.toEqual([]);
  });

  it('names each row back through the journal, in the order the rows came', async () => {
    // Read inside the case rather than once for the block, so a journal
    // that cannot be read reddens the cases that read it by name rather
    // than failing the whole file at collection.
    const journal = readMigrationJournal();
    const reversed = [...journal].reverse();
    const { client } = recordingClient(reversed.map((entry) => rowFor(entry.when)));

    // Reversal is only a different order while the journal holds two
    // entries or more, which is what makes this case about row order.
    expect(journal.length).toBeGreaterThan(1);
    await expect(readAppliedMigrationTags(client)).resolves.toEqual(
      reversed.map((entry) => entry.tag),
    );
  });

  it('keeps a stamp the journal does not carry in place, named unrecognized', async () => {
    const journal = readMigrationJournal();
    const [first] = journal;

    if (first === undefined) {
      throw new Error('[migration-ledger-test] the package journal read back empty');
    }

    const offByOne = first.when + 1;
    const { client } = recordingClient([
      rowFor(first.when),
      rowFor(offByOne),
      { created_at: null },
    ]);

    expect(journal.some((entry) => entry.when === offByOne)).toBe(false);
    await expect(readAppliedMigrationTags(client)).resolves.toEqual([
      first.tag,
      `unrecognized(${offByOne})`,
      'unrecognized(null)',
    ]);
  });
});

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

describe('compareMigrationTags', () => {
  const JOURNAL = Object.freeze(['0000_first', '0001_second', '0002_third']);

  it('names the journal tags a ledger holds no row for, in journal order', () => {
    expect(compareMigrationTags(JOURNAL, ['0001_second'])).toEqual({
      matchesJournal: false,
      outOfOrder: [],
      pending: ['0000_first', '0002_third'],
      unrecognized: [],
    });
  });

  it('names every ledger tag the journal does not carry, once per row, whatever its spelling', () => {
    const applied = [
      '0000_first',
      'unrecognized(7)',
      '0001_second',
      '9999_elsewhere',
      'unrecognized(7)',
      '0002_third',
    ];

    expect(compareMigrationTags(JOURNAL, applied)).toEqual({
      matchesJournal: false,
      outOfOrder: [],
      pending: [],
      unrecognized: ['unrecognized(7)', '9999_elsewhere', 'unrecognized(7)'],
    });
  });

  it('names the later row of a pair applied against journal order, and not the earlier', () => {
    const applied = ['0001_second', '0000_first', '0002_third'];

    expect(compareMigrationTags(JOURNAL, applied)).toEqual({
      matchesJournal: false,
      outOfOrder: ['0000_first'],
      pending: [],
      unrecognized: [],
    });
  });

  it('names a second row for a migration already applied as out of order', () => {
    const applied = ['0000_first', '0001_second', '0001_second', '0002_third'];

    expect(compareMigrationTags(JOURNAL, applied)).toEqual({
      matchesJournal: false,
      outOfOrder: ['0001_second'],
      pending: [],
      unrecognized: [],
    });
  });

  it('names each disagreement under its own reading when a ledger carries all three', () => {
    const applied = ['0002_third', 'unrecognized(7)', '0000_first'];

    expect(compareMigrationTags(JOURNAL, applied)).toEqual({
      matchesJournal: false,
      outOfOrder: ['0000_first'],
      pending: ['0001_second'],
      unrecognized: ['unrecognized(7)'],
    });
  });

  it('names nothing for a ledger naming the journal in full and in order', () => {
    expect(compareMigrationTags(JOURNAL, [...JOURNAL])).toEqual({
      matchesJournal: true,
      outOfOrder: [],
      pending: [],
      unrecognized: [],
    });
  });

  it('reads matchesJournal true exactly where the ledger equals the journal', () => {
    const ledgers: readonly (readonly string[])[] = [
      [],
      ['0000_first'],
      ['0000_first', '0002_third'],
      ['0002_third', '0001_second', '0000_first'],
      ['0000_first', '0001_second', '0001_second', '0002_third'],
      ['0000_first', '0001_second', '0002_third', 'unrecognized(7)'],
      ['0000_first', '0001_second', '0002_third'],
    ];

    const readings = ledgers.map((applied) => ({
      equal: applied.length === JOURNAL.length && applied.every((tag, index) => tag === JOURNAL[index]),
      matches: compareMigrationTags(JOURNAL, applied).matchesJournal,
    }));

    expect(readings.filter((reading) => reading.equal)).toHaveLength(1);
    expect(readings.every((reading) => reading.matches === reading.equal)).toBe(true);
  });

  it('writes to neither list it was handed', () => {
    const applied = Object.freeze(['0002_third', 'unrecognized(7)', '0000_first']);

    expect(() => compareMigrationTags(JOURNAL, applied)).not.toThrow();
    expect(JOURNAL).toEqual(['0000_first', '0001_second', '0002_third']);
    expect(applied).toEqual(['0002_third', 'unrecognized(7)', '0000_first']);
  });

  it('does not refuse an empty journal, which is the gap the journal reader closes', () => {
    expect(compareMigrationTags([], []).matchesJournal).toBe(true);
  });

  it('names the newest journal tag pending once the newest row of a matching ledger is gone', async () => {
    const journal = readMigrationJournal();
    const tags = journal.map((entry) => entry.tag);
    const rows = journal.map((entry) => rowFor(entry.when));
    const full = await readAppliedMigrationTags(recordingClient(rows).client);
    const behind = await readAppliedMigrationTags(recordingClient(rows.slice(0, -1)).client);

    expect(compareMigrationTags(tags, full).matchesJournal).toBe(true);
    expect(compareMigrationTags(tags, behind)).toEqual({
      matchesJournal: false,
      outOfOrder: [],
      pending: tags.slice(-1),
      unrecognized: [],
    });
  });
});
