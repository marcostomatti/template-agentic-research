/**
 * @packageDocumentation
 * aggregate-score — the one number a digest orders by, and the rule
 * that it is absent rather than zero when nothing measured it.
 *
 * A finding is scored on several signals at once. Each is a number
 * some earlier step produced; each carries a share of the total the
 * domain decided; and two of them are not contributions at all but
 * reductions applied to whatever the rest came to. This module is
 * the arithmetic that combines them, and nothing else — it reads no
 * table, takes no configuration off disk, and has no opinion about
 * what any signal means.
 *
 * ## The rule this file exists for
 *
 * NULL AND ZERO ARE DIFFERENT NUMBERS, and every line here is about
 * keeping them apart.
 *
 * A signal that was measured and came to nothing is `0`. A signal
 * nothing measured is absent, and the whole point of
 * {@link toFinite} is that it answers `null` for absence instead of
 * quietly folding it into the same `0`. That is the same statement
 * the `findings.score` column makes about itself — a number
 * computed from data is nullable with no default — enforced in the
 * arithmetic rather than assumed by it.
 *
 * The cost of getting it wrong is not an exception, which is what
 * makes it worth this much prose. An unmeasured signal scored as 0
 * takes its place at the bottom of every ranking as though it had
 * been read and found worthless, and nothing downstream can tell it
 * apart from a signal genuinely worth nothing.
 *
 * TWO CONSEQUENCES FOLLOW, and they are the whole behaviour:
 *
 * A TOTAL OVER NO MEASURED PART IS NULL. When every part whose
 * absence counts as zero is unmeasured, {@link aggregateTotal}
 * answers `null` and not `0`. Nothing looked at this record, so
 * there is no number to report: a `0` there would claim a reading
 * that was never taken, and a threshold filter would then drop the
 * record for a reason nobody measured. This is the branch a failed
 * model call lands in, and it is why the score column is nullable.
 *
 * AN UNMEASURED PART CAN RENORMALIZE INSTEAD. A part declared
 * {@link PART_ABSENCES | renormalizes} drops out of the sum AND out
 * of the denominator when nothing measured it, so the remaining
 * weights carry the whole score. That is the behaviour this module
 * was pulled out of a larger scorer for. A signal fed by an
 * optional import is absent for every record until the import
 * happens, and scoring all of them as zero on that signal shaves
 * its whole share off every total at once — which changes no
 * ordering, hides that anything is missing, and makes the number
 * look measured. Renormalizing says the honest thing instead: this
 * total is over the signals that were actually available.
 *
 * A part measured as `0` renormalizes NOTHING. "We looked and found
 * nothing" is a reading, and it is supposed to cost the record its
 * share. Only absence renormalizes, which is exactly the
 * distinction {@link toFinite} exists to preserve.
 *
 * ## What this port takes as input, and why
 *
 * THE PARTS ARE AN ARGUMENT. The original was written for one
 * deployment and baked its whole scoring scheme into six property
 * names and six numeric constants: four weighted signals with fixed
 * shares, and two penalties with fixed coefficients. Here the
 * scheme belongs to the domain, so it arrives as {@link ScoreSpec}
 * and the measurements arrive separately as a record keyed by the
 * same names.
 *
 * That is the same move `static-gate.ts` makes with its term set,
 * and it lands in the same place: the schema already holds the
 * configuration. `domains.settings.scoringWeights` is a share per
 * signal, keyed by signal name, and its own column comment says the
 * arithmetic that consumes them arrives with the scoring port —
 * this file is that arithmetic. What a domain is scoring FOR is its
 * `criteria` rows, filed under its categories; this module never
 * reads one, because by the time a total is being combined the
 * criteria have already done their work and what is left is the
 * measurements they produced.
 *
 * Three consequences, each a place this file differs from a
 * transcription.
 *
 * ABSENCE IS DECLARED PER PART, in {@link ScorePart.absent}, and
 * there is no default. The original carried the distinction in its
 * control flow — three signals summed unconditionally and one
 * branch for the fourth — which is exactly the kind of thing that
 * disappears into a config file as an unstated assumption. Since
 * what an absent measurement means is the entire subject of this
 * module, a part that leaves it unsaid is a part nobody has thought
 * about, so the field is required. It is also the one member with
 * no home in the schema yet: `scoringWeights` is a flat map of
 * numbers with nowhere to put it, so today it comes from the caller
 * that builds the spec, and where it is stored is a decision for
 * the phase that wires this into a workflow.
 *
 * PENALTIES ARE A LIST, in the order they apply. They are
 * multiplicative and floating-point multiplication is not
 * associative, so the order is part of the answer rather than a
 * detail of the loop.
 *
 * THE DENOMINATOR IS ALWAYS DIVIDED BY. The original divided only
 * in its renormalizing branch, which was correct because its four
 * shares summed to exactly 1 and the other branch's implicit
 * denominator was therefore 1. A domain's weights are the domain's,
 * so dividing by the weight actually counted is what keeps the
 * total in the range the shares describe. Under the original's
 * shares the two are the same arithmetic to the bit — division by
 * exactly 1 is exact in binary floating point — which is why the
 * parity leg does not report this.
 *
 * ## What is kept
 *
 * The coercion and its `null`, the weighted sum, the renormalizing
 * denominator, the multiplicative penalties with their
 * `1 - coefficient * (value / scale)` shape, the unscored branch,
 * and the rounding to a whole number.
 *
 * A parity suite is what says so rather than this paragraph, and it
 * is `tests/parity/aggregate-score.parity.test.ts`. Its leg is
 * FULL: the original exports exactly one function, it is compared
 * directly, and the coercion is inside the leg compositionally
 * because every measurement reaches the total through it. What that
 * cannot see is a pair of errors cancelling between the coercion
 * and the sum, which is why `tests/lib/aggregate-score.test.ts`
 * drives {@link toFinite}, {@link orZero} and
 * {@link penaltyFactor} on their own as well. Read the two files
 * together; neither is the whole reading.
 *
 * ## What is dropped
 *
 * The six property names and the six constants, entirely: no signal
 * name, no penalty name and no subject matter of any kind appears
 * in this file, and a search of it says nothing about what any
 * domain scores on. The guarded CommonJS export block at the foot
 * of the original becomes declaration exports, which is what the
 * splice strips and what a Code node can run, and `var` becomes
 * `const`.
 *
 * One redundancy is dropped with them, and it is dropped rather
 * than preserved because it cannot be observed. The original spelt
 * its two penalties differently — one coerced an absent value to
 * zero, the other branched on `null` — and the two agree for every
 * input: `1 - coefficient * (0 / scale)` is exactly `1`, which is
 * exactly what the branch returns. So the port has one penalty
 * shape rather than two, and no input distinguishes them.
 *
 * ## What is preserved deliberately
 *
 * Five readings that look like faults until the argument is read.
 * Each has a case of its own in `tests/lib/aggregate-score.test.ts`.
 *
 * WHITESPACE IS A MEASURED ZERO where an empty cell is absence. The
 * line falls where `Number` puts it rather than where anyone would
 * choose it, so a column arriving as `''` is unmeasured and the
 * same column arriving as `' '` reads as a measurement of nothing.
 * Trimming first would be a divergence, and the export it changed
 * is the one every measurement goes through.
 *
 * THE TOTAL IS ROUNDED to a whole number, which is the original's
 * contract and not a claim about the range. A domain whose shares
 * describe a 0-to-1 score will find every total rounded to 0 or 1;
 * that is a scale mismatch between the weights and this rounding,
 * and resolving it belongs to the phase that writes the scorer and
 * the `findings.score` column together, not to a port whose gate is
 * that it answers what the original answered.
 *
 * AN EXTREME INPUT CAN OVERFLOW to a non-finite total. Every
 * measurement is finite by the time it is weighted — that is what
 * {@link toFinite} guarantees — but a large enough measurement
 * against a large enough penalty still multiplies past the largest
 * double. The original answers `Infinity` there and so does this,
 * because a guard would be a divergence in the one function the
 * parity leg compares directly.
 *
 * A MEASUREMENT IS READ AS A PLAIN PROPERTY, so a part keyed
 * `__proto__` reads the prototype rather than an own key, and a
 * part keyed `length` reads a string's length when the whole record
 * is a string. Both are the original's readings, both coerce to
 * `null` in every case anyone has found, and both are pinned rather
 * than repaired for the reason every preserved reading here is: the
 * parity suite is the gate that decides whether the port landed.
 *
 * `-0` SURVIVES. A measurement of `-0` weighted and summed leaves
 * the total `-0`, which is a different value from `0` under
 * {@link Object.is} and the same one under `===`. The sum is
 * therefore seeded with its first term rather than with `0`,
 * because `0 + -0` is `0` and would have quietly repaired it.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, and cannot be split into smaller files — a
 * second module would need the import the splice rule forbids,
 * which is why `many small files` has no expression here.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it.
 */

