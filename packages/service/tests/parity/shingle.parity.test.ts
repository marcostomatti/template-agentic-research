/**
 * Full parity for `src/lib/shingle.ts`: all nine exports, driven
 * against their originals over the shared corpus, over bodies built
 * to order, and over the adversarial roster.
 *
 * The port claims behaviour preservation, and this file is what makes
 * that a measurement rather than an assertion: every comparison hands
 * both implementations the same input and diffs what came back, so a
 * divergence is reported by path and by kind rather than as a failed
 * expectation somebody has to reconstruct.
 *
 * A throw is an ANSWER here, not an absence of one. This library has
 * exactly one seam that can refuse — a sketch entry whose string
 * conversion throws — and a parity run that compared only returned
 * values would leave that seam unmeasured, passing for a port that
 * threw a different sentence or answered where the original threw.
 * Both sides therefore run through {@link outcomeOf}, which turns
 * either ending into a value, and the two values are diffed
 * structurally.
 *
 * The long bodies are BUILT rather than written down, exactly as the
 * unit suite builds them: a near-copy and an unrelated document are
 * one generator argument apart, so what a pair shares is a property
 * of the arguments rather than of prose somebody eyeballed. The
 * sketch pool assembled from them is this file's own control surface:
 * a guard case asserts it still holds an empty sketch, a partial one,
 * a full one and a non-list, because a pool that had drifted into one
 * shape would agree perfectly over judgements it never exercised.
 *
 * The three constants are compared too. They are exports like any
 * other, and the threshold in particular is a number the origin's
 * callers write into SQL — a port that shipped a different default
 * would agree on every function comparison below and still converge
 * different pairs in production.
 *
 * Every origin load sits INSIDE a case. The gate binds a `describe`
 * and nothing above one, so module scope runs on a skipped run too —
 * the PORT's own functions are safe to call up there, and are, but a
 * load would throw on every run that armed nothing.
 */
import { expect, it } from 'vitest';

import {
  SHINGLE_SKETCH_SIZE,
  SHINGLE_THRESHOLD,
  SHINGLE_WORDS,
  bodySketch,
  shingleHash,
  shingleNormalize,
  sketchComparable,
  sketchSimilarity,
  sketchesConverge,
} from '../../src/lib/shingle.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import {
  ADVERSARIAL_VALUES,
  DELIMITED_RECORD_FIXTURES,
  INVISIBLE_TEXT_FIXTURE,
  MARKUP_FIXTURES,
  MULTIPART_MESSAGE_FIXTURES,
  STRUCTURED_TEXT_FIXTURES,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/shingle.js';

/** The six functions this file drives, in sorted order. */
const FUNCTION_ENTRY_POINTS: readonly string[] = [
  'bodySketch',
  'shingleHash',
  'shingleNormalize',
  'sketchComparable',
  'sketchSimilarity',
  'sketchesConverge',
];

/** The three numbers this file compares, in sorted order. */
const CONSTANT_ENTRY_POINTS: readonly string[] = [
  'SHINGLE_SKETCH_SIZE',
  'SHINGLE_THRESHOLD',
  'SHINGLE_WORDS',
];

/** What the origin module has to be for this file to drive it. */
interface ShingleOrigin {
  /** Sketches a body, or answers an empty sketch. */
  readonly bodySketch: (text: unknown) => unknown;

  /** Hashes one shingle. */
  readonly shingleHash: (str: string) => unknown;

  /** Folds a body to lowercase single-spaced words. */
  readonly shingleNormalize: (text: unknown) => unknown;

  /** Whether two sketches are big enough to judge from. */
  readonly sketchComparable: (a: unknown, b: unknown) => unknown;

  /** How much two sketches overlap. */
  readonly sketchSimilarity: (a: unknown, b: unknown) => unknown;

  /** Whether two sketches mean one document arrived twice. */
  readonly sketchesConverge: (
    a: unknown,
    b: unknown,
    threshold?: unknown,
  ) => unknown;

  /** Words per shingle. */
  readonly SHINGLE_WORDS: number;

