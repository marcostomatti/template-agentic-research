/**
 * @packageDocumentation
 * The rail: brand block, nav, spacer, week spend, quick access — the
 * sidebar slot `AppLayout` calls with the live collapse flag.
 *
 * Everything routable here is expressed against the ACTIVE BASE rather
 * than against a literal path, so the same component serves both route
 * trees: `useParams` supplies the `:domainSlug` under `/d/:domainSlug`
 * and supplies nothing under `/`, `domainBase` turns either into a base,
 * and every destination is built through `withBase`. Nothing below reads
 * which of the two trees is live.
 *
 * The selected nav entry is derived from the PATH rather than held as
 * state, which is what keeps the rail correct after a back button, a
 * deep link or the domain switcher's base swap — none of which go
 * through this component's own handler. `activeSurfaceId` is tolerant
 * for the same reason the rail is chrome: an unmatched path still
 * mounts the shell, and the nav simply has nothing current.
 *
 * `domainBase` is NOT tolerant, and that hands the router a
 * requirement. It throws on a slug that is not one lowercase path
 * segment, because a slug reaches it decoded and a `%2F` would
 * otherwise build a base pointing somewhere else entirely. Since the
 * rail resolves the base on every render, a malformed slug that MATCHED
 * `/d/:domainSlug` would throw through the chrome rather than render a
 * not-found page. The route tree is where that has to be caught —
 * react-router v7 has no pattern-level param constraint, so the check
 * belongs in the route element or a loader.
 *
 * ## The brand block
 *
 * `WorkspaceMark` plus app-local lockup text, and both halves of that
 * are a constraint rather than a preference. `Wordmark` renders the
 * origin project's two brand words straight into the DOM, and
 * `TomatoMark`'s own docblock restricts the mascot to `EmptyState` and
 * the auth screens — so neither can stand at the top of this app's
 * rail. `WorkspaceMark` derives its initials from the name it is given,
 * which makes it the one brand atom in `@ar/ui` that carries no origin
 * identity of its own.
 *
 * ## What is deliberately NOT here
 *
 * The collapse control. `AppShellTopbar` draws that button itself, ahead
 * of its children, whenever it is handed an `onToggleSidebar` — see
 * `AppLayout`, which owns the flag and passes it down.
 *
 * Nothing in this file is reachable from the unit suite: it is node-only
 * and collects `.ts` alone, so a component is out of its reach by
 * construction. The decisions worth testing were pushed OUT of it
 * instead — `activeSurfaceId`, `domainBase` and `withBase` are pure and
 * covered in `../routes/paths.test.ts`, and what is left here is
 * composition the Playwright specs drive.
 */

import type { SidebarQuickAccessItem } from '@ar/ui';

