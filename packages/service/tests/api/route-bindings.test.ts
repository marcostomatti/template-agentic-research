/**
 * The seventeen binding tables read as ONE surface, held against the
 * seventeen routers this package declares.
 *
 * WHAT THIS FILE ASKS THAT THE SEVENTEEN COLOCATED CASES DO NOT is
 * the union. Every `*routes.test.ts` already holds its own table
 * against its own router, so a route added to a router without a
 * binding fails in that module before anything here runs. What none
 * of them can see is the surface those tables add up to, which is
 * what an assembled document reads: whether the seventeen together
 * cover the whole declared API, whether two of them claim one
 * label, and whether a member said to hold a schema holds one at
 * RUNTIME.
 *
 * THE LAST OF THOSE IS THE ONE NO TYPE CAN MAKE. Each table closes
 * with `as const satisfies Readonly<Record<string, RouteSchemas>>`,
 * so a member bound to the wrong KIND of thing is a failed
 * `check-types`. A member bound to an import that resolved to
 * nothing is an `undefined` at runtime and a clean compile — a
 * route documented with its query silently undescribed — and
 * `routeSchemasFor` in `src/http/openapi-bindings.ts` is the guard
 * written for exactly that. This is where it is run over the whole
 * surface.
 *
 * IT IS ALSO WHERE THE AUTH PREFIX MEETS ITSELF. `authRouteSchemas`
 * writes `/auth` into its keys by hand, because a label is the
 * string on the wire; `tests/helpers/route-labels.ts` READS that
 * mount out of `src/index.ts` rather than transcribing it. The
 * equality below is the one comparison the two spellings sit on
 * opposite sides of, so a mount moved in `src/index.ts` and not
 * followed in the table fails here naming both labels.
 *
 * THE SET ON THE ROUTER SIDE, AND THE REASON IS MEASURED RATHER
 * THAN IDIOM. `labelsOf` answers one label per HANDLER and not per
 * route, so the attempt limiter ahead of the login handler makes
 * `POST /auth/login` answer twice: the declared LIST is one longer
 * than its SET, against a key count that matches the set exactly. A
 * comparison of COUNTS is therefore wrong before it is imprecise —
 * it reads a complete surface as one route short — and a case below
 * names that duplicate rather than leaving the `new Set` to be read
 * as tidiness.
 *
 * THE PLANTS COME FIRST, deliberately. Every reading in the second
 * describe is a zero over the real tables, and a comparison that
 * had stopped comparing answers a zero too. The first describe
 * drives one plant per family through the same functions the second
 * reads, including a plant that leaves the two key COUNTS EQUAL —
 * which is what makes `names the label rather than reporting a
 * count` a measurement instead of a preference.
 */

import type { RouteSchemas } from '../../src/http/openapi-bindings.js';
import type { DeclaredRouter } from '../helpers/route-labels.js';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { authRouteSchemas } from '../../src/auth/routes.js';
import { connectorsRouteSchemas } from '../../src/connectors/routes.js';
import { documentsRouteSchemas } from '../../src/documents/routes.js';
import { domainsRouteSchemas } from '../../src/domains/routes.js';
import { entitiesRouteSchemas } from '../../src/entities/routes.js';
import { findingsRouteSchemas } from '../../src/findings/routes.js';
import { routeSchemasFor } from '../../src/http/openapi-bindings.js';
import { personasRouteSchemas } from '../../src/personas/routes.js';
import { runsRouteSchemas } from '../../src/runs/routes.js';
import { spendRouteSchemas } from '../../src/runs/spend-routes.js';
import { settingsRouteSchemas } from '../../src/settings/routes.js';
import {
  sourceFailuresRouteSchemas,
} from '../../src/sources/failures-routes.js';
import {
  sourceProposalsRouteSchemas,
} from '../../src/sources/proposals-routes.js';
import { sourcesRouteSchemas } from '../../src/sources/routes.js';
import {
  subscriptionsRouteSchemas,
} from '../../src/subscriptions/routes.js';
import {
  categoriesRouteSchemas,
} from '../../src/taxonomy/categories-routes.js';
import { termsRouteSchemas } from '../../src/taxonomy/terms-routes.js';
import { topicsRouteSchemas } from '../../src/topics/routes.js';
import {
  buildAuthRouterEntry,
  buildResearchRouters,
} from '../helpers/route-labels.js';

// ---------------------------------------------------------------------------
// The two rosters
// ---------------------------------------------------------------------------

/** One router module's binding table, named as its router is named. */
interface BoundRouter {
  /** The name `buildResearchRouters` gives the same router. */
  readonly name: string;

  /** Its table, keyed by route label. */
  readonly table: Readonly<Record<string, RouteSchemas>>;
}

