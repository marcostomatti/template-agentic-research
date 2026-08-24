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
 *
 * Which tables carry the set is written out below too, and that is a
 * different assertion from the ones above it: not that a schedulable
 * table is well formed, but that the set of them is the one this
 * phase decided on. A table growing a `next_run_at` — by spreading
 * the helper or by declaring the columns itself — is another row the
 * dispatcher claims on every tick from then on, so it fails here
 * until it is named in the roster. That edit is the acknowledgement:
 * the place where a recurring cost is agreed to rather than
 * inherited.
 *
 * The roster case subsumes the second guard while the roster is not
 * empty, and that guard is kept because it stops subsuming it the
 * moment a failure is cleared by copying the discovered names into
 * the expectation — an empty discovery included.
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

/**
 * The tables that carry the scheduling column set, by database name.
 *
 * Written out rather than derived, because deriving it would ask the
 * schema which tables are schedulable and then agree with whatever it
 * answered. This list is a decision instead: these are the rows
 * `ar-dispatch` claims, once per tick, for as long as the service
 * runs. Joining it is a change to what the pipeline does on a clock,
 * which is worth a deliberate edit in a second place — a table that
 * spreads `schedulableColumns()` for the shape of it, or copies a
 * neighbouring table's columns, is scheduled from that moment on
 * whether or not anybody meant it to be.
 *
 * Database names rather than export names, on the same reasoning the
 * columns are matched by SQL name: the claim query names what the
 * database has, so what belongs here is the name it selects from.
 */
const EXPECTED_SCHEDULABLE_TABLES: readonly string[] = [
  'topics',
  'export_subscriptions',
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

/** Sorted copy, so an equality is over names rather than over order. */
function sorted(names: readonly string[]): readonly string[] {
  return [...names].sort();
}

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

describe('schedulable-row contract — roster', () => {
  // Sorted-array equality rather than a membership check per name, so
  // it fails in every direction the roster can be wrong in: a table
  // that has gained the columns without being listed, a listed table
  // that has stopped carrying them, and two exports resolving to one
  // database name.
  it('holds exactly the tables the dispatcher claims', () => {
    const discovered = SCHEDULABLE_TABLES.map((table) => table.tableName);

    expect(sorted(discovered)).toEqual(sorted(EXPECTED_SCHEDULABLE_TABLES));
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
