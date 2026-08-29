/**
 * Cases for `src/lib/parse-eml.ts`: what it makes of a message that
 * was cut short, and the reading each of those answers bound.
 *
 * The truncated and boundary-less inputs come FIRST and take up the
 * top third of the file, because they are the shapes this library was
 * written for rather than the ones it copes with. A message arrives
 * whole only when nothing went wrong between the sender and here, and
 * a reader that refused the rest would throw away the parts it had
 * already understood along with the part it had not. So a container
 * whose closing delimiter never arrived, a boundary declared and
 * never written, a header block running off the end — each has an
 * ANSWER, and an answer nobody wrote down is an answer nobody can
 * rely on. A suite driving well-formed mail would pass over a reader
 * that dropped the last part of every truncated message.
 *
 * Every reading is pinned WHOLE. A reading is only a reading if
 * nothing else came back with it: a reader that also invented a
 * warning, lost a header, or joined two parts in the wrong order
 * satisfies any number of per-field claims. That includes the
 * PRESENCE of `parse_warnings`, which is why the comparisons are
 * strict — the key's absence is the signal that nothing went wrong,
 * and a matcher treating an absent key as an undefined one would let
 * that signal rot.
 *
 * The nine warning sentences get a section of their own, held
 * set-equal against a declared roster. They are as much the contract
 * as the return value is — a caller routes on them — and a roster
 * held against what the inputs in this file actually produce is what
 * says the file still drives every fault path rather than the six it
 * started with.
 *
 * The corpus entries are driven off `tests/parity/fixtures.ts` rather
 * than off a list written here, since the same entries drive the
 * parity suite and two lists that agree until somebody edits one is
 * exactly what that arrangement avoids. The table below is held
 * set-equal against the corpus, so an entry added there fails HERE
 * naming itself instead of going undriven.
 *
 * The bytes get their own section and real `Buffer` inputs, because
 * that is the runtime shape and a string fixture cannot reach the
 * path that matters: a lone high byte is not valid UTF-8, so it only
 * survives to the charset step if the fold really was byte-faithful.
 * Every such byte is written as its NUMBER here for the same reason
 * the parity corpus writes invisible characters that way — a reviewer
 * can check a code point and cannot check a glyph.
 */
import type { EmlHeaders, EmlMessage } from '../../src/lib/parse-eml.js';

import { describe, expect, it } from 'vitest';

import { parseEml } from '../../src/lib/parse-eml.js';
import {
  ADVERSARIAL_VALUES,
  MULTIPART_MESSAGE_FIXTURES,
  fixtureById,
} from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// Building an expected reading
// ---------------------------------------------------------------------------

/** What a message carrying none of the five headers answers with. */
const NO_HEADERS: EmlHeaders = {
  from: '',
  to: '',
  subject: '',
  date: '',
  replyTo: '',
};

/** The parts of a reading a case actually cares about. */
interface PartialReading {
  /** Only the headers this case has something to say about. */
  readonly headers?: Partial<EmlHeaders>;

  /** The joined `text/` parts, or nothing for none. */
  readonly text?: string;

  /** The joined `text/html` parts, or nothing for none. */
  readonly html?: string;

  /**
   * The warnings, in order — omitted when there are none.
   *
   * Omitted rather than `[]`, because the difference is the thing
   * being asserted: a clean read carries no `parse_warnings` key at
   * all, and an empty array would be a different answer.
   */
  readonly warnings?: readonly string[];
}

/**
 * One whole reading, with the empty parts filled in.
 *
 * A builder rather than eighteen literals, since five empty header
 * fields repeated per case would bury the one field each case is
 * about. What makes that safe is the control beside the first
 * section: one case is ALSO written out as a full literal and
 * asserted equal to this builder's output, so a wrong default here
 * fails there rather than quietly agreeing with itself.
 *
 * @param reading - The parts this case cares about.
 * @returns The whole message that stands for them.
 */
function reads(reading: PartialReading): EmlMessage {
  const filled = {
    headers: { ...NO_HEADERS, ...reading.headers },
    text: reading.text ?? '',
    html: reading.html ?? '',
  };

  return reading.warnings === undefined
    ? filled
    : { ...filled, parse_warnings: reading.warnings };
}

