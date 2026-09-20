/**
 * @packageDocumentation
 * The browser entry point: the providers the app runs under, and the
 * only module in this package that touches the DOM directly.
 *
 * Nothing here is app logic. The chrome, the surfaces and the fixture
 * data layer are all reached through the router, so this file's whole
 * job is to establish the context they need before the first render:
 *
 * 1. `StrictMode`, so React double-invokes renders and effects in
 *    development and a component holding state it should not is loud
 *    rather than subtly wrong.
 * 2. `QueryProvider` from `@ar/ui/cache`, which owns the query client
 *    every `useCache` read in `../data/hooks` resolves against.
 * 3. `AppErrorBoundary` from `../app-shell/AppErrorBoundary`, with
 *    `CrashFallback` as its fallback, so a render failure anywhere
 *    below leaves a screen standing instead of a blank document.
 * 4. `RouterProvider`, which mounts the layout route and everything
 *    below it.
 *
 * ## Why the cache sits ABOVE the router
 *
 * The nesting is load-bearing rather than stylistic. `QueryProvider`
 * holds one query client for the life of the tab, so a navigation
 * between surfaces — or across the two route bases — leaves the cache
 * standing, and a surface an operator returns to renders from memory
 * while it revalidates. Nested the other way the client would sit
 * inside the tree the router swaps, and every read would start cold.
 *
 * That is invisible against the fixture accessors, which resolve on a
 * microtask, and it is the whole point once the API swap re-points
 * them at HTTP.
 *
 * ## Why the boundary sits BETWEEN the cache and the router
 *
 * `AppErrorBoundary` is nested at exactly one depth, and both of its
 * neighbours are chosen rather than incidental.
 *
 * BELOW the cache, because a reset must not discard it. The
 * boundary's `reset` clears its own caught state and nothing else, so
 * everything ABOVE it survives the retry — and the query client is
 * the one thing in this tree with a tab's worth of read state in it.
 * Nested the other way, the provider would sit inside the subtree the
 * boundary swaps out and back, and every "try again" would remount it
 * with an empty cache: the retry would be indistinguishable from the
 * reload button beside it, and the primary control on `CrashFallback`
 * would be the expensive one. Below the cache, "try again" re-renders
 * the failing surface against everything the tab has already read.
 *
 * ABOVE the router, and it is NOT what catches a surface. A data
 * router catches a render error from any route element itself and
 * draws the nearest route `ErrorBoundary`, so a throw from a surface,
 * a modal sub-route or the layout chrome never travels this far —
 * measured: before the route tree declared one, the dev-only crash
 * route drew react-router's default error screen and this boundary
 * saw nothing. `../app-shell/RouteErrorBoundary.tsx`, declared on
 * every top-level route in `./routes/router.tsx`, is what covers the
 * route tree. This boundary covers what is left: a throw from the
 * router component itself or from anything between it and the cache.
 * Both draw the same `CrashFallback` and publish the same signal.
 *
 * It sits BELOW `StrictMode` for the same reason everything else
 * does: `StrictMode` is not a runtime provider and catches nothing.
 * Note that its development double-invocation re-throws a caught
 * error to `window` as well — see `../app-shell/AppErrorBoundary.tsx`
 * — so a healthy fallback still prints an uncaught error on the
 * development console.
 *
 * ## Why the router is built here
 *
 * `createBrowserRouter` reaches for `document` when it is CALLED, so
 * `./routes/router` exports the route tree as data plus a factory,
 * rather than a router. This module is the one place guaranteed to be
 * running in a browser, which makes it the right caller — and it is
 * what keeps the route tree importable from the node unit suite, where
 * `matchRoutes` is the only verification seam a route tree has.
 *
 * The factory is called at module scope. `render` runs once below, so
 * an inline call would behave identically; naming the router keeps the
 * mount a plain description of what the app is wrapped in.
 *
 * ## Why the dev-tools widget is started dynamically, and guarded
 *
 * `./dev/devtools` is reached at the bottom of this file by a DYNAMIC
 * import behind `import.meta.env.DEV`, after the root has rendered.
 * All three of those — dynamic, guarded, last — answer different
 * questions, and none of them is stylistic.
 *
 * GUARDED is what decides whether the widget runs. `import.meta.env.DEV`
 * is one of Vite's own substitutions rather than a runtime lookup, so a
 * production build has the literal `false` here and the block below is
 * a branch nothing can enter.
 *
 * DYNAMIC is what decides whether the widget SHIPS. A static `import`
 * is hoisted and evaluated before any statement of this module runs, so
 * the guard would gate the call while the module — and everything
 * `@ar/dev-tools` pulls in with it — was already in the bundle and
 * already executed for its side effects. Only the dynamic form leaves
 * the specifier inside the dead branch, which is the whole reason
 * `@ar/dev-tools` can be a devDependency of this package rather than a
 * dependency.
 *
 * That is a claim about the BUILT bundle, and reading the line below is
 * not evidence for it: whether a bundler drops a dead-branch dynamic
 * import, or keeps it as a separate chunk nothing loads, is the
 * bundler's decision and not this file's. Measured against a real
 * `vite build` (vite 8.3.0 over rolldown 1.2.8), the branch is dropped
 * BEFORE the specifier is resolved: with `@ar/dev-tools`'s
 * `dist/index.js` moved aside the build still exits `0` and emits a
 * byte-identical main chunk, while the same build with the guard below
 * forced to `true` fails with `Rolldown failed to resolve import
 * "@ar/dev-tools"`. Nothing of the package reaches `dist/`.
 *
 * The reading that settles it is NOT a grep of `dist/` for the
 * specifier. Vite rewrites a bare specifier to a resolved path, so
 * `@ar/dev-tools` is absent from the output whether or not the package
 * shipped — `0` hits under both builds, which makes that grep
 * a false negative rather than evidence. What discriminates is a
 * literal only the package holds, the About popover's title `About`:
 * `0` hits in the shipped build, `2` with the guard forced, both of
 * those inside a `dist/assets/devtools-*.js` chunk no shipped build
 * emits.
 *
 * The grep to NOT reach for is the bare substring `devtools`, which
 * hits a clean build and reads as a leak. React ships its own
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__` identifier, and the browser scheme
 * allow-list carries the literal `devtools:` — neither has anything
 * to do with `@ar/dev-tools`. The four literals that discriminate are
 * `About`, `mountDevTools`, `data-devtools-root` and
 * `__DEVTOOLS_COMMIT__`, all `0` in the shipped build. Pair them with
 * a planted control over something the bundle certainly holds
 * (`Agentic Research`, from `index.html`'s title, reads `1`) so a
 * row of zeros is a reading rather than a grep that matched nothing
 * because `dist/` was stale or the path was wrong.
 *
 * LAST is about what a failure can cost. The import resolves on a later
 * microtask, so no part of the dev tools is on the path to the first
 * paint, and a dev-tools module that throws while loading rejects a
 * promise the app has already stopped depending on rather than taking
 * the bootstrap with it. The rejection is caught for exactly that
 * reason and reported rather than swallowed: the app is standing, and a
 * development widget that did not start is a line on the console.
 *
 * ## Theme
 *
 * Not owned here. `data-theme` is written by `useTheme` from the
 * topbar, which is also what renders the control that changes it —
 * see `../app-shell/theme.ts` on why the resolver and the hook are
 * split.
 */

