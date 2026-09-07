/**
 * `RouteSchemas` and `routeSchemasFor` — the two halves of one
 * claim about what a route binds, one enforced by `check-types` and
 * one by this runner.
 *
 * Two of its 25 cases carry a claim this runner cannot fail at all,
 * and several more carry one beside their assertions. A binding
 * naming a member no route may bind is refused by the TYPE, so what
 * pins it is a `@ts-expect-error` that `check-types` reads and
 * vitest merely steps over — and it reddens in the direction that
 * matters: the moment the type stops refusing that literal the
 * directive is unused, which is `TS2578` and a failed gate. Each of
 * the two carries its positive control in the same case, the same
 * literal with the offending member corrected, so a `RouteSchemas`
 * that had come to refuse EVERY literal would fail this file rather
 * than pass it.
 *
 * The runtime half asserts the guard says the same thing the type
 * does, on every input but the one the module's remarks name. Its
 * refusal cases each carry an accepting sibling varied along the one
 * axis that case is about — an unknown member against a known one, a
 * bare string against the schema it stands in for — because a
 * refusal reads identically against a guard that refuses everything
 * it is handed.
 *
 * Two guards keep the tables from going quietly vacuous, and one
 * direction is deliberately NOT among them. `MEMBERS` is pinned to
 * the interface's key set and asserted covered by the accepted
 * table, so a name added to that list with no row here is a red case
 * — but a member added to `RouteSchemas` leaves the list green,
 * measured, because an array of a union is satisfied by naming any
 * subset of it. That direction is closed inside the module instead,
 * by the record its guard reads, and the grid below is where the two
 * are told apart. The second guard is the refusal table's axes,
 * asserted distinct, so a row edited into a duplicate of its
 * neighbour is named rather than counted twice.
 *
 * Mutation grid, twelve legs over the module, measured at the 25
 * cases here and scored against BOTH gates — half of what this file
 * pins is unreachable by this runner. `tsc` counts diagnostics from
 * `bun x tsc --noEmit`; `red` counts cases below.
 *
 * The type half first, since it is the half with no assertions in
 * it. Growing `RouteSchemas` a fourth member answers tsc=2, red=0:
 * `TS2578` at the unknown-member directive here and `TS2741` at the
 * module's member record — the whole reason that record is a
 * `Record` and not a list, `MEMBERS` staying green under this leg.
 * Adding a member to the record and not to the interface answers
 * `TS2353` there and reddens 2, so the roster is pinned in both
 * directions by different codes. Making `params` required answers
 * `TS1360` three times and reddens nothing, which is what carries
 * the all-optional claim: the empty binding and two of the subsets.
 * Widening `query` to `unknown` answers `TS2578` alone, at the
 * not-a-schema directive — one leg, one case, and the reading that
 * `z.ZodType` is load-bearing rather than decorative.
 *
 * The runtime half. Dropping `body` from the module's roster answers
 * `TS2741` and reddens 3. Dropping the member check from the guard
 * reddens 3 and dropping the schema check reddens 4; both also trip
 * `noUnusedParameters`, so their reading is the red count and not
 * their tsc one. Spelling membership as `in` rather than
 * `Object.hasOwn` reddens exactly 1, the inherited-member row, which
 * is that row's whole purpose. `some` for `every` reddens 13 — every
 * case whose value has a good member beside the bad one, plus every
 * empty binding, `[].some()` being `false`. Dropping the array guard
 * reddens 1, and dropping the null guard reddens 1 beside a `TS2769`
 * tsc raises against `Object.entries(null)` unprompted. Dropping the
 * `typeof` guard reddens 3 — `undefined`, a number and a function —
 * and NOT the string row, `Object.entries('params')` answering index
 * keys that are members of nothing.
 */
import type { RouteSchemas } from './openapi-bindings.js';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { routeSchemasFor } from './openapi-bindings.js';
import { paginationQuerySchema, slugParamSchema } from './schemas.js';

/**
 * A `:slug` address, a page window and a body — one real schema per
 * member, taken from the vocabulary the routers actually parse with
 * rather than invented here, so the assignability this file rests on
 * is the assignability a binding table will need.
 */
const ADDRESS = z.object({ slug: slugParamSchema }).strict();
const BODY = z.object({ title: z.string() }).strict();

/**
 * Every member a binding may carry, pinned to the interface. A name
 * here that `RouteSchemas` does not declare is a type error at this
 * line; the other direction is closed inside the module, by the
 * record its guard reads.
 */
const MEMBERS = [
  'params',
  'query',
  'body',
] as const satisfies readonly (keyof RouteSchemas)[];

/**
 * Bindings the guard must accept, one per legal subset shape. Held
 * against {@link MEMBERS} below, so a member with no row is a red
 * case.
 */
const ACCEPTED = [
  { shape: 'no members', binding: {} },
  { shape: 'params only', binding: { params: ADDRESS } },
  { shape: 'query only', binding: { query: paginationQuerySchema } },
  { shape: 'body only', binding: { body: BODY } },
  {
    shape: 'all three',
    binding: { params: ADDRESS, query: paginationQuerySchema, body: BODY },
  },
];

/**
 * One value the guard must refuse, beside one it must accept that
 * differs along the single axis the row is about.
 */
interface RefusalCase {
  /** What the pair differs on, and what the case is named after. */
  readonly axis: string;
  /** The value under test. */
  readonly refused: unknown;
  /** The control, varied along `axis` alone. */
  readonly accepted: unknown;
}

