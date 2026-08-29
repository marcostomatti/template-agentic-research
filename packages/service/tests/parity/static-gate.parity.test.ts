/**
 * Kernel parity for `src/lib/static-gate.ts`: the scoring pass, the
 * explanation and the threshold default, driven against their
 * originals over one neutral term set and diffed by path.
 *
 * KERNEL rather than full, and the boundary is the ORIGINAL's
 * export surface rather than a choice about coverage. The original
 * exports three functions and one constant; this port exports
 * fifteen values, because a spliced library cannot be split into
 * modules
 * and exporting a pass is the only way a caller composing one in a
 * node can have it. The escape, the anchored compile and the two
 * coercions are therefore inside this leg COMPOSITIONALLY — an
 * input reaching one compares it — and `tests/lib/static-gate.test.ts`
 * drives each on its own. What neither file can see alone is a pair
 * of errors cancelling between two passes, so read them together.
 *
 * {@link applyStaticGate} is the one export the original also has
 * that this file does not compare. It reads a term set the original
 * has no parameter for, a language roster it has no concept of and
 * an injected detector where the original reached for a sibling
 * module, so no single input could drive both sides. The unit file
 * characterizes it instead.
 *
 * ## The neutral term set, and the shape on each side
 *
 * The term set is authored HERE and handed to both sides. The port
 * reads one flat list of `{pattern, weight, polarity}` records
 * shaped like `terms` rows; the original reads a parsed lexicon
 * object with a positive list of literal terms, a negative list of
 * phrase patterns and a threshold beside them. {@link asKeywords}
 * is that translation and is the only thing in this file that knows
 * about the original's shape.
 *
 * A translation is a place a difference can hide, so it is held
 * down from both ends. Every entry the port would score has to
 * reach one of the two lists, asserted as a COUNT against the term
 * set itself; and the entries the translation cannot represent are
 * excluded from every sweep by construction rather than by being
 * forgotten — an entry whose polarity is outside the column's
 * domain has no list to go in, so the warning the port emits for it
 * is a port-only reading and belongs to the unit file.
 *
 * ## The hit keys, and why they are projected
 *
 * A hit names the `pattern` and the `polarity` here and named the
 * `term` and the `kind` there, which follows the input shape. So
 * every comparison runs both results through
 * {@link projectResult}, which reads each side by its own key names
 * and answers the same shape. The projection carries its own guard:
 * a case asserts each side's hit records hold EXACTLY the three
 * keys the projection consumes, so an added key on either side
 * fails rather than being silently dropped.
 *
 * ## A throw is an answer
 *
 * Every comparison runs both sides through {@link outcomeOf},
 * which turns either ending into a value. That matters twice here.
 * The text conversion under the scoring pass raises for a value
 * whose own conversion does, and the explanation raises for a hit
 * list holding an entry with no members at all — a reading this
 * port preserves precisely because it is inside this leg. A run
 * comparing only returned values would pass for a port that threw
 * a different sentence, threw where the original answered, or
 * answered where it threw.
 *
 * That arrangement needs the control that comes with it: two
 * implementations refusing everything agree perfectly. So a case
 * asserts the driven inputs produce BOTH endings, read off the
 * PORT rather than off the original, since the original is the
 * thing under measurement.
 *
 * ## The controls the sweeps rest on
 *
 * A scoring pass has a second way to agree about nothing: a corpus
 * no term matches is scored 0 by any implementation, right or
 * wrong. So the driven texts are held to producing hits and no
 * hits, warnings and no warnings, and both decisions — each read
 * off the port.
 *
 * ## Where the origin is loaded
 *
 * Inside cases, always. The gate binds a `describe` and nothing
 * above one, so module scope runs on a skipped run too: the port's
 * own functions are safe to call up there, and are, but a load
 * would throw on every run that armed nothing — including in CI,
 * where this file is meant to skip.
 */
import type { GateScore, GateTerm } from '../../src/lib/static-gate.js';

import { expect, it } from 'vitest';

import {
  DEFAULT_THRESHOLD,
  GATE_POLARITIES,
  explainGate,
  scoreText,
} from '../../src/lib/static-gate.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import {
  ADVERSARIAL_VALUES,
  INVISIBLE_CODE_POINTS,
  MARKUP_FIXTURES,
  STRUCTURED_TEXT_FIXTURES,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/static-gate.js';

