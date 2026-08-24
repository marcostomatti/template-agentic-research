/**
 * `CanonicalDocument` against the `documents` table — the half of
 * the tie a runner can check — and the null-vs-zero rule against
 * the columns it classifies.
 *
 * The tie itself is stated as types, in `./canonical-document.ts`, and
 * is gated by `bun run check-types` rather than by this file. That
 * split is not a preference: `tsconfig.json` excludes every
 * `*.test.ts` from the program and vitest transpiles without checking,
 * so a type-level assertion written here would be inert — green for
 * every shape the contract could drift into, and indistinguishable in
 * the output from one that still held. The four claims and the reason
 * each is separate are documented at the top of that module.
 *
 * What is left for this file is everything the type checker cannot
 * see, and there are three such things.
 *
 * The first is the SQL name. `CanonicalDocument` names its members for
 * the drizzle properties of `documents`, which is what makes a spread
 * a row rather than a translation — but four of the five properties
 * are spelled identically to their columns and `sourceId` is not, so
 * nothing in the type system ever mentions `source_id`. A property
 * renamed underneath the contract is caught by `check-types`; a
 * column renamed underneath the property is not caught by anything
 * until hand-written SQL goes looking for it. The ties below are
 * matched against the live table by SQL name, on the same reasoning
 * the sibling suites here use: the reader a column contract exists for
 * is the query the pipeline issues, which names what the database has.
 *
 * The second is coverage of the type-level claims themselves. Their
 * per-member exactness check is an object keyed by member, and a
 * member added to the contract with no key there would still satisfy
 * the three claims that quantify over the whole shape — it would
 * simply have no exact type asserted. So the keys are read at run
 * time and held to the same member set as everything else, which
 * makes the chain checkable end to end: the contract's own keys, the
 * ties, and the member-type assertions all have to name the same
 * five. Each link is written by hand independently of the last, so
 * the comparison is between two accounts of the shape rather than one
 * account read twice.
 *
 * The contract's key set reaches run time through
 * `CANONICAL_DOCUMENT_SAMPLE`, whose annotation forces it to carry
 * every required member and nothing else. An interface leaves nothing
 * behind to enumerate; an annotated literal does.
 *
 * The third is the null-vs-zero rule, which is not about the
 * contract at all and is here because it asks the same question of
 * the same tables. Every tie above pins what a column will take
 * beside what a producer may hand over, and the rule is what
 * decides that answer for the columns nothing hands over. A signal
 * — a reading of something — is nullable, so a measurement nobody
 * took is stored as absent rather than as a 0 that then sorts,
 * compares and reads as a reading somebody did take. A counter is
 * NOT NULL, because zero is a count: a NULL there compares UNKNOWN
 * to the threshold its detector filters on, so the row would
 * neither trip it nor turn up among the rows it passed over. The
 * two classes take opposite treatments for one reason rather than
 * for two.
 *
 * They are driven from two lists written out below, and that is
 * what makes the classification a decision. A column joins a list
 * by hand, so which class it is gets asked once somewhere a
 * reviewer sees it, rather than being settled by whichever builder
 * chain its author happened to type.
 *
 * The honest limit, since it is the sort a reader assumes away:
 * deleting the type-level claims from the module beside this one
 * leaves every case here green. This suite proves they cover the
 * right members, not that they are still there — the gate for that is
 * `check-types`, which reads that file and skips this one.
 *
 * Two more limits belong to the lists. Only nullability is
 * asserted, not the default that completes each class: a counter
 * that lost its `0` is still NOT NULL and still passes here, while
 * every insert has to name it from then on. And nothing here
 * discovers a column and requires it to be classified, so a column
 * on neither list is less untested than undecided — the lists
 * record what was decided, and a column that joined the schema
 * without a decision is invisible to them.
 */
import type { Column, Table } from 'drizzle-orm';

import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { documents, findings, sources } from '../../src/db/schema.js';

import {
  CANONICAL_DOCUMENT_COLUMN_TIES,
  CANONICAL_DOCUMENT_SAMPLE,
  CONTRACT_MEMBER_TYPE_ASSERTIONS,
} from './canonical-document.js';

// ---------------------------------------------------------------------------
// The live table
// ---------------------------------------------------------------------------

/**
 * Every column of `documents`, keyed by the name it has in the
 * database.
 *
 * `getTableColumns` reads the same table object drizzle-kit renders a
 * migration from, so what is looked up here is what the generated SQL
 * declares rather than a second reading of the schema module.
 */
const DOCUMENT_COLUMNS = new Map(
  Object.values(getTableColumns(documents)).map((column) => [column.name, column]),
);

/** Sorted copy, so an equality is over members rather than over order. */
function sorted(names: readonly string[]): readonly string[] {
  return [...names].sort();
}

// ---------------------------------------------------------------------------
// The null-vs-zero rule
// ---------------------------------------------------------------------------

/** A column, named by the numeric class it was declared under. */
interface ClassedColumn {
  /**
   * The table's name in the database, keyed on for the reason the
   * column is: what these lists describe is what the pipeline
   * selects from.
   */
  readonly table: string;
  /** The column's SQL name. */
  readonly column: string;
}

/**
 * The columns declared as signals — nullable, so an absent reading
 * is stored as absent.
 *
 * `score` is the measurement the rule is named for. The other two
 * are the document half of a version pin, on the list for the same
 * reason wearing a different shape: their NULL says this row was
 * never featurized, and any placeholder would name a scheme it was
 * never computed under — which the recompute that goes looking for
 * stale rows then reads as a row with nothing owing on it.
 * `embedding_model` is text rather than a number and is here
 * anyway, because what decides the class is whether the absent
 * state is a real reading, not the type it would be a reading in.
 */
