/**
 * Cases for `src/lib/yaml-lite.ts`: what the subset refuses, and the
 * reading those refusals bound.
 *
 * The refusals come first and take up most of the file, which is the
 * shape this library in particular asks for. Its whole argument is
 * that a reader shrugging at a construct it does not understand turns
 * an operator's typo into a silently shortened list — so a parser that
 * accepted everything would satisfy every well-formed case here and
 * fail the library's actual contract. Each refusal is pinned to the
 * WHOLE sentence it reports, prefix included, rather than to the fact
 * that something was thrown: sixteen guards stand between a document
 * and a value, and a case reading only that a throw arrived passes for
 * any of them.
 *
 * The corpus refusals are driven off `tests/parity/fixtures.ts` rather
 * than off a list written here, because the same entries drive the
 * parity suite and two lists that agree until somebody edits one is
 * exactly what that arrangement avoids. Which of those entries are
 * refusals is not guessed either: the corpus labels them, and the two
 * tables below are held set-equal against that labelling, so an entry
 * added there fails HERE naming itself instead of going undriven.
 *
 * The rest of the refusals are authored in this file, and they are the
 * ones the corpus has no entry for — the inline-map faults, the key
 * shape, and the two orphan lines. The corpus is a shared neutral
 * corpus rather than this library's exhaustive fault list, so
 * completeness lives here and the shared entries stay shared.
 *
 * Three claims sit outside both tables because no single document
 * makes them. The file label is a prefix rather than a message of its
 * own, so one document is refused twice — labelled and bare — and the
 * two messages are held against each other. Line numbers are the
 * ORIGINAL ones, so a fault below blank and comment-only lines has to
 * report the number an editor shows rather than its position among
 * the lines that survived filtering. And the two exports the document
 * parser is built out of are driven directly, since a document only
 * ever reaches them through text it happens to hold.
 */
import type { YamlDocument } from '../../src/lib/yaml-lite.js';

import { describe, expect, it } from 'vitest';

import {
  parseYamlLite,
  parseYamlScalar,
  stripYamlComment,
} from '../../src/lib/yaml-lite.js';
import { fixtureById, STRUCTURED_TEXT_FIXTURES } from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// Reading a refusal
// ---------------------------------------------------------------------------

/** The label every case here parses under, so a prefix is testable. */
const FILE_LABEL = 'sample.yaml';

/** What {@link refusalOf} answers for a call that returned instead. */
const NOTHING_THROWN = '<nothing was thrown>';

/**
 * The whole sentence a call was refused with.
 *
 * Answers a string in every case, including the two that are
 * themselves failures — a call that returned, and a throw that was
 * not an `Error`. Both then read as an ordinary string mismatch
 * naming what happened, where a bare `toThrow` would report the first
 * as a missing throw and swallow the second entirely.
 *
 * @param run - The call under test.
 * @returns Its refusal message, or a description of what it did
 * instead.
 */
function refusalOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error
      ? error.message
      : `threw a non-Error: ${String(error)}`;
  }

  return NOTHING_THROWN;
}

// ---------------------------------------------------------------------------
// The shared corpus, split the way it labels itself
// ---------------------------------------------------------------------------

/** How the corpus marks an entry it expects to be turned away. */
const REFUSED_PREFIX = 'refused: ';

/** Corpus ids the corpus itself labels as refusals, sorted. */
function corpusRefusedIds(): string[] {
  return STRUCTURED_TEXT_FIXTURES
    .filter((fixture) => fixture.describes.startsWith(REFUSED_PREFIX))
    .map((fixture) => fixture.id)
    .sort();
}

/** Corpus ids it does not, sorted. */
function corpusAcceptedIds(): string[] {
  return STRUCTURED_TEXT_FIXTURES
    .filter((fixture) => !fixture.describes.startsWith(REFUSED_PREFIX))
    .map((fixture) => fixture.id)
    .sort();
}

/** Sorted copy, so an equality is over members rather than order. */
function sorted(ids: readonly string[]): string[] {
  return [...ids].sort();
}

/** One corpus entry this library refuses, and the sentence it uses. */
interface CorpusRefusal {
  /** The entry, by its id in the corpus. */
  readonly id: string;

  /** The whole message, label and line included. */
  readonly message: string;
}

/**
 * Every corpus entry outside the subset, and what each is told.
 *
 * Held set-equal against the corpus's own labelling below, so an
 * entry added there is driven rather than quietly skipped.
 */
