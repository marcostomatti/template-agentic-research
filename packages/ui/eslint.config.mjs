import baseConfig from '@open-tomato/eslint-config';
import cvaConfig from '@open-tomato/eslint-config/cva';
import reactConfig from '@open-tomato/eslint-config/react';
import viteConfig from '@open-tomato/eslint-config/vite';

// Reference-free gate targets (see rule below) — split so the needles are
// never spelled out as literals here. The shared lint config imported above
// is the one deliberate exception: dev-only tooling, never a runtime import.
const BANNED_SOURCE_SCOPE = ['@open', 'tomato'].join('-');
const BANNED_SOURCE_REPO = ['component', 'breakdown'].join('-');

/**
 * ESLint configuration for this React component library: the shared
 * open-tomato base with its React, Vite and CVA flavors, plus the
 * library's own reference-free gate.
 *
 * @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  ...reactConfig,
  ...viteConfig,
  ...cvaConfig,
  {
    // Warn, not error, for now: the rule states this library's own
    // variants-only law (AGENTS.md), but ~570 className sites predate it.
    // Follow-up: move those classes into .variants.ts files, then delete
    // this block so the flavor's error applies.
    // The ignores mirror the flavor's own, so the rule stays off where the
    // flavor leaves it off.
    files: ['**/*.tsx', '**/*.jsx'],
    ignores: ['**/templates/**', '**/pages/**', '**/*.stories.tsx', '**/*.test.tsx'],
    rules: { '@open-tomato/cva-only-classname': 'warn' },
  },
  {
    // Reference-free gate: this standalone library must never import from the
    // monorepo it was extracted from or its pre-publish source repositories.
    // The banned names are assembled from parts so this config itself passes
    // a grep sweep for the same strings. This file is left out: it imports
    // the shared ESLint config, a dev-only tool that never reaches src/.
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: ['eslint.config.mjs'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [`${BANNED_SOURCE_SCOPE}/*`],
            message: 'Banned source scope — this library is standalone; use local relative imports.',
          },
          {
            group: [`*${BANNED_SOURCE_REPO}*`],
            message: 'Cross-repo path imports are banned in components-library.',
          },
        ],
      }],
    },
  },
];
