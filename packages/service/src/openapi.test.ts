/**
 * `parseRouteLabel`, `buildOpenApiRegistry` and
 * `generateOpenApiDocument` — the label the document restates, the
 * registrations it is assembled from, and the document itself.
 *
 * The parse is the one thing in `./openapi.ts` with a claim of its
 * own. Everything else there is assembly: a schema it registers
 * came from a binding table, and the identity case below is where
 * the two are held together — nothing under `tests/` reads this
 * registry at all, measured, so the comparison lives here and
 * nowhere else. A label it splits wrong becomes a path nothing
 * else reads. So the four parse rows are shapes rather than a
 * sample, and two of them are unreachable from any real label —
 * no route on this surface carries two parameters, and every label a
 * router produces is uppercased by the helper that builds it. They
 * are here because a document is exactly where an unexercised branch
 * goes unnoticed: half-converting a two-parameter path would render
 * as a literal segment nobody could call.
 *
 * THE IDENTITY CASE IS THE GATE ON THE ONE RULE THE ASSEMBLY HAS,
 * and the reason `toBe` appears in a file otherwise written in
 * `toStrictEqual`. A binding table names the const its handler
 * parses with BY IDENTITY, so a registration that RESTATED one —
 * wrote the same members out a second time instead of binding the
 * module's own object — would describe a request shape no route is
 * judged against, with the route still in the document and every
 * structural compare green. The control is that restatement,
 * `domainAddressSchema`'s own declaration written out a second
 * time: two such declarations are `toStrictEqual` to each other
 * and are different objects, measured, so a structural compare is
 * satisfied by exactly the fault this case exists to find.
 *
 * IT COMPARES TWO RESTATEMENTS RATHER THAN A RESTATEMENT AND THE
 * BINDING, which is the shape a reader would reach for first, and
 * the reason is measured. zod installs its instance methods
 * LAZILY, so a schema the generator has already walked carries own
 * properties a freshly declared twin does not — `shape` and `meta`
 * here — and the restatement held against the real binding answers
 * DIFFERS, with `Compared values have no visual difference`
 * printed beneath it. `toStrictEqual` on a zod schema therefore
 * reads which methods have been touched rather than what the
 * schema describes, which makes it the wrong instrument in both
 * directions and is the deeper reason the rule gated here is
 * identity.
 *
 * Two readings keep that zero from being a zero over less. The
 * seventeen tables are transcribed here a second time rather than
 * read back out of the module under test, and every label the
 * registry registered is asserted to come from one of them — a
 * module dropped from the roster would otherwise shrink the
 * population silently. And the walk answers more members than
 * there are routes, most routes binding two.
 *
 * One case is deliberately weak and one is what covers it. Asserting
 * that a registration matches its own label parsed — the round trip
 * below — cannot see a broken conversion at all, both sides calling
 * the same function: dropping the rewrite entirely leaves that case
 * GREEN, measured. What reads it is the case that asserts no
 * registered path carries a colon, with the count of braced paths
 * asserted non-zero beside it so the same case cannot pass over a
 * registry that registered nothing.
 *
 * The three refusals each carry an accepting label varied along the
 * one axis the row is about, because a refusal reads identically
 * against a parse that refuses everything; their axes are asserted
 * distinct, so a row edited into a duplicate of its neighbour is
 * named rather than counted twice.
 *
 * The last two cases are about the zod instance rather than about
 * this module, and they are the only reading of the decision the
 * module header argues at length. `check-types` has nothing to say
 * there: the library ships a `declare module 'zod'` block, so
 * `.openapi()` type-checks on every schema in this package the
 * moment anything imports the generator, and only a runtime case can
 * tell an extended prototype from an unextended one. Each carries
 * its own control — the native `.meta()` path working on the very
 * schema whose `.openapi()` throws, and the registered component's
 * id read beside the three exports that must carry none.
 *
 * The document cases read three things the registry cases cannot.
 * The dialect is asserted twice over — the `openapi` field, which
 * is only the constant handed to the generator, and beside it the
 * NUMERIC `exclusiveMinimum` the 3.1 emission uses where 3.0 wants a
 * boolean flag, which is the half that says `OpenApiGeneratorV31`
 * actually ran. Every component the document hoists is asserted as a
 * SET, because `generateDocument` answers `components.schemas` as an
 * empty object when nothing is registered and a defined-ness check
 * would pin nothing. And the version is compared against a manifest
 * this file reads by a path of its own, so the two mechanisms are
 * independent rather than the module compared with itself.
 *
 * THE CREDENTIAL CASE IS A ZERO, so most of it is the reading that
 * keeps the zero from being one over nothing. The walk collects
 * every value the document DOCUMENTS — whatever sits under an
 * `example`, `examples`, `default`, `enum` or `const`, flattened
 * through arrays and objects alike — and refuses one naming a member
 * the connector mask covers, one under a `config` property that is
 * not the mask, and one whose text is credential-shaped. Measured
 * over this document: 83 documented values of which 55 are strings,
 * the longest thirteen characters, and no fault at all. The
 * population is asserted non-empty in the same case, because a walk
 * that collected nothing answers the same zero.
 *
 * ITS FOUR PLANTS ARE THE CONTROL, each a CLONE of the real document
 * carrying one `example` the document does not have, on a member
 * read out of the real document first — so the plants land on
 * `properties.config`, `properties.token` and `properties.name` as
 * this surface actually declares them, and a member that has moved
 * fails naming the walk rather than planting into a branch nothing
 * has. Each row is compared whole, reason and position together, so
 * a fault raised for the wrong reason or at the wrong member is
 * named rather than counted. The fourth row is the positive control
 * on the one exemption: the SAME member as the third, carrying
 * `MASKED_SECRET`, answering nothing — which is what says the rule
 * refuses a VALUE and not a position.
 *
 * The four credential shapes carry a battery of their own in that
 * case, a pattern that had gone dead being invisible in a zero. Each
 * row's sample must match its OWN row and no other, and each row's
 * near miss none at all, which is liveness and distinctness in one
 * comparison. They are shapes and not vendors on purpose: a roster
 * of issuer prefixes would be a second authority nothing here
 * maintains. Which KEYS carry a secret is not a second authority
 * either — `SECRET_CONFIG_KEYS` is read straight out of
 * `src/connectors/secrets.ts`, the module `MASKED_SECRET` comes
 * from.
 *
 * ONE OF THOSE RULES IS DELIBERATELY NARROWER THAN IT SOUNDS. A
 * value is refused for its PATH only where a schema PROPERTY names
 * the config, not wherever the word appears: two routes here answer
 * under `/sources/{id}/pending-configs` and
 * `/sources/{id}/approve-config`, so a substring test over the whole
 * path claims everything they declare. Measured, 41 strings in this
 * document sit under a path naming config that way, and every one of
 * them is a type, a name, a `$ref` or prose.
 *
 * ONE LIMIT IS WORTH STATING BECAUSE IT IS INVISIBLE. A version
 * written here as a literal that HAPPENS to match the manifest is
 * green, measured — `readServiceVersion()` replaced by the current
 * `0.1.0` reds nothing at all, where the same replacement varied to
 * `9.9.9` reds the version case. No case can tell a correct literal
 * from a read; what the case does report is a literal left behind
 * when the manifest moves, which is the failure that actually
 * happens.
 *
 * Mutation grid, eleven legs over the module, measured at the 20
 * cases this file then had and restored byte-identical. `red` counts
 * cases; `tsc` counts diagnostics from `bun x tsc --noEmit`, and
 * TS6133 is what a leg that leaves a helper uncalled answers with
 * rather than anything about the claim under test.
 *
 * Returning the path unconverted answered red=4 then and red=5 now —
 * three parse rows, the colon case and the document paths case, the
 * round trip green as above. Dropping the `g` flag so only the first
 * parameter is rewritten reds exactly ONE, the two-parameter row,
 * which is that row's whole reason to exist. Not lowercasing the
 * verb is the odd leg: every label then fails the membership test,
 * `buildOpenApiRegistry` throws while this file is still importing,
 * and vitest reports red=0 of 0 with the SUITE failed — the shape a
 * leg that killed collection takes, and not a leg nothing covers.
 * Calling `extendZodWithOpenApi` reds 1, the prototype case, and
 * nothing else at either gate.
 *
 * The assembly legs each land on one case. Declaring the `422`
 * unconditionally reds the pair that reads `GET /settings` against
 * `GET /domains`; giving the auth mount the envelope responses reds
 * the case that asserts a described-but-unnamed body; tagging every
 * group `domains` reds the tag case; and dropping the id from the
 * error envelope reds 3 now against 2 then, the two components cases
 * and the control beside the untagged exports. Two legs are wider by
 * construction: not registering the auth table reds 3, since two
 * cases look a route up by a label that has gone, and registering
 * the path as the summary reds 8 for the same reason — a lookup that
 * throws is the design, so those counts are the helper working
 * rather than over-coupling. The remaining seven legs were not
 * re-run against the five cases added here, so their figures are as
 * first measured.
 *
 * Six further legs, over the document half, each landing on exactly
 * one case with the no-patch control at 0 of 25. Declaring the
 * dialect `3.0.3` and constructing an `OpenApiGeneratorV3` instead
 * both red the dialect case, one through each of its two halves.
 * Varying the version literal reds the version case. Spelling the
 * server URL with a literal port, and dropping the `servers` entry
 * outright, both red the server case.
 *
 * Neither grid was re-run against the identity case, so both
 * denominators are the case counts at the time they were taken.
 * That case has a grid of its own, four legs at 26 cases with the
 * no-patch control at 0. Registering `params` and `query` as a
 * CLONE of what the table bound, and registering the body as one,
 * each red EXACTLY it and nothing else, which is the whole claim:
 * nothing else in this tree can see a re-wrap. Dropping a table
 * from the assembly reds nine, the identity case among them, six
 * of the others looking a route up by a label that has gone. And
 * dropping one module from the roster this file transcribes reds
 * the identity case alone, through its coverage half rather than
 * its identity one.
 *
 * The credential case has a grid of its own, ten legs at 27 cases
 * with the no-patch control at 0, and NINE of them land on exactly
 * it. Stopping the walk from descending, emptying the value-key
 * roster, answering false from either key rule, dropping the mask
 * exemption, making one shape unmatchable, widening the config rule
 * to a bare substring over the whole path, reporting a fault at the
 * wrong position and matching every shape against everything each
 * red it and nothing else, which is what says the readings inside it
 * are separate rather than one assertion with decoration. TWO OF
 * THEM WERE GREEN WHEN FIRST MEASURED and the case grew the readings
 * that catch them: the descent, because a single string default
 * outside every enum kept the string count non-zero on its own, and
 * the narrowing, because nothing this document documents sits under
 * a URL naming config until a reading goes looking for it. The tenth
 * leg is on the module rather than on this file — dropping the
 * connectors table from the assembly reds TWO, this case and the
 * identity one, because the plants read their member out of the real
 * document before planting and a member that has gone fails there.
 */
