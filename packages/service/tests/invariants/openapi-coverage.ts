/**
 * @packageDocumentation
 * The two label sets the OpenAPI coverage invariant compares: the
 * operations a generated document declares, and the routes the
 * routers of this package do.
 *
 * A route reaches the document only by way of a binding table, and
 * a table is keyed BY HAND. So a route added to a router without a
 * table key is simply absent: nothing refuses to build, the
 * artifact is smaller and still valid, and every reading in
 * `src/openapi.test.ts` stays green because each one asks about a
 * route that IS registered. This module is the one reading that
 * can report it, and `openapi-coverage.test.ts` beside it makes
 * the assertion.
 *
 * THE CONVERSION HAPPENS ONCE, AND ON ONE SIDE ONLY. The two
 * surfaces spell a parameter differently — a router declares
 * `/domains/:slug` where the document carries `/domains/{slug}` —
 * so one of them has to be rewritten before they can be compared
 * at all. {@link expressPathOf} rewrites the DOCUMENT into the
 * router's spelling and {@link declaredOperations} converts
 * nothing whatever, which is what stops the comparison passing on
 * a bug both sides share: a rewrite that dropped a segment, or
 * left a parameter braced, moves exactly one side of the equality
 * and is reported. Normalising both sides into some third
 * spelling is the shape that would have hidden it, and it is the
 * shape a reader reaches for first.
 *
 * `paths` KEYS ARE PATHS AND NOT OPERATIONS, which is this walk's
 * one trap and it is measured rather than assumed: the document
 * carries 36 path keys over 55 registered routes, the verbs
 * collapsing under one path item apiece. A set built from
 * `Object.keys(document.paths)` is nineteen short and reads as a
 * registry that dropped routes, so the walk descends into each
 * path item and builds a label out of the pair.
 *
 * A SET ON BOTH SIDES, and the router side is the one that needs
 * it. `labelsOf` answers one label per HANDLER rather than per
 * route, so the attempt limiter ahead of the login handler makes
 * `POST /auth/login` answer twice: the declared LIST is one longer
 * than its set, against 55 operations in the document. A
 * comparison of counts reads a complete surface as one route short
 * before it is ever imprecise.
 *
 * THE AUTH ENTRY IS IN, which is a choice `tests/helpers/
 * route-labels.ts` deliberately leaves to its consumers.
 * `src/openapi.ts` registers `authRouteSchemas` beside the sixteen
 * research tables, so the document describes those three routes —
 * a roster walking only the sixteen would report all three as
 * documented-and-not-declared, which is the opposite of what is
 * wrong.
 *
 * A PATH-ITEM KEY THE ROSTER DOES NOT NAME IS A REFUSAL rather
 * than a skip. Measured over this document, the only keys at that
 * level are the five verbs its routers use — no `$ref`, no
 * `summary`, no `parameters` — so the roster covers everything
 * present today. A key outside it is one of two things, and both
 * are worth stopping for: a method the generator registered and
 * this walk would silently drop, which surfaces at the equality as
 * a route the document is missing and names the wrong cause, or a
 * specification field somebody should meet on purpose.
 *
 * Kept apart from the assertions the way `exports-send-free.ts`
 * and `auth-containment.ts` next door are, and for their reason: a
 * roster a case can ask questions of is one it does not have to
 * assume.
 */

import type { OpenApiDocument } from '../../src/openapi.js';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

import {
  buildAuthRouterEntry,
  buildResearchRouters,
  labelFor,
} from '../helpers/route-labels.js';

/**
 * The verb keys a path item can carry, as a record rather than a
 * list, so this roster and the library's own union cannot drift
 * apart in either direction.
 *
 * `Record<RouteConfig['method'], true>` requires every method the
 * library declares — one added by a later version is
 * `TS2741: Property ... is missing` here — and permits no other, a
 * name the union does not carry being `TS2353`. The list form
 * closes only the second direction, an array of a union being
 * satisfied by any subset of it.
 *
 * The same shape, and the same argument, as `OPENAPI_METHODS` in
 * `src/openapi.ts`, which is what a label is checked against on
 * the way IN. Spelled again here rather than imported from there,
 * so the walk out of the document is pinned by the library and not
 * by the module whose output it is reading.
 *
 * Wider than this document uses, on purpose: five of the nine
 * appear in it today, `head`, `options`, `trace` and `query`
 * having no route on this surface.
 */
