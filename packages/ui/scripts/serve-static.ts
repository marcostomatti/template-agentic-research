/**
 * Minimal static file server on Bun.serve — replaces http-server in the
 * visual suite: http-server's `union` dependency monkey-patches node HTTP
 * internals and crashes under bun-on-Linux (the CI runner), and bun is the
 * one runtime guaranteed everywhere this pipeline runs.
 *
 *   bun scripts/serve-static.ts [dir=storybook-static] [port=6016]
 */
const dir = process.argv[2] ?? 'storybook-static';
const port = Number(process.argv[3] ?? 6016);

Bun.serve({
  port,
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    const file = Bun.file(`${dir}${path === '/' ? '/index.html' : path}`);
    if (await file.exists()) return new Response(file);
    return new Response('not found', { status: 404 });
  },
});

console.log(`serving ${dir} on http://127.0.0.1:${port}`);
