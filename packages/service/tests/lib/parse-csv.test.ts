/**
 * Cases for `src/lib/parse-csv.ts`: what it makes of text nobody
 * checked, and the reading those answers bound.
 *
 * The malformed inputs come first and take up most of the file, and
 * the reason is the opposite of the one `yaml-lite.test.ts` gives for
 * the same ordering. That library refuses what it does not understand,
 * so its cases pin sentences. This one refuses nothing at all — a file
 * that arrived hours ago from nobody in particular gets read as far as
 * it can be read — so every malformed shape has an ANSWER, and an
 * answer nobody wrote down is an answer nobody can rely on. A suite
 * driving only well-formed rows would pass over a reader that dropped
 * the last row of every file, swallowed a header, or turned an empty
 * cell into a zero.
 *
 * The never-throws contract is therefore a case of its own rather than
 * an assumption underneath the others. It is driven over every input
 * in this file plus the shared corpus, because it is the claim the
 * whole module rests on and the one a careless repair breaks first.
 *
 * The corpus entries are driven off `tests/parity/fixtures.ts` rather
 * than off a list written here, since the same entries drive the
 * parity suite and two lists that agree until somebody edits one is
 * exactly what that arrangement avoids. The table below is held
 * set-equal against the corpus, so an entry added there fails HERE
 * naming itself instead of going undriven.
 *
 * The rest is authored in this file, and it is the shapes the corpus
 * has no reason to hold: a quote that opens mid-field, text after a
 * closing one, a header naming one column twice, and the four inputs
 * that are not text at all. The corpus is a shared neutral corpus
 * rather than this library's exhaustive fault list, so completeness
 * lives here and the shared entries stay shared.
 */
import { describe, expect, it } from 'vitest';

import { parseCsv, tokenizeCsv } from '../../src/lib/parse-csv.js';
import {
  DELIMITED_RECORD_FIXTURES,
  fixtureById,
} from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// Reading an answer, including the answer that is a throw
// ---------------------------------------------------------------------------

/** What {@link endingOf} answers for a call that returned. */
const ANSWERED = '<answered>';

/**
 * Whether a call answered, and what it said if it did not.
 *
 * Every case in this file expects {@link ANSWERED}. Written as a
 * string rather than as a boolean so a failure prints the sentence
 * that arrived instead of `true !== false`, which for a library whose
 * contract is that it never throws is the whole of the diagnosis.
 *
 * @param run - The call under test.
 * @returns {@link ANSWERED}, or what was thrown.
 */
function endingOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error
      ? `threw: ${error.message}`
      : `threw a non-Error: ${String(error)}`;
  }

  return ANSWERED;
}

/** Sorted copy, so an equality is over members rather than order. */
function sorted(ids: readonly string[]): string[] {
  return [...ids].sort();
}

// ---------------------------------------------------------------------------
// The shared corpus, and what this reader makes of every entry
// ---------------------------------------------------------------------------

/** One corpus entry, and the records and rows it reads to. */
interface CorpusReading {
  /** The entry, by its id in the corpus. */
  readonly id: string;

  /** Every record the tokenizer finds, header included. */
  readonly records: readonly (readonly string[])[];

  /** Every row the reader keys, header excluded. */
  readonly rows: readonly Record<string, string>[];
}

/**
 * Every corpus entry, and both readings of it, whole.
 *
 * Whole readings rather than spot checks on a row or a cell: a reading
 * is only a reading if nothing else came back with it, and a reader
 * that dropped the last record would satisfy any number of per-cell
 * claims. Both levels are pinned because they answer different
 * questions — the records say where the reader put the boundaries, and
 * the rows say what it did with the header afterwards.
 */
