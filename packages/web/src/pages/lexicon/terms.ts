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
 * here. Dragging a row from one list into another and choosing a
 * polarity from that row's own control are the same operation
 * expressed twice — both rewrite one column on one row, and both
 * are served by the one function. The drag is an enhancement over the
 * control rather than a second mechanism, which is what answers WCAG
 * 2.2 SC 2.5.7 (Dragging Movements) without a keyboard-only path that
 * could drift away from the pointer one.
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
 * The one payload-derived thing a sentence carries is a COUNT of
 * fields, which is the same exception `describeSchemaIssues` makes for
 * a count of unrecognised keys.
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
 * ## What this deliberately does not answer
 *
 * A candidate carries no `id`, because it is not a row yet: minting the
 * unsaved draft rows a merge appends to a bucket is the panel's job,
 * and an id invented here would be one the service never issued.
 * Whether there is anything to save belongs to
 * `../../components/editorDraft.ts`, and what the JSON fallback
 * validates against belongs to that branch.
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

  if (weightText === '') {
    return 'states no weight';
  }

  const weight = Number(weightText);

  if (!Number.isFinite(weight)) {
    return 'states a weight that is not a number';
  }

  if (weight < 0) {
    return 'states a negative weight, where weight is a magnitude and '
      + 'the polarity carries the direction';
  }

  return undefined;
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
  return terms.map((term) => {
    if (term.id !== termId) {
      return term;
    }

    return { ...term, polarity };
  });
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
