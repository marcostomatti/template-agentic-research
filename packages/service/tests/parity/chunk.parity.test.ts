/**
 * Kernel parity for `src/lib/chunk.ts`: the estimate, the two strips
 * the original exports, the quoted-chain cut and the whole excerpt
 * build, driven against their originals over one corpus and diffed
 * by path.
 *
 * KERNEL rather than full, and the boundary is the port own
 * divergence rather than a choice about coverage. The header field
 * roster is an argument here and a module constant in the original,
 * so there is no input that could drive both sides of `buildChunk` —
 * a call handing over a roster would have nothing to hand it to on
 * one side. That entry point is characterized in
 * `tests/lib/chunk.test.ts` instead, and this file covers everything
 * underneath it.
 *
 * ## What the leg reaches, and how
 *
 * The origin export surface is five functions and two ceilings, and
 * that surface is the leg. The port exports more — the markup strip,
 * the signature cut, the prose window, the whitespace collapse and
 * the boundary truncation are all reachable on their own here,
 * because a spliced library cannot be split into modules and
 * exporting a pass is the only way a caller composing one in a node
 * can have it.
 *
 * Those five are inside this leg COMPOSITIONALLY rather than
 * directly: `buildExcerpt` runs all of them in order, so a corpus
 * that reaches each pass compares each pass. What that cannot see is
 * a pair of errors that cancel between two passes, which is why the
 * crafted inputs below are built one per pass and why the unit file
 * drives each export on its own as well. Read the two files
 * together; neither is the whole reading.
 *
 * ## A throw is an answer
 *
 * Every comparison runs both sides through {@link outcomeOf}, which
 * turns either ending into a value. Nothing in this module DECIDES
 * to throw — every refusal it reaches is returned — but the text
 * conversion under every entry point raises for a value whose own
 * conversion does, and a run comparing only returned values would
 * pass for a port that threw a different sentence, threw where the
 * original answered, or answered where it threw.
 *
 * That arrangement needs the control that comes with it: two
 * implementations refusing everything agree perfectly. So a case
 * asserts the driven inputs produce BOTH endings, read off the PORT
 * rather than off the original, since the original is the thing
 * under measurement.
 *
 * ## The controls the sweeps rest on
 *
 * A stripping pass has a second way to agree about nothing: a corpus
 * carrying none of what it strips is returned unchanged by any
 * implementation, correct or not. So each strip carries a case
 * asserting the driven texts include some it CHANGES and some it
 * leaves alone, and the excerpt build carries the same reading
 * spread over its report — both endings of the truncation flag, both
 * a zero and a non-zero on each of the two line counters, and both
 * an empty excerpt and a full one.
 *
 * ## Where the origin is loaded
 *
 * Inside cases, always. The gate binds a `describe` and nothing
 * above one, so module scope runs on a skipped run too: the PORT own
 * functions are safe to call up there, and are, but a load would
 * throw on every run that armed nothing — including in CI, where
 * this file is meant to skip.
 */
import { expect, it } from 'vitest';

import {
  MAX_CHUNK_CHARS,
  MAX_EXCERPT_CHARS,
  buildExcerpt,
  cutQuotedChain,
  estimateTokens,
  stripInvisibleRuns,
  stripUrlTracking,
} from '../../src/lib/chunk.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import {
  ADVERSARIAL_VALUES,
  DELIMITED_RECORD_FIXTURES,
  INVISIBLE_CODE_POINTS,
  INVISIBLE_TEXT_FIXTURE,
  MARKUP_FIXTURES,
  MULTIPART_MESSAGE_FIXTURES,
  NO_BREAK_SPACE,
  STRUCTURED_TEXT_FIXTURES,
  fixtureById,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/chunk.js';

/** The five functions this file drives, in sorted order. */
const FUNCTION_ENTRY_POINTS: readonly string[] = [
  'buildExcerpt',
  'cutQuotedChain',
  'estimateTokens',
  'stripInvisibleRuns',
  'stripUrlTracking',
];

/** The two ceilings it declares beside them. */
const CEILING_ENTRY_POINTS: readonly string[] = [
  'MAX_CHUNK_CHARS',
  'MAX_EXCERPT_CHARS',
];

