/**
 * The MCP exposure invariant, run against the routers this package
 * declares and the registry `src/mcp/tools/registry.ts` exports.
 *
 * THE RULE HAS TWO DIRECTIONS AND THE SECOND IS WHERE A GAP HIDES.
 * Three surfaces are banned from this protocol outright — the two
 * connector routes that TAKE a credential, the domain delete, and
 * every route under the control plane — and no entry of
 * {@link MCP_TOOLS} may name one. That is the direction a reader
 * expects. The other is that every route label the routers declare
 * is either exposed by a tool, banned, or written out below as a
 * deliberate absence carrying the reason it is one. A route added
 * to any router and to none of the three rosters fails here, so
 * "nothing exposes it yet" and "nobody has looked" stop being the
 * same state.
 *
 * A ROUTE IS A LABEL, in the vocabulary `McpToolEntry.route`
 * already uses: the verb uppercased, one space, then the express
 * path TEMPLATE with its parameters intact. `tests/api/wiring.
 * test.ts` builds the same string off the same `stack` for a
 * different subject — that every mounted route sits behind the auth
 * guard — so the two files share a vocabulary and nothing else.
 *
 * DECLARED, NOT MOUNTED, and the two sets are free to differ: a
 * router can be built and not yet mounted, or mounted and later
 * taken down. Sixteen routers are built below, and how many of them
 * `src/index.ts` mounts is deliberately not a number this file
 * carries — `tests/api/wiring.test.ts` is where the mounted set is
 * held honest. What a tool reaches is a service function rather than
 * a mount — a handler calls the same function the route handler
 * calls, with no express in between — so the surface a tool COULD
 * name is what the routers declare. Reading the mounted set instead
 * would go green over a router that had been unmounted, which is a
 * wiring fault and not an exposure one.
 *
 * THE CONTROL PLANE IS WALKED FOR ITS LABELS. "Anything under
 * /_control" stays a sentence until the routes it covers are read
 * off the framework router, so `createControlRouter` is built here
 * and its layers are labelled at the mount `lib/express/builtin-
 * routes.ts` gives them. That prefix is READ out of that module
 * rather than transcribed: a mount moved elsewhere would otherwise
 * leave this file classifying a prefix nothing serves, and the
 * banned roster would go quietly empty. The read refuses rather
 * than falls back, so a formatting change to that one line fails
 * the file naming itself instead of shrinking what it covers.
 *
 * THE AUTH ROUTER IS DELIBERATELY NOT WALKED, and leaving it out is
 * the stronger statement rather than the weaker one. Its routes
 * answer a different envelope, share no service function with
 * anything on this surface, and are mounted outside it. A tool
 * naming `POST /auth/login` is caught on the EXPOSED side instead:
 * that label is in no walked router, so the covering equality fails
 * on it. Listing the three as deliberate absences would have made
 * them legal members of the walked set, which is the opposite of
 * what is wanted for a credential surface.
 *
 * THE BANNED CLASSIFIER IS TWO SHAPES AND NEEDS A PLANT PER FAMILY.
 * Two families are written-out labels and the third is a path
 * PREFIX, so an entry planted over one says nothing about the
 * other. The plant case drives one per family through the same
 * function in the same case, each with a fabricated near miss
 * beside it. The near misses are near ON PURPOSE —
 * `POST /_controls/stop` is what says the prefix rule is not a bare
 * `startsWith` — since a fabricated label nothing resembles is
 * absent for the trivial reason and reports on nothing.
 *
 * THE SCHEMA IDENTITY IS KEYED BY ROUTE, which is what makes it a
 * second reading rather than a copy of one. Each wave module test
 * pairs a schema with a tool NAME; the table below pairs it with
 * the ROUTE the entry carries, so an entry holding a sibling
 * route's schema — the findings list schema on the findings get,
 * both exported from one module — reddens here and could pass
 * there. `Object.is` and never `toEqual`: a restated copy satisfies
 * the second, and being restated is the whole fault.
 *
 * Those rows are all satisfied by a surface where one schema is
 * shared by everything, so the case asserting the paired schemas
 * are DISTINCT objects sits beside them, and the case holding the
 * row set equal to the exposed route set is what makes a tool
 * registered without a row fail naming itself.
 *
 * The walk is established before any of that. A partition over an
 * empty set holds and so does a classifier over one, so every
 * router has to contribute at least one label — asserted as a set
 * difference, which names the router that went quiet rather than
 * reporting a number that moved.
 *
 * MEASURED, SEVENTEEN LEGS, the whole grid run twice with the
 * per-leg failed SETS identical member for member across the two
 * runs. Every case below is reached by one of them, and the sharp
 * ones are worth naming. A route ADDED to a router and named by no
 * roster reddens the covering ALONE, which is the claim this file
 * exists for. Loosening the prefix rule to a bare `startsWith`
 * reddens the plant case ALONE, which is what the near misses are
 * for. A route module ALIASING a sibling schema reddens the
 * distinctness case alone, and an entry TAKING a sibling schema
 * reddens its own identity row alone — two faults one case apart. An
 * entry whose route moves onto a banned label reddens six, the plant
 * case among them; a router registering its path as middleware, so
 * that it declares no label at all, reddens the walk case beside the
 * covering; and killing either half of the classifier reddens the
 * plant case and the covering together. Making the mount read fail
 * to match its module takes the whole FILE down at collection, which
 * is that refusal being deliberate rather than tidy.
 *
 * TWO HONEST ZEROS, AND THEY ARE THE SAME ONE. Moving the mount in
 * `lib/express/builtin-routes.ts` reddens NOTHING, with or without
 * this file transcribing the old prefix in place of the read —
 * because the walk labels the control router at whatever
 * {@link CONTROL_MOUNT} says and the classifier reads that same
 * constant, so a wrong mount moves both sides together and no
 * equality here can see it. What the read buys is the refusal above
 * and not a cross-check: a mount that MOVED is followed, a mount
 * that cannot be READ fails the file, and a mount derived WRONGLY
 * would be invisible. Closing that would mean standing a service up
 * to see where the router is really mounted, which is
 * `tests/api/wiring.test.ts`'s subject rather than this one.
 *
 * The package root is derived from this file's own location rather
 * than from the working directory, so the same tree is read
 * whether the suite is started from the package or from the repo
 * root.
 */

