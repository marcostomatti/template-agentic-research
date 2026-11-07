import baseConfig from '@open-tomato/eslint-config';

/**
 * Root leaf: the shared open-tomato base over tools/ and the root-level
 * files. Each package under packages/* carries its own config extending
 * the same base.
 *
 * @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      'packages/**',
      // Planning prose, never a lint target. The base already ignores
      // .claude/, .rafa/, .tmp/ and .docs/.
      '.plans/**',
      '.specs/**',
    ],
  },
  ...baseConfig,
];
