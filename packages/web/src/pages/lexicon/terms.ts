/**
 * @packageDocumentation
 * The pure half of the lexicon editor: how one category's vocabulary
 * divides into buckets, what moving a term between two of them means,
 * and how a pasted block of seed lines becomes candidate terms.
 *
 * Beside the modal rather than inside it, for the reason `./cards.ts`
 * gives about the page. The unit runner collects `.ts` files under
 * `src` in a node environment, so a decision living in a `.tsx` is
 * reachable by no test in this package at all, and the modal is left
 * with one list per bucket and one call per gesture.
 *
 * ## A bucket IS a polarity
 *
 * There are exactly three buckets and they are exactly the three
 * members of `TermPolarity`. Not a grouping this editor invented over
 * some other key: `terms.polarity` is a column, and the bucket a row
 * is drawn in is that column's value read back.
 *
 * That is the whole reason {@link withTermPolarity} is the only mover
 * BETWEEN buckets. Dragging a row from one list into another and
 * choosing a polarity from that row's own control are the same
 * operation expressed twice — both rewrite one column on one row,
 * and both are served by the one function. The drag is an enhancement
 * over the control rather than a second mechanism, which is what
 * answers WCAG 2.2 SC 2.5.7 (Dragging Movements) without a
 * keyboard-only path that could drift away from the pointer one.
 *
 * {@link termPolarityOptions} is that control's vocabulary and is
 * TOTAL over the union for the same reason: a polarity a term can be
 * dragged to and not chosen is the equivalence broken in the one
 * direction no gate here would report.
 *
 * {@link withTermWeight} is the other column the editor writes, and
 * the contrast is what the bucket rule means — weight is not read
 * by {@link splitTermBuckets}, so writing it moves nothing. Its text
 * is read by {@link readTermWeight}, which refuses through the same
 * predicate a pasted line does; the header's no-quoting rule covers
 * both, and the two spellings of each refusal are deliberate, a
 * pasted block naming a LINE where a field names itself.
 *
 * {@link splitTermBuckets} therefore DERIVES and never stores. There
 * is no bucket membership to keep in step with a polarity: the lists
 * are a reading of the one term list the modal holds, so a move is a
 * rewrite of that list and the buckets follow from it.
 *
 * A bucket lists its terms in the order the list gives them, so a term
 * that arrives in a bucket lands where the stored order puts it and
 * not where a drop happened to finish. A drop index is a gesture about
 * a picture; the stored order is what the row list means, and honouring
 * the drop would need a column that records it. `terms` has none.
 *
 * ## The block is the seed's own members, one term per line
 *
 * `packages/service/data/terms.json` is what an operator has when they
 * have vocabulary to add in bulk, and its members are `pattern`,
 * `weight`, `polarity` and `notes`. It carries a `categoryKey` too,
 * which an editor already open on one category knows and this format
 * therefore drops.
 *
 * A LINE per term rather than the seed's JSON array, because the
 * refusal has to be per line: an operator pasting forty rows wants the
 * three that were wrong named, not one message about the payload. The
 * JSON shape is served elsewhere —
 * `../../components/JsonEditor.tsx` is the fallback for a payload no
 * fixed template can express, and it refuses through
 * `../../components/jsonDraft.ts`.
 *
 * Fields are separated by a pipe or a tab — a tab because that is
 * what a column copied out of a spreadsheet arrives as — in the
 * seed's own order:
 *
 * ```text
 * pattern | weight | polarity | notes
 * ```
 *
 * Notes are optional and the other three are required, which is what
 * every row of the seed carries. A blank line is skipped rather than
 * refused: a pasted block routinely ends in one, and a sentence about
 * it would be a fault the operator cannot correct.
 *
 * One sentence per refused line and never more, so the number of
 * sentences IS the number of lines that were refused. A line is read
 * for SHAPE first (its field count, then each field in turn) and for
 * ADMISSIBILITY second (whether the category already carries the
 * pattern), and the first fault found is the one reported — a line
 * with two faults is still one line to go and correct.
 *
 * ## What counts as a duplicate is the constraint, exactly
 *
 * The service holds the (category, pattern) pair unique, so a pattern
 * the category already carries is a duplicate WHATEVER bucket it sits
 * in. That is the same sentence as 'a bucket is a polarity', read
 * from the storage side: polarity is not part of a term's identity,
 * so it cannot be what makes two rows different.
 *
 * The comparison is the constraint's: the trimmed text, compared
 * exactly, case and all. Anything looser would refuse a line the
 * endpoint would take, and anything narrower would accept one it would
 * not.
 *
 * ## No sentence quotes the block
 *
 * Every sentence is built from a LINE NUMBER, a field name and this
 * module's own vocabulary. Nothing an operator pasted is read back
 * to them, for the reason `../../components/jsonDraft.ts` states at
 * length: a message goes into the DOM, into a screenshot, and into
 * whatever gets copied out of a support thread. A term pattern is
 * milder than a connector's token, and the rule is cheaper to keep
 * everywhere than to re-decide per surface.
 *
 * The one payload-derived thing a REFUSAL carries is a COUNT of
 * fields, which is the same exception `describeSchemaIssues` makes for
 * a count of unrecognised keys. The section below covers the other
 * sentence this module builds, which carries counts of LINES on the
 * same terms.
 *
 * ## Which array stance this module is in
 *
 * Every list returned here is MUTABLE, built fresh per call and owned
 * by nobody — the stance `../../components/editorDraft.ts` and
 * `../filters.ts` take, and the opposite of the frozen tables in
 * `../../data/`. These feed `@ar/ui` props and a draft the modal keeps
 * in state, so a `readonly` return would protect nothing and cost
 * every call site a copy.
 *
 * ## A candidate becomes a row only in a DRAFT, and its id says so
 *
 * {@link parseTermBlock} answers CANDIDATES, which carry no `id`
 * because reading a line is not the same as making a row.
 * {@link mergeTermCandidates} is what makes them rows, and every id it
 * mints is NEGATIVE: it descends from below the lowest the list
 * already carries, so two merges cannot collide, and `terms.id` being
 * a positive serial means no minted id can ever equal one the service
 * issued. {@link isDraftTerm} reads that back, which is what lets a
 * surface mark a row nothing has stored without a second flag to keep
 * in step.
 *
 * The minting sits here rather than in the modal for the reason
 * everything else here does: a decision written into a `.tsx` is
 * reachable by no test in this package. What it produces is a row in
 * the editor's own working copy and NOWHERE else. `../../data/
 * drafts.ts` states that its store edits rows and never inserts one,
 * so a merged candidate lives exactly as long as the modal does and a
 * save records nothing for it. That is a property of the fixture seam
 * rather than of this module, and the panel is where it is stated to
 * whoever is looking at the screen.
 *
 * {@link describeTermBlockReading} is the reading of what a parse did,
 * and it obeys the quoting rule above: two counts and this module's
 * own words, with nothing off the block in it.
 *
 * ## What this deliberately does not answer
 *
 * Whether there is anything to save belongs to
 * `../../components/editorDraft.ts`, and what the JSON fallback
 * validates against belongs to `./schema.ts`, which mirrors the same
 * four members this module reads off a pasted line.
 */

