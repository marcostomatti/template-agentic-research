/**
 * Cases for `src/lib/parser-config.ts` and `src/lib/markup-select.ts`
 * driven TOGETHER, over the neutral corpus in
 * `tests/parity/fixtures.ts`.
 *
 * The two modules cannot import each other — the splice rule forbids
 * a library reaching another one — so the engine takes its markup
 * step as an injected function and the pairing happens at a call
 * site. That call site is what this file is about. Each module has
 * its own unit file beside this one and neither can say anything
 * about the seam: `parser-config` is driven there over a stub step,
 * and `markup-select` is driven with no engine in sight.
 *
 * ## The corpus is the input, and authoring it is not this file's job
 *
 * Every document below comes from `tests/parity/fixtures.ts`, which
 * is where a neutral document belongs: authored once, driven by the
 * parity legs and by the unit suites, and carrying nobody real by
 * construction rather than by review. A fixture added there joins
 * this run without anybody editing this file, and the guards in the
 * first section are what make that true rather than merely likely.
 *
 * ## What a divergence means here, and what names it
 *
 * The engine does not parse an indented document or a delimited
 * record — it reads a payload, and a contract judges the reading. So
 * a corpus entry is driven as the BODY of a payload, and the contract
 * carries one member per rule a well-formed document of that corpus
 * satisfies. A refusal entry then diverges on exactly ONE member,
 * which is that roster's own promise — each refused entry carries
 * exactly one fault — turned into an assertion: the contract answers
 * one sentence, and that sentence names the rule the fault broke.
 *
 * That is also why every field of a text corpus reads the same path.
 * A contract judges MEMBERS, so a source whose document is one blob
 * of text declares one member per rule it wants named; what differs
 * between them is the contract pattern rather than where the value
 * came from.
 *
 * ## Four guards keep the pairing from going quiet
 *
 * Every entry the corpus marks refused must be declared here, every
 * declared id must resolve through `fixtureById` (which refuses
 * rather than answering `undefined`), every rule must be broken by at
 * least one entry, and no undeclared entry may diverge. Without the
 * first, a refusal fixture added later is driven and never checked.
 * Without the third, a rule nothing breaks is a dead needle passing
 * for coverage.
 *
 * ## The sentences are written out here, never read off the module
 *
 * A suite reading `documents.parse_error` wording off the module
 * would agree with any edit to it, which is the one thing an operator
 * reading that column at a glance cannot afford. Two shapes are used
 * and both are built below.
 *
 * ## The injected step is watched rather than only called
 *
 * `markupSelect` is typed to take text, and the engine promises to
 * hand it nothing else however hostile the payload. The adversarial
 * section drives every `ADVERSARIAL_VALUES` entry into the markup
 * position through a recording step and reads what the engine
 * actually passed — the ids that reached it are declared, so the
 * conversion boundary is pinned from both sides rather than asserted
 * from one.
 *
 * No word in this file is a term, a field or a source any domain
 * would use. The documents are bulletins about rainfall, which is the
 * shared corpus's subject and no domain's.
 */
import type {
  ContractField,
  FieldRule,
  MarkupSelect,
  ParseDeps,
  ParsedRecord,
  ParserConfig,
  SourceContract,
} from '../../src/lib/parser-config.js';
import type { TextFixture } from '../parity/fixtures.js';

import { describe, expect, it } from 'vitest';

import { markupSelect } from '../../src/lib/markup-select.js';
import {
  contractErrors,
  extractRecords,
  parserConfigErrors,
} from '../../src/lib/parser-config.js';
import {
  ADVERSARIAL_VALUES,
  DELIMITED_RECORD_FIXTURES,
  MARKUP_FIXTURES,
  STRUCTURED_TEXT_FIXTURES,
  fixtureById,
} from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// What a corpus declares
// ---------------------------------------------------------------------------

/** One rule every well-formed document of a corpus satisfies. */
interface ShapeRule {
  /** The contract member the rule is checked as. */
  readonly member: string;

  /** What the rule says, in one line. */
  readonly describes: string;

