/**
 * MCP server entrypoint — constructs the server via `createMCP` and
 * registers every tool. Transport selection (stdio vs HTTP) is resolved
 * inside `lib/mcp` from the `MCP_TRANSPORT` env var.
 */

import { createMCP } from '../../lib/mcp/index.js';

import {
  echoDescription,
  echoInputSchema,
  echoName,
  handleEcho,
} from './tools/echo.js';

export default createMCP({
  serviceId: 'template-service-mcp',
  setup(server) {
    server.registerTool(
      echoName,
      { description: echoDescription, inputSchema: echoInputSchema },
      handleEcho,
    );
  },
});
