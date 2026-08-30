/**
 * Full parity for `src/sources/html-text.ts`: all three exports,
 * driven against their originals over one neutral corpus.
 *
 * The port claims behaviour preservation and its module TSDoc names
 * what it drops — the CommonJS export block, `var`, a declaration
 * prefix, one own-property test written the modern way, and six
 * rosters lifted out of the patterns that read them. None of that is
 * behaviour, and this file is what makes the claim a measurement
 * rather than an assertion. Every comparison hands both
 * implementations the same input and diffs what came back, so a
 * divergence is reported by path and by kind rather than as a failed
 * expectation somebody has to reconstruct.
 *
 * The roster substitution is the reason the exhaustive leg is here
 * rather than optional. Four tag alternations and two character
 * classes were re-authored as lists, and a list that lost a member,
 * gained one, or spelled one differently produces a pattern that is
 * right about almost every document — the reduction still works, the
 * cases below still read plausibly, and one element out of eighteen
 * stops ending a line. A walk over every short string built from the
 * characters the passes branch on is what finds that, because the
 * inputs that separate two nearly-identical patterns are short by
 * construction.
 *
 * All three exports go through {@link outcomeOf}, and the reason
 * differs per export, which is why none of them is exempt. Two of the
 * three catch everything and answer `''`, so a comparison reading
 * only the returned value would pass for a port that threw where the
 * original answered — the worst regression available to a library
 * whose whole promise is that malformed input comes back as text. The
 * third catches nothing, so its refusal IS its behaviour on any value
 * that will not become a string, and comparing the refusals is the
 * only way that half is driven at all.
 *
 * That arrangement needs controls, and here it takes three, one per
 * way this file could agree having measured nothing. The port must
 * ANSWER for every text driven through the two catching exports,
 * since a run where one refused would mean the comparisons had
 * started diffing one exception against another. The adversarial
 * roster must produce BOTH endings through the third export, or the
 * refusal half of the wrapper is never exercised. And the driven
 * texts must include documents the port CHANGES and documents it
 * leaves alone — a corpus that had drifted into plain prose would
 * agree perfectly having reduced nothing at all.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and a
 * load up there would throw on every run that armed nothing — CI's
 * included.
 */
import { expect, it } from 'vitest';

import {
  decodeHtmlEntities,
  htmlToText,
  tidyText,
} from '../../src/sources/html-text.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import {
  ADVERSARIAL_VALUES,
  INVISIBLE_CODE_POINTS,
  INVISIBLE_TEXT_FIXTURE,
  MARKUP_FIXTURES,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin module, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 *
 * Two segments rather than one, because the original keeps its source
 * adapters in a directory of their own and this module sits with
 * them — which is the same reason the port sits in `src/sources/`.
 */
const ORIGIN_MODULE_PATH = 'lib/sources/html-text.js';

/** The three entry points this file drives, in sorted order. */
const ENTRY_POINTS: readonly string[] = [
  'decodeHtmlEntities', 'htmlToText', 'tidyText',
];

/** What the origin module has to be for this file to drive it. */
interface HtmlTextOrigin {
  /** Reduces markup to plain text. */
  readonly htmlToText: (html: string) => unknown;

  /** Resolves entity references in one scan. */
  readonly decodeHtmlEntities: (text: string) => unknown;

  /** Normalizes whitespace and collapses blank lines. */
  readonly tidyText: (text: string) => unknown;
}

/** Whether every entry point is there and is callable. */
function isHtmlTextOrigin(value: unknown): value is HtmlTextOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exports = value as Record<string, unknown>;

  return ENTRY_POINTS.every((name) => typeof exports[name] === 'function');
}

/**
 * The origin module, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a module
 * missing an export would otherwise be called as `undefined` and every
 * comparison below would diff one thrown TypeError against another,
 * which is agreement nobody established.
 *
 * @returns The origin module, with all three entry points callable.
 */
