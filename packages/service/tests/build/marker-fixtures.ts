/**
 * @packageDocumentation
 * Fixtures the workflow build's cases are written against: a stand-in
 * for the transpiler, one library source per export form the splice
 * rule accepts and per form it refuses, and a template carrying
 * markers at several of the nesting depths a workflow source buries
 * them at.
 *
 * A shared module rather than literals inside one suite, because
 * three files want the same samples — the marker cases beside this
 * file, the build cases driving a build over a fixture tree, and the
 * splice case that spawns a real build, all arriving later in this
 * stage. Sharing is also what makes a roster assertable: a case can
 * ask whether every refused form was reached, which is a question no
 * inline literal answers. `tsconfig.json` excludes every `*.test.ts`
 * from the program and includes this directory, so what a type
 * checker reads about these shapes it reads here.
 *
 * A stand-in is needed at all because `Bun.Transpiler` is not
 * reachable from a vitest worker: `tests/helpers/bun-polyfill.ts`
 * installs a partial `Bun` global carrying only `serve`, so a case
 * reaching for the real transpiler fails on construction rather than
 * on anything it meant to assert.
 *
 * The stand-in works by lookup and does not transpile, which is the
 * point rather than a shortcut. A fake stripping types for itself
 * would be a second, differently-wrong TypeScript, and every case
 * built on it would assert against that second implementation
 * instead of the one the build runs. Nothing here derives an
 * expected value by applying a rule under test either: `stripped` is
 * written out rather than computed, because a computed one would be
 * `stripDeclarationExports` reimplemented, and a case comparing the
 * two would hold for whatever either became.
 *
 * What the samples carry instead is what the real `Bun.Transpiler`
 * was measured to produce. That makes them a snapshot of one
 * transpiler, which is this module's standing limit: bun changing
 * how it emits a declaration leaves these samples describing an
 * output no build makes, and every case here keeps passing. What
 * reads the real transpiler is the subprocess-spawning cases in
 * `build-workflows.test.ts` and `schedule-splice.test.ts`.
 */

/** One import a scan reports, as `Bun.Transpiler` shapes it. */
export interface LibScanImport {
  /** The import form, `import-statement` for every sample here. */
  readonly kind: string;

  /** The specifier, exactly as the source wrote it. */
  readonly path: string;
}

/**
 * What a transpiler scan answers about one library source.
 *
 * The two members answer different questions. `imports` refuses a
 * library depending on anything at run time, since a Code node is
 * not a module and resolves no specifier. `exports` names what the
 * source declares, which is what says a declaration survived the
 * strip rather than going with the keyword.
 */
export interface LibScan {
  /** Every name the source exports, `default` included as a name. */
  readonly exports: readonly string[];

  /** Every value import left after type-only ones erase. */
  readonly imports: readonly LibScanImport[];
}

/**
 * The slice of `Bun.Transpiler` the build reaches for.
 *
 * Declared structurally rather than imported from bun's own types,
 * so a fake satisfies it without pretending to be the real class and
 * without these fixtures depending on which bun types are installed.
 */
export interface LibTranspiler {
  /** The source with its types erased and its exports kept. */
  transformSync(source: string): string;

  /** What the source imports and exports. */
  scan(source: string): LibScan;
}

/**
 * One library source, paired with what the real transpiler makes of
 * it.
 *
 * `transpiled` and `scan` are what a `Bun.Transpiler` over the `ts`
 * loader returned for `source`. Editing `source` without
 * re-measuring the other two leaves a sample describing nothing,
 * which is the one way this module lies to every case at once.
 */
export interface LibSample {
  /**
   * A stable id, pairing a sample to the roster entry it stands for.
   * Failure output prints this rather than the source.
   */
  readonly id: string;

  /** The export form or the control this sample stands for. */
  readonly standsFor: string;

  /**
   * The path a marker names it by, relative to the library
   * directory — what `__INLINE:<path>__` carries between its
   * delimiters.
   */
  readonly path: string;

  /** The TypeScript as authored, newline-terminated. */
  readonly source: string;

  /** What `transformSync` returned for {@link source}. */
  readonly transpiled: string;

  /** What `scan` returned for {@link source}. */
  readonly scan: LibScan;
}

/**
 * A sample the splice rule accepts, carrying what it looks like once
 * the export keyword is gone.
 */
