/**
 * @packageDocumentation
 * The sources editor's decisions: what the kind control offers, what
 * its answer narrows back to, and what the endpoint field's text
 * reads as.
 *
 * Beside the modal rather than inside it, for the reason `./rows.ts`
 * gives about the page. The unit runner collects `.ts` files under
 * `src` in a node environment, so a decision living in a `.tsx` is
 * reachable by no test in this package at all, and
 * `./SourceEditorModal.tsx` is left with one control per member and
 * the read states.
 *
 * ## Two kind lists, and why neither can be the other
 *
 * `./rows.ts` already builds one, and it is the TOOLBAR's: it leads
 * with an option that filters nothing, because a filter has to be
 * clearable. A control that WRITES `sources.kind` cannot offer that
 * member — no such kind exists, and choosing it would set a stored
 * column to a sentinel this app invented for a URL parameter.
 *
 * So {@link sourceKindChoices} is a second list over the same order,
 * and the two share `SOURCE_KINDS` rather than each spelling the
 * union out. What separates them is exactly the sentinel, which is
 * what `./editor.test.ts` asserts rather than the membership alone.
 *
 * ## The choices are TOTAL over the union, and that is load-bearing
 *
 * `Select` resolves a value none of its options carry to the FIRST
 * option, so a list missing a kind would draw a source of that kind
 * wearing somebody else's and the next save would store what the
 * control showed. Every member of `SourceKind` is offered, so the
 * resolution never happens.
 *
 * {@link readSourceKind} is the other half of that pair and cannot be
 * dropped: `Select` hands its `onChange` a bare `string`, and the
 * draft it writes into holds the union. Answering `undefined` for
 * anything else is what keeps a value nothing offered from writing a
 * kind at all — a fallback here would be this module picking an
 * adapter on the operator's behalf.
 *
 * ## The endpoint field refuses rather than coerces
 *
 * `sources.endpoint` is a string column, so nothing type-level
 * refuses the empty one: a field writing every keystroke straight
 * into the draft would let a feed be saved pointing at nothing, and
 * every gate in this repo would stay green. {@link readSourceEndpoint}
 * is the one crossing between the text and the draft, and text that
 * does not read as an endpoint is NOT written — the field goes on
 * showing what was typed, states the rule it breaks, and the draft
 * keeps the last readable value.
 *
 * The consequence is worth stating rather than discovering. A save
 * can be offered while the endpoint field shows a refusal: the
 * refusal means the last keystroke did not reach the draft, and the
 * save is of what did. What cannot happen is a save storing an
 * endpoint nothing could request, because no such value is ever in
 * the draft. Clearing the box to retype it is the ordinary way into
 * that state, which is why the field refuses rather than reverting
 * under the operator.
 *
 * It also TRIMS. Surrounding space is invisible in the box and would
 * be stored verbatim, so the accepted endpoint is the trimmed one
 * and the field goes on showing exactly what was typed. That is the
 * same rule `../lexicon/terms.ts` applies to a weight field, and for
 * the same reason: what is stored has to be what the value means,
 * not what the keyboard produced.
 *
 * ## Which array stance this module is in
 *
 * {@link sourceKindChoices} returns a MUTABLE array built fresh per
 * call and owned by nobody, like the option builders beside it and
 * unlike the frozen tables in `../../data/`. `Select` declares its
 * `options` mutable, so a shared list here would be one component
 * away from being edited in place.
 */

import type { SourceKind } from '../../data/types';

import { SOURCE_KINDS } from './rows';

/**
 * What the endpoint field says over text it will not write.
 *
 * One sentence, because there is one rule: an endpoint names what to
 * request, and the empty string names nothing. Phrased as the rule
 * rather than as the fault, so the box states what a value has to be
 * instead of scolding what was typed.
 */
const ENDPOINT_REQUIRED_SENTENCE = 'An endpoint is what this feed is '
  + 'read from, so it cannot be blank.';

/**
 * One option the kind control offers.
 *
 * Declared here rather than imported from `@ar/ui`, so this module
 * stays a pure `.ts` the unit runner can reach with no component
 * library behind it. Structurally a `SelectOption` — a `value` and a
 * `label` — with the value NARROWED to the union, which is what makes
 * an option naming a kind that does not exist a `check-types` error
 * rather than a control offering it.
 */
export interface SourceKindOption {
  /** The kind this option writes to the row. */
  readonly value: SourceKind;
  /** What it is called — the stored token, per the header. */
  readonly label: string;
}

/** What the endpoint field's text reads as: a value, or a refusal. */
export type SourceEndpointReading =
  | {
    /** The text reads as an endpoint. */
    readonly ok: true;
    /** What to write to the draft — trimmed, per the header. */
    readonly endpoint: string;
  }
  | {
    /** The text does not read as an endpoint. */
    readonly ok: false;
    /** What the field states instead; nothing is written. */
    readonly sentence: string;
  };

/**
 * Whether a string is one of the kinds this deployment knows.
 *
 * The membership test runs against a WIDENED copy of the tokens, so
 * nothing here tells the compiler something the runtime has not
 * checked.
 *
 * @param value - Whatever the control reported.
 * @returns Whether the union carries it.
 */
function isSourceKind(value: string): value is SourceKind {
  const spellings: readonly string[] = SOURCE_KINDS;

  return spellings.includes(value);
}

/**
 * What the kind control offers: every kind, and nothing else.
 *
 * TOTAL over `SourceKind` for the reason the header gives at length,
 * and led by no clear-the-filter option for the other reason it
 * gives — this control writes a stored column rather than a URL
 * parameter.
 *
 * The labels are the stored tokens rather than prose, because that
 * is what the table's kind column shows: an editor offering
 * `Really Simple Syndication` beside a tag reading `rss` would be two
 * names for one thing.
 *
 * @returns One option per kind, in the order `./rows.ts` lists them.
 */
export function sourceKindChoices(): SourceKindOption[] {
  return SOURCE_KINDS.map((kind) => ({ value: kind, label: kind }));
}

/**
 * The kind an option value names, or `undefined`.
 *
 * The narrowing the control needs and cannot do itself — see the
 * header on why the answer for anything else is `undefined` rather
 * than a default.
 *
 * @param value - Whatever the control reported.
 * @returns The kind it names, or `undefined` for anything else.
 */
export function readSourceKind(value: string): SourceKind | undefined {
  return isSourceKind(value)
    ? value
    : undefined;
}

/**
 * What the endpoint field's text reads as.
 *
 * Never throws and never coerces. The one refusal is a field left
 * blank, which includes one left as spaces: trimming first is what
 * makes those the same state rather than two, and the header says
 * why the accepted value is the trimmed one.
 *
 * It does NOT check that the endpoint parses as a URL. A `push`
 * source's endpoint names where a payload lands rather than what to
 * request, `../../data/types.ts` says so on the column, and
 * `splitEndpoint` in `./rows.ts` already treats an unparseable
 * endpoint as an ordinary one. A rule this field applied and that
 * one did not would be the surface disagreeing with itself about the
 * same value.
 *
 * @param text - The field's contents, as typed.
 * @returns The endpoint, or the sentence the field states instead.
 */
export function readSourceEndpoint(text: string): SourceEndpointReading {
  const trimmed = text.trim();

  return trimmed === ''
    ? { ok: false, sentence: ENDPOINT_REQUIRED_SENTENCE }
    : { ok: true, endpoint: trimmed };
}
