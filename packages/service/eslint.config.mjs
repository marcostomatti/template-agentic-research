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
    // The MCP SDK's `exports` map routes subpaths through a wildcard
    // `./*` whose `types` target is `./dist/esm/*.d.ts`, so a specifier
    // carrying a `.js` suffix resolves to a `*.js.d.ts` that does not
    // exist and eslint-import-resolver-typescript calls it unresolved.
    // `tsc` substitutes the extension and resolves the same specifier,
    // so a green `check-types` is no evidence about this rule. Measured:
    // dropping the entry reddens three imports in tests/mcp-echo.test.ts.
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^bun:', '^@modelcontextprotocol/sdk/'] }],
    },
  },
];
