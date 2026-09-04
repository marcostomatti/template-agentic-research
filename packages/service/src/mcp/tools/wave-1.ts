/**
 * @packageDocumentation
 * The wave-1 tools: the reads over domains, the taxonomy, the
 * lexicons, the personas and the operator settings, plus the two
 * term edits the API spec names among its safe mutations.
 *
 * AT MOST ONE ENTRY PER ROUTE, AND NEITHER PROTOCOL DECIDES
 * ANYTHING THE OTHER DOES NOT. Every handler below calls the same
 * service function the HTTP route calls, with the same arguments,
 * and wraps the answer in the same envelope. What differs is the
 * transport and nothing else: a rule lives in a group's own
 * `service.ts`, is reached twice, and cannot drift because there
 * is only one of it. Which routes get an entry at all is the
 * paragraph below.
 *
 * THE SCHEMAS ARE IMPORTED, NEVER RESTATED. Each entry's
 * `inputSchema` is the `...ToolInputSchema` its own route module
 * exports — one object spread from the pieces that route already
 * parses, since an HTTP request carries an address and a query
 * apart where a tool is handed a single arguments object.
 * `./wave-1.test.ts` holds every one of them `Object.is`-identical
 * to the exported binding, which is the reading a structural
 * comparison could not make: a copy that agreed today would pass
 * one and fail the other.
 *
 * A HANDLER PARSES ITS OWN INPUT, through the schema it declares
 * and through `parseBody` — so a refusal here is the same
 * `ValidationError` the route answers, one detail per fault, with
 * a field path and no submitted value. `parseBody` and not
 * `parseQuery`: a tool is called with one object the caller
 * composed, which is what that function names `body`, and there is
 * no query string on this protocol for the other spelling to mean.
 * A list tool therefore answers `field: 'body'` where its route
 * answers `field: 'query'` for the same misspelt parameter, which
 * is the one place the two refusals read differently.
 *
 * A SERVICE PARSES ITS OWN HALF AGAIN, on the two writes. The
 * handler parses to take the address apart from the rest, and
 * hands the rest to `createTerm` or `patchTerm`, which validate it
 * against their own exported schemas as they do for a request body
 * — deliberately, because the body contract belongs to the
 * operation rather than to whichever caller reached it.
 *
 * WHAT IS DELIBERATELY NOT HERE, so the exposure invariant has the
 * reasons rather than an absence to interpret. `DELETE /terms/:id`
 * and every other delete on this wave: a removal answers no
 * representation, and the spec names domain delete among the
 * surfaces this protocol may not reach. The creates and patches
 * over domains, categories and personas, and `PUT /settings`:
 * those write configuration a research pass is scored by, and the
 * spec's safe list names term edits alone. And the two DOCUMENT
 * branches of the terms router — `?format=seed` on the read and a
 * seed body on the create — which answer and accept a whole
 * lexicon written for byte-exact re-import, a file rather than a
 * result: `src/taxonomy/terms-routes.ts` carries that argument
 * beside each schema that leaves it out, and `.strict()` is what
 * puts the create branch structurally out of a tool's reach.
 *
 * THE STORE ARRIVES AT CALL TIME. Nothing here is constructed at
 * module scope and nothing here starts anything, which is what
 * lets `./registry.ts` import this list and stay readable by a
 * test — the rule that module's header states, kept from this side.
 */
import type {
  McpToolContext,
  McpToolEntry,
  McpToolResult,
} from './registry.js';

import {
  domainListToolInputSchema,
  domainReadToolInputSchema,
} from '../../domains/routes.js';
import { getDomain, listDomains } from '../../domains/service.js';
import { buildPaginationMeta, ok, okPage } from '../../http/envelope.js';
import { toStoreWindow } from '../../http/schemas.js';
import { parseBody } from '../../http/validation.js';
import {
  personaListToolInputSchema,
} from '../../personas/routes.js';
import { listPersonas } from '../../personas/service.js';
import {
  settingsReadToolInputSchema,
} from '../../settings/routes.js';
import { getSettings } from '../../settings/service.js';
import {
  categoryListToolInputSchema,
} from '../../taxonomy/categories-routes.js';
import { listCategories } from '../../taxonomy/categories-service.js';
import {
  termCreateToolInputSchema,
  termListToolInputSchema,
  termPatchToolInputSchema,
} from '../../taxonomy/terms-routes.js';
import {
  createTerm,
  listTerms,
  patchTerm,
} from '../../taxonomy/terms-service.js';

