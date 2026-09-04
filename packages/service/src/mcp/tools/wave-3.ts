/**
 * @packageDocumentation
 * The wave-3 tools: the reads over a domain findings and its
 * corpus, one finding whole, one subject of a registry and what
 * research has found out about it, the config proposals queued
 * against one feed, the passes this deployment has made and what
 * they spent — plus the three mutations the API spec names among
 * its safe ones: the operator ruling on a finding, and the two
 * approval gates.
 *
 * AT MOST ONE ENTRY PER ROUTE, AND NEITHER PROTOCOL DECIDES
 * ANYTHING THE OTHER DOES NOT. Every handler below calls the same
 * service function the HTTP route calls, with the same arguments,
 * and wraps the answer in the same envelope through
 * `./text-result.ts`. What differs is the transport and nothing
 * else: a rule lives in a group own `service.ts`, is reached
 * twice, and cannot drift because there is only one of it.
 *
 * THE SCHEMAS ARE IMPORTED, NEVER RESTATED. Each entry
 * `inputSchema` is the `...ToolInputSchema` its own route module
 * exports — one object covering the whole request, since an HTTP
 * request carries an address and a query apart where a tool is
 * handed a single arguments object. `./wave-3.test.ts` holds every
 * one of them `Object.is`-identical to the exported binding, which
 * is the reading a structural comparison could not make: a copy
 * that agreed today would pass one and fail the other.
 *
 * TWO OF THE TWELVE ARE COMPOSED THE OTHER WAY ROUND, AND THAT IS A
 * REFUSAL RATHER THAN A STYLE. The findings list and the spend
 * summary both read a window over time, so both inherit the
 * object-level check that refuses a `since` at or after its
 * `until` — and zod carries such a check OUTWARDS ONLY, so the
 * spread every other schema here uses would have dropped it while
 * still refusing every undeclared key. Each of those two route
 * modules says so beside its own declaration; what this module
 * owes is not to work around it.
 *
 * A HANDLER PARSES ITS OWN INPUT, through the schema it declares
 * and through `parseBody` — so a refusal here is the same
 * `ValidationError` the route answers, one detail per fault, with
 * a field path and no submitted value. `parseBody` and not
 * `parseQuery`: a tool is called with one object the caller
 * composed, which is what that function names `body`, and there is
 * no query string on this protocol for the other spelling to mean.
 * A list tool therefore answers `field: 'body'` where its route
 * answers `field: 'query'` for the same misspelt parameter.
 *
 * THE THREE SINGLE GETS ARE THE STRICTER FACE OF THEIR ROUTES.
 * `GET /findings/:id`, `GET /entities/:id` and `GET /runs/:id`
 * parse no query at all, so an undeclared parameter sent to one on
 * the wire is IGNORED, where the tool declares the address alone
 * under `.strict()` and refuses it. That is the same asymmetry the
 * wave-2 `run-now` pair carries, and a reader predicting either
 * answer from the other gets it backwards.
 *
 * WHAT THE THREE WRITES REACH IS THE PORTS RATHER THAN THIS MODULE
 * DISCIPLINE. The four ports behind this wave declare exactly four
 * writers between them — the verdict append, the entity rewrite,
 * the research approval and the config approve-and-apply — and the
 * three service functions below reach three of those four. The
 * fourth, the entity rewrite, is reachable from no function this
 * file calls, and nothing on any of the four ports could re-score a
 * finding or record a research pass at all. `Read-first` in
 * `docs/architecture/08-http-api.md` states that once for the whole
 * wave, and `tests/invariants/api-read-first.test.ts` derives it
 * from the port types rather than from this sentence.
 *
 * A WRITE HANDS THE REST OF ITS PARSED INPUT ON, AND THE BODY IS
 * PARSED TWICE. Each of the three splits its arguments into the
 * ADDRESS it narrows and the rest, and hands the rest to the same
 * service function the route hands `req.body` to — which parses it
 * again under the body schema this input object was spread from.
 * That is what keeps the shape of a ruling declared once: a tool
 * cannot come to disagree with the operation about what a ruling
 * is, and a member of the wrong TYPE is refused whichever parse
 * reaches it first.
 *
 * THE `.strict()` BELOW IS NOT A SECOND GUARD, THOUGH. It is the
 * ONLY refusal an undeclared argument meets, because a zod object
 * without it STRIPS the key rather than forwarding it — so the
 * service would be handed a clean body and the call would land.
 * Measured: dropping `.strict()` from any of the three tool inputs
 * reddens the case in `./wave-3.test.ts` that sends one, which is
 * the opposite of what the wave-2 note about a free re-parse would
 * lead a reader to predict.
 *
 * NO RULE ANY OF THE THREE KEEPS IS KEPT HERE. The verdict ladder
 * is read per call off the owning domain, the comparison that
 * refuses an intention raised about another subject and the one
 * that refuses a proposal made for another feed are the services',
 * and so is the `409` an already-applied proposal answers. This
 * module composes no refusal and reads no stored row, which is why
 * the two protocols cannot answer one act differently.
 *
 * WHAT IS DELIBERATELY NOT HERE, so the exposure invariant has the
 * reason rather than a gap to interpret: `PATCH /entities/:id`
 * stays off this surface. A rename recomputes the key a registry is
 * deduplicated on and an alias merges two subjects, which is
 * configuration a research pass is scored by, and of this wave own
 * writes the spec safe list names the three below alone.
 *
 * THE TWO GATES DIFFER ON WHAT A SECOND RULING GETS, and a caller
 * meeting one should not predict the other from it. Ratifying an
 * intention twice is a `200` answering the FIRST ruling instant,
 * because the write is `coalesce(approved_at, now())` and nothing
 * else happened; applying a config twice is a `409`, because the
 * second application would write the two documents again. That is
 * `RULING_ACTS` in `src/approvals/ruling.ts` rather than a rule
 * either handler below keeps.
 *
 * THE SPEND SUMMARY IS THE ONE ENTRY THAT READS THE CLOCK, and it
 * reads it from {@link McpToolContext} rather than from
 * `Date.now()`: the window a caller left open is closed against an
 * instant a case can pin, exactly as `src/index.ts` hands one
 * `clock` const to `buildSpendRouter`. No member of what it
 * answers is money — `llm_calls` carries no such column — and the
 * three it does answer are counts and magnitudes.
 *
 * `GET /runs` WIDENS WHEN ITS `domain` IS ABSENT, and there is no
 * spelling on either protocol that asks for the domain-less ticks
 * alone. `src/runs/routes.ts` argues that once for both faces.
 *
 * THE PENDING QUEUE ONE TOOL READS IS THE QUEUE THE CLI DRAINS.
 * `scripts/approve.ts` and `src/sources/proposals-service.ts`
 * select the pending rows in one order, so a model reading the
 * backlog here and an operator reading it from a terminal are
 * told the same proposal is next.
 *
 * THE STORE ARRIVES AT CALL TIME. Nothing here is constructed at
 * module scope and nothing here starts anything, which is what
 * lets `./registry.ts` import this list and stay readable by a
 * test — the rule that module header states, kept from this side.
 */
