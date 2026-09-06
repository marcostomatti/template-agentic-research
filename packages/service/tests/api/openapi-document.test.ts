/**
 * The generated document, handed whole to a schema nobody here
 * wrote.
 *
 * `generateOpenApiDocument()` is read against the OpenAPI 3.1 JSON
 * Schema through `@seriousme/openapi-schema-validator`, an
 * independent implementation of the specification that knows
 * nothing about this package, its seventeen binding tables or the
 * generator that assembled them.
 *
 * WHAT THIS FILE ASKS THAT `src/openapi.test.ts` DOES NOT is
 * whether the document is WELL FORMED. Every case there reads a
 * member this repo put there — the dialect string, the paths
 * object, the three component names, the version, the server — so
 * each one compares this package against itself, and all of them
 * stay green over a document carrying a structure the
 * specification has no place for. Here the whole document meets a
 * schema written by somebody else, so an emission the generator
 * makes and the specification forbids is reported without anyone
 * here having predicted its shape.
 *
 * THE PASSING VERDICT IS `valid` AND A VERSION, never `valid`
 * alone. `Validator.supportedVersions` is FOUR — `2.0`, `3.0`,
 * `3.1` and `3.2` — and an instance picks one off the document's
 * own `openapi` field, so `valid: true` says only that SOME schema
 * accepted it. What says the 3.1 schema ran is `validator.version`
 * after the call, measured `undefined` before it. A plant below
 * relabels this same document `3.0.3` and reads the refusal, which
 * is what makes the selection a mechanism rather than a constant.
 *
 * `valid: false` HAS TWO POPULATIONS and only one of them is a
 * schema violation. A document whose version cannot be determined
 * answers `errors` as a STRING, before any schema is chosen —
 * measured on this document with `openapi` deleted. So each plant
 * asserts the errors are an ARRAY as well as that the document was
 * refused, and a case drives the string shape as the near miss
 * that gives the array reading its meaning.
 *
 * THE PLANTS COME FIRST, deliberately, and each is DERIVED from
 * the real document rather than transcribed. The passing verdict
 * is a zero — no errors at all — and a validator that had stopped
 * validating answers a zero too, so the file breaks the document
 * in two named ways and reads the refusals before its own green
 * means anything. Deriving keeps that true when a route moves:
 * `plantSiteOf` walks the document for a path, a verb and a
 * status and throws at the first level it cannot find, and the
 * expected fault pointer is built from those same segments rather
 * than written out beside them.
 *
 * `validate` IS ASYNC AND ANSWERS RATHER THAN THROWS, which is two
 * ways to write a case that pins nothing: a missing `await` leaves
 * a promise whose `valid` is `undefined`, and a `rejects.toThrow`
 * finds nothing to catch. Every case awaits and reads the answer.
 * Each also builds its OWN `Validator`, because `version` is
 * instance state written by the call and a shared one would report
 * the previous case's document.
 */

import { Validator } from '@seriousme/openapi-schema-validator';
import { describe, expect, it } from 'vitest';

import { generateOpenApiDocument } from '../../src/openapi.js';

// ---------------------------------------------------------------------------
// The document, and the verdict one validation answers
// ---------------------------------------------------------------------------

/**
 * The document every case reads, generated once.
 *
 * SPREAD rather than passed as it comes, and the spread is the
 * whole conversion: `validate` takes `Record<string, unknown>`
 * while the generator answers an interface, which carries no index
 * signature and is not assignable to one. The anonymous type a
 * spread produces does get the implicit index signature.
 */
const DOCUMENT: Record<string, unknown> = { ...generateOpenApiDocument() };

/** What {@link DOCUMENT} held before any case ran. */
const DOCUMENT_JSON = JSON.stringify(DOCUMENT);

/**
 * The specification version this surface is read against, spelled
 * as the VALIDATOR names it.
 *
 * Two digits and not the three the document declares: `openapi` is
 * `3.1.0`, a patch-level dialect string, and the validator selects
 * a schema by the `3.1` minor it belongs to.
 */
const SCHEMA_VERSION = '3.1';

/** The array form of what `validate` reports, named off the method. */
type SchemaErrors = Extract<
  Awaited<ReturnType<Validator['validate']>>['errors'],
  readonly unknown[]
>;

/** What one call to `validate` answered, with the schema it chose. */
interface Verdict {
  /** Whether the selected schema accepted the document. */
  readonly valid: boolean;

  /** The violations, or a string where no schema was selected. */
  readonly errors: Awaited<ReturnType<Validator['validate']>>['errors'];

  /** The version the instance picked, where it picked one. */
  readonly version: string | undefined;
}

/** One schema violation, reduced to what a case below reads. */
interface SchemaFault {
  /** The JSON pointer into the document ajv reports it at. */
  readonly at: string;

  /** Which keyword the document failed. */
  readonly keyword: string;

  /**
   * What that keyword names: the missing property, the expected
   * type, the property that was not allowed. Carried whole rather
   * than plucked, so each plant below names its own subject.
   */
  readonly params: Record<string, unknown>;
}