import type { RouteSchemas } from './http/openapi-bindings.js';
import type { RouteLabelParts } from './openapi.js';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { authRouteSchemas } from './auth/routes.js';
import { config } from './config.js';
import { connectorsRouteSchemas } from './connectors/routes.js';
import { MASKED_SECRET, SECRET_CONFIG_KEYS } from './connectors/secrets.js';
import { documentsRouteSchemas } from './documents/routes.js';
import { domainsRouteSchemas } from './domains/routes.js';
import { entitiesRouteSchemas } from './entities/routes.js';
import { findingsRouteSchemas } from './findings/routes.js';
import {
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
} from './http/envelope.js';
import { slugParamSchema } from './http/schemas.js';
import {
  buildOpenApiRegistry,
  generateOpenApiDocument,
  parseRouteLabel,
} from './openapi.js';
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

type Registry = ReturnType<typeof buildOpenApiRegistry>;
type Definition = Registry['definitions'][number];
type Response = RouteConfig['responses'][string];

/** The one media type the registrations carry. */
const JSON_MEDIA = 'application/json';

/** One label the parse must read, and what it must read it as. */
interface ParseCase {
  /** What the row is about, and what the case is named after. */
  readonly shape: string;
  /** The label handed to the parse. */
  readonly label: string;
  /** What it must answer. */
  readonly parsed: RouteLabelParts;
}

/**
 * The label shapes the parse has to get right. The first two are the
 * ones no real label exercises — nothing on this surface carries two
 * parameters, and a lowercase verb is unreachable from a helper that
 * uppercases — which is exactly why they are written out here.
 */
