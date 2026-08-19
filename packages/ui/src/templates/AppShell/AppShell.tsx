import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { cn } from '../../lib';

import {
  appShell,
  appShellContent,
  appShellFooter,
  appShellMain,
  appShellSidebar,
  appShellTopbar,
  type AppShellSidebarVariants,
} from './AppShell.variants';

/**
 * Compound API — the shell is layout only; everything inside the zones is
 * components from earlier chapters:
 *
 *   <AppShell>
 *     <AppShellSidebar collapsed={collapsed}>…brand, nav, NavItems…</AppShellSidebar>
 *     <AppShellMain>
 *       <AppShellTopbar onToggleSidebar={…} sidebarCollapsed={collapsed}>
 *         …workspace switcher, title, search, Menu-driven buttons…
 *       </AppShellTopbar>
 *       <AppShellContent footer={…}>{page}</AppShellContent>
 *     </AppShellMain>
 *   </AppShell>
 *
 * Controlled throughout: the active page and `collapsed` live in the parent
 * and are threaded down — exactly like `open` on the surfaces and `query`
 * on the toolbar. Per the app-shell spec the sidebar collapse BUTTON belongs
 * to the topbar wrapper itself (`onToggleSidebar`), not to page chrome.
 */

export type AppShellProps = HTMLAttributes<HTMLDivElement>;

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(appShell(), className)} {...props} />
  ),
);

AppShell.displayName = 'AppShell';

export interface AppShellSidebarProps
  extends HTMLAttributes<HTMLElement>,
  AppShellSidebarVariants {}

export const AppShellSidebar = forwardRef<HTMLElement, AppShellSidebarProps>(
  ({ className, collapsed, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(appShellSidebar({ collapsed }), className)}
      {...props}
    />
  ),
);

AppShellSidebar.displayName = 'AppShellSidebar';

export type AppShellMainProps = HTMLAttributes<HTMLElement>;

export const AppShellMain = forwardRef<HTMLElement, AppShellMainProps>(
  ({ className, ...props }, ref) => (
    <main ref={ref} className={cn(appShellMain(), className)} {...props} />
  ),
);

AppShellMain.displayName = 'AppShellMain';

export interface AppShellTopbarProps extends HTMLAttributes<HTMLElement> {
  /**
   * When provided, the wrapper renders the sidebar collapse button as its
   * first child (app-shell spec: — the collapse button is part of
   * the main topbar wrapper, not page chrome).
   */
  onToggleSidebar?: () => void;
  /** Drives the toggle's accessible name (Expand vs Collapse). */
  sidebarCollapsed?: boolean;
}

export const AppShellTopbar = forwardRef<HTMLElement, AppShellTopbarProps>(
  (
    { className, onToggleSidebar, sidebarCollapsed = false, children, ...props },
    ref,
  ) => (
    <header ref={ref} className={cn(appShellTopbar(), className)} {...props}>
      {onToggleSidebar != null && (
        <IconButton
          className="-ml-1 shrink-0"
          icon={<Icon name="panel-left" size={18} />}
          label={sidebarCollapsed
            ? 'Expand sidebar'
            : 'Collapse sidebar'}
          onClick={onToggleSidebar}
        />
      )}
      {children}
    </header>
  ),
);

AppShellTopbar.displayName = 'AppShellTopbar';

export interface AppShellContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Optional shell-level footer (app-shell spec: Main Content):
   * copyright + general links, rendered at the end of the scroll flow.
   */
  footer?: ReactNode;
}

export const AppShellContent = forwardRef<HTMLDivElement, AppShellContentProps>(
  ({ className, footer, children, ...props }, ref) => (
    <div ref={ref} className={cn(appShellContent(), className)} {...props}>
      {children}
      {footer != null && <footer className={appShellFooter()}>{footer}</footer>}
    </div>
  ),
);

AppShellContent.displayName = 'AppShellContent';
