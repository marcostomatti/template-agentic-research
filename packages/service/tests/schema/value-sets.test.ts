/**
 * The value sets `src/db/schema/values.ts` declares, checked against a
 * set written out here.
 *
 * That module is the single declaration of every closed set the schema
 * pins a column to, which is what makes a test of it worth writing and
 * also what makes one easy to write vacuously: a case that imported a
 * tuple and compared it against itself would pass whatever the tuple
 * held. The expected members below are typed out by hand instead, so a
 * member added, dropped, or renamed over there has to be made here too
 * — and that second edit is where somebody reads what the change costs
 * the column's CHECK, the union derived from the tuple, and the rows
 * already stored under the old set.
 *
 * Which sets exist is not written out by hand, for the opposite reason.
 * The exported lists are discovered from the module namespace, so the
 * coverage case compares the module against the table rather than the
 * table against itself: a tuple added later with no expectation beside
 * it fails there, instead of shipping untested behind a green run.
 *
 * Set equality subsumes the other two assertions today, and they are
 * kept because it stops subsuming them the moment somebody clears a
 * failure by copying the module's new members into the expectation.
 * Non-empty and duplicate-free hold for any value set whatever its
 * members, and both are properties `checkOneOf` depends on: an empty
 * set renders `in ()`, invalid SQL surfacing a migration away from the
 * call that caused it, and a repeated member renders the same literal
 * twice into a CHECK nobody wrote by hand.
 *
 * `DEFAULT_VERDICT_VOCABULARY` is checked alongside the closed sets
 * even though it is the one export that is not one. It is an exported
 * list of values and all three properties mean the same thing for it —
 * a duplicated verdict is a defect wherever it turns up — while
 * leaving it out would take a rule for which exports to skip, and any
 * such rule can skip a real tuple too. That is the exact omission the
 * coverage case exists to catch.
 *
 * The last case is about `checkOneOf` rather than about a set, and it
 * belongs here because it closes the loop the module opens. A tuple
 * and the union derived from it agree by construction; the CHECK
 * rendered from the same tuple is a third reading that agrees only if
 * the rendering says so, and it is the reading no type checks. It is
 * handed a fixture tuple of its own rather than a real value set, so
 * a rendering that ignored its argument and printed some other tuple
 * could not pass for a correct one.
 */
import { PgDialect, pgTable, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as values from '../../src/db/schema/values.js';

// ---------------------------------------------------------------------------
// Expected sets
// ---------------------------------------------------------------------------

/** One exported value list, paired with the members it must hold. */
interface ValueSetExpectation {
  /**
   * Export name in `src/db/schema/values.ts`. Pairing by name rather
   * than by position means a reordered module still tests what it says
   * it tests, and an export left without an expectation is caught by
   * the coverage case rather than silently going untested.
   */
  readonly exportName: string;
  /**
   * What the set is, as the case name reads it: the column it is the
   * domain of, or — for the one open list — the setting it seeds.
   * Carried so a failure names the column that would start refusing
   * rows rather than only the constant that changed.
   */
  readonly describes: string;
  /**
   * The members, written out here rather than imported from the module
   * under test. This is the entire assertion: a copy of the set made
   * independently of the declaration, so the two disagreeing is what a
   * change to either one has to survive.
   */
  readonly members: readonly string[];
}

const VALUE_SET_EXPECTATIONS: readonly ValueSetExpectation[] = [
  {
    exportName: 'TERM_POLARITIES',
    describes: 'terms.polarity',
    members: ['positive', 'negative', 'ignore'],
  },
  {
    exportName: 'SOURCE_KINDS',
    describes: 'sources.kind',
    members: ['url', 'api', 'rss', 'push'],
  },
  {
    exportName: 'CONNECTOR_KINDS',
    describes: 'connectors.kind',
    members: ['llm', 'search', 'notebook', 'export_target'],
  },
  {
    exportName: 'EXPORT_FORMATS',
    describes: 'export_subscriptions.format',
    members: ['obsidian_md', 'notion_md', 'rss', 'pdf', 'email_draft'],
  },
  {
    exportName: 'DOCUMENT_PARSE_STATUSES',
    describes: 'documents.parse_status',
    members: ['ok', 'failed'],
  },
  {
    exportName: 'RESEARCH_POOL_STATUSES',
    describes: 'research_pool.status, source_config_proposals.status',
    members: ['pending', 'approved', 'done', 'skipped'],
  },
  {
    exportName: 'RUN_STATUSES',
    describes: 'runs.status',
    members: ['running', 'ok', 'partial', 'failed'],
  },
  {
    exportName: 'RUN_SCHEDULERS',
    describes: 'runs.scheduled_by',
    members: ['interval', 'agent', 'operator'],
  },
  // The open one. No CHECK is generated from it and no union is derived
  // from it, so the only thing holding its members steady is this case
  // and the seed that writes them into a domain's settings.
  {
    exportName: 'DEFAULT_VERDICT_VOCABULARY',
    describes: 'finding_labels.verdict, seeded default',
    members: ['avoid', 'caution', 'neutral', 'interested'],
  },
];

// ---------------------------------------------------------------------------
// Discovered exports
// ---------------------------------------------------------------------------

/**
 * Every value list the module exports, keyed by export name.
 *
 * Read off the module namespace rather than listed here. A hand-written
 * list would make the coverage case below a comparison of this file
 * against itself, which is green for any module at all — including one
 * that has grown a set nothing checks.
 */
function collectExportedValueLists(): ReadonlyMap<string, readonly string[]> {
  const lists = new Map<string, readonly string[]>();

  for (const [exportName, exported] of Object.entries(values)) {
    if (Array.isArray(exported)) {
      lists.set(exportName, exported);
    }
  }

  return lists;
}

const EXPORTED_VALUE_LISTS = collectExportedValueLists();

/**
 * The members exported under a name, or a throw naming the name that
 * has gone missing.
 *
 * Missing and wrong are different failures, and the coverage case is
 * the one that reports a missing export as such. Returning an empty
 * list here instead would report it three more times as an ordinary
 * empty set, which is a defect this file also has to be able to state
 * on its own.
 */
function exportedMembers(exportName: string): readonly string[] {
  const members = EXPORTED_VALUE_LISTS.get(exportName);

  if (members === undefined) {
    throw new Error(`values.ts exports no value list named ${exportName}`);
  }

  return members;
}

/** Sorted copy, so an equality is over members rather than over order. */
function sorted(members: readonly string[]): readonly string[] {
  return [...members].sort();
}

/** Members occurring more than once, each named once. */
function duplicates(members: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const member of members) {
    if (seen.has(member)) {
      repeated.add(member);
    }

    seen.add(member);
  }

  return [...repeated];
}