  /** What a correct reading looks like, as a stored pattern. */
  readonly pattern: string;
}

/** The one field of a text corpus that captures rather than checks. */
interface CaptureRule {
  /** The record member the capture lands in. */
  readonly member: string;

  /** What it reads out of the document, in one line. */
  readonly describes: string;

  /** The stored expression, whose group 1 is the reading. */
  readonly pattern: string;

  /** The fixture ids the capture is taken from, and no others. */
  readonly readIn: readonly string[];
}

/** One fixture that diverges, and the single rule its fault breaks. */
interface Divergence {
  /** The fixture id, which `fixtureById` refuses to guess at. */
  readonly id: string;

  /** The one member the divergence is named by. */
  readonly member: string;
}

/** One corpus driven through the engine with no markup step needed. */
interface TextCorpus {
  /** What a failing case prints in place of the roster. */
  readonly name: string;

  /** The shared roster, read from `tests/parity/fixtures.ts`. */
  readonly fixtures: readonly TextFixture[];

  /** One rule per fault the roster plants. */
  readonly rules: readonly ShapeRule[];

  /** The field proving the capture step ran over real documents. */
  readonly capture: CaptureRule;

  /** Every entry expected to diverge, and on what. */
  readonly diverging: readonly Divergence[];
}

// ---------------------------------------------------------------------------
// The sentences a contract answers with
// ---------------------------------------------------------------------------

/**
 * What a member failing its declared pattern reads as.
 *
 * Written out rather than imported, for the reason the header gives.
 * The site is the member name because every name below is one the
 * engine can quote; a name it cannot bound is reported by position
 * instead, which is a rule `tests/lib/parser-config.test.ts` owns.
 *
 * @param member - The contract member.
 * @returns The whole sentence.
 */
function patternFault(member: string): string {
  return `member ${member} does not match the declared pattern`;
}

/**
 * What a member the contract requires and the reading did not take
 * reads as.
 *
 * The second of the two shapes this file expects. A `null` member
 * stops at `required`, so a divergence reported this way is one
 * sentence and not three.
 *
 * @param member - The contract member.
 * @returns The whole sentence.
 */
function requiredFault(member: string): string {
  return `member ${member} is required and no value was read`;
}

/** How the shared corpus marks an entry it expects to be refused. */
const REFUSAL_MARKER = 'refused: ';

// ---------------------------------------------------------------------------
// The indented-document corpus
// ---------------------------------------------------------------------------

/**
 * One rule per fault `STRUCTURED_TEXT_FIXTURES` plants.
 *
 * Each pattern states what a correct reading looks like, so a
 * document breaking it is a source whose shape has drifted rather
 * than a parser refusing to run. They are written as whole-document
 * patterns and most of them negatively — a rule saying no line does X
 * reads far better than the positive grammar that would exclude X,
 * and the contract column holds data rather than a program.
 *
 * None of them is compiled with the multiline flag, because
 * `compileCapture` compiles with no flags but the unicode one. A line
 * start is therefore spelled as a newline, which is also why the
 * first line of a document is outside every rule that opens with one.
 */
const STRUCTURED_RULES: readonly ShapeRule[] = [
  {
    member: 'indentation',
    describes: 'no line is indented with a tab',
    pattern: '^[^\\t]*$',
  },
  {
    member: 'nesting',
    describes: 'no line is indented past the one level allowed',
    pattern: '^(?![\\s\\S]*\\n {4})[\\s\\S]*$',
  },
  {
    member: 'blockKind',
    describes: 'no indented list item is followed by an indented pair',
    pattern: [
      '^(?![\\s\\S]*',
      // An indented list item, then the next line indented into a
      // pair: the two-line window one block cannot hold both of.
      '\\n {2}-[^\\n]*\\n {2}[A-Za-z_]',
      ')[\\s\\S]*$',
    ].join(''),
  },
  {
    member: 'assignment',
    describes: 'no key at the left margin is assigned twice',
    pattern: [
      '^(?![\\s\\S]*',
      // A key at a line start, and the same key at a later one.
      '(?:^|\\n)([A-Za-z][A-Za-z0-9_]*):[\\s\\S]*\\n\\1:',
      ')[\\s\\S]*$',
    ].join(''),
  },
  {
    member: 'quoting',
    describes: 'every quote opens and closes on one line',
    pattern: '^(?:[^"]|"[^"\\n]*")*$',
  },
  {
    member: 'scalarForm',
    describes: 'no value opens a block scalar',
    pattern: '^(?![\\s\\S]*: *[|>]\\n)[\\s\\S]*$',
  },
  {
    member: 'sequenceForm',
    describes: 'no value opens a flow sequence with entries in it',
    pattern: '^(?![\\s\\S]*: *\\[ *[^\\]\\s])[\\s\\S]*$',
  },
];