const CORPUS_READINGS: readonly CorpusReading[] = [
  {
    id: 'csv-simple',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'gauge measured no rainfall'],
      ['bravo', '', 'gauge was offline'],
    ],
    rows: [
      {
        station: 'alpha',
        rainfall_mm: '0',
        note: 'gauge measured no rainfall',
      },
      { station: 'bravo', rainfall_mm: '', note: 'gauge was offline' },
    ],
  },
  {
    id: 'csv-quoted-comma',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'dry, and cold'],
    ],
    rows: [{ station: 'alpha', rainfall_mm: '0', note: 'dry, and cold' }],
  },
  {
    id: 'csv-embedded-newline',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'first line\nsecond line'],
    ],
    rows: [{
      station: 'alpha',
      rainfall_mm: '0',
      note: 'first line\nsecond line',
    }],
  },
  {
    id: 'csv-doubled-quote',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'the gauge reads "dry" today'],
    ],
    rows: [{
      station: 'alpha',
      rainfall_mm: '0',
      note: 'the gauge reads "dry" today',
    }],
  },
  {
    id: 'csv-ragged',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0'],
      ['bravo', '4', 'wet', 'extra'],
    ],
    rows: [
      { station: 'alpha', rainfall_mm: '0', note: '' },
      { station: 'bravo', rainfall_mm: '4', note: 'wet' },
    ],
  },
  {
    id: 'csv-crlf',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'dry'],
    ],
    rows: [{ station: 'alpha', rainfall_mm: '0', note: 'dry' }],
  },
  {
    id: 'csv-byte-order-mark',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'dry'],
    ],
    rows: [{ station: 'alpha', rainfall_mm: '0', note: 'dry' }],
  },
  {
    id: 'csv-blank-lines',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'dry'],
    ],
    rows: [{ station: 'alpha', rainfall_mm: '0', note: 'dry' }],
  },
  {
    id: 'csv-header-only',
    records: [['station', 'rainfall_mm', 'note']],
    rows: [],
  },
  {
    id: 'csv-unterminated-quote',
    records: [
      ['station', 'rainfall_mm', 'note'],
      ['alpha', '0', 'a note that never closes'],
    ],
    rows: [{
      station: 'alpha',
      rainfall_mm: '0',
      note: 'a note that never closes',
    }],
  },
  {
    id: 'csv-empty',
    records: [],
    rows: [],
  },
];

// ---------------------------------------------------------------------------
// The shapes the corpus has no entry for
// ---------------------------------------------------------------------------

/** One document authored here, and what the tokenizer finds in it. */
interface AuthoredReading {
  /** What the document stands for, in one line. */
  readonly describes: string;

  /** The document. */
  readonly text: string;

  /** Every record it reads to. */
  readonly records: readonly (readonly string[])[];
}

/**
 * The shapes a corpus written to demonstrate structure has no reason
 * to hold.
 *
 * Each of these is a place a state machine can be subtly wrong without
 * any well-formed file noticing: where a quote is allowed to open,
 * what happens to text behind a closing one, which separators end a
 * record, and which lines carry one at all.
 */
const AUTHORED_READINGS: readonly AuthoredReading[] = [
  {
    describes: 'a quote opening mid-field, which swallows what follows',
    text: 'station,note\nalpha"bravo,dry\n',
    records: [['station', 'note'], ['alphabravo,dry\n']],
  },
  {
    describes: 'text behind a closing quote, which joins the same field',
    text: 'station,note\n"alpha"bravo,dry\n',
    records: [['station', 'note'], ['alphabravo', 'dry']],
  },
  {
    describes: 'a lone carriage return, which ends a record by itself',
    text: 'station,note\ralpha,dry\r',
    records: [['station', 'note'], ['alpha', 'dry']],
  },
  {
    describes: 'a carriage return inside a quoted field, which is kept',
    text: 'station,note\n"alpha\r\nbravo",dry\n',
    records: [['station', 'note'], ['alpha\r\nbravo', 'dry']],
  },
  {
    describes: 'a line of spaces, which is a record rather than a blank',
    text: 'station,note\n   \nalpha,dry\n',
    records: [['station', 'note'], ['   '], ['alpha', 'dry']],
  },
  {
    describes: 'a row ending in a delimiter, which has a last empty field',
    text: 'station,note\nalpha,\n',
    records: [['station', 'note'], ['alpha', '']],
  },
  {
    describes: 'a quoted field holding nothing, which is an empty field',
    text: 'station,note\n"",dry\n',
    records: [['station', 'note'], ['', 'dry']],
  },
  {
    describes: 'a field that is one escaped quote and nothing else',
    text: 'station,note\n"""",dry\n',
    records: [['station', 'note'], ['"', 'dry']],
  },
  {
    describes: 'a quote as the last character, which opens an empty field',
    text: 'station,note\nalpha,"',
    records: [['station', 'note'], ['alpha', '']],
  },
  {
    describes: 'a mark on its own, which leaves no text behind it',
    text: `${String.fromCodePoint(0xfeff)}`,
    records: [],
  },
  {
    describes: 'a mark inside a value, which is left where it is',
    text: `station\n${String.fromCodePoint(0xfeff)}alpha\n`,
    records: [['station'], [`${String.fromCodePoint(0xfeff)}alpha`]],
  },
  {
    describes: 'a tab, which is not a delimiter this reader knows',
    text: 'station\tnote\nalpha\tdry\n',
    records: [['station\tnote'], ['alpha\tdry']],
  },
  {
    describes: 'a quoted header, whose quotes are not part of the name',
    text: '"station","note"\nalpha,dry\n',
    records: [['station', 'note'], ['alpha', 'dry']],
  },
];

