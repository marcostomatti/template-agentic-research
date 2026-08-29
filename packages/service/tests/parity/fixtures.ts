/**
 * @packageDocumentation
 * The neutral corpus every parity suite drives both implementations
 * over.
 *
 * A parity case hands ONE input to an origin library and to its port
 * and diffs the two answers, so that input has to live somewhere both
 * can reach. This is that somewhere: authored documents and authored
 * values, each carrying an id a failure prints and a line saying which
 * shape it stands for.
 *
 * Nothing here was copied out of the origin checkout, and nothing here
 * ever will be. The origin ships a fixture tree of its own and it is
 * out of bounds whatever a port-as-is instruction suggests about the
 * shapes it holds: those files carry a person's name and the subject
 * matter this port exists to leave behind, and a fixture is the one
 * artifact that would carry both into a tracked file verbatim, quoted
 * rather than described. What actually ports is the SHAPE — a quoted
 * field with a comma inside it, a multipart boundary that never
 * appears, a run of zero-width padding — and a shape is re-authorable
 * from its description alone. So every entry says what it stands for,
 * and a reader asking whether a case is covered reads `describes`
 * rather than diffing against a checkout.
 *
 * The subject matter is deliberately unrelated to anything this
 * platform researches. These libraries are mechanisms — a parser, a
 * hash, a coercion — and the vocabulary a domain brings arrives from
 * `terms` and `criteria` rows at run time, never from a fixture.
 * Weather-station readings stand in: they carry no meaning any
 * mechanism here depends on, and they say the null-vs-zero rule in one
 * sentence — a station whose gauge measured no rainfall reports `0`,
 * and a station whose gauge was offline reports nothing at all.
 *
 * Nothing here states an expected OUTPUT. A fixture is an input, and
 * an expectation belongs to the suite that knows which implementation
 * it is asking and on which leg. {@link INVISIBLE_TEXT_FIXTURE} looks
 * like the exception and is not: it carries the same prose twice, both
 * readings built from one word list, so the pair differs by exactly
 * the invisible characters. That is an authoring decision about which
 * characters are invisible, not a claim about what an implementation
 * should do with them.
 *
 * Invisible characters come from code points and never from a glyph in
 * this file. `ar/no-unsafe-unicode` is an error repo-wide and
 * `bun run gate:control-bytes` is the byte-level floor under it, so a
 * literal zero-width space would not survive lint — but the stronger
 * reason is that a reviewer cannot see one, which is the property that
 * makes such a character worth a fixture at all. The escape spelling
 * is legal source and still not the answer: it does not survive every
 * path a file is written by, and it reads as the character rather than
 * as a number.
 *
 * Adversarial values are BUILT per call rather than shared: an
 * implementation may mutate what it is handed, and two sides sharing
 * one object would let whichever ran first change what the second saw
 * — a divergence neither implementation caused.
 * {@link ADVERSARIAL_SYMBOL} is the exception and has to be, since the
 * differ compares primitives with `Object.is` and a fresh symbol per
 * call would part on identity alone. Objects have no such problem,
 * because the differ walks them structurally.
 *
 * Every host below sits under `example.invalid`. It is reserved, and
 * unlike a name reserved only for documentation it cannot resolve at
 * all — the property the isolated-suite law actually wants out of a
 * fixture endpoint, and the convention
 * `tests/schema/canonical-document.ts` already follows here.
 *
 * Two rules bind this file for where it sits rather than for what it
 * holds. It is under the parity directory, so
 * `tests/invariants/parity-origin-hygiene.test.ts` reads it as text:
 * no absolute filesystem path literal may appear here, and the
 * origin-root variable may not be named here. That file also lists
 * this one by name, so a fixture module added beside it fails there
 * rather than going unscanned.
 */

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One authored document, as every text-driven suite reads it. */
export interface TextFixture {
  /** Stable id a failure prints in place of the document. */
  readonly id: string;

  /** The shape this document stands for, in one line. */
  readonly describes: string;

  /** The document itself. */
  readonly text: string;
}