import type { ControlConfig } from '../../lib/express/control/types.js';
import type { McpToolEntry } from '../../src/mcp/tools/registry.js';
import type { Router } from 'express';
import type { ZodType } from 'zod';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createControlRouter } from '../../lib/express/control/routes.js';
import {
  buildConnectorsRouter,
  connectorListToolInputSchema,
} from '../../src/connectors/routes.js';
import {
  buildDocumentsRouter,
  documentListToolInputSchema,
} from '../../src/documents/routes.js';
import {
  buildDomainsRouter,
  domainListToolInputSchema,
  domainReadToolInputSchema,
} from '../../src/domains/routes.js';
import {
  buildEntitiesRouter,
  entityApproveResearchToolInputSchema,
  entityReadToolInputSchema,
  entityResearchListToolInputSchema,
} from '../../src/entities/routes.js';
import {
  buildFindingsRouter,
  findingListToolInputSchema,
  findingReadToolInputSchema,
  findingVerdictToolInputSchema,
} from '../../src/findings/routes.js';
import { MCP_TOOLS } from '../../src/mcp/tools/registry.js';
import {
  buildPersonasRouter,
  personaListToolInputSchema,
} from '../../src/personas/routes.js';
import {
  buildRunsRouter,
  runListToolInputSchema,
  runReadToolInputSchema,
} from '../../src/runs/routes.js';
import {
  buildSpendRouter,
  spendSummaryToolInputSchema,
} from '../../src/runs/spend-routes.js';
import {
  buildSettingsRouter,
  settingsReadToolInputSchema,
} from '../../src/settings/routes.js';
import {
  buildSourceFailuresRouter,
  sourceFailureListToolInputSchema,
} from '../../src/sources/failures-routes.js';
import {
  buildSourceProposalsRouter,
  pendingConfigListToolInputSchema,
  sourceApproveConfigToolInputSchema,
} from '../../src/sources/proposals-routes.js';
import {
  buildSourcesRouter,
  sourceListToolInputSchema,
} from '../../src/sources/routes.js';
import {
  buildSubscriptionsRouter,
  subscriptionListToolInputSchema,
  subscriptionRunNowToolInputSchema,
} from '../../src/subscriptions/routes.js';
import {
  buildCategoriesRouter,
  categoryListToolInputSchema,
} from '../../src/taxonomy/categories-routes.js';
import {
  buildTermsRouter,
  termCreateToolInputSchema,
  termListToolInputSchema,
  termPatchToolInputSchema,
} from '../../src/taxonomy/terms-routes.js';
import {
  buildTopicsRouter,
  topicListToolInputSchema,
  topicRunNowToolInputSchema,
} from '../../src/topics/routes.js';
import {
  createMemoryResearchStore,
} from '../helpers/memory-research-store.js';

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

