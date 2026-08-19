/**
 * Dev-only console helpers — emit in development, silent in production
 * bundles (bundlers statically replace `process.env.NODE_ENV`; the typeof
 * guard keeps bare-browser ESM from throwing on `process`).
 *
 * NOT part of the public API and never re-exported from the package root.
 * Import via '../../lib/dev' directly (same rule as lib/icons).
 */
const isDev = (): boolean => typeof process !== 'undefined'
  && process.env.NODE_ENV !== 'production';

export const devWarn = (...args: unknown[]): void => {
  if (isDev()) console.warn(...args);
};

export const devError = (...args: unknown[]): void => {
  if (isDev()) console.error(...args);
};