/** One authored message and the whole reading it answers with. */
interface EmlCase {
  /** Stable id a failure prints in place of the message. */
  readonly id: string;

  /** The shape this message stands for, in one line. */
  readonly describes: string;

  /** The message itself. */
  readonly text: string;

  /** Everything that comes back, `parse_warnings` included. */
  readonly reads: EmlMessage;
}

/** Sorted copy, so an equality is over members rather than order. */
function sorted(ids: readonly string[]): string[] {
  return [...ids].sort();
}

// ---------------------------------------------------------------------------
// The pieces the messages below are built from
// ---------------------------------------------------------------------------

/** The delimiter every authored container declares. */
const BOUNDARY = 'ar-case';

/** One prose line, so no case has to invent subject matter. */
const READING_LINE = 'Station alpha measured 0 mm overnight.';

/**
 * A byte that is a character in latin1 and half of one in UTF-8.
 *
 * Written as a number, and turned into a character only where a
 * comparison needs one. That is the whole of what these cases are
 * about: `0xE9` alone is not valid UTF-8, so a reader that folded the
 * input through UTF-8 anywhere would have lost it by the time the
 * part declaring `iso-8859-1` was reached.
 */
const HIGH_BYTE = 0xe9;

/** That byte as the character latin1 says it is. */
const HIGH_CHAR = String.fromCharCode(HIGH_BYTE);

/** What a UTF-8 decode puts where a byte it could not read was. */
const REPLACEMENT_CHAR = String.fromCodePoint(0xfffd);

/** The byte this reader rewrites, on its way to being a line feed. */
const CARRIAGE_RETURN_BYTE = 0x0d;

/** The byte it becomes, which is the one separator everything splits on. */
const LINE_FEED_BYTE = 0x0a;

/**
 * One byte, as the reader's line-ending fold leaves it.
 *
 * A named function at module scope rather than a callback inside the
 * case, because `implicit-arrow-linebreak` leaves a wrapped ternary
 * inside call parentheses nowhere to go.
 *
 * @param byte - One byte of a part's body.
 * @returns The same byte, unless it was the one that gets rewritten.
 */
function foldCarriageReturn(byte: number): number {
  return byte === CARRIAGE_RETURN_BYTE
    ? LINE_FEED_BYTE
    : byte;
}

// ---------------------------------------------------------------------------
// Truncated and boundary-less input
// ---------------------------------------------------------------------------

/**
 * Every message that was cut short, or that declared a structure it
 * never wrote.
 *
 * Ordered from the most complete to the least: a container missing
 * only its closing delimiter, then one whose part is cut mid-body,
 * then one whose boundary never appears at all, then the two that
 * declare a container with no usable delimiter, then a message with
 * no blank line in it, then nothing at all.
 */
