/**
 * The OpenAPI coverage invariant, run against the document this
 * package generates and the routers it declares.
 *
 * The rule: every route a router registers is an operation in the
 * generated document, and every operation in the document is a
 * route some router registers. `openapi-coverage.ts` next door
 * holds the two label sets and the one conversion between their
 * spellings; this file is where they meet.
 *
 * THE GAP THIS EXISTS TO REPORT IS SILENT EVERYWHERE ELSE. A route
 * reaches the document only through a binding table, and a table
 * is keyed by hand, so a route added to a router without a table
 * key is simply absent: nothing refuses to build, the artifact is
 * smaller and still valid, and every reading in `src/openapi.ts`'s
 * own tests stays green, because each of them asks about a route
 * that IS registered. Only the difference of the two sets can name
 * it.
 *
 * NAMED LABELS AND NEVER COUNTS, in both directions and in one
 * report. The two sides are the same size today, so a comparison
 * of counts is satisfied by a document that dropped one route and
 * grew another — which is exactly what renaming a table key does.
 * Measured: that rename leaves both sides at 55 and this case
 * fails naming `GET /domains` on one side and `GET /domainz` on
 * the other, where every count reading agrees.
 *
 * UNDOCUMENTED FIRST, in the report and in this prose, because the
 * two directions are neither equally likely nor equally urgent. A
 * route a router declares and the document omits is the working
 * fault: it is what a forgotten table key produces, and a reader
 * of the published document is told nothing at all about it. The
 * other direction — an operation the document declares that no
 * router serves — is a table naming a route since renamed or
 * removed, a document that over-promises rather than one that
 * hides.
 *
 * THE REPORT IS A LIST AND NOT A RECORD, and the reason is
 * measured rather than stylistic: `toEqual`'s diff prints an
 * object's keys in ALPHABETICAL order, so a record whose members
 * are declared undocumented-first still prints `undeclared` above
 * it and the ordering above would be prose. An array diff prints
 * in the order the array carries, which is the order
 * {@link coverageGaps} builds. Each line names its own direction
 * for the same reason, a reader of one line owing nothing to the
 * shape of the whole.
 *
 * BOTH SIDES ARE ASSERTED NON-EMPTY BEFORE THE ZERO IS. Two empty
 * sets are set-equal, so a document that registered nothing and a
 * roster that walked nothing agree perfectly and produce the same
 * clean pass a correct surface does. That is the one failure the
 * equality structurally cannot report, and it is the case above
 * it: measured, a registry built over no tables at all reddens
 * that case and this one together.
 *
 * THE TWO PLANTS BELOW ARE WHAT MAKE THAT ZERO A READING, and each
 * one goes in at the artifact its own side is derived from rather
 * than at the label set that side answers. A ROUTER built inside
 * the case declares a route no binding table names, which is the
 * forgotten table key itself, and its labels are spliced into the
 * roster. A TABLE ENTRY naming a route no router declares is
 * registered and generated, so its label reaches the comparison
 * through the same bracing and unbracing every documented route
 * goes through. Each reddens one direction, naming its own label,
 * and each leaves the other direction empty — the real surface's
 * own zero, taken again inside the plant.
 *
 * NEITHER PLANT REACHES THE TOP OF ITS SIDE, which is the honest
 * limit rather than an oversight: `declaredOperations` takes no
 * roster and `generateOpenApiDocument` builds its own registry, so
 * each splice happens one level down. What a plant does exercise
 * is the derivation its side is made of — `labelsOf` for the
 * routers, and the whole registration-to-document chain for the
 * tables.
 *
 * MUTATION GRID, seven legs over the four cases this file carried
 * when it ran, read as the SET each leg reddened rather than as a
 * count. Emptying the report reddens BOTH plants and leaves the
 * equality green, 2 of 4: that is the failure the plants exist to
 * rule out, and nothing else here can see it. Dropping the
 * undocumented block reddens the router plant alone and dropping
 * the undeclared block the table plant alone, so each plant owns
 * one direction. Unplanting the router, unplanting the table
 * entry, and printing the gap COUNT in place of the label are 1
 * apiece. Making `expressPathOf` the identity reddens 3 of 4, both
 * plants and the equality, the plants reading the same real
 * surface every other case does. The no-patch control is green.
 * Re-derive the whole grid rather than appending legs for a later
 * case: every denominator here moves with the next one.
 *
 * The document is generated once, at module scope, for the reason
 * `src/openapi.test.ts` gives its own copy: generation walks all
 * seventeen binding tables, and nothing here varies the port.
 */