/**
 * Validates one document through a fresh validator.
 *
 * @param document - A whole OpenAPI document.
 * @returns Its verdict, the selected version included.
 *
 * @remarks
 * A new `Validator` per call, because `version` is instance state
 * written by `validate`: a shared one answers the previous call.
 */
async function validationOf(
  document: Record<string, unknown>,
): Promise<Verdict> {
  const validator = new Validator();
  const { valid, errors } = await validator.validate(document);
  const version: string | undefined = validator.version;

  return { valid, errors, version };
}

/**
 * One ajv error, as the three fields a case reads.
 *
 * @param error - One member of the array form.
 * @returns Its pointer, its keyword and its parameters.
 */
function toFault(error: SchemaErrors[number]): SchemaFault {
  return {
    at: error.instancePath,
    keyword: error.keyword,
    params: { ...error.params },
  };
}

/**
 * The schema violations a verdict carries.
 *
 * @param verdict - Per {@link validationOf}.
 * @returns One entry per violation, in the order ajv reports them.
 * @throws TypeError - When the verdict carries the STRING form, or
 *   carries nothing at all. Refusing rather than answering an
 *   empty list is what keeps the two `valid: false` populations
 *   apart: a version that could not be determined never reaches a
 *   schema, and an empty list read off it would pass for a plant
 *   the schema had considered and refused.
 */
function faultsOf(verdict: Verdict): SchemaFault[] {
  const { errors } = verdict;

  if (!Array.isArray(errors)) {
    const held = typeof errors === 'string'
      ? errors
      : 'no errors at all';

    throw new TypeError(`no schema violations to read: ${held}`);
  }

  return errors.map(toFault);
}

// ---------------------------------------------------------------------------
// The walk the plants land through
// ---------------------------------------------------------------------------

/**
 * One JSON-pointer segment, escaped as RFC 6901 requires.
 *
 * @param segment - A member name, `/domains/{slug}`.
 * @returns The same name with `~` and then `/` escaped, in that
 *   order. Reversed, the two replacements double-escape a slash.
 */
function escapedSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * The JSON pointer ajv reports a member at.
 *
 * @param segments - The member path, one key per level.
 * @returns `/paths/~1domains` and its siblings.
 *
 * @remarks
 * Built from the plant's own segments rather than written out, so
 * a plant that lands somewhere else names where it actually
 * landed instead of failing against a transcribed constant.
 */
function pointerTo(segments: readonly string[]): string {
  return `/${segments.map(escapedSegment).join('/')}`;
}

/**
 * The object at one member path inside a document.
 *
 * @param document - The document to walk. NOT copied, so what
 *   comes back is the object inside it and a plant that writes to
 *   the return value writes to the document.
 * @param segments - The path to walk, one key per level.
 * @returns The object that path names.
 * @throws TypeError - At the first level that is absent or is not
 *   an object, naming the path. A walk answering `undefined`
 *   instead would let a plant land on a branch the document does
 *   not have, and the case would then read a refusal that was
 *   about the plant rather than about the document.
 */
function memberAt(
  document: Record<string, unknown>,
  segments: readonly string[],
): Record<string, unknown> {
  let held: Record<string, unknown> = document;

  for (const segment of segments) {
    const next = held[segment];

    if (typeof next !== 'object' || next === null) {
      const walked = segments.join(' / ');

      throw new TypeError(`no object at ${segment} in ${walked}`);
    }

    held = next as Record<string, unknown>;
  }

  return held;
}

/**
 * The first key an object carries.
 *
 * @param held - The object to read.
 * @param where - What a refusal names.
 * @returns Its first key.
 * @throws TypeError - When it carries none, which for any level of
 *   this document means the generator emitted an empty branch.
 */
function firstKeyOf(held: Record<string, unknown>, where: string): string {
  const [first] = Object.keys(held);

  if (first === undefined) throw new TypeError(`nothing under ${where}`);

  return first;
}

/** Where a plant lands, read off the document rather than typed in. */
interface PlantSite {
  /** A path the document declares. */
  readonly path: string;

  /** A verb that path item carries. */
  readonly verb: string;

  /** A status that operation declares a response for. */
  readonly status: string;
}

/**
 * The first operation the document declares, as three keys.
 *
 * @param document - The document to read.
 * @returns A path, a verb under it and a status under that.
 * @throws TypeError - From the walk, at the first level that is
 *   missing or empty.
 */
function plantSiteOf(document: Record<string, unknown>): PlantSite {
  const paths = memberAt(document, ['paths']);
  const path = firstKeyOf(paths, 'paths');
  const item = memberAt(document, ['paths', path]);
  const verb = firstKeyOf(item, `paths / ${path}`);
  const responses = memberAt(document, ['paths', path, verb, 'responses']);
  const status = firstKeyOf(responses, `${path} / ${verb} / responses`);

  return { path, verb, status };
}

/**
 * The member path of one response object.
 *
 * @param site - Per {@link plantSiteOf}.
 * @returns The five segments naming it, which are also what the
 *   expected fault pointer is built from.
 */
function responsePathOf(site: PlantSite): string[] {
  return ['paths', site.path, site.verb, 'responses', site.status];
}