const SIGNAL_COLUMNS: readonly ClassedColumn[] = [
  { table: 'findings', column: 'score' },
  { table: 'documents', column: 'feature_version' },
  { table: 'documents', column: 'embedding_model' },
];

/**
 * The columns declared as counters — NOT NULL, because zero is a
 * count rather than the absence of one.
 *
 * One today, and a list rather than a constant so the second is an
 * entry instead of a rewrite, and so the two cases below stay
 * symmetrical: the classes are two answers to one question, and
 * reading them side by side is most of what the pair is for.
 */
const COUNTER_COLUMNS: readonly ClassedColumn[] = [
  { table: 'sources', column: 'consecutive_failures' },
];

/**
 * The tables the two lists name.
 *
 * Written out rather than discovered from the barrel, which would
 * offer every table in the schema to lists that name three. An
 * entry naming a table absent from here fails as a column nothing
 * resolves, and the failure prints what was there to choose from,
 * so the fix reads off the message: add the table beside the entry.
 */
const CLASSED_TABLES: readonly Table[] = [documents, findings, sources];

/**
 * Every column of those tables, keyed `<table>.<column>` with both
 * halves the name the database has.
 */
function collectClassedColumns(): ReadonlyMap<string, Column> {
  const columns = new Map<string, Column>();

  for (const table of CLASSED_TABLES) {
    for (const column of Object.values(getTableColumns(table))) {
      columns.set(`${getTableName(table)}.${column.name}`, column);
    }
  }

  return columns;
}

const CLASSED_COLUMNS = collectClassedColumns();

/** The key a list entry and the lookup above are matched on. */
function keyOf(entry: ClassedColumn): string {
  return `${entry.table}.${entry.column}`;
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describe('canonical document — discovery', () => {
  // The per-tie cases below are generated from the tie list, and a
  // list that came back empty would generate none of them — a file
  // reporting green over nothing at all. This is the case that says so.
  it('ties at least one member to a column', () => {
    expect(CANONICAL_DOCUMENT_COLUMN_TIES.length).toBeGreaterThan(0);
  });

  // The same failure from the other side: ties to assert, and no table
  // to assert them against, which would fail every case below for one
  // cause wearing five names.
  it('resolves the columns of documents', () => {
    expect(DOCUMENT_COLUMNS.size).toBeGreaterThan(0);
  });
});

describe('canonical document — coverage', () => {
  // Equality in both directions, so it fails on a member the contract
  // has gained with no tie beside it and on a tie naming a member the
  // contract no longer declares. The first is the column check quietly
  // covering less than the contract; the second is a case still
  // asserting over a member that is gone.
  it('ties every member the contract declares', () => {
    const declared = Object.keys(CANONICAL_DOCUMENT_SAMPLE);
    const tied = CANONICAL_DOCUMENT_COLUMN_TIES.map((tie) => tie.member);

    expect(sorted(tied)).toEqual(sorted(declared));
  });

  // The type-level claims are only as wide as the members they name,
  // and this is the only reading of that width anything performs.
  it('asserts an exact type for every member the contract declares', () => {
    const declared = Object.keys(CANONICAL_DOCUMENT_SAMPLE);
    const asserted = Object.keys(CONTRACT_MEMBER_TYPE_ASSERTIONS);

    expect(sorted(asserted)).toEqual(sorted(declared));
  });
});

describe('canonical document — columns', () => {
  for (const tie of CANONICAL_DOCUMENT_COLUMN_TIES) {
    it(`${tie.member} maps onto documents.${tie.column}`, () => {
      const column = DOCUMENT_COLUMNS.get(tie.column);

      // Named against the columns the table actually has, so a failure
      // prints what was there to choose from instead of only that the
      // lookup missed.
      expect(sorted([...DOCUMENT_COLUMNS.keys()])).toContain(tie.column);
      // The type-level assertion says what a producer may hand over;
      // this says what the column will take. A contract is tied to a
      // column only when the two agree, and the drift that would
      // otherwise pass is a member widened to admit null against a
      // column that refuses it.
      expect(column?.notNull).toBe(tie.notNull);
    });
  }
});

describe('null-vs-zero — discovery', () => {
  // Each list generates its own cases, and a list emptied of its
  // entries generates none — a class reporting green over nothing
  // at all. One guard per list, because either can empty without
  // the other.
  it('declares at least one signal column', () => {
    expect(SIGNAL_COLUMNS.length).toBeGreaterThan(0);
  });

  it('declares at least one counter column', () => {
    expect(COUNTER_COLUMNS.length).toBeGreaterThan(0);
  });

  // Lists to assert, and no columns to assert them against, which
  // would fail every case below for one cause wearing four names.
  it('resolves the columns of the tables both lists name', () => {
    expect(CLASSED_COLUMNS.size).toBeGreaterThan(0);
  });
});

describe('null-vs-zero — signal columns', () => {
  for (const entry of SIGNAL_COLUMNS) {
    it(`${keyOf(entry)} is nullable`, () => {
      // Named against the columns those tables actually have, so a
      // failure prints what was there to choose from instead of
      // only that the lookup missed.
      expect(sorted([...CLASSED_COLUMNS.keys()])).toContain(keyOf(entry));
      expect(CLASSED_COLUMNS.get(keyOf(entry))?.notNull).toBe(false);
    });
  }
});

describe('null-vs-zero — counter columns', () => {
  for (const entry of COUNTER_COLUMNS) {
    it(`${keyOf(entry)} is not null`, () => {
      expect(sorted([...CLASSED_COLUMNS.keys()])).toContain(keyOf(entry));
      expect(CLASSED_COLUMNS.get(keyOf(entry))?.notNull).toBe(true);
    });
  }
});