import type { PolarityFacet } from './cards';
import type { Term, TermPolarity } from '../../data/types';

import { POLARITY_FACETS } from './cards';

/**
 * What separates one field from the next on a pasted line.
 *
 * A pipe or a tab, and nothing else. The cost is stated rather than
 * hidden: a note carrying either character splits into two fields and
 * the line is refused for its count, which is at least a sentence
 * naming the line rather than a note silently cut in half.
 */
const FIELD_SEPARATOR = /[|\t]/;

/** The fewest fields a line can carry: pattern, weight and polarity. */
const MIN_FIELDS = 3;

/** The most: those three, plus notes. */
const MAX_FIELDS = 4;

/**
 * The id at which minting starts counting DOWN.
 *
 * `terms.id` is a positive serial, so every id below zero is one the
 * service cannot have issued — which is what makes
 * {@link isDraftTerm} a reading of the id itself rather than a flag
 * some other module has to keep in step with it.
 */
const DRAFT_ID_CEILING = 0;

/** What {@link describeTermBlockReading} says about an empty block. */
const EMPTY_BLOCK_SENTENCE = 'That block held nothing to read.';

/**
 * The polarities a line may name, in the order the surface draws them.
 *
 * Read off {@link POLARITY_FACETS} rather than written out, so a
 * polarity added to `TermPolarity` becomes a spelling this module
 * accepts and offers, instead of one it goes on refusing.
 */