/** What the origin module has to be for this file to drive it. */
interface ChunkOrigin {
  /** Reduces a body to prose worth reading, and reports the cuts. */
  readonly buildExcerpt: (body: unknown) => unknown;

  /** Cuts everything belonging to an earlier document. */
  readonly cutQuotedChain: (text: unknown) => unknown;

  /** Estimates a cost from a count or from something to measure. */
  readonly estimateTokens: (chars: unknown) => unknown;

  /** Removes what pads a preview without showing up in it. */
  readonly stripInvisibleRuns: (text: unknown) => unknown;

  /** Reduces every link to its address. */
  readonly stripUrlTracking: (text: unknown) => unknown;

  /** The whole-chunk ceiling. */
  readonly MAX_CHUNK_CHARS: number;

  /** The free-prose ceiling inside it. */
  readonly MAX_EXCERPT_CHARS: number;
}

/** Whether every entry point is there and is what it claims. */
function isChunkOrigin(value: unknown): value is ChunkOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exported = value as Record<string, unknown>;
  const callable = FUNCTION_ENTRY_POINTS
    .every((name) => typeof exported[name] === 'function');

  return callable && CEILING_ENTRY_POINTS
    .every((name) => typeof exported[name] === 'number');
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
 * @returns The origin module, with all seven entry points usable.
 */