// ---------------------------------------------------------------------------
// What a caller declares
// ---------------------------------------------------------------------------

/**
 * What an unmeasured part does to the total.
 *
 * The two answers are not interchangeable and choosing between them
 * is the substantive decision in a scoring scheme, which is why
 * {@link ScorePart.absent} has no default.
 *
 * `counts-zero` — the part contributes nothing and keeps its share
 * in the denominator, so its absence drags the total down. Right
 * for a signal that is supposed to be there: not finding it is
 * itself close to a finding.
 *
 * `renormalizes` — the part leaves the sum AND the denominator, so
 * the remaining shares carry the whole score. Right for a signal
 * that may be unavailable for reasons having nothing to do with the
 * record, where scoring it zero would be a measurement claim about
 * data nobody has.
 */
export const PART_ABSENCES = ['counts-zero', 'renormalizes'] as const;

/** One member of {@link PART_ABSENCES}. */
export type PartAbsence = (typeof PART_ABSENCES)[number];

/**
 * One weighted part of a domain's score.
 *
 * The three things the arithmetic reads and nothing else: where the
 * measurement is filed, what share it carries, and what its absence
 * means. A caller assembling this from a domain projects the first
 * two off `domains.settings.scoringWeights`, whose keys are signal
 * names and whose values are shares.
 */
