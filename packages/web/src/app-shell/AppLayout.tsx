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
 * the topbar control and reads the accessible name flip.
 */

import type { ReactNode } from 'react';

import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellSidebar,
  AppShellTopbar,
} from '@ar/ui';
import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';

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