/** Root of `@ar/service`, two levels above `tests/invariants/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The module that mounts the control plane, package-relative.
 *
 * Read rather than imported: `mountBuiltinRoutes` takes an
 * `Application` and a resolved config, so reaching the prefix
 * through it would mean standing up a service to ask a question
 * about one string.
 */
const BUILTIN_ROUTES_MODULE = 'lib/express/builtin-routes.ts';

/**
 * Where the control plane is mounted, read out of the module above.
 *
 * @returns The prefix `mountBuiltinRoutes` passes to `app.use`.
 * @throws When that call is no longer a literal this can read, which
 *   is the honest failure: a fallback would leave the banned roster
 *   classifying a prefix nothing serves and answering an empty set,
 *   and nothing downstream would report it.
 *
 * @remarks
 * The one place this file takes a fact from the framework half
 * rather than from a router it built. A mount moved to another path
 * is then a change this file follows, where a transcribed `/_control`
 * would go on classifying the old one.
 */
function readControlMount(): string {
  const source = readFileSync(
    join(PACKAGE_ROOT, BUILTIN_ROUTES_MODULE),
    'utf8',
  );
  const mount = /app\.use\('([^']+)', createControlRouter\(/.exec(source);

  if (mount === null || mount[1] === undefined) {
    throw new Error(
      `${BUILTIN_ROUTES_MODULE} no longer mounts createControlRouter at a `
      + 'literal path, so the control-plane prefix cannot be derived.',
    );
  }

  return mount[1];
}

/**
 * The control-plane prefix, resolved once for the whole file.
 *
 * At module scope on `tests/invariants/naming.test.ts`'s terms: a
 * surface that cannot be built belongs to the file rather than to
 * one case, and there is nothing left to assert about a partition
 * once the roster one third of it rests on is wrong.
 */
const CONTROL_MOUNT = readControlMount();

/**
 * The secret the control router is built with here.
 *
 * Never presented and never compared: `controlAuth` is a
 * `router.use` layer, which carries no `route` and is therefore
 * invisible to the walk below. The router is constructed for its
 * REGISTRATIONS and never driven, so no request reaches a guard.
 */
const CONTROL_SECRET = 'zz-not-a-secret';

/** The service id the control router reports. Never read here. */
const CONTROL_SERVICE_ID = 'zz-exposure-invariant';

/**
 * One router, and the labels it declares at the mount it is read at.
 */
interface DeclaredRouter {
  /** What the failure message calls it. */
  readonly name: string;

  /** Its labels, per {@link labelsOf}. */
  readonly labels: readonly string[];
}

/**
 * The one spelling of a route label, so the registry, the rosters
 * and the routers are all compared in one vocabulary.
 *
 * @param method - The verb, in whatever case its source spells it.
 * @param path - The express path template, mount prefix included.
 * @returns `GET /domains/:slug` and the like.
 */
function labelFor(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * The labels of every route a router registered.
 *
 * `router.stack` carries one layer per registered path and that
 * layer's own `stack` carries one layer per handler, which is where
 * the verb is legible at all. A `router.use` middleware layer has no
 * `route` and contributes nothing, which is what keeps the control
 * plane's two guards out of the answer.
 *
 * @param router - A built router.
 * @param prefix - Where the host application mounts it, or the empty
 *   string for a router mounted at the root.
 * @returns One label per verb-and-path pair it declares, duplicates
 *   included: a path registered with two handlers on one verb
 *   answers twice, and the set the partition is taken over is what
 *   collapses them.
 */
function labelsOf(router: Router, prefix: string): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;

    if (route === undefined) return [];

    const path = `${prefix}${route.path}`;

    return route.stack.map((inner) => labelFor(inner.method, path));
  });
}

/**
 * The sixteen routers serving the research surface, each read at the
 * root.
 *
 * Built over one in-memory store rather than a wired service: a
 * router factory registers its routes at construction and reads
 * nothing, so what this answers is the routers' own declaration and
 * not a fact about a running deployment. Which of them
 * `src/index.ts` mounts is a separate question, asked in
 * `tests/api/wiring.test.ts`; see the header for why the two sets
 * being free to differ is the point rather than a gap.
 *
 * @returns One entry per router, in the order `src/index.ts` mounts
 *   them.
 */