const PARSED: readonly ParseCase[] = [
  {
    shape: 'a path carrying two parameters',
    label: 'GET /domains/:slug/topics/:id',
    parsed: { method: 'get', path: '/domains/{slug}/topics/{id}' },
  },
  {
    shape: 'a path carrying no parameter',
    label: 'GET /settings',
    parsed: { method: 'get', path: '/settings' },
  },
  {
    shape: 'a label whose method is lowercase',
    label: 'get /domains/:slug',
    parsed: { method: 'get', path: '/domains/{slug}' },
  },
  {
    shape: 'a parameter followed by a literal segment',
    label: 'POST /topics/:id/run-now',
    parsed: { method: 'post', path: '/topics/{id}/run-now' },
  },
];

/**
 * One label the parse must refuse, beside one it must accept that
 * differs along the single axis the row is about — a refusal reads
 * identically against a parse that refuses everything.
 */
interface RefusalCase {
  /** What the pair differs on, and what the case is named after. */
  readonly axis: string;
  /** The label under test. */
  readonly refused: string;
  /** The control, varied along `axis` alone. */
  readonly accepted: string;
}

/** The three ways a string fails to be a route label. */
const REFUSED: readonly RefusalCase[] = [
  {
    axis: 'a label carrying no space at all',
    refused: 'GET',
    accepted: 'GET /domains',
  },
  {
    axis: 'a method the library cannot register',
    refused: 'FETCH /domains',
    accepted: 'GET /domains',
  },
  {
    axis: 'a path with no leading slash',
    refused: 'GET domains',
    accepted: 'GET /domains',
  },
];

/**
 * Every route the registry carries, read once. `definitions` is a
 * getter over an array the registry accumulates, so this is a
 * snapshot of one build rather than a live view of a shared one.
 */
const REGISTRY = buildOpenApiRegistry();

/**
 * The registered routes, and the definitions that are not routes.
 *
 * @param definition - One entry of the registry's definition list.
 * @returns The route it carries, or nothing.
 */
function routeOf(definition: Definition): RouteConfig[] {
  return definition.type === 'route'
    ? [definition.route]
    : [];
}

const ROUTES = REGISTRY.definitions.flatMap(routeOf);

/**
 * The JSON body a response describes, if it describes one.
 *
 * @param response - One entry of a route's `responses`.
 * @returns Whatever was bound under `application/json`, unnarrowed.
 */
function bodySchemaOf(response: Response): unknown {
  const content = 'content' in response
    ? response.content
    : undefined;
  const media = content?.[JSON_MEDIA];

  return media !== undefined && 'schema' in media
    ? media.schema
    : undefined;
}

/**
 * The component name a schema carries, if it carries one.
 *
 * @param value - A bound schema, or anything else.
 * @returns The `id` its metadata names — what the generator hoists
 *   it into `components/schemas` under — or nothing.
 */
function componentIdOf(value: unknown): string | undefined {
  return value instanceof z.ZodType
    ? value.meta()?.id
    : undefined;
}

/**
 * The route registered under one label.
 *
 * @param summary - The label, which every registration carries as
 *   its `summary`.
 * @returns The registration.
 * @throws Error - When no route carries that label, so a case naming
 *   a route that has moved fails here rather than reading a member
 *   off `undefined` two lines later.
 */
function routeLabelled(summary: string): RouteConfig {
  const route = ROUTES.find((candidate) => candidate.summary === summary);

  if (route === undefined) throw new Error(`no route labelled ${summary}`);

  return route;
}

/**
 * The response a route declares for one status.
 *
 * @param route - A registration.
 * @param status - The key, `'2XX'` and `'500'` included.
 * @returns The response.
 * @throws Error - When the route declares no such status, so a case
 *   about a response that has moved fails here rather than reading a
 *   body off nothing and passing.
 */
function responseOf(route: RouteConfig, status: string): Response {
  const response = route.responses[status];

  if (response === undefined) {
    throw new Error(`${route.summary ?? ''} declares no ${status}`);
  }

  return response;
}

/** One router module's exported binding table. */
interface ExportedTable {
  /** The module under `src/`, as a failure has to name it. */
  readonly module: string;

  /** What that module exports, read by route label. */
  readonly table: Readonly<Record<string, RouteSchemas>>;
}

/**
 * The seventeen tables, under the modules that declare them.
 *
 * Transcribed here a second time on purpose. A roster read back out
 * of `./openapi.ts` could only ever agree with the module under
 * test; this is an independent list of what the routers export, and
 * the case below asserts the registry registered no label a table
 * here does not carry.
 */
const EXPORTED_TABLES: readonly ExportedTable[] = [
  { module: 'auth', table: authRouteSchemas },
  { module: 'connectors', table: connectorsRouteSchemas },
  { module: 'documents', table: documentsRouteSchemas },
  { module: 'domains', table: domainsRouteSchemas },
  { module: 'entities', table: entitiesRouteSchemas },
  { module: 'findings', table: findingsRouteSchemas },
  { module: 'personas', table: personasRouteSchemas },
  { module: 'runs', table: runsRouteSchemas },
  { module: 'runs/spend', table: spendRouteSchemas },
  { module: 'settings', table: settingsRouteSchemas },
  { module: 'sources', table: sourcesRouteSchemas },
  { module: 'sources/failures', table: sourceFailuresRouteSchemas },
  { module: 'sources/proposals', table: sourceProposalsRouteSchemas },
  { module: 'subscriptions', table: subscriptionsRouteSchemas },
  { module: 'taxonomy/categories', table: categoriesRouteSchemas },
  { module: 'taxonomy/terms', table: termsRouteSchemas },
  { module: 'topics', table: topicsRouteSchemas },
];

/** Every label those tables key, for the coverage half below. */
const EXPORTED_LABELS = new Set(
  EXPORTED_TABLES.flatMap((entry) => Object.keys(entry.table)),
);

/** One schema a table binds, named as a failure has to name it. */
interface NamedBinding {
  /** `<module> <label> <member>`. */
  readonly name: string;

  /** The label, which is how the registration is found again. */
  readonly label: string;

  /** Which half of the request: `params`, `query` or `body`. */
  readonly member: string;

  /** The object the module's own export holds there. */
  readonly held: unknown;
}

