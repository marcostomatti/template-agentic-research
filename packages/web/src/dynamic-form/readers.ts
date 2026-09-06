/**
 * @packageDocumentation
 * The four leaf readers: text an operator typed, read as the value
 * the form writes, or refused with the one sentence saying why.
 *
 * `./fieldDef.ts` says what a field IS and `./registry.ts` says
 * which control draws it. This module is the third reading of the
 * same discriminant and the only one that touches what a human
 * actually typed. It holds no control, no node and no path: a
 * reader takes text and answers a reading, which is what lets the
 * whole set be measured by the unit runner while
 * `./FieldControl.tsx`, where they are called, is reachable by no
 * test in this package at all.
 *
 * ## A reading union rather than a sentinel
 *
 * `./values.ts` reaches this shape from the value type; this module
 * reaches it from the same constraint one step earlier. The
 * accepted value of a cleared box is `null`, and `null`, `0`, `''`
 * and `false` are all values a leaf field legitimately holds. So
 * there is no in-band spelling a refusal could take that some
 * accepted reading does not already occupy, and the falsiness check
 * a caller would reach for refuses four correct values.
 *
 * ## No sentence repeats what was typed
 *
 * `../components/jsonDraft.ts` argues this at length for the JSON
 * box and every word of it holds here, over the same content: what
 * an operator types into a form is routinely something they would
 * not want repeated back at them, and a message quoting it puts it
 * in the DOM, in a screenshot, and in whatever gets pasted into a
 * support thread. So the sentences below are fixed text. They are
 * assembled from the RULE the reader applies and from nothing else,
 * which is also why they can be module constants rather than
 * built per call.
 *
 * ## The sentence names no field, deliberately
 *
 * The one thing `describeSchemaIssues` does carry is the path,
 * because a whole-payload refusal has to say where the fault is.
 * A reader has the opposite problem: it reads ONE box, and its
 * sentence is rendered in that box's own `FormField` error slot,
 * which associates it with the labelled control for a screen reader
 * as well as for an eye. Naming the field again in the text would
 * be the label read twice, and it would make every reader need a
 * def it otherwise has no use for.
 *
 * ## An empty box reads as `null`
 *
 * The plan's decision, and `../pages/lexicon/schema.ts` already
 * holds the argument: `''` beside `null` is two spellings of one
 * state, and `src/data/types.ts`'s redeclaration law is that a
 * nullable member is `T | null` rather than an optional one. So a
 * cleared box answers `null` and `notes: string | null` round-trips
 * through the form losslessly.
 *
 * A box holding only whitespace is the same state. Emptiness is a
 * question about whether the operator put anything there, and
 * spaces are not something anybody puts there on purpose.
 *
 * The consequence is stated rather than discovered: clearing a
 * member the schema requires produces a schema refusal naming that
 * member, through the banner the JSON box already uses. That is the
 * honest outcome. The alternative is a form that writes `''` to
 * dodge a refusal the operator has earned.
 *
 * ## `Number.isFinite`, never `!Number.isNaN`
 *
 * The reflex guard for a numeric box is `!Number.isNaN(Number(t))`
 * and it is wrong in both directions here. Measured under bun:
 *
 * - `Number('')` is `0`, and so is `Number('  ')`. An empty box read
 *   through that guard writes a zero nobody typed, which is the
 *   worst shape a fault can take: a plausible value, accepted, in a
 *   member the schema is perfectly happy with.
 * - `Number('Infinity')` is `Infinity`, which is not NaN, so the
 *   guard admits it. `JSON.stringify` then renders it as `null` and
 *   the saved payload holds a member nobody can account for.
 *
 * So {@link readNumberField} guards twice and neither guard is the
 * other's spare. The emptiness check answers before any conversion
 * happens, and {@link Number.isFinite} refuses what the conversion
 * produces that no member should hold.
 *
 * Two spellings JavaScript admits are therefore accepted, and they
 * are named here rather than left to be found: `0x10` reads as 16
 * and `1e3` reads as 1000. Both are numbers by the only definition
 * this module has, and refusing them would need a second grammar
 * whose only author would be this file.
 *
 * ## The datetime reader cannot lean on `Date.parse`
 *
 * It looks like the whole job and it is not, because `Date.parse`
 * ROLLS a day-of-month over rather than refusing it. Measured on
 * both engines this app runs under, bun (JavaScriptCore) for the
 * unit runner and node/chromium (V8) for everything else, with
 * identical answers from each:
 *
 * - `2026-02-30T00:00:00Z` parses, to `2026-03-02T00:00:00.000Z`.
 * - `2026-02-29T00:00:00Z` parses, in a year that is not a leap
 *   year, to `2026-03-01T00:00:00.000Z`.
 * - `2026-04-31T00:00:00Z` parses, to `2026-05-01T00:00:00.000Z`.
 *
 * A form leaning on it saves a March instant for the February date
 * somebody typed, silently. It is no better at the other end: `Jan
 * 1 2026` parses, and so does `2026-01-01` carrying no time and no
 * zone at all, which is exactly what this type exists to refuse.
 *
 * ## Two guards, and neither is the other's spare
 *
 * So the reader holds a SHAPE guard and a CALENDAR guard, and the
 * split is drawn where each one defends something the other cannot:
 *
 * - {@link ISO_STAMP} is the grammar. It pins the field order, the
 *   separators, a mandatory zone, and the ranges every field has a
 *   fixed one for: months 01-12, hours 00-23, minutes and seconds
 *   00-59. It cannot know how long a month is.
 * - {@link namesARealDay} is the calendar, and it is the only guard
 *   that refuses February 30th. It cannot know anything about the
 *   shape, since it is handed three numbers.
 *
 * They carry DIFFERENT sentences, which is what makes a case
 * asserting the sentence name the guard that fired, and what stops
 * the two from co-defending one another into a grid where either
 * can be deleted with everything still green.
 *
 * A third guard is deliberately absent. `Date.parse` behind the two
 * above refuses nothing they do not already refuse, and a redundant
 * guard is exactly the shape that reads as covered while nothing
 * measures it.
 *
 * ## Which zone spellings are refused
 *
 * `Z` and `+HH:MM`. Lowercase `z` and the colonless `+HHMM` are
 * both legal ISO 8601 and both refused, because the grammar this
 * app stores should have one spelling per shape: two saved records
 * differing only in the case of a `Z` are two records a reader has
 * to know are the same.
 *
 * The offset itself is NOT normalised, and the distinction matters.
 * Pinning the grammar is this module's job; rewriting `+02:00` into
 * the equivalent `Z` would discard the local zone the operator
 * supplied, which is information rather than formatting.
 *
 * ## Two of the four have no branch reaching the refusal arm
 *
 * {@link readStringField} and {@link readBooleanField} answer the
 * same union as the other two and never take its refusal arm. That
 * is recorded here rather than left for a reader to discover and
 * "fix" with a rule nobody asked for. A string field has no rule to
 * break: any text is a string, and length or pattern rules belong
 * to the save path's schema, which is where v1 keeps every
 * constraint. A switch reports a boolean, and there is no third
 * thing it could report.
 *
 * The uniform return type is the point. `./FieldControl.tsx`
 * switches on the leaf type and reports through one shape whatever
 * branch it took, so growing a rule onto either reader later is a
 * change inside one function rather than a change to what every
 * caller must handle. Narrowing those two to the accepted arm alone
 * buys a caller nothing it can act on and costs the switch its
 * single shape.
 *
 * ## Mutation note
 *
 * Measured rather than argued, over `./readers.test.ts` at 48 cases
 * and 28 legs, each leg one guard this file claims. Every run took
 * its failing set through `--reporter=json`, which names the CASES;
 * the default reporter names only failing FILES and cannot support
 * the reading below.
 *
 * The union of the 28 legs reds 48 of 48 cases. That is the reading
 * a leg-by-leg table cannot give on its own: a red leg says a guard
 * is measured, and only the union says no CASE is sitting under
 * nothing. Eight legs picked from this module's headline claims
 * left 22 cases undefended, and the legs that closed them are as
 * much a part of the grid as the ones that started it.
 *
 * The four legs carrying the claims this header spends its length
 * on:
 *
 * - `Number.isFinite` swapped for `!Number.isNaN` reds EXACTLY the
 *   two Infinity cases and nothing else, so the choice is measured
 *   by those two and by no case that would have survived it.
 * - The emptiness check dropped from {@link readNumberField} reds
 *   exactly the two that read a cleared box as `null` — the zero
 *   `Number('')` produces, arriving in a member nobody typed into.
 * - The calendar guard dropped reds six; its sentence swapped for
 *   the shape one reds five of the same six. The pair is what says
 *   the guard fires AND that its own sentence is what reports it,
 *   which one leg alone cannot separate.
 * - `setUTCFullYear` swapped for `Date.UTC` reds exactly one, the
 *   stamp whose year is below one hundred. No other leg reaches
 *   that case, and no other case reaches that leg.
 *
 * Two results read wrong at a glance and are worth naming. A `g`
 * flag on {@link ISO_STAMP} reds EIGHT rather than the one case
 * about reading the same text twice, because `lastIndex` survives
 * into whichever case runs next: those eight are one fault, and
 * that case is not the leg's only defender. And {@link
 * namesARealDay} replaced by a hand-rolled leap rule missing its
 * four-hundred clause reds exactly the case about the year 2000,
 * which is the whole argument for asking the platform rather than
 * carrying the rule here.
 */