const POLARITY_NAMES: readonly TermPolarity[] = POLARITY_FACETS
  .map((facet) => facet.polarity);

/**
 * One polarity bucket, as the editor draws it.
 *
 * A {@link PolarityFacet} plus the terms filed under it, which is the
 * type saying what the header says: a bucket is a polarity, and the
 * name and colour it is drawn with are the ones the card beside it
 * uses. Extending the facet rather than repeating its members is also
 * what keeps the two surfaces from drifting apart on what `ignore`
 * gets called.
 */
export interface TermBucket extends PolarityFacet {
  /** Its terms, in the order the list gave them. */
  readonly terms: Term[];
}

/**
 * One term a pasted line asked for, before anything has stored it.
 *
 * The seed's own members minus `categoryKey`, and minus the `id` a
 * row would carry — see the header on why a candidate has none.
 */
export interface TermCandidate {
  /** `terms.pattern`, trimmed of the spacing a paste arrives with. */
  readonly pattern: string;
  /** `terms.weight` — a magnitude, so never negative. */
  readonly weight: number;
  /** `terms.polarity`, which is also the bucket it would join. */
  readonly polarity: TermPolarity;
  /** `terms.notes`; `null` where the line wrote none. */
  readonly notes: string | null;
}

/**
 * One option the per-term polarity control offers.
 *
 * Declared here rather than imported from `@ar/ui`, so this module
 * stays a pure `.ts` the unit runner can reach with no component
 * library behind it. Structurally a `SelectOption` — a `value` and a
 * `label` — with the value NARROWED to the union, which is what makes
 * an option naming a polarity that does not exist a `check-types`
 * error rather than a control offering it.
 */
export interface TermPolarityOption {
  /** The polarity this option files a term under. */
  readonly value: TermPolarity;
  /** What it is called, in the surface's own words. */
  readonly label: string;
}

/** What reading a per-term weight field produced. */
export type TermWeightReading =
  | { readonly ok: true; readonly weight: number }
  | { readonly ok: false; readonly sentence: string };

/** What reading a pasted block produced. */
export interface TermBlockReading {
  /** The lines that were accepted, in the order they were pasted. */
  readonly candidates: TermCandidate[];
  /** One sentence per refused line, in the same order. */
  readonly sentences: string[];
}

/** What reading one line's fields produced. */
type LineReading =
  | { readonly ok: true; readonly candidate: TermCandidate }
  | { readonly ok: false; readonly rule: string };

/**
 * The polarities a refusal offers, as one phrase.
 *
 * Built by popping a COPY, so the last member can be reached without
 * an index — `noUncheckedIndexedAccess` makes every `names[i]`
 * possibly-undefined, and a phrase is not worth a guard per read.
 *
 * @param names - The spellings, in the order to offer them.
 * @returns Them, comma-separated with a final `or`.
 */
function listNames(names: readonly string[]): string {
  const rest = [...names];
  const last = rest.pop() ?? '';

  return rest.length === 0
    ? last
    : `${rest.join(', ')} or ${last}`;
}

/** The polarities a `polarity` field may take, as one phrase. */
const POLARITY_PHRASE = listNames(POLARITY_NAMES);

/**
 * Which rule a weight breaks, independent of how it was written.
 *
 * Private, and deliberately not a string an operator ever sees: the
 * two tables below turn it into the sentence each FORMAT wants, which
 * is what lets the rule be shared while the phrasing is not.
 */
type WeightFault = 'missing' | 'unreadable' | 'negative';