/**
 * Every schema those tables bind, flattened and named.
 *
 * @param roster - The tables to read.
 * @returns One entry per bound member. A route that binds nothing
 *   contributes none, which `GET /settings` really does.
 *
 * @remarks
 * The spread is what gets the members out at all: `RouteSchemas` is
 * an interface and carries no index signature, so `Object.entries`
 * over one answers `any`, where the same call over the anonymous
 * type a spread produces answers the members.
 */
function bindingsExported(
  roster: readonly ExportedTable[],
): NamedBinding[] {
  const bindings: NamedBinding[] = [];

  for (const entry of roster) {
    for (const [label, binding] of Object.entries(entry.table)) {
      const bound: Record<string, unknown> = { ...binding };

      for (const [member, held] of Object.entries(bound)) {
        const name = `${entry.module} ${label} ${member}`;

        bindings.push({ name, label, member, held });
      }
    }
  }

  return bindings;
}

/**
 * What the registry registered for one half of a request.
 *
 * @param route - A registration.
 * @param member - `params`, `query` or `body`.
 * @returns Whatever sits there, unnarrowed: the identity is the
 *   subject here, so the type is deliberately not asserted. A body
 *   is reached through its media entry, which the library types as
 *   a reference OR a media object, so the narrowing is the same one
 *   {@link bodySchemaOf} makes on the response side.
 * @throws Error - On any other member name, so a member added to
 *   `RouteSchemas` and bound by a table fails here rather than
 *   going quietly uncompared.
 */
function registeredMemberOf(route: RouteConfig, member: string): unknown {
  const request = route.request;

  if (member === 'params') return request?.params;
  if (member === 'query') return request?.query;

  if (member === 'body') {
    const media = request?.body?.content[JSON_MEDIA];

    return media !== undefined && 'schema' in media
      ? media.schema
      : undefined;
  }

  throw new Error(`${route.summary ?? ''} binds an unknown ${member}`);
}

/**
 * The bindings the registry did NOT register by identity.
 *
 * @param bindings - Per {@link bindingsExported}.
 * @returns One name per binding whose registration is a different
 *   object from the one its module exports. Empty is the passing
 *   answer, and any member names the module, the route and the
 *   half rather than reporting a count.
 */
function restatedAmong(bindings: readonly NamedBinding[]): string[] {
  const moved = bindings.filter((binding) => {
    const route = routeLabelled(binding.label);

    return registeredMemberOf(route, binding.member) !== binding.held;
  });

  return moved.map((binding) => binding.name);
}

/**
 * One binding out of the walk, by name.
 *
 * @param bindings - Per {@link bindingsExported}.
 * @param name - `<module> <label> <member>`.
 * @returns That binding.
 * @throws Error - When nothing carries the name, so a case about a
 *   binding that has moved fails naming it rather than reading a
 *   member off `undefined` two lines later.
 */
function bindingNamed(
  bindings: readonly NamedBinding[],
  name: string,
): NamedBinding {
  const found = bindings.find((binding) => binding.name === name);

  if (found === undefined) throw new Error(`no binding named ${name}`);

  return found;
}

/**
 * The binding the identity case restates.
 *
 * `domainAddressSchema`, which `src/domains/routes.ts` declares as
 * `z.object({ slug: slugParamSchema }).strict()` and deliberately
 * keeps private — so the restatement below is that declaration
 * written out a second time, which is what a registration going
 * around the table would look like, rather than a schema invented
 * to fail.
 */
const RESTATED_BINDING = 'domains GET /domains/:slug params';

/**
 * The document every case below reads, generated once.
 *
 * Once rather than per case because generation walks all seventeen
 * tables, and because the two cases that vary the port build their
 * own anyway.
 */
const DOCUMENT = generateOpenApiDocument();

/** A port no configuration here uses, for the derivation case. */
const UNUSED_PORT = 41999;

/**
 * One member of a nested plain-object value, unnarrowed.
 *
 * @param value - Where the walk starts.
 * @param keys - One key per level.
 * @returns Whatever sits there.
 * @throws Error - As soon as a level is absent, so a case about a
 *   member that has moved fails naming the walk rather than reading
 *   a property off `undefined` two lines later.
 */
function memberAt(value: unknown, ...keys: readonly string[]): unknown {
  let cursor = value;

  for (const key of keys) {
    if (cursor === null || typeof cursor !== 'object') {
      throw new Error(`no ${keys.join('.')} in the document`);
    }

    cursor = (cursor as Record<string, unknown>)[key];

    if (cursor === undefined) {
      throw new Error(`no ${keys.join('.')} in the document`);
    }
  }

  return cursor;
}

/**
 * Every value one key carries anywhere below a document.
 *
 * @param value - Where the walk starts.
 * @param key - The key to collect.
 * @returns One entry per occurrence, at any depth, arrays included.
 *
 * @remarks
 * The walk does NOT descend into a value it has just collected,
 * which is what keeps a nested homonym from being counted twice. No
 * key read here nests inside itself today; the rule is written down
 * because a reader cannot tell from the call site.
 */
function valuesUnder(value: unknown, key: string): unknown[] {
  if (value === null || typeof value !== 'object') return [];

  const members = Object.entries(value as Record<string, unknown>);

  return members.flatMap(([name, member]) => (name === key
    ? [member]
    : valuesUnder(member, key)));
}

/**
 * The keys an OpenAPI document writes a VALUE under, as opposed to
 * a type, a name, a reference or prose.
 *
 * `example`, `examples` and `const` are in the roster although this
 * generator emits none of them today — measured, v9 renders a
 * `z.literal()` as a single-member `enum` rather than as `const`,
 * and no schema on this surface carries an example at all. They are
 * here because the rule below is about where a credential CAN land
 * in a document of this dialect, and the day one arrives is exactly
 * the day nobody re-reads this file.
 */
const VALUE_KEYS = new Set([
  'const',
  'default',
  'enum',
  'example',
  'examples',
]);

/** One value a document documents, and where it sits. */
interface DocumentedValue {
  /** The key path joined, which is how a fault names it. */
  readonly path: string;

  /** The same path split, which is what the two key rules read. */
  readonly segments: readonly string[];

  /** The scalar itself. */
  readonly value: unknown;
}

/**
 * Every scalar at or below one documented value.
 *
 * @param value - Whatever a value key carries. An `enum` is an
 *   array and an `examples` an object, so both are flattened rather
 *   than read as one member, an index becoming a path segment.
 * @param segments - The key path so far.
 * @param into - Where the scalars land.
 */
