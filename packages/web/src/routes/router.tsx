/**
 * @packageDocumentation
 * The route tree, declared twice from one surface list.
 *
 * The app answers at two bases: `/`, which is what an operator running a
 * single research domain ever sees, and `/d/:domainSlug`, which names
 * the domain in the URL so a link can carry it. They are not two apps.
 * Both mount the same layout route over the same surfaces, and the only
 * difference between them is the prefix — so everything below a base is
 * built once by {@link routesBelowBase} and used twice, and a surface
 * added to `SURFACES` appears under both without this file being
 * touched.
 *
 * ## Why the chrome is named here
 *
 * `AppLayout` takes its sidebar and topbar as SLOTS rather than
 * importing them, so the layout stays shell arithmetic and this file is
 * the single place saying which rail and which band the app runs. The
 * two slots are shaped differently because the components are: the
 * sidebar slot is a function because `SidebarNav` needs the collapse
 * flag `AppLayout` owns, and the topbar slot is a plain node because
 * `AppShellTopbar` draws the collapse BUTTON itself, ahead of whatever
 * it is given.
 *
 * The layout element is one object shared by both trees. React still
 * remounts it when an operator crosses between the bases — they are
 * separate branches — which is what `Topbar`'s docblock assumes when it
 * says a base crossing recomputes the theme.
 *
 * ## The index redirect
 *
 * Relative, not absolute. `<Navigate to="digest">` under `/` resolves to
 * `/digest`, and the very same element under `/d/example-tech-radar`
 * resolves to `/d/example-tech-radar/digest`. That is the whole reason
 * one element serves both trees, and it is why nothing here calls
 * `withBase`: the router already knows which base it matched.
 *
 * The segment comes from `getSurface` rather than being spelled again,
 * so a `digest` that ever left the nav would be a throw when this module
 * loads rather than a redirect into the catch-all.
 *
 * ## The modal sub-routes
 *
 * Five of the six surfaces open one of their rows over the list they
 * sit on: the digest at `:entityId`, and the lexicon, sources, agents
 * and tools at `:entityId/edit`. Settings carries none — it is a single
 * form, not a list with rows to open.
 *
 * Each is a CHILD of its list route rather than a sibling, which is the
 * whole point of the shape: the list stays matched and stays rendered,
 * and the modal arrives in the trailing `Outlet` the page stage puts at
 * the bottom of every list page. An operator deep-linking straight into
 * one therefore gets the list behind it for free, and closing the modal
 * is a navigation up to the parent rather than a re-entry.
 *
 * Digest's pattern is bare where the other four end in `/edit` because
 * the two do different things: a finding opens read-only, and the UI
 * spec grows it into a full routed detail page later — at which point
 * this sub-route is already the path that page will answer at. The
 * other four open an editor over the row they name.
 *
 * The patterns are relative, so — like the index redirect above — one
 * declaration serves both bases. They are keyed by surface id and read
 * back through `getSurface`, so a key that drifts out of `SURFACES` is
 * a throw when this module loads rather than a sub-route that quietly
 * stops existing under both trees.
 *
 * ## The catch-all
 *
 * A CHILD of each layout route rather than a sibling, so an unmatched
 * path renders the not-found inside the mounted shell — the rail is
 * still there, and it is the way back. It is declared under both bases
 * because a path is only unmatched relative to the tree that claimed its
 * prefix: `/d/example-tech-radar/nope` never reaches the `/` tree.
 *
 * A malformed domain slug is the one bad address this cannot catch, for
 * the reason `./DomainGuard.tsx` gives — it MATCHES the domain pattern.
 *
 * ## Why there is no exported router object
 *
 * `createBrowserRouter` reaches for `document` when it is CALLED, so a
 * module-scope `export const router = ...` would throw on import under
 * the node unit environment and take the `matchRoutes` suite down with
 * it. {@link ROUTES} is therefore plain data any test can read, and
 * {@link createAppRouter} is the one line that needs a browser.
 */

import type { Surface } from './paths';
import type { RouteObject } from 'react-router';

import { EmptyState } from '@ar/ui';
import { Navigate, createBrowserRouter } from 'react-router';

import { AppLayout } from '../app-shell/AppLayout';
import { Sidebar } from '../app-shell/Sidebar';
import { Topbar } from '../app-shell/Topbar';

import { DomainGuard } from './DomainGuard';
import {
  DOMAIN_BASE_PREFIX,
  SINGLE_DOMAIN_BASE,
  SURFACES,
  getSurface,
} from './paths';

/**
 * Which surface an operator lands on with no surface in the URL.
 *
 * Read through `getSurface` below rather than used as a path, so this
 * being wrong is a throw when the module loads rather than a redirect
 * into the not-found.
 */
const INDEX_SURFACE_ID = 'digest';

/**
 * The pattern the domain-scoped copy of the tree is mounted at.
 *
 * The `/d` half comes from `./paths`, which encodes it twice already;
 * the parameter NAME is spelled here and read back by `DomainGuard`,
 * `Sidebar` and `Topbar`, each with its own `useParams` call.
 */
const DOMAIN_BASE_PATTERN = `${DOMAIN_BASE_PREFIX}/:domainSlug`;

/** Matches every path the routes above it did not claim. */
const CATCH_ALL_PATTERN = '*';

/**
 * The route parameter every modal sub-route names its row with.
 *
 * Spelled once for all five, because the pages read it back BY NAME
 * (`useParams<{ entityId: string }>()`): a second spelling here would
 * not fail to match, it would open a modal on `undefined`.
 */
