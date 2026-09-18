/**
 * @packageDocumentation
 * The browser entry of `@ar/dev-tools` — the `.` export, and everything
 * a consuming app and a feature author are allowed to reach.
 *
 * This module is a placeholder for the skeleton stage. It exists so the
 * multi-entry lib build has an entry to emit, so the `postbuild` leak
 * grep has a `dist/index.js` to read, and so the root `--filter '@ar/*'`
 * fan-outs can be proved to collect this package before any behaviour
 * depends on it. Everything below arrives in a later stage and replaces
 * the placeholder export:
 *
 * - `mountDevTools(config)` from `./core/mount` — the automation guard,
 *   the sibling React root appended to `document.body` and the disposer
 *   its call returns.
 * - The feature contract: `DevToolsFeature` and `DevToolsHost`, the only
 *   surface a feature may reach. A feature imports no shell state and no
 *   other feature.
 * - `devtoolsBus` and its topic types from `./core/bus` — the pure
 *   pub/sub the app tells the widget things through. Producers arrive in
 *   a later plan.
 * - The settings types (`Size`, `Corner`) that name what persists under
 *   the one storage key this package reads, `devtools.settings`.
 *
 * Nothing here may import a node builtin: this bundle runs in the
 * browser, the eslint layering rule refuses `node:*` and `child_process`
 * under every path but `src/vite/**`, and `postbuild` fails the build on
 * the same two strings reaching the emitted file.
 */

/**
 * Placeholder export naming this entry, so the skeleton build emits a
 * non-empty `dist/index.js` for the leak grep to read. Removed when
 * `mountDevTools` and the feature contract land.
 */
export const DEVTOOLS_BROWSER_ENTRY = 'devtools:browser' as const;
