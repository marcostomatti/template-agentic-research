/**
 * @packageDocumentation
 * The OpenAPI registry, assembled from the seventeen binding tables
 * and from nothing else.
 *
 * Every router module exports one table keyed by the labels of the
 * routes it declares — `GET /domains/:slug` and its fifty-four
 * siblings — each naming the schemas that route parses a request
 * with. {@link buildOpenApiRegistry} walks those tables, splits each
 * label into a method and a path, rewrites the express `:slug`
 * spelling as the OpenAPI `{slug}` one, and registers the result.
 * Nothing here declares a route, a parameter or a schema of its own,
 * so a route added to a router without a table key is simply absent
 * from the document — which is what the coverage invariant in
 * `tests/invariants/` exists to report, and why the label is the one
 * thing this surface writes down twice.
 *
 * EXTENDZODWITHOPENAPI IS DELIBERATELY NOT CALLED. That function
 * mutates `z.ZodType.prototype` — adding `.openapi()` and wrapping
 * `optional` and `nullable` — on the single zod instance the root
 * manifest's `overrides` block pins, which is the same import every
 * request validator and every MCP tool input in this package holds.
 * A documentation generator has no business changing how the service
 * parses requests, and from v8 it does not have to: the library
 * reads zod 4's native `.meta()`, so a schema gets its component
 * name from `.meta({ id })` and no prototype is touched. Measured
 * under the zod 4.5.1 this tree resolves.
 *
 * The consequence is measured rather than assumed, and it decides
 * how the three envelopes below are registered. `OpenAPIRegistry`'s
 * own `register()` is UNUSABLE without that call: its one line is
 * `zodSchema.openapi(refId)`, which answers `TypeError:
 * zodSchema.openapi is not a function` on an unextended prototype.
 * So each envelope is named with `.meta({ id })` here and reaches
 * `components/schemas` by being REFERENCED from the responses below,
 * the generator hoisting any schema that carries an id and writing a
 * `$ref` in its place. `.meta()` CLONES rather than mutating, so the
 * consts `src/http/envelope.ts` exports carry no id at all and the
 * tagged copies in this module are the only ones that do.
 *
 * ONE HAZARD COMES WITH THAT DECISION AND NO GATE REPORTS IT. The
 * library ships a `declare module 'zod'` block, so importing it
 * anywhere puts `.openapi()` on `ZodType` for the whole program:
 * `schema.openapi('X')` in an unrelated module type-checks CLEAN and
 * throws at runtime, measured from a throwaway module in this
 * package. Nothing here imported the generator before, so the
 * augmentation arrived with this file. `./openapi.test.ts` asserts
 * the prototype is unextended and that `.openapi()` still throws,
 * which is the only reading of it that exists.
 *
 * WHAT THE RESPONSES CLAIM IS NARROWER THAN WHAT THE REQUESTS DO.
 * A binding table says what a route READS; the status it answers
 * with lives in the handler, where no generator can see it, and it
 * is not uniform — measured across the fifty-five, eight deletes
 * answer `204`, nine creates answer `201` and the rest answer `200`.
 * A per-route status map here would be a second authority for that,
 * kept in step with the handlers by nothing at all, which is the one
 * thing this design forbids. So the success side is declared once
 * and uniformly: a `2XX` carrying either success envelope, an
 * explicit `204` with NO content — an explicit code outranks its
 * range, so a delete is not documented as answering a body — and a
 * `401`, also without content, because `requireAuth` in
 * `lib/express/auth.ts` answers `{ error }` ahead of every handler
 * and that body is in neither envelope. A `422` is declared only
 * where the table names a member, a route that parses nothing having
 * nothing to refuse, and a `500` everywhere; both carry the failure
 * envelope, which is what `lib/errors/handler.ts` writes.
 *
 * The cost of that uniformity is over-declaration, and it is the
 * honest half to state: every route in the sixteen research groups
 * lists a `204` and a `2XX` whether or not it can answer both. The
 * document names the shapes this SURFACE answers, not the subset one
 * route answers. What sits under `data` stays open for the reason
 * `src/http/envelope.ts` gives at length — every record on this wire
 * is a TypeScript interface with no schema behind it — and per-record
 * response schemas are deferred, with the deferral recorded as a
 * not-enforced row in `docs/architecture/01-invariants.md`.
 *
 * THE AUTH MOUNT IS OUTSIDE ALL THREE SCHEMAS, success half
 * included, so its three routes declare descriptions and no content
 * at all. `POST /auth/login` writes a bare `{ token, sub, expiresAt
 * }`, logout writes `{ ok: true }` and introspect writes `{ active,
 * sub? }`, none of them wrapped by `ok()`; each refusal is the
 * single-key `{ error }` shape at `400`, `401` or `429`, none of
 * them the failure envelope, because those handlers parse inline and
 * the error handler `createService` registers last is reached by
 * none of them. `src/auth/routes.ts` argues all of it beside the
 * table this module reads. That split is also why the two rosters
 * below are separate, exactly as `tests/helpers/route-labels.ts`
 * keeps its auth entry apart from the sixteen it walks.
 */
