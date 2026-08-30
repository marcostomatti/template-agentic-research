/**
 * Full parity for `src/lib/parse-eml.ts`: the one export, driven
 * against its original over one neutral corpus.
 *
 * The port claims behaviour preservation, and its module TSDoc names
 * four things it drops — none of them behaviour. This file is what
 * makes that a measurement rather than an assertion. Every comparison
 * hands both implementations the same input and diffs what came back,
 * so a divergence is reported by path and by kind rather than as a
 * failed expectation somebody has to reconstruct.
 *
 * ONE export is driven, which is the whole export surface: the origin
 * assigns a single function to its module object. That makes the
 * comparison narrower than `parse-csv.parity.test.ts`'s and the
 * inputs correspondingly wider — everything this library does happens
 * behind one call, so the only way to reach the boundary walk, the
 * charset step or the quoted-printable dialect is to write a message
 * that goes there.
 *
 * The answer compared is the WHOLE result, `parse_warnings` included,
 * and that list is the larger half of what a port of this library can
 * get wrong. A reader that dropped a fault path still answers with
 * the same headers and the same text; only the warnings move. So a
 * comparison reading `text` and `html` alone would pass for a port
 * that silently stopped reporting a truncated container.
 *
 * Both sides run through {@link outcomeOf} even though neither is
 * meant to throw, and that is the point rather than an oversight: a
 * comparison reading only the value a call returned passes for a port
 * that throws where the original answered, which for a library whose
 * first sentence is that it never throws would be the single worst
 * regression available. Turning either ending into a value is what
 * makes that claim something the differ can report on.
 *
 * That arrangement needs a control, and it is the one
 * `parse-csv.parity.test.ts` carries rather than `yaml-lite`'s. There
 * the corpus had to produce BOTH endings or a suite comparing two
 * refusals would agree having read nothing. Here the contract is that
 * exactly ONE ending is reachable, so the control is that the port
 * answers for every input driven — plus that the driven set still
 * produces readings of both kinds, since a set that had drifted into
 * messages nothing can be read out of would agree perfectly over
 * nothing.
 *
 * `Buffer` inputs are driven beside string ones, and only here. That
 * is the runtime shape, and it is the only route to the byte path:
 * a lone high byte is not valid UTF-8, so a port whose fold was not
 * byte-faithful answers identically for every string in the corpus
 * and differently for the first `Buffer` carrying one.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and a
 * load up there would throw on every run that armed nothing — CI's
 * included.
 */
import { expect, it } from 'vitest';

import { parseEml } from '../../src/lib/parse-eml.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { ADVERSARIAL_VALUES, MULTIPART_MESSAGE_FIXTURES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/parse-eml.js';

/** The one entry point this file drives. */
const ENTRY_POINTS: readonly string[] = ['parseEml'];

/** What the origin module has to be for this file to drive it. */
interface ParseEmlOrigin {
  /** Reads a message into its headers and its two text bodies. */
  readonly parseEml: (raw: unknown) => unknown;
}