/**
 * How each weight fault reads on a pasted LINE.
 *
 * Phrases rather than sentences, with no location and no full stop:
 * {@link describeLine} supplies both, so every refusal a block
 * produces reads the same way whichever field was at fault.
 */
const LINE_WEIGHT_PHRASES: Readonly<Record<WeightFault, string>> = {
  missing: 'states no weight',
  unreadable: 'states a weight that is not a number',
  negative: 'states a negative weight, where weight is a magnitude and '
    + 'the polarity carries the direction',
};

/**
 * How each weight fault reads under the editor's per-term FIELD.
 *
 * Whole sentences, because a field's error slot has no line number to
 * hang off and the control it sits under is the location. The rules
 * are the same three and the wording is not, which is the deliberate
 * half of the difference — a pasted block names a line, and a field
 * names itself.
 *
 * Nothing here quotes what was typed, for the reason the header
 * gives about the block: a refusal goes into the DOM and out of it
 * again in whatever an operator copies.
 */
const FIELD_WEIGHT_SENTENCES: Readonly<Record<WeightFault, string>> = {
  missing: 'Weight is required.',
  unreadable: 'Weight has to be a number.',
  negative: 'Weight is a magnitude; the polarity carries the direction.',
};

/**
 * Whether a field spells a polarity.
 *
 * The membership test is done against a WIDENED copy of the names
 * rather than by asserting the argument into the union, so nothing
 * here tells the compiler something the runtime has not checked.
 *
 * @param text - The field, trimmed.
 * @returns Whether it is one of the three.
 */
function isTermPolarity(text: string): text is TermPolarity {
  const names: readonly string[] = POLARITY_NAMES;

  return names.includes(text);
}

/**
 * The sentence one refused line reads as.
 *
 * The line number is the operator's own, counted over the block as
 * pasted — blank lines included, so the number matches what they
 * are looking at rather than a count of the lines this module kept.
 *
 * @param lineNumber - Where the fault is, one-based.
 * @param rule - What is wrong, with no location and no full stop.
 * @returns The sentence.
 */
function describeLine(lineNumber: number, rule: string): string {
  return `Line ${lineNumber} ${rule}.`;
}

/**
 * The rule phrase for a line with the wrong number of fields.
 *
 * The count is the one thing here derived from what was pasted, and
 * the header says why a count is the exception the no-echo rule makes.
 *
 * @param count - How many fields the line split into.
 * @returns The phrase, with no location and no full stop.
 */
function describeFieldCount(count: number): string {
  const noun = count === 1
    ? 'field'
    : 'fields';

  return `carries ${count} ${noun}, where the format is `
    + 'pattern | weight | polarity and notes are optional';
}

/**
 * What is wrong with a weight, whatever format it was written in.
 *
 * The one predicate behind both spellings of the rule, and the reason
 * it exists rather than each caller reading the text itself: a pasted
 * line and the per-term field in the editor are two ways of stating
 * the same column, and a surface that refused one and took the other
 * would be giving two answers to one question.
 *
 * Every branch is a rule the endpoint keeps.
 * `../../data/types.ts` declares {@link Term.weight} a MAGNITUDE whose
 * sign is never consulted, which is what makes a negative one a fault
 * rather than a value with a direction in it. The emptiness check is
 * separate from the readability one on purpose: `Number('')` is `0`,
 * so a field left blank would otherwise be stored as a weightless term
 * carrying a real zero, and nothing downstream could tell the two
 * apart. `Number.isFinite` and not `!Number.isNaN` for the mirror
 * reason, since `Number('Infinity')` is a number and not a weight.
 *
 * @param text - The weight as written, already trimmed.
 * @returns Which rule it breaks, or `undefined` where it is a weight.
 */
function findWeightFault(text: string): WeightFault | undefined {
  if (text === '') {
    return 'missing';
  }

  const weight = Number(text);

  if (!Number.isFinite(weight)) {
    return 'unreadable';
  }

  return weight < 0
    ? 'negative'
    : undefined;
}