export interface ScorePart {
  /**
   * Which measurement this part is, as the record of measurements
   * keys it.
   *
   * Read as a plain property, so a key naming something on
   * `Object.prototype` reads what is there. See the header.
   */
  readonly key: string;

  /**
   * This part's share of the total, on whatever scale the domain's
   * other shares use.
   *
   * Coerced through {@link orZero}, so a share nothing wrote is no
   * share rather than a fault — the same reading `orZero` gives
   * everywhere else in this file.
   */
  readonly weight: number;

  /** What this part's absence does. See {@link PART_ABSENCES}. */
  readonly absent: PartAbsence;
}

/**
 * One multiplicative reduction applied to the weighted total.
 *
 * A penalty is not a negative part. A part contributes to a sum and
 * carries a share of the denominator; a penalty scales whatever the
 * parts came to, so its effect is proportional to the score rather
 * than fixed. Halving a strong record and halving a weak one are
 * different amounts, which is what the shape is for.
 */
export interface ScorePenalty {
  /** Which measurement this penalty reads, keyed as a part is. */
  readonly key: string;

  /**
   * How much of the total a full-scale measurement removes: `0.5`
   * takes half.
   */
  readonly coefficient: number;

  /**
   * What a full-scale measurement is, in the units the measurement
   * arrives in — the number the value is divided by before the
   * coefficient applies.
   *
   * A scale of zero is not a penalty of infinite severity, it is an
   * unstated scale, and {@link penaltyFactor} skips such a penalty
   * rather than answering a non-finite factor.
   */
  readonly scale: number;
}

/**
 * A domain's whole scoring scheme, as this arithmetic needs it.
 *
 * Both lists are ordered and both orders are observable. The parts'
 * order fixes the order the weighted terms are summed in, and the
 * penalties' order fixes the order the factors are multiplied in;
 * floating-point addition and multiplication are not associative,
 * so a spec that lists the same members differently is a different
 * spec by a fraction of a unit.
 */
export interface ScoreSpec {
  /** Every weighted part, in the order they are summed. */
  readonly parts: readonly ScorePart[];

  /** Every penalty, in the order they are applied. */
  readonly penalties: readonly ScorePenalty[];
}

// ---------------------------------------------------------------------------
// Coercion — where null and zero are kept apart
// ---------------------------------------------------------------------------