/** The indented-document corpus, as this file drives it. */
const STRUCTURED_CORPUS: TextCorpus = {
  name: 'indented documents',
  fixtures: STRUCTURED_TEXT_FIXTURES,
  rules: STRUCTURED_RULES,
  capture: {
    member: 'network',
    describes: 'the value of the key three entries assign',
    pattern: '(?:^|\\n)network: ?([a-z]+)',
    readIn: [
      'structured-scalars',
      'structured-comments',
      'structured-duplicate-key',
    ],
  },
  diverging: [
    { id: 'structured-tab-indent', member: 'indentation' },
    { id: 'structured-deep-nesting', member: 'nesting' },
    { id: 'structured-mixed-block', member: 'blockKind' },
    { id: 'structured-duplicate-key', member: 'assignment' },
    { id: 'structured-unterminated-quote', member: 'quoting' },
    { id: 'structured-block-scalar', member: 'scalarForm' },
    { id: 'structured-flow-sequence', member: 'sequenceForm' },
  ],
};

// ---------------------------------------------------------------------------
// The delimited-record corpus
// ---------------------------------------------------------------------------

/**
 * One rule per fault `DELIMITED_RECORD_FIXTURES` plants.
 *
 * Two rather than seven, and that is the roster rather than a gap:
 * most entries there are shapes a tokenizer has to READ — a quoted
 * delimiter, an embedded record separator, a leading mark — and only
 * two are documents whose shape has drifted from what the header
 * promises. Both rules step over any line carrying a quote, which is
 * what keeps the field-count rule off the entries whose fields
 * legitimately hold commas and newlines.
 */
const DELIMITED_RULES: readonly ShapeRule[] = [
  {
    member: 'columnCount',
    describes: 'every unquoted row after the header carries three fields',
    pattern: [
      '^(?![\\s\\S]*\\n',
      // A line holding a quote is the tokenizer business, not this
      // rule: its fields can span commas and newlines both.
      '(?![^\\n]*")',
      // Three comma-separated fields and then the line ends.
      '(?![^,\\n]*,[^,\\n]*,[^,\\n]*(?:\\n|$))',
      // A blank line carries no row, so it breaks nothing.
      '[^\\n]+)[\\s\\S]*$',
    ].join(''),
  },
  {
    member: 'quoting',
    describes: 'every quoted field closes, doubling the quotes it holds',
    pattern: '^(?:[^"]|"(?:[^"]|"")*")*$',
  },
];

/** The delimited-record corpus, as this file drives it. */
const DELIMITED_CORPUS: TextCorpus = {
  name: 'delimited records',
  fixtures: DELIMITED_RECORD_FIXTURES,
  rules: DELIMITED_RULES,
  capture: {
    member: 'firstStation',
    describes: 'the first column of the first row under the header',
    pattern: '\\n([a-z]+),',
    readIn: [
      'csv-simple',
      'csv-quoted-comma',
      'csv-embedded-newline',
      'csv-doubled-quote',
      'csv-ragged',
      'csv-crlf',
      'csv-byte-order-mark',
      'csv-blank-lines',
      'csv-unterminated-quote',
    ],
  },
  diverging: [
    { id: 'csv-ragged', member: 'columnCount' },
    { id: 'csv-unterminated-quote', member: 'quoting' },
  ],
};