function buildResearchRouters(): readonly DeclaredRouter[] {
  const store = createMemoryResearchStore();
  const clock = (): Date => new Date();

  const routers = [
    { name: 'domains', router: buildDomainsRouter({ store }) },
    { name: 'categories', router: buildCategoriesRouter({ store }) },
    { name: 'terms', router: buildTermsRouter({ store }) },
    { name: 'personas', router: buildPersonasRouter({ store }) },
    { name: 'settings', router: buildSettingsRouter({ store }) },
    { name: 'topics', router: buildTopicsRouter({ store, clock }) },
    { name: 'sources', router: buildSourcesRouter({ store }) },
    { name: 'source-failures', router: buildSourceFailuresRouter({ store }) },
    { name: 'connectors', router: buildConnectorsRouter({ store }) },
    { name: 'exports', router: buildSubscriptionsRouter({ store, clock }) },
    { name: 'findings', router: buildFindingsRouter({ store }) },
    { name: 'documents', router: buildDocumentsRouter({ store }) },
    { name: 'entities', router: buildEntitiesRouter({ store }) },
    { name: 'runs', router: buildRunsRouter({ store }) },
    { name: 'spend', router: buildSpendRouter({ store, clock }) },
    { name: 'proposals', router: buildSourceProposalsRouter({ store }) },
  ];

  return routers.map((entry) => ({
    name: entry.name,
    labels: labelsOf(entry.router, ''),
  }));
}

/**
 * The framework control plane, read at the mount it is served from.
 *
 * Constructed with no dependencies and no clients, which changes
 * nothing about what it REGISTERS: the two guards are middleware and
 * the seven routes are declared unconditionally, `POST /stop`
 * included — that route answers `404` when `allowStop` is unset
 * rather than going unregistered, which its own module says in as
 * many words.
 *
 * @returns The one entry, labelled at {@link CONTROL_MOUNT}.
 */
function buildControlRouter(): DeclaredRouter {
  const config: ControlConfig = {
    enabled: true,
    secret: CONTROL_SECRET,
    allowStop: true,
  };
  const router = createControlRouter([], [], config, CONTROL_SERVICE_ID);

  return { name: 'control', labels: labelsOf(router, CONTROL_MOUNT) };
}

/** Every router this invariant reads. */
const DECLARED_ROUTERS: readonly DeclaredRouter[] = [
  ...buildResearchRouters(),
  buildControlRouter(),
];

/**
 * Every label those routers declare, deduplicated and sorted.
 *
 * @returns The set the partition below is taken over.
 */
function collectDeclaredLabels(): readonly string[] {
  const labels = DECLARED_ROUTERS.flatMap((entry) => entry.labels);

  return [...new Set(labels)].sort();
}

/** Every label the walked routers declare; see the function above. */
const DECLARED_LABELS = collectDeclaredLabels();

// ---------------------------------------------------------------------------
// The banned surfaces
// ---------------------------------------------------------------------------

/**
 * The routes named outright, and why each one is on the list.
 *
 * TWO OF THE THREE FAMILIES, the third being every route under
 * {@link CONTROL_MOUNT}, which {@link isBannedRoute} reads as a
 * prefix rather than as rows: the control plane grows routes on the
 * framework half of this package, and a roster enumerating them
 * would go stale on a vendored change nothing here reviews.
 *
 * WHAT A BAN IS, as against the deliberate absences below. A route
 * here is one this protocol must never carry however the surface
 * grows, and the reason is a property of the act rather than of
 * this wave: a credential leaving the deployment, or a cascade
 * nothing can undo. A route in {@link UNEXPOSED_ROUTES} is one
 * nobody has exposed, which a later wave is free to revisit.
 */
const BANNED_ROUTES = [
  {
    route: 'POST /connectors',
    reason:
      'takes a connector config, which is where an API key lives: a '
      + 'create is a credential write, and this surface is write-only '
      + 'in one direction on purpose',
  },
  {
    route: 'PATCH /connectors/:id',
    reason:
      'takes the same config a create does, so it can set or rotate a '
      + 'stored credential; the list beside it IS exposed and answers '
      + 'the mask literal rather than what is stored',
  },
  {
    route: 'DELETE /domains/:slug',
    reason:
      'removes a domain and cascades over every row hanging off it, '
      + 'which is the one act on this surface no later request can '
      + 'undo',
  },
] as const;

/** The labels {@link BANNED_ROUTES} names, as a set. */
const BANNED_ROUTE_LABELS: ReadonlySet<string> = new Set(
  BANNED_ROUTES.map((entry) => entry.route),
);

