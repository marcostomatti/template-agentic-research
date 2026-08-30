/**
 * Cases for `src/sources/html-text.ts`: what the reduction does to
 * markup written to break it, and the two halves of the rule it
 * exists to hold.
 *
 * The rule has two halves, and a suite driving only one of them
 * passes for a module that is useless in opposite ways. A reduction
 * that deleted everything strips every tag and destroys the document;
 * one that changed nothing preserves every word and strips nothing.
 * So the corpus section asserts both — the prose comes back, AND no
 * markup form is left in the answer — and the two claims are made by
 * different machinery, so neither can satisfy the other by accident.
 *
 * The second claim is a zero-hit reading, which is the shape that
 * needs a control before it means anything. {@link markupFormsIn} is
 * therefore run over the INPUTS as well, where it must report every
 * form the roster names: a predicate that had stopped matching, or a
 * corpus that had drifted into prose carrying no markup, reads
 * exactly like a clean sweep otherwise.
 *
 * Malformed markup and hostile entity references come FIRST, because
 * they are the inputs this module was written for. A reduction meets
 * well-formed markup on a good day and broken markup on every other
 * one, and the failures that matter are the quiet ones: a tag pattern
 * that runs away, a dead block whose source leaks into the body as
 * prose, an entity that resolves to something a later pass reads as
 * structure. Each of those has a case here, and each is pinned as
 * what the module DOES rather than as what would be ideal — this is a
 * port, `tests/parity/html-text.parity.test.ts` is the gate that
 * decides whether it landed, and a repair made here would fail it.
 *
 * Two behaviours are pinned that nobody would design, for exactly
 * that reason. A tag whose attribute value carries an unescaped
 * closing bracket ends at that bracket, so the remainder of the
 * attribute survives into the body as text. And a decimal reference
 * carrying hex letters is read up to the first of them rather than
 * refused. Both are the original's, both are reachable from a real
 * document, and the cases exist so nobody meets either in a debugger.
 *
 * The corpus entries are driven off `tests/parity/fixtures.ts` rather
 * than off a list written here, since the same entries drive the
 * parity suite and two lists that agree until somebody edits one is
 * exactly what that arrangement avoids.
 */
import { describe, expect, it } from 'vitest';

import {
  ADVERSARIAL_VALUES,
  INVISIBLE_CODE_POINTS,
  MARKUP_FIXTURES,
  fixtureById,
} from '../../tests/parity/fixtures.js';

import { decodeHtmlEntities, htmlToText, tidyText } from './html-text.js';

// ---------------------------------------------------------------------------
// Reading an answer, including the answer that is a throw
// ---------------------------------------------------------------------------

/** What {@link endingOf} answers for a call that returned. */
const ANSWERED = '<answered>';

/**
 * Whether a call answered, and what it said if it did not.
 *
 * Written as a string rather than as a boolean so a failure prints
 * the sentence that arrived instead of `true !== false`.
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

// ---------------------------------------------------------------------------
// The markup forms, and the predicate that finds them
// ---------------------------------------------------------------------------

/**
 * One form a reduced body must not carry, and how to find it.
 *
 * Three of them, each a different way markup survives a reduction
 * that only half worked: a tag left standing, a comment left
 * standing, and an entity reference the decode never reached.
 *
 * The entity pattern names entries BOTH tables know, which is the
 * whole point of it. An unknown reference is left verbatim by design
 * and appears in the corpus deliberately, so a predicate matching
 * every ampersand would report the module's correct behaviour as a
 * finding.
 */
interface MarkupForm {
  /** Stable name, which is what a failure prints. */
  readonly id: string;

  /** What the form looks like. */
  readonly pattern: RegExp;
}

/** Every form the corpus section sweeps for. */
const MARKUP_FORMS: readonly MarkupForm[] = [
  { id: 'tag', pattern: /<\/?[a-zA-Z][^>]*>/ },
  { id: 'comment', pattern: /<!--/ },
  {
    id: 'resolvable-entity',
    pattern: /&(amp|lt|gt|quot|apos|nbsp|ndash|Aring|aring);/,
  },
];

/**
 * Which of those forms a text still carries.
 *
 * @param text - The text to sweep.
 * @returns The ids found, in roster order.
 */
function markupFormsIn(text: string): string[] {
  return MARKUP_FORMS
    .filter((form) => form.pattern.test(text))
    .map((form) => form.id);
}

// ---------------------------------------------------------------------------
// Markup that is broken
// ---------------------------------------------------------------------------

