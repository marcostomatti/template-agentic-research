import baseConfig from '@open-tomato/eslint-config';
import reactConfig from '@open-tomato/eslint-config/react';
import viteConfig from '@open-tomato/eslint-config/vite';

// Reference-free gate targets — split so the needles are never spelled out
// as literals here (same convention as @ar/ui). The shared lint config
// imported above is the one deliberate exception: dev-only tooling.
const BANNED_SOURCE_SCOPE = ['@open', 'tomato'].join('-');
const BANNED_SOURCE_REPO = ['component', 'breakdown'].join('-');

/**
 * ESLint configuration for the web app (React consumer of @ar/ui): the
 * shared open-tomato base with its React and Vite flavors, plus the app's
 * own reference-free gate.
 *
 * @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  ...reactConfig,
  ...viteConfig,
  {
    // The app consumes @ar/ui only — never the repositories it was
    // extracted from. This file is left out: it imports the shared ESLint
    // config, a dev-only tool that never reaches the app.
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: ['eslint.config.mjs'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [`${BANNED_SOURCE_SCOPE}/*`],
            message: 'Banned source scope — import from @ar/ui instead.',
          },
          {
            group: [`*${BANNED_SOURCE_REPO}*`],
            message: 'Cross-repo path imports are banned.',
          },
        ],
      }],
    },
  },
];