/** The two functions this file drives. */
const FUNCTION_ENTRY_POINTS: readonly string[] = [
  'explainGate',
  'scoreMessage',
];

/** The constant it declares beside them. */
const CONSTANT_ENTRY_POINT = 'DEFAULT_THRESHOLD';

/** What the origin module has to be for this file to drive it. */
interface StaticGateOrigin {
  /** Renders one decision as a line, for storage beside it. */
  readonly explainGate: (result: unknown) => unknown;

  /** Sums every term present in a text and decides. */
  readonly scoreMessage: (text: unknown, keywords: unknown) => unknown;

  /** The threshold used when the caller states no usable one. */
  readonly DEFAULT_THRESHOLD: number;
}

/**
 * Whether every entry point is there and is what it claims.
 *
 * @param value - Whatever the loader answered.
 * @returns Whether it can be driven.
 */
function isStaticGateOrigin(value: unknown): value is StaticGateOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exported = value as Record<string, unknown>;
  const callable = FUNCTION_ENTRY_POINTS
    .every((name) => typeof exported[name] === 'function');

  return callable && typeof exported[CONSTANT_ENTRY_POINT] === 'number';
}

/**
 * The origin library, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a
 * module missing an export would otherwise be called as `undefined`
 * and every comparison below would diff one thrown TypeError
 * against another, which is agreement nobody established.
 *
 * @returns The origin module, with all three entry points usable.
 */
function originStaticGate(): StaticGateOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isStaticGateOrigin(loaded)) {
    throw new TypeError(
      'the origin module does not export '
      + `${FUNCTION_ENTRY_POINTS.join(' and ')} as functions beside `
      + `${CONSTANT_ENTRY_POINT} as a number.`,
    );
  }

  return loaded;
}

// ---------------------------------------------------------------------------
// Either ending, as a value
// ---------------------------------------------------------------------------

/** What a call did: answered, or refused with a sentence. */
type Outcome =
  | { readonly refused: false; readonly value: unknown }
  | { readonly refused: true; readonly message: string };

/**
 * One call ending, whichever it was.
 *
 * A throw that is not an `Error` is reported as its own shape
 * rather than coerced into a message, so a port raising a string
 * where the original raised an `Error` diverges instead of
 * agreeing.
 *
 * @param run - The call under test.
 * @returns What it did.
 */
function outcomeOf(run: () => unknown): Outcome {
  try {
    return { refused: false, value: run() };
  } catch (error) {
    return error instanceof Error
      ? { refused: true, message: error.message }
      : { refused: true, message: `non-Error: ${String(error)}` };
  }
}

/** One comparison that parted, labelled by its own input. */
interface LabelledDivergence {
  /** Which input the two sides parted over. */
  readonly over: string;

  /** Where they parted, as the differ reports it. */
  readonly at: string;

  /** What kind of difference it was. */
  readonly reason: string;

  /** The origin side, rendered. */
  readonly origin: string;

  /** The port side, rendered the same way. */
  readonly port: string;
}

/**
 * Compare one input's two endings, labelling any difference.
 *
 * @param over - What the two sides were driven over.
 * @param origin - The origin ending.
 * @param port - The port ending.
 * @returns One entry when they parted, none when they agreed.
 */
function compare(
  over: string,
  origin: Outcome,
  port: Outcome,
): LabelledDivergence[] {
  const found = firstDivergence(origin, port);

  if (found === null) {
    return [];
  }

  return [{
    over,
    at: found.path,
    reason: found.reason,
    origin: found.origin,
    port: found.port,
  }];
}

// ---------------------------------------------------------------------------
// The neutral term set, and the two shapes it is handed over in
// ---------------------------------------------------------------------------

/**
 * The term set both implementations are driven over.
 *
 * Authored here and neutral by construction: not one of these
 * patterns is a term any domain would look for. What they cover is
 * the SPREAD the scoring pass has to survive — both scoring
 * polarities and the third one, a literal full of punctuation, an
 * alternation, an optional group, a weight written negative, a
 * weight of zero on each side, a weight that arrived as text, a
 * weight that is not a number at all, a pattern that will not
 * compile, an entry with nothing to look for, and an entry that is
 * not a record. A term set where every entry looked alike would
 * agree for an implementation that read none of those members.
 */
