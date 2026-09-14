import { defineConfig } from 'vitest/config';

// Root config covers tools/ <!-- doc-links-skip: tools/ralph/ -- retired during rafa cutover, loop moved to @open-tomato/rafa --> (the task loop).
// Package suites run through their own configs via `bun run test:all`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/**/*.test.ts'],
  },
});