const CORPUS_REFUSALS: readonly CorpusRefusal[] = [
  {
    id: 'structured-tab-indent',
    message: `${FILE_LABEL} line 2: a tab may not be used for `
      + 'indentation (use spaces)',
  },
  {
    id: 'structured-deep-nesting',
    message: `${FILE_LABEL} line 2: only one level of nesting is `
      + 'supported (key "coastal" has no value)',
  },
  {
    id: 'structured-mixed-block',
    message: `${FILE_LABEL} line 3: a block is either a map or a `
      + 'list, never both',
  },
  {
    id: 'structured-duplicate-key',
    message: `${FILE_LABEL} line 2: duplicate key "network"`,
  },
  {
    id: 'structured-unterminated-quote',
    message: `${FILE_LABEL} line 1: unterminated double-quoted string`,
  },
  {
    id: 'structured-block-scalar',
    message: `${FILE_LABEL} line 1: block scalars (| and >) are `
      + 'outside the supported subset',
  },
  {
    id: 'structured-flow-sequence',
    message: `${FILE_LABEL} line 1: flow sequences are outside the `
      + 'supported subset; use "- " list items',
  },
];

// ---------------------------------------------------------------------------
// The refusals the corpus has no entry for
// ---------------------------------------------------------------------------

/** One document authored here, and the sentence it is turned away with. */
interface AuthoredRefusal {
  /** What the document is wrong about, in one line. */
  readonly describes: string;

  /** The document. */
  readonly text: string;

  /** The whole message, label and line included. */
  readonly message: string;
}

/**
 * The faults the shared corpus carries no entry for.
 *
 * Every one of them sits inside an inline map, in a key, or on a line
 * with no parent — shapes the corpus has no reason to hold, since it
 * is driven by three other parsers besides this one.
 */
const AUTHORED_REFUSALS: readonly AuthoredRefusal[] = [
  {
    describes: 'an indented line with nothing above it to belong to',
    text: '  network: coastal',
    message: `${FILE_LABEL} line 1: indented line has no parent key`,
  },
  {
    describes: 'a line that is not a pair at all',
    text: 'network',
    message: `${FILE_LABEL} line 1: expected "key: value"`,
  },
  {
    describes: 'a second document marker, which is not a leading one',
    text: ['network: coastal', '---', 'label: upland'].join('\n'),
    message: `${FILE_LABEL} line 2: expected "key: value"`,
  },
  {
    describes: 'a key holding a character the subset does not admit',
    text: '!network: coastal',
    message: `${FILE_LABEL} line 1: unsupported key "!network" `
      + '(letters, digits, _ . - and spaces only)',
  },
  {
    describes: 'an anchor, which is outside the subset',
    text: 'network: &coastal',
    message: `${FILE_LABEL} line 1: anchors, aliases and tags are `
      + 'outside the supported subset',
  },
  {
    describes: 'an inline map where a value goes, rather than in a list',
    text: 'limits: {low: 0}',
    message: `${FILE_LABEL} line 1: an inline {k: v} map is only `
      + 'supported as a "- " list item',
  },
  {
    describes: 'a list item with nothing after the dash',
    text: ['stations:', '  - alpha', '  -'].join('\n'),
    message: `${FILE_LABEL} line 3: an empty list item is outside `
      + 'the supported subset',
  },
  {
    describes: 'a list item that is a nested map rather than a scalar',
    text: ['gauges:', '  - id: alpha'].join('\n'),
    message: `${FILE_LABEL} line 2: a list item is a scalar or an `
      + 'inline {k: v} map, not a nested map',
  },
  {
    describes: 'an inline map that never closes',
    text: ['gauges:', '  - {id: alpha'].join('\n'),
    message: `${FILE_LABEL} line 2: an inline map must open with { `
      + 'and close with } on the same line',
  },
  {
    describes: 'an inline map holding another one',
    text: ['gauges:', '  - { id: { name: alpha } }'].join('\n'),
    message: `${FILE_LABEL} line 2: nested inline maps are outside `
      + 'the supported subset',
  },
  {
    describes: 'an inline map with a comma and no field between',
    text: ['gauges:', '  - { id: alpha, , rainfall: 0 }'].join('\n'),
    message: `${FILE_LABEL} line 2: empty field in an inline map`,
  },
  {
    describes: 'an inline map field that is not a pair',
    text: ['gauges:', '  - { id }'].join('\n'),
    message: `${FILE_LABEL} line 2: inline map field "id" is not `
      + '"key: value"',
  },
  {
    describes: 'an inline map assigning one key twice',
    text: ['gauges:', '  - { id: alpha, id: bravo }'].join('\n'),
    message: `${FILE_LABEL} line 2: duplicate key "id"`,
  },
  {
    describes: 'an inline map key the subset does not admit',
    text: ['gauges:', '  - { !id: alpha }'].join('\n'),
    message: `${FILE_LABEL} line 2: unsupported key "!id" `
      + '(letters, digits, _ . - and spaces only)',
  },
  {
    describes: 'a block line narrower than the block it is inside',
    text: ['limits:', '   low: 0', '  high: 250'].join('\n'),
    message: `${FILE_LABEL} line 3: inconsistent indentation `
      + '(expected 3 spaces)',
  },
  {
    describes: 'a key inside a block that owns a block of its own',
    text: ['limits:', '  low:', '  high: 250'].join('\n'),
    message: `${FILE_LABEL} line 2: only one level of nesting is `
      + 'supported (key "low" has no value)',
  },
];