/**
 * Every binding table this package exports, in the order
 * `src/index.ts` mounts the routers that declare them.
 *
 * Written out rather than discovered by a scan over the source
 * tree, because a scan would go quietly short the day a module was
 * renamed. The roster being a literal is what lets the first case
 * below hold its names against the walk and name the one that went
 * missing, one reading earlier than the coverage equality would.
 */
const BOUND_ROUTERS: readonly BoundRouter[] = [
  { name: 'domains', table: domainsRouteSchemas },
  { name: 'categories', table: categoriesRouteSchemas },
  { name: 'terms', table: termsRouteSchemas },
  { name: 'personas', table: personasRouteSchemas },
  { name: 'settings', table: settingsRouteSchemas },
  { name: 'topics', table: topicsRouteSchemas },
  { name: 'sources', table: sourcesRouteSchemas },
  { name: 'source-failures', table: sourceFailuresRouteSchemas },
  { name: 'connectors', table: connectorsRouteSchemas },
  { name: 'exports', table: subscriptionsRouteSchemas },
  { name: 'findings', table: findingsRouteSchemas },
  { name: 'documents', table: documentsRouteSchemas },
  { name: 'entities', table: entitiesRouteSchemas },
  { name: 'runs', table: runsRouteSchemas },
  { name: 'spend', table: spendRouteSchemas },
  { name: 'proposals', table: sourceProposalsRouteSchemas },
  { name: 'auth', table: authRouteSchemas },
];

/**
 * The seventeen routers, walked: the sixteen research ones at the
 * root and the auth one at the mount `src/index.ts` gives it.
 *
 * The auth entry is a separate export so that a consumer chooses
 * whether to walk it, and this surface is one that wants it — the
 * document describes those three routes, so the tables have to
 * cover them.
 */
const DECLARED_ROUTERS: readonly DeclaredRouter[] = [
  ...buildResearchRouters(),
  buildAuthRouterEntry(),
];

/** Every label those routers declare, duplicates included. */
const DECLARED_LABEL_LIST = DECLARED_ROUTERS.flatMap(
  (entry) => entry.labels,
);

/** The same labels as a set, which is what the equality compares. */
const DECLARED_LABELS = new Set(DECLARED_LABEL_LIST);

// ---------------------------------------------------------------------------
// The readings
// ---------------------------------------------------------------------------

/** Which labels one side carries and the other does not. */
interface CoverageGaps {
  /** Declared by a router and keyed by no table. */
  readonly unbound: readonly string[];

  /** Keyed by a table and declared by no router. */
  readonly undeclared: readonly string[];
}

/** One table entry, named as a failure would have to name it. */
interface BoundEntry {
  /** `<router> <label>`. */
  readonly name: string;

  /** The binding that label carries. */
  readonly binding: RouteSchemas;
}

/** One bound member, and whatever it actually holds. */
interface BoundMember {
  /** `<router> <label> <member>`. */
  readonly name: string;

  /** Read as `unknown` on purpose: the type is what is in doubt. */
  readonly schema: unknown;
}

/**
 * The coverage equality, as two NAMED sets rather than a total.
 *
 * @param roster - The binding tables to read.
 * @returns The labels missing from each side, sorted. Both empty is
 *   the passing answer, and either one names what moved.
 */
function coverageGapsOf(roster: readonly BoundRouter[]): CoverageGaps {
  const bound = new Set(roster.flatMap((entry) => Object.keys(entry.table)));
  const unbound = [...DECLARED_LABELS].filter((label) => !bound.has(label));
  const extra = [...bound].filter((label) => !DECLARED_LABELS.has(label));

  return { unbound: unbound.sort(), undeclared: extra.sort() };
}

/**
 * Which labels more than one table keys, named with the tables that
 * share them.
 *
 * @param roster - The binding tables to read.
 * @returns One `<label>: <router> + <router>` line per shared
 *   label, sorted. Empty is the passing answer.
 */
function collisionsAmong(roster: readonly BoundRouter[]): string[] {
  const owners = new Map<string, string[]>();

  for (const entry of roster) {
    for (const label of Object.keys(entry.table)) {
      const held = owners.get(label) ?? [];

      held.push(entry.name);
      owners.set(label, held);
    }
  }

  const shared: string[] = [];

  for (const [label, names] of owners) {
    if (names.length > 1) shared.push(`${label}: ${names.join(' + ')}`);
  }

  return shared.sort();
}

/**
 * Every entry of every table in the roster, flattened.
 *
 * @param roster - The binding tables to read.
 * @returns One entry per route, named by router and label.
 */
