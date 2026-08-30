/**
 * Full parity for `src/lib/sanitize-md.ts`: both exports, driven
 * against their originals over one neutral corpus.
 *
 * The port claims behaviour preservation, and its module TSDoc names
 * four things it drops — none of them behaviour. This file is what
 * makes that a measurement rather than an assertion. Every comparison
 * hands both implementations the same input and diffs what came back,
 * so a divergence is reported by path and by kind rather than as a
 * failed expectation somebody has to reconstruct.
 *
 * A neutralizer is the one library in this wave where an EXHAUSTIVE
 * leg is both affordable and the right shape, so this file carries
 * one. Six patterns run in a fixed order over the same string, and
 * they interact: an embed parks a span the link pass then wraps, a
 * removed tag can join what surrounded it, an escape can put a
 * backslash where a later pattern was about to anchor. Those are the
 * differences a hand-written corpus is worst at finding and a walk
 * over every short string is best at, because the interesting inputs
 * are short by construction — every one of them is a few of the ten
 * characters the patterns branch on, in some order. So the corpus and
 * the authored texts drive the READABLE shapes and the enumeration
 * drives the combinations nobody would think to write down.
 *
 * Both sides go through {@link outcomeOf} even though neither is meant
 * to throw for text, and that is the point rather than an oversight: a
 * comparison reading only the value a call returned passes for a port
 * that throws where the original answered. It also covers the one
 * ending that IS reachable — a value whose string conversion refuses —
 * which both implementations must reach identically.
 *
 * That arrangement needs a control and here it takes three parts, one
 * per way this file could agree having measured nothing. The port must
 * answer for every text driven, since a run where it refused would
 * mean the comparisons had started diffing one exception against
 * another. The adversarial roster must produce BOTH endings, or the
 * refusal half of {@link outcomeOf} is never exercised. And the driven
 * texts must include some the port CHANGES and some it leaves alone —
 * a corpus that had drifted into inert prose would agree perfectly
 * having neutralized nothing at all, which is exactly the regression
 * this gate exists to catch.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and a
 * load up there would throw on every run that armed nothing — CI's
 * included.
 */
import { expect, it } from 'vitest';

import { sanitizeUntrusted, slugify } from '../../src/lib/sanitize-md.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { ADVERSARIAL_VALUES, MARKUP_FIXTURES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/sanitize-md.js';

/** The two entry points this file drives, in sorted order. */
const ENTRY_POINTS: readonly string[] = ['sanitizeUntrusted', 'slugify'];

/** What the origin module has to be for this file to drive it. */
interface SanitizeMdOrigin {
  /** Neutralizes every active form in untrusted text. */
  readonly sanitizeUntrusted: (text: string) => unknown;

  /** Reduces a name to a filesystem-safe slug. */
  readonly slugify: (name: string, maxLen?: number) => unknown;
}

