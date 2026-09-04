/**
 * @packageDocumentation
 * The wave-2 tools: the reads over topics, feeds, a feed's failure
 * queue, the deployment's connectors and a domain's export
 * subscriptions, plus the two `run-now` verbs the API spec names
 * among its safe mutations.
 *
 * AT MOST ONE ENTRY PER ROUTE, AND NEITHER PROTOCOL DECIDES
 * ANYTHING THE OTHER DOES NOT. Every handler below calls the same
 * service function the HTTP route calls, with the same arguments,
 * and wraps the answer in the same envelope through
 * `./text-result.ts`. What differs is the transport and nothing
 * else: a rule lives in a group's own `service.ts`, is reached
 * twice, and cannot drift because there is only one of it.
 *
 * THE SCHEMAS ARE IMPORTED, NEVER RESTATED. Each entry's
 * `inputSchema` is the `...ToolInputSchema` its own route module
 * exports — one object spread from the pieces that route already
 * parses, since an HTTP request carries an address and a query
 * apart where a tool is handed a single arguments object.
 * `./wave-2.test.ts` holds every one of them `Object.is`-identical
 * to the exported binding, which is the reading a structural
 * comparison could not make: a copy that agreed today would pass
 * one and fail the other.
 *
 * THE SECRET LAW REACHES THIS PROTOCOL THROUGH THE SERVICE, AND
 * THERE IS NO SECOND APPLICATION OF IT HERE. `connectors.list`
 * calls {@link listConnectors}, which is the single layer that
 * applies `src/connectors/secrets.ts` — so every config this list
 * answers carries `MASKED_SECRET` under a rostered key by the time
 * it reaches this module, exactly as it does on the wire.
 * `maskConnectorConfig` is deliberately NOT imported below: a
 * second call would be a second place the roster is applied, which
 * is the state that module's header says the two directions of one
 * rule must never reach. What holds the claim instead is
 * `./wave-2.test.ts`, which drives the tool over a stored
 * credential and asserts the answered config EQUALS
 * `maskConnectorConfig` of the stored one — that function as the
 * authority, measured, rather than restated here.
 *
 * NO OTHER ENTRY CAN COME TO HOLD A CONFIG. `exports.list` answers
 * `connectorId` and joins nothing in, which is
 * `src/subscriptions/service.ts`'s rule rather than a containment
 * arranged here, and no other group on this wave reads that table
 * at all.
 *
 * A HANDLER PARSES ITS OWN INPUT, through the schema it declares
 * and through `parseBody` — so a refusal here is the same
 * `ValidationError` the route answers, one detail per fault, with
 * a field path and no submitted value. `parseBody` and not
 * `parseQuery`: a tool is called with one object the caller
 * composed, which is what that function names `body`, and there is
 * no query string on this protocol for the other spelling to mean.
 *
 * THE TWO WRITES READ NO BODY AT ALL, which is where they differ
 * from the wave-1 term edits. `runTopicNow` and
 * `runSubscriptionNow` take an id and a clock and nothing more, so
 * a tool declares the address alone and `.strict()` refuses
 * anything else — where the ROUTE simply ignores a body
 * `express.json()` already parsed. That is the one place the two
 * protocols answer the same request differently, and it is the
 * stricter side that gained the refusal.
 *
 * THE CLOCK COMES FROM THE CONTEXT, not from `Date.now()` inside a
 * handler: `McpToolContext.clock` is the same thunk
 * `src/index.ts` hands `buildTopicsRouter` and
 * `buildSubscriptionsRouter`, so the instant a schedule column is
 * written with is one a caller can pin.
 *
 * WHAT IS DELIBERATELY NOT HERE, so the exposure invariant has the
 * reasons rather than an absence to interpret. Every create and
 * patch on this wave: a topic's terms, a feed's `parser_config`, a
 * subscription's interval and a connector's `config` are all
 * configuration a research pass is scored by, and no write on
 * this wave beyond the two below is on the spec's safe list. The
 * connector writes carry a further reason of their own — a create
 * or a patch there is how a CREDENTIAL is set, and the surfaces
 * this protocol may not reach name that one first. Every delete,
 * for the reason `./wave-1.ts` gives: a removal answers no
 * representation. And `POST /topics/:id/pause`, which writes the
 * same column `topics.run-now` does but is a deferral measured in
 * cycles against a clock an operator is watching.
 *
 * THE STORE ARRIVES AT CALL TIME. Nothing here is constructed at
 * module scope and nothing here starts anything, which is what
 * lets `./registry.ts` import this list and stay readable by a
 * test — the rule that module's header states, kept from this side.
 */
