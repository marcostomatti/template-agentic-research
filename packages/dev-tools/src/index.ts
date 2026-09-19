/**
 * @packageDocumentation
 * The browser entry of `@ar/dev-tools` — the `.` export, and the whole
 * of what a consuming app and a feature author are allowed to reach.
 *
 * Three things leave this file and nothing else does:
 *
 * - {@link mountDevTools}, which an app calls once and holds the
 *   disposer of. It appends the widget's own `<div
 *   data-devtools-root>` to `document.body` and renders into a React
 *   root of its own — decision 3 of
 *   `.rafa/specs/q20b-1-dev-tools-shell.md`, so an error escaping the
 *   app's root leaves the reporter standing.
 * - {@link devtoolsBus}, the pure pub/sub the app tells the widget
 *   things on. No producer exists in this plan.
 * - The feature contract, as types: what a {@link DevToolsFeature} is,
 *   what a {@link MenuItem} may be, and {@link DevToolsHost} — the ONE
 *   thing a feature may reach.
 *
 * ## The list is written out, and the omissions are deliberate
 *
 * `export *` would make the public surface whatever the core modules
 * happen to export today, and this package is ported to open-tomato as
 * a directory copy: what is exported here is what the port has to keep
 * working. So each name is listed, and the ones that are NOT listed
 * are internals a consumer has no business holding — the menu model,
 * the shell, the surfaces, the settings reader, the host builder and
 * the endpoint join. A feature needs none of them: it is handed a
 * {@link DevToolsHost} and reaches the outside through that.
 *
 * {@link createDevToolsBus} is absent for a sharper reason. The app
 * and the widget must be on the SAME bus for a published payload to
 * reach a feature, and the singleton is the thing that guarantees it;
 * exporting the factory would offer a second one that silently
 * delivers to nobody.
 *
 * {@link DevToolsDisposer} is exported although it is not part of the
 * contract block, because it is {@link mountDevTools}'s return type
 * and a caller storing one in a typed field cannot otherwise name it.
 *
 * ## Nothing here may import a node builtin
 *
 * This bundle runs in the browser. The eslint layering rule refuses
 * `node:*` and `child_process` under every path but `src/vite/**`, and
 * `package.json`'s `postbuild` greps the emitted `dist/index.js` for
 * the same two names — two readings of one rule, because a lint rule
 * covers the sources it is pointed at and the grep covers whatever
 * actually got bundled.
 *
 * The grep matches an IMPORT of either name — `from`, `import` or
 * `require`, then a quote — rather than the bare substring, and the
 * tightening was forced by this file rather than chosen. While this
 * entry was a placeholder, `dist/index.js` held almost nothing; the
 * commit that made it export {@link mountDevTools} pulled the whole
 * shell into the bundle, and `./core/MenuRow.tsx`'s `node` prop
 * emitted `{ node: e, ... }`, which the substring grep read as a
 * leaked builtin and failed the build over. Measured both ways after
 * the change: the real bundle matches nothing, and the five spellings
 * a bundled builtin can take — `from"node:fs"`, `from'node:path'`,
 * `import("node:os")`, `from"child_process"` and `require("node:fs")`
 * — all still fail it.
 */

export type {
  Corner,
  DevToolsBus,
  DevToolsBusTopic,
  DevToolsConfig,
  DevToolsFeature,
  DevToolsHost,
  DevToolsStatus,
  DrawerPlacement,
  MenuItem,
  Size,
  SurfaceMode,
  SurfaceProps,
} from './core/types';
export type { DevToolsDisposer } from './core/mount';

export { devtoolsBus } from './core/bus';
export { mountDevTools } from './core/mount';
