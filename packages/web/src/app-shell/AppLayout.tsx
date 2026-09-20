/**
 * @packageDocumentation
 * The layout route: the app's persistent chrome, and the one owner of the
 * sidebar collapse state.
 *
 * Both route trees — the single-domain base and the domain-scoped one —
 * nest under this component, so it mounts once for the life of the tab
 * and only the page below the `Outlet` changes. That is what makes it the
 * right owner for collapse: the sidebar keeps its width across every
 * navigation without the flag reaching the URL, which is reserved for the
 * state a link should carry (the surface, the domain, and the list
 * filters).
 *
 * The chrome arrives through slots rather than being imported here, so
 * this file stays layout arithmetic over `@ar/ui`'s shell primitives and
 * the router is the single place naming which sidebar and which topbar
 * the app runs. `Sidebar` and `Topbar` are composed into the layout route
 * element there.
 *
 * The two slots are shaped differently on purpose. The sidebar slot is a
 * function because `SidebarNav` renders an icon-only form when collapsed
 * and so needs the flag this component holds. The topbar slot is a plain
 * node because the collapse CONTROL is not the topbar content's to draw:
 * `AppShellTopbar` emits that button itself, ahead of its children,
 * whenever it is handed an `onToggleSidebar`.
 *
 * Nothing here is reachable from the unit suite, which is node-only and
 * collects `.ts` files alone — a component is out of its reach by
 * construction. Collapse is covered by the Playwright spec that drives
 * the topbar control and reads the accessible name flip. The same is
 * true of the `route` publish below, and for the same reason; the
 * paragraph on that effect names the forced case that does cover it.
 *
 * ## Why the `route` publish lives HERE
 *
 * This component is also the app's one producer of the `route` topic
 * on `./appSignals`, from a single effect over `useLocation`, and it
 * publishes nothing else on that channel.
 *
 * It is the right owner for the same reason it owns collapse, read
 * the other way round. Both route trees nest under it, so it mounts
 * once and stays mounted while every navigation happens beneath it —
 * exactly one component instance, holding exactly one effect, seeing
 * every location the app ever has. The two alternatives both cost
 * something this does not:
 *
 * - **Not the router.** `src/routes/router.tsx` is the route tree as
 *   DATA plus a `createAppRouter` factory. It declares no component
 *   of its own and runs no hook — it builds `RouteObject`s and the
 *   elements they carry — so there is no `useLocation` to put an
 *   effect beside. Publishing from there would mean either
 *   subscribing to the router object's own change events, a second
 *   notion of "where we are" parallel to the one every component
 *   already reads, or adding a component to the tree whose only job
 *   is to hold this effect — which is the component you are reading.
 * - **Not each surface.** A per-surface publish would be the same
 *   three lines repeated once per page and once per modal sub-route,
 *   each of them free to drift, and a surface added later would be
 *   silently absent from the channel with nothing red to say so. It
 *   would also publish the wrong thing: a surface knows which surface
 *   it is, not which location the tab is at, so a modal opening over
 *   a list would have to decide whether it is a navigation or not.
 *   `useArtefactSignal` is the per-surface hook, and it carries the
 *   per-surface fact — which entity is open — precisely because that
 *   one cannot be read from the layout.
 *
 * The effect is subscription-shaped, which is what the repo's
 * `react-hooks` guidance (`.claude/skills/react-hooks/`) asks of an
 * effect that stays: it synchronises React with something OUTSIDE
 * React rather than moving React state around. It calls no setter,
 * returns nothing and needs no cleanup, so it cascades no
 * render and the surfaces below this component render exactly as they
 * did before it was added. Its dependency list is the two location
 * fields it reads, so it runs once per distinct `path` + `search`
 * pair and not on an unrelated re-render of the shell.
 *
 * `at` is read with `Date.now()` inside the effect rather than
 * derived from the location, because a location carries no time and a
 * consumer needs to order two of them. That clock read is the one
 * reason there is no pure builder for this payload in
 * `./appSignals` beside `artefactPayload` and `errorPayload`: those
 * two shape or reduce something, this one copies two strings and
 * stamps them, and a builder holding a `Date.now()` would move an
 * impure line rather than remove it.
 *
 * `appSignals.publish` never throws whatever its subscribers do, so
 * no listener on this topic can take down the shell every route
 * renders inside.
 *
 * Under `StrictMode`, which `src/main.tsx` renders the app in, the
 * effect runs twice on the first mount. Both passes publish the same
 * payload but for `at`, and the value the channel settles on is the
 * later of two stamps taken microseconds apart — a duplicate, not a
 * wrong answer, which is why the effect needs no guard.
 *
 * Coverage, like collapse: the forced Playwright spec
 * `tests/e2e/dev-tools-boundary.spec.ts` reads a published `route`
 * back through `page.evaluate` over `devtoolsBus`, once the bridge in
 * `src/dev/` republishes this topic onto it. Both that spec and that
 * bridge land in later stages of the same plan as this effect, so
 * this paragraph names the cover rather than reports a green reading.
 */

import type { ReactNode } from 'react';

import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellSidebar,
  AppShellTopbar,
} from '@ar/ui';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';

import { appSignals } from './appSignals';

/** The chrome slots the router fills. */
export interface AppLayoutProps {
  /**
   * Sidebar content, called with the live collapse flag so the nav can
   * render its icon-only form. It goes inside `AppShellSidebar`, which is
   * handed the same flag for its own width.
   */
  readonly sidebar: (isCollapsed: boolean) => ReactNode;
  /**
   * Topbar content, rendered inside `AppShellTopbar` after the collapse
   * button that wrapper draws for itself.
   */
  readonly topbar: ReactNode;
}

/**
 * The shell every route renders inside.
 *
 * @param props - The chrome slots.
 * @returns The composed shell, with the active route at its content slot.
 */
export const AppLayout = ({ sidebar, topbar }: AppLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Subscription-shaped: it writes outside React and calls no
    // setter, so nothing below this component re-renders because of
    // it. `at` is stamped here because a location carries no time.
    appSignals.publish('route', {
      path: pathname,
      search,
      at: Date.now(),
    });
  }, [pathname, search]);

  const toggleSidebar = useCallback(
    () => setIsSidebarCollapsed((collapsed) => !collapsed),
    [],
  );

  return (
    <AppShell>
      <AppShellSidebar collapsed={isSidebarCollapsed}>
        {sidebar(isSidebarCollapsed)}
      </AppShellSidebar>
      <AppShellMain>
        <AppShellTopbar
          sidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        >
          {topbar}
        </AppShellTopbar>
        <AppShellContent>
          <Outlet />
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
};