const NEUTRAL_TERMS: readonly GateTerm[] = [
  { pattern: 'alpha', weight: 3, polarity: 'positive' },
  { pattern: 'bravo charlie', weight: 2, polarity: 'positive' },
  { pattern: 'c++', weight: 4, polarity: 'positive' },
  { pattern: 'a.b', weight: 1, polarity: 'positive' },
  { pattern: 'delta', weight: 0, polarity: 'positive' },
  { pattern: 'kilo', weight: -5, polarity: 'positive' },
  { pattern: 'lima', weight: '2.5', polarity: 'positive' } as unknown as GateTerm,
  { pattern: 'mike', weight: 'prose', polarity: 'positive' } as unknown as GateTerm,
  { pattern: 'a', weight: 7, polarity: 'positive' },
  { pattern: 'echo|foxtrot', weight: 4, polarity: 'negative' },
  { pattern: 'go(lf)?', weight: 3, polarity: 'negative' },
  { pattern: 'hotel', weight: 0, polarity: 'negative' },
  { pattern: 'india', weight: -2, polarity: 'negative' },
  { pattern: '(', weight: 9, polarity: 'negative' },
  { pattern: 'b', weight: 6, polarity: 'negative' },
  { pattern: 'juliett', weight: 8, polarity: 'ignore' },
  { pattern: '', weight: 5, polarity: 'positive' },
  { pattern: '', weight: 5, polarity: 'negative' },
  null as unknown as GateTerm,
  'not a term' as unknown as GateTerm,
];

/**
 * One term entry as a keyed value, or an empty one.
 *
 * Every reader below asks a term for a member by name, and an
 * entry that is not a record at all is one of the shapes this set
 * deliberately carries.
 *
 * @param entry - One entry of the term set.
 * @returns Its members, or none.
 */
function asTermRecord(entry: unknown): Record<string, unknown> {
  return typeof entry === 'object' && entry !== null
    ? entry as Record<string, unknown>
    : {};
}

/**
 * The lexicon object the original reads, built from the same set.
 *
 * The one place in this file that knows the original's shape. Two
 * lists and a threshold beside them, where the port reads one flat
 * list of rows: an entry goes into the list its polarity names, and
 * everything else — a non-record, an entry carrying `ignore`, an
 * entry carrying a polarity outside the column's domain — goes into
 * neither, which is exactly what the original's lists cannot
 * express.
 *
 * The `ignore` entry is therefore not an untranslatable case but a
 * translated one: the original sees no such term, the port skips it
 * in silence, and their agreement is the claim that a row
 * deliberately worth nothing changes nothing. A polarity OUTSIDE
 * the domain is untranslatable, because the port reports it and the
 * original has no list to have refused it from — that reading
 * belongs to `tests/lib/static-gate.test.ts` and is kept out of
 * this set.
 *
 * @param terms - The neutral term set.
 * @param threshold - Whatever the caller is stating this run.
 * @returns The lexicon object the original's scoring pass reads.
 */
function asKeywords(
  terms: readonly GateTerm[],
  threshold: unknown,
): Record<string, unknown> {
  const positive: unknown[] = [];
  const negative: unknown[] = [];

  for (const entry of terms) {
    const row = asTermRecord(entry);

    if (row['polarity'] === 'positive') {
      positive.push({ term: row['pattern'], weight: row['weight'] });
    }

    if (row['polarity'] === 'negative') {
      negative.push({ pattern: row['pattern'], weight: row['weight'] });
    }
  }

  return { threshold, positive, negative };
}

/** How many entries of one polarity a term set carries. */
function countPolarity(
  terms: readonly GateTerm[],
  polarity: string,
): number {
  return terms.filter(
    (entry) => asTermRecord(entry)['polarity'] === polarity,
  ).length;
}

// ---------------------------------------------------------------------------
// The hit keys, projected so one comparison reads both shapes
// ---------------------------------------------------------------------------

/** The three keys an origin hit record holds. */
const ORIGIN_HIT_KEYS: readonly string[] = ['kind', 'term', 'weight'];

/** The three the port's holds, following the input shape. */
const PORT_HIT_KEYS: readonly string[] = ['pattern', 'polarity', 'weight'];

/**
 * One scoring result, in the shape both sides are compared in.
 *
 * A hit becomes a triple rather than a record, which makes hit
 * ORDER part of the comparison — the differ is order-sensitive
 * about arrays, and order is observable through the explanation's
 * ceiling. The key names are consumed here and nowhere else.
 *
 * @param result - Whatever a scoring pass answered.
 * @param keys - The pattern key and the polarity key on this side.
 * @returns The same reading in one shape.
 */
