/**
 * @packageDocumentation
 * The one spelling of a route LABEL, and the routers this package
 * declares them from.
 *
 * A LABEL IS THE VERB UPPERCASED, ONE SPACE, THEN THE EXPRESS PATH
 * TEMPLATE with its parameters intact — `GET /domains/:slug`. It is
 * the vocabulary `McpToolEntry.route` already uses, and three
 * subjects now compare against it: the MCP exposure invariant, the
 * wiring test's guard reading, and the OpenAPI binding tables. Each
 * had its own copy of the walk before this module, so a fix to one
 * spelling reached one caller and the others went on agreeing with
 * themselves.
 *
 * DECLARED, NOT MOUNTED. A router factory registers its routes at
 * construction and reads nothing, so what {@link buildResearchRouters}
 * answers is the routers' own declaration and not a fact about a
 * running deployment. Which of them `src/index.ts` mounts is a
 * separate question that `tests/api/wiring.test.ts` asks; see the
 * header of `tests/invariants/mcp-exposure.test.ts` for why the two
 * sets being free to differ is the point rather than a gap.
 *
 * THE WALK IS BLIND TO A NESTED SUB-ROUTER, and that is measured
 * rather than assumed. `router.use('/nest', subRouter)` produces a
 * layer carrying no `route`, so {@link labelsOf} contributes nothing
 * for it and every path the sub-router declares is invisible — the
 * parent's own routes come back alone. Every router this module
 * builds registers root-absolute paths directly, so nothing here is
 * lost today; a router that later mounts a sub-router would go
 * quietly under-reported instead of failing, which is why
 * `route-labels.test.ts` pins the shape rather than leaving it to be
 * rediscovered.
 *
 * DUPLICATES ARE KEPT, deliberately. A path registered with two
 * handlers on one verb answers its label twice, and the auth router
 * is the live example: its `POST /login` carries an attempt limiter
 * ahead of the handler, so {@link buildAuthRouterEntry} answers FOUR
 * labels of which three are distinct. Collapsing them is the
 * consumer's call — a coverage equality wants the set, and a walk
 * counting handlers wants the list — so this module hands back what
 * the stack said and neither reading is imposed here.
 *
 * THE AUTH ROUTER IS A SEPARATE EXPORT rather than a seventeenth
 * member of {@link buildResearchRouters}, so a consumer chooses
 * whether to walk it. Its routes answer a different envelope, share
 * no service function with the research surface and are mounted
 * outside it; `tests/invariants/mcp-exposure.test.ts` states at
 * length why leaving them out of THAT walk is the stronger claim,
 * while the OpenAPI surface documents them and so wants them in. One
 * roster satisfying both would have had to pick, and picking is what
 * the split avoids.
 */

import type { Router } from 'express';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLogger } from '../../lib/logger/node.js';
import { buildAuthRouter } from '../../src/auth/routes.js';
import { buildConnectorsRouter } from '../../src/connectors/routes.js';
import { buildDocumentsRouter } from '../../src/documents/routes.js';
import { buildDomainsRouter } from '../../src/domains/routes.js';
import { buildEntitiesRouter } from '../../src/entities/routes.js';
import { buildFindingsRouter } from '../../src/findings/routes.js';
import { buildPersonasRouter } from '../../src/personas/routes.js';
import { buildRunsRouter } from '../../src/runs/routes.js';
import { buildSpendRouter } from '../../src/runs/spend-routes.js';
import { buildSettingsRouter } from '../../src/settings/routes.js';
import {
  buildSourceFailuresRouter,
} from '../../src/sources/failures-routes.js';
import {
  buildSourceProposalsRouter,
} from '../../src/sources/proposals-routes.js';
import { buildSourcesRouter } from '../../src/sources/routes.js';
import { buildSubscriptionsRouter } from '../../src/subscriptions/routes.js';
import {
  buildCategoriesRouter,
} from '../../src/taxonomy/categories-routes.js';
import { buildTermsRouter } from '../../src/taxonomy/terms-routes.js';
import { buildTopicsRouter } from '../../src/topics/routes.js';

import { createMemoryAuthStore } from './memory-auth-store.js';
import { createMemoryResearchStore } from './memory-research-store.js';

/**
 * One router, and the labels it declares at the mount it is read at.
 */
export interface DeclaredRouter {
  /** What a failure message calls it. */
  readonly name: string;

  /** Its labels, per {@link labelsOf}. */
  readonly labels: readonly string[];
}

/**
 * The one spelling of a route label, so every roster that compares
 * against a router is written in one vocabulary.
 *
 * @param method - The verb, in whatever case its source spells it.
 *   Express reports a route's own methods lowercased, and a roster
 *   transcribed by hand spells them upper, so the normalisation is
 *   what lets the two be compared at all.
 * @param path - The express path template, mount prefix included.
 * @returns `GET /domains/:slug` and the like.
 */
