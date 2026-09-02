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
 * Five of the six surfaces open their rows over the list they sit on:
 * the digest at `:entityId`, the lexicon, sources, agents and tools at
 * `:entityId/edit`, and the sources again at `:entityId/config` and
 * `:entityId/failures`. Settings carries none — it is a single form,
 * not a list with rows to open.
 *
 * Each of those five declares a LIST of them rather than one, because a
 * row can be openable in more than one WAY: editing a source, ruling on
 * its proposed config and listing its failures are three addresses over
 * one list, none of them a child of either other. The sources are the
 * only surface using that so far, and they now use all three of it:
 * their list holds THREE entries, and the second and third each cost a
 * row in the table below rather than a branch in {@link surfaceRoute}
 * or a second factory. The other four still hold one apiece.
 *
 * The other half is in use as of the lexicon's editor: an entry carries
 * its ELEMENT beside its path, and those elements have stopped being
 * one shared placeholder. TWO surfaces still open
 * {@link MODAL_PLACEHOLDER} — agents and tools — while the lexicon
 * opens {@link LEXICON_EDITOR}, the digest opens {@link DIGEST_DETAIL}
 * and the sources open {@link SOURCE_EDITOR}, {@link
 * SOURCE_CONFIG_APPROVAL} and {@link SOURCE_FAILURES} at their three
 * addresses. That is what an entry holding its own element was for: a
 * surface's modal is not the same modal as its neighbour's, any more
 * than its second sub-route is the same as its first, and the five
 * that have landed are not even all the same KIND of modal.
 *
 * Each is a CHILD of its list route rather than a sibling, which is the
 * whole point of the shape: the list stays matched and stays rendered,
 * and the modal arrives in the trailing `Outlet` at the bottom of every
 * list page. An operator deep-linking straight into one therefore gets
 * the list behind it for free, and closing the modal is a navigation up
 * to the parent rather than a re-entry.
 *
 * Digest's pattern is bare where the other four end in `/edit` because
 * the two do different things: a finding opens read-only, and the UI
 * spec grows it into a full routed detail page later — at which point
 * this sub-route is already the path that page will answer at, so the
 * growth is a change of element and not of URL. The other four open an
 * editor over the row they name.
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
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

import { EmptyState } from '@ar/ui';
import { Navigate, createBrowserRouter } from 'react-router';

import { AppLayout } from '../app-shell/AppLayout';
import { Sidebar } from '../app-shell/Sidebar';
import { Topbar } from '../app-shell/Topbar';
import { PlaceholderModal } from '../components/PlaceholderModal';
import { findPage } from '../pages';
import { DigestDetailModal } from '../pages/digest/DigestDetailModal';
import { LexiconEditorModal } from '../pages/lexicon/LexiconEditorModal';
import {
  SourceConfigApprovalModal,
} from '../pages/sources/SourceConfigApprovalModal';
import { SourceEditorModal } from '../pages/sources/SourceEditorModal';
import { SourceFailuresModal } from '../pages/sources/SourceFailuresModal';

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
 * Spelled once for the whole table below, because the pages read it
 * back BY NAME (`useParams<{ entityId: string }>()`): a second spelling
 * here would not fail to match, it would open a modal on `undefined`.
 */
const ENTITY_PARAM = ':entityId';

/**
 * One modal sub-route: the pattern it answers at, and what it renders.
 *
 * A pair rather than a bare pattern because a surface's sub-routes are
 * not interchangeable — the address and the modal behind it belong
 * together, so a second entry is a row in the table rather than a
 * branch in {@link surfaceRoute}.
 */
interface ModalSubRoute {
  /** Pattern, relative to the surface route this hangs under. */
  readonly path: string;
  /** What that path renders, in its list page's trailing `Outlet`. */
  readonly element: ReactNode;
}

