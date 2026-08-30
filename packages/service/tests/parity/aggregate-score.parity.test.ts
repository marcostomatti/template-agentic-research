/**
 * Full parity for `src/lib/aggregate-score.ts`: the original's whole
 * export surface, driven against the port over one neutral corpus.
 *
 * The original exports exactly one function, so FULL here means that
 * function compared directly. The coercion the port also exports is
 * inside the leg compositionally — every measurement reaches the
 * total through it — and what that cannot see is a pair of errors
 * cancelling between the coercion and the sum, which is why
 * `tests/lib/aggregate-score.test.ts` drives it on its own too.
 *
 * ## Why this file discovers the origin's key names
 *
 * The port took a baked scoring scheme and made it an argument, so
 * driving both sides over one input means handing the port a spec
 * that describes the original. That spec has two halves and the law
 * treats them differently.
 *
 * The MAGNITUDES are transcribed: four shares and two penalty terms,
 * written below as the numbers they are. A number carries no subject
 * matter, and what this plan forbids in a tracked file is the
 * original's vocabulary.
 *
 * The KEY NAMES are DISCOVERED, because they are exactly that
 * vocabulary — six property names naming what one deployment scored
 * its records on. {@link readOriginKeys} hands the original a
 * recording proxy in place of its argument: the get trap pushes each
 * property name and answers a number the function will keep, so one
 * call reports every key it reads, in the order it reads them. The
 * names exist for the length of a case and reach no tracked file.
 *
 * What is written down rather than discovered is the file path and
 * the export name, and that is the law's own line rather than a
 * preference: a parity file cannot address a module by a path the
 * module does not have, nor call an export by a name it does not
 * have. Everything else about the original that this file knows, it
 * measured.
 *
 * ## The controls the discovery owes
 *
 * Read order is a hypothesis, not a proof, so three cases settle
 * which discovered name plays which role and none of them lean on
 * the order:
 *
 * - Each share is DERIVED off the original — one slot at full scale
 *   and the rest quiet — and must equal the share this file declares
 *   for it. A name mapped to the wrong slot fails there.
 * - The renormalizing slot is the one where an ABSENT measurement
 *   and a measured ZERO produce different totals; for every other
 *   weighted slot they produce the same total. That is the whole
 *   distinction the port encodes as `PART_ABSENCES`, measured
 *   against the original rather than assumed from it.
 * - A record carrying only the renormalizing slot, and a record
 *   carrying only the penalty slots, are both UNSCORED. That is what
 *   separates the two penalty names from the four weighted ones.
 *
 * And the port owes one of its own, or every comparison below could
 * be two implementations agreeing about a spec neither read: driven
 * with a spec keyed by names the record does not carry, the port
 * must answer with the unscored reading. A port that had kept the
 * original's names baked in would answer a number there.
 *
 * ## Both endings, as values
 *
 * Every call goes through {@link outcomeOf}, because this library
 * has two endings and the interesting one is easy to miss: a
 * measurement whose own conversion to a number throws takes the
 * whole call down, and it does so at the first slot that holds one.
 * A comparison reading only returned values would pass for a port
 * that threw a different sentence, or threw at a different slot, or
 * answered where the original refused.
 *
 * That arrangement needs its own control, since two implementations
 * that refuse everything agree perfectly. Here it is three-way and
 * read off the PORT, the original being the thing under measurement:
 * the driven set must produce refusals, must produce the unscored
 * `null`, and must produce real numbers.
 *
 * Every load sits INSIDE a case. The gate binds a `describe` and
 * nothing above one, so module scope runs on a skipped run too, and
 * a load up there would throw on every run that armed nothing —
 * CI's included.
 */
import type {
  PartAbsence,
  ScoreSpec,
} from '../../src/lib/aggregate-score.js';

import { expect, it } from 'vitest';

import { aggregateTotal } from '../../src/lib/aggregate-score.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { ADVERSARIAL_VALUES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin library, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/aggregate-score.js';