/** One non-text input, and the records it reads to. */
interface CoercedReading {
  /** What the value stands for, in one line. */
  readonly describes: string;

  /** The value, exactly as a Code node might hand it over. */
  readonly value: unknown;

  /** Every record it reads to. */
  readonly records: readonly (readonly string[])[];
}

/**
 * The values a spliced copy can be handed where a string was meant.
 *
 * The guard in front of both entry points is the only thing standing
 * between an absent field and a crash inside a string method, and the
 * two halves of it answer differently on purpose: absence reads as an
 * empty document, and anything else reads as its own string
 * conversion. A reader collapsing both to `''` would give a node that
 * read a file into an unmodelled value an empty result and no sign
 * that anything had gone wrong.
 */
const COERCED_READINGS: readonly CoercedReading[] = [
  {
    describes: 'null, which is absence and reads as no text at all',
    value: null,
    records: [],
  },
  {
    describes: 'undefined, which is the other absence and reads the same',
    value: undefined,
    records: [],
  },
  {
    describes: 'a number, which reads as its digits',
    value: 12,
    records: [['12']],
  },
  {
    describes: 'an array, which reads as its joined elements',
    value: ['alpha,bravo'],
    records: [['alpha', 'bravo']],
  },
];

// ---------------------------------------------------------------------------
// The contract underneath every case below
// ---------------------------------------------------------------------------

describe('parse-csv — the guard over the tables below', () => {
  // Every case here walks one of the three tables, and a walk over a
  // table that lost an entry passes without reading it. The corpus
  // table is held against the corpus itself; the authored ones have
  // no corpus to be held against, so their guard is that they are not
  // empty and describe no shape twice.
  it('drives every corpus entry', () => {
    const corpusIds = DELIMITED_RECORD_FIXTURES.map((fixture) => fixture.id);

    expect(sorted(CORPUS_READINGS.map((entry) => entry.id)))
      .toEqual(sorted(corpusIds));
  });

  it('authors a shape list with no empty and no repeated entry', () => {
    const described = [
      ...AUTHORED_READINGS.map((entry) => entry.describes),
      ...COERCED_READINGS.map((entry) => entry.describes),
    ];

    expect(described.length).toBeGreaterThan(0);
    expect(sorted([...new Set(described)])).toEqual(sorted(described));
  });

  // The claim the whole module rests on, driven over every input this
  // file holds rather than asserted once. A reader that threw on the
  // last line of a thousand would discard the nine hundred and
  // ninety-nine it had already understood, which is the failure this
  // library exists to not have.
  it('answers for every input here, throwing for none of them', () => {
    const inputs: readonly unknown[] = [
      ...DELIMITED_RECORD_FIXTURES.map((fixture) => fixture.text),
      ...AUTHORED_READINGS.map((entry) => entry.text),
      ...COERCED_READINGS.map((entry) => entry.value),
    ];
    const endings = inputs.flatMap((input) => [
      endingOf(() => tokenizeCsv(input as string)),
      endingOf(() => parseCsv(input as string)),
    ]);

    expect([...new Set(endings)]).toEqual([ANSWERED]);
  });
});

// ---------------------------------------------------------------------------
// Malformed and awkward input
// ---------------------------------------------------------------------------

describe('tokenizeCsv — shapes no well-formed file holds', () => {
  for (const entry of AUTHORED_READINGS) {
    it(`reads ${entry.describes}`, () => {
      expect(tokenizeCsv(entry.text)).toEqual(entry.records);
    });
  }
});

