/**
 * @packageDocumentation
 * The node entry of `@ar/dev-tools` — the `./vite` export, imported by a
 * consuming app's `vite.config.ts` and by nothing that ships to a
 * browser.
 *
 * This is the one layer allowed a node builtin, and the layering runs
 * one way only: `src/core/**` and `src/features/**` import nothing from
 * here, so a type both ends need is declared in the core and read here.
 * A placeholder for the skeleton stage; it gains:
 *
 * - `devtoolsPlugin(options)` from `./plugin` — a Vite plugin for
 *   `serve` alone, defining the commit, branch and round the About
 *   surface shows, answering `GET /__devtools/status`, and accepting
 *   `POST /__devtools/report` behind a zod body schema, a same-origin
 *   check and a loopback check that only `allowLan` relaxes.
 * - The `ReportGateway` interface (`file`, `search`, `comment`),
 *   declared with no implementation; the feedback plan supplies one.
 *
 * Nothing under `src/vite/` is bundled into the browser entries: the
 * build externalises every `node:` builtin, and `postbuild` fails on
 * either `node:` or `child_process` reaching `dist/index.js`.
 */

/**
 * Placeholder export naming this entry, so the skeleton build emits a
 * non-empty `dist/vite.js` and the `./vite` export resolves to a file
 * the build actually wrote. Removed when `devtoolsPlugin` lands.
 */
export const DEVTOOLS_VITE_ENTRY = 'devtools:vite' as const;