function projectResult(
  result: unknown,
  keys: readonly [string, string],
): unknown {
  const record = result as Record<string, unknown>;
  const hits = Array.isArray(record['hits'])
    ? record['hits'] as unknown[]
    : [];

  return {
    score: record['score'],
    threshold: record['threshold'],
    decision: record['decision'],
    warnings: record['warnings'],
    hits: hits.map((hit) => {
      const entry = hit as Record<string, unknown>;

      return [entry[keys[0]], entry['weight'], entry[keys[1]]];
    }),
  };
}

/** The origin's reading, projected. */
function projectOrigin(result: unknown): unknown {
  return projectResult(result, ['term', 'kind']);
}

/** The port's, projected the same way. */
function projectPort(result: GateScore): unknown {
  return projectResult(result, ['pattern', 'polarity']);
}

// ---------------------------------------------------------------------------
// The inputs both sides are driven over
// ---------------------------------------------------------------------------

/** One labelled input, printed by id when a comparison parts. */
interface LabelledValue {
  /** Stable label a failure prints in place of the value. */
  readonly id: string;

  /**
   * A value nothing else holds a reference to.
   *
   * Built per call rather than shared, so the two sides never see
   * one mutable object between them.
   */
  readonly build: () => unknown;
}

/** A character from its code point, so this source stays plain. */
function codePoint(value: number): string {
  return String.fromCharCode(value);
}

/** Texts built to reach one term of the set apiece. */
const CRAFTED_TEXTS: readonly LabelledValue[] = [
  { id: 'text/empty', build: () => '' },
  { id: 'text/no-term', build: () => 'nothing here matches' },
  { id: 'text/one-positive', build: () => 'alpha stands alone' },
  { id: 'text/repeated', build: () => 'alpha alpha alpha alpha' },
  { id: 'text/inside-a-word', build: () => 'alphabet and xalpha' },
  { id: 'text/phrase', build: () => 'bravo charlie together' },
  { id: 'text/punctuation-literal', build: () => 'c++ and a.b' },
  { id: 'text/punctuation-near-miss', build: () => 'cxx and axb' },
  { id: 'text/zero-weight-positive', build: () => 'delta only' },
  { id: 'text/negative-written-weight', build: () => 'kilo only' },
  { id: 'text/text-weight', build: () => 'lima only' },
  { id: 'text/unparsable-weight', build: () => 'mike only' },
  { id: 'text/alternation-first', build: () => 'echo only' },
  { id: 'text/alternation-second', build: () => 'foxtrot only' },
  { id: 'text/alternation-both', build: () => 'echo and foxtrot' },
  { id: 'text/optional-group-present', build: () => 'golf only' },
  { id: 'text/optional-group-absent', build: () => 'go only' },
  { id: 'text/zero-weight-negative', build: () => 'hotel only' },
  { id: 'text/negative-written-negative', build: () => 'india only' },
  { id: 'text/ignored-term', build: () => 'juliett only' },
  { id: 'text/single-letters', build: () => 'a and b' },
  { id: 'text/every-term', build: () => 'alpha bravo charlie c++ a.b delta '
    + 'kilo lima mike echo foxtrot golf hotel india juliett a b' },
  { id: 'text/case-shifted', build: () => 'ALPHA and GOLF' },
  { id: 'text/across-lines', build: () => `alpha${codePoint(10)}golf` },
  { id: 'text/tab-separated', build: () => `alpha${codePoint(9)}india` },
];

/** The corpus documents, which no term was written for. */
const CORPUS_TEXTS: readonly LabelledValue[] = [
  ...STRUCTURED_TEXT_FIXTURES,
  ...MARKUP_FIXTURES,
].map((fixture) => ({ id: fixture.id, build: () => fixture.text }));

/** One text per invisible character, around a term that matches. */
const INVISIBLE_TEXTS: readonly LabelledValue[] = INVISIBLE_CODE_POINTS.map(
  (entry) => ({
    id: `invisible/${entry.id}`,
    build: () => `alpha${entry.char}golf`,
  }),
);

/** Everything the scoring pass is driven over, as one list. */
const TEXT_INPUTS: readonly LabelledValue[] = [
  ...CRAFTED_TEXTS,
  ...CORPUS_TEXTS,
  ...INVISIBLE_TEXTS,
  ...ADVERSARIAL_VALUES.map((entry) => ({
    id: `value/${entry.id}`,
    build: entry.build,
  })),
];

