import eslint from '@eslint/js';
import markdown from '@eslint/markdown';
import stylistic from '@stylistic/eslint-plugin';
import * as tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import jsonc from 'eslint-plugin-jsonc';
import globals from 'globals';
import * as jsoncParser from 'jsonc-eslint-parser';
import { configs as tsLintConfig } from 'typescript-eslint';

import sharedRules from './sharedRules.mjs';
/**
 * A custom ESLint configuration for typescript
 *
 * @type {import("eslint").Linter.Config} */
export default defineConfig([
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '**/package-lock.json',
      '**/.docs/*',
    ],
  },
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tsLintConfig.recommended,
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.node,    // process, __dirname
        ...globals.browser, // fetch, console, window
        Bun: 'readonly',
        // note: Projects configs should add globals in this section of their config definition if needed, for example:
        React: 'readonly',
      },

      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        // note: Projects configs should add parserOptions in this section of their config definition if needed, for example:
        // project: './tsconfig.json',
      },
    },
    rules: {
      ...sharedRules,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.d.ts'],
      },
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            // './packages/*/tsconfig.json',
            // './services/*/tsconfig.json',
            // './apps/*/tsconfig.json',
          ],
        },
      },
    },
  },
  {
    files: ['**/*.md'],
    plugins: {
      markdown,
    },
    extends: ['markdown/recommended'],
    rules: {
      'markdown/no-missing-label-refs': 'off',
    },
  },
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc,
      '@stylistic': stylistic,
    },
    rules: {
      'jsonc/indent': ['error', 2],
      '@stylistic/no-multiple-empty-lines': ['error', { 'max': 0, 'maxEOF': 0 }],
    },
  },
]);

