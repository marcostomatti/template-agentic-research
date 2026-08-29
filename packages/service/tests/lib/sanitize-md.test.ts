/**
 * Cases for `src/lib/sanitize-md.ts`: every form it neutralizes, and
 * the two halves of the rule it exists to hold.
 *
 * The rule has two halves, and a suite driving only one of them passes
 * for a module that is useless in opposite ways. A pass that deleted
 * everything neutralizes every form and destroys the reading; a pass
 * that changed nothing preserves every word and neutralizes nothing.
 * So every form below is asserted twice — the injected words come back
 * verbatim, AND no active form is left in the answer — and the two
 * claims are made by different machinery, so neither can satisfy the
 * other by accident.
 *
 * The second claim is a zero-hit reading, which is the shape that
 * needs a control before it means anything. {@link activeFormsLeftIn}
 * is therefore run over the INPUTS as well, where it must report every
 * form the roster names: a predicate that had stopped matching, or a
 * roster that had drifted away from the inputs, reads exactly like a
 * clean sweep otherwise. Its vocabulary is held set-equal against the
 * roster in the same section, so a form added to one and not the other
 * fails naming itself.
 *
 * The near-misses come FIRST, and they are the cases most worth
 * reading on a failing run. A neutralizer that is slightly too eager
 * is not a safer neutralizer — it corrupts prose that was never markup
 * at all, which is how a comparison somebody wrote by hand or a bare
 * angle bracket in front of a digit disappears out of a quoted body.
 * Those inputs are pinned whole and unchanged, so a repair that widens
 * a pattern fails here before it fails anywhere else.
 *
 * The marker section is next, and it is the one place this file pins
 * behaviour nobody would design. The strip that stops untrusted text
 * from forging a marker is a single pass, so it can be outrun; what
 * that produces is preserved rather than repaired, for the reason the
 * module header gives, and pinned here so nobody meets it in a
 * debugger. Those are the cases to delete on the day the callers'
 * phase decides to fix it.
 *
 * The corpus entries are driven off `tests/parity/fixtures.ts` rather
 * than off a list written here, since the same entries drive the
 * parity suite and two lists that agree until somebody edits one is
 * exactly what that arrangement avoids.
 */
import { describe, expect, it } from 'vitest';