/** A document paired with the prose a reader sees in it. */
export interface PaddedTextFixture extends TextFixture {
  /** The same prose with none of the invisible roster in it. */
  readonly visible: string;
}

/** One character nobody sees, named by its code point. */
export interface InvisibleCharacter {
  /** Stable id a failure prints in place of the character. */
  readonly id: string;

  /** What it is, and why a stripping pass cares. */
  readonly describes: string;

  /** The code point, which is how this file writes it. */
  readonly codePoint: number;

  /** That code point as a one-character string. */
  readonly char: string;
}

/** One hostile value, and how to make a fresh one. */
export interface AdversarialValue {
  /** Stable id a failure prints in place of the value. */
  readonly id: string;

  /** What a coercion is being asked to survive. */
  readonly describes: string;

  /** A value nothing else holds a reference to. */
  readonly build: () => unknown;
}

/**
 * The fixture with this id, or a refusal naming it.
 *
 * Refuses rather than answering `undefined`: a suite asking for a
 * renamed fixture would otherwise drive both implementations over
 * nothing and agree, which is the false green this seam exists to
 * prevent.
 *
 * @param fixtures - A roster below.
 * @param id - The entry wanted.
 * @returns That entry.
 */
export function fixtureById<T extends { readonly id: string }>(
  fixtures: readonly T[],
  id: string,
): T {
  const found = fixtures.find((fixture) => fixture.id === id);

  if (found === undefined) {
    throw new Error(`[parity-fixtures] no fixture with id "${id}".`);
  }

  return found;
}

/** A tab, from its code point: a literal one is a lint error here. */
const TAB = String.fromCharCode(9);

/** A carriage return, for the same reason and by the same route. */
const CARRIAGE_RETURN = String.fromCharCode(13);

// ---------------------------------------------------------------------------
// Structured text
// ---------------------------------------------------------------------------

/**
 * Documents in the indentation-and-colons shape a configuration
 * parser reads.
 *
 * The well-formed entries come first and the refused ones after, but a
 * suite should drive the refused ones FIRST: a parser that accepts
 * everything passes every well-formed case, and only a document it is
 * supposed to reject says whether it reads structure or guesses. Each
 * refused entry carries exactly one fault, so the failure both
 * implementations report is the fault the id names rather than
 * whichever of several they reached first.
 */
export const STRUCTURED_TEXT_FIXTURES: readonly TextFixture[] = [
  {
    id: 'structured-scalars',
    describes: 'every scalar form the subset reads, one per line',
    text: [
      '---',
      '# the network this document configures',
      'network: coastal',
      'label: "a quoted value, with a comma"',
      'readings: 0',
      'offline: null',
      'elevation: -12.5',
      'active: true',
      'retired: false',
      'tilde: ~',
      'bare: a bare value keeps its colons: like this one',
      'nothing:',
    ].join('\n'),
  },
  {
    id: 'structured-blocks',
    describes: 'a key owning a list, a key owning a map, and both empty',
    text: [
      'stations:',
      '  - alpha',
      '  - bravo',
      'gauges:',
      '  - { id: alpha, rainfall: 0 }',
      '  - { id: bravo, rainfall: null }',
      'limits:',
      '  low: 0',
      '  high: 250',
      'retired: []',
      'notes: {}',
    ].join('\n'),
  },
  {
    id: 'structured-comments',
    describes: 'comments, blank lines and a hash that is not a comment',
    text: [
      '# a comment on a line of its own',
      '',
      '   ',
      'network: coastal   # a trailing comment',
      'label: "a # inside quotes is not a comment"',
    ].join('\n'),
  },
  {
    id: 'structured-empty',
    describes: 'no text at all, which is a document and not a fault',
    text: '',
  },
  {
    id: 'structured-tab-indent',
    describes: 'refused: a tab where the subset wants spaces',
    text: ['stations:', `${TAB}- alpha`].join('\n'),
  },
  {
    id: 'structured-deep-nesting',
    describes: 'refused: a second level of nesting',
    text: ['limits:', '  coastal:', '    low: 0'].join('\n'),
  },
  {
    id: 'structured-mixed-block',
    describes: 'refused: one block holding both a list item and a pair',
    text: ['gauges:', '  - alpha', '  low: 0'].join('\n'),
  },
  {
    id: 'structured-duplicate-key',
    describes: 'refused: the same key assigned twice',
    text: ['network: coastal', 'network: upland'].join('\n'),
  },
  {
    id: 'structured-unterminated-quote',
    describes: 'refused: a quoted value with no closing quote',
    text: 'label: "a value that never closes',
  },
  {
    id: 'structured-block-scalar',
    describes: 'refused: a block scalar, which is outside the subset',
    text: ['note: |', '  a folded paragraph'].join('\n'),
  },
  {
    id: 'structured-flow-sequence',
    describes: 'refused: a flow sequence, which is outside the subset',
    text: 'stations: [alpha, bravo]',
  },
];