function originChunk(): ChunkOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isChunkOrigin(loaded)) {
    throw new TypeError(
      'the origin module does not export '
      + `${FUNCTION_ENTRY_POINTS.join(', ')} as functions beside `
      + `${CEILING_ENTRY_POINTS.join(' and ')} as numbers.`,
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
 * Compare one input two endings, labelling any difference.
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

/** What separates two lines in every crafted document below. */
const LINE = '\n';

/** The adversarial roster, in the shape the tables below use. */
const ADVERSARIAL_INPUTS: readonly LabelledValue[] = ADVERSARIAL_VALUES.map(
  (entry) => ({ id: entry.id, build: entry.build }),
);

/** Every corpus document, as one flat list of labelled texts. */
const CORPUS_INPUTS: readonly LabelledValue[] = [
  ...STRUCTURED_TEXT_FIXTURES,
  ...DELIMITED_RECORD_FIXTURES,
  ...MULTIPART_MESSAGE_FIXTURES,
  ...MARKUP_FIXTURES,
].map((fixture) => ({ id: fixture.id, build: () => fixture.text }));

/**
 * The padded sample, its plain reading, and one text per invisible
 * character on the shared roster.
 *
 * Per character as well as in a run, because a strip that had lost
 * one code point would still agree over a text carrying all of them
 * beside the sixteen it kept stripping.
 */
const INVISIBLE_INPUTS: readonly LabelledValue[] = [
  { id: 'invisible-padded', build: () => INVISIBLE_TEXT_FIXTURE.text },
  { id: 'invisible-plain', build: () => INVISIBLE_TEXT_FIXTURE.visible },
  {
    id: 'no-break-space',
    build: () => `alpha${NO_BREAK_SPACE.char}bravo`,
  },
  ...INVISIBLE_CODE_POINTS.map((entry) => ({
    id: `invisible/${entry.id}`,
    build: () => `alpha${entry.char}bravo`,
  })),
];

/** Texts built to reach the markup pass, one per form it names. */
const MARKUP_INPUTS: readonly LabelledValue[] = [
  { id: 'markup/tag-between-words', build: () => 'alpha<b>bravo</b>charlie' },
  { id: 'markup/unclosed-bracket', build: () => 'alpha < bravo charlie' },
  { id: 'markup/over-long-run', build: () => `a<${'z'.repeat(500)}>b` },
  { id: 'markup/image-placeholder', build: () => 'alpha [image: chart] bravo' },
  { id: 'markup/attachment-placeholder', build: () => 'alpha [CID:x9] bravo' },
  { id: 'markup/empty-placeholder', build: () => 'alpha [image:] bravo' },
  {
    id: 'markup/attribute-link',
    build: () => '<a href="https://example.invalid/a?b=1">go</a>',
  },
];

/** Texts built to reach the link pass, one per payload shape. */
const LINK_INPUTS: readonly LabelledValue[] = [
  { id: 'link/plain', build: () => 'see https://example.invalid/a/b end' },
  {
    id: 'link/query',
    build: () => 'see https://example.invalid/a?x=1&y=2 end',
  },
  { id: 'link/fragment', build: () => 'see https://example.invalid/a#top end' },
  {
    id: 'link/query-and-fragment',
    build: () => 'see https://example.invalid/a?x=1#top end',
  },
  {
    id: 'link/fragment-before-query',
    build: () => 'see https://example.invalid/a#top?x=1 end',
  },
  {
    id: 'link/two-of-them',
    build: () => [
      'https://example.invalid/a?x=1',
      'https://example.invalid/b?y=2',
    ].join(' and '),
  },
  {
    id: 'link/insecure-scheme',
    build: () => 'see http://example.invalid/a?x=1',
  },
  {
    id: 'link/bracketed',
    build: () => 'see (https://example.invalid/a?x=1) end',
  },
  { id: 'link/bare-word', build: () => 'see example.invalid/a?x=1 end' },
  {
    id: 'link/long-payload',
    build: () => `https://example.invalid/r?${'p=1&'.repeat(200)}`,
  },
];

/**
 * Texts built to reach both readings of the quoted-chain cut.
 *
 * The four marker shapes first, then the per-line fallback, then the
 * two that reach neither. The interleaved one is the input that
 * tells the two readings apart from outside: only the fallback keeps
 * a line that came after a quoted one.
 */
const QUOTED_INPUTS: readonly LabelledValue[] = [
  {
    id: 'quoted/attribution-line',
    build: () => ['body', 'On Tuesday, a reader wrote:', 'older'].join(LINE),
  },
  {
    id: 'quoted/original-message-rule',
    build: () => ['body', '-- Original Message --', 'older'].join(LINE),
  },
  {
    id: 'quoted/underscore-rule',
    build: () => ['body', '________', 'older'].join(LINE),
  },
  {
    id: 'quoted/pasted-header-block',
    build: () => ['body', 'From: a reader', 'older'].join(LINE),
  },
  {
    id: 'quoted/interleaved-unmarked',
    build: () => ['alpha', '> one', 'bravo', '> two'].join(LINE),
  },
  { id: 'quoted/every-line', build: () => ['> one', '> two'].join(LINE) },
  {
    id: 'quoted/indented-marker',
    build: () => ['alpha', '   > one'].join(LINE),
  },
  { id: 'quoted/none-at-all', build: () => ['alpha', 'bravo'].join(LINE) },
  {
    id: 'quoted/carriage-returns',
    build: () => ['alpha', '> one', 'bravo']
      .join(`${codePoint(13)}${LINE}`),
  },
  {
    id: 'quoted/marker-on-the-first-line',
    build: () => ['From: a reader', 'body'].join(LINE),
  },
];

/** Texts reaching the signature cut, one per line it opens on. */
const FOOTER_INPUTS: readonly LabelledValue[] = [
  { id: 'footer/two-dashes', build: () => ['body', '--', 'sig'].join(LINE) },
  {
    id: 'footer/sent-from',
    build: () => ['body', 'Sent from my iPhone'].join(LINE),
  },
  {
    id: 'footer/notice-heading',
    build: () => ['body', 'CONFIDENTIALITY NOTICE:', 'text'].join(LINE),
  },
  {
    id: 'footer/confidential-sentence',
    build: () => [
      'body',
      'This email and any attachments are confidential',
    ].join(LINE),
  },
  {
    id: 'footer/opt-out-sentence',
    build: () => ['body', 'If you no longer wish to receive these'].join(LINE),
  },
  {
    id: 'footer/unsubscribe-word',
    build: () => ['body', 'Unsubscribe here'].join(LINE),
  },
  {
    id: 'footer/receiving-sentence',
    build: () => ['body', 'You are receiving this because'].join(LINE),
  },
  {
    id: 'footer/intended-for',
    build: () => ['body', 'This email was intended for a reader'].join(LINE),
  },
  {
    id: 'footer/copyright-sign',
    build: () => ['body', `${codePoint(0xa9)} 2026 Example`].join(LINE),
  },
  {
    id: 'footer/copyright-spelled-out',
    build: () => ['body', '(c) 2026 Example'].join(LINE),
  },
  { id: 'footer/none-at-all', build: () => ['body', 'more body'].join(LINE) },
];

/** Texts built to reach the prose window, one per anchor shape. */
const WINDOW_INPUTS: readonly LabelledValue[] = [
  {
    id: 'window/both-anchors',
    build: () => ['Hi team', 'the content', 'Regards', 'name'].join(LINE),
  },
  {
    id: 'window/greeting-only',
    build: () => ['Hello there', 'the content'].join(LINE),
  },
  {
    id: 'window/sign-off-only',
    build: () => ['the content', 'Best regards'].join(LINE),
  },
  {
    id: 'window/two-sign-offs',
    build: () => ['Hi team', 'Thanks', 'the content', 'Cheers'].join(LINE),
  },
  {
    id: 'window/greeting-past-the-search',
    build: () => [
      ...Array.from({ length: 13 }, (_unused, index) => `line ${index}`),
      'Hello there',
      'tail',
    ].join(LINE),
  },
  {
    id: 'window/greeting-that-is-a-sentence',
    build: () => `Dear reader, ${
      'this is a long opening sentence. '.repeat(4)
    }`,
  },
  { id: 'window/no-anchors', build: () => ['alpha', 'bravo'].join(LINE) },
  { id: 'window/anchors-only', build: () => ['Hi team', 'Regards'].join(LINE) },
];

/** Texts built to reach the whitespace collapse and the ceiling. */
const SHAPE_INPUTS: readonly LabelledValue[] = [
  { id: 'shape/space-runs', build: () => `alpha  ${codePoint(9)} bravo` },
  { id: 'shape/blank-line-run', build: () => 'alpha\n\n\n\n\nbravo' },
  { id: 'shape/trailing-spaces', build: () => 'alpha   \nbravo  ' },
  { id: 'shape/only-whitespace', build: () => `  ${codePoint(9)}\n\n ` },
  { id: 'shape/empty', build: () => '' },
  {
    id: 'shape/past-the-excerpt-ceiling',
    build: () => 'word '.repeat(600),
  },
  {
    id: 'shape/ceiling-with-a-late-sentence',
    build: () => `${'word '.repeat(230)}. ${'tail '.repeat(60)}`,
  },
  {
    id: 'shape/ceiling-with-an-early-sentence',
    build: () => `short. ${'word'.repeat(600)}`,
  },
  {
    id: 'shape/ceiling-with-no-boundary',
    build: () => 'x'.repeat(MAX_EXCERPT_CHARS + 500),
  },
  {
    id: 'shape/one-under-the-ceiling',
    build: () => 'y'.repeat(MAX_EXCERPT_CHARS - 1),
  },
  {
    id: 'shape/exactly-the-ceiling',
    build: () => 'z'.repeat(MAX_EXCERPT_CHARS),
  },
];

/** Everything with text in it, in one list. */
const TEXT_INPUTS: readonly LabelledValue[] = [
  ...CORPUS_INPUTS,
  ...ADVERSARIAL_INPUTS,
  ...INVISIBLE_INPUTS,
  ...MARKUP_INPUTS,
  ...LINK_INPUTS,
  ...QUOTED_INPUTS,
  ...FOOTER_INPUTS,
  ...WINDOW_INPUTS,
  ...SHAPE_INPUTS,
];

/**
 * Counts the estimate is driven over, beside every text above.
 *
 * The three that matter are in here rather than commented on: a
 * count that is not a number at all, one that is a number and cannot
 * be measured, and one below zero.
 */
const COUNT_INPUTS: readonly LabelledValue[] = [
  { id: 'count/zero', build: () => 0 },
  { id: 'count/one', build: () => 1 },
  { id: 'count/exactly-a-token', build: () => 4 },
  { id: 'count/one-past-a-token', build: () => 5 },
  { id: 'count/negative', build: () => -10 },
  { id: 'count/fractional', build: () => 2.5 },
  { id: 'count/not-a-number', build: () => Number.NaN },
  { id: 'count/infinite', build: () => Number.POSITIVE_INFINITY },
  { id: 'count/negatively-infinite', build: () => Number.NEGATIVE_INFINITY },
  { id: 'count/signed-zero', build: () => -0 },
  { id: 'count/enormous', build: () => Number.MAX_SAFE_INTEGER },
  { id: 'count/numeric-text', build: () => '16' },
  { id: 'count/boolean', build: () => true },
];

/** Everything the estimate is driven over. */
const ESTIMATE_INPUTS: readonly LabelledValue[] = [
  ...TEXT_INPUTS,
  ...COUNT_INPUTS,
];

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

/**
 * Every driven input that is already text.
 *
 * The controls below read an answer against its own input, which
 * only means anything where the two are the same kind of thing —
 * the adversarial roster is driven through the sweeps and left out
 * here.
 *
 * @returns The texts, in table order.
 */
function drivenTexts(): string[] {
  return TEXT_INPUTS
    .map((input) => input.build())
    .filter((value): value is string => typeof value === 'string');
}

describePortParity('chunk — the origin the comparisons read', () => {
  it('exports the five entry points and both ceilings', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isChunkOrigin(loaded)).toBe(true);
  });

  // Two implementations that refuse everything agree perfectly, and
  // two that answer everything leave every refusal path unmeasured.
  // So the driven inputs have to produce both endings — read off the
  // PORT, since the original is the thing under measurement.
  it('is driven over inputs producing both endings, on both sweeps', () => {
    const endings = [
      ESTIMATE_INPUTS.map(
        (input) => outcomeOf(() => estimateTokens(input.build())),
      ),
      TEXT_INPUTS.map((input) => outcomeOf(() => buildExcerpt(input.build()))),
    ].map((run) => run.map((ending) => ending.refused));

    expect(endings.map((run) => run.includes(true))).toEqual([true, true]);
    expect(endings.map((run) => run.includes(false))).toEqual([true, true]);
  });

  // The control every stripping comparison rests on. A corpus
  // carrying none of what a pass removes comes back unchanged from
  // any implementation, right or wrong, so each strip has to be
  // driven over texts it CHANGES and texts it leaves alone.
  it('drives each strip over texts it changes and texts it does not', () => {
    const texts = drivenTexts();
    const readings = [
      texts.map((text) => stripInvisibleRuns(text) !== text),
      texts.map((text) => stripUrlTracking(text) !== text),
    ];

    expect(readings.map((reading) => reading.includes(true)))
      .toEqual([true, true]);
    expect(readings.map((reading) => reading.includes(false)))
      .toEqual([true, true]);
  });

  // The same reading spread over the excerpt report, which is where
  // the composed passes are actually observed: a corpus reaching
  // neither ending of the truncation flag, or neither of the two
  // line counters, would agree over cuts that never ran.
  it('drives the excerpt build over both endings of its own report', () => {
    const built = drivenTexts().map((text) => buildExcerpt(text));
    const readings = [
      built.map((entry) => entry.removed.truncated),
      built.map((entry) => entry.removed.quoted_lines > 0),
      built.map((entry) => entry.removed.footer_lines > 0),
      built.map((entry) => entry.excerpt === ''),
    ];

    expect(readings.map((reading) => reading.includes(true)))
      .toEqual(readings.map(() => true));
    expect(readings.map((reading) => reading.includes(false)))
      .toEqual(readings.map(() => true));
  });

  // The quoted cut has two readings and the counter cannot tell them
  // apart, so the corpus is held to reaching both by the property
  // that separates them: only the per-line fallback keeps a line
  // that came AFTER a quoted one.
  it('drives the quoted cut over both of its readings', () => {
    const marked = fixtureById(QUOTED_INPUTS, 'quoted/attribution-line');
    const unmarked = fixtureById(QUOTED_INPUTS, 'quoted/interleaved-unmarked');

    expect(cutQuotedChain(marked.build()))
      .toEqual({ text: 'body', quoted_lines: 2 });
    expect(cutQuotedChain(unmarked.build()))
      .toEqual({ text: 'alpha\nbravo', quoted_lines: 2 });
  });
});

