import type { PluginOption, UserConfig } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PORT = 3000;
const DEFAULT_BASE_PATH = '/';

/**
 * The issue forms the feedback drawer serves, as paths relative to THIS
 * package — `devtoolsPlugin`'s own `templates` option reads a relative
 * path against the cwd of the process running the dev server, which is
 * `packages/web` and never the repo root.
 *
 * Left unstated, the plugin falls back to its own default —
 * `.github/ISSUE_TEMPLATE` resolved against that same cwd — which
 * exists nowhere under this package. Measured against a plain
 * `bun x vite`: `GET /__devtools/templates` answered `[]`, so the
 * report-type select drew disabled and the drawer no form at all. The
 * two paths below are the repo's actual issue forms, named in the order
 * `./templates.ts` would otherwise sort a directory listing into, so a
 * `bun run dev` here draws the same two rows a full directory read would
 * have served.
 */
const DEVTOOLS_ISSUE_TEMPLATE_PATHS: readonly string[] = [
  '../../.github/ISSUE_TEMPLATE/bug-report.yml',
  '../../.github/ISSUE_TEMPLATE/ui-feedback.yml',
];

/**
 * The dev-tools plugin under `serve`, and nothing under `build`.
 *
 * The specifier is only ever resolved on the `serve` path, so a checkout
 * (or an image stage) holding no built `@ar/dev-tools` can still build.
 * Both names come out of that one import: the plugin, and the
 * `rafaGateway` it files a stored report through — which is also
 * CONSTRUCTED here, inside the `serve` branch, so a build prepares no
 * gateway at all.
 */
const loadDevtoolsPlugins = async (
  command: 'build' | 'serve',
): Promise<PluginOption[]> => {
  if (command !== 'serve') {
    return [];
  }
  const { devtoolsPlugin, rafaGateway } = await import('@ar/dev-tools/vite');
  return [devtoolsPlugin({
    gateway: rafaGateway(),
    templates: DEVTOOLS_ISSUE_TEMPLATE_PATHS,
  })];
};

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  // `loadEnv` with an empty prefix also reads the non-`VITE_` keys, so one
  // read covers both the dev-only `AR_API_PORT` and the exposed
  // `VITE_AR_BASE_PATH`.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const apiPort = env.AR_API_PORT?.trim() || String(DEFAULT_API_PORT);

  return {
    // `base` is build-time on purpose: Vite bakes it into every asset URL it
    // emits, so the mount point has to be known when the bundle is written
    // and cannot be read from `import.meta.env` at runtime. The SPA is served
    // under `/app`, so a deployed build sets `VITE_AR_BASE_PATH=/app/`; the
    // default `/` keeps the dev server and the fixture suites at the root.
    base: env.VITE_AR_BASE_PATH?.trim() || DEFAULT_BASE_PATH,
    // `@ar/dev-tools/vite` is imported DYNAMICALLY and only under `serve`.
    // A static import is resolved when this file is LOADED, which happens
    // under `vite build` too — and the Docker `web` stage copies only the
    // dev-tools manifest, never its `dist/`, so a static import fails the
    // image build with ERR_MODULE_NOT_FOUND before any plugin filter runs.
    // The plugin's own `apply: 'serve'` cannot help: it is read after the
    // import has already resolved. Under `vite build` the plugin is absent,
    // its three `__DEVTOOLS_*__` defines do not exist, and neither
    // `/__devtools` endpoint is registered — which is why
    // `src/dev/devtools.ts` reads all three defines behind `typeof` guards.
    //
    // The GATEWAY is held to the same rule, for the same reason and for
    // one of its own. `rafaGateway` is an export of that one node entry,
    // so naming it in a static import resolves `@ar/dev-tools/vite`
    // exactly as importing the plugin would: resolution happens when
    // this file is LOADED, and using the value only under `serve`
    // changes nothing about when its module is fetched. Its own
    // implementation is the second reason — it runs the `rafa` binary
    // through `node:child_process`, so a static import would pull a
    // process-spawning runner into the config graph of a build whose
    // whole job is to file nothing and reach nothing. Both names are
    // therefore taken from the dynamic import above.
    plugins: [react(), tailwindcss(), ...(await loadDevtoolsPlugins(command))],
    server: {
      proxy: {
        // The target is loopback, never `localhost`: `localhost` resolves to
        // `::1` first on this platform, and the service binds IPv4, so the
        // name form intermittently proxies to a closed port. It is also a
        // dev-only seam — the proxy keeps the browser same-origin so no CORS
        // preflight is involved in development.
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
          // The service mounts its routes at the root, so the `/api` prefix
          // that marks a request for proxying is stripped before forwarding.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