/** Both corpora the engine reads with no markup step in the way. */
const TEXT_CORPORA: readonly TextCorpus[] = [
  STRUCTURED_CORPUS,
  DELIMITED_CORPUS,
];

// ---------------------------------------------------------------------------
// The markup corpus, which needs both modules
// ---------------------------------------------------------------------------

/** The record member a single fragment lands in. */
const PARAGRAPH = 'paragraph';

/** The record member every fragment lands in. */
const PARAGRAPHS = 'paragraphs';

/** What both markup fields ask the injected step for. */
const PARAGRAPH_SELECTOR = 'p';

/**
 * The one config needing the pair.
 *
 * Two fields over the same selector, differing only in `type`: a
 * `list` keeps every fragment and everything else reads the first.
 * That is the one place a coercion reaches back into an earlier step,
 * and driving both here is what lets a case hold them against each
 * other over documents nobody wrote for the purpose.
 */
const MARKUP_CONFIG: ParserConfig = {
  recordsPath: 'items',
  fields: {
    [PARAGRAPH]: { path: 'html', selector: PARAGRAPH_SELECTOR },
    [PARAGRAPHS]: {
      path: 'html',
      selector: PARAGRAPH_SELECTOR,
      type: 'list',
    },
  },
};

/**
 * What a source answering markup promised.
 *
 * `required` rather than a pattern, because the divergence a markup
 * source actually has is a document that stopped carrying the element
 * the config selects. The type is declared beside it so the contract
 * says the whole of what it wants; a member read as nothing stops at
 * `required` and never reaches it.
 */
const MARKUP_CONTRACT: SourceContract = {
  fields: {
    [PARAGRAPH]: { required: true, type: 'text' },
  },
};

/**
 * The markup entries carrying no element the selector reaches.
 *
 * `MARKUP_FIXTURES` marks none of its entries refused, because the
 * two reductions it was authored for have to read every one of them.
 * Under a contract it splits anyway: three entries carry no
 * angle-bracket paragraph at all, and each of those is a source that
 * answered without answering what the config asks for.
 */
const MARKUP_DIVERGENCES: readonly Divergence[] = [
  { id: 'markup-plain', member: PARAGRAPH },
  { id: 'markdown-active-forms', member: PARAGRAPH },
  { id: 'markdown-plain', member: PARAGRAPH },
];

// ---------------------------------------------------------------------------
// Driving a corpus
// ---------------------------------------------------------------------------

/** Where a text corpus puts the one record a payload offers. */
const RECORDS_PATH = 'documents';

/** The member of that record every text-corpus field reads. */
const BODY_PATH = 'body';

/** Everything the engine needs that is not data, once. */
const MARKUP_DEPS: ParseDeps = { selectMarkup: markupSelect };

/**
 * A document, wrapped the way a source answers one.
 *
 * A list under a path rather than the bare record, so the records
 * path is exercised by every reading here instead of only by the
 * cases that went looking for it.
 *
 * @param text - The fixture document.
 * @returns The payload.
 */
function textPayload(text: string): unknown {
  return { [RECORDS_PATH]: [{ [BODY_PATH]: text }] };
}

/**
 * One rule, as the field that reads the member it checks.
 *
 * Named rather than written inline for width and for symmetry with
 * its sibling below: one rule becomes two entries under the same key
 * and naming both is what makes that pair visible. Nothing about the
 * types wants it — an inline arrow answering the array literal
 * infers the tuple from the call site and `Object.fromEntries` reads
 * it, measured by swapping this helper back out.
 *
 * @param rule - The rule.
 * @returns The field-map entry.
 */
function ruleField(rule: ShapeRule): [string, FieldRule] {
  return [rule.member, { path: BODY_PATH }];
}

/**
 * The same rule, as the contract member that checks it.
 *
 * @param rule - The rule.
 * @returns The contract entry.
 */
function ruleCheck(rule: ShapeRule): [string, ContractField] {
  return [rule.member, { pattern: rule.pattern }];
}

