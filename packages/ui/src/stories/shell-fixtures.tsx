import { useState } from 'react';

import { TomatoMark } from '../atoms/TomatoMark';
import { cn } from '../lib';
import {
  NotificationsBell,
  type NotificationItem,
} from '../organisms/NotificationsBell';
import { ProfileMenu } from '../organisms/ProfileMenu';
import {
  SearchSuggest,
  type SearchSuggestion,
} from '../organisms/SearchSuggest';
import { ThemeSwitcher, type ThemeName } from '../organisms/ThemeSwitcher';
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from '../organisms/WorkspaceSwitcher';
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellSidebar,
  AppShellTopbar,
  SidebarNav,
  SidebarQuickAccess,
  SidebarWeekSummary,
  type SidebarNavConfigItem,
} from '../templates/AppShell';

/**
 * Story harness for the AppShell stories. The chrome is the REAL library
 * components — WorkspaceSwitcher, SearchSuggest, NotificationsBell,
 * ThemeSwitcher, ProfileMenu in the topbar; SidebarNav +
 * SidebarWeekSummary + SidebarQuickAccess in the rail — this file only
 * supplies demo data, placeholder page content and the LiveShell wiring.
 * The shell remains; the page content changes.
 */

/* ---- demo data ----------------------------------------------------------- */

/** Nav as data (the app-shell spec icons). */
// eslint-disable-next-line react-refresh/only-export-components -- story fixture module mixing demo components and nav data; fast refresh does not apply
export const NAV_PRIMARY: SidebarNavConfigItem[] = [
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
  { id: 'sessions', label: 'Sessions', icon: 'terminal' },
  { id: 'agents', label: 'Agents', icon: 'bot' },
  { id: 'roadmap', label: 'Roadmap', icon: 'list' },
  { id: 'tools', label: 'Tools', icon: 'cpu' },
  { id: 'usage', label: 'Usage', icon: 'zap' },
];

const WORKSPACES: WorkspaceOption[] = [
  { id: 'og', name: 'open-garden', members: 12, tone: 'accent' },
  { id: 'rt', name: 'ripe-tomatoes', members: 6, tone: 'primary' },
  { id: 'vp', name: 'vine-patch', members: 3, tone: 'gold' },
];

const SUGGESTIONS: SearchSuggestion[] = [
  { kind: 'agent', label: 'auth-refactor', sub: 'running · agent-7d2f' },
  { kind: 'session', label: 'settings page draft', sub: '12m ago · sam · sonnet-4-5' },
  { kind: 'task', label: 'Add per-tool spend chart to usage page', sub: 'roadmap · high' },
  { kind: 'tool', label: 'github-issues', sub: 'MCP · connected' },
  { kind: 'doc', label: 'Composting context between runs', sub: 'docs/experiments' },
];

const NOTIFICATIONS: NotificationItem[] = [
  { id: 1, unread: true, level: 'ok', title: 'auth-refactor finished', body: '8 files updated · 12.3k tokens', time: '2m ago' },
  { id: 2, unread: true, level: 'warn', title: 'perf-investigate is waiting', body: 'Token budget paused at 0/200k.', time: '14m ago' },
  { id: 3, unread: false, level: 'info', icon: 'git-branch', title: 'docs-typos opened PR #214', body: '23 typos across docs/.', time: 'yesterday' },
];

const USER = { name: 'Jess Lin', email: 'jess@open-garden.dev', role: 'owner' };

/* ---- sidebar ------------------------------------------------------------- */

