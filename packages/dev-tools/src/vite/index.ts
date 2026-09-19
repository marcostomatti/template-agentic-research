/**
 * @packageDocumentation
 * The node entry of `@ar/dev-tools` — the `./vite` export, imported by a
 * consuming app's `vite.config.ts` and by nothing that ships to a
 * browser.
 *
 * This is the one layer allowed a node builtin, and the layering runs
 * one way only: `src/core/**` and `src/features/**` import nothing from
 * here, so a type both ends need is declared in the core and read here.
 * What it exports:
 *
 * - `devtoolsPlugin(options)` from `./plugin` — a Vite plugin for
 *   `serve` alone, defining the commit, branch and round the About
 *   surface shows, answering `GET /__devtools/status`, and accepting
 *   `POST /__devtools/report` behind a zod body schema, a same-origin
 *   check and a loopback check that only `allowLan` relaxes.
 * - `assembleDevTools(options, deps)` beside it, the injected seam the
 *   plugin is a thin shell over: the filesystem, the clock, the command
 *   runner and the environment are arguments there, so a consumer that
 *   wants the middleware without Vite — or a test — builds one without
 *   spawning `git` or writing a file.
 * - The `ReportGateway` interface (`file`, `search`, `comment`),
 *   declared with no implementation; the feedback plan supplies one.
 *
 * Nothing under `src/vite/` is bundled into the browser entries: the
 * build externalises every `node:` builtin, and `postbuild` fails on
 * either `node:` or `child_process` reaching `dist/index.js`.
 */

export type {
  DevToolsMiddleware,
  DevToolsStatusBody,
  DevToolsStoredBody,
} from './endpoint';
export type {
  DevToolsEndpointRule,
  DevToolsIncoming,
  DevToolsOutgoing,
  DevToolsRefusalBody,
} from './http';
export type {
  ReportGateway,
  ReportGatewayCommentOutcome,
  ReportGatewayDuplicate,
  ReportGatewayFileOutcome,
  ReportGatewayFiled,
  ReportGatewayIssue,
  ReportGatewayMatches,
  ReportGatewayRefusal,
  ReportGatewaySearchOutcome,
} from './gateway';
export type {
  DevToolsAssembly,
  DevToolsPluginDeps,
  DevToolsPluginOptions,
} from './plugin';
export type { DevToolsReport } from './report';
export type { DevToolsStoredReport } from './store';

export {
  DEVTOOLS_REPORT_PATH,
  DEVTOOLS_STATUS_PATH,
} from './endpoint';
export { DEVTOOLS_BODY_BYTES_MAX } from './http';
export {
  DEVTOOLS_ALLOW_LAN_ENV_NAME,
  DEVTOOLS_PLUGIN_NAME,
  assembleDevTools,
  devtoolsPlugin,
} from './plugin';
export { DEVTOOLS_DEFAULT_OUT_DIR } from './store';