/** Whether every entry point is there and is callable. */
function isSanitizeMdOrigin(value: unknown): value is SanitizeMdOrigin {
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
function originSanitizeMd(): SanitizeMdOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isSanitizeMdOrigin(loaded)) {
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
 * Drive both implementations over one text, through the neutralizer.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin module.
 * @param input - What to hand both sides.
 * @returns Every comparison that parted.
 */
function compareSanitize(
  over: string,
  origin: SanitizeMdOrigin,
  input: unknown,
): LabelledDivergence[] {
  const text = input as string;

  return compare(
    over,
    outcomeOf(() => origin.sanitizeUntrusted(text)),
    outcomeOf(() => sanitizeUntrusted(text)),
  );
}

/**
 * Drive both implementations over one name and cap, through the
 * slugger.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin module.
 * @param input - The name to hand both sides.
 * @param cap - The cap to hand both sides, which need not be a number.
 * @returns Every comparison that parted.
 */
function compareSlugify(
  over: string,
  origin: SanitizeMdOrigin,
  input: unknown,
  cap: unknown,
): LabelledDivergence[] {
  const name = input as string;
  const maxLen = cap as number;

  return compare(
    over,
    outcomeOf(() => origin.slugify(name, maxLen)),
    outcomeOf(() => slugify(name, maxLen)),
  );
}

// ---------------------------------------------------------------------------
// The inputs beyond the shared corpus
// ---------------------------------------------------------------------------

/** The marker's opening half, as both implementations write it. */
const MARKER_PREFIX = 'SANMD_PROTECTED_';

/** Its closing half. */
const MARKER_SUFFIX = '_ENDSANMD';

/** One embed, reused across the authored texts. */
const EMBED = '![a chart](https://example.invalid/c.png)';

/**
 * Every text worth driving that the corpus has no entry for.
 *
 * The corpus holds documents written to demonstrate what the two
 * reductions in this platform do to markup, so these are deliberately
 * wider: the places six ordered patterns can be subtly wrong without
 * any readable document noticing. Where a pattern starts and stops,
 * what a removed tag leaves behind, which line endings close a line,
 * how the passes reach each other, and every way untrusted text can
 * try to write the marker that parks a neutralized span.
 */
const AUTHORED_TEXTS: readonly string[] = [
  '', '\n', '\r', '\r\n', '#', '###', '-', '=', '---', '===', '-=-=',
  '---  ', '===\t', '--- x', ' ---', '#x\n##y\nz # w', '  # indented',
  'title\n---\nafter', 'title\r\n---\r\nafter', 'title\n---  \nafter',
  '[[', '[[[', '[[a]]', '[[[a]]]', 'a [ b ] c',
  '<', '<a', '<a>', '</a>', '<3', 'a < b', 'a <b> c', 'a <div\nclass="x"> b',
  '<!-- a comment with a > in it -->', '<img alt="a quoted > here">',
  'https://example.invalid/a', 'http://example.invalid/b',
  'https://example.invalid/a) b', 'https://example.invalid/a] b',
  'https://example.invalid/a> b', 'https://example.invalid/a` b',
  'https://example.invalid/a. next', '(https://example.invalid/a)',
  '[label](https://example.invalid/p)', 'x `https://example.invalid/a` y',
  '![](u)', '![a](u)', '![a](https://example.invalid/i.png)',
  '![a [x] b](u)', '![a](b(1))', '![a](b)c)', '![a\nb](c)', '!\\[a](b)',
  EMBED, `${EMBED} ${EMBED}`, `https://example.invalid/${EMBED}`,
  MARKER_PREFIX, MARKER_SUFFIX, `x${MARKER_SUFFIX}`,
  `${MARKER_PREFIX}0${MARKER_SUFFIX}`,
  `${MARKER_PREFIX}0${MARKER_SUFFIX} ${EMBED}`,
  `SANMD_${MARKER_PREFIX}PROTECTED_0${MARKER_SUFFIX} ${EMBED}`,
  `SANMD_${MARKER_PREFIX}PROTECTED_7${MARKER_SUFFIX} ${EMBED}`,
  `SANMD_${MARKER_PREFIX}PROTECTED_7${MARKER_SUFFIX}`,
  `${MARKER_PREFIX}${MARKER_PREFIX}0${MARKER_SUFFIX} ${EMBED}`,
  'Station alpha measured 0 mm overnight, and bravo was offline.',
];

/**
 * The characters every pattern in the library branches on.
 *
 * Ten of them, which is what makes the enumeration below affordable: a
 * pattern that reads a bang, a bracket, a parenthesis, a hash, a dash,
 * an equals sign, an angle bracket, a newline or an ordinary letter
 * has all of its decisions represented, and a string made only of
 * these is a string that exercises them in some order.
 */
const BRANCH_ALPHABET: readonly string[] = [
  '!', '[', ']', '(', ')', '#', '-', '=', '<', 'a', '\n',
];

/** How long an enumerated string gets. */
const ENUMERATION_LENGTH = 4;

/**
 * Every string up to {@link ENUMERATION_LENGTH} characters over
 * {@link BRANCH_ALPHABET}, the empty one included.
 *
 * Built rather than written down, and built here rather than shared,
 * because it is this library's leg: a neutralizer is a fixed sequence
 * of patterns over one string, so the whole of its behaviour on short
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

/** Every text this file drives the neutralizer over. */
function everyDrivenText(): string[] {
  return [
    ...MARKUP_FIXTURES.map((fixture) => fixture.text),
    ...AUTHORED_TEXTS,
  ];
}

/**
 * Names the slugger is driven over.
 *
 * Shorter than the neutralizer's set on purpose: the slugger is one
 * chain of four replacements with no interaction between them, so what
 * matters is the character classes and the cut rather than the
 * combinations.
 */
const SLUG_NAMES: readonly string[] = [
  '', ' ', '-', '---', '  --alpha--  ', 'Alpha Bravo', 'alpha   bravo',
  'A-B_C.D', 'gauge 4 at 0 mm', 'ALPHA', 'alpha/bravo', 'alpha\nbravo',
  'a'.repeat(80), `${'a'.repeat(59)} b`, 'abcde fghij',
  String.fromCodePoint(0x0410, 0x043b, 0x044c),
  String.fromCodePoint(0x00c4, 0x00d6, 0x00dc, 0x0020, 0x0062),
];

/**
 * Caps the slugger is driven with, every one of them a shape a caller
 * can actually produce.
 *
 * The non-numbers are the point rather than padding: the cap applies
 * only when it IS a number, so a cap arriving as text from
 * configuration silently takes the default, and both implementations
 * have to take it the same way.
 */
const SLUG_CAPS: readonly unknown[] = [
  undefined, null, 0, 1, 5, 5.5, 6, 8, 60, -1, -100,
  Number.NaN, Number.POSITIVE_INFINITY, '5', {}, [],
];

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
  return everyDrivenText().map((text) => sanitizeUntrusted(text) !== text);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('sanitize-md — the origin the comparisons read', () => {
  it('exports the two entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isSanitizeMdOrigin(loaded)).toBe(true);
  });

  // First control: this library answers for any TEXT, so a run where
  // the port refused one would mean the comparisons below had started
  // diffing one exception against another.
  it('is driven over texts the port never refuses', () => {
    const refused = everyDrivenText()
      .filter((text) => outcomeOf(() => sanitizeUntrusted(text)).refused);

    expect(refused).toEqual([]);
  });

  // Second control: the refusal half of the outcome wrapper is only
  // exercised if something reaches it, and the adversarial roster is
  // what does. Both endings must appear there or the wrapper is
  // carrying half its weight.
  it('is driven over values producing both endings', () => {
    const endings = ADVERSARIAL_VALUES.map(
      (entry) => outcomeOf(() => sanitizeUntrusted(entry.build() as string))
        .refused,
    );

    expect(endings).toContain(true);
    expect(endings).toContain(false);
  });

  // Third control, and the one this gate would be worthless without:
  // the driven texts must carry both readings. A set that had drifted
  // into prose carrying no active form would agree perfectly having
  // neutralized nothing, which is the regression this file exists to
  // catch.
  it('is driven over texts the port both changes and leaves alone', () => {
    const changed = portChangedEachText();

    expect(changed).toContain(true);
    expect(changed).toContain(false);
    expect(changed.filter(Boolean).length).toBeGreaterThan(20);
  });
});