/** The one entry point this file drives. */
const ENTRY_POINT = 'aggregateTotal';

/** What the origin module has to be for this file to drive it. */
interface AggregateScoreOrigin {
  /** Combines a record of measurements into one rounded total. */
  readonly aggregateTotal: (parts: unknown) => unknown;
}

/**
 * Whether the entry point is there and is callable.
 *
 * @param value - Whatever the loader answered with.
 * @returns Whether it is the module this file drives.
 */
function isAggregateScoreOrigin(value: unknown): value is AggregateScoreOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof (value as Record<string, unknown>)[ENTRY_POINT] === 'function';
}

/**
 * The origin library, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a
 * module missing its export would otherwise be called as `undefined`
 * and every comparison below would diff one thrown TypeError against
 * another, which is agreement nobody established.
 *
 * @returns The origin module, with its entry point callable.
 */
function originAggregateScore(): AggregateScoreOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isAggregateScoreOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export ${ENTRY_POINT} as a function.`,
    );
  }

  return loaded;
}

// ---------------------------------------------------------------------------
// Discovering the original's part keys
// ---------------------------------------------------------------------------

/**
 * How many keys the original reads, and so how many this file
 * expects the proxy to report.
 *
 * Four weighted slots and two penalties. Asserted rather than
 * assumed: a run reporting a different number means the original
 * moved and every role assignment below is about a scheme that is
 * no longer there.
 */
const ORIGIN_KEY_COUNT = 6;

/**
 * What the recording proxy answers for every key.
 *
 * A number the original will keep, so that every branch behind a
 * measured value is taken and every key downstream of it is
 * reached. Answering absence would stop the walk at the unscored
 * branch and report three names instead of six.
 */
const PROBE_MEASUREMENT = 1;

/**
 * Every property name the original reads off its argument, in the
 * order it reads them.
 *
 * One call, with a proxy standing in for the record of
 * measurements. The trap answers a usable number for anything, so
 * the original runs to the end and touches every slot its scheme
 * has.
 *
 * Symbol keys answer nothing and are not recorded. Nothing here
 * reads one; the branch exists so a runtime that probes an argument
 * with a well-known symbol cannot inject an entry into the roster.
 *
 * @param origin - The origin module.
 * @returns The key names, in read order.
 */
function readOriginKeys(origin: AggregateScoreOrigin): string[] {
  const seen: string[] = [];
  const recorder = new Proxy({} as Record<string, unknown>, {
    get(_target, property): unknown {
      if (typeof property === 'symbol') {
        return undefined;
      }

      seen.push(property);

      return PROBE_MEASUREMENT;
    },
  });

  origin.aggregateTotal(recorder);

  return seen;
}

// ---------------------------------------------------------------------------
// The spec that describes the original
// ---------------------------------------------------------------------------

/** One weighted slot of the original's scheme, without its name. */
interface OriginPart {
  /** The share this slot carries, transcribed. */
  readonly share: number;

  /** What this slot's absence does, and a case below derives it. */
  readonly absent: PartAbsence;
}

/** One penalty of the original's scheme, without its name. */
interface OriginPenalty {
  /** How much of the total a full-scale measurement removes. */
  readonly coefficient: number;

  /** What a full-scale measurement is, in its own units. */
  readonly scale: number;
}

/**
 * The original's four weighted slots, in the order it reads them.
 *
 * Magnitudes only. Which measurement each one belongs to is the
 * discovered half, and the derivation cases hold this list against
 * the original rather than trusting it.
 */
const ORIGIN_PARTS: readonly OriginPart[] = [
  { share: 0.3, absent: 'counts-zero' },
  { share: 0.25, absent: 'counts-zero' },
  { share: 0.25, absent: 'counts-zero' },
  { share: 0.2, absent: 'renormalizes' },
];

/** The original's two penalties, in the order it applies them. */
const ORIGIN_PENALTIES: readonly OriginPenalty[] = [
  { coefficient: 0.5, scale: 100 },
  { coefficient: 0.3, scale: 10 },
];

/**
 * One discovered key by slot, refusing a slot the proxy never
 * reported.
 *
 * `noUncheckedIndexedAccess` types every read out of the roster as
 * possibly absent, and folding that into an empty string would build
 * a spec keyed on nothing while every comparison still ran.
 *
 * @param keys - What {@link readOriginKeys} reported.
 * @param index - Which slot to name.
 * @returns That slot's key.
 */
function keyAt(keys: readonly string[], index: number): string {
  const key = keys[index];

  if (key === undefined) {
    throw new RangeError(`the origin reported no key at slot ${index}.`);
  }

  return key;
}

/**
 * The port's spec for the original's scheme: discovered names,
 * transcribed magnitudes.
 *
 * @param keys - What {@link readOriginKeys} reported.
 * @returns A spec the port can be driven with.
 */
function originSpec(keys: readonly string[]): ScoreSpec {
  if (keys.length !== ORIGIN_KEY_COUNT) {
    throw new RangeError(
      `the origin read ${keys.length} keys, not ${ORIGIN_KEY_COUNT}.`,
    );
  }

  return {
    parts: ORIGIN_PARTS.map((part, index) => ({
      key: keyAt(keys, index),
      weight: part.share,
      absent: part.absent,
    })),
    penalties: ORIGIN_PENALTIES.map((penalty, index) => ({
      key: keyAt(keys, ORIGIN_PARTS.length + index),
      coefficient: penalty.coefficient,
      scale: penalty.scale,
    })),
  };
}

/**
 * A record of measurements, keyed by the discovered names.
 *
 * A slot whose value is `undefined` still gets an own key, which
 * reads the same as no key at all through the plain property get
 * both sides use.
 *
 * @param keys - The discovered names, in slot order.
 * @param values - One value per slot.
 * @returns The record to drive both sides over.
 */
function recordOf(
  keys: readonly string[],
  values: readonly unknown[],
): Record<string, unknown> {
  return Object.fromEntries(
    keys.map((key, index) => [key, values[index]]),
  ) as Record<string, unknown>;
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
 * Drive both implementations over one argument and report any
 * difference.
 *
 * The differ compares primitives with {@link Object.is}, which is
 * what makes this the right comparison for a library whose answers
 * are numbers: `-0` and `0` part here, as they should, and two
 * `NaN`s agree.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin module.
 * @param spec - The spec describing the original's scheme.
 * @param parts - The argument both sides are handed.
 * @returns One entry when they parted, none when they agreed.
 */
function compareOver(
  over: string,
  origin: AggregateScoreOrigin,
  spec: ScoreSpec,
  parts: unknown,
): LabelledDivergence[] {
  const found = firstDivergence(
    outcomeOf(() => origin.aggregateTotal(parts)),
    outcomeOf(() => aggregateTotal(parts, spec)),
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
// The records both sides are driven over
// ---------------------------------------------------------------------------

/**
 * A measurement large enough to read a share straight off a total.
 *
 * At full scale a slot's total IS its share times a hundred, so the
 * derivation cases divide by this and compare against the declared
 * share with no rounding in the way.
 */
const FULL_SCALE = 100;

/** Which slot the original renormalizes on, by this file's claim. */
const RENORMALIZING_SLOT = ORIGIN_PARTS.findIndex(
  (part) => part.absent === 'renormalizes',
);

/**
 * Names standing in for the discovered ones, for the controls that
 * drive the PORT alone.
 *
 * A control read off the origin would be asking the subject to vouch
 * for the inputs, and one that loaded the origin at all would fail
 * the absent-root leg beside the comparisons it exists to be
 * independent of. Nothing about these names matters except that they
 * are not the original's.
 */
const SYNTHETIC_KEYS: readonly string[] = [
  'slot-0', 'slot-1', 'slot-2', 'slot-3', 'penalty-0', 'penalty-1',
];

/** Every value a slot takes in the enumeration below. */
const MEASUREMENT_ALPHABET: readonly unknown[] = [
  undefined, null, '', 0, '-0', 7.5,
];

/**
 * Every combination of {@link MEASUREMENT_ALPHABET} across all six
 * slots.
 *
 * Six values in six slots is 46656 records, which is small enough to
 * run inside the default suite and wide enough to reach every pairing
 * of the branches that matter: the three spellings of absence against
 * a measured zero, a measured negative zero and a measured number, in
 * every slot at once. A hand-written table cannot cover the pairings,
 * and the pairings are where a renormalizing denominator or a penalty
 * order goes wrong.
 *
 * @returns One list of slot values per record.
 */
function enumeratedSlotValues(): unknown[][] {
  const width = MEASUREMENT_ALPHABET.length;
  const total = width ** ORIGIN_KEY_COUNT;
  const records: unknown[][] = [];

  for (let index = 0; index < total; index += 1) {
    const values: unknown[] = [];
    let remaining = index;

    for (let slot = 0; slot < ORIGIN_KEY_COUNT; slot += 1) {
      values.push(MEASUREMENT_ALPHABET[remaining % width]);
      remaining = Math.floor(remaining / width);
    }

    records.push(values);
  }

  return records;
}

/**
 * The records the enumeration has no room for, one list of slot
 * values each.
 *
 * The enumeration covers absence against small measured numbers in
 * every combination. These are the readings outside that: values that
 * are not numbers at all, values whose text has to be parsed, a
 * measurement past a penalty's scale, a negative measurement that
 * makes a penalty raise a total rather than lower it, and magnitudes
 * large enough that the arithmetic leaves the range of a double.
 *
 * @returns One list of slot values per record.
 */
function authoredSlotValues(): unknown[][] {
  return [
    [true, false, true, false, true, false],
    [[5], [5, 6], [], ['7'], [1], []],
    [' 7 ', '0x10', '1e2', '.5', '7.', '  '],
    ['x', '7x', '+', '-', 'Infinity', 'NaN'],
    [1n, 2n, 3n, 4n, 5n, 6n],
    [new Date(0), new Date(1), null, null, null, null],
    [Number.MIN_VALUE, Number.MIN_VALUE, 0, 0, 0, 0],
    [1e308, 1e308, 1e308, 1e308, -1e308, null],
    [Number.MAX_VALUE, null, null, null, -Number.MAX_VALUE, -Number.MAX_VALUE],
    [-40, -40, -40, -40, null, null],
    [50, null, null, null, 300, null],
    [50, null, null, null, null, 100],
    [50, null, null, null, -100, -100],
    [50, null, null, null, 0, 0],
    [-0, -0, -0, -0, null, null],
    [-0, -0, -0, -0, -0, -0],
    ['-0', '-0', '-0', '-0', '-0', '-0'],
    [-0, null, null, null, null, null],
    [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    [33.333333333333336, 66.66666666666667, 0.5, 0.25, 1.5, 2.5],
    [null, null, null, 100, null, null],
    [null, null, null, null, 100, 10],
    [Number.EPSILON, Number.EPSILON, Number.EPSILON, null, null, null],
  ];
}

/**
 * Whole arguments that are not records of measurements at all.
 *
 * The original reads its argument as `parts || {}` and then reads
 * keys off whatever that left, so a falsy argument and a truthy
 * non-object take different routes to the same unscored answer. Both
 * are reachable from a Code node handing this an absent field, and
 * the port has to take the same routes.
 *
 * @returns One argument per entry.
 */
function nonRecordArguments(): unknown[] {
  return [
    undefined, null, 0, -0, '', false, Number.NaN, 'abc', 42, [], [1, 2],
    {}, new Date(0), () => 1, Symbol.iterator, 7n,
  ];
}

/**
 * Records whose totals land near a rounding boundary.
 *
 * The whole answer is `Math.round` over a product, so the only place
 * a difference of one unit in the last place becomes a difference of
 * one WHOLE POINT is a total sitting on a half. A fine sweep is how
 * this file reaches those without having to solve for them: the
 * slots are driven by one moving value divided by co-prime-ish
 * divisors, so the totals walk across every boundary in the range
 * rather than stepping over them.
 *
 * @returns One list of slot values per record.
 */
function boundarySlotValues(): unknown[][] {
  const records: unknown[][] = [];

  for (let step = 0; step < 2400; step += 1) {
    const moving = step / 8;

    records.push([
      moving, moving / 3, moving / 7, moving / 11, moving / 5, moving / 13,
    ]);
  }

  return records;
}

/**
 * Every adversarial value from the shared corpus, in every slot on
 * its own and in all of them at once.
 *
 * Placed per slot rather than only together, because the coercion
 * that refuses runs in slot order: a value whose own conversion to a
 * number throws takes the call down at the FIRST slot holding one,
 * and a port that read its slots in another order would agree over
 * every record where such a value sat alone in the last one.
 *
 * @returns One list of slot values per record.
 */
function adversarialSlotValues(): unknown[][] {
  const records: unknown[][] = [];

  for (const entry of ADVERSARIAL_VALUES) {
    for (let slot = 0; slot < ORIGIN_KEY_COUNT; slot += 1) {
      const values: unknown[] = [7.5, 7.5, 7.5, 7.5, 7.5, 7.5];

      values[slot] = entry.build();
      records.push(values);
    }

    records.push(Array.from(
      { length: ORIGIN_KEY_COUNT },
      () => entry.build(),
    ));
  }

  return records;
}

/** Every list of slot values this file compares the two sides over. */
function allSlotValues(): unknown[][] {
  return [
    ...enumeratedSlotValues(),
    ...authoredSlotValues(),
    ...boundarySlotValues(),
    ...adversarialSlotValues(),
  ];
}

/**
 * The port's ending for one list of slot values, driven through the
 * synthetic spec so no origin is read.
 *
 * @param values - One value per slot.
 * @returns What the port did.
 */
function portEnding(values: readonly unknown[]): Outcome {
  return outcomeOf(() => aggregateTotal(
    recordOf(SYNTHETIC_KEYS, values),
    originSpec(SYNTHETIC_KEYS),
  ));
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('aggregate-score — the origin the comparisons read', () => {
  it('exports the entry point this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isAggregateScoreOrigin(loaded)).toBe(true);
  });

  // The discovery's own reading, before anything leans on it: the
  // recording proxy has to report one key per slot the spec below
  // names, and no key twice. A run reporting anything else means the
  // original's scheme moved and every role assignment here is about a
  // scheme that is no longer there.
  it('reads exactly one key per slot the spec names', () => {
    const keys = readOriginKeys(originAggregateScore());

    expect(keys).toHaveLength(ORIGIN_KEY_COUNT);
    expect(new Set(keys).size).toBe(ORIGIN_KEY_COUNT);
  });

  // The first of three cases that settle which discovered name plays
  // which role WITHOUT leaning on the order they were read in. Each
  // share is measured off the original by putting one slot at full
  // scale and quieting the renormalizing one, so the total divided by
  // the scale is the share itself.
  it('carries the share this file declares for each weighted slot', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const derived = ORIGIN_PARTS.map((_part, index) => {
      const quiet = index === RENORMALIZING_SLOT
        ? keyAt(keys, 0)
        : keyAt(keys, RENORMALIZING_SLOT);
      const total = origin.aggregateTotal({
        [quiet]: 0,
        [keyAt(keys, index)]: FULL_SCALE,
      });

      return typeof total === 'number'
        ? total / FULL_SCALE
        : total;
    });

    expect(derived).toEqual(ORIGIN_PARTS.map((part) => part.share));
  });

  // The second, and the one the whole port turns on: a slot
  // renormalizes exactly when an ABSENT measurement and a measured
  // ZERO give different totals. Non-vacuous by construction, since
  // the expectation holds one true against three falses — a probe
  // that had stopped discriminating would report all four alike.
  it('renormalizes on exactly the slot this file declares', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const moved = ORIGIN_PARTS.map((_part, index) => {
      const held = index === 0
        ? keyAt(keys, 1)
        : keyAt(keys, 0);
      const absent = origin.aggregateTotal({ [held]: FULL_SCALE });
      const zero = origin.aggregateTotal({
        [held]: FULL_SCALE,
        [keyAt(keys, index)]: 0,
      });

      return absent !== zero;
    });

    expect(moved).toEqual(
      ORIGIN_PARTS.map((part) => part.absent === 'renormalizes'),
    );
  });

  // The third: what separates the two penalty names from the four
  // weighted ones. Neither a penalty nor the renormalizing slot can
  // make a record scored, and the last assertion is the control that
  // says the probe reaches a scored record at all.
  it('scores nothing from the penalties or the renormalizing slot', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const penalties = recordOf(
      ORIGIN_PENALTIES.map(
        (_penalty, index) => keyAt(keys, ORIGIN_PARTS.length + index),
      ),
      ORIGIN_PENALTIES.map(() => FULL_SCALE),
    );

    expect(origin.aggregateTotal({
      [keyAt(keys, RENORMALIZING_SLOT)]: FULL_SCALE,
    })).toBeNull();
    expect(origin.aggregateTotal(penalties)).toBeNull();
    expect(origin.aggregateTotal({
      [keyAt(keys, 0)]: FULL_SCALE,
    })).not.toBeNull();
  });

  // The penalty terms, measured the same way the shares were: a
  // record whose total is known, then the same record with one
  // penalty at full scale. What comes back is the factor, and the
  // factor is what this file declares a coefficient for.
  it('applies the penalty terms this file declares', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const quiet = keyAt(keys, RENORMALIZING_SLOT);
    const anchor = keyAt(keys, 0);
    const base = origin.aggregateTotal({ [quiet]: 0, [anchor]: FULL_SCALE });
    const derived = ORIGIN_PENALTIES.map((penalty, index) => {
      const total = origin.aggregateTotal({
        [quiet]: 0,
        [anchor]: FULL_SCALE,
        [keyAt(keys, ORIGIN_PARTS.length + index)]: penalty.scale,
      });

      return typeof total === 'number' && typeof base === 'number'
        ? total / base
        : total;
    });

    expect(derived).toEqual(
      ORIGIN_PENALTIES.map((penalty) => 1 - penalty.coefficient),
    );
  });
});

describePortParity('aggregate-score — what the comparisons rest on', () => {
  // The port's half of the discovery, and it drives the port alone.
  // Every comparison below hands the port a spec built out of names
  // read off the original; if the port had kept those names baked in
  // instead, the comparisons would agree and say nothing. A spec
  // keyed on names the record does not carry has to come back
  // unscored, and the same record through a matching spec has to come
  // back with a number.
  it('is read through a spec the port consumes rather than ignores', () => {
    const measured = recordOf(
      SYNTHETIC_KEYS,
      SYNTHETIC_KEYS.map(() => FULL_SCALE),
    );
    const foreign = originSpec(
      SYNTHETIC_KEYS.map((key) => `other-${key}`),
    );

    expect(aggregateTotal(measured, foreign)).toBeNull();
    expect(aggregateTotal(measured, originSpec(SYNTHETIC_KEYS)))
      .not.toBeNull();
  });

  // The control the outcome wrapper needs. Two implementations that
  // refuse everything agree perfectly, and so do two that answer the
  // unscored reading for everything, so the driven set has to produce
  // all three endings this library has. Read off the PORT, the
  // original being the thing under measurement.
  it('is driven over records producing every ending this library has', () => {
    const endings = allSlotValues().map((values) => portEnding(values));

    expect(endings.some((ending) => ending.refused)).toBe(true);
    expect(endings.some(
      (ending) => !ending.refused && ending.value === null,
    )).toBe(true);
    expect(endings.some(
      (ending) => !ending.refused && typeof ending.value === 'number',
    )).toBe(true);
  });

  // The rosters are walked, so an emptied one passes every comparison
  // below without comparing anything. Held to the members whose
  // reading is distinct rather than to a count: the three spellings
  // of absence, a measured zero and a measured negative zero.
  it('is driven over an alphabet holding absence, zero and minus zero', () => {
    expect(MEASUREMENT_ALPHABET).toContain(undefined);
    expect(MEASUREMENT_ALPHABET).toContain(null);
    expect(MEASUREMENT_ALPHABET).toContain('');
    expect(MEASUREMENT_ALPHABET).toContain(0);
    expect(MEASUREMENT_ALPHABET).toContain('-0');
    expect(enumeratedSlotValues()).toHaveLength(
      MEASUREMENT_ALPHABET.length ** ORIGIN_KEY_COUNT,
    );
  });

  // The shared corpus this file does not own, held to the members
  // whose reading here is distinct: absence has to reach the unscored
  // branch, a value that refuses its own conversion has to reach the
  // coercion, and a numeric string has to reach the arithmetic.
  it('is driven over adversarial values reaching all three endings', () => {
    const ids = ADVERSARIAL_VALUES.map((entry) => entry.id);

    expect(ids).toContain('null');
    expect(ids).toContain('negative-zero');
    expect(ids).toContain('symbol');
    expect(ids).toContain('hostile-string-conversion');
    expect(ids).toContain('numeric-string');
  });
});

describePortParity('aggregate-score — every combination of slot values', () => {
  // One case over the whole enumeration rather than one per record. A
  // divergence here is a difference in how absence combines with a
  // measurement, and the SET of records that moved together is the
  // reading a failure needs; one case per record would report
  // whichever ran first and leave the shape to be reconstructed.
  it('agrees over every enumerated record', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const spec = originSpec(keys);
    const apart = enumeratedSlotValues().flatMap((values) => compareOver(
      values.map((value) => String(value)).join('|'),
      origin,
      spec,
      recordOf(keys, values),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('aggregate-score — the records no enumeration holds', () => {
  it('agrees over every authored record', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const spec = originSpec(keys);
    const apart = authoredSlotValues().flatMap((values, index) => compareOver(
      `authored ${index}`,
      origin,
      spec,
      recordOf(keys, values),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every record landing on a rounding boundary', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const spec = originSpec(keys);
    const apart = boundarySlotValues().flatMap((values, index) => compareOver(
      `boundary ${index}`,
      origin,
      spec,
      recordOf(keys, values),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('aggregate-score — arguments that are not records', () => {
  // The guard in front of the entry point is the only thing standing
  // between a Code node's absent field and a read off nothing, and it
  // is the one part of this library a type annotation makes
  // invisible: the compiler will never let a caller here reach it,
  // and the spliced copy runs where no type was ever checked.
  it('agrees over every argument that is not a record', () => {
    const origin = originAggregateScore();
    const spec = originSpec(readOriginKeys(origin));
    const apart = nonRecordArguments().flatMap((argument) => compareOver(
      `non-record ${String(argument)}`,
      origin,
      spec,
      argument,
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('aggregate-score — adversarial measurements', () => {
  it('agrees over every adversarial value in every slot', () => {
    const origin = originAggregateScore();
    const keys = readOriginKeys(origin);
    const spec = originSpec(keys);
    const apart = adversarialSlotValues().flatMap((values, index) => compareOver(
      `adversarial ${index}`,
      origin,
      spec,
      recordOf(keys, values),
    ));

    expect(apart).toEqual([]);
  });
});