/**
 * What is wrong with a line's pattern or weight, if anything.
 *
 * Polarity is not read here on purpose: the check that refuses a
 * misspelt one is also the check that NARROWS the field to the union,
 * so it belongs where the candidate is built and not in a helper whose
 * answer the compiler cannot use.
 *
 * @param pattern - The first field, trimmed.
 * @param weightText - The second field, trimmed.
 * @returns The rule phrase, or `undefined` where both are fine.
 */
function describePatternOrWeight(
  pattern: string,
  weightText: string,
): string | undefined {
  if (pattern === '') {
    return 'names no pattern';
  }

  const fault = findWeightFault(weightText);

  return fault === undefined
    ? undefined
    : LINE_WEIGHT_PHRASES[fault];
}

/**
 * One line read for its shape alone.
 *
 * Whether the category already carries the pattern is the caller's
 * question, not this one's: a line can be perfectly formed and still
 * inadmissible, and separating the two is what makes the reported
 * fault the first one an operator would fix.
 *
 * @param text - The line, as pasted.
 * @returns The candidate it asks for, or the rule it breaks.
 */
function readFields(text: string): LineReading {
  const fields = text
    .split(FIELD_SEPARATOR)
    .map((field) => field.trim());

  if (fields.length < MIN_FIELDS || fields.length > MAX_FIELDS) {
    return { ok: false, rule: describeFieldCount(fields.length) };
  }

  // The defaults are what `noUncheckedIndexedAccess` asks for and
  // nothing more: the count check above is what makes the first three
  // present on every line that reaches this point.
  const [
    pattern = '',
    weightText = '',
    polarityText = '',
    notes = '',
  ] = fields;
  const rule = describePatternOrWeight(pattern, weightText);

  if (rule !== undefined) {
    return { ok: false, rule };
  }

  if (!isTermPolarity(polarityText)) {
    return {
      ok: false,
      rule: `names a polarity outside ${POLARITY_PHRASE}`,
    };
  }

  return {
    ok: true,
    candidate: {
      pattern,
      weight: Number(weightText),
      polarity: polarityText,
      notes: notes === ''
        ? null
        : notes,
    },
  };
}

/**
 * Why a well-formed line cannot be added, if it cannot.
 *
 * The category is asked first and the block second, which is not an
 * arbitrary order: `accepted` only ever holds patterns that were
 * ACCEPTED, so two lines repeating a pattern the category already
 * carries are each told about the category rather than the second
 * being pointed at a first that was itself refused.
 *
 * @param pattern - The candidate's pattern.
 * @param stored - What the category carries, by pattern.
 * @param accepted - What earlier lines of this block took, by pattern.
 * @returns The rule phrase, or `undefined` where the line may be added.
 */
function describeDuplicate(
  pattern: string,
  stored: ReadonlyMap<string, TermPolarity>,
  accepted: ReadonlyMap<string, number>,
): string | undefined {
  const polarity = stored.get(pattern);

  if (polarity !== undefined) {
    return `repeats a pattern the ${polarity} bucket already carries`;
  }

  const earlier = accepted.get(pattern);

  if (earlier !== undefined) {
    return `repeats the pattern on line ${earlier}`;
  }

  return undefined;
}

/**
 * How many of something, as a phrase.
 *
 * Both counts {@link describeTermBlockReading} states go through
 * here, so the two cannot come to pluralise differently.
 *
 * @param count - How many there are.
 * @param singular - What exactly one of them is called.
 * @param plural - What any other number of them is called.
 * @returns The count and the word, e.g. `1 line` or `3 lines`.
 */
function countPhrase(
  count: number,
  singular: string,
  plural: string,
): string {
  const noun = count === 1
    ? singular
    : plural;

  return `${String(count)} ${noun}`;
}

/**
 * A category's vocabulary, divided into the three buckets the editor
 * draws.
 *
 * Total over `TermPolarity` and in the surface's own order, both
 * inherited from {@link POLARITY_FACETS}: a polarity carrying nothing
 * is an EMPTY bucket rather than an absent one, which is what a drag
 * needs — a list nobody can drop into is not a bucket an operator
 * can move a term to.
 *
 * Each bucket keeps the order the list gave it, so the editor shows
 * the stored order and a move does not reshuffle the rows around it.
 *
 * Returns buckets and lists the caller owns outright — see the
 * header on which array stance this module is in.
 *
 * @param terms - The category's terms, in stored order.
 * @returns One bucket per polarity, in surface order.
 */