describePortParity('sanitize-md — the markup corpus', () => {
  for (const fixture of MARKUP_FIXTURES) {
    it(`agrees over ${fixture.id}`, () => {
      const origin = originSanitizeMd();

      expect(compareSanitize(fixture.id, origin, fixture.text)).toEqual([]);
    });
  }
});

describePortParity('sanitize-md — the texts no corpus holds', () => {
  // One case over the whole roster rather than one per text. A
  // divergence here is a difference in how a pattern reads a SHAPE,
  // and the set of texts that moved together is the reading a failure
  // needs — one case per text would report whichever ran first and
  // leave the shape of the drift to be reconstructed.
  it('agrees over every authored text', () => {
    const origin = originSanitizeMd();
    const apart = AUTHORED_TEXTS.flatMap(
      (text) => compareSanitize(JSON.stringify(text), origin, text),
    );

    expect(apart).toEqual([]);
  });

  // The roster is walked, so an emptied roster passes the case above
  // without comparing anything. Held against its own membership: the
  // shapes a reader would expect to find are asserted present, and
  // the count is asserted only as a floor.
  it('is driven over a roster that still holds its edge shapes', () => {
    expect(AUTHORED_TEXTS).toContain('');
    expect(AUTHORED_TEXTS).toContain('![a [x] b](u)');
    expect(AUTHORED_TEXTS).toContain(MARKER_PREFIX);
    expect(AUTHORED_TEXTS).toContain(
      `SANMD_${MARKER_PREFIX}PROTECTED_7${MARKER_SUFFIX} ${EMBED}`,
    );
    expect(AUTHORED_TEXTS.length).toBeGreaterThan(60);
  });
});

