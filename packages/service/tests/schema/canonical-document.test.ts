/**
 * `CanonicalDocument` against the `documents` table — the half of the
 * tie a runner can check.
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
 * see, and there are two such things.
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
 * The honest limit, since it is the sort a reader assumes away:
 * deleting the type-level claims from the module beside this one
 * leaves every case here green. This suite proves they cover the
 * right members, not that they are still there — the gate for that is
 * `check-types`, which reads that file and skips this one.
 */
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { documents } from '../../src/db/schema.js';

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
