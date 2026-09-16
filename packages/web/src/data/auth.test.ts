import { afterEach, describe, expect, it, vi } from 'vitest';

import * as auth from './auth';
import * as httpAuth from './http/auth';

// The selector, from both sides of its one switch. The statically
// imported `auth` above is the module as the unit suite loads it — no
// `VITE_AR_API_URL` in the environment, so the fixture side — and each
// case that wants the other side loads a FRESH copy of both modules
// after stubbing the variable, because the selection is made once at
// import and a stub applied afterwards would reach nothing.
//
// Identity is the assertion on the API side: an export that merely
// BEHAVES like `./http/auth.ts`'s call would pass a behavioural check
// while coming from somewhere else.

/** Load the selector and the HTTP layer under one `VITE_AR_API_URL`. */
const freshLayers = async (apiUrl: string | undefined) => {
  vi.resetModules();
  vi.stubEnv('VITE_AR_API_URL', apiUrl);

  return {
    selector: await import('./auth'),
    http: await import('./http/auth'),
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('fixture mode', () => {
  it('answers no logout call with the variable unset', async () => {
    // Arrange
    const { selector } = await freshLayers(undefined);

    // Assert
    expect(selector.logout).toBeUndefined();
  });

  it('answers no auth probe with the variable unset', async () => {
    // Arrange
    const { selector } = await freshLayers(undefined);

    // Assert
    expect(selector.probeAuth).toBeUndefined();
  });

  it('reports the fixture mode with the variable unset', async () => {
    // Arrange
    const { selector } = await freshLayers(undefined);

    // Assert
    expect(selector.authMode).toBe('fixture');
  });

  it('answers the unit suite\'s own import from the fixture side', async () => {
    // Asserted on the STATIC import rather than a reloaded one: a
    // `VITE_AR_API_URL` in the environment or in a `.env` file would
    // move this package's whole fixture suite onto the HTTP layer, and
    // this is the case that would say so.
    // Assert
    expect(auth.authMode).toBe('fixture');
    expect(auth.logout).toBeUndefined();
    expect(auth.probeAuth).toBeUndefined();
  });
});

describe('API mode', () => {
  it('takes the logout call from the HTTP layer with a base URL set', async () => {
    // The control for the fixture cases: the same two exports, answered
    // the other way, so a selector wired to one side unconditionally
    // fails one of the two describes.
    // Arrange
    const { selector, http } = await freshLayers('http://service.test');

    // Assert
    expect(selector.logout).toBe(http.logout);
  });

  it('takes the auth probe from the HTTP layer with a base URL set', async () => {
    // Arrange
    const { selector, http } = await freshLayers('http://service.test');

    // Assert
    expect(selector.probeAuth).toBe(http.probeAuth);
  });

  it('reports the API mode with a base URL set', async () => {
    // Arrange
    const { selector } = await freshLayers('http://service.test');

    // Assert
    expect(selector.authMode).toBe('api');
  });

  it('takes the HTTP layer for the empty string, which is same-origin', async () => {
    // The production value of a `/app` build. A falsy test in the
    // selector would leave that build with no way to sign out.
    // Arrange
    const { selector, http } = await freshLayers('');

    // Assert
    expect(selector.authMode).toBe('api');
    expect(selector.logout).toBe(http.logout);
    expect(selector.probeAuth).toBe(http.probeAuth);
  });

  it('answers the same bindings the statically imported layer exports', async () => {
    // The near-miss identity alone cannot catch: `freshLayers` reloads
    // BOTH modules, so a selector that re-exported its own copy of the
    // HTTP layer would still match the copy compared against it. The
    // statically imported `httpAuth` is a third instance, and the
    // names are what survive a reload.
    // Arrange
    const { selector } = await freshLayers('');

    // Assert
    expect(selector.logout?.name).toBe(httpAuth.logout.name);
    expect(selector.probeAuth?.name).toBe(httpAuth.probeAuth.name);
  });
});