import type { RouteSchemas } from './http/openapi-bindings.js';
import type {
  ResponseConfig,
  RouteConfig,
} from '@asteasolutions/zod-to-openapi';

import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { authRouteSchemas } from './auth/routes.js';
import { connectorsRouteSchemas } from './connectors/routes.js';
import { documentsRouteSchemas } from './documents/routes.js';
import { domainsRouteSchemas } from './domains/routes.js';
import { entitiesRouteSchemas } from './entities/routes.js';
import { findingsRouteSchemas } from './findings/routes.js';
import {
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
} from './http/envelope.js';
import { personasRouteSchemas } from './personas/routes.js';
import { runsRouteSchemas } from './runs/routes.js';
import { spendRouteSchemas } from './runs/spend-routes.js';
import { settingsRouteSchemas } from './settings/routes.js';
import { sourceFailuresRouteSchemas } from './sources/failures-routes.js';
import { sourceProposalsRouteSchemas } from './sources/proposals-routes.js';
import { sourcesRouteSchemas } from './sources/routes.js';
import { subscriptionsRouteSchemas } from './subscriptions/routes.js';
import { categoriesRouteSchemas } from './taxonomy/categories-routes.js';
import { termsRouteSchemas } from './taxonomy/terms-routes.js';
import { topicsRouteSchemas } from './topics/routes.js';

/** The one media type this surface reads and writes. */
const JSON_MEDIA_TYPE = 'application/json';

/**
 * The success envelope under the name the document knows it by.
 *
 * A CLONE of the export, not the export: `.meta()` returns a new
 * schema carrying the metadata, which is what keeps the id local to
 * this module and `src/http/envelope.ts`'s own const untagged.
 */
const successEnvelope = successEnvelopeSchema
  .meta({ id: 'SuccessEnvelope' });

/** {@link successEnvelope}, for the routes that answer a page. */
const paginatedEnvelope = paginatedEnvelopeSchema
  .meta({ id: 'PaginatedEnvelope' });

/** The framework's failure body, under its component name. */
const errorEnvelope = errorEnvelopeSchema
  .meta({ id: 'ErrorEnvelope' });

/**
 * What a `2XX` on the research surface carries.
 *
 * A union rather than one envelope, because which of the two a route
 * writes is a fact about its handler and not about anything it
 * parses. It emits as an `anyOf` of the two `$ref`s, which is also
 * what puts both components in the document — measured.
 *
 * This is the one composed schema in the module, and it is composed
 * for a surface where the identity rule has no subject: no handler
 * parses a response, so there is no const here to be identical to.
 */
const successBodySchema = z.union([successEnvelope, paginatedEnvelope]);

const SUCCESS_DESCRIPTION = 'One resource under `data`, or one page '
  + 'under `data` with its window under `meta`.';

const DELETED_DESCRIPTION = 'Deleted. No body at all, which is why '
  + 'neither envelope is named here.';

const UNAUTHORIZED_DESCRIPTION = 'No credential. Answered by '
  + '`requireAuth` before any handler runs, with a single-key body '
  + 'that is in neither envelope and has no schema on this surface.';

const REFUSED_DESCRIPTION = 'Refused by one of the schemas above, '
  + 'with one detail per field that failed.';

const FAILED_DESCRIPTION = 'Unhandled. The framework error handler '
  + 'answers every throw this surface does not name.';

