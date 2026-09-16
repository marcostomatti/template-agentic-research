import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PORT = 3000;
const DEFAULT_BASE_PATH = '/';

export default defineConfig(({ mode }) => {
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
    plugins: [react(), tailwindcss()],
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