/** Every threshold the two sides are asked to agree about. */
const THRESHOLDS: readonly LabelledValue[] = [
  { id: 'threshold/absent', build: () => undefined },
  { id: 'threshold/zero', build: () => 0 },
  { id: 'threshold/default', build: () => DEFAULT_THRESHOLD },
  { id: 'threshold/negative', build: () => -3 },
  { id: 'threshold/fractional', build: () => 2.5 },
  { id: 'threshold/not-a-number', build: () => Number.NaN },
  { id: 'threshold/infinite', build: () => Number.POSITIVE_INFINITY },
  { id: 'threshold/text', build: () => '5' },
  { id: 'threshold/null', build: () => null },
];

/**
 * Term sets built around one adversarial value in the PATTERN.
 *
 * The one input that makes either implementation raise: a pattern
 * whose own text conversion throws has no sentence to be reported
 * in, so the pass ends rather than warning. Both sides read a
 * pattern with the same conversion, so this is where the leg's
 * refusal half lives.
 */
const HOSTILE_TERM_SETS: readonly LabelledValue[] = ADVERSARIAL_VALUES.map(
  (entry) => ({
    id: `pattern/${entry.id}`,
    build: () => [
      { pattern: entry.build(), weight: 2, polarity: 'positive' },
      { pattern: 'alpha', weight: 3, polarity: 'positive' },
    ],
  }),
);

/** The same set with the one entry that will not compile removed. */
const COMPILING_TERMS: readonly GateTerm[] = NEUTRAL_TERMS.filter(
  (entry) => asTermRecord(entry)['pattern'] !== '(',
);

/** One term set the sweeps are run over, and its label. */
interface LabelledTerms {
  /** Stable label a failure prints. */
  readonly id: string;

  /** The set itself. */
  readonly terms: readonly GateTerm[];
}

/**
 * Both term sets, because one of them warns on every run.
 *
 * The full set carries a pattern that will not compile, so every
 * result it produces has a warning in it and the no-warning reading
 * would never be reached. Removing that one entry is what makes the
 * warning list an observed variable rather than a constant.
 */
const TERM_SETS: readonly LabelledTerms[] = [
  { id: 'terms/full', terms: NEUTRAL_TERMS },
  { id: 'terms/all-compiling', terms: COMPILING_TERMS },
];

// ---------------------------------------------------------------------------
// The explanation's own inputs
// ---------------------------------------------------------------------------

/** One result to explain, in whichever shape a side reads. */
interface ExplainSpec {
  /** Stable label a failure prints. */
  readonly id: string;

  /** Every hit, as pattern, weight and polarity. */
  readonly hits: readonly (readonly [unknown, unknown, string])[];

  /** What the result claims it summed. */
  readonly score: unknown;

  /** What it claims it compared against. */
  readonly threshold: unknown;

  /** Every entry it could not use. */
  readonly warnings: readonly unknown[];
}

/** One hit, repeated to fill a list of a given length. */
function filledHits(
  count: number,
): readonly (readonly [unknown, unknown, string])[] {
  return [...Array(count).keys()].map(
    (index) => [`t${index}`, index - 2, 'positive'] as const,
  );
}

/**
 * Results crafted to reach every branch of the explanation.
 *
 * The ceiling and its tail, the empty list, the signed zero, a
 * weight that is not a number, and a score and a threshold that
 * are not numbers either — every one of them a value the original
 * renders through its own text conversion.
 */
const EXPLAIN_SPECS: readonly ExplainSpec[] = [
  { id: 'explain/empty', hits: [], score: 0, threshold: 5, warnings: [] },
  {
    id: 'explain/one-positive',
    hits: [['alpha', 3, 'positive']],
    score: 3,
    threshold: 5,
    warnings: [],
  },
  {
    id: 'explain/mixed',
    hits: [['alpha', 3, 'positive'], ['golf', -2, 'negative']],
    score: 1,
    threshold: 5,
    warnings: [],
  },
  {
    id: 'explain/signed-zero',
    hits: [['hotel', -0, 'negative']],
    score: 0,
    threshold: 5,
    warnings: [],
  },
  {
    id: 'explain/weight-not-a-number',
    hits: [['alpha', 'heavy', 'positive'], ['bravo', null, 'positive']],
    score: 0,
    threshold: 5,
    warnings: [],
  },
  {
    id: 'explain/at-the-ceiling',
    hits: filledHits(6),
    score: 3,
    threshold: 5,
    warnings: [],
  },
  {
    id: 'explain/past-the-ceiling',
    hits: filledHits(9),
    score: 9,
    threshold: 5,
    warnings: [],
  },
  {
    id: 'explain/one-warning',
    hits: [['alpha', 3, 'positive']],
    score: 3,
    threshold: 5,
    warnings: ['one entry'],
  },
  {
    id: 'explain/two-warnings',
    hits: [],
    score: 0,
    threshold: 5,
    warnings: ['one entry', 'another'],
  },
  {
    id: 'explain/score-not-a-number',
    hits: [],
    score: Number.NaN,
    threshold: null,
    warnings: [],
  },
  {
    id: 'explain/absent-numbers',
    hits: [],
    score: undefined,
    threshold: undefined,
    warnings: [],
  },
];

