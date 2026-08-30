/**
 * Full parity for `src/lib/yaml-lite.ts`: all three exports, driven
 * against their originals over one neutral corpus.
 *
 * The port claims behaviour preservation, and its module TSDoc names
 * four things it drops — none of them behaviour. This file is what
 * makes that a measurement rather than an assertion. Every comparison
 * hands both implementations the same input and diffs what came back,
 * so a divergence is reported by path and by kind rather than as a
 * failed expectation somebody has to reconstruct.
 *
 * A refusal is an ANSWER here, not an absence of one. This library's
 * whole argument is that it turns a malformed document away with a
 * sentence naming the file and the line, so a parity run that compared
 * only the documents both sides returned would leave the larger half
 * of the behaviour unmeasured — and would pass for a port that threw
 * different sentences, or threw at different lines, or threw where the
 * original returned. Both sides are therefore run through
 * {@link outcomeOf}, which turns either ending into a value, and the
 * two values are diffed structurally.
 *
 * That arrangement needs a control, and it is the guard case below:
 * the corpus must produce BOTH endings through the port. Without it, a
 * corpus that had drifted into documents the parser refuses outright
 * would agree perfectly with an origin refusing them for its own
 * reasons, and every case here would be green over a suite that never
 * read a document.
 *
 * The three exports are driven separately rather than through the
 * document parser alone, because two of them are reachable on their
 * own: a caller reading one field out of a larger structure uses the
 * scalar reader directly, and the comment stripper is the only thing
 * standing between a hash inside a value and a truncated line. A
 * document only reaches either through text it happens to hold, so
 * driving documents alone would leave the forms no corpus entry
 * contains unmeasured.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and a
 * load up there would throw on every run that armed nothing — CI's
 * included.
 */
import { expect, it } from 'vitest';

import {
  parseYamlLite,
  parseYamlScalar,
  stripYamlComment,
} from '../../src/lib/yaml-lite.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { STRUCTURED_TEXT_FIXTURES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/yaml-lite.js';

/** The three entry points this file drives, in sorted order. */
const ENTRY_POINTS: readonly string[] = [
  'parseYamlLite',
  'parseYamlScalar',
  'stripYamlComment',
];

/** What the origin module has to be for this file to drive it. */
interface YamlLiteOrigin {
  /** Reads a whole document, or refuses it. */
  readonly parseYamlLite: (
    text: string,
    options?: { readonly file?: string },
  ) => unknown;

  /** Reads one scalar, or refuses it. */
  readonly parseYamlScalar: (
    raw: string,
    file: string,
    lineNumber: number,
  ) => unknown;

  /** Cuts a trailing comment. */
  readonly stripYamlComment: (line: string) => unknown;
}

/** Whether every entry point is there and is callable. */
function isYamlLiteOrigin(value: unknown): value is YamlLiteOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exports = value as Record<string, unknown>;

  return ENTRY_POINTS.every((name) => typeof exports[name] === 'function');
}

/**
 * The origin library, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a module
 * missing an export would otherwise be called as `undefined` and every
 * comparison below would diff one thrown TypeError against another,
 * which is agreement nobody established.
 *
 * @returns The origin module, with its three entry points callable.
 */