describePortParity('sanitize-md — every short string', () => {
  // The exhaustive leg. One case, because the answer wanted is the
  // SET of strings that moved rather than the first one: a pattern
  // read one character differently parts over a family, and the
  // family is the diagnosis.
  it('agrees over every string the patterns branch on', () => {
    const origin = originSanitizeMd();
    const apart = enumerateBranchStrings().flatMap(
      (text) => compareSanitize(JSON.stringify(text), origin, text),
    );

    expect(apart).toEqual([]);
  });

  // The enumeration is generated, so its size is the only thing
  // saying it enumerated anything. Held against the closed form, and
  // against the two members whose absence would be least visible.
  it('enumerates every string over its alphabet', () => {
    const strings = enumerateBranchStrings();
    const expected = [0, 1, 2, 3, 4]
      .map((length) => BRANCH_ALPHABET.length ** length)
      .reduce((total, count) => total + count, 0);

    expect(strings.length).toBe(expected);
    expect(new Set(strings).size).toBe(expected);
    expect(strings).toContain('');
    expect(strings).toContain('![](');
  });
});

describePortParity('sanitize-md — the slugger', () => {
  // Every name against every cap, in one case. The pair is the input
  // here, and a divergence over one cap and not another is the shape
  // a failure needs to report.
  it('agrees over every name and cap', () => {
    const origin = originSanitizeMd();
    const apart = SLUG_NAMES.flatMap((name) => SLUG_CAPS.flatMap(
      (cap) => compareSlugify(
        `${JSON.stringify(name)} cap=${String(cap)}`,
        origin,
        name,
        cap,
      ),
    ));

    expect(apart).toEqual([]);
  });

  // Both rosters are walked, so both are held to their membership.
  // The caps matter more than the names: a roster that had lost its
  // non-numbers would leave the whole default-cap rule undriven.
  it('is driven over caps that are not numbers', () => {
    const notNumbers = SLUG_CAPS.filter((cap) => typeof cap !== 'number');

    expect(SLUG_CAPS).toContain(undefined);
    expect(SLUG_CAPS).toContain('5');
    // `toContain` compares with `===`, which no NaN satisfies, so the
    // one cap whose whole point is that it is not a usable number has
    // to be asserted by predicate or it can never be asserted at all.
    expect(SLUG_CAPS.some(Number.isNaN)).toBe(true);
    expect(notNumbers.length).toBeGreaterThan(3);
    expect(SLUG_NAMES).toContain('');
    expect(SLUG_NAMES.length * SLUG_CAPS.length).toBeGreaterThan(200);
  });
});

describePortParity('sanitize-md — input that is not text', () => {
  // The guard in front of both entry points is the only thing
  // standing between a Code node's absent field and a crash inside a
  // string method, and it is the one part of this library a type
  // annotation makes invisible: the compiler will never let a caller
  // here reach it, and the spliced copy runs where no type was ever
  // checked. So it is driven over the shared adversarial roster, each
  // value built fresh for each side.
  it('agrees over every adversarial value, through both exports', () => {
    const origin = originSanitizeMd();
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => [
      ...compareSanitize(
        `${entry.id} (sanitizeUntrusted)`,
        origin,
        entry.build(),
      ),
      ...compareSlugify(
        `${entry.id} (slugify)`,
        origin,
        entry.build(),
        undefined,
      ),
    ]);

    expect(apart).toEqual([]);
  });

  // The roster is walked, and it is a shared one this file does not
  // own. Held to the members whose reading here is distinct: absence
  // must reach the guard, a value with characters in it must reach
  // the conversion behind the guard, and the hostile conversion must
  // still be there or the refusal half of the wrapper is undriven.
  it('is driven over a roster holding absence and a refusal', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('null');
    expect(ids).toContain('undefined');
    expect(ids).toContain('numeric-string');
    expect(ids).toContain('hostile-string-conversion');
  });
});
