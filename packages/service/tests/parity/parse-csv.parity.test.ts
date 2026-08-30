/**
 * Full parity for `src/lib/parse-csv.ts`: both exports, driven
 * against their originals over one neutral corpus.
 *
 * The port claims behaviour preservation, and its module TSDoc names
 * four things it drops — none of them behaviour. This file is what
 * makes that a measurement rather than an assertion. Every comparison
 * hands both implementations the same input and diffs what came back,
 * so a divergence is reported by path and by kind rather than as a
 * failed expectation somebody has to reconstruct.
 *
 * Both sides are run through {@link outcomeOf} even though neither is
 * meant to throw, and that is the point rather than an oversight: a
 * comparison reading only the value a call returned passes for a port
 * that throws where the original answered, which for this library
 * would be the single worst regression available. Turning either
 * ending into a value is what makes "it never throws" a thing the
 * differ can report on.
 *
 * That arrangement needs a control, and here it is the mirror of the
 * one `yaml-lite.parity.test.ts` carries. There, the corpus had to
 * produce BOTH endings or a suite comparing two refusals would agree
 * having read nothing. Here the contract is that ONE ending is
 * reachable, so the control is that the port answers for every input
 * driven — plus that the corpus produces both an empty and a
 * non-empty reading, since a corpus that had drifted into documents
 * carrying no rows would agree perfectly over nothing.
 *
 * Both exports are driven rather than the row reader alone, because
 * they answer different questions and only one of them is reachable
 * through the other. The tokenizer says where the record and field
 * boundaries fell, which is the whole of the state machine; the row
 * reader says what happened to the header afterwards, which is
 * squaring, keying and the two-record floor. A document only reaches
 * the second through the first, so driving rows alone would leave
 * every record a header-only document holds unmeasured.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and a
 * load up there would throw on every run that armed nothing — CI's
 * included.
 */
import { expect, it } from 'vitest';

import { parseCsv, tokenizeCsv } from '../../src/lib/parse-csv.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { ADVERSARIAL_VALUES, DELIMITED_RECORD_FIXTURES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/parse-csv.js';

/** The two entry points this file drives, in sorted order. */
const ENTRY_POINTS: readonly string[] = ['parseCsv', 'tokenizeCsv'];

/** What the origin module has to be for this file to drive it. */
interface ParseCsvOrigin {
  /** Reads a document into rows keyed by its header. */
  readonly parseCsv: (text: string) => unknown;

  /** Splits a document into records, and each record into fields. */
  readonly tokenizeCsv: (text: string) => unknown;
}