/** A reading that landed, and the value the form may now write. */
export interface FieldAccepted<T> {
  /** The discriminant, fixed so a narrowing reaches {@link value}. */
  readonly ok: true;
  /** What the box read as, with a cleared box reading as `null`. */
  readonly value: T;
}

/** A reading that refused, and the sentence an operator reads. */
export interface FieldRefused {
  /** The discriminant, fixed so a narrowing reaches the sentence. */
  readonly ok: false;
  /**
   * Why the text was refused, as one sentence.
   *
   * ONE rather than the list `../components/jsonDraft.ts` answers,
   * and the shapes differ because the subjects do: a schema walks a
   * whole payload and has an issue per member to report, where a
   * reader looks at one box and stops at the first rule it breaks.
   *
   * It repeats nothing that was typed. See the header.
   */
  readonly sentence: string;
}

/**
 * What reading one leaf box produced.
 *
 * Generic in the accepted value so each reader states its own: the
 * three text readers admit `null` for a cleared box and
 * {@link readBooleanField} does not, which is a difference worth
 * having in the type rather than in a comment.
 */
export type FieldReading<T> = FieldAccepted<T> | FieldRefused;

/** What a box refuses when its text is not a finite number. */
const NOT_A_NUMBER = 'Enter a finite number.';

/** What a box refuses when its text is not a timestamp. */
const NOT_A_STAMP
  = 'Enter a timestamp with a time zone, '
  + 'such as 2026-01-01T00:00:00Z.';