export interface SpliceableLibSample extends LibSample {
  /**
   * {@link LibSample.transpiled} with the leading `export ` removed
   * and nothing else touched. Written out rather than computed: a
   * field derived by the same regex the build uses would agree with
   * that regex for every value it could take, including a wrong one.
   */
  readonly stripped: string;
}

/** A sample the build refuses, and the form it is refused for. */
export interface RefusedLibSample extends LibSample {
  /**
   * The form the refusal names — the text a case asserts on, so a
   * sample refused for the wrong reason fails rather than counting
   * as covered.
   */
  readonly refusedForm: string;

  /** Why a library in this form cannot stand alone in a node. */
  readonly reason: string;
}

/**
 * One sample per declaration export form the build splices.
 *
 * These five are the whole of what is spliceable: a leading
 * `export ` on a `function`, `const`, `class`, `let` or `var`
 * declaration, which strips to a declaration a Code node runs as
 * written. A case asserting the strip should walk this roster rather
 * than naming forms one at a time, so a sixth form added to the
 * build without a sample here fails a set-equality guard instead of
 * going untested. The declarations are deliberately dull: the first
 * line is what is under test.
 */
export const SPLICEABLE_LIB_SAMPLES: readonly SpliceableLibSample[] = [
  {
    id: 'spliceable-function',
    standsFor: 'export function',
    path: 'widen-bounds.ts',
    source: 'export function widenBounds(seconds: number): number {\n  return seconds * 2;\n}\n',
    transpiled: 'export function widenBounds(seconds) {\n  return seconds * 2;\n}\n',
    stripped: 'function widenBounds(seconds) {\n  return seconds * 2;\n}\n',
    scan: { exports: ['widenBounds'], imports: [] },
  },
  {
    id: 'spliceable-const',
    standsFor: 'export const',
    path: 'default-cap.ts',
    source: 'export const DEFAULT_CAP: number = 25;\n',
    transpiled: 'export const DEFAULT_CAP = 25;\n',
    stripped: 'const DEFAULT_CAP = 25;\n',
    scan: { exports: ['DEFAULT_CAP'], imports: [] },
  },
  {
    id: 'spliceable-class',
    standsFor: 'export class',
    path: 'ticker.ts',
    source: 'export class Ticker {\n  seconds = 60;\n}\n',
    transpiled: 'export class Ticker {\n  seconds = 60;\n}\n',
    stripped: 'class Ticker {\n  seconds = 60;\n}\n',
    scan: { exports: ['Ticker'], imports: [] },
  },
  {
    id: 'spliceable-let',
    standsFor: 'export let',
    path: 'ticks.ts',
    source: 'export let ticks: number = 0;\n',
    transpiled: 'export let ticks = 0;\n',
    stripped: 'let ticks = 0;\n',
    scan: { exports: ['ticks'], imports: [] },
  },
  {
    id: 'spliceable-var',
    standsFor: 'export var',
    path: 'legacy-ticks.ts',
    source: 'export var legacyTicks: number = 0;\n',
    transpiled: 'export var legacyTicks = 0;\n',
    stripped: 'var legacyTicks = 0;\n',
    scan: { exports: ['legacyTicks'], imports: [] },
  },
];

/**
 * One sample per form the build refuses, each with the reason a
 * library written that way cannot be spliced.
 *
 * Three of the four are trailing or standalone statements that
 * stripping a leading keyword cannot repair, and the fourth is a
 * dependency a Code node cannot resolve. Refusing them by name keeps
 * the failure at build time, in a message naming the file, rather
 * than on an instance as a node throwing on first execution.
 *
 * `refused-star` is measured to trip two rules at once: its scan
 * reports `./bounds.js` as an import AND its text carries `export *`,
 * so a case pairing it to the star form must assert on the form the
 * refusal names. Asserting only that something threw would pass
 * while the star rule was missing entirely.
 */