export function splitTermBuckets(terms: readonly Term[]): TermBucket[] {
  return POLARITY_FACETS.map((facet) => ({
    ...facet,
    terms: terms.filter((term) => term.polarity === facet.polarity),
  }));
}

/**
 * The term list after one row's members are rewritten.
 *
 * The one place a row is replaced, so the two public movers above
 * cannot come to disagree about what replacing one means. A FRESH
 * list every time with the moved row rebuilt rather than written
 * through: the list is a draft the modal holds in state, and a row
 * mutated in place is a new value that compares equal to the old one
 * and renders nothing.
 *
 * A change that changes nothing answers a copy reading exactly as the
 * original, which the draft holder absorbs by value.
 *
 * @param terms - The list as it stands.
 * @param termId - The `terms.id` being rewritten.
 * @param changes - The columns the caller's control owns.
 * @returns The new list, in the same order.
 */
function withTermValues(
  terms: readonly Term[],
  termId: number,
  changes: Partial<Term>,
): Term[] {
  return terms.map((term) => (term.id === termId
    ? { ...term, ...changes }
    : term));
}

/**
 * The term list after one row changes bucket.
 *
 * The whole of what a cross-bucket drag does, and the whole of what
 * the per-term polarity control does — see the header on why
 * those are one operation and not two.
 *
 * A fresh list every time, with the moved row rebuilt rather than
 * written through: the list is a draft the modal holds in state, and a
 * row mutated in place is a new value that compares equal to the old
 * one and renders nothing. A move that changes nothing — the same
 * polarity, or an id the list does not carry — answers a copy
 * reading exactly as the original, which the draft holder absorbs by
 * value.
 *
 * @param terms - The list as it stands.
 * @param termId - The `terms.id` whose bucket moved.
 * @param polarity - The bucket it moved to.
 * @returns The new list, in the same order.
 */
export function withTermPolarity(
  terms: readonly Term[],
  termId: number,
  polarity: TermPolarity,
): Term[] {
  return withTermValues(terms, termId, { polarity });
}

/**
 * The term list after one row's weight is rewritten.
 *
 * {@link withTermPolarity}'s sibling and its equal: the editor draws
 * two controls per row and each writes one column, so each has one
 * mover. Weight is the column the buckets do NOT read, which is the
 * whole difference between them — a weight change leaves every row
 * exactly where it is drawn.
 *
 * The weight is a number and not the text a field holds, because
 * {@link readTermWeight} is what turns one into the other and refuses
 * the readings that are not weights. A caller that skipped it would
 * be storing `Number('')`, which is `0` and is not a blank.
 *
 * @param terms - The list as it stands.
 * @param termId - The `terms.id` whose weight moved.
 * @param weight - Its new magnitude, already read.
 * @returns The new list, in the same order.
 */
export function withTermWeight(
  terms: readonly Term[],
  termId: number,
  weight: number,
): Term[] {
  return withTermValues(terms, termId, { weight });
}

/**
 * What the per-term polarity control offers, in the surface's order.
 *
 * The control that answers WCAG 2.2 SC 2.5.7 for the cross-bucket
 * drag — see the header on why the two are one operation — so its
 * options are TOTAL over `TermPolarity` and come off
 * {@link POLARITY_FACETS} like everything else the surface draws. A
 * list that omitted a polarity would be a bucket a term could be
 * dragged into and not chosen into, which is exactly the equivalence
 * the criterion asks for and would be the one gap nothing reports.
 *
 * Totality is also what makes the control safe against `Select`,
 * which resolves a value none of its options carry to the FIRST
 * option: a term could otherwise be drawn as holding somebody else's
 * polarity. Here every stored value is offered, so the resolution
 * never happens.
 *
 * Labels are the facet's own, so the option an operator picks is
 * spelled the way the card beside it and the bucket header above it
 * spell the same reading.
 *
 * Built fresh per call and owned by nobody — see the header on which
 * array stance this module is in, and note that `Select` declares its
 * `options` mutable.
 *
 * @returns One option per polarity, in surface order.
 */