function originHtmlText(): HtmlTextOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isHtmlTextOrigin(loaded)) {
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

  /** Which export they parted through. */
  readonly through: string;

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
 * One export, as a pair of functions to drive.
 *
 * Named rather than passed as two arguments so the roster below reads
 * as a table: an export missing from it is visible, where a missing
 * call in a chain of three is not.
 */
interface EntryPointPair {
  /** The export's name, which a failure prints. */
  readonly name: string;

  /** The port's implementation. */
  readonly port: (text: string) => unknown;

  /** How to reach the origin's. */
  readonly origin: (module: HtmlTextOrigin) => (text: string) => unknown;
}

/**
 * All three exports, each driven over every input this file holds.
 *
 * Driving all three over the SAME inputs rather than giving each its
 * own set is deliberate. The reduction calls the other two, so an
 * input that separates two implementations of the decode separates
 * them through the reduction as well — and a divergence reported
 * through one export and not another is the diagnosis, since it names
 * which pass moved.
 */
const ENTRY_POINT_PAIRS: readonly EntryPointPair[] = [
  {
    name: 'htmlToText',
    port: htmlToText,
    origin: (module) => module.htmlToText,
  },
  {
    name: 'decodeHtmlEntities',
    port: decodeHtmlEntities,
    origin: (module) => module.decodeHtmlEntities,
  },
  {
    name: 'tidyText',
    port: tidyText,
    origin: (module) => module.tidyText,
  },
];

/**
 * Drive both implementations of every export over one input.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin module.
 * @param input - What to hand both sides, which need not be a string.
 * @returns Every comparison that parted.
 */
function compareEveryExport(
  over: string,
  origin: HtmlTextOrigin,
  input: unknown,
): LabelledDivergence[] {
  const text = input as string;

  return ENTRY_POINT_PAIRS.flatMap((pair) => {
    const found = firstDivergence(
      outcomeOf(() => pair.origin(origin)(text)),
      outcomeOf(() => pair.port(text)),
    );

    return found === null
      ? []
      : [{
        over,
        through: pair.name,
        at: found.path,
        reason: found.reason,
        origin: found.origin,
        port: found.port,
      }];
  });
}

// ---------------------------------------------------------------------------
// The inputs beyond the shared corpus
// ---------------------------------------------------------------------------

/**
 * Every tag name any of the four rosters carries, plus the ones none
 * of them do.
 *
 * This is the leg the port's roster substitution owes. Four
 * alternations were lifted out of their patterns and re-authored as
 * lists, so a name dropped, added or misspelled changes what ends a
 * line for exactly one element — a difference no readable document
 * would notice and this walk cannot miss.
 *
 * The last five are the control: `a`, `b`, `span`, `img` and `em` are
 * in no roster at all, so they must be removed as ordinary tags,
 * leaving their content joined to whatever surrounded it. A
 * substitution that had widened a roster shows up there rather than
 * in the members.
 */
const EVERY_TAG_NAME: readonly string[] = [
  'script', 'style', 'head', 'noscript', 'iframe', 'svg', 'template',
  'p', 'div', 'ul', 'ol', 'li', 'tr', 'td', 'th', 'table',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7',
  'blockquote', 'section', 'article', 'header', 'footer', 'pre',
  'dl', 'dd', 'dt', 'hr', 'br',
  'a', 'b', 'span', 'img', 'em',
];

/**
 * Every document built from a tag name, in the four shapes a roster
 * can be wrong about.
 *
 * Closed, unclosed, carrying an attribute, and closed with a space
 * before its bracket — the last because two of the four patterns end
 * with a whitespace-tolerant close and the other two do not.
 *
 * @returns One document per name per shape.
 */
function everyTagDocument(): string[] {
  return EVERY_TAG_NAME.flatMap((name) => [
    `before<${name}>inside</${name}>after`,
    `before<${name}>inside and nothing closes it`,
    `before<${name} class="x" id="y">inside</${name}>after`,
    `before<${name}>inside</${name} >after`,
  ]);
}

/**
 * Every document worth driving that the corpus has no entry for.
 *
 * The corpus holds documents written to show what the reductions in
 * this platform do to markup, so these are deliberately narrower:
 * the places a pass can be subtly wrong without any readable document
 * noticing. Where a pattern starts and stops, what a removed tag
 * leaves behind, how the entity scan reads a reference that is nearly
 * one, and every ordering in which the tidy chain's seven passes can
 * reach each other.
 */
const AUTHORED_DOCUMENTS: readonly string[] = [
  '', ' ', '\n', '\r', '\r\n', '\t', '<', '>', '<>', '</>', '<!',
  '<!->', '<!-- -->', '<!--', '<!-- a > b -->c', '-->orphan',
  '<p>', '</p>', '<p/>', '<p />', '<P>upper</P>', '<p\n>newline</p>',
  '<img alt="a > b">tail', '<img alt=\'a > b\'>tail',
  '<a href="x">l</a>', '<a href="x">l', 'a<b>c</b>d',
  '<script>a</script>', '<script >a</script >', '<script\n>a</script>',
  '<script src="x"/>tail', '<SCRIPT>upper</SCRIPT>after',
  '<style>a</style><script>b</script>c',
  '<script>a</script>m<style>b</style>n<script>c</script>',
  '<script>outer<script>inner</script>', '<div><script>x</script></div>',
  '<ul><li>a<li>b</ul>', '<ul><li>a</li>\n<li>b</li></ul>',
  '<li>lone item', '<br><br><br>', '<hr><hr>',
  '<table><tr><th>h</th></tr><tr><td>d</td></tr></table>',
  '&', '&;', '&#', '&#;', '&#x', '&#x;', '&##;', '&&amp;;',
  '&amp;amp;', '&AMP;&Amp;&aMp;', '&#38;#60;', '&#x26;#x3C;',
  '&nbsp;&nbsp;&nbsp;', '&#160;&#160;', '&#8203;a&#8203;b',
  '&#9;tab', '&#10;line', '&#13;return', '&#0;null',
  '&lt;script&gt;alert&lt;/script&gt;',
  '&amp;lt;script&amp;gt;alert&amp;lt;/script&amp;gt;',
  'a\n\n\n\n\n\n\nb', 'a \n \n b', '   \n   \n   ',
  'a\t\nb', 'a\t \nb', 'a \t\nb', 'a\t\n\tb', 'x\ty\n\tz',
  'a\r\r\rb', 'a\r\n\r\n\r\nb', '  a  ',
  'no markup here at all, only prose about rainfall',
];

/**
 * The characters every pass in the module branches on.
 *
 * Twenty-four of them, which is what makes the walk below affordable:
 * a pattern that reads a bracket, a slash, an ampersand, a semicolon,
 * a hash, the hex marker, a bang, a dash, one of the letters a tag
 * name opens with, a quote, an equals sign or one of the four
 * whitespace characters has all of its decisions represented, and a
 * string made only of these exercises them in some order.
 */
const BRANCH_ALPHABET: readonly string[] = [
  '<', '>', '/', '&', ';', '#', 'x', '!', '-', '=', '"',
  'p', 'l', 'i', 'b', 'r', 's', 'a', 'h', '1',
  ' ', '\n', '\t', '\r',
];

/** How long an enumerated string gets. */
const ENUMERATION_LENGTH = 3;

/**
 * Every string up to {@link ENUMERATION_LENGTH} characters over
 * {@link BRANCH_ALPHABET}, the empty one included.
 *
 * Built rather than written down, and built here rather than shared,
 * because it is this module's leg: a reduction is a fixed sequence of
 * patterns over one string, so the whole of its behaviour on short
 * inputs is reachable by walking them.
 *
 * @returns Every such string, shortest first.
 */
function enumerateBranchStrings(): string[] {
  const all: string[] = [''];
  let level: string[] = [''];

  for (let length = 1; length <= ENUMERATION_LENGTH; length += 1) {
    const next: string[] = [];

    for (const prefix of level) {
      for (const character of BRANCH_ALPHABET) {
        next.push(prefix + character);
      }
    }

    all.push(...next);
    level = next;
  }

  return all;
}

/** Every text driven through the two exports that catch. */
function everyDrivenText(): string[] {
  return [
    ...MARKUP_FIXTURES.map((fixture) => fixture.text),
    ...AUTHORED_DOCUMENTS,
    ...everyTagDocument(),
  ];
}

/**
 * How many driven texts the port CHANGES, and how many it leaves.
 *
 * Read off the PORT rather than the origin, because that is what the
 * control needs: the origin is the thing under measurement, and a
 * control read off it would be asking the subject to vouch for the
 * inputs.
 *
 * @returns One entry per driven text, true where it was changed.
 */
function portChangedEachText(): boolean[] {
  return everyDrivenText().map((text) => htmlToText(text) !== text);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('html-text — the origin the comparisons read', () => {
  it('exports the three entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isHtmlTextOrigin(loaded)).toBe(true);
  });

  // First control: the two catching exports answer for any TEXT, so a
  // run where the port refused one would mean the comparisons had
  // started diffing one exception against another.
  it('is driven over texts the two catching exports never refuse', () => {
    const refused = everyDrivenText()
      .filter((text) => outcomeOf(() => htmlToText(text)).refused
        || outcomeOf(() => decodeHtmlEntities(text)).refused);

    expect(refused).toEqual([]);
  });

  // Second control: the refusal half of the outcome wrapper is only
  // exercised if something reaches it, and the third export over the
  // adversarial roster is what does. Both endings must appear or the
  // wrapper is carrying half its weight.
  it('is driven over values producing both endings', () => {
    const endings = ADVERSARIAL_VALUES.map(
      (entry) => outcomeOf(() => tidyText(entry.build() as string)).refused,
    );

    expect(endings).toContain(true);
    expect(endings).toContain(false);
  });

  // Third control, and the one this gate would be worthless without:
  // the driven texts must carry both readings. A set that had drifted
  // into prose carrying no markup would agree perfectly having
  // reduced nothing, which is the regression this file exists to
  // catch.
  it('is driven over texts the port both changes and leaves alone', () => {
    const changed = portChangedEachText();

    expect(changed).toContain(true);
    expect(changed).toContain(false);
    expect(changed.filter(Boolean).length).toBeGreaterThan(100);
  });
});

describePortParity('html-text — the markup corpus', () => {
  for (const fixture of MARKUP_FIXTURES) {
    it(`agrees over ${fixture.id}`, () => {
      const origin = originHtmlText();

      expect(compareEveryExport(fixture.id, origin, fixture.text))
        .toEqual([]);
    });
  }
});

describePortParity('html-text — the documents no corpus holds', () => {
  // One case over the whole roster rather than one per document. A
  // divergence here is a difference in how a pattern reads a SHAPE,
  // and the set of documents that moved together is the reading a
  // failure needs — one case per document would report whichever ran
  // first and leave the shape of the drift to be reconstructed.
  it('agrees over every authored document', () => {
    const origin = originHtmlText();
    const apart = AUTHORED_DOCUMENTS.flatMap(
      (text) => compareEveryExport(JSON.stringify(text), origin, text),
    );

    expect(apart).toEqual([]);
  });

  // The roster is walked, so an emptied roster passes the case above
  // without comparing anything. Held against its own membership: the
  // shapes a reader would expect to find are asserted present, and
  // the count is asserted only as a floor.
  it('is driven over a roster that still holds its edge shapes', () => {
    expect(AUTHORED_DOCUMENTS).toContain('');
    expect(AUTHORED_DOCUMENTS).toContain('<img alt="a > b">tail');
    expect(AUTHORED_DOCUMENTS).toContain('&#x;');
    expect(AUTHORED_DOCUMENTS)
      .toContain('<script>outer<script>inner</script>');
    expect(AUTHORED_DOCUMENTS.length).toBeGreaterThan(60);
  });
});

describePortParity('html-text — every tag name in every roster', () => {
  // The leg the roster substitution owes. Every name, in four shapes,
  // through all three exports.
  it('agrees over every tag name in all four shapes', () => {
    const origin = originHtmlText();
    const apart = everyTagDocument().flatMap(
      (text) => compareEveryExport(JSON.stringify(text), origin, text),
    );

    expect(apart).toEqual([]);
  });

  // The walk is generated, so its size and its membership are the
  // only things saying it walked anything. The control names must be
  // present too: a roster holding only members would pass the case
  // above for a substitution that widened every list.
  it('walks every roster member and names outside them alike', () => {
    const documents = everyTagDocument();

    expect(documents).toHaveLength(EVERY_TAG_NAME.length * 4);
    expect(EVERY_TAG_NAME).toContain('script');
    expect(EVERY_TAG_NAME).toContain('td');
    expect(EVERY_TAG_NAME).toContain('hr');
    expect(EVERY_TAG_NAME).toContain('span');
    expect(EVERY_TAG_NAME).toContain('h7');
  });
});

describePortParity('html-text — every short string', () => {
  // The exhaustive leg. One case, because the answer wanted is the
  // SET of strings that moved rather than the first one: a pattern
  // read one character differently parts over a family, and the
  // family is the diagnosis.
  it('agrees over every string the passes branch on', () => {
    const origin = originHtmlText();
    const apart = enumerateBranchStrings().flatMap(
      (text) => compareEveryExport(JSON.stringify(text), origin, text),
    );

    expect(apart).toEqual([]);
  });

  // The enumeration is generated, so its size is the only thing
  // saying it enumerated anything. Held against the closed form, and
  // against the two members whose absence would be least visible.
  it('enumerates every string over its alphabet', () => {
    const strings = enumerateBranchStrings();
    const expected = [0, 1, 2, 3]
      .map((length) => BRANCH_ALPHABET.length ** length)
      .reduce((total, count) => total + count, 0);

    expect(strings.length).toBe(expected);
    expect(new Set(strings).size).toBe(expected);
    expect(strings).toContain('');
    expect(strings).toContain('&#;');
  });
});

describePortParity('html-text — characters a reader cannot see', () => {
  // The two strips read separate rosters that overlap, and a port
  // that had them agreeing where the original has them differing
  // would look correct on every document a person would write. Driven
  // as characters and as references, over the whole corpus roster.
  it('agrees over every invisible code point, either way it arrived', () => {
    const origin = originHtmlText();
    const apart = INVISIBLE_CODE_POINTS.flatMap((entry) => [
      ...compareEveryExport(
        `${entry.id} as a character`,
        origin,
        `alpha${entry.char}bravo`,
      ),
      ...compareEveryExport(
        `${entry.id} as a decimal reference`,
        origin,
        `alpha&#${entry.codePoint};bravo`,
      ),
      ...compareEveryExport(
        `${entry.id} as a hex reference`,
        origin,
        `alpha&#x${entry.codePoint.toString(16)};bravo`,
      ),
    ]);

    expect(apart).toEqual([]);
  });

  // The padded document, which is the same characters in the
  // arrangement a real capture carries them in: a run of them between
  // every word rather than one between two.
  it('agrees over a document padded with every one of them', () => {
    const origin = originHtmlText();

    expect(compareEveryExport(
      INVISIBLE_TEXT_FIXTURE.id,
      origin,
      INVISIBLE_TEXT_FIXTURE.text,
    )).toEqual([]);
  });
});

describePortParity('html-text — input that is not text', () => {
  // The guard in front of all three entry points is the only thing
  // between an adapter's absent field and a crash inside a string
  // method, and it is the one part of this module a type annotation
  // makes invisible: the compiler will never let a caller here reach
  // it, and the payload a field came out of was never typed. So it is
  // driven over the shared adversarial roster, each value built fresh
  // for each side, through every export — including the one whose
  // answer for a hostile conversion is a throw.
  it('agrees over every adversarial value, through all three exports', () => {
    const origin = originHtmlText();
    const apart = ADVERSARIAL_VALUES.flatMap(
      (entry) => compareEveryExport(entry.id, origin, entry.build()),
    );

    expect(apart).toEqual([]);
  });

  // The roster is walked, so it is held to its membership. The two
  // named here are the ones whose absence would cost the most: one
  // reaches the refusal half of the wrapper and the other is the
  // absence an adapter actually produces.
  it('is driven over a roster that still holds both endings', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('hostile-string-conversion');
    expect(ids).toContain('undefined');
    expect(ids.length).toBeGreaterThan(8);
  });
});
