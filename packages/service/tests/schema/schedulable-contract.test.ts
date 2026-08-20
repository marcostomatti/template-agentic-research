/**
 * The schedulable-row contract: a table carrying `next_run_at` carries
 * the whole column set the dispatcher reads, or none of it.
 *
 * `schedulableColumns()` in `src/db/schema/scheduling.ts` declares that
 * set once and every schedulable table spreads it, so the contract
 * holds by construction today. What construction does not cover is a
 * table that declares the columns itself — a spread is not the only
 * way to end up with a `next_run_at` — and a table writing out three
 * of the five reads as schedulable to a person and to the claim query
 * both, right up to the write that reschedules it after a run and
 * names a column it has not got. So what is checked here is the
 * columns a table ends up with rather than which helper it called,
 * and both routes to the set are held to the same contract.
 *
 * The tables are discovered from the schema barrel rather than listed
 * here. A list would be a second copy of the schema, checked against
 * the first only when somebody remembers to update it, and the table
 * this file exists to catch is precisely the one added after it was
 * written. `is(export, Table)` is the same filter drizzle-kit and
 * `drizzle({ schema })` apply, so what is iterated is what the tool
 * and the client resolve rather than a third reading of the barrel.
 *
 * Columns are matched by SQL name, not by the property drizzle types
 * them under. The reader that makes this contract matter is the
 * hand-written SQL the dispatcher issues, which names the column the
 * database has: a property renamed on the TypeScript side leaves that
 * query working, and an SQL name changed underneath it does not,
 * whatever the property ends up called.
 *
 * `next_run_at` is what identifies a schedulable table because it is
 * the one column of the five that means nothing anywhere else.
 * `enabled` is not a tell — `sources.enabled` is an operator's on/off
 * switch on a table that holds no due time and is never claimed by
 * anything, and keying discovery on it would drag that table into a
 * contract it has no business being held to.
 *
 * Two guards run in front of the per-table cases, because a case
 * generated per discovered table asserts exactly nothing when the
 * discovery comes back empty, and an empty run is green. They fail
 * separately on purpose: a barrel resolving no tables at all is a
 * broken import or a moved path, while a barrel full of tables and no
 * schedulable one is the contract cases quietly covering nothing.
 */
import { Table, getTableColumns, getTableName, is } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../src/db/schema.js';

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

/**
 * The column whose presence makes a table schedulable, by SQL name.
 *
 * The single scheduling truth, so it is also the single tell: every
 * mode of scheduling is a write to this column, and a table without
 * one is never claimed however much of the rest of the set it holds.
 */
const SCHEDULING_TRUTH_COLUMN = 'next_run_at';

/**
 * The rest of the set, by SQL name — what a table carrying
 * `next_run_at` must carry with it.
 *
 * Written out here rather than read off `schedulableColumns()`, which
 * would compare the helper against itself and pass for any set it
 * happened to return. This copy is made independently of the
 * declaration, so widening or narrowing the contract has to be done
 * twice — and the second edit is where somebody reads what it costs
 * the dispatcher, which reschedules by `interval_seconds`, filters by
 * `enabled`, and clamps an agent's proposal into the bounds the last
 * two give.
 */
const REQUIRED_COMPANION_COLUMNS: readonly string[] = [
  'interval_seconds',
  'enabled',
  'min_interval_seconds',
  'max_interval_seconds',
];

// ---------------------------------------------------------------------------
// Discovered tables
// ---------------------------------------------------------------------------

/** One table resolved from the barrel, reduced to what is asserted. */
interface DiscoveredTable {
  /** Export name in `src/db/schema.ts`, for naming a failure. */
  readonly exportName: string;
  /** The name in the database, which is what the claim query says. */
  readonly tableName: string;
  /** Its columns by SQL name, for the presence checks below. */
  readonly columnNames: ReadonlySet<string>;
}

/**
 * Every table the schema barrel exports.
 *
 * `Object.entries` over the module namespace filtered by `is(…,
 * Table)`: the barrel also carries `schedulableColumns` itself, and
 * anything else a schema module exports that is not a table, so the
 * filter is what makes this the table set rather than the export set.
 */
function collectSchemaTables(): readonly DiscoveredTable[] {
  const tables: DiscoveredTable[] = [];

  for (const [exportName, exported] of Object.entries(schema)) {
    if (!is(exported, Table)) {
      continue;
    }

    const columns = Object.values(getTableColumns(exported));

    tables.push({
      exportName,
      tableName: getTableName(exported),
      columnNames: new Set(columns.map((column) => column.name)),
    });
  }

  return tables;
}

const SCHEMA_TABLES = collectSchemaTables();

const SCHEDULABLE_TABLES = SCHEMA_TABLES.filter((table) => table.columnNames.has(SCHEDULING_TRUTH_COLUMN));

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describe('schedulable-row contract — discovery', () => {
  // A barrel that resolved nothing would send every case below over an
  // empty list, which passes. This is the case that says so.
  it('resolves tables from the schema barrel', () => {
    expect(SCHEMA_TABLES.length).toBeGreaterThan(0);
  });

  // The same failure one step further in: tables resolved, none of them
  // schedulable, so the contract cases are generated over nothing.
  it('finds at least one table carrying next_run_at', () => {
    expect(SCHEDULABLE_TABLES.length).toBeGreaterThan(0);
  });
});

describe('schedulable-row contract — columns', () => {
  for (const table of SCHEDULABLE_TABLES) {
    // Compared against an empty array rather than counted, so a failure
    // prints the columns the table is missing and not merely how many.
    it(`${table.tableName} carries every column that comes with next_run_at`, () => {
      const missing = REQUIRED_COMPANION_COLUMNS.filter((column) => !table.columnNames.has(column));

      expect(missing).toEqual([]);
    });
  }
});