// ---------------------------------------------------------------------------
// Delimited records
// ---------------------------------------------------------------------------

/** The one header row every entry below opens with. */
const CSV_HEADER = 'station,rainfall_mm,note';

/**
 * Comma-delimited documents, header row first.
 *
 * The columns are the same three throughout, which is why they are a
 * constant: a suite can compare rows across entries without re-reading
 * each header, and the null-vs-zero distinction lands in data rather
 * than in prose — a gauge that measured no rainfall writes `0` and a
 * gauge that was offline writes an empty cell. A reader treating those
 * two as one value has lost the distinction the platform is built on,
 * and this corpus is where that shows up first.
 *
 * A tokenizer here is not allowed to throw, so the malformed entries
 * are about what it does INSTEAD — which is a claim a parity run
 * measures well and a unit test states badly.
 */
export const DELIMITED_RECORD_FIXTURES: readonly TextFixture[] = [
  {
    id: 'csv-simple',
    describes: 'a header and two rows, nothing quoted',
    text: [
      CSV_HEADER, 'alpha,0,gauge measured no rainfall',
      'bravo,,gauge was offline', '',
    ].join('\n'),
  },
  {
    id: 'csv-quoted-comma',
    describes: 'a quoted field carrying the delimiter',
    text: [CSV_HEADER, 'alpha,0,"dry, and cold"', ''].join('\n'),
  },
  {
    id: 'csv-embedded-newline',
    describes: 'a quoted field carrying a record separator',
    text: [CSV_HEADER, 'alpha,0,"first line', 'second line"', ''].join('\n'),
  },
  {
    id: 'csv-doubled-quote',
    describes: 'a quoted field carrying an escaped quote',
    text: [
      CSV_HEADER, 'alpha,0,"the gauge reads ""dry"" today"', '',
    ].join('\n'),
  },
  {
    id: 'csv-ragged',
    describes: 'one row short of the header and one row past it',
    text: [CSV_HEADER, 'alpha,0', 'bravo,4,wet,extra', ''].join('\n'),
  },
  {
    id: 'csv-crlf',
    describes: 'the other record separator, built from its code point',
    text: [CSV_HEADER, 'alpha,0,dry', ''].join(`${CARRIAGE_RETURN}\n`),
  },
  {
    id: 'csv-byte-order-mark',
    describes: 'a leading mark that would otherwise join the first header',
    text: [
      `${String.fromCodePoint(0xfeff)}${CSV_HEADER}`, 'alpha,0,dry', '',
    ].join('\n'),
  },
  {
    id: 'csv-blank-lines',
    describes: 'blank lines between records, which carry no row',
    text: [CSV_HEADER, '', 'alpha,0,dry', '', ''].join('\n'),
  },
  {
    id: 'csv-header-only',
    describes: 'a header and no row under it',
    text: `${CSV_HEADER}\n`,
  },
  {
    id: 'csv-unterminated-quote',
    describes: 'a quoted field that runs to the end of the document',
    text: [CSV_HEADER, 'alpha,0,"a note that never closes'].join('\n'),
  },
  {
    id: 'csv-empty',
    describes: 'no text at all, which is no rows rather than a fault',
    text: '',
  },
];