describe('tokenizeCsv — input that is not text', () => {
  for (const entry of COERCED_READINGS) {
    it(`reads ${entry.describes}`, () => {
      expect(tokenizeCsv(entry.value as string)).toEqual(entry.records);
    });
  }
});

describe('parseCsv — headers that key a row badly', () => {
  // A header naming one column twice leaves the row holding the LAST
  // of them, because the row is built by assigning into an object one
  // column at a time. Pinned rather than repaired: the parity suite
  // is the gate that decides whether the port landed.
  it('keeps the last cell when a header names one column twice', () => {
    expect(parseCsv('station,station\nalpha,bravo\n'))
      .toEqual([{ station: 'bravo' }]);
  });

  // The one column this reader drops without saying so. Assigning
  // `__proto__` on a plain object goes through the prototype setter
  // instead of creating a key, so the cell has nowhere to land and
  // nothing reports it. The repair is real and obvious — a
  // null-prototype row object — and it belongs to the phase that owns
  // the callers, because making it here would fail the parity gate.
  it('drops a __proto__ column silently, which is the one gap', () => {
    const rows = parseCsv('__proto__,note\nalpha,dry\n');

    expect(rows.map((row) => Object.keys(row))).toEqual([['note']]);
  });

  // An empty header cell is a name like any other: it is what a
  // trailing delimiter on the header row leaves behind, and a reader
  // that skipped it would silently lose a column somebody exported.
  it('keys a column the header left unnamed', () => {
    expect(parseCsv('station,\nalpha,dry\n'))
      .toEqual([{ station: 'alpha', '': 'dry' }]);
  });
});

// ---------------------------------------------------------------------------
// The corpus, both readings
// ---------------------------------------------------------------------------

describe('tokenizeCsv — the shared corpus', () => {
  for (const entry of CORPUS_READINGS) {
    it(`finds every record in ${entry.id}`, () => {
      const fixture = fixtureById(DELIMITED_RECORD_FIXTURES, entry.id);

      expect(tokenizeCsv(fixture.text)).toEqual(entry.records);
    });
  }
});

describe('parseCsv — the shared corpus', () => {
  for (const entry of CORPUS_READINGS) {
    it(`keys every row in ${entry.id}`, () => {
      const fixture = fixtureById(DELIMITED_RECORD_FIXTURES, entry.id);

      expect(parseCsv(fixture.text)).toEqual(entry.rows);
    });
  }

  // The distinction every numeric signal downstream is built on,
  // surviving the one place a reader is most tempted to be helpful. A
  // gauge that measured no rainfall wrote `0` and a gauge that was
  // offline wrote nothing, and both arrive here as text so the caller
  // that knows the column decides what each means.
  it('keeps a measured zero and an unmeasured cell apart', () => {
    const fixture = fixtureById(DELIMITED_RECORD_FIXTURES, 'csv-simple');
    const rows = parseCsv(fixture.text);

    expect(rows.map((row) => row.rainfall_mm)).toEqual(['0', '']);
  });

  // Squaring is against the HEADER rather than against the widest
  // row, which is what lets a caller read a column without asking
  // whether this particular row had it.
  it('pads a short row and truncates a long one to the header', () => {
    const fixture = fixtureById(DELIMITED_RECORD_FIXTURES, 'csv-ragged');
    const rows = parseCsv(fixture.text);

    expect(rows.map((row) => Object.keys(row)))
      .toEqual([
        ['station', 'rainfall_mm', 'note'],
        ['station', 'rainfall_mm', 'note'],
      ]);
  });

  // Two documents with nothing under a header are one answer, and
  // deliberately: both mean nobody wrote a row. A caller that needs to
  // tell them apart has the tokenizer, which does.
  it('reads an empty document and a header-only one alike', () => {
    const corpus = DELIMITED_RECORD_FIXTURES;
    const headerOnly = fixtureById(corpus, 'csv-header-only');
    const empty = fixtureById(corpus, 'csv-empty');

    expect(parseCsv(headerOnly.text)).toEqual(parseCsv(empty.text));
    expect(tokenizeCsv(headerOnly.text).length)
      .not.toBe(tokenizeCsv(empty.text).length);
  });
});