const AUTH_SUCCESS_DESCRIPTION = 'A token, an acknowledgement or an '
  + 'introspection, each a bare object outside both envelopes.';

const AUTH_REFUSAL_DESCRIPTION = 'Refused, rate-limited or '
  + 'unauthenticated. A single-key body, and never the failure '
  + 'envelope: these handlers parse inline and reach no error '
  + 'handler.';

/**
 * The methods {@link parseRouteLabel} will accept, as a record
 * rather than a list, so the roster and the library's own union
 * cannot drift apart in either direction.
 *
 * `Record<RouteConfig['method'], true>` requires every member the
 * library declares — a method added by a later version is
 * `TS2741: Property … is missing` here — and permits no other,
 * a name the union does not carry being `TS2353`. The list form
 * closes only the second direction, an array of a union being
 * satisfied by any subset of it. The same argument, and the same
 * shape, as `ROUTE_SCHEMA_MEMBERS` in `src/http/openapi-bindings.ts`.
 *
 * Wider than this surface uses on purpose: five of the nine appear
 * in a label today. What holds the roster to what the routers
 * declare is the coverage invariant, not this record.
 */
const OPENAPI_METHODS: Readonly<Record<RouteConfig['method'], true>> = {
  get: true,
  post: true,
  put: true,
  delete: true,
  patch: true,
  head: true,
  options: true,
  trace: true,
  query: true,
};

/** A route label, split into the two things a registration needs. */
export interface RouteLabelParts {
  /** The verb, lowercased — the spelling `RouteConfig` requires. */
  readonly method: RouteConfig['method'];
  /** The path in the OpenAPI `{param}` spelling. */
  readonly path: string;
}

/**
 * Whether `value` names a method the library can register.
 *
 * @param value - A lowercased verb.
 * @returns `true` when {@link OPENAPI_METHODS} carries it.
 *
 * @remarks
 * `Object.hasOwn` rather than `in`, which walks the prototype chain
 * and would answer `true` for `constructor`.
 */
function isOpenApiMethod(value: string): value is RouteConfig['method'] {
  return Object.hasOwn(OPENAPI_METHODS, value);
}

/**
 * The OpenAPI spelling of an express path.
 *
 * @param path - A path as a router declares it, `/domains/:slug`.
 * @returns The same path with every parameter braced,
 *   `/domains/{slug}`.
 *
 * @remarks
 * A parameter name is a leading letter or underscore and then word
 * characters, which is what express accepts and what leaves every
 * other character in a literal segment alone. The rewrite is applied
 * to every parameter in the path, not only the first — no label on
 * this surface carries two today, and one that did would otherwise
 * reach the document half-converted.
 */
function openApiPathOf(path: string): string {
  return path.replace(/:([A-Za-z_]\w*)/g, '{$1}');
}

/**
 * Splits a route label into the method and path a registration
 * needs.
 *
 * @param label - `'GET /domains/:slug'`. The key of a binding table,
 *   and the same string `labelFor` in `tests/helpers/route-labels.ts`
 *   builds off a router's own stack.
 * @returns The lowercased method and the braced path.
 * @throws TypeError - When the label carries no space, when the verb
 *   is not one the library can register, or when what follows is not
 *   a path. A label that cannot be parsed is a table this module
 *   cannot describe, and dropping it silently would leave a route
 *   out of the document with nothing reporting it.
 *
 * @remarks
 * The verb is LOWERCASED rather than required to be uppercase.
 * Every label on this surface is built by a helper that uppercases,
 * so the case is uniform in practice; normalising here means the
 * parse says the same thing about `get /domains` as about
 * `GET /domains`, and the membership test runs against the
 * normalised form rather than refusing a spelling the library would
 * have accepted.
 */
export function parseRouteLabel(label: string): RouteLabelParts {
  const separator = label.indexOf(' ');

  if (separator === -1) {
    const problem = `no method in route label: ${JSON.stringify(label)}`;
    throw new TypeError(problem);
  }

  const method = label.slice(0, separator).toLowerCase();
  const path = label.slice(separator + 1);

  if (!isOpenApiMethod(method)) {
    const problem = `unregistrable method: ${JSON.stringify(label)}`;
    throw new TypeError(problem);
  }

  if (!path.startsWith('/')) {
    const problem = `no path in route label: ${JSON.stringify(label)}`;
    throw new TypeError(problem);
  }

  return { method, path: openApiPathOf(path) };
}