/**
 * The `parser_config` a text corpus is read under.
 *
 * One field per rule plus the capture field, all reading the same
 * path. See the header for why that is the shape rather than an
 * accident of the corpus.
 *
 * @param corpus - The corpus.
 * @returns The config, which the first case proves is usable.
 */
function configFor(corpus: TextCorpus): ParserConfig {
  const capture: [string, FieldRule] = [
    corpus.capture.member,
    { path: BODY_PATH, pattern: corpus.capture.pattern },
  ];

  return {
    recordsPath: RECORDS_PATH,
    fields: Object.fromEntries([...corpus.rules.map(ruleField), capture]),
  };
}

/**
 * The `contract` a text corpus is judged by.
 *
 * The capture field is deliberately outside it: a member no contract
 * names is a member no divergence can be attributed to, which is what
 * keeps the capture case and the divergence cases independent.
 *
 * @param corpus - The corpus.
 * @returns The contract.
 */
function contractFor(corpus: TextCorpus): SourceContract {
  return { fields: Object.fromEntries(corpus.rules.map(ruleCheck)) };
}

/** One fixture, read through the engine and judged by a contract. */
interface Reading {
  /** The one record the payload yielded. */
  readonly record: ParsedRecord;

  /** How many it yielded, which every corpus here makes one. */
  readonly count: number;

  /** Steps the engine could not take over this payload. */
  readonly warnings: readonly string[];

  /** Faults in the row itself, which no config here has. */
  readonly configErrors: readonly string[];

  /** What the contract made of the record. */
  readonly errors: readonly string[];
}

/**
 * One payload, all the way through both halves.
 *
 * Extraction and judgement in one call because the pair is the
 * subject: `extractRecords` decides what was read and
 * `contractErrors` decides whether that counts, and neither answer
 * means much alone.
 *
 * @param payload - Whatever the source answered.
 * @param config - The row.
 * @param contract - What the row promised.
 * @param deps - The markup step, where one is wanted.
 * @returns The record, the counts and both answers.
 */
function readThrough(
  payload: unknown,
  config: ParserConfig,
  contract: SourceContract,
  deps?: ParseDeps,
): Reading {
  const result = extractRecords(payload, config, deps);
  const record = result.records[0] ?? {};

  return {
    record,
    count: result.records.length,
    warnings: result.warnings,
    configErrors: result.configErrors,
    errors: contractErrors(record, contract),
  };
}

/**
 * One text-corpus fixture, read.
 *
 * No markup step is passed, which is a claim rather than an omission:
 * a text corpus states no selector, so a step supplied here would
 * never be reached and its absence proves the fields did not quietly
 * grow one.
 *
 * @param corpus - The corpus.
 * @param fixture - The document.
 * @returns The reading.
 */
function readText(corpus: TextCorpus, fixture: TextFixture): Reading {
  return readThrough(
    textPayload(fixture.text),
    configFor(corpus),
    contractFor(corpus),
  );
}

/**
 * One markup fixture, read through the pair.
 *
 * @param fixture - The document.
 * @param deps - The step, so a case can watch what it is handed.
 * @returns The reading.
 */
function readMarkup(fixture: TextFixture, deps: ParseDeps): Reading {
  return readThrough(
    { items: [{ html: fixture.text }] },
    MARKUP_CONFIG,
    MARKUP_CONTRACT,
    deps,
  );
}

/**
 * Whatever a `list` field left, as a list.
 *
 * @param value - The record member.
 * @returns Its members, or none.
 */
function fragmentsOf(value: unknown): readonly unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

/**
 * The divergence declared for a fixture, if one is.
 *
 * @param declared - The roster.
 * @param id - The fixture.
 * @returns Its entry, or nothing.
 */
function divergenceFor(
  declared: readonly Divergence[],
  id: string,
): Divergence | undefined {
  return declared.find((entry) => entry.id === id);
}

