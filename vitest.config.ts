import { defineConfig } from 'vitest/config';

// Root config covers tools/ (repo-local tooling such as the control-byte gate).
// Package suites run through their own configs via `bun run test:all`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/**/*.test.ts'],
  },
});
