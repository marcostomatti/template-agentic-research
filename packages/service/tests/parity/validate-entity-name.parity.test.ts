/**
 * Full parity for `src/lib/validate-entity-name.ts`: the gate,
 * driven against its original over the same neutral injection
 * corpus `tests/lib/injection.test.ts` uses, and diffed by path.
 *
 * FULL rather than kernel, and the boundary is worth stating
 * because the port carries a rename and a new parameter. The
 * original exports ONE function and this port's default call has
 * the same arity, so every reading the original has is reachable
 * here and the comparison is of whole answers rather than of
 * pieces. The one thing outside the leg is the non-answer roster
 * argument, which the original has no equivalent for at all —
 * `tests/lib/validate-entity-name.test.ts` is the whole record of
 * that, and this file drives the default call only.
 *
 * ## What this file knows about the checkout, and what it discovers
 *
 * It knows the original module's PATH, which is a name written in
 * the subject matter this port renames away from. There is no way
 * around that one: a parity file cannot address a module by a path
 * the module does not have. It appears here, in the one directory
 * whose whole purpose is to talk to the original, and nowhere else
 * in this repository.
 *
 * It does NOT know the export's name. The module has exactly one
 * export, so the name is read off the loaded module at run time and
 * the arity guard is what makes that a discovery rather than a
 * guess: a module answering two exports, or one whose export is not
 * a function of one argument, refuses here instead of being called
 * as `undefined` while every comparison below diffs one TypeError
 * against another. One fewer origin word AND a real non-vacuity
 * guard, where writing the name down would be neither.
 *
 * ## A throw is an answer, and this gate never throws
 *
 * Both sides go through {@link outcomeOf}, which turns either
 * ending into a value. That is not because either is expected to
 * refuse — the gate takes `unknown`, checks the type first, and
 * answers a value for everything — but because a comparison
 * reading only what a call RETURNED passes for a port that started
 * throwing where the original answered, which for a gate whose
 * whole contract is that it fails non-fatally is the largest
 * regression available.
 *
 * The control that arrangement needs INVERTS the usual one. Where a
 * refusing library must be shown to produce both endings, this one
 * must be shown to produce exactly ONE: every driven input
 * answered, over a corpus that still reaches more than one reading.
 * So three cases hold it down — the port refuses nothing across the
 * whole driven set, the set reaches both an acceptance and a
 * refusal, and the set reaches every rejection reason the module
 * declares. A corpus that had collapsed onto one answer would agree
 * perfectly having measured a constant.
 *
 * ## What the differ does not compare, and the cases that do
 *
 * `firstDivergence` compares own keys and says nothing about key
 * ORDER or about prototypes. Both matter here for the same small
 * reason: a rejection is written into an audit line, so the order
 * `ok` and `reason` serialize in is part of what a reader stored,
 * and an answer whose prototype had moved would be a different
 * object to anything that walks it with `in`. Two cases compare
 * those directly, each with the reading that says it discriminates.
 *
 * ## Every load sits inside a case
 *
 * The gate binds a `describe` and nothing above one, so module
 * scope runs on a skipped run too. A load up there would throw on
 * every run that armed nothing, CI's included — which is the one
 * way a parity file can break a run it was written to skip.
 */
import { expect, it } from 'vitest';

import {
  ENTITY_NAME_REJECTIONS,
  MAX_ENTITY_NAME_LENGTH,
  validateEntityName,
} from '../../src/lib/validate-entity-name.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';
import {
  INJECTION_CANDIDATES,
  INJECTION_VECTORS,
  ZERO_WIDTH_SPLITTERS,
  ZERO_WIDTH_VECTOR,
} from '../lib/injection-fixtures.js';

import { ADVERSARIAL_VALUES, INVISIBLE_CODE_POINTS } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module: path written down, export name read off it
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/validate-company.js';

/** How many exports the original has, which is what makes the
 * discovery below a discovery. */
const ORIGIN_EXPORT_COUNT = 1;

/** How many arguments its gate takes, and this port's default call
 * takes the same number. */