function scalarsUnder(
  value: unknown,
  segments: readonly string[],
  into: DocumentedValue[],
): void {
  if (value === null || typeof value !== 'object') {
    into.push({ path: segments.join('.'), segments, value });

    return;
  }

  const members = Object.entries(value as Record<string, unknown>);

  for (const [key, member] of members) {
    scalarsUnder(member, [...segments, key], into);
  }
}

/**
 * Walks a document looking for the values it documents.
 *
 * @param value - Where the walk is.
 * @param segments - The key path so far.
 * @param into - Where {@link scalarsUnder} puts what it finds.
 */
function walkForValues(
  value: unknown,
  segments: readonly string[],
  into: DocumentedValue[],
): void {
  if (value === null || typeof value !== 'object') return;

  const members = Object.entries(value as Record<string, unknown>);

  for (const [key, member] of members) {
    const next = [...segments, key];

    if (VALUE_KEYS.has(key)) scalarsUnder(member, next, into);
    else walkForValues(member, next, into);
  }
}

/**
 * Every value a document documents, at any depth.
 *
 * @param document - A generated document, or a planted copy of one.
 * @returns One entry per scalar under a {@link VALUE_KEYS} member.
 *   Measured over this surface: 83, of which 55 are strings and the
 *   longest is thirteen characters.
 */
function documentedValuesIn(document: unknown): DocumentedValue[] {
  const found: DocumentedValue[] = [];

  walkForValues(document, [], found);

  return found;
}

/**
 * Whether a collected value is a container rather than a scalar.
 *
 * @param value - One documented value.
 * @returns `true` for an array or an object, either of which the
 *   walk is supposed to have descended into rather than collected.
 */
function isContainer(value: unknown): boolean {
  return value !== null && typeof value === 'object';
}

/** The connector mask roster, lower-cased once for the rule below. */
const SECRET_KEYS = new Set<string>(
  SECRET_CONFIG_KEYS.map((key) => key.toLowerCase()),
);

/**
 * Whether a key path passes through a member the mask covers.
 *
 * @param segments - A documented value's path.
 * @returns `true` when a segment names one of the keys
 *   `src/connectors/secrets.ts` masks on the way out. That module
 *   is this repository's one authority for which names carry a
 *   secret, and it is read here rather than transcribed — the same
 *   module {@link MASKED_SECRET} comes from.
 */
function namesSecret(segments: readonly string[]): boolean {
  return segments.some((segment) => SECRET_KEYS.has(segment.toLowerCase()));
}

/**
 * Whether a key path passes through a schema property named for a
 * configuration.
 *
 * @param segments - A documented value's path.
 * @returns `true` when a segment immediately under a `properties`
 *   object is named `config` or ends in it, `parserConfig` on a
 *   source being the second member of that family.
 *
 * @remarks
 * The `properties` predecessor is load-bearing rather than
 * decoration, and the measurement says so. Two routes on this
 * surface answer under paths carrying the word —
 * `/sources/{id}/pending-configs` and `/sources/{id}/approve-config`
 * — so a bare substring test over the whole path claims everything
 * they declare: 41 strings in this document sit under a path naming
 * config that way, and every one of them is a type, a name, a
 * `$ref` or a description.
 */
function namesConfig(segments: readonly string[]): boolean {
  for (const [index, segment] of segments.entries()) {
    if (segments[index - 1] !== 'properties') continue;

    if (segment.toLowerCase().endsWith('config')) return true;
  }

  return false;
}

/** One way a documented value reads as a credential. */
interface CredentialShape {
  /** What the row is about, and what a fault is named after. */
  readonly id: string;

  /** What it matches. */
  readonly pattern: RegExp;

  /** A value it MUST match, so no row can go quietly dead. */
  readonly sample: string;

  /** A value it must NOT match, varied along that row's own axis. */
  readonly nearMiss: string;
}

/** One `Authorization` value written out, and the first plant. */
const BEARER_SAMPLE = 'Bearer nnnn-not-a-real-credential';

/**
 * The shapes a credential takes on a wire.
 *
 * Shapes rather than vendors on purpose: a roster of issuer
 * prefixes would be a second authority nothing here maintains, and
 * these are what a leak looks like whoever issued it. Which KEYS
 * carry a secret is a different question and is not answered here
 * — {@link namesSecret} reads the mask roster for that.
 *
 * The length floor on the last row is measured rather than picked.
 * The longest string this document documents is thirteen
 * characters, so twenty-four clears every enum member the sixteen
 * groups emit; re-measure it before adding a schema whose legal
 * values are long and opaque.
 */
const CREDENTIAL_SHAPES: readonly CredentialShape[] = [
  {
    id: 'bearer-credential',
    pattern: /bearer\s+\S/i,
    sample: BEARER_SAMPLE,
    nearMiss: 'bearer',
  },
  {
    id: 'authority-credential',
    pattern: /:\/\/[^\s/@]+:[^\s/@]+@/,
    sample: 'https://svc:nnnn@example.invalid/feed',
    nearMiss: 'https://example.invalid:8443/feed',
  },
  {
    id: 'private-key-block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    sample: '-----BEGIN PRIVATE KEY-----',
    nearMiss: '-----BEGIN CERTIFICATE-----',
  },
  {
    id: 'opaque-token',
    pattern: /(?=[\w-]*[A-Za-z])(?=[\w-]*\d)[\w-]{24,}/,
    sample: 'aaaa1111bbbb2222cccc3333dddd',
    nearMiss: 'notification_channels_and_more',
  },
];

/** A documented value under a key the connector mask covers. */
const SECRET_KEY_REASON = 'a member the connector mask covers';

/** A documented string under a config property, unmasked. */
const CONFIG_REASON = 'an unmasked config member';

/** One credential a document documents, and where. */
interface CredentialFault {
  /** Which rule it breaks, or which shape it matches. */
  readonly reason: string;

  /** The key path, so a failure names the position. */
  readonly path: string;
}

