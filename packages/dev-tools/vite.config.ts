import { resolve } from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

/**
 * Library build for `@ar/dev-tools`, shaped after `packages/ui/
 * vite.config.ts`: a multi-entry ES-only lib, `vite-plugin-dts` for the
 * declarations and `vite-plugin-static-copy` for the stylesheet.
 *
 * Two conventions here are load-bearing for `package.json`'s `exports`,
 * because a wrong `exports` path is resolved by consumers and never by
 * the build that wrote the files:
 *
 * - The JS filename comes from the lib entry KEY, so the keys are
 *   `index`, `feedback` and `vite` and the bundles are `dist/index.js`,
 *   `dist/feedback.js` and `dist/vite.js`.
 * - The declaration path comes from the SOURCE path, because
 *   `vite-plugin-dts` mirrors `src/`, so the types land at
 *   `dist/index.d.ts`, `dist/feedback/index.d.ts` and
 *   `dist/vite/index.d.ts`.
 *
 * No React plugin is registered: nothing here needs Fast Refresh, and
 * Vite's esbuild transform reads `jsx: "react-jsx"` from
 * `tsconfig.json`, so `.tsx` sources compile against the automatic
 * runtime on their own.
 */

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      tsconfigPath: './tsconfig.json',
    }),
    // The package carries exactly one stylesheet and never imports it
    // from JS, so it is copied rather than bundled: the consumer opts in
    // through the "./styles.css" export.
    //
    // The target is REQUIRED, not best-effort: with `src/styles.css`
    // absent the plugin fails the build with `Error: No file was found
    // to copy on src/styles.css src.` and `vite build` exits 1
    // (measured). That is the wanted shape — `package.json` exports
    // "./styles.css" as `./dist/styles.css`, and an export pointing at a
    // file no build wrote is resolved by consumers, never here.
    //
    // `stripBase` is not decoration either. Without it the plugin keeps
    // the matched path under `dest` and writes `dist/src/styles.css`,
    // which the build still reports as "Copied 1 items" and exits 0 over
    // (also measured) — the one failure mode of this target that is
    // silent.
    viteStaticCopy({
      targets: [
        { src: 'src/styles.css', dest: '.', rename: { stripBase: true } },
      ],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(rootDir, 'src/index.ts'),
        feedback: resolve(rootDir, 'src/feedback/index.ts'),
        vite: resolve(rootDir, 'src/vite/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // React and its DOM renderer are peers; zod, @floating-ui/dom,
      // @medv/finder and yaml are runtime dependencies the consumer
      // installs. Bundling any of them would ship a second copy into the
      // host app. Every `node:` builtin is external so the node entry
      // (`src/vite/`) resolves them at runtime instead of Rollup trying
      // to bundle them for a browser target.
      //
      // `yaml` is read by the node half only (`src/vite/`), so it is
      // external here AND refused by `package.json`'s `postbuild` leak
      // grep in both browser bundles: external keeps Rollup from
      // inlining it, the grep proves no browser entry imports it.
      // `@medv/finder` is the opposite case — browser-only, external so
      // the host app installs one copy.
      //
      // The subpath regexes are load-bearing, not tidiness: swapping
      // `/^react($|\/)/` for the bare string 'react' leaves
      // `react/jsx-runtime` unmatched, and the automatic runtime is then
      // bundled into the browser entry — measured at 8,542 B against
      // 455 B for the same sources with the regex.
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^zod($|\/)/,
        /^@floating-ui\/dom($|\/)/,
        /^@medv\/finder($|\/)/,
        /^yaml($|\/)/,
        /^node:/,
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
});
