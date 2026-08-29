import { defineConfig } from 'vitest/config';

// The unit suite is node-only on purpose: it covers the app's PURE modules
// (route helpers, fixture accessors, filter derivations), which is why the
// include is `.ts` and not `.ts{,x}` — anything needing a DOM belongs to the
// Playwright suite under `tests/e2e/`, not to a jsdom shim here.
//
// Tests are colocated beside the module they cover rather than gathered in a
// `__tests__` directory (the `@ar/ui` convention), so the include is a plain
// recursive glob over `src/`. See `tests/README.md` for the two-runner split.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