import {
  SidebarNav,
  SidebarQuickAccess,
  SidebarWeekSummary,
  WorkspaceMark,
  cn,
} from '@ar/ui';
import { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { useSpendSummary } from '../data/hooks';
import { activeSurfaceId, domainBase, withBase } from '../routes/paths';

import { NAV_ITEMS } from './nav';

/** The lockup's first word, carrying the mark's first initial. */
const APP_NAME_LEAD = 'agentic';

/** The lockup's second word, carrying the mark's second initial. */
const APP_NAME_TRAIL = 'research';

/**
 * The app's own name, and the only place it is assembled in the shell.
 *
 * Composed from the two words above rather than split back out of one
 * string: `WorkspaceMark` derives the initials it draws by splitting on
 * whitespace, so building the name from the halves the lockup renders is
 * what keeps the mark and the type beside it saying the same thing. The
 * other direction would need a fallback for a name that did not split
 * into two, and a fallback here would quietly render half a lockup.
 */
const APP_NAME = `${APP_NAME_LEAD} ${APP_NAME_TRAIL}`;

/**
 * Where the rail's Docs link points.
 *
 * A PLACEHOLDER, on the IANA-reserved example domain precisely so it
 * reads as one: this deployment publishes no documentation site yet, and
 * a link to a real host that happens to be wrong is worse than a link
 * that is obviously pending. Whoever stands the docs up replaces this
 * constant and nothing else.
 */
const DOCS_URL = 'https://example.com/docs';

/** What the rail needs from the layout route. */
export interface SidebarProps {
  /**
   * The live collapse flag, threaded down from `AppLayout`. Never this
   * component's own state — every piece of chrome that reacts to it is
   * handed the same value, so the rail cannot half-collapse.
   */
  readonly collapsed: boolean;
}

/**
 * The application rail.
 *
 * @param props - The collapse flag from the layout route.
 * @returns The rail's contents, for `AppShellSidebar` to hold.
 */
export const Sidebar = ({ collapsed }: SidebarProps) => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const spend = useSpendSummary();

  const base = domainBase(domainSlug);
  const activeId = activeSurfaceId(pathname);

  const goToSurface = useCallback(
    (surfaceId: string) => {
      void navigate(withBase(base, surfaceId));
    },
    [base, navigate],
  );

  const quickAccess: SidebarQuickAccessItem[] = [
    { id: 'docs', label: 'Docs', icon: 'book', href: DOCS_URL },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      active: activeId === 'settings',
      onClick: () => goToSurface('settings'),
    },
  ];

  return (
    <>
      <div
        className={cn(
          // Matches the topbar band across the fold: same 60px height,
          // same 18px inset, same hairline underneath, so the two meet
          // in one line across the top of the app.
          'flex h-[60px] shrink-0 items-center gap-2.5 border-b border-border-soft',
          collapsed
            ? 'justify-center p-0'
            : 'justify-start px-[18px]',
        )}
      >
        {/*
          Sized to the collapsed rail's own rhythm: a collapsed NavItem is
          an 18px glyph in 9px of padding, so a 36px mark sits directly
          over the column of nav entries beneath it rather than near it.
        */}
        <WorkspaceMark name={APP_NAME} size="md" />
        {!collapsed && (
          // Hidden from the accessibility tree on purpose: WorkspaceMark
          // is a labelled `img` carrying this same name, so announcing
          // the type as well would say it twice when expanded and once
          // when collapsed. The visible half is the decorative one.
          <span
            aria-hidden="true"
            className="truncate font-display text-[17px] font-bold tracking-[-0.02em]"
          >
            <span className="text-fg1">{APP_NAME_LEAD}</span>{' '}
            <span className="text-accent">{APP_NAME_TRAIL}</span>
          </span>
        )}
      </div>

      <SidebarNav
        items={NAV_ITEMS}
        activeId={activeId}
        collapsed={collapsed}
        onNavigate={goToSurface}
        label="Main navigation"
      />

      {/* Bottom-anchoring the two widgets below is composition, not
          widget state — SidebarWeekSummary's own docblock says so. */}
      <div className="flex-1" />

      {spend.data !== undefined && (
        // Rendered only once the read has resolved. The fixture accessor
        // settles on a microtask, so this is a single frame today and a
        // real gap after the API swap — which is the point of going
        // through the cache hook rather than reading the fixture here.
        <SidebarWeekSummary
          status={spend.data.status}
          used={spend.data.used}
          limit={spend.data.limit}
          unit={spend.data.unit}
          collapsed={collapsed}
        />
      )}

      {/*
        Docs is external and opens a new tab; Settings is in-app. Settings
        is ALSO a nav surface here, where the reference composition this
        band is ported from had it only in this strip — so the rail offers
        it twice, and both controls correctly report `aria-current=page`
        when it is open. The consequence for the e2e specs is that a
        Settings locator has to be scoped to a landmark: the two navs are
        named Main navigation and Quick access precisely so it can be.
      */}
      <SidebarQuickAccess items={quickAccess} collapsed={collapsed} />
    </>
  );
};