/**
 * A deep copy of {@link DOCUMENT} for a plant to break.
 *
 * @returns A copy no other case shares. This document JSON
 *   round-trips byte-identically, so the copy is the same document
 *   rather than an approximation of it — measured.
 */
function plantableDocument(): Record<string, unknown> {
  return structuredClone(DOCUMENT);
}

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

describe('the 3.1 schema validator - the plants', () => {
  // The first of the two broken documents. A path item is an
  // object of operations, so a string in its place is refused by
  // the `type` keyword AT THE POINTER THE PLANT NAMES — which is
  // what says the validator descended into `paths` rather than
  // reading the top level and stopping there.
  it('refuses a paths entry that is not an object', async () => {
    const document = plantableDocument();
    const site = plantSiteOf(document);
    const paths = memberAt(document, ['paths']);

    // Read the member out before breaking it. A plant written into
    // a key the document does not carry is refused for its own
    // reason and says nothing about this one.
    expect(typeof paths[site.path]).toBe('object');

    paths[site.path] = 'not a path item';

    const verdict = await validationOf(document);

    expect(verdict.valid).toBe(false);
    expect(verdict.version).toBe(SCHEMA_VERSION);
    expect(faultsOf(verdict)).toContainEqual({
      at: pointerTo(['paths', site.path]),
      keyword: 'type',
      params: { type: 'object' },
    });
  });

  // The second. `description` is the one member the Response
  // Object requires, and deleting it reaches deeper than the plant
  // above: five levels down, inside an operation, past everything
  // a validator reading only the document envelope would see.
  it('refuses a response that declares no description', async () => {
    const document = plantableDocument();
    const site = plantSiteOf(document);
    const segments = responsePathOf(site);
    const response = memberAt(document, segments);

    expect(typeof response.description).toBe('string');

    delete response.description;

    const verdict = await validationOf(document);

    expect(verdict.valid).toBe(false);
    expect(verdict.version).toBe(SCHEMA_VERSION);
    expect(faultsOf(verdict)).toContainEqual({
      at: pointerTo(segments),
      keyword: 'required',
      params: { missingProperty: 'description' },
    });
  });

  // What the two plants above cannot say between them: that the
  // schema the passing case ran against is the 3.1 one. The
  // document is relabelled and nothing else about it moves, so the
  // refusal is entirely the selection.
  it('refuses this document when it is read as 3.0', async () => {
    const document = plantableDocument();

    expect(document.openapi).toBe('3.1.0');

    document.openapi = '3.0.3';

    const verdict = await validationOf(document);

    expect(verdict.version).toBe('3.0');
    expect(verdict.valid).toBe(false);
    // 3.1 added `webhooks` and the generator emits the key whether
    // or not anything is registered under it, so the 3.0 schema
    // refuses it at the top level as a property it does not allow.
    expect(faultsOf(verdict)).toContainEqual({
      at: '',
      keyword: 'additionalProperties',
      params: { additionalProperty: 'webhooks' },
    });
  });

  // The near miss that gives the ARRAY reading in the two plants
  // its meaning. This refusal happens before any schema is chosen,
  // so there is no violation to read at all — and an empty list
  // answered here would pass for a plant a schema had refused.
  it('answers a string where it can pick no version', async () => {
    const document = plantableDocument();

    expect(document.openapi).toBe('3.1.0');

    delete document.openapi;

    const verdict = await validationOf(document);

    expect(verdict.valid).toBe(false);
    expect(verdict.version).toBeUndefined();
    expect(typeof verdict.errors).toBe('string');
    expect(() => faultsOf(verdict)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------

describe('the generated document - the 3.1 schema', () => {
  it('validates against the 3.1 schema and no other', async () => {
    const verdict = await validationOf(plantableDocument());

    expect(verdict.valid).toBe(true);
    // `undefined` and not an empty array, which is what the
    // library answers over a clean document. Asserted so that a
    // change to an empty array is reported rather than absorbed.
    expect(verdict.errors).toBeUndefined();
    // The reading that says WHICH schema accepted it. `valid`
    // alone is satisfied by any of the four below.
    expect(verdict.version).toBe(SCHEMA_VERSION);
  });

  // What makes the version reading above load-bearing rather than
  // decorative: this validator carries four schemas and chooses
  // among them off the document, so a green `valid` names none.
  it('chooses among four specification versions', () => {
    const supported = [...Validator.supportedVersions].sort();

    expect(supported).toStrictEqual(['2.0', '3.0', '3.1', '3.2']);
    expect(supported).toContain(SCHEMA_VERSION);
  });

  // Last on purpose. Every plant above breaks a deep copy, and
  // this is what says so: the document the passing case reads is
  // the one the generator answered. The second half is the control
  // — a copy broken here and compared back is what says the
  // comparison can report a difference at all.
  it('leaves the document every case reads unchanged', () => {
    expect(JSON.stringify(DOCUMENT)).toBe(DOCUMENT_JSON);

    const copy = plantableDocument();

    delete copy.paths;

    expect(JSON.stringify(copy)).not.toBe(DOCUMENT_JSON);
    expect(JSON.stringify(DOCUMENT)).toBe(DOCUMENT_JSON);
  });
});