/**
 * One JSON response, described by a schema.
 *
 * @param description - What the status means on this surface.
 * @param schema - The body's shape. Tagged with a component id, so
 *   the generator writes a `$ref` and hoists it.
 * @returns The response the registry reads.
 */
function jsonResponse(
  description: string,
  schema: z.ZodType,
): ResponseConfig {
  return { description, content: { [JSON_MEDIA_TYPE]: { schema } } };
}

/**
 * The object a route parses one half of its request with.
 *
 * @param label - The route's label, for the refusal.
 * @param member - Which half, for the refusal.
 * @param schema - What the table bound, if it bound anything.
 * @returns The schema as an object, or `undefined` when the table
 *   bound nothing there.
 * @throws TypeError - When the binding is not an object schema.
 *
 * @remarks
 * `RouteConfig` takes an object (or a pipe over one) for `params`
 * and `query` and never a value schema, because it splits the object
 * into one parameter per member — there is nowhere for a bare string
 * schema to go. `RouteSchemas` is deliberately wider than that,
 * typing every member `z.ZodType`, so the narrowing happens here.
 * Every binding on this surface is an object today, measured; a
 * refusal rather than a skip because a dropped binding would leave a
 * route in the document with its parameters silently undescribed,
 * which is exactly the fault a document is least able to show.
 */
function routeObjectFor(
  label: string,
  member: 'params' | 'query',
  schema: z.ZodType | undefined,
): z.ZodObject | undefined {
  if (schema === undefined) return undefined;

  if (!(schema instanceof z.ZodObject)) {
    const problem = `${label}: the ${member} binding is not an object`;
    throw new TypeError(problem);
  }

  return schema;
}

/**
 * What a route reads, as the library's request configuration.
 *
 * @param label - The route's label, for a refusal raised below.
 * @param binding - The table's entry for that route.
 * @returns The three halves, each `undefined` where the table bound
 *   nothing.
 *
 * @remarks
 * A body is `required` whenever one is bound, which is true of every
 * route here: the tables bind a body only where a handler parses
 * one, and `POST /topics/:id/run-now` — the route that reads no body
 * at all — binds none.
 */
function requestFor(
  label: string,
  binding: RouteSchemas,
): RouteConfig['request'] {
  const body = binding.body;

  return {
    params: routeObjectFor(label, 'params', binding.params),
    query: routeObjectFor(label, 'query', binding.query),
    body: body === undefined
      ? undefined
      : { required: true, content: { [JSON_MEDIA_TYPE]: { schema: body } } },
  };
}

/**
 * The responses every route in the sixteen research groups declares.
 *
 * @param binding - The table's entry, read for one thing only:
 *   whether the route parses anything at all.
 * @returns The five statuses this surface answers with, or four
 *   where nothing is parsed.
 *
 * @remarks
 * The `422` is the one entry that varies, and it varies on a fact
 * the table itself carries rather than on anything written out
 * beside it. `GET /settings` binds `{}` — it takes no address, no
 * window and no body — so no request to it can be refused by a
 * schema, and declaring the refusal would describe a failure that
 * cannot happen. Every other route here binds at least one member.
 */
function envelopeResponses(binding: RouteSchemas): RouteConfig['responses'] {
  const parses = Object.keys(binding).length > 0;

  return {
    '2XX': jsonResponse(SUCCESS_DESCRIPTION, successBodySchema),
    '204': { description: DELETED_DESCRIPTION },
    '401': { description: UNAUTHORIZED_DESCRIPTION },
    ...(parses
      ? { 422: jsonResponse(REFUSED_DESCRIPTION, errorEnvelope) }
      : {}),
    '500': jsonResponse(FAILED_DESCRIPTION, errorEnvelope),
  };
}