import type {
  McpToolContext,
  McpToolEntry,
} from './registry.js';
import type { ConnectorFilter } from '../../connectors/store.js';

import {
  connectorListToolInputSchema,
} from '../../connectors/routes.js';
import { listConnectors } from '../../connectors/service.js';
import { buildPaginationMeta, ok, okPage } from '../../http/envelope.js';
import { toStoreWindow } from '../../http/schemas.js';
import { parseBody } from '../../http/validation.js';
import {
  sourceFailureListToolInputSchema,
} from '../../sources/failures-routes.js';
import { listSourceFailures } from '../../sources/failures-service.js';
import {
  sourceListToolInputSchema,
} from '../../sources/routes.js';
import { listSources } from '../../sources/service.js';
import {
  subscriptionListToolInputSchema,
  subscriptionRunNowToolInputSchema,
} from '../../subscriptions/routes.js';
import {
  listSubscriptions,
  runSubscriptionNow,
} from '../../subscriptions/service.js';
import {
  topicListToolInputSchema,
  topicRunNowToolInputSchema,
} from '../../topics/routes.js';
import { listTopics, runTopicNow } from '../../topics/service.js';

import { textResult } from './text-result.js';

/**
 * The tools this wave registers.
 *
 * Seven entries: five reads and the two `run-now` verbs. Written
 * out in the order the resources are met — a domain's topics, then
 * its feeds, then the queue hanging off one feed, then the
 * deployment's connectors, then a domain's exports — with the two
 * writes at the foot, so the list reads as the surface rather than
 * as an alphabet.
 *
 * `./registry.ts` spreads this into `MCP_TOOLS`. Nothing else
 * imports it, and a tool arrives by an edit to this literal.
 */
export const WAVE_2_TOOLS: readonly McpToolEntry[] = [
  {
    name: 'topics.list',
    description: 'Lists the topics of one domain, a page at a time.',
    inputSchema: topicListToolInputSchema,
    route: 'GET /domains/:slug/topics',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(topicListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listTopics(context.store, query.slug, window);
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'sources.list',
    description: 'Lists the feeds of one domain, with parse counts.',
    inputSchema: sourceListToolInputSchema,
    route: 'GET /domains/:slug/sources',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(sourceListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listSources(context.store, query.slug, window);
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'source-failures.list',
    description: 'Lists the captures of one feed that did not parse.',
    inputSchema: sourceFailureListToolInputSchema,
    route: 'GET /sources/:id/failures',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(sourceFailureListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listSourceFailures(
        context.store,
        query.id,
        window,
      );
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'connectors.list',
    description:
      'Lists the deployment connectors, every credential masked.',
    inputSchema: connectorListToolInputSchema,
    route: 'GET /connectors',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(connectorListToolInputSchema, input);
      const filter: ConnectorFilter = { kind: query.kind };
      const window = toStoreWindow(query);
      const page = await listConnectors(context.store, filter, window);
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'exports.list',
    description:
      'Lists the export subscriptions of one domain, a page at a time.',
    inputSchema: subscriptionListToolInputSchema,
    route: 'GET /domains/:slug/exports',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(subscriptionListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listSubscriptions(
        context.store,
        query.slug,
        window,
      );
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'topics.run-now',
    description: 'Makes one topic due now, so the next tick runs it.',
    inputSchema: topicRunNowToolInputSchema,
    route: 'POST /topics/:id/run-now',
    async handler(context: McpToolContext, input: unknown) {
      const { id } = parseBody(topicRunNowToolInputSchema, input);
      const ran = await runTopicNow(context.store, context.clock, id);

      return textResult(ok(ran));
    },
  },
  {
    name: 'exports.run-now',
    description: 'Makes one export due now, so the next tick sends it.',
    inputSchema: subscriptionRunNowToolInputSchema,
    route: 'POST /exports/:id/run-now',
    async handler(context: McpToolContext, input: unknown) {
      const { id } = parseBody(subscriptionRunNowToolInputSchema, input);
      const ran = await runSubscriptionNow(
        context.store,
        context.clock,
        id,
      );

      return textResult(ok(ran));
    },
  },
];