export const REFUSED_LIB_SAMPLES: readonly RefusedLibSample[] = [
  {
    id: 'refused-named-list',
    standsFor: 'export { ... }',
    refusedForm: 'export {',
    reason: 'A trailing export list is its own statement, so nothing '
      + 'is left to strip a keyword from.',
    path: 'named-list.ts',
    source: 'function widenBounds(seconds: number): number {\n  return seconds * 2;\n}\n\nexport { widenBounds };\n',
    transpiled: 'function widenBounds(seconds) {\n  return seconds * 2;\n}\n\nexport { widenBounds };\n',
    scan: { exports: ['widenBounds'], imports: [] },
  },
  {
    id: 'refused-default',
    standsFor: 'export default',
    refusedForm: 'export default',
    reason: 'A default export names nothing, so even a clean strip '
      + 'would leave the body reachable under no identifier.',
    path: 'default-export.ts',
    source: 'export default function widenBounds(seconds: number): number {\n  return seconds * 2;\n}\n',
    transpiled: 'export default function widenBounds(seconds) {\n  return seconds * 2;\n}\n',
    scan: { exports: ['default'], imports: [] },
  },
  {
    id: 'refused-star',
    standsFor: 'export *',
    refusedForm: 'export *',
    reason: 'A re-export is a dependency wearing an export keyword: '
      + 'it declares nothing and names a file the node cannot reach.',
    path: 'star-export.ts',
    source: 'export * from \'./bounds.js\';\n',
    transpiled: 'export * from "./bounds.js";\n',
    scan: { exports: [], imports: [{ kind: 'import-statement', path: './bounds.js' }] },
  },
  {
    id: 'refused-value-import',
    standsFor: 'a value import',
    refusedForm: 'import',
    reason: 'A Code node is not a module and resolves no specifier, '
      + 'so a surviving import fails on its first execution.',
    path: 'read-bounds.ts',
    source: 'import { readFileSync } from \'node:fs\';\n\nexport function readBounds(path: string): string {\n  return readFileSync(path, \'utf8\');\n}\n',
    transpiled: 'import { readFileSync } from "node:fs";\nexport function readBounds(path) {\n  return readFileSync(path, "utf8");\n}\n',
    scan: { exports: ['readBounds'], imports: [{ kind: 'import-statement', path: 'node:fs' }] },
  },
];

/**
 * The nearest legitimate neighbours of the refused forms — sources
 * the build must accept, each a control for a rule that could have
 * been written too broadly.
 *
 * A refusal roster proves only that something is refused. These say
 * what is not: the phrase `export default` inside a string is not a
 * default export, a type-only dependency is not a dependency, and an
 * indented `export` inside a template literal is not a declaration.
 * Each pairs with a rule a substring match or an unanchored regex
 * would have broken.
 *
 * The last also states the limit of a line-anchored rule rather than
 * hiding it: what saves that sample is its indentation, so a
 * template literal holding an UNindented `export const` at the start
 * of one of its lines is a case neither the strip nor the refusal
 * can tell from a declaration. No library here writes one, and
 * nothing detects it if one ever does.
 */
export const LIB_CONTROL_SAMPLES: readonly SpliceableLibSample[] = [
  {
    id: 'control-type-only-import',
    standsFor: 'a type-only import, which erases before the scan',
    path: 'widen-typed.ts',
    source: 'import type { Bounds } from \'./bounds.js\';\n\nexport function widenBounds(bounds: Bounds): Bounds {\n  return bounds;\n}\n',
    transpiled: 'export function widenBounds(bounds) {\n  return bounds;\n}\n',
    stripped: 'function widenBounds(bounds) {\n  return bounds;\n}\n',
    scan: { exports: ['widenBounds'], imports: [] },
  },
  {
    id: 'control-export-text-in-string',
    standsFor: 'the phrase export default inside a string literal',
    path: 'describe-forms.ts',
    source: 'export function describeForms(): string {\n  return \'a lib may not carry export default at the start of a line\';\n}\n',
    transpiled: 'export function describeForms() {\n  return "a lib may not carry export default at the start of a line";\n}\n',
    stripped: 'function describeForms() {\n  return "a lib may not carry export default at the start of a line";\n}\n',
    scan: { exports: ['describeForms'], imports: [] },
  },
  {
    id: 'control-export-in-template-literal',
    standsFor: 'an indented export inside a template literal',
    path: 'snippet.ts',
    source: 'export const SNIPPET: string = `\n  export const inner = 1;\n`;\n',
    transpiled: 'export const SNIPPET = `\n  export const inner = 1;\n`;\n',
    stripped: 'const SNIPPET = `\n  export const inner = 1;\n`;\n',
    scan: { exports: ['SNIPPET'], imports: [] },
  },
  {
    id: 'control-setting-marker-in-lib',
    standsFor: 'a setting marker written inside a library source',
    path: 'sources/build-tag.ts',
    source: 'export const BUILD_TAG: string = \'__ENVVAR:AR_BUILD_TAG__\';\n',
    transpiled: 'export const BUILD_TAG = "__ENVVAR:AR_BUILD_TAG__";\n',
    stripped: 'const BUILD_TAG = "__ENVVAR:AR_BUILD_TAG__";\n',
    scan: { exports: ['BUILD_TAG'], imports: [] },
  },
];

