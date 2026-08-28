/**
 * @packageDocumentation
 * The band across the top: which domain, which surface, and the four
 * controls that belong to the operator rather than to the page — the
 * topbar slot `AppLayout` hands to `AppShellTopbar`.
 *
 * Everything here is chrome in the strict sense: it is the same on
 * every surface, it survives every navigation inside a base, and none
 * of it is the page's to draw. The page's own heading, filters and
 * actions arrive below the content slot, not here.
 *
 * ## The domain switcher
 *
 * `WorkspaceSwitcher` lists the domain fixtures and navigates by
 * swapping the ROUTE BASE, which is the whole of what switching a
 * domain means in this app: `swapBase` keeps everything below the base
 * — the surface, and any modal sub-route under it — so an operator
 * reading the lexicon of one domain lands on the lexicon of the other
 * rather than back at an index.
 *
 * The target is always `domainBase(slug)`, so a switch from the
 * single-domain base moves to `/d/<slug>` even when the slug names the
 * domain `/` already resolves to. That is deliberate: `/` means "the
 * one domain this operator runs" and an explicit choice deserves an
 * explicit URL, which is also the only spelling a link can carry.
 *
 * `activeId` is the RESOLVED slug rather than the route param, so `/`
 * and `/d/example-tech-radar` both check the same row.
 *
 * ## The page title
 *
 * Derived from the path through `activeSurfaceId`, never from state,
 * for the reason the rail gives: a back button, a deep link and the
 * switcher's base swap all change the surface without going through a
 * handler here. `getSurface` cannot throw on that id — it came out of
 * the surface table a moment earlier — and a path naming no surface
 * simply renders no title, which is what the router's catch-all needs.
 *
 * It is a plain element rather than a heading. The page below owns the
 * document's `h1`, and a topbar that also claimed one would give every
 * surface two competing top-level headings.
 *
 * ## What each read is gated on
 *
 * A widget is rendered only once its read has settled WHEN ITS CLOSED
 * STATE ALREADY SHOWS DATA — the switcher's active name, the bell's
 * unread dot, the avatar's initials. Those three would otherwise paint
 * a reading of nothing and then correct it.
 *
 * `SearchSuggest` is the exception and the line is the same one: shut,
 * it shows placeholder text and a hotkey chip and no data at all, so
 * it renders from the first frame with whatever palette has arrived.
 * Its panel opens on focus, long after a read that resolves on a
 * microtask.
 *
 * The switcher needs no explicit gate: it hides itself below two
 * workspaces, so an empty list during the read is already the right
 * behaviour, and that same rule is why the fixtures carry a second
 * domain at all.
 *
 * Against fixtures every gap here is one frame. They exist for the
 * q15 swap, when these reads become HTTP and the gap becomes real —
 * which is the reason the chrome goes through `../data/hooks` instead
 * of reading the fixture accessors it could reach directly.
 *
 * ## Notifications
 *
 * `NotificationsBell` is parent-owned: it renders the list it is given
 * and reports `onMarkAllRead` back. This component answers that with a
 * NEW list, because `../data/shell.ts` freezes every item precisely so
 * the shortcut — flipping `unread` on the fixture in place — throws
 * where it is written instead of silently changing what every later
 * reader in the tab sees.
 *
 * What is held here is the set of ids the operator has READ, not a
 * copy of the list. So the rendered list stays derived from the read
 * on every render, there is no effect seeding state from an async
 * answer, and a refetch that adds a notification cannot be masked by a
 * stale local copy. After q15 the same gesture becomes a mutation and
 * this set is what it replaces.
 *
 * ## Theme
 *
 * `ThemeSwitcher` is fully controlled and writes no DOM, so `useTheme`
 * is called here — the switcher is its only consumer, and the topbar
 * mounts once for the life of a base. Crossing BETWEEN the two bases
 * remounts it, since the two route trees are separate branches; that
 * costs nothing, because an explicit choice is in storage and a merely
 * resolved one recomputes to the same answer.
 *
 * `preference` is left off. It hides the control when an operator has
 * asked to follow the OS, and this deployment's settings fixture holds
 * no such preference to bind it to.
 *
 * ## Controls with nowhere to go
 *
 * Three of the composed menus offer items this stage has no
 * destination for, and they are left unwired rather than pointed at a
 * near-miss:
 *
 * - The palette's `onSelect` and `onSearch`. A suggestion carries no
 *   id and there is no search surface. The surface token every `sub`
 *   opens with is a display convention (pinned by `shell.test.ts`),
 *   and turning a rendered string back into a route wants a tolerant
 *   id lookup in `../routes/paths` with its own test, not a `split`
 *   in chrome that would throw on a miss.
 * - The bell's `onOpenItem` and `onSeeAll`: no notification route.
 * - The profile menu's `onProfile` and `onSwitchWorkspace`, and the
 *   switcher's `onNew`. There is no operator profile, no way to open
 *   another menu programmatically, and creating a research domain is a
 *   service operation with no UI in this plan.
 *
 * `onLogout` is unwired for a stronger reason: there is no session.
 * `logoutMessage` is still overridden, because the component's default
 * names a placeholder company — a confirmation naming somebody else's
 * product is worse than a vague one.
 *
 * Both "settings" destinations ARE wired, to the app's settings
 * surface: it is the one place holding deployment-level preferences,
 * and `WorkspaceSwitcher`'s own docblock sends "see all workspaces"
 * there too.
 *
 * ## What is deliberately NOT here
 *
 * The collapse control. `AppShellTopbar` draws that button itself,
 * ahead of its children, whenever it is handed an `onToggleSidebar` —
 * see `AppLayout`, which owns the flag.
 *
 * Nothing in this file is reachable from the unit suite: it is
 * node-only and collects `.ts` alone. The decisions worth testing were
 * pushed out of it — `activeSurfaceId`, `domainBase`, `swapBase`,
 * `withBase` and `resolveInitialTheme` are pure and covered by
 * `../routes/paths.test.ts` and `./theme.test.ts` — and what is left
 * is composition the Playwright specs drive.
 */