/** What a well-shaped stamp refuses when its day does not exist. */
const NOT_A_REAL_DAY = 'That calendar date does not exist.';

/** The year, month and day, each captured, each range-bounded. */
const DATE_PART = '(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])';

/** The clock, to a second, with optional fractional seconds. */
const TIME_PART = '(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?';

/** The mandatory zone: `Z`, or a signed offset with its colon. */
const ZONE_PART = '(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)';

/**
 * The shape guard, assembled from the three parts above.
 *
 * Anchored at both ends, so nothing rides along beside a stamp. The
 * three capturing groups are the date fields in order, and they are
 * the only capturing groups in the pattern: the time and zone parts
 * spell every group `(?:`, which is what keeps
 * {@link readDatetimeField}'s indices from moving when either is
 * edited.
 *
 * Built once at module scope rather than per call, and with no `g`
 * flag, which would carry `lastIndex` between calls and make every
 * second reading of the same text refuse.
 */
const ISO_STAMP = new RegExp(
  `^${DATE_PART}T${TIME_PART}${ZONE_PART}$`,
);

/**
 * An accepted reading, as the readers below spell it.
 *
 * @param value - What the box read as.
 * @returns The accepted reading carrying it.
 */
function accepted<T>(value: T): FieldAccepted<T> {
  return { ok: true, value };
}

/**
 * A refusal carrying one of this module's sentences.
 *
 * @param sentence - Which rule the text broke.
 * @returns The refusal carrying it.
 */
function refused(sentence: string): FieldRefused {
  return { ok: false, sentence };
}

/**
 * Whether a box holds nothing an operator put there.
 *
 * Trimmed rather than compared against `''`, because a box holding
 * only spaces is the same state and the header says why. `trim`
 * covers every whitespace the language recognises, a pasted
 * non-breaking space included.
 *
 * @param text - The box contents, exactly as typed.
 * @returns Whether it holds nothing.
 */
function isEmptyBox(text: string): boolean {
  return text.trim() === '';
}

/**
 * Whether a year, month and day name a day that exists.
 *
 * The calendar guard, and the only thing here that refuses
 * February 30th. It asks the engine's own calendar rather than
 * carrying a month-length table and a leap-year rule, which would
 * be a second authority on a question the platform already answers
 * and the classic place a century year goes wrong.
 *
 * `setUTCFullYear` rather than `Date.UTC`, which remaps a year
 * between 0 and 99 onto 1900 plus it: `Date.UTC(26, 0, 1)` is
 * `1926-01-01` (measured), so the round trip below would refuse
 * every stamp in the first century. `setUTCFullYear` does no such
 * remapping.
 *
 * The probe is mutated, which is the one place in this directory
 * that happens. It is constructed on the line above, never escapes,
 * and is the API the platform offers; the immutability law is about
 * what a caller handed over, and no caller handed this over.
 *
 * @param year - The four-digit year.
 * @param month - The month, 1 through 12.
 * @param day - The day of the month.
 * @returns Whether that day exists; `false` for any `NaN`.
 */