/** One spec, in the shape the original's explanation reads. */
function asOriginResult(spec: ExplainSpec): unknown {
  return {
    score: spec.score,
    threshold: spec.threshold,
    warnings: spec.warnings,
    hits: spec.hits.map(([term, weight, kind]) => ({ term, weight, kind })),
  };
}

/** The same spec, in this port's shape. */
function asPortResult(spec: ExplainSpec): unknown {
  return {
    score: spec.score,
    threshold: spec.threshold,
    warnings: spec.warnings,
    hits: spec.hits.map(
      ([pattern, weight, polarity]) => ({ pattern, weight, polarity }),
    ),
  };
}

/**
 * Values that are not results at all, read by both sides alike.
 *
 * The last two are where the leg's refusal half lives for this
 * function: a hit list holding an entry with no members raises on
 * both sides, because the explanation is defensive about the
 * RESULT and not about the entries inside it. The entry that is a
 * number is the control saying the raise is about the absent
 * members rather than about any non-record entry.
 */
const EXPLAIN_JUNK: readonly LabelledValue[] = [
  { id: 'junk/null', build: () => null },
  { id: 'junk/undefined', build: () => undefined },
  { id: 'junk/number', build: () => 5 },
  { id: 'junk/text', build: () => 'a result' },
  { id: 'junk/list', build: () => [] },
  { id: 'junk/empty-record', build: () => ({}) },
  { id: 'junk/hits-not-a-list', build: () => ({ hits: 'no' }) },
  { id: 'junk/hit-is-a-number', build: () => ({ hits: [5] }) },
  { id: 'junk/hit-is-null', build: () => ({ hits: [null] }) },
  { id: 'junk/hit-is-absent', build: () => ({ hits: [undefined] }) },
];

// ---------------------------------------------------------------------------
// The controls every comparison below rests on
// ---------------------------------------------------------------------------