/**
 * The responses the three routes under `/auth` declare.
 *
 * @returns A success range and a failure range, each described and
 *   neither carrying content.
 *
 * @remarks
 * No content, and no schema, because there is none to name: every
 * body this mount writes is outside all three envelopes, on both
 * halves, for the reasons the module header and `src/auth/routes.ts`
 * both give. Ranges rather than statuses for the same reason the
 * research success side uses one — `200`, `400`, `401` and `429` are
 * all reachable here and which of them a request meets is a fact
 * about the handler.
 */
function bareResponses(): RouteConfig['responses'] {
  return {
    '2XX': { description: AUTH_SUCCESS_DESCRIPTION },
    '4XX': { description: AUTH_REFUSAL_DESCRIPTION },
  };
}

/** A binding table under the tag its routes are grouped by. */
interface TaggedTable {
  /**
   * What Swagger UI groups these routes under. The path base rather
   * than the directory where the two differ: `src/subscriptions/`
   * answers under `/exports`, `src/exports/` being the renderer
   * registry and holding no route at all.
   */
  readonly tag: string;
  /** The module's exported table, read by label. */
  readonly table: Readonly<Record<string, RouteSchemas>>;
}

/**
 * The sixteen research groups, in the order a reader meets them.
 *
 * Every one of them mounts at `/` with root-absolute paths, so a
 * label needs no prefix composed into it and this roster carries no
 * mount column. `/auth` is the one exception and sits below.
 */
const ENVELOPE_TABLES: readonly TaggedTable[] = [
  { tag: 'categories', table: categoriesRouteSchemas },
  { tag: 'connectors', table: connectorsRouteSchemas },
  { tag: 'documents', table: documentsRouteSchemas },
  { tag: 'domains', table: domainsRouteSchemas },
  { tag: 'entities', table: entitiesRouteSchemas },
  { tag: 'exports', table: subscriptionsRouteSchemas },
  { tag: 'findings', table: findingsRouteSchemas },
  { tag: 'personas', table: personasRouteSchemas },
  { tag: 'runs', table: runsRouteSchemas },
  { tag: 'settings', table: settingsRouteSchemas },
  { tag: 'source-failures', table: sourceFailuresRouteSchemas },
  { tag: 'source-proposals', table: sourceProposalsRouteSchemas },
  { tag: 'sources', table: sourcesRouteSchemas },
  { tag: 'spend', table: spendRouteSchemas },
  { tag: 'terms', table: termsRouteSchemas },
  { tag: 'topics', table: topicsRouteSchemas },
];

/** The seventeenth table, kept apart for the reasons above. */
const AUTH_TABLE: TaggedTable = { tag: 'auth', table: authRouteSchemas };

/**
 * Registers every route one table declares.
 *
 * @param registry - Where the registrations land.
 * @param tagged - The table and the tag its routes are grouped by.
 * @param responsesFor - What its routes answer with. The one thing
 *   that differs between the research groups and `/auth`, handed in
 *   rather than branched on inside, so the difference is legible at
 *   the two call sites.
 *
 * @remarks
 * The label becomes the operation's `summary` as well as its method
 * and path, which is what makes a rendered document searchable by
 * the same string the tables, the routers and the coverage invariant
 * all use.
 */
function registerTable(
  registry: OpenAPIRegistry,
  tagged: TaggedTable,
  responsesFor: (binding: RouteSchemas) => RouteConfig['responses'],
): void {
  for (const [label, binding] of Object.entries(tagged.table)) {
    const { method, path } = parseRouteLabel(label);

    registry.registerPath({
      method,
      path,
      summary: label,
      tags: [tagged.tag],
      request: requestFor(label, binding),
      responses: responsesFor(binding),
    });
  }
}

/**
 * The registry every generated document is built from.
 *
 * @returns A fresh {@link OpenAPIRegistry} carrying one registration
 *   per binding-table key across all seventeen tables.
 *
 * @remarks
 * Fresh on every call rather than a module-scope singleton: a
 * registry is a mutable accumulator, and a caller that generated a
 * document from a shared one after another caller had added to it
 * would get a document neither of them asked for. The three envelope
 * components are the shared state that remains, and they are
 * immutable schemas rather than accumulators.
 */
export function buildOpenApiRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  for (const tagged of ENVELOPE_TABLES) {
    registerTable(registry, tagged, envelopeResponses);
  }

  registerTable(registry, AUTH_TABLE, bareResponses);

  return registry;
}