const TRUNCATED_MESSAGES: readonly EmlCase[] = [
  {
    id: 'truncated-multipart',
    describes: 'a container whose closing delimiter never arrives',
    text: [
      'From: Coastal Network <bulletins@example.invalid>',
      `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
      '',
      `--${BOUNDARY}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      READING_LINE,
      '',
    ].join('\n'),
    reads: reads({
      headers: { from: 'Coastal Network <bulletins@example.invalid>' },
      text: READING_LINE,
      warnings: [`multipart missing closing boundary "${BOUNDARY}"`],
    }),
  },
  {
    id: 'truncated-mid-part',
    describes: 'a part whose body stops in the middle of a sentence',
    text: [
      `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
      '',
      `--${BOUNDARY}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      'Station alpha measured',
    ].join('\n'),
    reads: reads({
      text: 'Station alpha measured',
      warnings: [`multipart missing closing boundary "${BOUNDARY}"`],
    }),
  },
  {
    id: 'boundary-absent-from-body',
    describes: 'a boundary declared in a header and never written',
    text: [
      `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
      '',
      'The declared boundary never appears below this line.',
      '',
    ].join('\n'),
    reads: reads({
      warnings: [`multipart missing closing boundary "${BOUNDARY}"`],
    }),
  },
  {
    id: 'no-boundary-parameter',
    describes: 'a container declaring no boundary at all',
    text: ['Content-Type: multipart/mixed', '', READING_LINE, ''].join('\n'),
    reads: reads({ warnings: ['multipart part has no boundary; skipped'] }),
  },
  {
    id: 'blank-boundary-parameter',
    describes: 'a boundary parameter holding only spaces',
    text: [
      'Content-Type: multipart/mixed; boundary="   "',
      '',
      READING_LINE,
      '',
    ].join('\n'),
    reads: reads({ warnings: ['multipart part has no boundary; skipped'] }),
  },
  {
    id: 'nested-too-deep',
    describes: 'three containers, where the walk goes two deep',
    text: [
      'Content-Type: multipart/mixed; boundary="outer"',
      '',
      '--outer',
      'Content-Type: multipart/alternative; boundary="middle"',
      '',
      '--middle',
      'Content-Type: multipart/related; boundary="inner"',
      '',
      '--inner',
      'Content-Type: text/plain',
      '',
      'Three containers deep.',
      '--inner--',
      '',
      '--middle--',
      '',
      '--outer--',
      '',
    ].join('\n'),
    reads: reads({
      warnings: ['multipart nested deeper than one level; skipped'],
    }),
  },
  {
    id: 'cut-mid-folded-header',
    describes: 'a folded header running off the end of the message',
    text: 'Subject: a reading split\n across two lines',
    reads: reads({
      headers: { subject: 'a reading split across two lines' },
      warnings: ['no header/body separator found'],
    }),
  },
  {
    id: 'body-with-no-headers',
    describes: 'a message opening with the blank line, so all body',
    text: `\n${READING_LINE}\n`,
    reads: reads({ warnings: ['no header/body separator found'] }),
  },
  {
    id: 'empty-message',
    describes: 'no text at all, which is a truncation of everything',
    text: '',
    reads: reads({ warnings: ['no header/body separator found'] }),
  },
];

// ---------------------------------------------------------------------------
// Messages that arrived whole
// ---------------------------------------------------------------------------

/** Every message that is not truncated, and what it reads to. */
const INTACT_MESSAGES: readonly EmlCase[] = [
  {
    id: 'header-line-with-no-colon',
    describes: 'a line in the header block that is not a header',
    text: [
      'Subject: Daily reading',
      'this line is not a header at all',
      '',
      READING_LINE,
      '',
    ].join('\n'),
    reads: reads({
      headers: { subject: 'Daily reading' },
      text: `${READING_LINE}\n`,
    }),
  },
  {
    id: 'duplicate-subject',
    describes: 'one name written twice, where the first one wins',
    text: ['Subject: first', 'Subject: second', '', 'body', ''].join('\n'),
    reads: reads({ headers: { subject: 'first' }, text: 'body\n' }),
  },
  {
    id: 'unsupported-charset',
    describes: 'a charset outside the three this reader knows',
    text: [
      'Content-Type: text/plain; charset=shift_jis',
      '',
      READING_LINE,
      '',
    ].join('\n'),
    reads: reads({
      text: `${READING_LINE}\n`,
      warnings: ['unsupported charset "shift_jis"; decoded as utf-8'],
    }),
  },
  {
    id: 'unknown-transfer-encoding',
    describes: 'an encoding this reader has no decoder for',
    text: [
      'Content-Transfer-Encoding: uuencode',
      '',
      READING_LINE,
      '',
    ].join('\n'),
    reads: reads({
      text: `${READING_LINE}\n`,
      warnings: ['unknown content-transfer-encoding "uuencode"'],
    }),
  },
  {
    id: 'ignored-part-type',
    describes: 'a part that is not text, beside one that is',
    text: [
      `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
      '',
      `--${BOUNDARY}`,
      'Content-Type: application/octet-stream',
      '',
      'ZZZZ',
      `--${BOUNDARY}`,
      'Content-Type: text/plain',
      '',
      READING_LINE,
      `--${BOUNDARY}--`,
      '',
    ].join('\n'),
    reads: reads({
      text: READING_LINE,
      warnings: ['ignored part of type "application/octet-stream"'],
    }),
  },
  {
    id: 'two-plain-parts',
    describes: 'two plain parts, joined in the order the walk found them',
    text: [
      `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
      '',
      `--${BOUNDARY}`,
      'Content-Type: text/plain',
      '',
      'alpha',
      `--${BOUNDARY}`,
      'Content-Type: text/plain',
      '',
      'bravo',
      `--${BOUNDARY}--`,
      '',
    ].join('\n'),
    reads: reads({ text: 'alphabravo' }),
  },
  {
    id: 'other-text-type',
    describes: 'a text type that is neither plain nor html',
    text: [
      'Content-Type: text/csv; charset=utf-8',
      '',
      'station,rainfall_mm',
      '',
    ].join('\n'),
    reads: reads({ text: 'station,rainfall_mm\n' }),
  },
  {
    id: 'empty-content-type',
    describes: 'a type header declaring nothing, which is the default',
    text: ['Content-Type:', '', READING_LINE, ''].join('\n'),
    reads: reads({ text: `${READING_LINE}\n` }),
  },
  {
    id: 'base64-part',
    describes: 'a whole message whose one part is base64',
    text: [
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(READING_LINE, 'utf8').toString('base64'),
      '',
    ].join('\n'),
    reads: reads({ text: READING_LINE }),
  },
];

/** Every authored message in this file, in the order it is read. */
const AUTHORED_MESSAGES: readonly EmlCase[] = [
  ...TRUNCATED_MESSAGES,
  ...INTACT_MESSAGES,
];

// ---------------------------------------------------------------------------
// The nine sentences
// ---------------------------------------------------------------------------

/** One warning, and how to recognise it whatever it interpolates. */
interface WarningKind {
  /** Stable id a failure prints. */
  readonly id: string;

  /** The fixed part of the sentence, which is how it is found. */
  readonly opens: string;
}

/**
 * Every warning this library can produce, as a closed roster.
 *
 * Closed on purpose. A caller reads these sentences and routes on
 * them, so a fault path that stopped being reachable is a contract
 * change even when nothing throws — and the case below holds this
 * roster set-equal against what the inputs in this file actually
 * produce, in both directions. A sentence nothing produces fails
 * naming itself; a sentence produced by nothing on this list fails
 * the same way.
 */
const WARNING_KINDS: readonly WarningKind[] = [
  { id: 'coerced-input', opens: 'input was not a string or Buffer' },
  { id: 'no-separator', opens: 'no header/body separator found' },
  { id: 'missing-closing-boundary', opens: 'multipart missing closing' },
  { id: 'no-boundary', opens: 'multipart part has no boundary' },
  { id: 'too-deep', opens: 'multipart nested deeper than one level' },
  { id: 'unsupported-charset', opens: 'unsupported charset' },
  { id: 'unknown-encoding', opens: 'unknown content-transfer-encoding' },
  { id: 'ignored-part', opens: 'ignored part of type' },
  { id: 'parse-error', opens: 'parse error: ' },
];

/**
 * Every input this file drives, whatever kind of value it is.
 *
 * The adversarial roster is in here rather than only in its own
 * section, because two of the nine sentences are only reachable
 * through it: a value that is neither string nor `Buffer` is what
 * produces the coercion note, and one that refuses string conversion
 * is what produces the parse error.
 *
 * @returns One input per authored message, corpus entry and value.
 */
function everyInput(): unknown[] {
  return [
    ...AUTHORED_MESSAGES.map((entry) => entry.text),
    ...MULTIPART_MESSAGE_FIXTURES.map((fixture) => fixture.text),
    ...ADVERSARIAL_VALUES.map((entry) => entry.build()),
  ];
}

/**
 * Which warning kinds an input produced, by id.
 *
 * A sentence matching no kind answers `unregistered`, so the
 * set-equality below catches a new sentence rather than ignoring it.
 *
 * @param input - Whatever to read.
 * @returns The ids, with duplicates left in.
 */
function warningKindsOf(input: unknown): string[] {
  const produced = parseEml(input).parse_warnings ?? [];

  return produced.map((sentence) => {
    const kind = WARNING_KINDS.find((entry) => sentence.startsWith(entry.opens));

    return kind === undefined
      ? `unregistered: ${sentence}`
      : kind.id;
  });
}

// ---------------------------------------------------------------------------
// Truncated and boundary-less input, first
// ---------------------------------------------------------------------------

describe('parse-eml — a message that was cut short', () => {
  for (const entry of TRUNCATED_MESSAGES) {
    it(`reads ${entry.id}: ${entry.describes}`, () => {
      expect(parseEml(entry.text)).toStrictEqual(entry.reads);
    });
  }

  // The control under every reading above, and it is about the
  // BUILDER rather than about the library: a wrong default in `reads`
  // would agree with itself across all eighteen cases. Written out in
  // full for the one input whose whole answer is short enough to
  // read, so the defaults are asserted rather than assumed.
  it('is compared against readings a full literal agrees with', () => {
    expect(parseEml('')).toStrictEqual({
      headers: {
        from: '',
        to: '',
        subject: '',
        date: '',
        replyTo: '',
      },
      text: '',
      html: '',
      parse_warnings: ['no header/body separator found'],
    });
  });

  // A truncated container still answers with the parts it reached,
  // which is the whole argument for reporting rather than refusing.
  // Stated as its own claim because it is the one a careless repair
  // breaks first — a reader that bailed on the missing delimiter
  // would satisfy the warning assertion above and lose the part.
  it('keeps the parts it read before the message ran out', () => {
    const truncated = AUTHORED_MESSAGES.find(
      (entry) => entry.id === 'truncated-multipart',
    );

    expect(truncated?.reads.text).toBe(READING_LINE);
  });
});

// ---------------------------------------------------------------------------
// Messages that arrived whole
// ---------------------------------------------------------------------------

describe('parse-eml — a message that arrived whole', () => {
  for (const entry of INTACT_MESSAGES) {
    it(`reads ${entry.id}: ${entry.describes}`, () => {
      expect(parseEml(entry.text)).toStrictEqual(entry.reads);
    });
  }
});

// ---------------------------------------------------------------------------
// The sentences the contract is made of
// ---------------------------------------------------------------------------

describe('parse-eml — the warnings it reports instead of throwing', () => {
  it('produces every registered sentence and no unregistered one', () => {
    const produced = everyInput().flatMap(warningKindsOf);

    expect(sorted([...new Set(produced)])).toEqual(
      sorted(WARNING_KINDS.map((kind) => kind.id)),
    );
  });

  // The key's ABSENCE is the signal, so it gets a claim of its own
  // rather than riding on the strict comparisons above: a clean read
  // must not carry the key, and an empty array is a different answer.
  it('omits the key entirely when nothing went wrong', () => {
    const clean = parseEml(`Subject: Daily reading\n\n${READING_LINE}\n`);

    expect(Object.hasOwn(clean, 'parse_warnings')).toBe(false);
    expect(clean.parse_warnings).toBeUndefined();
  });

  // Order matters because a caller reading the first sentence is
  // reading what went wrong first. The coercion note is pushed before
  // the input has even been folded, so it precedes everything.
  it('reports the coercion before anything it caused', () => {
    const warnings = parseEml(9007199254740993n).parse_warnings ?? [];

    expect(warnings[0]).toBe('input was not a string or Buffer; coerced');
    expect(warnings).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

describe('parse-eml — headers', () => {
  it('unfolds a value across its continuation lines', () => {
    const message = [
      'To: Subscribers <readings@example.invalid>,',
      ' Archive <archive@example.invalid>',
      '',
      READING_LINE,
      '',
    ].join('\n');

    expect(parseEml(message).headers.to).toBe(
      'Subscribers <readings@example.invalid>, '
      + 'Archive <archive@example.invalid>',
    );
  });

  it('decodes a base64 encoded word', () => {
    const word = Buffer.from('Coastal Network', 'utf8').toString('base64');
    const message = `From: =?utf-8?B?${word}?=\n\n${READING_LINE}\n`;

    expect(parseEml(message).headers.from).toBe('Coastal Network');
  });

  it('decodes a quoted-printable word, underscore and escape alike', () => {
    const message = `Subject: =?iso-8859-1?Q?Caf=E9_note?=\n\n${READING_LINE}\n`;

    expect(parseEml(message).headers.subject).toBe(`Caf${HIGH_CHAR} note`);
  });

  // The gap between two encoded words is a wrapping artefact rather
  // than text, so the merge closes it. Worth its own case because the
  // result reads like a bug — two words separated by two spaces come
  // back with none — and the next reader should find the reason here.
  it('merges adjacent words, dropping the whitespace between them', () => {
    const message = [
      'Subject: =?utf-8?Q?Gauge?=  =?utf-8?Q?note?=',
      '',
      READING_LINE,
      '',
    ].join('\n');

    expect(parseEml(message).headers.subject).toBe('Gaugenote');
  });

  it('leaves a word whose encoding letter is neither B nor Q alone', () => {
    const written = '=?utf-8?X?QQ==?=';
    const message = `Subject: ${written}\n\n${READING_LINE}\n`;

    expect(parseEml(message).headers.subject).toBe(written);
  });

  // A base64 decode is lenient rather than refusing, so an unreadable
  // payload comes back as whatever bytes it could make. The expected
  // value is computed from the same rule rather than pasted, since a
  // pasted one would be a screenful of replacement characters nobody
  // could check.
  it('decodes an unreadable base64 payload rather than refusing it', () => {
    const payload = 'not!!base64';
    const message = `Subject: =?utf-8?B?${payload}?=\n\n${READING_LINE}\n`;

    expect(parseEml(message).headers.subject).toBe(
      Buffer.from(payload, 'base64').toString('utf8'),
    );
  });

  it('answers an empty string for every header the message omits', () => {
    expect(parseEml(`Subject: only one\n\n${READING_LINE}\n`).headers)
      .toStrictEqual({ ...NO_HEADERS, subject: 'only one' });
  });
});

// ---------------------------------------------------------------------------
// Bytes
// ---------------------------------------------------------------------------

describe('parse-eml — bytes, and what survives the fold', () => {
  /**
   * A message carrying one raw high byte, as bytes.
   *
   * Built through latin1 so the byte lands as itself: written through
   * UTF-8 the same character would be two bytes, which is a different
   * message and would not test anything.
   *
   * @param charset - The label the part declares.
   * @returns The message, as a `Buffer`.
   */
  function highByteMessage(charset: string): Buffer {
    return Buffer.from(
      `Content-Type: text/plain; charset=${charset}\n\nCaf${HIGH_CHAR}\n`,
      'latin1',
    );
  }

  it('recovers a raw high byte a latin1 part declared', () => {
    expect(parseEml(highByteMessage('iso-8859-1')).text)
      .toBe(`Caf${HIGH_CHAR}\n`);
  });

  // The control for the case above, and the reason the fold has to be
  // latin1 rather than UTF-8: the SAME byte under a UTF-8 declaration
  // is not valid UTF-8 and reads as a replacement character. A reader
  // that had already lost the byte would answer this way for both.
  it('answers a replacement character when utf-8 was declared', () => {
    expect(parseEml(highByteMessage('utf-8')).text)
      .toBe(`Caf${REPLACEMENT_CHAR}\n`);
  });

  it('reads a quoted-printable escape and a soft break together', () => {
    const message = Buffer.from(
      'Content-Type: text/plain; charset=iso-8859-1\r\n'
      + 'Content-Transfer-Encoding: quoted-printable\r\n'
      + '\r\nCaf=E9 and a soft =\r\nbreak\r\n',
      'latin1',
    );

    expect(parseEml(message).text).toBe(`Caf${HIGH_CHAR} and a soft break\n`);
  });

  it('reads base64 whose bytes are latin1 rather than utf-8', () => {
    const payload = Buffer.from(`Caf${HIGH_CHAR}`, 'latin1');
    const message = [
      'Content-Type: text/plain; charset=iso-8859-1',
      'Content-Transfer-Encoding: base64',
      '',
      payload.toString('base64'),
      '',
    ].join('\n');

    expect(parseEml(message).text).toBe(`Caf${HIGH_CHAR}`);
  });

  // A string input takes a different first step from a Buffer — it is
  // encoded as UTF-8 before the fold rather than mapped straight
  // across — so the two routes are asserted to meet.
  it('reads a utf-8 string and its bytes to the same answer', () => {
    const written = 'Content-Type: text/plain; charset=utf-8\n\n'
      + `Caf${HIGH_CHAR}\n`;

    expect(parseEml(written)).toStrictEqual(
      parseEml(Buffer.from(written, 'utf8')),
    );
  });

  // Every byte value in one part, so no single one is lost, doubled
  // or folded into another on the way through. The length claim is
  // what catches a fold that merged a pair, and the equality is what
  // catches one that changed a byte.
  //
  // The expectation is the body with one substitution rather than the
  // body itself, and that substitution is the only rewrite this
  // reader performs on a body: a lone carriage return becomes a line
  // feed, before any split, so that a boundary rule and a header rule
  // each have one separator to look for. Writing the expectation this
  // way asserts BOTH halves at once — that the rewrite happens, and
  // that nothing else does.
  it('carries all 256 byte values through a latin1 part', () => {
    const body = Buffer.from(Array.from({ length: 256 }, (_, at) => at));
    const message = Buffer.concat([
      Buffer.from('Content-Type: text/plain; charset=iso-8859-1\n\n', 'latin1'),
      body,
    ]);
    const folded = Buffer.from(body.map(foldCarriageReturn));
    const read = parseEml(message).text;

    expect(read).toHaveLength(body.length);
    expect(Buffer.from(read, 'latin1').equals(folded)).toBe(true);
    expect(folded.equals(body)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The header this drops without saying so
// ---------------------------------------------------------------------------

describe('parse-eml — a header named for the prototype', () => {
  /** The same message with and without the header in question. */
  const WITH_PROTO = [
    '__proto__: text/html',
    'Subject: Daily reading',
    '',
    READING_LINE,
    '',
  ].join('\n');

  /** The same message with that line removed and nothing else. */
  const WITHOUT_PROTO = [
    'Subject: Daily reading',
    '',
    READING_LINE,
    '',
  ].join('\n');

  // A RECORD rather than a pin, and the module header says why: the
  // drop is real and it is invisible through this export, since only
  // seven header names are ever read and this is not one of them. So
  // what can be asserted is that the line changes nothing — which is
  // the reading a future task exposing the header map needs to have
  // written down somewhere it will look.
  it('reads a message carrying it exactly as one without it', () => {
    expect(parseEml(WITH_PROTO)).toStrictEqual(parseEml(WITHOUT_PROTO));
  });

  // The control for the case above: the two messages differ by that
  // one line and by nothing else, so the equality is about the header
  // rather than about two strings somebody let drift together.
  it('is compared against a message differing by that line alone', () => {
    expect(WITH_PROTO.split('\n').slice(1)).toEqual(WITHOUT_PROTO.split('\n'));
  });

  // Nothing reached the result's own prototype either. Cheap, and it
  // is the half a reader actually worries about on meeting the name.
  it('leaves the answer an ordinary object', () => {
    expect(Object.getPrototypeOf(parseEml(WITH_PROTO))).toBe(Object.prototype);
  });
});

// ---------------------------------------------------------------------------
// The shared corpus
// ---------------------------------------------------------------------------

/** Every corpus entry, and the whole reading it answers with. */
const CORPUS_READINGS: readonly EmlCase[] = [
  {
    id: 'eml-multipart-alternative',
    describes: 'both alternatives kept, and the recipient list unfolded',
    text: fixtureById(MULTIPART_MESSAGE_FIXTURES, 'eml-multipart-alternative')
      .text,
    reads: reads({
      headers: {
        from: 'Coastal Network <bulletins@example.invalid>',
        to: 'Subscribers <readings@example.invalid>, '
          + 'Archive <archive@example.invalid>',
        subject: 'Daily reading',
        date: 'Wed, 12 Aug 2026 06:00:00 +0000',
        replyTo: 'no-reply@example.invalid',
      },
      text: `${READING_LINE}\n`,
      html: `<p>${READING_LINE}</p>\n`,
    }),
  },
  {
    id: 'eml-quoted-printable',
    describes: 'the soft break closed, the high byte kept, the equals left',
    text: fixtureById(MULTIPART_MESSAGE_FIXTURES, 'eml-quoted-printable').text,
    reads: reads({
      headers: {
        from: 'Coastal Network <bulletins@example.invalid>',
        subject: 'Gauge note',
      },
      text: `A soft break splits this line, and ${HIGH_CHAR} is one high `
        + 'byte.\nAn equals with no hex =zz stays literal.\n',
    }),
  },
  {
    id: 'eml-encoded-word-headers',
    describes: 'both word encodings, and the merged pair with no gap',
    text: fixtureById(MULTIPART_MESSAGE_FIXTURES, 'eml-encoded-word-headers')
      .text,
    reads: reads({
      headers: {
        from: 'Coastal Network <bulletins@example.invalid>',
        subject: `Gauge note${HIGH_CHAR}tat`,
      },
      text: `${READING_LINE}\n`,
    }),
  },
  {
    id: 'eml-nested-multipart',
    describes: 'a part two containers deep, which is as deep as it goes',
    text: fixtureById(MULTIPART_MESSAGE_FIXTURES, 'eml-nested-multipart').text,
    reads: reads({
      headers: { from: 'Coastal Network <bulletins@example.invalid>' },
      text: 'A part two boundaries deep.\n',
    }),
  },
  {
    id: 'eml-missing-boundary',
    describes: 'no part found, and the missing close reported',
    text: fixtureById(MULTIPART_MESSAGE_FIXTURES, 'eml-missing-boundary').text,
    reads: reads({
      headers: { from: 'Coastal Network <bulletins@example.invalid>' },
      warnings: ['multipart missing closing boundary "ar-parity-absent"'],
    }),
  },
  {
    id: 'eml-no-separator',
    describes: 'headers kept, no body, and the separator reported missing',
    text: fixtureById(MULTIPART_MESSAGE_FIXTURES, 'eml-no-separator').text,
    reads: reads({
      headers: {
        from: 'Coastal Network <bulletins@example.invalid>',
        subject: 'Headers and nothing else',
      },
      warnings: ['no header/body separator found'],
    }),
  },
];

describe('parse-eml — the shared corpus', () => {
  for (const entry of CORPUS_READINGS) {
    it(`reads ${entry.id}: ${entry.describes}`, () => {
      expect(parseEml(entry.text)).toStrictEqual(entry.reads);
    });
  }

  // The table above is written here and the entries come from there,
  // so the two can drift. Held set-equal in both directions: an entry
  // added to the corpus fails here naming itself rather than going
  // undriven, and one removed fails rather than lingering.
  it('drives every entry the corpus holds and no other', () => {
    expect(sorted(CORPUS_READINGS.map((entry) => entry.id))).toEqual(
      sorted(MULTIPART_MESSAGE_FIXTURES.map((fixture) => fixture.id)),
    );
  });
});

// ---------------------------------------------------------------------------
// The contract underneath all of it
// ---------------------------------------------------------------------------

describe('parse-eml — it never throws', () => {
  /**
   * Whether a call answered, and what it said if it did not.
   *
   * A string rather than a boolean so a failure prints the sentence
   * that arrived instead of `true !== false`, which for a library
   * whose contract is that it never throws is the whole diagnosis.
   *
   * @param input - Whatever to read.
   * @returns The empty string, or what was thrown.
   */
  function endingOf(input: unknown): string {
    try {
      parseEml(input);
    } catch (error) {
      return error instanceof Error
        ? `threw: ${error.message}`
        : `threw a non-Error: ${String(error)}`;
    }

    return '';
  }

  it('answers for every input in this file and in the corpus', () => {
    const endings = everyInput().map(endingOf);

    expect(endings.filter((ending) => ending !== '')).toEqual([]);
  });

  // The case above walks a list, so an emptied list passes it having
  // read nothing. Held to a floor and to the members whose reading is
  // distinct — a truncated container, absence, and the one value that
  // refuses to become a string at all.
  it('is driven over a set that still holds its edge inputs', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('undefined');
    expect(ids).toContain('symbol');
    expect(ids).toContain('hostile-string-conversion');
    expect(AUTHORED_MESSAGES.map((entry) => entry.id))
      .toContain('truncated-multipart');
    expect(everyInput().length).toBeGreaterThan(25);
  });
});