describePortParity('static-gate — the origin the comparisons read', () => {
  it('exports both entry points and the constant', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isStaticGateOrigin(loaded)).toBe(true);
  });

  // Two implementations that refuse everything agree perfectly, and
  // two that answer everything leave every refusal path unmeasured.
  // So the driven inputs have to produce both endings — read off
  // the PORT, since the original is the thing under measurement.
  it('is driven over inputs producing both endings, on both sweeps', () => {
    const scoring = [
      ...TEXT_INPUTS.map(
        (input) => outcomeOf(() => scoreText(input.build(), NEUTRAL_TERMS)),
      ),
      ...HOSTILE_TERM_SETS.map((input) => outcomeOf(
        () => scoreText('alpha', input.build() as readonly GateTerm[]),
      )),
    ].map((ending) => ending.refused);
    const explaining = EXPLAIN_JUNK
      .map((input) => outcomeOf(() => explainGate(input.build())))
      .map((ending) => ending.refused);

    expect([scoring, explaining].map((run) => run.includes(true)))
      .toEqual([true, true]);
    expect([scoring, explaining].map((run) => run.includes(false)))
      .toEqual([true, true]);
  });

  // The control every scoring comparison rests on. A corpus no term
  // matches is scored 0 by any implementation, right or wrong, so
  // the driven texts have to reach both endings of the report.
  it('drives the scoring pass over both endings of its own report', () => {
    const scored = TERM_SETS.flatMap((set) => TEXT_INPUTS.map(
      (input) => scoreText(input.build(), set.terms),
    ));
    const readings = [
      scored.map((result) => result.hits.length > 0),
      scored.map((result) => result.warnings.length > 0),
      scored.map((result) => result.decision === 'parse'),
      scored.map((result) => result.hits.some(
        (hit) => hit.polarity === 'negative',
      )),
    ];

    expect(readings.map((reading) => reading.includes(true)))
      .toEqual(readings.map(() => true));
    expect(readings.map((reading) => reading.includes(false)))
      .toEqual(readings.map(() => true));
  });

  // The translation is the one place in this file that knows the
  // original's shape, so it is held down by a count rather than by
  // reading. Every entry the port would score has to reach a list;
  // the entries that reach neither are the ones the original's two
  // lists cannot express, and the set carries one of each.
  it('places every scorable entry of the term set in a list', () => {
    const keywords = asKeywords(NEUTRAL_TERMS, DEFAULT_THRESHOLD);
    const lists = ['positive', 'negative'].map(
      (name) => (keywords[name] as unknown[]).length,
    );

    expect(lists).toEqual([
      countPolarity(NEUTRAL_TERMS, 'positive'),
      countPolarity(NEUTRAL_TERMS, 'negative'),
    ]);
    expect(countPolarity(NEUTRAL_TERMS, 'ignore')).toBeGreaterThan(0);
  });

  // And the other half of the same guard: no entry of this set
  // carries a polarity the column would refuse. Such an entry has
  // no list to be translated into and the port reports it, so it
  // would part on the warnings every run — which is a port-only
  // reading and belongs to the unit file, not here.
  it('carries no entry the translation cannot represent', () => {
    const known: readonly string[] = [...GATE_POLARITIES];
    const untranslatable = NEUTRAL_TERMS
      .filter((entry) => typeof entry === 'object' && entry !== null)
      .map((entry) => asTermRecord(entry)['polarity'])
      .filter((polarity) => !known.includes(String(polarity)));

    expect(untranslatable).toEqual([]);
  });

  // The projection reads each side by its own key names, which is a
  // place a difference could hide. Both hit shapes are held to
  // EXACTLY the three keys it consumes, so a key added on either
  // side fails here rather than being dropped in silence.
  it('projects hit records that hold exactly three keys apiece', () => {
    const origin = originStaticGate();
    const text = 'alpha golf india';
    const scored = origin.scoreMessage(
      text,
      asKeywords(NEUTRAL_TERMS, DEFAULT_THRESHOLD),
    ) as { readonly hits: readonly unknown[] };
    const ported = scoreText(text, NEUTRAL_TERMS).hits;

    expect(scored.hits.length).toBeGreaterThan(0);
    expect(ported.length).toBe(scored.hits.length);
    expect(scored.hits.map((hit) => Object.keys(hit as object).sort()))
      .toEqual(scored.hits.map(() => ORIGIN_HIT_KEYS));
    expect(ported.map((hit) => Object.keys(hit).sort()))
      .toEqual(ported.map(() => PORT_HIT_KEYS));
  });
});

// ---------------------------------------------------------------------------
// The comparisons
// ---------------------------------------------------------------------------

describePortParity('DEFAULT_THRESHOLD — the one the gate falls back to', () => {
  // An export like any other, and the one whose drift would be
  // least visible: a port shipping a different default would agree
  // on every comparison that states a threshold and decide every
  // deployment that states none differently.
  it('agrees with the original', () => {
    const origin = originStaticGate();

    expect(firstDivergence(origin.DEFAULT_THRESHOLD, DEFAULT_THRESHOLD))
      .toBeNull();
  });
});