/** Whether every entry point is there and is callable. */
function isParseEmlOrigin(value: unknown): value is ParseEmlOrigin {
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
 * missing its export would otherwise be called as `undefined` and
 * every comparison below would diff one thrown TypeError against
 * another, which is agreement nobody established.
 *
 * @returns The origin module, with its entry point callable.
 */
function originParseEml(): ParseEmlOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isParseEmlOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export ${ENTRY_POINTS.join(', ')} `
      + 'as a function.',
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
 * Drive both implementations over one input.
 *
 * Each side gets its own value from `build` rather than a shared one.
 * Nothing here is expected to mutate what it is handed, and a shared
 * `Buffer` is exactly where that assumption would cost a divergence
 * neither implementation caused.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin module.
 * @param build - Makes a fresh input for whichever side asks.
 * @returns Every comparison that parted.
 */
function compareBoth(
  over: string,
  origin: ParseEmlOrigin,
  build: () => unknown,
): LabelledDivergence[] {
  return compare(
    over,
    outcomeOf(() => origin.parseEml(build())),
    outcomeOf(() => parseEml(build())),
  );
}

// ---------------------------------------------------------------------------
// The messages beyond the shared corpus
// ---------------------------------------------------------------------------

/** The delimiter most authored containers declare. */
const BOUNDARY = 'ar-parity-case';

/** One prose line, so no message has to invent subject matter. */
const READING_LINE = 'Station alpha measured 0 mm overnight.';

/**
 * A byte that is a character in latin1 and half of one in UTF-8.
 *
 * A number rather than a glyph, for the reason the corpus gives about
 * invisible characters: a reviewer can check a code point.
 */
const HIGH_BYTE = 0xe9;

/** That byte as the character latin1 says it is. */
const HIGH_CHAR = String.fromCharCode(HIGH_BYTE);

/**
 * Every message worth driving that the corpus has no entry for.
 *
 * The corpus holds messages written to demonstrate the paths a
 * multipart walk takes, so these are deliberately wider: the places a
 * MIME reader can be subtly wrong without any well-formed message
 * noticing. What counts as a header line, which occurrence of a name
 * wins, what a container declaring an unusable boundary does, how
 * deep the walk goes, what becomes of an escape that is not one, and
 * which part types reach which accumulator.
 */
const AUTHORED_MESSAGES: readonly string[] = [
  '', '\n', '\r', '\r\n', '\n\n', `\n${READING_LINE}`,
  'not a header at all\n\nbody',
  ': value\n\nbody',
  '   : value\n\nbody',
  `__proto__: x\nSubject: s\n\n${READING_LINE}`,
  `__proto__: x\n__proto__: y\nSubject: s\n\n${READING_LINE}`,
  `constructor: x\nSubject: s\n\n${READING_LINE}`,
  `toString: x\nSubject: s\n\n${READING_LINE}`,
  'Subject: first\nSubject: second\n\nbody',
  'Subject: one\n two\n\tthree\n\nbody',
  'Reply-To: no-reply@example.invalid\n\nbody',
  'Content-Type:\n\nbody',
  'Content-Type:    \n\nbody',
  'Content-Type: application/pdf\n\nbody',
  'Content-Type: image/png\n\nbody',
  'Content-Type: text/csv\n\nstation,rainfall_mm\n',
  'Content-Type: text/html\n\n<p>a reading</p>\n',
  'CONTENT-TYPE: TEXT/HTML\n\n<p>a reading</p>\n',
  'Content-Type: text/plain; charset=shift_jis\n\nbody',
  'Content-Type: text/plain; charset="utf-8"\n\nbody',
  'Content-Type: text/plain; charset=""\n\nbody',
  'Content-Type: text/plain; charset=  \n\nbody',
  'Content-Transfer-Encoding: uuencode\n\nbody',
  'Content-Transfer-Encoding: 7bit\n\nbody',
  'Content-Transfer-Encoding:\n\nbody',
  'Content-Transfer-Encoding: base64\n\naGVsbG8=\n',
  'Content-Transfer-Encoding: base64\n\n!!!!not base64!!!!\n',
  'Content-Transfer-Encoding: quoted-printable\n\nabc=',
  'Content-Transfer-Encoding: quoted-printable\n\nabc=z',
  'Content-Transfer-Encoding: quoted-printable\n\na_b\n',
  'Content-Type: multipart/mixed\n\nbody',
  'Content-Type: multipart/mixed; boundary=""\n\nbody',
  'Content-Type: multipart/mixed; boundary="   "\n\nbody',
  `Content-Type: multipart/mixed; boundary=${BOUNDARY}\n\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n\nhi\n--${BOUNDARY}--\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n\nhi\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\npreamble\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n\nhi\n--${BOUNDARY}--\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n\nalpha\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n\nbravo\n--${BOUNDARY}--\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`
  + `--${BOUNDARY}\nContent-Type: text/html\n\n<p>1</p>\n`
  + `--${BOUNDARY}\nContent-Type: text/html\n\n<p>2</p>\n--${BOUNDARY}--\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`
  + `--${BOUNDARY}\n\nno headers on this part\n--${BOUNDARY}--\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n--${BOUNDARY}--\n`,
  `Content-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`
  + `--${BOUNDARY}\nContent-Type: application/octet-stream\n\nZZZZ\n`
  + `--${BOUNDARY}\nContent-Type: text/plain\n\nhi\n--${BOUNDARY}--\n`,
  'Content-Type: multipart/mixed; boundary="o"\n\n--o\n'
  + 'Content-Type: multipart/alternative; boundary="i"\n\n--i\n'
  + 'Content-Type: text/plain\n\ndeep\n--i--\n\n--o--\n',
  'Content-Type: multipart/mixed; boundary="o"\n\n--o\n'
  + 'Content-Type: multipart/alternative; boundary="i"\n\n--i\n'
  + 'Content-Type: multipart/related; boundary="z"\n\n--z\n'
  + 'Content-Type: text/plain\n\ntoo deep\n--z--\n\n--i--\n\n--o--\n',
  'Subject: =?utf-8?B?not!!base64?=\n\nbody',
  'Subject: =?shift_jis?B?QQ==?=\n\nbody',
  'Subject: =?utf-8?Q?a?=   =?utf-8?Q?b?=\n\nbody',
  'Subject: =?utf-8?Q?a?=\t=?utf-8?Q?b?=\n\nbody',
  'Subject: =?utf-8?B??=\n\nbody',
  'Subject: =?utf-8?b?QQ==?=\n\nbody',
  'Subject: =?utf-8?q?A_B?=\n\nbody',
  'Subject: =?utf-8?X?QQ==?=\n\nbody',
  'From: =?utf-8?Q?Caf=C3=A9?= <bulletins@example.invalid>\n\nbody',
  'Subject: s\r\nFrom: f\r\n\r\nbody\r\nmore\r\n',
  'Subject: s\rFrom: f\r\rbody\r',
  'Subject: s\nFrom: f',
];

// ---------------------------------------------------------------------------
// The messages that are bytes
// ---------------------------------------------------------------------------

/** One byte-level message, and how to make a fresh one. */
interface ByteMessage {
  /** Stable id a failure prints in place of the message. */
  readonly id: string;

  /** What byte-level shape it stands for. */
  readonly describes: string;

  /** Makes a fresh `Buffer`, referenced by nothing else. */
  readonly build: () => Buffer;
}

/**
 * A message carrying one raw high byte, as bytes.
 *
 * Built through latin1 so the byte lands as itself. Written through
 * UTF-8 the same character is two bytes, which is a different message
 * and would test nothing.
 *
 * @param charset - The label the part declares.
 * @returns The message.
 */
function highByteMessage(charset: string): Buffer {
  return Buffer.from(
    `Content-Type: text/plain; charset=${charset}\n\nCaf${HIGH_CHAR}\n`,
    'latin1',
  );
}

/**
 * Every message driven as bytes rather than as text.
 *
 * The last entry is the exhaustive one and the reason the others are
 * worth having anyway: 256 distinct bytes in one part says whether
 * anything was lost or rewritten, and the entries above it say which
 * DECLARED path a loss would have come down.
 */
const BYTE_MESSAGES: readonly ByteMessage[] = [
  {
    id: 'byte-latin1-declared',
    describes: 'a raw high byte under the charset that reads it',
    build: () => highByteMessage('iso-8859-1'),
  },
  {
    id: 'byte-utf8-declared',
    describes: 'the same byte under a charset it is not valid in',
    build: () => highByteMessage('utf-8'),
  },
  {
    id: 'byte-quoted-printable',
    describes: 'an escape and a soft break over real line endings',
    build: () => Buffer.from(
      'Content-Type: text/plain; charset=iso-8859-1\r\n'
      + 'Content-Transfer-Encoding: quoted-printable\r\n'
      + '\r\nCaf=E9 and a soft =\r\nbreak\r\n',
      'latin1',
    ),
  },
  {
    id: 'byte-base64-latin1',
    describes: 'base64 whose bytes are latin1 rather than utf-8',
    build: () => Buffer.from(
      'Content-Type: text/plain; charset=iso-8859-1\n'
      + 'Content-Transfer-Encoding: base64\n\n'
      + `${Buffer.from(`Caf${HIGH_CHAR}`, 'latin1').toString('base64')}\n`,
      'latin1',
    ),
  },
  {
    id: 'byte-empty',
    describes: 'no bytes at all, which is not the same as no input',
    build: () => Buffer.alloc(0),
  },
  {
    id: 'byte-every-value',
    describes: 'all 256 byte values in one part, none of them spared',
    build: () => Buffer.concat([
      Buffer.from('Content-Type: text/plain; charset=iso-8859-1\n\n', 'latin1'),
      Buffer.from(Array.from({ length: 256 }, (_, at) => at)),
    ]),
  },
];

// ---------------------------------------------------------------------------
// What the port makes of the driven set, read for the controls
// ---------------------------------------------------------------------------

/**
 * Every input this file drives, as builders.
 *
 * Builders rather than values, because the byte messages and the
 * adversarial values are both built per call and the controls have to
 * read the same set the comparisons do.
 *
 * @returns One builder per driven input.
 */
function everyInput(): (() => unknown)[] {
  return [
    ...MULTIPART_MESSAGE_FIXTURES.map((fixture) => () => fixture.text),
    ...AUTHORED_MESSAGES.map((text) => () => text),
    ...BYTE_MESSAGES.map((entry) => entry.build),
    ...ADVERSARIAL_VALUES.map((entry) => entry.build),
  ];
}

/**
 * What the PORT read out of each driven input.
 *
 * Read off the port rather than the origin, because that is what a
 * control needs: the origin is the thing under measurement, and a
 * control read off it would be asking the subject to vouch for the
 * inputs.
 *
 * @returns One reading per driven input.
 */
function portReadings(): ReturnType<typeof parseEml>[] {
  return everyInput().map((build) => parseEml(build()));
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('parse-eml — the origin the comparisons read', () => {
  it('exports the entry point this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isParseEmlOrigin(loaded)).toBe(true);
  });

  // This library's whole contract in one case: it answers for
  // anything, so a run where the port refused something would mean
  // the comparisons had started diffing one exception against
  // another and agreeing about it.
  it('is driven over inputs the port never refuses', () => {
    const refused = everyInput()
      .filter((build) => outcomeOf(() => parseEml(build())).refused);

    expect(refused).toEqual([]);
  });

  // The other half of the control, and it is about the INPUTS. A set
  // that had drifted into messages nothing reads out of would agree
  // perfectly having read nothing, so the driven set is held to
  // producing all four readings the comparisons can distinguish:
  // text, html, a reported fault, and a clean read.
  it('is driven over inputs that reach every part of a reading', () => {
    const readings = portReadings();

    expect(readings.some((read) => read.text !== '')).toBe(true);
    expect(readings.some((read) => read.html !== '')).toBe(true);
    expect(readings.some((read) => read.parse_warnings !== undefined))
      .toBe(true);
    expect(readings.some((read) => read.parse_warnings === undefined))
      .toBe(true);
  });
});

describePortParity('parse-eml — the message corpus', () => {
  for (const fixture of MULTIPART_MESSAGE_FIXTURES) {
    it(`agrees over ${fixture.id}`, () => {
      const origin = originParseEml();

      expect(compareBoth(fixture.id, origin, () => fixture.text)).toEqual([]);
    });
  }
});

describePortParity('parse-eml — the messages no corpus holds', () => {
  // One case over the whole roster rather than one per message. A
  // divergence here is a difference in how a SHAPE is read, and the
  // set of messages that moved together is the reading a failure
  // needs — one case per message would report whichever ran first
  // and leave the shape of the drift to be reconstructed.
  it('agrees over every authored message', () => {
    const origin = originParseEml();
    const apart = AUTHORED_MESSAGES.flatMap(
      (text) => compareBoth(JSON.stringify(text), origin, () => text),
    );

    expect(apart).toEqual([]);
  });

  // The roster is walked, so an emptied roster passes the case above
  // without comparing anything. Held against its own membership: the
  // shapes a reader would expect to find are asserted present, and
  // the count is asserted only as a floor.
  it('is driven over a roster that still holds its edge shapes', () => {
    expect(AUTHORED_MESSAGES).toContain('');
    expect(AUTHORED_MESSAGES).toContain('Content-Type:\n\nbody');
    expect(AUTHORED_MESSAGES).toContain('Subject: s\rFrom: f\r\rbody\r');
    expect(AUTHORED_MESSAGES).toContain(
      'Content-Type: multipart/mixed; boundary="   "\n\nbody',
    );
    expect(AUTHORED_MESSAGES.length).toBeGreaterThan(50);
  });
});

describePortParity('parse-eml — messages driven as bytes', () => {
  for (const entry of BYTE_MESSAGES) {
    it(`agrees over ${entry.id}: ${entry.describes}`, () => {
      const origin = originParseEml();

      expect(compareBoth(entry.id, origin, entry.build)).toEqual([]);
    });
  }

  // The byte cases only mean something if the bytes reached the
  // reading, so the control is that the port's answer for the
  // exhaustive entry is as long as the part it was given. A fold that
  // had gone through UTF-8 would come back shorter, and every
  // comparison above would still agree if the origin's had too.
  it('is driven over a part whose bytes survive to the reading', () => {
    const everyValue = BYTE_MESSAGES.find(
      (entry) => entry.id === 'byte-every-value',
    );
    const read = parseEml(everyValue?.build()).text;

    expect(read).toHaveLength(256);
    expect(read.charCodeAt(HIGH_BYTE)).toBe(HIGH_BYTE);
  });
});

describePortParity('parse-eml — input that is not a message', () => {
  // The guard in front of the entry point is the only thing standing
  // between a Code node's absent field and a crash inside a string
  // method, and it is the one part of this library a type annotation
  // makes invisible: the compiler will never let a caller here reach
  // it, and the spliced copy runs where no type was ever checked. So
  // it is driven over the shared adversarial roster, each value built
  // fresh for each side.
  it('agrees over every adversarial value', () => {
    const origin = originParseEml();
    const apart = ADVERSARIAL_VALUES.flatMap(
      (entry) => compareBoth(entry.id, origin, entry.build),
    );

    expect(apart).toEqual([]);
  });

  // The roster is walked, and it is a shared one this file does not
  // own. Held to the members whose reading here is distinct: absence
  // must reach the coercion warning, and the value that refuses
  // string conversion is the only input in this whole file that
  // reaches the parse-error path at all.
  it('is driven over a roster holding absence and a refusal', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('null');
    expect(ids).toContain('undefined');
    expect(ids).toContain('hostile-string-conversion');
    expect(ids).toContain('symbol');
  });
});
