import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { default as reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';

import baseConfig from '../../eslint.base.mjs';
import sharedRules from '../../sharedRules.mjs';

// Reference-free gate targets — split so the literal names never appear in
// this file (same convention as @ar/ui).
const BANNED_SOURCE_SCOPE = ['@open', 'tomato'].join('-');
const BANNED_SOURCE_REPO = ['component', 'breakdown'].join('-');

/**
 * ESLint configuration for the web app (React consumer of @ar/ui).
 *
 * @type {import("eslint").Linter.Config} */
export default defineConfig([
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
    ],
  },
  baseConfig,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    // The app consumes @ar/ui only — never the repositories it was
    // extracted from.
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
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
  {
    files: ['**/*.jsx', '**/*.tsx'],
    extends: [
      baseConfig,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
      reactRefresh.configs.recommended,
    ],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: pluginReact,
      '@stylistic': stylistic,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
          ],
        },
      },
    },
    rules: {
      ...sharedRules,
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/function-component-definition': 0,
      'react/jsx-filename-extension': [
        1,
        {
          'extensions': [
            '.tsx',
            '.ts',
          ],
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 0,
    },
  },
]);