// ---------------------------------------------------------------------------
// What the corpus documents inside the subset read to
// ---------------------------------------------------------------------------

/** One corpus entry this library reads, and what it reads to. */
interface CorpusReading {
  /** The entry, by its id in the corpus. */
  readonly id: string;

  /** The whole document it produces. */
  readonly document: YamlDocument;
}

/**
 * Every corpus entry inside the subset, and the document it becomes.
 *
 * Whole documents rather than spot checks on a key or two: a reading
 * is only a reading if nothing else came back with it, and a parser
 * that dropped a line would satisfy any number of per-key claims.
 */
const CORPUS_READINGS: readonly CorpusReading[] = [
  {
    id: 'structured-scalars',
    document: {
      network: 'coastal',
      label: 'a quoted value, with a comma',
      readings: 0,
      offline: null,
      elevation: -12.5,
      active: true,
      retired: false,
      tilde: null,
      bare: 'a bare value keeps its colons: like this one',
      nothing: null,
    },
  },
  {
    id: 'structured-blocks',
    document: {
      stations: ['alpha', 'bravo'],
      gauges: [
        { id: 'alpha', rainfall: 0 },
        { id: 'bravo', rainfall: null },
      ],
      limits: { low: 0, high: 250 },
      retired: [],
      notes: {},
    },
  },
  {
    id: 'structured-comments',
    document: {
      network: 'coastal',
      label: 'a # inside quotes is not a comment',
    },
  },
  {
    id: 'structured-empty',
    document: {},
  },
];

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

describe('parseYamlLite — the guard over the tables below', () => {
  // Every case in this file walks one of the two corpus tables, and a
  // walk over a table that lost an entry passes without reading it.
  // So the split is held against the corpus's own labelling rather
  // than against a count: an entry added there lands in exactly one
  // of these two sets, and lands in neither table until somebody puts
  // it there.
  it('drives every corpus entry, on the side the corpus labels it', () => {
    expect(sorted(CORPUS_REFUSALS.map((entry) => entry.id)))
      .toEqual(corpusRefusedIds());
    expect(sorted(CORPUS_READINGS.map((entry) => entry.id)))
      .toEqual(corpusAcceptedIds());
  });

  // The authored table is walked the same way and has no corpus to be
  // held against, so its guard is that it is not empty and that no
  // entry describes the same fault twice.
  it('authors a fault list with no empty and no repeated entry', () => {
    const described = AUTHORED_REFUSALS.map((entry) => entry.describes);

    expect(described.length).toBeGreaterThan(0);
    expect(sorted([...new Set(described)])).toEqual(sorted(described));
  });
});

describe('parseYamlLite — documents outside the subset', () => {
  for (const entry of CORPUS_REFUSALS) {
    it(`refuses ${entry.id} naming the line it went wrong on`, () => {
      const fixture = fixtureById(STRUCTURED_TEXT_FIXTURES, entry.id);

      expect(refusalOf(() => parseYamlLite(fixture.text, { file: FILE_LABEL })))
        .toBe(entry.message);
    });
  }

  for (const entry of AUTHORED_REFUSALS) {
    it(`refuses ${entry.describes}`, () => {
      expect(refusalOf(() => parseYamlLite(entry.text, { file: FILE_LABEL })))
        .toBe(entry.message);
    });
  }
});