export function labelFor(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * The labels of every route a router registered.
 *
 * `router.stack` carries one layer per registered path and that
 * layer's own `stack` carries one layer per handler, which is where
 * the verb is legible at all. A `router.use` layer has no `route`
 * and contributes nothing, which is what keeps a guard out of the
 * answer — and, as the header records, what makes a nested
 * sub-router invisible.
 *
 * @param router - A built router.
 * @param prefix - Where the host application mounts it, or the empty
 *   string for a router mounted at the root. Composed by
 *   concatenation, so it carries its own leading slash and no
 *   trailing one.
 * @returns One label per verb-and-handler pair it declares,
 *   duplicates included: a path registered with two handlers on one
 *   verb answers twice, and collapsing that is the caller's choice.
 */
export function labelsOf(router: Router, prefix: string): string[] {
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
 * Built over one in-memory store rather than a wired service, for
 * the reason the header gives: construction is the whole of what is
 * being read, and no handler runs.
 *
 * Every one of them mounts at `/` with root-absolute paths —
 * `app.use(ctx.requireAuth, buildDomainsRouter({ store }))`, no path
 * argument — so the prefix is the empty string and a label needs no
 * composition. `/auth` is the recorded exception and has
 * {@link buildAuthRouterEntry} to itself.
 *
 * @returns One entry per router, in the order `src/index.ts` mounts
 *   them.
 */
export function buildResearchRouters(): readonly DeclaredRouter[] {
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

/** Root of `@ar/service`, two levels above `tests/helpers/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** The module that mounts the auth router, package-relative. */
const AUTH_MOUNT_MODULE = 'src/index.ts';

/**
 * The `AUTH_INTROSPECT_SECRET` the router below is built with.
 *
 * Never presented and never compared: the router is constructed for
 * its REGISTRATIONS and never driven, so no request reaches the gate
 * this string guards.
 */
const AUTH_INTROSPECT_SECRET = 'zz-not-a-secret';

/** The session lifetime the router below is built with. Never read. */
const AUTH_TTL_SECONDS = 3600;

/**
 * Where the auth router is mounted, read out of `src/index.ts`.
 *
 * @returns The prefix `register()` passes to `app.use`.
 * @throws When that call is no longer a literal this can read, which
 *   is the honest failure. A fallback would leave every label here
 *   naming a path nothing serves while the roster stayed full, and
 *   no equality downstream could report it.
 *
 * @remarks
 * Read rather than transcribed, on the precedent
 * `tests/invariants/mcp-exposure.test.ts` sets for the control
 * plane: a mount moved to another path is then a change this module
 * FOLLOWS, where a transcribed `/auth` would go on labelling the old
 * one. It buys a cross-check as well as a refusal — the binding
 * table in `src/auth/routes.ts` writes the prefix into its keys by
 * hand, so the two disagreeing is exactly what a coverage equality
 * over both is there to catch.
 *
 * The read happens inside {@link buildAuthRouterEntry} rather than
 * at module scope, so a consumer that walks only the research
 * surface is not taken down by a question it never asked.
 */
function readAuthMount(): string {
  const source = readFileSync(
    join(PACKAGE_ROOT, AUTH_MOUNT_MODULE),
    'utf8',
  );
  const mount = /app\.use\('([^']+)', buildAuthRouter\(/.exec(source);

  if (mount === null || mount[1] === undefined) {
    throw new Error(
      `${AUTH_MOUNT_MODULE} no longer mounts buildAuthRouter at a literal `
      + 'path, so the auth mount prefix cannot be derived.',
    );
  }

  return mount[1];
}

/**
 * The auth router, labelled at the mount it is served from.
 *
 * The seventeenth entry, kept out of {@link buildResearchRouters} so
 * that a consumer chooses whether to walk it — see the header.
 *
 * Built over the in-memory auth store with a silent logger and
 * placeholder credentials, which changes nothing about what it
 * REGISTERS: all three routes are declared unconditionally, and the
 * `POST /login` limiter is a second handler on that route rather
 * than a gate on whether it exists. So the entry carries FOUR labels
 * of which three are distinct, per the duplicates contract on
 * {@link labelsOf}.
 *
 * @returns The one entry, labelled at the prefix
 *   {@link readAuthMount} reads.
 */
export function buildAuthRouterEntry(): DeclaredRouter {
  const router = buildAuthRouter({
    store: createMemoryAuthStore(),
    clock: (): Date => new Date(),
    ttlSeconds: AUTH_TTL_SECONDS,
    introspectSecret: AUTH_INTROSPECT_SECRET,
    logger: createLogger('route-labels-helper', { level: 'silent' }),
  });

  return { name: 'auth', labels: labelsOf(router, readAuthMount()) };
}