export function termPolarityOptions(): TermPolarityOption[] {
  return POLARITY_FACETS.map((facet) => ({
    value: facet.polarity,
    label: facet.label,
  }));
}

/**
 * The polarity an option value names, or `undefined`.
 *
 * The narrowing the control needs and cannot do itself: `Select`
 * hands its `onChange` a `string`, and the draft it writes into holds
 * the union. Answering `undefined` rather than a default is what
 * keeps a value nothing offered from moving a term at all — a
 * fallback here would be this module choosing a bucket on the
 * operator's behalf.
 *
 * The membership test runs against a WIDENED copy of the names, so
 * nothing here tells the compiler something the runtime has not
 * checked.
 *
 * @param value - Whatever the control reported.
 * @returns The polarity it names, or `undefined` for anything else.
 */
export function readTermPolarity(value: string): TermPolarity | undefined {
  return isTermPolarity(value)
    ? value
    : undefined;
}

/**
 * What the per-term weight field's text reads as.
 *
 * Never throws and never coerces. The three refusals are the three
 * {@link findWeightFault} names, which is what makes this field and a
 * pasted line agree about the column — the header on that predicate
 * carries why each one is a rule rather than a preference.
 *
 * Coercing would be the wrong repair in a control that SHOWS what was
 * typed: a field reading `-2` and a draft holding `2` would be the
 * surface disagreeing with itself, and the operator would find out at
 * the next read.
 *
 * The text is trimmed first, so a field an operator left as spaces is
 * the same fault as one they left empty rather than a different one.
 *
 * @param text - The field's contents, as typed.
 * @returns The weight, or the sentence the field states instead.
 */
export function readTermWeight(text: string): TermWeightReading {
  const trimmed = text.trim();
  const fault = findWeightFault(trimmed);

  return fault === undefined
    ? { ok: true, weight: Number(trimmed) }
    : { ok: false, sentence: FIELD_WEIGHT_SENTENCES[fault] };
}

/**
 * A pasted block read into candidates and refusals.
 *
 * Never throws: a bulk paste is the one gesture where most of the
 * input is usually fine, so a block is read line by line and a fault
 * costs its own line and nothing else. The two answers are
 * independent — a block can produce both candidates and sentences,
 * and an empty block produces neither.
 *
 * @param block - The textarea's contents, as pasted.
 * @param existing - The category's terms, which is what a pattern has
 * to be new against.
 * @returns What was accepted and what was refused.
 */
export function parseTermBlock(
  block: string,
  existing: readonly Term[],
): TermBlockReading {
  const candidates: TermCandidate[] = [];
  const sentences: string[] = [];
  const stored = new Map(
    existing.map((term) => [term.pattern, term.polarity]),
  );
  const accepted = new Map<string, number>();

  block.split('\n').forEach((text, index) => {
    const lineNumber = index + 1;

    if (text.trim() === '') {
      return;
    }

    const reading = readFields(text);

    if (!reading.ok) {
      sentences.push(describeLine(lineNumber, reading.rule));

      return;
    }

    const { candidate } = reading;
    const rule = describeDuplicate(candidate.pattern, stored, accepted);

    if (rule !== undefined) {
      sentences.push(describeLine(lineNumber, rule));

      return;
    }

    accepted.set(candidate.pattern, lineNumber);
    candidates.push(candidate);
  });

  return { candidates, sentences };
}

