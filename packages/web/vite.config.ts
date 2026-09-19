import type { PluginOption, UserConfig } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PORT = 3000;
const DEFAULT_BASE_PATH = '/';

/**
 * The dev-tools plugin under `serve`, and nothing under `build`.
 *
 * The specifier is only ever resolved on the `serve` path, so a checkout
 * (or an image stage) holding no built `@ar/dev-tools` can still build.
 */
const loadDevtoolsPlugins = async (
  command: 'build' | 'serve',
): Promise<PluginOption[]> => {
  if (command !== 'serve') {
    return [];
  }
  const { devtoolsPlugin } = await import('@ar/dev-tools/vite');
  return [devtoolsPlugin()];
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