/**
 * A corpus, refusals first.
 *
 * The shared corpus files its refused entries last and says in its
 * own header that a suite should drive them FIRST: a reading that
 * accepted everything satisfies every well-formed entry, and only a
 * document that is supposed to be refused says whether anything was
 * read at all.
 *
 * @param fixtures - The roster.
 * @param declared - Every entry expected to diverge.
 * @returns The same entries, diverging ones first.
 */
function divergingFirst(
  fixtures: readonly TextFixture[],
  declared: readonly Divergence[],
): readonly TextFixture[] {
  const declares = (fixture: TextFixture): boolean => divergenceFor(
    declared,
    fixture.id,
  ) !== undefined;

  return [
    ...fixtures.filter(declares),
    ...fixtures.filter((fixture) => !declares(fixture)),
  ];
}

// ---------------------------------------------------------------------------
// The rosters pair with the corpora, or nothing below means anything
// ---------------------------------------------------------------------------

describe('parse engine roster — the refusal marker', () => {
  it('still finds the entries the shared corpus marks refused', () => {
    const marked = TEXT_CORPORA.flatMap((corpus) => corpus.fixtures
      .filter((fixture) => fixture.describes.startsWith(REFUSAL_MARKER))
      .map((fixture) => fixture.id));

    expect(marked.length).toBeGreaterThan(0);
  });
});

