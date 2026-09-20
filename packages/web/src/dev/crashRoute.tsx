/**
 * @packageDocumentation
 * The one address in this app that throws on render, and the only
 * trigger `../app-shell/AppErrorBoundary.tsx` has.
 *
 * Nothing else in the app fails on demand, so without this route the
 * boundary, `../app-shell/CrashFallback.tsx` and the bridge's `error`
 * republish could only ever be read by breaking a real surface. The
 * forced Playwright spec drives {@link DEV_CRASH_PATH} instead: the
 * fallback draws, the widget beside it stays up, and "report this"
 * files a report carrying {@link DEV_CRASH_MESSAGE}.
 *
 * ## Why it is a STATIC import, under `src/dev/`
 *
 * Every other module in this directory is reached only through
 * `../main.tsx`'s `import.meta.env.DEV` DYNAMIC import, which resolves
 * on a microtask after the root has rendered. A route cannot arrive
 * then: `../main.tsx` builds the router at module scope through
 * `createAppRouter()`, and the tree that call reads is fixed before
 * the first paint. So `../routes/router.tsx` imports this module
 * SYNCHRONOUSLY and spreads {@link devRoutes} into its per-base
 * children behind `import.meta.env.DEV`.
 *
 * That static edge is why this file may import nothing that the rest
 * of `src/dev/` imports freely. The plan's constraint bans a module
 * reachable from `../main.tsx` outside the DEV dynamic import from
 * reaching `@ar/dev-tools`; it does not ban reaching `src/dev/`. This
 * module therefore has ONE import, and it is a type — `RouteObject`,
 * erased at build — so there is no runtime edge from the router into
 * this directory at all. Nothing here names the bus, a feature id or
 * an endpoint.
 *
 * ## Why no element is built at module scope
 *
 * Whether a DEV-guarded route survives into a production bundle is
 * the BUNDLER's decision, not the source's: rolldown drops the import
 * only while it can see this module does nothing when evaluated. Two
 * consts, a template literal and two function declarations is all of
 * it — the route object and the segment are both built INSIDE
 * {@link devRoutes}, and the component is handed over as `Component`
 * rather than as an `element`, so no `jsx()` call and no `.slice()`
 * ever runs while this module loads.
 *
 * The claim is not taken on trust. The task that added this file
 * grepped a real `vite build`'s `dist/` for `__devtools/crash` against
 * the planted `Agentic Research` control, and both counts are in
 * `.rafa/plans/CLOSEOUT-q20b-3-error-boundary-provider.md`. The
 * recorded fallback, had the literal shipped, was to give
 * `createRoutes` a `devRoutes` option and pass it from `../main.tsx`'s
 * DEV branch.
 *
 * ## Why the registered path is RELATIVE
 *
 * {@link devRoutes} is spread into the children of BOTH bases, and
 * react-router refuses an absolute child path that is not prefixed by
 * its parent's — under `/d/:domainSlug` a `/__devtools/crash` child is
 * a throw when the router is created, not a route that fails to
 * match. So the segment is registered without its leading slash and
 * resolves against whichever base matched, exactly as the index
 * redirect does. {@link DEV_CRASH_PATH} is the absolute form under
 * the single-domain base: the address a spec drives, and the literal
 * the bundle is grepped for.
 */

import type { RouteObject } from 'react-router';

/**
 * The crash route's segment, relative to the base it hangs under.
 *
 * The single spelling of the path in this app. {@link DEV_CRASH_PATH}
 * is built from it rather than beside it, so the absolute address a
 * spec drives and the pattern the router registers cannot drift.
 */
const DEV_CRASH_SEGMENT = '__devtools/crash';

/**
 * The address the crash route answers at under the single-domain base.
 *
 * `packages/dev-tools/src/vite/endpoint.ts` routes on an exact-pathname
 * map holding `/__devtools/status`, `/__devtools/templates`,
 * `/__devtools/report` and `/__devtools/comment`, and calls `next()`
 * for every pathname it has no entry for — so this one falls through
 * the plugin middleware to the SPA on both dev servers and is matched
 * by the app's own tree. The prefix is shared with those endpoints on
 * purpose: one namespace says "development only" for everything the
 * dev tools own, wherever it is served from.
 */
export const DEV_CRASH_PATH = `/${DEV_CRASH_SEGMENT}`;

/**
 * What the crash route throws.
 *
 * Exported because it is read back downstream rather than only
 * thrown: the forced Playwright spec asserts this sentence reaches the
 * feedback drawer's context block, which is the whole seam under test
 * — the boundary caught it, `appSignals` carried it, the bridge
 * republished it and `recent('error', 5)` answered it. A message
 * spelled twice would let that chain break while the spec stayed
 * green.
 */
export const DEV_CRASH_MESSAGE
  = 'Deliberate crash from the dev-only crash route.';

/**
 * The component the crash route renders, which never renders.
 *
 * A throw during render is what `../app-shell/AppErrorBoundary.tsx`
 * catches — `componentDidCatch` is a commit-phase hook, so the throw
 * has to come from a component inside the boundary rather than from a
 * loader or an event handler, neither of which React boundaries see.
 *
 * Declared here and handed to the route as `Component`, so the only
 * thing that ever builds an element out of it is the router, at match
 * time.
 */
/* eslint-disable-next-line react-refresh/only-export-components --
   this file's exports are a path, a message and a route factory, and
   the component is deliberately NOT one of them; fast refresh has
   nothing to preserve in a component whose every render throws. */
const DevCrashRoute = (): never => {
  throw new Error(DEV_CRASH_MESSAGE);
};

/**
 * The routes a DEV build carries below every base, and a production
 * build carries none of.
 *
 * A FACTORY rather than a constant array, for the reason
 * `../routes/router.tsx`'s own `routesBelowBase` is one: `RouteObject`
 * is mutable, and the two bases each spread this in, so a shared route
 * object would be one edit away from two trees that disagree. Each
 * call answers fresh objects in a fresh array.
 *
 * It is also what keeps this module free of module-scope work — see
 * the header — so the import `../routes/router.tsx` holds can be
 * dropped whole from a production bundle.
 *
 * @returns One route per dev-only address, relative to its base.
 */
export const devRoutes = (): RouteObject[] => [
  { path: DEV_CRASH_SEGMENT, Component: DevCrashRoute },
];