// ---------------------------------------------------------------------------
// Multipart messages
// ---------------------------------------------------------------------------

/**
 * Messages in the headers-blank-line-body shape, one per path a
 * multipart walk takes.
 *
 * These are the longest fixtures here and the reason is structural: a
 * message part is itself a message, so the shape that matters — a
 * boundary, a part with its own headers, a nested walk — cannot be
 * shown in fewer lines than a whole message takes. Every address is
 * under a host that cannot resolve.
 *
 * The encoded forms are readable on purpose: the base64 word in
 * `eml-encoded-word-headers` spells the same network name the other
 * entries write in plain text, and the quoted-printable body holds one
 * soft break, one high byte and one escape that is not an escape.
 */
export const MULTIPART_MESSAGE_FIXTURES: readonly TextFixture[] = [
  {
    id: 'eml-multipart-alternative',
    describes: 'two alternative parts, and a folded recipient header',
    text: [
      'From: Coastal Network <bulletins@example.invalid>',
      'To: Subscribers <readings@example.invalid>,',
      ' Archive <archive@example.invalid>',
      'Subject: Daily reading',
      'Date: Wed, 12 Aug 2026 06:00:00 +0000',
      'Reply-To: no-reply@example.invalid',
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="ar-parity-alt"',
      '',
      '--ar-parity-alt',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'Station alpha measured 0 mm overnight.',
      '',
      '--ar-parity-alt',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>Station alpha measured 0 mm overnight.</p>',
      '',
      '--ar-parity-alt--',
      '',
    ].join('\n'),
  },
  {
    id: 'eml-quoted-printable',
    describes: 'a soft break, a high byte and a malformed escape',
    text: [
      'From: Coastal Network <bulletins@example.invalid>',
      'Subject: Gauge note',
      'Content-Type: text/plain; charset=iso-8859-1',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      'A soft break splits this =',
      'line, and =E9 is one high byte.',
      'An equals with no hex =zz stays literal.',
      '',
    ].join('\n'),
  },
  {
    id: 'eml-encoded-word-headers',
    describes: 'base64 and quoted-printable encoded words, one pair adjacent',
    text: [
      'From: =?utf-8?B?Q29hc3RhbCBOZXR3b3Jr?= <bulletins@example.invalid>',
      'Subject: =?utf-8?Q?Gauge_note?= =?iso-8859-1?Q?=E9tat?=',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'Station alpha measured 0 mm overnight.',
      '',
    ].join('\n'),
  },
  {
    id: 'eml-nested-multipart',
    describes: 'an alternative part inside a mixed one, nested a level',
    text: [
      'From: Coastal Network <bulletins@example.invalid>',
      'Content-Type: multipart/mixed; boundary="ar-parity-outer"',
      '',
      '--ar-parity-outer',
      'Content-Type: multipart/alternative; boundary="ar-parity-inner"',
      '',
      '--ar-parity-inner',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'A part two boundaries deep.',
      '',
      '--ar-parity-inner--',
      '',
      '--ar-parity-outer--',
      '',
    ].join('\n'),
  },
  {
    id: 'eml-missing-boundary',
    describes: 'a boundary declared in a header and absent from the body',
    text: [
      'From: Coastal Network <bulletins@example.invalid>',
      'Content-Type: multipart/alternative; boundary="ar-parity-absent"',
      '',
      'The declared boundary never appears below this line.',
      '',
    ].join('\n'),
  },
  {
    id: 'eml-no-separator',
    describes: 'headers running to the end, with no blank line under them',
    text: [
      'From: Coastal Network <bulletins@example.invalid>',
      'Subject: Headers and nothing else',
    ].join('\n'),
  },
];

// ---------------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------------

