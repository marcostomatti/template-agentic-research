/**
 * @packageDocumentation
 * What `./crashRoute.tsx` can be held to with no browser: the thrown
 * message, the shape of the route it registers, and the two
 * properties the production drop rests on.
 *
 * ## Why a `.test.ts` can reach a `.tsx` at all
 *
 * `vitest.config.ts` collects `src/**` for `.test.ts` files only, by
 * the two-runner discipline `tests/README.md` states, and the module
 * under test builds no element and touches no DOM — its one import is
 * a TYPE. So it loads unmodified under this package's
 * `environment: 'node'` project, exactly as `../app-shell/
 * CrashFallback.test.ts` loads the fallback it renders to a string.
 *
 * The component is CALLED here rather than rendered. A function
 * component with no hooks that throws before returning needs no
 * renderer to prove it throws, and what the throw does once React is
 * committing — `componentDidCatch`, the `error` publish, the fallback
 * — belongs to the forced Playwright spec and to the default suite's
 * control case. Nothing here mounts anything.
 *
 * ## Why the throw case runs first
 *
 * This package's law orders refusal cases before accepting ones. The
 * throw IS this module's refusal — the route refuses to render, which
 * is its entire reason to exist — so it is read before anything about
 * the registration is.
 *
 * ## What the last case reads, and what it cannot
 *
 * `../routes/router.tsx` spreads the factory in behind
 * `import.meta.env.DEV`, and this runner IS a DEV build: vitest
 * defines `import.meta.env.DEV` as `true` (measured, alongside
 * `MODE: 'test'`). So `matchRoutes` over `ROUTES` here reads the tree
 * a `bun run dev` and both Playwright fixture suites get, and the
 * case below is the only offline reading that the wiring happened at
 * all — the rest of this file reads the factory in isolation and
 * would pass just as well if nothing called it.
 *
 * The opposite reading — that a PRODUCTION tree carries no such route
 * — cannot be taken from any runner, because no runner here builds
 * one. That half is a grep over a real `vite build`'s `dist/`, taken
 * against the planted `Agentic Research` control and recorded in
 * `.rafa/plans/CLOSEOUT-q20b-3-error-boundary-provider.md`.
 */

import type { RouteObject } from 'react-router';

import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '../routes/router';

import { DEV_CRASH_MESSAGE, DEV_CRASH_PATH, devRoutes } from './crashRoute';

/**
 * The route the factory answers, read as one object.
 *
 * Every case below reads the REGISTERED route rather than an export
 * of its own, so a component that stopped being the one the router
 * mounts cannot pass here.
 *
 * @returns The single dev-only route.
 */
const onlyRoute = (): RouteObject => {
  const routes = devRoutes();

  expect(routes).toHaveLength(1);

  return routes[0] as RouteObject;
};

describe('the dev-only crash route', () => {
  it('throws the message the report is read for when rendered', () => {
    // Arrange
    const { Component } = onlyRoute();

    // Act / Assert
    expect(Component).toBeTypeOf('function');
    expect(() => (Component as () => unknown)()).toThrow(DEV_CRASH_MESSAGE);
  });

  it('registers the path RELATIVE, so both bases can carry it', () => {
    // An absolute child path that does not extend its parent's is a
    // throw when the router is created, not a route that fails to
    // match — and `/__devtools/crash` does not extend `/d/:domainSlug`.
    // Arrange / Act
    const { path } = onlyRoute();

    // Assert
    expect(path).toBe('__devtools/crash');
    expect(path?.startsWith('/')).toBe(false);
  });

  it('names the same address the specs drive, absolute', () => {
    // Arrange / Act
    const { path } = onlyRoute();

    // Assert
    expect(DEV_CRASH_PATH).toBe('/__devtools/crash');
    expect(DEV_CRASH_PATH).toBe(`/${path ?? ''}`);
  });

  it('builds no element, which is what lets the bundle drop it', () => {
    // `element` would be a `jsx()` call at module scope, and rolldown
    // cannot see a call as side-effect-free — so the module would load
    // in a production bundle even with the DEV branch folded away.
    // Arrange / Act
    const route = onlyRoute();

    // Assert
    expect(route.element).toBeUndefined();
    expect(Object.keys(route).sort()).toEqual(['Component', 'path']);
  });

  it('answers a fresh route object per call, per base', () => {
    // `RouteObject` is mutable and both bases spread this factory in,
    // which is the same reason `../routes/router.tsx` rebuilds its own
    // children per call.
    // Arrange / Act
    const first = onlyRoute();
    const second = onlyRoute();

    // Assert
    expect(first).not.toBe(second);
    expect(devRoutes()).not.toBe(devRoutes());
  });

  it('is matched under both bases in a DEV tree', () => {
    // Arrange
    const paths = [
      DEV_CRASH_PATH,
      `/d/example-tech-radar${DEV_CRASH_PATH}`,
    ];

    // Act
    const leaves = paths.map((path) => {
      const matches = matchRoutes(ROUTES, path) ?? [];

      return matches.at(-1)?.route.Component;
    });

    // Assert
    expect(leaves).toEqual([onlyRoute().Component, onlyRoute().Component]);
  });
});