/**
 * How a tool answers with a payload.
 *
 * ONE TEXT BLOCK CARRYING THE ENVELOPE THE ROUTE WOULD HAVE SENT,
 * serialised the way `res.json` serialises it — so a `Date` is the
 * same ISO string on both protocols and a client reading a tool
 * result is reading the documented response body. The envelope's
 * `success` member is kept rather than unwrapped: it costs one key
 * and it means the two answers are one shape rather than two that
 * happen to agree about the data.
 *
 * Indented, because the consumer is a model reading text rather
 * than a parser counting bytes.
 *
 * @param payload - The envelope to answer with.
 * @returns The single block a client renders.
 */
function textResult(payload: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

/**
 * The tools this wave registers.
 *
 * Eight entries: six reads and the two term edits. Written out in
 * the order the resources are met — domains, then the taxonomy
 * hanging off one, then a category's lexicon, then the personas,
 * then the deployment's own settings — so the list reads as the
 * surface rather than as an alphabet.
 *
 * `./registry.ts` spreads this into `MCP_TOOLS`. Nothing else
 * imports it, and a tool arrives by an edit to this literal.
 */
export const WAVE_1_TOOLS: readonly McpToolEntry[] = [
  {
    name: 'domains.list',
    description: 'Lists the research domains, a page at a time.',
    inputSchema: domainListToolInputSchema,
    route: 'GET /domains',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(domainListToolInputSchema, input);
      const page = await listDomains(context.store, toStoreWindow(query));
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'domains.get',
    description: 'Reads one research domain by its slug.',
    inputSchema: domainReadToolInputSchema,
    route: 'GET /domains/:slug',
    async handler(context: McpToolContext, input: unknown) {
      const { slug } = parseBody(domainReadToolInputSchema, input);

      return textResult(ok(await getDomain(context.store, slug)));
    },
  },
  {
    name: 'categories.list',
    description: 'Reads the taxonomy of one domain, with term counts.',
    inputSchema: categoryListToolInputSchema,
    route: 'GET /domains/:slug/categories',
    async handler(context: McpToolContext, input: unknown) {
      const { slug } = parseBody(categoryListToolInputSchema, input);
      const rows = await listCategories(context.store, slug);

      return textResult(ok(rows));
    },
  },
  {
    name: 'terms.list',
    description: 'Lists the terms of one category, a page at a time.',
    inputSchema: termListToolInputSchema,
    route: 'GET /categories/:id/terms',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(termListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listTerms(context.store, query.id, window);
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'personas.list',
    description: 'Lists the personas of one domain, a page at a time.',
    inputSchema: personaListToolInputSchema,
    route: 'GET /domains/:slug/personas',
    async handler(context: McpToolContext, input: unknown) {
      const query = parseBody(personaListToolInputSchema, input);
      const window = toStoreWindow(query);
      const page = await listPersonas(context.store, query.slug, window);
      const meta = buildPaginationMeta({
        page: query.page,
        perPage: query.perPage,
        total: page.total,
      });

      return textResult(okPage(page.rows, meta));
    },
  },
  {
    name: 'settings.get',
    description: 'Reads the operator settings for this deployment.',
    inputSchema: settingsReadToolInputSchema,
    route: 'GET /settings',
    async handler(context: McpToolContext, input: unknown) {
      parseBody(settingsReadToolInputSchema, input);

      return textResult(ok(await getSettings(context.store)));
    },
  },
  {
    name: 'terms.create',
    description: 'Adds one term to a category lexicon.',
    inputSchema: termCreateToolInputSchema,
    route: 'POST /categories/:id/terms',
    async handler(context: McpToolContext, input: unknown) {
      const parsed = parseBody(termCreateToolInputSchema, input);
      const { id, ...body } = parsed;
      const created = await createTerm(context.store, id, body);

      return textResult(ok(created));
    },
  },
  {
    name: 'terms.patch',
    description: 'Rewrites the supplied members of one term.',
    inputSchema: termPatchToolInputSchema,
    route: 'PATCH /terms/:id',
    async handler(context: McpToolContext, input: unknown) {
      const parsed = parseBody(termPatchToolInputSchema, input);
      const { id, ...body } = parsed;
      const patched = await patchTerm(context.store, id, body);

      return textResult(ok(patched));
    },
  },
];