/**
 * A measurement as a finite number, or `null` when there is none.
 *
 * The whole null-vs-zero rule lives here. Absence answers `null`,
 * and so does anything that cannot be read as a finite number: an
 * empty string, a word, a value that converts to `NaN` or to an
 * infinity. Returning `0` for any of those would be a measurement
 * claim about data that carries none.
 *
 * The three shapes of absence are treated alike deliberately.
 * `null` is a column that was never written, `undefined` is a key
 * that is not there, and `''` is what an empty cell in a delimited
 * export arrives as — three ways for a pipeline to say nothing was
 * measured, and no reason to distinguish them here.
 *
 * A CELL HOLDING ONLY WHITESPACE is not one of them. `Number(' ')`
 * is `0`, so such a cell reads as a measured zero, and only the
 * exactly-empty string reads as absence. That is where the original
 * drew the line and it is preserved rather than tidied: every
 * measurement reaches a total through here, so trimming first would
 * move the whole library.
 *
 * NUMERIC STRINGS ARE NUMBERS, which is not a convenience. A driver
 * reading a wide-precision column hands back a string rather than
 * lose digits, so `'7'` is what a measured seven looks like coming
 * out of storage and refusing it would make every stored
 * measurement absent.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where no type was ever checked, so this is all that stands
 * between a node handing this an object and a total of `NaN`.
 *
 * @param value - Anything at all, including nothing.
 * @returns The finite number it carries, or `null`.
 * @throws TypeError If the value's own conversion to a number
 * throws — a symbol, or an object whose `valueOf` and `toString`
 * both refuse. Preserved from the original, which has no guard
 * there either.
 */
export function toFinite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/**
 * A measurement as a finite number, treating absence as nothing.
 *
 * The other half of the pair, for the places where absence really
 * does mean no contribution rather than no reading: a weight nobody
 * wrote is no weight, and a part that is present in the scheme but
 * unmeasured still occupies its share of the denominator with
 * nothing in it.
 *
 * Never use this on a signal whose absence is the thing being
 * reported. That is what {@link toFinite} is for, and the two exist
 * separately so the choice is made once per call site and is
 * visible when it is made.
 *
 * @param value - Anything at all, including nothing.
 * @returns The finite number it carries, or `0`.
 * @throws TypeError Under the same conditions as {@link toFinite}.
 */
export function orZero(value: unknown): number {
  const parsed = toFinite(value);

  return parsed === null
    ? 0
    : parsed;
}

/**
 * What one penalty multiplies the total by.
 *
 * `1` means the penalty does not apply, and it is the answer for
 * every reason a penalty might not: nothing measured it, or the
 * scheme states no scale to read it against. A penalty that cannot
 * be evaluated leaves the total alone rather than guessing at it,
 * which is the same refusal to invent a reading the rest of this
 * file makes.
 *
 * The arithmetic is written as `1 - coefficient * (value / scale)`
 * rather than as the algebraically equal
 * `1 - (coefficient / scale) * value`, because the two are not the
 * same double. Where the two spellings disagree by one unit in the
 * last place, a rounded total sitting on a boundary lands on either
 * side of it.
 *
 * Nothing bounds the result. A measurement past the scale, or a
 * coefficient above 1, produces a negative factor and flips the
 * total's sign; a negative measurement produces a factor above 1
 * and raises it. Both are the original's readings, and both are the
 * domain's to avoid by writing a scale its measurements fit in.
 *
 * @param value - The measurement this penalty reads.
 * @param penalty - The penalty, as the domain states it.
 * @returns The factor to multiply the total by.
 * @throws TypeError Under the same conditions as {@link toFinite}.
 */
export function penaltyFactor(value: unknown, penalty: ScorePenalty): number {
  const measured = toFinite(value);

  if (measured === null) {
    return 1;
  }

  const scale = toFinite(penalty.scale);

  if (scale === null || scale === 0) {
    return 1;
  }

  return 1 - orZero(penalty.coefficient) * (measured / scale);
}

// ---------------------------------------------------------------------------
// The total
// ---------------------------------------------------------------------------

/**
 * The record of measurements, ready to be read by key.
 *
 * Written as the original wrote it — anything falsy becomes an
 * empty object, and anything else is read as it arrived. That is
 * not the same as narrowing to objects, and the difference is
 * observable: an empty string is falsy and becomes `{}`, so a part
 * keyed `length` reads nothing, while a non-empty string is truthy
 * and reads its own length. Preserved rather than tidied, because
 * the parity leg compares the function that reaches this.
 *
 * @param parts - Whatever the caller passed.
 * @returns Something a key can be read off.
 */