const OPERATION_KEYS: Readonly<Record<RouteConfig['method'], true>> = {
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

/**
 * Whether `key` names an operation rather than a path-item field.
 *
 * @param key - One key of a path item.
 * @returns `true` when {@link OPERATION_KEYS} carries it.
 *
 * @remarks
 * `Object.hasOwn` rather than `in`, which walks the prototype
 * chain and would answer `true` for `constructor`.
 */
function isOperationKey(key: string): boolean {
  return Object.hasOwn(OPERATION_KEYS, key);
}

/**
 * The express spelling of an OpenAPI path.
 *
 * @param path - A path as the document carries it,
 *   `/domains/{slug}`.
 * @returns The same path with every parameter unbraced,
 *   `/domains/:slug`.
 *
 * @remarks
 * The inverse of `openApiPathOf` in `src/openapi.ts`, and the ONLY
 * conversion in this comparison: the router side is already
 * written this way and {@link declaredOperations} hands it through
 * untouched. The header says why that asymmetry is the point.
 *
 * A parameter name is a leading letter or underscore and then word
 * characters, which is what express accepts and what leaves every
 * other character in a literal segment alone. Every parameter in
 * the path is rewritten and not only the first — no path on this
 * surface carries two today, measured, and one that did would
 * otherwise come back half-converted and read as a route the
 * routers never declared.
 */
export function expressPathOf(path: string): string {
  return path.replace(/\{([A-Za-z_]\w*)\}/g, ':$1');
}

/**
 * Every operation a document declares, in the routers' spelling.
 *
 * @param document - A generated document. Handed in rather than
 *   generated here, so a caller chooses between the one this
 *   process assembles and one already written out.
 * @returns One label per operation, `GET /domains/:slug` and its
 *   fifty-four siblings, with every path converted back.
 * @throws TypeError - When a path item carries a key
 *   {@link OPERATION_KEYS} does not name. Per the header: dropping
 *   it silently would surface at the equality as a missing route
 *   and name the wrong cause.
 *
 * @remarks
 * A document carrying no `paths` at all answers the empty set
 * rather than refusing, and needs no guard of its own: the
 * equality this feeds then reports every declared route as
 * undocumented, which is loud and is also correct.
 */
export function documentedOperations(
  document: OpenApiDocument,
): ReadonlySet<string> {
  const labels = new Set<string>();

  for (const [path, item] of Object.entries(document.paths ?? {})) {
    const expressPath = expressPathOf(path);

    for (const key of Object.keys(item)) {
      if (!isOperationKey(key)) {
        const problem = `${path}: path item carries '${key}', which is `
          + 'not a method the generator can have registered';
        throw new TypeError(problem);
      }

      labels.add(labelFor(key, expressPath));
    }
  }

  return labels;
}

/**
 * Every label the seventeen routers declare.
 *
 * @returns The sixteen research routers read at the root and the
 *   auth router read at the mount `src/index.ts` gives it, their
 *   labels collapsed into one set.
 *
 * @remarks
 * A SET, and the duplicate it collapses is real rather than
 * defensive: `POST /auth/login` carries an attempt limiter ahead
 * of its handler, so `labelsOf` answers that label twice.
 *
 * Nothing is converted on this side. The routers speak the
 * spelling the comparison is made in, which is the whole of why
 * {@link expressPathOf} runs on the other one.
 */
export function declaredOperations(): ReadonlySet<string> {
  const declared = [...buildResearchRouters(), buildAuthRouterEntry()];

  return new Set(declared.flatMap((entry) => entry.labels));
}