const ORIGIN_GATE_ARITY = 1;

/** A gate: anything at all in, an answer out, never a throw. */
type OriginGate = (raw: unknown) => unknown;

/**
 * The original's single exported function, discovered rather than
 * named.
 *
 * Refuses on anything but exactly one export of exactly one
 * argument. Both halves are the guard: a module that had grown a
 * second export would leave the choice of which one to drive to
 * whichever key enumerated first, and a module whose export took a
 * different number of arguments is not the function this port
 * claims to be a port of.
 *
 * @returns The gate, ready to call.
 */
function originGate(): OriginGate {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (typeof loaded !== 'object' || loaded === null) {
    throw new TypeError('the origin module exported no object at all.');
  }

  const names = Object.keys(loaded);
  const only = names.length === ORIGIN_EXPORT_COUNT
    ? (loaded as Record<string, unknown>)[String(names[0])]
    : undefined;

  if (typeof only !== 'function' || only.length !== ORIGIN_GATE_ARITY) {
    throw new TypeError(
      `the origin module exports ${names.length} names, and this file `
      + `drives a module exporting exactly ${ORIGIN_EXPORT_COUNT} function `
      + `of ${ORIGIN_GATE_ARITY} argument.`,
    );
  }

  return only as OriginGate;
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
 * A throw that is not an `Error` is reported as its own shape
 * rather than coerced into a message, so a port raising a string
 * where the original raised an `Error` diverges instead of
 * agreeing.
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

/** One comparison that parted, labelled by the input behind it. */
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
 * Drive both implementations over one value, labelling any
 * difference.
 *
 * @param over - How a failure should name this input.
 * @param gate - The origin's gate.
 * @param value - What to hand both sides.
 * @returns One entry when they parted, none when they agreed.
 */
function compare(
  over: string,
  gate: OriginGate,
  value: unknown,
): LabelledDivergence[] {
  const found = firstDivergence(
    outcomeOf(() => gate(value)),
    outcomeOf(() => validateEntityName(value)),
  );

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

// ---------------------------------------------------------------------------
// What both sides are driven over
// ---------------------------------------------------------------------------

/** A line feed, from its code point, so this file stays ASCII. */
const LINE_FEED = String.fromCharCode(10);

/** A carriage return, likewise. */
const CARRIAGE_RETURN = String.fromCharCode(13);

/** A tab, likewise. */
const TAB = String.fromCharCode(9);

/**
 * Every string the injection corpus supplies, labelled.
 *
 * Three readings of each document rather than one, because a name
 * is not the only thing a gate meets: the candidates are what an
 * extractor would answer with, the whole texts are what a chatty
 * extractor hands over instead, and the individual LINES are the
 * shapes that fall out of splitting a document up. All three reach
 * the gate in practice and all three have to agree.
 *
 * @returns One `label, value` pair per string.
 */
function corpusInputs(): [string, unknown][] {
  const inputs: [string, unknown][] = [];

  for (const candidate of INJECTION_CANDIDATES) {
    inputs.push([`candidate ${candidate.id}`, candidate.value]);
  }

  for (const vector of INJECTION_VECTORS) {
    inputs.push([`document ${vector.id}`, vector.text]);

    for (const [index, line] of vector.text.split(LINE_FEED).entries()) {
      inputs.push([`line ${vector.id}:${index}`, line]);
    }

    for (const fragment of vector.survives) {
      inputs.push([`fragment ${vector.id}`, fragment]);
    }
  }

  inputs.push(['zero-width visible', ZERO_WIDTH_VECTOR.visible]);

  for (const splitter of ZERO_WIDTH_SPLITTERS) {
    inputs.push([`split ${splitter.id}`, `Station${splitter.char}Seven`]);
  }

  for (const point of INVISIBLE_CODE_POINTS) {
    inputs.push([`invisible ${point.id}`, `Station${point.char}Seven`]);
  }

  return inputs;
}

/** A name of exactly the cap, made only of allowlist characters. */
const AT_CAP = 'a'.repeat(MAX_ENTITY_NAME_LENGTH);

/**
 * The values the corpus has no entry for.
 *
 * Deliberately wider than any readable document: the places four
 * ordered checks can be subtly wrong without a plausible name
 * noticing. Where each check starts and stops, what the trim sees,
 * which characters the whitespace class holds, where the cap falls
 * relative to the collapse, and every non-answer spelling.
 *
 * The scheme-shaped entries carry a TWO-letter scheme rather than the
 * obvious one-letter one, and that is load-bearing rather than
 * arbitrary: a single letter in front of a colon and a separator is
 * the shape of a Windows drive path, which is one of the three kinds
 * `tests/invariants/parity-origin-hygiene.test.ts` refuses anywhere
 * under this directory. Shortening them back reddens that invariant,
 * and the check under test cannot tell the two spellings apart —
 * neither the denylist nor the allowlist reads what precedes a colon.
 */
const AUTHORED_VALUES: readonly unknown[] = [
  '', ' ', '  ', TAB, LINE_FEED, CARRIAGE_RETURN, `${TAB} ${TAB}`,
  AT_CAP, `${AT_CAP}a`, AT_CAP.slice(1), `  ${AT_CAP}  `,
  `${'a'.repeat(40)} ${'a'.repeat(40)}`, `${'a'.repeat(41)} ${'a'.repeat(41)}`,
  'unknown', 'UNKNOWN', 'Unknown', ' unknown ', 'unknown ltd', 'n/a', 'N/A',
  'none', 'None', 'confidential', 'stealth', 'stealth mode',
  'a:b', 'ab:/c', 'ab://c', '://', 'a@b', '@', '`a`', 'a{b}', 'a[b]', '[[a]]',
  '<a>', 'a>b', 'a<b', `a${LINE_FEED}b`, `a${CARRIAGE_RETURN}b`,
  'a/b', 'a?b', 'a=b', 'a#b', 'a%b', 'a*b', 'a|b', 'a$b', 'a~b', 'a!b',
  'a.b', 'a,b', 'a&b', 'a\'b', 'a(b)', 'a-b', 'a b', 'a  b', `a${TAB}b`,
  'Station Seven', ' Station   Seven ', '0', '007', 'a1', '1a',
  String.fromCodePoint(0x00c4, 0x00d6, 0x00dc), String.fromCodePoint(0x0410),
  String.fromCodePoint(0x6771, 0x4eac), String.fromCodePoint(0x1f600),
];

/**
 * The characters the gate's two patterns branch on.
 *
 * Sixteen of them, which is what makes the enumeration below
 * affordable at four characters: a denylist naming a scheme
 * separator, an address separator, both line terminators, a
 * backtick and six delimiters, and an allowlist naming a letter, a
 * space, a hyphen and a period, has every decision represented.
 * The question mark is the character both patterns refuse, which is
 * how the allowlist gets reached at all.
 */
const BRANCH_ALPHABET: readonly string[] = [
  ':', '/', '@', LINE_FEED, CARRIAGE_RETURN, '`', '[', ']',
  '<', '>', '{', ' ', 'a', '-', '?', '.',
];

/** How long an enumerated string gets. */
const ENUMERATION_LENGTH = 4;

/**
 * Every string up to {@link ENUMERATION_LENGTH} characters over
 * {@link BRANCH_ALPHABET}, the empty one included.
 *
 * Built rather than written down. The gate is four ordered checks
 * over one string, so the whole of its behaviour on short inputs is
 * reachable by walking them — and the interesting inputs ARE short,
 * because every one of them is a few of the sixteen characters the
 * checks branch on, in some order. That is the leg a hand-written
 * corpus is worst at: which check answers FIRST for a value that
 * fails several, which is the whole design of this module.
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

/** Every value this file hands the port, for the controls to read. */
function everyDrivenValue(): unknown[] {
  return [
    ...corpusInputs().map(([, value]) => value),
    ...AUTHORED_VALUES,
    ...enumerateBranchStrings(),
    ...ADVERSARIAL_VALUES.map((entry) => entry.build()),
  ];
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('validate-entity-name — loading the origin', () => {
  it('exports exactly one function of one argument', () => {
    expect(() => originGate()).not.toThrow();
    expect(originGate().length).toBe(ORIGIN_GATE_ARITY);
  });

  // The port's default call has to reach the original's whole
  // surface or the leg is kernel rather than full. The roster is a
  // DEFAULT parameter, which does not count toward the arity, so
  // this is the reading that says the extra parameter costs the
  // comparison nothing.
  it('is driven through a call of the same arity', () => {
    expect(validateEntityName.length).toBe(ORIGIN_GATE_ARITY);
  });

  // First control, and it INVERTS the usual one: this gate answers
  // for everything, so a run where the port refused an input would
  // mean the comparisons had started diffing one exception against
  // another and agreeing about nothing.
  it('is driven over values the port never refuses', () => {
    const refused = everyDrivenValue()
      .map((value, index) => ({
        index,
        ending: outcomeOf(() => validateEntityName(value)),
      }))
      .filter((entry) => entry.ending.refused)
      .map((entry) => entry.index);

    expect(refused).toEqual([]);
  });

  // Second control: a corpus collapsed onto one answer agrees
  // perfectly having measured a constant. Read off the PORT, since
  // the original is the thing under measurement.
  it('is driven over values reaching both endings', () => {
    const endings = everyDrivenValue().map(
      (value) => validateEntityName(value).ok,
    );

    expect(endings).toContain(true);
    expect(endings).toContain(false);
  });

  // Third control, one level down. Every reason the module declares
  // has to be reached by something, or a check nothing drives is
  // compared by nothing and the leg is short one of the four.
  it('is driven over values reaching every declared reason', () => {
    const produced = new Set<string>();

    for (const value of everyDrivenValue()) {
      const result = validateEntityName(value);

      if (!result.ok) {
        produced.add(result.reason);
      }
    }

    expect([...produced].sort()).toEqual([...ENTITY_NAME_REJECTIONS].sort());
  });
});

describePortParity('validate-entity-name — the injection corpus', () => {
  for (const vector of INJECTION_VECTORS) {
    it(`agrees over every candidate of ${vector.id}`, () => {
      const gate = originGate();
      const apart = vector.candidates.flatMap(
        (candidate) => compare(candidate.id, gate, candidate.value),
      );

      expect(apart).toEqual([]);
    });
  }

  // One case over the whole set rather than one per string: a
  // divergence here is a difference in how a CHECK reads a shape,
  // and the set of strings that moved together is the diagnosis.
  it('agrees over every document, line and fragment', () => {
    const gate = originGate();
    const apart = corpusInputs().flatMap(
      ([label, value]) => compare(label, gate, value),
    );

    expect(apart).toEqual([]);
  });

  // The corpus is walked, so it is held to its own membership: an
  // emptied one passes every case above having compared nothing.
  it('is driven over a corpus still holding all six documents', () => {
    const labels = corpusInputs().map(([label]) => label);
    const documents = labels.filter((label) => label.startsWith('document '));

    expect(documents.length).toBe(INJECTION_VECTORS.length);
    expect(labels.length).toBeGreaterThan(100);
    expect(INJECTION_CANDIDATES.length).toBe(19);
  });
});

describePortParity('validate-entity-name — the values no corpus holds', () => {
  it('agrees over every authored value', () => {
    const gate = originGate();
    const apart = AUTHORED_VALUES.flatMap(
      (value) => compare(JSON.stringify(value) ?? 'undefined', gate, value),
    );

    expect(apart).toEqual([]);
  });

  // Held to the shapes whose absence would be least visible: the
  // cap boundary on both sides, a value the trim decides, a
  // non-answer, and one shape from each of the two patterns.
  it('is driven over a roster that still holds its edge shapes', () => {
    expect(AUTHORED_VALUES).toContain('');
    expect(AUTHORED_VALUES).toContain(AT_CAP);
    expect(AUTHORED_VALUES).toContain(`${AT_CAP}a`);
    expect(AUTHORED_VALUES).toContain(`  ${AT_CAP}  `);
    expect(AUTHORED_VALUES).toContain('unknown');
    expect(AUTHORED_VALUES).toContain('ab://c');
    expect(AUTHORED_VALUES).toContain('a?b');
    expect(AUTHORED_VALUES.length).toBeGreaterThan(60);
  });
});

describePortParity('validate-entity-name — every short string', () => {
  // The exhaustive leg. One case, because the answer wanted is the
  // SET of strings that moved rather than the first: a check read
  // one character differently parts over a family, and the family
  // is the diagnosis.
  it('agrees over every string the checks branch on', () => {
    const gate = originGate();
    const apart = enumerateBranchStrings().flatMap(
      (value) => compare(JSON.stringify(value), gate, value),
    );

    expect(apart).toEqual([]);
  });

  // The enumeration is generated, so its size is the only thing
  // saying it enumerated anything. Held against the closed form and
  // against two members whose absence would be least visible.
  it('enumerates every string over its alphabet', () => {
    const strings = enumerateBranchStrings();
    const expected = [0, 1, 2, 3, 4]
      .map((length) => BRANCH_ALPHABET.length ** length)
      .reduce((total, count) => total + count, 0);

    expect(strings.length).toBe(expected);
    expect(new Set(strings).size).toBe(expected);
    expect(strings).toContain('');
    expect(strings).toContain('://a');
  });
});

describePortParity('validate-entity-name — input that is not text', () => {
  // The type guard in front of the gate is the only thing standing
  // between a Code node's absent field and a value reaching a
  // prompt uncoerced, and it is the one part a type annotation
  // makes invisible: the compiler will never let a caller here
  // reach it, and the spliced copy runs where no type was checked.
  it('agrees over every adversarial value', () => {
    const gate = originGate();
    const apart = ADVERSARIAL_VALUES.flatMap(
      (entry) => compare(entry.id, gate, entry.build()),
    );

    expect(apart).toEqual([]);
  });

  // The roster is shared and this file does not own it. Held to the
  // members whose reading here is distinct: absence must reach the
  // guard, and a value that refuses to become text must be there or
  // the claim that nothing is coerced is undriven.
  it('is driven over a roster holding absence and a refusal', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('null');
    expect(ids).toContain('undefined');
    expect(ids).toContain('numeric-string');
    expect(ids).toContain('hostile-string-conversion');
  });
});

describePortParity('validate-entity-name — what the differ leaves out', () => {
  /** An accepted answer and a refused one, in that order. */
  const READINGS: readonly string[] = ['Station Seven', 'ab://c'];

  // The differ deliberately does not compare key ORDER, and order
  // is part of what a caller stored: a rejection is serialized into
  // an audit line. Compared directly, with the two readings' own
  // key lists as the control that says the comparison discriminates
  // — they must differ from each other, or agreement is free.
  it('agrees about key order on both readings', () => {
    const gate = originGate();
    const keysOf = (value: unknown): string[] => Object.keys(
      value as Record<string, unknown>,
    );

    for (const reading of READINGS) {
      expect(keysOf(gate(reading))).toEqual(keysOf(validateEntityName(reading)));
    }

    expect(keysOf(validateEntityName(String(READINGS[0]))))
      .not.toEqual(keysOf(validateEntityName(String(READINGS[1]))));
  });

  // The differ says nothing about prototypes either, so an answer
  // whose prototype had moved reads as agreeing whatever either
  // side did. The null-prototype assertion is the control saying
  // this reading can tell the two apart at all.
  it('agrees that both answers are plain objects', () => {
    const gate = originGate();

    for (const reading of READINGS) {
      expect(Object.getPrototypeOf(gate(reading))).toBe(Object.prototype);
      expect(Object.getPrototypeOf(validateEntityName(reading)))
        .toBe(Object.prototype);
    }

    expect(Object.getPrototypeOf(Object.create(null)))
      .not.toBe(Object.prototype);
  });
});