  /** Hashes kept per sketch. */
  readonly SHINGLE_SKETCH_SIZE: number;

  /** The default convergence threshold. */
  readonly SHINGLE_THRESHOLD: number;
}

/** Whether every entry point is there and is what it claims. */
function isShingleOrigin(value: unknown): value is ShingleOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exports = value as Record<string, unknown>;
  const callable = FUNCTION_ENTRY_POINTS
    .every((name) => typeof exports[name] === 'function');
  const numeric = CONSTANT_ENTRY_POINTS
    .every((name) => typeof exports[name] === 'number');

  return callable && numeric;
}

/**
 * The origin library, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a
 * module missing an export would otherwise be called as `undefined`
 * and every comparison below would diff one thrown TypeError against
 * another, which is agreement nobody established.
 *
 * @returns The origin module, with all nine entry points usable.
 */
function originShingle(): ShingleOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isShingleOrigin(loaded)) {
    throw new TypeError(
      'the origin module does not export '
      + `${FUNCTION_ENTRY_POINTS.join(', ')} as functions and `
      + `${CONSTANT_ENTRY_POINTS.join(', ')} as numbers.`,
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
 * One call's ending, whichever it was.
 *
 * A throw that is not an `Error` is reported as its own shape rather
 * than coerced into a message, so a port raising a string where the
 * original raised an `Error` diverges instead of agreeing.
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

/** One comparison that parted, labelled by the input that produced it. */
interface LabelledDivergence {
  /** Which input the two sides parted over. */
  readonly over: string;

  /** Where they parted, as the differ reports it. */
  readonly at: string;

  /** What kind of difference it was. */
  readonly reason: string;

  /** The origin side, rendered. */
  readonly origin: string;

  /** The port side, rendered. */
  readonly port: string;
}

/**
 * Compare one input's two endings, labelling any difference.
 *
 * @param over - What the two sides were driven over.
 * @param origin - The origin's ending.
 * @param port - The port's ending.
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
// The inputs: the corpus, bodies built to order, and hostile shapes
// ---------------------------------------------------------------------------

/** One labelled input, printed by id when a comparison parts. */
interface LabelledText {
  /** Stable id a failure prints in place of the document. */
  readonly id: string;

  /** The document itself. */
  readonly text: string;
}

/**
 * Every corpus document across all four rosters, plus both halves of
 * the padded fixture — the same entries the unit suite reads, so the
 * two files cannot drift onto different corpora.
 */
const CORPUS_TEXTS: readonly LabelledText[] = [
  ...STRUCTURED_TEXT_FIXTURES,
  ...DELIMITED_RECORD_FIXTURES,
  ...MULTIPART_MESSAGE_FIXTURES,
  ...MARKUP_FIXTURES,
].map((fixture) => ({ id: fixture.id, text: fixture.text }))
  .concat([
    { id: 'invisible (padded)', text: INVISIBLE_TEXT_FIXTURE.text },
    { id: 'invisible (visible)', text: INVISIBLE_TEXT_FIXTURE.visible },
  ]);

/**
 * A body of `count` distinct-ish words, walked by `step` from `seed`
 * — the unit suite's generator, redeclared rather than imported
 * because a test file exporting helpers would put a suite on another
 * suite's import graph.
 *
 * @param count - How many words.
 * @param step - How far apart consecutive words sit in the pool.
 * @param seed - Where in the pool to start.
 * @returns The body, single-spaced.
 */
function longBody(count: number, step = 1, seed = 0): string {
  return Array.from(
    { length: count },
    (_, index) => `w${(seed + (index * step)) % 997}`,
  ).join(' ');
}

/**
 * A one-character string above the basic plane, built from its code
 * point so the source stays plain. `charCodeAt` walks it as two
 * surrogate halves, and both sides must hash the same halves.
 */
const ASTRAL_CHARACTER = String.fromCodePoint(0x1f642);

/**
 * Three letters outside ASCII, built from code points. Normalization
 * keeps every Unicode letter on purpose, and this is the shape that
 * catches a port folding to `[a-z]`.
 */
const ACCENTED_WORD = String.fromCharCode(0xe5, 0xe4, 0xf6);

/**
 * Bodies the corpus has no reason to hold: the sizes around the
 * shingle width, the sizes around a full sketch, a wrapped near-copy,
 * an unrelated document, and the characters normalization has to keep
 * or split.
 */
const BODY_INPUTS: readonly LabelledText[] = [
  { id: 'empty body', text: '' },
  { id: 'blank body', text: '   ' },
  { id: 'one word short of a shingle', text: longBody(SHINGLE_WORDS - 1) },
  { id: 'exactly one shingle', text: longBody(SHINGLE_WORDS) },
  { id: 'partial-sketch body', text: longBody(40) },
  { id: 'full-sketch body', text: longBody(300) },
  { id: 'wrapped near-copy', text: `edge start ${longBody(300)} edge end` },
  { id: 'unrelated body', text: longBody(300, 7, 500) },
  { id: 'astral body', text: `${ASTRAL_CHARACTER} ${longBody(SHINGLE_WORDS)}` },
  { id: 'accented body', text: `${ACCENTED_WORD} ${longBody(SHINGLE_WORDS)}` },
];

/** One labelled sketch-shaped value, hostile shapes included. */
interface LabelledSketch {
  /** Stable id a failure prints in place of the value. */
  readonly id: string;

  /** The value both judgements receive. */
  readonly value: unknown;
}

/** A full sketch, reused by the pool entries below. */
const FULL_SKETCH = bodySketch(longBody(300));

/** A partial sketch, from a body too short to fill one. */
const PARTIAL_SKETCH = bodySketch(longBody(40));

/**
 * Every sketch shape the judgements can meet: non-lists, the empty
 * sketch, partial and full ones, near-copies, holes a storage driver
 * left, entries that arrived as numbers, and a duplicate-heavy sketch
 * no builder produces but a caller could.
 */
const SKETCH_POOL: readonly LabelledSketch[] = [
  { id: 'not a list (null)', value: null },
  { id: 'not a list (undefined)', value: undefined },
  { id: 'not a list (number)', value: 0 },
  { id: 'not a list (text)', value: 'a' },
  { id: 'not a list (object)', value: {} },
  { id: 'empty sketch', value: [] },
  { id: 'stub sketch', value: FULL_SKETCH.slice(0, 4) },
  { id: 'partial sketch', value: PARTIAL_SKETCH },
  { id: 'full sketch', value: FULL_SKETCH },
  { id: 'wrapped full sketch', value: bodySketch(`x ${longBody(300)} y`) },
  { id: 'unrelated full sketch', value: bodySketch(longBody(300, 7, 500)) },
  { id: 'sketch with holes', value: [null, undefined, ...FULL_SKETCH] },
  { id: 'numeric entries', value: [1, 2, 3] },
  { id: 'duplicate entries', value: [...FULL_SKETCH, ...FULL_SKETCH] },
];

/**
 * Every threshold form worth driving: the finite numbers a caller
 * means, and each shape of the fallback — absent, non-finite, and the
 * numeric text a configuration read hands over.
 */
const THRESHOLD_FORMS: readonly LabelledSketch[] = [
  { id: 'absent', value: undefined },
  { id: 'zero', value: 0 },
  { id: 'half', value: 0.5 },
  { id: 'the default, explicitly', value: SHINGLE_THRESHOLD },
  { id: 'one', value: 1 },
  { id: 'above one', value: 1.5 },
  { id: 'negative', value: -1 },
  { id: 'not a number', value: Number.NaN },
  { id: 'infinite', value: Number.POSITIVE_INFINITY },
  { id: 'numeric text', value: '0.8' },
];

/** A sketch, as the port's signatures spell the type. */
type SketchArg = readonly string[];

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('shingle — the origin the comparisons read', () => {
  it('exports the nine entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isShingleOrigin(loaded)).toBe(true);
  });

  // The pool is what every judgement below is driven over, so a pool
  // that had drifted into one shape would leave the other judgements
  // unmeasured while every pair still agreed. Shapes are read off the
  // values themselves rather than off the ids, since an id is a claim
  // and a length is a measurement.
  it('is driven over a pool still holding every sketch shape', () => {
    const shapes = SKETCH_POOL.map((entry) => {
      if (!Array.isArray(entry.value)) {
        return 'not a list';
      }

      if (entry.value.length === 0) {
        return 'empty';
      }

      return entry.value.length >= SHINGLE_SKETCH_SIZE
        ? 'full'
        : 'partial';
    });

    expect(shapes).toContain('not a list');
    expect(shapes).toContain('empty');
    expect(shapes).toContain('partial');
    expect(shapes).toContain('full');
  });

  // Read through the PORT, since the origin is the thing under
  // measurement: the corpus and the built bodies together must reach
  // the empty sketch, a partial one and a full one, or the sketch
  // comparisons above ran over shapes the document path never made.
  it('is driven over documents producing every sketch size class', () => {
    const sizes = [...CORPUS_TEXTS, ...BODY_INPUTS]
      .map((entry) => bodySketch(entry.text).length);

    expect(sizes).toContain(0);
    expect(sizes.some((size) => size > 0 && size < SHINGLE_SKETCH_SIZE))
      .toBe(true);
    expect(sizes).toContain(SHINGLE_SKETCH_SIZE);
  });

  it('is driven over a roster still holding the value that refuses text', () => {
    expect(ADVERSARIAL_VALUES.map((entry) => entry.id))
      .toContain('hostile-string-conversion');
  });
});

describePortParity('the three constants', () => {
  // Compared as one labelled record, so a drifted constant is named
  // rather than positioned.
  it('agrees over all three', () => {
    const origin = originShingle();
    const apart = firstDivergence(
      {
        size: origin.SHINGLE_SKETCH_SIZE,
        threshold: origin.SHINGLE_THRESHOLD,
        words: origin.SHINGLE_WORDS,
      },
      {
        size: SHINGLE_SKETCH_SIZE,
        threshold: SHINGLE_THRESHOLD,
        words: SHINGLE_WORDS,
      },
    );

    expect(apart).toBeNull();
  });
});

describePortParity('shingleNormalize — corpus, bodies and the roster', () => {
  it('agrees over every document', () => {
    const origin = originShingle();
    const apart = [...CORPUS_TEXTS, ...BODY_INPUTS].flatMap((entry) => compare(
      entry.id,
      outcomeOf(() => origin.shingleNormalize(entry.text)),
      outcomeOf(() => shingleNormalize(entry.text)),
    ));

    expect(apart).toEqual([]);
  });

  // Each side gets its own freshly built value: a hostile value that
  // counted its coercions would otherwise meet the second caller in a
  // different state than the first.
  it('agrees over every adversarial value', () => {
    const origin = originShingle();
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => compare(
      entry.id,
      outcomeOf(() => origin.shingleNormalize(entry.build())),
      outcomeOf(() => shingleNormalize(entry.build() as string)),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('shingleHash — every document and edge string', () => {
  // The hash answers a bigint and the differ compares those with
  // Object.is, so the raw values are diffed rather than renderings of
  // them. The astral and accented strings are the load-bearing edge:
  // the hash walks char codes, and both sides must walk the same ones.
  it('agrees over every input', () => {
    const origin = originShingle();
    const inputs: readonly LabelledText[] = [
      ...CORPUS_TEXTS,
      ...BODY_INPUTS,
      { id: 'empty string', text: '' },
      { id: 'single space', text: ' ' },
      { id: 'single letter', text: 'a' },
      { id: 'one shingle, joined', text: longBody(SHINGLE_WORDS) },
      { id: 'astral character alone', text: ASTRAL_CHARACTER },
      { id: 'accented word alone', text: ACCENTED_WORD },
    ];
    const apart = inputs.flatMap((entry) => compare(
      entry.id,
      outcomeOf(() => origin.shingleHash(entry.text)),
      outcomeOf(() => shingleHash(entry.text)),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('bodySketch — corpus, bodies and the roster', () => {
  it('agrees over every document', () => {
    const origin = originShingle();
    const apart = [...CORPUS_TEXTS, ...BODY_INPUTS].flatMap((entry) => compare(
      entry.id,
      outcomeOf(() => origin.bodySketch(entry.text)),
      outcomeOf(() => bodySketch(entry.text)),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every adversarial value', () => {
    const origin = originShingle();
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => compare(
      entry.id,
      outcomeOf(() => origin.bodySketch(entry.build())),
      outcomeOf(() => bodySketch(entry.build() as string)),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('the sketch judgements — every pool pair', () => {
  // The full cross product, through all three judgements, in one case:
  // a divergence here is a difference in how a PAIR is read, and the
  // set of pairs that moved together is the reading a failure needs.
  it('agrees over every pair through all three judgements', () => {
    const origin = originShingle();
    const apart = SKETCH_POOL.flatMap((a) => SKETCH_POOL.flatMap((b) => {
      const over = `${a.id} vs ${b.id}`;

      return [
        ...compare(
          `${over} (similarity)`,
          outcomeOf(() => origin.sketchSimilarity(a.value, b.value)),
          outcomeOf(() => sketchSimilarity(
            a.value as SketchArg,
            b.value as SketchArg,
          )),
        ),
        ...compare(
          `${over} (comparable)`,
          outcomeOf(() => origin.sketchComparable(a.value, b.value)),
          outcomeOf(() => sketchComparable(
            a.value as SketchArg,
            b.value as SketchArg,
          )),
        ),
        ...compare(
          `${over} (converge, default threshold)`,
          outcomeOf(() => origin.sketchesConverge(a.value, b.value)),
          outcomeOf(() => sketchesConverge(
            a.value as SketchArg,
            b.value as SketchArg,
          )),
        ),
      ];
    }));

    expect(apart).toEqual([]);
  });

  // Driven over a pair the gate admits, so the threshold is the only
  // thing deciding — a pair the gate refuses answers false whatever
  // the threshold says, and would compare thresholds nobody read.
  it('agrees over every threshold form', () => {
    const origin = originShingle();
    const full = FULL_SKETCH;
    const wrapped = bodySketch(`x ${longBody(300)} y`);
    const apart = THRESHOLD_FORMS.flatMap((form) => compare(
      form.id,
      outcomeOf(() => origin.sketchesConverge(full, wrapped, form.value)),
      outcomeOf(() => sketchesConverge(
        full,
        wrapped,
        form.value as number,
      )),
    ));

    expect(apart).toEqual([]);
  });

  // The one seam that can refuse, measured on both sides of each
  // argument position. Fresh hostile values per side, as above.
  it('agrees over sketches that refuse to become text', () => {
    const origin = originShingle();
    const hostileFor = (): unknown[] => {
      const hostile = ADVERSARIAL_VALUES
        .find((entry) => entry.id === 'hostile-string-conversion');

      if (hostile === undefined) {
        throw new TypeError('the adversarial roster lost its hostile entry.');
      }

      return [hostile.build(), ...FULL_SKETCH];
    };
    const judgements = [
      {
        name: 'similarity',
        originSide: origin.sketchSimilarity,
        portSide: sketchSimilarity,
      },
      {
        name: 'comparable',
        originSide: origin.sketchComparable,
        portSide: sketchComparable,
      },
      {
        name: 'converge',
        originSide: origin.sketchesConverge,
        portSide: sketchesConverge,
      },
    ];
    const apart = judgements.flatMap((judgement) => [
      ...compare(
        `hostile left (${judgement.name})`,
        outcomeOf(() => judgement.originSide(hostileFor(), FULL_SKETCH)),
        outcomeOf(() => judgement.portSide(
          hostileFor() as SketchArg,
          FULL_SKETCH,
        )),
      ),
      ...compare(
        `hostile right (${judgement.name})`,
        outcomeOf(() => judgement.originSide(FULL_SKETCH, hostileFor())),
        outcomeOf(() => judgement.portSide(
          FULL_SKETCH,
          hostileFor() as SketchArg,
        )),
      ),
    ]);

    expect(apart).toEqual([]);
  });
});