/**
 * The term list with a block's accepted candidates appended to it.
 *
 * The other half of {@link parseTermBlock}: that one reads lines and
 * this one makes rows of them. Split in two because they answer
 * different questions — whether a line is admissible, and what a row
 * built from it looks like — and because a panel that parsed without
 * merging (a preview, a second press over a corrected block) is a
 * shape the first half already serves on its own.
 *
 * Candidates land at the END of the list, so each one falls last in
 * the bucket its polarity names. That is the same rule every other
 * bucket member obeys: {@link splitTermBuckets} keeps the order the
 * list gave it, so newest-last here is newest-last on screen.
 *
 * ## The minted ids, and what they are honest about
 *
 * Ids descend from BELOW the lowest the list already carries, so a
 * second merge cannot reuse the first one's ids, and `terms.id` being
 * a positive serial means none of them can collide with a stored row.
 * {@link isDraftTerm} is how a surface reads one back.
 *
 * A minted row is a row in the EDITOR's working copy and in nothing
 * else. `../../data/drafts.ts` records edits to rows that exist and
 * never inserts one, so a save records nothing for a merged candidate
 * and a reload does not show it. That is the fixture seam's limit
 * rather than this function's, and the panel states it where an
 * operator can read it.
 *
 * @param terms - The list as it stands, stored rows and earlier
 * merges alike.
 * @param candidates - What a parse accepted, in the order it read
 * them.
 * @param categoryId - The `categories.id` this editor is open on,
 * which is where every minted row hangs. Passed rather than read off
 * a member of `terms`, which would leave an empty category with
 * nowhere to get it.
 * @returns The new list: the old one, then a row per candidate.
 */
export function mergeTermCandidates(
  terms: readonly Term[],
  candidates: readonly TermCandidate[],
  categoryId: number,
): Term[] {
  const lowest = terms.reduce(
    (low, term) => Math.min(low, term.id),
    DRAFT_ID_CEILING,
  );

  return [
    ...terms,
    // The four members spelled out rather than spread, so a candidate
    // that stopped carrying one of them is a `check-types` error here
    // instead of a row quietly missing a column.
    ...candidates.map((candidate, index) => ({
      id: lowest - index - 1,
      categoryId,
      pattern: candidate.pattern,
      weight: candidate.weight,
      polarity: candidate.polarity,
      notes: candidate.notes,
    })),
  ];
}

/**
 * Whether this row was minted here rather than issued by the service.
 *
 * A reading of the id and of nothing else — see
 * {@link mergeTermCandidates} on why every minted id is negative and
 * every stored one is not. A surface uses it to mark a row a save
 * will not keep; nothing here changes behaviour on it.
 *
 * @param term - The row, as the draft holds it.
 * @returns Whether nothing has stored it.
 */
export function isDraftTerm(term: Term): boolean {
  return term.id < DRAFT_ID_CEILING;
}

/**
 * What a parse did, in one sentence.
 *
 * The count of lines taken and the count refused, which is the
 * reading a bulk gesture owes: the sentences under it name the
 * refused lines one by one, and nothing at all names the accepted
 * ones. An operator who pasted forty rows needs to know that
 * thirty-eight arrived before they go looking for them.
 *
 * Both numbers come off the reading's two lists rather than off the
 * block, which is what keeps the module's no-quoting rule: one line
 * per sentence is exactly what {@link parseTermBlock} guarantees, so
 * the sentence count IS the refused-line count.
 *
 * A block with nothing in it gets its own sentence rather than two
 * zeroes. It is the answer to pressing the button over an empty box,
 * and 'added nothing and refused nothing' would read as a fault.
 *
 * @param reading - What {@link parseTermBlock} answered.
 * @returns The sentence, with a full stop.
 */
export function describeTermBlockReading(
  reading: TermBlockReading,
): string {
  const added = reading.candidates.length;
  const refused = reading.sentences.length;

  if (added === 0 && refused === 0) {
    return EMPTY_BLOCK_SENTENCE;
  }

  const rows = added === 1
    ? 'an unsaved row'
    : 'unsaved rows';
  const addedPhrase = added === 0
    ? 'Added nothing'
    : `Added ${countPhrase(added, 'term', 'terms')} as ${rows}`;
  const refusedPhrase = countPhrase(refused, 'line', 'lines');

  return refused === 0
    ? `${addedPhrase}.`
    : `${addedPhrase} and refused ${refusedPhrase}.`;
}