/**
 * Angle-bracket markup and the active forms of a lightweight markup
 * dialect, which two different reductions read.
 *
 * They share a roster because they share a rule: untrusted text may be
 * DISPLAYED and must never be INTERPRETED. A reduction to plain text
 * and a neutralizing pass are two ways of holding that rule, and a
 * corpus split between them would let one quietly stop covering a form
 * the other still saw. `markup-plain` and `markdown-plain` are the
 * controls, and the entries to read first on a failing run: a pass
 * that neutralized everything satisfies every other entry here and
 * fails those two.
 */
export const MARKUP_FIXTURES: readonly TextFixture[] = [
  {
    id: 'markup-entities',
    describes: 'named, decimal, hex, unknown and unterminated entities',
    text: [
      '<p>Rainfall &amp; wind: 5 &lt; 9 &gt; 3</p>',
      '<p>&#65;lpha and &#x42;ravo</p>',
      '<p>&nbsp;padded&nbsp;</p>',
      '<p>&#8203;a decimal entity for an invisible character</p>',
      '<p>&notanentity; and &amp unterminated</p>',
    ].join('\n'),
  },
  {
    id: 'markup-block-structure',
    describes: 'nested blocks, a list and a line break',
    text: [
      '<div class="bulletin"><h2>Coastal network</h2>',
      '<p>First line.<br>Second line.</p>',
      '<ul><li>alpha</li><li>bravo</li></ul></div>',
    ].join('\n'),
  },
  {
    id: 'markup-script-and-style',
    describes: 'two elements whose content is not text a reader sees',
    text: [
      '<style>.bulletin { color: red; }</style>',
      '<p>Visible prose.</p>',
      '<script>var hidden = 1;</script>',
    ].join('\n'),
  },
  {
    id: 'markup-malformed',
    describes: 'an unclosed tag, a comment, and brackets that are prose',
    text: [
      '<p>a &lt; b, and a < b, and <3</p>',
      '<div><span>a span nothing closes',
      '<!-- a comment carrying a > inside it -->',
      '<img alt="a quoted > inside an attribute">',
    ].join('\n'),
  },
  {
    id: 'markup-plain',
    describes: 'control: prose with no markup in it at all',
    text: 'Station alpha measured 0 mm overnight, and bravo was offline.',
  },
  {
    id: 'markdown-active-forms',
    describes: 'every form untrusted text becomes something interpreted by',
    text: [
      '# a heading marker opening a line',
      '![a chart](https://example.invalid/charts/rainfall.png)',
      'Read https://example.invalid/bulletins for the daily reading.',
      'A [[link opener]] beside a <b>raw tag</b>.',
      'A setext underline follows this line.',
      '=====',
    ].join('\n'),
  },
  {
    id: 'markdown-plain',
    describes: 'control: prose carrying none of the active forms',
    text: [
      'Station alpha measured 0 mm overnight.',
      'A dash - in the middle of a line underlines nothing.',
    ].join('\n'),
  },
];

// ---------------------------------------------------------------------------
// Invisible characters
// ---------------------------------------------------------------------------

/**
 * One roster entry, with its character built from its code point — so
 * the number and the character cannot drift apart, as they would if a
 * roster wrote each member twice.
 *
 * @param id - Stable id a failure prints.
 * @param codePoint - The character, as this file writes it.
 * @param describes - What it is, and why a stripping pass cares.
 * @returns The roster entry.
 */
function invisible(
  id: string,
  codePoint: number,
  describes: string,
): InvisibleCharacter {
  return { id, describes, codePoint, char: String.fromCodePoint(codePoint) };
}

/**
 * Every character a reader cannot see and a parser fully receives.
 *
 * A padding run made of these is the cheapest way to make a message
 * look short and cost a great deal, which is why a bounded-chunk
 * contract strips them before measuring anything. The bidi members are
 * here for a second reason: they reorder what a reviewer reads without
 * changing what a machine gets — the same disagreement
 * `ar/no-unsafe-unicode` refuses in source.
 */
