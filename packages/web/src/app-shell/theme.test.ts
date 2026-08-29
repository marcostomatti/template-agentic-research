import { describe, expect, it } from 'vitest';

import { resolveInitialTheme } from './theme';

// Only the resolver is covered here: it is the half of the module that was
// made pure so it could be. The hook reads `window` and writes the document,
// which the Playwright suite exercises against a real browser rather than a
// jsdom shim (see `tests/README.md` for the two-runner split).
//
// Every stored value below is typed as it arrives from `localStorage` — a
// string, or nothing. That is the boundary the resolver validates, so the
// cases that matter most are the ones where storage holds something that is
// not a theme at all.

/** Values `localStorage` can hand back that are not a theme name. */
const NON_THEME_STORED_VALUES = [
  '',
  'Dark',
  'LIGHT',
  'system',
  'auto',
  ' dark',
  'null',
  '{"theme":"dark"}',
];

describe('resolveInitialTheme', () => {
  it('prefers a stored dark preference over a light system preference', () => {
    // Arrange
    const environment = { storedTheme: 'dark', prefersDark: false };

    // Act
    const theme = resolveInitialTheme(environment);

    // Assert
    expect(theme).toBe('dark');
  });

  it('prefers a stored light preference over a dark system preference', () => {
    // Arrange
    const environment = { storedTheme: 'light', prefersDark: true };

    // Act
    const theme = resolveInitialTheme(environment);

    // Assert
    expect(theme).toBe('light');
  });

  it('falls back to dark when nothing is stored and the system prefers dark', () => {
    // Arrange
    const environment = { storedTheme: null, prefersDark: true };

    // Act
    const theme = resolveInitialTheme(environment);

    // Assert
    expect(theme).toBe('dark');
  });

  it('falls back to light when nothing is stored and the system prefers light', () => {
    // Arrange
    const environment = { storedTheme: null, prefersDark: false };

    // Act
    const theme = resolveInitialTheme(environment);

    // Assert
    expect(theme).toBe('light');
  });

  it('ignores a stored value that is not a theme name', () => {
    // A stored value only outranks the system preference when it IS one of
    // the two themes; anything else is treated as no preference at all,
    // including the near-misses a case-insensitive check would accept.
    // Arrange
    const stored = NON_THEME_STORED_VALUES;

    // Act
    const resolved = stored.map((storedTheme) => ({
      storedTheme,
      theme: resolveInitialTheme({ storedTheme, prefersDark: true }),
    }));

    // Assert
    expect(stored.length).toBe(8);
    expect(resolved.filter((entry) => entry.theme !== 'dark')).toEqual([]);
  });

  it('falls through a non-theme stored value to the light default', () => {
    // The same values, with the system asking for nothing: a stored value
    // that is ignored must reach the default rather than pinning whichever
    // branch the previous test happened to exercise.
    // Arrange
    const stored = NON_THEME_STORED_VALUES;

    // Act
    const resolved = stored.map((storedTheme) => ({
      storedTheme,
      theme: resolveInitialTheme({ storedTheme, prefersDark: false }),
    }));

    // Assert
    expect(stored.length).toBe(8);
    expect(resolved.filter((entry) => entry.theme !== 'light')).toEqual([]);
  });

  it('round-trips every theme name it can return', () => {
    // Whatever the resolver returns is what the hook persists, so a theme
    // it can produce but not read back would silently reset on reload.
    // Arrange
    const produced = [
      resolveInitialTheme({ storedTheme: null, prefersDark: false }),
      resolveInitialTheme({ storedTheme: null, prefersDark: true }),
    ];

    // Act
    const round = produced.map((theme) => resolveInitialTheme({
      storedTheme: theme,
      prefersDark: theme === 'light',
    }));

    // Assert
    expect(new Set(produced).size).toBe(2);
    expect(round).toEqual(produced);
  });
});
