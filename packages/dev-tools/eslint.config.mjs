import baseConfig from '@open-tomato/eslint-config';
import reactConfig from '@open-tomato/eslint-config/react';
import viteConfig from '@open-tomato/eslint-config/vite';

// Decision 1's layering, encoded once so a message is authored in one place.
//
// The browser layer is everything under src/ except src/vite/**: the two
// browser entries (src/index.ts, src/features/feedback/index.ts) plus
// src/core/** and src/features/**. src/vite/** is the node layer and is the one place a
// builtin is allowed.
const NODE_BUILTIN_PATTERNS = [
  {
    group: ['node:*', 'node:*/*'],
    message:
      'Browser layer: src/core/**, src/features/** and the two browser '
      + 'entries ship to the browser and may import no node builtin. Node '
      + 'code belongs in src/vite/**. The postbuild grep fails the build on '
      + 'the same string.',
  },
  {
    group: ['child_process', 'child_process/*'],
    message:
      'Browser layer: child_process may not be imported outside '
      + 'src/vite/**. The postbuild grep fails the build on the same string.',
  },
];

/**
 * ESLint configuration for @ar/dev-tools: the shared open-tomato base with
 * its React and Vite flavors, plus this package's own layering.
 *
 * The three `no-restricted-imports` blocks below encode decision 1's
 * layering. They are ordered on purpose: a flat-config rule entry REPLACES an
 * earlier entry for the same rule id rather than merging with it, so the
 * widest block (the browser-layer node ban) comes first and the two narrower
 * blocks re-declare `NODE_BUILTIN_PATTERNS` alongside their own patterns.
 * Reordering them silently drops the node ban from src/core/** and
 * src/features/**.
 *
 * @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  ...reactConfig,
  ...viteConfig,
  {
    // Browser layer: no node builtin anywhere under src/ but the node layer.
    files: ['src/**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: ['src/vite/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [...NODE_BUILTIN_PATTERNS],
      }],
    },
  },
  {
    // Core layer: imported BY features, never importing them, and never
    // reaching the node layer.
    files: ['src/core/**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/features/**'],
            message:
              'Core layer: src/features/** imports src/core/**, never the '
              + 'reverse. Take what the core needs as a parameter or a '
              + 'registered feature instead.',
          },
          {
            group: ['**/vite/**'],
            message:
              'Core layer: src/vite/** is the node layer and is imported by '
              + 'neither src/core/** nor src/features/**. Share a type '
              + 'through src/core/ if both ends need one.',
          },
          ...NODE_BUILTIN_PATTERNS,
        ],
      }],
    },
  },
  {
    // Feature layer: may import the core, never the node layer.
    files: ['src/features/**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/vite/**'],
            message:
              'Feature layer: src/vite/** is the node layer and is imported '
              + 'by neither src/features/** nor src/core/**. A feature '
              + 'reaches the outside through DevToolsHost only.',
          },
          ...NODE_BUILTIN_PATTERNS,
        ],
      }],
    },
  },
];