function bindingsOf(roster: readonly BoundRouter[]): BoundEntry[] {
  const entries: BoundEntry[] = [];

  for (const entry of roster) {
    for (const [label, binding] of Object.entries(entry.table)) {
      entries.push({ name: `${entry.name} ${label}`, binding });
    }
  }

  return entries;
}

/**
 * Every member those entries bind, with what each one holds.
 *
 * The spread is what gets the members out at all: `RouteSchemas` is
 * an interface and carries no index signature, so `Object.entries`
 * over it answers `any` where the same call over the anonymous type
 * a spread produces answers the members.
 *
 * @param entries - Per {@link bindingsOf}.
 * @returns One member per bound schema. An entry binding nothing
 *   contributes none, which `GET /settings` really does.
 */
function membersOf(entries: readonly BoundEntry[]): BoundMember[] {
  const members: BoundMember[] = [];

  for (const entry of entries) {
    const bound: Record<string, unknown> = { ...entry.binding };

    for (const [member, schema] of Object.entries(bound)) {
      members.push({ name: `${entry.name} ${member}`, schema });
    }
  }

  return members;
}

/** How many labels the roster keys in total, duplicates included. */
function keyCountOf(roster: readonly BoundRouter[]): number {
  return roster.flatMap((entry) => Object.keys(entry.table)).length;
}

/**
 * A copy of `table` with one label gone.
 *
 * @param table - The table to copy. Not touched.
 * @param label - The key to drop.
 * @returns A new table carrying every other key.
 */
function withoutLabel(
  table: Readonly<Record<string, RouteSchemas>>,
  label: string,
): Record<string, RouteSchemas> {
  const kept = Object.entries(table).filter(([key]) => key !== label);

  return Object.fromEntries(kept);
}

/**
 * The roster with one router's table replaced.
 *
 * @param roster - The roster to copy. Not touched.
 * @param name - Which router's table to swap out.
 * @param table - What to put in its place.
 * @returns A new roster of the same length and order.
 */
function withTable(
  roster: readonly BoundRouter[],
  name: string,
  table: Readonly<Record<string, RouteSchemas>>,
): BoundRouter[] {
  return roster.map((entry) => {
    if (entry.name !== name) return entry;

    return { name: entry.name, table };
  });
}

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

/** A route this surface really binds, dropped by the plants below. */
const REMOVED_LABEL = 'GET /domains/:slug';

/** A label in the same register, naming a route nothing declares. */
const FABRICATED_LABEL = 'GET /runs/:id/zz-no-such-route';