/**
 * Whether a route label names a surface this protocol may not carry.
 *
 * @param label - A route label, per {@link labelFor}.
 * @returns True for a member of {@link BANNED_ROUTES} and for any
 *   route under {@link CONTROL_MOUNT}.
 *
 * @remarks
 * The prefix half compares the WHOLE mount segment rather than
 * asking whether the path starts with the string: a route served at
 * `/_controls/...` would satisfy a bare `startsWith` and is a
 * different surface. The plant case drives that near miss through
 * this function, which is what makes the distinction a reading
 * rather than a comment.
 */
function isBannedRoute(label: string): boolean {
  if (BANNED_ROUTE_LABELS.has(label)) return true;

  const path = label.slice(label.indexOf(' ') + 1);

  return path === CONTROL_MOUNT || path.startsWith(`${CONTROL_MOUNT}/`);
}

/**
 * The banned routes a list of entries names, in the order it names
 * them.
 *
 * @param entries - Any tool list, real or planted.
 * @returns One label per entry over a banned route.
 *
 * @remarks
 * Takes the list rather than reading {@link MCP_TOOLS}, which is
 * what lets the planted entries and the real registry go through
 * the same classifier in the same case. A function reading the
 * registry itself could only ever be asked about it.
 */
function bannedRoutesAmong(entries: readonly McpToolEntry[]): string[] {
  const banned = entries.filter((entry) => isBannedRoute(entry.route));

  return banned.map((entry) => entry.route);
}

/**
 * An entry over a route nobody registered, for the plant case.
 *
 * @param route - The label to plant.
 * @returns An entry carrying it and nothing else of interest.
 *
 * @remarks
 * The schema is one an exposed route already exports rather than a
 * fresh object: nothing here reads it, and restating a schema in
 * this file is the exact fault the identity table below exists to
 * catch. The handler answers an empty result and is never called.
 */
function plantedEntry(route: string): McpToolEntry {
  return {
    name: `planted ${route}`,
    description: 'A planted entry, to prove the classifier still reads.',
    inputSchema: settingsReadToolInputSchema,
    route,
    handler: () => Promise.resolve({ content: [] }),
  };
}

/**
 * One planted label per banned family.
 *
 * FOUR RATHER THAN THREE, because the roster half is two rows and a
 * plant over one of them says nothing about the other. The control
 * member is what covers the prefix half, which no written-out label
 * reaches.
 */
const BANNED_PLANTS: readonly string[] = [
  'POST /connectors',
  'PATCH /connectors/:id',
  'DELETE /domains/:slug',
  `POST ${CONTROL_MOUNT}/stop`,
];

/**
 * A near miss for each plant, asserted NOT reported.
 *
 * Near on purpose. A fabricated label nothing resembles is absent
 * for the trivial reason and says only that the classifier is not
 * answering true for every string; each of these differs from its
 * plant by one segment or one character, which is what says the
 * match discriminates among labels that look alike.
 */
const BANNED_NEAR_MISSES: readonly string[] = [
  'POST /connectors/:id',
  'PATCH /connectors/:id/notes',
  'DELETE /domains/:slug/findings',
  `POST ${CONTROL_MOUNT}s/stop`,
];

// ---------------------------------------------------------------------------
// The deliberate absences
// ---------------------------------------------------------------------------

/**
 * Every declared route no tool names and no rule bans, with the
 * reason it is off the surface.
 *
 * WRITTEN OUT SO AN ABSENCE IS A DECISION. Without this roster the
 * covering equality could not exist, and `no tool exposes this yet`
 * would be indistinguishable from `nobody has read this route`. A
 * route added to a router lands here or in one of the two rosters
 * above, or the partition fails naming it.
 *
 * ALMOST ALL OF THEM ARE WRITES, and the pattern is the spec safe
 * list rather than a preference: a mutation reaches this protocol
 * when it is one the API spec names among its safe ones, and every
 * such mutation is exposed. What is left is the configuration a
 * research pass is scored by, plus the deletes.
 */