describe('parseYamlLite — what a refusal says about where', () => {
  /** One document, refused twice: labelled, and with no label. */
  const DUPLICATED_KEY = ['network: coastal', 'network: upland'].join('\n');

  // The label is a prefix and nothing else, so the two messages differ
  // by exactly it. Asserting both halves is what separates a prefix
  // from a second message keyed on whether a label was supplied.
  it('opens with the file it was told about, when it was told one', () => {
    expect(refusalOf(() => parseYamlLite(DUPLICATED_KEY, { file: FILE_LABEL })))
      .toBe(`${FILE_LABEL} line 2: duplicate key "network"`);
  });

  it('names the line alone when no file was supplied', () => {
    expect(refusalOf(() => parseYamlLite(DUPLICATED_KEY)))
      .toBe('line 2: duplicate key "network"');
  });

  // The number an editor shows, not the position among the lines that
  // carried structure. Every blank and comment line above the fault is
  // one the walk has already dropped, so a parser numbering its own
  // filtered list would report line 2 here.
  it('counts blank and comment lines the walk itself drops', () => {
    const document = [
      '# the network this document configures',
      '',
      '   ',
      '# and a second comment',
      'network: coastal',
      'network: upland',
    ].join('\n');

    expect(refusalOf(() => parseYamlLite(document, { file: FILE_LABEL })))
      .toBe(`${FILE_LABEL} line 6: duplicate key "network"`);
  });
});

// ---------------------------------------------------------------------------
// Documents inside the subset
// ---------------------------------------------------------------------------