const ENTITY_PARAM = ':entityId';

/**
 * The modal sub-route each list surface carries, keyed by surface id.
 *
 * Patterns are relative to the surface route they hang under, so one
 * entry serves both bases. Settings is absent on purpose — see the
 * header on why, and on why the digest's pattern has no `/edit`.
 */
const MODAL_SUB_ROUTE_PATTERNS: Readonly<Record<string, string>> = {
  digest: ENTITY_PARAM,
  lexicon: `${ENTITY_PARAM}/edit`,
  sources: `${ENTITY_PARAM}/edit`,
  agents: `${ENTITY_PARAM}/edit`,
  tools: `${ENTITY_PARAM}/edit`,
};

/**
 * The same table, with every key proven to name a surface that exists.
 *
 * The round trip through `getSurface` is the guard, and it is the only
 * one available: a record lookup against a stale key simply answers
 * `undefined`, so the sub-route would vanish from both trees without a
 * word. Here it throws while this module loads.
 */
const MODAL_SUB_ROUTES = new Map<string, string>(
  Object.entries(MODAL_SUB_ROUTE_PATTERNS).map(([surfaceId, pattern]) => [
    getSurface(surfaceId).id,
    pattern,
  ]),
);

/**
 * The app's persistent chrome, filled with the concrete rail and band.
 *
 * One element for both trees. See the header on why the two slots are
 * shaped differently.
 */
const SHELL = (
  <AppLayout
    sidebar={(collapsed) => <Sidebar collapsed={collapsed} />}
    topbar={<Topbar />}
  />
);

/**
 * The stand-in every surface route renders until its page lands.
 *
 * ONE element shared by all six routes, which is what lets the page
 * stage's registration test ask a real question: a surface whose route
 * element is still this object has no page behind it yet. It names no
 * surface because the topbar already does, from the same table.
 */
export const SURFACE_PLACEHOLDER = (
  <EmptyState
    title="Surface not built yet"
    description="This page is defined in the UI spec and arrives with the page stage."
  />
);

/**
 * The stand-in every modal sub-route renders until its modal lands.
 *
 * ONE element for all five, for the same reason {@link
 * SURFACE_PLACEHOLDER} is one for all six: identity makes "is there
 * anything behind this route yet" a `toBe` a test can ask without
 * rendering. It is unreachable in the meantime — the surface routes
 * above still render a placeholder rather than a list page, so there is
 * no `Outlet` for it to arrive in.
 */
export const MODAL_PLACEHOLDER = (
  <EmptyState
    title="Modal not built yet"
    description="Opening a row is defined in the UI spec and arrives with the page stage."
  />
);

/**
 * What an unmatched path renders, inside the shell.
 *
 * No action slot on purpose: this only ever renders below a mounted
 * rail, and the rail is a better way back than a button repeating one of
 * its entries. Its counterpart in `./DomainGuard.tsx` has no rail and so
 * has to carry one.
 */
const NOT_FOUND = (
  <EmptyState
    title="Page not found"
    description="Nothing in this deployment answers to that address. Pick a surface from the sidebar to carry on."
  />
);

/**
 * One list surface, with its modal sub-route beneath it where it has
 * one.
 *
 * Built per call rather than held as a constant, so each base gets its
 * own `children` array — `RouteObject.children` is mutable, and one
 * array shared by two parents is a single edit away from being two
 * trees that disagree.
 *
 * @param surface - Entry from `SURFACES`.
 * @returns The surface's route, with its modal child where the table
 * names one and no `children` key at all where it does not.
 */
const surfaceRoute = (surface: Surface): RouteObject => {
  const modalPath = MODAL_SUB_ROUTES.get(surface.id);

  if (modalPath === undefined) {
    return { path: surface.segment, element: SURFACE_PLACEHOLDER };
  }

  return {
    path: surface.segment,
    element: SURFACE_PLACEHOLDER,
    children: [{ path: modalPath, element: MODAL_PLACEHOLDER }],
  };
};

/**
 * Everything a base carries: the index redirect, one route per surface,
 * and the catch-all.
 *
 * Built fresh per call so the two trees own separate arrays — but from
 * one declaration, so a surface, and any modal sub-route under one, is
 * written once and appears under both bases.
 *
 * @returns The child routes of a layout route, in declaration order.
 */
const routesBelowBase = (): RouteObject[] => [
  {
    index: true,
    element: <Navigate to={getSurface(INDEX_SURFACE_ID).segment} replace />,
  },
  ...SURFACES.map(surfaceRoute),
  {
    path: CATCH_ALL_PATTERN,
    element: NOT_FOUND,
  },
];

/**
 * The whole route tree, as data.
 *
 * Exported rather than kept private because it is the only part of the
 * router a unit test can reach: `matchRoutes` resolves paths against
 * this array with nothing rendered and no browser present.
 */
export const ROUTES: RouteObject[] = [
  {
    path: SINGLE_DOMAIN_BASE,
    element: SHELL,
    children: routesBelowBase(),
  },
  {
    path: DOMAIN_BASE_PATTERN,
    element: <DomainGuard>{SHELL}</DomainGuard>,
    children: routesBelowBase(),
  },
];

/**
 * Build the browser router the app runs on.
 *
 * A factory rather than a module-scope constant: the call reaches for
 * `document`, so creating one at import time would make this module
 * unimportable from the node unit suite.
 *
 * @returns A router over {@link ROUTES}, for `RouterProvider`.
 */
export const createAppRouter = () => createBrowserRouter(ROUTES);
