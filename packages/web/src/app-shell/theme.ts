/**
 * @packageDocumentation
 * Theme resolution, and the one place in the app that writes `data-theme`.
 *
 * `@ar/ui`'s `ThemeSwitcher` is fully controlled and touches no DOM: it
 * renders a glyph for the theme it is handed and calls back with the theme
 * to switch TO. So the app owns theme state, and this module is where that
 * ownership lives — {@link useTheme} holds the state, mirrors it onto
 * `document.documentElement` as the `data-theme` attribute `tokens.css`
 * keys its light and dark blocks off, and persists the operator's choice.
 *
 * The two halves are split on purpose. {@link resolveInitialTheme} is a
 * pure function over an already-read {@link ThemeEnvironment}, so the
 * precedence rule — stored preference, then the OS preference, then light
 * — is testable in the node unit suite without a DOM. Everything that has
 * to touch `window` sits in the hook and its readers, and is covered by
 * the Playwright suite instead.
 *
 * Resolution happens once, at mount. A later OS-level switch does not move
 * a running app; nothing in the shell asks for that yet, and adding a
 * `matchMedia` subscription would also need a rule for what it does to a
 * stored preference.
 *
 * Note the attribute lands in an effect, so it is written after first
 * paint. That is not a flash of the wrong theme in the common case:
 * `tokens.css` already falls back to `prefers-color-scheme` while
 * `:root` carries no `data-theme`, which is the same answer this resolver
 * gives when nothing is stored. Only a stored preference that contradicts
 * the OS paints twice, and closing that gap needs a blocking inline script
 * in `index.html` rather than anything here.
 */

import type { ThemeName } from '@ar/ui';

import { useCallback, useEffect, useState } from 'react';

/**
 * `localStorage` key the operator's explicit theme choice is stored under.
 *
 * Namespaced because the dev server and the built app share an origin with
 * anything else served from it.
 */
export const THEME_STORAGE_KEY = 'ar.theme';

/** Attribute on `<html>` that `tokens.css` keys light and dark off. */
export const THEME_ATTRIBUTE = 'data-theme';

/** Media query the OS-level dark preference is read from. */
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Last resort when nothing is stored and the OS asks for nothing. Light
 * matches `tokens.css`, where the light block is `:root` itself.
 */
const DEFAULT_THEME: ThemeName = 'light';

/**
 * The two theme inputs, already read out of the browser.
 *
 * Passing them in rather than reading them keeps {@link resolveInitialTheme}
 * pure, and keeps the precedence rule readable at the call site.
 */
export interface ThemeEnvironment {
  /**
   * Raw value from storage — `null` when nothing is stored, and any
   * string at all when something else wrote the key. It is deliberately
   * not typed `ThemeName`: storage is a boundary, so the value is
   * validated here rather than trusted.
   */
  readonly storedTheme: string | null;
  /** Whether the OS reports a dark color-scheme preference. */
  readonly prefersDark: boolean;
}

function isTheme(value: string | null): value is ThemeName {
  return value === 'light' || value === 'dark';
}

/**
 * The theme an app should start in.
 *
 * Precedence is stored preference, then the OS preference, then light. An
 * explicit choice outranks the OS because the operator made it on this
 * machine; the OS outranks the default because it is a preference rather
 * than an absence of one.
 *
 * @param environment - Stored value and OS preference, already read.
 * @returns The theme to mount with.
 */
export function resolveInitialTheme(environment: ThemeEnvironment): ThemeName {
  const { storedTheme, prefersDark } = environment;

  if (isTheme(storedTheme)) {
    return storedTheme;
  }

  return prefersDark
    ? 'dark'
    : DEFAULT_THEME;
}

/**
 * Read the stored preference, treating an unreadable store as no
 * preference.
 *
 * `localStorage` throws rather than returning `null` when storage is
 * disabled or the quota policy blocks the origin (private browsing on some
 * engines). That is not an error the operator can act on and not a reason
 * to fail a page load, so it degrades to the OS preference — the same
 * answer a first visit gets.
 */
function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist an explicit choice, tolerating an unwritable store.
 *
 * Same boundary as {@link readStoredTheme}: the theme still applies for
 * this session, it just will not survive a reload.
 */
function writeStoredTheme(theme: ThemeName): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Deliberate: persistence is the only thing lost, and the caller has
    // no recovery to offer for it.
  }
}

function readThemeEnvironment(): ThemeEnvironment {
  return {
    storedTheme: readStoredTheme(),
    prefersDark: window.matchMedia(DARK_MEDIA_QUERY).matches,
  };
}

/** What {@link useTheme} hands back. */
export interface UseThemeResult {
  /** Active theme — feed straight to `ThemeSwitcher`'s `theme` prop. */
  readonly theme: ThemeName;
  /**
   * Switch themes and remember the choice. Shaped to bind directly to
   * `ThemeSwitcher`'s `onToggle`, which is already called with the theme
   * to switch to.
   */
  readonly setTheme: (next: ThemeName) => void;
}

/**
 * Own the app's theme: resolve it at mount, mirror it onto the document,
 * and persist a change.
 *
 * The effect is DOM synchronization, not derived state — it writes an
 * attribute React does not otherwise control. Persistence deliberately
 * does NOT live in that effect: writing on mount would turn a merely
 * resolved theme into a stored preference, freezing the OS preference for
 * an operator who never touched the switcher. Only an explicit change
 * writes.
 *
 * Browser-only, like the rest of the shell — it reads `window` during the
 * initial render.
 *
 * @returns The active theme and the setter to change it.
 */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<ThemeName>(
    () => resolveInitialTheme(readThemeEnvironment()),
  );

  useEffect(() => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemeName) => {
      setThemeState(next);
      writeStoredTheme(next);
    },
    [],
  );

  return { theme, setTheme };
}