import type {
  McpToolContext,
  McpToolEntry,
} from './registry.js';
import type { DocumentFilter } from '../../documents/store.js';
import type { FindingFilter } from '../../findings/store.js';

import {
  documentListToolInputSchema,
} from '../../documents/routes.js';
import { listDocuments } from '../../documents/service.js';
import {
  entityApproveResearchToolInputSchema,
  entityReadToolInputSchema,
  entityResearchListToolInputSchema,
} from '../../entities/routes.js';
import {
  approveEntityResearch,
  getEntity,
  listEntityResearch,
} from '../../entities/service.js';
import {
  findingListToolInputSchema,
  findingReadToolInputSchema,
  findingVerdictToolInputSchema,
} from '../../findings/routes.js';
import { getFinding, listFindings } from '../../findings/service.js';
import { recordVerdict } from '../../findings/verdict-service.js';
import { buildPaginationMeta, ok, okPage } from '../../http/envelope.js';
import { toStoreWindow, toTimeWindow } from '../../http/schemas.js';
import { parseBody } from '../../http/validation.js';
import {
  runListToolInputSchema,
  runReadToolInputSchema,
} from '../../runs/routes.js';
import { getRun, listRuns } from '../../runs/service.js';
import {
  spendSummaryToolInputSchema,
} from '../../runs/spend-routes.js';
import { summariseSpend } from '../../runs/spend-service.js';
import {
  pendingConfigListToolInputSchema,
  sourceApproveConfigToolInputSchema,
} from '../../sources/proposals-routes.js';
import {
  approveSourceConfig,
  listPendingConfigs,
} from '../../sources/proposals-service.js';

import { textResult } from './text-result.js';

/**
 * The tools this wave registers.
 *
 * Twelve entries: nine reads and the three writes the spec names.
 * The reads are written out in the order the resources are met —
 * what a domain criteria produced, then one finding whole, then
 * the corpus those findings were read out of, then a subject of
 * the registry and its research, then the proposals queued against
 * one feed, then the passes and what they spent — with the three
 * writes at the foot in that same order, so the list reads as the
 * surface rather than as an alphabet.
 *
 * `./registry.ts` spreads this into `MCP_TOOLS`. Nothing else
 * imports it, and a tool arrives by an edit to this literal.
 */