export const SidebarDemo = ({
  active,
  onNavigate,
  collapsed = false,
}: {
  active: string;
  onNavigate: (id: string) => void;
  collapsed?: boolean;
}) => (
  <>
    <div
      className={cn(
        'flex h-[60px] shrink-0 items-center gap-2.5 border-b border-border-soft',
        collapsed
          ? 'justify-center p-0'
          : 'justify-start px-[18px]',
      )}
    >
      <TomatoMark size={26} />
      {!collapsed && (
        <span className="wordmark !text-[17px]">
          <span className="wordmark-open">open</span>{' '}
          <span className="wordmark-tomato">tomato</span>
        </span>
      )}
    </div>
    <SidebarNav
      items={NAV_PRIMARY}
      activeId={active}
      onNavigate={onNavigate}
      collapsed={collapsed}
    />
    <div className="flex-1" />
    <SidebarWeekSummary
      status="healthy"
      used={1_200_000}
      limit={4_000_000}
      collapsed={collapsed}
    />
    <SidebarQuickAccess
      collapsed={collapsed}
      items={[
        { id: 'docs', label: 'Docs', icon: 'book', href: 'https://example.com/docs' },
        {
          id: 'settings',
          label: 'Settings',
          icon: 'settings',
          active: active === 'settings',
          onClick: () => onNavigate('settings'),
        },
      ]}
    />
  </>
);

/* ---- topbar -------------------------------------------------------------- */

export const TopbarDemo = ({ title }: { title: string }) => {
  const [theme, setTheme] = useState<ThemeName>('light');
  return (
    <>
      <WorkspaceSwitcher workspaces={WORKSPACES} activeId="og" />
      <div className="font-display text-lg font-bold capitalize tracking-[-0.015em] text-fg1">
        {title}
      </div>
      <div className="flex-1" />
      <SearchSuggest
        suggestions={SUGGESTIONS}
        className="w-[220px]"
        hotkey={false}
      />
      <NotificationsBell notifications={NOTIFICATIONS} />
      <ThemeSwitcher theme={theme} onToggle={setTheme} />
      <ProfileMenu user={USER} />
    </>
  );
};

/* ---- the live shell harness ---------------------------------------------- */

/**
 * Placeholder page content for the shell's content slot. The dashboard
 * pages themselves are app content, not library exports — the stories
 * only need page-shaped filler for the shell to hold.
 */
const PlaceholderPage = ({ id }: { id: string }) => (
  <section aria-label={`${id} placeholder`} className="flex flex-col gap-4">
    <div className="h-8 w-44 rounded-md bg-surface-sunk" />
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[120px] rounded-lg border border-border-soft bg-surface-1 shadow-xs"
        />
      ))}
    </div>
    <div className="h-[260px] rounded-lg border border-border-soft bg-surface-1 shadow-xs" />
  </section>
);

/**
 * The live shell from the original appshell demo: page + collapsed are ONE piece of
 * controlled state each, threaded down. The collapse button belongs to
 * the AppShellTopbar wrapper (the app-shell spec); `withFooter` exercises
 * the optional AppShellContent footer slot.
 */
export const LiveShell = ({
  page: initialPage = 'overview',
  collapsed: initialCollapsed = false,
  withFooter = false,
}: {
  page?: string;
  collapsed?: boolean;
  withFooter?: boolean;
}) => {
  const [page, setPage] = useState(initialPage);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  return (
    <div className="flex h-[560px] overflow-hidden rounded-xl border border-border-strong bg-bg shadow-lg">
      <AppShell>
        <AppShellSidebar collapsed={collapsed}>
          <SidebarDemo active={page} onNavigate={setPage} collapsed={collapsed} />
        </AppShellSidebar>
        <AppShellMain>
          <AppShellTopbar
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
          >
            <TopbarDemo title={page} />
          </AppShellTopbar>
          <AppShellContent
            footer={withFooter
              ? (
                <>
                  <span>© 2026 Acme</span>
                  <a href="#docs">Documentation</a>
                  <a href="#support">Support</a>
                  <a href="#feedback">Feedback</a>
                </>
              )
              : undefined}
          >
            <PlaceholderPage id={page} />
          </AppShellContent>
        </AppShellMain>
      </AppShell>
    </div>
  );
};