describePortParity('the two ceilings', () => {
  // Exports like any other, and the ones whose drift would be least
  // visible: a port shipping a different excerpt ceiling would agree
  // on every short comparison below and cut every long document at a
  // different length.
  it('agree with the original', () => {
    const origin = originChunk();

    expect(firstDivergence(
      [origin.MAX_CHUNK_CHARS, origin.MAX_EXCERPT_CHARS],
      [MAX_CHUNK_CHARS, MAX_EXCERPT_CHARS],
    )).toBeNull();
  });
});

describePortParity('estimateTokens — a count, or something to measure', () => {
  // Every text and every count in one sweep, which is what the
  // preserved reading needs: a number is taken as a character count
  // and everything else as text to measure, so a port that had
  // tightened the parameter would part on the first count.
  it('agrees over every count and every text', () => {
    const origin = originChunk();
    const apart = ESTIMATE_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.estimateTokens(input.build())),
      outcomeOf(() => estimateTokens(input.build())),
    ));

    expect(apart).toEqual([]);
  });

  // The differ compares primitives by identity, so the signed zero
  // and the unmeasurable count are both already inside the sweep
  // above. Asserted again on their own because they are the two
  // values a JSON round trip would lose, which makes a regression in
  // either invisible to every other reading.
  it('agrees about the two counts serialization would lose', () => {
    const origin = originChunk();
    const apart = [
      compare(
        'signed-zero',
        outcomeOf(() => origin.estimateTokens(-0)),
        outcomeOf(() => estimateTokens(-0)),
      ),
      compare(
        'not-a-number',
        outcomeOf(() => origin.estimateTokens(Number.NaN)),
        outcomeOf(() => estimateTokens(Number.NaN)),
      ),
    ].flat();

    expect(apart).toEqual([]);
  });
});