export const INVISIBLE_CODE_POINTS: readonly InvisibleCharacter[] = [
  invisible('soft-hyphen', 0x00ad, 'a hyphen a renderer may decline to draw'),
  invisible('combining-grapheme-joiner', 0x034f, 'padding that looks like nothing'),
  invisible('zero-width-space', 0x200b, 'a break opportunity with no width'),
  invisible('zero-width-non-joiner', 0x200c, 'a joining hint, invisible alone'),
  invisible('zero-width-joiner', 0x200d, 'the other joining hint'),
  invisible('left-to-right-mark', 0x200e, 'a direction hint with no glyph'),
  invisible('right-to-left-mark', 0x200f, 'the other direction hint'),
  invisible('line-separator', 0x2028, 'a separator that historically split parsers'),
  invisible('paragraph-separator', 0x2029, 'the other such separator'),
  invisible('left-to-right-embedding', 0x202a, 'opens a reordered run'),
  invisible('right-to-left-embedding', 0x202b, 'opens the other reordered run'),
  invisible('pop-directional-formatting', 0x202c, 'closes a reordered run'),
  invisible('left-to-right-override', 0x202d, 'forces order against the text'),
  invisible('right-to-left-override', 0x202e, 'forces the other order'),
  invisible('word-joiner', 0x2060, 'a no-break hint with no width'),
  invisible('function-application', 0x2061, 'an invisible mathematical operator'),
  invisible('byte-order-mark', 0xfeff, 'a mark that becomes text after the first byte'),
];

/**
 * A space that is not removable, kept out of the roster on purpose.
 *
 * Every member above answers to being deleted. This one does not: a
 * reader sees a space where it sits, so deleting it joins two words
 * and the right answer is a plain space instead. A suite driving the
 * roster over a stripping pass would assert the wrong thing about this
 * character, which is why it is a constant rather than an eighteenth
 * entry.
 */
export const NO_BREAK_SPACE: InvisibleCharacter = invisible(
  'no-break-space',
  0x00a0,
  'space-like rather than invisible: the answer is a space, not nothing',
);

/** Every roster member once, in roster order, as one run. */
const INVISIBLE_RUN = INVISIBLE_CODE_POINTS.map((entry) => entry.char).join('');

/** The words both readings of the sample below are built from. */
const INVISIBLE_SAMPLE_WORDS: readonly string[] = [
  'Station', 'seven', 'measured', 'zero', 'rainfall', 'overnight',
];

/** The words with a run at the start, the end and every gap. */
const INVISIBLE_PADDED_TEXT = [
  INVISIBLE_RUN, INVISIBLE_SAMPLE_WORDS.join(` ${INVISIBLE_RUN}`), INVISIBLE_RUN,
].join('');

/**
 * Six words padded with every invisible character, and the same six
 * words with none.
 *
 * The pair is the fixture: both readings come from one word list, so
 * they differ by exactly the roster and by nothing else. Neither
 * claims what a stripping pass should return — {@link NO_BREAK_SPACE}
 * is the character whose right answer is not `visible`, and it is
 * deliberately absent from both.
 */
export const INVISIBLE_TEXT_FIXTURE: PaddedTextFixture = {
  id: 'invisible-run',
  describes: 'prose padded with a run of every invisible code point',
  text: INVISIBLE_PADDED_TEXT,
  visible: INVISIBLE_SAMPLE_WORDS.join(' '),
};

// ---------------------------------------------------------------------------
// Adversarial coercion values
// ---------------------------------------------------------------------------

/**
 * The symbol every adversarial build hands back, shared on purpose.
 *
 * The differ compares primitives with `Object.is` and a symbol is
 * equal to nothing but itself, so a fresh one per call would part on
 * identity in any suite whose coercion returns its input unchanged —
 * a divergence about this file rather than about either
 * implementation. Sharing is safe here and nowhere else in this
 * section, because a symbol cannot be mutated.
 */
const ADVERSARIAL_SYMBOL = Symbol('parity-fixture');

/** A reading that refers to itself, which is what a cycle is. */
interface CircularReading {
  /** Which station the reading is from. */
  readonly station: string;