import type { NotificationItem, WorkspaceOption } from '@ar/ui';

import {
  NotificationsBell,
  ProfileMenu,
  SearchSuggest,
  ThemeSwitcher,
  WorkspaceSwitcher,
} from '@ar/ui';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { resolveDomainSlug } from '../data/domains';
import {
  useDomains,
  useNotifications,
  useOperator,
  useSearchSuggestions,
} from '../data/hooks';
import {
  activeSurfaceId,
  domainBase,
  getSurface,
  swapBase,
  withBase,
} from '../routes/paths';

import { useTheme } from './theme';

/**
 * How wide the search box sits in this app's topbar.
 *
 * Narrower than `SearchSuggest`'s own 340px default, which assumes a
 * bar carrying nothing to its left. Here it shares the row with the
 * domain switcher and the page title, and the panel it opens is a
 * fixed-width overlay that this number does not constrain.
 */
const SEARCH_WIDTH_CLASS = 'w-[260px]';

/**
 * What the logout confirmation asks.
 *
 * Names the action rather than the product, per `ConfirmPopover`'s
 * rule against a bare "are you sure?" — and deliberately does not
 * repeat the app name the rail assembles, which would be a second copy
 * of a string with no shared source.
 */
const LOGOUT_MESSAGE = 'Log out of this deployment?';

/**
 * The application topbar.
 *
 * @returns The topbar's contents, for `AppShellTopbar` to hold after
 * the collapse button it draws itself.
 */
export const Topbar = () => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const domainsRead = useDomains();
  const suggestionsRead = useSearchSuggestions();
  const notificationsRead = useNotifications();
  const operatorRead = useOperator();

  // Which notifications the operator has cleared — ids, not rows, so
  // the list below stays derived from the read. See the header.
  const [readIds, setReadIds] = useState<ReadonlySet<NotificationItem['id']>>(
    () => new Set(),
  );

  const activeId = activeSurfaceId(pathname);
  const title = activeId === undefined
    ? undefined
    : getSurface(activeId).title;

  // A domain is a workspace to this component and nothing more. No
  // `members` (a domain has none) and no `tone` (the marks differ by
  // their initials; picking a fill per domain would be presentation
  // invented here, in a file no unit test can reach).
  const workspaces: WorkspaceOption[] = (domainsRead.data ?? []).map(
    (domain) => ({ id: domain.slug, name: domain.name }),
  );

  // Copied out of the frozen fixture arrays because both props are
  // declared mutable. The components do not write to them; the copy is
  // what satisfies the signature without casting the freeze away.
  const suggestions = [...(suggestionsRead.data ?? [])];
  const notifications = notificationsRead.data?.map((item) => (readIds
    .has(item.id)
    ? { ...item, unread: false }
    : item));
  const operator = operatorRead.data;

  const goToSettings = () => {
    void navigate(withBase(domainBase(domainSlug), 'settings'));
  };

  return (
    <>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeId={resolveDomainSlug(domainSlug)}
        onSwitch={(slug) => {
          void navigate(swapBase(pathname, domainBase(slug)));
        }}
        onSeeAll={goToSettings}
      />

      {title !== undefined && (
        <div className="min-w-0 truncate font-display text-lg font-bold tracking-[-0.015em] text-fg1">
          {title}
        </div>
      )}

      {/* Pushes the operator's own controls to the trailing edge, so
          the leading half of the bar says where you are and the
          trailing half is what you can do from anywhere. */}
      <div className="flex-1" />

      <SearchSuggest
        suggestions={suggestions}
        className={SEARCH_WIDTH_CLASS}
      />

      {notifications !== undefined && (
        <NotificationsBell
          notifications={notifications}
          onMarkAllRead={() => setReadIds(
            new Set(notifications.map((item) => item.id)),
          )}
        />
      )}

      <ThemeSwitcher theme={theme} onToggle={setTheme} />

      {operator !== undefined && (
        <ProfileMenu
          user={operator}
          onAccountSettings={goToSettings}
          logoutMessage={LOGOUT_MESSAGE}
        />
      )}
    </>
  );
};