/**
 * Every sample, in roster order.
 *
 * What {@link fakeTranspile} looks a source up in, and what a case
 * reads to assert the ids are unique — two samples sharing one would
 * make the second unreachable through the lookup while both still
 * counted toward a roster's coverage.
 *
 * `control-setting-marker-in-lib` is the one entry with a
 * subdirectory in its path, and the library {@link markerTemplate}
 * inlines: driving both halves at once exercises the nested marker
 * path, the inline, and the setting resolution after it.
 */
export const ALL_LIB_SAMPLES: readonly LibSample[] = [
  ...SPLICEABLE_LIB_SAMPLES,
  ...REFUSED_LIB_SAMPLES,
  ...LIB_CONTROL_SAMPLES,
];

/**
 * Thrown when the transpiler stand-in is handed a source it has no
 * recorded answer for.
 *
 * A distinct class rather than a bare `Error`, so a case can pin
 * this cause: a fake being driven wrongly and a build rule refusing
 * correctly both surface as a throw, and an assertion accepting
 * either would pass for the wrong reason.
 *
 * Failing is the whole design. The obvious fallback — hand the
 * source back unchanged — is what a transpiler over plain JavaScript
 * would do, so a case that quietly stopped modelling a sample would
 * assert against untranspiled TypeScript and stay green doing it.
 * The source is carried whole rather than summarised, because the
 * usual cause is whitespace a diff does not print.
 */
export class UnmodelledLibSourceError extends Error {
  /** The source handed to the fake, exactly as it was received. */
  readonly source: string;

  /** The ids the fake was holding when it was asked. */
  readonly known: readonly string[];

  /**
   * @param source - The source no sample carried.
   * @param known - The ids of the samples the fake was given.
   */
  constructor(source: string, known: readonly string[]) {
    super(
      'The transpiler stand-in has no recorded output for the source '
      + `it was handed. It holds ${known.length} samples `
      + `(${known.join(', ')}) and matches on exact text, so an edit `
      + 'to a sample source lands here until the recording beside it '
      + 'is re-measured. Either pass the source through the fake\'s '
      + 'extra samples, or add it to a roster in marker-fixtures.ts '
      + `with its measured output. Source: ${JSON.stringify(source)}`,
    );
    this.name = this.constructor.name;
    this.source = source;
    this.known = known;
  }
}

/** What the transpiler stand-in answers for one source. */
export interface FakeTranspileResult {
  /** The transpiled text, as `transformSync` would return it. */
  readonly code: string;

  /** The scan, as `scan` would return it. */
  readonly scan: LibScan;
}

/**
 * Look one source up among the samples and answer as the transpiler
 * did when the sample was recorded.
 *
 * Matching is on exact text, deliberately: a near match would have
 * to decide what counts as near, and every answer it guessed wrong
 * would be a case asserting against text no build produces.
 *
 * @param source - The library source to answer for.
 * @param samples - The samples to look in, every roster by default.
 * @returns The measured output for that source.
 * @throws UnmodelledLibSourceError When no sample carries the source.
 */
export function fakeTranspile(
  source: string,
  samples: readonly LibSample[] = ALL_LIB_SAMPLES,
): FakeTranspileResult {
  for (const sample of samples) {
    if (sample.source === source) {
      return { code: sample.transpiled, scan: sample.scan };
    }
  }

  throw new UnmodelledLibSourceError(source, samples.map((sample) => sample.id));
}

/**
 * Build a transpiler-shaped stand-in over the samples.
 *
 * The object rather than the function is what the build's loader
 * takes, since it asks two questions about one source. Both are
 * answered from the same lookup, so a modelled source cannot answer
 * one way for the output and another for the scan.
 *
 * @param extraSamples - Samples to answer for on top of the rosters,
 *   which is how a case models a source belonging to it alone.
 * @returns A stand-in satisfying the slice of `Bun.Transpiler` the
 *   build uses.
 */
export function fakeTranspiler(extraSamples: readonly LibSample[] = []): LibTranspiler {
  const samples: readonly LibSample[] = [...ALL_LIB_SAMPLES, ...extraSamples];

  return {
    transformSync(source: string): string {
      return fakeTranspile(source, samples).code;
    },

    scan(source: string): LibScan {
      return fakeTranspile(source, samples).scan;
    },
  };
}