// ---------------------------------------------------------------------------
// checkOneOf fixture
// ---------------------------------------------------------------------------

/**
 * The tuple handed to `checkOneOf` by the rendering case.
 *
 * Two members because one cannot show the separator between them and a
 * longer tuple shows nothing the second does not. Members no value set
 * in the module declares, so a rendering that ignored its argument
 * would have nothing to print that this case would accept.
 */
const FIXTURE_MEMBERS = ['alpha', 'omega'] as const;

/**
 * A table owning the one column the fixture CHECK constrains, because
 * `checkOneOf` names a column in the SQL it builds.
 *
 * Declaring a table in a test file reaches no snapshot and no
 * migration: drizzle-kit reads `src/db/schema.ts` and nothing else, so
 * this one exists only for the duration of the case.
 */
const checkOneOfFixture = pgTable('check_one_of_fixture', {
  member: text('member').notNull(),
});

/**
 * Every single-quoted literal in a rendered statement, in order.
 *
 * The fixture members carry no quote of their own, so a literal here
 * cannot hold SQL's doubled-quote escape and the simple form is exact.
 * A member that did carry one would need the escape unpicked before
 * this could be compared against the tuple.
 */
function literalsIn(renderedSql: string): readonly string[] {
  return [...renderedSql.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? '');
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describe('value sets — coverage', () => {
  // Equality in both directions, so it fails on an export the table has
  // no expectation for and on an expectation naming an export that is
  // gone. The first is coverage shrinking silently; the second is a
  // case still passing over a set nothing declares any more.
  it('expects a set for every value list the module exports', () => {
    const expected = VALUE_SET_EXPECTATIONS.map((expectation) => expectation.exportName);
    const exported = [...EXPORTED_VALUE_LISTS.keys()];

    expect(sorted(expected)).toEqual(sorted(exported));
  });
});

describe('value sets — members', () => {
  for (const expectation of VALUE_SET_EXPECTATIONS) {
    // `checkOneOf` types its parameter non-empty so this cannot reach a
    // migration, and the assertion is kept anyway: the tuple is read by
    // more than the CHECK, and an empty one is a set that has stopped
    // meaning anything wherever it is read.
    it(`${expectation.exportName} holds at least one member`, () => {
      const members = exportedMembers(expectation.exportName);

      expect(members.length).toBeGreaterThan(0);
    });

    // Compared against an empty array rather than a count, so a failure
    // prints the repeated members themselves.
    it(`${expectation.exportName} holds no duplicate member`, () => {
      const members = exportedMembers(expectation.exportName);

      expect(duplicates(members)).toEqual([]);
    });

    it(`${expectation.exportName} matches its expected set (${expectation.describes})`, () => {
      const members = exportedMembers(expectation.exportName);

      expect(sorted(members)).toEqual(sorted(expectation.members));
    });
  }
});

describe('checkOneOf — rendered SQL', () => {
  // Rendered through the Postgres dialect because that is how
  // drizzle-kit reads a check when it writes a migration, so what this
  // case reads is the text that reaches the file rather than a
  // separate rendering of the same builder.
  it('names every member of the tuple it is given', () => {
    const constraint = values.checkOneOf(
      'check_one_of_fixture_member_check',
      checkOneOfFixture.member,
      FIXTURE_MEMBERS,
    );

    const rendered = new PgDialect().sqlToQuery(constraint.value);

    // Equality rather than a search per member, so the case fails both
    // on a member the SQL left out and on a literal the tuple never
    // held.
    expect(sorted(literalsIn(rendered.sql))).toEqual(sorted(FIXTURE_MEMBERS));
    // The same failure stated as its cause. Values left as bound
    // parameters render as `$1` into a migration file that binds
    // nothing, and the CHECK then names no member at all.
    expect(rendered.params).toEqual([]);
  });
});
