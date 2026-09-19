import { defineConfig } from 'vitest/config';

// Two projects, because this package spans two runtimes and one runner
// cannot serve both. `src/core/**` and `src/features/**` ship to the
// browser and read `document`, `localStorage` and `navigator`, so they
// are collected under jsdom. `src/vite/**` is the node layer — the dev
// server plugin, its filesystem writes and its request refusals — and
// is collected under node, where a jsdom `window` would be a lie about
// the environment the plugin actually runs in.
//
// ## Why the jsdom include is `.ts` and never `.tsx`
//
// Two-runner discipline, as `packages/web/context/testing.md` states it
// for that package and this plan adopts unchanged: every decision lives
// in a `.ts` a vitest project collects, and a `.tsx` stays thin.
// Interaction — a click on the trigger, roving focus through the menu,
// Escape dismissing a surface — is proved by the forced Playwright spec
// against a real browser, not by a DOM-testing library driving jsdom.
//
// So the include is the enforcement, not a note about taste. Widening it
// to `.test.{ts,tsx}` would make a component test collectable, and the
// first one written would move a decision out of the pure module into
// the component and prove it against jsdom's approximation of a
// browser — exactly the split this package is shaped to avoid. jsdom is
// here for `document`-touching PURE modules (settings reading one
// storage key, positioning over a measured rect), not for rendering
// React.
//
// One thing jsdom does NOT give this package is `localStorage`. Node 25
// ships a built-in Web Storage global, vitest's jsdom environment leaves
// it in place rather than replacing it with jsdom's, and started without
// `--localstorage-file` that object is a husk: `getItem` is `undefined`
// and `localStorage.clear()` reds with `localStorage.clear is not a
// function` under BOTH projects below (measured). So
// `src/core/settings.test.ts` installs a Map-backed store of its own per
// case, and a later file that needs storage has to do the same.
//
// `passWithNoTests` is set ONCE at the root and not inside either
// project, because it is a root-only option: vitest 4.1.11 types a
// project entry as `ProjectConfig`, which does not carry it, and `tsc`
// refuses the same key there with `Object literal may only specify known
// properties, and 'passWithNoTests' does not exist in type
// 'ProjectConfig'` (measured). It is on because the skeleton stage has
// no test file yet and `vitest run` otherwise prints `No test files
// found, exiting with code 1`, which would red the root `test:all`
// fan-out. It is a debt: the Core stage lands `settings.test.ts` and
// `bus.test.ts` under the jsdom project and the plugin cases under the
// node one, and once both projects collect files this flag can go. While
// it is set, a mis-typed include reads as a pass rather than as a
// failure.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/{core,features}/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/vite/**/*.test.ts'],
        },
      },
    ],
  },
});
