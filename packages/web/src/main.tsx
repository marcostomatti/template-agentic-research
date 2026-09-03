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