function namesARealDay(
  year: number,
  month: number,
  day: number,
): boolean {
  // Epoch rather than the current instant, so the reading is the
  // same at every hour of every day: its time fields are all zero,
  // and only the date fields being set can move it.
  const probe = new Date(0);

  probe.setUTCFullYear(year, month - 1, day);

  // A rolled-over day comes back as a different date, which is the
  // whole reading. Any `NaN` argument makes the probe invalid and
  // every getter answer `NaN`, which equals nothing including
  // itself, so the comparison refuses it without a branch of its
  // own.
  return probe.getUTCFullYear() === year
    && probe.getUTCMonth() === month - 1
    && probe.getUTCDate() === day;
}

/**
 * Read a string box.
 *
 * Total: any text is a string, so this reader has no branch
 * reaching the refusal arm. See the header for why it answers the
 * union anyway.
 *
 * A cleared box answers `null`. A box holding anything else answers
 * it EXACTLY as typed, spaces included, which is the one asymmetry
 * with {@link readDatetimeField} beside it and is deliberate: a
 * stamp is a grammar this module parses, where a string is the
 * operator's own prose and trimming it would be the form quietly
 * editing what somebody wrote.
 *
 * @param text - The box contents, exactly as typed.
 * @returns The text, or `null` for a box holding nothing.
 */
export function readStringField(
  text: string,
): FieldReading<string | null> {
  if (isEmptyBox(text)) {
    return accepted(null);
  }

  return accepted(text);
}

/**
 * Read a switch.
 *
 * Total, and the only reader whose input is not text: `@ar/ui`'s
 * `Switch` reports the next checked state and there is no third
 * thing it could report, so there is nothing here to parse and
 * nothing to refuse.
 *
 * It answers no `null`, which is the one place the four readers
 * disagree about the cleared state: a switch has no empty position
 * to be in. A `boolean | null` member therefore cannot be cleared
 * through this control, and the save path's schema is what says
 * whether that matters.
 *
 * @param checked - The next checked state, as the switch reports it.
 * @returns That state, accepted.
 */
export function readBooleanField(
  checked: boolean,
): FieldReading<boolean> {
  return accepted(checked);
}

/**
 * Read a number box, which holds free text.
 *
 * Free text rather than a native number input, because the control
 * is a `TextInput` left at its default type: that is what makes a
 * long value typeable directly with no spinner in the way and no
 * keystroke lost to a browser's own numeric filtering.
 *
 * Which means every guard is this function's. The emptiness check
 * runs FIRST and answers `null`, before any conversion can turn a
 * cleared box into the zero `Number('')` produces, and
 * `Number.isFinite` is what refuses `Infinity` where the reflex
 * `!Number.isNaN` admits it. The header measures both.
 *
 * Trimmed before converting, which costs nothing: `Number` skips
 * surrounding whitespace itself, and the trimmed text is what the
 * emptiness check already read.
 *
 * @param text - The box contents, exactly as typed.
 * @returns The number, `null` for a box holding nothing, or the
 * refusal naming the rule.
 */
export function readNumberField(
  text: string,
): FieldReading<number | null> {
  if (isEmptyBox(text)) {
    return accepted(null);
  }

  const value = Number(text.trim());

  if (!Number.isFinite(value)) {
    return refused(NOT_A_NUMBER);
  }

  return accepted(value);
}

/**
 * Read a datetime box, which holds a stamp.
 *
 * Two guards, carrying two sentences: the shape, then the calendar.
 * The header measures why `Date.parse` is neither of them.
 *
 * The accepted value is the TRIMMED text rather than the text as
 * typed, which is the asymmetry {@link readStringField} names: a
 * stamp is a grammar rather than prose, so surrounding whitespace
 * is noise from a paste and not something anybody wrote. The stamp
 * itself is answered untouched — the zone is not normalised, for
 * the reason the header gives.
 *
 * @param text - The box contents, exactly as typed.
 * @returns The stamp, `null` for a box holding nothing, or the
 * refusal naming which of the two rules it broke.
 */
export function readDatetimeField(
  text: string,
): FieldReading<string | null> {
  if (isEmptyBox(text)) {
    return accepted(null);
  }

  const stamp = text.trim();
  const match = ISO_STAMP.exec(stamp);

  if (match === null) {
    return refused(NOT_A_STAMP);
  }

  // `noUncheckedIndexedAccess` widens a group to `string |
  // undefined` though the pattern makes all three mandatory.
  // `Number(undefined)` is `NaN`, which the calendar guard refuses
  // on its own, so the impossible case needs no branch here.
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!namesARealDay(year, month, day)) {
    return refused(NOT_A_REAL_DAY);
  }

  return accepted(stamp);
}