export const WAVE_3_TOOLS: readonly McpToolEntry[] = [
  {
    name: 'findings.list',
    description:
      'Lists what one domain criteria produced, a page at a time.',
    inputSchema: findingListToolInputSchema,
    route: 'GET /domains/:slug/findings',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(findingListToolInputSchema, input);
      const filter: FindingFilter = {
        category: query.category,
        verdict: query.verdict,
        window: toTimeWindow(query),
      };
      const page = await listFindings(
        context.store,
        query.slug,
        filter,
        query.sort,
        toStoreWindow(query),
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
    name: 'findings.get',
    description:
      'Reads one finding, its sightings, its rulings and its research.',
    inputSchema: findingReadToolInputSchema,
    route: 'GET /findings/:id',
    async handler(context: McpToolContext, input: unknown) {
      const { id } = parseBody(findingReadToolInputSchema, input);

      return textResult(ok(await getFinding(context.store, id)));
    },
  },
  {
    name: 'documents.list',
    description:
      'Lists the captures of one domain, each body masked and cut.',
    inputSchema: documentListToolInputSchema,
    route: 'GET /domains/:slug/documents',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(documentListToolInputSchema, input);
      const filter: DocumentFilter = { parseStatus: query.parseStatus };
      const page = await listDocuments(
        context.store,
        query.slug,
        filter,
        toStoreWindow(query),
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
    name: 'entities.get',
    description: 'Reads one subject of a domain entity registry.',
    inputSchema: entityReadToolInputSchema,
    route: 'GET /entities/:id',
    async handler(context: McpToolContext, input: unknown) {
      const { id } = parseBody(entityReadToolInputSchema, input);

      return textResult(ok(await getEntity(context.store, id)));
    },
  },
  {
    name: 'entity-research.list',
    description:
      'Lists what research has found out about one subject.',
    inputSchema: entityResearchListToolInputSchema,
    route: 'GET /entities/:id/research',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(entityResearchListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listEntityResearch(
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
    name: 'pending-configs.list',
    description:
      'Lists the proposals queued against one feed, oldest first.',
    inputSchema: pendingConfigListToolInputSchema,
    route: 'GET /sources/:id/pending-configs',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(pendingConfigListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listPendingConfigs(
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
    name: 'runs.list',
    description:
      'Lists the passes this deployment has made, a page at a time.',
    inputSchema: runListToolInputSchema,
    route: 'GET /runs',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(runListToolInputSchema, input);
      const page = await listRuns(
        context.store,
        query.domain,
        toStoreWindow(query),
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
    name: 'runs.get',
    description: 'Reads one pass and the newest of what it spent.',
    inputSchema: runReadToolInputSchema,
    route: 'GET /runs/:id',
    async handler(context: McpToolContext, input: unknown) {
      const { id } = parseBody(runReadToolInputSchema, input);

      return textResult(ok(await getRun(context.store, id)));
    },
  },
  {
    name: 'spend.summary',
    description:
      'Counts the model calls of a window, per domain and UTC day.',
    inputSchema: spendSummaryToolInputSchema,
    route: 'GET /spend/summary',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(spendSummaryToolInputSchema, input);
      const summary = await summariseSpend(
        context.store,
        context.clock,
        query,
      );

      return textResult(ok(summary));
    },
  },
  {
    name: 'findings.verdict',
    description: 'Records one operator ruling on one finding.',
    inputSchema: findingVerdictToolInputSchema,
    route: 'PATCH /findings/:id/verdict',
    async handler(context: McpToolContext, input: unknown) {
      const parsed = parseBody(findingVerdictToolInputSchema, input);
      const { id, ...body } = parsed;
      const label = await recordVerdict(context.store, id, body);

      return textResult(ok(label));
    },
  },
  {
    name: 'entities.approve-research',
    description: 'Rules in favour of one queued research intention.',
    inputSchema: entityApproveResearchToolInputSchema,
    route: 'POST /entities/:id/approve-research',
    async handler(context: McpToolContext, input: unknown) {
      const parsed = parseBody(
        entityApproveResearchToolInputSchema,
        input,
      );
      const { id, ...body } = parsed;
      const ruling = await approveEntityResearch(
        context.store,
        id,
        body,
      );

      return textResult(ok(ruling));
    },
  },
  {
    name: 'sources.approve-config',
    description: 'Approves one queued config proposal and applies it.',
    inputSchema: sourceApproveConfigToolInputSchema,
    route: 'POST /sources/:id/approve-config',
    async handler(context: McpToolContext, input: unknown) {
      const parsed = parseBody(
        sourceApproveConfigToolInputSchema,
        input,
      );
      const { id, ...body } = parsed;
      const ruling = await approveSourceConfig(
        context.store,
        id,
        body,
      );

      return textResult(ok(ruling));
    },
  },
];
