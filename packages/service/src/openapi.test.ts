/**
 * `parseRouteLabel`, `buildOpenApiRegistry` and
 * `generateOpenApiDocument` — the label the document restates, the
 * registrations it is assembled from, and the document itself.
 *
 * The parse is the one thing in `./openapi.ts` with a claim of its
 * own. Everything else there is assembly: a schema it registers came
 * from a binding table and is compared to the table by
 * `tests/invariants/`, while a label it splits wrong becomes a path
 * nothing else reads. So the four parse rows are shapes rather than
 * a sample, and two of them are unreachable from any real label —
 * no route on this surface carries two parameters, and every label a
 * router produces is uppercased by the helper that builds it. They
 * are here because a document is exactly where an unexercised branch
 * goes unnoticed: half-converting a two-parameter path would render
 * as a literal segment nobody could call.
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
 */
import type { RouteLabelParts } from './openapi.js';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { config } from './config.js';
import {
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
} from './http/envelope.js';
import {
  buildOpenApiRegistry,
  generateOpenApiDocument,
  parseRouteLabel,
} from './openapi.js';

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
});