/**
 * Values the guard must refuse, each beside the value it differs
 * from along one axis alone. Without the `accepted` half a row says
 * only that something was refused, which a guard answering `false`
 * to everything satisfies.
 *
 * Annotated rather than inferred, and the `toString` row is why: an
 * inferred union over these rows gives every OTHER row a
 * `toString?: undefined` member, which the apparent members every
 * object type carries then contradict.
 */
const REFUSED: readonly RefusalCase[] = [
  {
    axis: 'a member no route binds',
    refused: { headers: ADDRESS },
    accepted: { params: ADDRESS },
  },
  {
    axis: 'a member inherited rather than owned',
    refused: { toString: ADDRESS },
    accepted: { params: ADDRESS },
  },
  {
    axis: 'a member that is not a schema',
    refused: { query: 'not a schema' },
    accepted: { query: paginationQuerySchema },
  },
  {
    axis: 'a member left explicitly undefined',
    refused: { params: undefined },
    accepted: { params: ADDRESS },
  },
  {
    axis: 'one bad member beside two good ones',
    refused: { params: ADDRESS, query: paginationQuerySchema, body: 7 },
    accepted: { params: ADDRESS, query: paginationQuerySchema, body: BODY },
  },
];

/**
 * Values that are not objects a binding could be. Their shared
 * control is `{}`, which differs from every one of them along the
 * only axis they are about.
 */
const NOT_OBJECTS: readonly { shape: string; value: unknown }[] = [
  { shape: 'null', value: null },
  { shape: 'undefined', value: undefined },
  { shape: 'a string', value: 'params' },
  { shape: 'a number', value: 3 },
  { shape: 'an array', value: [] },
  { shape: 'an array of schemas', value: [ADDRESS] },
  { shape: 'a function', value: routeSchemasFor },
  { shape: 'a schema itself', value: ADDRESS },
];

// ---------------------------------------------------------------------------
// RouteSchemas, at the type level
// ---------------------------------------------------------------------------

describe('RouteSchemas', () => {
  it('refuses a binding naming a member it does not declare', () => {
    const refused = {
      params: ADDRESS,
      // @ts-expect-error `headers` is not a member a binding carries.
      headers: ADDRESS,
    } satisfies RouteSchemas;

    // The positive control, and the reason the directive above is a
    // reading: the same literal with the member renamed compiles with
    // no directive at all, so a `RouteSchemas` that had come to refuse
    // every literal would fail this file rather than pass it.
    const accepted = {
      params: ADDRESS,
      query: paginationQuerySchema,
    } satisfies RouteSchemas;

    expect(routeSchemasFor(refused)).toBe(false);
    expect(routeSchemasFor(accepted)).toBe(true);
  });

  it('refuses a member bound to something that is not a schema', () => {
    const refused = {
      params: ADDRESS,
      // @ts-expect-error a binding member is a schema, never a string.
      query: 'not a schema',
    } satisfies RouteSchemas;

    // The control, varied along the one axis this case is about: the
    // same two members with the second bound to a real schema. Without
    // it the directive above is satisfied by a member typed `unknown`,
    // which would refuse the string for no reason worth documenting.
    const accepted = {
      params: ADDRESS,
      query: paginationQuerySchema,
    } satisfies RouteSchemas;

    expect(routeSchemasFor(refused)).toBe(false);
    expect(routeSchemasFor(accepted)).toBe(true);
  });

  it('accepts a binding carrying no members at all', () => {
    const empty = {} satisfies RouteSchemas;

    expect(Object.keys(empty)).toStrictEqual([]);
    expect(routeSchemasFor(empty)).toBe(true);
  });

  it('accepts any subset of the members it declares', () => {
    const params = { params: ADDRESS } satisfies RouteSchemas;
    const query = { query: paginationQuerySchema } satisfies RouteSchemas;
    const body = { body: BODY } satisfies RouteSchemas;
    const all = { ...params, ...query, ...body } satisfies RouteSchemas;

    expect(Object.keys(all).sort()).toStrictEqual([...MEMBERS].sort());
  });
});

// ---------------------------------------------------------------------------
// routeSchemasFor
// ---------------------------------------------------------------------------

describe('routeSchemasFor', () => {
  it('covers every declared member across the accepted table', () => {
    const bound = ACCEPTED.flatMap((row) => Object.keys(row.binding));

    expect([...new Set(bound)].sort()).toStrictEqual([...MEMBERS].sort());
  });

  it('names one axis per refusal row', () => {
    const axes = REFUSED.map((row) => row.axis);

    expect([...new Set(axes)]).toHaveLength(REFUSED.length);
  });

  for (const { shape, binding } of ACCEPTED) {
    it(`accepts a binding carrying ${shape}`, () => {
      expect(routeSchemasFor(binding)).toBe(true);
    });
  }

  for (const { axis, refused, accepted } of REFUSED) {
    it(`refuses ${axis}`, () => {
      expect(routeSchemasFor(refused)).toBe(false);
      expect(routeSchemasFor(accepted)).toBe(true);
    });
  }

  for (const { shape, value } of NOT_OBJECTS) {
    it(`refuses ${shape}`, () => {
      expect(routeSchemasFor(value)).toBe(false);
      expect(routeSchemasFor({})).toBe(true);
    });
  }

  it('narrows an entry the type system had lost track of', () => {
    const entry: unknown = { query: paginationQuerySchema };

    if (!routeSchemasFor(entry)) {
      throw new Error('the guard refused a binding it was handed');
    }

    // Reading `.query` off `entry` is the case. It does not compile
    // unless the predicate narrowed `unknown` to `RouteSchemas`, and
    // the identity compare is what a binding table owes: the document
    // has to describe the const the handler parses with, not a copy.
    expect(entry.query).toBe(paginationQuerySchema);
  });
});