  /** The reading before it, which here is the reading itself. */
  previous: CircularReading | null;
}

/** Refuses to become a string, and refuses to become a number with it. */
function refuseStringConversion(): never {
  throw new TypeError('this fixture refuses string conversion');
}

/**
 * An object whose string conversion throws.
 *
 * The override goes on through `Object.defineProperty` rather than in
 * the literal, and that is the whole of what makes this fixture work:
 * a method written in the literal is an own ENUMERABLE key, so both
 * sides would part at that key before any comparison reached the data,
 * and every suite using it would be measuring the fixture. Non
 * enumerable, the object walks as its two readable fields and still
 * throws the moment something coerces it — which is the question.
 *
 * `valueOf` is left alone deliberately: a number coercion consults it
 * first, gets an object back, and falls through to the conversion
 * below, so one override covers both paths.
 *
 * @returns A fresh instance, referenced by nothing else.
 */
function buildHostileReading(): Record<string, unknown> {
  const reading: Record<string, unknown> = { station: 'bravo', rainfall: 0 };

  Object.defineProperty(reading, 'toString', {
    configurable: true,
    enumerable: false,
    value: refuseStringConversion,
    writable: true,
  });

  return reading;
}

/**
 * A reading holding itself, which serialization cannot follow — and
 * which is what actually makes a JSON pass throw, where a hostile
 * string conversion does not: serialization never consults one.
 *
 * @returns A fresh instance, referenced by nothing else.
 */
function buildCircularReading(): CircularReading {
  const reading: CircularReading = { station: 'alpha', previous: null };

  reading.previous = reading;

  return reading;
}

/**
 * Values a coercion has to survive, and the answers it has to keep
 * apart.
 *
 * The first seven are hostile in kind: not numbers, not strings, or
 * not anything a serializer models. The rest are hostile in degree —
 * each is a number, or nearly one, whose careless handling collapses
 * the null-vs-zero rule. `not-a-number` and `null` must not both
 * become `0`; `negative-zero` is a measured zero `Object.is` separates
 * from the other one and JSON does not; `empty-string` and
 * `numeric-string` are the two ways a text column arrives where a
 * number was wanted.
 *
 * Every entry builds a fresh value, for the reason the header gives. A
 * suite drives BOTH implementations from its own `build()` call, never
 * from one value handed to each.
 */
export const ADVERSARIAL_VALUES: readonly AdversarialValue[] = [
  {
    id: 'null',
    describes: 'the value the null-vs-zero rule reserves for the unmeasured',
    build: () => null,
  },
  {
    id: 'undefined',
    describes: 'absence arriving as a missing property rather than as null',
    build: () => undefined,
  },
  {
    id: 'empty-array',
    describes: 'a list with no elements, which is not the same as no list',
    build: () => [],
  },
  {
    id: 'big-integer',
    describes: 'an integer past what a double holds, so a cast loses it',
    build: () => 9007199254740993n,
  },
  {
    id: 'symbol',
    describes: 'a value a number coercion throws on rather than refuses',
    build: () => ADVERSARIAL_SYMBOL,
  },
  {
    id: 'hostile-string-conversion',
    describes: 'an object that throws when anything renders it as text',
    build: buildHostileReading,
  },
  {
    id: 'circular-object',
    describes: 'an object holding itself, which serialization throws on',
    build: buildCircularReading,
  },
  {
    id: 'not-a-number',
    describes: 'a number that is not one, and must not become zero',
    build: () => Number.NaN,
  },
  {
    id: 'negative-zero',
    describes: 'a measured zero JSON cannot tell from the other one',
    build: () => -0,
  },
  {
    id: 'positive-infinity',
    describes: 'a number outside every finite range, and not a total',
    build: () => Number.POSITIVE_INFINITY,
  },
  {
    id: 'empty-string',
    describes: 'a text column holding nothing where a number was wanted',
    build: () => '',
  },
  {
    id: 'numeric-string',
    describes: 'a number arriving as padded text, which parses and lies',
    build: () => ' 12.50 ',
  },
];