for (const corpus of TEXT_CORPORA) {
  describe(`parse engine roster — ${corpus.name}`, () => {
    it('names a fixture the corpus holds in every divergence', () => {
      const found = corpus.diverging
        .map((entry) => fixtureById(corpus.fixtures, entry.id).id);

      expect(found).toEqual(corpus.diverging.map((entry) => entry.id));
    });

    it('declares a divergence for every entry marked refused', () => {
      const undeclared = corpus.fixtures
        .filter((fixture) => fixture.describes.startsWith(REFUSAL_MARKER))
        .filter((fixture) => divergenceFor(
          corpus.diverging,
          fixture.id,
        ) === undefined)
        .map((fixture) => fixture.id);

      expect(undeclared).toEqual([]);
    });

    it('declares exactly the rules its own entries break', () => {
      const rules = corpus.rules
        .map((rule) => rule.member)
        .sort((left, right) => left.localeCompare(right));
      const broken = Array
        .from(new Set(corpus.diverging.map((entry) => entry.member)))
        .sort((left, right) => left.localeCompare(right));

      expect(broken).toEqual(rules);
    });

    it('reads every capture the corpus is declared to carry', () => {
      const found = corpus.capture.readIn
        .map((id) => fixtureById(corpus.fixtures, id).id);

      expect(found).toEqual([...corpus.capture.readIn]);
    });

    it('builds a config the engine will run', () => {
      expect(parserConfigErrors(configFor(corpus))).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// One document at a time, refusals first
// ---------------------------------------------------------------------------

for (const corpus of TEXT_CORPORA) {
  const ordered = divergingFirst(corpus.fixtures, corpus.diverging);

  describe(`parse engine readings — ${corpus.name}`, () => {
    for (const fixture of ordered) {
      const diverging = divergenceFor(corpus.diverging, fixture.id);
      const expected = diverging === undefined
        ? []
        : [patternFault(diverging.member)];
      const verdict = diverging === undefined
        ? 'holds'
        : `diverges on ${diverging.member}`;

      it(`${verdict}: ${fixture.id}`, () => {
        const reading = readText(corpus, fixture);

        expect(reading.configErrors).toEqual([]);
        expect(reading.count).toBe(1);
        expect(reading.warnings).toEqual([]);
        expect(reading.errors).toEqual(expected);
      });
    }

    it('takes the capture from exactly the entries that carry it', () => {
      const taken = corpus.fixtures
        .filter((fixture) => typeof readText(corpus, fixture)
          .record[corpus.capture.member] === 'string')
        .map((fixture) => fixture.id);

      expect(taken).toEqual([...corpus.capture.readIn]);
    });

    it('answers null and never zero for a capture not taken', () => {
      const missing = corpus.fixtures
        .filter((fixture) => !corpus.capture.readIn.includes(fixture.id))
        .map((fixture) => readText(corpus, fixture)
          .record[corpus.capture.member]);

      expect(missing.filter((value) => value !== null)).toEqual([]);
      expect(missing.length).toBeGreaterThan(0);
    });
  });
}

// ---------------------------------------------------------------------------
// The markup corpus, through the selector into the engine
// ---------------------------------------------------------------------------

/** One value the engine handed the injected step, and for what. */
interface HandedValue {
  /** What the caller was driving when the step was reached. */
  readonly id: string;

  /** Exactly what arrived, before anything narrowed it. */
  readonly markup: unknown;
}

/**
 * The matcher, with a note taken of everything it is handed.
 *
 * Declared with `unknown` parameters even though `MarkupSelect` says
 * text: a narrower parameter list is what the type asks for, so the
 * wider one satisfies it, and it is the only way a case can see a
 * value the engine was supposed to have kept out.
 *
 * @param into - Where to record, mutated.
 * @param id - What is being driven.
 * @returns A step to inject.
 */
function recordingStep(into: HandedValue[], id: string): MarkupSelect {
  return (markup: unknown, selector: unknown): unknown => {
    into.push({ id, markup });

    return typeof markup === 'string' && typeof selector === 'string'
      ? markupSelect(markup, selector)
      : [];
  };
}

const MARKUP_ORDERED = divergingFirst(MARKUP_FIXTURES, MARKUP_DIVERGENCES);

describe('parse engine roster — markup documents', () => {
  it('names a fixture the corpus holds in every divergence', () => {
    const found = MARKUP_DIVERGENCES
      .map((entry) => fixtureById(MARKUP_FIXTURES, entry.id).id);

    expect(found).toEqual(MARKUP_DIVERGENCES.map((entry) => entry.id));
  });

  it('builds a config the engine will run', () => {
    expect(parserConfigErrors(MARKUP_CONFIG)).toEqual([]);
  });
});

describe('parse engine readings — markup documents', () => {
  for (const fixture of MARKUP_ORDERED) {
    const diverging = divergenceFor(MARKUP_DIVERGENCES, fixture.id);
    const expected = diverging === undefined
      ? []
      : [requiredFault(diverging.member)];
    const verdict = diverging === undefined
      ? 'holds'
      : `diverges on ${diverging.member}`;

    it(`${verdict}: ${fixture.id}`, () => {
      const reading = readMarkup(fixture, MARKUP_DEPS);

      expect(reading.configErrors).toEqual([]);
      expect(reading.count).toBe(1);
      expect(reading.warnings).toEqual([]);
      expect(reading.errors).toEqual(expected);
    });
  }

  it('reads the first fragment where a list field keeps them all', () => {
    const disagreed = MARKUP_FIXTURES.filter((fixture) => {
      const reading = readMarkup(fixture, MARKUP_DEPS);
      const all = fragmentsOf(reading.record[PARAGRAPHS]);

      return reading.record[PARAGRAPH] !== (all[0] ?? null);
    });

    expect(disagreed.map((fixture) => fixture.id)).toEqual([]);
  });

  it('keeps only fragments the document itself carried', () => {
    const invented = MARKUP_FIXTURES.filter((fixture) => {
      const all = fragmentsOf(readMarkup(fixture, MARKUP_DEPS)
        .record[PARAGRAPHS]);

      return all.some((fragment) => typeof fragment !== 'string'
        || !fixture.text.includes(fragment));
    });

    expect(invented.map((fixture) => fixture.id)).toEqual([]);
  });

  it('hands the step the document and reaches it for every entry', () => {
    const handed: HandedValue[] = [];

    for (const fixture of MARKUP_FIXTURES) {
      readMarkup(fixture, {
        selectMarkup: recordingStep(handed, fixture.id),
      });
    }

    const wrong = handed.filter((entry) => entry.markup !== fixtureById(
      MARKUP_FIXTURES,
      entry.id,
    ).text);

    expect(wrong.map((entry) => entry.id)).toEqual([]);
    expect(Array.from(new Set(handed.map((entry) => entry.id))))
      .toEqual(MARKUP_FIXTURES.map((fixture) => fixture.id));
  });
});

// ---------------------------------------------------------------------------
// Hostile payloads, in the payload position and in the markup one
// ---------------------------------------------------------------------------

/**
 * The `ADVERSARIAL_VALUES` entries the markup step is reached for.
 *
 * The engine converts only the four primitives with an unambiguous
 * spelling, so a selector field over anything else answers nothing
 * and the step is never called. Declared in corpus order and held as
 * a whole list, because the reading that matters is which values
 * crossed that boundary rather than how many.
 */
const REACHING_MARKUP_STEP: readonly string[] = [
  'big-integer',
  'negative-zero',
  'empty-string',
  'numeric-string',
];

describe('parse engine — hostile payloads', () => {
  it('raises on none of them, in either position', () => {
    const raised: string[] = [];

    for (const value of ADVERSARIAL_VALUES) {
      const config = configFor(STRUCTURED_CORPUS);
      const contract = contractFor(STRUCTURED_CORPUS);

      try {
        extractRecords(value.build(), config, MARKUP_DEPS);
        extractRecords(
          { [RECORDS_PATH]: [{ [BODY_PATH]: value.build() }] },
          config,
          MARKUP_DEPS,
        );
        extractRecords(
          { items: [{ html: value.build() }] },
          MARKUP_CONFIG,
          MARKUP_DEPS,
        );
        contractErrors(value.build(), contract);
        contractErrors({ indentation: '' }, value.build());
        parserConfigErrors(value.build());
      } catch {
        raised.push(value.id);
      }
    }

    expect(raised).toEqual([]);
    expect(ADVERSARIAL_VALUES.length).toBeGreaterThan(0);
  });

  it('hands the markup step text, and only the values that have it', () => {
    const handed: HandedValue[] = [];

    for (const value of ADVERSARIAL_VALUES) {
      extractRecords(
        { items: [{ html: value.build() }] },
        MARKUP_CONFIG,
        { selectMarkup: recordingStep(handed, value.id) },
      );
    }

    const reached = Array.from(new Set(handed.map((entry) => entry.id)));
    const notText = handed
      .filter((entry) => typeof entry.markup !== 'string')
      .map((entry) => entry.id);

    expect(notText).toEqual([]);
    expect(reached).toEqual([...REACHING_MARKUP_STEP]);
  });
});

// ---------------------------------------------------------------------------
// Every document through every reading
// ---------------------------------------------------------------------------

/**
 * Selectors the sweep drives, one per predicate plus one refused.
 *
 * The last is outside the grammar this matcher parses, and it is here
 * for the same reason the hostile payloads are: a stored selector is
 * text an operator typed, so the sweep has to include one nobody can
 * parse rather than only ones somebody can.
 */
const SWEEP_SELECTORS: readonly string[] = [
  'p',
  'div h2',
  '#lead',
  '.bulletin',
  '[data-role="headline"]',
  'p > span',
];

describe('parse engine — the whole corpus through both modules', () => {
  it('raises on no document, under no reading', () => {
    const every = [
      ...STRUCTURED_TEXT_FIXTURES,
      ...DELIMITED_RECORD_FIXTURES,
      ...MARKUP_FIXTURES,
    ];
    const raised: string[] = [];
    let judged = 0;
    let held = 0;

    for (const fixture of every) {
      for (const selector of SWEEP_SELECTORS) {
        try {
          markupSelect(fixture.text, selector);
        } catch {
          raised.push(`${fixture.id} / ${selector}`);
        }
      }

      for (const corpus of [...TEXT_CORPORA, null]) {
        try {
          const reading = corpus === null
            ? readMarkup(fixture, MARKUP_DEPS)
            : readText(corpus, fixture);

          judged += reading.errors.length > 0
            ? 1
            : 0;
          held += reading.errors.length === 0
            ? 1
            : 0;
        } catch {
          raised.push(`${fixture.id} / ${corpus?.name ?? 'markup'}`);
        }
      }
    }

    expect(raised).toEqual([]);
    expect(judged).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
  });
});