const UNEXPOSED_ROUTES = [
  {
    route: 'POST /domains',
    reason:
      'creates a whole research programme, which is the thing every '
      + 'other row on this surface is scoped by',
  },
  {
    route: 'PATCH /domains/:slug',
    reason:
      'rewrites the criteria and the settings a pass is scored '
      + 'against, the verdict vocabulary among them',
  },
  {
    route: 'POST /domains/:slug/categories',
    reason:
      'adds a filing key findings are matched against by name, so a '
      + 'create moves what an already-answered page holds',
  },
  {
    route: 'PATCH /categories/:id',
    reason:
      'renames that filing key, which silently re-files every finding '
      + 'whose payload named the old one',
  },
  {
    route: 'DELETE /categories/:id',
    reason: 'removes it, and the terms hanging off it with it',
  },
  {
    route: 'DELETE /terms/:id',
    reason:
      'the one term verb the spec safe list leaves off: a create and '
      + 'a patch are named there and a delete is not',
  },
  {
    route: 'POST /domains/:slug/personas',
    reason:
      'adds a reader a digest is written for, which is configuration '
      + 'rather than a reading',
  },
  {
    route: 'PATCH /personas/:id',
    reason: 'rewrites one, for the reason a create is off the surface',
  },
  {
    route: 'DELETE /personas/:id',
    reason: 'removes one',
  },
  {
    route: 'PUT /settings',
    reason:
      'rewrites the operator settings the whole deployment runs '
      + 'under, in one whole-document write',
  },
  {
    route: 'POST /domains/:slug/topics',
    reason:
      'adds a scheduled pass; the run-now verb beside it IS exposed, '
      + 'that one writing a single column and asking for no new '
      + 'configuration',
  },
  {
    route: 'PATCH /topics/:id',
    reason: 'rewrites the schedule and the prompt a pass runs under',
  },
  {
    route: 'DELETE /topics/:id',
    reason: 'removes one, and the schedule it was running on',
  },
  {
    route: 'POST /topics/:id/pause',
    reason:
      'stops a schedule, which is the half of the run-now pair the '
      + 'spec safe list does not name',
  },
  {
    route: 'POST /domains/:slug/sources',
    reason:
      'adds a feed, whose contract and parser config the proposals '
      + 'gate beside it exists to rule on',
  },
  {
    route: 'PATCH /sources/:id',
    reason:
      'writes the two columns the approval gate writes, without being '
      + 'the ruling that gate is',
  },
  {
    route: 'DELETE /sources/:id',
    reason: 'removes a feed and the queue of proposals against it',
  },
  {
    route: 'DELETE /connectors/:id',
    reason:
      'removes a connector and the stored credential with it: '
      + 'destructive rather than a credential write, which is why it '
      + 'is here and not in the banned roster above',
  },
  {
    route: 'POST /domains/:slug/exports',
    reason:
      'adds a subscription that sends; the run-now verb beside it IS '
      + 'exposed, for the reason the topics one is',
  },
  {
    route: 'PATCH /exports/:id',
    reason: 'rewrites where a digest is sent and on what schedule',
  },
  {
    route: 'DELETE /exports/:id',
    reason: 'removes one',
  },
  {
    route: 'PATCH /entities/:id',
    reason:
      'recomputes the key a registry is deduplicated on and can merge '
      + 'two subjects through an alias, which is configuration a pass '
      + 'is scored by; `src/mcp/tools/wave-3.ts` says so beside its '
      + 'own list',
  },
] as const;

// ---------------------------------------------------------------------------
// The schema each exposed route declares
// ---------------------------------------------------------------------------

/** One route, and the schema its own module exports for it. */
interface RouteSchema {
  /** The label, per {@link labelFor}. */
  readonly route: string;

  /** The binding the route module exports. */
  readonly schema: ZodType;
}

/**
 * Every exposed route, paired with the schema the route module
 * declaring it exports.
 *
 * KEYED BY ROUTE, WHICH IS THE WHOLE POINT. Each wave module test
 * pairs a schema with a tool NAME and asserts the same identity, so
 * a reader could take this for a copy of one. It is not: an entry
 * carrying a SIBLING route schema — the findings list schema on the
 * findings get, both exported from `src/findings/routes.ts` — still
 * agrees with a name-keyed row somebody wrote to match, and
 * disagrees here.
 *
 * In {@link MCP_TOOLS} order, so the table reads as the registry
 * does rather than as an alphabet.
 */