function originYamlLite(): YamlLiteOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isYamlLiteOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export all of ${ENTRY_POINTS.join(', ')} `
      + 'as functions.',
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
// The inputs beyond the shared corpus
// ---------------------------------------------------------------------------

/** The label half the document comparisons run under. */
const FILE_LABEL = 'sample.yaml';

/**
 * Every scalar form worth driving, admitted and refused together.
 *
 * The corpus holds documents rather than scalars, so these are
 * authored here — and they are deliberately wider than any document
 * in it: the forms that decide whether something is a number, a
 * boolean or a string are exactly the ones a port is most likely to
 * get subtly wrong, and most of them never appear in a document
 * written to demonstrate structure.
 */
const SCALAR_INPUTS: readonly string[] = [
  '', '   ', 'null', '~', '0', '-0', '12', '-12', '007',
  '1.5', '-1.5', '.5', '12.', '1.', '-.5',
  'true', 'false', 'True', 'FALSE', 'yes', 'no', 'on', 'off',
  '0x10', '1e3', '+12', '1_000', 'NaN', 'Infinity',
  'coastal', 'a note: with a colon', 'a value  with  spacing',
  '[]', '{}', '[a, b]', '{a: 1}',
  '\'0\'', '\'coastal\'', '\'it\'\'s here\'', '\'\'',
  '"0"', '"coastal"', '"a \\" mark"', '"a \\\\ mark"', '""',
  '"a \\n mark"', '\'a \\n mark\'',
  '"unterminated', '\'unterminated', '"', '\'',
  '| folded', '> folded', '&coastal', '*coastal', '!tag',
];

/**
 * Lines the comment stripper is driven over, beyond the corpus's own.
 *
 * The corpus supplies every line of every document below as well, so
 * these are the shapes a document written to demonstrate structure
 * has no reason to hold: a hash that is not a comment, a hash inside
 * either quote, and a line that is nothing but hashes.
 */
const COMMENT_INPUTS: readonly string[] = [
  '', '   ', '#', ' #', '##', 'a#b#c', 'a #b#c',
  '# a whole-line comment',
  '   # an indented comment',
  'network: coastal   # a trailing comment',
  'station: north#2',
  'station: north #2',
  'label: "a # inside quotes"',
  'label: \'a # inside quotes\'',
  'label: "an unterminated quote # and a hash',
  'label: \'\' # after an empty quoted value',
  'network: coastal #',
  'network: coastal#',
];

/** Every line of every corpus document, in order. */
function corpusLines(): string[] {
  return STRUCTURED_TEXT_FIXTURES
    .flatMap((fixture) => fixture.text.split('\n'));
}

/**
 * Whether the PORT turns this document away.
 *
 * Read off the port rather than the origin because it is what the
 * control below needs: the origin is the thing under measurement, and
 * a control read off it would be asking the subject to vouch for the
 * corpus.
 *
 * @param text - One corpus document.
 * @returns Whether reading it ended in a refusal.
 */
function portRefuses(text: string): boolean {
  return outcomeOf(() => parseYamlLite(text, { file: FILE_LABEL })).refused;
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('yaml-lite — the origin the comparisons read', () => {
  it('exports the three entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isYamlLiteOrigin(loaded)).toBe(true);
  });

  // The control every comparison below rests on. A refusal and a
  // document are both compared as values, so a corpus that had drifted
  // into documents this parser refuses outright would agree with an
  // origin refusing them too, and the whole file would be green having
  // read no document at all. Driven through the PORT, since the origin
  // is the thing under measurement.
  it('is driven over a corpus carrying both endings', () => {
    const endings = STRUCTURED_TEXT_FIXTURES
      .map((fixture) => portRefuses(fixture.text));

    expect(endings).toContain(true);
    expect(endings).toContain(false);
  });
});

describePortParity('parseYamlLite — the structured corpus', () => {
  for (const fixture of STRUCTURED_TEXT_FIXTURES) {
    // Both label modes in one case, because the label is a prefix on
    // every refusal this document can produce: a port that dropped it,
    // or supplied one where none was asked for, parts on the labelled
    // run alone.
    it(`agrees over ${fixture.id}`, () => {
      const origin = originYamlLite();
      const labelled = { file: FILE_LABEL };
      const apart = [
        ...compare(
          `${fixture.id} (no label)`,
          outcomeOf(() => origin.parseYamlLite(fixture.text)),
          outcomeOf(() => parseYamlLite(fixture.text)),
        ),
        ...compare(
          `${fixture.id} (labelled)`,
          outcomeOf(() => origin.parseYamlLite(fixture.text, labelled)),
          outcomeOf(() => parseYamlLite(fixture.text, labelled)),
        ),
      ];

      expect(apart).toEqual([]);
    });
  }
});

describePortParity('parseYamlScalar — every scalar form', () => {
  // One case over the whole roster rather than one per form. A
  // divergence here is a difference in how a value is READ, and the
  // set of forms that moved together is the reading a failure needs —
  // one case per form would report whichever ran first and leave the
  // shape of the drift to be reconstructed.
  it('agrees over every admitted and refused form', () => {
    const origin = originYamlLite();
    const apart = SCALAR_INPUTS.flatMap((raw) => [
      ...compare(
        `${JSON.stringify(raw)} (no label)`,
        outcomeOf(() => origin.parseYamlScalar(raw, '', 7)),
        outcomeOf(() => parseYamlScalar(raw, '', 7)),
      ),
      ...compare(
        `${JSON.stringify(raw)} (labelled)`,
        outcomeOf(() => origin.parseYamlScalar(raw, FILE_LABEL, 7)),
        outcomeOf(() => parseYamlScalar(raw, FILE_LABEL, 7)),
      ),
    ]);

    expect(apart).toEqual([]);
  });

  // The roster is walked, so an emptied roster passes the case above
  // without comparing anything. Held against its own membership: the
  // forms a reader would expect to find are asserted present, and the
  // count is asserted only as a floor.
  it('is driven over a roster that still holds its edge forms', () => {
    expect(SCALAR_INPUTS).toContain('0');
    expect(SCALAR_INPUTS).toContain('');
    expect(SCALAR_INPUTS).toContain('[]');
    expect(SCALAR_INPUTS).toContain('| folded');
    expect(SCALAR_INPUTS.length).toBeGreaterThan(40);
  });
});

describePortParity('stripYamlComment — every line', () => {
  // Driven over the authored lines AND over every line of every
  // corpus document, so the stripper is measured on the exact text the
  // document comparisons put through it as well as on the hash
  // placements no document needed.
  it('agrees over the authored lines and the corpus ones', () => {
    const origin = originYamlLite();
    const lines = [...COMMENT_INPUTS, ...corpusLines()];
    const apart = lines.flatMap((line) => compare(
      JSON.stringify(line),
      outcomeOf(() => origin.stripYamlComment(line)),
      outcomeOf(() => stripYamlComment(line)),
    ));

    expect(apart).toEqual([]);
  });

  it('is driven over lines from both sources', () => {
    expect(COMMENT_INPUTS.length).toBeGreaterThan(0);
    expect(corpusLines().length).toBeGreaterThan(COMMENT_INPUTS.length);
  });
});