/** Every list surface's sub-routes, keyed by surface id. */
type ModalSubRouteTable = Readonly<Record<string, readonly ModalSubRoute[]>>;

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
 * The stand-in a surface route renders until its page lands.
 *
 * ONE element shared by every surface still waiting for one, which is
 * what lets the page stage's registration test ask a real question: a
 * surface whose route element is still this object has no page behind
 * it yet. It names no surface because the topbar already does, from
 * the same table.
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
 * ONE element for every entry in the table below, for the same reason
 * {@link SURFACE_PLACEHOLDER} is one for every surface: identity makes
 * "is there anything behind this route yet" a `toBe` a test can ask
 * without rendering. Held as an ELEMENT rather than as the component
 * itself, so that stays true across both trees — writing the tag at
 * each registration would build one object per registration per base.
 *
 * Unlike its neighbour above this one is a component rather than
 * markup, because the row it names and the list it closes to are both
 * read from the router — see `../components/PlaceholderModal`, which
 * lives over there for the reason `./DomainGuard.tsx` gives.
 *
 * It is reachable: every surface route above renders a real list page
 * now, and `ListPage` puts the trailing `Outlet` this arrives in at the
 * bottom of each one, so the row actions on those pages already open
 * it.
 *
 * It stands at FOUR of the fourteen registrations now — agents and
 * tools, across both bases — and the count shrinks by two with each
 * editor that lands. The DENOMINATOR moves too, and separately: a
 * surface's second and third addresses are two more registrations
 * apiece that were never this element's to hold.
 */
export const MODAL_PLACEHOLDER = <PlaceholderModal />;

/**
 * The lexicon's term editor, at its own sub-route.
 *
 * The first registration in the table below to point at a REAL modal
 * rather than at the placeholder above, which is what makes that
 * table's elements worth carrying: a surface's modal is now its own,
 * and the placeholder is a shrinking ledger of the ones still to come.
 *
 * Held as an ELEMENT for the reason its neighbour is — one object
 * across both trees, so identity stays askable — and declared here
 * rather than inline in the table so the table reads as a list of
 * registrations and not of tags.
 */
export const LEXICON_EDITOR = <LexiconEditorModal />;

/**
 * The digest's read-only detail, at its bare `:entityId` sub-route.
 *
 * The second real element in the table below, and the one that makes
 * that table's elements more than a shrinking ledger: it is not an
 * editor. A finding opens to be READ — the record, the rail, and the
 * one ruling an operator changes from there — which is exactly the
 * claim `../components/PlaceholderModal` could not make while it stood
 * for both kinds at once.
 *
 * Held as an ELEMENT for the reason its two neighbours are: one object
 * across both trees, so identity stays askable.
 */
export const DIGEST_DETAIL = <DigestDetailModal />;

/**
 * The sources surface's feed editor, at its own sub-route.
 *
 * The third real element in the table below, and the first landing
 * that leaves the placeholder standing for a set it can describe in
 * two words: agents and tools, both of them editors.
 *
 * Held as an ELEMENT for the reason its three neighbours are: one
 * object across both trees, so identity stays askable.
 */
export const SOURCE_EDITOR = <SourceEditorModal />;

/**
 * The sources surface's config approval, at its second sub-route.
 *
 * The registration the table's LIST shape was widened for, and the
 * first one to use it: a source is editable at `:entityId/edit` and
 * ruled on at `:entityId/config`, and neither address is a child of
 * the other — an operator ruling on a proposed config is not editing
 * the feed, and `../pages/sources/SourceConfigApprovalModal.tsx`
 * carries why that separation is the point rather than a layout.
 *
 * Held as an ELEMENT for the reason its four neighbours are: one
 * object across both trees, so identity stays askable.
 */
export const SOURCE_CONFIG_APPROVAL = <SourceConfigApprovalModal />;

/**
 * The sources surface's failures list, at its third sub-route.
 *
 * The registration that says the table's LIST shape holds more than a
 * pair: a source is edited at `:entityId/edit`, ruled on at
 * `:entityId/config` and worked through at `:entityId/failures`, and
 * the third cost exactly what the second did — one row in the table
 * below. Not one of the three is a child of either other, and
 * `../pages/sources/SourceFailuresModal.tsx` carries why a failed
 * capture is a screen of its own rather than a panel in the editor.
 *
 * Held as an ELEMENT for the reason its five neighbours are: one
 * object across both trees, so identity stays askable.
 */
export const SOURCE_FAILURES = <SourceFailuresModal />;

/**
 * The modal sub-routes each list surface carries, keyed by surface id.
 *
 * A LIST per surface, so a row openable in more than one way costs a
 * row here rather than a shape change — see the header. The sources
 * hold THREE entries and the other four hold one apiece, and five of
 * the seven entries now name a real modal rather than
 * {@link MODAL_PLACEHOLDER}: the lexicon's editor, the sources editor,
 * the sources config approval, the sources failures list and the
 * digest's detail. A surface whose list is empty and a surface with no
 * key at all mean the same thing to {@link surfaceRoute}.
 *
 * Declared BELOW the elements rather than beside the other route
 * constants at the top because it names them: an entry holds what it
 * renders, so the table cannot be evaluated before there is something
 * to hold.
 *
 * Patterns are relative to the surface route they hang under, so one
 * entry serves both bases. Settings is absent on purpose — see the
 * header on why, and on why the digest's pattern has no `/edit`.
 */