/**
 * Why one documented value is a credential, if it is.
 *
 * @param documented - One value out of the walk.
 * @returns One reason per rule it breaks. Empty is the passing
 *   answer, and what every value in this document answers.
 *
 * @remarks
 * STRINGS only. A `default: 50` on `?perPage` is a documented value
 * and cannot be a credential, and reading non-strings would red
 * this against the twenty-seven numeric defaults the paged routes
 * already emit.
 *
 * {@link MASKED_SECRET} is the one exemption and it is uniform
 * across both key rules, because it is exactly what a document
 * SHOULD say a masked member reads as. It exempts the VALUE and
 * never the position, which is what the fourth plant below reads.
 */
function reasonsFor(documented: DocumentedValue): string[] {
  const { segments, value } = documented;

  if (typeof value !== 'string') return [];

  const masked = value === MASKED_SECRET;
  const reasons: string[] = [];

  if (namesSecret(segments) && !masked) reasons.push(SECRET_KEY_REASON);
  if (namesConfig(segments) && !masked) reasons.push(CONFIG_REASON);

  for (const shape of CREDENTIAL_SHAPES) {
    if (shape.pattern.test(value)) reasons.push(shape.id);
  }

  return reasons;
}

/**
 * Every credential a document documents.
 *
 * @param document - A generated document, or a planted copy of one.
 * @returns One fault per rule broken, carrying the reason and the
 *   position, so a failure names both rather than reporting a
 *   count. Empty is the passing answer.
 */
function credentialsIn(document: unknown): CredentialFault[] {
  const found: CredentialFault[] = [];

  for (const documented of documentedValuesIn(document)) {
    for (const reason of reasonsFor(documented)) {
      found.push({ reason, path: documented.path });
    }
  }

  return found;
}

/** Where the connectors body documents its operator config. */
const CONFIG_MEMBER: readonly string[] = [
  'paths', '/connectors', 'post', 'requestBody', 'content',
  JSON_MEDIA, 'schema', 'properties', 'config',
];

/** Where the logout body documents the credential it revokes. */
const SECRET_MEMBER: readonly string[] = [
  'paths', '/auth/logout', 'post', 'requestBody', 'content',
  JSON_MEDIA, 'schema', 'properties', 'token',
];

/** A member neither key rule is about, for the value-shape row. */
const NEUTRAL_MEMBER: readonly string[] = [
  'paths', '/domains', 'post', 'requestBody', 'content',
  JSON_MEDIA, 'schema', 'properties', 'name',
];

/** What an operator would have sent, and no rule reads as a shape. */
const OPERATOR_VALUE = 'whatever the operator sent';

/** One planted example, and the faults the walk must answer with. */
interface PlantCase {
  /** What the row is about, and what names it in a failure. */
  readonly plant: string;

  /** The schema member the planted `example` lands on. */
  readonly at: readonly string[];

  /** What that example carries. */
  readonly value: string;

  /** Every reason the walk must answer, in the order it answers. */
  readonly reasons: readonly string[];
}

/**
 * The plants that make the zero above a reading.
 *
 * Each lands on a member this surface really declares, which is
 * what says the walk reaches the depth a leak would sit at rather
 * than that it can find a value in a document shaped for it. The
 * last row is the positive control on the one exemption: the SAME
 * member as the row above it, carrying the mask, answering nothing
 * — a rule that refused the position rather than the value would
 * red there.
 */
const PLANTED: readonly PlantCase[] = [
  {
    plant: 'a credential-shaped example on an ordinary member',
    at: NEUTRAL_MEMBER,
    value: BEARER_SAMPLE,
    reasons: ['bearer-credential'],
  },
  {
    plant: 'an example on a member the connector mask covers',
    at: SECRET_MEMBER,
    value: OPERATOR_VALUE,
    reasons: [SECRET_KEY_REASON],
  },
  {
    plant: 'an unmasked example on a config member',
    at: CONFIG_MEMBER,
    value: OPERATOR_VALUE,
    reasons: [CONFIG_REASON],
  },
  {
    plant: 'the mask itself, on that same config member',
    at: CONFIG_MEMBER,
    value: MASKED_SECRET,
    reasons: [],
  },
];

/**
 * A copy of the real document carrying one example it does not
 * have.
 *
 * @param at - The member the example lands on. Read out of the real
 *   document first, so a member that has moved fails naming the
 *   walk rather than planting into a branch nothing has.
 * @param value - What the planted `example` carries.
 * @returns The copy. {@link DOCUMENT} is module-scope and every
 *   other case here reads it, so the plant clones and the case
 *   asserts it stayed as it was.
 */
function documentPlanting(at: readonly string[], value: string): unknown {
  const planted = structuredClone(DOCUMENT);
  const target = memberAt(planted, ...at) as Record<string, unknown>;

  target.example = value;

  return planted;
}

/** One planted row's answer, named so a failure names the row. */
interface PlantedResult {
  /** The row, per {@link PlantCase.plant}. */
  readonly plant: string;

  /** What the walk answered, or what the row says it must. */
  readonly faults: readonly CredentialFault[];
}

/**
 * What the walk answers over one planted document.
 *
 * @param row - One {@link PLANTED} row.
 * @returns The row's name and every fault the walk found.
 */
function faultsPlanted(row: PlantCase): PlantedResult {
  return {
    plant: row.plant,
    faults: credentialsIn(documentPlanting(row.at, row.value)),
  };
}

/**
 * What that row says the walk must answer.
 *
 * @param row - One {@link PLANTED} row.
 * @returns The row's name and its reasons, each at the position the
 *   plant landed on — derived rather than transcribed, so a fault
 *   raised at the wrong place is named rather than counted.
 */
function faultsExpected(row: PlantCase): PlantedResult {
  const path = [...row.at, 'example'].join('.');

  return {
    plant: row.plant,
    faults: row.reasons.map((reason) => ({ reason, path })),
  };
}

/**
 * Which shapes read one value as a credential.
 *
 * @param value - A sample or a near miss.
 * @returns The id of every shape that matches it.
 */
function shapesMatching(value: string): string[] {
  const matched: string[] = [];

  for (const shape of CREDENTIAL_SHAPES) {
    if (shape.pattern.test(value)) matched.push(shape.id);
  }

  return matched;
}

/** One shape's battery reading, named so a failure names the row. */
interface ShapeReading {
  /** The row, per {@link CredentialShape.id}. */
  readonly id: string;

  /** Which shapes its sample matches. */
  readonly sample: readonly string[];

  /** Which shapes its near miss matches. */
  readonly nearMiss: readonly string[];
}

