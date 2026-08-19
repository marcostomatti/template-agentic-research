import globals from 'globals';

import baseConfig from '../../eslint.base.mjs';

/** @type {import("eslint").Linter.Config} */
export default [
  { ignores: ['.tmp/**', '.docs/**', 'drizzle/**'] },
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // The MCP SDK resolves through package `exports` subpaths, which the
    // TS resolver can't follow for files excluded from tsconfig (tests).
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^bun:', '^@modelcontextprotocol/sdk/'] }],
    },
  },
];