describePortParity('stripInvisibleRuns — padding, and what is not', () => {
  it('agrees over every text', () => {
    const origin = originChunk();
    const apart = TEXT_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.stripInvisibleRuns(input.build())),
      outcomeOf(() => stripInvisibleRuns(input.build())),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('stripUrlTracking — the largest saving in the file', () => {
  it('agrees over every text', () => {
    const origin = originChunk();
    const apart = TEXT_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.stripUrlTracking(input.build())),
      outcomeOf(() => stripUrlTracking(input.build())),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('cutQuotedChain — both readings, and the count', () => {
  it('agrees over every text', () => {
    const origin = originChunk();
    const apart = TEXT_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.cutQuotedChain(input.build())),
      outcomeOf(() => cutQuotedChain(input.build())),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('buildExcerpt — the whole reduction, in order', () => {
  // The composed leg. Five of the passes it runs are exported by the
  // port and by neither the original nor this comparison, so this is
  // where they are measured: an input reaching a pass compares that
  // pass, and the crafted tables above are built one per pass for
  // exactly that reason.
  it('agrees over every text, excerpt and report alike', () => {
    const origin = originChunk();
    const apart = TEXT_INPUTS.flatMap((input) => compare(
      input.id,
      outcomeOf(() => origin.buildExcerpt(input.build())),
      outcomeOf(() => buildExcerpt(input.build())),
    ));

    expect(apart).toEqual([]);
  });

  // The differ deliberately does not compare object key order, and
  // the report is read by a caller writing a ledger row per cut. So
  // one case compares `Object.keys` from both sides directly, which
  // is the reading the structural diff is documented as leaving to
  // its caller.
  it('answers the same keys in the same order, outer and report', () => {
    const origin = originChunk();
    const source = fixtureById(QUOTED_INPUTS, 'quoted/attribution-line');
    const theirs = origin.buildExcerpt(source.build()) as {
      removed: Record<string, unknown>;
    };
    const ours = buildExcerpt(source.build());

    expect(Object.keys(ours)).toEqual(Object.keys(theirs));
    expect(Object.keys(ours.removed)).toEqual(Object.keys(theirs.removed));
  });
});