import { sanitizeUntrusted, slugify } from '../../src/lib/sanitize-md.js';
import {
  ADVERSARIAL_VALUES,
  MARKUP_FIXTURES,
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
 * Written as a string rather than as a boolean so a failure prints the
 * sentence that arrived instead of `true !== false`.
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
// What "no active form is left" means, as a predicate
// ---------------------------------------------------------------------------

/**
 * Every form this module neutralizes, by the id both the roster below
 * and {@link activeFormsLeftIn} use.
 *
 * A closed set, held against both. That is what makes the zero-hit
 * sweep over the answers a measurement: a form named here and driven
 * by nothing fails the roster case, and a form named here and looked
 * for by nothing fails the vocabulary case.
 */
const ACTIVE_FORM_IDS: readonly string[] = [
  'bare-link',
  'heading-run',
  'image-embed',
  'raw-tag',
  'setext-underline',
  'wiki-link-opener',
];

/** A tag, as the module's own pattern reads one, without the cursor. */
const TAG_RE = /<\/?[a-zA-Z][^>]*>/;

/** A line that is nothing but an underline run. */
const UNDERLINE_RE = /^[-=]+[ \t]*$/;

/** A link, wherever one sits in a body of text. */
const LINK_RE = /https?:\/\/[^\s<>`)\]]+/g;

/**
 * The characters a link is allowed to sit behind in an ANSWER.
 *
 * A backtick is a link this module wrapped. An opening parenthesis is
 * the one other place a link may legitimately appear: inside a
 * restored image span, whose rendered form puts the URL in parentheses
 * INSIDE a code span. Anything else in front of a link means the link
 * is bare, which is the form this module exists to take the click out
 * of.
 */
const WRAPPED_LINK_LEAD: readonly string[] = ['`', '('];

/**
 * Every active form still present in `text`, by roster id.
 *
 * Answers a list rather than a boolean so a failure names which form
 * survived rather than only that one did. Run over an ANSWER it must
 * come back empty; run over an INPUT it is the control that says this
 * predicate can still see anything at all.
 *
 * @param text - The text to read, answer or input.
 * @returns One id per form found, sorted, with repeats collapsed.
 */
function activeFormsLeftIn(text: string): string[] {
  const found = new Set<string>();

  if (text.includes('![')) {
    found.add('image-embed');
  }

  if (TAG_RE.test(text)) {
    found.add('raw-tag');
  }

  if (text.includes('[[')) {
    found.add('wiki-link-opener');
  }

  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      found.add('heading-run');
    }

    if (UNDERLINE_RE.test(line)) {
      found.add('setext-underline');
    }
  }

  for (const match of text.matchAll(LINK_RE)) {
    const lead = match.index === 0
      ? ''
      : text.charAt(match.index - 1);

    if (!WRAPPED_LINK_LEAD.includes(lead)) {
      found.add('bare-link');
    }
  }

  return sorted([...found]);
}

// ---------------------------------------------------------------------------
// Prose that only looks like markup
// ---------------------------------------------------------------------------

/** One input this module must leave exactly as it arrived. */
interface UntouchedText {
  /** Stable id a failure prints. */
  readonly id: string;

  /** Why a careless pattern would take it for markup. */
  readonly describes: string;

  /** The text, which is also the whole expected answer. */
  readonly text: string;
}

/**
 * Text that is markup-shaped and is not markup.
 *
 * The near-miss half of every pattern in the module, and the half a
 * repair breaks first: a neutralizer widened until nothing gets past
 * it corrupts prose nobody wrote as markup, which is a quiet and total
 * loss where an escaped character is a visible one. Each entry is
 * pinned as its own whole answer, so a widened pattern fails here
 * naming the sentence it ate.
 */
const UNTOUCHED_TEXTS: readonly UntouchedText[] = [
  {
    id: 'comparison',
    describes: 'a comparison written in prose, which opens no tag',
    text: 'Rainfall a < b and b > a, measured overnight.',
  },
  {
    id: 'bare-angle-digit',
    describes: 'an angle bracket in front of a digit, which is not a tag',
    text: 'Station alpha reported <3 mm and bravo <10 mm.',
  },
  {
    id: 'unterminated-tag',
    describes: 'an opener nothing closes, so the pattern never completes',
    text: 'A note carrying a <span and nothing after it.',
  },
  {
    id: 'indented-hash',
    describes: 'a hash run behind whitespace, which opens no heading',
    text: '  # this line is indented\nand this one is not',
  },
  {
    id: 'inline-hash',
    describes: 'a hash inside a line rather than opening one',
    text: 'Gauge # 4 measured 0 mm.',
  },
  {
    id: 'list-dash',
    describes: 'a dash that opens a list item, which underlines nothing',
    text: '- alpha measured 0 mm\n- bravo was offline',
  },
  {
    id: 'alt-with-bracket',
    describes: 'an embed whose alt text closes a bracket, so it is no embed',
    text: '![a chart [revised] for the week](u)',
  },
  {
    id: 'marker-suffix-alone',
    describes: 'the marker closer with no opener, which forges nothing',
    text: 'A note ending in _ENDSANMD and nothing else.',
  },
];

// ---------------------------------------------------------------------------
// The forms, one entry each
// ---------------------------------------------------------------------------

/** One active form, the text carrying it, and the whole answer. */
interface NeutralizedForm {
  /** The form, by its id in {@link ACTIVE_FORM_IDS}. */
  readonly id: string;

  /** The untrusted text, carrying that form and nothing else new. */
  readonly text: string;

  /** Words a reader was going to see, every one of which comes back. */
  readonly words: readonly string[];

  /** The whole answer, pinned. */
  readonly sanitized: string;
}

/**
 * Every form, driven one at a time.
 *
 * One form per entry rather than one document carrying all six,
 * because the claim is per form: a pass that had stopped neutralizing
 * links would still satisfy a whole-document assertion whose other
 * five forms moved. The interactions BETWEEN passes are a section of
 * their own further down, where a document does carry more than one.
 */
const NEUTRALIZED_FORMS: readonly NeutralizedForm[] = [
  {
    id: 'image-embed',
    text: '![a rainfall chart](https://example.invalid/charts/week.png)',
    words: ['a rainfall chart', 'https://example.invalid/charts/week.png'],
    sanitized:
      '`[image link removed: a rainfall chart]'
      + '(https://example.invalid/charts/week.png)`',
  },
  {
    id: 'raw-tag',
    text: 'Reading <b>0 mm</b> at <img src="https://example.invalid/p.png">.',
    words: ['Reading ', '0 mm', ' at '],
    sanitized: 'Reading 0 mm at .',
  },
  {
    id: 'bare-link',
    text: 'Read https://example.invalid/bulletins for the daily reading.',
    words: ['https://example.invalid/bulletins', 'for the daily reading'],
    sanitized:
      'Read `https://example.invalid/bulletins` for the daily reading.',
  },
  {
    id: 'wiki-link-opener',
    text: 'Filed beside [[Coastal network]] in the same folder.',
    words: ['Coastal network', 'in the same folder'],
    sanitized: 'Filed beside [\\[Coastal network]] in the same folder.',
  },
  {
    id: 'heading-run',
    text: '## Coastal network\nalpha measured 0 mm overnight.',
    words: ['Coastal network', 'alpha measured 0 mm overnight.'],
    sanitized: '\\## Coastal network\nalpha measured 0 mm overnight.',
  },
  {
    id: 'setext-underline',
    text: 'Coastal network\n=====\nalpha measured 0 mm overnight.',
    words: ['Coastal network', 'alpha measured 0 mm overnight.'],
    sanitized: 'Coastal network\n\\=====\nalpha measured 0 mm overnight.',
  },
];

// ---------------------------------------------------------------------------
// Cases: the near-misses, which a widened pattern breaks first
// ---------------------------------------------------------------------------

describe('sanitizeUntrusted — text that only looks like markup', () => {
  for (const entry of UNTOUCHED_TEXTS) {
    it(`leaves ${entry.id} exactly as it arrived`, () => {
      expect(sanitizeUntrusted(entry.text)).toBe(entry.text);
    });
  }

  // The roster is walked, so an emptied one passes every case above
  // having compared nothing. Held to its own membership, and to the
  // entries whose absence would be least visible: the embed that is
  // not an embed, and the marker half that forges nothing.
  it('is driven over a roster that still holds its near misses', () => {
    const ids = UNTOUCHED_TEXTS.map((entry) => entry.id);

    expect(ids).toContain('alt-with-bracket');
    expect(ids).toContain('marker-suffix-alone');
    expect(ids).toContain('comparison');
    expect(ids.length).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Cases: every form, both halves of the rule
// ---------------------------------------------------------------------------

describe('sanitizeUntrusted — the forms it neutralizes', () => {
  for (const form of NEUTRALIZED_FORMS) {
    it(`neutralizes ${form.id}`, () => {
      expect(sanitizeUntrusted(form.text)).toBe(form.sanitized);
    });
  }

  // The first half of the rule, made separately from the pins above.
  // A pin agrees with itself the moment somebody updates it to
  // whatever the module now answers, where this fails unless the
  // words are still in there.
  it('leaves every injected word verbatim', () => {
    const lost = NEUTRALIZED_FORMS.flatMap((form) => {
      const answer = sanitizeUntrusted(form.text);

      return form.words
        .filter((word) => !answer.includes(word))
        .map((word) => `${form.id}: ${word}`);
    });

    expect(lost).toEqual([]);
  });

  // The second half. A zero-hit reading, controlled by the case below
  // it rather than trusted on its own.
  it('leaves no active form in any answer', () => {
    const left = NEUTRALIZED_FORMS.flatMap((form) => {
      const answer = sanitizeUntrusted(form.text);

      return activeFormsLeftIn(answer).map((id) => `${form.id}: ${id}`);
    });

    expect(left).toEqual([]);
  });

  // The control for that sweep: over the INPUTS the same predicate
  // must find every form the roster names. A predicate that had
  // stopped matching reads exactly like a clean answer otherwise.
  it('finds every form in the text before the module runs', () => {
    const found = NEUTRALIZED_FORMS.flatMap((form) => activeFormsLeftIn(
      form.text,
    ));

    expect(sorted([...new Set(found)])).toEqual(sorted(ACTIVE_FORM_IDS));
  });

  // The two rosters are held to the same closed set, which is what
  // stops a form being driven by nothing or looked for by nothing.
  it('drives every form the module names, and no other', () => {
    const ids = NEUTRALIZED_FORMS.map((form) => form.id);

    expect(sorted(ids)).toEqual(sorted(ACTIVE_FORM_IDS));
  });
});

// ---------------------------------------------------------------------------
// Cases: the marker, and text that tries to forge one
// ---------------------------------------------------------------------------

/** The marker's opening half, as the module writes it. */
const MARKER_PREFIX = 'SANMD_PROTECTED_';

/** Its closing half. */
const MARKER_SUFFIX = '_ENDSANMD';

/** One embed, used across this section. */
const EMBED = '![a chart](https://example.invalid/c.png)';

/** What {@link EMBED} renders to once restored. */
const EMBED_SPAN = '`[image link removed: a chart]'
  + '(https://example.invalid/c.png)`';

describe('sanitizeUntrusted — the marker, and text forging one', () => {
  it('cuts a marker prefix out of the text before anything runs', () => {
    expect(sanitizeUntrusted(`before ${MARKER_PREFIX}after`))
      .toBe('before after');
  });

  it('restores a parked span verbatim, marker and all', () => {
    expect(sanitizeUntrusted(EMBED)).toBe(EMBED_SPAN);
  });

  it('gives each embed its own marker', () => {
    expect(sanitizeUntrusted(`${EMBED} ${EMBED}`))
      .toBe(`${EMBED_SPAN} ${EMBED_SPAN}`);
  });

  // The two cases below pin behaviour nobody would design, for the
  // reason the module header gives: the cut above is a SINGLE pass,
  // so removing one occurrence can join what surrounded it into a
  // fresh one. The marker's own first fragment in front of the prefix
  // leaves a prefix behind, and what follows it is then read as a
  // marker this module wrote. Preserved because the parity suite is
  // the gate that decides whether the port landed; delete these two
  // on the day the callers' phase repairs it.
  it('restores a forged marker naming no span as the word undefined', () => {
    const forged = `SANMD_${MARKER_PREFIX}PROTECTED_7${MARKER_SUFFIX}`;

    expect(sanitizeUntrusted(`${forged} ${EMBED}`))
      .toBe(`undefined ${EMBED_SPAN}`);
  });

  it('restores a forged marker naming a real span by repeating it', () => {
    const forged = `SANMD_${MARKER_PREFIX}PROTECTED_0${MARKER_SUFFIX}`;

    expect(sanitizeUntrusted(`${forged} ${EMBED}`))
      .toBe(`${EMBED_SPAN} ${EMBED_SPAN}`);
  });

  // The control for the pair above: without the extra fragment in
  // front, the same text is cut clean and forges nothing. That is
  // what says those two cases are about the single pass rather than
  // about the cut failing outright.
  it('forges nothing when the prefix is not doubled up', () => {
    const plain = `${MARKER_PREFIX}PROTECTED_0${MARKER_SUFFIX}`;

    expect(sanitizeUntrusted(`${plain} ${EMBED}`))
      .toBe(`PROTECTED_0${MARKER_SUFFIX} ${EMBED_SPAN}`);
  });
});

// ---------------------------------------------------------------------------
// Cases: passes that reach each other
// ---------------------------------------------------------------------------

describe('sanitizeUntrusted — where one pass reaches another', () => {
  // The parking order, visible in the answer. The embed is parked
  // before the link pass runs, so the link pass wraps the marker as
  // part of the link it found — and the restored span comes back
  // INSIDE that wrap. Backticks nest, which is the original's reading
  // and the reason the parking exists at all: without it the embed's
  // own URL would be wrapped a second time.
  it('wraps a link that runs into a parked embed, span and all', () => {
    expect(sanitizeUntrusted('https://example.invalid/![a](b)'))
      .toBe('`https://example.invalid/`[image link removed: a](b)``');
  });

  // The other half of what the parking buys: the embed's own URL is
  // neutralized exactly once, so the span carries one pair of
  // backticks rather than two.
  it('does not wrap an embed URL a second time', () => {
    const answer = sanitizeUntrusted(EMBED);

    expect(answer.split('`').length - 1).toBe(2);
  });

  // A tag is removed before links are wrapped, so a link that only
  // ever existed inside an attribute is gone rather than wrapped.
  it('removes a link that lived inside a tag attribute', () => {
    expect(sanitizeUntrusted('a <img src="https://example.invalid/p.png"> b'))
      .toBe('a  b');
  });

  it('escapes an underline and a heading run in the same text', () => {
    expect(sanitizeUntrusted('---\n# heading')).toBe('\\---\n\\# heading');
  });

  // The underline pattern matches trailing spaces and tabs and the
  // escape does not write them back, so a separator that ended in
  // whitespace comes out without it. The original's reading, pinned
  // because it is the one place this module drops a character it was
  // not asked to escape.
  it('drops the whitespace behind an underline it escapes', () => {
    expect(sanitizeUntrusted('title\n---  \nafter'))
      .toBe('title\n\\---\nafter');
  });

  // A carriage return closes a line for this pattern as much as a
  // line feed does, so a document with the other line ending is
  // escaped identically and keeps its endings.
  it('escapes an underline on a line ending in a carriage return', () => {
    expect(sanitizeUntrusted('title\r\n===\r\nafter'))
      .toBe('title\r\n\\===\r\nafter');
  });
});

// ---------------------------------------------------------------------------
// Cases: the shared corpus
// ---------------------------------------------------------------------------

/** Every corpus entry, sanitized, labelled by its id. */
function corpusAnswers(): { id: string; answer: string }[] {
  return MARKUP_FIXTURES.map((fixture) => ({
    id: fixture.id,
    answer: sanitizeUntrusted(fixture.text),
  }));
}

describe('sanitizeUntrusted — the shared markup corpus', () => {
  // The corpus is a shared neutral one and this module is not its
  // only reader, so the entries are walked rather than copied — an
  // entry added there is driven here without anybody editing a list.
  // What is asserted is that the three entries this section's claims
  // depend on are still in it.
  it('is driven over a corpus that still holds its controls', () => {
    const ids = MARKUP_FIXTURES.map((fixture) => fixture.id);

    expect(ids).toContain('markdown-active-forms');
    expect(ids).toContain('markdown-plain');
    expect(ids).toContain('markup-plain');
    expect(ids.length).toBeGreaterThan(5);
  });

  it('answers for every corpus entry', () => {
    const endings = MARKUP_FIXTURES.map((fixture) => {
      const ending = endingOf(() => sanitizeUntrusted(fixture.text));

      return `${fixture.id}: ${ending}`;
    });

    expect(endings).toEqual(
      MARKUP_FIXTURES.map((fixture) => `${fixture.id}: ${ANSWERED}`),
    );
  });

  it('leaves no active form in any corpus answer', () => {
    const left = corpusAnswers().flatMap((read) => {
      const forms = activeFormsLeftIn(read.answer);

      return forms.map((id) => `${read.id}: ${id}`);
    });

    expect(left).toEqual([]);
  });

  // The corpus's two control entries carry no active form at all, so
  // they must come back byte for byte. This is the case a pass that
  // neutralized everything fails, and it is why those entries are in
  // the corpus.
  it('returns prose carrying no active form unchanged', () => {
    const unchanged = ['markdown-plain', 'markup-plain'].map((id) => {
      const fixture = fixtureById(MARKUP_FIXTURES, id);

      return sanitizeUntrusted(fixture.text) === fixture.text;
    });

    expect(unchanged).toEqual([true, true]);
  });

  // The other end of the same control: the entry written to carry
  // every form must come back CHANGED, or the case above would be
  // satisfied by a module that returns its input.
  it('changes the entry written to carry every form', () => {
    const fixture = fixtureById(MARKUP_FIXTURES, 'markdown-active-forms');

    expect(sanitizeUntrusted(fixture.text)).not.toBe(fixture.text);
  });
});

// ---------------------------------------------------------------------------
// Cases: input that is not text
// ---------------------------------------------------------------------------

/** The one shared adversarial value both exports refuse. */
const REFUSED_VALUE_ID = 'hostile-string-conversion';

/** What that refusal says, which both exports report identically. */
const REFUSAL = 'threw: this fixture refuses string conversion';

describe('sanitizeUntrusted — input that is not text', () => {
  it('reads absence as nothing', () => {
    expect(sanitizeUntrusted(null as unknown as string)).toBe('');
    expect(sanitizeUntrusted(undefined as unknown as string)).toBe('');
  });

  it('reads anything else as its own string conversion', () => {
    expect(sanitizeUntrusted(0 as unknown as string)).toBe('0');
    expect(sanitizeUntrusted(Number.NaN as unknown as string)).toBe('NaN');
    expect(sanitizeUntrusted(['a', 'b'] as unknown as string)).toBe('a,b');
  });

  // The one ending a caller has to be ready for. Driven off the
  // shared roster rather than a value built here, because the same
  // entry drives the parity suite.
  it('refuses a value whose string conversion throws', () => {
    const entry = fixtureById(ADVERSARIAL_VALUES, REFUSED_VALUE_ID);
    const ending = endingOf(() => sanitizeUntrusted(entry.build() as string));

    expect(ending).toBe(REFUSAL);
  });

  it('answers for every other value the shared roster holds', () => {
    const refused = ADVERSARIAL_VALUES
      .filter((entry) => entry.id !== REFUSED_VALUE_ID)
      .map((entry) => {
        const ending = endingOf(
          () => sanitizeUntrusted(entry.build() as string),
        );

        return `${entry.id}: ${ending}`;
      })
      .filter((ending) => !ending.endsWith(ANSWERED));

    expect(refused).toEqual([]);
    expect(ADVERSARIAL_VALUES.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Cases: the slugger
// ---------------------------------------------------------------------------

/**
 * A name written in a script with no ASCII letters in it.
 *
 * Built from code points rather than pasted, so the source stays ASCII
 * and the characters cannot drift from what the case is about. Three
 * Cyrillic letters, none of them in the slug's allowlist — so the
 * whole name reduces to nothing at all.
 */
const NON_ASCII_NAME = String.fromCodePoint(0x0410, 0x043b, 0x044c);

/** One name, a cap, and the slug the pair reduces to. */
interface SlugReading {
  /** Stable id a failure prints. */
  readonly id: string;

  /** The name to reduce. */
  readonly name: string;

  /** The cap, or nothing at all to take the default. */
  readonly cap?: number;

  /** The whole slug. */
  readonly slug: string;
}

/**
 * Every reduction worth pinning, the empty answers first.
 *
 * The empty ones come first because they are the answers a caller is
 * least likely to be ready for and most likely to write to a path
 * anyway: a name in a script with no ASCII letters, a name that was
 * only punctuation, and a cap of zero or `NaN` all reduce to nothing,
 * and nothing is not an error here.
 *
 * A NEGATIVE cap is the one nearby reading that is not empty, and it
 * is in the roster for exactly that reason: the cut is a slice, so a
 * negative cap is an offset from the END and drops that many
 * characters instead of keeping them. A caller who meant a short name
 * gets a nearly-whole one.
 */
const SLUG_READINGS: readonly SlugReading[] = [
  { id: 'empty-name', name: '', slug: '' },
  { id: 'punctuation-only', name: '---', slug: '' },
  { id: 'separators-only', name: ' . _ / ', slug: '' },
  { id: 'no-ascii-letters', name: NON_ASCII_NAME, slug: '' },
  { id: 'zero-cap', name: 'alpha', cap: 0, slug: '' },
  { id: 'negative-cap', name: 'alpha', cap: -1, slug: 'alph' },
  { id: 'not-a-number-cap', name: 'alpha', cap: Number.NaN, slug: '' },
  { id: 'lowercased', name: 'Coastal Network', slug: 'coastal-network' },
  { id: 'runs-collapsed', name: 'alpha   ---   bravo', slug: 'alpha-bravo' },
  { id: 'edges-trimmed', name: '  --alpha--  ', slug: 'alpha' },
  { id: 'digits-kept', name: 'gauge 4 at 0 mm', slug: 'gauge-4-at-0-mm' },
  { id: 'dots-collapsed', name: 'A-B_C.D', slug: 'a-b-c-d' },
  {
    id: 'cap-cuts-mid-word',
    name: 'alpha bravo charlie',
    cap: 8,
    slug: 'alpha-br',
  },
  {
    id: 'cap-strands-a-hyphen',
    name: 'alpha bravo charlie',
    cap: 6,
    slug: 'alpha',
  },
  {
    id: 'fractional-cap-floors',
    name: 'alpha bravo',
    cap: 5.5,
    slug: 'alpha',
  },
  { id: 'default-cap-applies', name: 'a'.repeat(80), slug: 'a'.repeat(60) },
];

/** A slug that a path can hold: the allowlist, and both edges. */
const SAFE_SLUG_RE = /^$|^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

describe('slugify', () => {
  for (const reading of SLUG_READINGS) {
    it(`reduces ${reading.id}`, () => {
      expect(slugify(reading.name, reading.cap)).toBe(reading.slug);
    });
  }

  // The roster is walked, so it is held to its own membership and to
  // the readings a caller is least ready for.
  it('is driven over a roster that still holds its empty answers', () => {
    const ids = SLUG_READINGS.map((reading) => reading.id);
    const empty = SLUG_READINGS.filter((reading) => reading.slug === '');

    expect(ids).toContain('no-ascii-letters');
    expect(ids).toContain('cap-strands-a-hyphen');
    expect(empty.length).toBeGreaterThan(3);
  });

  // The cap is honoured only for a NUMBER, which matters because a
  // cap read out of configuration arrives as text. A caller passing
  // the digits as a string gets the default, not the cap they meant.
  it('takes the default cap for a cap that is not a number', () => {
    const name = 'alpha bravo charlie delta';

    expect(slugify(name, '5' as unknown as number))
      .toBe('alpha-bravo-charlie-delta');
    expect(slugify(name, 5)).toBe('alpha');
  });

  it('reads absence as nothing', () => {
    expect(slugify(null as unknown as string)).toBe('');
    expect(slugify(undefined as unknown as string)).toBe('');
  });

  it('reads anything else as its own string conversion', () => {
    expect(slugify(123 as unknown as string)).toBe('123');
    expect(slugify(['a', 'b'] as unknown as string)).toBe('a-b');
  });

  it('refuses a value whose string conversion throws', () => {
    const entry = fixtureById(ADVERSARIAL_VALUES, REFUSED_VALUE_ID);
    const ending = endingOf(() => slugify(entry.build() as string));

    expect(ending).toBe(REFUSAL);
  });

  // The whole allowlist, as one claim over every reading above: a
  // slug holds lowercase letters, digits and hyphens and nothing
  // else, and never opens or closes with a hyphen. That is what makes
  // it safe to put in a path, and it is a claim no single reading
  // above makes on its own.
  it('answers only characters a path can hold', () => {
    const offending = SLUG_READINGS
      .map((reading) => ({
        id: reading.id,
        slug: slugify(reading.name, reading.cap),
      }))
      .filter((answer) => !SAFE_SLUG_RE.test(answer.slug))
      .map((answer) => `${answer.id}: ${answer.slug}`);

    expect(offending).toEqual([]);
  });
});