/**
 * One place in the fixture template where a marker is planted.
 *
 * The depth is `path.length` and is not carried as a second field,
 * which could only drift from the path describing it.
 */
export interface MarkerSite {
  /** A stable id, printed when a case reports which site failed. */
  readonly id: string;

  /** What burying a marker here is a test of. */
  readonly standsFor: string;

  /**
   * The keys and indices to walk from the template root, readable
   * with {@link valueAtPath}.
   */
  readonly path: readonly (string | number)[];

  /**
   * Every marker in that string, in order and including repeats — so
   * a case can assert a replacement was global rather than
   * first-only.
   */
  readonly markers: readonly string[];
}

/**
 * Where {@link markerTemplate} plants a marker, and what each
 * planting is a test of.
 *
 * A roster rather than a list of assertions, so a case can walk it,
 * read each site out of a resolved template, and report every site
 * still holding a marker instead of stopping at the first. It is
 * also the coverage claim: a marker added to the template without an
 * entry here is one nothing walks.
 *
 * The depths run 1, 2, 4 and 7, and the deep one crosses two arrays.
 * A walk recursing into objects and not arrays resolves the shallow
 * sites and leaves that one untouched.
 */
export const MARKER_TEMPLATE_SITES: readonly MarkerSite[] = [
  {
    id: 'root-string',
    standsFor: 'a marker as the whole of a top-level value',
    path: ['notes'],
    markers: ['__ENVVAR:AR_BUILD_TAG__'],
  },
  {
    id: 'array-element',
    standsFor: 'a marker in one element of an array of strings',
    path: ['labels', 1],
    markers: ['__ENVVAR:AR_BUILD_TAG__'],
  },
  {
    id: 'array-object-array-object',
    standsFor: 'a marker under two array hops and three object hops',
    path: ['nodes', 0, 'parameters', 'rule', 'interval', 0, 'cronExpression'],
    markers: ['__ENVVAR:AR_DISPATCH_CRON__'],
  },
  {
    id: 'both-marker-kinds',
    standsFor: 'a library marker and a setting marker in one string, '
      + 'where the library inlined carries a setting marker of its '
      + 'own and resolves only if inlining runs first',
    path: ['nodes', 1, 'parameters', 'jsCode'],
    markers: ['__INLINE:sources/build-tag.ts__', '__ENVVAR:AR_DISPATCH_BATCH_CAP__'],
  },
  {
    id: 'repeated-marker',
    standsFor: 'one marker twice in a string of surrounding prose',
    path: ['nodes', 2, 'parameters', 'content'],
    markers: ['__ENVVAR:AR_BUILD_TAG__', '__ENVVAR:AR_BUILD_TAG__'],
  },
];

/** One value in the fixture template resolution must not touch. */
export interface InertSite {
  /** A stable id, printed when a case reports which site changed. */
  readonly id: string;

  /** What leaving this alone is a test of. */
  readonly standsFor: string;

  /** The keys and indices to walk from the template root. */
  readonly path: readonly (string | number)[];

  /**
   * What must come back. Compared by value rather than identity:
   * nothing on the resolution path promises to hand back the same
   * object it was given.
   */
  readonly value: unknown;
}

/**
 * The values a marker pass has no business changing.
 *
 * A walk over strings is easy to write in a way that survives its
 * own tests and mangles everything else — a number stringified, a
 * `null` read as an object, an empty array rebuilt as one. None of
 * those shows up in a case asserting only that the markers
 * resolved, because every one leaves the marker sites correct.
 */
export const MARKER_TEMPLATE_INERT_SITES: readonly InertSite[] = [
  {
    id: 'inert-string',
    standsFor: 'a string carrying no marker',
    path: ['name'],
    value: 'AR Marker Fixture',
  },
  {
    id: 'inert-boolean',
    standsFor: 'a boolean leaf',
    path: ['active'],
    value: false,
  },
  {
    id: 'inert-number',
    standsFor: 'a number leaf, which must not come back as text',
    path: ['version'],
    value: 2,
  },
  {
    id: 'inert-null',
    standsFor: 'a null leaf, which typeof reports as an object',
    path: ['meta'],
    value: null,
  },
  {
    id: 'inert-empty-array',
    standsFor: 'an empty array, which must not become an object',
    path: ['tags'],
    value: [],
  },
  {
    id: 'inert-empty-object',
    standsFor: 'an empty object',
    path: ['connections'],
    value: {},
  },
];