import type { RouteSchemas } from '../../src/http/openapi-bindings.js';
import type { OpenApiDocument } from '../../src/openapi.js';
import type { Request, Response } from 'express';

import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { describe, expect, it } from 'vitest';

import {
  buildOpenApiRegistry,
  generateOpenApiDocument,
  parseRouteLabel,
} from '../../src/openapi.js';
import { labelsOf } from '../helpers/route-labels.js';

import {
  declaredOperations,
  documentedOperations,
} from './openapi-coverage.js';

// ---------------------------------------------------------------------------
// The two sides
// ---------------------------------------------------------------------------

/**
 * Every operation the generated document declares, in the routers'
 * spelling.
 */
const DOCUMENTED = documentedOperations(generateOpenApiDocument());

/** Every label the seventeen routers declare. */
const DECLARED = declaredOperations();

/** Why a label appears in the report's leading block. */
const UNDOCUMENTED = 'declared by a router, absent from the document';

/** Why a label appears in the trailing one. */
const UNDECLARED = 'in the document, declared by no router';

/**
 * Every coverage gap, in the form the failure list prints it.
 *
 * @param documented - Operations the document declares.
 * @param declared - Labels the routers declare.
 * @returns One line per gap, `<label> — <direction>`, the
 *   undocumented block first and each block sorted. Empty when the
 *   two sets are equal, which is the whole assertion.
 *
 * @remarks
 * Both sets are taken as arguments rather than read off the module
 * constants, so a case can hand it a roster of its own.
 *
 * The label is printed and the direction spelled out, on the
 * precedent `auth-containment.ts` next door sets: a failure list
 * reaches CI logs and terminal scrollback, and a route label is
 * exactly the string the tables, the routers and `src/openapi.ts`
 * are all searchable by.
 */
function coverageGaps(
  documented: ReadonlySet<string>,
  declared: ReadonlySet<string>,
): readonly string[] {
  const undocumented = [...declared]
    .filter((label) => !documented.has(label))
    .sort();
  const undeclared = [...documented]
    .filter((label) => !declared.has(label))
    .sort();

  return [
    ...undocumented.map((label) => `${label} — ${UNDOCUMENTED}`),
    ...undeclared.map((label) => `${label} — ${UNDECLARED}`),
  ];
}

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

/**
 * A handler that ends the response, for a route registered only to
 * be walked.
 *
 * Never called: the router below is constructed and read, and no
 * request is ever made against it.
 *
 * @param _request - Unread.
 * @param response - Ended, so the handler is a legal terminal one.
 */
function noopHandler(_request: Request, response: Response): void {
  response.end();
}

/** The path the planted router registers, and no real one does. */
const PLANTED_ROUTE_PATH = '/domains/:slug/zz-no-such-route';

/**
 * The label that path answers, written out rather than composed.
 *
 * A literal and not a `labelFor` call, so the walk and the
 * expectation cannot agree through one broken function: this is
 * the string {@link labelsOf} has to produce, and the case asserts
 * it does before reading any report.
 */
const PLANTED_ROUTE_LABEL = 'GET /domains/:slug/zz-no-such-route';

/** A label in the same register, for the table plant below. */
const PLANTED_TABLE_LABEL = 'GET /runs/:id/zz-no-such-route';

/**
 * A binding table carrying one entry no router declares.
 *
 * `{}` is a binding this surface really carries — `GET /settings`
 * takes no address, no window and no body — so the plant is a
 * shape a table can hold rather than one invented for the case.
 * What an entry BINDS has nothing to do with which label reaches
 * the document, which is the whole of what is read here.
 *
 * `satisfies` rather than a bare `as const`, which type-checks
 * nothing at all: this is a table shape, and a plant that could
 * not be a table would be reporting on something else.
 */
const PLANTED_TABLE = {
  [PLANTED_TABLE_LABEL]: {},
} as const satisfies Readonly<Record<string, RouteSchemas>>;

/** What the planted registration answers with. Never read. */
const PLANTED_RESPONSE = 'Planted. The coverage walk reads a path '
  + 'item and its verb keys, and nothing under them.';

/**
 * The document metadata the generator requires and nothing reads.
 *
 * Deliberately not a copy of what `src/openapi.ts` writes:
 * {@link documentedOperations} walks `paths` alone, so a second
 * spelling of the title, the version or the dialect would restate
 * facts that module owns and this file has no way to keep in step
 * with.
 */