/**
 * One shape's own battery, read through the same patterns the walk
 * uses.
 *
 * @param shape - One {@link CREDENTIAL_SHAPES} row.
 * @returns Which shapes its sample and its near miss match. The
 *   sample answering its own id alone is liveness and distinctness
 *   at once; the near miss answering nothing is the guard.
 */
function shapeReading(shape: CredentialShape): ShapeReading {
  return {
    id: shape.id,
    sample: shapesMatching(shape.sample),
    nearMiss: shapesMatching(shape.nearMiss),
  };
}

/**
 * What {@link shapeReading} must answer for each row.
 *
 * @param shape - One {@link CREDENTIAL_SHAPES} row.
 * @returns Its own id for the sample and nothing for the near miss.
 */
function shapeExpected(shape: CredentialShape): ShapeReading {
  return { id: shape.id, sample: [shape.id], nearMiss: [] };
}

/**
 * This package's own manifest, read by a path of its own.
 *
 * The module under test resolves the version through
 * `readServiceVersion`, which walks up from a framework module in
 * `lib/`; this reads the file directly, relative to this test. Two
 * different mechanisms agreeing is what makes the version case a
 * reading rather than a comparison of the module against itself.
 */
const MANIFEST = new URL('../package.json', import.meta.url);

describe('parseRouteLabel', () => {
  for (const { shape, label, parsed } of PARSED) {
    it(`parses ${shape}`, () => {
      expect(parseRouteLabel(label)).toStrictEqual(parsed);
    });
  }

  for (const { axis, refused, accepted } of REFUSED) {
    it(`refuses ${axis}`, () => {
      expect(() => parseRouteLabel(refused)).toThrow(TypeError);
      expect(parseRouteLabel(accepted).path).toBe('/domains');
    });
  }

  it('names one axis per refusal row', () => {
    const axes = REFUSED.map((row) => row.axis);

    expect(new Set(axes).size).toBe(REFUSED.length);
  });
});