/**
 * Build the template the marker sites are planted in.
 *
 * A function rather than a constant, so every case gets its own
 * tree. A shared literal would let a case resolving in place hand
 * the next one a template with no markers left, and that second case
 * would pass by finding nothing to resolve.
 *
 * Shaped like a workflow source without being one — a name, a nodes
 * array, parameters nested the way a node nests them — because the
 * depths under test are the depths real sources bury strings at. No
 * node type here is real, and the build never reads it.
 *
 * Every setting marker names an `ENV_DEFAULTS` entry, so the default
 * chain resolves the template with no environment and no `.env`
 * behind it, and the one library marker names
 * `control-setting-marker-in-lib` above.
 *
 * Markers sit in object VALUES only. One written as a KEY is not
 * reached by a walk over strings, and nothing plants one here: what
 * catches such a marker is the refusal over serialized output.
 *
 * @returns A fresh template, holding a marker at each site in
 *   {@link MARKER_TEMPLATE_SITES}.
 */
export function markerTemplate(): Record<string, unknown> {
  return {
    name: 'AR Marker Fixture',
    active: false,
    version: 2,
    meta: null,
    tags: [],
    connections: {},
    notes: '__ENVVAR:AR_BUILD_TAG__',
    labels: ['stable', '__ENVVAR:AR_BUILD_TAG__'],
    nodes: [
      {
        name: 'Tick',
        parameters: {
          rule: {
            interval: [
              { cronExpression: '__ENVVAR:AR_DISPATCH_CRON__' },
            ],
          },
        },
      },
      {
        name: 'Cap',
        parameters: {
          jsCode: '__INLINE:sources/build-tag.ts__\n'
            + 'const cap = Number(\'__ENVVAR:AR_DISPATCH_BATCH_CAP__\');\n',
        },
      },
      {
        name: 'Stamp',
        parameters: {
          content: 'Build stamp __ENVVAR:AR_BUILD_TAG__. An instance not '
            + 'showing __ENVVAR:AR_BUILD_TAG__ is running an older import.',
        },
      },
    ],
  };
}

/**
 * Thrown when a site path does not reach a value in the tree it was
 * walked against.
 *
 * The template and the site rosters are two declarations of one
 * shape, and this is what happens when they stop agreeing: a node
 * inserted ahead of another shifts every index after it.
 *
 * Refusing keeps that from reading as a pass. The alternative is
 * `undefined`, and a case asking whether a resolved site still holds
 * a marker gets `no` for a site never read — the same answer, in the
 * same words, as for one that resolved correctly.
 */
export class MarkerSitePathError extends Error {
  /** The path being walked, whole. */
  readonly path: readonly (string | number)[];

  /** The index in {@link path} of the step that found nothing. */
  readonly step: number;

  /**
   * @param path - The path being walked.
   * @param step - The index of the step that found nothing.
   */
  constructor(path: readonly (string | number)[], step: number) {
    super(
      `The path [${path.join(', ')}] stops at step ${step} `
      + `(${String(path[step])}): the value it names is absent, or `
      + 'the value above it is not a container. The template in '
      + 'marker-fixtures.ts and the site roster beside it have '
      + 'drifted apart — fix whichever of the two moved.',
    );
    this.name = this.constructor.name;
    this.path = path;
    this.step = step;
  }
}

/**
 * Read the value one site path names.
 *
 * Written here rather than in each case, because the walk is
 * unpleasant under `noUncheckedIndexedAccess` and a case hand-
 * rolling it reaches for a cast that turns a stale path into
 * `undefined` rather than into a failure. An `undefined` at any step
 * is read as absent rather than as a value, which is sound over
 * these fixtures and only over them: they are JSON-shaped.
 *
 * @param root - The tree to walk, a template or a resolved copy.
 * @param path - The keys and indices to follow.
 * @returns The value at the end of the path.
 * @throws MarkerSitePathError When a step finds nothing.
 */
export function valueAtPath(
  root: unknown,
  path: readonly (string | number)[],
): unknown {
  let current: unknown = root;

  for (const [step, key] of path.entries()) {
    if (typeof current !== 'object' || current === null) {
      throw new MarkerSitePathError(path, step);
    }

    const next: unknown = (current as Record<string, unknown>)[String(key)];

    if (next === undefined) {
      throw new MarkerSitePathError(path, step);
    }

    current = next;
  }

  return current;
}