import type { ReactNode } from 'react';

import { QueryProvider } from '@ar/ui/cache';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AppErrorBoundary } from './app-shell/AppErrorBoundary';
import { CrashFallback } from './app-shell/CrashFallback';
import { createAppRouter } from './routes/router';

import './styles.css';

/**
 * The mount point `index.html` provides.
 *
 * Named because it is spelled twice — once to find the node and once in
 * the message reporting that it was not there.
 */
const ROOT_ELEMENT_ID = 'root';

const rootElement = document.getElementById(ROOT_ELEMENT_ID);
if (rootElement == null) {
  throw new Error(`Root element #${ROOT_ELEMENT_ID} not found`);
}

const router = createAppRouter();

/**
 * Draw the crash screen for whatever the boundary caught.
 *
 * Module scope so the prop is one stable value: `AppErrorBoundary`
 * takes a FUNCTION rather than an element because only the boundary
 * knows the thrown value and how to put the children back, and this
 * adapter is the whole of what that costs here.
 *
 * @param error - Whatever was thrown, unreduced.
 * @param reset - The boundary's retry, bound to the primary control.
 * @returns The fallback screen.
 */
const renderCrashFallback = (
  error: unknown,
  reset: () => void,
): ReactNode => <CrashFallback error={error} reset={reset} />;

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <AppErrorBoundary fallback={renderCrashFallback}>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </QueryProvider>
  </StrictMode>,
);

if (import.meta.env.DEV) {
  void import('./dev/devtools')
    .then(({ startDevTools }) => {
      startDevTools();
    })
    .catch((error: unknown) => {
      console.error('Dev tools did not start.', error);
    });
}