const MODAL_SUB_ROUTE_TABLE: ModalSubRouteTable = {
  digest: [{ path: ENTITY_PARAM, element: DIGEST_DETAIL }],
  lexicon: [{ path: `${ENTITY_PARAM}/edit`, element: LEXICON_EDITOR }],
  sources: [
    { path: `${ENTITY_PARAM}/edit`, element: SOURCE_EDITOR },
    { path: `${ENTITY_PARAM}/config`, element: SOURCE_CONFIG_APPROVAL },
    { path: `${ENTITY_PARAM}/failures`, element: SOURCE_FAILURES },
  ],
  agents: [{ path: `${ENTITY_PARAM}/edit`, element: MODAL_PLACEHOLDER }],
  tools: [{ path: `${ENTITY_PARAM}/edit`, element: MODAL_PLACEHOLDER }],
};

/**
 * The same table, with every key proven to name a surface that exists.
 *
 * The round trip through `getSurface` is the guard, and it is the only
 * one available: a record lookup against a stale key simply answers
 * `undefined`, so every sub-route under it would vanish from both trees
 * without a word. Here it throws while this module loads.
 */
const MODAL_SUB_ROUTES = new Map<string, readonly ModalSubRoute[]>(
  Object.entries(MODAL_SUB_ROUTE_TABLE).map(([surfaceId, subRoutes]) => [
    getSurface(surfaceId).id,
    subRoutes,
  ]),
);

/**
 * What an unmatched path renders, inside the shell.
 *
 * No action slot on purpose: this only ever renders below a mounted
 * rail, and the rail is a better way back than a button repeating one of
 * its entries. Its counterpart in `./DomainGuard.tsx` has no rail and so
 * has to carry one.
 *
 * Exported for the same reason the two placeholders above are: the
 * catch-all is the one route in the tree whose element a test can name,
 * so "did this path fall through" is a `toBe` rather than a guess at a
 * path pattern.
 */
export const NOT_FOUND = (
  <EmptyState
    title="Page not found"
    description="Nothing in this deployment answers to that address. Pick a surface from the sidebar to carry on."
  />
);

/**
 * What one surface route renders.
 *
 * The join between the surface table and `../pages`, and the only
 * place this file knows a page exists. A surface with no page
 * registered falls back to {@link SURFACE_PLACEHOLDER} — the state
 * every surface is in until its own task lands.
 *
 * The component is instantiated here rather than held as an element,
 * so each base gets its own: two trees sharing one element would be
 * two routes rendering one instance's worth of React identity.
 *
 * @param surface - Entry from `SURFACES`.
 * @returns Its page, or the stand-in.
 */
const surfaceElement = (surface: Surface): ReactNode => {
  const Page = findPage(surface.id);

  return Page === undefined
    ? SURFACE_PLACEHOLDER
    : <Page />;
};

/**
 * One list surface, with its modal sub-routes beneath it where it has
 * any.
 *
 * Built per call rather than held as a constant, so each base gets its
 * own `children` array AND its own route objects — `RouteObject` and
 * its `children` are both mutable, and one array shared by two parents
 * is a single edit away from being two trees that disagree.
 *
 * No `children` key at all where the surface declares nothing, rather
 * than an empty array. The router matches identically either way, so
 * this is not a behaviour — it is about the tree as DATA, which is how
 * the tests read it: a settings route carrying an empty `children`
 * would read as a surface that declares sub-routes and happens to have
 * none, rather than as one that declares none.
 *
 * @param surface - Entry from `SURFACES`.
 * @returns The surface's route, carrying one child per entry the table
 * names for it.
 */
const surfaceRoute = (surface: Surface): RouteObject => {
  const subRoutes = MODAL_SUB_ROUTES.get(surface.id) ?? [];
  const element = surfaceElement(surface);

  if (subRoutes.length === 0) {
    return { path: surface.segment, element };
  }

  return {
    path: surface.segment,
    element,
    children: subRoutes.map((subRoute) => ({
      path: subRoute.path,
      element: subRoute.element,
    })),
  };
};

/**
 * Everything a base carries: the index redirect, one route per surface,
 * and the catch-all.
 *
 * Built fresh per call so the two trees own separate arrays — but from
 * one declaration, so a surface, and every modal sub-route under one,
 * is written once and appears under both bases. Still one factory with
 * the table widened: a surface's second sub-route is a table row, and
 * nothing about building a base changed to accept it.
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