function measurementsOf(parts: unknown): Record<string, unknown> {
  return (parts
    ? parts
    : {}) as Record<string, unknown>;
}

/**
 * One part, with the measurement its own absence rule allowed the
 * first pass to take.
 *
 * A part whose absence renormalizes carries `null` here whatever its
 * measurement is, because the first pass has not read it. See
 * {@link aggregateTotal} for why not.
 */
interface AnchorReading {
  /** The part, as the domain states it. */
  readonly part: ScorePart;

  /**
   * What was measured for it, or `null` — either because nothing
   * was, or because this part is not one the first pass reads.
   */
  readonly measured: number | null;
}

/**
 * Combine a domain's measurements into one score.
 *
 * Four steps, and the first is the one that decides whether there
 * is an answer at all:
 *
 * 1. Every part whose absence counts as zero is read. If none of
 *    them was measured, the record is UNSCORED and the answer is
 *    `null`. Not `0` — see the header.
 * 2. Every part is read again in spec order, this time including
 *    the renormalizing ones. A renormalizing part with no
 *    measurement drops out of the sum and out of the denominator;
 *    every other part contributes its share times its measurement,
 *    or times zero when it has none.
 * 3. The sum is divided by the share actually counted, which is
 *    what makes a renormalized total comparable to a full one.
 * 4. Each penalty multiplies the result in turn, and the whole
 *    thing is rounded to a whole number.
 *
 * TWO PASSES RATHER THAN ONE, and it is not an optimization — it is
 * the read ORDER, which is observable. A measurement whose own
 * conversion to a number throws takes the whole call down, so which
 * measurements are read before the unscored branch is answered
 * decides whether a record nothing measured raises or answers
 * `null`. The original answers `null` there, having read only the
 * signals its unscored test is over, and this reads the same ones
 * in the same order. A single pass would raise on a measurement it
 * was never going to use.
 *
 * Each key is still read once. The first pass keeps what it read,
 * and the second pass reads only the keys the first one skipped.
 *
 * Two specs cannot produce a number and both answer `null` rather
 * than something derived from nothing: one with no `counts-zero`
 * part at all, since there is then nothing whose presence could
 * mean the record was scored, and one whose counted share does not
 * come to a positive number, since dividing by it would answer
 * `NaN` or an infinity. Neither is reachable from a scheme anyone
 * has written down; both are reachable from a scheme assembled out
 * of stored rows, which is where this one comes from.
 *
 * @param parts - Every measurement, keyed by part key. Anything
 * falsy is read as no measurements at all.
 * @param spec - The domain's scoring scheme.
 * @returns The rounded total, or `null` when nothing measured this
 * record.
 * @throws TypeError If a measurement's own conversion to a number
 * throws. See {@link toFinite}.
 */
export function aggregateTotal(parts: unknown, spec: ScoreSpec): number | null {
  const measurements = measurementsOf(parts);
  const anchored: readonly AnchorReading[] = spec.parts.map((part) => ({
    part,
    measured: part.absent === 'counts-zero'
      ? toFinite(measurements[part.key])
      : null,
  }));

  if (anchored.every((entry) => entry.measured === null)) {
    return null;
  }

  let weighted: number | null = null;
  let counted = 0;

  for (const entry of anchored) {
    const weight = orZero(entry.part.weight);
    const measured = entry.part.absent === 'counts-zero'
      ? entry.measured
      : toFinite(measurements[entry.part.key]);

    if (measured === null && entry.part.absent === 'renormalizes') {
      continue;
    }

    const term = weight * orZero(measured);

    // Seeded with the first term rather than with 0, so a total of
    // -0 survives the sum: `0 + -0` is `0`. See the header.
    weighted = weighted === null
      ? term
      : weighted + term;

    counted += weight;
  }

  if (weighted === null || !(counted > 0)) {
    return null;
  }

  const normalized = weighted / counted;
  const penalized = spec.penalties.reduce(
    (running, penalty) => running * penaltyFactor(
      measurements[penalty.key],
      penalty,
    ),
    normalized,
  );

  return Math.round(penalized);
}
