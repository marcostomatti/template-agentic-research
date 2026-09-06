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
 * The document is generated once, at module scope, for the reason
 * `src/openapi.test.ts` gives its own copy: generation walks all
 * seventeen binding tables, and nothing here varies the port.
 */
import { describe, expect, it } from 'vitest';

import { generateOpenApiDocument } from '../../src/openapi.js';

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