describe('parseYamlLite — documents inside the subset', () => {
  for (const entry of CORPUS_READINGS) {
    it(`reads ${entry.id} whole`, () => {
      const fixture = fixtureById(STRUCTURED_TEXT_FIXTURES, entry.id);

      expect(parseYamlLite(fixture.text, { file: FILE_LABEL }))
        .toEqual(entry.document);
    });
  }

  // The distinction every numeric signal downstream is built on, made
  // here first. A gauge that measured no rainfall and a gauge that was
  // never read are two answers, and a parser collapsing them loses the
  // one that matters.
  it('reads a measured zero and an unmeasured value as two things', () => {
    const document = parseYamlLite('readings: 0\noffline:\nabsent: null');

    expect(document.readings).toBe(0);
    expect(document.offline).toBeNull();
    expect(document.absent).toBeNull();
  });

  // A key with no value and nothing indented under it holds null
  // rather than an empty map, which is the difference between "the
  // operator wrote nothing here" and "the operator wrote an empty
  // block here".
  it('reads a key with nothing under it as null, not as a block', () => {
    expect(parseYamlLite('limits:\nnetwork: coastal'))
      .toEqual({ limits: null, network: 'coastal' });
  });

  // A leading marker is tolerated so a file written by somebody used
  // to full YAML reads the same as one without it. The corpus entry
  // covers a document that opens with one; this covers the pair.
  it('reads the same document with and without a leading marker', () => {
    const withMarker = ['---', 'network: coastal'].join('\n');

    const plain = parseYamlLite('network: coastal');

    expect(parseYamlLite(withMarker)).toEqual(plain);
  });

  // `__proto__` passes the key check — it opens with an underscore —
  // and assigning it on a plain object goes through the prototype
  // setter rather than creating a key. So the one key in the whole
  // grammar this parser drops without saying so is this one. Pinned
  // rather than repaired: the port preserves the original's behaviour
  // and a parity run is the gate, so changing it is a decision for the
  // phase that owns the callers, not a quiet edit here.
  it('drops a __proto__ key silently, which is the one gap', () => {
    const assigned = parseYamlLite('__proto__: coastal');

    expect(Object.keys(assigned)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The scalar reader, driven directly
// ---------------------------------------------------------------------------

/** One scalar, and what the reader makes of it. */
interface ScalarReading {
  /** The text, exactly as a document would hold it. */
  readonly raw: string;

  /** What it reads to. */
  readonly value: unknown;
}

/** Every scalar form the subset admits, refusals excluded. */
const SCALAR_READINGS: readonly ScalarReading[] = [
  { raw: '', value: null },
  { raw: '   ', value: null },
  { raw: 'null', value: null },
  { raw: '~', value: null },
  { raw: '0', value: 0 },
  { raw: '12', value: 12 },
  { raw: '-12', value: -12 },
  { raw: '007', value: 7 },
  { raw: '1.5', value: 1.5 },
  { raw: '-1.5', value: -1.5 },
  { raw: '.5', value: 0.5 },
  { raw: '12.', value: 12 },
  { raw: 'true', value: true },
  { raw: 'false', value: false },
  { raw: 'True', value: 'True' },
  { raw: '0x10', value: '0x10' },
  { raw: '1e3', value: '1e3' },
  { raw: 'coastal', value: 'coastal' },
  { raw: 'a note: with a colon', value: 'a note: with a colon' },
  { raw: '\'0\'', value: '0' },
  { raw: '\'it\'\'s here\'', value: 'it\'s here' },
  { raw: '"a \\" mark"', value: 'a " mark' },
  { raw: '"a \\\\ mark"', value: 'a \\ mark' },
  { raw: '[]', value: [] },
  { raw: '{}', value: {} },
];

describe('parseYamlScalar — values outside the subset', () => {
  it('refuses a block scalar', () => {
    expect(refusalOf(() => parseYamlScalar('| folded', FILE_LABEL, 4)))
      .toBe(`${FILE_LABEL} line 4: block scalars (| and >) are `
        + 'outside the supported subset');
  });

  it('refuses an alias', () => {
    expect(refusalOf(() => parseYamlScalar('*coastal', FILE_LABEL, 4)))
      .toBe(`${FILE_LABEL} line 4: anchors, aliases and tags are `
        + 'outside the supported subset');
  });

  it('refuses a flow sequence carrying entries', () => {
    expect(refusalOf(() => parseYamlScalar('[a, b]', FILE_LABEL, 4)))
      .toBe(`${FILE_LABEL} line 4: flow sequences are outside the `
        + 'supported subset; use "- " list items');
  });

  it('refuses a quoted value that never closes', () => {
    expect(refusalOf(() => parseYamlScalar('\'coastal', FILE_LABEL, 4)))
      .toBe(`${FILE_LABEL} line 4: unterminated single-quoted string`);
  });
});

describe('parseYamlScalar — values inside it', () => {
  // Walked as one case with a mapped list rather than one case per
  // row, so a form that read to something else names itself beside
  // the whole table instead of failing alone.
  it('reads every admitted form as the value it stands for', () => {
    const read = SCALAR_READINGS.map((entry) => ({
      raw: entry.raw,
      value: parseYamlScalar(entry.raw, FILE_LABEL, 1),
    }));

    expect(read).toEqual([...SCALAR_READINGS]);
  });

  // A quoted number stays a string, which is the reason quoting is
  // read before any number is attempted.
  it('leaves a quoted number quoted', () => {
    expect(parseYamlScalar('\'0\'', FILE_LABEL, 1)).toBe('0');
    expect(parseYamlScalar('0', FILE_LABEL, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The comment stripper, driven directly
// ---------------------------------------------------------------------------

/** One line, and what is left of it once a comment is cut. */
interface CommentReading {
  /** What the line stands for. */
  readonly describes: string;

  /** The line, raw. */
  readonly line: string;

  /** What survives. */
  readonly kept: string;
}

/** Every rule the hash follows, one line each. */
const COMMENT_READINGS: readonly CommentReading[] = [
  {
    describes: 'a whole-line comment',
    line: '# the network this document configures',
    kept: '',
  },
  {
    describes: 'an indented whole-line comment',
    line: '   # indented',
    kept: '   ',
  },
  {
    describes: 'a trailing comment after whitespace',
    line: 'network: coastal   # a trailing comment',
    kept: 'network: coastal   ',
  },
  {
    describes: 'a hash inside a word, which is part of the value',
    line: 'station: north#2',
    kept: 'station: north#2',
  },
  {
    describes: 'a hash inside double quotes',
    line: 'label: "a # inside quotes"',
    kept: 'label: "a # inside quotes"',
  },
  {
    describes: 'a hash inside single quotes',
    line: 'label: \'a # inside quotes\'',
    kept: 'label: \'a # inside quotes\'',
  },
  {
    describes: 'a line with no hash at all',
    line: 'network: coastal',
    kept: 'network: coastal',
  },
  {
    describes: 'several hashes, none of them after whitespace',
    line: 'a#b#c',
    kept: 'a#b#c',
  },
  {
    describes: 'a hash after whitespace, with more hashes behind it',
    line: 'a #b#c',
    kept: 'a ',
  },
];

describe('stripYamlComment', () => {
  it('is driven over a line for every rule the hash follows', () => {
    const described = COMMENT_READINGS.map((entry) => entry.describes);

    expect(sorted([...new Set(described)])).toEqual(sorted(described));
  });

  it('cuts a comment and leaves everything else alone', () => {
    const read = COMMENT_READINGS.map((entry) => ({
      describes: entry.describes,
      line: entry.line,
      kept: stripYamlComment(entry.line),
    }));

    expect(read).toEqual([...COMMENT_READINGS]);
  });
});