describe('buildOpenApiRegistry', () => {
  it('registers routes and nothing else', () => {
    const kinds = REGISTRY.definitions.map((definition) => definition.type);

    expect(ROUTES.length).toBe(REGISTRY.definitions.length);
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(new Set(kinds)).toStrictEqual(new Set(['route']));
  });

  it('registers each route as its own label parses', () => {
    for (const route of ROUTES) {
      const summary = route.summary ?? '';

      expect({ method: route.method, path: route.path })
        .toStrictEqual(parseRouteLabel(summary));
    }
  });

  it('leaves no express parameter in a registered path', () => {
    const paths = ROUTES.map((route) => route.path);
    const braced = paths.filter((path) => path.includes('{'));

    expect(paths.filter((path) => path.includes(':'))).toStrictEqual([]);
    expect(braced.length).toBeGreaterThan(0);
  });

  it('registers one method and path pair at most once', () => {
    const pairs = ROUTES.map((route) => `${route.method} ${route.path}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('registers the research groups and the auth mount alike', () => {
    const summaries = new Set(ROUTES.map((route) => route.summary));

    expect(summaries).toContain('GET /domains/:slug');
    expect(summaries).toContain('POST /auth/login');
    expect(summaries).not.toContain('GET /no-such-route');
  });

  it('tags a route with the group its path belongs to', () => {
    expect(routeLabelled('POST /auth/login').tags).toStrictEqual(['auth']);
    expect(routeLabelled('GET /domains').tags).toStrictEqual(['domains']);
  });

  it('names the three envelope components on its responses', () => {
    const listed = routeLabelled('GET /domains');
    const success = bodySchemaOf(responseOf(listed, '2XX'));
    const failure = bodySchemaOf(responseOf(listed, '500'));
    const options = success instanceof z.ZodUnion
      ? success.options
      : [];

    expect(options.map(componentIdOf))
      .toStrictEqual(['SuccessEnvelope', 'PaginatedEnvelope']);
    expect(componentIdOf(failure)).toBe('ErrorEnvelope');
  });

  it('describes a delete and a refusal without naming a body', () => {
    const deleted = responseOf(routeLabelled('GET /domains'), '204');
    const login = routeLabelled('POST /auth/login');
    const anonymous = responseOf(login, '2XX');

    expect(bodySchemaOf(deleted)).toBeUndefined();
    expect(bodySchemaOf(anonymous)).toBeUndefined();
  });

  it('declares a refusal only where the route parses something', () => {
    const parses = routeLabelled('GET /domains').responses;
    const parsesNothing = routeLabelled('GET /settings').responses;

    expect(Object.keys(parses)).toContain('422');
    expect(Object.keys(parsesNothing)).not.toContain('422');
    expect(Object.keys(parsesNothing)).toContain('500');
  });

  it('binds what a route parses under the half that reads it', () => {
    const request = routeLabelled('PATCH /domains/:slug').request;

    expect(request?.params).toBeInstanceOf(z.ZodObject);
    expect(request?.body?.content[JSON_MEDIA]).toBeDefined();
    expect(request?.query).toBeUndefined();
  });

  // Identity, over every schema all seventeen tables bind, and the
  // one rule this assembly has. A table names the const its handler
  // parses with BY IDENTITY, so a registration that RESTATED one —
  // wrote the same members out a second time instead of binding the
  // module's own object — would describe a request shape no route
  // is judged against, and nothing else in the tree would report
  // it. The control is that restatement, which is also why the
  // comparison is `toBe`: two writings of one declaration are
  // `toStrictEqual` to each other and are not the same object, so
  // a structural compare is satisfied by exactly the fault this
  // case exists to find.
  it('registers the schema each module exports, by identity', () => {
    const bindings = bindingsExported(EXPORTED_TABLES);
    const sample = bindingNamed(bindings, RESTATED_BINDING);
    const restated = z.object({ slug: slugParamSchema }).strict();
    const twin = z.object({ slug: slugParamSchema }).strict();
    const unwalked = ROUTES.filter(
      (route) => !EXPORTED_LABELS.has(route.summary ?? ''),
    );

    expect(restatedAmong(bindings)).toEqual([]);
    // What keeps that zero from being a zero over less: no
    // registered label falls outside the roster above, and the
    // tables bind more members than there are routes.
    expect(unwalked.map((route) => route.summary)).toEqual([]);
    expect(bindings.length).toBeGreaterThan(ROUTES.length);
    expect(registeredMemberOf(routeLabelled(sample.label), sample.member))
      .toBe(sample.held);

    // The plant, driven through the same walk the zero came from.
    // The twin is what says a structural compare would have let it
    // through: two writings of one declaration are `toStrictEqual`
    // and are not the same object. It stands in for the binding
    // itself because zod materialises its instance methods lazily,
    // so the walked binding carries own properties a fresh twin
    // does not — see the header.
    expect(restated).not.toBe(sample.held);
    expect(restated).toStrictEqual(twin);
    expect(twin).not.toBe(restated);
    expect(restatedAmong([{ ...sample, held: restated }]))
      .toEqual([sample.name]);
  });
});

describe('the zod instance this module shares', () => {
  it('is left unextended by importing the generator', () => {
    const schema = z.object({ x: z.string() });

    expect(Object.hasOwn(z.ZodType.prototype, 'openapi')).toBe(false);
    expect(() => schema.openapi('Probe')).toThrow(TypeError);
    expect(schema.meta({ id: 'Probe' }).meta()?.id).toBe('Probe');
  });

  it('leaves the envelope exports carrying no component name', () => {
    const listed = routeLabelled('GET /domains');
    const registered = bodySchemaOf(responseOf(listed, '500'));

    expect(successEnvelopeSchema.meta()).toBeUndefined();
    expect(paginatedEnvelopeSchema.meta()).toBeUndefined();
    expect(errorEnvelopeSchema.meta()).toBeUndefined();
    expect(componentIdOf(registered)).toBe('ErrorEnvelope');
  });
});

describe('generateOpenApiDocument', () => {
  it('declares the 3.1 dialect and emits in it', () => {
    const bounds = valuesUnder(DOCUMENT, 'exclusiveMinimum');

    expect(DOCUMENT.openapi.startsWith('3.1')).toBe(true);
    expect(bounds.length).toBeGreaterThan(0);
    expect(bounds.every((bound) => typeof bound === 'number')).toBe(true);
  });

  it('carries a non-empty paths object, every path converted', () => {
    const paths = Object.keys(DOCUMENT.paths ?? {});

    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toContain('/domains/{slug}');
    expect(paths.filter((path) => path.includes(':'))).toStrictEqual([]);
  });

  it('names the three envelope components and no fourth', () => {
    const schemas = Object.keys(DOCUMENT.components?.schemas ?? {});

    expect(new Set(schemas)).toStrictEqual(new Set([
      'SuccessEnvelope',
      'PaginatedEnvelope',
      'ErrorEnvelope',
    ]));
  });

  it('reads its version from the package manifest', () => {
    const raw = readFileSync(MANIFEST, 'utf8');
    const manifest: unknown = JSON.parse(raw);
    const declared = memberAt(manifest, 'version');

    expect(declared).toBeTypeOf('string');
    expect(DOCUMENT.info.version).toBe(declared);
  });

  it('derives its one server from the port it is handed', () => {
    const configured = generateOpenApiDocument().servers ?? [];
    const explicit = generateOpenApiDocument(UNUSED_PORT).servers ?? [];

    expect(config.PORT).not.toBe(UNUSED_PORT);
    expect(configured.map((server) => server.url))
      .toStrictEqual([`http://localhost:${config.PORT}`]);
    expect(explicit.map((server) => server.url))
      .toStrictEqual([`http://localhost:${UNUSED_PORT}`]);
  });

  // No credential reaches the document, and most of this case is
  // the reading that keeps that zero from being a zero over
  // nothing. The walk collects every value the document DOCUMENTS
  // — whatever sits under an `example`, `examples`, `default`,
  // `enum` or `const`, flattened through arrays and objects — and
  // reads three rules over it: a member the connector mask covers,
  // a config property carrying anything but the mask, and a value
  // whose text is credential-shaped. The plants are the control on
  // the zero, each a clone of this document carrying one example
  // at a member it really declares. The shapes carry a battery of
  // their own, a pattern that had gone dead being invisible in a
  // zero.
  it('documents no credential at any depth', () => {
    const documented = documentedValuesIn(DOCUMENT);
    const texts = documented.filter((row) => typeof row.value === 'string');
    const boxed = documented.filter((row) => isContainer(row.value));
    const enumed = documented.filter((row) => row.path.includes('.enum.'));
    const worded = documented.filter((row) => row.path.includes('config'));
    const reasons = [
      SECRET_KEY_REASON,
      CONFIG_REASON,
      ...CREDENTIAL_SHAPES.map((shape) => shape.id),
    ];

    expect(credentialsIn(DOCUMENT)).toStrictEqual([]);
    // What keeps that zero from being a zero over nothing: the
    // walk really did collect this document. 83 and 55, measured.
    expect(documented.length).toBeGreaterThan(0);
    expect(texts.length).toBeGreaterThan(0);
    // And it DESCENDED. An `enum` is an array and an `examples` an
    // object, so a walk that collected the container rather than
    // its members would read a whole enum vocabulary as one value
    // no rule can match: 54 of this document's 55 documented
    // strings sit inside an enum, and the single default that does
    // not is why the string count above cannot report it alone.
    expect(boxed).toStrictEqual([]);
    expect(enumed.length).toBeGreaterThan(0);
    // The config rule reads a schema PROPERTY and never the word.
    // Two routes here answer under a URL that carries it, and what
    // they document is ordinary; a substring test claims both.
    expect(worded.length).toBeGreaterThan(0);
    expect(worded.filter((row) => namesConfig(row.segments))).toEqual([]);
    // A fault names one rule, so no two rules may share a name.
    expect(new Set(reasons).size).toBe(reasons.length);

    // The plants, compared whole — reason and position together,
    // so one raised for the wrong reason or at the wrong member is
    // named rather than counted. The fourth row is the exemption's
    // own control: the same member as the third, carrying the
    // mask, and answering nothing.
    expect(PLANTED.map(faultsPlanted))
      .toStrictEqual(PLANTED.map(faultsExpected));
    // And they cloned. Every other case in this file reads the
    // same module-scope document.
    expect(documentedValuesIn(DOCUMENT).length).toBe(documented.length);

    // Every shape matches its own sample and no other row's, and
    // none of them matches a near miss.
    expect(CREDENTIAL_SHAPES.map(shapeReading))
      .toStrictEqual(CREDENTIAL_SHAPES.map(shapeExpected));
  });
});
