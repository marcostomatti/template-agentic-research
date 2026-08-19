import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellSidebar,
  AppShellTopbar,
  EmptyState,
  SidebarNav,
} from '@ar/ui';
import { useState } from 'react';

import { NAV_ITEMS, NAV_TITLES } from './app-shell/nav';

/**
 * Shell scaffold: the workspace level maps to research domains (visual
 * hierarchy only — domains carry no security boundary here). Real pages,
 * topbar chrome (domain switcher, search, theme) and routing land with the
 * UI spec.
 */
export const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState('digest');

  return (
    <AppShell>
      <AppShellSidebar collapsed={collapsed}>
        <SidebarNav
          items={NAV_ITEMS}
          activeId={activeId}
          collapsed={collapsed}
          onNavigate={setActiveId}
          label="Main navigation"
        />
      </AppShellSidebar>
      <AppShellMain>
        <AppShellTopbar
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
        >
          <span>{NAV_TITLES[activeId]}</span>
        </AppShellTopbar>
        <AppShellContent>
          <EmptyState
            title={`${NAV_TITLES[activeId] ?? 'Page'} — coming soon`}
            description="This surface is defined in the UI spec and lands in a later session."
          />
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
};