describe('html-text — markup that is broken', () => {
  // A tag nothing closes. The content still arrives, which is the
  // whole reason this module refuses to give up on malformed input:
  // half a document is worth more than none of it.
  it('keeps the content of a tag nothing closes', () => {
    expect(htmlToText('<div><span>a span nothing closes'))
      .toBe('a span nothing closes');
  });

  // A closing tag with no opener. Removed like any other tag rather
  // than treated as an error.
  it('removes a closing tag that opened nothing', () => {
    expect(htmlToText('</p>orphan close')).toBe('orphan close');
  });

  // A comment goes whole, including one carrying the bracket that
  // would end an ordinary tag. Comments run BEFORE the tag passes for
  // exactly this reason.
  it('removes a comment carrying an angle bracket inside it', () => {
    expect(htmlToText('<!-- a comment with a > in it -->visible'))
      .toBe('visible');
  });

  // Pinned, not repaired: the tag pattern ends at the first closing
  // bracket, so an attribute value carrying one leaves its remainder
  // in the body as text. Reachable from any document whose author
  // wrote a bracket into an alt text without escaping it.
  it('leaks the tail of an attribute holding an unescaped bracket', () => {
    expect(htmlToText('<img alt="a quoted > inside it">tail'))
      .toBe('inside it">tail');
  });

  // A declaration carries no prose and is removed, which is a
  // different pass from the tag one: it opens with a bang rather than
  // with a letter, so the tag pattern never matches it.
  it('removes a document type declaration', () => {
    expect(htmlToText('<!DOCTYPE html><p>a</p>')).toBe('a');
  });

  // The near-misses, and the cases most worth reading on a failing
  // run. A reduction that is slightly too eager is not a safer one —
  // it eats prose that was never markup, which is how a comparison
  // somebody wrote by hand disappears out of a captured body.
  it('leaves brackets that are prose exactly as they arrived', () => {
    expect(htmlToText('<p>a &lt; b, and a < b, and <3</p>'))
      .toBe('a < b, and a < b, and <3');
    expect(htmlToText('<')).toBe('<');
    expect(htmlToText('<>')).toBe('<>');
  });

  // Nothing in, nothing out. Both spellings of nothing, since the
  // early return reads the text as a boolean.
  it('answers nothing for an empty document', () => {
    expect(htmlToText('')).toBe('');
    expect(htmlToText('   ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Entity references written to be hostile
// ---------------------------------------------------------------------------

/**
 * Names that are on every object's prototype and are spellable as an
 * entity reference.
 *
 * The reason the lookup is an own-property test. A plain read would
 * answer a FUNCTION for each of these, and a function coerced into a
 * document puts its own source into the body — text nobody wrote,
 * arriving in a column every later pass reads as prose.
 */
const INHERITED_NAMES: readonly string[] = [
  'constructor', 'toString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
];

describe('html-text — entity references written to be hostile', () => {
  // The own-property test, driven over every inherited name at once:
  // a failure names which ones resolved rather than reporting the
  // first.
  it('resolves no name it inherits rather than declares', () => {
    const resolved = INHERITED_NAMES
      .map((name) => `&${name};`)
      .filter((reference) => decodeHtmlEntities(reference) !== reference);

    expect(resolved).toEqual([]);
  });

  // The one prototype-shaped name the PATTERN excludes rather than
  // the lookup: it carries underscores, and the name alternative
  // admits letters and digits only.
  it('never matches a reference carrying an underscore', () => {
    const reference = `&${'__proto__'};`;

    expect(decodeHtmlEntities(reference)).toBe(reference);
  });

  // The runaway guard. A name is a letter and up to thirty-one more
  // characters, so an ampersand followed by a long run and a
  // semicolon matches nothing at all and is left where it is.
  it('leaves a name longer than the cap unmatched', () => {
    const long = `&${'a'.repeat(40)};`;

    expect(decodeHtmlEntities(long)).toBe(long);
  });

  // ONE scan, never a loop. Text that legitimately held a literal
  // `&lt;` was written with its ampersand escaped, and comes back
  // holding the literal rather than the bracket it spells.
  it('decodes once, so text escaped twice comes back as text', () => {
    expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;');
    expect(decodeHtmlEntities('&amp;amp;lt;')).toBe('&amp;lt;');
  });

  // The same property through the reduction, which is where it
  // matters: the decode runs LAST, after every tag pass, so a
  // reference that spells a tag arrives as text no pass will ever
  // read as structure again.
  it('lets a reference that spells a tag arrive as text', () => {
    expect(htmlToText('&lt;p&gt;not a tag&lt;/p&gt;'))
      .toBe('<p>not a tag</p>');
    expect(htmlToText('<p>&amp;lt;a&amp;gt;</p>')).toBe('&lt;a&gt;');
  });

  // An unknown reference is left verbatim rather than guessed at,
  // whether it is a name nobody registered or an ampersand no
  // semicolon closes.
  it('leaves a reference it does not know exactly as written', () => {
    expect(decodeHtmlEntities('&notanentity; and &amp unterminated'))
      .toBe('&notanentity; and &amp unterminated');
    expect(decodeHtmlEntities('rainfall & wind'))
      .toBe('rainfall & wind');
  });

  // Case is part of a named reference, and the two tables are what
  // decides. The short table permits a folded spelling because every
  // entry in it is punctuation; a name outside it that only differs
  // in case resolves to nothing.
  it('folds case only for the names whose meaning cannot change', () => {
    expect(decodeHtmlEntities('&AMP;')).toBe('&');
    expect(decodeHtmlEntities('&NBSP;'))
      .toBe(String.fromCharCode(0x00a0));
    expect(decodeHtmlEntities('&NDASH;')).toBe('&NDASH;');
    expect(decodeHtmlEntities('&ndash;'))
      .toBe(String.fromCharCode(0x2013));
  });

  // Two letters that differ only in case, which is the reason the
  // exact table exists at all: a folded lookup would answer the same
  // character for both and silently rewrite a name.
  it('keeps two letters that differ only in the case of their name', () => {
    const upper = decodeHtmlEntities('&Aring;');
    const lower = decodeHtmlEntities('&aring;');

    expect(upper).toBe(String.fromCharCode(0x00c5));
    expect(lower).toBe(String.fromCharCode(0x00e5));
    expect(upper).not.toBe(lower);
  });
});

// ---------------------------------------------------------------------------
// Numeric references, and the guard that classifies them
// ---------------------------------------------------------------------------

/**
 * Code points a well-formed reference can name and a body may not
 * carry, with what each one is.
 *
 * Every entry is DROPPED — the reference resolves, and resolves to
 * nothing — which is the answer that separates this guard from the
 * one below it. Leaving the reference visible would be the wrong
 * answer here: it is well formed, so a reader would see an escape
 * sequence where the document meant a character nobody can see.
 */
const DROPPED_CODE_POINTS: readonly (readonly [number, string])[] = [
  [0x0000, 'the null character, which is well formed and is NUL'],
  [0x0008, 'a C0 control below the printable range'],
  [0x000d, 'a carriage return, which is not structure here'],
  [0x001f, 'the last C0 control'],
  [0x007f, 'delete'],
  [0x0085, 'a C1 control'],
  [0x009f, 'the last C1 control'],
  [0xd800, 'a lone leading surrogate'],
  [0xdfff, 'a lone trailing surrogate'],
  [0x200b, 'a zero-width space'],
  [0x200d, 'a zero-width joiner'],
  [0x2060, 'a word joiner'],
  [0xfeff, 'a byte order mark'],
];

/**
 * References that are not code points at all, with what each is.
 *
 * Every entry comes back VERBATIM, because there is nothing to put in
 * its place. The difference from the roster above is the whole of
 * what the guard decides, and it is worth having both rosters in one
 * file: an implementation that answered the same way for both would
 * satisfy either one alone.
 */
const VERBATIM_REFERENCES: readonly (readonly [string, string])[] = [
  ['&#x110000;', 'one past the last code point there is'],
  ['&#99999999;', 'far past it, in decimal'],
  ['&#abc;', 'hex letters where a decimal parse finds no digit'],
];

describe('html-text — numeric references and what they resolve to', () => {
  // Well formed and unusable: the reference resolves, and what it
  // resolves to is nothing.
  it('drops every code point a body must not carry', () => {
    const kept = DROPPED_CODE_POINTS
      .map(([code, describes]) => ({
        describes,
        answer: decodeHtmlEntities(`a&#${code};b`),
      }))
      .filter((entry) => entry.answer !== 'ab');

    expect(kept).toEqual([]);
  });

  // The two control characters that ARE structure in text, and the
  // control for the roster above: a guard that dropped everything
  // would satisfy that case and fail this one.
  it('keeps the two control characters that are structure', () => {
    expect(decodeHtmlEntities('a&#9;b')).toBe('a\tb');
    expect(decodeHtmlEntities('a&#10;b')).toBe('a\nb');
  });

  // Not a code point, so there is nothing to substitute and the
  // reference stays where it is.
  it('leaves a reference that names no code point as written', () => {
    const substituted = VERBATIM_REFERENCES
      .map(([reference]) => ({
        reference,
        answer: decodeHtmlEntities(reference),
      }))
      .filter((entry) => entry.answer !== entry.reference);

    expect(substituted).toEqual([]);
  });

  // Pinned, not repaired. A decimal parse stops at the first
  // character that is not a digit, so a reference opening with digits
  // and continuing with hex letters resolves as though the letters
  // were never there — while one OPENING with a letter is unparseable
  // and comes back whole. Both readings are the original's.
  it('reads a decimal reference up to its first hex letter', () => {
    expect(decodeHtmlEntities('&#65abc;')).toBe('A');
    expect(decodeHtmlEntities('&#65;')).toBe('A');
    expect(decodeHtmlEntities('&#abc;')).toBe('&#abc;');
  });

  // Both bases, and both spellings of the hex marker.
  it('reads decimal and hexadecimal in either case', () => {
    expect(decodeHtmlEntities('&#66;&#x43;&#X44;')).toBe('BCD');
  });

  // A code point outside the basic plane arrives as the pair of
  // units that spells it, which is what `fromCodePoint` is for and
  // what a `fromCharCode` would have got wrong.
  it('resolves a code point above the basic plane', () => {
    expect(decodeHtmlEntities('&#x1F600;'))
      .toBe(String.fromCodePoint(0x1f600));
  });
});

// ---------------------------------------------------------------------------
// The invisible-character roster, which is a subset and says so
// ---------------------------------------------------------------------------

/** Every code point both strips in this module remove. */
const STRIPPED_CODE_POINTS: readonly number[] = [
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
];

describe('html-text — invisible characters', () => {
  // The two strips are separate passes over separate inputs — one
  // reads a resolved reference, the other reads the text — and they
  // are held to the SAME roster here, because a document can carry
  // the character either way and the two answers have to agree.
  it('removes the same characters however they arrived', () => {
    const disagreed = STRIPPED_CODE_POINTS
      .map((code) => ({
        code,
        asReference: decodeHtmlEntities(`a&#${code};b`),
        asCharacter: tidyText(`a${String.fromCodePoint(code)}b`),
      }))
      .filter((entry) => entry.asReference !== 'ab'
        || entry.asCharacter !== 'ab');

    expect(disagreed).toEqual([]);
  });

  // The control, and the honest half of the claim: this is a fixed
  // roster of five and NOT a general sweep of everything a reader
  // cannot see. The corpus knows seventeen such code points, so
  // twelve of them survive the tidy pass — which is the original's
  // behaviour and is what the invisible-run strip in a later stage
  // exists to finish.
  it('is a roster of five rather than a sweep of the invisible', () => {
    const survived = INVISIBLE_CODE_POINTS
      .filter((entry) => tidyText(`a${entry.char}b`) !== 'ab')
      .map((entry) => entry.id);

    expect(STRIPPED_CODE_POINTS).toHaveLength(5);
    expect(survived.length).toBe(INVISIBLE_CODE_POINTS.length - 5);
    expect(survived).toContain('soft-hyphen');
    expect(survived).toContain('right-to-left-override');
  });
});

// ---------------------------------------------------------------------------
// Blocks whose content is not prose
// ---------------------------------------------------------------------------

describe('html-text — blocks whose content is not prose', () => {
  // Removed WHOLE rather than untagged. Untagging one would leave its
  // source in the body, where every later pass reads it as a sentence
  // somebody wrote.
  it('removes a dead block and everything inside it', () => {
    const answer = htmlToText([
      '<style>.bulletin { color: red; }</style>',
      '<p>Visible prose.</p>',
      '<script>var hidden = 1;</script>',
    ].join('\n'));

    expect(answer).toBe('Visible prose.');
  });

  // The back-reference, which is what stops two dead blocks from
  // taking everything between them: the pattern closes on the tag it
  // opened with, and it is lazy.
  it('keeps the prose sitting between two dead blocks', () => {
    expect(htmlToText('<script>a</script>middle<script>b</script>'))
      .toBe('middle');
  });

  // The tail pass. An opening tag nothing closes ends the document
  // there — losing the rest is the right answer, because the
  // alternative is source arriving in a body as prose.
  it('drops the tail after a dead block nothing closes', () => {
    expect(htmlToText('<script>var leaked = 1;\nand more source'))
      .toBe('');
    expect(htmlToText('<p>kept</p><style>.a{}\n.b{}')).toBe('kept');
  });

  // The tail roster is narrower than the block roster, and this is
  // the difference: an unclosed template loses only its own tags,
  // because what follows one is ordinary prose rather than source.
  it('keeps the text after a non-source block nothing closes', () => {
    expect(htmlToText('<template>inner</template>after'))
      .toBe('after');
    expect(htmlToText('<template>inner and then nothing closes it'))
      .toBe('inner and then nothing closes it');
  });
});

// ---------------------------------------------------------------------------
// The structure a reader reads
// ---------------------------------------------------------------------------

describe('html-text — the structure a reader reads', () => {
  // One line per item and no blank line between them. The opening
  // tag of the next item already ends the line, which is why the
  // closing tag is deliberately absent from the block roster.
  it('gives a list one line per item', () => {
    const list = '<ul><li>alpha</li><li>bravo</li><li>charlie</li></ul>';

    expect(htmlToText(list)).toBe('- alpha\n- bravo\n- charlie');
  });

  // Paragraphs are blank-line separated, which is what makes them
  // paragraphs to every later pass.
  it('separates blocks with a blank line', () => {
    expect(htmlToText('<div><h2>Head</h2><p>One.</p><p>Two.</p></div>'))
      .toBe('Head\n\nOne.\n\nTwo.');
  });

  // A break is a line ending and nothing more, so two lines of one
  // paragraph stay one paragraph.
  it('turns a line break into one line ending', () => {
    expect(htmlToText('<p>First.<br>Second.</p>'))
      .toBe('First.\nSecond.');
    expect(htmlToText('<p>First.<BR />Second.</p>'))
      .toBe('First.\nSecond.');
  });

  // Cells close a line and do not open one, so a row of cells reads
  // as consecutive lines and the row itself as a block.
  it('reads a table row as lines and the rows as blocks', () => {
    const rows = '<table><tr><td>a</td><td>b</td></tr>'
      + '<tr><td>c</td></tr></table>';

    expect(htmlToText(rows)).toBe('a\nb\n\nc');
  });

  // The whole reason the structure is preserved at all: a list
  // flattened into one run-on line would put every item into one
  // sentence, and every later deterministic pass here reads
  // sentences.
  it('never joins two list items into one line', () => {
    const lines = htmlToText('<ul><li>alpha</li><li>bravo</li></ul>')
      .split('\n');

    expect(lines).toEqual(['- alpha', '- bravo']);
  });
});

// ---------------------------------------------------------------------------
// The tidy pass on its own
// ---------------------------------------------------------------------------

describe('html-text — the tidy pass', () => {
  // Both line endings that are not a bare newline become one.
  it('normalizes every line ending to one character', () => {
    expect(tidyText('a\r\nb\rc')).toBe('a\nb\nc');
  });

  // A space that is not a space becomes one, because it is a space a
  // reader sees.
  it('turns the spaces that are not spaces into spaces', () => {
    const spacey = [0x00a0, 0x2007, 0x2009, 0x200a, 0x202f]
      .map((code) => `a${String.fromCodePoint(code)}b`)
      .filter((text) => tidyText(text) !== 'a b');

    expect(spacey).toEqual([]);
  });

  // Runs collapse and a run of blank lines becomes one blank line,
  // because blank lines are structure and a dozen of them are an
  // artefact of whatever produced the markup.
  it('collapses runs of space and of blank lines', () => {
    expect(tidyText('a   \t  b')).toBe('a b');
    expect(tidyText('a\n\n\n\n\nb')).toBe('a\n\nb');
    expect(tidyText('   trimmed   ')).toBe('trimmed');
  });

  // Pinned as it is: spaces are removed in FRONT of a line ending and
  // not behind one, so an indented line keeps its one collapsed
  // space. The chain runs in that order and the port keeps it.
  it('strips the space before a line ending and not after it', () => {
    expect(tidyText('a  \n  b')).toBe('a\n b');
  });

  // The ORDER of those two passes, which is observable through
  // exactly one input: a tab in front of a line ending. The run
  // collapse turns it into a space and the strip then removes it,
  // where the reverse order leaves the space standing. Every input
  // spelled with spaces reads the same either way, which is why this
  // case is spelled with a tab — measured, a mutation swapping the
  // two passes is caught by nothing else in either suite.
  it('collapses a run before it strips what sits at a line ending', () => {
    expect(tidyText('a\t\nb')).toBe('a\nb');
    expect(tidyText('a\t\n\tb')).toBe('a\n b');
  });
});

// ---------------------------------------------------------------------------
// Values that are not text
// ---------------------------------------------------------------------------

describe('html-text — values that are not text', () => {
  // The guard is the only thing between an adapter's absent field and
  // a crash inside a string method, and the compiler cannot reach it:
  // every caller here is typed, and the payload a field came out of
  // was not.
  it('answers for every adversarial value through both catchers', () => {
    const refused = ADVERSARIAL_VALUES
      .flatMap((entry) => [
        {
          id: `${entry.id} (htmlToText)`,
          ending: endingOf(() => htmlToText(entry.build() as string)),
        },
        {
          id: `${entry.id} (decodeHtmlEntities)`,
          ending: endingOf(() => decodeHtmlEntities(entry.build() as string)),
        },
      ])
      .filter((entry) => entry.ending !== ANSWERED);

    expect(refused).toEqual([]);
  });

  // The asymmetry, preserved: the one export with no catch lets a
  // hostile conversion out. Asserted as the NEGATIVE claim, because
  // the sentence itself comes from the engine and is not this
  // module's to promise — what matters is that it arrived rather
  // than being turned into an empty document.
  it('lets a refusing conversion out of the export that catches none', () => {
    const hostile = fixtureById(
      ADVERSARIAL_VALUES,
      'hostile-string-conversion',
    );
    const ending = endingOf(() => tidyText(hostile.build() as string));

    expect(ending).not.toBe(ANSWERED);
    expect(htmlToText(hostile.build() as string)).toBe('');
    expect(decodeHtmlEntities(hostile.build() as string)).toBe('');
  });

  // Absence is the case an adapter actually produces: a field that
  // was not in the payload.
  it('reads absence as an empty document', () => {
    expect(htmlToText(null as unknown as string)).toBe('');
    expect(htmlToText(undefined as unknown as string)).toBe('');
    expect(tidyText(null as unknown as string)).toBe('');
    expect(decodeHtmlEntities(undefined as unknown as string)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// The corpus, and both halves of the rule
// ---------------------------------------------------------------------------

describe('html-text — the markup corpus', () => {
  // First half: nothing interpretable survives.
  it('leaves no markup form in any reduced document', () => {
    const left = MARKUP_FIXTURES
      .map((fixture) => ({
        id: fixture.id,
        forms: markupFormsIn(htmlToText(fixture.text)),
      }))
      .filter((entry) => entry.forms.length > 0);

    expect(left).toEqual([]);
  });

  // The control for it, and the case without which the one above is
  // a zero-hit reading over nothing. Every form the roster names must
  // be found in the INPUTS, or the predicate has stopped matching or
  // the corpus has drifted into prose carrying no markup at all.
  it('sweeps a corpus that still carries every form it looks for', () => {
    const found = new Set(
      MARKUP_FIXTURES.flatMap((fixture) => markupFormsIn(fixture.text)),
    );

    const named = MARKUP_FORMS.map((form) => form.id);

    expect([...found].sort()).toEqual(named.sort());
  });

  // Second half: the prose comes back. A reduction that deleted
  // everything satisfies the first case and fails this one, which is
  // why both are here.
  it('returns prose carrying no markup exactly as it arrived', () => {
    const plain = fixtureById(MARKUP_FIXTURES, 'markup-plain');

    expect(htmlToText(plain.text)).toBe(plain.text);
    expect(plain.text.length).toBeGreaterThan(20);
  });

  // The two halves in one document: the source of both dead blocks is
  // gone, and the sentence between them is not.
  it('keeps the prose and loses the source around it', () => {
    const fixture = fixtureById(MARKUP_FIXTURES, 'markup-script-and-style');
    const answer = htmlToText(fixture.text);

    expect(answer).toBe('Visible prose.');
    expect(answer).not.toContain('hidden');
    expect(answer).not.toContain('color');
    expect(fixture.text).toContain('hidden');
  });

  // The corpus must hold documents the reduction CHANGES and
  // documents it leaves alone, or it agrees with anything.
  it('holds documents the reduction both changes and leaves alone', () => {
    const changed = MARKUP_FIXTURES
      .map((fixture) => htmlToText(fixture.text) !== fixture.text);

    expect(changed).toContain(true);
    expect(changed).toContain(false);
  });
});
