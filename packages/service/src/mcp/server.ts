/**
 * @packageDocumentation
 * The MCP server: one {@link createMCP} call, and every entry of
 * `MCP_TOOLS` registered in one loop.
 *
 * ONE LOOP, NEVER A LINE PER TOOL. What a client is offered is
 * `src/mcp/tools/registry.ts`, and this file is the transport that
 * carries it — so registering a tool costs an edit to that literal
 * and nothing here. Two spellings of one list is exactly what the
 * registry exists to avoid: a per-tool call site could offer a
 * tool the list does not carry, or quietly leave one out, and no
 * reading of either half would report it. The loop makes the two
 * the same set by construction, and a test reads that list rather
 * than this module, because importing THIS one boots a server.
 *
 * THE SCHEMA IS HANDED OVER WHOLE. `registerTool` takes either a
 * raw shape or a whole zod schema, and an entry carries the
 * schema its HTTP route already exports — so the object a client
 * is shown is the object that route parses, rather than a shape
 * rebuilt here from its members. That is what lets the exposure
 * invariant assert identity rather than structural agreement.
 *
 * THE ANSWER IS COPIED, not forwarded. An entry answers a
 * `readonly` content array, which is the registry stating that a
 * handler does not hand out a list somebody else may edit; the
 * SDK result type is mutable. One spread at the registration site
 * is the whole of the adaptation.
 *
 * THE CONTEXT IS BUILT ONCE, above the loop, because a static
 * list cannot close over a store — the rule
 * `src/mcp/tools/registry.ts` states from its own side, and the
 * reason a handler takes the context as its first parameter. Its
 * store is the twelve ports as one object, spread the way
 * `src/index.ts` spreads the ports its routers share: one drizzle
 * implementation per resource group, each over the same
 * `() => dbDep.client` thunk, and no two of them declaring a
 * method under one name.
 *
 * A THUNK RATHER THAN A RESOLVED CLIENT, for the reason that
 * wiring gives: every `createDb*Store` opens nothing at
 * construction and resolves the client per call, so building them
 * at module scope is legal and the pool connects on the first
 * tool somebody calls.
 *
 * WHAT THIS MODULE DOES NOT DO, said here rather than left to be
 * discovered. {@link createMCP} takes no dependency array, so
 * Postgres is neither probed at boot nor drained on shutdown the
 * way `createService` does both for the API process: an
 * unreachable database surfaces at the first tool call rather
 * than at start, and on `SIGTERM` the transport and the health
 * server are closed while the pool is left to time its idle
 * clients out. Transport selection is not this module either —
 * `lib/mcp` resolves stdio against HTTP from `MCP_TRANSPORT`.
 */

import type { McpToolContext } from './tools/registry.js';

import { createMCP } from '../../lib/mcp/index.js';
import { config } from '../config.js';
import { createDbConnectorStore } from '../connectors/db-store.js';
import { createDbDependency } from '../db/index.js';
import { createDbDocumentStore } from '../documents/db-store.js';
import { createDbDomainStore } from '../domains/db-store.js';
import { createDbEntityStore } from '../entities/db-store.js';
import { createDbFindingStore } from '../findings/db-store.js';
import { createDbPersonaStore } from '../personas/db-store.js';
import { createDbRunStore } from '../runs/db-store.js';
import { createDbSettingsStore } from '../settings/db-store.js';
import { createDbSourceStore } from '../sources/db-store.js';
import { createDbSubscriptionStore } from '../subscriptions/db-store.js';
import { createDbTaxonomyStore } from '../taxonomy/db-store.js';
import { createDbTopicStore } from '../topics/db-store.js';

import { MCP_TOOLS } from './tools/registry.js';

/**
 * The Postgres dependency, for its client alone.
 *
 * Built here rather than taken from a service, this process having
 * none: the header above says what is given up by that.
 */
const dbDep = createDbDependency(config.DATABASE_URL);

/**
 * The store and the present every handler is given.
 *
 * ONE CONTEXT FOR THE WHOLE LIST, and the store is an
 * intersection rather than a union of what each entry needs — a
 * handler declaring a narrower store stays assignable, so a
 * group whose port is read-only does not give that up by being
 * reachable from here.
 *
 * The clock is a thunk and not an instant, on the terms
 * `src/index.ts` gives for the one it hands its schedule routers:
 * this object is built once at boot and then answers for the life
 * of the process, so a captured `Date` would freeze the present
 * every window is measured back from at the moment of wiring.
 */
const context: McpToolContext = {
  store: {
    ...createDbConnectorStore(() => dbDep.client),
    ...createDbDocumentStore(() => dbDep.client),
    ...createDbDomainStore(() => dbDep.client),
    ...createDbEntityStore(() => dbDep.client),
    ...createDbFindingStore(() => dbDep.client),
    ...createDbPersonaStore(() => dbDep.client),
    ...createDbRunStore(() => dbDep.client),
    ...createDbSettingsStore(() => dbDep.client),
    ...createDbSourceStore(() => dbDep.client),
    ...createDbSubscriptionStore(() => dbDep.client),
    ...createDbTaxonomyStore(() => dbDep.client),
    ...createDbTopicStore(() => dbDep.client),
  },
  clock: () => new Date(),
};

export default createMCP({
  serviceId: 'template-service-mcp',
  setup(server) {
    for (const entry of MCP_TOOLS) {
      server.registerTool(
        entry.name,
        {
          description: entry.description,
          inputSchema: entry.inputSchema,
        },
        async (input: unknown) => {
          const result = await entry.handler(context, input);

          return { content: [...result.content] };
        },
      );
    }
  },
});