/** Whether every entry point is there and is callable. */
function isParseCsvOrigin(value: unknown): value is ParseCsvOrigin {
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
 * @returns The origin module, with both entry points callable.
 */
function originParseCsv(): ParseCsvOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isParseCsvOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export both of ${ENTRY_POINTS.join(', ')} `
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

/**
 * Drive both implementations over one input, through both exports.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin module.
 * @param input - What to hand both sides.
 * @returns Every comparison that parted.
 */
function compareBoth(
  over: string,
  origin: ParseCsvOrigin,
  input: unknown,
): LabelledDivergence[] {
  const text = input as string;

  return [
    ...compare(
      `${over} (tokenizeCsv)`,
      outcomeOf(() => origin.tokenizeCsv(text)),
      outcomeOf(() => tokenizeCsv(text)),
    ),
    ...compare(
      `${over} (parseCsv)`,
      outcomeOf(() => origin.parseCsv(text)),
      outcomeOf(() => parseCsv(text)),
    ),
  ];
}

// ---------------------------------------------------------------------------
// The inputs beyond the shared corpus
// ---------------------------------------------------------------------------

/** A byte-order mark, built from its code point rather than pasted. */
const MARK = String.fromCodePoint(0xfeff);

/**
 * Every document worth driving that the corpus has no entry for.
 *
 * The corpus holds documents written to demonstrate the shapes a
 * spreadsheet export takes, so these are deliberately wider: the
 * places a state machine can be subtly wrong without any well-formed
 * file noticing. Where a quote may open, what becomes of text behind
 * a closing one, which separators end a record, which lines carry one
 * at all, and the header shapes that key a row badly.
 */
const AUTHORED_DOCUMENTS: readonly string[] = [
  '', '\n', '\r', '\r\n', ',', ',,\n,,\n', MARK, `${MARK}\n`,
  'station\n', 'station\nalpha\nbravo\n', 'station\n\n\n',
  'station,note\nalpha"bravo,dry\n',
  'station,note\n"alpha"bravo,dry\n',
  'station,note\ralpha,dry\r',
  'station,note\n"alpha\r\nbravo",dry\n',
  'station,note\n"alpha\rbravo",dry\n',
  'station,note\n   \nalpha,dry\n',
  'station,note\nalpha,\n',
  'station,note\n"",dry\n',
  'station,note\n"""",dry\n',
  'station,note\nalpha,"',
  'station,note\nalpha,"dry',
  'station,note\nalpha,"dry""',
  'station,note\n "alpha",dry\n',
  'station,note\nalpha,dry',
  'station,note\nalpha,dry\r\n',
  `station\n${MARK}alpha\n`,
  'station\tnote\nalpha\tdry\n',
  '"station","note"\nalpha,dry\n',
  'station,station\nalpha,bravo\n',
  '__proto__,note\nalpha,dry\n',
  'constructor,note\nalpha,dry\n',
  'toString,note\nalpha,dry\n',
  'station,\nalpha,dry\n',
  ',note\nalpha,dry\n',
  'station,note,extra\nalpha,dry\n',
  'station,note\nalpha,dry,extra\n',
];

/**
 * Whether the corpus and the authored documents together produce both
 * an empty and a non-empty row reading.
 *
 * Read off the PORT rather than the origin, because that is what the
 * control needs: the origin is the thing under measurement, and a
 * control read off it would be asking the subject to vouch for the
 * inputs.
 *
 * @returns One row count per document driven.
 */
function portRowCounts(): number[] {
  return [
    ...DELIMITED_RECORD_FIXTURES.map((fixture) => fixture.text),
    ...AUTHORED_DOCUMENTS,
  ].map((text) => parseCsv(text).length);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('parse-csv — the origin the comparisons read', () => {
  it('exports the two entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isParseCsvOrigin(loaded)).toBe(true);
  });

  // The control every comparison below rests on, in two halves. The
  // first is this library's whole contract: it answers for anything,
  // so a run where the port refused something would mean the
  // comparisons had started diffing one exception against another.
  // The second is that the driven set still carries documents rows
  // come out of — a set that had drifted into header-only text would
  // agree perfectly having keyed nothing.
  it('is driven over inputs the port answers for, carrying rows', () => {
    const counts = portRowCounts();

    expect(counts).toContain(0);
    expect(counts.some((count) => count > 0)).toBe(true);
  });

  it('is driven over inputs the port never refuses', () => {
    const refused = [
      ...DELIMITED_RECORD_FIXTURES.map((fixture) => fixture.text),
      ...AUTHORED_DOCUMENTS,
    ].filter((text) => outcomeOf(() => parseCsv(text)).refused);

    expect(refused).toEqual([]);
  });
});

describePortParity('parse-csv — the delimited corpus', () => {
  for (const fixture of DELIMITED_RECORD_FIXTURES) {
    it(`agrees over ${fixture.id}`, () => {
      const origin = originParseCsv();

      expect(compareBoth(fixture.id, origin, fixture.text)).toEqual([]);
    });
  }
});

describePortParity('parse-csv — the documents no corpus holds', () => {
  // One case over the whole roster rather than one per document. A
  // divergence here is a difference in how the state machine reads a
  // SHAPE, and the set of documents that moved together is the
  // reading a failure needs — one case per document would report
  // whichever ran first and leave the shape of the drift to be
  // reconstructed.
  it('agrees over every authored document', () => {
    const origin = originParseCsv();
    const apart = AUTHORED_DOCUMENTS.flatMap(
      (text) => compareBoth(JSON.stringify(text), origin, text),
    );

    expect(apart).toEqual([]);
  });

  // The roster is walked, so an emptied roster passes the case above
  // without comparing anything. Held against its own membership: the
  // shapes a reader would expect to find are asserted present, and
  // the count is asserted only as a floor.
  it('is driven over a roster that still holds its edge shapes', () => {
    expect(AUTHORED_DOCUMENTS).toContain('');
    expect(AUTHORED_DOCUMENTS).toContain('station,note\nalpha"bravo,dry\n');
    expect(AUTHORED_DOCUMENTS).toContain('__proto__,note\nalpha,dry\n');
    expect(AUTHORED_DOCUMENTS).toContain('station,note\nalpha,"');
    expect(AUTHORED_DOCUMENTS.length).toBeGreaterThan(30);
  });
});

describePortParity('parse-csv — input that is not text', () => {
  // The guard in front of both entry points is the only thing
  // standing between a Code node's absent field and a crash inside a
  // string method, and it is the one part of this library a type
  // annotation makes invisible: the compiler will never let a caller
  // here reach it, and the spliced copy runs where no type was ever
  // checked. So it is driven over the shared adversarial roster, each
  // value built fresh for each side.
  it('agrees over every adversarial value', () => {
    const origin = originParseCsv();
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => compareBoth(
      entry.id,
      origin,
      entry.build(),
    ));

    expect(apart).toEqual([]);
  });

  // The roster is walked, and it is a shared one this file does not
  // own. Held to the members whose reading here is distinct: absence
  // must reach the guard, and a value with digits in it must reach
  // the string conversion behind the guard.
  it('is driven over a roster holding absence and a number', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('null');
    expect(ids).toContain('undefined');
    expect(ids).toContain('numeric-string');
    expect(ids).toContain('big-integer');
  });
});
