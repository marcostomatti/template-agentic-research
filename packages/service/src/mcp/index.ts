/**
 * MCP process entrypoint — validates env via `../config.js` and then imports
 * `./server.js`, which triggers `createMCP` to start the server.
 *
 * This is Option 2 of the entry-point setups described in the README: the
 * Express API (`src/index.ts`) and the MCP server run as two processes on
 * two ports, sharing the same business logic.
 *
 * Run locally over stdio (for Claude Desktop and MCP Inspector):
 *
 *   MCP_TRANSPORT=stdio bun src/mcp/index.ts
 *
 * Run over HTTP (default when `MCP_TRANSPORT` is unset):
 *
 *   bun src/mcp/index.ts
 */

import '../config.js';
import './server.js';