describePortParity('the scoring pass — the sum, the hits and the warnings', () => {
  // The whole leg, over both term sets. Every pass the port exports
  // and the original does not — the escape, the anchored compile,
  // the weight coercion and the list coercion — is inside this
  // comparison compositionally, because the scoring pass runs all
  // of them in order.
  it('agrees over every text, both term sets', () => {
    const origin = originStaticGate();
    const apart = TERM_SETS.flatMap((set) => TEXT_INPUTS.flatMap(
      (input) => compare(
        `${set.id} ${input.id}`,
        outcomeOf(() => projectOrigin(origin.scoreMessage(
          input.build(),
          asKeywords(set.terms, undefined),
        ))),
        outcomeOf(() => projectPort(scoreText(input.build(), set.terms))),
      ),
    ));

    expect(apart).toEqual([]);
  });

  // The threshold, which moved out of the lexicon object and into
  // an options argument. Every shape one arrives in, over one text
  // that scores: a port reading the fallback differently would
  // agree on the score and part on the decision.
  it('agrees over every threshold a caller can state', () => {
    const origin = originStaticGate();
    const text = 'alpha bravo charlie golf';
    const apart = THRESHOLDS.flatMap((entry) => compare(
      entry.id,
      outcomeOf(() => projectOrigin(origin.scoreMessage(
        text,
        asKeywords(NEUTRAL_TERMS, entry.build()),
      ))),
      outcomeOf(() => projectPort(scoreText(text, NEUTRAL_TERMS, {
        threshold: entry.build(),
      } as { threshold?: number }))),
    ));

    expect(apart).toEqual([]);
  });

  // The refusal half. A pattern whose own text conversion throws is
  // the one value in a term set neither implementation can report,
  // so both end the pass — and a leg reading only returned values
  // would pass for a port that raised a different sentence or
  // raised where the original answered.
  it('agrees over a term set whose pattern refuses to be read', () => {
    const origin = originStaticGate();
    const apart = HOSTILE_TERM_SETS.flatMap((input) => {
      const terms = input.build() as readonly GateTerm[];

      return compare(
        input.id,
        outcomeOf(() => projectOrigin(origin.scoreMessage(
          'alpha',
          asKeywords(terms, DEFAULT_THRESHOLD),
        ))),
        outcomeOf(() => projectPort(scoreText('alpha', terms))),
      );
    });

    expect(apart).toEqual([]);
  });

  // Hit ORDER, which the projection makes part of every comparison
  // above and which this reads on its own because it is the reason
  // the port walks one list twice. The rows are interleaved here,
  // so a pass in row order parts on the first text that matches
  // one of each.
  it('agrees about hit order over an interleaved term set', () => {
    const origin = originStaticGate();
    const interleaved: readonly GateTerm[] = [
      { pattern: 'india', weight: 2, polarity: 'negative' },
      { pattern: 'alpha', weight: 3, polarity: 'positive' },
      { pattern: 'golf', weight: 1, polarity: 'negative' },
      { pattern: 'delta', weight: 4, polarity: 'positive' },
    ];
    const text = 'alpha golf india delta';
    const apart = compare(
      'interleaved',
      outcomeOf(() => projectOrigin(origin.scoreMessage(
        text,
        asKeywords(interleaved, DEFAULT_THRESHOLD),
      ))),
      outcomeOf(() => projectPort(scoreText(text, interleaved))),
    );

    expect(apart).toEqual([]);
    expect(scoreText(text, interleaved).hits.map((hit) => hit.polarity))
      .toEqual(['positive', 'positive', 'negative', 'negative']);
  });
});

describePortParity('explainGate — the account stored beside a decision', () => {
  // Over the results the scoring pass actually produced, which is
  // the composition that matters: each side explains its OWN
  // result, so a difference anywhere in the pass shows up in the
  // sentence a row would carry.
  it('agrees over every result the scoring pass produced', () => {
    const origin = originStaticGate();
    const apart = TERM_SETS.flatMap((set) => TEXT_INPUTS.flatMap(
      (input) => compare(
        `${set.id} ${input.id}`,
        outcomeOf(() => origin.explainGate(origin.scoreMessage(
          input.build(),
          asKeywords(set.terms, undefined),
        ))),
        outcomeOf(() => explainGate(scoreText(input.build(), set.terms))),
      ),
    ));

    expect(apart).toEqual([]);
  });

  // And over results crafted to reach the branches a scoring pass
  // does not produce on its own: the ceiling and its counted tail,
  // a weight that is not a number, and a score and a threshold that
  // are not numbers either.
  it('agrees over every crafted result', () => {
    const origin = originStaticGate();
    const apart = EXPLAIN_SPECS.flatMap((spec) => compare(
      spec.id,
      outcomeOf(() => origin.explainGate(asOriginResult(spec))),
      outcomeOf(() => explainGate(asPortResult(spec))),
    ));

    expect(apart).toEqual([]);
  });

  // The asymmetry this port preserves rather than repairs: the
  // explanation guards the RESULT and not the entries inside its
  // hit list. Repairing it would be a divergence in the one
  // function the leg compares directly, which is why the raise is
  // compared as an answer rather than tidied into one.
  it('agrees over every value that is not a result', () => {
    const origin = originStaticGate();
    const apart = EXPLAIN_JUNK.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.explainGate(input.build())),
      outcomeOf(() => explainGate(input.build())),
    ));

    expect(apart).toEqual([]);
  });
});
