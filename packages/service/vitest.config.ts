import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Vitest workers run in Node.js, where `Bun` is not defined. The polyfill
    // provides just enough Bun.serve surface for the MCP transport and health
    // server to run in tests.
    setupFiles: ['./tests/helpers/bun-polyfill.ts'],
    // File parallelism stays off at the CONFIG level, not on a script flag:
    // the live suite (tests/live/*.live.test.ts) truncates shared tables
    // between cases, and a flag-only guard stops protecting the moment
    // someone runs plain `vitest run` with the live env vars exported.
    fileParallelism: false,
  },
});