describe('route bindings - the plants', () => {
  // The negative first, because every reading in the next describe
  // is a zero over the real tables and a comparison that had
  // stopped comparing answers a zero too. The label dropped here is
  // one the table REALLY carries, asserted rather than assumed: a
  // fabricated one is absent for the trivial reason and would
  // report on nothing.
  it('names the label a deleted key stops binding', () => {
    expect(Object.keys(domainsRouteSchemas)).toContain(REMOVED_LABEL);

    const table = withoutLabel(domainsRouteSchemas, REMOVED_LABEL);
    const gaps = coverageGapsOf(withTable(BOUND_ROUTERS, 'domains', table));

    // NAMED, and in the direction the deletion belongs to. What a
    // total would have said instead is that one number moved.
    expect(gaps.unbound).toEqual([REMOVED_LABEL]);
    expect(gaps.undeclared).toEqual([]);
  });

  // What the case above cannot say on its own: that the equality
  // reads a SET DIFFERENCE rather than a total that happens to
  // move. This plant drops one key and adds another, so the key
  // COUNTS are identical on both sides and only the named sets
  // differ — a comparison of counts is green over it, in both
  // directions at once.
  it('names both gaps a count-preserving plant leaves', () => {
    const trimmed = withoutLabel(domainsRouteSchemas, REMOVED_LABEL);
    const grown = { ...runsRouteSchemas, [FABRICATED_LABEL]: {} };
    const planted = withTable(
      withTable(BOUND_ROUTERS, 'domains', trimmed),
      'runs',
      grown,
    );
    const gaps = coverageGapsOf(planted);

    expect(keyCountOf(planted)).toBe(keyCountOf(BOUND_ROUTERS));
    expect(gaps.unbound).toEqual([REMOVED_LABEL]);
    expect(gaps.undeclared).toEqual([FABRICATED_LABEL]);
  });

  // The disjointness zero, given a plant of its own. Two tables
  // keying one label is what an assembled document cannot survive,
  // one binding silently winning — and the coverage equality above
  // is blind to it, a duplicate collapsing into the same union.
  // Planted with a REAL label from another table rather than a
  // fabricated one, so it is the shape that would actually happen.
  it('names a label two tables both key', () => {
    const grown = { ...runsRouteSchemas, [REMOVED_LABEL]: {} };
    const planted = withTable(BOUND_ROUTERS, 'runs', grown);

    expect(collisionsAmong(planted)).toEqual([
      `${REMOVED_LABEL}: domains + runs`,
    ]);
    // And the coverage equality stays GREEN over the same plant,
    // which is why the disjointness reading is not redundant.
    expect(coverageGapsOf(planted).unbound).toEqual([]);
    expect(coverageGapsOf(planted).undeclared).toEqual([]);
  });

  // The runtime half, which no `satisfies` can make. The cast is
  // the point rather than a shortcut: the type refuses this
  // literal, so the only way to reach the guard with one is to go
  // around the type — which is exactly what a member bound to an
  // import that resolved to nothing does at runtime.
  it('names a member bound to something that is not a schema', () => {
    const loose = { query: 'not-a-schema' } as unknown as RouteSchemas;
    const grown = { ...runsRouteSchemas, [FABRICATED_LABEL]: loose };
    const planted = withTable(BOUND_ROUTERS, 'runs', grown);
    const members = membersOf(bindingsOf(planted));
    const named = members.filter(
      (member) => !(member.schema instanceof z.ZodType),
    );

    expect(named.map((member) => member.name)).toEqual([
      `runs ${FABRICATED_LABEL} query`,
    ]);
    expect(routeSchemasFor(loose)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------

describe('route bindings - the surface', () => {
  // Seventeen as a measurement rather than a numeral in a header.
  // The roster above is a literal, so a module renamed out from
  // under it would leave a whole table unread and the coverage
  // equality would then report every one of that router's labels;
  // this names the router instead, one reading earlier.
  it('names one table per router the walk answers', () => {
    const bound = BOUND_ROUTERS.map((entry) => entry.name).sort();
    const declared = DECLARED_ROUTERS.map((entry) => entry.name).sort();

    expect(bound).toStrictEqual(declared);
    // The seventeenth is the one a consumer has to opt into, so it
    // is asserted present rather than left to the equality above to
    // imply: a roster built from `buildResearchRouters` alone would
    // satisfy that equality and cover three routes fewer.
    expect(bound).toContain('auth');
  });

  // Why the equality below takes a SET on the router side, as a
  // reading rather than an idiom. `labelsOf` answers one label per
  // HANDLER, so the attempt limiter ahead of the login handler
  // makes that route answer twice, and a comparison of COUNTS
  // reads a complete surface as one route short.
  it('names the one label the declared list repeats', () => {
    const seen = new Set<string>();
    const repeated = new Set<string>();

    for (const label of DECLARED_LABEL_LIST) {
      if (seen.has(label)) repeated.add(label);

      seen.add(label);
    }

    expect([...repeated]).toEqual(['POST /auth/login']);
    expect(DECLARED_LABEL_LIST.length).toBe(DECLARED_LABELS.size + 1);
    expect(keyCountOf(BOUND_ROUTERS)).toBe(DECLARED_LABELS.size);
  });

  // Both directions in one reading, each as a NAMED set: a route
  // this surface declares and no table binds is as red as a key
  // naming no route. The plants above are what say the two
  // directions are live rather than two empty arrays.
  it('binds every declared label and no other', () => {
    const gaps = coverageGapsOf(BOUND_ROUTERS);

    expect(gaps.unbound).toEqual([]);
    expect(gaps.undeclared).toEqual([]);
  });

  // Pairwise disjoint, named with the tables that would share a
  // label. The colocated cases reach this fault from the other
  // side — a table keying a label its own router does not declare
  // reddens in that module — but only if all seventeen of them
  // exist, and an assembled document needs the answer whether they
  // do or not.
  it('keys no label in two tables', () => {
    expect(collisionsAmong(BOUND_ROUTERS)).toEqual([]);
  });

  // The runtime claim, over every member of every table. A member
  // holding an import that resolved to nothing is an `undefined`
  // here and a clean `check-types`, which is the one fault that
  // would put a route in a document with its query undescribed.
  // `routeSchemasFor` is the same question asked by the module that
  // declares the shape, and it refuses an unknown member name
  // besides.
  it('binds a zod schema to every member it declares', () => {
    const entries = bindingsOf(BOUND_ROUTERS);
    const members = membersOf(entries);
    const loose = members.filter(
      (member) => !(member.schema instanceof z.ZodType),
    );
    const notBindings = entries.filter(
      (entry) => !routeSchemasFor(entry.binding),
    );

    expect(loose.map((member) => member.name)).toEqual([]);
    expect(notBindings.map((entry) => entry.name)).toEqual([]);
    // Over a real population rather than an empty one: the tables
    // between them bind more members than they have entries, which
    // an accessor that had stopped reading could not answer.
    expect(members.length).toBeGreaterThan(entries.length);
  });
});