const PLANTED_METADATA = {
  openapi: '3.1.0',
  info: { title: 'planted', version: '0.0.0' },
};

/**
 * The document a table carrying {@link PLANTED_TABLE} would
 * generate.
 *
 * @returns A document over the real registry plus one registration
 *   per planted key.
 *
 * @remarks
 * THE PLANT GOES IN AT THE REGISTRY, not at the label set, so the
 * label read back has been through every step a real table key
 * takes: {@link parseRouteLabel} splits it and braces the
 * parameter, the generator collapses it under a path item, and
 * {@link documentedOperations} unbraces it again. A label appended
 * to the documented set would have shown only that
 * {@link coverageGaps} subtracts two sets.
 *
 * `registerTable` in `src/openapi.ts` is private, so the two lines
 * it performs per key are spelled out here. The part of it that
 * could get a path wrong is {@link parseRouteLabel}, which is that
 * module's own and is imported rather than restated.
 */
function plantedDocument(): OpenApiDocument {
  const registry = buildOpenApiRegistry();

  for (const label of Object.keys(PLANTED_TABLE)) {
    const { method, path } = parseRouteLabel(label);

    registry.registerPath({
      method,
      path,
      summary: label,
      responses: { 200: { description: PLANTED_RESPONSE } },
    });
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument(PLANTED_METADATA);
}

describe('OpenAPI coverage - the plants', () => {
  // The negative first, because everything in the next describe is
  // a zero over the real surface and a comparison that had stopped
  // comparing answers a zero too.
  //
  // This is the direction the invariant exists for: a route a
  // router declares and no table names. The router is built here
  // rather than borrowed, so what it declares is what this case
  // says it declares and nothing about the real surface can make
  // the plant go quiet.
  it('names a route no binding table documents', () => {
    const router = Router();
    router.get(PLANTED_ROUTE_PATH, noopHandler);

    const labels = labelsOf(router, '');

    // The plant is a plant only while the surface lacks it, and
    // the walk is what has to answer the label: this is where the
    // path above and the literal below are tied together.
    expect(labels).toStrictEqual([PLANTED_ROUTE_LABEL]);
    expect(DOCUMENTED.has(PLANTED_ROUTE_LABEL)).toBe(false);
    expect(DECLARED.has(PLANTED_ROUTE_LABEL)).toBe(false);

    const declared = new Set([...DECLARED, ...labels]);

    // One line, naming the label and its direction. The list being
    // no longer than that is the real surface's own zero, read
    // again from inside the plant.
    expect(coverageGaps(DOCUMENTED, declared))
      .toEqual([PLANTED_ROUTE_LABEL + ' — ' + UNDOCUMENTED]);
  });

  // The mirror, and the direction a table naming a route since
  // renamed or removed produces. Planted at the table so the label
  // reaches the comparison the way a real one does, per
  // `plantedDocument` above.
  it('names a documented route no router declares', () => {
    const documented = documentedOperations(plantedDocument());
    const added = [...documented].filter((label) => !DOCUMENTED.has(label));

    expect(DOCUMENTED.has(PLANTED_TABLE_LABEL)).toBe(false);
    expect(DECLARED.has(PLANTED_TABLE_LABEL)).toBe(false);

    // The entry added exactly one operation and moved no other,
    // which is what says the gap below is the plant rather than a
    // document generated some other way.
    expect(added).toStrictEqual([PLANTED_TABLE_LABEL]);
    expect(documented.size).toBe(DOCUMENTED.size + 1);

    expect(coverageGaps(documented, DECLARED))
      .toEqual([PLANTED_TABLE_LABEL + ' — ' + UNDECLARED]);
  });
});

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

describe('OpenAPI coverage', () => {
  // Ruled out before the zero below, and the only thing that can
  // rule it out: a generator that registered nothing and a roster
  // that walked nothing are set-equal, and pass the case after
  // this one exactly as a correct surface does. Sizes rather than
  // members, since which routes exist is what the equality is for.
  it('walks a non-empty surface on both sides', () => {
    expect(DOCUMENTED.size).toBeGreaterThan(0);
    expect(DECLARED.size).toBeGreaterThan(0);
  });

  // The invariant. One list rather than two expectations, so a
  // swap — one route dropped and another grown — reports both
  // halves instead of stopping at the first, and reports them as
  // labels, the sizes agreeing through exactly that fault.
  it('documents every declared route and no other', () => {
    expect(coverageGaps(DOCUMENTED, DECLARED)).toEqual([]);
  });
});