const ROUTE_SCHEMAS: readonly RouteSchema[] = [
  { route: 'GET /domains', schema: domainListToolInputSchema },
  { route: 'GET /domains/:slug', schema: domainReadToolInputSchema },
  {
    route: 'GET /domains/:slug/categories',
    schema: categoryListToolInputSchema,
  },
  { route: 'GET /categories/:id/terms', schema: termListToolInputSchema },
  {
    route: 'GET /domains/:slug/personas',
    schema: personaListToolInputSchema,
  },
  { route: 'GET /settings', schema: settingsReadToolInputSchema },
  { route: 'POST /categories/:id/terms', schema: termCreateToolInputSchema },
  { route: 'PATCH /terms/:id', schema: termPatchToolInputSchema },
  { route: 'GET /domains/:slug/topics', schema: topicListToolInputSchema },
  { route: 'GET /domains/:slug/sources', schema: sourceListToolInputSchema },
  {
    route: 'GET /sources/:id/failures',
    schema: sourceFailureListToolInputSchema,
  },
  { route: 'GET /connectors', schema: connectorListToolInputSchema },
  {
    route: 'GET /domains/:slug/exports',
    schema: subscriptionListToolInputSchema,
  },
  { route: 'POST /topics/:id/run-now', schema: topicRunNowToolInputSchema },
  {
    route: 'POST /exports/:id/run-now',
    schema: subscriptionRunNowToolInputSchema,
  },
  {
    route: 'GET /domains/:slug/findings',
    schema: findingListToolInputSchema,
  },
  { route: 'GET /findings/:id', schema: findingReadToolInputSchema },
  {
    route: 'GET /domains/:slug/documents',
    schema: documentListToolInputSchema,
  },
  { route: 'GET /entities/:id', schema: entityReadToolInputSchema },
  {
    route: 'GET /entities/:id/research',
    schema: entityResearchListToolInputSchema,
  },
  {
    route: 'GET /sources/:id/pending-configs',
    schema: pendingConfigListToolInputSchema,
  },
  { route: 'GET /runs', schema: runListToolInputSchema },
  { route: 'GET /runs/:id', schema: runReadToolInputSchema },
  { route: 'GET /spend/summary', schema: spendSummaryToolInputSchema },
  {
    route: 'PATCH /findings/:id/verdict',
    schema: findingVerdictToolInputSchema,
  },
  {
    route: 'POST /entities/:id/approve-research',
    schema: entityApproveResearchToolInputSchema,
  },
  {
    route: 'POST /sources/:id/approve-config',
    schema: sourceApproveConfigToolInputSchema,
  },
];

// ---------------------------------------------------------------------------
// The three sets
// ---------------------------------------------------------------------------

/** The route every registered tool names, in registration order. */
const EXPOSED_ROUTES: readonly string[] = MCP_TOOLS.map(
  (entry) => entry.route,
);

/**
 * The declared labels the classifier bans.
 *
 * Derived from the walk rather than written out, so the control
 * plane half needs no roster and a banned route that stopped being
 * declared shows up in the case above rather than silently
 * inflating this set.
 */
const BANNED_LABELS: readonly string[] = DECLARED_LABELS.filter(
  isBannedRoute,
);

/** The labels {@link UNEXPOSED_ROUTES} names. */
const UNEXPOSED_LABELS: readonly string[] = UNEXPOSED_ROUTES.map(
  (entry) => entry.route,
);

/**
 * The registered entry over a route.
 *
 * @param route - A label the table above pairs a schema with.
 * @returns The entry naming it.
 * @throws When no entry does, which is a row left behind by a
 *   deleted tool: it fails naming the route rather than reading
 *   `undefined.inputSchema`.
 */
