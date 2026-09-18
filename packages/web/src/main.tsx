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
 * 3. `RouterProvider`, which mounts the layout route and everything
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
 * bundler's decision and not this file's. The reading that settles it
 * is a grep of `dist/` for the specifier, taken against a real `vite
 * build`.
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

import { QueryProvider } from '@ar/ui/cache';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

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

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
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
