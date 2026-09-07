/**
 * @packageDocumentation
 * What a route reads off a REQUEST, as up to three schemas: the
 * `:params` in its path, the `?query` after it, and the body it
 * parses. One {@link RouteSchemas} per route — collected into a
 * table per router module, keyed by that route's label — is the
 * whole of what an OpenAPI document has to read to describe this
 * API's request half.
 *
 * The shape is defined by what it does NOT restate. Every router
 * module already declares the consts its handlers parse with, and
 * roughly half of them are deliberately private:
 * `src/domains/routes.ts` argues at length for keeping the `:slug`
 * address objects out of its exports, and every schema those
 * modules DO export is an MCP tool input — which merges params and
 * query into ONE arguments object and is therefore the wrong
 * binding for a document that has to keep the two apart. A binding
 * table names the private consts BY IDENTITY instead. The only
 * thing written a second time is the label, and a label is exactly
 * what a coverage invariant can hold against the router that
 * declares it — so a document assembled from these tables describes
 * the schema a request is actually parsed against, rather than a
 * second one written out beside it that no gate compares.
 *
 * Nothing here parses anything, and nothing here runs on a request.
 * `src/http/validation.ts` is what turns a failed parse into a
 * `ValidationError`; these are declarations for a generator to read.
 * The consequence worth stating is that a wrong binding cannot break
 * a route — it can only make the document lie, which is why the
 * identity rule above is the whole of the design and why the tests
 * that compare bindings to routers use `toBe` rather than a
 * structural compare.
 *
 * Every member is OPTIONAL and an EMPTY binding is legal, which is
 * a claim about a real route and not a convenience. `GET /settings`
 * in `src/settings/routes.ts` takes `_req` and parses nothing at
 * all — no address, no window, no body — and it still owes the
 * coverage guard a row, since a route missing from a table is the
 * one thing that guard exists to find. So `{}` has to mean THIS
 * ROUTE BINDS NOTHING, and a table cannot use an absent entry to
 * mean it.
 *
 * `z.ZodType` carries no type arguments on purpose. What a schema
 * PARSES TO is not this module's subject: the generator reads the
 * schema's structure, and pinning an output type here would force
 * every table to restate what its consts already infer, which is
 * the one thing this module exists to avoid. Assignability was
 * measured across the shapes this tree actually binds — a `.strict()`
 * object, a `.regex()` string, a `z.coerce.number().int()`, and an
 * object composed by `.extend()` — and all four are members without
 * a cast.
 *
 * {@link routeSchemasFor} is the RUNTIME half of the same claim, for
 * the callers that have lost the type: a table read back out of a
 * `Record<string, unknown>`, or a case asserting that what a router
 * module exported is a binding at all. It answers the same question
 * the type does, on every input but one — see its own remarks.
 */
import { z } from 'zod';

/**
 * The schemas one route binds: what it reads out of the path, out of
 * the query string, and out of the body.
 *
 * All three are optional and any subset is legal, including none.
 * Each is bound to the const the handler already parses with, by
 * identity — never to a copy, and never to a schema written out for
 * the document alone.
 *
 * An unknown member is refused at the type level (measured: TS2353,
 * `Object literal may only specify known properties`), and the
 * refusal reaches a binding nested inside a table literal as well as
 * a bare one — which is the form every caller actually writes.
 */
export interface RouteSchemas {
  /** What the route parses `req.params` with, if it takes any. */
  readonly params?: z.ZodType;
  /** What the route parses `req.query` with, if it reads any. */
  readonly query?: z.ZodType;
  /** What the route parses `req.body` with, if it accepts one. */
  readonly body?: z.ZodType;
}

/**
 * The member names {@link routeSchemasFor} will accept, as a record
 * rather than a list, so that the two declarations of this shape
 * cannot drift apart in EITHER direction.
 *
 * `Record<keyof RouteSchemas, true>` requires every key and permits
 * no other, so a member added to the interface and not to this
 * object is `TS2741: Property … is missing`, and a name here that
 * the interface does not declare is `TS2353`. Both measured. The
 * list form this replaces — `['params', 'query', 'body'] as const
 * satisfies readonly (keyof RouteSchemas)[]` — closes only the
 * second direction: an array of a union is satisfied by naming any
 * subset of it, so a member the interface grew would leave this
 * roster silently short and the guard silently permissive.
 *
 * The values carry nothing. `true` is a placeholder for a key set;
 * `Object.hasOwn` is what reads it.
 */
const ROUTE_SCHEMA_MEMBERS: Readonly<Record<keyof RouteSchemas, true>> = {
  params: true,
  query: true,
  body: true,
};

/**
 * Whether `value` carries the schemas for one route — the runtime
 * half of {@link RouteSchemas}, for a caller holding a value the type
 * system has already lost track of.
 *
 * @param value - Anything. Typically an entry read out of a binding
 *   table typed as `Record<string, unknown>`, where the table's own
 *   literal type did not survive being collected beside sixteen
 *   others.
 * @returns `true` when `value` is a non-null, non-array object whose
 *   every own enumerable key is `params`, `query` or `body` and whose
 *   every value is a `z.ZodType`. An empty object qualifies.
 *
 * @remarks
 * It refuses on exactly ONE input the type accepts, and the
 * asymmetry is deliberate: `{ params: undefined }`. That literal
 * type-checks, because `exactOptionalPropertyTypes` is not set in
 * `tsconfig.base.json` and an optional member therefore admits an
 * explicit `undefined` — so the type cannot express the difference
 * and this is the only place the difference can be stated. What it
 * catches is worth the asymmetry: a member bound to an import that
 * resolved to nothing is an `undefined` at runtime and a clean
 * compile, which is precisely the fault that would put a route in
 * the document with its query silently undescribed.
 *
 * Membership is `Object.hasOwn` rather than `in` on purpose. `in`
 * walks the prototype chain, so `{ toString: someSchema }` would
 * pass an `in`-keyed guard while carrying a member no route binds.
 *
 * `instanceof z.ZodType` assumes ONE copy of zod in the graph, which
 * is what the `overrides` block in the root manifest pins. A second
 * copy would make a schema built by the other one fail this guard
 * while parsing perfectly well — a dual-package hazard, and the
 * reason to read a red here as a dependency question before a
 * binding one.
 */
export function routeSchemasFor(value: unknown): value is RouteSchemas {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([member, schema]) => Object.hasOwn(ROUTE_SCHEMA_MEMBERS, member)
      && schema instanceof z.ZodType,
  );
}