function entryFor(route: string): McpToolEntry {
  const entry = MCP_TOOLS.find((candidate) => candidate.route === route);

  if (entry === undefined) {
    throw new Error(`No registered tool names the route ${route}.`);
  }

  return entry;
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

describe('MCP exposure - the declared surface', () => {
  // A partition over an empty set holds and so does a classifier
  // over one, so the surface is established before anything is
  // asserted about it. Swept as a set difference rather than a
  // count: the failure names the router that went quiet.
  it('reads a route label off every router it walks', () => {
    const silent = DECLARED_ROUTERS.filter(
      (entry) => entry.labels.length === 0,
    );

    expect(silent.map((entry) => entry.name)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The banned surfaces
// ---------------------------------------------------------------------------

describe('MCP exposure - the banned surfaces', () => {
  // The direction a reader expects, and the weaker of the two. It
  // is a zero over the real registry, which is why the plant case
  // below sits beside it.
  it('registers no tool over a banned route', () => {
    expect(bannedRoutesAmong(MCP_TOOLS)).toEqual([]);
  });

  // The liveness the zero above has none of. One plant per family
  // and one near miss apiece, all through the same classifier in
  // this one case: a plant over the roster half says nothing about
  // the prefix half, and a fabricated label nothing resembles is
  // absent for the trivial reason.
  it('reports a plant of every banned family and no near miss', () => {
    const planted = BANNED_PLANTS.map(plantedEntry);
    const nearMisses = BANNED_NEAR_MISSES.map(plantedEntry);

    expect(bannedRoutesAmong([...MCP_TOOLS, ...planted]))
      .toEqual([...BANNED_PLANTS]);
    expect(bannedRoutesAmong([...MCP_TOOLS, ...nearMisses])).toEqual([]);
  });

  // What the plant cannot say: that either half of the classifier
  // still reaches the tree. A written-out label that stopped being
  // declared is a roster nobody trimmed, and a prefix half reaching
  // nothing is a mount this file no longer finds — both of which
  // leave the partition below holding over a smaller surface.
  it('bans only declared routes, and reaches them by both halves', () => {
    const declared = new Set(DECLARED_LABELS);
    const stale = BANNED_ROUTES.filter((entry) => !declared.has(entry.route));

    expect(stale.map((entry) => entry.route)).toEqual([]);

    const underMount = DECLARED_LABELS.filter(
      (label) => isBannedRoute(label) && !BANNED_ROUTE_LABELS.has(label),
    );

    expect(underMount.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The covering
// ---------------------------------------------------------------------------

describe('MCP exposure - the covering', () => {
  // A route named twice would be collapsed by the sets the covering
  // is taken over, so each roster is held to its own length first.
  // Two tools over one route is the shape that hides in the exposed
  // half: both would be registered and only one would be read here.
  it('names each route once within each roster', () => {
    expect(new Set(EXPOSED_ROUTES).size).toBe(MCP_TOOLS.length);
    expect(new Set(UNEXPOSED_LABELS).size).toBe(UNEXPOSED_ROUTES.length);
    expect(BANNED_ROUTE_LABELS.size).toBe(BANNED_ROUTES.length);
  });

  // The direction an omission hides in. A route added to any router
  // and to none of the three rosters is missing from the union and
  // fails here naming itself; a roster row for a route nothing
  // declares is the extra member on the other side.
  it('covers every declared route label', () => {
    const covered = new Set([
      ...EXPOSED_ROUTES,
      ...BANNED_LABELS,
      ...UNEXPOSED_LABELS,
    ]);

    expect([...covered].sort()).toEqual([...DECLARED_LABELS]);
  });

  // The covering alone is satisfied by a label sitting in two
  // rosters, which is exactly how a banned route acquires a tool
  // without the union changing size. Asserted as three intersections
  // rather than as an arithmetic identity, so the failure names the
  // label instead of reporting a number that moved.
  it('holds the three rosters disjoint', () => {
    const banned = new Set(BANNED_LABELS);
    const unexposed = new Set(UNEXPOSED_LABELS);
    const exposedAndBanned = EXPOSED_ROUTES.filter((r) => banned.has(r));
    const exposedAndAbsent = EXPOSED_ROUTES.filter((r) => unexposed.has(r));
    const absentAndBanned = UNEXPOSED_LABELS.filter((r) => banned.has(r));

    expect(exposedAndBanned).toEqual([]);
    expect(exposedAndAbsent).toEqual([]);
    expect(absentAndBanned).toEqual([]);
  });

  // Every absence carries the reason it is one. A row added without
  // it reads as a route somebody forgot rather than as one somebody
  // decided about, which is the whole difference this roster exists
  // to record.
  it('gives every deliberate absence a reason', () => {
    const silent = UNEXPOSED_ROUTES.filter((entry) => entry.reason === '');

    expect(silent.map((entry) => entry.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The schemas
// ---------------------------------------------------------------------------

describe('MCP exposure - the schemas', () => {
  // Object.is and never toEqual: a restated copy of the schema
  // satisfies the second and is the exact state this rule exists to
  // catch. Keyed by the ROUTE the entry carries, which is what makes
  // it a reading the name-keyed rows next door cannot make.
  it.each(ROUTE_SCHEMAS)('$route takes its own module schema', (row) => {
    expect(entryFor(row.route).inputSchema).toBe(row.schema);
  });

  // The rows and the exposed routes are one set, so a tool
  // registered without a row fails here naming itself rather than
  // going unread, and a row left behind by a deleted tool throws in
  // entryFor.
  it('pairs every exposed route and no other', () => {
    const paired = ROUTE_SCHEMAS.map((row) => row.route);

    expect([...paired].sort()).toEqual([...EXPOSED_ROUTES].sort());
  });

  // Twenty-seven identities are all satisfied by a surface where one
  // schema is shared by everything: the failing rows would name the
  // schema and not the fault. This is what rules that out.
  it('pairs a distinct schema object with every route', () => {
    const schemas = ROUTE_SCHEMAS.map((row) => row.schema);

    expect(new Set(schemas).size).toBe(ROUTE_SCHEMAS.length);
  });
});
